// deno test supabase/functions/ai-generate/sheet.test.ts
import { cardsToDraw, cellObject, clearBackground, fillSheet, gridFor, KEY, sheetPrompt } from "./sheet.ts";

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

Deno.test("l'ombre teintée de magenta autour de l'objet part avec le fond", () => {
  const w = 40, h = 40, px = sheet(w, h);
  paint(px, w, 12, 12, 28, 28, [230, 160, 90]);
  // Ombre portée mélangée au fond : magenta sombre, loin du magenta pur.
  paint(px, w, 12, 28, 28, 32, [110, 0, 115]);
  clearBackground(px, w, h);
  same(alpha(px, w, 20, 30), 0);
  same(alpha(px, w, 20, 20), 255);
});

Deno.test("un carré rose clair que le modèle pose derrière l'icône part avec le fond", () => {
  const w = 40, h = 40, px = sheet(w, h);
  paint(px, w, 6, 6, 34, 34, [252, 150, 250]); // tuile rose clair
  paint(px, w, 14, 14, 26, 26, [40, 170, 230]); // goutte cyan
  clearBackground(px, w, h);
  same(alpha(px, w, 8, 8), 0);
  same(alpha(px, w, 20, 20), 255);
});

Deno.test("un rose d'objet (flamant) ou un lavande touchant le fond restent dessinés", () => {
  const w = 40, h = 40, px = sheet(w, h);
  paint(px, w, 10, 10, 20, 30, [255, 140, 180]);
  paint(px, w, 20, 10, 30, 30, [180, 150, 220]);
  clearBackground(px, w, h);
  same(alpha(px, w, 15, 20), 255);
  same(alpha(px, w, 25, 20), 255);
});

Deno.test("un violet d'oignon au bord de l'objet reste dessiné", () => {
  const w = 40, h = 40, px = sheet(w, h);
  paint(px, w, 12, 12, 28, 28, [230, 160, 90]);
  paint(px, w, 28, 15, 31, 25, [176, 74, 168]);
  clearBackground(px, w, h);
  same(alpha(px, w, 29, 20), 255);
});

Deno.test("un trait de grille dessiné au bord de la case est ignoré", () => {
  const w = 60, h = 30, px = sheet(w, h);
  paint(px, w, 8, 6, 22, 24, [200, 50, 50]);
  paint(px, w, 28, 2, 29, 28, [40, 20, 20]); // trait vertical près du bord droit de la case 0
  clearBackground(px, w, h);
  same(cellObject(px, w, h, { cols: 2, rows: 1 }, 0), { x: 8, y: 6, w: 14, h: 18 });
});

Deno.test("une grille dessinée par le modèle n'empêche pas de vider le fond des cases", () => {
  const w = 60, h = 30, px = sheet(w, h);
  paint(px, w, 29, 0, 31, 30, [60, 20, 40]); // trait vertical sur toute la hauteur
  paint(px, w, 0, 14, 60, 16, [60, 20, 40]); // trait horizontal sur toute la largeur
  paint(px, w, 36, 3, 50, 10, [230, 160, 90]);
  paint(px, w, 36, 10, 50, 12, [120, 10, 110]); // ombre teintée, enfermée par la grille
  clearBackground(px, w, h);
  same(alpha(px, w, 40, 11), 0);
  same(alpha(px, w, 30, 5), 0);
  same(alpha(px, w, 10, 15), 0);
  same(alpha(px, w, 40, 5), 255);
});

Deno.test("une rangée d'icônes larges n'est pas prise pour un trait de grille", () => {
  const w = 60, h = 30, px = sheet(w, h);
  paint(px, w, 3, 10, 27, 20, [230, 160, 90]);
  paint(px, w, 33, 10, 57, 20, [90, 160, 230]);
  clearBackground(px, w, h);
  same(alpha(px, w, 20, 15), 255);
  same(alpha(px, w, 40, 15), 255);
});

/** A white tile with rounded corners, as Gemini lays behind each icon despite the prompt. */
function roundedTile(px: Uint8ClampedArray, w: number, x0: number, y0: number, x1: number, y1: number, r: number, rgb = [255, 255, 255]) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = Math.max(x0 + r - x - 0.5, x - (x1 - r) + 0.5, 0), dy = Math.max(y0 + r - y - 0.5, y - (y1 - r) + 0.5, 0);
      if (dx * dx + dy * dy <= r * r) px.set([rgb[0], rgb[1], rgb[2], 255], (y * w + x) * 4);
    }
  }
}

/** Planche « fêtes bizarres » : 4 × 2 tuiles blanches presque jointives, une icône cernée dans chacune. */
function tiledSheet() {
  const w = 200, h = 100, px = sheet(w, h);
  for (let i = 0; i < 8; i++) {
    const x = (i % 4) * 50, y = Math.floor(i / 4) * 50;
    roundedTile(px, w, x + 1, y + 1, x + 49, y + 49, 8, [255, 200, 255]); // liseré anticrénelé sur le magenta
    roundedTile(px, w, x + 2, y + 2, x + 48, y + 48, 7);
    paint(px, w, x + 15, y + 15, x + 35, y + 35, [42, 27, 20]); // contour
    paint(px, w, x + 17, y + 17, x + 33, y + 33, [220, 60, 40]); // tomate
  }
  return { w, h, px };
}

