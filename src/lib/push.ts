import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { useMail } from '../store/useMail';
import { useTierStore } from '../store/useTierStore';
import { setPushToken } from './api';
import { openMail } from './mail';

/** What a push notification from the server carries (see the push_notifications migration). */
type PushData =
  | { type: 'mail'; id: string }
  | { type: 'friend_vote'; friend: string; key: string }
  | Record<string, unknown>;

let lastSent: string | null | undefined;

/**
 * Registers this install for notifications about friends (or unregisters it when
 * they're turned off in the settings). Asks for the permission only if it was
 * never asked; never throws.
 */
export async function syncPushToken(): Promise<void> {
  if (Platform.OS === 'web') return;
  const { profile, settings } = useTierStore.getState();
  if (!profile) return;
  try {
    let token: string | null = null;
    if (settings.friendNotifications) {
      const current = await Notifications.getPermissionsAsync();
      const granted = current.granted || (current.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
      if (granted) {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      }
    }
    if (token === lastSent) return;
    await setPushToken(profile.secret, token);
    lastSent = token;
  } catch {
    // Offline or push unavailable: tried again at the next launch.
  }
}

/** A notification arrived while the app is open: the inbox and badge catch up. */
export function onPushReceived(data: PushData | undefined): void {
  if (data?.type === 'mail') useMail.getState().refresh();
}

/** The player tapped a notification: opens the comparison it is about. */
export async function openPush(data: PushData | undefined): Promise<void> {
  if (!data) return;
  if (data.type === 'friend_vote' && typeof data.friend === 'string') {
    router.push({ pathname: '/friend/[id]', params: { id: data.friend, key: typeof data.key === 'string' ? data.key : undefined } });
    return;
  }
  if (data.type === 'mail' && typeof data.id === 'string') {
    await useMail.getState().refresh();
    const { inbox, outbox } = useMail.getState();
    const received = inbox.find((m) => m.id === data.id);
    const sent = outbox.find((m) => m.id === data.id);
    if (received) openMail(received, true);
    else if (sent) openMail(sent, false);
    else router.push({ pathname: '/social', params: { tab: 'lists' } });
  }
}
