import { describe, expect, it } from 'vitest';
import {
  N_MAX,
  N_MIN,
  fromRows,
  houseErrors,
  parseHouse,
  rotate,
  sees,
  type HouseData,
} from '../src/core/house';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import { Rng } from '../src/gen/rng';
import { bruteLit, bruteSees, bruteSolutions, isSolution, roomIds } from './support/brute';
import { at, randomHouse, rowsHouse } from './support/houses';

/** GENERATOR.md §2 worked example 1: a 5 × 5 house; a bookshelf, a lamp, a bookshelf. */
const EXAMPLE_OBJECTS = ['..F..', '.....', 'L....', '...F.', '.....'];
/** Rooms for the example (sight ignores them; they only keep the ghosts it names apart). */
const EXAMPLE_ROOMS = ['ABBCD', 'AEECD', 'AGGGD', 'HHGGD', 'HHIII'];
const example = parseHouse(rowsHouse(EXAMPLE_ROOMS, EXAMPLE_OBJECTS));
const e = (r: number, c: number): number => at(5, r, c);

describe('parseHouse', () => {
  it('reads the size, the rooms (base 36), the objects, the givens and the solution', () => {
    const h = parseHouse(TUTORIAL_HOUSES[2] as HouseData);
    expect(h.n).toBe(4);
    expect(h.size).toBe(16);
    expect(h.roomCount).toBe(4);
    // ACCC / ACBB / ADDB / DDDB with canonical ids: A 0, C 1, B 2, D 3
    expect(h.roomOf).toEqual([0, 1, 1, 1, 0, 1, 2, 2, 0, 3, 3, 2, 3, 3, 3, 2]);
    expect(h.roomCells[1]).toEqual([1, 2, 3, 5]);
    expect(h.givens).toEqual([3]);
    expect(h.solution).toEqual([8, 3, 6, 13]);
    expect(h.objects.every((o) => o === '.')).toBe(true);
    expect(h.blocked.some(Boolean)).toBe(false);
  });

  it('rejects malformed houses with a reason, and parseHouse throws on them', () => {
    const good: HouseData = TUTORIAL_HOUSES[0] as HouseData;
    const cases: [string, Partial<HouseData>][] = [
      ['size', { n: N_MIN - 1 }],
      ['size', { n: N_MAX + 1, rooms: '0'.repeat(100), objects: '.'.repeat(100) }],
      ['rooms', { rooms: '011' }],
      ['objects', { objects: '..x.' }],
      ['objects', { objects: '...' }],
      ['canonical', { rooms: '1010', solution: [1, 0] }],
      ['room id', { rooms: '0!0!' }],
      ['cells', { rooms: '0111', solution: [0, 1] }],
      ['connected', { rooms: '0110', solution: [0, 1] }],
      ['solution', { solution: [0] }],
      ['solution', { solution: [0, 2] }],
      ['solution', { objects: '.F..', solution: [0, 1] }],
      ['given', { givens: [1] }],
      ['given', { givens: [0, 0] }],
      ['given', { givens: [7] }],
    ];
    for (const [what, patch] of cases) {
      const bad = { ...good, ...patch };
      const errors = houseErrors(bad);
      expect(errors.join(' | '), JSON.stringify(patch)).toContain(what);
      expect(() => parseHouse(bad)).toThrow();
    }
    expect(houseErrors(good)).toEqual([]);
    // data read from a file may be any shape: still reasons, never a crash
    const noSolution = { ...good, solution: null } as unknown as HouseData;
    expect(houseErrors(noSolution).join(' | ')).toContain('solution');
    expect(houseErrors(noSolution).join(' | ')).toContain('given: cell 0');
    const noGivens = { ...good, givens: 'x' } as unknown as HouseData;
    expect(houseErrors(noGivens).join(' | ')).toContain('given');
  });

  it('accepts every random house in the generator shape', () => {
    const rng = new Rng(1);
    for (let k = 0; k < 300; k++) expect(houseErrors(randomHouse(rng, 2, 9))).toEqual([]);
  });
});

