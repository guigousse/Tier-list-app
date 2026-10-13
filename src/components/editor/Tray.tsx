import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../../constants/theme';
import { useResponsive } from '../../lib/layout';
import { POOL, type Card } from '../../store/types';
import { DraggableCard, useDragContext, useDropZone } from './DragDrop';

type Props = {
  cards: Card[];
  total: number;
  /** Omitted when cards can't be added (daily tier list). */
  onAdd?: () => void;
  onPressCard: (card: Card) => void;
  /** Pad for the home indicator; off when something is shown below the tray. */
  bottomInset?: boolean;
};

export function Tray({ cards, total, onAdd, onPressCard, bottomInset = true }: Props) {
  const insets = useSafeAreaInsets();
  const { ref, highlight } = useDropZone(POOL, false);
  const { cardSize } = useDragContext();
  const { isCompact } = useResponsive();

  return (
    <View ref={ref} collapsable={false} style={[styles.tray, { paddingBottom: (bottomInset ? insets.bottom : 0) + spacing.sm }]}>
      <Animated.View style={[StyleSheet.absoluteFill, highlight]} pointerEvents="none" />
      <View style={styles.header}>
        <Text numberOfLines={1} style={styles.title}>
          À classer · {cards.length}
          <Text style={styles.muted}> / {total}</Text>
        </Text>
        {isCompact ? null : (
          <Text numberOfLines={1} style={[styles.muted, styles.hint]}>
            Maintenez une carte pour la glisser
          </Text>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.content, { minHeight: cardSize + 8 }]}
      >
        {onAdd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ajouter des cartes"
          onPress={onAdd}
          style={({ pressed }) => [styles.add, { width: cardSize, height: cardSize, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="add" size={28} color={colors.primary} />
          <Text style={styles.addLabel}>Ajouter</Text>
        </Pressable>
        ) : null}
        {cards.map((c) => (
          <DraggableCard key={c.id} card={c} zone={POOL} scrolls={false} onPress={onPressCard} />
        ))}
        {cards.length === 0 && total > 0 ? (
          <View style={[styles.done, { height: cardSize }]}>
            <Text style={styles.muted}>🎉 Toutes les cartes sont classées</Text>
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
