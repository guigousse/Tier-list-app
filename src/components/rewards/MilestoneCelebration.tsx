import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../../constants/theme';
import { MANNEQUIN } from '../../lib/avatar';
import { badgeLabel, chooseBadge, forkQuestion, type Badge } from '../../lib/badges';
import { useT } from '../../lib/i18n/useT';
import { teamLine, type Celebration } from '../../lib/milestoneEvents';
import { partLabel, rewardLabel, withReward, type Reward } from '../../lib/rewards';
import { playComplete, playPop, playSparkle } from '../../lib/sound';
import { useTierStore } from '../../store/useTierStore';
import { Avatar, AvatarDrawing } from '../Avatar';
import { BadgeIcon } from '../BadgeIcon';
import { Clickable } from '../Clickable';
import { Button } from '../ui';

type Point = { x: number; y: number };

/** The colours of the two paths, as on the rewards page (RewardPath). */
const TRACK = {
  lists: { color: '#2EAD6B', label: 'play.track.lists', icon: 'flag' as const },
  flame: { color: '#FF7A1F', label: 'play.track.flame', icon: 'flame' as const },
};
const ITEM = 150;
/** Between the items of a step shown side by side, and the room of each one's halo. */
const ITEM_GAP = 12;
const ITEM_HALO = 16;
const STICKER = 112;
/** Between the two stickers of a VS: the chosen one slides by half of it to the centre. */
const STICKER_GAP = 36;
/** The item's flight to the profile, then the profile's sparkle. */
const FLIGHT_MS = 650;
const SPARKLE_MS = 700;

const haptic = (type: Haptics.NotificationFeedbackType) => {
  if (useTierStore.getState().settings.haptics) Haptics.notificationAsync(type).catch(() => {});
};

/**
 * Steps crossed on a reward path, full screen and one after the other: the line fills
 * up to the step, which bursts, then its rewards. The items of a step come out all
 * together, side by side, and one "Récupérer" sends them all flying to the player's
 * profile, which sparkles; at a VS the player picks a team and confirms, the other
 * sticker pops and the chosen one takes the centre, with its team's line.
 */
export function MilestoneCelebration({ queue, onDone }: { queue: Celebration[]; onDone: () => void }) {
  const { t } = useT();
  const [index, setIndex] = useState(0);
  const event = queue[index];
  // Target of the flights, in window coordinates (measured once the overlay is laid out).
  const avatarRef = useRef<View>(null);
  const [target, setTarget] = useState<Point | null>(null);
  const [sparkle, setSparkle] = useState(0);
  const insets = useSafeAreaInsets();
  const profile = useTierStore((s) => s.profile);

  const measure = () => {
    avatarRef.current?.measureInWindow((x, y, w, h) => setTarget({ x: x + w / 2, y: y + h / 2 }));
  };

  const next = () => {
    if (index + 1 < queue.length) setIndex(index + 1);
    else onDone();
  };

  if (!event) return null;
  const track = TRACK[event.track];

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onShow={measure} onRequestClose={next}>
      <View style={[styles.backdrop, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg }]} onLayout={measure}>
        <View style={styles.top}>
          <View ref={avatarRef} collapsable={false}>
            <ProfileBadge sparkle={sparkle}>
              {profile ? <Avatar avatar={profile.avatar} seed={profile.id} size={52} /> : <Ionicons name="person-circle" size={52} color={colors.textMuted} />}
            </ProfileBadge>
          </View>
          {queue.length > 1 ? (
            <Text style={styles.count}>
              {index + 1} / {queue.length}
            </Text>
          ) : null}
          {/* Keeps the avatar on the left and the count in the middle. */}
          <View style={styles.profile} />
        </View>

        <View key={event.key} style={styles.body}>
          <StepOpening at={event.at} color={track.color} icon={track.icon} label={t(track.label)} />
          {event.kind === 'step' ? (
            <StepReveal key={event.key} rewards={event.rewards} target={target} onArrived={() => setSparkle((n) => n + 1)} onDone={next} />
          ) : (
            <VsReveal key={event.key} event={event} onDone={next} />
          )}
        </View>
      </View>
    </Modal>
  );
}

/** The player's avatar at the top: an item collected lands on it and it sparkles. */
function ProfileBadge({ sparkle, children }: { sparkle: number; children: React.ReactNode }) {
  const scale = useSharedValue(1);
  const ring = useSharedValue(0);
  useEffect(() => {
    if (!sparkle) return;
    scale.value = withSequence(withTiming(1.25, { duration: 140 }), withSpring(1, { damping: 8 }));
    ring.value = 0;
    ring.value = withTiming(1, { duration: SPARKLE_MS, easing: Easing.out(Easing.quad) });
  }, [sparkle, scale, ring]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: (1 - ring.value) * (ring.value > 0 ? 1 : 0), transform: [{ scale: 1 + ring.value * 0.9 }] }));
  return (
    <View style={styles.profile}>
      <Animated.View pointerEvents="none" style={[styles.profileRing, ringStyle]} />
      {sparkle ? SPARKS.map((angle) => <Spark key={`${sparkle}-${angle}`} angle={angle} progress={ring} />) : null}
      <Animated.View style={style}>{children}</Animated.View>
    </View>
  );
}

