import { readFileSync } from 'node:fs';
import { parseHouse, type HouseData } from '../../src/core/house';
import type { Candidate } from '../../src/gen/generate';
import type { Tech } from '../../src/gen/params';
import type { PlayHouse } from '../../src/gen/record';

/** A house of the list Gate B round 3 played, with the techniques of the band it was built for. */
export interface Played extends PlayHouse {
  role: string;
  maxTech: Tech;
  /** Null: no T4 limit (Infinity does not survive JSON). */
  maxT4: number | null;
}

/** Houses 1–24, 27, 31 and 34 of the list round 3 played (src/data at 431eb44), and their bands. */
export const ROUND3 = JSON.parse(
  readFileSync(new URL('../fixtures/round3-houses.json', import.meta.url), 'utf8'),
) as Played[];

export function played(id: number): Played {
  const h = ROUND3.find((x) => x.id === id);
  if (!h) throw new Error(`no round-3 house ${String(id)}`);
  return h;
}

/** The band's techniques of a played house, as the grader and the walk take them. */
export function bandOf(h: Played): { maxTech: Tech; maxT4: number } {
  return { maxTech: h.maxTech, maxT4: h.maxT4 ?? Number.POSITIVE_INFINITY };
}

/** A house as the generator hands it to the deepening search. */
export function candidateOf(h: HouseData): Candidate {
  return {
    seed: 0,
    n: h.n,
    objects: h.objects,
    rooms: h.rooms,
    solution: [...h.solution],
    puzzle: parseHouse(h),
  };
}
