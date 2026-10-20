import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { AvatarDrawing } from '../Avatar';
import { CARD_COLORS, colors, TIER_COLORS } from '../../constants/theme';
import { DEFAULT_AVATAR, type AvatarConfig } from '../../lib/avatar';
import { useT } from '../../lib/i18n/useT';
import { Finger, fingerOffset, MiniCard, Stage, step, useLoop, type SceneProps } from './kit';
import type { ReactNode } from 'react';

type Props = SceneProps & { height: number };

/**
 * Card images of the shared AI library (supabase card-icons), shipped with the app:
 * the welcome screens show the real thing at once, even offline on the first launch.
 */
const IMAGES = {
  strawberry: require('../../../assets/onboarding/strawberry.png'),
  mango: require('../../../assets/onboarding/mango.png'),
  cherry: require('../../../assets/onboarding/cherry.png'),
  peach: require('../../../assets/onboarding/peach.png'),
  watermelon: require('../../../assets/onboarding/watermelon.png'),
  pineapple: require('../../../assets/onboarding/pineapple.png'),
  banana: require('../../../assets/onboarding/banana.png'),
  kiwi: require('../../../assets/onboarding/kiwi.png'),
  lemon: require('../../../assets/onboarding/lemon.png'),
  pizza: require('../../../assets/onboarding/pizza.png'),
  burger: require('../../../assets/onboarding/burger.png'),
  sushi: require('../../../assets/onboarding/sushi.png'),
  taco: require('../../../assets/onboarding/taco.png'),
  ramen: require('../../../assets/onboarding/ramen.png'),
  donut: require('../../../assets/onboarding/donut.png'),
  croissant: require('../../../assets/onboarding/croissant.png'),
  'pain-au-chocolat': require('../../../assets/onboarding/pain-au-chocolat.png'),
  waffle: require('../../../assets/onboarding/waffle.png'),
} satisfies Record<string, ImageSourcePropType>;

type Picture = keyof typeof IMAGES;

/** A card with its library image, as cards of public lists look in the app. */
function PictureCard({ size, color, name }: { size: number; color: string; name: Picture }) {
  return <MiniCard size={size} color={color} emoji="" image={<Image source={IMAGES[name]} style={{ width: size * 0.82, height: size * 0.82 }} />} />;
}

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
  return p < 0.7 ? (p / 0.7) * 1.15 : 1.15 - ((p - 0.7) / 0.3) * 0.15;
}

const AI_CARDS: Picture[] = ['pizza', 'burger', 'sushi', 'taco', 'ramen', 'donut'];
const AI_COLORS = ['#7A3A4E', '#7A5A2E', '#2E5A7A', '#2E6A4F', '#5B3A7A', '#3D4454'];
const CREATE_DURATION = 7200;

