import { expect } from '@playwright/test';
import { WIN_SKIP_FROM_MS } from '../../src/config';
import { RULE_WORDS } from '../support/rule-words';
import { CANVAS, TEST, TOUCHCANCEL_REPORT, platformPause, state, test, waitState } from './helpers';
import {
  button,
  center,
  corner,
  drag,
  emptyCells,
  finishedReplays,
  frames,
  house,
  model,
  open,
  press,
  settledEqualsRules,
  solve,
  stored,
  tap,
} from './play';

/**
 * The graybox loop (TASKS.md Epic 3, brief M1) on the dev build, by real taps, drags and touches:
 * the first houses solved and the next one starting by itself, the seen state at once,
 * relocation, removal, marks and undo, the resume after a reload, the saves on a pause, a hidden
 * page and a reload, input during the win beat and the slide, cancelled touches, the pause and
 * its dim, new screen sizes, the three aspect ratios. After every step the settled screen equals
 * the rules, and the strict model screen (D52) accepts every event list the scene played, for the
 * house on screen and for every house finished.
 */
const INTERACTIVE_MS = 3000;
const TUTORIAL_MS = 60_000;
/** Seconds of thinking without a move before a pause, a hidden page or a reload (YÜKSEK 2). */
const IDLE_S = 3;

test('load → house 1 interactive within 3 s → houses 1–3 by real taps in under a minute', async ({
  page,
}) => {
  await open(page, 'reset=1');
  const first = await state(page);
  expect(first?.shown).toBe(1);
  expect(first?.interactiveAt).not.toBeNull();
  expect(first?.interactiveAt ?? Infinity).toBeLessThanOrEqual(INTERACTIVE_MS);
  const t0 = Date.now();
  for (const id of [1, 2, 3]) {
    expect(await solve(page)).toBe(id);
    // the win beat, then the next house slides in by itself
    await waitState(
      page,
      (s) => s.shown === id + 1 && s.phase === 'play',
      `house ${String(id + 1)}`,
    );
    await finishedReplays(page, id);
  }
  expect(Date.now() - t0).toBeLessThan(TUTORIAL_MS);
  const s = await state(page);
  expect(s?.house).toBe(4);
  await settledEqualsRules(page);
});

test('a conflict shows the seen state at once (house 1, the same row)', async ({ page }) => {
  await open(page, 'reset=1');
  await tap(page, 1); // (0,1): in the row of the ghost in the nightcap
  const drawn = await page.evaluate(() => window.__ghostDebug?.drawn?.());
  expect(drawn?.ghosts).toEqual([
    [0, 'seen'],
    [1, 'seen'],
  ]);
  const text = await page.evaluate(() => window.__ghostDebug?.visible?.() ?? '');
  expect(text).toContain(
    'figures: (0,0) both hands over its eyes, nightcap; (0,1) both hands over its eyes',
  );
  expect(text).toContain('dotted lines: (0,0) to (0,1)');
  // two ghosts shiver, but it is one shivering placement (audit ORTA 6)
  const s = await state(page);
  expect(s?.conflicts).toBe(1);
  expect(s?.tally?.shivers).toBe(1);
  await settledEqualsRules(page);
});

test('relocation, removal, marks (paint, erase) and undo, each as GDD §3.1', async ({ page }) => {
  await open(page, 'reset=1&house=12');
  const m = model(await house(page));
  // two empty cells of one room
  const room = m.roomCells.findIndex((cells) => cells.filter((c) => !m.blocked[c]).length >= 2);
  const [a, b] = (m.roomCells[room] ?? []).filter((c) => !m.blocked[c]) as [number, number];
  await tap(page, a);
  expect((await settledEqualsRules(page)).ghosts.map(([c]) => c)).toEqual([a]);
  await tap(page, b); // the room's ghost glides to b
  expect((await settledEqualsRules(page)).ghosts.map(([c]) => c)).toEqual([b]);
  expect((await state(page))?.tally?.relocations).toBe(1);
  await tap(page, b); // removed
  expect((await settledEqualsRules(page)).ghosts).toEqual([]);
  // paint marks along the top row, then erase them with a drag that starts on a mark
  const top = [0, 1, 2, 3, 4, 5].filter((c) => !m.blocked[c]);
  await drag(page, top[0] as number, top[top.length - 1] as number);
  expect((await settledEqualsRules(page)).marks).toEqual(top);
  await drag(page, top[0] as number, top[1] as number);
  const erased = await settledEqualsRules(page);
  expect(erased.marks).toEqual(top.slice(2));
  await press(page, 'undo'); // the erase comes back
  expect((await settledEqualsRules(page)).marks).toEqual(top);
  await press(page, 'undo'); // and the whole first stroke goes
  expect((await settledEqualsRules(page)).marks).toEqual([]);
  await press(page, 'undo'); // the removal undone: the ghost is back at b
  expect((await settledEqualsRules(page)).ghosts.map(([c]) => c)).toEqual([b]);
});

