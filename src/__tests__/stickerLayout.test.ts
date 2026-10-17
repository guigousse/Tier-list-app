import { stickerLayout } from '../lib/stickerLayout';

const KEYS = ['cuisine', 'voyages', 'jeux', 'culture', 'nature', 'fetes', 'loisirs', 'imaginaire'];

describe('the sticker bomb of a theme', () => {
  it('is the same at every opening, and differs from one theme to another', () => {
    expect(stickerLayout('cuisine', 9)).toEqual(stickerLayout('cuisine', 9));
    expect(stickerLayout('cuisine', 9)).not.toEqual(stickerLayout('voyages', 9));
  });

  it('covers the whole circle, nothing of the background showing', () => {
    for (const key of KEYS) {
      const stickers = stickerLayout(key, 9);
      // A drawing fills about 80 % of its sticker: its solid part reaches 0.4 × its size
      // from its centre. Every point of the circle (to its rim, cut there anyway) is
      // under one of them.
      for (let x = 0; x <= 1; x += 0.04) {
        for (let y = 0; y <= 1; y += 0.04) {
          if (Math.hypot(x - 0.5, y - 0.5) > 0.47) continue;
          const covered = stickers.some((s) => Math.hypot(x - s.x, y - s.y) <= s.size * 0.4);
          if (!covered) throw new Error(`${key}: (${x.toFixed(2)}, ${y.toFixed(2)}) is bare`);
        }
      }
    }
  });

  it('packs them tight, tilted, stacked in a shuffled order', () => {
    for (const key of KEYS) {
      const stickers = stickerLayout(key, 9);
      expect(stickers).toHaveLength(9);
      for (const s of stickers) expect(Math.abs(s.rotate)).toBeLessThanOrEqual(22);
      // Nothing thrown outside the circle: every centre sits inside it.
      for (const s of stickers) expect(Math.hypot(s.x - 0.5, s.y - 0.5)).toBeLessThan(0.42);
      expect(new Set(stickers.map((s) => s.z)).size).toBe(9);
    }
  });
});
