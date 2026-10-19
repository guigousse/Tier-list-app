import AsyncStorage from '@react-native-async-storage/async-storage';

import { hydrationRecovered, useTierStore } from '../store/useTierStore';

describe('loading saved data', () => {
  it('keeps unreadable data aside and starts from the defaults', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const corrupted = '{"state": {"lists": ';
    await AsyncStorage.setItem('tiercraft-store', corrupted);

    await useTierStore.persist.rehydrate();
    // The copy is made asynchronously after the failed read.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(hydrationRecovered()).toBe(true);
    expect(useTierStore.getState().lists).toEqual({});
    const keys = await AsyncStorage.getAllKeys();
    const backup = keys.find((k) => k.startsWith('tiercraft-store-backup-'));
    expect(backup).toBeDefined();
    expect(await AsyncStorage.getItem(backup!)).toBe(corrupted);
  });
});
