# GENERATOR.md — rules, house format, solver, grader, players, generator, Gate A

Everything here is pure TypeScript (no Phaser, no clocks, no `Math.random`) under `src/core`
(rules) and `src/gen` (content), deterministic for a seed and unit-tested. The game reads prebuilt
houses (`src/data/levels.json`, `src/data/dailies.json`, built by `npm run levels`); it never
generates houses on the device. Source: `briefs/shy-ghosts.md` §5; where this document fills a gap
the brief leaves open, docs/questions.md names the decision (D-numbers). The windows in §7 are
tuning levers; the Gate A thresholds in §9 are fixed (CLAUDE.md, the fun gate).

## 1. Data

### 1.1 House

```ts
type Tech = 1 | 2 | 3 | 4;
type Role =
  | 'tutorial' | 'teach' | 'hard' | 'breather' | 'rest' // houses 1–24, cycle breathers
  | 'cycle-low' | 'cycle-high' | 'manor'                // cycle positions 1–3, 4–9, 10
  | 'daily';
interface Grade {
  d: number;          // sum of the step weights (§4.3)
  maxTech: Tech;      // highest technique used
  steps: number;      // all steps, T1 to T4
  estSeconds: number; // the brief's formula (§4.4)
  t: [number, number, number, number]; // steps per technique, T1..T4 (added, D13)
  episodes: number;   // deduction episodes (§4.3, added)
}
type Insight = 'shape' | 'lamp' | 'line' | 'cross' | 'count' | 'chain'; // §4.6 (D67)
interface House {
  id: number;         // 1-based position in the list; a daily's id is its day index (1–792)
  n: number;          // 2..8 (9 until D69)
  rooms: string;      // n² chars, the room id of each cell in base 36 (canonical ids, §1.2)
  objects: string;    // n² chars: '.' empty, 'F' furniture, 'L' lamp
  givens: number[];   // cell indices of the residents (houses 1–3, 5 and 8; D70, D81)
  solution: number[]; // the cell index of the ghost of each room id
  grade: Grade;
  players: { naive: number; shallow: number }; // win rates (§5, added)
  role: Role;         // added
  seed: number;       // the winning candidate's seed (uint32)
  insights: Insight[][]; // each episode's step names, in order (§4.6; the meta file, D67)
  insightEpisodes: number; // episodes with a step other than `shape` (D67)
}
```

The brief's fields (§5.5) keep their names and meanings; `grade.t`, `grade.episodes`, `players`
and `role` are added because Gate A reads them (D13); `insights` and `insightEpisodes` because
Gate B's round 1 reads them (D67). The `Grade` itself is unchanged.

### 1.2 Canonical room ids

Room ids are numbered in reading order of each room's first cell: the room holding cell 0 is room
0, the next room met in reading order is room 1, and so on (D9). So the win cascade's "room-id
order" sweeps down the house, hint ties go to the upper room, and two builds of one house always
write the same `rooms` string. `solution` is re-indexed with the ids.

### 1.3 Tutorial data

`src/data/tutorial.ts` holds the three houses of GDD §3.3 as rows of room letters and one given
each. `build-levels` turns them into houses 1–3 and grades them with T1 only.

## 2. Rules (formal; `src/core/house.ts`, `src/core/state.ts`)

- **Blocked** cells: furniture `F` and lamps `L`. A **row segment** is a maximal run of unblocked
  cells in one row; a **column segment** likewise in one column. Every unblocked cell lies in
  exactly one row segment and one column segment.
- **Sight:** two different unblocked cells see each other ⇔ they share a row segment or a column
  segment. Room walls do not matter, and ghosts are translucent, so a segment holds at most one
  ghost in any solution.
- **Light:** a cell is lit ⇔ it is unblocked and a lamp sits directly before or after its row
  segment, or directly above or below its column segment.
