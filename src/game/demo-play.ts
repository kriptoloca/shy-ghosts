import type Phaser from 'phaser';
import {
  COLOR_GLANCE,
  COLOR_HATCH,
  DEMO_BLINK_SCALE,
  DEMO_BUMP_SCALE,
  DEMO_COPY_ALPHA,
  DEMO_HAND_SHARE,
  DEMO_RUN_SHARE,
  DEMO_STEP_SHARE,
  HAND_SHAPE,
  LIT_FLASH_ALPHA,
  MARK_MS,
  NUDGE_MS,
  SEEN_DOT_STEP,
} from '../config';
import type { GhostStatus } from '../core/state';
import type { Copy, DemoScript, Trail } from './demo';
import { GHOST_KEY, HAND_KEY, dotKey, dotSize, markKey, pixelKey } from './graybox';
import { cellCenter, type Layout } from './layout';
import { dotsBetween } from './look';
import { Timeline } from './timeline';

/** What a demonstration draws on and moves: the board's layers, ghosts and floor objects. */
export interface DemoStage {
  scene: Phaser.Scene;
  layout: Layout;
  /** Under the walls: the lamp's light sweeping out. */
  under: Phaser.GameObjects.Container;
  /** Over the floor objects, under the ghosts: the trails, the marks, the copies and the hand. */
  over: Phaser.GameObjects.Container;
  /** The body of the ghost on a cell (the resident that blinks or takes a pose). */
  body: (cell: number) => Phaser.GameObjects.Image | null;
  /** The bookshelf or lamp on a cell (it bumps, or switches on). */
  object: (cell: number) => Phaser.GameObjects.Image | null;
  /** The floor colour of a cell: the halo of a dot or a mark drawn on it (D85). */
  floorOf: (cell: number) => number;
  /** A ghost's display size in design px. */
  ghostSize: number;
}

const HALF = 0.5;

/**
 * Plays a teaching demonstration on the board (docs/gate-b-round2.md §2; D70, D83) from its pure
 * timeline (src/game/demo.ts): the resident blinks awake, dotted trails run out from it cell by
 * cell (a bookshelf in the way bumps), see-through copies step in or appear and take a pose, a
 * resident covers its eyes, a lamp switches on and its light sweeps out, a see-through hand drags
 * marks in. Nothing fades: the last frame holds the whole lesson until the script ends. `stop`
 * ends it at once and puts every ghost and object back as it was (a tap skips the
 * demonstration). Everything is an image (no Graphics is drawn every frame).
 */
export class DemoPlayer {
  private readonly timeline: Timeline;
  private readonly drawn: Phaser.GameObjects.GameObject[] = [];
  /** Objects whose scale the demonstration changed, with the scale to put back. */
  private readonly rest = new Map<Phaser.GameObjects.Image, { x: number; y: number }>();
  /** Ghosts whose texture the demonstration changed, with the texture to put back. */
  private readonly faces = new Map<Phaser.GameObjects.Image, string>();

  constructor(private readonly stage: DemoStage) {
    this.timeline = new Timeline(stage.scene);
  }

  play(script: DemoScript): void {
    this.stop();
    const { blink, beam, hand } = script;
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
    if (beam) this.beam(beam);
    for (const c of script.copies) this.copy(c);
    for (const p of script.poses) {
      const b = this.stage.body(p.cell);
      if (b) this.timeline.later(p.at, () => this.pose(b, p.pose));
    }
    if (hand) this.hand(hand);
  }

  /** Ends the demonstration at once: every motion stopped, every drawing gone, all as before. */
  stop(): void {
    this.timeline.stop();
    for (const o of this.drawn) o.destroy();
    this.drawn.length = 0;
    for (const [img, s] of this.rest) if (img.active) img.setScale(s.x, s.y);
    this.rest.clear();
    for (const [img, key] of this.faces) if (img.active) img.setTexture(key);
    this.faces.clear();
  }

  /** A trail runs out from its resident cell by cell, bumps into a bookshelf, and stays. */
  private trail(t: Trail): void {
    const { layout } = this.stage;
    const run = t.ms * DEMO_RUN_SHARE;
    const step = run / Math.max(1, t.cells.length);
    let prev = t.from;
    t.cells.forEach((c, k) => {
      const a = prev;
      prev = c;
      this.timeline.later(t.at + (k + 1) * step, () => {
        const p = cellCenter(layout, a);
        const q = cellCenter(layout, c);
        for (const d of dotsBetween(p, q, SEEN_DOT_STEP * layout.cell)) this.dot(d.x, d.y);
        this.dot(q.x, q.y);
      });
    });
    if (t.bump !== null) {
      const shelf = this.stage.object(t.bump);
      if (shelf) this.timeline.later(t.at + run, () => this.bump(shelf));
    }
  }

