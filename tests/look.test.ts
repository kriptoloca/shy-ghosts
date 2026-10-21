import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseHouse, type HouseModel } from '../src/core/house';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import { PATTERNS, TONES, neighbourRooms, roomStyles, wallRuns } from '../src/game/look';
import type { PlayHouse } from '../src/gen/record';

/**
 * The graybox look (TASKS.md Epic 3; CLAUDE.md, Rendering): rooms differ by wallpaper pattern and
 * lightness, never by hue alone, and walls run exactly between rooms.
 */
const read = <T>(name: string): T =>
  JSON.parse(readFileSync(new URL(`../src/data/${name}`, import.meta.url), 'utf8')) as T;
const HOUSES: HouseModel[] = [
  ...TUTORIAL_HOUSES.map((d) => parseHouse(d)),
  ...read<PlayHouse[]>('levels.json').map((d) => parseHouse(d)),
  ...Object.values(read<Record<string, PlayHouse>>('dailies.json')).map((d) => parseHouse(d)),
];

describe('roomStyles', () => {
  it('neighbouring rooms differ in lightness and in pattern, on every house of the game', () => {
    const wrong: string[] = [];
    HOUSES.forEach((h, k) => {
      const styles = roomStyles(h);
      expect(styles).toHaveLength(h.roomCount);
      neighbourRooms(h).forEach((near, a) => {
        for (const b of near) {
          const sa = styles[a];
          const sb = styles[b];
          if (!sa || !sb) continue;
          if (sa.tone === sb.tone)
            wrong.push(`house #${String(k)}: rooms ${String(a)}, ${String(b)} tone`);
          if (sa.pattern === sb.pattern) {
            wrong.push(`house #${String(k)}: rooms ${String(a)}, ${String(b)} pattern`);
          }
        }
      });
      for (const s of styles) {
        expect(s.tone).toBeGreaterThanOrEqual(0);
        expect(s.tone).toBeLessThan(TONES);
        expect(PATTERNS).toContain(s.pattern);
      }
    });
    expect(wrong).toEqual([]);
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
