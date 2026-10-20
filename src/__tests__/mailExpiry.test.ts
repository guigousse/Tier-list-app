import { mailDaysLeft } from '../store/useMail';
import { useTierStore } from '../store/useTierStore';

jest.mock('../lib/api', () => ({ fetchMail: jest.fn(), markMailSeen: jest.fn() }));

const DAY = 24 * 60 * 60 * 1000;
const sent = '2026-10-20T10:00:00.000Z';
const at = (days: number) => Date.parse(sent) + days * DAY;

describe('a list sent to a friend', () => {
  it('has 7 days to be ranked, the last one counted as such', () => {
    expect(mailDaysLeft(sent, at(0))).toBe(7);
    expect(mailDaysLeft(sent, at(6.5))).toBe(1);
    expect(mailDaysLeft(sent, at(7))).toBe(0);
    expect(mailDaysLeft(sent, at(30))).toBe(0);
  });
});

describe('the copy of a received list', () => {
  const shared = { title: 'Fruits', tiers: [{ label: 'S', color: '#f00' }], cards: [{ label: 'Pomme', color: '#fff', tier: 0 }] };
  beforeEach(() => useTierStore.setState({ lists: {} }));

  it('goes once its mail has left the inbox, unless it was ranked', () => {
    const store = useTierStore.getState();
    const gone = store.receiveMail({ id: 'gone', from: 'Léa', list: shared as never });
    const live = store.receiveMail({ id: 'live', from: 'Léa', list: shared as never });
    const answered = store.receiveMail({ id: 'answered', from: 'Léa', list: shared as never });
    store.markMailAnswered(answered);
    store.dropGoneMail(['live']);
    const lists = useTierStore.getState().lists;
    expect(lists[gone]).toBeUndefined();
    expect(lists[live]).toBeDefined();
    expect(lists[answered]).toBeDefined();
  });
});
