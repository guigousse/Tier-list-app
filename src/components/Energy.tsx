import { Ionicons } from '@expo/vector-icons';
import { useId } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useCredits } from '../lib/credits';
import { useT } from '../lib/i18n/useT';
import { Clickable } from './Clickable';

/** The gold of the credits, the same everywhere they are shown. */
export const ENERGY = '#FFD84A';

/**
 * A credit drawn as a bolt of energy: gold from light to deep, with a darker edge so
 * it stays readable on the dark surfaces as on the violet button.
 */
export function EnergyIcon({ size = 16 }: { size?: number }) {
  // One gradient per bolt: on the web, a shared id would take the first bolt's, even hidden on another screen.
  const gradient = `energy${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFF1A6" />
          <Stop offset="0.5" stopColor={ENERGY} />
          <Stop offset="1" stopColor="#FFA21F" />
        </LinearGradient>
      </Defs>
      <Path
        d="M13.6 2.2 4.4 13.4c-.4.5 0 1.2.6 1.2h5.6l-1.4 7c-.1.7.8 1.1 1.2.5l9.2-11.2c.4-.5 0-1.2-.6-1.2h-5.6l1.4-7c.1-.7-.8-1.1-1.2-.5Z"
        fill={`url(#${gradient})`}
        stroke="#B9770E"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** A number of credits: the bolt, then the amount. */
export function EnergyAmount({ amount, size = 16, style }: { amount: number | null; size?: number; style?: StyleProp<TextStyle> }) {
  return (
    <View style={styles.amount}>
      <EnergyIcon size={size} />
      <Text style={[styles.amountText, style]}>{amount === null ? '…' : amount}</Text>
    </View>
  );
}

/**
 * The player's balance in a gold pill, as long as the number needs: it grows with
 * each digit instead of having a set width. With `onPress`, a "+" ends it: the whole
 * pill opens the shop, not only the small sign, which alone would be a hard target.
 * `pending`: referral credits waiting in the shop, shown as a dot on the "+".
 */
export function EnergyPill({ onPress, pending = 0 }: { onPress?: () => void; pending?: number }) {
  const { t } = useT();
  const balance = useCredits((s) => s.balance);
  const label = [
    balance === null ? t('app.energy.loading') : t('app.energy.balance', { count: balance }),
    pending > 0 ? t('app.free.badge', { count: pending }) : null,
  ]
    .filter(Boolean)
    .join('. ');
  const content = (
    <>
      <EnergyIcon size={18} />
      <Text style={styles.pillText}>{balance === null ? '…' : balance}</Text>
      {onPress ? (
        <View style={styles.plus}>
          <Ionicons name="add" size={16} color="#2A1B00" />
          {pending > 0 ? <View testID="energy-pot-dot" style={styles.dot} /> : null}
        </View>
      ) : null}
    </>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label} style={styles.pill}>
        {content}
      </View>
    );
  }
  return (
    <Clickable
      accessibilityRole="button"
      accessibilityLabel={t('app.energy.buy', { label })}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.pill, styles.pillWithPlus, pressed && { opacity: 0.8 }]}
    >
      {content}
    </Clickable>
  );
}

const styles = StyleSheet.create({
  amount: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  amountText: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 216, 74, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 216, 74, 0.5)',
  },
  // The "+" sits in the pill's round end: the padding shrinks so it keeps the same margin.
  pillWithPlus: { paddingRight: 4 },
  plus: { width: 24, height: 24, borderRadius: 12, backgroundColor: ENERGY, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  // On the "+" it leads to: ringed with the page's background so it reads apart from the gold.
  dot: { position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF5C6C', borderWidth: 2, borderColor: '#0F1115' },
  pillText: { color: ENERGY, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
