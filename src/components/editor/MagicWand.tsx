import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Clickable } from '../Clickable';

const SIZE = 58;
const RAINBOW = ['#FF5F6D', '#FFB347', '#FFE66B', '#7BE495', '#5AB8FF', '#9B7CFF', '#FF7FD1'] as const;

const KINDS = {
  words: { glyph: 'text', label: 'Générer des cartes avec l’IA' },
  images: { glyph: 'image', label: 'Générer les images des cartes avec l’IA' },
} as const;

/**
 * Floating button that opens an AI generation: a rainbow disc with a wand passing in
 * front of what it makes (a letter for the words, a picture for the images), a light
 * sweep running across it now and then, and a soft breathing halo. `busy`: still
 * generating, the disc spins slowly.
 */
export function MagicWand({ kind, onPress, busy = false }: { kind: keyof typeof KINDS; onPress: () => void; busy?: boolean }) {
  const sweep = useSharedValue(0);
  const breath = useSharedValue(0);
  const spin = useSharedValue(0);
  useEffect(() => {
    sweep.value = withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), withDelay(1800, withTiming(0, { duration: 0 }))), -1);
    breath.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [sweep, breath]);
  useEffect(() => {
    spin.value = busy ? withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1) : withTiming(0, { duration: 300 });
  }, [busy, spin]);

  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -SIZE + sweep.value * SIZE * 2 }, { rotate: '25deg' }] }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: 0.25 + breath.value * 0.35, transform: [{ scale: 1.05 + breath.value * 0.18 }] }));
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]}>
        <LinearGradient colors={RAINBOW} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
      </Animated.View>
      <Clickable
        accessibilityRole="button"
        accessibilityLabel={KINDS[kind].label}
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && { transform: [{ scale: 0.93 }] }]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, ringStyle]}>
          <LinearGradient colors={RAINBOW} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
        </Animated.View>
        <View style={styles.clip} pointerEvents="none">
          <Animated.View style={[styles.sweep, sweepStyle]} />
        </View>
        <Ionicons name={KINDS[kind].glyph} size={26} color="rgba(255,255,255,0.92)" style={[styles.icon, styles.glyph]} />
        <Ionicons name="color-wand" size={24} color="#FFFFFF" style={[styles.icon, styles.wandIcon]} />
        <Ionicons name="sparkles" size={12} color="#FFFFFF" style={styles.spark} />
      </Clickable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden' },
  fill: { flex: 1 },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#9B7CFF',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  clip: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', borderRadius: SIZE / 2 },
  sweep: { position: 'absolute', top: -SIZE / 2, width: SIZE * 0.35, height: SIZE * 2, backgroundColor: 'rgba(255,255,255,0.55)' },
  icon: { textShadowColor: 'rgba(60,20,90,0.45)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  // The glyph a little up and right, the wand across its lower left corner.
  glyph: { position: 'absolute', top: 11, right: 11 },
  wandIcon: { position: 'absolute', bottom: 9, left: 9, textShadowColor: 'rgba(60,20,90,0.7)', textShadowRadius: 5 },
  spark: { position: 'absolute', top: 7, left: 13 },
});
