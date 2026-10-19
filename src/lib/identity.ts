import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { useTierStore } from '../store/useTierStore';
import { fetchFriends } from './api';

/**
 * The install's identity (device id, profile secret once created, credits wallet's
 * secret) is also kept in the iOS Keychain, which survives deleting the app: after a
 * reinstall on the same iPhone, the player gets their profile, friends, votes and
 * credits back.
 */
const KEY = 'tiercraft.identity';
const OPTIONS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

type Identity = { deviceId: string; secret?: string; wallet?: string };

async function read(): Promise<Identity | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY, OPTIONS);
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}

/** Saves the current device id and profile secret to the Keychain. */
export async function saveIdentity(): Promise<void> {
  if (Platform.OS === 'web') return;
  const { deviceId, profile, walletSecret } = useTierStore.getState();
  try {
    const identity: Identity = { deviceId, secret: profile?.secret, wallet: walletSecret ?? undefined };
    await SecureStore.setItemAsync(KEY, JSON.stringify(identity), OPTIONS);
  } catch {
    // Keychain unavailable: the identity stays in the app's storage only.
  }
}

let restoring: Promise<void> | null = null;

/**
 * At launch: restores the identity saved in the Keychain (after a reinstall), or
 * saves the current one there. Safe to call several times.
 */
export function restoreIdentity(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  restoring ??= run().finally(() => {
    restoring = null;
  });
  return restoring;
}

async function run(): Promise<void> {
  const saved = await read();
  const state = useTierStore.getState();
  if (!saved) return saveIdentity();

  // Fresh install: take back the device id the votes were made with.
  if (saved.deviceId !== state.deviceId && !state.profile) {
    useTierStore.setState({ deviceId: saved.deviceId });
  }
  // And the credits: the same wallet, not a new empty one.
  if (saved.wallet && saved.wallet !== state.walletSecret) {
    useTierStore.setState({ walletSecret: saved.wallet });
  } else if (!saved.wallet && state.walletSecret) {
    await saveIdentity();
  }
  if (saved.secret && !useTierStore.getState().profile) {
    try {
      const { me } = await fetchFriends(saved.secret);
      useTierStore.getState().setProfile({ id: me.id, secret: saved.secret, pseudo: me.pseudo, tag: me.tag, avatar: me.avatar });
      // The welcome screens were seen with this profile before.
      useTierStore.getState().updateSettings({ onboarded: true });
    } catch {
      // Offline (retried at the next launch), or the profile no longer exists.
    }
    return;
  }
  // A profile created before the Keychain was used: save it now.
  if (!saved.secret && useTierStore.getState().profile) await saveIdentity();
}
