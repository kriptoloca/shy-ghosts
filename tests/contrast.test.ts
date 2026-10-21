import { describe, expect, it } from 'vitest';
import * as config from '../src/config';
import {
  COLOR_FLOORS,
  COLOR_FLOOR_INKS,
  COLOR_PAGE,
  COLOR_FURNITURE_EDGE,
  COLOR_GLANCE,
  COLOR_HATCH,
  COLOR_HATCH_EDGE,
  COLOR_LAMP_EDGE,
  COLOR_MARK,
  COLOR_SEEN_LINE,
  COLOR_SETTLED_RING,
  COLOR_SETTLED_WASH,
  COLOR_WALL,
  DOT_EMPTY_ALPHA,
  HATCH_EDGE_SHARE,
  HATCH_SHARE,
  SETTLED_WASH_ALPHA,
} from '../src/config';
import {
  chroma,
  contrast,
  deltaE00,
  deltaE00Lab,
  deuteranope,
  gray,
  hueAngle,
  lightness,
  mix,
  rgb,
  type Rgb,
} from './support/colour';

/**
 * The readability floors of the graybox palette (Gate B tune round 1, docs/gate-b-round1.md §2.2;
 * D71), each over every colour pair it names: F1 walls, F2 neighbouring rooms, unique room
 * colours, F3 the settled cue, F4 marks, F5 the light cue, F6 every line and outline drawn on the
 * floors, F7 not a nursery palette. Contrast is the WCAG 2 ratio (luminance only, so it is also
 * the grayscale reading); ΔE00 is CIEDE2000; a deuteranope is simulated (Machado et al. 2009). A
 * cell is read as the average of what covers it: a lit cell is its floor under the amber hatch
 * (HATCH_SHARE of its area) and the hatch's outline (HATCH_EDGE_SHARE); a settled room's floor
 * lies under the teal wash; a lit cell of a settled room has both.
 */
const FLOORS: Rgb[][] = COLOR_FLOORS.map((row) => row.map(rgb));
const ALL = FLOORS.flat();
const wall = rgb(COLOR_WALL);
const hatch = rgb(COLOR_HATCH);
const edge = rgb(COLOR_HATCH_EDGE);
const wash = rgb(COLOR_SETTLED_WASH);
const ring = rgb(COLOR_SETTLED_RING);
const lit = (f: Rgb): Rgb => mix(mix(f, hatch, HATCH_SHARE), edge, HATCH_EDGE_SHARE);
const settled = (f: Rgb): Rgb => mix(f, wash, SETTLED_WASH_ALPHA);
/** Every state a floor is seen in: plain, lit, settled, lit in a settled room. */
const STATES: Rgb[] = ALL.flatMap((f) => [f, lit(f), settled(f), lit(settled(f))]);
/** Pairs of rooms that may touch: the 4-colouring puts neighbours on different levels. */
const NEIGHBOURS: [Rgb, Rgb][] = FLOORS.flatMap((row, l) =>
  l + 1 < FLOORS.length
    ? FLOORS.slice(l + 1).flatMap((other) =>
        row.flatMap((a) => other.map((b) => [a, b] as [Rgb, Rgb])),
      )
    : [],
);
const min = (v: readonly number[]): number => Math.min(...v);
/** For each floor: how much closer `seen(f)` stays to f than to any other floor (ΔE00). */
const ownMargin = (seen: (f: Rgb) => Rgb): number =>
  min(
    ALL.map((f) => {
      const s = seen(f);
      return min(ALL.filter((g) => g !== f).map((g) => deltaE00(s, g))) - deltaE00(s, f);
    }),
  );

