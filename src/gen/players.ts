import { PLAYER_STATE_LIMIT, PLAYOUTS } from './params';
import { Rng } from './rng';
import type { Puzzle } from './solve';

/**
 * Player models (GENERATOR.md §5, D17): players who follow the visible rule but do not deduce,
 * so "a naive player wins most houses" would show that the puzzles ask for no decisions.
 * - naive: never leaves a ghost where it shivers (T0); places a room's last free cell (T1);
 *   otherwise guesses a uniformly random free cell of the unsettled room with the fewest free
 *   cells (ties uniform); never undoes; loses when an unsettled room has no free cell.
 * - shallow: as naive, plus T2 (a one-step lookahead) before any guess.
 * The build stores and selects on the exact chance to win (`exactWinRate`, D55); the seeded
 * playouts (`winRate`) remain as an independent check of it.
 */
export type Player = 'naive' | 'shallow';

/** The board as a player sees it: free cells (1) and each room's ghost (−1 while open). */
interface Board {
  free: Uint8Array;
  ghost: Int32Array;
}

function place(p: Puzzle, b: Board, c: number): void {
  const room = p.roomOf[c] as number;
  b.ghost[room] = c;
  for (const j of p.roomCells[room] ?? []) b.free[j] = 0;
  for (const j of p.sees[c] ?? []) b.free[j] = 0;
}

function startBoard(p: Puzzle): Board {
  const b = {
    free: Uint8Array.from(p.candidate, (c) => (c ? 1 : 0)),
    ghost: new Int32Array(p.roomCount).fill(-1),
  };
  for (const g of p.givens) place(p, b, g);
  return b;
}

/**
 * The policy's forced steps, in a playout's order: T1 (the first open room by id with one free
 * cell), and for the shallow player T2, until the game is won, lost, or the player must guess.
 * Returns the free cells of each open room with the fewest (the rooms a guess picks from).
 */
function settle(
  p: Puzzle,
  player: Player,
  b: Board,
  sight: Uint8Array,
): 'win' | 'lose' | number[][] {
  for (;;) {
    const open: number[] = [];
    for (let r = 0; r < p.roomCount; r++) if ((b.ghost[r] as number) < 0) open.push(r);
    if (open.length === 0) return 'win';
    const cells = open.map((r) => (p.roomCells[r] ?? []).filter((c) => b.free[c] === 1));
    if (cells.some((cs) => cs.length === 0)) return 'lose';
    const last = cells.findIndex((cs) => cs.length === 1);
    if (last >= 0) {
      place(p, b, (cells[last] as number[])[0] as number);
      continue;
    }
    if (player === 'shallow') {
      const x = lookahead(p, open, cells, sight);
      if (x !== null) {
        b.free[x] = 0;
        continue;
      }
    }
    const fewest = Math.min(...cells.map((cs) => cs.length));
    return cells.filter((cs) => cs.length === fewest);
  }
}

/** The share of `playouts` seeded playouts the player wins (an estimate of `exactWinRate`). */
export function winRate(p: Puzzle, player: Player, seed: number, playouts = PLAYOUTS): number {
  const rng = new Rng(seed);
  const sight = new Uint8Array(p.size);
  let wins = 0;
  for (let k = 0; k < playouts; k++) {
    const b = startBoard(p);
    for (;;) {
      const s = settle(p, player, b, sight);
      if (s === 'win') wins++;
      if (typeof s === 'string') break;
      place(p, b, rng.pick(rng.pick(s)));
    }
  }
  return wins / playouts;
}

/**
 * The exact chance that the player wins (D55; audit 2026-10-21, KRİTİK 1): the policy walked over
 * every guess it can make, each weighted by its probability (a uniform room among the tied ones,
 * then a uniform free cell of it). Between guesses the walk takes the same forced steps as a
 * playout. A board met twice is weighed once: at a guess the free cells alone say which rooms are
 * open (a settled room has none, an open one at least two), so they are the memo's key.
 * Deterministic to the last bit: a fixed order of sums and one division per guess.
 */
export function exactWinRate(p: Puzzle, player: Player): number {
  const sight = new Uint8Array(p.size);
  const memo = new Map<string, number>();
  const walk = (b: Board): number => {
    const s = settle(p, player, b, sight);
    if (s === 'win') return 1;
    if (s === 'lose') return 0;
    const key = b.free.join('');
    const known = memo.get(key);
    if (known !== undefined) return known;
    if (memo.size >= PLAYER_STATE_LIMIT) {
      throw new Error(`exactWinRate: more than ${String(PLAYER_STATE_LIMIT)} boards`);
    }
    let sum = 0;
    let branches = 0;
    for (const cells of s) {
      for (const c of cells) {
        const next = { free: b.free.slice(), ghost: b.ghost.slice() };
        place(p, next, c);
        sum += walk(next);
        branches++;
      }
    }
    const win = sum / branches;
    memo.set(key, win);
    return win;
  };
  return walk(startBoard(p));
}

/** T2 for the shallow player: a free cell whose ghost would see all of another room's. */
function lookahead(
  p: Puzzle,
  open: readonly number[],
  cells: readonly number[][],
  sight: Uint8Array,
): number | null {
  for (let a = 0; a < open.length; a++) {
    for (const x of cells[a] ?? []) {
      sight.fill(0);
      for (const j of p.sees[x] ?? []) sight[j] = 1;
      for (let b = 0; b < open.length; b++) {
        if (b !== a && (cells[b] ?? []).every((j) => sight[j] === 1)) return x;
      }
    }
  }
  return null;
}

/**
 * The blind player (one ghost per room on a uniformly random empty cell, ignoring every shiver)
 * wins only on the solution: Π 1 / (empty cells of the room) over the rooms without a given.
 */
export function blindWin(p: Puzzle): number {
  const given = new Set(p.givens.map((g) => p.roomOf[g]));
  let win = 1;
  p.roomCells.forEach((cells, r) => {
    if (given.has(r)) return;
    win /= cells.filter((c) => p.objects[c] === '.').length;
  });
  return win;
}
