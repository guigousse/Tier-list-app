import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import { today } from '../lib/api';
import { useCatalog } from '../store/useCatalog';
import { defaultTierLabels, useTierStore } from '../store/useTierStore';

function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Home screen card for the daily tier list published online. */
export function DailyCard() {
  const daily = useCatalog((s) => s.daily);
  const source = daily ? `daily:${daily.day}` : '';
  const existingId = useTierStore((s) => (source ? Object.values(s.lists).find((l) => l.importedFrom === source)?.id : undefined));

  if (!daily) return null;
  const isToday = daily.day === today();

  const open = () => {
    const store = useTierStore.getState();
    const id =
      existingId ??
      store.createList({
        title: daily.title,
        tierLabels: daily.tiers ?? defaultTierLabels(store.settings.defaultPresetKey),
        cardLabels: daily.items,
        importedFrom: source,
      });
    router.push({ pathname: '/editor/[id]', params: { id } });
  };

  return (
    <Pressable accessibilityRole="button" onPress={open} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <Text style={styles.kicker}>
        {isToday ? 'Tier list du jour' : 'Dernière tier list du jour'} · {formatDay(daily.day)}
      </Text>
      <View style={styles.row}>
        <Text style={styles.emoji}>{daily.emoji}</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={2} style={styles.title}>
            {daily.title}
          </Text>
          {daily.description ? (
            <Text numberOfLines={2} style={styles.description}>
              {daily.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaLabel}>{existingId ? 'Reprendre' : 'Classer'}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  kicker: { color: colors.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 34 },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  description: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ctaLabel: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
