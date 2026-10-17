import { STICKERS, stickerLayout } from '../lib/stickerLayout';
import { themeStickers, THEMES, type Theme } from '../lib/themes';
import type { Template } from '../constants/presets';

const KEYS = ['cuisine', 'voyages', 'jeux', 'culture', 'nature', 'fetes', 'loisirs', 'imaginaire'];
const N = STICKERS;

describe('the sticker bomb of a theme', () => {
  it('is the same at every opening, and differs from one theme to another', () => {
    expect(stickerLayout('cuisine', N)).toEqual(stickerLayout('cuisine', N));
    expect(stickerLayout('cuisine', N)).not.toEqual(stickerLayout('voyages', N));
  });

  it('covers the whole circle, nothing of the background showing', () => {
    for (const key of KEYS) {
      const stickers = stickerLayout(key, N);
      // A drawing fills about 80 % of its sticker: its solid part reaches 0.4 × its size
      // from its centre. Every point of the circle (to its rim, cut there anyway) is
      // under one of them.
      for (let x = 0; x <= 1; x += 0.02) {
        for (let y = 0; y <= 1; y += 0.02) {
          if (Math.hypot(x - 0.5, y - 0.5) > 0.47) continue;
          const covered = stickers.some((s) => Math.hypot(x - s.x, y - s.y) <= s.size * 0.4);
          if (!covered) throw new Error(`${key}: (${x.toFixed(2)}, ${y.toFixed(2)}) is bare`);
        }
      }
    }
  });

  it('the cards behind are small and scattered, tilted, stacked in a shuffled order', () => {
    for (const key of KEYS) {
      const [, ...ring] = stickerLayout(key, N);
      for (const s of ring) {
        expect(s.size).toBeLessThanOrEqual(0.42);
        expect(Math.abs(s.rotate)).toBeLessThanOrEqual(26);
        expect(Math.hypot(s.x - 0.5, s.y - 0.5)).toBeLessThan(0.47);
      }
      // Scattered: not all at one distance from the middle.
      const distances = ring.map((s) => Math.hypot(s.x - 0.5, s.y - 0.5));
      expect(Math.max(...distances) - Math.min(...distances)).toBeGreaterThan(0.1);
      expect(new Set(stickerLayout(key, N).map((s) => s.z)).size).toBe(N);
    }
  });

  it('puts the first sticker forward: in the middle, far the biggest, nearly straight, on top of all', () => {
    for (const key of KEYS) {
      const [hero, ...ring] = stickerLayout(key, N);
      expect(Math.hypot(hero.x - 0.5, hero.y - 0.5)).toBeLessThan(0.02);
      expect(Math.abs(hero.rotate)).toBeLessThanOrEqual(6);
      expect(hero.size).toBeGreaterThan(1.5 * Math.max(...ring.map((s) => s.size)));
      expect(hero.z).toBeGreaterThan(Math.max(...ring.map((s) => s.z)));
    }
  });
});

describe('the cards of a theme’s circle', () => {
  const theme: Theme = {
    key: 'cuisine',
    title: 'Cuisine',
    emoji: '🍽️',
    tags: [],
    preview: [
      { concept: 'pizza', emoji: '🍕' },
      { concept: 'sushi', emoji: '🍣' },
      { concept: 'croissant', emoji: '🥐' },
    ],
  };
  const fruits = { key: 'fruits', title: 'Fruits', emoji: '🍓', items: ['🍎 Pomme', '🍌 Banane', '🍕 Pizza'], concepts: ['red-apple', 'banana', 'pizza'] } as Template;

  it('the hero first, then the cards already drawn, then the others, each once', () => {
    const icons = { banana: 'u1', croissant: 'u2' };
    expect(themeStickers(theme, [fruits], icons, 6).map((c: { concept: string }) => c.concept)).toEqual(['pizza', 'croissant', 'banana', 'sushi', 'red-apple']);
  });

  it('takes the emoji of a list’s card for a card not drawn yet', () => {
    expect(themeStickers(theme, [fruits], {}, 6).find((c: { concept: string }) => c.concept === 'red-apple')?.emoji).toBe('🍎');
  });

  it('stops at the number asked', () => {
    expect(themeStickers(theme, [fruits], {}, 2)).toHaveLength(2);
  });

  it('every theme has enough of its own cards to fill its circle', () => {
    // The built-in lists only: published ones add more.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TEMPLATES } = require('../constants/presets');
    for (const t of THEMES) {
      const lists = TEMPLATES.filter((l: Template) => l.theme === t.key);
      expect(themeStickers(t, lists, {}, N).length).toBeGreaterThanOrEqual(N - 2);
    }
  });
});
