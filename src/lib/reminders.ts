import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { useTierStore } from '../store/useTierStore';
import { publicationTime } from './dailyClock';

// Show the reminder even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/**
 * Schedules (or cancels) the local notification announcing the daily tier list, every
 * day when it comes out: 12:30 Paris time, in the phone's own time. Returns false if
 * the user refused notifications.
 */
export async function setDailyReminder(enabled: boolean): Promise<boolean> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return true;
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return false;
  await schedule();
  return true;
}

async function schedule() {
  // A daily trigger rings at a time of the phone's clock: 12:30 in Paris converted to it.
  // Away from Europe the two don't change time on the same days: the opening of the app
  // moves it back (syncDailyReminder).
  const at = publicationTime();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'La tier list du jour est là 🎯',
      body: 'Classez-la, gardez votre série et comparez-vous aux autres joueurs.',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: at.getHours(), minute: at.getMinutes() },
  });
}

/**
 * On opening the app, puts the reminder back on the time of the publication: reminders
 * scheduled at another hour by an older version, a phone gone to another time zone.
 * Asks for nothing: a permission withdrawn leaves the reminder off.
 */
export async function syncDailyReminder(): Promise<void> {
  if (Platform.OS === 'web' || !useTierStore.getState().settings.dailyReminder) return;
  try {
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    await schedule();
  } catch {
    // Notifications unavailable: the reminder already scheduled stays.
  }
}

/**
 * Turns the daily reminder on by default, once: after the welcome screens, iOS asks
 * for the notification permission. If refused, the reminder stays off.
 */
export async function enableDefaultReminder(): Promise<void> {
  const { settings, updateSettings } = useTierStore.getState();
  if (settings.reminderAsked || Platform.OS === 'web') return;
  updateSettings({ reminderAsked: true });
  try {
    const ok = await setDailyReminder(true);
    updateSettings({ dailyReminder: ok });
  } catch {
    // Notifications unavailable: the reminder stays off.
  }
}
