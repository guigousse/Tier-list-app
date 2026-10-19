import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, readableTextColor, spacing } from '../constants/theme';
import { splitEmoji } from '../lib/emoji';
import { useT } from '../lib/i18n/useT';
import { Avatar } from './Avatar';

type ShownTier = { label: string; color: string };

export function TierChip({ tier, tiers }: { tier: number | undefined; tiers: ShownTier[] }) {
  const shown = tier !== undefined && tier >= 0 ? tiers[tier] : undefined;
  if (!shown) return <View style={[styles.chip, { backgroundColor: colors.surfaceAlt }]} />;
  return (
    <View style={[styles.chip, { backgroundColor: shown.color }]}>
      <Text numberOfLines={1} style={[styles.chipText, { color: readableTextColor(shown.color) }]}>
        {shown.label.slice(0, 3)}
      </Text>
    </View>
  );
}

type Player = { name: string; avatar: string; seed: string };

function Face({ player }: { player: Player }) {
  return (
    <View style={styles.player}>
      <Avatar avatar={player.avatar} seed={player.seed} size={72} />
      <Text numberOfLines={1} style={styles.playerName}>
        {player.name}
      </Text>
    </View>
  );
}

/** Both players face to face, the agreement between them in the middle (or what replaces it). */
export function ComparisonDuel({ me, friend, score, label, pending }: { me: Player; friend: Player; score: number | null; label: string; pending?: ReactNode }) {
  const { t } = useT();
  return (
    <View style={styles.duel}>
      <Face player={me} />
      <View style={styles.score}>
        {score !== null ? (
          <>
            <Text style={styles.scoreValue}>{t('social.percent', { value: score })}</Text>
            <Text numberOfLines={2} style={styles.scoreLabel}>
              {label}
            </Text>
          </>
        ) : (
          (pending ?? <Ionicons name="hourglass-outline" size={32} color={colors.textMuted} />)
        )}
      </View>
      <Face player={friend} />
    </View>
  );
}

type TableProps = {
  cards: { label: string }[];
  tiers: ShownTier[];
  mine: number[] | null | undefined;
  /** The friend's ranking, once it can be shown. */
  theirs: number[] | null | undefined;
  friendName: string;
  /** Indexes of the cards to show, in this order (all of them by default). */
  rows?: number[];
  title?: string;
};

/** Card by card: the player's tier and the friend's, same tier marked. */
export function ComparisonTable({ cards, tiers, mine, theirs, friendName, rows, title }: TableProps) {
  const { t, upper } = useT();
  const shown = rows ?? cards.map((_, i) => i);
  return (
    <View style={{ gap: spacing.sm }}>
      {title ? <Text style={styles.tableTitle}>{title}</Text> : null}
      <View style={styles.table}>
        <View style={styles.head}>
          <Text style={[styles.headLabel, { flex: 1, textAlign: 'left' }]}>{upper(t('social.card'))}</Text>
          <Text style={[styles.headLabel, styles.col]}>{upper(t('social.you'))}</Text>
          <Text numberOfLines={1} style={[styles.headLabel, styles.col]}>
            {upper(friendName)}
          </Text>
        </View>
        {shown.map((i) => {
          const card = cards[i];
          const { emoji, text } = splitEmoji(card.label);
          const match = Boolean(mine && theirs && mine[i] >= 0 && mine[i] === theirs[i]);
          return (
            <View key={i} style={[styles.row, match && styles.rowMatch]}>
              <Text style={styles.cardLabel}>
                {emoji ? `${emoji} ` : ''}
                {text || card.label || t('social.card')}
              </Text>
              {match ? <Ionicons name="checkmark" size={14} color="#2EAD6B" /> : null}
              <View style={styles.col}>
                <TierChip tier={mine?.[i]} tiers={tiers} />
              </View>
              <View style={styles.col}>
                <TierChip tier={theirs?.[i]} tiers={tiers} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  duel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  player: { alignItems: 'center', gap: spacing.xs, width: 100 },
  playerName: { color: colors.text, fontSize: 15, fontWeight: '700', maxWidth: 100 },
  score: { flex: 1, alignItems: 'center' },
  scoreValue: { color: colors.text, fontSize: 36, fontWeight: '800', fontVariant: ['tabular-nums'] },
  scoreLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  tableTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  table: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  headLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  col: { width: 64, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, minHeight: 44 },
  rowMatch: { backgroundColor: 'rgba(46, 173, 107, 0.08)' },
  cardLabel: { flex: 1, color: colors.text, fontSize: 15 },
  chip: { minWidth: 40, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  chipText: { fontSize: 13, fontWeight: '800' },
});
