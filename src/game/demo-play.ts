import type Phaser from 'phaser';
import {
  COLOR_GLANCE,
  COLOR_HATCH,
  DEMO_BLINK_SCALE,
  DEMO_BUMP_SCALE,
  DEMO_COPY_ALPHA,
  DEMO_FADE_MS,
  DEMO_RUN_SHARE,
  DEMO_STEP_SHARE,
  LIT_FLASH_ALPHA,
  NUDGE_MS,
  SEEN_DOT,
  SEEN_DOT_STEP,
} from '../config';
import type { DemoScript, Trail } from './demo';
import { GHOST_KEY } from './graybox';
import { cellCenter, type Layout } from './layout';
import { dotsBetween } from './look';
import { Timeline } from './timeline';

/** What a demonstration draws on and moves: the board's layers, ghosts and floor objects. */
export interface DemoStage {
  scene: Phaser.Scene;
  layout: Layout;
  /** Under the walls: the lamp's light sweeping out. */
  under: Phaser.GameObjects.Container;
  /** Over the floor objects, under the ghosts: the trails and the see-through copy. */
  over: Phaser.GameObjects.Container;
  /** The body of the ghost on a cell (the resident that blinks). */
  body: (cell: number) => Phaser.GameObjects.Image | null;
  /** The bookshelf or lamp on a cell (it bumps, or switches on). */
  object: (cell: number) => Phaser.GameObjects.Image | null;
  /** A ghost's display size in design px. */
  ghostSize: number;
}

/**
 * Plays a teaching demonstration on the board (docs/gate-b-round1.md §3, D70) from its pure
 * timeline (src/game/demo.ts): the resident blinks awake, dotted trails run out from it cell by
 * cell and fade (a bookshelf in the way bumps), a lamp switches on and its light sweeps out, a
 * see-through copy of the resident steps into the light, squints and steps back. `stop` ends it
 * at once and puts every ghost and object back as it was (a tap skips the demonstration).
 */
export class DemoPlayer {
  private readonly timeline: Timeline;
  private readonly drawn: Phaser.GameObjects.GameObject[] = [];
  /** Objects whose scale the demonstration changed, with the scale to put back. */
  private readonly rest = new Map<Phaser.GameObjects.Image, { x: number; y: number }>();

  constructor(private readonly stage: DemoStage) {
    this.timeline = new Timeline(stage.scene);
  }

  play(script: DemoScript): void {
    this.stop();
    const { blink, beam, copy } = script;
    if (blink) {
      for (const c of blink.cells) {
        const b = this.stage.body(c);
        if (!b) continue;
        const rest = this.keep(b);
        this.timeline.later(blink.at, () => {
          this.timeline.tween({
            targets: b,
            scaleY: rest.y * DEMO_BLINK_SCALE,
            duration: blink.ms / 2,
            yoyo: true,
            onComplete: () => b.setScale(rest.x, rest.y),
            onStop: () => b.setScale(rest.x, rest.y),
          });
        });
      }
    }
    for (const t of script.trails) this.trail(t);
    if (beam) {
      const g = this.add(this.stage.scene.add.graphics(), this.stage.under);
      g.fillStyle(COLOR_HATCH, LIT_FLASH_ALPHA);
      const lamp = this.stage.object(beam.lamp);
      if (lamp) this.timeline.later(beam.at, () => this.bump(lamp));
      const step = beam.ms / Math.max(1, beam.cells.length);
      beam.cells.forEach((c, k) => {
        this.timeline.later(beam.at + (k + 1) * step, () => this.fillCell(g, c));
      });
      this.fadeAt(g, script.ms - DEMO_FADE_MS);
    }
    if (copy) {
      const { scene, layout, ghostSize } = this.stage;
      const from = cellCenter(layout, copy.from);
      const to = cellCenter(layout, copy.to);
      const ghost = this.add(
        scene.add
          .image(from.x, from.y, GHOST_KEY.calm)
          .setDisplaySize(ghostSize, ghostSize)
          .setAlpha(0),
        this.stage.over,
      );
      const walk = copy.ms * DEMO_STEP_SHARE;
      this.timeline.later(copy.at, () => {
        ghost.setAlpha(DEMO_COPY_ALPHA);
        this.timeline.tween({
          targets: ghost,
          x: to.x,
          y: to.y,
          duration: walk,
          ease: 'Sine.easeInOut',
          // in the light it squints and shields its eyes
          onComplete: () => ghost.setTexture(GHOST_KEY.lit),
        });
      });
      this.timeline.later(copy.at + copy.ms - walk, () => {
        ghost.setTexture(GHOST_KEY.calm);
        this.timeline.tween({
          targets: ghost,
          x: from.x,
          y: from.y,
          alpha: 0,
          duration: walk,
          ease: 'Sine.easeInOut',
        });
      });
    }
  }

