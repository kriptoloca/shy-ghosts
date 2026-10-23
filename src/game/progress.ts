import {
  copyInProgress,
  defaultSave,
  mergeSaves,
  type HouseInProgress,
  type SaveData,
  type SaveStore,
} from '../platform/storage';

/**
 * The player's progress in memory and its persistence (GDD §9). Scenes read `progress` and change
 * it through the functions below; saving is fire-and-forget and never throws. (Named `progress`,
 * not `state`, so it is never mistaken for the rules' play state, src/core/state.ts; D37.)
 *
 * With no title screen, a slow first read can land while house 1 is on screen and move
 * `progress.house` on (the merge keeps the furthest house). Hence the guards (D50): a house in
 * progress is kept only for the house to play, advancing never moves the house back, and a stale
 * slot is never written.
 */
export const progress: SaveData = defaultSave();

let store: SaveStore | null = null;

export function attachSaveStore(s: SaveStore | null): void {
  store = s;
}

export function hydrateProgress(data: SaveData): void {
  Object.assign(progress, data, { current: data.current ? copyInProgress(data.current) : null });
}

const merged = new Set<(stored: SaveData) => void>();

/**
 * Called after a save that landed after the boot has been merged in, with the stored save, so a
 * running clock can take its longer recharge (round 3's code audit, DÜŞÜK 2). Gives back the
 * unsubscribe.
 */
export function onLateSaveMerged(cb: (stored: SaveData) => void): () => void {
  merged.add(cb);
  return () => {
    merged.delete(cb);
  };
}

/**
 * A stored save that lands after the boot (a slow first read, or one retried after a failure) is
 * merged into the running progress (the furthest house wins), so a slow or flaky host store never
 * sends the player back to house 1.
 */
export function adoptLateSave(s: SaveStore): void {
  s.onLateSave((stored) => {
    hydrateProgress(mergeSaves(stored, progress));
    for (const cb of merged) cb(stored);
  });
}

/**
 * Writes the progress; a house in progress goes along only when it belongs to the house to play.
 * Resolves true when written (never rejects).
 */
export function persistProgress(): Promise<boolean> {
  if (!store) return Promise.resolve(false);
  const current = progress.current?.id === progress.house ? progress.current : null;
  return store.save({ ...progress, current: current ? copyInProgress(current) : null });
}

/**
 * The hint's recharge (D98) written with the progress: a flush outside play (the finale, the held
 * card, the slide, a house with no input yet) keeps it without a house in progress (round 3's code
 * audit, DÜŞÜK 1).
 */
export function recordHintRecharge(seconds: number): Promise<boolean> {
  progress.hintReadyIn = seconds;
  return persistProgress();
}

/**
 * Keeps and writes the house in progress (after every change inside a house, Epic 3). Refused,
 * with nothing written, when `c` belongs to another house than the one to play.
 */
export function recordHouseInProgress(c: HouseInProgress): Promise<boolean> {
  if (c.id !== progress.house) return Promise.resolve(false);
  progress.current = copyInProgress(c);
  return persistProgress();
}

/**
 * House `solved` was solved: counts it and moves on to the house after it, unless the house to
 * play is already further (the kit's `Math.max`), keeping that house's progress.
 */
export function advanceHouse(solved: number): Promise<boolean> {
  progress.housesSolved += 1;
  progress.house = Math.max(progress.house, solved + 1);
  if (progress.current && progress.current.id !== progress.house) progress.current = null;
  return persistProgress();
}

/** Dev `?reset=1`: back to a fresh save. */
export function resetProgress(): Promise<boolean> {
  hydrateProgress(defaultSave());
  return persistProgress();
}
