import type { ButtonName } from '../game/hud';
import { cellCenter, type Circle, type Size } from '../game/layout';
import { progress } from '../game/progress';
import type { HouseOnScreen, Phase } from '../game/scenes/GameScene';
import { BoardView } from '../game/view';
import { visibleText } from '../game/visible';
import { getPlatform, sentPlatformMessages, simulatePause } from '../platform/bridge';
import type { PlayEvent } from '../core/state';
import { installDebug, type DebugHouse, type DebugRecord } from './debug';

/** What the Game scene shows the dev hooks (built inside its DEV branch only). */
export interface GameProbe {
  /** The scene takes pointer input now. */
  input: () => boolean;
  house: () => HouseOnScreen;
  phase: () => Phase;
  idle: () => boolean;
  paused: () => boolean;
  pendingSave: () => boolean;
  hint: () => { ready: boolean; remaining: number };
  interactiveAt: () => number | null;
  button: (name: ButtonName) => Circle;
  buttonEnabled: (name: ButtonName) => boolean;
  canvas: () => HTMLCanvasElement;
  size: () => Size;
  builds: () => number;
  dimmed: () => boolean;
  effects: () => { made: number; used: number };
  previous: () => HouseOnScreen | null;
}

/** Design px → page px through the canvas's place and scale on the page. */
function toPage(p: GameProbe, x: number, y: number): { x: number; y: number } {
  const rect = p.canvas().getBoundingClientRect();
  const size = p.size();
  return {
    x: rect.left + (x * rect.width) / size.width,
    y: rect.top + (y * rect.height) / size.height,
  };
}

/**
 * The Game scene's `__ghostDebug` (TASKS.md Epic 3). Loaded with a dynamic import from the
 * scene's DEV branch, so production builds carry none of it (smoke.spec checks the absence).
 * `?playtest=1` hides the solution (D33): `solution()` and `house().solution` are null.
 */
export function installGameDebug(p: GameProbe): void {
  const platform = getPlatform();
  const playtest = new URLSearchParams(window.location.search).get('playtest') === '1';
  const asDebug = (h: HouseOnScreen): DebugHouse => {
    return {
      id: h.id,
      n: h.data.n,
      rooms: h.data.rooms,
      objects: h.data.objects,
      givens: [...h.data.givens],
      solution: playtest ? null : [...h.data.solution],
    };
  };
  const house = (): DebugHouse => asDebug(p.house());
  const record = (h: HouseOnScreen): DebugRecord => {
    if (!h.log) throw new Error('the house log is kept in DEV builds only');
    return {
      start: structuredClone(h.log.start),
      moves: structuredClone(h.log.moves) as PlayEvent[][],
    };
  };
  installDebug({
    state: () => {
      const h = p.house();
      const hint = p.hint();
      return {
        scene: 'Game',
        house: progress.house,
        shown: h.id,
        platformId: platform.platformId,
        messages: [...sentPlatformMessages()],
        paused: p.paused(),
        input: p.input(),
        phase: p.phase(),
        idle: p.idle(),
        solved: h.state.solved,
        seconds: h.session.seconds,
        moves: h.session.moves,
        hints: h.session.hints,
        conflicts: h.session.conflicts,
        canUndo: h.state.canUndo,
        hintReady: hint.ready,
        hintRemaining: hint.remaining,
        pendingSave: p.pendingSave(),
        interactiveAt: p.interactiveAt(),
        arrangement: h.layout.arrangement,
        n: h.model.n,
        cell: h.layout.cell,
        playtest,
        tally: h.log ? { ...h.log.tally } : undefined,
        builds: p.builds(),
        dimmed: p.dimmed(),
        effects: p.effects(),
      };
    },
    pause: simulatePause,
    cellCenter: (cell) => {
      const h = p.house();
      if (!Number.isInteger(cell) || cell < 0 || cell >= h.model.size) return null;
      const c = cellCenter(h.layout, cell);
      return toPage(p, c.x + h.board.root.x, c.y);
    },
    buttonCenter: (name) => {
      const b = p.button(name);
      const at = toPage(p, b.x, b.y);
      const edge = toPage(p, b.x + b.r, b.y);
      return { ...at, r: edge.x - at.x };
    },
    solution: () => house().solution,
    house,
    visible: () => visibleText(p.house().id, p.house().view),
    drawn: () => p.house().board.drawn(),
    rules: () => BoardView.of(p.house().state).snapshot(),
    events: () => record(p.house()),
    previous: () => {
      const h = p.previous();
      if (!h) return null;
      return { house: asDebug(h), events: record(h), rules: BoardView.of(h.state).snapshot() };
    },
  });
}
