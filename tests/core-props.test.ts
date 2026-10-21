import { describe, expect, it } from 'vitest';
import { parseHouse, type HouseData, type HouseModel } from '../src/core/house';
import { PlayState, type PlayEvent } from '../src/core/state';
import { Rng } from '../src/gen/rng';
import { bruteLamps, bruteSees, bruteStatus } from './support/brute';
import { randomHouse } from './support/houses';
import { Screen, view, type View } from './support/screen';

/**
 * The rules over 2,000 random houses (GENERATOR.md §11, TASKS.md Epic 1): random move sequences of
 * every kind (taps anywhere, strokes in both modes, undos, hints), checked after every move.
 */
const HOUSES = 2000;
const MOVES_MAX = 40;
const PROPS_TIMEOUT_MS = 120_000;

type Move =
  | { kind: 'tap'; cell: number }
  | { kind: 'stroke'; cells: number[] }
  | { kind: 'undo' }
  | { kind: 'hint' };

function randomMoves(rng: Rng, h: HouseModel): Move[] {
  return Array.from({ length: rng.int(1, MOVES_MAX) }, (): Move => {
    const x = rng.next();
    if (x < 0.55) return { kind: 'tap', cell: rng.int(0, h.size - 1) };
    if (x < 0.75) {
      // a drag path: a few cells, sometimes repeating one
      return {
        kind: 'stroke',
        cells: Array.from({ length: rng.int(1, 6) }, () => rng.int(0, h.size - 1)),
      };
    }
    if (x < 0.9) return { kind: 'undo' };
    return { kind: 'hint' };
  });
}

function apply(s: PlayState, m: Move): PlayEvent[] {
  switch (m.kind) {
    case 'tap':
      return s.tap(m.cell);
    case 'stroke':
      return s.stroke(m.cells, s.strokeModeAt(m.cells[0] as number));
    case 'undo':
      return s.undo();
    case 'hint':
      return s.hint();
  }
}

/** The same houses and moves for every property (one seed each). */
function* cases(seed: number): Generator<{ d: HouseData; h: HouseModel; moves: Move[] }> {
  const rng = new Rng(seed);
  for (let k = 0; k < HOUSES; k++) {
    const d = randomHouse(rng, 2, 9);
    const h = parseHouse(d);
    yield { d, h, moves: randomMoves(rng, h) };
  }
}

const MOVE_EVENTS = new Set(['placed', 'relocated', 'removed', 'nudged', 'marked']);

/** Move events first, then states in reading order, then rooms by id, then `solved` last. */
function orderProblems(ev: readonly PlayEvent[]): string[] {
  const rank = (e: PlayEvent): number =>
    MOVE_EVENTS.has(e.type) ? 0 : e.type === 'status' ? 1 : e.type === 'solved' ? 3 : 2;
  const out: string[] = [];
  for (let i = 1; i < ev.length; i++) {
    const a = ev[i - 1] as PlayEvent;
    const b = ev[i] as PlayEvent;
    if (rank(a) > rank(b)) out.push(`${a.type} before ${b.type}`);
    if (a.type === 'status' && b.type === 'status' && a.cell >= b.cell) out.push('status order');
    const room = (e: PlayEvent): number => ('room' in e && rank(e) === 2 ? e.room : -1);
    if (rank(a) === 2 && rank(b) === 2 && room(a) >= room(b)) out.push('room order');
  }
  return out;
}

