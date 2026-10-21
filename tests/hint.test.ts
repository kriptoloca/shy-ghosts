import { describe, expect, it } from 'vitest';
import { hintStep } from '../src/core/hint';
import { parseHouse, type HouseData } from '../src/core/house';
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
