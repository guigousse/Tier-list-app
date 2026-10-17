import { memo, useMemo, useState } from 'react';
import { BlurView } from 'expo-blur';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../constants/theme';
import { aiIconUri } from '../lib/aiIconFiles';
import type { Template } from '../constants/presets';
import { STICKERS, stickerLayout, type Sticker } from '../lib/stickerLayout';
import { themeStickers, type Theme } from '../lib/themes';
import { Clickable } from './Clickable';

type Group = { theme: Theme; templates: Template[] };

// The white die-cut border of a sticker: the picture drawn in white several times,
// pushed a few points each way, under the picture itself. Six ways for the small
// cards (21 stickers a circle, 8 circles: the gallery stays light), eight for the
// one put forward.
const around = (outline: number, ways: number) =>
  Array.from({ length: ways }, (_, i) => (i * 360) / ways).map((deg) => [
    { translateX: outline * Math.cos((deg * Math.PI) / 180) },
    { translateY: outline * Math.sin((deg * Math.PI) / 180) },
  ]);
const AROUND = around(2, 6);
// The sticker put forward stands out: a thicker border, a deeper shadow.
const HERO_AROUND = around(3, 8);

/**
 * One sticker of a theme's circle: its library image once drawn, its emoji on a round
 * sticker until then. `side`: the circle's width in points, for the emoji's size.
 */
function StickerView({
  sticker,
  concept,
  emoji,
  icons,
  side,
  hero,
}: {
  sticker: Sticker;
  concept: string;
  emoji: string;
  icons: Record<string, string>;
  side: number;
  hero: boolean;
}) {
  const url = icons[concept];
  const place = {
    left: `${(sticker.x - sticker.size / 2) * 100}%`,
    top: `${(sticker.y - sticker.size / 2) * 100}%`,
    width: `${sticker.size * 100}%`,
    // The one put forward sits above the blur laid over the others.
    zIndex: hero ? sticker.z + 1 : sticker.z,
    transform: [{ rotate: `${sticker.rotate}deg` }],
  } as const;
  if (!url) {
    return (
      <View style={[styles.sticker, place]}>
        <View style={[styles.round, hero && styles.heroRound]}>
          <Text style={{ fontSize: Math.max(12, side * sticker.size * 0.34) }}>{emoji}</Text>
        </View>
      </View>
    );
  }
  const source = { uri: aiIconUri(url) };
  return (
    <View style={[styles.sticker, place]}>
      {/* A soft shadow under the whole sticker, border included. */}
      <Image source={source} style={[styles.layer, hero ? styles.heroShadow : styles.shadow]} tintColor={hero ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.45)'} resizeMode="contain" />
      {(hero ? HERO_AROUND : AROUND).map((offset, i) => (
        <Image key={i} source={source} style={[styles.layer, { transform: offset }]} tintColor="#FFFFFF" resizeMode="contain" />
      ))}
      <Image source={source} style={styles.layer} resizeMode="contain" />
    </View>
  );
}

const Tile = memo(function Tile({ group, icons, onOpen }: { group: Group; icons: Record<string, string>; onOpen: (key: string) => void }) {
  const { theme, templates } = group;
  const count = templates.length;
  // Measured, so the emoji waiting for their picture keep to the circle's scale.
  const [side, setSide] = useState(110);
  const cards = useMemo(() => themeStickers(theme, templates, icons, STICKERS), [theme, templates, icons]);
  const layout = useMemo(() => stickerLayout(theme.key, cards.length), [theme.key, cards.length]);
  return (
    <Clickable
      accessibilityRole="button"
      accessibilityLabel={`${theme.title}, ${count} liste${count > 1 ? 's' : ''}`}
      onPress={() => onOpen(theme.key)}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
    >
      {/* What's inside, at a glance: the theme's cards as stickers packed in a circle. */}
      <View style={styles.circle} onLayout={(e) => setSide(e.nativeEvent.layout.width)}>
        {layout.map((sticker, i) => (
          <StickerView key={cards[i].concept} sticker={sticker} concept={cards[i].concept} emoji={cards[i].emoji} icons={icons} side={side} hero={i === 0} />
        ))}
        {/* A light blur, a little darker, over the cards behind: the one in the middle stands out. */}
        <BlurView intensity={12} tint="dark" style={[StyleSheet.absoluteFill, { zIndex: layout.length - 1 }]} />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {theme.title}
      </Text>
      <Text style={styles.count}>
        {count} liste{count > 1 ? 's' : ''}
      </Text>
    </Clickable>
  );
});

/** The grand themes of the public tier lists, three per row. */
export function ThemeGallery({ groups, icons, onOpen }: { groups: Group[]; icons: Record<string, string>; onOpen: (key: string) => void }) {
  return (
    <View style={styles.grid}>
      {groups.map((g) => (
        <Tile key={g.theme.key} group={g} icons={icons} onOpen={onOpen} />
      ))}
      {/* Keeps a last row of one or two on the left, under the others. */}
      {Array.from({ length: (3 - (groups.length % 3)) % 3 }, (_, i) => (
        <View key={`gap-${i}`} style={styles.tile} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.lg },
  tile: { width: '31%', alignItems: 'center', gap: 2 },
  circle: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 999,
    // Stickers cut by the rim.
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  sticker: { position: 'absolute', aspectRatio: 1 },
  layer: { position: 'absolute', top: '8%', left: '8%', width: '84%', height: '84%' },
  shadow: { transform: [{ translateX: 1 }, { translateY: 2.5 }, { scale: 1.06 }] },
  heroShadow: { transform: [{ translateX: 1.5 }, { translateY: 4 }, { scale: 1.08 }] },
  heroRound: { margin: '12%', shadowOpacity: 0.55, shadowRadius: 3, shadowOffset: { width: 1, height: 4 } },
  round: {
    flex: 1,
    // Smaller than a drawn sticker: the emoji only waits for its picture.
    margin: '18%',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 2,
    shadowOffset: { width: 1, height: 2 },
    elevation: 3,
  },
  title: { color: colors.text, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  count: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});
