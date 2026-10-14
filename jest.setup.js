/* global jest */
// Native modules the store needs, replaced by in-memory versions for unit tests.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));
jest.mock('expo-file-system', () => ({
  Directory: class {
    exists = true;
    create() {}
  },
  File: class {
    exists = false;
    delete() {}
  },
  Paths: { document: '/' },
}));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: () => {},
  getPermissionsAsync: async () => ({ granted: false, canAskAgain: false }),
  requestPermissionsAsync: async () => ({ granted: false }),
  getExpoPushTokenAsync: async () => ({ data: '' }),
}));
