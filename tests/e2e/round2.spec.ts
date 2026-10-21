import { expect, type Page } from '@playwright/test';
import {
  DEMO_IDLE_MS,
  DEMO_SKIP_FROM_MS,
  FLOOR_MARGIN,
  MARK_HALO,
  MARK_SHARE,
  RING_INSET,
  RING_WIDTH,
  WALL_MAX,
  WALL_MIN,
  WALL_SHARE,
} from '../../src/config';
import { TUTORIAL } from '../../src/data/tutorial';
import type { DebugHouse } from '../../src/dev/debug';
import { RULE_WORDS } from '../support/rule-words';
import { CANVAS, TEST, neutralState, state, test, waitNeutral, waitState } from './helpers';
import {
  center,
  corner,
  drag,
  emptyCells,
  house,
  model,
  open,
  press,
  settledEqualsRules,
  solve,
  tap,
} from './play';

/**
 * Gate B tune round 2 on the dev build (docs/gate-b-round2.md §2–§6; D83–D87), by real input:
 * the demonstrations (an early tap, the replay after idle time, the resume), the hint's reason
 * staying until the next move, a new screen size keeping the reason and the solve time, the
 * neutral playtest state, a settled room keeping its floor, and the local contrast on screen.
 */
const PHONE = { width: 360, height: 640 };
/** A little past DEMO_IDLE_MS: the replay has had a frame or two to start. */
const IDLE_WAIT_MS = DEMO_IDLE_MS + 700;
/** Mechanics the playtest state must not name (docs/gate-b-round2.md §6), whole words. */
const MECHANIC_WORDS =
  /\b(?:placements?|removals?|relocations?|carried|nudges?|strokes?|marks?|erased?|erases|shivers?|demos?|finales?|undos?|conflicts?|solved)\b/i;

/** A cell a tap places a ghost on: empty, in a room without a resident. */
function freeCell(h: DebugHouse, skip: readonly number[] = []): number {
  const m = model(h);
  const taken = new Set(h.givens.map((g) => m.roomOf[g]));
  const cell = emptyCells(h).find((c) => !taken.has(m.roomOf[c]) && !skip.includes(c));
  if (cell === undefined) throw new Error('no free cell');
  return cell;
}

/** camelCase keys and values as words: `bulbReadyIn` reads "bulb Ready In". */
function words(value: unknown): string {
  return JSON.stringify(value).replace(/([a-z])([A-Z])/g, '$1 $2');
}

test('a tap left over from the finale never skips the next demonstration (house 4 to 5; the round-1 code audit, ORTA 2)', async ({
  page,
}) => {
  await open(page, 'reset=1&house=4');
  const away = await corner(page);
  await solve(page);
  await waitState(page, (s) => (s.beatMs ?? 0) >= 700, 'past the finale guard');
  // three quick taps: the first skips the beat, the second ends the slide (house 5's
  // demonstration starts at once), the third lands in its first DEMO_SKIP_FROM_MS and does nothing
  await page.mouse.click(away.x, away.y);
  await page.mouse.click(away.x, away.y);
  await page.mouse.click(away.x, away.y);
  const now = await state(page);
  expect([now?.shown, now?.phase]).toEqual([5, 'demo']);
  const s = await waitState(page, (x) => x.shown === 5 && x.phase === 'play', 'house 5');
  expect([s.demos, s.demoSkipped, s.moves]).toEqual([1, false, 0]);
  expect(DEMO_SKIP_FROM_MS).toBeGreaterThan(0);
});

