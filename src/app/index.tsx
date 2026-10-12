import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListRow } from '../components/ListRow';
import { IconButton, SectionTitle, type IconName } from '../components/ui';
import { colors, radius, spacing, TIER_COLORS } from '../constants/theme';
import { useTierStore } from '../store/useTierStore';

function Tile({ icon, title, subtitle, onPress }: { icon: IconName; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}>
      <Ionicons name={icon} size={24} color={colors.primary} />
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const lists = useTierStore((s) => s.lists);
  const all = useMemo(() => Object.values(lists), [lists]);
  const recent = useMemo(() => [...all].sort((a, b) => b.openedAt - a.openedAt).slice(0, 5), [all]);
  const favorites = useMemo(() => all.filter((l) => l.favorite).sort((a, b) => b.updatedAt - a.updatedAt), [all]);

  const open = (id: string) => router.push({ pathname: '/editor/[id]', params: { id } });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.lg, gap: spacing.xl }}
    >
      <View style={styles.header}>
        <View style={{ gap: spacing.xs }}>
          <Text style={styles.brand}>Tiercraft</Text>
          <View style={styles.brandStrip}>
            {TIER_COLORS.slice(0, 5).map((c) => (
              <View key={c} style={[styles.brandStripSegment, { backgroundColor: c }]} />
            ))}
          </View>
          <Text style={styles.tagline}>Classez tout, de S à D.</Text>
        </View>
        <IconButton icon="settings-outline" label="Réglages" onPress={() => router.push('/settings')} />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/new')}
        style={({ pressed }) => [styles.hero, pressed && { opacity: 0.9 }]}
      >
        <View style={styles.heroTiers}>
          {['S', 'A', 'B', 'C', 'D'].map((l, i) => (
            <View key={l} style={[styles.heroTier, { backgroundColor: TIER_COLORS[i] }]}>
              <Text style={styles.heroTierLabel}>{l}</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.heroTitle}>Nouvelle tier list</Text>
          <Text style={styles.heroSubtitle}>Partez de zéro et ajoutez vos cartes.</Text>
        </View>
        <Ionicons name="add-circle" size={36} color={colors.primaryText} />
      </Pressable>

      <View style={styles.tiles}>
        <Tile icon="albums-outline" title="Mes tier lists" subtitle={`${all.length} enregistrée${all.length > 1 ? 's' : ''}`} onPress={() => router.push('/lists')} />
        <Tile icon="sparkles-outline" title="Modèles" subtitle="Prêts à classer" onPress={() => router.push('/templates')} />
      </View>

      <View style={{ gap: spacing.md }}>
        <SectionTitle
          right={
            all.length > 0 ? (
              <Pressable onPress={() => router.push('/lists')} hitSlop={8}>
                <Text style={styles.link}>Tout voir</Text>
              </Pressable>
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
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  brand: { color: colors.text, fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  brandStrip: { flexDirection: 'row', gap: 3, width: 80 },
  brandStripSegment: { flex: 1, height: 4, borderRadius: 2 },
  tagline: { color: colors.textMuted, fontSize: 15 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  heroTiers: { width: 44, gap: 3 },
  heroTier: { height: 14, borderRadius: 3, justifyContent: 'center', paddingLeft: 4 },
  heroTierLabel: { fontSize: 9, fontWeight: '800', color: '#111' },
  heroTitle: { color: colors.primaryText, fontSize: 20, fontWeight: '800' },
  heroSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  tiles: { flexDirection: 'row', gap: spacing.md },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  tileSubtitle: { color: colors.textMuted, fontSize: 13 },
  link: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg },
  emptyEmoji: { fontSize: 40 },
  emptyText: { color: colors.textMuted, textAlign: 'center', fontSize: 15, lineHeight: 21 },
});
