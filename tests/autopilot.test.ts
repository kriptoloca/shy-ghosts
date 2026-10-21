import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRows, parseHouse, type HouseModel } from '../src/core/house';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import {
  AP_FULL,
  Autopilot,
  apOpening,
  apProfile,
  freebie,
  openingOf,
  type ApOptions,
} from '../src/gen/autopilot';
import type { Tech } from '../src/gen/params';
import type { PlayHouse } from '../src/gen/record';
import { rowsHouse } from './support/houses';

/**
 * The autopilot (GENERATOR.md §4.7; Gate B tune round 2, docs/gate-b-round2.md §1.1): a bot that
 * plays only the one-look patterns a Queens or Star Battle player uses without stopping to think,
 * and stalls where a real insight (a count, a cross, a chain) is needed. Its measures decide which
 * houses teach something or ask for a real insight (§1.2). Calibrated on the list round 2 played:
 * it finishes houses 4–20 except 13 and 20, the two its player had to stop and count.
 */
type RC = readonly [number, number];
const at = (h: HouseModel, [r, c]: RC): number => r * h.n + c;
const rows = (rooms: string[], objects?: string[], givens: RC[] = []): HouseModel =>
  parseHouse(rowsHouse(rooms, objects, givens));
const tutorial = (k: number): HouseModel =>
  parseHouse(TUTORIAL_HOUSES[k] as (typeof TUTORIAL_HOUSES)[number]);
const play = (h: PlayHouse): HouseModel => parseHouse(h);

/** Houses 4–20 of the list round 2 played (src/data/levels.json at bfd2b96) and their bands. */
interface Played extends PlayHouse {
  role: string;
  maxTech: Tech;
}
const ROUND2 = JSON.parse(
  readFileSync(new URL('./fixtures/round2-houses.json', import.meta.url), 'utf8'),
) as Played[];

/**
 * Houses of the round-2 plan's prototype list (sg-gateB-r2/proto), each the lesson or the opening
 * insight it was built for: 6 the split budget, 7 a count at the opening, 12 a cross at the
 * opening, 17 the lit line.
 */
const PROTO: Record<number, PlayHouse> = {
  6: {
    id: 6,
    n: 5,
    rooms: '0001100223022334555344443',
    objects: '.......F........F........',
    givens: [],
    solution: [5, 3, 11, 9, 21, 17],
  },
  7: {
    id: 7,
    n: 6,
    rooms: '011122001112300444335554333355333555',
    objects: '....................................',
    givens: [],
    solution: [13, 8, 4, 24, 23, 33],
  },
  12: {
    id: 12,
    n: 6,
    rooms: '000001203011223311423111423566443556',
    objects: '................L..F..F.........F...',
    givens: [],
    solution: [1, 23, 6, 20, 31, 33, 28],
  },
  17: {
    id: 17,
    n: 6,
    rooms: '000000111220132222334522444552444455',
    objects: '.......F........L...................',
    givens: [],
    solution: [1, 6, 9, 19, 26, 35],
  },
};

describe('Autopilot: the quick patterns, one per step', () => {
  it('single: a room with one free cell takes its ghost (house 1, the resident placed)', () => {
    const h = tutorial(0);
    const ap = new Autopilot(h);
    expect(ap.step()).toEqual({ move: 'single', placed: at(h, [1, 1]) });
    expect(ap.open()).toEqual([]);
    expect(ap.step()).toBeNull();
  });

  it('claim: a room lying in one line takes that line from the other rooms', () => {
    // room B, (1,0) and (2,0), lies in column 0: (0,0) of A and (3,0) of D go; D keeps (3,1)
    const h = rows(['AAAA', 'BCAA', 'BCCA', 'DDCA']);
    const ap = new Autopilot(h);
    expect(ap.step()).toEqual({ move: 'claim', placed: null });
    expect(ap.cand[at(h, [0, 0])]).toBe(0);
    expect(ap.cand[at(h, [3, 0])]).toBe(0);
    expect(ap.step()).toEqual({ move: 'single', placed: at(h, [3, 1]) });
    expect(freebie(h)).toBe(false);
    expect(openingOf(h, 2)).toBe('claim>single');
  });

  it('line single: as many open lines as open rooms, a line with one free cell takes its ghost', () => {
    // the resident at (0,0) leaves row 1 one free cell, (1,3); every room keeps two or more
    const h = rows(['AAXX', 'CAAX', 'CCDX', 'CCDX'], undefined, [[0, 0]]);
    const ap = new Autopilot(h);
    expect(ap.step()).toEqual({ move: 'line-single', placed: at(h, [1, 3]) });
    expect(freebie(h)).toBe(true);
    // without the budget it is no pattern at all: no claim removes anything, it stalls at once
    const plain = new Autopilot(h, { claims: true, budget: 'none' });
    expect(plain.step()).toBeNull();
  });

  it("line claim: a line whose free cells all lie in one room holds that room's ghost", () => {
    // row 1's free cells, (1,2) and (1,3), are both room D's: D's (2,3) goes
    const h = rows(['AADD', 'CADD', 'CCXD', 'CCXX'], undefined, [[0, 0]]);
    const ap = new Autopilot(h);
    expect(ap.step()).toEqual({ move: 'line-claim', placed: null });
    expect(ap.cand[at(h, [2, 3])]).toBe(0);
  });
});