describe('rules: properties over 2,000 random houses', () => {
  it(
    'a random move sequence equals its replay, event for event',
    () => {
      for (const { h, moves } of cases(2026)) {
        const a = new PlayState(h);
        const logA = moves.map((m) => apply(a, m));
        const b = new PlayState(h);
        const logB = moves.map((m) => apply(b, m));
        expect(logB).toEqual(logA);
        expect(view(b)).toEqual(view(a));
        expect(b.serialize()).toEqual(a.serialize());
      }
    },
    PROPS_TIMEOUT_MS,
  );

  it(
    'played back on a screen, the events always end equal to the rules, in a fixed order',
    () => {
      for (const { h, moves } of cases(77)) {
        const s = new PlayState(h);
        const screen = new Screen(s.house, view(s));
        const problems: string[] = [];
        for (const m of moves) {
          const ev = apply(s, m);
          screen.play(ev);
          problems.push(...orderProblems(ev));
          if (JSON.stringify(screen.view()) !== JSON.stringify(view(s))) {
            problems.push(
              `screen ${JSON.stringify(screen.view())} ≠ rules ${JSON.stringify(view(s))}`,
            );
          }
        }
        expect([...screen.problems, ...problems]).toEqual([]);
      }
    },
    PROPS_TIMEOUT_MS,
  );

  it(
    'every ghost state equals a brute-force sight and light check; rooms and the win follow',
    () => {
      for (const { d, h, moves } of cases(4242)) {
        const s = new PlayState(h);
        const problems: string[] = [];
        const check = (): void => {
          const ghosts = s.ghostCells();
          for (const g of ghosts) {
            const want = bruteStatus(d.n, d.objects, ghosts, g);
            if (s.statusAt(g) !== want)
              problems.push(`ghost ${String(g)}: ${String(s.statusAt(g))} ≠ ${want}`);
          }
          // one ghost per room at most, on an empty cell of that room; givens never move
          const rooms = ghosts.map((g) => h.roomOf[g]);
          if (new Set(rooms).size !== rooms.length) problems.push('two ghosts in one room');
          if (ghosts.some((g) => h.blocked[g])) problems.push('a ghost on a blocked cell');
          if (h.givens.some((g) => !ghosts.includes(g))) problems.push('a given moved');
          for (let r = 0; r < h.roomCount; r++) {
            const g = s.ghostOf(r);
            const settled = g !== null && s.statusAt(g) === 'calm';
            if (s.isSettled(r) !== settled) problems.push(`room ${String(r)} settled flag`);
          }
          const all = [...Array(h.roomCount).keys()].every((r) => s.isSettled(r));
          if (s.solved !== all) problems.push('solved flag');
          // marks only on empty, ghost-free cells
          for (const m of s.markedCells()) {
            if (h.blocked[m] || ghosts.includes(m)) problems.push(`mark on ${String(m)}`);
          }
        };
        check();
        for (const m of moves) {
          const ev = apply(s, m);
          check();
          // a status names exactly the ghosts that see it and the lamps that light it (D48)
          const ghosts = s.ghostCells();
          for (const e of ev) {
            if (e.type !== 'status') continue;
            const by = ghosts.filter((g) => bruteSees(d.n, d.objects, e.cell, g));
            if (e.by.join() !== by.join()) problems.push(`by of ${String(e.cell)}`);
            const lamps = bruteLamps(d.n, d.objects, e.cell);
            if (e.lamps.join() !== lamps.join()) problems.push(`lamps of ${String(e.cell)}`);
          }
        }
        expect(problems).toEqual([]);
      }
    },
    PROPS_TIMEOUT_MS,
  );

  it(
    'undo gives back exactly the board before each move; a solved board takes no moves',
    () => {
      for (const { h, moves } of cases(99)) {
        const s = new PlayState(h);
        const start = view(s);
        const stack: View[] = [];
        for (const m of moves) {
          const before = view(s);
          const wasSolved = s.solved;
          const ev = apply(s, m);
          if (wasSolved) {
            expect(ev).toEqual([]);
            expect(view(s)).toEqual(before);
            continue;
          }
          if (m.kind === 'undo') {
            const back = stack.pop();
            if (back) expect(view(s)).toEqual(back);
            else expect(ev).toEqual([]);
          } else if (ev.some((e) => e.type !== 'nudged')) {
            stack.push(before);
          } else {
            expect(view(s)).toEqual(before);
          }
          expect(s.canUndo).toBe(stack.length > 0 && !s.solved);
        }
        if (!s.solved) {
          while (s.canUndo) s.undo();
          expect(view(s)).toEqual(start);
        }
      }
    },
    PROPS_TIMEOUT_MS,
  );

  it(
    'a saved board restores to the same ghosts, states, marks, settled rooms and win',
    () => {
      for (const { h, moves } of cases(5)) {
        const s = new PlayState(h);
        for (const m of moves) apply(s, m);
        const r = PlayState.restore(h, s.serialize());
        expect(view(r)).toEqual(view(s));
        expect(r.serialize()).toEqual(s.serialize());
      }
    },
    PROPS_TIMEOUT_MS,
  );
});
