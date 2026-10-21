import { expect, type Page } from '@playwright/test';
import { parseHouse, type HouseModel } from '../../src/core/house';
import type { DebugHouse, DebugRecord } from '../../src/dev/debug';
import type { DrawnState } from '../../src/game/board';
import type { ViewState } from '../../src/game/view';
import { SAVE_KEY } from '../../src/platform/storage';
import { Screen } from '../support/screen';
import { CANVAS, TEST, waitNeutral, waitState } from './helpers';

/**
 * Playing a house by real input in the e2e (the graybox and Gate B round-1 specs): opening a
 * house, taps, drags and button presses at the hooks' page positions, the house and its save as
 * the hooks show them, and the check that the settled screen equals the rules and the strict model
 * screen (D52).
 */
export async function open(page: Page, query: string): Promise<void> {
  await page.goto(`${TEST}?${query}${CANVAS}`, { waitUntil: 'load' });
  // the playtest mode's state is neutral (D87): no scene, no phase, input open or closed
  if (query.includes('playtest=1')) await waitNeutral(page, (s) => s.input === 'open', 'the game');
  else
    await waitState(page, (s) => s.scene === 'Game' && s.input && s.phase === 'play', 'the game');
}

export async function center(page: Page, cell: number): Promise<{ x: number; y: number }> {
  const p = await page.evaluate((c) => window.__ghostDebug?.cellCenter?.(c) ?? null, cell);
  if (!p) throw new Error(`no cell ${String(cell)}`);
  return p;
}

export async function tap(page: Page, cell: number): Promise<void> {
  const p = await center(page, cell);
  await page.mouse.click(p.x, p.y);
}

export async function drag(page: Page, from: number, to: number): Promise<void> {
  const a = await center(page, from);
  const b = await center(page, to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 10 });
  await page.mouse.up();
}

/** A HUD button's middle and radius in page px. */
export async function button(
  page: Page,
  name: 'undo' | 'hint',
): Promise<{ x: number; y: number; r: number }> {
  const p = await page.evaluate((n) => window.__ghostDebug?.buttonCenter?.(n) ?? null, name);
  if (!p) throw new Error(`no button ${name}`);
  return p;
}

/** A press on a HUD button, `off` of its radius up and left of its middle (0: the middle). */
export async function press(page: Page, name: 'undo' | 'hint', off = 0): Promise<void> {
  const p = await button(page, name);
  const d = (off * p.r) / Math.SQRT2;
  await page.mouse.click(p.x - d, p.y - d);
}

/** A point on the canvas away from the board and the buttons (the top band's left end). */
export async function corner(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const r = document.querySelector('canvas')?.getBoundingClientRect();
    if (!r) throw new Error('no canvas');
    return { x: r.left + 8, y: r.top + 8 };
  });
}

/** Waits `n` animation frames: Phaser has stepped at least n − 1 times since. */
export async function frames(page: Page, n: number): Promise<void> {
  await page.evaluate(
    (count) =>
      new Promise<void>((done) => {
        let k = 0;
        const step = (): void => {
          k++;
          if (k >= count) done();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
    n,
  );
}

export async function house(page: Page): Promise<DebugHouse> {
  const h = await page.evaluate(() => window.__ghostDebug?.house?.());
  if (!h) throw new Error('no house hook');
  return h;
}

export function model(h: DebugHouse): HouseModel {
  return parseHouse({ ...h, solution: h.solution ?? [] });
}

export function emptyCells(h: DebugHouse): number[] {
  const m = model(h);
  return [...Array(m.size).keys()].filter((c) => !m.blocked[c]);
}

/** Taps every cell of the solution that is not a given: the last tap wins the house. */
export async function solve(page: Page): Promise<number> {
  const h = await house(page);
  for (const c of h.solution ?? []) if (!h.givens.includes(c)) await tap(page, c);
  return h.id;
}

/** The house in progress as the save holds it (the dev build stores in localStorage). */
export async function stored(page: Page): Promise<{ seconds: number; moves: number } | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    const save = raw
      ? (JSON.parse(raw) as { current: { seconds: number; moves: number } | null })
      : null;
    return save?.current ?? null;
  }, SAVE_KEY);
}

/** Every event list played on the strict model screen (D52): no problem, and where it ends. */
export function replayed(h: DebugHouse, record: DebugRecord): ViewState {
  const screen = new Screen(model(h), record.start);
  for (const m of record.moves) screen.play(m.events, m.kind);
  expect(screen.problems).toEqual([]);
  return screen.view();
}

/** Waits for every motion to end, then checks the screen against the rules and the model. */
export async function settledEqualsRules(page: Page): Promise<ViewState> {
  await waitState(page, (s) => s.phase === 'play' && s.idle === true, 'the screen at rest');
  const got = await page.evaluate(() => ({
    drawn: window.__ghostDebug?.drawn?.(),
    rules: window.__ghostDebug?.rules?.(),
    events: window.__ghostDebug?.events?.(),
  }));
  const drawn = got.drawn as DrawnState;
  const rules = got.rules as ViewState;
  const h = await house(page);
  expect(replayed(h, got.events as DebugRecord)).toEqual(rules);
  const { residents, dots, content, ticks, ...shown } = drawn;
  expect(shown).toEqual(rules);
  // one progress dot per room, filled exactly for the settled rooms, each with its tick (D75, D84)
  expect(dots).toEqual(rules.settled);
  expect(ticks).toEqual(rules.settled);
  expect(residents).toEqual(h.givens.filter((g) => rules.ghosts.some(([c]) => c === g)));
  // the calm ghosts of settled rooms wear the content face, and no other (D84)
  const m = model(h);
  const settled = new Set(rules.settled);
  const happy = rules.ghosts.filter(([c, st]) => st === 'calm' && settled.has(m.roomOf[c] ?? -1));
  expect(content).toEqual(happy.map(([c]) => c));
  return rules;
}

/** The house finished last, replayed on the model screen: it ends solved, as the rules did. */
export async function finishedReplays(page: Page, id: number): Promise<void> {
  const prev = await page.evaluate(() => window.__ghostDebug?.previous?.() ?? null);
  if (!prev) throw new Error('no finished house');
  expect(prev.house.id).toBe(id);
  expect(prev.rules.solved).toBe(true);
  expect(replayed(prev.house, prev.events)).toEqual(prev.rules);
}
