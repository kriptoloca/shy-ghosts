import { describe, expect, it } from 'vitest';
import { DESIGN_LONG_MAX, DESIGN_SHORT } from '../src/config';
import { BOOT_SIZES, bootLayout, designSize } from '../src/game/layout';

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
