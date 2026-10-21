import { describe, expect, it } from 'vitest';
import { parseHouse, type HouseModel } from '../src/core/house';
import { PlayState } from '../src/core/state';
import { TUTORIAL, TUTORIAL_HOUSES } from '../src/data/tutorial';
import { bruteSolutions } from './support/brute';

function permutations<T>(xs: readonly T[]): T[][] {
  if (xs.length <= 1) return [[...xs]];
  return xs.flatMap((x, i) =>
    permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [x, ...rest]),
  );
}

/** Cells of a ghost-less room where a ghost would be calm now: empty, unlit, seen by no ghost. */
function freeCells(h: HouseModel, s: PlayState, room: number): number[] {
  const ghosts = s.ghostCells();
  return (h.roomCells[room] ?? []).filter(
    (c) => h.candidate[c] && !ghosts.some((g) => h.sees[g]?.includes(c)),
  );
}

describe('the tutorial houses (GDD §3.3, GENERATOR.md §1.3)', () => {
  it('hold the data of the GDD table', () => {
    expect(TUTORIAL.map((t) => [t.rooms.join(' / '), t.given, t.solution])).toEqual([
      [
        'AB / AB',
        [0, 0],
        [
          [0, 0],
          [1, 1],
        ],
      ],
      [
        'ABB / ABB / CCC',
        [0, 1],
        [
          [0, 1],
          [1, 0],
          [2, 2],
        ],
      ],
      [
        'ACCC / ACBB / ADDB / DDDB',
        [0, 3],
        [
          [0, 3],
          [1, 2],
          [2, 0],
          [3, 1],
        ],
      ],
    ]);
    expect(TUTORIAL_HOUSES).toEqual([
      { n: 2, rooms: '0101', objects: '....', givens: [0], solution: [0, 3] },
      { n: 3, rooms: '011011222', objects: '.........', givens: [1], solution: [3, 1, 8] },
      {
        n: 4,
        rooms: '0111012203323332',
        objects: '................',
        givens: [3],
        solution: [8, 3, 6, 13],
      },
    ]);
  });

  it('each has exactly one solution with its given, the stored one; 2, 4 and 9 without', () => {
    TUTORIAL_HOUSES.forEach((d, k) => {
      expect(bruteSolutions(d, { givens: true, cap: 10 })).toEqual([[...d.solution]]);
      expect(bruteSolutions(d, { givens: false, cap: 100 })).toHaveLength([2, 4, 9][k] as number);
    });
  });

  it('are solved by their solution taps in any order, and nothing shivers on the way', () => {
    for (const d of TUTORIAL_HOUSES) {
      const h = parseHouse(d);
      const taps = h.solution.filter((c) => !h.givens.includes(c));
      for (const order of permutations(taps)) {
        const s = new PlayState(h);
        order.forEach((cell, k) => {
          const ev = s.tap(cell);
          expect(ev[0]).toEqual({ type: 'placed', cell, room: h.roomOf[cell] });
          expect(ev.some((x) => x.type === 'status' && x.to !== 'calm')).toBe(false);
          expect(ev.at(-1)?.type === 'solved').toBe(k === order.length - 1);
        });
        expect(s.solved).toBe(true);
      }
    }
  });

  it('house 2: rows and columns both count against the resident', () => {
    const h = parseHouse(TUTORIAL_HOUSES[1] as (typeof TUTORIAL_HOUSES)[number]);
    const row = new PlayState(h);
    row.tap(0); // (0,0): the resident's row
    expect([row.statusAt(0), row.statusAt(1)]).toEqual(['seen', 'seen']);
    const col = new PlayState(h);
    col.tap(7); // (2,1): the resident's column
    expect([col.statusAt(1), col.statusAt(7)]).toEqual(['seen', 'seen']);
  });

  it('house 3: three placements, each the last free cell of its room', () => {
    const h = parseHouse(TUTORIAL_HOUSES[2] as (typeof TUTORIAL_HOUSES)[number]);
    const s = new PlayState(h);
    const placed: number[] = [];
    while (!s.solved) {
      const open = [...Array(h.roomCount).keys()].filter((r) => s.ghostOf(r) === null);
      const forced = open.find((r) => freeCells(h, s, r).length === 1);
      expect(forced, `a room with one free cell after ${placed.join(', ')}`).toBeDefined();
      const cell = freeCells(h, s, forced as number)[0] as number;
      s.tap(cell);
      placed.push(cell);
    }
    // (1,2) first (enabled by the resident), then (2,0), then (3,1)
    expect(placed).toEqual([6, 8, 13]);
  });
});
