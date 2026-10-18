import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, ScrollView, StyleSheet, Text, TextInput, View, type ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePopularCopies } from '../components/PopularList';
import { PopularRow } from '../components/PopularRow';
import { ThemeGallery } from '../components/ThemeGallery';
import type { Template } from '../constants/presets';
import { Chip } from '../components/ui';
import { colors, radius, spacing } from '../constants/theme';
import { useResponsive } from '../lib/layout';
import { popularShown, searchIndex, type PopularFilter } from '../lib/popularSearch';
import { cardUrls, preloadCovers } from '../lib/preload';
import { groupByTheme, themeOf } from '../lib/themes';
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

/** Every public tier list: grand themes first, then search, filters and sorting. */
export default function Popular() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const templates = usePopularTemplates();
  const copies = usePopularCopies();
  const favorites = useTierStore((s) => s.favoriteTemplates);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('popular');
  // The grand theme opened from the gallery, if any.
  const [theme, setTheme] = useState<string | null>(null);

  const stats = useCatalog((s) => s.stats);
  const tags = useCatalog((s) => s.discovery.tags);
  const icons = useCatalog((s) => s.icons);
  // Title and cards of every list folded once, not at every key typed.
  const index = useMemo(() => searchIndex(templates), [templates]);
  const shown = useMemo(
    () =>
      popularShown({
        templates,
        index,
        copies,
        favorites,
        query,
        filter,
        sort,
        theme: theme ?? undefined,
        tags,
      }),
    [templates, index, copies, favorites, query, filter, sort, theme, tags],
  );
  const groups = useMemo(
    () =>
      groupByTheme(templates, tags).map((g) => ({
        theme: g.theme,
        templates: g.templates,
      })),
    [templates, tags],
  );
  // A theme opened: the pictures of its lists' cards copied to the device in the background,
  // so a list opened next shows its cards at once.
  const openTheme = useCallback(
    (key: string) => {
      setTheme(key);
      if (Platform.OS === 'web') return;
      const lists = groups.find((g) => g.theme.key === key)?.templates ?? [];
      preloadCovers(cardUrls(lists, icons));
    },
    [groups, icons],
  );
  // Nothing searched nor filtered: the gallery of themes rather than every list at once.
  const gallery = !theme && !query.trim() && filter === 'all';
  const opened = theme ? themeOf(theme) : undefined;

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
      {opened ? (
        <View style={styles.themeRow}>
          <Chip label="‹ Thématiques" onPress={() => setTheme(null)} />
          <Text style={styles.themeTitle} numberOfLines={1}>
            {opened.emoji} {opened.title}
          </Text>
        </View>
      ) : null}
      {gallery ? (
        <ThemeGallery groups={groups} icons={icons} onOpen={openTheme} />
      ) : (
        <View style={styles.sortRow}>
          <Text style={styles.count}>
            {shown.length} liste{shown.length > 1 ? 's' : ''}
          </Text>
          <View style={styles.chips}>
            <Chip label="Populaires" selected={sort === 'popular'} onPress={() => setSort('popular')} />
            <Chip label="A → Z" selected={sort === 'title'} onPress={() => setSort('title')} />
          </View>
        </View>
      )}
    </View>
  );

  // Up to 366 past daily lists: only the rows on screen are built.
  return (
    <FlatList
      data={gallery ? EMPTY : shown}
      keyExtractor={(t) => t.key}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={
        gallery ? null : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {filter === 'favorites' && !query ? 'Touchez le cœur d’une liste pour la retrouver ici.' : 'Aucune liste ne correspond.'}
            </Text>
          </View>
        )
      }
      ItemSeparatorComponent={Separator}
      initialNumToRender={12}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={[column, { padding: gutter, paddingBottom: insets.bottom + spacing.xl }]}
    />
  );
}

const EMPTY: Template[] = [];
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
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  count: { color: colors.textMuted, fontSize: 14 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  themeTitle: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '800' },
  empty: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 21,
  },
});
