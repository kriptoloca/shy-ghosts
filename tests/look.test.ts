import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseHouse, type HouseModel } from '../src/core/house';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import {
  DOT_PATTERN_MARK,
  HATCH_EDGE_SHARE,
  HATCH_SHARE,
  RING_DASH,
  RING_GAP,
} from '../src/config';
import {
  HUES,
  LEVELS,
  PATTERNS,
  brightCells,
  clockText,
  dashes,
  dotsBetween,
  hatch,
  neighbourRooms,
  polygonArea,
  ringSegments,
  roomStyles,
  swatchMarks,
  wallRuns,
  type Polygon,
} from '../src/game/look';
import type { PlayHouse } from '../src/gen/record';

/**
 * The graybox look (TASKS.md Epic 3; CLAUDE.md, Rendering; D71): every room of a house has a
 * floor colour of its own (a lightness level and a hue family), neighbouring rooms differ in
 * level and in wallpaper pattern, never by hue alone, every floor carries a pattern, and walls run
 * exactly between rooms.
 */
const read = <T>(name: string): T =>
  JSON.parse(readFileSync(new URL(`../src/data/${name}`, import.meta.url), 'utf8')) as T;
const HOUSES: HouseModel[] = [
  ...TUTORIAL_HOUSES.map((d) => parseHouse(d)),
  ...read<PlayHouse[]>('levels.json').map((d) => parseHouse(d)),
  ...Object.values(read<Record<string, PlayHouse>>('dailies.json')).map((d) => parseHouse(d)),
];

describe('roomStyles', () => {
  it('neighbouring rooms differ in lightness level and in pattern, on every house of the game', () => {
    const wrong: string[] = [];
    HOUSES.forEach((h, k) => {
      const styles = roomStyles(h);
      expect(styles).toHaveLength(h.roomCount);
      neighbourRooms(h).forEach((near, a) => {
        for (const b of near) {
          const sa = styles[a];
          const sb = styles[b];
          if (!sa || !sb) continue;
          if (sa.level === sb.level)
            wrong.push(`house #${String(k)}: rooms ${String(a)}, ${String(b)} level`);
          if (sa.pattern === sb.pattern) {
            wrong.push(`house #${String(k)}: rooms ${String(a)}, ${String(b)} pattern`);
          }
        }
      });
    });
    expect(wrong).toEqual([]);
  });

  it('every room of a house has a floor colour of its own, and every floor a pattern', () => {
    const wrong: string[] = [];
    HOUSES.forEach((h, k) => {
      const styles = roomStyles(h);
      const colours = new Set(styles.map((s) => `${String(s.level)}/${String(s.hue)}`));
      if (colours.size !== styles.length) wrong.push(`house #${String(k)}: a colour twice`);
      for (const s of styles) {
        if (s.level < 0 || s.level >= LEVELS || s.hue < 0 || s.hue >= HUES) {
          wrong.push(`house #${String(k)}: no such floor ${JSON.stringify(s)}`);
        }
      }
    });
    expect(wrong).toEqual([]);
    expect(PATTERNS).toHaveLength(6);
    expect(PATTERNS).not.toContain('plain');
    expect(Math.max(...HOUSES.map((h) => h.roomCount))).toBeLessThanOrEqual(LEVELS * HUES);
  });

  it('is deterministic: the same house always looks the same', () => {
    for (const h of HOUSES.slice(0, 50)) expect(roomStyles(h)).toEqual(roomStyles(h));
  });
});

