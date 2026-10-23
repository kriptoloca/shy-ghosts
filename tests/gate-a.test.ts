import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { describe, expect, it } from 'vitest';
import { QUARTER_TURNS } from '../src/config';
import { parseHouse, rotate, type HouseModel } from '../src/core/house';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import { buildLevels, furnitureBetween, levelFiles, lightNeeded } from '../src/gen/build-levels';
import { dateRange } from '../src/gen/dates';
import { Grader, grade } from '../src/gen/grade';
import {
  DAILY_BAND,
  DAILY_FIRST,
  DAILY_LAST,
  ROTATION_FROM,
  ROTATION_SPAN,
  bandFor,
  cycleOf,
  type Band,
} from '../src/gen/params';
import { blindWin, exactWinRate } from '../src/gen/players';
import {
  baseOf,
  houseAt,
  withMeta,
  type House,
  type HouseMeta,
  type PlayHouse,
} from '../src/gen/record';
import { solve } from '../src/gen/solve';

/**
 * Gate A (GENERATOR.md §9, A1–A8; A9 is the auditor's): pure tests over every built house. The
 * thresholds are fixed (CLAUDE.md, the fun gate): none of the numbers below may move to make the
 * gate pass; only the windows in src/gen/params.ts and the generator's mechanics may. The
 * amendments are Hasan's: D82 (2026-10-21), the first shelf, count and lamp at houses 5, 7 and 8
 * (were 9, 12 and 17); D91 (2026-10-22), A6's ceilings for houses 8–24 (tune round 3's depth).
 * Every other threshold is unchanged.
 */
const read = (name: string): string =>
  readFileSync(new URL(`../src/data/${name}`, import.meta.url), 'utf8');
/** The four files of the build (D57): what the game plays, and what the build measured. */
const FILES = ['levels.json', 'dailies.json', 'levels-meta.json', 'dailies-meta.json'];
const TEXTS = Object.fromEntries(FILES.map((f) => [f, read(f)]));
const parse = <T>(name: string): T => JSON.parse(TEXTS[name] as string) as T;
const LEVELS = withMeta(parse<PlayHouse[]>('levels.json'), parse<HouseMeta[]>('levels-meta.json'));
const DAILY_PLAY = parse<Record<string, PlayHouse>>('dailies.json');
const DAILY_META = parse<Record<string, HouseMeta>>('dailies-meta.json');
const DAILIES: Record<string, House> = Object.fromEntries(
  Object.keys(DAILY_PLAY).map((date) => [
    date,
    withMeta([DAILY_PLAY[date] as PlayHouse], [DAILY_META[date] as HouseMeta])[0] as House,
  ]),
);
const DAILY_LIST = Object.values(DAILIES);
const ALL = [...LEVELS, ...DAILY_LIST];
const GENERATED = [...LEVELS.filter((h) => h.role !== 'tutorial'), ...DAILY_LIST];
const MODELS = new Map<House, HouseModel>(ALL.map((h) => [h, parseHouse(h)]));
const model = (h: House): HouseModel => MODELS.get(h) as HouseModel;
const level = (id: number): House => LEVELS[id - 1] as House;
const ids = (a: number, b: number): House[] => LEVELS.filter((h) => h.id >= a && h.id <= b);
const role = (r: House['role']): House[] => LEVELS.filter((h) => h.role === r);
/** Cycle breathers (position 11) only; houses 15–16 are breathers too but not in a cycle. */
const CYCLE_BREATHERS = LEVELS.filter((h) => h.role === 'breather' && cycleOf(h.id) !== null);
const MID_LATE = [...ids(12, 1000), ...DAILY_LIST];
const GATE_TIMEOUT_MS = 120_000;

function bandOf(h: House): Band | null {
  if (h.role === 'daily') return DAILY_BAND;
  if (h.role === 'tutorial') return null;
  return bandFor(h.id);
}
function median(values: readonly number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
}
const mean = (v: readonly number[]): number => v.reduce((a, b) => a + b, 0) / v.length;
const d = (hs: readonly House[]): number[] => hs.map((h) => h.grade.d);
const est = (hs: readonly House[]): number[] => hs.map((h) => h.grade.estSeconds);
const usesT3 = (h: House): boolean => h.grade.t[2] > 0;

