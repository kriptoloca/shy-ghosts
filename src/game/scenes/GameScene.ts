import Phaser from 'phaser';
import {
  COLOR_PAGE,
  DIM_ALPHA,
  DRAG_PX,
  SAVE_DEBOUNCE_MS,
  SLIDE_MS,
  WIN_BEAT_MS,
  WIN_SKIP_FROM_MS,
} from '../../config';
import type { HintExplain } from '../../core/hint';
import { parseHouse, type HouseModel } from '../../core/house';
import { PlayState, type PlayEvent } from '../../core/state';
import { playHouse } from '../../data/houses';
import { uninstallDebug } from '../../dev/debug';
import { HouseLog } from '../../dev/house-log';
import type { PlayHouse } from '../../gen/record';
import { getPlatform, markInteractive } from '../../platform/bridge';
import type { HouseInProgress } from '../../platform/storage';
import { BoardDisplay } from '../board';
import { demoFor } from '../demo';
import { makeGrayboxTextures } from '../graybox';
import { Gesture } from '../gesture';
import { Hud, type ButtonName } from '../hud';
import { cellAt, computeLayout, type Layout } from '../layout';
import { roomStyles } from '../look';
import { advanceHouse, progress, recordHouseInProgress } from '../progress';
import { ResumeGrace, bindPauseGrace } from '../resume-grace';
import { HintClock, HouseSession, type MoveKind } from '../session';
import { BoardView } from '../view';

/** The house on screen and everything that belongs to it. */
export interface HouseOnScreen {
  id: number;
  data: PlayHouse;
  model: HouseModel;
  state: PlayState;
  view: BoardView;
  session: HouseSession;
  board: BoardDisplay;
  layout: Layout;
  /** The house came from the save (a resume): its demonstration is not shown again (D70). */
  resumed: boolean;
  /**
   * The board when the house opened, every event list played since and the tally, for the dev
   * hooks: DEV builds only (audit 2026-10-21, DÜŞÜK 8).
   */
  log: HouseLog | null;
}

export type Phase = 'demo' | 'play' | 'win' | 'slide';

/** The finale from the solve to the next house: the beat, then the slide (D73). */
const FINALE_MS = WIN_BEAT_MS + SLIDE_MS;

/** Events that change the ghosts on the board (a pending hint's reason no longer holds, D74). */
const GHOST_EVENTS: ReadonlySet<PlayEvent['type']> = new Set([
  'placed',
  'relocated',
  'moved',
  'removed',
]);

/**
 * Game (GDD §11 screen 2), the graybox loop of Epic 3 with Gate B's round-1 changes: the house to
 * play, its teaching demonstration in the first house of each element (D70; a tap skips it, a
 * resume never replays it), taps on its cells, drags that paint marks or carry a ghost (D72), undo
 * and the free two-press hint (the reason, then the move; D74), the progress dots (D75), the
 * finale and the next house sliding in by itself (D73; a tap skips it from WIN_SKIP_FROM_MS), the
 * save after every change (debounced) and every house, the resume of a house in progress, the
 * platform pause (everything freezes under a dim cover; the waking tap never counts). The rules
 * resolve in src/core; this scene only plays their events back (CLAUDE.md).
 */
export class GameScene extends Phaser.Scene {
  private readonly grace = new ResumeGrace(this);
  private readonly hints = new HintClock();
  private house!: HouseOnScreen;
  private hud!: Hud;
  private dim!: Phaser.GameObjects.Rectangle;
  private gesture!: Gesture;
  private stroke: number[] = [];
  private phase: Phase = 'play';
  private paused = false;
  /**
   * The finale's clock (D73), one over the beat and the slide: wall-clock ms since the solve, less
   * the time the platform paused it, plus what a tap skipped. Each frame moves the finale to it, so
   * it lasts its length to within a frame on any device; it is the scene's, so a new board for a
   * new screen size never cuts it.
   */
  private wonAt = 0;
  private skipped = 0;
  private pausedMs = 0;
  private pausedAt: number | null = null;
  /** The house sliding out. */
  private leaving: HouseOnScreen | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private saving = 0;
  private interactiveAt: number | null = null;
  /** Boards built so far (dev state: a resize at the same size builds none). */
  private builds = 0;
  /** The house finished last (dev hooks: the e2e replays its moves). */
  private previous: HouseOnScreen | null = null;
  /** The next house, built hidden during the finale's hit stop so the slide never stutters. */
  private next: HouseOnScreen | null = null;
  /** The hint's first press showed this reason; the second press completes it (D74). */
  private pending: HintExplain | null = null;
  /** The teaching demonstration's end, on the tween clock like its motions (D70). */
  private demoEnd: Phaser.Tweens.Tween | null = null;
  /** How far the last beat ran before the slide (all of it, unless a tap skipped the rest). */
  private slidAt = 0;
  /** Dev state: the last finale, demonstrations started, the house on screen's times. */
  private lastFinale: { beatMs: number; wallMs: number } | null = null;
  private demos = 0;
  private shownAt: number | null = null;
  private playAt: number | null = null;
  private demoSkipped = false;

