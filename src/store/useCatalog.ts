import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { TEMPLATES, type Template } from '../constants/presets';
import { fetchDaily, fetchTemplateStats, fetchTemplates, type DailyList, type RemoteTemplate, type TemplateStats } from '../lib/api';

/** Content published online (Supabase), cached so it shows offline too. */
type CatalogState = {
  templates: RemoteTemplate[];
  daily: DailyList | null;
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
      stats: {},
      bumpStat: (key, field, delta) =>
        set((state) => {
          const current = state.stats[key] ?? { views: 0, favorites: 0 };
          return { stats: { ...state.stats, [key]: { ...current, [field]: Math.max(0, current[field] + delta) } } };
        }),
      refresh: async () => {
        const [templates, daily, stats] = await Promise.allSettled([fetchTemplates(), fetchDaily(), fetchTemplateStats()]);
        set((state) => ({
          templates: templates.status === 'fulfilled' ? templates.value : state.templates,
          daily: daily.status === 'fulfilled' ? daily.value : state.daily,
          stats: stats.status === 'fulfilled' ? stats.value : state.stats,
        }));
      },
    }),
    {
      name: 'tiercraft-catalog',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ templates: state.templates, daily: state.daily, stats: state.stats }),
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

/** Popular tier lists, most popular first (built-in order breaks ties). */
export function usePopularTemplates(): Template[] {
  const templates = useAllTemplates();
  const stats = useCatalog((s) => s.stats);
  return useMemo(
    () => templates.map((t, i) => ({ t, i })).sort((a, b) => popularity(stats, b.t.key) - popularity(stats, a.t.key) || a.i - b.i).map(({ t }) => t),
    [templates, stats],
  );
}
