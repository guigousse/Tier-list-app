import type { TierList } from '../store/types';

/** "2026-10-13" for the local day `offset` days before `from`. */
function dayString(from: Date, offset: number): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Days whose daily tier list was validated: on the phone, and kept by the server (`more`). */
function validatedDays(lists: TierList[], more: string[]): Set<string> {
  return new Set([...lists.filter((l) => l.daily?.validatedAt).map((l) => l.daily!.day), ...more]);
}

/**
 * Number of consecutive days, up to today, whose daily tier list was validated.
 * Today not being done yet doesn't break the streak (it counts from yesterday).
 */
export function dailyStreak(lists: TierList[], now = new Date(), more: string[] = []): number {
  const done = validatedDays(lists, more);
  let offset = done.has(dayString(now, 0)) ? 0 : 1;
  let streak = 0;
  while (done.has(dayString(now, offset))) {
    streak += 1;
    offset += 1;
  }
  return streak;
}

/** Longest run of consecutive days whose daily tier list was validated, ever. */
export function bestStreak(lists: TierList[], more: string[] = []): number {
  const days = [...validatedDays(lists, more)].sort();
  let best = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const day of days) {
    const [y, m, d] = day.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    // Consecutive when the previous validated day is the calendar day before.
    const next = previous && new Date(previous.getFullYear(), previous.getMonth(), previous.getDate() + 1);
    run = next && next.getTime() === date.getTime() ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}

/** Tier lists ranked to the end: validated daily and popular tier lists. */
export function completedCount(lists: TierList[]): number {
  return lists.filter((l) => l.daily?.validatedAt || l.popular?.validatedAt).length;
}
