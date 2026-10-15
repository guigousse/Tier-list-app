import { useEffect } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Clickable } from '../components/Clickable';
import { ENERGY, EnergyAmount, EnergyIcon } from '../components/Energy';
import { colors, radius, spacing } from '../constants/theme';
import { imageCredits } from '../lib/aiGenerate';
import { openWallet, useCredits } from '../lib/credits';
import { useResponsive } from '../lib/layout';
import { bonusPercent, buy, openShop, PACKS, type Pack, useShop } from '../lib/shop';

/** What a full list costs: 10 cards written and illustrated, a yardstick for the packs. */
const LIST = 10 + imageCredits(10);

const euros = (price: number) => price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

/** The energy shop: the packs, cheapest first, each with what it gives beyond the first. */
export default function Store() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const balance = useCredits((s) => s.balance);
  const { prices, buying, message } = useShop();
  useEffect(() => {
    openShop();
    openWallet();
  }, []);

  return (
    <ScrollView contentContainerStyle={[column, { padding: gutter, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.balance}>
        <Text style={styles.balanceLabel}>Votre énergie</Text>
        <EnergyAmount amount={balance} size={26} style={styles.balanceValue} />
      </View>

      {message ? (
        <View style={styles.message} accessibilityLiveRegion="polite">
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      {PACKS.map((pack, i) => (
        <PackRow key={pack.id} pack={pack} rank={i} price={prices[pack.id] ?? euros(pack.price)} busy={buying === pack.id} disabled={buying !== null} />
      ))}

      <Text style={styles.note}>
        {Platform.OS === 'ios'
          ? `Paiement par l’App Store. L’énergie ne périme pas et reste après une réinstallation de l’app. Une liste de 10 cartes écrites et illustrées en coûte ${LIST}.`
          : 'Les packs d’énergie s’achètent pour le moment depuis l’app iPhone.'}
      </Text>
    </ScrollView>
  );
}

function PackRow({ pack, rank, price, busy, disabled }: { pack: Pack; rank: number; price: string; busy: boolean; disabled: boolean }) {
  const bonus = bonusPercent(pack);
  const lists = Math.floor(pack.credits / LIST);
  return (
    <View style={[styles.pack, pack.tag ? styles.packTagged : null]}>
      {pack.tag ? (
        <View style={styles.tag}>
          <Text style={styles.tagText}>{pack.tag}</Text>
        </View>
      ) : null}
      {/* One more bolt per pack: the size of the pile says the size of the pack. */}
      <View style={styles.bolts}>
        {Array.from({ length: Math.min(rank + 1, 3) }, (_, k) => (
          <View key={k} style={{ marginLeft: k ? -10 : 0 }}>
            <EnergyIcon size={30 - k * 2} />
          </View>
        ))}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.credits}>{pack.credits.toLocaleString('fr-FR')}</Text>
        <Text style={styles.detail}>
          ≈ {lists} liste{lists > 1 ? 's' : ''} illustrée{lists > 1 ? 's' : ''}
        </Text>
        {bonus > 0 ? <Text style={styles.bonus}>+{bonus} % offerts</Text> : <Text style={styles.detail}>Pour essayer</Text>}
      </View>
      <Clickable
        accessibilityRole="button"
        accessibilityLabel={`Acheter ${pack.credits} crédits d’énergie pour ${price}`}
        accessibilityState={{ disabled, busy }}
        disabled={disabled || Platform.OS !== 'ios'}
        onPress={() => buy(pack.id)}
        style={({ pressed }) => [styles.price, (disabled && !busy) || Platform.OS !== 'ios' ? { opacity: 0.5 } : null, pressed && { opacity: 0.8 }]}
      >
        {busy ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.priceText}>{price}</Text>}
      </Clickable>
    </View>
  );
}

const styles = StyleSheet.create({
  balance: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  balanceLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  balanceValue: { color: ENERGY, fontSize: 30 },
  message: { backgroundColor: 'rgba(255, 216, 74, 0.12)', borderColor: 'rgba(255, 216, 74, 0.5)', borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  messageText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  pack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  packTagged: { borderColor: ENERGY, marginTop: spacing.sm },
  tag: { position: 'absolute', top: -11, left: spacing.lg, backgroundColor: ENERGY, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { color: '#2A1B00', fontSize: 12, fontWeight: '800' },
  bolts: { flexDirection: 'row', width: 64, justifyContent: 'center' },
  credits: { color: ENERGY, fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  detail: { color: colors.textMuted, fontSize: 13 },
  bonus: { color: '#7BE495', fontSize: 13, fontWeight: '700' },
  price: { minWidth: 92, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  priceText: { color: colors.primaryText, fontSize: 16, fontWeight: '800' },
  note: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: spacing.sm },
});
