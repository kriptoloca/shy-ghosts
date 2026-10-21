/**
 * The content pipeline's parameters (GENERATOR.md §3–§8): every number the solver, the grader, the
 * players and the generator use, each with a comment (CLAUDE.md "No magic numbers"). The windows
 * of `bandFor` are the tuning levers (D35); Gate A's thresholds are not here: they are fixed and
 * live in the tests that check them (tests/gate-a.test.ts).
 */

import type { Insight } from './grade';

/** Grader techniques (GENERATOR.md §4.2). */
export type Tech = 1 | 2 | 3 | 4;
/** The techniques by name; the number is the order the grader tries them in (§4.3). */
export const T1: Tech = 1;
export const T2: Tech = 2;
export const T3: Tech = 3;
export const T4: Tech = 4;
/** Every technique in order: a grade's `t` counts the steps of each (D13). */
export const TECHS: readonly Tech[] = [T1, T2, T3, T4];

/** What a house is for in the curve (GENERATOR.md §1.1, §7). */
export type Role =
  | 'tutorial'
  | 'teach'
  | 'hard'
  | 'breather'
  | 'rest'
  | 'cycle-low'
  | 'cycle-high'
  | 'manor'
  | 'daily';

// ---- Solver (§3) --------------------------------------------------------------------------------

/** The solver counts solutions up to this many (one is unique, two is enough to know otherwise). */
export const SOLUTION_LIMIT = 2;
/** Search nodes before the build fails loudly (never a time limit: the files stay byte-stable). */
export const SOLVER_NODE_LIMIT = 2_000_000;

// ---- Grader (§4) --------------------------------------------------------------------------------

/** Step weights: T1 places, T2 and T4 remove a cell, T3 clears k segments (weight base + k). */
export const WEIGHT_T1 = 1;
export const WEIGHT_T2 = 3;
export const WEIGHT_T3_BASE = 4;
export const WEIGHT_T4 = 8;
/** T3 counts k rooms in k segments for k in this range (k = 1 is T2, D12). */
export const T3_K_MIN = 2;
export const T3_K_MAX = 4;
/** estSeconds = 4·T1 + 8·T2 + 15·T3 + 25·T4 + 1.5·(empty cells) (the brief's formula, D18). */
export const EST_T1 = 4;
export const EST_T2 = 8;
export const EST_T3 = 15;
export const EST_T4 = 25;
export const EST_PER_EMPTY_CELL = 1.5;
/** Every generated house asks for at least this many deduction episodes (A3, D16). */
export const MIN_EPISODES = 1;
/**
 * From house 10, and in every daily, the forced chain stalls at least twice and each time only a
 * real deduction (an insight other than `shape`) moves it on (Gate B tune round 1, D67).
 */
export const INSIGHT_EPISODES = 2;
/** The bands that carry difficulty need insights of at least two kinds (D67). */
export const INSIGHT_KINDS_HARD = 2;

// ---- Players (§5) -------------------------------------------------------------------------------

/** Seeded playouts of the sampled check (`winRate`; standard error ≤ 0.025 at 400). */
export const PLAYOUTS = 400;
/**
 * The exact walk (`exactWinRate`, D55) fails loudly past this many memoized boards: never a
 * silent cap, so a stored rate is always exact.
 */
export const PLAYER_STATE_LIMIT = 1_000_000;

// ---- Generator (§6) -----------------------------------------------------------------------------

/** Search nodes when picking a solution before the candidate is dropped (step 3). */
export const SOLUTION_PICK_NODE_LIMIT = 4000;
/** No room larger than this many times the average room (steps 4 and 5). */
export const ROOM_MAX_FACTOR = 2.5;
/** Border moves that break a second solution before the candidate is dropped (step 5). */
export const UNIQUE_FIX_MOVES = 50;
/**
 * Step 5 looks for a cell to move among the first this many other solutions, not only the first:
 * the first one's cells are often all inside their rooms (D53).
 */
export const UNIQUE_FIX_ALTERNATIVES = 16;
/**
 * Candidates tried per house before the build fails loudly (D15). Raised from 2,000 for Gate B's
 * insight and relevance rules (D67, D68): houses 9–11 and 15–16 need several thousand.
 */
export const CANDIDATE_LIMIT = 50_000;
/** Houses 4, 9 and 17 keep the lowest d among this many qualifying candidates (D15, D20). */
export const TEACH_POOL = 50;