describe('segments (GENERATOR.md §2)', () => {
  it('worked example 1: rows and columns are cut at furniture and lamps', () => {
    const rows = example.segments.filter((s) => s.axis === 'row').map((s) => s.cells);
    expect(rows).toEqual([
      [e(0, 0), e(0, 1)],
      [e(0, 3), e(0, 4)],
      [e(1, 0), e(1, 1), e(1, 2), e(1, 3), e(1, 4)],
      [e(2, 1), e(2, 2), e(2, 3), e(2, 4)],
      [e(3, 0), e(3, 1), e(3, 2)],
      [e(3, 4)],
      [e(4, 0), e(4, 1), e(4, 2), e(4, 3), e(4, 4)],
    ]);
    const col3 = example.segments.filter((s) => s.axis === 'col' && s.line === 3);
    expect(col3.map((s) => s.cells)).toEqual([[e(0, 3), e(1, 3), e(2, 3)], [e(4, 3)]]);
    // rows come first, then columns, so T3 can count rows before columns (GENERATOR.md §4.3)
    const firstCol = example.segments.findIndex((s) => s.axis === 'col');
    expect(example.segments.slice(firstCol).every((s) => s.axis === 'col')).toBe(true);
  });

  it('every unblocked cell lies in exactly one row and one column segment', () => {
    const rng = new Rng(2);
    for (let k = 0; k < 300; k++) {
      const h = parseHouse(randomHouse(rng, 2, 9));
      for (let i = 0; i < h.size; i++) {
        const inRow = h.segments.filter((s) => s.axis === 'row' && s.cells.includes(i));
        const inCol = h.segments.filter((s) => s.axis === 'col' && s.cells.includes(i));
        if (h.blocked[i]) {
          expect(inRow.length + inCol.length).toBe(0);
          expect(h.rowSeg[i]).toBe(-1);
          expect(h.colSeg[i]).toBe(-1);
        } else {
          expect([inRow.length, inCol.length]).toEqual([1, 1]);
          expect(h.segments[h.rowSeg[i] as number]).toBe(inRow[0]);
          expect(h.segments[h.colSeg[i] as number]).toBe(inCol[0]);
        }
      }
    }
  });
});

describe('sight (GDD §3: rows and columns, stopped by furniture and lamps only)', () => {
  it('worked example 1, cell by cell', () => {
    // a bookshelf between (0,1) and (0,3): neither sees the other
    expect(sees(example, e(0, 1), e(0, 3))).toBe(false);
    expect(sees(example, e(0, 3), e(0, 4))).toBe(true);
    // down column 1 through the room walls (rooms B, E, G, H differ)
    expect(example.roomOf[e(0, 1)]).not.toBe(example.roomOf[e(4, 1)]);
    expect(sees(example, e(0, 1), e(4, 1))).toBe(true);
    // a third ghost at (1,1) sees both; ghosts do not block sight
    expect(sees(example, e(1, 1), e(0, 1))).toBe(true);
    expect(sees(example, e(1, 1), e(4, 1))).toBe(true);
    // the bookshelf at (3,3) blocks column 3
    expect(sees(example, e(4, 3), e(0, 3))).toBe(false);
    expect(sees(example, e(4, 1), e(4, 3))).toBe(true);
    // sight is symmetric, never reflexive, never from or onto a blocked cell
    expect(sees(example, e(0, 1), e(0, 1))).toBe(false);
    expect(sees(example, e(2, 0), e(2, 1))).toBe(false);
    expect(sees(example, e(0, 2), e(1, 2))).toBe(false);
  });

  it('equals a brute-force walk on 300 random houses, and `sees` lists exactly those cells', () => {
    const rng = new Rng(3);
    for (let k = 0; k < 300; k++) {
      const d = randomHouse(rng, 2, 9);
      const h = parseHouse(d);
      const wrong: string[] = [];
      for (let a = 0; a < h.size; a++) {
        const expected: number[] = [];
        for (let b = 0; b < h.size; b++) {
          const brute = bruteSees(d.n, d.objects, a, b);
          if (sees(h, a, b) !== brute) wrong.push(`${String(a)}–${String(b)}`);
          if (brute) expected.push(b);
        }
        if (h.sees[a]?.join() !== expected.join()) wrong.push(`sees[${String(a)}]`);
      }
      expect(wrong).toEqual([]);
    }
  });
});

