import type { GhostStatus } from '../core/state';
import type { BoardView } from './view';

/**
 * `__ghostDebug.visible()` (TASKS.md Epic 3, D33): the board as a player sees it once the motion
 * has settled, as text, so the playtester can check its reading of a screenshot cell by cell
 * (Gate B, B2). It describes only what is drawn (D63; audit 2026-10-21, YÜKSEK 1): rooms and
 * walls, the floor (plain, a warm wash, dark blocks, sun icons), each ghost's pose (eyes open,
 * hands over the eyes, squinting, a nightcap), the dotted lines, the grey dots, the glowing rooms
 * and the frame. It never names a rule, and it holds no solution.
 */
const ROOM_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
/** The pose each state is drawn with (src/game/graybox.ts). */
const POSE: Record<GhostStatus, { letter: string; words: string }> = {
  calm: { letter: 'O', words: 'eyes open' },
  seen: { letter: 'H', words: 'hands over the eyes' },
  lit: { letter: 'Q', words: 'squinting under a hand' },
};
const LEGEND_ROOMS =
  'rooms and walls (a letter per room; | and --- are thick walls; cells as (row,col) from 0 at the top left):';
const LEGEND_FLOOR = 'floor (. plain, ~ warm wash, # dark block, @ sun icon):';
const LEGEND_GHOSTS =
  'ghosts and dots (O eyes open, H both hands over the eyes, Q squinting under a hand; ' +
  'lowercase: wearing a nightcap; * small grey dot; . nothing):';

export function roomLetter(room: number): string {
  return ROOM_LETTERS[room] ?? '?';
}

export function visibleText(id: number, view: BoardView): string {
  const h = view.house;
  const { n } = h;
  const room = (r: number, c: number): number => h.roomOf[r * n + c] as number;
  const at = (i: number): string => `(${String(Math.floor(i / n))},${String(i % n)})`;
  const rooms = h.roomCount;
  const lines = [
    `house ${String(id)} · ${String(n)} × ${String(n)} · ${String(rooms)} rooms · ` +
      `${String(view.glowing.size)} of ${String(rooms)} rooms glowing · ` +
      (view.solved ? 'warm frame' : 'plain frame'),
    LEGEND_ROOMS,
  ];
  for (let r = 0; r <= n; r++) {
    let edge = '+';
    for (let c = 0; c < n; c++) {
      edge += r === 0 || r === n || room(r - 1, c) !== room(r, c) ? '---+' : '   +';
    }
    lines.push(edge);
    if (r === n) break;
    let row = '|';
    for (let c = 0; c < n; c++) {
      row += ` ${roomLetter(room(r, c))} `;
      row += c === n - 1 || room(r, c) !== room(r, c + 1) ? '|' : ' ';
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
  lines.push(LEGEND_GHOSTS);
  grid((i) => {
    const st = view.ghosts.get(i);
    if (st) {
      const letter = POSE[st].letter;
      return view.isResident(i) ? letter.toLowerCase() : letter;
    }
    return view.marks.has(i) ? '*' : '.';
  });
  const ghosts = [...view.ghosts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([c, st]) => `${at(c)} ${POSE[st].words}${view.isResident(c) ? ', nightcap' : ''}`);
  lines.push(`ghosts: ${ghosts.length > 0 ? ghosts.join('; ') : 'none'}`);
  const pairs = view.sightPairs().map(([a, b]) => `${at(a)} to ${at(b)}`);
  lines.push(`dotted lines: ${pairs.length > 0 ? pairs.join('; ') : 'none'}`);
  const marks = [...view.marks].sort((a, b) => a - b).map(at);
  lines.push(`grey dots: ${marks.length > 0 ? marks.join(' ') : 'none'}`);
  const glow = [...view.glowing].sort((a, b) => a - b).map(roomLetter);
  lines.push(`glowing rooms: ${glow.length > 0 ? glow.join(', ') : 'none'}`);
  return lines.join('\n');
}