// ---- The list (§7, §8, D6, D7, D14) -------------------------------------------------------------

/** No house is larger than 8 × 8, so cells stay ≥ 44 CSS px on a 360 px wide phone (D69). */
export const SIDE_MAX = 8;

/** Houses in levels.json; the hand-made tutorial ones are 1–3. */
export const LEVEL_COUNT = 1000;
export const TUTORIAL_COUNT = 3;
/** Cycles start at this house and repeat every CYCLE_PERIOD houses (D6). */
export const CYCLE_START = 25;
export const CYCLE_PERIOD = 11;
/** Cycle positions: 1–3 low, 4–9 high, 10 the manor, 11 the breather. */
export const CYCLE_LOW_LAST = 3;
export const CYCLE_HIGH_LAST = 9;
export const CYCLE_MANOR = 10;
/** The windows rise with the cycle up to this one (D7: r = min(c, CAP) / CAP). */
export const CYCLE_CAP = 10;
/**
 * After house 1000 (D14 as amended, D56): house k > 1000 is house
 * ROTATION_FROM + ((k − 1001) mod ROTATION_SPAN), turned a quarter more each pass. The span is
 * whole cycles ending at house 1000 (houses 506–1000: 45 cycles of 11), so the turned list keeps
 * the cycle phase across every seam: house 1001 is position 9, as house 506 is.
 */
export const ROTATION_CYCLES = 45;
export const ROTATION_SPAN = ROTATION_CYCLES * CYCLE_PERIOD;
export const ROTATION_FROM = LEVEL_COUNT - ROTATION_SPAN + 1;

/** The build log's report groups for houses 4–24 (§8): the last house of each band of §7. */
export const EARLY_GROUPS: readonly (readonly [number, string])[] = [
  [8, '4–8'],
  [11, '9–11'],
  [14, '12–14'],
  [16, '15–16'],
  [19, '17–19'],
  [22, '20–22'],
  [24, '23–24'],
];
/** The build log's quantiles per group: p10, the median and p90. */
export const REPORT_QUANTILES: readonly number[] = [0.1, 0.5, 0.9];
/** The build log prints win rates with this many decimals (the files keep them exact). */
export const REPORT_RATE_DIGITS = 3;
/** The build logs its progress every this many houses and every this many dailies. */
export const LOG_EVERY_HOUSES = 50;
export const LOG_EVERY_DAILIES = 100;

// ---- Dailies (§8, D10, D29) ---------------------------------------------------------------------

/** One daily house per UTC date in this range, inclusive: 792 dates. */
export const DAILY_FIRST = '2026-11-01';
export const DAILY_LAST = '2028-12-31';
export const DAILY_COUNT = 792;
/** `levels:check` warns this many days before the range runs out (D29). */
export const DAILY_WARN_DAYS = 60;

// ---- Bands (§7) ---------------------------------------------------------------------------------

export interface Band {
  role: Role;
  /** Sides a candidate draws from. */
  sides: readonly number[];
  /** Room count range, inclusive; added to the side when `roomsFromSide` (N to N+3). */
  rooms: readonly [number, number];
  roomsFromSide: boolean;
  furniture: readonly [number, number];
  lamps: readonly [number, number];
  /** The techniques the grader may use. */
  maxTech: Tech;
  /** The grade must use T3 ("T3 required"). */
  needT3: boolean;
  /** T4 steps allowed (manors only, at most one, D8). */
  maxT4: number;
  /** The D window, inclusive. */
  d: readonly [number, number];
  /** The naive player's win-rate cap, or null where it is only reported. */
  naiveMax: number | null;
  /** The teaching test of the house that introduces an element (A5). */
  teach: 'first-t2' | 'furniture-between' | 'light-needed' | null;
  /** Keep the lowest d among this many qualifying candidates (houses 4, 9, 17), else the first. */
  lowestOf: number | null;
  /** From house 25: the cycle and the position in it. */
  cycle: { c: number; p: number } | null;
  /**
   * The list turns this house after house 1000 (houses 501–1000, D14): keep only candidates whose
   * grade is the same in all four quarter turns, so the turned house keeps its grade (A8; D54).
   */
  turnable: boolean;
  /** Insight episodes the house needs (D67): stalls only a real deduction ends. */
  insightEpisodes: number;
  /** Kinds of insight it needs (two where the band carries difficulty, D67). */
  insightKinds: number;
  /** The kind it teaches and must use (houses 5, 6, 10 and 17), or null. */
  needInsight: Insight | null;
  /** House 4, the first deduction: only `shape` steps (a room that lies in one line). */
  shapeOnly: boolean;
  /** A teach house whose trick must differ from the house before it (D67). */
  newTrick: boolean;
  /**
   * Residents that demonstrate the house's element (D70): house 9, two of the solution's ghosts
   * in one line with a block between them; house 17, one beside the lamp's beam.
   */
  residents: 'block-pair' | 'beam-side' | null;
}

