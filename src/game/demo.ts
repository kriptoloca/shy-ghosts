import {
  DEMO_BEAM_MS,
  DEMO_BLINK_MS,
  DEMO_BLOCK_HOUSE,
  DEMO_COPY_MS,
  DEMO_LAMP_HOUSE,
  DEMO_LINES_HOUSE,
  DEMO_SIGHT_HOUSE,
  DEMO_TRAIL_MS,
  DEMO_TRAIL_SHORT_MS,
} from '../config';
import type { HouseModel } from '../core/house';

/**
 * The teaching demonstrations (docs/gate-b-round1.md §3, D70): no text, a short scene when the
 * first house of an element appears (not on a resume), input closed until it ends, a tap skips
 * it. Pure timelines in ms from the start; the board draws them (src/game/board.ts).
 */
export interface Trail {
  at: number;
  ms: number;
  /** The resident it runs from, and the cells it covers, nearest first. */
  from: number;
  cells: number[];
  /** The block it stops at with a small bump, or null at the edge of the house. */
  bump: number | null;
}

export interface DemoScript {
  /** How long input stays closed. */
  ms: number;
  /** Residents blinking awake. */
  blink: { at: number; ms: number; cells: number[] } | null;
  trails: Trail[];
  /** A lamp switching on: its light sweeps out over these cells, nearest first. */
  beam: { at: number; ms: number; lamp: number; cells: number[] } | null;
  /** A see-through copy of a resident steps onto a lit cell beside it, squints, steps back. */
  copy: { at: number; ms: number; from: number; to: number } | null;
}

/** Up, left, right, down as (row, column) steps. */
const DIRECTIONS: readonly (readonly [number, number])[] = [
  [-1, 0],
  [0, -1],
  [0, 1],
  [1, 0],
];

/** The cells seen from `from` along one direction, nearest first, and the block that stops it. */
function ray(
  h: HouseModel,
  from: number,
  dr: number,
  dc: number,
): Omit<Trail, 'at' | 'ms' | 'from'> {
  const cells: number[] = [];
  let r = Math.floor(from / h.n) + dr;
  let c = (from % h.n) + dc;
  while (r >= 0 && r < h.n && c >= 0 && c < h.n) {
    const i = r * h.n + c;
    if (h.blocked[i]) return { cells, bump: i };
    cells.push(i);
    r += dr;
    c += dc;
  }
  return { cells, bump: null };
}

/** The demonstration of house `id`, or null when the house teaches nothing new. */
export function demoFor(id: number, h: HouseModel): DemoScript | null {
  if (id === DEMO_SIGHT_HOUSE || id === DEMO_LINES_HOUSE) {
    const from = h.givens[0];
    if (from === undefined) return null;
    const ms = id === DEMO_SIGHT_HOUSE ? DEMO_TRAIL_MS : DEMO_TRAIL_SHORT_MS;
    const trails = DIRECTIONS.map(([dr, dc]) => ({
      at: DEMO_BLINK_MS,
      ms,
      from,
      ...ray(h, from, dr, dc),
    })).filter((t) => t.cells.length > 0);
    return {
      ms: DEMO_BLINK_MS + ms,
      blink: { at: 0, ms: DEMO_BLINK_MS, cells: [from] },
      trails,
      beam: null,
      copy: null,
    };
  }
  if (id === DEMO_BLOCK_HOUSE) {
    const [a, b] = h.givens;
    if (a === undefined || b === undefined) return null;
    const toward = (from: number, to: number): Trail => {
      const dr = Math.sign(Math.floor(to / h.n) - Math.floor(from / h.n));
      const dc = Math.sign((to % h.n) - (from % h.n));
      return { at: 0, ms: DEMO_TRAIL_MS, from, ...ray(h, from, dr, dc) };
    };
    return {
      ms: DEMO_TRAIL_MS,
      blink: null,
      trails: [toward(a, b), toward(b, a)],
      beam: null,
      copy: null,
    };
  }
  if (id === DEMO_LAMP_HOUSE) {
    const lamp = h.objects.indexOf('L');
    const from = h.givens[0];
    if (lamp < 0 || from === undefined) return null;
    const far = (c: number): number =>
      Math.abs(Math.floor(c / h.n) - Math.floor(lamp / h.n)) + Math.abs((c % h.n) - (lamp % h.n));
    const cells = [...Array(h.size).keys()]
      .filter((c) => (h.lampsOf[c] ?? []).includes(lamp))
      .sort((x, y) => far(x) - far(y) || x - y);
    const to = DIRECTIONS.map(([dr, dc]) => {
      const r = Math.floor(from / h.n) + dr;
      const c = (from % h.n) + dc;
      return r >= 0 && r < h.n && c >= 0 && c < h.n ? r * h.n + c : -1;
    }).find((c) => c >= 0 && h.lit[c] === true && !h.solution.includes(c));
    if (to === undefined) return null;
    return {
      ms: DEMO_BEAM_MS + DEMO_COPY_MS,
      blink: null,
      trails: [],
      beam: { at: 0, ms: DEMO_BEAM_MS, lamp, cells },
      copy: { at: DEMO_BEAM_MS, ms: DEMO_COPY_MS, from, to },
    };
  }
  return null;
}