describe('light (GDD §3: a lamp lights its row and column up to the first blocker)', () => {
  it('worked example 1: exactly the lamp column and row', () => {
    const lit = example.lit.flatMap((v, i) => (v ? [i] : []));
    expect(lit).toEqual(
      [e(0, 0), e(1, 0), e(3, 0), e(4, 0), e(2, 1), e(2, 2), e(2, 3), e(2, 4)].sort(
        (a, b) => a - b,
      ),
    );
    // a lone ghost at (2,2) stands in the light
    expect(example.lit[e(2, 2)]).toBe(true);
  });

  it('stops at furniture and at another lamp; lamps light each other never', () => {
    const h = parseHouse(
      rowsHouse(
        ['AAAAA', 'BBBBB', 'CCCCC', 'DDDDD', 'EEEEE'],
        ['L.F.L', '.L...', '.....', '.....', '.....'],
      ),
    );
    // row 0: (0,1) lit by (0,0); (0,3) lit by (0,4); the bookshelf stops both
    expect(h.lit[at(5, 0, 1)]).toBe(true);
    expect(h.lit[at(5, 0, 3)]).toBe(true);
    expect(h.lit[at(5, 0, 2)]).toBe(false);
    expect(h.lit[at(5, 0, 0)]).toBe(false);
    // column 0: (1,0) lit by (0,0) and by (1,1) along row 1
    expect(h.lit[at(5, 1, 0)]).toBe(true);
    // (1,1) is a lamp; (0,1) above it is lit (also by (0,0))
    expect(h.lit[at(5, 1, 1)]).toBe(false);
    expect(h.lit[at(5, 1, 4)]).toBe(true);
    // down column 1 from the lamp at (1,1); nothing reaches (2,2)
    expect(h.lit[at(5, 4, 1)]).toBe(true);
    expect(h.lit[at(5, 2, 2)]).toBe(false);
  });

  it('equals a brute-force walk on 300 random houses; candidates are the empty unlit cells', () => {
    const rng = new Rng(4);
    for (let k = 0; k < 300; k++) {
      const d = randomHouse(rng, 2, 9);
      const h = parseHouse(d);
      for (let i = 0; i < h.size; i++) {
        expect(h.lit[i]).toBe(bruteLit(d.n, d.objects, i));
        expect(h.candidate[i]).toBe(d.objects[i] === '.' && !bruteLit(d.n, d.objects, i));
      }
    }
  });
});

describe('fromRows (rows of room letters → canonical house data)', () => {
  it('numbers the rooms in reading order of their first cell and re-indexes the solution', () => {
    const d = fromRows({
      rooms: ['ACCC', 'ACBB', 'ADDB', 'DDDB'],
      givens: [[0, 3]],
      solution: [
        [0, 3],
        [1, 2],
        [2, 0],
        [3, 1],
      ],
    });
    expect(d).toEqual({
      n: 4,
      rooms: '0111012203323332',
      objects: '................',
      givens: [3],
      solution: [8, 3, 6, 13],
    });
  });

  it('letters do not matter: relabelled rows give the same house', () => {
    const a = fromRows({
      rooms: ['AB', 'AB'],
      solution: [
        [0, 0],
        [1, 1],
      ],
    });
    const b = fromRows({
      rooms: ['zq', 'zq'],
      solution: [
        [1, 1],
        [0, 0],
      ],
    });
    expect(b).toEqual(a);
    expect(a.rooms).toBe('0101');
  });

  it('throws on a coordinate off the board instead of wrapping it into another row', () => {
    // (0,3) on a 2 × 2 board would be cell 3, which is (1,1): never accept it
    expect(() =>
      fromRows({
        rooms: ['AB', 'AB'],
        solution: [
          [0, 0],
          [0, 3],
        ],
      }),
    ).toThrow();
    expect(() =>
      fromRows({
        rooms: ['AB', 'AB'],
        solution: [
          [0, 0],
          [-1, 5],
        ],
      }),
    ).toThrow();
    expect(() =>
      fromRows({
        rooms: ['AB', 'AB'],
        givens: [[2, 0]],
        solution: [
          [0, 0],
          [1, 1],
        ],
      }),
    ).toThrow();
    expect(() =>
      fromRows({
        rooms: ['AB', 'AB'],
        solution: [
          [0, 0],
          [1, 0.5],
        ],
      }),
    ).toThrow();
  });

  it('throws when the rooms outnumber the base-36 ids instead of writing two-character ids', () => {
    // 9 × 9 with 37 rooms: one pair per room along the rows, the last row's cells one room
    const symbols = [...Array(40).keys()].map((k) => String.fromCharCode(0x100 + k));
    const rows = Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => {
        const i = r * 9 + c;
        return symbols[Math.min(36, Math.floor(i / 2))] as string;
      }).join(''),
    );
    const solution = [...Array(37).keys()].map((k): [number, number] => [
      Math.floor((2 * k) / 9),
      (2 * k) % 9,
    ]);
    expect(() => fromRows({ rooms: rows, solution })).toThrow(/36/);
  });

  it('throws on ragged rows, a room without a solution ghost or two in one room', () => {
    expect(() =>
      fromRows({
        rooms: ['AB', 'A'],
        solution: [
          [0, 0],
          [0, 1],
        ],
      }),
    ).toThrow();
    expect(() => fromRows({ rooms: ['AB', 'AB'], solution: [[0, 0]] })).toThrow();
    expect(() =>
      fromRows({
        rooms: ['AB', 'AB'],
        solution: [
          [0, 0],
          [1, 0],
          [1, 1],
        ],
      }),
    ).toThrow();
    expect(() =>
      fromRows({
        rooms: ['AB', 'AB'],
        objects: ['..', '.'],
        solution: [
          [0, 0],
          [1, 1],
        ],
      }),
    ).toThrow();
  });
});

