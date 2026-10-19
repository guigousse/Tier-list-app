import { memo } from 'react';
import { SvgXml } from 'react-native-svg';

import { cardIconSvg } from '../lib/cardIcons';

const cache = new Map<string, string>();

/** A card's drawn icon (markup built once per icon, drawing memoized: cards re-render while dragged). */
export const CardIcon = memo(function CardIcon({ id, size }: { id: string; size: number }) {
  let xml = cache.get(id);
  if (xml === undefined) {
    xml = cardIconSvg(id);
    cache.set(id, xml);
  }
  return <SvgXml xml={xml} width={size} height={size} />;
});

/** An icon drawn by the AI (markup stored on the card), memoized like the others. */
export const SvgIcon = memo(function SvgIcon({ xml, size }: { xml: string; size: number }) {
  return <SvgXml xml={xml} width={size} height={size} />;
});
