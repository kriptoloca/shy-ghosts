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

/**
 * A scene that only plays the events back (CLAUDE.md: "the rules resolve at once in src/core; the
 * scene only plays them back; the settled screen always equals the rules"). Every event must make
 * sense against what it shows; `problems` collects the ones that do not.
 */
export class Screen {
  private readonly ghosts = new Map<number, GhostStatus | null>();
  private readonly marks = new Set<number>();
  private readonly settled = new Set<number>();
  private solved = false;
  readonly problems: string[] = [];

  constructor(start: View) {
    for (const [c, st] of start.ghosts) this.ghosts.set(c, st);
    for (const m of start.marks) this.marks.add(m);
    for (const r of start.settled) this.settled.add(r);
    this.solved = start.solved;
  }

  play(events: readonly PlayEvent[]): void {
    const bad = (what: string): void => {
      this.problems.push(`${what} in ${JSON.stringify(events)}`);
    };
    for (const e of events) {
      switch (e.type) {
        case 'placed':
          if (this.ghosts.has(e.cell)) bad(`placed on a ghost at ${String(e.cell)}`);
          this.ghosts.set(e.cell, null);
          break;
        case 'relocated': {
          if (!this.ghosts.has(e.from)) bad(`relocated from an empty cell ${String(e.from)}`);
          if (this.ghosts.has(e.to)) bad(`relocated onto a ghost at ${String(e.to)}`);
          const st = this.ghosts.get(e.from) ?? null;
          this.ghosts.delete(e.from);
          this.ghosts.set(e.to, st);
          break;
        }
        case 'removed':
          if (!this.ghosts.has(e.cell)) bad(`removed a missing ghost at ${String(e.cell)}`);
          this.ghosts.delete(e.cell);
          break;
        case 'nudged':
          break;
        case 'marked':
          if (e.cells.length === 0) bad('an empty mark event');
          for (const c of e.cells) {
            if (this.marks.has(c) === e.on) bad(`mark ${String(c)} already ${String(e.on)}`);
            if (e.on) this.marks.add(c);
            else this.marks.delete(c);
          }
          break;
        case 'status':
          if (!this.ghosts.has(e.cell)) bad(`status of a missing ghost at ${String(e.cell)}`);
          if ((this.ghosts.get(e.cell) ?? null) !== e.from) {
            bad(
              `status from ${String(e.from)} but the screen shows ${String(this.ghosts.get(e.cell))}`,
            );
          }
          this.ghosts.set(e.cell, e.to);
          break;
        case 'settled':
          if (this.settled.has(e.room)) bad(`room ${String(e.room)} settled twice`);
          this.settled.add(e.room);
          break;
        case 'unsettled':
          if (!this.settled.has(e.room)) bad(`room ${String(e.room)} unsettled while dark`);
          this.settled.delete(e.room);
          break;
        case 'solved':
          if (this.solved) bad('solved twice');
          this.solved = true;
          break;
      }
    }
    for (const [c, st] of this.ghosts) if (st === null) bad(`ghost at ${String(c)} has no state`);
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
