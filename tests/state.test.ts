import { describe, expect, it } from 'vitest';
import { parseHouse, type HouseData, type HouseModel } from '../src/core/house';
import { PlayState, type PlayEvent } from '../src/core/state';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import { Screen, view } from './support/screen';
import { at, rowsHouse } from './support/houses';

const house = (k: number): HouseModel => parseHouse(TUTORIAL_HOUSES[k] as HouseData);
/** House 1: rooms AB / AB → room 0 = cells 0, 2; room 1 = cells 1, 3; the given at (0,0). */
const H1 = (): PlayState => new PlayState(house(0));
/** House 3: ACCC / ACBB / ADDB / DDDB → A 0, C 1, B 2, D 3; the given at (0,3) = cell 3. */
const H3 = (): PlayState => new PlayState(house(2));

/** Worked example 1's house (sight claims at the level of the play state). */
const EXAMPLE = parseHouse(
  rowsHouse(
    ['ABBCD', 'AEECD', 'AGGGD', 'HHGGD', 'HHIII'],
    ['..F..', '.....', 'L....', '...F.', '.....'],
  ),
);
const e = (r: number, c: number): number => at(5, r, c);

/** Four 2 × 2 rooms, no objects; a valid (not unique) solution, for ties and cascades. */
const SQUARES = parseHouse({
  n: 4,
  rooms: '0011001122332233',
  objects: '................',
  givens: [],
  solution: [0, 6, 9, 15],
});

describe('the fresh state', () => {
  it('holds the givens, settles their rooms when calm, and has nothing to undo', () => {
    const s = H1();
    expect(view(s)).toEqual({ ghosts: [[0, 'calm']], marks: [], settled: [0], solved: false });
    expect(s.isGiven(0)).toBe(true);
    expect(s.ghostOf(0)).toBe(0);
    expect(s.ghostOf(1)).toBeNull();
    expect(s.canUndo).toBe(false);
    expect(s.serialize()).toEqual({ ghosts: [], marks: [] });
  });
});

describe('worked example 1 (GENERATOR.md §2): sight and light on the board', () => {
  it('a bookshelf between two ghosts keeps both calm; nothing between, both are seen', () => {
    const s = new PlayState(EXAMPLE);
    s.tap(e(0, 1));
    s.tap(e(0, 3));
    expect(s.statusAt(e(0, 1))).toBe('calm');
    expect(s.statusAt(e(0, 3))).toBe('calm');
    s.tap(e(0, 4));
    expect(s.statusAt(e(0, 3))).toBe('seen');
    expect(s.statusAt(e(0, 4))).toBe('seen');
    expect(s.statusAt(e(0, 1))).toBe('calm');
  });

  it('column sight runs through room walls; a third ghost sees both and is seen by both', () => {
    const s = new PlayState(EXAMPLE);
    s.tap(e(0, 1));
    s.tap(e(4, 1));
    expect([s.statusAt(e(0, 1)), s.statusAt(e(4, 1))]).toEqual(['seen', 'seen']);
    s.tap(e(1, 1));
    expect([s.statusAt(e(0, 1)), s.statusAt(e(1, 1)), s.statusAt(e(4, 1))]).toEqual([
      'seen',
      'seen',
      'seen',
    ]);
  });

  it('furniture blocks a column; a shared row sees; a lone ghost in the light is lit', () => {
    const s = new PlayState(EXAMPLE);
    s.tap(e(4, 3));
    s.tap(e(0, 3));
    expect([s.statusAt(e(4, 3)), s.statusAt(e(0, 3))]).toEqual(['calm', 'calm']);
    s.tap(e(4, 1));
    expect([s.statusAt(e(4, 1)), s.statusAt(e(4, 3))]).toEqual(['seen', 'seen']);
    const lone = new PlayState(EXAMPLE);
    const ev = lone.tap(e(2, 2));
    expect(ev).toEqual([
      { type: 'placed', cell: e(2, 2), room: EXAMPLE.roomOf[e(2, 2)] },
      { type: 'status', cell: e(2, 2), from: null, to: 'lit' },
    ]);
    expect(lone.isSettled(EXAMPLE.roomOf[e(2, 2)] as number)).toBe(false);
  });

  it('a ghost both seen and lit shows "seen" (D26)', () => {
    const s = new PlayState(EXAMPLE);
    s.tap(e(2, 2));
    s.tap(e(2, 4));
    expect([s.statusAt(e(2, 2)), s.statusAt(e(2, 4))]).toEqual(['seen', 'seen']);
  });
});

