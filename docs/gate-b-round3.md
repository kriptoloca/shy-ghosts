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

---

## Tune round 3 (D91–D103): the plan

Hasan approved one more tune round, the last, on depth (D91). The lead designer's plan follows as
proposed on 2026-10-22; the decisions it asks for are D92–D103 (docs/questions.md), and the port's
departures from it are listed at its end.

**Status.** Proposed, 2026-10-22, for the coordinator.

**Author and readers.** Author: lead designer (agent team). Readers: the coordinator, the coder,
the auditor, and round 4's playtest handler.

**Where the evidence is.** Nothing in the repository was edited. The evidence comes from a copy of
the repository at `431eb44` in the round's scratch folder `sg-gateB-r3/`, which sits outside the
repository. The files are cited by name below:
- the prototype code: `proto/src/gen/depth.ts`, `proto/src/gen/deepen.ts`, and the changed
  `proto/src/gen/params.ts`, `proto/src/gen/build-levels.ts` and `proto/tests/gate-a.test.ts`
  (their diff against the repository: `proto-diff.patch`);
- the scripts `proto/scripts/exp-*.mjs`;
- the logs `*.log`, among them `table-final.log` (the ladder), `gate-a-final.log`,
  `levels-full3.log` (the build) and `build24-6.log` (the search times);
- the built files in `final-data/`;
- the colour checks in `color/`;
- `orig/data`, the list round 3 played.

**Fixed (D91).**
- Gate B's bars B1–B7 and the protocol (§10) stay as they are.
- Gate A's A1–A5 and A7–A9 stay, including A4's band order and moving-average rules and A3's
  technique rules per role.
- A6 stays for houses 1–7, the cycles, the manors, the breathers and the dailies. Only A6's
  ceilings for houses 8–24 rise (§1.7).
- CLAUDE.md still holds:
  - no house above 8 × 8 (the ladder stops at 7 × 7);
  - cells ≥ 80 design px, and ≥ 44 CSS px at 360 × 640 (a 7 × 7 cell is 50);
  - no text in gameplay (the new badges are digits);
  - the rendering rules (every new cue is a drawn texture or fill).
- A fail in round 4 ends Shy Ghosts (D91).

---

### 0. The round in one page

**Why B5 and B7 failed, measured.** I extended round 2's autopilot into a *depth profile* (§1.1).
It plays a house the way the round-3 player did, cheapest deduction first, and marks each *stall*:
a moment where only a real insight (a count, a cross or a chain) moves the solve on. On the list
round 3 played:
- every real insight comes before the first ghost, and no house stalls twice;
- after the insight, 4–9 ghosts fall with no thought (§1.2), which is "the rest fell instantly";
- eight houses of 4–24 hold the "two rooms share two lines" count in their opening.

**Why the generator cannot simply pick deeper houses.**
- Among 900–1,700 qualifying random candidates per band, 0–2.8 % stall twice. Only 0.3 % also
  keep a short tail, and those cost d 28–72.
- A4, unchanged, is the wall. With the late list fixed, it leaves houses 8–13 a mean d of at most
  22, and caps every 10-house window up to house 33 at 29.9 (§1.3).
- Lean deep houses therefore have to be grown, not picked.

**What changes:**

| | Change | Proof |
| --- | --- | --- |
| a | A deepening search grows each house 8–24 to a depth target inside its d window (§1.4): ≥ 2 stalls, three in 13, 14 and 17–22; a real insight after ≥ 2 ghosts; ≤ 3 ghosts after the last insight; never more than 3 ghosts in a row without a thought; two kinds of insight in every hard house; an opener unlike the two houses before; a two-room count in one opening only (house 7, the count lesson before the ladder, keeps its own); no house that repeats the pattern of the house before | the prototype list: houses 9–24 meet it (§1.5) |
| b | The ladder: 7 × 7 from house 9, never smaller before house 25; the lessons kept at 5, 7, 8, 10, 16, 17 and 18; house 8 the one planned rest (the light, then one cross after two ghosts) | Gate A on the prototype: 43 of 43 (round 3's 42, with A6's 4–11 band split in two), with only A6 8–24 raised; houses 25–1000 and all 792 dailies byte-identical to round 3 |
| c | A6 for houses 8–24 rises to the prototype's medians + 5 s (table below) | the same run |
| d | A start table keeps the build inside A8 | 192 s for the whole build; the ladder searched from k = 0 takes 946 s on its own |
| e | The hint's reason plays in beats with digits; a cancelled hint keeps its recharge; the recharge survives a reload (§2) | unit and e2e |
| f | A held result card ends each house (§3) | e2e |
| g | The relocation glide reads (§4) | e2e frames |
| h | No two rooms of a pattern family look alike; light reads on every floor (§5) | all 1,792 houses keep a valid look; F1–F7 kept |
| i | Landscape is centred (§6); house 8's demonstration shows light alone (§7) | layout and demo tests |

**A6 ceilings, old → new** (prototype median + 5 s, rounded up to 5 s):

| Houses | 8–11 | 12–14 | 15–16 | 17–19 | 20–22 | 23–24 | every house 8–16 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Old | 90 (as 4–11) | 130 | 85 | 105 | 160 | 100 | 130 (as 1–16) |
| New | 135 | 150 | 135 | 150 | 165 | 135 | 155 |

Houses 4–7 keep 90: their median is 70. Houses 1–7 keep the per-house ceiling of 130: their
highest is 117.

**B5 forecast.** Bots are not people, and these houses lie outside anything round 3 rated.
- On round 3's own rates, the new ladder gives 8–12 of houses 4–20 at 4 or more; B5 needs 9.
- The chance that B5 passes (both its conditions) is about one in three on pessimistic per-house
  rates, two in three in the middle and nineteen in twenty on optimistic ones (§1.8).
