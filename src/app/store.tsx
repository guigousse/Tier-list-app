import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Clickable } from '../components/Clickable';
import { ENERGY, EnergyAmount } from '../components/Energy';
import { PurchaseBurst } from '../components/PurchaseBurst';
import { colors, radius, spacing } from '../constants/theme';
import { imageCredits, wordCredits } from '../lib/aiGenerate';
import { BURST, coinTimes, counterAt } from '../lib/celebration';
import { openWallet, useCredits } from '../lib/credits';
import { useResponsive } from '../lib/layout';
import { bonusPercent, buy, openShop, PACKS, type Pack, useShop } from '../lib/shop';
import { playCoin, playThunder } from '../lib/sound';

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

const euros = (price: number) => price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

type Point = { x: number; y: number };

/** The energy shop: the packs, cheapest first, each with what it gives beyond the first. */
export default function Store() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const balance = useCredits((s) => s.balance);
  const { prices, buying, message, celebration } = useShop();
  useEffect(() => {
    openShop();
    openWallet();
  }, []);

  // A pack credited: bolts from it to the balance, which then counts up to the new one.
  const root = useRef<View>(null);
  const counter = useRef<View>(null);
  const arts = useRef<Record<string, View | null>>({});
  const [burst, setBurst] = useState<{ from: Point; to: Point; key: number } | null>(null);
  const [shown, setShown] = useState<number | null>(null);
  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  useEffect(() => {
    if (!celebration) return;
    const { packId, from, to, key } = celebration;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let frame = 0;
    // Window coordinates, made relative to the overlay laid over the whole page.
    const art = arts.current[packId];
    root.current?.measureInWindow((rx, ry) => {
      art?.measureInWindow((ax, ay, aw, ah) => {
        counter.current?.measureInWindow((cx, cy, _cw, ch) => {
          setBurst({ from: { x: ax - rx + aw / 2, y: ay - ry + ah / 2 }, to: { x: cx - rx + 14, y: cy - ry + ch / 2 }, key });
        });
      });
    });
    playThunder();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    for (const t of coinTimes()) {
      timers.push(
        setTimeout(() => {
          playCoin();
          Haptics.selectionAsync().catch(() => {});
        }, t),
      );
    }
    timers.push(
      setTimeout(() => {
        pulse.value = withSequence(withTiming(1.18, { duration: 120 }), withSpring(1));
        const start = Date.now();
        const tick = () => {
          const progress = (Date.now() - start) / BURST.count;
          setShown(counterAt(from, to, progress));
          if (progress < 1) frame = requestAnimationFrame(tick);
          else pulse.value = withSequence(withTiming(1.25, { duration: 140 }), withSpring(1));
        };
        frame = requestAnimationFrame(tick);
      }, BURST.arrive),
    );
    timers.push(
      setTimeout(() => {
        setBurst(null);
        setShown(null);
        useShop.setState({ celebration: null });
      }, BURST.arrive + BURST.count + 600),
    );
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
    };
  }, [celebration, pulse]);

  return (
    <View ref={root} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[column, { padding: gutter, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.balance}>
          <Text style={styles.balanceLabel}>Votre énergie</Text>
          <Animated.View ref={counter} style={pulseStyle}>
            {/* While the bolts fly, still the old balance: the server's new one is counted up to. */}
            <EnergyAmount amount={shown ?? (celebration ? celebration.from : balance)} size={26} style={styles.balanceValue} />
          </Animated.View>
        </View>

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
            price={prices[pack.id] ?? euros(pack.price)}
            busy={buying === pack.id}
            disabled={buying !== null}
            artRef={(v) => {
              arts.current[pack.id] = v;
            }}
          />
        ))}

        <Text style={styles.note}>
          {Platform.OS === 'ios'
            ? `Paiement par l’App Store. L’énergie ne périme pas et reste après une réinstallation de l’app. Une liste de 10 cartes écrites et illustrées en coûte ${LIST}.\n\nEn achetant, vous acceptez que l’usage de votre énergie soit communiqué à Apple en cas de demande de remboursement.`
            : 'Les packs d’énergie s’achètent pour le moment depuis l’app iPhone.'}
        </Text>
      </ScrollView>
      {burst ? <PurchaseBurst key={burst.key} from={burst.from} to={burst.to} /> : null}
    </View>
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
  const bonus = bonusPercent(pack);
  const lists = Math.floor(pack.credits / LIST);
  return (
    <View style={[styles.pack, pack.tag ? styles.packTagged : null]}>
      {pack.tag ? (
        <View style={styles.tag}>
          <Text style={styles.tagText}>{pack.tag}</Text>
        </View>
      ) : null}
      {/* Drawn in the icons' style: one more bolt per pack, and hotter, up to the fireball. */}
      <View ref={artRef} collapsable={false}>
        <Image source={PACK_ART[rank]} style={[styles.art, { transform: [{ scale: 0.86 + rank * 0.06 }] }]} accessibilityIgnoresInvertColors />
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
  art: { width: 76, height: 76 },
  credits: { color: ENERGY, fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  detail: { color: colors.textMuted, fontSize: 13 },
  bonus: { color: '#7BE495', fontSize: 13, fontWeight: '700' },
  price: { minWidth: 92, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  priceText: { color: colors.primaryText, fontSize: 16, fontWeight: '800' },
  note: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: spacing.sm },
});
