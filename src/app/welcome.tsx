import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RankingScene, sceneHeight } from '../components/onboarding/RankingScene';
import { Button } from '../components/ui';
import { colors, spacing } from '../constants/theme';
import { openDaily } from '../lib/create';
import { useT } from '../lib/i18n/useT';
import type { DailyList } from '../lib/api';
import { useCatalog } from '../store/useCatalog';
import { useTierStore } from '../store/useTierStore';

/** How long the first launch waits for the daily tier list before staying on the home screen. */
const DAILY_WAIT_MS = 4000;

/** The daily tier list, once the catalogue has it (the first launch may still be fetching it). */
function whenDaily(): Promise<DailyList | null> {
  const now = useCatalog.getState().daily;
  if (now) return Promise.resolve(now);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, DAILY_WAIT_MS);
    const unsubscribe = useCatalog.subscribe((s) => {
      if (!s.daily) return;
      clearTimeout(timer);
      unsubscribe();
      resolve(s.daily);
    });
  });
}

/**
 * Shown on the first launch, over the blurred home screen: one animated scene of the
 * game, then straight to the daily tier list. Playing teaches more than slides; the
 * player profile waits until it's needed (adding a friend, in Profil).
 */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { t } = useT();
  const [opening, setOpening] = useState(false);

  // Largest scene that leaves room for the caption and the button.
  const room = height - insets.top - insets.bottom - 240;
  let sceneW = Math.min(width - spacing.xl * 2, 380);
  while (sceneW > 220 && sceneHeight(sceneW) > room) sceneW -= 10;

  const finish = async () => {
    setOpening(true);
    // The first game: today's tier list, in place of this screen, so the home screen's
    // questions (statistics, region) wait until the player comes back to it.
    const daily = await whenDaily();
    useTierStore.getState().updateSettings({ onboarded: true });
    if (daily) openDaily(daily, true);
    // Not there in time (offline): the home screen shows it when it comes.
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, styles.veil]} />
      <View style={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.slide}>
          <RankingScene width={sceneW} active />
          <Text style={styles.caption}>{t('app.welcome.slide1')}</Text>
        </View>
        <View style={styles.footer}>
          <Button label={t('app.welcome.play')} icon="play" onPress={finish} disabled={opening} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  veil: { backgroundColor: 'rgba(11, 12, 18, 0.88)' },
  content: { flex: 1, justifyContent: 'space-between' },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  caption: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 12,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
});

/** If the scene fails, skip the welcome screen rather than closing the app. */
export function ErrorBoundary() {
  const { t } = useT();
  return (
    <View style={[styles.root, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }]}>
      <Text style={styles.caption}>{t('app.welcome.fallback')}</Text>
      <Button
        label={t('app.letsGo')}
        icon="checkmark"
        onPress={() => {
          useTierStore.getState().updateSettings({ onboarded: true });
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }}
      />
    </View>
  );
}
