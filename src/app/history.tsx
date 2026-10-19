import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../constants/theme';
import { formatDay } from '../lib/format';
import { useT } from '../lib/i18n/useT';
import { useLocalizeList } from '../lib/i18n/useContent';
import { useResponsive } from '../lib/layout';
import { useTierStore } from '../store/useTierStore';
import { Clickable } from '../components/Clickable';

/** Validated daily tier lists, most recent first. */
export default function History() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const { t, upper, locale } = useT();
  const localize = useLocalizeList();
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
        <Text style={styles.empty}>{t('app.history.empty')}</Text>
      }
      renderItem={({ item: saved }) => {
        const item = localize(saved);
        const top = (item.placement[item.tiers[0]?.id] ?? []).map((cid) => item.cards[cid]?.label).filter(Boolean);
        return (
          <Clickable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/results/[id]', params: { id: item.id } })}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.emoji}>{item.daily!.emoji}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.date}>{upper(formatDay(item.daily!.day, locale))}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.title}>
                {item.title}
              </Text>
              {top.length ? (
                <Text numberOfLines={1} style={styles.meta}>
                  {t('app.history.top', { cards: top.join(', ') })}
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
  // Capitals through upper(), not textTransform: Greek capitals drop their accents.
  date: { color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13 },
});
