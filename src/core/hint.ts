import { Grader } from '../gen/grade';
import { T4 } from '../gen/params';
import { puzzleOf } from '../gen/solve';
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
  | { kind: 'place'; room: number; cell: number; segments: number[]; rooms: number[] };

export function hintExplain(
  house: HouseModel,
  ghosts: readonly (number | null)[],
): HintExplain | null {
  const step = hintStep(house, ghosts);
  if (!step) return null;
  if (step.kind === 'remove') return step;
  const placed = ghosts.filter((g): g is number => g !== null);
  const g = new Grader(puzzleOf(house, house.roomOf, placed));
  const rooms = new Set<number>();
  const segments = new Set<number>();
  let cell = step.cell;
  for (;;) {
    const s = g.step(T4);
    if (s === 'stuck' || s === 'contradiction') break;
    for (const r of s.rooms) rooms.add(r);
    for (const seg of s.segments) segments.add(seg);
    if (s.placed !== null) {
      cell = s.placed;
      break;
    }
  }
  const room = house.roomOf[cell] as number;
  rooms.add(room);
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
  const sorted = (v: Set<number>): number[] => [...v].sort((a, b) => a - b);
  return { kind: 'place', room, cell, segments: sorted(segments), rooms: sorted(rooms) };
}
