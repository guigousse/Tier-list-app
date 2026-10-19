import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { TEMPLATES, type Template } from '../constants/presets';
import { THEMES } from '../lib/themes';
import {
  fetchListTops,
  fetchCardIcons,
  fetchDaily,
  fetchDiscovery,
  fetchPastDailies,
  fetchTemplateStats,
  fetchTemplates,
  fetchTranslations,
  type DailyList,
  type RemoteTemplate,
  type TemplateStats,
} from '../lib/api';
import { contentText, localizeTemplate, type RemoteTranslations } from '../lib/i18n/content';
import { currentLanguage, useRegion, useT } from '../lib/i18n/useT';
import { canVote, featuredIn } from '../lib/i18n/regions';
import type { TierList } from './types';
import type { Discovery } from '../lib/discover';
import type { IconLibrary } from '../lib/publicSync';

/** Content published online (Supabase), cached so it shows offline too. */
type CatalogState = {
  templates: RemoteTemplate[];
  daily: DailyList | null;
  /** Daily tier lists of the previous days: they join the popular tier lists. */
  pastDailies: DailyList[];
  /** Completed rankings and favourites of the popular tier lists. */
  stats: TemplateStats;
  /** Hidden theme tags and trend scores, for "Tendances" and "Pour toi". */
  discovery: Discovery;
  /** Library images of the public lists' cards, by concept. */
  icons: IconLibrary;
  /** Each public list's favourite card, its picture in the catalogue (src/lib/listCover.ts). */
  tops: Record<string, number>;
  /** The online content in the player's language (none in French, its own language). */
  translations: RemoteTranslations | null;
  /** Applies a change made on this device right away, before the next refresh. */
  bumpStat: (key: string, field: 'completions' | 'favorites', delta: number) => void;
  /** Fetches the latest templates and daily tier list; keeps the cache on failure. */
  refresh: () => Promise<void>;
};

export const useCatalog = create<CatalogState>()(
  persist(
    (set, get) => ({
      templates: [],
      daily: null,
      pastDailies: [],
      stats: {},
      discovery: { tags: {}, trends: {} },
      icons: {},
      tops: {},
      translations: null,
      bumpStat: (key, field, delta) =>
        set((state) => {
          const saved = state.stats[key];
          const current = { completions: saved?.completions ?? 0, favorites: saved?.favorites ?? 0 };
          return { stats: { ...state.stats, [key]: { ...current, [field]: Math.max(0, current[field] + delta) } } };
        }),
      refresh: async () => {
        const language = currentLanguage();
        const [templates, daily, stats, pastDailies, discovery, tops, translations] = await Promise.allSettled([
          fetchTemplates(),
          fetchDaily(),
          fetchTemplateStats(),
          fetchPastDailies(),
          fetchDiscovery(),
          fetchListTops(),
          language === 'fr' ? Promise.resolve(null) : fetchTranslations(language),
        ]);
        // The concepts are known once the published templates are: asked in a second call.
        const remote = templates.status === 'fulfilled' ? templates.value : get().templates;
        const concepts = [
          ...new Set([...[...TEMPLATES, ...remote].flatMap((t) => t.concepts ?? []), ...THEMES.flatMap((t) => t.preview.map((p) => p.concept))].filter(Boolean)),
        ];
        const [icons] = await Promise.allSettled([fetchCardIcons(concepts)]);
        set((state) => {
          // Each return to the app asks again, and the answer is mostly the same: a part
          // left equal keeps its object, so the screens reading it don't render again,
          // and nothing at all changed means no update (nor a rewrite of the cache).
          const keep = <K extends keyof CatalogState>(key: K, answer: PromiseSettledResult<CatalogState[K]>) =>
            answer.status === 'fulfilled' && JSON.stringify(answer.value) !== JSON.stringify(state[key]) ? { [key]: answer.value } : {};
          const changed = {
            ...keep('templates', templates),
            ...keep('daily', daily),
            ...keep('stats', stats),
            ...keep('pastDailies', pastDailies),
            ...keep('discovery', discovery),
            ...keep('icons', icons),
            ...keep('tops', tops),
            ...keep('translations', translations),
          };
          return Object.keys(changed).length ? changed : state;
        });
      },
    }),
    {
      name: 'tiercraft-catalog',
      // v2: stats count completed rankings instead of views.
      version: 2,
      migrate: (persisted) => ({ ...(persisted as object), stats: {} }),
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        templates: state.templates,
        daily: state.daily,
        stats: state.stats,
        pastDailies: state.pastDailies,
        discovery: state.discovery,
        icons: state.icons,
        tops: state.tops,
        translations: state.translations,
      }),
    },
  ),
);

