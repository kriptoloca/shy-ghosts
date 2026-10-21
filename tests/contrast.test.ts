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
  COLOR_WALL,
  DOT_EMPTY_ALPHA,
  DOT_HALO,
  FLOOR_MARGIN,
  HATCH_EDGE_SHARE,
  HATCH_HALO,
  HATCH_SHARE,
  MARK_HALO,
  MARK_SHARE,
  RING_HALO,
  RING_INSET,
  RING_WIDTH,
  SEEN_DOT,
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
 * The readability floors of the graybox palette (Gate B tune rounds 1 and 2, docs/gate-b-round1.md
 * §2.2, docs/gate-b-round2.md §4; D71, D85), each over every colour pair it names: F1 walls, F2
 * neighbouring rooms, unique room colours, F3 the settled cue, F4 marks, F5 the light cue, F6
 * every line and outline drawn on the floors, F7 not a nursery palette. Contrast is the WCAG 2
 * ratio (luminance only, so it is also the grayscale reading); ΔE00 is CIEDE2000; a deuteranope is
 * simulated (Machado et al. 2009). A cell is read as the average of what covers it: a lit cell is
 * its floor under the amber hatch (HATCH_SHARE of its area) and the hatch's outline
 * (HATCH_EDGE_SHARE). A settled room keeps its floor (no wash, D85). Locally, every ink touches
 * only its own floor's colour (the last block below; round 1's code audit, DÜŞÜK 7).
 */
const FLOORS: Rgb[][] = COLOR_FLOORS.map((row) => row.map(rgb));
const ALL = FLOORS.flat();
const wall = rgb(COLOR_WALL);
const hatch = rgb(COLOR_HATCH);
const edge = rgb(COLOR_HATCH_EDGE);
const ring = rgb(COLOR_SETTLED_RING);
const lit = (f: Rgb): Rgb => mix(mix(f, hatch, HATCH_SHARE), edge, HATCH_EDGE_SHARE);
/** Every state a floor is seen in: plain or lit. */
const STATES: Rgb[] = ALL.flatMap((f) => [f, lit(f)]);
/** A floor by its level and hue family. */
interface Floor {
  level: number;
  hue: number;
  rgb: Rgb;
}
const FLOOR_LIST: Floor[] = FLOORS.flatMap((row, level) =>
  row.map((c, hue) => ({ level, hue, rgb: c })),
);
/** Pairs of rooms that may touch (src/game/look.ts): neighbours differ in level and in hue. */
const NEIGHBOURS: [Rgb, Rgb][] = FLOOR_LIST.flatMap((a) =>
  FLOOR_LIST.filter((b) => b.level > a.level && b.hue !== a.hue).map(
    (b) => [a.rgb, b.rgb] as [Rgb, Rgb],
  ),
);
/** Two rooms may share a house unless they share a hue less than two levels apart (look.ts). */
const together = (a: Floor, b: Floor): boolean =>
  a !== b && (a.hue !== b.hue || Math.abs(a.level - b.level) >= 2);
