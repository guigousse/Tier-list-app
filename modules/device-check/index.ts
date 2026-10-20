import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

type Native = { isSupported(): boolean; generateTokenAsync(): Promise<string> };

// Optional: absent on Android, on the web and in an iOS build made before this module.
const native = Platform.OS === 'ios' ? requireOptionalNativeModule<Native>('TiercraftDeviceCheck') : null;

/** Whether this device can give a DeviceCheck token (iOS only, never in the simulator). */
export function isSupported(): boolean {
  try {
    return native?.isSupported() ?? false;
  } catch {
    return false;
  }
}

/** A DeviceCheck token, base64, for the server to ask Apple about this device's 2 bits. */
export function generateTokenAsync(): Promise<string> {
  if (!native) return Promise.reject(new Error('DeviceCheck unavailable'));
  return native.generateTokenAsync();
}