const base = {
  roomsFromSide: false,
  needT3: false,
  maxT4: 0,
  naiveMax: null,
  teach: null,
  lowestOf: null,
  cycle: null,
  turnable: false,
  insightEpisodes: INSIGHT_EPISODES,
  insightKinds: 1,
  needInsight: null,
  shapeOnly: false,
  newTrick: false,
  residents: null,
} as const;

/**
 * Houses 4–8 teach one trick each (D67): 4 the first deduction (a room in one line), 5 a line a
 * ghost's sight makes, 6 a cross, 7 both in two stalls, 8 two stalls with a trick other than 7's.
 * Houses 6–8 take d up to 14 (was 12): two stalls rarely fit below.
 */
const EARLY_TEACH: Record<number, Partial<Band>> = {
  4: { insightEpisodes: 0, insightKinds: 0, shapeOnly: true },
  5: { insightEpisodes: 1, needInsight: 'line', newTrick: true },
  6: { insightEpisodes: 1, needInsight: 'cross', newTrick: true, d: [4, 14] },
  7: { insightEpisodes: 2, insightKinds: 2, newTrick: true, d: [4, 14] },
  8: { insightEpisodes: 2, newTrick: true, d: [4, 14] },
};

/** The naive cap on hard houses, cycle positions 1–9 and dailies; manors have their own (D16). */
export const NAIVE_MAX = 0.35;
export const NAIVE_MAX_MANOR = 0.25;

/** The cycle and position of a house from 25 on (D6), else null. */
export function cycleOf(id: number): { c: number; p: number } | null {
  if (id < CYCLE_START) return null;
  return {
    c: Math.floor((id - CYCLE_START) / CYCLE_PERIOD),
    p: ((id - CYCLE_START) % CYCLE_PERIOD) + 1,
  };
}

/** `lo + span · min(c, CAP) / CAP`, rounded (D7), from integers so every engine agrees. */
function rise(lo: number, span: number, c: number): number {
  return Math.round((lo * CYCLE_CAP + span * Math.min(c, CYCLE_CAP)) / CYCLE_CAP);
}