- Round 2 forecast 12–15 houses at 4+, and round 3 delivered 6. Read the middle as a coin flip that
  leans toward a pass, not as a promise.

**Needs Hasan.** No new approval: the only Gate A change is A6 for houses 8–24, which D91 allows.
Three things to tell him:
1. Pace.
   - By the brief's formula, houses 9–24 now estimate 2–2.7 minutes each.
   - "A house about every 2 minutes" now holds only through house 8.
   - This is D91's choice of depth over pace.
2. Chains (T4) stay barred before house 34 (A2, A5).
   - The contradiction this round uses is the cross: "a ghost here leaves that room no cell".
   - Multi-step chains in houses 8–24 would need A2 or A5 to move. This plan does not ask for
     that.
3. Houses 20–22 sit exactly at their old ceiling, 160. Their new 165 is the stated 5 s margin
   only.

---

### 1. Depth: the measure, the search and the ladder

#### 1.1 The depth profile (`src/gen/depth.ts`, pure)

The profile plays a house the way round 3's player did, cheapest deduction first:
- round 2's autopilot (§4.7: single, claim, the budget over segments) runs until it stalls;
- the band's grader then supplies one step, and the autopilot runs again.

Each placed ghost is tagged with the hardest step since the ghost before it:

| Tag | Meaning | Round 3's tag |
| --- | --- | --- |
| free | a room with one free cell before any deduction | last free cell |
| elim | a last free cell after sight eliminations | elimination |
| claim, budget | a room lying in one line; "every open stretch needs a ghost" | count |
| cross, count, chain | the real insights: a cell that sees a whole room from two sides; k rooms filling k lines; "if here, a room empties" | count, contradiction |

| Measure | Definition |
| --- | --- |
| Stalls | moments only a real insight moves the solve on |
| Later stall | a real step after at least this many ghosts |
| Tail | ghosts after the last real insight |
| Longest autopilot run | the most ghosts in a row tagged free or elim |
| Think | ghosts tagged claim, budget, cross, count or chain |
| Opener | the first real kind, or the first ghost's pattern (budget, claim, free) |
| Pattern | the real kinds in order of first use (`count-2>cross`); rows and columns count as one kind |

#### 1.2 Calibration on round 3

The profile was run on the list round 3 played, next to the playtester's ratings and its own
elimination and count tags:

| House | Interest | Its tags (elim / count) | Stalls | Real insights (ghosts before) | Tail | Longest autopilot run |
| --- | --- | --- | --- | --- | --- | --- |
| 4 | 3 | 4 / 1 | 0 | — | 5 | 4 |
| 5 | 4 | 3 / 1 | 0 | — | 4 | 3 |
| 6 | 4 | 5 / 1 | 0 | — | 6 | 3 |
| 7 | 3 | 5 / 1 | 1 | count-2 (0) | 5 | 5 |
| 8 | 4 | 3 / 2 | 0 | — | 5 | 2 |
| 9 | 4 | 5 / 2 | 1 | count-2 (0) | 6 | 3 |
| 10 | 3 | 4 / 1 | 0 | — | 5 | 2 |
| 11 | 3 | 5 / 1 | 1 | count-3 (0) | 5 | 5 |
| 12 | 4 | 5 / 2 | 1 | cross, count-2 (0) | 6 | 6 |
| 13 | 3 | 5 / 2 | 1 | count-2 (0) | 6 | 4 |
| 14 | 3 | 5 / 2 | 1 | count-3 (0) | 6 | 6 |
| 15 | 2 | 5 / 1 | 0 | — | 6 | 4 |
| 16 | 3 | 6 / 1 | 0 | — | 7 | 6 |
| 17 | 3 | 4 / 2 | 0 | — | 6 | 2 |
| 18 | 4 | 3 / 3 | 0 | — | 6 | 5 |
| 19 | 3 | 4 / 2 | 1 | cross, count-2 (0) | 5 | 4 |
| 20 | 3 | 5 / 2 | 1 | count-2 (0) | 6 | 4 |
| 27 | 4 | 3 / 4 | 0 | — | 7 | 5 |
| 31 | 4 | 5 / 2 | 0 | — | 8 | 5 |
| 34 | 4 | 2 / 6 | 0 | — | 9 | 4 |

What it says:
- **The complaint is measured.** No house stalls twice. Every real insight comes before the first
  ghost, and 4–9 ghosts follow without a thought.
- **The profile alone does not predict a 4.** Seven of the nine houses rated 4 have no stall at
  all. They were new elements (5, 6, 8, 18) or late houses with many counting placements (27,
  34) or an 8 × 8 board (31).
- **What did predict a 4:**
  - something new, an element or a first insight (9, 12);
  - the player's own counting placements: 4+ in 3 of 3 houses with three or more, 4 of 9 with two,
    2 of 8 with one.
  - Every house whose only thought was one opening count scored 3 (7, 11, 13, 14, 19, 20).
- **So the new ladder is outside the calibrated range.** Its houses stall 2–3 times, the last time
  at most 3 ghosts from the end, and each asks 2–4 thinking placements. §1.8 gives the forecast as
  a range for that reason.

#### 1.3 Why a search, and what binds it (A4)

**Random houses almost never stall twice.** Random candidates per band, 20,000 tries each
(`dist-1.log`, `dist-2.log`, `deep-1.log`):

| Band | Qualifying | Stall twice | And a later stall, tail ≤ 3, runs ≤ 3 | d of those (p10/50/90) |
| --- | --- | --- | --- | --- |
| 6 × 6, 6–7 rooms, 1–3 shelves, 0–1 lamp, T3 | 1,394 | 21 (1.5 %) | 4 (0.29 %) | 28 / 40 / 46 |
| 7 × 7, 7–8 rooms, 1–3 shelves, 0–2 lamps, T3 | 1,098 | 21 (1.9 %) | 3 (0.27 %) | 34 / 34 / 49 |
| 8 × 8, 8–10 rooms, 1–4 shelves, 0–2 lamps, T3 | 1,350 | 38 (2.8 %) | 4 (0.30 %) | 42 / 45 / 72 |
| 6 × 6 and 7 × 7 at ≤ T2 (rests, lessons) | 1,671 / 916 | 0 | 0 | — |

