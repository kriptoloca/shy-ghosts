# Shy Ghosts — Gate B, tune round 1 of 2: plan

Status: adopted, 2026-10-21 (decisions D67–D79 in docs/questions.md; what the build measured is
in docs/PROGRESS.md, "Gate B tune round 1"). Author: lead designer (agent team). Readers:
coordinator, coder, auditor, the round-2 playtester's handler. Nothing in the repository was
edited for this plan; the evidence was produced on a copy of the repository in the round's
scratch folder (outside the repository; its logs are cited by name below):
`sg-gateB-r1/proto/`
(the generator changes, `src/exp/insight.ts`, `scripts/exp-*.mjs`), the colour checks in
`.../sg-gateB-r1/color/` and the build logs `.../sg-gateB-r1/build-*.log`.

Inputs: the round-1 playtest (via the coordinator), the Epic 3 audit's contrast and cell-size
findings, the repository at `main` 4e40bd2 (Epic 3, committed while this plan was written; its
level files, generator and core are those of 4cd221d, the "shipped list" below), GDD.md,
GENERATOR.md, TASKS.md, docs/questions.md, the `pebblit-game-craft` skill.

Fixed, as before: Gate A's thresholds (GENERATOR.md §9) and Gate B's bars B1–B7 (TASKS.md). This
is the first of the two tune rounds Gate B allows; if round 2 fails, the work stops and Hasan gets
the report.

---

## 0. The round in one page

**Why round 1 failed, measured on the shipped list (not only felt):**

- **No real insight early.** I named every grader step for people (§1.1). In houses 4–11, 15,
  17 and 24 every deduction is a room whose own shape puts it in one line: visible at a glance,
  no insight at all. Only 19 % of houses 4–24 and 52.5 % of houses 10–1000 ask for two real
  insights of two kinds. Houses 4–8 are five copies of one trick, as the playtester said.
- **Idle objects.** Made see-through, 1,182 of 5,171 blocks (22.9 %) change neither the solution
  nor the grader's path: house 10's block and both of house 15's, exactly the playtester's
  "blocks change nothing". Lamp light almost always matters (14 idle of 1,892).
- **Unreadable boards.** Walls 1.43:1 on the darkest floor, neighbours 1.27–1.30:1, marks
  1.8–2.0:1 on lit or glowing cells, the lit wash (alpha 0.36) recolouring part of a room so one
  room read as two, a teal glow read as light; 9 × 9 cells are 37.6 CSS px on a 360 × 640 phone.
- **Rules arrive untaught, failure is louder than success, the controls fight the player.**

**What changes (each measurable, each with a test):**

| | Change | Proof |
| --- | --- | --- |
| a | Insight taxonomy in the grader; two real insights in every house from 10, of two kinds in every band that carries difficulty; five different tricks in 4–8; consecutive teach houses differ; removing any object changes the solution or the grade, every block stops sight that matters, every lamp's light matters | prototype build of all 1,792 houses: Gate A 42 of 42 green; the new requirements 100 % (§1.4) |
| b | Boards capped at 8 × 8; cells ≥ 44 CSS px at 360 × 640; a light, muted, high-contrast palette with seven contrast floors (F1–F7); light as a hatch over the wallpaper; settled as a dashed ring | colour checks in normal vision, grayscale and a deuteranope simulation (§2.2) |
| c | Residents and a 1–1.5 s demonstration in the first house of sight, blocks and lamps | generator yield 20 % (house 9) and 3.6 % (house 17); both built (§3) |
| d | Settle bob, ring and dot; a 2 s finale; a 60 ms shiver that never repeats; the glance at 250 ms | inversion test (§4) |
| e | Drag moves a ghost; the hint shows its reason before it places | unit and e2e (§5) |
| f | One progress dot per room | unit and e2e (§6) |
| g | A neutral legend: shapes, colours, positions and poses only | banned-word test (§7) |

---

## 1. Difficulty structure (a)

### 1.1 Insights, named for people (`src/gen/grade.ts`)

The grader keeps its techniques, weights, order and grade (Gate A depends on them). It also names
each non-T1 step:

| Insight | Grader step | What the player must see | Counts as an insight |
| --- | --- | --- | --- |
| `shape` | T2: the emptied room's **starting** candidates already lie in the segment through x | a room whose own shape lies in one line claims that line | no: visible at a glance |
| `lamp` | T2: the room lies in that segment only because lamp light took its other empty cells | a lamp-made line | yes |
| `line` | T2: the room lies in that segment because ghosts placed earlier (or earlier removals) took its other candidates | a room that *became* one line | yes |
| `cross` | T2: the room's candidates lie in x's row and column segments together, in neither alone | a cell that sees a whole room from two sides | yes |
| `count` | T3 | k rooms filling k lines | yes |
| `chain` | T4 | "if here, then that room is empty" | yes |

