import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../constants/theme';
import {
  avatarForBody,
  BACKGROUNDS,
  BODIES,
  EYE_COLORS,
  GLASSES,
  HAIR_COLORS,
  HAIR_STYLES,
  HATS,
  isUnlocked,
  randomAvatar,
  SKINS,
  unlockLabel,
  type AvatarConfig,
  type Progress,
  type Unlock,
} from '../lib/avatar';
import { bestStreak, completedCount } from '../lib/streak';
import { useTierStore } from '../store/useTierStore';
import { AvatarDrawing } from './Avatar';
import { Clickable } from './Clickable';
import { Button, IconButton } from './ui';

type Option = { id: string; label: string; unlock?: Unlock; fill?: string };

/** One carousel: the items of a part of the avatar, and how to show each one. */
type Category = {
  key: keyof AvatarConfig;
  label: string;
  items: Option[];
  /** What choosing `item` changes (by default, just this part). */
  patch?: (item: Option, config: AvatarConfig) => Partial<AvatarConfig>;
  /** Thumbnail: the avatar wearing it, or a colour swatch / eye. */
  thumb: 'avatar' | 'swatch' | 'eye';
};

const STEPS: { title: string; categories: Category[] }[] = [
  {
    title: 'Homme ou femme ?',
    categories: [{ key: 'body', label: 'Corps', items: BODIES, patch: (item, c) => avatarForBody(c, item.id as 'm' | 'f'), thumb: 'avatar' }],
  },
  { title: 'Couleur de peau', categories: [{ key: 'skin', label: 'Peau', items: SKINS, thumb: 'swatch' }] },
  {
    title: 'Coiffure',
    categories: [
      { key: 'hair', label: 'Coupe', items: HAIR_STYLES, thumb: 'avatar' },
      { key: 'hairColor', label: 'Couleur', items: HAIR_COLORS, thumb: 'swatch' },
    ],
  },
  { title: 'Couleur des yeux', categories: [{ key: 'eyes', label: 'Yeux', items: EYE_COLORS, thumb: 'eye' }] },
  {
    title: 'Accessoires',
    categories: [
      { key: 'hat', label: 'Chapeau', items: HATS, thumb: 'avatar' },
      { key: 'glasses', label: 'Lunettes', items: GLASSES, thumb: 'avatar' },
    ],
  },
  { title: 'Fond', categories: [{ key: 'bg', label: 'Fond', items: BACKGROUNDS, thumb: 'swatch' }] },
];

/** Thumbnails of avatars: hairstyles are shown without a hat, to see them. */
const thumbPatch: Partial<Record<keyof AvatarConfig, Partial<AvatarConfig>>> = { hair: { hat: 'none' }, glasses: { hat: 'none' } };

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
  const lists = useTierStore((s) => s.lists);
  return useMemo(() => {
    const all = Object.values(lists);
    return { bestStreak: bestStreak(all), completed: completedCount(all) };
  }, [lists]);
}

/**
 * Avatar editor in steps (body, skin, hair, eyes, accessories, background). The
 * avatar sits in the middle; swiping it, or scrolling the carousel below, puts on
 * the previous or next item at once. Locked items can be tried on, not kept.
 */
