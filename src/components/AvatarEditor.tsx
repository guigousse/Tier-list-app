import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../constants/theme';
import {
  BACKGROUNDS,
  BEARDS,
  BROWS,
  EYE_COLORS,
  EYE_SHAPES,
  FACES,
  GLASSES,
  HAIR_COLORS,
  HAIR_STYLES,
  HATS,
  MOUTHS,
  canReachStep,
  isUnlocked,
  itemLabel,
  randomAvatar,
  SKINS,
  unlockLabel,
  type AvatarConfig,
  type AvatarZoom,
  type Background,
  type Progress,
  type Unlock,
} from '../lib/avatar';
import { useT } from '../lib/i18n/useT';
import { playTick } from '../lib/sound';
import { useProgress as usePlayerProgress } from '../lib/progress';
import { useTierStore } from '../store/useTierStore';
import { AvatarDrawing } from './Avatar';
import { AvatarBackdrop } from './AvatarBackdrop';
import { Clickable } from './Clickable';
import { Button, IconButton } from './ui';

type Option = { id: string; label: string; unlock?: Unlock; fill?: string };

/** One carousel: the items of a part of the avatar, and how to show each one. */
type Category = {
  key: keyof AvatarConfig;
  /** Text key of its tab's name. */
  label: string;
  items: Option[];
  /** Thumbnail: the avatar wearing it, or a colour swatch / eye. */
  thumb: 'avatar' | 'swatch' | 'eye';
  /** Close-up for small details (eyes, mouth). */
  zoom?: AvatarZoom;
};

const EYES_ZOOM: AvatarZoom = { x: 36, y: 40, size: 48 };
const MOUTH_ZOOM: AvatarZoom = { x: 40, y: 56, size: 40 };
const BEARD_ZOOM: AvatarZoom = { x: 30, y: 46, size: 60 };

type StepIcon = keyof typeof MaterialCommunityIcons.glyphMap;

// Titles and tab names are text keys, read in the language of the moment.
const STEPS: { title: string; icon: StepIcon; categories: Category[] }[] = [
  {
    title: 'play.ae.step.face',
    icon: 'face-man-outline',
    categories: [
      { key: 'face', label: 'play.ae.shape', items: FACES, thumb: 'avatar' },
      { key: 'skin', label: 'play.ae.skin', items: SKINS, thumb: 'swatch' },
    ],
  },
  {
    title: 'play.ae.step.hair',
    icon: 'content-cut',
    categories: [
      { key: 'hair', label: 'play.ae.cut', items: HAIR_STYLES, thumb: 'avatar' },
      { key: 'hairColor', label: 'play.ae.color', items: HAIR_COLORS, thumb: 'swatch' },
    ],
  },
  {
    title: 'play.ae.step.eyes',
    icon: 'eye-outline',
    categories: [
      { key: 'eyeShape', label: 'play.ae.shape', items: EYE_SHAPES, thumb: 'avatar', zoom: EYES_ZOOM },
      { key: 'eyes', label: 'play.ae.color', items: EYE_COLORS, thumb: 'eye' },
      { key: 'brows', label: 'play.ae.brows', items: BROWS, thumb: 'avatar', zoom: EYES_ZOOM },
    ],
  },
  {
    title: 'play.ae.step.mouth',
    icon: 'mustache',
    categories: [
      { key: 'mouth', label: 'play.ae.mouth', items: MOUTHS, thumb: 'avatar', zoom: MOUTH_ZOOM },
      { key: 'beard', label: 'play.ae.facialHair', items: BEARDS, thumb: 'avatar', zoom: BEARD_ZOOM },
    ],
  },
  {
    title: 'play.ae.step.accessories',
    icon: 'hat-fedora',
    categories: [
      { key: 'hat', label: 'play.ae.hat', items: HATS, thumb: 'avatar' },
      { key: 'glasses', label: 'play.ae.glasses', items: GLASSES, thumb: 'avatar' },
    ],
  },
  { title: 'play.ae.step.bg', icon: 'image-filter-hdr', categories: [{ key: 'bg', label: 'play.ae.bg', items: BACKGROUNDS, thumb: 'swatch' }] },
];

