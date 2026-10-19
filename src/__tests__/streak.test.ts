import { dailyStreak } from '../lib/streak';
import type { TierList } from '../store/types';

const done = (day: string) => ({ daily: { day, emoji: '', cardIds: [], validatedAt: 1 } }) as unknown as TierList;
const now = new Date(Date.UTC(2026, 9, 13, 18)); // 13 October 2026, 20:00 in Paris

describe('dailyStreak', () => {
  it('counts consecutive validated days up to today', () => {
    expect(dailyStreak([done('2026-10-13'), done('2026-10-12'), done('2026-10-11')], now)).toBe(3);
  });

  it('keeps yesterday’s streak while today is not done yet', () => {
    expect(dailyStreak([done('2026-10-12'), done('2026-10-11')], now)).toBe(2);
  });

  it('counts in days of the daily tier list, which turn at 12:30 Paris time', () => {
    // 14 October at 9:00 in Paris: the list of the 13th is still the one of the day.
    const morning = new Date(Date.UTC(2026, 9, 14, 7));
    expect(dailyStreak([done('2026-10-12'), done('2026-10-11')], morning)).toBe(2);
    expect(dailyStreak([done('2026-10-13'), done('2026-10-12')], morning)).toBe(2);
  });

  it('breaks on a missed day', () => {
    expect(dailyStreak([done('2026-10-13'), done('2026-10-11')], now)).toBe(1);
    expect(dailyStreak([done('2026-10-10')], now)).toBe(0);
  });
});
