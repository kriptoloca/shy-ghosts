import { describe, expect, it } from 'vitest';
import { parseHouse } from '../src/core/house';
import { PlayState } from '../src/core/state';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import { HouseLog } from '../src/dev/house-log';
import { BoardView } from '../src/game/view';

/**
 * The dev record of a house (src/dev/house-log.ts, D62, D66): the event lists for the e2e replay
 * and the tally for the playtester's logs, where Gate B's B1 counts shivering placements.
 */
function house1(): { s: PlayState; log: HouseLog } {
  const s = new PlayState(parseHouse(TUTORIAL_HOUSES[0] as (typeof TUTORIAL_HOUSES)[number]));
  return { s, log: new HouseLog(BoardView.of(s).snapshot()) };
}

describe('HouseLog', () => {
  it('counts one shivering placement per move, however many ghosts shiver (audit ORTA 6)', () => {
    const { s, log } = house1();
    // (0,1) shares row 0 with the ghost in the nightcap at (0,0): both shiver
    const events = s.tap(1);
    expect(events.filter((e) => e.type === 'status' && e.to === 'seen')).toHaveLength(2);
    log.add('tap', events);
    expect(log.tally.shivers).toBe(1);
    log.add('undo', s.undo()); // an undo never counts as a placement
    log.add('tap', s.tap(1)); // the same conflict again: a second shivering placement
    expect(log.tally.shivers).toBe(2);
    log.add('tap', s.tap(3)); // the ghost glides away: the conflict ends, nothing new shivers
    expect(log.tally.shivers).toBe(2);
  });

  it('keeps every event list that changed something and counts the moves by kind', () => {
    const { s, log } = house1();
    log.add('tap', s.tap(0)); // the given: a nudge
    log.add('tap', s.tap(1));
    log.add('tap', s.tap(3)); // relocated to (1,1): solved
    expect(log.moves).toHaveLength(3);
    expect(log.tally).toMatchObject({ taps: 3, nudges: 1, placements: 1, relocations: 1 });
    expect(log.start).toEqual({
      ghosts: [[0, 'calm']],
      marks: [],
      settled: [0],
      solved: false,
    });
  });

  it('counts a stroke and its marks, and an undo only when it undid something', () => {
    const { s, log } = house1();
    log.add('undo', s.undo()); // nothing to undo
    log.add('stroke', s.stroke([1, 3], 'paint'));
    log.add('stroke', s.stroke([1], 'erase'));
    log.add('undo', s.undo());
    expect(log.tally).toMatchObject({ strokes: 2, marked: 2, erased: 1, undos: 1 });
    expect(log.moves).toHaveLength(3);
  });

  it('counts a hint at its first press (D74), and a drag with the ghost it carried (D72)', () => {
    const { s, log } = house1();
    log.hinted(); // the reason shown
    log.add('hint', s.hint()); // the second press places the ghost: still one hint
    expect(log.tally.hints).toBe(1);
    // house 2 (ABB / ABB / CCC, the resident at (0,1)): a ghost in room A carried down its
    // column, then into room C, which holds none, then toward the resident's room
    const two = new PlayState(parseHouse(TUTORIAL_HOUSES[1] as (typeof TUTORIAL_HOUSES)[number]));
    const log2 = new HouseLog(BoardView.of(two).snapshot());
    log2.add('tap', two.tap(0));
    log2.add('drag', two.drag(0, 3)); // within A: a relocation
    log2.add('drag', two.drag(3, 6)); // into C: moved
    log2.add('drag', two.drag(6, 4)); // into B, the resident's room: back, with a nudge
    expect(log2.tally).toMatchObject({ drags: 3, relocations: 1, carried: 1, nudges: 1 });
    expect(log2.moves).toHaveLength(4);
  });
});