/** Thumbnails of avatars: hairstyles are shown without a hat, to see them. */
const thumbPatch: Partial<Record<keyof AvatarConfig, Partial<AvatarConfig>>> = { face: { hat: 'none' }, hair: { hat: 'none' }, glasses: { hat: 'none' }, brows: { glasses: 'none' }, eyeShape: { glasses: 'none' } };

const ITEM = 80;

/** Give it a new `key` at each opening, to start again from `initial`. */
type Props = {
  visible: boolean;
  /** Look to start from. */
  initial: AvatarConfig;
  onDone: (config: AvatarConfig) => void;
  onClose: () => void;
};

/** What unlocks `option`, if it's still locked. Items already worn stay available. */
function lockFor(key: keyof AvatarConfig, option: Option, progress: Progress, initial: AvatarConfig): Unlock | undefined {
  return isUnlocked(option, progress) || initial[key] === option.id ? undefined : option.unlock;
}

/** What the player has done so far, for locked items. */
function useProgress(): Progress {
  const { bestStreak, completed } = usePlayerProgress();
  return useMemo(() => ({ bestStreak, completed }), [bestStreak, completed]);
}

/**
 * Avatar editor in steps (face, hair, eyes, mouth and beard, accessories, background). The
 * avatar sits in the middle; swiping it, or scrolling the carousel below, puts on
 * the previous or next item at once. Locked items can be tried on, not kept.
 */
