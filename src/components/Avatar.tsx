import { StyleSheet, Text, View } from 'react-native';

import { avatarColor } from '../lib/social';

/** A player's avatar: their emoji on a colour of their own. */
export function Avatar({ emoji, seed, size = 44 }: { emoji: string; seed: string; size?: number }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(seed) }]}>
      <Text style={{ fontSize: size * 0.55 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
