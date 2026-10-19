import type { TierList } from '../store/types';
import { useMail, type Mail } from '../store/useMail';
import { useTierStore } from '../store/useTierStore';
import { setSenderRanks } from './api';
import type { SharedList } from './share';

const sorted = (labels: string[]) => [...labels].sort().join('\n');

/**
 * Whether `shared` (a list the player sent) is `list`: same title, tiers and cards.
 * The order of the cards doesn't count: it follows the ranking at the time of sending.
 */
export function isSameList(list: TierList, shared: SharedList): boolean {
  return (
    list.title === shared.title &&
    list.tiers.map((t) => t.label).join('\n') === shared.tiers.map((t) => t.label).join('\n') &&
    sorted(Object.values(list.cards).map((c) => c.label)) === sorted(shared.cards.map((c) => c.label))
  );
}

/** Current tier of each card of `shared` in `list`, in the order they were sent (-1: unranked). */
export function ranksForMail(list: TierList, shared: SharedList): number[] {
  // Cards with the same name are matched one by one, in the order of the list.
  const byLabel = new Map<string, number[]>();
  const add = (cardId: string, tier: number) => {
    const label = list.cards[cardId]?.label;
    if (label !== undefined) byLabel.set(label, [...(byLabel.get(label) ?? []), tier]);
  };
  list.tiers.forEach((t, i) => (list.placement[t.id] ?? []).forEach((id) => add(id, i)));
  list.pool.forEach((id) => add(id, -1));
  return shared.cards.map((c) => byLabel.get(c.label)?.shift() ?? -1);
}

/** Mails of `outbox` that are `list`, sent by the player. */
export function sentMails(list: TierList, outbox: Mail[]): Mail[] {
  if (list.daily || list.popular || list.mail) return [];
  return outbox.filter((m) => isSameList(list, m.list));
}

/**
 * Where the player's ranking of a list they sent stands: `none` (not sent to anyone),
 * `pending` (friends compare with an older one, waiting for a validation) or `sent`.
 */
export function sentRanksState(list: TierList, outbox: Mail[]): 'none' | 'pending' | 'sent' {
  const mails = sentMails(list, outbox);
  if (mails.length === 0) return 'none';
  // Sent before being ranked: still to validate, even if nothing moved since.
  const done = (m: Mail) => m.senderRanks?.every((r) => r >= 0) && ranksForMail(list, m.list).join() === m.senderRanks.join();
  return mails.every(done) ? 'sent' : 'pending';
}

/**
 * Sends the player's validated ranking of a list they sent to friends: they compare
 * with this one, not with the (often empty) ranking it had when it was sent. Only on
 * validation, never at each move.
 */
export async function validateSentRanks(listId: string): Promise<void> {
  const secret = useTierStore.getState().profile?.secret;
  const list = useTierStore.getState().lists[listId];
  if (!secret || !list) return;
  const changed = sentMails(list, useMail.getState().outbox)
    .map((m) => ({ mail: m, ranks: ranksForMail(list, m.list) }))
    .filter(({ mail, ranks }) => ranks.join() !== mail.senderRanks?.join());
  try {
    await Promise.all(changed.map(({ mail, ranks }) => setSenderRanks(secret, mail.id, ranks)));
  } finally {
    await useMail.getState().refresh();
  }
}
