import * as Notifications from 'expo-notifications';

import { publicationTime } from '../lib/dailyClock';
import { setDailyReminder, syncDailyReminder } from '../lib/reminders';
import { useTierStore } from '../store/useTierStore';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: () => {},
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));

const schedule = Notifications.scheduleNotificationAsync as jest.Mock;
const cancel = Notifications.cancelAllScheduledNotificationsAsync as jest.Mock;
const permissions = Notifications.getPermissionsAsync as jest.Mock;
const ask = Notifications.requestPermissionsAsync as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('daily reminder', () => {
  it('rings every day when the daily tier list comes out, 12:30 Paris time, in the phone’s own time', async () => {
    expect(await setDailyReminder(true)).toBe(true);
    const at = publicationTime();
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule.mock.calls[0][0].trigger).toEqual({ type: 'daily', hour: at.getHours(), minute: at.getMinutes() });
  });

  it('is moved to the time of the publication on opening the app, when it is on', async () => {
    useTierStore.getState().updateSettings({ dailyReminder: true });
    await syncDailyReminder();
    expect(cancel).toHaveBeenCalled();
    expect(schedule).toHaveBeenCalledTimes(1);
  });

  it('asks nothing on opening the app: off, or permission withdrawn, nothing is scheduled', async () => {
    useTierStore.getState().updateSettings({ dailyReminder: false });
    await syncDailyReminder();
    expect(schedule).not.toHaveBeenCalled();

    useTierStore.getState().updateSettings({ dailyReminder: true });
    permissions.mockResolvedValueOnce({ granted: false });
    await syncDailyReminder();
    expect(schedule).not.toHaveBeenCalled();
    expect(ask).not.toHaveBeenCalled();
  });
});
