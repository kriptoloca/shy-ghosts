import {
  DEMO_IDLE_MS,
  DEMO_REPLAYS,
  DEMO_SKIP_FROM_MS,
  HINT_COOLDOWN_S,
  MS_PER_S,
} from '../config';
import type { HintExplain } from '../core/hint';
import type { PlayEvent, PlayState } from '../core/state';
import type { HouseInProgress } from '../platform/storage';

/** The move a player asked for: a drag paints (`stroke`) or carries a ghost (`drag`, D72). */
export type MoveKind = 'tap' | 'stroke' | 'drag' | 'undo' | 'hint';

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

  /**
   * A move's events: a move unless nothing changed or only something nudged. A hint's move (its
   * second press) is a move, but the hint was counted at its first press (`hinted`, D74).
   */
  record(events: readonly PlayEvent[]): void {
    if (events.length === 0 || events.every((e) => e.type === 'nudged')) return;
    this.begun = true;
    this.moves++;
    if (events.some((e) => e.type === 'status' && e.to === 'seen' && e.from !== 'seen')) {
      this.conflicts++;
    }
  }

  /** The hint's first press showed its reason: one hint, whatever completes it (D74). */
  hinted(): void {
    this.begun = true;
    this.hints++;
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
 * The free hint's cooldown (D32, D98): after each hint the next one waits HINT_COOLDOWN_S seconds of
 * play, counted across houses and kept by the save (paused time excluded). The first press shows
 * the reason and starts the cooldown for now (`used`); the hint is used at the second press, or
 * when the player's own move places what the reason shows (`confirm`: the cooldown starts again
 * from then); any other move that clears the reason gives the recharge back (`refund`).
 */
export class HintClock {
  private now = 0;
  private readyAt = 0;
  /** The ready time from before the first press, while its reason waits for use. */
  private before: number | null = null;

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

  /** The first press showed a reason: the cooldown runs until it is used or refunded. */
  used(): void {
    this.before = this.readyAt;
    this.readyAt = this.now + HINT_COOLDOWN_S;
  }

  /** The hint was used (its second press, or the player's own move did it): the cooldown starts. */
  confirm(): void {
    this.before = null;
    this.readyAt = this.now + HINT_COOLDOWN_S;
  }

  /** A move cleared the reason before the hint was used: the ready time from before comes back. */
  refund(): void {
    if (this.before === null) return;
    this.readyAt = this.before;
    this.before = null;
  }

  /** The recharge from the save: ready in `seconds` (within 0 and the cooldown; 0 if broken). */
  restore(seconds: number): void {
    const s = Number.isFinite(seconds) ? Math.min(HINT_COOLDOWN_S, Math.max(0, seconds)) : 0;
    this.before = null;
    this.readyAt = this.now + s;
  }

  /**
   * The recharge of a save that landed after the boot (D47): a longer one takes over, as the
   * merge keeps the longer; a shorter one changes nothing (round 3's code audit, DÜŞÜK 2).
   */
  adopt(seconds: number): void {
    if (seconds > this.remaining) this.restore(seconds);
  }
}

/**
 * The player's own move used the hint whose reason was showing (D98): it put a ghost on the cell
 * the reason leads to, or took the wrong ghost it outlined off its cell. Its cooldown then starts;
 * any other move gives the recharge back (`HintClock`).
 */
export function usesReason(r: HintExplain, events: readonly PlayEvent[]): boolean {
  return events.some((e) => {
    if (r.kind === 'place') {
      if (e.type === 'placed') return e.cell === r.cell;
      return (e.type === 'moved' || e.type === 'relocated') && e.to === r.cell;
    }
    if (e.type === 'removed') return e.cell === r.cell;
    return (e.type === 'moved' || e.type === 'relocated') && e.from === r.cell;
  });
}

/**
 * The hint in two presses (D74, D86): the first press, when the hint is ready, shows why the next
 * step is forced and counts the hint; that reason stays until the player's next move (a tap, a
 * drag, a stroke, an undo), which takes it away, or the second press, which does the step.
 */
export class HintFlow<R> {
  private shown: R | null = null;

  /** The reason on the board, waiting for the second press. */
  get pending(): R | null {
    return this.shown;
  }

  /** A press on the bulb: show a reason, complete the pending one, or nothing. */
  press(
    ready: boolean,
    explain: () => R | null,
  ): { kind: 'explain'; reason: R } | { kind: 'complete' } | { kind: 'none' } {
    if (this.shown !== null) {
      this.shown = null;
      return { kind: 'complete' };
    }
    if (!ready) return { kind: 'none' };
    const reason = explain();
    if (reason === null) return { kind: 'none' };
    this.shown = reason;
    return { kind: 'explain', reason };
  }

  /**
   * The player's own move (a tap, a drag, a stroke, an undo) takes the reason away; true when one
   * was showing.
   */
  move(): boolean {
    const had = this.shown !== null;
    this.shown = null;
    return had;
  }

  /** The house is over: nothing is pending. */
  clear(): void {
    this.shown = null;
  }
}

/**
 * A house's demonstration over time (D83): it plays again after DEMO_IDLE_MS without input, until
 * the house's first placement (house 3: its first mark), at most DEMO_REPLAYS times, and never
 * while the player holds a pointer or a button down or reads a hint's reason (round 2's code
 * audit, YÜKSEK 1, ORTA 1). A tap skips a replay at once; a first play only after its first
 * DEMO_SKIP_FROM_MS (a tap left over from the finale never skips it; round 1's code audit,
 * ORTA 2), counted from the frame after the one it started in (that frame's time passed before
 * it; round 2's code audit, DÜŞÜK 3). Times are ms of unpaused play; frames are the game loop's.
 */
export class DemoClock {
  private has = false;
  private idleMs = 0;
  private replays = 0;
  private runMs = 0;
  /** The frame the demonstration in hand started in, and whether it is a replay. */
  private startFrame = -1;
  private replay = false;

  /** A new house on screen: whether it has a demonstration that may still replay. */
  reset(has: boolean): void {
    this.has = has;
    this.idleMs = 0;
    this.replays = 0;
    this.runMs = 0;
    this.startFrame = -1;
    this.replay = false;
  }

  /** Play time without a demonstration and without input in hand. */
  idle(ms: number): void {
    this.idleMs += ms;
  }

  /** Play time during a demonstration, in frame `frame`. */
  run(ms: number, frame: number): void {
    if (frame !== this.startFrame) this.runMs += ms;
  }

  input(): void {
    this.idleMs = 0;
  }

  /** The house's first placement (or, in house 3, its first mark): no more replays. */
  placed(): void {
    this.has = false;
  }

  /** It is time to play the demonstration again, unless something holds it off (`held`). */
  due(held: boolean): boolean {
    return !held && this.has && this.replays < DEMO_REPLAYS && this.idleMs >= DEMO_IDLE_MS;
  }

  /** A demonstration starts in frame `frame`: the first play as the house appears, or a replay. */
  started(replay: boolean, frame: number): void {
    if (replay) this.replays++;
    this.replay = replay;
    this.startFrame = frame;
    this.idleMs = 0;
    this.runMs = 0;
  }

  /** A tap now skips the demonstration. */
  skippable(): boolean {
    return this.replay || this.runMs >= DEMO_SKIP_FROM_MS;
  }
}
