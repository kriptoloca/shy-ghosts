import { beforeEach, describe, expect, it } from 'vitest';
import {
  adoptLateSave,
  advanceHouse,
  attachSaveStore,
  hydrateProgress,
  onLateSaveMerged,
  persistProgress,
  progress,
  recordHouseInProgress,
} from '../src/game/progress';
import { HintClock } from '../src/game/session';
import {
  MemoryBackend,
  SAVE_KEY,
  SaveStore,
  defaultSave,
  type HouseInProgress,
  type SaveData,
  type StorageBackend,
} from '../src/platform/storage';

/**
 * The save in memory (GDD §9). With no title screen, a slow first read can land while house 1 is
 * already on screen and move `progress.house` on (the merge keeps the furthest house); the guards
 * here keep the running game from writing a house in progress onto the wrong house or from moving
 * the player back (audit 2026-10-21, DÜŞÜK 8).
 */
function slot(id: number, extra: Partial<HouseInProgress> = {}): HouseInProgress {
  return { id, ghosts: [], marks: [], seconds: 0, hints: 0, moves: 0, conflicts: 0, ...extra };
}

let backend: MemoryBackend;

beforeEach(async () => {
  backend = new MemoryBackend();
  const store = new SaveStore(backend);
  await store.load();
  attachSaveStore(store);
  hydrateProgress(defaultSave());
});

async function stored(): Promise<unknown> {
  return JSON.parse((await backend.get(SAVE_KEY)) ?? 'null') as unknown;
}

describe('progress guards', () => {
  it('a house in progress is kept and written only for the house to play', async () => {
    progress.house = 5;
    expect(await recordHouseInProgress(slot(4, { ghosts: [3] }))).toBe(false);
    expect(progress.current).toBeNull();
    expect(await stored()).toBeNull();
    expect(await recordHouseInProgress(slot(5, { ghosts: [3] }))).toBe(true);
    expect(progress.current).toEqual(slot(5, { ghosts: [3] }));
    expect(await stored()).toMatchObject({ house: 5, current: { id: 5, ghosts: [3] } });
  });

  it('advancing keeps the furthest house: a late read may have moved it past the one solved', async () => {
    // house 1 was on screen while the stored save (house 37) arrived and was merged in
    progress.house = 37;
    progress.housesSolved = 36;
    progress.current = slot(37, { ghosts: [9] });
    await advanceHouse(1);
    expect(progress.house).toBe(37);
    expect(progress.housesSolved).toBe(37);
    expect(progress.current).toEqual(slot(37, { ghosts: [9] }));
    // the usual case: the house solved is the house to play
    hydrateProgress({ ...defaultSave(), house: 4, current: slot(4, { ghosts: [1] }) });
    await advanceHouse(4);
    expect(progress.house).toBe(5);
    expect(progress.current).toBeNull();
    expect(await stored()).toMatchObject({ house: 5, housesSolved: 1, current: null });
  });

  it('a stale house in progress is never written', async () => {
    progress.house = 37;
    progress.current = slot(1, { ghosts: [2] });
    expect(await persistProgress()).toBe(true);
    expect(await stored()).toMatchObject({ house: 37, current: null });
  });
});

describe('a save that lands after the boot (D47, D98)', () => {
  /** A store whose first read hangs past the load timeout, then answers `stored` on `answer()`. */
  async function lateStore(): Promise<{ store: SaveStore; answer: (s: SaveData) => void }> {
    let resolve: (v: string | null) => void = () => undefined;
    const backend: StorageBackend = {
      get: () =>
        new Promise<string | null>((r) => {
          resolve = r;
        }),
      set: () => Promise.resolve(),
    };
    const store = new SaveStore(backend, SAVE_KEY, 20, 10_000);
    hydrateProgress(await store.load()); // a fresh save: the first read missed its 20 ms
    attachSaveStore(store);
    return { store, answer: (s) => resolve(JSON.stringify(s)) };
  }

  it("the merged recharge reaches a running hint clock: a longer one takes over, a shorter one changes nothing (round 3's code audit, DÜŞÜK 2)", async () => {
    for (const [stored, want] of [
      [60, 60],
      [10, 20],
    ] as const) {
      const { store, answer } = await lateStore();
      const clock = new HintClock();
      clock.restore(20);
      const seen: number[] = [];
      const off = onLateSaveMerged((s) => {
        seen.push(s.hintReadyIn);
        clock.adopt(s.hintReadyIn);
        progress.hintReadyIn = clock.remaining;
      });
      adoptLateSave(store);
      // the stored save lands while the player is already in house 1: the next save merges it
      const saving = store.save({ ...progress });
      answer({ ...defaultSave(), house: 7, housesSolved: 6, hintReadyIn: stored });
      expect(await saving).toBe(true);
      off();
      expect(seen).toEqual([stored]);
      expect(progress.house).toBe(7);
      expect(clock.remaining).toBe(want);
      expect(progress.hintReadyIn).toBe(want);
    }
  });
});
