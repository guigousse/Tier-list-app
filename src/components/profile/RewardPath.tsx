import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, radius, spacing } from '../../constants/theme';
import type { AvatarConfig } from '../../lib/avatar';
import type { Badge, Fork } from '../../lib/badges';
import { PART_LABELS, stretchFill, withReward, type Milestone } from '../../lib/rewards';
import { playPop } from '../../lib/sound';
import { useTierStore } from '../../store/useTierStore';
import { AvatarDrawing } from '../Avatar';
import { BadgeIcon } from '../BadgeIcon';
import { Clickable } from '../Clickable';
import { Sheet } from '../ui';

const ROW = 112;
const NODE = 52;
const TOP = NODE / 2 + 8;
const PREVIEW = 62;
const STICKER = 64;
/** Room for a sticker and its label under it. */
const STICKER_BOX = 104;
/** How long the losing sticker takes to pop. */
const POP_MS = 420;

type Point = { x: number; y: number };

/** Cubic from `a` up to `b`, leaving and arriving vertically. */
function stretch(a: Point, b: Point): [Point, Point, Point, Point] {
  return [a, { x: a.x, y: a.y - ROW / 2 }, { x: b.x, y: b.y + ROW / 2 }, b];
}

/** The first `t` (0 → 1) of a cubic, as an SVG path (de Casteljau). */
function partial([p0, p1, p2, p3]: [Point, Point, Point, Point], t: number): string {
  const lerp = (a: Point, b: Point) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const q0 = lerp(p0, p1);
  const q1 = lerp(p1, p2);
  const r0 = lerp(q0, q1);
  const end = lerp(r0, lerp(q1, lerp(p2, p3)));
  return `M${p0.x} ${p0.y} C${q0.x} ${q0.y} ${r0.x} ${r0.y} ${end.x} ${end.y}`;
}

const THEMES = {
  green: { from: '#7BE495', to: '#2EAD6B', node: '#2EAD6B' },
  orange: { from: '#FFC24B', to: '#FF5A1F', node: '#FF7A1F' },
};

type Row = { at: number; x: number; y: number; step?: Milestone; fork?: Fork };

/** One bit of the burst of a popping sticker, flying out at `angle`. */
function Shard({ angle, color, progress }: { angle: number; color: string; progress: { value: number } }) {
  const style = useAnimatedStyle(() => {
    const d = 10 + progress.value * 34;
    return {
      opacity: progress.value < 0.15 ? progress.value / 0.15 : 1 - progress.value,
      transform: [{ translateX: Math.cos(angle) * d }, { translateY: Math.sin(angle) * d }, { scale: 1 - progress.value * 0.6 }],
    };
  });
  return <Animated.View pointerEvents="none" style={[styles.shard, { backgroundColor: color }, style]} />;
}

const SHARDS = Array.from({ length: 9 }, (_, i) => (Math.PI * 2 * i) / 9 + 0.3);

/**
 * A badge on one side of a VS circle. While the player can choose it wiggles; once
 * the other side is chosen it pops (bigger, gone, with a burst) and disappears.
 */
function ForkSticker({
  badge,
  side,
  locked,
  mine,
  popping,
  wiggle,
  onPress,
}: {
  badge: Badge;
  side: 0 | 1;
  locked: boolean;
  mine: boolean;
  popping: boolean;
  wiggle: { value: number } | null;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const burst = useSharedValue(0);
  useEffect(() => {
    if (!popping) return;
    scale.value = withSequence(withTiming(1.3, { duration: 110 }), withTiming(0.1, { duration: 130 }));
    opacity.value = withDelay(140, withTiming(0, { duration: 100 }));
    burst.value = withDelay(150, withTiming(1, { duration: POP_MS - 150, easing: Easing.out(Easing.quad) }));
  }, [popping, scale, opacity, burst]);
  const direction = side === 0 ? 1 : -1;
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value * (mine ? 1.05 : 1) }, { rotate: `${wiggle ? (wiggle.value * 2 - 1) * 7 * direction : 0}deg` }],
  }));

  return (
    <Clickable
      accessibilityRole="button"
      accessibilityLabel={`${badge.label}${mine ? ', votre camp' : locked ? ', à débloquer' : ''}`}
      onPress={onPress}
      disabled={popping}
      style={styles.stickerBox}
    >
      <View style={styles.stickerArt}>
        {popping ? SHARDS.map((a, k) => <Shard key={a} angle={a} color={k % 2 ? '#FFFFFF' : badge.glow} progress={burst} />) : null}
        <Animated.View style={style}>
          <BadgeIcon badge={badge} size={STICKER} state={locked ? 'locked' : undefined} />
        </Animated.View>
      </View>
      {!popping ? (
        <View style={[styles.stickerLabel, mine && styles.stickerLabelMine]}>
          {mine ? <Ionicons name="checkmark" size={11} color="#FFFFFF" /> : null}
          <Text numberOfLines={1} style={[styles.stickerLabelText, mine && { color: '#FFFFFF' }]}>
            {badge.label}
          </Text>
        </View>
      ) : null}
    </Clickable>
  );
}

