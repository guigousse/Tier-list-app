import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { TEMPLATES, type Template } from '../constants/presets';
import { THEMES } from '../lib/themes';
import { fetchListTops, fetchCardIcons, fetchDaily, fetchDiscovery, fetchPastDailies, fetchTemplateStats, fetchTemplates, type DailyList, type RemoteTemplate, type TemplateStats } from '../lib/api';
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
      bumpStat: (key, field, delta) =>
        set((state) => {
          const saved = state.stats[key];
          const current = { completions: saved?.completions ?? 0, favorites: saved?.favorites ?? 0 };
          return { stats: { ...state.stats, [key]: { ...current, [field]: Math.max(0, current[field] + delta) } } };
        }),
      refresh: async () => {
        const [templates, daily, stats, pastDailies, discovery, tops] = await Promise.allSettled([
          fetchTemplates(),
          fetchDaily(),
          fetchTemplateStats(),
          fetchPastDailies(),
          fetchDiscovery(),
          fetchListTops(),
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
      }),
    },
  ),
);

/** Built-in templates followed by the ones published online (online wins on a shared key). */
export function useAllTemplates(): Template[] {
  const remote = useCatalog((s) => s.templates);
  return useMemo(() => {
    const keys = new Set(remote.map((t) => t.key));
    return [...TEMPLATES.filter((t) => !keys.has(t.key)), ...remote];
  }, [remote]);
}

/** Popularity score of a popular tier list: a favourite weighs more than a completed ranking. */
export function popularity(stats: TemplateStats, key: string): number {
  const s = stats[key];
  return s ? (s.completions ?? 0) + s.favorites * 3 : 0;
}

/** Popular tier list made from a past daily tier list. */
export function dailyTemplate(daily: DailyList): Template {
  return { key: `daily-${daily.day}`, title: daily.title, emoji: daily.emoji, items: daily.items, day: daily.day };
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
  return useMemo(() => {
    const templates = [...all, ...pastDailies.filter((d) => d.day !== daily?.day).map(dailyTemplate)];
    return templates
      .map((t, i) => ({ t, i }))
      .sort((a, b) => popularity(stats, b.t.key) - popularity(stats, a.t.key) || a.i - b.i)
      .map(({ t }) => t);
  }, [all, pastDailies, daily, stats]);
}
