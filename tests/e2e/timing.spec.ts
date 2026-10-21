import { expect, type Page } from '@playwright/test';
import { SLIDE_MS, WIN_BEAT_MS } from '../../src/config';
import { demoFor } from '../../src/game/demo';
import {
  CANVAS,
  SOFTWARE_WEBGL_REPORT,
  TEST,
  platformPause,
  state,
  test,
  waitState,
} from './helpers';
import { center, corner, house, model, open, settledEqualsRules, solve, tap } from './play';

/**
 * What the game does on the wall clock (D70, D73, D83, D84; round 1's code
 * audit, ORTA 3 and ORTA 5).
 * These run in a Playwright project of their own, one at a time, after every other test, and are
 * never retried: a headless browser that shares the CPU with another worker can stall a frame
 * for longer than any slack below, and alone it does not. The functional checks (an early tap
 * does not skip the finale, a demonstration shows once) are tests/e2e/round1.spec.ts's.
 */
test.use({ quietConsole: [SOFTWARE_WEBGL_REPORT] });

/** The finale, from the last placement to the next house: about 2.4 s (D84). */
const FINALE_MS = WIN_BEAT_MS + SLIDE_MS;
const FINALE_SLACK_MS = 200;
/** A measured beat or demonstration ends within a frame or two of its length. */
const FRAME_SLACK_MS = 50;
/** The motion watch reads on this long past its end, so its last frame is closed. */
const MOTION_TAIL_MS = 150;
/** Input opens this soon after a demonstration ends: a frame or two, and a busy frame. */
const OPEN_SLACK_MS = 250;

test('the finale lasts 2.4 ± 0.2 s from the last placement to the next house; the beat its length (D73, D84)', async ({
  page,
}) => {
  await open(page, 'reset=1&house=12');
  await solve(page);
  const next = await waitState(page, (s) => s.shown === 13 && s.phase === 'play', 'house 13');
  const f = next.finale;
  if (!f) throw new Error('no finale measured');
  // the beat as measured when the slide began, on the scene's clock, within a frame or two of its
  // length; all of it on the wall clock. The clock's step in the frame the slide began is logged
  // (this project runs without the GPU flags: the Canvas renderer draws every 14–23 ms here)
  console.log(`finale ${JSON.stringify(f)}`);
  expect(Math.abs(f.beatMs - WIN_BEAT_MS)).toBeLessThanOrEqual(FRAME_SLACK_MS);
  expect(Math.abs(f.wallMs - FINALE_MS)).toBeLessThanOrEqual(FINALE_SLACK_MS);
});

test('a tap 700 ms into the finale cuts the beat there', async ({ page }) => {
  const LATE_MS = 700;
  await open(page, 'reset=1&house=12');
  const away = await corner(page);
  await solve(page);
  await waitState(page, (s) => (s.beatMs ?? 0) >= LATE_MS, '700 ms into the finale');
  await page.mouse.click(away.x, away.y);
  const next = await waitState(page, (s) => s.shown === 13 && s.phase === 'play', 'house 13');
  const beat = next.finale?.beatMs ?? Infinity;
  expect(beat).toBeGreaterThanOrEqual(LATE_MS);
  expect(beat).toBeLessThanOrEqual(LATE_MS + 3 * FRAME_SLACK_MS);
});

for (const id of [1, 5, 8]) {
  test(`house ${String(id)}'s demonstration lasts its script, hold frame included, then input opens (D83)`, async ({
    page,
  }) => {
    await page.goto(`${TEST}?reset=1&house=${String(id)}${CANVAS}`, { waitUntil: 'load' });
    const s = await waitState(page, (x) => x.scene === 'Game' && x.phase === 'play', 'play');
    const script = demoFor(id, model(await house(page)));
    if (!script) throw new Error(`no demonstration for house ${String(id)}`);
    const open = (s.playAt ?? Infinity) - (s.shownAt ?? 0);
    expect(open).toBeGreaterThanOrEqual(script.ms - FRAME_SLACK_MS);
    expect(open).toBeLessThanOrEqual(script.ms + OPEN_SLACK_MS);
  });
}

/**
 * A platform pause during a demonstration stops its clock, whatever its length: Phaser's tween
 * clock would credit a pause of up to 500 ms on the resume (house 9's demonstration opened input
 * at 909 ms instead of about 1,200), so it runs at timeScale 0 until its first step after
 * (round 1's code audit, ORTA 3).
 */
