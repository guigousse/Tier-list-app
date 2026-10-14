import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, TIER_COLORS } from '../../constants/theme';
import { bestStreak, completedCount, dailyStreak } from '../../lib/streak';
import type { PublicProfile } from '../../lib/api';
import { mailAgreement, useMail } from '../../store/useMail';
import { rankingOf, useTierStore } from '../../store/useTierStore';
import { Avatar } from '../Avatar';
import { SectionTitle } from '../ui';

const TIERS = 'SABCD';

function Stat({ value, label, emoji }: { value: string | number; label: string; emoji?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>
        {emoji ? `${emoji} ` : ''}
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** The player's numbers: lists, flame, how they rank, and how they agree with friends. */
export function ProfileStats() {
  const lists = useTierStore((s) => s.lists);
  const inbox = useMail((s) => s.inbox);
  const outbox = useMail((s) => s.outbox);

  const stats = useMemo(() => {
    const all = Object.values(lists);
    // Every validated public ranking, for the S → D split.
    const ranks = all.flatMap((l) => {
      if (l.daily?.validatedAt) return l.daily.validatedRanks ?? rankingOf(l, l.daily.cardIds) ?? [];
      if (l.popular?.validatedRanks) return l.popular.validatedRanks;
      return [];
    });
    const split = [0, 1, 2, 3, 4].map((t) => ranks.filter((r) => r === t).length);
    const favourite = ranks.length ? split.indexOf(Math.max(...split)) : null;

    // Agreement with each friend, over the challenges both ranked.
    const byFriend = new Map<string, { friend: PublicProfile; scores: number[] }>();
    for (const [mail, received] of [...inbox.map((m) => [m, true] as const), ...outbox.map((m) => [m, false] as const)]) {
      if (mail.status !== 'ranked' || !mail.senderRanks || !mail.recipientRanks) continue;
      const mine = received ? mail.recipientRanks : mail.senderRanks;
      const theirs = received ? mail.senderRanks : mail.recipientRanks;
      const entry = byFriend.get(mail.friend.id) ?? {
        friend: mail.friend,
        scores: [],
      };
      entry.scores.push(mailAgreement(mine, theirs, mail.list.tiers.length));
      byFriend.set(mail.friend.id, entry);
    }
    const friends = [...byFriend.values()].map(({ friend, scores }) => ({
      friend,
      count: scores.length,
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }));
    const allScores = [...byFriend.values()].flatMap((e) => e.scores);
    const soulmate = friends.length ? friends.reduce((a, b) => (b.score > a.score ? b : a)) : null;
    const rival = friends.length > 1 ? friends.reduce((a, b) => (b.score < a.score ? b : a)) : null;

    return {
      completed: completedCount(all),
      streak: dailyStreak(all),
      best: bestStreak(all),
      dailies: all.filter((l) => l.daily?.validatedAt).length,
      popular: all.filter((l) => l.popular?.validatedAt).length,
      personal: all.filter((l) => !l.daily && !l.popular).length,
      cards: ranks.length,
      split,
      favourite,
      sent: outbox.length,
      answered: inbox.filter((m) => m.status === 'ranked').length,
      agreement: allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null,
      soulmate,
      rival: rival && rival.friend.id !== soulmate?.friend.id ? rival : null,
    };
  }, [lists, inbox, outbox]);

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <SectionTitle>Activité</SectionTitle>
        <View style={styles.grid}>
          <Stat value={stats.completed} label="listes publiques complétées" />
          <Stat emoji="🔥" value={stats.streak} label={`flamme actuelle · record ${stats.best}`} />
          <Stat value={stats.dailies} label="tier lists du jour" />
          <Stat value={stats.popular} label="listes populaires" />
          <Stat value={stats.personal} label="listes perso créées" />
          <Stat value={stats.cards} label="cartes classées" />
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionTitle>Votre façon de classer</SectionTitle>
        {stats.cards === 0 ? (
          <Text style={styles.hint}>Validez une tier list du jour ou une liste populaire pour voir comment vous classez.</Text>
        ) : (
          <View style={styles.card}>
            <View style={styles.bar}>{stats.split.map((n, t) => (n > 0 ? <View key={t} style={{ flex: n, backgroundColor: TIER_COLORS[t] }} /> : null))}</View>
            <View style={styles.legend}>
              {stats.split.map((n, t) => (
                <View key={t} style={styles.legendItem}>
                  <View style={[styles.legendChip, { backgroundColor: TIER_COLORS[t] }]}>
                    <Text style={styles.legendChipText}>{TIERS[t]}</Text>
                  </View>
                  <Text style={styles.legendText}>{Math.round((n / stats.cards) * 100)} %</Text>
                </View>
              ))}
            </View>
            {stats.favourite !== null ? (
              <Text style={styles.hint}>
                Votre rang préféré : <Text style={{ color: colors.text, fontWeight: '800' }}>{TIERS[stats.favourite]}</Text>
                {stats.split[0] / stats.cards > 0.3 ? ' · généreux avec les S !' : stats.split[4] / stats.cards > 0.3 ? ' · la critique est sévère !' : ''}
              </Text>
            ) : null}
          </View>
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionTitle>Défis entre amis</SectionTitle>
        <View style={styles.grid}>
          <Stat value={stats.sent} label="défis envoyés" />
          <Stat value={stats.answered} label="défis relevés" />
          <Stat value={stats.agreement === null ? '–' : `${stats.agreement} %`} label="d’accord avec vos amis" />
        </View>
        {stats.soulmate ? (
          <View style={styles.card}>
            {[{ title: '🤝 Âme sœur', entry: stats.soulmate }, ...(stats.rival ? [{ title: '⚔️ Rival', entry: stats.rival }] : [])].map(({ title, entry }) => (
              <View key={title} style={styles.friendRow}>
                <Avatar avatar={entry.friend.avatar} seed={entry.friend.id} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.friendTitle}>{title}</Text>
                  <Text numberOfLines={1} style={styles.hint}>
                    {entry.friend.pseudo} · {entry.count} défi
                    {entry.count > 1 ? 's' : ''}
                  </Text>
                </View>
                <Text style={styles.friendScore}>{entry.score} %</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.hint}>Envoyez une tier list à un ami pour découvrir votre âme sœur… et votre rival.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: {
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  bar: {
    flexDirection: 'row',
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
  },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendItem: { alignItems: 'center', gap: 4 },
  legendChip: {
    width: 28,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendChipText: { color: '#111', fontWeight: '900', fontSize: 13 },
  legendText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  friendTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  friendScore: { color: colors.text, fontSize: 18, fontWeight: '800' },
});
