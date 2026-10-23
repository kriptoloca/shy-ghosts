// The content pipeline's host side (GENERATOR.md §8): load src/gen through Vite's SSR module
// loader, rooted at the repository so the script runs from any working directory (audit
// 2026-10-21, DÜŞÜK 6), and the time budget of Gate A's A8 (YÜKSEK 2).
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

/** The repository root: every module and data path resolves from here. */
export const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** GENERATOR.md §9, A8: `npm run levels` within 10 minutes on the CI runner. */
export const LEVELS_BUDGET_SECONDS = 600;

/** The error for a build that took `seconds` against `budget`, or null within it. */
export function budgetError(seconds, budget = LEVELS_BUDGET_SECONDS) {
  if (seconds <= budget) return null;
  return `levels: the build took ${seconds.toFixed(1)} s, over the ${String(budget)} s budget (GENERATOR.md §9, A8)`;
}

/** Runs `fn(load)`, where `load(path)` imports a repository module such as '/src/gen/params.ts'. */
export async function withPipeline(fn) {
  const server = await createServer({
    root: ROOT,
    configFile: false,
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
  });
  try {
    return await fn((path) => server.ssrLoadModule(path));
  } finally {
    await server.close();
  }
}

/**
 * The ladder's start table (D96) as src/gen/params.ts holds it: what `npm run levels:starts`
 * prints for pasting after a pipeline change.
 */
export function startsText(table) {
  const lines = Object.entries(table).map(([id, k]) => `  ${id}: ${String(k)},`);
  return `export const LADDER_STARTS: Readonly<Record<number, number>> = {\n${lines.join('\n')}\n};`;
}

/** The error when the starts found differ from params.ts's table, or null when they agree. */
export function startsError(found, table) {
  const ids = [...new Set([...Object.keys(found), ...Object.keys(table)])].sort((a, b) => a - b);
  const stale = ids.filter((id) => found[id] !== table[id]);
  if (stale.length === 0) return null;
  const why = stale
    .map(
      (id) =>
        `house ${id} starts at ${String(found[id] ?? 'none')}, not ${String(table[id] ?? 'none')}`,
    )
    .join('; ');
  return `levels:starts: LADDER_STARTS in src/gen/params.ts is stale: ${why}`;
}
