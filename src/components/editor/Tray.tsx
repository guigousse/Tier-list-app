import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../../constants/theme';
import { useT } from '../../lib/i18n/useT';
import { useResponsive } from '../../lib/layout';
import { POOL, type Card } from '../../store/types';
import { DraggableCard, useDragContext, useDropZone } from './DragDrop';
import { Clickable } from '../Clickable';
import { Finger } from '../onboarding/kit';

type Props = {
  cards: Card[];
  total: number;
  /** Omitted when cards can't be added (daily tier list). */
  onAdd?: () => void;
  onPressCard: (card: Card) => void;
  /** Pad for the home indicator; off when something is shown below the tray. */
  bottomInset?: boolean;
  /** First game: a finger taps the first card to show how to rank. */
  hint?: boolean;
  /**
   * Edit mode: the tray holds the list's cards to edit, not cards to rank (they can't
   * be moved there): no "à classer", no hint about dragging.
   */
  editing?: boolean;
};

/** A finger tapping the first card again and again, until the player places one. */
function TapHint({ left, top }: { left: number; top: number }) {
  const pressed = useSharedValue(0);
  useEffect(() => {
    pressed.value = withRepeat(withSequence(withDelay(500, withTiming(1, { duration: 220 })), withTiming(0, { duration: 380 })), -1);
  }, [pressed]);
  return <Finger pressed={pressed} size={36} style={{ left, top }} />;
}

export function Tray({ cards, total, onAdd, onPressCard, bottomInset = true, hint = false, editing = false }: Props) {
  const insets = useSafeAreaInsets();
  const { ref, highlight } = useDropZone(POOL, false);
  const { cardSize } = useDragContext();
  const { isCompact } = useResponsive();
  const { t } = useT();
  const showHint = hint && cards.length > 0;
  // The first card comes after the "add" tile when there is one (gap 6 between them).
  const firstLeft = spacing.lg + (onAdd ? cardSize + 6 : 0);

  return (
    <View ref={ref} collapsable={false} style={[styles.tray, { paddingBottom: (bottomInset ? insets.bottom : 0) + spacing.sm }]}>
      <Animated.View style={[StyleSheet.absoluteFill, highlight]} pointerEvents="none" />
      <View style={styles.header}>
        {editing ? (
          <Text numberOfLines={1} style={styles.title}>
            {t('editor.tray.cards')} · {cards.length}
          </Text>
        ) : (
          <Text numberOfLines={1} style={styles.title}>
            {t('editor.toRank')} · {cards.length}
            <Text style={styles.muted}> / {total}</Text>
          </Text>
        )}
        {editing ? null : showHint ? (
          <Text numberOfLines={1} style={[styles.muted, styles.hint, styles.hintOn]}>
            {t('editor.tray.firstHint')}
          </Text>
        ) : isCompact ? null : (
          <Text numberOfLines={1} style={[styles.muted, styles.hint]}>
            {t('editor.tray.hint')}
          </Text>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.content, { minHeight: cardSize + 8 }]}
      >
        {onAdd ? (
        <Clickable
          accessibilityRole="button"
          accessibilityLabel={t('editor.addCards')}
          onPress={onAdd}
          style={({ pressed }) => [styles.add, { width: cardSize, height: cardSize, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="add" size={28} color={colors.primary} />
          <Text style={styles.addLabel}>{t('editor.cardSheet.add')}</Text>
        </Clickable>
        ) : null}
        {cards.map((c) => (
          <DraggableCard key={c.id} card={c} zone={POOL} scrolls={false} onPress={onPressCard} />
        ))}
        {showHint ? <TapHint left={firstLeft + cardSize * 0.35} top={cardSize * 0.4} /> : null}
        {!editing && cards.length === 0 && total > 0 ? (
          <View style={[styles.done, { height: cardSize }]}>
            <Text style={styles.muted}>{t('editor.tray.allRanked')}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    backgroundColor: colors.tray,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 12, fontWeight: '400' },
  hint: { flexShrink: 1, textAlign: 'right' },
  hintOn: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  content: { gap: 6, paddingHorizontal: spacing.lg, alignItems: 'center' },
  add: {
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  done: { justifyContent: 'center', paddingHorizontal: spacing.md },
});
