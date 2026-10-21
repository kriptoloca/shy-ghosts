import { describe, expect, it } from 'vitest';
import {
  COLOR_GLOW,
  COLOR_LIT,
  COLOR_MARK,
  COLOR_ROOM_TONES,
  COLOR_WALL,
  GLOW_ALPHA,
  LIT_ALPHA,
} from '../src/config';
import { contrast, deltaE, deuteranope, mix, rgb, type Rgb } from './support/colour';

/**
 * Readability margins of the graybox colours (audit 2026-10-21, DÜŞÜK 11), measured and printed
 * only: the thresholds arrive with the Gate B round-1 tune plan, and then this report becomes the
 * test. Contrast is WCAG 2 (luminance only, so it is also the grayscale reading); ΔE is CIE76, for
 * normal vision and for a simulated deuteranope. A settled room's glow is drawn over its floor,
 * the warm wash of lit cells over both, the marks on top (src/game/board.ts). The report prints
 * with `npx vitest run tests/contrast.test.ts --reporter=verbose`.
 */
const tones = COLOR_ROOM_TONES.map(rgb);
const wall = rgb(COLOR_WALL);
const mark = rgb(COLOR_MARK);
const lit = (c: Rgb): Rgb => mix(c, rgb(COLOR_LIT), LIT_ALPHA);
const glow = (c: Rgb): Rgb => mix(c, rgb(COLOR_GLOW), GLOW_ALPHA);

interface Margin {
  what: string;
  contrast: number;
  deltaE: number;
  deutan: number;
}

function margin(what: string, a: Rgb, b: Rgb): Margin {
  return {
    what,
    contrast: contrast(a, b),
    deltaE: deltaE(a, b),
    deutan: deltaE(deuteranope(a), deuteranope(b)),
  };
}

const lowest = (ms: readonly Margin[]): Margin =>
  ms.reduce((lo, m) => (m.contrast < lo.contrast ? m : lo));

function report(): Margin[] {
  const out: Margin[] = [margin('walls on the darkest floor (tone 0)', wall, tones[0] as Rgb)];
  for (let k = 0; k + 1 < tones.length; k++) {
    const what = `neighbouring floors, tone ${String(k)} vs ${String(k + 1)}`;
    out.push(margin(what, tones[k] as Rgb, tones[k + 1] as Rgb));
  }
  // a glowing room next to a plain one: the plain tone it comes closest to (in grayscale too)
  tones.forEach((a, i) => {
    const others = tones.flatMap((b, j) =>
      j === i
        ? []
        : [margin(`glowing tone ${String(i)}, closest: plain tone ${String(j)}`, glow(a), b)],
    );
    out.push(lowest(others));
  });
  const on = (what: string, under: (t: Rgb) => Rgb): Margin => {
    const each = tones.map((t, i) => margin(`marks on ${what} tone ${String(i)}`, mark, under(t)));
    return { ...lowest(each), what: `lowest: ${lowest(each).what}` };
  };
  out.push(
    on('lit', lit),
    on('glowing', glow),
    on('lit and glowing', (t) => lit(glow(t))),
  );
  return out;
}

describe('graybox contrast report (audit DÜŞÜK 11; thresholds come with the tune plan)', () => {
  it('measures walls, neighbouring floors, glowing rooms and marks', () => {
    const rows = report();
    console.log(
      rows
        .map(
          (m) =>
            `${m.what.padEnd(46)} ${m.contrast.toFixed(2)}:1  ΔE ${m.deltaE.toFixed(1)}` +
            `  deuteranope ΔE ${m.deutan.toFixed(1)}`,
        )
        .join('\n'),
    );
    for (const m of rows) {
      expect(m.contrast).toBeGreaterThanOrEqual(1);
      expect(Number.isFinite(m.deltaE) && Number.isFinite(m.deutan)).toBe(true);
    }
  });
});
