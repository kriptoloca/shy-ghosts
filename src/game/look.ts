import {
  COLOR_FLOORS,
  DOT_PATTERN_MARK,
  HUE_STEP,
  PATTERN_STEP_OF_ROOM,
  DOT_PATTERN_OFFSET,
  HATCH_EDGE_SHARE,
  HATCH_SHARE,
  RING_DASH,
  RING_GAP,
  S_PER_MIN,
} from '../config';
import type { HouseModel } from '../core/house';

/**
 * The graybox look of a house (TASKS.md Epic 3; CLAUDE.md, Rendering; D71, D85), pure so every
 * house of the game is checked: each room gets a floor of its own (a lightness level and a hue
 * family) and a wallpaper pattern. Neighbouring rooms differ in level, hue and pattern, so they
 * never differ by hue alone and the board reads as a floor plan, not as the coloured grid of other
 * region puzzles; up to eight rooms every room has a hue and a pattern of its own; walls run
 * exactly between rooms.
 */

/** Wallpaper patterns, drawn per cell so a room's pattern runs on from cell to cell (no plain floor). */
export const PATTERNS = [
  'vstripes',
  'hstripes',
  'diagonal',
  'antidiagonal',
  'diamonds',
  'checks',
  'crosshatch',
  'scales',
] as const;
export type Pattern = (typeof PATTERNS)[number];

/** Lightness levels and hue families of the floors (COLOR_FLOORS[level][hue]). */
export const LEVELS = COLOR_FLOORS.length;
export const HUES = COLOR_FLOORS[0]?.length ?? 0;