describe('Autopilot: the budget at three levels', () => {
  const opening = (h: HouseModel, budget: ApOptions['budget']): number =>
    apOpening(h, { claims: true, budget }).placed;

  it('a split line holds two: only the budget over segments opens the house (lesson house)', () => {
    const h = play(PROTO[6] as PlayHouse);
    expect(opening(h, 'lines')).toBe(0);
    expect(opening(h, 'segments')).toBeGreaterThanOrEqual(1);
  });

  it('a fully lit line stays empty: a player who counts it as a line cannot open (lesson house)', () => {
    const h = play(PROTO[17] as PlayHouse);
    expect(opening(h, 'segments-litblind')).toBe(0);
    expect(opening(h, 'segments')).toBeGreaterThanOrEqual(1);
  });

  it('the Queens budget (whole lines) applies only where no object splits a line', () => {
    const split = play(PROTO[6] as PlayHouse);
    const ap = new Autopilot(split, { claims: false, budget: 'lines' });
    expect(ap.step()).toBeNull();
  });
});

describe('apProfile: where the autopilot stalls, a real insight is needed', () => {
  it('a count at the opening: the autopilot places nothing, a count moves it on', () => {
    const p = apProfile(play(PROTO[7] as PlayHouse), 3);
    expect(p.solved).toBe(true);
    expect(p.apSolved).toBe(false);
    expect(p.opening).toBe(0);
    expect(p.firstGhost).toBe('insight');
    expect(p.stalls[0]?.[0]).toBe('count');
    expect(openingOf(play(PROTO[7] as PlayHouse), 3)).toMatch(/^count-(row|col)-\d$/);
  });

  it('a cross at the opening: one cell sees a whole room from two sides', () => {
    const h = play(PROTO[12] as PlayHouse);
    const p = apProfile(h, 3);
    expect(p.solved).toBe(true);
    expect(p.opening).toBe(0);
    expect(p.stalls[0]?.[0]).toBe('cross');
    expect(openingOf(h, 3)).toBe('cross');
  });

  it('houses the autopilot finishes need no insight; the tutorial houses are all free', () => {
    for (const k of [0, 1, 2]) {
      const p = apProfile(tutorial(k), 1);
      expect([p.solved, p.apSolved, p.stalls]).toEqual([true, true, []]);
    }
    expect(freebie(tutorial(0))).toBe(true);
  });

  it('a house no technique of its band can finish is not solved', () => {
    expect(apProfile(play(PROTO[7] as PlayHouse), 2).solved).toBe(false);
  });
});

describe('calibration: the list round 2 played (houses 4–20)', () => {
  it('the autopilot finishes every house but 13 and 20, the two its player stopped to count', () => {
    const stalled = ROUND2.filter((h) => !apProfile(play(h), h.maxTech).apSolved).map((h) => h.id);
    expect(stalled).toEqual([13, 20]);
    for (const h of ROUND2) expect(apProfile(play(h), h.maxTech).solved).toBe(true);
    expect(ROUND2.map((h) => h.id)).toEqual(Array.from({ length: 17 }, (_, k) => k + 4));
  });

  it('it is sound: on every house its moves keep the stored solution', () => {
    for (const h of ROUND2) {
      const m = play(h);
      const ap = new Autopilot(m, AP_FULL);
      for (let s = ap.step(); s; s = ap.step()) {
        for (const c of m.solution) {
          const room = m.roomOf[c] as number;
          expect(ap.ghost[room] === c || ap.cand[c] === 1).toBe(true);
        }
      }
    }
  });
});

describe('fixtures are well formed', () => {
  it('the hand-made houses parse', () => {
    expect(
      fromRows({
        rooms: ['AB', 'AB'],
        givens: [[0, 0]],
        solution: [
          [0, 0],
          [1, 1],
        ],
      }).n,
    ).toBe(2);
  });
});