describe('worked example 2 (GENERATOR.md §2): relocation and the given, house 1', () => {
  it('tap (0,1) → placed, both seen; tap (1,1) → relocated, both calm, both settled, solved', () => {
    const s = H1();
    expect(s.tap(1)).toEqual<PlayEvent[]>([
      { type: 'placed', cell: 1, room: 1 },
      { type: 'status', cell: 0, from: 'calm', to: 'seen' },
      { type: 'status', cell: 1, from: null, to: 'seen' },
      { type: 'unsettled', room: 0 },
    ]);
    expect(s.tap(3)).toEqual<PlayEvent[]>([
      { type: 'relocated', from: 1, to: 3, room: 1 },
      { type: 'status', cell: 0, from: 'seen', to: 'calm' },
      { type: 'status', cell: 3, from: 'seen', to: 'calm' },
      { type: 'settled', room: 0 },
      { type: 'settled', room: 1 },
      { type: 'solved' },
    ]);
    expect(view(s)).toEqual({
      ghosts: [
        [0, 'calm'],
        [3, 'calm'],
      ],
      marks: [],
      settled: [0, 1],
      solved: true,
    });
  });

  it('in a fresh copy, tap (1,0) → the given nudges and nothing else changes', () => {
    const s = H1();
    const before = view(s);
    expect(s.tap(2)).toEqual<PlayEvent[]>([{ type: 'nudged', cell: 0 }]);
    expect(view(s)).toEqual(before);
    expect(s.canUndo).toBe(false);
  });
});

describe('worked example 3 (GENERATOR.md §2): marks and undo, house 3', () => {
  it('a stroke marks three cells (one move); a tap on one places and clears it; undo, undo', () => {
    const s = H3();
    expect(s.stroke([8, 9, 10], 'paint')).toEqual<PlayEvent[]>([
      { type: 'marked', cells: [8, 9, 10], on: true },
    ]);
    expect(s.tap(9)).toEqual<PlayEvent[]>([
      { type: 'placed', cell: 9, room: 3 },
      { type: 'marked', cells: [9], on: false },
      { type: 'status', cell: 9, from: null, to: 'calm' },
      { type: 'settled', room: 3 },
    ]);
    expect(s.markedCells()).toEqual([8, 10]);
    // the first undo brings the mark back and takes the ghost away
    expect(s.undo()).toEqual<PlayEvent[]>([
      { type: 'removed', cell: 9, room: 3 },
      { type: 'marked', cells: [9], on: true },
      { type: 'unsettled', room: 3 },
    ]);
    expect(s.markedCells()).toEqual([8, 9, 10]);
    expect(s.ghostCells()).toEqual([3]);
    // the second removes the whole stroke; then there is nothing left to undo
    expect(s.undo()).toEqual<PlayEvent[]>([{ type: 'marked', cells: [8, 9, 10], on: false }]);
    expect(s.markedCells()).toEqual([]);
    expect(s.canUndo).toBe(false);
    expect(s.undo()).toEqual([]);
  });
});