const SPARKS = Array.from({ length: 8 }, (_, i) => (Math.PI * 2 * i) / 8 + 0.2);

function Spark({ angle, progress, color = '#FFE58A', distance = 46 }: { angle: number; progress: { value: number }; color?: string; distance?: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: progress.value > 0 ? 1 - progress.value : 0,
    transform: [{ translateX: Math.cos(angle) * distance * progress.value }, { translateY: Math.sin(angle) * distance * progress.value }, { scale: 1 - progress.value * 0.6 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.spark, { backgroundColor: color }, style]} />;
}

/** A piece of the path: the line fills up to the step, which bursts in the path's colour. */
function StepOpening({ at, color, icon, label }: { at: number; color: string; icon: 'flag' | 'flame'; label: string }) {
  const { t, upper } = useT();
  const fill = useSharedValue(0);
  const pop = useSharedValue(1);
  const burst = useSharedValue(0);
  const [reached, setReached] = useState(false);
  useEffect(() => {
    const done = () => {
      setReached(true);
      haptic(Haptics.NotificationFeedbackType.Success);
      playSparkle();
    };
    fill.value = withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }, (finished) => {
      if (finished) runOnJS(done)();
    });
    pop.value = withDelay(700, withSequence(withTiming(1.4, { duration: 140 }), withSpring(1, { damping: 7 })));
    burst.value = withDelay(700, withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }));
  }, [fill, pop, burst]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const nodeStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <View style={styles.opening}>
      <View style={styles.trackRow}>
        <View style={styles.line}>
          <Animated.View style={[styles.lineFill, { backgroundColor: color }, fillStyle]} />
        </View>
        <View style={styles.nodeBox}>
          {SPARKS.map((angle) => (
            <Spark key={angle} angle={angle} progress={burst} color={color} distance={52} />
          ))}
          <Animated.View style={[styles.node, { backgroundColor: reached ? color : colors.surfaceAlt, borderColor: color }, nodeStyle]}>
            <Text style={styles.nodeText}>{at}</Text>
          </Animated.View>
        </View>
      </View>
      {reached ? (
        <Animated.View entering={FadeInDown.springify().damping(14)} style={{ alignItems: 'center', gap: 4 }}>
          <Text style={styles.title}>{t('play.cel.reached', { at })}</Text>
          <View style={styles.trackLabel}>
            <Ionicons name={icon} size={14} color={color} />
            <Text style={[styles.trackLabelText, { color }]}>{upper(label)}</Text>
          </View>
        </Animated.View>
      ) : (
        <View style={{ height: 52 }} />
      )}
    </View>
  );
}

/** Waits for the opening, then shows its children. */
function useRevealed(delay = 1200) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return shown;
}

/**
 * Width of each item's mannequin, for `count` items side by side on a screen `width`
 * wide: full size alone, smaller to fit three in a row on the narrowest phone.
 */
export function itemSize(count: number, width: number): number {
  const room = width - spacing.lg * 2 - ITEM_GAP * (count - 1);
  return Math.min(ITEM, Math.floor(room / count) - ITEM_HALO);
}

/**
 * The items of a step on the grey mannequin, all revealed at once; "Récupérer" sends
 * them all flying to the profile, which sparkles once the last one has landed.
 */
function StepReveal({ rewards, target, onArrived, onDone }: { rewards: Reward[]; target: Point | null; onArrived: () => void; onDone: () => void }) {
  const { t } = useT();
  const shown = useRevealed();
  const { width } = useWindowDimensions();
  const size = itemSize(rewards.length, width);
  const [collecting, setCollecting] = useState(false);
  const landed = useRef(0);

  const land = () => {
    landed.current += 1;
    if (landed.current < rewards.length) return;
    onArrived();
    playComplete();
    haptic(Haptics.NotificationFeedbackType.Success);
    setTimeout(onDone, SPARKLE_MS + 300);
  };

  if (!shown) return <View style={styles.reveal} />;
  return (
    <View style={styles.reveal}>
      {rewards.length > 1 ? (
        <Animated.View entering={FadeIn}>
          <Text style={styles.kicker}>{t('play.cel.newItems', { count: rewards.length })}</Text>
        </Animated.View>
      ) : null}
      <View style={styles.itemRow}>
        {rewards.map((reward) => (
          <RevealedItem key={`${reward.part}:${reward.id}`} reward={reward} size={size} big={rewards.length === 1} flying={collecting} target={target} onLanded={land} />
        ))}
      </View>
      <Animated.View entering={FadeInDown.delay(450)} style={styles.actions}>
        <Button label={t('play.cel.collect')} icon="download-outline" onPress={() => setCollecting(true)} disabled={collecting} />
      </Animated.View>
    </View>
  );
}

