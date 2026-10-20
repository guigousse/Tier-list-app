import { memo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { aiIconUri, hasStickerBorder } from '../lib/aiIconFiles';

// The white die-cut border: the picture drawn eight times in white, pushed a few points
// each way, under the picture itself (as on the themes' circles).
const around = (outline: number) =>
  [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => [
    { translateX: outline * Math.cos((deg * Math.PI) / 180) },
    { translateY: outline * Math.sin((deg * Math.PI) / 180) },
  ]);
const AROUND = around(2);

/**
 * A card's library picture as a sticker: white border, soft shadow, a little tilt. Its
 * emoji on a round white sticker while the picture isn't drawn. A picture drawn with its
 * own border keeps it alone: a second one around it would thicken it.
 */
export const Sticker = memo(function Sticker({ url, emoji, size, tilt = -6 }: { url?: string; emoji: string; size: number; tilt?: number }) {
  const box = { width: size, height: size, transform: [{ rotate: `${tilt}deg` }] };
  if (!url) {
    return (
      <View style={[styles.box, box]}>
        <View style={[styles.round, { width: size * 0.82, height: size * 0.82 }]}>
          <Text style={{ fontSize: size * 0.46 }}>{emoji}</Text>
        </View>
      </View>
    );
  }
  const source = { uri: aiIconUri(url) };
  return (
    <View style={[styles.box, box]}>
      <Image source={source} style={[styles.layer, styles.shadow]} tintColor="rgba(0,0,0,0.45)" resizeMode="contain" />
      {(hasStickerBorder(url) ? [] : AROUND).map((offset, i) => (
        <Image key={i} source={source} style={[styles.layer, { transform: offset }]} tintColor="#FFFFFF" resizeMode="contain" />
      ))}
      <Image source={source} style={styles.layer} resizeMode="contain" />
    </View>
  );
});

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute', top: '6%', left: '6%', width: '88%', height: '88%' },
  shadow: { transform: [{ translateX: 1 }, { translateY: 2.5 }, { scale: 1.05 }] },
  round: {
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
});
