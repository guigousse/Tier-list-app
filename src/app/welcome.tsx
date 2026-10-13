import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardView } from '../components/CardView';
import { Button } from '../components/ui';
import { CARD_COLORS, colors, spacing, TIER_COLORS } from '../constants/theme';
import { TEMPLATES } from '../constants/presets';
import { fetchAppIcons } from '../lib/appstore';
import { useTierStore } from '../store/useTierStore';

/** Ratio of the app screenshots (390 × 844 points). */
const SCREEN_RATIO = 844 / 390;

// Example ranking for the first slide: Broc alone in S, the other games spread below.
const GAMES = TEMPLATES.find((t) => t.key === 'mobile-games')!;
const EXAMPLE_TIERS: [string, string[]][] = [
  ['S', ['Broc : jeu de brocante cosy']],
  ['A', ['Clash Royale', 'Minecraft', 'Monument Valley']],
  ['B', ['Brawl Stars', 'Pokémon GO', 'Geometry Dash', 'Hay Day']],
  ['C', ['Clash of Clans', 'Subway Surfers', 'Roblox', 'Among Us!']],
  ['D', ['Candy Crush Saga', 'Plants vs. Zombies 2', 'Fruit Ninja']],
];

let iconCache: Record<string, string> | null = null;

/** The ranking screen, drawn live so the games show their real App Store icons. */
function RankingScreen({ width }: { width: number }) {
  const [icons, setIcons] = useState<Record<string, string>>(iconCache ?? {});
  useEffect(() => {
    if (iconCache) return;
    const apps = GAMES.items.map((name, i) => ({ id: GAMES.appStoreIds?.[i], name: name.split(' : ')[0] }));
    fetchAppIcons(apps)
      .then((urls) => {
        iconCache = Object.fromEntries(GAMES.items.flatMap((label, i) => (urls[i] ? [[label, urls[i]!]] : [])));
        setIcons(iconCache);
      })
      .catch(() => {});
  }, []);

  const card = Math.floor(width * 0.13);
  return (
    <View style={styles.liveScreen}>
      <View style={styles.liveHeader}>
        <Ionicons name="chevron-back" size={width * 0.06} color={colors.text} />
        <Text style={[styles.liveTitle, { fontSize: width * 0.05 }]}>Jeux mobiles</Text>
      </View>
      {EXAMPLE_TIERS.map(([label, games], t) => (
        <View key={label} style={styles.liveRow}>
          <View style={[styles.liveTier, { width: card * 1.1, minHeight: card + 6, backgroundColor: TIER_COLORS[t] }]}>
            <Text style={[styles.liveTierText, { fontSize: card * 0.45 }]}>{label}</Text>
          </View>
          <View style={styles.liveCards}>
            {games.map((g, i) => (
              <CardView
                key={g}
                size={card}
                showLabel={!icons[g]}
                card={{ id: g, label: g.split(' : ')[0], color: CARD_COLORS[(t + i) % 7], imageName: icons[g] }}
              />
            ))}
          </View>
        </View>
      ))}
      <View style={styles.liveTray}>
        <Text style={[styles.liveTrayText, { fontSize: width * 0.035 }]}>À classer · 0 / {GAMES.items.length}</Text>
        <Text style={[styles.liveTrayHint, { fontSize: width * 0.03 }]}>🎉 Toutes les cartes sont classées</Text>
      </View>
    </View>
  );
}

type Slide = { caption: string } & ({ image: ImageSourcePropType } | { live: true });

const SLIDES: Slide[] = [
  { live: true, caption: 'Classez tout de S à D : glissez les cartes, ou touchez-les pour choisir leur rang.' },
  { image: require('../../assets/onboarding/create.jpg'), caption: 'Créez vos listes et ajoutez des cartes, avec une photo ou une image Wikimedia.' },
  { image: require('../../assets/onboarding/customise.jpg'), caption: 'Personnalisez les rangs : noms, couleurs, ordre.' },
  { image: require('../../assets/onboarding/daily.jpg'), caption: 'Chaque jour, une nouvelle tier list à classer. Gardez votre série 🔥' },
  { image: require('../../assets/onboarding/compare.jpg'), caption: 'Validez et comparez votre avis à celui des autres joueurs.' },
];

/** Shown once, on the first launch: a carousel of the app's screens. */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;

  // The phone frame takes most of the height, leaving room for the caption and buttons.
  const frameHeight = Math.min(height - insets.top - insets.bottom - 260, (width - spacing.xl * 2) * SCREEN_RATIO);
  const frameWidth = frameHeight / SCREEN_RATIO;

  const finish = () => {
    useTierStore.getState().updateSettings({ onboarded: true });
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.skipRow}>{last ? <View /> : <Button variant="ghost" label="Passer" onPress={finish} />}</View>
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={[styles.frame, { width: frameWidth, height: frameHeight }]}>
              {'live' in s ? <RankingScreen width={frameWidth} /> : <Image source={s.image} style={styles.shot} resizeMode="cover" />}
            </View>
            <Text style={styles.caption}>{s.caption}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
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
  slide: { alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl },
  frame: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#2C313C',
    backgroundColor: colors.background,
  },
  shot: { width: '100%', height: '100%' },
  caption: { color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: '600', textAlign: 'center', maxWidth: 420 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 22, backgroundColor: colors.primary },
  footer: { paddingHorizontal: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  liveScreen: { flex: 1, backgroundColor: colors.background, paddingTop: '8%' },
  liveHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingBottom: 8 },
  liveTitle: { color: colors.text, fontWeight: '800' },
  liveRow: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 2, borderBottomColor: colors.background },
  liveTier: { alignItems: 'center', justifyContent: 'center' },
  liveTierText: { fontWeight: '800', color: '#111' },
  liveCards: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 3, padding: 3 },
  liveTray: { marginTop: 'auto', backgroundColor: colors.tray, borderTopWidth: 1, borderTopColor: colors.border, padding: 10, gap: 6, paddingBottom: '10%' },
  liveTrayText: { color: colors.text, fontWeight: '700' },
  liveTrayHint: { color: colors.textMuted },
});