test('a reload resumes the house in progress: ghosts, marks and seconds', async ({ page }) => {
  await open(page, 'reset=1&house=12');
  const empty = emptyCells(await house(page));
  await tap(page, empty[0] as number);
  await tap(page, empty[empty.length - 1] as number);
  await drag(page, empty[2] as number, empty[3] as number);
  const before = await settledEqualsRules(page);
  await waitState(page, (s) => s.pendingSave === false && (s.seconds ?? 0) > 0, 'saved');
  const seconds = (await state(page))?.seconds ?? 0;
  await page.goto(`${TEST}?renderer=canvas`, { waitUntil: 'load' });
  await waitState(page, (s) => s.scene === 'Game' && s.phase === 'play', 'the game again');
  const after = await settledEqualsRules(page);
  expect(after).toEqual(before);
  const s = await state(page);
  expect(s?.shown).toBe(12);
  expect(s?.seconds ?? 0).toBeGreaterThanOrEqual(seconds);
  expect(s?.moves).toBe(3);
});

for (const how of ['a pause', 'a hidden page', 'a reload'] as const) {
  test(`the solve time thought without a move survives ${how} (audit YÜKSEK 2)`, async ({
    page,
  }) => {
    await open(page, 'reset=1&house=12');
    const empty = emptyCells(await house(page));
    await tap(page, empty[0] as number);
    await waitState(page, (s) => s.pendingSave === false && s.moves === 1, 'the move saved');
    // thinking: no move, so no save is pending when the page goes away
    const idle = await waitState(page, (s) => (s.seconds ?? 0) >= IDLE_S, 'thinking');
    if (how === 'a pause') await platformPause(page, true);
    if (how === 'a hidden page') {
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          get: () => 'hidden',
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });
    }
    if (how !== 'a reload') {
      await waitState(page, (s) => s.pendingSave === false, 'written');
      expect((await stored(page))?.seconds ?? 0).toBeGreaterThanOrEqual(idle.seconds ?? 0);
    }
    await page.goto(`${TEST}?renderer=canvas`, { waitUntil: 'load' });
    const back = await waitState(
      page,
      (s) => s.scene === 'Game' && s.phase === 'play',
      'the game again',
    );
    expect(back.shown).toBe(12);
    expect(back.moves).toBe(1);
    expect(back.seconds ?? 0).toBeGreaterThanOrEqual(idle.seconds ?? 0);
    expect((await settledEqualsRules(page)).ghosts.map(([c]) => c)).toEqual([empty[0]]);
  });
}

test('after rapid taps, drags, undos and a hint, the settled screen equals the rules', async ({
  page,
}) => {
  await open(page, 'reset=1&house=20');
  const h = await house(page);
  const size = h.n * h.n;
  // a fixed walk over the board: taps 20 ms apart, landing on ghosts mid-motion
  let x = 7;
  for (let k = 0; k < 45; k++) {
    x = (x * 31 + 11) % size;
    const p = await center(page, x);
    await page.mouse.click(p.x, p.y);
    if (k % 9 === 4) await press(page, 'undo');
    if (k === 20) await drag(page, x, (x + h.n + 1) % size);
    if (k === 30) await press(page, 'hint');
    await page.waitForTimeout(20);
  }
  await settledEqualsRules(page);
  const s = await state(page);
  expect((s?.tally?.taps ?? 0) + (s?.tally?.undos ?? 0)).toBeGreaterThan(40);
  // the flashes and glances reuse their drawings (audit DÜŞÜK 9)
  const fx = s?.effects ?? { made: 0, used: 0 };
  expect(fx.used).toBeGreaterThan(fx.made);
});

