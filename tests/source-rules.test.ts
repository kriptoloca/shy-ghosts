import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Coding rules no behavior shows, read from the source (CLAUDE.md "Coding rules"; audit
 * 2026-10-21, DÜŞÜK 11). Comments and string literals are blanked first, so only code counts.
 */
function code(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1')
    .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, "''");
}

function tsFiles(dir: string): string[] {
  return readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true }).flatMap((d) =>
    d.isDirectory()
      ? tsFiles(`${dir}/${d.name}`)
      : d.name.endsWith('.ts')
        ? [`${dir}/${d.name}`]
        : [],
  );
}

/** Gameplay and rules code: every tuning number comes from src/config.ts (or feel.ts, params.ts). */
const NO_MAGIC = ['src/main.ts', ...tsFiles('src/core'), ...tsFiles('src/game')];

describe('constants live in config.ts, feel.ts and params.ts (CLAUDE.md "No magic numbers")', () => {
  it.each(NO_MAGIC)('%s uses no number beyond 0, 1, 2 and ½', (path) => {
    const numbers = code(path).match(/(?<![\w.])\d+(?:\.\d+)?(?![\w.])/g) ?? [];
    expect(numbers.filter((n) => !['0', '1', '2', '0.5'].includes(n))).toEqual([]);
  });
});

describe('every scene follows the design size (CLAUDE.md rule 5)', () => {
  it.each(tsFiles('src/game/scenes'))(
    '%s lays out again on RESIZE and lets go on SHUTDOWN',
    (path) => {
      const src = code(path);
      expect(src).toMatch(/this\.scale\.on\(Phaser\.Scale\.Events\.RESIZE,/);
      expect(src).toMatch(/this\.scale\.off\(Phaser\.Scale\.Events\.RESIZE,/);
      expect(src).toMatch(/Phaser\.Scenes\.Events\.SHUTDOWN/);
    },
  );
});
