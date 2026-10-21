import type { HouseData } from '../../src/core/house';

/**
 * Brute-force rule checks written straight from GDD §3, independent of src/core's segments: walk
 * the grid cell by cell. The property tests compare the rules with these.
 */

export type BruteStatus = 'calm' | 'seen' | 'lit';

const DIRS: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

/** A lamp's light reaches cell `i`: walking from `i` in some direction, the first object met is a
 * lamp (nothing blocks between). */
export function bruteLit(n: number, objects: string, i: number): boolean {
  if (objects[i] !== '.') return false;
  const r0 = Math.floor(i / n);
  const c0 = i % n;
  for (const [dr, dc] of DIRS) {
    let r = r0 + dr;
    let c = c0 + dc;
    while (r >= 0 && r < n && c >= 0 && c < n) {
      const o = objects[r * n + c];
      if (o !== '.') {
        if (o === 'L') return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return false;
}

/** Two different empty-kind cells see each other: same row or column, nothing blocked between. */
export function bruteSees(n: number, objects: string, a: number, b: number): boolean {
  if (a === b || objects[a] !== '.' || objects[b] !== '.') return false;
  const ra = Math.floor(a / n);
  const ca = a % n;
  const rb = Math.floor(b / n);
  const cb = b % n;
  if (ra === rb) {
    for (let c = Math.min(ca, cb) + 1; c < Math.max(ca, cb); c++) {
      if (objects[ra * n + c] !== '.') return false;
    }
    return true;
  }
  if (ca === cb) {
    for (let r = Math.min(ra, rb) + 1; r < Math.max(ra, rb); r++) {
      if (objects[r * n + ca] !== '.') return false;
    }
    return true;
  }
  return false;
}

/** The state of the ghost on `g` among `ghosts` (seen wins over lit, D26). */
export function bruteStatus(
  n: number,
  objects: string,
  ghosts: readonly number[],
  g: number,
): BruteStatus {
  if (ghosts.some((h) => h !== g && bruteSees(n, objects, g, h))) return 'seen';
  if (bruteLit(n, objects, g)) return 'lit';
  return 'calm';
}

export function roomIds(data: HouseData): number[] {
  return [...data.rooms].map((ch) => parseInt(ch, 36));
}

/**
 * Solutions of a house by plain backtracking over the rooms in id order: one ghost per room on an
 * empty cell, none lit, none seeing another, the givens fixed (when `givens`). Stops at `cap`.
 */
export function bruteSolutions(
  data: HouseData,
  opts: { givens: boolean; cap: number },
): number[][] {
  const { n, objects } = data;
  const ids = roomIds(data);
  const roomCount = Math.max(...ids) + 1;
  const cellsOf: number[][] = Array.from({ length: roomCount }, () => []);
  ids.forEach((r, i) => {
    if (objects[i] === '.' && !bruteLit(n, objects, i)) cellsOf[r]?.push(i);
  });
  const fixed = new Map<number, number>();
  if (opts.givens) for (const g of data.givens) fixed.set(ids[g] as number, g);
  const out: number[][] = [];
  const chosen: number[] = [];
  const rec = (room: number): void => {
    if (out.length >= opts.cap) return;
    if (room === roomCount) {
      out.push([...chosen]);
      return;
    }
    const options = fixed.has(room) ? [fixed.get(room) as number] : (cellsOf[room] ?? []);
    for (const c of options) {
      if (chosen.some((h) => bruteSees(n, objects, c, h))) continue;
      if (bruteLit(n, objects, c)) continue;
      chosen.push(c);
      rec(room + 1);
      chosen.pop();
    }
  };
  rec(0);
  return out;
}

/** `cells` (one per room id) is a solution: each in its room on an unlit empty cell, the givens
 * among them, no two seeing each other. */
export function isSolution(data: HouseData, cells: readonly number[]): boolean {
  const ids = roomIds(data);
  const roomCount = Math.max(...ids) + 1;
  if (cells.length !== roomCount) return false;
  if (cells.some((c, room) => ids[c] !== room || data.objects[c] !== '.')) return false;
  if (cells.some((c) => bruteLit(data.n, data.objects, c))) return false;
  if (data.givens.some((g) => !cells.includes(g))) return false;
  return cells.every((a, i) =>
    cells.every((b, j) => i === j || !bruteSees(data.n, data.objects, a, b)),
  );
}
