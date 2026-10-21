import { expect, type Page } from '@playwright/test';
import {
  DEMO_SKIP_FROM_MS,
  RING_INSET,
  RING_WIDTH,
  WALL_MAX,
  WALL_MIN,
  WALL_SHARE,
  WIN_BEAT_MS,
  WIN_SKIP_FROM_MS,
} from '../../src/config';
import type { DebugHouse } from '../../src/dev/debug';
import { contrast, type Rgb } from '../support/colour';
import { CANVAS, TEST, state, test, waitState } from './helpers';
import {
  corner,
  drag,
  emptyCells,
  frames,
  house,
  model,
  open,
  press,
  settledEqualsRules,
  solve,
  tap,
} from './play';

/**
 * Gate B tune round 1 on the dev build (docs/gate-b-round1.md §8, tasks 6–11), by real input, as
 * round 2 left it: the walls against the floors beside them on a small phone, when a tap may skip
 * the finale, the teaching demonstrations, carrying a ghost to another room, the progress dots.
 * What these measure on the wall clock runs alone, after every other test, without retries
 * (tests/e2e/timing.spec.ts; round 1's code audit, ORTA 5).
 */
const PHONE = { width: 360, height: 640 };
/** A tap this long into a demonstration is past its guard (DEMO_SKIP_FROM_MS) with room to spare. */
const PAST_GUARD_MS = 2 * DEMO_SKIP_FROM_MS;
/** Floor samples: this far past the wall and its settled ring, a square this many px a side. */
const FLOOR_GAP = 6;
const PATCH = 15;
const WALL_PATCH = 3;
const F1 = 4.5;
const CSS_CELL_MIN = 44;

/** The first cell a tap places a ghost on: empty, in a room without a resident. */
function freeCell(h: DebugHouse): number {
  const m = model(h);
  const taken = new Set(h.givens.map((g) => m.roomOf[g]));
  const cell = emptyCells(h).find((c) => !taken.has(m.roomOf[c]));
  if (cell === undefined) throw new Error('no free cell');
  return cell;
}

interface WallSample {
  cells: [number, number];
  wall: Rgb;
  floors: [Rgb, Rgb];
}

/**
 * Every wall between two rooms whose cells hold no ghost and no object: the wall's colour at its
 * middle, and the commonest colour of a patch of floor on each side, past the settled ring (so the
 * wallpaper's ink and the ring's dashes are a minority of the patch). Read from the canvas, which
 * the Canvas renderer draws in design px.
 */
async function wallSamples(page: Page): Promise<WallSample[]> {
  const h = await house(page);
  const m = model(h);
  const cell = (await state(page))?.cell ?? 0;
  const wall = Math.min(WALL_MAX, Math.max(WALL_MIN, WALL_SHARE * cell));
  const rules = await page.evaluate(() => window.__ghostDebug?.rules?.());
  const ghosts = new Set((rules?.ghosts ?? []).map(([c]) => c));
  const pairs: [number, number][] = [];
  for (let i = 0; i < m.size; i++) {
    const right = i % m.n < m.n - 1 ? i + 1 : -1;
    const below = i + m.n < m.size ? i + m.n : -1;
    for (const j of [right, below]) {
      if (j < 0 || m.roomOf[i] === m.roomOf[j]) continue;
      if (m.blocked[i] || m.blocked[j] || ghosts.has(i) || ghosts.has(j)) continue;
      pairs.push([i, j]);
    }
  }
  const away = wall / 2 + RING_INSET + RING_WIDTH + FLOOR_GAP + PATCH / 2;
  return page.evaluate(
    ({ pairs, away, patch, wallPatch }) => {
      const dbg = window.__ghostDebug;
      const canvas = document.querySelector('canvas');
      const ctx = canvas?.getContext('2d');
      if (!dbg?.cellCenter || !canvas || !ctx) throw new Error('no canvas to read');
      const rect = canvas.getBoundingClientRect();
      const k = canvas.width / rect.width;
      const at = (c: number): { x: number; y: number } => {
        const p = dbg.cellCenter?.(c);
        if (!p) throw new Error(`no cell ${String(c)}`);
        return { x: (p.x - rect.left) * k, y: (p.y - rect.top) * k };
      };
      const commonest = (x: number, y: number, side: number): [number, number, number] => {
        const d = ctx.getImageData(Math.round(x - side / 2), Math.round(y - side / 2), side, side);
        const count = new Map<number, number>();
        let best = 0;
        let key = 0;
        for (let q = 0; q < d.data.length; q += 4) {
          const v = ((d.data[q] ?? 0) << 16) | ((d.data[q + 1] ?? 0) << 8) | (d.data[q + 2] ?? 0);
          const n = (count.get(v) ?? 0) + 1;
          count.set(v, n);
          if (n > best) {
            best = n;
            key = v;
          }
        }
        return [(key >> 16) & 255, (key >> 8) & 255, key & 255];
      };
      return pairs.map(([i, j]) => {
        const a = at(i);
        const b = at(j);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const ux = (b.x - a.x) / len;
        const uy = (b.y - a.y) / len;
        return {
          cells: [i, j] as [number, number],
          wall: commonest(mid.x, mid.y, wallPatch),
          floors: [
            commonest(mid.x - ux * away, mid.y - uy * away, patch),
            commonest(mid.x + ux * away, mid.y + uy * away, patch),
          ] as [Rgb, Rgb],
        };
      });
    },
    { pairs, away, patch: PATCH, wallPatch: WALL_PATCH },
  );
}

