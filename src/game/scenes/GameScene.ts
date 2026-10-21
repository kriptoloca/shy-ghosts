import Phaser from 'phaser';
import {
  COLOR_STUB_BOARD,
  COLOR_STUB_GRID,
  STUB_BOARD_CELLS,
  STUB_BOARD_SHARE,
  STUB_GRID_LINE,
} from '../../config';
import { uninstallDebug } from '../../dev/debug';
import { getPlatform, markInteractive } from '../../platform/bridge';
import { ResumeGrace, bindPauseGrace } from '../resume-grace';

/**
 * Game (GDD §11 screen 2). Epic 0 stub: a placeholder board, the resume grace on the platform
 * pause, and GameReady once it is interactive (no title screen, CLAUDE.md rule 3). The graybox
 * loop replaces the board in Epic 3.
 */
export class GameScene extends Phaser.Scene {
  private readonly grace = new ResumeGrace(this);

  constructor() {
    super('Game');
  }

  create(): void {
    const board = this.add.graphics();
    // Laid out for the current design size, and again whenever it changes (CLAUDE.md rule 5).
    const draw = (): void => {
      const { width, height } = this.scale.gameSize;
      const side = Math.min(width, height) * STUB_BOARD_SHARE;
      const x0 = (width - side) / 2;
      const y0 = (height - side) / 2;
      const cell = side / STUB_BOARD_CELLS;
      board.clear();
      board.fillStyle(COLOR_STUB_BOARD, 1);
      board.fillRect(x0, y0, side, side);
      board.lineStyle(STUB_GRID_LINE, COLOR_STUB_GRID, 1);
      for (let k = 0; k <= STUB_BOARD_CELLS; k++) {
        board.lineBetween(x0 + k * cell, y0, x0 + k * cell, y0 + side);
        board.lineBetween(x0, y0 + k * cell, x0 + side, y0 + k * cell);
      }
    };
    draw();
    this.scale.on(Phaser.Scale.Events.RESIZE, draw);

    const platform = getPlatform();
    const unsubscribe = bindPauseGrace(this.grace, platform);
    let alive = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      alive = false;
      this.scale.off(Phaser.Scale.Events.RESIZE, draw);
      unsubscribe();
      this.grace.dispose();
      if (import.meta.env.DEV) uninstallDebug();
    });

    if (import.meta.env.DEV) {
      void import('../../dev/game-debug').then((m) => {
        if (alive) m.installGameDebug({ input: () => this.input.enabled });
      });
    }
    markInteractive(platform);
  }
}
