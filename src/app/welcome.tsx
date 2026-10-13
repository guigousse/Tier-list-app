import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/ui';
import { colors, radius, spacing, TIER_COLORS } from '../constants/theme';
import { useTierStore } from '../store/useTierStore';

type Slide = { title: string; text: string; art: React.ReactNode };

function TierArt() {
  const rows: [string, string[]][] = [
    ['S', ['🍕', '🍣']],
    ['A', ['🍔']],
    ['B', ['🥗', '🌮']],
    ['C', []],
    ['D', ['🥦']],
  ];
  return (
    <View style={styles.board}>
      {rows.map(([label, cards], i) => (
        <View key={label} style={styles.row}>
          <View style={[styles.tier, { backgroundColor: TIER_COLORS[i] }]}>
            <Text style={styles.tierText}>{label}</Text>
          </View>
          <View style={styles.cards}>
            {cards.map((c) => (
              <View key={c} style={styles.card}>
                <Text style={styles.cardEmoji}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function BigEmoji({ emoji, caption }: { emoji: string; caption: string }) {
  return (
    <View style={styles.bigWrap}>
      <Text style={styles.big}>{emoji}</Text>
      <Text style={styles.bigCaption}>{caption}</Text>
    </View>
  );
}

const SLIDES: Slide[] = [
  {
    title: 'Classez tout, de S à D',
    text: 'Glissez les cartes dans les rangs, ou touchez-les pour choisir leur rang. Ajoutez vos propres cartes, avec une photo ou une image Wikimedia.',
    art: <TierArt />,
  },
  {
    title: 'Une tier list chaque jour',
    text: 'Classez la tier list du jour, validez, et découvrez le classement moyen des joueurs. Revenez chaque jour pour garder votre série !',
    art: <BigEmoji emoji="🔥" caption="Série de 7 jours" />,
  },
  {
    title: 'Partagez vos listes',
    text: 'Envoyez une tier list avec un code à 6 caractères ou un lien : vos amis l’ouvrent dans Tiercraft et font leur propre classement.',
    art: <BigEmoji emoji="📲" caption="K7F 3QX" />,
  },
];

/** Shown once, on the first launch. */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;

  const finish = () => {
    useTierStore.getState().updateSettings({ onboarded: true });
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.skipRow}>
        {last ? <View /> : <Button variant="ghost" label="Passer" onPress={finish} />}
      </View>
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {SLIDES.map((s) => (
          <View key={s.title} style={[styles.slide, { width }]}>
            <View style={styles.art}>{s.art}</View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.text}>{s.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <View key={s.title} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.footer}>
        <Button
          label={last ? 'C’est parti !' : 'Suivant'}
          icon={last ? 'checkmark' : 'arrow-forward'}
          onPress={() => {
            if (last) return finish();
            scroll.current?.scrollTo({ x: (page + 1) * width, animated: true });
            setPage(page + 1);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  skipRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.md, minHeight: 48 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
  art: { minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  text: { color: colors.textMuted, fontSize: 16, lineHeight: 23, textAlign: 'center', maxWidth: 420 },
  board: { width: 260, borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 2, borderBottomColor: colors.background },
  tier: { width: 46, height: 48, alignItems: 'center', justifyContent: 'center' },
  tierText: { fontSize: 18, fontWeight: '800', color: '#111' },
  cards: { flex: 1, flexDirection: 'row', gap: 4, padding: 4 },
  card: { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: 22 },
  bigWrap: { alignItems: 'center', gap: spacing.sm },
  big: { fontSize: 110 },
  bigCaption: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 22, backgroundColor: colors.primary },
  footer: { paddingHorizontal: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
});
