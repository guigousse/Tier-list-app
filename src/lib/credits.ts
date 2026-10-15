import * as AppIntegrity from '@expo/app-integrity';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { useTierStore } from '../store/useTierStore';
import { aiChallenge, aiWallet, type Attestation } from './api';
import { newId } from './id';
import { saveIdentity } from './identity';

/**
 * The player's credits. The balance lives on the server only (supabase/migrations/
 * *_credits.sql): the app holds the wallet's secret and shows the last balance the
 * server gave, and every generation's price is taken there, never here.
 */
export const useCredits = create<{ balance: number | null }>(() => ({ balance: null }));

export function setBalance(balance: number | undefined): void {
  if (typeof balance === 'number') useCredits.setState({ balance });
}

/** The wallet's secret, made once per install and kept in the Keychain with the identity. */
function secret(): string {
  const existing = useTierStore.getState().walletSecret;
  if (existing) return existing;
  // 64 random hex characters: as hard to guess as the profile's secret.
  const made = (newId() + newId()).replace(/-/g, '');
  useTierStore.setState({ walletSecret: made });
  saveIdentity();
  return made;
}

/**
 * Apple's word that this is the genuine app on a real iPhone (App Attest): what the
 * welcome bonus needs, so that a script can't open wallets by the thousand. Null where
 * it isn't available (simulator, web, Android for now) or when it fails.
 * No entitlement in app.json: without one, TestFlight and App Store builds attest in
 * Apple's production environment, the only one the server accepts. (The capability
 * can't be turned on through the App Store Connect API anyway: APP_ATTEST is refused.)
 */
async function attest(): Promise<Attestation | undefined> {
  if (Platform.OS !== 'ios' || !AppIntegrity.isSupported) return undefined;
  try {
    const { challenge } = await aiChallenge(useTierStore.getState().deviceId);
    const keyId = await AppIntegrity.generateKeyAsync();
    const attestation = await AppIntegrity.attestKeyAsync(keyId, challenge);
    return { keyId, attestation, challenge };
  } catch {
    return undefined;
  }
}

let opening: Promise<number | null> | null = null;

/**
 * Opens the wallet (created empty on the server the first time) and refreshes the
 * balance. Until Apple has vouched for the install, each opening tries again, so the
 * welcome bonus isn't lost to a bad connection. Offline: the last balance known.
 */
export function openWallet(): Promise<number | null> {
  opening ??= (async () => {
    const wallet = secret();
    const proof = useTierStore.getState().walletAttested ? undefined : await attest();
    try {
      const { balance, attested } = await aiWallet(useTierStore.getState().deviceId, wallet, proof);
      if (attested) useTierStore.setState({ walletAttested: true });
      setBalance(balance);
    } catch {
      // Out of reach: the next opening tries again.
    }
    return useCredits.getState().balance;
  })().finally(() => {
    opening = null;
  });
  return opening;
}

/** The wallet's secret for a paid request, the wallet opened first if it never was. */
export async function walletForRequest(): Promise<string> {
  if (!useTierStore.getState().walletSecret) await openWallet();
  return secret();
}

/** The message for a generation refused for lack of credits, or null for another error. */
export function creditsError(e: unknown): string | null {
  return e instanceof Error && e.message === 'credits' ? 'Pas assez de crédits pour cette génération.' : null;
}
