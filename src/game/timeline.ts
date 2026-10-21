import Phaser from 'phaser';

/**
 * Tweens and steps that belong together and stop together: a board's progress dots, a teaching
 * demonstration, the hint's reason. Every step runs on the tween clock, the clock every motion
 * runs on (it follows the wall clock and pauses with the tweens), so a sequence never drifts from
 * its own motions on a slow device. `stop` ends every tween where its `onStop` puts it and drops
 * every step not yet taken, so a skipped demonstration or a cleared reason leaves nothing behind.
 * A tween started as a motion joins `moving` while it runs (the board is idle when that is empty).
 */
export class Timeline {
  private readonly tweens = new Set<Phaser.Tweens.Tween>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly moving: Set<Phaser.Tweens.Tween> | null = null,
  ) {}

  tween(config: Phaser.Types.Tweens.TweenBuilderConfig, motion = false): Phaser.Tweens.Tween {
    const t = this.scene.tweens.add(config);
    this.tweens.add(t);
    if (motion) this.moving?.add(t);
    const done = (): void => {
      this.tweens.delete(t);
      this.moving?.delete(t);
    };
    t.on(Phaser.Tweens.Events.TWEEN_COMPLETE, done);
    t.on(Phaser.Tweens.Events.TWEEN_STOP, done);
    return t;
  }

  /** `fn` after `ms` on the tween clock. */
  later(ms: number, fn: () => void): void {
    this.tween({ targets: { step: 0 }, step: 1, duration: ms, onComplete: fn });
  }

  stop(): void {
    for (const t of [...this.tweens]) t.stop();
    this.tweens.clear();
  }
}
