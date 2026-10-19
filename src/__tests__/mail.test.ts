import { mailAgreement } from '../store/useMail';
import { rankingOf, useTierStore } from '../store/useTierStore';
import type { SharedList } from '../lib/share';

const shared: SharedList = {
  code: 'x',
  title: 'Fruits',
  tiers: [
    { label: 'S', color: '#FF7F7F' },
    { label: 'A', color: '#FFBF7F' },
    { label: 'B', color: '#FFDF7F' },
  ],
  cards: [
    { label: '🍎 Pomme', color: '#2B2F3A', tier: 0 },
    { label: '🍌 Banane', color: '#2B2F3A', tier: 2 },
    { label: '🥝 Kiwi', color: '#2B2F3A', tier: -1 },
  ],
};

describe('tier lists sent between friends', () => {
  beforeEach(() => useTierStore.setState({ lists: {} }));

  it('creates a received list to rank, once, in the order sent', () => {
    const store = useTierStore.getState();
    const id = store.receiveMail({ id: 'm1', from: 'Lucas', list: shared });
    expect(store.receiveMail({ id: 'm1', from: 'Lucas', list: shared })).toBe(id);
    const list = useTierStore.getState().lists[id];
    expect(list.mail).toMatchObject({ id: 'm1', from: 'Lucas' });
    // Nothing ranked: the sender's ranking isn't shown.
    expect(list.pool).toHaveLength(3);
    expect(list.mail!.cardIds.map((c) => list.cards[c].label)).toEqual(['🍎 Pomme', '🍌 Banane', '🥝 Kiwi']);
  });

  it('gives the ranking to send back once every card is placed', () => {
    const store = useTierStore.getState();
    const id = store.receiveMail({ id: 'm2', from: 'Lucas', list: shared });
    let list = useTierStore.getState().lists[id];
    const [apple, banana, kiwi] = list.mail!.cardIds;
    store.moveCard(id, apple, list.tiers[1].id, 0);
    expect(rankingOf(useTierStore.getState().lists[id], list.mail!.cardIds)).toBeNull();
    store.moveCard(id, banana, list.tiers[0].id, 0);
    store.moveCard(id, kiwi, list.tiers[2].id, 0);
    list = useTierStore.getState().lists[id];
    expect(rankingOf(list, list.mail!.cardIds)).toEqual([1, 0, 2]);
    store.markMailAnswered(id);
    expect(useTierStore.getState().lists[id].mail!.answeredAt).toBeDefined();
  });

  it('opens a ranked list again to rank it once more, with its ranking in place', () => {
    const store = useTierStore.getState();
    const id = store.receiveMail({ id: 'm3', from: 'Lucas', list: shared });
    const list = useTierStore.getState().lists[id];
    store.moveCard(id, list.mail!.cardIds[0], list.tiers[0].id, 0);
    store.markMailAnswered(id);
    expect(store.receiveMail({ id: 'm3', from: 'Lucas', list: shared }, true)).toBe(id);
    const again = useTierStore.getState().lists[id];
    expect(again.mail!.answeredAt).toBeUndefined();
    expect(again.placement[again.tiers[0].id]).toEqual([list.mail!.cardIds[0]]);
  });

  it('measures agreement on any number of tiers', () => {
    expect(mailAgreement([0, 1, 2], [0, 1, 2], 3)).toBe(100);
    expect(mailAgreement([0, 0], [2, 2], 3)).toBe(0);
    expect(mailAgreement([0, 2], [1, 2], 3)).toBe(75);
    // Cards the sender left unranked don't count.
    expect(mailAgreement([0, -1], [0, 2], 3)).toBe(100);
  });
});
