/**
 * The house model (GDD §3, GENERATOR.md §1–§2): parse the stored `rooms` and `objects` strings,
 * the row and column segments, sight, light and the candidate cells, and the quarter turn used
 * for the houses after 1000. Pure: no engine, no clock, no randomness.
 */

import { HOUSE_N_MAX, HOUSE_N_MIN, QUARTER_TURNS, ROOM_ID_RADIX, ROOM_MIN_CELLS } from '../config';

/** What a cell holds (GENERATOR.md §1.1 `objects`): empty, furniture or a lamp. */
export type CellObject = '.' | 'F' | 'L';

/** The stored fields the rules read (GENERATOR.md §1.1; the full record adds grade, role, …). */
export interface HouseData {
  /** Side length (HOUSE_N_MIN … HOUSE_N_MAX). */
  n: number;
  /** n² characters: the room id of each cell in base 36, canonical (GENERATOR.md §1.2). */
  rooms: string;
  /** n² characters: '.' empty, 'F' furniture, 'L' lamp. */
  objects: string;
  /** Cells of the residents that start placed (tutorial houses only), ascending. */
  givens: readonly number[];
  /** The cell of the ghost of each room id. */
  solution: readonly number[];
}

export type Axis = 'row' | 'col';

/** A maximal run of unblocked cells in one row or one column (GENERATOR.md §2). */
export interface Segment {
  axis: Axis;
  /** The row of a row segment, the column of a column segment. */
  line: number;
  /** Its cells, left to right or top to bottom. */
  cells: readonly number[];
}

/** Sight and light of a grid of objects: everything that does not depend on the rooms. */
export interface Geometry {
  readonly n: number;
  /** n². */
  readonly size: number;
  readonly objects: readonly CellObject[];
  /** Furniture and lamps: no ghost stands there; they stop sight and light. */
  readonly blocked: readonly boolean[];
  /** The index in `segments` of each cell's row and column segment; −1 on blocked cells. */
  readonly rowSeg: readonly number[];
  readonly colSeg: readonly number[];
  /** Row segments in reading order, then column segments column by column. */
  readonly segments: readonly Segment[];
  /** Reached by a lamp's light. */
  readonly lit: readonly boolean[];
  /** The lamps whose light reaches each cell, ascending (empty for unlit and blocked cells). */
  readonly lampsOf: readonly (readonly number[])[];
  /** The cells each cell sees, ascending (its row and column segment without itself). */
  readonly sees: readonly (readonly number[])[];
  /** Empty and unlit: where a solution ghost can stand. */
  readonly candidate: readonly boolean[];
}

/** A parsed house: everything the rules derive from the stored strings. */
export interface HouseModel extends Geometry {
  /** The room id of each cell. */
  readonly roomOf: readonly number[];
  readonly roomCount: number;
  /** The cells of each room id, ascending. */
  readonly roomCells: readonly (readonly number[])[];
  readonly givens: readonly number[];
  readonly solution: readonly number[];
}

const OBJECTS: readonly string[] = ['.', 'F', 'L'];
/** Up, left, right, down as (row, column) steps. */
const STEPS: readonly (readonly [number, number])[] = [
  [-1, 0],
  [0, -1],
  [0, 1],
  [1, 0],
];

function neighbours(n: number, i: number): number[] {
  const r = Math.floor(i / n);
  const c = i % n;
  const out: number[] = [];
  for (const [dr, dc] of STEPS) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr >= 0 && rr < n && cc >= 0 && cc < n) out.push(rr * n + cc);
  }
  return out;
}

function isCell(v: unknown, size: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < size;
}

/** Base-36 room id of a character, or −1 (only '0'–'9' and 'a'–'z' are ids). */
function roomId(ch: string): number {
  return /^[0-9a-z]$/.test(ch) ? parseInt(ch, ROOM_ID_RADIX) : -1;
}

/** True when every cell of `cells` is reachable from the first through 4-neighbours inside it. */
function connected(n: number, cells: readonly number[]): boolean {
  const inside = new Set(cells);
  const first = cells[0];
  if (first === undefined) return false;
  const seen = new Set([first]);
  const stack = [first];
  while (stack.length > 0) {
    const i = stack.pop() as number;
    for (const j of neighbours(n, i)) {
      if (inside.has(j) && !seen.has(j)) {
        seen.add(j);
        stack.push(j);
      }
    }
  }
  return seen.size === inside.size;
}

