import Phaser from 'phaser';
import {
  BOOT_BAR_GAP,
  BOOT_BAR_H,
  BOOT_BAR_W,
  BOOT_HOUSE_H,
  BOOT_HOUSE_W,
  BOOT_ROOF_H,
  BOOT_STEPS,
  COLOR_BOOT_BAR_FILL,
  COLOR_BOOT_BAR_TRACK,
  COLOR_BOOT_HOUSE,
} from '../../config';
import { initPlatform } from '../../platform/bridge';
import { SaveStore } from '../../platform/storage';
import {
  adoptLateSave,
  attachSaveStore,
  hydrateProgress,
  persistProgress,
  progress,
  resetProgress,
} from '../progress';

/**
 * Boot (GDD §11 screen 1): a dark house silhouette with a thin progress bar (no text, no title),
 * then the Bridge (storage goes through it), the save with its timeout, and straight into the
 * Game: there is no title screen, so the Game sends GameReady once the first house is interactive
 * (CLAUDE.md rule 3). The screen is laid out again whenever the design size changes (rule 5).
 */
export class BootScene extends Phaser.Scene {
  private house: Phaser.GameObjects.Graphics | null = null;
  private track: Phaser.GameObjects.Rectangle | null = null;
  private fill: Phaser.GameObjects.Rectangle | null = null;
  private done = 0;

  constructor() {
    super('Boot');
  }

  create(): void {
    this.house = this.add.graphics();
    this.track = this.add.rectangle(0, 0, BOOT_BAR_W, BOOT_BAR_H, COLOR_BOOT_BAR_TRACK);
    this.fill = this.add.rectangle(0, 0, 1, BOOT_BAR_H, COLOR_BOOT_BAR_FILL).setOrigin(0, 0.5);
    const layout = (): void => {
      this.layout();
    };
    layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, layout);
    });
    this.boot().catch((e: unknown) => {
      // A failed boot still starts the Game (the stub platform keeps the game playable).
      console.error('shy-ghosts: boot failed', e);
      this.scene.start('Game');
    });
  }

  /** The silhouette centred on the screen, the bar below it, filled as far as the boot got. */
  private layout(): void {
    const { width, height } = this.scale.gameSize;
    const cx = width / 2;
    const base = (height + BOOT_HOUSE_H) / 2;
    const left = cx - BOOT_HOUSE_W / 2;
    const top = base - BOOT_HOUSE_H;
    this.house?.clear().fillStyle(COLOR_BOOT_HOUSE, 1);
    this.house?.fillRect(left, top, BOOT_HOUSE_W, BOOT_HOUSE_H);
    this.house?.fillTriangle(left, top, left + BOOT_HOUSE_W, top, cx, top - BOOT_ROOF_H);
    const y = base + BOOT_BAR_GAP;
    this.track?.setPosition(cx, y);
    this.fill?.setPosition(left, y);
    if (this.fill) this.fill.width = Math.max(1, (BOOT_BAR_W * this.done) / BOOT_STEPS);
  }

  private step(done: number): void {
    this.done = done;
    this.layout();
  }

  private async boot(): Promise<void> {
    const platform = await initPlatform();
    platform.sendMessage('in_game_loading_started');
    this.step(1);
    const store = new SaveStore(platform.storage);
    attachSaveStore(store);
    hydrateProgress(await store.load());
    adoptLateSave(store);
    this.step(2);

    if (import.meta.env.DEV) {
      const q = new URLSearchParams(window.location.search);
      if (q.get('reset') === '1') void resetProgress();
      // ?house=N plays house N (dev shortcut for tests and phone checks; D38).
      const house = Number(q.get('house'));
      if (Number.isInteger(house) && house >= 1 && house !== progress.house) {
        progress.house = house;
        progress.current = null;
        void persistProgress();
      }
    }
    this.step(BOOT_STEPS);
    this.scene.start('Game');
  }
}
