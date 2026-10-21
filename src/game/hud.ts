import Phaser from 'phaser';
import {
  BUTTON_DISABLED_ALPHA,
  BUTTON_ICON_STROKE,
  BUTTON_RIM,
  COLOR_BUTTON,
  COLOR_BUTTON_ICON,
  COLOR_BUTTON_RIM,
  COLOR_COOLDOWN,
  COOLDOWN_ALPHA,
  ICON_SHAPE as I,
  NUDGE_MS,
  NUDGE_PX,
} from '../config';
import type { Circle, Layout } from './layout';

export type ButtonName = 'undo' | 'hint';

interface Button {
  name: ButtonName;
  zone: Phaser.GameObjects.Zone;
  face: Phaser.GameObjects.Graphics;
  shade: Phaser.GameObjects.Graphics;
  at: Circle;
  pressed: boolean;
  enabled: boolean;
}

const QUARTER_TURN = Math.PI / 2;
const FULL_TURN = Math.PI * 2;

/**
 * The graybox HUD (GDD §11): undo and hint as text-free round buttons. A button acts on a
 * pointer-up that follows a pointer-down on the same button, so a press held through a platform
 * pause or into the next house never counts (`cancelPress`), nor one the system cancels. A button at rest (nothing to undo, the hint cooling down)
 * is dimmed and only nudges; the hint's cooldown shows as a shade that winds back (D32).
 */
export class Hud {
  private readonly buttons: Record<ButtonName, Button>;
  /** The same buttons in a fixed list, so the per-frame checks allocate nothing. */
  private readonly list: readonly Button[];
  private share = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly act: (name: ButtonName) => void,
  ) {
    const make = (name: ButtonName): Button => {
      const face = scene.add.graphics();
      const shade = scene.add.graphics();
      const zone = scene.add.zone(0, 0, 1, 1);
      const b: Button = {
        name,
        zone,
        face,
        shade,
        at: { x: 0, y: 0, r: 1 },
        pressed: false,
        enabled: true,
      };
      zone.on('pointerdown', () => {
        b.pressed = true;
      });
      zone.on('pointerout', () => {
        b.pressed = false;
      });
      zone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
        // a touch the system takes back (an edge swipe, a call) is no press (audit ORTA 4)
        if (pointer.wasCanceled) {
          b.pressed = false;
          return;
        }
        if (!b.pressed) return;
        b.pressed = false;
        if (b.enabled) this.act(name);
        else this.nudge(b);
      });
      return b;
    };
    this.buttons = { undo: make('undo'), hint: make('hint') };
    this.list = Object.values(this.buttons);
  }

  layoutTo(l: Layout): void {
    for (const b of Object.values(this.buttons)) {
      b.at = l.buttons[b.name];
      const { x, y, r } = b.at;
      b.zone.setPosition(x, y).setSize(2 * r, 2 * r);
      // setInteractive keeps an existing hit area, so a new size moves the circle itself
      const hit = b.zone.input?.hitArea as Phaser.Geom.Circle | undefined;
      if (hit) hit.setTo(r, r, r);
      else {
        b.zone.setInteractive(
          new Phaser.Geom.Circle(r, r, r),
          (shape: Phaser.Geom.Circle, px: number, py: number) => shape.contains(px, py),
        );
      }
      this.draw(b);
    }
  }

  setEnabled(name: ButtonName, on: boolean): void {
    const b = this.buttons[name];
    if (b.enabled === on) return;
    b.enabled = on;
    b.face.setAlpha(on ? 1 : BUTTON_DISABLED_ALPHA);
  }

  /** The share of the hint's cooldown still to run (0 when the hint is ready). */
  setCooldown(share: number): void {
    if (share === this.share) return;
    this.share = share;
    this.drawShade(this.buttons.hint);
  }

  /**
   * A press in hand will not count when it comes up: a platform pause, the win, a tap that skips
   * the beat or ends the slide (so a press never reaches the next house; audit YÜKSEK 3), a
   * demonstration that plays again (round 2's code audit, ORTA 1).
   */
  cancelPress(): void {
    for (const b of this.list) b.pressed = false;
  }

  /** A button is held down now (read every frame in play). */
  get pressing(): boolean {
    for (const b of this.list) if (b.pressed) return true;
    return false;
  }

  /** The button's disc in design px (dev hooks). */
  circle(name: ButtonName): Circle {
    return this.buttons[name].at;
  }

  enabled(name: ButtonName): boolean {
    return this.buttons[name].enabled;
  }

  private draw(b: Button): void {
    const { x, y, r } = b.at;
    const f = b.face;
    f.clear();
    f.fillStyle(COLOR_BUTTON, 1);
    f.fillCircle(x, y, r);
    f.lineStyle(BUTTON_RIM * r, COLOR_BUTTON_RIM, 1);
    f.strokeCircle(x, y, r);
    f.lineStyle(BUTTON_ICON_STROKE * r, COLOR_BUTTON_ICON, 1);
    f.fillStyle(COLOR_BUTTON_ICON, 1);
    if (b.name === 'undo') {
      const ar = I.arcR * r;
      f.beginPath();
      f.arc(x, y, ar, I.arcFrom * Math.PI, I.arcTo * Math.PI, false);
      f.strokePath();
      const head = I.headLen * r;
      f.fillTriangle(x - ar - head, y, x - ar + head, y, x - ar, y + head);
    } else {
      f.strokeCircle(x, y + I.bulbY * r, I.bulbR * r);
      f.fillRect(x - (I.baseW * r) / 2, y + I.baseY * r, I.baseW * r, I.baseH * r);
    }
    f.setAlpha(b.enabled ? 1 : BUTTON_DISABLED_ALPHA);
    this.drawShade(b);
  }

  private drawShade(b: Button): void {
    const s = b.shade;
    s.clear();
    if (b.name !== 'hint' || this.share <= 0) return;
    const { x, y, r } = b.at;
    s.fillStyle(COLOR_COOLDOWN, COOLDOWN_ALPHA);
    s.slice(x, y, r, -QUARTER_TURN, -QUARTER_TURN + this.share * FULL_TURN, false);
    s.fillPath();
  }

  private nudge(b: Button): void {
    if (this.scene.tweens.isTweening(b.face)) return;
    this.scene.tweens.add({ targets: b.face, x: NUDGE_PX, duration: NUDGE_MS / 2, yoyo: true });
  }
}
