import Phaser from 'phaser';
import { COLOR_PAGE, DIM_ALPHA, SAVE_DEBOUNCE_MS, SLIDE_MS, WIN_BEAT_MS } from '../../config';
import { parseHouse, type HouseModel } from '../../core/house';
import { PlayState, type PlayEvent } from '../../core/state';
import { playHouse } from '../../data/houses';
import { uninstallDebug } from '../../dev/debug';
import { HouseLog } from '../../dev/house-log';
import type { PlayHouse } from '../../gen/record';
import { getPlatform, markInteractive } from '../../platform/bridge';
import type { HouseInProgress } from '../../platform/storage';
import { BoardDisplay } from '../board';
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
  /**
   * The board when the house opened, every event list played since and the tally, for the dev
   * hooks: DEV builds only (audit 2026-10-21, DÜŞÜK 8).
   */
  log: HouseLog | null;
}

export type Phase = 'play' | 'win' | 'slide';

/**
 * Game (GDD §11 screen 2), the graybox loop of Epic 3: the house to play, taps and drags on its
 * cells, undo and the free hint, the win beat and the next house sliding in by itself, the save
 * after every change (debounced) and every house, the resume of a house in progress, the platform
 * pause (everything freezes under a dim cover; the waking tap never counts). The rules resolve in
 * src/core; this scene only plays their events back (CLAUDE.md).
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
  private slider: Phaser.Tweens.Tween | null = null;
  /** The win beat's end (the scene's, so a new board for a new screen size never cuts it). */
  private beat: Phaser.Time.TimerEvent | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private saving = 0;
  private interactiveAt: number | null = null;
  /** Boards built so far (dev state: a resize at the same size builds none). */
  private builds = 0;
  /** The house finished last (dev hooks: the e2e replays its moves). */
  private previous: HouseOnScreen | null = null;

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
    this.gesture = new Gesture((x, y) => cellAt(this.house.layout, x, y));
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
        });
      });
    }
    markInteractive(platform);
    this.interactiveAt = performance.now();
    // a house restored already solved never announces `solved`: play its win now (D49)
    if (this.house.state.solvedAtStart) this.win();
  }

  override update(_time: number, delta: number): void {
    if (this.paused) return;
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
      log: import.meta.env.DEV ? new HouseLog(view.snapshot()) : null,
    };
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
    h.board.celebrate();
    this.beat = this.time.delayedCall(WIN_BEAT_MS, () => {
      this.beat = null;
      this.slide();
    });
  }

  private slide(): void {
    if (this.phase !== 'win') return;
    this.beat?.remove(false);
    this.beat = null;
    this.phase = 'slide';
    const old = this.house;
    const width = this.scale.gameSize.width;
    const next = this.open(progress.house, width);
    this.house = next;
    this.slider = this.tweens.add({
      targets: [old.board.root, next.board.root],
      x: `-=${String(width)}`,
      duration: SLIDE_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.arrive(old);
      },
    });
  }

  private arrive(old: HouseOnScreen): void {
    old.board.destroy();
    this.slider = null;
    this.house.board.root.x = 0;
    this.phase = 'play';
    this.updateHud();
    if (this.house.state.solvedAtStart) this.win();
  }

  /**
   * A tap during the win beat skips it; during the slide, ends it (GDD §3.2). It does nothing
   * else, not even on a button (audit YÜKSEK 3).
   */
  private skip(): void {
    this.hud.cancelPress();
    if (this.phase === 'win') this.slide();
    else if (this.phase === 'slide') this.slider?.complete();
  }

  // ---- input ------------------------------------------------------------------------------------

  private pointerDown(p: Phaser.Input.Pointer): void {
    if (this.paused) return;
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
    if (!this.gesture.dragging || added.length === 0) return;
    this.stroke.push(...added);
    const h = this.house;
    h.board.showStroke(this.stroke, h.state.strokeModeAt(this.stroke[0] as number));
  }

  private pointerUp(p: Phaser.Input.Pointer): void {
    // a touch the system takes back (an edge swipe, a call) is no tap and no drag (audit ORTA 4)
    if (p.wasCanceled) {
      this.gesture.cancel();
      this.house.board.clearStroke();
      this.stroke = [];
      return;
    }
    if (this.paused || this.phase !== 'play') return;
    const r = this.gesture.up(p.x, p.y);
    const h = this.house;
    h.board.clearStroke();
    this.stroke = [];
    if (!r) return;
    if (r.kind === 'tap') this.move('tap', h.state.tap(r.cell));
    else this.move('stroke', h.state.stroke(r.cells, h.state.strokeModeAt(r.start)));
  }

  private press(name: ButtonName): void {
    if (this.paused || this.phase !== 'play') return;
    const h = this.house;
    if (name === 'undo') {
      this.move('undo', h.state.undo());
      return;
    }
    if (!this.hints.ready) return;
    const events = h.state.hint();
    if (events.length > 0) this.hints.used();
    this.move('hint', events);
  }

  /** One move's events: the picture, the display, the counts, then the save or the win. */
  private move(kind: MoveKind, events: PlayEvent[]): void {
    const h = this.house;
    h.session.input();
    if (import.meta.env.DEV) h.log?.add(kind, events);
    if (events.length === 0) return;
    h.view.play(events);
    h.board.play(events);
    h.session.record(events, kind);
    this.updateHud();
    if (events.some((e) => e.type === 'solved')) this.win();
    else if (!events.every((e) => e.type === 'nudged')) this.scheduleSave();
  }

  private updateHud(): void {
    const playing = this.phase === 'play';
    this.hud.setEnabled('undo', playing && this.house.state.canUndo);
    this.hud.setEnabled('hint', playing && this.hints.ready && !this.house.state.solved);
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
    if (this.phase === 'slide') this.slider?.complete();
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
      this.tweens.pauseAll();
      this.time.paused = true;
      this.gesture.cancel();
      this.house.board.clearStroke();
      this.hud.cancelPress();
      this.flushSave();
    } else {
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
