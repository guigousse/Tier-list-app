import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';

import { TEMPLATES } from '../../constants/presets';
import { CARD_COLORS, colors, TIER_COLORS } from '../../constants/theme';
import { fetchAppIcons } from '../../lib/appstore';
import { Finger, FINGER, fingerOffset, MiniCard, Stage, step, useLoop, type SceneProps } from './kit';

const GAMES = TEMPLATES.find((t) => t.key === 'mobile-games')!;
const BROC = { name: 'Broc', emoji: '🏺' };
/** The example ranking, Broc aside: it is the card being placed in S. */
const ROWS: { name: string; emoji: string }[][] = [
  [],
  [
    { name: 'Clash Royale', emoji: '👑' },
    { name: 'Minecraft', emoji: '⛏️' },
    { name: 'Brawl Stars', emoji: '⭐' },
  ],
  [
    { name: 'Pokémon GO', emoji: '⚡' },
    { name: 'Hay Day', emoji: '🌾' },
    { name: 'Monument Valley', emoji: '🏛️' },
  ],
  [
    { name: 'Subway Surfers', emoji: '🛹' },
    { name: 'Roblox', emoji: '🧱' },
  ],
  [
    { name: 'Candy Crush Saga', emoji: '🍬' },
    { name: 'Fruit Ninja', emoji: '🍉' },
  ],
];
/** Share of players per tier for Broc, shown once the ranking is validated. */
const BROC_VOTES = [72, 16, 7, 3, 2];

const DURATION = 8000;

/** Height of the scenes for a given width (the ranking scene sets it, the others match). */
export function sceneHeight(W: number): number {
  const rowH = Math.round(W * 0.14);
  return 10 + 38 + 5 * (rowH + 2) + 6 + 26 + (rowH - 8) + 12 + 42 + 10;
}

let iconCache: Record<string, string> | null = null;

/** App Store icons of the games, by short name (cards show an emoji until they load). */
function useIcons(): Record<string, string> {
  const [icons, setIcons] = useState<Record<string, string>>(iconCache ?? {});
  useEffect(() => {
    if (iconCache) return;
    const apps = GAMES.items.map((label, i) => ({ id: GAMES.appStoreIds?.[i], name: label.split(' : ')[0] }));
    fetchAppIcons(apps)
      .then((urls) => {
        iconCache = Object.fromEntries(apps.flatMap((a, i) => (urls[i] ? [[a.name, urls[i]!]] : [])));
        setIcons(iconCache);
      })
      .catch(() => {});
  }, []);
  return icons;
}

/**
 * First welcome scene: a finger drags Broc into the S tier, taps « Valider »,
 * and the players' statistics appear.
 */
