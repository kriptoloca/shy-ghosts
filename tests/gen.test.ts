import { describe, expect, it } from 'vitest';
import { geometry, houseErrors, parseHouse } from '../src/core/house';
import { makeCandidate, type Candidate } from '../src/gen/generate';
import { DAILY_BAND, ROOM_MAX_FACTOR, bandFor, type Band } from '../src/gen/params';
import { hashSeed } from '../src/gen/rng';
import { solve } from '../src/gen/solve';

/**
 * The generator (GENERATOR.md §6, steps 1–5) over 200 seeds per band: what every candidate it
 * keeps must be, before any grading.
 */
const BANDS: [string, Band][] = [
  ['4–8 (house 5)', bandFor(5)],
  ['9 (6 rooms)', bandFor(9)],
  ['10–11', bandFor(10)],
  ['12–14', bandFor(12)],
  ['15–16', bandFor(15)],
  ['17–19', bandFor(18)],
  ['20–22', bandFor(21)],
  ['23–24', bandFor(23)],
  ['cycle low, cycle 0', bandFor(25)],
  ['cycle high, cycle 0', bandFor(28)],
  ['cycle high, capped', bandFor(140)],
  ['manor, cycle 0', bandFor(34)],
  ['cycle breather', bandFor(35)],
  ['daily', DAILY_BAND],
];
const SEEDS = 200;

function isCandidate(x: ReturnType<typeof makeCandidate>): x is Candidate {
  return !('rejected' in x);
}

describe('makeCandidate', () => {
  it('is deterministic: the same seed gives the same house', () => {
    for (const [, band] of BANDS) {
      for (let k = 0; k < 5; k++) {
        const seed = hashSeed(`det/${String(k)}`);
        expect(makeCandidate(band, seed)).toEqual(makeCandidate(band, seed));
      }
    }
  });

  it.each(BANDS)('%s: 200 seeds keep the band, the room rules and one solution', (_name, band) => {
    let kept = 0;
    for (let k = 0; k < SEEDS; k++) {
      const c = makeCandidate(band, hashSeed(`gen/${band.role}/${String(k)}`));
      if (!isCandidate(c)) continue;
      kept++;
      const data = { n: c.n, rooms: c.rooms, objects: c.objects, givens: [], solution: c.solution };
      // canonical, connected rooms of at least 2 cells; the solution on empty cells of its rooms
      expect(houseErrors(data)).toEqual([]);
      const h = parseHouse(data);
      expect(band.sides).toContain(c.n);
      const lo = band.rooms[0] + (band.roomsFromSide ? c.n : 0);
      const hi = band.rooms[1] + (band.roomsFromSide ? c.n : 0);
      expect(h.roomCount).toBeGreaterThanOrEqual(lo);
      expect(h.roomCount).toBeLessThanOrEqual(hi);
      const geo = geometry(c.n, c.objects);
      const rows = geo.segments.filter((s) => s.axis === 'row').length;
      expect(h.roomCount).toBeLessThanOrEqual(Math.min(rows, geo.segments.length - rows));
      const avg = (c.n * c.n) / h.roomCount;
      for (const cells of h.roomCells)
        expect(cells.length).toBeLessThanOrEqual(ROOM_MAX_FACTOR * avg);
      const count = (o: string): number => [...c.objects].filter((x) => x === o).length;
      expect(count('F')).toBeGreaterThanOrEqual(band.furniture[0]);
      expect(count('F')).toBeLessThanOrEqual(band.furniture[1]);
      expect(count('L')).toBeGreaterThanOrEqual(band.lamps[0]);
      expect(count('L')).toBeLessThanOrEqual(band.lamps[1]);
      // exactly one solution, the stored one
      const s = solve(h);
      expect(s.count).toBe(1);
      expect(s.solutions[0]).toEqual(c.solution);
    }
    // every band produces houses (the build measures the yields, docs/PROGRESS.md)
    expect(kept).toBeGreaterThan(0);
  });
});
