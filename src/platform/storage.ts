import { N_MAX } from '../core/house';
import { withTimeout } from './timeout';

/**
 * Save model and storage (GDD §9, CLAUDE.md rule 7). The backend is an interface: the Playgama
 * Bridge storage API in production, localStorage or memory in dev and tests. Nothing in here ever
 * throws into gameplay.
 */

/** v1 holds what the graybox needs; v2 (Epic 5) adds the meta and daily fields (D31). */
export const SAVE_VERSION = 1;
export const SAVE_KEY = 'shy-ghosts:save';
/** Cells of the largest house (9 × 9, GDD §3): every stored ghost and mark index is below it. */
export const CELLS_MAX = N_MAX * N_MAX;

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
}

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

/** Browser localStorage; private mode or quota errors degrade to "nothing stored". */
export class LocalStorageBackend implements StorageBackend {
  get(key: string): Promise<string | null> {
    try {
      return Promise.resolve(window.localStorage.getItem(key));
    } catch {
      return Promise.resolve(null);
    }
  }
  set(key: string, value: string): Promise<void> {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore: saving is best effort
    }
    return Promise.resolve();
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

/** Coerces whatever was stored into a valid SaveData; unknown or newer versions start fresh. */
export function migrate(raw: unknown): SaveData {
  if (typeof raw !== 'object' || raw === null) return defaultSave();
  const r = raw as Record<string, unknown>;
  const d = defaultSave();
  if (int(r.version, 0) !== SAVE_VERSION) return d;
  const house = int(r.house, d.house, 1);
  return {
    version: SAVE_VERSION,
    house,
    housesSolved: int(r.housesSolved, d.housesSolved),
    current: inProgress(r.current, house),
    sound: bool(r.sound, d.sound),
    music: bool(r.music, d.music),
  };
}

/** A host storage read that has not answered by then no longer holds Boot (and GameReady). */
export const LOAD_TIMEOUT_MS = 4000;
/**
 * A read that missed LOAD_TIMEOUT_MS is still awaited this long before the first save may write
 * without it (a storage that never answers would otherwise block every save of the session).
 */
export const LATE_READ_MAX_MS = 30_000;

/**
 * A save read late meets the progress made meanwhile: the furthest house wins, and the house in
 * progress is the one of that house (this session's when both are, since it is on screen); the
 * settings come from the stored save (a toggle made during a slow first read is the only thing
 * lost).
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
  };
}

export class SaveStore {
  /** A first read that outlived LOAD_TIMEOUT_MS (null when the load answered in time). */
  private lateRead: Promise<SaveData | null> | null = null;
  /** The late read has finished; saves started from then on carry the merged progress. */
  private lateSettled = false;

  constructor(
    private readonly backend: StorageBackend,
    private readonly key: string = SAVE_KEY,
    private readonly timeoutMs: number = LOAD_TIMEOUT_MS,
    private readonly lateMaxMs: number = LATE_READ_MAX_MS,
  ) {}

  /**
   * Never rejects and never hangs: a failure, an empty store or a timeout yields a fresh default
   * save. After a timeout the read goes on; `late()` delivers it and `save()` merges with it.
   */
  async load(): Promise<SaveData> {
    const read = this.read();
    try {
      return (await withTimeout(read, this.timeoutMs)) ?? defaultSave();
    } catch {
      this.lateRead = withTimeout(read, this.lateMaxMs).catch(() => null);
      // Attached first, so it runs before any save waiting on the same read continues.
      void this.lateRead.then(() => {
        this.lateSettled = true;
      });
      return defaultSave();
    }
  }

  /** The stored save once a timed-out first read has finished; null when there is none. */
  late(): Promise<SaveData | null> {
    return this.lateRead ?? Promise.resolve(null);
  }

  /**
   * Never rejects: returns false when the backend failed. A save started while a late first read
   * is still on its way waits for it and writes the merge (`mergeSaves`), so a slow store never
   * loses the player's real progress to the fresh save Boot started with.
   */
  async save(data: SaveData): Promise<boolean> {
    let out = data;
    if (this.lateRead && !this.lateSettled) {
      const stored = await this.lateRead;
      if (stored) out = mergeSaves(stored, data);
    }
    try {
      await this.backend.set(this.key, JSON.stringify(out));
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.backend.set(this.key, '');
    } catch {
      // ignore
    }
  }

  /** The stored save, or null when the store is empty, unreadable or holds garbage. */
  private async read(): Promise<SaveData | null> {
    try {
      const raw = await this.backend.get(this.key);
      if (!raw) return null;
      return migrate(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  }
}