  /** Ends the demonstration at once: every motion stopped, every drawing gone, all as before. */
  stop(): void {
    this.timeline.stop();
    for (const o of this.drawn) o.destroy();
    this.drawn.length = 0;
    for (const [img, s] of this.rest) if (img.active) img.setScale(s.x, s.y);
    this.rest.clear();
  }

  /** A trail runs out from its resident cell by cell, bumps into a bookshelf, and fades. */
  private trail(t: Trail): void {
    const { scene, layout } = this.stage;
    const g = this.add(scene.add.graphics(), this.stage.over);
    g.fillStyle(COLOR_GLANCE, 1);
    const run = t.ms * DEMO_RUN_SHARE;
    const step = run / Math.max(1, t.cells.length);
    let prev = t.from;
    t.cells.forEach((c, k) => {
      const a = prev;
      prev = c;
      this.timeline.later(t.at + (k + 1) * step, () => {
        const p = cellCenter(layout, a);
        const q = cellCenter(layout, c);
        const r = SEEN_DOT * layout.cell;
        for (const d of dotsBetween(p, q, SEEN_DOT_STEP * layout.cell)) g.fillCircle(d.x, d.y, r);
        g.fillCircle(q.x, q.y, r);
      });
    });
    if (t.bump !== null) {
      const shelf = this.stage.object(t.bump);
      if (shelf) this.timeline.later(t.at + run, () => this.bump(shelf));
    }
    this.fadeAt(g, t.at + run, t.ms - run);
  }

  /** A short pop of a bookshelf in the way, or of a lamp switching on. */
  private bump(img: Phaser.GameObjects.Image): void {
    const rest = this.keep(img);
    this.timeline.tween({
      targets: img,
      scaleX: rest.x * DEMO_BUMP_SCALE,
      scaleY: rest.y * DEMO_BUMP_SCALE,
      duration: NUDGE_MS / 2,
      yoyo: true,
      onComplete: () => img.setScale(rest.x, rest.y),
      onStop: () => img.setScale(rest.x, rest.y),
    });
  }

  private fadeAt(g: Phaser.GameObjects.Graphics, at: number, ms = DEMO_FADE_MS): void {
    this.timeline.later(at, () => {
      this.timeline.tween({ targets: g, alpha: 0, duration: ms });
    });
  }

  private keep(img: Phaser.GameObjects.Image): { x: number; y: number } {
    const known = this.rest.get(img);
    if (known) return known;
    const s = { x: img.scaleX, y: img.scaleY };
    this.rest.set(img, s);
    return s;
  }

  private add<T extends Phaser.GameObjects.GameObject>(
    o: T,
    layer: Phaser.GameObjects.Container,
  ): T {
    layer.add(o);
    this.drawn.push(o);
    return o;
  }

  private fillCell(g: Phaser.GameObjects.Graphics, c: number): void {
    const { board, cell, n } = this.stage.layout;
    g.fillRect(board.x + (c % n) * cell, board.y + Math.floor(c / n) * cell, cell, cell);
  }
}
