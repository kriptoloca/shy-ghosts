import { describe, expect, it } from 'vitest';
import { fromRows, parseHouse, type HouseData } from '../src/core/house';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import { makeCandidate } from '../src/gen/generate';
import { bandFor, type Band } from '../src/gen/params';
import { blindWin, exactWinRate, winRate } from '../src/gen/players';
import { Rng, hashSeed } from '../src/gen/rng';
import { bruteSolutions, roomIds } from './support/brute';
import { randomHouse } from './support/houses';
import { policyWin } from './support/policy';

/** The player models (GENERATOR.md §5, D17). */
const T2 = parseHouse(
  fromRows({
    rooms: ['AAAA', 'BCAA', 'BCCA', 'DDCA'],
    solution: [
      [0, 3],
      [1, 0],
      [2, 2],
      [3, 1],
    ],
  }),
);
const T3 = parseHouse(
  fromRows({
    rooms: ['ABBB', 'AABB', 'CCDB', 'CDDD'],
    objects: ['...F', '....', '....', '...F'],
    solution: [
      [0, 0],
      [1, 3],
      [2, 1],
      [3, 2],
    ],
  }),
);

describe('player models', () => {
  it('are deterministic for a seed', () => {
    const seed = hashSeed('shy-ghosts/players/test/naive');
    expect(winRate(T3, 'naive', seed)).toBe(winRate(T3, 'naive', seed));
    expect(winRate(T3, 'shallow', seed)).toBe(winRate(T3, 'shallow', seed));
  });

  it('naive wins 400 of 400 on the tutorial houses (last free cells only)', () => {
    for (const d of TUTORIAL_HOUSES) {
      expect(winRate(parseHouse(d), 'naive', hashSeed('t'), 400)).toBe(1);
    }
  });

  it('naive guesses on the T2 fixture and loses some; shallow sees the T2 step and never loses', () => {
    const naive = winRate(T2, 'naive', hashSeed('n'));
    expect(naive).toBeGreaterThan(0);
    expect(naive).toBeLessThan(1);
    expect(winRate(T2, 'shallow', hashSeed('s'))).toBe(1);
    // the T3 fixture needs a count, which neither player makes
    expect(winRate(T3, 'shallow', hashSeed('s'))).toBeLessThan(1);
  });

  it('blind: one random empty cell per room wins with probability Π 1 / (empty cells of the room)', () => {
    for (const d of TUTORIAL_HOUSES) {
      // count by brute force over every placement the blind player can make
      const ids = roomIds(d);
      const rooms = Math.max(...ids) + 1;
      const sizes = Array.from(
        { length: rooms },
        (_, r) => ids.filter((id, i) => id === r && d.objects[i] === '.').length,
      );
      const givenRooms = new Set(d.givens.map((g) => ids[g]));
      let total = 1;
      sizes.forEach((s, r) => {
        if (!givenRooms.has(r)) total *= s;
      });
      const wins = bruteSolutions(d, { givens: true, cap: 1000 }).length;
      expect(blindWin(parseHouse(d))).toBeCloseTo(wins / total, 12);
    }
    // the T2 fixture: rooms of 8, 2, 4 and 2 empty cells
    expect(blindWin(T2)).toBeCloseTo(1 / (8 * 2 * 4 * 2), 12);
  });
});

/**
 * Houses of the first build whose stored 400-playout rates missed the exact value (audit
 * 2026-10-21, KRİTİK 1): 651 stored 0.5725 against an exact 0.5000, 486 stored 0.3275 against
 * 0.4049 (the auditor's own exact walk, written outside the repository). Plus a manor and a
 * cycle-high house for size.
 */
const MISMEASURED: [string, HouseData, number | null][] = [
  [
    'house 651 (6 × 6 breather)',
    {
      n: 6,
      rooms: '000122033142533442556444566447566777',
      objects: '.........F..........F.F.............',
      givens: [],
      solution: [6, 3, 11, 14, 21, 19, 26, 34],
    },
    0.5,
  ],
  [
    'house 486 (6 × 6 breather)',
    {
      n: 6,
      rooms: '000111002221333422334445344455335555',
      objects: '..F...........L.......F..F...F.L....',
      givens: [],
      solution: [1, 5, 10, 24, 21, 28],
    },
    0.4049,
  ],
  [
    'house 34 (9 × 9 manor)',
    {
      n: 9,
      rooms: '001111233011122223001444225001464455700666655776666855776969855779969888799999998',
      objects: '..........F.......................F.F.........LL................L...F............',
      givens: [],
      solution: [9, 12, 24, 7, 32, 35, 40, 54, 70, 77],
    },
    null,
  ],
  [
    'house 28 (7 × 7 cycle-high)',
    {
      n: 7,
      rooms: '0001122003311203311143355144637555766777576667777',
      objects: '..FF...F....FL..................................F',
      givens: [],
      solution: [0, 11, 5, 15, 26, 31, 42, 37],
    },
    null,
  ],
];
/** Playouts for the agreement check: SE ≤ 0.0023, so 5 SE ≈ 0.011. */
const MANY = 50_000;
const FIVE_SE = (q: number): number => 5 * Math.sqrt((q * (1 - q)) / MANY);

