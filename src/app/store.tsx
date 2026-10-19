import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Clickable } from '../components/Clickable';
import { ENERGY, EnergyAmount } from '../components/Energy';
import { PurchaseBurst } from '../components/PurchaseBurst';
import { useBoltShow } from '../components/useBoltShow';
import { colors, radius, spacing } from '../constants/theme';
import { imageCredits, wordCredits } from '../lib/aiGenerate';
import { openWallet, useCredits } from '../lib/credits';
import { useT } from '../lib/i18n/useT';
import { useResponsive } from '../lib/layout';
import { bonusPercent, buy, openShop, PACKS, type Pack, useShop } from '../lib/shop';
import { hasPot, REFERRAL_CAP, REFERRAL_REWARD, refreshReferrals, useReferrals } from '../lib/referrals';

/** Pack pictures (Gemini sheet in the card icons' style, keyed like them): 1 to 5 bolts. */
const PACK_ART = [
  require('../../assets/energy/pack-1.png'),
  require('../../assets/energy/pack-2.png'),
  require('../../assets/energy/pack-3.png'),
  require('../../assets/energy/pack-4.png'),
  require('../../assets/energy/pack-5.png'),
];

/** What a full list costs: 10 cards written and illustrated, a yardstick for the packs. */
const LIST = wordCredits(10) + imageCredits(10);

// Until the App Store gives its price: euros, written the player's way.
const euros = (price: number, locale: string) => price.toLocaleString(locale, { style: 'currency', currency: 'EUR' });

/** The energy shop: the packs, cheapest first, each with what it gives beyond the first. */
export default function Store() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const { t, locale } = useT();
  const balance = useCredits((s) => s.balance);
  const { prices, buying, message, celebration } = useShop();
  useEffect(() => {
    openShop();
    openWallet();
    refreshReferrals();
  }, []);

  // A pack credited: bolts from it to the balance, which then counts up to the new one.
  const arts = useRef<Record<string, View | null>>({});
  const { root, counter, burst, shown, pulseStyle } = useBoltShow(
    celebration,
    () => (celebration ? arts.current[celebration.packId] : null),
    () => useShop.setState({ celebration: null }),
  );

  return (
    <View ref={root} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[column, { padding: gutter, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.balance}>
          <Text style={styles.balanceLabel}>{t('app.store.balance')}</Text>
          <Animated.View ref={counter} style={pulseStyle}>
            {/* While the bolts fly, still the old balance: the server's new one is counted up to. */}
            <EnergyAmount amount={shown ?? (celebration ? celebration.from : balance)} size={26} style={styles.balanceValue} />
          </Animated.View>
        </View>

        <FreeEnergyButton />

        {message ? (
          <View style={styles.message} accessibilityLiveRegion="polite">
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        {PACKS.map((pack, i) => (
          <PackRow
            key={pack.id}
            pack={pack}
            rank={i}
            price={prices[pack.id] ?? euros(pack.price, locale)}
            busy={buying === pack.id}
            disabled={buying !== null}
            artRef={(v) => {
              arts.current[pack.id] = v;
            }}
          />
        ))}

        <Text style={styles.note}>
          {Platform.OS === 'ios'
            ? t('app.store.noteIos', { cost: LIST })
            : t('app.store.noteOther')}
        </Text>
      </ScrollView>
      {burst ? <PurchaseBurst key={burst.key} from={burst.from} to={burst.to} /> : null}
    </View>
  );
}

/** The way to energy without paying: referrals now, a rewarded ad later. */
function FreeEnergyButton() {
  const { t } = useT();
  const pending = useReferrals((s) => (hasPot(s) ? s.status!.pending : 0));
  const max = REFERRAL_CAP * (REFERRAL_REWARD.challenge + REFERRAL_REWARD.active);
  return (
    <Clickable
      accessibilityRole="button"
      accessibilityLabel={[t('app.store.freeEnergy'), pending > 0 ? t('app.free.badge', { count: pending }) : null].filter(Boolean).join('. ')}
      onPress={() => router.push('/free-energy')}
      style={({ pressed }) => [styles.free, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.freeIcon}>
        <Ionicons name="gift" size={26} color="#2A1B00" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.freeTitle}>{t('app.store.freeEnergy')}</Text>
        <Text style={styles.detail}>{t('app.store.freeEnergyHint', { max })}</Text>
      </View>
      {pending > 0 ? (
        <View style={styles.freeBadge}>
          <Text style={styles.freeBadgeText}>+{pending}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Clickable>
  );
}

function PackRow({
  pack,
  rank,
  price,
  busy,
  disabled,
  artRef,
}: {
  pack: Pack;
  rank: number;
  price: string;
  busy: boolean;
  disabled: boolean;
  artRef: (view: View | null) => void;
}) {
  const { t, locale } = useT();
  const bonus = bonusPercent(pack);
  const lists = Math.floor(pack.credits / LIST);
  return (
    <View style={[styles.pack, pack.tag ? styles.packTagged : null]}>
      {pack.tag ? (
        <View style={styles.tag}>
          <Text style={styles.tagText}>{t(`app.store.tag.${pack.tag}`)}</Text>
        </View>
      ) : null}
      {/* Drawn in the icons' style: one more bolt per pack, and hotter, up to the fireball. */}
      <View ref={artRef} collapsable={false}>
        <Image source={PACK_ART[rank]} style={[styles.art, { transform: [{ scale: 0.86 + rank * 0.06 }] }]} accessibilityIgnoresInvertColors />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.credits}>{pack.credits.toLocaleString(locale)}</Text>
        <Text style={styles.detail}>
          {t('app.store.lists', { count: lists })}
        </Text>
        {bonus > 0 ? <Text style={styles.bonus}>{t('app.store.bonus', { bonus })}</Text> : <Text style={styles.detail}>{t('app.store.trial')}</Text>}
      </View>
      <Clickable
        accessibilityRole="button"
        accessibilityLabel={t('app.store.buy', { credits: pack.credits, price })}
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
  art: { width: 76, height: 76 },
  credits: { color: ENERGY, fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  detail: { color: colors.textMuted, fontSize: 13 },
  bonus: { color: '#7BE495', fontSize: 13, fontWeight: '700' },
  price: { minWidth: 92, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  priceText: { color: colors.primaryText, fontSize: 16, fontWeight: '800' },
  free: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(123, 228, 149, 0.55)',
    backgroundColor: 'rgba(123, 228, 149, 0.10)',
    padding: spacing.md,
  },
  freeIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#7BE495', alignItems: 'center', justifyContent: 'center' },
  freeTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  freeBadge: { minWidth: 28, height: 24, borderRadius: 12, paddingHorizontal: 8, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  freeBadgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  note: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: spacing.sm },
});
