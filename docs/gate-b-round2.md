# Shy Ghosts — Gate B, tune round 2 of 2 (the last): plan

Status: adopted, 2026-10-21 (decisions D80–D88 in docs/questions.md; the Gate A amendment of
§1.4 approved by Hasan, D82; what the build measured is in docs/PROGRESS.md, "Gate B tune round
2"). Author: lead designer (agent team). Readers: coordinator, coder, auditor, the round-3
playtester's handler. Nothing in the repository was edited for this plan; the evidence comes from
a copy of the repository (round 1, identical to `main` at bfd2b96, which was committed while this
plan was written) in the round's scratch folder (outside the repository; its files are cited by
name below): `sg-gateB-r2/` (`proto/src/exp/autopilot.ts`, the changed `proto/src/gen/params.ts`,
`build-levels.ts`, `relevance.ts`, `proto/tests/gate-a.test.ts`, the scripts
`proto/scripts/exp-*.mjs`, the logs `*.log` and `color/`). `orig/` holds the list round 2 played.
The repository's build of houses 1–1000 and the dailies is byte for byte the prototype's.

Fixed, as before: Gate B's bars B1–B7 and the protocol's persona and houses. Gate A's thresholds are
unchanged. One Gate A clause changes: A3/A5's **positions** of the first shelf, lamp and count
(§1.4). Hasan approved it on 2026-10-21 (D82). A fail in round 3 stops the game.

---

## 0. The round in one page