describe('Gate A — A1 unique solutions', () => {
  it(
    'every house and every daily has exactly one solution, the stored one (1,792 of 1,792)',
    () => {
      const wrong = ALL.filter((h) => {
        const s = solve(model(h));
        return s.count !== 1 || s.solutions[0]?.join() !== h.solution.join();
      });
      expect(wrong.map((h) => `${h.role} ${String(h.id)}`)).toEqual([]);
      expect(ALL).toHaveLength(1792);
    },
    GATE_TIMEOUT_MS,
  );
});

describe('Gate A — A2 no guessing at any band', () => {
  it(
    'the grader finishes every house within its band and reproduces its stored grade',
    () => {
      const wrong = ALL.filter((h) => {
        const band = bandOf(h);
        const g = grade(
          model(h),
          band ? { maxTech: band.maxTech, maxT4: band.maxT4 } : { maxTech: 1 },
        );
        return !g.ok || !isDeepStrictEqual(g.grade, h.grade);
      });
      expect(wrong.map((h) => `${h.role} ${String(h.id)}`)).toEqual([]);
    },
    GATE_TIMEOUT_MS,
  );

  it('no T4 outside the manors, never more than one per manor', () => {
    expect(ALL.filter((h) => h.role !== 'manor' && h.grade.t[3] > 0)).toEqual([]);
    expect(role('manor').filter((h) => h.grade.t[3] > 1)).toEqual([]);
  });
});

describe('Gate A — A3 technique mix per band', () => {
  it('houses 1–3: T1 only; every generated house has a deduction episode', () => {
    expect(ids(1, 3).map((h) => h.grade.maxTech)).toEqual([1, 1, 1]);
    expect(GENERATED.filter((h) => h.grade.episodes < 1)).toEqual([]);
  });

  it('teach, rest and breather houses use T2 at most and need it (maxTech 2, 100 %)', () => {
    const easy = LEVELS.filter((h) => ['teach', 'rest', 'breather'].includes(h.role));
    expect(easy.filter((h) => h.grade.maxTech !== 2)).toEqual([]);
  });

  it('hard houses, cycle positions 4–9 and manors use T3 (100 %); no T3 before house 7 (D82)', () => {
    const tough = LEVELS.filter((h) => ['hard', 'cycle-high', 'manor'].includes(h.role));
    expect(tough.filter((h) => h.grade.maxTech < 3 || !usesT3(h))).toEqual([]);
    expect(ids(1, 6).filter(usesT3)).toEqual([]);
  });

  it('dailies: T3 at most, T3 in at least 40 %', () => {
    expect(DAILY_LIST.filter((h) => h.grade.maxTech > 3)).toEqual([]);
    expect(DAILY_LIST.filter(usesT3).length / DAILY_LIST.length).toBeGreaterThanOrEqual(0.4);
  });
});

