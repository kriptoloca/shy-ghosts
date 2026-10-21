import { describe, expect, it } from 'vitest';
import { addDays, dateRange, utcDateKey } from '../src/gen/dates';
import { DAILY_COUNT, DAILY_FIRST, DAILY_LAST } from '../src/gen/params';

/**
 * The daily house belongs to a UTC date (GDD §10; D28–D29). The pipeline's date math is pure
 * integer arithmetic (no clocks in src/gen), checked here against the platform's Date.
 */
describe('UTC date keys', () => {
  it('a second before and after UTC midnight (03:00 in Türkiye) fall on two dates', () => {
    const midnight = Date.UTC(2026, 10, 1);
    expect(utcDateKey(midnight - 1000)).toBe('2026-10-31');
    expect(utcDateKey(midnight)).toBe('2026-11-01');
    expect(utcDateKey(midnight + 1000)).toBe('2026-11-01');
    // 02:59:59 and 03:00:00 in Istanbul (UTC+3) are the same two moments
    expect(utcDateKey(Date.parse('2026-11-01T02:59:59+03:00'))).toBe('2026-10-31');
    expect(utcDateKey(Date.parse('2026-11-01T03:00:00+03:00'))).toBe('2026-11-01');
  });

  it('agrees with the platform calendar on every day from 1970 to 2100', () => {
    const wrong: string[] = [];
    for (let ms = 0; ms < Date.UTC(2100, 0, 1); ms += 86_400_000) {
      const want = new Date(ms).toISOString().slice(0, 10);
      if (utcDateKey(ms + 43_200_000) !== want) wrong.push(want);
    }
    expect(wrong).toEqual([]);
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('the daily range holds 792 dates, 2026-11-01 to 2028-12-31, one per day', () => {
    const dates = dateRange(DAILY_FIRST, DAILY_LAST);
    expect(dates).toHaveLength(DAILY_COUNT);
    expect(dates[0]).toBe('2026-11-01');
    expect(dates.at(-1)).toBe('2028-12-31');
    expect(new Set(dates).size).toBe(DAILY_COUNT);
    dates.forEach((d, i) => {
      if (i > 0) expect(addDays(dates[i - 1] as string, 1)).toBe(d);
    });
  });
});
