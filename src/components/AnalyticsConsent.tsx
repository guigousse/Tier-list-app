import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../constants/theme';
import { shouldAskConsent } from '../lib/analytics';
import { useT } from '../lib/i18n/useT';
import { useTierStore } from '../store/useTierStore';
import { Button, Sheet } from './ui';

/**
 * Asked once, after the welcome screens: may the app measure its audience? Closing the
 * sheet counts as a no (nothing is measured without a yes); the settings change it later.
 */
export function AnalyticsConsent() {
  const { t } = useT();
  const ask = useTierStore((s) => shouldAskConsent(s.settings));
  const answer = (analyticsConsent: 'granted' | 'denied') => useTierStore.getState().updateSettings({ analyticsConsent });
  return (
    <Sheet
      visible={ask}
      onClose={() => answer('denied')}
      title={t('consent.title')}
      footer={
        <View style={styles.buttons}>
          <Button variant="secondary" label={t('consent.no')} onPress={() => answer('denied')} style={{ flex: 1 }} />
          <Button icon="checkmark" label={t('consent.yes')} onPress={() => answer('granted')} style={{ flex: 1 }} />
        </View>
      }
    >
      <View style={styles.body}>
        <Text style={styles.text}>{t('consent.body')}</Text>
        <Text style={styles.text}>{t('consent.privacy')}</Text>
        <Text style={styles.muted}>{t('consent.later')}</Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.sm },
  text: { color: colors.text, fontSize: 15, lineHeight: 21 },
  muted: { color: colors.textMuted, fontSize: 13 },
  buttons: { flexDirection: 'row', gap: spacing.sm },
});
