import type Phaser from 'phaser';
import {
  CARD_ICON as ICON,
  CARD_PULSE_MS,
  CARD_PULSE_SCALE,
  CARD_RIM,
  CARD_RISE_PX,
  CARD_TIME_MS,
  COLOR_CARD,
  COLOR_CARD_TICK,
  COLOR_DOT_RIM,
  COLOR_WIN_DIGITS,
  HEX_RADIX,
  RESULT_IN_MS,
  WIN_DIGITS_FONT,
} from '../config';
import { cardBox, cardSlots, type Layout, type Rect } from './layout';
import { TickingTime, clockText } from './look';
import { Timeline } from './timeline';

/** What the card shows (the dev hooks and `visible()` read it back). */
export interface CardShown {
  house: number;
  /** The solve time as drawn now (it ticks up as the card rises). */
  time: string;
  /** The bulb with a tick: no hint was shown in this house. */
  noHint: boolean;
  /** Beside the board (landscape), else below it. */
  beside: boolean;
}

const HALF = 0.5;
/** The texture key of a drawn shape for a slot of `size` px: drawn once per size. */
function shapeKey(
  scene: Phaser.Scene,
  name: string,
  size: number,
  draw: (g: Phaser.GameObjects.Graphics, s: number) => void,
): string {
  const key = `card-${name}-${String(size)}`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    draw(g, size);
    g.generateTexture(key, size, size);
    g.destroy();
  }
  return key;
}

/** A colour of the config's CSS form ('#rrggbb') as a number for Graphics. */
function colourOf(css: string): number {
  return parseInt(css.slice(1), HEX_RADIX);
}

/**
 * The held result card (Gate B tune round 3 §3, D99): after the finale the solved board stays and
 * this card rises below it (beside it in landscape, `cardBox`), with a small overshoot: the house
 * number, the solve time ticking up from 0:00 (the finale's time digits moved here), a bulb with a
 * tick when no hint was shown in the house, and a next arrow pulsing once a second. It holds until
 * a tap (the scene's guard, RESULT_GUARD_MS); text-free but for digits. On a new screen size it is
 * built again, its time shown at once.
 */
