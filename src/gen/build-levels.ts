import { geometry, parseHouse, rotate, type HouseData } from '../core/house';
import { TUTORIAL_HOUSES } from '../data/tutorial';
import { QUARTER_TURNS } from '../config';
import { dateRange } from './dates';
import { makeCandidate, type Candidate } from './generate';
import {
  TRIVIAL,
  grade,
  insightEpisodes,
  insightKinds,
  type Grade,
  type GradeOptions,
  type GradeResult,
  type Insight,
} from './grade';
import {
  CANDIDATE_LIMIT,
  CYCLE_MANOR,
  CYCLE_PERIOD,
  CYCLE_START,
  DAILY_BAND,
  DAILY_FIRST,
  DAILY_LAST,
  EARLY_GROUPS,
  LEVEL_COUNT,
  LOG_EVERY_DAILIES,
  LOG_EVERY_HOUSES,
  MIN_EPISODES,
  REPORT_QUANTILES,
  REPORT_RATE_DIGITS,
  T1,
  T2,
  T3,
  TECHS,
  TUTORIAL_COUNT,
  bandFor,
  cycleOf,
  type Band,
} from './params';
import { exactWinRate } from './players';
import { metaOf, playOf, type House } from './record';
import { objectsMatter } from './relevance';
import { hashSeed } from './rng';
import { puzzleOf, solve, type Puzzle } from './solve';

/** Why a candidate lost: a generator rejection, or the first window it missed (in check order). */
export type Miss =
  | 'segments'
  | 'solution'
  | 'rooms'
  | 'unique'
  | 'grade'
  | 'd'
  | 't3'
  | 'episodes'
  | 'manor'
  | 'teach'
  | 'turn'
  | 'insight'
  | 'idle'
  | 'naive';

/** How a house was found: the candidates tried and what the others missed. */
export interface Search {
  label: string;
  role: House['role'];
  tried: number;
  misses: Partial<Record<Miss, number>>;
  /** Candidates that met every window: 1, or up to `lowestOf` for houses 4, 9 and 17. */
  kept: number;
}

/** The generator's own rejections (steps 2–5), and the misses of a candidate outside the d window. */
const GENERATOR_MISSES: readonly Miss[] = ['segments', 'solution', 'rooms', 'unique'];
const WINDOW_MISSES: readonly Miss[] = ['grade', 'd'];

export interface Built {
  levels: House[];
  /** Keyed by UTC date, 2026-11-01 … 2028-12-31. */
  dailies: Record<string, House>;
  searches: Search[];
}

export interface BuildOptions {
  /** Build houses 1 … this one (default all 1000). */
  upTo?: number;
  /** Build this many dailies from 2026-11-01 (default all 792). */
  dailies?: number;
  /** Progress lines. */
  log?: (line: string) => void;
}

function sorted(cells: readonly number[]): number[] {
  return [...cells].sort((a, b) => a - b);
}

/**
 * A house's trick (D67): the kinds of insight it asks for, plus `block` when it has furniture
 * and `light` when it has a lamp. Depth does not count: two `line` stalls are one trick.
 */
export function trickOf(insights: readonly (readonly Insight[])[], objects: string): string[] {
  const trick: string[] = insightKinds(insights);
  if (objects.includes('F')) trick.push('block');
  if (objects.includes('L')) trick.push('light');
  return trick;
}

/** The house asks for what its band wants of its insights (D67). */
export function insightsFit(
  band: Band,
  insights: readonly (readonly Insight[])[],
  objects: string,
  prevTrick: readonly string[] | null,
): boolean {
  const kinds = insightKinds(insights);
  if (insightEpisodes(insights) < band.insightEpisodes) return false;
  if (kinds.length < band.insightKinds) return false;
  if (band.needInsight !== null && !kinds.includes(band.needInsight)) return false;
  if (band.shapeOnly && insights.flat().some((i) => i !== TRIVIAL)) return false;
  if (band.newTrick && prevTrick && trickOf(insights, objects).join() === prevTrick.join()) {
    return false;
  }
  return true;
}

