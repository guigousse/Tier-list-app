import { mailAgreement, type Mail } from '../store/useMail';
import { t } from './i18n/useT';

/** A list exchanged with a friend that they ranked, and the player's ranking of it if any. */
export type FriendMail = { mail: Mail; received: boolean; theirs: number[]; mine: number[] | null; score: number | null };

const ranked = (ranks: number[] | null): ranks is number[] => Boolean(ranks?.some((r) => r >= 0));

/**
 * Lists between the player and `friendId` that the friend ranked: the ones the player sent
 * and they answered, and the ones they sent after ranking them. Lists they exchanged with
 * other friends stay private, so they're not here (though their profile counts them).
 * Newest first.
 */
export function friendMails(friendId: string, inbox: Mail[], outbox: Mail[]): FriendMail[] {
  const rows: FriendMail[] = [];
  for (const mail of outbox) {
    if (mail.friend.id !== friendId || mail.status !== 'ranked' || !ranked(mail.recipientRanks)) continue;
    rows.push(row(mail, false, mail.recipientRanks, ranked(mail.senderRanks) ? mail.senderRanks : null));
  }
  for (const mail of inbox) {
    if (mail.friend.id !== friendId || !ranked(mail.senderRanks)) continue;
    rows.push(row(mail, true, mail.senderRanks, mail.status === 'ranked' && ranked(mail.recipientRanks) ? mail.recipientRanks : null));
  }
  return rows.sort((a, b) => b.mail.sentAt.localeCompare(a.mail.sentAt));
}

function row(mail: Mail, received: boolean, theirs: number[], mine: number[] | null): FriendMail {
  return { mail, received, theirs, mine, score: mine ? mailAgreement(mine, theirs, mail.list.tiers.length) : null };
}

export const completedLabel = (n: number) => t('social.completedLabel', { count: n });

/**
 * A pull to refresh: the spinner shows while the reloads the player started run, and only
 * then. Reloads started by the screen itself (on focus) must not drive it: on iOS, a
 * RefreshControl turned on and off by code during a navigation transition can stay
 * stuck on screen.
 */
export async function pullToRefresh(setPulling: (on: boolean) => void, ...reloads: (() => Promise<unknown>)[]): Promise<void> {
  setPulling(true);
  try {
    await Promise.allSettled(reloads.map((r) => r()));
  } finally {
    setPulling(false);
  }
}
