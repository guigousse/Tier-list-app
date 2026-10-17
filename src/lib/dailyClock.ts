// The daily tier list comes out at 12:30 Paris time, for every player wherever their
// phone is set: its day is the Paris day, turning at 12:30 instead of midnight.
// Paris time is computed here rather than asked of Intl: the European rule is fixed, and
// the result doesn't depend on the time zone data of the phone's JavaScript engine.

const PUBLICATION_MINUTES = 12 * 60 + 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Last Sunday of `month` (0-based) of `year`, at 01:00 UTC: when Europe changes time. */
function lastSundayAt1Utc(year: number, month: number): number {
  const last = new Date(Date.UTC(year, month + 1, 0, 1));
  return last.getTime() - last.getUTCDay() * DAY_MS;
}

/** Minutes Paris is ahead of UTC at `at`: 120 in summer time, 60 otherwise. */
export function parisOffsetMinutes(at: Date): number {
  const year = at.getUTCFullYear();
  const t = at.getTime();
  return t >= lastSundayAt1Utc(year, 2) && t < lastSundayAt1Utc(year, 9) ? 120 : 60;
}

const ymd = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

/** Day (YYYY-MM-DD) of the daily tier list on show at `now`. */
export function dailyDay(now = new Date()): string {
  // Paris wall time, read with the UTC getters.
  const paris = new Date(now.getTime() + parisOffsetMinutes(now) * 60_000);
  const minutes = paris.getUTCHours() * 60 + paris.getUTCMinutes();
  return ymd(minutes < PUBLICATION_MINUTES ? new Date(paris.getTime() - DAY_MS) : paris);
}

/** 12:30 in Paris on the Paris day of `now`, as an instant. */
export function publicationTime(now = new Date()): Date {
  const paris = new Date(now.getTime() + parisOffsetMinutes(now) * 60_000);
  const wall = Date.UTC(paris.getUTCFullYear(), paris.getUTCMonth(), paris.getUTCDate(), 12, 30);
  // Time never changes around noon: the offset of 12:30 wall time, read as UTC, is that day's.
  return new Date(wall - parisOffsetMinutes(new Date(wall)) * 60_000);
}