test('a demonstration plays again after 5 s without input; a tap skips it without acting; none after the first placement (house 2, D83)', async ({
  page,
}) => {
  await open(page, 'reset=1&house=2');
  expect((await state(page))?.demos).toBe(1);
  await page.waitForTimeout(IDLE_WAIT_MS);
  const replay = await waitState(page, (s) => s.demos === 2, 'the replay');
  expect(replay.phase).toBe('demo');
  const h = await house(page);
  const free = freeCell(h);
  await page.waitForTimeout(2 * DEMO_SKIP_FROM_MS);
  await tap(page, free);
  const skipped = await waitState(page, (s) => s.phase === 'play', 'play');
  expect([skipped.demoSkipped, skipped.moves]).toEqual([true, 0]);
  await tap(page, free);
  await waitState(page, (s) => s.moves === 1, 'the first placement');
  await page.waitForTimeout(IDLE_WAIT_MS);
  const after = await state(page);
  expect([after?.demos, after?.phase]).toEqual([2, 'play']);
  await settledEqualsRules(page);
});

test('a resumed house plays no first demonstration, but plays it after 5 s idle until its first placement (house 5)', async ({
  page,
}) => {
  await open(page, 'reset=1&house=5');
  const h = await house(page);
  const m = model(h);
  // a mark only: the house is in progress, with no placement yet
  const empty = emptyCells(h).filter((c) => !h.givens.includes(c));
  const a = empty.find((c) => c % m.n < m.n - 1 && empty.includes(c + 1)) as number;
  await drag(page, a, a + 1);
  await waitState(page, (s) => s.moves === 1 && s.pendingSave === false, 'the mark saved');
  await page.goto(`${TEST}?${CANVAS.slice(1)}`, { waitUntil: 'load' });
  const back = await waitState(page, (s) => s.scene === 'Game' && s.phase === 'play', 'back');
  expect([back.shown, back.demos]).toEqual([5, 0]);
  await page.waitForTimeout(IDLE_WAIT_MS);
  await waitState(page, (s) => s.demos === 1, 'the replay after a resume');
});

test("the hint's reason stays at 5 s and at 10 s; the next tap takes it away and acts as a tap (house 12, D86)", async ({
  page,
}) => {
  await open(page, 'reset=1&house=12');
  await press(page, 'hint');
  await waitState(page, (s) => s.hints === 1 && s.reasonShown === true, 'the reason');
  await page.waitForTimeout(5000);
  expect((await state(page))?.reasonShown).toBe(true);
  await page.waitForTimeout(5000);
  const still = await state(page);
  expect([still?.reasonShown, still?.moves]).toEqual([true, 0]);
  const free = freeCell(await house(page));
  await tap(page, free);
  const after = await waitState(page, (s) => s.moves === 1, 'the tap');
  expect([after.reasonShown, after.hintReason]).toEqual([false, null]);
  expect((await settledEqualsRules(page)).ghosts.map(([c]) => c)).toEqual([free]);
});

test('a new screen size keeps the hint’s reason, and the solve time during the finale (the round-1 code audit, DÜŞÜK 6)', async ({
  page,
}) => {
  await open(page, 'reset=1&house=12');
  await press(page, 'hint');
  await waitState(page, (s) => s.reasonShown === true, 'the reason');
  await page.setViewportSize({ width: 844, height: 390 });
  const landscape = await waitState(page, (s) => s.arrangement === 'landscape', 'landscape');
  expect([landscape.reasonShown, landscape.hints]).toEqual([true, 1]);
  await press(page, 'hint'); // the second press still completes it
  await waitState(page, (s) => s.moves === 1 && s.reasonShown === false, 'the hint placed');
  // the rest of the solution (a tap on the hint's ghost would take it away again)
  const h = await house(page);
  const placed = (await settledEqualsRules(page)).ghosts.map(([c]) => c);
  for (const c of h.solution ?? []) if (!placed.includes(c)) await tap(page, c);
  await waitState(page, (s) => s.phase === 'win' && s.timeShown !== null, 'the solve time');
  await page.setViewportSize({ width: 390, height: 844 });
  const portrait = await waitState(page, (s) => s.arrangement === 'portrait', 'portrait');
  // the new board came during the beat, and shows the solve time (round 2's code audit, DÜŞÜK 6)
  expect(portrait.phase).toBe('win');
  expect(portrait.timeShown).not.toBeNull();
  await waitState(page, (s) => s.shown === 13 && s.phase === 'play', 'house 13');
});

