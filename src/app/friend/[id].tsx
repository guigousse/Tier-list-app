import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarWithBadges } from '../../components/BadgeIcon';
import { Clickable } from '../../components/Clickable';
import { IconButton } from '../../components/ui';
import type { Template } from '../../constants/presets';
import { colors, radius, spacing, TIER_COLORS } from '../../constants/theme';
import { fetchFriendLists, removeFriend, type FriendVote, type PublicProfile } from '../../lib/api';
import { openPopular } from '../../lib/create';
import { completedLabel, friendMails, type FriendMail } from '../../lib/friendProfile';
import { openMail } from '../../lib/mail';
import { knownBadges } from '../../lib/badges';
import { splitEmoji } from '../../lib/emoji';
import { useResponsive } from '../../lib/layout';
import { agreement, confirmReport, friendCode, myRanks, socialError, voteTemplate } from '../../lib/social';
import { useCatalog, usePopularTemplates } from '../../store/useCatalog';
import { useMail } from '../../store/useMail';
import { useTierStore } from '../../store/useTierStore';

const TIERS = 'SABCD';

type Entry = { vote: FriendVote; template?: Template; mine: number[] | null; score: number | null };

function TierChip({ tier }: { tier: number | undefined }) {
  if (tier === undefined) return <View style={[styles.chip, { backgroundColor: colors.surfaceAlt }]} />;
  return (
    <View style={[styles.chip, { backgroundColor: TIER_COLORS[tier] }]}>
      <Text style={styles.chipText}>{TIERS[tier]}</Text>
    </View>
  );
}

/** Card by card: the player's tier and the friend's. */
function Comparison({ template, mine, theirs, name }: { template: Template; mine: number[]; theirs: number[]; name: string }) {
  return (
    <View style={styles.comparison}>
      <View style={styles.compareHead}>
        <Text style={[styles.compareLabel, { flex: 1, textAlign: 'left' }]}>Carte</Text>
        <Text style={styles.compareLabel}>Vous</Text>
        <Text numberOfLines={1} style={[styles.compareLabel, { maxWidth: 70 }]}>
          {name}
        </Text>
      </View>
      {template.items.map((item, i) => {
        const { emoji, text } = splitEmoji(item);
        const same = mine[i] === theirs[i];
        return (
          <View key={item} style={styles.compareRow}>
            <Text style={styles.compareItem}>
              {emoji ? `${emoji} ` : ''}
              {text || item}
            </Text>
            {same ? <Ionicons name="checkmark" size={14} color="#2EAD6B" /> : null}
            <TierChip tier={mine[i]} />
            <TierChip tier={theirs[i]} />
          </View>
        );
      })}
    </View>
  );
}

