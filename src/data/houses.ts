import { houseAt, type PlayHouse } from '../gen/record';
import levels from './levels.json';

/**
 * The houses as the game reads them (D57). levels.json holds only what play needs and ships in
 * the first download; the build's metadata (grades, win rates, roles, seeds) stays in the
 * *-meta.json files, which only the tests and the build report read.
 */
const LEVELS = levels as PlayHouse[];

/** House `k` of the endless list: 1–1000 as built, then turned (D14 as amended, D56). */
export function playHouse(k: number): PlayHouse {
  return houseAt(LEVELS, k);
}

/**
 * The daily house of a UTC date (GDD §10, D28), or null outside 2026-11-01 … 2028-12-31. The
 * dailies load on first use as a chunk of their own, from the same origin by a relative path
 * (CLAUDE.md rule 2), so they stay out of the first download.
 */
export async function dailyHouse(date: string): Promise<PlayHouse | null> {
  const { default: dailies } = await import('./dailies.json');
  return (dailies as Record<string, PlayHouse>)[date] ?? null;
}
