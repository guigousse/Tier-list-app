import { useId } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useCredits } from '../lib/credits';

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
 * each digit instead of having a set width.
 */
export function EnergyPill() {
  const balance = useCredits((s) => s.balance);
  return (
    <View
      accessible
      accessibilityLabel={balance === null ? 'Solde de crédits en cours de chargement' : `Solde : ${balance} crédit${balance > 1 ? 's' : ''}`}
      style={styles.pill}
    >
      <EnergyIcon size={18} />
      <Text style={styles.pillText}>{balance === null ? '…' : balance}</Text>
    </View>
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
  pillText: { color: ENERGY, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
