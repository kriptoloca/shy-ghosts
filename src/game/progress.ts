import {
  copyInProgress,
  defaultSave,
  mergeSaves,
  type SaveData,
  type SaveStore,
} from '../platform/storage';

/**
 * The player's progress in memory and its persistence (GDD §9). Scenes read and change
 * `progress`, then call `persistProgress()`; saving is fire-and-forget and never throws.
 * (Named `progress`, not `state`, so it is never mistaken for the rules' play state,
 * src/core/state.ts; docs/questions.md D37.)
 */
export const progress: SaveData = defaultSave();

let store: SaveStore | null = null;

export function attachSaveStore(s: SaveStore | null): void {
  store = s;
}

export function hydrateProgress(data: SaveData): void {
  Object.assign(progress, data, { current: data.current ? copyInProgress(data.current) : null });
}

/**
 * A first read that missed the boot timeout lands later: its progress is merged into the running
 * one (the furthest house wins), so a slow host store never sends the player back to house 1.
 */
export function adoptLateSave(s: SaveStore): void {
  void s.late().then((stored) => {
    if (stored) hydrateProgress(mergeSaves(stored, progress));
  });
}

export function persistProgress(): void {
  if (!store) return;
  void store.save({
    ...progress,
    current: progress.current ? copyInProgress(progress.current) : null,
  });
}

/** Dev `?reset=1`: back to a fresh save. */
export function resetProgress(): void {
  hydrateProgress(defaultSave());
  persistProgress();
}