describe('Gate A — A4 the deduction depth curve', () => {
  it('every d inside its window', () => {
    const out = GENERATED.filter((h) => {
      const band = bandOf(h) as Band;
      return h.grade.d < band.d[0] || h.grade.d > band.d[1];
    });
    expect(out.map((h) => h.id)).toEqual([]);
  });

  it('teach easy → test hard → rest, as band medians', () => {
    expect(median(d(ids(4, 8)))).toBeLessThan(median(d(ids(12, 14))));
    expect(median(d(ids(12, 14)))).toBeGreaterThan(median(d(ids(15, 16))));
    expect(median(d(ids(17, 19)))).toBeLessThan(median(d(ids(20, 22))));
    expect(median(d(ids(20, 22)))).toBeGreaterThan(median(d(ids(23, 24))));
  });

  it("each cycle's breather lies below its positions 4–9 median", () => {
    const wrong = CYCLE_BREATHERS.filter((b) => {
      const c = cycleOf(b.id)?.c;
      const high = role('cycle-high').filter((h) => cycleOf(h.id)?.c === c);
      return b.grade.d >= median(d(high));
    });
    expect(wrong.map((h) => h.id)).toEqual([]);
    expect(CYCLE_BREATHERS).toHaveLength(88);
  });

  it('the 10-house moving average: MA(50) ≥ 1.4 × MA(13), never 6 below its best over 13–50', () => {
    const ma = (i: number): number => mean(d(ids(i - 9, i)));
    expect(ma(50)).toBeGreaterThanOrEqual(1.4 * ma(13));
    let best = 0;
    for (let i = 13; i <= 50; i++) {
      best = Math.max(best, ma(i));
      expect(best - ma(i)).toBeLessThanOrEqual(6);
    }
  });

  it("every manor's d lies above every other house of its cycle (88 of 88)", () => {
    const manors = role('manor');
    const leading = manors.filter((m) => {
      const c = cycleOf(m.id)?.c;
      return LEVELS.filter((h) => h !== m && cycleOf(h.id)?.c === c).every(
        (h) => h.grade.d < m.grade.d,
      );
    });
    expect(leading).toHaveLength(88);
    expect(manors).toHaveLength(88);
  });

  it('rising per cycle to a cap: 0–2 < 4–6 < 8–10; every cycle from 10 within ±15 % of 10–87', () => {
    const cycle = (c: number): House[] => LEVELS.filter((h) => cycleOf(h.id)?.c === c);
    const span = (a: number, b: number): number =>
      mean(d(Array.from({ length: b - a + 1 }, (_, k) => cycle(a + k)).flat()));
    expect(span(0, 2)).toBeLessThan(span(4, 6));
    expect(span(4, 6)).toBeLessThan(span(8, 10));
    const ref = span(10, 87);
    const last = cycleOf(1000)?.c as number;
    for (let c = 10; c <= last; c++) {
      expect(Math.abs(mean(d(cycle(c))) - ref) / ref).toBeLessThanOrEqual(0.15);
    }
  });
});

describe('Gate A — A5 the tutorial teaches each rule in order', () => {
  it('houses 1–3 are the GDD §3.3 data, T1 only, one solution with the given (2, 4, 9 without)', () => {
    TUTORIAL_HOUSES.forEach((t, k) => {
      const h = level(k + 1);
      expect({
        n: h.n,
        rooms: h.rooms,
        objects: h.objects,
        givens: h.givens,
        solution: h.solution,
      }).toEqual(t);
      expect(h.grade.maxTech).toBe(1);
      expect(solve(model(h), { givens: false, limit: 100 }).count).toBe([2, 4, 9][k]);
    });
  });

  it("house 1: (0,1) lies in room B and in the given's row", () => {
    const h = model(level(1));
    expect(h.roomOf[1]).toBe(1);
    expect(Math.floor((h.givens[0] as number) / h.n)).toBe(0);
  });

  it("house 2: the given's row and column remove the candidates the two T1 steps need", () => {
    const h = model(level(2)); // ABB / ABB / CCC, given (0,1)
    const g = new Grader(h);
    // T0 of the given: (0,0) by its row, (2,1) by its column
    expect([g.cand[0], g.cand[7]]).toEqual([0, 0]);
    expect(g.step(1)).toMatchObject({ tech: 1, placed: 3 }); // room A: (1,0), its last cell
    expect(g.step(1)).toMatchObject({ tech: 1, placed: 8 }); // room C: (2,2)
  });

  it('house 3: three T1 steps, the first enabled by the given, each later one by the ghost before it', () => {
    const h = model(level(3));
    const path = grade(h, { maxTech: 1 });
    expect(path.path).toEqual([1, 1, 1]);
    // replay on a board of candidates: the given, then the three placements in grader order
    const order = new Grader(h);
    const placed: number[] = [];
    for (let k = 0; k < 3; k++) placed.push((order.step(1) as { placed: number }).placed);
    const cand = h.candidate.map((c) => (c ? 1 : 0));
    const count = (room: number): number =>
      (h.roomCells[room] ?? []).reduce((a, c) => a + (cand[c] as number), 0);
    const land = (g: number): void => {
      for (const c of h.sees[g] ?? []) cand[c] = 0;
      for (const c of h.roomCells[h.roomOf[g] as number] ?? []) cand[c] = 0;
    };
    const enablers = [h.givens[0] as number, ...placed.slice(0, 2)];
    placed.forEach((cell, k) => {
      const room = h.roomOf[cell] as number;
      expect(count(room)).toBeGreaterThan(1); // not forced before its enabler lands
      land(enablers[k] as number);
      expect(count(room)).toBe(1); // forced right after it
    });
  });

  it('house 4: no given, furniture or lamp; its first step is T2', () => {
    const h = level(4);
    expect(h.givens).toEqual([]);
    expect(h.objects).not.toMatch(/[FL]/);
    expect(grade(model(h), { maxTech: 2 }).path[0]).toBe(2);
  });

  it('no furniture before house 5; house 5 sets two ghosts in one line with furniture between (D82)', () => {
    expect(ids(1, 4).filter((h) => h.objects.includes('F'))).toEqual([]);
    const h = level(5);
    expect(furnitureBetween(h.n, h.objects, h.solution)).toBe(true);
  });

  it("no lamp before house 8; house 8's light is necessary (as furniture: ≥ 2 solutions; D82)", () => {
    expect(ids(1, 7).filter((h) => h.objects.includes('L'))).toEqual([]);
    expect(lightNeeded(model(level(8)))).toBe(true);
  });

  it('the first T3 at house 7 (D82); no T4 before house 34', () => {
    expect(LEVELS.find(usesT3)?.id).toBe(7);
    expect(ids(1, 33).filter((h) => h.grade.t[3] > 0)).toEqual([]);
  });
});

