import { expect, type Page } from '@playwright/test';
import { DEMO_IDLE_MS } from '../../src/config';
import type { DebugHouse } from '../../src/dev/debug';
import { CANVAS, TEST, platformPause, state, test, waitState } from './helpers';
import {
  button,
  center,
  emptyCells,
  house,
  model,
  open,
  press,
  settledEqualsRules,
  stored,
  tap,
} from './play';

/**
 * Gate B tune round 2's code audit on the dev build, by real input: a demonstration never plays
 * again while the player has a pointer or a button down, or a hint's reason on the board
 * (YÜKSEK 1, ORTA 1); a pause during a replay saves (DÜŞÜK 1); a move takes any reason away
 * (DÜŞÜK 2); the playtest hooks read no rules (DÜŞÜK 9). The finale's hop is timing.spec's.
 */
/**
 * Long enough for a replay to start: the idle clock runs on the game's frame times, which lag
 * the wall clock headless (a replay began 6 s after the last input in a probe).
 */
const HOLD_MS = 2 * DEMO_IDLE_MS;

/**
 * An empty cell in a room without a resident whose right neighbour is empty too and takes a ghost
 * carried from it: in the same room, or in another room without a resident (D72).
 */
function pairCell(h: DebugHouse): number {
  const m = model(h);
  const taken = new Set(h.givens.map((g) => m.roomOf[g]));
  const empty = emptyCells(h).filter((c) => !h.givens.includes(c));
  const a = empty.find(
    (c) =>
      !taken.has(m.roomOf[c]) &&
      c % m.n < m.n - 1 &&
      empty.includes(c + 1) &&
      (m.roomOf[c + 1] === m.roomOf[c] || !taken.has(m.roomOf[c + 1])),
  );
  if (a === undefined) throw new Error('no free pair');
  return a;
}

/** Presses on cell `from`, moves to `to` in small steps and keeps the button down. */
async function dragAndHold(page: Page, from: number, to: number): Promise<void> {
  const a = await center(page, from);
  const b = await center(page, to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 10 });
}

for (const resumed of [false, true]) {
  test(`a ghost carried and held past the idle time starts no replay and lands where it is dropped (house 3${resumed ? ', resumed' : ''}; round 2's code audit, YÜKSEK 1)`, async ({
    page,
  }) => {
    await open(page, 'reset=1&house=3');
    const h = await house(page);
    const a = pairCell(h);
    await tap(page, a);
    await waitState(
      page,
      (s) => s.moves === 1 && s.idle === true && s.pendingSave === false,
      'placed',
    );
    let demos = 1;
    if (resumed) {
      await page.goto(`${TEST}?${CANVAS.slice(1)}`, { waitUntil: 'load' });
      const back = await waitState(page, (s) => s.scene === 'Game' && s.phase === 'play', 'back');
      expect([back.shown, back.demos]).toEqual([3, 0]);
      demos = 0;
    }
    await dragAndHold(page, a, a + 1);
    await page.waitForTimeout(HOLD_MS);
    const held = await state(page);
    expect([held?.phase, held?.demos]).toEqual(['play', demos]);
    await page.mouse.up();
    const rules = await settledEqualsRules(page);
    expect(rules.ghosts.map(([c]) => c)).toContain(a + 1);
  });
}

test("a finger held on an empty cell past the idle time starts no replay, and its drag still paints (house 2; round 2's code audit, ORTA 1)", async ({
  page,
}) => {
  await open(page, 'reset=1&house=2');
  const h = await house(page);
  const empty = emptyCells(h).filter((c) => !h.givens.includes(c));
  const a = empty.find((c) => c % h.n < h.n - 1 && empty.includes(c + 1));
  if (a === undefined) throw new Error('no empty pair');
  const p = await center(page, a);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(HOLD_MS);
  const held = await state(page);
  expect([held?.phase, held?.demos]).toEqual(['play', 1]);
  const q = await center(page, a + 1);
  await page.mouse.move(q.x, q.y, { steps: 10 });
  await page.mouse.up();
  const rules = await settledEqualsRules(page);
  expect(rules.marks).toEqual(expect.arrayContaining([a, a + 1]));
});

