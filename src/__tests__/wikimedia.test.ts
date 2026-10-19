import { searchTerm } from '../lib/wikimedia';

describe('searchTerm', () => {
  it('strips leading emojis from a card name', () => {
    expect(searchTerm('🍕 Pizza')).toBe('Pizza');
    expect(searchTerm('🇫🇷 France')).toBe('France');
    expect(searchTerm('Italie')).toBe('Italie');
    expect(searchTerm('🍕')).toBe('');
  });
});
