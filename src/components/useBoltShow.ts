import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import type { View } from 'react-native';
import { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { BURST, coinTimes, counterAt } from '../lib/celebration';
import { playCoin, playThunder } from '../lib/sound';

type Point = { x: number; y: number };
export type BoltShow = { from: number; to: number; key: number };

/**
 * Energy credited on a page: thunder, bolts from `source()` to the balance counter, coins
 * ringing while the counter counts up. Shared by the shop (a pack bought) and the free
 * energy page (a referral pot collected), so both feel the same. `root` is the page's
 * outer view, over which <PurchaseBurst> is laid; `shown` is the counter's value while it
 * runs (null otherwise).
 */
export function useBoltShow(show: BoltShow | null, source: () => View | null | undefined, onDone: () => void) {
  const root = useRef<View>(null);
  const counter = useRef<View>(null);
  const [burst, setBurst] = useState<{ from: Point; to: Point; key: number } | null>(null);
  const [shown, setShown] = useState<number | null>(null);
  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  // Read when the show starts, not a reason to restart it.
  const latest = useRef({ source, onDone });
  // Declared before the show's effect, so it runs first with this render's callbacks.
  useEffect(() => {
    latest.current = { source, onDone };
  });

  useEffect(() => {
    if (!show) return;
    const { from, to, key } = show;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let frame = 0;
    // Window coordinates, made relative to the overlay laid over the whole page.
    const art = latest.current.source();
    root.current?.measureInWindow((rx, ry) => {
      art?.measureInWindow((ax, ay, aw, ah) => {
        counter.current?.measureInWindow((cx, cy, _cw, ch) => {
          setBurst({ from: { x: ax - rx + aw / 2, y: ay - ry + ah / 2 }, to: { x: cx - rx + 14, y: cy - ry + ch / 2 }, key });
        });
      });
    });
    playThunder();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    for (const at of coinTimes()) {
      timers.push(
        setTimeout(() => {
          playCoin();
          Haptics.selectionAsync().catch(() => {});
        }, at),
      );
    }
    timers.push(
      setTimeout(() => {
        pulse.value = withSequence(withTiming(1.18, { duration: 120 }), withSpring(1));
        const start = Date.now();
        const tick = () => {
          const progress = (Date.now() - start) / BURST.count;
          setShown(counterAt(from, to, progress));
          if (progress < 1) frame = requestAnimationFrame(tick);
          else pulse.value = withSequence(withTiming(1.25, { duration: 140 }), withSpring(1));
        };
        frame = requestAnimationFrame(tick);
      }, BURST.arrive),
    );
    timers.push(
      setTimeout(() => {
        setBurst(null);
        setShown(null);
        latest.current.onDone();
      }, BURST.arrive + BURST.count + 600),
    );
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
    };
  }, [show, pulse]);

  return { root, counter, burst, shown, pulseStyle };
}