for (const pauseMs of [300, 450, 800]) {
  test(`a ${String(pauseMs)} ms pause during house 5's demonstration lengthens it by the pause (ORTA 3)`, async ({
    page,
  }) => {
    await page.goto(`${TEST}?reset=1&house=5${CANVAS}`, { waitUntil: 'load' });
    await waitState(page, (x) => x.scene === 'Game' && x.phase === 'demo', 'the demonstration');
    const script = demoFor(5, model(await house(page)));
    if (!script) throw new Error('no demonstration for house 5');
    await page.waitForTimeout(script.ms / 4);
    const t0 = await page.evaluate(() => performance.now());
    await platformPause(page, true);
    await page.waitForTimeout(pauseMs);
    const paused = (await page.evaluate(() => performance.now())) - t0;
    await platformPause(page, false);
    const s = await waitState(page, (x) => x.phase === 'play', 'play');
    expect(s.tweenScale).toBe(1);
    const open = (s.playAt ?? Infinity) - (s.shownAt ?? 0);
    expect(open).toBeGreaterThanOrEqual(script.ms + paused - FRAME_SLACK_MS);
    expect(open).toBeLessThanOrEqual(script.ms + paused + OPEN_SLACK_MS);
    expect((await state(page))?.demoSkipped).toBe(false);
  });
}

/**
 * In houses 1 and 2 the finale's ghosts hop while the last ghost still gives its content pop
 * (the settle's last beat ends at 710 ms; the hop starts at 570 and 680 ms): the hop stops it
 * first, so two motions never move one ghost (round 2's code audit, DÜŞÜK 4). A frame here is
 * 14–23 ms, so the 30 ms overlap of house 2 shows as well.
 */
for (const id of [1, 2]) {
  test(`house ${String(id)}'s finale stops the last ghost's settle as the ghosts hop (DÜŞÜK 4)`, async ({
    page,
  }) => {
    await open(page, `reset=1&house=${String(id)}`);
    await solve(page);
    const next = await waitState(
      page,
      (s) => s.shown === id + 1 && (s.phase === 'play' || s.phase === 'demo'),
      'the next house',
    );
    expect(next.finale?.settling).toBe(0);
  });
}

/** The board's square on the canvas, in canvas (design) px under the Canvas renderer. */
async function boardBox(
  page: Page,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const h = await house(page);
  const first = await center(page, 0);
  const last = await center(page, h.n * h.n - 1);
  return page.evaluate(
    ({ a, b, n }) => {
      const canvas = document.querySelector('canvas');
      if (!canvas) throw new Error('no canvas');
      const r = canvas.getBoundingClientRect();
      const k = canvas.width / r.width;
      const half = ((b.x - a.x) / (n - 1) / 2) * k;
      const x = Math.round((a.x - r.left) * k - half);
      const y = Math.round((a.y - r.top) * k - half);
      const side = Math.round((b.x - a.x) * k + 2 * half);
      return { x, y, width: side, height: side };
    },
    { a: first, b: last, n: h.n },
  );
}

/**
 * What one tap sets moving on the board (docs/gate-b-round2.md §3): every frame the game draws
 * in the first `ms` after the tap (read in an animation-frame callback that runs after the
 * game's own), copied at a quarter of its size, compared with the board before the tap (the
 * changed area; its peak) and with the frame before it (a frame in motion when it differs). The
 * plan counts frames every 50 ms, a measure of time; a timer that fires every 50 ms reads a
 * slower renderer's frame twice and calls the second read still. So the time in motion is read
 * off the drawn frames instead: each frame in motion counts for as long as it stays on screen
 * (until the next drawn frame, or the end of the `ms`). The count of drawn frames in motion is
 * logged too; it depends on the frame rate.
 */
