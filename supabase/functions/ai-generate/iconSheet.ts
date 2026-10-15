// Draws a sheet of card icons with Gemini and cuts it into one PNG per cell.
// Lessons from Broc (scripts/generate-timbres.mjs, generate-album-item.mjs): never
// ask Gemini for transparency (it paints a checkerboard), ask for a flat key colour
// and remove it ourselves; give it a reference picture to keep one style throughout.
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

import { cellObject, clearBackground, copyRegion, gridFor, sheetPrompt } from "./sheet.ts";
import { STYLE_REF } from "./style-ref.ts";

/**
 * Flash 3.1 at 1K: ≈ 6.8 c$ a sheet against 13.9 for 3 Pro at 2K, and ≈ 10 s instead of
 * 21. Compared on the same prompt (Greek dishes, presidents, 12 and 20 cells): same
 * style, faces as recognizable. 1K gives each of 20 cells ~230 px, above the tile; 2K
 * Flash costs half as much again for no visible gain.
 */
const MODEL = "gemini-3.1-flash-image-preview";
const SIZE = "1K";
/** Icon side in pixels: sharp up to a ~64 pt card on a 3× screen. */
const TILE = 192;
/** Longest side the sheet is cut at (see drawSheet). */
const SHEET_MAX = 1600;
/** zlib level 3, not 9: measured on 20 tiles, 200 ms instead of 780, files 1 % bigger. */
const PNG_LEVEL = 3;

export class SheetError extends Error {}

/** One PNG per card, in order; null where the cell came out empty. */
export async function drawSheet(cards: { label: string; concept: string; theme?: string }[]): Promise<(Uint8Array | null)[]> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new SheetError("no key");
  const grid = gridFor(cards.length);
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: "image/webp", data: STYLE_REF } }, { text: sheetPrompt(cards, grid.cols, grid.rows) }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: grid.aspect, imageSize: SIZE } },
    }),
  });
  if (res.status === 429 || res.status === 503) throw new SheetError("busy");
  const data = await res.json().catch(() => null);
  const part = data?.candidates?.[0]?.content?.parts?.find((p: { inlineData?: unknown }) => p.inlineData);
  if (!part) {
    console.error("gemini", res.status, JSON.stringify(data).slice(0, 500));
    throw new SheetError("no image");
  }
  // A plain loop: Uint8Array.from with a callback runs it on each of ~6 M characters.
  const binary = atob(part.inlineData.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const sheet = await Image.decode(bytes);
  // Keying a 2K sheet of 20 cells (5 Mpx) took ≈ 1.6 s of the 2 s of CPU; at 1600 px,
  // ≈ 1 s. A 1K sheet (≈ 1200 px) is already below: this only guards a bigger answer.
  const k = SHEET_MAX / Math.max(sheet.width, sheet.height);
  if (k < 1) sheet.resize(Math.round(sheet.width * k), Math.round(sheet.height * k));
  clearBackground(sheet.bitmap, sheet.width, sheet.height, grid);
  const tiles: (Uint8Array | null)[] = [];
  for (let i = 0; i < cards.length; i++) {
    const box = cellObject(sheet.bitmap, sheet.width, sheet.height, grid, i);
    if (!box) {
      tiles.push(null);
      continue;
    }
    // Square with a small margin, so every icon sits the same way on its card.
    const side = Math.round(Math.max(box.w, box.h) * 1.08);
    const square = new Image(side, side);
    copyRegion(sheet.bitmap, sheet.width, box, square.bitmap, side, Math.round((side - box.w) / 2), Math.round((side - box.h) / 2));
    tiles.push(await square.resize(TILE, TILE).encode(PNG_LEVEL));
  }
  return tiles;
}
