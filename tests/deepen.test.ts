import { describe, expect, it } from 'vitest';
import { ROOM_ID_RADIX, ROOM_MIN_CELLS } from '../src/config';
import { canonicalIds, parseHouse, type HouseData } from '../src/core/house';
import {
  deepen,
  kindOf,
  missesOf,
  openerClass,
  patternOf,
  type Deepened,
  type DepthTarget,
  type Walk,
  type WalkTrace,
} from '../src/gen/deepen';
import { depthProfile } from '../src/gen/depth';
import { grade } from '../src/gen/grade';
import {
  DEEPEN_ABORT_AT,
  DEEPEN_SHELF_SHARE,
  DEEPEN_T0,
  DEEPEN_T1,
  ROOM_MAX_FACTOR,
  T3,
} from '../src/gen/params';
import { idleObjects } from '../src/gen/relevance';
import { solve } from '../src/gen/solve';
import { bandOf, candidateOf, played, type Played } from './support/round3';

/**
 * The deepening search (docs/gate-b-round3.md §"Tune round 3" §1.4; D94): simulated annealing
 * over a unique candidate's room borders and shelves until the house asks for the depth target.
 * The walks here are small (hundreds of evaluations, not the build's 6,000) and start from houses
 * round 3 played.
 */
const EVERY_OPENER = ['cross', 'count-2', 'count-3', 'count-4', 'budget', 'claim', 'free'];

/** A small target: one stall, any d, any opener. */
const SMALL: DepthTarget = {
  stalls: 1,
  laterAt: 1,
  tail: 4,
  auto: 4,
  dMin: 0,
  dMax: 99,
  needT3: false,
  kinds: 1,
  openers: EVERY_OPENER,
  banPattern: null,
};

const walk = (evals: number, abortAt: number): Walk => ({
  evals,
  t0: DEEPEN_T0,
  t1: DEEPEN_T1,
  shelfShare: DEEPEN_SHELF_SHARE,
  abortAt,
  lesson: null,
});

const run = (
  h: Played,
  seed: number,
  w: Walk,
  t: DepthTarget,
): { out: Deepened | null; trace: WalkTrace } => {
  const trace: WalkTrace = { evals: -1, end: 'spent' };
  const out = deepen(candidateOf(h), bandOf(h), seed, w, t, trace);
  return { out, trace };
};

/** The deepened house as the files store it. */
const stored = (d: Deepened): HouseData => ({
  n: d.c.n,
  rooms: d.c.rooms,
  objects: d.c.objects,
  givens: d.c.puzzle.givens,
  solution: d.c.solution,
});

const cellsOf = (s: string, ch: string): number[] =>
  [...s].flatMap((x, i) => (x === ch ? [i] : []));

/** Every room is one connected piece. */
function roomsConnected(h: HouseData): boolean {
  const n = h.n;
  const room = [...h.rooms];
  return [...new Set(room)].every((id) => {
    const cells = cellsOf(h.rooms, id);
    const seen = new Set([cells[0]]);
    const stack = [cells[0] as number];
    while (stack.length > 0) {
      const i = stack.pop() as number;
      const r = Math.floor(i / n);
      const c = i % n;
      const next = [r > 0 ? i - n : -1, c > 0 ? i - 1 : -1, c < n - 1 ? i + 1 : -1];
      next.push(r < n - 1 ? i + n : -1);
      for (const j of next) {
        if (j >= 0 && room[j] === id && !seen.has(j)) {
          seen.add(j);
          stack.push(j);
        }
      }
    }
    return seen.size === cells.length;
  });
}

/**
 * Two walks that move rooms and shelves: round 3's house 8 (a resident, a lamp, two shelves; no
 * stall at the start) to a first stall, and round 3's house 9 (a T3 house) to a later stall.
 */
const WALKS = [
  {
    name: 'house 8 to a first stall',
    h: played(8),
    seed: 3,
    w: walk(2000, 1),
    t: { ...SMALL, laterAt: 0, tail: 9, auto: 9 },
  },
  { name: 'house 9 to a later stall', h: played(9), seed: 2, w: walk(600, 1), t: SMALL },
] as const;

