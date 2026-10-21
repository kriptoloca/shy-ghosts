import { describe, expect, it } from 'vitest';
import { BridgeStorageBackend } from '../src/platform/bridge';
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

/** The save model v1 (GDD §9, docs/questions.md D31, D47) and its store (CLAUDE.md rule 7). */

function inProgress(id: number, extra: Partial<HouseInProgress> = {}): HouseInProgress {
  return { id, ghosts: [], marks: [], seconds: 0, hints: 0, moves: 0, conflicts: 0, ...extra };
}

/** A v2 save as Epic 5 will write it: the v1 fields plus fields a v1 build does not know. */
const V2 = JSON.stringify({
  version: 2,
  house: 37,
  housesSolved: 40,
  current: { id: 37, ghosts: [3, 17], marks: [5], seconds: 12, hints: 1, moves: 6, conflicts: 2 },
  sound: false,
  music: true,
  costumes: [1, 2, 3],
  streak: { count: 9, best: 12 },
});

/** A backend that records writes and answers reads from a script of outcomes. */
function scripted(reads: (() => Promise<string | null>)[]): StorageBackend & { written: string[] } {
  const written: string[] = [];
  let k = 0;
  return {
    written,
    get: () => {
      const next = reads[Math.min(k, reads.length - 1)] as () => Promise<string | null>;
      k++;
      return next();
    },
    set: (_key, v) => {
      written.push(v);
      return Promise.resolve();
    },
  };
}
const fails = (): Promise<string | null> => Promise.reject(new Error('host storage down'));
const answers = (v: string | null) => (): Promise<string | null> => Promise.resolve(v);
const hangs = (): Promise<string | null> => new Promise<string | null>(() => undefined);

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
    // cell indices of the largest house, 9 × 9
    expect(CELLS_MAX).toBe(81);
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

  it('garbage, a missing or broken version, or a house below 1 never break the game', () => {
    expect(migrate(null)).toEqual(defaultSave());
    expect(migrate('x')).toEqual(defaultSave());
    expect(migrate(42)).toEqual(defaultSave());
    expect(migrate([])).toEqual(defaultSave());
    expect(migrate({ house: 9 })).toEqual(defaultSave());
    expect(migrate({ version: 0, house: 9 })).toEqual(defaultSave());
    expect(migrate({ version: 1.5, house: 9 })).toEqual(defaultSave());
    expect(migrate({ version: SAVE_VERSION, house: 0 }).house).toBe(1);
    expect(migrate({ version: SAVE_VERSION, house: Number.NaN }).house).toBe(1);
  });

  it('a newer save is read for its v1 fields (v2 only adds fields, D31)', () => {
    expect(migrate(JSON.parse(V2) as unknown)).toEqual({
      version: SAVE_VERSION,
      house: 37,
      housesSolved: 40,
      current: inProgress(37, {
        ghosts: [3, 17],
        marks: [5],
        seconds: 12,
        hints: 1,
        moves: 6,
        conflicts: 2,
      }),
      sound: false,
      music: true,
    });
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
    // nothing is written before the store has been read (Boot always loads first)
    expect(await store.save(sample())).toBe(false);
    expect(await backend.get(SAVE_KEY)).toBeNull();
    expect(await store.load()).toEqual(defaultSave());
    const s = sample();
    expect(await store.save(s)).toBe(true);
    expect(await backend.get(SAVE_KEY)).toContain('"house":12');
    expect(await new SaveStore(backend).load()).toEqual(s);
  });

  it('an empty store and garbage in it are written over by the first save', async () => {
    for (const raw of [null, '', '{not json', '"a string"', '{"version":0}', '[]']) {
      const backend = scripted([answers(raw)]);
      const store = new SaveStore(backend);
      expect(await store.load()).toEqual(defaultSave());
      expect(await store.save(sample())).toBe(true);
      expect(JSON.parse(backend.written[0] as string)).toEqual(sample());
    }
  });

  it('a newer save (a rollback, an older cached build) is played from, never overwritten', async () => {
    const backend = scripted([answers(V2)]);
    const store = new SaveStore(backend);
    const loaded = await store.load();
    expect(loaded.house).toBe(37);
    expect(loaded.current?.ghosts).toEqual([3, 17]);
    expect(await store.save({ ...loaded, house: 38, housesSolved: 41, current: null })).toBe(false);
    expect(await store.save(defaultSave())).toBe(false);
    expect(backend.written).toEqual([]);
  });

  it('a failed read is never taken for an empty store: no write until a read succeeds', async () => {
    const stored = { ...sample(), house: 57, housesSolved: 60, sound: false, current: null };
    const backend = scripted([fails, fails, answers(JSON.stringify(stored))]);
    const store = new SaveStore(backend, SAVE_KEY, 20, 40);
    // the boot read fails: the game starts on a fresh save, but writes nothing yet
    expect(await store.load()).toEqual(defaultSave());
    // the next save retries the read, which fails again: still nothing is written
    const solvedOne = { ...defaultSave(), house: 2, housesSolved: 1 };
    expect(await store.save(solvedOne)).toBe(false);
    expect(backend.written).toEqual([]);
    // the retry after that reads the stored save: the furthest progress wins, then it is written
    const late: SaveData[] = [];
    store.onLateSave((s) => late.push(s));
    expect(await store.save(solvedOne)).toBe(true);
    expect(JSON.parse(backend.written[0] as string)).toEqual(mergeSaves(stored, solvedOne));
    expect(late).toEqual([stored]);
    // from then on the store is known and saves go straight through
    expect(await store.save({ ...stored, house: 58 })).toBe(true);
    expect(JSON.parse(backend.written[1] as string)).toMatchObject({ house: 58 });
  });

  it('a backend that never answers cannot hold the boot: load gives a fresh save', async () => {
    const store = new SaveStore(scripted([hangs]), SAVE_KEY, 20);
    expect(await store.load()).toEqual(defaultSave());
  });

  it('a read that answers after the timeout is merged, never overwritten', async () => {
    const stored: SaveData = { ...sample(), house: 57, housesSolved: 60, sound: false };
    stored.current = inProgress(57, { ghosts: [2], seconds: 33 });
    let answer: (v: string) => void = () => undefined;
    const backend = scripted([
      () =>
        new Promise<string | null>((resolve) => {
          answer = resolve;
        }),
    ]);
    const store = new SaveStore(backend, SAVE_KEY, 20, 10_000);
    const late: SaveData[] = [];
    expect(await store.load()).toEqual(defaultSave());
    store.onLateSave((s) => late.push(s));
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
    expect(JSON.parse(backend.written[0] as string)).toEqual(stored);
    expect(late).toEqual([stored]);
  });

  it('a late answer that turns out newer is adopted for its v1 fields and never overwritten', async () => {
    let answer: (v: string) => void = () => undefined;
    const backend = scripted([
      () =>
        new Promise<string | null>((resolve) => {
          answer = resolve;
        }),
    ]);
    const store = new SaveStore(backend, SAVE_KEY, 20, 10_000);
    await store.load();
    const late: SaveData[] = [];
    store.onLateSave((s) => late.push(s));
    const saving = store.save({ ...defaultSave(), house: 2, housesSolved: 1 });
    answer(V2);
    expect(await saving).toBe(false);
    expect(late.map((s) => s.house)).toEqual([37]);
    expect(backend.written).toEqual([]);
  });

  it('a timed-out read that then fails or never answers blocks writes; the next save retries', async () => {
    const backend = scripted([hangs, answers(null)]);
    const store = new SaveStore(backend, SAVE_KEY, 10, 30);
    await store.load();
    // the late read gives up after LATE_READ_MAX: the store is unread, so this save is skipped…
    expect(await store.save({ ...defaultSave(), house: 4 })).toBe(false);
    expect(backend.written).toEqual([]);
    // …and the next one reads again: an empty store, so it writes
    expect(await store.save({ ...defaultSave(), house: 4 })).toBe(true);
    expect(JSON.parse(backend.written[0] as string)).toMatchObject({ house: 4 });
  });

  it('a late save that arrived before anyone listened still reaches a later listener', async () => {
    const backend = scripted([fails, answers(JSON.stringify(sample()))]);
    const store = new SaveStore(backend, SAVE_KEY, 20, 40);
    await store.load();
    await store.save(defaultSave());
    const late: SaveData[] = [];
    store.onLateSave((s) => late.push(s));
    expect(late).toEqual([sample()]);
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

describe('the Bridge storage backend', () => {
  it('a failed SDK read rejects (an unread store), unlike an empty one', async () => {
    const down = new BridgeStorageBackend({
      get: () => Promise.reject(new Error('down')),
      set: () => Promise.reject(new Error('down')),
    });
    await expect(down.get(SAVE_KEY)).rejects.toThrow();
    await expect(down.set(SAVE_KEY, '{}')).rejects.toThrow();
    for (const empty of [null, undefined, '']) {
      const b = new BridgeStorageBackend({
        get: () => Promise.resolve(empty),
        set: () => Promise.resolve(),
      });
      expect(await b.get(SAVE_KEY)).toBeNull();
    }
    const parsed = new BridgeStorageBackend({
      get: () => Promise.resolve({ version: 1, house: 3 }),
      set: () => Promise.resolve(),
    });
    expect(JSON.parse((await parsed.get(SAVE_KEY)) as string)).toEqual({ version: 1, house: 3 });
  });
});