- **Candidates** (for solving): empty (`.`), unlit cells.
- **State:** the ghost of each room (a cell or none), the givens, the marks. Derived: per ghost
  `calm | seen | lit` (seen wins over lit when both hold, for the art; the rules only need "not
  calm"), per room `settled`, the house `solved`.
- **Moves** (each returns its events in order, for the scene to play back):
  - `tap(cell)`: on an empty cell → `placed` (clears a mark there) or, when the room holds a
    player's ghost, `relocated {from, to}`, or, when it holds a given, `nudged`; on a player's
    ghost → `removed`; on furniture, a lamp or a given → `nudged`.
  - `stroke(cells, mode)`: `marked {cells, on}` for the empty, ghost-free cells it covers.
  - `undo()`: reverts the last move of any kind, a hint's included.
  - `hint(solution)`: `removed` (the first wrong ghost in reading order) or `placed` (the
    solution cell of the unsettled room with the fewest free candidates; ties: lower room id).
  - Every move then emits `status {cell, from, to}` for each ghost whose state changed,
    `settled {room}` / `unsettled {room}`, and finally `solved`.
- **Solved** ⇔ every room holds exactly one calm ghost. With one solution per house, that is the
  stored solution.

### Worked examples (unit tests use these)

1. **Sight and light** (5 × 5; rooms do not matter for sight):
   ```
   . . F . .
   . . . . .
   L . . . .
   . . . F .
   . . . . .
   ```
   Lit: (0,0), (1,0), (3,0), (4,0) (the lamp's column) and (2,1), (2,2), (2,3), (2,4) (its row).
   Ghosts at (0,1) and (0,3) share row 0 with the bookshelf at (0,2) between them: neither sees
   the other. (0,3) and (0,4) see each other. (0,1) and (4,1) see each other down column 1, through
   any room walls, and a third ghost at (1,1) would see both and be seen by both. (4,3) does not see
   (0,3): the furniture at (3,3) blocks column 3. (4,1) and (4,3) see each other along row 4. A lone
   ghost at (2,2) is lit.
2. **Relocation and the given** (tutorial house 1, `AB / AB`, given (0,0)): `tap(0,1)` → `placed`;
   both ghosts `seen` (row 0). `tap(1,1)` → `relocated (0,1) → (1,1)`; both `calm`, rooms 0 and 1
   `settled`, `solved`. In a fresh copy, `tap(1,0)` → `nudged` (room 0's ghost is the given),
   nothing else changes.
3. **Marks and undo:** a stroke over three empty cells paints three marks (one move); a tap on one
   of them places a ghost and clears that mark; `undo()` brings the mark back and takes the ghost
   away; a second `undo()` removes the whole stroke.

## 3. Exact solver (`src/gen/solve.ts`; brief §5.1)

Backtracking over rooms, always the unsettled room with the fewest candidates first (ties: lower
id); candidates are the room's empty, unlit cells not seen by the ghosts placed so far; it counts
solutions and stops at 2, returning them. A node limit (2,000,000) guards the build: hitting it
fails the build loudly instead of guessing (never a time limit, so `levels:check` stays
byte-stable). Also used by the teaching tests (§9, A5) and by the auditor.

## 4. Grader (`src/gen/grade.ts`; brief §5.2)

### 4.1 Candidates

At the start the candidates are the empty, unlit cells; the givens are placed first. **T0**
(weight 0, automatic) after every placement: remove every cell the new ghost sees and the rest of
its room (the room is settled).

### 4.2 Techniques

| Technique | Rule | Weight |
| --- | --- | --- |
| T1 | an unsettled room with exactly one candidate: place it | 1 |
| T2 | a candidate x whose ghost would see every candidate of some other unsettled room: remove x (this covers T3 with k = 1) | 3 |
| T3 | k unsettled rooms (k = 2 … 4) whose candidates all lie inside exactly k row segments, or inside exactly k column segments (never mixed: a ghost at a crossing would sit in two segments): those segments hold these rooms' ghosts, so every candidate of the other rooms inside them is removed; it counts only when it removes something | 4 + k |
| T4 | contradiction at depth 1: if placing a ghost on x and repeating T0–T1 until nothing changes leaves an unsettled room with no candidate, remove x | 8 |

### 4.3 Step accounting (D11)

- The grader applies the cheapest technique that makes progress, one **step** at a time, and
  starts again from T1 after every step. A step is one technique instance: one placement (T1),
  one removed cell (T2, T4), or one set of k rooms with all its removals (T3).
- Instance order, so every build agrees: T1 by room id; T2 and T4 over the candidates of the room
  with the fewest candidates first (ties: lower id), cells in reading order; T3 by k ascending,
  rows before columns, room sets in lexicographic order of their ids.
- **Grade:** `d` = the sum of the weights; `maxTech`; `steps`; `t` = the steps per technique;
  `episodes` = the number of maximal runs of non-T1 steps in the path (each run is a moment where
  placing stops and the player must deduce).
- A house is **finished within its band** when the grader solves it with the band's techniques
  (§7), with at most one T4 step in a manor. Anything else is rejected: no guessing.

### 4.4 Estimated solve time (brief formula, unchanged; D18)

`estSeconds = 4·T1 + 8·T2 + 15·T3 + 25·T4 + 1.5·(empty cells)`. The scan term dominates: 1.5 s per
empty cell is about 35–120 s of every estimate from 5 × 5 to 9 × 9, and it makes the tutorial houses
10, 21.5 and 36 s against the brief's "≤ 15 s each". It is the first constant to calibrate with
human times (Hasan's first session after the gates, then `level_complete` after the launch).
Gate A therefore uses it for bounds and order (§9, A6), not as a promise of seconds.

### 4.5 Fixtures: one per technique where it is the first that applies (verified for this plan)

Rows top to bottom, one letter per room; `.` empty, `F` furniture.

- **T2** — rooms `AAAA / BCAA / BCCA / DDCA`, no objects. No room starts with one candidate. Room
  B, (1,0) and (2,0), lies in column 0, so a ghost at (3,0) (room D) would see both: (3,0) is
  removed (T2), D's last cell (3,1) is placed, and T1 finishes. Path T2 T1 T1 T1 T1, d = 7;
  solution (0,3), (1,0), (2,2), (3,1). With T1 alone the grader is stuck at the start.
- **T3** — rooms `ABBB / AABB / CCDB / CDDD`, objects `...F / .... / .... / ...F`. No T1 or T2
  at the start. Rooms C and D keep every candidate in rows 2 and 3 (two row segments; row 3 ends
  at the bookshelf), so those rows hold C's and D's ghosts and B's cell (2,3) is removed (T3,
  k = 2). Path T3 T3 T2 T2 T1 T1 T1 T1, d = 22; solution (0,0), (1,3), (2,1), (3,2). With
  techniques up to T2 the grader is stuck at the start.
- **T4** — rooms `ABBC / ABCC / ACCD / ADDD`, objects `.... / .... / F... / ...F`. No T1, T2 or T3
  at the start. A ghost at (0,0) would leave B only (1,1), then C only (2,2), and D nothing: (0,0)
  is removed (T4). Path T4 T4 T2 T4 T2 T4 T1 T1 T1 T1, d = 42; solution (3,0), (0,1), (1,2),
  (2,3). With techniques up to T3 the grader is stuck at the start.

### 4.6 Insights: each step named for people (Gate B tune round 1, D67)

The grader keeps its techniques, weights, order and grade; in the same pass it names every non-T1
step by what a player must see (`Step.insight`, `GradeResult.insights`, one list per episode):

| Insight | Grader step | What the player sees | An insight? |
| --- | --- | --- | --- |
| `shape` | T2: the emptied room's **starting** candidates and empty cells already lie in x's segment | a room whose own shape lies in one line claims that line | no: visible at a glance |
| `lamp` | T2: its starting candidates lie there, but not all its empty cells: lamp light took the rest | a lamp-made line | yes |
| `line` | T2: the room lies in that segment only because ghosts placed earlier (or removals) took its other candidates | a room that became one line | yes |
| `cross` | T2: the room's candidates lie in x's row and column segments together, in neither alone | a cell that sees a whole room from two sides | yes |
| `count` | T3 | k rooms filling k lines | yes |
| `chain` | T4 | "if here, then that room is empty" | yes |

When several rooms explain one T2 step, the simplest name wins (shape < lamp < line < cross); the
step also records the rooms and segments it used (the two-press hint shows them, D74).

- An **insight episode** is an episode (§4.3) with at least one step other than `shape`.
- **"Two distinct insights"** (the brief, TASKS Gate B B4) = at least two insight episodes: the
  forced chain stalls twice and each time only a real deduction moves it on. In the bands that
  carry difficulty (hard houses, cycle positions 1–9, manors, dailies) the house must also ask
  for **two kinds** (`insightKinds`, shape left out). Teach, rest and breather houses may repeat a
  kind; that is what makes them rests.
- Since Gate B tune round 2 these rules hold from house 25 and in every daily; houses 4–24 follow
  the ladder of §7, measured by the autopilot of §4.7 (D81). Round 1's "trick" rule for teach
  houses is gone with it.
- Fixtures (`tests/grade.test.ts`): §4.5's T2 fixture is a `shape`, the T3 one opens with two
  `count`s, the T4 one with `chain`s. Rooms `AAABB / AACBB / CCCDD / EECCD / EECDD`, objects
  `..... / F.... / ..... / ..F.. / L....`: room E's only cell (3,1) is placed, its column takes
  room A down to row 0: a `line`. Rooms `AABBB / ACBBB / ACDEB / CCDEE / CCDEE`, a lamp at (0,3)
  and a block at (3,2): room E keeps only column 4: a `lamp`. Rooms `ABBBB / AABCB / AADCC /
  DDDDC / DDDEE`, a lamp at (1,0) and a block at (1,1): after A's ghost at (2,1), (3,3) sees room
  C's (1,3) along its column and (3,4) along its row: a `cross`. Rooms `AABB / ABBB / ACCB /
  CCDD`, a lamp at (0,2) and a block at (1,2): (3,0) sees all of A (lamp-made) and all of D (by
  its shape): the step is a `shape`.

### 4.7 The autopilot (`src/gen/autopilot.ts`; Gate B tune round 2, D80)

The grader names steps, but it has no technique for the budget a Queens or Star Battle player
uses at a glance, so its count of insight episodes cannot tell a house that asks for something
from one a fan finishes on autopilot. The autopilot plays only the one-look patterns, one per
step, and stalls where a real insight is needed:

| Pattern | Rule |
| --- | --- |
| single | a room with one free cell takes its ghost |
| claim | a room whose free cells all lie in one row (or column) segment claims it: the other rooms' free cells there go (the grader's `shape`, `lamp` and `line` steps) |
| budget | when a direction has exactly as many open segments as open rooms, every open segment holds a ghost: a segment with one free cell takes it (line single), a segment whose free cells all lie in one room holds that room's ghost (line claim) |

The budget comes in three levels (`ApOptions.budget`): over whole lines only where no object
splits a line (`lines`, the Queens rule), over segments (`segments-litblind`: a split line holds
two, but a fully lit line still counts as one), and over segments leaving a fully lit line out
(`segments`, the full autopilot `AP_FULL`). What it lacks are the real insights: a **count**
(T3), a **cross** (a T2 step no claim explains: a cell that sees a whole room from two sides) and
a **chain** (T4). Every pattern is sound, so on a house with a solution it never removes one of
its cells.

- `apProfile(p, maxTech)` runs the autopilot; where it stalls, the band's grader supplies the next
  real step; the real steps between two placements form one **real insight episode**. It reports
  the ghosts placed before the first stall (`opening`), how the first ghost came (`firstGhost`),
  the stalls and their kinds.
- `apOpening(p, opts)`: the ghosts an autopilot with these patterns places before it stalls.
- `freebie(p)`: a **free opening**, a room with one free cell or a line single on the first look.
- `openingOf(p, maxTech)`: how a house opens (`claim>single`, `free>line-single`, `count-row-2`,
  `cross`, …).
- The measure of docs/gate-b-round2.md §1.2 (`tests/round2.test.ts`): a house **teaches** when
  the first autopilot level that finishes it, or a rule its solution needs (a shelf between two
  solution ghosts; light needed; a solution ghost in a shelf's shadow; both lamps needed; three
  ghosts in one line split twice), shows something no earlier house did; it **asks** when the full
  autopilot stalls.
- Calibration (`tests/autopilot.test.ts`, the list round 2 played kept as
  `tests/fixtures/round2-houses.json`): it finishes houses 4–20 but 13 and 20, the two that player
  had to stop and count.

## 5. Player models (`src/gen/players.ts`; D17)

The Munch Pixels lesson: a level list tuned against a random tapper hid that nothing needed a
decision. Here difficulty is checked against players who follow the visible rule but do not
deduce.

| Player | Policy | Stands for |
| --- | --- | --- |
| `blind` | one ghost per room on a uniformly random empty cell, ignoring every shiver; exact win probability Π 1/(empty cells of the room) | the floor (≈ 0 by construction) |
| `naive` | sees the shiver: never leaves a ghost on a seen or lit cell (T0); places a room's last free cell (T1); otherwise guesses a uniformly random free cell of the unsettled room with the fewest free cells (ties uniform); never undoes; loses when an unsettled room has no free cell | a player who learned the rule and does not deduce — the counterpart of Munch Pixels' "edge" bot |
| `shallow` | as `naive`, plus T2 (one-step lookahead) before any guess | a player who sees direct consequences but does not count |
| expert | the grader (§4) | always wins, by construction |

Win rates are **exact** (D55, which replaced 400 seeded playouts after Gate A's first A9 run):
`exactWinRate` walks the policy over every guess it can make, each weighted by its probability (a
uniform room among the tied ones, then a uniform free cell of it), with the same forced steps as a
playout in between, and weighs a board met twice once (memoized by its free cells). The result is
deterministic to the bit; the selection uses the same exact value it stores, so no stored house
lands outside its window. Seeded playouts (`winRate`) remain only as a cross-check in the tests.
The walk **fails the build loudly** past `PLAYER_STATE_LIMIT` (1,000,000 memoized boards,
`src/gen/params.ts`) rather than stopping early and storing a partial value: a capped walk would
store a number that is not the exact rate, and the selection would then rest on it. No house comes
near the limit (the slowest of the 1,792 takes 9 ms); a candidate that ever reached it would point
at a house the players cannot read, and the build should stop and say so.

## 6. Generator (`src/gen/generate.ts`; brief §5.3)

1. Take the band's parameters (§7). Draw the lamp and furniture counts and place lamps, then
   furniture, on distinct random cells; compute the segments and the lit cells.
2. Draw the room count R from the band's range, capped by both the number of row segments and the
   number of column segments (no house can hold more ghosts than either; D19).
3. Pick a solution: R empty, unlit cells, no two seeing each other (randomized backtracking, node
   limit 4,000, else reject the candidate).
4. Grow the rooms from the solution cells by randomized flood fill until every cell, furniture and
   lamps included, belongs to a room: each step adds an unassigned cell next to a room, choosing
   the room with weight 1 / size² (keeps sizes even). Reject if a room has fewer than 2 cells or
   more than 2.5 × the average size. Renumber the rooms canonically (§1.2).
5. Run the exact solver. While a second solution exists: take a cell c that the second solution
   uses and the stored one does not, and move it into a 4-adjacent different room Y, keeping c's
   old room connected with ≥ 2 cells and Y ≤ 2.5 × the average (Y now holds two ghosts of that
   second solution, so it breaks). Up to 50 moves (`UNIQUE_FIX_MOVES`; 200 until D77: in the
   successful candidates of houses 1–36 the fix needs at most 50 in about 99 % of cases, and
   those houses came out byte for byte the same), then reject the candidate.
6. Residents (D70, D81): in houses 5 and 8 the residents are chosen from the solution in reading
   order (house 5: two in one line with a block between them; house 8: one unlit, beside a lit
   cell), the first choice after which the house still asks for its band's d; none fits: reject.
7. Grade it with the band's techniques and check the band's windows (§7) in a staged order,
   cheapest first: residents, grade, d, T3, episodes, insights (§4.6, from the same grader pass),
   the manor's lead, the lesson tests (§7), the opening rules (§7, D81: the kind of opening the
   band asks for, a cross where named, and an opening unlike the house before's), the turn test
   (houses the list turns: the same grade **and** the band's insights in all four turns, D78),
   object relevance (§6.1), then the players (the costly part) last.

### 6.1 Object relevance (`src/gen/relevance.ts`; D68)

Every block and lamp must matter, by two tests, the residents placed both times:

- **Literal:** the object removed (its cell empty, same room, a candidate unless lit) must cost
  the house its unique stored solution or change its grade (d, the path or the insight names).
- **Rule isolation:** what the object does switched off alone must do the same: a block made
  see-through (still no place for a ghost, but sight and light pass it) and a lamp with its light
  off (it stays a block).

The grader alone decides (its steps are sound: a house it finishes with the stored placements has
exactly that one solution; one it cannot finish has changed by definition), so no solver run is
needed. On the list before this rule, rule isolation found 1,183 of 5,171 blocks and 14 of 1,892
lamps idle (house 10's block, both of house 15's) and the literal test 645 of 7,063 objects.

**Seeds and selection** (D15). Candidate k = 0 uses the brief's seed,
`hashSeed('shy-ghosts/level/<id>')` (dailies `hashSeed('shy-ghosts/daily/<YYYY-MM-DD>')`);
candidate k ≥ 1 appends `/<k>`. The first candidate that meets every window wins; houses 4, 9 and
17 (the first of a new element) take the lowest d among the first 50 qualifying candidates (ties:
lower k). A manor is built after the other houses of its cycle, so "above every other house of its
cycle" can be checked. No winner in 50,000 candidates (`CANDIDATE_LIMIT`; 2,000 until D77:
houses 9–11 and 15–16 need several thousand under §4.6 and §6.1) fails the build loudly.

## 7. Bands and selection windows (`src/gen/params.ts`)

Brief §5.4 for houses 1–24 as Gate B's tune rounds changed it: the ladder of round 2 (D80–D82;
docs/gate-b-round2.md §1.3) for houses 4–24, round 1's rules (D67–D70) from house 25 and in the
dailies; the cycles, the daily and the extra selection rules are this plan's (D6–D8, D10, D16).
"Episode ≥ 1" means at least one deduction episode (§4.3); "insight episodes" and "kinds" are
§4.6's; "opens with a real insight", "free opening" and the lessons are §4.7's. Every generated
house from 25 asks for **2 insight episodes**, every house 5–24 opens differently from the house
before it, and every object of every house passes both tests of §6.1.

| Houses | Role | N | Rooms | Furniture | Lamps | Techniques | D window | Further rules |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1–3 | tutorial | 2, 3, 4 | N | 0 | 0 | T1 only | — | data (GDD §3.3) |
| 4 | teach | 5 | 5 | 0 | 0 | ≤ T2 | 4–12 | the claim: its first step a T2, only `shape` steps; lowest d of 50 |
| 5 | teach | 5 | 6 | 1–2 | 0 | ≤ T2 | 6–14 | the bookshelf: two residents in one line with furniture between (A5's pair); lowest d of 50 |
| 6 | teach | 5 | 6 | 1–2 | 0 | ≤ T2 | 6–14 | the split budget: counting whole lines places no ghost, counting segments places one |
| 7 | hard | 6 | 6 | 0–1 | 0 | T3 required | 12–24 | opens with a real insight (the first count, A3/A5); naive ≤ 0.35 |
| 8 | teach | 6 | 6 | 0–2 | 1 | ≤ T2 | 8–16 | the light: necessary with its resident placed, no solution ghost in a shadow; one resident unlit beside the beam; no free opening; lowest d of 5 |
| 9 | hard | 6 | 6–7 | 1–3 | 0 | T3 required | 12–24 | opens with a real insight; naive ≤ 0.35 |
| 10 | teach | 5 | 5–6 | 1–2 | 1 | ≤ T2 | 6–14 | the shadow: a solution ghost past a shelf in the lamp's line; no free opening |
| 11 | hard | 6 | 6–7 | 1–3 | 0–1 | T3 required | 12–24 | opens with a real insight; naive ≤ 0.35 |
| 12 | hard | 6 | 6–7 | 2–3 | 0–1 | T3 required | 14–24 | opens with a cross; naive ≤ 0.35 |
| 13–14 | hard | 6 | 6–7 | 2–3 | 0–1 | T3 required | 14–24 | open with a real insight; naive ≤ 0.35 |
| 15 | breather | 5 | 5–6 | 1–2 | 0–1 | ≤ T2 | 6–12 | no free opening |
| 16 | breather | 5 | 6–7 | 2–3 | 0 | ≤ T2 | 6–12 | three ghosts in one line split twice; no free opening |
| 17 | teach | 6 | 6 | 0–2 | 1 | ≤ T2 | 8–16 | the lit-line budget: a line with no free cell; only the budget that leaves it out opens the house |
| 18 | teach | 6 | 6 | 0–2 | 2 | ≤ T2 | 8–16 | two lamps, each one's light necessary; no free opening |
| 19 | hard | 6 | 6–7 | 1–3 | 1 | T3 required | 14–24 | opens with a real insight; naive ≤ 0.35 |
| 20–22 | hard | 7 | 7–8 | 1–3 | 1–2 | T3 required | 18–30 | open with a real insight; naive ≤ 0.35 |
| 23–24 | rest | 6 | 6 | 0–1 | 1 | ≤ T2 | 8–14 | no free opening |
| cycle positions 1–3 | cycle-low | 7 | 7–10 | 0–5 | 0–3 | ≤ T3 | [12 + 6r, 22 + 8r] | 2 kinds; naive ≤ 0.35 |
| positions 4–9 | cycle-high | 7 or 8 | N to N+3 | 0–5 | 0–3 | T3 required | [18 + 8r, 32 + 10r] | 2 kinds; naive ≤ 0.35 |
| position 10 | manor | 8 (9 until D69) | 9–12 | 1–6 | 0–3 | T3 required, ≤ 1 T4 step | [33 + 10r, 50 + 15r] | 2 kinds; d above every other house of its cycle; naive ≤ 0.25 |
| position 11 | breather | 6 | 6–9 | 0–5 | 0–3 | ≤ T2 | 6–14 | — |
| daily | daily | 7 or 8 | N to N+2 | 1–4 | 0–2 | ≤ T3 | 20–34 | 2 kinds; naive ≤ 0.35 |

- **Cycles** (D6): from house 25, periods of 11 houses: ten cycle positions (1–3 at 7 × 7, 4–9 at
  7 × 7 or 8 × 8, 10 = an 8 × 8 manor, D69) and then the 6 × 6 breather the brief puts after the
  manor. No house is larger than 8 × 8 (`SIDE_MAX`): its cells stay ≥ 44 CSS px on a 360 × 640
  phone.
  Cycle `c = floor((id − 25) / 11)`, position `p = (id − 25) mod 11 + 1`. Manors: houses
  34 + 11c (34, 45, …, 991; 88 of them); breathers 35 + 11c. Houses 993–1000 are positions 1–8 of
  cycle 88.
- **Rising per cycle to a cap** (D7): `r = min(c, 10) / 10`; window bounds rounded to integers.
  Cycle 0: [12, 22], [18, 32], [33, 50]; from cycle 10 (house 135) on: [18, 30], [26, 42], [43, 65].
- **T4** (D8): allowed only in manors, at most one step, not required.
- **Daily** (D10): N = 7 or 8 by the seed; the window 20–34 sits on the middle (27) of the regular
  cycle houses' full range (12 at cycle 0's positions 1–3 to 42 at the capped positions 4–9).
- **After house 1000** (D14 as amended by D56): house k > 1000 is house
  `506 + ((k − 1001) mod 495)` turned by `(1 + floor((k − 1001) / 495)) mod 4` quarter turns
  ((r, c) → (c, n − 1 − r) per turn; room ids re-canonicalized). 495 is 45 whole cycles ending at
  house 1000, so the cycle phase runs on across every seam (house 1001 is position 9, like 506).
  The rules are symmetric, so the solution carries over; the houses the list turns (506–1000) are
  built to grade the same in all four quarter turns (D54), so the grade carries over too (tested).
  The step names (`insights`, `insightEpisodes`) do not: a turn can name a step otherwise (267 of
  the 1,485 turned houses), and no game code reads them, so a turned house carries none (D88).

## 8. Export and the build (`scripts/levels.mjs`)

- `npm run levels` loads `src/gen/build-levels.ts` through Vite's SSR module loader (as the Munch
  Pixels kit does) and writes `src/data/levels.json` (houses 1–1000, an array) and
  `src/data/dailies.json` (an object keyed by `YYYY-MM-DD` for 2026-11-01 … 2028-12-31, 792
  entries), one house per line with sorted keys, so diffs stay readable and bytes stable. It
  prints per band: the median and p10/p90 of d, estSeconds, naive and shallow; the technique
  counts; candidates per house; the build time.
- `npm run levels:check` rebuilds in memory and fails on any byte difference (CI step). From
  2028-11-01 it also prints a CI warning that the daily range ends on 2028-12-31.
- `.prettierignore` lists both files; `.gitattributes` keeps LF.
- Prototype cost (one core): a 9 × 9 candidate ≈ 0.05 s; houses 4–80 with every rule of §7 in 5 s
  (5.6 candidates per house on average). Expect the whole build in a few minutes, inside the
  brief's 10-minute budget.
- Measured: 120 s for the Epic 2 build; 448.8 s for Gate B round 1's prototype (a second grader
  pass for the insight names, a solver run per relevance test); the repository's round-1 build
  names the insights in the grader's own pass, decides relevance by the grader alone and moves at
  most 50 borders per candidate (D77): 207.0 s for `levels:check`. Gate B round 2's ladder
  (§7, D81): `npm run levels` 204.7 s, `levels:check` 195.3 s (the plan's prototype 173 s; A8's
  budget 600 s).

## 9. Gate A (closes Epic 2)

Fixed thresholds (CLAUDE.md, the fun gate). A1–A8 are tests in `tests/gate-a.test.ts` (and the
files it imports) over the built files; A9 is the auditor's. "Mid and late houses" = houses
12–1000 and every daily (1,781 houses).

| # | What | Threshold |
| --- | --- | --- |
| A1 | Unique solutions | every house 1–1000 and every daily has exactly one solution (solver stopped at 2), equal to the stored one; houses 1–3 with their givens: 1,792 of 1,792 |
| A2 | No guessing at any band | the grader finishes every house within its band (§4.3): 1,792 of 1,792; no T4 outside manors, never more than one per manor |
| A3 | Technique mix per band | houses 1–3: T1 only. Every generated house: ≥ 1 deduction episode. Teach, rest and breather houses: maxTech 2 (100 %). Hard houses, cycle positions 4–9 and manors: maxTech ≥ 3 (100 %). No T3 before house 7 (was 12; D82). Dailies: ≤ T3, T3 in ≥ 40 %. Reported: T3 share of positions 1–3, T4 share of manors |
| A4 | Deduction depth curve (d) | every d inside its window. Teach easy → test hard → rest, as band medians: 4–8 < 12–14 > 15–16; 17–19 < 20–22 > 23–24; each cycle's breather below its positions 4–9 median. The 10-house moving average: MA(50) ≥ 1.4 × MA(13), and over houses 13–50 it never falls more than 6 below its running best. Every manor's d above every other house of its cycle (88 of 88). Rising per cycle to a cap: mean d of cycles 0–2 < cycles 4–6 < cycles 8–10, and every cycle from 10 on within ±15 % of the mean of cycles 10–87. (Only pairs whose windows cannot overlap are compared house band to house band: 20–22 and cycle 0 share most of their windows, and the prototype put cycle 0's positions 4–9 at a median of 22 against 26 for 20–22.) |
| A5 | Tutorial teaches each rule in order | houses 1–3 equal the GDD §3.3 data, T1 only, one solution with the given (2, 4 and 9 without). House 1: (0,1) lies in room B and in the given's row. House 2: its path removes a candidate by the given's row and one by its column before the T1 steps that need them. House 3: three T1 steps, the first enabled by the given and each later one by the ghost placed just before. House 4: no given, furniture or lamp; its first step is T2. No furniture before house 5; house 5's solution has two ghosts in one row or column with furniture between them (was house 9; D82). No lamp before house 8; house 8's light is necessary (the lamp as furniture gives ≥ 2 solutions, its resident placed; was house 17; D82). First T3 at house 7 (was 12; D82); T4 first possible at house 34 |
| A6 | Estimated solve time per band (estSeconds, §4.4) | band medians: 4–11 ≤ 90 s; 12–14 ≤ 130 s; 15–16 ≤ 85 s; 17–19 ≤ 105 s; 20–22 ≤ 160 s; 23–24 ≤ 100 s; cycle positions 1–3 ≤ 150 s; 4–9 ≤ 200 s; manors ≤ 300 s; cycle breathers ≤ 100 s; dailies 120–200 s. Every house among 1–16 ≤ 130 s (Hold: a house won about every 2 minutes in the first session). The brief's human targets are reported next to these, not gated |
| A7 | A naive player fails most mid and late houses | naive ≤ 0.35 on every hard house, cycle positions 1–9 and daily; ≤ 0.25 on every manor. Over all mid and late houses: mean naive ≤ 0.25, and naive < 0.5 on ≥ 90 % of them. Shallow ≤ 0.60 on every house whose grade uses T3, mean ≤ 0.40 over them. Blind ≤ 0.01 on every generated house. Teach, rest and breather houses: reported, not capped |
| A8 | Reproducible, in budget | `npm run levels` ≤ 10 minutes on the CI runner; `levels:check` byte-identical; same seed → same house; 792 dailies on UTC dates 2026-11-01 … 2028-12-31; rotation after 1000 keeps one solution and the grade (the first ten turned houses, 1001–1010: houses 506–515 at 90° since D56) |
| A9 | Independent re-measurement | the auditor's own segment code, solver and naive player, written from scratch outside the repository, agree with the files on 200 sampled houses (40 from each of: 4–24, positions 1–3, positions 4–9 with manors, breathers, dailies): uniqueness 200 of 200, naive win rates within ±0.07 |

**Amendment** (D82, 2026-10-21): element positions moved earlier on playtest evidence (the
autopilot bot); quality thresholds unchanged; approved by Hasan. The first shelf, the first count
and the first lamp come at houses 5, 7 and 8 (were 9, 12 and 17), so the small houses can teach
or ask for something (docs/gate-b-round2.md §0, §1.4). Every other clause and every threshold is
unchanged.

**Gate A passes** when A1–A9 hold, the epic's `code-review` and audit have no open KRİTİK or
YÜKSEK finding, and PROGRESS.md records the measured table. A failing threshold is fixed through
the windows in `params.ts` or the generator's mechanics, at most two tune rounds; then the stop
rule (CLAUDE.md).

## 10. Calibration (a prototype for this plan, 2026-10-21)

A throwaway prototype of §2–§6 (the brief's generator, the exact solver, the grader with §4.3's
accounting, the naive and shallow players; not kept in the repository) was run to check that the
brief's windows and §9's thresholds are reachable together. The Epic 2 code re-measures all of it;
these numbers only set the thresholds.

Brief windows, houses 4–24 (60 houses per band; "yield" = share of generated candidates inside the
d window):

| Band | Yield | estSeconds median | naive mean | naive < 0.5 | T3 used |
| --- | --- | --- | --- | --- | --- |
| 4–8 | 27 % | 74 s | 0.42 | 67 % | — |
| 9–11 | 34 % | 72 s | 0.52 | 53 % | — |
| 12–14 | 31 % | 111 s | 0.26 | 88 % | 38 % |
| 15–16 | 31 % | 68 s | 0.47 | 65 % | — |
| 17–19 | 30 % | 90 s | 0.39 | 77 % | — |
| 20–22 | 27 % | 141 s | 0.18 | 95 % | 40 % |
| 23–24 | 29 % | 91 s | 0.39 | 85 % | — |

Every rule of §7 applied (30 houses per row; cycle 0 / cycle 10):

| Row | Yield | estSeconds median | naive median |
| --- | --- | --- | --- |
| positions 1–3 | 19 % / 23 % | 123 / 137 s | 0.19 / 0.20 |
| positions 4–9 (T3 required) | 8 % / 17 % | 159 / 179 s | 0.11 / 0.11 |
| cycle breather | 27 % | 84 s | 0.47 |
| daily | 24 % | 162 s | 0.14 (T3 in 57 %) |
| manor with exactly one T4 required | 0.4 % / 0.9 % (6–14 s per manor) | 243 / 272 s | 0.10 / 0.04 |

- The shallow player wins T3 houses with a median of 0.31–0.38 and never above 0.6.
- Unconstrained manors use T4 in about 10 % of cases; requiring it would take most of the
  10-minute budget, hence D8.
- A curve simulation of houses 4–80 with every rule: MA(13) 13.3, MA(24) 15.2, MA(50) 23.7 (ratio
  1.78); worst dip 2.7; band medians 4–8: 11, 12–14: 22, 15–16: 10.5, 17–19: 12, 20–22: 26,
  23–24: 9, cycle 0 positions 4–9: 22; houses 1–16 at most 120 s; manors d 37–52, each its cycle's
  top; 5 s.
- The tutorial houses: one solution each with the given, T1 only (2, 4 and 9 solutions without).
- House 17's teaching test: the lamp's light was necessary in 200 of 200 qualifying candidates.
  House 9 with 6 rooms: 26 % of candidates qualify (6 ghosts in 5 rows put two in one row, so
  furniture stands between them by construction).
- The blind player cannot win: a 5 × 5 house with 5 rooms of about 5 cells gives it ≈ 1/3,125.

### 10.1 Gate B tune round 1 (2026-10-21)

The evidence for §4.6, §6.1 and the round-1 rows of §7 is in docs/gate-b-round1.md §1.4 (the
prototype) and docs/PROGRESS.md, "Gate B tune round 1" (the repository's build): every house from
10 and every daily with two insight episodes, the bands that carry difficulty with two kinds,
houses 5–9 each with a real insight, no two consecutive teach houses with one trick, no idle
object by either test, no board above 8 × 8; Gate A's A1–A8 unchanged and green on the same
files (`tests/round1.test.ts` and `tests/gate-a.test.ts`).

### 10.2 Gate B tune round 2 (2026-10-21)

The evidence for §4.7 and the ladder of §7 is in docs/gate-b-round2.md §0 and §1.5 (the
prototype) and docs/PROGRESS.md, "Gate B tune round 2" (the repository's build, byte for byte the
prototype's): no house 4–10 finished on autopilot with nothing new (round 2's list: 5 of 7);
16 of houses 4–20 teach or ask (7); 8 open with a real insight (2); one free opening in houses
11–20 (8 of 10), 17's lesson; no two houses in a row open alike (6 of 16 pairs); houses 25–1000
and the dailies unchanged but daily 2027-10-02 (A9's fix, D88); Gate A A1–A8 green with the
amendment of §9 (`tests/round2.test.ts`, `tests/gate-a.test.ts`).

## 11. Tests (Vitest)

- Rules (`tests/house.test.ts`, `tests/state.test.ts`): the worked examples of §2; segments,
  sight (stops at furniture and lamps, not at walls or ghosts), light; relocation, removal,
  nudges; marks (paint, erase, cleared by a placement); undo of every move kind, a hint's
  included; the win. Property tests over 2,000 random houses: the state after a random move
  sequence equals a replay of it; the status flags equal a brute-force sight check.
- Solver (`tests/solve.test.ts`): the tutorial houses; a known multi-solution house (tutorial
  house 2 without its given: 4 solutions); 500 random small houses against brute force over all
  cell choices.
- Grader (`tests/grade.test.ts`): the three fixtures of §4.5 (path, d, solution; stuck with a
  lower cap); house 3 by T1 only; the step accounting; estSeconds.
- Players (`tests/players.test.ts`): determinism; the blind formula; the exact rates (D55) against
  hand-computed fixtures, an independent exact-fraction enumeration of the policy on 300 small
  houses and 50,000 seeded playouts on four houses; naive always wins the tutorial houses and
  wins 1/2 of the T2 fixture.
- Generator (`tests/gen.test.ts`): determinism; 200 seeds per band: connected rooms of ≥ 2 cells
  and ≤ 2.5 × the average, R within the segment cap, one solution, canonical ids, counts in band.
- Level files (`tests/levels.test.ts`, `tests/gate-a.test.ts`): §9, A1–A8.
- Daily mapping (`tests/daily-date.test.ts`, Epic 2 for the file, Epic 5 for the door): UTC date
  keys, one second before and after UTC midnight (03:00 in Türkiye), 792 entries.