/**
 * A reward path, going up: numbered circles linked by a winding road that fills up
 * with the player's progress, each with a preview of the avatar item it unlocks.
 * At a fork the number gives way to a VS between two badges: the player picks one
 * ("Sûr ?"), the other pops and is gone for good. `glow`: the filled road and the
 * circles reached glow like embers.
 */
export function RewardPath({
  steps,
  forks = [],
  choices = {},
  onChoose,
  value,
  won,
  theme,
  glow = false,
  avatar,
  unit,
  onCurrent,
}: {
  steps: Milestone[];
  forks?: Fork[];
  /** Badge chosen at each fork (fork id → badge id). */
  choices?: Record<string, string>;
  onChoose?: (fork: Fork, badge: Badge) => void;
  /** Where the road is filled up to. */
  value: number;
  /** Rewards up to this step are the player's (can be above `value` for the flame). */
  won: number;
  theme: keyof typeof THEMES;
  glow?: boolean;
  avatar: AvatarConfig;
  /** "liste" / "jour", for labels. */
  unit: string;
  /** Distance from the bottom of the path to the player's next step, to scroll there. */
  onCurrent?: (fromBottom: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const [open, setOpen] = useState<Milestone | null>(null);
  /** The sticker asking "Sûr ?". */
  const [asking, setAsking] = useState<{ fork: string; side: 0 | 1 } | null>(null);
  /** The sticker popping after the other side was chosen. */
  const [popping, setPopping] = useState<{ fork: string; side: 0 | 1 } | null>(null);
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(popTimer.current ?? undefined), []);
  const t = THEMES[theme];

  const height = TOP * 2 + (steps.length + forks.length) * ROW;
  // A start point (0) at the bottom, then every step going up, winding left and
  // right; forks stay in the middle, with a sticker on each side.
  const rows = useMemo<Row[]>(() => {
    const amplitude = Math.min(90, width * 0.22);
    const entries = [...steps.map((step) => ({ at: step.at, step })), ...forks.map((fork) => ({ at: fork.at, fork }))].sort((a, b) => a.at - b.at);
    let turn = 0;
    return [{ at: 0 }, ...entries].map((e, i) => ({
      ...e,
      y: height - TOP - i * ROW,
      x: 'fork' in e ? width / 2 : width / 2 + Math.sin((turn++ * Math.PI) / 2) * amplitude,
    }));
  }, [steps, forks, width, height]);

  /** Side chosen at a fork row, if any. */
  const chosen = (row: Row) => (row.fork && choices[row.fork.id] ? row.fork.options.findIndex((o) => o.id === choices[row.fork!.id]) : -1);

  const road = rows.slice(1).map((b, i) => ({ curve: stretch(rows[i], b), fill: stretchFill(value, rows[i].at, b.at) }));
  const roadD = road.map((s) => partial(s.curve, 1)).join(' ');
  const filledD = road
    .filter((s) => s.fill > 0)
    .map((s) => partial(s.curve, s.fill))
    .join(' ');

  // Embers (flame path) and badges waiting to be chosen: the glow breathes.
  const breath = useSharedValue(0);
  const waiting = rows.some((r) => r.fork && value >= r.at && chosen(r) === -1);
  useEffect(() => {
    if (glow || waiting) breath.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [glow, waiting, breath]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.35 + breath.value * 0.55 }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * 0.1 }], opacity: 0.12 + breath.value * 0.3 }));
  const vsStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * 0.14 }] }));
  const vsHalo = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * 0.35 }], opacity: 0.55 - breath.value * 0.45 }));

  const nextIndex = rows.findIndex((r) => r.at > value);
  // A badge to choose first, else the next step.
  const pick = rows.findIndex((r) => r.fork && value >= r.at && chosen(r) === -1);
  const focus = pick !== -1 ? pick : nextIndex === -1 ? rows.length - 1 : nextIndex;
  const focusY = rows[focus]?.y ?? 0;
  useEffect(() => {
    if (width > 0) onCurrent?.(height - focusY);
  }, [width, height, focusY, onCurrent]);

  const tapSticker = (fork: Fork, side: 0 | 1) => {
    if (value < fork.at) {
      Alert.alert(
        `${fork.options[0].label} ou ${fork.options[1].label} ?`,
        `Au palier ${fork.at}, choisissez votre camp. L’autre badge disparaîtra pour toujours !`,
      );
      return;
    }
    setAsking((a) => (a?.fork === fork.id && a.side === side ? null : { fork: fork.id, side }));
  };

  const confirm = (fork: Fork, side: 0 | 1) => {
    setAsking(null);
    setPopping({ fork: fork.id, side: side === 0 ? 1 : 0 });
    onChoose?.(fork, fork.options[side]);
    playPop();
    if (useTierStore.getState().settings.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    clearTimeout(popTimer.current ?? undefined);
    popTimer.current = setTimeout(() => setPopping(null), POP_MS + 80);
  };

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={`fill-${theme}`} x1="0" y1={height} x2="0" y2="0" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={t.from} />
                <Stop offset="1" stopColor={t.to} />
              </LinearGradient>
            </Defs>
            <Path d={roadD} stroke={colors.surfaceAlt} strokeWidth={8} strokeLinecap="round" fill="none" />
            <Path d={roadD} stroke={colors.border} strokeWidth={1.5} strokeDasharray="1.5 8" strokeLinecap="round" fill="none" />
            {filledD ? <Path d={filledD} stroke={`url(#fill-${theme})`} strokeWidth={8} strokeLinecap="round" fill="none" /> : null}
          </Svg>
          {glow && filledD ? (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glowStyle]}>
              <Svg width={width} height={height}>
                <Path d={filledD} stroke="#FF8A3D" strokeOpacity={0.35} strokeWidth={20} strokeLinecap="round" fill="none" />
                <Path d={filledD} stroke="#FFE08A" strokeOpacity={0.8} strokeWidth={2.5} strokeLinecap="round" fill="none" />
              </Svg>
            </Animated.View>
          ) : null}

          {rows.map((row, i) => {
            const reached = value >= row.at;
            const fork = row.fork;
            const current = i === nextIndex;

            if (fork) {
              const choice = chosen(row);
              const toPick = reached && choice === -1;
              return (
                <View key={`fork-${fork.id}`} style={StyleSheet.absoluteFill} pointerEvents="box-none">
                  <View style={[styles.nodeWrap, { top: row.y - NODE / 2, left: row.x - NODE / 2 }]}>
                    {toPick ? <Animated.View pointerEvents="none" style={[styles.halo, { backgroundColor: '#FF5A1F' }, vsHalo]} /> : null}
                    <Animated.View
                      style={[
                        styles.node,
                        reached ? { backgroundColor: t.node, borderColor: t.from } : current ? { borderColor: t.node, borderWidth: 3 } : null,
                        toPick && styles.vsLive,
                        toPick && vsStyle,
                      ]}
                    >
                      <Text style={[styles.vsText, !reached && { color: colors.textMuted }]}>VS</Text>
                    </Animated.View>
                  </View>

                  {fork.options.map((badge, n) => {
                    const side = n as 0 | 1;
                    const isPopping = popping?.fork === fork.id && popping.side === side;
                    // The side given up is gone, once its pop is over.
                    if (choice !== -1 && choice !== side && !isPopping) return null;
                    const left = side === 0 ? row.x - NODE / 2 - spacing.sm - STICKER_BOX : row.x + NODE / 2 + spacing.sm;
                    const isAsking = asking?.fork === fork.id && asking.side === side;
                    return (
                      <View key={badge.id} style={[styles.stickerSlot, { top: row.y - STICKER / 2 - 4, left }]} pointerEvents="box-none">
                        <ForkSticker
                          badge={badge}
                          side={side}
                          locked={!reached}
                          mine={choice === side}
                          popping={isPopping}
                          wiggle={toPick ? breath : null}
                          onPress={() => (choice === -1 ? tapSticker(fork, side) : undefined)}
                        />
                        {isAsking ? (
                          <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.askWrap}>
                            <Clickable
                              accessibilityRole="button"
                              accessibilityLabel={`Sûr ? Choisir ${badge.label}`}
                              onPress={() => confirm(fork, side)}
                              style={({ pressed }) => [styles.ask, { backgroundColor: t.node }, pressed && { opacity: 0.85 }]}
                            >
                              <Text style={styles.askText}>Sûr ?</Text>
                              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                            </Clickable>
                            <View style={[styles.askTail, { borderTopColor: t.node }]} />
                          </Animated.View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              );
            }

            const x = row.x;
            const step = row.step ?? null;
            const owned = step ? won >= step.at : false;
            const left = x <= width / 2;
            // The preview sits on the roomier side of the circle.
            const room = left ? width - x - NODE / 2 - spacing.md : x - NODE / 2 - spacing.md;
            const previewWidth = Math.min(170, room);
            return (
              <View key={row.at} style={StyleSheet.absoluteFill} pointerEvents="box-none">
                <View style={[styles.nodeWrap, { top: row.y - NODE / 2, left: x - NODE / 2 }]}>
                  {glow && reached && i > 0 ? <Animated.View pointerEvents="none" style={[styles.halo, { backgroundColor: t.node }, pulseStyle]} /> : null}
                  <View style={[styles.node, reached ? { backgroundColor: t.node, borderColor: t.from } : current ? { borderColor: t.node, borderWidth: 3 } : null]}>
                    {i === 0 ? (
                      <Ionicons name={theme === 'orange' ? 'flame' : 'flag'} size={22} color={reached ? '#FFFFFF' : colors.textMuted} />
                    ) : (
                      <Text style={[styles.nodeText, reached && { color: '#FFFFFF' }, row.at >= 100 && { fontSize: 15 }]}>{row.at}</Text>
                    )}
                  </View>
                </View>

                {step ? (
                  <Clickable
                    accessibilityRole="button"
                    accessibilityLabel={`${row.at} ${unit}${row.at > 1 ? 's' : ''} : ${step.rewards.map((r) => r.label).join(', ')}${owned ? ', obtenu' : ', à débloquer'}`}
                    onPress={() => setOpen(step)}
                    style={({ pressed }) => [
                      styles.preview,
                      { top: row.y - PREVIEW / 2, width: previewWidth },
                      left ? { left: x + NODE / 2 + spacing.md } : { left: x - NODE / 2 - spacing.md - previewWidth },
                      !owned && styles.previewLocked,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <View>
                      <AvatarDrawing config={withReward(avatar, step.rewards[0])} size={46} />
                      {!owned ? (
                        <View style={styles.lock}>
                          <Ionicons name="lock-closed" size={11} color="#FFFFFF" />
                        </View>
                      ) : null}
                    </View>
                    <View style={{ flexShrink: 1 }}>
                      <Text numberOfLines={1} style={styles.previewTitle}>
                        {step.rewards[0].label}
                      </Text>
                      <Text numberOfLines={1} style={styles.previewMeta}>
                        {step.rewards.length > 1 ? `+ ${step.rewards.length - 1} autre${step.rewards.length > 2 ? 's' : ''}` : PART_LABELS[step.rewards[0].part]}
                      </Text>
                    </View>
                  </Clickable>
                ) : null}
              </View>
            );
          })}
        </>
      ) : null}

      <Sheet visible={open !== null} onClose={() => setOpen(null)} title={open ? `Palier ${open.at}` : ''}>
        {open ? (
          <View style={{ gap: spacing.md }}>
            <Text style={styles.sheetHint}>
              {won >= open.at ? 'Débloqué ! Retrouvez ces éléments dans l’éditeur d’avatar.' : `À débloquer : ${open.at} ${unit}${open.at > 1 ? 's' : ''}.`}
            </Text>
            <View style={styles.sheetGrid}>
              {open.rewards.map((r) => (
                <View key={`${r.part}-${r.id}`} style={styles.sheetItem}>
                  <AvatarDrawing config={withReward(avatar, r)} size={72} />
                  <Text numberOfLines={1} style={styles.previewTitle}>
                    {r.label}
                  </Text>
                  <Text numberOfLines={1} style={styles.previewMeta}>
                    {PART_LABELS[r.part]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  nodeWrap: { position: 'absolute', width: NODE, height: NODE, alignItems: 'center', justifyContent: 'center' },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: { position: 'absolute', width: NODE + 14, height: NODE + 14, borderRadius: (NODE + 14) / 2 },
  nodeText: { color: colors.textMuted, fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'] },
  vsLive: { backgroundColor: '#FF5A1F', borderColor: '#FFC24B' },
  vsText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  stickerSlot: { position: 'absolute', width: STICKER_BOX, alignItems: 'center' },
  stickerBox: { width: STICKER_BOX, alignItems: 'center', gap: 2 },
  stickerArt: { width: STICKER, height: STICKER, alignItems: 'center', justifyContent: 'center' },
  stickerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: STICKER_BOX,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stickerLabelMine: { backgroundColor: '#2EAD6B', borderColor: '#7BE495' },
  stickerLabelText: { flexShrink: 1, color: colors.text, fontSize: 11, fontWeight: '700' },
  shard: { position: 'absolute', width: 9, height: 9, borderRadius: 4.5 },
  askWrap: { position: 'absolute', bottom: STICKER + 10, alignItems: 'center' },
  ask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  askText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  askTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  preview: {
    position: 'absolute',
    height: PREVIEW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewLocked: { opacity: 0.55 },
  lock: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2D3047',
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  previewMeta: { color: colors.textMuted, fontSize: 11 },
  sheetHint: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  sheetItem: { width: 96, alignItems: 'center', gap: 4 },
});
