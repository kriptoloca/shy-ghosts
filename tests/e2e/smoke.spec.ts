import { expect } from '@playwright/test';
import {
  CANVAS,
  DEV_ONLY,
  TEST,
  platformPause,
  recordSdkMessages,
  shippedFiles,
  test,
  waitState,
} from './helpers';

/**
 * Epic 0: boot goes straight into the Game (no title screen), GameReady goes out once and only
 * after the loading phase began, the pause gates input, everything stays same-origin and the
 * console stays clean (the `guard` fixture in helpers.ts checks both after every test).
 */
test('boot → the Game stub is interactive → GameReady once, after loading started', async ({
  page,
}) => {
  await page.goto(`${TEST}?reset=1${CANVAS}`, { waitUntil: 'load' });
  const s = await waitState(
    page,
    (x) => x.scene === 'Game' && x.messages.includes('game_ready'),
    'game ready',
  );
  expect(s.house).toBe(1);
  expect(s.input).toBe(true);
  const msgs = s.messages;
  expect(msgs.filter((m) => m === 'game_ready')).toHaveLength(1);
  expect(msgs.filter((m) => m === 'in_game_loading_started')).toHaveLength(1);
  expect(msgs.filter((m) => m === 'in_game_loading_stopped')).toHaveLength(1);
  expect(msgs.indexOf('in_game_loading_started')).toBeLessThan(
    msgs.indexOf('in_game_loading_stopped'),
  );
  expect(msgs.indexOf('in_game_loading_stopped')).toBeLessThan(msgs.indexOf('game_ready'));
});

test('?house=N plays house N, and the save keeps it across a reload', async ({ page }) => {
  await page.goto(`${TEST}?reset=1&house=12${CANVAS}`, { waitUntil: 'load' });
  await waitState(page, (s) => s.scene === 'Game' && s.house === 12, 'house 12');
  await page.goto(`${TEST}?renderer=canvas`, { waitUntil: 'load' });
  const s = await waitState(page, (x) => x.scene === 'Game', 'game after reload');
  expect(s.house).toBe(12);
});

test('a platform pause turns input off; it returns after the resume grace', async ({ page }) => {
  await page.goto(`${TEST}?reset=1${CANVAS}`, { waitUntil: 'load' });
  await waitState(page, (s) => s.scene === 'Game' && s.input, 'game');
  await platformPause(page, true);
  const paused = await waitState(page, (s) => s.paused, 'paused');
  expect(paused.input).toBe(false);
  await platformPause(page, false);
  const resumed = await waitState(page, (s) => !s.paused, 'resumed');
  // the waking tap is never a game tap: input stays off for the grace (RESUME_TAP_GRACE_MS)
  expect(resumed.input).toBe(false);
  await waitState(page, (s) => s.input, 'input back after the grace');
});

test('the production build carries no debug hooks or dev code in any shipped file', async ({
  page,
  request,
}) => {
  await recordSdkMessages(page);
  await page.goto('./', { waitUntil: 'load' });
  // no hooks to ask in production: wait for the SDK's own record that GameReady went out, i.e.
  // the Game is interactive and would have installed its hooks by now
  await expect
    .poll(() => page.evaluate(() => window.__sdkMessages ?? []), { timeout: 30_000 })
    .toContain('game_ready');
  expect(await page.evaluate(() => typeof window.__ghostDebug)).toBe('undefined');
  // nor their code, nor the dev URL parameters, in any file the production build ships
  const files = await shippedFiles(request);
  expect(files.some(([path]) => path.startsWith('assets/'))).toBe(true);
  for (const [path, text] of files) {
    for (const dev of DEV_ONLY) expect(text, `${path} mentions ${dev}`).not.toContain(dev);
  }
});
