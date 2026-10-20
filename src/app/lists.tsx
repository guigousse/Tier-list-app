import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListRow } from '../components/ListRow';
import { ShareSheet } from '../components/ShareSheet';
import { ActionSheet, Button, Chip, Field, Sheet } from '../components/ui';
import { colors, spacing } from '../constants/theme';
import type { TierList } from '../store/types';
import { createAndOpen } from '../lib/create';
import { useResponsive } from '../lib/layout';
import { useT } from '../lib/i18n/useT';
import { MAX_TITLE } from '../lib/listTitle';
import { useTierStore } from '../store/useTierStore';

type Sort = 'updated' | 'opened' | 'name' | 'favorites';

// Labels looked up when shown: each sort's text key is `editor.sort.<sort>`.
const SORTS: Sort[] = ['updated', 'opened', 'name', 'favorites'];

export default function Lists() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const { t, locale } = useT();
  const lists = useTierStore((s) => s.lists);
  const { deleteList, duplicateList, renameList, toggleFavorite } = useTierStore.getState();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('updated');
  const [menuFor, setMenuFor] = useState<TierList | null>(null);
  const [shareFor, setShareFor] = useState<TierList | null>(null);
  const [renaming, setRenaming] = useState<TierList | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const ownCount = useMemo(() => Object.values(lists).filter((l) => !l.daily && !l.popular && !l.draft).length, [lists]);
  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = Object.values(lists).filter((l) => !l.daily && !l.popular && !l.draft && (!q || l.title.toLowerCase().includes(q)));
    if (sort === 'favorites') items = items.filter((l) => l.favorite);
    return items.sort((a, b) => {
      if (sort === 'name') return a.title.localeCompare(b.title, locale);
      if (sort === 'opened') return b.openedAt - a.openedAt;
      return b.updatedAt - a.updatedAt;
    });
  }, [lists, query, sort, locale]);

  const open = (id: string) => router.push({ pathname: '/editor/[id]', params: { id } });

  const confirmDelete = (list: TierList) =>
    Alert.alert(t('editor.deleteTitle'), t('editor.deleteBody', { title: list.title }), [
      { text: t('editor.cancel'), style: 'cancel' },
      { text: t('editor.delete'), style: 'destructive', onPress: () => deleteList(list.id) },
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
            <Field value={query} onChangeText={setQuery} placeholder={t('editor.search')} clearButtonMode="while-editing" autoCorrect={false} />
            <Button label={t('editor.importReceived')} icon="download-outline" variant="secondary" onPress={() => router.push('/import')} />
            <View style={styles.chips}>
              {SORTS.map((key) => (
                <Chip key={key} label={t(`editor.sort.${key}`)} selected={sort === key} onPress={() => setSort(key)} />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {ownCount === 0 ? t('editor.noListYet') : t('editor.noResult')}
            </Text>
            {ownCount === 0 ? <Button label={t('editor.createList')} icon="add" onPress={() => createAndOpen()} /> : null}
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
                { label: t('editor.open'), icon: 'open-outline', onPress: () => open(menuFor.id) },
                {
                  label: menuFor.favorite ? t('editor.removeFavorite') : t('editor.addFavorite'),
                  icon: menuFor.favorite ? 'star' : 'star-outline',
                  onPress: () => toggleFavorite(menuFor.id),
                },
                {
                  label: t('editor.rename'),
                  icon: 'pencil-outline',
                  onPress: () => {
                    setNewTitle(menuFor.title);
                    setRenaming(menuFor);
                  },
                },
                { label: t('editor.share'), icon: 'share-outline', onPress: () => setShareFor(menuFor) },
                { label: t('editor.duplicate'), icon: 'copy-outline', onPress: () => duplicateList(menuFor.id) },
                { label: t('editor.delete'), icon: 'trash-outline', destructive: true, onPress: () => confirmDelete(menuFor) },
              ]
            : []
        }
      />

      <ShareSheet list={shareFor ? (lists[shareFor.id] ?? null) : null} visible={shareFor !== null} onClose={() => setShareFor(null)} />

      <Sheet
        visible={renaming !== null}
        onClose={() => setRenaming(null)}
        title={t('editor.rename')}
        footer={
          <Button
            label={t('editor.save')}
            onPress={() => {
              if (renaming) renameList(renaming.id, newTitle);
              setRenaming(null);
            }}
          />
        }
      >
        <Field value={newTitle} onChangeText={setNewTitle} autoFocus placeholder={t('editor.titlePlaceholder')} maxLength={MAX_TITLE} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  empty: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xl * 2 },
  emptyText: { color: colors.textMuted, fontSize: 15 },
});