test('a platform pause freezes the house and dims it; the waking tap is not a game tap', async ({
  page,
}) => {
  await open(page, 'reset=1&house=12');
  const empty = emptyCells(await house(page));
  await tap(page, empty[0] as number);
  await settledEqualsRules(page);
  expect((await state(page))?.dimmed).toBe(false);
  await platformPause(page, true);
  const paused = await waitState(page, (s) => s.paused, 'paused');
  expect(paused.input).toBe(false);
  expect(paused.dimmed).toBe(true);
  const frozen = paused.seconds;
  await page.waitForTimeout(1200);
  expect((await state(page))?.seconds).toBe(frozen);
  await platformPause(page, false);
  // the tap that wakes the game lands inside the grace: it is not a game tap
  const p = await center(page, empty[empty.length - 1] as number);
  await page.mouse.click(p.x, p.y);
  const woke = await state(page);
  expect(woke?.input).toBe(false);
  expect(woke?.dimmed).toBe(false);
  expect(woke?.moves).toBe(1);
  await waitState(page, (s) => s.input, 'input back after the grace');
  await page.mouse.click(p.x, p.y);
  await waitState(page, (s) => s.moves === 2, 'a game tap again');
  await settledEqualsRules(page);
});

test('a press held on the hint from the win beat does nothing in the next house (YÜKSEK 3)', async ({
  page,
}) => {
  await open(page, 'reset=1');
  const hint = await button(page, 'hint');
  await solve(page);
  expect((await state(page))?.phase).toBe('win');
  await page.mouse.move(hint.x, hint.y);
  await page.mouse.down(); // early in the finale: ignored, and the press is dropped
  await waitState(page, (s) => s.shown === 2 && s.phase === 'play', 'house 2');
  await page.mouse.up();
  await frames(page, 3);
  const s = await state(page);
  expect([s?.hints, s?.moves, s?.hintReady]).toEqual([0, 0, true]);
  await finishedReplays(page, 1);
  await settledEqualsRules(page);
});

test('a tap in the beat skips it; a tap on the hint in the slide only ends the slide', async ({
  page,
}) => {
  await open(page, 'reset=1');
  const hint = await button(page, 'hint');
  const away = await corner(page);
  await solve(page);
  expect((await state(page))?.phase).toBe('win');
  // from 600 ms into the finale a tap skips it (D73)
  await waitState(page, (s) => (s.beatMs ?? 0) >= WIN_SKIP_FROM_MS, 'the finale skippable');
  await page.mouse.click(away.x, away.y); // the finale is skipped: the slide starts
  await page.mouse.click(hint.x, hint.y); // the slide ends, and nothing else happens
  await waitState(page, (s) => s.shown === 2 && s.phase === 'play', 'house 2');
  await frames(page, 3);
  const s = await state(page);
  expect([s?.hints, s?.moves, s?.hintReady]).toEqual([0, 0, true]);
  await finishedReplays(page, 1);
  await settledEqualsRules(page);
});

for (const [name, viewport, arrangement] of [
  ['9:16', { width: 390, height: 844 }, 'portrait'],
  ['1:1', { width: 600, height: 600 }, 'square'],
  ['16:9', { width: 844, height: 390 }, 'landscape'],
] as const) {
  test(`${name}: house 9 lays out ${arrangement}, plays by taps and is solved`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await open(page, 'reset=1&house=9');
    const s = await state(page);
    expect(s?.arrangement).toBe(arrangement);
    expect(s?.cell ?? 0).toBeGreaterThanOrEqual(80);
    await solve(page);
    await waitState(page, (x) => x.shown === 10 && x.phase === 'play', 'house 10');
    await finishedReplays(page, 9);
    await settledEqualsRules(page);
  });
}