export function AvatarEditor({ visible, initial, onDone, onClose }: Props) {
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
    if (haptics) Haptics.selectionAsync().catch(() => {});
    setConfig((c) => ({ ...c, ...(category.patch ? category.patch(next, c) : { [category.key]: next.id }) }));
  };

  const goTo = (nextStep: number) => {
    setStep(nextStep);
    setTab(0);
  };

  const lock = lockOf(category.key, item);
  const last = step === STEPS.length - 1;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'} onRequestClose={onClose}>
      <GestureHandlerRootView style={[styles.root, { paddingTop: Platform.OS === 'ios' ? spacing.md : insets.top + spacing.sm }]}>
        <View style={styles.header}>
          <IconButton icon="close" label="Fermer sans enregistrer" onPress={onClose} color={colors.textMuted} />
          <Text style={styles.stepCount} accessibilityRole="header">
            Étape {step + 1} sur {STEPS.length}
          </Text>
          <IconButton icon="dice-outline" label="Avatar au hasard" onPress={() => setConfig(randomAvatar())} color={colors.textMuted} />
        </View>
        <View style={styles.progress} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {STEPS.map((s, i) => (
            <View key={s.title} style={[styles.progressPart, i <= step && styles.progressDone]} />
          ))}
        </View>

        <Text style={styles.title}>{current.title}</Text>

        <View style={styles.stage}>
          <SwipeAvatar
            config={config}
            locked={Boolean(lock)}
            onPrevious={() => select(index - 1)}
            onNext={() => select(index + 1)}
            label={`${category.label} : ${item.label}`}
          />
          <View style={styles.caption}>
            {lock ? <Ionicons name="lock-closed" size={14} color={colors.textMuted} /> : null}
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={styles.itemCount}>
              {index + 1} / {category.items.length}
            </Text>
          </View>
          <Text style={[styles.lockHint, !lock && { opacity: 0 }]}>{lock ? `À débloquer : ${unlockLabel(lock).toLowerCase()}` : ' '}</Text>
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
                <Text style={[styles.tabText, c === category && { color: colors.text }]}>{c.label}</Text>
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
          {step > 0 ? <Button variant="secondary" icon="chevron-back" label="Retour" onPress={() => goTo(step - 1)} style={{ flex: 1 }} /> : null}
          <Button
            icon={blocking ? 'lock-closed' : last ? 'checkmark' : 'chevron-forward'}
            label={blocking ? `${blocking.label} à débloquer` : last ? 'Terminer' : 'Suivant'}
            disabled={Boolean(blocking)}
            onPress={() => (last ? onDone(config) : goTo(step + 1))}
            style={{ flex: 2 }}
          />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** The avatar in the middle: swipe it left or right for the next or previous item. */
function SwipeAvatar({ config, locked, onPrevious, onNext, label }: { config: AvatarConfig; locked: boolean; onPrevious: () => void; onNext: () => void; label: string }) {
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  // As big as the screen allows, beside the arrows and above the carousel.
  const size = Math.min(width - 132, height * 0.34, 280);
  const shift = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    scale.value = withSequence(withTiming(0.95, { duration: 70 }), withSpring(1, { damping: 9, stiffness: 260 }));
  }, [config, reduceMotion, scale]);

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
      shift.value = withSpring(0, { damping: 14, stiffness: 220 });
    });

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: shift.value }, { scale: scale.value }] }));

  return (
    <View style={styles.swipeRow}>
      <IconButton icon="chevron-back" label="Précédent" onPress={onPrevious} color={colors.textMuted} size={28} />
      <GestureDetector gesture={swipe}>
        <Animated.View
          style={[styles.avatar, { borderRadius: size / 2 }, style]}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityHint="Balayez vers le haut ou le bas pour changer"
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'increment' ? onNext() : onPrevious())}
        >
          <View style={locked && { opacity: 0.55 }}>
            <AvatarDrawing config={config} size={size} />
          </View>
        </Animated.View>
      </GestureDetector>
      <IconButton icon="chevron-forward" label="Suivant" onPress={onNext} color={colors.textMuted} size={28} />
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
          <Clickable
            key={o.id}
            accessibilityRole="button"
            accessibilityLabel={lock ? `${o.label}, à débloquer : ${unlockLabel(lock).toLowerCase()}` : o.label}
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
          </Clickable>
        );
      })}
    </ScrollView>
  );
}

function Thumb({ category, option, config }: { category: Category; option: Option; config: AvatarConfig }) {
  if (category.thumb === 'avatar') {
    const look = { ...config, ...thumbPatch[category.key], ...(category.patch ? category.patch(option, config) : { [category.key]: option.id }) };
    return <AvatarDrawing config={look} size={58} />;
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
  // Skin and hair colours; backgrounds show their gradient's first and last colours.
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
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  progressPart: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressDone: { backgroundColor: colors.primary },
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
  tab: { minWidth: 110, minHeight: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
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