export function AvatarEditor({ visible, initial, onDone, onClose }: Props) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const progress = useProgress();
  const haptics = useTierStore((s) => s.settings.haptics);
  const [step, setStep] = useState(0);
  const [tab, setTab] = useState(0);
  const [config, setConfig] = useState(initial);

  const current = STEPS[step];
  const category = current.categories[Math.min(tab, current.categories.length - 1)];
  const index = Math.max(0, category.items.findIndex((i) => i.id === config[category.key]));
  const item = category.items[index];

  const lockOf = (key: keyof AvatarConfig, option: Option) => lockFor(key, option, progress, initial);

  // A locked item tried on in any part blocks going further.
  const blocking = STEPS.flatMap((s) => s.categories).find((c) => {
    const worn = c.items.find((i) => i.id === config[c.key]);
    return worn && lockFor(c.key, worn, progress, initial);
  });

  const select = (i: number) => {
    const next = category.items[(i + category.items.length) % category.items.length];
    if (next.id === config[category.key]) return;
    // A tick for each item passed, like the notches of a wheel.
    if (haptics) Haptics.selectionAsync().catch(() => {});
    playTick();
    setConfig((c) => ({ ...c, [category.key]: next.id }));
  };

  // Its own step stays open (lib/avatar.ts canReachStep); going there shows its part.
  const blockingStep = blocking ? STEPS.findIndex((s) => s.categories.includes(blocking)) : -1;

  const goTo = (nextStep: number) => {
    setStep(nextStep);
    setTab(nextStep === blockingStep && blocking ? STEPS[nextStep].categories.indexOf(blocking) : 0);
  };

  const lock = lockOf(category.key, item);
  const last = step === STEPS.length - 1;
  const forwardLocked = last ? Boolean(blocking) : !canReachStep(step + 1, blockingStep);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'} onRequestClose={onClose}>
      <GestureHandlerRootView style={[styles.root, { paddingTop: Platform.OS === 'ios' ? spacing.md : insets.top + spacing.sm }]}>
        <View style={styles.header}>
          <IconButton icon="close" label={t('play.ae.close')} onPress={onClose} color={colors.textMuted} />
          <Text style={styles.stepCount} accessibilityRole="header">
            {t('play.ae.stepCount', { n: step + 1, total: STEPS.length })}
          </Text>
          <IconButton icon="dice-outline" label={t('play.ae.random')} onPress={() => setConfig(randomAvatar())} color={colors.textMuted} />
        </View>
        {/* Past the step of a locked item tried on, the way is shut, as for « Suivant »; its own step stays open. */}
        <StepTrail step={step} onSelect={(i) => (canReachStep(i, blockingStep) ? goTo(i) : undefined)} />

        <Text style={styles.title}>{t(current.title)}</Text>

        <View style={styles.stage}>
          <SwipeAvatar
            config={config}
            locked={Boolean(lock)}
            onPrevious={() => select(index - 1)}
            onNext={() => select(index + 1)}
            label={t('play.ae.itemA11y', { part: t(category.label), name: itemLabel(category.key, item) })}
          />
          <View style={styles.caption}>
            {lock ? <Ionicons name="lock-closed" size={14} color={colors.textMuted} /> : null}
            <Text style={styles.itemLabel}>{itemLabel(category.key, item)}</Text>
            <Text style={styles.itemCount}>
              {index + 1} / {category.items.length}
            </Text>
          </View>
          <Text style={[styles.lockHint, !lock && { opacity: 0 }]}>{lock ? t('play.ae.toUnlock', { what: unlockLabel(lock).toLowerCase() }) : ' '}</Text>
        </View>

        {current.categories.length > 1 ? (
          <View style={styles.tabs} accessibilityRole="tablist">
            {current.categories.map((c, i) => (
              <Clickable
                key={c.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: c === category }}
                onPress={() => setTab(i)}
                style={[styles.tab, c === category && styles.tabSelected]}
              >
                <Text style={[styles.tabText, c === category && { color: colors.text }]}>{t(c.label)}</Text>
              </Clickable>
            ))}
          </View>
        ) : (
          <View style={styles.tabsSpacer} />
        )}

        <Carousel
          key={`${step}-${category.key}`}
          category={category}
          config={config}
          index={index}
          onSelect={select}
          lockOf={(o) => lockOf(category.key, o)}
        />

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          {step > 0 ? <Button variant="secondary" icon="chevron-back" label={t('play.ae.back')} onPress={() => goTo(step - 1)} style={{ flex: 1 }} /> : null}
          <Button
            icon={forwardLocked ? 'lock-closed' : last ? 'checkmark' : 'chevron-forward'}
            label={forwardLocked && blocking ? t('play.ae.partLocked', { part: t(blocking.label) }) : last ? t('play.ae.finish') : t('play.ae.next')}
            disabled={forwardLocked}
            onPress={() => (last ? onDone(config) : goTo(step + 1))}
            style={{ flex: 2 }}
          />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const STEP_DOT = 34;
const STEP_CURRENT = 44;
/** Every step gets the same room, so all six always show and nothing moves between steps. */
const STEP_SLOT = 48;

/**
 * Progress at the top: one icon per step, all shown at once in fixed slots on a line.
 * Steps done and the current one are violet, the ones to come greyed out; only the
 * current one moves, with a slow breathing halo. A tap on an icon goes to its step.
 */
function StepTrail({ step, onSelect }: { step: number; onSelect: (step: number) => void }) {
  const { t } = useT();
  return (
    <View style={styles.trail}>
      <View style={styles.trailTrack}>
        <View style={[styles.trailDone, { width: `${(step / (STEPS.length - 1)) * 100}%` }]} />
      </View>
      {STEPS.map((s, i) => (
        <Pressable
          key={s.title}
          accessibilityRole="button"
          accessibilityLabel={t('play.ae.stepA11y', { n: i + 1, title: t(s.title) })}
          accessibilityState={{ selected: i === step }}
          hitSlop={4}
          onPress={() => i !== step && onSelect(i)}
          style={({ pressed }) => pressed && { opacity: 0.7 }}
        >
          <StepDot icon={s.icon} state={i < step ? 'done' : i === step ? 'current' : 'todo'} />
        </Pressable>
      ))}
    </View>
  );
}