describe('wallRuns', () => {
  it('draw exactly the edges between two rooms and the outer border, as straight runs', () => {
    for (const h of HOUSES.slice(0, 300)) {
      const { n } = h;
      const drawn = new Set<string>();
      for (const run of wallRuns(h)) {
        expect(run.x1 === run.x2 || run.y1 === run.y2).toBe(true);
        if (run.y1 === run.y2) {
          for (let x = run.x1; x < run.x2; x++) drawn.add(`h${String(run.y1)},${String(x)}`);
        } else {
          for (let y = run.y1; y < run.y2; y++) drawn.add(`v${String(run.x1)},${String(y)}`);
        }
      }
      const want = new Set<string>();
      const room = (r: number, c: number): number => h.roomOf[r * n + c] as number;
      for (let r = 0; r <= n; r++) {
        for (let c = 0; c < n; c++) {
          if (r === 0 || r === n || room(r - 1, c) !== room(r, c))
            want.add(`h${String(r)},${String(c)}`);
        }
      }
      for (let c = 0; c <= n; c++) {
        for (let r = 0; r < n; r++) {
          if (c === 0 || c === n || room(r, c - 1) !== room(r, c))
            want.add(`v${String(c)},${String(r)}`);
        }
      }
      expect([...drawn].sort()).toEqual([...want].sort());
    }
  });
});

