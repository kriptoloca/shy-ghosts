import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lightDemoCell, parseHouse } from '../src/core/house';
import { AP_FULL, apOpening } from '../src/gen/autopilot';
import {
  buildLevels,
  eachLightNeeded,
  furnitureBetween,
  inShadow,
  lightNeeded,
  litLine,
  listJson,
  splitTwice,
} from '../src/gen/build-levels';
import { kindOf, openerClass, patternOf } from '../src/gen/deepen';
import { depthProfile, type DepthProfile } from '../src/gen/depth';
import { LADDER_STARTS, OPENER_MEMORY, T3, bandFor } from '../src/gen/params';
import {
  metaOf,
  playOf,
  withMeta,
  type House,
  type HouseMeta,
  type PlayHouse,
} from '../src/gen/record';

/**
 * Gate B tune round 3 (docs/gate-b-round3.md §"Tune round 3" §1.5; D91–D96): from house 8 every
 * house asks for real insights spread through the solve, found by the deepening search
 * (src/gen/deepen.ts) and measured by the depth profile (src/gen/depth.ts). It replaces round 2's
 * ladder tests; from house 25 the list is round 3's, byte for byte.
 */
const text = (name: string): string =>
  readFileSync(new URL(`../src/data/${name}`, import.meta.url), 'utf8');
const LEVELS = withMeta(
  JSON.parse(text('levels.json')) as PlayHouse[],
  JSON.parse(text('levels-meta.json')) as HouseMeta[],
);
const level = (id: number): House => LEVELS[id - 1] as House;
const ids = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, k) => a + k);
const PROFILES = new Map<number, DepthProfile>(
  ids(4, 24).map((id) => {
    const band = bandFor(id);
    return [id, depthProfile(parseHouse(level(id)), band.maxTech, band.maxT4)];
  }),
);
const profile = (id: number): DepthProfile => PROFILES.get(id) as DepthProfile;
const kinds = (id: number): Set<string> => new Set(profile(id).real.map((r) => kindOf(r.kind)));
const lamps = (h: House): number => [...h.objects].filter((o) => o === 'L').length;

/** The hard houses of the ladder (T3 required), the teaching houses and the rest (§1.5). */
const HARD = [9, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 24];
const TEACH = [8, 10, 16];
const REST = [23];
/** Three stalls (§1.5): houses 13–14 and 17–22. */
const THREE_STALLS = [13, 14, 17, 18, 19, 20, 21, 22];
/** Building houses 1–10 with every ladder search from k = 0 takes about 15 s on one core. */
const STARTS_TIMEOUT_MS = 180_000;

describe('round 3: depth (houses 8–24)', () => {
  it('houses 9–24 stall at least twice, and 13, 14 and 17–22 three times', () => {
    const stalls = ids(9, 24).map((id) => [id, profile(id).stalls]);
    expect(stalls.filter(([, s]) => (s as number) < 2)).toEqual([]);
    expect(THREE_STALLS.filter((id) => profile(id).stalls < 3)).toEqual([]);
  });

  it('every house 9–24 has a real step after two ghosts or more', () => {
    expect(ids(9, 24).filter((id) => !profile(id).real.some((r) => r.at >= 2))).toEqual([]);
  });

  it('houses 8–24: at most 3 ghosts after the last real step, and at most 3 in a row with no thought', () => {
    expect(ids(8, 24).filter((id) => profile(id).tail > 3)).toEqual([]);
    expect(ids(8, 24).filter((id) => profile(id).longestAuto > 3)).toEqual([]);
    expect(ids(8, 24).filter((id) => !profile(id).solved)).toEqual([]);
  });

  it('the hard houses use two kinds of real insight (a cross, a count of 2, 3 or 4 rooms)', () => {
    expect(HARD.filter((id) => kinds(id).size < 2)).toEqual([]);
    expect(HARD.filter((id) => level(id).grade.t[T3 - 1] === 0)).toEqual([]);
  });

  it('house 8, the first lamp, stalls once, after its first ghost', () => {
    const p = profile(8);
    expect(p.stalls).toBe(1);
    expect(p.real.length).toBeGreaterThan(0);
    expect(p.real.filter((r) => r.at < 1)).toEqual([]);
  });

  it('the roles follow the ladder: hard, teach (8, 10, 16) and rest (23)', () => {
    for (const id of ids(4, 24)) expect([id, level(id).role]).toEqual([id, bandFor(id).role]);
    const of = (role: string): number[] => ids(8, 24).filter((id) => level(id).role === role);
    expect([of('hard'), of('teach'), of('rest')]).toEqual([HARD, TEACH, REST]);
  });

  it('the boards: 5 × 5 at 4–6, 6 × 6 at 7–8 and 7 × 7 at 9–24; none smaller than the one before', () => {
    const sides = ids(4, 24).map((id) => level(id).n);
    expect(sides).toEqual([5, 5, 5, 6, 6, ...ids(9, 24).map(() => 7)]);
    expect(ids(4, 24).map((id) => bandFor(id).sides)).toEqual(sides.map((n) => [n]));
  });
});

