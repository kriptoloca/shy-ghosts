import type { HouseData } from '../../src/core/house';
import { bruteLit, bruteSees, roomIds } from './brute';

/**
 * The naive and shallow players' exact chance to win, written from GENERATOR.md §5 alone and
 * independent of src/gen: every random choice of the policy enumerated, without memoization, in
 * exact fractions. Slow, so for small houses only; the tests compare src/gen's exact walk with it.
 *
 * The policy, step by step: a placed ghost takes its room and every cell it sees off the board
 * (T0). Then, in order: every room settled → win; an open room with no free cell → lose; the
 * first open room (by id) with one free cell gets its ghost (T1); the shallow player then drops
 * the first free cell (open rooms by id, cells in reading order) whose ghost would see every free
 * cell of another open room (T2); otherwise a uniformly random open room among those with the
 * fewest free cells, then a uniformly random free cell of it.
 */
export type Fraction = readonly [bigint, bigint];

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}

function add([a, b]: Fraction, [c, d]: Fraction): Fraction {
  const num = a * d + c * b;
  const den = b * d;
  const g = gcd(num, den);
  return g === 0n ? [0n, 1n] : [num / g, den / g];
}

export function policyWin(d: HouseData, player: 'naive' | 'shallow'): Fraction {
  const { n, objects } = d;
  const ids = roomIds(d);
  const rooms = Math.max(...ids) + 1;
  const size = n * n;
  const cellsOf = (room: number): number[] =>
    [...Array(size).keys()].filter((i) => ids[i] === room);
  const start = [...Array(size).keys()].map((i) => objects[i] === '.' && !bruteLit(n, objects, i));
  const ghost = new Array<number>(rooms).fill(-1);
  const place = (free: boolean[], g: number[], c: number): void => {
    const room = ids[c] as number;
    g[room] = c;
    for (const j of cellsOf(room)) free[j] = false;
    for (let j = 0; j < size; j++) if (bruteSees(n, objects, c, j)) free[j] = false;
  };
  for (const g of d.givens) place(start, ghost, g);

  const value = (free: boolean[], g: number[]): Fraction => {
    for (;;) {
      const open = [...Array(rooms).keys()].filter((r) => (g[r] as number) < 0);
      if (open.length === 0) return [1n, 1n];
      const freeOf = open.map((r) => cellsOf(r).filter((c) => free[c]));
      if (freeOf.some((cs) => cs.length === 0)) return [0n, 1n];
      const single = freeOf.find((cs) => cs.length === 1);
      if (single) {
        place(free, g, single[0] as number);
        continue;
      }
      if (player === 'shallow') {
        let drop = -1;
        search: for (let a = 0; a < open.length; a++) {
          for (const x of freeOf[a] ?? []) {
            for (let b = 0; b < open.length; b++) {
              if (b === a) continue;
              if ((freeOf[b] ?? []).every((j) => bruteSees(n, objects, x, j))) {
                drop = x;
                break search;
              }
            }
          }
        }
        if (drop >= 0) {
          free[drop] = false;
          continue;
        }
      }
      const fewest = Math.min(...freeOf.map((cs) => cs.length));
      const tied = freeOf.filter((cs) => cs.length === fewest);
      let total: Fraction = [0n, 1n];
      for (const cs of tied) {
        for (const c of cs) {
          const f = [...free];
          const h = [...g];
          place(f, h, c);
          const [num, den] = value(f, h);
          total = add(total, [num, den * BigInt(tied.length * cs.length)]);
        }
      }
      return total;
    }
  };
  return value(start, ghost);
}
