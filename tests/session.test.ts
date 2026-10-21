import { describe, expect, it } from 'vitest';
import { DEMO_IDLE_MS, DEMO_REPLAYS, DEMO_SKIP_FROM_MS, HINT_COOLDOWN_S } from '../src/config';
import { parseHouse } from '../src/core/house';
import { PlayState } from '../src/core/state';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import { DemoClock, HintClock, HintFlow, HouseSession } from '../src/game/session';

/** The house in progress (GDD §3.2, §9, §14): solve time, moves, hints, conflicts; the hint clock (D32). */
const house3 = (): PlayState =>
  new PlayState(parseHouse(TUTORIAL_HOUSES[2] as (typeof TUTORIAL_HOUSES)[number]));

describe('HouseSession', () => {
  it('the solve time runs from the first input and stops at the win', () => {
    const s = new HouseSession(3);
    s.tick(5000);
    expect(s.seconds).toBe(0); // no input yet
    s.input();
    s.tick(1500);
    s.tick(250);
    expect(s.seconds).toBeCloseTo(1.75, 9);
    s.finish();
    s.tick(1000);
    expect(s.seconds).toBeCloseTo(1.75, 9);
  });

  it('counts moves, hints (once, at the first press) and the moves that make a ghost seen; a nudge or nothing is no move', () => {
    // house 3: ACCC / ACBB / ADDB / DDDB, the resident at (0,3)
    const st = house3();
    const s = new HouseSession(3);
    s.record(st.tap(8)); // (2,0) in room A: calm
    s.record(st.tap(9)); // (2,1) in room D, same row: both seen, a conflict
    s.record(st.tap(3)); // the resident: a nudge
    s.record(st.tap(2)); // an empty cell of the resident's room: a nudge
    s.record(st.stroke([5, 6], 'paint'));
    s.record(st.undo());
    s.hinted(); // the hint's first press shows the wrong ghost at (2,1) (D74)
    s.record(st.hint()); // the second press: it floats away, a move of the same hint
    s.record([]);
    expect({ moves: s.moves, hints: s.hints, conflicts: s.conflicts }).toEqual({
      moves: 5,
      hints: 1,
      conflicts: 1,
    });
  });

  it('writes the house in progress for the save, and starts again from it', () => {
    const st = house3();
    const s = new HouseSession(3);
    s.input();
    s.record(st.tap(6));
    s.record(st.stroke([0, 4], 'paint'));
    s.tick(2500);
    const saved = s.inProgress(st);
    expect(saved).toEqual({
      id: 3,
      ghosts: [6],
      marks: [0, 4],
      seconds: 2.5,
      hints: 0,
      moves: 2,
      conflicts: 0,
    });
    const again = new HouseSession(3, saved);
    expect([again.seconds, again.moves, again.hints, again.conflicts]).toEqual([2.5, 2, 0, 0]);
    again.tick(500); // a restored house has had its first input: the time runs on
    expect(again.seconds).toBeCloseTo(3, 9);
  });

  it('a save for another house is not taken', () => {
    const again = new HouseSession(4, {
      id: 3,
      ghosts: [],
      marks: [],
      seconds: 9,
      hints: 1,
      moves: 1,
      conflicts: 0,
    });
    expect([again.seconds, again.moves, again.hints]).toEqual([0, 0, 0]);
  });
});

describe('HintClock (the free hint, D32)', () => {
  it('is ready at first, then waits 90 s of play after each hint', () => {
    const h = new HintClock();
    expect(h.ready).toBe(true);
    h.used();
    expect(h.ready).toBe(false);
    expect(h.remaining).toBe(HINT_COOLDOWN_S);
    h.tick((HINT_COOLDOWN_S - 1) * 1000);
    expect(h.ready).toBe(false);
    expect(h.share).toBeCloseTo(1 / HINT_COOLDOWN_S, 9);
    h.tick(1000);
    expect(h.ready).toBe(true);
    expect(h.share).toBe(0);
  });
});

