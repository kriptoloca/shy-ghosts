import { describe, expect, it } from 'vitest';
import { parseHouse } from '../src/core/house';
import { depthProfile } from '../src/gen/depth';
import { T2 } from '../src/gen/params';
import type { PlayHouse } from '../src/gen/record';
import { bandOf, played, ROUND3, type Played } from './support/round3';

/**
 * The depth profile (Gate B tune round 3, docs/gate-b-round3.md §"Tune round 3" §1.1; D92): a
 * house played the way round 3's player did, cheapest deduction first, each placed ghost tagged
 * with the hardest step since the ghost before it, and the stalls marked where only a real
 * insight (a cross, a count, a chain) moves the solve on.
 */
const profile = (h: Played): ReturnType<typeof depthProfile> =>
  depthProfile(parseHouse(h), h.maxTech, bandOf(h).maxT4);

/** House 8 of the plan's prototype list (sg-gateB-r3/final-data): a cross after two ghosts. */
const PROTO_8: PlayHouse = {
  id: 8,
  n: 6,
  rooms: '012223011223041113045513044513055511',
  objects: '.....................L...F..........',
  givens: [10],
  solution: [24, 1, 10, 17, 26, 31],
};

describe('the depth profile: tags, stalls and the opener', () => {
  it('a count stall at the opening (round 3, house 7): one count, then five ghosts with no thought', () => {
    const p = profile(played(7));
    expect(p.tags).toEqual(['count', 'elim', 'elim', 'elim', 'elim', 'elim']);
    expect(p.real).toEqual([{ kind: 'count-row-2', at: 0 }]);
    expect([p.stalls, p.tail, p.longestAuto, p.think, p.opener]).toEqual([
      1,
      5,
      5,
      1,
      'count-row-2',
    ]);
  });

  it('a cross and a count in one stall (round 3, house 12): one stall, the cross opens', () => {
    const p = profile(played(12));
    expect(p.real).toEqual([
      { kind: 'cross', at: 0 },
      { kind: 'count-row-2', at: 0 },
    ]);
    expect([p.stalls, p.opener, p.tags[0]]).toEqual([1, 'cross', 'count']);
  });

  it('a cross stall after two ghosts (the prototype house 8): budget, budget, then the cross', () => {
    const p = depthProfile(parseHouse(PROTO_8), T2, 0);
    expect(p.tags).toEqual(['budget', 'budget', 'cross', 'elim', 'elim']);
    expect(p.real).toEqual([{ kind: 'cross', at: 2 }]);
    expect([p.stalls, p.tail, p.longestAuto, p.think, p.opener]).toEqual([1, 2, 2, 3, 'budget']);
  });

  it('a budget opener and no stall (round 3, house 5)', () => {
    const p = profile(played(5));
    expect(p.tags).toEqual(['budget', 'elim', 'elim', 'elim']);
    expect([p.stalls, p.tail, p.longestAuto, p.think, p.opener]).toEqual([0, 4, 3, 1, 'budget']);
    expect(p.solved).toBe(true);
  });

  it('a free opening: a room with one free cell before any deduction (round 3, house 31)', () => {
    const p = profile(played(31));
    expect(p.tags[0]).toBe('free');
    expect(p.opener).toBe('free');
    expect(p.stalls).toBe(0);
  });
});

describe('calibration on the list round 3 played (D92)', () => {
  it('no house 4–24 stalls twice, and every one ends on 4 or more ghosts with no thought', () => {
    const houses = ROUND3.filter((h) => h.id >= 4 && h.id <= 24);
    expect(houses).toHaveLength(21);
    const twice = houses.filter((h) => profile(h).stalls > 1).map((h) => h.id);
    const short = houses.filter((h) => profile(h).tail < 4).map((h) => h.id);
    expect([twice, short]).toEqual([[], []]);
    // every real insight came before the first ghost
    const late = houses.filter((h) => profile(h).real.some((r) => r.at > 0)).map((h) => h.id);
    expect(late).toEqual([]);
  });
});
