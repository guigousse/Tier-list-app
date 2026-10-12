import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { colors, readableTextColor } from '../../constants/theme';
import type { Card, Tier } from '../../store/types';
import { DraggableCard, useDragContext, useDropZone } from './DragDrop';

type Props = {
  tier: Tier;
  cards: Card[];
  onPressTier: (tier: Tier) => void;
  onPressCard: (card: Card) => void;
};

export function TierRow({ tier, cards, onPressTier, onPressCard }: Props) {
  const { ref, highlight } = useDropZone(tier.id, true);
  const { cardSize } = useDragContext();
  const fg = readableTextColor(tier.color);

  return (
    <View ref={ref} collapsable={false} style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Rang ${tier.label}, modifier`}
        onPress={() => onPressTier(tier)}
        style={[styles.label, { backgroundColor: tier.color, minHeight: cardSize + 8 }]}
      >
        <Text numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.5} style={[styles.labelText, { color: fg }]}>
          {tier.label}
        </Text>
      </Pressable>
      <Animated.View style={[styles.cards, highlight]}>
        {cards.map((c) => (
          <DraggableCard key={c.id} card={c} zone={tier.id} scrolls onPress={onPressCard} />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.background,
  },
  label: { width: 84, alignItems: 'center', justifyContent: 'center', padding: 6 },
  labelText: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  cards: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 4, alignContent: 'flex-start' },
});
