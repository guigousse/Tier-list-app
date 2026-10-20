import type { Template } from '../constants/presets';
import { listCover } from '../lib/listCover';

const fruits = {
  key: 'fruits',
  title: 'Fruits',
  emoji: '🍓',
  items: ['🍎 Pomme', '🍌 Banane', '🥭 Mangue'],
  concepts: ['red-apple', 'banana', 'mango'],
} as Template;
const icons = { 'red-apple': 'https://cdn/apple.png', mango: 'https://cdn/mango.png' };

describe('the picture of a public list', () => {
  it('is its favourite card: the one most often ranked S', () => {
    expect(listCover(fruits, { fruits: 2 }, icons)).toEqual({ url: 'https://cdn/mango.png', emoji: '🥭' });
  });

  it('the favourite not drawn yet: its own emoji, not the list’s', () => {
    expect(listCover(fruits, { fruits: 1 }, icons)).toEqual({ url: undefined, emoji: '🍌' });
  });

  it('no vote yet: the first card that has a picture', () => {
    expect(listCover(fruits, {}, { mango: 'https://cdn/mango.png' })).toEqual({ url: 'https://cdn/mango.png', emoji: '🥭' });
  });

  it('no vote yet on a daily list: the card chosen for it rather than the first one', () => {
    expect(listCover({ ...fruits, cover: 2 }, {}, icons)).toEqual({ url: 'https://cdn/mango.png', emoji: '🥭' });
    expect(listCover({ ...fruits, cover: 2 }, { fruits: 0 }, icons).url).toBe('https://cdn/apple.png');
  });

  it('a favourite past the cards it knows is ignored', () => {
    expect(listCover(fruits, { fruits: 9 }, icons).url).toBe('https://cdn/apple.png');
  });

  it('nothing drawn, no vote: the list’s emoji', () => {
    expect(listCover(fruits, {}, {})).toEqual({ url: undefined, emoji: '🍓' });
  });

  it('a past daily list (no pictures) shows its favourite card’s emoji', () => {
    const daily = { key: 'daily-2026-10-13', title: 'Snacks', emoji: '🍿', items: ['🍕 Pizza', '🌮 Tacos'], day: '2026-10-13' } as Template;
    expect(listCover(daily, { 'daily-2026-10-13': 1 }, icons)).toEqual({ url: undefined, emoji: '🌮' });
  });
});
