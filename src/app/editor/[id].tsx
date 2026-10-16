import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { ActionSheet, Button, Field, IconButton, Sheet, type MenuAction } from '../../components/ui';
import { ShareSheet } from '../../components/ShareSheet';
import { CardFocus } from '../../components/editor/CardFocus';
import { CardSheet, type CardDraft } from '../../components/editor/CardSheet';
import { DragProvider, useDragContext } from '../../components/editor/DragDrop';
import { TierRow } from '../../components/editor/TierRow';
import { TierSheet } from '../../components/editor/TierSheet';
import { Tray } from '../../components/editor/Tray';
import { AiSheet } from '../../components/editor/AiSheet';
import { MagicWand } from '../../components/editor/MagicWand';
import { aiBusy, useAiJob } from '../../lib/aiGenerate';
import { isFixed, placementLocked, startsEditing } from '../../lib/editorMode';
import { colors, spacing } from '../../constants/theme';
import { answerMail } from '../../lib/api';
import { syncDailyVotes } from '../../lib/daily';
import { TierStrip } from '../../components/TierStrip';
import { socialError } from '../../lib/social';
import { sentRanksState, validateSentRanks } from '../../lib/sentRanks';
import { useCatalog } from '../../store/useCatalog';
import { useMail } from '../../store/useMail';
import { playClick } from '../../lib/sound';
import { useResponsive } from '../../lib/layout';
import { POOL, type Card, type TierList, type Zone } from '../../store/types';
import { rankingOf, useTierStore } from '../../store/useTierStore';
import { Clickable } from '../../components/Clickable';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
const noop = () => {};

export default function EditorScreen() {
  // `edit`: a list just created opens in edit mode, to name it and add its cards.
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const list = useTierStore((s) => (id ? s.lists[id] : undefined));
  const settings = useTierStore((s) => s.settings);
  const moveCard = useTierStore((s) => s.moveCard);
  const { cardSize } = useResponsive();

  useEffect(() => {
    if (id) useTierStore.getState().markOpened(id);
  }, [id]);

  const onMove = useCallback((cardId: string, zone: Zone, index: number) => moveCard(id!, cardId, zone, index), [id, moveCard]);
  // The mode lives here: dragging is locked while editing (DragProvider wraps the editor).
  const [editing, setEditing] = useState(() => Boolean(list && startsEditing(list, edit === '1')));

  if (!list) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Cette tier list n’existe plus.</Text>
        <Button label="Retour à l’accueil" onPress={() => router.dismissTo('/')} />
      </View>
    );
  }

  return (
    <DragProvider
      cardSize={cardSize(settings.cardSize)}
      showLabels={settings.showCardLabels}
      haptics={settings.haptics}
      locked={placementLocked(list, editing)}
      onMove={onMove}
    >
      <Editor list={list} editing={editing} setEditing={setEditing} />
    </DragProvider>
  );
}

