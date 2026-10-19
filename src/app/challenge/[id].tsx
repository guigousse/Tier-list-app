import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ComparisonDuel, ComparisonTable } from '../../components/RankingComparison';
import { ShareSheet } from '../../components/ShareSheet';
import { Button } from '../../components/ui';
import { colors, spacing } from '../../constants/theme';
import { challengeResult } from '../../lib/challenge';
import { useT } from '../../lib/i18n/useT';
import { useResponsive } from '../../lib/layout';
import { own } from '../../lib/own';
import { useTierStore } from '../../store/useTierStore';

/** A challenge once ranked: the player's ranking against the sharer's, and theirs to send in turn. */
export default function ChallengeComparison() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { column, gutter } = useResponsive();
  const list = useTierStore((s) => own(s.lists, id));
  const profile = useTierStore((s) => s.profile);
  const [sharing, setSharing] = useState(false);

  const challenge = list?.challenge;
  if (!list || !challenge?.answeredAt) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('social.listGone')}</Text>
        <Button label={t('editor.backHome')} onPress={() => router.dismissTo('/')} />
      </View>
    );
  }

  const { mine, theirs, score, differences } = challengeResult(list);
  const from = challenge.from;
  const cards = challenge.cardIds.map((cid) => list.cards[cid] ?? { label: '' });
  const agreed = mine.flatMap((r, i) => (theirs[i] >= 0 && r === theirs[i] ? [i] : []));
  // Cards the sharer hadn't ranked: shown last, nothing to agree or disagree on.
  const unrankedByThem = mine.flatMap((_, i) => (theirs[i] < 0 ? [i] : []));
  const friendName = from ?? t('social.yourFriend');
  // Measured: « YOUR FRIEND » doesn't fit the 64 px column; the short word does.
  const header = from ?? t('social.friendFallback');

  return (
    <ScrollView contentContainerStyle={[column, { padding: gutter, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <Stack.Screen options={{ title: list.title }} />

      <ComparisonDuel
        me={{ name: t('social.you'), avatar: profile?.avatar ?? '🙂', seed: profile?.id ?? 'me' }}
        // The sharer is known by their pseudo only: its initial on their colour.
        friend={{ name: friendName, avatar: from ? from.slice(0, 1).toUpperCase() : '🙂', seed: from ?? 'friend' }}
        score={score}
        label={from ? t('social.agreeWith', { name: from }) : t('social.agreeWithAnon')}
        pending={<Text style={styles.noScore}>–</Text>}
      />

      {score === null ? (
        <Text style={styles.summary}>{from ? t('social.nothingRankedBy', { name: from }) : t('social.nothingRankedAnon')}</Text>
      ) : differences.length === 0 ? (
        <Text style={styles.summary}>{t('social.sameRanking')}</Text>
      ) : null}

      {score !== null && differences.length > 0 ? (
        <ComparisonTable
          title={t('social.disagreeOn', { count: differences.length })}
          cards={cards}
          tiers={list.tiers}
          mine={mine}
          theirs={theirs}
          friendName={header}
          rows={differences}
        />
      ) : null}
      {score !== null && agreed.length > 0 ? (
        <ComparisonTable
          title={t('social.agreeOn', { count: agreed.length })}
          cards={cards}
          tiers={list.tiers}
          mine={mine}
          theirs={theirs}
          friendName={header}
          rows={[...agreed, ...unrankedByThem]}
        />
      ) : null}

      <View style={styles.back}>
        <Text style={styles.summary}>{t('social.challengeBackHint')}</Text>
        <Button icon="paper-plane-outline" label={t('social.challengeBack')} onPress={() => setSharing(true)} />
      </View>

      <ShareSheet list={list} visible={sharing} onClose={() => setSharing(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.background },
  muted: { color: colors.textMuted, fontSize: 15 },
  noScore: { color: colors.textMuted, fontSize: 36, fontWeight: '800' },
  summary: { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  back: { gap: spacing.md, paddingTop: spacing.sm },
});
