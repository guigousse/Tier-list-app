// Cutting an icon sheet: the image model draws every icon of a list on one picture
// (one call instead of one per card), on a flat magenta background, which is then
// removed here. Magenta rather than green, as in Broc: food is often green
// (cucumber, spinach, herbs) but almost never pure magenta.
// Works on raw RGBA pixels, so it is tested without any image library.

export const KEY = [255, 0, 255];

/** Background if this close to the key and connected to the sheet's edge. */
const LOOSE = 110;
/** Background anywhere, even enclosed (a donut's hole): only near-exact key colour. */
const TIGHT = 60;

type Pixels = Uint8ClampedArray | Uint8Array;

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Square cells, in a layout whose aspect ratio the image model accepts (1:1, 3:2, 4:3, 5:4). */
export function gridFor(n: number) {
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const d = gcd(cols, rows);
  return { cols, rows, aspect: `${cols / d}:${rows / d}` };
}

/**
 * Magenta of any brightness: the shadow the model blends into the background
 * (dark magenta) is far from the pure key but has its hue. Green well below both
 * red and blue, which stay close: a red onion's purple (green too high) is spared.
 */
function magentaHue(px: Pixels, i: number) {
  const r = px[i], g = px[i + 1], b = px[i + 2];
  const low = Math.min(r, b);
  if (low > 40 && g < low * 0.35 && Math.abs(r - b) < Math.max(r, b) * 0.25) return true;
  // Light pink tile the model sometimes lays behind an icon (~252,150,250): red and
  // blue both near full and equal, green clearly lower. A flamingo pink (blue well
  // below red) or a lavender (red lower) does not match.
  return low > 200 && Math.abs(r - b) < Math.max(r, b) * 0.1 && g < low * 0.75;
}

function distance(px: Pixels, i: number) {
  const r = px[i] - KEY[0], g = px[i + 1] - KEY[1], b = px[i + 2] - KEY[2];
  return Math.sqrt(r * r + g * g + b * b);
}

