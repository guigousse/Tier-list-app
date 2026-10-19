import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
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
import { claimListCredits } from '../../lib/api';
import { MANNEQUIN } from '../../lib/avatar';
import { badgeLabel, chooseBadge, forkQuestion, type Badge } from '../../lib/badges';
import { BURST, coinTimes, counterAt } from '../../lib/celebration';
import { setBalance, useCredits, walletForRequest } from '../../lib/credits';
import { useT } from '../../lib/i18n/useT';
import { creditsShow, teamLine, type Celebration } from '../../lib/milestoneEvents';
import { partLabel, rewardLabel, withReward } from '../../lib/rewards';
import { playCoin, playComplete, playPop, playSparkle, playThunder } from '../../lib/sound';
import { useTierStore } from '../../store/useTierStore';
import { Avatar, AvatarDrawing } from '../Avatar';
import { BadgeIcon } from '../BadgeIcon';
import { Clickable } from '../Clickable';
import { EnergyIcon } from '../Energy';
import { PurchaseBurst } from '../PurchaseBurst';
import { Button } from '../ui';

type Point = { x: number; y: number };

/** The colours of the two paths, as on the rewards page (RewardPath). */
const TRACK = {
  lists: { color: '#2EAD6B', label: 'play.track.lists', icon: 'flag' as const },
  flame: { color: '#FF7A1F', label: 'play.track.flame', icon: 'flame' as const },
};
const ITEM = 150;
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
 * up to the step, which bursts, then the reward. An item is collected ("Récupérer")
 * and flies to the player's profile, which sparkles; credits fly to the balance, which
 * counts up; at a VS the player picks a team and confirms, the other sticker pops and
 * the chosen one takes the centre, with its team's line.
 */
export function MilestoneCelebration({ queue, onDone }: { queue: Celebration[]; onDone: () => void }) {
  const { t } = useT();
  const [index, setIndex] = useState(0);
  const event = queue[index];
  // Targets of the flights, in window coordinates (measured once the overlay is laid out).
  const avatarRef = useRef<View>(null);
  const balanceRef = useRef<View>(null);
  const [targets, setTargets] = useState<{ avatar: Point; balance: Point } | null>(null);
  const [sparkle, setSparkle] = useState(0);
  const insets = useSafeAreaInsets();
  const profile = useTierStore((s) => s.profile);
  const balance = useCredits((s) => s.balance);
  const [shownBalance, setShownBalance] = useState<number | null>(null);
  // Drawn over the whole screen: its points are in window coordinates.
  const [burst, setBurst] = useState<{ key: number; from: Point; to: Point } | null>(null);

  const measure = () => {
    avatarRef.current?.measureInWindow((ax, ay, aw, ah) => {
      balanceRef.current?.measureInWindow((bx, by, bw, bh) => {
        setTargets({ avatar: { x: ax + aw / 2, y: ay + ah / 2 }, balance: { x: bx + bh / 2, y: by + bh / 2 } });
      });
    });
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
          <View ref={balanceRef} collapsable={false} style={styles.pill}>
            <EnergyIcon size={18} />
            <Text style={styles.pillText}>{shownBalance ?? balance ?? '–'}</Text>
          </View>
        </View>

        <View key={event.key} style={styles.body}>
          <StepOpening at={event.at} color={track.color} icon={track.icon} label={t(track.label)} />
          {event.kind === 'item' ? (
            <ItemReveal key={event.key} event={event} target={targets?.avatar ?? null} onArrived={() => setSparkle((n) => n + 1)} onDone={next} />
          ) : event.kind === 'credits' ? (
            <CreditsReveal
              key={event.key}
              credits={event.credits}
              target={targets?.balance ?? null}
              onCount={setShownBalance}
              onBurst={(from, to) => setBurst({ key: Date.now(), from, to })}
              onDone={next}
            />
          ) : (
            <VsReveal key={event.key} event={event} onDone={next} />
          )}
        </View>
        {burst ? <PurchaseBurst key={burst.key} from={burst.from} to={burst.to} /> : null}
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

/** An avatar item on the grey mannequin; "Récupérer" sends it flying to the profile. */
function ItemReveal({
  event,
  target,
  onArrived,
  onDone,
}: {
  event: Extract<Celebration, { kind: 'item' }>;
  target: Point | null;
  onArrived: () => void;
  onDone: () => void;
}) {
  const { t, upper } = useT();
  const shown = useRevealed();
  const config = useMemo(() => withReward(MANNEQUIN, event.reward), [event.reward]);
  const box = useRef<View>(null);
  const [collecting, setCollecting] = useState(false);
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const glow = useSharedValue(0);
  useEffect(() => {
    if (shown) glow.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [shown, glow]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateX: dx.value }, { translateY: dy.value }, { scale: scale.value }] }));
  const fade = useSharedValue(1);
  const glowStyle = useAnimatedStyle(() => ({ opacity: (0.08 + glow.value * 0.12) * fade.value, transform: [{ scale: 1 + glow.value * 0.08 }] }));

  const collect = () => {
    if (collecting) return;
    setCollecting(true);
    // The halo goes with the item.
    fade.value = withTiming(0, { duration: 200 });
    const arrive = () => {
      onArrived();
      playComplete();
      haptic(Haptics.NotificationFeedbackType.Success);
      setTimeout(onDone, SPARKLE_MS + 300);
    };
    box.current?.measureInWindow((x, y, w, h) => {
      const to = target ?? { x: x + w / 2, y: y - 200 };
      const ease = Easing.inOut(Easing.cubic);
      dx.value = withTiming(to.x - (x + w / 2), { duration: FLIGHT_MS, easing: ease });
      dy.value = withTiming(to.y - (y + h / 2), { duration: FLIGHT_MS, easing: Easing.in(Easing.quad) });
      scale.value = withTiming(0.25, { duration: FLIGHT_MS, easing: ease });
      opacity.value = withDelay(FLIGHT_MS - 120, withTiming(0, { duration: 120 }, (finished) => {
        if (finished) runOnJS(arrive)();
      }));
    });
  };

  if (!shown) return <View style={styles.reveal} />;
  return (
    <View style={styles.reveal}>
      <Animated.View entering={ZoomIn.springify().damping(11)} style={styles.itemStage}>
        <Animated.View pointerEvents="none" style={[styles.itemGlow, glowStyle]} />
        <Animated.View ref={box} collapsable={false} style={style}>
          <AvatarDrawing config={config} size={ITEM} focus={event.reward.part} />
        </Animated.View>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(250)} style={{ alignItems: 'center', gap: 2 }}>
        <Text style={styles.kicker}>{upper(partLabel(event.reward.part))}</Text>
        <Text style={styles.name}>{rewardLabel(event.reward)}</Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(450)} style={styles.actions}>
        <Button label={t('play.cel.collect')} icon="download-outline" onPress={collect} disabled={collecting} />
      </Animated.View>
    </View>
  );
}