describe('tap: placement, relocation within a full room, removal, nudges', () => {
  it('a room holds one ghost: a tap elsewhere in it glides the ghost there, again and again', () => {
    const s = H3();
    s.tap(4); // room A at (1,0)
    expect(s.tap(8)).toEqual<PlayEvent[]>([
      { type: 'relocated', from: 4, to: 8, room: 0 },
      { type: 'status', cell: 8, from: 'calm', to: 'calm' },
    ]);
    expect(s.tap(0)).toEqual<PlayEvent[]>([
      { type: 'relocated', from: 8, to: 0, room: 0 },
      // (0,0) shares row 0 with the given at (0,3): both shiver, the given's room cools
      { type: 'status', cell: 0, from: 'calm', to: 'seen' },
      { type: 'status', cell: 3, from: 'calm', to: 'seen' },
      { type: 'unsettled', room: 0 },
      { type: 'unsettled', room: 1 },
    ]);
    expect(s.ghostCells()).toEqual([0, 3]);
    expect(s.ghostOf(0)).toBe(0);
  });

  it('relocation onto a marked cell clears the mark; undo glides back and restores it', () => {
    const s = H3();
    s.tap(4);
    s.stroke([8], 'paint');
    expect(s.tap(8)).toEqual<PlayEvent[]>([
      { type: 'relocated', from: 4, to: 8, room: 0 },
      { type: 'marked', cells: [8], on: false },
      { type: 'status', cell: 8, from: 'calm', to: 'calm' },
    ]);
    expect(s.undo()).toEqual<PlayEvent[]>([
      { type: 'relocated', from: 8, to: 4, room: 0 },
      { type: 'marked', cells: [8], on: true },
      { type: 'status', cell: 4, from: 'calm', to: 'calm' },
    ]);
    expect(s.markedCells()).toEqual([8]);
    expect(s.ghostCells()).toEqual([3, 4]);
  });

  it('a tap on a placed ghost removes it; the ghosts it saw calm down', () => {
    const s = H1();
    s.tap(1);
    expect(s.tap(1)).toEqual<PlayEvent[]>([
      { type: 'removed', cell: 1, room: 1 },
      { type: 'status', cell: 0, from: 'seen', to: 'calm' },
      { type: 'settled', room: 0 },
    ]);
    expect(s.ghostCells()).toEqual([0]);
  });

  it('furniture, lamps and givens only nudge; none of it is a move', () => {
    const s = new PlayState(EXAMPLE);
    expect(s.tap(e(0, 2))).toEqual([{ type: 'nudged', cell: e(0, 2) }]);
    expect(s.tap(e(2, 0))).toEqual([{ type: 'nudged', cell: e(2, 0) }]);
    const g = H3();
    expect(g.tap(3)).toEqual([{ type: 'nudged', cell: 3 }]);
    // an empty cell in the given's room: the given nudges, the tapped cell keeps its mark
    g.stroke([5], 'paint');
    expect(g.tap(5)).toEqual([{ type: 'nudged', cell: 3 }]);
    expect(g.markedCells()).toEqual([5]);
    expect(g.undo()).toEqual([{ type: 'marked', cells: [5], on: false }]);
    expect(g.canUndo).toBe(false);
    expect(s.canUndo).toBe(false);
  });

  it('a ghost may stand in the light (it squints); taps outside the board do nothing', () => {
    const s = new PlayState(EXAMPLE);
    expect(s.tap(e(2, 1))[1]).toEqual({ type: 'status', cell: e(2, 1), from: null, to: 'lit' });
    for (const bad of [-1, 25, 2.5, Number.NaN]) expect(s.tap(bad)).toEqual([]);
    expect(s.ghostCells()).toEqual([e(2, 1)]);
  });

  it('one move calms several ghosts: each gets its status event, in reading order', () => {
    const s = new PlayState(SQUARES);
    s.tap(0); // room 0 at (0,0)
    s.tap(2); // room 1 at (0,2): sees (0,0)
    s.tap(8); // room 2 at (2,0): sees (0,0)
    expect(view(s).ghosts).toEqual([
      [0, 'seen'],
      [2, 'seen'],
      [8, 'seen'],
    ]);
    expect(s.tap(5)).toEqual<PlayEvent[]>([
      { type: 'relocated', from: 0, to: 5, room: 0 },
      { type: 'status', cell: 2, from: 'seen', to: 'calm' },
      { type: 'status', cell: 5, from: 'seen', to: 'calm' },
      { type: 'status', cell: 8, from: 'seen', to: 'calm' },
      { type: 'settled', room: 0 },
      { type: 'settled', room: 1 },
      { type: 'settled', room: 2 },
    ]);
  });
});

