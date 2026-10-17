import type { Template } from '../constants/presets';
import { popularShown, searchIndex } from '../lib/popularSearch';
import type { TierList } from '../store/types';

const t = (key: string, title: string, items: string[]): Template => ({ key, title, emoji: '✨', items }) as Template;
const templates = [t('fruits', 'Fruits', ['Pomme', 'Pêche']), t('cheeses', 'Fromages', ['Comté', 'Brie']), t('animals', 'Animaux', ['Chat'])];
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