test('?playtest=1 hides the solution from the hooks; visible() names no rule', async ({ page }) => {
  await open(page, 'reset=1&house=17&playtest=1');
  const got = await page.evaluate(() => ({
    solution: window.__ghostDebug?.solution?.(),
    house: window.__ghostDebug?.house?.(),
    text: window.__ghostDebug?.visible?.() ?? '',
    state: window.__ghostDebug?.state() as Record<string, unknown> | undefined,
  }));
  expect(got.solution).toBeNull();
  expect(got.house?.solution).toBeNull();
  // the neutral state (D87): no solution, no phase, no tally, no reason
  expect(Object.keys(got.state ?? {}).sort()).toEqual(
    [
      'arrangement',
      'bulbReadyIn',
      'cell',
      'drags',
      'house',
      'input',
      'n',
      'paused',
      'presses',
      'seconds',
      'shown',
      'taps',
    ].sort(),
  );
  expect(got.text).toMatch(/^house 17 · 6 × 6/);
  // house 17 has a lamp: the floor shows its sun icon and its warm wash, in words of what is drawn
  const lines = got.text.split('\n');
  const floor = lines.findIndex((l) => l.startsWith('floor ('));
  const rows = lines.slice(floor + 1, floor + 7).join('\n');
  expect(rows).toContain('@');
  expect(rows).toContain('~');
  expect(got.text.match(RULE_WORDS)?.[0] ?? null).toBeNull();
});

test('a house restored already solved plays its win and moves on by itself (D49)', async ({
  page,
}) => {
  // house 2 (ABB / ABB / CCC, the resident at (0,1)) saved with its two last ghosts in place:
  // the crash came between the last move and the house-solved save
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem(
      'shy-ghosts:save',
      JSON.stringify({
        version: 1,
        house: 2,
        housesSolved: 1,
        current: { id: 2, ghosts: [3, 8], marks: [], seconds: 4, hints: 0, moves: 2, conflicts: 0 },
        sound: true,
        music: true,
      }),
    );
  });
  await page.goto(`${TEST}?${CANVAS.slice(1)}`, { waitUntil: 'load' });
  const s = await waitState(page, (x) => x.shown === 3 && x.phase === 'play', 'house 3');
  expect(s.house).toBe(3);
  await finishedReplays(page, 2);
  await settledEqualsRules(page);
});

test('the hint: the first press shows why and places nothing, the second places; one hint, one cooldown (D74)', async ({
  page,
}) => {
  await open(page, 'reset=1&house=12');
  expect((await state(page))?.hintReady).toBe(true);
  await press(page, 'hint');
  const shown = await waitState(page, (s) => s.hints === 1, 'the reason shown');
  expect(shown.moves).toBe(0);
  expect(shown.hintReady).toBe(false);
  expect(shown.hintRemaining ?? 0).toBeGreaterThan(80);
  const reason = shown.hintReason;
  if (reason?.kind !== 'place')
    throw new Error(`no placement explained: ${JSON.stringify(reason)}`);
  expect(reason.segments.length + reason.rooms.length).toBeGreaterThan(1);
  expect((await settledEqualsRules(page)).ghosts).toEqual([]);
  await press(page, 'hint'); // the second press: the explained ghost appears
  const placed = await waitState(page, (s) => s.moves === 1, 'the hint placed a ghost');
  expect(placed.hints).toBe(1);
  expect(placed.hintReason).toBeNull();
  expect((await settledEqualsRules(page)).ghosts.map(([c]) => c)).toEqual([reason.cell]);
  const h = await house(page);
  expect(h.solution).toContain(reason.cell);
  await press(page, 'hint'); // cooling down, nothing pending: nothing happens
  await frames(page, 3);
  expect((await state(page))?.moves).toBe(1);
  await press(page, 'undo');
  expect((await settledEqualsRules(page)).ghosts).toEqual([]);
});

