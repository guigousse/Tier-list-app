import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../../constants/theme';
import { chooseBadge, FORKS, pendingForks } from '../../lib/badges';
import { useT } from '../../lib/i18n/useT';
import { useResponsive } from '../../lib/layout';
import { trackState } from '../../lib/rewards';
import { useProgress } from '../../lib/progress';
import { useTierStore } from '../../store/useTierStore';
import { RewardPath } from './RewardPath';

/**
 * The two reward paths, one above the other: public tier lists completed (green, with
 * the VS badges) and the daily flame (orange). Each scrolls
 * sideways, opened on where the player stands.
 */
export function ProfileRewards() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const choices = useTierStore((s) => s.badgeChoices);

  const progress = useProgress();
  const listsState = trackState('lists', progress);
  const flameState = trackState('flame', progress);

  // On the lists path, VS are steps too.
  const nextAt = [...listsState.steps.map((m) => m.at), ...FORKS.map((f) => f.at)].filter((at) => at > listsState.value).sort((a, b) => a - b)[0];
  const pending = pendingForks(progress.completed, choices).length;
  const listsLeft = nextAt !== undefined ? nextAt - listsState.value : 0;
  const listsSummary =
    pending > 0
      ? t('play.rewards.badgesWaiting', { count: pending })
      : t('play.rewards.listsLeft', { count: listsLeft, at: nextAt });

  const flameLeft = flameState.next ? flameState.next.at - flameState.value : 0;
  const flameSummary =
    flameState.value === 0
      ? t('play.rewards.flameOut', { count: progress.bestStreak })
      : flameState.next
        ? t('play.rewards.flameLeft', { count: flameLeft, at: flameState.next.at, best: progress.bestStreak })
        : t('play.rewards.allReached');

  return (
    <ScrollView contentContainerStyle={[column, { paddingHorizontal: gutter, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }]}>
      <View style={styles.section}>
        <View style={styles.head}>
          <Text style={styles.title}>✅ {t('play.track.lists')} · {progress.completed}</Text>
          <Text style={styles.hint}>{listsSummary}</Text>
        </View>
        <View style={{ marginHorizontal: -gutter }}>
          <RewardPath
            steps={listsState.steps}
            value={listsState.value}
            won={listsState.won}
            theme="green"
            unit="list"
            forks={FORKS}
            choices={choices}
            onChoose={chooseBadge}
          />
        </View>
        <Text style={styles.foot}>{t('play.rewards.listsFoot')}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.head}>
          <Text style={styles.title}>🔥 {t('play.track.flame')} · {progress.streak}</Text>
          <Text style={styles.hint}>{flameSummary}</Text>
        </View>
        <View style={{ marginHorizontal: -gutter }}>
          <RewardPath steps={flameState.steps} value={flameState.value} won={flameState.won} theme="orange" glow unit="day" />
        </View>
        <Text style={styles.foot}>{t('play.rewards.flameFoot')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  head: { gap: 2 },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  hint: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  foot: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
});
