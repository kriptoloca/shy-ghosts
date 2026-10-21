import { hintStep } from './hint';
import type { HouseModel } from './house';

/** A ghost's state (GDD §3). A ghost both seen and lit is shown as seen (D26). */
export type GhostStatus = 'calm' | 'seen' | 'lit';

/** A drag paints marks, or erases them when it starts on a marked cell (GDD §3.1). */
export type StrokeMode = 'paint' | 'erase';

/**
 * What a move did, in the order the scene plays it back (GENERATOR.md §2, D41): the move's own
 * events first (`placed`, `relocated`, `removed`, `nudged`, `marked`); then a `status` for every
 * ghost on the board whose state changed, in reading order (always for the ghost that was placed
 * or moved; `from` is null for a new one; a removed ghost gets none); then `settled` and
 * `unsettled` by room id; `solved` last.
 */
export type PlayEvent =
  | { type: 'placed'; cell: number; room: number }
  | { type: 'relocated'; from: number; to: number; room: number }
  | { type: 'removed'; cell: number; room: number }
  /** A tap on furniture, a lamp or a given, or on a given's room: `cell` is what nudges. */
  | { type: 'nudged'; cell: number }
  | { type: 'marked'; cells: number[]; on: boolean }
  | { type: 'status'; cell: number; from: GhostStatus | null; to: GhostStatus }
  | { type: 'settled'; room: number }
  | { type: 'unsettled'; room: number }
  | { type: 'solved' };

/** What a save keeps of the board (GDD §9): the player's ghosts and the marks, ascending. */
export interface BoardSave {
  ghosts: readonly number[];
  marks: readonly number[];
}

/** An applied move, kept so undo can revert it (D21: the history lives for the session). */
type Change =
  | { kind: 'place'; cell: number; room: number; unmarked: boolean }
  | { kind: 'relocate'; from: number; to: number; room: number; unmarked: boolean }
  | { kind: 'remove'; cell: number; room: number }
  | { kind: 'mark'; cells: readonly number[]; on: boolean };

/** No ghost in the room. */
const NO_GHOST = -1;

/**
 * The play state of one house (GDD §3, GENERATOR.md §2): the ghost of each room (one at most),
 * the givens, the marks, the undo history, and what follows from them (each ghost's state, the
 * settled rooms, the win). Every move resolves at once and returns its events; the scene only
 * plays them back. Once solved, the board takes no more moves.
 */
export class PlayState {
  /** The cell of each room's ghost, or NO_GHOST. */
  private readonly ghost: number[];
  /** The room's ghost is a given (it never moves). */
  private readonly given: boolean[];
  private readonly mark: boolean[];
  /** Each cell's ghost state; null where no ghost stands. */
  private status: (GhostStatus | null)[];
  private settled: boolean[];
  private readonly history: Change[] = [];

  constructor(readonly house: HouseModel) {
    this.ghost = new Array<number>(house.roomCount).fill(NO_GHOST);
    this.given = new Array<boolean>(house.roomCount).fill(false);
    this.mark = new Array<boolean>(house.size).fill(false);
    for (const g of house.givens) {
      const room = house.roomOf[g] as number;
      this.ghost[room] = g;
      this.given[room] = true;
    }
    this.status = this.computeStatus();
    this.settled = this.computeSettled();
  }

  /**
   * A house in progress from its save (GDD §9): the player's ghosts and the marks, without the
   * undo history (D21). Never throws: anything that does not fit the house is left out (a ghost
   * off the board, on furniture or a lamp, in a given's room or in a room already holding one,
   * the lower cell first; a mark off the board or under a ghost).
   */
  static restore(house: HouseModel, save: Partial<BoardSave> | null | undefined): PlayState {
    const s = new PlayState(house);
    const cells = (v: unknown): number[] =>
      Array.isArray(v)
        ? [...new Set(v.filter((c): c is number => s.isCell(c)))].sort((a, b) => a - b)
        : [];
    for (const c of cells(save?.ghosts)) {
      const room = house.roomOf[c] as number;
      if (!house.blocked[c] && s.ghost[room] === NO_GHOST) s.ghost[room] = c;
    }
    for (const c of cells(save?.marks)) if (s.canMark(c)) s.mark[c] = true;
    s.status = s.computeStatus();
    s.settled = s.computeSettled();
    return s;
  }

  // ---- what the board shows ---------------------------------------------------------------------

  /** Every room holds one calm ghost (GDD §3); with one solution, it is the stored solution. */
  get solved(): boolean {
    return this.settled.every(Boolean);
  }

