import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build, type Rollup } from 'vite';
import { describe, expect, it } from 'vitest';
import { rotate } from '../src/core/house';
import { dailyHouse, playHouse } from '../src/data/houses';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import type { PlayHouse } from '../src/gen/record';

/**
 * What the game reads of the houses (D57; audit 2026-10-21, DÜŞÜK 5): play-only files, the
 * dailies loaded lazily, the build metadata never shipped.
 */
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DATA = (name: string): string =>
  fileURLToPath(new URL(`../src/data/${name}`, import.meta.url));
const LEVELS = JSON.parse(readFileSync(DATA('levels.json'), 'utf8')) as PlayHouse[];
const DAILIES = JSON.parse(readFileSync(DATA('dailies.json'), 'utf8')) as Record<string, PlayHouse>;
const PLAY_FIELDS = ['givens', 'id', 'n', 'objects', 'rooms', 'solution'];

/**
 * levels.json ships in the first download: 1.46 MB today plus this budget stays well inside the
 * < 2 MB CLAUDE.md expects, with room for Epics 3–4. The dailies load later, on the same budget.
 */
const PLAY_LEVELS_MAX_BYTES = 256 * 1024;
const PLAY_DAILIES_MAX_BYTES = 256 * 1024;

function tsFiles(dir: string): string[] {
  return readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true }).flatMap((d) =>
    d.isDirectory()
      ? tsFiles(`${dir}/${d.name}`)
      : d.name.endsWith('.ts')
        ? [`${dir}/${d.name}`]
        : [],
  );
}

describe('the play files (D57)', () => {
  it('hold only what play needs: no grade, win rates, role or seed', () => {
    for (const h of [...LEVELS, ...Object.values(DAILIES)]) {
      expect(Object.keys(h).sort()).toEqual(PLAY_FIELDS);
    }
    expect(LEVELS).toHaveLength(1000);
    expect(Object.keys(DAILIES)).toHaveLength(792);
  });

  it('stay within their size budgets', () => {
    expect(statSync(DATA('levels.json')).size).toBeLessThanOrEqual(PLAY_LEVELS_MAX_BYTES);
    expect(statSync(DATA('dailies.json')).size).toBeLessThanOrEqual(PLAY_DAILIES_MAX_BYTES);
  });

  it('no source file imports the build metadata (the *-meta.json files are for tests)', () => {
    const IMPORT_META = /(?:\bfrom\s*|\bimport\s*\(\s*)['"][^'"]*-meta\.json['"]/;
    const importers = tsFiles('src').filter((f) =>
      IMPORT_META.test(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')),
    );
    expect(importers).toEqual([]);
    // the pattern finds both kinds of import
    expect(IMPORT_META.test("import meta from './levels-meta.json';")).toBe(true);
    expect(IMPORT_META.test("await import('./dailies-meta.json')")).toBe(true);
  });
});

describe('playHouse and dailyHouse (src/data/houses.ts)', () => {
  it('house 1 is the first tutorial house; after 1000 the list turns (D56)', () => {
    expect(playHouse(1)).toEqual({ id: 1, ...TUTORIAL_HOUSES[0] });
    const base = playHouse(506);
    const turned = rotate(base, 1);
    expect(playHouse(1001)).toEqual({
      ...base,
      ...turned,
      givens: [...turned.givens],
      solution: [...turned.solution],
      id: 1001,
    });
    expect(playHouse(2486)).toEqual({ ...base, id: 2486 });
  });

  it('dailyHouse reads the daily of a UTC date, and null outside the range', async () => {
    expect(await dailyHouse('2026-11-01')).toEqual(DAILIES['2026-11-01']);
    expect((await dailyHouse('2028-12-31'))?.id).toBe(792);
    expect(await dailyHouse('2026-10-31')).toBeNull();
    expect(await dailyHouse('2029-01-01')).toBeNull();
  });

  it('the dailies build into a chunk of their own, imported lazily by a relative path', async () => {
    const out = await build({
      root: ROOT,
      configFile: false,
      base: './',
      logLevel: 'silent',
      build: {
        write: false,
        minify: false,
        lib: { entry: 'src/data/houses.ts', formats: ['es'], fileName: 'houses' },
      },
    });
    const bundle = (Array.isArray(out) ? out[0] : out) as Rollup.RollupOutput;
    const chunks = bundle.output.filter((o): o is Rollup.OutputChunk => o.type === 'chunk');
    const entry = chunks.find((c) => c.isEntry) as Rollup.OutputChunk;
    const lazy = chunks.filter((c) => !c.isEntry);
    expect(lazy).toHaveLength(1);
    const daily = lazy[0] as Rollup.OutputChunk;
    // a daily's rooms are in the lazy chunk, not in the entry; the houses are in the entry
    const first = DAILIES['2026-11-01'] as PlayHouse;
    expect(daily.code).toContain(first.rooms);
    expect(entry.code).not.toContain(first.rooms);
    expect(entry.code).toContain((LEVELS[999] as PlayHouse).rooms);
    expect(entry.dynamicImports).toEqual([daily.fileName]);
    expect(entry.code).toMatch(new RegExp(`import\\(\\s*['"]\\./${daily.fileName}['"]\\s*\\)`));
  }, 60_000);
});
