import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { CARD_COLORS, colors, TIER_COLORS } from '../../constants/theme';
import { Finger, fingerOffset, MiniCard, Stage, step, useLoop, type SceneProps } from './kit';
import type { ReactNode } from 'react';

type Props = SceneProps & { height: number };

/** Mini tier list rows (labels and colours given), drawn from `top`. */
function Rows({ top, rowH, labelW, children }: { top: number; rowH: number; labelW: number; children: (i: number) => ReactNode }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.row, { top: top + i * (rowH + 2), height: rowH }]}>
          <View style={{ width: labelW }}>{children(i)}</View>
        </View>
      ))}
    </>
  );
}

/** Pops in (0 → 1.15 → 1) between `from` and `to` ms. */
function pop(t: number, duration: number, from: number, to: number): number {
  'worklet';
  const p = step(t, duration, from, to, false);
  return interpolate(p, [0, 0.7, 1], [0, 1.15, 1]);
}

const CREATE_CARDS = ['🍕', '🍣', '🍔', '🌮', '🍩'];
const CREATE_DURATION = 6500;

/** Creation: a finger taps « Ajouter » and new cards pop into the list. */
export function CreateScene({ width: W, height: H, active }: Props) {
  const t = useLoop(active, CREATE_DURATION);
  const rowH = Math.round(W * 0.14);
  const c = rowH - 8;
  const top = 58;
  const poolY = top + 5 * (rowH + 2) + 32;
  const btn = { x: W / 2, y: H - 34 };
  const taps = CREATE_CARDS.map((_, i) => 800 + i * 800);

  const pressed = useDerivedValue(() =>
    taps.reduce((sum, at) => sum + step(t.value, CREATE_DURATION, at, at + 120) - step(t.value, CREATE_DURATION, at + 160, at + 300), 0),
  );
  const fingerStyle = useAnimatedStyle(() => {
    const enter = step(t.value, CREATE_DURATION, 200, 750);
    const leave = step(t.value, CREATE_DURATION, 4900, 5500);
    const o = fingerOffset(btn.x + (1 - enter) * 60 + leave * 80, btn.y + (1 - enter) * 120 + leave * 120);
    return { opacity: enter - leave, transform: [{ translateX: o.x }, { translateY: o.y }] };
  });
  const fade = useAnimatedStyle(() => ({ opacity: 1 - step(t.value, CREATE_DURATION, 5800, 6300) }));

  return (
    <Stage width={W} height={H}>
      <Animated.View style={[StyleSheet.absoluteFill, fade]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Mes plats préférés</Text>
          <Ionicons name="pencil" size={14} color={colors.textMuted} />
        </View>
        <Rows top={top} rowH={rowH} labelW={rowH}>
          {(i) => (
            <View style={[styles.label, { backgroundColor: TIER_COLORS[i] }]}>
              <Text style={[styles.labelText, { fontSize: rowH * 0.4 }]}>{'SABCD'[i]}</Text>
            </View>
          )}
        </Rows>
        <Text style={[styles.poolText, { top: poolY - 24 }]}>À classer</Text>
        {CREATE_CARDS.map((emoji, i) => (
          <PopCard key={emoji} t={t} at={taps[i] + 200} left={12 + i * (c + 6)} top={poolY} size={c} color={CARD_COLORS[i]} emoji={emoji} />
        ))}
      </Animated.View>
      <View style={[styles.addButton, { top: btn.y - 21 }]}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.addText}>Ajouter une carte</Text>
      </View>
      <Finger pressed={pressed} style={fingerStyle} />
    </Stage>
  );
}

function PopCard({ t, at, left, top, size, color, emoji }: { t: SharedValue<number>; at: number; left: number; top: number; size: number; color: string; emoji: string }) {
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop(t.value, CREATE_DURATION, at, at + 400) }] }));
  return (
    <Animated.View style={[styles.abs, { left, top }, style]}>
      <MiniCard size={size} color={color} emoji={emoji} />
    </Animated.View>
  );
}

const CUSTOM_LABELS = ['🔥 Top', '😍 Bien', '🙂 Ok', '😐 Bof', '🤢 Beurk'];
const CUSTOM_COLORS = ['#7C5CFF', '#9B7BFF', '#5AA9FF', '#4CC9C0', '#8A93A6'];
const TIER_CARDS = [['🍓', '🥭'], ['🍒', '🍑', '🍉'], ['🍎'], ['🍌'], ['🍋']];
const TIERS_DURATION = 6000;

