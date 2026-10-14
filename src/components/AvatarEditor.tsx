import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
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

const STEPS = [
  { key: 'body', title: 'Homme ou femme ?' },
  { key: 'skin', title: 'Couleur de peau' },
  { key: 'hair', title: 'Coiffure' },
  { key: 'eyes', title: 'Couleur des yeux' },
  { key: 'extras', title: 'Accessoires' },
  { key: 'bg', title: 'Fond' },
] as const;

/** Give it a new `key` at each opening, to start again from `initial`. */
type Props = {
  visible: boolean;
  /** Look to start from. */
  initial: AvatarConfig;
  onDone: (config: AvatarConfig) => void;
  onClose: () => void;
};

/** What the player has done so far, for locked items. */
function useProgress(): Progress {
  const lists = useTierStore((s) => s.lists);
  return useMemo(() => {
    const all = Object.values(lists);
    return { bestStreak: bestStreak(all), completed: completedCount(all) };
  }, [lists]);
}

/** Step-by-step avatar editor: body, skin, hair, eyes, accessories, background. */
export function AvatarEditor({ visible, initial, onDone, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const progress = useProgress();
  const haptics = useTierStore((s) => s.settings.haptics);
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState(initial);
  const [hint, setHint] = useState<string | null>(null);

  // Items already worn stay available, even if they would be locked.
  const available = (key: keyof AvatarConfig, item: { id: string; unlock?: Unlock }) =>
    isUnlocked(item, progress) || initial[key] === item.id;

  const choose = (patch: Partial<AvatarConfig>) => {
    if (haptics) Haptics.selectionAsync().catch(() => {});
    setHint(null);
    setConfig((c) => ({ ...c, ...patch }));
  };

  const locked = (unlock: Unlock) => {
    if (haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setHint(`À débloquer : ${unlockLabel(unlock).toLowerCase()}.`);
  };

  /** A tile per item: preview drawn with that item, or a colour swatch. */
  const tiles = <T extends { id: string; label: string; unlock?: Unlock }>(
    key: keyof AvatarConfig,
    items: T[],
    render: (item: T) => ReactNode,
    patch: (item: T) => Partial<AvatarConfig> = (item) => ({ [key]: item.id }),
  ) => (
    <View style={styles.grid}>
      {items.map((item) => (
        <OptionTile
          key={item.id}
          label={item.label}
          selected={config[key] === item.id}
          lockedBy={available(key, item) ? undefined : item.unlock}
          onPress={() => (available(key, item) ? choose(patch(item)) : locked(item.unlock!))}
        >
          {render(item)}
        </OptionTile>
      ))}
    </View>
  );

  const preview = (patch: Partial<AvatarConfig>) => <AvatarDrawing config={{ ...config, ...patch }} size={60} />;
  const swatch = (fill: string) => <View style={[styles.swatch, { backgroundColor: fill }]} />;

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  let content: ReactNode;
  switch (current.key) {
    case 'body':
      content = (
        <View style={styles.bodies}>
          {BODIES.map((b) => {
            const look = avatarForBody(config, b.id);
            return (
              <OptionTile key={b.id} label={b.label} selected={config.body === b.id} large onPress={() => choose(look)}>
                <AvatarDrawing config={look} size={104} />
              </OptionTile>
            );
          })}
        </View>
      );
      break;
    case 'skin':
      content = tiles('skin', SKINS, (s) => preview({ skin: s.id }));
      break;
    case 'hair':
      content = (
        <>
          <Text style={styles.section}>Coupe</Text>
          {tiles('hair', HAIR_STYLES, (h) => preview({ hair: h.id, hat: 'none' }))}
          <Text style={styles.section}>Couleur</Text>
          {tiles('hairColor', HAIR_COLORS, (c) => swatch(c.fill))}
        </>
      );
      break;
    case 'eyes':
      content = tiles('eyes', EYE_COLORS, (e) => <Eye fill={e.fill} />);
      break;
    case 'extras':
      content = (
        <>
          <Text style={styles.section}>Chapeau</Text>
          {tiles('hat', HATS, (h) => preview({ hat: h.id }))}
          <Text style={styles.section}>Lunettes</Text>
          {tiles('glasses', GLASSES, (g) => preview({ glasses: g.id }))}
        </>
      );
      break;
    case 'bg':
      content = tiles('bg', BACKGROUNDS, (b) => preview({ bg: b.id }));
      break;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'} onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: Platform.OS === 'ios' ? spacing.md : insets.top + spacing.sm }]}>
        <View style={styles.header}>
          <IconButton icon="close" label="Fermer sans enregistrer" onPress={onClose} color={colors.textMuted} />
          <Text style={styles.stepCount} accessibilityRole="header">
            Étape {step + 1} sur {STEPS.length}
          </Text>
          <IconButton icon="dice-outline" label="Avatar au hasard" onPress={() => choose(randomAvatar())} color={colors.textMuted} />
        </View>
        <View style={styles.progress} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {STEPS.map((s, i) => (
            <View key={s.key} style={[styles.progressPart, i <= step && styles.progressDone]} />
          ))}
        </View>

        <BigPreview config={config} />
        <Text style={styles.title}>{current.title}</Text>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
          {content}
          {hint ? (
            <View style={styles.hint}>
              <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
              <Text style={styles.hintText}>{hint}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          {step > 0 ? <Button variant="secondary" icon="chevron-back" label="Retour" onPress={() => setStep(step - 1)} style={{ flex: 1 }} /> : null}
          <Button
            icon={last ? 'checkmark' : 'chevron-forward'}
            label={last ? 'Terminer' : 'Suivant'}
            onPress={() => {
              setHint(null);
              if (last) onDone(config);
              else setStep(step + 1);
            }}
            style={{ flex: 2 }}
          />
        </View>
      </View>
    </Modal>
  );
}

/** The avatar being edited, with a little bounce at each change. */
function BigPreview({ config }: { config: AvatarConfig }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    scale.value = withSequence(withTiming(0.94, { duration: 70 }), withSpring(1, { damping: 9, stiffness: 260 }));
  }, [config, reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.preview, style]} accessibilityRole="image" accessibilityLabel="Aperçu de votre avatar">
      <AvatarDrawing config={config} size={156} />
    </Animated.View>
  );
}

function Eye({ fill }: { fill: string }) {
  return (
    <View style={styles.eye}>
      <View style={[styles.iris, { backgroundColor: fill }]}>
        <View style={styles.pupil} />
        <View style={styles.glint} />
      </View>
    </View>
  );
}

function OptionTile({
  label,
  selected,
  lockedBy,
  large,
  onPress,
  children,
}: {
  label: string;
  selected: boolean;
  lockedBy?: Unlock;
  large?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Clickable
      accessibilityRole="button"
      accessibilityLabel={lockedBy ? `${label}, à débloquer : ${unlockLabel(lockedBy).toLowerCase()}` : label}
      accessibilityState={{ selected, disabled: Boolean(lockedBy) }}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, large && styles.tileLarge, selected && styles.tileSelected, pressed && { opacity: 0.8 }]}
    >
      <View style={[styles.tileArt, lockedBy && { opacity: 0.35 }]}>{children}</View>
      <Text numberOfLines={1} style={[styles.tileLabel, selected && { color: colors.text }]}>
        {label}
      </Text>
      {lockedBy ? (
        <View style={styles.lock}>
          <Ionicons name="lock-closed" size={11} color={colors.text} />
        </View>
      ) : null}
      {selected ? (
        <View style={styles.check}>
          <Ionicons name="checkmark" size={12} color={colors.primaryText} />
        </View>
      ) : null}
    </Clickable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  stepCount: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  progressPart: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressDone: { backgroundColor: colors.primary },
  preview: { alignSelf: 'center', marginTop: spacing.lg, borderRadius: 78, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.sm },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  section: { color: colors.textMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  bodies: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  tile: {
    width: '23%',
    flexGrow: 0,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tileLarge: { width: '46%', paddingVertical: spacing.md },
  tileSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  tileArt: { minHeight: 60, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', paddingHorizontal: 4 },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: 'rgba(255,255,255,0.15)' },
  eye: { width: 54, height: 38, borderRadius: 27, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  iris: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pupil: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1B1716' },
  glint: { position: 'absolute', top: 5, right: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  lock: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'center', marginTop: spacing.sm },
  hintText: { color: colors.textMuted, fontSize: 14 },
  footer: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
