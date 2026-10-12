import * as Sharing from 'expo-sharing';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { ActionSheet, Button, Field, IconButton, Sheet } from '../../components/ui';
import { CardSheet, type CardDraft } from '../../components/editor/CardSheet';
import { DragProvider, useDragContext } from '../../components/editor/DragDrop';
import { TierRow } from '../../components/editor/TierRow';
import { TierSheet } from '../../components/editor/TierSheet';
import { Tray } from '../../components/editor/Tray';
import { CARD_SIZES, colors, spacing } from '../../constants/theme';
import { POOL, type Card, type TierList, type Zone } from '../../store/types';
import { useTierStore } from '../../store/useTierStore';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = useTierStore((s) => (id ? s.lists[id] : undefined));
  const settings = useTierStore((s) => s.settings);
  const moveCard = useTierStore((s) => s.moveCard);

  useEffect(() => {
    if (id) useTierStore.getState().markOpened(id);
  }, [id]);

  const onMove = useCallback((cardId: string, zone: Zone, index: number) => moveCard(id!, cardId, zone, index), [id, moveCard]);

  if (!list) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Cette tier list n’existe plus.</Text>
        <Button label="Retour à l’accueil" onPress={() => router.dismissTo('/')} />
      </View>
    );
  }

  return (
    <DragProvider cardSize={CARD_SIZES[settings.cardSize]} showLabels={settings.showCardLabels} haptics={settings.haptics} onMove={onMove}>
      <Editor list={list} />
    </DragProvider>
  );
}

