import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * The submission ZIP is byte-identical for the same dist/ wherever it is made (scripts/lib/zip.mjs):
 * its SHA-256 identifies a build, so a ZIP made on a laptop in Türkiye must match CI's (audit
 * 2026-10-21: the fixed timestamp was a UTC moment, which the ZIP stores as local time).
 */
const LIB = pathToFileURL(fileURLToPath(new URL('../scripts/lib/zip.mjs', import.meta.url))).href;
const root = mkdtempSync(join(tmpdir(), 'sg-zip-'));
mkdirSync(join(root, 'assets'));
mkdirSync(join(root, 'test'));
writeFileSync(join(root, 'index.html'), '<!doctype html><title>t</title>');
writeFileSync(join(root, 'assets', 'index.js'), 'console.log(1);');
writeFileSync(join(root, 'test', 'dev.js'), 'console.log(2);');

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

/** The ZIP's SHA-256 and entries, made by a fresh Node process in time zone `tz`. */
function zipIn(tz: string): { sha256: string; entries: string[] } {
  const code =
    `const z = await import(${JSON.stringify(LIB)});` +
    'const r = z.buildZip(process.argv[1]);' +
    'process.stdout.write(JSON.stringify({ sha256: r.sha256, entries: z.verifyZip(r.zip).entries }));';
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', code, root], {
    env: { ...process.env, TZ: tz },
    encoding: 'utf8',
  });
  return JSON.parse(out) as { sha256: string; entries: string[] };
}

describe('the submission ZIP', () => {
  it('has the same bytes in every time zone', () => {
    const utc = zipIn('UTC');
    expect(zipIn('Europe/Istanbul').sha256).toBe(utc.sha256);
    expect(zipIn('America/Los_Angeles').sha256).toBe(utc.sha256);
  });

  it('holds index.html at the root and leaves the /test/ dev build out', () => {
    expect(zipIn('UTC').entries).toEqual(['assets/index.js', 'index.html']);
  });
});
