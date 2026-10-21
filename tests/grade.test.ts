import { describe, expect, it } from 'vitest';
import { fromRows, parseHouse, type HouseData, type HouseModel } from '../src/core/house';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import { episodesOf, grade } from '../src/gen/grade';

/** The grader (GENERATOR.md §4) on the fixtures of §4.5 and the tutorial houses. */
type RC = [number, number];
function fixture(rooms: string[], objects: string[], solution: RC[]): HouseModel {
  return parseHouse(fromRows({ rooms, objects, solution }));
}
const cells = (h: HouseModel, rc: RC[]): number[] =>
  rc.map(([r, c]) => r * h.n + c).sort((a, b) => a - b);

const T2 = fixture(
  ['AAAA', 'BCAA', 'BCCA', 'DDCA'],
  ['....', '....', '....', '....'],
  [
    [0, 3],
    [1, 0],
    [2, 2],
    [3, 1],
  ],
);
const T3 = fixture(
  ['ABBB', 'AABB', 'CCDB', 'CDDD'],
  ['...F', '....', '....', '...F'],
  [
    [0, 0],
    [1, 3],
    [2, 1],
    [3, 2],
  ],
);
const T4 = fixture(
  ['ABBC', 'ABCC', 'ACCD', 'ADDD'],
  ['....', '....', 'F...', '...F'],
  [
    [3, 0],
    [0, 1],
    [1, 2],
    [2, 3],
  ],
);

describe('grade: the fixtures, one per technique where it is the first that applies (§4.5)', () => {
  it('T2: path T2 T1 T1 T1 T1, d 7; with T1 alone it is stuck at the start', () => {
    const g = grade(T2, { maxTech: 4 });
    expect(g.ok).toBe(true);
    expect(g.path).toEqual([2, 1, 1, 1, 1]);
    expect(g.grade?.d).toBe(7);
    expect([...g.placed].sort((a, b) => a - b)).toEqual(
      cells(T2, [
        [0, 3],
        [1, 0],
        [2, 2],
        [3, 1],
      ]),
    );
    const low = grade(T2, { maxTech: 1 });
    expect(low.ok).toBe(false);
    expect(low.path).toEqual([]);
  });

  it('T3: path T3 T3 T2 T2 T1 T1 T1 T1, d 22; with techniques up to T2 stuck at the start', () => {
    const g = grade(T3, { maxTech: 4 });
    expect(g.ok).toBe(true);
    expect(g.path).toEqual([3, 3, 2, 2, 1, 1, 1, 1]);
    expect(g.grade?.d).toBe(22);
    expect([...g.placed].sort((a, b) => a - b)).toEqual(
      cells(T3, [
        [0, 0],
        [1, 3],
        [2, 1],
        [3, 2],
      ]),
    );
    const low = grade(T3, { maxTech: 2 });
    expect(low.ok).toBe(false);
    expect(low.path).toEqual([]);
  });

  it('T4: path T4 T4 T2 T4 T2 T4 T1 T1 T1 T1, d 42; with techniques up to T3 stuck at the start', () => {
    const g = grade(T4, { maxTech: 4 });
    expect(g.ok).toBe(true);
    expect(g.path).toEqual([4, 4, 2, 4, 2, 4, 1, 1, 1, 1]);
    expect(g.grade?.d).toBe(42);
    expect([...g.placed].sort((a, b) => a - b)).toEqual(
      cells(T4, [
        [3, 0],
        [0, 1],
        [1, 2],
        [2, 3],
      ]),
    );
    const low = grade(T4, { maxTech: 3 });
    expect(low.ok).toBe(false);
    expect(low.path).toEqual([]);
    // a manor allows one T4 step at most (D8): this house needs four
    expect(grade(T4, { maxTech: 4, maxT4: 1 }).ok).toBe(false);
  });
});

describe('grade: the tutorial houses and the step accounting (§4.3, §4.4)', () => {
  it('houses 1–3 are solved by T1 alone: 1, 2 and 3 placements; estSeconds 10, 21.5 and 36', () => {
    const want = [
      { path: [1], est: 10 },
      { path: [1, 1], est: 21.5 },
      { path: [1, 1, 1], est: 36 },
    ];
    TUTORIAL_HOUSES.forEach((d: HouseData, k) => {
      const g = grade(parseHouse(d), { maxTech: 1 });
      expect(g.ok).toBe(true);
      expect(g.path).toEqual(want[k]?.path);
      expect(g.grade?.estSeconds).toBe(want[k]?.est);
      expect(g.grade?.maxTech).toBe(1);
      expect(g.grade?.episodes).toBe(0);
    });
  });

  it('the grade adds the weights, counts the steps per technique and the episodes', () => {
    const g = grade(T4, { maxTech: 4 }).grade;
    expect(g).toEqual({
      d: 42,
      maxTech: 4,
      steps: 10,
      // 4 T1 + 2 T2 + 4 T4 + 14 empty cells (16 less the two bookshelves)
      estSeconds: 4 * 4 + 8 * 2 + 25 * 4 + 1.5 * 14,
      t: [4, 2, 0, 4],
      episodes: 1,
    });
    // the T3 fixture: two T3 steps of k = 2 weigh 6 each
    expect(grade(T3, { maxTech: 3 }).grade?.t).toEqual([4, 2, 2, 0]);
  });

  it('episodes count the maximal runs of non-T1 steps', () => {
    expect(episodesOf([])).toBe(0);
    expect(episodesOf([1, 1, 1])).toBe(0);
    expect(episodesOf([2, 1, 1])).toBe(1);
    expect(episodesOf([1, 2, 3, 1, 4, 1, 2])).toBe(3);
    expect(episodesOf([3, 3, 2, 2, 1, 1])).toBe(1);
  });

  it('places the givens first and never reports a contradiction as solved', () => {
    const h = parseHouse(TUTORIAL_HOUSES[0] as HouseData);
    const g = grade(h, { maxTech: 4 });
    expect(g.placed).toContain(0);
    const bad = parseHouse(
      fromRows({
        rooms: ['AB', 'AB'],
        objects: ['..', 'FF'],
        solution: [
          [0, 0],
          [0, 1],
        ],
      }),
    );
    const r = grade(bad, { maxTech: 4 });
    expect(r.ok).toBe(false);
    expect(r.grade).toBeNull();
  });
});