/** Two solution ghosts share a row or a column with furniture between them (house 9, A5). */
export function furnitureBetween(n: number, objects: string, solution: readonly number[]): boolean {
  for (const a of solution) {
    for (const b of solution) {
      if (a >= b) continue;
      const [ra, ca, rb, cb] = [Math.floor(a / n), a % n, Math.floor(b / n), b % n];
      if (ra === rb) {
        for (let c = ca + 1; c < cb; c++) if (objects[ra * n + c] === 'F') return true;
      } else if (ca === cb) {
        for (let r = ra + 1; r < rb; r++) if (objects[r * n + ca] === 'F') return true;
      }
    }
  }
  return false;
}

/** With every lamp turned into furniture the house has two solutions or more (house 17, A5). */
export function lightNeeded(p: Puzzle): boolean {
  const geo = geometry(p.n, p.objects.join('').replace(/L/g, 'F'));
  return solve(puzzleOf(geo, p.roomOf), { givens: false }).count >= 2;
}

function sameGrade(a: Grade, b: Grade): boolean {
  return (
    a.d === b.d &&
    a.maxTech === b.maxTech &&
    a.steps === b.steps &&
    a.estSeconds === b.estSeconds &&
    a.episodes === b.episodes &&
    a.t.join() === b.t.join()
  );
}

/**
 * The house grades the same in every quarter turn (D54): houses 501–1000 come back turned after
 * house 1000 (D14), and the grader reads rows before columns, so a turn can change its path. A
 * turn may name a step differently, but every turn still asks for the band's insights (D67).
 */
export function gradeTurns(
  band: Band,
  c: Pick<HouseData, 'n' | 'rooms' | 'objects' | 'solution'>,
  g: Grade,
): boolean {
  const data = { n: c.n, rooms: c.rooms, objects: c.objects, givens: [], solution: c.solution };
  for (let t = 1; t < QUARTER_TURNS; t++) {
    const r = grade(parseHouse(rotate(data, t)), { maxTech: band.maxTech, maxT4: band.maxT4 });
    if (!r.ok || !r.grade || !sameGrade(r.grade, g)) return false;
    if (!insightsFit(band, r.insights, c.objects, null)) return false;
  }
  return true;
}

function teaches(band: Band, c: Candidate, g: GradeResult): boolean {
  switch (band.teach) {
    case 'first-t2':
      return g.path[0] === T2;
    case 'furniture-between':
      return furnitureBetween(c.n, c.objects, c.solution);
    case 'light-needed':
      return lightNeeded(c.puzzle);
    case null:
      return true;
  }
}

/**
 * The residents of a teaching house (D70), from the solution in reading order: house 9 two
 * ghosts in one line with a block between them, house 17 one beside the lamp's beam (on a cell
 * next to a lit one). The first choice with which the house still asks for its band's d and
 * insights wins; null when none does.
 */
export function residentsFor(band: Band, c: Candidate): { puzzle: Puzzle; g: GradeResult } | null {
  const { n, objects } = c;
  const sol = sorted(c.solution);
  const options: number[][] = [];
  if (band.residents === 'block-pair') {
    for (const a of sol) {
      for (const b of sol) if (a < b && furnitureBetween(n, objects, [a, b])) options.push([a, b]);
    }
  } else if (band.residents === 'beam-side') {
    const lit = c.puzzle.lit;
    for (const x of sol) {
      const r = Math.floor(x / n);
      const col = x % n;
      const near = [r > 0 ? x - n : -1, r < n - 1 ? x + n : -1, col > 0 ? x - 1 : -1];
      near.push(col < n - 1 ? x + 1 : -1);
      if (near.some((y) => y >= 0 && lit[y] === true)) options.push([x]);
    }
  }
  const opts: GradeOptions = { maxTech: band.maxTech, maxT4: band.maxT4 };
  for (const givens of options) {
    const puzzle = puzzleOf(c.puzzle, c.puzzle.roomOf, givens);
    const g = grade(puzzle, opts);
    if (!g.ok || !g.grade || g.grade.d < band.d[0] || g.grade.d > band.d[1]) continue;
    if (insightEpisodes(g.insights) < band.insightEpisodes) continue;
    if (band.needInsight !== null && !insightKinds(g.insights).includes(band.needInsight)) continue;
    return { puzzle, g };
  }
  return null;
}

