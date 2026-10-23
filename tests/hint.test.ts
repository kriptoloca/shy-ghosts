import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hintExplain, hintStep, type ReasonBeat } from '../src/core/hint';
import { fromRows, parseHouse, type HouseData, type HouseModel } from '../src/core/house';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import { Grader } from '../src/gen/grade';
import { T4 } from '../src/gen/params';
import { puzzleOf } from '../src/gen/solve';

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
      beats: [
        { kind: 'claim', room: 1, segment: seg(T2_HOUSE, 'col', 0), glow: [4, 8], dots: [12] },
        { kind: 'target', room: 3, cell: 13, dots: [12], lines: [] },
      ],
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
      beats: [
        {
          kind: 'target',
          room: 2,
          cell: 9,
          dots: [],
          lines: [
            [0, 8],
            [0, 12],
          ],
        },
      ],
    });
  });

  it('null when every room holds its solution ghost; the place is always the solution', () => {
    expect(hintExplain(H3, [8, 3, 6, 13])).toBeNull();
    const e = hintExplain(H3, [null, 3, null, null]);
    expect(e?.kind === 'place' ? H3.solution[e.room] : -1).toBe(e?.kind === 'place' ? e.cell : -2);
  });
});

/** GENERATOR.md §4.6's cross house (tests/grade.test.ts), room A's ghost placed at (2,1). */
const CROSS_HOUSE = parseHouse(
  fromRows({
    rooms: ['ABBBB', 'AABCB', 'AADCC', 'DDDDC', 'DDDEE'],
    objects: ['.....', 'LF...', '.....', '.....', '.....'],
    solution: [
      [2, 1],
      [0, 1],
      [1, 3],
      [3, 2],
      [4, 4],
    ],
  }),
);

/** The cells the grader removes on its way from the board to the next forced ghost. */
function removedOnTheWay(h: HouseModel, ghosts: readonly (number | null)[]): number[] {
  const placed = ghosts.filter((g): g is number => g !== null);
  const g = new Grader(puzzleOf(h, h.roomOf, placed));
  const out: number[] = [];
  for (;;) {
    const s = g.step(T4);
    if (s === 'stuck' || s === 'contradiction' || s.placed !== null) break;
    out.push(...s.removed);
  }
  return out.sort((a, b) => a - b);
}
/** The cells a reason dots: claims and counts their removals, crosses and chains their cell. */
function dotted(beats: readonly ReasonBeat[]): number[] {
  const out = new Set<number>();
  for (const b of beats) {
    if (b.kind === 'claim' || b.kind === 'count' || b.kind === 'target') {
      for (const c of b.dots) out.add(c);
    } else out.add(b.cell);
  }
  return [...out].sort((a, b) => a - b);
}
const beatsOf = (h: HouseModel, ghosts: (number | null)[]): ReasonBeat[] => {
  const e = hintExplain(h, ghosts);
  return e?.kind === 'place' ? e.beats : [];
};

describe('the reason in beats (Gate B tune round 3 §2, D98)', () => {
  it('a count: two rooms fill two lines, each band with the digit 2; the dots on what it removes', () => {
    const row = (r: number): number => seg(T3_HOUSE, 'row', r);
    const col = (c: number): number => seg(T3_HOUSE, 'col', c);
    expect(beatsOf(T3_HOUSE, [null, null, null, null])).toEqual([
      {
        kind: 'count',
        k: 2,
        rooms: [2, 3],
        segments: [row(2), row(3)],
        glow: [8, 9, 10, 12, 13, 14],
        dots: [11],
      },
      {
        kind: 'count',
        k: 2,
        rooms: [0, 2],
        segments: [col(0), col(1)],
        glow: [0, 4, 5, 8, 9, 12],
        dots: [1, 13],
      },
      // two removals by room D lying in column 2 merge into one beat
      { kind: 'claim', room: 3, segment: col(2), glow: [10, 14], dots: [2, 6] },
      // the last beat: room B pulses with the digit 1, every other cell of it dotted
      { kind: 'target', room: 1, cell: 7, dots: [1, 2, 6, 11], lines: [] },
    ]);
  });

  it('a cross: a see-through ghost on (3,3), its row and column, the room it would empty', () => {
    const b = beatsOf(CROSS_HOUSE, [11, null, null, null, null]);
    expect(b).toEqual([
      {
        kind: 'cross',
        cell: 18,
        room: 2,
        segments: [seg(CROSS_HOUSE, 'row', 3), seg(CROSS_HOUSE, 'col', 3)],
        flash: [8, 19],
      },
      { kind: 'claim', room: 4, segment: seg(CROSS_HOUSE, 'row', 4), glow: [23, 24], dots: [22] },
      // room D: (3,3) and (4,2) were dotted on the way; the ghost at (2,1) sees three of its
      // cells (dotted lines); two are lit
      {
        kind: 'target',
        room: 3,
        cell: 17,
        dots: [18, 22],
        lines: [
          [11, 12],
          [11, 16],
          [11, 21],
        ],
      },
    ]);
  });

  it('a claim: room B lies in column 0, so (3,0) goes (the T2 house)', () => {
    const b = beatsOf(T2_HOUSE, [null, null, null, null]);
    expect(b.map((x) => x.kind)).toEqual(['claim', 'target']);
  });

  it('the dots are exactly the cells the grader removes, in every fixture and on built houses', () => {
    const cases: [HouseModel, (number | null)[]][] = [
      [T2_HOUSE, [null, null, null, null]],
      [T3_HOUSE, [null, null, null, null]],
      [T3_HOUSE, [0, null, null, null]],
      [CROSS_HOUSE, [11, null, null, null, null]],
    ];
    // and on houses 4–24 of the list as they open (residents placed, nothing else)
    const levels = JSON.parse(
      readFileSync(new URL('../src/data/levels.json', import.meta.url), 'utf8'),
    ) as HouseData[];
    for (const d of levels.slice(3, 24)) {
      const h = parseHouse(d);
      const ghosts = Array.from(
        { length: h.roomCount },
        (_, r) => h.givens.find((g) => h.roomOf[g] === r) ?? null,
      );
      cases.push([h, ghosts]);
    }
    expect(cases).toHaveLength(25);
    for (const [h, ghosts] of cases) {
      expect(dotted(beatsOf(h, ghosts))).toEqual(removedOnTheWay(h, ghosts));
    }
  });

  it('the last beat is always the target: the room and cell the hint will place', () => {
    for (const [h, ghosts] of [
      [T2_HOUSE, [null, null, null, null]],
      [CROSS_HOUSE, [11, null, null, null, null]],
    ] as const) {
      const e = hintExplain(h, ghosts);
      const last = e?.kind === 'place' ? e.beats.at(-1) : undefined;
      expect(last).toMatchObject({
        kind: 'target',
        room: e?.kind === 'place' ? e.room : -1,
        cell: e?.kind === 'place' ? e.cell : -1,
      });
    }
  });
});