/** One item of a step, haloed, its name under it; `flying`: off to the profile. */
function RevealedItem({
  reward,
  size,
  big,
  flying,
  target,
  onLanded,
}: {
  reward: Reward;
  size: number;
  big: boolean;
  flying: boolean;
  target: Point | null;
  onLanded: () => void;
}) {
  const { upper } = useT();
  const config = useMemo(() => withReward(MANNEQUIN, reward), [reward]);
  const box = useRef<View>(null);
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const glow = useSharedValue(0);
  const fade = useSharedValue(1);
  useEffect(() => {
    glow.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [glow]);
  useEffect(() => {
    if (!flying) return;
    // The halo and the name go with the item.
    fade.value = withTiming(0, { duration: 200 });
    box.current?.measureInWindow((x, y, w, h) => {
      const to = target ?? { x: x + w / 2, y: y - 200 };
      const ease = Easing.inOut(Easing.cubic);
      dx.value = withTiming(to.x - (x + w / 2), { duration: FLIGHT_MS, easing: ease });
      dy.value = withTiming(to.y - (y + h / 2), { duration: FLIGHT_MS, easing: Easing.in(Easing.quad) });
      scale.value = withTiming(0.25, { duration: FLIGHT_MS, easing: ease });
      opacity.value = withDelay(
        FLIGHT_MS - 120,
        withTiming(0, { duration: 120 }, (finished) => {
          if (finished) runOnJS(onLanded)();
        }),
      );
    });
    // Measured once, when "Récupérer" is pressed: the flight doesn't restart on a new render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flying]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateX: dx.value }, { translateY: dy.value }, { scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: (0.08 + glow.value * 0.12) * fade.value, transform: [{ scale: 1 + glow.value * 0.08 }] }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const halo = size + (big ? 30 : ITEM_HALO - 4);

  return (
    <View style={[styles.item, { width: size + ITEM_HALO }]}>
      <Animated.View entering={ZoomIn.springify().damping(11)} style={[styles.itemStage, { width: size + (big ? 40 : ITEM_HALO), height: size + (big ? 40 : ITEM_HALO) }]}>
        <Animated.View pointerEvents="none" style={[styles.itemGlow, { width: halo, height: halo, borderRadius: halo / 2 }, glowStyle]} />
        <Animated.View ref={box} collapsable={false} style={style}>
          <AvatarDrawing config={config} size={size} focus={reward.part} />
        </Animated.View>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(250)} style={[{ alignItems: 'center', gap: 2 }, labelStyle]}>
        <Text numberOfLines={1} style={styles.kicker}>
          {upper(partLabel(reward.part))}
        </Text>
        <Text numberOfLines={2} style={[styles.name, !big && styles.nameSmall]}>
          {rewardLabel(reward)}
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * A VS: one button per team; the choice is confirmed, then the other sticker pops and
 * the chosen one slides to the centre, a little bigger, with its team's line.
 */
function VsReveal({ event, onDone }: { event: Extract<Celebration, { kind: 'vs' }>; onDone: () => void }) {
  const { t } = useT();
  const shown = useRevealed();
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const [chosen, setChosen] = useState<0 | 1 | null>(null);
  const { fork } = event;

  const confirm = () => {
    if (picked === null) return;
    setChosen(picked);
    chooseBadge(fork, fork.options[picked]);
    playPop();
    haptic(Haptics.NotificationFeedbackType.Success);
  };

  if (!shown) return <View style={styles.reveal} />;
  return (
    <View style={styles.reveal}>
      <Animated.View entering={FadeIn}>
        <Text style={styles.question}>{forkQuestion(fork)}</Text>
      </Animated.View>
      <View style={styles.vsRow}>
        {fork.options.map((badge, side) => (
          <VsSticker
            key={badge.id}
            badge={badge}
            side={side as 0 | 1}
            picked={picked === side}
            outcome={chosen === null ? null : chosen === side ? 'won' : 'popped'}
          />
        ))}
        {chosen === null ? (
          <View pointerEvents="none" style={styles.vsMark}>
            <Text style={styles.vsText}>VS</Text>
          </View>
        ) : null}
      </View>
      {chosen === null ? (
        <>
          <View style={styles.teamRow}>
            {fork.options.map((badge, side) => (
              <Clickable
                key={badge.id}
                accessibilityRole="button"
                accessibilityState={{ selected: picked === side }}
                onPress={() => setPicked(side as 0 | 1)}
                style={({ pressed }) => [styles.team, picked === side && { backgroundColor: badge.glow, borderColor: badge.glow }, pressed && { opacity: 0.85 }]}
              >
                {picked === side ? <Ionicons name="checkmark-circle" size={16} color="#111111" /> : null}
                <Text numberOfLines={1} style={[styles.teamText, picked === side && { color: '#111111' }]}>
                  {badgeLabel(badge)}
                </Text>
              </Clickable>
            ))}
          </View>
          <View style={styles.actions}>
            {picked !== null ? (
              <Animated.View entering={ZoomIn.springify().damping(12)}>
                <Button label={t('play.cel.confirm', { name: badgeLabel(fork.options[picked]) })} icon="checkmark" onPress={confirm} />
              </Animated.View>
            ) : (
              <Text style={styles.hint}>{t('play.cel.pickHint')}</Text>
            )}
            <Clickable accessibilityRole="button" onPress={onDone} hitSlop={8}>
              <Text style={styles.later}>{t('play.cel.later')}</Text>
            </Clickable>
          </View>
        </>
      ) : (
        <>
          <Animated.View entering={FadeInDown.delay(700).springify().damping(14)}>
            <Text style={styles.teamLine}>{teamLine(fork.options[chosen].id)}</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(1100)} style={styles.actions}>
            <Button label={t('play.cel.continue')} onPress={onDone} />
          </Animated.View>
        </>
      )}
    </View>
  );
}

function VsSticker({ badge, side, picked, outcome }: { badge: Badge; side: 0 | 1; picked: boolean; outcome: 'won' | 'popped' | null }) {
  const wiggle = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const shift = useSharedValue(0);
  const burst = useSharedValue(0);
  useEffect(() => {
    wiggle.value = withRepeat(withTiming(1, { duration: 520 + side * 90, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [wiggle, side]);
  useEffect(() => {
    if (outcome === 'popped') {
      scale.value = withSequence(withTiming(1.3, { duration: 110 }), withTiming(0.1, { duration: 130 }));
      opacity.value = withDelay(140, withTiming(0, { duration: 100 }));
      burst.value = withDelay(150, withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }));
    } else if (outcome === 'won') {
      // To the centre of the row, a little bigger.
      const toCentre = ((STICKER + STICKER_GAP) / 2) * (side === 0 ? 1 : -1);
      shift.value = withDelay(260, withSpring(toCentre, { damping: 14 }));
      scale.value = withDelay(260, withSpring(1.3, { damping: 10 }));
    }
  }, [outcome, scale, opacity, shift, burst, side]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: shift.value },
      { scale: scale.value * (picked && outcome === null ? 1.08 : 1) },
      { rotate: `${outcome === 'won' ? 0 : (wiggle.value * 2 - 1) * 6 * (side === 0 ? 1 : -1)}deg` },
    ],
  }));
  return (
    <View style={styles.sticker}>
      {outcome === 'popped' ? SPARKS.map((a, k) => <Spark key={a} angle={a} progress={burst} color={k % 2 ? '#FFFFFF' : badge.glow} distance={70} />) : null}
      <Animated.View style={style}>
        <BadgeIcon badge={badge} size={STICKER} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8, 9, 14, 0.985)', paddingHorizontal: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  profile: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  profileRing: { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: '#FFE58A' },
  spark: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  body: { flex: 1, justifyContent: 'center', gap: spacing.xl },
  opening: { alignItems: 'center', gap: spacing.md },
  trackRow: { flexDirection: 'row', alignItems: 'center', width: 240 },
  line: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  lineFill: { height: '100%', borderRadius: 4 },
  nodeBox: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginLeft: -4 },
  node: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  nodeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  trackLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trackLabelText: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  reveal: { alignItems: 'center', gap: spacing.md, minHeight: 320 },
  itemRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: ITEM_GAP },
  item: { alignItems: 'center', gap: spacing.xs },
  itemStage: { alignItems: 'center', justifyContent: 'center' },
  itemGlow: { position: 'absolute', backgroundColor: '#FFE58A' },
  kicker: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  name: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  nameSmall: { fontSize: 15 },
  actions: { alignItems: 'center', gap: spacing.md, marginTop: spacing.md, alignSelf: 'stretch' },
  question: { color: colors.text, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  vsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: STICKER_GAP, height: STICKER + 50 },
  vsMark: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: colors.primary },
  vsText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  sticker: { width: STICKER, height: STICKER, alignItems: 'center', justifyContent: 'center' },
  teamRow: { flexDirection: 'row', gap: STICKER_GAP / 2, justifyContent: 'center' },
  team: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: STICKER + STICKER_GAP / 2,
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  teamText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  hint: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  later: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  teamLine: { color: colors.text, fontSize: 18, fontWeight: '700', fontStyle: 'italic', textAlign: 'center', marginTop: spacing.lg },
});
