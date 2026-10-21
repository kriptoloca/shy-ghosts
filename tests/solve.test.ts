import { describe, expect, it } from 'vitest';
import { fromRows, parseHouse, type HouseData } from '../src/core/house';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import { solve } from '../src/gen/solve';
import { Rng } from '../src/gen/rng';
import { bruteSolutions } from './support/brute';
import { randomHouse } from './support/houses';

/** The exact solver (GENERATOR.md §3) against brute force. */
const key = (s: readonly number[]): string => s.join(',');

describe('solve', () => {
  it('the tutorial houses: one solution with the given, the stored one; 2, 4 and 9 without', () => {
    TUTORIAL_HOUSES.forEach((d, k) => {
      const h = parseHouse(d);
      const withGiven = solve(h);
      expect(withGiven.count).toBe(1);
      expect(withGiven.solutions).toEqual([[...d.solution]]);
      const free = solve(h, { givens: false, limit: 100 });
      expect(free.count).toBe([2, 4, 9][k]);
      const brute = bruteSolutions(d, { givens: false, cap: 100 }).map(key).sort();
      expect(free.solutions.map(key).sort()).toEqual(brute);
    });
  });

  it('stops at two by default (enough to know a house is not unique)', () => {
    const h = parseHouse(TUTORIAL_HOUSES[1] as HouseData);
    const r = solve(h, { givens: false });
    expect(r.count).toBe(2);
    expect(r.solutions).toHaveLength(2);
  });

  it('agrees with brute force on 500 random small houses', () => {
    const rng = new Rng(11);
    for (let k = 0; k < 500; k++) {
      const d = randomHouse(rng, 2, 6);
      const h = parseHouse(d);
      const cap = 200;
      const brute = bruteSolutions(d, { givens: true, cap });
      const r = solve(h, { limit: cap });
      expect(r.count).toBe(brute.length);
      // below the cap both lists are complete, so they must hold the same solutions
      if (brute.length < cap) expect(r.solutions.map(key).sort()).toEqual(brute.map(key).sort());
      expect(solve(h).count).toBe(Math.min(2, brute.length));
    }
  });

  it('a house with no solution counts zero', () => {
    // two rooms side by side in one open row: their ghosts always see each other
    const d = fromRows({
      rooms: ['AB', 'AB'],
      objects: ['..', 'FF'],
      solution: [
        [0, 0],
        [0, 1],
      ],
    });
    expect(solve(parseHouse(d)).count).toBe(0);
  });

  it('fails loudly past its node limit instead of guessing', () => {
    const d = fromRows({
      rooms: ['AABB', 'AABB', 'CCDD', 'CCDD'],
      solution: [
        [0, 0],
        [1, 2],
        [2, 1],
        [3, 3],
      ],
    });
    expect(() => solve(parseHouse(d), { limit: 1000, nodeLimit: 3 })).toThrow(/node limit/);
  });
});
