import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DEMO_BEAM_MS,
  DEMO_HOLD_MS,
  DEMO_HOUSES,
  DEMO_MAX_MS,
  DEMO_SKIP_FROM_MS,
} from '../src/config';
import { parseHouse, shadowsOf, type HouseModel } from '../src/core/house';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import { demoFor, type DemoScript } from '../src/game/demo';
import { inShadow } from '../src/gen/build-levels';
import type { PlayHouse } from '../src/gen/record';

/**
 * The teaching demonstrations (docs/gate-b-round2.md §2; D70, D83): in houses 1 (sight and a
 * conflict), 2 (rows and columns), 3 (marks by a drag), 5 (the bookshelf), 8 (the lamp's light)
 * and 10 (its shadow) a short, text-free scene shows the rule before input opens, and ends on a
 * hold frame that shows the whole lesson. Pure timelines, checked against the built houses.
 */
const LEVELS = JSON.parse(
  readFileSync(new URL('../src/data/levels.json', import.meta.url), 'utf8'),
) as PlayHouse[];
const model = (id: number): HouseModel =>
  id <= TUTORIAL_HOUSES.length
    ? parseHouse(TUTORIAL_HOUSES[id - 1] as (typeof TUTORIAL_HOUSES)[number])
    : parseHouse(LEVELS[id - 1] as PlayHouse);
const script = (id: number): DemoScript => {
  const d = demoFor(id, model(id));
  if (!d) throw new Error(`no demonstration for house ${String(id)}`);
  return d;
};
const cell = (h: HouseModel, r: number, c: number): number => r * h.n + c;

/** Everything a script shows has appeared by its hold frame, which lasts DEMO_HOLD_MS. */
function endsOnTheHold(d: DemoScript): void {
  const ends = [
    ...(d.blink ? [d.blink.at + d.blink.ms] : []),
    ...d.trails.map((t) => t.at + t.ms),
    ...(d.beam ? [d.beam.at + d.beam.ms] : []),
    ...d.copies.map((c) => c.at + c.ms),
    ...d.poses.map((p) => p.at),
    ...(d.hand ? [d.hand.at + d.hand.ms] : []),
  ];
  expect(Math.max(...ends)).toBeLessThanOrEqual(d.holdAt);
  expect(d.ms).toBe(d.holdAt + DEMO_HOLD_MS);
  expect(d.ms).toBeLessThanOrEqual(DEMO_MAX_MS);
  expect(d.holdAt).toBeGreaterThan(DEMO_SKIP_FROM_MS);
}

