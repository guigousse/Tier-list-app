import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';

import { colors, radius, spacing } from '../../constants/theme';
import { MANNEQUIN } from '../../lib/avatar';
import type { Badge, Fork } from '../../lib/badges';
import { lineFill, PART_LABELS, withReward, type Milestone, type Reward } from '../../lib/rewards';
import { playPop } from '../../lib/sound';
import { useTierStore } from '../../store/useTierStore';
import { AvatarDrawing } from '../Avatar';
import { BadgeIcon } from '../BadgeIcon';
import { Clickable } from '../Clickable';
import { EnergyIcon } from '../Energy';
import { Sheet } from '../ui';

/** Width of a step's column, of a VS's (two stickers side by side) and of the start. */
const COL = 92;
const FORK_COL = 150;
const START_COL = 60;
const NODE = 44;
/** Room above the line for a reward card or a VS's stickers. */
const ABOVE = 104;
const GAP = 12;
const PAD = 10;
const LINE_Y = PAD + ABOVE + GAP + NODE / 2;
// Below the line, room for the halo of a VS waiting to be chosen (it breathes up to 1.35×).
const HEIGHT = LINE_Y + NODE / 2 + 22;
const LINE = 8;
const MANNEQUIN_SIZE = 56;
const STICKER = 52;
const STICKER_BOX = 72;
/** How long the losing sticker takes to pop. */
const POP_MS = 420;

const THEMES = {
  green: { from: '#7BE495', to: '#2EAD6B', node: '#2EAD6B' },
  orange: { from: '#FFC24B', to: '#FF5A1F', node: '#FF7A1F' },
};

type Column = { at: number; x: number; step?: Milestone; fork?: Fork };

/** One bit of the burst of a popping sticker, flying out at `angle`. */
function Shard({ angle, color, progress }: { angle: number; color: string; progress: { value: number } }) {
  const style = useAnimatedStyle(() => {
    const d = 10 + progress.value * 30;
    return {
      opacity: progress.value < 0.15 ? progress.value / 0.15 : 1 - progress.value,
      transform: [{ translateX: Math.cos(angle) * d }, { translateY: Math.sin(angle) * d }, { scale: 1 - progress.value * 0.6 }],
    };
  });
  return <Animated.View pointerEvents="none" style={[styles.shard, { backgroundColor: color }, style]} />;
}

const SHARDS = Array.from({ length: 9 }, (_, i) => (Math.PI * 2 * i) / 9 + 0.3);

/**
 * A badge of a VS, side by side with the other above the line. While the player can
 * choose it wiggles; tapped, its label turns into "Sûr ?"; once the other side is
 * chosen it pops (bigger, gone, with a burst) and disappears.
 */
