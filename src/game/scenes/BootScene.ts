import Phaser from 'phaser';
import {
  BOOT_BAR_GAP,
  BOOT_BAR_H,
  BOOT_BAR_W,
  BOOT_HOUSE_H,
  BOOT_HOUSE_W,
  BOOT_ROOF_H,
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

/** Boot steps that move the bar: the platform, the save, the hand-over to the Game. */
const BOOT_STEPS = 3;

/**
 * Boot (GDD §11 screen 1): a dark house silhouette with a thin progress bar (no text, no title),
 * then the Bridge (storage goes through it), the save with its timeout, and straight into the
 * Game: there is no title screen, so the Game sends GameReady once the first house is interactive
 * (CLAUDE.md rule 3).
 */
export class BootScene extends Phaser.Scene {
  private fill: Phaser.GameObjects.Rectangle | null = null;

  constructor() {
    super('Boot');
  }

  create(): void {
    this.showLoading();
    this.boot().catch((e: unknown) => {
      // A failed boot still starts the Game (the stub platform keeps the game playable).
      console.error('shy-ghosts: boot failed', e);
      this.scene.start('Game');
    });
  }

  private showLoading(): void {
    const { width, height } = this.scale.gameSize;
    const cx = width / 2;
    const base = height / 2 + BOOT_HOUSE_H / 2;
    const house = this.add.graphics();
    house.fillStyle(COLOR_BOOT_HOUSE, 1);
    house.fillRect(cx - BOOT_HOUSE_W / 2, base - BOOT_HOUSE_H, BOOT_HOUSE_W, BOOT_HOUSE_H);
    house.fillTriangle(
      cx - BOOT_HOUSE_W / 2,
      base - BOOT_HOUSE_H,
      cx + BOOT_HOUSE_W / 2,
      base - BOOT_HOUSE_H,
      cx,
      base - BOOT_HOUSE_H - BOOT_ROOF_H,
    );
    const y = base + BOOT_BAR_GAP;
    this.add.rectangle(cx, y, BOOT_BAR_W, BOOT_BAR_H, COLOR_BOOT_BAR_TRACK);
    this.fill = this.add
      .rectangle(cx - BOOT_BAR_W / 2, y, 1, BOOT_BAR_H, COLOR_BOOT_BAR_FILL)
      .setOrigin(0, 0.5);
  }

  private step(done: number): void {
    if (this.fill) this.fill.width = Math.max(1, (BOOT_BAR_W * done) / BOOT_STEPS);
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
      if (q.get('reset') === '1') resetProgress();
      // ?house=N plays house N (dev shortcut for tests and phone checks; D38).
      const house = Number(q.get('house'));
      if (Number.isInteger(house) && house >= 1 && house !== progress.house) {
        progress.house = house;
        progress.current = null;
        persistProgress();
      }
    }
    this.step(BOOT_STEPS);
    this.scene.start('Game');
  }
}
