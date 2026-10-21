import { describe, expect, it } from 'vitest';
import {
  CELLS_MAX,
  MemoryBackend,
  SAVE_KEY,
  SAVE_VERSION,
  SaveStore,
  defaultSave,
  mergeSaves,
  migrate,
  type HouseInProgress,
  type SaveData,
  type StorageBackend,
} from '../src/platform/storage';

/** The save model v1 (GDD §9, docs/questions.md D31) and its store (CLAUDE.md rule 7). */

function inProgress(id: number, extra: Partial<HouseInProgress> = {}): HouseInProgress {
  return { id, ghosts: [], marks: [], seconds: 0, hints: 0, moves: 0, conflicts: 0, ...extra };
}

describe('save model v1', () => {
  it('a fresh save starts at house 1 with nothing in progress, sound and music on', () => {
    expect(defaultSave()).toEqual({
      version: SAVE_VERSION,
      house: 1,
      housesSolved: 0,
      current: null,
      sound: true,
      music: true,
    });
    expect(SAVE_VERSION).toBe(1);
    expect(SAVE_KEY).toBe('shy-ghosts:save');
  });

  it('migrate coerces broken fields and keeps good ones', () => {
    const s = migrate({
      version: SAVE_VERSION,
      house: 7.8,
      housesSolved: -3,
      sound: false,
      music: 'yes',
      current: {
        id: 7,
        ghosts: [9, 3, 1, 3, 'x', -1, CELLS_MAX, 2.5, null],
        marks: [4, 4, 0],
        seconds: 41.25,
        hints: 2.9,
        moves: '12',
        conflicts: -1,
      },
    });
    expect(s).toEqual({
      version: SAVE_VERSION,
      house: 7,
      housesSolved: 0,
      current: inProgress(7, { ghosts: [1, 3, 9], marks: [0, 4], seconds: 41.25, hints: 2 }),
      sound: false,
      music: true,
    });
  });

  it('garbage, an unknown or a newer version, or a house below 1 never break the game', () => {
    expect(migrate(null)).toEqual(defaultSave());
    expect(migrate('x')).toEqual(defaultSave());
    expect(migrate(42)).toEqual(defaultSave());
    expect(migrate([])).toEqual(defaultSave());
    expect(migrate({ house: 9 })).toEqual(defaultSave());
    expect(migrate({ version: 0, house: 9 })).toEqual(defaultSave());
    expect(migrate({ version: SAVE_VERSION + 1, house: 50, housesSolved: 49 })).toEqual(
      defaultSave(),
    );
    expect(migrate({ version: SAVE_VERSION, house: 0 }).house).toBe(1);
    expect(migrate({ version: SAVE_VERSION, house: Number.NaN }).house).toBe(1);
  });

  it('a house in progress restores only onto the house to play, and only when well formed', () => {
    const base = { version: SAVE_VERSION, house: 12 };
    expect(migrate({ ...base, current: inProgress(12) }).current).toEqual(inProgress(12));
    // a stale slot from another house is dropped
    expect(migrate({ ...base, current: inProgress(11) }).current).toBeNull();
    expect(migrate({ ...base, current: 'x' }).current).toBeNull();
    expect(migrate({ ...base, current: { ghosts: [1] } }).current).toBeNull();
    // missing or broken counters and lists become empty, never a crash
    expect(migrate({ ...base, current: { id: 12, seconds: -5, ghosts: 'a' } }).current).toEqual(
      inProgress(12),
    );
    expect(
      migrate({ ...base, current: { id: 12, seconds: Number.POSITIVE_INFINITY } }).current,
    ).toEqual(inProgress(12));
  });
});

