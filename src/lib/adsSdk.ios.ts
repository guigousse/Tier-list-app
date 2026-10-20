import type * as GoogleMobileAds from 'react-native-google-mobile-ads';

/** iOS: the ad SDK, loaded when the player first wants an ad (adsSdk.ts says why per platform). */
export function loadAdsSdk(): typeof GoogleMobileAds | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-google-mobile-ads') as typeof GoogleMobileAds;
  } catch {
    // A build without the native module (Expo Go): no ad, the page says "Soon".
    return null;
  }
}