/** A list exchanged with the friend: opens to rank it, or to both rankings side by side. */
function MailEntry({ row, name }: { row: FriendMail; name: string }) {
  const date = new Date(row.mail.sentAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return (
    <View style={styles.entry}>
      <Clickable
        accessibilityRole="button"
        onPress={() => openMail(row.mail, row.received)}
        style={({ pressed }) => [styles.entryRow, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name={row.received ? 'mail-open-outline' : 'paper-plane-outline'} size={26} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.entryTitle}>
            {row.mail.list.title}
          </Text>
          <Text style={styles.muted}>
            {row.received ? `Envoyée par ${name}` : 'Envoyée par vous'} le {date}
          </Text>
        </View>
        {row.score !== null ? (
          <View style={styles.score}>
            <Text style={styles.scoreText}>{row.score} %</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        ) : (
          <Text style={styles.cta}>{row.received ? 'À votre tour' : 'Voir'}</Text>
        )}
      </Clickable>
    </View>
  );
}

/** A friend's profile: their completed tier lists, compared with the player's rankings. */
export default function Friend() {
  // `key`: a list to show compared right away (from a notification).
  const { id, key } = useLocalSearchParams<{ id: string; key?: string }>();
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const profile = useTierStore((s) => s.profile);
  const lists = useTierStore((s) => s.lists);
  const templates = usePopularTemplates();
  const daily = useCatalog((s) => s.daily);
  const pastDailies = useCatalog((s) => s.pastDailies);
  const [data, setData] = useState<{ profile: PublicProfile; votes: FriendVote[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(key ?? null);
  // « En commun » : only the lists both ranked, to compare.
  const [onlyCommon, setOnlyCommon] = useState(false);
  const inbox = useMail((s) => s.inbox);
  const outbox = useMail((s) => s.outbox);

  useEffect(() => {
    if (!profile || !id) return;
    fetchFriendLists(profile.secret, id).then(setData, (e) => setError(socialError(e)));
    useMail.getState().refresh();
  }, [profile, id]);

  const entries = useMemo<Entry[]>(() => {
    if (!data) return [];
    const dailies = daily ? [daily, ...pastDailies] : pastDailies;
    return data.votes.map((vote) => {
      const template = voteTemplate(vote, templates, dailies);
      const mine = template ? myRanks(template, lists) : null;
      return { vote, template, mine, score: mine ? agreement(mine, vote.ranks) : null };
    });
  }, [data, templates, daily, pastDailies, lists]);

  // Lists exchanged between the two of them: their profile counts them, and so does this page.
  const mails = useMemo(() => (id ? friendMails(id, inbox, outbox) : []), [id, inbox, outbox]);
  const scores = [...entries, ...mails].map((e) => e.score).filter((v): v is number => v !== null);
  const average = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;
  const shownEntries = onlyCommon ? entries.filter((e) => e.score !== null) : entries;
  const shownMails = onlyCommon ? mails.filter((m) => m.score !== null) : mails;

  const remove = () =>
    data &&
    Alert.alert('Retirer cet ami ?', `${friendCode(data.profile)} ne verra plus vos classements, et vous non plus les siens.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: () => removeFriend(profile!.secret, data.profile.id).then(() => router.back(), (e) => Alert.alert('Oups', socialError(e))),
      },
    ]);

  return (
    <ScrollView contentContainerStyle={[column, { padding: gutter, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <Stack.Screen
        options={{
          title: data?.profile.pseudo ?? 'Ami',
          headerRight: () =>
            data ? (
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <IconButton icon="flag-outline" label="Signaler ou bloquer ce joueur" onPress={() => confirmReport(data.profile, () => router.back())} />
                <IconButton icon="person-remove-outline" label="Retirer cet ami" onPress={remove} />
              </View>
            ) : null,
        }}
      />
      {error ? (
        <Text style={styles.muted}>{error}</Text>
      ) : !data ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <View style={styles.header}>
            <AvatarWithBadges avatar={data.profile.avatar} seed={data.profile.id} size={88} badges={knownBadges(data.profile.badges)} />
            <Text style={styles.name}>
              {data.profile.pseudo}
              <Text style={styles.tag}> #{data.profile.tag}</Text>
            </Text>
            <View style={styles.stats}>
              <Clickable
                accessibilityRole="button"
                accessibilityState={{ selected: !onlyCommon }}
                onPress={() => setOnlyCommon(false)}
                style={styles.stat}
              >
                <Text style={styles.statValue}>{data.profile.completed}</Text>
                <Text style={styles.statLabel}>{completedLabel(data.profile.completed)}</Text>
              </Clickable>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{average === null ? '–' : `${average} %`}</Text>
                <Text style={styles.statLabel}>d’accord avec vous</Text>
              </View>
              <Clickable
                accessibilityRole="button"
                accessibilityLabel={`${scores.length} en commun : afficher seulement les listes classées par vous deux`}
                accessibilityState={{ selected: onlyCommon, disabled: scores.length === 0 }}
                disabled={scores.length === 0}
                onPress={() => setOnlyCommon((v) => !v)}
                style={({ pressed }) => [styles.stat, onlyCommon && styles.statOn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.statValue}>{scores.length}</Text>
                <Text style={styles.statLabel}>en commun</Text>
              </Clickable>
            </View>
          </View>

          <View style={{ gap: spacing.sm }}>
            {onlyCommon ? (
              <View style={styles.filterHead}>
                <Text style={styles.filterTitle}>Listes en commun</Text>
                <Clickable accessibilityRole="button" onPress={() => setOnlyCommon(false)} hitSlop={8}>
                  <Text style={styles.cta}>Tout afficher</Text>
                </Clickable>
              </View>
            ) : null}
            {entries.length === 0 && mails.length === 0 ? (
              <Text style={styles.muted}>
                {data.profile.completed > 0
                  ? `Les listes de ${data.profile.pseudo} ont été classées avec d’autres amis : elles restent privées. Envoyez-lui une liste pour comparer vos classements !`
                  : `${data.profile.pseudo} n’a encore validé aucune liste.`}
              </Text>
            ) : null}
            {shownEntries.map((e) => {
              const expanded = open === e.vote.key;
              const title = e.template?.title ?? 'Liste retirée';
              const date = new Date(e.vote.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
              return (
                <View key={e.vote.key} style={styles.entry}>
                  <Clickable
                    accessibilityRole="button"
                    disabled={!e.template}
                    onPress={() => {
                      if (!e.template) return;
                      // Not ranked yet by the player: open it to rank it, then compare.
                      if (!e.mine) return openPopular(e.template);
                      setOpen(expanded ? null : e.vote.key);
                    }}
                    style={({ pressed }) => [styles.entryRow, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.entryEmoji}>{e.template?.emoji ?? '❔'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entryTitle}>
                        {title}
                      </Text>
                      <Text style={styles.muted}>Validée le {date}</Text>
                    </View>
                    {e.score !== null ? (
                      <View style={styles.score}>
                        <Text style={styles.scoreText}>{e.score} %</Text>
                        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                      </View>
                    ) : e.template ? (
                      <Text style={styles.cta}>À votre tour</Text>
                    ) : null}
                  </Clickable>
                  {expanded && e.template && e.mine ? (
                    <Comparison template={e.template} mine={e.mine} theirs={e.vote.ranks} name={data.profile.pseudo} />
                  ) : null}
                </View>
              );
            })}
            {shownMails.length > 0 ? <Text style={styles.section}>Entre vous</Text> : null}
            {shownMails.map((m) => (
              <MailEntry key={m.mail.id} row={m} name={data.profile.pseudo} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted, fontSize: 13 },
  section: { color: colors.textMuted, fontSize: 13, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: spacing.sm },
  filterHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  statOn: { borderWidth: 2, borderColor: colors.primary, paddingVertical: spacing.md - 2 },
  header: { alignItems: 'center', gap: spacing.sm },
  name: { color: colors.text, fontSize: 24, fontWeight: '800' },
  tag: { color: colors.textMuted, fontWeight: '500' },
  stats: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch', marginTop: spacing.sm },
  stat: { flex: 1, alignItems: 'center', gap: 2, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.md },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  entry: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  entryEmoji: { fontSize: 28 },
  entryTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  score: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  cta: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  comparison: { borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md, gap: 6 },
  compareHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  compareLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', minWidth: 30, textAlign: 'center' },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  compareItem: { flex: 1, color: colors.text, fontSize: 14 },
  chip: { width: 30, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  chipText: { color: '#111', fontWeight: '900', fontSize: 13 },
});