for (const id of [1, 17, 34]) {
  test(`house ${String(id)} at 360 × 640: every wall ≥ 4.5:1 against the floor beside it (F1, D71)`, async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await open(page, `reset=1&house=${String(id)}`);
    await settledEqualsRules(page);
    const samples = await wallSamples(page);
    expect(samples.length).toBeGreaterThan(0);
    const low = samples.flatMap((s) =>
      s.floors
        .map((f) => contrast(s.wall, f))
        .filter((ratio) => ratio < F1)
        .map((ratio) => `${s.cells.join('|')}: ${ratio.toFixed(2)}`),
    );
    expect(low).toEqual([]);
    // and the cells stay large enough to tap on the small phone (D69)
    const css = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return c ? c.getBoundingClientRect().width / c.width : 0;
    });
    expect(((await state(page))?.cell ?? 0) * css).toBeGreaterThanOrEqual(CSS_CELL_MIN);
  });
}

test('a tap 300 ms into the finale does not skip it; one at 700 ms does (D73)', async ({
  page,
}) => {
  const EARLY_MS = 300;
  const LATE_MS = 700;
  await open(page, 'reset=1&house=12');
  const away = await corner(page);
  await solve(page);
  await waitState(page, (s) => (s.beatMs ?? 0) >= EARLY_MS, '300 ms into the finale');
  await page.mouse.click(away.x, away.y);
  await frames(page, 3);
  const early = await state(page);
  expect(early?.phase).toBe('win');
  expect(early?.beatMs ?? Infinity).toBeLessThan(WIN_BEAT_MS);
  await waitState(page, (s) => (s.beatMs ?? 0) >= LATE_MS, '700 ms into the finale');
  await page.mouse.click(away.x, away.y);
  const next = await waitState(page, (s) => s.shown === 13 && s.phase === 'play', 'house 13');
  // the second tap cut the beat short, after 700 ms; the first did not
  expect(next.finale?.beatMs ?? 0).toBeGreaterThanOrEqual(LATE_MS);
  expect(next.finale?.beatMs ?? Infinity).toBeLessThan(WIN_BEAT_MS);
  expect(LATE_MS).toBeGreaterThan(WIN_SKIP_FROM_MS);
  expect(EARLY_MS).toBeLessThan(WIN_SKIP_FROM_MS);
  expect([next.moves, next.hints]).toEqual([0, 0]);
});

for (const id of [1, 5, 8]) {
  test(`house ${String(id)} shows its rule once as it appears, then input opens; nothing played (D70, D83)`, async ({
    page,
  }) => {
    await page.goto(`${TEST}?reset=1&house=${String(id)}${CANVAS}`, { waitUntil: 'load' });
    await waitState(page, (x) => x.scene === 'Game' && x.phase === 'demo', 'the demonstration');
    const s = await waitState(page, (x) => x.phase === 'play', 'play');
    expect([s.shown, s.demos, s.demoSkipped]).toEqual([id, 1, false]);
    expect([s.moves, s.tally?.taps]).toEqual([0, 0]);
    await settledEqualsRules(page);
  });
}

test('a tap skips the demonstration and places nothing; the next tap plays (house 8, D70, D83)', async ({
  page,
}) => {
  await page.goto(`${TEST}?reset=1&house=8${CANVAS}`, { waitUntil: 'load' });
  await waitState(page, (s) => s.scene === 'Game' && s.phase === 'demo', 'the demonstration');
  const h = await house(page);
  const free = freeCell(h);
  await page.waitForTimeout(PAST_GUARD_MS);
  await tap(page, free);
  const s = await waitState(page, (x) => x.phase === 'play', 'play');
  expect(s.demoSkipped).toBe(true);
  expect([s.moves, s.tally?.taps]).toEqual([0, 0]);
  expect((await settledEqualsRules(page)).ghosts.map(([c]) => c)).toEqual(h.givens);
  await tap(page, free);
  await waitState(page, (x) => x.moves === 1, 'a game tap');
  expect((await settledEqualsRules(page)).ghosts.map(([c]) => c)).toContain(free);
});