When several rooms explain a T2 step, the simplest name wins (shape < lamp < line < cross).

- An **episode** is a maximal run of non-T1 steps (unchanged). An **insight episode** is an
  episode with at least one step that counts as an insight.
- **"Two distinct insights"** = at least two insight episodes: the forced chain stalls twice, and
  each time only a real deduction moves it on. In every band that carries difficulty (hard houses,
  cycle 1–9, manors, dailies) the two must also be of **two kinds**. Rest, breather and teach
  houses may repeat a kind (two `line` stalls), which is what makes them rests: requiring two kinds
  there too was measured at 0.09 % of candidates for house 10, 0.06 % for 15, 0.40 % for the cycle
  breathers (2–4 times rarer, about +80 s of build). It is the first lever if round 2 calls the
  rests thin.
- A house's **trick** (its signature) = its set of insight kinds, plus `block` if it has
  furniture and `light` if it has a lamp. Depth does not count: two `line` stalls are the same
  trick as one.

Checked on the repository's own fixtures: the GENERATOR.md §4.5 T2 fixture is `shape` (room B
lies in column 0 from the start), the T3 fixture `count`, the T4 fixture `chain`.

### 1.2 Object relevance (`src/gen/relevance.ts`)

Every object must pass two tests; residents stay placed during both.

- **Literal (the round's wording):** remove the object (the cell becomes empty and a candidate,
  same room); the house must lose its unique stored solution or grade differently (d, the path,
  the insight names).
- **Rule isolation:** the literal test alone lets an object through when only its freed cell
  changes the path while what it does (stop sight, cast light) changes nothing. So also: **a
  block**, made see-through (still no ghost there, but sight passes), and **a lamp**, with its
  light off (lamp → block), must each cost the house its unique solution or change the grader's
  path.

On the shipped list rule isolation flags house 10's block and both of house 15's (round 1's
report verbatim): 1,182 of 5,171 blocks (22.9 %) and 14 of 1,892 lamps; the literal test flags
644 of the 7,063 objects.

### 1.3 The house rules (`src/gen/params.ts`, `src/gen/build-levels.ts`)

Everything Gate A fixes stays: the T2 cap of teach, rest and breather houses, the first T3 at
house 12, furniture first at 9, lamps first at 17, T4 only in manors, the naive caps, the d windows
of the bands A4 compares. The rules below are added on top.

| Houses | Board (change) | The house must ask for | Residents |
| --- | --- | --- | --- |
| 4 | 5 × 5 | only `shape` (the first deduction: a room in one line) | — |
| 5 | 5 × 5 | a `line` (a ghost's sight makes a room one line) | — |
| 6 | 5 × 5; d 4–14 (was 4–12) | a `cross` | — |
| 7 | 5 × 5; d 4–14 | two insight episodes, two kinds (`line` and `cross`) | — |
| 8 | 5 × 5; d 4–14 | two insight episodes, a trick other than 7's | — |
| 9 | 5 × 5, 6 rooms | one insight episode; the furniture-between pair (A5) | two, in one line with the block between them |
| 10–11 | **6 × 6** (was 5 × 5: 0 of 834 5 × 5 candidates had two insights with every block relevant), 6–7 rooms, 1–3 blocks, d 6–16 | two insight episodes; 10 needs a `cross` (so it differs from 9 by kind); 11 a trick other than 10's | — |
| 12–14 | 6 × 6 | two insight episodes, two kinds (`count` and another) | — |
| 15–16 | 5 × 5 | two insight episodes | — |
| 17 | 6 × 6, one lamp | two insight episodes, one of them a `lamp` line; light needed (A5) | one, calm, beside the beam |
| 18–19 | 6 × 6 | two insight episodes; a trick other than the house before | — |
| 20–22 | 7 × 7 | two insight episodes, two kinds | — |
| 23–24 | 6 × 6 | two insight episodes | — |
| cycle 1–3 | 7 × 7 | two insight episodes, two kinds | — |
| cycle 4–9 | 7 × 7 or 8 × 8 | two insight episodes, two kinds | — |
| manor | **8 × 8** (was 9 × 9; §2.1), 9–12 rooms, 1–6 blocks, 0–3 lamps | two insight episodes, two kinds; T3; at most one T4; above its cycle | — |
| cycle breather | 6 × 6 | two insight episodes | — |
| daily | 7 × 7 or 8 × 8 | two insight episodes, two kinds | — |

Plus, everywhere: every object passes both tests of §1.2; consecutive teach houses (4–11, 17–19)
have different tricks; `CANDIDATE_LIMIT` rises from 2,000 to 50,000 (in the prototype build houses
9–11 needed 7,799 candidates on average and 15–16 6,888; the build still fails loudly at the
limit). Check order per candidate: grade, d, T3, episodes, insights (cheap), teaching test, turn
test, relevance (solves), naive player (costly) last.

### 1.4 Evidence (all 1,000 houses and 792 dailies rebuilt on the copy)

The prototype is the repository's own generator with §1.1–§1.3 added (the insight names come from
a second grader pass in the prototype; the coder folds them into the one pass).

