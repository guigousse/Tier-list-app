import { StyleSheet, View, type ViewStyle } from 'react-native';

import { TIER_COLORS } from '../constants/theme';

/** The five tier colours (S to D) as a thin strip: the app's visual signature under each header. */
export function TierStrip({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.strip, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {TIER_COLORS.slice(0, 5).map((c) => (
        <View key={c} style={[styles.segment, { backgroundColor: c }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
});
