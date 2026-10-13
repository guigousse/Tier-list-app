import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import { today } from '../lib/api';
import { formatDay } from '../lib/format';
import { useCatalog } from '../store/useCatalog';
import { useTierStore } from '../store/useTierStore';

/** Home screen card for the daily tier list published online. */
export function DailyCard() {
  const daily = useCatalog((s) => s.daily);
  const existing = useTierStore((s) => (daily ? Object.values(s.lists).find((l) => l.daily?.day === daily.day) : undefined));

  if (!daily) return null;
  const isToday = daily.day === today();
  const validated = Boolean(existing?.daily?.validatedAt);

  const open = () => {
    if (existing && validated) {
      router.push({ pathname: '/results/[id]', params: { id: existing.id } });
      return;
    }
    const id = existing?.id ?? useTierStore.getState().createDailyList(daily);
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
          <Text numberOfLines={2} style={styles.description}>
            {validated ? 'Classement validé : découvrez le classement moyen des joueurs.' : daily.description}
          </Text>
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaLabel}>{validated ? 'Résultats' : existing ? 'Reprendre' : 'Classer'}</Text>
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