/** Creation with the AI: a theme typed, the wand tapped, and illustrated cards pop in. */
export function CreateScene({ width: W, height: H, active }: Props) {
  const t = useLoop(active, CREATE_DURATION);
  // `t` is the loop's clock in these scenes: the texts go through `tr`.
  const { t: tr, upper } = useT();
  const theme = tr('play.onb.aiTheme');
  const names = tr('play.onb.aiCards').split(',');
  const fieldTop = 52;
  const btnTop = fieldTop + 66;
  const gridTop = btnTop + 60;
  const gap = 10;
  const c = Math.floor(Math.min((W - 32 - gap * 2) / 3, (H - gridTop - 56) / 2 - 22));
  const gridLeft = (W - (c * 3 + gap * 2)) / 2;
  const btn = { x: W / 2, y: btnTop + 21 };
  const typed = [300, 1500] as const;
  const tap = 1900;

  const pressed = useDerivedValue(() => step(t.value, CREATE_DURATION, tap, tap + 120) - step(t.value, CREATE_DURATION, tap + 160, tap + 300));
  const fingerStyle = useAnimatedStyle(() => {
    const enter = step(t.value, CREATE_DURATION, 1100, 1800);
    const leave = step(t.value, CREATE_DURATION, 2500, 3100);
    const o = fingerOffset(btn.x + 40 + (1 - enter) * 60 + leave * 80, btn.y + (1 - enter) * 160 + leave * 160);
    return { opacity: enter - leave, transform: [{ translateX: o.x }, { translateY: o.y }] };
  });
  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * 0.05 }] }));
  // The wand at work: its sparkles turn while the cards come.
  const sparkle = useAnimatedStyle(() => {
    const p = step(t.value, CREATE_DURATION, tap, 4000, false);
    return { transform: [{ rotate: `${p * 720}deg` }, { scale: 1 + Math.sin(p * Math.PI * 6) * 0.2 }] };
  });
  const done = useAnimatedStyle(() => {
    const p = step(t.value, CREATE_DURATION, 4300, 4700) - step(t.value, CREATE_DURATION, 6600, 7000);
    return { opacity: p, transform: [{ translateY: (1 - p) * 12 }] };
  });
  const fade = useAnimatedStyle(() => ({ opacity: 1 - step(t.value, CREATE_DURATION, 6600, 7000) }));

  return (
    <Stage width={W} height={H}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{tr('play.onb.createTitle')}</Text>
        <Ionicons name="sparkles" size={14} color="#B79BFF" />
      </View>
      <View style={[styles.field, { top: fieldTop }]}>
        <Text style={styles.fieldLabel}>{upper(tr('play.onb.aiField'))}</Text>
        <Animated.View style={[styles.typedRow, fade]}>
          {[...theme].map((ch, i) => (
            <TypedChar key={i} t={t} at={typed[0] + ((typed[1] - typed[0]) * i) / Math.max(1, theme.length)} ch={ch} />
          ))}
        </Animated.View>
      </View>
      <Animated.View style={[styles.wandButton, { top: btnTop }, buttonStyle]}>
        <LinearGradient colors={['#7C5CFF', '#B45CFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Animated.View style={sparkle}>
          <Ionicons name="sparkles" size={18} color="#FFE07A" />
        </Animated.View>
        <Text style={styles.addText}>{tr('play.onb.aiButton')}</Text>
      </Animated.View>
      {AI_CARDS.map((name, i) => (
        <AiCard
          key={name}
          t={t}
          at={2300 + i * 280}
          left={gridLeft + (i % 3) * (c + gap)}
          top={gridTop + Math.floor(i / 3) * (c + 26)}
          size={c}
          color={AI_COLORS[i]}
          name={name}
          label={names[i] ?? ''}
        />
      ))}
      <Animated.View style={[styles.doneChip, { top: gridTop + 2 * (c + 26) + 4 }, done]}>
        <Ionicons name="checkmark-circle" size={16} color="#2EAD6B" />
        <Text style={styles.doneText}>{tr('play.onb.aiDone')}</Text>
      </Animated.View>
      <Finger pressed={pressed} style={fingerStyle} />
    </Stage>
  );
}

function TypedChar({ t, at, ch }: { t: SharedValue<number>; at: number; ch: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: step(t.value, CREATE_DURATION, at, at + 60, false) - step(t.value, CREATE_DURATION, 6600, 7000),
  }));
  return <Animated.Text style={[styles.typed, style]}>{ch}</Animated.Text>;
}

function AiCard({ t, at, left, top, size, color, name, label }: { t: SharedValue<number>; at: number; left: number; top: number; size: number; color: string; name: Picture; label: string }) {
  // A placeholder shimmering while the AI draws, then the card pops over it.
  const slot = useAnimatedStyle(() => {
    const shown = step(t.value, CREATE_DURATION, 2000, 2200) - step(t.value, CREATE_DURATION, 6600, 7000);
    const shimmer = 0.5 + 0.5 * Math.sin(t.value * CREATE_DURATION * 0.008);
    return { opacity: shown * (0.35 + shimmer * 0.25) };
  });
  const card = useAnimatedStyle(() => ({
    opacity: 1 - step(t.value, CREATE_DURATION, 6600, 7000),
    transform: [{ scale: pop(t.value, CREATE_DURATION, at, at + 420) }],
  }));
  return (
    <View style={[styles.abs, { left, top, width: size, alignItems: 'center', gap: 4 }]}>
      <View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.slot, { borderRadius: size * 0.2 }, slot]} />
        <Animated.View style={card}>
          <PictureCard size={size} color={color} name={name} />
        </Animated.View>
      </View>
      <Animated.Text numberOfLines={1} style={[styles.cardLabel, card]}>
        {label}
      </Animated.Text>
    </View>
  );
}