describe('Gate A — A6 estimated solve time per band (estSeconds)', () => {
  const ceilings: [string, House[], number][] = [
    // Gate B tune round 3 (D91, Hasan): the ceilings of houses 8–24 rise to the prototype's
    // medians + 5 s, rounded up to 5 s; 4–7 keep 4–11's old ceiling
    ['4–7', ids(4, 7), 90],
    ['8–11', ids(8, 11), 135],
    ['12–14', ids(12, 14), 150],
    ['15–16', ids(15, 16), 135],
    ['17–19', ids(17, 19), 150],
    ['20–22', ids(20, 22), 165],
    ['23–24', ids(23, 24), 135],
    ['cycle positions 1–3', role('cycle-low'), 150],
    ['cycle positions 4–9', role('cycle-high'), 200],
    ['manors', role('manor'), 300],
    ['cycle breathers', CYCLE_BREATHERS, 100],
  ];
  it.each(ceilings)('%s: median ≤ its ceiling', (_name, hs, ceiling) => {
    expect(median(est(hs))).toBeLessThanOrEqual(ceiling);
  });

  it('dailies: median between 120 and 200 s; every house 1–7 ≤ 130 s and 8–16 ≤ 155 s (D91)', () => {
    const m = median(est(DAILY_LIST));
    expect(m).toBeGreaterThanOrEqual(120);
    expect(m).toBeLessThanOrEqual(200);
    expect(ids(1, 7).filter((h) => h.grade.estSeconds > 130)).toEqual([]);
    expect(ids(8, 16).filter((h) => h.grade.estSeconds > 155)).toEqual([]);
  });
});

describe('Gate A — A7 a naive player fails most mid and late houses', () => {
  it('naive ≤ 0.35 on every hard house, cycle position 1–9 and daily; ≤ 0.25 on every manor', () => {
    const capped = [...role('hard'), ...role('cycle-low'), ...role('cycle-high'), ...DAILY_LIST];
    expect(capped.filter((h) => h.players.naive > 0.35).map((h) => h.id)).toEqual([]);
    expect(
      role('manor')
        .filter((h) => h.players.naive > 0.25)
        .map((h) => h.id),
    ).toEqual([]);
  });

  it('over houses 12–1000 and the dailies: mean naive ≤ 0.25, naive < 0.5 on ≥ 90 %', () => {
    expect(MID_LATE).toHaveLength(1781);
    const naive = MID_LATE.map((h) => h.players.naive);
    expect(mean(naive)).toBeLessThanOrEqual(0.25);
    expect(naive.filter((x) => x < 0.5).length / naive.length).toBeGreaterThanOrEqual(0.9);
  });

  it('shallow ≤ 0.60 on every house whose grade uses T3, mean ≤ 0.40 over them', () => {
    const t3 = ALL.filter(usesT3);
    expect(t3.filter((h) => h.players.shallow > 0.6).map((h) => h.id)).toEqual([]);
    expect(mean(t3.map((h) => h.players.shallow))).toBeLessThanOrEqual(0.4);
  });

  it('blind ≤ 0.01 on every generated house', () => {
    expect(GENERATED.filter((h) => blindWin(model(h)) > 0.01).map((h) => h.id)).toEqual([]);
  });

  it(
    'the stored win rates are the exact ones, re-measured on all 1,792 houses (D55)',
    () => {
      const wrong = ALL.filter(
        (h) =>
          exactWinRate(model(h), 'naive') !== h.players.naive ||
          exactWinRate(model(h), 'shallow') !== h.players.shallow,
      );
      expect(wrong.map((h) => `${h.role} ${String(h.id)}`)).toEqual([]);
    },
    GATE_TIMEOUT_MS,
  );
});

