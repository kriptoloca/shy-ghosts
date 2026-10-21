import type { GhostStatus } from '../core/state';
import type { BoardView } from './view';

/**
 * `__ghostDebug.visible()` (TASKS.md Epic 3, D33): the board as a player sees it once the motion
 * has settled, as text, so the playtester can check its reading of a screenshot cell by cell
 * (Gate B, B2). It names only shapes, colours, positions and poses (D63, D76; Gate B tune round 1,
 * docs/gate-b-round1.md §7): areas and thick dark lines, the floor (bare, yellow stripes, a
 * bookshelf shape, a round icon with rays), each figure's pose (open eyes, both hands over its
 * eyes, squinting under one hand, a nightcap), dotted lines, small dark dots, dashed teal
 * outlines, the color swatches and the frame. It never names a rule or what a thing does, and it
 * holds no solution.
 */
const AREA_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
/** The pose each state is drawn with (src/game/graybox.ts). */
const POSE: Record<GhostStatus, { letter: string; words: string }> = {
  calm: { letter: 'O', words: 'open eyes' },
  seen: { letter: 'H', words: 'both hands over its eyes' },
  lit: { letter: 'Q', words: 'squinting under one hand' },
};
const LEGEND_AREAS =
  'areas and lines (a letter per area; | and --- are thick dark lines; cells as (row,col) from 0 at the top left):';
const LEGEND_FLOOR =
  'floor (. bare, ~ yellow stripes, # a bookshelf shape, @ a round icon with rays):';
const LEGEND_FIGURES =
  'figures and dots (O a figure with open eyes, H a figure with both hands over its eyes, ' +
  'Q a figure squinting under one hand; lowercase: wearing a nightcap; * a small dark dot; ' +
  '. nothing):';

export function roomLetter(room: number): string {
  return AREA_LETTERS[room] ?? '?';
}

export function visibleText(id: number, view: BoardView): string {
  const h = view.house;
  const { n } = h;
  const area = (r: number, c: number): number => h.roomOf[r * n + c] as number;
  const at = (i: number): string => `(${String(Math.floor(i / n))},${String(i % n)})`;
  const areas = h.roomCount;
  const lines = [
    `house ${String(id)} · ${String(n)} × ${String(n)} · ${String(areas)} areas · ` +
      `${String(view.glowing.size)} of ${String(areas)} areas inside a dashed teal outline · ` +
      (view.solved ? 'warm frame' : 'plain frame'),
    LEGEND_AREAS,
  ];
  for (let r = 0; r <= n; r++) {
    let edge = '+';
    for (let c = 0; c < n; c++) {
      edge += r === 0 || r === n || area(r - 1, c) !== area(r, c) ? '---+' : '   +';
    }
    lines.push(edge);
    if (r === n) break;
    let row = '|';
    for (let c = 0; c < n; c++) {
      row += ` ${roomLetter(area(r, c))} `;
      row += c === n - 1 || area(r, c) !== area(r, c + 1) ? '|' : ' ';
    }
    lines.push(row);
  }
  const grid = (cell: (i: number) => string): void => {
    for (let r = 0; r < n; r++) {
      lines.push(Array.from({ length: n }, (_, c) => cell(r * n + c)).join(' '));
    }
  };
  lines.push(LEGEND_FLOOR);
  grid((i) => {
    const o = h.objects[i];
    if (o === 'F') return '#';
    if (o === 'L') return '@';
    return h.lit[i] ? '~' : '.';
  });
  lines.push(LEGEND_FIGURES);
  grid((i) => {
    const st = view.ghosts.get(i);
    if (st) {
      const letter = POSE[st].letter;
      return view.isResident(i) ? letter.toLowerCase() : letter;
    }
    return view.marks.has(i) ? '*' : '.';
  });
  const figures = [...view.ghosts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([c, st]) => `${at(c)} ${POSE[st].words}${view.isResident(c) ? ', nightcap' : ''}`);
  lines.push(`figures: ${figures.length > 0 ? figures.join('; ') : 'none'}`);
  const pairs = view.sightPairs().map(([a, b]) => `${at(a)} to ${at(b)}`);
  lines.push(`dotted lines: ${pairs.length > 0 ? pairs.join('; ') : 'none'}`);
  const marks = [...view.marks].sort((a, b) => a - b).map(at);
  lines.push(`small dark dots: ${marks.length > 0 ? marks.join(' ') : 'none'}`);
  const outlined = [...view.glowing].sort((a, b) => a - b).map(roomLetter);
  lines.push(`dashed teal outlines: ${outlined.length > 0 ? outlined.join(', ') : 'none'}`);
  lines.push(`color swatches: ${String(areas)}, ${String(view.glowing.size)} with a dark ring`);
  return lines.join('\n');
}
