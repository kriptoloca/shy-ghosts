import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseHouse, type HouseModel } from '../src/core/house';
import {
  AP_FULL,
  apOpening,
  apProfile,
  freebie,
  openingOf,
  type ApOptions,
} from '../src/gen/autopilot';
import {
  eachLightNeeded,
  furnitureBetween,
  inShadow,
  lightNeeded,
  litLine,
  splitTwice,
  stableJson,
} from '../src/gen/build-levels';
import { TRIVIAL, grade } from '../src/gen/grade';
import { T1, T2, bandFor, type Tech } from '../src/gen/params';
import { withMeta, type House, type HouseMeta, type PlayHouse } from '../src/gen/record';

/**
 * Gate B tune round 2 (docs/gate-b-round2.md §1, D80–D82): the ladder of houses 4–24, measured by
 * the autopilot (src/gen/autopilot.ts). Every house 4–20 but the rest at 15 either teaches one new
 * pattern or rule, or opens with a real insight; no free opening after house 10 but house 17's
 * lesson; no two houses in a row open alike; the shelf, the count and the lamp come at 5, 7 and 8
 * (Gate A's A3/A5 positions as amended, D82). From house 25 the list is round 1's.
 */
const read = <T>(name: string): T =>
  JSON.parse(readFileSync(new URL(`../src/data/${name}`, import.meta.url), 'utf8')) as T;
const LEVELS = withMeta(read<PlayHouse[]>('levels.json'), read<HouseMeta[]>('levels-meta.json'));
const DAILY_PLAY = read<Record<string, PlayHouse>>('dailies.json');
const DAILY_META = read<Record<string, HouseMeta>>('dailies-meta.json');
const DAILIES: Record<string, House> = Object.fromEntries(
  Object.keys(DAILY_PLAY).map((date) => [
    date,
    withMeta([DAILY_PLAY[date] as PlayHouse], [DAILY_META[date] as HouseMeta])[0] as House,
  ]),
);
const level = (id: number): House => LEVELS[id - 1] as House;
const ids = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, k) => a + k);
const model = (h: House): HouseModel => parseHouse(h);
const techOf = (h: House): Tech => (h.role === 'tutorial' ? T1 : bandFor(h.id).maxTech);
const lamps = (h: House): number => [...h.objects].filter((o) => o === 'L').length;

/**
 * The autopilot's levels (§1.2), each knowing the patterns of the one before: the room with one
 * free cell, the claim, the budget over whole lines (Queens), over split lines, and leaving a
 * fully lit line out.
 */
const AP_LEVELS: readonly (readonly [string, ApOptions])[] = [
  ['single', { claims: false, budget: 'none' }],
  ['claim', { claims: true, budget: 'none' }],
  ['budget', { claims: true, budget: 'lines' }],
  ['split budget', { claims: true, budget: 'segments-litblind' }],
  ['lit-line budget', AP_FULL],
];
/** The rules, each proved by its test on the stored solution (§1.2). */
const RULES: readonly (readonly [string, (h: House, m: HouseModel) => boolean])[] = [
  ['shelf', (h) => h.objects.includes('F') && furnitureBetween(h.n, h.objects, h.solution)],
  ['light', (h, m) => h.objects.includes('L') && lightNeeded(m)],
  [
    'shadow',
    (h) => /F/.test(h.objects) && /L/.test(h.objects) && inShadow(h.n, h.objects, h.solution),
  ],
  ['two lamps', (h, m) => lamps(h) >= 2 && eachLightNeeded(m)],
  ['three in a line', (h, m) => splitTwice(h.n, m, h.solution)],
];

interface Measure {
  id: number;
  /** The first autopilot level that finishes the house, or 'insight' when none does. */
  needs: string;
  /** What the house shows that no house before it did: its autopilot level or a rule. */
  fresh: string[];
  /** Real insight episodes: stalls of the full autopilot only a count, cross or chain ends. */
  real: number;
  /** Ghosts the full autopilot places before its first stall. */
  opening: number;
}

/** The plan's measure (§1.2) over houses 1–24, in order. */
function measure(): Measure[] {
  const seen = new Set<string>();
  return ids(1, 24).map((id) => {
    const h = level(id);
    const m = model(h);
    const needs = AP_LEVELS.find(([, o]) => apOpening(m, o).solved)?.[0] ?? 'insight';
    const shown = [needs, ...RULES.filter(([, test]) => test(h, m)).map(([name]) => name)];
    const fresh = shown.filter((x) => !seen.has(x));
    for (const x of shown) seen.add(x);
    const p = apProfile(m, techOf(h), h.role === 'tutorial' ? 0 : bandFor(id).maxT4);
    return { id, needs, fresh, real: p.stalls.length, opening: p.opening };
  });
}

