import { Image, StyleSheet, Text, View } from 'react-native';

import { readableTextColor } from '../constants/theme';
import { aiIconUri } from '../lib/aiIconFiles';
import { cardIconFor } from '../lib/cardIcons';
import { fitText } from '../lib/fitText';
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
  // Names are written whole, on up to three lines, smaller as they grow: the « … » of a
  // cut name hid what the card was. The lines are set here, not by the platform, so the
  // icon above gets exactly the height they leave.
  // On a card too small for its name (a word that would break, an icon squeezed under
  // half the card), the picture shows alone: it says more than half a name.
  const fitted = showLabel && text ? fitText(text, size - 10, { maxLines: 3, max: size < 64 ? 10 : 11, min: 8 }) : null;
  const fittedIcon = fitted ? Math.min(size * 0.62, size - 6 - (fitted.lines.length * lineHeight(fitted.fontSize) + 1)) : 0;
  const caption = fitted?.fits && fittedIcon >= size * 0.45 ? fitted : null;
  const iconSize = caption ? fittedIcon : size * 0.78;
  const photoCaption = uri && showLabel && card.label ? fitText(card.label, size - 6, { maxLines: 3, max: 10, min: 7 }) : null;
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
              {caption.lines.join('\n')}
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={[styles.label, { color: fg, fontSize: plain.fontSize, lineHeight: lineHeight(plain.fontSize) }]}>{plain.lines.join('\n')}</Text>
      )}
    </View>
  );
}

const lineHeight = (fontSize: number) => Math.round(fontSize * 1.2);

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
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 2,
    paddingHorizontal: 3,
  },
  captionText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
});