export interface RoomStyle {
  /** The floor: COLOR_FLOORS[level][hue], unique in the house. */
  level: number;
  hue: number;
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

/** The rooms in order of falling degree, room id on ties: the most constrained first. */
function byDegree(near: readonly Set<number>[]): number[] {
  return [...Array(near.length).keys()].sort(
    (a, b) => (near[b]?.size ?? 0) - (near[a]?.size ?? 0) || a - b,
  );
}

/**
 * A proper colouring of the room graph with `k` colours, each used by at most `cap` rooms, by
 * backtracking over the rooms in order of falling degree (room id on ties); room r tries colour
 * r mod k first, so the looks spread out. Null when there is none.
 */
function colouring(near: readonly Set<number>[], k: number, cap: number): number[] | null {
  const rooms = near.length;
  const colour = new Array<number>(rooms).fill(-1);
  const used = new Array<number>(k).fill(0);
  const order = byDegree(near);
  const place = (at: number): boolean => {
    if (at === order.length) return true;
    const r = order[at] as number;
    for (let j = 0; j < k; j++) {
      const c = (r + j) % k;
      if ((used[c] as number) >= cap) continue;
      if ([...(near[r] ?? [])].some((b) => colour[b] === c)) continue;
      colour[r] = c;
      used[c] = (used[c] as number) + 1;
      if (place(at + 1)) return true;
      used[c] = used[c] - 1;
      colour[r] = -1;
    }
    return false;
  };
  return place(0) ? colour : null;
}

/**
 * Hues and patterns for rooms whose levels are set (D85), by backtracking in order of falling
 * degree; room r tries hue r · HUE_STEP and pattern r · PATTERN_STEP_OF_ROOM first. Neighbours
 * differ in hue and pattern. Up to HUES rooms no hue and no pattern repeats; above, a hue repeats
 * only on rooms that do not touch and lie two levels apart or more, a pattern only with another
 * hue, so no hue and pattern pair repeats. Null when there is no such choice.
 */
function huesAndPatterns(
  near: readonly Set<number>[],
  levels: readonly number[],
): RoomStyle[] | null {
  const rooms = near.length;
  const hue = new Array<number>(rooms).fill(-1);
  const pattern = new Array<number>(rooms).fill(-1);
  const order = byDegree(near);
  const fits = (x: number, hx: number, px: number): boolean => {
    for (let y = 0; y < rooms; y++) {
      if (y === x || hue[y] === -1) continue;
      const sameHue = hue[y] === hx;
      const samePattern = pattern[y] === px;
      if (near[x]?.has(y)) {
        if (sameHue || samePattern) return false;
        continue;
      }
      const apart = Math.abs((levels[y] as number) - (levels[x] as number)) >= 2;
      if (sameHue && (rooms <= HUES || !apart || samePattern)) return false;
      if (samePattern && (rooms <= PATTERNS.length || sameHue)) return false;
    }
    return true;
  };
  const place = (at: number): boolean => {
    if (at === order.length) return true;
    const x = order[at] as number;
    for (let j = 0; j < HUES; j++) {
      const hx = (x * HUE_STEP + j) % HUES;
      for (let q = 0; q < PATTERNS.length; q++) {
        const px = (x * PATTERN_STEP_OF_ROOM + q) % PATTERNS.length;
        if (!fits(x, hx, px)) continue;
        hue[x] = hx;
        pattern[x] = px;
        if (place(at + 1)) return true;
        hue[x] = -1;
        pattern[x] = -1;
      }
    }
    return false;
  };
  if (!place(0)) return null;
  return levels.map((level, r) => ({
    level,
    hue: hue[r] as number,
    pattern: PATTERNS[pattern[r] as number] as Pattern,
  }));
}

/** Each house's styles, worked out once (a search that takes up to about 11 ms). */
const STYLES = new WeakMap<HouseModel, readonly RoomStyle[]>();

/**
 * Each room's floor and pattern (D85): the level by a colouring that spreads the rooms evenly over
 * the levels (or, where that cannot be, by any colouring), then the hues and the patterns. Worked
 * out once per house: a board built again for a new screen size gets the same styles (round 2's
 * code audit, DÜŞÜK 7).
 */
export function roomStyles(h: HouseModel): readonly RoomStyle[] {
  const known = STYLES.get(h);
  if (known) return known;
  const near = neighbourRooms(h);
  const rooms = near.length;
  for (const cap of [Math.ceil(rooms / LEVELS), rooms]) {
    const levels = colouring(near, LEVELS, cap);
    const looks = levels ? huesAndPatterns(near, levels) : null;
    if (looks) {
      STYLES.set(h, looks);
      return looks;
    }
  }
  throw new Error(`roomStyles: no look for a house of ${String(rooms)} rooms`);
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

/** A polygon in cell units: (0, 0) is a cell's top left corner, (1, 1) its bottom right. */
export type Polygon = readonly (readonly [number, number])[];

/**
 * The part of a convex polygon inside the rectangle [x0, x1] × [y0, y1] (Sutherland–Hodgman), in
 * the polygon's units; empty when none of it is inside.
 */
export function clipPolygon(p: Polygon, x0: number, y0: number, x1: number, y1: number): Polygon {
  let poly: (readonly [number, number])[] = [...p];
  const edge = (
    inside: (q: readonly [number, number]) => boolean,
    cut: (a: readonly [number, number], b: readonly [number, number]) => [number, number],
  ): void => {
    const out: (readonly [number, number])[] = [];
    poly.forEach((a, k) => {
      const b = poly[(k + 1) % poly.length] as readonly [number, number];
      if (inside(a)) out.push(a);
      if (inside(a) !== inside(b)) out.push(cut(a, b));
    });
    poly = out;
  };
  const atX =
    (x: number) =>
    (a: readonly [number, number], b: readonly [number, number]): [number, number] => [
      x,
      a[1] + ((x - a[0]) * (b[1] - a[1])) / (b[0] - a[0]),
    ];
  const atY =
    (y: number) =>
    (a: readonly [number, number], b: readonly [number, number]): [number, number] => [
      a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]),
      y,
    ];
  edge((q) => q[0] >= x0, atX(x0));
  edge((q) => q[0] <= x1, atX(x1));
  edge((q) => q[1] >= y0, atY(y0));
  edge((q) => q[1] <= y1, atY(y1));
  return poly;
}

/** The area of a simple polygon (shoelace). */
export function polygonArea(p: Polygon): number {
  let twice = 0;
  p.forEach(([x1, y1], k) => {
    const [x2, y2] = p[(k + 1) % p.length] as readonly [number, number];
    twice += x1 * y2 - x2 * y1;
  });
  return Math.abs(twice) / 2;
}

