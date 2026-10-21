import type { HouseModel } from '../../src/core/house';
import type { GhostStatus, PlayEvent, PlayState } from '../../src/core/state';

/** The board as the rules hold it: ghosts with their states, marks, settled rooms, solved. */
export interface View {
  ghosts: [number, GhostStatus][];
  marks: number[];
  settled: number[];
  solved: boolean;
}

export function view(s: PlayState): View {
  const settled: number[] = [];
  for (let r = 0; r < s.house.roomCount; r++) if (s.isSettled(r)) settled.push(r);
  return {
    ghosts: s.ghostCells().map((c) => [c, s.statusAt(c) as GhostStatus]),
    marks: s.markedCells(),
    settled,
    solved: s.solved,
  };
}

/** Playback phases, in the only order a move's events may come (D41). */
const PHASE: Record<PlayEvent['type'], number> = {
  placed: 0,
  relocated: 0,
  moved: 0,
  removed: 0,
  nudged: 0,
  marked: 0,
  status: 1,
  settled: 2,
  unsettled: 2,
  solved: 3,
};

/**
 * A scene that only plays the events back (CLAUDE.md: "the rules resolve at once in src/core; the
 * scene only plays them back; the settled screen always equals the rules"). It is strict: every
 * event must be exactly what a correct scene needs, no more and no less (audit 2026-10-21, ORTA 2):
 * - the move events come first, then the states in reading order, then the rooms by id, then the
 *   win;
 * - `placed`, `relocated` and `removed` name the room their cells lie in; a ghost never lands on a
 *   blocked cell, on another ghost or in a room that already holds one, and a given never leaves;
 * - a mark changes only as a stroke of its own (the whole list), or right after the move that
 *   causes it: off where a ghost lands, on again where an undone ghost leaves;
 * - a nudge is the whole list, and what nudges is furniture, a lamp or a ghost (a given, or a
 *   ghost carried where it may not go, which goes back, D72);
 * - every ghost that was placed or moved gets one state; any other ghost gets one only when its
 *   state really changed; `from` is what the screen shows; `by` and `lamps` agree with the state;
 * - after the list, no ghost lacks a state, no mark lies under a ghost, the lit rooms are exactly
 *   the rooms whose ghost is calm, and the win shows exactly when every room is lit.
 */
export class Screen {
  private readonly ghosts = new Map<number, GhostStatus | null>();
  private readonly marks = new Set<number>();
  private readonly settled = new Set<number>();
  private solved = false;
  readonly problems: string[] = [];

  constructor(
    private readonly house: HouseModel,
    start: View,
  ) {
    for (const [c, st] of start.ghosts) this.ghosts.set(c, st);
    for (const m of start.marks) this.marks.add(m);
    for (const r of start.settled) this.settled.add(r);
    this.solved = start.solved;
  }