Deno.test("des tuiles blanches jointives ne sont pas prises pour une grille : les icônes restent", () => {
  const { w, h, px } = tiledSheet();
  clearBackground(px, w, h, { cols: 4, rows: 2 });
  for (let i = 0; i < 8; i++) {
    const x = (i % 4) * 50, y = Math.floor(i / 4) * 50;
    same(cellObject(px, w, h, { cols: 4, rows: 2 }, i), { x: x + 15, y: y + 15, w: 20, h: 20 });
  }
});

Deno.test("des tuiles jointives d'une autre couleur restent, mais leurs icônes ne sont plus effacées", () => {
  const w = 200, h = 100, px = sheet(w, h);
  for (let i = 0; i < 8; i++) {
    const x = (i % 4) * 50, y = Math.floor(i / 4) * 50;
    roundedTile(px, w, x + 2, y + 2, x + 48, y + 48, 7, [190, 220, 250]);
    paint(px, w, x + 15, y + 15, x + 35, y + 35, [42, 27, 20]);
  }
  clearBackground(px, w, h, { cols: 4, rows: 2 });
  same(alpha(px, w, 25, 25), 255);
  same(cellObject(px, w, h, { cols: 4, rows: 2 }, 0), { x: 2, y: 2, w: 46, h: 46 });
});

Deno.test("la tuile blanche posée derrière l'icône part avec le fond, le blanc cerné de l'icône reste", () => {
  const { w, h, px } = tiledSheet();
  paint(px, w, 70, 20, 75, 25, [255, 255, 255]); // reflet blanc dans la tomate de la case 1
  clearBackground(px, w, h, { cols: 4, rows: 2 });
  same(alpha(px, w, 25, 6), 0); // tuile, au-dessus de l'icône
  same(alpha(px, w, 6, 25), 0); // tuile, à gauche
  same(alpha(px, w, 25, 25), 255);
  same(alpha(px, w, 72, 22), 255);
});

Deno.test("une icône blanche cernée, posée sans tuile, reste dessinée", () => {
  const w = 60, h = 30, px = sheet(w, h);
  paint(px, w, 6, 4, 24, 26, [42, 27, 20]);
  paint(px, w, 8, 6, 22, 24, [250, 250, 248]); // brie
  clearBackground(px, w, h, { cols: 2, rows: 1 });
  same(alpha(px, w, 15, 15), 255);
  same(cellObject(px, w, h, { cols: 2, rows: 1 }, 0), { x: 6, y: 4, w: 18, h: 22 });
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

const c = (concept: string) => ({ label: concept, concept });

Deno.test("une planche peu remplie est complétée par la liste d'attente, jusqu'à 12 cases", () => {
  const wish = Array.from({ length: 15 }, (_, i) => c(`w${i}`));
  const plan = fillSheet([c("a"), c("b"), c("c")], wish);
  same(plan.length, 12);
  same(plan.slice(0, 3).map((x) => x.concept), ["a", "b", "c"]);
  same(plan[3].concept, "w0");
});

Deno.test("au-delà de 12, la planche se remplit jusqu'au bout de sa grille", () => {
  const wish = Array.from({ length: 10 }, (_, i) => c(`w${i}`));
  same(fillSheet(Array.from({ length: 13 }, (_, i) => c(`m${i}`)), wish).length, 16);
  same(fillSheet(Array.from({ length: 20 }, (_, i) => c(`m${i}`)), wish).length, 20);
});

Deno.test("la liste d'attente ne redessine pas une carte déjà demandée, et rien à dessiner ne coûte rien", () => {
  same(fillSheet([c("a")], [c("a"), c("b")]).map((x) => x.concept), ["a", "b"]);
  same(fillSheet([], [c("a"), c("b")]), []);
});

Deno.test("le thème de la liste accompagne chaque carte demandée, pour lever les homonymes", () => {
  const text = sheetPrompt([{ label: "Rose", concept: "pink-paint-splash", theme: "Couleurs" }, { label: "Tulipe", concept: "tulip" }], 2, 1);
  if (!text.includes('for a card named "Rose" in a list about "Couleurs"')) throw new Error(text);
  if (!text.includes('for a card named "Tulipe")')) throw new Error(text);
});

Deno.test("une icône déjà dessinée est reprise, sauf si le joueur demande à la redessiner", () => {
  const drawn = new Set(["pizza", "rose-flower"]);
  const plan = cardsToDraw(
    [
      { label: "Pizza", concept: "pizza" },
      { label: "Tulipe", concept: "tulip" },
      { label: "Rose", concept: "rose-flower", redraw: true },
      { label: "Tulipe bis", concept: "tulip" },
    ],
    drawn,
  );
  same(plan.map((c) => c.label), ["Tulipe", "Rose"]);
});
