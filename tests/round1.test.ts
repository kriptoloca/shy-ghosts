import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseHouse, type HouseModel } from '../src/core/house';
import { furnitureBetween, trickOf } from '../src/gen/build-levels';
import { grade, insightEpisodes, insightKinds, type Insight } from '../src/gen/grade';
import {
  CYCLE_START,
  DAILY_BAND,
  INSIGHT_EPISODES,
  INSIGHT_KINDS_HARD,
  LEVEL_COUNT,
  SIDE_MAX,
  bandFor,
  type Band,
} from '../src/gen/params';
import {
  baseOf,
  houseAt,
  withMeta,
  type House,
  type HouseMeta,
  type PlayHouse,
} from '../src/gen/record';
import { objectsMatter } from '../src/gen/relevance';

/**
 * Gate B tune round 1 (docs/gate-b-round1.md §1, D67–D70), over every built house: the
 * deductions ask for real insights, every object matters, no board is larger than 8 × 8, and
 * the residents of houses 9 and 17 stand where their demonstrations need them. Gate A
 * (tests/gate-a.test.ts) is unchanged and still holds on the same files.
 */
const read = <T>(name: string): T =>
  JSON.parse(readFileSync(new URL(`../src/data/${name}`, import.meta.url), 'utf8')) as T;
const LEVELS = withMeta(read<PlayHouse[]>('levels.json'), read<HouseMeta[]>('levels-meta.json'));
const DAILY_PLAY = read<Record<string, PlayHouse>>('dailies.json');
const DAILY_META = read<Record<string, HouseMeta>>('dailies-meta.json');
const DAILIES = Object.keys(DAILY_PLAY).map(
  (date) => withMeta([DAILY_PLAY[date] as PlayHouse], [DAILY_META[date] as HouseMeta])[0] as House,
);
const GENERATED = [...LEVELS.filter((h) => h.role !== 'tutorial'), ...DAILIES];
const level = (id: number): House => LEVELS[id - 1] as House;
const kinds = (h: House): Insight[] => insightKinds(h.insights);
const bandOf = (h: House): Band => (h.role === 'daily' ? DAILY_BAND : bandFor(h.id));
const name = (h: House): string => `${h.role} ${String(h.id)}`;
const RELEVANCE_TIMEOUT_MS = 300_000;

describe('round 1 (a): real insights', () => {
  it('the stored insights are the grader’s, house by house', () => {
    const wrong = GENERATED.filter((h) => {
      const band = bandOf(h);
      const g = grade(parseHouse(h), { maxTech: band.maxTech, maxT4: band.maxT4 });
      return (
        JSON.stringify(g.insights) !== JSON.stringify(h.insights) ||
        insightEpisodes(g.insights) !== h.insightEpisodes
      );
    });
    expect(wrong.map(name)).toEqual([]);
  });

  it('two insight episodes in every house from 10 and in every daily', () => {
    const from10 = [...LEVELS.filter((h) => h.id >= 10), ...DAILIES];
    expect(from10.filter((h) => h.insightEpisodes < INSIGHT_EPISODES).map(name)).toEqual([]);
    expect(from10).toHaveLength(LEVEL_COUNT - 9 + DAILIES.length);
  });

  it('two kinds of insight in every band that carries difficulty (hard, cycle 1–9, manor, daily)', () => {
    const hard = GENERATED.filter((h) =>
      ['hard', 'cycle-low', 'cycle-high', 'manor', 'daily'].includes(h.role),
    );
    expect(hard.filter((h) => kinds(h).length < INSIGHT_KINDS_HARD).map(name)).toEqual([]);
    expect(hard.length).toBeGreaterThan(1600);
  });

  it('houses 4–8 teach shape, line, cross, line and cross, then another trick; 9 a real insight', () => {
    expect(
      level(4)
        .insights.flat()
        .every((i) => i === 'shape'),
    ).toBe(true);
    expect(level(4).insights.length).toBeGreaterThan(0);
    expect(kinds(level(5))).toContain('line');
    expect(kinds(level(6))).toContain('cross');
    expect(level(7).insightEpisodes).toBeGreaterThanOrEqual(2);
    expect(kinds(level(7))).toEqual(expect.arrayContaining(['line', 'cross']));
    expect(level(8).insightEpisodes).toBeGreaterThanOrEqual(2);
    expect(trickOf(level(8).insights, level(8).objects)).not.toEqual(
      trickOf(level(7).insights, level(7).objects),
    );
    for (const id of [5, 6, 7, 8, 9]) expect(level(id).insightEpisodes).toBeGreaterThan(0);
  });

  it('house 10 asks for a cross; consecutive teach houses (4–11, 17–19) never share a trick', () => {
    expect(kinds(level(10))).toContain('cross');
    const teach = [4, 5, 6, 7, 8, 9, 10, 11, 17, 18, 19];
    const same = teach
      .filter((id) => teach.includes(id - 1))
      .filter((id) => {
        const a = level(id - 1);
        const b = level(id);
        return trickOf(a.insights, a.objects).join() === trickOf(b.insights, b.objects).join();
      });
    expect(same).toEqual([]);
    expect(LEVELS.filter((h) => h.role === 'teach').map((h) => h.id)).toEqual(teach);
  });

  it('house 17 asks for a lamp-made line', () => {
    expect(kinds(level(17))).toContain('lamp');
  });

  it('past house 1000 every turned house still asks for its insights (1001–2485)', () => {
    const wrong: number[] = [];
    for (let k = LEVEL_COUNT + 1; k <= LEVEL_COUNT + 3 * (LEVEL_COUNT - 505); k++) {
      const band = bandFor(baseOf(k).id);
      const g = grade(parseHouse(houseAt(LEVELS, k)), { maxTech: band.maxTech, maxT4: band.maxT4 });
      if (
        insightEpisodes(g.insights) < band.insightEpisodes ||
        insightKinds(g.insights).length < band.insightKinds
      ) {
        wrong.push(k);
      }
    }
    expect(wrong).toEqual([]);
  });
});