describe('the deepening search: what a walk keeps', () => {
  for (const { name, h, seed, w, t } of WALKS) {
    it(`${name}: meets the target, and the same seed gives the same house`, () => {
      const a = run(h, seed, w, t);
      expect(a.out).not.toBeNull();
      const d = a.out as Deepened;
      expect(missesOf(d.pr, d.g, t)).toEqual([]);
      expect(a.trace.end).toBe('met');
      // the walk moved something: rooms, and on these seeds a shelf too
      expect([d.c.rooms === h.rooms, d.c.objects === h.objects]).toEqual([false, false]);
      const b = run(h, seed, w, t);
      expect(b).toEqual(a);
      // another seed walks elsewhere
      expect(run(h, seed + 1, w, t).trace).not.toEqual(a.trace);
    });

    it(`${name}: the stored solution stays the only one`, () => {
      const d = run(h, seed, w, t).out as Deepened;
      const s = solve(parseHouse(stored(d)), { limit: 2 });
      expect(s.count).toBe(1);
      expect(s.solutions[0]).toEqual(d.c.solution);
      expect([...d.c.solution].sort((x, y) => x - y)).toEqual(
        [...h.solution].sort((x, y) => x - y),
      );
    });

    it(`${name}: rooms stay connected, with ≥ ${String(ROOM_MIN_CELLS)} cells and ≤ ${String(ROOM_MAX_FACTOR)} × the mean`, () => {
      const d = run(h, seed, w, t).out as Deepened;
      const house = stored(d);
      expect(roomsConnected(house)).toBe(true);
      const R = d.c.solution.length;
      const sizes = [...new Set(house.rooms)].map((id) => cellsOf(house.rooms, id).length);
      expect(sizes).toHaveLength(R);
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(ROOM_MIN_CELLS);
      expect(Math.max(...sizes)).toBeLessThanOrEqual((ROOM_MAX_FACTOR * house.n * house.n) / R);
    });

    it(`${name}: residents and lamps never move; shelves only move`, () => {
      const d = run(h, seed, w, t).out as Deepened;
      expect(d.c.puzzle.givens).toEqual(h.givens);
      expect(cellsOf(d.c.objects, 'L')).toEqual(cellsOf(h.objects, 'L'));
      expect(cellsOf(d.c.objects, 'F')).toHaveLength(cellsOf(h.objects, 'F').length);
      // a resident keeps its cell in its room: the solution still holds it
      for (const g of h.givens) expect(d.c.solution).toContain(g);
    });

    it(`${name}: graded in canonical ids, as the files store it`, () => {
      const d = run(h, seed, w, t).out as Deepened;
      const house = stored(d);
      const ids = [...house.rooms].map((x) => parseInt(x, ROOM_ID_RADIX));
      expect(canonicalIds(ids).ids).toEqual(ids);
      const p = parseHouse(house);
      expect(d.c.puzzle.roomOf).toEqual(p.roomOf);
      expect(d.g).toEqual(grade(p, bandOf(h)));
      expect(d.pr).toEqual(depthProfile(p, h.maxTech, bandOf(h).maxT4));
      // the house it returns has no idle object
      expect(idleObjects(p, house.solution, bandOf(h))).toEqual({ literal: [], rule: [] });
    });
  }

  it('the target binds: a T3 target is met with a T3 step in the grade', () => {
    const h = played(9);
    const t = { ...SMALL, needT3: true };
    const d = run(h, 2, walk(600, 1), t).out as Deepened;
    expect(missesOf(d.pr, d.g, t)).toEqual([]);
    expect(d.g.grade?.t[T3 - 1]).toBeGreaterThan(0);
  });
});

/**
 * The deepened house of round 3's house 9 (seed 2 above, written out) with one shelf more, on cell
 * 4: the literal test finds it idle, so the walk drops it before any random move.
 */
const DEEP_9: HouseData = {
  n: 6,
  rooms: '001111022111222233224536244536255533',
  objects: '..............F..............F.F....',
  givens: [],
  solution: [6, 2, 13, 16, 26, 33, 23],
};

describe('the deepening search: idle objects and the early stop', () => {
  it('an idle shelf is dropped while the house still meets the target', () => {
    const band = bandOf(played(9));
    const extra: HouseData = { ...DEEP_9, objects: `....F${DEEP_9.objects.slice(5)}` };
    const p = parseHouse(extra);
    // the house with the extra shelf meets the target, and the shelf is idle
    expect(missesOf(depthProfile(p, band.maxTech, band.maxT4), grade(p, band), SMALL)).toEqual([]);
    expect(idleObjects(p, extra.solution, band).literal).toEqual([4]);
    const trace: WalkTrace = { evals: -1, end: 'spent' };
    const d = deepen(candidateOf(extra), band, 5, walk(600, DEEPEN_ABORT_AT), SMALL, trace);
    expect(trace).toEqual({ evals: 1, end: 'met' });
    expect(d?.c.objects).toBe(DEEP_9.objects);
    expect(d?.c.rooms).toBe(DEEP_9.rooms);
  });

  it('a walk with no stall stops after the abort share of its evaluations, and returns nothing', () => {
    // round 3's house 10 (the shadow lesson, ≤ T2) does not stall at the start
    const h = played(10);
    expect(depthProfile(parseHouse(h), h.maxTech, bandOf(h).maxT4).stalls).toBe(0);
    const evals = 600;
    const { out, trace } = run(h, 1, walk(evals, DEEPEN_ABORT_AT), SMALL);
    expect(out).toBeNull();
    expect(trace.end).toBe('aborted');
    // it stops at the first evaluation past the share
    expect(trace.evals).toBe(Math.floor(DEEPEN_ABORT_AT * evals) + 1);
    // without the early stop the same walk spends its whole budget
    expect(run(h, 1, walk(evals, 1), SMALL).trace).toEqual({ evals, end: 'spent' });
  });

  it('a walk that starts on a stall never stops early', () => {
    // round 3's house 9 stalls once, at the opening
    const h = played(9);
    expect(depthProfile(parseHouse(h), h.maxTech, bandOf(h).maxT4).stalls).toBe(1);
    const t = { ...SMALL, laterAt: 6 };
    const evals = 300;
    expect(run(h, 1, walk(evals, DEEPEN_ABORT_AT), t).trace).toEqual({ evals, end: 'spent' });
  });
});

describe("the walk's names for kinds, openers and patterns", () => {
  it('a two-room count is one kind in rows and columns', () => {
    expect([
      kindOf('count-row-2'),
      kindOf('count-col-2'),
      kindOf('count-col-3'),
      kindOf('cross'),
    ]).toEqual(['count-2', 'count-2', 'count-3', 'cross']);
  });

  it("the opener class and the pattern of round 3's houses 7, 12 and 5", () => {
    const of = (id: number): [string, string] => {
      const h = played(id);
      const pr = depthProfile(parseHouse(h), h.maxTech, bandOf(h).maxT4);
      return [openerClass(pr), patternOf(pr)];
    };
    expect(of(7)).toEqual(['count-2', 'count-2']);
    expect(of(12)).toEqual(['cross', 'cross>count-2']);
    expect(of(5)).toEqual(['budget', '']);
  });
});
