import { HINT_COOLDOWN_S, HOUSE_N_MAX } from '../config';
import { TimeoutError, withTimeout } from './timeout';

/**
 * Save model and storage (GDD §9, CLAUDE.md rule 7). The backend is an interface: the Playgama
 * Bridge storage API in production, localStorage or memory in dev and tests. Nothing in here ever
 * throws into gameplay.
 */

/**
 * v1 holds what the graybox needs; v2 adds the hint's recharge (Gate B tune round 3, D98); the meta
 * and daily fields of Epic 5 come in a later version (D31).
 */
export const SAVE_VERSION = 2;
export const SAVE_KEY = 'shy-ghosts:save';
/** Cells of the largest house (9 × 9, GDD §3): every stored ghost and mark index is below it. */
export const CELLS_MAX = HOUSE_N_MAX * HOUSE_N_MAX;

/** The house in progress (GDD §9): restored after a reload, the undo history is not (D21). */
export interface HouseInProgress {
  /** The house's id: its 1-based place in the list. */
  id: number;
  /** Cells of the ghosts the player placed, ascending (the givens belong to the house data). */
  ghosts: number[];
  /** Marked cells, ascending. */
  marks: number[];
  /** Solve time so far in seconds, paused time excluded (GDD §3.2). */
  seconds: number;
  /** Hints used, moves made and conflicts caused in this house (`level_complete`, GDD §14). */
  hints: number;
  moves: number;
  conflicts: number;
}

export interface SaveData {
  version: number;
  /** The house to play: the lowest unsolved one, 1-based (GDD §9: no level select). */
  house: number;
  /** Houses solved, all time. */
  housesSolved: number;
  /** The house in progress (always the house to play), or null before its first input. */
  current: HouseInProgress | null;
  sound: boolean;
  music: boolean;
  /** v2: seconds of play until the hint is ready, 0 to HINT_COOLDOWN_S (D98). */
  hintReadyIn: number;
}

/**
 * Where the save lives. `get` resolves the stored string, or null when nothing is stored, and
 * rejects when the store could not be read: an unread store is never taken for an empty one
 * (D47). `set` rejects when the write failed.
 */
export interface StorageBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export class MemoryBackend implements StorageBackend {
  private readonly map = new Map<string, string>();
  get(key: string): Promise<string | null> {
    return Promise.resolve(this.map.get(key) ?? null);
  }
  set(key: string, value: string): Promise<void> {
    this.map.set(key, value);
    return Promise.resolve();
  }
}

/**
 * Browser localStorage (the dev and stub fallback). Blocked storage or a full quota rejects, so
 * SaveStore treats the store as unread and never overwrites what it could not see.
 */
export class LocalStorageBackend implements StorageBackend {
  get(key: string): Promise<string | null> {
    try {
      return Promise.resolve(window.localStorage.getItem(key));
    } catch (e: unknown) {
      return Promise.reject(e instanceof Error ? e : new Error(String(e)));
    }
  }
  set(key: string, value: string): Promise<void> {
    try {
      window.localStorage.setItem(key, value);
      return Promise.resolve();
    } catch (e: unknown) {
      return Promise.reject(e instanceof Error ? e : new Error(String(e)));
    }
  }
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    house: 1,
    housesSolved: 0,
    current: null,
    sound: true,
    music: true,
    hintReadyIn: 0,
  };
}

/** An integer ≥ `min` (floats are floored), else `fallback`. */
function int(v: unknown, fallback: number, min = 0): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min ? Math.floor(v) : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

/** Distinct cell indices of a house (0 … CELLS_MAX − 1), ascending; anything else is dropped. */
function cells(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  const ok = v.filter(
    (x): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x < CELLS_MAX,
  );
  return [...new Set(ok)].sort((a, b) => a - b);
}

/** A copy of a house in progress, so the stored and the running save never share arrays. */
export function copyInProgress(c: HouseInProgress): HouseInProgress {
  return { ...c, ghosts: [...c.ghosts], marks: [...c.marks] };
}

/**
 * The house in progress as stored, or null when it is missing, broken or belongs to another house
 * than the one to play (a stale slot never restores onto the wrong board).
 */
