import { TEMPLATES, type Template } from '../constants/presets';
import { groupByTheme, listTheme, THEMES } from '../lib/themes';

const list = (key: string, theme?: string): Template => ({ key, title: key, emoji: '✨', items: ['a'], theme });

describe('themes of the public tier lists', () => {
  it('places a list under its own theme', () => {
    expect(listTheme(list('x', 'voyages'), ['food'])).toBe('voyages');
  });

  it('places a list without a theme from its tags, the first ones weighing more', () => {
    expect(listTheme(list('daily-2026-10-13'), ['food', 'savory', 'fast-food'])).toBe('cuisine');
    expect(listTheme(list('d'), ['food', 'daily-life', 'lifestyle'])).toBe('cuisine');
    expect(listTheme(list('d'), ['halloween', 'holidays', 'fantasy'])).toBe('fetes');
  });

  it('falls back to everyday life with no tag', () => {
    expect(listTheme(list('d'), [])).toBe('loisirs');
    expect(listTheme(list('d', 'unknown'), undefined)).toBe('loisirs');
  });

  it('groups the lists in the order of the themes, each list once, empty themes left out', () => {
    const groups = groupByTheme([list('a', 'jeux'), list('b', 'cuisine'), list('c', 'cuisine')], {});
    expect(groups.map((g) => g.theme.key)).toEqual(['cuisine', 'jeux']);
    expect(groups[0].templates.map((t) => t.key)).toEqual(['b', 'c']);
  });

  it('gives every built-in list a theme that exists', () => {
    const keys = new Set(THEMES.map((t) => t.key));
    for (const t of TEMPLATES) expect(keys.has(t.theme ?? '')).toBe(true);
  });

  it('shows nine cards in every patchwork', () => {
    for (const theme of THEMES) expect(theme.preview).toHaveLength(9);
  });
});

describe('images of the built-in lists', () => {
  it('one concept per card, never twice in a list, written as the server writes them', () => {
    // The server's own normalization (supabase/functions/ai-generate/concepts.ts): a
    // concept written otherwise would miss its image in the library.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { normalizeConcept } = require('../../supabase/functions/ai-generate/concepts.ts');
    for (const t of TEMPLATES) {
      if (!t.concepts) continue;
      expect(t.concepts).toHaveLength(t.items.length);
      expect(new Set(t.concepts).size).toBe(t.concepts.length);
      for (const c of t.concepts) expect(normalizeConcept(c)).toBe(c);
    }
    for (const theme of THEMES) for (const p of theme.preview) expect(normalizeConcept(p.concept)).toBe(p.concept);
  });
});

describe('the sticker put forward in a theme’s circle', () => {
  it('is the card that says the theme best, first of its patchwork', () => {
    const heroes = Object.fromEntries(THEMES.map((t) => [t.key, t.preview[0].concept]));
    expect(heroes).toEqual({
      cuisine: 'pizza',
      voyages: 'airplane',
      jeux: 'gamepad',
      culture: 'film-clapperboard',
      nature: 'panda',
      fetes: 'christma-tree',
      loisirs: 'soccer-ball',
      imaginaire: 'dragon',
    });
  });
});

describe('the baked circles of the themes', () => {
  it('every theme ships its circle in the app, shown at once', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { THEME_PREVIEWS } = require('../constants/themePreviews');
    expect(Object.keys(THEME_PREVIEWS).sort()).toEqual(THEMES.map((t) => t.key).sort());
  });
});
