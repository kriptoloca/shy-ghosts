import type { PlayEvent } from '../core/state';
import type { MoveKind } from '../game/session';
import type { ViewState } from '../game/view';

/** Per house, what the player did (dev state, for the playtester's logs; Gate B). */
export interface Tally {
  taps: number;
  placements: number;
  removals: number;
  relocations: number;
  /** Ghosts dragged into another room (D72). */
  carried: number;
  nudges: number;
  strokes: number;
  /** Drags that carried a ghost, wherever it ended (D72). */
  drags: number;
  marked: number;
  erased: number;
  undos: number;
  /** Hints asked for: counted at the first press, which shows the reason (D74). */
  hints: number;
  /** Presses of the undo and the hint buttons, whatever they did (the neutral state, D87). */
  undoPresses: number;
  hintPresses: number;
  /**
   * Moves after which a ghost shivers that did not before: one per move, however many ghosts
   * shiver (Gate B's B1 counts shivering placements; audit 2026-10-21, ORTA 6).
   */
  shivers: number;
}

/** One move as the player asked for it and the events it gave (round 1's code audit, DÜŞÜK 8). */
export interface LoggedMove {
  kind: MoveKind;
  events: readonly PlayEvent[];
}

/**
 * One house's record for the dev hooks (D62, D66): the board when the house opened, every event
 * list the scene played since with the kind of move that gave it, and the tally of what the
 * player did. The Game scene keeps one
 * only in DEV builds, so production holds no log that grows with every move and ships none of
 * this module (audit 2026-10-21, DÜŞÜK 8; the smoke e2e checks the bundle).
 */
export class HouseLog {
  readonly moves: LoggedMove[] = [];
  readonly tally: Tally = {
    taps: 0,
    placements: 0,
    removals: 0,
    relocations: 0,
    carried: 0,
    nudges: 0,
    strokes: 0,
    drags: 0,
    marked: 0,
    erased: 0,
    undos: 0,
    hints: 0,
    undoPresses: 0,
    hintPresses: 0,
    shivers: 0,
  };

  constructor(readonly start: ViewState) {}

  /** One move as the player asked for it and the events it gave (none when nothing changed). */
  add(kind: MoveKind, events: readonly PlayEvent[]): void {
    const t = this.tally;
    if (kind === 'tap') t.taps++;
    if (kind === 'stroke') t.strokes++;
    if (kind === 'drag') t.drags++;
    if (kind === 'undo' && events.length > 0) t.undos++;
    if (events.length > 0) this.moves.push({ kind, events });
    if (kind === 'undo') return;
    for (const e of events) {
      if (e.type === 'placed') t.placements++;
      else if (e.type === 'relocated') t.relocations++;
      else if (e.type === 'moved') t.carried++;
      else if (e.type === 'removed') t.removals++;
      else if (e.type === 'nudged') t.nudges++;
      else if (e.type === 'marked' && kind === 'stroke') {
        if (e.on) t.marked += e.cells.length;
        else t.erased += e.cells.length;
      }
    }
    if (events.some((e) => e.type === 'status' && e.to === 'seen' && e.from !== 'seen')) {
      t.shivers++;
    }
  }

  /** The hint's first press showed its reason: one hint, whatever completes it (D74). */
  hinted(): void {
    this.tally.hints++;
  }

  /** A button was pressed, whatever it did. */
  pressed(name: 'undo' | 'hint'): void {
    if (name === 'undo') this.tally.undoPresses++;
    else this.tally.hintPresses++;
  }
}
