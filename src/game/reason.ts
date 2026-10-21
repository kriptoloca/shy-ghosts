import type Phaser from 'phaser';
import {
  COLOR_HINT_PULSE,
  COLOR_MARK,
  COLOR_PAGE,
  HINT_PULSE_ALPHA,
  HINT_PULSE_MS,
  HINT_VEIL_ALPHA,
  RING_INSET,
  RING_WIDTH,
} from '../config';
import type { HintExplain } from '../core/hint';
import type { HouseModel } from '../core/house';
import { pixelKey } from './graybox';
import type { Layout } from './layout';
import { brightCells, dashes } from './look';
import { Timeline } from './timeline';

/**
 * The hint's first press on the board (D74, D86): why the next step is forced, without giving its
 * cell away. For a placement, every cell outside the lines and rooms the deduction uses goes dim
 * under a veil of the page colour (under the walls, so the house stays drawn), so those glow, and
 * the target room pulses light. For a wrong ghost, a dashed outline in the marks' ink stands round
 * it (the board makes the ghost tremble). The reason stays until the player's next move (a tap, a
 * drag, an undo or the second press), which clears it; a platform pause freezes its pulse with
 * every other tween. Drawn with images only, so it costs nothing per frame while it stays.
 */
export class ReasonDisplay {
  private readonly timeline: Timeline;
  private readonly drawings: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layout: Layout,
    private readonly house: HouseModel,
    /** Under the walls: the veil and the pulse. */
    private readonly under: Phaser.GameObjects.Container,
    /** Over the walls and the floor objects: the dashed outline. */
    private readonly over: Phaser.GameObjects.Container,
  ) {
    this.timeline = new Timeline(scene);
  }

  show(r: HintExplain): void {
    this.clear();
    if (r.kind === 'remove') {
      const { board, cell, wall, n } = this.layout;
      const inset = wall / 2 + RING_INSET + RING_WIDTH / 2;
      const x1 = board.x + (r.cell % n) * cell + inset;
      const y1 = board.y + Math.floor(r.cell / n) * cell + inset;
      const x2 = x1 + cell - 2 * inset;
      const y2 = y1 + cell - 2 * inset;
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
      return;
    }
    const bright = new Set(brightCells(this.house, r.segments, r.rooms, r.room));
    for (let c = 0; c < this.house.size; c++) {
      if (!bright.has(c)) this.cellTile(COLOR_PAGE, c).setAlpha(HINT_VEIL_ALPHA);
    }
    const pulse = (this.house.roomCells[r.room] ?? []).map((c) =>
      this.cellTile(COLOR_HINT_PULSE, c).setAlpha(0),
    );
    if (pulse.length === 0) return;
    this.timeline.tween({
      targets: pulse,
      alpha: HINT_PULSE_ALPHA,
      duration: HINT_PULSE_MS / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onStop: () => {
        for (const p of pulse) p.setAlpha(0);
      },
    });
  }

  /** Takes the reason off the board at once. */
  clear(): void {
    this.timeline.stop();
    for (const g of this.drawings) g.destroy();
    this.drawings.length = 0;
  }

  /** Something of the reason is on the board (dev hooks). */
  get showing(): boolean {
    return this.drawings.some((g) => g.active && g.visible && g.alpha > 0);
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
}