test('a resumed house does not show its demonstration again (house 5, D70)', async ({ page }) => {
  await open(page, 'reset=1&house=5');
  expect((await state(page))?.demos).toBe(1);
  const free = freeCell(await house(page));
  await tap(page, free);
  await waitState(page, (s) => s.moves === 1 && s.pendingSave === false, 'the move saved');
  await page.goto(`${TEST}?renderer=canvas`, { waitUntil: 'load' });
  const back = await waitState(
    page,
    (s) => s.scene === 'Game' && s.phase === 'play',
    'the house again',
  );
  expect([back.shown, back.demos, back.moves]).toEqual([5, 0, 1]);
});

test('a drag carries a ghost to another room, one undo step; a refused drop puts it back (D72)', async ({
  page,
}) => {
  await open(page, 'reset=1&house=12');
  const m = model(await house(page));
  const free = (room: number): number[] => (m.roomCells[room] ?? []).filter((c) => !m.blocked[c]);
  const a = free(0)[0] as number;
  const other = m.roomCells.findIndex((_, r) => r !== 0 && free(r).length >= 2);
  const [b, c] = free(other) as [number, number];
  await tap(page, a);
  await settledEqualsRules(page);
  await drag(page, a, b); // into a room without a ghost: it moves there
  expect((await settledEqualsRules(page)).ghosts.map(([x]) => x)).toEqual([b]);
  const moved = await state(page);
  expect([moved?.moves, moved?.tally?.carried]).toEqual([2, 1]);
  const block = [...Array(m.size).keys()].find((x) => m.blocked[x]) as number;
  await drag(page, b, block); // onto a block: back where it was, with a nudge
  expect((await settledEqualsRules(page)).ghosts.map(([x]) => x)).toEqual([b]);
  await drag(page, b, c); // within its room: a relocation
  expect((await settledEqualsRules(page)).ghosts.map(([x]) => x)).toEqual([c]);
  const s = await state(page);
  expect([s?.moves, s?.tally?.relocations, s?.tally?.nudges]).toEqual([3, 1, 1]);
  await press(page, 'undo');
  await press(page, 'undo'); // one drag, one undo step: the ghost is back in its first room
  expect((await settledEqualsRules(page)).ghosts.map(([x]) => x)).toEqual([a]);
});

test('a drag from an empty cell still paints marks, and one from a resident only nudges (D72)', async ({
  page,
}) => {
  await open(page, 'reset=1&house=5');
  const h = await house(page);
  const m = model(h);
  const empty = emptyCells(h).filter((x) => !h.givens.includes(x));
  const row = empty.find((x) => x % m.n < m.n - 1 && empty.includes(x + 1)) as number;
  await drag(page, row, row + 1);
  expect((await settledEqualsRules(page)).marks).toEqual([row, row + 1]);
  const resident = h.givens[0] as number;
  const target = empty.find(
    (x) => m.roomOf[x] !== m.roomOf[resident] && x !== row && x !== row + 1,
  );
  await drag(page, resident, target as number);
  const after = await settledEqualsRules(page);
  expect(after.ghosts.map(([x]) => x)).toEqual(h.givens);
  expect(after.marks).toEqual([row, row + 1]);
  const s = await state(page);
  expect([s?.moves, s?.tally?.nudges]).toEqual([1, 1]);
});

test('the progress dots fill as the rooms settle and are all full when the house is solved (D75)', async ({
  page,
}) => {
  await open(page, 'reset=1&house=12');
  const h = await house(page);
  const rooms = model(h).roomCount;
  const cells = (h.solution ?? []).filter((c) => !h.givens.includes(c));
  expect((await settledEqualsRules(page)).settled).toEqual([]);
  for (const [k, c] of cells.entries()) {
    await tap(page, c);
    if (k === cells.length - 1) break;
    // the dots equal the settled rooms at every rest (settledEqualsRules checks them)
    expect((await settledEqualsRules(page)).settled).toHaveLength(k + 1);
  }
  await expect
    .poll(async () => {
      const got = await page.evaluate(() => ({
        phase: (window.__ghostDebug?.state() as { phase?: string } | undefined)?.phase,
        dots: window.__ghostDebug?.drawn?.()?.dots.length ?? 0,
      }));
      return got.phase === 'win' ? got.dots : -1;
    })
    .toBe(rooms);
});
