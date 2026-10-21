import {
  ARRANGE_RATIO,
  BOOT_BAR_GAP,
  BOOT_BAR_H,
  BOOT_BAR_W,
  BOOT_HOUSE_H,
  BOOT_HOUSE_W,
  BOOT_ROOF_H,
  BOOT_STEPS,
  BUTTON_GAP,
  BUTTON_PAD,
  BUTTON_R_MAX,
  DESIGN_LONG_MAX,
  DOT_COLUMNS,
  DOT_GAP,
  DOT_R_MAX,
  DESIGN_SHORT,
  GRID_LINE,
  LANDSCAPE_COLUMN,
  LAYOUT_MARGIN,
  PORTRAIT_SIDE_MARGIN,
  PORTRAIT_BOTTOM_BAND,
  PORTRAIT_TOP_BAND,
  SQUARE_BAND,
  WALL_MAX,
  WALL_MIN,
  WALL_SHARE,
  WIN_DIGITS_SIZE,
} from '../config';

/**
 * Screen geometry in design px (GDD §12, CLAUDE.md rule 5): the design size, the board and HUD
 * layout (`computeLayout`), the boot screen. Pure: no Phaser, so every size is unit-tested.
 */
export interface Size {
  width: number;
  height: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Design canvas size for a viewport (CLAUDE.md rule 5): short side DESIGN_SHORT, long side follows
 * the viewport aspect, clamped to [DESIGN_SHORT, DESIGN_LONG_MAX]. Viewports past the clamp are
 * letterboxed by Scale.FIT.
 */
export function designSize(viewW: number, viewH: number): Size {
  const w = Math.max(1, viewW);
  const h = Math.max(1, viewH);
  if (w >= h) {
    const long = clamp(Math.round(DESIGN_SHORT * (w / h)), DESIGN_SHORT, DESIGN_LONG_MAX);
    return { width: long, height: DESIGN_SHORT };
  }
  const long = clamp(Math.round(DESIGN_SHORT * (h / w)), DESIGN_SHORT, DESIGN_LONG_MAX);
  return { width: DESIGN_SHORT, height: long };
}

/** The boot screen's sizes (config.ts), as a parameter so the tests can vary them. */
export interface BootSizes {
  houseW: number;
  houseH: number;
  roofH: number;
  barGap: number;
  barW: number;
  barH: number;
  steps: number;
}

export const BOOT_SIZES: BootSizes = {
  houseW: BOOT_HOUSE_W,
  houseH: BOOT_HOUSE_H,
  roofH: BOOT_ROOF_H,
  barGap: BOOT_BAR_GAP,
  barW: BOOT_BAR_W,
  barH: BOOT_BAR_H,
  steps: BOOT_STEPS,
};

/** Where the boot screen draws (GDD §11 screen 1); every x is a left edge, every y a top. */
export interface BootLayout {
  house: { x: number; y: number; width: number; height: number };
  /** The roof's apex; its base is the house's top edge. */
  roofTop: { x: number; y: number };
  /** The bar's track and, from the same left edge, its fill as far as the boot got. */
  track: { x: number; y: number; width: number; height: number };
  fill: { x: number; y: number; width: number; height: number };
}

/**
 * The boot screen: the silhouette centred, the bar below it, filled to `done` of `steps`
 * (at least 1 px wide, so it shows from the start).
 */
export function bootLayout(size: Size, done: number, b: BootSizes = BOOT_SIZES): BootLayout {
  const cx = size.width / 2;
  const base = (size.height + b.houseH) / 2;
  const left = cx - b.houseW / 2;
  const top = base - b.houseH;
  const barX = cx - b.barW / 2;
  const barY = base + b.barGap - b.barH / 2;
  return {
    house: { x: left, y: top, width: b.houseW, height: b.houseH },
    roofTop: { x: cx, y: top - b.roofH },
    track: { x: barX, y: barY, width: b.barW, height: b.barH },
    fill: { x: barX, y: barY, width: Math.max(1, (b.barW * done) / b.steps), height: b.barH },
  };
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Circle {
  x: number;
  y: number;
  r: number;
}

/** Portrait (primary), the square arrangement around 1:1, landscape (GDD §12). */
export type Arrangement = 'portrait' | 'square' | 'landscape';

/** Where the Game screen draws, in design px (GDD §12). */
export interface Layout {
  size: Size;
  arrangement: Arrangement;
  /** The house's side in cells. */
  n: number;
  /** The board square; the hit area of a cell is the cell. */
  board: Rect;
  cell: number;
  /** Wall thickness between rooms (centred on the cell edges) and the grid inside a room. */
  wall: number;
  grid: number;
  /** The band above the board (kept for the later HUD), or null in landscape. */
  top: Rect | null;
  /** Where the buttons sit: the bottom band, or the column on the right in landscape. */
  hud: Rect;
  buttons: { undo: Circle; hint: Circle };
}

/**
 * The Game screen for a design size and a house of side `n` (GDD §12). Portrait: a top band, the
 * board square almost edge to edge (12 design px each side, D69), a bottom band with undo and
 * hint. Landscape: the board on the left, the buttons in a column on the right. Square (1:1 and
 * near it): thinner bands around a smaller board. The board does not depend on `n`, so every
 * house sits in the same frame; at 8 × 8, the largest house, cells stay ≥ 80 design px in every
 * arrangement and ≥ 44 CSS px on a 360 × 640 phone.
 */
export function computeLayout(size: Size, n: number): Layout {
  const { width: w, height: h } = size;
  const m = LAYOUT_MARGIN;
  const arrangement: Arrangement =
    h >= w * ARRANGE_RATIO ? 'portrait' : w >= h * ARRANGE_RATIO ? 'landscape' : 'square';
  let board: Rect;
  let top: Rect | null = null;
  let hud: Rect;
  let buttons: { undo: Circle; hint: Circle };
  if (arrangement === 'landscape') {
    hud = { x: w - LANDSCAPE_COLUMN, y: 0, width: LANDSCAPE_COLUMN, height: h };
    const area = w - LANDSCAPE_COLUMN;
    const side = Math.min(h - 2 * m, area - 2 * m);
    board = { x: (area - side) / 2, y: (h - side) / 2, width: side, height: side };
    const r = Math.min(BUTTON_R_MAX, hud.width / 2 - BUTTON_PAD);
    const x = hud.x + hud.width / 2;
    const dy = r + BUTTON_GAP / 2;
    buttons = { undo: { x, y: h / 2 - dy, r }, hint: { x, y: h / 2 + dy, r } };
  } else {
    const portrait = arrangement === 'portrait';
    const above = portrait ? PORTRAIT_TOP_BAND : SQUARE_BAND;
    const below = portrait ? PORTRAIT_BOTTOM_BAND : SQUARE_BAND;
    top = { x: 0, y: 0, width: w, height: above };
    hud = { x: 0, y: h - below, width: w, height: below };
    const room = h - above - below;
    // portrait boards run almost edge to edge, so the cells stay large enough to tap (D69)
    const across = w - 2 * (portrait ? PORTRAIT_SIDE_MARGIN : m);
    const side = Math.min(across, room - 2 * m);
    board = { x: (w - side) / 2, y: above + (room - side) / 2, width: side, height: side };
    const r = Math.min(BUTTON_R_MAX, below / 2 - BUTTON_PAD);
    const y = hud.y + below / 2;
    const dx = r + BUTTON_GAP / 2;
    buttons = { undo: { x: w / 2 - dx, y, r }, hint: { x: w / 2 + dx, y, r } };
  }
  const cell = board.width / n;
  const wall = Math.min(WALL_MAX, Math.max(WALL_MIN, WALL_SHARE * cell));
  // a copy: Phaser passes its live gameSize, which a resize changes in place (audit ORTA 5)
  return {
    size: { width: w, height: h },
    arrangement,
    n,
    board,
    cell,
    wall,
    grid: GRID_LINE,
    top,
    hud,
    buttons,
  };
}

/**
 * The progress dots (D75): one per room, in room-id order. Portrait and square: a row centred in
 * the top band. Landscape: rows of DOT_COLUMNS from the top of the HUD column, above the buttons.
 * The radius shrinks from DOT_R_MAX only when the row would not fit.
 */
export function dotsLayout(l: Layout, rooms: number): Circle[] {
  const m = LAYOUT_MARGIN;
  if (l.top) {
    const across = l.top.width - 2 * m;
    const r = Math.min(DOT_R_MAX, (across / rooms - DOT_GAP) / 2, l.top.height / 2 - DOT_GAP);
    const step = 2 * r + DOT_GAP;
    const x0 = l.top.x + l.top.width / 2 - ((rooms - 1) * step) / 2;
    const y = l.top.y + l.top.height / 2;
    return Array.from({ length: rooms }, (_, k) => ({ x: x0 + k * step, y, r }));
  }
  const cols = Math.min(DOT_COLUMNS, rooms);
  const r = Math.min(DOT_R_MAX, ((l.hud.width - 2 * m) / cols - DOT_GAP) / 2);
  const step = 2 * r + DOT_GAP;
  const x0 = l.hud.x + l.hud.width / 2 - ((cols - 1) * step) / 2;
  return Array.from({ length: rooms }, (_, k) => ({
    x: x0 + (k % cols) * step,
    y: l.hud.y + m + r + Math.floor(k / cols) * step,
    r,
  }));
}

/**
 * Where the solve time ticks in during the finale (D85), a box WIN_DIGITS_SIZE high: below the
 * board when the board leaves room under it (portrait); else in the bottom band left of the undo
 * button (square, and portrait near 1:1); in landscape, under the buttons in the HUD column. It
 * never meets a progress dot, the board or a button.
 */
export function timeBox(l: Layout): Rect {
  const m = LAYOUT_MARGIN;
  const h = WIN_DIGITS_SIZE;
  if (l.arrangement === 'landscape') {
    const top = l.buttons.hint.y + l.buttons.hint.r + BUTTON_PAD;
    const bottom = l.size.height - m;
    return { x: l.hud.x + m, y: (top + bottom - h) / 2, width: l.hud.width - 2 * m, height: h };
  }
  const below = l.board.y + l.board.height;
  const gap = l.hud.y - below;
  if (gap >= h + 2 * BUTTON_PAD) {
    return { x: l.board.x, y: below + (gap - h) / 2, width: l.board.width, height: h };
  }
  const undo = l.buttons.undo;
  const right = undo.x - undo.r - BUTTON_PAD;
  return { x: m, y: l.hud.y + (l.hud.height - h) / 2, width: right - 2 * m, height: h };
}

/** The cell under a point, or −1 outside the board. */
export function cellAt(l: Layout, x: number, y: number): number {
  const { board, cell, n } = l;
  if (x < board.x || y < board.y || x >= board.x + board.width || y >= board.y + board.height) {
    return -1;
  }
  const col = Math.min(n - 1, Math.floor((x - board.x) / cell));
  const row = Math.min(n - 1, Math.floor((y - board.y) / cell));
  return row * n + col;
}

/** The middle of cell `i`. */
export function cellCenter(l: Layout, i: number): { x: number; y: number } {
  const half = 0.5;
  return {
    x: l.board.x + ((i % l.n) + half) * l.cell,
    y: l.board.y + (Math.floor(i / l.n) + half) * l.cell,
  };
}
