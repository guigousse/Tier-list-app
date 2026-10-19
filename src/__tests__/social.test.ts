import { agreement, friendCode, parseFriendCode } from '../lib/social';

describe('friend codes', () => {
  it('reads pseudo and tag', () => {
    expect(parseFriendCode('Guigou#1234')).toEqual({ pseudo: 'Guigou', tag: 1234 });
    expect(parseFriendCode('  Éloïse B # 0042 ')).toEqual({ pseudo: 'Éloïse B', tag: 42 });
    expect(friendCode({ pseudo: 'Bob', tag: 4542 })).toBe('Bob#4542');
  });

  it('rejects codes without a 4-digit tag', () => {
    expect(parseFriendCode('Guigou')).toBeNull();
    expect(parseFriendCode('Guigou#12')).toBeNull();
    expect(parseFriendCode('#1234')).toBeNull();
  });
});

describe('agreement', () => {
  it('is 100 for identical rankings and 0 for opposite ones', () => {
    expect(agreement([0, 1, 2], [0, 1, 2])).toBe(100);
    expect(agreement([0, 0], [4, 4])).toBe(0);
    expect(agreement([0, 4], [1, 4])).toBe(88);
  });
});
