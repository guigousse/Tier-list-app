import { useCallback, useEffect, useMemo } from 'react';

import type { TierList } from '../../store/types';
import { useCatalog } from '../../store/useCatalog';
import { contentText, localizeList, sourceKey, themeTitle, type ContentText } from './content';
import { useT } from './useT';

// Languages whose translations were already asked since launch: the bundled snapshot
// shows meanwhile, and a failed fetch is not retried on every render.
const asked = new Set<string>();

/** Asks the online content's translations again when the player switches language (root layout). */
export function useTranslationsFollowLanguage(): void {
  const { language } = useT();
  const fetched = useCatalog((s) => s.translations?.lang);
  useEffect(() => {
    if (language === 'fr' || fetched === language || asked.has(language)) return;
    asked.add(language);
    useCatalog.getState().refresh().catch(() => {});
  }, [language, fetched]);
}

/** Translation of a public list in the player's language, by template key ("daily-<day>" for a daily). */
export function useContentText(): (key: string | undefined) => ContentText | undefined {
  const { language } = useT();
  const remote = useCatalog((s) => s.translations);
  return useCallback((key) => (key ? contentText(key, language, remote) : undefined), [language, remote]);
}

/** Localizes daily and popular lists for display; the player's own lists are returned as they are. */
export function useLocalizeList(): (list: TierList) => TierList {
  const text = useContentText();
  return useCallback((list) => localizeList(list, text(sourceKey(list))), [text]);
}

/** A daily or popular list as the player reads it; their own lists are returned as they are. */
export function useLocalizedList<L extends TierList | null | undefined>(list: L): L {
  const text = useContentText();
  return useMemo(() => (list ? localizeList(list, text(sourceKey(list))) : list) as L, [list, text]);
}

/** Name of a theme of the gallery in the player's language. */
export function useThemeTitle(): (key: string, fallback: string) => string {
  const { language } = useT();
  return useCallback((key, fallback) => themeTitle(key, language) ?? fallback, [language]);
}
