import { progress } from '../game/progress';
import { getPlatform, sentPlatformMessages, simulatePause } from '../platform/bridge';
import { installDebug } from './debug';

/** What the Game scene shows the dev hooks (built inside its DEV branch only). */
export interface GameProbe {
  /** The scene takes pointer input now. */
  input: () => boolean;
}

/**
 * The Game scene's `__ghostDebug`. Loaded with a dynamic import from the scene's DEV branch, so
 * production builds carry none of it (smoke.spec checks the absence).
 */
export function installGameDebug(p: GameProbe): void {
  const platform = getPlatform();
  installDebug({
    state: () => ({
      scene: 'Game',
      house: progress.house,
      platformId: platform.platformId,
      messages: [...sentPlatformMessages()],
      paused: platform.isPaused(),
      input: p.input(),
    }),
    pause: simulatePause,
  });
}