function inProgress(v: unknown, house: number): HouseInProgress | null {
  if (typeof v !== 'object' || v === null) return null;
  const r = v as Record<string, unknown>;
  if (int(r.id, 0, 1) !== house) return null;
  const seconds = r.seconds;
  return {
    id: house,
    ghosts: cells(r.ghosts),
    marks: cells(r.marks),
    seconds: typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 0 ? seconds : 0,
    hints: int(r.hints, 0),
    moves: int(r.moves, 0),
    conflicts: int(r.conflicts, 0),
  };
}

/** The save format version of a stored value: an integer ≥ 1, or null when it has none. */
export function versionOf(raw: unknown): number | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const v = (raw as Record<string, unknown>).version;
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 ? v : null;
}

/** The hint's recharge as stored: seconds within 0 and the cooldown, else 0 (ready; D98). */
function readyIn(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v)
    ? Math.min(HINT_COOLDOWN_S, Math.max(0, v))
    : 0;
}

/**
 * Coerces whatever was stored into a valid SaveData of this version. Any version ≥ 1 is read for
 * the fields this version knows, since every later version only adds fields (D31, D47); a v1 save
 * has the hint ready; no version, or a broken one, starts fresh.
 */
export function migrate(raw: unknown): SaveData {
  const d = defaultSave();
  if (versionOf(raw) === null) return d;
  const r = raw as Record<string, unknown>;
  const house = int(r.house, d.house, 1);
  return {
    version: SAVE_VERSION,
    house,
    housesSolved: int(r.housesSolved, d.housesSolved),
    current: inProgress(r.current, house),
    sound: bool(r.sound, d.sound),
    music: bool(r.music, d.music),
    hintReadyIn: readyIn(r.hintReadyIn),
  };
}

/** A host storage read that has not answered by then no longer holds Boot (and GameReady). */
export const LOAD_TIMEOUT_MS = 4000;
/**
 * A read that missed LOAD_TIMEOUT_MS is still awaited this long; then the store counts as unread,
 * and each save reads again before it may write (D47).
 */
export const LATE_READ_MAX_MS = 30_000;

/**
 * A save read late meets the progress made meanwhile: the furthest house wins, and the house in
 * progress is the one of that house (this session's when both are, since it is on screen); the
 * settings come from the stored save (a toggle made during a slow first read is the only thing
 * lost); the longer hint recharge is kept, so a reload never resets it (D98).
 */
export function mergeSaves(stored: SaveData, local: SaveData): SaveData {
  const house = Math.max(stored.house, local.house);
  const current =
    local.current?.id === house
      ? local.current
      : stored.current?.id === house
        ? stored.current
        : null;
  return {
    version: SAVE_VERSION,
    house,
    housesSolved: Math.max(stored.housesSolved, local.housesSolved),
    current: current ? copyInProgress(current) : null,
    sound: stored.sound,
    music: stored.music,
    hintReadyIn: Math.max(stored.hintReadyIn, local.hintReadyIn),
  };
}

/** What a read of the store found. */
type Found =
  /** Nothing stored, or garbage nobody can read: the next save may write. */
  { kind: 'blank' } | { kind: 'save'; data: SaveData; newer: boolean };

function found(raw: string | null): Found {
  if (raw === null || raw === '') return { kind: 'blank' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { kind: 'blank' };
  }
  const version = versionOf(parsed);
  if (version === null) return { kind: 'blank' };
  return { kind: 'save', data: migrate(parsed), newer: version > SAVE_VERSION };
}

/** A read that settled in time, failed, or was still on its way. */
type Outcome = { ok: true; found: Found } | { ok: false; timedOut: boolean };

function settle(read: Promise<Found>, ms: number): Promise<Outcome> {
  return withTimeout(read, ms).then(
    (f): Outcome => ({ ok: true, found: f }),
    (e: unknown): Outcome => ({ ok: false, timedOut: e instanceof TimeoutError }),
  );
}