async function motion(
  page: Page,
  cell: number,
  ms: number,
): Promise<{ peak: number; motionMs: number; frames: number; drawn: number }> {
  const box = await boardBox(page);
  const at = await center(page, cell);
  await page.evaluate(
    ({ b, quarter, watch }) => {
      const canvas = document.querySelector('canvas');
      const small = document.createElement('canvas');
      small.width = Math.round(b.width / quarter);
      small.height = Math.round(b.height / quarter);
      const ctx = small.getContext('2d', { willReadFrequently: true });
      if (!canvas || !ctx) throw new Error('no canvas to read');
      const grab = (): Uint8ClampedArray => {
        ctx.clearRect(0, 0, small.width, small.height);
        ctx.drawImage(canvas, b.x, b.y, b.width, b.height, 0, 0, small.width, small.height);
        return ctx.getImageData(0, 0, small.width, small.height).data;
      };
      const base = grab();
      const m = {
        until: watch,
        peak: 0,
        motionMs: 0,
        frames: 0,
        drawn: 0,
        prev: base,
        /** When the last frame read was drawn, and whether it was in motion. */
        prevAt: -1,
        prevMoved: false,
        tapAt: -1,
        on: true,
      };
      // a channel sum this far from the frame before counts as changed: a step of any fade
      const DIFF = 12;
      canvas.addEventListener('pointerdown', () => {
        if (m.tapAt < 0) m.tapAt = performance.now();
      });
      const frame = (at: number): void => {
        if (!m.on) return;
        requestAnimationFrame(frame);
        if (m.tapAt < 0) return;
        // the frame before stayed on screen until this one, or until the watch ended
        const end = Math.min(at, m.tapAt + m.until);
        if (m.prevMoved) m.motionMs += Math.max(0, end - m.prevAt);
        m.prevMoved = false;
        if (at >= m.tapAt + m.until) return;
        const d = grab();
        let changed = 0;
        let moved = 0;
        for (let i = 0; i < d.length; i += 4) {
          let fromBase = 0;
          let fromPrev = 0;
          for (let c = 0; c < 3; c++) {
            fromBase += Math.abs((d[i + c] ?? 0) - (base[i + c] ?? 0));
            fromPrev += Math.abs((d[i + c] ?? 0) - (m.prev[i + c] ?? 0));
          }
          if (fromBase > DIFF) changed++;
          if (fromPrev > DIFF) moved++;
        }
        m.drawn++;
        m.peak = Math.max(m.peak, changed);
        if (moved > 0) m.frames++;
        m.prev = d;
        m.prevAt = at;
        m.prevMoved = moved > 0;
      };
      requestAnimationFrame(frame);
      (window as unknown as { __motion: typeof m }).__motion = m;
    },
    { b: box, quarter: 4, watch: ms },
  );
  await page.mouse.click(at.x, at.y);
  // a few frames past the watch, so its last frame has ended
  await page.waitForTimeout(ms + MOTION_TAIL_MS);
  return page.evaluate(() => {
    const m = (
      window as unknown as {
        __motion: { peak: number; motionMs: number; frames: number; drawn: number; on: boolean };
      }
    ).__motion;
    m.on = false;
    return { peak: m.peak, motionMs: Math.round(m.motionMs), frames: m.frames, drawn: m.drawn };
  });
}

test('success outweighs failure on screen: a settle ≥ 3× a conflict’s area and 2× its time in motion, a solve 10× and 6× (D84)', async ({
  page,
}) => {
  const PHONE = { width: 360, height: 640 };
  const WATCH_MS = 1200;
  await page.setViewportSize(PHONE);
  await open(page, 'reset=1&house=12');
  const h = await house(page);
  const m = model(h);
  // two unlit empty cells in one row segment, in two rooms: a calm ghost, then a conflict
  const pair = (() => {
    for (const seg of m.segments) {
      const cells = seg.cells.filter((c) => !m.blocked[c] && !m.lit[c]);
      for (const a of cells) {
        const b = cells.find((c) => m.roomOf[c] !== m.roomOf[a]);
        if (b !== undefined) return [a, b] as const;
      }
    }
    throw new Error('no pair');
  })();
  const [a, b] = pair;
  const settle = await motion(page, a, WATCH_MS);
  await settledEqualsRules(page);
  const conflict = await motion(page, b, WATCH_MS);
  expect((await settledEqualsRules(page)).ghosts.map(([, st]) => st)).toEqual(['seen', 'seen']);
  // the solve: every solution ghost but the last, then the last
  await open(page, 'reset=1&house=12');
  const sol = h.solution ?? [];
  for (const c of sol.slice(0, -1)) await tap(page, c);
  await settledEqualsRules(page);
  // the beat only, the finale's own motion: the next house's slide would pass on its own (round 2's
  // code audit, DÜŞÜK 5)
  const solve = await motion(page, sol[sol.length - 1] as number, WIN_BEAT_MS);
  console.log(
    `settle ${JSON.stringify(settle)}, conflict ${JSON.stringify(conflict)}, solve ${JSON.stringify(solve)}`,
  );
  expect(settle.peak).toBeGreaterThanOrEqual(3 * conflict.peak);
  expect(settle.motionMs).toBeGreaterThanOrEqual(2 * conflict.motionMs);
  expect(solve.peak).toBeGreaterThanOrEqual(10 * conflict.peak);
  expect(solve.motionMs).toBeGreaterThanOrEqual(6 * conflict.motionMs);
});
