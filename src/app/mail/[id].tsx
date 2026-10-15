import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/ui';
import { colors, radius, readableTextColor, spacing } from '../../constants/theme';
import { splitEmoji } from '../../lib/emoji';
import { useResponsive } from '../../lib/layout';
import { confirmRerank, openReceived } from '../../lib/mail';
import { isSameList } from '../../lib/sentRanks';
import { mailAgreement, useMail } from '../../store/useMail';
import { useTierStore } from '../../store/useTierStore';

function TierChip({ tier, tiers }: { tier: number | undefined; tiers: { label: string; color: string }[] }) {
  const t = tier !== undefined && tier >= 0 ? tiers[tier] : undefined;
  if (!t) return <View style={[styles.chip, { backgroundColor: colors.surfaceAlt }]} />;
  return (
    <View style={[styles.chip, { backgroundColor: t.color }]}>
      <Text numberOfLines={1} style={[styles.chipText, { color: readableTextColor(t.color) }]}>
        {t.label.slice(0, 3)}
      </Text>
    </View>
  );
}

/** A tier list sent between two friends: both rankings side by side. */
export default function MailComparison() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
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
        {loaded ? <Text style={styles.muted}>Cette liste n’est plus disponible.</Text> : <ActivityIndicator color={colors.primary} />}
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

      <View style={styles.duel}>
        <View style={styles.player}>
          <Avatar avatar={profile.avatar} seed={profile.id} size={72} />
          <Text numberOfLines={1} style={styles.playerName}>
            Vous
          </Text>
        </View>
        <View style={styles.score}>
          {score !== null ? (
            <>
              <Text style={styles.scoreValue}>{score} %</Text>
              <Text style={styles.scoreLabel}>d’accord</Text>
            </>
          ) : (
            <Ionicons name="hourglass-outline" size={32} color={colors.textMuted} />
          )}
        </View>
        <View style={styles.player}>
          <Avatar avatar={friend.avatar} seed={friend.id} size={72} />
          <Text numberOfLines={1} style={styles.playerName}>
            {friend.pseudo}
          </Text>
        </View>
      </View>

      {done ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.summary}>
            {same === list.cards.length
              ? 'Exactement le même classement !'
              : `Même rang pour ${same} carte${same > 1 ? 's' : ''} sur ${list.cards.length}.`}
          </Text>
          {mail.auto ? (
            <Text style={styles.note}>
              {received
                ? 'Vous aviez déjà classé cette liste : votre classement a été repris.'
                : `${friend.pseudo} avait déjà classé cette liste : son classement a été repris.`}
            </Text>
          ) : null}
          {received && unranked(theirs) ? <Text style={styles.note}>{friend.pseudo} n’a pas encore classé toutes les cartes de sa liste.</Text> : null}
          {received ? <Button variant="ghost" icon="refresh" label="Reclasser" onPress={() => confirmRerank(mail)} /> : null}
        </View>
      ) : received ? (
        <View style={{ gap: spacing.md }}>
          <Text style={styles.summary}>Classez cette liste pour découvrir le classement de {friend.pseudo}.</Text>
          <Button icon="reorder-four-outline" label="Classer la liste" onPress={() => openReceived(mail)} />
        </View>
      ) : (
        <Text style={styles.summary}>{friend.pseudo} n’a pas encore classé cette liste.</Text>
      )}
      {ownCopy ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.note}>Vous n’avez pas classé toutes les cartes : {friend.pseudo} comparera avec votre classement dès qu’il sera rempli.</Text>
          <Button icon="reorder-four-outline" label="Classer ma liste" onPress={() => router.push({ pathname: '/editor/[id]', params: { id: ownCopy.id } })} />
        </View>
      ) : null}

      <View style={styles.table}>
        <View style={styles.head}>
          <Text style={[styles.headLabel, { flex: 1, textAlign: 'left' }]}>Carte</Text>
          <Text style={[styles.headLabel, styles.col]}>Vous</Text>
          <Text numberOfLines={1} style={[styles.headLabel, styles.col]}>
            {friend.pseudo}
          </Text>
        </View>
        {list.cards.map((card, i) => {
          const { emoji, text } = splitEmoji(card.label);
          const match = done && mine[i] >= 0 && mine[i] === theirs[i];
          return (
            <View key={i} style={[styles.row, match && styles.rowMatch]}>
              <Text numberOfLines={1} style={styles.cardLabel}>
                {emoji ? `${emoji} ` : ''}
                {text || card.label || 'Carte'}
              </Text>
              {match ? <Ionicons name="checkmark" size={14} color="#2EAD6B" /> : null}
              <View style={styles.col}>
                <TierChip tier={mine?.[i]} tiers={list.tiers} />
              </View>
              <View style={styles.col}>
                <TierChip tier={done ? theirs[i] : undefined} tiers={list.tiers} />
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  muted: { color: colors.textMuted, fontSize: 15 },
  duel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  player: { alignItems: 'center', gap: spacing.xs, width: 100 },
  playerName: { color: colors.text, fontSize: 15, fontWeight: '700', maxWidth: 100 },
  score: { alignItems: 'center' },
  scoreValue: { color: colors.text, fontSize: 36, fontWeight: '800', fontVariant: ['tabular-nums'] },
  scoreLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  summary: { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  note: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18, fontStyle: 'italic' },
  table: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  headLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  col: { width: 64, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, minHeight: 44 },
  rowMatch: { backgroundColor: 'rgba(46, 173, 107, 0.08)' },
  cardLabel: { flex: 1, color: colors.text, fontSize: 15 },
  chip: { minWidth: 40, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  chipText: { fontSize: 13, fontWeight: '800' },
});
