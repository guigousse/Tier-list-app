import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius, readableTextColor, spacing } from '../constants/theme';
import { fetchFriendsVotes, type PublicProfile } from '../lib/api';
import { useT } from '../lib/i18n/useT';
import { agreement, socialError } from '../lib/social';
import type { Card, TierList } from '../store/types';
import { useTierStore } from '../store/useTierStore';
import { Avatar } from './Avatar';
import { Clickable } from './Clickable';
import { SendToFriends } from './SendToFriends';
import { Button, Sheet } from './ui';

type FriendVote = PublicProfile & { ranks: number[]; score: number };

type Props = {
  list: TierList;
  /** Statistics key of the list: popular list key, or "daily:YYYY-MM-DD". */
  voteKey: string;
  /** The player's validated ranking, card by card. */
  mine: number[];
  cards: Card[];
};

/** "Amis" tab of the results: each friend who ranked this list, compared with the player. */
export function FriendsResults({ list, voteKey, mine, cards }: Props) {
  const { t } = useT();
  const secret = useTierStore((s) => s.profile?.secret);
  const [votes, setVotes] = useState<FriendVote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);

  useEffect(() => {
    if (!secret) return;
    fetchFriendsVotes(secret, voteKey).then(
      (rows) => setVotes(rows.map((r) => ({ ...r, score: agreement(mine, r.ranks) })).sort((a, b) => b.score - a.score)),
      (e) => setError(socialError(e)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `mine` is a new array on each render
  }, [secret, voteKey, mine.join()]);

  if (!secret) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{t('social.createProfileToCompare')}</Text>
        <Button label={t('social.createProfile')} icon="person-add-outline" onPress={() => router.push('/social')} />
      </View>
    );
  }
  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!votes) return <ActivityIndicator color={colors.primary} />;

  const average = votes.length ? Math.round(votes.reduce((s, v) => s + v.score, 0) / votes.length) : null;
  const tier = (rank: number) => list.tiers[Math.min(list.tiers.length - 1, Math.max(0, rank))];
  const invite = (
    <>
      <Button
        variant={votes.length ? 'secondary' : 'primary'}
        icon="paper-plane-outline"
        label={sentCount ? t('social.sentToFriends', { count: sentCount }) : t('social.sendToMyFriends')}
        onPress={() => setSending(true)}
      />
      <Sheet visible={sending} onClose={() => setSending(false)} title={t('social.sendSheetTitle')}>
        <SendToFriends
          list={list}
          onSent={(count) => {
            setSentCount(count);
            setSending(false);
          }}
        />
      </Sheet>
    </>
  );

  if (votes.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🤝</Text>
        <Text style={styles.emptyText}>{t('social.noFriendRanked')}</Text>
        {invite}
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.score}>
        <Text style={styles.scoreValue}>{t('social.percent', { value: average ?? 0 })}</Text>
        <Text style={styles.scoreLabel}>{t('social.matchWith', { count: votes.length })}</Text>
      </View>

      {votes.map((v, i) => {
        const expanded = open === v.id;
        const badge = votes.length > 1 ? (i === 0 ? t('social.soulmate') : i === votes.length - 1 ? t('social.rival') : null) : null;
        return (
          <View key={v.id} style={styles.friend}>
            <Clickable
              accessibilityRole="button"
              accessibilityLabel={t('social.friendAgreeA11y', { name: v.pseudo, score: v.score })}
              onPress={() => setOpen(expanded ? null : v.id)}
              style={({ pressed }) => [styles.friendRow, pressed && { opacity: 0.85 }]}
            >
              <Avatar avatar={v.avatar} seed={v.id} size={40} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={styles.friendName}>
                  {v.pseudo}
                </Text>
                {badge ? <Text style={styles.badge}>{badge}</Text> : null}
              </View>
              <Text style={styles.friendScore}>{t('social.percent', { value: v.score })}</Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
            </Clickable>
            {expanded ? (
              <View style={styles.comparison}>
                <View style={styles.compareRow}>
                  <Text style={[styles.compareHead, { flex: 1, textAlign: 'left' }]}>{t('social.card')}</Text>
                  <Text style={styles.compareHead}>{t('social.you')}</Text>
                  <Text numberOfLines={1} style={[styles.compareHead, { maxWidth: 72 }]}>
                    {v.pseudo}
                  </Text>
                </View>
                {cards.map((card, c) => {
                  const a = tier(mine[c]);
                  const b = tier(v.ranks[c]);
                  return (
                    <View key={card.id} style={styles.compareRow}>
                      <Text style={styles.compareItem}>
                        {card.label}
                      </Text>
                      {mine[c] === v.ranks[c] ? <Ionicons name="checkmark" size={14} color="#2EAD6B" /> : null}
                      {[a, b].map((shown, k) => (
                        <View key={k} style={[styles.chip, { backgroundColor: shown?.color ?? colors.surfaceAlt }]}>
                          <Text numberOfLines={1} style={[styles.chipText, { color: shown ? readableTextColor(shown.color) : colors.textMuted }]}>
                            {shown?.label ?? '–'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}
      {invite}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg },
  emptyEmoji: { fontSize: 40 },
  emptyText: { color: colors.textMuted, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 15, textAlign: 'center' },
  score: { alignItems: 'center', gap: 4, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.primary },
  scoreValue: { color: colors.text, fontSize: 40, fontWeight: '800' },
  scoreLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  friend: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, paddingRight: spacing.md },
  friendName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  badge: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  friendScore: { color: colors.text, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  comparison: { borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md, gap: 6 },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  compareHead: { color: colors.textMuted, fontSize: 12, fontWeight: '700', minWidth: 40, textAlign: 'center' },
  compareItem: { flex: 1, color: colors.text, fontSize: 14 },
  chip: { minWidth: 40, height: 26, paddingHorizontal: 4, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontWeight: '900', fontSize: 13 },
});
