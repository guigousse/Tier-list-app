import { Ionicons } from '@expo/vector-icons';
import type { Ref } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, readableTextColor } from '../constants/theme';
import { fitText } from '../lib/fitText';
import { useT } from '../lib/i18n/useT';
import { fitCards, labelFontSize, SHARE_CARD } from '../lib/shareCard';
import type { Card, TierList } from '../store/types';
import { CardView } from './CardView';

const STRIPES = ['#FF7F7F', '#FFBF7F', '#FFDF7F', '#FFFF7F', '#BFFF7F'];

type Props = {
  ref?: Ref<View>;
  list: TierList;
  /** The player's ranking: the cards of each tier, in order. */
  rows: Card[][];
  /** Agreement with the other players (0-100), when known. */
  agreement?: number;
};

/**
 * The ranking as a picture for social networks: a 9:16 story with the list's title, the
 * player's tiers and the Tiercraft band at the bottom (the watermark: icon, name, the App Store).
 * Drawn off screen and captured at 3× (1080 × 1920) by the results page.
 */
export function ShareCard({ ref, list, rows, agreement }: Props) {
  const { t, upper } = useT();
  const size = fitCards(rows.map((r) => r.length));
  const heading = `${list.emoji ? `${list.emoji} ` : ''}${list.title}`;
  const title = shareTitle(heading);
  return (
    <View ref={ref} testID="share-card" collapsable={false} style={styles.card}>
      <View style={styles.stripes}>
        {STRIPES.map((c) => (
          <View key={c} style={[styles.stripe, { backgroundColor: c }]} />
        ))}
      </View>
      <View style={styles.header}>
        <Text style={styles.kicker}>{upper(t('app.share.kicker'))}</Text>
        <Text style={[styles.title, { fontSize: title.fontSize, lineHeight: Math.round(title.fontSize * 1.2) }]}>{title.lines.join('\n')}</Text>
        {agreement !== undefined ? <Text style={styles.agreement}>{t('app.share.agreement', { agreement })}</Text> : null}
      </View>
      <View style={styles.board}>
        {list.tiers.map((tier, t) => (
          <View key={tier.id} style={styles.row}>
            <View style={[styles.label, { backgroundColor: tier.color }]}>
              <Text style={[styles.labelText, { color: readableTextColor(tier.color), fontSize: labelFontSize(tier.label) }]} numberOfLines={3}>
                {tier.label}
              </Text>
            </View>
            <View style={styles.cards}>
              {(rows[t] ?? []).map((card) => (
                <CardView key={card.id} card={card} size={size} showLabel />
              ))}
            </View>
          </View>
        ))}
      </View>
      {/* The watermark: where the picture comes from, and where to play. */}
      <View style={styles.band}>
        <View style={styles.bandHead}>
          <Image source={require('../../assets/icon.png')} style={styles.icon} />
          {/* One line each: side by side, the site squeezed « Tiercraft » letter by letter. */}
          <View style={styles.bandText}>
            <Text style={styles.brand}>Tiercraft</Text>
            <Text style={styles.tagline}>{t('app.share.tagline')}</Text>
          </View>
        </View>
        {/* Where to get it: the store, across the whole band so the sentence stays whole. */}
        <View style={styles.store}>
          <View style={styles.storeIcon}>
            <Ionicons name="logo-apple-appstore" size={14} color="#FFFFFF" />
          </View>
          <Text style={styles.storeText}>{t('app.share.store')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD.width,
    // Exactly 9:16: a taller picture is cropped by the stories.
    height: SHARE_CARD.height,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  stripes: { flexDirection: 'row', gap: 4, paddingTop: 18 },
  stripe: { flex: 1, height: 5, borderRadius: 3 },
  header: { paddingTop: 22, paddingBottom: 14, gap: 4 },
  // Capitals through upper(), not textTransform: Greek capitals drop their accents.
  kicker: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  title: { color: colors.text, fontWeight: '800' },
  agreement: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: 2 },
  board: { flex: 1, justifyContent: 'center', gap: SHARE_CARD.rowGap },
  row: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, overflow: 'hidden' },
  label: { width: SHARE_CARD.labelWidth, alignItems: 'center', justifyContent: 'center', padding: 4 },
  labelText: { fontWeight: '800', textAlign: 'center' },
  // Inner width: 360 − 2 × 20 (margins) − 64 (label) − 2 × 4 (padding) = SHARE_CARD.boardWidth.
  cards: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: SHARE_CARD.gap, padding: SHARE_CARD.gap },
  band: {
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: { width: 44, height: 44, borderRadius: 11 },
  bandHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bandText: { flex: 1, minWidth: 0 },
  brand: { color: colors.text, fontSize: 16, fontWeight: '800' },
  tagline: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  store: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  // The App Store's own blue, behind its glyph.
  storeIcon: { width: 20, height: 20, borderRadius: 5, backgroundColor: '#1D8CF8', alignItems: 'center', justifyContent: 'center' },
  storeText: { color: colors.text, fontSize: 12, fontWeight: '700' },
});

/**
 * The list's title on one line, as large as it holds: titles are limited to 28
 * characters (lib/listTitle.ts), 16 points fit them across the picture.
 */
function shareTitle(heading: string) {
  return fitText(heading, SHARE_CARD.width - 2 * 20, { maxLines: 1, max: 26, min: 16 });
}
