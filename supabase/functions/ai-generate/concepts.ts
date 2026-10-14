// Concepts: the key of the shared icon library. The closer two cards' concepts are
// written, the more icons are reused instead of drawn (and paid) again.

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

/** Words that don't change the object drawn: "pizza-slice" is a pizza. */
const FILLER = new Set(["a", "an", "the", "of", "some", "slice", "slices", "piece", "pieces", "icon", "generic"]);

/**
 * Plural to singular, only where it is safe: a wrong merge would show the icon of
 * another object, a missed one only costs a drawing.
 */
function singular(word: string): string {
  if (word.length <= 3 || /(ss|us|is)$/.test(word)) return word;
  if (/[^aeiou]ies$/.test(word)) return word.slice(0, -3) + "y";
  if (/toes$/.test(word)) return word.slice(0, -2);
  if (/(sses|xes|zes|shes|tches)$/.test(word)) return word.slice(0, -2);
  if (/s$/.test(word)) return word.slice(0, -1);
  return word;
}

export function normalizeConcept(concept: string): string {
  const words = slug(concept).split("-").filter(Boolean);
  const kept = words.filter((w) => !FILLER.has(w));
  return (kept.length ? kept : words).map(singular).join("-").slice(0, 40);
}

/**
 * One concept per card, all different within the list: two cheeses sharing "cheese"
 * would show the same icon twice, so the second one gets its own ("cheese-comte").
 */
export function uniqueConcepts(cards: { label: string; concept: string }[]): string[] {
  const used = new Set<string>();
  return cards.map(({ label, concept }) => {
    let key = normalizeConcept(concept || label) || normalizeConcept(label);
    // Normalized too, so the icon request (which normalizes) lands on the same key.
    if (used.has(key)) key = normalizeConcept(`${key}-${label}`);
    const base = key.slice(0, 37);
    for (let n = 2; used.has(key); n++) key = `${base}-${n}`;
    used.add(key);
    return key;
  });
}

/**
 * Concepts for cards that came without one (added by hand, renamed): those the AI
 * proposed from the list's theme, else the card's name. "Rose" alone would land on
 * whichever rose was drawn first, flower or colour.
 */
export function withConcepts<T extends { label: string; concept: string }>(cards: T[], proposed: string[]): T[] {
  let next = 0;
  const filled = cards.map((c) => (c.concept ? c : { ...c, concept: proposed[next++] ?? "" }));
  const keys = uniqueConcepts(filled);
  return filled.map((c, i) => ({ ...c, concept: keys[i] }));
}
