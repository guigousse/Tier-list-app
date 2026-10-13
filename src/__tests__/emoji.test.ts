import { leadingEmoji, splitEmoji } from '../lib/emoji';

describe('emoji helpers', () => {
  it('finds pictographs, joined emojis and flags', () => {
    expect(leadingEmoji('🍕 Pizza')).toBe('🍕');
    expect(leadingEmoji('☀️ Été')).toBe('☀️');
    expect(leadingEmoji('👨‍🍳 Chef')).toBe('👨‍🍳');
    expect(leadingEmoji('🇫🇷 France')).toBe('🇫🇷');
    expect(leadingEmoji('Italie')).toBeUndefined();
  });

  it('splits the emoji from the text', () => {
    expect(splitEmoji('🇮🇹 Italie')).toEqual({ emoji: '🇮🇹', text: 'Italie' });
    expect(splitEmoji('Pizza')).toEqual({ text: 'Pizza' });
  });
});
