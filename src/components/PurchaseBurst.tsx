import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { BURST } from '../lib/celebration';
import { EnergyIcon } from './Energy';

type Point = { x: number; y: number };

const BOLT = 34;

/**
 * A pack just bought: a flash over the screen, then bolts flying from the pack to the
 * balance (`from` and `to` in this overlay's coordinates). Each bolt takes its own arc,
 * so they arrive as a stream rather than one line; they shrink as they reach the
 * counter, which they seem to fill.
 */
export function PurchaseBurst({ from, to }: { from: Point; to: Point }) {
  const flash = useSharedValue(0);
  useEffect(() => {
    flash.value = withSequence(withTiming(0.55, { duration: 70 }), withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) }));
  }, [flash]);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
      {Array.from({ length: BURST.bolts }, (_, i) => (
        <FlyingBolt key={i} index={i} from={from} to={to} />
      ))}
    </View>
  );
}

function FlyingBolt({ index, from, to }: { index: number; from: Point; to: Point }) {
  const p = useSharedValue(0);
  // Spread left and right of the straight line in turn, wider for the first ones.
  const side = (index % 2 ? 1 : -1) * (60 + ((index * 37) % 70));
  const lift = 40 + ((index * 53) % 60);
  useEffect(() => {
    p.value = withDelay(index * BURST.stagger, withTiming(1, { duration: BURST.flight, easing: Easing.in(Easing.quad) }));
  }, [p, index]);
  const style = useAnimatedStyle(() => {
    const arc = Math.sin(Math.PI * p.value);
    return {
      opacity: p.value === 0 ? 0 : p.value > 0.92 ? (1 - p.value) / 0.08 : 1,
      transform: [
        { translateX: from.x + (to.x - from.x) * p.value + side * arc - BOLT / 2 },
        { translateY: from.y + (to.y - from.y) * p.value - lift * arc - BOLT / 2 },
        { scale: 1.3 - 0.7 * p.value },
        { rotate: `${(index % 2 ? 1 : -1) * 25 * (1 - p.value)}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[styles.bolt, style]}>
      <EnergyIcon size={BOLT} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flash: { backgroundColor: '#FFF3B0' },
  bolt: { position: 'absolute', left: 0, top: 0 },
});
