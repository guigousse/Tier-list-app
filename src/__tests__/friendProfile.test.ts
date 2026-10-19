import { completedLabel, friendMails, pullToRefresh } from '../lib/friendProfile';
import type { PublicProfile } from '../lib/api';
import type { SharedList } from '../lib/share';
import type { Mail } from '../store/useMail';

const list: SharedList = {
  code: 'x',
  title: 'Fruits',
  tiers: [
    { label: 'S', color: '#FF7F7F' },
    { label: 'A', color: '#FFBF7F' },
    { label: 'B', color: '#FFDF7F' },
  ],
  cards: [
    { label: 'Pomme', color: '#2B2F3A', tier: -1 },
    { label: 'Banane', color: '#2B2F3A', tier: -1 },
  ],
};
const friend = (id: string) => ({ id, pseudo: id, tag: 1234, avatar: 'a' }) as PublicProfile;
const mail = (over: Partial<Mail>): Mail => ({
  id: 'm',
  friend: friend('lea'),
  list,
  status: 'sent',
  sentAt: '2026-10-15T10:00:00Z',
  senderRanks: null,
  recipientRanks: null,
  seen: true,
  auto: false,
  ...over,
});

describe('a friend’s profile', () => {
  it('shows the lists exchanged with that friend which they ranked, compared when the player ranked them too', () => {
    const inbox = [
      // Sent by Léa, ranked by her, then by the player: both rankings.
      mail({ id: 'in-both', status: 'ranked', senderRanks: [0, 1], recipientRanks: [0, 2], sentAt: '2026-10-14T10:00:00Z' }),
      // Sent by Léa, ranked by her, not yet by the player: hers only.
      mail({ id: 'in-hers', senderRanks: [1, 1], sentAt: '2026-10-13T10:00:00Z' }),
      // Sent by Léa without ranking it herself: not one of her lists.
      mail({ id: 'in-unranked', senderRanks: [-1, -1] }),
      // Another friend's list: private to them.
      mail({ id: 'in-other', friend: friend('tom'), senderRanks: [0, 0] }),
    ];
    const outbox = [
      // Sent by the player and ranked by Léa.
      mail({ id: 'out-ranked', status: 'ranked', senderRanks: [2, 2], recipientRanks: [2, 2], sentAt: '2026-10-16T10:00:00Z' }),
      // Sent but Léa hasn't ranked it yet.
      mail({ id: 'out-waiting', status: 'sent', senderRanks: [0, 0] }),
    ];
    const rows = friendMails('lea', inbox, outbox);
    expect(rows.map((r) => r.mail.id)).toEqual(['out-ranked', 'in-both', 'in-hers']);
    expect(rows.map((r) => r.received)).toEqual([false, true, true]);
    expect(rows.map((r) => r.theirs)).toEqual([[2, 2], [0, 1], [1, 1]]);
    // Same tiers everywhere: 100 %; one tier apart out of three tiers: 75 %; not ranked by the player: no score.
    expect(rows.map((r) => r.score)).toEqual([100, 75, null]);
  });

  it('a list the player sent without ranking it has nothing to compare', () => {
    const rows = friendMails('lea', [], [mail({ id: 'o', status: 'ranked', senderRanks: [-1, -1], recipientRanks: [0, 1] })]);
    expect(rows[0].score).toBeNull();
  });

  it('agrees in number', () => {
    expect(completedLabel(0)).toBe('liste complétée');
    expect(completedLabel(1)).toBe('liste complétée');
    expect(completedLabel(2)).toBe('listes complétées');
  });
});

describe('pull to refresh', () => {
  it('shows the spinner only while the reloads it started run, even when one fails', async () => {
    const states: boolean[] = [];
    let release!: () => void;
    const slow = new Promise<void>((r) => (release = r));
    const done = pullToRefresh((v) => states.push(v), () => slow, () => Promise.reject(new Error('offline')));
    expect(states).toEqual([true]);
    release();
    await done;
    expect(states).toEqual([true, false]);
  });
});
