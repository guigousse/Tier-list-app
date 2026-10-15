import type { TierList } from '../store/types';
import { useMail } from '../store/useMail';
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

/**
 * The player's own ranking of a list they sent to friends, as it is now: the friends
 * compare with this one, not with the (often empty) ranking it had when it was sent.
 */
export async function syncSentRanks(listId: string): Promise<void> {
  const secret = useTierStore.getState().profile?.secret;
  if (!secret) return;
  if (!useMail.getState().loaded) await useMail.getState().refresh();
  const list = useTierStore.getState().lists[listId];
  if (!list || list.daily || list.popular || list.mail) return;
  const changed = useMail
    .getState()
    .outbox.filter((m) => isSameList(list, m.list))
    .map((m) => ({ mail: m, ranks: ranksForMail(list, m.list) }))
    .filter(({ mail, ranks }) => ranks.join() !== mail.senderRanks?.join());
  if (changed.length === 0) return;
  try {
    await Promise.all(changed.map(({ mail, ranks }) => setSenderRanks(secret, mail.id, ranks)));
  } catch {
    // Offline: sent again at the next change or the next opening.
  }
  await useMail.getState().refresh();
}