const CUSTOM_LABELS = ['play.onb.tierTop', 'play.onb.tierGood', 'play.onb.tierOk', 'play.onb.tierMeh', 'play.onb.tierYuck'];
const CUSTOM_COLORS = ['#FF5F8F', '#FF9A5B', '#FFD15C', '#8FD3A8', '#8A93A6'];
const TIER_CARDS: Picture[][] = [['strawberry', 'mango'], ['cherry', 'peach', 'watermelon'], ['pineapple', 'banana'], ['kiwi'], ['lemon']];
const TIERS_DURATION = 6000;

/** Customisation: the real "Fruits" list, whose tiers take their own names and colours. */
export function TiersScene({ width: W, height: H, active }: Props) {
  const t = useLoop(active, TIERS_DURATION);
  const { t: tr } = useT();
  const rowH = Math.round(H / 7.4);
  const labelW = Math.round(W * 0.3);
  const c = rowH - 8;
  const top = 58;
  const mix = useDerivedValue(() => step(t.value, TIERS_DURATION, 1200, 2000) - step(t.value, TIERS_DURATION, 4200, 5000));

  return (
    <Stage width={W} height={H}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{tr('play.onb.fruits')}</Text>
        <Ionicons name="color-palette-outline" size={16} color={colors.textMuted} />
      </View>
      <Rows top={top} rowH={rowH} labelW={labelW}>
        {(i) => <TierLabel mix={mix} i={i} rowH={rowH} />}
      </Rows>
      {TIER_CARDS.flatMap((row, i) =>
        row.map((name, j) => (
          <View key={name} style={[styles.abs, { left: labelW + 4 + j * (c + 4), top: top + i * (rowH + 2) + 4 }]}>
            <PictureCard size={c} color={CARD_COLORS[0]} name={name} />
          </View>
        )),
      )}
    </Stage>
  );
}

function TierLabel({ mix, i, rowH }: { mix: SharedValue<number>; i: number; rowH: number }) {
  const { t: tr } = useT();
  // Custom colour fading in over the classic one.
  const bg = useAnimatedStyle(() => ({ opacity: mix.value }));
  const classic = useAnimatedStyle(() => ({ opacity: 1 - mix.value, transform: [{ translateY: -mix.value * 10 }] }));
  const custom = useAnimatedStyle(() => ({ opacity: mix.value, transform: [{ translateY: (1 - mix.value) * 10 }] }));
  return (
    <View style={[styles.label, { backgroundColor: TIER_COLORS[i] }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: CUSTOM_COLORS[i] }, bg]} />
      <Animated.Text style={[styles.labelText, styles.absCenter, { fontSize: rowH * 0.4 }, classic]}>{'SABCD'[i]}</Animated.Text>
      <Animated.Text numberOfLines={1} adjustsFontSizeToFit style={[styles.customText, styles.absCenter, custom]}>
        {tr(CUSTOM_LABELS[i])}
      </Animated.Text>
    </View>
  );
}

/** The player, as the welcome screens show them: the crown comes with a week of daily lists. */
const ME: AvatarConfig = { ...DEFAULT_AVATAR, hair: 'curly', hairColor: 'chestnut', glasses: 'round', bg: 'sky' };
const ME_CROWNED: AvatarConfig = { ...ME, hat: 'crown' };
const FRIEND: AvatarConfig = { ...DEFAULT_AVATAR, hair: 'long', hairColor: 'red', eyes: 'green', skin: 'p1', mouth: 'grin', bg: 'coral' };
const DAILY_CARDS: Picture[] = ['croissant', 'pain-au-chocolat', 'waffle'];
const DAILY_DURATION = 6200;

