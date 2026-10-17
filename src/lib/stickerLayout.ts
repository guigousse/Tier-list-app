/**
 * Where the stickers of a theme's tile go: packed in a circle like a laptop lid
 * covered in stickers, overlapping, tilted, cut by the rim. Drawn from the theme's key, so
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
  // One in the middle, the others in a ring around it, each a little off its place:
  // close enough that together they cover the whole circle the tile is cut to.
  const ring = Math.max(1, count - 1);
  const turn = rand() * 360;
  const stickers = Array.from({ length: count }, (_, i) => {
    if (i === 0) return { x: 0.5 + between(-0.03, 0.03), y: 0.5 + between(-0.03, 0.03), size: between(0.5, 0.56), rotate: between(-22, 22), z: 0 };
    const angle = ((turn + ((i - 1) * 360) / ring + between(-8, 8)) * Math.PI) / 180;
    const radius = between(0.29, 0.33);
    return {
      x: 0.5 + radius * Math.cos(angle),
      y: 0.5 + radius * Math.sin(angle),
      size: between(0.58, 0.66),
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
