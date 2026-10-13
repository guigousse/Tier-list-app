import * as Notifications from 'expo-notifications';

// Show the reminder even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/**
 * Schedules (or cancels) the local notification announcing the daily tier list,
 * every day at `hour`:00. Returns false if the user refused notifications.
 */
export async function setDailyReminder(enabled: boolean, hour: number): Promise<boolean> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return true;
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'La tier list du jour est là 🎯',
      body: 'Classez-la, gardez votre série et comparez-vous aux autres joueurs.',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0 },
  });
  return true;
}
