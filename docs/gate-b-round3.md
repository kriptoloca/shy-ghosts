# Gate B round 3 (2026-10-22): not passed, the work stops

Build: `4d4ba4e` (tune round 2 of 2, the last). The playtester was a new agent that never saw
rounds 1–2, the repository's documents or the rules, with the same persona: it knows LinkedIn
Queens and Star Battle and plays a few puzzles a day. The protocol was docs/gate-b-round2.md §9:

- 360 × 640 at 2×, full-frame screenshots, houses 1–20 in order, then 27, 31 and 34;
- houses 9, 17, 20 and 34 again at 540 × 960, 600 × 600 and 844 × 390;
- input and reload checks on house 12;
- the neutral `visible()` and `state()` only.

Its log stays outside the repository.

## The bars (TASKS.md, unchanged)

| Bar | Result | Evidence |
| --- | --- | --- |
| B1 the rule reads without text | pass | Houses 1–3 were solved with no hint and no negative reaction. The statements after houses 3, 9 and 17 say: one ghost per room; sight along rows and columns, through walls, stopped by a bookshelf; a sun's light stopped by a shelf; no ghost in a lit cell. |
| B2 the screen shows the rules | pass | The reading matched `visible()` in all 23 houses and all 12 size checks (100 %). |
| B3 deductions are findable | pass | 0 guesses in houses 4–20 and the samples. The one guess was house 1, the coin flip. |
| B4 decisions | pass | All 17 of houses 4–20 have a placement beyond the last free cell. Houses 12, 13, 14 and 20 have 7 each. |
| B5 interest holds | **fail** | The median over houses 4–20 is 3, against a bar of 3.5. Houses 11–20 have a median of 3, below the median of 4 for houses 4–10. No house scored 1; house 15 scored 2. |
| B6 input and resume | pass | About 250 inputs, none on the wrong cell. Tap, removal, relocation, painting, erasing, carry, undo and hint each had ≥ 5 trials and behaved as GDD §3.1 says. Reloads restored ghosts, marks and the clock in 3 of 3 trials. |
| B7 the verdict | **fail** | **NO**. Flow 2 against a bar of 4, Fair 4 against a bar of 4. Noted, not gated: Face 3, Feel 3, Share 1. |

## Per house, next to the ladder's lesson or insight (docs/gate-b-round2.md §1.3)

The tag counts are elimination and count placements; there was no contradiction and no guess.
The solve clock runs from the first input (GDD §4). The playtester planned each house before its
first tap, so its 7–18 s are not a human solve time.

| House | Lesson or insight (plan) | Interest | Elim / count | The playtester's line |
| --- | --- | --- | --- | --- |
| 4 | claim | 3 | 4 / 1 | "first real puzzle … Easy" |
| 5 | shelf blocks sight | 4 | 3 / 1 | "the bookshelf twist … taught in one glance" |
| 6 | split budget | 4 | 5 / 1 | "the columns 3-4 count was a real Star Battle move" |
| 7 | count at the opening (first T3) | 3 | 5 / 1 | "one count step then a cascade; fine but samey" |
| 8 | light | 4 | 3 / 2 | "sun adds a nice dead zone layer; the demo was … ambiguous" |
| 9 | count (columns) | 4 | 5 / 2 | "counting the column stretches made the first move click" |
| 10 | shadow | 3 | 4 / 1 | "cute, but the house fell in 9 seconds" |
| 11 | count (three rows) | 3 | 5 / 1 | "the one count was nice; the rest fell instantly" |
| 12 | cross, then a count | 4 | 5 / 2 | "a genuinely nice deduction; still quick" |
| 13 | count (columns) | 3 | 5 / 2 | "decent count opening, then autopilot" |
| 14 | count (three rows) | 3 | 5 / 2 | "classic and pleasant; everything after is forced singles" |
| 15 | rest | 2 | 5 / 1 | "a 5x5 after 6x6s felt like a step back" |
| 16 | three ghosts in a line split twice | 3 | 6 / 1 | "pretty, but it solved itself" |
| 17 | lit-line budget | 3 | 4 / 2 | "a neat idea, but the house took 7 seconds" |
| 18 | two lamps | 4 | 3 / 3 | "the best deduction so far" |
| 19 | cross, then a count | 3 | 4 / 2 | "same two-step pattern again" |
| 20 | count at the opening (7 × 7) | 3 | 5 / 2 | "looks great, but … the same opener" |
| 27 | sample (7 × 7 cycle) | 4 | 3 / 4 | "needed the every-stretch count more than once" |
| 31 | sample (8 × 8) | 4 | 5 / 2 | "look rich" |
| 34 | sample (first manor) | 4 | 2 / 6 | "the best-built house I saw" |

## What it says

- **The rules and the screen work.** B1–B4 and B6 pass cleanly, Fair is 4, and every board was
  read right at every size. The playtester called the wordless teaching "superb" and the rules
  "clear and fresh".
- **The puzzles are too shallow for a level game.** Every house from 4 on was one chain of forced
  moves, with no mistake, no guess and no note. A counting step opened the house, and the rest
  "fell instantly". Openers repeated: "two rooms share two columns" came again in houses 19 and 20.
- **Interest follows depth and novelty.** The houses rated 4 are:
  - new elements: 5, 6 and 8;
  - houses with two or more counts that read as new: 9, 12 and 18;
  - all three later samples: 27, 31 and 34, with 34 needing six counts.

  A repeat scored 3, and the 5 × 5 rest after the 6 × 6 houses scored 2. Interest fell after
  house 10, which fails B5's second condition.
- **The playtester's other problems, ranked:**
  1. the hint's first press dims cells with no clear message, and a move in between still spends
     the recharge;
  2. there is no end moment to hold;
  3. a relocated ghost jumps silently;
  4. look-alike swatches (rose and tan, purple and pale blue in 31 and 34) and faint light on the
     green and peach rooms;
  5. at 844 × 390 the board sits off-centre, with the swatches and time crowded to the right;
  6. a reload resets the hint's recharge;
  7. house 8's demonstration shows a copy that is both lit and seen.

## Decision

This was the last tune round (CLAUDE.md, the fun gate; docs/gate-b-round2.md §9). The work stops
here, and Hasan has the report. Only he can allow another round or change a bar. The open question
"pace or depth" (docs/questions.md) is the lever this round points at.
