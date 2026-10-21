import Phaser from 'phaser';
import {
  COLOR_PAGE,
  DEMO_MARK_HOUSE,
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
import { demoFor, type DemoScript } from '../demo';
import { makeGrayboxTextures } from '../graybox';
import { Gesture } from '../gesture';
import { Hud, type ButtonName } from '../hud';
import { cellAt, computeLayout, type Layout } from '../layout';
import { roomStyles } from '../look';
import { advanceHouse, progress, recordHouseInProgress } from '../progress';
import { ResumeGrace, bindPauseGrace } from '../resume-grace';
import { DemoClock, HintClock, HintFlow, HouseSession, type MoveKind } from '../session';
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
  /** The house came from the save (a resume): its demonstration is not shown first (D70, D83). */
  resumed: boolean;
  /** Its teaching demonstration (D83), or null. */
  demo: DemoScript | null;
  /**
   * The board when the house opened, every event list played since and the tally, for the dev
   * hooks: DEV builds only (audit 2026-10-21, DÜŞÜK 8).
   */
  log: HouseLog | null;
}

export type Phase = 'demo' | 'play' | 'win' | 'slide';

/** The finale from the solve to the next house: the beat, then the slide (D73). */
const FINALE_MS = WIN_BEAT_MS + SLIDE_MS;

/** The dev hooks' record of the scene (DEV builds only; round 1's code audit, DÜŞÜK 9). */
interface DevState {
  /** Boards built so far (a resize at the same size builds none). */
  builds: number;
  /**
   * The last finale: its beat on the scene's clock, the whole of it on the wall clock, how far
   * the clock moved in the frame the slide began, and how many ghosts still played a settle's
   * motion as the ghosts began to hop.
   */
  lastFinale: { beatMs: number; wallMs: number; stepMs: number; settling: number | null } | null;
  /** How far the last beat ran before the slide, on the scene's clock (a tap cuts it short). */
  slidAt: number;
  /** The finale's clock at its last step, and how far it moved in the step the slide began. */
  stepAt: number;
  slideStepMs: number;
  /** Demonstrations started since the Game began, replays included (D70, D83). */
  demos: number;
  /** The house on screen: when it appeared, when its input opened, whether a tap skipped it. */
  shownAt: number | null;
  playAt: number | null;
  demoSkipped: boolean;
}

/**
 * Game (GDD §11 screen 2), the graybox loop of Epic 3 with Gate B's round-1 and round-2 changes:
 * the house to play, its teaching demonstration (D70, D83: as it appears, unless resumed, and
 * again after DEMO_IDLE_MS without input until the first placement; a tap skips it, never in its
 * first DEMO_SKIP_FROM_MS), taps on its cells, drags that paint marks or carry a ghost (D72), undo
 * and the free two-press hint (the reason, which stays until the next move, then the step; D74,
 * D86), the progress dots (D75), the finale and the next house sliding in by itself (D73, D84; a
 * tap skips it from WIN_SKIP_FROM_MS), the save after every change (debounced) and every house,
 * the resume of a house in progress, the platform pause (everything freezes under a dim cover,
 * the tween clock included; the waking tap never counts). The rules resolve in src/core; this
 * scene only plays their events back (CLAUDE.md).
 */
