import Phaser from 'phaser';
import {
  CARRY_SCALE,
  COLOR_FLOORS,
  COLOR_FLOOR_INKS,
  COLOR_GLANCE,
  COLOR_HATCH,
  COLOR_HATCH_EDGE,
  COLOR_MARK,
  COLOR_SEEN_LINE,
  COLOR_SETTLED_RING,
  COLOR_SETTLED_WASH,
  COLOR_SOLVED_FRAME,
  COLOR_WALL,
  GHOST_SHARE,
  GLANCE_ALPHA,
  GLANCE_MS,
  GLIDE_MS,
  GLOW_IN_MS,
  GLOW_OUT_MS,
  GRID_ALPHA,
  HINT_TREMBLE_SWINGS,
  LIT_FLASH_ALPHA,
  LIT_FLASH_MS,
  MARK_MS,
  MARK_SHARE,
  NUDGE_MS,
  NUDGE_PX,
  PATTERN_CHECK,
  PATTERN_DIAMOND,
  PATTERN_LINE,
  PATTERN_STEP,
  POP_MS,
  POP_SCALE,
  REMOVE_MS,
  REMOVE_RISE,
  RING_INSET,
  RING_WIDTH,
  SEEN_DOT,
  SEEN_DOT_STEP,
  SEEN_LINE_ALPHA,
  SEEN_LINE_FLASH_ALPHA,
  SEEN_LINE_OFF_MS,
  SEEN_LINE_ON_MS,
  SHIVER_PX,
  SHIVER_SWINGS,
  SHIVER_SWING_MS,
  SETTLED_WASH_ALPHA,
  SETTLE_HOP_PX,
  SETTLE_MS,
  SETTLE_SCALE,
  WIN_FLASH_ALPHA,
  WIN_FLASH_MS,
  WIN_HIT_STOP_MS,
  WIN_HOP_MS,
  WIN_HOP_PX,
  WIN_STEP_MAX_MS,
  WIN_SWEEP_MS,
  WIN_TURN_SCALE,
  WIN_WAVES,
  WIN_WAVE_DEG,
  WIN_WAVE_MS,
} from '../config';
import type { HintExplain } from '../core/hint';
import type { GhostStatus, PlayEvent, StrokeMode } from '../core/state';
import type { DemoScript } from './demo';
import { DemoPlayer } from './demo-play';
import { ProgressDots } from './dots';
import { CAP_KEY, FURNITURE_KEY, GHOST_KEY, LAMP_KEY, MARK_KEY } from './graybox';
import { cellAt, cellCenter, type Layout } from './layout';
import {
  dashes,
  dotsBetween,
  hatch,
  ringSegments,
  wallRuns,
  type Pattern,
  type Polygon,
  type RoomStyle,
} from './look';
import { Pool } from './pool';
import { ReasonDisplay } from './reason';
import { Timeline } from './timeline';
import type { BoardView, ViewState } from './view';

/** What the display shows, read back from its objects (the e2e compares it with the rules). */
export interface DrawnState extends ViewState {
  /** Ghosts drawn with a nightcap. */
  residents: number[];
  /** Rooms whose progress dot is full (D75). */
  dots: number[];
}

interface GhostSprite {
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  /** The body's scale at rest (its display size in the cell). */
  rest: number;
  motion: Phaser.Tweens.Tween | null;
  shake: Phaser.Tweens.Tween | null;
  bob: Phaser.Tweens.Tween | null;
}

const HALF = 0.5;
const STATE_OF_KEY = new Map<string, GhostStatus>(
  (Object.entries(GHOST_KEY) as [GhostStatus, string][]).map(([state, key]) => [key, state]),
);

let serial = 0;

/** The pop-in: up to POP_SCALE in the first half, back to 1 in the second (GDD §3a). */
function popEase(t: number): number {
  return t < HALF ? POP_SCALE * (t / HALF) : POP_SCALE + (1 - POP_SCALE) * ((t - HALF) / HALF);
}

/**
 * One house on screen in the graybox look (TASKS.md Epic 3): the floor (room tones, wallpaper
 * patterns, the thin cell grid), the glow of settled rooms, the warm wash of lit cells under the
 * thick walls, furniture and lamps, marks, the faint sight lines between ghosts that see each
 * other, the ghosts, and the frame of a solved house. It only plays the rules' events back, keeps
 * every motion interruptible so rapid taps always settle on the rules' board, and reads itself
 * back for the e2e (`drawn()`).
 */
