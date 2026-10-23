import type Phaser from 'phaser';
import {
  BADGE_FONT_SHARE,
  COLOR_BADGE_DIGITS,
  COLOR_HINT_BAND,
  COLOR_HINT_DOT,
  COLOR_HINT_PULSE,
  COLOR_MARK,
  COLOR_SEEN_LINE,
  GHOST_SHARE,
  HINT_BAND_ALPHA,
  HINT_COPY_ALPHA,
  HINT_COPY_DOT_SHARE,
  HINT_FLASH_ALPHA,
  HINT_PULSE_ALPHA,
  HINT_PULSE_MS,
  HINT_WASH_ALPHA,
  REASON_BEAT_MS,
  RING_INSET,
  RING_WIDTH,
  SEEN_DOT_STEP,
  WIN_DIGITS_FONT,
} from '../config';
import type { HintExplain, ReasonBeat } from '../core/hint';
import type { HouseModel } from '../core/house';
import { GHOST_KEY, badgeKey, dotKey, dotSize, markKey, pixelKey } from './graybox';
import { badgeFor, cellCenter, roomBadge, type Circle, type Layout } from './layout';
import { dashes, dotsBetween, type Point } from './look';
import { Timeline } from './timeline';

/** What the reason has drawn so far (the dev hooks and `visible()` read it back). */
export interface ReasonPicture {
  /** Beats in the reason, and beats drawn so far (all of them: the whole picture holds). */
  beats: number;
  shown: number;
  /** Lines with a band (segment ids), in the order drawn. */
  bands: number[];
  /** Digit badges: a line's (its segment) or the target room's. */
  badges: { digit: number; segment: number | null; room: number | null }[];
  /** Cells under the pale wash, ascending. */
  wash: number[];
  /** Cells with a hint dot, ascending. */
  dots: number[];
  /** Cells with a see-through ghost now (a cross or a chain while it plays). */
  copies: number[];
  /** The pulsing room, or null. */
  pulse: number | null;
  /** Dotted lines from a ghost on the board to a cell of the target room. */
  lines: [number, number][];
}

const HALF = 0.5;

/**
 * The hint's first press on the board (D74, D86, D98): why the next step is forced, without giving
 * its cell away. For a placement the reason plays as beats, one step of the deduction every
 * REASON_BEAT_MS, and the whole picture then holds (src/core/hint.ts, `ReasonBeat`): a claim's
 * room washed pale and its line under a band, a count's lines under bands with the digit k, a
 * cross's see-through ghost with its dotted rays while the room it would empty flashes the "seen"
 * pose, a chain's see-through ghosts; every cell a step removes gets a hint dot; last, the target
 * room pulses with the digit 1, its other cells dotted or reached by a dotted line from the ghost
 * that sees them. For a wrong ghost, a dashed outline in the marks' ink stands round it (the board
 * makes the ghost tremble). The reason stays until the player's next move (a tap, a drag, an undo
 * or the second press), which clears it; a platform pause freezes its beats and its pulse with
 * every other tween. Drawn with images and text only, so it costs nothing per frame once drawn.
 */
