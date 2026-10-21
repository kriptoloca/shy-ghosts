import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * The post-build scripts (CLAUDE.md rules 1 and 2), run as they are on a copy of the project in a
 * folder whose path has a space and a "ü" (audit 2026-10-21: they read `URL.pathname`, which keeps
 * the percent-encoding, and they let protocol-relative links through).
 */
const SCRIPTS = fileURLToPath(new URL('../scripts/', import.meta.url));
const base = mkdtempSync(join(tmpdir(), 'sg-scripts-'));
const root = join(base, 'Shy Ghosts ü');
mkdirSync(join(root, 'scripts'), { recursive: true });
for (const f of ['audit-dist.mjs', 'size.mjs'])
  copyFileSync(join(SCRIPTS, f), join(root, 'scripts', f));

afterAll(() => {
  rmSync(base, { recursive: true, force: true });
});

/** Writes dist/ with these files (path → text), runs the script: its exit status and output. */
function runOut(script: string, files: Record<string, string>): { status: number; out: string } {
  rmSync(join(root, 'dist'), { recursive: true, force: true });
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, 'dist', path, '..'), { recursive: true });
    writeFileSync(join(root, 'dist', path), text);
  }
  try {
    const out = execFileSync(process.execPath, [join(root, 'scripts', script)], {
      stdio: 'pipe',
      encoding: 'utf8',
    });
    return { status: 0, out };
  } catch (e: unknown) {
    const x = e as { status?: number; stdout?: string; stderr?: string };
    return { status: x.status ?? 1, out: `${x.stdout ?? ''}${x.stderr ?? ''}` };
  }
}

/** Writes dist/ with these files (path → text), runs the script, returns its exit status. */
function run(script: string, files: Record<string, string>): number {
  return runOut(script, files).status;
}

const clean = {
  'index.html': '<!doctype html><script type="module" src="./assets/index.js"></script>',
  'assets/index.js': 'const a = "http://www.w3.org/2000/svg"; const b = 1; // a comment',
};

describe('audit-dist and size', () => {
  it('run from a path with a space and a non-ASCII letter', () => {
    expect(run('audit-dist.mjs', clean)).toBe(0);
    expect(run('size.mjs', clean)).toBe(0);
  });

  it('the audit fails on a protocol-relative link, as on any external URL', () => {
    expect(
      run('audit-dist.mjs', { ...clean, 'index.html': '<script src="//cdn.example.com/x.js">' }),
    ).not.toBe(0);
    expect(
      run('audit-dist.mjs', {
        ...clean,
        'assets/style.css': 'body{background:url(//img.example.org/a.png)}',
      }),
    ).not.toBe(0);
    expect(
      run('audit-dist.mjs', { ...clean, 'assets/x.js': 'fetch("https://api.example.com")' }),
    ).not.toBe(0);
  });

  it('the audit fails on a compressed file', () => {
    expect(run('audit-dist.mjs', { ...clean, 'assets/index.js.gz': 'x' })).not.toBe(0);
  });

  it('size reports the first download and the lazy chunks apart (audit 2026-10-21, DÜŞÜK 2)', () => {
    // 100 KiB per file; the entry imports a vendor chunk statically and the dailies lazily, and
    // the dailies chunk imports one of its own: two files load on first use, five at the start
    const pad = (head: string): string => head + ' '.repeat(100 * 1024 - head.length);
    const r = runOut('size.mjs', {
      'index.html': pad(
        '<script src="./playgama-bridge.js"></script>' +
          '<script type="module" crossorigin src="./assets/index-a1.js"></script>',
      ),
      'assets/index-a1.js': pad(
        'import{v as a}from"./vendor-b2.js";const d=()=>__vitePreload(()=>import("./dailies-c3.js"),[]);',
      ),
      'assets/vendor-b2.js': pad('export const v=1;'),
      'assets/dailies-c3.js': pad('import"./daily-part-d4.js";export default{};'),
      'assets/daily-part-d4.js': pad('export const p=2;'),
      'playgama-bridge.js': pad('window.bridge={};'),
      'playgama-bridge-config.json': pad('{}'),
    });
    expect(r.status).toBe(0);
    expect(r.out).toMatch(/initial download: 0\.49 MB in 5 files/);
    expect(r.out).toMatch(/lazy, on first use: 0\.20 MB in 2 files/);
    expect(r.out).toMatch(/assets\/dailies-c3\.js \(lazy\)/);
    expect(r.out).toMatch(/assets\/daily-part-d4\.js \(lazy\)/);
    expect(r.out).not.toMatch(/assets\/vendor-b2\.js \(lazy\)/);
  });
});

/** Runs scripts/levels.mjs from a directory outside the repository; its status and output. */
function runLevels(args: string[]): { status: number; out: string } {
  try {
    const out = execFileSync(process.execPath, [join(SCRIPTS, 'levels.mjs'), ...args], {
      cwd: base,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    return { status: 0, out };
  } catch (e: unknown) {
    const x = e as { status?: number; stdout?: string; stderr?: string };
    return { status: x.status ?? 1, out: `${x.stdout ?? ''}${x.stderr ?? ''}` };
  }
}

interface LevelsLib {
  LEVELS_BUDGET_SECONDS: number;
  budgetError: (seconds: number, budget?: number) => string | null;
}

describe('levels.mjs (GENERATOR.md §8; audit 2026-10-21, DÜŞÜK 6 and YÜKSEK 2)', () => {
  it('runs from another directory: the pipeline loads from the repository root', () => {
    const r = runLevels(['--smoke']);
    expect(r.out).toContain('levels: smoke OK');
    expect(r.status).toBe(0);
  }, 120_000);

  it('fails above its time budget (A8: 10 minutes; --budget can only lower it)', async () => {
    const r = runLevels(['--smoke', '--budget=0']);
    expect(r.status).not.toBe(0);
    expect(r.out).toMatch(/over the 0 s budget/);
    const lib = (await import(pathToFileURL(join(SCRIPTS, 'lib', 'levels.mjs')).href)) as LevelsLib;
    expect(lib.LEVELS_BUDGET_SECONDS).toBe(600);
    expect(lib.budgetError(600)).toBeNull();
    expect(lib.budgetError(600.1)).toMatch(/over the 600 s budget/);
  }, 120_000);

  it('CI stops levels:check after 10 minutes', () => {
    const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
    expect(ci).toMatch(/- run: npm run levels:check\n\s+timeout-minutes: 10\n/);
  });
});
