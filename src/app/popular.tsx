import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View, type ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePopularCopies } from '../components/PopularList';
import { PopularRow } from '../components/PopularRow';
import type { Template } from '../constants/presets';
import { Chip } from '../components/ui';
import { colors, radius, spacing } from '../constants/theme';
import { useResponsive } from '../lib/layout';
import { popularShown, searchIndex, type PopularFilter } from '../lib/popularSearch';
import { useCatalog, usePopularTemplates } from '../store/useCatalog';
import { useTierStore } from '../store/useTierStore';

type Filter = PopularFilter;
type Sort = 'popular' | 'title';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'favorites', label: 'Favoris' },
  { key: 'todo', label: 'À classer' },
  { key: 'started', label: 'En cours' },
  { key: 'validated', label: 'Validées' },
];

/** Every popular tier list, with search, filters and sorting. */
export default function Popular() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const templates = usePopularTemplates();
  const copies = usePopularCopies();
  const favorites = useTierStore((s) => s.favoriteTemplates);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('popular');

  const stats = useCatalog((s) => s.stats);
  // Title and cards of every list folded once, not at every key typed.
  const index = useMemo(() => searchIndex(templates), [templates]);
  const shown = useMemo(
    () => popularShown({ templates, index, copies, favorites, query, filter, sort }),
    [templates, index, copies, favorites, query, filter, sort],
  );

  const renderItem = useCallback<ListRenderItem<Template>>(
    ({ item: t }) => (
      <PopularRow
        template={t}
        list={copies(t)}
        completions={stats[t.key]?.completions ?? 0}
        favorites={stats[t.key]?.favorites ?? 0}
        favorite={favorites.includes(t.key)}
      />
    ),
    [copies, stats, favorites],
  );

  // An element, not a component: the search field keeps its focus while typing.
  const header = (
    <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher une liste ou une carte"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </ScrollView>
      <View style={styles.sortRow}>
        <Text style={styles.count}>
          {shown.length} liste{shown.length > 1 ? 's' : ''}
        </Text>
        <View style={styles.chips}>
          <Chip label="Populaires" selected={sort === 'popular'} onPress={() => setSort('popular')} />
          <Chip label="A → Z" selected={sort === 'title'} onPress={() => setSort('title')} />
        </View>
      </View>
    </View>
  );

  // Up to 366 past daily lists: only the rows on screen are built.
  return (
    <FlatList
      data={shown}
      keyExtractor={(t) => t.key}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {filter === 'favorites' && !query ? 'Touchez le cœur d’une liste pour la retrouver ici.' : 'Aucune liste ne correspond.'}
          </Text>
        </View>
      }
      ItemSeparatorComponent={Separator}
      initialNumToRender={12}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={[column, { padding: gutter, paddingBottom: insets.bottom + spacing.xl }]}
    />
  );
}

const Separator = () => <View style={{ height: spacing.sm }} />;

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 },
  chips: { flexDirection: 'row', gap: spacing.sm },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  count: { color: colors.textMuted, fontSize: 14 },
  empty: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg },
  emptyText: { color: colors.textMuted, textAlign: 'center', fontSize: 15, lineHeight: 21 },
});