function StepDot({ icon, state }: { icon: StepIcon; state: 'done' | 'current' | 'todo' }) {
  const current = state === 'current';
  const size = current ? STEP_CURRENT : STEP_DOT;
  return (
    <View style={styles.dotSlot}>
      {current ? <Halo /> : null}
      <View style={[styles.dot, { width: size, height: size, borderRadius: size / 2 }, state !== 'todo' && styles.dotDone, current && styles.dotCurrent]}>
        <MaterialCommunityIcons name={icon} size={current ? 24 : 18} color={state === 'todo' ? colors.textMuted : colors.primaryText} />
      </View>
    </View>
  );
}

/** A violet halo breathing slowly behind the current step. */
function Halo() {
  const reduceMotion = useReducedMotion();
  const breath = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    breath.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [reduceMotion, breath]);

  const style = useAnimatedStyle(() => ({ opacity: 0.4 - breath.value * 0.25, transform: [{ scale: 1 + breath.value * 0.12 }] }));
  return <Animated.View pointerEvents="none" style={[styles.halo, style]} />;
}

/** The avatar in the middle: swipe it left or right for the next or previous item. */
function SwipeAvatar({ config, locked, onPrevious, onNext, label }: { config: AvatarConfig; locked: boolean; onPrevious: () => void; onNext: () => void; label: string }) {
  const { t } = useT();
  const { width, height } = useWindowDimensions();
  // As big as the screen allows, above the carousel.
  const size = Math.min(width - 2 * spacing.lg, height * 0.34, 280);
  const shift = useSharedValue(0);

  // Callbacks on the JS thread: no worklet needed for a swipe.
  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-12, 12])
    .failOffsetY([-16, 16])
    .onUpdate((e) => {
      shift.value = e.translationX * 0.35;
    })
    .onEnd((e) => {
      if (e.translationX < -40 || e.velocityX < -600) onNext();
      else if (e.translationX > 40 || e.velocityX > 600) onPrevious();
      shift.value = withTiming(0, { duration: 150 });
    });

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: shift.value }] }));

  return (
    <View style={styles.swipeRow}>
      <GestureDetector gesture={swipe}>
        <Animated.View
          style={[styles.avatar, { borderRadius: size / 2 }, style]}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityHint={t('play.ae.swipeHint')}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'increment' ? onNext() : onPrevious())}
        >
          <View style={locked && { opacity: 0.55 }}>
            <AvatarDrawing config={config} size={size} />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/**
 * Items in a row; the one in the middle is worn. Scrolling puts each item on as it
 * passes the middle; selecting elsewhere (swipe, arrows) scrolls to it.
 */
