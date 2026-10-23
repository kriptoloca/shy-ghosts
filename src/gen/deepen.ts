import { ROOM_ID_RADIX, ROOM_MIN_CELLS } from '../config';
import { canonicalIds, geometry, type Geometry } from '../core/house';
import { depthProfile, type DepthProfile } from './depth';
import type { Candidate } from './generate';
import { grade, type GradeResult, type Graded } from './grade';
import {
  DEEPEN_IDLE_PENALTY,
  DEEPEN_LESSON_PENALTY,
  DEEPEN_TRY_FACTOR,
  DEEPEN_W_AUTO,
  DEEPEN_W_D,
  DEEPEN_W_KIND,
  DEEPEN_W_LATER,
  DEEPEN_W_OPENER,
  DEEPEN_W_STALL,
  DEEPEN_W_T3,
  DEEPEN_W_TAIL,
  DEEPEN_W_THINK,
  ROOM_MAX_FACTOR,
  type Band,
} from './params';
import { idleObjects } from './relevance';
import { Rng } from './rng';
import { puzzleOf, type Puzzle } from './solve';

/**
 * The deepening search (GENERATOR.md §6.2; Gate B tune round 3, D94). Random rooms almost never
 * ask for two real insights spread through a solve, and those that do cost a d far over Gate A's
 * moving-average budget, so a ladder house is grown from a unique candidate by simulated
 * annealing over its room borders and its shelves:
 * - a move gives a border cell that is not a solution cell or a resident to a neighbouring room
 *   (rooms stay connected, ≥ ROOM_MIN_CELLS and ≤ ROOM_MAX_FACTOR × the mean), or moves a shelf to
 *   an empty cell that is not a solution cell, keeping the stored solution a solution; lamps never
 *   move;
 * - every house is graded in its canonical room ids, as the files store it (the grader's order
 *   follows the ids); the grader's steps are sound, so a house it finishes has exactly the one
 *   solution it placed, and no solver run is needed (as in relevance.ts);
 * - the score rewards the depth target (stalls, a later stall, the tail, the longest autopilot
 *   run, the real kinds, the opener) and the grade (d in the window, T3 where required); a house
 *   that meets the target loses points per idle object and when its lesson fails, and a literally
 *   idle object is dropped while the house still meets the target;
 * - a worse house is accepted with probability exp(Δ / T), T falling linearly from t0 to t1; a walk
 *   that has met no stall after `abortAt` of its evaluations stops.
 * Deterministic for its seed: the order of the random draws defines the houses (LADDER_STARTS).
 */

export interface DepthTarget {
  /** Stalls only a real insight ends, at least. */
  stalls: number;
  /** One real step after at least this many ghosts. */
  laterAt: number;
  /** Ghosts after the last real step, at most. */
  tail: number;
  /** The longest run of ghosts placed without a thought (free or elim), at most. */
  auto: number;
  /** The d window. */
  dMin: number;
  dMax: number;
  needT3: boolean;
  /** Distinct real kinds at least (count-2, count-3, count-4, cross; rows and columns alike). */
  kinds: number;
  /** The opener classes allowed (`openerClass`). */
  openers: readonly string[];
  /** The real-kind pattern it may not repeat (the house before it), or null. */
  banPattern: string | null;
}

/** count-row-2 and count-col-2 are one kind ("two rooms share two lines"). */
export function kindOf(kind: string): string {
  return kind.replace(/^count-(row|col)-/, 'count-');
}

/** The opener's class: the first real kind, or the pattern of the first ghost (budget, claim, free). */
export function openerClass(pr: DepthProfile): string {
  return pr.opener === 'elim' ? 'free' : kindOf(pr.opener);
}

/** The real kinds in order of first use ('count-2>cross'): the shape of a solve, house to house. */
export function patternOf(pr: DepthProfile): string {
  const out: string[] = [];
  for (const r of pr.real) {
    const k = kindOf(r.kind);
    if (!out.includes(k)) out.push(k);
  }
  return out.join('>');
}

/** What the target misses, by name (empty: met). */
export function missesOf(pr: DepthProfile, g: GradeResult, t: DepthTarget): string[] {
  const d = g.grade?.d ?? Number.POSITIVE_INFINITY;
  const out: string[] = [];
  if (!pr.solved) out.push('unsolved');
  if (pr.stalls < t.stalls) out.push('stalls');
  if (!pr.real.some((r) => r.at >= t.laterAt)) out.push('later');
  if (pr.tail > t.tail) out.push('tail');
  if (pr.longestAuto > t.auto) out.push('auto');
  if (d < t.dMin || d > t.dMax) out.push('d');
  if (t.needT3 && (g.grade?.t[2] ?? 0) === 0) out.push('t3');
  if (new Set(pr.real.map((r) => kindOf(r.kind))).size < t.kinds) out.push('kinds');
  if (!t.openers.includes(openerClass(pr))) out.push('opener');
  if (t.banPattern !== null && patternOf(pr) === t.banPattern) out.push('pattern');
  return out;
}