export function RankingScene({ width: W, active }: SceneProps) {
  const icons = useIcons();
  const t = useLoop(active, DURATION);

  // Layout, from the width.
  const pad = 10;
  const header = 38;
  const rowH = Math.round(W * 0.14);
  const labelW = rowH;
  const c = rowH - 8;
  const tierY = (i: number) => pad + header + i * (rowH + 2);
  const poolTop = tierY(5) + 6;
  const poolCardsY = poolTop + 26;
  const btnY = poolCardsY + c + 12;
  const btnH = 42;
  const H = btnY + btnH + pad;
  const cardX = (j: number) => labelW + 4 + j * (c + 4);

  const from = { x: 12, y: poolCardsY };
  const to = { x: cardX(0), y: tierY(0) + 4 };
  const P0 = { x: W * 0.8, y: H + 20 };
  const P1 = { x: from.x + c / 2, y: from.y + c / 2 };
  const P2 = { x: to.x + c / 2, y: to.y + c / 2 };
  const P3 = { x: W / 2, y: btnY + btnH / 2 };
  const P4 = { x: W + 30, y: H * 0.55 };

  const pressed = useDerivedValue(
    () =>
      step(t.value, DURATION, 1100, 1250) -
      step(t.value, DURATION, 2500, 2650) +
      step(t.value, DURATION, 3600, 3700) -
      step(t.value, DURATION, 3750, 3900),
  );

  const fingerStyle = useAnimatedStyle(() => {
    const enter = step(t.value, DURATION, 300, 1100);
    const drag = step(t.value, DURATION, 1300, 2500);
    const toBtn = step(t.value, DURATION, 2900, 3600);
    const leave = step(t.value, DURATION, 4000, 4700);
    const x = P0.x + (P1.x - P0.x) * enter + (P2.x - P1.x) * drag + (P3.x - P2.x) * toBtn + (P4.x - P3.x) * leave;
    const y = P0.y + (P1.y - P0.y) * enter + (P2.y - P1.y) * drag + (P3.y - P2.y) * toBtn + (P4.y - P3.y) * leave;
    const o = fingerOffset(x, y);
    return {
      opacity: step(t.value, DURATION, 300, 600) - step(t.value, DURATION, 4300, 4700),
      transform: [{ translateX: o.x }, { translateY: o.y }],
    };
  });

  const brocStyle = useAnimatedStyle(() => {
    // Back in the pool, hidden, before the loop starts again.
    const reset = step(t.value, DURATION, 7650, 7700, false);
    const drag = step(t.value, DURATION, 1300, 2500) * (1 - reset);
    const lift = step(t.value, DURATION, 1100, 1250) - step(t.value, DURATION, 2500, 2700);
    return {
      opacity: 1 - step(t.value, DURATION, 7300, 7600) + step(t.value, DURATION, 7750, 8000),
      transform: [
        { translateX: from.x + (to.x - from.x) * drag },
        { translateY: from.y + (to.y - from.y) * drag },
        { scale: 1 + lift * 0.12 },
      ],
    };
  });

  const poolTodo = useAnimatedStyle(() => ({ opacity: 1 - step(t.value, DURATION, 2500, 2700) + step(t.value, DURATION, 7750, 8000) }));
  const poolDone = useAnimatedStyle(() => ({ opacity: step(t.value, DURATION, 2500, 2700) - step(t.value, DURATION, 7750, 8000) }));

  const buttonStyle = useAnimatedStyle(() => {
    const ready = step(t.value, DURATION, 2500, 2800) - step(t.value, DURATION, 7750, 8000);
    const press = step(t.value, DURATION, 3600, 3700) - step(t.value, DURATION, 3750, 3900);
    return { opacity: 0.45 + ready * 0.55, transform: [{ scale: 1 - press * 0.05 }] };
  });

  const statsStyle = useAnimatedStyle(() => {
    const show = step(t.value, DURATION, 3950, 4500);
    const hide = step(t.value, DURATION, 7300, 7600);
    return { opacity: show - hide, transform: [{ translateY: (1 - show) * 80 }] };
  });
  const barsStyle = useAnimatedStyle(() => ({ width: `${2 + 98 * step(t.value, DURATION, 4400, 5300)}%` }));

  const image = (name: string) => (icons[name] ? <Image source={{ uri: icons[name] }} style={StyleSheet.absoluteFill} /> : undefined);

  return (
    <Stage width={W} height={H}>
      <View style={[styles.header, { height: header, paddingHorizontal: pad }]}>
        <Ionicons name="chevron-back" size={18} color={colors.text} />
        <Text style={styles.headerTitle}>Jeux mobiles</Text>
      </View>

      {TIER_COLORS.slice(0, 5).map((color, i) => (
        <View key={color} style={[styles.row, { top: tierY(i), height: rowH }]}>
          <View style={[styles.label, { width: labelW, backgroundColor: color }]}>
            <Text style={[styles.labelText, { fontSize: rowH * 0.4 }]}>{'SABCD'[i]}</Text>
          </View>
        </View>
      ))}
      {ROWS.flatMap((row, i) =>
        row.map((g, j) => (
          <View key={g.name} style={[styles.abs, { left: cardX(j), top: tierY(i) + 4 }]}>
            <MiniCard size={c} color={CARD_COLORS[(i * 3 + j) % CARD_COLORS.length]} emoji={g.emoji} image={image(g.name)} />
          </View>
        )),
      )}

      <View style={[styles.pool, { top: poolTop, height: btnY - poolTop - 6 }]} />
      <Animated.Text style={[styles.poolText, { top: poolTop + 6 }, poolTodo]}>À classer · 1</Animated.Text>
      <Animated.Text style={[styles.poolText, { top: poolTop + 6 }, poolDone]}>Tout est classé 🎉</Animated.Text>

      <Animated.View style={[styles.button, { top: btnY, height: btnH, left: pad, right: pad }, buttonStyle]}>
        <Ionicons name="checkmark-done" size={18} color="#fff" />
        <Text style={styles.buttonText}>Valider mon classement</Text>
      </Animated.View>

      <Animated.View style={[styles.abs, styles.lifted, brocStyle]}>
        <MiniCard size={c} color="#3B4050" emoji={BROC.emoji} image={image(BROC.name)} />
      </Animated.View>

      <Animated.View style={[styles.stats, { top: tierY(2) - 6, padding: pad + 4 }, statsStyle]}>
        <View style={styles.validated}>
          <Ionicons name="checkmark-circle" size={18} color="#2EAD6B" />
          <Text style={styles.validatedText}>Classement validé</Text>
        </View>
        <Text style={styles.score}>87 %</Text>
        <Text style={styles.scoreHint}>d’accord avec les autres joueurs</Text>
        <View style={styles.voteRow}>
          <Text style={styles.voteName}>{BROC.emoji} Broc</Text>
          <Text style={styles.voteHint}>72 % le mettent en S</Text>
        </View>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.bar, barsStyle]}>
            {BROC_VOTES.map((v, i) => (
              <View key={i} style={{ flex: v, backgroundColor: TIER_COLORS[i] }} />
            ))}
          </Animated.View>
        </View>
      </Animated.View>

      <Finger pressed={pressed} style={fingerStyle} size={FINGER} />
    </Stage>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute', left: 0, top: 0 },
  lifted: { zIndex: 5, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  row: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', backgroundColor: colors.surface },
  label: { alignItems: 'center', justifyContent: 'center' },
  labelText: { fontWeight: '900', color: '#111' },
  pool: { position: 'absolute', left: 0, right: 0, backgroundColor: colors.tray, borderTopWidth: 1, borderTopColor: colors.border },
  poolText: { position: 'absolute', left: 12, color: colors.text, fontSize: 13, fontWeight: '700' },
  button: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  stats: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 4,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    zIndex: 8,
  },
  validated: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
  validatedText: { color: '#2EAD6B', fontSize: 14, fontWeight: '700' },
  score: { color: colors.text, fontSize: 44, fontWeight: '900', textAlign: 'center', letterSpacing: -1 },
  scoreHint: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 10 },
  voteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  voteName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  voteHint: { color: colors.textMuted, fontSize: 12 },
  barTrack: { height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.surface },
  bar: { flexDirection: 'row', height: 12 },
});
