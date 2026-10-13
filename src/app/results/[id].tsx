import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardView } from '../../components/CardView';
import { Button } from '../../components/ui';
import { colors, radius, readableTextColor, spacing } from '../../constants/theme';
import { fetchDailyResults, type DailyResults } from '../../lib/api';
import { dailyRanks, syncDailyVotes } from '../../lib/daily';
import { formatDay, plural } from '../../lib/format';
import { useResponsive } from '../../lib/layout';
import type { Card } from '../../store/types';
import { useTierStore } from '../../store/useTierStore';

/** Average ranking of all players for a validated daily tier list. */
export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const { column, gutter, cardSize } = useResponsive();
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = useTierStore((s) => (id ? s.lists[id] : undefined));
  const [results, setResults] = useState<{ day: string; data?: DailyResults; failed?: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const day = list?.daily?.day;
  const validated = Boolean(list?.daily?.validatedAt);

  useEffect(() => {
    if (!day || !validated) return;
    let cancelled = false;
    // Make sure our own vote is counted before reading the results.
    syncDailyVotes()
      .then(() => fetchDailyResults(day))
      .then((data) => !cancelled && setResults({ day, data }))
      .catch(() => !cancelled && setResults({ day, failed: true }));
    return () => {
      cancelled = true;
    };
  }, [day, validated, attempt]);

  if (!list?.daily) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Cette tier list n’existe plus.</Text>
      </View>
    );
  }

  if (!validated) {
    return (
      <View style={[styles.center, { padding: gutter }]}>
        <Text style={styles.muted}>Validez votre classement pour découvrir celui des autres joueurs.</Text>
        <Button label="Reprendre le classement" onPress={() => router.replace({ pathname: '/editor/[id]', params: { id: list.id } })} />
      </View>
    );
  }

  const current = results?.day === day ? results : null;
  const data = current?.data;
  const mine = dailyRanks(list) ?? [];
  const cards = list.daily.cardIds.map((cid) => list.cards[cid]).filter(Boolean) as Card[];
  const size = Math.round(cardSize('small'));

  // Each item goes to the tier closest to its average, best averages first.
  const rows = list.tiers.map(() => [] as { card: Card; average: number; index: number }[]);
  if (data) {
    cards.forEach((card, index) => {
      const item = data.items[index];
      if (!item) return;
      rows[Math.min(rows.length - 1, Math.max(0, Math.round(item.average)))].push({ card, average: item.average, index });
    });
    rows.forEach((r) => r.sort((a, b) => a.average - b.average));
  }
  const detail = data ? rows.flat() : [];

  return (
    <ScrollView contentContainerStyle={[column, { padding: gutter, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={{ gap: 4 }}>
        <Text style={styles.kicker}>Tier list du jour · {formatDay(list.daily.day)}</Text>
        <Text style={styles.title}>
          {list.daily.emoji} {list.title}
        </Text>
        {data ? <Text style={styles.subtitle}>Classement moyen de {plural(data.votes, 'joueur')}</Text> : null}
      </View>

      {!current ? (
        <ActivityIndicator color={colors.primary} />
      ) : current.failed ? (
        <View style={{ gap: spacing.md }}>
          <Text style={styles.error}>Impossible de charger les résultats : vérifiez votre connexion.</Text>
          <Button
            label="Réessayer"
            icon="refresh"
            variant="secondary"
            onPress={() => {
              setResults(null);
              setAttempt((n) => n + 1);
            }}
          />
        </View>
      ) : (
        <>
          <View style={styles.board}>
            {list.tiers.map((tier, t) => (
              <View key={tier.id} style={styles.row}>
                <View style={[styles.label, { backgroundColor: tier.color, minHeight: size + 8 }]}>
                  <Text style={[styles.labelText, { color: readableTextColor(tier.color) }]}>{tier.label}</Text>
                </View>
                <View style={styles.cards}>
                  {rows[t].map(({ card }) => (
                    <CardView key={card.id} card={card} size={size} />
                  ))}
                </View>
              </View>
            ))}
          </View>

          <View style={{ gap: spacing.md }}>
            <Text style={styles.section}>Détail des votes</Text>
            {detail.map(({ card, index }) => {
              const counts = data!.items[index].counts;
              const votes = counts.reduce((a, b) => a + b, 0) || 1;
              const you = list.tiers[mine[index]];
              return (
                <View key={card.id} style={styles.detail}>
                  <View style={styles.detailHead}>
                    <Text numberOfLines={1} style={styles.detailLabel}>
                      {card.label}
                    </Text>
                    {you ? <Text style={styles.you}>Vous : {you.label}</Text> : null}
                  </View>
                  <View style={styles.bar}>
                    {counts.map((n, t) =>
                      n > 0 ? (
                        <View key={t} style={{ flex: n / votes, backgroundColor: list.tiers[t]?.color ?? colors.border, alignItems: 'center' }}>
                          {n / votes >= 0.12 ? <Text style={styles.barText}>{Math.round((n / votes) * 100)}%</Text> : null}
                        </View>
                      ) : null,
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  kicker: { color: colors.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  subtitle: { color: colors.textMuted, fontSize: 15 },
  error: { color: colors.danger, fontSize: 15, textAlign: 'center' },
  board: { borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 2, borderBottomColor: colors.background },
  label: { width: 56, alignItems: 'center', justifyContent: 'center' },
  labelText: { fontSize: 18, fontWeight: '800' },
  cards: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 4 },
  section: { color: colors.text, fontSize: 18, fontWeight: '700' },
  detail: { gap: 6 },
  detailHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  detailLabel: { color: colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  you: { color: colors.textMuted, fontSize: 13 },
  bar: { flexDirection: 'row', height: 18, borderRadius: 9, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  barText: { color: '#111', fontSize: 10, fontWeight: '800', lineHeight: 18 },
});
