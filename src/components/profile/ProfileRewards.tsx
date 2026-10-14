import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../../constants/theme';
import { decodeAvatar, DEFAULT_AVATAR, isAvatarCode } from '../../lib/avatar';
import { chooseBadge, FORKS, pendingForks } from '../../lib/badges';
import { useResponsive } from '../../lib/layout';
import { trackState, type Track } from '../../lib/rewards';
import { bestStreak, completedCount, dailyStreak } from '../../lib/streak';
import { useTierStore } from '../../store/useTierStore';
import { Clickable } from '../Clickable';
import { MyBadges } from './MyBadges';
import { RewardPath } from './RewardPath';

const PATH_PADDING = 24;

/**
 * The two reward paths: public tier lists completed (green) and the daily flame
 * (orange). The switch and the badges stay on top; only the path scrolls, opened on
 * where the player stands.
 */
export function ProfileRewards() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const scroll = useRef<ScrollView>(null);
  const [viewHeight, setViewHeight] = useState(0);
  const [focusY, setFocusY] = useState<number | null>(null);
  const lists = useTierStore((s) => s.lists);
  const avatarCode = useTierStore((s) => s.profile?.avatar);
  const choices = useTierStore((s) => s.badgeChoices);
  const [track, setTrack] = useState<Track>('lists');

  const progress = useMemo(() => {
    const all = Object.values(lists);
    return {
      completed: completedCount(all),
      bestStreak: bestStreak(all),
      streak: dailyStreak(all),
    };
  }, [lists]);
  const avatar = useMemo(() => (avatarCode && isAvatarCode(avatarCode) ? decodeAvatar(avatarCode) : DEFAULT_AVATAR), [avatarCode]);
  const state = trackState(track, progress);

  // Centred on the current step, once the path and the scroll view are laid out.
  useEffect(() => {
    if (focusY === null || !viewHeight) return;
    const y = Math.max(0, PATH_PADDING + focusY - viewHeight / 2);
    // Next frame: the content must be laid out before it can be scrolled.
    const timer = setTimeout(() => scroll.current?.scrollTo({ y, animated: false }), 30);
    return () => clearTimeout(timer);
  }, [focusY, viewHeight]);
  const onCurrent = useCallback((y: number) => setFocusY(y), []);
  const switchTrack = (next: Track) => {
    setFocusY(null);
    setTrack(next);
  };
  const flame = track === 'flame';

  // On the lists path, forks are steps too.
  const nextAt = flame
    ? state.next?.at
    : [...state.steps.map((m) => m.at), ...FORKS.map((f) => f.at)].filter((at) => at > state.value).sort((a, b) => a - b)[0];
  const pending = flame ? 0 : pendingForks(progress.completed, choices).length;
  const left = nextAt !== undefined ? nextAt - state.value : 0;
  const summary = flame
    ? state.value === 0
      ? `Flamme éteinte · record ${progress.bestStreak} jour${progress.bestStreak > 1 ? 's' : ''}. Jouez la tier list du jour pour la rallumer !`
      : state.next
        ? `Encore ${left} jour${left > 1 ? 's' : ''} pour le palier ${state.next.at} · record ${progress.bestStreak}`
        : 'Tous les paliers atteints : légendaire !'
    : pending > 0
      ? `${pending > 1 ? `${pending} badges vous attendent` : 'Un badge vous attend'} : choisissez votre camp !`
      : nextAt !== undefined
        ? `Encore ${left} liste${left > 1 ? 's' : ''} publique${left > 1 ? 's' : ''} pour le palier ${nextAt}`
        : 'Tous les paliers atteints : légendaire !';

  return (
    <View style={{ flex: 1 }}>
      <View style={[column, styles.top, { paddingHorizontal: gutter }]}>
        <MyBadges />
        <View style={styles.switch} accessibilityRole="tablist">
          {(
            [
              { key: 'lists', label: `✅ Listes · ${progress.completed}` },
              { key: 'flame', label: `🔥 Flamme · ${progress.streak}` },
            ] as const
          ).map((t) => (
            <Clickable
              key={t.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: track === t.key }}
              onPress={() => switchTrack(t.key)}
              style={[styles.switchItem, track === t.key && (t.key === 'flame' ? styles.flameSelected : styles.listsSelected)]}
            >
              <Text style={[styles.switchText, track === t.key && { color: colors.text }]}>{t.label}</Text>
            </Clickable>
          ))}
        </View>
        <Text style={styles.hint}>{summary}</Text>
      </View>

      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        onLayout={(e) => setViewHeight(e.nativeEvent.layout.height)}
        contentContainerStyle={[column, { paddingHorizontal: gutter, paddingTop: PATH_PADDING, paddingBottom: insets.bottom + PATH_PADDING }]}
      >
        <RewardPath
          key={track}
          steps={state.steps}
          value={state.value}
          won={state.won}
          theme={flame ? 'orange' : 'green'}
          glow={flame}
          avatar={avatar}
          unit={flame ? 'jour' : 'liste'}
          onCurrent={onCurrent}
          forks={flame ? [] : FORKS}
          choices={choices}
          onChoose={chooseBadge}
        />
        <Text style={[styles.hint, { textAlign: 'center', marginTop: spacing.lg }]}>
          {flame
            ? 'Si la flamme s’éteint, le chemin repart de zéro, mais vos récompenses restent à vous.'
            : 'Tier lists du jour et listes populaires validées. Aux VS, choisissez votre camp : l’autre badge disparaît !'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switch: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 4,
    gap: 4,
  },
  switchItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  listsSelected: {
    backgroundColor: 'rgba(46, 173, 107, 0.18)',
    borderColor: 'rgba(46, 173, 107, 0.5)',
  },
  flameSelected: {
    backgroundColor: 'rgba(255, 122, 31, 0.18)',
    borderColor: 'rgba(255, 122, 31, 0.5)',
  },
  switchText: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  hint: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
});