const min = (v: readonly number[]): number => Math.min(...v);
/** For each floor: how much closer `seen(f)` stays to f than to any floor it may share a house with (ΔE00). */
const ownMargin = (seen: (f: Rgb) => Rgb): number =>
  min(
    FLOOR_LIST.map((f) => {
      const s = seen(f.rgb);
      const others = FLOOR_LIST.filter((g) => together(f, g)).map((g) => deltaE00(s, g.rgb));
      return min(others) - deltaE00(s, f.rgb);
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

  it('every room of a house has a colour of its own: any two floors that may share a house ΔE00 ≥ 7', () => {
    const d: number[] = [];
    FLOOR_LIST.forEach((a, i) => {
      for (const b of FLOOR_LIST.slice(i + 1)) if (together(a, b)) d.push(deltaE00(a.rgb, b.rgb));
    });
    expect(min(d)).toBeGreaterThanOrEqual(7);
    expect(ALL).toHaveLength(32);
  });

  it('F3: the settled ring ≥ 3:1 against every floor state, in normal vision, grayscale and deuteranope', () => {
    for (const view of [(c: Rgb): Rgb => c, gray, deuteranope]) {
      expect(min(STATES.map((s) => contrast(view(ring), view(s))))).toBeGreaterThanOrEqual(3);
    }
  });

  it('F3: the settled and the light cue differ in hue', () => {
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
    expect(COLOR_FLOOR_INKS.map((row) => row.length)).toEqual(
      COLOR_FLOORS.map((row) => row.length),
    );
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

/**
 * Local contrast (round 1's code audit, DÜŞÜK 7; D85): each ink against the colours it actually touches.
 * The board draws it so that every ink touches only its own floor's colour: the wallpaper and the
 * hatch stop FLOOR_MARGIN inside every wall, room enough for the settled ring with RING_HALO of
 * plain floor on each side; marks, sight dots and glances carry a ring of their floor's colour;
 * the hatch's stripes a band of it; nothing is printed on a bookshelf's or a lamp's cell. So the
 * floors F1, F3, F4, F5 and F6 hold locally, not only on average: before this round the lowest
 * local pairs were the ring on the wallpaper's ink (1.91), a mark on the ink (2.39), the sight line
 * on the ink (2.28), a wall on the hatch's edge (1.39) and a mark on the hatch's edge (1.06).
 */
describe('local contrast: every ink touches only its own floor (DÜŞÜK 7, D85)', () => {
  it('the drawing leaves room: the ring and its halos fit the plain band inside the walls; every mark, dot and stripe has a halo', () => {
    expect(FLOOR_MARGIN).toBeGreaterThanOrEqual(RING_INSET + RING_WIDTH + RING_HALO);
    expect(RING_HALO).toBeGreaterThanOrEqual(2);
    for (const halo of [MARK_HALO, DOT_HALO, HATCH_HALO]) expect(halo).toBeGreaterThan(0);
    // a mark's halo never reaches the band of a wall, even in the smallest cells
    expect(MARK_SHARE + MARK_HALO).toBeLessThan(0.5 - FLOOR_MARGIN / 80);
    expect(SEEN_DOT + DOT_HALO).toBeLessThan(MARK_SHARE + MARK_HALO);
  });

  /** In every view, the lowest contrast of `ink` against the plain floors it touches. */
  const local = (ink: Rgb): number =>
    min(VIEWS.map(([, view]) => min(ALL.map((f) => contrast(view(ink), view(f))))));

  it('walls ≥ 4.5:1 and every line, dot and outline ≥ 3:1 against the floor beside it, in every view', () => {
    expect(local(wall)).toBeGreaterThanOrEqual(4.5);
    const inks: [string, number][] = [
      ['settled ring', COLOR_SETTLED_RING],
      ['mark', COLOR_MARK],
      ['sight line', COLOR_SEEN_LINE],
      ['glance', COLOR_GLANCE],
      ["hatch's edge", COLOR_HATCH_EDGE],
      ['bookshelf outline', COLOR_FURNITURE_EDGE],
      ['lamp outline', COLOR_LAMP_EDGE],
    ];
    const low = inks.filter(([, ink]) => local(rgb(ink)) < 3);
    expect(low.map(([name]) => name)).toEqual([]);
  });

  it('reported: the lowest local pair of each ink', () => {
    const rows = [
      ['wall', local(wall)],
      ['ring', local(ring)],
      ['mark', local(rgb(COLOR_MARK))],
      ['sight line', local(rgb(COLOR_SEEN_LINE))],
      ["hatch's edge", local(edge)],
    ] as const;
    console.log(rows.map(([n, v]) => `${n} ${v.toFixed(2)}`).join(', '));
    expect(rows.every(([, v]) => v > 1)).toBe(true);
  });
});
