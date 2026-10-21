import type Phaser from 'phaser';
import {
  COLOR_HINT_PULSE,
  COLOR_MARK,
  COLOR_PAGE,
  GLOW_OUT_MS,
  HINT_PULSE_ALPHA,
  HINT_PULSE_MS,
  HINT_REASON_MS,
  HINT_VEIL_ALPHA,
  RING_INSET,
  RING_WIDTH,
} from '../config';
import type { HintExplain } from '../core/hint';
import type { HouseModel } from '../core/house';
import type { Layout } from './layout';
import { brightCells, dashes } from './look';
import { Timeline } from './timeline';

/**
 * The hint's first press on the board (D74): why the next step is forced, without giving its cell
 * away. For a placement, every cell outside the lines and rooms the deduction uses goes dim under
 * a veil of the page colour (under the walls, so the house stays drawn), so those glow, and the
 * target room pulses light, for HINT_REASON_MS. For a wrong ghost, a dashed outline in the marks'
 * ink stands round it for as long (the board makes the ghost tremble). The second press, or the
 * player's own move, clears it.
 */
export class ReasonDisplay {
  private readonly timeline: Timeline;
  private readonly drawings: Phaser.GameObjects.Graphics[] = [];

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
      const g = this.draw(this.over);
      const { board, cell, wall, n } = this.layout;
      const inset = wall / 2 + RING_INSET + RING_WIDTH / 2;
      const x1 = board.x + (r.cell % n) * cell + inset;
      const y1 = board.y + Math.floor(r.cell / n) * cell + inset;
      const x2 = x1 + cell - 2 * inset;
      const y2 = y1 + cell - 2 * inset;
      g.lineStyle(RING_WIDTH, COLOR_MARK, 1);
      dashes(g, x1, y1, x2, y1);
      dashes(g, x2, y1, x2, y2);
      dashes(g, x2, y2, x1, y2);
      dashes(g, x1, y2, x1, y1);
      this.fadeLater(g);
      return;
    }
    const bright = new Set(brightCells(this.house, r.segments, r.rooms, r.room));
    const veil = this.draw(this.under);
    veil.fillStyle(COLOR_PAGE, HINT_VEIL_ALPHA);
    for (let c = 0; c < this.house.size; c++) if (!bright.has(c)) this.fillCell(veil, c);
    this.fadeLater(veil);
    const pulse = this.draw(this.under);
    pulse.fillStyle(COLOR_HINT_PULSE, 1);
    for (const c of this.house.roomCells[r.room] ?? []) this.fillCell(pulse, c);
    pulse.setAlpha(0);
    this.timeline.tween({
      targets: pulse,
      alpha: HINT_PULSE_ALPHA,
      duration: HINT_PULSE_MS / 2,
      yoyo: true,
      repeat: Math.round(HINT_REASON_MS / HINT_PULSE_MS) - 1,
      ease: 'Sine.easeInOut',
      onComplete: () => pulse.setAlpha(0),
      onStop: () => pulse.setAlpha(0),
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

  private draw(layer: Phaser.GameObjects.Container): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    layer.add(g);
    this.drawings.push(g);
    return g;
  }

  /** The drawing stays for HINT_REASON_MS, then fades. */
  private fadeLater(g: Phaser.GameObjects.Graphics): void {
    this.timeline.later(HINT_REASON_MS, () => {
      this.timeline.tween({
        targets: g,
        alpha: 0,
        duration: GLOW_OUT_MS,
        onComplete: () => g.setVisible(false),
        onStop: () => g.setVisible(false),
      });
    });
  }

  private fillCell(g: Phaser.GameObjects.Graphics, c: number): void {
    const { board, cell, n } = this.layout;
    g.fillRect(board.x + (c % n) * cell, board.y + Math.floor(c / n) * cell, cell, cell);
  }
}
