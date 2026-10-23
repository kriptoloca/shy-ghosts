import type { ButtonName } from '../game/hud';
import { cellCenter, type Circle, type Size } from '../game/layout';
import { progress } from '../game/progress';
import type { CardShown } from '../game/card';
import type { FinaleRecord, HouseOnScreen, Phase } from '../game/scenes/GameScene';
import { BoardView } from '../game/view';
import { visibleText } from '../game/visible';
import { getPlatform, sentPlatformMessages, simulatePause } from '../platform/bridge';
import type { HintExplain } from '../core/hint';
import type { ReasonPicture } from '../game/reason';
import {
  installDebug,
  type DebugHintReason,
  type DebugHouse,
  type DebugRecord,
  type NeutralState,
} from './debug';

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
  /** ms on the scene's clock since the house was solved, during its finale (D73). */
  beatMs: () => number | null;
  /** The last finale (D73, D99): see `GhostDebugState.finale`. */
  finale: () => FinaleRecord | null;
  /** ms on the scene's clock since the result card began, while it holds (D99). */
  cardMs: () => number | null;
  /** What the result card shows, while it holds (D99). */
  card: () => CardShown | null;
  /** Demonstrations started since the Game began, and the house on screen's (D70). */
  demos: () => number;
  shownAt: () => number | null;
  playAt: () => number | null;
  demoSkipped: () => boolean;
  /** The hint's reason waiting for its second press (D74). */
  hintReason: () => HintExplain | null;
  /** The hint's reason is drawn on the board (D86). */
  reasonShown: () => boolean;
  /** What the reason has drawn so far (D98). */
  reasonPicture: () => ReasonPicture | null;
  /** The solve time below the board, or null (D85). */
  timeShown: () => string | null;
  /** The tween clock's scale: 0 while the platform pause holds and until its first step after. */
  tweenScale: () => number;
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
 * `?playtest=1` hides the solution (D33): `solution()` and `house().solution` are null,
 * `state()` holds only neutral fields (D87): no word for a rule or a mechanic, no state of play,
 * and `rules()`, `drawn()`, `events()` and `previous()`, which state the rules, throw.
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
  /** A placement's cell is on the solution: `?playtest=1` leaves it out (D33). */
  const reason = (r: HintExplain | null): DebugHintReason | null => {
    if (!r) return null;
    if (r.kind === 'remove' || !playtest) return structuredClone(r);
    const beats = r.beats.map((b) => {
      if (b.kind !== 'target') return structuredClone(b);
      return { kind: b.kind, room: b.room, dots: [...b.dots], lines: structuredClone(b.lines) };
    });
    return { kind: r.kind, room: r.room, segments: [...r.segments], rooms: [...r.rooms], beats };
  };
  const record = (h: HouseOnScreen): DebugRecord => {
    if (!h.log) throw new Error('the house log is kept in DEV builds only');
    return {
      start: structuredClone(h.log.start),
      moves: structuredClone(h.log.moves) as DebugRecord['moves'],
    };
  };
  /** What the playtester may read (D87): where, how long, how much it did, the screen. */
  const neutral = (): NeutralState => {
    const h = p.house();
    const tally = h.log?.tally;
    return {
      house: progress.house,
      shown: h.id,
      seconds: h.session.seconds,
      paused: p.paused(),
      input: p.input() && p.phase() === 'play' && !p.paused() ? 'open' : 'closed',
      taps: tally?.taps ?? 0,
      drags: (tally?.strokes ?? 0) + (tally?.drags ?? 0),
      presses: { arrow: tally?.undoPresses ?? 0, bulb: tally?.hintPresses ?? 0 },
      bulbReadyIn: p.hint().remaining,
      arrangement: h.layout.arrangement,
      n: h.model.n,
      cell: h.layout.cell,
    };
  };
  installDebug({
    state: () => {
      if (playtest) return neutral();
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
        beatMs: p.beatMs(),
        finale: p.finale(),
        cardMs: p.cardMs(),
        card: p.card(),
        demos: p.demos(),
        shownAt: p.shownAt(),
        playAt: p.playAt(),
        demoSkipped: p.demoSkipped(),
        hintReason: reason(p.hintReason()),
        reasonShown: p.reasonShown(),
        reasonPicture: p.reasonPicture(),
        timeShown: p.timeShown(),
        tweenScale: p.tweenScale(),
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
    visible: () => visibleText(p.house().id, p.house().view, p.reasonPicture(), p.card()),
    // the board as the rules hold it, in their words: never under ?playtest=1 (round 2's code
    // audit, DÜŞÜK 9)
    drawn: playtest ? hidden('drawn') : () => p.house().board.drawn(),
    rules: playtest ? hidden('rules') : () => BoardView.of(p.house().state).snapshot(),
    events: playtest ? hidden('events') : () => record(p.house()),
    sprites: playtest ? hidden('sprites') : () => p.house().board.sprites(),
    previous: playtest
      ? hidden('previous')
      : () => {
          const h = p.previous();
          if (!h) return null;
          return { house: asDebug(h), events: record(h), rules: BoardView.of(h.state).snapshot() };
        },
  });
}

/** A hook the playtester may not read: it states the rules (D33, D87). */
function hidden(name: string): () => never {
  return () => {
    throw new Error(`__ghostDebug.${name}() is not available under ?playtest=1`);
  };
}
