import { aiIconUri } from '../lib/aiIconFiles';
import { imageUri } from '../lib/images';

// Counts the file system lookups a card display costs (synchronous native calls).
let lookups = 0;
jest.mock('expo-file-system', () => ({
  Directory: class {
    get exists() {
      lookups += 1;
      return true;
    }
    create() {}
  },
  File: class {
    uri: string;
    constructor(_dir: unknown, name: string) {
      this.uri = `file:///${name}`;
    }
    get exists() {
      lookups += 1;
      return true;
    }
    static downloadFileAsync = jest.fn();
  },
  Paths: { document: '/' },
}));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-image-picker', () => ({}));

describe('showing the same cards again', () => {
  it('doesn’t ask the file system again and again', () => {
    for (let i = 0; i < 20; i++) {
      imageUri('photo.jpg');
      aiIconUri('https://cdn/pizza-1.png');
    }
    // One look at each folder and at the icon file, not one per display.
    expect(lookups).toBeLessThanOrEqual(3);
    expect(imageUri('photo.jpg')).toBe('file:///photo.jpg');
    expect(aiIconUri('https://cdn/pizza-1.png')).toBe('file:///pizza-1.png');
  });
});