/**
 * Where the stored save stands (D47):
 * - `pending`: the first read missed LOAD_TIMEOUT_MS and is still on its way;
 * - `known`: the store was read (a save, nothing, or garbage): saves write;
 * - `newer`: a later version's save is stored: it is played from and never overwritten;
 * - `unread`: the store could not be read: each save reads again first and writes only once a
 *   read succeeds.
 */
type StoreState = 'pending' | 'known' | 'newer' | 'unread';

export class SaveStore {
  private state: StoreState = 'pending';
  /** The first read that outlived LOAD_TIMEOUT_MS, still awaited (null otherwise). */
  private late: Promise<SaveData | null> | null = null;
  /** A read retried by a save after a failure, shared by the saves waiting on it. */
  private retry: Promise<SaveData | null> | null = null;
  /** A save that arrived after the boot (late or retried), for listeners that come later. */
  private arrived: SaveData | null = null;
  private readonly listeners = new Set<(stored: SaveData) => void>();

  constructor(
    private readonly backend: StorageBackend,
    private readonly key: string = SAVE_KEY,
    private readonly timeoutMs: number = LOAD_TIMEOUT_MS,
    private readonly lateMaxMs: number = LATE_READ_MAX_MS,
  ) {}

  /**
   * Never rejects and never hangs: the stored save (any version ≥ 1, read for its v1 fields), or
   * a fresh default save when the store is empty, unreadable or slow. A slow read goes on and is
   * merged when it lands (`onLateSave`); a failed one is retried by the next save. Neither is
   * ever overwritten unread.
   */
  async load(): Promise<SaveData> {
    const read = this.read();
    const first = await settle(read, this.timeoutMs);
    if (first.ok) return this.take(first.found) ?? defaultSave();
    if (!first.timedOut) {
      this.state = 'unread';
      return defaultSave();
    }
    this.state = 'pending';
    this.late = settle(read, this.lateMaxMs).then((o) => this.arrive(o));
    return defaultSave();
  }

  /**
   * `cb` gets the stored save when it arrives after the boot (a first read that missed the timeout,
   * or one a save retried after a failure), so the running progress can merge it (furthest house
   * wins). A save that already arrived is delivered at once. Returns the unsubscribe.
   */
  onLateSave(cb: (stored: SaveData) => void): () => void {
    this.listeners.add(cb);
    if (this.arrived) cb(this.arrived);
    return () => {
      this.listeners.delete(cb);
    };
  }

  /**
   * Never rejects: true when the save was written. Writes only over a store that was read: a save
   * started while the first read is still on its way waits for it and writes the merge
   * (`mergeSaves`); after a failed read it reads again first; over a newer version's save, or a
   * store that still cannot be read, it writes nothing (D47).
   */
  async save(data: SaveData): Promise<boolean> {
    let out = data;
    if (this.state === 'pending' && this.late) {
      const stored = await this.late;
      if (stored) out = mergeSaves(stored, data);
    } else if (this.state === 'unread') {
      this.retry ??= settle(this.read(), this.timeoutMs).then((o) => {
        this.retry = null;
        return this.arrive(o);
      });
      const stored = await this.retry;
      if (stored) out = mergeSaves(stored, data);
    }
    if (this.state !== 'known') return false;
    try {
      await this.backend.set(this.key, JSON.stringify(out));
      return true;
    } catch {
      return false;
    }
  }

  /** Records what a read found; returns the stored save, if there is one. */
  private take(f: Found): SaveData | null {
    if (f.kind === 'blank') {
      this.state = 'known';
      return null;
    }
    this.state = f.newer ? 'newer' : 'known';
    return f.data;
  }

  /** A read after the boot settled: a save is adopted and announced; a failure leaves it unread. */
  private arrive(o: Outcome): SaveData | null {
    if (!o.ok) {
      this.state = 'unread';
      return null;
    }
    const stored = this.take(o.found);
    if (stored) {
      this.arrived = stored;
      for (const cb of this.listeners) cb(stored);
    }
    return stored;
  }

  /** What the store holds; rejects when the backend could not be read. */
  private async read(): Promise<Found> {
    return found(await this.backend.get(this.key));
  }
}
