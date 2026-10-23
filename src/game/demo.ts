import {
  DEMO_BEAM_MS,
  DEMO_BLINK_MS,
  DEMO_BLOCK_HOUSE,
  DEMO_COPY_MS,
  DEMO_HAND_MS,
  DEMO_HOLD_MS,
  DEMO_LAMP_HOUSE,
  DEMO_LINES_HOUSE,
  DEMO_MARK_HOUSE,
  DEMO_RUN_SHARE,
  DEMO_SHADOW_HOUSE,
  DEMO_SIGHT_HOUSE,
  DEMO_TRAIL_MS,
  DEMO_TRAIL_SHORT_MS,
} from '../config';
import { lightDemoCell, shadowsOf, type HouseModel, type Shadow } from '../core/house';
import type { GhostStatus } from '../core/state';

/**
 * The teaching demonstrations (docs/gate-b-round2.md §2; D70, D83): no text, a short scene that
 * shows a house's new rule before input opens. Each ends on a hold frame (DEMO_HOLD_MS) that
 * shows the whole lesson at once; a tap skips it and is never a game tap. Pure timelines in ms
 * from the start; the board draws them (src/game/demo-play.ts).
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

/**
 * A see-through copy of a ghost: it steps in from the cell `from` (a resident) or, with no `from`,
 * fades in on `to`; there it takes `pose` and keeps it to the end.
 */
export interface Copy {
  at: number;
  ms: number;
  from: number | null;
  to: number;
  pose: GhostStatus;
}

