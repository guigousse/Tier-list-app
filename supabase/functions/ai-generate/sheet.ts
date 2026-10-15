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

/** Squared distance to the key: no square root in a loop over millions of pixels. */
function distance2(px: Pixels, i: number) {
  const r = px[i] - KEY[0], g = px[i + 1] - KEY[1], b = px[i + 2] - KEY[2];
  return r * r + g * g + b * b;
}

/**
 * Near-white, or near-white blended with the key on an antialiased rim: the tile the
 * model sometimes lays behind every icon (pure white on the "fêtes bizarres" sheet).
 */
function tileWhite(px: Pixels, i: number) {
  const r = px[i], g = px[i + 1], b = px[i + 2];
  const lo = Math.min(r, g, b), hi = Math.max(r, g, b);
  return (lo >= 200 && hi - lo <= 40) || (r >= 200 && b >= 200 && g >= 150 && Math.abs(r - b) < 30);
}

/** Rows (or columns) solid across the sheet, but only in bands a few pixels thick. */
function lineBands(solid: boolean[], maxThickness: number) {
  const lines: number[] = [];
  for (let a = 0; a < solid.length; ) {
    if (!solid[a]) {
      a++;
      continue;
    }
    let b = a;
    while (b < solid.length && solid[b]) b++;
    if (b - a <= maxThickness) for (let k = a; k < b; k++) lines.push(k);
    a = b;
  }
  return lines;
}