/**
 * Everything wrong with a house's data, as readable lines (empty when it is well formed). Checks
 * the structure only: the size, the strings, canonical connected rooms of ≥ 2 cells, one solution
 * ghost per room on an empty cell of that room, givens among them. That the solution obeys sight
 * and light, and is the only one, is the content pipeline's proof (GENERATOR.md §9, Gate A).
 */
export function houseErrors(d: HouseData): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(d.n) || d.n < HOUSE_N_MIN || d.n > HOUSE_N_MAX) {
    return [`size: n = ${String(d.n)} is outside ${String(HOUSE_N_MIN)}…${String(HOUSE_N_MAX)}`];
  }
  const size = d.n * d.n;
  if (typeof d.rooms !== 'string' || d.rooms.length !== size) {
    errors.push(`rooms: expected ${String(size)} characters`);
  }
  if (typeof d.objects !== 'string' || d.objects.length !== size) {
    errors.push(`objects: expected ${String(size)} characters`);
  }
  if (errors.length > 0) return errors;
  for (let i = 0; i < size; i++) {
    if (!OBJECTS.includes(d.objects[i] as string)) {
      errors.push(`objects: '${d.objects[i] as string}' at cell ${String(i)} is not . F or L`);
    }
  }
  const ids = [...d.rooms].map(roomId);
  let next = 0;
  ids.forEach((id, i) => {
    if (id < 0) errors.push(`room id: '${d.rooms[i] as string}' at cell ${String(i)}`);
    else if (id > next) {
      errors.push(`canonical: room ${String(id)} first appears at cell ${String(i)}`);
    } else if (id === next) next++;
  });
  if (errors.length > 0) return errors;
  const roomCount = next;
  const roomCells: number[][] = Array.from({ length: roomCount }, () => []);
  ids.forEach((id, i) => roomCells[id]?.push(i));
  roomCells.forEach((cells, room) => {
    if (cells.length < ROOM_MIN_CELLS) {
      errors.push(`cells: room ${String(room)} has ${String(cells.length)}`);
    } else if (!connected(d.n, cells)) {
      errors.push(`connected: room ${String(room)} is not 4-connected`);
    }
  });
  if (!Array.isArray(d.solution) || d.solution.length !== roomCount) {
    errors.push(`solution: expected one cell per room (${String(roomCount)})`);
  } else {
    d.solution.forEach((cell, room) => {
      if (!isCell(cell, size) || ids[cell] !== room || d.objects[cell] !== '.') {
        errors.push(`solution: room ${String(room)}'s ghost is not on an empty cell of the room`);
      }
    });
  }
  const givens = Array.isArray(d.givens) ? d.givens : [];
  if (!Array.isArray(d.givens)) errors.push('given: the givens are not a list');
  if (new Set(givens).size !== givens.length) errors.push('given: a cell is listed twice');
  for (const g of givens) {
    if (!isCell(g, size)) errors.push(`given: ${String(g)} is not a cell`);
    else if (!Array.isArray(d.solution) || d.solution[ids[g] as number] !== g) {
      errors.push(`given: cell ${String(g)} is not its room's solution ghost`);
    }
  }
  return errors;
}

/** Parses and derives a house; throws on malformed data (`houseErrors` says why). */
export function parseHouse(d: HouseData): HouseModel {
  const errors = houseErrors(d);
  if (errors.length > 0) throw new Error(`invalid house: ${errors.join('; ')}`);
  const roomOf = [...d.rooms].map(roomId);
  const roomCount = Math.max(...roomOf) + 1;
  const roomCells: number[][] = Array.from({ length: roomCount }, () => []);
  roomOf.forEach((room, i) => roomCells[room]?.push(i));
  return {
    ...geometry(d.n, d.objects),
    roomOf,
    roomCount,
    roomCells,
    givens: [...d.givens].sort((a, b) => a - b),
    solution: [...d.solution],
  };
}

/**
 * Segments, sight and light of an n × n grid of objects ('.', 'F', 'L'; GENERATOR.md §2). The
 * generator uses it before any room exists; `parseHouse` adds the rooms.
 */
