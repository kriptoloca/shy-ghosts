import { beforeEach, describe, expect, it } from 'vitest';
import {
  advanceHouse,
  attachSaveStore,
  hydrateProgress,
  persistProgress,
  progress,
  recordHouseInProgress,
} from '../src/game/progress';
import {
  MemoryBackend,
  SAVE_KEY,
  SaveStore,
  defaultSave,
  type HouseInProgress,
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
