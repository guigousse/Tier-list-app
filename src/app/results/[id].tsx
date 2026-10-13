import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardView } from '../../components/CardView';
import { Button } from '../../components/ui';
import { colors, radius, readableTextColor, spacing } from '../../constants/theme';
import { fetchDailyResults, fetchListResults, type DailyResults } from '../../lib/api';
import { syncDailyVotes } from '../../lib/daily';
import { formatDay, plural } from '../../lib/format';
import { useResponsive } from '../../lib/layout';
import { setDailyReminder } from '../../lib/reminders';
import { dailyStreak } from '../../lib/streak';
import type { Card } from '../../store/types';
import { rankingOf, useTierStore } from '../../store/useTierStore';

/** Average ranking of all players for a validated daily or popular tier list. */
export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const { column, gutter, cardSize } = useResponsive();
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = useTierStore((s) => (id ? s.lists[id] : undefined));
  const allLists = useTierStore((s) => s.lists);
  const [results, setResults] = useState<{ key: string; data?: DailyResults; failed?: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const ranked = list?.daily ?? list?.popular;
  // Results are fetched by daily date or popular statistics key.
  const key = list?.daily ? list.daily.day : list?.popular?.voteKey;
  const validated = Boolean(ranked?.validatedAt);

  useEffect(() => {
    if (!key || !validated || !list) return;
    let cancelled = false;
    const isDaily = Boolean(list.daily);
    // Make sure our own vote is counted before reading the results.
    syncDailyVotes()
      .then(() => (isDaily ? fetchDailyResults(key) : fetchListResults(key)))
      .then((data) => !cancelled && setResults({ key, data }))
      .catch(() => !cancelled && setResults({ key, failed: true }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the list object changes on every edit
  }, [key, validated, attempt]);

  // After the first daily validation, offer the daily reminder once.
  const isDailyValidated = Boolean(list?.daily?.validatedAt);
  useEffect(() => {
    const { settings, updateSettings } = useTierStore.getState();
    if (!isDailyValidated || settings.reminderAsked) return;
    updateSettings({ reminderAsked: true });
    const timer = setTimeout(
      () =>
        Alert.alert('Ne ratez aucune tier list du jour', `Recevoir un rappel chaque jour à ${settings.reminderHour} h ? (modifiable dans les Réglages)`, [
          { text: 'Plus tard', style: 'cancel' },
          {
            text: 'Oui',
            onPress: async () => {
              if (await setDailyReminder(true, settings.reminderHour)) useTierStore.getState().updateSettings({ dailyReminder: true });
            },
          },
        ]),
      1200,
    );
    return () => clearTimeout(timer);
  }, [isDailyValidated]);

  if (!list || !ranked) {
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

  const current = results?.key === key ? results : null;
  const data = current?.data;
  // For a popular list, "you" is the validated ranking (the list may have changed since).
  const mine = (list.popular ? list.popular.validatedRanks : rankingOf(list, ranked.cardIds)) ?? [];
  const cards = ranked.cardIds.map((cid) => list.cards[cid]).filter(Boolean) as Card[];
  const size = Math.round(cardSize('small'));
  const streak = list.daily ? dailyStreak(Object.values(allLists)) : 0;

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

  // How close the player is to everyone: 100 % = same tier as the average on every card.
  const compared = data
    ? cards.flatMap((card, i) => (data.items[i] && mine[i] !== undefined ? [{ card, mine: mine[i], average: data.items[i].average }] : []))
    : [];
  const agreement = compared.length
    ? Math.round((compared.reduce((sum, c) => sum + (1 - Math.abs(c.mine - c.average) / 4), 0) / compared.length) * 100)
    : null;
  const original = compared.reduce<(typeof compared)[number] | null>(
    (best, c) => (!best || Math.abs(c.mine - c.average) > Math.abs(best.mine - best.average) ? c : best),
    null,
  );
  const tierLabel = (t: number) => list.tiers[Math.min(list.tiers.length - 1, Math.max(0, Math.round(t)))]?.label ?? '?';
  const verdict = agreement === null ? '' : agreement >= 85 ? 'Dans le consensus' : agreement >= 65 ? 'Plutôt d’accord' : 'Esprit rebelle';

  return (
    <ScrollView contentContainerStyle={[column, { padding: gutter, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={{ gap: 4 }}>
        <Text style={styles.kicker}>{list.daily ? `Tier list du jour · ${formatDay(list.daily.day)}` : 'Liste populaire'}</Text>
        <Text style={styles.title}>
          {list.emoji ?? list.daily?.emoji} {list.title}
        </Text>
        {data ? <Text style={styles.subtitle}>Classement moyen de {plural(data.votes, 'joueur')}</Text> : null}
        {streak > 0 ? <Text style={styles.streak}>🔥 Série : {plural(streak, 'jour')} d’affilée</Text> : null}
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
          {data && data.votes > 1 && agreement !== null ? (
            <View style={styles.score}>
              <Text style={styles.scoreValue}>{agreement} %</Text>
              <Text style={styles.scoreLabel}>d’accord avec les joueurs · {verdict}</Text>
              {original && Math.abs(original.mine - original.average) >= 1 ? (
                <Text style={styles.scoreDetail}>
                  Votre choix le plus original : {original.card.label} (vous : {tierLabel(original.mine)}, joueurs : {tierLabel(original.average)})
                </Text>
              ) : null}
            </View>
          ) : data && data.votes <= 1 ? (
            <Text style={styles.subtitle}>Vous êtes parmi les premiers à valider : revenez plus tard pour voir l’avis des autres joueurs.</Text>
          ) : null}

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
  streak: { color: '#FFBF7F', fontSize: 14, fontWeight: '700' },
  score: { alignItems: 'center', gap: 4, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.primary },
  scoreValue: { color: colors.text, fontSize: 40, fontWeight: '800' },
  scoreLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  scoreDetail: { color: colors.text, fontSize: 13, textAlign: 'center', marginTop: spacing.xs },
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
