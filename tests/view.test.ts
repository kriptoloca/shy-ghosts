import { describe, expect, it } from 'vitest';
import { parseHouse, type HouseModel } from '../src/core/house';
import { PlayState, type PlayEvent } from '../src/core/state';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import { BoardView } from '../src/game/view';
import { roomLetter, visibleText } from '../src/game/visible';
import { Rng } from '../src/gen/rng';
import { bruteSees } from './support/brute';
import { randomHouse } from './support/houses';
import { RULE_WORDS } from './support/rule-words';
import { Screen, view } from './support/screen';

/**
 * The Game scene's board picture (src/game/view.ts): played back from the rules' events only, it
 * always ends equal to the rules, and the strict model screen (D52) accepts every event list it
 * plays. `visible()` (src/game/visible.ts) writes that picture out cell by cell.
 */
const HOUSES = 1000;
const MOVES_MAX = 40;
const TIMEOUT_MS = 120_000;

function randomMove(rng: Rng, s: PlayState): PlayEvent[] {
  const h = s.house;
  const x = rng.next();
  if (x < 0.55) return s.tap(rng.int(0, h.size - 1));
  if (x < 0.75) {
    const cells = Array.from({ length: rng.int(1, 6) }, () => rng.int(0, h.size - 1));
    return s.stroke(cells, s.strokeModeAt(cells[0] as number));
  }
  if (x < 0.9) return s.undo();
  return s.hint();
}

describe('BoardView', () => {
  it(
    'played back move by move, it equals the rules after every move (1,000 random houses)',
    () => {
      const rng = new Rng(20261021);
      let moves = 0;
      for (let k = 0; k < HOUSES; k++) {
        const s = new PlayState(parseHouse(randomHouse(rng, 2, 9)));
        const v = BoardView.of(s);
        const screen = new Screen(s.house, view(s));
        for (let m = rng.int(1, MOVES_MAX); m > 0; m--) {
          const events = randomMove(rng, s);
          v.play(events);
          screen.play(events);
          moves++;
          expect(v.snapshot()).toEqual(view(s));
        }
        expect(screen.problems).toEqual([]);
      }
      expect(moves).toBeGreaterThan(HOUSES * 10);
    },
    TIMEOUT_MS,
  );

  it('starts from a restored board, residents and marks included', () => {
    const h = parseHouse(TUTORIAL_HOUSES[2] as (typeof TUTORIAL_HOUSES)[number]);
    const s = PlayState.restore(h, { ghosts: [6], marks: [0, 13] });
    const v = BoardView.of(s);
    expect(v.snapshot()).toEqual(view(s));
    expect(v.isResident(3)).toBe(true);
    expect(v.isResident(6)).toBe(false);
  });

  it('sightPairs are the pairs of ghosts that see each other (brute force, 300 houses)', () => {
    const rng = new Rng(77);
    for (let k = 0; k < 300; k++) {
      const d = randomHouse(rng, 2, 9);
      const s = new PlayState(parseHouse(d));
      for (let m = 0; m < 12; m++) s.tap(rng.int(0, d.n * d.n - 1));
      const v = BoardView.of(s);
      const cells = s.ghostCells();
      const want: [number, number][] = [];
      for (const a of cells) {
        for (const b of cells) if (a < b && bruteSees(d.n, d.objects, a, b)) want.push([a, b]);
      }
      expect(v.sightPairs()).toEqual(want);
    }
  });
});

describe('visibleText names no rule (audit YÜKSEK 1)', () => {
  it('on 500 random boards with furniture, lamps, residents, marks and every ghost pose', () => {
    const rng = new Rng(5150);
    const poses = new Set<string>();
    for (let k = 0; k < 500; k++) {
      const s = new PlayState(parseHouse(randomHouse(rng, 2, 9)));
      const v = BoardView.of(s);
      for (let m = rng.int(0, 25); m > 0; m--) v.play(randomMove(rng, s));
      for (const st of v.ghosts.values()) poses.add(st);
      const text = visibleText(k + 1, v);
      expect(text.match(RULE_WORDS)?.[0] ?? null, text).toBeNull();
    }
    expect([...poses].sort()).toEqual(['calm', 'lit', 'seen']);
  });
});

describe('visibleText', () => {
  const house1 = (): { s: PlayState; v: BoardView } => {
    const s = new PlayState(parseHouse(TUTORIAL_HOUSES[0] as (typeof TUTORIAL_HOUSES)[number]));
    return { s, v: BoardView.of(s) };
  };

  it('house 1 with two ghosts in one row: walls, floor, poses, the dotted line', () => {
    const { s, v } = house1();
    v.play(s.tap(1)); // (0,1): it and the ghost in the nightcap at (0,0) share row 0
    expect(visibleText(1, v)).toBe(
      [
        'house 1 · 2 × 2 · 2 rooms · 0 of 2 rooms glowing · plain frame',
        'rooms and walls (a letter per room; | and --- are thick walls; cells as (row,col) from 0 at the top left):',
        '+---+---+',
        '| A | B |',
        '+   +   +',
        '| A | B |',
        '+---+---+',
        'floor (. plain, ~ warm wash, # dark block, @ sun icon):',
        '. .',
        '. .',
        'ghosts and dots (O eyes open, H both hands over the eyes, Q squinting under a hand; ' +
          'lowercase: wearing a nightcap; * small grey dot; . nothing):',
        'h H',
        '. .',
        'ghosts: (0,0) hands over the eyes, nightcap; (0,1) hands over the eyes',
        'dotted lines: (0,0) to (0,1)',
        'grey dots: none',
        'glowing rooms: none',
      ].join('\n'),
    );
    v.play(s.tap(3)); // the ghost glides to (1,1)
    const text = visibleText(1, v);
    expect(text).toContain('2 of 2 rooms glowing · warm frame');
    expect(text).toContain('o .\n. O');
    expect(text).toContain('ghosts: (0,0) eyes open, nightcap; (1,1) eyes open');
    expect(text).toContain('dotted lines: none');
    expect(text).toContain('glowing rooms: A, B');
  });

  it('dark blocks, a sun icon, its warm wash, a squinting ghost and grey dots', () => {
    const rows = ['..F..', '.....', 'L....', '...F.', '.....'];
    const h: HouseModel = parseHouse({
      n: 5,
      rooms: '0000011111222223333344444',
      objects: rows.join(''),
      givens: [],
      solution: [0, 5, 11, 15, 20],
    });
    const s = new PlayState(h);
    const v = BoardView.of(s);
    v.play(s.tap(12)); // (2,2), in the sun icon's wash
    v.play(s.stroke([4, 9], 'paint'));
    const text = visibleText(42, v);
    expect(text).toContain(
      [
        'floor (. plain, ~ warm wash, # dark block, @ sun icon):',
        '~ . # . .',
        '~ . . . .',
        '@ ~ ~ ~ ~',
        '~ . . # .',
        '~ . . . .',
      ].join('\n'),
    );
    expect(text).toContain('. . . . *\n. . . . *\n. . Q . .');
    expect(text).toContain('ghosts: (2,2) squinting under a hand');
    expect(text).toContain('grey dots: (0,4) (1,4)');
  });

  it('room letters run A, B, … by room id', () => {
    expect([0, 1, 25, 26].map(roomLetter)).toEqual(['A', 'B', 'Z', '0']);
  });
});