/** Credits: "Récupérer" sends bolts to the balance, which counts up while coins ring. */
function CreditsReveal({
  credits,
  target,
  onCount,
  onBurst,
  onDone,
}: {
  credits: number;
  target: Point | null;
  onCount: (value: number | null) => void;
  onBurst: (from: Point, to: Point) => void;
  onDone: () => void;
}) {
  const { t } = useT();
  const shown = useRevealed();
  const box = useRef<View>(null);
  const [collecting, setCollecting] = useState(false);
  const [later, setLater] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const collect = async () => {
    if (collecting) return;
    setCollecting(true);
    const before = useCredits.getState().balance ?? 0;
    // The server pays the credits of the path; asked now, so the balance shows them.
    let claimed: number | null = null;
    try {
      const { deviceId } = useTierStore.getState();
      claimed = await claimListCredits(deviceId, await walletForRequest());
    } catch {
      // Offline: paid at the next launch, and the counter doesn't pretend otherwise.
    }
    const { from, to: after, paid } = creditsShow(before, claimed, credits);
    setLater(!paid);
    onCount(from);
    box.current?.measureInWindow((x, y, w, h) => {
      onBurst({ x: x + w / 2, y: y + h / 2 }, target ?? { x: x + w / 2, y: y - 240 });
      playThunder();
      haptic(Haptics.NotificationFeedbackType.Success);
      for (const at of coinTimes()) timers.current.push(setTimeout(playCoin, at));
      const start = Date.now() + BURST.arrive;
      const tick = () => {
        const progress = (Date.now() - start) / BURST.count;
        if (progress >= 0) onCount(counterAt(from, after, progress));
        if (progress < 1) timers.current.push(setTimeout(tick, 33));
        else {
          setBalance(after);
          onCount(null);
          timers.current.push(setTimeout(onDone, 500));
        }
      };
      timers.current.push(setTimeout(tick, BURST.arrive));
    });
  };

  if (!shown) return <View style={styles.reveal} />;
  return (
    <View style={styles.reveal}>
      <Animated.View ref={box} collapsable={false} entering={ZoomIn.springify().damping(10)} style={styles.credits}>
        <Text style={styles.creditsText}>+{credits}</Text>
        <EnergyIcon size={56} />
      </Animated.View>
      <Animated.View entering={FadeIn.delay(250)}>
        <Text style={styles.name}>{later ? t('play.cel.creditsLater') : t('play.cel.creditsGiven', { count: credits })}</Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(450)} style={styles.actions}>
        <Button label={t('play.cel.collect')} icon="download-outline" onPress={collect} disabled={collecting} />
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
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255, 212, 59, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 212, 59, 0.4)' },
  pillText: { color: '#FFE58A', fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
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
  itemStage: { width: ITEM + 40, height: ITEM + 40, alignItems: 'center', justifyContent: 'center' },
  itemGlow: { position: 'absolute', width: ITEM + 30, height: ITEM + 30, borderRadius: (ITEM + 30) / 2, backgroundColor: '#FFE58A' },
  kicker: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  name: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  actions: { alignItems: 'center', gap: spacing.md, marginTop: spacing.md, alignSelf: 'stretch' },
  credits: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  creditsText: { color: '#FFE58A', fontSize: 72, fontWeight: '900', letterSpacing: -2 },
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
