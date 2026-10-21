import type Phaser from 'phaser';
import {
  COLOR_DOT_RIM,
  COLOR_FLOORS,
  COLOR_FLOOR_INKS,
  COLOR_SETTLED_RING,
  DOT_EMPTY_ALPHA,
  DOT_PATTERN_LINE,
  DOT_PATTERN_MARK,
  DOT_POP_MS,
  DOT_POP_SCALE,
  DOT_RIM,
  DOT_RING,
  GLOW_OUT_MS,
} from '../config';
import { swatchTickKey } from './graybox';
import { dotsLayout, type Circle, type Layout } from './layout';
import { swatchMarks, type RoomStyle } from './look';
import type { Timeline } from './timeline';

interface Dot {
  at: Circle;
  body: Phaser.GameObjects.Container;
  swatch: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Image;
  tick: Phaser.GameObjects.Image;
  motion: Phaser.Tweens.Tween | null;
}

const HALF = 0.5;
let serial = 0;

/** Draws into a texture of `size` texels once (a scene restart reuses it). */
function bake(
  scene: Phaser.Scene,
  key: string,
  size: number,
  draw: (g: Phaser.GameObjects.Graphics, c: number) => void,
): string {
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({}, false);
  draw(g, size / 2);
  g.generateTexture(key, size, size);
  g.destroy();
  return key;
}

/**
 * The progress dots (D75, D84): one per room in room-id order, in the top band (or the HUD column
 * in landscape), each a swatch of its room's floor colour and wallpaper. A dot fills (full colour,
 * a dark ring, a pop to DOT_POP_SCALE) and keeps a tick when its room settles, and empties when it
 * cools, so a row of full dots is the solved house; text-free. The finale's solve time ticks in
 * below the board, never over the dots (D85). The dots belong to the house's board, so they slide
 * in and out with it. Each dot is images of textures drawn once (round 1's code audit, ORTA 4).
 */
export class ProgressDots {
  readonly root: Phaser.GameObjects.Container;
  /** This row's own textures (the swatches), freed with the board. */
  readonly keys: string[] = [];
  private readonly dots: Dot[];

  constructor(
    scene: Phaser.Scene,
    layout: Layout,
    styles: readonly RoomStyle[],
    settled: ReadonlySet<number>,
    private readonly timeline: Timeline,
  ) {
    serial++;
    this.root = scene.add.container(0, 0);
    this.dots = dotsLayout(layout, styles.length).map((at, room) => {
      const style = styles[room] as RoomStyle;
      const size = 2 * Math.ceil(at.r);
      const swatchKey = bake(scene, `gb-swatch-${String(serial)}-${String(room)}`, size, (g, c) => {
        g.fillStyle(COLOR_FLOORS[style.level]?.[style.hue] as number, 1);
        g.fillCircle(c, c, at.r);
        const ink = COLOR_FLOOR_INKS[style.level]?.[style.hue] as number;
        const marks = swatchMarks(style.pattern, at.r);
        const mark = DOT_PATTERN_MARK * at.r;
        g.lineStyle(DOT_PATTERN_LINE * at.r, ink, 1);
        for (const [x1, y1, x2, y2] of marks.lines) g.lineBetween(c + x1, c + y1, c + x2, c + y2);
        for (const a of marks.arcs) {
          g.beginPath();
          g.arc(c + a.x, c + a.y, a.r, Math.PI, 0, false);
          g.strokePath();
        }
        g.fillStyle(ink, 1);
        for (const p of marks.points) {
          if (style.pattern === 'checks')
            g.fillRect(c + p.x - mark, c + p.y - mark, 2 * mark, 2 * mark);
          else {
            // a diamond as wide as the check's diagonal, so it fits the same circle
            const h = Math.SQRT2 * mark;
            g.fillPoints(
              [
                { x: c + p.x, y: c + p.y - h },
                { x: c + p.x + h, y: c + p.y },
                { x: c + p.x, y: c + p.y + h },
                { x: c + p.x - h, y: c + p.y },
              ],
              true,
            );
          }
        }
      });
      this.keys.push(swatchKey);
      const ringKey = bake(scene, `gb-dot-ring-${String(size)}`, size, (g, c) => {
        g.lineStyle(DOT_RING * at.r, COLOR_SETTLED_RING, 1);
        g.strokeCircle(c, c, at.r * (1 - DOT_RING / 2));
      });
      const rimSize = 2 * Math.ceil(at.r + DOT_RIM);
      const rimKey = bake(scene, `gb-dot-rim-${String(rimSize)}`, rimSize, (g, c) => {
        g.lineStyle(DOT_RIM, COLOR_DOT_RIM, 1);
        g.strokeCircle(c, c, at.r + DOT_RIM / 2);
      });
      const swatch = scene.add.image(0, 0, swatchKey);
      const ring = scene.add.image(0, 0, ringKey);
      const tick = scene.add.image(0, 0, swatchTickKey(scene, size));
      const rim = scene.add.image(0, 0, rimKey);
      const on = settled.has(room);
      swatch.setAlpha(on ? 1 : DOT_EMPTY_ALPHA);
      ring.setAlpha(on ? 1 : 0);
      tick.setAlpha(on ? 1 : 0);
      const body = scene.add.container(at.x, at.y, [swatch, ring, tick, rim]);
      this.root.add(body);
      return { at, body, swatch, ring, tick, motion: null };
    });
  }

  /**
   * The room settled (the dot fills at once and keeps a tick, then pops after `popAt` ms, the
   * settle's last beat, D84) or cooled (it empties).
   */
  fill(room: number, on: boolean, popAt = 0): void {
    const d = this.dots[room];
    if (!d) return;
    d.motion?.stop();
    if (on) {
      d.swatch.setAlpha(1);
      d.ring.setAlpha(1);
      d.tick.setAlpha(1);
      d.motion = this.timeline.tween(
        {
          targets: d.body,
          scale: DOT_POP_SCALE,
          delay: popAt,
          duration: DOT_POP_MS / 2,
          yoyo: true,
          onStop: () => d.body.setScale(1),
        },
        true,
      );
      return;
    }
    const set = (v: number): void => {
      d.ring.setAlpha(v);
      d.tick.setAlpha(v);
      d.swatch.setAlpha(DOT_EMPTY_ALPHA + (1 - DOT_EMPTY_ALPHA) * v);
    };
    const fade = { v: d.ring.alpha };
    d.body.setScale(1);
    d.motion = this.timeline.tween(
      {
        targets: fade,
        v: 0,
        duration: GLOW_OUT_MS,
        onUpdate: () => set(fade.v),
        onComplete: () => set(0),
        onStop: () => set(0),
      },
      true,
    );
  }

  /** The rooms whose dot is full, read back from the drawing (dev hooks). */
  filled(): number[] {
    return this.dots.flatMap((d, room) => (d.ring.alpha >= HALF ? [room] : []));
  }

  /** The rooms whose dot shows its tick (dev hooks). */
  ticked(): number[] {
    return this.dots.flatMap((d, room) => (d.tick.alpha >= HALF ? [room] : []));
  }
}
