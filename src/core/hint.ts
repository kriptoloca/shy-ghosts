import { Grader, type Step } from '../gen/grade';
import { T1, T2, T3, T4 } from '../gen/params';
import { puzzleOf, type Puzzle } from '../gen/solve';
import type { HouseModel } from './house';

/** One hint (GDD §3.1): take a wrong ghost away, or show a solution ghost. */
export type HintStep = { kind: 'remove'; cell: number } | { kind: 'place'; cell: number };

/**
 * The hint step for a board where `ghosts[room]` is the cell of the room's ghost or null
 * (GDD §3.1, GENERATOR.md §2): if a ghost stands off the solution, the first such ghost in reading
 * order floats away; otherwise the solution ghost of the empty room with the fewest free candidate
 * cells (empty, unlit, seen by no ghost; ties: the lowest room id) appears. Null when every room
 * holds its solution ghost. Givens always stand on the solution (`houseErrors` checks it), so a
 * hint never takes one away.
 */
export function hintStep(house: HouseModel, ghosts: readonly (number | null)[]): HintStep | null {
  let wrong = Number.POSITIVE_INFINITY;
  for (let room = 0; room < ghosts.length; room++) {
    const cell = ghosts[room] ?? null;
    if (cell !== null && cell !== house.solution[room] && cell < wrong) wrong = cell;
  }
  if (wrong !== Number.POSITIVE_INFINITY) return { kind: 'remove', cell: wrong };

  const seen = new Array<boolean>(house.size).fill(false);
  for (const g of ghosts) {
    if (g === null) continue;
    for (const c of house.sees[g] ?? []) seen[c] = true;
  }
  let best: number | null = null;
  let bestFree = Number.POSITIVE_INFINITY;
  for (let room = 0; room < house.roomCount; room++) {
    if ((ghosts[room] ?? null) !== null) continue;
    const free = (house.roomCells[room] ?? []).filter((c) => house.candidate[c] && !seen[c]).length;
    if (free < bestFree) {
      best = room;
      bestFree = free;
    }
  }
  if (best === null) return null;
  return { kind: 'place', cell: house.solution[best] as number };
}

/**
 * The two-step hint's first press (D74): what the hint will do and why, without doing it. A wrong
 * ghost (the first in reading order) is shown to tremble inside a dashed outline. Otherwise the
 * grader runs from the board as it stands (every ghost on it is right, so each counts as a
 * resident) to its next forced placement: the room it goes in, its cell (kept hidden on screen),
 * and the rooms and segments the steps up to it use, plus the lines along which the ghosts on
 * the board see the room's other cells. Null when every room holds its solution ghost.
 */
export type HintExplain =
  | { kind: 'remove'; cell: number }
  | {
      kind: 'place';
      room: number;
      cell: number;
      segments: number[];
      rooms: number[];
      /** The reason, step by step (Gate B tune round 3 §2, D98). */
      beats: ReasonBeat[];
    };

/**
 * One beat of the hint's reason (Gate B tune round 3 §2, D98): what the board draws for one step
 * of the deduction from the board as it stands to the next forced ghost. Cells are the grader's
 * candidates at that step ("free cells"); `dots` and the cell of a cross or a chain are the cells
 * the step removes, which get hint dots.
 * - claim: a room lying in one line (`shape`, `lamp`, `line`); consecutive claims of one room and
 *   line are one beat. Its free cells glow, the line gets a band.
 * - count: k rooms filling k lines; the lines get bands with the digit k, the rooms' cells glow.
 * - cross: a see-through ghost on `cell`, rays along its row and column (`segments`), the room it
 *   would empty flashes (`flash`, its free cells).
 * - chain (manors): a ghost on `cell` forces the ghosts `forced` in turn until `room` empties.
 * - target, always last: the room the hint places in pulses with the digit 1; its other cells
 *   carry hint dots (`dots`) or the dotted line from the ghost on the board that sees them
 *   (`lines`, ghost then cell).
 */
export type ReasonBeat =
  | { kind: 'claim'; room: number; segment: number; glow: number[]; dots: number[] }
  | {
      kind: 'count';
      k: number;
      rooms: number[];
      segments: number[];
      glow: number[];
      dots: number[];
    }
  | { kind: 'cross'; cell: number; room: number; segments: number[]; flash: number[] }
  | { kind: 'chain'; cell: number; forced: number[]; room: number; flash: number[] }
  | { kind: 'target'; room: number; cell: number; dots: number[]; lines: [number, number][] };

/** The free cells (candidates) of rooms, ascending. */
function freeCells(p: Puzzle, cand: Uint8Array, rooms: readonly number[]): number[] {
  return rooms.flatMap((r) => (p.roomCells[r] ?? []).filter((c) => cand[c] === 1)).sort(by);
}

function by(a: number, b: number): number {
  return a - b;
}

/**
 * The chain from a ghost on `x` (the grader's T4, GENERATOR.md §4.3): the ghosts T0–T1 then force,
 * in the grader's order, and the room left with no free cell.
 */
