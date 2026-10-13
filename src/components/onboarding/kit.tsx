import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { colors, radius } from '../../constants/theme';

/** Size of the pointing finger. Declared before the worklets that capture it. */
export const FINGER = 44;

/** Shared props of the welcome scenes. */
export type SceneProps = { width: number; active: boolean };

/** Time of the loop, from 0 to 1, replayed while the scene is shown. */
export function useLoop(active: boolean, duration: number): SharedValue<number> {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [active, duration, t]);
  return t;
}

/** Progress (0 → 1, eased) of the step running from `from` to `to` ms of a loop of `duration` ms. */
export function step(t: number, duration: number, from: number, to: number, ease: boolean = true): number {
  'worklet';
  // Plain arithmetic only: this runs on the UI thread, on every frame.
  const ms = t * duration;
  const p = ms <= from ? 0 : ms >= to ? 1 : (ms - from) / (to - from);
  if (!ease) return p;
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

/** Rounded panel holding a scene. */
export function Stage({ width, height, children, style }: { width: number; height: number; children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.shadow, { width, height, borderRadius: radius.xl }]}>
      <View style={[styles.stage, { width, height }, style]}>{children}</View>
    </View>
  );
}

/** Where to put the finger (its top-left corner) so that its tip touches (x, y). */
export function fingerOffset(x: number, y: number, size = FINGER): { x: number; y: number } {
  'worklet';
  return { x: x - size * 0.45, y: y - size * 0.05 };
}

/** A tier list card: app icon or emoji on a colour. */
export function MiniCard({ size, color, emoji, image }: { size: number; color: string; emoji: string; image?: ReactNode }) {
  return (
    <View style={[styles.card, { width: size, height: size, backgroundColor: color, borderRadius: size * 0.2 }]}>
      {image ?? <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>}
    </View>
  );
}

/** Pointing finger, with a ripple when it presses. `pressed` goes from 0 to 1. */
export function Finger({ style, pressed, size = FINGER }: { style: ViewStyle | object; pressed: SharedValue<number>; size?: number }) {
  const ripple = useAnimatedStyle(() => ({
    opacity: pressed.value * 0.22,
    transform: [{ scale: 0.4 + pressed.value * 0.5 }],
  }));
  const hand = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * 0.12 }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.finger, { width: size, height: size }, style]}>
      <Animated.View style={[styles.ripple, { width: size, height: size, borderRadius: size / 2, top: -size * 0.45, left: -size * 0.05 }, ripple]} />
      <Animated.Text style={[{ fontSize: size, lineHeight: size * 1.15 }, hand]}>👆</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    borderRadius: radius.xl,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  card: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  finger: { position: 'absolute', left: 0, top: 0, zIndex: 10 },
  ripple: { position: 'absolute', backgroundColor: '#FFFFFF' },
});
