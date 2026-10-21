import type { HouseModel } from './house';

/** One hint (GDD §3.1): take a wrong ghost away, or show a solution ghost. */
export type HintStep = { kind: 'remove'; cell: number } | { kind: 'place'; cell: number };

/**
 * The hint step for a board where `ghosts[room]` is the cell of the room's ghost or null
 * (GDD §3.1, GENERATOR.md §2): if a ghost stands off the solution, the first such ghost in reading
 * order floats away; otherwise the solution ghost of the empty room with the fewest free candidate
 * cells (empty, unlit, seen by no ghost; ties: the lowest room id) appears. Null when every room
 * holds its solution ghost. Givens always stand on the solution (`houseErrors` checks it), so a
 * hint never takes one away.
 */
export function hintStep(house: HouseModel, ghosts: readonly (number | null)[]): HintStep | null {
  let wrong = Number.POSITIVE_INFINITY;
  for (let room = 0; room < ghosts.length; room++) {
    const cell = ghosts[room] ?? null;
    if (cell !== null && cell !== house.solution[room] && cell < wrong) wrong = cell;
  }
  if (wrong !== Number.POSITIVE_INFINITY) return { kind: 'remove', cell: wrong };

  const seen = new Array<boolean>(house.size).fill(false);
  for (const g of ghosts) {
    if (g === null) continue;
    for (const c of house.sees[g] ?? []) seen[c] = true;
  }
  let best: number | null = null;
  let bestFree = Number.POSITIVE_INFINITY;
  for (let room = 0; room < house.roomCount; room++) {
    if ((ghosts[room] ?? null) !== null) continue;
    const free = (house.roomCells[room] ?? []).filter((c) => house.candidate[c] && !seen[c]).length;
    if (free < bestFree) {
      best = room;
      bestFree = free;
    }
  }
  if (best === null) return null;
  return { kind: 'place', cell: house.solution[best] as number };
}
