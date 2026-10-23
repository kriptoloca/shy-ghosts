import { AP_FULL, Autopilot } from './autopilot';
import { Grader } from './grade';
import { DEPTH_RANK, T1, T2, T3, T4, type Tech } from './params';
import type { Puzzle } from './solve';

/**
 * The depth profile of a house (GENERATOR.md §4.8; Gate B tune round 3, D92). It plays the house
 * the way round 3's player did, the cheapest deduction first: round 2's autopilot (single, claim,
 * the budget over segments; §4.7) runs until it stalls, the band's grader supplies one step, and
 * the autopilot runs again. Every placed ghost is tagged with the hardest step since the ghost
 * before it (`DEPTH_RANK`):
 * - free, a room with one free cell before any deduction (round 3's "last free cell");
 * - elim, a last free cell after sight eliminations ("elimination");
 * - claim, a room lying in one line, and budget, "every open stretch needs a ghost" ("count");
 * - cross, a cell that sees a whole room from two sides; count, k rooms filling k lines; chain,
 *   "if here, a room empties" (T4, manors only): the real insights the autopilot lacks.
 */
export type Reason = keyof typeof DEPTH_RANK;
/** The real insights. */
export const REAL: ReadonlySet<Reason> = new Set<Reason>(['cross', 'count', 'chain']);
/** The placements that took more than a glance. */
export const THINK: ReadonlySet<Reason> = new Set<Reason>([
  'claim',
  'budget',
  'cross',
  'count',
  'chain',
]);

export interface RealStep {
  /** 'count-row-3', 'cross', 'chain' … */
  kind: string;
  /** Ghosts placed before it. */
  at: number;
}

export interface DepthProfile {
  solved: boolean;
  /** One per placed ghost (residents left out), in order. */
  tags: Reason[];
  /** The real steps (cross, count, chain), with the ghosts placed before each. */
  real: RealStep[];
  /** Gaps between two placements that hold a real step: the moments only an insight moves on. */
  stalls: number;
  /** Ghosts placed after the last real step (the autopilot's tail). */
  tail: number;
  /** The longest run of ghosts placed by elim or free. */
  longestAuto: number;
  /** Placements that took more than a glance: claim, budget, cross, count, chain. */
  think: number;
  /** The opener: the first real step's kind, or the pattern of the first ghost. */
  opener: string;
}

function countKind(p: Puzzle, segments: readonly number[], rooms: readonly number[]): string {
  const axis = p.segments[segments[0] as number]?.axis ?? 'row';
  return `count-${axis}-${String(rooms.length)}`;
}

/** The depth profile of house `p` with the band's techniques (`maxTech`, at most `maxT4` T4s). */
export function depthProfile(
  p: Puzzle,
  maxTech: Tech,
  maxT4 = Number.POSITIVE_INFINITY,
): DepthProfile {
  const ap = new Autopilot(p, AP_FULL);
  const g = new Grader(p);
  const tags: Reason[] = [];
  const real: RealStep[] = [];
  // the hardest step since the last placement
  let since: Reason | null = null;
  let anyStep = false;
  let stalls = 0;
  let stallOpen = false;
  let opener: string | null = null;
  let t4 = 0;
  let solved = true;
  const bump = (r: Reason): void => {
    if (since === null || DEPTH_RANK[r] > DEPTH_RANK[since]) since = r;
  };
  const placedNow = (r: Reason): void => {
    bump(r);
    let tag = since as Reason;
    if (tag === 'elim' && !anyStep && tags.length === 0) tag = 'free';
    tags.push(tag);
    if (opener === null) opener = tag === 'free' ? 'free' : `${tag}`;
    since = null;
    anyStep = true;
    if (stallOpen) stallOpen = false;
  };
  for (;;) {
    for (let s = ap.step(); s; s = ap.step()) {
      if (s.move === 'single') placedNow('elim');
      else if (s.move === 'line-single') placedNow('budget');
      else if (s.move === 'claim') {
        bump('claim');
        anyStep = true;
      } else {
        bump('budget');
        anyStep = true;
      }
    }
    if (ap.open().length === 0) break;
    g.cand.set(ap.cand);
    g.ghost.set(ap.ghost);
    const r = g.step(maxTech, t4 < maxT4);
    if (r === 'stuck' || r === 'contradiction') {
      solved = false;
      break;
    }
    if (r.tech === T1) throw new Error('depthProfile: the grader placed where the autopilot could');
    let kind: string;
    let reason: Reason;
    if (r.tech === T2) {
      reason = 'cross';
      kind = 'cross';
    } else if (r.tech === T3) {
      reason = 'count';
      kind = countKind(p, r.segments, r.rooms);
    } else {
      reason = 'chain';
      kind = 'chain';
      if (r.tech === T4) t4++;
    }
    real.push({ kind, at: tags.length });
    if (opener === null) opener = kind;
    if (!stallOpen) {
      stalls++;
      stallOpen = true;
    }
    bump(reason);
    anyStep = true;
    ap.cand.set(g.cand);
    ap.ghost.set(g.ghost);
  }
  // the autopilot's runs: ghosts placed by elim or free in a row
  let longestAuto = 0;
  let run = 0;
  for (const t of tags) {
    if (t === 'elim' || t === 'free') {
      run++;
      longestAuto = Math.max(longestAuto, run);
    } else run = 0;
  }
  let lastRealTag = -1;
  tags.forEach((t, i) => {
    if (REAL.has(t)) lastRealTag = i;
  });
  return {
    solved,
    tags,
    real,
    stalls,
    tail: lastRealTag < 0 ? tags.length : tags.length - 1 - lastRealTag,
    longestAuto,
    think: tags.filter((t) => THINK.has(t)).length,
    opener: opener ?? 'none',
  };
}
