import { describe, expect, it } from 'vitest';
import { parseHouse, type HouseData } from '../src/core/house';
import { PlayState, type PlayEvent } from '../src/core/state';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import { Screen, view } from './support/screen';

/**
 * The model screen is the reference Epic 3's e2e compares the scene with, so it must reject the
 * mistakes a scene or the rules could make (audit 2026-10-21, ORTA 2). Each case corrupts a
 * correct event list the rules produced; the screen must flag it.
 */
const H3 = parseHouse(TUTORIAL_HOUSES[2] as HouseData); // A 0, C 1, B 2, D 3; given (0,3) = 3

function problemsOf(
  setup: (s: PlayState) => void,
  corrupt: (ev: PlayEvent[]) => PlayEvent[],
  move: (s: PlayState) => PlayEvent[],
): string[] {
  const s = new PlayState(H3);
  setup(s);
  const screen = new Screen(H3, view(s));
  screen.play(corrupt(move(s)));
  return screen.problems;
}

const same = (ev: PlayEvent[]): PlayEvent[] => ev;

/** The screen reported a problem containing `why`. */
function flags(problems: string[], why: string): boolean {
  return problems.some((p) => p.includes(why));
}

describe('the model screen is strict', () => {
  it('accepts what the rules emit', () => {
    expect(
      problemsOf(
        (s) => s.tap(4),
        same,
        (s) => s.tap(8),
      ),
    ).toEqual([]);
    expect(
      problemsOf(
        (s) => s.stroke([9], 'paint'),
        same,
        (s) => s.tap(9),
      ),
    ).toEqual([]);
  });

  it('a relocated ghost must get its state even when it did not change', () => {
    const drop = (ev: PlayEvent[]): PlayEvent[] => ev.filter((e) => e.type !== 'status');
    const problems = problemsOf(
      (s) => s.tap(4),
      drop,
      (s) => s.tap(8),
    );
    expect(flags(problems, 'no state for the ghost that came to 8')).toBe(true);
  });

  it('a ghost whose state did not change and that did not move gets no state', () => {
    // tap (1,0): placed, its state, its room lit; the given at (0,3) did not change
    const extra = (ev: PlayEvent[]): PlayEvent[] => [
      ev[0] as PlayEvent,
      { type: 'status', cell: 3, from: 'calm', to: 'calm', by: [], lamps: [] },
      ...ev.slice(1),
    ];
    const problems = problemsOf(
      () => undefined,
      extra,
      (s) => s.tap(4),
    );
    expect(problems).toHaveLength(1);
    expect(flags(problems, 'an unchanged state for 3')).toBe(true);
  });

  it('the mark under a new ghost is cleared right after it lands, never before', () => {
    const swap = (ev: PlayEvent[]): PlayEvent[] => [
      ev[1] as PlayEvent,
      ev[0] as PlayEvent,
      ...ev.slice(2),
    ];
    const problems = problemsOf(
      (s) => s.stroke([9], 'paint'),
      swap,
      (s) => s.tap(9),
    );
    expect(flags(problems, 'a stroke with other events')).toBe(true);
  });

  it('only furniture, a lamp or a given nudges', () => {
    // a tap on (1,1), an empty cell of the given's room: the given nudges, not the tapped cell
    const wrong = (): PlayEvent[] => [{ type: 'nudged', cell: 5 }];
    const problems = problemsOf(
      () => undefined,
      wrong,
      (s) => s.tap(5),
    );
    expect(flags(problems, 'nudged 5, which is neither furniture, a lamp nor a given')).toBe(true);
    expect(
      problemsOf(
        () => undefined,
        same,
        (s) => s.tap(5),
      ),
    ).toEqual([]);
  });

  it('a ghost leaves from the room it lies in', () => {
    const wrongRoom = (ev: PlayEvent[]): PlayEvent[] =>
      ev.map((e) => (e.type === 'removed' ? { ...e, room: 0 } : e));
    const problems = problemsOf(
      (s) => s.tap(9),
      wrongRoom,
      (s) => s.tap(9),
    );
    expect(flags(problems, 'removed 9 from room 0')).toBe(true);
  });

  it('a mark change must belong to a stroke or follow the move that causes it', () => {
    const stray = (ev: PlayEvent[]): PlayEvent[] => [
      ...ev.slice(0, 1),
      { type: 'marked', cells: [12], on: true },
      ...ev.slice(1),
    ];
    const problems = problemsOf(
      () => undefined,
      stray,
      (s) => s.tap(4),
    );
    expect(flags(problems, 'mark 12 true after placed')).toBe(true);
  });

  it('a win must be announced, and the lit rooms must match the calm ghosts', () => {
    const silent = (ev: PlayEvent[]): PlayEvent[] => ev.filter((e) => e.type !== 'solved');
    const solve = (s: PlayState): void => {
      s.tap(6);
      s.tap(8);
    };
    expect(
      flags(
        problemsOf(solve, silent, (s) => s.tap(13)),
        'a win without `solved`',
      ),
    ).toBe(true);
    const dark = (ev: PlayEvent[]): PlayEvent[] => ev.filter((e) => e.type !== 'settled');
    const problems = problemsOf(
      () => undefined,
      dark,
      (s) => s.tap(4),
    );
    expect(flags(problems, 'room 0 lit')).toBe(true);
  });
});
