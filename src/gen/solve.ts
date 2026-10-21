import type { Geometry } from '../core/house';
import { SOLUTION_LIMIT, SOLVER_NODE_LIMIT } from './params';

/** Rooms over a geometry: what the solver, the grader and the players read (a HouseModel is one). */
export interface Puzzle extends Geometry {
  readonly roomOf: readonly number[];
  readonly roomCount: number;
  readonly roomCells: readonly (readonly number[])[];
  readonly givens: readonly number[];
}

/** A puzzle from a geometry and the room id of every cell (the generator's houses in progress). */
export function puzzleOf(
  geo: Geometry,
  roomOf: readonly number[],
  givens: readonly number[] = [],
): Puzzle {
  const roomCount = roomOf.reduce((m, r) => Math.max(m, r + 1), 0);
  const roomCells: number[][] = Array.from({ length: roomCount }, () => []);
  roomOf.forEach((r, i) => roomCells[r]?.push(i));
  return { ...geo, roomOf, roomCount, roomCells, givens };
}

export interface SolveResult {
  /** Solutions found, up to the limit. */
  count: number;
  /** Each: the cell of every room id's ghost. */
  solutions: number[][];
  nodes: number;
}

export interface SolveOptions {
  /** Stop after this many solutions (default 2: enough to know whether a house is unique). */
  limit?: number;
  /** Place the givens first (default true). */
  givens?: boolean;
  nodeLimit?: number;
}

/**
 * The exact solver (GENERATOR.md §3): backtracking over rooms, always the unsettled room with the
 * fewest candidates first (ties: the lower id); a room's candidates are its empty, unlit cells no
 * placed ghost sees. Counts solutions up to `limit` and returns them. Past `nodeLimit` it throws:
 * the build fails loudly instead of guessing (never a time limit, so the files stay byte-stable).
 */
export function solve(p: Puzzle, opts: SolveOptions = {}): SolveResult {
  const limit = opts.limit ?? SOLUTION_LIMIT;
  const nodeLimit = opts.nodeLimit ?? SOLVER_NODE_LIMIT;
  const R = p.roomCount;
  const roomCand: number[][] = p.roomCells.map((cells) => cells.filter((c) => p.candidate[c]));
  const seen = new Int32Array(p.size);
  const ghost = new Int32Array(R).fill(-1);
  const sees = p.sees;
  const place = (c: number, delta: number): void => {
    for (const j of sees[c] ?? []) seen[j] = (seen[j] as number) + delta;
  };
  let placed = 0;
  if (opts.givens ?? true) {
    for (const g of p.givens) {
      ghost[p.roomOf[g] as number] = g;
      place(g, 1);
      placed++;
    }
  }
  const solutions: number[][] = [];
  let nodes = 0;
  const rec = (): boolean => {
    nodes++;
    if (nodes > nodeLimit) {
      throw new Error(`solve: node limit ${String(nodeLimit)} reached; the house is too open`);
    }
    if (placed === R) {
      solutions.push(Array.from(ghost));
      return solutions.length >= limit;
    }
    let best = -1;
    let bestCount = Number.POSITIVE_INFINITY;
    for (let r = 0; r < R; r++) {
      if ((ghost[r] as number) >= 0) continue;
      let k = 0;
      for (const c of roomCand[r] as number[]) if (seen[c] === 0) k++;
      if (k < bestCount) {
        bestCount = k;
        best = r;
        if (k === 0) return false;
      }
    }
    for (const c of roomCand[best] as number[]) {
      if (seen[c] !== 0) continue;
      ghost[best] = c;
      place(c, 1);
      placed++;
      const stop = rec();
      placed--;
      place(c, -1);
      ghost[best] = -1;
      if (stop) return true;
    }
    return false;
  };
  rec();
  return { count: solutions.length, solutions, nodes };
}
