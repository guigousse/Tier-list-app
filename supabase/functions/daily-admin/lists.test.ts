// deno test supabase/functions/daily-admin/lists.test.ts
import { cleanList, cleanTranslations, joinLabel, sameItems, splitLabel } from "./lists.ts";

function same(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
  }
}

const items = ["🦁 Lion", "🐘 Éléphant", "🦒 Girafe", "🦓 Zèbre"];

Deno.test("le nom d'une carte se sépare de son emoji", () => {
  same(splitLabel("🦁 Lion"), { emoji: "🦁", text: "Lion" });
  same(splitLabel("🚦 1, 2, 3, soleil"), { emoji: "🚦", text: "1, 2, 3, soleil" });
  same(splitLabel("🌶️ Jalapeños"), { emoji: "🌶️", text: "Jalapeños" });
  same(splitLabel("Pâtes au beurre"), { emoji: "", text: "Pâtes au beurre" });
  same(joinLabel("🦁", " Lion "), "🦁 Lion");
  same(joinLabel("", "Lion"), "Lion");
});

Deno.test("une liste complète passe, nettoyée", () => {
  const row = cleanList("2026-12-01", { title: "  Animaux  ", emoji: "", items, concepts: ["lion", "", "giraffe", "zebra"], cover: 9, regions: ["fr", "xx1"] });
  same(row, {
    day: "2026-12-01",
    title: "Animaux",
    emoji: "📅",
    description: null,
    items,
    concepts: ["lion", "", "giraffe", "zebra"],
    cover: 0,
    regions: ["FR"],
    vote_regions: null,
  });
});

Deno.test("une liste incomplète est refusée", () => {
  same(typeof cleanList("2026-13-45", { title: "A", items }), "string");
  same(typeof cleanList("2026-12-01", { title: "", items }), "string");
  same(typeof cleanList("2026-12-01", { title: "A", items: items.slice(0, 3) }), "string");
  same(typeof cleanList("2026-12-01", { title: "A", items: [...items, "🦁 lion"] }), "string");
  same(typeof cleanList("2026-12-01", { title: "A", items: [...items, "🦁"] }), "string");
  same(typeof cleanList("2026-12-01", { title: "A", items, concepts: ["lion", "lion"] }), "string");
});

Deno.test("sans aucun concept, la liste n'en garde pas", () => {
  const row = cleanList("2026-12-01", { title: "A", items });
  same(typeof row !== "string" && row.concepts, null);
});

Deno.test("une traduction doit avoir autant de cartes que le français", () => {
  const ok = cleanTranslations({ en: { title: "Animals", description: "", items: ["🦁 Lion", "🐘 Elephant", "🦒 Giraffe", "🦓 Zebra"] } }, 4);
  same(ok, { en: { title: "Animals", description: null, items: ["🦁 Lion", "🐘 Elephant", "🦒 Giraffe", "🦓 Zebra"] }, es: null, el: null });
  same(typeof cleanTranslations({ es: { title: "Animales", items: ["León"] } }, 4), "string");
  same(typeof cleanTranslations({ el: { title: "", items: ["a", "b", "c", "d"] } }, 4), "string");
  // Left entirely empty: removed, the app shows the French.
  same(cleanTranslations({ es: { title: "", items: ["", "", "", ""] } }, 4), { en: null, es: null, el: null });
});

Deno.test("les cartes d'une liste votée ne changent pas", () => {
  same(sameItems(items, [...items]), true);
  same(sameItems(items, [...items].reverse()), false);
  same(sameItems(items, items.slice(1)), false);
});