/** Customisation: the tiers change names and colours, then come back. */
export function TiersScene({ width: W, height: H, active }: Props) {
  const t = useLoop(active, TIERS_DURATION);
  const rowH = Math.round(H / 7.4);
  const labelW = Math.round(W * 0.3);
  const c = rowH - 8;
  const top = 58;
  const mix = useDerivedValue(() => step(t.value, TIERS_DURATION, 1200, 2000) - step(t.value, TIERS_DURATION, 4200, 5000));

  return (
    <Stage width={W} height={H}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Fruits</Text>
        <Ionicons name="color-palette-outline" size={16} color={colors.textMuted} />
      </View>
      <Rows top={top} rowH={rowH} labelW={labelW}>
        {(i) => <TierLabel mix={mix} i={i} rowH={rowH} />}
      </Rows>
      {TIER_CARDS.flatMap((row, i) =>
        row.map((emoji, j) => (
          <View key={emoji} style={[styles.abs, { left: labelW + 4 + j * (c + 4), top: top + i * (rowH + 2) + 4 }]}>
            <MiniCard size={c} color={CARD_COLORS[(i + j) % CARD_COLORS.length]} emoji={emoji} />
          </View>
        )),
      )}
    </Stage>
  );
}

function TierLabel({ mix, i, rowH }: { mix: SharedValue<number>; i: number; rowH: number }) {
  const bg = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(mix.value, [0, 1], [TIER_COLORS[i], CUSTOM_COLORS[i]]) }));
  const classic = useAnimatedStyle(() => ({ opacity: 1 - mix.value, transform: [{ translateY: -mix.value * 10 }] }));
  const custom = useAnimatedStyle(() => ({ opacity: mix.value, transform: [{ translateY: (1 - mix.value) * 10 }] }));
  return (
    <Animated.View style={[styles.label, bg]}>
      <Animated.Text style={[styles.labelText, styles.absCenter, { fontSize: rowH * 0.4 }, classic]}>{'SABCD'[i]}</Animated.Text>
      <Animated.Text numberOfLines={1} style={[styles.customText, styles.absCenter, custom]}>
        {CUSTOM_LABELS[i]}
      </Animated.Text>
    </Animated.View>
  );
}

