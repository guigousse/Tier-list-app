import type * as GoogleMobileAds from 'react-native-google-mobile-ads';

export type AdsSdk = typeof GoogleMobileAds;

/**
 * Web and Android: no ad SDK. The web build can't even bundle it (it imports React
 * Native internals), and the app ships on the App Store only. adsSdk.ios.ts loads it.
 */
export function loadAdsSdk(): AdsSdk | null {
  return null;
}
