import { DarkTheme, SplashScreen, Stack, ThemeProvider, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Alert, AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '../constants/theme';
import { applyConsent, trackScreen } from '../lib/analytics';
import { openWallet } from '../lib/credits';
import { syncDailyVotes } from '../lib/daily';
import { restoreIdentity } from '../lib/identity';
import { coverUrls, preloadCovers } from '../lib/preload';
import { restoreProgress } from '../lib/progress';
import { onPushReceived, openPush, syncPushToken } from '../lib/push';
import { syncDailyReminder } from '../lib/reminders';
import { preloadSounds } from '../lib/sound';
import { AppHeader } from '../components/AppHeader';
import { MilestoneWatcher } from '../components/rewards/MilestoneWatcher';
import { syncAllCopies } from '../lib/publicSync';
import { useAllTemplates, useCatalog } from '../store/useCatalog';
import { useMail } from '../store/useMail';
import { hydrationRecovered, useHydrated, useTierStore } from '../store/useTierStore';
import { openShop } from '../lib/shop';
import { t as translateNow, useT } from '../lib/i18n/useT';
import { useTranslationsFollowLanguage } from '../lib/i18n/useContent';
import { syncProfileLanguage } from '../lib/profileLanguage';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Keep the home screen under screens opened from a link (e.g. an imported tier list).
export const unstable_settings = { initialRouteName: 'index' };

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export default function RootLayout() {
  const hydrated = useHydrated();
  // Screen titles read at render: they follow a language changed in the settings.
  const { t, language } = useT();
  useTranslationsFollowLanguage();
  // A language changed, or a profile just made: the friends' notifications follow it.
  const profileSecret = useTierStore((s) => s.profile?.secret);
  useEffect(() => {
    if (hydrated && profileSecret) syncProfileLanguage();
  }, [hydrated, profileSecret, language]);

  useEffect(() => {
    if (!hydrated) return;
    SplashScreen.hideAsync().catch(() => {});
    // Sounds loaded now, so the first tap isn't silent.
    preloadSounds();
    // The daily reminder back on the time the daily tier list comes out (12:30 in Paris).
    syncDailyReminder();
    if (hydrationRecovered()) {
      // Read once the saved settings are back: the alert speaks the player's language.
      Alert.alert(translateNow('app.unreadableTitle'), translateNow('app.unreadableBody'));
    }
    // Profile and device id kept in the Keychain (back after a reinstall).
    restoreIdentity().then(() => {
      syncDailyVotes();
      // Notifications about friends: this install's push token on the profile.
      syncPushToken();
      syncProfileLanguage();
      // The wallet after the identity: a reinstall finds its credits through the Keychain.
      openWallet();
      // Same for the reward paths: the server kept the lists completed and the VS chosen.
      restoreProgress();
      // A pack bought but not credited yet (connection lost): delivered now, as promised.
      openShop();
    });
  }, [hydrated]);

  // Usage statistics follow the player's answer, and see each screen by its route.
  const consent = useTierStore((s) => s.settings.analyticsConsent);
  useEffect(() => {
    if (hydrated) applyConsent(consent);
  }, [hydrated, consent]);
  const segments = useSegments();
  const route = segments.join('/');
  useEffect(() => {
    if (hydrated) trackScreen(route ? route.split('/') : []);
  }, [hydrated, route, consent]);

  // Notifications about friends: a tap opens the comparison; one arriving while the
  // app is open refreshes the inbox.
  useEffect(() => {
    if (!hydrated || Platform.OS === 'web') return;
    const launch = Notifications.getLastNotificationResponse();
    if (launch) {
      Notifications.clearLastNotificationResponse();
      // The app was opened by the tap: let the navigator mount first.
      setTimeout(() => openPush(launch.notification.request.content.data), 300);
    }
    const tapped = Notifications.addNotificationResponseReceivedListener((r) => {
      Notifications.clearLastNotificationResponse();
      openPush(r.notification.request.content.data);
    });
    const received = Notifications.addNotificationReceivedListener((n) => onPushReceived(n.request.content.data));
    return () => {
      tapped.remove();
      received.remove();
    };
  }, [hydrated]);

  // Fetch the latest online templates and daily tier list (cached for offline use)
  // and send daily rankings validated offline.
  useEffect(() => {
    const sync = () => {
      useCatalog.getState().refresh();
      syncDailyVotes();
      useMail.getState().refresh();
    };
    sync();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && sync());
    return () => sub.remove();
  }, []);

  // A public list enriched online (cards, tiers, images) reaches the copies already made.
  const templates = useAllTemplates();
  const icons = useCatalog((s) => s.icons);
  useEffect(() => {
    if (!hydrated) return;
    const store = useTierStore.getState();
    syncAllCopies(Object.values(store.lists), templates, icons, store.syncPopular);
  }, [hydrated, templates, icons]);

  // The pictures of the public lists copied to the device ahead: the page shows them at once.
  const tops = useCatalog((s) => s.tops);
  useEffect(() => {
    if (!hydrated || Platform.OS === 'web') return;
    preloadCovers(coverUrls(templates, tops, icons));
  }, [hydrated, templates, tops, icons]);

  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <ThemeProvider value={theme}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              header: (props) => <AppHeader {...props} />,
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: '700' },
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal',
              contentStyle: { backgroundColor: colors.background },
              // Screens under the one shown don't render: Accueil and Mes listes redrew at
              // every card moved in the editor. They catch up when they come back.
              freezeOnBlur: true,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="lists" options={{ title: t('app.title.lists') }} />
            <Stack.Screen name="templates" options={{ title: t('app.title.templates') }} />
            <Stack.Screen name="popular" options={{ title: t('app.title.popular') }} />
            <Stack.Screen name="social" options={{ title: t('app.title.social') }} />
            <Stack.Screen name="rewards" options={{ title: t('app.title.rewards') }} />
            <Stack.Screen name="legal/[doc]" options={{ title: '' }} />
            <Stack.Screen name="friend/[id]" options={{ title: '' }} />
            <Stack.Screen name="mail/[id]" options={{ title: '' }} />
            <Stack.Screen name="settings" options={{ title: t('app.title.settings') }} />
            <Stack.Screen name="import" options={{ title: t('app.title.import'), presentation: 'modal' }} />
            <Stack.Screen name="s/[code]" options={{ headerShown: false }} />
            <Stack.Screen name="results/[id]" options={{ title: t('app.title.results') }} />
            <Stack.Screen name="history" options={{ title: t('app.title.history') }} />
            <Stack.Screen name="store" options={{ title: t('app.title.store') }} />
            <Stack.Screen
              name="welcome"
              options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade', gestureEnabled: false, contentStyle: { backgroundColor: 'transparent' } }}
            />
            <Stack.Screen name="editor/[id]" options={{ headerShown: false, gestureEnabled: false }} />
          </Stack>
          <MilestoneWatcher />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
