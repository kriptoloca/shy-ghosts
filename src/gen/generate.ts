import { ROOM_ID_RADIX, ROOM_MIN_CELLS } from '../config';
import { canonicalIds, geometry, type Geometry } from '../core/house';
import {
  ROOM_MAX_FACTOR,
  SOLUTION_PICK_NODE_LIMIT,
  UNIQUE_FIX_ALTERNATIVES,
  UNIQUE_FIX_MOVES,
  type Band,
} from './params';
import { Rng } from './rng';
import { puzzleOf, solve, type Puzzle } from './solve';

/** A house the generator made: unique, not yet graded (GENERATOR.md §6, steps 1–5). */
export interface Candidate {
  seed: number;
  n: number;
  /** n² characters: '.', 'F', 'L'. */
  objects: string;
  /** n² characters: canonical base-36 room ids (GENERATOR.md §1.2). */
  rooms: string;
  /** The cell of each canonical room id's ghost: the only solution. */
  solution: number[];
  puzzle: Puzzle;
}

/** Why a seed gave no candidate (the build counts them). */
export interface Rejection {
  rejected: 'segments' | 'solution' | 'rooms' | 'unique';
}

function neighbours(n: number, i: number): number[] {
  const r = Math.floor(i / n);
  const c = i % n;
  const out: number[] = [];
  if (r > 0) out.push(i - n);
  if (c > 0) out.push(i - 1);
  if (c < n - 1) out.push(i + 1);
  if (r < n - 1) out.push(i + n);
  return out;
}

/**
 * Steps 1–5 of GENERATOR.md §6 for one seed: objects, the room count, a solution, rooms grown from
 * it, and border moves until no second solution is left. Pure and deterministic for the seed.
 */
export function makeCandidate(band: Band, seed: number): Candidate | Rejection {
  const rng = new Rng(seed);
  // 1. the side, then lamps and furniture on distinct random cells
  const n = rng.pick(band.sides);
  const size = n * n;
  const furniture = rng.int(band.furniture[0], band.furniture[1]);
  const lamps = rng.int(band.lamps[0], band.lamps[1]);
  const cells = rng.shuffle([...Array(size).keys()]);
  const objects = new Array<string>(size).fill('.');
  cells.forEach((c, k) => {
    if (k < lamps) objects[c] = 'L';
    else if (k < lamps + furniture) objects[c] = 'F';
  });
  const geo = geometry(n, objects.join(''));
  // 2. the room count, capped by the row and the column segments that can hold a ghost: a
  // segment holds one ghost at most, and one that is lit from end to end holds none (D19, D53)
  const offset = band.roomsFromSide ? n : 0;
  const lo = band.rooms[0] + offset;
  const hi = band.rooms[1] + offset;
  const open = geo.segments.filter((s) => s.cells.some((c) => geo.candidate[c]));
  const rows = open.filter((s) => s.axis === 'row').length;
  const cap = Math.min(rows, open.length - rows);
  const drawn = rng.int(lo, hi);
  if (cap < lo) return { rejected: 'segments' };
  const R = Math.min(drawn, cap);
  // 3. a solution: R empty, unlit cells, no two seeing each other
  const solution = pickSolution(geo, R, rng);
  if (!solution) return { rejected: 'solution' };
  // 4. rooms grown from the solution cells
  const room = growRooms(geo, solution, rng);
  if (!room) return { rejected: 'rooms' };
  // 5. border moves until the stored solution is the only one
  if (!makeUnique(geo, room, solution, rng)) return { rejected: 'unique' };
  const canon = canonicalIds(room);
  if (canon.map.size > ROOM_ID_RADIX) return { rejected: 'rooms' };
  const byRoom = new Array<number>(R).fill(-1);
  solution.forEach((c, k) => {
    byRoom[canon.map.get(k) as number] = c;
  });
  return {
    seed,
    n,
    objects: objects.join(''),
    rooms: canon.ids.map((id) => id.toString(ROOM_ID_RADIX)).join(''),
    solution: byRoom,
    puzzle: puzzleOf(geo, canon.ids),
  };
}

/**
 * Randomized backtracking over the shuffled candidate cells, with a node limit (step 3). A branch
 * stops as soon as the cells still open cannot span enough row and column segments for the ghosts
 * still missing (each segment holds one ghost at most): without it most 7 × 7 searches ran out of
 * nodes (D53).
 */