**Why B5 failed (median 3, bar 3.5), measured.** I built an *autopilot* (§1.1), a bot that plays
only the one-look patterns a Queens player uses without stopping to think:
- a room with one free cell takes its ghost;
- a room lying in one line claims that line;
- the **budget**: when a direction has exactly as many open lines as open rooms, every line needs
  a ghost (Queens' "one per row", and the round-2 player's "7 ghosts, 6 columns, only column 4 is
  split").

On the list round 2 played, the autopilot **finishes 15 of the 17 houses 4–20 with no real
insight**. The two it cannot finish, 13 and 20, are the player's 4 and 5 and its two "had to stop
and count" moments. Of the 15 it finishes, the houses rated 4 were each the first sight of
something new: the shelf (9), the split line (10–11) and the sun (17–18). Every repeat scored 2 or
3.

The round-1 rule ("two insight episodes from house 10") was met by the grader's own count. The
grader has no budget technique, though, so its `line` and `cross` steps were steps a Queens player
never needs.

**What drives a 4 or a 5:** something new, or a real insight. A real insight is a *count* (k rooms
fill k lines), a *cross* (one cell sees a whole room from two sides) or a *chain*.

**Why houses 4–8 cannot get there today.** Gate A puts the shelf at 9, the count at 12 and the lamp
at 17. That leaves houses 5–8 as 5 × 5 boards with no objects and no count. On those bands the
autopilot stalls in **0 of 240** qualifying candidates (`ap-yield-1.log`). It stays at 0 of 60
even with counts allowed (`ap-variant-1.log`); counts become necessary only from 6 × 6 (36 % of
6 × 6 candidates). So those houses can neither teach nor ask.

**What changes:**

| | Change | Proof |
| --- | --- | --- |
| a | A new ladder for houses 4–24: every house from 4 to 20 either teaches one new pattern or rule, or opens with a real insight (15 is the one rest). No free openings after house 10; no two houses in a row open alike. Shelf at 5, first count at 7, lamp at 8. A9's fixes are included. | Prototype build of all 1,792 houses in 173 s; Gate A 42 of 42 (A3/A5 positions amended); the autopilot measures in §1.5 |
| b | Demonstrations that cannot be missed. They play before input opens, hold their last frame, and replay after 5 s idle until the first move. House 1 shows a conflict, so its first move is a deduction, not a coin flip. A new drag-to-mark demonstration. | Unit tests and e2e (§2) |
| c | A room-complete pulse, a solid settled ring, a content face and a tick on the swatch. A solve cascade with rising ticks and a light ring. | Pixel-salience e2e test and the inversion test (§3) |
| d | 8 hue families × 4 lightness levels, all contrast floors kept. Up to 8 rooms, every room has its own hue and its own pattern. Rooms keep their color once settled. The time moves below the board. | Color checks; all 1,792 houses get a valid assignment (§4) |
| e | The hint's reason stays until the next move. | Unit and e2e (§5) |
| f | `state()` is neutral in playtest mode. | Banned-word test (§6) |
| g | A9: the see-through block stays a block for the namer and the time estimate; `lightNeeded` counts the resident; turned houses name their own steps. | The rebuild changes exactly one stored house, daily 2027-10-02, the auditor's case (§7) |

**B5 forecast** (bots are not people). Expected ratings are 4 for a lesson or an insight and 3 for
a rest or easy lesson. That gives about 12–15 of houses 4–20 at 4 or above; the bar needs 9 for a
median of 4. Houses 11–20 hold 6 of the 8 insight houses and 4–10 only 2, which protects B5's second
condition (the median of 11–20 at least that of 4–10).

---

## 1. Difficulty: the autopilot and the ladder (a)

### 1.1 The autopilot (`src/gen/autopilot.ts`, pure)

These are the quick patterns, each about one room or one line:

| Pattern | Rule | Grader |
| --- | --- | --- |
| single | a room with one free cell takes its ghost | T1 |
| claim | a room whose free cells all lie in one row (or column) segment claims it; other rooms' free cells there go | T2 `shape`/`lamp`/`line` |
| budget | when a direction's open lines equal the open rooms, every line needs a ghost: a line with one free cell takes it (*line single*), a line whose free cells all lie in one room holds that room's ghost (*line claim*). Three levels: whole lines only (Queens), split lines too (a shelf's line holds two), lit lines left out (a fully lit line stays empty) | none |

Real insights are what the autopilot lacks: **count** (T3), **cross** (the T2 step a claim cannot
explain) and **chain** (T4). Where the autopilot stalls, the band's grader supplies the next step.

### 1.2 The measures

| Measure | Definition |
| --- | --- |
| Finished on autopilot | AP_h, the autopilot that knows only the patterns and rules shown before house h, finishes house h |
| Teaches something | AP_h cannot finish house h, but AP_h plus the house's new pattern or rule can. A rule is proved by its test: a shelf between two solution ghosts; light needed; a solution ghost in a shelf's shadow; both lamps needed; three ghosts in one line split twice |
| Asks for a real insight | the full autopilot stalls; each stall broken only by a count, cross or chain is one **real insight episode** |
| Free opening | a room with one free cell, or a line single, on the first look |
| Opening | the pattern or insight that places the first ghost (`claim>single`, `count-row-2`, `cross` …) |
| Coin flip | before the first input, the cells of the open room that nothing shown rules out: 1 = a deduction, 2 or more = a flip |

### 1.3 The ladder (houses 1–24; from 25 on, the list is unchanged)

| House | Board | Lesson (new) or real insight | Demonstration |
| --- | --- | --- | --- |
| 1 | 2 × 2, resident | sight along a row; coin flip 2 → 1 | the resident's trails, and a see-through ghost on (0,1) covering its eyes |
| 2 | 3 × 3, resident | rows *and* columns | trails |
| 3 | 4 × 4, resident | a chain of last free cells; marks | a see-through hand drags dots along the resident's row |
| 4 | 5 × 5 | **claim** | — |
| 5 | 5 × 5, shelf, 2 residents | **shelf** blocks sight (was house 9) | trails stop at the shelf |
| 6 | 5 × 5, 2 shelves | **split budget**: a split line holds two | — |
| 7 | 6 × 6 | real insight: **count** (two rooms in two rows) at the opening (first T3, was 12) | — |
| 8 | 6 × 6, lamp, 2 shelves, resident | **light** (was house 17), no shadow yet | the beam sweeps; a see-through copy squints in it |
| 9 | 6 × 6, 3 shelves | **count** (columns) at the opening | — |
| 10 | 5 × 5, lamp, shelf | **shadow**: light stops at a shelf | the beam stops at the shelf; a copy behind it stays calm (never on a solution cell; with no such cell, only the stop) |
| 11 | 6 × 6, lamp, shelves | **count** (three rows) at the opening | — |
| 12 | 6 × 6, lamp, shelves | **cross** at the opening, then a count | — |
| 13–14 | 6 × 6, shelves | **count** at the opening (columns; three rows) | — |
| 15 | 5 × 5, shelf | rest (no free opening) | — |
| 16 | 5 × 5, 3 shelves | **three ghosts in one line** split twice | — |
| 17 | 6 × 6, lamp | **lit-line budget**: a fully lit line stays empty | — |
| 18 | 6 × 6, 2 lamps | **two lamps**, both needed | — |
| 19 | 6 × 6, lamp | **cross** then count, at the opening | — |
| 20–22 | 7 × 7, lamps, shelves | count / count / cross at the opening | — |
| 23–24 | 6 × 6, lamp | rests (no free opening) | — |

Roles: 7, 9, 11–14, 19 and 20–22 are *hard* (T3 required, naive ≤ 0.35). 4–6, 8, 10, 17 and 18
are *teach* (≤ T2). 15–16 are *breathers* and 23–24 are *rests*. Houses 4 (claim), 5 (shelf) and
8 (light) keep the lowest d of a small pool. The selection checks run cheapest first: grade, d, T3,
episodes, the lesson's test, the opening rule, the opening differing from the house before, object
relevance, then the naive player.

### 1.4 Gate A: one clause amended (approved by Hasan, 2026-10-21; D82)

- **A5:** "No furniture before house 9; house 9 sets two ghosts in one line with furniture
  between" becomes **house 5**. "No lamp before house 17; house 17's light is necessary" becomes
  **house 8**, with the resident placed (A9 DÜŞÜK). "First T3 at house 12" becomes **house 7**.
- **A3:** "No T3 before house 12" becomes **house 7**.
- **Everything else is unchanged:** A1, A2, A4 (the band medians: 4–8 = 8 < 12–14 = 22 > 15–16
  = 11; 17–19 = 15 < 20–22 = 28 > 23–24 = 10.5), A6 (4–11 median 76 s ≤ 90; 17–19 99 ≤ 105; every
  house 1–16 ≤ 130), A7, A8, A9, and the tutorial data of houses 1–3.
- **Why:** the evidence in §0. Gate A's intent is kept: each element is taught by a house whose
  solution needs it, in order, and every house is solvable with no guessing. It is the brief's
  curve (furniture at 9, lamps at 17) that the round-2 player rated 2–3 for eight houses.

### 1.5 Evidence: the round-2 list against the prototype (both measured by the same scripts)

| Measure | Round 2 | Prototype |
| --- | --- | --- |
| Houses 4–10 finished on autopilot (no lesson, no insight) | **5 of 7** (5, 6, 7, 8, 10) | **0 of 7** |
| Houses 4–20 the full autopilot finishes | 15 of 17 | 9 of 17 (the 8 lessons and the rest at 15) |
| Houses 4–20 that need a real insight | 2 (13, 20) | **8** (7, 9, 11, 12, 13, 14, 19, 20) |
| Free openings in houses 11–20 | **8 of 10** | **1 of 10** (17, its lesson) |
| Free openings in houses 4–20 | 9 | 2 (5 and 17, both lessons) |
| Consecutive houses 4–20 opening the same way | 6 of 16 pairs | **0 of 16** |
| House 1 coin flip | 2 cells | 1 cell (§2) |
| Gate A (A3/A5 positions amended) | 42 of 42 | **42 of 42** |
| `npm run levels` | 207 s (levels:check) | 173 s (A8 budget 600 s) |
| Houses 25–1000 and dailies | — | identical, except daily 2027-10-02 (A9 ORTA, §7) |

Real insight episodes per house in the prototype:
- one, at the opening, in 7, 9, 11, 12, 13, 14, 19, 20, 21 and 22 (12, 19 and 22 are a cross,
  then a count);
- none in the lessons 4, 5, 6, 8, 10, 16, 17 and 18, each of which needs its new pattern or rule
  instead;
- none in the rests 15, 23 and 24.

Logs: `proof-current.log`, `proof-r2c.log`, `summary-r2c.log`, `ap-current.log`, `gate-a-r2c.log`
and `build-r2c.log`. The yields behind the rules are in `ladder-1.log`…`ladder-4.log` and
`ap-yield-1.log`. Each rule is affordable: the rarest is the house 6 lesson at 0.3 % of qualifying
candidates.

Not done this round: requiring at least two real insights in hard houses (0–4 % yield) and
removing free openings from the late list (`no free opening` costs about +230 s of build there).
Both go to Epic 5.

---

## 2. Demonstrations that cannot be missed (b)

**Which houses:**
- 1: sight, plus a conflict. A see-through ghost appears on (0,1), and it and the resident cover
  their eyes with the dotted line. That leaves (1,1) as the one cell nothing rules out.
- 2: rows and columns.
- 3: **drag to mark**. A see-through hand drags across the resident's row and dots appear under
  it; they stay 1 s, then fade.
- 5: shelf.
- 8: light.
- 10: shadow.

**How they play:**
- **First play:** as the house appears, before input opens. It ends on a **hold frame of 800 ms**
  showing the whole lesson, so any screenshot taken in that window shows it. It lasts at most
  2.3 s; a tap skips it and never counts as a game tap.
- **Replay:** after **5 s without input**, until the house's first placement (house 3: its first
  mark), at most 3 times. A tap skips a replay without acting. A resume plays no first play, but
  the replay still applies.

**Constants:** `DEMO_HOUSES` = {1, 2, 3, 5, 8, 10}, `DEMO_IDLE_MS` 5000, `DEMO_HOLD_MS` 800,
`DEMO_REPLAYS` 3, `DEMO_MAX_MS` 2300.

**Tests:**
- unit (`demo.test.ts`): each script shows its element and ends on the hold frame; house 1's copy
  stands on (0,1), and the trails cover (0,1) and (1,0);
- e2e: input stays closed during the first play; it replays after 5 s idle and not after a
  placement; a skip is never a game tap.

---

## 3. Success louder than failure, measurably (c)

**Room settles:**
- the room's whole floor flashes (a white veil, alpha 0.45 → 0 over 300 ms);
- a **solid 6 design-px teal ring** draws in 250 ms and stays (it was a thin dashed ring);
- the ghost bobs (1.2×, 12 px, 220 ms), then keeps a **content face** (closed-eye smile);
- the swatch pops (1.5×, 160 ms) and keeps a **tick**.

The settled room has three persistent cues; a conflict keeps its two (the pose and the dotted
line).

**Conflict:** unchanged and short: ±3 px for 60 ms, the line shown twice, the pose.

**Solve cascade (about 2.4 s):**
- a hit stop of 50 ms;
- the rooms flash in reading order every min(110, 900 / R) ms. Each flash is brighter than the
  last (alpha 0.30 → 0.60), and each room gets a **tick** larger and higher than the last (1.0 →
  1.6×, +4 px per step): the rising ticks;
- after the last room, a ring of light runs from the board's center to its frame (300 ms), and
  every ghost hops and waves;
- the time ticks in **below the board**;
- the next house slides in at about 2,050 ms; a tap skips from 600 ms.

The matching rising sound (one note per tick) is Epic 4's, on the same beat list. The graybox has
no sound.

**Measured** (e2e at 360 × 640, frames every 50 ms):

| Event | Peak area of changed board pixels | Frames in motion |
| --- | --- | --- |
| Room settles | ≥ 3× a conflict's | ≥ 2× |
| Solve | ≥ 10× a conflict's | ≥ 6× |

`motion.test.ts` carries the inversion test against the updated GDD §3a rows.

---

## 4. Rooms: a hue and a pattern of their own (d)

**Palette** (verified in `color/palette-r2.log`): 8 hue families × 4 lightness levels (L* 89 / 79 /
69 / 59, chroma 17–19). The hue angles are 33, 75, 112, 159, 210, 257, 291 and 337: clay, sand,
olive, sage, teal, sky, lilac and rose.

| Floor | Threshold | Value |
| --- | --- | --- |
| F1 wall vs every floor | ≥ 4.5 | 4.99 |
| F2 neighbors: contrast | ≥ 1.3 | 1.31 |
| F2 neighbors: ΔL* | ≥ 9.5 | 9.77 |
| F2 neighbors: deuteranope ΔE00 | ≥ 6 | 6.28 |
| Any two rooms of a house, ΔE00 | ≥ 7 | 11.1 |
| F3 ring | ≥ 3 | 3.02 |
| F4 marks | ≥ 3 | 3.78 |
| F5 hatch outline | ≥ 3 | 3.24 |
| F5 lit-cell margin | ≥ 0.5 | 0.67 |
| F7 chroma | ≤ 20 | 19.0 |

No set of nine families passes every floor (F2's deuteranope limit or F5's lit margin fails), so
eight is the most the floors allow.

**Assignment rules** (`look.ts`; checked over all 1,792 houses in `color/assign.py`: 1,792 valid):
- neighbors differ in level, hue *and* pattern;
- **up to 8 rooms: every room its own hue and its own pattern.** That covers houses 1–24, 27 and
  31, and 72 % of the list;
- 9–12 rooms (508 late houses, among them 34): a hue repeats only on rooms that do not touch and
  are two levels apart, and every (hue, pattern) pair is unique. In house 34 (9 rooms) one hue
  repeats, on two rooms that do not touch, two levels apart and with different patterns; its three
  look-alike mauve rooms cannot happen again.
- Two new patterns, crosshatch and scales, give 8 in all.

**Settled rooms keep their floor.** The wash is removed; the ring, face and tick of §3 say
"settled" instead.

**Swatches:** each one is its room's floor and pattern; a settled swatch gets a tick.

**The time** shows below the board (portrait) or under it in the HUD column (landscape). Its box
never meets a swatch (layout test in every arrangement).

**B2 detail:** `visible()` names the swatch ring by its drawn color, teal. A test ties every color
word in the legend to its constant.

---

## 5. The hint stays until the next move (e)

Press 1 shows the reason: the forcing lines and rooms bright, the rest dimmed, the target room
pulsing twice a second. The reason now stays until the player's next move: a tap, a drag, an undo
or press 2. A pause freezes it. Press 2 places or removes.

**Tests:**
- unit (session);
- e2e: still shown at 5 s and 10 s; gone after a tap, and that tap acts normally.

---

## 6. A neutral `state()` (f)

Under `?playtest=1`, `state()` returns only:
- `house`, `shown`, `seconds`, `paused`, `input` (`open` or `closed`);
- `taps`, `drags`, `presses: { arrow, bulb }`, `bulbReadyIn`;
- `arrangement`, `n`, `cell`.

The tally by kind (placements, relocations, nudges, marks, shivers…), `solved`, `conflicts`,
`demos`, `finale` and `hintReason` stay available outside playtest mode for the e2e.

**Test:** the JSON of `state()` over a sample of states (mid-house, conflict, finale, demo) holds
no word from `RULE_WORDS` or the new `MECHANIC_WORDS`: placement, removal, relocation, carried,
nudge, stroke, mark, erase, shiver, demo, finale, undo, conflict, solved.

---

## 7. A9 findings (g)

- **ORTA** (`relevance.ts`): the see-through block opens sight and light at its cell, but keeps
  `objects[cell] = 'F'` and `candidate = false`, so the namer and the time estimate see a block.
  In the prototype the rebuild changes exactly one stored house, daily 2027-10-02 (the corner block
  (0,6) the auditor found), and Gate A stays green.
  - Test: that daily's block is idle by rule isolation; a renamed-only grade no longer passes.
- **DÜŞÜK** (`lightNeeded`): it solves with the residents placed (now house 8's resident).
  - Test: a house whose resident pins the solution without light → false.
- **DÜŞÜK** (turned houses): `houseAt` grades the turned house and returns its own step names.
  - Test: houses 1001–1010 and a sample of 50 equal a fresh grade of the turned house.

---

## 8. The coder's tasks, in order

Each task starts with a red test; `npm test` and `npm run check` must be green before the next.

| # | Task (files) | Tests that prove it |
| --- | --- | --- |
| 1 | The autopilot: patterns, budget levels, `apProfile`, `apOpening`, `freebie`, `openingOf` (`src/gen/autopilot.ts`) | `tests/autopilot.test.ts`: a fixture per pattern and per budget level; a count stall and a cross stall; **calibration**: houses 4–20 of the round-2 list, kept as a fixture (`tests/fixtures/round2-houses.json`), all finish except 13 and 20 |
| 2 | A9 fixes (`relevance.ts`, `build-levels.ts`, `record.ts`) | §7's three tests |
| 3 | The ladder: bands 4–24, the lesson tests (split-budget, shadow, lit-line, two-lamps, split-twice), the opening rules; rebuild (`params.ts`, `build-levels.ts`) | new `tests/round2.test.ts`, which replaces round 1's early-house tests: each house 4–10 teaches or asks (AP_h); real-insight houses stall at the opening; no free opening in 11–24 except 17; consecutive openings differ; 12 opens with a cross; elements at 5 / 7 / 8; residents only in 1–3, 5 and 8; each lesson's test; houses 25–1000 and dailies unchanged except 2027-10-02. Also `levels:check` and build ≤ 600 s |
| 4 | Gate A amendment (`tests/gate-a.test.ts`, GENERATOR §9) | Gate A 42 of 42 on the new files; the auditor's A9 re-run |
| 5 | Demonstrations (`config.ts`, `demo.ts`, `demo-play.ts`, `GameScene.ts`) | §2 |
| 6 | Success feedback (`config.ts`, `board.ts`, `GameScene.ts`, GDD §3a) | §3 |
| 7 | Palette, room looks, swatch ticks, no wash, time below the board (`config.ts`, `look.ts`, `dots.ts`, `layout.ts`) | `contrast.test.ts` with §4's floors; `look.test.ts` with §4's rules over all 1,792 houses; e2e: a settled room's floor pixels equal its unsettled ones outside the ring |
| 8 | Hint until the next move (`session.ts`, `hud.ts`, `GameScene.ts`) | §5 |
| 9 | Neutral `state()`; legend colors (`game-debug.ts`, `visible.ts`, `tests/support/rule-words.ts`) | §6 and §4 |
| 10 | Docs: GDD §3.3 (the ladder), §3a, §4; GENERATOR §4.7 (autopilot), §6, §7, §9, §10.2; TASKS; docs/questions.md (§10); PROGRESS | — |
| 11 | Gates: check, test, levels:check, build, e2e, size; `code-review`; the adversarial audit (KRİTİK and YÜKSEK closed); A9 re-run; `design:design-critique` of the 8-hue palette (nursery check) | — |

## 9. Round-3 protocol

- **Playtester:** a **new** agent, in a fresh session that never saw rounds 1–2, their logs,
  screenshots and plans, or the repository's documents, and is not told what changed. Same
  persona: knows LinkedIn Queens or Star Battle and plays a few puzzles a day.
- **Same bars, B1–B7** (TASKS). B1's statements still come after houses 3, 9 and 17.
- **Same houses:** 1–20 in order, then 27, 31 and 34. The same build mode as round 2 (dev server,
  `?playtest=1`).
- **Device:** 360 × 640 portrait at 2×. Full-frame screenshots only. Houses 9, 17, 20 and 34 are
  repeated at 540 × 960, 600 × 600 and 844 × 390, as in round 2.
- **What it reads:** screenshots, the neutral `visible()` and the neutral `state()`. Task 9 of §8 is
  green before the run. No rules.
- **Screenshots:** within 0.7 s of each house appearing, then as it likes. Demonstrations also
  replay after 5 s idle.
- **Afterwards:** the main session, not the playtester, puts each house's lesson or insight from
  §1.3 next to the report.
- **Pass:** Hasan gets the graybox screenshots, then the `/test/` link; Epic 4 starts.
- **Fail:** this was the last tune round. The work stops and Hasan gets the report.

## 10. Decisions to record (docs/questions.md)

- The autopilot measure, and its calibration against round 2.
- The ladder of houses 4–24, with lessons and real insights.
- The A3/A5 positions: shelf 5, count 7, lamp 8.
- Free openings and opening variety.
- Demonstrations: houses, hold, idle replay, drag to mark.
- Settle and finale salience, with the visual rising ticks.
- The 8-hue palette and its assignment rules; no settled wash; the time below the board.
- The hint persisting until the next move.
- The neutral `state()`.
- A9's three fixes.

## 11. Effort (coder-hours, estimate ±25 %)

| Block | Hours |
| --- | --- |
| Autopilot, A9 fixes, ladder, rebuild, tests, Gate A amendment (tasks 1–4) | 14 |
| Demonstrations (5) | 6 |
| Success feedback, pixel test (6) | 6 |
| Palette, looks, swatches, time (7) | 5 |
| Hint, neutral state, legend (8–9) | 3 |
| Docs, gates, review and audit fixes (10–11) | 6 |
| Round-3 playtest (main session) | 3 |
| **Total** | **≈ 43** |

## 12. Risks

1. **Bots are not people.** The calibration fits round 2's 17 ratings, but a new player may weigh
   lessons lower. B5 needs 9 houses at 4 or more. The ladder offers 16: 8 insights (round 2 rated
   its two insight houses 4 and 5) and 8 lessons (round 2 rated every first sighting 4). Half the
   lessons could score 3 and B5 would still pass.
2. **B3 needs no guess in houses 4–11.** The counts at 7, 9 and 11 are the first stops to think.
   The hint's reason (now persistent) shows the two rooms and two lines, so a stuck player asks
   rather than guesses.
3. **The Gate A amendment.** If it is refused, houses 5–8 stay autopilot by construction. The
   best that remains (count openings in 12 and 14, no free openings in 15–19) reaches at most the
   9 of 17 houses B5 needs, with no margin.
4. **An 8-hue palette may look like a patchwork.** The chroma stays ≤ 19, every floor is
   patterned and the walls are dark; the design critique runs before round 3.
