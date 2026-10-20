import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { CardView } from '../../components/CardView';
import { Clickable } from '../../components/Clickable';
import { FriendsResults } from '../../components/FriendsResults';
import { ShareCard } from '../../components/ShareCard';
import { ReminderPrompt } from '../../components/ReminderPrompt';
import { useCelebrating } from '../../components/rewards/MilestoneWatcher';
import { ShareSheet } from '../../components/ShareSheet';
import { Button } from '../../components/ui';
import { colors, radius, readableTextColor, spacing } from '../../constants/theme';
import { fetchDailyResults, fetchListResults, type DailyResults } from '../../lib/api';
import { syncDailyVotes } from '../../lib/daily';
import { formatDay } from '../../lib/format';
import { track } from '../../lib/analytics';
import { fitText } from '../../lib/fitText';
import { useT } from '../../lib/i18n/useT';
import { useLocalizedList } from '../../lib/i18n/useContent';
import { useResponsive } from '../../lib/layout';
import { dailyStreak } from '../../lib/streak';
import type { Card } from '../../store/types';
import { rankingOf, useTierStore } from '../../store/useTierStore';
import { own } from '../../lib/own';

/** Average ranking of all players for a validated daily or popular tier list. */
export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const { column, gutter, cardSize } = useResponsive();
  const { t, upper, locale } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = useLocalizedList(useTierStore((s) => own(s.lists, id)));
  const allLists = useTierStore((s) => s.lists);
  const [results, setResults] = useState<{ key: string; data?: DailyResults; failed?: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<'all' | 'friends'>('all');
  const [shareOpen, setShareOpen] = useState(false);
  const shareCard = useRef<View>(null);

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

  // After the first daily validation, offer the daily reminder once: the player has just
  // started a streak, the moment the reminder means something. iOS asks only on "yes".
  // It waits for the steps celebrated full screen (the first list, the first flame): iOS
  // shows one modal at a time.
  const [reminderDue, setReminderDue] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const celebrating = useCelebrating();
  const isDailyValidated = Boolean(list?.daily?.validatedAt);
  useEffect(() => {
    if (!isDailyValidated || useTierStore.getState().settings.reminderAsked) return;
    const timer = setTimeout(() => setReminderDue(true), 1200);
    return () => clearTimeout(timer);
  }, [isDailyValidated]);
  useEffect(() => {
    if (!reminderDue || celebrating) return;
    // Room for the celebration to fade out first.
    const timer = setTimeout(() => {
      // Asked once, counted when it really shows (not if the player left the page before).
      useTierStore.getState().updateSettings({ reminderAsked: true });
      setReminderOpen(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [reminderDue, celebrating]);
  const closeReminder = () => {
    setReminderDue(false);
    setReminderOpen(false);
  };

  if (!list || !ranked) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('app.results.gone')}</Text>
      </View>
    );
  }

  if (!validated) {
    return (
      <View style={[styles.center, { padding: gutter }]}>
        <Text style={styles.muted}>{t('app.results.validateFirst')}</Text>
        <Button label={t('app.results.resume')} onPress={() => router.replace({ pathname: '/editor/[id]', params: { id: list.id } })} />
      </View>
    );
  }

  const current = results?.key === key ? results : null;
  const data = current?.data;
  // "You" is the validated ranking (the list may have changed since).
  const mine = ranked.validatedRanks ?? rankingOf(list, ranked.cardIds) ?? [];
  const voteKey = list.daily ? `daily:${list.daily.day}` : (list.popular?.voteKey ?? '');
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
  const tierLabel = (tier: number) => list.tiers[Math.min(list.tiers.length - 1, Math.max(0, Math.round(tier)))]?.label ?? '?';

  // The player's own ranking, tier by tier, for the shared picture.
  const myRows = list.tiers.map((_, tier) => cards.filter((_, i) => mine[i] === tier));
  const shareImage = async () => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(t('app.results.shareUnavailableTitle'), t('app.results.shareUnavailableBody'));
        return;
      }
      // 360 × 640 points at the screen's scale: 1080 × 1920 on an iPhone, a story's size.
      const uri = await captureRef(shareCard, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: list.title });
      track('share_image', { kind: list.daily ? 'daily' : list.popular ? 'public' : 'personal' });
    } catch {
      Alert.alert(t('app.results.shareFailedTitle'), t('app.results.shareFailedBody'));
    }
  };

  const edit = () => router.replace({ pathname: '/editor/[id]', params: { id: list.id } });
  const home = () => (router.canDismiss() ? router.dismissTo('/') : router.replace('/'));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[column, { padding: gutter, gap: spacing.xl, paddingBottom: spacing.xl }]}>
        <View style={{ gap: 4 }}>
          <Text style={styles.kicker}>{upper(list.daily ? t('app.results.dailyKicker', { day: formatDay(list.daily.day, locale) }) : t('app.results.publicList'))}</Text>
          <Text style={styles.title}>
            {list.emoji ?? list.daily?.emoji} {list.title}
          </Text>
          {streak > 0 ? <Text style={styles.streak}>{t('app.results.streak', { count: streak })}</Text> : null}
        </View>

        <View style={styles.tabs} accessibilityRole="tablist">
          {(
            [
              ['all', t('app.results.allPlayers')],
              ['friends', t('app.friends')],
            ] as const
          ).map(([key, label]) => (
            <Clickable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              onPress={() => setTab(key)}
              style={[styles.tab, tab === key && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </Clickable>
          ))}
        </View>

        {tab === 'friends' ? (
          <FriendsResults list={list} voteKey={voteKey} mine={mine} cards={cards} />
        ) : !current ? (
          <ActivityIndicator color={colors.primary} />
        ) : current.failed ? (
          <View style={{ gap: spacing.md }}>
            <Text style={styles.error}>{t('app.results.loadFailed')}</Text>
            <Button
              label={t('app.results.retry')}
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
                <Text style={styles.scoreValue}>{t('app.percent', { value: agreement })}</Text>
                <Text style={styles.scoreLabel}>{t('app.results.agreement')}</Text>
                {original && Math.abs(original.mine - original.average) >= 1 ? (
                  <Text style={styles.scoreDetail}>
                    {t('app.results.original', { card: original.card.label, mine: tierLabel(original.mine), average: tierLabel(original.average) })}
                  </Text>
                ) : null}
              </View>
            ) : data && data.votes <= 1 ? (
              <Text style={styles.subtitle}>{t('app.results.first')}</Text>
            ) : null}

            <View style={styles.board}>
              {list.tiers.map((tier, row) => (
                <View key={tier.id} style={styles.row}>
                  <View style={[styles.label, { backgroundColor: tier.color, minHeight: size + 8 }]}>
                    <Text style={[styles.labelText, { color: readableTextColor(tier.color), fontSize: tierFit(tier.label).fontSize }]}>
                      {tierFit(tier.label).lines.join('\n')}
                    </Text>
                  </View>
                  <View style={styles.cards}>
                    {rows[row].map(({ card }) => (
                      <CardView key={card.id} card={card} size={size} />
                    ))}
                  </View>
                </View>
              ))}
            </View>

            <View style={{ gap: spacing.md }}>
              <View style={styles.sectionRow}>
                <Text style={styles.section}>{t('app.results.votes')}</Text>
                {data ? <Text style={styles.sectionHint}>{t('app.results.among', { count: data.votes })}</Text> : null}
              </View>
              {detail.map(({ card, index }) => {
                const counts = data!.items[index].counts;
                const votes = counts.reduce((a, b) => a + b, 0) || 1;
                const you = list.tiers[mine[index]];
                return (
                  <View key={card.id} style={styles.detail}>
                    <View style={styles.detailHead}>
                      <Text style={styles.detailLabel}>
                        {card.label}
                      </Text>
                      {you ? <Text style={styles.you}>{t('app.results.you', { tier: you.label })}</Text> : null}
                    </View>
                    <View style={styles.bar}>
                      {counts.map((n, tier) =>
                        n > 0 ? (
                          <View key={tier} style={{ flex: n / votes, backgroundColor: list.tiers[tier]?.color ?? colors.border, alignItems: 'center' }}>
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
      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button style={styles.action} variant="secondary" icon="arrow-back" label={t('app.results.edit')} onPress={edit} />
        <Button style={styles.action} variant="secondary" icon="share-outline" label={t('app.results.share')} onPress={() => setShareOpen(true)} />
        <Button style={styles.action} icon="arrow-forward" label={t('app.results.home')} onPress={home} />
      </View>
      {/* The picture for social networks, drawn off screen, captured when shared. */}
      <View style={styles.offscreen} pointerEvents="none">
        <ShareCard ref={shareCard} list={list} rows={myRows} agreement={data && data.votes > 1 && agreement !== null ? agreement : undefined} />
      </View>
      <ReminderPrompt visible={reminderOpen} onClose={closeReminder} />
      <ShareSheet list={list} visible={shareOpen} onClose={() => setShareOpen(false)} onShareImage={shareImage} imageLabel={t('app.results.shareImage')} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  // Capitals through upper(), not textTransform: Greek capitals drop their accents.
  kicker: { color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
  streak: { color: '#FFBF7F', fontSize: 14, fontWeight: '700' },
  score: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  scoreValue: { color: colors.text, fontSize: 40, fontWeight: '800' },
  scoreLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  scoreDetail: { color: colors.text, fontSize: 13, textAlign: 'center', marginTop: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 15 },
  error: { color: colors.danger, fontSize: 15, textAlign: 'center' },
  board: { borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 2, borderBottomColor: colors.background },
  label: { width: 56, alignItems: 'center', justifyContent: 'center', padding: 4 },
  // Sized to the longest word, as in the editor: « Délicieux » ran past the label.
  labelText: { fontWeight: '800', textAlign: 'center' },
  cards: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 4 },
  section: { color: colors.text, fontSize: 18, fontWeight: '700' },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  sectionHint: { color: colors.textMuted, fontSize: 14 },
  detail: { gap: 6 },
  detailHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  detailLabel: { color: colors.text, fontSize: 15, fontWeight: '600', flexShrink: 1 },
  you: { color: colors.textMuted, fontSize: 13 },
  bar: { flexDirection: 'row', height: 18, borderRadius: 9, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: 4, gap: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
  tabTextActive: { color: colors.primaryText },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.tray,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  action: { flex: 1, paddingHorizontal: spacing.sm },
  offscreen: { position: 'absolute', left: -2000, top: 0 },
  barText: { color: '#111', fontSize: 10, fontWeight: '800', lineHeight: 18 },
});

/** A tier's name whole in its 56-point label (4 of padding each side). */
const tierFit = (label: string) => fitText(label, 56 - 8, { maxLines: 3, max: 18, min: 8 });
