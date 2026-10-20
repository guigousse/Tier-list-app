import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../constants/theme';
import { useT } from '../lib/i18n/useT';
import { setDailyReminder } from '../lib/reminders';
import { useTierStore } from '../store/useTierStore';
import { Button, Sheet } from './ui';

/**
 * Offers the daily reminder in the app's own words before iOS asks: a refusal of the
 * system dialog is for good, so it only shows once the player said yes here.
 */
export function ReminderPrompt({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useT();
  const accept = async () => {
    onClose();
    if (await setDailyReminder(true)) useTierStore.getState().updateSettings({ dailyReminder: true });
  };
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('app.results.reminderTitle')}
      footer={
        <View style={styles.buttons}>
          <Button label={t('app.results.yes')} icon="notifications" onPress={accept} />
          <Button label={t('app.later')} variant="ghost" onPress={onClose} />
        </View>
      }
    >
      <View style={styles.body}>
        <Text style={styles.emoji}>🔥</Text>
        <Text style={styles.text}>{t('app.results.reminderBody')}</Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 48 },
  text: { color: colors.text, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  buttons: { gap: spacing.xs },
});
