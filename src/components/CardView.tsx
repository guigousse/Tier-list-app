import { Image, StyleSheet, Text, View } from 'react-native';

import { readableTextColor } from '../constants/theme';
import { aiIconUri } from '../lib/aiIconFiles';
import { cardIconFor } from '../lib/cardIcons';
import { fitText, lineHeight } from '../lib/fitText';
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
  const icon = uri || card.iconUrl || card.iconSvg ? undefined : cardIconFor(text || card.label);
  // A name on one line sits under the picture. Longer, it goes over the picture, on a
  // translucent band, written whole on up to three lines: the « … » of a cut name hid
  // what the card was, and under the picture three lines squeezed it to a dot. The small
  // cards of the shared picture (46 points, drawn at 3×) take a fourth line and 6 points.
  const below = showLabel && text ? fitText(text, size - 10, { maxLines: 1, max: size < 64 ? 10 : 11, min: 7 }) : null;
  const caption = below?.fits ? below : null;
  const overlay = showLabel && text && !caption ? fitText(text, size - 8, { maxLines: size < 64 ? 4 : 3, max: size < 64 ? 10 : 11, min: 6, height: size * 0.62 }) : null;
  const iconSize = caption ? size * 0.62 : size * 0.78;
  const photoCaption = uri && showLabel && card.label ? fitText(card.label, size - 6, { maxLines: 3, max: 10, min: 6, height: size * 0.62 }) : null;
  const plain = fitText(card.label || '?', size - 6, { maxLines: 4, max: size < 64 ? 11 : 13, min: 7 });

  return (
    <View style={[styles.card, { width: size, height: size, backgroundColor: card.color }]}>
      {uri ? (
        <>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          {photoCaption ? (
            <View style={styles.caption}>
              <Text style={[styles.captionText, { fontSize: photoCaption.fontSize, lineHeight: lineHeight(photoCaption.fontSize) }]}>
                {photoCaption.lines.join('\n')}
              </Text>
            </View>
          ) : null}
        </>
      ) : card.iconUrl || card.iconSvg || icon || emoji ? (
        <>
          {card.iconUrl ? (
            <Image source={{ uri: aiIconUri(card.iconUrl) }} style={{ width: iconSize, height: iconSize }} resizeMode="contain" />
          ) : card.iconSvg ? (
            <SvgIcon xml={card.iconSvg} size={iconSize} />
          ) : icon ? (
            <CardIcon id={icon} size={iconSize} />
          ) : (
            <Text style={{ fontSize: size * 0.42 }}>{emoji}</Text>
          )}
          {caption ? (
            <Text style={[styles.small, { color: fg, fontSize: caption.fontSize, lineHeight: lineHeight(caption.fontSize) }]}>
              {caption.lines[0]}
            </Text>
          ) : null}
          {overlay ? (
            <View style={styles.caption}>
              <Text style={[styles.captionText, { fontSize: overlay.fontSize, lineHeight: lineHeight(overlay.fontSize) }]}>
                {overlay.lines.join('\n')}
              </Text>
            </View>
          ) : null}
        </>
      ) : (
        <Text style={[styles.label, { color: fg, fontSize: plain.fontSize, lineHeight: lineHeight(plain.fontSize) }]}>{plain.lines.join('\n')}</Text>
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
  small: { fontWeight: '600', marginTop: 1, textAlign: 'center' },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(12,12,20,0.6)',
    paddingVertical: 2,
    paddingHorizontal: 3,
  },
  captionText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
});
