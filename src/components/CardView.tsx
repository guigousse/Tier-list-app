import { Image, StyleSheet, Text, View } from 'react-native';

import { readableTextColor } from '../constants/theme';
import { cardIconFor } from '../lib/cardIcons';
import { splitEmoji } from '../lib/emoji';
import { imageUri } from '../lib/images';
import type { Card } from '../store/types';
import { CardIcon, SvgIcon } from './CardIcon';

type Props = {
  card: Card;
  size: number;
  showLabel?: boolean;
};

export function CardView({ card, size, showLabel = true }: Props) {
  const uri = imageUri(card.imageName);
  const fg = readableTextColor(card.color);
  const { emoji, text } = splitEmoji(card.label);
  // A drawn icon for this card's name, when there's no photo.
  const icon = uri || card.iconSvg ? undefined : cardIconFor(text || card.label);

  return (
    <View style={[styles.card, { width: size, height: size, backgroundColor: card.color }]}>
      {uri ? (
        <>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          {showLabel && card.label ? (
            <View style={styles.caption}>
              <Text numberOfLines={1} style={styles.captionText}>
                {card.label}
              </Text>
            </View>
          ) : null}
        </>
      ) : card.iconSvg || icon || emoji ? (
        <>
          {card.iconSvg ? (
            <SvgIcon xml={card.iconSvg} size={size * (showLabel && text ? 0.62 : 0.78)} />
          ) : icon ? (
            <CardIcon id={icon} size={size * (showLabel && text ? 0.62 : 0.78)} />
          ) : (
            <Text style={{ fontSize: size * 0.42 }}>{emoji}</Text>
          )}
          {showLabel && text ? (
            <Text numberOfLines={1} style={[styles.small, { color: fg }]}>
              {text}
            </Text>
          ) : null}
        </>
      ) : (
        <Text
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={[styles.label, { color: fg, fontSize: size < 64 ? 11 : 13 }]}
        >
          {card.label || '?'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  label: { fontWeight: '700', textAlign: 'center' },
  small: { fontSize: 10, fontWeight: '600', marginTop: 1, paddingHorizontal: 2 },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 2,
    paddingHorizontal: 3,
  },
  captionText: { color: '#fff', fontSize: 10, fontWeight: '600', textAlign: 'center' },
});
