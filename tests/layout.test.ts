import { describe, expect, it } from 'vitest';
import {
  ARRANGE_RATIO,
  CARD_FONT_MIN,
  CARD_H,
  CELL_MIN,
  DESIGN_LONG_MAX,
  DESIGN_SHORT,
  DOT_R_MIN,
  LANDSCAPE_SIDE,
  SIDE_GAP,
} from '../src/config';
import { SIDE_MAX } from '../src/gen/params';
import {
  BOOT_SIZES,
  badgeFor,
  bootLayout,
  cardBox,
  cardSlots,
  cellAt,
  cellCenter,
  computeLayout,
  designSize,
  dotsLayout,
  roomBadge,
  type Circle,
  type Rect,
  type Size,
} from '../src/game/layout';

/** Touch-size floors for a cell in CSS px (D69; WCAG 2.5.5's 44 px target on a 360 px phone). */
const CSS_CELL_MIN_SMALL = 44;
const CSS_CELL_MIN_LARGE = 66;
/** Walls on the same phone (D71). */
const WALL_CSS_MIN = 4;

/** The design size (CLAUDE.md rule 5): short side 1080, long side follows the aspect. */
describe('designSize', () => {
  it('keeps the short side at 1080 and follows the viewport aspect', () => {
    expect(designSize(390, 693)).toEqual({ width: 1080, height: 1919 }); // 9:16 phone
    expect(designSize(1280, 720)).toEqual({ width: 1920, height: 1080 }); // 16:9
    expect(designSize(800, 800)).toEqual({ width: 1080, height: 1080 }); // 1:1
    expect(designSize(768, 1024)).toEqual({ width: 1080, height: 1440 }); // 3:4
  });

  it('clamps the long side to [1080, 2400]; past the clamp Scale.FIT letterboxes', () => {
    expect(designSize(300, 1000)).toEqual({ width: 1080, height: DESIGN_LONG_MAX });
    expect(designSize(2560, 600)).toEqual({ width: DESIGN_LONG_MAX, height: 1080 });
  });

  it('never breaks on degenerate viewports', () => {
    expect(designSize(0, 0)).toEqual({ width: DESIGN_SHORT, height: DESIGN_SHORT });
    expect(designSize(-5, 10)).toEqual({ width: DESIGN_SHORT, height: DESIGN_LONG_MAX });
  });

  it('every viewport from 1:1 to the clamp, both orientations, stays in range', () => {
    for (let long = 400; long <= 1200; long += 7) {
      for (const [w, h] of [
        [400, long],
        [long, 400],
      ] as const) {
        const s = designSize(w, h);
        expect(Math.min(s.width, s.height)).toBe(DESIGN_SHORT);
        expect(Math.max(s.width, s.height)).toBeGreaterThanOrEqual(DESIGN_SHORT);
        expect(Math.max(s.width, s.height)).toBeLessThanOrEqual(DESIGN_LONG_MAX);
        // the orientation follows the viewport
        expect(s.width >= s.height).toBe(w >= h);
      }
    }
  });
});

/** The boot screen (GDD §11 screen 1; audit 2026-10-21, DÜŞÜK 7). */
describe('bootLayout', () => {
  const sizes = [designSize(390, 693), designSize(1280, 720), designSize(800, 800)];

  it("the fill starts at the track's left edge, whatever the house's width", () => {
    for (const size of sizes) {
      for (const houseW of [BOOT_SIZES.houseW, 200, 520]) {
        const l = bootLayout(size, 1, { ...BOOT_SIZES, houseW });
        expect(l.fill.x).toBe(l.track.x);
        expect(l.fill.y).toBe(l.track.y);
        expect(l.fill.height).toBe(l.track.height);
      }
    }
  });

  it('the track is centred under the house; the fill grows to the full track', () => {
    for (const size of sizes) {
      const empty = bootLayout(size, 0);
      expect(empty.track.x + empty.track.width / 2).toBe(size.width / 2);
      expect(empty.house.x + empty.house.width / 2).toBe(size.width / 2);
      expect(empty.track.y).toBeGreaterThan(empty.house.y + empty.house.height);
      expect(empty.fill.width).toBe(1);
      const full = bootLayout(size, BOOT_SIZES.steps);
      expect(full.fill.width).toBe(full.track.width);
      expect(full.fill.x + full.fill.width).toBe(full.track.x + full.track.width);
    }
  });
});

