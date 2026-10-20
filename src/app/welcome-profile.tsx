import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileForm } from '../components/ProfileForm';
import { Button } from '../components/ui';
import { colors, spacing } from '../constants/theme';
import { useT } from '../lib/i18n/useT';
import { useTierStore } from '../store/useTierStore';

/**
 * The onboarding's last step, between the first list validated and its results: the
 * player profile, to add friends and compare rankings. "Plus tard" goes on to the
 * results; the profile can still be made in Profil.
 */
export default function WelcomeProfile() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();

  const done = () => {
    useTierStore.getState().updateSettings({ profileAsked: true });
    if (id) router.replace({ pathname: '/results/[id]', params: { id } });
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}
      >
        <View style={styles.skipRow}>
          <Button variant="ghost" label={t('app.later')} onPress={done} />
        </View>
        <Text style={styles.title}>{t('app.welcome.profile')}</Text>
        <Text style={styles.sub}>{t('app.welcome.profileSub')}</Text>
        <ProfileForm onSaved={done} submitLabel={t('app.welcome.seeResults')} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  skipRow: { flexDirection: 'row', justifyContent: 'flex-end', minHeight: 48 },
  title: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  sub: { color: colors.textMuted, fontSize: 15, textAlign: 'center', marginBottom: spacing.sm },
});
