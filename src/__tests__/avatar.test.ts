import {
  canReachStep,
  avatarSvg,
  decodeAvatar,
  DEFAULT_AVATAR,
  encodeAvatar,
  HATS,
  isAvatarCode,
  isUnlocked,
  MANNEQUIN,
  randomAvatar,
  SKINS,
  type AvatarConfig,
} from '../lib/avatar';
import { bestStreak, completedCount } from '../lib/streak';
import type { TierList } from '../store/types';

describe('avatar codes', () => {
  it('round-trips a look', () => {
    const look: AvatarConfig = {
      face: 'heart', skin: 'p4', hair: 'bun', hairColor: 'red', eyeShape: 'lashes', eyes: 'green', brows: 'arched',
      mouth: 'lips', beard: 'none', hat: 'beanie', glasses: 'round', bg: 'mint',
    };
    const code = encodeAvatar(look);
    expect(code).toBe('a2-heart-p4-bun-red-lashes-green-arched-lips-none-beanie-round-mint');
    expect(isAvatarCode(code)).toBe(true);
    expect(decodeAvatar(code)).toEqual(look);
  });

  it('reads the first avatar codes', () => {
    const look = decodeAvatar('a1-f-p2-long-blond-blue-none-round-violet');
    expect(look).toMatchObject({ face: 'oval', eyeShape: 'lashes', skin: 'p2', hair: 'long', hairColor: 'blond', eyes: 'blue', glasses: 'round', bg: 'violet' });
  });

  it('matches what the server accepts', () => {
    for (let i = 0; i < 50; i++) expect(encodeAvatar(randomAvatar())).toMatch(/^a2(-[a-z0-9]{1,12}){12}$/);
  });

  it('falls back to the defaults for unknown or missing parts', () => {
    expect(decodeAvatar('a2-x-p9-laser')).toEqual(DEFAULT_AVATAR);
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

  it('draws a reward on a grey mannequin, the item alone in colour', () => {
    const crown = avatarSvg({ ...MANNEQUIN, hat: 'crown' }, 'u', undefined, 'hat');
    expect(crown).toContain('#FFC93C');
    expect(crown).not.toContain(SKINS.find((s) => s.id === MANNEQUIN.skin)!.fill);
    const alien = avatarSvg({ ...MANNEQUIN, skin: 'alien' }, 'u', undefined, 'skin');
    expect(alien).toContain('#9FE07F');
    const plain = avatarSvg(MANNEQUIN, 'u');
    expect(plain).toContain(SKINS.find((s) => s.id === MANNEQUIN.skin)!.fill);
  });
});

describe('the steps of the avatar editor, with a locked item tried on', () => {
  it('nothing tried on: every step is reachable', () => {
    expect([0, 3, 5].map((s) => canReachStep(s, -1))).toEqual([true, true, true]);
  });

  it('the step of the locked item stays reachable, to take it off; the ones after are not', () => {
    // Tried on a locked hat (step 4), then went back to the face (step 0).
    expect(canReachStep(4, 4)).toBe(true);
    expect(canReachStep(2, 4)).toBe(true);
    expect(canReachStep(5, 4)).toBe(false);
  });
});