function chainOf(
  p: Puzzle,
  start: Uint8Array,
  ghosts: Int32Array,
  x: number,
): { forced: number[]; room: number } {
  const cand = Uint8Array.from(start);
  const ghost = Int32Array.from(ghosts);
  const place = (c: number): void => {
    const room = p.roomOf[c] as number;
    ghost[room] = c;
    for (const j of p.roomCells[room] ?? []) cand[j] = 0;
    for (const j of p.sees[c] ?? []) cand[j] = 0;
  };
  place(x);
  const forced: number[] = [];
  for (;;) {
    let progressed = false;
    for (let r = 0; r < p.roomCount; r++) {
      if ((ghost[r] as number) >= 0) continue;
      const free = (p.roomCells[r] ?? []).filter((j) => cand[j] === 1);
      if (free.length === 0) return { forced, room: r };
      if (free.length === 1) {
        place(free[0] as number);
        forced.push(free[0] as number);
        progressed = true;
      }
    }
    if (!progressed) throw new Error(`chainOf: a ghost on ${String(x)} empties no room`);
  }
}

/** The beat of one grader step (not T1), from the candidates before it. */
function beatOf(p: Puzzle, s: Step, before: Uint8Array, ghost: Int32Array): ReasonBeat {
  if (s.tech === T3) {
    return {
      kind: 'count',
      k: s.rooms.length,
      rooms: [...s.rooms],
      segments: [...s.segments],
      glow: freeCells(p, before, s.rooms),
      dots: [...s.removed].sort(by),
    };
  }
  const x = s.removed[0] as number;
  if (s.tech === T2 && s.insight === 'cross') {
    return {
      kind: 'cross',
      cell: x,
      room: s.rooms[0] as number,
      segments: [...s.segments],
      flash: freeCells(p, before, s.rooms),
    };
  }
  if (s.tech === T2) {
    return {
      kind: 'claim',
      room: s.rooms[0] as number,
      segment: s.segments[0] as number,
      glow: freeCells(p, before, s.rooms),
      dots: [x],
    };
  }
  const chain = chainOf(p, before, ghost, x);
  return { kind: 'chain', cell: x, forced: chain.forced, room: chain.room, flash: [] };
}

export function hintExplain(
  house: HouseModel,
  ghosts: readonly (number | null)[],
): HintExplain | null {
  const step = hintStep(house, ghosts);
  if (!step) return null;
  if (step.kind === 'remove') return step;
  const placed = ghosts.filter((g): g is number => g !== null);
  const p = puzzleOf(house, house.roomOf, placed);
  const g = new Grader(p);
  const rooms = new Set<number>();
  const segments = new Set<number>();
  const beats: ReasonBeat[] = [];
  let cell = step.cell;
  for (;;) {
    const before = Uint8Array.from(g.cand);
    const ghost = Int32Array.from(g.ghost);
    const s = g.step(T4);
    if (s === 'stuck' || s === 'contradiction') break;
    for (const r of s.rooms) rooms.add(r);
    for (const seg of s.segments) segments.add(seg);
    if (s.tech === T1) {
      cell = s.placed as number;
      break;
    }
    const beat = beatOf(p, s, before, ghost);
    const last = beats.at(-1);
    // consecutive claims of one room and line are one beat
    if (
      beat.kind === 'claim' &&
      last?.kind === 'claim' &&
      last.room === beat.room &&
      last.segment === beat.segment
    ) {
      last.dots = [...last.dots, ...beat.dots].sort(by);
    } else beats.push(beat);
  }
  const room = house.roomOf[cell] as number;
  rooms.add(room);
  // the last beat: the target room, its other free-from-the-start cells dotted or seen
  const removed = new Set(beats.flatMap((b) => ('dots' in b ? b.dots : [b.cell])));
  const dots: number[] = [];
  const lines: [number, number][] = [];
  for (const c of house.roomCells[room] ?? []) {
    if (c === cell || !house.candidate[c]) continue;
    const seer = [...placed].sort(by).find((ghost) => (house.sees[ghost] ?? []).includes(c));
    if (seer !== undefined) lines.push([seer, c]);
    else if (removed.has(c)) dots.push(c);
  }
  beats.push({ kind: 'target', room, cell, dots, lines });
  // the lines along which the ghosts on the board see the room's other free cells
  for (const c of house.roomCells[room] ?? []) {
    if (c === cell || !house.candidate[c]) continue;
    for (const ghost of placed) {
      if (!(house.sees[ghost] ?? []).includes(c)) continue;
      segments.add(
        house.rowSeg[ghost] === house.rowSeg[c]
          ? (house.rowSeg[c] as number)
          : (house.colSeg[c] as number),
      );
    }
  }
  const sorted = (v: Set<number>): number[] => [...v].sort(by);
  return { kind: 'place', room, cell, segments: sorted(segments), rooms: sorted(rooms), beats };
}