function Editor({ list }: { list: TierList }) {
  const insets = useSafeAreaInsets();
  const store = useTierStore.getState();
  const { scrollRef, viewportRef, onScrollLayout, onContentSize } = useDragContext();
  const captureTarget = useRef<View>(null);

  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [cardSheet, setCardSheet] = useState<{ cardId: string | null } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [exporting, setExporting] = useState(false);

  const editingTierIndex = list.tiers.findIndex((t) => t.id === editingTierId);
  const editingTier = editingTierIndex >= 0 ? list.tiers[editingTierIndex] : null;
  const editingCard = cardSheet?.cardId ? list.cards[cardSheet.cardId] ?? null : null;
  const editingCardZone: Zone | null = editingCard
    ? list.pool.includes(editingCard.id)
      ? POOL
      : (list.tiers.find((t) => list.placement[t.id]?.includes(editingCard.id))?.id ?? POOL)
    : null;

  const cardsOf = (ids: string[] | undefined) => (ids ?? []).map((cid) => list.cards[cid]).filter(Boolean) as Card[];
  const total = Object.keys(list.cards).length;

  const openCard = useCallback((card: Card) => setCardSheet({ cardId: card.id }), []);
  const openTier = useCallback((tier: { id: string }) => setEditingTierId(tier.id), []);

  const createCards = (drafts: CardDraft[]) => drafts.forEach((d) => store.addCard(list.id, d));

  const exportImage = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Partage indisponible', 'Le partage n’est pas disponible sur cet appareil.');
        return;
      }
      const uri = await captureRef(captureTarget, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: list.title });
    } catch {
      Alert.alert('Export impossible', 'L’image n’a pas pu être générée.');
    } finally {
      setExporting(false);
    }
  };

  const confirmReset = () =>
    Alert.alert('Réinitialiser le classement ?', 'Toutes les cartes retournent dans la barre du bas.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Réinitialiser', style: 'destructive', onPress: () => store.resetPlacement(list.id) },
    ]);

  const confirmDelete = () =>
    Alert.alert('Supprimer la tier list ?', `« ${list.title} » sera définitivement supprimée.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          router.back();
          setTimeout(() => store.deleteList(list.id), 300);
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <IconButton icon="chevron-back" label="Retour" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} size={26} />
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Renommer"
          style={styles.titleWrap}
          onPress={() => {
            setTitle(list.title);
            setRenaming(true);
          }}
        >
          <Text numberOfLines={1} style={styles.title}>
            {list.title}
          </Text>
        </Pressable>
        <IconButton icon="share-outline" label="Partager en image" onPress={exportImage} />
        <IconButton icon="ellipsis-horizontal-circle-outline" label="Options" onPress={() => setMenuOpen(true)} />
      </View>

      <View ref={viewportRef} collapsable={false} style={{ flex: 1 }} onLayout={(e) => onScrollLayout(e.nativeEvent.layout.height)}>
        <AnimatedScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
          onContentSizeChange={(_w: number, h: number) => onContentSize(h)}
        >
          <View ref={captureTarget} collapsable={false} style={styles.capture}>
            {list.tiers.map((tier) => (
              <TierRow key={tier.id} tier={tier} cards={cardsOf(list.placement[tier.id])} onPressTier={openTier} onPressCard={openCard} />
            ))}
            <Text style={styles.watermark}>Tierly</Text>
          </View>
          <View style={styles.below}>
            <Button label="Ajouter un rang" icon="add" variant="ghost" onPress={() => store.addTier(list.id)} />
          </View>
        </AnimatedScrollView>
      </View>

      <Tray cards={cardsOf(list.pool)} total={total} onAdd={() => setCardSheet({ cardId: null })} onPressCard={openCard} />

      <TierSheet
        tier={editingTier}
        index={editingTierIndex}
        count={list.tiers.length}
        cardCount={editingTier ? (list.placement[editingTier.id]?.length ?? 0) : 0}
        onClose={() => setEditingTierId(null)}
        onSave={(patch) => editingTier && store.updateTier(list.id, editingTier.id, patch)}
        onMove={(dir) => editingTier && store.moveTier(list.id, editingTier.id, dir)}
        onInsert={(where) => store.addTier(list.id, editingTierIndex + (where === 'below' ? 1 : 0))}
        onDelete={() => editingTier && store.removeTier(list.id, editingTier.id)}
      />

      <CardSheet
        visible={cardSheet !== null}
        card={editingCard}
        zone={editingCardZone}
        tiers={list.tiers}
        onClose={() => setCardSheet(null)}
        onCreate={createCards}
        onUpdate={(patch) => editingCard && store.updateCard(list.id, editingCard.id, patch)}
        onMove={(zone) => editingCard && store.moveCard(list.id, editingCard.id, zone)}
        onDelete={() => editingCard && store.deleteCard(list.id, editingCard.id)}
      />

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Options"
        actions={[
          { label: 'Ajouter des cartes', icon: 'add-circle-outline', onPress: () => setCardSheet({ cardId: null }) },
          { label: 'Ajouter un rang', icon: 'reorder-four-outline', onPress: () => store.addTier(list.id) },
          { label: 'Partager en image', icon: 'image-outline', onPress: exportImage },
          {
            label: list.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris',
            icon: list.favorite ? 'star' : 'star-outline',
            onPress: () => store.toggleFavorite(list.id),
          },
          {
            label: 'Dupliquer',
            icon: 'copy-outline',
            onPress: () => {
              const copy = store.duplicateList(list.id);
              if (copy) router.replace({ pathname: '/editor/[id]', params: { id: copy } });
            },
          },
          { label: 'Réinitialiser le classement', icon: 'refresh-outline', onPress: confirmReset },
          { label: 'Supprimer la tier list', icon: 'trash-outline', destructive: true, onPress: confirmDelete },
        ]}
      />

      <Sheet
        visible={renaming}
        onClose={() => setRenaming(false)}
        title="Renommer"
        footer={
          <Button
            label="Enregistrer"
            onPress={() => {
              store.renameList(list.id, title);
              setRenaming(false);
            }}
          />
        }
      >
        <Field value={title} onChangeText={setTitle} autoFocus placeholder="Titre" maxLength={60} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  titleWrap: { flex: 1, paddingHorizontal: spacing.xs },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  capture: { backgroundColor: colors.background },
  watermark: { color: colors.border, fontSize: 11, fontWeight: '700', textAlign: 'right', padding: 6 },
  below: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  missingText: { color: colors.textMuted, fontSize: 16 },
});
