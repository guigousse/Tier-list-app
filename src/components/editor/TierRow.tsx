import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { colors, readableTextColor } from '../../constants/theme';
import { useT } from '../../lib/i18n/useT';
import { tierLabelFontSize, useResponsive } from '../../lib/layout';
import type { Card, Tier } from '../../store/types';
import { DraggableCard, useDragContext, useDropZone } from './DragDrop';
import { Clickable } from '../Clickable';

type Props = {
  tier: Tier;
  cards: Card[];
  /** Omitted when tiers can't be edited (daily tier list). */
  onPressTier?: (tier: Tier) => void;
  onPressCard: (card: Card) => void;
};

export function TierRow({ tier, cards, onPressTier, onPressCard }: Props) {
  const { ref, highlight } = useDropZone(tier.id, true);
  const { cardSize } = useDragContext();
  const { tierLabelWidth } = useResponsive();
  const { t } = useT();
  const fg = readableTextColor(tier.color);

  return (
    <View ref={ref} collapsable={false} style={styles.row}>
      <Clickable
        accessibilityRole="button"
        accessibilityLabel={t(onPressTier ? 'editor.tierA11yEdit' : 'editor.tierA11y', { label: tier.label })}
        disabled={!onPressTier}
        onPress={() => onPressTier?.(tier)}
        style={[styles.label, { width: tierLabelWidth, backgroundColor: tier.color, minHeight: cardSize + 8 }]}
      >
        <Text
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          style={[styles.labelText, { color: fg, fontSize: tierLabelFontSize(tier.label, tierLabelWidth - LABEL_PADDING * 2) }]}
        >
          {tier.label}
        </Text>
      </Clickable>
      <Animated.View style={[styles.cards, highlight]}>
        {cards.map((c) => (
          <DraggableCard key={c.id} card={c} zone={tier.id} scrolls onPress={onPressCard} />
        ))}
      </Animated.View>
    </View>
  );
}

const LABEL_PADDING = 6;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.background,
  },
  label: { alignItems: 'center', justifyContent: 'center', padding: LABEL_PADDING },
  labelText: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  cards: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 4, alignContent: 'flex-start' },
});
