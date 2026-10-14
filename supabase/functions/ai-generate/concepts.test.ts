// deno test supabase/functions/ai-generate/concepts.test.ts
import { normalizeConcept, uniqueConcepts } from "./concepts.ts";

function same(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
  }
}

Deno.test("un concept au pluriel retombe sur le singulier", () => {
  same(normalizeConcept("hiking-boots"), "hiking-boot");
  same(normalizeConcept("french-fries"), "french-fry");
  same(normalizeConcept("Tomatoes"), "tomato");
  same(normalizeConcept("shoes"), "shoe");
  same(normalizeConcept("matches"), "match");
  same(normalizeConcept("quiches"), "quiche");
});

Deno.test("les mots qui ne changent pas l'objet sont retirés", () => {
  same(normalizeConcept("pizza-slice"), "pizza");
  same(normalizeConcept("slice-of-cake"), "cake");
  same(normalizeConcept("piece-of-cheese"), "cheese");
  // Seul, le mot reste : c'est alors l'objet lui-même.
  same(normalizeConcept("slice"), "slice");
});

Deno.test("les mots qui ne sont pas des pluriels restent intacts", () => {
  same(normalizeConcept("glass"), "glass");
  same(normalizeConcept("bus"), "bus");
  same(normalizeConcept("hummus"), "hummus");
  same(normalizeConcept("iris"), "iris");
  same(normalizeConcept("raclette-grill"), "raclette-grill");
});

Deno.test("accents, espaces et majuscules donnent un concept propre", () => {
  same(normalizeConcept("  Crème Brûlée "), "creme-brulee");
  same(normalizeConcept(""), "");
});

Deno.test("deux cartes d'une même liste n'ont jamais la même icône", () => {
  same(
    uniqueConcepts([
      { label: "Brie", concept: "cheese" },
      { label: "Comté", concept: "cheeses" },
      { label: "Pizza", concept: "pizza-slice" },
      { label: "Roquefort", concept: "cheese" },
    ]),
    ["cheese", "cheese-comte", "pizza", "cheese-roquefort"],
  );
});

Deno.test("un doublon tenace reçoit un numéro, sans s'allonger", () => {
  same(
    uniqueConcepts([
      { label: "Brie", concept: "cheese" },
      { label: "Brie", concept: "cheese-brie" },
      { label: "Brie", concept: "cheese" },
      { label: "Brie", concept: "cheese" },
    ]),
    ["cheese", "cheese-brie", "cheese-brie-2", "cheese-brie-3"],
  );
});

Deno.test("le concept renvoyé est déjà sous sa forme finale", () => {
  const [, second] = uniqueConcepts([{ label: "Gruyères", concept: "cheese" }, { label: "Gruyères", concept: "cheese" }]);
  same(normalizeConcept(second), second);
});

Deno.test("sans concept, le nom de la carte sert de concept", () => {
  same(uniqueConcepts([{ label: "Grasse matinée", concept: "" }]), ["grasse-matinee"]);
});