describe('the light hatch and the settled ring (D71)', () => {
  it('the hatch covers HATCH_SHARE of a lit cell with stripes and HATCH_EDGE_SHARE with their edge', () => {
    const h = hatch();
    const area = (ps: readonly Polygon[]): number => ps.reduce((a, p) => a + polygonArea(p), 0);
    expect(area(h.stripes)).toBeCloseTo(HATCH_SHARE, 9);
    expect(area(h.edges)).toBeCloseTo(HATCH_EDGE_SHARE, 9);
    expect(area(h.stripes) + area(h.edges)).toBeLessThanOrEqual(0.12);
    // every corner of every band lies in the cell
    for (const p of [...h.stripes, ...h.edges]) {
      for (const [x, y] of p) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('the ring of every room is closed and stays inside the room, inset from its walls', () => {
    const inset = 0.1;
    for (const h of HOUSES.slice(0, 200)) {
      for (let room = 0; room < h.roomCount; room++) {
        const segs = ringSegments(h, room, inset);
        // closed: every end meets exactly one other end
        const ends = new Map<string, number>();
        for (const s of segs) {
          for (const [x, y] of [
            [s.x1, s.y1],
            [s.x2, s.y2],
          ] as const) {
            const key = `${x.toFixed(6)},${y.toFixed(6)}`;
            ends.set(key, (ends.get(key) ?? 0) + 1);
          }
        }
        expect([...ends.values()].every((k) => k === 2)).toBe(true);
        // inside the room: the middle of every piece lies in a cell of the room, off its edges
        for (const s of segs) {
          const mx = (s.x1 + s.x2) / 2;
          const my = (s.y1 + s.y2) / 2;
          const cell = Math.floor(my) * h.n + Math.floor(mx);
          expect(h.roomOf[cell]).toBe(room);
          expect(s.x1 === s.x2 || s.y1 === s.y2).toBe(true);
        }
      }
    }
  });

  it('a one-cell-wide room of two cells gets one rectangle', () => {
    const h = parseHouse(TUTORIAL_HOUSES[0] as (typeof TUTORIAL_HOUSES)[number]);
    // house 1: room A is the left column (0,0)-(1,0)
    const segs = ringSegments(h, 0, 0.25);
    expect(segs).toHaveLength(4);
    const xs = segs.flatMap((s) => [s.x1, s.x2]);
    const ys = segs.flatMap((s) => [s.y1, s.y2]);
    expect([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]).toEqual([
      0.25, 0.75, 0.25, 1.75,
    ]);
  });
});

describe("the progress dots, the hint's reason, dotted trails and dashes (D74, D75)", () => {
  it("a dot's wallpaper marks stay inside it and run the way the floor's do", () => {
    const r = 22;
    for (const p of PATTERNS) {
      const m = swatchMarks(p, r);
      expect(m.lines.length + m.points.length).toBeGreaterThanOrEqual(2);
      // stripes are chords of the dot; points keep their whole mark inside it
      for (const [x1, y1, x2, y2] of m.lines) {
        expect(Math.hypot(x1, y1)).toBeCloseTo(r, 9);
        expect(Math.hypot(x2, y2)).toBeCloseTo(r, 9);
      }
      for (const { x, y } of m.points) {
        expect(Math.hypot(x, y) + Math.SQRT2 * DOT_PATTERN_MARK * r).toBeLessThan(r);
      }
    }
    const line = (p: (typeof PATTERNS)[number]): readonly number[] =>
      swatchMarks(p, r).lines[0] ?? [];
    const [vx1, , vx2] = line('vstripes');
    expect(vx1).toBeCloseTo(vx2 as number, 9);
    const [, hy1, , hy2] = line('hstripes');
    expect(hy1).toBeCloseTo(hy2 as number, 9);
    // the floor's diagonal lines are u + v = d, its antidiagonal ones v − u = d
    const [dx1, dy1, dx2, dy2] = line('diagonal') as [number, number, number, number];
    expect(dx1 + dy1).toBeCloseTo(dx2 + dy2, 9);
    const [ax1, ay1, ax2, ay2] = line('antidiagonal') as [number, number, number, number];
    expect(ay1 - ax1).toBeCloseTo(ay2 - ax2, 9);
    expect(swatchMarks('diamonds', r).lines).toEqual([]);
    expect(swatchMarks('diamonds', r).points).toHaveLength(4);
    expect(swatchMarks('checks', r).points).toHaveLength(2);
  });

  it("the hint's reason keeps bright the segments, the rooms and the target room, nothing else", () => {
    const h = HOUSES[TUTORIAL_HOUSES.length + 11] as HouseModel; // house 12
    const seg = h.rowSeg[0] as number;
    const bright = brightCells(h, [seg], [1], 2);
    const want = new Set([
      ...(h.segments[seg]?.cells ?? []),
      ...(h.roomCells[1] ?? []),
      ...(h.roomCells[2] ?? []),
    ]);
    expect(bright).toEqual([...want].sort((a, b) => a - b));
    expect(brightCells(h, [], [], 0)).toEqual([...(h.roomCells[0] ?? [])].sort((a, b) => a - b));
  });

  it('dotsBetween spaces the dots evenly and leaves both ends out', () => {
    expect(dotsBetween({ x: 0, y: 0 }, { x: 100, y: 0 }, 20)).toEqual([
      { x: 20, y: 0 },
      { x: 40, y: 0 },
      { x: 60, y: 0 },
      { x: 80, y: 0 },
    ]);
    expect(dotsBetween({ x: 0, y: 0 }, { x: 5, y: 0 }, 20)).toEqual([]);
  });

  it('dashes are RING_DASH long with RING_GAP between, the last one cut at the end', () => {
    const drawn: number[][] = [];
    const length = 2 * (RING_DASH + RING_GAP) + RING_DASH / 2;
    dashes({ lineBetween: (...a: number[]) => drawn.push(a) }, 0, 0, length, 0);
    expect(drawn).toEqual([
      [0, 0, RING_DASH, 0],
      [RING_DASH + RING_GAP, 0, 2 * RING_DASH + RING_GAP, 0],
      [2 * (RING_DASH + RING_GAP), 0, length, 0],
    ]);
  });
});

describe('no nursery wallpaper (CLAUDE.md rule 8; the design critique of round 1)', () => {
  it('small diamonds instead of polka dots: dots on the palest rose read as a nursery', () => {
    expect(PATTERNS).toContain('diamonds');
    expect(PATTERNS as readonly string[]).not.toContain('dots');
    expect(PATTERNS).toHaveLength(6);
  });
});

describe('the solve time in the finale (D73)', () => {
  it('reads m:ss, whole seconds, digits and a colon only', () => {
    expect([0, 9.99, 59.9, 61, 600, 3600].map(clockText)).toEqual([
      '0:00',
      '0:09',
      '0:59',
      '1:01',
      '10:00',
      '60:00',
    ]);
    expect(clockText(-1)).toBe('0:00');
  });
});
