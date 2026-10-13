import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../constants/theme';
import { formatDay } from '../lib/format';
import { useResponsive } from '../lib/layout';
import { useTierStore } from '../store/useTierStore';
import { Clickable } from '../components/Clickable';

/** Validated daily tier lists, most recent first. */
export default function History() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const lists = useTierStore((s) => s.lists);
  const validated = useMemo(
    () => Object.values(lists).filter((l) => l.daily?.validatedAt).sort((a, b) => b.daily!.day.localeCompare(a.daily!.day)),
    [lists],
  );

  return (
    <FlatList
      data={validated}
      keyExtractor={(l) => l.id}
      contentContainerStyle={[column, { padding: gutter, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }]}
      ListEmptyComponent={
        <Text style={styles.empty}>Validez la tier list du jour pour la retrouver ici, avec le classement moyen des joueurs.</Text>
      }
      renderItem={({ item }) => {
        const top = (item.placement[item.tiers[0]?.id] ?? []).map((cid) => item.cards[cid]?.label).filter(Boolean);
        return (
          <Clickable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/results/[id]', params: { id: item.id } })}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.emoji}>{item.daily!.emoji}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.date}>{formatDay(item.daily!.day)}</Text>
              <Text numberOfLines={1} style={styles.title}>
                {item.title}
              </Text>
              {top.length ? (
                <Text numberOfLines={1} style={styles.meta}>
                  Votre S : {top.join(', ')}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Clickable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 21, paddingVertical: spacing.xl * 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: { fontSize: 30 },
  date: { color: colors.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13 },
});
