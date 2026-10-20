import { create } from 'zustand';

import { fetchMail, markMailSeen, type PublicProfile } from '../lib/api';
import { parsePayload, type SharedList } from '../lib/share';
import { useTierStore } from './useTierStore';

/** A tier list sent to the player by a friend, or by the player to a friend. */
export type Mail = {
  id: string;
  /** The friend: who sent it (received) or who got it (sent). */
  friend: PublicProfile;
  list: SharedList;
  /** `ranked`: the recipient ranked it and sent their ranking back. */
  status: 'sent' | 'ranked';
  sentAt: string;
  /** Sender's tier per card (-1 unranked); for a received list, only once ranked. */
  senderRanks: number[] | null;
  recipientRanks: number[] | null;
  /** Sent lists: whether the player saw the friend's ranking. */
  seen: boolean;
  /** Answered at once with the recipient's earlier ranking of the same list. */
  auto: boolean;
};

type MailState = {
  inbox: Mail[];
  outbox: Mail[];
  loaded: boolean;
  /** Last refresh failed (offline). */
  offline: boolean;
  refresh: () => Promise<void>;
  /** The player opened the friend's ranking of a list they sent. */
  markSeen: (id: string) => void;
};

/** A list sent to a friend expires after this many days without an answer (server rule). */
export const MAIL_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

/** Days left to rank a list sent at `sentAt` (1: its last day, 0: expired). */
export function mailDaysLeft(sentAt: string, now = Date.now()): number {
  return Math.max(0, Math.ceil((Date.parse(sentAt) + MAIL_DAYS * DAY - now) / DAY));
}

/** Still in the mailboxes: ranked, or waiting less than MAIL_DAYS days. */
const live = (m: Mail) => m.status === 'ranked' || mailDaysLeft(m.sentAt) > 0;

let refreshing: Promise<void> | null = null;

/** Received and sent tier lists, fetched from the server (not kept on the device). */
export const useMail = create<MailState>()((set, get) => ({
  inbox: [],
  outbox: [],
  loaded: false,
  offline: false,
  refresh: () => {
    const secret = useTierStore.getState().profile?.secret;
    if (!secret) {
      set({ inbox: [], outbox: [], loaded: true });
      return Promise.resolve();
    }
    refreshing ??= fetchMail(secret)
      .then(({ inbox, outbox }) => {
        const toMail = (
          row: (typeof inbox)[number] | (typeof outbox)[number],
          friend: PublicProfile,
          seen: boolean,
        ): Mail | null => {
          const list = parsePayload(row.payload, `mail:${row.id}`);
          return list
            ? {
                id: row.id,
                friend,
                list,
                status: row.status,
                sentAt: row.sent_at,
                senderRanks: row.sender_ranks,
                recipientRanks: row.recipient_ranks,
                seen,
                auto: Boolean(row.auto),
              }
            : null;
        };
        const received = inbox.map((r) => toMail(r, r.from, true)).filter((m): m is Mail => m !== null && live(m));
        set({
          inbox: received,
          outbox: outbox.map((r) => toMail(r, r.to, r.seen)).filter((m): m is Mail => m !== null && live(m)),
          loaded: true,
          offline: false,
        });
        // Received lists gone from the server (expired, ignored): their copy to rank goes too.
        useTierStore.getState().dropGoneMail(received.map((m) => m.id));
      })
      .catch(() => set({ loaded: true, offline: true }))
      .finally(() => {
        refreshing = null;
      });
    return refreshing;
  },
  markSeen: (id) => {
    const mail = get().outbox.find((m) => m.id === id);
    const secret = useTierStore.getState().profile?.secret;
    if (!mail || mail.seen || !secret) return;
    set({ outbox: get().outbox.map((m) => (m.id === id ? { ...m, seen: true } : m)) });
    markMailSeen(secret, id).catch(() => {});
  },
}));

/** Received lists still to rank. */
export const isToRank = (m: Mail) => m.status === 'sent';

/** New mail for the badge: lists to rank, and friends' rankings of sent lists not seen yet. */
export function useUnreadMail(): number {
  return useMail((s) => s.inbox.filter(isToRank).length + s.outbox.filter((m) => m.status === 'ranked' && !m.seen).length);
}

/** Agreement between two rankings on `tiers` tiers, from 0 to 100 (same tier everywhere: 100). */
export function mailAgreement(a: number[], b: number[], tiers: number): number {
  const pairs = a.map((r, i) => [r, b[i]]).filter(([x, y]) => x >= 0 && y !== undefined && y >= 0);
  if (pairs.length === 0) return 0;
  const span = Math.max(1, tiers - 1);
  const sum = pairs.reduce((s, [x, y]) => s + 1 - Math.abs(x - y) / span, 0);
  return Math.round((sum / pairs.length) * 100);
}

/**
 * Lists whose final comparison the player saw: received ones they ranked then opened,
 * sent ones whose friend's ranking they opened. Shown in the archive.
 */
export function isArchived(m: Mail, received: boolean, viewed: string[]): boolean {
  if (m.status !== 'ranked') return false;
  return received ? viewed.includes(m.id) : m.seen;
}