  get canUndo(): boolean {
    return !this.solved && this.history.length > 0;
  }

  /** The cell of the room's ghost, or null. */
  ghostOf(room: number): number | null {
    const g = this.ghost[room];
    return g === undefined || g === NO_GHOST ? null : g;
  }

  /** Every ghost on the board, givens included, ascending. */
  ghostCells(): number[] {
    return this.ghost.filter((g) => g !== NO_GHOST).sort((a, b) => a - b);
  }

  isGiven(cell: number): boolean {
    const room = this.house.roomOf[cell];
    return room !== undefined && this.given[room] === true && this.ghost[room] === cell;
  }

  isMarked(cell: number): boolean {
    return this.mark[cell] === true;
  }

  markedCells(): number[] {
    return this.mark.flatMap((m, i) => (m ? [i] : []));
  }

  /** The state of the ghost on `cell`, or null when none stands there. */
  statusAt(cell: number): GhostStatus | null {
    return this.status[cell] ?? null;
  }

  /** The room holds one ghost and it is calm (GDD §3). */
  isSettled(room: number): boolean {
    return this.settled[room] === true;
  }

  /** A drag that starts on `cell` erases marks when the cell is marked, else paints (GDD §3.1). */
  strokeModeAt(cell: number): StrokeMode {
    return this.isMarked(cell) ? 'erase' : 'paint';
  }

  /** The board for the save (GDD §9): the player's ghosts (not the givens) and the marks. */
  serialize(): { ghosts: number[]; marks: number[] } {
    return {
      ghosts: this.ghost
        .filter((g, room) => g !== NO_GHOST && !this.given[room])
        .sort((a, b) => a - b),
      marks: this.markedCells(),
    };
  }

  // ---- moves (GENERATOR.md §2) ------------------------------------------------------------------

  /**
   * A tap (GDD §3.1): on an empty cell → a ghost appears and the mark there goes, or the room's
   * ghost glides there (relocation), or a given in that room nudges; on a placed ghost → it is
   * removed; on furniture, a lamp or a given → a nudge, which is not a move.
   */
  tap(cell: number): PlayEvent[] {
    if (this.solved || !this.isCell(cell)) return [];
    if (this.house.blocked[cell]) return [{ type: 'nudged', cell }];
    const room = this.house.roomOf[cell] as number;
    const g = this.ghost[room] as number;
    const unmarked = this.isMarked(cell);
    if (g === cell) {
      if (this.given[room]) return [{ type: 'nudged', cell }];
      return this.record({ kind: 'remove', cell, room });
    }
    if (g === NO_GHOST) return this.record({ kind: 'place', cell, room, unmarked });
    if (this.given[room]) return [{ type: 'nudged', cell: g }];
    return this.record({ kind: 'relocate', from: g, to: cell, room, unmarked });
  }

  /**
   * A drag over `cells` (GDD §3.1, D21): paint marks every empty, ghost-free, unmarked cell it
   * covers (lit cells included, the starting cell included); erase clears every marked one. One
   * move; a stroke that changes nothing is none.
   */
  stroke(cells: readonly number[], mode: StrokeMode): PlayEvent[] {
    if (this.solved) return [];
    const done = new Set<number>();
    const targets: number[] = [];
    for (const c of cells) {
      if (!this.isCell(c) || done.has(c)) continue;
      done.add(c);
      const changes = mode === 'paint' ? this.canMark(c) && !this.isMarked(c) : this.isMarked(c);
      if (changes) targets.push(c);
    }
    if (targets.length === 0) return [];
    return this.record({ kind: 'mark', cells: targets, on: mode === 'paint' });
  }

  /** Reverts the last move of any kind, a hint's included (GDD §3.1); unlimited. */
  undo(): PlayEvent[] {
    if (this.solved) return [];
    const change = this.history.pop();
    if (!change) return [];
    return this.resolve(() => this.revert(change));
  }

  /** The hint (GDD §3.1, `hintStep`), applied as a move: undo takes it back like any other. */
  hint(): PlayEvent[] {
    if (this.solved) return [];
    const step = hintStep(
      this.house,
      this.ghost.map((g) => (g === NO_GHOST ? null : g)),
    );
    if (!step) return [];
    const room = this.house.roomOf[step.cell] as number;
    if (step.kind === 'remove') {
      return this.given[room] ? [] : this.record({ kind: 'remove', cell: step.cell, room });
    }
    return this.record({
      kind: 'place',
      cell: step.cell,
      room,
      unmarked: this.isMarked(step.cell),
    });
  }

  // ---- internals --------------------------------------------------------------------------------

