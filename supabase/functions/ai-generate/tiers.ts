// Tier names written by the AI: short enough for the narrow column on the left of
// each row, where a long name shrinks until it can't be read.

/** Longest name kept; the prompt asks for 14, a little slack spares a good name. */
export const TIER_LABEL_MAX = 18;

export const TONES = {
  humour: "drôle et complice : jeux de mots, clins d'œil au thème, exagération bon enfant",
  serieux: "sobre et clair : des appréciations nettes, sans effet ni plaisanterie",
  fantaisiste: "imaginaire et poétique : vocabulaire de conte, de légende ou de fantasy",
  enfantin: "comme le dirait un enfant de six ans : mots simples, onomatopées, enthousiasme, « miam », « beurk », « trop bien »",
  // Crude, never hurtful: the names are shared and shown to friends.
  vulgaire:
    "familier et grossier : argot et gros mots de tous les jours (« de la balle », « bof », « daubé », « à chier »), mais jamais d'insulte envers des personnes ou des groupes, rien de sexuel ni de haineux",
} as const;

export type Tone = keyof typeof TONES;

/**
 * One name per tier, best first, cleaned of the numbering or quotes the model adds; a
 * name missing, empty, too long or already given keeps the tier's current one.
 */
export function cleanTierLabels(raw: unknown[], current: string[]): string[] {
  const used = new Set<string>();
  return current.map((old, i) => {
    const label = String(raw[i] ?? "")
      .replace(/^\s*(\d+|[A-Z])\s*[.):-]\s+/, "")
      .replace(/["«»“”]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const key = label.toLowerCase();
    if (!label || label.length > TIER_LABEL_MAX || used.has(key)) return old;
    used.add(key);
    return label;
  });
}
