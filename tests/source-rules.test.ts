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

/**
 * Files that hold the published constants of an algorithm, not tuning numbers: the PRNG's
 * multipliers and shifts (mulberry32, the string hash) and the civil-calendar arithmetic.
 */
const ALGORITHM_CONSTANTS = ['src/gen/rng.ts', 'src/gen/dates.ts'];
/** The constants files themselves. */
const CONSTANTS_FILES = ['src/config.ts', 'src/gen/params.ts'];

/** Gameplay, rules and content code: every tuning number comes from config.ts, feel.ts or params.ts. */
const NO_MAGIC = [
  'src/main.ts',
  ...tsFiles('src/core'),
  ...tsFiles('src/game'),
  ...tsFiles('src/gen').filter((f) => ![...ALGORITHM_CONSTANTS, ...CONSTANTS_FILES].includes(f)),
];

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

describe('the Game scene changes the save only through the progress guards (D50)', () => {
  it('no direct write of progress.house or progress.current, no persistProgress call', () => {
    // (Boot's dev-only ?house=N sets the house before any house is open, D38)
    const game = code('src/game/scenes/GameScene.ts');
    expect(game).not.toMatch(/progress\.(?:house|current|housesSolved)\s*=(?!=)/);
    expect(game).not.toMatch(/\bpersistProgress\(/);
    expect(game).toMatch(/\brecordHouseInProgress\(/);
    expect(game).toMatch(/\badvanceHouse\(/);
  });
});

describe('the board draws only with the palette tests/contrast.test.ts holds to its floors (D71)', () => {
  /** What the floors F1–F7 cover: floors, wallpaper, walls, the light hatch, the settled cue, ink. */
  const TESTED = [
    'COLOR_FLOORS',
    'COLOR_FLOOR_INKS',
    'COLOR_WALL',
    'COLOR_HATCH',
    'COLOR_HATCH_EDGE',
    'COLOR_SETTLED_RING',
    'COLOR_SEEN_LINE',
    'COLOR_GLANCE',
    'COLOR_MARK',
    'COLOR_FURNITURE_EDGE',
    'COLOR_LAMP_EDGE',
  ];
  const colours = (path: string): string[] => [
    ...new Set(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').match(/\bCOLOR_\w+/g)),
  ];

  it('no colour is written as a literal anywhere in src/game', () => {
    const literal = tsFiles('src/game').filter((f) => /0x[0-9a-f]{3,8}\b/i.test(code(f)));
    expect(literal).toEqual([]);
  });

  it('board.ts draws the floors, walls, hatch, settled cue, marks and lines with the tested colours', () => {
    const used = colours('src/game/board.ts');
    // feedback, not a state: the solved frame and the win's room flashes over a finished house,
    // the white veil of a settle; the solve time stands on the dark page below the board
    const feedback = ['COLOR_SOLVED_FRAME', 'COLOR_SETTLE_VEIL', 'COLOR_WIN_DIGITS'];
    expect(used.filter((c) => !TESTED.includes(c) && !feedback.includes(c))).toEqual([]);
    for (const c of TESTED.slice(0, 9)) expect(used).toContain(c);
  });

  it('the progress dots, the demonstrations and the hint reason draw on the floors with tested colours', () => {
    // dots: swatches of the floors and their wallpaper, the settled ring; their rim stands on
    // the dark page, not on a floor
    expect(colours('src/game/dots.ts').filter((c) => !TESTED.includes(c))).toEqual([
      'COLOR_DOT_RIM',
    ]);
    // demonstrations: the glance's dotted trails and the lamp's light
    expect(colours('src/game/demo-play.ts').filter((c) => !TESTED.includes(c))).toEqual([]);
    // the reason: a wrong ghost's outline in the marks' ink, the hint's dots (F6), its digit badges
    // (tested in contrast.test.ts, D98); its bands, wash and pulse only lighten a floor until the
    // next move
    const badges = ['COLOR_HINT_DOT', 'COLOR_BADGE', 'COLOR_BADGE_DIGITS', 'COLOR_DOT_RIM'];
    expect(
      colours('src/game/reason.ts')
        .filter((c) => !TESTED.includes(c) && !badges.includes(c))
        .sort(),
    ).toEqual(['COLOR_HINT_BAND', 'COLOR_HINT_PULSE']);
    expect(colours('src/game/reason.ts')).toContain('COLOR_MARK');
    expect(colours('src/game/reason.ts')).toContain('COLOR_HINT_DOT');
  });

  it('graybox.ts outlines the bookshelf and the lamp, and draws marks, with the tested colours', () => {
    const used = colours('src/game/graybox.ts');
    for (const c of ['COLOR_MARK', 'COLOR_FURNITURE_EDGE', 'COLOR_LAMP_EDGE', 'COLOR_HATCH']) {
      expect(used).toContain(c);
    }
    // the rest belongs to the ghosts, the nightcap and the books (never drawn on a floor), to
    // the finale's warm tick and ring of light (feedback over a finished house), and to the
    // hint's digit badge, its disc and rim (tested in contrast.test.ts, D98)
    expect(
      used.filter(
        (c) =>
          !TESTED.includes(c) &&
          !/^COLOR_(GHOST|CAP|SHELF|BOOKS)/.test(c) &&
          c !== 'COLOR_SOLVED_FRAME' &&
          c !== 'COLOR_BADGE' &&
          c !== 'COLOR_DOT_RIM',
      ),
    ).toEqual([]);
  });
});

describe('the e2e retries nothing and fails on a flaky test (the round-1 code audit, ORTA 5)', () => {
  const config = code('playwright.config.ts');
  const specs = readdirSync(new URL('../tests/e2e', import.meta.url))
    .filter((f) => f.endsWith('.ts'))
    .map((f) => code(`tests/e2e/${f}`));

  it('no retries anywhere, no per-test or per-describe retries in any spec', () => {
    expect(config).toMatch(/\bretries: 0,/);
    expect(config.match(/\bretries:/g)).toHaveLength(1);
    expect(config).toMatch(/\bfailOnFlakyTests: true,/);
    for (const s of specs) expect(s).not.toMatch(/\bretries\b/);
  });

  it('the wall-clock tests run alone, one at a time, after all the others', () => {
    expect(config).toMatch(/testIgnore: \/timing\\\.spec\\\.ts\$\//);
    expect(config).toMatch(/testMatch: \/timing\\\.spec\\\.ts\$\//);
    expect(config).toMatch(/dependencies: \[''\]/);
    expect(config).toMatch(/workers: 1,\s*\}/);
  });
});
