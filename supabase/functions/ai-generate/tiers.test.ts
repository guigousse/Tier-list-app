// deno test supabase/functions/ai-generate/tiers.test.ts
import { cleanTierLabels, TIER_LABEL_MAX, TONES } from "./tiers.ts";

function same(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
  }
}

Deno.test("un nom par rang, dans l'ordre, nettoyé de sa numérotation et de ses guillemets", () => {
  same(cleanTierLabels(["1. « Divin »", " Bon ", "C - Bof"], ["S", "A", "B"]), ["Divin", "Bon", "Bof"]);
});

Deno.test("un nom manquant, vide ou trop long garde l'ancien", () => {
  const long = "Un nom beaucoup trop long pour la colonne";
  if (long.length <= TIER_LABEL_MAX) throw new Error("exemple pas assez long");
  same(cleanTierLabels(["Top", "", long], ["S", "A", "B", "C"]), ["Top", "A", "B", "C"]);
});

Deno.test("deux rangs ne portent jamais le même nom", () => {
  same(cleanTierLabels(["Top", "top", "Bof"], ["S", "A", "B"]), ["Top", "A", "Bof"]);
});

Deno.test("cinq tons au choix, dont enfantin et vulgaire", () => {
  same(Object.keys(TONES), ["humour", "serieux", "fantaisiste", "enfantin", "vulgaire"]);
});
