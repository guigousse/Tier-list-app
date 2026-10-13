import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DailyCard } from '../components/DailyCard';
import { PopularList } from '../components/PopularList';
import { ListRow } from '../components/ListRow';
import { IconButton, SectionTitle, type IconName } from '../components/ui';
import { colors, radius, spacing, TIER_COLORS } from '../constants/theme';
import { createAndOpen } from '../lib/create';
import { useResponsive } from '../lib/layout';
import { usePopularTemplates } from '../store/useCatalog';
import { useTierStore } from '../store/useTierStore';
import { Clickable } from '../components/Clickable';

function Tile({ icon, title, onPress }: { icon: IconName; title: string; onPress: () => void }) {
  const { isCompact } = useResponsive();
  return (
    <Clickable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, isCompact && styles.tileCompact, pressed && { opacity: 0.8 }]}
    >
      <Ionicons name={icon} size={26} color={colors.primary} />
      <Text numberOfLines={2} style={[styles.tileTitle, isCompact && styles.tileTitleCompact]}>
        {title}
      </Text>
    </Clickable>
  );
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const lists = useTierStore((s) => s.lists);
  // Daily and popular tier lists live in their own sections.
  const all = useMemo(() => Object.values(lists).filter((l) => !l.daily && !l.popular), [lists]);
  const validatedDaily = useMemo(() => Object.values(lists).filter((l) => l.daily?.validatedAt).length, [lists]);
  const favorites = useMemo(() => all.filter((l) => l.favorite).sort((a, b) => b.updatedAt - a.updatedAt), [all]);

  const popular = usePopularTemplates();

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
          <IconButton icon="settings-outline" label="Réglages" onPress={() => router.push('/settings')} />
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
      <View style={{ gap: spacing.sm }}>
        <DailyCard />
        {validatedDaily > 0 ? (
          <Clickable accessibilityRole="button" onPress={() => router.push('/history')} hitSlop={8} style={styles.historyLink}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={styles.link}>Historique des tier lists du jour ({validatedDaily})</Text>
          </Clickable>
        ) : null}
      </View>

      <View style={styles.tiles}>
        <Tile icon="add-circle-outline" title="Nouvelle liste" onPress={() => createAndOpen()} />
        <Tile icon="albums-outline" title="Mes listes" onPress={() => router.push('/lists')} />
        <Tile icon="sparkles-outline" title="Modèle de liste" onPress={() => router.push('/templates')} />
      </View>

      <View style={{ gap: spacing.md }}>
        <SectionTitle>Listes populaires</SectionTitle>
        <PopularList templates={popular.slice(0, 5)} />
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
  tiles: { flexDirection: 'row', gap: spacing.md },
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
  tileTitleCompact: { fontSize: 14 },
  tileTitle: { color: colors.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  historyLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: spacing.xs },
  link: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg },
  emptyEmoji: { fontSize: 40 },
  emptyText: { color: colors.textMuted, textAlign: 'center', fontSize: 15, lineHeight: 21 },
});