  play(events: readonly PlayEvent[]): void {
    const bad = (what: string): void => {
      this.problems.push(`${what} in ${JSON.stringify(events)}`);
    };
    const h = this.house;
    const roomGhost = (room: number): number[] =>
      [...this.ghosts.keys()].filter((c) => h.roomOf[c] === room);
    const isGiven = (cell: number): boolean => h.givens.includes(cell);
    /** Cells that got a ghost in this list (placed or the end of a glide): each needs a state. */
    const arrived = new Set<number>();
    /** Cells whose ghost glided here in this list (an unchanged state is allowed for them). */
    const glided = new Set<number>();
    const told = new Set<number>();
    let phase = 0;
    let lastRoom = -1;
    let lastStatusCell = -1;
    const wasSolved = this.solved;

    events.forEach((e, k) => {
      const prev = k > 0 ? events[k - 1] : undefined;
      if (PHASE[e.type] < phase) bad(`${e.type} after a later phase`);
      phase = Math.max(phase, PHASE[e.type]);
      switch (e.type) {
        case 'placed': {
          if (h.roomOf[e.cell] !== e.room)
            bad(`placed ${String(e.cell)} in room ${String(e.room)}`);
          if (h.blocked[e.cell]) bad(`placed on a blocked cell ${String(e.cell)}`);
          if (this.ghosts.has(e.cell)) bad(`placed on a ghost at ${String(e.cell)}`);
          if (roomGhost(e.room).length > 0) bad(`a second ghost in room ${String(e.room)}`);
          this.ghosts.set(e.cell, null);
          arrived.add(e.cell);
          this.expectUnmark(events, k, e.cell, bad);
          break;
        }
        case 'relocated': {
          if (h.roomOf[e.from] !== e.room || h.roomOf[e.to] !== e.room) {
            bad(`relocated ${String(e.from)}→${String(e.to)} in room ${String(e.room)}`);
          }
          if (!this.ghosts.has(e.from)) bad(`relocated from an empty cell ${String(e.from)}`);
          if (isGiven(e.from)) bad(`a given glided from ${String(e.from)}`);
          if (this.ghosts.has(e.to) || h.blocked[e.to]) bad(`relocated onto ${String(e.to)}`);
          const st = this.ghosts.get(e.from) ?? null;
          this.ghosts.delete(e.from);
          this.ghosts.set(e.to, st);
          arrived.add(e.to);
          glided.add(e.to);
          this.expectUnmark(events, k, e.to, bad);
          break;
        }
        case 'moved': {
          // a ghost carried into another room that held none (D72)
          if (h.roomOf[e.from] !== e.fromRoom || h.roomOf[e.to] !== e.toRoom) {
            bad(
              `moved ${String(e.from)}→${String(e.to)} across rooms ${String(e.fromRoom)}, ${String(e.toRoom)}`,
            );
          }
          if (e.fromRoom === e.toRoom) bad('a move inside one room (a relocation)');
          if (!this.ghosts.has(e.from)) bad(`moved from an empty cell ${String(e.from)}`);
          if (isGiven(e.from)) bad(`a given was moved from ${String(e.from)}`);
          if (this.ghosts.has(e.to) || h.blocked[e.to]) bad(`moved onto ${String(e.to)}`);
          if (roomGhost(e.toRoom).length > 0)
            bad(`moved into room ${String(e.toRoom)}, which has a ghost`);
          const st = this.ghosts.get(e.from) ?? null;
          this.ghosts.delete(e.from);
          this.ghosts.set(e.to, st);
          arrived.add(e.to);
          glided.add(e.to);
          this.expectUnmark(events, k, e.to, bad);
          break;
        }
        case 'removed':
          if (h.roomOf[e.cell] !== e.room)
            bad(`removed ${String(e.cell)} from room ${String(e.room)}`);
          if (!this.ghosts.has(e.cell)) bad(`removed a missing ghost at ${String(e.cell)}`);
          if (isGiven(e.cell)) bad(`a given was removed at ${String(e.cell)}`);
          this.ghosts.delete(e.cell);
          break;
        case 'nudged':
          if (events.length !== 1) bad('a nudge with other events');
          // furniture, a lamp, a given, or a carried ghost sent back (D72)
          if (!h.blocked[e.cell] && !this.ghosts.has(e.cell)) {
            bad(`nudged ${String(e.cell)}, which is neither furniture, a lamp nor a ghost`);
          }
          break;
        case 'marked': {
          if (e.cells.length === 0) bad('an empty mark event');
          const afterMove =
            prev?.type === 'placed' ||
            prev?.type === 'relocated' ||
            prev?.type === 'moved' ||
            prev?.type === 'removed';
          if (k === 0) {
            if (events.length !== 1) bad('a stroke with other events');
          } else if (!afterMove || e.cells.length !== 1) {
            bad('a mark change that follows no move');
          } else {
            const c = e.cells[0] as number;
            const ok =
              (prev.type === 'placed' && !e.on && c === prev.cell) ||
              (prev.type === 'relocated' && !e.on && c === prev.to) ||
              (prev.type === 'relocated' && e.on && c === prev.from) ||
              (prev.type === 'moved' && !e.on && c === prev.to) ||
              (prev.type === 'moved' && e.on && c === prev.from) ||
              (prev.type === 'removed' && e.on && c === prev.cell);
            if (!ok) bad(`mark ${String(c)} ${String(e.on)} after ${prev.type}`);
          }
          for (const c of e.cells) {
            if (this.marks.has(c) === e.on) bad(`mark ${String(c)} already ${String(e.on)}`);
            if (e.on && (h.blocked[c] || this.ghosts.has(c))) bad(`a mark on ${String(c)}`);
            if (e.on) this.marks.add(c);
            else this.marks.delete(c);
          }
          break;
        }
        case 'status': {
          if (!this.ghosts.has(e.cell)) bad(`status of a missing ghost at ${String(e.cell)}`);
          if (told.has(e.cell)) bad(`two states for ${String(e.cell)}`);
          if (e.cell <= lastStatusCell) bad('states out of reading order');
          lastStatusCell = e.cell;
          told.add(e.cell);
          const shown = this.ghosts.get(e.cell) ?? null;
          if (shown !== e.from) bad(`status from ${String(e.from)}, screen ${String(shown)}`);
          if (e.from === null && !arrived.has(e.cell)) bad(`from null for ${String(e.cell)}`);
          if (e.from === e.to && !glided.has(e.cell))
            bad(`an unchanged state for ${String(e.cell)}`);
          // `by` names ghosts on the board that share a line with this one; `lamps` are lamps
          if (e.by.some((b) => !this.ghosts.has(b) || b === e.cell)) bad(`by ${String(e.by)}`);
          if (e.lamps.some((l) => h.objects[l] !== 'L')) bad(`lamps ${String(e.lamps)}`);
          if ((e.to === 'seen') !== e.by.length > 0)
            bad(`seen ${String(e.cell)} by ${String(e.by)}`);
          if (e.to === 'lit' && e.lamps.length === 0) bad(`lit ${String(e.cell)} by no lamp`);
          if (e.to === 'calm' && e.lamps.length > 0) bad(`calm ${String(e.cell)} in the light`);
          this.ghosts.set(e.cell, e.to);
          break;
        }
        case 'settled':
        case 'unsettled':
          if (e.room <= lastRoom) bad('rooms out of order');
          lastRoom = e.room;
          if (this.settled.has(e.room) === (e.type === 'settled')) {
            bad(`room ${String(e.room)} ${e.type} twice`);
          }
          if (e.type === 'settled') this.settled.add(e.room);
          else this.settled.delete(e.room);
          break;
        case 'solved':
          if (this.solved) bad('solved twice');
          this.solved = true;
          break;
      }
    });

    for (const c of arrived) {
      if (this.ghosts.has(c) && !told.has(c))
        bad(`no state for the ghost that came to ${String(c)}`);
    }
    for (const [c, st] of this.ghosts) {
      if (st === null) bad(`ghost at ${String(c)} has no state`);
      if (this.marks.has(c)) bad(`a mark under the ghost at ${String(c)}`);
    }
    for (let room = 0; room < h.roomCount; room++) {
      const here = roomGhost(room);
      if (here.length > 1) bad(`room ${String(room)} holds ${String(here.length)} ghosts`);
      const lit = here.length === 1 && this.ghosts.get(here[0] as number) === 'calm';
      if (lit !== this.settled.has(room)) bad(`room ${String(room)} lit ${String(!lit)}`);
    }
    const all = this.settled.size === h.roomCount;
    if (this.solved !== all)
      bad(`solved ${String(this.solved)} with ${String(this.settled.size)} lit`);
    if (!wasSolved && all && !events.some((e) => e.type === 'solved'))
      bad('a win without `solved`');
  }

  /** A ghost landing on a marked cell: the very next event clears that mark (D41). */
  private expectUnmark(
    events: readonly PlayEvent[],
    k: number,
    cell: number,
    bad: (what: string) => void,
  ): void {
    if (!this.marks.has(cell)) return;
    const next = events[k + 1];
    const clears = next?.type === 'marked' && !next.on && next.cells.join() === String(cell);
    if (!clears) bad(`the mark under ${String(cell)} is not cleared right after the move`);
  }

  view(): View {
    return {
      ghosts: [...this.ghosts.entries()]
        .map(([c, st]): [number, GhostStatus] => [c, st ?? 'calm'])
        .sort((a, b) => a[0] - b[0]),
      marks: [...this.marks].sort((a, b) => a - b),
      settled: [...this.settled].sort((a, b) => a - b),
      solved: this.solved,
    };
  }
}