/** Daily tier list: the real card of a day, the week filling up, and the crown it earns. */
export function DailyScene({ width: W, height: H, active }: Props) {
  const t = useLoop(active, DAILY_DURATION);
  const { t: tr, upper } = useT();
  // The week's initials, Monday first, in one text so each language spells its own.
  const week = tr('play.onb.weekDays').split(',');
  const avatar = Math.round(Math.min(W * 0.2, H * 0.18));
  const shine = useAnimatedStyle(() => ({
    transform: [{ translateX: -120 + step(t.value, DAILY_DURATION, 300, 1300) * (W + 160) }, { skewX: '-20deg' }],
  }));
  const crowned = useAnimatedStyle(() => ({ opacity: step(t.value, DAILY_DURATION, 3500, 3700) - step(t.value, DAILY_DURATION, 5800, 6100) }));
  const bounce = useAnimatedStyle(() => {
    const p = step(t.value, DAILY_DURATION, 3500, 3900, false);
    return { transform: [{ scale: 1 + Math.sin(p * Math.PI) * 0.12 }] };
  });
  const reward = useAnimatedStyle(() => {
    const p = step(t.value, DAILY_DURATION, 3700, 4000) - step(t.value, DAILY_DURATION, 5800, 6100);
    return { opacity: p, transform: [{ scale: 0.8 + p * 0.2 }] };
  });
  return (
    <Stage width={W} height={H} style={{ padding: 16, gap: 18, justifyContent: 'center' }}>
      <LinearGradient colors={['#7C5CFF', '#B45CFF', '#FF7FB0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.daily}>
        <Image source={IMAGES.croissant} style={styles.dailyImage} />
        <View style={{ flex: 1 }}>
          <Text style={styles.dailyKicker}>{upper(tr('play.onb.dailyKicker'))}</Text>
          <Text style={styles.dailyTitle}>{tr('play.onb.dailyTitle')}</Text>
        </View>
        <View style={styles.dailyArrow}>
          <Ionicons name="arrow-forward" size={20} color="#7C5CFF" />
        </View>
        <Animated.View style={[styles.shine, shine]} />
      </LinearGradient>
      <View style={styles.dailyCards}>
        {DAILY_CARDS.map((name, i) => (
          <DailyCardPop key={name} t={t} i={i} name={name} />
        ))}
      </View>
      <View style={styles.week}>
        {week.map((d, i) => (
          <DayDot key={i} t={t} i={i} label={d} />
        ))}
      </View>
      <View style={styles.crownRow}>
        <Animated.View style={[{ width: avatar, height: avatar }, bounce]}>
          <AvatarDrawing config={ME} size={avatar} />
          <Animated.View style={[StyleSheet.absoluteFill, crowned]}>
            <AvatarDrawing config={ME_CROWNED} size={avatar} />
          </Animated.View>
        </Animated.View>
        <View style={{ flex: 1, gap: 8 }}>
          <View style={styles.streak}>
            <Text style={styles.streakText}>{tr('play.onb.streak')}</Text>
          </View>
          <Animated.View style={[styles.rewardChip, reward]}>
            <Text style={styles.rewardText}>{tr('play.onb.crown')}</Text>
          </Animated.View>
        </View>
      </View>
    </Stage>
  );
}

function DailyCardPop({ t, i, name }: { t: SharedValue<number>; i: number; name: Picture }) {
  const at = 900 + i * 180;
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop(t.value, DAILY_DURATION, at, at + 380) }] }));
  return (
    <Animated.View style={style}>
      <PictureCard size={52} color={CARD_COLORS[0]} name={name} />
    </Animated.View>
  );
}

