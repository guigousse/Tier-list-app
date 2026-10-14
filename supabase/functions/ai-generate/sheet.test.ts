// deno test supabase/functions/ai-generate/sheet.test.ts
import { cellObject, clearBackground, gridFor, KEY } from "./sheet.ts";

function same(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
  }
}

/** A w×h sheet filled with the key colour, opaque. */
function sheet(w: number, h: number) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) px.set([KEY[0], KEY[1], KEY[2], 255], i * 4);
  return px;
}
function paint(px: Uint8ClampedArray, w: number, x0: number, y0: number, x1: number, y1: number, rgb: number[]) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px.set([rgb[0], rgb[1], rgb[2], 255], (y * w + x) * 4);
}
const alpha = (px: Uint8ClampedArray, w: number, x: number, y: number) => px[(y * w + x) * 4 + 3];

Deno.test("la grille garde des cases carrées et un format que Gemini sait produire", () => {
  same(gridFor(5), { cols: 3, rows: 2, aspect: "3:2" });
  same(gridFor(9), { cols: 3, rows: 3, aspect: "1:1" });
  same(gridFor(10), { cols: 4, rows: 3, aspect: "4:3" });
  same(gridFor(16), { cols: 4, rows: 4, aspect: "1:1" });
  same(gridFor(20), { cols: 5, rows: 4, aspect: "5:4" });
});

Deno.test("le fond magenta disparaît, l'objet reste opaque", () => {
  const w = 40, h = 40, px = sheet(w, h);
  paint(px, w, 10, 10, 30, 30, [200, 120, 40]);
  clearBackground(px, w, h);
  same(alpha(px, w, 0, 0), 0);
  same(alpha(px, w, 9, 20), 0);
  same(alpha(px, w, 20, 20), 255);
});

Deno.test("un trou fermé dans l'objet (beignet) est vidé aussi", () => {
  const w = 40, h = 40, px = sheet(w, h);
  paint(px, w, 5, 5, 35, 35, [230, 160, 90]);
  paint(px, w, 17, 17, 23, 23, KEY);
  clearBackground(px, w, h);
  same(alpha(px, w, 20, 20), 0);
  same(alpha(px, w, 8, 8), 255);
});

Deno.test("un rose de l'objet qui n'est pas le magenta exact reste dessiné", () => {
  const w = 40, h = 40, px = sheet(w, h);
  paint(px, w, 5, 5, 35, 35, [60, 40, 30]);
  // Framboise enfermée dans l'objet : proche du magenta mais pas assez.
  paint(px, w, 15, 15, 25, 25, [220, 40, 120]);
  clearBackground(px, w, h);
  same(alpha(px, w, 20, 20), 255);
});

Deno.test("le liseré rosé laissé par l'anticrénelage est neutralisé", () => {
  const w = 40, h = 40, px = sheet(w, h);
  paint(px, w, 10, 10, 30, 30, [40, 30, 20]);
  // Pixel de bord mélangé avec le fond : trop de rouge et de bleu.
  paint(px, w, 10, 20, 11, 21, [150, 15, 140]);
  clearBackground(px, w, h);
  const i = (20 * w + 10) * 4;
  if (px[i + 3] === 255 && px[i] > 100 && px[i + 2] > 100) throw new Error("liseré magenta encore visible");
});

Deno.test("chaque case donne la boîte de son objet, sans les miettes ni la case voisine", () => {
  const w = 60, h = 30, px = sheet(w, h);
  paint(px, w, 5, 5, 25, 25, [200, 50, 50]); // case 0
  paint(px, w, 1, 1, 2, 2, [10, 10, 10]); // miette dans la case 0
  paint(px, w, 40, 8, 50, 22, [50, 50, 200]); // case 1
  clearBackground(px, w, h);
  same(cellObject(px, w, h, { cols: 2, rows: 1 }, 0), { x: 5, y: 5, w: 20, h: 20 });
  same(cellObject(px, w, h, { cols: 2, rows: 1 }, 1), { x: 40, y: 8, w: 10, h: 14 });
});

Deno.test("une case vide est signalée, pour garder l'emoji de la carte", () => {
  const w = 60, h = 30, px = sheet(w, h);
  paint(px, w, 5, 5, 25, 25, [200, 50, 50]);
  clearBackground(px, w, h);
  same(cellObject(px, w, h, { cols: 2, rows: 1 }, 1), null);
});