const DAILY_DURATION = 5000;
const WEEK = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Daily tier list: the coloured card with its shine, and the streak filling up. */
export function DailyScene({ width: W, height: H, active }: Props) {
  const t = useLoop(active, DAILY_DURATION);
  const shine = useAnimatedStyle(() => ({
    transform: [{ translateX: -120 + step(t.value, DAILY_DURATION, 300, 1300) * (W + 160) }, { skewX: '-20deg' }],
  }));
  const flame = useAnimatedStyle(() => {
    const p = step(t.value, DAILY_DURATION, 3300, 3700, false);
    return { transform: [{ scale: 1 + Math.sin(p * Math.PI) * 0.25 }] };
  });
  return (
    <Stage width={W} height={H} style={{ padding: 16, gap: 22, justifyContent: 'center' }}>
      <LinearGradient colors={['#7C5CFF', '#B45CFF', '#FF7FB0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.daily}>
        <Text style={styles.dailyEmoji}>🍕</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.dailyKicker}>TIER LIST DU JOUR</Text>
          <Text style={styles.dailyTitle}>Garnitures de pizza</Text>
        </View>
        <View style={styles.dailyArrow}>
          <Ionicons name="arrow-forward" size={20} color="#7C5CFF" />
        </View>
        <Animated.View style={[styles.shine, shine]} />
      </LinearGradient>
      <View style={styles.week}>
        {WEEK.map((d, i) => (
          <DayDot key={i} t={t} i={i} label={d} />
        ))}
      </View>
      <Animated.View style={[styles.streak, flame]}>
        <Text style={styles.streakText}>🔥 7 jours de suite</Text>
      </Animated.View>
    </Stage>
  );
}

function DayDot({ t, i, label }: { t: SharedValue<number>; i: number; label: string }) {
  const at = 1300 + i * 280;
  const fill = useAnimatedStyle(() => ({ opacity: step(t.value, DAILY_DURATION, at, at + 200), transform: [{ scale: pop(t.value, DAILY_DURATION, at, at + 300) }] }));
  return (
    <View style={styles.dayCol}>
      <View style={styles.dot}>
        <Animated.View style={[styles.dotFill, fill]}>
          <Ionicons name="checkmark" size={16} color="#fff" />
        </Animated.View>
      </View>
      <Text style={styles.dayLabel}>{label}</Text>
    </View>
  );
}

const CODE = 'K7F3QX';
const SHARE_DURATION = 5500;

/** Sharing: the code appears letter by letter, a finger copies it. */
export function ShareScene({ width: W, height: H, active }: Props) {
  const t = useLoop(active, SHARE_DURATION);
  const btnTop = Math.round(H * 0.56);
  const btn = { x: W / 2, y: btnTop + 23 };
  const pressed = useDerivedValue(() => step(t.value, SHARE_DURATION, 2700, 2820) - step(t.value, SHARE_DURATION, 2860, 3000));
  const fingerStyle = useAnimatedStyle(() => {
    const enter = step(t.value, SHARE_DURATION, 1800, 2600);
    const leave = step(t.value, SHARE_DURATION, 3300, 3900);
    const o = fingerOffset(btn.x + (1 - enter) * 70 + leave * 90, btn.y + (1 - enter) * 140 + leave * 140);
    return { opacity: enter - leave, transform: [{ translateX: o.x }, { translateY: o.y }] };
  });
  const toast = useAnimatedStyle(() => {
    const p = step(t.value, SHARE_DURATION, 3000, 3300) - step(t.value, SHARE_DURATION, 4700, 5000);
    return { opacity: p, transform: [{ translateY: (1 - p) * 16 }] };
  });
  return (
    <Stage width={W} height={H}>
      <View style={[styles.codeBox, { top: Math.round(H * 0.16) }]}>
        <Text style={styles.codeLabel}>CODE DE LA TIER LIST</Text>
        <View style={styles.codeRow}>
          {CODE.split('').map((ch, i) => (
            <CodeChar key={i} t={t} i={i} ch={ch} />
          ))}
        </View>
        <Text style={styles.codeHint}>Vos amis l’ouvrent en un instant</Text>
      </View>
      <View style={[styles.copyButton, { top: btnTop }]}>
        <Ionicons name="copy-outline" size={18} color="#fff" />
        <Text style={styles.addText}>Copier le code</Text>
      </View>
      <Animated.View style={[styles.toast, { top: btnTop + 70, left: W / 2 - 75, width: 150 }, toast]}>
        <Ionicons name="checkmark-circle" size={18} color="#2EAD6B" />
        <Text style={styles.toastText}>Code copié</Text>
      </Animated.View>
      <Finger pressed={pressed} style={fingerStyle} />
    </Stage>
  );
}

function CodeChar({ t, i, ch }: { t: SharedValue<number>; i: number; ch: string }) {
  const at = 300 + i * 180;
  const style = useAnimatedStyle(() => {
    const p = step(t.value, SHARE_DURATION, at, at + 250) - step(t.value, SHARE_DURATION, 5100, 5400);
    return { opacity: p, transform: [{ translateY: (1 - p) * -14 }] };
  });
  return <Animated.Text style={[styles.codeChar, i === 3 && { marginLeft: 14 }, style]}>{ch}</Animated.Text>;
}

const styles = StyleSheet.create({
  abs: { position: 'absolute', left: 0, top: 0 },
  absCenter: { position: 'absolute', left: 4, right: 4, textAlign: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingTop: 18 },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  row: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', backgroundColor: colors.surface },
  label: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  labelText: { fontWeight: '900', color: '#111' },
  customText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  poolText: { position: 'absolute', left: 12, color: colors.text, fontSize: 13, fontWeight: '700' },
  addButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
  },
  addText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  daily: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, overflow: 'hidden' },
  dailyEmoji: { fontSize: 34 },
  dailyKicker: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  dailyTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  dailyArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shine: { position: 'absolute', top: -20, bottom: -20, width: 60, backgroundColor: 'rgba(255,255,255,0.35)' },
  week: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  dayCol: { alignItems: 'center', gap: 6 },
  dot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  dotFill: { flex: 1, backgroundColor: '#FF8A3D', alignItems: 'center', justifyContent: 'center' },
  dayLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  streak: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,138,61,0.15)' },
  streakText: { color: '#FFB36B', fontSize: 16, fontWeight: '800' },
  codeBox: { position: 'absolute', left: 16, right: 16, alignItems: 'center', gap: 8, backgroundColor: colors.surfaceAlt, borderRadius: 18, padding: 18 },
  codeLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  codeRow: { flexDirection: 'row', gap: 2 },
  codeChar: { color: colors.text, fontSize: 38, fontWeight: '900', width: 28, textAlign: 'center' },
  codeHint: { color: colors.textMuted, fontSize: 13 },
  copyButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
  },
  toast: {
    position: 'absolute',
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
  },
  toastText: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
