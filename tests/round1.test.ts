import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseHouse } from '../src/core/house';
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
 * deductions ask for real insights, every object matters and no board is larger than 8 × 8.
 * Round 2 replaced round 1's rules for houses 4–24 with its ladder (tests/round2.test.ts, D81):
 * the insight rules below hold from house 25 and in every daily.
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

  it('two insight episodes in every house from 25 and in every daily', () => {
    const from25 = [...LEVELS.filter((h) => h.id >= CYCLE_START), ...DAILIES];
    expect(from25.filter((h) => h.insightEpisodes < INSIGHT_EPISODES).map(name)).toEqual([]);
    expect(from25).toHaveLength(LEVEL_COUNT - CYCLE_START + 1 + DAILIES.length);
  });

  it('two kinds of insight in every band that carries difficulty (cycle 1–9, manor, daily)', () => {
    const hard = GENERATED.filter((h) =>
      ['cycle-low', 'cycle-high', 'manor', 'daily'].includes(h.role),
    );
    expect(hard.filter((h) => kinds(h).length < INSIGHT_KINDS_HARD).map(name)).toEqual([]);
    expect(hard.length).toBeGreaterThan(1600);
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

describe('round 1 (b): boards', () => {
  it('no board above 8 × 8: not in the files, not in any band', () => {
    expect(GENERATED.filter((h) => h.n > SIDE_MAX).map(name)).toEqual([]);
    const sides = [
      DAILY_BAND,
      ...Array.from({ length: LEVEL_COUNT - 3 }, (_, k) => bandFor(k + 4)),
    ].flatMap((b) => b.sides);
    expect(Math.max(...sides)).toBe(SIDE_MAX);
    expect(LEVELS.filter((h) => h.role === 'manor').every((h) => h.n === SIDE_MAX)).toBe(true);
    expect(bandFor(CYCLE_START).sides).toEqual([7]);
  });
});

describe("turned houses carry no step names (A9, round 2; round 2's code audit, DÜŞÜK 8; D88)", () => {
  /** Every source file of the game outside the build pipeline (src/gen). */
  const GAME_SOURCES = ['core', 'data', 'dev', 'game', 'game/scenes', 'platform']
    .flatMap((dir) =>
      readdirSync(new URL(`../src/${dir}/`, import.meta.url))
        .filter((f) => f.endsWith('.ts'))
        .map((f) => `src/${dir}/${f}`),
    )
    .concat(['src/main.ts']);

  it('no game code reads the stored step names (insights, insightEpisodes)', () => {
    const readers = GAME_SOURCES.filter((f) =>
      /\binsights\b|insightEpisodes/.test(
        readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'),
      ),
    );
    expect(readers).toEqual([]);
    expect(GAME_SOURCES.length).toBeGreaterThan(30);
  });

  it("past house 1000 houseAt leaves the base house's step names out (a turn may name a step otherwise); up to 1000 they are the stored ones", () => {
    const named: number[] = [];
    for (let k = LEVEL_COUNT + 1; k <= LEVEL_COUNT + 3 * (LEVEL_COUNT - 505); k++) {
      const t = houseAt(LEVELS, k);
      if ('insights' in t || 'insightEpisodes' in t) named.push(k);
      expect(t.grade).toEqual(LEVELS[baseOf(k).id - 1]?.grade);
    }
    expect(named).toEqual([]);
    for (const k of [1, 500, LEVEL_COUNT]) {
      expect(houseAt(LEVELS, k)).toMatchObject({ insights: LEVELS[k - 1]?.insights });
    }
  });
});
