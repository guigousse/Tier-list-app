import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { decodeAvatar, DEFAULT_AVATAR, isAvatarCode } from '../../lib/avatar';
import { trackState, type Track } from '../../lib/rewards';
import { bestStreak, completedCount, dailyStreak } from '../../lib/streak';
import { useTierStore } from '../../store/useTierStore';
import { Clickable } from '../Clickable';
import { RewardPath } from './RewardPath';

/** The two reward paths: public tier lists completed (green) and the daily flame (orange). */
export function ProfileRewards() {
  const lists = useTierStore((s) => s.lists);
  const avatarCode = useTierStore((s) => s.profile?.avatar);
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
  const flame = track === 'flame';

  const left = state.next ? state.next.at - state.value : 0;
  const summary = flame
    ? state.value === 0
      ? `Flamme éteinte · record ${progress.bestStreak} jour${progress.bestStreak > 1 ? 's' : ''}. Jouez la tier list du jour pour la rallumer !`
      : state.next
        ? `Encore ${left} jour${left > 1 ? 's' : ''} pour le palier ${state.next.at} · record ${progress.bestStreak}`
        : 'Tous les paliers atteints : légendaire !'
    : state.next
      ? `Encore ${left} liste${left > 1 ? 's' : ''} publique${left > 1 ? 's' : ''} pour le palier ${state.next.at}`
      : 'Tous les paliers atteints : légendaire !';

  return (
    <View style={{ gap: spacing.lg }}>
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
            onPress={() => setTrack(t.key)}
            style={[styles.switchItem, track === t.key && (t.key === 'flame' ? styles.flameSelected : styles.listsSelected)]}
          >
            <Text style={[styles.switchText, track === t.key && { color: colors.text }]}>{t.label}</Text>
          </Clickable>
        ))}
      </View>

      <View style={{ gap: 4 }}>
        <Text style={styles.title}>{flame ? 'Chemin de la flamme' : 'Chemin des listes'}</Text>
        <Text style={styles.hint}>{summary}</Text>
        {flame ? (
          <Text style={styles.hint}>Si la flamme s’éteint, le chemin repart de zéro, mais vos récompenses restent à vous.</Text>
        ) : (
          <Text style={styles.hint}>Tier lists du jour et listes populaires validées.</Text>
        )}
      </View>

      <RewardPath
        key={track}
        steps={state.steps}
        value={state.value}
        won={state.won}
        theme={flame ? 'orange' : 'green'}
        glow={flame}
        avatar={avatar}
        unit={flame ? 'jour' : 'liste'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
