import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, TIER_COLORS } from '../constants/theme';

const MARK_BARS = [
  { width: 1, color: TIER_COLORS[0] },
  { width: 0.78, color: TIER_COLORS[1] },
  { width: 0.58, color: TIER_COLORS[2] },
  { width: 0.4, color: TIER_COLORS[4] },
];

/** The Tiercraft logo mark: stacked tier bars with a sparkle, same as the app icon. */
export function BrandMark({ size = 48 }: { size?: number }) {
  const barHeight = size * 0.15;
  return (
    <View style={{ width: size, height: size, justifyContent: 'flex-end', gap: size * 0.055 }}>
      <Ionicons name="sparkles" size={size * 0.3} color="#FFFFFF" style={{ position: 'absolute', top: 0, right: 0 }} />
      {MARK_BARS.map((bar) => (
        <View
          key={bar.color}
          style={{ width: size * 0.84 * bar.width, height: barHeight, borderRadius: barHeight * 0.32, backgroundColor: bar.color }}
        />
      ))}
    </View>
  );
}

/** Branded banner shown at the top of the home screen. */
export function BrandBanner({ right }: { right?: ReactNode }) {
  return (
    <View style={styles.banner}>
      {[320, 250, 180].map((d) => (
        <View key={d} style={[styles.glow, { width: d, height: d, top: -d / 2 - 10, left: -d / 3, backgroundColor: colors.primary, opacity: 0.22 }]} />
      ))}
      <View style={[styles.glow, styles.glowAccent]} />
      <View style={styles.stripes} pointerEvents="none">
        {TIER_COLORS.slice(0, 5).map((c) => (
          <View key={c} style={[styles.stripe, { backgroundColor: c }]} />
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.markBadge}>
          <BrandMark size={40} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.wordmark}>TIERCRAFT</Text>
          <Text style={styles.tagline}>Classez tout, de S à D.</Text>
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: '#24175A',
    padding: spacing.lg,
    paddingVertical: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  glow: { position: 'absolute', borderRadius: 999 },
  glowAccent: { width: 180, height: 180, bottom: -120, right: -40, backgroundColor: '#FF7F7F', opacity: 0.18 },
  stripes: {
    position: 'absolute',
    right: -30,
    top: -20,
    bottom: -20,
    flexDirection: 'row',
    gap: 6,
    opacity: 0.22,
    transform: [{ rotate: '18deg' }],
  },
  stripe: { width: 10, height: '140%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  markBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,17,21,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  wordmark: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: 2.5 },
  tagline: { color: 'rgba(255,255,255,0.78)', fontSize: 14, fontWeight: '600', marginTop: 2 },
});
