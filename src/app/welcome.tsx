import { router } from 'expo-router';
import { useRef, useState, type ComponentType } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CreateScene, DailyScene, ShareScene, TiersScene } from '../components/onboarding/OtherScenes';
import { RankingScene, sceneHeight } from '../components/onboarding/RankingScene';
import { ProfileForm } from '../components/ProfileForm';
import { Button } from '../components/ui';
import { colors, spacing } from '../constants/theme';
import { useT } from '../lib/i18n/useT';
import { enableDefaultReminder } from '../lib/reminders';
import { useTierStore } from '../store/useTierStore';

type Scene = ComponentType<{ width: number; height: number; active: boolean }>;

// Captions as text keys: read in the language of the moment.
const SLIDES: { Scene: Scene; caption: string }[] = [
  { Scene: RankingScene, caption: 'app.welcome.slide1' },
  { Scene: CreateScene, caption: 'app.welcome.slide2' },
  { Scene: TiersScene, caption: 'app.welcome.slide3' },
  { Scene: DailyScene, caption: 'app.welcome.slide4' },
  { Scene: ShareScene, caption: 'app.welcome.slide5' },
];

/** Shown on the first launch, over the blurred home screen: animated scenes of the app. */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { t } = useT();
  const scroll = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === SLIDES.length - 1;
  // After the slides: the player profile, unless it already exists.
  const [profileStep, setProfileStep] = useState(false);
  const hasProfile = useTierStore((s) => Boolean(s.profile));

  // Largest scene that leaves room for the caption and the buttons.
  const room = height - insets.top - insets.bottom - 300;
  let sceneW = Math.min(width - spacing.xl * 2, 380);
  while (sceneW > 220 && sceneHeight(sceneW) > room) sceneW -= 10;
  const sceneH = sceneHeight(sceneW);

  const finish = () => {
    useTierStore.getState().updateSettings({ onboarded: true });
    if (router.canGoBack()) router.back();
    else router.replace('/');
    // Daily reminder on by default: iOS asks for notifications once the welcome screens close.
    setTimeout(() => enableDefaultReminder(), 600);
  };

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, styles.veil]} />
      {profileStep ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.profile,
              {
                paddingTop: insets.top + spacing.lg,
                paddingBottom: insets.bottom + spacing.lg,
              },
            ]}
          >
            <View style={styles.skipRow}>
              <Button variant="ghost" label={t('app.later')} onPress={finish} />
            </View>
            <Text style={styles.caption}>{t('app.welcome.profile')}</Text>
            <Text style={styles.sub}>{t('app.welcome.profileSub')}</Text>
            <ProfileForm onSaved={finish} submitLabel={t('app.letsGo')} />
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + spacing.lg,
          }}
        >
          <View style={styles.skipRow}>
            {last ? null : <Button variant="ghost" label={t('app.welcome.skip')} onPress={() => (hasProfile ? finish() : setProfileStep(true))} />}
          </View>
          <ScrollView
            ref={scroll}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
            contentContainerStyle={{ alignItems: 'center' }}
          >
            {SLIDES.map(({ Scene, caption }, i) => (
              <View key={i} style={[styles.slide, { width }]}>
                <Scene width={sceneW} height={sceneH} active={i === page} />
                <Text style={styles.caption}>{t(caption)}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
            ))}
          </View>
          <View style={styles.footer}>
            <Button
              label={last ? t('app.letsGo') : t('app.welcome.next')}
              icon={last ? 'checkmark' : 'arrow-forward'}
              onPress={() => {
                if (last) return hasProfile ? finish() : setProfileStep(true);
                scroll.current?.scrollTo({
                  x: (page + 1) * width,
                  animated: true,
                });
                setPage(page + 1);
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  veil: { backgroundColor: 'rgba(11, 12, 18, 0.88)' },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  slide: {
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
  profile: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  sub: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: { width: 22, backgroundColor: colors.primary },
  footer: {
    paddingHorizontal: spacing.lg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
});

/** If a scene fails, skip the welcome screens rather than closing the app. */
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