test('a new screen size during the slide into a house with a demonstration ends the slide, then the demonstration (the round-1 code audit, DÜŞÜK 6)', async ({
  page,
}) => {
  await open(page, 'reset=1&house=4');
  await solve(page);
  await waitState(page, (s) => s.phase === 'slide' || (s.beatMs ?? 0) > 1900, 'near the slide');
  await waitState(page, (s) => s.phase !== 'win', 'the slide');
  await page.setViewportSize({ width: 600, height: 600 });
  const s = await waitState(page, (x) => x.shown === 5 && x.phase === 'play', 'house 5');
  expect(s.arrangement).toBe('square');
  await settledEqualsRules(page);
});

test('?playtest=1: state() names no rule and no mechanic, in a demonstration, mid-house, a conflict and the finale (D87)', async ({
  page,
}) => {
  // house 2: ABB / ABB / CCC, the resident at (0,1); its solution from the tutorial data
  const t = TUTORIAL[1];
  if (!t) throw new Error('no tutorial house 2');
  const n = t.rooms.length;
  const cell = ([r, c]: readonly [number, number]): number => r * n + c;
  await page.goto(`${TEST}?reset=1&house=2&playtest=1${CANVAS}`, { waitUntil: 'load' });
  const seen: unknown[] = [];
  seen.push(await waitNeutral(page, (s) => s.shown === 2 && s.input === 'closed', 'the demo'));
  await waitNeutral(page, (s) => s.input === 'open', 'open');
  const [given, ...rest] = t.solution.map(cell);
  // a conflict: (0,0) shares row 0 with the resident at (0,1)
  await tap(page, 0);
  seen.push(await waitNeutral(page, (s) => s.taps === 1, 'a tap'));
  await press(page, 'undo');
  seen.push(await waitNeutral(page, (s) => s.presses.arrow === 1, 'an undo'));
  for (const c of rest) await tap(page, c);
  seen.push(await waitNeutral(page, (s) => s.input === 'closed', 'the finale'));
  for (const s of seen) {
    const text = words(s);
    expect(text.match(RULE_WORDS)?.[0] ?? null, text).toBeNull();
    expect(text.match(MECHANIC_WORDS)?.[0] ?? null, text).toBeNull();
  }
  expect(given).toBe(1);
  expect(Object.keys((await neutralState(page)) ?? {})).toHaveLength(12);
});

/** The canvas's own pixels (the Canvas renderer draws in design px), as [r, g, b] at points. */
async function pixels(page: Page, points: { x: number; y: number }[]): Promise<number[][]> {
  return page.evaluate((pts) => {
    const canvas = document.querySelector('canvas');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) throw new Error('no canvas to read');
    return pts.map((p) => {
      const d = ctx.getImageData(Math.round(p.x), Math.round(p.y), 1, 1).data;
      return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0];
    });
  }, points);
}

/** A cell's middle in canvas (design) px. */
async function canvasCenter(page: Page, c: number): Promise<{ x: number; y: number }> {
  const p = await center(page, c);
  return page.evaluate((q) => {
    const canvas = document.querySelector('canvas');
    if (!canvas) throw new Error('no canvas');
    const r = canvas.getBoundingClientRect();
    const k = canvas.width / r.width;
    return { x: (q.x - r.left) * k, y: (q.y - r.top) * k };
  }, p);
}

