import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ComparisonDuel, ComparisonTable } from '../../components/RankingComparison';
import { Button } from '../../components/ui';
import { colors, spacing } from '../../constants/theme';
import { useT } from '../../lib/i18n/useT';
import { useResponsive } from '../../lib/layout';
import { confirmRerank, openReceived } from '../../lib/mail';
import { isSameList } from '../../lib/sentRanks';
import { mailAgreement, useMail } from '../../store/useMail';
import { useTierStore } from '../../store/useTierStore';

/** A tier list sent between two friends: both rankings side by side. */
export default function MailComparison() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { column, gutter } = useResponsive();
  const profile = useTierStore((s) => s.profile);
  const received = useMail((s) => s.inbox.find((m) => m.id === id));
  const sent = useMail((s) => s.outbox.find((m) => m.id === id));
  const loaded = useMail((s) => s.loaded);
  const mail = received ?? sent;

  // Always fetched again: the friend may have ranked it, or the sender changed their ranking.
  useEffect(() => {
    useMail.getState().refresh();
  }, [id]);

  // The friend's ranking of a list the player sent: now seen.
  useEffect(() => {
    if (sent?.status === 'ranked' && !sent.seen) useMail.getState().markSeen(sent.id);
  }, [sent]);

  // Both rankings of a received list seen: it can go to the archive.
  useEffect(() => {
    if (received?.status === 'ranked' && received.recipientRanks) useTierStore.getState().markMailViewed(received.id);
  }, [received]);

  if (!mail || !profile) {
    return (
      <View style={styles.center}>
        {loaded ? <Text style={styles.muted}>{t('social.listGone')}</Text> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  const { list, friend } = mail;
  const mine = received ? mail.recipientRanks : mail.senderRanks;
  const theirs = received ? mail.senderRanks : mail.recipientRanks;
  const done = mail.status === 'ranked' && mine && theirs;
  const score = done ? mailAgreement(mine, theirs, list.tiers.length) : null;
  const same = done ? list.cards.filter((_, i) => mine[i] >= 0 && mine[i] === theirs[i]).length : 0;
  // A list the player sent before ranking it themselves: their copy, to rank it.
  const unranked = (ranks: number[] | null) => !ranks || ranks.some((r) => r < 0);
  const ownCopy = sent && unranked(mine) ? Object.values(useTierStore.getState().lists).find((l) => !l.mail && isSameList(l, list)) : undefined;

  return (
    <ScrollView contentContainerStyle={[column, { padding: gutter, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <Stack.Screen options={{ title: list.title }} />

      <ComparisonDuel
        me={{ name: t('social.you'), avatar: profile.avatar, seed: profile.id }}
        friend={{ name: friend.pseudo, avatar: friend.avatar, seed: friend.id }}
        score={score}
        label={t('social.agree')}
      />

      {done ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.summary}>
            {same === list.cards.length
              ? t('social.sameRanking')
              : t('social.sameTier', { count: same, total: list.cards.length })}
          </Text>
          {mail.auto ? (
            <Text style={styles.note}>
              {received
                ? t('social.autoMine')
                : t('social.autoTheirs', { name: friend.pseudo })}
            </Text>
          ) : null}
          {received && unranked(theirs) ? <Text style={styles.note}>{t('social.theirsIncomplete', { name: friend.pseudo })}</Text> : null}
          {received ? <Button variant="ghost" icon="refresh" label={t('social.rerank')} onPress={() => confirmRerank(mail)} /> : null}
        </View>
      ) : received ? (
        <View style={{ gap: spacing.md }}>
          <Text style={styles.summary}>{t('social.rankToSee', { name: friend.pseudo })}</Text>
          <Button icon="reorder-four-outline" label={t('social.rankList')} onPress={() => openReceived(mail)} />
        </View>
      ) : (
        <Text style={styles.summary}>{t('social.notRankedYet', { name: friend.pseudo })}</Text>
      )}
      {ownCopy ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.note}>{t('social.ownCopyNote', { name: friend.pseudo })}</Text>
          <Button icon="reorder-four-outline" label={t('social.rankMyList')} onPress={() => router.push({ pathname: '/editor/[id]', params: { id: ownCopy.id } })} />
        </View>
      ) : null}

      <ComparisonTable cards={list.cards} tiers={list.tiers} mine={mine} theirs={done ? theirs : undefined} friendName={friend.pseudo} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  muted: { color: colors.textMuted, fontSize: 15 },
  summary: { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  note: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18, fontStyle: 'italic' },
});
