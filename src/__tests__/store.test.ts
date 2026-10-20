import { TEMPLATES } from '../constants/presets';
import { migrateStore, popularVoteKey, useTierStore } from '../store/useTierStore';
import { POOL } from '../store/types';

const store = () => useTierStore.getState();

beforeEach(() => {
  useTierStore.setState({ lists: {} });
});

describe('tier lists', () => {
  it('creates a list with S→D tiers and its cards to rank', () => {
    const id = store().createList({ title: 'Test', tierLabels: ['S', 'A', 'B', 'C', 'D'], cardLabels: ['x', 'y'] });
    const list = store().lists[id];
    expect(list.tiers.map((t) => t.label)).toEqual(['S', 'A', 'B', 'C', 'D']);
    expect(list.pool).toHaveLength(2);
  });

  it('places cards given starting ranks', () => {
    const id = store().createList({ title: 'T', tierLabels: ['S', 'A'], cardLabels: ['x', 'y'], cardRanks: [0] });
    const list = store().lists[id];
    expect(list.placement[list.tiers[0].id]).toHaveLength(1);
    expect(list.pool).toHaveLength(1);
  });

  it('moves a card between tiers and back to the pool, at the requested index', () => {
    const id = store().createList({ title: 'T', tierLabels: ['S', 'A'], cardLabels: ['x', 'y', 'z'] });
    const [x, y, z] = store().lists[id].pool;
    const s = store().lists[id].tiers[0].id;
    store().moveCard(id, x, s);
    store().moveCard(id, y, s);
    store().moveCard(id, z, s, 0);
    expect(store().lists[id].placement[s]).toEqual([z, x, y]);
    store().moveCard(id, x, POOL);
    expect(store().lists[id].pool).toEqual([x]);
    expect(store().lists[id].placement[s]).toEqual([z, y]);
  });

  it('imports a shared list only once per code', () => {
    const shared = { code: 'K7F3QX', title: 'Partagée', tiers: [{ label: 'S', color: '#FF7F7F' }], cards: [{ label: 'x', color: '#000', tier: 0 }] };
    const first = store().importList(shared);
    expect(store().importList(shared)).toBe(first);
    expect(Object.keys(store().lists)).toHaveLength(1);
  });
});

describe('daily tier list', () => {
  const daily = { day: '2026-10-13', title: 'Saisons', emoji: '🍂', items: ['Été', 'Hiver'] };

  it('can only be validated once every card is ranked, and can be ranked again', () => {
    const id = store().createDailyList(daily);
    expect(store().validateDaily(id)).toBe(false);
    const list = store().lists[id];
    list.pool.forEach((cid) => store().moveCard(id, cid, list.tiers[0].id));
    expect(store().validateDaily(id)).toBe(true);
    const firstValidation = store().lists[id].daily!.validatedAt;
    expect(store().lists[id].daily!.validatedRanks).toEqual([0, 0]);

    // Still editable: a new validation replaces the ranking, the first date stays.
    store().moveCard(id, list.daily!.cardIds[0], list.tiers[3].id);
    expect(store().lists[id].daily!.validatedRanks).toEqual([0, 0]);
    expect(store().validateDaily(id)).toBe(true);
    expect(store().lists[id].daily!.validatedRanks).toEqual([3, 0]);
    expect(store().lists[id].daily!.validatedAt).toBe(firstValidation);
    expect(store().lists[id].daily!.voteSent).toBe(false);
  });
});

describe('popular tier lists', () => {
  const template = TEMPLATES.find((t) => t.key === 'fruits')!;

  it('records the validated ranking and can be validated again after changes', () => {
    const id = store().createPopularList(template);
    const list = store().lists[id];
    expect(list.popular?.voteKey).toBe(popularVoteKey(template));
    list.pool.forEach((cid) => store().moveCard(id, cid, list.tiers[1].id));
    expect(store().validatePopular(id)).toBe(true);
    expect(store().lists[id].popular?.validatedRanks?.every((r) => r === 1)).toBe(true);

    // Still editable after validation.
    store().moveCard(id, list.popular!.cardIds[0], list.tiers[0].id);
    expect(store().validatePopular(id)).toBe(true);
    expect(store().lists[id].popular?.validatedRanks?.[0]).toBe(0);
  });

  it('changes its statistics key when the cards change', () => {
    expect(popularVoteKey({ ...template, items: [...template.items, 'Nouveau'] })).not.toBe(popularVoteKey(template));
  });
});

describe('migrateStore', () => {
  it('drops the removed tier preset setting from v1 data', () => {
    const migrated = migrateStore({ settings: { haptics: true, defaultPresetKey: 'classic' }, lists: {} }, 1);
    expect(migrated.settings).toEqual({ haptics: true, onboarded: false });
  });

  it('shows the welcome screens only to people without tier lists', () => {
    expect(migrateStore({ settings: {}, lists: { a: {} } }, 2).settings?.onboarded).toBe(true);
    expect(migrateStore({ settings: {}, lists: {} }, 2).settings?.onboarded).toBe(false);
  });

  it('keeps the welcome screens seen in v3 data', () => {
    expect(migrateStore({ settings: { onboarded: false }, lists: {} }, 3).settings?.onboarded).toBe(false);
  });
});

describe('template favourites', () => {
  it('toggles a popular tier list favourite', () => {
    const { toggleTemplateFavorite } = useTierStore.getState();
    expect(toggleTemplateFavorite('fruits')).toBe(true);
    expect(useTierStore.getState().favoriteTemplates).toContain('fruits');
    expect(toggleTemplateFavorite('fruits')).toBe(false);
    expect(useTierStore.getState().favoriteTemplates).not.toContain('fruits');
  });
});

describe('new lists as drafts', () => {
  it('stays a draft until saved', () => {
    const id = store().createList({ title: 'T', tierLabels: ['S', 'A'], draft: true });
    expect(store().lists[id].draft).toBe(true);
    store().keepList(id);
    expect(store().lists[id].draft).toBeUndefined();
  });

  it('drops at launch the drafts with nothing in them, keeps those with the player’s work', () => {
    const empty = store().createList({ title: 'Vide', tierLabels: ['S'], draft: true });
    const untouched = store().createList({ title: 'Modèle', tierLabels: ['S'], cardLabels: ['x'], draft: true });
    const worked = store().createList({ title: 'Faite', tierLabels: ['S'], draft: true });
    useTierStore.setState((s) => ({ lists: { ...s.lists, [worked]: { ...s.lists[worked], createdAt: 1, updatedAt: 2 } } }));
    store().addCard(worked, { label: 'Carte', color: '#000000' });
    const saved = store().createList({ title: 'Enregistrée', tierLabels: ['S'] });
    store().dropDrafts();
    expect(store().lists[empty]).toBeUndefined();
    expect(store().lists[untouched]).toBeUndefined();
    expect(store().lists[worked].draft).toBeUndefined();
    expect(store().lists[saved]).toBeDefined();
  });
});
