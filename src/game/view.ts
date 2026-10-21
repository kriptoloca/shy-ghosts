import type { HouseModel } from '../core/house';
import type { GhostStatus, PlayEvent, PlayState } from '../core/state';

/** What the screen shows of a board once its motion has settled (CLAUDE.md: it equals the rules). */
export interface ViewState {
  /** Every ghost on the board, residents included, with the state it shows; by cell. */
  ghosts: [number, GhostStatus][];
  marks: number[];
  /** Rooms that glow (settled). */
  settled: number[];
  solved: boolean;
}

/**
 * The Game scene's picture of the board, changed only by playing back the rules' events
 * (CLAUDE.md: the rules resolve at once in src/core, the scene only plays them back). The display
 * draws this, and the e2e checks that what is drawn equals the rules after every move.
 */
export class BoardView {
  readonly ghosts = new Map<number, GhostStatus>();
  readonly marks = new Set<number>();
  readonly glowing = new Set<number>();
  solved = false;

  private constructor(readonly house: HouseModel) {}

  /** The board as the rules hold it now (a new house, or one restored from the save). */
  static of(state: PlayState): BoardView {
    const v = new BoardView(state.house);
    for (const c of state.ghostCells()) v.ghosts.set(c, state.statusAt(c) as GhostStatus);
    for (const m of state.markedCells()) v.marks.add(m);
    for (let r = 0; r < state.house.roomCount; r++) if (state.isSettled(r)) v.glowing.add(r);
    v.solved = state.solved;
    return v;
  }

  /** Plays one move's events (D41). */
  play(events: readonly PlayEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'placed':
          // its `status` follows in the same list (D41)
          this.ghosts.set(e.cell, 'calm');
          break;
        case 'relocated': {
          const st = this.ghosts.get(e.from) ?? 'calm';
          this.ghosts.delete(e.from);
          this.ghosts.set(e.to, st);
          break;
        }
        case 'removed':
          this.ghosts.delete(e.cell);
          break;
        case 'marked':
          for (const c of e.cells) {
            if (e.on) this.marks.add(c);
            else this.marks.delete(c);
          }
          break;
        case 'status':
          this.ghosts.set(e.cell, e.to);
          break;
        case 'settled':
          this.glowing.add(e.room);
          break;
        case 'unsettled':
          this.glowing.delete(e.room);
          break;
        case 'solved':
          this.solved = true;
          break;
        case 'nudged':
          break;
      }
    }
  }

  isResident(cell: number): boolean {
    return this.house.givens.includes(cell);
  }

  /** Pairs of ghosts on the board that see each other, each pair once (a < b), by cell. */
  sightPairs(): [number, number][] {
    const out: [number, number][] = [];
    const cells = [...this.ghosts.keys()].sort((a, b) => a - b);
    for (const a of cells) {
      for (const b of this.house.sees[a] ?? []) if (b > a && this.ghosts.has(b)) out.push([a, b]);
    }
    return out;
  }

  /** The ghosts that see the ghost on `cell`, ascending. */
  seenBy(cell: number): number[] {
    return (this.house.sees[cell] ?? []).filter((c) => this.ghosts.has(c));
  }

  snapshot(): ViewState {
    return {
      ghosts: [...this.ghosts.entries()].sort((a, b) => a[0] - b[0]),
      marks: [...this.marks].sort((a, b) => a - b),
      settled: [...this.glowing].sort((a, b) => a - b),
      solved: this.solved,
    };
  }
}
