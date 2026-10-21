import { Grader, type Insight } from './grade';
import { T1, T4, type Tech } from './params';
import type { Puzzle } from './solve';

/**
 * The autopilot (GENERATOR.md §4.7; Gate B tune round 2): a bot that plays only the one-look
 * patterns a Queens or Star Battle player uses without stopping to think, so the build can tell a
 * house that asks for something from one a player solves on autopilot:
 * - single: a room with one free cell takes its ghost;
 * - claim: a room whose free cells all lie in one row (or column) segment claims it, and the other
 *   rooms' free cells there go (the grader's `shape`, `lamp` and `line` steps);
 * - the budget: when one direction has exactly as many open segments as there are open rooms,
 *   every open segment must hold a ghost; then a segment with one free cell takes it (line
 *   single), and a segment whose free cells all lie in one room holds that room's ghost (line
 *   claim).
 * What it lacks are the real insights: a cross (a cell that sees a whole room from two sides), a
 * count (k rooms filling k lines) and a chain (if here, then that room is empty). Every pattern is
 * sound, so on a house with a solution it never removes a cell of that solution.
 */
export type ApMove = 'single' | 'line-single' | 'claim' | 'line-claim';

/**
 * Which patterns it knows. The budget over whole lines only applies on a board whose lines no
 * object splits (the Queens rule); over segments it counts a split line as two (a shelf's line
 * holds two ghosts); 'segments-litblind' is a player who has not yet seen that a fully lit
 * segment stays empty, and still counts it as one that needs a ghost.
 */
export interface ApOptions {
  claims: boolean;
  budget: 'none' | 'lines' | 'segments' | 'segments-litblind';
}

/** Every quick pattern: what a practised player of the genre does at a glance. */
export const AP_FULL: ApOptions = { claims: true, budget: 'segments' };

export class Autopilot {
  /** 1 while the cell is free: empty, unlit, unseen, in a room without a ghost. */
  readonly cand: Uint8Array;
  /** The cell of each room's ghost, or −1. */
  readonly ghost: Int32Array;

  constructor(
    readonly p: Puzzle,
    readonly opts: ApOptions = AP_FULL,
  ) {
    this.cand = Uint8Array.from(p.candidate, (c) => (c ? 1 : 0));
    this.ghost = new Int32Array(p.roomCount).fill(-1);
    for (const g of p.givens) this.place(g);
  }

  place(c: number): void {
    const room = this.p.roomOf[c] as number;
    this.ghost[room] = c;
    for (const j of this.p.roomCells[room] ?? []) this.cand[j] = 0;
    for (const j of this.p.sees[c] ?? []) this.cand[j] = 0;
  }

  /** Rooms without a ghost, ascending. */
  open(): number[] {
    const out: number[] = [];
    this.ghost.forEach((g, r) => {
      if (g < 0) out.push(r);
    });
    return out;
  }

  private free(room: number): number[] {
    return (this.p.roomCells[room] ?? []).filter((c) => this.cand[c] === 1);
  }

  /** The budget may be used along this axis: over segments always; over lines if none is split. */
  private budgetOn(axis: 'row' | 'col'): boolean {
    const b = this.opts.budget;
    if (b === 'none') return false;
    if (b !== 'lines') return true;
    const lines = new Set<number>();
    for (const s of this.p.segments) {
      if (s.axis !== axis) continue;
      if (lines.has(s.line)) return false;
      lines.add(s.line);
    }
    return true;
  }

  /** The open segments of one axis, as their free cells. */
  private openSegments(axis: 'row' | 'col'): number[][] {
    const out: number[][] = [];
    for (const s of this.p.segments) {
      if (s.axis !== axis) continue;
      const cells = s.cells.filter((c) => this.cand[c] === 1);
      if (cells.length > 0) out.push(cells);
      else if (this.opts.budget === 'segments-litblind' && s.cells.every((c) => this.p.lit[c])) {
        out.push(cells);
      }
    }
    return out;
  }

  /** One move, or null when it stalls. It throws on a contradiction (never on a sound house). */
  step(): { move: ApMove; placed: number | null } | null {
    const open = this.open();
    for (const r of open) {
      const f = this.free(r);
      if (f.length === 0) throw new Error('autopilot: a room without a free cell');
      if (f.length === 1) {
        const c = f[0] as number;
        this.place(c);
        return { move: 'single', placed: c };
      }
    }
    for (const axis of ['row', 'col'] as const) {
      if (!this.budgetOn(axis)) continue;
      const segs = this.openSegments(axis);
      if (segs.length !== open.length) continue;
      const one = segs.find((s) => s.length === 1);
      if (one) {
        const c = one[0] as number;
        this.place(c);
        return { move: 'line-single', placed: c };
      }
    }
    if (this.opts.claims) {
      for (const r of open) {
        const f = this.free(r);
        for (const segOf of [this.p.rowSeg, this.p.colSeg]) {
          const seg = segOf[f[0] as number] as number;
          if (!f.every((c) => segOf[c] === seg)) continue;
          let did = false;
          for (const c of this.p.segments[seg]?.cells ?? []) {
            if (this.cand[c] === 1 && this.p.roomOf[c] !== r) {
              this.cand[c] = 0;
              did = true;
            }
          }
          if (did) return { move: 'claim', placed: null };
        }
      }
    }
    for (const axis of ['row', 'col'] as const) {
      if (!this.budgetOn(axis)) continue;
      const segs = this.openSegments(axis);
      if (segs.length !== open.length) continue;
      for (const s of segs) {
        if (s.length === 0) continue;
        const room = this.p.roomOf[s[0] as number] as number;
        if (!s.every((c) => this.p.roomOf[c] === room)) continue;
        const inside = new Set(s);
        let did = false;
        for (const c of this.free(room)) {
          if (!inside.has(c)) {
            this.cand[c] = 0;
            did = true;
          }
        }
        if (did) return { move: 'line-claim', placed: null };
      }
    }
    return null;
  }
}

