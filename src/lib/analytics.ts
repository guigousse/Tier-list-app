import { Platform } from 'react-native';

import { useTierStore } from '../store/useTierStore';

/** The player's answer to the statistics question: nothing is sent before a yes. */
export type Consent = 'unknown' | 'granted' | 'denied';

type Firebase = typeof import('@react-native-firebase/analytics');

// Loaded on demand: the web build (screenshots) and Expo Go have no native module, and
// firebase.json keeps collection off at launch until applyConsent says otherwise.
let firebase: Firebase | null | undefined;
function native(): Firebase | null {
  if (firebase === undefined) {
    try {
      // A static import would load the native module on the web build too.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      firebase = Platform.OS === 'web' ? null : (require('@react-native-firebase/analytics') as Firebase);
    } catch {
      firebase = null;
    }
  }
  return firebase;
}

const granted = () => useTierStore.getState().settings.analyticsConsent === 'granted';

/** Turns collection on or off to match the player's answer; measurement only, never ads. */
export function applyConsent(consent: Consent) {
  const fb = native();
  if (!fb) return;
  const analytics = fb.getAnalytics();
  const on = consent === 'granted';
  if (on) {
    fb.setConsent(analytics, { analytics_storage: true, ad_storage: false, ad_user_data: false, ad_personalization: false }).catch(() => {});
  }
  fb.setAnalyticsCollectionEnabled(analytics, on).catch(() => {});
}

/** An event of the game (no name, no title, no free text in `params`). */
export function track(name: string, params?: Record<string, string | number>) {
  const fb = native();
  if (!fb || !granted()) return;
  // Typed void for custom names, a promise at run time: both are swallowed.
  Promise.resolve(fb.logEvent(fb.getAnalytics(), name, params)).catch(() => {});
}

/** A screen's name: its route ("editor/[id]"), never the list or the friend it shows. */
export function screenName(segments: string[]): string {
  return segments.length ? segments.join('/') : 'index';
}

export function trackScreen(segments: string[]) {
  const fb = native();
  if (!fb || !granted()) return;
  const name = screenName(segments);
  fb.logScreenView(fb.getAnalytics(), { screen_name: name, screen_class: name }).catch(() => {});
}

/** The question comes after the welcome screens, and only until it is answered. */
export function shouldAskConsent(settings: { onboarded: boolean; analyticsConsent: Consent }): boolean {
  return settings.onboarded && settings.analyticsConsent === 'unknown';
}
