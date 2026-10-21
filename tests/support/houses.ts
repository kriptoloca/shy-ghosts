import { fromRows, type HouseData } from '../../src/core/house';
import type { Rng } from '../../src/gen/rng';
import { bruteLit, bruteSees } from './brute';

/** One symbol per room in the test houses' rows (more than any test house needs). */
const SYMBOLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

type RC = readonly [number, number];

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
 * A house from rows whose rooms need not admit a solution (the worked examples are about sight,
 * not puzzles): each room's first empty cell, or its given, stands in for its solution ghost.
 */
export function rowsHouse(
  rooms: readonly string[],
  objects?: readonly string[],
  givens: readonly RC[] = [],
): HouseData {
  const stand = new Map<string, RC>();
  rooms.forEach((row, r) => {
    [...row].forEach((sym, c) => {
      const o = objects?.[r]?.[c] ?? '.';
      if (o === '.' && !stand.has(sym)) stand.set(sym, [r, c]);
    });
  });
  for (const [r, c] of givens) stand.set(rooms[r]?.[c] ?? '', [r, c]);
  return fromRows({ rooms, objects, givens, solution: [...stand.values()] });
}

/**
 * A random house in the generator's shape (GENERATOR.md §6, steps 1–4, without the uniqueness
 * step): furniture and lamps on random cells, a solution of mutually unseen unlit empty cells,
 * rooms grown from it by random flood fill, every room ≥ 2 cells, sometimes one given. It may
 * have more than one solution; its stored one is valid.
 */
export function randomHouse(rng: Rng, nMin = 2, nMax = 7): HouseData {
  for (;;) {
    const n = rng.int(nMin, nMax);
    const size = n * n;
    const density = rng.float(0, 0.3);
    const lampShare = rng.float(0, 0.6);
    const objects = Array.from({ length: size }, () =>
      rng.chance(density) ? (rng.chance(lampShare) ? 'L' : 'F') : '.',
    ).join('');
    const free = [...Array(size).keys()].filter(
      (i) => objects[i] === '.' && !bruteLit(n, objects, i),
    );
    if (free.length === 0) continue;
    rng.shuffle(free);
    const want = rng.int(1, Math.min(free.length, SYMBOLS.length));
    const solution: number[] = [];
    for (const c of free) {
      if (solution.length >= want) break;
      if (solution.some((h) => bruteSees(n, objects, c, h))) continue;
      solution.push(c);
    }
    const room = new Array<number>(size).fill(-1);
    solution.forEach((c, k) => {
      room[c] = k;
    });
    let left = size - solution.length;
    while (left > 0) {
      const options: [number, number][] = [];
      for (let i = 0; i < size; i++) {
        if (room[i] !== -1) continue;
        for (const j of neighbours(n, i)) {
          const k = room[j] as number;
          if (k !== -1) options.push([i, k]);
        }
      }
      const [cell, k] = rng.pick(options);
      room[cell] = k;
      left--;
    }
    const sizes = new Array<number>(solution.length).fill(0);
    for (const k of room) sizes[k] = (sizes[k] as number) + 1;
    if (sizes.some((s) => s < 2)) continue;
    const rows = (pick: (i: number) => string): string[] =>
      Array.from({ length: n }, (_, r) =>
        Array.from({ length: n }, (_, c) => pick(r * n + c)).join(''),
      );
    const rc = (i: number): RC => [Math.floor(i / n), i % n];
    const givens = rng.chance(0.2) ? [rc(rng.pick(solution))] : [];
    return fromRows({
      rooms: rows((i) => SYMBOLS[room[i] as number] as string),
      objects: rows((i) => objects[i] as string),
      givens,
      solution: solution.map(rc),
    });
  }
}

/** (row, column) → cell index. */
export function at(n: number, r: number, c: number): number {
  return r * n + c;
}
