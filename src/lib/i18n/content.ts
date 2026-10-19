import { sourceOf, type Template } from '../../constants/presets';
import type { TierList } from '../../store/types';
import type { Language } from './index';
import el from '../../../content-i18n/translations-el.json';
import en from '../../../content-i18n/translations-en.json';
import es from '../../../content-i18n/translations-es.json';

/**
 * Translation of a list written in French. items[i] and tiers[i] translate the source's
 * items[i] and tiers[i]: the players' copies keep the French labels (votes, the public
 * lists' sync and the statistics all go by them), and only the screen shows these.
 */
export type ContentText = { title?: string; description?: string; items?: string[]; tiers?: string[] };

type Bundle = {
  builtin: Record<string, ContentText>;
  themes: Record<string, string>;
  templates: Record<string, ContentText>;
  daily: Record<string, ContentText>;
};

/** Translations shipped with the app: built-in lists and themes, and a snapshot of the online ones. */
const BUNDLED: Record<Exclude<Language, 'fr'>, Bundle> = { en, es, el };

/** Translations of the online content fetched from the server for one language (useCatalog). */
export type RemoteTranslations = {
  lang: Language;
  template: Record<string, ContentText>;
  daily: Record<string, ContentText>;
};

/**
 * Translation of a public list (template key, or "daily-<day>" for a past daily list) in
 * `lang`; none in French, the language the content is written in.
 */
export function contentText(key: string, lang: Language, remote?: RemoteTranslations | null): ContentText | undefined {
  if (lang === 'fr') return undefined;
  const online = remote?.lang === lang ? remote : undefined;
  const bundle = BUNDLED[lang];
  if (key.startsWith('daily-')) {
    const day = key.slice('daily-'.length);
    return online?.daily[day] ?? bundle.daily[day];
  }
  return online?.template[key] ?? bundle.templates[key] ?? bundle.builtin[key];
}

/** Name of a theme of the gallery in `lang` (none in French: the theme's own title). */
export function themeTitle(key: string, lang: Language): string | undefined {
  return lang === 'fr' ? undefined : BUNDLED[lang].themes[key];
}

const pick = (source: string[], translated: string[] | undefined) => source.map((s, i) => translated?.[i] ?? s);

/** A template as shown in the gallery: same key and cards, words in the player's language. */
export function localizeTemplate(template: Template, text: ContentText | undefined): Template {
  if (!text) return template;
  return {
    ...template,
    source: sourceOf(template),
    title: text.title ?? template.title,
    items: pick(template.items, text.items),
    tiers: template.tiers && pick(template.tiers, text.tiers),
  };
}

/**
 * A daily or popular list as shown: its cards and tiers are fixed, so they are matched by
 * position. Same ids and placement, so a card moved on screen is the saved one. The
 * player's own lists are theirs and stay as written.
 */
export function localizeList(list: TierList, text: ContentText | undefined): TierList {
  const fixed = list.popular ?? list.daily;
  if (!text || !fixed) return list;
  const cards = { ...list.cards };
  fixed.cardIds.forEach((id, i) => {
    const label = text.items?.[i];
    if (label && cards[id]) cards[id] = { ...cards[id], label };
  });
  return {
    ...list,
    title: text.title ?? list.title,
    tiers: list.popular && text.tiers ? list.tiers.map((tier, i) => ({ ...tier, label: text.tiers![i] ?? tier.label })) : list.tiers,
    cards,
  };
}

/** Key of the public list a copy was made from, as contentText() looks it up. */
export function sourceKey(list: TierList): string | undefined {
  if (list.daily) return `daily-${list.daily.day}`;
  return list.popular?.key;
}