describe('SaveStore', () => {
  const sample = (): SaveData => ({
    ...defaultSave(),
    house: 12,
    housesSolved: 11,
    current: inProgress(12, { ghosts: [3, 17], marks: [5], seconds: 20.5, moves: 4 }),
  });

  it('round-trips through the backend under the game key', async () => {
    const backend = new MemoryBackend();
    const store = new SaveStore(backend);
    const s = sample();
    expect(await store.save(s)).toBe(true);
    expect(await backend.get(SAVE_KEY)).toContain('"house":12');
    expect(await store.load()).toEqual(s);
  });

  it('never rejects: a failing or corrupt backend yields a fresh save', async () => {
    const broken: StorageBackend = {
      get: () => Promise.reject(new Error('down')),
      set: () => Promise.reject(new Error('down')),
    };
    const store = new SaveStore(broken);
    expect(await store.load()).toEqual(defaultSave());
    expect(await store.save(defaultSave())).toBe(false);
    const corrupt = new MemoryBackend();
    await corrupt.set(SAVE_KEY, '{not json');
    expect(await new SaveStore(corrupt).load()).toEqual(defaultSave());
    const empty = new MemoryBackend();
    await empty.set(SAVE_KEY, '');
    expect(await new SaveStore(empty).load()).toEqual(defaultSave());
  });

  it('a backend that never answers cannot hold the boot: load gives a fresh save', async () => {
    const hanging: StorageBackend = {
      get: () => new Promise<string | null>(() => undefined),
      set: () => Promise.resolve(),
    };
    expect(await new SaveStore(hanging, SAVE_KEY, 20).load()).toEqual(defaultSave());
  });

  it('a read that answers after the timeout is merged, never overwritten', async () => {
    const stored: SaveData = { ...sample(), house: 57, housesSolved: 60, sound: false };
    stored.current = inProgress(57, { ghosts: [2], seconds: 33 });
    let answer: (v: string) => void = () => undefined;
    const written: string[] = [];
    const slow: StorageBackend = {
      get: () =>
        new Promise<string | null>((resolve) => {
          answer = resolve;
        }),
      set: (_k, v) => {
        written.push(v);
        return Promise.resolve();
      },
    };
    const store = new SaveStore(slow, SAVE_KEY, 20, 10_000);
    expect(await store.load()).toEqual(defaultSave());
    // the player solves house 1 on the fresh save while the real one is still on its way
    const saving = store.save({
      ...defaultSave(),
      house: 2,
      housesSolved: 1,
      current: inProgress(2, { ghosts: [4] }),
    });
    answer(JSON.stringify(stored));
    expect(await saving).toBe(true);
    // the furthest house wins, with its own house in progress; settings come from the store
    expect(JSON.parse(written[0] as string)).toEqual(stored);
    expect(await store.late()).toEqual(stored);
  });

  it('a store that never answers holds the saves until LATE_READ_MAX, then writes', async () => {
    const written: string[] = [];
    const hanging: StorageBackend = {
      get: () => new Promise<string | null>(() => undefined),
      set: (_k, v) => {
        written.push(v);
        return Promise.resolve();
      },
    };
    const store = new SaveStore(hanging, SAVE_KEY, 10, 30);
    await store.load();
    expect(await store.save({ ...defaultSave(), house: 4 })).toBe(true);
    expect(JSON.parse(written[0] as string)).toMatchObject({ house: 4 });
    expect(await store.late()).toBeNull();
  });

  it('mergeSaves: furthest house wins with its own house in progress, settings from the store', () => {
    const stored: SaveData = {
      ...defaultSave(),
      house: 9,
      housesSolved: 8,
      music: false,
      current: inProgress(9, { ghosts: [1] }),
    };
    const local: SaveData = {
      ...defaultSave(),
      house: 12,
      housesSolved: 3,
      current: inProgress(12, { marks: [7] }),
    };
    expect(mergeSaves(stored, local)).toEqual({
      ...defaultSave(),
      house: 12,
      housesSolved: 8,
      music: false,
      current: inProgress(12, { marks: [7] }),
    });
    // the stored save is further: its house in progress survives, the local one is stale
    const further: SaveData = { ...stored, house: 20, current: inProgress(20, { ghosts: [1] }) };
    expect(mergeSaves(further, local).current).toEqual(inProgress(20, { ghosts: [1] }));
    expect(mergeSaves(further, local).house).toBe(20);
    // both on the same house: the one on screen (local) wins
    const sameHouse = { ...stored, current: inProgress(9, { ghosts: [2], seconds: 5 }) };
    expect(mergeSaves(stored, sameHouse).current).toEqual(sameHouse.current);
    // neither slot belongs to the merged house
    expect(mergeSaves({ ...stored, current: null }, { ...local, current: null }).current).toBe(
      null,
    );
  });

  it('a merged save shares no arrays with its inputs', () => {
    const local: SaveData = { ...defaultSave(), current: inProgress(1, { ghosts: [1, 2] }) };
    const merged = mergeSaves(defaultSave(), local);
    merged.current?.ghosts.push(3);
    expect(local.current?.ghosts).toEqual([1, 2]);
  });
});
