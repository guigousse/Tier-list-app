import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListRow } from '../components/ListRow';
import { ActionSheet, Button, Chip, Field, Sheet } from '../components/ui';
import { colors, spacing } from '../constants/theme';
import type { TierList } from '../store/types';
import { useResponsive } from '../lib/layout';
import { useTierStore } from '../store/useTierStore';

type Sort = 'updated' | 'opened' | 'name' | 'favorites';

const SORTS: { key: Sort; label: string }[] = [
  { key: 'updated', label: 'Modifiées' },
  { key: 'opened', label: 'Ouvertes' },
  { key: 'name', label: 'A → Z' },
  { key: 'favorites', label: 'Favoris' },
];

export default function Lists() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const lists = useTierStore((s) => s.lists);
  const { deleteList, duplicateList, renameList, toggleFavorite } = useTierStore.getState();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('updated');
  const [menuFor, setMenuFor] = useState<TierList | null>(null);
  const [renaming, setRenaming] = useState<TierList | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = Object.values(lists).filter((l) => !q || l.title.toLowerCase().includes(q));
    if (sort === 'favorites') items = items.filter((l) => l.favorite);
    return items.sort((a, b) => {
      if (sort === 'name') return a.title.localeCompare(b.title, 'fr');
      if (sort === 'opened') return b.openedAt - a.openedAt;
      return b.updatedAt - a.updatedAt;
    });
  }, [lists, query, sort]);

  const open = (id: string) => router.push({ pathname: '/editor/[id]', params: { id } });

  const confirmDelete = (list: TierList) =>
    Alert.alert('Supprimer la tier list ?', `« ${list.title} » sera définitivement supprimée.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteList(list.id) },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={data}
        keyExtractor={(l) => l.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[column, { padding: gutter, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }]}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.sm }}>
            <Field value={query} onChangeText={setQuery} placeholder="Rechercher…" clearButtonMode="while-editing" autoCorrect={false} />
            <View style={styles.chips}>
              {SORTS.map((s) => (
                <Chip key={s.key} label={s.label} selected={sort === s.key} onPress={() => setSort(s.key)} />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {Object.keys(lists).length === 0 ? 'Vous n’avez encore aucune tier list.' : 'Aucun résultat.'}
            </Text>
            {Object.keys(lists).length === 0 ? <Button label="Créer une tier list" icon="add" onPress={() => router.push('/new')} /> : null}
          </View>
        }
        renderItem={({ item }) => <ListRow list={item} onPress={() => open(item.id)} onMore={() => setMenuFor(item)} />}
      />

      <ActionSheet
        visible={menuFor !== null}
        onClose={() => setMenuFor(null)}
        title={menuFor?.title ?? ''}
        actions={
          menuFor
            ? [
                { label: 'Ouvrir', icon: 'open-outline', onPress: () => open(menuFor.id) },
                {
                  label: menuFor.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris',
                  icon: menuFor.favorite ? 'star' : 'star-outline',
                  onPress: () => toggleFavorite(menuFor.id),
                },
                {
                  label: 'Renommer',
                  icon: 'pencil-outline',
                  onPress: () => {
                    setNewTitle(menuFor.title);
                    setRenaming(menuFor);
                  },
                },
                { label: 'Dupliquer', icon: 'copy-outline', onPress: () => duplicateList(menuFor.id) },
                { label: 'Supprimer', icon: 'trash-outline', destructive: true, onPress: () => confirmDelete(menuFor) },
              ]
            : []
        }
      />

      <Sheet
        visible={renaming !== null}
        onClose={() => setRenaming(null)}
        title="Renommer"
        footer={
          <Button
            label="Enregistrer"
            onPress={() => {
              if (renaming) renameList(renaming.id, newTitle);
              setRenaming(null);
            }}
          />
        }
      >
        <Field value={newTitle} onChangeText={setNewTitle} autoFocus placeholder="Titre" />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  empty: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xl * 2 },
  emptyText: { color: colors.textMuted, fontSize: 15 },
});