function score(pr: DepthProfile, g: GradeResult, t: DepthTarget): number {
  const d = g.grade?.d ?? Number.POSITIVE_INFINITY;
  let s = DEEPEN_W_STALL * Math.min(pr.stalls, t.stalls + 1);
  s -= DEEPEN_W_TAIL * Math.max(0, pr.tail - t.tail);
  s -= DEEPEN_W_AUTO * Math.max(0, pr.longestAuto - t.auto);
  if (!pr.real.some((r) => r.at >= t.laterAt)) s -= DEEPEN_W_LATER;
  s += DEEPEN_W_THINK * pr.think;
  s -= DEEPEN_W_D * (Math.max(0, d - t.dMax) + Math.max(0, t.dMin - d));
  if (t.needT3 && (g.grade?.t[2] ?? 0) === 0) s -= DEEPEN_W_T3;
  s += DEEPEN_W_KIND * Math.min(new Set(pr.real.map((r) => kindOf(r.kind))).size, t.kinds);
  if (!t.openers.includes(openerClass(pr))) s -= DEEPEN_W_OPENER;
  if (t.banPattern !== null && patternOf(pr) === t.banPattern) s -= DEEPEN_W_OPENER;
  return s;
}

function neighbours(n: number, i: number): number[] {
  const r = Math.floor(i / n);
  const c = i % n;
  const out: number[] = [];
  if (r > 0) out.push(i - n);
  if (c > 0) out.push(i - 1);
  if (c < n - 1) out.push(i + 1);
  if (r < n - 1) out.push(i + n);
  return out;
}

/** Room `x` stays connected without cell `c`. */
function connectedWithout(n: number, room: readonly number[], x: number, c: number): boolean {
  const cells: number[] = [];
  room.forEach((r, i) => {
    if (r === x && i !== c) cells.push(i);
  });
  const first = cells[0];
  if (first === undefined) return false;
  const seen = new Set([first]);
  const stack = [first];
  while (stack.length > 0) {
    const i = stack.pop() as number;
    for (const j of neighbours(n, i)) {
      if (j !== c && room[j] === x && !seen.has(j)) {
        seen.add(j);
        stack.push(j);
      }
    }
  }
  return seen.size === cells.length;
}

/** The stored solution is still a solution of these objects (every ghost free, none sees another). */
function solutionHolds(geo: Geometry, solution: readonly number[]): boolean {
  const set = new Set(solution);
  for (const c of solution) {
    if (!geo.candidate[c]) return false;
    for (const j of geo.sees[c] ?? []) if (set.has(j)) return false;
  }
  return true;
}

export interface Walk {
  evals: number;
  t0: number;
  t1: number;
  shelfShare: number;
  abortAt: number;
  /** The lesson's test on a finished house (null: none). */
  lesson: ((c: Candidate, g: GradeResult) => boolean) | null;
}

export interface Deepened {
  c: Candidate;
  g: Graded;
  pr: DepthProfile;
}

/** How a walk ended (for the tests and the build's report): the evaluations it made. */
export interface WalkTrace {
  evals: number;
  end: 'met' | 'aborted' | 'spent';
}

interface Eval {
  p: Puzzle;
  solution: number[];
  ids: number[];
  g: Graded;
  pr: DepthProfile;
  meets: boolean;
  lessonOk: boolean;
  idle: { literal: number[]; rule: number[] } | null;
  score: number;
}

/**
 * The walk from candidate `c` (its residents stay), with the band's techniques; the deepened
 * house, or null. `trace`, when given, records how the walk ended.
 */
