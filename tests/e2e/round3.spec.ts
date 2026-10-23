import { expect, type Page } from '@playwright/test';
import { HINT_COOLDOWN_S, RESUME_TAP_GRACE_MS } from '../../src/config';
import type { DebugHouse } from '../../src/dev/debug';
import { Grader } from '../../src/gen/grade';
import { T4 } from '../../src/gen/params';
import { puzzleOf } from '../../src/gen/solve';
import { SAVE_KEY } from '../../src/platform/storage';
import { RULE_WORDS } from '../support/rule-words';
import { platformPause, state, test, waitState } from './helpers';
import {
  corner,
  emptyCells,
  finishedReplays,
  house,
  model,
  open,
  press,
  settledEqualsRules,
  solve,
  tap,
} from './play';

/**
 * Gate B tune round 3 on the dev build (docs/gate-b-round3.md §"Tune round 3" §2–§7; D98–D103),
 * by real input: the hint's reason in beats with digits and its recharge, kept until the hint is
 * used and kept by the save; the held result card.
 */

/** The cells the grader removes from the board as it opens to the next forced ghost. */
function removedOnTheWay(h: DebugHouse): number[] {
  const m = model(h);
  const g = new Grader(puzzleOf(m, m.roomOf, h.givens));
  const out: number[] = [];
  for (;;) {
    const s = g.step(T4);
    if (s === 'stuck' || s === 'contradiction' || s.placed !== null) break;
    out.push(...s.removed);
  }
  return out.sort((a, b) => a - b);
}

/** An unlit empty cell outside the room `room` and the residents' rooms: a tap places a ghost. */
function elsewhere(h: DebugHouse, room: number): number {
  const m = model(h);
  const taken = new Set(h.givens.map((g) => m.roomOf[g]));
  const cell = emptyCells(h).find(
    (c) => m.candidate[c] && m.roomOf[c] !== room && !taken.has(m.roomOf[c]),
  );
  if (cell === undefined) throw new Error('no cell elsewhere');
  return cell;
}

async function visible(page: Page): Promise<string> {
  return page.evaluate(() => window.__ghostDebug?.visible?.() ?? '');
}

test("the hint's first press (house 7): the count's digit 2 on its lines, dots on exactly the cells the grader removes, the digit 1 last (D98)", async ({
  page,
}) => {
  await open(page, 'reset=1&house=7');
  const h = await house(page);
  await press(page, 'hint');
  // the beats play one after another, then the whole picture holds
  const first = await waitState(page, (s) => (s.reasonPicture?.shown ?? 0) >= 1, 'the first beat');
  expect(first.reasonPicture?.shown).toBeLessThan(first.reasonPicture?.beats ?? 0);
  const s = await waitState(
    page,
    (x) => x.reasonPicture !== null && x.reasonPicture?.shown === x.reasonPicture?.beats,
    'the whole reason',
  );
  const pic = s.reasonPicture;
  expect(pic?.dots).toEqual(removedOnTheWay(h));
  // the count's two lines each carry the digit 2, the target room the digit 1
  const count = s.hintReason?.kind === 'place' ? s.hintReason.beats[0] : undefined;
  expect(count?.kind).toBe('count');
  const lines = count?.kind === 'count' ? count.segments : [];
  expect(pic?.badges.filter((b) => b.digit === 2).map((b) => b.segment)).toEqual(lines);
  expect(pic?.bands).toEqual(expect.arrayContaining(lines));
  const room = s.hintReason?.kind === 'place' ? s.hintReason.room : -1;
  expect(pic?.badges.filter((b) => b.digit === 1)).toEqual([{ digit: 1, segment: null, room }]);
  expect(pic?.pulse).toBe(room);
  // nothing placed, one hint counted
  expect([s.moves, s.hints]).toEqual([0, 1]);
  // visible() lists the picture in neutral words, the digits included (B2)
  const text = await visible(page);
  expect(text).toMatch(/the digit 2/);
  expect(text).toMatch(/the digit 1/);
  expect(text).toMatch(/small blue dots:/);
  expect(text.match(RULE_WORDS)?.[0] ?? null).toBeNull();
});

