import { DarkTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '../constants/theme';
import { syncDailyVotes } from '../lib/daily';
import { useCatalog } from '../store/useCatalog';
import { useHydrated } from '../store/useTierStore';

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
    if (hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  // Fetch the latest online templates and daily tier list (cached for offline use)
  // and send daily rankings validated offline.
  useEffect(() => {
    const sync = () => {
      useCatalog.getState().refresh();
      syncDailyVotes();
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
            <Stack.Screen name="settings" options={{ title: 'Réglages' }} />
            <Stack.Screen name="import" options={{ title: 'Importer une tier list', presentation: 'modal' }} />
            <Stack.Screen name="s/[code]" options={{ headerShown: false }} />
            <Stack.Screen name="results/[id]" options={{ title: 'Classement moyen' }} />
            <Stack.Screen name="history" options={{ title: 'Historique' }} />
            <Stack.Screen name="welcome" options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }} />
            <Stack.Screen name="editor/[id]" options={{ headerShown: false, gestureEnabled: false }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