describe('colour arithmetic', () => {
  it("CIEDE2000 matches Sharma, Wu and Dalal's published pairs", () => {
    const pairs: [[number, number, number], [number, number, number], number][] = [
      [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
      [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
      [[50, 0, 0], [50, -1, 2], 2.3669],
      [[50, 2.5, 0], [73, 25, -18], 27.1492],
      [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    ];
    for (const [a, b, want] of pairs) expect(deltaE00Lab(a, b)).toBeCloseTo(want, 3);
  });
});

/** Normal vision, grayscale (luminance only) and a simulated deuteranope: every floor holds in all three. */
const VIEWS: [string, (c: Rgb) => Rgb][] = [
  ['normal', (c) => c],
  ['grayscale', gray],
  ['deuteranope', deuteranope],
];
/** The lowest contrast of `ink` against every floor state, in every view. */
const lowest = (ink: Rgb): number =>
  min(VIEWS.map(([, view]) => min(STATES.map((s) => contrast(view(ink), view(s))))));

describe('the palette floors (D71)', () => {
  it('F1: walls ≥ 4.5:1 against every floor in every state, in every view', () => {
    expect(lowest(wall)).toBeGreaterThanOrEqual(4.5);
  });

  it('F2: neighbouring rooms ≥ 1.3:1, ΔL* ≥ 9.5 (so in grayscale too), deuteranope ΔE00 ≥ 6', () => {
    expect(min(NEIGHBOURS.map(([a, b]) => contrast(a, b)))).toBeGreaterThanOrEqual(1.3);
    expect(
      min(NEIGHBOURS.map(([a, b]) => Math.abs(lightness(a) - lightness(b)))),
    ).toBeGreaterThanOrEqual(9.5);
    expect(
      min(NEIGHBOURS.map(([a, b]) => deltaE00(deuteranope(a), deuteranope(b)))),
    ).toBeGreaterThanOrEqual(6);
  });

  it('every room of a house has a colour of its own: any two floors ΔE00 ≥ 7', () => {
    const d: number[] = [];
    ALL.forEach((a, i) => {
      for (const b of ALL.slice(i + 1)) d.push(deltaE00(a, b));
    });
    expect(min(d)).toBeGreaterThanOrEqual(7);
    expect(ALL).toHaveLength(12);
  });

  it('F3: the settled ring ≥ 3:1 against every floor state, in normal vision, grayscale and deuteranope', () => {
    for (const view of [(c: Rgb): Rgb => c, gray, deuteranope]) {
      expect(min(STATES.map((s) => contrast(view(ring), view(s))))).toBeGreaterThanOrEqual(3);
    }
  });

  it('F3: a settled room stays closest to its own colour; the settled and the light cue differ in hue', () => {
    expect(ownMargin(settled)).toBeGreaterThanOrEqual(0.5);
    // teal against amber, a third of the colour wheel apart and more
    const apart = Math.abs(hueAngle(ring) - hueAngle(hatch));
    expect(Math.min(apart, 360 - apart)).toBeGreaterThanOrEqual(90);
  });

  it('F4: marks ≥ 3:1 against every floor state, in every view', () => {
    expect(lowest(rgb(COLOR_MARK))).toBeGreaterThanOrEqual(3);
  });

  it("F5: the hatch's outline ≥ 3:1 against every floor state, in every view; a lit cell stays closest to its own room", () => {
    expect(lowest(edge)).toBeGreaterThanOrEqual(3);
    expect(ownMargin(lit)).toBeGreaterThanOrEqual(0.5);
  });

  it('F6: every line, dot and outline drawn on the floors ≥ 3:1 against every floor state, in every view', () => {
    const inks: [string, number][] = [
      ['sight line', COLOR_SEEN_LINE],
      ['glance', COLOR_GLANCE],
      ['mark', COLOR_MARK],
      ['settled ring', COLOR_SETTLED_RING],
      ['bookshelf outline', COLOR_FURNITURE_EDGE],
      ['lamp outline', COLOR_LAMP_EDGE],
    ];
    const low = inks.filter(([, ink]) => lowest(rgb(ink)) < 3);
    expect(low.map(([name]) => name)).toEqual([]);
  });

  it('F7: a muted palette, not a nursery one: floor chroma ≤ 20; every floor has a darker wallpaper ink', () => {
    expect(Math.max(...ALL.map(chroma))).toBeLessThanOrEqual(20);
    const inks = COLOR_FLOOR_INKS.flat().map(rgb);
    expect(inks).toHaveLength(ALL.length);
    inks.forEach((ink, k) => {
      expect(lightness(ink)).toBeLessThan(lightness(ALL[k] as Rgb));
      expect(contrast(ink, ALL[k] as Rgb)).toBeGreaterThan(1.2);
    });
  });
});

describe('the progress dots on the dark page (D75; the design critique, WCAG 1.4.11)', () => {
  const page = rgb(COLOR_PAGE);
  const empty = (f: Rgb): Rgb => mix(page, f, DOT_EMPTY_ALPHA);

  it('every dot has a rim ≥ 3:1 against the page, so the rooms can be counted', () => {
    const rim = (config as Record<string, unknown>).COLOR_DOT_RIM;
    expect(typeof rim).toBe('number');
    expect(contrast(rgb(rim as number), page)).toBeGreaterThanOrEqual(3);
  });

  it("a full dot's dark ring ≥ 3:1 against its swatch; full and empty ≥ 2.5:1 apart", () => {
    expect(min(ALL.map((f) => contrast(ring, f)))).toBeGreaterThanOrEqual(3);
    expect(min(ALL.map((f) => contrast(f, empty(f))))).toBeGreaterThanOrEqual(2.5);
  });
});

describe('the palette, reported (no floor of its own)', () => {
  it('walls against the wallpaper ink of the darkest floors', () => {
    const inks = COLOR_FLOOR_INKS.flat().map(rgb);
    const w = min(inks.map((i) => contrast(wall, i)));
    console.log(`walls against the darkest wallpaper ink: ${w.toFixed(2)}:1`);
    expect(w).toBeGreaterThan(1);
  });
});
