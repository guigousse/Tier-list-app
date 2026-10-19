import { dailyDay, parisOffsetMinutes, publicationTime } from '../lib/dailyClock';

// Instants written in UTC: the result must not depend on the phone's time zone.
const utc = (y: number, m: number, d: number, h: number, min = 0) => new Date(Date.UTC(y, m - 1, d, h, min));

describe('Paris time', () => {
  it('is UTC+1 in winter and UTC+2 in summer, switching on the last Sundays of March and October at 01:00 UTC', () => {
    expect(parisOffsetMinutes(utc(2026, 1, 15, 12))).toBe(60);
    expect(parisOffsetMinutes(utc(2026, 7, 15, 12))).toBe(120);
    // 2026: summer time from Sunday 29 March, winter time from Sunday 25 October.
    expect(parisOffsetMinutes(utc(2026, 3, 29, 0, 59))).toBe(60);
    expect(parisOffsetMinutes(utc(2026, 3, 29, 1))).toBe(120);
    expect(parisOffsetMinutes(utc(2026, 10, 25, 0, 59))).toBe(120);
    expect(parisOffsetMinutes(utc(2026, 10, 25, 1))).toBe(60);
  });
});

describe('day of the daily tier list', () => {
  it('turns at 12:30 Paris time, not at midnight', () => {
    // 17 October 2026, summer time: 12:30 in Paris is 10:30 UTC.
    expect(dailyDay(utc(2026, 10, 17, 10, 29))).toBe('2026-10-16');
    expect(dailyDay(utc(2026, 10, 17, 10, 30))).toBe('2026-10-17');
    // Past midnight, the day before's list is still the one of the day.
    expect(dailyDay(utc(2026, 10, 17, 22, 30))).toBe('2026-10-17');
  });

  it('follows winter time', () => {
    // 10 December 2026: 12:30 in Paris is 11:30 UTC.
    expect(dailyDay(utc(2026, 12, 10, 11, 29))).toBe('2026-12-09');
    expect(dailyDay(utc(2026, 12, 10, 11, 30))).toBe('2026-12-10');
  });

  it('crosses months and years', () => {
    expect(dailyDay(utc(2027, 1, 1, 9))).toBe('2026-12-31');
    expect(dailyDay(utc(2026, 3, 1, 8))).toBe('2026-02-28');
  });
});

describe('time of the publication', () => {
  it('is 12:30 in Paris whatever the season', () => {
    const summer = publicationTime(utc(2026, 7, 1, 8));
    expect(summer.getTime()).toBe(utc(2026, 7, 1, 10, 30).getTime());
    const winter = publicationTime(utc(2026, 12, 1, 8));
    expect(winter.getTime()).toBe(utc(2026, 12, 1, 11, 30).getTime());
  });
});
