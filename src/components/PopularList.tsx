import { useMemo } from 'react';
import { View } from 'react-native';

import type { Template } from '../constants/presets';
import { spacing } from '../constants/theme';
import { useCatalog } from '../store/useCatalog';
import { popularVoteKey, useTierStore } from '../store/useTierStore';
import type { TierList } from '../store/types';
import { PopularRow } from './PopularRow';

/** The player's copy of each popular tier list, by statistics key (see popularVoteKey). */
export function usePopularCopies(): Map<string, TierList> {
  const lists = useTierStore((s) => s.lists);
  return useMemo(() => new Map(Object.values(lists).flatMap((l) => (l.popular ? [[l.popular.voteKey, l] as const] : []))), [lists]);
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
          list={copies.get(popularVoteKey(t))}
          views={stats[t.key]?.views ?? 0}
          favorites={stats[t.key]?.favorites ?? 0}
          favorite={favorites.includes(t.key)}
        />
      ))}
    </View>
  );
}