test('a tap elsewhere takes the reason away and the bulb is ready at once; one hint is still counted (D98)', async ({
  page,
}) => {
  await open(page, 'reset=1&house=7');
  await press(page, 'hint');
  const shown = await waitState(page, (s) => s.reasonShown === true, 'the reason');
  expect(shown.hintReady).toBe(false);
  const room = shown.hintReason?.kind === 'place' ? shown.hintReason.room : -1;
  await tap(page, elsewhere(await house(page), room));
  const after = await waitState(page, (s) => s.moves === 1, 'the tap');
  expect([after.reasonShown, after.hintReason, after.hintReady, after.hintRemaining]).toEqual([
    false,
    null,
    true,
    0,
  ]);
  expect(after.hints).toBe(1);
  await settledEqualsRules(page);
});

test('the second press starts the cooldown; so does the player placing the ghost the reason shows (D98)', async ({
  page,
}) => {
  await open(page, 'reset=1&house=7');
  await press(page, 'hint');
  await waitState(page, (s) => s.reasonShown === true, 'the reason');
  // two seconds of play pass on the game's clock (headless, it runs behind the wall clock)
  const before = await waitState(
    page,
    (s) => (s.hintRemaining ?? HINT_COOLDOWN_S) < HINT_COOLDOWN_S - 2,
    'two seconds of play',
  );
  expect(before.hintRemaining ?? 0).toBeLessThan(HINT_COOLDOWN_S - 2);
  await press(page, 'hint');
  const placed = await waitState(page, (s) => s.moves === 1, 'the hint placed');
  expect(placed.hintRemaining ?? 0).toBeGreaterThan(HINT_COOLDOWN_S - 1);
  expect([placed.hints, placed.hintReady]).toEqual([1, false]);

  // the player's own tap on the reason's cell uses the hint too
  await open(page, 'reset=1&house=7');
  await press(page, 'hint');
  const shown = await waitState(page, (s) => s.reasonShown === true, 'the reason');
  await waitState(
    page,
    (s) => (s.hintRemaining ?? HINT_COOLDOWN_S) < HINT_COOLDOWN_S - 2,
    'two seconds of play',
  );
  const target = shown.hintReason?.kind === 'place' ? shown.hintReason.cell : -1;
  await tap(page, target as number);
  const used = await waitState(page, (s) => s.moves === 1, 'the tap on the cell');
  expect(used.hintRemaining ?? 0).toBeGreaterThan(HINT_COOLDOWN_S - 1);
  expect([used.hints, used.hintReady, used.reasonShown]).toEqual([1, false, false]);
});

test('the save keeps the recharge: a reload with 50 s left restores 50 ± 1 s, and what is left at a reload (D98)', async ({
  page,
}) => {
  await page.addInitScript(
    ({ key }) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 2,
          house: 7,
          housesSolved: 6,
          current: null,
          sound: true,
          music: true,
          hintReadyIn: 50,
        }),
      );
    },
    { key: SAVE_KEY },
  );
  await open(page, 'house=7');
  const s = await state(page);
  expect(s?.hintReady).toBe(false);
  expect(Math.abs((s?.hintRemaining ?? 0) - 50)).toBeLessThanOrEqual(1);
  // a move writes the house in progress, and the recharge with it; a reload keeps it
  await tap(page, elsewhere(await house(page), -1));
  const saved = await waitState(page, (x) => x.moves === 1 && x.pendingSave === false, 'saved');
  await page.reload({ waitUntil: 'load' });
  const back = await waitState(page, (x) => x.scene === 'Game' && x.phase === 'play', 'reloaded');
  expect(back.hintReady).toBe(false);
  expect(Math.abs((back.hintRemaining ?? 0) - (saved.hintRemaining ?? 0))).toBeLessThanOrEqual(1);
});

const PHONE = { width: 360, height: 640 };

test('the held result card at 360 × 640 (D99): after the finale it holds 10 s with no input, its digits listed', async ({
  page,
}) => {
  await page.setViewportSize(PHONE);
  await open(page, 'reset=1&house=12');
  await solve(page);
  const up = await waitState(page, (s) => s.phase === 'card' && s.card !== null, 'the card');
  expect(up.card).toMatchObject({ house: 12, noHint: true });
  expect(up.card?.time).toMatch(/^\d+:\d\d$/);
  await page.waitForTimeout(10_000);
  const held = await state(page);
  expect([held?.phase, held?.shown, held?.card?.house]).toEqual(['card', 12, 12]);
  // the next house is already the house to play (a reload opens it)
  expect(held?.house).toBe(13);
  const text = await visible(page);
  expect(text).toContain(`a card below the board: the digits 12 and ${held?.card?.time ?? '?'}`);
  expect(text).toContain('a bulb with a tick');
  expect(text).toContain('an arrow pointing right');
  expect(text.match(RULE_WORDS)?.[0] ?? null).toBeNull();
});

