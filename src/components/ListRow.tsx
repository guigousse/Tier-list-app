import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import { plural, relativeTime } from '../lib/format';
import { imageUri } from '../lib/images';
import type { TierList } from '../store/types';
import { IconButton } from './ui';
import { Clickable } from './Clickable';

type Props = {
  list: TierList;
  onPress: () => void;
  onMore?: () => void;
  timestampKey?: 'openedAt' | 'updatedAt';
};

const leadingEmoji = (label: string) => label.match(/^\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/u)?.[0];

/** The list's emoji, else a card picture or emoji, else its tier colours. */
function ListPreview({ list }: { list: TierList }) {
  const cards = [...list.tiers.flatMap((t) => list.placement[t.id] ?? []), ...list.pool].map((id) => list.cards[id]).filter(Boolean);
  const emoji = list.emoji ?? list.daily?.emoji;
  const picture = emoji ? undefined : cards.map((c) => imageUri(c.imageName)).find(Boolean);
  const cardEmoji = emoji || picture ? undefined : cards.map((c) => leadingEmoji(c.label)).find(Boolean);

  if (emoji || cardEmoji) {
    return (
      <View style={[styles.preview, styles.previewCenter]}>
        <Text style={styles.previewEmoji}>{emoji ?? cardEmoji}</Text>
      </View>
    );
  }
  if (picture) {
    return (
      <View style={styles.preview}>
        <Image source={{ uri: picture }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </View>
    );
  }
  return (
    <View style={styles.preview}>
      {list.tiers.slice(0, 6).map((t) => (
        <View key={t.id} style={[styles.stripe, { backgroundColor: t.color }]}>
          <Text numberOfLines={1} style={styles.stripeLabel}>
            {t.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function ListRow({ list, onPress, onMore, timestampKey = 'updatedAt' }: Props) {
  const total = Object.keys(list.cards).length;
  const ranked = total - list.pool.length;
  const verb = timestampKey === 'openedAt' ? 'Ouverte' : 'Modifiée';
  return (
    <View style={styles.row}>
      <Clickable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.8 }]}
      >
        <ListPreview list={list} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {list.favorite ? <Ionicons name="star" size={14} color="#FFD54F" /> : null}
            <Text numberOfLines={1} style={styles.title}>
              {list.title}
            </Text>
          </View>
          <Text style={styles.meta}>
            {plural(list.tiers.length, 'rang')} · {ranked}/{total} classées
          </Text>
          <Text style={styles.meta}>
            {verb} {relativeTime(list[timestampKey])}
          </Text>
        </View>
        {onMore ? null : <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />}
      </Clickable>
      {onMore ? <IconButton icon="ellipsis-horizontal" label="Options" onPress={onMore} color={colors.textMuted} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  preview: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  previewCenter: { alignItems: 'center', justifyContent: 'center' },
  previewEmoji: { fontSize: 30 },
  stripe: { flex: 1, justifyContent: 'center', paddingLeft: 4 },
  stripeLabel: { fontSize: 7, fontWeight: '800', color: '#111' },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', flexShrink: 1 },
  meta: { color: colors.textMuted, fontSize: 13 },
});
