import {
  EST_PER_EMPTY_CELL,
  EST_T1,
  EST_T2,
  EST_T3,
  EST_T4,
  T1,
  T2,
  T3,
  T3_K_MAX,
  T3_K_MIN,
  T4,
  TECHS,
  WEIGHT_T1,
  WEIGHT_T2,
  WEIGHT_T3_BASE,
  WEIGHT_T4,
  type Tech,
} from './params';
import type { Puzzle } from './solve';

/** A house's grade (GENERATOR.md §1.1, §4.3). */
export interface Grade {
  /** The sum of the step weights. */
  d: number;
  /** The highest technique used. */
  maxTech: Tech;
  /** All steps, T1 to T4. */
  steps: number;
  /** The brief's formula (§4.4, D18). */
  estSeconds: number;
  /** Steps per technique, T1..T4 (D13). */
  t: [number, number, number, number];
  /** Maximal runs of non-T1 steps: the moments the player must deduce (D13). */
  episodes: number;
}

export interface GradeResult {
  /** Solved with the techniques allowed (and no more T4 steps than allowed). */
  ok: boolean;
  /** The techniques of the steps taken, in order. */
  path: Tech[];
  /** The ghosts placed, givens included (the solution when ok). */
  placed: number[];
  grade: Grade | null;
}

export interface GradeOptions {
  /** The highest technique the band allows. */
  maxTech: Tech;
  /** T4 steps allowed (D8: one in a manor); default unlimited. */
  maxT4?: number;
}

/** Maximal runs of non-T1 steps in a path (§4.3). */
export function episodesOf(path: readonly Tech[]): number {
  let runs = 0;
  let inRun = false;
  for (const t of path) {
    if (t !== T1 && !inRun) runs++;
    inRun = t !== T1;
  }
  return runs;
}

/** One technique instance: what it did, for the trace. */
export interface Step {
  tech: Tech;
  weight: number;
  /** T1: the cell placed. */
  placed: number | null;
  /** T2, T3, T4: the candidates removed. */
  removed: number[];
}

/**
 * The human-like grader's state (GENERATOR.md §4): candidates (empty, unlit cells; T0 removes what
 * a placed ghost sees and the rest of its room), the ghost of each room. `step` applies the
 * cheapest technique that makes progress, one instance at a time, in the instance order of §4.3,
 * so every build agrees.
 */
export class Grader {
  /** 1 while the cell is a candidate. */
  readonly cand: Uint8Array;
  /** The cell of each room's ghost, or −1. */
  readonly ghost: Int32Array;

  constructor(readonly p: Puzzle) {
    this.cand = Uint8Array.from(p.candidate, (c) => (c ? 1 : 0));
    this.ghost = new Int32Array(p.roomCount).fill(-1);
    for (const g of p.givens) this.place(this.cand, this.ghost, g);
  }

  /** Rooms without a ghost, ascending. */
  unsettled(): number[] {
    const out: number[] = [];
    this.ghost.forEach((g, r) => {
      if (g < 0) out.push(r);
    });
    return out;
  }

  count(room: number, cand: Uint8Array = this.cand): number {
    let k = 0;
    for (const c of this.p.roomCells[room] ?? []) k += cand[c] as number;
    return k;
  }

  /** The next step with techniques up to `maxTech`, or 'stuck', or 'contradiction'. */
  step(maxTech: Tech, allowT4 = true): Step | 'stuck' | 'contradiction' {
    const U = this.unsettled();
    const counts = new Map(U.map((r) => [r, this.count(r)]));
    if ([...counts.values()].some((k) => k === 0)) return 'contradiction';
    // T1, by room id
    for (const r of U) {
      if (counts.get(r) === 1) {
        const c = (this.p.roomCells[r] ?? []).find((x) => this.cand[x] === 1) as number;
        this.place(this.cand, this.ghost, c);
        return { tech: T1, weight: WEIGHT_T1, placed: c, removed: [] };
      }
    }
    // T2 and T4 go over the tightest room first (ties: the lower id), cells in reading order
    const order = [...U].sort(
      (a, b) => (counts.get(a) as number) - (counts.get(b) as number) || a - b,
    );
    if (maxTech >= T2) {
      const x = this.findT2(U, order);
      if (x !== null) {
        this.cand[x] = 0;
        return { tech: T2, weight: WEIGHT_T2, placed: null, removed: [x] };
      }
    }
    if (maxTech >= T3) {
      const t3 = this.findT3(U);
      if (t3) {
        for (const c of t3.removed) this.cand[c] = 0;
        return { tech: T3, weight: WEIGHT_T3_BASE + t3.k, placed: null, removed: t3.removed };
      }
    }
    if (maxTech >= T4 && allowT4) {
      for (const X of order) {
        for (const x of this.p.roomCells[X] ?? []) {
          if (this.cand[x] === 1 && this.contradicts(x)) {
            this.cand[x] = 0;
            return { tech: T4, weight: WEIGHT_T4, placed: null, removed: [x] };
          }
        }
      }
    }
    return 'stuck';
  }

