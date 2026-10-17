import type { Template } from '../constants/presets';
import { popularShown, searchIndex } from '../lib/popularSearch';
import type { TierList } from '../store/types';

const t = (key: string, title: string, items: string[], theme?: string): Template => ({ key, title, emoji: '✨', items, theme }) as Template;
const templates = [t('fruits', 'Fruits', ['Pomme', 'Pêche'], 'cuisine'), t('cheeses', 'Fromages', ['Comté', 'Brie'], 'cuisine'), t('animals', 'Animaux', ['Chat'], 'nature')];
const validated = { popular: { validatedAt: 1 } } as unknown as TierList;
const started = { popular: {} } as unknown as TierList;
const copies = (x: Template) => (x.key === 'fruits' ? validated : x.key === 'cheeses' ? started : undefined);

describe('searching the popular tier lists', () => {
  const index = searchIndex(templates);
  const shown = (query: string, filter: Parameters<typeof popularShown>[0]['filter'] = 'all', sort: 'popular' | 'title' = 'popular') =>
    popularShown({ templates, index, copies, favorites: ['animals'], query, filter, sort }).map((x) => x.key);

  it('finds a title or a card, without accents nor case', () => {
    expect(shown('peche')).toEqual(['fruits']);
    expect(shown('COMTE')).toEqual(['cheeses']);
    expect(shown('')).toEqual(['fruits', 'cheeses', 'animals']);
  });

  it('filters and sorts as before', () => {
    expect(shown('', 'favorites')).toEqual(['animals']);
    expect(shown('', 'todo')).toEqual(['animals']);
    expect(shown('', 'started')).toEqual(['cheeses']);
    expect(shown('', 'validated')).toEqual(['fruits']);
    expect(shown('', 'all', 'title')).toEqual(['animals', 'cheeses', 'fruits']);
  });

  it('folds every text once, not at every key typed', () => {
    const spy = jest.spyOn(String.prototype, 'normalize');
    const big = Array.from({ length: 366 }, (_, i) => t(`k${i}`, `Liste ${i}`, ['A', 'B', 'C']));
    const bigIndex = searchIndex(big);
    spy.mockClear();
    for (const q of ['l', 'li', 'lis', 'list']) popularShown({ templates: big, index: bigIndex, copies: () => undefined, favorites: [], query: q, filter: 'all', sort: 'popular' });
    // Only the query itself, once per key typed.
    expect(spy.mock.calls.length).toBe(4);
    spy.mockRestore();
  });
});

describe('a grand theme opened in the gallery', () => {
  const index = searchIndex(templates);
  const inTheme = (theme: string, query = '') =>
    popularShown({ templates, index, copies, favorites: [], query, filter: 'all', sort: 'popular', theme, tags: {} }).map((x) => x.key);

  it('shows its lists only', () => {
    expect(inTheme('cuisine')).toEqual(['fruits', 'cheeses']);
    expect(inTheme('nature')).toEqual(['animals']);
  });

  it('a search stays inside the theme', () => {
    expect(inTheme('cuisine', 'chat')).toEqual([]);
    expect(inTheme('cuisine', 'brie')).toEqual(['cheeses']);
  });

  it('a list without a theme of its own is placed by its tags', () => {
    const daily = t('daily-2026-10-13', 'Halloween', ['Citrouille']);
    const shown = popularShown({ templates: [daily], index: searchIndex([daily]), copies, favorites: [], query: '', filter: 'all', sort: 'popular', theme: 'fetes', tags: { 'daily-2026-10-13': ['halloween', 'holidays'] } });
    expect(shown.map((x) => x.key)).toEqual(['daily-2026-10-13']);
  });
});
