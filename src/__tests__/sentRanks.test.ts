import { isSameList, ranksForMail, sentRanksState } from '../lib/sentRanks';
import type { Mail } from '../store/useMail';
import type { SharedList } from '../lib/share';
import { useTierStore } from '../store/useTierStore';

const store = () => useTierStore.getState();

beforeEach(() => {
  useTierStore.setState({ lists: {} });
});

/** The list as a friend received it: cards in the order they were sent, without ranking. */
const sent = (title: string, tiers: string[], cards: string[]): SharedList => ({
  code: 'mail:1',
  title,
  tiers: tiers.map((label) => ({ label, color: '#FF7F7F' })),
  cards: cards.map((label) => ({ label, color: '#000', tier: -1 })),
});

describe('lists sent to friends', () => {
  it('recognises the local list a mail was sent from, whatever its ranking', () => {
    const id = store().createList({ title: 'Fromages', tierLabels: ['S', 'A'], cardLabels: ['Brie', 'Comté'] });
    const list = store().lists[id];
    expect(isSameList(list, sent('Fromages', ['S', 'A'], ['Comté', 'Brie']))).toBe(true);
    expect(isSameList(list, sent('Fromages', ['S', 'A'], ['Comté']))).toBe(false);
    expect(isSameList(list, sent('Fromages', ['S', 'B'], ['Comté', 'Brie']))).toBe(false);
    expect(isSameList(list, sent('Vins', ['S', 'A'], ['Comté', 'Brie']))).toBe(false);
  });

  it('gives the current tier of each sent card, in the order they were sent', () => {
    const id = store().createList({ title: 'Fromages', tierLabels: ['S', 'A'], cardLabels: ['Brie', 'Comté', 'Feta'] });
    const [brie, comte] = store().lists[id].pool;
    const [s, a] = store().lists[id].tiers;
    store().moveCard(id, brie, a.id);
    store().moveCard(id, comte, s.id);
    // Sent before being ranked: cards in their creation order.
    expect(ranksForMail(store().lists[id], sent('Fromages', ['S', 'A'], ['Feta', 'Comté', 'Brie']))).toEqual([-1, 0, 1]);
  });

  it('tells apart cards with the same name', () => {
    const id = store().createList({ title: 'T', tierLabels: ['S', 'A'], cardLabels: ['x', 'x'] });
    const [first] = store().lists[id].pool;
    store().moveCard(id, first, store().lists[id].tiers[1].id);
    expect(ranksForMail(store().lists[id], sent('T', ['S', 'A'], ['x', 'x'])).sort()).toEqual([-1, 1]);
  });
});

describe('validating the ranking of a sent list', () => {
  const mail = (list: SharedList, senderRanks: number[]) => ({ id: 'm', list, senderRanks }) as unknown as Mail;

  it('has nothing to validate when the list was never sent', () => {
    const id = store().createList({ title: 'T', tierLabels: ['S'], cardLabels: ['x'] });
    expect(sentRanksState(store().lists[id], [mail(sent('Autre', ['S'], ['x']), [-1])])).toBe('none');
  });

  it('waits for a validation once the ranking differs from the one friends have', () => {
    const id = store().createList({ title: 'T', tierLabels: ['S'], cardLabels: ['x'] });
    const outbox = [mail(sent('T', ['S'], ['x']), [-1])];
    expect(sentRanksState(store().lists[id], outbox)).toBe('pending');
    store().moveCard(id, store().lists[id].pool[0], store().lists[id].tiers[0].id);
    expect(sentRanksState(store().lists[id], outbox)).toBe('pending');
    expect(sentRanksState(store().lists[id], [mail(sent('T', ['S'], ['x']), [0])])).toBe('sent');
  });
});