describe('HintFlow: the reason stays until the next move (D74, D86)', () => {
  const reason = { room: 2 };

  it('the first press shows the reason; it stays however long the player looks', () => {
    const f = new HintFlow<typeof reason>();
    expect(f.press(true, () => reason)).toEqual({ kind: 'explain', reason });
    expect(f.pending).toBe(reason);
    // no clock: only a move or the second press takes it away
    expect(f.pending).toBe(reason);
  });

  it('the second press does the step and ends it', () => {
    const f = new HintFlow<typeof reason>();
    f.press(true, () => reason);
    expect(f.press(false, () => reason)).toEqual({ kind: 'complete' });
    expect(f.pending).toBeNull();
  });

  it('any move of the player (a tap, a drag, a stroke, an undo) takes the reason away', () => {
    for (const kind of ['tap', 'drag', 'stroke', 'undo'] as const) {
      const f = new HintFlow<typeof reason>();
      f.press(true, () => reason);
      expect([kind, f.move()]).toEqual([kind, true]);
      expect(f.pending).toBeNull();
      expect(f.move()).toBe(false);
    }
  });

  it('a press while the hint cools down, or with nothing to explain, does nothing', () => {
    const f = new HintFlow<typeof reason>();
    expect(f.press(false, () => reason)).toEqual({ kind: 'none' });
    expect(f.press(true, () => null)).toEqual({ kind: 'none' });
    expect(f.pending).toBeNull();
  });
});

describe('DemoClock: when a demonstration plays again, and when a tap may skip it (D83)', () => {
  it('replays after DEMO_IDLE_MS without input, at most DEMO_REPLAYS times', () => {
    const d = new DemoClock();
    d.reset(true);
    d.started(false, 0); // the first play, as the house appears
    let replays = 0;
    for (let k = 0; k < 10; k++) {
      d.idle(DEMO_IDLE_MS - 1);
      expect(d.due(false)).toBe(false);
      d.idle(1);
      if (d.due(false)) {
        replays++;
        d.started(true, k + 1);
      }
    }
    expect(replays).toBe(DEMO_REPLAYS);
  });

  it('input starts the idle time again; the first placement ends the replays', () => {
    const d = new DemoClock();
    d.reset(true);
    d.idle(DEMO_IDLE_MS - 1);
    d.input();
    d.idle(DEMO_IDLE_MS - 1);
    expect(d.due(false)).toBe(false);
    d.placed();
    d.idle(10 * DEMO_IDLE_MS);
    expect(d.due(false)).toBe(false);
  });

  it('a house without a demonstration, or already played into, never replays', () => {
    const d = new DemoClock();
    d.reset(false);
    d.idle(10 * DEMO_IDLE_MS);
    expect(d.due(false)).toBe(false);
  });

  it("never while the player holds a pointer or a button down or reads a hint's reason (round 2's code audit, YÜKSEK 1, ORTA 1)", () => {
    const d = new DemoClock();
    d.reset(true);
    d.idle(DEMO_IDLE_MS);
    expect(d.due(true)).toBe(false);
    expect(d.due(false)).toBe(true);
  });

  it('a tap in the first DEMO_SKIP_FROM_MS of a first play does nothing; later it skips', () => {
    const d = new DemoClock();
    d.reset(true);
    d.started(false, 0);
    expect(d.skippable()).toBe(false);
    d.run(DEMO_SKIP_FROM_MS - 1, 1);
    expect(d.skippable()).toBe(false);
    d.run(1, 2);
    expect(d.skippable()).toBe(true);
  });

  it("the frame a first play starts in counts nothing toward its DEMO_SKIP_FROM_MS (round 2's code audit, DÜŞÜK 3)", () => {
    const d = new DemoClock();
    d.reset(true);
    // the slide ends and the next house's demonstration starts in frame 7
    d.started(false, 7);
    d.run(40, 7);
    d.run(DEMO_SKIP_FROM_MS - 1, 8);
    expect(d.skippable()).toBe(false);
    d.run(1, 9);
    expect(d.skippable()).toBe(true);
  });

  it("a replay has no dead zone: a tap skips it at once (round 2's code audit, DÜŞÜK 3)", () => {
    const d = new DemoClock();
    d.reset(true);
    d.started(false, 0);
    d.run(DEMO_SKIP_FROM_MS, 1);
    d.idle(DEMO_IDLE_MS);
    d.started(true, 50);
    expect(d.skippable()).toBe(true);
  });
});
