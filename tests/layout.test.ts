import { describe, expect, it } from 'vitest';
import { DESIGN_LONG_MAX, DESIGN_SHORT } from '../src/config';
import { designSize } from '../src/game/layout';

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
