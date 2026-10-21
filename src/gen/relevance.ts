import { geometry, type Geometry } from '../core/house';
import { grade, type GradeOptions, type GradeResult } from './grade';
import { puzzleOf, type Puzzle } from './solve';

/**
 * Object relevance (GENERATOR.md §6.1; Gate B tune round 1, D68): every block and every lamp of a
 * house must matter. Each object is changed in two ways, the residents placed both times:
 * - the literal test: the object removed (its cell empty, same room, a candidate unless lit);
 * - rule isolation: what the object does is switched off alone. A block turns see-through (no
 *   ghost may stand there, but sight and light pass; for the step names and the time estimate it
 *   is still a block, so a step renamed only by its cell never passes it: A9, round 2); a lamp's
 *   light goes out (it stays a block).
 * The object matters when the change costs the house its unique stored solution or changes its
 * grade: d, the path or the insight names. The grader alone decides it: its steps are sound, so a
 * house it finishes has exactly the one solution it placed; one it cannot finish grades
 * differently by definition. No solver run is needed.
 */
export type ObjectTest = 'literal' | 'rule';

/** The object changed by one test: the geometry the house is graded on instead. */
function changed(p: Puzzle, cell: number, test: ObjectTest): Puzzle {
  const objects = p.objects.join('');
  const o = objects[cell];
  if (test === 'literal' || o === 'F') {
    const geo = geometry(p.n, `${objects.slice(0, cell)}.${objects.slice(cell + 1)}`);
    if (test === 'literal') return puzzleOf(geo, p.roomOf, p.givens);
    // see-through: open to sight and light, but still no place for a ghost, and still a block for
    // the namer and for estSeconds (A9, round 2)
    const see: Geometry = {
      ...geo,
      objects: p.objects,
      candidate: geo.candidate.map((c, i) => c && i !== cell),
    };
    return puzzleOf(see, p.roomOf, p.givens);
  }
  // a lamp with its light off is a block
  return puzzleOf(
    geometry(p.n, `${objects.slice(0, cell)}F${objects.slice(cell + 1)}`),
    p.roomOf,
    p.givens,
  );
}

/** What a grade says about the deductions: finished, d, the path and the insight names. */
function gradeKey(g: GradeResult): string {
  return `${String(g.ok)}|${String(g.grade?.d ?? -1)}|${g.path.join('')}|${JSON.stringify(g.insights)}`;
}

/** The house still has its one stored solution and the same grade after the change: idle. */
function idleAfter(
  p: Puzzle,
  solution: readonly number[],
  opts: GradeOptions,
  key: string,
  cell: number,
  test: ObjectTest,
): boolean {
  const g = grade(changed(p, cell, test), opts);
  if (!g.ok) return false;
  if (g.placed.length !== solution.length || g.placed.some((c, r) => c !== solution[r])) {
    return false;
  }
  return gradeKey(g) === key;
}

/** The cells of the house's blocks and lamps, in reading order. */
export function objectCells(p: Puzzle): number[] {
  return p.objects.flatMap((o, i) => (o === '.' ? [] : [i]));
}

/** The objects each test finds idle (empty lists: every object matters). */
export function idleObjects(
  p: Puzzle,
  solution: readonly number[],
  opts: GradeOptions,
): Record<ObjectTest, number[]> {
  const key = gradeKey(grade(p, opts));
  const out: Record<ObjectTest, number[]> = { literal: [], rule: [] };
  for (const cell of objectCells(p)) {
    for (const test of ['rule', 'literal'] as const) {
      if (idleAfter(p, solution, opts, key, cell, test)) out[test].push(cell);
    }
  }
  return out;
}

/**
 * Every object passes both tests (the build's check: it stops at the first idle object). `base`
 * is the house's own grade, which the build already has.
 */
export function objectsMatter(
  p: Puzzle,
  solution: readonly number[],
  opts: GradeOptions,
  base: GradeResult = grade(p, opts),
): boolean {
  const key = gradeKey(base);
  for (const cell of objectCells(p)) {
    if (idleAfter(p, solution, opts, key, cell, 'rule')) return false;
    if (idleAfter(p, solution, opts, key, cell, 'literal')) return false;
  }
  return true;
}