test('a tap 300 ms into the card does nothing; one at 700 ms continues to the next house (D99)', async ({
  page,
}) => {
  await open(page, 'reset=1&house=12');
  const away = await corner(page);
  await solve(page);
  await waitState(page, (s) => (s.cardMs ?? -1) >= 300, '300 ms into the card');
  await page.mouse.click(away.x, away.y);
  const early = await state(page);
  expect([early?.phase, early?.shown]).toEqual(['card', 12]);
  await waitState(page, (s) => (s.cardMs ?? -1) >= 700, '700 ms into the card');
  await page.mouse.click(away.x, away.y);
  await waitState(page, (s) => s.shown === 13 && s.phase === 'play', 'house 13');
  await finishedReplays(page, 12);
});

test('the tap that wakes the game after a pause never continues the card (D99)', async ({
  page,
}) => {
  await open(page, 'reset=1&house=12');
  const away = await corner(page);
  await solve(page);
  await waitState(page, (s) => (s.cardMs ?? -1) >= 1000, 'the card, past its guard');
  await platformPause(page, true);
  await platformPause(page, false);
  await page.mouse.click(away.x, away.y); // the waking tap, inside the resume grace
  await page.waitForTimeout(RESUME_TAP_GRACE_MS + 200);
  expect((await state(page))?.phase).toBe('card');
  await page.mouse.click(away.x, away.y);
  await waitState(page, (s) => s.shown === 13 && s.phase === 'play', 'house 13');
});

test('a reload during the card opens the next house; the card shows the no-hint badge only without a hint (D99)', async ({
  page,
}) => {
  await open(page, 'reset=1&house=12');
  await press(page, 'hint');
  await waitState(page, (s) => s.reasonShown === true, 'the reason');
  await press(page, 'hint');
  await waitState(page, (s) => s.moves === 1, 'the hint placed');
  // the rest of the solution (a tap on the hint's ghost would take it away again)
  const h = await house(page);
  const placed = (await settledEqualsRules(page)).ghosts.map(([c]) => c);
  for (const c of h.solution ?? []) if (!placed.includes(c)) await tap(page, c);
  const up = await waitState(page, (s) => s.phase === 'card' && s.card !== null, 'the card');
  expect(up.card?.noHint).toBe(false);
  expect(await visible(page)).not.toContain('a bulb with a tick');
  await waitState(page, (s) => s.pendingSave === false, 'the save written');
  // a reload of the game's own page (the dev query of this test would reset the save)
  await open(page, 'from=card');
  const next = await state(page);
  expect([next?.shown, next?.house]).toEqual([13, 13]);
});

test("a pause while the card holds saves the hint's recharge: a reload restores what was left within 1 s (round 3's code audit, DÜŞÜK 1)", async ({
  page,
}) => {
  const HOLD_S = 4;
  await open(page, 'reset=1&house=12');
  await press(page, 'hint');
  await waitState(page, (s) => s.reasonShown === true, 'the reason');
  await press(page, 'hint');
  await waitState(page, (s) => s.moves === 1, 'the hint placed: the cooldown runs');
  const h = await house(page);
  const placed = (await settledEqualsRules(page)).ghosts.map(([c]) => c);
  for (const c of h.solution ?? []) if (!placed.includes(c)) await tap(page, c);
  // four seconds of recharge run on the card (on the game's clock, which runs behind the wall
  // clock headless); then the platform pauses, which flushes the save in every phase (the house
  // in progress only in play)
  const up = await waitState(page, (s) => s.phase === 'card', 'the card');
  const held = await waitState(
    page,
    (s) => s.phase === 'card' && (s.hintRemaining ?? 0) <= (up.hintRemaining ?? 0) - HOLD_S,
    '4 s of recharge on the card',
  );
  expect(held.hintRemaining ?? HINT_COOLDOWN_S).toBeLessThan(HINT_COOLDOWN_S - HOLD_S);
  await platformPause(page, true);
  await waitState(page, (s) => s.pendingSave === false, 'the save written');
  const atFlush = await state(page);
  expect(atFlush?.paused).toBe(true);
  // a reload of the game's own page restores the next house, and the recharge as it was left
  await open(page, 'from=card');
  const back = await waitState(page, (s) => s.shown === 13 && s.phase === 'play', 'house 13');
  expect(back.hintReady).toBe(false);
  expect(Math.abs((back.hintRemaining ?? 0) - (atFlush?.hintRemaining ?? 0))).toBeLessThanOrEqual(
    1,
  );
});