/** Makes the background transparent, in place. */
export function clearBackground(px: Pixels, w: number, h: number, grid?: { cols: number; rows: number }) {
  const n = w * h;
  const clear = new Uint8Array(n);
  // The edge function has 2 s of CPU for the whole sheet (≈ 4 Mpx at 2K): measured at
  // ~1 s for this flood written with a JS array and a square root per visit, a sheet
  // of presidents died there twice after Gemini had been paid. Each pixel's class is
  // computed once, and a pixel enters the typed stack at most once.
  const floodable = new Uint8Array(n);
  const stack = new Int32Array(n);
  let top = 0;
  const T2 = TIGHT * TIGHT, L2 = LOOSE * LOOSE;
  const push = (p: number) => {
    if (clear[p] || !floodable[p]) return;
    clear[p] = 1;
    stack[top++] = p;
  };
  for (let p = 0; p < n; p++) {
    const d = distance2(px, p * 4);
    floodable[p] = d < L2 || magentaHue(px, p * 4) ? 1 : 0;
  }
  // Flood from the edges and from every near-exact key pixel: a grid the model drew
  // anyway would otherwise wall the flood out of the cells. A pink inside an object
  // stays out of reach, behind the object's dark outline.
  for (let x = 0; x < w; x++) push(x), push((h - 1) * w + x);
  for (let y = 0; y < h; y++) push(y * w), push(y * w + w - 1);
  for (let p = 0; p < n; p++) if (distance2(px, p * 4) < T2) push(p);
  while (top) {
    const p = stack[--top];
    const x = p % w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (p >= w) push(p - w);
    if (p < n - w) push(p + w);
  }
  // White tile behind each icon: flooded in from the background, it stops at the
  // icon's dark outline, so the white inside a drawing stays. Only a region spanning
  // most of a cell is a tile; a small white thing touching the magenta is a drawing.
  if (grid) {
    const cw = w / grid.cols, ch = h / grid.rows;
    const seen = new Uint8Array(n);
    // The flood's stack is free again: it holds each region, which is also its queue.
    const region = stack;
    for (let s = 0; s < n; s++) {
      if (seen[s] || clear[s] || !tileWhite(px, s * 4)) continue;
      const sx = s % w, sy = (s - sx) / w;
      const touches = (sx > 0 && clear[s - 1]) || (sx < w - 1 && clear[s + 1]) || (sy > 0 && clear[s - w]) || (sy < h - 1 && clear[s + w]);
      if (!touches) continue;
      let minX = sx, maxX = sx, minY = sy, maxY = sy;
      let size = 0;
      seen[s] = 1;
      region[size++] = s;
      for (let k = 0; k < size; k++) {
        const p = region[k];
        const x = p % w, y = (p - x) / w;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (x > 0 && !seen[p - 1] && !clear[p - 1] && tileWhite(px, (p - 1) * 4)) (seen[p - 1] = 1), (region[size++] = p - 1);
        if (x < w - 1 && !seen[p + 1] && !clear[p + 1] && tileWhite(px, (p + 1) * 4)) (seen[p + 1] = 1), (region[size++] = p + 1);
        if (y > 0 && !seen[p - w] && !clear[p - w] && tileWhite(px, (p - w) * 4)) (seen[p - w] = 1), (region[size++] = p - w);
        if (y < h - 1 && !seen[p + w] && !clear[p + w] && tileWhite(px, (p + w) * 4)) (seen[p + w] = 1), (region[size++] = p + w);
      }
      if (maxX - minX + 1 >= cw * 0.6 && maxY - minY + 1 >= ch * 0.6) for (let k = 0; k < size; k++) clear[region[k]] = 1;
    }
  }

  // Grid lines: rows or columns solid across almost the whole sheet, a few pixels
  // thick. Icons never are, each one keeps a magenta margin in its cell. Without the
  // thickness bound, tiles laid nearly edge to edge passed for a grid and every row
  // through them was wiped, icons included: only the tiles' rounded tops survived.
  const rowSolid = Array.from({ length: h }, (_, y) => {
    let solid = 0;
    for (let x = 0; x < w; x++) solid += clear[y * w + x] ? 0 : 1;
    return solid >= w * 0.85;
  });
  const colSolid = Array.from({ length: w }, (_, x) => {
    let solid = 0;
    for (let y = 0; y < h; y++) solid += clear[y * w + x] ? 0 : 1;
    return solid >= h * 0.85;
  });
  for (const y of lineBands(rowSolid, Math.max(3, h * 0.02))) for (let x = 0; x < w; x++) clear[y * w + x] = 1;
  for (const x of lineBands(colSolid, Math.max(3, w * 0.02))) for (let y = 0; y < h; y++) clear[y * w + x] = 1;
  // Transparent black, not transparent magenta: resizing a tile blends neighbours'
  // colours whatever their alpha, and the magenta would come back as a pink rim.
  for (let p = 0; p < n; p++) if (clear[p]) px.fill(0, p * 4, p * 4 + 4);

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
  const stack = new Int32Array(cw * ch);
  const parts: { size: number; minX: number; minY: number; maxX: number; maxY: number }[] = [];
  const solid = (x: number, y: number) => px[(y * w + x) * 4 + 3] > 16;

  for (let sy = 0; sy < ch; sy++) {
    for (let sx = 0; sx < cw; sx++) {
      if (label[sy * cw + sx] || !solid(x0 + sx, y0 + sy)) continue;
      const part = { size: 0, minX: sx, minY: sy, maxX: sx, maxY: sy };
      parts.push(part);
      let top = 0;
      stack[top++] = sy * cw + sx;
      label[sy * cw + sx] = parts.length;
      while (top) {
        const q = stack[--top];
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
            stack[top++] = k;
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
/** Gemini draws 20 icons readably on one 1K picture (5 × 4 cells of ~230 px). */
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

/**
 * A famous person, drawn as a caricature bust rather than an object that stands for them
 * (Obama was a basketball). Gemini draws presidents this way; it may refuse some
 * faces, hence drawWithFallback.
 */
export const isBust = (concept: string) => concept.startsWith("bust-");

/** What Gemini is asked; the style comes from the reference picture sent with it. */
export function sheetPrompt(cards: { label: string; concept: string; theme?: string }[], cols: number, rows: number) {
  // The list's theme settles a homonym the concept alone might not: a "Rose" among colours.
  const list = cards
    .map((c, i) => {
      const what = isBust(c.concept) ? `a friendly caricature bust (head and shoulders) of ${c.label}, recognizable by face, hairstyle and clothing` : c.concept.replace(/-/g, " ");
      return `${i + 1}. ${what} (for a card named "${c.label}"${c.theme ? ` in a list about "${c.theme}"` : ""})`;
    })
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

/**
 * The cards a request has to draw: those whose concept isn't in the library yet, and
 * those the player asked to redraw (a new image joins the old one). Each concept once.
 */
export function cardsToDraw<T extends { concept: string; redraw?: boolean }>(asked: T[], drawn: Set<string>): T[] {
  const seen = new Set<string>();
  return asked.filter((c) => {
    if (seen.has(c.concept)) return false;
    seen.add(c.concept);
    return c.redraw || !drawn.has(c.concept);
  });
}

/**
 * Copies a box of the sheet into a tile at (dx, dy), row by row. Cloning the whole
 * sheet to crop each tile copied ≈ 17 MB per icon: a third of the CPU budget.
 */
export function copyRegion(
  src: Pixels,
  srcW: number,
  box: { x: number; y: number; w: number; h: number },
  dst: Pixels,
  dstW: number,
  dx: number,
  dy: number,
) {
  for (let y = 0; y < box.h; y++) {
    const from = ((box.y + y) * srcW + box.x) * 4;
    dst.set(src.subarray(from, from + box.w * 4), ((dy + y) * dstW + dx) * 4);
  }
}

/**
 * Draws a sheet, and when Gemini refuses it (no picture: it turns down some real faces,
 * and one refused face loses the whole sheet), draws it again without the busts: the
 * other cards get their picture, the busts none, and are not charged. A refusal costs
 * nothing at Gemini. Tiles come back in the plan's order.
 */
export async function drawWithFallback<T extends { concept: string }>(
  plan: T[],
  draw: (cards: T[]) => Promise<(Uint8Array | null)[]>,
): Promise<(Uint8Array | null)[]> {
  try {
    return await draw(plan);
  } catch (e) {
    const others = plan.filter((c) => !isBust(c.concept));
    if (!(e instanceof Error) || e.message !== "no image" || others.length === plan.length || others.length === 0) throw e;
    const tiles = await draw(others);
    let next = 0;
    return plan.map((c) => (isBust(c.concept) ? null : tiles[next++] ?? null));
  }
}