**A4 is the wall.**
- The late list is fixed, with MA(50) = 25.4. MA(50) ≥ 1.4 × MA(13) then caps houses 4–13 at a
  mean d of 18.14.
- Houses 4–7 hold 48 of it, which leaves houses 8–13 a mean of at most 22.2.
- MA(44) = 23.9, and the rule "never 6 below its best" caps every 10-house window up to house 33
  at 29.9.
- The deep random houses above cost d 28–72. They do not fit, so lean deep houses must be grown.

#### 1.4 The deepening search (`src/gen/deepen.ts`, pure, deterministic)

**The start.** A unique candidate from the generator (GENERATOR §6, steps 1–5), residents placed
(house 8), graded with the band's techniques. The two-stall hard rungs walk only from a candidate
that already stalls once.

**The walk.** Simulated annealing over 6,000 evaluations, the temperature falling from 8 to 0.5
score points.
- 85 % of the moves give a border cell to a neighbouring room. The cell is never a solution cell
  or a resident. Rooms stay connected, with ≥ 2 cells and ≤ 2.5 × the mean.
- 15 % move a shelf to an empty cell that is not a solution cell, keeping the stored solution a
  solution. Lamps never move.
- Every state is graded in its canonical room ids (the grader's order follows the ids, so d
  could change otherwise). A state the grader cannot finish is dropped. Its steps are sound, so a
  finished house has exactly one solution and no solver run is needed (as in relevance.ts).

**The score.** It adds:
- 100 per stall, up to the target + 1;
- −45 per tail ghost over the target and −25 per autopilot-run ghost over it;
- −50 without a later stall;
- +3 per thinking placement;
- −12 per d point outside the window;
- −60 without a required T3;
- +20 per real kind, up to the target;
- −40 for an opener the house may not use, or for the house before's pattern.

**The checks inside the walk.** A house that meets all of that is checked for its lesson (−120
when it fails) and for idle objects (−80 each). An object the literal test finds idle is dropped
while the house still meets the target.

**The end.** The walk stops at the first house that meets the target, keeps its lesson and has no
idle object. A walk with no stall after 35 % of its evaluations stops early. The build's usual
checks follow: d window, T3, lesson, objects, and naive ≤ 0.35 on hard houses.

**The rules across houses.**
- The opener is unlike those of the two houses before. A lesson that fixes its opener keeps it:
  house 17 opens with the budget, so 15 and 16 may not.
- A two-room count opens one house only.
- The pattern differs from the house before.

