import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { TEMPLATES, type Template } from '../constants/presets';
import { fetchDaily, fetchTemplates, type DailyList, type RemoteTemplate } from '../lib/api';

/** Content published online (Supabase), cached so it shows offline too. */
type CatalogState = {
  templates: RemoteTemplate[];
  daily: DailyList | null;
  /** Fetches the latest templates and daily tier list; keeps the cache on failure. */
  refresh: () => Promise<void>;
};

export const useCatalog = create<CatalogState>()(
  persist(
    (set) => ({
      templates: [],
      daily: null,
      refresh: async () => {
        const [templates, daily] = await Promise.allSettled([fetchTemplates(), fetchDaily()]);
        set((state) => ({
          templates: templates.status === 'fulfilled' ? templates.value : state.templates,
          daily: daily.status === 'fulfilled' ? daily.value : state.daily,
        }));
      },
    }),
    {
      name: 'tiercraft-catalog',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ templates: state.templates, daily: state.daily }),
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
