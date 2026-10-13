import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { TEMPLATES, type Template } from '../constants/presets';
import { fetchDaily, fetchPastDailies, fetchTemplateStats, fetchTemplates, type DailyList, type RemoteTemplate, type TemplateStats } from '../lib/api';

/** Content published online (Supabase), cached so it shows offline too. */
type CatalogState = {
  templates: RemoteTemplate[];
  daily: DailyList | null;
  /** Daily tier lists of the previous days: they join the popular tier lists. */
  pastDailies: DailyList[];
  /** Unique views and favourites of the popular tier lists. */
  stats: TemplateStats;
  /** Applies a change made on this device right away, before the next refresh. */
  bumpStat: (key: string, field: 'views' | 'favorites', delta: number) => void;
  /** Fetches the latest templates and daily tier list; keeps the cache on failure. */
  refresh: () => Promise<void>;
};

export const useCatalog = create<CatalogState>()(
  persist(
    (set) => ({
      templates: [],
      daily: null,
      pastDailies: [],
      stats: {},
      bumpStat: (key, field, delta) =>
        set((state) => {
          const current = state.stats[key] ?? { views: 0, favorites: 0 };
          return { stats: { ...state.stats, [key]: { ...current, [field]: Math.max(0, current[field] + delta) } } };
        }),
      refresh: async () => {
        const [templates, daily, stats, pastDailies] = await Promise.allSettled([
          fetchTemplates(),
          fetchDaily(),
          fetchTemplateStats(),
          fetchPastDailies(),
        ]);
        set((state) => ({
          templates: templates.status === 'fulfilled' ? templates.value : state.templates,
          daily: daily.status === 'fulfilled' ? daily.value : state.daily,
          stats: stats.status === 'fulfilled' ? stats.value : state.stats,
          pastDailies: pastDailies.status === 'fulfilled' ? pastDailies.value : state.pastDailies,
        }));
      },
    }),
    {
      name: 'tiercraft-catalog',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ templates: state.templates, daily: state.daily, stats: state.stats, pastDailies: state.pastDailies }),
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

/** Popularity score of a popular tier list: a favourite weighs more than a view. */
export function popularity(stats: TemplateStats, key: string): number {
  const s = stats[key];
  return s ? s.views + s.favorites * 3 : 0;
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
