import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PopularList, usePopularCopies } from '../components/PopularList';
import { Chip } from '../components/ui';
import { colors, radius, spacing } from '../constants/theme';
import { useResponsive } from '../lib/layout';
import { usePopularTemplates } from '../store/useCatalog';
import { popularVoteKey, useTierStore } from '../store/useTierStore';

type Filter = 'all' | 'favorites' | 'todo' | 'started' | 'validated';
type Sort = 'popular' | 'title';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'favorites', label: 'Favoris' },
  { key: 'todo', label: 'À classer' },
  { key: 'started', label: 'En cours' },
  { key: 'validated', label: 'Validées' },
];

/** Lower case, without accents, for searching. */
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

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

  const shown = useMemo(() => {
    const q = fold(query.trim());
    const result = templates.filter((t) => {
      // Search the title and the cards.
      if (q && !fold([t.title, ...t.items].join(' ')).includes(q)) return false;
      const copy = copies.get(popularVoteKey(t));
      switch (filter) {
        case 'favorites':
          return favorites.includes(t.key);
        case 'todo':
          return !copy;
        case 'started':
          return Boolean(copy && !copy.popular?.validatedAt);
        case 'validated':
          return Boolean(copy?.popular?.validatedAt);
        default:
          return true;
      }
    });
    return sort === 'title' ? [...result].sort((a, b) => a.title.localeCompare(b.title, 'fr')) : result;
  }, [templates, copies, favorites, query, filter, sort]);

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={[column, { padding: gutter, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }]}
    >
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
      {shown.length > 0 ? (
        <PopularList templates={shown} />
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {filter === 'favorites' && !query ? 'Touchez le cœur d’une liste pour la retrouver ici.' : 'Aucune liste ne correspond.'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

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