| Requirement (a) | Shipped list | Prototype build |
| --- | --- | --- |
| Houses 10–1000 / dailies with ≥ 2 real insights (insight episodes) | 58.8 % (583 of 991) / 64.6 % (512 of 792) | **100 % / 100 %** |
| Bands that carry difficulty, from 12 (hard, cycle 1–9, manors, dailies): ≥ 2 insight kinds | 79.7 % (1,343 of 1,686) | **100 %** (1,686) |
| Rest, breather and teach houses from 12: ≥ 2 kinds (not required) | 6.3 % (6 of 95) | 40.0 % (38 of 95) |
| Houses 4–24: ≥ 2 insight episodes of ≥ 2 kinds | 19.0 % (4 of 21) | 52.4 % (11 of 21; 4–9 teach one trick each, rests repeat a kind) |
| Houses 5–9 with ≥ 1 real insight | 0 of 5 (all `shape`) | **5 of 5** |
| Consecutive teach houses with the same trick (kinds) | 6 of 9 pairs | **0 of 9** |
| Objects idle by rule isolation (blocks; lamps) | 1,182 of 5,171; 14 of 1,892 | **0 of 4,222; 0 of 1,920** |
| Objects idle by the literal test | 644 of 7,063 | **0 of 6,142** |
| Houses with an idle object (either test) | 797 of 1,735 (45.9 %) by rule isolation alone | **0 of 1,732** |
| Largest board | 9 × 9 | 8 × 8 |
| **Gate A (the repository's `tests/gate-a.test.ts`, unchanged)** | 42 of 42 | **42 of 42** (83.6 s) |
| `npm run levels` (this container, one core; A8 budget 600 s) | 120 s | 448.8 s |

Logs in `.../sg-gateB-r1/`: `build-v3.log`, `gate-a-v3.log`, `verify-v3.log`, `verify2-v3.log`,
`literal-v3.log`, `kinds.log` (scripts `proto/scripts/exp-verify.mjs`, `exp-verify2.mjs`,
`exp-literal.mjs`, `exp-kinds.mjs`). v3 is the final prototype; the earlier logs are superseded.

The first houses as built (episodes in order; `|` separates episodes):

```
house  board  blocks  lamps  residents  insight steps per episode (| between episodes)
  4    5×5      0       0        0      shape
  5    5×5      0       0        0      shape | line
  6    5×5      0       0        0      shape | cross
  7    5×5      0       0        0      shape | line | cross
  8    5×5      0       0        0      shape | line | line
  9    5×5      1       0        2      line
 10    6×6      2       0        0      cross | line
 11    6×6      2       0        0      line+line | line
 12    6×6      2       0        0      count | line+line+line
 13    6×6      3       0        0      shape+shape+count | line
 14    6×6      2       0        0      count | line+line
 15    5×5      2       0        0      line | line
 16    5×5      1       0        0      line | line
 17    6×6      1       1        1      lamp | line
 18    6×6      2       1        0      lamp+lamp | cross
 19    6×6      1       1        0      line | line
 20    7×7      2       2        0      lamp+lamp+count | line+line+line
 21    7×7      2       1        0      line+line | line+line | line+count
 22    7×7      2       1        0      line+line | line+count
 23    6×6      1       1        0      line | line
 24    6×6      1       1        0      lamp | line
 27    7×7      1       1        0      lamp+lamp | line
 31    8×8      3       3        0      line+line+line+line | count
 34    8×8      3       1        0      lamp+count+line+line+line+line+line | line
```

On the shipped list houses 4–11, 15, 17 and 24 have no insight episode at all (every step
`shape`). Teach tricks in the prototype: 4 {}, 5 {line}, 6 {cross}, 7 {cross, line}, 8 {line},
9 {block, line}, 10 {block, cross, line}, 11 {block, line}; 17 {block, lamp, light, line},
18 {block, cross, lamp, light}, 19 {block, light, line}.

Band report of the prototype build (d, estSeconds, naive, shallow; p10/p50/p90):

```
group: houses | d p10/50/90 | estSeconds p10/50/90 | naive p10/50/90 | shallow p10/50/90 | T1/T2/T3/T4 steps | candidates mean | d-window yield
1–3 tutorial: 3 | 1/2/3 | 10/21.5/36 | 1.000/1.000/1.000 | 1.000/1.000/1.000 | 6/0/0/0 | – | –
4–8: 5 | 8/11/14 | 65.5/73.5/81.5 | 0.219/0.375/0.500 | 1.000/1.000/1.000 | 25/11/0/0 | 785.2 | 0.52
9–11: 3 | 7/13/16 | 60/95/103 | 0.250/0.500/0.500 | 1.000/1.000/1.000 | 18/6/0/0 | 7798.7 | 0.32
12–14: 3 | 19/22/22 | 110/116.5/118 | 0.042/0.083/0.250 | 0.156/0.333/0.333 | 21/8/3/0 | 1083.0 | 0.26
15–16: 2 | 12/12/12 | 74.5/74.5/76 | 0.375/0.375/0.375 | 1.000/1.000/1.000 | 12/4/0/0 | 6888.0 | 0.33
17–19: 3 | 11/12/15 | 87/91/97.5 | 0.319/0.375/0.500 | 1.000/1.000/1.000 | 17/7/0/0 | 2514.0 | 0.98
20–22: 3 | 22/28/29 | 136/150.5/156 | 0.118/0.139/0.250 | 0.233/0.417/0.500 | 22/13/3/0 | 83.7 | 0.29
23–24: 2 | 12/12/12 | 91/91/91 | 0.198/0.198/0.354 | 1.000/1.000/1.000 | 12/4/0/0 | 380.5 | 0.32
cycle 1–3: 267 | 19/24/29 | 127/140.5/154.5 | 0.039/0.120/0.250 | 0.167/1.000/1.000 | 2061/1114/149/0 | 215.5 | 0.27
cycle 4–9: 533 | 27/34/41 | 153.5/176.5/205 | 0.021/0.069/0.208 | 0.062/0.250/0.500 | 4385/2739/872/0 | 203.5 | 0.29
manors: 88 | 44/53/64 | 215.5/241.5/270.5 | 0.007/0.030/0.095 | 0.032/0.125/0.403 | 854/852/199/4 | 160.2 | 0.28
cycle breathers: 88 | 12/12/13 | 86.5/91/93.5 | 0.208/0.289/0.375 | 1.000/1.000/1.000 | 559/176/0/0 | 622.1 | 0.50
dailies: 792 | 22/28/33 | 137.5/161/184.5 | 0.032/0.109/0.250 | 0.125/1.000/1.000 | 6304/3955/558/0 | 80.0 | 0.30
```

---

## 2. Readability (b)

### 2.1 Board and cell size; pace or depth

- **Rule:** cells ≥ **44 CSS px** on a 360 × 640 phone in portrait and ≥ **66 CSS px** at
  540 × 960 (the same layout scaled), and ≥ 80 design px in every arrangement (kept). 44 px is the
  common touch-target floor (WCAG 2.5.5, the platforms' guidelines). The 9:16 design is 1080 wide,
  so at 360 × 640 one design px is 1/3 CSS px.
- **A 9 × 9 house cannot meet it in portrait:** even edge to edge, 360 / 9 = 40 CSS px. 8 × 8
  meets it only if the board is 1,056 design px wide: **the portrait side margin goes from 32 to
  12 design px** (`LAYOUT_MARGIN`), giving 132 design px = 44.0 CSS px at 360 × 640 and 66 at
  540 × 960; 7 × 7 gets 50 and 75. The playtester's 70 CSS px is reachable at 360 × 640 only up
  to 5 × 5; it is met at 540 × 960 up to 7 × 7.
- Round 1's zoom at house 17 was contrast, not size: a 6 × 6 cell is 56 CSS px at 360 wide.
  §2.2 fixes the contrast; the size rule protects the big boards.
- **Board cap: no house above 8 × 8.** Only the manors change (9 × 9 → 8 × 8 with 9–12 rooms and
  1–6 blocks); cycle houses and dailies already top out at 8 × 8. In the prototype build the 88
  manors (8 × 8) have d 44 / 53 / 64 (p10 / p50 / p90), each above its cycle (Gate A's manor
  test passes), and 216 / 242 / 271 s by the formula, against a 265 s median for 9 × 9 manors
  under the same rules.
- **Pace or depth (my open question to Hasan, now my recommendation): pace, with depth from
  deductions instead of area.** No board above 8 × 8; late houses stay 7 × 7–8 × 8; depth comes
  from §1's rules (two insights from house 10, two kinds from house 12, T3, the manors' lead).
  Reasons: readability on the phones we target, the formula's 2–4-minute late houses, and round
  1's own words ("houses 27, 31 and 34 are hard to read rather than hard to solve"). Hasan can
  still overrule it; nothing in round 2 depends on 9 × 9.

### 2.2 Palette and contrast floors

A light, muted, "old wallpaper" house: 12 floor colours = 4 lightness levels × 3 hue families
(dusty rose, sand, slate: the hue triple that stays apart best for deuteranopes), chroma ≤ 20, a
wallpaper pattern on every floor (no plain floors), dark walls. The page around the board stays
dark (night outside a lit house). Contrast = WCAG relative-luminance ratio; ΔE00 = CIEDE2000;
grayscale = luminance only; deuteranope = Machado et al. 2009 at severity 1.0. Each floor below
is a test over every colour pair it names.

| # | Floor | Threshold | Today | Proposed palette |
| --- | --- | --- | --- | --- |
| F1 | Wall vs every floor in every state (plain, lit, settled) | ≥ 4.5:1 | 1.43:1 | 5.0:1 |
| F2 | Neighbouring rooms: luminance contrast | ≥ 1.3:1 | 1.27–1.30:1 | 1.32:1 |
| F2 | … lightness difference (holds in grayscale) | ΔL* ≥ 9.5 | — | 10.0 |
| F2 | … deuteranope | ΔE00 ≥ 6 | — | 6.5 |
| F2 | … pattern | different | different | different |
| — | Every room of a house a different colour (pairwise in the palette) | ΔE00 ≥ 7 | 4 tones, repeated | 7.2 |
| F3 | Settled vs not: the dashed ring vs every floor, in normal vision, grayscale, deuteranope | ≥ 3:1 each | 1.26:1 (glow), tone only | 3.04 / 3.04 / 3.04 |
| F3 | … the settled wash keeps the room closest to its own colour | ΔE00 margin ≥ 0.5 | — | 1.0 |
| F3 | … settled cue vs light cue | different geometry (dashed ring vs hatch), teal vs amber | teal wash read as light | ring vs hatch |
| F4 | Marks vs every floor in every state | ≥ 3:1 | 1.8–2.0:1 | 3.76:1 |
| F5 | Light: hatch outline vs every floor | ≥ 3:1 | wash, no outline | 3.29:1 |
| F5 | … a lit cell stays closest to its own room's colour | ΔE00 margin ≥ 0.5 | failed (one room read as two) | 1.7 |
| F6 | Every line or dot drawn on floors (sight line, glance rays, marks, ring) and every object's outline (furniture, lamp) | ≥ 3:1 vs every floor state | white lines on dark | dark ink lines |
| F7 | Not a nursery palette, not a coloured grid | floor chroma ≤ 20; every floor patterned | — | 19.0; all patterned |

Starting palette (verified above; Epic 4's art may change any value inside the same floors):

- Floors by level (rose, sand, slate): L*89 `#f1d9e3 #efdccf #c9e4ed`; L*79 `#dcbbc8 #d8bfac
  #a4cad5`; L*69 `#c49eae #c0a38d #81b0be`; L*59 `#ac8394 #a78870 #6196a5`.
- Wall `#1c2025`; marks `#2e353d`; settled ring `#004c45` (dashed, inset 4 design px from the
  wall, so it never reads as a wall) and wash `#7cd6ca` at alpha 0.15; light hatch `#ffca46`
  stripes with a `#633010` outline, covering ≤ 12 % of a lit cell, over the unchanged wallpaper.
- Room styles (`src/game/look.ts`): the lightness level by a proper 4-colouring of the room graph
  (neighbours always differ by a level), the hue so that level and hue are unique per room (12
  colours ≥ the 12 rooms an 8 × 8 manor holds), the pattern by a proper colouring with six
  patterns (vertical and horizontal stripes, two diagonals, dots, checks; plain removed).
- **Walls:** clamp(0.09 × cell, 12, 18) design px (≥ 4 CSS px at 360 × 640), at least three times
  the grid line; the outer frame the same.
- **Objects:** furniture drawn as a bookshelf (an upright block with at least two shelf lines and
  book spines) so it reads as furniture, not a box or a hole; the lamp disc with a dark outline.

---

## 3. Teaching each element in its first house (c)

No text. Each demonstration plays once when the house first appears (not on a resume), lasts at
most 1.5 s, and keeps input closed until it ends; a tap skips it and never counts as a game tap.

| Element | House | Residents (nightcap) | Demonstration |
| --- | --- | --- | --- |
| Sight, residents | 1 | the resident at (0,0), as today | it blinks awake; dotted sight trails run from it along its row and its column to the edges and fade (900 ms); later a tap on it only nudges (it cannot move) |
| Rows and columns | 2 | the resident at (0,1) | the same trails, shorter (600 ms) |
| Blocks | 9 | **two**, in one line with the bookshelf between them (they are two of the solution's ghosts) | each resident's trail runs toward the other and stops at the shelf with a small bump; both stay calm (900 ms) |
| Lamps | 17 | **one**, calm, beside the beam (a solution ghost next to a lit cell) | the lamp switches on and its hatch sweeps out along its row and column, stopping at the first block (500 ms); a see-through copy of the resident steps into the beam, squints and shields its eyes, and steps back (700 ms). The copy only ever stands on a lit cell, never on a solution cell |

Generator (`residents` in `params.ts`): the residents are chosen from the solution in reading
order, the first choice after which the house still needs its insights wins. Measured: house 9
with its pair, then ≥ 1 real insight: 20 % of candidates; house 17 with its resident, a lamp line
and two real insights: 3.6 %. Gate A is untouched: A5 only forbids residents in house 4, and the
grader, the solver and the players already place residents first. The brief's non-goal "givens
outside the three tutorial houses" gets a recorded exception (they teach; they never make a house
easier than its band).

---

## 4. Minimum success feedback for a fair graybox (d)

Sound stays in Epic 4; this is only what Gate B needs so success outweighs failure on screen.

- **Settle:** the ghost bobs (scale 1.15 and an 8 px hop, 160 ms), the room's dashed ring draws
  around it (250 ms), its progress dot fills with a pop (120 ms). Undone in reverse when it cools.
- **Finale, about 2.0 s:** hit stop 50 ms; rooms light one by one in room-id order every
  min(90, 700 / R) ms; every ghost hops and turns to the camera (180 ms), then waves twice
  (2 × 200 ms); the solve-time digits tick in (300 ms); the next house slides in from 1,650 ms
  (350 ms). A tap skips from 600 ms on (earlier taps are ignored, so the last placement's tap
  never skips the payoff).
- **Shiver, shorter:** ±3 px, two swings of 30 ms (60 ms in all), no repeat. The hands-over-eyes
  pose and the dotted line (two flashes, D23) carry the state while the conflict lasts.
- **Glance settled at 250 ms** (GDD §3a wins; `GLANCE_MS` 400 → 250). The long sight trails are
  the demonstrations' own constant (`DEMO_TRAIL_MS` 900, §3).
- **Inversion test** (in `tests/motion.test.ts`): every success motion moves farther and lasts longer
  than any failure motion (8 px over 160 ms against 3 px over 60 ms; a 2 s finale); no failure
  motion repeats; no flash faster than 3 a second; the finale's constants add up to 2,000 ± 100 ms.

---

## 5. Controls (e)

- **Drag moves a ghost.** A drag that starts on a player's ghost lifts it (it follows the finger,
  snapped to cells). Dropped on an empty cell of its own room: relocation. On an empty cell of a
  room without a ghost: it moves there. Anywhere else (a room that holds a ghost, a block, a lamp,
  a resident, off the board): it glides back with a nudge. One drag is one undo step. A drag that
  starts on an empty cell still paints marks, one that starts on a mark erases them (unchanged); a
  drag from a resident only nudges it. New core move `PlayState.drag(from, to)` → `relocated`,
  `moved` or `refused`.
- **The hint shows its reason first.** Press 1 places nothing. A wrong ghost: it trembles inside
  a dashed outline. Otherwise the grader runs from the current board (the player's right ghosts
  counted as residents) to the next forced placement, and the segments and rooms its steps use
  glow for 2 s while the target room pulses; the cell itself stays hidden. Press 2 (or the player's
  own placement) completes it: the wrong ghost floats away, or the forced ghost appears. Both
  presses are one hint and one cooldown. New `hintExplain(house, ghosts)` →
  `{ kind: 'remove', cell }` or `{ kind: 'place', room, cell, segments, rooms }`.

## 6. Progress dots (f)

One dot per room in the top band (portrait) or the HUD column (landscape), in room-id order, each a
swatch of its room's colour and pattern. A dot fills (dark ring and a pop) when its room settles
and empties when it cools; all dots full = solved. Text-free, digits not needed.

## 7. A neutral legend (g)

`__ghostDebug.visible()` and everything the playtester reads describe shapes, colours, positions
and poses only. D63 (Epic 3's audit fix) already removed seen, lit and lamp; the legend still names
things by what they do: "rooms", "dark block", "sun icon", "warm wash", "glowing rooms". Round 2's
legend names them by look: "area A" (not room), "thick dark lines", "a bookshelf shape", "a round
icon with rays", "yellow stripes", "a figure with both hands over its eyes", "a figure squinting
under one hand", "a figure with open eyes", "a dashed teal outline", "a small dark dot".
`RULE_WORDS` (`tests/support/rule-words.ts`, used by `tests/view.test.ts` and the e2e) grows to
these words, whole-word and case-blind, checked in every `visible()` text over a sample of house
states: room(s), see, sees, seen, seeing, sight, lit, light(s), lamp(s), sun, furniture, block(s),
blocked, resident(s), calm, settle, settled, shiver, shy, rule(s), wrong, correct, conflict(s),
solve, solved, solution, hint, glow, glowing.

---

## 8. The coder's tasks, in order (each red test first; `npm test` and `npm run check` green before the next)

| # | Task (files) | Tests that prove it |
| --- | --- | --- |
| 1 | Insight names in the grader's one pass; `insights` and `insightEpisodes` in the meta (`src/gen/grade.ts`, `record.ts`) | `tests/grade.test.ts`: the §4.5 fixtures named `shape`, `count`, `chain`; new fixtures for `line`, `lamp`, `cross` where each is the first that applies; ties name the simplest |
| 2 | Relevance, both tests (`src/gen/relevance.ts`) | `tests/relevance.test.ts`: shipped house 10's block and house 15's two blocks idle by rule isolation; a block between two solution ghosts relevant; a lamp whose light-off keeps solution and path idle; an object whose removal changes nothing idle by the literal test |
| 3 | House rules, residents, 6 × 6 for 10–11, 8 × 8 manors, signatures, `CANDIDATE_LIMIT` (`params.ts`, `build-levels.ts`); rebuild | new `tests/round1.test.ts` over the files: ≥ 2 insight episodes in every house ≥ 10 and every daily; ≥ 2 kinds from 12 in the hard, cycle 1–9, manor and daily bands; houses 4–8 = shape / line / cross / line+cross / another; 10 has a cross; consecutive teach houses differ in kinds; no object idle by either test; no board above 8 × 8; residents only in 1–3, 9 and 17, on solution cells, 9's pair across a block, 17's beside the beam and unlit. Gate A unchanged and green; `levels:check`; the build ≤ 600 s |
| 4 | Layout: portrait side margin 12 (`config.ts`, `layout.ts`) | `tests/layout.test.ts`: cells ≥ 44 CSS px at 360 × 640 and ≥ 66 at 540 × 960 for n ≤ 8; ≥ 80 design px in every arrangement; no overlap |
| 5 | Palette, room styles (`config.ts`, `look.ts`) | `tests/support/colour.ts` (has WCAG contrast, blending and the Machado deuteranope; add CIEDE2000 and L*) and `tests/contrast.test.ts` (today a printed report waiting for these thresholds) becomes the F1–F7 test over every colour pair; `tests/look.test.ts` over every house: unique colours, neighbours one level apart and a different pattern, no plain floor |
| 6 | Walls, bookshelf, lamp outline, light hatch, settled ring and wash, dark marks and lines (`board.ts`, `graybox.ts`) | unit: drawn colours equal the tested constants; e2e at 360 × 640: wall pixels ≥ 4.5:1 against the floor pixels beside them in houses 1, 17 and 34 |
| 7 | Feedback and timing (`config.ts`, `board.ts`, `GameScene.ts`; GDD §3a's table) | `tests/motion.test.ts` (it reads GDD §3a: the rows change with §4) plus the inversion assertions of §4; e2e: the finale lasts 2.0 ± 0.2 s, a tap at 300 ms does not skip and one at 700 ms does |
| 8 | Teaching demonstrations (`src/game/demo.ts`, pure timeline; `GameScene.ts`) | unit: each house's script (§3); e2e in houses 1, 9, 17: input opens ≤ 1.6 s after load, a tap skips without placing, a resume does not replay |
| 9 | Drag to move (`gesture.ts`, `state.ts`, `GameScene.ts`) | `tests/state.test.ts`: relocated, moved, refused, undo; `tests/gesture.test.ts`; e2e: a ghost dragged across rooms; a drag from an empty cell still paints |
| 10 | Two-step hint (`hint.ts`, `hud.ts`, `GameScene.ts`) | `tests/hint.test.ts`: segments and rooms for the T2 and T3 fixtures, the wrong-ghost case; e2e: press 1 places nothing, press 2 places, one cooldown |
| 11 | Progress dots (`hud.ts` or `dots.ts`) | unit: one dot per room, filled = settled; e2e: dots fill with the rooms |
| 12 | Neutral legend (`visible.ts`, `tests/support/rule-words.ts`) | `tests/view.test.ts` and the e2e: the §7 word list never appears |
| 13 | Docs: GDD §3.1, §3.3, §3a, §4, §12; GENERATOR §4 (insights), §7, §10 (this evidence); TASKS Epic 3 (round 2); docs/questions.md (§10 below); PROGRESS | — |
| 14 | Gates: check, test, levels:check, build, e2e, size; `code-review` and the adversarial audit (KRİTİK and YÜKSEK closed); then round 2 (§9) | — |

## 9. Round 2 protocol

- **A new playtester agent:** a fresh session that never saw round 1's report, logs, screenshots,
  this plan or the repository's documents, and is not told what changed.
- **Build:** the Epic 3 tree with this round's changes, `npm run build:test`, served by preview.
- **Device:** 360 × 640 CSS px portrait at device scale factor 2 (a small phone). B2 is judged on
  full-frame screenshots, never crops or zoom. Houses 9, 17, 20 and 34 are repeated at 540 × 960,
  600 × 600 and 844 × 390.
- **What it reads:** screenshots and the neutral `visible()` only (task 12 green before the run);
  `?playtest=1`, so no solution; no rules; no document before B1's statements.
- **What it plays:** the same persona (knows LinkedIn Queens or Star Battle, plays a few puzzles a
  day), houses 1–20 in order, then 27, 31 and 34 (in the new list: a 7 × 7 cycle house, a T3 cycle
  house, the first 8 × 8 manor), by real taps and drags.
- **Bars: B1–B7 unchanged** (TASKS.md). The main session, not the playtester, puts the grader's
  insight tags of each house next to the report.
- **Pass:** the main session records the report; Hasan gets graybox screenshots first, then the
  `/test/` link; Epic 4 starts. **Fail:** this was the last tune round: work stops, and Hasan gets
  the gate report with a recommendation.

## 10. Decisions to record (docs/questions.md), each with the line it rests on

- The insight taxonomy and "two distinct insights" = two insight episodes, of two kinds in the
  bands that carry difficulty; rests may repeat a kind (brief:187–200; TASKS Gate B B4).
- Object relevance: the literal test and rule isolation (see-through block, light-off lamp), both
  required (brief:56–58).
- Houses 10–11 on 6 × 6; d windows 4–14 for houses 6–8 and 6–16 for 10–11 (levers, D35;
  brief:223–224).
- Boards capped at 8 × 8; manors 8 × 8 with 9–12 rooms; the cell rule in CSS px replaces "cells
  ≥ 80 design px at 9 × 9" (brief:230, brief:350); pace over depth (my question to Hasan, answered
  as a recommendation he can overrule).
- Residents in houses 9 and 17 for teaching (brief:36, the non-goal on givens; brief:155).
- The palette, floors F1–F7 and the light hatch (brief:50–52; CLAUDE.md Rendering, rule 8).
- Feedback: settle bob, 2 s finale (GDD §3a said ≤ 1.2 s), 60 ms shiver without repeat (brief:137),
  glance 250 ms (brief:135).
- Drag moves a ghost (brief:79–81 made drags paint only); the two-step hint (brief:83–85).
- Progress dots (not in the brief; Gate B's only counter of micro-progress).

## 11. Effort (coder-hours, estimate ±25 %)

| Block | Hours |
| --- | --- |
| Generator: insights, relevance, rules, residents, rebuild, tests (tasks 1–3) | 9 |
| Layout, palette, drawing (tasks 4–6) | 9 |
| Feedback, demonstrations (tasks 7–8) | 6.5 |
| Drag, hint, dots, legend (tasks 9–12) | 9 |
| Docs, gates, review and audit fixes (tasks 13–14) | 5 |
| Round-2 playtest and its report (main session) | 3 |
| **Total** | **≈ 41** |

## 12. Risks

1. **Bots are not people.** The insight names are a model of what feels like an insight; the new
   playtester may still find the 5 × 5 houses thin. Lever: the windows and rules in `params.ts`.
2. **The build budget.** The prototype took 448.8 s (this container, one core) against
   A8's 600 s; folding the insight names into the grader's one pass and an early exit in the
   relevance test buy the coder headroom. Watch the CI runner's time.
3. **A light palette can look like a coloured grid or a nursery.** Floors are muted (chroma ≤ 20)
   and every one patterned, walls are dark ink; `design:design-critique` checks 13+ and the
   distance to region puzzles before round 2.
4. **The playtester has one more chance.** A second fail stops the game, as the fun gate intends.