  private isCell(v: unknown): v is number {
    return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < this.house.size;
  }

  /** Marks go only on empty, ghost-free cells (D21). */
  private canMark(cell: number): boolean {
    const room = this.house.roomOf[cell] as number;
    return !this.house.blocked[cell] && this.ghost[room] !== cell;
  }

  private record(change: Change): PlayEvent[] {
    const events = this.resolve(() => this.apply(change));
    this.history.push(change);
    return events;
  }

  /** Changes the board, then appends what follows from it in playback order (`PlayEvent`). */
  private resolve(change: () => PlayEvent[]): PlayEvent[] {
    const ghostBefore = [...this.ghost];
    const statusBefore = this.status;
    const settledBefore = this.settled;
    const wasSolved = this.solved;
    const events = change();
    this.status = this.computeStatus();
    this.settled = this.computeSettled();
    const changed: { cell: number; from: GhostStatus | null; to: GhostStatus }[] = [];
    this.ghost.forEach((now, room) => {
      if (now === NO_GHOST) return;
      const was = ghostBefore[room] as number;
      const from = was === NO_GHOST ? null : (statusBefore[was] ?? null);
      const to = this.status[now] as GhostStatus;
      if (was !== now || from !== to) changed.push({ cell: now, from, to });
    });
    changed.sort((a, b) => a.cell - b.cell);
    for (const c of changed) events.push({ type: 'status', ...c });
    this.settled.forEach((on, room) => {
      if (on !== settledBefore[room]) events.push({ type: on ? 'settled' : 'unsettled', room });
    });
    if (!wasSolved && this.solved) events.push({ type: 'solved' });
    return events;
  }

  private apply(c: Change): PlayEvent[] {
    switch (c.kind) {
      case 'place':
        this.ghost[c.room] = c.cell;
        return [{ type: 'placed', cell: c.cell, room: c.room }, ...this.unmark(c.unmarked, c.cell)];
      case 'relocate':
        this.ghost[c.room] = c.to;
        return [
          { type: 'relocated', from: c.from, to: c.to, room: c.room },
          ...this.unmark(c.unmarked, c.to),
        ];
      case 'remove':
        this.ghost[c.room] = NO_GHOST;
        return [{ type: 'removed', cell: c.cell, room: c.room }];
      case 'mark':
        for (const cell of c.cells) this.mark[cell] = c.on;
        return [{ type: 'marked', cells: [...c.cells], on: c.on }];
    }
  }

  private revert(c: Change): PlayEvent[] {
    switch (c.kind) {
      case 'place':
        this.ghost[c.room] = NO_GHOST;
        return [
          { type: 'removed', cell: c.cell, room: c.room },
          ...this.remark(c.unmarked, c.cell),
        ];
      case 'relocate':
        this.ghost[c.room] = c.from;
        return [
          { type: 'relocated', from: c.to, to: c.from, room: c.room },
          ...this.remark(c.unmarked, c.to),
        ];
      case 'remove':
        this.ghost[c.room] = c.cell;
        return [{ type: 'placed', cell: c.cell, room: c.room }];
      case 'mark':
        for (const cell of c.cells) this.mark[cell] = !c.on;
        return [{ type: 'marked', cells: [...c.cells], on: !c.on }];
    }
  }

  /** A ghost arriving on a marked cell clears the mark (GDD §3.1). */
  private unmark(was: boolean, cell: number): PlayEvent[] {
    if (!was) return [];
    this.mark[cell] = false;
    return [{ type: 'marked', cells: [cell], on: false }];
  }

  /** Undoing that arrival brings the mark back (GENERATOR.md §2, worked example 3). */
  private remark(was: boolean, cell: number): PlayEvent[] {
    if (!was) return [];
    this.mark[cell] = true;
    return [{ type: 'marked', cells: [cell], on: true }];
  }

  private computeStatus(): (GhostStatus | null)[] {
    const h = this.house;
    const occupied = new Array<boolean>(h.size).fill(false);
    for (const g of this.ghost) if (g !== NO_GHOST) occupied[g] = true;
    const out = new Array<GhostStatus | null>(h.size).fill(null);
    for (const g of this.ghost) {
      if (g === NO_GHOST) continue;
      const seen = (h.sees[g] ?? []).some((c) => occupied[c]);
      out[g] = seen ? 'seen' : h.lit[g] ? 'lit' : 'calm';
    }
    return out;
  }

  private computeSettled(): boolean[] {
    return this.ghost.map((g) => g !== NO_GHOST && this.status[g] === 'calm');
  }
}
