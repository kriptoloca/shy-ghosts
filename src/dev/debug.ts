import type { PlayEvent } from '../core/state';
import type { DrawnState } from '../game/board';
import type { ViewState } from '../game/view';

/**
 * Dev-only hooks for the e2e tests and the playtester (`window.__ghostDebug`). Installed by the
 * active scene inside `if (import.meta.env.DEV)`, so production builds drop them (smoke.spec
 * checks the absence). Under `?playtest=1` nothing here gives the solution away (D33).
 */
export interface GhostDebugState {
  scene: string;
  /** The house to play (the save's `house`). */
  house: number;
  /** The house on screen (Game only; during the slide, the house coming in). */
  shown?: number;
  platformId: string;
  /** Lifecycle messages sent to the platform, in order. */
  messages: string[];
  paused: boolean;
  /** The scene takes pointer input now (no platform pause, no resume grace). */
  input: boolean;
  /** Game: playing, the win beat, or the next house sliding in. */
  phase?: 'play' | 'win' | 'slide';
  /** Game: every motion has finished, so what is drawn is final. */
  idle?: boolean;
  solved?: boolean;
  /** The house in progress: solve time (s), moves, hints, conflicts (GDD §9). */
  seconds?: number;
  moves?: number;
  hints?: number;
  conflicts?: number;
  canUndo?: boolean;
  hintReady?: boolean;
  /** Seconds until the free hint is back (D32). */
  hintRemaining?: number;
  /** A save is waiting or being written. */
  pendingSave?: boolean;
  /** When the first house became interactive, ms after navigation start. */
  interactiveAt?: number | null;
  arrangement?: string;
  /** The house's side and the cell size in design px. */
  n?: number;
  cell?: number;
  playtest?: boolean;
  /** What the player did in this house: taps, placements, removals, … (Gate B logs). */
  tally?: Record<string, number>;
  /** Boards built since the Game started (one per house, one per new screen size). */
  builds?: number;
  /** The platform pause's dim cover is showing. */
  dimmed?: boolean;
  /** On the board on screen: effect drawings created, effects played (pooled: made < used). */
  effects?: { made: number; used: number };
}

/** A house's board when it opened and every event list the scene played since. */
export interface DebugRecord {
  start: ViewState;
  moves: PlayEvent[][];
}

/** A house as the hooks show it; no solution under `?playtest=1`. */
export interface DebugHouse {
  id: number;
  n: number;
  rooms: string;
  objects: string;
  givens: number[];
  solution: number[] | null;
}

export interface GhostDebug {
  state: () => GhostDebugState;
  /** Plays a platform pause (true) or resume (false), as the host would (bridge.ts). */
  pause?: (paused: boolean) => void;
  /** The middle of a cell, in page px (for real taps). */
  cellCenter?: (cell: number) => { x: number; y: number } | null;
  /** The middle and radius of a HUD button, in page px. */
  buttonCenter?: (name: 'undo' | 'hint') => { x: number; y: number; r: number } | null;
  /** The house's solution, or null under `?playtest=1`. */
  solution?: () => number[] | null;
  house?: () => DebugHouse;
  /** The board as a player sees it, as text (rooms, walls, objects, light, ghosts, marks). */
  visible?: () => string;
  /** What the display draws, read back from its objects (null outside DEV builds). */
  drawn?: () => DrawnState | null;
  /** What the rules hold now. */
  rules?: () => ViewState;
  /** The board when the house opened and every event list the scene played since. */
  events?: () => DebugRecord;
  /** The house finished last: its data, its record and its rules at the end (null before one). */
  previous?: () => { house: DebugHouse; events: DebugRecord; rules: ViewState } | null;
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