describe('round 3: openers and patterns', () => {
  const opener = (id: number): string => openerClass(profile(id));

  it('each opener differs from those of the two houses before it (from house 8)', () => {
    const same = ids(9, 24).filter((id) =>
      ids(Math.max(8, id - OPENER_MEMORY), id - 1).some((j) => opener(j) === opener(id)),
    );
    expect(same).toEqual([]);
    expect(OPENER_MEMORY).toBe(2);
  });

  it('a two-room count opens one house of the ladder (and the count lesson, house 7)', () => {
    const count2 = ids(4, 24).filter((id) =>
      profile(id).real.some((r) => r.at === 0 && kindOf(r.kind) === 'count-2'),
    );
    expect(count2).toEqual([7, 9]);
  });

  it('no house 9–24 repeats the pattern of real insights of the house before it', () => {
    expect(
      ids(9, 24).filter((id) => patternOf(profile(id)) === patternOf(profile(id - 1))),
    ).toEqual([]);
  });

  it("every house 8–24 opens in its rung's classes and none with a free cell; 17 by the budget (D95; round 3's code audit, DÜŞÜK 4)", () => {
    const outside = ids(8, 24).filter((id) => {
      const allowed = bandFor(id).depth?.openers ?? [];
      return !allowed.includes(opener(id)) || opener(id) === 'free';
    });
    expect(outside).toEqual([]);
    expect(opener(17)).toBe('budget');
    expect(bandFor(17).depth?.openers).toEqual(['budget']);
  });
});

describe('round 3: the lessons', () => {
  it('each lesson passes its test: 5, 7, 8, 10, 16, 17 and 18', () => {
    const h = level;
    const m = (id: number): ReturnType<typeof parseHouse> => parseHouse(level(id));
    // 5: the shelf between two solution ghosts in one line
    expect(furnitureBetween(h(5).n, h(5).objects, h(5).solution)).toBe(true);
    // 7: the first count, at the opening
    expect(h(7).grade.t[T3 - 1]).toBeGreaterThan(0);
    expect([profile(7).real[0]?.kind.startsWith('count-'), profile(7).real[0]?.at]).toEqual([
      true,
      0,
    ]);
    // 8: the light, needed as the player meets the house, and no solution ghost in a shadow
    expect([lightNeeded(m(8)), inShadow(h(8).n, h(8).objects, h(8).solution)]).toEqual([
      true,
      false,
    ]);
    // 10: a solution ghost past a shelf in the lamp's line
    expect(inShadow(h(10).n, h(10).objects, h(10).solution)).toBe(true);
    // 16: a line split twice holds three solution ghosts
    expect(splitTwice(h(16).n, m(16), h(16).solution)).toBe(true);
    // 17: a line with no free cell, and only the budget that leaves it out opens the house
    expect(litLine(m(17))).toBe(true);
    expect(apOpening(m(17), { claims: true, budget: 'segments-litblind' }).placed).toBe(0);
    expect(apOpening(m(17), AP_FULL).placed).toBeGreaterThanOrEqual(1);
    // 18: two lamps, each needed
    expect([lamps(h(18)), eachLightNeeded(m(18))]).toEqual([2, true]);
  });

  it("house 8's demonstration: a lit cell no resident sees, diagonal to the resident (D103)", () => {
    const h = level(8);
    expect(h.givens).toEqual([10]);
    expect(lightDemoCell(parseHouse(h), h.givens, h.solution)).toEqual({ cell: 3, from: 10 });
  });

  it('each rule shows first at its lesson: shelf 5, count 7, lamp 8, shadow 10, three in a line 16, two lamps 18', () => {
    const first = (f: (h: House) => boolean): number | undefined => LEVELS.find(f)?.id;
    expect(first((h) => h.objects.includes('F'))).toBe(5);
    expect(first((h) => (h.grade.t[T3 - 1] ?? 0) > 0)).toBe(7);
    expect(first((h) => h.objects.includes('L'))).toBe(8);
    expect(first((h) => /L/.test(h.objects) && inShadow(h.n, h.objects, h.solution))).toBe(10);
    expect(first((h) => splitTwice(h.n, parseHouse(h), h.solution))).toBe(16);
    expect(first((h) => lamps(h) >= 2)).toBe(18);
  });
});

