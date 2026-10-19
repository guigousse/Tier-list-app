import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Template } from '../constants/presets';
import { colors, radius, spacing } from '../constants/theme';
import { openPopular } from '../lib/create';
import { useT } from '../lib/i18n/useT';
import { listCover } from '../lib/listCover';
import { formatCount, toggleFavorite } from '../lib/popular';
import { useCatalog } from '../store/useCatalog';
import type { TierList } from '../store/types';
import { Clickable } from './Clickable';
import { Sticker } from './Sticker';

const HEART = '#FF5C7A';

const days = new Map<string, string>();
/** « 13 oct. » for "2026-10-13" in `locale` (each day formatted once per language: up to 366 rows). */
function dayLabel(day: string, locale: string): string {
  const key = `${locale}|${day}`;
  let label = days.get(key);
  if (!label) days.set(key, (label = new Date(`${day}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short' })));
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
  const { t, locale } = useT();
  const validated = Boolean(list?.popular?.validatedAt ?? list?.daily?.validatedAt);
  const tops = useCatalog((s) => s.tops);
  const icons = useCatalog((s) => s.icons);
  const cover = useMemo(() => listCover(template, tops, icons), [template, tops, icons]);
  const ranked = list ? Object.keys(list.cards).length - list.pool.length : 0;
  const progress = validated
    ? t('app.row.validated')
    : list
      ? t('app.row.started', { ranked, total: template.items.length })
      : t('app.row.cards', { count: template.items.length });
  const status = template.day ? t('app.row.fromDay', { status: progress, day: dayLabel(template.day, locale) }) : progress;

  return (
    <Clickable
      accessibilityRole="button"
      accessibilityLabel={t('app.row.label', { title: template.title, status, favorites, completions })}
      onPress={() => openPopular(template)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      {/* Its favourite card: the one players rank S most often. */}
      <Sticker url={cover.url} emoji={cover.emoji} size={52} />
      {/* The title has the row's whole width; the counters sit under it, beside the status:
          beside the title, they cut « Garnitures de pizza » to « Garnitures d… ». */}
      <View style={styles.body}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.title}>
          {template.title}
        </Text>
        <View style={styles.statusRow}>
          {validated ? <Ionicons name="checkmark-circle" size={14} color={SUCCESS} /> : null}
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.status, validated && { color: SUCCESS }]}>
            {status}
          </Text>
          <Clickable
            accessibilityRole="button"
            accessibilityLabel={favorite ? t('app.row.unfavorite') : t('app.row.favorite')}
            hitSlop={8}
            onPress={() => toggleFavorite(template.key)}
            style={styles.stat}
          >
            <Text style={[styles.count, favorite && { color: HEART }]}>{formatCount(favorites)}</Text>
            <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={16} color={favorite ? HEART : colors.textMuted} />
          </Clickable>
          <View style={styles.stat} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Text style={styles.count}>{formatCount(completions)}</Text>
            <Ionicons name="checkmark-done" size={16} color={colors.textMuted} />
          </View>
        </View>
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
  body: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  status: { flex: 1, color: colors.textMuted, fontSize: 13 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 3, minWidth: 40, justifyContent: 'flex-end' },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
