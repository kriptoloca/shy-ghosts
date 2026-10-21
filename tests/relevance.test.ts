import { describe, expect, it } from 'vitest';
import { parseHouse, type HouseData } from '../src/core/house';
import { grade } from '../src/gen/grade';
import { bandFor } from '../src/gen/params';
import { idleObjects, objectCells, objectsMatter } from '../src/gen/relevance';

/**
 * Object relevance (GENERATOR.md §6.1, D68): the literal test (the object removed) and rule
 * isolation (a block made see-through, a lamp with its light off). The houses are from the list
 * shipped before Gate B's tune round 1 (4cd221d), where round 1's playtester found blocks that
 * change nothing: house 10's and both of house 15's.
 */
const SHIPPED_9: HouseData = {
  n: 5,
  rooms: '0000012223114531445544445',
  objects: '......F..................',
  givens: [],
  solution: [1, 5, 7, 14, 21, 18],
};
const SHIPPED_10: HouseData = {
  n: 5,
  rooms: '0111100111022213222133244',
  objects: '............F............',
  givens: [],
  solution: [6, 2, 13, 15, 24],
};
const SHIPPED_15: HouseData = {
  n: 5,
  rooms: '0000010000110021132213344',
  objects: '......F.............F....',
  givens: [],
  solution: [1, 5, 14, 17, 23],
};
/** House 123: the lamp at (1,5) lights nothing that matters; the block at (4,1) stops nothing. */
const SHIPPED_123: HouseData = {
  n: 6,
  rooms: '001111200011222211223111443551443555',
  objects: '...L......FL.........F..FF.....F...L',
  givens: [],
  solution: [7, 22, 12, 20, 30, 27],
};
/**
 * House 376: switching the lamp at (0,2) off matters, but removing it does not: the lamp at
 * (0,4) then lights (0,2) and on through (0,0), so the board keeps its candidates.
 */
const SHIPPED_376: HouseData = {
  n: 6,
  rooms: '001111001112001322033332444552445555',
  objects: '..L.L..LF......F.......F............',
  givens: [],
  solution: [12, 9, 17, 21, 26, 35],
};

function idle(h: HouseData, place: number): { literal: number[]; rule: number[] } {
  const band = bandFor(place);
  return idleObjects(parseHouse(h), h.solution, { maxTech: band.maxTech, maxT4: band.maxT4 });
}

function matter(h: HouseData, place: number): boolean {
  const band = bandFor(place);
  return objectsMatter(parseHouse(h), h.solution, { maxTech: band.maxTech, maxT4: band.maxT4 });
}

describe('object relevance (D68)', () => {
  it("rule isolation flags house 10's block and both of house 15's: see-through, nothing changes", () => {
    expect(idle(SHIPPED_10, 10).rule).toEqual([12]);
    expect(idle(SHIPPED_15, 15).rule).toEqual([6, 20]);
    expect(matter(SHIPPED_10, 10)).toBe(false);
    expect(matter(SHIPPED_15, 15)).toBe(false);
  });

  it('the literal test lets house 10 through: removing its block frees a cell the path uses', () => {
    expect(idle(SHIPPED_10, 10).literal).toEqual([]);
    expect(idle(SHIPPED_15, 15).literal).toEqual([6, 20]);
  });

  it('a block between two solution ghosts matters: made see-through, they would see each other', () => {
    // house 9: (0,1) and (4,1) of the solution, the bookshelf at (1,1) between them
    expect(idle(SHIPPED_9, 9)).toEqual({ literal: [], rule: [] });
    expect(matter(SHIPPED_9, 9)).toBe(true);
  });

  it('a lamp whose light, switched off, leaves the solution and the path as they were is idle', () => {
    const h = parseHouse(SHIPPED_123);
    expect(h.objects[11]).toBe('L');
    const found = idle(SHIPPED_123, 123);
    expect(found.rule).toContain(11);
    expect(found.rule).toContain(25); // and a block that stops no sight that matters
    expect(matter(SHIPPED_123, 123)).toBe(false);
  });

  it('an object whose removal changes nothing is idle by the literal test alone', () => {
    expect(idle(SHIPPED_376, 376)).toEqual({ literal: [2], rule: [] });
    expect(matter(SHIPPED_376, 376)).toBe(false);
  });

  it('a house without objects passes; the residents stay placed in both tests', () => {
    const bare: HouseData = { ...SHIPPED_10, objects: '.'.repeat(25) };
    expect(objectCells(parseHouse(bare))).toEqual([]);
    expect(matter(bare, 10)).toBe(true);
    // house 9 with its two solution ghosts across the block placed as residents: the block
    // still matters, and the grade the test compares with is the one with the residents
    const placed: HouseData = { ...SHIPPED_9, givens: [1, 21] };
    const p = parseHouse(placed);
    expect(grade(p, { maxTech: 2 }).ok).toBe(true);
    expect(matter(placed, 9)).toBe(true);
  });
});

describe('A9 (round 2): a see-through block stays a block for the names and the time estimate', () => {
  /**
   * Daily 2027-10-02 as Gate B round 1 stored it: made see-through, its corner block at (0,6) left
   * the solution and the path alone and only renamed a step (an empty cell more in its room), which
   * passed it as relevant. A see-through block still counts as a block for the namer and for
   * estSeconds, so that block is idle.
   */
  const DAILY_2027_10_02: HouseData = {
    n: 7,
    rooms: '0000011222201324550332445533446655374665537766663',
    objects: '......F....F............F............L...........',
    givens: [],
    solution: [4, 12, 10, 20, 22, 25, 31, 42],
  };

  it("the corner block (0,6) is idle by rule isolation, and the house fails the build's check", () => {
    const p = parseHouse(DAILY_2027_10_02);
    const opts = { maxTech: 3, maxT4: 0 } as const;
    expect(idleObjects(p, p.solution, opts).rule).toContain(6);
    expect(objectsMatter(p, p.solution, opts)).toBe(false);
  });
});
