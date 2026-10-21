import { describe, expect, it } from 'vitest';
import { parseHouse, type HouseData } from '../src/core/house';
import { buildLevels, gradeTurns, report, windowYield } from '../src/gen/build-levels';
import { grade, insightEpisodes, type Grade } from '../src/gen/grade';
import {
  CYCLE_PERIOD,
  CYCLE_START,
  DAILY_BAND,
  LEVEL_COUNT,
  ROTATION_FROM,
  ROTATION_SPAN,
  TEACH_POOL,
  bandFor,
  cycleOf,
} from '../src/gen/params';
import { baseOf } from '../src/gen/record';

/**
 * The turn rule (D54): houses 501–1000 come back turned after house 1000 (D14), so each must
 * grade the same in all four quarter turns, and since Gate B's tune round 1 still ask for its
 * band's insights in every turn (D67). Three 6 × 6 breathers: the first build's house 629, whose
 * grade changes with a turn; house 508 of the round-1 build before this rule, whose grade stays
 * but a turn names its second stall a shape; and the house the build chose for place 629.
 */
const GRADE_TURNS: HouseData = {
  n: 6,
  rooms: '012222011122001332441332444455445555',
  objects: '...................F.......L.F......',
  givens: [],
  solution: [13, 8, 5, 22, 18, 35],
};
const INSIGHT_TURNS: HouseData = {
  n: 6,
  rooms: '012233011234002234002554066655667777',
  objects: '..............F..F..........F.......',
  givens: [],
  solution: [12, 1, 20, 16, 11, 29, 27, 34],
};
const GRADE_STAYS: HouseData = {
  n: 6,
  rooms: '001111022111222333442335677355677755',
  objects: '...F...............F....F...........',
  givens: [],
  solution: [1, 4, 8, 15, 18, 23, 30, 25],
};

function graded(h: HouseData, place: number): Grade {
  const band = bandFor(place);
  const g = grade(parseHouse(h), { maxTech: band.maxTech, maxT4: band.maxT4 });
  expect(g.ok).toBe(true);
  return g.grade as Grade;
}

describe('after house 1000 the list turns, keeping the cycle phase (D14 as amended, D56)', () => {
  it('house 1001 is house 506 at 90° (position 9, like 1001), 1495 is 1000, then the next turn', () => {
    expect(baseOf(1001)).toEqual({ id: 506, turns: 1 });
    expect(baseOf(1002)).toEqual({ id: 507, turns: 1 }); // a manor, as 1002 is position 10
    expect(baseOf(1495)).toEqual({ id: 1000, turns: 1 });
    expect(baseOf(1496)).toEqual({ id: 506, turns: 2 });
    expect(baseOf(1991)).toEqual({ id: 506, turns: 3 });
    expect(baseOf(2486)).toEqual({ id: 506, turns: 0 });
    expect(baseOf(2981)).toEqual({ id: 506, turns: 1 });
  });

  it('every house past 1000 has the cycle position its place gives: no seam breaks the cycle', () => {
    const wrong: number[] = [];
    for (let k = LEVEL_COUNT + 1; k <= LEVEL_COUNT + 9 * ROTATION_SPAN; k++) {
      const want = ((k - CYCLE_START) % CYCLE_PERIOD) + 1;
      if (cycleOf(baseOf(k).id)?.p !== want) wrong.push(k);
    }
    expect(wrong).toEqual([]);
    // so the breathers stay 11 houses apart across the seam: 992, 1003, 1014, …
    const breathers: number[] = [];
    for (let k = 980; k <= 1030; k++) {
      const id = k <= LEVEL_COUNT ? k : baseOf(k).id;
      if (bandFor(id).role === 'breather') breathers.push(k);
    }
    expect(breathers).toEqual([981, 992, 1003, 1014, 1025]);
  });
});

describe('the turn rule (D54)', () => {
  it('holds for the houses the list turns (506–1000) only, not for 4–505 or the dailies', () => {
    const turnable = (a: number, b: number): boolean[] =>
      Array.from({ length: b - a + 1 }, (_, k) => bandFor(a + k).turnable);
    expect(turnable(4, ROTATION_FROM - 1).every((t) => !t)).toBe(true);
    expect(turnable(ROTATION_FROM, LEVEL_COUNT).every((t) => t)).toBe(true);
    expect(DAILY_BAND.turnable).toBe(false);
  });

  it('refuses a house that grades the same in every turn but asks for fewer insights in one', () => {
    expect(gradeTurns(bandFor(508), INSIGHT_TURNS, graded(INSIGHT_TURNS, 508))).toBe(false);
  });

  it('refuses a house whose grade changes with a quarter turn', () => {
    expect(gradeTurns(bandFor(629), GRADE_TURNS, graded(GRADE_TURNS, 629))).toBe(false);
  });

  it('keeps a house that grades the same in every quarter turn', () => {
    expect(gradeTurns(bandFor(629), GRADE_STAYS, graded(GRADE_STAYS, 629))).toBe(true);
  });
});

describe('the build report (GENERATOR.md §8)', () => {
  const built = buildLevels({ upTo: 5, dailies: 1 });

  it('counts every candidate tried as a miss or a keeper', () => {
    expect(built.searches.map((s) => s.label)).toEqual(['house 4', 'house 5', 'daily 2026-11-01']);
    for (const s of built.searches) {
      const misses = Object.values(s.misses).reduce((a, b) => a + b, 0);
      expect(misses + s.kept).toBe(s.tried);
    }
    // house 4 keeps the lowest d among TEACH_POOL qualifying candidates; the others the first
    expect(built.searches.map((s) => s.kept)).toEqual([TEACH_POOL, 1, 1]);
  });

  it("records every house's insights, per episode, as the grader names them (D67)", () => {
    const all = [...built.levels, ...Object.values(built.dailies)];
    for (const h of all) {
      const band = h.role === 'tutorial' ? null : h.role === 'daily' ? DAILY_BAND : bandFor(h.id);
      const g = grade(
        parseHouse(h),
        band ? { maxTech: band.maxTech, maxT4: band.maxT4 } : { maxTech: 1 },
      );
      expect(h.insights).toEqual(g.insights);
      expect(h.insightEpisodes).toBe(insightEpisodes(g.insights));
    }
    expect(all.map((h) => h.insights.length)).toEqual(all.map((h) => h.grade.episodes));
  });

  it('prints one line per group, ending with the candidates per house and the d-window yield', () => {
    const lines = report(built);
    expect(lines[0]).toMatch(/\| candidates mean \| d-window yield$/);
    expect(lines.slice(1).map((l) => l.split(':')[0])).toEqual(['1–3 tutorial', '4–8', 'dailies']);
    expect(lines[1]).toMatch(/^1–3 tutorial: 3 \| .* \| – \| –$/);
    const houses = built.searches.slice(0, 2);
    const y = windowYield(houses);
    expect(y.generated).toBeGreaterThan(0);
    expect(y.inside).toBeGreaterThanOrEqual(TEACH_POOL + 1);
    const mean = (houses[0]!.tried + houses[1]!.tried) / 2;
    expect(lines[2]).toMatch(
      new RegExp(
        `^4–8: 2 \\| .* \\| ${mean.toFixed(1)} \\| ${(y.inside / y.generated).toFixed(2)}$`,
      ),
    );
  });
});
