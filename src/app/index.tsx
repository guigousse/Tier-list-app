import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DailyCard } from '../components/DailyCard';
import { ListRow } from '../components/ListRow';
import { IconButton, SectionTitle, type IconName } from '../components/ui';
import { colors, radius, spacing, TIER_COLORS } from '../constants/theme';
import { useResponsive } from '../lib/layout';
import { useTierStore } from '../store/useTierStore';
import { Clickable } from '../components/Clickable';

function Tile({ icon, title, subtitle, onPress }: { icon: IconName; title: string; subtitle: string; onPress: () => void }) {
  const { isCompact } = useResponsive();
  return (
    <Clickable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, isCompact && styles.tileCompact, pressed && { opacity: 0.8 }]}
    >
      <Ionicons name={icon} size={24} color={colors.primary} />
      <Text numberOfLines={2} style={[styles.tileTitle, isCompact && styles.tileTitleCompact]}>
        {title}
      </Text>
      <Text numberOfLines={2} style={styles.tileSubtitle}>
        {subtitle}
      </Text>
    </Clickable>
  );
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const lists = useTierStore((s) => s.lists);
  // Daily tier lists live in their own card and history.
  const all = useMemo(() => Object.values(lists).filter((l) => !l.daily), [lists]);
  const validatedDaily = useMemo(() => Object.values(lists).filter((l) => l.daily?.validatedAt).length, [lists]);
  const recent = useMemo(() => [...all].sort((a, b) => b.openedAt - a.openedAt).slice(0, 5), [all]);
  const favorites = useMemo(() => all.filter((l) => l.favorite).sort((a, b) => b.updatedAt - a.updatedAt), [all]);

  const open = (id: string) => router.push({ pathname: '/editor/[id]', params: { id } });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[column, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: gutter, gap: spacing.xl }]}
    >
      <View style={{ gap: spacing.sm }}>
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
        <Tile icon="add-circle-outline" title="Nouvelle tier list" subtitle="Partir de zéro" onPress={() => router.push('/new')} />
        <Tile icon="albums-outline" title="Mes tier lists" subtitle={`${all.length} enregistrée${all.length > 1 ? 's' : ''}`} onPress={() => router.push('/lists')} />
        <Tile icon="sparkles-outline" title="Modèles" subtitle="Prêts à classer" onPress={() => router.push('/templates')} />
      </View>

      <View style={{ gap: spacing.md }}>
        <SectionTitle
          right={
            all.length > 0 ? (
              <Clickable onPress={() => router.push('/lists')} hitSlop={8}>
                <Text style={styles.link}>Tout voir</Text>
              </Clickable>
            ) : undefined
          }
        >
          Récemment ouvertes
        </SectionTitle>
        {recent.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={styles.emptyText}>Aucune tier list pour l’instant. Créez la première ou partez d’un modèle !</Text>
          </View>
        ) : (
          recent.map((l) => <ListRow key={l.id} list={l} onPress={() => open(l.id)} timestampKey="openedAt" />)
        )}
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
  );
}

const styles = StyleSheet.create({
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
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileCompact: { padding: spacing.sm },
  tileTitleCompact: { fontSize: 14 },
  tileTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  tileSubtitle: { color: colors.textMuted, fontSize: 13 },
  historyLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: spacing.xs },
  link: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg },
  emptyEmoji: { fontSize: 40 },
  emptyText: { color: colors.textMuted, textAlign: 'center', fontSize: 15, lineHeight: 21 },
});
