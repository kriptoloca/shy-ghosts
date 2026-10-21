import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEMO_MAX_MS } from '../src/config';
import { parseHouse, type HouseModel } from '../src/core/house';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import { demoFor } from '../src/game/demo';
import type { PlayHouse } from '../src/gen/record';

/**
 * The teaching demonstrations (docs/gate-b-round1.md §3, D70): in the first house of sight (1), of
 * rows and columns (2), of blocks (9) and of lamps (17) a short, text-free scene shows the rule
 * before input opens. Pure timelines, checked against the built houses.
 */
const LEVELS = JSON.parse(
  readFileSync(new URL('../src/data/levels.json', import.meta.url), 'utf8'),
) as PlayHouse[];
const model = (id: number): HouseModel =>
  id <= TUTORIAL_HOUSES.length
    ? parseHouse(TUTORIAL_HOUSES[id - 1] as (typeof TUTORIAL_HOUSES)[number])
    : parseHouse(LEVELS[id - 1] as PlayHouse);

describe('demoFor', () => {
  it('house 1: the resident blinks awake, then trails run along its row and column to the edges', () => {
    const d = demoFor(1, model(1));
    expect(d).not.toBeNull();
    if (!d) return;
    expect(d.blink?.cells).toEqual([0]);
    expect(d.trails.map((t) => [t.from, t.cells])).toEqual([
      [0, [1]],
      [0, [2]],
    ]);
    expect(d.trails.every((t) => t.ms === 900 && t.bump === null)).toBe(true);
    expect(d.beam).toBeNull();
    expect(d.copy).toBeNull();
    expect(d.ms).toBeLessThanOrEqual(DEMO_MAX_MS);
  });

  it('house 2: the same trails from the resident at (0,1), shorter, in every open direction', () => {
    const d = demoFor(2, model(2));
    if (!d) throw new Error('no demo for house 2');
    expect(d.blink?.cells).toEqual([1]);
    expect(d.trails.map((t) => t.cells)).toEqual([[0], [2], [4, 7]]);
    expect(d.trails.every((t) => t.ms === 600)).toBe(true);
    expect(d.ms).toBeLessThanOrEqual(DEMO_MAX_MS);
  });

  it("house 9: each resident's trail runs toward the other and stops at the bookshelf with a bump", () => {
    const h = model(9);
    const d = demoFor(9, h);
    if (!d) throw new Error('no demo for house 9');
    const [a, b] = h.givens as [number, number];
    expect(d.trails).toHaveLength(2);
    expect(d.trails.map((t) => t.from)).toEqual([a, b]);
    for (const t of d.trails) {
      expect(t.bump).not.toBeNull();
      expect(h.objects[t.bump as number]).toBe('F');
      // the trail covers every cell from the resident up to the shelf, and nothing past it
      const last = t.cells[t.cells.length - 1] ?? t.from;
      const step = Math.abs((t.bump as number) - last);
      expect([1, h.n]).toContain(step);
      for (const c of t.cells) expect(h.blocked[c]).toBe(false);
    }
    expect(d.ms).toBeLessThanOrEqual(DEMO_MAX_MS);
  });

  it("house 17: the lamp's light sweeps out, then a see-through copy of the resident steps into it", () => {
    const h = model(17);
    const d = demoFor(17, h);
    if (!d?.beam || !d.copy) throw new Error('no demo for house 17');
    const lamp = h.objects.indexOf('L');
    expect(d.beam.lamp).toBe(lamp);
    const lit = [...Array(h.size).keys()].filter((c) => (h.lampsOf[c] ?? []).includes(lamp));
    expect([...d.beam.cells].sort((x, y) => x - y)).toEqual(lit);
    // nearest first: the light sweeps outward from the lamp
    const dist = (c: number): number =>
      Math.abs(Math.floor(c / h.n) - Math.floor(lamp / h.n)) + Math.abs((c % h.n) - (lamp % h.n));
    const ds = d.beam.cells.map(dist);
    expect(ds).toEqual([...ds].sort((x, y) => x - y));
    expect(d.copy.from).toBe(h.givens[0]);
    expect(h.lit[d.copy.to]).toBe(true);
    expect(h.solution).not.toContain(d.copy.to);
    const r = (c: number): [number, number] => [Math.floor(c / h.n), c % h.n];
    const [r1, c1] = r(d.copy.from);
    const [r2, c2] = r(d.copy.to);
    expect(Math.abs(r1 - r2) + Math.abs(c1 - c2)).toBe(1);
    expect(d.copy.at).toBeGreaterThanOrEqual(d.beam.at + d.beam.ms);
    expect(d.ms).toBeLessThanOrEqual(DEMO_MAX_MS);
  });

  it('no other house has a demonstration', () => {
    for (const id of [3, 4, 5, 8, 10, 16, 18, 34]) expect(demoFor(id, model(id))).toBeNull();
  });
});
