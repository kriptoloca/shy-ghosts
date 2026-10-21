import { describe, expect, it } from 'vitest';
import { CELL_MIN, DESIGN_LONG_MAX, DESIGN_SHORT } from '../src/config';
import {
  BOOT_SIZES,
  bootLayout,
  cellAt,
  cellCenter,
  computeLayout,
  designSize,
  type Circle,
  type Rect,
  type Size,
} from '../src/game/layout';

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

  it('every side 2–9 fills the same board; walls are thicker than the grid lines', () => {
    for (const size of [designSize(390, 844), designSize(600, 600), designSize(844, 390)]) {
      const nine = computeLayout(size, 9);
      for (let n = 2; n <= 9; n++) {
        const l = computeLayout(size, n);
        expect(l.board).toEqual(nine.board);
        expect(l.cell * n).toBeCloseTo(l.board.width, 9);
        expect(l.wall).toBeGreaterThan(l.grid);
      }
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
