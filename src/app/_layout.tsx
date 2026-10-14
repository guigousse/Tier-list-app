import { DarkTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Alert, AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '../constants/theme';
import { syncDailyVotes } from '../lib/daily';
import { restoreIdentity } from '../lib/identity';
import { onPushReceived, openPush, syncPushToken } from '../lib/push';
import { AppHeader } from '../components/AppHeader';
import { useCatalog } from '../store/useCatalog';
import { useMail } from '../store/useMail';
import { hydrationRecovered, useHydrated } from '../store/useTierStore';

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

  useEffect(() => {
    if (!hydrated) return;
    SplashScreen.hideAsync().catch(() => {});
    if (hydrationRecovered()) {
      Alert.alert(
        'Données illisibles',
        'Vos tier lists enregistrées n’ont pas pu être chargées. Une copie a été mise de côté : contactez l’assistance pour la récupérer.',
      );
    }
    // Profile and device id kept in the Keychain (back after a reinstall).
    restoreIdentity().then(() => {
      syncDailyVotes();
      // Notifications about friends: this install's push token on the profile.
      syncPushToken();
    });
  }, [hydrated]);

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
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="lists" options={{ title: 'Mes listes' }} />
            <Stack.Screen name="templates" options={{ title: 'Modèles de liste' }} />
            <Stack.Screen name="popular" options={{ title: 'Listes populaires' }} />
            <Stack.Screen name="social" options={{ title: 'Profil' }} />
            <Stack.Screen name="legal/[doc]" options={{ title: '' }} />
            <Stack.Screen name="friend/[id]" options={{ title: '' }} />
            <Stack.Screen name="mail/[id]" options={{ title: '' }} />
            <Stack.Screen name="settings" options={{ title: 'Réglages' }} />
            <Stack.Screen name="import" options={{ title: 'Importer une tier list', presentation: 'modal' }} />
            <Stack.Screen name="s/[code]" options={{ headerShown: false }} />
            <Stack.Screen name="results/[id]" options={{ title: 'Résultats' }} />
            <Stack.Screen name="history" options={{ title: 'Historique' }} />
            <Stack.Screen
              name="welcome"
              options={{ headerShown: false, presentation: 'transparentModal', animation: 'fade', gestureEnabled: false, contentStyle: { backgroundColor: 'transparent' } }}
            />
            <Stack.Screen name="editor/[id]" options={{ headerShown: false, gestureEnabled: false }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