describe('round 1 (a): every object matters', () => {
  it(
    'no block or lamp is idle by the literal test or by rule isolation (houses 4–1000, dailies)',
    () => {
      const withObjects = GENERATED.filter((h) => /[FL]/.test(h.objects));
      const idle = withObjects.filter((h) => {
        const band = bandOf(h);
        return !objectsMatter(parseHouse(h), h.solution, {
          maxTech: band.maxTech,
          maxT4: band.maxT4,
        });
      });
      expect(idle.map(name)).toEqual([]);
      expect(withObjects.length).toBeGreaterThan(1500);
    },
    RELEVANCE_TIMEOUT_MS,
  );
});

describe('round 1 (b): boards and residents', () => {
  it('no board above 8 × 8: not in the files, not in any band', () => {
    expect(GENERATED.filter((h) => h.n > SIDE_MAX).map(name)).toEqual([]);
    const sides = [
      DAILY_BAND,
      ...Array.from({ length: LEVEL_COUNT - 3 }, (_, k) => bandFor(k + 4)),
    ].flatMap((b) => b.sides);
    expect(Math.max(...sides)).toBe(SIDE_MAX);
    expect(LEVELS.filter((h) => h.role === 'manor').every((h) => h.n === SIDE_MAX)).toBe(true);
    expect(bandFor(10).sides).toEqual([6]);
    expect(bandFor(11).sides).toEqual([6]);
    expect(bandFor(CYCLE_START).sides).toEqual([7]);
  });

  it('residents only in houses 1–3, 9 and 17, always on solution cells', () => {
    expect(LEVELS.filter((h) => h.givens.length > 0).map((h) => h.id)).toEqual([1, 2, 3, 9, 17]);
    expect(DAILIES.filter((h) => h.givens.length > 0)).toEqual([]);
    for (const h of LEVELS) {
      for (const g of h.givens) expect(h.solution).toContain(g);
    }
  });

  it("house 9's two residents stand in one line with the bookshelf between them", () => {
    const h = level(9);
    expect(h.givens).toHaveLength(2);
    expect(furnitureBetween(h.n, h.objects, h.givens)).toBe(true);
  });

  it("house 17's resident stands unlit beside the lamp's beam", () => {
    const h = level(17);
    const m: HouseModel = parseHouse(h);
    expect(h.givens).toHaveLength(1);
    const x = h.givens[0] as number;
    expect(m.lit[x]).toBe(false);
    const n = h.n;
    const near = [x - n, x + n, x % n > 0 ? x - 1 : -1, x % n < n - 1 ? x + 1 : -1];
    expect(near.some((y) => y >= 0 && y < n * n && m.lit[y] === true)).toBe(true);
  });
});
