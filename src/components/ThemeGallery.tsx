import { memo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import { aiIconUri } from '../lib/aiIconFiles';
import { stickerLayout, type Sticker } from '../lib/stickerLayout';
import type { Theme } from '../lib/themes';
import { Clickable } from './Clickable';

type Group = { theme: Theme; count: number };

// The white die-cut border of a sticker: the picture drawn eight times in white,
// pushed a few points each way, under the picture itself.
const OUTLINE = 2.5;
const AROUND = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => [
  { translateX: OUTLINE * Math.cos((deg * Math.PI) / 180) },
  { translateY: OUTLINE * Math.sin((deg * Math.PI) / 180) },
]);

/** One sticker of a theme's tile: its library image once drawn, its emoji on a round sticker until then. */
function StickerView({ sticker, concept, emoji, icons }: { sticker: Sticker; concept: string; emoji: string; icons: Record<string, string> }) {
  const url = icons[concept];
  const place = {
    left: `${(sticker.x - sticker.size / 2) * 100}%`,
    top: `${(sticker.y - sticker.size / 2) * 100}%`,
    width: `${sticker.size * 100}%`,
    zIndex: sticker.z,
    transform: [{ rotate: `${sticker.rotate}deg` }],
  } as const;
  if (!url) {
    return (
      <View style={[styles.sticker, place]}>
        <View style={styles.round}>
          <Text style={styles.roundEmoji} adjustsFontSizeToFit numberOfLines={1}>
            {emoji}
          </Text>
        </View>
      </View>
    );
  }
  const source = { uri: aiIconUri(url) };
  return (
    <View style={[styles.sticker, place]}>
      {/* A soft shadow under the whole sticker, border included. */}
      <Image source={source} style={[styles.layer, styles.shadow]} tintColor="rgba(0,0,0,0.45)" resizeMode="contain" />
      {AROUND.map((offset, i) => (
        <Image key={i} source={source} style={[styles.layer, { transform: offset }]} tintColor="#FFFFFF" resizeMode="contain" />
      ))}
      <Image source={source} style={styles.layer} resizeMode="contain" />
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
      {/* What's inside, at a glance: the theme's cards as stickers thrown on the tile. */}
      <View style={styles.mosaic}>
        {stickerLayout(theme.key, theme.preview.length).map((sticker, i) => (
          <StickerView key={theme.preview[i].concept} sticker={sticker} concept={theme.preview[i].concept} emoji={theme.preview[i].emoji} icons={icons} />
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
    aspectRatio: 1,
    borderRadius: radius.md,
    // Stickers cut by the edges, as on a laptop lid.
    overflow: 'hidden',
    backgroundColor: colors.background,
    marginBottom: 4,
  },
  sticker: { position: 'absolute', aspectRatio: 1 },
  layer: { position: 'absolute', top: '8%', left: '8%', width: '84%', height: '84%' },
  shadow: { transform: [{ translateX: 1.5 }, { translateY: 3 }, { scale: 1.06 }] },
  round: {
    flex: 1,
    margin: '10%',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 2,
    shadowOffset: { width: 1, height: 3 },
    elevation: 3,
  },
  roundEmoji: { fontSize: 28, textAlign: 'center', width: '80%' },
  title: { color: colors.text, fontSize: 15, fontWeight: '700' },
  count: { color: colors.textMuted, fontSize: 13 },
});
