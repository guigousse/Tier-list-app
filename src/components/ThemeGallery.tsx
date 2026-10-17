import { memo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import { aiIconUri } from '../lib/aiIconFiles';
import type { Theme } from '../lib/themes';
import { Clickable } from './Clickable';

type Group = { theme: Theme; count: number };

/** One card of a patchwork: its library image once drawn, its emoji until then. */
function Patch({ concept, emoji, icons }: { concept: string; emoji: string; icons: Record<string, string> }) {
  const url = icons[concept];
  return (
    <View style={styles.patch}>
      {url ? <Image source={{ uri: aiIconUri(url) }} style={styles.patchImage} resizeMode="contain" /> : <Text style={styles.patchEmoji}>{emoji}</Text>}
    </View>
  );
}

const Tile = memo(function Tile({ group, icons, onOpen }: { group: Group; icons: Record<string, string>; onOpen: (key: string) => void }) {
  const { theme, count } = group;
  return (
    <Clickable
      accessibilityRole="button"
      accessibilityLabel={`${theme.title}, ${count} liste${count > 1 ? 's' : ''}`}
      onPress={() => onOpen(theme.key)}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
    >
      {/* What's inside, at a glance: nine cards of the theme. */}
      <View style={styles.mosaic}>
        {theme.preview.map((p) => (
          <Patch key={p.concept} concept={p.concept} emoji={p.emoji} icons={icons} />
        ))}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {theme.emoji} {theme.title}
      </Text>
      <Text style={styles.count}>
        {count} liste{count > 1 ? 's' : ''}
      </Text>
    </Clickable>
  );
});

/** The grand themes of the public tier lists, two per row. */
export function ThemeGallery({ groups, icons, onOpen }: { groups: Group[]; icons: Record<string, string>; onOpen: (key: string) => void }) {
  return (
    <View style={styles.grid}>
      {groups.map((g) => (
        <Tile key={g.theme.key} group={g} icons={icons} onOpen={onOpen} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  tile: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 4,
  },
  mosaic: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: 4,
  },
  patch: {
    width: '33.333%',
    height: '33.333%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  patchImage: { width: '86%', height: '86%' },
  patchEmoji: { fontSize: 24 },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  count: { color: colors.textMuted, fontSize: 13 },
});
