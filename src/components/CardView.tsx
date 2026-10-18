import { Image, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { readableTextColor } from '../constants/theme';
import { aiIconUri } from '../lib/aiIconFiles';
import { cardIconFor } from '../lib/cardIcons';
import { cardCaption, lineHeight } from '../lib/fitText';
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
  // The smallest readable size: 8 points in the app, 6 on the small cards of the shared
  // picture (drawn at 3×).
  const fonts = { max: size < 64 ? 10 : 11, min: size < 56 ? 6 : 8 };
  const caption = showLabel && text ? cardCaption(text, size - 12, fonts) : null;
  // The picture keeps its size and place whatever the name: one line under it, two over
  // its foot on a translucent band.
  const oneLine = caption?.lines?.length === 1;
  const iconSize = caption ? size * 0.62 : size * 0.78;
  const iconTop = caption ? (size - iconSize - lineHeight(fonts.max) - 1) / 2 : (size - iconSize) / 2;
  const photoCaption = uri && showLabel && card.label ? cardCaption(card.label, size - 10, fonts) : null;
  const plain = cardCaption(card.label || '?', size - 10, { max: size < 64 ? 11 : 13, min: fonts.min });

  return (
    <View style={[styles.card, { width: size, height: size, backgroundColor: card.color }]}>
      {uri ? (
        <>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          {photoCaption ? (
            <View style={styles.caption}>
              <CaptionText caption={photoCaption} style={styles.captionText} />
            </View>
          ) : null}
        </>
      ) : card.iconUrl || card.iconSvg || icon || emoji ? (
        <>
          <View style={[styles.icon, { top: iconTop, width: iconSize, height: iconSize, left: (size - iconSize) / 2 }]}>
            {card.iconUrl ? (
              <Image source={{ uri: aiIconUri(card.iconUrl) }} style={{ width: iconSize, height: iconSize }} resizeMode="contain" />
            ) : card.iconSvg ? (
              <SvgIcon xml={card.iconSvg} size={iconSize} />
            ) : icon ? (
              <CardIcon id={icon} size={iconSize} />
            ) : (
              <Text style={{ fontSize: size * 0.42 }}>{emoji}</Text>
            )}
          </View>
          {caption && oneLine ? (
            <View style={[styles.below, { top: iconTop + iconSize + 1 }]}>
              <CaptionText caption={caption} style={[styles.small, { color: fg }]} />
            </View>
          ) : caption ? (
            <View style={styles.caption}>
              <CaptionText caption={caption} style={styles.captionText} />
            </View>
          ) : null}
        </>
      ) : (
        <CaptionText caption={plain} style={[styles.label, { color: fg }]} />
      )}
    </View>
  );
}

/** A name laid out by cardCaption: its own lines, or two lines with the rest hidden. */
function CaptionText({ caption, style }: { caption: ReturnType<typeof cardCaption>; style: StyleProp<TextStyle> }) {
  const size = { fontSize: caption.fontSize, lineHeight: lineHeight(caption.fontSize) };
  return caption.lines ? (
    // A margin of four points on the estimate, and the line count held: « Mangue » measured
    // a little wider than computed on a capture and lost its « e » to a hidden line.
    <Text numberOfLines={caption.lines.length} style={[style, size]}>
      {caption.lines.join('\n')}
    </Text>
  ) : (
    <Text numberOfLines={2} style={[style, size]}>
      {caption.text}
    </Text>
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
  icon: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  below: { position: 'absolute', left: 4, right: 4 },
  small: { fontWeight: '600', textAlign: 'center' },
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