describe('marks (GDD §3.1, D21)', () => {
  it('paint marks only empty, ghost-free, unmarked cells, lit ones included, once each', () => {
    const s = new PlayState(EXAMPLE);
    s.tap(e(1, 1));
    const ev = s.stroke(
      [e(1, 0), e(0, 2), e(2, 0), e(1, 1), e(2, 1), e(1, 0), 99, -3, e(2, 2)],
      'paint',
    );
    // (1,0) lit, (2,1) lit, (2,2) lit: marked; the bookshelf, the lamp and the ghost are not
    expect(ev).toEqual([{ type: 'marked', cells: [e(1, 0), e(2, 1), e(2, 2)], on: true }]);
    expect(s.stroke([e(1, 0)], 'paint')).toEqual([]);
  });

  it('erase clears the marked cells it passes; the mode follows the cell a drag starts on', () => {
    const s = H3();
    s.stroke([4, 5, 6, 7], 'paint');
    expect(s.strokeModeAt(5)).toBe('erase');
    expect(s.strokeModeAt(8)).toBe('paint');
    expect(s.stroke([5, 8, 6], 'erase')).toEqual([{ type: 'marked', cells: [5, 6], on: false }]);
    expect(s.markedCells()).toEqual([4, 7]);
    expect(s.stroke([8, 9], 'erase')).toEqual([]);
    // undo brings the erased marks back
    expect(s.undo()).toEqual([{ type: 'marked', cells: [5, 6], on: true }]);
    expect(s.markedCells()).toEqual([4, 5, 6, 7]);
  });

  it('a stroke that changes nothing is not a move', () => {
    const s = H3();
    expect(s.stroke([], 'paint')).toEqual([]);
    expect(s.stroke([3], 'paint')).toEqual([]);
    expect(s.canUndo).toBe(false);
  });
});

describe('undo (unlimited; every move kind, a hint included)', () => {
  it('each move kind undoes to exactly the board before it', () => {
    const s = H3();
    const moves: (() => PlayEvent[])[] = [
      () => s.tap(4), // place
      () => s.tap(8), // relocate
      () => s.stroke([12, 13], 'paint'),
      () => s.tap(13), // place on a mark
      () => s.stroke([12], 'erase'),
      () => s.tap(8), // remove
      () => s.tap(10), // relocate room 3 (13 → 10)
      () => s.hint(), // removes the wrong ghost at (2,2)
      () => s.hint(), // places the next solution ghost
    ];
    const views = [view(s)];
    for (const m of moves) {
      expect(m().length).toBeGreaterThan(0);
      views.push(view(s));
    }
    for (let k = moves.length - 1; k >= 0; k--) {
      expect(s.undo().length).toBeGreaterThan(0);
      expect(view(s)).toEqual(views[k]);
    }
    expect(s.canUndo).toBe(false);
  });

  it('undo events play back like any move (the screen ends equal to the rules)', () => {
    const s = H3();
    const screen = new Screen(view(s));
    for (const m of [
      () => s.tap(4),
      () => s.tap(0),
      () => s.stroke([9, 10], 'paint'),
      () => s.tap(10),
      () => s.hint(),
      () => s.undo(),
      () => s.undo(),
      () => s.undo(),
      () => s.undo(),
      () => s.undo(),
    ]) {
      screen.play(m());
      expect(screen.problems).toEqual([]);
      expect(screen.view()).toEqual(view(s));
    }
  });
});

