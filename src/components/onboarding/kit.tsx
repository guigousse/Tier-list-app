import { useCallback, useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { scheduleOnRN } from 'react-native-worklets';

import { colors, radius } from '../../constants/theme';
import { play, type Sound } from '../../lib/sound';

/** Size of the pointing finger. Declared before the worklets that capture it. */
export const FINGER = 44;

/** Shared props of the welcome scenes. `once`: played to the end and held, not looped. */
export type SceneProps = { width: number; active: boolean; once?: boolean };

/** Time of the loop, from 0 to 1, replayed while the scene is shown (played once with `once`). */
export function useLoop(active: boolean, duration: number, once = false): SharedValue<number> {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    t.value = 0;
    const play = withTiming(1, { duration, easing: Easing.linear });
    t.value = once ? play : withRepeat(play, -1, false);
    return () => cancelAnimation(t);
  }, [active, duration, once, t]);
  return t;
}

/**
 * Sound effects in time with a scene: each [ms, sound] plays when the scene's clock
 * goes past it (cues at 0 never play: keep them after the start). `cues` must not
 * change between renders (a module constant, or memoized).
 */
export function useCues(t: SharedValue<number>, duration: number, cues: [number, Sound][]): void {
  const times = cues.map(([at]) => at);
  const fire = useCallback((i: number) => play(cues[i][1]), [cues]);
  useAnimatedReaction(
    () => t.value * duration,
    (now, before) => {
      // First frame, or the loop starting again: nothing was crossed.
      if (before === null || now < before) return;
      for (let i = 0; i < times.length; i++) if (times[i] > before && times[i] <= now) scheduleOnRN(fire, i);
    },
  );
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
export function fingerOffset(x: number, y: number): { x: number; y: number } {
  'worklet';
  // No default parameter reading a captured value: on the UI thread, defaults are
  // evaluated before captured values exist (it crashed the app on iOS).
  return { x: x - FINGER * 0.45, y: y - FINGER * 0.05 };
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