/** §1.3: the lesson of each teaching house. */
const LESSONS: Record<number, string> = {
  4: 'claim',
  5: 'shelf',
  6: 'split budget',
  8: 'light',
  10: 'shadow',
  16: 'three in a line',
  17: 'lit-line budget',
  18: 'two lamps',
};
/** §1.3: the houses that open with a real insight (the hard houses). */
const INSIGHT = [7, 9, 11, 12, 13, 14, 19, 20, 21, 22];

describe('round 2 (a): every house 4–20 teaches something or asks for a real insight', () => {
  const M = measure();
  const at = (id: number): Measure => M[id - 1] as Measure;
  const idle = (a: number, b: number): number[] =>
    ids(a, b).filter((id) => at(id).fresh.length === 0 && at(id).real === 0);

  it('houses 4–10: none is finished on autopilot with nothing new (round 2 played 5 of 7 so)', () => {
    expect(idle(4, 10)).toEqual([]);
  });

  it('houses 4–20: only the rest at 15 asks nothing; 8 ask for a real insight', () => {
    expect(idle(4, 20)).toEqual([15]);
    expect(ids(4, 20).filter((id) => at(id).real > 0)).toEqual([7, 9, 11, 12, 13, 14, 19, 20]);
  });

  it('each lesson house shows its new pattern or rule first (§1.3)', () => {
    for (const [id, lesson] of Object.entries(LESSONS)) {
      expect([Number(id), at(Number(id)).fresh]).toEqual([
        Number(id),
        expect.arrayContaining([lesson]),
      ]);
    }
  });

  it('every insight house stalls before its first ghost, and only a real insight moves it on', () => {
    for (const id of INSIGHT) expect([id, at(id).opening, at(id).real > 0]).toEqual([id, 0, true]);
  });

  it('the roles follow the ladder: hard where a real insight opens, teach for the lessons', () => {
    const roles = ids(4, 24).map((id) => [id, level(id).role, bandFor(id).role]);
    for (const [id, stored, band] of roles) expect([id, stored]).toEqual([id, band]);
    expect(ids(4, 24).filter((id) => level(id).role === 'hard')).toEqual(INSIGHT);
    expect(ids(4, 24).filter((id) => level(id).role === 'teach')).toEqual([4, 5, 6, 8, 10, 17, 18]);
    expect(ids(4, 24).filter((id) => level(id).role === 'breather')).toEqual([15, 16]);
    expect(ids(4, 24).filter((id) => level(id).role === 'rest')).toEqual([23, 24]);
  });

  it('the boards of §1.3: 5 × 5 lessons and rests, 6 × 6 counts, 7 × 7 at 20–22', () => {
    const sides = ids(4, 24).map((id) => level(id).n);
    expect(sides).toEqual([5, 5, 5, 6, 6, 6, 5, 6, 6, 6, 6, 5, 5, 6, 6, 6, 7, 7, 7, 6, 6]);
    expect(ids(4, 24).map((id) => bandFor(id).sides)).toEqual(sides.map((n) => [n]));
  });
});

describe('round 2 (a): how the houses open', () => {
  const opening = (id: number): string => openingOf(model(level(id)), techOf(level(id)));

  it('no two houses in a row open alike (houses 3–24)', () => {
    const same = ids(4, 24).filter((id) => opening(id) === opening(id - 1));
    expect(same).toEqual([]);
  });

  it('house 12 opens with a cross: one cell sees a whole room from two sides', () => {
    expect(opening(12)).toBe('cross');
  });

  it('no free opening in houses 11–24 but house 17 (its lesson, a line single)', () => {
    const free = ids(11, 24).filter((id) => freebie(model(level(id))));
    expect(free.filter((id) => id !== 17)).toEqual([]);
  });
});

