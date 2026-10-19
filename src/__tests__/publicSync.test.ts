import type { Template } from '../constants/presets';
import { copiesByKey } from '../lib/publicSync';
import { popularVoteKey, useTierStore } from '../store/useTierStore';

const store = () => useTierStore.getState();

const v1: Template = { key: 'fruits', title: 'Fruits', emoji: '🍓', items: ['🍎 Pomme', '🍌 Banane'] };
const v2: Template = {
  ...v1,
  items: [...v1.items, '🥭 Mangue'],
  tiers: ['Divin', 'Délicieux', 'Correct', 'Bof', 'Beurk'],
  concepts: ['red-apple', 'banana', 'mango'],
};
const icons = { banana: 'https://x/banana.png', mango: 'https://x/mango.png' };

/** A copy of v1 with every card ranked and validated. */
function validatedCopy(): string {
  const id = store().createPopularList(v1);
  const list = store().lists[id];
  list.pool.forEach((c) => store().moveCard(id, c, list.tiers[1].id));
  expect(store().validatePopular(id)).toBe(true);
  return id;
}

beforeEach(() => useTierStore.setState({ lists: {} }));

describe('public tier lists enriched later', () => {
  it('adds the new cards to the copy, to rank, keeping the ranking already made', () => {
    const id = validatedCopy();
    const before = store().lists[id];
    store().syncPopular(id, v2, {});
    const list = store().lists[id];
    expect(list.popular!.cardIds).toHaveLength(3);
    expect(list.popular!.cardIds.slice(0, 2)).toEqual(before.popular!.cardIds);
    expect(list.cards[list.popular!.cardIds[2]].label).toBe('🥭 Mangue');
    expect(list.pool).toEqual([list.popular!.cardIds[2]]);
    expect(list.placement[list.tiers[1].id]).toHaveLength(2);
    expect(list.popular!.voteKey).toBe(popularVoteKey(v2));
  });

  it('turns a validated copy back to "in progress" when cards are added', () => {
    const id = validatedCopy();
    store().syncPopular(id, v2, {});
    expect(store().lists[id].popular!.validatedAt).toBeUndefined();
    expect(store().validatePopular(id)).toBe(false);
  });

  it('gives the copy the themed tiers while they are still the classic letters', () => {
    const id = validatedCopy();
    store().syncPopular(id, v2, {});
    expect(store().lists[id].tiers.map((t) => t.label)).toEqual(v2.tiers);
  });

  it('keeps tiers the player renamed', () => {
    const id = validatedCopy();
    const tier = store().lists[id].tiers[0];
    store().updateTier(id, tier.id, { label: 'Top' });
    store().syncPopular(id, v2, {});
    expect(store().lists[id].tiers[0].label).toBe('Top');
  });

  it('gives cards without a picture the library image of their concept', () => {
    const id = validatedCopy();
    store().syncPopular(id, v2, icons);
    const list = store().lists[id];
    const [apple, banana, mango] = list.popular!.cardIds.map((c) => list.cards[c]);
    expect(apple.iconUrl).toBeUndefined();
    expect(banana.iconUrl).toBe(icons.banana);
    expect(mango.iconUrl).toBe(icons.mango);
  });

  it('never replaces a photo the player chose', () => {
    const id = validatedCopy();
    const banana = store().lists[id].popular!.cardIds[1];
    store().updateCard(id, banana, { imageName: 'photo.jpg' });
    store().syncPopular(id, v2, icons);
    expect(store().lists[id].cards[banana].iconUrl).toBeUndefined();
  });

  it('changes nothing when the copy is already up to date', () => {
    const id = store().createPopularList(v2);
    store().syncPopular(id, v2, icons);
    const lists = store().lists;
    store().syncPopular(id, v2, icons);
    expect(store().lists).toBe(lists);
  });

  it('creates new copies with the themed tiers and the library images', () => {
    const id = store().createPopularList(v2, icons);
    const list = store().lists[id];
    expect(list.tiers.map((t) => t.label)).toEqual(v2.tiers);
    expect(list.cards[list.popular!.cardIds[2]].iconUrl).toBe(icons.mango);
  });
});

describe('finding the copy of a public list', () => {
  it('finds it by its template key, whatever the cards it was made with', () => {
    const id = store().createPopularList(v1);
    const copies = copiesByKey(Object.values(store().lists), () => popularVoteKey(v2));
    expect(copies.get('fruits')?.id).toBe(id);
  });

  it('prefers the copy already up to date', () => {
    const current = store().createPopularList(v2);
    store().createPopularList(v1);
    const copies = copiesByKey(Object.values(store().lists), () => popularVoteKey(v2));
    expect(copies.get('fruits')?.id).toBe(current);
  });
});