describe('exact win rates: every random choice of the policy, weighted (audit KRİTİK 1)', () => {
  it('the T2 fixture by hand: naive 1/2, shallow 1', () => {
    // naive: rooms B and D tie at 2 free cells; of the four first guesses, B(2,0) and D(3,0)
    // lose and B(1,0) and D(3,1) win by forced steps alone. Shallow drops (0,0), (3,3), (3,2)
    // and (3,0) by T2 and then wins by T1 alone.
    expect(exactWinRate(T2, 'naive')).toBe(0.5);
    expect(exactWinRate(T2, 'shallow')).toBe(1);
  });

  it('the T3 fixture by hand: naive 5/18', () => {
    // rooms A, C and D tie at 3 free cells: A wins 1 of 3 cells, C 1 of 3, D 1/2 of 1 of 3:
    // (1/3 + 1/3 + 1/6) / 3 = 5/18
    expect(exactWinRate(T3, 'naive')).toBeCloseTo(5 / 18, 15);
  });

  it('the tutorial houses: both players always win (last free cells only)', () => {
    for (const d of TUTORIAL_HOUSES) {
      expect(exactWinRate(parseHouse(d), 'naive')).toBe(1);
      expect(exactWinRate(parseHouse(d), 'shallow')).toBe(1);
    }
  });

  it('agrees with an independent enumeration in exact fractions on 300 small houses', () => {
    // 150 random houses (any number of rooms, sometimes a given) and 150 of the generator's
    // 5 × 5 and 6 × 6 candidates (unique, the bands of houses 4–19 and the cycle breathers)
    const rng = new Rng(hashSeed('players/exact/policy'));
    const houses: HouseData[] = Array.from({ length: 150 }, () => randomHouse(rng, 4, 6));
    const bands = [bandFor(5), bandFor(9), bandFor(15), bandFor(18), bandFor(35)];
    for (let k = 0; houses.length < 300; k++) {
      const c = makeCandidate(
        bands[k % bands.length] as Band,
        hashSeed(`players/exact/${String(k)}`),
      );
      if ('rejected' in c) continue;
      houses.push({ n: c.n, rooms: c.rooms, objects: c.objects, givens: [], solution: c.solution });
    }
    let between = 0;
    for (const d of houses) {
      const h = parseHouse(d);
      for (const who of ['naive', 'shallow'] as const) {
        const [num, den] = policyWin(d, who);
        const want = Number(num) / Number(den);
        expect(Math.abs(exactWinRate(h, who) - want)).toBeLessThan(1e-12);
        if (want > 0 && want < 1) between++;
      }
    }
    // not a trivial sample: in most cases the player guesses and can lose
    expect(between).toBeGreaterThan(200);
  });

  it.each(MISMEASURED)(
    '%s: the exact value agrees with 50,000 seeded playouts (and the auditor where given)',
    (_name, d, auditor) => {
      const h = parseHouse(d);
      for (const who of ['naive', 'shallow'] as const) {
        const exact = exactWinRate(h, who);
        const sampled = winRate(h, who, hashSeed(`players/exact/many/${who}`), MANY);
        expect(Math.abs(sampled - exact)).toBeLessThanOrEqual(FIVE_SE(exact));
      }
      if (auditor !== null) expect(exactWinRate(h, 'naive')).toBeCloseTo(auditor, 4);
    },
    60_000,
  );

  it('is deterministic to the last bit', () => {
    for (const [, d] of MISMEASURED) {
      const h = parseHouse(d);
      expect(exactWinRate(h, 'naive')).toBe(exactWinRate(parseHouse(d), 'naive'));
      expect(exactWinRate(h, 'shallow')).toBe(exactWinRate(parseHouse(d), 'shallow'));
    }
  });
});