describe('Gate A — A8 reproducible', () => {
  it('the four files are in the canonical byte form (one house per line, sorted keys)', () => {
    expect(levelFiles({ levels: LEVELS, dailies: DAILIES })).toEqual(TEXTS);
  });

  it('1,000 houses in order; 792 dailies on the UTC dates 2026-11-01 … 2028-12-31', () => {
    expect(LEVELS.map((h) => h.id)).toEqual(Array.from({ length: 1000 }, (_, k) => k + 1));
    const dates = dateRange(DAILY_FIRST, DAILY_LAST);
    expect(Object.keys(DAILIES)).toEqual(dates);
    expect(dates).toHaveLength(792);
    expect(DAILY_LIST.map((h) => h.id)).toEqual(Array.from({ length: 792 }, (_, k) => k + 1));
  });

  it(
    'the same seeds give the same houses: houses 1–36 and the first 3 dailies rebuilt byte for byte',
    () => {
      const again = buildLevels({ upTo: 36, dailies: 3 });
      const first = Object.fromEntries(Object.entries(DAILIES).slice(0, 3));
      expect(levelFiles(again)).toEqual(
        levelFiles({ levels: LEVELS.slice(0, 36), dailies: first }),
      );
    },
    GATE_TIMEOUT_MS,
  );

  it('after house 1000 the list turns: houses 1001–1010 are 506–515 at 90° (D56), one solution, same grade', () => {
    for (let k = 1001; k <= 1010; k++) {
      const turned = houseAt(LEVELS, k);
      const base = level(k - (LEVELS.length + 1) + ROTATION_FROM);
      expect(baseOf(k)).toEqual({ id: base.id, turns: 1 });
      const band = bandFor(base.id);
      const m = parseHouse(turned);
      const s = solve(m);
      expect(s.count).toBe(1);
      expect(s.solutions[0]).toEqual(turned.solution);
      const g = grade(m, { maxTech: band.maxTech, maxT4: band.maxT4 });
      expect(g.ok).toBe(true);
      expect(g.grade).toEqual(base.grade);
      expect(turned).toMatchObject({
        id: k,
        ...rotate(base, 1),
        grade: base.grade,
        role: base.role,
      });
    }
  });

  it(
    'houses 506–1000 keep one solution and their grade in every quarter turn (1001–2485, D54)',
    () => {
      const wrong: number[] = [];
      const turns = QUARTER_TURNS - 1;
      for (let k = LEVELS.length + 1; k <= LEVELS.length + turns * ROTATION_SPAN; k++) {
        const turned = houseAt(LEVELS, k);
        const base = level(baseOf(k).id);
        const band = bandFor(base.id);
        const m = parseHouse(turned);
        const s = solve(m);
        const g = grade(m, { maxTech: band.maxTech, maxT4: band.maxT4 });
        const same =
          s.count === 1 &&
          s.solutions[0]?.join() === turned.solution.join() &&
          g.ok &&
          isDeepStrictEqual(g.grade, base.grade);
        if (!same) wrong.push(k);
      }
      expect(wrong).toEqual([]);
    },
    GATE_TIMEOUT_MS,
  );
});
