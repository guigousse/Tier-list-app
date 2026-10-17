/**
 * Where the stickers of a theme's tile go: scattered like a laptop lid covered in
 * stickers, overlapping, tilted, some cut by the edges. Drawn from the theme's key, so
 * a tile looks the same at every opening and no two themes look alike.
 */
export type Sticker = {
  /** Centre, as a fraction of the tile's side. */
  x: number;
  y: number;
  /** Width and height, as a fraction of the tile's side. */
  size: number;
  /** Degrees. */
  rotate: number;
  /** Stacking order, 0 at the bottom. */
  z: number;
};

/** A small seeded generator (mulberry32): the same key, the same numbers. */
function random(seed: string): () => number {
  let h = 1779033703;
  for (const ch of seed) h = Math.imul(h ^ ch.codePointAt(0)!, 3432918353);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function stickerLayout(key: string, count: number): Sticker[] {
  const rand = random(key);
  const between = (min: number, max: number) => min + rand() * (max - min);
  // One sticker per cell of a 3×3 grid, pushed off its centre: no corner stays empty,
  // and neighbours overlap since each is wider than a third of the tile.
  const stickers = Array.from({ length: count }, (_, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3) % 3;
    return {
      x: Math.min(0.97, Math.max(0.03, (col + 0.5) / 3 + between(-0.12, 0.12))),
      y: Math.min(0.97, Math.max(0.03, (row + 0.5) / 3 + between(-0.12, 0.12))),
      size: between(0.46, 0.62),
      rotate: between(-22, 22),
      z: 0,
    };
  });
  // A shuffled stacking order (Fisher-Yates on the heights).
  const heights = stickers.map((_, i) => i);
  for (let i = heights.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [heights[i], heights[j]] = [heights[j], heights[i]];
  }
  return stickers.map((s, i) => ({ ...s, z: heights[i] }));
}
