import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { Template } from '../constants/presets';
import { colors, radius, spacing } from '../constants/theme';
import { openPopular } from '../lib/create';
import { formatCount, toggleFavorite } from '../lib/popular';
import type { TierList } from '../store/types';
import { Clickable } from './Clickable';

const HEART = '#FF5C7A';
const SUCCESS = '#2EAD6B';

type Props = {
  template: Template;
  /** The player's copy of this list, if they opened it. */
  list?: TierList;
  views: number;
  favorites: number;
  favorite: boolean;
};

/** A popular tier list on one line: emoji, title, progress, favourites and unique views. */
export function PopularRow({ template, list, views, favorites, favorite }: Props) {
  const validated = Boolean(list?.popular?.validatedAt);
  const ranked = list ? Object.keys(list.cards).length - list.pool.length : 0;
  const status = validated ? 'Validée' : list ? `En cours · ${ranked}/${template.items.length}` : `${template.items.length} cartes`;

  return (
    <Clickable
      accessibilityRole="button"
      accessibilityLabel={`${template.title}, ${status}, ${favorites} favoris, ${views} vues`}
      onPress={() => openPopular(template)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.emojiWrap}>
        <Text style={styles.emoji}>{template.emoji}</Text>
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
        <Text style={styles.count}>{formatCount(views)}</Text>
        <Ionicons name="eye-outline" size={18} color={colors.textMuted} />
      </View>
    </Clickable>
  );
}

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
  body: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  status: { color: colors.textMuted, fontSize: 13 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 58, justifyContent: 'flex-end' },
  count: { color: colors.textMuted, fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