function Carousel({
  category,
  config,
  index,
  onSelect,
  lockOf,
}: {
  category: Category;
  config: AvatarConfig;
  index: number;
  onSelect: (i: number) => void;
  lockOf: (o: Option) => Unlock | undefined;
}) {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const ref = useRef<ScrollView>(null);
  // Index the scroll position shows, to tell scrolls by the player from ours.
  const shown = useRef(index);
  // While we scroll to an item ourselves, the items passed on the way aren't chosen.
  const target = useRef<number | null>(null);
  const side = (width - ITEM) / 2;

  useEffect(() => {
    if (index === shown.current) return;
    shown.current = index;
    target.current = index;
    ref.current?.scrollTo({ x: index * ITEM, animated: true });
  }, [index]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(category.items.length - 1, Math.round(e.nativeEvent.contentOffset.x / ITEM)));
    if (target.current !== null) {
      if (i === target.current) target.current = null;
      return;
    }
    if (i === shown.current) return;
    shown.current = i;
    onSelect(i);
  };

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={ITEM}
      decelerationRate="fast"
      contentOffset={{ x: index * ITEM, y: 0 }}
      onLayout={() => ref.current?.scrollTo({ x: index * ITEM, animated: false })}
      onScroll={onScroll}
      onScrollBeginDrag={() => {
        target.current = null;
      }}
      scrollEventThrottle={16}
      contentContainerStyle={{ paddingHorizontal: side }}
      style={styles.carousel}
    >
      {category.items.map((o, i) => {
        const selected = i === index;
        const lock = lockOf(o);
        return (
          // Not a Clickable: the tick of the change is the sound here.
          <Pressable
            key={o.id}
            accessibilityRole="button"
            accessibilityLabel={lock ? t('play.ae.optionLockedA11y', { name: itemLabel(category.key, o), what: unlockLabel(lock).toLowerCase() }) : itemLabel(category.key, o)}
            accessibilityState={{ selected }}
            onPress={() => onSelect(i)}
            style={styles.slot}
          >
            <View style={[styles.thumb, selected && styles.thumbSelected]}>
              <View style={lock && { opacity: 0.4 }}>
                <Thumb category={category} option={o} config={config} />
              </View>
              {lock ? (
                <View style={styles.lock}>
                  <Ionicons name="lock-closed" size={10} color={colors.text} />
                </View>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Thumb({ category, option, config }: { category: Category; option: Option; config: AvatarConfig }) {
  if (category.thumb === 'avatar') {
    const look = { ...config, ...thumbPatch[category.key], [category.key]: option.id };
    return <AvatarDrawing config={look} size={58} zoom={category.zoom} />;
  }
  if (category.thumb === 'eye') {
    return (
      <View style={styles.eye}>
        <View style={[styles.iris, { backgroundColor: option.fill }]}>
          <View style={styles.pupil} />
          <View style={styles.glint} />
        </View>
      </View>
    );
  }
  // Premium backgrounds show themselves, still; the others their gradient's first and last colours.
  if ((option as Background).fx) {
    return (
      <View style={styles.swatch}>
        <AvatarBackdrop bg={option as Background} size={40} animated={false} />
      </View>
    );
  }
  // Skin and hair colours.
  const stops = (option as { stops?: string[] }).stops;
  return (
    <View style={[styles.swatch, { backgroundColor: stops ? stops[stops.length - 1] : option.fill }]}>
      {stops ? <View style={[styles.swatchHalf, { backgroundColor: stops[0] }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  stepCount: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  trail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  // The line runs from the first icon's centre to the last's; violet up to the current step.
  trailTrack: { position: 'absolute', left: spacing.lg + STEP_SLOT / 2, right: spacing.lg + STEP_SLOT / 2, height: 3, borderRadius: 1.5, backgroundColor: colors.border },
  trailDone: { height: 3, borderRadius: 1.5, backgroundColor: colors.primary },
  dotSlot: { width: STEP_SLOT, height: STEP_CURRENT + 12, alignItems: 'center', justifyContent: 'center' },
  dot: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border },
  dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotCurrent: { borderColor: '#C9B8FF', borderWidth: 2 },
  halo: { position: 'absolute', width: STEP_CURRENT + 10, height: STEP_CURRENT + 10, borderRadius: (STEP_CURRENT + 10) / 2, backgroundColor: colors.primary },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: spacing.lg },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  swipeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 22, shadowOffset: { width: 0, height: 10 } },
  caption: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  itemLabel: { color: colors.text, fontSize: 18, fontWeight: '700' },
  itemCount: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginLeft: spacing.xs },
  lockHint: { color: colors.textMuted, fontSize: 14 },
  tabs: { flexDirection: 'row', alignSelf: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 4, gap: 4, marginBottom: spacing.sm },
  tabsSpacer: { height: 44 + spacing.sm },
  tab: { minWidth: 92, minHeight: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  tabSelected: { backgroundColor: colors.surfaceAlt },
  tabText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  carousel: { flexGrow: 0, marginBottom: spacing.md },
  slot: { width: ITEM, alignItems: 'center', paddingVertical: 6 },
  thumb: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbSelected: { borderColor: colors.primary, transform: [{ scale: 1.12 }] },
  swatch: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.18)' },
  swatchHalf: { position: 'absolute', left: 0, top: 0, right: 0, height: '50%' },
  eye: { width: 48, height: 34, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  iris: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pupil: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1B1716' },
  glint: { position: 'absolute', top: 4, right: 5, width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FFFFFF' },
  lock: { position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