export interface DemoScript {
  /** How long input stays closed: the lesson, then the hold frame. */
  ms: number;
  /** The hold frame starts here: everything shown by then stays, still, to the end. */
  holdAt: number;
  /** Residents blinking awake. */
  blink: { at: number; ms: number; cells: number[] } | null;
  trails: Trail[];
  /** A lamp switching on: its light sweeps out over these cells, nearest first, to a shelf. */
  beam: { at: number; ms: number; lamp: number; cells: number[]; bump: number | null } | null;
  copies: Copy[];
  /** A resident that takes a pose (house 1: it covers its eyes as the copy appears). */
  poses: { at: number; cell: number; pose: GhostStatus }[];
  /** A see-through hand drags over these cells, a mark popping in under it on each (house 3). */
  hand: { at: number; ms: number; cells: number[] } | null;
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

/** Manhattan distance between two cells. */
function far(h: HouseModel, a: number, b: number): number {
  return Math.abs(Math.floor(a / h.n) - Math.floor(b / h.n)) + Math.abs((a % h.n) - (b % h.n));
}

/** A script that ends on its hold frame. */
function held(parts: Omit<DemoScript, 'ms' | 'holdAt'>, holdAt: number): DemoScript {
  return { ...parts, holdAt, ms: holdAt + DEMO_HOLD_MS };
}

const NOTHING = { blink: null, trails: [], beam: null, copies: [], poses: [], hand: null };

/** The resident's trails along its row and column (houses 1 and 2). */
function sight(h: HouseModel, from: number, ms: number): Trail[] {
  return DIRECTIONS.map(([dr, dc]) => ({
    at: DEMO_BLINK_MS,
    ms,
    from,
    ...ray(h, from, dr, dc),
  })).filter((t) => t.cells.length > 0);
}

/** The lamp's light, nearest cells first. */
function lightOf(h: HouseModel, lamp: number): number[] {
  return [...Array(h.size).keys()]
    .filter((c) => (h.lampsOf[c] ?? []).includes(lamp))
    .sort((x, y) => far(h, lamp, x) - far(h, lamp, y) || x - y);
}

/**
 * A cell in the shelf's shadow (house 10): in the lamp's row or column past a bookshelf
 * (`shadowsOf`, the walk the build's lesson test takes too), unlit and not a solution cell; with
 * the shelf that casts it. Null when there is none.
 */
function shadowOf(h: HouseModel, lamp: number): Shadow | null {
  return (
    shadowsOf(h.n, h.objects, lamp).find((s) => !h.lit[s.cell] && !h.solution.includes(s.cell)) ??
    null
  );
}

/** The first bookshelf in the lamp's row or column (where its light stops), or null. */
function shelfOf(h: HouseModel, lamp: number): number | null {
  const stops = DIRECTIONS.map(([dr, dc]) => ray(h, lamp, dr, dc).bump).filter(
    (c): c is number => c !== null && h.objects[c] === 'F',
  );
  return stops[0] ?? null;
}

/** The demonstration of house `id`, or null when the house teaches nothing on screen. */
export function demoFor(id: number, h: HouseModel): DemoScript | null {
  if (id === DEMO_SIGHT_HOUSE || id === DEMO_LINES_HOUSE) {
    const from = h.givens[0];
    if (from === undefined) return null;
    const ms = id === DEMO_SIGHT_HOUSE ? DEMO_TRAIL_MS : DEMO_TRAIL_SHORT_MS;
    const trails = sight(h, from, ms);
    const blink = { at: 0, ms: DEMO_BLINK_MS, cells: [from] };
    if (id === DEMO_LINES_HOUSE) return held({ ...NOTHING, blink, trails }, DEMO_BLINK_MS + ms);
    // house 1: as the trail reaches it, a see-through ghost appears in the resident's row, in
    // another room, and both cover their eyes: the one cell nothing rules out is a deduction
    const row = trails.flatMap((t) => t.cells).find((c) => h.roomOf[c] !== h.roomOf[from]);
    if (row === undefined) return held({ ...NOTHING, blink, trails }, DEMO_BLINK_MS + ms);
    const at = DEMO_BLINK_MS + ms * DEMO_RUN_SHARE;
    return held(
      {
        ...NOTHING,
        blink,
        trails,
        copies: [{ at, ms: DEMO_COPY_MS, from: null, to: row, pose: 'seen' }],
        poses: [{ at, cell: from, pose: 'seen' }],
      },
      Math.max(DEMO_BLINK_MS + ms, at + DEMO_COPY_MS),
    );
  }
  if (id === DEMO_MARK_HOUSE) {
    // a see-through hand drags along the resident's row, away from it; marks pop in under it
    const from = h.givens[0];
    if (from === undefined) return null;
    const cells = [ray(h, from, 0, -1).cells, ray(h, from, 0, 1).cells]
      .flat()
      .sort((x, y) => far(h, from, x) - far(h, from, y) || x - y);
    if (cells.length === 0) return null;
    return held({ ...NOTHING, hand: { at: 0, ms: DEMO_HAND_MS, cells } }, DEMO_HAND_MS);
  }
  if (id === DEMO_BLOCK_HOUSE) {
    const [a, b] = h.givens;
    if (a === undefined || b === undefined) return null;
    const toward = (from: number, to: number): Trail => {
      const dr = Math.sign(Math.floor(to / h.n) - Math.floor(from / h.n));
      const dc = Math.sign((to % h.n) - (from % h.n));
      return { at: 0, ms: DEMO_TRAIL_MS, from, ...ray(h, from, dr, dc) };
    };
    return held({ ...NOTHING, trails: [toward(a, b), toward(b, a)] }, DEMO_TRAIL_MS);
  }
  if (id === DEMO_LAMP_HOUSE) {
    // the light alone (D103): the copy stands on a lit cell that no resident sees, stepping out of
    // the resident it lies diagonal to, so it squints and nothing else (`lightDemoCell`, the cell
    // the build's lesson test asks for)
    const lamp = h.objects.indexOf('L');
    const spot = lightDemoCell(h, h.givens, h.solution);
    if (lamp < 0 || !spot) return null;
    return held(
      {
        ...NOTHING,
        beam: { at: 0, ms: DEMO_BEAM_MS, lamp, cells: lightOf(h, lamp), bump: null },
        copies: [
          { at: DEMO_BEAM_MS, ms: DEMO_COPY_MS, from: spot.from, to: spot.cell, pose: 'lit' },
        ],
      },
      DEMO_BEAM_MS + DEMO_COPY_MS,
    );
  }
  if (id === DEMO_SHADOW_HOUSE) {
    const lamp = h.objects.indexOf('L');
    if (lamp < 0) return null;
    const shadow = shadowOf(h, lamp);
    const beam = {
      at: 0,
      ms: DEMO_BEAM_MS,
      lamp,
      cells: lightOf(h, lamp),
      bump: shadow?.shelf ?? shelfOf(h, lamp),
    };
    if (!shadow) return held({ ...NOTHING, beam }, DEMO_BEAM_MS);
    return held(
      {
        ...NOTHING,
        beam,
        copies: [{ at: DEMO_BEAM_MS, ms: DEMO_COPY_MS, from: null, to: shadow.cell, pose: 'calm' }],
      },
      DEMO_BEAM_MS + DEMO_COPY_MS,
    );
  }
  return null;
}