  /** T0: a ghost on `c` settles its room and removes every cell it sees. */
  private place(cand: Uint8Array, ghost: Int32Array, c: number): void {
    const room = this.p.roomOf[c] as number;
    ghost[room] = c;
    for (const j of this.p.roomCells[room] ?? []) cand[j] = 0;
    for (const j of this.p.sees[c] ?? []) cand[j] = 0;
  }

  /** T2: a candidate whose ghost would see every candidate of another unsettled room. */
  private findT2(U: readonly number[], order: readonly number[]): number | null {
    const sight = new Uint8Array(this.p.size);
    for (const X of order) {
      for (const x of this.p.roomCells[X] ?? []) {
        if (this.cand[x] !== 1) continue;
        sight.fill(0);
        for (const j of this.p.sees[x] ?? []) sight[j] = 1;
        for (const Y of U) {
          if (Y === X) continue;
          let open = false;
          for (const j of this.p.roomCells[Y] ?? []) {
            if (this.cand[j] === 1 && sight[j] === 0) {
              open = true;
              break;
            }
          }
          if (!open) return x;
        }
      }
    }
    return null;
  }

  /**
   * T3: k unsettled rooms (k = 2…4) whose candidates all lie inside exactly k row segments (or k
   * column segments, never mixed) fill them, so the other rooms' candidates there go. By k, rows
   * before columns, room sets in lexicographic order; only a set that removes something counts.
   */
  private findT3(U: readonly number[]): { k: number; removed: number[] } | null {
    const kMax = Math.min(T3_K_MAX, U.length);
    for (let k = T3_K_MIN; k <= kMax; k++) {
      for (const segOf of [this.p.rowSeg, this.p.colSeg]) {
        const segsOf = new Map<number, Set<number>>();
        for (const r of U) {
          const segs = new Set<number>();
          for (const c of this.p.roomCells[r] ?? [])
            if (this.cand[c] === 1) segs.add(segOf[c] as number);
          segsOf.set(r, segs);
        }
        const pool = U.filter((r) => (segsOf.get(r) as Set<number>).size <= k);
        const combo: number[] = [];
        const search = (start: number): number[] | null => {
          if (combo.length === k) {
            const union = new Set<number>();
            for (const r of combo) for (const s of segsOf.get(r) as Set<number>) union.add(s);
            if (union.size !== k) return null;
            const removed: number[] = [];
            for (const s of union) {
              for (const c of this.p.segments[s]?.cells ?? []) {
                if (this.cand[c] === 1 && !combo.includes(this.p.roomOf[c] as number))
                  removed.push(c);
              }
            }
            return removed.length > 0 ? removed.sort((a, b) => a - b) : null;
          }
          for (let i = start; i < pool.length; i++) {
            combo.push(pool[i] as number);
            const found = search(i + 1);
            combo.pop();
            if (found) return found;
          }
          return null;
        };
        const removed = search(0);
        if (removed) return { k, removed };
      }
    }
    return null;
  }

  /** T4: a ghost on `x`, then T0–T1 until nothing changes, leaves a room with no candidate. */
  private contradicts(x: number): boolean {
    const cand = Uint8Array.from(this.cand);
    const ghost = Int32Array.from(this.ghost);
    this.place(cand, ghost, x);
    for (;;) {
      let progressed = false;
      for (let r = 0; r < this.p.roomCount; r++) {
        if ((ghost[r] as number) >= 0) continue;
        const k = this.count(r, cand);
        if (k === 0) return true;
        if (k === 1) {
          const c = (this.p.roomCells[r] ?? []).find((j) => cand[j] === 1) as number;
          this.place(cand, ghost, c);
          progressed = true;
        }
      }
      if (!progressed) return false;
    }
  }
}

/**
 * Grades a puzzle (GENERATOR.md §4): steps until every room holds a ghost, with the techniques up
 * to `maxTech` and at most `maxT4` T4 steps. Not ok when it gets stuck or meets a contradiction:
 * the house would need a guess at this band (no guessing, §4.3).
 */
export function grade(p: Puzzle, opts: GradeOptions): GradeResult {
  const g = new Grader(p);
  const path: Tech[] = [];
  let d = 0;
  let t4 = 0;
  const maxT4 = opts.maxT4 ?? Number.POSITIVE_INFINITY;
  let ok = true;
  while (g.unsettled().length > 0) {
    const s = g.step(opts.maxTech, t4 < maxT4);
    if (s === 'stuck' || s === 'contradiction') {
      ok = false;
      break;
    }
    path.push(s.tech);
    d += s.weight;
    if (s.tech === T4) t4++;
  }
  const placed = Array.from(g.ghost).filter((c) => c >= 0);
  if (!ok) return { ok, path, placed, grade: null };
  const t = TECHS.map((tech) => path.filter((s) => s === tech).length) as Grade['t'];
  const [n1, n2, n3, n4] = t;
  const empty = p.objects.filter((o) => o === '.').length;
  return {
    ok,
    path,
    placed,
    grade: {
      d,
      maxTech: path.reduce<Tech>((m, s) => (s > m ? s : m), T1),
      steps: path.length,
      estSeconds:
        EST_T1 * n1 + EST_T2 * n2 + EST_T3 * n3 + EST_T4 * n4 + EST_PER_EMPTY_CELL * empty,
      t,
      episodes: episodesOf(path),
    },
  };
}