export class ResultCard {
  readonly root: Phaser.GameObjects.Container;
  private readonly timeline: Timeline;
  private readonly keys: string[] = [];
  private readonly time: Phaser.GameObjects.Text;
  private shownTime: string;
  private destroyed = false;
  private risen = false;
  private readonly beside: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    layout: Layout,
    private readonly house: number,
    seconds: number,
    private readonly noHint: boolean,
    /** Rise and tick (a new card), or stand at once (a new screen size). */
    rise: boolean,
    /** Called once the card has risen (dev hooks: when it is up). */
    onUp: () => void = () => undefined,
  ) {
    this.timeline = new Timeline(scene);
    this.beside = layout.arrangement === 'landscape';
    const box = cardBox(layout);
    const slots = cardSlots(box);
    this.root = scene.add.container(0, 0);
    this.root.add(this.panel(box));
    const [houseAt, timeAt, badgeAt, arrowAt] = slots.cells as [Rect, Rect, Rect, Rect];
    const text = (at: Rect, s: string): Phaser.GameObjects.Text =>
      scene.add
        .text(at.x + at.width / 2, at.y + at.height / 2, s, {
          fontFamily: WIN_DIGITS_FONT,
          fontSize: `${String(slots.font)}px`,
          fontStyle: 'bold',
          color: COLOR_WIN_DIGITS,
        })
        .setOrigin(HALF);
    this.root.add(text(houseAt, String(house)));
    this.shownTime = clockText(rise ? 0 : seconds);
    this.time = text(timeAt, this.shownTime);
    this.root.add(this.time);
    const icon = Math.floor(Math.min(slots.font * 2, badgeAt.width, badgeAt.height));
    if (noHint) this.root.add(this.icon(badgeAt, 'bulb', icon, (g, s) => this.drawBulb(g, s)));
    const arrow = this.icon(arrowAt, 'arrow', icon, (g, s) => this.drawArrow(g, s));
    this.root.add(arrow);
    this.timeline.tween({
      targets: arrow,
      scale: arrow.scale * CARD_PULSE_SCALE,
      duration: CARD_PULSE_MS / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    if (!rise) {
      this.risen = true;
      return;
    }
    this.root.setY(CARD_RISE_PX).setAlpha(0);
    this.timeline.tween({
      targets: this.root,
      y: 0,
      alpha: 1,
      duration: RESULT_IN_MS,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.risen = true;
        onUp();
      },
    });
    const count = { v: 0 };
    const digits = new TickingTime();
    this.timeline.tween({
      targets: count,
      v: seconds,
      duration: CARD_TIME_MS,
      onUpdate: () => {
        const t = digits.next(count.v);
        if (t !== null) this.setTime(t);
      },
      onComplete: () => this.setTime(clockText(seconds)),
    });
  }

  /** What the card shows (dev hooks, `visible()`). */
  shown(): CardShown {
    return { house: this.house, time: this.shownTime, noHint: this.noHint, beside: this.beside };
  }

  /** The card has finished rising. */
  get up(): boolean {
    return this.risen;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.timeline.stop();
    this.root.destroy();
    for (const k of this.keys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
  }

  private setTime(t: string): void {
    this.shownTime = t;
    this.time.setText(t);
  }

  /** The panel: slate with a light rim, round corners, drawn into a texture of its own size. */
  private panel(box: Rect): Phaser.GameObjects.Image {
    const w = Math.round(box.width);
    const h = Math.round(box.height);
    const key = `card-panel-${String(w)}x${String(h)}`;
    if (!this.scene.textures.exists(key)) {
      const g = this.scene.make.graphics({}, false);
      const r = Math.min(w, h) * ICON.corner;
      g.fillStyle(COLOR_DOT_RIM, 1);
      g.fillRoundedRect(0, 0, w, h, r);
      g.fillStyle(COLOR_CARD, 1);
      g.fillRoundedRect(CARD_RIM, CARD_RIM, w - 2 * CARD_RIM, h - 2 * CARD_RIM, r - CARD_RIM);
      g.generateTexture(key, w, h);
      g.destroy();
      this.keys.push(key);
    }
    return this.scene.add.image(box.x, box.y, key).setOrigin(0, 0);
  }

  private icon(
    at: Rect,
    name: string,
    size: number,
    draw: (g: Phaser.GameObjects.Graphics, s: number) => void,
  ): Phaser.GameObjects.Image {
    const key = shapeKey(this.scene, name, Math.max(1, size), draw);
    return this.scene.add.image(at.x + at.width / 2, at.y + at.height / 2, key);
  }

  /** The no-hint badge: the hint button's bulb, with a tick at its lower right. */
  private drawBulb(g: Phaser.GameObjects.Graphics, s: number): void {
    const c = s / 2;
    g.lineStyle(ICON.stroke * s, colourOf(COLOR_WIN_DIGITS), 1);
    g.strokeCircle(c, c + ICON.bulbY * s, ICON.bulbR * s);
    g.fillStyle(colourOf(COLOR_WIN_DIGITS), 1);
    g.fillRect(c - (ICON.baseW * s) / 2, c + ICON.baseY * s, ICON.baseW * s, ICON.baseH * s);
    // the tick
    const x = c + ICON.tickX * s;
    const y = c + ICON.tickY * s;
    const r = ICON.tickR * s;
    g.lineStyle(ICON.stroke * s, COLOR_CARD_TICK, 1);
    g.beginPath();
    g.moveTo(x - r, y);
    g.lineTo(x - ICON.tickMidX * r, y + ICON.tickMidY * r);
    g.lineTo(x + r, y - ICON.tickEndY * r);
    g.strokePath();
  }

  /** The next arrow: a shaft and a head, pointing right. */
  private drawArrow(g: Phaser.GameObjects.Graphics, s: number): void {
    const c = s / 2;
    const w = ICON.arrowW * s;
    const h = ICON.arrowH * s;
    const left = c - w / 2;
    const head = c + w / 2 - h / 2;
    g.fillStyle(colourOf(COLOR_WIN_DIGITS), 1);
    g.fillRect(left, c - (ICON.shaft * s) / 2, head - left, ICON.shaft * s);
    g.fillTriangle(head, c - h / 2, head, c + h / 2, c + w / 2, c);
  }
}