/** The band of house `id` (4 … LEVEL_COUNT; GENERATOR.md §7). */
export function bandFor(id: number): Band {
  if (id <= TUTORIAL_COUNT) throw new Error(`house ${String(id)} is hand-made (tutorial)`);
  if (id <= 8) {
    const first = id === 4;
    return {
      ...base,
      role: 'teach',
      sides: [5],
      rooms: [5, 5],
      furniture: [0, 0],
      lamps: [0, 0],
      maxTech: 2,
      d: [4, 12],
      teach: first ? 'first-t2' : null,
      lowestOf: first ? TEACH_POOL : null,
      ...EARLY_TEACH[id],
    };
  }
  if (id <= 11) {
    const first = id === 9;
    // 9 teaches the block on 5 × 5 with one stall; 10 and 11 need two stalls, which 5 × 5 with
    // blocks that matter almost never gives (0 of 834 candidates), so they move to 6 × 6 (D67)
    return {
      ...base,
      role: 'teach',
      sides: first ? [5] : [6],
      rooms: first ? [6, 6] : [6, 7],
      furniture: first ? [1, 2] : [1, 3],
      lamps: [0, 0],
      maxTech: 2,
      d: first ? [6, 14] : [6, 16],
      teach: first ? 'furniture-between' : null,
      lowestOf: first ? TEACH_POOL : null,
      insightEpisodes: first ? 1 : INSIGHT_EPISODES,
      // 10 differs from 9 by kind, not only by depth: it needs a cross
      needInsight: id === 10 ? 'cross' : null,
      newTrick: true,
      residents: first ? 'block-pair' : null,
    };
  }
  if (id <= 14) {
    return {
      ...base,
      role: 'hard',
      sides: [6],
      rooms: [6, 7],
      furniture: [2, 3],
      lamps: [0, 0],
      maxTech: 3,
      needT3: true,
      d: [14, 24],
      naiveMax: NAIVE_MAX,
      insightKinds: INSIGHT_KINDS_HARD,
    };
  }
  if (id <= 16) {
    return {
      ...base,
      role: 'breather',
      sides: [5],
      rooms: [5, 6],
      furniture: [1, 2],
      lamps: [0, 0],
      maxTech: 2,
      d: [6, 12],
    };
  }
  if (id <= 19) {
    const first = id === 17;
    return {
      ...base,
      role: 'teach',
      sides: [6],
      rooms: [6, 6],
      furniture: [0, 2],
      lamps: [1, 1],
      maxTech: 2,
      d: [8, 16],
      teach: first ? 'light-needed' : null,
      lowestOf: first ? TEACH_POOL : null,
      // 17 teaches light with a lamp-made line; 18 and 19 each bring a trick of their own
      needInsight: first ? 'lamp' : null,
      newTrick: !first,
      residents: first ? 'beam-side' : null,
    };
  }
  if (id <= 22) {
    return {
      ...base,
      role: 'hard',
      sides: [7],
      rooms: [7, 8],
      furniture: [1, 3],
      lamps: [1, 2],
      maxTech: 3,
      needT3: true,
      d: [18, 30],
      naiveMax: NAIVE_MAX,
      insightKinds: INSIGHT_KINDS_HARD,
    };
  }
  if (id < CYCLE_START) {
    return {
      ...base,
      role: 'rest',
      sides: [6],
      rooms: [6, 6],
      furniture: [0, 1],
      lamps: [1, 1],
      maxTech: 2,
      d: [8, 14],
    };
  }
  const cycle = cycleOf(id) as { c: number; p: number };
  const { c, p } = cycle;
  const late = { furniture: [0, 5], lamps: [0, 3], cycle, turnable: id >= ROTATION_FROM } as const;
  if (p <= CYCLE_LOW_LAST) {
    return {
      ...base,
      ...late,
      role: 'cycle-low',
      sides: [7],
      rooms: [7, 10],
      maxTech: 3,
      d: [rise(12, 6, c), rise(22, 8, c)],
      naiveMax: NAIVE_MAX,
      insightKinds: INSIGHT_KINDS_HARD,
    };
  }
  if (p <= CYCLE_HIGH_LAST) {
    return {
      ...base,
      ...late,
      role: 'cycle-high',
      sides: [7, 8],
      rooms: [0, 3],
      roomsFromSide: true,
      maxTech: 3,
      needT3: true,
      d: [rise(18, 8, c), rise(32, 10, c)],
      naiveMax: NAIVE_MAX,
      insightKinds: INSIGHT_KINDS_HARD,
    };
  }
  if (p === CYCLE_MANOR) {
    return {
      ...base,
      ...late,
      role: 'manor',
      // 8 × 8 since D69 (was 9 × 9): readable on a 360 px wide phone, more blocks for the area
      sides: [SIDE_MAX],
      rooms: [9, 12],
      furniture: [1, 6],
      maxTech: 4,
      needT3: true,
      maxT4: 1,
      d: [rise(33, 10, c), rise(50, 15, c)],
      naiveMax: NAIVE_MAX_MANOR,
      insightKinds: INSIGHT_KINDS_HARD,
    };
  }
  return {
    ...base,
    ...late,
    role: 'breather',
    sides: [6],
    rooms: [6, 9],
    maxTech: 2,
    d: [6, 14],
  };
}

/** The daily house's band (D10): 7 × 7 or 8 × 8 by the seed, d centred on 27. */
export const DAILY_BAND: Band = {
  ...base,
  role: 'daily',
  sides: [7, 8],
  rooms: [0, 2],
  roomsFromSide: true,
  furniture: [1, 4],
  lamps: [0, 2],
  maxTech: 3,
  d: [20, 34],
  naiveMax: NAIVE_MAX,
  insightKinds: INSIGHT_KINDS_HARD,
};