/** A candidate that met every window, waiting in the pool. */
interface Qualified {
  k: number;
  c: Candidate;
  g: GradeResult;
  naive: number | null;
}

/**
 * The house for one place in the list (GENERATOR.md §6–§7, D15): candidates k = 0, 1, … from
 * `seedKey` (and `seedKey/k`), each checked in a staged order, cheap to costly (the generator,
 * the residents of houses 9 and 17, the grade with the band's techniques, d, T3, the episodes,
 * the insights, the manor's lead over its cycle, the teaching test, the turn test, every object
 * mattering, then the naive player); the first that passes wins, or the lowest d among the first
 * `lowestOf` that pass. Fails loudly after CANDIDATE_LIMIT candidates without one.
 */
function choose(
  label: string,
  id: number,
  band: Band,
  seedKey: string,
  cycleMax: number,
  searches: Search[],
  prevTrick: readonly string[] | null = null,
): House {
  const misses: Partial<Record<Miss, number>> = {};
  const miss = (m: Miss): void => {
    misses[m] = (misses[m] ?? 0) + 1;
  };
  const pool: Qualified[] = [];
  let k = 0;
  for (; k < CANDIDATE_LIMIT; k++) {
    const seed = hashSeed(k === 0 ? seedKey : `${seedKey}/${String(k)}`);
    const made = makeCandidate(band, seed);
    if ('rejected' in made) {
      miss(made.rejected);
      continue;
    }
    let c: Candidate = made;
    let g: GradeResult;
    if (band.residents !== null) {
      const placed = residentsFor(band, made);
      if (!placed) {
        miss('teach');
        continue;
      }
      c = { ...made, puzzle: placed.puzzle };
      g = placed.g;
    } else g = grade(c.puzzle, { maxTech: band.maxTech, maxT4: band.maxT4 });
    if (!g.ok || !g.grade) {
      miss('grade');
      continue;
    }
    if (sorted(g.placed).join() !== sorted(c.solution).join()) {
      throw new Error(`${label}: the grader's solution is not the only one (seed ${String(seed)})`);
    }
    const d = g.grade.d;
    if (d < band.d[0] || d > band.d[1]) {
      miss('d');
      continue;
    }
    if (band.needT3 && g.grade.t[T3 - 1] === 0) {
      miss('t3');
      continue;
    }
    if (g.grade.episodes < MIN_EPISODES) {
      miss('episodes');
      continue;
    }
    if (!insightsFit(band, g.insights, c.objects, prevTrick)) {
      miss('insight');
      continue;
    }
    if (band.role === 'manor' && d <= cycleMax) {
      miss('manor');
      continue;
    }
    if (!teaches(band, c, g)) {
      miss('teach');
      continue;
    }
    if (band.turnable && !gradeTurns(band, c, g.grade)) {
      miss('turn');
      continue;
    }
    if (!objectsMatter(c.puzzle, c.solution, { maxTech: band.maxTech, maxT4: band.maxT4 }, g)) {
      miss('idle');
      continue;
    }
    let naive: number | null = null;
    if (band.naiveMax !== null) {
      naive = exactWinRate(c.puzzle, 'naive');
      if (naive > band.naiveMax) {
        miss('naive');
        continue;
      }
    }
    pool.push({ k, c, g, naive });
    if (pool.length >= (band.lowestOf ?? 1)) break;
  }
  if (pool.length === 0) {
    throw new Error(`${label}: no candidate met every window in ${String(CANDIDATE_LIMIT)}`);
  }
  // the lowest d, ties to the lower k (pool is in k order, and sort is stable)
  const best = [...pool].sort((a, b) => (a.g.grade?.d ?? 0) - (b.g.grade?.d ?? 0))[0] as Qualified;
  searches.push({
    label,
    role: band.role,
    tried: Math.min(k + 1, CANDIDATE_LIMIT),
    misses,
    kept: pool.length,
  });
  return {
    id,
    n: best.c.n,
    rooms: best.c.rooms,
    objects: best.c.objects,
    givens: sorted(best.c.puzzle.givens),
    solution: best.c.solution,
    grade: best.g.grade as NonNullable<GradeResult['grade']>,
    insights: best.g.insights,
    insightEpisodes: insightEpisodes(best.g.insights),
    players: {
      naive: best.naive ?? exactWinRate(best.c.puzzle, 'naive'),
      shallow: exactWinRate(best.c.puzzle, 'shallow'),
    },
    role: band.role,
    seed: best.c.seed,
  };
}