function pickSolution(geo: Geometry, R: number, rng: Rng): number[] | null {
  const order = rng.shuffle(geo.candidate.flatMap((ok, i) => (ok ? [i] : [])));
  const chosen: number[] = [];
  const hit = new Int32Array(geo.size);
  const rowsOpen = new Set<number>();
  const colsOpen = new Set<number>();
  /** How many more ghosts the open cells from `start` on could hold at most. */
  const room = (start: number): number => {
    rowsOpen.clear();
    colsOpen.clear();
    for (let k = start; k < order.length; k++) {
      const c = order[k] as number;
      if (hit[c] !== 0) continue;
      rowsOpen.add(geo.rowSeg[c] as number);
      colsOpen.add(geo.colSeg[c] as number);
    }
    return Math.min(rowsOpen.size, colsOpen.size);
  };
  let nodes = 0;
  const rec = (start: number): boolean => {
    if (chosen.length === R) return true;
    if (++nodes > SOLUTION_PICK_NODE_LIMIT) return false;
    if (room(start) < R - chosen.length) return false;
    for (let k = start; k < order.length; k++) {
      const c = order[k] as number;
      if (hit[c] !== 0) continue;
      chosen.push(c);
      for (const j of geo.sees[c] ?? []) hit[j] = (hit[j] as number) + 1;
      if (rec(k + 1)) return true;
      chosen.pop();
      for (const j of geo.sees[c] ?? []) hit[j] = (hit[j] as number) - 1;
    }
    return false;
  };
  return rec(0) ? chosen : null;
}

/**
 * Randomized flood fill from the solution cells until every cell, furniture and lamps included,
 * belongs to a room: each step picks a room with weight 1 / size² among those next to an
 * unassigned cell (it keeps the sizes even), then one of its unassigned neighbours (step 4).
 * Null when a room ends with fewer than 2 cells or more than 2.5 × the average.
 */
function growRooms(geo: Geometry, solution: readonly number[], rng: Rng): number[] | null {
  const n = geo.n;
  const room = new Array<number>(geo.size).fill(-1);
  const sizes = solution.map(() => 1);
  solution.forEach((c, k) => {
    room[c] = k;
  });
  let left = geo.size - solution.length;
  while (left > 0) {
    const frontier: number[][] = solution.map(() => []);
    for (let i = 0; i < geo.size; i++) {
      if (room[i] !== -1) continue;
      for (const j of neighbours(n, i)) {
        const r = room[j] as number;
        if (r !== -1 && !(frontier[r] as number[]).includes(i)) (frontier[r] as number[]).push(i);
      }
    }
    const open = frontier.flatMap((f, r) => (f.length > 0 ? [r] : []));
    const r = open[rng.weighted(open.map((x) => 1 / (sizes[x] as number) ** 2))] as number;
    const cell = rng.pick(frontier[r] as number[]);
    room[cell] = r;
    sizes[r] = (sizes[r] as number) + 1;
    left--;
  }
  const max = (ROOM_MAX_FACTOR * geo.size) / solution.length;
  return sizes.every((s) => s >= ROOM_MIN_CELLS && s <= max) ? room : null;
}

/** Room `x` stays 4-connected without cell `c`. */
function connectedWithout(n: number, room: readonly number[], x: number, c: number): boolean {
  const cells: number[] = [];
  room.forEach((r, i) => {
    if (r === x && i !== c) cells.push(i);
  });
  const first = cells[0];
  if (first === undefined) return false;
  const seen = new Set([first]);
  const stack = [first];
  while (stack.length > 0) {
    const i = stack.pop() as number;
    for (const j of neighbours(n, i)) {
      if (j !== c && room[j] === x && !seen.has(j)) {
        seen.add(j);
        stack.push(j);
      }
    }
  }
  return seen.size === cells.length;
}

/**
 * Step 5: while a second solution exists, move a cell it uses (and the stored one does not) into a
 * 4-adjacent other room Y, keeping the old room connected with ≥ 2 cells and Y ≤ 2.5 × the average
 * (Y then holds two of that solution's ghosts, so it breaks). At most UNIQUE_FIX_MOVES moves.
 */
function makeUnique(geo: Geometry, room: number[], solution: readonly number[], rng: Rng): boolean {
  const R = solution.length;
  const max = (ROOM_MAX_FACTOR * geo.size) / R;
  const sizes = new Array<number>(R).fill(0);
  for (const r of room) sizes[r] = (sizes[r] as number) + 1;
  const stored = new Set(solution);
  for (let move = 0; move <= UNIQUE_FIX_MOVES; move++) {
    // the stored solution plus up to UNIQUE_FIX_ALTERNATIVES others
    const res = solve(puzzleOf(geo, room), { givens: false, limit: UNIQUE_FIX_ALTERNATIVES + 1 });
    if (res.count === 1) return true;
    if (res.count === 0 || move === UNIQUE_FIX_MOVES) return false;
    const others = res.solutions.filter((s) => s.some((c, r) => c !== solution[r]));
    let moved = false;
    for (const other of others) {
      for (const c of rng.shuffle(other.filter((x) => !stored.has(x)))) {
        const x = room[c] as number;
        if ((sizes[x] as number) - 1 < ROOM_MIN_CELLS) continue;
        for (const j of rng.shuffle(neighbours(geo.n, c).filter((k) => room[k] !== x))) {
          const y = room[j] as number;
          if ((sizes[y] as number) + 1 > max) continue;
          if (!connectedWithout(geo.n, room, x, c)) break;
          room[c] = y;
          sizes[x] = (sizes[x] as number) - 1;
          sizes[y] = (sizes[y] as number) + 1;
          moved = true;
          break;
        }
        if (moved) break;
      }
      if (moved) break;
    }
    if (!moved) return false;
  }
  return false;
}