export class ReasonDisplay {
  private readonly timeline: Timeline;
  private readonly drawings: (Phaser.GameObjects.Image | Phaser.GameObjects.Text)[] = [];
  private picture: ReasonPicture | null = null;
  private readonly dotted = new Map<number, Phaser.GameObjects.Image>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layout: Layout,
    private readonly house: HouseModel,
    /** Under the walls: the bands, the wash and the pulse. */
    private readonly under: Phaser.GameObjects.Container,
    /** Over the walls and the floor objects: dots, lines, ghosts, badges, the dashed outline. */
    private readonly over: Phaser.GameObjects.Container,
    /** The floor colour of a cell (dots carry a ring of it, D85). */
    private readonly floorOf: (cell: number) => number,
  ) {
    this.timeline = new Timeline(scene);
  }

  /**
   * Shows a reason. `fresh` (a press) plays the beats one after another; otherwise (a new board for
   * a new screen size) the whole picture comes at once, without the passing ghosts and flashes.
   */
  show(r: HintExplain, fresh = true): void {
    this.clear();
    if (r.kind === 'remove') {
      this.outline(r.cell);
      return;
    }
    const pic: ReasonPicture = {
      beats: r.beats.length,
      shown: 0,
      bands: [],
      badges: [],
      wash: [],
      dots: [],
      copies: [],
      pulse: null,
      lines: [],
    };
    this.picture = pic;
    r.beats.forEach((b, i) => {
      const draw = (): void => {
        this.beat(b, fresh);
        pic.shown = i + 1;
      };
      if (!fresh || i === 0) draw();
      else this.timeline.later(i * REASON_BEAT_MS, draw);
    });
  }

  /** Takes the reason off the board at once. */
  clear(): void {
    this.timeline.stop();
    for (const g of this.drawings) g.destroy();
    this.drawings.length = 0;
    this.dotted.clear();
    this.picture = null;
  }

  /** Something of the reason is on the board (dev hooks). */
  get showing(): boolean {
    return this.drawings.some((g) => g.active && g.visible && g.alpha > 0);
  }

  /** What is drawn so far, as data (dev hooks, `visible()`); null with no placement's reason. */
  drawn(): ReasonPicture | null {
    if (!this.picture) return null;
    const p = this.picture;
    const sort = (v: number[]): number[] => [...v].sort((a, b) => a - b);
    return {
      ...p,
      bands: [...p.bands],
      badges: p.badges.map((b) => ({ ...b })),
      wash: sort(p.wash),
      dots: sort(p.dots),
      copies: sort(p.copies),
      lines: p.lines.map(([a, b]) => [a, b]),
    };
  }

  // ---- the beats ----------------------------------------------------------------------------------

  private beat(b: ReasonBeat, fresh: boolean): void {
    switch (b.kind) {
      case 'claim':
        this.wash(b.glow);
        this.band(b.segment, null);
        this.dots(b.dots);
        return;
      case 'count':
        this.wash(b.glow);
        for (const s of b.segments) this.band(s, b.k);
        this.dots(b.dots);
        return;
      case 'cross':
        this.rays(b.cell, b.segments);
        if (!fresh) {
          this.dots([b.cell]);
          return;
        }
        this.passing([b.cell], b.flash, () => this.dots([b.cell]));
        return;
      case 'chain':
        if (!fresh) {
          this.dots([b.cell]);
          return;
        }
        this.passing([b.cell, ...b.forced], b.flash, () => this.dots([b.cell]));
        return;
      case 'target':
        this.pulse(b.room);
        this.dots(b.dots);
        for (const [ghost, cell] of b.lines) this.line(ghost, cell);
        return;
    }
  }

  /** The free cells a step reasons about, washed pale under the walls. */
  private wash(cells: readonly number[]): void {
    const p = this.picture;
    for (const c of cells) {
      if (p?.wash.includes(c)) continue;
      this.cellTile(COLOR_HINT_PULSE, c).setAlpha(HINT_WASH_ALPHA);
      p?.wash.push(c);
    }
  }

  /** A pale band over a line's cells; with a digit, its badge outside the board. */
  private band(segment: number, digit: number | null): void {
    const p = this.picture;
    const s = this.house.segments[segment];
    if (!s || !p) return;
    if (!p.bands.includes(segment)) {
      const { board, cell, n } = this.layout;
      const a = s.cells[0] as number;
      const z = s.cells[s.cells.length - 1] as number;
      const x = board.x + (a % n) * cell;
      const y = board.y + Math.floor(a / n) * cell;
      const w = ((z % n) - (a % n) + 1) * cell;
      const h = (Math.floor(z / n) - Math.floor(a / n) + 1) * cell;
      this.tile(this.under, COLOR_HINT_BAND, x, y, w, h).setAlpha(HINT_BAND_ALPHA);
      p.bands.push(segment);
    }
    if (digit !== null) {
      this.badge(badgeFor(this.layout, s.axis, s.cells[0] as number), digit);
      p.badges.push({ digit, segment, room: null });
    }
  }

  /** Hint dots: the marks' dot in the hint's ink, with a ring of its floor (D85). */
  private dots(cells: readonly number[]): void {
    const p = this.picture;
    for (const c of cells) {
      if (this.dotted.has(c)) continue;
      const at = cellCenter(this.layout, c);
      const img = this.scene.add.image(
        at.x,
        at.y,
        markKey(this.scene, this.floorOf(c), COLOR_HINT_DOT),
      );
      img.setDisplaySize(this.layout.cell, this.layout.cell);
      this.over.add(img);
      this.drawings.push(img);
      this.dotted.set(c, img);
      p?.dots.push(c);
    }
  }

  /** A cross's dotted rays: from its cell along its row and column, to the ends of its lines. */
  private rays(cell: number, segments: readonly number[]): void {
    const from = cellCenter(this.layout, cell);
    for (const s of segments) {
      const cells = this.house.segments[s]?.cells ?? [];
      for (const end of [cells[0], cells[cells.length - 1]]) {
        if (end === undefined || end === cell) continue;
        const to = cellCenter(this.layout, end);
        this.dotLine(dotsBetween(from, to, SEEN_DOT_STEP * this.layout.cell).concat([to]));
      }
    }
  }

  /** A dotted line from a ghost on the board to a cell it sees (the target beat). */
  private line(ghost: number, cell: number): void {
    const a = cellCenter(this.layout, ghost);
    const b = cellCenter(this.layout, cell);
    this.dotLine(dotsBetween(a, b, SEEN_DOT_STEP * this.layout.cell));
    this.picture?.lines.push([ghost, cell]);
  }

  private dotLine(points: readonly Point[]): void {
    const size = dotSize(this.layout.cell);
    for (const pt of points) {
      const c = this.cellOf(pt);
      const img = this.scene.add.image(
        pt.x,
        pt.y,
        dotKey(this.scene, COLOR_SEEN_LINE, this.floorOf(c)),
      );
      img.setDisplaySize(size, size);
      this.over.add(img);
      this.drawings.push(img);
    }
  }

  /**
   * See-through ghosts on `cells` (a cross's cell, or a chain's cell and the ghosts it forces, in
   * turn) while the room `flash` lies under the "seen" pose; at HINT_COPY_DOT_SHARE of the beat the
   * ghosts fade and `then` draws the dot.
   */
  private passing(cells: readonly number[], flash: readonly number[], then: () => void): void {
    const size = this.layout.cell * GHOST_SHARE;
    const p = this.picture;
    const dotAt = REASON_BEAT_MS * HINT_COPY_DOT_SHARE;
    const step = dotAt / (cells.length + 1);
    const copies = cells.map((c, k) => {
      const at = cellCenter(this.layout, c);
      const img = this.scene.add.image(at.x, at.y, GHOST_KEY.calm).setDisplaySize(size, size);
      img.setAlpha(0);
      this.over.add(img);
      this.drawings.push(img);
      this.timeline.later(k * step, () => {
        img.setAlpha(HINT_COPY_ALPHA);
        p?.copies.push(c);
      });
      return img;
    });
    const seen = flash.map((c) => {
      const at = cellCenter(this.layout, c);
      const img = this.scene.add.image(at.x, at.y, GHOST_KEY.seen).setDisplaySize(size, size);
      img.setAlpha(0);
      this.over.add(img);
      this.drawings.push(img);
      return img;
    });
    if (seen.length > 0) {
      this.timeline.later(cells.length * step, () => {
        this.timeline.tween({
          targets: seen,
          alpha: HINT_FLASH_ALPHA,
          duration: step,
          yoyo: true,
          onStop: () => {
            for (const s of seen) s.setAlpha(0);
          },
        });
      });
    }
    this.timeline.later(dotAt, () => {
      then();
      this.timeline.tween({
        targets: copies,
        alpha: 0,
        duration: REASON_BEAT_MS - dotAt,
        onComplete: () => {
          if (p) p.copies = [];
        },
        onStop: () => {
          for (const img of copies) img.setAlpha(0);
          if (p) p.copies = [];
        },
      });
    });
  }

  /** The target room pulses light, with the digit 1 at its first cell's corner. */
  private pulse(room: number): void {
    const p = this.picture;
    const cells = this.house.roomCells[room] ?? [];
    const pulse = cells.map((c) => this.cellTile(COLOR_HINT_PULSE, c).setAlpha(0));
    if (p) p.pulse = room;
    const first = cells[0];
    if (first !== undefined) {
      this.badge(roomBadge(this.layout, first), 1);
      p?.badges.push({ digit: 1, segment: null, room });
    }
    if (pulse.length === 0) return;
    this.timeline.tween({
      targets: pulse,
      alpha: HINT_PULSE_ALPHA,
      duration: HINT_PULSE_MS / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onStop: () => {
        for (const t of pulse) t.setAlpha(0);
      },
    });
  }

  /** A digit on a dark disc. */
  private badge(at: Circle, digit: number): void {
    const disc = this.scene.add.image(at.x, at.y, badgeKey(this.scene));
    disc.setDisplaySize(2 * at.r, 2 * at.r);
    const text = this.scene.add
      .text(at.x, at.y, String(digit), {
        fontFamily: WIN_DIGITS_FONT,
        fontSize: `${String(Math.round(BADGE_FONT_SHARE * at.r))}px`,
        fontStyle: 'bold',
        color: COLOR_BADGE_DIGITS,
      })
      .setOrigin(HALF);
    this.over.add([disc, text]);
    this.drawings.push(disc, text);
  }

  /** A wrong ghost: a dashed outline in the marks' ink inside its cell. */
  private outline(cell: number): void {
    const { board, wall, n } = this.layout;
    const size = this.layout.cell;
    const inset = wall / 2 + RING_INSET + RING_WIDTH / 2;
    const x1 = board.x + (cell % n) * size + inset;
    const y1 = board.y + Math.floor(cell / n) * size + inset;
    const x2 = x1 + size - 2 * inset;
    const y2 = y1 + size - 2 * inset;
    const dash = {
      lineBetween: (ax: number, ay: number, bx: number, by: number): void => {
        const x = Math.min(ax, bx) - RING_WIDTH / 2;
        const y = Math.min(ay, by) - RING_WIDTH / 2;
        this.tile(
          this.over,
          COLOR_MARK,
          x,
          y,
          Math.abs(bx - ax) + RING_WIDTH,
          Math.abs(by - ay) + RING_WIDTH,
        );
      },
    };
    dashes(dash, x1, y1, x2, y1);
    dashes(dash, x2, y1, x2, y2);
    dashes(dash, x2, y2, x1, y2);
    dashes(dash, x1, y2, x1, y1);
  }

  /** A rectangle of one colour, as a scaled texture. */
  private tile(
    layer: Phaser.GameObjects.Container,
    color: number,
    x: number,
    y: number,
    w: number,
    h: number,
  ): Phaser.GameObjects.Image {
    const img = this.scene.add.image(x, y, pixelKey(this.scene, color)).setOrigin(0, 0);
    img.setDisplaySize(w, h);
    layer.add(img);
    this.drawings.push(img);
    return img;
  }

  private cellTile(color: number, c: number): Phaser.GameObjects.Image {
    const { board, cell, n } = this.layout;
    const x = board.x + (c % n) * cell;
    const y = board.y + Math.floor(c / n) * cell;
    return this.tile(this.under, color, x, y, cell, cell);
  }

  /** The cell under a point of a dotted line (its floor colour rings the dot). */
  private cellOf(p: Point): number {
    const { board, cell, n } = this.layout;
    const col = Math.min(n - 1, Math.max(0, Math.floor((p.x - board.x) / cell)));
    const row = Math.min(n - 1, Math.max(0, Math.floor((p.y - board.y) / cell)));
    return row * n + col;
  }
}