describe('round 2 (a): the elements come earlier (Gate A A3/A5 as amended, D82)', () => {
  const first = (f: (h: House) => boolean): number | undefined => LEVELS.find(f)?.id;

  it('the shelf first at house 5, the first count (T3) at 7, the lamp first at 8', () => {
    expect(first((h) => h.objects.includes('F'))).toBe(5);
    expect(first((h) => h.grade.t[2] > 0)).toBe(7);
    expect(first((h) => h.objects.includes('L'))).toBe(8);
    for (const id of ids(4, 7)) expect(bandFor(id).lamps).toEqual([0, 0]);
    expect(bandFor(4).furniture).toEqual([0, 0]);
    expect(ids(4, 6).map((id) => bandFor(id).maxTech)).toEqual([2, 2, 2]);
  });

  it('residents only in houses 1–3, 5 and 8, always on solution cells', () => {
    expect(LEVELS.filter((h) => h.givens.length > 0).map((h) => h.id)).toEqual([1, 2, 3, 5, 8]);
    expect(Object.values(DAILIES).filter((h) => h.givens.length > 0)).toEqual([]);
    for (const h of LEVELS) for (const g of h.givens) expect(h.solution).toContain(g);
  });

  it("house 5's two residents stand in one line with the bookshelf between them", () => {
    const h = level(5);
    expect(h.givens).toHaveLength(2);
    expect(furnitureBetween(h.n, h.objects, h.givens)).toBe(true);
  });

  it("house 8's resident stands unlit beside the lamp's beam", () => {
    const h = level(8);
    const m = model(h);
    expect(h.givens).toHaveLength(1);
    const x = h.givens[0] as number;
    expect(m.lit[x]).toBe(false);
    const n = h.n;
    const near = [x - n, x + n, x % n > 0 ? x - 1 : -1, x % n < n - 1 ? x + 1 : -1];
    expect(near.some((y) => y >= 0 && y < n * n && m.lit[y] === true)).toBe(true);
  });
});

describe('round 2 (a): each lesson passes its own test', () => {
  it('4, the claim: its first step is T2 and every step a room lying in one line', () => {
    const g = grade(model(level(4)), { maxTech: T2 });
    expect(g.path[0]).toBe(T2);
    expect(g.insights.flat().every((i) => i === TRIVIAL)).toBe(true);
  });

  it('5, the shelf: two solution ghosts in one line with the bookshelf between them', () => {
    const h = level(5);
    expect(furnitureBetween(h.n, h.objects, h.solution)).toBe(true);
  });

  it('6, the split budget: counting whole lines cannot open it, counting split lines can', () => {
    const m = model(level(6));
    expect(apOpening(m, { claims: true, budget: 'lines' }).placed).toBe(0);
    expect(apOpening(m, { claims: true, budget: 'segments' }).placed).toBeGreaterThanOrEqual(1);
  });

  it('8, the light: needed as the player meets the house, and no solution ghost in a shadow', () => {
    const h = level(8);
    expect(lightNeeded(model(h))).toBe(true);
    expect(inShadow(h.n, h.objects, h.solution)).toBe(false);
  });

  it("10, the shadow: a solution ghost stands past a shelf in the lamp's line", () => {
    const h = level(10);
    expect(inShadow(h.n, h.objects, h.solution)).toBe(true);
  });

  it('16, three in a line: a line split twice holds three solution ghosts', () => {
    const h = level(16);
    expect(splitTwice(h.n, model(h), h.solution)).toBe(true);
  });

  it('17, the lit line: a line with no free cell; only the budget that leaves it out opens it', () => {
    const m = model(level(17));
    expect(litLine(m)).toBe(true);
    expect(apOpening(m, { claims: true, budget: 'segments-litblind' }).placed).toBe(0);
    expect(apOpening(m, AP_FULL).placed).toBeGreaterThanOrEqual(1);
  });

  it("18, two lamps: each lamp's light is needed", () => {
    const h = level(18);
    expect(lamps(h)).toBe(2);
    expect(eachLightNeeded(model(h))).toBe(true);
  });
});

describe("round 2: from house 25 the list is round 1's", () => {
  /** Round 1's houses 25–1000 and dailies (src/data at bfd2b96), as these digests. */
  const WAS = JSON.parse(
    readFileSync(new URL('./fixtures/round1-digests.json', import.meta.url), 'utf8'),
  ) as { levels: Record<string, string>; dailies: Record<string, string> };
  const digest = (h: House): string =>
    createHash('sha256').update(stableJson(h)).digest('hex').slice(0, 16);

  it('houses 25–1000 and the dailies are unchanged but daily 2027-10-02 (A9, D88)', () => {
    const late = LEVELS.filter((h) => h.id >= 25);
    const changed = [
      ...late.filter((h) => digest(h) !== WAS.levels[String(h.id)]).map((h) => String(h.id)),
      ...Object.keys(DAILIES).filter(
        (date) => digest(DAILIES[date] as House) !== WAS.dailies[date],
      ),
    ];
    expect(changed).toEqual(['2027-10-02']);
    expect([late.length, Object.keys(WAS.levels).length]).toEqual([976, 976]);
    expect(Object.keys(WAS.dailies)).toEqual(Object.keys(DAILIES));
  });
});
