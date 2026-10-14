import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, radius, spacing } from '../../constants/theme';
import type { AvatarConfig } from '../../lib/avatar';
import { PART_LABELS, stretchFill, withReward, type Milestone } from '../../lib/rewards';
import type { Badge, Fork } from '../../lib/badges';
import { AvatarDrawing } from '../Avatar';
import { BadgeIcon } from '../BadgeIcon';
import { Clickable } from '../Clickable';
import { Sheet } from '../ui';

const ROW = 112;
const NODE = 52;
const TOP = NODE / 2 + 8;
const PREVIEW = 62;
const BADGE = 70;
/** Width of a badge with its label under it. */
const BADGE_LABEL = 116;
const VS = 34;

type Point = { x: number; y: number };

/** Cubic from `a` up to `b`, leaving and arriving vertically. */
function stretch(a: Point, b: Point): [Point, Point, Point, Point] {
  return [a, { x: a.x, y: a.y - ROW / 2 }, { x: b.x, y: b.y + ROW / 2 }, b];
}

/** The first `t` (0 → 1) of a cubic, as an SVG path (de Casteljau). */
function partial([p0, p1, p2, p3]: [Point, Point, Point, Point], t: number): string {
  const lerp = (a: Point, b: Point) => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });
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

type Row = {
  at: number;
  y: number;
  /** One point, or two for a fork (its two badges, in order). */
  xs: number[];
  step?: Milestone;
  fork?: Fork;
};

