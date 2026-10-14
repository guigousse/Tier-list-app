import {
  avatarSvg,
  decodeAvatar,
  DEFAULT_AVATAR,
  encodeAvatar,
  HATS,
  isAvatarCode,
  isUnlocked,
  randomAvatar,
  type AvatarConfig,
} from '../lib/avatar';
import { bestStreak, completedCount } from '../lib/streak';
import type { TierList } from '../store/types';

describe('avatar codes', () => {
  it('round-trips a look', () => {
    const look: AvatarConfig = { body: 'f', skin: 'p4', hair: 'bun', hairColor: 'red', eyes: 'green', hat: 'beanie', glasses: 'round', bg: 'mint' };
    const code = encodeAvatar(look);
    expect(code).toBe('a1-f-p4-bun-red-green-beanie-round-mint');
    expect(isAvatarCode(code)).toBe(true);
    expect(decodeAvatar(code)).toEqual(look);
  });

  it('matches what the server accepts', () => {
    for (let i = 0; i < 50; i++) expect(encodeAvatar(randomAvatar())).toMatch(/^a1(-[a-z0-9]{1,12}){8}$/);
  });

  it('falls back to the defaults for unknown or missing parts', () => {
    expect(decodeAvatar('a1-x-p9-laser')).toEqual(DEFAULT_AVATAR);
    expect(isAvatarCode('🦊')).toBe(false);
  });

  it('only picks items available from the start at random', () => {
    for (let i = 0; i < 50; i++) {
      const look = randomAvatar();
      expect(HATS.find((h) => h.id === look.hat)?.unlock).toBeUndefined();
    }
  });

  it('draws every look with ids unique to it', () => {
    const svg = avatarSvg(DEFAULT_AVATAR, 'abc');
    expect(svg).toContain('id="bg-abc"');
    expect(svg).toContain('url(#clip-abc)');
  });
});

describe('unlocks', () => {
  const daily = (day: string): TierList => ({ daily: { day, emoji: '', cardIds: [], validatedAt: 1 } }) as unknown as TierList;

  it('counts the longest run of consecutive daily tier lists, across months', () => {
    const lists = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-05', '2026-10-06'].map(daily);
    expect(bestStreak(lists)).toBe(3);
    expect(bestStreak([])).toBe(0);
  });

  it('counts completed tier lists', () => {
    const popular = { popular: { key: 'x', voteKey: 'x', cardIds: [], validatedAt: 1 } } as unknown as TierList;
    const draft = {} as TierList;
    expect(completedCount([daily('2026-10-01'), popular, draft])).toBe(2);
  });

  it('unlocks items by streak or by completed lists', () => {
    expect(isUnlocked({ unlock: { streak: 7 } }, { bestStreak: 6, completed: 99 })).toBe(false);
    expect(isUnlocked({ unlock: { streak: 7 } }, { bestStreak: 7, completed: 0 })).toBe(true);
    expect(isUnlocked({ unlock: { completed: 10 } }, { bestStreak: 0, completed: 10 })).toBe(true);
    expect(isUnlocked({}, { bestStreak: 0, completed: 0 })).toBe(true);
  });
});
