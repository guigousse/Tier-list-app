// deno test supabase/functions/ai-generate/language.test.ts
import { inLanguage, langOf } from "./language.ts";

function same(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
  }
}

Deno.test("la langue du joueur, le français pour une app plus ancienne ou une valeur inconnue", () => {
  same(langOf("el"), "el");
  same(langOf(undefined), "fr");
  same(langOf("de"), "fr");
  same(langOf({}), "fr");
});

Deno.test("les consignes demandent des cartes dans la langue du joueur", () => {
  const system = "Propose des cartes :\n- en français, courtes ;\n- toutes du thème.";
  same(inLanguage(system, "fr"), system);
  same(inLanguage(system, "el"), "Propose des cartes :\n- en grec moderne, courtes ;\n- toutes du thème.");
  if (!inLanguage(system, "en").includes("en anglais")) throw new Error("anglais attendu");
});