export class BoardDisplay {
  readonly root: Phaser.GameObjects.Container;
  private readonly keys: string[] = [];
  private readonly glowLayer: Phaser.GameObjects.Container;
  /** Per room, its settled cue: the teal wash under the walls and the dashed ring above them. */
  private readonly wash: Phaser.GameObjects.Graphics[] = [];
  private readonly ring: Phaser.GameObjects.Graphics[] = [];
  private readonly ringLayer: Phaser.GameObjects.Container;
  private readonly glowTween: (Phaser.Tweens.Tween | null)[] = [];
  private readonly objectLayer: Phaser.GameObjects.Container;
  private readonly objects = new Map<number, Phaser.GameObjects.Image>();
  private readonly markLayer: Phaser.GameObjects.Container;
  private readonly marks = new Map<number, Phaser.GameObjects.Image>();
  private readonly preview: Phaser.GameObjects.Graphics;
  private readonly lines: Phaser.GameObjects.Graphics;
  private readonly fx: Phaser.GameObjects.Container;
  private readonly ghostLayer: Phaser.GameObjects.Container;
  private readonly ghosts = new Map<number, GhostSprite>();
  private readonly frame: Phaser.GameObjects.Graphics;
  /** Motions the screen must finish before it equals the rules (the e2e waits for none). */
  private readonly moving = new Set<Phaser.Tweens.Tween>();
  private readonly tweens = new Set<Phaser.Tweens.Tween>();
  /**
   * Effect drawings, reused (CLAUDE.md "Performance"; audit 2026-10-21, DÜŞÜK 9): the sight-line
   * and lamp flashes and the glances over the board, and the win's room flashes under the walls.
   */
  private readonly fxPool: Pool<Phaser.GameObjects.Graphics>;
  private readonly flashPool: Pool<Phaser.GameObjects.Graphics>;
  /** The progress dots (D75), the hint's reason (D74) and the teaching demonstration (D70). */
  private readonly dotsRow: ProgressDots;
  private readonly dotMotions: Timeline;
  private readonly reason: ReasonDisplay;
  private readonly demoPlayer: DemoPlayer;
  /** A ghost lifted by a drag (D72): the cell it was lifted from and its sprite. */
  private carried: { cell: number; sprite: GhostSprite } | null = null;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly view: BoardView,
    private readonly layout: Layout,
    styles: readonly RoomStyle[],
  ) {
    const h = view.house;
    const { board, cell, wall } = layout;
    serial++;
    const floorKey = `gb-floor-${String(serial)}`;
    const wallKey = `gb-walls-${String(serial)}`;
    this.keys.push(floorKey, wallKey);

    // the floor: each room's colour and wallpaper (D71), the faint cell grid
    const g = scene.make.graphics({}, false);
    for (let i = 0; i < h.size; i++) {
      const style = styles[h.roomOf[i] as number] as RoomStyle;
      const x = (i % h.n) * cell;
      const y = Math.floor(i / h.n) * cell;
      g.fillStyle(COLOR_FLOORS[style.level]?.[style.hue] as number, 1);
      g.fillRect(x, y, cell, cell);
      this.pattern(g, style.pattern, COLOR_FLOOR_INKS[style.level]?.[style.hue] as number, x, y);
    }
    g.lineStyle(layout.grid, COLOR_WALL, GRID_ALPHA);
    for (let k = 1; k < h.n; k++) {
      g.lineBetween(k * cell, 0, k * cell, board.height);
      g.lineBetween(0, k * cell, board.width, k * cell);
    }
    g.generateTexture(floorKey, board.width, board.height);
    g.clear();

    // the light hatch over lit cells (amber stripes with a brown edge, D71), then the walls: half
    // a wall outside the board on every side, each run long enough to close its corners
    const pad = wall / 2;
    const { stripes, edges } = hatch();
    const shape = (p: Polygon, x0: number, y0: number): Phaser.Types.Math.Vector2Like[] =>
      p.map(([x, y]) => ({ x: x0 + x * cell, y: y0 + y * cell }));
    for (let i = 0; i < h.size; i++) {
      if (!h.lit[i]) continue;
      const x0 = pad + (i % h.n) * cell;
      const y0 = pad + Math.floor(i / h.n) * cell;
      g.fillStyle(COLOR_HATCH, 1);
      for (const p of stripes) g.fillPoints(shape(p, x0, y0), true);
      g.fillStyle(COLOR_HATCH_EDGE, 1);
      for (const p of edges) g.fillPoints(shape(p, x0, y0), true);
    }
    g.fillStyle(COLOR_WALL, 1);
    for (const r of wallRuns(h)) {
      g.fillRect(
        r.x1 * cell,
        r.y1 * cell,
        (r.x2 - r.x1) * cell + wall,
        (r.y2 - r.y1) * cell + wall,
      );
    }
    g.generateTexture(wallKey, board.width + wall, board.height + wall);
    g.destroy();

    this.root = scene.add.container(0, 0);
    this.glowLayer = scene.add.container(0, 0);
    this.ringLayer = scene.add.container(0, 0);
    this.objectLayer = scene.add.container(0, 0);
    this.markLayer = scene.add.container(0, 0);
    this.preview = scene.add.graphics();
    this.lines = scene.add.graphics();
    this.fx = scene.add.container(0, 0);
    const demoLayer = scene.add.container(0, 0);
    this.ghostLayer = scene.add.container(0, 0);
    this.frame = scene.add.graphics();
    const pool = (layer: Phaser.GameObjects.Container): Pool<Phaser.GameObjects.Graphics> =>
      new Pool(
        () => {
          const fx = scene.add.graphics();
          layer.add(fx);
          return fx;
        },
        (fx) => fx.clear().setVisible(false).setAlpha(1),
      );
    this.fxPool = pool(this.fx);
    this.flashPool = pool(this.glowLayer);
    this.root.add([
      scene.add.image(board.x, board.y, floorKey).setOrigin(0, 0),
      this.glowLayer,
      scene.add.image(board.x - pad, board.y - pad, wallKey).setOrigin(0, 0),
      this.ringLayer,
      this.objectLayer,
      this.markLayer,
      this.preview,
      this.lines,
      this.fx,
      demoLayer,
      this.ghostLayer,
      this.frame,
    ]);
    this.dotMotions = new Timeline(scene, this.moving);
    this.dotsRow = new ProgressDots(scene, layout, styles, view.glowing, this.dotMotions);
    this.root.add(this.dotsRow.root);
    this.reason = new ReasonDisplay(scene, layout, h, this.glowLayer, this.fx);
    this.demoPlayer = new DemoPlayer({
      scene,
      layout,
      under: this.glowLayer,
      over: demoLayer,
      body: (c) => this.ghosts.get(c)?.body ?? null,
      object: (c) => this.objects.get(c) ?? null,
      ghostSize: cell * GHOST_SHARE,
    });

    // the settled cue of each room (D71): a faint teal wash, and a dashed ring inside its walls
    const inset = (wall / 2 + RING_INSET + RING_WIDTH / 2) / cell;
    for (let room = 0; room < h.roomCount; room++) {
      const on = view.glowing.has(room) ? 1 : 0;
      const wash = scene.add.graphics();
      wash.fillStyle(COLOR_SETTLED_WASH, SETTLED_WASH_ALPHA);
      for (const c of h.roomCells[room] ?? []) this.fillCell(wash, c);
      // every dash in one path, stroked once: a ring costs one draw call a frame, not one a dash
      const ring = scene.add.graphics();
      ring.lineStyle(RING_WIDTH, COLOR_SETTLED_RING, 1);
      ring.beginPath();
      const path = {
        lineBetween: (x1: number, y1: number, x2: number, y2: number): void => {
          ring.moveTo(x1, y1);
          ring.lineTo(x2, y2);
        },
      };
      for (const piece of ringSegments(h, room, inset)) {
        dashes(
          path,
          board.x + piece.x1 * cell,
          board.y + piece.y1 * cell,
          board.x + piece.x2 * cell,
          board.y + piece.y2 * cell,
        );
      }
      ring.strokePath();
      this.wash.push(wash.setAlpha(on));
      this.ring.push(ring.setAlpha(on));
      this.glowTween.push(null);
      this.glowLayer.add(wash);
      this.ringLayer.add(ring);
    }
    for (let i = 0; i < h.size; i++) {
      const o = h.objects[i];
      if (o !== 'F' && o !== 'L') continue;
      const at = cellCenter(layout, i);
      const img = scene.add.image(at.x, at.y, o === 'F' ? FURNITURE_KEY : LAMP_KEY);
      img.setDisplaySize(cell, cell);
      this.objects.set(i, img);
      this.objectLayer.add(img);
    }
    for (const m of view.marks) this.markImage(m).setVisible(true);
    for (const [c, st] of view.ghosts) this.ghost(c, st);
    this.frame.lineStyle(wall, COLOR_SOLVED_FRAME, 1);
    this.frame.strokeRect(board.x, board.y, board.width, board.height);
    this.frame.setAlpha(view.solved ? 1 : 0);
    this.drawLines();
  }

  // ---- playback (D41) ---------------------------------------------------------------------------

  /** Plays one move's events; the view (already updated by the scene) is the target state. */
  play(events: readonly PlayEvent[]): void {
    const arrived = new Set<number>();
    for (const e of events) {
      switch (e.type) {
        case 'placed':
          this.place(e.cell);
          arrived.add(e.cell);
          break;
        case 'relocated':
        case 'moved':
          this.glide(e.from, e.to);
          arrived.add(e.to);
          break;
        case 'removed':
          this.remove(e.cell);
          break;
        case 'nudged':
          this.nudge(e.cell);
          break;
        case 'marked':
          for (const c of e.cells) this.mark(c, e.on);
          break;
        case 'status': {
          const s = this.ghosts.get(e.cell);
          if (!s) break;
          s.body.setTexture(GHOST_KEY[e.to]);
          if (!arrived.has(e.cell) && e.from === e.to) break;
          if (e.to === 'seen') {
            this.shiver(s, SHIVER_PX);
            this.flashLines(e.cell, e.by);
          } else if (e.to === 'lit') {
            this.flashLamps(e.lamps);
          } else if (arrived.has(e.cell)) {
            this.glance(e.cell);
          }
          break;
        }
        case 'settled': {
          this.glowTo(e.room, true);
          this.dotsRow.fill(e.room, true);
          // the room's ghost bobs: success moves farther and lasts longer than any failure (D73)
          const cell = [...this.view.ghosts.keys()].find(
            (c) => this.view.house.roomOf[c] === e.room,
          );
          const g = cell === undefined ? undefined : this.ghosts.get(cell);
          if (g) this.bob(g);
          break;
        }
        case 'unsettled':
          this.glowTo(e.room, false);
          this.dotsRow.fill(e.room, false);
          break;
        case 'solved':
          this.frame.setAlpha(1);
          break;
      }
    }
    this.drawLines();
  }

  /** While a drag is in hand: the dots it would paint, or rings round the marks it would erase. */
  showStroke(cells: readonly number[], mode: StrokeMode): void {
    const p = this.preview;
    const r = MARK_SHARE * this.layout.cell;
    p.clear();
    p.fillStyle(COLOR_MARK, HALF);
    p.lineStyle(this.layout.grid, COLOR_MARK, 1);
    for (const c of cells) {
      const at = cellCenter(this.layout, c);
      const free = !this.view.house.blocked[c] && !this.view.ghosts.has(c);
      if (mode === 'paint' && free && !this.view.marks.has(c)) p.fillCircle(at.x, at.y, r);
      if (mode === 'erase' && this.view.marks.has(c)) p.strokeCircle(at.x, at.y, 2 * r);
    }
  }

  clearStroke(): void {
    this.preview.clear();
  }

  // ---- reading the screen back (dev hooks, e2e) -------------------------------------------------

  /** Every motion in hand is done, so what is drawn is final. */
  idle(): boolean {
    for (const t of [...this.moving]) {
      if (t.isDestroyed() || t.isFinished() || t.isPendingRemove()) this.moving.delete(t);
    }
    return this.moving.size === 0;
  }

  /**
   * What the objects on screen show: positions mapped to cells, textures to states (dev hooks;
   * null in production builds, which never read the screen back).
   */
  drawn(): DrawnState | null {
    if (!import.meta.env.DEV) return null;
    const ghosts: [number, GhostStatus][] = [];
    const residents: number[] = [];
    for (const child of this.ghostLayer.list) {
      const root = child as Phaser.GameObjects.Container;
      if (root.getData('dying') === true || !root.visible || root.alpha < HALF) continue;
      const cell = cellAt(this.layout, root.x, root.y);
      const body = root.list[0] as Phaser.GameObjects.Image;
      const state = STATE_OF_KEY.get(body.texture.key);
      if (cell < 0 || !state) continue;
      ghosts.push([cell, state]);
      if (root.list.length > 1) residents.push(cell);
    }
    const marks: number[] = [];
    for (const img of this.marks.values()) {
      const full = img.getData('full') as number;
      if (img.visible && img.scaleX >= full * HALF) marks.push(cellAt(this.layout, img.x, img.y));
    }
    return {
      ghosts: ghosts.sort((a, b) => a[0] - b[0]),
      residents: residents.sort((a, b) => a - b),
      marks: marks.sort((a, b) => a - b),
      settled: this.wash.flatMap((g, room) => (g.alpha >= HALF ? [room] : [])),
      solved: this.frame.alpha >= HALF,
      dots: this.dotsRow.filled(),
    };
  }

  /** Effect drawings made and effects played on this board (dev state: pooled, made < used). */
  effects(): { made: number; used: number } {
    return {
      made: this.fxPool.made + this.flashPool.made,
      used: this.fxPool.used + this.flashPool.used,
    };
  }

  // ---- the win beat -----------------------------------------------------------------------------

  /**
   * The finale (GDD §3a, D73, in graybox form): after the hit stop the rooms flash in room-id order,
   * then every ghost hops and turns to the camera, then waves twice, and the solve time (`seconds`)
   * ticks in where the progress dots were. Its length is the scene's (WIN_BEAT_MS), so a new board
   * for a new screen size never cuts it short.
   */
  celebrate(seconds: number): void {
    const h = this.view.house;
    const step = Math.min(WIN_STEP_MAX_MS, WIN_SWEEP_MS / h.roomCount);
    this.frame.setAlpha(1);
    for (let room = 0; room < h.roomCount; room++) {
      this.later(WIN_HIT_STOP_MS + room * step, () => {
        // under the walls, so the rooms stay outlined while they flash
        const flash = this.effect(this.flashPool);
        flash.fillStyle(COLOR_SOLVED_FRAME, WIN_FLASH_ALPHA);
        for (const c of h.roomCells[room] ?? []) this.fillCell(flash, c);
        this.tween({
          targets: flash,
          alpha: 0,
          duration: WIN_FLASH_MS,
          onComplete: () => {
            this.flashPool.release(flash);
          },
        });
      });
    }
    const hopAt = WIN_HIT_STOP_MS + WIN_SWEEP_MS;
    this.later(hopAt, () => {
      for (const s of this.ghosts.values()) {
        this.tween({
          targets: s.body,
          y: -WIN_HOP_PX,
          duration: WIN_HOP_MS / 2,
          yoyo: true,
          ease: 'Sine.easeOut',
        });
        // the sheet narrows as the ghost turns to the camera, and back
        this.tween({
          targets: s.body,
          scaleX: s.rest * WIN_TURN_SCALE,
          duration: WIN_HOP_MS / 2,
          yoyo: true,
          onStop: () => s.body.setScale(s.rest),
        });
      }
    });
    this.later(hopAt + WIN_HOP_MS, () => {
      for (const s of this.ghosts.values()) {
        const rest = (): void => {
          s.body.setAngle(0);
        };
        this.tween({
          targets: s.body,
          angle: { from: -WIN_WAVE_DEG, to: WIN_WAVE_DEG },
          duration: WIN_WAVE_MS / 2,
          yoyo: true,
          repeat: WIN_WAVES - 1,
          ease: 'Sine.easeInOut',
          onComplete: rest,
          onStop: rest,
        });
      }
    });
    this.dotsRow.finale(seconds, hopAt + WIN_HOP_MS + WIN_WAVES * WIN_WAVE_MS);
  }

  // ---- carrying a ghost (D72), the hint's reason (D74), the demonstrations (D70) ---------------

  /**
   * A drag lifted the ghost on `from`: it follows the pointer from cell to cell, a little larger
   * (on its own cell while the pointer is off the board). A resident is never lifted.
   */
  carry(from: number, over: number): void {
    if (this.view.isResident(from)) return;
    const s = this.carried?.sprite ?? this.ghosts.get(from);
    if (!s) return;
    if (!this.carried) {
      this.settle(s);
      s.root.setScale(CARRY_SCALE);
      this.carried = { cell: from, sprite: s };
    }
    const at = cellCenter(this.layout, over >= 0 ? over : this.carried.cell);
    s.root.setPosition(at.x, at.y);
  }

  /**
   * The carried ghost is put down, after the scene played the drop's events: a ghost that moved
   * has glided on already; one that stayed glides back to its cell.
   */
  endCarry(): void {
    const c = this.carried;
    if (!c) return;
    this.carried = null;
    if (this.ghosts.get(c.cell) === c.sprite) this.glide(c.cell, c.cell);
    else c.sprite.root.setScale(1);
  }

  /** The hint's first press (D74): its reason, and a wrong ghost trembles. */
  showReason(r: HintExplain): void {
    this.reason.show(r);
    const s = r.kind === 'remove' ? this.ghosts.get(r.cell) : undefined;
    if (s) this.shiver(s, SHIVER_PX, HINT_TREMBLE_SWINGS);
  }

  clearReason(): void {
    this.reason.clear();
  }

  /** The house's teaching demonstration (D70); `endDemo` stops it and leaves the board as it was. */
  demo(script: DemoScript): void {
    this.demoPlayer.play(script);
  }

  endDemo(): void {
    this.demoPlayer.stop();
  }

  /** Stops every motion and timer and frees the board's objects and textures. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.dotMotions.stop();
    this.reason.clear();
    this.demoPlayer.stop();
    this.carried = null;
    for (const t of [...this.tweens]) t.stop();
    this.tweens.clear();
    this.moving.clear();
    this.root.destroy();
    for (const k of this.keys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
  }

  // ---- internals --------------------------------------------------------------------------------

  private tween(
    config: Phaser.Types.Tweens.TweenBuilderConfig,
    motion = false,
  ): Phaser.Tweens.Tween {
    const t = this.scene.tweens.add(config);
    this.tweens.add(t);
    if (motion) this.moving.add(t);
    const done = (): void => {
      this.tweens.delete(t);
      this.moving.delete(t);
    };
    t.on(Phaser.Tweens.Events.TWEEN_COMPLETE, done);
    t.on(Phaser.Tweens.Events.TWEEN_STOP, done);
    return t;
  }

  /** A drawing from the pool, shown and opaque, empty until the effect draws into it. */
  private effect(pool: Pool<Phaser.GameObjects.Graphics>): Phaser.GameObjects.Graphics {
    return pool.acquire().setVisible(true).setAlpha(1);
  }

  /** `fn` after `ms` on the tween clock, which every motion runs on (src/game/timeline.ts). */
  private later(ms: number, fn: () => void): void {
    this.tween({
      targets: { step: 0 },
      step: 1,
      duration: ms,
      onComplete: () => {
        if (!this.destroyed) fn();
      },
    });
  }

  private fillCell(g: Phaser.GameObjects.Graphics, c: number): void {
    const { board, cell, n } = this.layout;
    g.fillRect(board.x + (c % n) * cell, board.y + Math.floor(c / n) * cell, cell, cell);
  }

  /** A cell's wallpaper, drawn inside the cell so a room's pattern runs on from cell to cell. */
  private pattern(
    g: Phaser.GameObjects.Graphics,
    p: Pattern,
    color: number,
    x: number,
    y: number,
  ): void {
    const { cell } = this.layout;
    const step = PATTERN_STEP * cell;
    const count = Math.round(1 / PATTERN_STEP);
    g.lineStyle(PATTERN_LINE * cell, color, 1);
    g.fillStyle(color, 1);
    for (let k = 0; k < count; k++) {
      const o = (k + HALF) * step;
      if (p === 'diamonds') {
        // a small diamond on every point of the grid
        const h = PATTERN_DIAMOND * cell;
        for (let j = 0; j < count; j++) {
          const cx = x + o;
          const cy = y + (j + HALF) * step;
          g.fillPoints(
            [
              { x: cx, y: cy - h },
              { x: cx + h, y: cy },
              { x: cx, y: cy + h },
              { x: cx - h, y: cy },
            ],
            true,
          );
        }
      } else if (p === 'checks') {
        // small squares on every other point of the grid, staggered row by row
        const side = PATTERN_CHECK * cell;
        for (let j = k % 2; j < count; j += 2) {
          g.fillRect(x + o - side / 2, y + (j + HALF) * step - side / 2, side, side);
        }
      } else if (p === 'vstripes') {
        g.lineBetween(x + o, y, x + o, y + cell);
      } else if (p === 'hstripes') {
        g.lineBetween(x, y + o, x + cell, y + o);
      } else if (p === 'diagonal') {
        // the lines u + v = d through the cell (u, v from its top left)
        for (const d of [o, o + cell]) {
          const u0 = Math.max(0, d - cell);
          const u1 = Math.min(cell, d);
          if (u1 > u0) g.lineBetween(x + u0, y + d - u0, x + u1, y + d - u1);
        }
      } else {
        // antidiagonal: the lines v − u = d
        for (const d of [o - cell, o]) {
          const u0 = Math.max(0, -d);
          const u1 = Math.min(cell, cell - d);
          if (u1 > u0) g.lineBetween(x + u0, y + u0 + d, x + u1, y + u1 + d);
        }
      }
    }
  }

  private markImage(c: number): Phaser.GameObjects.Image {
    let img = this.marks.get(c);
    if (!img) {
      const at = cellCenter(this.layout, c);
      img = this.scene.add.image(at.x, at.y, MARK_KEY);
      img.setDisplaySize(this.layout.cell, this.layout.cell).setVisible(false);
      img.setData('full', img.scaleX);
      this.marks.set(c, img);
      this.markLayer.add(img);
    }
    return img;
  }

  private mark(c: number, on: boolean): void {
    const img = this.markImage(c);
    const full = img.getData('full') as number;
    for (const t of this.scene.tweens.getTweensOf(img)) t.stop();
    if (on) {
      img.setVisible(true).setScale(0);
      this.tween(
        { targets: img, scale: full, duration: MARK_MS, onStop: () => img.setScale(full) },
        true,
      );
    } else {
      this.tween(
        {
          targets: img,
          scale: 0,
          duration: MARK_MS,
          onComplete: () => img.setVisible(false),
          onStop: () => img.setVisible(false).setScale(0),
        },
        true,
      );
    }
  }

  private ghost(c: number, state: GhostStatus): GhostSprite {
    const at = cellCenter(this.layout, c);
    const size = this.layout.cell * GHOST_SHARE;
    const body = this.scene.add.image(0, 0, GHOST_KEY[state]).setDisplaySize(size, size);
    const root = this.scene.add.container(at.x, at.y, [body]);
    if (this.view.isResident(c)) {
      root.add(this.scene.add.image(0, 0, CAP_KEY).setDisplaySize(size, size));
    }
    this.ghostLayer.add(root);
    const s: GhostSprite = { root, body, rest: body.scaleX, motion: null, shake: null, bob: null };
    this.ghosts.set(c, s);
    return s;
  }

  /** Ends a ghost's pop or glide where it was going. */
  private settle(s: GhostSprite): void {
    s.motion?.stop();
    s.motion = null;
    s.root.setScale(1).setAlpha(1);
  }

  private place(c: number): void {
    const s = this.ghost(c, 'calm');
    s.root.setScale(0);
    s.motion = this.tween(
      {
        targets: s.root,
        scale: 1,
        duration: POP_MS,
        ease: popEase,
        onStop: () => s.root.setScale(1),
      },
      true,
    );
  }

  private glide(from: number, to: number): void {
    const s = this.ghosts.get(from);
    if (!s) return;
    this.ghosts.delete(from);
    this.ghosts.set(to, s);
    this.settle(s);
    const at = cellCenter(this.layout, to);
    s.motion = this.tween(
      {
        targets: s.root,
        x: at.x,
        y: at.y,
        duration: GLIDE_MS,
        ease: 'Sine.easeInOut',
        onStop: () => s.root.setPosition(at.x, at.y),
      },
      true,
    );
  }

  private remove(c: number): void {
    const s = this.ghosts.get(c);
    if (!s) return;
    this.ghosts.delete(c);
    this.settle(s);
    s.shake?.stop();
    s.bob?.stop();
    s.root.setData('dying', true);
    this.tween(
      {
        targets: s.root,
        y: s.root.y - REMOVE_RISE,
        alpha: 0,
        duration: REMOVE_MS,
        onComplete: () => s.root.destroy(),
        onStop: () => s.root.destroy(),
      },
      true,
    );
  }

  private nudge(c: number): void {
    const target = this.ghosts.get(c)?.body ?? this.objects.get(c);
    if (!target || this.scene.tweens.isTweening(target)) return;
    this.tween({ targets: target, x: target.x + NUDGE_PX, duration: NUDGE_MS / 2, yoyo: true });
  }

  /** A settle: the ghost grows a little and hops, then lands (D73). */
  private bob(s: GhostSprite): void {
    s.bob?.stop();
    const rest = (): void => {
      s.body.setScale(s.rest);
      s.body.y = 0;
      s.bob = null;
    };
    s.bob = this.tween({
      targets: s.body,
      scaleX: s.rest * SETTLE_SCALE,
      scaleY: s.rest * SETTLE_SCALE,
      y: -SETTLE_HOP_PX,
      duration: SETTLE_MS / 2,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: rest,
      onStop: rest,
    });
  }

  private shiver(s: GhostSprite, px: number, swings = SHIVER_SWINGS): void {
    s.shake?.stop();
    const rest = (): void => {
      s.body.x = 0;
      s.shake = null;
    };
    s.shake = this.tween({
      targets: s.body,
      x: { from: -px, to: px },
      duration: SHIVER_SWING_MS,
      yoyo: true,
      repeat: swings - 1,
      onComplete: rest,
      onStop: rest,
    });
  }

  private glowTo(room: number, on: boolean): void {
    const wash = this.wash[room];
    const ring = this.ring[room];
    if (!wash || !ring) return;
    this.glowTween[room]?.stop();
    this.glowTween[room] = this.tween(
      {
        targets: [wash, ring],
        alpha: on ? 1 : 0,
        duration: on ? GLOW_IN_MS : GLOW_OUT_MS,
        onStop: () => {
          wash.setAlpha(on ? 1 : 0);
          ring.setAlpha(on ? 1 : 0);
        },
      },
      true,
    );
  }

  /** Dots from the middle of cell a toward the middle of cell b (both ends left out). */
  private dots(g: Phaser.GameObjects.Graphics, a: number, b: number): void {
    const p = cellCenter(this.layout, a);
    const q = cellCenter(this.layout, b);
    const r = SEEN_DOT * this.layout.cell;
    for (const d of dotsBetween(p, q, SEEN_DOT_STEP * this.layout.cell)) g.fillCircle(d.x, d.y, r);
  }

  /** The faint dotted line between every two ghosts that see each other, while they do (D59). */
  private drawLines(): void {
    this.lines.clear();
    this.lines.fillStyle(COLOR_SEEN_LINE, SEEN_LINE_ALPHA);
    for (const [a, b] of this.view.sightPairs()) this.dots(this.lines, a, b);
  }

  /** The line to each ghost that sees this one flashes twice (GDD §3a, D23). */
  private flashLines(cell: number, by: readonly number[]): void {
    if (by.length === 0) return;
    const g = this.effect(this.fxPool);
    g.fillStyle(COLOR_SEEN_LINE, SEEN_LINE_FLASH_ALPHA);
    for (const b of by) this.dots(g, cell, b);
    this.later(SEEN_LINE_ON_MS, () => g.setVisible(false));
    this.later(SEEN_LINE_ON_MS + SEEN_LINE_OFF_MS, () => g.setVisible(true));
    this.later(2 * SEEN_LINE_ON_MS + SEEN_LINE_OFF_MS, () => {
      this.fxPool.release(g);
    });
  }

  /** Every cell those lamps light flashes warm once (GDD §3a). */
  private flashLamps(lamps: readonly number[]): void {
    if (lamps.length === 0) return;
    const h = this.view.house;
    const g = this.effect(this.fxPool);
    g.fillStyle(COLOR_HATCH, LIT_FLASH_ALPHA);
    for (let i = 0; i < h.size; i++) {
      if ((h.lampsOf[i] ?? []).some((l) => lamps.includes(l))) this.fillCell(g, i);
    }
    this.tween({
      targets: g,
      alpha: 0,
      duration: LIT_FLASH_MS,
      onComplete: () => {
        this.fxPool.release(g);
      },
    });
  }

  /** A calm ghost looks along its row and column up to the first blocker (GDD §3a, §7). */
  private glance(cell: number): void {
    const h = this.view.house;
    const g = this.effect(this.fxPool);
    g.fillStyle(COLOR_GLANCE, 1);
    for (const seg of [h.rowSeg[cell], h.colSeg[cell]]) {
      const cells = h.segments[seg as number]?.cells ?? [];
      for (const end of [cells[0], cells[cells.length - 1]]) {
        if (end === undefined || end === cell) continue;
        this.dots(g, cell, end);
        const at = cellCenter(this.layout, end);
        g.fillCircle(at.x, at.y, SEEN_DOT * this.layout.cell);
      }
    }
    g.setAlpha(GLANCE_ALPHA);
    this.tween({
      targets: g,
      alpha: 0,
      duration: GLANCE_MS,
      onComplete: () => {
        this.fxPool.release(g);
      },
    });
  }
}
