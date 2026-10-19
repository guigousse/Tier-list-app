/** Days between two changes of region: often enough to move, too rare to hop around votes and lists. */
export const REGION_CHANGE_DAYS = 30;

const DAY = 24 * 60 * 60 * 1000;

/**
 * When the region can next be changed, or null if it can be now. `changedAt`: the last
 * change made from the settings (the first question after the welcome screens is not one).
 */
export function nextRegionChange(changedAt: number | undefined, now: number): number | null {
  if (changedAt === undefined) return null;
  const next = changedAt + REGION_CHANGE_DAYS * DAY;
  return now >= next ? null : next;
}
