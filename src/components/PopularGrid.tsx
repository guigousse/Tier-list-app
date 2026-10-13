import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import { openPopular } from '../lib/create';
import { useResponsive } from '../lib/layout';
import { useAllTemplates } from '../store/useCatalog';
import { popularVoteKey, useTierStore } from '../store/useTierStore';
import { Clickable } from './Clickable';

/** Home screen grid of the popular tier lists (the templates), each with the player's progress. */
export function PopularGrid() {
  const templates = useAllTemplates();
  const lists = useTierStore((s) => s.lists);
  const { isTablet } = useResponsive();
  const columns = isTablet ? 3 : 2;

  const byKey = new Map(Object.values(lists).flatMap((l) => (l.popular ? [[l.popular.voteKey, l] as const] : [])));

  return (
    <View style={styles.grid}>
      {templates.map((t) => {
        const list = byKey.get(popularVoteKey(t));
        const validated = Boolean(list?.popular?.validatedAt);
        const ranked = list ? Object.keys(list.cards).length - list.pool.length : 0;
        const status = validated ? 'Validée' : list ? `En cours · ${ranked}/${t.items.length}` : `${t.items.length} cartes`;
        return (
          <Clickable
            key={t.key}
            accessibilityRole="button"
            accessibilityLabel={`${t.title}, ${status}`}
            onPress={() => openPopular(t)}
            style={({ pressed }) => [styles.card, { width: `${100 / columns - 2}%` }, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.emojiWrap}>
              <Text style={styles.emoji}>{t.emoji}</Text>
            </View>
            <Text numberOfLines={2} style={styles.title}>
              {t.title}
            </Text>
            <View style={styles.statusRow}>
              {validated ? <Ionicons name="checkmark-circle" size={14} color="#2EAD6B" /> : null}
              <Text numberOfLines={1} style={[styles.status, validated && { color: '#2EAD6B' }]}>
                {status}
              </Text>
            </View>
          </Clickable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  card: {
    flexGrow: 0,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emojiWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  emoji: { fontSize: 36 },
  title: { color: colors.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  status: { color: colors.textMuted, fontSize: 12 },
});
