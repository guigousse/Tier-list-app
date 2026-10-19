/** The app's languages, as the prompts (written in French) name them. */
export const LANGUAGES = { fr: "français", en: "anglais (américain)", es: "espagnol", el: "grec moderne" } as const;
export type Lang = keyof typeof LANGUAGES;

/** The player's language; French for an app older than the languages, or anything unknown. */
export function langOf(value: unknown): Lang {
  return typeof value === "string" && Object.hasOwn(LANGUAGES, value) ? (value as Lang) : "fr";
}

/** The prompt asking for its words in `lang` instead of French. */
export function inLanguage(system: string, lang: Lang): string {
  return system.replaceAll("en français", `en ${LANGUAGES[lang]}`);
}
