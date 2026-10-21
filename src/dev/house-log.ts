import type { PlayEvent } from '../core/state';
import type { MoveKind } from '../game/session';
import type { ViewState } from '../game/view';

/** Per house, what the player did (dev state, for the playtester's logs; Gate B). */
export interface Tally {
  taps: number;
  placements: number;
  removals: number;
  relocations: number;
  nudges: number;
  strokes: number;
  marked: number;
  erased: number;
  undos: number;
  hints: number;
  /**
   * Moves after which a ghost shivers that did not before: one per move, however many ghosts
   * shiver (Gate B's B1 counts shivering placements; audit 2026-10-21, ORTA 6).
   */
  shivers: number;
}

/**
 * One house's record for the dev hooks (D62, D66): the board when the house opened, every event
 * list the scene played since, and the tally of what the player did. The Game scene keeps one
 * only in DEV builds, so production holds no log that grows with every move and ships none of
 * this module (audit 2026-10-21, DÜŞÜK 8; the smoke e2e checks the bundle).
 */
export class HouseLog {
  readonly moves: (readonly PlayEvent[])[] = [];
  readonly tally: Tally = {
    taps: 0,
    placements: 0,
    removals: 0,
    relocations: 0,
    nudges: 0,
    strokes: 0,
    marked: 0,
    erased: 0,
    undos: 0,
    hints: 0,
    shivers: 0,
  };

  constructor(readonly start: ViewState) {}

  /** One move as the player asked for it and the events it gave (none when nothing changed). */
  add(kind: MoveKind, events: readonly PlayEvent[]): void {
    const t = this.tally;
    if (kind === 'tap') t.taps++;
    if (kind === 'stroke') t.strokes++;
    if (kind === 'undo' && events.length > 0) t.undos++;
    if (kind === 'hint' && events.length > 0) t.hints++;
    if (events.length > 0) this.moves.push(events);
    if (kind === 'undo') return;
    for (const e of events) {
      if (e.type === 'placed') t.placements++;
      else if (e.type === 'relocated') t.relocations++;
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
}