describe('rotate (houses after 1000, GENERATOR.md §7, D14)', () => {
  const cellAfter = (n: number, i: number): number => {
    const r = Math.floor(i / n);
    const c = i % n;
    return c * n + (n - 1 - r);
  };

  it('a quarter turn moves (r, c) to (c, n − 1 − r) and keeps rooms, objects and the solution', () => {
    const rng = new Rng(5);
    for (let k = 0; k < 200; k++) {
      const d = randomHouse(rng, 2, 9);
      const t = rotate(d, 1);
      expect(houseErrors(t)).toEqual([]);
      const ids = roomIds(d);
      const tids = roomIds(t);
      const wrong: number[] = [];
      for (let i = 0; i < d.n * d.n; i++) {
        if (t.objects[cellAfter(d.n, i)] !== d.objects[i]) wrong.push(i);
        for (let j = 0; j < d.n * d.n; j++) {
          const together = tids[cellAfter(d.n, i)] === tids[cellAfter(d.n, j)];
          if (together !== (ids[i] === ids[j])) wrong.push(i);
        }
      }
      expect(wrong).toEqual([]);
      expect(new Set(t.solution)).toEqual(new Set(d.solution.map((c) => cellAfter(d.n, c))));
      t.solution.forEach((c, room) => expect(tids[c]).toBe(room));
      expect(t.givens).toEqual(d.givens.map((g) => cellAfter(d.n, g)).sort((a, b) => a - b));
    }
  });

  it('turns only by whole quarter turns', () => {
    const d = TUTORIAL_HOUSES[2] as HouseData;
    expect(() => rotate(d, 1.5)).toThrow();
    expect(() => rotate(d, Number.NaN)).toThrow();
  });

  it('four turns are the identity; negative turns turn back; room ids stay canonical', () => {
    const rng = new Rng(6);
    for (let k = 0; k < 100; k++) {
      const d = randomHouse(rng, 2, 8);
      expect(rotate(d, 4)).toEqual(d);
      expect(rotate(d, 0)).toEqual(d);
      expect(rotate(d, -1)).toEqual(rotate(d, 3));
      expect(rotate(rotate(d, 1), 3)).toEqual(d);
      expect(houseErrors(rotate(d, 2))).toEqual([]);
    }
  });

  it('keeps the solution: same number of solutions, and the turned solution is one of them', () => {
    TUTORIAL_HOUSES.forEach((d, k) => {
      const without = [2, 4, 9][k] as number;
      for (let turns = 1; turns <= 3; turns++) {
        const t = rotate(d, turns);
        const withGiven = bruteSolutions(t, { givens: true, cap: 5 });
        expect(withGiven).toHaveLength(1);
        expect(withGiven[0]).toEqual([...t.solution]);
        expect(bruteSolutions(t, { givens: false, cap: 50 })).toHaveLength(without);
      }
    });
    const rng = new Rng(7);
    for (let k = 0; k < 200; k++) {
      const d = randomHouse(rng, 2, 6);
      const before = bruteSolutions(d, { givens: true, cap: 30 }).length;
      const t = rotate(d, rng.int(1, 3));
      expect(bruteSolutions(t, { givens: true, cap: 30 }).length).toBe(before);
      expect(isSolution(d, d.solution)).toBe(true);
      expect(isSolution(t, t.solution)).toBe(true);
    }
  });
});
