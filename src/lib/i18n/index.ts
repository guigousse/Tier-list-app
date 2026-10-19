/** The languages the app speaks. English is the one for every other phone. */
export const LANGUAGES = ['fr', 'en', 'es', 'el'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Each language's name in itself, for the settings. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  el: 'Ελληνικά',
};

export type Catalog = Record<string, string>;
export type Params = Record<string, string | number>;

/** The phone's language and region ("fr-BE" → fr, BE), as its settings say: no permission asked. */
export function localeParts(locale: string): {
  language: string;
  region: string | null;
} {
  const parts = locale.split(/[-_]/);
  const region = parts.slice(1).find((p) => /^[A-Za-z]{2}$|^\d{3}$/.test(p));
  return {
    language: (parts[0] ?? '').toLowerCase(),
    region: region ? region.toUpperCase() : null,
  };
}

/** The phone's locale, read through Intl: no native module, so it ships over the air. */
export function deviceLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale ?? '';
  } catch {
    return '';
  }
}

export function pickLanguage(chosen: Language | 'auto', locale: string): Language {
  if (chosen !== 'auto') return chosen;
  const { language } = localeParts(locale);
  return (LANGUAGES as readonly string[]).includes(language) ? (language as Language) : 'en';
}

/** The region the lists are picked for: the one chosen, else the phone's; null ('world') is worldwide. */
export function pickRegion(chosen: string | 'auto' | 'world', locale: string): string | null {
  if (chosen === 'world') return null;
  return chosen !== 'auto' ? chosen : localeParts(locale).region;
}

/** Singular or plural, each language its own way: French counts 0 and 1 as singular. */
function pluralForm(language: Language, count: number): 'one' | 'other' {
  if (language === 'fr') return Math.abs(count) < 2 ? 'one' : 'other';
  return Math.abs(count) === 1 ? 'one' : 'other';
}

/**
 * `key` in `language`, its {names} filled from `params`. With a `count`, `key_one` or
 * `key_other` is used. Missing in that language, the English text shows, then the French:
 * a text not translated yet never shows as its key.
 */
export function translate(catalogs: Partial<Record<Language, Catalog>>, language: Language, key: string, params?: Params): string {
  const count = typeof params?.count === 'number' ? params.count : undefined;
  const keys = count === undefined ? [key] : [`${key}_${pluralForm(language, count)}`, `${key}_other`, key];
  for (const lang of [language, 'en', 'fr'] as Language[]) {
    // The plural form of the fallback language is its own, not the player's.
    const forms = count === undefined || lang === language ? keys : [`${key}_${pluralForm(lang, count)}`, `${key}_other`, key];
    const text = forms.map((k) => catalogs[lang]?.[k]).find((t) => t !== undefined);
    if (text !== undefined) return params ? text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m)) : text;
  }
  return key;
}

/**
 * `text` in capitals for `language`. Greek capitals carry no accents ("Γλώσσα" → "ΓΛΩΣΣΑ"),
 * which `textTransform: 'uppercase'` gets wrong: titles in capitals go through here instead.
 */
export function caps(text: string, language: Language): string {
  if (language !== 'el') return text.toLocaleUpperCase(language);
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleUpperCase('el').normalize('NFC');
}

/** The locale numbers and dates are written in for `language`. */
export function localeTag(language: Language): string {
  return { fr: 'fr-FR', en: 'en-US', es: 'es-ES', el: 'el-GR' }[language];
}
