import { stickerLayout } from '../lib/stickerLayout';

describe('the sticker bomb of a theme', () => {
  it('is the same at every opening, and differs from one theme to another', () => {
    expect(stickerLayout('cuisine', 9)).toEqual(stickerLayout('cuisine', 9));
    expect(stickerLayout('cuisine', 9)).not.toEqual(stickerLayout('voyages', 9));
  });

  it('scatters the stickers over the whole tile, overlapping, tilted, some cut by the edges', () => {
    for (const key of ['cuisine', 'voyages', 'jeux', 'culture', 'nature', 'fetes', 'loisirs', 'imaginaire']) {
      const stickers = stickerLayout(key, 9);
      expect(stickers).toHaveLength(9);
      // Every third of the tile, across and down, holds a sticker: no empty corner.
      for (const third of [0, 1, 2]) {
        expect(stickers.some((s) => Math.floor(s.x * 3) === third)).toBe(true);
        expect(stickers.some((s) => Math.floor(s.y * 3) === third)).toBe(true);
      }
      for (const s of stickers) {
        expect(s.size).toBeGreaterThanOrEqual(0.45);
        expect(s.size).toBeLessThanOrEqual(0.62);
        expect(Math.abs(s.rotate)).toBeLessThanOrEqual(22);
      }
      // Big enough to overlap: three across take more than the tile's width.
      expect(stickers.reduce((sum, s) => sum + s.size, 0) / 3).toBeGreaterThan(1);
      // Some go past an edge, as on a laptop lid.
      expect(stickers.some((s) => s.x - s.size / 2 < 0 || s.x + s.size / 2 > 1 || s.y - s.size / 2 < 0 || s.y + s.size / 2 > 1)).toBe(true);
      // Stacked in a shuffled order, each at its own height.
      expect(new Set(stickers.map((s) => s.z)).size).toBe(9);
    }
  });
});