/** The part of the unit cell where lo ≤ x + y ≤ hi, a convex polygon (the square clipped twice). */
function band(lo: number, hi: number): Polygon {
  let poly: [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  const clip = (keep: (s: number) => boolean, at: number): void => {
    const out: [number, number][] = [];
    poly.forEach((a, k) => {
      const b = poly[(k + 1) % poly.length] as [number, number];
      const sa = a[0] + a[1];
      const sb = b[0] + b[1];
      if (keep(sa)) out.push(a);
      if (keep(sa) !== keep(sb)) {
        const t = (at - sa) / (sb - sa);
        out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      }
    });
    poly = out;
  };
  clip((v) => v >= lo, lo);
  clip((v) => v <= hi, hi);
  return poly;
}

/** Where the hatch's two stripes run in a cell: the lines x + y = ½ and x + y = 1½. */
const HALF = 0.5;
const STRIPE_LINES = [HALF, 1 + HALF];

/**
 * The light hatch of a lit cell (D71), in cell units: two amber stripes along x + y = const (so a
 * lit row or column reads as one band of light from cell to cell), each with a brown edge on its
 * lower right side. The stripes cover HATCH_SHARE of the cell and the edges HATCH_EDGE_SHARE:
 * exactly, since the two bands' areas sum to their width in x + y.
 */
export function hatch(): { stripes: Polygon[]; edges: Polygon[] } {
  // a band d ± a around x + y = d covers a of the cell (for d = ½ and d = 1½ alike)
  const half = HATCH_SHARE / STRIPE_LINES.length;
  return {
    stripes: STRIPE_LINES.map((d) => band(d - half, d + half)),
    edges: STRIPE_LINES.map((d) => band(d + half, d + half + HATCH_EDGE_SHARE)),
  };
}

/** A straight piece of a room's settled ring, in cell units. */
export interface RingPiece {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * The settled ring of a room (D71): a line that follows the room's walls `inset` cell units inside
 * them, closed around the room; straight pieces merged. Each wall side of a cell gives a piece
 * parallel to it: at a corner of the room it stops `inset` short (an outer corner) or runs `inset`
 * on (an inner corner), so the pieces meet.
 */
export function ringSegments(h: HouseModel, room: number, inset: number): RingPiece[] {
  const { n } = h;
  const inRoom = (r: number, c: number): boolean =>
    r >= 0 && r < n && c >= 0 && c < n && h.roomOf[r * n + c] === room;
  /** Cell (r, c)'s side toward (dr, dc) is a wall of the room. */
  const wall = (r: number, c: number, dr: number, dc: number): boolean =>
    inRoom(r, c) && !inRoom(r + dr, c + dc);
  const horizontal: RingPiece[] = [];
  const vertical: RingPiece[] = [];
  /** How far a piece along (ar, ac) reaches past the cell at its end on that side. */
  const reach = (r: number, c: number, dr: number, dc: number, ar: number, ac: number): number => {
    if (wall(r, c, ar, ac)) return -inset; // outer corner: stop short
    return wall(r + ar, c + ac, dr, dc) ? 0 : inset; // the wall goes on, or an inner corner
  };
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!inRoom(r, c)) continue;
      for (const dr of [-1, 1]) {
        if (!wall(r, c, dr, 0)) continue;
        const y = dr < 0 ? r + inset : r + 1 - inset;
        horizontal.push({
          x1: c - reach(r, c, dr, 0, 0, -1),
          y1: y,
          x2: c + 1 + reach(r, c, dr, 0, 0, 1),
          y2: y,
        });
      }
      for (const dc of [-1, 1]) {
        if (!wall(r, c, 0, dc)) continue;
        const x = dc < 0 ? c + inset : c + 1 - inset;
        vertical.push({
          x1: x,
          y1: r - reach(r, c, 0, dc, -1, 0),
          x2: x,
          y2: r + 1 + reach(r, c, 0, dc, 1, 0),
        });
      }
    }
  }
  return [...merge(horizontal, 'y1', 'x1', 'x2'), ...merge(vertical, 'x1', 'y1', 'y2')];
}

/** Pieces on one line that touch end to start, joined (the ring's dashes run on). */
function merge(
  pieces: readonly RingPiece[],
  line: 'x1' | 'y1',
  from: 'x1' | 'y1',
  to: 'x2' | 'y2',
): RingPiece[] {
  const sorted = [...pieces].sort((a, b) => a[line] - b[line] || a[from] - b[from]);
  const out: RingPiece[] = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    if (last && last[line] === p[line] && last[to] === p[from])
      out[out.length - 1] = { ...last, [to]: p[to] };
    else out.push({ ...p });
  }
  return out;
}

/** A line from (x1, y1) to (x2, y2) and a point, as the drawing helpers below take them. */
export type Segment = readonly [number, number, number, number];
export interface Point {
  x: number;
  y: number;
}

/** A half ring open at the bottom (a scale of the wallpaper), its middle and radius. */
export interface Arc {
  x: number;
  y: number;
  r: number;
}

