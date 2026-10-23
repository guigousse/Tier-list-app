// The daily tier lists as the editor sends them, checked before they reach the table.
// Items are written "🦁 Lion": the card's emoji, a space, its name (translations too).

export const LANGS = ["en", "es", "el"] as const;
export type Lang = (typeof LANGS)[number];

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const REGION = /^[A-Z]{2}$/;
/** Like the lists already published: 4 to 20 cards, short names. */
export const MIN_CARDS = 4;
export const MAX_CARDS = 20;

export type DailyRow = {
  day: string;
  title: string;
  emoji: string;
  description: string | null;
  items: string[];
  concepts: string[] | null;
  cover: number | null;
  regions: string[] | null;
  vote_regions: string[] | null;
};

export type Translation = { title: string; description: string | null; items: string[] };

export const isDay = (s: unknown): s is string => typeof s === "string" && DAY.test(s) && !Number.isNaN(Date.parse(s));

/** "🦁 Lion" -> { emoji: "🦁", text: "Lion" }; a name without an emoji keeps an empty one. */
export function splitLabel(item: string): { emoji: string; text: string } {
  const m = /^(\S+)\s+(.+)$/su.exec(item.trim());
  if (m && !/[\p{L}\p{N}]/u.test(m[1])) return { emoji: m[1], text: m[2].trim() };
  return { emoji: "", text: item.trim() };
}

export const joinLabel = (emoji: string, text: string) => (emoji.trim() ? `${emoji.trim()} ${text.trim()}` : text.trim());

const str = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function regions(v: unknown): string[] | null {
  const list = (Array.isArray(v) ? v : []).map((r) => String(r).trim().toUpperCase()).filter((r) => REGION.test(r));
  return list.length ? [...new Set(list)] : null;
}

/** The row to write, or the reason it is refused (in French, shown as is in the editor). */
export function cleanList(day: unknown, raw: Record<string, unknown>): DailyRow | string {
  if (!isDay(day)) return "Date invalide.";
  const title = str(raw.title, 60);
  if (!title) return "Il manque le titre.";
  const items = (Array.isArray(raw.items) ? raw.items : []).map((i) => str(i, 60));
  if (items.some((i) => !/[\p{L}\p{N}]/u.test(splitLabel(i).text))) return "Une carte n'a pas de nom.";
  if (items.length < MIN_CARDS || items.length > MAX_CARDS) return `Il faut entre ${MIN_CARDS} et ${MAX_CARDS} cartes.`;
  const names = items.map((i) => splitLabel(i).text.toLowerCase());
  if (new Set(names).size !== names.length) return "Deux cartes ont le même nom.";
  const rawConcepts = Array.isArray(raw.concepts) ? raw.concepts.map((c) => str(c, 40)) : [];
  // An empty concept is a card without a picture: the app shows its emoji.
  const concepts = items.map((_, i) => rawConcepts[i] ?? "");
  const named = concepts.filter(Boolean);
  if (new Set(named).size !== named.length) return "Deux cartes ont le même concept : elles auraient la même image.";
  const cover = Number(raw.cover ?? 0);
  return {
    day,
    title,
    emoji: str(raw.emoji, 8) || "📅",
    description: str(raw.description, 120) || null,
    items,
    concepts: named.length ? concepts : null,
    cover: Number.isInteger(cover) && cover >= 0 && cover < items.length ? cover : 0,
    regions: regions(raw.regions),
    vote_regions: regions(raw.vote_regions),
  };
}

/**
 * The translations to write, by language; null for a language left empty (the app then
 * shows the French). Items must match the French cards one for one: votes count by position.
 */
export function cleanTranslations(raw: unknown, count: number): Record<Lang, Translation | null> | string {
  const all = (raw && typeof raw === "object" ? raw : {}) as Record<string, Record<string, unknown> | undefined>;
  const out = {} as Record<Lang, Translation | null>;
  for (const lang of LANGS) {
    const t = all[lang];
    const title = str(t?.title, 60);
    const items = (Array.isArray(t?.items) ? t.items : []).map((i) => str(i, 60));
    if (!title && items.every((i) => !i)) {
      out[lang] = null;
      continue;
    }
    if (!title) return `Traduction ${lang.toUpperCase()} : il manque le titre.`;
    if (items.length !== count || items.some((i) => !/[\p{L}\p{N}]/u.test(splitLabel(i).text))) {
      return `Traduction ${lang.toUpperCase()} : il faut un nom pour chacune des ${count} cartes.`;
    }
    out[lang] = { title, description: str(t?.description, 120) || null, items };
  }
  return out;
}

/** Votes are stored by card position: once a list has votes, its cards can't change. */
export const sameItems = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
