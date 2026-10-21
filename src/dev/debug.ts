/**
 * Dev-only hooks for the e2e tests (`window.__ghostDebug`). Installed by the active scene inside
 * `if (import.meta.env.DEV)`, so production builds drop them (smoke.spec checks the absence).
 * Epic 3 adds `cellCenter(i)`, `solution()` (null under `?playtest=1`) and `visible()`.
 */
export interface GhostDebugState {
  scene: string;
  /** The house to play (the save's `house`). */
  house: number;
  platformId: string;
  /** Lifecycle messages sent to the platform, in order. */
  messages: string[];
  paused: boolean;
  /** The scene takes pointer input now (no platform pause, no resume grace). */
  input: boolean;
}

export interface GhostDebug {
  state: () => GhostDebugState;
  /** Plays a platform pause (true) or resume (false), as the host would (bridge.ts). */
  pause?: (paused: boolean) => void;
}

declare global {
  interface Window {
    __ghostDebug?: GhostDebug;
  }
}

export function installDebug(hooks: GhostDebug): void {
  window.__ghostDebug = hooks;
}

export function uninstallDebug(): void {
  delete window.__ghostDebug;
}
