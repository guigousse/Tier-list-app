// Draws a sheet of card icons with Gemini and cuts it into one PNG per cell.
// Lessons from Broc (scripts/generate-timbres.mjs, generate-album-item.mjs): never
// ask Gemini for transparency (it paints a checkerboard), ask for a flat key colour
// and remove it ourselves; give it a reference picture to keep one style throughout.
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

import { cellObject, clearBackground, gridFor, sheetPrompt } from "./sheet.ts";
import { STYLE_REF } from "./style-ref.ts";

/** Same price for a 1K or 2K picture: 2K gives each of 20 cells ~480 px. */
const MODEL = "gemini-3-pro-image-preview";
/** Icon side in pixels: sharp up to a ~64 pt card on a 3× screen. */
const TILE = 192;

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
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: grid.aspect, imageSize: "2K" } },
    }),
  });
  if (res.status === 429 || res.status === 503) throw new SheetError("busy");
  const data = await res.json().catch(() => null);
  const part = data?.candidates?.[0]?.content?.parts?.find((p: { inlineData?: unknown }) => p.inlineData);
  if (!part) {
    console.error("gemini", res.status, JSON.stringify(data).slice(0, 500));
    throw new SheetError("no image");
  }
  const sheet = await Image.decode(Uint8Array.from(atob(part.inlineData.data), (c) => c.charCodeAt(0)));
  clearBackground(sheet.bitmap, sheet.width, sheet.height);
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
    square.composite(sheet.clone().crop(box.x, box.y, box.w, box.h), Math.round((side - box.w) / 2), Math.round((side - box.h) / 2));
    tiles.push(await square.resize(TILE, TILE).encode(9));
  }
  return tiles;
}
