import { describe, expect, it } from 'vitest';
import { hintExplain, hintStep } from '../src/core/hint';
import { fromRows, parseHouse, type HouseData, type HouseModel } from '../src/core/house';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';

/** The hint step on its own (GDD §3.1): the ghost of each room id is a cell or null. */
const H3 = parseHouse(TUTORIAL_HOUSES[2] as HouseData); // A 0, C 1, B 2, D 3; given (0,3) = 3

describe('hintStep', () => {
  it('a wrong ghost goes first, the first in reading order', () => {
    // A at (1,0) and D at (2,1) are both wrong; B is empty
    expect(hintStep(H3, [4, 3, null, 9])).toEqual({ kind: 'remove', cell: 4 });
    expect(hintStep(H3, [8, 3, null, 9])).toEqual({ kind: 'remove', cell: 9 });
  });

  it('with no wrong ghost: the empty room with the fewest free cells gets its solution ghost', () => {
    // free cells: A 2 ((0,0) is seen by the resident), B 1, D 5
    expect(hintStep(H3, [null, 3, null, null])).toEqual({ kind: 'place', cell: 6 });
    expect(hintStep(H3, [null, 3, 6, null])).toEqual({ kind: 'place', cell: 8 });
    expect(hintStep(H3, [8, 3, 6, null])).toEqual({ kind: 'place', cell: 13 });
  });

  it('null when every room holds its solution ghost', () => {
    expect(hintStep(H3, [8, 3, 6, 13])).toBeNull();
  });

  it('ties go to the lowest room id', () => {
    const squares = parseHouse({
      n: 4,
      rooms: '0011001122332233',
      objects: '................',
      givens: [],
      solution: [0, 6, 9, 15],
    });
    expect(hintStep(squares, [null, null, null, null])).toEqual({ kind: 'place', cell: 0 });
    expect(hintStep(squares, [0, null, null, null])).toEqual({ kind: 'place', cell: 6 });
    // a ghost at (3,3): rooms 1 and 2 keep 2 free cells each, room 0 keeps 4 → room 1
    expect(hintStep(squares, [null, null, null, 15])).toEqual({ kind: 'place', cell: 6 });
  });
});

/**
 * The two-step hint's first press (D74): the reason, not the move. The fixtures are GENERATOR.md
 * §4.5's T2 and T3 houses (tests/grade.test.ts).
 */
const T2_HOUSE = parseHouse(
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
const T3_HOUSE = parseHouse(
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
const seg = (h: HouseModel, axis: 'row' | 'col', line: number): number =>
  h.segments.findIndex((s) => s.axis === axis && s.line === line);

describe('hintExplain', () => {
  it('a wrong ghost: it is the one to go (nothing else is explained)', () => {
    expect(hintExplain(H3, [4, 3, null, 9])).toEqual({ kind: 'remove', cell: 4 });
  });

  it('the T2 house: room B claims column 0, so (3,0) goes and room D has one place left', () => {
    expect(hintExplain(T2_HOUSE, [null, null, null, null])).toEqual({
      kind: 'place',
      room: 3,
      cell: 13,
      segments: [seg(T2_HOUSE, 'col', 0)],
      rooms: [1, 3],
    });
  });

  it('the T3 house: the two counts and the two removals before the first placement', () => {
    const e = hintExplain(T3_HOUSE, [null, null, null, null]);
    expect(e).toMatchObject({ kind: 'place', room: 1, cell: 7, rooms: [0, 1, 2, 3] });
    const lines = (e?.kind === 'place' ? e.segments : []).map((s) => {
      const x = T3_HOUSE.segments[s];
      return `${x?.axis ?? ''}${String(x?.line)}`;
    });
    expect(lines).toEqual(['row2', 'row3', 'col0', 'col1', 'col2']);
  });

  it('a right ghost on the board counts as a resident: its sight is the reason', () => {
    // room A's ghost at (0,0) sees down column 0: room C keeps (2,1) only
    expect(hintExplain(T3_HOUSE, [0, null, null, null])).toEqual({
      kind: 'place',
      room: 2,
      cell: 9,
      segments: [seg(T3_HOUSE, 'col', 0)],
      rooms: [2],
    });
  });

  it('null when every room holds its solution ghost; the place is always the solution', () => {
    expect(hintExplain(H3, [8, 3, 6, 13])).toBeNull();
    const e = hintExplain(H3, [null, 3, null, null]);
    expect(e?.kind === 'place' ? H3.solution[e.room] : -1).toBe(e?.kind === 'place' ? e.cell : -2);
  });
});
