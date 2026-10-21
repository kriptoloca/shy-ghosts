/**
 * The content pipeline's parameters (GENERATOR.md §3–§8): every number the solver, the grader, the
 * players and the generator use, each with a comment (CLAUDE.md "No magic numbers"). The windows
 * of `bandFor` are the tuning levers (D35); Gate A's thresholds are not here: they are fixed and
 * live in the tests that check them (tests/gate-a.test.ts).
 */

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
 * From house 25, and in every daily, the forced chain stalls at least twice and each time only a
 * real deduction (an insight other than `shape`) moves it on (Gate B tune round 1, D67). Houses
 * 4–24 follow round 2's ladder instead (D81).
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
/**
 * House 16's lesson, three ghosts in one line (D81): a row or a column that objects cut into this
 * many segments holds this many solution ghosts.
 */
export const SPLIT_TWICE_SEGMENTS = 3;
/** Houses 4 and 5 keep the lowest d among this many qualifying candidates (D15, D20, D81). */
export const TEACH_POOL = 50;
/**
 * House 8, the first lamp, keeps the lowest d among this many: its light lesson, its resident
 * beside the beam, no shadow and no free opening leave few qualifying candidates (D81).
 */
export const LIGHT_POOL = 5;

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

/** The build log's report groups for houses 4–24 (§8): Gate A's groups (A4, A6), by last house. */
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
  /**
   * The test of the house that teaches an element or a pattern (A5; the ladder, D81): 4 a claim
   * (the first step a T2), 5 a shelf between two solution ghosts, 6 the split budget, 8 the
   * light, 10 the shadow, 16 three ghosts in a line split twice, 17 the lit line, 18 two lamps.
   */
  teach:
    | 'first-t2'
    | 'furniture-between'
    | 'split-budget'
    | 'light-needed'
    | 'shadow'
    | 'split-twice'
    | 'lit-line'
    | 'two-lamps'
    | null;
  /**
   * How the house may open (D81): 'insight', the autopilot places no ghost before its first stall
   * (a real insight comes first); 'no-freebie', no room with one free cell and no line single on
   * the first look; null, any opening.
   */
  opening: 'insight' | 'no-freebie' | null;
  /** The house opens differently from the house before it (D81). */
  newOpening: boolean;
  /** The real insight the house must open with, or null (house 12: a cross; D81). */
  openingKind: 'cross' | null;
  /** Keep the lowest d among this many qualifying candidates (houses 4, 5, 8), else the first. */
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
  /** Kinds of insight it needs (two where the band carries difficulty from house 25, D67). */
  insightKinds: number;
  /** House 4, the first deduction: only `shape` steps (a room that lies in one line). */
  shapeOnly: boolean;
  /**
   * Residents that demonstrate the house's element (D70, D81): house 5, two of the solution's
   * ghosts in one line with a block between them; house 8, one beside the lamp's beam.
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
  shapeOnly: false,
  residents: null,
  opening: null,
  newOpening: false,
  openingKind: null,
} as const;

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

/**
 * Houses 4–24, the ladder of Gate B's tune round 2 (D81; GENERATOR.md §7): each house teaches one
 * new pattern or rule, or opens with a real insight, so none is finished on autopilot (D80). The
 * shelf comes at 5, the first count at 7 and the lamp at 8 (Gate A's A3/A5 positions as amended
 * by Hasan, D82). Round 1's insight rules (D67) apply from house 25: on these boards the
 * autopilot, not the grader's count of steps, says what a house asks for.
 */
const LADDER_BASE = {
  insightEpisodes: 0,
  insightKinds: 0,
  shapeOnly: false,
  newOpening: true,
} as const;
/** A hard house of the ladder: 6 × 6, T3 required, a real insight before the first ghost. */
const HARD6 = {
  role: 'hard',
  sides: [6],
  rooms: [6, 7],
  maxTech: 3,
  needT3: true,
  naiveMax: NAIVE_MAX,
  opening: 'insight',
} as const;
/** The 7 × 7 hard houses 20–22. */
const HARD7 = {
  ...HARD6,
  sides: [7],
  rooms: [7, 8],
  furniture: [1, 3],
  lamps: [1, 2],
  d: [18, 30],
} as const;
/** The rests 23–24: 6 × 6 with a lamp, no free opening. */
const REST6 = {
  role: 'rest',
  sides: [6],
  rooms: [6, 6],
  furniture: [0, 1],
  lamps: [1, 1],
  maxTech: 2,
  d: [8, 14],
  opening: 'no-freebie',
} as const;
/** A house of the ladder: its board, objects, techniques and d window, and what it changes. */
type Rung = Pick<Band, 'role' | 'sides' | 'rooms' | 'furniture' | 'lamps' | 'maxTech' | 'd'> &
  Partial<Band>;
