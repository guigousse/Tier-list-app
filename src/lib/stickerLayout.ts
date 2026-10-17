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

/** The sizes and places of the two rings, found by search against the coverage test. */
// 1 + 7 + 13 = 21 cards: fewer leave holes at the rim once the ring cards are small.
export const RINGS = { inner: 7, innerRadius: [0.22, 0.27], innerSize: [0.34, 0.4], outerRadius: [0.38, 0.42], outerSize: [0.36, 0.42], jitter: 6 };
/** Cards in a theme's circle: the one put forward and the two rings. */
export const STICKERS = 21;

export function stickerLayout(key: string, count: number, rings: typeof RINGS = RINGS): Sticker[] {
  const rand = random(key);
  const between = (min: number, max: number) => min + rand() * (max - min);
  // One put forward in the middle; the others small, scattered on two rings around it
  // (the outer one cut by the rim), close enough that together they cover the circle.
  const inner = Math.min(rings.inner, count - 1);
  const outer = count - 1 - inner;
  const turn = rand() * 360;
  const ring = (n: number, k: number, radius: number[], size: number[], shift: number) => {
    const angle = ((turn + shift + (k * 360) / n + between(-rings.jitter, rings.jitter)) * Math.PI) / 180;
    const r = between(radius[0], radius[1]);
    return { x: 0.5 + r * Math.cos(angle), y: 0.5 + r * Math.sin(angle), size: between(size[0], size[1]), rotate: between(-26, 26), z: 0 };
  };
  const stickers: Sticker[] = [
    { x: 0.5 + between(-0.01, 0.01), y: 0.5 + between(-0.01, 0.01), size: between(0.64, 0.7), rotate: between(-6, 6), z: 0 },
    ...Array.from({ length: inner }, (_, k) => ring(inner, k, rings.innerRadius, rings.innerSize, 0)),
    // Half a step round: the outer cards sit in the gaps of the inner ones.
    ...Array.from({ length: outer }, (_, k) => ring(outer, k, rings.outerRadius, rings.outerSize, 180 / Math.max(1, outer))),
  ];
  // The ring in a shuffled stacking order (Fisher-Yates on the heights), the first on top.
  const heights = stickers.slice(1).map((_, i) => i);
  for (let i = heights.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [heights[i], heights[j]] = [heights[j], heights[i]];
  }
  return stickers.map((s, i) => ({ ...s, z: i === 0 ? count - 1 : heights[i - 1] }));
}