test("the hint's reason holds the replay off, and the next tap acts (house 5; round 2's code audit, ORTA 1)", async ({
  page,
}) => {
  await open(page, 'reset=1&house=5');
  await press(page, 'hint');
  await waitState(page, (s) => s.reasonShown === true, 'the reason');
  await page.waitForTimeout(HOLD_MS);
  const reading = await state(page);
  expect([reading?.phase, reading?.demos, reading?.reasonShown]).toEqual(['play', 1, true]);
  const h = await house(page);
  const m = model(h);
  const taken = new Set(h.givens.map((g) => m.roomOf[g]));
  const free = emptyCells(h).find((c) => !taken.has(m.roomOf[c]) && !m.lit[c]);
  if (free === undefined) throw new Error('no free cell');
  await tap(page, free);
  const after = await waitState(page, (s) => s.moves === 1, 'the tap acts');
  expect([after.phase, after.reasonShown, after.hintReason]).toEqual(['play', false, null]);
  await settledEqualsRules(page);
});

test("a button held past the idle time starts no replay and counts when it comes up (house 2; round 2's code audit, ORTA 1)", async ({
  page,
}) => {
  await open(page, 'reset=1&house=2');
  const b = await button(page, 'hint');
  await page.mouse.move(b.x, b.y);
  await page.mouse.down();
  await page.waitForTimeout(HOLD_MS);
  const held = await state(page);
  expect([held?.phase, held?.demos]).toEqual(['play', 1]);
  await page.mouse.up();
  const s = await waitState(page, (x) => x.reasonShown === true, 'the press counted');
  expect([s.hints, s.demos]).toEqual([1, 1]);
});

test("a pause during a replay writes the house in progress (house 5; round 2's code audit, DÜŞÜK 1)", async ({
  page,
}) => {
  await open(page, 'reset=1&house=5');
  const h = await house(page);
  const empty = emptyCells(h).filter((c) => !h.givens.includes(c));
  const a = empty.find((c) => c % h.n < h.n - 1 && empty.includes(c + 1));
  if (a === undefined) throw new Error('no empty pair');
  // a mark: the house is in progress and keeps its replays (no placement yet)
  const p = await center(page, a);
  const q = await center(page, a + 1);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(q.x, q.y, { steps: 10 });
  await page.mouse.up();
  await waitState(page, (s) => s.moves === 1 && s.pendingSave === false, 'the mark saved');
  const before = (await stored(page))?.seconds ?? -1;
  const replay = await waitState(page, (s) => s.phase === 'demo', 'the replay');
  await platformPause(page, true);
  const after = (await stored(page))?.seconds ?? -1;
  await platformPause(page, false);
  expect(replay.seconds).toBeGreaterThan(before);
  expect(after).toBe(replay.seconds);
});

test("a move takes the hint's reason away even before its pulse has shown (house 141; round 2's code audit, DÜŞÜK 2)", async ({
  page,
}) => {
  // house 141's first hint dims no cell: its reason is the target room's pulse alone
  await open(page, 'reset=1&house=141');
  const h = await house(page);
  const bulb = await button(page, 'hint');
  const cell = await center(page, emptyCells(h)[0] as number);
  // the press and a tap in one task, before the pulse's first step: the reason draws nothing yet
  await page.evaluate(
    ({ b, c }) => {
      const canvas = document.querySelector('canvas');
      if (!canvas) throw new Error('no canvas');
      const fire = (type: string, at: { x: number; y: number }): void => {
        const init = { clientX: at.x, clientY: at.y, bubbles: true, cancelable: true, button: 0 };
        canvas.dispatchEvent(
          new MouseEvent(type, { ...init, buttons: type === 'mousedown' ? 1 : 0 }),
        );
      };
      fire('mousedown', b);
      fire('mouseup', b);
      fire('mousedown', c);
      fire('mouseup', c);
    },
    { b: bulb, c: cell },
  );
  await page.waitForTimeout(700);
  const s = await state(page);
  expect([s?.hints, s?.moves, s?.hintReason, s?.reasonShown]).toEqual([1, 1, null, false]);
});

test("?playtest=1: the hooks that read the rules give nothing (rules, drawn, events, previous; round 2's code audit, DÜŞÜK 9)", async ({
  page,
}) => {
  await open(page, 'reset=1&house=2&playtest=1');
  const got = await page.evaluate(() => {
    const d = window.__ghostDebug as unknown as Record<string, unknown>;
    return ['rules', 'drawn', 'events', 'previous'].map((k) => {
      const f = d[k];
      if (typeof f !== 'function') return `${k}: none`;
      try {
        const v = (f as () => unknown)();
        return v === null || v === undefined ? `${k}: null` : `${k}: gives`;
      } catch {
        return `${k}: throws`;
      }
    });
  });
  expect(got).toEqual(['rules: throws', 'drawn: throws', 'events: throws', 'previous: throws']);
});
