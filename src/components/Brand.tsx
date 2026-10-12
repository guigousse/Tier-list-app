import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, TIER_COLORS } from '../constants/theme';

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
        <Image source={require('../../assets/icon.png')} style={styles.logo} accessibilityIgnoresInvertColors />
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
  logo: { width: 64, height: 64, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  wordmark: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', letterSpacing: 2.5 },
  tagline: { color: 'rgba(255,255,255,0.78)', fontSize: 14, fontWeight: '600', marginTop: 2 },
});