/** Makes the background transparent, in place. */
export function clearBackground(px: Pixels, w: number, h: number) {
  const n = w * h;
  const clear = new Uint8Array(n);
  // Flood from the edges and from every near-exact key pixel: a grid the model drew
  // anyway would otherwise wall the flood out of the cells. A pink inside an object
  // stays out of reach, behind the object's dark outline.
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  for (let p = 0; p < n; p++) if (distance(px, p * 4) < TIGHT) stack.push(p);
  while (stack.length) {
    const p = stack.pop()!;
    if (clear[p] || (distance(px, p * 4) >= LOOSE && !magentaHue(px, p * 4))) continue;
    clear[p] = 1;
    const x = p % w, y = (p - x) / w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  // Grid lines: rows or columns solid across almost the whole sheet. Icons never
  // are, each one keeps a magenta margin in its cell.
  for (let y = 0; y < h; y++) {
    let solid = 0;
    for (let x = 0; x < w; x++) solid += clear[y * w + x] ? 0 : 1;
    if (solid >= w * 0.85) for (let x = 0; x < w; x++) clear[y * w + x] = 1;
  }
  for (let x = 0; x < w; x++) {
    let solid = 0;
    for (let y = 0; y < h; y++) solid += clear[y * w + x] ? 0 : 1;
    if (solid >= h * 0.85) for (let y = 0; y < h; y++) clear[y * w + x] = 1;
  }
  for (let p = 0; p < n; p++) if (clear[p]) px[p * 4 + 3] = 0;

  // Despill: edge pixels blended with the magenta keep a pink fringe; red and blue
  // are brought back down to the green level, which magenta lacks.
  for (let p = 0; p < n; p++) {
    if (clear[p]) continue;
    const x = p % w, y = (p - x) / w;
    const edge = (x > 0 && clear[p - 1]) || (x < w - 1 && clear[p + 1]) || (y > 0 && clear[p - w]) || (y < h - 1 && clear[p + w]);
    if (!edge) continue;
    const i = p * 4;
    const spill = Math.min(px[i], px[i + 2]) - px[i + 1];
    if (spill > 0) {
      px[i] -= spill;
      px[i + 2] -= spill;
    }
  }
}

/**
 * Bounding box of the drawing in one cell (index row by row), ignoring specks;
 * null when the cell is empty, so the card keeps its emoji.
 */
export function cellObject(px: Pixels, w: number, h: number, grid: { cols: number; rows: number }, index: number) {
  const col = index % grid.cols, row = Math.floor(index / grid.cols);
  const x0 = Math.floor((col * w) / grid.cols), x1 = Math.floor(((col + 1) * w) / grid.cols);
  const y0 = Math.floor((row * h) / grid.rows), y1 = Math.floor(((row + 1) * h) / grid.rows);
  const cw = x1 - x0, ch = y1 - y0;
  const label = new Int32Array(cw * ch);
  const parts: { size: number; minX: number; minY: number; maxX: number; maxY: number }[] = [];
  const solid = (x: number, y: number) => px[(y * w + x) * 4 + 3] > 16;

  for (let sy = 0; sy < ch; sy++) {
    for (let sx = 0; sx < cw; sx++) {
      if (label[sy * cw + sx] || !solid(x0 + sx, y0 + sy)) continue;
      const part = { size: 0, minX: sx, minY: sy, maxX: sx, maxY: sy };
      parts.push(part);
      const stack = [sy * cw + sx];
      label[sy * cw + sx] = parts.length;
      while (stack.length) {
        const q = stack.pop()!;
        const qx = q % cw, qy = (q - qx) / cw;
        part.size++;
        part.minX = Math.min(part.minX, qx);
        part.maxX = Math.max(part.maxX, qx);
        part.minY = Math.min(part.minY, qy);
        part.maxY = Math.max(part.maxY, qy);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = qx + dx, ny = qy + dy;
            if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
            const k = ny * cw + nx;
            if (label[k] || !solid(x0 + nx, y0 + ny)) continue;
            label[k] = parts.length;
            stack.push(k);
          }
        }
      }
    }
  }

  // A grid line the model drew despite the prompt: a part only a few pixels thick.
  const thin = Math.min(cw, ch) * 0.04;
  const solidParts = parts.filter((p) => Math.min(p.maxX - p.minX + 1, p.maxY - p.minY + 1) >= thin);
  const largest = Math.max(0, ...solidParts.map((p) => p.size));
  // An object smaller than 0.5 % of its cell is noise, not a drawing.
  if (largest < cw * ch * 0.005) return null;
  // Pieces of the same drawing (chopsticks beside a sushi) stay; specks go.
  const kept = solidParts.filter((p) => p.size >= largest * 0.02);
  const minX = Math.min(...kept.map((p) => p.minX)), maxX = Math.max(...kept.map((p) => p.maxX));
  const minY = Math.min(...kept.map((p) => p.minY)), maxY = Math.max(...kept.map((p) => p.maxY));
  return { x: x0 + minX, y: y0 + minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** A sheet below this many cells costs as much as one this size: it is never drawn smaller. */
const MIN_CELLS = 12;
/** Gemini draws 20 icons readably on one 2K picture (5 × 4 cells of ~480 px). */
const MAX_CELLS = 20;

/**
 * What one sheet draws: the icons asked for, then concepts waiting in the wishlist
 * until the grid is full. A sheet costs the same with 3 icons or 12, so its free
 * cells draw ahead the icons the next players will want.
 */
export function fillSheet<T extends { concept: string }>(missing: T[], wishlist: T[]): T[] {
  if (missing.length === 0) return [];
  const asked = missing.slice(0, MAX_CELLS);
  const grid = gridFor(Math.max(asked.length, MIN_CELLS));
  const cells = Math.min(grid.cols * grid.rows, MAX_CELLS);
  const taken = new Set(asked.map((m) => m.concept));
  const extra = wishlist.filter((w) => !taken.has(w.concept) && taken.add(w.concept));
  return [...asked, ...extra.slice(0, cells - asked.length)];
}

/** What Gemini is asked; the style comes from the reference picture sent with it. */
export function sheetPrompt(cards: { label: string; concept: string; theme?: string }[], cols: number, rows: number) {
  // The list's theme settles a homonym the concept alone might not: a "Rose" among colours.
  const list = cards
    .map((c, i) => `${i + 1}. ${c.concept.replace(/-/g, " ")} (for a card named "${c.label}"${c.theme ? ` in a list about "${c.theme}"` : ""})`)
    .join("\n");
  const empty = cols * rows > cards.length ? `\nThe remaining ${cols * rows - cards.length} cell(s) at the end stay plain magenta.` : "";
  return [
    "The attached image shows the art style to copy exactly (not its objects): cozy cartoon sticker icons with bold rounded dark-brown outlines (#2A1B14), flat vivid colors, one darker shade and one soft light highlight per main shape, simple shapes that stay readable at 55 pixels.",
    `Draw one single image: a grid of ${cols} columns by ${rows} rows of equal square cells, on a flat uniform pure magenta background (#FF00FF) that fills the whole picture, including the space between the icons. The cells are invisible: only magenta between the icons.`,
    "Each cell holds exactly one icon, centered, about 70% of the cell size, with magenta space all around it. Each icon stands directly on the magenta background: no tile, card, square or frame behind it. The icons use any colors except magenta and pink.",
    "The picture contains only drawings: text, letters, numbers and logos are left out.",
    "Row by row, left to right, the cells contain:",
    list + empty,
  ].join("\n");
}
