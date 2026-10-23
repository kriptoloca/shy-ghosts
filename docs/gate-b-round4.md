# Gate B round 4 (2026-10-23): six bars of seven pass; B2 is Hasan's call

Build: `363ccbb` (tune round 3, the last; D91). The playtester was a new agent that never saw
rounds 1–3, the repository's documents or the rules, with the same persona (knows LinkedIn Queens
and Star Battle, plays a few puzzles a day) and the protocol of docs/gate-b-round3.md §10: 360 ×
640 at 2×, full-frame screenshots, houses 1–20 in order, then 27, 31 and 34; houses 9, 17, 20 and
34 again at 540 × 960, 600 × 600 and 844 × 390; input and reload checks on house 12; the neutral
`visible()` and `state()` only. Its log stays outside the repository.

## The bars (TASKS.md, unchanged)

| Bar | Result | Evidence |
| --- | --- | --- |
| B1 the rule reads without text | pass | Houses 1–3 with no hint, no negative reaction. The statements after houses 3, 9 and 17: one ghost per room and sight along rows and columns through walls (3); a bookshelf stops sight, a lamp lights its row and column (9); the light stops at a shelf, no ghost on a lit cell, a line may hold several ghosts if shelves part them or none at all (17). 3 of 3 correct against GDD §3. |
| B2 the screen shows the rules | **strictly not met; Hasan's call** | 20 of 23 houses read cell for cell; in houses 15, 18 and 20 one **shelf cell** was put in the neighbouring room (the shelf covers the floor pattern, and at 360 × 640 the wall beside it). A shelf cell holds nothing, so no rule, deduction or solution depends on its room; every ghost state and every other cell matched. The bar says 100 %. |
| B3 deductions are findable | pass | 0 guesses in every house. |
| B4 decisions | pass | All 17 of houses 4–20 have placements beyond the last free cell; houses 12, 13, 14 and 20 have 10, 7, 8 and 6. |
| B5 interest holds | pass | Median 4 over houses 4–20 (bar 3.5); houses 11–20 median 4, houses 4–10 median 4; no house scored 1 (houses 1 and 2, the tutorial, scored 2). |
| B6 input and resume | pass | About 250 inputs, none on another cell than the one aimed at. Placement, removal, relocation, painting, erasing, carry, undo and the two-press hint each in ≥ 5 trials as GDD §3.1 says. Reloads restored ghosts, marks, a conflict and the clock in 3 of 3. |
| B7 the verdict | pass | **YES**: "a Queens/Star Battle fan keeps playing past house 10". Flow 4, Fair 4 (bars 4 and 4); Face 3, Feel 3, Share 2 noted, not gated. |

## Per house, next to the ladder (docs/gate-b-round3.md §1.5)

Tags: E elimination, C count, X contradiction (the cross), L last free cell; no guess anywhere.
The clock runs from the first input (GDD §4) and the playtester planned each house before its first
tap, so it shows 0:00–0:05; its own reading time was 1–4 minutes a house.

| House | Lesson or role | Interest (round 3) | Tags | The playtester's line |
| --- | --- | --- | --- | --- |
| 4 | claim | 3 (3) | C1 E3 L1 | — |
| 5 | shelf blocks sight | 4 (4) | X1 E3 | teaches the shelf "purely by showing" |
| 6 | split budget | 4 (4) | X1 E4 L1 | — |
| 7 | first count | 3 (3) | C1 E5 L1 | — |
| 8 | light; the one planned rest | 4 (4) | C2 X1 E2 | teaches the lamp by showing |
| 9 | hard: count-2, cross | **5** (4) | X3 C1 E3 L1 | "genuinely good puzzle" |
| 10 | shadow | 4 (3) | C2 X2 E4 L1 | — |
| 11 | hard: count-2, two crosses | 4 (3) | C2 E6 | — |
| 12 | hard: count-3, count-2, cross | 4 (4) | C3 X1 E6 | — |
| 13 | hard: two crosses, cross, count-2 | **5** (3) | C4 E3 L1 | "genuinely good puzzle" |
| 14 | hard: count-4, count-2, cross | **5** (3) | X1 E7 | teaches "lines may stay empty" by showing |
| 15 | hard, lean | 4 (2) | C1 E5 L1 | — |
| 16 | three in a line split twice | 4 (3) | X2 E5 | — |
| 17 | hard: lit line | 4 (3) | X3 C1 E3 | opens with a case split |
| 18 | hard: two lamps | 4 (4) | C1 X3 E3 | — |
| 19 | hard: cross, count-2, cross | 4 (3) | X2 E6 | opens with a case split |
| 20 | hard: count-3, cross and count-3, cross | 3 (3) | X4 E2 L2 | "3–4-way case split … try-and-see for a casual Queens player" |
| 27 | sample (7 × 7 cycle) | 3 (4) | X1 E6 | — |
| 31 | sample (8 × 8) | 4 (4) | L1 X2 E5 | — |
| 34 | sample (first manor) | 4 (4) | L1 C2 X1 E5 | — |

Round 3 had a median of 3 with 6 houses at 4 or more; round 4 has a median of 4 with 14 of 17 at
4 or more, three of them 5, and the second half of the ladder no longer falls off (the plan's
middle forecast was about two in three for B5).

## The playtester's problems, ranked, with the main session's reading

1. House 3's demonstration hand drags along the resident's row; the playtester tapped the cell the
   hand pointed at and nothing visible happened (a tap in a given's room only nudges the given).
   Two dead taps, then it found the right rooms. Fix for Epic 4: a visible refusal on an ignored
   tap, and the hand ends on a cell outside the given's room.
2. Failure reads louder than success (two ghosts shiver and cover their eyes against a teal ring
   and a tick). The measured salience (D84) says the opposite on changed area and time in motion;
   the playtester's eye says the conflict's animated figures outweigh a thin ring. Epic 4's feel
   work (GDD §3a) is where this is decided; it is noted in TASKS.
3. Shelf cells hide their room (the B2 misreads). Fix: keep a band of the floor pattern around a
   shelf; walls beside objects at full width.
4. Houses 17, 19 and 20 open with a 3–4-way case split, which a casual Queens player feels as
   try-and-see. The grader calls these crosses (a one-step contradiction); Gate A still passed and
   the playtester scored 17 and 19 a 4 and 20 a 3. Watch in the sandbox numbers.
5. The result card ignored a tap 1.85 s after the solve (its own 300 ms guard runs from when the
   card is up at about 2.3 s). Expected by D99; worth a look in Epic 4.
6. The clock starts at the first input, so a planned solve shows 0:00. GDD §4's choice.
7. The brown scallop swatch reads as a frowning face; nine swatches are cramped at 360 px.
8. The hint's cooldown press gives no sign. Epic 4 adds the shake.

## Decision

Six bars pass and the verdict is YES. B2 reads 87 % cell for cell against a bar of 100 %, with
the three misses on shelf cells, which hold nothing. The main session does not move or reread a
bar (CLAUDE.md, the fun gate); whether Gate B passes on this result is Hasan's decision.