function ForkSticker({
  badge,
  side,
  locked,
  mine,
  popping,
  asking,
  color,
  wiggle,
  onPress,
  onConfirm,
}: {
  badge: Badge;
  side: 0 | 1;
  locked: boolean;
  mine: boolean;
  popping: boolean;
  asking: boolean;
  color: string;
  wiggle: { value: number } | null;
  onPress: () => void;
  onConfirm: () => void;
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
    <View style={styles.stickerBox}>
      <Clickable
        accessibilityRole="button"
        accessibilityLabel={`${badge.label}${mine ? ', votre camp' : locked ? ', à débloquer' : ''}`}
        onPress={onPress}
        disabled={popping}
        style={styles.stickerArt}
      >
        {popping ? SHARDS.map((a, k) => <Shard key={a} angle={a} color={k % 2 ? '#FFFFFF' : badge.glow} progress={burst} />) : null}
        <Animated.View style={style}>
          <BadgeIcon badge={badge} size={STICKER} state={locked ? 'locked' : undefined} />
        </Animated.View>
      </Clickable>
      {popping ? null : asking ? (
        <Animated.View entering={ZoomIn.springify().damping(12)}>
          <Clickable
            accessibilityRole="button"
            accessibilityLabel={`Sûr ? Choisir ${badge.label}`}
            onPress={onConfirm}
            style={({ pressed }) => [styles.ask, { backgroundColor: color }, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.askText}>Sûr ?</Text>
            <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
          </Clickable>
        </Animated.View>
      ) : (
        <View style={[styles.stickerLabel, mine && styles.stickerLabelMine]}>
          {mine ? <Ionicons name="checkmark" size={10} color="#FFFFFF" /> : null}
          <Text numberOfLines={1} style={[styles.stickerLabelText, mine && { color: '#FFFFFF' }]}>
            {badge.label}
          </Text>
        </View>
      )}
    </View>
  );
}

/** An avatar item on the grey mannequin: the item alone in colour. */
function RewardDrawing({ reward, size }: { reward: Reward; size: number }) {
  const config = useMemo(() => withReward(MANNEQUIN, reward), [reward]);
  return <AvatarDrawing config={config} size={size} focus={reward.part} />;
}

/**
 * A reward path, left to right: numbered circles on one straight line that fills up
 * with the player's progress, the reward of each step above it (an avatar item on
 * the mannequin, or credits). At a VS, two badges side by side: the player picks one
 * ("Sûr ?"), the other pops and is gone for good. `glow`: the filled line and the
 * circles reached glow like embers. Opens scrolled to where the player stands.
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
  unit,
}: {
  steps: Milestone[];
  forks?: Fork[];
  /** Badge chosen at each fork (fork id → badge id). */
  choices?: Record<string, string>;
  onChoose?: (fork: Fork, badge: Badge) => void;
  /** Where the line is filled up to. */
  value: number;
  /** Rewards up to this step are the player's (can be above `value` for the flame). */
  won: number;
  theme: keyof typeof THEMES;
  glow?: boolean;
  /** "liste" / "jour", for labels. */
  unit: string;
}) {
  const scroll = useRef<ScrollView>(null);
  const [viewWidth, setViewWidth] = useState(0);
  const [open, setOpen] = useState<Milestone | null>(null);
  /** The sticker asking "Sûr ?". */
  const [asking, setAsking] = useState<{ fork: string; side: 0 | 1 } | null>(null);
  /** The sticker popping after the other side was chosen. */
  const [popping, setPopping] = useState<{ fork: string; side: 0 | 1 } | null>(null);
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(popTimer.current ?? undefined), []);
  const t = THEMES[theme];

  // A start (0) on the left, then every step and every VS in order.
  const { columns, width } = useMemo(() => {
    const entries = [...steps.map((step) => ({ at: step.at, step })), ...forks.map((fork) => ({ at: fork.at, fork }))].sort((a, b) => a.at - b.at);
    let left = 0;
    const cols: Column[] = [{ at: 0 }, ...entries].map((e) => {
      const w = 'fork' in e && e.fork ? FORK_COL : 'step' in e ? COL : START_COL;
      const col = { ...e, x: left + w / 2 };
      left += w;
      return col;
    });
    return { columns: cols, width: left };
  }, [steps, forks]);

  /** Side chosen at a VS, if any. */
  const chosen = (col: Column) => (col.fork && choices[col.fork.id] ? col.fork.options.findIndex((o) => o.id === choices[col.fork!.id]) : -1);

  const fill = lineFill(value, columns.map((c) => c.at));
  const from = columns[Math.floor(fill)];
  const to = columns[Math.ceil(fill)] ?? from;
  const fillX = from.x + (to.x - from.x) * (fill - Math.floor(fill));
  const first = columns[0].x;
  const last = columns[columns.length - 1].x;

  // Embers (flame path) and badges waiting to be chosen: the glow breathes.
  const breath = useSharedValue(0);
  const waiting = columns.some((c) => c.fork && value >= c.at && chosen(c) === -1);
  useEffect(() => {
    if (glow || waiting) breath.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [glow, waiting, breath]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.3 + breath.value * 0.5 }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * 0.1 }], opacity: 0.12 + breath.value * 0.3 }));
  const vsStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * 0.14 }] }));
  const vsHalo = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * 0.35 }], opacity: 0.55 - breath.value * 0.45 }));

  const nextIndex = columns.findIndex((c) => c.at > value);
  // A badge to choose first, else the next step.
  const pick = columns.findIndex((c) => c.fork && value >= c.at && chosen(c) === -1);
  const focus = pick !== -1 ? pick : nextIndex === -1 ? columns.length - 1 : nextIndex;
  const focusX = columns[focus]?.x ?? 0;
  useEffect(() => {
    if (!viewWidth) return;
    // Next frame: the content must be laid out before it can be scrolled.
    const timer = setTimeout(() => scroll.current?.scrollTo({ x: Math.max(0, focusX - viewWidth / 2), animated: false }), 30);
    return () => clearTimeout(timer);
  }, [focusX, viewWidth]);

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

  const node = (col: Column, i: number, reached: boolean) => (
    <View style={[styles.nodeWrap, { left: col.x - NODE / 2 }]}>
      {glow && reached && i > 0 ? <Animated.View pointerEvents="none" style={[styles.halo, { backgroundColor: t.node }, pulseStyle]} /> : null}
      <View style={[styles.node, reached ? { backgroundColor: t.node, borderColor: t.from } : i === nextIndex ? { borderColor: t.node, borderWidth: 3 } : null]}>
        {i === 0 ? (
          <Ionicons name={theme === 'orange' ? 'flame' : 'flag'} size={20} color={reached ? '#FFFFFF' : colors.textMuted} />
        ) : (
          <Text style={[styles.nodeText, reached && { color: '#FFFFFF' }, col.at >= 100 && { fontSize: 13 }]}>{col.at}</Text>
        )}
      </View>
    </View>
  );

  return (
    <>
      <ScrollView
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={(e) => setViewWidth(e.nativeEvent.layout.width)}
        contentContainerStyle={{ paddingHorizontal: spacing.sm }}
      >
        <View style={{ width, height: HEIGHT }}>
          <View style={[styles.line, { left: first, width: last - first }]} />
          {fillX > first ? (
            <>
              {glow ? <Animated.View pointerEvents="none" style={[styles.lineGlow, { left: first - 6, width: fillX - first + 12 }, glowStyle]} /> : null}
              <LinearGradient colors={[t.from, t.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.line, { left: first, width: fillX - first }]} />
            </>
          ) : null}

          {columns.map((col, i) => {
            const reached = value >= col.at;
            const fork = col.fork;

            if (fork) {
              const choice = chosen(col);
              const toPick = reached && choice === -1;
              return (
                <View key={`fork-${fork.id}`} style={StyleSheet.absoluteFill} pointerEvents="box-none">
                  <View style={[styles.stickers, { left: col.x - FORK_COL / 2 }]} pointerEvents="box-none">
                    {fork.options.map((badge, n) => {
                      const side = n as 0 | 1;
                      const isPopping = popping?.fork === fork.id && popping.side === side;
                      // The side given up is gone, once its pop is over; the chosen one stays put.
                      if (choice !== -1 && choice !== side && !isPopping) return <View key={badge.id} style={{ width: STICKER_BOX }} />;
                      return (
                        <ForkSticker
                          key={badge.id}
                          badge={badge}
                          side={side}
                          locked={!reached}
                          mine={choice === side}
                          popping={isPopping}
                          asking={asking?.fork === fork.id && asking.side === side}
                          color={t.node}
                          wiggle={toPick ? breath : null}
                          onPress={() => (choice === -1 ? tapSticker(fork, side) : undefined)}
                          onConfirm={() => confirm(fork, side)}
                        />
                      );
                    })}
                  </View>
                  <View style={[styles.nodeWrap, { left: col.x - NODE / 2 }]}>
                    {toPick ? <Animated.View pointerEvents="none" style={[styles.halo, { backgroundColor: '#FF5A1F' }, vsHalo]} /> : null}
                    <Animated.View
                      style={[
                        styles.node,
                        reached ? { backgroundColor: t.node, borderColor: t.from } : i === nextIndex ? { borderColor: t.node, borderWidth: 3 } : null,
                        toPick && styles.vsLive,
                        toPick && vsStyle,
                      ]}
                    >
                      <Text style={[styles.vsText, !reached && { color: colors.textMuted }]}>VS</Text>
                    </Animated.View>
                  </View>
                </View>
              );
            }

            const step = col.step;
            const owned = step ? won >= step.at : false;
            const item = step?.rewards[0];
            return (
              <View key={col.at} style={StyleSheet.absoluteFill} pointerEvents="box-none">
                {step ? (
                  <>
                    <Clickable
                      accessibilityRole="button"
                      accessibilityLabel={`${step.at} ${unit}${step.at > 1 ? 's' : ''} : ${[
                        ...step.rewards.map((r) => r.label),
                        ...(step.credits ? [`${step.credits} crédits`] : []),
                      ].join(', ')}${owned ? ', obtenu' : ', à débloquer'}`}
                      onPress={() => setOpen(step)}
                      style={({ pressed }) => [styles.card, { left: col.x - (COL - 8) / 2 }, !owned && styles.cardLocked, pressed && { opacity: 0.8 }]}
                    >
                      {item ? (
                        <>
                          <RewardDrawing reward={item} size={MANNEQUIN_SIZE} />
                          <Text numberOfLines={1} style={styles.cardTitle}>
                            {item.label}
                          </Text>
                        </>
                      ) : (
                        <>
                          <View style={styles.credits}>
                            <EnergyIcon size={30} />
                            <Text style={styles.creditsText}>+{step.credits}</Text>
                          </View>
                          <Text numberOfLines={1} style={styles.cardTitle}>
                            Crédits
                          </Text>
                        </>
                      )}
                      {item && step.credits ? (
                        <View style={styles.creditChip}>
                          <EnergyIcon size={11} />
                          <Text style={styles.creditChipText}>+{step.credits}</Text>
                        </View>
                      ) : null}
                      {!owned ? (
                        <View style={styles.lock}>
                          <Ionicons name="lock-closed" size={10} color="#FFFFFF" />
                        </View>
                      ) : null}
                    </Clickable>
                    <View style={[styles.stem, { left: col.x - 1 }, owned && { backgroundColor: t.node }]} />
                  </>
                ) : null}
                {node(col, i, reached)}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Sheet visible={open !== null} onClose={() => setOpen(null)} title={open ? `Palier ${open.at}` : ''}>
        {open ? (
          <View style={{ gap: spacing.md }}>
            <Text style={styles.sheetHint}>
              {won >= open.at
                ? open.rewards.length
                  ? 'Débloqué ! Retrouvez ces éléments dans la garde-robe.'
                  : 'Obtenu ! Ces crédits sont ajoutés à votre énergie.'
                : `À débloquer : ${open.at} ${unit}${open.at > 1 ? 's' : ''}.`}
            </Text>
            <View style={styles.sheetGrid}>
              {open.rewards.map((r) => (
                <View key={`${r.part}-${r.id}`} style={styles.sheetItem}>
                  <RewardDrawing reward={r} size={80} />
                  <Text numberOfLines={1} style={styles.cardTitle}>
                    {r.label}
                  </Text>
                  <Text numberOfLines={1} style={styles.sheetMeta}>
                    {PART_LABELS[r.part]}
                  </Text>
                </View>
              ))}
              {open.credits ? (
                <View style={styles.sheetItem}>
                  <View style={[styles.credits, { height: 80 }]}>
                    <EnergyIcon size={40} />
                    <Text style={[styles.creditsText, { fontSize: 26 }]}>+{open.credits}</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.cardTitle}>
                    {open.credits} crédits
                  </Text>
                  <Text numberOfLines={1} style={styles.sheetMeta}>
                    Énergie
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  line: { position: 'absolute', top: LINE_Y - LINE / 2, height: LINE, borderRadius: LINE / 2, backgroundColor: colors.surfaceAlt },
  lineGlow: { position: 'absolute', top: LINE_Y - 10, height: 20, borderRadius: 10, backgroundColor: 'rgba(255, 138, 61, 0.45)' },
  nodeWrap: { position: 'absolute', top: LINE_Y - NODE / 2, width: NODE, height: NODE, alignItems: 'center', justifyContent: 'center' },
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
  nodeText: { color: colors.textMuted, fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
  vsLive: { backgroundColor: '#FF5A1F', borderColor: '#FFC24B' },
  vsText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  stickers: { position: 'absolute', top: PAD, width: FORK_COL, height: ABOVE, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end' },
  stickerBox: { width: STICKER_BOX, alignItems: 'center', gap: 4 },
  stickerArt: { width: STICKER + 8, height: STICKER + 8, alignItems: 'center', justifyContent: 'center' },
  stickerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: STICKER_BOX,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stickerLabelMine: { backgroundColor: '#2EAD6B', borderColor: '#7BE495' },
  stickerLabelText: { flexShrink: 1, color: colors.text, fontSize: 10, fontWeight: '700' },
  shard: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 22, paddingHorizontal: 10, borderRadius: 11 },
  askText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  card: {
    position: 'absolute',
    top: PAD,
    width: COL - 8,
    height: ABOVE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLocked: { opacity: 0.55 },
  cardTitle: { color: colors.text, fontSize: 11, fontWeight: '700', maxWidth: '100%' },
  stem: { position: 'absolute', top: PAD + ABOVE, width: 2, height: GAP, backgroundColor: colors.border },
  credits: { height: MANNEQUIN_SIZE, flexDirection: 'row', alignItems: 'center', gap: 2 },
  creditsText: { color: '#FFD84A', fontSize: 20, fontWeight: '900' },
  creditChip: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#2D3047',
  },
  creditChipText: { color: '#FFD84A', fontSize: 10, fontWeight: '900' },
  lock: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2D3047',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetHint: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  sheetMeta: { color: colors.textMuted, fontSize: 11 },
  sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  sheetItem: { width: 96, alignItems: 'center', gap: 4 },
});