function DayDot({ t, i, label }: { t: SharedValue<number>; i: number; label: string }) {
  const at = 1500 + i * 280;
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

const DUEL_DURATION = 7000;

/** Friends: two players face off on the same card, then their agreement shows. */
export function DuelScene({ width: W, height: H, active }: Props) {
  const t = useLoop(active, DUEL_DURATION);
  const { t: tr } = useT();
  const avatar = Math.round(Math.min(W * 0.28, H * 0.24));
  const card = Math.round(avatar * 0.85);
  const out = useDerivedValue(() => step(t.value, DUEL_DURATION, 6400, 6800));
  const left = useAnimatedStyle(() => {
    const p = step(t.value, DUEL_DURATION, 200, 800);
    return { opacity: p - out.value, transform: [{ translateX: (1 - p) * -80 }] };
  });
  const right = useAnimatedStyle(() => {
    const p = step(t.value, DUEL_DURATION, 400, 1000);
    return { opacity: p - out.value, transform: [{ translateX: (1 - p) * 80 }] };
  });
  const vs = useAnimatedStyle(() => ({ opacity: 1 - out.value, transform: [{ scale: pop(t.value, DUEL_DURATION, 1000, 1400) }] }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: 1 - out.value, transform: [{ scale: pop(t.value, DUEL_DURATION, 1600, 2000) }] }));
  const mine = useAnimatedStyle(() => ({ opacity: 1 - out.value, transform: [{ scale: pop(t.value, DUEL_DURATION, 2200, 2500) }] }));
  const theirs = useAnimatedStyle(() => ({ opacity: 1 - out.value, transform: [{ scale: pop(t.value, DUEL_DURATION, 2500, 2800) }] }));
  const score = useAnimatedStyle(() => {
    const p = step(t.value, DUEL_DURATION, 3100, 3600);
    return { opacity: p - out.value, transform: [{ translateY: (1 - p) * 20 }] };
  });
  const bar = useAnimatedStyle(() => ({ width: `${82 * step(t.value, DUEL_DURATION, 3400, 4400)}%` }));

  return (
    <Stage width={W} height={H} style={{ padding: 16, justifyContent: 'center', gap: 18 }}>
      <View style={styles.duelRow}>
        <Animated.View style={[styles.player, left]}>
          <AvatarDrawing config={ME} size={avatar} />
          <Text style={styles.playerName}>{tr('play.onb.you')}</Text>
        </Animated.View>
        <Animated.View style={[styles.vs, vs]}>
          <Text style={styles.vsText}>VS</Text>
        </Animated.View>
        <Animated.View style={[styles.player, right]}>
          <AvatarDrawing config={FRIEND} size={avatar} />
          <Text style={styles.playerName}>{tr('play.onb.friendName')}</Text>
        </Animated.View>
      </View>
      <View style={styles.duelRow}>
        <Animated.View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[0] }, mine]}>
          <Text style={styles.tierBadgeText}>S</Text>
        </Animated.View>
        <Animated.View style={[{ alignItems: 'center', gap: 4 }, cardStyle]}>
          <PictureCard size={card} color="#7A3A4E" name="pizza" />
          <Text style={styles.cardLabel}>{tr('play.onb.duelCard')}</Text>
        </Animated.View>
        <Animated.View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[1] }, theirs]}>
          <Text style={styles.tierBadgeText}>A</Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.duelScore, score]}>
        <Text style={styles.duelScoreValue}>{tr('play.onb.duelScore')}</Text>
        <Text style={styles.duelScoreHint}>{tr('play.onb.duelHint')}</Text>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, bar]} />
        </View>
      </Animated.View>
    </Stage>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute', left: 0, top: 0 },
  absCenter: { position: 'absolute', left: 4, right: 4, textAlign: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingTop: 18 },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  row: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', backgroundColor: colors.surface },
  label: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  labelText: { fontWeight: '900', color: '#111' },
  customText: { color: '#1A1020', fontSize: 14, fontWeight: '900' },
  field: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 54,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    gap: 2,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  typedRow: { flexDirection: 'row' },
  typed: { color: colors.text, fontSize: 17, fontWeight: '700' },
  wandButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 42,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  slot: { backgroundColor: colors.surfaceAlt },
  cardLabel: { color: colors.text, fontSize: 11, fontWeight: '700' },
  doneChip: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(46,173,107,0.14)',
  },
  doneText: { color: '#5FD39A', fontSize: 13, fontWeight: '700' },
  daily: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, overflow: 'hidden' },
  dailyImage: { width: 46, height: 46 },
  dailyKicker: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  dailyTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  dailyArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dailyCards: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  shine: { position: 'absolute', top: -20, bottom: -20, width: 60, backgroundColor: 'rgba(255,255,255,0.35)' },
  week: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  dayCol: { alignItems: 'center', gap: 6 },
  dot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  dotFill: { flex: 1, backgroundColor: '#FF8A3D', alignItems: 'center', justifyContent: 'center' },
  dayLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  crownRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  streak: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,138,61,0.15)' },
  streakText: { color: '#FFB36B', fontSize: 15, fontWeight: '800' },
  rewardChip: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,216,74,0.16)' },
  rewardText: { color: '#FFD84A', fontSize: 14, fontWeight: '800' },
  duelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  player: { alignItems: 'center', gap: 6 },
  playerName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  vs: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  vsText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  tierBadge: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tierBadgeText: { color: '#111', fontSize: 20, fontWeight: '900' },
  duelScore: { alignItems: 'center', gap: 2, backgroundColor: colors.surfaceAlt, borderRadius: 18, padding: 14 },
  duelScoreValue: { color: colors.text, fontSize: 38, fontWeight: '900', letterSpacing: -1 },
  duelScoreHint: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  barTrack: { alignSelf: 'stretch', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.surface },
  barFill: { height: 10, borderRadius: 5, backgroundColor: '#2EAD6B' },
});