export function deepen(
  c: Candidate,
  band: Pick<Band, 'maxTech' | 'maxT4'>,
  seed: number,
  w: Walk,
  t: DepthTarget,
  trace?: WalkTrace,
): Deepened | null {
  const rng = new Rng(seed);
  let objects = c.objects.split('');
  let geo: Geometry = geometry(c.n, c.objects);
  const givens = [...c.puzzle.givens];
  const room = [...c.puzzle.roomOf];
  const R = c.solution.length;
  const fixed = new Set([...c.solution, ...givens]);
  const max = (ROOM_MAX_FACTOR * geo.size) / R;
  const sizes = new Array<number>(R).fill(0);
  for (const r of room) sizes[r] = (sizes[r] as number) + 1;
  const opts = { maxTech: band.maxTech, maxT4: band.maxT4 };
  const candidateOf = (
    e: Pick<Eval, 'p' | 'solution' | 'ids'>,
    objs: readonly string[],
  ): Candidate => ({
    ...c,
    objects: objs.join(''),
    rooms: e.ids.map((id) => id.toString(ROOM_ID_RADIX)).join(''),
    solution: e.solution,
    puzzle: e.p,
  });
  const evalOf = (g0: Geometry, objs: readonly string[], rm: readonly number[]): Eval | null => {
    const canon = canonicalIds(rm);
    if (canon.map.size > ROOM_ID_RADIX) return null;
    const p = puzzleOf(g0, canon.ids, givens);
    const result = grade(p, opts);
    if (!result.ok || !result.grade) return null;
    const g: Graded = { ...result, grade: result.grade };
    const pr = depthProfile(p, band.maxTech, band.maxT4);
    const solution = new Array<number>(R).fill(-1);
    c.solution.forEach((cell, k) => {
      solution[canon.map.get(k) as number] = cell;
    });
    const meets = missesOf(pr, g, t).length === 0;
    let s = score(pr, g, t);
    let idle: Eval['idle'] = null;
    let lessonOk = true;
    if (meets) {
      if (w.lesson) {
        lessonOk = w.lesson(candidateOf({ p, solution, ids: canon.ids }, objs), g);
        if (!lessonOk) s -= DEEPEN_LESSON_PENALTY;
      }
      idle = idleObjects(p, solution, opts);
      s -= DEEPEN_IDLE_PENALTY * new Set([...idle.literal, ...idle.rule]).size;
    }
    return { p, solution, ids: canon.ids, g, pr, meets, lessonOk, idle, score: s };
  };
  const done = (e: Eval): boolean =>
    e.meets && e.lessonOk && e.idle !== null && e.idle.literal.length + e.idle.rule.length === 0;
  const end = (how: WalkTrace['end'], evals: number): void => {
    if (trace) {
      trace.evals = evals;
      trace.end = how;
    }
  };
  let cur = evalOf(geo, objects, room);
  if (!cur) {
    end('spent', 0);
    return null;
  }
  const accept = (ns: number, temp: number): boolean =>
    ns >= (cur as Eval).score ||
    rng.chance(Math.exp((ns - (cur as Eval).score) / Math.max(temp, Number.EPSILON)));
  let evals = 0;
  let tries = 0;
  let stalled = cur.pr.stalls > 0;
  while (evals < w.evals && tries < w.evals * DEEPEN_TRY_FACTOR) {
    tries++;
    if (done(cur)) {
      end('met', evals);
      return { c: candidateOf(cur, objects), g: cur.g, pr: cur.pr };
    }
    stalled ||= cur.pr.stalls > 0;
    if (!stalled && evals > w.abortAt * w.evals) {
      end('aborted', evals);
      return null;
    }
    if (cur.meets && cur.lessonOk && cur.idle && cur.idle.literal.length > 0) {
      // a literally idle object goes while the house still meets the target
      let dropped = false;
      for (const cell of cur.idle.literal) {
        const next = [...objects];
        next[cell] = '.';
        const g2 = geometry(c.n, next.join(''));
        if (!solutionHolds(g2, c.solution)) continue;
        evals++;
        const e = evalOf(g2, next, room);
        if (!e || !e.meets || !e.lessonOk) continue;
        objects = next;
        geo = g2;
        cur = e;
        dropped = true;
        break;
      }
      if (dropped) continue;
    }
    const temp = w.t0 + ((w.t1 - w.t0) * evals) / w.evals;
    if (rng.chance(w.shelfShare)) {
      const shelves = objects.flatMap((ch, i) => (ch === 'F' ? [i] : []));
      if (shelves.length === 0) continue;
      const a = rng.pick(shelves);
      const b = rng.int(0, geo.size - 1);
      if (objects[b] !== '.' || fixed.has(b)) continue;
      const next = [...objects];
      next[a] = '.';
      next[b] = 'F';
      const g2 = geometry(c.n, next.join(''));
      if (!solutionHolds(g2, c.solution)) continue;
      evals++;
      const e = evalOf(g2, next, room);
      if (e && accept(e.score, temp)) {
        cur = e;
        objects = next;
        geo = g2;
      }
      continue;
    }
    const i = rng.int(0, geo.size - 1);
    if (fixed.has(i)) continue;
    const x = room[i] as number;
    if ((sizes[x] as number) - 1 < ROOM_MIN_CELLS) continue;
    const ys = [...new Set(neighbours(geo.n, i).map((j) => room[j] as number))].filter(
      (y) => y !== x,
    );
    if (ys.length === 0) continue;
    const y = rng.pick(ys);
    if ((sizes[y] as number) + 1 > max) continue;
    if (!connectedWithout(geo.n, room, x, i)) continue;
    room[i] = y;
    evals++;
    const e = evalOf(geo, objects, room);
    if (e && accept(e.score, temp)) {
      cur = e;
      sizes[x] = (sizes[x] as number) - 1;
      sizes[y] = (sizes[y] as number) + 1;
    } else room[i] = x;
  }
  if (done(cur)) {
    end('met', evals);
    return { c: candidateOf(cur, objects), g: cur.g, pr: cur.pr };
  }
  end('spent', evals);
  return null;
}