/** Every design size the scale rule can give (CLAUDE.md rule 5): short side 1080, long side 1080–2400. */
function designSizes(step = 40): Size[] {
  const out: Size[] = [];
  for (let long = DESIGN_SHORT; long <= DESIGN_LONG_MAX; long += step) {
    out.push({ width: DESIGN_SHORT, height: long }, { width: long, height: DESIGN_SHORT });
  }
  out.push({ width: DESIGN_SHORT, height: DESIGN_LONG_MAX });
  out.push({ width: DESIGN_LONG_MAX, height: DESIGN_SHORT });
  return out;
}

function inside(r: Rect, size: Size): boolean {
  return r.x >= 0 && r.y >= 0 && r.x + r.width <= size.width && r.y + r.height <= size.height;
}

function within(r: Rect, outer: Rect): boolean {
  return (
    r.x >= outer.x &&
    r.y >= outer.y &&
    r.x + r.width <= outer.x + outer.width &&
    r.y + r.height <= outer.y + outer.height
  );
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function circleBox(c: Circle): Rect {
  return { x: c.x - c.r, y: c.y - c.r, width: 2 * c.r, height: 2 * c.r };
}

/** The graybox screen (GDD §12): the board square, the bands, the HUD buttons. */
describe('computeLayout', () => {
  it('keeps its own copy of the size, so the scene can tell a new size from the old one', () => {
    // Phaser hands the scene its live gameSize object, which a resize changes in place (audit
    // 2026-10-21, ORTA 5): a layout that kept it would always match the size it is compared with
    const live = { width: 1080, height: 1920 };
    const l = computeLayout(live, 6);
    expect(l.size).not.toBe(live);
    live.width = 1920;
    live.height = 1080;
    expect(l.size).toEqual({ width: 1080, height: 1920 });
  });

  it('picks portrait, square or landscape by the aspect (9:16, 1:1, 16:9)', () => {
    expect(computeLayout(designSize(390, 844), 9).arrangement).toBe('portrait');
    expect(computeLayout(designSize(600, 600), 9).arrangement).toBe('square');
    expect(computeLayout(designSize(844, 390), 9).arrangement).toBe('landscape');
    expect(computeLayout(designSize(1280, 720), 9).arrangement).toBe('landscape');
  });

  it('over every design size (40 px steps): cells ≥ 80 px at 9 × 9, nothing overlaps, all on screen', () => {
    const wrong: string[] = [];
    for (const size of designSizes()) {
      const l = computeLayout(size, 9);
      const tag = `${String(size.width)}×${String(size.height)}`;
      if (l.cell < CELL_MIN) wrong.push(`${tag}: cell ${String(l.cell)}`);
      if (l.board.width !== l.board.height) wrong.push(`${tag}: board not square`);
      const pad = l.wall / 2; // walls are centred on the board's edge
      const outer = {
        x: l.board.x - pad,
        y: l.board.y - pad,
        width: l.board.width + 2 * pad,
        height: l.board.height + 2 * pad,
      };
      const parts: [string, Rect][] = [
        ['board', outer],
        ['hud', l.hud],
        ['undo', circleBox(l.buttons.undo)],
        ['hint', circleBox(l.buttons.hint)],
      ];
      if (l.top) parts.push(['top', l.top]);
      for (const [name, r] of parts) if (!inside(r, size)) wrong.push(`${tag}: ${name} off screen`);
      if (overlaps(outer, l.hud)) wrong.push(`${tag}: board over the HUD`);
      if (l.top && overlaps(outer, l.top)) wrong.push(`${tag}: board over the top band`);
      if (overlaps(circleBox(l.buttons.undo), circleBox(l.buttons.hint))) {
        wrong.push(`${tag}: buttons overlap`);
      }
      for (const b of [l.buttons.undo, l.buttons.hint]) {
        if (!within(circleBox(b), l.hud)) wrong.push(`${tag}: a button outside the HUD`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('cells ≥ 44 CSS px on a 360 × 640 phone and ≥ 66 at 540 × 960, every side up to 8 (D69)', () => {
    // Scale.FIT shows the design size at the viewport's scale: 1080 design px across 360 CSS px
    const cssCell = (w: number, h: number, n: number): number => {
      const size = designSize(w, h);
      return computeLayout(size, n).cell * Math.min(w / size.width, h / size.height);
    };
    for (let n = 2; n <= SIDE_MAX; n++) {
      expect(cssCell(360, 640, n)).toBeGreaterThanOrEqual(CSS_CELL_MIN_SMALL);
      expect(cssCell(540, 960, n)).toBeGreaterThanOrEqual(CSS_CELL_MIN_LARGE);
    }
    // the playtester's phone and the common ones in between keep the floor too
    for (const [w, h] of [
      [360, 780],
      [375, 667],
      [390, 844],
      [412, 915],
    ] as const) {
      expect(cssCell(w, h, SIDE_MAX)).toBeGreaterThanOrEqual(CSS_CELL_MIN_SMALL);
    }
  });

  it('cells ≥ 80 design px at 8 × 8 in every arrangement and every design size', () => {
    const small = designSizes().filter((size) => computeLayout(size, SIDE_MAX).cell < CELL_MIN);
    expect(small).toEqual([]);
  });

  it('every side 2–9 fills the same board; walls are three grid lines thick at least', () => {
    for (const size of [designSize(390, 844), designSize(600, 600), designSize(844, 390)]) {
      const nine = computeLayout(size, 9);
      for (let n = 2; n <= 9; n++) {
        const l = computeLayout(size, n);
        expect(l.board).toEqual(nine.board);
        expect(l.cell * n).toBeCloseTo(l.board.width, 9);
        expect(l.wall).toBeGreaterThanOrEqual(3 * l.grid);
      }
    }
  });

  it('walls are ≥ 4 CSS px on a 360 × 640 phone, for every side (D71)', () => {
    const size = designSize(360, 640);
    const scale = 360 / size.width;
    for (let n = 2; n <= SIDE_MAX; n++) {
      expect(computeLayout(size, n).wall * scale).toBeGreaterThanOrEqual(WALL_CSS_MIN);
    }
  });

  it('cellAt is the cell under a point, and cellCenter its middle; outside the board −1', () => {
    for (const size of [designSize(390, 844), designSize(600, 600), designSize(844, 390)]) {
      for (const n of [2, 5, 9]) {
        const l = computeLayout(size, n);
        for (let i = 0; i < n * n; i++) {
          const c = cellCenter(l, i);
          expect(cellAt(l, c.x, c.y)).toBe(i);
          // a point just inside each corner of the cell is still the cell
          const r = Math.floor(i / n);
          const k = i % n;
          const x0 = l.board.x + k * l.cell;
          const y0 = l.board.y + r * l.cell;
          expect(cellAt(l, x0 + 1, y0 + 1)).toBe(i);
          expect(cellAt(l, x0 + l.cell - 1, y0 + l.cell - 1)).toBe(i);
        }
        expect(cellAt(l, l.board.x - 1, l.board.y)).toBe(-1);
        expect(cellAt(l, l.board.x, l.board.y + l.board.height + 1)).toBe(-1);
      }
    }
  });
});

describe('dotsLayout: one progress dot per room (D75)', () => {
  it('in the top band (portrait, square) or the HUD column (landscape), clear of the board and the buttons', () => {
    const wrong: string[] = [];
    for (const size of designSizes()) {
      for (const rooms of [2, 5, 8, 12]) {
        const l = computeLayout(size, SIDE_MAX);
        const dots = dotsLayout(l, rooms);
        const tag = `${String(size.width)}×${String(size.height)} ${String(rooms)} rooms`;
        if (dots.length !== rooms) wrong.push(`${tag}: ${String(dots.length)} dots`);
        // the top band, or in landscape the swatch column left of the board (D102)
        const band = l.top ?? l.side;
        if (!band) {
          wrong.push(`${tag}: no band for the dots`);
          continue;
        }
        dots.forEach((d, k) => {
          if (!within(circleBox(d), band)) wrong.push(`${tag}: dot ${String(k)} outside its band`);
          if (overlaps(circleBox(d), l.board)) wrong.push(`${tag}: dot ${String(k)} on the board`);
          for (const b of [l.buttons.undo, l.buttons.hint]) {
            if (overlaps(circleBox(d), circleBox(b)))
              wrong.push(`${tag}: dot ${String(k)} on a button`);
          }
          for (const e of dots.slice(k + 1)) {
            if (Math.hypot(d.x - e.x, d.y - e.y) < d.r + e.r) wrong.push(`${tag}: dots overlap`);
          }
          if (d.r < DOT_R_MIN) wrong.push(`${tag}: dot ${String(k)} too small`);
        });
      }
    }
    expect(wrong).toEqual([]);
  });

  it('stay readable on a 360 × 640 phone: ≥ 9 CSS px in radius with 12 rooms (design critique)', () => {
    const DOT_CSS_R_MIN = 9;
    const l = computeLayout(designSize(360, 640), SIDE_MAX);
    const css = 360 / l.size.width;
    for (const d of dotsLayout(l, 12)) expect(d.r * css).toBeGreaterThanOrEqual(DOT_CSS_R_MIN);
  });

  it('runs in room-id order: left to right, then down', () => {
    const l = computeLayout(designSize(390, 844), 6);
    const dots = dotsLayout(l, 6);
    expect(dots.map((d) => d.x)).toEqual([...dots.map((d) => d.x)].sort((a, b) => a - b));
    expect(new Set(dots.map((d) => d.y)).size).toBe(1);
  });
});

describe('cardBox: the held result card (Gate B tune round 3 §3, D99; was the time box, D85)', () => {
  /**
   * The card's four things (the house number, the solve time, the no-hint badge, the next arrow)
   * in slots; a solve time under ten minutes ("9:59") at about 0.6 em a character must fit its slot.
   */
  const TIME_EM = 4 * 0.6;

  it('never meets a progress dot, the board or a button, fits its slots, at every design size', () => {
    const wrong: string[] = [];
    for (const size of designSizes()) {
      for (const rooms of [2, 5, 8, 12]) {
        const l = computeLayout(size, SIDE_MAX);
        const t = cardBox(l);
        const tag = `${String(size.width)}×${String(size.height)} ${l.arrangement}`;
        if (!inside(t, size)) wrong.push(`${tag}: off screen`);
        if (t.height < CARD_H) wrong.push(`${tag}: too low`);
        const pad = l.wall / 2;
        const board = {
          x: l.board.x - pad,
          y: l.board.y - pad,
          width: l.board.width + 2 * pad,
          height: l.board.height + 2 * pad,
        };
        if (overlaps(t, board)) wrong.push(`${tag}: on the board`);
        for (const b of [l.buttons.undo, l.buttons.hint]) {
          if (overlaps(t, circleBox(b))) wrong.push(`${tag}: on a button`);
        }
        for (const d of dotsLayout(l, rooms)) {
          if (overlaps(t, circleBox(d))) wrong.push(`${tag}: on a dot (${String(rooms)} rooms)`);
        }
        const slots = cardSlots(t);
        if (slots.cells.length !== 4) wrong.push(`${tag}: ${String(slots.cells.length)} slots`);
        for (const c of slots.cells)
          if (!within(c, t)) wrong.push(`${tag}: a slot outside the card`);
        if (slots.font < CARD_FONT_MIN) wrong.push(`${tag}: font ${String(slots.font)}`);
        const time = slots.cells[1] as Rect;
        if (time.width < TIME_EM * slots.font || time.height < slots.font) {
          wrong.push(`${tag}: the time does not fit its slot`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it('stands right below the board in portrait at 9:16, its four things in one row', () => {
    const l = computeLayout(designSize(360, 640), 7);
    const t = cardBox(l);
    expect(t.y).toBeGreaterThan(l.board.y + l.board.height);
    expect(t.y + t.height).toBeLessThan(l.hud.y);
    expect(t.x + t.width / 2).toBeCloseTo(l.board.x + l.board.width / 2);
    const slots = cardSlots(t);
    expect([slots.cols, slots.rows]).toEqual([4, 1]);
  });

  it('readable on a 360 × 640 phone and at 1:1: its digits ≥ 16 CSS px', () => {
    for (const [w, h] of [
      [360, 640],
      [600, 600],
      [844, 390],
    ] as const) {
      const l = computeLayout(designSize(w, h), 7);
      const css = Math.min(w, h) / DESIGN_SHORT;
      expect(cardSlots(cardBox(l)).font * css).toBeGreaterThanOrEqual(16);
    }
  });
});

describe("the hint's digit badges (Gate B tune round 3 §2, D98)", () => {
  it("a line from the edge: outside the board where the screen leaves room, never over its first cell's middle, a dot or a button", () => {
    const wrong: string[] = [];
    for (const size of designSizes()) {
      for (const n of [5, 6, 7, 8]) {
        const l = computeLayout(size, n);
        const tag = `${String(size.width)}×${String(size.height)} n ${String(n)}`;
        const dots = dotsLayout(l, n + 1);
        for (let k = 0; k < n; k++) {
          const row = badgeFor(l, 'row', k * n);
          const col = badgeFor(l, 'col', k);
          const first = { row: cellCenter(l, k * n), col: cellCenter(l, k) };
          if (!inside(circleBox(row), size) || !inside(circleBox(col), size)) {
            wrong.push(`${tag}: line ${String(k)} off screen`);
          }
          if (row.y !== first.row.y || col.x !== first.col.x) wrong.push(`${tag}: off its line`);
          if (row.x + row.r > first.row.x || col.y + col.r > first.col.y) {
            wrong.push(`${tag}: line ${String(k)} over its first cell's middle`);
          }
          for (const b of [row, col]) {
            for (const d of dots)
              if (overlaps(circleBox(b), circleBox(d))) wrong.push(`${tag}: on a dot`);
            for (const btn of [l.buttons.undo, l.buttons.hint]) {
              if (overlaps(circleBox(b), circleBox(btn))) wrong.push(`${tag}: on a button`);
            }
          }
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it('outside the board left of a row and above a column when there is room (square 1:1, portrait 9:16 columns)', () => {
    const sq = computeLayout(designSize(800, 800), 7);
    const row = badgeFor(sq, 'row', 0);
    expect(row.x + row.r).toBeLessThanOrEqual(sq.board.x - sq.wall / 2);
    const tall = computeLayout(designSize(360, 640), 7);
    const col = badgeFor(tall, 'col', 3);
    expect(col.y + col.r).toBeLessThanOrEqual(tall.board.y - tall.wall / 2);
    // portrait leaves no room left of the board: the badge sits on the board's edge, on screen
    const r = badgeFor(tall, 'row', 7);
    expect(r.x - r.r).toBeGreaterThanOrEqual(0);
    expect(r.x + r.r).toBeLessThanOrEqual(cellCenter(tall, 7).x);
  });

  it('a line split by an object: on the object before its first cell', () => {
    const l = computeLayout(designSize(360, 640), 7);
    expect(badgeFor(l, 'row', 7 + 3)).toMatchObject(cellCenter(l, 7 + 2));
    expect(badgeFor(l, 'col', 2 * 7 + 4)).toMatchObject(cellCenter(l, 7 + 4));
  });

  it("the target room's digit 1: at the top left corner of its first cell, on screen", () => {
    for (const size of designSizes()) {
      const l = computeLayout(size, 7);
      for (const first of [0, 3, 24, 48]) {
        const b = roomBadge(l, first);
        expect(inside(circleBox(b), size)).toBe(true);
        const corner = {
          x: l.board.x + (first % 7) * l.cell,
          y: l.board.y + Math.floor(first / 7) * l.cell,
        };
        expect(Math.abs(b.x - corner.x)).toBeLessThanOrEqual(b.r + 8);
        expect(Math.abs(b.y - corner.y)).toBeLessThanOrEqual(b.r + 8);
      }
    }
  });
});

describe('landscape: the board in the middle (Gate B tune round 3 §6, D102)', () => {
  /** Landscape design sizes, aspect 1.2 to 2.22. */
  const sizes = designSizes(20).filter((z) => z.width >= z.height * ARRANGE_RATIO);

  it('the board centred on the screen; the swatches in a column left of it, the buttons and the card right of it, SIDE_GAP apart; nothing overlaps', () => {
    const wrong: string[] = [];
    expect(sizes.length).toBeGreaterThan(50);
    for (const size of sizes) {
      for (const n of [5, 6, 7, 8]) {
        const l = computeLayout(size, n);
        const tag = `${String(size.width)}×${String(size.height)} n ${String(n)}`;
        const cx = l.board.x + l.board.width / 2;
        const cy = l.board.y + l.board.height / 2;
        if (Math.abs(cx - size.width / 2) > 1 || Math.abs(cy - size.height / 2) > 1) {
          wrong.push(`${tag}: the board off centre`);
        }
        const side = l.side;
        if (!side) {
          wrong.push(`${tag}: no swatch column`);
          continue;
        }
        if (side.width !== LANDSCAPE_SIDE || l.hud.width !== LANDSCAPE_SIDE)
          wrong.push(`${tag}: widths`);
        if (Math.abs(l.board.x - (side.x + side.width) - SIDE_GAP) > 1e-6)
          wrong.push(`${tag}: left gap`);
        if (Math.abs(l.hud.x - (l.board.x + l.board.width) - SIDE_GAP) > 1e-6) {
          wrong.push(`${tag}: right gap`);
        }
        const pad = l.wall / 2;
        const board = {
          x: l.board.x - pad,
          y: l.board.y - pad,
          width: l.board.width + 2 * pad,
          height: l.board.height + 2 * pad,
        };
        const card = cardBox(l);
        const buttons = [l.buttons.undo, l.buttons.hint].map(circleBox);
        const dots = dotsLayout(l, 12).map(circleBox);
        const parts: [string, Rect][] = [
          ['board', board],
          ['card', card],
          ...buttons.map((b, k) => [`button ${String(k)}`, b] as [string, Rect]),
          ...dots.map((d, k) => [`dot ${String(k)}`, d] as [string, Rect]),
        ];
        for (const [name, r] of parts)
          if (!inside(r, size)) wrong.push(`${tag}: ${name} off screen`);
        parts.forEach(([a, ra], i) => {
          for (const [b, rb] of parts.slice(i + 1)) {
            if (a.startsWith('dot') && b.startsWith('dot')) continue;
            if (overlaps(ra, rb)) wrong.push(`${tag}: ${a} over ${b}`);
          }
        });
        for (const d of dots) if (!within(d, side)) wrong.push(`${tag}: a dot outside its column`);
        for (const b of [...buttons, card])
          if (!within(b, l.hud)) wrong.push(`${tag}: outside the right column`);
        if (n === 8 && l.cell < CELL_MIN) wrong.push(`${tag}: cell ${String(l.cell)}`);
      }
    }
    expect(wrong.slice(0, 10)).toEqual([]);
  });

  it('at 844 × 390 the board stands in the middle with room on both sides', () => {
    const l = computeLayout(designSize(844, 390), 7);
    expect(l.arrangement).toBe('landscape');
    expect(l.board.x + l.board.width / 2).toBeCloseTo(l.size.width / 2);
    expect(l.side?.x ?? -1).toBeGreaterThanOrEqual(0);
  });
});
