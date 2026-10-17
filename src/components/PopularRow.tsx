import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { Template } from '../constants/presets';
import { colors, radius, spacing } from '../constants/theme';
import { aiIconUri } from '../lib/aiIconFiles';
import { openPopular } from '../lib/create';
import { listCover } from '../lib/listCover';
import { formatCount, toggleFavorite } from '../lib/popular';
import { useCatalog } from '../store/useCatalog';
import type { TierList } from '../store/types';
import { Clickable } from './Clickable';

const HEART = '#FF5C7A';

const days = new Map<string, string>();
/** « 13 oct. » for "2026-10-13" (each day formatted once: up to 366 rows). */
function dayLabel(day: string): string {
  let label = days.get(day);
  if (!label) days.set(day, (label = new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })));
  return label;
}
const SUCCESS = '#2EAD6B';

type Props = {
  template: Template;
  /** The player's copy of this list, if they opened it. */
  list?: TierList;
  /** Players who completed (validated) this ranking. */
  completions: number;
  favorites: number;
  favorite: boolean;
};

/** A popular tier list on one line: emoji, title, progress, favourites and completed rankings. */
export const PopularRow = memo(function PopularRow({ template, list, completions, favorites, favorite }: Props) {
  const validated = Boolean(list?.popular?.validatedAt ?? list?.daily?.validatedAt);
  const tops = useCatalog((s) => s.tops);
  const icons = useCatalog((s) => s.icons);
  const cover = useMemo(() => listCover(template, tops, icons), [template, tops, icons]);
  const ranked = list ? Object.keys(list.cards).length - list.pool.length : 0;
  const progress = validated ? 'Validée' : list ? `En cours · ${ranked}/${template.items.length}` : `${template.items.length} cartes`;
  const status = template.day ? `${progress} · du ${dayLabel(template.day)}` : progress;

  return (
    <Clickable
      accessibilityRole="button"
      accessibilityLabel={`${template.title}, ${status}, ${favorites} favoris, ${completions} classements complétés`}
      onPress={() => openPopular(template)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      {/* Its favourite card: the one players rank S most often. */}
      <View style={styles.emojiWrap}>
        {cover.url ? (
          <Image source={{ uri: aiIconUri(cover.url) }} style={styles.cover} resizeMode="contain" />
        ) : (
          <Text style={styles.emoji}>{cover.emoji}</Text>
        )}
      </View>
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.title}>
          {template.title}
        </Text>
        <View style={styles.statusRow}>
          {validated ? <Ionicons name="checkmark-circle" size={14} color={SUCCESS} /> : null}
          <Text numberOfLines={1} style={[styles.status, validated && { color: SUCCESS }]}>
            {status}
          </Text>
        </View>
      </View>
      <Clickable
        accessibilityRole="button"
        accessibilityLabel={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        hitSlop={8}
        onPress={() => toggleFavorite(template.key)}
        style={styles.stat}
      >
        <Text style={[styles.count, favorite && { color: HEART }]}>{formatCount(favorites)}</Text>
        <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={18} color={favorite ? HEART : colors.textMuted} />
      </Clickable>
      <View style={styles.stat} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={styles.count}>{formatCount(completions)}</Text>
        <Ionicons name="checkmark-done" size={18} color={colors.textMuted} />
      </View>
    </Clickable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    paddingRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emojiWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  emoji: { fontSize: 28 },
  cover: { width: 44, height: 44 },
  body: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  status: { color: colors.textMuted, fontSize: 13 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 58, justifyContent: 'flex-end' },
  count: { color: colors.textMuted, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