  /** The lamp switches on and its light sweeps out cell by cell; a bookshelf in the way bumps. */
  private beam(beam: NonNullable<DemoScript['beam']>): void {
    const { scene, layout } = this.stage;
    const lamp = this.stage.object(beam.lamp);
    if (lamp) this.timeline.later(beam.at, () => this.bump(lamp));
    const step = beam.ms / Math.max(1, beam.cells.length);
    beam.cells.forEach((c, k) => {
      this.timeline.later(beam.at + (k + 1) * step, () => {
        const { board, cell, n } = layout;
        const tile = scene.add
          .image(
            board.x + (c % n) * cell,
            board.y + Math.floor(c / n) * cell,
            pixelKey(scene, COLOR_HATCH),
          )
          .setOrigin(0, 0)
          .setDisplaySize(cell, cell)
          .setAlpha(LIT_FLASH_ALPHA);
        this.add(tile, this.stage.under);
      });
    });
    if (beam.bump !== null) {
      const shelf = this.stage.object(beam.bump);
      const reach = (c: number): number =>
        Math.abs(Math.floor(c / layout.n) - Math.floor(beam.lamp / layout.n)) +
        Math.abs((c % layout.n) - (beam.lamp % layout.n));
      const before = beam.cells.filter((c) => reach(c) < reach(beam.bump as number)).length;
      if (shelf) this.timeline.later(beam.at + (before + 1) * step, () => this.bump(shelf));
    }
  }

  /** A see-through copy steps in from its resident, or fades in, and takes its pose. */
  private copy(copy: Copy): void {
    const { scene, layout, ghostSize } = this.stage;
    const to = cellCenter(layout, copy.to);
    const from = copy.from === null ? to : cellCenter(layout, copy.from);
    const ghost = this.add(
      scene.add
        .image(from.x, from.y, GHOST_KEY.calm)
        .setDisplaySize(ghostSize, ghostSize)
        .setAlpha(0),
      this.stage.over,
    );
    const walk = copy.ms * DEMO_STEP_SHARE;
    this.timeline.later(copy.at, () => {
      if (copy.from === null) {
        ghost.setTexture(GHOST_KEY[copy.pose]);
        this.timeline.tween({ targets: ghost, alpha: DEMO_COPY_ALPHA, duration: walk });
        return;
      }
      ghost.setAlpha(DEMO_COPY_ALPHA);
      this.timeline.tween({
        targets: ghost,
        x: to.x,
        y: to.y,
        duration: walk,
        ease: 'Sine.easeInOut',
        onComplete: () => ghost.setTexture(GHOST_KEY[copy.pose]),
      });
    });
  }

  /** A see-through hand drags along the cells; a mark pops in under it on each. */
  private hand(hand: NonNullable<DemoScript['hand']>): void {
    const { scene, layout } = this.stage;
    const first = hand.cells[0];
    const last = hand.cells[hand.cells.length - 1];
    if (first === undefined || last === undefined) return;
    const a = cellCenter(layout, first);
    const b = cellCenter(layout, last);
    const size = DEMO_HAND_SHARE * layout.cell;
    const img = this.add(
      scene.add
        .image(a.x, a.y, HAND_KEY)
        .setOrigin(HALF, HAND_SHAPE.fingerY)
        .setDisplaySize(size, size)
        .setAlpha(0),
      this.stage.over,
    );
    this.timeline.later(hand.at, () => {
      img.setAlpha(DEMO_COPY_ALPHA);
      this.timeline.tween({ targets: img, x: b.x, y: b.y, duration: hand.ms });
    });
    const step = hand.ms / Math.max(1, hand.cells.length - 1);
    hand.cells.forEach((c, k) => {
      this.timeline.later(hand.at + k * step, () => {
        const at = cellCenter(layout, c);
        const mark = this.add(
          scene.add.image(at.x, at.y, markKey(scene, this.stage.floorOf(c))),
          this.stage.over,
        );
        mark.setDisplaySize(layout.cell, layout.cell);
        const full = mark.scaleX;
        mark.setScale(0);
        // under the hand, which stays on top
        this.stage.over.moveDown(mark);
        this.timeline.tween({ targets: mark, scale: full, duration: MARK_MS });
      });
    });
  }

  /** One dot of a trail, in the glance's ink with a ring of the floor under it. */
  private dot(x: number, y: number): void {
    const { scene, layout } = this.stage;
    const { board, cell, n } = layout;
    const col = Math.min(n - 1, Math.max(0, Math.floor((x - board.x) / cell)));
    const row = Math.min(n - 1, Math.max(0, Math.floor((y - board.y) / cell)));
    const key = dotKey(scene, COLOR_GLANCE, this.stage.floorOf(row * n + col));
    const size = dotSize(cell);
    this.add(scene.add.image(x, y, key).setDisplaySize(size, size), this.stage.over);
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

  /** A resident takes a pose for the demonstration (house 1: it covers its eyes). */
  private pose(body: Phaser.GameObjects.Image, pose: GhostStatus): void {
    if (!this.faces.has(body)) this.faces.set(body, body.texture.key);
    body.setTexture(GHOST_KEY[pose]);
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
}
