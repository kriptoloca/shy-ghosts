import { DRAG_PX } from '../config';

/** What a finished gesture asks the rules for (GDD §3.1). */
export type GestureResult =
  | { kind: 'tap'; cell: number }
  /** A drag: the cells it covered in order, each once; `start` decides paint or erase. */
  | { kind: 'stroke'; start: number; cells: number[] };

/**
 * Taps and drags on the board (GDD §3.1), pure so it is unit-tested: a tap is a pointer-down and
 * pointer-up in the same cell with less than DRAG_PX design px of movement; once the pointer has
 * moved DRAG_PX from where it went down, the gesture is a drag that covers every cell it passes,
 * the starting cell included (fast moves are followed along their line, so no cell in between is
 * skipped). A gesture that starts off the board is none (the HUD buttons have their own), and a
 * platform pause cancels the gesture in hand, so a press held through a pause never counts.
 */
export class Gesture {
  private start: { x: number; y: number; cell: number } | null = null;
  private last = { x: 0, y: 0 };
  private drag = false;
  private cells: number[] = [];

  constructor(
    private readonly cellAt: (x: number, y: number) => number,
    private readonly threshold = DRAG_PX,
  ) {}

  /** A gesture is in hand (a pointer went down on the board and has not come up). */
  get active(): boolean {
    return this.start !== null;
  }

  get dragging(): boolean {
    return this.drag;
  }

  down(x: number, y: number): void {
    this.cancel();
    const cell = this.cellAt(x, y);
    if (cell < 0) return;
    this.start = { x, y, cell };
    this.last = { x, y };
  }

  /** The pointer moved; returns the cells the drag newly covers (none before it is a drag). */
  move(x: number, y: number): number[] {
    const s = this.start;
    if (!s) return [];
    if (!this.drag) {
      if (Math.hypot(x - s.x, y - s.y) < this.threshold) return [];
      this.drag = true;
      this.last = { x: s.x, y: s.y };
    }
    const added = this.cover(this.last.x, this.last.y, x, y);
    this.last = { x, y };
    return added;
  }

  /** The pointer came up: a tap, a stroke, or nothing. */
  up(x: number, y: number): GestureResult | null {
    const s = this.start;
    if (!s) return null;
    this.move(x, y);
    const result: GestureResult | null = this.drag
      ? this.cells.length > 0
        ? { kind: 'stroke', start: s.cell, cells: [...this.cells] }
        : null
      : this.cellAt(x, y) === s.cell
        ? { kind: 'tap', cell: s.cell }
        : null;
    this.cancel();
    return result;
  }

  cancel(): void {
    this.start = null;
    this.drag = false;
    this.cells = [];
  }

  /** Cells along the segment, sampled finer than any cell, that the drag has not covered yet. */
  private cover(x0: number, y0: number, x1: number, y1: number): number[] {
    const step = this.threshold / 2;
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    const added: number[] = [];
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const c = this.cellAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
      if (c >= 0 && !this.cells.includes(c)) {
        this.cells.push(c);
        added.push(c);
      }
    }
    return added;
  }
}
