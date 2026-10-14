import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, radius, spacing } from '../../constants/theme';
import type { AvatarConfig } from '../../lib/avatar';
import { PART_LABELS, stretchFill, withReward, type Milestone } from '../../lib/rewards';
import { AvatarDrawing } from '../Avatar';
import { Clickable } from '../Clickable';
import { Sheet } from '../ui';

const ROW = 112;
const NODE = 52;
const TOP = NODE / 2 + 8;
const PREVIEW = 62;

type Point = { x: number; y: number };

/** Cubic from `a` to `b`, leaving and arriving vertically. */
function stretch(a: Point, b: Point): [Point, Point, Point, Point] {
  return [a, { x: a.x, y: a.y + ROW / 2 }, { x: b.x, y: b.y - ROW / 2 }, b];
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

/**
 * A reward path: numbered circles linked by a winding road that fills up with the
 * player's progress, each with a preview of the avatar item it unlocks. `glow`: the
 * filled road and the circles reached glow like embers.
 */
export function RewardPath({
  steps,
  value,
  won,
  theme,
  glow = false,
  avatar,
  unit,
}: {
  steps: Milestone[];
  /** Where the road is filled up to. */
  value: number;
  /** Rewards up to this step are the player's (can be above `value` for the flame). */
  won: number;
  theme: keyof typeof THEMES;
  glow?: boolean;
  avatar: AvatarConfig;
  /** "liste" / "jour", for labels. */
  unit: string;
}) {
  const [width, setWidth] = useState(0);
  const [open, setOpen] = useState<Milestone | null>(null);
  const t = THEMES[theme];

  // A start point (0), then every step, winding left and right.
  const nodes = useMemo(() => {
    const amplitude = Math.min(90, width * 0.22);
    return [0, ...steps.map((s) => s.at)].map((at, i) => ({
      at,
      x: width / 2 + Math.sin((i * Math.PI) / 2) * amplitude,
      y: TOP + i * ROW,
    }));
  }, [steps, width]);
  const height = TOP * 2 + (nodes.length - 1) * ROW;

  const road = nodes.slice(1).map((b, i) => stretch(nodes[i], b));
  const roadD = road.map((c) => partial(c, 1)).join(' ');
  const filledD = road
    .map((c, i) => ({ c, f: stretchFill(value, nodes[i].at, nodes[i + 1].at) }))
    .filter(({ f }) => f > 0)
    .map(({ c, f }) => partial(c, f))
    .join(' ');

  // Embers: the glow breathes.
  const breath = useSharedValue(0);
  useEffect(() => {
    if (glow) breath.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [glow, breath]);
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + breath.value * 0.55,
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breath.value * 0.1 }],
    opacity: 0.12 + breath.value * 0.3,
  }));

  const nextIndex = nodes.findIndex((n) => n.at > value);

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={`fill-${theme}`} x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={t.from} />
                <Stop offset="1" stopColor={t.to} />
              </LinearGradient>
            </Defs>
            <Path d={roadD} stroke={colors.surfaceAlt} strokeWidth={14} strokeLinecap="round" fill="none" />
            <Path d={roadD} stroke={colors.border} strokeWidth={2} strokeDasharray="2 10" strokeLinecap="round" fill="none" />
            {filledD ? <Path d={filledD} stroke={`url(#fill-${theme})`} strokeWidth={14} strokeLinecap="round" fill="none" /> : null}
          </Svg>
          {glow && filledD ? (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glowStyle]}>
              <Svg width={width} height={height}>
                <Path d={filledD} stroke="#FF8A3D" strokeOpacity={0.35} strokeWidth={30} strokeLinecap="round" fill="none" />
                <Path d={filledD} stroke="#FFE08A" strokeOpacity={0.8} strokeWidth={4} strokeLinecap="round" fill="none" />
              </Svg>
            </Animated.View>
          ) : null}

          {nodes.map((n, i) => {
            const reached = value >= n.at;
            const step = i > 0 ? steps[i - 1] : null;
            const owned = step ? won >= step.at : false;
            const left = n.x <= width / 2;
            const current = i === nextIndex;
            // The preview sits on the roomier side of the circle.
            const room = left ? width - n.x - NODE / 2 - spacing.md : n.x - NODE / 2 - spacing.md;
            const previewWidth = Math.min(170, room);
            return (
              <View key={n.at} style={StyleSheet.absoluteFill} pointerEvents="box-none">
                <View style={[styles.nodeWrap, { top: n.y - NODE / 2, left: n.x - NODE / 2 }]}>
                  {glow && reached && i > 0 ? <Animated.View pointerEvents="none" style={[styles.halo, { backgroundColor: t.node }, pulseStyle]} /> : null}
                  <View
                    style={[styles.node, reached ? { backgroundColor: t.node, borderColor: t.from } : current ? { borderColor: t.node, borderWidth: 3 } : null]}
                  >
                    {i === 0 ? (
                      <Ionicons name={theme === 'orange' ? 'flame' : 'flag'} size={22} color={reached ? '#FFFFFF' : colors.textMuted} />
                    ) : (
                      <Text style={[styles.nodeText, reached && { color: '#FFFFFF' }, n.at >= 100 && { fontSize: 15 }]}>{n.at}</Text>
                    )}
                  </View>
                </View>

                {step ? (
                  <Clickable
                    accessibilityRole="button"
                    accessibilityLabel={`${n.at} ${unit}${n.at > 1 ? 's' : ''} : ${step.rewards.map((r) => r.label).join(', ')}${owned ? ', obtenu' : ', à débloquer'}`}
                    onPress={() => setOpen(step)}
                    style={({ pressed }) => [
                      styles.preview,
                      { top: n.y - PREVIEW / 2, width: previewWidth },
                      left ? { left: n.x + NODE / 2 + spacing.md } : { left: n.x - NODE / 2 - spacing.md - previewWidth },
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
