import Phaser from 'phaser';
import {
  AFTERIMAGE_ALPHA,
  AFTERIMAGE_MS,
  CARRY_SCALE,
  COLOR_FLOORS,
  COLOR_FLOOR_INKS,
  COLOR_GLANCE,
  COLOR_HATCH,
  COLOR_HATCH_EDGE,
  COLOR_MARK,
  COLOR_SEEN_LINE,
  COLOR_SETTLED_RING,
  COLOR_SETTLE_VEIL,
  COLOR_SOLVED_FRAME,
  COLOR_WALL,
  FLOOR_MARGIN,
  GHOST_SHARE,
  GLANCE_ALPHA,
  GLANCE_MS,
  GLIDE_LEAN_DEG,
  GLIDE_MS,
  GLOW_IN_MS,
  GLOW_OUT_MS,
  GRID_ALPHA,
  HATCH_HALO,
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
  PATTERN_SCALE,
  PATTERN_STEP,
  POP_MS,
  POP_SCALE,
  REMOVE_MS,
  REMOVE_RISE,
  RING_INSET,
  RING_WIDTH,
  SEEN_DOT_STEP,
  SETTLE_CHEER_MS,
  SETTLE_CHEER_SCALE,
  SETTLE_HOP_PX,
  SETTLE_MS,
  SETTLE_SCALE,
  SETTLE_VEIL_ALPHA,
  SETTLE_VEIL_MS,
  SHIVER_PX,
  SHIVER_SWINGS,
  WIN_BEAT_MS,
  WIN_FLASH_FROM,
  WIN_FLASH_MS,
  WIN_FLASH_TO,
  WIN_HIT_STOP_MS,
  WIN_HOP_MS,
  WIN_HOP_PX,
  WIN_RING_ALPHA,
  WIN_RING_MS,
  WIN_STEP_MAX_MS,
  WIN_SWEEP_MS,
  WIN_TICK_FROM,
  WIN_TICK_LIFT,
  WIN_TICK_RISE_PX,
  WIN_TICK_SHARE,
  WIN_TICK_TO,
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
import {
  CAP_KEY,
  CONTENT_KEY,
  FURNITURE_KEY,
  GHOST_KEY,
  LAMP_KEY,
  LIGHT_RING_KEY,
  TICK_KEY,
  dotKey,
  dotSize,
  markKey,
  pixelKey,
} from './graybox';
import { cellAt, cellCenter, type Layout } from './layout';
import {
  clipPolygon,
  dotsBetween,
  hatch,
  ringSegments,
  wallRuns,
  type Pattern,
  type Point,
  type Polygon,
  type RoomStyle,
} from './look';
import { Pool } from './pool';
import { ReasonDisplay, type ReasonPicture } from './reason';
import { shiverTween } from './shiver';
import { Timeline } from './timeline';
import type { BoardView, ViewState } from './view';

/** What the display shows, read back from its objects (the e2e compares it with the rules). */
export interface DrawnState extends ViewState {
  /** Ghosts drawn with a nightcap. */
  residents: number[];
  /** Rooms whose progress dot is full (D75). */
  dots: number[];
  /** Ghosts drawn with the content face (D84): the calm ghosts of settled rooms. */
  content: number[];
  /** Rooms whose progress dot shows its tick (D84). */
  ticks: number[];
}

interface GhostSprite {
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  /** The body's scale at rest (its display size in the cell). */
  rest: number;
  motion: Phaser.Tweens.Tween | null;
  shake: Phaser.Tweens.Tween | null;
  /** A settle's bob, then its last content pop (D84). */
  bob: Phaser.Tweens.Tween | null;
  cheer: Phaser.Tweens.Tween | null;
}

const HALF = 0.5;

/** A ghost still plays a settle's motion: its pop or glide, its bob, its content pop, a shiver. */
function settling(s: GhostSprite): boolean {
  return [s.motion, s.bob, s.cheer, s.shake].some((t) => t !== null && t.isPlaying());
}

const STATE_OF_KEY = new Map<string, GhostStatus>([
  ...(Object.entries(GHOST_KEY) as [GhostStatus, string][]).map(
    ([state, key]) => [key, state] as [string, GhostStatus],
  ),
  // the content face is a calm ghost in a settled room (D84)
  [CONTENT_KEY, 'calm'],
]);
/** A cell's four sides, as (row, column) steps: up, down, left, right. */
const SIDES: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

let serial = 0;

/** The pop-in: up to POP_SCALE in the first half, back to 1 in the second (GDD §3a). */
function popEase(t: number): number {
  return t < HALF ? POP_SCALE * (t / HALF) : POP_SCALE + (1 - POP_SCALE) * ((t - HALF) / HALF);
}

/**
 * One house on screen in the graybox look (TASKS.md Epic 3; D71, D84, D85): the floor (room
 * colours, wallpaper patterns, the thin cell grid), the amber hatch of lit cells under the thick
 * walls, furniture and lamps, the solid ring of settled rooms, marks, the dotted lines between
 * ghosts that see each other, the ghosts, the progress dots, and the frame of a solved house.
 * Every ink touches only its own floor's colour (round 1's code audit, DÜŞÜK 7): the wallpaper and
 * the hatch stop FLOOR_MARGIN inside every wall, nothing is printed on an object's cell, and marks,
 * dots and the hatch's stripes carry a ring of their floor. Nothing that stays on screen is a
 * Graphics object (WebGL would build it again every frame; round 1's code audit, ORTA 4): floors
 * and walls are textures drawn once, rings, flashes and veils are a one-colour texture scaled,
 * dots and marks textures per floor colour. It only plays the rules' events back, keeps every
 * motion interruptible so rapid taps always settle on the rules' board, and reads itself back
 * for the e2e (`drawn()`).
 */
export class BoardDisplay {
  readonly root: Phaser.GameObjects.Container;
  private readonly keys: string[] = [];
  private readonly glowLayer: Phaser.GameObjects.Container;
  /** Per room, its solid settled ring (D84), shown with its alpha. */
  private readonly ring: Phaser.GameObjects.Container[] = [];
  private readonly ringLayer: Phaser.GameObjects.Container;
  private readonly glowTween: (Phaser.Tweens.Tween | null)[] = [];
  private readonly objectLayer: Phaser.GameObjects.Container;
  private readonly objects = new Map<number, Phaser.GameObjects.Image>();
  private readonly markLayer: Phaser.GameObjects.Container;
  private readonly marks = new Map<number, Phaser.GameObjects.Image>();
  private readonly preview: Phaser.GameObjects.Graphics;
  private readonly lines: Phaser.GameObjects.Container;
  private readonly lineDots: Phaser.GameObjects.Image[] = [];
  private readonly fx: Phaser.GameObjects.Container;
  private readonly ghostLayer: Phaser.GameObjects.Container;
  private readonly ghosts = new Map<number, GhostSprite>();
  private readonly top: Phaser.GameObjects.Container;
  private readonly frame: Phaser.GameObjects.Container;
  /** Motions the screen must finish before it equals the rules (the e2e waits for none). */
  private readonly moving = new Set<Phaser.Tweens.Tween>();
  private readonly tweens = new Set<Phaser.Tweens.Tween>();
  /**
   * Effect images, reused (CLAUDE.md "Performance"; audit 2026-10-21, DÜŞÜK 9): the dots of
   * sight lines and glances over the board, the cells of flashes over it (a lamp's light) and
   * under its walls (a settle's veil, the finale's room flashes).
   */
  private readonly dotPool: Pool<Phaser.GameObjects.Image>;
  private readonly fxTiles: Pool<Phaser.GameObjects.Image>;
  private readonly glowTiles: Pool<Phaser.GameObjects.Image>;
  /** The progress dots (D75), the hint's reason (D74) and the teaching demonstration (D70). */
  private readonly dotsRow: ProgressDots;
  private readonly dotMotions: Timeline;
  private readonly reason: ReasonDisplay;
  private readonly demoPlayer: DemoPlayer;
  /** A ghost lifted by a drag (D72): the cell it was lifted from and its sprite. */
  private carried: { cell: number; sprite: GhostSprite } | null = null;
  private destroyed = false;
  /**
   * The dev hooks' record (DEV builds only): how many ghosts still played a settle's motion (its
   * pop, bob or content pop) when the finale's ghosts began to hop (round 2's code audit, DÜŞÜK 4).
   */
  private readonly dev: {
    settlingAtHop: number | null;
    /** The relocation afterimages on screen, by the cell each stands on (D100). */
    afterimages: Map<Phaser.GameObjects.Image, number>;
  } | null = import.meta.env.DEV ? { settlingAtHop: null, afterimages: new Map() } : null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly view: BoardView,
    private readonly layout: Layout,
    private readonly styles: readonly RoomStyle[],
  ) {
    const h = view.house;
    const { board, cell, wall } = layout;
    serial++;
    const floorKey = `gb-floor-${String(serial)}`;
    const wallKey = `gb-walls-${String(serial)}`;
    this.keys.push(floorKey, wallKey);
    const pad = wall / 2;
    /** How far inside a wall's centre line the plain band reaches (D85). */
    const band = pad + FLOOR_MARGIN;

    // the floor: each room's colour and wallpaper (D71, D85); nothing printed on an object's
    // cell; the wallpaper cleared in a band inside every wall and round the hatch's stripes, so
    // the ring, the walls and the hatch touch only plain floor; the faint cell grid on top
    const g = scene.make.graphics({}, false);
    const { stripes, edges } = hatch();
    const shape = (p: Polygon, x0: number, y0: number): Phaser.Types.Math.Vector2Like[] =>
      p.map(([x, y]) => ({ x: x0 + x * cell, y: y0 + y * cell }));
    for (let i = 0; i < h.size; i++) {
      const floor = this.floorOf(i);
      const x = (i % h.n) * cell;
      const y = Math.floor(i / h.n) * cell;
      g.fillStyle(floor, 1);
      g.fillRect(x, y, cell, cell);
      if (!h.blocked[i]) {
        const style = styles[h.roomOf[i] as number] as RoomStyle;
        this.pattern(g, style.pattern, this.inkOf(i), x, y);
      }
    }
    for (let i = 0; i < h.size; i++) {
      const x = (i % h.n) * cell;
      const y = Math.floor(i / h.n) * cell;
      g.fillStyle(this.floorOf(i), 1);
      const [up, down, left, right] = SIDES.map(([dr, dc]) => this.wallBeside(i, dr, dc));
      if (up) g.fillRect(x, y, cell, band);
      if (down) g.fillRect(x, y + cell - band, cell, band);
      if (left) g.fillRect(x, y, band, cell);
      if (right) g.fillRect(x + cell - band, y, band, cell);
      // a wall that only touches a corner of the cell (an inner corner of the room) clears it too
      for (const [cr, cc] of [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
      ] as const) {
        if (this.cornerWalled(i, cr, cc))
          g.fillRect(x + cc * (cell - band), y + cr * (cell - band), band, band);
      }
      if (h.lit[i]) {
        // the plain band round the hatch's stripes (HATCH_HALO of a cell)
        g.lineStyle(2 * HATCH_HALO * cell, this.floorOf(i), 1);
        for (const p of this.hatchIn(i, [...stripes, ...edges], band)) {
          const pts = shape(p, x, y);
          g.fillPoints(pts, true);
          g.strokePoints(pts, true, true);
        }
      }
    }
    g.lineStyle(layout.grid, COLOR_WALL, GRID_ALPHA);
    for (let k = 1; k < h.n; k++) {
      g.lineBetween(k * cell, 0, k * cell, board.height);
      g.lineBetween(0, k * cell, board.width, k * cell);
    }
    g.generateTexture(floorKey, board.width, board.height);
    g.clear();

    // the light hatch over lit cells (amber stripes with a brown edge, D71), stopping at the plain
    // band inside the walls; then the walls: half a wall outside the board on every side, each run
    // long enough to close its corners
    for (let i = 0; i < h.size; i++) {
      if (!h.lit[i]) continue;
      const x0 = pad + (i % h.n) * cell;
      const y0 = pad + Math.floor(i / h.n) * cell;
      g.fillStyle(COLOR_HATCH, 1);
      for (const p of this.hatchIn(i, stripes, band)) g.fillPoints(shape(p, x0, y0), true);
      g.fillStyle(COLOR_HATCH_EDGE, 1);
      for (const p of this.hatchIn(i, edges, band)) g.fillPoints(shape(p, x0, y0), true);
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
    this.lines = scene.add.container(0, 0);
    this.fx = scene.add.container(0, 0);
    const demoLayer = scene.add.container(0, 0);
    this.ghostLayer = scene.add.container(0, 0);
    this.top = scene.add.container(0, 0);
    this.frame = scene.add.container(0, 0);
    const images = (layer: Phaser.GameObjects.Container): Pool<Phaser.GameObjects.Image> =>
      new Pool(
        () => {
          const img = scene.add.image(0, 0, pixelKey(scene, COLOR_WALL)).setOrigin(0, 0);
          layer.add(img);
          return img;
        },
        (img) => {
          for (const t of scene.tweens.getTweensOf(img)) t.stop();
          img.setVisible(false).setAlpha(1).setScale(1);
        },
      );
    this.dotPool = images(this.fx);
    this.fxTiles = images(this.fx);
    this.glowTiles = images(this.glowLayer);
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
      this.top,
      this.frame,
    ]);
    this.dotMotions = new Timeline(scene, this.moving);
    this.dotsRow = new ProgressDots(scene, layout, styles, view.glowing, this.dotMotions);
    this.keys.push(...this.dotsRow.keys);
    this.root.add(this.dotsRow.root);
    this.reason = new ReasonDisplay(scene, layout, h, this.glowLayer, this.fx, (c) =>
      this.floorOf(c),
    );
    this.demoPlayer = new DemoPlayer({
      scene,
      layout,
      under: this.glowLayer,
      over: demoLayer,
      body: (c) => this.ghosts.get(c)?.body ?? null,
      object: (c) => this.objects.get(c) ?? null,
      floorOf: (c) => this.floorOf(c),
      ghostSize: cell * GHOST_SHARE,
    });

    // the textures of every effect this board can show, made now rather than on the first tap
    // (a first use would cost the frame of that tap)
    for (const style of new Set(styles.map((st) => COLOR_FLOORS[st.level]?.[st.hue] as number))) {
      markKey(scene, style);
      dotKey(scene, COLOR_SEEN_LINE, style);
      dotKey(scene, COLOR_GLANCE, style);
    }
    for (const c of [COLOR_SETTLE_VEIL, COLOR_SOLVED_FRAME, COLOR_HATCH]) pixelKey(scene, c);

    // the settled ring of each room (D84): solid, inside its walls, in the plain band
    const inset = (pad + RING_INSET + RING_WIDTH / 2) / cell;
    const teal = pixelKey(scene, COLOR_SETTLED_RING);
    for (let room = 0; room < h.roomCount; room++) {
      const ring = scene.add.container(0, 0);
      for (const piece of ringSegments(h, room, inset)) {
        const x1 = board.x + Math.min(piece.x1, piece.x2) * cell - RING_WIDTH / 2;
        const y1 = board.y + Math.min(piece.y1, piece.y2) * cell - RING_WIDTH / 2;
        const w = Math.abs(piece.x2 - piece.x1) * cell + RING_WIDTH;
        const len = Math.abs(piece.y2 - piece.y1) * cell + RING_WIDTH;
        ring.add(scene.add.image(x1, y1, teal).setOrigin(0, 0).setDisplaySize(w, len));
      }
      this.ring.push(ring.setAlpha(view.glowing.has(room) ? 1 : 0));
      this.glowTween.push(null);
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
    // the solved frame: four warm bars over the outer walls
    const warm = pixelKey(scene, COLOR_SOLVED_FRAME);
    for (const [x, y, w, len] of [
      [board.x - pad, board.y - pad, board.width + wall, wall],
      [board.x - pad, board.y + board.height - pad, board.width + wall, wall],
      [board.x - pad, board.y - pad, wall, board.height + wall],
      [board.x + board.width - pad, board.y - pad, wall, board.height + wall],
    ] as const) {
      this.frame.add(scene.add.image(x, y, warm).setOrigin(0, 0).setDisplaySize(w, len));
    }
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
            // the dotted line to the ghosts that see it appears with the pose and stays (D84)
            this.shiver(s, SHIVER_PX);
          } else if (e.to === 'lit') {
            this.flashLamps(e.lamps);
          } else if (arrived.has(e.cell)) {
            this.glance(e.cell);
          }
          break;
        }
        case 'settled': {
          // success outweighs failure (D73, D84), in three beats: the floor flashes as the ghost
          // pops in, then bobs with a content face; the ring draws in as the flash fades; then
          // the ghost and the swatch, its tick shown from the start, pop together
          const last = SETTLE_VEIL_MS + GLOW_IN_MS;
          this.glowTo(e.room, true, SETTLE_VEIL_MS);
          this.veil(e.room);
          this.dotsRow.fill(e.room, true, last);
          const g = this.ghostOfRoom(e.room);
          if (g) this.bob(g, last);
          break;
        }
        case 'unsettled': {
          this.glowTo(e.room, false);
          this.dotsRow.fill(e.room, false);
          const g = this.ghostOfRoom(e.room);
          g?.cheer?.stop();
          break;
        }
        case 'solved':
          this.frame.setAlpha(1);
          break;
      }
    }
    this.faces();
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
    const content: number[] = [];
    for (const child of this.ghostLayer.list) {
      const root = child as Phaser.GameObjects.Container;
      if (root.getData('dying') === true || !root.visible || root.alpha < HALF) continue;
      const cell = cellAt(this.layout, root.x, root.y);
      const body = root.list[0] as Phaser.GameObjects.Image;
      const state = STATE_OF_KEY.get(body.texture.key);
      if (cell < 0 || !state) continue;
      ghosts.push([cell, state]);
      if (root.list.length > 1) residents.push(cell);
      if (body.texture.key === CONTENT_KEY) content.push(cell);
    }
    const marks: number[] = [];
    for (const img of this.marks.values()) {
      const full = img.getData('full') as number;
      if (img.visible && img.scaleX >= full * HALF) marks.push(cellAt(this.layout, img.x, img.y));
    }
    const sort = (v: number[]): number[] => v.sort((a, b) => a - b);
    return {
      ghosts: ghosts.sort((a, b) => a[0] - b[0]),
      residents: sort(residents),
      marks: sort(marks),
      settled: this.ring.flatMap((g, room) => (g.alpha >= HALF ? [room] : [])),
      solved: this.frame.alpha >= HALF,
      dots: this.dotsRow.filled(),
      content: sort(content),
      ticks: this.dotsRow.ticked(),
    };
  }

  /** Effect images made and effects played on this board (dev state: pooled, made < used). */
  effects(): { made: number; used: number } {
    const pools = [this.dotPool, this.fxTiles, this.glowTiles];
    return {
      made: pools.reduce((a, p) => a + p.made, 0),
      used: pools.reduce((a, p) => a + p.used, 0),
    };
  }

  // ---- the win beat -----------------------------------------------------------------------------

  /**
   * The finale (GDD §3a, D73, D84), about 2.4 s: after the hit stop the rooms flash in reading
   * order, each brighter than the last, each with a tick larger and higher than the last (the
   * rising ticks); then a ring of light runs from the board's middle to its frame, every ghost
   * hops and turns to the camera, then waves twice; the solve time ticks in on the held result card
   * that follows (src/game/card.ts, D99). Its length is the scene's (WIN_BEAT_MS), so a new board
   * for a new screen size never cuts it short.
   */
  celebrate(): void {
    const h = this.view.house;
    const rooms = h.roomCount;
    const step = Math.min(WIN_STEP_MAX_MS, WIN_SWEEP_MS / rooms);
    const share = (room: number): number => (rooms > 1 ? room / (rooms - 1) : 1);
    this.frame.setAlpha(1);
    const lights: Phaser.GameObjects.Image[] = [];
    for (let room = 0; room < rooms; room++) {
      this.later(WIN_HIT_STOP_MS + room * step, () => {
        // under the walls, so the rooms stay outlined while they light up; each light stays on
        const alpha = WIN_FLASH_FROM + (WIN_FLASH_TO - WIN_FLASH_FROM) * share(room);
        for (const c of h.roomCells[room] ?? []) {
          const t = this.tile(this.glowTiles, COLOR_SOLVED_FRAME, c).setAlpha(0);
          lights.push(t);
          this.tween({ targets: t, alpha, duration: WIN_FLASH_MS });
        }
        this.risingTick(room, share(room));
      });
    }
    const ringAt = WIN_HIT_STOP_MS + rooms * step;
    this.later(ringAt, () => {
      this.lightRing();
      // the lights fade as the ring runs out, until the next house comes
      this.tween({ targets: lights, alpha: 0, duration: WIN_BEAT_MS - ringAt });
    });
    const hopAt = ringAt + WIN_RING_MS;
    this.later(hopAt, () => {
      // in a small house the last ghost may still settle (houses 1 and 2: its content pop ends at
      // 710 ms): it ends where it was going first, so two motions never move one ghost (round 2's
      // code audit, DÜŞÜK 4)
      for (const s of this.ghosts.values()) this.endSettle(s);
      if (import.meta.env.DEV && this.dev) {
        this.dev.settlingAtHop = [...this.ghosts.values()].filter(settling).length;
      }
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
  }

  /**
   * The ghosts' sprites as drawn now and the relocation afterimages (dev hooks: the glide's frame
   * test, D100); null in production builds.
   */
  sprites(): {
    ghosts: { x: number; y: number; angle: number }[];
    afterimages: { cell: number; alpha: number }[];
  } | null {
    if (!import.meta.env.DEV || !this.dev) return null;
    return {
      ghosts: [...this.ghosts.values()].map((s) => ({
        x: s.root.x,
        y: s.root.y,
        angle: s.body.angle,
      })),
      afterimages: [...this.dev.afterimages].map(([img, cell]) => ({ cell, alpha: img.alpha })),
    };
  }

  /** Ghosts still in a settle's motion when the finale's ghosts began to hop (dev hooks). */
  hopOverlap(): number | null {
    if (!import.meta.env.DEV) return null;
    return this.dev?.settlingAtHop ?? null;
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

  /**
   * The hint's first press (D74, D98): its reason in beats, and a wrong ghost trembles; not
   * `fresh` (a new board for a new screen size), the whole picture at once and no tremble.
   */
  showReason(r: HintExplain, fresh = true): void {
    this.reason.show(r, fresh);
    const s = r.kind === 'remove' ? this.ghosts.get(r.cell) : undefined;
    if (s && fresh) this.shiver(s, SHIVER_PX, HINT_TREMBLE_SWINGS);
  }

  /** What the reason has drawn so far (dev hooks, `visible()`), or null. */
  reasonPicture(): ReasonPicture | null {
    return this.reason.drawn();
  }

  clearReason(): void {
    this.reason.clear();
  }

  /** The hint's reason is on the board (dev hooks). */
  get showingReason(): boolean {
    return this.reason.showing;
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

  /** The floor colour of a cell's room. */
  private floorOf(i: number): number {
    const s = this.styles[this.view.house.roomOf[i] as number] as RoomStyle;
    return COLOR_FLOORS[s.level]?.[s.hue] as number;
  }

  private inkOf(i: number): number {
    const s = this.styles[this.view.house.roomOf[i] as number] as RoomStyle;
    return COLOR_FLOOR_INKS[s.level]?.[s.hue] as number;
  }

  /** Cell i's side toward (dr, dc) is a wall: the board's edge or another room. */
  private wallBeside(i: number, dr: number, dc: number): boolean {
    const { n, roomOf } = this.view.house;
    const r = Math.floor(i / n) + dr;
    const c = (i % n) + dc;
    if (r < 0 || r >= n || c < 0 || c >= n) return true;
    return roomOf[r * n + c] !== roomOf[i];
  }

  /**
   * A wall meets the corner (cr, cc) of cell i (0 top or left, 1 bottom or right): one of the
   * four cell edges that end at that point is a wall.
   */
  private cornerWalled(i: number, cr: number, cc: number): boolean {
    const { n } = this.view.house;
    const r = Math.floor(i / n);
    const c = i % n;
    const dr = cr === 0 ? -1 : 1;
    const dc = cc === 0 ? -1 : 1;
    if (this.wallBeside(i, dr, 0) || this.wallBeside(i, 0, dc)) return true;
    // the neighbours along the corner's two edges, and their edges that end there
    const rr = r + dr;
    const c2 = c + dc;
    if (rr >= 0 && rr < n && this.wallBeside(rr * n + c, 0, dc)) return true;
    return c2 >= 0 && c2 < n && this.wallBeside(r * n + c2, dr, 0);
  }

  /** Hatch polygons of cell i clipped to stop `band` px inside each of its walls (cell units). */
  private hatchIn(i: number, polygons: readonly Polygon[], band: number): Polygon[] {
    const b = band / this.layout.cell;
    const [up, down, left, right] = SIDES.map(([dr, dc]) => (this.wallBeside(i, dr, dc) ? b : 0));
    return polygons
      .map((p) =>
        clipPolygon(p, left as number, up as number, 1 - (right as number), 1 - (down as number)),
      )
      .filter((p) => p.length > 2);
  }

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

  /** A cell's rectangle in one colour, from a pool, shown and opaque. */
  private tile(
    pool: Pool<Phaser.GameObjects.Image>,
    color: number,
    c: number,
  ): Phaser.GameObjects.Image {
    const { board, cell, n } = this.layout;
    return pool
      .acquire()
      .setTexture(pixelKey(this.scene, color))
      .setOrigin(0, 0)
      .setPosition(board.x + (c % n) * cell, board.y + Math.floor(c / n) * cell)
      .setDisplaySize(cell, cell)
      .setVisible(true)
      .setAlpha(1);
  }

  /** One dot in `ink` at a point, with a ring of the floor under it (D85). */
  private dot(
    pool: Pool<Phaser.GameObjects.Image>,
    ink: number,
    p: Point,
  ): Phaser.GameObjects.Image {
    const { board, cell, n } = this.layout;
    const col = Math.min(n - 1, Math.max(0, Math.floor((p.x - board.x) / cell)));
    const row = Math.min(n - 1, Math.max(0, Math.floor((p.y - board.y) / cell)));
    const size = dotSize(cell);
    return pool
      .acquire()
      .setTexture(dotKey(this.scene, ink, this.floorOf(row * n + col)))
      .setOrigin(HALF)
      .setPosition(p.x, p.y)
      .setDisplaySize(size, size)
      .setVisible(true)
      .setAlpha(1);
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
    const diagonal = (): void => {
      // the lines u + v = d through the cell (u, v from its top left)
      for (let k = 0; k < count; k++) {
        for (const d of [(k + HALF) * step, (k + HALF) * step + cell]) {
          const u0 = Math.max(0, d - cell);
          const u1 = Math.min(cell, d);
          if (u1 > u0) g.lineBetween(x + u0, y + d - u0, x + u1, y + d - u1);
        }
      }
    };
    const antidiagonal = (): void => {
      // the lines v − u = d
      for (let k = 0; k < count; k++) {
        for (const d of [(k + HALF) * step - cell, (k + HALF) * step]) {
          const u0 = Math.max(0, -d);
          const u1 = Math.min(cell, cell - d);
          if (u1 > u0) g.lineBetween(x + u0, y + u0 + d, x + u1, y + u1 + d);
        }
      }
    };
    if (p === 'diagonal') return diagonal();
    if (p === 'antidiagonal') return antidiagonal();
    if (p === 'crosshatch') {
      diagonal();
      antidiagonal();
      return;
    }
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
      } else if (p === 'scales') {
        // half rings open at the bottom, every point of the grid, staggered row by row
        const r = PATTERN_SCALE * cell;
        const shift = (k % 2) * (step / 2);
        for (let j = 0; j < count; j++) {
          const cx = x + (((j + HALF) * step + shift) % cell);
          g.beginPath();
          g.arc(cx, y + o, r, Math.PI, 0, false);
          g.strokePath();
        }
      } else if (p === 'vstripes') {
        g.lineBetween(x + o, y, x + o, y + cell);
      } else {
        g.lineBetween(x, y + o, x + cell, y + o);
      }
    }
  }

  private markImage(c: number): Phaser.GameObjects.Image {
    let img = this.marks.get(c);
    if (!img) {
      const at = cellCenter(this.layout, c);
      img = this.scene.add.image(at.x, at.y, markKey(this.scene, this.floorOf(c)));
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

  /** The texture a ghost wears: its state's, or the content face in a settled room (D84). */
  private faceOf(c: number): string {
    const st = this.view.ghosts.get(c) ?? 'calm';
    const room = this.view.house.roomOf[c] as number;
    return st === 'calm' && this.view.glowing.has(room) ? CONTENT_KEY : GHOST_KEY[st];
  }

  /** Every ghost wears the face its state and its room give it. */
  private faces(): void {
    for (const [c, s] of this.ghosts) s.body.setTexture(this.faceOf(c));
  }

  private ghostOfRoom(room: number): GhostSprite | undefined {
    const cell = [...this.view.ghosts.keys()].find((c) => this.view.house.roomOf[c] === room);
    return cell === undefined ? undefined : this.ghosts.get(cell);
  }

  private ghost(c: number, state: GhostStatus): GhostSprite {
    const at = cellCenter(this.layout, c);
    const size = this.layout.cell * GHOST_SHARE;
    const body = this.scene.add.image(0, 0, GHOST_KEY[state]).setDisplaySize(size, size);
    body.setTexture(this.faceOf(c));
    const root = this.scene.add.container(at.x, at.y, [body]);
    if (this.view.isResident(c)) {
      root.add(this.scene.add.image(0, 0, CAP_KEY).setDisplaySize(size, size));
    }
    this.ghostLayer.add(root);
    const s: GhostSprite = {
      root,
      body,
      rest: body.scaleX,
      motion: null,
      shake: null,
      bob: null,
      cheer: null,
    };
    this.ghosts.set(c, s);
    return s;
  }

  /** Ends a ghost's pop or glide where it was going. */
  private settle(s: GhostSprite): void {
    s.motion?.stop();
    s.motion = null;
    s.root.setScale(1).setAlpha(1);
  }

  /** Ends every motion of a ghost's arrival and settle (its pop or glide, bob, content pop, shiver). */
  private endSettle(s: GhostSprite): void {
    this.settle(s);
    s.bob?.stop();
    s.cheer?.stop();
    s.shake?.stop();
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

  /**
   * A ghost glides to `to` (D100): GLIDE_MS, ease in-out, leaning toward its way and straight on
   * arrival, a see-through afterimage fading on the cell it left; a carried ghost put back (`to`
   * its own cell) only glides.
   */
  private glide(from: number, to: number): void {
    const s = this.ghosts.get(from);
    if (!s) return;
    this.ghosts.delete(from);
    this.ghosts.set(to, s);
    this.settle(s);
    const at = cellCenter(this.layout, to);
    let lean = 0;
    if (from !== to) {
      this.afterimage(from, s.body.texture.key);
      const was = cellCenter(this.layout, from);
      const way = at.x !== was.x ? at.x - was.x : at.y - was.y;
      lean = Math.sign(way) * GLIDE_LEAN_DEG;
    }
    const straight = (): void => {
      s.body.setAngle(0);
    };
    s.motion = this.tween(
      {
        targets: s.root,
        x: at.x,
        y: at.y,
        duration: GLIDE_MS,
        ease: 'Sine.easeInOut',
        onUpdate: (t: Phaser.Tweens.Tween) =>
          s.body.setAngle(lean * Math.sin(Math.PI * t.progress)),
        onComplete: straight,
        onStop: () => {
          s.root.setPosition(at.x, at.y);
          straight();
        },
      },
      true,
    );
  }

  /** A see-through copy of a ghost on the cell it left, fading (D100). */
  private afterimage(cell: number, key: string): void {
    const at = cellCenter(this.layout, cell);
    const size = this.layout.cell * GHOST_SHARE;
    const img = this.scene.add.image(at.x, at.y, key).setDisplaySize(size, size);
    img.setAlpha(AFTERIMAGE_ALPHA);
    this.fx.add(img);
    this.dev?.afterimages.set(img, cell);
    const gone = (): void => {
      this.dev?.afterimages.delete(img);
      img.destroy();
    };
    this.tween({ targets: img, alpha: 0, duration: AFTERIMAGE_MS, onComplete: gone, onStop: gone });
  }

  private remove(c: number): void {
    const s = this.ghosts.get(c);
    if (!s) return;
    this.ghosts.delete(c);
    this.settle(s);
    s.shake?.stop();
    s.bob?.stop();
    s.cheer?.stop();
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

  /**
   * A settle (D73, D84): as its pop ends the ghost grows and hops, then lands; at `last` ms it
   * gives a small content pop, the settle's last beat.
   */
  private bob(s: GhostSprite, last: number): void {
    s.bob?.stop();
    s.cheer?.stop();
    const rest = (): void => {
      s.body.setScale(s.rest);
      s.body.y = 0;
    };
    s.bob = this.tween({
      targets: s.body,
      scaleX: s.rest * SETTLE_SCALE,
      scaleY: s.rest * SETTLE_SCALE,
      y: -SETTLE_HOP_PX,
      delay: POP_MS,
      duration: SETTLE_MS / 2,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: rest,
      onStop: rest,
    });
    s.cheer = this.tween(
      {
        targets: s.body,
        scaleX: s.rest * SETTLE_CHEER_SCALE,
        scaleY: s.rest * SETTLE_CHEER_SCALE,
        delay: last,
        duration: SETTLE_CHEER_MS / 2,
        yoyo: true,
        onComplete: rest,
        onStop: rest,
      },
      true,
    );
  }

  /** A settle: a white veil over the room's whole floor, fading (D84). */
  private veil(room: number): void {
    const tiles = (this.view.house.roomCells[room] ?? []).map((c) =>
      this.tile(this.glowTiles, COLOR_SETTLE_VEIL, c).setAlpha(SETTLE_VEIL_ALPHA),
    );
    this.tween({
      targets: tiles,
      alpha: 0,
      duration: SETTLE_VEIL_MS,
      onComplete: () => {
        for (const t of tiles) this.glowTiles.release(t);
      },
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
      ...shiverTween(px, swings),
      onComplete: rest,
      onStop: rest,
    });
  }

  private glowTo(room: number, on: boolean, delay = 0): void {
    const ring = this.ring[room];
    if (!ring) return;
    this.glowTween[room]?.stop();
    this.glowTween[room] = this.tween(
      {
        targets: ring,
        alpha: on ? 1 : 0,
        delay,
        duration: on ? GLOW_IN_MS : GLOW_OUT_MS,
        onStop: () => {
          ring.setAlpha(on ? 1 : 0);
        },
      },
      true,
    );
  }

  /** Dots from the middle of cell a toward the middle of cell b (both ends left out). */
  private dotsOf(a: number, b: number): Point[] {
    const p = cellCenter(this.layout, a);
    const q = cellCenter(this.layout, b);
    return dotsBetween(p, q, SEEN_DOT_STEP * this.layout.cell);
  }

  /** The dotted line between every two ghosts that see each other, while they do (D59). */
  private drawLines(): void {
    for (const d of this.lineDots) this.dotPool.release(d);
    this.lineDots.length = 0;
    for (const [a, b] of this.view.sightPairs()) {
      for (const p of this.dotsOf(a, b)) {
        const d = this.dot(this.dotPool, COLOR_SEEN_LINE, p);
        this.lines.add(d);
        this.lineDots.push(d);
      }
    }
  }

  /** Images back to the pool, into its layer again (a line's dots moved to the lines layer). */
  private release(
    pool: Pool<Phaser.GameObjects.Image>,
    imgs: readonly Phaser.GameObjects.Image[],
  ): void {
    for (const img of imgs) {
      this.fx.add(img);
      pool.release(img);
    }
  }

  /** Every cell those lamps light flashes warm once (GDD §3a). */
  private flashLamps(lamps: readonly number[]): void {
    if (lamps.length === 0) return;
    const h = this.view.house;
    const tiles: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < h.size; i++) {
      if ((h.lampsOf[i] ?? []).some((l) => lamps.includes(l))) {
        tiles.push(this.tile(this.fxTiles, COLOR_HATCH, i).setAlpha(LIT_FLASH_ALPHA));
      }
    }
    this.tween({
      targets: tiles,
      alpha: 0,
      duration: LIT_FLASH_MS,
      onComplete: () => this.release(this.fxTiles, tiles),
    });
  }

  /** A calm ghost looks along its row and column up to the first blocker (GDD §3a, §7). */
  private glance(cell: number): void {
    const h = this.view.house;
    const points: Point[] = [];
    for (const seg of [h.rowSeg[cell], h.colSeg[cell]]) {
      const cells = h.segments[seg as number]?.cells ?? [];
      for (const end of [cells[0], cells[cells.length - 1]]) {
        if (end === undefined || end === cell) continue;
        points.push(...this.dotsOf(cell, end), cellCenter(this.layout, end));
      }
    }
    if (points.length === 0) return;
    const dots = points.map((p) => this.dot(this.dotPool, COLOR_GLANCE, p).setAlpha(GLANCE_ALPHA));
    this.tween({
      targets: dots,
      alpha: 0,
      duration: GLANCE_MS,
      onComplete: () => this.release(this.dotPool, dots),
    });
  }

  /** The finale's tick over a room: larger and higher than the room before it (D84). */
  private risingTick(room: number, share: number): void {
    const cells = this.view.house.roomCells[room] ?? [];
    const ghost = cells.find((c) => this.view.ghosts.has(c)) ?? cells[0];
    if (ghost === undefined) return;
    const { cell } = this.layout;
    const at = cellCenter(this.layout, ghost);
    const rooms = this.view.house.roomCount;
    const scale = WIN_TICK_FROM + (WIN_TICK_TO - WIN_TICK_FROM) * share;
    const rise = WIN_TICK_RISE_PX * share * Math.max(0, rooms - 1);
    const size = WIN_TICK_SHARE * cell;
    const tick = this.scene.add.image(at.x, at.y - WIN_TICK_LIFT * cell - rise, TICK_KEY);
    tick.setDisplaySize(size, size);
    const full = tick.scaleX * scale;
    tick.setScale(0);
    this.top.add(tick);
    this.tween({ targets: tick, scale: full, duration: WIN_FLASH_MS, ease: 'Back.easeOut' });
  }

  /** The ring of light from the board's middle to its frame (D84). */
  private lightRing(): void {
    const { board } = this.layout;
    const ring = this.scene.add.image(
      board.x + board.width / 2,
      board.y + board.height / 2,
      LIGHT_RING_KEY,
    );
    const reach = Math.hypot(board.width, board.height) / ring.width;
    ring.setScale(0).setAlpha(WIN_RING_ALPHA);
    this.top.add(ring);
    this.tween({
      targets: ring,
      scale: reach,
      alpha: 0,
      duration: WIN_RING_MS,
      ease: 'Sine.easeOut',
      onComplete: () => ring.setVisible(false),
    });
  }
}
