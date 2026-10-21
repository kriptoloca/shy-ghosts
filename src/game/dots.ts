import type Phaser from 'phaser';
import {
  COLOR_DOT_RIM,
  COLOR_FLOORS,
  COLOR_FLOOR_INKS,
  COLOR_SETTLED_RING,
  COLOR_WIN_DIGITS,
  DOT_EMPTY_ALPHA,
  DOT_PATTERN_LINE,
  DOT_PATTERN_MARK,
  DOT_POP_MS,
  DOT_POP_SCALE,
  DOT_RIM,
  DOT_RING,
  GLOW_OUT_MS,
  WIN_DIGITS_FONT,
  WIN_DIGITS_MS,
  WIN_DIGITS_SIZE,
} from '../config';
import { dotsLayout, type Circle, type Layout } from './layout';
import { clockText, swatchMarks, type RoomStyle } from './look';
import type { Timeline } from './timeline';

interface Dot {
  at: Circle;
  body: Phaser.GameObjects.Container;
  swatch: Phaser.GameObjects.Graphics;
  ring: Phaser.GameObjects.Graphics;
  motion: Phaser.Tweens.Tween | null;
}

const HALF = 0.5;

/**
 * The progress dots (D75): one per room in room-id order, in the top band (or the HUD column in
 * landscape), each a swatch of its room's floor colour and wallpaper. A dot fills (full colour, a
 * dark ring, a pop) when its room settles and empties when it cools, so a row of full dots is the
 * solved house; text-free. In the finale the row gives way to the solve time ticking in (m:ss,
 * digits only; D73). The dots belong to the house's board, so they slide in and out with it.
 */
export class ProgressDots {
  readonly root: Phaser.GameObjects.Container;
  private readonly dots: Dot[];

  constructor(
    private readonly scene: Phaser.Scene,
    layout: Layout,
    styles: readonly RoomStyle[],
    settled: ReadonlySet<number>,
    private readonly timeline: Timeline,
  ) {
    this.root = scene.add.container(0, 0);
    this.dots = dotsLayout(layout, styles.length).map((at, room) => {
      const style = styles[room] as RoomStyle;
      const swatch = scene.add.graphics();
      swatch.fillStyle(COLOR_FLOORS[style.level]?.[style.hue] as number, 1);
      swatch.fillCircle(0, 0, at.r);
      const ink = COLOR_FLOOR_INKS[style.level]?.[style.hue] as number;
      const marks = swatchMarks(style.pattern, at.r);
      const size = DOT_PATTERN_MARK * at.r;
      swatch.lineStyle(DOT_PATTERN_LINE * at.r, ink, 1);
      for (const [x1, y1, x2, y2] of marks.lines) swatch.lineBetween(x1, y1, x2, y2);
      swatch.fillStyle(ink, 1);
      for (const p of marks.points) {
        if (style.pattern === 'checks') swatch.fillRect(p.x - size, p.y - size, 2 * size, 2 * size);
        else {
          // a diamond as wide as the check's diagonal, so it fits the same circle
          const h = Math.SQRT2 * size;
          swatch.fillPoints(
            [
              { x: p.x, y: p.y - h },
              { x: p.x + h, y: p.y },
              { x: p.x, y: p.y + h },
              { x: p.x - h, y: p.y },
            ],
            true,
          );
        }
      }
      const ring = scene.add.graphics();
      ring.lineStyle(DOT_RING * at.r, COLOR_SETTLED_RING, 1);
      ring.strokeCircle(0, 0, at.r * (1 - DOT_RING / 2));
      const rim = scene.add.graphics();
      rim.lineStyle(DOT_RIM, COLOR_DOT_RIM, 1);
      rim.strokeCircle(0, 0, at.r + DOT_RIM / 2);
      const on = settled.has(room);
      swatch.setAlpha(on ? 1 : DOT_EMPTY_ALPHA);
      ring.setAlpha(on ? 1 : 0);
      const body = scene.add.container(at.x, at.y, [swatch, ring, rim]);
      this.root.add(body);
      return { at, body, swatch, ring, motion: null };
    });
  }

  /** The room settled (the dot fills with a pop) or cooled (it empties). */
  fill(room: number, on: boolean): void {
    const d = this.dots[room];
    if (!d) return;
    d.motion?.stop();
    if (on) {
      d.swatch.setAlpha(1);
      d.ring.setAlpha(1);
      d.motion = this.timeline.tween(
        {
          targets: d.body,
          scale: DOT_POP_SCALE,
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

  /**
   * The finale (D73): from `at` ms the row fades and the solve time ticks in where it was, from
   * 0:00 up to `seconds`, over WIN_DIGITS_MS.
   */
  finale(seconds: number, at: number): void {
    const first = this.dots[0]?.at;
    const last = this.dots[this.dots.length - 1]?.at;
    if (!first || !last) return;
    const x = this.dots.reduce((a, d) => a + d.at.x, 0) / this.dots.length;
    const y = (first.y + last.y) / 2;
    const digits = this.scene.add
      .text(x, y, clockText(0), {
        fontFamily: WIN_DIGITS_FONT,
        fontSize: `${String(WIN_DIGITS_SIZE)}px`,
        fontStyle: 'bold',
        color: COLOR_WIN_DIGITS,
      })
      .setOrigin(HALF)
      .setAlpha(0);
    this.root.add(digits);
    const count = { v: 0 };
    this.timeline.later(at, () => {
      for (const d of this.dots) {
        this.timeline.tween({ targets: d.body, alpha: 0, duration: WIN_DIGITS_MS });
      }
      digits.setAlpha(1);
      this.timeline.tween({
        targets: count,
        v: seconds,
        duration: WIN_DIGITS_MS,
        onUpdate: () => digits.setText(clockText(count.v)),
        onComplete: () => digits.setText(clockText(seconds)),
      });
    });
  }
}
