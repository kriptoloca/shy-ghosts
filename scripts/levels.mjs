#!/usr/bin/env node
// Builds the house list and the dailies (GENERATOR.md §6–§8, D57). `npm run levels` writes four
// files in src/data: levels.json and dailies.json (what the game plays) and levels-meta.json and
// dailies-meta.json (grades, exact win rates, roles, seeds: for the tests and this report).
// `npm run levels:check` rebuilds them in memory and fails on any byte difference (CI), so every
// file is reproducible from the code. `--smoke` builds houses 1–5 and one daily and writes
// nothing (a quick check of the pipeline). Every run fails above the 10-minute budget of Gate A's
// A8; `--budget=SECONDS` can only lower it. The pipeline is TypeScript under src/gen, loaded
// through Vite's SSR module loader rooted at the repository (scripts/lib/levels.mjs).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEVELS_BUDGET_SECONDS, ROOT, budgetError, withPipeline } from './lib/levels.mjs';

/** The smoke run's size: houses 1–5 (house 4 is a lowest-of-50 house) and one daily. */
const SMOKE = { upTo: 5, dailies: 1 };

const args = process.argv.slice(2);
const check = args.includes('--check');
const smoke = args.includes('--smoke');
const asked = Number(args.find((a) => a.startsWith('--budget='))?.slice('--budget='.length));
const budget = Number.isFinite(asked)
  ? Math.min(LEVELS_BUDGET_SECONDS, asked)
  : LEVELS_BUDGET_SECONDS;

await withPipeline(async (load) => {
  const t0 = Date.now();
  const gen = await load('/src/gen/build-levels.ts');
  const params = await load('/src/gen/params.ts');
  const dates = await load('/src/gen/dates.ts');
  const log = (line) => console.log(`  … ${line}`);
  const built = gen.buildLevels(smoke ? { ...SMOKE, log } : { log });
  const files = Object.entries(gen.levelFiles(built)).map(([name, text]) => [
    join(ROOT, 'src', 'data', name),
    text,
  ]);
  const secs = (Date.now() - t0) / 1000;
  const counts = `${String(built.levels.length)} houses and ${String(Object.keys(built.dailies).length)} dailies`;
  if (smoke) {
    console.log(`levels: smoke OK (${counts} in ${secs.toFixed(1)} s, nothing written)`);
  } else if (check) {
    for (const [path, text] of files) {
      let current = '';
      try {
        current = readFileSync(path, 'utf8');
      } catch {
        // missing file: reported below
      }
      if (current !== text) {
        console.error(`levels: ${path} differs from a fresh build; run \`npm run levels\``);
        process.exitCode = 1;
      }
    }
    if (!process.exitCode) console.log(`levels: OK (${counts} reproduced in ${secs.toFixed(1)} s)`);
  } else {
    for (const [path, text] of files) writeFileSync(path, text);
    console.log(`levels: wrote ${counts} in ${secs.toFixed(1)} s`);
    for (const line of gen.report(built)) console.log(`  ${line}`);
  }
  const over = budgetError(secs, budget);
  if (over) {
    console.error(over);
    process.exitCode = 1;
  }
  // D29: warn in CI from 60 days before the daily range runs out
  const today = new Date().toISOString().slice(0, 10);
  if (dates.daysBetween(today, params.DAILY_LAST) <= params.DAILY_WARN_DAYS) {
    console.log(
      `::warning::the daily houses run out on ${params.DAILY_LAST}: extend DAILY_LAST in src/gen/params.ts and rebuild`,
    );
  }
});
