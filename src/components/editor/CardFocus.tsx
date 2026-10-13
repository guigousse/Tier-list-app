import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, readableTextColor, spacing } from '../../constants/theme';
import { POOL, type Card, type Tier, type Zone } from '../../store/types';
import { CardView } from '../CardView';
import { Clickable } from '../Clickable';
import { IconButton } from '../ui';

type Props = {
  card: Card | null;
  /** Where the card currently is. */
  zone: Zone | null;
  tiers: Tier[];
  onClose: () => void;
  /** Places the card at the end of `zone`. */
  onPlace: (zone: Zone) => void;
  /** Omitted when the card can't be edited (daily tier list). */
  onEdit?: () => void;
};

/** A card shown large in the middle of the screen, with the tiers below to place it in one tap. */
export function CardFocus({ card, zone, tiers, onClose, onPlace, onEdit }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const size = Math.round(Math.min(width * 0.62, height * 0.36, 300));

  const place = (z: Zone) => {
    onPlace(z);
    onClose();
  };

  return (
    <Modal visible={card !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
          {onEdit ? <IconButton icon="create-outline" label="Modifier la carte" color="#FFFFFF" onPress={onEdit} /> : <View />}
          <IconButton icon="close" label="Fermer" color="#FFFFFF" size={26} onPress={onClose} />
        </View>

        {card ? (
          <View style={styles.center} pointerEvents="box-none">
            <Animated.View entering={ZoomIn.springify().damping(16)} style={styles.cardShadow}>
              {/* The name is written below the card, larger. */}
              <CardView card={card} size={size} showLabel={false} />
            </Animated.View>
            {card.label ? (
              <Text numberOfLines={2} style={styles.label}>
                {card.label}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(80)} style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.hint}>Placer dans</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
            {tiers.map((t) => {
              const current = zone === t.id;
              return (
                <Clickable
                  key={t.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Placer dans ${t.label}`}
                  accessibilityState={{ selected: current }}
                  onPress={() => place(t.id)}
                  style={({ pressed }) => [styles.tier, { backgroundColor: t.color }, current && styles.current, pressed && { transform: [{ scale: 0.94 }] }]}
                >
                  <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.4} style={[styles.tierText, { color: readableTextColor(t.color) }]}>
                    {t.label}
                  </Text>
                </Clickable>
              );
            })}
            <Clickable
              accessibilityRole="button"
              accessibilityLabel="Remettre dans les cartes à classer"
              accessibilityState={{ selected: zone === POOL }}
              onPress={() => place(POOL)}
              style={({ pressed }) => [styles.tier, styles.pool, zone === POOL && styles.current, pressed && { transform: [{ scale: 0.94 }] }]}
            >
              <Ionicons name="albums-outline" size={20} color={colors.text} />
              <Text style={styles.poolText}>À classer</Text>
            </Clickable>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const TIER_SIZE = 64;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(8,9,12,0.86)' },
  top: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl },
  cardShadow: { borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 16 },
  label: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  bottom: { gap: spacing.sm },
  hint: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  carousel: { gap: spacing.sm, paddingHorizontal: spacing.lg, flexGrow: 1, justifyContent: 'center' },
  tier: { width: TIER_SIZE, height: TIER_SIZE, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 6 },
  current: { borderWidth: 3, borderColor: '#FFFFFF' },
  tierText: { fontSize: 22, fontWeight: '800', textAlign: 'center', alignSelf: 'stretch' },
  pool: { backgroundColor: colors.surfaceAlt, gap: 2 },
  poolText: { color: colors.text, fontSize: 10, fontWeight: '700' },
});