export interface ApProfile {
  /** Finished: the autopilot, with the band's grader supplying each real insight. */
  solved: boolean;
  /** The autopilot alone finishes the house. */
  apSolved: boolean;
  /** Ghosts it places before the first stall (residents not counted). */
  opening: number;
  /** How the first ghost came: its pattern, or 'insight' when a real insight came first. */
  firstGhost: ApMove | 'insight' | null;
  /** Per stall (a moment the autopilot cannot go on), the real insights it took. */
  stalls: Insight[][];
  /** Ghosts placed before each stall. */
  stallAt: number[];
  /** The kinds of real insight used. */
  kinds: Insight[];
  /** Its moves by pattern over the whole solve. */
  moves: Record<ApMove, number>;
  /** Real insight steps over the whole solve. */
  realSteps: number;
}

/**
 * The autopilot on a house; where it stalls, the band's grader supplies the next real step (a
 * cross, a count or a chain: every claim is the autopilot's own). The real steps between two
 * placements form one stall.
 */
export function apProfile(
  p: Puzzle,
  maxTech: Tech,
  maxT4 = Number.POSITIVE_INFINITY,
  opts: ApOptions = AP_FULL,
): ApProfile {
  const ap = new Autopilot(p, opts);
  const g = new Grader(p);
  const moves: Record<ApMove, number> = { single: 0, 'line-single': 0, claim: 0, 'line-claim': 0 };
  const stalls: Insight[][] = [];
  const stallAt: number[] = [];
  let placed = 0;
  let opening = -1;
  let firstGhost: ApProfile['firstGhost'] = null;
  let current: Insight[] | null = null;
  let realSteps = 0;
  let t4 = 0;
  let solved = true;
  for (;;) {
    for (let s = ap.step(); s; s = ap.step()) {
      moves[s.move]++;
      if (s.placed === null) continue;
      firstGhost ??= s.move;
      placed++;
      if (current) {
        stalls.push(current);
        current = null;
      }
    }
    if (ap.open().length === 0) break;
    if (opening < 0) opening = placed;
    firstGhost ??= 'insight';
    g.cand.set(ap.cand);
    g.ghost.set(ap.ghost);
    const r = g.step(maxTech, t4 < maxT4);
    if (r === 'stuck' || r === 'contradiction') {
      solved = false;
      break;
    }
    if (r.tech === T1) throw new Error('apProfile: the grader placed where the autopilot could');
    if (r.tech === T4) t4++;
    realSteps++;
    if (!current) {
      current = [];
      stallAt.push(placed);
    }
    current.push(r.insight as Insight);
    ap.cand.set(g.cand);
    ap.ghost.set(g.ghost);
  }
  if (current) stalls.push(current);
  if (opening < 0) opening = placed;
  return {
    solved,
    apSolved: solved && stalls.length === 0,
    opening,
    firstGhost,
    stalls,
    stallAt,
    kinds: [...new Set(stalls.flat())],
    moves,
    realSteps,
  };
}

/** Ghosts an autopilot with these patterns places from the start before it stalls. */
export function apOpening(p: Puzzle, opts: ApOptions): { placed: number; solved: boolean } {
  const ap = new Autopilot(p, opts);
  let placed = 0;
  for (let s = ap.step(); s; s = ap.step()) if (s.placed !== null) placed++;
  return { placed, solved: ap.open().length === 0 };
}

/** A free opening: on the first look, a room with one free cell or a line single. */
export function freebie(p: Puzzle): boolean {
  const s = new Autopilot(p, AP_FULL).step();
  return s !== null && s.placed !== null;
}

/**
 * How a house opens: the patterns used up to the first ghost and the one that places it
 * ('claim>single'; 'free>single' is a room with one free cell on the first look), or, when the
 * autopilot stalls before the first ghost, the real insight that comes first ('cross',
 * 'count-row-2' for two rooms filling two row segments, 'chain'), or 'stuck'.
 */
export function openingOf(p: Puzzle, maxTech: Tech): string {
  const ap = new Autopilot(p, AP_FULL);
  const used = new Set<string>();
  for (let s = ap.step(); s; s = ap.step()) {
    if (s.placed !== null) return `${[...used].sort().join('+') || 'free'}>${s.move}`;
    used.add(s.move);
  }
  const g = new Grader(p);
  g.cand.set(ap.cand);
  g.ghost.set(ap.ghost);
  const r = g.step(maxTech, true);
  if (r === 'stuck' || r === 'contradiction') return 'stuck';
  if (r.insight === 'count') {
    const axis = p.segments[r.segments[0] as number]?.axis ?? 'row';
    return `count-${axis}-${String(r.rooms.length)}`;
  }
  return r.insight ?? 'stuck';
}