/** A list file's lines, one house each, without the commas. */
function listLines(t: string): string[] {
  const lines = t.split('\n');
  expect([lines[0], lines.at(-2), lines.at(-1)]).toEqual(['[', ']', '']);
  return lines.slice(1, -2).map((l) => (l.endsWith(',') ? l.slice(0, -1) : l));
}
/** A date file's lines by date, without the commas. */
function dateLines(t: string): Record<string, string> {
  const lines = t.split('\n');
  expect([lines[0], lines.at(-2), lines.at(-1)]).toEqual(['{', '}', '']);
  return Object.fromEntries(
    lines.slice(1, -2).map((l) => {
      const x = l.endsWith(',') ? l.slice(0, -1) : l;
      const at = x.indexOf(':');
      return [JSON.parse(x.slice(0, at)) as string, x.slice(at + 1)];
    }),
  );
}
const digest = (play: string, meta: string): string =>
  createHash('sha256').update(`${play}\n${meta}`).digest('hex').slice(0, 16);

describe('round 3: the files', () => {
  const play = listLines(text('levels.json'));
  const meta = listLines(text('levels-meta.json'));

  it("houses 8–24 are the plan's prototype's, byte for byte", () => {
    /** The prototype's houses 8–24 (sg-gateB-r3/final-data): the lines of both files. */
    const PROTO = JSON.parse(
      readFileSync(new URL('./fixtures/round3-ladder.json', import.meta.url), 'utf8'),
    ) as { levels: Record<string, string>; meta: Record<string, string> };
    const differ = ids(8, 24).filter(
      (id) => play[id - 1] !== PROTO.levels[id] || meta[id - 1] !== PROTO.meta[id],
    );
    expect(differ).toEqual([]);
    expect(Object.keys(PROTO.levels)).toEqual(ids(8, 24).map(String));
  });

  it("houses 1–7 and 25–1000 and the dailies are round 3's, byte for byte", () => {
    /** Round 3's files (src/data at 431eb44): a digest of each house's two lines. */
    const WAS = JSON.parse(
      readFileSync(new URL('./fixtures/round3-digests.json', import.meta.url), 'utf8'),
    ) as { levels: Record<string, string>; dailies: Record<string, string> };
    const kept = [...ids(1, 7), ...ids(25, 1000)];
    expect(Object.keys(WAS.levels).map(Number)).toEqual(kept);
    expect(play).toHaveLength(1000);
    const changed = kept.filter(
      (id) => digest(play[id - 1] as string, meta[id - 1] as string) !== WAS.levels[id],
    );
    expect(changed).toEqual([]);
    const dPlay = dateLines(text('dailies.json'));
    const dMeta = dateLines(text('dailies-meta.json'));
    expect(Object.keys(dPlay)).toEqual(Object.keys(WAS.dailies));
    const days = Object.keys(dPlay).filter(
      (date) => digest(dPlay[date] as string, dMeta[date] as string) !== WAS.dailies[date],
    );
    expect(days).toEqual([]);
  });

  it(
    '`levels:starts` finds the starts of houses 8–10 again, searching each from k = 0',
    () => {
      expect([LADDER_STARTS[8], LADDER_STARTS[9], LADDER_STARTS[10]]).toEqual([157, 256, 256]);
      const built = buildLevels({ upTo: 10, dailies: 0, starts: {} });
      const searches = ids(8, 10).map((id) =>
        built.searches.find((s) => s.label === `house ${String(id)}`),
      );
      expect(searches.map((s) => s?.chosen)).toEqual([
        LADDER_STARTS[8],
        LADDER_STARTS[9],
        LADDER_STARTS[10],
      ]);
      // from k = 0: every candidate before the chosen one missed a window
      for (const s of searches) {
        const missed = Object.values(s?.misses ?? {}).reduce((a, b) => a + b, 0);
        expect([s?.tried, missed + (s?.kept ?? 0)]).toEqual([(s?.chosen ?? 0) + 1, s?.tried]);
      }
      // the same houses as the files hold
      const got = built.levels.filter((h) => h.id >= 8);
      expect(listJson(got.map(playOf))).toBe(listJson(ids(8, 10).map((id) => playOf(level(id)))));
      expect(listJson(got.map(metaOf))).toBe(listJson(ids(8, 10).map((id) => metaOf(level(id)))));
    },
    STARTS_TIMEOUT_MS,
  );

  it(
    "the start table (D96): every house 8–24 is the first qualifying candidate at its start, so a start past it would choose another house (the A9 re-run's DÜŞÜK)",
    () => {
      const built = buildLevels({ upTo: 24, dailies: 0 });
      const chosen = ids(8, 24).map(
        (id) => built.searches.find((s) => s.label === `house ${String(id)}`)?.chosen,
      );
      expect(chosen).toEqual(ids(8, 24).map((id) => LADDER_STARTS[id]));
      // and the houses are the files'
      const got = built.levels.filter((h) => h.id >= 8);
      expect(listJson(got.map(playOf))).toBe(listJson(ids(8, 24).map((id) => playOf(level(id)))));
    },
    STARTS_TIMEOUT_MS,
  );
});
