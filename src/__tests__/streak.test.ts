import { dailyStreak } from '../lib/streak';
import type { TierList } from '../store/types';

const done = (day: string) => ({ daily: { day, emoji: '', cardIds: [], validatedAt: 1 } }) as unknown as TierList;
const now = new Date(2026, 9, 13, 20); // 13 October 2026, evening

describe('dailyStreak', () => {
  it('counts consecutive validated days up to today', () => {
    expect(dailyStreak([done('2026-10-13'), done('2026-10-12'), done('2026-10-11')], now)).toBe(3);
  });

  it('keeps yesterday’s streak while today is not done yet', () => {
    expect(dailyStreak([done('2026-10-12'), done('2026-10-11')], now)).toBe(2);
  });

  it('breaks on a missed day', () => {
    expect(dailyStreak([done('2026-10-13'), done('2026-10-11')], now)).toBe(1);
    expect(dailyStreak([done('2026-10-10')], now)).toBe(0);
  });
});
