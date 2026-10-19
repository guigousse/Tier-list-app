import { useMemo } from 'react';
import { View } from 'react-native';

import type { Template } from '../constants/presets';
import { spacing } from '../constants/theme';
import { copiesByKey } from '../lib/publicSync';
import { useAllTemplates, useCatalog } from '../store/useCatalog';
import { popularVoteKey, useTierStore } from '../store/useTierStore';
import type { TierList } from '../store/types';
import { PopularRow } from './PopularRow';

/**
 * Finds the player's copy of a popular tier list. For a past daily tier list, the
 * copy played on its day comes first.
 */
export function usePopularCopies(): (template: Template) => TierList | undefined {
  const lists = useTierStore((s) => s.lists);
  const templates = useAllTemplates();
  return useMemo(() => {
    const all = Object.values(lists);
    const voteKeys = new Map(templates.map((t) => [t.key, popularVoteKey(t)]));
    const popular = copiesByKey(all, (key) => voteKeys.get(key));
    const daily = new Map(all.flatMap((l) => (l.daily ? [[l.daily.day, l] as const] : [])));
    return (t: Template) => (t.day ? daily.get(t.day) : undefined) ?? popular.get(t.key);
  }, [lists, templates]);
}

/** Whether the player validated their ranking of this copy. */
export function isValidated(list: TierList | undefined): boolean {
  return Boolean(list?.popular?.validatedAt ?? list?.daily?.validatedAt);
}

/** Popular tier lists, one per line, in the given order. */
export function PopularList({ templates }: { templates: Template[] }) {
  const stats = useCatalog((s) => s.stats);
  const favorites = useTierStore((s) => s.favoriteTemplates);
  const copies = usePopularCopies();
  return (
    <View style={{ gap: spacing.sm }}>
      {templates.map((t) => (
        <PopularRow
          key={t.key}
          template={t}
          list={copies(t)}
          completions={stats[t.key]?.completions ?? 0}
          favorites={stats[t.key]?.favorites ?? 0}
          favorite={favorites.includes(t.key)}
        />
      ))}
    </View>
  );
}
