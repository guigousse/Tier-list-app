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

describe('card pictures in a shared list', () => {
  const ICON = 'https://mefhdtpyhtvplpfleyhi.supabase.co/storage/v1/object/public/card-icons/apple';
  const withIcons: TierList = {
    ...list,
    cards: {
      a: { ...list.cards.a, iconUrl: ICON },
      b: { ...list.cards.b, iconUrl: 'https://evil.example/x.png' },
      c: list.cards.c,
    },
  };

  it('a card of the icon library comes with its picture; a picture from elsewhere or a photo of the phone does not', () => {
    expect(decodeShared(offlineLink(withIcons))?.cards).toEqual([
      { label: 'Été ☀️', color: '#FFFFFF', tier: 0 },
      { label: '🍎 Pomme', color: '#2B2F3A', tier: 0, iconUrl: ICON },
      { label: '', color: '#1E88E5', tier: -1 },
    ]);
  });

  it('a Wikimedia picture comes with its credit; a photo of the phone does not', () => {
    const WIKI = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Red_Apple.jpg/600px-Red_Apple.jpg';
    const photos: TierList = {
      ...list,
      cards: {
        a: { ...list.cards.a, imageName: 'a.jpg', imageUrl: WIKI, imageCredit: 'Abhijit Tembhekar · CC BY 2.0 — Wikimedia Commons' },
        b: { ...list.cards.b, imageName: 'b.jpg', imageUrl: 'https://evil.example/b.jpg', imageCredit: 'x' },
        c: list.cards.c,
      },
    };
    expect(decodeShared(offlineLink(photos))?.cards).toEqual([
      { label: 'Été ☀️', color: '#FFFFFF', tier: 0 },
      { label: '🍎 Pomme', color: '#2B2F3A', tier: 0, imageUrl: WIKI, imageCredit: 'Abhijit Tembhekar · CC BY 2.0 — Wikimedia Commons' },
      { label: '', color: '#1E88E5', tier: -1 },
    ]);
  });

  it('a Wikimedia picture sent without its credit is still credited to Wikimedia Commons', () => {
    const WIKI = 'https://upload.wikimedia.org/wikipedia/commons/a.png';
    const payload = { ...toPayload(list), c: [['X', '#000000', 0, WIKI]] };
    const code = Buffer.from(JSON.stringify(payload)).toString('base64url');
    expect(decodeShared(code)?.cards[0]).toEqual({ label: 'X', color: '#000000', tier: 0, imageUrl: WIKI, imageCredit: 'Wikimedia Commons' });
  });

  it('a payload naming a picture outside the library: the card arrives without it', () => {
    const payload = { ...toPayload(list), c: [['X', '#000000', 0, 'https://evil.example/x.png'], ['Y', '#000000', 0, 42]] };
    const code = Buffer.from(JSON.stringify(payload)).toString('base64url');
    expect(decodeShared(code)?.cards).toEqual([
      { label: 'X', color: '#000000', tier: 0 },
      { label: 'Y', color: '#000000', tier: 0 },
    ]);
  });
});

describe('normalizeCode', () => {
  it('accepts codes typed loosely or inside a short link', () => {
    expect(normalizeCode('k7f-3qx')).toBe('K7F3QX');
    expect(normalizeCode('K7F 3QX')).toBe('K7F3QX');
    expect(normalizeCode('https://tier-list-app-share-site.vercel.app/s/k7f3qx')).toBe('K7F3QX');
  });

  it('refuses ambiguous characters and wrong lengths', () => {
    expect(normalizeCode('K7F3Q0')).toBeNull();
    expect(normalizeCode('ABC')).toBeNull();
  });
});
