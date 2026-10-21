/**
 * UTC calendar dates as 'YYYY-MM-DD' keys, by pure integer arithmetic (no clocks in src/gen): the
 * daily house belongs to a UTC date (GDD §10, D28–D29). Days are counted from 1970-01-01 with the
 * proleptic Gregorian calendar (H. Hinnant's days_from_civil and civil_from_days, public domain).
 */

/** Milliseconds in a UTC day (UTC has no daylight saving; leap seconds are not counted). */
const MS_PER_DAY = 86_400_000;
/** The Gregorian cycle: 400 years of 146,097 days; eras start on March 1st. */
const DAYS_PER_ERA = 146_097;
const YEARS_PER_ERA = 400;
/** 1970-01-01 is this many days after 0000-03-01. */
const EPOCH_SHIFT = 719_468;

function pad(v: number, width: number): string {
  return String(v).padStart(width, '0');
}

/** Days since 1970-01-01 of a civil date (month 1–12). */
export function daysFromCivil(y: number, m: number, d: number): number {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / YEARS_PER_ERA);
  const yoe = yy - era * YEARS_PER_ERA;
  const mp = (m + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * DAYS_PER_ERA + doe - EPOCH_SHIFT;
}

/** The civil date of a day count since 1970-01-01. */
export function civilFromDays(days: number): { y: number; m: number; d: number } {
  const z = days + EPOCH_SHIFT;
  const era = Math.floor(z / DAYS_PER_ERA);
  const doe = z - era * DAYS_PER_ERA;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const y = yoe + era * YEARS_PER_ERA + (m <= 2 ? 1 : 0);
  return { y, m, d };
}

function key(days: number): string {
  const { y, m, d } = civilFromDays(days);
  return `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`;
}

function days(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number];
  return daysFromCivil(y, m, d);
}

/** The UTC date of a moment (milliseconds since 1970-01-01T00:00:00Z). */
export function utcDateKey(epochMs: number): string {
  return key(Math.floor(epochMs / MS_PER_DAY));
}

/** The date `n` days after `dateKey`. */
export function addDays(dateKey: string, n: number): string {
  return key(days(dateKey) + n);
}

/** Days from `a` to `b`. */
export function daysBetween(a: string, b: string): number {
  return days(b) - days(a);
}

/** Every date from `first` to `last`, inclusive. */
export function dateRange(first: string, last: string): string[] {
  const start = days(first);
  return Array.from({ length: days(last) - start + 1 }, (_, k) => key(start + k));
}
