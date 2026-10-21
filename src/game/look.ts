import { COLOR_ROOM_TONES } from '../config';
import type { HouseModel } from '../core/house';

/**
 * The graybox look of a house (TASKS.md Epic 3; CLAUDE.md, Rendering), pure so every house of the
 * game is checked: each room gets a lightness step and a wallpaper pattern, and neighbouring
 * rooms differ in both (rooms never differ by hue alone, so the board reads as a floor plan and
 * not as the coloured grid of other region puzzles); walls run exactly between rooms.
 */

/** Wallpaper patterns, drawn per cell so a room's pattern runs on from cell to cell. */
export const PATTERNS = [
  'plain',
  'dots',
  'vstripes',
  'hstripes',
  'diagonal',
  'antidiagonal',
] as const;
export type Pattern = (typeof PATTERNS)[number];

/** Lightness steps of the room floors (COLOR_ROOM_TONES). */
export const TONES = COLOR_ROOM_TONES.length;

export interface RoomStyle {
  /** Index into COLOR_ROOM_TONES. */
  tone: number;
  pattern: Pattern;
}

/** The rooms that share at least one cell edge with each room. */
export function neighbourRooms(h: HouseModel): Set<number>[] {
  const out = Array.from({ length: h.roomCount }, () => new Set<number>());
  const { n } = h;
  for (let i = 0; i < h.size; i++) {
    const a = h.roomOf[i] as number;
    const right = i % n < n - 1 ? (h.roomOf[i + 1] as number) : a;
    const down = i + n < h.size ? (h.roomOf[i + n] as number) : a;
    for (const b of [right, down]) {
      if (b !== a) {
        out[a]?.add(b);
        out[b]?.add(a);
      }
    }
  }
  return out;
}

/**
 * A proper colouring of the room graph with `k` colours, by backtracking over the rooms in order
 * of falling degree (room id on ties); room r tries colour r mod k first, so the looks spread out.
 * Rooms on a grid form a planar graph, which four colours always colour (the most rooms a house
 * holds is 36): the search ends quickly and never fails.
 */
function colouring(near: readonly Set<number>[], k: number): number[] {
  const rooms = near.length;
  const colour = new Array<number>(rooms).fill(-1);
  const order = [...Array(rooms).keys()].sort(
    (a, b) => (near[b]?.size ?? 0) - (near[a]?.size ?? 0) || a - b,
  );
  const place = (at: number): boolean => {
    if (at === order.length) return true;
    const r = order[at] as number;
    for (let j = 0; j < k; j++) {
      const c = (r + j) % k;
      if ([...(near[r] ?? [])].some((b) => colour[b] === c)) continue;
      colour[r] = c;
      if (place(at + 1)) return true;
      colour[r] = -1;
    }
    return false;
  };
  if (!place(0)) throw new Error(`roomStyles: no colouring with ${String(k)} colours`);
  return colour;
}

/** Each room's lightness step and pattern; neighbouring rooms differ in both. */
export function roomStyles(h: HouseModel): RoomStyle[] {
  const near = neighbourRooms(h);
  const tones = colouring(near, TONES);
  const patterns = colouring(near, PATTERNS.length);
  return tones.map((tone, r) => ({ tone, pattern: PATTERNS[patterns[r] as number] as Pattern }));
}

/** A straight wall from (x1, y1) to (x2, y2) in cell units (x to the right, y down). */
export interface WallRun {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * The walls: every cell edge between two rooms and the outer border, merged into maximal straight
 * runs (rows of horizontal edges first, then columns of vertical ones).
 */
export function wallRuns(h: HouseModel): WallRun[] {
  const { n } = h;
  const room = (r: number, c: number): number => h.roomOf[r * n + c] as number;
  const runs: WallRun[] = [];
  const collect = (
    edge: (line: number, k: number) => boolean,
    add: (line: number, a: number, b: number) => void,
  ): void => {
    for (let line = 0; line <= n; line++) {
      let start = -1;
      for (let k = 0; k <= n; k++) {
        const on = k < n && edge(line, k);
        if (on && start < 0) start = k;
        if (!on && start >= 0) {
          add(line, start, k);
          start = -1;
        }
      }
    }
  };
  collect(
    (r, c) => r === 0 || r === n || room(r - 1, c) !== room(r, c),
    (r, a, b) => runs.push({ x1: a, y1: r, x2: b, y2: r }),
  );
  collect(
    (c, r) => c === 0 || c === n || room(r, c - 1) !== room(r, c),
    (c, a, b) => runs.push({ x1: c, y1: a, x2: c, y2: b }),
  );
  return runs;
}