**Speed and the start table.** Searched from k = 0, the 17 houses took 946 s on one core (houses
18 and 19 alone took 190–200 s each). That plus the rest of the list is over A8's budget. So `params.ts` carries `LADDER_STARTS`: the
candidate index at which the k = 0 search found each house. The build starts there and runs every
check as before.
- With the table, the ladder takes 8 s and the whole build 192 s (round 3's: 188–195 s).
- `npm run levels:starts` finds the table again after any pipeline change.
- A stale start costs only time: the build searches on from it.

#### 1.5 The ladder (houses 1–24; from 25 on, the list is unchanged)

Houses 1–7 are unchanged: the tutorial, then claim (4), shelf (5), split budget (6) and the first
count (7). Hasan's D91 starts depth at house 8, and houses 4–7 hold the share of A4's budget that
the ladder leaves them. The prototype's houses 8–24 (`table-final.log`):

| House | Board (rooms / shelves / lamps) | Role, lesson | Opener | Real insights (ghosts placed before) | Stalls | Tail | d | est (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8 | 6 × 6 (6/1/1), 1 resident | teach: **light**; the one planned rest | budget | cross (2) | 1 | 2 | 11 | 87 |
| 9 | 7 × 7 (7/1/1) | hard | count-2 | count-2 (0), cross (3) | 2 | 3 | 22 | 137.5 |
| 10 | 7 × 7 (7/3/1) | teach: **shadow** | cross | cross (0), cross (4) | 2 | 2 | 19 | 127.5 |
| 11 | 7 × 7 (7/1/1) | hard | budget | count-2 (1), two crosses (3) | 2 | 3 | 19 | 128.5 |
| 12 | 7 × 7 (7/2/1) | hard | count-3 | count-3 (0), count-2 (1), cross (3) | 3 | 3 | 23 | 135 |
| 13 | 7 × 7 (8/3/1) | hard | cross | two crosses (0), cross (1), count-2 (4) | 3 | 3 | 26 | 146.5 |
| 14 | 7 × 7 (8/4/1) | hard | count-4 | count-4 (0), count-2 (2), cross (6) | 3 | 1 | 28 | 144 |
| 15 | 7 × 7 (7/3/1) | hard, lean (A4's lower 15–16) | count-3 | count-3 (0), count-2 (3) | 2 | 3 | 20 | 125.5 |
| 16 | 7 × 7 (7/4/1) | teach: **three in a line split twice** | cross | cross (0), cross (5) | 2 | 1 | 19 | 126 |
| 17 | 7 × 7 (7/1/1) | hard: **lit line** | budget | count-2 (1), count-2 (2), cross (3) | 3 | 3 | 22 | 136.5 |
| 18 | 7 × 7 (7/3/2) | hard: **two lamps** | count-3 | count-3 (0), cross (2), cross (4) | 3 | 2 | 26 | 141 |
| 19 | 7 × 7 (8/4/1) | hard | cross | cross (0), count-2 (3), cross (5) | 3 | 2 | 26 | 145 |
| 20 | 7 × 7 (8/4/1) | hard | budget | count-3 (1), cross and count-3 (2), cross (5) | 3 | 2 | 34 | 160 |
| 21 | 7 × 7 (8/4/1) | hard | count-3 | count-3 (0), count-2 (1), cross (4) | 3 | 3 | 33 | 160 |
| 22 | 7 × 7 (8/4/1) | hard | cross | cross and count-3 (0), cross (3), cross (6) | 3 | 1 | 30 | 153 |
| 23 | 7 × 7 (7/2/1) | rest (≤ T2), deep | budget | cross (1), cross (3) | 2 | 3 | 22 | 137 |
| 24 | 7 × 7 (7/2/1) | hard, lean (A4's lower 23–24) | count-3 | count-3 (0), cross (3) | 2 | 3 | 17 | 120 |

**Every house 9–24:**
- its longest run of ghosts placed without a thought is ≤ 3;
- it needs 2–4 thinking placements;
- its naive win rate is ≤ 0.25 on the hard houses.

**The roles.**
- Hard (T3 required): 9, 11–15 and 17–22, and 24.
- Teach (≤ T2): 8, 10 and 16. A teach house's insights are crosses.
- Rest (≤ T2): 23.
- The lessons 17 and 18 are hard houses that still pass their lesson tests ("Band roles are the
  generator's choice within A3").

**The openers.**
- budget in 8, 11, 17, 20 and 23;
- cross in 10, 13, 16, 19 and 22;
- count-3 in 12, 15, 18, 21 and 24;
- count-2 in 9 only, and count-4 in 14.

**Kinds.** Count-2, count-3, count-4 and cross; every hard house uses two of them.

#### 1.6 Evidence: the round-3 list against the prototype

Both lists are measured by the same scripts.

| Measure (houses 9–24 unless stated) | Round 3 | Prototype |
| --- | --- | --- |
| Houses that stall twice or more | 0 of 16 | **16 of 16** (9 stall three times) |
| A real insight after the opening (≥ 2 ghosts placed) | 0 | **16** |
| Tail, median (ghosts after the last insight) | 6 | **3** |
| Longest run of ghosts placed without a thought, maximum | 6 | **3** |
| Houses 4–24 whose opening holds a two-room count | 8 (7, 9, 12, 13, 19–22) | **2** (7, the count lesson, unchanged; and 9) |
| Consecutive houses 8–24 with the same opener | 1 pair (20–21; the player also heard 19–20 as alike) | **0** |
| Consecutive houses 9–24 with the same insight pattern | — | **0** |
| Board dips before house 25 | 3 (9 → 10, 14 → 15, 22 → 23) | **0** |
| Gate A (`gate-a-final.log`) | 42 of 42 | **43 of 43**: A6's 4–11 band is split in two, and only the ceilings of houses 8–24 rise; the look tests pass too |
| Houses 25–1000, the 792 dailies | — | byte-identical to round 3's files |
| `npm run levels` (one core) | 188–195 s | **192 s** with the start table (946 s for the ladder without it) |
| Every house has a valid look under S1 (§5) | 1,792 of 1,792 | **1,792 of 1,792** |

The A4 numbers:

| Rule | Value |
| --- | --- |
| MA(13) | 16.8 (round 3: 14.0) |
| MA(50) | 25.4 |
| MA(50) ÷ MA(13) | 1.51 (bar ≥ 1.4) |
| MA over 13–33 | 16.8 to 26.4 (cap 29.9) |
| Worst fall below the running best | 3.1 (bar ≤ 6) |
| Band medians of d | 4–8 = 11 < 12–14 = 26 > 15–16 = 19.5; 17–19 = 26 < 20–22 = 33 > 23–24 = 19.5 |

The d windows guarantee the band order and keep the MA(13) ratio ≥ 1.40 even in the worst case
(houses 8–13 all at the top of their windows: 133, so MA(13) = 18.1).

The full unit suite on the prototype: 471 of 480 pass. Nine fail, as expected:
- seven are round 2's ladder tests (`round2.test.ts`), replaced by task 3;
- two are the magic-number rule on the prototype files (`source-rules.test.ts`): their weights
  move to `params.ts` in the port.

#### 1.7 A6: old and new ceilings

Rule: the new ceiling is the prototype's value plus 5 s, rounded up to a multiple of 5 s. Only
houses 8–24 change.

| Band | Old ceiling | Prototype | New ceiling |
| --- | --- | --- | --- |
| 4–7 (the first part of the old 4–11) | 90 | 70 | **90**, unchanged |
| 8–11 (the second part of the old 4–11) | 90 | 128 | **135** |
| 12–14 | 130 | 144 | **150** |
| 15–16 | 85 | 125.75 | **135** |
| 17–19 | 105 | 141 | **150** |
| 20–22 | 160 | 160 | **165** (the margin only) |
| 23–24 | 100 | 128.5 | **135** |
| Every house 1–7 (the first part of the old "1–16 ≤ 130") | 130 | max 117 | **130**, unchanged |
| Every house 8–16 | 130 | max 146.5 (house 13) | **155** |
| Cycle positions 1–3, 4–9, manors, cycle breathers, dailies | 150, 200, 300, 100, 120–200 | unchanged houses | unchanged |

**Why they rise.** A 7 × 7 board alone costs about 68 s of the formula: 1.5 s for each of ~45
empty cells. Two or three insights cost 3–8 d each.

**The bound.** The d windows also bound est, at about 100 + 2.7 × (dMax − 8) s for a hard 7 × 7
house. If the port's houses differ from the prototype's, the same rule is applied again. A median
above these ceilings stops the work and goes to the coordinator (risk 3).

#### 1.8 B5 forecast (bots are not people)

**The model.**
- Houses 4–7 are unchanged, so they keep round 3's chances: 0.3 / 0.7 / 0.7 / 0.3 of a 4+.
- Every new house gets an independent chance of 4+, in three bands:
  - pessimistic: round 3's one-insight houses (2 of 8), raised a little;
  - middle;
  - optimistic: round 3's houses with three or more counting placements (3 of 3).
- A 4+ is a 5 with chance 0.15; anything else is a 2 with chance 0.10.
- 200,000 draws.

| Chance of 4+ | Pessimistic | Middle | Optimistic |
| --- | --- | --- | --- |
| Two-stall hard (9, 11, 15) | 0.40 | 0.55 | 0.70 |
| Three-stall hard (12, 13, 14, 19, 20) | 0.50 | 0.65 | 0.80 |
| Lessons 8, 10 and 16 | 0.50 | 0.60 | 0.75 |
| Three-stall lessons 17 and 18 | 0.55 | 0.70 | 0.85 |
| **Houses 4–20 at 4+ (mean of 17)** | 8.3 | 10.1 | 12.1 |
| Houses 11–20 at 4+ (mean of 10) | 4.9 | 6.3 | 7.9 |
| Median of 4–20 ≥ 3.5 | 0.46 | 0.79 | 0.97 |
| Median of 11–20 ≥ median of 4–10 | 0.70 | 0.84 | 0.97 |
| **B5 passes (both)** | **0.30** | **0.67** | **0.95** |

**Why only a range.**
- One player's taste moves every house together. Independent draws understate that spread.
- Round 2's forecast (12–15 houses at 4+) met 6.
- The second condition gains from houses 11–20: 7 of them stall three times, against none of
  8–10.

---

### 2. The hint: a reason you can read, a recharge you keep

**What round 3 saw.** The first press dimmed the board outside the deduction's lines and rooms and
pulsed the target room: "dims parts of the board with no clear message". A move between the two
presses spent the hint and its 90 s recharge (`HintClock.used()` runs at the first press). A
reload reset the recharge.

**The reason, text-free (digits allowed).** `hintExplain` already follows the grader from the
board as it stands to the next forced placement. It now returns that path step by step, and the
first press plays it as beats of `REASON_BEAT_MS` = 700, then holds the whole picture:

| Step | What the beat draws |
| --- | --- |
| claim (`shape`, `lamp`, `line`) | the claiming room's free cells glow; its line gets a soft band; the other rooms' cells in the line get hint dots |
| count (k rooms, k lines) | the k lines get bands, each with a digit badge **k** just outside the board (left of a row, above a column); the k rooms' free cells glow; the cells the count removes get hint dots |
| cross | a see-through ghost stands on the cell, its dotted rays run along its row and column, the room it would empty flashes with the "seen" pose on each of its free cells; then the cell gets a hint dot and the copy fades |
| chain (manors only) | a see-through ghost on the cell, the ghosts it forces appear see-through one by one, the emptied room flashes; the cell gets a hint dot |
| last beat | the target room pulses (as now) with a digit badge **1** (one free cell left); its other cells carry hint dots, or the dotted line from the ghost that sees them |

- Hint dots are the marks' dot in `COLOR_HINT_DOT` (F4/F6: ≥ 3:1 on every floor, in every view).
  Consecutive claim steps on one room and line merge into one beat.
- A wrong ghost still gets the dashed outline and the tremble.
- A pause freezes the beats. The player's next move, or the second press, clears the reason (D86).
- `visible()` lists the reason in neutral words (bands with their digit, dotted cells, the pulsing
  room), so B2 still holds.

**The recharge.**
- The cooldown starts when the hint is used: at the second press, or when the player's own move
  places the target room's ghost while the reason shows.
- Any other move that clears the reason gives the recharge back (`HintClock.refund()` restores the
  ready time from before the press). The hint still counts once, at the first press (D74), so the
  result card's no-hint badge is gone either way.
- The save keeps the recharge: `SaveData` v2 adds `hintReadyIn` (play seconds until ready, 0–90);
  a v1 save reads as 0 (ready).

### 3. The end of a house: a held result card

**Decision: hold the result until a tap; no auto-advance.** The reasons are in §8.

- The solve finale stays as it is (about 2.4 s: hit stop, rising ticks, ring of light, waves).
- Then the board stays, every ghost content, and a card rises below the board in portrait and
  square, or beside it in landscape (`RESULT_IN_MS` = 240, a small overshoot). It shows:
  - the house number, in digits;
  - the solve time, m:ss, ticking up from 0 over 400 ms (the finale's time digits move here);
  - a no-hint badge (a bulb with a tick) when no hint was shown in this house;
  - a next arrow that pulses once a second.
- Any tap, or the arrow, continues from `RESULT_GUARD_MS` = 600 after the card starts, so the last
  placement's tap never skips it. The next house slides in as now (350 ms).
- The tap that wakes the game after a pause never continues (`ResumeGrace`). A reload during the
  card opens the next house: the solved house is already recorded.
- The card is the Share pillar's future result card (Epic 5); on YouTube it never shows a share
  action.

### 4. The relocation glide

**Why it reads as a silent jump.** `board.ts` glides a relocated ghost for 220 ms (ease in-out),
and nothing marks the cell it left. An agent reading screenshots about 0.5 s apart never sees a
220 ms motion, and a person sees a short slide with no trace.

- **First a red e2e test**: frames every 30 ms after a relocation tap. At least 3 frames show the
  ghost between the two cell centres, and the old cell shows an afterimage for ≥ 200 ms.
  - If the in-between frames are missing, it is a bug: fix it first.
  - The afterimage is missing today either way.
- Then:
  - `GLIDE_MS` 220 → 320;
  - a see-through afterimage stays on the old cell and fades (alpha 0.4 → 0, `AFTERIMAGE_MS` 300);
  - the ghost leans `GLIDE_LEAN_DEG` = 8° toward its way and straightens on arrival;
  - the arrival glance as now.
- GDD §3a's relocate row changes to match; a relocation is neutral, so the inversion test does not
  apply to it.

### 5. Swatches and light (F1–F7 kept)

**Look-alike swatches.** At swatch size (20 CSS px on a phone) the pattern family dominates:

| House | Rooms | ΔE00 | Deuteranope ΔE00 |
| --- | --- | --- | --- |
| 34 | clay L1 and sand L1, both vertical stripes | 12.8 | 4.0 |
| 34 | lilac L2 diagonal and sky L0 antidiagonal hatch | 18.1 | 13.7 |
| 31 | clay L2 and rose L2, vertical and horizontal stripes | 11.6 | 14.7 |
| 31 | lilac L3 diagonal and sky L1 antidiagonal hatch | 19.8 | 15.4 |

- **New look rule S1** (`look.ts`): two rooms of a house whose patterns are of one family
  (stripes: vertical, horizontal; hatch: diagonal, antidiagonal; dots: diamonds, checks;
  crosshatch; scales) differ by **ΔE00 ≥ 21** and **deuteranope ΔE00 ≥ 12**.
  - This rules out all four pairs above.
  - Checked over all 1,792 houses of both the round-3 list and the prototype list: every house
    keeps a valid look (`color/assign3.py`, at 15/8, 18/10, 20/12 and 21/12).
- The floors, inks, chroma and F1–F7 are unchanged.

**Faint light.** The amber stripe (#ffca46) has a contrast of 1.15:1 against the palest sand and
olive floors (L0–L1, the "peach" and "green" rooms). Only its brown edge reads there, and that
edge runs on one side only.
- Each stripe gets its brown outline on **both** sides.
- The stripes widen from `HATCH_SHARE` 0.08 to 0.10.
- F5 is re-measured and must hold: the outline ≥ 3:1, and a lit cell stays closest to its own room
  (margin ≥ 0.5).
- New check F5b: every stripe is bounded by an outline ≥ 3:1 on both sides, on every floor.

### 6. Landscape

**The problem.** At 844 × 390 the board sits centred in the screen minus a 240 design-px column
on the right edge. So the board is off-centre, and the swatches, the time and the buttons crowd
that edge, far from it.

**The new arrangement.**
- The board is centred on the screen.
- The swatches go in a column to its left; the buttons and the time go in a column to its right.
- Each column is `LANDSCAPE_SIDE` = 200 design px wide and stands `SIDE_GAP` = 32 from the board.
- Where the screen is too narrow for both columns, the board shrinks, but its cells stay ≥ 80
  design px at 8 × 8.
- The result card sits in the right column, under the buttons.

### 7. House 8's demonstration

The copy steps from the resident into the beam beside it, so it stands in the resident's row or
column: lit and seen at once. Now:
- the copy appears on a lit cell that no ghost sees and that is not a solution cell;
- it prefers a cell diagonal to the resident, so it can still step out of it;
- it only squints.

The prototype's house 8 has eight such cells, two of them diagonal to the resident. Its lesson
test adds "such a cell exists".

---

### 8. Design review (`pebblit-game-craft`)

| Change | Pillar | Review |
| --- | --- | --- |
| The depth ladder | Flow | The pillar asks for calm with short spikes of thought. Round 3 had one spike at the start of each house, then 5–6 forced ghosts. Now each house has 2–3 spikes spread through the solve, with settles (the micro-wins) between them. No more than 3 ghosts fall without a thought, so the cascade after an insight stays a payoff, not autopilot. |
| | Flow | Variety. The opener differs from the two houses before it, the two-room count opens one house only, and no house repeats the shape of the solve before it. Boards grow 5 × 5 → 6 × 6 → 7 × 7 and never shrink before house 25. |
| | Fair | Every spike is a kind the hint can show: a count (with its digit), a cross or a claim. Gate A still proves there is no guessing. A cross is a visible contradiction: "a ghost here leaves that room no cell". |
| The hint's reason | Fair | The pillar says a loss has a visible cause the player can name. The reason now names its cause in beats and digits, and asking costs nothing until the hint is used. |
| The held result card | Feel | The win outweighs any move: the card is the last beat of the success stack, and nothing on failure changes. |
| | Flow | The pillar says the next level starts "without a menu in between". A card with one tap-anywhere continue is not a menu. A 2–3 minute solve has earned a held moment, and the playtester asked for one. A timed card was rejected: a timer that moves on while the player looks takes the moment away and puts the next board under a tap meant for the card. |
| | Face, Share | The card shows the content ghosts, so the face appears at its happiest; today the joke only shows on mistakes. The card becomes Epic 5's share object (web portals only; never on YouTube). |
| The relocation glide | Feel | A move must read. The afterimage gives the eye a start point and the lean gives the ghost weight. It stays neutral: no success stack. |
| Swatches, light | Fair | Rules and state must be readable: no two rooms read alike at swatch size, and light reads on every floor. |
| Landscape | Flow | Everything stays visible, with the board at the centre. |
| House 8's demonstration | Fair | One rule at a time: light alone. |

**The one-line test.** A muted 3-second clip shows a face, a satisfying cascade after one tap, and
ends with something a player would send. Depth does not change the clip. The held card gives it an
ending to send.

### 9. The coder's tasks, in order

Each task starts with a red test; `npm test` and `npm run check` must be green before the next.
The prototype's files are the reference (`sg-gateB-r3/proto`):
- `src/gen/depth.ts`, `src/gen/deepen.ts`;
- the diffs of `src/gen/params.ts` and `src/gen/build-levels.ts`;
- `tests/gate-a.test.ts`;
- the scripts `scripts/exp-*.mjs`.

Port them with the RNG calls in the same order: that order defines the houses. A refactor that
changes it needs `levels:starts` again and a new A6 measure (risk 3).

| # | Task (files) | Tests that prove it (written first) |
| --- | --- | --- |
| 1 | The depth profile (`src/gen/depth.ts`; its ranks to `params.ts`) | `tests/depth.test.ts`: tags on fixtures (a count stall, a cross stall, a budget opener, a free opening); **calibration**: houses 4–24 of the round-3 list (`tests/fixtures/round3-houses.json`, from round 3's `levels.json`) never stall twice, and every tail is ≥ 4 |
| 2 | The deepening search (`src/gen/deepen.ts`; its weights and walk constants to `params.ts`) | `tests/deepen.test.ts`: the same seed gives the same house; the stored solution stays the only one; rooms stay connected and within size; residents and lamps never move; the house is graded in canonical ids; a walk meets a small target on a fixture candidate; an idle shelf is dropped; the early stop |
| 3 | The ladder: rungs 8–24, the opener and pattern history, `LADDER_STARTS`, house 8's demo-cell check, `npm run levels:starts`; rebuild (`params.ts`, `build-levels.ts`, `scripts/levels.mjs`) | new `tests/round3.test.ts`, which replaces round 2's ladder tests (7 of them fail on the new list, as they should). It checks: houses 9–24 stall ≥ 2 times (13, 14 and 17–22 ≥ 3); a real step after ≥ 2 ghosts; tail ≤ 3; longest autopilot run ≤ 3; hard houses use 2 kinds; house 8 stalls once, after its first ghost; boards 6 × 6 at 7–8 and 7 × 7 from 9; lessons at 5, 7, 8, 10, 16, 17 and 18 with their tests; each opener differs from the two before it; the two-room count opens one house; no pattern repeats the house before; houses 25–1000 and the dailies are byte-identical to round 3's files; houses 8–24 are byte-identical to the prototype's (fixture); `levels:starts` on houses 8–10 reproduces their starts; build ≤ 600 s |
| 4 | Gate A: A6 split and raised for 8–24 only (`tests/gate-a.test.ts`, GENERATOR §9) | before the change, gate-a fails on the new list at 4–11 (median 102 > 90); after it, 43 of 43 (4–11 split into 4–7 and 8–11) |
| 5 | The hint (`core/hint.ts` steps, `game/reason.ts` beats, `session.ts` refund, `platform/storage.ts` v2, `GameScene.ts`, `visible.ts`) | unit: the reason script on a count, a cross and a claim fixture (digit badges, dots, final badge 1); `HintClock.refund`; migrating a v1 save; e2e: the first press shows the count's digit and dots on exactly the cells the grader removes; a tap elsewhere clears it and the bulb is ready at once; the second press starts the cooldown; a reload with 50 s left restores 50 ± 1 s |
| 6 | The held result card (`GameScene.ts`, `board.ts`, `hud.ts`, `layout.ts`, `config.ts`, `visible.ts`) | e2e at 360 × 640: the card is up within 2.7 s of the last placement and holds 10 s with no input; a tap at 300 ms does nothing, a tap at 700 ms continues; the waking tap after a pause does nothing; `visible()` lists its digits; layout unit test: the card never meets the board, a swatch or a button in any arrangement |
| 7 | The relocation glide (`board.ts`, `config.ts`, GDD §3a) | e2e frames every 30 ms: ≥ 3 in-between frames and an afterimage ≥ 200 ms |
| 8 | Swatch rule S1 and the lit stripes (`look.ts`, `config.ts`, `board.ts`) | `look.test.ts`: S1 over all houses (house 34 fails it today); `contrast.test.ts`: F5 kept, new F5b |
| 9 | Landscape (`layout.ts`, `hud.ts`, `dotsLayout`, `timeBox`) | `layout.test.ts` over every landscape design size (aspect 1.2–2.22): the board's centre at the screen's centre ± 1; no overlap among the board, the columns, the swatches, the time and the card; cells ≥ 80 design px at 8 × 8 |
| 10 | House 8's demonstration (`demo.ts`) | `demo.test.ts`: the copy stands on a lit cell that no resident sees |
| 11 | Docs: GDD §3.3 (the ladder), §3a (hint, card, glide), §11–§12 (card, landscape); GENERATOR §4.8 (depth profile), §6.2 (the deepening search), §7 (the rungs), §8 (starts), §9 (A6), §10.3 (this round); TASKS; docs/questions.md (§11); PROGRESS | — |
| 12 | Gates: check, test, levels:check, build, e2e, size; `code-review`; the adversarial audit (KRİTİK and YÜKSEK closed); `design:design-critique` of the swatch rule and the card (nursery check) | — |

### 10. Round-4 protocol (identical to round 3's, docs/gate-b-round2.md §9)

- **Playtester:** a **new** agent in a fresh session that never saw rounds 1–3, their logs,
  screenshots or plans, or the repository's documents, and is not told what changed. Same persona:
  knows LinkedIn Queens or Star Battle and plays a few puzzles a day.
- **Same bars, B1–B7** (TASKS). B1's statements still come after houses 3, 9 and 17.
- **Same houses:** 1–20 in order, then 27, 31 and 34. Same build mode (dev server,
  `?playtest=1`).
- **Device:** 360 × 640 portrait at 2×, full-frame screenshots only. Houses 9, 17, 20 and 34 are
  repeated at 540 × 960, 600 × 600 and 844 × 390.
- **What it reads:** screenshots, the neutral `visible()` and the neutral `state()`; no rules.
- **Screenshots:** within 0.7 s of each house appearing, then as it likes. Demonstrations also
  replay after 5 s idle.
- **Afterwards:** the main session, not the playtester, puts each house's insights from §1.5 next
  to the report.
- **Pass:** Hasan gets the graybox screenshots, then the `/test/` link; Epic 4 starts.
- **Fail:** Shy Ghosts ends (D91).

### 11. Decisions to record (docs/questions.md, from D92)

- **D92** The depth profile and its calibration on round 3: no house stalled twice, and every tail
  was 4–9.
- **D93** The ladder's depth target from house 8: ≥ 2 stalls, one after ≥ 2 ghosts, tail ≤ 3,
  autopilot runs ≤ 3, two kinds in hard houses, three stalls in 13, 14 and 17–22; house 8 is the
  one planned rest.
- **D94** The deepening search (annealing over borders and shelves, canonical grading, lesson and
  object checks inside the walk).
- **D95** The rungs 8–24:
  - 7 × 7 from house 9;
  - the roles;
  - lessons kept at 8, 10, 16, 17 and 18;
  - 15 and 24 are lean hard houses, 23 a deep rest;
  - the opener rule (unlike the two before) and the pattern rule;
  - the two-room count opens one house only.
- **D96** The start table and `npm run levels:starts`, for A8.
- **D97** A6 for houses 8–24: the values of §1.7, by the rule "prototype median + 5 s, rounded up
  to 5 s". Houses 1–7 are unchanged.
- **D98** The hint:
  - the reason in beats with digits;
  - the recharge refunded when a move cancels the reason;
  - the recharge saved (save v2).
- **D99** The held result card; no auto-advance.
- **D100** The relocation glide (320 ms, afterimage, lean).
- **D101** Swatch rule S1 (ΔE00 ≥ 21, deuteranope ≥ 12 within a pattern family); lit stripes
  outlined on both sides and widened to 0.10; F5b.
- **D102** The centred landscape arrangement.
- **D103** House 8's demonstration copy on a lit cell that no ghost sees.

### 12. Effort (coder-hours, estimate ±25 %)

| Block | Hours |
| --- | --- |
| Depth profile, deepening search, ladder, starts, rebuild, tests, Gate A (tasks 1–4) | 16 |
| Hint: beats, refund, save v2 (5) | 8 |
| Held result card (6) | 4 |
| Glide (7) | 2 |
| Swatch rule, lit stripes (8) | 3 |
| Landscape (9) | 3 |
| House 8's demonstration (10) | 1 |
| Docs, gates, review and audit fixes (11–12) | 9 |
| Round-4 playtest (main session) | 4 |
| **Total** | **≈ 50** |

### 13. Risks

1. **Bots are not people, and the forecast is a range.** §1.8 puts B5 between about 1 in 3 and 19
   in 20, with a middle of about 2 in 3. Round 2 forecast 12–15 houses at 4+, and round 3 gave 6. Nothing
   in round 3 resembles the new houses, so the calibration bounds the forecast but cannot fix it.
2. **B3 allows no guess in houses 4–11.**
   - The risk: houses 8–11 now ask for crosses, which round 3's player never needed (0
     contradiction tags). A player who does not see a cross may guess.
   - Mitigations:
     - the first cross comes alone, in a 6 × 6 lesson (house 8, after two ghosts);
     - the hint now shows a cross as a see-through ghost and the room it would empty;
     - houses 9–11 keep low d windows (≤ 22).
3. **The port must reproduce the prototype.**
   - The houses, the start table and the A6 numbers come from the prototype's code.
   - A port that calls the RNG in another order makes other houses. Then it must:
     - rerun `levels:starts` (about 16 minutes on one core);
     - re-measure A6 with the same rule;
     - stop and report if a median exceeds §1.7's ceilings. No silent raise.
4. **A4 is tight by design.**
   - MA(13) has a margin (ratio 1.51 against 1.4).
   - The d windows keep the band order and the MA(13) budget. Their worst case is a ratio of
     1.40.
   - Any change to houses 4–13 must re-check A4.
5. **Pace.**
   - By the brief's formula, houses 9–24 now take 2–2.7 minutes each, against 1–2.5 before.
   - The first session's promise ("a house won about every 2 minutes", A6's note) now holds
     only through house 8.
   - This is D91's choice of depth over pace.
6. **One more tap per house** for the held card. If the next playtester calls it friction, the
   card's guard can shrink. Auto-advance is not the fix (§8).

### The port against the plan (2026-10-23)

The port follows the prototype: houses 8–24 are the prototype's byte for byte, and houses 1–7 and
25–1000 and the dailies are round 3's (tests/round3.test.ts). Where it departs from the plan:
- **The lit stripes are 0.075 of the cell, not 0.10, and their outlines 0.04 in all.** At stripes
  of 0.10 a lit cell no longer stays closest to its own room: F5's margin falls to −1.83 (the bar
  is 0.5). The port first kept round 2's 0.08 with the outlines split over both sides (0.015 a
  side), a single device pixel on the round-4 phone (the code audit's ORTA 1); the floors F3 (the
  ring on a lit floor) and F5 allow the outlines 0.02 a side at most, with the stripes at 0.075
  (D101: F3 3.01, F5 0.70). F5b holds.
- **House 8's demonstration cell** (§7) is checked by the build after the deepening walk; the walk
  keeps the lesson test the prototype searched with, so the walk and its houses stay the same.
- **The result card** stands below the board where the board leaves room under it (portrait
  9:16), else in the bottom band left of the buttons (1:1, and portrait near it), and in the right
  column under the buttons in landscape; its four things share a row, two rows or a column,
  whichever gives the larger digits. It never meets the board, a swatch or a button.
- **The digit badges** stand outside the board where the screen leaves room (above the columns,
  left of the rows at 1:1); in portrait 9:16 the board runs edge to edge, so a row's badge sits on
  the board's edge, short of the first cell's middle.
- **Landscape's swatch column** holds the dots in two columns (three before), so they keep their
  size in a column 200 design px wide.