describe('demoFor (D83)', () => {
  it('house 1: trails along the row and column, then a see-through ghost on (0,1) and both cover their eyes', () => {
    const h = model(1);
    const d = script(1);
    expect(d.blink?.cells).toEqual([0]);
    expect(d.trails.map((t) => [t.from, t.cells])).toEqual([
      [0, [cell(h, 0, 1)]],
      [0, [cell(h, 1, 0)]],
    ]);
    expect(d.copies).toEqual([expect.objectContaining({ to: cell(h, 0, 1), pose: 'seen' })]);
    expect(d.poses).toEqual([expect.objectContaining({ cell: 0, pose: 'seen' })]);
    // so (1,1) is the one cell of room B that nothing rules out: a deduction, not a coin flip
    const free = (h.roomCells[h.roomOf[cell(h, 0, 1)] as number] ?? []).filter(
      (c) => c !== cell(h, 0, 1) && !d.trails.some((t) => t.cells.includes(c)),
    );
    expect(free).toEqual([cell(h, 1, 1)]);
    endsOnTheHold(d);
  });

  it('house 2: the same trails from the resident at (0,1), shorter, in every open direction', () => {
    const d = script(2);
    expect(d.blink?.cells).toEqual([1]);
    expect(d.trails.map((t) => t.cells)).toEqual([[0], [2], [4, 7]]);
    expect(d.trails.every((t) => t.ms === 600)).toBe(true);
    expect([d.copies, d.poses, d.hand, d.beam]).toEqual([[], [], null, null]);
    endsOnTheHold(d);
  });

  it("house 3: a see-through hand drags along the resident's row, marks popping in under it", () => {
    const h = model(3);
    const d = script(3);
    const from = h.givens[0] as number;
    const row = Math.floor(from / h.n);
    expect(d.hand).not.toBeNull();
    const cells = d.hand?.cells ?? [];
    expect(cells.length).toBe(h.n - 1);
    for (const c of cells) {
      expect(Math.floor(c / h.n)).toBe(row);
      expect(h.blocked[c]).toBe(false);
    }
    // away from the resident: nearest first
    const dist = cells.map((c) => Math.abs((c % h.n) - (from % h.n)));
    expect(dist).toEqual([...dist].sort((a, b) => a - b));
    endsOnTheHold(d);
  });

  it("house 5: each resident's trail runs toward the other and stops at the bookshelf with a bump", () => {
    const h = model(5);
    const d = script(5);
    const [a, b] = h.givens as [number, number];
    expect(d.trails.map((t) => t.from)).toEqual([a, b]);
    for (const t of d.trails) {
      expect(t.bump).not.toBeNull();
      expect(h.objects[t.bump as number]).toBe('F');
      const last = t.cells[t.cells.length - 1] ?? t.from;
      expect([1, h.n]).toContain(Math.abs((t.bump as number) - last));
      for (const c of t.cells) expect(h.blocked[c]).toBe(false);
    }
    endsOnTheHold(d);
  });

  it("house 8: the lamp's light sweeps out, then a see-through copy of the resident steps into it and squints", () => {
    const h = model(8);
    const d = script(8);
    if (!d.beam) throw new Error('no beam');
    const lamp = h.objects.indexOf('L');
    expect(d.beam.lamp).toBe(lamp);
    const lit = [...Array(h.size).keys()].filter((c) => (h.lampsOf[c] ?? []).includes(lamp));
    expect([...d.beam.cells].sort((x, y) => x - y)).toEqual(lit);
    const dist = (c: number): number =>
      Math.abs(Math.floor(c / h.n) - Math.floor(lamp / h.n)) + Math.abs((c % h.n) - (lamp % h.n));
    const ds = d.beam.cells.map(dist);
    expect(ds).toEqual([...ds].sort((x, y) => x - y));
    const [copy] = d.copies;
    expect(copy?.from).toBe(h.givens[0]);
    expect(copy?.pose).toBe('lit');
    expect(h.lit[copy?.to ?? -1]).toBe(true);
    expect(h.solution).not.toContain(copy?.to);
    expect(copy?.at).toBeGreaterThanOrEqual(DEMO_BEAM_MS);
    endsOnTheHold(d);
  });

  it('house 10: the light stops at the bookshelf; a see-through copy behind it stays calm, never on a solution cell', () => {
    const h = model(10);
    const d = script(10);
    if (!d.beam) throw new Error('no beam');
    expect(d.beam.bump).not.toBeNull();
    expect(h.objects[d.beam.bump as number]).toBe('F');
    for (const copy of d.copies) {
      expect(copy.pose).toBe('calm');
      expect(copy.from).toBeNull();
      expect(h.lit[copy.to]).toBe(false);
      expect(h.blocked[copy.to]).toBe(false);
      expect(h.solution).not.toContain(copy.to);
      // in the lamp's row or column, past the shelf
      const lamp = d.beam.lamp;
      const sameLine =
        Math.floor(copy.to / h.n) === Math.floor(lamp / h.n) || copy.to % h.n === lamp % h.n;
      expect(sameLine).toBe(true);
    }
    endsOnTheHold(d);
  });

  it("house 10's lesson and its demonstration walk the lamp's shadow alike: the copy stands in it, and so does a solution ghost (round 2's code audit, DÜŞÜK 10)", () => {
    const h = model(10);
    const d = script(10);
    if (!d.beam) throw new Error('no beam');
    const shade = shadowsOf(h.n, h.objects, d.beam.lamp);
    const copies = d.copies.map((c) => c.to);
    expect(copies.length).toBeGreaterThan(0);
    for (const c of copies) expect(shade.map((s) => s.cell)).toContain(c);
    expect(shade.some((s) => h.solution.includes(s.cell))).toBe(true);
    expect(inShadow(h.n, h.objects.join(''), h.solution)).toBe(true);
    // one walk for both: neither the build nor the demonstration walks a beam of its own
    for (const file of ['../src/gen/build-levels.ts', '../src/game/demo.ts']) {
      const text = readFileSync(new URL(file, import.meta.url), 'utf8');
      expect(text).toContain('shadowsOf(');
      expect(text).not.toMatch(/=== 'L'\) break/);
    }
  });

  it('exactly the houses of DEMO_HOUSES have a demonstration', () => {
    expect(DEMO_HOUSES).toEqual([1, 2, 3, 5, 8, 10]);
    for (const id of [4, 6, 7, 9, 11, 12, 16, 17, 18, 34])
      expect(demoFor(id, model(id))).toBeNull();
    for (const id of DEMO_HOUSES) expect(demoFor(id, model(id))).not.toBeNull();
  });
});
