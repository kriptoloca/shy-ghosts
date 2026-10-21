import { describe, expect, it } from 'vitest';
import { DRAG_PX } from '../src/config';
import { Gesture } from '../src/game/gesture';

/**
 * Taps and drags (GDD §3.1): a tap is a pointer-down and pointer-up in the same cell with less
 * than 24 design px of movement; a drag (≥ 24 px) covers every cell it passes, the starting cell
 * included. A board of 4 × 4 cells of 100 px from (0, 0).
 */
const CELL = 100;
const N = 4;
const cellAt = (x: number, y: number): number =>
  x < 0 || y < 0 || x >= N * CELL || y >= N * CELL
    ? -1
    : Math.floor(y / CELL) * N + Math.floor(x / CELL);
const mid = (i: number): [number, number] => [
  (i % N) * CELL + CELL / 2,
  Math.floor(i / N) * CELL + CELL / 2,
];

describe('Gesture', () => {
  it('a press and release in one cell with a small jitter is a tap', () => {
    const g = new Gesture(cellAt);
    const [x, y] = mid(5);
    g.down(x, y);
    g.move(x + DRAG_PX - 1, y);
    expect(g.up(x + DRAG_PX - 1, y)).toEqual({ kind: 'tap', cell: 5 });
    expect(g.active).toBe(false);
  });

  it('a short move that ends in the next cell is no tap (and no drag)', () => {
    const g = new Gesture(cellAt);
    g.down(CELL - 5, CELL / 2); // cell 0, near its right edge
    expect(g.up(CELL + 5, CELL / 2)).toBeNull(); // 10 px later, in cell 1
  });

  it('moving 24 px or more turns it into a drag over every cell passed, the first included', () => {
    const g = new Gesture(cellAt);
    const [x, y] = mid(0);
    g.down(x, y);
    expect(g.move(x + DRAG_PX - 1, y)).toEqual([]); // not a drag yet
    expect(g.dragging).toBe(false);
    expect(g.move(x + DRAG_PX, y)).toEqual([0]); // the drag starts and covers its first cell
    expect(g.dragging).toBe(true);
    // one fast jump across three cells covers the cells in between
    expect(g.move(mid(3)[0], y)).toEqual([1, 2, 3]);
    expect(g.up(mid(3)[0], y)).toEqual({ kind: 'stroke', start: 0, cells: [0, 1, 2, 3] });
  });

  it('a diagonal drag covers the cells along its line, each once, in order', () => {
    const g = new Gesture(cellAt);
    g.down(...mid(0));
    g.move(...mid(5));
    g.move(...mid(10));
    g.move(...mid(5)); // back over a covered cell: not added twice
    const r = g.up(...mid(15));
    expect(r?.kind).toBe('stroke');
    const cells = r?.kind === 'stroke' ? r.cells : [];
    expect(cells[0]).toBe(0);
    expect(cells.at(-1)).toBe(15);
    expect(new Set(cells).size).toBe(cells.length);
    for (const c of [0, 5, 10, 15]) expect(cells).toContain(c);
  });

  it('a drag that leaves the board keeps only board cells; one that starts off the board is none', () => {
    const g = new Gesture(cellAt);
    g.down(...mid(2));
    g.move(mid(3)[0], mid(3)[1]);
    expect(g.up(N * CELL + 300, mid(3)[1])).toEqual({ kind: 'stroke', start: 2, cells: [2, 3] });
    const off = new Gesture(cellAt);
    off.down(-50, 50);
    expect(off.active).toBe(false);
    expect(off.up(...mid(0))).toBeNull();
  });

  it('cancel (a platform pause) drops the gesture: the release does nothing', () => {
    const g = new Gesture(cellAt);
    g.down(...mid(6));
    g.cancel();
    expect(g.active).toBe(false);
    expect(g.up(...mid(6))).toBeNull();
  });
});