/**
 * A reward path, going up: numbered circles linked by a winding road that fills up
 * with the player's progress, each with a preview of the avatar item it unlocks.
 * At forks the road splits towards two badges: the player picks one side, which
 * gives up the other for good. `glow`: the filled road and the circles reached glow
 * like embers.
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
  const t = THEMES[theme];

  const height = TOP * 2 + (steps.length + forks.length) * ROW;
  // A start point (0) at the bottom, then every step and fork going up; steps wind left and right.
  const rows = useMemo<Row[]>(() => {
    const amplitude = Math.min(90, width * 0.22);
    const entries = [...steps.map((step) => ({ at: step.at, step, fork: undefined })), ...forks.map((fork) => ({ at: fork.at, step: undefined, fork }))].sort(
      (a, b) => a.at - b.at,
    );
    let turn = 0;
    return [{ at: 0, step: undefined, fork: undefined }, ...entries].map((e, i) => ({
      ...e,
      y: height - TOP - i * ROW,
      xs: e.fork ? [width * 0.24, width * 0.76] : [width / 2 + Math.sin((turn++ * Math.PI) / 2) * amplitude],
    }));
  }, [steps, forks, width, height]);

  /** Index of the badge chosen at a fork row, if any. */
  const chosen = (row: Row) => (row.fork && choices[row.fork.id] ? row.fork.options.findIndex((o) => o.id === choices[row.fork!.id]) : -1);

  // Stretches of road: every point of a row to every point of the next (a fork's
  // two sides go on side by side if two forks follow each other).
  const stretches = rows.slice(1).flatMap((b, i) => {
    const a = rows[i];
    const pairs: [number, number][] =
      a.xs.length === 2 && b.xs.length === 2
        ? [
            [0, 0],
            [1, 1],
          ]
        : a.xs.flatMap((_, p) => b.xs.map((__, q): [number, number] => [p, q]));
    return pairs.map(([p, q]) => {
      const lost = (chosen(a) !== -1 && chosen(a) !== p) || (chosen(b) !== -1 && chosen(b) !== q);
      return {
        curve: stretch({ x: a.xs[p], y: a.y }, { x: b.xs[q], y: b.y }),
        lost,
        fill: lost ? 0 : stretchFill(value, a.at, b.at),
      };
    });
  });
  const roadD = stretches
    .filter((s) => !s.lost)
    .map((s) => partial(s.curve, 1))
    .join(' ');
  const lostD = stretches
    .filter((s) => s.lost)
    .map((s) => partial(s.curve, 1))
    .join(' ');
  const filledD = stretches
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
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breath.value * 0.1 }],
    opacity: 0.12 + breath.value * 0.3,
  }));

  // Stickers waiting for a choice wiggle, each its own way; VS beats.
  const wiggleLeft = useAnimatedStyle(() => ({ transform: [{ rotate: `${(breath.value * 2 - 1) * 7}deg` }] }));
  const wiggleRight = useAnimatedStyle(() => ({ transform: [{ rotate: `${(1 - breath.value * 2) * 7}deg` }] }));
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.92 + breath.value * 0.14 }], opacity: 0.35 + breath.value * 0.5 }));
  const vsStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breath.value * 0.15 }] }));

  const nextIndex = rows.findIndex((r) => r.at > value);
  // A badge to choose first, else the next step.
  const pick = rows.findIndex((r) => r.fork && value >= r.at && chosen(r) === -1);
  const focus = pick !== -1 ? pick : nextIndex === -1 ? rows.length - 1 : nextIndex;
  const focusY = rows[focus]?.y ?? 0;
  useEffect(() => {
    if (width > 0) onCurrent?.(height - focusY);
  }, [width, height, focusY, onCurrent]);

  const tapBadge = (fork: Fork, badge: Badge, side: number, choice: number) => {
    const other = fork.options[1 - side];
    if (value < fork.at) {
      Alert.alert(
        fork.question,
        `Au palier ${fork.at}, choisissez votre camp : ${fork.options[0].label} ou ${fork.options[1].label}. L’autre badge sera perdu pour toujours !`,
      );
    } else if (choice === -1) {
      Alert.alert(`${badge.label} ?`, `Le badge ${other.label} sera perdu pour toujours. Pas de retour en arrière !`, [
        { text: 'Réfléchir encore', style: 'cancel' },
        { text: `Choisir ${badge.label}`, onPress: () => onChoose?.(fork, badge) },
      ]);
    } else {
      Alert.alert(
        choice === side ? badge.label : `${badge.label} : perdu`,
        choice === side
          ? 'Votre camp est choisi ! Affichez ce badge sur votre profil depuis « Mes badges ».'
          : `Vous avez choisi ${other.label}. Pas de regrets ?`,
      );
    }
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
            {lostD ? (
              <Path d={lostD} stroke={colors.surfaceAlt} strokeOpacity={0.45} strokeWidth={5} strokeDasharray="4 8" strokeLinecap="round" fill="none" />
            ) : null}
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
            if (fork) {
              const choice = chosen(row);
              const toPick = reached && choice === -1;
              return (
                <View key={`fork-${fork.id}`} style={StyleSheet.absoluteFill} pointerEvents="box-none">
                  {/* Between the two stickers: the question, VS, and the step. */}
                  <Text numberOfLines={2} style={[styles.question, { top: row.y - 62, left: width / 2 - 60 }]}>
                    {fork.question}
                  </Text>
                  <Animated.View style={[styles.vs, { top: row.y - VS / 2, left: width / 2 - VS / 2 }, toPick && styles.vsLive, toPick && vsStyle]}>
                    <Text style={styles.vsText}>VS</Text>
                  </Animated.View>
                  <Text style={[styles.forkAt, { top: row.y + VS / 2 + 6, left: width / 2 - 60 }, toPick && { color: t.node }]}>
                    {toPick ? 'À vous de choisir !' : choice !== -1 ? 'Camp choisi' : `Palier ${row.at}`}
                  </Text>

                  {fork.options.map((badge, side) => {
                    const mine = choice === side;
                    const lost = choice !== -1 && !mine;
                    return (
                      <Clickable
                        key={badge.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${badge.label}, ${mine ? 'choisi' : lost ? 'perdu' : reached ? 'à choisir' : `palier ${row.at}`}`}
                        onPress={() => tapBadge(fork, badge, side, choice)}
                        style={[styles.badgeWrap, { top: row.y - BADGE / 2, left: row.xs[side] - BADGE_LABEL / 2 }]}
                      >
                        <View style={styles.badgeCircle}>
                          {toPick ? (
                            <Animated.View pointerEvents="none" style={[styles.badgeHalo, styles.badgeRing, { borderColor: badge.glow }, ringStyle]} />
                          ) : mine ? (
                            <View pointerEvents="none" style={[styles.badgeHalo, { backgroundColor: badge.glow, opacity: 0.16 }]} />
                          ) : null}
                          <Animated.View style={toPick ? (side === 0 ? wiggleLeft : wiggleRight) : mine ? { transform: [{ scale: 1.06 }] } : null}>
                            <BadgeIcon badge={badge} size={BADGE} state={!reached ? 'locked' : lost ? 'lost' : undefined} />
                          </Animated.View>
                        </View>
                        <View style={[styles.badgeLabelPill, mine && { backgroundColor: t.node, borderColor: t.from }, lost && { opacity: 0.45 }]}>
                          {mine ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
                          <Text numberOfLines={1} style={[styles.badgeLabel, mine && { color: '#FFFFFF' }, lost && { textDecorationLine: 'line-through' }]}>
                            {badge.label}
                          </Text>
                        </View>
                      </Clickable>
                    );
                  })}
                </View>
              );
            }

            const x = row.xs[0];
            const step = row.step ?? null;
            const owned = step ? won >= step.at : false;
            const left = x <= width / 2;
            const current = i === nextIndex;
            // The preview sits on the roomier side of the circle.
            const room = left ? width - x - NODE / 2 - spacing.md : x - NODE / 2 - spacing.md;
            const previewWidth = Math.min(170, room);
            return (
              <View key={row.at} style={StyleSheet.absoluteFill} pointerEvents="box-none">
                <View style={[styles.nodeWrap, { top: row.y - NODE / 2, left: x - NODE / 2 }]}>
                  {glow && reached && i > 0 ? <Animated.View pointerEvents="none" style={[styles.halo, { backgroundColor: t.node }, pulseStyle]} /> : null}
                  <View
                    style={[styles.node, reached ? { backgroundColor: t.node, borderColor: t.from } : current ? { borderColor: t.node, borderWidth: 3 } : null]}
                  >
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
                        {step.rewards.length > 1
                          ? `+ ${step.rewards.length - 1} autre${step.rewards.length > 2 ? 's' : ''}`
                          : PART_LABELS[step.rewards[0].part]}
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
  nodeWrap: {
    position: 'absolute',
    width: NODE,
    height: NODE,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  halo: {
    position: 'absolute',
    width: NODE + 14,
    height: NODE + 14,
    borderRadius: (NODE + 14) / 2,
  },
  nodeText: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
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
  question: { position: 'absolute', width: 120, color: colors.text, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  forkAt: {
    position: 'absolute',
    width: 120,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  vs: {
    position: 'absolute',
    width: VS,
    height: VS,
    borderRadius: VS / 2,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsLive: { backgroundColor: '#FF5A1F', borderColor: '#FFC24B' },
  vsText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  badgeWrap: { position: 'absolute', width: BADGE_LABEL, alignItems: 'center', gap: 2 },
  badgeCircle: { width: BADGE, height: BADGE, alignItems: 'center', justifyContent: 'center' },
  badgeHalo: { position: 'absolute', width: BADGE + 14, height: BADGE + 14, borderRadius: (BADGE + 14) / 2 },
  badgeRing: { borderWidth: 3, borderStyle: 'dashed' },
  badgeLabelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: BADGE_LABEL,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeLabel: { flexShrink: 1, color: colors.text, fontSize: 12, fontWeight: '700' },
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