const LADDER: Record<number, Rung> = {
  // 4: the claim, a room lying in one line (the first T2); it may open like house 3
  4: {
    role: 'teach',
    sides: [5],
    rooms: [5, 5],
    furniture: [0, 0],
    lamps: [0, 0],
    maxTech: 2,
    d: [4, 12],
    teach: 'first-t2',
    lowestOf: TEACH_POOL,
    shapeOnly: true,
    newOpening: false,
  },
  // 5: the shelf blocks sight; two residents in one line with the shelf between them
  5: {
    role: 'teach',
    sides: [5],
    rooms: [6, 6],
    furniture: [1, 2],
    lamps: [0, 0],
    maxTech: 2,
    d: [6, 14],
    teach: 'furniture-between',
    lowestOf: TEACH_POOL,
    residents: 'block-pair',
  },
  // 6: the split budget, a line a shelf splits holds two ghosts
  6: {
    role: 'teach',
    sides: [5],
    rooms: [6, 6],
    furniture: [1, 2],
    lamps: [0, 0],
    maxTech: 2,
    d: [6, 14],
    teach: 'split-budget',
  },
  // 7: the first count (T3), at the opening
  7: { ...HARD6, rooms: [6, 6], furniture: [0, 1], lamps: [0, 0], d: [12, 24] },
  // 8: the light, no shadow yet; a resident beside the beam
  8: {
    role: 'teach',
    sides: [6],
    rooms: [6, 6],
    furniture: [0, 2],
    lamps: [1, 1],
    maxTech: 2,
    d: [8, 16],
    teach: 'light-needed',
    lowestOf: LIGHT_POOL,
    residents: 'beam-side',
    opening: 'no-freebie',
  },
  9: { ...HARD6, furniture: [1, 3], lamps: [0, 0], d: [12, 24] },
  // 10: the shadow, light stops at a shelf
  10: {
    role: 'teach',
    sides: [5],
    rooms: [5, 6],
    furniture: [1, 2],
    lamps: [1, 1],
    maxTech: 2,
    d: [6, 14],
    teach: 'shadow',
    opening: 'no-freebie',
  },
  11: { ...HARD6, furniture: [1, 3], lamps: [0, 1], d: [12, 24] },
  // 12: a cross at the opening
  12: { ...HARD6, furniture: [2, 3], lamps: [0, 1], d: [14, 24], openingKind: 'cross' },
  13: { ...HARD6, furniture: [2, 3], lamps: [0, 1], d: [14, 24] },
  14: { ...HARD6, furniture: [2, 3], lamps: [0, 1], d: [14, 24] },
  // 15: the one rest of houses 4–20, with no free opening
  15: {
    role: 'breather',
    sides: [5],
    rooms: [5, 6],
    furniture: [1, 2],
    lamps: [0, 1],
    maxTech: 2,
    d: [6, 12],
    opening: 'no-freebie',
  },
  // 16: three ghosts in one line split twice
  16: {
    role: 'breather',
    sides: [5],
    rooms: [6, 7],
    furniture: [2, 3],
    lamps: [0, 0],
    maxTech: 2,
    d: [6, 12],
    teach: 'split-twice',
    opening: 'no-freebie',
  },
  // 17: the lit-line budget, a fully lit line stays empty
  17: {
    role: 'teach',
    sides: [6],
    rooms: [6, 6],
    furniture: [0, 2],
    lamps: [1, 1],
    maxTech: 2,
    d: [8, 16],
    teach: 'lit-line',
  },
  // 18: two lamps, both needed
  18: {
    role: 'teach',
    sides: [6],
    rooms: [6, 6],
    furniture: [0, 2],
    lamps: [2, 2],
    maxTech: 2,
    d: [8, 16],
    teach: 'two-lamps',
    opening: 'no-freebie',
  },
  19: { ...HARD6, furniture: [1, 3], lamps: [1, 1], d: [14, 24] },
  20: HARD7,
  21: HARD7,
  22: HARD7,
  23: REST6,
  24: REST6,
};

/** The band of house `id` (4 … LEVEL_COUNT; GENERATOR.md §7). */
export function bandFor(id: number): Band {
  if (id <= TUTORIAL_COUNT) throw new Error(`house ${String(id)} is hand-made (tutorial)`);
  if (id < CYCLE_START) {
    const rung = LADDER[id];
    if (!rung) throw new Error(`house ${String(id)} has no place on the ladder`);
    return { ...base, ...LADDER_BASE, ...rung };
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
