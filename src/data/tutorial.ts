import { fromRows, type HouseData } from '../core/house';

/**
 * The three hand-made tutorial houses (GDD §3.3, GENERATOR.md §1.3): rows top to bottom, one
 * letter per room, one resident (a given, in a nightcap) each. Each has exactly one solution with
 * its given and is solved by "last free cell" placements alone (tests/tutorial.test.ts; without
 * the given: 2, 4 and 9 solutions). The content pipeline turns them into houses 1–3 (Epic 2).
 */
export interface TutorialHouse {
  readonly rooms: readonly string[];
  /** The resident, (row, column). */
  readonly given: readonly [number, number];
  /** The solution as GDD §3.3 lists it, (row, column) per ghost. */
  readonly solution: readonly (readonly [number, number])[];
  /** What the house teaches (GDD §3.3), for the reader. */
  readonly teaches: string;
}

export const TUTORIAL: readonly TutorialHouse[] = [
  {
    rooms: ['AB', 'AB'],
    given: [0, 0],
    solution: [
      [0, 0],
      [1, 1],
    ],
    teaches: 'tapping (0,1) makes both ghosts shiver; tapping (1,1) relocates the ghost and solves',
  },
  {
    rooms: ['ABB', 'ABB', 'CCC'],
    given: [0, 1],
    solution: [
      [0, 1],
      [1, 0],
      [2, 2],
    ],
    teaches: 'rows and columns both count',
  },
  {
    rooms: ['ACCC', 'ACBB', 'ADDB', 'DDDB'],
    given: [0, 3],
    solution: [
      [0, 3],
      [1, 2],
      [2, 0],
      [3, 1],
    ],
    teaches: 'three placements, each the last free cell of its room',
  },
];

/** Houses 1–3 as house data (canonical room ids, GENERATOR.md §1.2). */
export const TUTORIAL_HOUSES: readonly HouseData[] = TUTORIAL.map((t) =>
  fromRows({ rooms: t.rooms, givens: [t.given], solution: t.solution }),
);