function Editor({ list, editing, setEditing }: { list: TierList; editing: boolean; setEditing: (on: boolean) => void }) {
  const insets = useSafeAreaInsets();
  const store = useTierStore.getState();
  const { scrollRef, viewportRef, onScrollLayout, onContentSize } = useDragContext();
  const captureTarget = useRef<View>(null);

  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [cardSheet, setCardSheet] = useState<{ cardId: string | null } | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const aiRunning = useAiJob((s) => (aiBusy(s.job, list.id) ? s.job!.kind : null));
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [exporting, setExporting] = useState(false);

  const editingTierIndex = list.tiers.findIndex((t) => t.id === editingTierId);
  const editingTier = editingTierIndex >= 0 ? list.tiers[editingTierIndex] : null;
  const editingCard = cardSheet?.cardId ? list.cards[cardSheet.cardId] ?? null : null;

  const daily = list.daily;
  const popular = list.popular;
  const mail = list.mail;
  const fixed = isFixed(list);
  // The player's own lists have two modes: editing (title, tiers, cards, never their
  // place) and ranking (only placing the cards), where they land once saved.
  const editable = !fixed && editing;
  // A received list's ranking is frozen once sent back; daily and popular ones can
  // change and be validated again.
  const validated = Boolean(mail?.answeredAt);
  const [sending, setSending] = useState(false);
  const ranked = popular ?? daily;
  const currentRanks = ranked ? rankingOf(list, ranked.cardIds) : null;
  const upToDate = Boolean(currentRanks && ranked?.validatedRanks?.join() === currentRanks.join());

  const cardsOf = (ids: string[] | undefined) => (ids ?? []).map((cid) => list.cards[cid]).filter(Boolean) as Card[];
  const total = Object.keys(list.cards).length;

  // Tapping a card opens its edit sheet (tier choice included); on the daily tier list,
  // a view with the tiers to place it.
  const [focusId, setFocusId] = useState<string | null>(null);
  const openCard = useCallback(
    (card: Card) => {
      playClick();
      // Outside edit mode, cards can't be edited: only offer to place them.
      if (editable) setCardSheet({ cardId: card.id });
      else setFocusId(card.id);
    },
    [editable],
  );
  const focusCard = focusId ? (list.cards[focusId] ?? null) : null;
  const focusZone: Zone | null = focusCard
    ? list.pool.includes(focusCard.id)
      ? POOL
      : (list.tiers.find((t) => list.placement[t.id]?.includes(focusCard.id))?.id ?? POOL)
    : null;
  const openTier = useCallback((tier: { id: string }) => setEditingTierId(tier.id), []);

  const createCards = (drafts: CardDraft[]) => drafts.forEach((d) => store.addCard(list.id, d));

  // A list sent to friends: they compare with the ranking the player validates.
  const outbox = useMail((s) => s.outbox);
  const sentState = sentRanksState(list, outbox);
  useEffect(() => {
    if (!fixed && !useMail.getState().loaded) useMail.getState().refresh();
  }, [fixed]);

  const validateOwn = async () => {
    setSending(true);
    try {
      await validateSentRanks(list.id);
    } catch (e) {
      Alert.alert('Oups', socialError(e));
    } finally {
      setSending(false);
    }
  };

  const save = () => {
    playClick();
    setEditing(false);
    setCardSheet(null);
    setEditingTierId(null);
  };

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

  const showComparison = () => mail && router.push({ pathname: '/mail/[id]', params: { id: mail.id } });

  // A received list: the ranking goes back to the friend, then both are compared.
  const sendRanking = async () => {
    const secret = useTierStore.getState().profile?.secret;
    const ranks = mail ? rankingOf(list, mail.cardIds) : null;
    if (!mail || !secret || !ranks) return;
    setSending(true);
    try {
      await answerMail(secret, mail.id, ranks);
      store.markMailAnswered(list.id);
      await useMail.getState().refresh();
      showComparison();
    } catch (e) {
      Alert.alert('Oups', socialError(e));
    } finally {
      setSending(false);
    }
  };

  const confirmValidate = () =>
    mail
      ? Alert.alert('Envoyer votre classement ?', `${mail.from} le verra, et vous découvrirez le sien. Vous ne pourrez plus le modifier.`, [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Envoyer', onPress: sendRanking },
        ])
      : Alert.alert(
      'Valider votre classement ?',
      'Il comptera dans le classement moyen des joueurs. Vous pourrez le modifier et le valider à nouveau plus tard.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Valider',
          onPress: () => {
            const first = !list.popular?.validatedAt;
            const ok = daily ? store.validateDaily(list.id) : store.validatePopular(list.id);
            if (!ok) return;
            // Count this player's first completed ranking right away (stats refresh later).
            if (list.popular && first) useCatalog.getState().bumpStat(list.popular.key, 'completions', 1);
            syncDailyVotes();
            showResults();
          },
        },
      ],
    );

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

  // The results replace this screen: going back returns where the player came from.
  const showResults = () => router.replace({ pathname: '/results/[id]', params: { id: list.id } });

  const menuActions: MenuAction[] = fixed
    ? [
        { label: 'Partager en image', icon: 'image-outline', onPress: exportImage },
        ...(mail?.answeredAt ? [{ label: 'Voir la comparaison', icon: 'git-compare-outline', onPress: showComparison } as const] : []),
        ...(!mail && ranked?.validatedAt ? [{ label: 'Voir le classement moyen', icon: 'people-outline', onPress: showResults } as const] : []),
        ...(validated ? [] : [{ label: 'Réinitialiser le classement', icon: 'refresh-outline', onPress: confirmReset } as const]),
        { label: 'Supprimer la tier list', icon: 'trash-outline', destructive: true, onPress: confirmDelete },
      ]
    : [
        ...(editable
          ? ([
              { label: 'Ajouter des cartes', icon: 'add-circle-outline', onPress: () => setCardSheet({ cardId: null }) },
              { label: 'Ajouter un rang', icon: 'reorder-four-outline', onPress: () => store.addTier(list.id) },
            ] as const)
          : ([{ label: 'Modifier la liste', icon: 'create-outline', onPress: () => setEditing(true) }] as const)),
        { label: 'Partager la tier list', icon: 'share-outline', onPress: () => setShareOpen(true) },
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
            if (copy) router.replace({ pathname: '/editor/[id]', params: { id: copy, edit: '1' } });
          },
        },
        { label: 'Réinitialiser le classement', icon: 'refresh-outline', onPress: confirmReset },
        { label: 'Supprimer la tier list', icon: 'trash-outline', destructive: true, onPress: confirmDelete },
      ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <IconButton icon="chevron-back" label="Retour" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} size={26} />
        <Clickable
          accessibilityRole="button"
          accessibilityHint={editable ? 'Renommer' : undefined}
          disabled={!editable}
          style={styles.titleWrap}
          onPress={() => {
            setTitle(list.title);
            setRenaming(true);
          }}
        >
          <Text numberOfLines={1} style={styles.title}>
            {list.title}
          </Text>
          {editable ? <Ionicons name="pencil" size={14} color={colors.textMuted} /> : null}
        </Clickable>
        {fixed || editing ? null : <IconButton icon="create-outline" label="Modifier la liste" onPress={() => setEditing(true)} />}
        <IconButton icon="share-outline" label="Partager" onPress={fixed ? exportImage : () => setShareOpen(true)} />
        <IconButton icon="ellipsis-horizontal-circle-outline" label="Options" onPress={() => setMenuOpen(true)} />
      </View>
      <TierStrip style={styles.strip} />

      <View ref={viewportRef} collapsable={false} style={{ flex: 1 }} onLayout={(e) => onScrollLayout(e.nativeEvent.layout.height)}>
        <AnimatedScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
          onContentSizeChange={(_w: number, h: number) => onContentSize(h)}
        >
          <View ref={captureTarget} collapsable={false} style={styles.capture}>
            {list.tiers.map((tier) => (
              <TierRow
                key={tier.id}
                tier={tier}
                cards={cardsOf(list.placement[tier.id])}
                onPressTier={editable ? openTier : undefined}
                onPressCard={validated ? noop : openCard}
              />
            ))}
            <Text style={styles.watermark}>Tiercraft</Text>
          </View>
          {!editable ? null : (
            <View style={styles.below}>
              <Button label="Ajouter un rang" icon="add" variant="ghost" onPress={() => store.addTier(list.id)} />
            </View>
          )}
        </AnimatedScrollView>
        {/* AI generation: personal lists being edited only (daily and popular cards are fixed). */}
        {!editable ? null : (
          <View style={styles.wand} pointerEvents="box-none">
            <MagicWand onPress={() => setAiOpen(true)} busy={aiRunning !== null} />
          </View>
        )}
      </View>

      {validated && mail ? (
        <View style={[styles.dailyBar, { paddingBottom: insets.bottom + spacing.md }]}>
          <Text style={styles.dailyText}>Classement envoyé à {mail.from}</Text>
          <Button label="Voir la comparaison" icon="git-compare-outline" onPress={showComparison} />
        </View>
      ) : (
        <>
          <Tray
            bottomInset={!fixed && !editing && sentState === 'none'}
            cards={cardsOf(list.pool)}
            total={total}
            onAdd={editable ? () => setCardSheet({ cardId: null }) : undefined}
            onPressCard={openCard}
          />
          {editable ? (
            <View style={[styles.dailyBar, { paddingBottom: insets.bottom + spacing.md }]}>
              <Text style={styles.dailyText}>Mode édition · titre, rangs et cartes</Text>
              <Button label="Enregistrer" icon="checkmark" onPress={save} disabled={total === 0} />
              {total === 0 ? <Text style={styles.dailyText}>Ajoutez des cartes pour enregistrer la liste.</Text> : null}
            </View>
          ) : !fixed && sentState === 'sent' ? (
            <View style={[styles.dailyBar, { paddingBottom: insets.bottom + spacing.md }]}>
              <Text style={styles.dailyText}>✓ Classement envoyé à vos amis · déplacez des cartes pour le modifier</Text>
            </View>
          ) : !fixed && sentState === 'pending' ? (
            <View style={[styles.dailyBar, { paddingBottom: insets.bottom + spacing.md }]}>
              <Button
                label={sending ? 'Envoi…' : 'Valider mon classement'}
                icon="checkmark-done"
                onPress={validateOwn}
                disabled={list.pool.length > 0 || sending}
              />
              <Text style={styles.dailyText}>
                {list.pool.length > 0 ? 'Classez toutes les cartes pour valider.' : 'Vos amis compareront avec ce classement.'}
              </Text>
            </View>
          ) : upToDate ? (
            <View style={[styles.dailyBar, { paddingBottom: insets.bottom + spacing.md }]}>
              <Text style={styles.dailyText}>✓ Classement validé · déplacez des cartes pour le modifier</Text>
              <Button label="Voir le classement moyen" icon="people-outline" onPress={showResults} />
            </View>
          ) : fixed ? (
            <View style={[styles.dailyBar, { paddingBottom: insets.bottom + spacing.md }]}>
              {mail ? <Text style={styles.dailyText}>Liste envoyée par {mail.from}</Text> : null}
              <Button
                label={mail ? (sending ? 'Envoi…' : `Envoyer mon classement à ${mail.from}`) : ranked?.validatedAt ? 'Valider mes changements' : 'Valider mon classement'}
                icon={mail ? 'paper-plane' : 'checkmark-done'}
                onPress={confirmValidate}
                disabled={list.pool.length > 0 || sending}
              />
              {list.pool.length > 0 ? <Text style={styles.dailyText}>Classez toutes les cartes pour valider.</Text> : null}
            </View>
          ) : null}
        </>
      )}

      <CardFocus
        card={focusCard}
        zone={focusZone}
        tiers={list.tiers}
        onClose={() => setFocusId(null)}
        onPlace={(zone) => {
          if (focusCard) store.moveCard(list.id, focusCard.id, zone);
          if (useTierStore.getState().settings.haptics) Haptics.selectionAsync().catch(() => {});
        }}
      />

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
        onClose={() => setCardSheet(null)}
        onCreate={createCards}
        onUpdate={(patch) => editingCard && store.updateCard(list.id, editingCard.id, patch)}
        onDelete={() => editingCard && store.deleteCard(list.id, editingCard.id)}
      />

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Options"
        actions={menuActions}
      />

      {fixed ? null : (
        <>
          <AiSheet visible={aiOpen} onClose={() => setAiOpen(false)} listId={list.id} title={list.title} />
        </>
      )}

      <ShareSheet list={list} visible={shareOpen} onClose={() => setShareOpen(false)} onShareImage={exportImage} />

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
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.xs },
  title: { color: colors.text, fontSize: 18, fontWeight: '800', flexShrink: 1 },
  capture: { backgroundColor: colors.background },
  watermark: { color: colors.border, fontSize: 11, fontWeight: '700', textAlign: 'right', padding: 6 },
  below: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  strip: { marginHorizontal: spacing.md, marginBottom: spacing.sm },
  wand: { position: 'absolute', right: spacing.lg, bottom: spacing.md, flexDirection: 'row', gap: spacing.md },
  dailyBar: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.tray },
  dailyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  missingText: { color: colors.textMuted, fontSize: 16 },
});