export function geometry(n: number, objectString: string): Geometry {
  const size = n * n;
  const objects = [...objectString] as CellObject[];
  const blocked = objects.map((o) => o !== '.');

  const segments: Segment[] = [];
  const rowSeg = new Array<number>(size).fill(-1);
  const colSeg = new Array<number>(size).fill(-1);
  for (const axis of ['row', 'col'] as const) {
    for (let line = 0; line < n; line++) {
      let open: number[] | null = null;
      for (let k = 0; k < n; k++) {
        const i = axis === 'row' ? line * n + k : k * n + line;
        if (blocked[i]) {
          open = null;
          continue;
        }
        if (!open) {
          open = [];
          segments.push({ axis, line, cells: open });
        }
        open.push(i);
        (axis === 'row' ? rowSeg : colSeg)[i] = segments.length - 1;
      }
    }
  }

  const lampsOf: number[][] = Array.from({ length: size }, () => []);
  objects.forEach((o, i) => {
    if (o !== 'L') return;
    for (const [dr, dc] of STEPS) {
      let r = Math.floor(i / n) + dr;
      let c = (i % n) + dc;
      while (r >= 0 && r < n && c >= 0 && c < n && !blocked[r * n + c]) {
        lampsOf[r * n + c]?.push(i);
        r += dr;
        c += dc;
      }
    }
  });
  // lamps are visited in reading order, so each list is already ascending
  const lit = lampsOf.map((lamps) => lamps.length > 0);

  const sees = Array.from({ length: size }, (_, i) => {
    if (blocked[i]) return [];
    const row = segments[rowSeg[i] as number]?.cells ?? [];
    const col = segments[colSeg[i] as number]?.cells ?? [];
    return [...row, ...col].filter((j) => j !== i).sort((a, b) => a - b);
  });

  return {
    n,
    size,
    objects,
    blocked,
    rowSeg,
    colSeg,
    segments,
    lit,
    lampsOf,
    sees,
    candidate: objects.map((o, i) => o === '.' && !lit[i]),
  };
}

/** A cell a bookshelf hides from a lamp, and that shelf. */
export interface Shadow {
  cell: number;
  shelf: number;
}

/**
 * A lamp's shadows (house 10's lesson and its demonstration, D81, D83): along its row and column,
 * up, left, right then down, the cells past the first bookshelf, up to the edge or the next lamp,
 * each with that first shelf (a second shelf adds no shadow of its own). The one walk the build's
 * lesson test and the demonstration share, so the two cannot disagree (round 2's code audit,
 * DÜŞÜK 10).
 */
export function shadowsOf(n: number, objects: string | readonly string[], lamp: number): Shadow[] {
  const out: Shadow[] = [];
  for (const [dr, dc] of STEPS) {
    let shelf = -1;
    let r = Math.floor(lamp / n) + dr;
    let c = (lamp % n) + dc;
    for (; r >= 0 && r < n && c >= 0 && c < n; r += dr, c += dc) {
      const i = r * n + c;
      const o = objects[i];
      if (o === 'L') break;
      if (o === 'F') {
        if (shelf < 0) shelf = i;
      } else if (shelf >= 0) out.push({ cell: i, shelf });
    }
  }
  return out;
}

/**
 * Two different cells see each other: both unblocked and in one row or column segment, so room
 * walls and other ghosts never block sight (GDD §3).
 */
export function sees(h: HouseModel, a: number, b: number): boolean {
  if (a === b || h.blocked[a] !== false || h.blocked[b] !== false) return false;
  return h.rowSeg[a] === h.rowSeg[b] || h.colSeg[a] === h.colSeg[b];
}

/** Renumbers room ids in reading order of each room's first cell (GENERATOR.md §1.2). */
export function canonicalIds(ids: readonly number[]): { ids: number[]; map: Map<number, number> } {
  const map = new Map<number, number>();
  const out = ids.map((id) => {
    if (!map.has(id)) map.set(id, map.size);
    return map.get(id) as number;
  });
  return { ids: out, map };
}

function idString(ids: readonly number[]): string {
  return ids.map((id) => id.toString(ROOM_ID_RADIX)).join('');
}