/** Houses 1–3: the hand-made tutorial, graded with T1 only (GENERATOR.md §1.3). */
function tutorialHouses(): House[] {
  return TUTORIAL_HOUSES.map((d, k) => {
    const id = k + 1;
    const h = parseHouse(d);
    const g = grade(h, { maxTech: T1 });
    if (!g.ok || !g.grade) throw new Error(`tutorial house ${String(id)} needs more than T1`);
    return {
      id,
      n: d.n,
      rooms: d.rooms,
      objects: d.objects,
      givens: [...d.givens],
      solution: [...d.solution],
      grade: g.grade,
      insights: g.insights,
      insightEpisodes: insightEpisodes(g.insights),
      players: {
        naive: exactWinRate(h, 'naive'),
        shallow: exactWinRate(h, 'shallow'),
      },
      role: 'tutorial',
      seed: hashSeed(`shy-ghosts/level/${String(id)}`),
    };
  });
}

/**
 * The house list and the dailies (GENERATOR.md §6–§8). Houses 4–24 in order; from 25 each cycle's
 * other houses first, then its manor, which must lead them all (D15); then one daily per date.
 */
export function buildLevels(opts: BuildOptions = {}): Built {
  const upTo = opts.upTo ?? LEVEL_COUNT;
  const log = opts.log ?? (() => undefined);
  const searches: Search[] = [];
  const byId = new Map<number, House>();
  const one = (id: number, cycleMax = 0): void => {
    const band = bandFor(id);
    const before = byId.get(id - 1);
    const house = choose(
      `house ${String(id)}`,
      id,
      band,
      `shy-ghosts/level/${String(id)}`,
      cycleMax,
      searches,
      before ? trickOf(before.insights, before.objects) : null,
    );
    byId.set(id, house);
    if (id % LOG_EVERY_HOUSES === 0) log(`house ${String(id)} (${String(byId.size)} built)`);
  };
  for (const h of tutorialHouses()) if (h.id <= upTo) byId.set(h.id, h);
  for (let id = TUTORIAL_COUNT + 1; id < Math.min(CYCLE_START, upTo + 1); id++) one(id);
  for (let first = CYCLE_START; first <= upTo; first += CYCLE_PERIOD) {
    const ids = Array.from({ length: CYCLE_PERIOD }, (_, j) => first + j).filter(
      (id) => id <= upTo,
    );
    const manor = ids.find((id) => cycleOf(id)?.p === CYCLE_MANOR);
    for (const id of ids) if (id !== manor) one(id);
    if (manor !== undefined) {
      const others = ids.filter((id) => id !== manor).map((id) => byId.get(id)?.grade.d ?? 0);
      one(manor, Math.max(...others));
    }
  }
  const levels = [...byId.values()].sort((a, b) => a.id - b.id);
  const dates = dateRange(DAILY_FIRST, DAILY_LAST).slice(0, opts.dailies);
  const dailies: Record<string, House> = {};
  dates.forEach((date, i) => {
    dailies[date] = choose(
      `daily ${date}`,
      i + 1,
      DAILY_BAND,
      `shy-ghosts/daily/${date}`,
      0,
      searches,
    );
    if ((i + 1) % LOG_EVERY_DAILIES === 0) log(`daily ${String(i + 1)} (${date})`);
  });
  return { levels, dailies, searches };
}

/** A value as JSON with every object's keys sorted, so the files stay byte-stable. */
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** A list as JSON, one item per line (GENERATOR.md §8): levels.json and levels-meta.json. */
export function listJson(items: readonly object[]): string {
  return `[\n${items.map(stableJson).join(',\n')}\n]\n`;
}

/** An object keyed by date as JSON, one per line, dates in order: dailies(-meta).json. */
export function datesJson(byDate: Readonly<Record<string, object>>): string {
  const lines = Object.keys(byDate)
    .sort()
    .map((date) => `${JSON.stringify(date)}:${stableJson(byDate[date])}`);
  return `{\n${lines.join(',\n')}\n}\n`;
}