export class GameScene extends Phaser.Scene {
  private readonly grace = new ResumeGrace(this);
  private readonly hints = new HintClock();
  /** The hint's reason on the board, waiting for its second press (D74, D86). */
  private readonly hintFlow = new HintFlow<HintExplain>();
  /** The house's demonstration: replays and the early-tap guard (D83). */
  private readonly demoClock = new DemoClock();
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
  /** The house finished last (dev hooks: the e2e replays its moves). */
  private previous: HouseOnScreen | null = null;
  /** The next house, built hidden during the finale's hit stop so the slide never stutters. */
  private next: HouseOnScreen | null = null;
  /** The teaching demonstration's end, on the tween clock like its motions (D70). */
  private demoEnd: Phaser.Tweens.Tween | null = null;
  /**
   * After a platform pause the tween clock stays stopped (timeScale 0) until its first step, which
   * would otherwise credit up to 500 ms of the pause (round 1's code audit, ORTA 3): the tween
   * manager's time when the pause ended.
   */
  private thawFrom: number | null = null;
  /** The dev hooks' record (null in production builds, which keep none). */
  private readonly dev: DevState | null = import.meta.env.DEV
    ? {
        builds: 0,
        lastFinale: null,
        slidAt: 0,
        stepAt: 0,
        slideStepMs: 0,
        demos: 0,
        shownAt: null,
        playAt: null,
        demoSkipped: false,
      }
    : null;

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
          builds: () => this.dev?.builds ?? 0,
          dimmed: () => this.dim.visible,
          effects: () => this.house.board.effects(),
          previous: () => this.previous,
          beatMs: () => (this.phase === 'win' ? this.finaleAt() : null),
          finale: () => this.dev?.lastFinale ?? null,
          demos: () => this.dev?.demos ?? 0,
          shownAt: () => this.dev?.shownAt ?? null,
          playAt: () => this.dev?.playAt ?? null,
          demoSkipped: () => this.dev?.demoSkipped ?? false,
          hintReason: () => this.hintFlow.pending,
          reasonShown: () => this.house.board.showingReason,
          timeShown: () => this.house.board.shownTime(),
          tweenScale: () => this.tweens.timeScale,
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
    // the tween manager stepped since the resume, at timeScale 0: the pause is not credited
    if (this.thawFrom !== null && this.tweens.time !== this.thawFrom) {
      this.thawFrom = null;
      this.tweens.timeScale = 1;
    }
    if (this.phase === 'win' || this.phase === 'slide') this.finaleStep();
    if (this.phase === 'play') {
      this.house.session.tick(delta);
      // input in hand is no idle time, and a demonstration never plays again over it or over a
      // hint's reason (round 2's code audit, YÜKSEK 1, ORTA 1)
      const held = this.inputHeld();
      if (held) this.demoClock.input();
      else this.demoClock.idle(delta);
      if (this.demoClock.due(held || this.hintFlow.pending !== null)) this.playDemo(true);
    } else if (this.phase === 'demo') this.demoClock.run(delta, this.game.loop.frame);
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
      demo: demoFor(id, model),
      log: import.meta.env.DEV ? new HouseLog(view.snapshot()) : null,
    };
  }

  /**
   * The house on screen opens: first its teaching demonstration, unless it was resumed (D70,
   * D83); input stays closed until it ends or a tap skips it. It plays again after DEMO_IDLE_MS
   * without input until the house's first placement (house 3: its first mark), a resume included.
   */
  private begin(): void {
    const h = this.house;
    if (import.meta.env.DEV && this.dev) {
      this.dev.shownAt = performance.now();
      this.dev.playAt = null;
      this.dev.demoSkipped = false;
    }
    this.demoClock.reset(h.demo !== null && !this.playedInto(h));
    if (h.demo && !h.resumed) this.playDemo(false);
    else {
      this.phase = 'play';
      if (import.meta.env.DEV && this.dev) this.dev.playAt = this.dev.shownAt;
    }
    this.updateHud();
  }

  /** The house has its first placement (house 3: its first mark), so its demonstration rests. */
  private playedInto(h: HouseOnScreen): boolean {
    if (h.id === DEMO_MARK_HOUSE) return h.state.markedCells().length > 0;
    return h.state.ghostCells().some((c) => !h.model.givens.includes(c));
  }

  /**
   * A pointer or a button is down: a press, a drag, a carry or a stroke in hand. Read every frame
   * in play, so it allocates nothing (round 2's re-audit, DÜŞÜK).
   */
  private inputHeld(): boolean {
    if (this.gesture.active || this.hud.pressing) return true;
    for (const p of this.input.manager.pointers) if (p.isDown) return true;
    return false;
  }

  /**
   * The demonstration plays, as the house appears or again after idle time (D83). Whatever input
   * was in hand ends, as a platform pause ends it (round 2's code audit, YÜKSEK 1).
   */
  private playDemo(replay: boolean): void {
    const h = this.house;
    if (!h.demo) return;
    this.phase = 'demo';
    this.demoClock.started(replay, this.game.loop.frame);
    if (import.meta.env.DEV && this.dev) this.dev.demos++;
    this.gesture.cancel();
    this.stroke = [];
    h.board.clearStroke();
    h.board.endCarry();
    this.hud.cancelPress();
    h.board.demo(h.demo);
    this.demoEnd = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: h.demo.ms,
      onComplete: () => {
        this.demoEnd = null;
        this.endDemo(false);
      },
    });
    this.updateHud();
  }

  /** The demonstration ends by itself, or a tap skipped it: input opens (D70). */
  private endDemo(skipped: boolean): void {
    if (this.phase !== 'demo') return;
    this.demoEnd?.stop();
    this.demoEnd = null;
    this.house.board.endDemo();
    this.phase = 'play';
    this.demoClock.input();
    if (import.meta.env.DEV && this.dev) {
      this.dev.demoSkipped = skipped;
      this.dev.playAt = performance.now();
    }
    this.updateHud();
  }

  private build(view: BoardView, layout: Layout, model: HouseModel): BoardDisplay {
    if (import.meta.env.DEV && this.dev) this.dev.builds++;
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
    if (import.meta.env.DEV && this.dev) this.dev.stepAt = 0;
    // a house restored solved under a platform pause (D49) starts its finale paused
    this.pausedAt = this.paused ? this.wonAt : null;
    this.hintFlow.clear();
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
    if (import.meta.env.DEV && this.dev) this.dev.stepAt = at;
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
    // how far the beat ran on the scene's clock, as measured now (a tap's skip left out), and how
    // far the clock moved in this step
    if (import.meta.env.DEV && this.dev) {
      const at = this.finaleAt();
      this.dev.slidAt = at - this.skipped;
      this.dev.slideStepMs = at - this.dev.stepAt;
    }
    this.phase = 'slide';
    this.leaving = this.house;
    const next = this.next ?? this.open(progress.house, this.scale.gameSize.width);
    this.next = null;
    next.board.root.setVisible(true).setX(this.scale.gameSize.width);
    this.house = next;
  }

  private arrive(): void {
    // measured as the slide ends, before the old board is freed
    if (import.meta.env.DEV && this.dev) {
      this.dev.lastFinale = {
        beatMs: this.dev.slidAt,
        wallMs: performance.now() - this.wonAt,
        stepMs: this.dev.slideStepMs,
        settling: this.leaving?.board.hopOverlap() ?? null,
      };
    }
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
      if (this.finaleAt() < WIN_SKIP_FROM_MS) return;
      this.finaleTo(WIN_BEAT_MS);
    } else if (this.phase === 'slide') this.finaleTo(FINALE_MS);
  }

  // ---- input ------------------------------------------------------------------------------------

  private pointerDown(p: Phaser.Input.Pointer): void {
    if (this.paused) return;
    if (this.phase === 'demo') {
      // a tap skips the demonstration; it is no game tap and no press (D70); one in its first
      // DEMO_SKIP_FROM_MS does nothing at all (a tap left over from the finale; round 1's code
      // audit, ORTA 2)
      this.hud.cancelPress();
      if (this.demoClock.skippable()) this.endDemo(true);
      return;
    }
    if (this.phase !== 'play') {
      this.skip();
      return;
    }
    this.demoClock.input();
    this.gesture.down(p.x, p.y);
    this.stroke = [];
    if (this.gesture.active) this.house.session.input();
  }

  private pointerMove(p: Phaser.Input.Pointer): void {
    if (this.paused || this.phase !== 'play' || !this.gesture.active || !p.isDown) return;
    this.demoClock.input();
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
   * Undo, or the free hint in two presses (D74, D86): the first shows why the next step is forced
   * and counts the hint (its cooldown starts); the reason stays until the next move, which takes
   * it away, or the second press, which does the step.
   */
  private press(name: ButtonName): void {
    if (this.paused || this.phase !== 'play') return;
    const h = this.house;
    this.demoClock.input();
    if (import.meta.env.DEV) h.log?.pressed(name);
    if (name === 'undo') {
      this.move('undo', h.state.undo());
      return;
    }
    const r = this.hintFlow.press(this.hints.ready, () => h.state.explainHint());
    if (r.kind === 'complete') {
      this.move('hint', h.state.hint());
      return;
    }
    if (r.kind === 'none') return;
    this.hints.used();
    h.session.hinted();
    if (import.meta.env.DEV) h.log?.hinted();
    h.board.showReason(r.reason);
    this.updateHud();
    this.scheduleSave();
  }

  /** One move's events: the picture, the display, the counts, then the save or the win. */
  private move(kind: MoveKind, events: PlayEvent[]): void {
    const h = this.house;
    h.session.input();
    if (import.meta.env.DEV) h.log?.add(kind, events);
    // the player's next move, or the second press, takes the hint's reason away (D86), however
    // little of it shows at that moment (round 2's code audit, DÜŞÜK 2: a pulse-only reason)
    const pending = this.hintFlow.move();
    if (kind === 'hint' || pending) {
      h.board.clearReason();
      this.updateHud();
    }
    const first =
      h.id === DEMO_MARK_HOUSE
        ? events.some((e) => e.type === 'marked' && e.on)
        : events.some((e) => e.type === 'placed' || e.type === 'moved');
    if (first) this.demoClock.placed();
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
      playing && !h.state.solved && (this.hintFlow.pending !== null || this.hints.ready),
    );
    this.hud.setCooldown(this.hints.share);
  }

  // ---- layout, pause, save ----------------------------------------------------------------------

  /**
   * A new design size (CLAUDE.md rule 5): the house on screen gets a new board, the buttons and
   * the dim follow. Phaser also sends RESIZE when the size has not changed (its own refresh after
   * a window resize), and that builds nothing (audit 2026-10-21, ORTA 5). A slide ends first, then
   * a demonstration (the slide's end may have started one; round 1's code audit, DÜŞÜK 6); the
   * win beat plays on, on the new board, for its whole length, its solve time shown; a hint's
   * reason stays.
   */
  private relayout(): void {
    const { width, height } = this.scale.gameSize;
    const laid = this.house.layout.size;
    if (width === laid.width && height === laid.height) return;
    this.dim.setSize(width, height);
    if (this.phase === 'slide') this.finaleTo(FINALE_MS);
    if (this.phase === 'demo') this.endDemo(false);
    // a next house built for the old size is built again when it slides in
    this.next?.board.destroy();
    this.next = null;
    const h = this.house;
    h.board.destroy();
    h.layout = computeLayout(this.scale.gameSize, h.model.n);
    h.board = this.build(h.view, h.layout, h.model);
    if (this.phase === 'win') h.board.showTime(h.session.seconds);
    const reason = this.hintFlow.pending;
    if (reason) h.board.showReason(reason, false);
    this.hud.layoutTo(h.layout);
  }

  private setPaused(p: boolean): void {
    if (this.paused === p) return;
    this.paused = p;
    this.dim.setVisible(p);
    if (p) {
      this.pausedAt = performance.now();
      this.tweens.pauseAll();
      // stays 0 until the first tween step after the resume (round 1's code audit, ORTA 3: no
      // credit for the pause)
      this.tweens.timeScale = 0;
      this.thawFrom = null;
      this.time.paused = true;
      this.gesture.cancel();
      this.house.board.clearStroke();
      this.house.board.endCarry();
      this.hud.cancelPress();
      this.flushSave();
    } else {
      this.pausedMs += performance.now() - (this.pausedAt ?? performance.now());
      this.pausedAt = null;
      this.thawFrom = this.tweens.time;
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
    if (this.inPlay() && this.house.session.started) this.writeSave();
  }

  /**
   * The house on screen is being played: between moves, or while its demonstration plays again
   * (a pause during a replay saves too; round 2's code audit, DÜŞÜK 1).
   */
  private inPlay(): boolean {
    return this.phase === 'play' || this.phase === 'demo';
  }

  /** The house in progress, only ever for the house to play (D50). */
  private writeSave(): void {
    if (!this.inPlay()) return;
    const h = this.house;
    this.saving++;
    void recordHouseInProgress(h.session.inProgress(h.state)).finally(() => {
      this.saving--;
    });
  }
}
