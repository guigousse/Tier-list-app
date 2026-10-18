import type { Ref } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, readableTextColor } from '../constants/theme';
import { SHARE_HOST } from '../lib/share';
import { fitCards, SHARE_CARD } from '../lib/shareCard';
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
 * player's tiers and the Tiercraft band at the bottom (the watermark: icon, name, site).
 * Drawn off screen and captured at 3× (1080 × 1920) by the results page.
 */
export function ShareCard({ ref, list, rows, agreement }: Props) {
  const size = fitCards(rows.map((r) => r.length));
  return (
    <View ref={ref} testID="share-card" collapsable={false} style={styles.card}>
      <View style={styles.stripes}>
        {STRIPES.map((c) => (
          <View key={c} style={[styles.stripe, { backgroundColor: c }]} />
        ))}
      </View>
      <View style={styles.header}>
        <Text style={styles.kicker}>Ma tier list</Text>
        <Text style={styles.title} numberOfLines={2}>
          {list.emoji ? `${list.emoji} ` : ''}
          {list.title}
        </Text>
        {agreement !== undefined ? <Text style={styles.agreement}>{agreement} % d’accord avec les autres joueurs</Text> : null}
      </View>
      <View style={styles.board}>
        {list.tiers.map((tier, t) => (
          <View key={tier.id} style={styles.row}>
            <View style={[styles.label, { backgroundColor: tier.color }]}>
              <Text style={[styles.labelText, { color: readableTextColor(tier.color) }]} numberOfLines={2} adjustsFontSizeToFit>
                {tier.label}
              </Text>
            </View>
            <View style={styles.cards}>
              {(rows[t] ?? []).map((card) => (
                <CardView key={card.id} card={card} size={size} showLabel={size >= 46} />
              ))}
            </View>
          </View>
        ))}
      </View>
      {/* The watermark: where the picture comes from, and where to play. */}
      <View style={styles.band}>
        <Image source={require('../../assets/icon.png')} style={styles.icon} />
        <View style={styles.bandText}>
          <Text style={styles.brand}>Tiercraft</Text>
          <Text style={styles.tagline}>Classe, compare avec tes amis</Text>
        </View>
        <Text style={styles.site}>{SHARE_HOST}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD.width,
    minHeight: SHARE_CARD.height,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  stripes: { flexDirection: 'row', gap: 4, paddingTop: 18 },
  stripe: { flex: 1, height: 5, borderRadius: 3 },
  header: { paddingTop: 22, paddingBottom: 14, gap: 4 },
  kicker: { color: colors.primary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', lineHeight: 31 },
  agreement: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: 2 },
  board: { flex: 1, minHeight: SHARE_CARD.boardHeight, borderRadius: 14, overflow: 'hidden', gap: SHARE_CARD.rowGap },
  row: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, overflow: 'hidden' },
  label: { width: 52, alignItems: 'center', justifyContent: 'center', padding: 4 },
  labelText: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  // Inner width: 360 − 2 × 20 (margins) − 52 (label) − 2 × 4 (padding) = SHARE_CARD.boardWidth.
  cards: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: SHARE_CARD.gap, padding: SHARE_CARD.gap },
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: { width: 36, height: 36, borderRadius: 9 },
  bandText: { flex: 1 },
  brand: { color: colors.text, fontSize: 16, fontWeight: '800' },
  tagline: { color: colors.textMuted, fontSize: 12 },
  site: { color: colors.primary, fontSize: 12, fontWeight: '700' },
});