/**
 * Templates in the player's language. Each keeps its French list as `source`, from which
 * copies, votes and syncs are made (lib/i18n/content.ts).
 */
function useLocalized(templates: Template[]): Template[] {
  const { language } = useT();
  const translations = useCatalog((s) => s.translations);
  return useMemo(
    () => (language === 'fr' ? templates : templates.map((t) => localizeTemplate(t, contentText(t.key, language, translations)))),
    [templates, language, translations],
  );
}

/** Built-in templates followed by the ones published online (online wins on a shared key). */
export function useAllTemplates(): Template[] {
  const remote = useCatalog((s) => s.templates);
  const all = useMemo(() => {
    const keys = new Set(remote.map((t) => t.key));
    return [...TEMPLATES.filter((t) => !keys.has(t.key)), ...remote];
  }, [remote]);
  return useLocalized(all);
}

/** Popularity score of a popular tier list: a favourite weighs more than a completed ranking. */
export function popularity(stats: TemplateStats, key: string): number {
  const s = stats[key];
  return s ? (s.completions ?? 0) + s.favorites * 3 : 0;
}

/** Popular tier list made from a past daily tier list. */
export function dailyTemplate(daily: DailyList): Template {
  return {
    key: `daily-${daily.day}`,
    title: daily.title,
    emoji: daily.emoji,
    items: daily.items,
    day: daily.day,
    regions: daily.regions,
    voteRegions: daily.voteRegions,
  };
}

/**
 * Popular tier lists: the templates and the past daily tier lists (not the one
 * of the day), most popular first; ties keep templates first, then newest days.
 */
export function usePopularTemplates(): Template[] {
  const all = useAllTemplates();
  const stats = useCatalog((s) => s.stats);
  const daily = useCatalog((s) => s.daily);
  const pastDailies = useCatalog((s) => s.pastDailies);
  const past = useLocalized(useMemo(() => pastDailies.filter((d) => d.day !== daily?.day).map(dailyTemplate), [pastDailies, daily]));
  return useMemo(() => {
    const templates = [...all, ...past];
    return templates
      .map((t, i) => ({ t, i }))
      .sort((a, b) => popularity(stats, b.t.key) - popularity(stats, a.t.key) || a.i - b.i)
      .map(({ t }) => t);
  }, [all, past, stats]);
}

/** The popular tier lists put forward to the player: regional ones only in their regions. */
export function useFeaturedTemplates(): Template[] {
  const popular = usePopularTemplates();
  const region = useRegion();
  return useMemo(() => popular.filter((t) => featuredIn(t, region)), [popular, region]);
}

/** The countries a daily or popular list's vote is kept to, when the player is not of them. */
export function keptVote(
  list: TierList | undefined,
  templates: Template[],
  dailies: (DailyList | null)[],
  region: string | null,
): string[] | null {
  const day = list?.daily?.day ?? (list?.popular?.key.startsWith('daily-') ? list.popular.key.slice('daily-'.length) : undefined);
  const source = day ? dailies.find((d) => d?.day === day) : list?.popular && templates.find((t) => t.key === list.popular!.key);
  return source && !canVote(source, region) ? (source.voteRegions ?? null) : null;
}

export function useKeptVote(list: TierList | undefined): string[] | null {
  const templates = useAllTemplates();
  const daily = useCatalog((s) => s.daily);
  const pastDailies = useCatalog((s) => s.pastDailies);
  const region = useRegion();
  return useMemo(() => keptVote(list, templates, [daily, ...pastDailies], region), [list, templates, daily, pastDailies, region]);
}
