import { describe, expect, it } from 'vitest';
import {
  COLOR_BADGE,
  COLOR_HATCH,
  COLOR_HINT_DOT,
  COLOR_MARK,
  COLOR_SETTLED_RING,
  COLOR_SOLVED_FRAME,
  COLOR_WALL,
} from '../src/config';
import { parseHouse, type HouseModel } from '../src/core/house';
import { PlayState, type PlayEvent } from '../src/core/state';
import { TUTORIAL_HOUSES } from '../src/data/tutorial';
import type { MoveKind } from '../src/game/session';
import type { ReasonPicture } from '../src/game/reason';
import { BoardView } from '../src/game/view';
import { roomLetter, visibleText } from '../src/game/visible';
import { Rng } from '../src/gen/rng';
import { bruteSees } from './support/brute';
import { randomHouse } from './support/houses';
import { hueAngle, lightness, rgb } from './support/colour';
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

/** A random move, with the kind the player asked for (the model screen checks nudges by it). */
function randomMove(rng: Rng, s: PlayState): { kind: MoveKind; events: PlayEvent[] } {
  const h = s.house;
  const x = rng.next();
  if (x < 0.55) return { kind: 'tap', events: s.tap(rng.int(0, h.size - 1)) };
  if (x < 0.75) {
    const cells = Array.from({ length: rng.int(1, 6) }, () => rng.int(0, h.size - 1));
    return { kind: 'stroke', events: s.stroke(cells, s.strokeModeAt(cells[0] as number)) };
  }
  if (x < 0.85) return { kind: 'undo', events: s.undo() };
  if (x < 0.93) {
    // a ghost carried somewhere (D72)
    const ghosts = s.ghostCells();
    const from = ghosts[rng.int(0, Math.max(0, ghosts.length - 1))] ?? 0;
    return { kind: 'drag', events: s.drag(from, rng.int(-1, h.size - 1)) };
  }
  return { kind: 'hint', events: s.hint() };
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
          const { kind, events } = randomMove(rng, s);
          v.play(events);
          screen.play(events, kind);
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
      for (let m = rng.int(0, 25); m > 0; m--) v.play(randomMove(rng, s).events);
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

  it('house 1 with two figures in one row: areas and lines, floor, poses, the dotted line', () => {
    const { s, v } = house1();
    v.play(s.tap(1)); // (0,1): it and the figure in the nightcap at (0,0) share row 0
    expect(visibleText(1, v)).toBe(
      [
        'house 1 · 2 × 2 · 2 areas · 0 of 2 areas inside a teal outline · plain frame',
        'areas and lines (a letter per area; | and --- are thick dark lines; cells as (row,col) from 0 at the top left):',
        '+---+---+',
        '| A | B |',
        '+   +   +',
        '| A | B |',
        '+---+---+',
        'floor (. bare, ~ yellow stripes, # a bookshelf shape, @ a round icon with rays):',
        '. .',
        '. .',
        'figures and dots (O a figure with open eyes, U a figure with its eyes closed in a smile, ' +
          'H a figure with both hands over its eyes, Q a figure squinting under one hand; ' +
          'lowercase: wearing a nightcap; * a small dark dot; . nothing):',
        'h H',
        '. .',
        'figures: (0,0) both hands over its eyes, nightcap; (0,1) both hands over its eyes',
        'dotted lines: (0,0) to (0,1)',
        'small dark dots: none',
        'teal outlines: none',
        'color swatches: 2, 0 with a teal ring and a tick',
      ].join('\n'),
    );
    v.play(s.tap(3)); // the figure glides to (1,1)
    const text = visibleText(1, v);
    expect(text).toContain('2 of 2 areas inside a teal outline · warm frame');
    expect(text).toContain('u .\n. U');
    expect(text).toContain(
      'figures: (0,0) eyes closed in a smile, nightcap; (1,1) eyes closed in a smile',
    );
    expect(text).toContain('dotted lines: none');
    expect(text).toContain('teal outlines: A, B');
    expect(text).toContain('color swatches: 2, 2 with a teal ring and a tick');
  });

  it('every colour word it uses names the colour the board draws (D87, B2)', () => {
    const { s, v } = house1();
    v.play(s.tap(3));
    const text = visibleText(1, v);
    // each word, the constants it stands for, and what the word asks of their colour
    const WORDS: Record<string, { colours: number[]; fits: (c: number) => boolean }> = {
      dark: { colours: [COLOR_WALL, COLOR_MARK], fits: (c) => lightness(rgb(c)) < 30 },
      yellow: {
        colours: [COLOR_HATCH],
        fits: (c) => hueAngle(rgb(c)) > 60 && hueAngle(rgb(c)) < 110 && lightness(rgb(c)) > 70,
      },
      teal: {
        colours: [COLOR_SETTLED_RING],
        fits: (c) => hueAngle(rgb(c)) > 160 && hueAngle(rgb(c)) < 230,
      },
      warm: {
        colours: [COLOR_SOLVED_FRAME],
        fits: (c) => hueAngle(rgb(c)) > 40 && hueAngle(rgb(c)) < 110 && lightness(rgb(c)) > 80,
      },
    };
    const COLOUR_WORDS =
      /\b(dark|yellow|teal|warm|red|orange|green|blue|purple|pink|brown|white|black|grey|gray|light)\b/gi;
    const used = new Set(
      [...text.matchAll(COLOUR_WORDS)].map((m) => (m[1] as string).toLowerCase()),
    );
    expect([...used].sort()).toEqual(['dark', 'teal', 'warm', 'yellow']);
    for (const word of used) {
      const w = WORDS[word];
      expect(w, word).toBeDefined();
      for (const c of w?.colours ?? []) expect([word, w?.fits(c)]).toEqual([word, true]);
    }
  });

  it("the bulb's picture (D98): bands, digits, small blue dots, the pulsing area, in words of what is drawn", () => {
    const { v } = house1();
    const picture: ReasonPicture = {
      beats: 2,
      shown: 2,
      bands: [0, 2],
      badges: [
        { digit: 2, segment: 0, room: null },
        { digit: 2, segment: 2, room: null },
        { digit: 1, segment: null, room: 1 },
      ],
      wash: [0, 2],
      dots: [1],
      copies: [3],
      pulse: 1,
      lines: [[0, 3]],
    };
    const text = visibleText(1, v, picture);
    expect(text).toContain('pale bands: row 0; column 0');
    expect(text).toContain(
      'dark discs with digits: the digit 2 left of row 0; the digit 2 above column 0; the digit 1 at the top left corner of area B',
    );
    expect(text).toContain('pale cells: (0,0) (1,0)');
    expect(text).toContain('small blue dots: (0,1)');
    expect(text).toContain('faint figures with open eyes: (1,1)');
    expect(text).toContain('pulsing area: B');
    expect(text).toContain('dotted lines to empty cells: (0,0) to (1,1)');
    expect(text.match(RULE_WORDS)?.[0] ?? null).toBeNull();
    // no picture, no such lines
    expect(visibleText(1, v)).not.toContain('pale bands');
    // the colour words name the colours drawn: blue dots (CIELCh hue of sRGB blue: 306), dark discs
    expect(hueAngle(rgb(COLOR_HINT_DOT))).toBeGreaterThan(230);
    expect(hueAngle(rgb(COLOR_HINT_DOT))).toBeLessThan(310);
    expect(lightness(rgb(COLOR_HINT_DOT))).toBeLessThan(30);
    expect(lightness(rgb(COLOR_BADGE))).toBeLessThan(30);
  });

  it('the held result card (D99): its digits and icons, below or beside the board', () => {
    const { v } = house1();
    const card = { house: 12, time: '2:31', noHint: true, beside: false };
    expect(visibleText(12, v, null, card)).toContain(
      'a card below the board: the digits 12 and 2:31, a bulb with a tick, an arrow pointing right',
    );
    expect(visibleText(12, v, null, { ...card, noHint: false, beside: true })).toContain(
      'a card beside the board: the digits 12 and 2:31, an arrow pointing right',
    );
    expect(visibleText(12, v)).not.toContain('a card');
    expect(visibleText(12, v, null, card).match(RULE_WORDS)?.[0] ?? null).toBeNull();
  });

  it('bookshelf shapes, a round icon with rays, its yellow stripes, a squinting figure and dots', () => {
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
    v.play(s.tap(12)); // (2,2), on yellow stripes
    v.play(s.stroke([4, 9], 'paint'));
    const text = visibleText(42, v);
    expect(text).toContain(
      [
        'floor (. bare, ~ yellow stripes, # a bookshelf shape, @ a round icon with rays):',
        '~ . # . .',
        '~ . . . .',
        '@ ~ ~ ~ ~',
        '~ . . # .',
        '~ . . . .',
      ].join('\n'),
    );
    expect(text).toContain('. . . . *\n. . . . *\n. . Q . .');
    expect(text).toContain('figures: (2,2) squinting under one hand');
    expect(text).toContain('small dark dots: (0,4) (1,4)');
  });

  it('room letters run A, B, … by room id', () => {
    expect([0, 1, 25, 26].map(roomLetter)).toEqual(['A', 'B', 'Z', '0']);
  });
});