/** The four files of a build (D57), by name in src/data: what the game plays, and the rest. */
export function levelFiles(built: Pick<Built, 'levels' | 'dailies'>): Record<string, string> {
  const dates = (f: (h: House) => object): Record<string, object> =>
    Object.fromEntries(Object.entries(built.dailies).map(([date, h]) => [date, f(h)]));
  return {
    'levels.json': listJson(built.levels.map(playOf)),
    'dailies.json': datesJson(dates(playOf)),
    'levels-meta.json': listJson(built.levels.map(metaOf)),
    'dailies-meta.json': datesJson(dates(metaOf)),
  };
}

/** The report groups (GENERATOR.md §7): bands of 1–24, cycle positions, manors, dailies. */
export function groupOf(h: House): string {
  if (h.role === 'daily') return 'dailies';
  if (h.role === 'tutorial') return '1–3 tutorial';
  const c = cycleOf(h.id);
  if (!c) return (EARLY_GROUPS.find(([last]) => h.id <= last) as readonly [number, string])[1];
  if (h.role === 'cycle-low') return 'cycle 1–3';
  if (h.role === 'cycle-high') return 'cycle 4–9';
  if (h.role === 'manor') return 'manors';
  return 'cycle breathers';
}

/** Nearest-rank quantile of numbers (q in [0, 1]). */
export function quantile(values: readonly number[], q: number): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] ?? Number.NaN;
}

/** The share of a search's generated candidates (not rejected in steps 2–5) inside the d window. */
export function windowYield(searches: readonly Search[]): { inside: number; generated: number } {
  let inside = 0;
  let generated = 0;
  for (const s of searches) {
    const count = (ms: readonly Miss[]): number => ms.reduce((a, m) => a + (s.misses[m] ?? 0), 0);
    const made = s.tried - count(GENERATOR_MISSES);
    generated += made;
    inside += made - count(WINDOW_MISSES);
  }
  return { inside, generated };
}

/**
 * Lines for the build log (GENERATOR.md §8): per group the d, estSeconds, naive and shallow
 * quantiles, the technique counts, the candidates per house and the d-window yield (§10's).
 */
export function report(built: Built): string[] {
  const houses = [...built.levels, ...Object.values(built.dailies)];
  const groups = new Map<string, House[]>();
  for (const h of houses) groups.set(groupOf(h), [...(groups.get(groupOf(h)) ?? []), h]);
  const searches = new Map<string, Search[]>();
  for (const s of built.searches) {
    const g = s.label.startsWith('daily')
      ? 'dailies'
      : groupOf({ id: Number(s.label.split(' ')[1]), role: s.role } as House);
    searches.set(g, [...(searches.get(g) ?? []), s]);
  }
  const q3 = (v: number[], f: (x: number) => string = String): string =>
    REPORT_QUANTILES.map((q) => f(quantile(v, q))).join('/');
  const rate = (x: number): string => x.toFixed(REPORT_RATE_DIGITS);
  const lines = [
    'group: houses | d p10/50/90 | estSeconds p10/50/90 | naive p10/50/90 | shallow p10/50/90 | T1/T2/T3/T4 steps | candidates mean | d-window yield',
  ];
  for (const [name, hs] of groups) {
    const t = TECHS.map((_, k) => hs.reduce((a, h) => a + (h.grade.t[k] ?? 0), 0));
    const ss = searches.get(name) ?? [];
    const mean = ss.length ? (ss.reduce((a, s) => a + s.tried, 0) / ss.length).toFixed(1) : '–';
    const y = windowYield(ss);
    const share = y.generated ? (y.inside / y.generated).toFixed(2) : '–';
    lines.push(
      `${name}: ${String(hs.length)} | ${q3(hs.map((h) => h.grade.d))} | ${q3(hs.map((h) => h.grade.estSeconds))} | ` +
        `${q3(
          hs.map((h) => h.players.naive),
          rate,
        )} | ${q3(
          hs.map((h) => h.players.shallow),
          rate,
        )} | ${t.join('/')} | ${mean} | ${share}`,
    );
  }
  return lines;
}
