// deno test supabase/functions/ai-generate/pricing.test.ts
import { charge, CREDITS, WELCOME_BONUS } from "./pricing.ts";

function same(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
  }
}

Deno.test("barème : 3 crédits le texte (cartes ou rangs, quel qu'en soit le nombre), 8 la planche plus 1 l'image", () => {
  same(CREDITS, { text: 3, sheet: 8, image: 1 });
  same(charge("words", 1), 3);
  same(charge("words", 20), 3);
  same(charge("tiers", 1), 3);
  same(charge("tiers", 5), 3);
  same(charge("images", 3), 11);
  same(charge("images", 10), 18);
  same(charge("images", 20), 28);
});

Deno.test("rien de livré ne coûte rien, même le fixe de la planche", () => {
  same(charge("words", 0), 0);
  same(charge("tiers", 0), 0);
  same(charge("images", 0), 0);
});

Deno.test("le bonus de bienvenue paie une liste de 10 cartes illustrées", () => {
  same(WELCOME_BONUS >= charge("words", 10) + charge("images", 10), true);
});