  constructor() {
    super('Game');
  }

  create(): void {
    this.phase = 'play';
    this.paused = false;
    makeGrayboxTextures(this);
    this.hud = new Hud(this, (name) => {
      this.press(name);
    });
    // a drag that starts on a ghost carries it (D72)
    this.gesture = new Gesture(
      (x, y) => cellAt(this.house.layout, x, y),
      DRAG_PX,
      (c) => this.house.state.statusAt(c) !== null,
    );
    this.house = this.open(progress.house, 0);
    this.hud.layoutTo(this.house.layout);
    this.dim = this.add
      .rectangle(0, 0, this.scale.gameSize.width, this.scale.gameSize.height, COLOR_PAGE, DIM_ALPHA)
      .setOrigin(0, 0)
      .setDepth(1)
      .setVisible(false);
    this.updateHud();

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      this.pointerDown(p);
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      this.pointerMove(p);
    });
    const up = (p: Phaser.Input.Pointer): void => {
      this.pointerUp(p);
    };
    this.input.on(Phaser.Input.Events.POINTER_UP, up);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, up);

    const relayout = (): void => {
      this.relayout();
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, relayout);

    const platform = getPlatform();
    const unsubscribe = bindPauseGrace(this.grace, platform);
    const unpause = platform.onPause((p) => {
      this.setPaused(p);
    });
    if (platform.isPaused()) this.setPaused(true);
    const flush = (): void => {
      this.flushSave();
    };
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') this.flushSave();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);

    let alive = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      alive = false;
      this.flushSave();
      this.scale.off(Phaser.Scale.Events.RESIZE, relayout);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
      unsubscribe();
      unpause();
      this.grace.dispose();
      this.house.board.destroy();
      this.leaving?.board.destroy();
      this.next?.board.destroy();
      if (import.meta.env.DEV) uninstallDebug();
    });

    if (import.meta.env.DEV) {
      void import('../../dev/game-debug').then((m) => {
        if (!alive) return;
        m.installGameDebug({
          input: () => this.input.enabled,
          house: () => this.house,
          phase: () => this.phase,
          idle: () => this.phase === 'play' && this.house.board.idle(),
          paused: () => this.paused,
          pendingSave: () => this.saveTimer !== null || this.saving > 0,
          hint: () => ({ ready: this.hints.ready, remaining: this.hints.remaining }),
          interactiveAt: () => this.interactiveAt,
          button: (name) => this.hud.circle(name),
          buttonEnabled: (name) => this.hud.enabled(name),
          canvas: () => this.game.canvas,
          size: () => this.scale.gameSize,
          builds: () => this.builds,
          dimmed: () => this.dim.visible,
          effects: () => this.house.board.effects(),
          previous: () => this.previous,
          beatMs: () => (this.phase === 'win' ? this.finaleAt() : null),
          finale: () => this.lastFinale,
          demos: () => this.demos,
          shownAt: () => this.shownAt,
          playAt: () => this.playAt,
          demoSkipped: () => this.demoSkipped,
          hintReason: () => this.pending,
        });
      });
    }
    // GameReady: the house is on screen and answers a tap (one skips its demonstration, D70)
    markInteractive(platform);
    this.interactiveAt = performance.now();
    // a house restored already solved never announces `solved`: play its win now (D49)
    if (this.house.state.solvedAtStart) this.win();
    else this.begin();
  }

  override update(_time: number, delta: number): void {
    if (this.paused) return;
    if (this.phase === 'win' || this.phase === 'slide') this.finaleStep();
    if (this.phase === 'play') this.house.session.tick(delta);
    const wasReady = this.hints.ready;
    this.hints.tick(delta);
    this.hud.setCooldown(this.hints.share);
    if (wasReady !== this.hints.ready) this.updateHud();
  }

  // ---- houses -----------------------------------------------------------------------------------

  /** House `id` with its house in progress from the save, if the save holds it (D40, D50). */
  private open(id: number, x: number): HouseOnScreen {
    const saved: HouseInProgress | null =
      progress.current?.id === id && id === progress.house ? progress.current : null;
    const data = playHouse(id);
    const model = parseHouse(data);
    const state = saved ? PlayState.restore(model, saved) : new PlayState(model);
    const view = BoardView.of(state);
    const layout = computeLayout(this.scale.gameSize, model.n);
    const board = this.build(view, layout, model);
    board.root.x = x;
    return {
      id,
      data,
      model,
      state,
      view,
      session: new HouseSession(id, saved),
      board,
      layout,
      resumed: saved !== null,
      log: import.meta.env.DEV ? new HouseLog(view.snapshot()) : null,
    };
  }

  /**
   * The house on screen opens: first its teaching demonstration, when it is the first house of an
   * element and was not resumed (D70); input stays closed until it ends or a tap skips it.
   */
  private begin(): void {
    const h = this.house;
    this.shownAt = performance.now();
    this.playAt = null;
    this.demoSkipped = false;
    const script = h.resumed ? null : demoFor(h.id, h.model);
    if (script) {
      this.phase = 'demo';
      this.demos++;
      h.board.demo(script);
      this.demoEnd = this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: script.ms,
        onComplete: () => {
          this.demoEnd = null;
          this.endDemo(false);
        },
      });
    } else {
      this.phase = 'play';
      this.playAt = this.shownAt;
    }
    this.updateHud();
  }

  /** The demonstration ends by itself, or a tap skipped it: input opens (D70). */
  private endDemo(skipped: boolean): void {
    if (this.phase !== 'demo') return;
    this.demoEnd?.stop();
    this.demoEnd = null;
    this.house.board.endDemo();
    this.phase = 'play';
    this.demoSkipped = skipped;
    this.playAt = performance.now();
    this.updateHud();
  }

  private build(view: BoardView, layout: Layout, model: HouseModel): BoardDisplay {
    this.builds++;
    return new BoardDisplay(this, view, layout, roomStyles(model));
  }

  /** The house is solved: count it, save, play the beat, then the next house slides in. */
  private win(): void {
    if (this.phase !== 'play') return;
    const h = this.house;
    this.phase = 'win';
    this.wonAt = performance.now();
    this.skipped = 0;
    this.pausedMs = 0;
    // a house restored solved under a platform pause (D49) starts its finale paused
    this.pausedAt = this.paused ? this.wonAt : null;
    this.slidAt = WIN_BEAT_MS;
    this.pending = null;
    h.board.clearReason();
    if (import.meta.env.DEV) this.previous = h;
    h.session.finish();
    this.cancelSave();
    this.gesture.cancel();
    h.board.clearStroke();
    // a press in hand never reaches the next house (audit 2026-10-21, YÜKSEK 3)
    this.hud.cancelPress();
    this.saving++;
    void advanceHouse(h.id).finally(() => {
      this.saving--;
    });
    this.updateHud();
    h.board.celebrate(h.session.seconds);
    // the next house is built now, in the hit stop, hidden off to the right
    this.next = this.open(progress.house, this.scale.gameSize.width);
    this.next.board.root.setVisible(false);
  }

  /** How far the finale has run, in ms: paused time left out, taps' skips included. */
  private finaleAt(): number {
    const now = performance.now();
    const paused = this.pausedMs + (this.pausedAt === null ? 0 : now - this.pausedAt);
    return Math.min(FINALE_MS, now - this.wonAt - paused + this.skipped);
  }

  /**
   * The finale moves on: past WIN_BEAT_MS the next house starts to slide in, and the boards
   * follow the clock until the slide ends.
   */
  private finaleStep(): void {
    const at = this.finaleAt();
    if (this.phase === 'win' && at >= WIN_BEAT_MS) this.slide();
    const old = this.leaving;
    if (this.phase !== 'slide' || !old) return;
    const width = this.scale.gameSize.width;
    const p = Math.min(1, (at - WIN_BEAT_MS) / SLIDE_MS);
    const x = width * Phaser.Math.Easing.Sine.InOut(p);
    old.board.root.x = -x;
    this.house.board.root.x = width - x;
    if (p >= 1) this.arrive();
  }

  /** The beat is over (or skipped): the next house, built in the hit stop, starts to slide in. */
  private slide(): void {
    if (this.phase !== 'win') return;
    this.phase = 'slide';
    this.leaving = this.house;
    const next = this.next ?? this.open(progress.house, this.scale.gameSize.width);
    this.next = null;
    next.board.root.setVisible(true).setX(this.scale.gameSize.width);
    this.house = next;
  }

  private arrive(): void {
    // measured as the slide ends, before the old board is freed
    this.lastFinale = { beatMs: this.slidAt, wallMs: performance.now() - this.wonAt };
    this.leaving?.board.destroy();
    this.leaving = null;
    this.house.board.root.x = 0;
    this.phase = 'play';
    if (this.house.state.solvedAtStart) this.win();
    else this.begin();
  }

  /** The finale jumps to `at` ms (a tap, or a new screen size during the slide). */
  private finaleTo(at: number): void {
    this.skipped += Math.max(0, at - this.finaleAt());
    this.finaleStep();
  }

  /**
   * A tap during the finale skips the beat from WIN_SKIP_FROM_MS on (D73: earlier taps, the last
   * placement's among them, never cut the payoff short); during the slide, it ends the slide (GDD
   * §3.2). It does nothing else, not even on a button (audit YÜKSEK 3).
   */
  private skip(): void {
    this.hud.cancelPress();
    if (this.phase === 'win') {
      const at = this.finaleAt();
      if (at < WIN_SKIP_FROM_MS) return;
      this.slidAt = at;
      this.finaleTo(WIN_BEAT_MS);
    } else if (this.phase === 'slide') this.finaleTo(FINALE_MS);
  }

  // ---- input ------------------------------------------------------------------------------------

  private pointerDown(p: Phaser.Input.Pointer): void {
    if (this.paused) return;
    if (this.phase === 'demo') {
      // a tap skips the demonstration; it is no game tap and no press (D70)
      this.hud.cancelPress();
      this.endDemo(true);
      return;
    }
    if (this.phase !== 'play') {
      this.skip();
      return;
    }
    this.gesture.down(p.x, p.y);
    this.stroke = [];
    if (this.gesture.active) this.house.session.input();
  }

  private pointerMove(p: Phaser.Input.Pointer): void {
    if (this.paused || this.phase !== 'play' || !this.gesture.active || !p.isDown) return;
    const added = this.gesture.move(p.x, p.y);
    const h = this.house;
    if (this.gesture.carrying) {
      h.board.carry(this.gesture.origin, this.gesture.over);
      return;
    }
    if (!this.gesture.dragging || added.length === 0) return;
    this.stroke.push(...added);
    h.board.showStroke(this.stroke, h.state.strokeModeAt(this.stroke[0] as number));
  }

  private pointerUp(p: Phaser.Input.Pointer): void {
    // a touch the system takes back (an edge swipe, a call) is no tap and no drag (audit ORTA 4)
    if (p.wasCanceled) {
      this.gesture.cancel();
      this.house.board.clearStroke();
      this.house.board.endCarry();
      this.stroke = [];
      return;
    }
    if (this.paused || this.phase !== 'play') return;
    const r = this.gesture.up(p.x, p.y);
    const h = this.house;
    h.board.clearStroke();
    this.stroke = [];
    if (!r) {
      h.board.endCarry();
      return;
    }
    if (r.kind === 'tap') this.move('tap', h.state.tap(r.cell));
    else if (r.kind === 'stroke') {
      this.move('stroke', h.state.stroke(r.cells, h.state.strokeModeAt(r.start)));
    } else {
      // the carried ghost lands, or glides back when the drop is refused (D72)
      this.move('drag', h.state.drag(r.from, r.to));
      h.board.endCarry();
    }
  }

  /**
   * Undo, or the free hint in two presses (D74): the first shows why the next step is forced and
   * counts the hint (its cooldown starts), the second does it; the player's own move to a ghost
   * in between completes it instead.
   */
  private press(name: ButtonName): void {
    if (this.paused || this.phase !== 'play') return;
    const h = this.house;
    if (name === 'undo') {
      this.move('undo', h.state.undo());
      return;
    }
    if (this.pending) {
      this.move('hint', h.state.hint());
      return;
    }
    if (!this.hints.ready) return;
    const reason = h.state.explainHint();
    if (!reason) return;
    this.hints.used();
    h.session.hinted();
    if (import.meta.env.DEV) h.log?.hinted();
    this.pending = reason;
    h.board.showReason(reason);
    this.updateHud();
    this.scheduleSave();
  }

  /** One move's events: the picture, the display, the counts, then the save or the win. */
  private move(kind: MoveKind, events: PlayEvent[]): void {
    const h = this.house;
    h.session.input();
    if (import.meta.env.DEV) h.log?.add(kind, events);
    if (this.pending && (kind === 'hint' || events.some((e) => GHOST_EVENTS.has(e.type)))) {
      this.pending = null;
      h.board.clearReason();
      this.updateHud();
    }
    if (events.length === 0) return;
    h.view.play(events);
    h.board.play(events);
    h.session.record(events);
    this.updateHud();
    if (events.some((e) => e.type === 'solved')) this.win();
    else if (!events.every((e) => e.type === 'nudged')) this.scheduleSave();
  }

  private updateHud(): void {
    const playing = this.phase === 'play';
    const h = this.house;
    this.hud.setEnabled('undo', playing && h.state.canUndo);
    this.hud.setEnabled(
      'hint',
      playing && !h.state.solved && (this.pending !== null || this.hints.ready),
    );
    this.hud.setCooldown(this.hints.share);
  }

  // ---- layout, pause, save ----------------------------------------------------------------------

  /**
   * A new design size (CLAUDE.md rule 5): the house on screen gets a new board, the buttons and
   * the dim follow. Phaser also sends RESIZE when the size has not changed (its own refresh after
   * a window resize), and that builds nothing (audit 2026-10-21, ORTA 5). A slide ends first; the
   * win beat plays on, on the new board, for its whole length.
   */
  private relayout(): void {
    const { width, height } = this.scale.gameSize;
    const laid = this.house.layout.size;
    if (width === laid.width && height === laid.height) return;
    this.dim.setSize(width, height);
    if (this.phase === 'demo') this.endDemo(false);
    if (this.phase === 'slide') this.finaleTo(FINALE_MS);
    // a next house built for the old size is built again when it slides in
    this.next?.board.destroy();
    this.next = null;
    const h = this.house;
    h.board.destroy();
    h.layout = computeLayout(this.scale.gameSize, h.model.n);
    h.board = this.build(h.view, h.layout, h.model);
    this.hud.layoutTo(h.layout);
  }

  private setPaused(p: boolean): void {
    if (this.paused === p) return;
    this.paused = p;
    this.dim.setVisible(p);
    if (p) {
      this.pausedAt = performance.now();
      this.tweens.pauseAll();
      this.time.paused = true;
      this.gesture.cancel();
      this.house.board.clearStroke();
      this.house.board.endCarry();
      this.hud.cancelPress();
      this.flushSave();
    } else {
      this.pausedMs += performance.now() - (this.pausedAt ?? performance.now());
      this.pausedAt = null;
      this.tweens.resumeAll();
      this.time.paused = false;
    }
  }

  private scheduleSave(): void {
    this.cancelSave();
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.writeSave();
    }, SAVE_DEBOUNCE_MS);
  }

  private cancelSave(): boolean {
    if (this.saveTimer === null) return false;
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    return true;
  }

  /**
   * Writes the house in progress at once: a pause, a hidden page, `pagehide`, the scene's end.
   * It writes with no change pending too, so the time thought since the last move is kept (audit
   * 2026-10-21, YÜKSEK 2); a house with no input yet has nothing to keep.
   */
  private flushSave(): void {
    this.cancelSave();
    if (this.phase === 'play' && this.house.session.started) this.writeSave();
  }

  /** The house in progress, only ever for the house to play (D50). */
  private writeSave(): void {
    if (this.phase !== 'play') return;
    const h = this.house;
    this.saving++;
    void recordHouseInProgress(h.session.inProgress(h.state)).finally(() => {
      this.saving--;
    });
  }
}
