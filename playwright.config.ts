import { defineConfig } from '@playwright/test';

/**
 * End-to-end checks from the player's side (tests/e2e). Targets:
 *  - default: the local production build served by `vite preview` (run `npm run build:test`
 *    first; `npm run e2e` does both). dist/test/ holds the development-mode build with the dev
 *    shortcuts, exactly like the published /test/ page;
 *  - E2E_BASE_URL=https://kriptoloca.github.io/shy-ghosts/ : the live GitHub Pages site.
 * Chromium runs with SwiftShader so WebGL works headless, and autoplay is allowed so the audio
 * graph can be measured (Epic 4). No test is retried, and a flaky one fails the run (round 1's
 * code audit, ORTA 5): what is measured on the wall clock (tests/e2e/timing.spec.ts) runs in a
 * project of its own, one test at a time, after every other test has finished, so no other
 * worker shares the CPU while it measures. That project plays on the Canvas renderer and runs
 * without the GPU flags: under SwiftShader a frame took 54–137 ms, plain headless 14–23 ms, and a
 * beat can end only on a frame (round 2's code audit, KRİTİK 1).
 */
const live = process.env.E2E_BASE_URL;
const AUTOPLAY = '--autoplay-policy=no-user-gesture-required';
const baseURL = live ?? 'http://127.0.0.1:4173/';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  retries: 0,
  failOnFlakyTests: true,
  workers: process.env.CI ? 1 : 2,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL,
    headless: true,
    viewport: { width: 390, height: 844 },
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', AUTOPLAY],
    },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' }, testIgnore: /timing\.spec\.ts$/ },
    {
      name: 'timing',
      use: { browserName: 'chromium', launchOptions: { args: [AUTOPLAY] } },
      testMatch: /timing\.spec\.ts$/,
      dependencies: ['chromium'],
      workers: 1,
    },
  ],
  webServer: live
    ? undefined
    : {
        command: 'npx vite preview --port 4173 --strictPort',
        url: 'http://127.0.0.1:4173/',
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
