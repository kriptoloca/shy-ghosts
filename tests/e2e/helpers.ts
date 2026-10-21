import { expect, test as base, type APIRequestContext, type Page } from '@playwright/test';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GhostDebugState, NeutralState } from '../../src/dev/debug';

/** Published path of the development-mode build (dev shortcuts, debug hooks). */
export const TEST = 'test/';
/**
 * Flows that wait on Phaser timers run on the Canvas renderer: CI machines have no GPU and
 * SwiftShader WebGL drops to a few fps, where Phaser caps the delta per frame and its clock falls
 * behind the wall clock (lesson from Peek & Find).
 */
export const CANVAS = '&renderer=canvas';

export interface Collected {
  errors: string[];
  origins: Set<string>;
}

/** Records page errors, console errors/warnings and every request's origin. */
export function collect(page: Page): Collected {
  const c: Collected = { errors: [], origins: new Set() };
  page.on('pageerror', (e) => c.errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      c.errors.push(`${m.type()}: ${m.text().slice(0, 200)}`);
    }
  });
  page.on('request', (r) => {
    c.origins.add(new URL(r.url()).origin);
  });
  page.on('websocket', (ws) => c.errors.push(`websocket: ${ws.url()}`));
  page.on('requestfailed', (r) => {
    // a navigation cancels the previous page's requests; that is not a failed asset
    if (r.failure()?.errorText === 'net::ERR_ABORTED') return;
    c.errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText ?? ''}`);
  });
  return c;
}

/**
 * Chrome's report when a page cancels a `touchcancel`, which is never cancelable: Phaser 3.90's
 * TouchManager calls preventDefault on every touchcancel the canvas gets
 * (node_modules/phaser/src/input/touch/TouchManager.js, onTouchCancel). Only the tests that make
 * the system cancel a touch allow it (`test.use({ quietConsole: [TOUCHCANCEL_REPORT] })`).
 */
export const TOUCHCANCEL_REPORT = /^error: Ignored attempt to cancel a touchcancel event/;

/**
 * Chrome's report when a page asks for WebGL with no GPU flags and gets software WebGL anyway:
 * Phaser probes WebGL as it boots, on the Canvas renderer too. Only the timing tests, which run
 * without the GPU flags (playwright.config.ts), allow it.
 */
export const SOFTWARE_WEBGL_REPORT =
  /^warning: .*Automatic fallback to software WebGL has been deprecated/;

/**
 * Every test gets the collector and ends with the same-origin (CLAUDE.md rule 1) and no-error
 * checks, so a stray request or console error fails whichever test caused it; `quietConsole`
 * names the few browser reports a test expects.
 */
export const test = base.extend<{ guard: Collected; quietConsole: RegExp[] }>({
  quietConsole: [[], { option: true }],
  guard: [
    async ({ page, baseURL, quietConsole }, use) => {
      const c = collect(page);
      await use(c);
      const origin = new URL(baseURL ?? 'http://127.0.0.1:4173/').origin;
      expect([...c.origins].filter((o) => o !== origin)).toEqual([]);
      expect(c.errors.filter((e) => !quietConsole.some((q) => q.test(e)))).toEqual([]);
    },
    { auto: true },
  ],
});

export function state(page: Page): Promise<GhostDebugState | undefined> {
  return page.evaluate(() => window.__ghostDebug?.state() as GhostDebugState | undefined);
}

/** The state under `?playtest=1`: neutral fields only (D87). */
export function neutralState(page: Page): Promise<NeutralState | undefined> {
  return page.evaluate(() => window.__ghostDebug?.state() as NeutralState | undefined);
}

/** Polls the neutral state of `?playtest=1` until `pred` holds. */
export async function waitNeutral(
  page: Page,
  pred: (s: NeutralState) => boolean,
  label: string,
  timeout = 40_000,
): Promise<NeutralState> {
  const t0 = Date.now();
  for (;;) {
    const s = await neutralState(page);
    if (s && pred(s)) return s;
    if (Date.now() - t0 > timeout) {
      throw new Error(`timeout waiting for ${label}: ${JSON.stringify(s)}`);
    }
    await page.waitForTimeout(100);
  }
}

/** Polls the dev state until `pred` holds (Phaser's clock lags headless, so poll, never sleep). */
export async function waitState(
  page: Page,
  pred: (s: GhostDebugState) => boolean,
  label: string,
  timeout = 40_000,
): Promise<GhostDebugState> {
  const t0 = Date.now();
  for (;;) {
    const s = await state(page);
    if (s && pred(s)) return s;
    if (Date.now() - t0 > timeout) {
      throw new Error(`timeout waiting for ${label}: ${JSON.stringify(s)}`);
    }
    await page.waitForTimeout(100);
  }
}

/** Plays a platform pause (true) or resume (false) through the dev hook. */
export async function platformPause(page: Page, paused: boolean): Promise<void> {
  await page.evaluate((p) => {
    window.__ghostDebug?.pause?.(p);
  }, paused);
}

/**
 * Strings only dev code holds (CLAUDE.md: dev hooks and dev URL parameters live only inside
 * `import.meta.env.DEV`). None may appear in a file the production build ships; the only dynamic
 * import is the dev hooks' (a production one would need a review of this list). `relocations`
 * and `shivers` are keys of the per-house tally (src/dev/house-log.ts) and `residents` one of
 * `drawn()`'s read-back (src/game/board.ts): production keeps no move log and no tally and never
 * reads the screen back (audit 2026-10-21, DÜŞÜK 8).
 */
export const DEV_ONLY = [
  '__ghostDebug',
  'game-debug',
  'simulatePause',
  'fpsmin',
  'playtest',
  'fakeads',
  'fake-ad',
  'URLSearchParams',
  'location.search',
  'import(',
  'relocations',
  'shivers',
  'residents',
  // the Game scene's dev state (round 1's code audit, DÜŞÜK 9): kept in DEV builds only
  'lastFinale',
  'slidAt',
  'stepAt',
  'slideStepMs',
  'settlingAtHop',
  'demos',
  'shownAt',
  'playAt',
  'demoSkipped',
  'builds',
];

/** Text files the build ships; the third-party Bridge runtime is audited separately. */
const TEXT = /\.(?:js|mjs|css|html|json|svg|txt)$/;
const THIRD_PARTY = new Set(['playgama-bridge.js']);
/** A file a shipped file names: `./x.js`, `assets/x.js`, `./assets/x.css` … */
const NAMED = /(?:\.\/|\bassets\/)[\w./-]+\.(?:js|mjs|css|json)\b/g;

/**
 * Every text file of the production build as [path, text], the /test/ dev build left out. Local
 * runs read dist/ from disk, so every file counts, named or not; live runs (E2E_BASE_URL, no dist/
 * on disk) crawl from index.html through every file a shipped file names.
 */
export async function shippedFiles(request: APIRequestContext): Promise<[string, string][]> {
  const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
  if (!process.env.E2E_BASE_URL && existsSync(dist)) {
    const out: [string, string][] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const abs = join(dir, name);
        const rel = relative(dist, abs).split('\\').join('/');
        if (rel === 'test') continue;
        if (statSync(abs).isDirectory()) walk(abs);
        else if (TEXT.test(name) && !THIRD_PARTY.has(name))
          out.push([rel, readFileSync(abs, 'utf8')]);
      }
    };
    walk(dist);
    return out;
  }
  const out = new Map<string, string>();
  const queue = ['index.html'];
  while (queue.length > 0) {
    const path = queue.shift() as string;
    if (out.has(path) || THIRD_PARTY.has(path.split('/').at(-1) ?? '')) continue;
    const text = await (await request.get(`./${path}`)).text();
    out.set(path, text);
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '';
    for (const m of text.matchAll(NAMED)) {
      const ref = m[0];
      queue.push(ref.startsWith('./') ? `${dir}${ref.slice(2)}` : ref);
    }
  }
  return [...out.entries()];
}

declare global {
  interface Window {
    /** Platform messages the Bridge SDK reported as sent (`recordSdkMessages`). */
    __sdkMessages?: string[];
  }
}

/**
 * Records every platform message the Bridge SDK reports as sent (its public
 * `platform_message_sent` event, docs/bridge-notes.md), from the moment the SDK script creates
 * `window.bridge`: how a production page, which has no dev hooks, tells when GameReady went out.
 */
export async function recordSdkMessages(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const sent: string[] = [];
    window.__sdkMessages = sent;
    let held: unknown;
    Object.defineProperty(window, 'bridge', {
      configurable: true,
      get: () => held,
      set: (v: unknown) => {
        held = v;
        const emitter = v as { on?: (event: string, cb: (message: unknown) => void) => void };
        emitter.on?.('platform_message_sent', (message) => sent.push(String(message)));
      },
    });
  });
}
