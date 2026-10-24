import { TEMPLATES } from '../constants/presets';
import { contentText, localizeList, localizeTemplate, themeTitle } from '../lib/i18n/content';
import { popularVoteKey, useTierStore } from '../store/useTierStore';

const fruits = TEMPLATES.find((t) => t.key === 'fruits')!;

describe('content translations', () => {
  it('bundles every built-in list in English, Spanish and Greek, aligned card by card', () => {
    for (const lang of ['en', 'es', 'el'] as const) {
      for (const template of TEMPLATES) {
        const text = contentText(template.key, lang);
        expect(text?.title).toBeTruthy();
        expect(text?.items).toHaveLength(template.items.length);
        if (template.tiers) expect(text?.tiers).toHaveLength(template.tiers.length);
      }
    }
  });

  it('leaves French as written, and an unknown list untouched', () => {
    expect(contentText('fruits', 'fr')).toBeUndefined();
    expect(contentText('nope', 'en')).toBeUndefined();
  });

  it('prefers the translation fetched from the server', () => {
    const remote = { lang: 'en' as const, template: { fruits: { title: 'Fresh fruit' } }, daily: {} };
    expect(contentText('fruits', 'en', remote)?.title).toBe('Fresh fruit');
    // Fetched for another language: ignored.
    expect(contentText('fruits', 'es', remote)?.title).not.toBe('Fresh fruit');
  });

  it('finds a past daily list by its day', () => {
    const remote = { lang: 'en' as const, template: {}, daily: { '2026-10-13': { title: 'Pizza Toppings', items: ['🍍 Pineapple'] } } };
    expect(contentText('daily-2026-10-13', 'en', remote)?.title).toBe('Pizza Toppings');
  });

  it('translates a template shown in the gallery, keeping its key', () => {
    const text = contentText('fruits', 'es')!;
    const shown = localizeTemplate(fruits, text);
    expect(shown.key).toBe('fruits');
    expect(shown.title).toBe(text.title);
    expect(shown.items).toEqual(text.items);
    expect(shown.items).not.toEqual(fruits.items);
    expect(shown.concepts).toEqual(fruits.concepts);
  });

  it('shows a popular list in the player’s language while its save stays in French', () => {
    const store = useTierStore.getState();
    const id = store.createPopularList(fruits, {});
    const list = useTierStore.getState().lists[id];
    const text = contentText('fruits', 'en')!;
    const shown = localizeList(list, text);

    expect(shown.title).toBe(text.title);
    list.popular!.cardIds.forEach((cid, i) => expect(shown.cards[cid].label).toBe(text.items![i]));
    // The save keeps the source labels: votes and the public list's sync go by them.
    list.popular!.cardIds.forEach((cid, i) => expect(list.cards[cid].label).toBe(fruits.items[i]));
    expect(list.popular!.voteKey).toBe(popularVoteKey(fruits));
    // Same ids, same placement: moving a card in the translated view moves the saved one.
    expect(shown.placement).toBe(list.placement);
    expect(Object.keys(shown.cards).sort()).toEqual(Object.keys(list.cards).sort());
  });

  it('translates only the cards it knows when the public list grew since', () => {
    const store = useTierStore.getState();
    const id = store.createPopularList(fruits, {});
    const list = useTierStore.getState().lists[id];
    const shown = localizeList(list, { title: 'Fruit', items: ['🍎 Apple'] });
    const [first, second] = list.popular!.cardIds;
    expect(shown.cards[first].label).toBe('🍎 Apple');
    expect(shown.cards[second].label).toBe(list.cards[second].label);
  });

  it('translates the tiers of a daily list, not the letters of a copy made before they were named', () => {
    const store = useTierStore.getState();
    const daily = { day: '2026-10-30', title: 'Corvées', emoji: '🧹', items: ['Vaisselle', 'Lessive'] };
    const text = { items: ['Dishes', 'Laundry'], tiers: ['Almost fun', 'Fine', 'Must do', 'Later', 'I move out'] };
    const namedId = store.createDailyList({ ...daily, tiers: ['Presque un plaisir', 'Ça se fait', 'Par obligation', 'Je repousse', 'Je déménage'] });
    const named = useTierStore.getState().lists[namedId];
    expect(localizeList(named, text).tiers.map((t) => t.label)).toEqual(text.tiers);
    const letteredId = store.createDailyList({ ...daily, day: '2026-10-31' });
    const lettered = useTierStore.getState().lists[letteredId];
    expect(localizeList(lettered, text).tiers.map((t) => t.label)).toEqual(['S', 'A', 'B', 'C', 'D']);
  });

  it('does not touch the player’s own lists', () => {
    const store = useTierStore.getState();
    const id = store.createList({ title: 'Ma liste', tierLabels: ['S'], cardLabels: ['Pomme'] });
    const list = useTierStore.getState().lists[id];
    expect(localizeList(list, { title: 'My list', items: ['Apple'] })).toBe(list);
    expect(localizeList(list, undefined)).toBe(list);
  });

  it('makes the player’s copy from the French source even when opened from a translated gallery', () => {
    const shown = localizeTemplate(fruits, contentText('fruits', 'el'));
    expect(popularVoteKey(shown)).toBe(popularVoteKey(fruits));
    const id = useTierStore.getState().createPopularList(shown, {});
    const list = useTierStore.getState().lists[id];
    expect(list.title).toBe(fruits.title);
    expect(list.popular!.cardIds.map((cid) => list.cards[cid].label)).toEqual(fruits.items);
    useTierStore.getState().syncPopular(id, shown, {});
    const synced = useTierStore.getState().lists[id];
    expect(Object.values(synced.cards).map((c) => c.label).sort()).toEqual([...fruits.items].sort());
  });

  it('keeps every translated tier word whole in a tier label, at the smallest size', () => {
    // A label is 72 px wide inside on a phone, its text 9 px at the smallest; measured
    // widths of a bold letter: 0.66 em in Greek, 0.6 in Latin scripts.
    const fits = (word: string) => word.length * 9 * (/[\u0370-\u03ff]/.test(word) ? 0.66 : 0.6) <= 72;
    const cut = (['en', 'es', 'el'] as const).flatMap((lang) =>
      TEMPLATES.flatMap((template) => (contentText(template.key, lang)?.tiers ?? []).flatMap((tier) => tier.split(/\s+/))).filter((w) => !fits(w)),
    );
    expect(cut).toEqual([]);
  });

  it('names the themes in each language', () => {
    expect(themeTitle('cuisine', 'fr')).toBeUndefined();
    expect(themeTitle('cuisine', 'en')).toBeTruthy();
    expect(themeTitle('cuisine', 'el')).toBeTruthy();
  });
});
