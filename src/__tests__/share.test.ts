import { decodeShared, encodeList, normalizeCode, offlineLink, toPayload } from '../lib/share';
import type { TierList } from '../store/types';

const list: TierList = {
  id: 'l1',
  title: 'Crêpes & 🍕 « top »',
  tiers: [
    { id: 't1', label: 'S', color: '#FF7F7F' },
    { id: 't2', label: 'Bof 😐', color: '#FFBF7F' },
  ],
  cards: {
    a: { id: 'a', label: '🍎 Pomme', color: '#2B2F3A' },
    b: { id: 'b', label: 'Été ☀️', color: '#FFFFFF' },
    c: { id: 'c', label: '', color: '#1E88E5', imageName: 'x.jpg' },
  },
  placement: { t1: ['b', 'a'], t2: [] },
  pool: ['c'],
  favorite: false,
  createdAt: 0,
  updatedAt: 0,
  openedAt: 0,
};

describe('share codec', () => {
  it('round-trips a tier list with accents and emojis, keeping the ranking', () => {
    const shared = decodeShared(offlineLink(list));
    expect(shared?.title).toBe(list.title);
    expect(shared?.tiers.map((t) => t.label)).toEqual(['S', 'Bof 😐']);
    expect(shared?.cards).toEqual([
      { label: 'Été ☀️', color: '#FFFFFF', tier: 0 },
      { label: '🍎 Pomme', color: '#2B2F3A', tier: 0 },
      { label: '', color: '#1E88E5', tier: -1 },
    ]);
  });

  it('reads the link inside a whole pasted message, or the bare code', () => {
    const code = encodeList(list);
    expect(decodeShared(`Regarde ça :\n\nhttps://x/import?d=${code}\n\nÀ+`)?.title).toBe(list.title);
    expect(decodeShared(code)?.title).toBe(list.title);
  });

  it('rejects garbage and sanitises out-of-range values', () => {
    expect(decodeShared('hello world')).toBeNull();
    expect(decodeShared('?d=AAAAAAAAAA')).toBeNull();
    const payload = { ...toPayload(list), c: [['X', 'not-a-colour', 99]] };
    const code = Buffer.from(JSON.stringify(payload)).toString('base64url');
    expect(decodeShared(code)?.cards[0]).toEqual({ label: 'X', color: '#2B2F3A', tier: -1 });
  });
});

describe('normalizeCode', () => {
  it('accepts codes typed loosely or inside a short link', () => {
    expect(normalizeCode('k7f-3qx')).toBe('K7F3QX');
    expect(normalizeCode('K7F 3QX')).toBe('K7F3QX');
    expect(normalizeCode('https://tiercraft.vercel.app/s/k7f3qx')).toBe('K7F3QX');
  });

  it('refuses ambiguous characters and wrong lengths', () => {
    expect(normalizeCode('K7F3Q0')).toBeNull();
    expect(normalizeCode('ABC')).toBeNull();
  });
});
