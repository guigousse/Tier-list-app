import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarWithBadges } from '../components/BadgeIcon';
import { DailyCard } from '../components/DailyCard';
import { EnergyPill } from '../components/Energy';
import { isValidated, PopularList, usePopularCopies } from '../components/PopularList';
import { ListRow } from '../components/ListRow';
import { IconButton, SectionTitle, type IconName } from '../components/ui';
import { colors, radius, spacing, TIER_COLORS } from '../constants/theme';
import { createAndOpen } from '../lib/create';
import { useResponsive } from '../lib/layout';
import { popularity, useCatalog, usePopularTemplates } from '../store/useCatalog';
import { forYou, trending } from '../lib/discover';
import type { Template } from '../constants/presets';
import { knownBadges, usePendingBadges } from '../lib/badges';
import { useMail, useUnreadMail } from '../store/useMail';
import { useTierStore } from '../store/useTierStore';
import { Clickable } from '../components/Clickable';

/** Size of the player's avatar next to the buttons. */
const ME = 84;

function Tile({ icon, title, badge = 0, onPress }: { icon: IconName; title: string; badge?: number; onPress: () => void }) {
  const { isCompact } = useResponsive();
  return (
    <Clickable
      accessibilityRole="button"
      accessibilityLabel={badge > 0 ? `${title}, ${badge} nouveauté${badge > 1 ? 's' : ''}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, isCompact && styles.tileCompact, pressed && { opacity: 0.8 }]}
    >
      <Ionicons name={icon} size={26} color={colors.primary} />
      <Text numberOfLines={2} style={[styles.tileTitle, isCompact && styles.tileTitleCompact]}>
        {title}
      </Text>
      {badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Clickable>
  );
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const lists = useTierStore((s) => s.lists);
  // Daily and popular tier lists live in their own sections.
  const all = useMemo(() => Object.values(lists).filter((l) => !l.daily && !l.popular), [lists]);
  const favorites = useMemo(() => all.filter((l) => l.favorite).sort((a, b) => b.updatedAt - a.updatedAt), [all]);

  const popular = usePopularTemplates();
  // "Tendances": the last days' activity; "Pour toi": themes of the lists already completed.
  const [discover, setDiscover] = useState<'trends' | 'forYou'>('trends');
  const discovery = useCatalog((s) => s.discovery);
  const stats = useCatalog((s) => s.stats);
  const favoriteTemplates = useTierStore((s) => s.favoriteTemplates);
  const copies = usePopularCopies();
  const shown = useMemo(() => {
    const isDone = (t: Template) => isValidated(copies(t));
    const score = (key: string) => popularity(stats, key);
    return discover === 'trends' ? trending(popular, discovery, score, isDone) : forYou(popular, discovery, score, isDone, favoriteTemplates);
  }, [discover, popular, discovery, stats, copies, favoriteTemplates]);
  const unread = useUnreadMail();
  const pendingBadges = usePendingBadges();
  const profile = useTierStore((s) => s.profile);
  const shownBadges = useTierStore((s) => s.shownBadges);

  // Lists received from friends: the badge on Profil is up to date when coming back here.
  useFocusEffect(
    useCallback(() => {
      useMail.getState().refresh();
    }, []),
  );

  const open = (id: string) => router.push({ pathname: '/editor/[id]', params: { id } });

  // First launch: welcome screens.
  const onboarded = useTierStore((s) => s.settings.onboarded);
  useEffect(() => {
    if (!onboarded) router.push('/welcome');
  }, [onboarded]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Fixed banner: only the content below scrolls. */}
      <View style={[column, styles.banner, { paddingTop: insets.top + spacing.md, paddingHorizontal: gutter }]}>
        <View style={styles.header}>
          <Text numberOfLines={1} style={styles.brand}>
            Tiercraft
          </Text>
          <View style={styles.headerIcons}>
            <EnergyPill onPress={() => router.push('/store')} />
            <IconButton icon="settings-outline" label="Réglages" onPress={() => router.push('/settings')} />
          </View>
        </View>
        <View style={styles.brandStrip}>
          {TIER_COLORS.slice(0, 5).map((c) => (
            <View key={c} style={[styles.brandStripSegment, { backgroundColor: c }]} />
          ))}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[column, { paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: gutter, gap: spacing.xl }]}
      >
      <DailyCard />

      <View style={styles.tiles}>
        {/* The player first: their avatar with its badges, no frame. */}
        <Clickable
          accessibilityRole="button"
          accessibilityLabel={unread + pendingBadges > 0 ? `Profil, ${unread + pendingBadges} nouveauté${unread + pendingBadges > 1 ? 's' : ''}` : 'Profil'}
          onPress={() => router.push('/social')}
          hitSlop={6}
          style={({ pressed }) => [styles.me, pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }]}
        >
          {profile ? (
            <AvatarWithBadges avatar={profile.avatar} seed={profile.id} size={ME} badges={knownBadges(shownBadges)} />
          ) : (
            <Ionicons name="person-circle" size={ME} color={colors.surfaceAlt} />
          )}
          {unread + pendingBadges > 0 ? (
            <View style={[styles.badge, styles.meBadge]}>
              <Text style={styles.badgeText}>{unread + pendingBadges > 9 ? '9+' : unread + pendingBadges}</Text>
            </View>
          ) : null}
        </Clickable>
        <Tile icon="add-circle-outline" title="Nouvelle liste" onPress={() => createAndOpen()} />
        <Tile icon="albums-outline" title="Mes listes" onPress={() => router.push('/lists')} />
      </View>

      <View style={{ gap: spacing.md }}>
        <View style={styles.sectionHead}>
          <SectionTitle>Listes publiques</SectionTitle>
          <View style={styles.discover} accessibilityRole="tablist">
            {(
              [
                { key: 'trends', label: 'Tendances' },
                { key: 'forYou', label: 'Pour toi' },
              ] as const
            ).map((t) => (
              <Clickable
                key={t.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: discover === t.key }}
                onPress={() => setDiscover(t.key)}
                style={[styles.discoverTab, discover === t.key && styles.discoverTabOn]}
              >
                <Text style={[styles.discoverText, discover === t.key && { color: colors.text }]}>{t.label}</Text>
              </Clickable>
            ))}
          </View>
        </View>
        <PopularList templates={shown.slice(0, 5)} />
        {popular.length > 5 ? (
          <Clickable accessibilityRole="button" onPress={() => router.push('/popular')} hitSlop={8} style={styles.historyLink}>
            <Text style={styles.link}>Voir plus</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Clickable>
        ) : null}
      </View>

      {favorites.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <SectionTitle>Favoris</SectionTitle>
          {favorites.map((l) => (
            <ListRow key={l.id} list={l} onPress={() => open(l.id)} />
          ))}
        </View>
      ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { gap: spacing.sm, paddingBottom: spacing.sm, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  brand: { flexShrink: 1, color: colors.text, fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  brandStrip: { flexDirection: 'row', gap: 4 },
  brandStripSegment: { flex: 1, height: 4, borderRadius: 2 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  discover: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: 3, gap: 2 },
  discoverTab: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm },
  discoverTabOn: { backgroundColor: colors.surfaceAlt },
  discoverText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  tiles: { flexDirection: 'row', gap: spacing.md },
  me: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  meBadge: { top: -2, right: -4, borderColor: colors.background },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileCompact: { padding: spacing.sm },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: '#FF3B4E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  tileTitleCompact: { fontSize: 14 },
  tileTitle: { color: colors.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  historyLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: spacing.xs },
  link: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg },
  emptyEmoji: { fontSize: 40 },
  emptyText: { color: colors.textMuted, textAlign: 'center', fontSize: 15, lineHeight: 21 },
});