test('a new screen size mid-house lays the board out again and play goes on', async ({ page }) => {
  await open(page, 'reset=1&house=20');
  const empty = emptyCells(await house(page));
  await tap(page, empty[0] as number);
  await drag(page, empty[3] as number, empty[5] as number);
  const before = await settledEqualsRules(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await waitState(page, (s) => s.arrangement === 'landscape', 'landscape');
  expect(await settledEqualsRules(page)).toEqual(before);
  await tap(page, empty[empty.length - 1] as number);
  const later = await settledEqualsRules(page);
  expect(later.ghosts.map(([c]) => c)).toContain(empty[empty.length - 1]);
});

test('a resize at the same size keeps the board; a new size builds it once (ORTA 5)', async ({
  page,
}) => {
  await open(page, 'reset=1&house=12');
  const empty = emptyCells(await house(page));
  await tap(page, empty[0] as number);
  const before = await settledEqualsRules(page);
  const builds = (await state(page))?.builds ?? 0;
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'));
    window.visualViewport?.dispatchEvent(new Event('resize'));
  });
  await frames(page, 10);
  expect((await state(page))?.builds).toBe(builds);
  await page.setViewportSize({ width: 600, height: 600 });
  await waitState(page, (s) => s.arrangement === 'square', 'square');
  await frames(page, 10);
  expect((await state(page))?.builds).toBe(builds + 1);
  expect(await settledEqualsRules(page)).toEqual(before);
});

test('a new screen size during the win beat lays it out again; the beat plays on (ORTA 5)', async ({
  page,
}) => {
  await open(page, 'reset=1&house=9');
  await solve(page);
  expect((await state(page))?.phase).toBe('win');
  await page.setViewportSize({ width: 600, height: 600 });
  const s = await waitState(page, (x) => x.arrangement === 'square', 'square');
  expect([s.phase, s.shown]).toEqual(['win', 9]);
  await frames(page, 6);
  expect((await state(page))?.phase).toBe('win');
  const next = await waitState(page, (x) => x.shown === 10 && x.phase === 'play', 'house 10');
  expect(next.arrangement).toBe('square');
  await finishedReplays(page, 9);
  await settledEqualsRules(page);
});

test('the buttons follow a new screen size: undo and hint answer to their edge at 1:1', async ({
  page,
}) => {
  const EDGE = 0.85;
  await open(page, 'reset=1&house=12');
  const empty = emptyCells(await house(page));
  await page.setViewportSize({ width: 600, height: 600 }); // smaller buttons in the square layout
  await waitState(page, (s) => s.arrangement === 'square', 'square');
  await tap(page, empty[0] as number);
  expect((await settledEqualsRules(page)).ghosts).toHaveLength(1);
  await press(page, 'undo', EDGE);
  expect((await settledEqualsRules(page)).ghosts).toEqual([]);
  await press(page, 'hint', EDGE); // the reason (D74)
  await waitState(page, (s) => s.hints === 1, 'the hint');
  await press(page, 'hint', EDGE); // the ghost
  await waitState(page, (s) => s.moves === 3, 'the hint placed');
  expect((await settledEqualsRules(page)).ghosts).toHaveLength(1);
});

test.describe('on a touch screen', () => {
  test.use({ hasTouch: true, quietConsole: [TOUCHCANCEL_REPORT] });

  test('a touch the system cancels is no tap, no drag and no press (audit ORTA 4)', async ({
    page,
  }) => {
    await open(page, 'reset=1&house=12');
    const empty = emptyCells(await house(page));
    const start = await settledEqualsRules(page);
    const cdp = await page.context().newCDPSession(page);
    const touch = async (
      type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
      at?: { x: number; y: number },
    ): Promise<void> => {
      await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: at ? [at] : [] });
    };
    const a = await center(page, empty[0] as number);
    const b = await center(page, empty[1] as number);
    await touch('touchStart', a); // a tap the system takes back
    await touch('touchCancel');
    await touch('touchStart', a); // a drag the system takes back
    await touch('touchMove', b);
    await touch('touchCancel');
    await frames(page, 3);
    expect((await state(page))?.moves).toBe(0);
    expect(await settledEqualsRules(page)).toEqual(start);
    await touch('touchStart', a); // a real touch tap still places a ghost
    await touch('touchEnd');
    await waitState(page, (s) => s.moves === 1, 'a touch tap');
    for (const name of ['undo', 'hint'] as const) {
      const p = await button(page, name);
      await touch('touchStart', { x: p.x, y: p.y });
      await touch('touchCancel');
    }
    await frames(page, 3);
    const s = await state(page);
    expect([s?.moves, s?.hints, s?.hintReady]).toEqual([1, 0, true]);
    expect((await settledEqualsRules(page)).ghosts.map(([c]) => c)).toEqual([empty[0]]);
  });
});
