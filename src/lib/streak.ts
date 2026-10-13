import type { TierList } from '../store/types';

/** "2026-10-13" for the local day `offset` days before `from`. */
function dayString(from: Date, offset: number): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Number of consecutive days, up to today, whose daily tier list was validated.
 * Today not being done yet doesn't break the streak (it counts from yesterday).
 */
export function dailyStreak(lists: TierList[], now = new Date()): number {
  const done = new Set(lists.filter((l) => l.daily?.validatedAt).map((l) => l.daily!.day));
  let offset = done.has(dayString(now, 0)) ? 0 : 1;
  let streak = 0;
  while (done.has(dayString(now, offset))) {
    streak += 1;
    offset += 1;
  }
  return streak;
}
