import type { HintExplain } from '../core/hint';
import type { PlayEvent } from '../core/state';
import type { DrawnState } from '../game/board';
import type { MoveKind } from '../game/session';
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
  /** Game: a teaching demonstration (D70), playing, the win beat, or the next house sliding in. */
  phase?: 'demo' | 'play' | 'win' | 'slide';
  /** Game: ms on the scene clock since the house was solved, during its finale; else null (D73). */
  beatMs?: number | null;
  /**
   * The last finale (D73): its beat on the scene's clock, from the solve to the slide (a tap may
   * cut it short), the whole of it on the wall clock, from the solve to the next house, and how
   * far the clock moved in the frame the slide began, in ms; and how many ghosts still played a
   * settle's motion when the ghosts began to hop (null without a hop).
   */
  finale?: { beatMs: number; wallMs: number; stepMs: number; settling: number | null } | null;
  /** Teaching demonstrations started since the Game began (D70; none on a resume). */
  demos?: number;
  /** The house on screen: when it appeared, and when its input opened (performance.now(), ms). */
  shownAt?: number | null;
  playAt?: number | null;
  /** A tap ended this house's demonstration early. */
  demoSkipped?: boolean;
  /**
   * The hint's first press showed this reason and waits for the second (D74); null when no hint is
   * pending. Under `?playtest=1` a placement's cell is left out (it is on the solution).
   */
  hintReason?: DebugHintReason | null;
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
  /** The hint's reason is drawn on the board (D86). */
  reasonShown?: boolean;
  /** The solve time shown below the board (D85), or null. */
  timeShown?: string | null;
  /**
   * The tween clock's scale: 0 during a platform pause and until its first step after (round 1's
   * code audit, ORTA 3).
   */
  tweenScale?: number;
}

/**
 * `state()` under `?playtest=1` (docs/gate-b-round2.md §6, D87): neutral fields only, so the blind
 * playtester reads no rule, no mechanic and no state of play from the hooks (no word of
 * tests/support/rule-words.ts).
 */
export interface NeutralState {
  /** The house to play, and the house on screen. */
  house: number;
  shown: number;
  /** Seconds of play in the house on screen. */
  seconds: number;
  paused: boolean;
  /** A tap now acts on the board. */
  input: 'open' | 'closed';
  /** Taps and drags on the board, presses of the two buttons, in the house on screen. */
  taps: number;
  drags: number;
  presses: { arrow: number; bulb: number };
  /** Seconds until the bulb button answers again. */
  bulbReadyIn: number;
  arrangement: string;
  n: number;
  cell: number;
}

/** A pending hint's reason as the hooks show it (no cell for a placement under `?playtest=1`). */
export type DebugHintReason =
  | Extract<HintExplain, { kind: 'remove' }>
  | (Omit<Extract<HintExplain, { kind: 'place' }>, 'cell'> & { cell?: number });

/** A house's board when it opened and every event list the scene played since, with its kind. */
export interface DebugRecord {
  start: ViewState;
  moves: { kind: MoveKind; events: PlayEvent[] }[];
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
  /** The full dev state, or under `?playtest=1` the neutral one (D87). */
  state: () => GhostDebugState | NeutralState;
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
  /**
   * What the display draws, read back from its objects (null outside DEV builds). This hook and
   * the three below state the rules: under `?playtest=1` they throw (round 2's code audit,
   * DÜŞÜK 9).
   */
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