/** A house written as rows (tutorial data, test fixtures): one symbol per room, any symbols. */
export interface HouseRows {
  /** Rows top to bottom; equal symbols are one room. */
  rooms: readonly string[];
  /** Rows of '.', 'F' and 'L'; all empty when left out. */
  objects?: readonly string[] | undefined;
  /** Residents as (row, column). */
  givens?: readonly (readonly [number, number])[];
  /** One ghost per room as (row, column), in any order. */
  solution: readonly (readonly [number, number])[];
}

/**
 * Rows of room symbols → canonical house data (GENERATOR.md §1.3). Throws on ragged rows or a
 * solution that is not one cell per room; `parseHouse` checks the rest.
 */
export function fromRows(spec: HouseRows): HouseData {
  const n = spec.rooms.length;
  const objectRows = spec.objects ?? spec.rooms.map((row) => '.'.repeat(row.length));
  const ragged = [...spec.rooms, ...objectRows].some((row) => [...row].length !== n);
  if (ragged || objectRows.length !== n) throw new Error('fromRows: rows must form an n × n grid');
  const symbols = spec.rooms.flatMap((row) => [...row]);
  const labels = new Map<string, number>();
  const { ids } = canonicalIds(
    symbols.map((s) => {
      if (!labels.has(s)) labels.set(s, labels.size);
      return labels.get(s) as number;
    }),
  );
  const cell = ([r, c]: readonly [number, number]): number => {
    const on = (v: number): boolean => Number.isInteger(v) && v >= 0 && v < n;
    if (!on(r) || !on(c))
      throw new Error(`fromRows: (${String(r)}, ${String(c)}) is off the board`);
    return r * n + c;
  };
  const roomCount = Math.max(-1, ...ids) + 1;
  if (roomCount > ROOM_ID_RADIX) {
    throw new Error(`fromRows: ${String(roomCount)} rooms, at most ${String(ROOM_ID_RADIX)}`);
  }
  const solution = new Array<number>(roomCount).fill(-1);
  for (const rc of spec.solution) {
    const i = cell(rc);
    const room = ids[i];
    if (room === undefined || solution[room] !== -1) {
      throw new Error(`fromRows: solution cell (${rc.join(', ')}) is outside or doubles a room`);
    }
    solution[room] = i;
  }
  if (solution.includes(-1)) throw new Error('fromRows: a room has no solution ghost');
  return {
    n,
    rooms: idString(ids),
    objects: objectRows.join(''),
    givens: (spec.givens ?? []).map(cell).sort((a, b) => a - b),
    solution,
  };
}

/** One quarter turn clockwise: (r, c) → (c, n − 1 − r), room ids re-canonicalized. */
function turnOnce(d: HouseData): HouseData {
  const n = d.n;
  const to = (i: number): number => (i % n) * n + (n - 1 - Math.floor(i / n));
  const oldIds = [...d.rooms].map(roomId);
  const ids = new Array<number>(n * n).fill(0);
  const objects = new Array<string>(n * n).fill('.');
  oldIds.forEach((id, i) => {
    ids[to(i)] = id;
    objects[to(i)] = d.objects[i] as string;
  });
  const canon = canonicalIds(ids);
  const solution = new Array<number>(d.solution.length).fill(-1);
  d.solution.forEach((c, room) => {
    solution[canon.map.get(room) as number] = to(c);
  });
  return {
    n,
    rooms: idString(canon.ids),
    objects: objects.join(''),
    givens: d.givens.map(to).sort((a, b) => a - b),
    solution,
  };
}

/**
 * The house turned `turns` quarter turns clockwise (negative turns go back). The rules are
 * symmetric, so the solution and its uniqueness carry over (GENERATOR.md §7, D14).
 */
export function rotate(d: HouseData, turns: number): HouseData {
  if (!Number.isInteger(turns)) throw new Error(`rotate: ${String(turns)} is not a whole turn`);
  const t = ((turns % QUARTER_TURNS) + QUARTER_TURNS) % QUARTER_TURNS;
  let out: HouseData = {
    n: d.n,
    rooms: d.rooms,
    objects: d.objects,
    givens: [...d.givens].sort((a, b) => a - b),
    solution: [...d.solution],
  };
  for (let k = 0; k < t; k++) out = turnOnce(out);
  return out;
}