test('a settled room keeps its floor: its pixels away from the ring equal the unsettled ones (D85)', async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await open(page, 'reset=1&house=12');
  const h = await house(page);
  const m = model(h);
  const cellPx = (await state(page))?.cell ?? 0;
  // a room with two empty cells: a ghost on one, the other's middle sampled before and after
  const room = m.roomCells.findIndex((cs) => cs.filter((c) => !m.blocked[c]).length >= 2);
  const [a, b] = (m.roomCells[room] ?? []).filter((c) => !m.blocked[c]) as [number, number];
  const mid = await canvasCenter(page, b);
  const patch = [-1, 0, 1].flatMap((dy) =>
    [-1, 0, 1].map((dx) => ({ x: mid.x + (dx * cellPx) / 8, y: mid.y + (dy * cellPx) / 8 })),
  );
  const before = await pixels(page, patch);
  // a ghost on a, alone in its row and column: calm, its room settled
  await tap(page, a);
  const rules = await settledEqualsRules(page);
  expect(rules.settled).toContain(room);
  expect(await pixels(page, patch)).toEqual(before);
});

test('every ink touches only its floor on screen: a mark on a lit cell, the band inside a wall, beside the ring (the round-1 code audit, DÜŞÜK 7)', async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await open(page, 'reset=1&house=8');
  const h = await house(page);
  const m = model(h);
  const cellPx = (await state(page))?.cell ?? 0;
  const wall = Math.min(WALL_MAX, Math.max(WALL_MIN, WALL_SHARE * cellPx));
  /** Same colour, give or take the canvas's antialiasing at the very edge of a shape. */
  const same = (p: number[] | undefined, q: number[] | undefined): boolean =>
    [0, 1, 2].every((i) => Math.abs((p?.[i] ?? -1) - (q?.[i] ?? -999)) <= 24);
  const free = emptyCells(h).filter((c) => !h.givens.includes(c));
  // a mark on a lit cell (a stroke over it and its free neighbour): around the dark dot, inside
  // its halo, only the floor's colour, never the hatch
  const lit = free.find((c) => m.lit[c] && c % m.n < m.n - 1 && free.includes(c + 1));
  if (lit === undefined) throw new Error('no lit cell with a free neighbour');
  const at = await canvasCenter(page, lit);
  const [floor] = await pixels(page, [at]);
  await drag(page, lit, lit + 1);
  expect((await settledEqualsRules(page)).marks).toContain(lit);
  const r = (MARK_SHARE + MARK_HALO / 2) * cellPx;
  const around = await pixels(
    page,
    Array.from({ length: 8 }, (_, k) => ({
      x: at.x + r * Math.cos((k * Math.PI) / 4),
      y: at.y + r * Math.sin((k * Math.PI) / 4),
    })),
  );
  expect(around.filter((p) => !same(p, floor))).toEqual([]);
  // the band inside the house's left wall, and the settled ring in it: a cell in column 0 off
  // the solution, its room settled by a ghost on the room's solution cell
  const edge = free.find((c) => c % m.n === 0 && !(h.solution ?? []).includes(c));
  if (edge === undefined) throw new Error('no free cell in column 0');
  const room = m.roomOf[edge] as number;
  const ghost = (h.solution ?? []).find((c) => m.roomOf[c] === room);
  if (ghost === undefined) throw new Error('no solution cell');
  const mid = await canvasCenter(page, edge);
  const left = mid.x - cellPx / 2 + wall / 2;
  const [own] = await pixels(page, [mid]);
  const band = (): Promise<number[][]> =>
    pixels(page, [
      { x: left + RING_INSET / 2, y: mid.y },
      { x: left + RING_INSET + RING_WIDTH / 2, y: mid.y },
      {
        x: left + RING_INSET + RING_WIDTH + (FLOOR_MARGIN - RING_INSET - RING_WIDTH) / 2,
        y: mid.y,
      },
    ]);
  const unsettled = await band();
  expect(unsettled.filter((p) => !same(p, own))).toEqual([]);
  if (!h.givens.includes(ghost)) await tap(page, ghost);
  expect((await settledEqualsRules(page)).settled).toContain(room);
  const [outside, ring, inside] = await band();
  // the wall side of the ring and its room side are the plain floor; the ring itself is not
  expect([same(outside, own), same(inside, own), same(ring, own)]).toEqual([true, true, false]);
});