/**
 * A progress dot's wallpaper (D75, D85), around its middle at radius `r`: two stripes as chords of
 * the dot, running the way the room's do (the floor's diagonal lines are u + v = d, its
 * antidiagonal ones v − u = d; crosshatch both), the points of its diamonds (four) or checks (two,
 * staggered), or three scales, each mark DOT_PATTERN_MARK × r in size and wholly inside the dot.
 */
export function swatchMarks(
  p: Pattern,
  r: number,
): { lines: Segment[]; points: Point[]; arcs: Arc[] } {
  const o = DOT_PATTERN_OFFSET * r;
  const chord = (nx: number, ny: number, d: number): Segment => {
    // the chord at distance d from the middle along the normal (nx, ny), a unit vector
    const half = Math.sqrt(r * r - d * d);
    return [nx * d + ny * half, ny * d - nx * half, nx * d - ny * half, ny * d + nx * half];
  };
  const both = (nx: number, ny: number): Segment[] => [chord(nx, ny, -o), chord(nx, ny, o)];
  const q = o / Math.SQRT2;
  const none = { lines: [], points: [], arcs: [] };
  switch (p) {
    case 'vstripes':
      return { ...none, lines: both(1, 0) };
    case 'hstripes':
      return { ...none, lines: both(0, 1) };
    case 'diagonal':
      return { ...none, lines: both(Math.SQRT1_2, Math.SQRT1_2) };
    case 'antidiagonal':
      return { ...none, lines: both(-Math.SQRT1_2, Math.SQRT1_2) };
    case 'crosshatch':
      return {
        ...none,
        lines: [...both(Math.SQRT1_2, Math.SQRT1_2), ...both(-Math.SQRT1_2, Math.SQRT1_2)],
      };
    case 'diamonds':
      return {
        ...none,
        points: [
          { x: -q, y: -q },
          { x: q, y: -q },
          { x: -q, y: q },
          { x: q, y: q },
        ],
      };
    case 'checks':
      return {
        ...none,
        points: [
          { x: -q, y: -q },
          { x: q, y: q },
        ],
      };
    case 'scales': {
      const s = Math.SQRT2 * DOT_PATTERN_MARK * r;
      return {
        ...none,
        arcs: [
          { x: -q, y: -q / 2, r: s },
          { x: q, y: -q / 2, r: s },
          { x: 0, y: q, r: s },
        ],
      };
    }
  }
}

/**
 * The cells the hint's reason keeps bright (D74): the segments and rooms the deduction uses and
 * the target room, ascending; every other cell goes dim for a moment.
 */
export function brightCells(
  h: HouseModel,
  segments: readonly number[],
  rooms: readonly number[],
  room: number,
): number[] {
  const bright = new Set<number>();
  for (const seg of segments) for (const c of h.segments[seg]?.cells ?? []) bright.add(c);
  for (const r of [...rooms, room]) for (const c of h.roomCells[r] ?? []) bright.add(c);
  return [...bright].sort((a, b) => a - b);
}

/** Dots from p toward q, `step` apart (the count rounded), both ends left out. */
export function dotsBetween(p: Point, q: Point, step: number): Point[] {
  const count = Math.max(1, Math.round(Math.hypot(q.x - p.x, q.y - p.y) / step));
  const out: Point[] = [];
  for (let k = 1; k < count; k++) {
    const t = k / count;
    out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
  }
  return out;
}

/** A dashed line from (x1, y1) to (x2, y2): dashes RING_DASH long with RING_GAP between. */
export function dashes(
  g: { lineBetween: (x1: number, y1: number, x2: number, y2: number) => unknown },
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  for (let at = 0; at < length; at += RING_DASH + RING_GAP) {
    const to = Math.min(length, at + RING_DASH);
    g.lineBetween(x1 + ux * at, y1 + uy * at, x1 + ux * to, y1 + uy * to);
  }
}

/** A solve time in seconds as the finale shows it (D73): m:ss, whole seconds, never below 0:00. */
export function clockText(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const m = Math.floor(whole / S_PER_MIN);
  return `${String(m)}:${String(whole - m * S_PER_MIN).padStart(2, '0')}`;
}

/**
 * The solve time as it ticks in (D73, D85): new digits only when the whole second changes, so the
 * text is set and drawn only then, not on every frame of the tick (round 2's code audit, DÜŞÜK 7).
 */
export class TickingTime {
  private shown = -1;

  /** The text for `seconds`, or null while the digits stay the same. */
  next(seconds: number): string | null {
    const whole = Math.max(0, Math.floor(seconds));
    if (whole === this.shown) return null;
    this.shown = whole;
    return clockText(whole);
  }
}
