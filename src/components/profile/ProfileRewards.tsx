import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../../constants/theme';
import { chooseBadge, FORKS, pendingForks } from '../../lib/badges';
import { openWallet } from '../../lib/credits';
import { useResponsive } from '../../lib/layout';
import { trackState } from '../../lib/rewards';
import { useProgress } from '../../lib/progress';
import { useTierStore } from '../../store/useTierStore';
import { RewardPath } from './RewardPath';

/**
 * The two reward paths, one above the other: public tier lists completed (green, with
 * the VS badges and credits every 25 lists) and the daily flame (orange). Each scrolls
 * sideways, opened on where the player stands.
 */
export function ProfileRewards() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const choices = useTierStore((s) => s.badgeChoices);

  // The server pays the credits of the steps reached when the wallet opens.
  useEffect(() => {
    openWallet();
  }, []);

  const progress = useProgress();
  const listsState = trackState('lists', progress);
  const flameState = trackState('flame', progress);

  // On the lists path, VS are steps too.
  const nextAt = [...listsState.steps.map((m) => m.at), ...FORKS.map((f) => f.at)].filter((at) => at > listsState.value).sort((a, b) => a - b)[0];
  const pending = pendingForks(progress.completed, choices).length;
  const listsLeft = nextAt !== undefined ? nextAt - listsState.value : 0;
  const listsSummary =
    pending > 0
      ? `${pending > 1 ? `${pending} badges vous attendent` : 'Un badge vous attend'} : choisissez votre camp !`
      : `Encore ${listsLeft} liste${listsLeft > 1 ? 's' : ''} publique${listsLeft > 1 ? 's' : ''} pour le palier ${nextAt}`;

  const flameLeft = flameState.next ? flameState.next.at - flameState.value : 0;
  const flameSummary =
    flameState.value === 0
      ? `Flamme éteinte · record ${progress.bestStreak} jour${progress.bestStreak > 1 ? 's' : ''}. Jouez la tier list du jour pour la rallumer !`
      : flameState.next
        ? `Encore ${flameLeft} jour${flameLeft > 1 ? 's' : ''} pour le palier ${flameState.next.at} · record ${progress.bestStreak}`
        : 'Tous les paliers atteints : légendaire !';

  return (
    <ScrollView contentContainerStyle={[column, { paddingHorizontal: gutter, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }]}>
      <View style={styles.section}>
        <View style={styles.head}>
          <Text style={styles.title}>✅ Listes validées · {progress.completed}</Text>
          <Text style={styles.hint}>{listsSummary}</Text>
        </View>
        <View style={{ marginHorizontal: -gutter }}>
          <RewardPath
            steps={listsState.steps}
            value={listsState.value}
            won={listsState.won}
            theme="green"
            unit="liste"
            forks={FORKS}
            choices={choices}
            onChoose={chooseBadge}
          />
        </View>
        <Text style={styles.foot}>Tier lists du jour et listes publiques validées. Aux VS, choisissez votre camp : l’autre badge disparaît !</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.head}>
          <Text style={styles.title}>🔥 Flamme · {progress.streak}</Text>
          <Text style={styles.hint}>{flameSummary}</Text>
        </View>
        <View style={{ marginHorizontal: -gutter }}>
          <RewardPath steps={flameState.steps} value={flameState.value} won={flameState.won} theme="orange" glow unit="jour" />
        </View>
        <Text style={styles.foot}>Si la flamme s’éteint, le chemin repart de zéro, mais vos récompenses restent à vous.</Text>
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
