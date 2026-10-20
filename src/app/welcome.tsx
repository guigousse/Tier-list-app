import { router } from 'expo-router';
import { useEffect, useState, type ComponentType } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RANKING_DURATION, RankingScene, sceneHeight } from '../components/onboarding/RankingScene';
import { CREATE_SHARE_CAPTIONS, CREATE_SHARE_DURATION, CreateShareScene, HELLO_DURATION, HelloScene } from '../components/onboarding/StoryScenes';
import { ProfileForm } from '../components/ProfileForm';
import { Button } from '../components/ui';
import { colors, spacing } from '../constants/theme';
import { useT } from '../lib/i18n/useT';
import { useTierStore } from '../store/useTierStore';

type Scene = ComponentType<{ width: number; height: number; active: boolean; once?: boolean }>;

/**
 * The welcome story, chapter by chapter: each plays once, then the next follows.
 * `captions`: when each caption shows (ms) and its text key, read in the language of the moment.
 */
const CHAPTERS: { Scene: Scene; duration: number; captions: [number, string][] }[] = [
  { Scene: HelloScene, duration: HELLO_DURATION, captions: [[0, 'app.welcome.hello']] },
  { Scene: RankingScene, duration: RANKING_DURATION, captions: [[0, 'app.welcome.slide1']] },
  {
    Scene: CreateShareScene,
    duration: CREATE_SHARE_DURATION,
    captions: [
      [CREATE_SHARE_CAPTIONS[0], 'app.welcome.create'],
      [CREATE_SHARE_CAPTIONS[1], 'app.welcome.share'],
      [CREATE_SHARE_CAPTIONS[2], 'app.welcome.compare'],
    ],
  },
];

/** A chapter's bar at the top: filling while it plays, full once seen. */
function Segment({ state, duration }: { state: 'done' | 'playing' | 'next'; duration: number }) {
  const fill = useSharedValue(state === 'done' ? 1 : 0);
  useEffect(() => {
    fill.value = state === 'done' ? 1 : 0;
    if (state === 'playing') fill.value = withTiming(1, { duration, easing: Easing.linear });
  }, [state, duration, fill]);
  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View style={styles.segment}>
      <Animated.View style={[styles.segmentFill, style]} />
    </View>
  );
}

/** Shown on the first launch, over the blurred home screen: the story of the app, then the player profile. */
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { t } = useT();
  const [chapter, setChapter] = useState(0);
  // The caption shown, for the chapter it belongs to (a new chapter starts at its first).
  const [shown, setShown] = useState({ chapter: 0, caption: 0 });
  const last = chapter === CHAPTERS.length - 1;
  // After the story: the player profile, unless it already exists.
  const [profileStep, setProfileStep] = useState(false);
  const hasProfile = useTierStore((s) => Boolean(s.profile));

  // Largest scene that leaves room for the caption and the buttons.
  const room = height - insets.top - insets.bottom - 300;
  let sceneW = Math.min(width - spacing.xl * 2, 380);
  while (sceneW > 220 && sceneHeight(sceneW) > room) sceneW -= 10;
  const sceneH = sceneHeight(sceneW);

  // The captions of the chapter in time with it, then the next chapter (the last one stays).
  const { Scene, duration, captions } = CHAPTERS[chapter];
  const caption = shown.chapter === chapter ? shown.caption : 0;
  useEffect(() => {
    const timers = captions.slice(1).map(([at], i) => setTimeout(() => setShown({ chapter, caption: i + 1 }), at));
    if (!last) timers.push(setTimeout(() => setChapter((c) => c + 1), duration + 400));
    return () => timers.forEach(clearTimeout);
  }, [chapter, captions, duration, last]);

  const finish = () => {
    useTierStore.getState().updateSettings({ onboarded: true });
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const toProfile = () => (hasProfile ? finish() : setProfileStep(true));

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
        <View style={{ flex: 1, paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }}>
          <View style={styles.segments}>
            {CHAPTERS.map((c, i) => (
              <Segment key={i} duration={c.duration} state={i < chapter ? 'done' : i === chapter ? 'playing' : 'next'} />
            ))}
          </View>
          <View style={styles.skipRow}>
            {last ? null : <Button variant="ghost" label={t('app.welcome.skip')} onPress={toProfile} />}
          </View>
          <View style={styles.slide}>
            <Animated.View key={chapter} entering={FadeIn.duration(400)}>
              <Scene width={sceneW} height={sceneH} active once />
            </Animated.View>
            <Animated.Text key={`${chapter}-${caption}`} entering={FadeInDown.duration(350)} style={styles.caption}>
              {t(captions[caption][1])}
            </Animated.Text>
          </View>
          <View style={styles.footer}>
            <Button
              label={last ? t('app.letsGo') : t('app.welcome.next')}
              icon={last ? 'checkmark' : 'arrow-forward'}
              onPress={() => (last ? toProfile() : setChapter(chapter + 1))}
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
  segments: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  segment: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.2)' },
  segmentFill: { height: 4, borderRadius: 2, backgroundColor: colors.primary },
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
