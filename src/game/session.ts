import { HINT_COOLDOWN_S, MS_PER_S } from '../config';
import type { PlayEvent, PlayState } from '../core/state';
import type { HouseInProgress } from '../platform/storage';

/** The move a player asked for (the session counts hints apart). */
export type MoveKind = 'tap' | 'stroke' | 'undo' | 'hint';

/**
 * One house in progress (GDD §3.2, §9, §14): the solve time from the first input in this house
 * (paused time excluded: the scene only ticks it while the game runs), and the counts the save
 * and the later `level_complete` carry: moves, hints, conflicts. A conflict is a move after which
 * a ghost is seen that was not seen before (D60).
 */
export class HouseSession {
  seconds = 0;
  hints = 0;
  moves = 0;
  conflicts = 0;
  private begun = false;
  private done = false;

  /** A new house, or the house in progress from the save when it is this house's. */
  constructor(
    readonly id: number,
    saved: HouseInProgress | null = null,
  ) {
    if (saved && saved.id === id) {
      this.seconds = saved.seconds;
      this.hints = saved.hints;
      this.moves = saved.moves;
      this.conflicts = saved.conflicts;
      this.begun = true;
    }
  }

  /** The house has had its first input, or came from the save: its time runs, a save keeps it. */
  get started(): boolean {
    return this.begun;
  }

  /** Any input on the board, a nudge included: the solve time runs from the first. */
  input(): void {
    this.begun = true;
  }

  /** A move's events: a move unless nothing changed or only something nudged. */
  record(events: readonly PlayEvent[], kind: MoveKind): void {
    if (events.length === 0 || events.every((e) => e.type === 'nudged')) return;
    this.begun = true;
    this.moves++;
    if (kind === 'hint') this.hints++;
    if (events.some((e) => e.type === 'status' && e.to === 'seen' && e.from !== 'seen')) {
      this.conflicts++;
    }
  }

  /** Play time passed (the scene does not tick while the platform pause holds). */
  tick(ms: number): void {
    if (this.begun && !this.done) this.seconds += ms / MS_PER_S;
  }

  /** The house is solved: the solve time stops. */
  finish(): void {
    this.done = true;
  }

  /** The house in progress for the save (GDD §9, D40). */
  inProgress(state: PlayState): HouseInProgress {
    const board = state.serialize();
    return {
      id: this.id,
      ghosts: board.ghosts,
      marks: board.marks,
      seconds: this.seconds,
      hints: this.hints,
      moves: this.moves,
      conflicts: this.conflicts,
    };
  }
}

/**
 * The free hint's cooldown (D32): after each hint the next one waits HINT_COOLDOWN_S seconds of
 * play, counted across houses for the session (paused time excluded).
 */
export class HintClock {
  private now = 0;
  private readyAt = 0;

  tick(ms: number): void {
    this.now += ms / MS_PER_S;
  }

  get ready(): boolean {
    return this.now >= this.readyAt;
  }

  /** Seconds until the next hint. */
  get remaining(): number {
    return Math.max(0, this.readyAt - this.now);
  }

  /** The share of the cooldown still to run, 1 right after a hint, 0 when ready. */
  get share(): number {
    return this.remaining / HINT_COOLDOWN_S;
  }

  used(): void {
    this.readyAt = this.now + HINT_COOLDOWN_S;
  }
}