describe('hint (GDD §3.1)', () => {
  it('the first wrong ghost in reading order floats away, then the next', () => {
    const s = H3();
    s.tap(9); // room D, its solution is (3,1)
    s.tap(4); // room A, its solution is (2,0)
    expect(s.hint()[0]).toEqual({ type: 'removed', cell: 4, room: 0 });
    expect(s.hint()[0]).toEqual({ type: 'removed', cell: 9, room: 3 });
    expect(s.ghostCells()).toEqual([3]);
  });

  it('otherwise the solution ghost of the room with the fewest free cells appears', () => {
    const s = H3();
    // free cells: A 2, B 1 (the given sees the rest), D 5 → B's ghost at (1,2)
    expect(s.hint()[0]).toEqual({ type: 'placed', cell: 6, room: 2 });
    expect(s.hint()[0]).toEqual({ type: 'placed', cell: 8, room: 0 });
    const last = s.hint();
    expect(last[0]).toEqual({ type: 'placed', cell: 13, room: 3 });
    expect(last.at(-1)).toEqual({ type: 'solved' });
    expect(s.hint()).toEqual([]);
  });

  it('ties go to the lowest room id; a hint on a marked cell clears the mark', () => {
    const s = new PlayState(SQUARES);
    s.stroke([0], 'paint');
    expect(s.hint().slice(0, 2)).toEqual([
      { type: 'placed', cell: 0, room: 0 },
      { type: 'marked', cells: [0], on: false },
    ]);
    // rooms 1 and 2 both keep 2 free cells now: room 1 first
    expect(s.hint()[0]).toEqual({ type: 'placed', cell: 6, room: 1 });
  });

  it('hints alone solve every tutorial house', () => {
    for (let k = 0; k < 3; k++) {
      const s = new PlayState(house(k));
      for (let guard = 0; guard < 10 && !s.solved; guard++) s.hint();
      expect(s.solved).toBe(true);
      expect(s.ghostCells()).toEqual([...house(k).solution].sort((a, b) => a - b));
    }
  });
});

describe('solved', () => {
  it('is announced once; afterwards the board ignores every move', () => {
    const s = H1();
    s.tap(3);
    expect(s.solved).toBe(true);
    const before = view(s);
    expect(s.tap(1)).toEqual([]);
    expect(s.tap(0)).toEqual([]);
    expect(s.stroke([1], 'paint')).toEqual([]);
    expect(s.hint()).toEqual([]);
    expect(s.undo()).toEqual([]);
    expect(view(s)).toEqual(before);
  });
});

describe('serialize and restore (the house in progress, GDD §9)', () => {
  it('round-trips the board: the player ghosts and the marks, without the undo history', () => {
    const s = H3();
    s.tap(4);
    s.tap(10);
    s.stroke([12, 15], 'paint');
    const saved = s.serialize();
    expect(saved).toEqual({ ghosts: [4, 10], marks: [12, 15] });
    const r = PlayState.restore(house(2), saved);
    expect(view(r)).toEqual(view(s));
    expect(r.canUndo).toBe(false);
  });

  it('never throws on a broken save and keeps only what fits the house', () => {
    const h = house(2);
    const r = PlayState.restore(h, {
      // out of range, not integers, the given's room (C), two in room D (9 < 10 wins), room A
      ghosts: [99, -1, 2.5, Number.NaN, 5, 10, 9, 4],
      // on a ghost, out of range, twice
      marks: [4, 12, 12, 300],
    });
    expect(r.ghostCells()).toEqual([3, 4, 9]);
    expect(r.markedCells()).toEqual([12]);
    const odd = PlayState.restore(h, { ghosts: 'x', marks: null } as unknown as {
      ghosts: number[];
      marks: number[];
    });
    expect(odd.ghostCells()).toEqual([3]);
  });

  it('a restored solved board stays solved and takes no moves', () => {
    const r = PlayState.restore(house(0), { ghosts: [3], marks: [] });
    expect(r.solved).toBe(true);
    expect(r.tap(1)).toEqual([]);
  });

  it('ghosts on furniture or lamps are dropped', () => {
    const r = PlayState.restore(EXAMPLE, { ghosts: [e(0, 2), e(2, 0), e(1, 1)], marks: [e(3, 3)] });
    expect(r.ghostCells()).toEqual([e(1, 1)]);
    expect(r.markedCells()).toEqual([]);
  });
});
