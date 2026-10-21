import { describe, expect, it } from 'vitest';
import { HINT_COOLDOWN_S } from '../src/config';
import { parseHouse } from '../src/core/house';
import { PlayState } from '../src/core/state';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import { HintClock, HouseSession } from '../src/game/session';

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
