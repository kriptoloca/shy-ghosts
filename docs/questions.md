# Decisions and open questions

Every deviation from the brief, every assumption, with the reason. Newest at the bottom.
`brief:N` is line N of `briefs/shy-ghosts.md` (an unchanged copy of the planning repository's
brief of 2026-10-20). Where a decision and the brief differ, the decision wins.

## 2026-10-21 (plan: project manager and lead designer of the agent team)

Inputs: the brief; the evaluation (`peek-and-find/reports/2026-10-20-eval-shy-ghosts.md`, GO
29/35); the creator profile and the brand voice v1.2; the launch plan
(`peek-and-find/reports/2026-10-20-launch-pebblit.md`); the Munch Pixels repository (CLAUDE.md,
GDD, GENERATOR, TASKS, PROGRESS, questions, skills, configs, workflows, scripts, `src/platform`)
and its core rework spec; the house skill `pebblit-game-craft`. A throwaway prototype of the
brief's generator, grader and two player models measured the numbers behind D6–D20 (GENERATOR.md
§10; the scripts are not kept).

### Process

- **D1 The fun gate.** Gate A (pure tests over every house) closes Epic 2; Gate B (the
  playtester's verdict on the graybox) closes Epic 3; no feel, art, sound or further platform
  work before both pass; Hasan is shown nothing before, then screenshots first and the `/test/`
  link second; a gate failing after two tune rounds stops the work and Hasan gets the report.
  Reason: Munch Pixels reached feel and art while a bot that tapped any muncher able to eat won
  98.3 % of levels 1–20 (munch-pixels `docs/core-rework-spec.md` §1.1). Rests on brief:249–269
  (the build order puts feel at step 6, after the graybox) and brief:365–372 (the milestones,
  which had no fun check before M2).
- **D2 The platform layer splits around the gates.** Epic 0 ports only the shell the graybox
  needs to boot on the real SDK, save and resume, and survive a pause: `bridge.ts` with stubs,
  `storage.ts`, `host.ts`, `timeout.ts`, `resume-grace.ts`. The ad gate, analytics, haptics and
  iOS unmute move behind the gates (`haptics.ts` and `ios-unmute.ts` to Epic 4 with the feel and
  sound, `ads.ts` and `analytics.ts` to Epic 5). Rests on brief:253–254 (step 2 lists them all
  up front) and D1.
- **D3 Epic map.** Brief steps → epics: 1–2 → Epic 0; 3 → 1; 4 → 2 (Gate A); 5 → 3 (Gate B);
  6 → 4; 7, 8, 9 → 5; 10 → 6. The pause sheet stays in Epic 6 as the brief orders it; the graybox
  gets the hint in its no-ads form (D32). Rests on brief:251–269 and brief:365–372.
- **D4 The brief moves into this repository unchanged** as `briefs/shy-ghosts.md`; this file
  records every change to it. Rests on brief:4–5.
- **D5 Repository.** Local git on `main` until Hasan creates `kriptoloca/shy-ghosts` (public, so
  GitHub Pages works without a paid plan) and gives the Claude GitHub App access; the coder
  commits locally and pushes once it exists. Pages is switched on once the first build exists.
  Rests on brief:399.

### Content pipeline (GENERATOR.md)

- **D6 Cycles of 11.** "Cycles of 10: positions 1–3 at 7, 4–9 at 7–8, 10 = a 9 × 9 manor, then a
  6 × 6 breather" reads as ten cycle positions followed by the breather: a period of 11 houses
  from house 25 (manors 34, 45, …, 991; breathers 35, 46, …, 992). Read as exactly 10 houses, the
  breather would have to be position 1, which the same line puts at 7 × 7. Rests on brief:230.
- **D7 "Rising per cycle to a cap".** With `r = min(c, 10) / 10`: positions 1–3 d in
  [12 + 6r, 22 + 8r]; 4–9 in [18 + 8r, 32 + 10r]; the manor in [33 + 10r, 50 + 15r] and above
  every other house of its cycle; the breather in [6, 14]. The cap arrives at cycle 10 (house
  135). Starting values sized on the prototype (GENERATOR.md §10). Rests on brief:230 and
  brief:244–247 ("every manor is its cycle's maximum").
- **D8 T4 at manors is a cap, not a requirement.** "T4 once at the manor" = T4 is allowed only
  in manors, at most one step. Requiring exactly one T4 cut the prototype's manor yield to
  0.4–0.9 % (6–14 s per manor), which alone would eat most of the 10-minute build budget; the
  manor stays the cycle's peak through d and a required T3. Rests on brief:230 and brief:244.
- **D9 Canonical room ids** in reading order of each room's first cell, so the win cascade's
  "room-id order" sweeps down the house and two builds of one house write the same string. Rests
  on brief:144, brief:85 and brief:240.
- **D10 The daily window.** N = 7 or 8 by the seed; d in [20, 34], centered on 27, the middle of
  the regular cycle houses' full range (12 to 42); naive ≤ 0.35. Rests on brief:231.
- **D11 Grader step accounting.** A step is one technique instance (one placement, one removed
  cell, or one T3 room set), and the grader restarts from T1 after each step. Instances are tried
  tightest room first, then in reading order, so d is deterministic and counts the deductions a
  player needs before the next placement, not every removable cell. With this accounting the
  brief's windows for houses 4–24 hold 27–34 % of candidates. Rests on brief:187 and brief:198.
- **D12 T3 counts k = 2 to 4.** k = 1 is T2 by the brief's own note; above 4 the search grows
  and the prototype never needed it. Rows and columns are never mixed. Rests on brief:193–194.
- **D13 Four fields added to a house:** `grade.t` (steps per technique), `grade.episodes`,
  `players { naive, shallow }`, `role`. Gate A reads them; the brief's fields keep their names
  and meanings. Rests on brief:240–242.
- **D14 After house 1000.** House k > 1000 is house `501 + ((k − 1001) mod 500)` turned by
  `(1 + floor((k − 1001) / 500)) mod 4` quarter turns: 1001–1500 at 90°, 1501–2000 at 180°,
  2001–2500 at 270°, then unturned. The brief names only the first 90° pass. Rests on brief:233.
  **Amended by D56 (Epic 2 audit):** house `506 + ((k − 1001) mod 495)` turned by
  `(1 + floor((k − 1001) / 495)) mod 4` quarter turns (1001–1495 at 90°, 1496–1990 at 180°,
  1991–2485 at 270°, then unturned), so the cycle phase runs on across every seam.
- **D15 Seeds and selection.** Candidate 0 uses the brief's seed (`shy-ghosts/level/<id>`,
  `shy-ghosts/daily/<YYYY-MM-DD>`), candidate k ≥ 1 appends `/<k>`; the first candidate inside
  every window wins; houses 4, 9 and 17 take the lowest d among the first 50 qualifying
  candidates; manors are built after their cycle; 2,000 misses fail the build. Rests on
  brief:176–177, brief:213–216 and brief:292 ("teach easy").
- **D16 Selection rules beyond d** (the fun gate inside the generator): every generated house
  needs ≥ 1 deduction episode (the prototype found pure "last free cell" houses in the furniture
  bands); hard houses, cycle positions 4–9 and manors must use T3 (only 38–40 % of in-window hard
  houses did on their own); the naive player is capped at 0.35 (manors 0.25) on hard houses,
  cycle positions 1–9 and dailies. Rests on brief:224–231 (roles "tested hard") and D1.
- **D17 Player models.** `blind`, `naive` (sees the shiver, takes last free cells, otherwise
  guesses in the tightest room, never undoes) and `shallow` (naive plus T2), 400 seeded playouts,
  the search using the stored measurement. The naive player is the "places ghosts without full
  deduction" model of Gate A. Rests on brief:185–200 (a grader, but no player model) and D1.
- **D18 Solve time.** `estSeconds` keeps the brief's formula. By it the tutorial houses take 10,
  21.5 and 36 s (brief: ≤ 15 s), and 7 × 7 houses take about 90 s and 9 × 9 manors about 145 s
  before a single deduction step (brief: medians 30–90 s, manors about 120 s), because the scan term
  (1.5 s per empty cell) dominates. Gate A therefore gates bounds and order measured with the
  formula (GENERATOR.md §9, A6) and reports the brief's human targets beside them; the first human
  times (Hasan's session after the gates, then `level_complete`) calibrate the formula. Rests on
  brief:198–200 and brief:290–291.
- **D19 Room count capped by segments.** R ≤ the number of row segments and ≤ the number of
  column segments, since a segment holds at most one ghost; otherwise step 3 fails by
  construction. Rests on brief:207 and brief:220–231.
- **D20 Teaching tests.** House 4: no given, first step T2. House 9: 6 rooms, so two of its six
  ghosts share one of the five rows with furniture between them. House 17: its lamp's light is
  load-bearing (as furniture, ≥ 2 solutions; true for 200 of 200 prototype candidates). First T3
  at house 12; T4 only in manors. Rests on brief:95–105, brief:224, brief:227 and brief:295–297.

### Input, feel, face

- **D21 Input details.** A placement on a marked cell clears the mark; a drag paints its starting
  cell too; marks go only on empty, ghost-free cells (lit cells included); a hint's placement or
  removal is undoable like any move; the undo history lives for the session, and a reload restores
  the board, not the history. Rests on brief:74–85.
- **D22 A settled room that loses its calm ghost cools** back to dark over 200 ms with no sound of
  its own. Rests on brief:136–137 ("their rooms stay dark" covers only the new ghost's room).
- **D23 The seen line flashes twice, 340 ms apart** (100 ms on, 240 ms off, 100 ms on). Two
  flashes inside the row's 240 ms would run at about 8 a second, against the inversion test's
  "no flash repeats faster than 3 times a second". Rests on brief:137 and brief:149–150.
- **D24 Never baby-faced.** "Two big eyes, a blush" are drawn as oval eyes set high with lids and
  brows, a slim sheet silhouette, the blush as a muted stroke, no nursery pastels. Rests on
  brief:154 and brief:362 (13+).
- **D25 Sunglasses and costumes are cosmetic and keep the states readable.** When lit, the brave
  ghost's shades slide down and it squints like the others, so nobody reads it as immune to light;
  costume pieces never cover eyes or hands. Rests on brief:155 and brief:264–266.
- **D26 A ghost both seen and lit shows "seen"** (hands over the eyes) while its lamp's cells
  flash; the rules only need "not calm". Rests on brief:66–67.

### Ads, daily, platform

- **D27 The ad gate, exactly.** Play time excludes paused time; "never before house 4" = no
  interstitial after solving houses 1–3; "≥ 3 houses and ≥ 120 s" also count from the session
  start (CLAUDE.md rule 6); a solved daily counts as a house, but no interstitial plays before the
  daily, during it or in the slot right after it (the share card's moment). Rests on brief:322–325.
- **D28 Streak edges.** One shield and one save per rolling 7 days, each covering one missed day;
  a third missed day inside those 7 days, or three missed days in a row, resets the streak (the
  best stays). The save is free when rewarded ads are unsupported. Rests on brief:113–116.
- **D29 Daily range guard.** Before 2026-11-01 and after 2028-12-31 the daily door stays hidden;
  `levels:check` warns in CI from 2028-11-01. Rests on brief:109–110.
- **D30 Size.** Initial download ≤ 5 MB (the kit's target was 8 MB); 30 MB hard. Rests on
  brief:357–358.
- **D31 Save versions.** v1 (Epic 0) holds what the graybox needs (`house`, `housesSolved`,
  `current`, `sound`, `music`); v2 (Epic 5) adds the meta and daily fields with a tested
  migration, which also serves the brief's "save model's versioning" test. Rests on brief:259–260
  and brief:383.
- **D32 The graybox hint** is the no-ads form (free, 90 s cooldown); Epic 5 adds the rewarded path.
  Rests on brief:326–327 and brief:404.
- **D33 Playtest mode.** `?playtest=1` makes `__ghostDebug.solution()` return null, and
  `visible()` dumps the board as a player sees it, so the playtester plays from what is on screen.
  Rests on brief:384–386 (the hooks expose the solution).
- **D34 Gate B scope.** Houses 1–20 in order, then 27 (a 7 × 7 cycle house), 31 (a T3 cycle
  house) and 34 (the first manor), and a 1:1 and 16:9 pass on 9, 17, 20 and 34; the playtester
  gets no rules, so B1 tests that the rule teaches itself. Rests on brief:370 (M1) and the
  evaluation's riskiest unknown ("a new rule set must teach itself without text").
- **D35 Thresholds are fixed, windows are levers.** Gate thresholds (GENERATOR.md §9, TASKS.md
  Gate B) change only with Hasan's yes; the windows in `src/gen/params.ts` are starting values the
  coder may tune, recording each change here. Rests on brief:218 ("starting values; the generator
  logs the real distributions").

## 2026-10-21 (Epic 0: coder)

- **D36 `sharp` is not ported yet.** The kit's `package.json` pins `sharp` 0.35.5 only for
  `scripts/capture.mjs`; nothing before Epic 4 needs it, so it arrives with the capture (same pin,
  with its reason line then). Every other pin is the kit's. Rests on D2 and "no new dependency
  without a reason line".
- **D37 The save in memory lives in `src/game/progress.ts`** (the kit's `src/game/state.ts`),
  renamed so it is never confused with the rules' play state `src/core/state.ts`.
- **D38 `?house=N` arrives in Epic 0** (Boot sets the house to play and drops a stale house in
  progress), because `scripts/dev-url.mjs` prints the link and the smoke e2e drives the save path
  with it; `?playtest=1` stays in Epic 3, where the hooks it hides arrive.
- **D39 Bridge wrapper, two changes against the kit:** no `level_failed` message (a house cannot
  be lost, GDD §14), and the fake-ad overlay sits behind `import.meta.env.DEV` at every call site,
  so production builds drop its code; the smoke e2e checks that the shipped scripts mention none
  of `__ghostDebug`, `fpsmin`, `playtest`, `fakeads` (CLAUDE.md: dev hooks and dev URL parameters
  only inside `import.meta.env.DEV`).
- **D40 Save v1 details** (GDD §9, D31): `current` restores only when its `id` equals `house` (a
  stale slot never lands on another board); `ghosts` (the player's ghosts; givens belong to the
  house data) and `marks` are distinct cell indices below 81, ascending; `seconds` keeps fractions;
  counters are integers ≥ 0. A late first read merges as in the kit: the furthest house wins and
  keeps its own house in progress (this session's when both are on the same house, since it is on
  screen), the settings come from the store. An unknown or newer version starts fresh, as in the
  kit.

## 2026-10-21 (Epic 1: coder)

- **D41 The events of a move, exactly** (GENERATOR.md §2 leaves the details open). Order: the
  move's own events (`placed`, `relocated`, `removed`, `nudged`, `marked`), then `status` events
  in reading order of the cells, then `settled` / `unsettled` by room id, then `solved`. A
  `status {cell, from, to}` goes out for every ghost whose state changed and always for the ghost
  that was placed or moved (`from` is null for a new ghost, the state at its old cell for a moved
  one), so the scene can play the outcome row of GDD §3a without asking the rules; a removed ghost
  gets none (`removed` covers it). A placement, relocation or hint onto a marked cell adds
  `marked {cells: [cell], on: false}` right after its move event; undo plays the inverse events
  (`removed` + the mark back, a relocation back, `placed`, the opposite `marked`). `nudged.cell`
  is what nudges: the tapped furniture or lamp, the given, or, for a tap on an empty cell of a
  given's room, that room's given. A property test plays every event list back on a model
  screen and requires it to end equal to the rules (CLAUDE.md: the settled screen equals the
  rules). Rests on GENERATOR.md §2 and GDD §3a.
- **D42 Solved is final; a no-op is not a move.** Once every room is settled, `tap`, `stroke`,
  `hint` and `undo` return nothing and `canUndo` is false: input locks at the win (GDD §3.2), so
  a stray event cannot unsolve the house and `solved` is announced once. A nudge, a stroke that
  changes no mark and a tap outside the board leave no undo entry (undo would show nothing).
  Rests on GDD §3.1–§3.2.
- **D43 The hint reads the house's stored solution** (GENERATOR.md §2 writes `hint(solution)`;
  every house carries its solution). "Free candidate cells" = the room's empty, unlit cells seen
  by no ghost; only rooms without a ghost can receive the placement (once no ghost is wrong,
  these are exactly the unsettled rooms of a valid house). A hint is a move like any other: undo
  takes it back (D21). Rests on GDD §3.1.
- **D44 What the rules check in a house's data:** the structure only (side 2–9, string lengths
  and characters, canonical base-36 ids, rooms 4-connected with ≥ 2 cells, one solution ghost per
  room on an empty cell of it, givens distinct and on their room's solution cell). That the
  solution obeys sight and light and is the only one is the content pipeline's proof (Gate A).
  The format constants (`N_MIN`, `N_MAX`, `ROOM_ID_RADIX`, `ROOM_MIN_CELLS`) live in
  `src/core/house.ts` next to the format they define, as the kit keeps its rule constants in
  `src/core/game.ts`; the save's cell bound now derives from `N_MAX`. Segments are numbered rows
  first in reading order, then columns column by column (T3 counts rows before columns,
  GENERATOR.md §4.3). Rests on GENERATOR.md §1–§2.
- **D45 `src/gen/rng.ts` arrives in Epic 1** (copied from the kit), not Epic 2: the rules'
  property tests draw their 2,000 random houses from it. Rests on CLAUDE.md (all randomness
  through `Rng`) and TASKS.md Epic 1 (property tests).
- **D46 Restoring a house in progress never throws** and keeps only what fits the house: a
  saved ghost off the board, on furniture or a lamp, in a given's room, or in a room that already
  holds one (the lower cell wins) is left out, and so is a mark off the board or under a ghost.
  `src/data/tutorial.ts` stores each tutorial solution as GDD §3.3 lists it; the build (Epic 2)
  derives it again with the solver, and Gate A compares the two (A5). Rests on GDD §9 and D21.

## 2026-10-21 (Epic 1 audit fixes: coder)

The independent audit of Epics 0–1 (0 KRİTİK, 0 YÜKSEK, 2 ORTA, 9 DÜŞÜK; its own oracle agreed
with the rules on 488,915 moves) and the main session's instructions behind these decisions.

- **D47 A save that could not be read is never overwritten** (audit ORTA 1). `migrate` reads the
  v1 fields from any integer version ≥ 1, since every later version only adds fields (D31); a
  missing, broken or fractional version is garbage. A backend's `get` now rejects when the store
  could not be read (`BridgeStorageBackend`, `LocalStorageBackend`), so `SaveStore` tells four
  cases apart: read (a save, nothing or garbage: saves write), newer (a later version's save: played
  from, never written over, for the whole session), pending (the first read missed its 4 s: saves
  wait for it and merge, as before) and unread (the read failed, or the late read gave up after
  30 s: every save reads again first and writes only once a read succeeds, merged). Nothing is
  written before the first read. A save that lands after the boot reaches the running progress
  through `onLateSave` (it replaces the kit's `late()`). Supersedes the "newer version starts
  fresh" line of D40.
- **D48 A status event names its causes:** `by` (the ghosts that see it after the move, for the
  dotted lines) and `lamps` (every lamp whose light reaches it, for the flash; plural because a
  cell can be lit from up to four sides; filled even when the ghost shows "seen", D26). The house
  model gives `lampsOf` per cell. Both are checked against brute force on 2,000 random houses.
  Rests on GDD §3a (audit DÜŞÜK 7).
- **D49 A board restored already solved says so** (`PlayState.solvedAtStart`): a crash between
  the last move and the house-solved save leaves a save that restores solved, and the rules never
  announce `solved` for it. Epic 3 checks it after every restore and plays the win (or moves on)
  itself. Rests on GDD §3.2 (audit DÜŞÜK 6).
- **D50 Progress guards** (`src/game/progress.ts`): `recordHouseInProgress` keeps and writes a
  house in progress only for `progress.house`; `advanceHouse(solved)` keeps the furthest house
  (`Math.max`, as the kit did), because with no title screen a late read can move the house on
  while house 1 is on screen; `persistProgress` never writes a stale slot. Epic 3 changes the save
  only through them. Rests on GDD §9 (audit DÜŞÜK 8).
- **D51 Constants live where CLAUDE.md says**, not next to their code: the house format
  (`HOUSE_N_MIN`, `HOUSE_N_MAX`, `ROOM_ID_RADIX`, `ROOM_MIN_CELLS`, `QUARTER_TURNS`), the boot
  steps, the iOS re-check delays and the resume grace moved to `src/config.ts` (supersedes that
  part of D44). The pure modules may import `src/config.ts`, which imports nothing (ESLint
  enforces both); `tests/source-rules.test.ts` allows no other number than 0, 1, 2 and ½ in
  `src/core`, `src/game` and `src/main.ts`. Rests on CLAUDE.md "No magic numbers" (audit DÜŞÜK 11).
- **D52 The model screen is strict** (`tests/support/screen.ts`, the reference for Epic 3's
  screen e2e): it requires a state for every placed or moved ghost, rejects a state that did not
  change for a ghost that did not move, checks every room id, where a mark may change, what may
  nudge, the phase order, the lit rooms and the win. Five faults the auditor planted in the rules
  went past the old screen; all five (and a sixth) now fail its property test
  (`tests/screen.test.ts` pins each reason). Rests on CLAUDE.md ("the settled screen always
  equals the rules") (audit ORTA 2).
- Also fixed (audit DÜŞÜK 3–5): the submission ZIP's fixed time is local midnight, so its bytes
  match in every time zone (tested under UTC, Europe/Istanbul and America/Los_Angeles);
  `audit-dist.mjs` fails on protocol-relative links, and it and `size.mjs` find dist/ from a path
  with a space or "ü" (`fileURLToPath`); the production smoke test scans every shipped file and
  waits for the SDK's own `platform_message_sent` record of GameReady instead of sleeping. Left as
  they are, on the main session's word: the `.claude/` hooks and the Pages workflow (DÜŞÜK 9–10).

## 2026-10-21 (Epic 2: coder)

The content pipeline: solver, grader, players, generator, `npm run levels`, Gate A A1–A8.

- **D53 Generator details GENERATOR.md §6 leaves open**, settled on the first builds.
  (1) Step 2 caps R by the row and the column segments that still hold an empty, unlit cell (a
  segment lit from end to end holds no ghost; refines D19) and drops the candidate ("segments")
  when that cap is below the band's lowest room count, so no house gets fewer rooms than its band.
  (2) Step 3's backtracking stops a branch once the open cells can no longer span enough row and
  column segments for the ghosts still missing; without it most 7 × 7 and 8 × 8 searches ran into
  the 4,000-node limit. (3) Step 4 draws the room by weight 1 / size², then one of its free
  neighbors uniformly. (4) Step 5 looks for a cell to move in up to 16 other solutions
  (`UNIQUE_FIX_ALTERNATIVES`), not only the first, whose extra cells are often all locked (a move
  would split a room or overfill its neighbor). (5) "T3 required" means at least one T3 step in
  the grade. (6) Houses 4, 9 and 17 keep the lowest d of the first 50 qualifying candidates; if
  fewer than 50 qualify within the 2,000-candidate limit, the lowest of those (it never happens:
  they took 642, 812 and 790 candidates). (7) The build fails loudly when the grader's ghosts
  differ from the generator's solution. (8) The generator uses `ROOM_MIN_CELLS` and
  `ROOM_ID_RADIX` from `src/config.ts`, and the technique numbers have names (`T1`–`T4` in
  `params.ts`); `tests/source-rules.test.ts` now also holds `src/gen` to 0, 1, 2 and ½, except
  `params.ts` and the published constants of the PRNG and the calendar (`rng.ts`, `dates.ts`).
  The build tries 25–64 candidates per house on average and takes 134–143 s on one core.
  Rests on GENERATOR.md §6, D15 and D19.
- **D54 Houses 501–1000 grade the same in all four quarter turns** (tune round 1 of 2, for A8).
  GENERATOR.md §7 says the turned houses after 1000 keep "the solution and the grade" because the
  rules are symmetric. The solution does; the grade need not, because the grader's order (room
  ids, cells in reading order, T3 rows before columns) does not turn with the house, so a turned
  house can take another path. The first build failed A8: house 1001 (house 501 at 90°) graded
  d 35 against its stored 29, and only 279 of houses 501–1000 kept their grade in all four turns
  (178 changed at 90°, 102 at 180°, 175 at 270°). The fix is a generator rule, no threshold moved:
  the bands from house 501 on are `turnable`, and the build keeps only candidates that grade the
  same in every quarter turn (`gradeTurns`, after the teaching test and before the naive player).
  221 of houses 501–1000 changed; houses 1–500 and the dailies stayed byte-identical; all 1,500
  turned houses 1001–2500 keep one solution and the grade (a Gate A test checks each); the build
  went from 119 s to 134–143 s. Rests on D14 and GENERATOR.md §9 (A8).

## 2026-10-21 (Epic 2 audit fixes, tune round 2 of 2: coder)

The auditor's independent re-check agreed with the files on every uniqueness, every grade and
the naive policy itself, and failed A9 on sampling noise in the stored win rates (KRİTİK 1,
YÜKSEK 2, ORTA 3, DÜŞÜK 4–7). No Gate A threshold moved.

- **D55 Exact win rates** (audit KRİTİK 1 and ORTA 3; supersedes GENERATOR.md §5's 400 seeded
  playouts and their seeds for the stored rates). A 400-playout estimate has a standard error of
  0.025 at p ≈ 0.5, so the auditor's ±0.07 is only 2.8 of them, and the build selected on the same
  noisy number it stored: 14 capped houses passed the 0.35 cap with exact rates of 0.354–0.375
  (houses 103, 171, 306, 351, 440, 447, 469, 510, 846 and five dailies), and house 651 stored
  0.5725 against an exact 0.5. `exactWinRate` (src/gen/players.ts) walks the policy over every
  guess it can make, each weighted by its probability (a uniform room among the tied ones, then a
  uniform free cell), with the same forced steps as a playout in between; a board met twice is
  weighed once (keyed by its free cells, which at a guess also say which rooms are open). The
  result is exact and deterministic to the bit; the build selects on it and stores it, for both
  players, and the seeded playouts (`winRate`) stay only as a cross-check. All 1,792 houses take
  0.6 s for both players (the slowest 8.6 ms; a limit of 1,000,000 boards fails loudly, never
  silently). Tested: the T2 fixture by hand (naive 1/2, shallow 1), the T3 fixture by hand
  (naive 5/18), an independent enumeration in exact fractions on 300 small houses
  (`tests/support/policy.ts`, written from §5 alone), 50,000 playouts on four houses, and the
  auditor's 0.5000 and 0.4049 for houses 651 and 486. The rebuild changed 19 houses and 11
  dailies: the 14 over the cap (nine houses, five dailies); houses and dailies where an earlier candidate had been rejected on
  a noisy estimate above the cap and is within it exactly (28, 69, 104, 546, 853, 894 and six
  dailies); and 501, 503–505, which D56 no longer turns. Every other house plays as before (its
  play record is byte-identical); only its stored rates changed, to the exact ones.
- **D56 The turned list keeps the cycle phase** (audit DÜŞÜK 4; amends D14). House 501 is cycle
  position 4 and 500 is not a multiple of 11, so houses 996–1006 were 11 cycle-high houses in a
  row and 16 houses separated breathers 992 and 1008, and that recurred every 500 houses. Now
  house k > 1000 is house `506 + ((k − 1001) mod 495)`, turned by
  `(1 + floor((k − 1001) / 495)) mod 4` quarter turns: 495 is 45 whole cycles ending at house
  1000 (`ROTATION_CYCLES` in params.ts), so house 1001 is position 9 like 506, 1002 a manor,
  1003 a breather, and every house past 1000 has the position its place gives (tested over
  1001–5455). The turn rule (D54) now covers houses 506–1000. GENERATOR.md §9's A8 example
  "houses 501–510 at 90°" means the first ten turned houses, 1001–1010, now houses 506–515; the
  test checks those and all 1,485 turned houses 1001–2485.
- **D57 Play files and build metadata** (audit DÜŞÜK 5). `npm run levels` writes four files:
  `levels.json` and `dailies.json` hold only what play needs (id, n, rooms, objects, givens,
  solution; 197 KB and 168 KB), `levels-meta.json` and `dailies-meta.json` the grade, the exact
  rates, the role and the seed, for the tests and the build report (no source file imports them;
  a test checks it). `src/data/houses.ts` is what the game reads: `playHouse(k)` from
  `levels.json`, which joins the first download (1.46 MB + 197 KB, inside the expected 2 MB), and
  `dailyHouse(date)`, which imports `dailies.json` on first use, so Vite emits it as a chunk of
  its own, loaded from the same origin by a relative path (a test builds it with Vite and checks
  both). Each play file has a 256 KiB budget (tested).
- **D58 The build's time budget and root** (audit YÜKSEK 2 and DÜŞÜK 6). `scripts/levels.mjs`
  exits non-zero above 600 s (A8; `--budget=SECONDS` can only lower it) and the CI step has
  `timeout-minutes: 10`. Vite's SSR loader is rooted at the repository
  (`scripts/lib/levels.mjs`), so the script runs from any working directory; before, it failed
  at once outside the repository root ("Failed to load url /src/gen/build-levels.ts"). `--smoke`
  builds houses 1–5 and one daily and writes nothing; the tests run it from outside the
  repository, once with `--budget=0` to see the budget fail it.
- Also fixed (audit DÜŞÜK 7): the boot bar's fill started at the house's left edge instead of the
  bar's (equal only because both are 360 px wide). The boot screen's geometry is now the pure
  `bootLayout` (src/game/layout.ts), tested with other house widths.

## 2026-10-21 (Epic 3: coder)

The graybox loop for Gate B, after the A9 re-audit's three DÜŞÜK items: GENERATOR.md §5, §7, §9
and GDD.md §7, §9 now follow D55 (exact rates) and D56 (house 506 + ((k − 1001) mod 495)), no
threshold changed; GENERATOR.md §5 records why the exact walk fails the build at
`PLAYER_STATE_LIMIT` instead of storing a partial value; `scripts/size.mjs` reports the first
download and the lazy chunks apart (tested on a planted dist/).

- **D59 Graybox readability** (TASKS.md Epic 3; Gate B judges a player who gets no rules). Rooms:
  four lightness steps of one slate hue and six wallpaper patterns (plain, dots, vertical and
  horizontal stripes, two diagonals); neighbouring rooms differ in both (two proper colourings
  of the room graph, checked on all 1,795 houses), so the board reads as a floor plan, never as a
  coloured grid; walls are dark and 7–14 px against a 2 px grid. Ghost states differ in shape,
  lightness and colour at once: calm, a white sheet with two dark eyes (its room glows teal);
  seen, a lavender sheet with both arms raised to white mittens over the eyes and shiver ticks
  at its sides (plus the ±4 px shiver and a ±2 px one every 1.5 s); lit, a yellow sheet squinting
  under a flat shading hand; a resident adds a nightcap with a white cuff and a pompom that
  covers neither eyes nor hands. Marks are small grey dots with no face. A solved house gets a
  warm frame and its rooms flash in room-id order. Two aids beyond GDD §3a, for Fair (a visible
  cause for every shiver): a faint dotted line joins every two ghosts that see each other for as
  long as they do (the GDD's double flash still plays on top), and a calm ghost's glance draws
  dots along its row and column to the first blocker. Epic 4 replaces the art and may drop or
  tune both aids.
- **D60 Input and session details.** A gesture must start on the board (the HUD buttons have
  their own press-and-release); a drag follows fast moves cell by cell; a platform pause cancels
  the gesture and any button press in hand. The solve time starts at the first pointer-down on
  the board (GDD §3.2 "the first input") and counts only unpaused play. A conflict, for the
  save's `conflicts`, is a move after which a ghost is seen that was not seen before. The free
  hint's 90 s cooldown counts unpaused play across houses for the session (a reload resets it).
  A tap during the win beat skips to the slide, one during the slide ends it. The house in
  progress is written 400 ms after the last change, and at once on a platform pause, a hidden
  page, `pagehide` and the scene's end. Arrow keys and Enter (GDD §3.1, optional on desktop) are
  not built.
- **D61 Layout** (`computeLayout`, GDD §12): portrait when the design size is at least 1.2 times
  taller than wide (bands 180 px above, 240 px below with the buttons), landscape when 1.2 times
  wider (a 240 px column on the right), the square arrangement in between (132 px bands above and
  below). The board is the same square for every side, so cells are 112.9 px at 9 × 9 on 9:16 and
  16:9 and 83.6 px at 1:1, never under 80 px (tested over every design size in 40 px steps, both
  orientations).
- **D62 Dev hooks for the e2e and the playtester.** `drawn()` reads the display objects back
  (a ghost's cell from its position, its state from its texture, marks from visible dots, glowing
  rooms from the glow's alpha, the solved frame), `rules()` reads the play state, `events()` returns
  every event list the scene played; the e2e replays them on the strict model screen (D52) and
  requires drawn = model = rules once the motion has settled, after every step and after rapid
  taps. `visible()` writes the scene's board picture as text (rooms with walls, light and objects,
  ghosts with states and who sees them, marks, glowing rooms); `state()` adds a per-house tally of
  taps, placements, removals, relocations, nudges, strokes, marks, undos, hints and shivers for
  the playtester's logs. Under `?playtest=1` no hook returns the solution.

## 2026-10-21 (Epic 3 audit fixes: coder)

The independent audit of Epic 3 found 0 KRİTİK, 3 YÜKSEK, 3 ORTA and 5 DÜŞÜK; each fix below
started with its test seen failing (docs/PROGRESS.md, "Epic 3, independent audit").

- **D63 `visible()` describes only what is drawn** (audit YÜKSEK 1; supersedes D62's wording of
  it). The playtester reads it during play and gets no rules, so it names what the screen shows
  and never a rule: ghosts by pose ("eyes open", "hands over the eyes", "squinting under a hand",
  "nightcap"), the floor as plain, a warm wash, dark blocks and sun icons, the dotted lines
  between ghosts, grey dots, glowing rooms, a plain or a warm frame. No word such as seen, lit,
  lamp, furniture, resident, calm, solved or rule appears (`tests/support/rule-words.ts`, checked
  on 500 random boards and in the playtest e2e). The text is the same with and without
  `?playtest=1`. Round 1's B1 statements were made with the old wording; whether they stand is the
  main session's call.
- **D64 Saves and presses around the edges of a house** (audit YÜKSEK 2–3, ORTA 4; amends D60). A
  flush (platform pause, hidden page, `pagehide`, the scene's end) writes the house in progress
  whenever it is in play and has started, with or without a change pending, so the time thought
  since the last move survives. The win and every tap that skips the beat or ends the slide drop
  a button press in hand, so no press reaches the next house. A touch the system cancels
  (Phaser's `wasCanceled`) is no tap, no drag and no press. Phaser 3.90 calls preventDefault on
  every `touchcancel`, which Chrome reports as a console error; only the touch e2e allows that one
  report (`TOUCHCANCEL_REPORT` in tests/e2e/helpers.ts).
- **D65 New screen sizes** (audit ORTA 5; amends D61). A layout keeps its own copy of the design
  size (Phaser passes its live `gameSize`). A RESIZE at an unchanged size builds nothing (Phaser
  sends one after every window resize besides ours); a new size builds the board once. The win
  beat's timer belongs to the scene: a new size during the beat lays the solved house out again
  and the beat plays its whole second; the next house opens at the new size.
- **D66 Dev record, effects, motion, contrast** (audit ORTA 6, DÜŞÜK 7–11). The tally counts
  shivering placements per move (one conflicting tap is 1, as B1 counts them). The move log and
  the tally (`src/dev/house-log.ts`) and `drawn()`'s read-back exist in DEV builds only; the smoke
  e2e scans the production bundle for their keys. `previous()` returns the house finished last
  (data, record, final rules), so the e2e replays every finished house on the strict model screen
  (D52); `state()` adds `builds`, `dimmed` and `effects`. Flashes and glances draw into pooled
  Graphics (`src/game/pool.ts`). `GLANCE_MS` is GDD §3a's 250 ms (`tests/motion.test.ts` reads every
  graybox motion constant against its §3a row). `tests/contrast.test.ts` prints the colour margins
  (WCAG contrast, CIE76 ΔE, deuteranope ΔE) with no thresholds: those come with the Gate B tune
  plan. It also found one margin the audit did not list: a mark on a lit cell of a glowing room,
  1.41:1.

## 2026-10-21 (Gate B tune round 1 of 2: coder)

Round 1 of Gate B failed (the playtester: no real insight early, objects that change nothing,
unreadable boards, rules arriving untaught, failure louder than success, controls fighting the
player). The lead designer's plan, docs/gate-b-round1.md, was adopted whole; each line below
records a decision with the line it rests on (plan §10). Gate A's thresholds and Gate B's bars
B1–B7 are unchanged; what the build measured is in docs/PROGRESS.md, "Gate B tune round 1".

- **D67 Insights, named for people** (brief:187–200; TASKS Gate B B4; plan §1.1, §1.3). The
  grader names every non-T1 step in its own pass: `shape` (a room whose own shape lies in one
  line; not an insight), `lamp`, `line`, `cross`, `count` (T3), `chain` (T4); when several rooms
  explain a T2 step the simplest name wins (GENERATOR.md §4.6). "Two distinct insights" = two
  insight episodes (episodes with a step other than `shape`), required in every house from 10
  and every daily; of two kinds in the bands that carry difficulty (hard, cycle 1–9, manors,
  dailies); rests may repeat a kind. Houses 4–8 teach shape, line, cross, line and cross, then
  another trick; house 9 one insight; 10 needs a cross; consecutive teach houses (4–11, 17–19)
  differ in their trick (kinds plus `block` and `light`). Houses 10–11 move to 6 × 6 (0 of 834
  5 × 5 candidates had two insights with every block relevant); d windows 4–14 for houses 6–8
  and 6–16 for 10–11 (levers, D35; brief:223–224).
- **D68 Every object matters** (brief:56–58; plan §1.2). Two tests per block and lamp, residents
  placed: the literal one (the object removed) and rule isolation (a block made see-through, a
  lamp with its light off); each must cost the house its unique solution or change its grade (d,
  the path or the insight names). Deviation from the plan, recorded: the grader alone decides
  (its steps are sound, so a finished grade with the stored placements proves uniqueness; no
  solver run), and a see-through block lets light through as well as sight (the plan's prototype
  let only sight through). Measured on the list before: 1,183 of 5,171 blocks and 14 of 1,892
  lamps idle by rule isolation, 645 of 7,063 objects by the literal test; after: none.
- **D69 Boards capped at 8 × 8; the cell rule in CSS px** (brief:230, brief:350; plan §2.1).
  No house is larger than 8 × 8 (`SIDE_MAX`); manors are 8 × 8 with 9–12 rooms and 1–6 blocks.
  The portrait board runs almost edge to edge (side margin 12 design px, was 32), so cells are
  ≥ 44 CSS px on a 360 × 640 phone and ≥ 66 at 540 × 960 (8 × 8: 44.0 and 66), and ≥ 80 design
  px in every arrangement; this replaces "cells ≥ 80 design px at 9 × 9" (GDD §12). Walls
  clamp(0.09 × cell, 12, 18) design px (≥ 4 CSS px at 360 wide). Pace over depth: depth comes from
  the deductions (D67), not the area; the plan's recommendation to Hasan, who can overrule it.
  CLAUDE.md updated by the main session on 2026-10-21, approved by Hasan.
- **D70 Teaching demonstrations and residents** (brief:36, the non-goal on givens; brief:155;
  plan §3). Houses 1, 2, 9 and 17 show their rule before input opens, from pure timelines
  (`src/game/demo.ts`; GDD §3.3): ≤ 1.5 s, a tap skips it and never counts, a resumed house
  never replays it. Houses 9 (two residents, a bookshelf between them) and 17 (one, unlit beside
  the beam) get residents chosen from the solution, the first after which the house still asks
  for its insights; an exception to the brief's non-goal, since they teach and never make a house
  easier than its band. GameReady still fires when the first house is drawn: a tap answers at
  once (it skips the demonstration).
- **D71 Palette, floors F1–F7, the light hatch** (brief:50–52; CLAUDE.md Rendering and rule 8;
  plan §2.2). Twelve floors (4 lightness levels × 3 dusty hues, chroma ≤ 20), a pattern on every
  floor, inks 13 L* darker, dark walls, marks and lines; light as amber stripes with a brown
  outline over the wallpaper; settled as a dashed teal ring inside the walls over a faint teal
  wash; furniture a bookshelf, the lamp a disc with rays. After the design critique: small
  diamonds replace the plan's polka dots (dots on the palest rose read as a nursery wallpaper),
  and the progress dots are larger (10 CSS px in radius at 360 wide) with a light rim ≥ 3:1
  against the page (an empty dot was 1.9:1). `tests/contrast.test.ts` holds F1–F7
  over every floor state: plain, lit, settled and (beyond the plan) lit in a settled room; the
  hatch's brown outline runs along one side of each stripe (the plan drew it round both). F1 and
  F4–F6 hold for grayscale and a deuteranope as well as in normal vision: the plan's brown
  outline (`#633010`) fell to 2.96:1 for a deuteranope, so it is `#5a2b0e`. The
  e2e reads the wall pixels against the floor beside them at 360 × 640 in houses 1, 17 and 34.
- **D72 Drag moves a ghost** (brief:79–81 made drags paint only; plan §5). A drag that starts on
  a placed ghost carries it: its own room → relocation, a room without a ghost → `moved`,
  anywhere else back with a nudge; one move, one undo step. A drag from an empty cell still
  paints, one from a mark erases, one from a resident only nudges it. CLAUDE.md updated by the
  main session on 2026-10-21, approved by Hasan.
- **D73 Success outweighs failure on screen** (brief:135, brief:137; GDD §3a said ≤ 1.2 s for the
  win; plan §4). A settle bobs the ghost (scale 1.15, 8 px, 160 ms), draws the room's ring and
  fills its dot; the shiver is ±3 px, 60 ms, never repeated; the glance 250 ms; the finale about
  2.0 s (hit stop 50 ms, the room sweep, a hop and turn, two waves, the solve time ticking in, the
  next house sliding in from 1,650 ms for 350 ms), a tap skips it from 600 ms on. Beyond the
  plan: the finale runs on the wall clock less paused time, frame by frame (Phaser's clock lags
  on slow frames, so the beat took up to 6.5 s headless), its effects on the tween clock, and the
  next house is built during the hit stop, so the slide never stutters.
- **D74 The hint in two presses** (brief:83–85; plan §5). The first press counts the hint, starts
  the cooldown and shows the reason (`hintExplain`: the segments and rooms of the grader's steps
  up to the next forced placement, from the board as it stands, plus the lines along which the
  ghosts on the board see the target room's other cells; or the wrong ghost); the second does it.
  The player's own move to a ghost in between completes it. Under `?playtest=1` the hooks never
  show the placement's cell.
- **D75 Progress dots** (not in the brief; Gate B's only counter of micro-progress; plan §6).
  One dot per room, a swatch of its floor and wallpaper; full = settled; the finale's solve time
  takes the row's place.
- **D76 A neutral legend** (plan §7; extends D63). `visible()` names shapes, colours, positions
  and poses only: areas, thick dark lines, yellow stripes, a bookshelf shape, a round icon with
  rays, figures with open eyes, both hands over the eyes or squinting under one hand, dashed teal
  outlines, small dark dots, color swatches. `RULE_WORDS` grows to the plan's list.
- **D77 The build's speed** (GENERATOR.md §9 A8; plan §12 risk 2). The insight names come from
  the grader's own pass (no second run); relevance needs no solver (D68); a candidate gets at most
  50 border moves to break a second solution (`UNIQUE_FIX_MOVES`, was 200: successes need ≤ 50
  in about 99 % of cases, houses 1–36 came out byte for byte the same and built in 28 s instead of
  74 s); `CANDIDATE_LIMIT` 50,000 (was 2,000). An incremental solver gave the same files but ran
  slower, so the solver is unchanged.
- **D78 Turned houses keep their insights** (A8; D54, D56). A house the list turns after 1000
  (506–1000) must ask for its band's insight episodes and kinds in all four quarter turns, not
  only keep its grade: a turn can name a step differently. Before this rule 13 turned houses had
  fewer than two insight episodes and 26 fewer than two kinds.
- **D79 Dev builds keep wall-clock time** (helpers; D60). `?fpsmin=N` also turns Phaser's
  start-up cool-down off (`panicMax: 0`), so on a GPU-less machine timers keep wall-clock time
  from the first frame; the playtester's links already carry `fpsmin=1`. Production is unchanged.

- **D80 The autopilot measure** (docs/gate-b-round2.md §1.1–§1.2; GENERATOR.md §4.7). A bot that
  plays only the one-look patterns of a Queens or Star Battle player (a room with one free cell;
  a room lying in one line claims it; the budget: when a direction has as many open lines as open
  rooms, each line needs a ghost, at three levels: whole lines, split lines, lit lines left out)
  says what a house asks for; a count, a cross or a chain is a real insight
  (`src/gen/autopilot.ts`). Calibrated on the list round 2 played (`tests/fixtures/
  round2-houses.json`): it finishes houses 4–20 but 13 and 20, the two its player had to stop
  and count, and every house it finishes was rated 4 only where something was new. The grader's
  own count of insight episodes (D67) missed this: it has no budget technique.
- **D81 The ladder of houses 4–24** (plan §1.3; GENERATOR.md §7). Each house teaches one new
  pattern or rule (4 the claim, 5 the bookshelf, 6 the split budget, 8 the light, 10 the
  shadow, 16 three ghosts in a line split twice, 17 the lit-line budget, 18 two lamps, each
  proved by its own test), or opens with a real insight (the hard houses 7, 9, 11–14, 19–22:
  the autopilot places no ghost before it; 12 opens with a cross); 15 is the one rest of 4–20,
  23–24 rest. No free opening after house 10 but 17's lesson (a line single); no two houses in
  a row open alike. Measured (`tests/round2.test.ts`): no house 4–10 is finished on autopilot
  with nothing new (round 2's list: 5 of 7); 16 of houses 4–20 teach or ask (round 2: 7);
  8 open with a real insight (round 2: 2). Round 1's insight rules (D67: two insight episodes,
  two kinds in hard bands, a new trick in teach houses) apply from house 25 and in the dailies;
  on 4–24 the ladder's rules replace them, and the band fields `needInsight` and `newTrick`,
  used by no band any more, are gone. House 8 keeps the lowest d among 5 qualifying candidates
  (`LIGHT_POOL`; its light lesson, a resident beside the beam, no shadow and no free opening
  leave few). The build equals the plan's prototype byte for byte (all four files); houses
  25–1000 and the dailies are round 1's but daily 2027-10-02 (D88); `npm run levels` 204.7 s
  (A8's budget 600 s).
- **D82 Gate A: the first shelf, count and lamp come earlier** (plan §1.4; GENERATOR.md §9).
  Element positions moved earlier on playtest evidence (the autopilot bot); quality thresholds
  unchanged; approved by Hasan, 2026-10-21. A3: no T3 before house 7 (was 12). A5: no furniture
  before house 5, which sets two ghosts in one line with furniture between (was 9); no lamp
  before house 8, whose light is necessary with its resident placed (was 17); the first T3 at
  house 7 (was 12). Every other clause and every threshold of A1–A9 is unchanged.
- **D83 Demonstrations that cannot be missed** (plan §2; GDD §3.3, §3a). Houses 1 (sight, then
  a see-through ghost on (0,1) and both cover their eyes, so (1,1) is a deduction, not a coin
  flip), 2 (rows and columns), 3 (a see-through hand drags along the resident's row and marks
  pop in), 5 (the bookshelf stops both trails), 8 (the light, a see-through copy squints in it)
  and 10 (the light stops at the bookshelf; a see-through copy behind it stays calm, never on a
  solution cell). Each plays as the house appears, before input opens, ends on an 800 ms hold
  frame showing the whole lesson, lasts at most 2.3 s, and plays again after 5 s without input
  until the house's first placement (house 3: its first mark), at most 3 times; a resume plays no
  first one but the replays apply. A tap skips it and is never a game tap; in a first play a tap
  in its first 300 ms does nothing at all (round 1's code audit, ORTA 2: a tap left over from the
  finale skipped the next house's demonstration), counted from the frame after the one it started
  in; a replay skips at once (round 2's code audit, DÜŞÜK 3: a tap 5.0–5.3 s after the last input
  did nothing). A replay never starts while a finger or a button is down or a hint's reason
  shows, input in hand is no idle time, and a replay ends whatever input was in hand (a carry, a
  stroke, a press) as a platform pause does (round 2's code audit, YÜKSEK 1, ORTA 1: a replay
  over a carried ghost left it drawn on the wrong cell). Beyond the plan: a demonstration ends at
  once on a new screen size, after the slide has ended (DÜŞÜK 6).
- **D84 Success louder than failure, measurably** (plan §3; GDD §3a). A settle: a white veil over
  the room's whole floor (0.45 → 0, 300 ms), then the solid 6 px teal ring draws in (250 ms) and
  stays; the ghost bobs (1.2×, 12 px, 220 ms) and keeps a content face (eyes closed in a smile);
  the swatch pops (1.5×, 160 ms) and keeps a tick. A solve: about 2.4 s (hit stop 50 ms; the rooms
  flash in reading order every min(110, 900 / R) ms, brighter each time, 0.3 → 0.6, each with a
  rising tick, 1 → 1.6×, 4 px higher a room; a ring of light from the middle to the frame,
  300 ms; the hop and the waves; the solve time below the board; the next house slides in at
  2,050 ms; a tap skips from 600 ms). Deviations from the plan, recorded: a settle plays in three
  beats, about 710 ms: the veil as the ghost pops in, the bob from the pop's end; the ring as the
  veil fades (from 300 ms); then the ghost's small content pop (1.1×, 160 ms) with the swatch's
  pop (from 550 ms). The face, the full swatch and its tick show from the first beat; only the
  motion is sequenced. The solve's room lights stay on until the ring of light, then fade as the
  next house comes. The conflict keeps the plan's ±3 px for 60 ms and the pose; three things in
  it were not what the spec said and are fixed: the shiver played its 2 swings as 2 × 60 ms
  (twice the 60 ms of D73 and §3a; the hint's tremble 240 ms for 4 × 30 ms; a red test in
  `tests/motion.test.ts`); the line's double flash (D23) was drawn over a line already at full
  strength, so it never showed and only made the frames flicker, and is gone (the line appears
  and stays); a cooling room fades in 100 ms (D22 said 200). Every texture a settle or a solve
  draws is made when the board is built, so none is drawn mid-motion. In houses 1 and 2 the
  finale's ghosts hop while the last ghost still gives its content pop: the hop ends that first
  (round 2's code audit, DÜŞÜK 4). The measure: the plan counts frames every 50 ms, a measure of
  time, and a 50 ms timer reads a slower renderer's frame twice and calls the second read still.
  The e2e (`tests/e2e/timing.spec.ts`) reads every drawn frame instead and counts each frame in
  motion for as long as it stays on screen. The solve is scored on the beat alone, the frames
  before 2,050 ms: over the whole finale the next house's slide passed the bars on its own (a
  mutant whose beat showed nothing passed, 21.6× the area and 7.3× the time; round 2's code
  audit, DÜŞÜK 5). Measured at 360 × 640 in the timing project (no GPU flags, frames 14–23 ms,
  D89), four runs: changed area, settle 4.0–4.1× a conflict's (floor 3×), the beat 18.0–18.3×
  (floor 10×); time in motion, settle 4.8–5.0× (floor 2×), the beat 10.8–11.6× (floor 6×). A
  conflict moves for 150 ms, a settle 717–750 ms, the beat 1.6–1.7 s. The inversion test
  (`tests/motion.test.ts`) holds the rows. Supersedes D22's 200 ms and D23's double flash.
- **D85 Rooms: a hue and a pattern of their own; local contrast** (plan §4; CLAUDE.md
  Rendering). 8 hue families × 4 lightness levels (L* 89/79/69/59, chroma 16–19; clay, sand,
  olive, sage, teal, sky, lilac, rose) and 8 patterns (crosshatch and scales new). Neighbours
  differ in level, hue and pattern; up to 8 rooms every room has a hue and a pattern of its own;
  from 9 rooms a hue repeats only on rooms that do not touch, two levels apart, with no hue and
  pattern pair twice (`roomStyles`, all 1,795 houses tested). A settled room keeps its floor (no
  wash); the swatch keeps a tick; the solve time ticks in below the board, never over the
  swatches (`timeBox`, every arrangement tested). Every floor F1–F7 holds (F1 4.84 in all three
  views). Local contrast (round 1's code audit, DÜŞÜK 7): each ink now touches only its own
  floor's colour: the wallpaper and the hatch stop 13 design px inside every wall (the ring and a
  3 px halo each side fit there), nothing is printed on an object's cell, marks, dots and the
  hatch's stripes carry a ring of their floor; the lowest local pairs are now the wall 4.84, the
  ring 3.01, the sight line 3.56, a mark 3.66 and the hatch's edge 3.25 (were 1.39 for a wall on
  the hatch's edge, 1.91 for the ring on the wallpaper's ink, 2.39 and 1.06 for a mark on the ink
  and on the hatch's edge, 2.28 for the sight line). Nothing that stays on the board is a
  Graphics object any more (ORTA 4): floors and walls are textures drawn once, rings, flashes
  and veils a one-colour texture scaled, dots and marks textures per floor colour, the
  swatches baked. Measured on WebGL (SwiftShader, house 20 at rest mid-play, 240 frames): 0.22 MB
  of garbage a frame by the sampling heap profiler, 0.21 MB by heap growth (round 1's build 1.42
  and 0.92; `4e40bd2` 0.35–0.43); about half of what is left is the two HUD buttons' Graphics,
  which ORTA 4 did not cover.
- **D86 The hint's reason stays until the next move** (plan §5; GDD §3a). The first press shows
  it as before (D74); it stays, pulsing, until the player's next move (a tap, a drag, a stroke,
  an undo), which takes it away and acts as usual, or the second press, which does the step; a
  pause freezes it; a new screen size keeps it. Deviation from D74, recorded: a stroke of marks
  now ends a pending hint too (it was kept until a move to a ghost). A move takes the reason away
  whenever one is pending, however little of it shows (round 2's code audit, DÜŞÜK 2: house
  141's first reason dims no cell, and a move before its pulse's first frame left it pulsing).
- **D87 A neutral `state()`; colour words tied to their colours** (plan §6, §4 "B2 detail").
  Under `?playtest=1` `state()` holds only the house to play and on screen, seconds, paused,
  input (open or closed), taps, drags, presses (arrow, bulb), bulbReadyIn, arrangement, n and
  cell: no word of `RULE_WORDS` or of the mechanics (placement, removal, relocation, carried,
  nudge, stroke, mark, erase, shiver, demo, finale, undo, conflict, solved), and the hooks that
  state the rules, `rules()`, `drawn()`, `events()` and `previous()`, throw (round 2's code
  audit, DÜŞÜK 9). `visible()` names the settled ring and the swatch's ring teal, the content
  face "eyes closed in a smile", and a test ties each colour word (dark, yellow, teal, warm) to
  the constants it names.
- **D88 A9's three fixes** (plan §7; the auditor's Gate A re-run). A see-through block stays a
  block for the step names and the time estimate, so a step renamed only by its cell no longer
  passes an idle block (the rebuild changed one stored house, daily 2027-10-02); `lightNeeded`
  solves with the residents placed (now house 8's); a turned house after 1000 does not carry the
  base house's step names. Corrected after round 2's code audit (ORTA 2, DÜŞÜK 8): round 2 first
  named the turned house's steps with its own grade (`turnedHouse`), kept out of `houseAt` on the
  claim that the game bundle must not carry the grader. It carries it anyway: `src/core/hint.ts`
  grades the board for the live two-press hint (D74), and it stays (the first download is
  1.72 MB of 5). What the smoke e2e caught when `houseAt` graded was the dev-only word
  `residents`, a field of the band defaults in `src/gen/params.ts` that `bandFor` pulled into the
  bundle (4.1 KB more), not the grader. No game code reads the stored step names, so `houseAt` now
  leaves them out past house 1000 (267 of the 1,485 turned houses would name a step otherwise),
  and `turnedHouse`, which only a test used, is gone.
- **D89 The round-1 code audit's other findings** (0 KRİTİK, 0 YÜKSEK). ORTA 3: Phaser's tween
  clock credits up to 500 ms of a pause on the resume, so the tween clock runs at timeScale 0
  from the pause to its first step after (pauses of 300, 450 and 800 ms tested). ORTA 5: no
  e2e test is retried and a flaky one fails the run; the wall-clock tests run in a project of
  their own, one at a time, after the others; the measured beat (`slidAt`) is read when the
  slide begins. DÜŞÜK 8: the model screen accepts a nudge of a placed ghost only in a drag, and
  the dev log records each move's kind. DÜŞÜK 9: the scene's dev state lives inside
  `import.meta.env.DEV` and the production bundle check lists it. Deviation, recorded:
  `slidAt` is the beat on the scene's clock less what a tap skipped, so a tapped finale still
  records the tap's moment. The finale's beat is held to |beat − 2,050 ms| ≤ 50 ms, round 1's
  bound (`bfd2b96`): round 2 first swapped it for two assertions that could not fail (round 2's
  code audit, KRİTİK 1), and those are gone. Under the SwiftShader flags a frame took 54–137 ms and
  the bound failed (123 ms past in one of four runs), so the timing project runs without the GPU
  flags (Canvas renderer; frames 14–23 ms; Chrome's software-WebGL warning, from Phaser's WebGL
  probe at boot, is allowed in that project only). The clock's step in the frame the slide began
  is logged (`stepMs`), not asserted.
- **D90 Round 2's code audit** (1 KRİTİK, 1 YÜKSEK, 2 ORTA, 10 DÜŞÜK; every one fixed, each test
  seen failing first; the table in docs/PROGRESS.md). Decided with the coordinator: the finale's
  beat keeps round 1's 50 ms bound and the timing project runs without the GPU flags (D89); the
  grader stays in the game bundle for the hint (D88); the HUD's two button Graphics, about half
  of the 0.22 MB of garbage a frame that is left (D85), wait for Epic 4's art. No gate threshold,
  floor or test tolerance moved. The auditor's A9 re-run passed Gate A on the new files (1,792 of
  1,792; its three findings closed, D88). Watched: house 5's blind win rate, 0.0078 against A7's
  cap of 0.01, the only generated house above 0.004.
- **D91 A third tune round, the last, approved by Hasan** (2026-10-22, after Gate B round 3;
  docs/gate-b-round3.md). Asked how to go on, Hasan chose the depth round:
  - from house 8 on, deeper houses, with several counting moves and openings that do not repeat;
  - Gate A's A6 solve-time ceilings for houses 8–24 may rise as far as the deeper houses need;
    every other Gate A threshold and Gate B's bars B1–B7 stay unchanged;
  - the hint's message, the end of a house, the colours and the landscape layout are fixed too;
  - then a new blind playtest with the same bars. A fail ends Shy Ghosts for good.
  This answers the open question "pace or depth" with depth for houses 8–24. The exception to
  the fun gate's two-round rule (CLAUDE.md) is his; the main session recorded it from his answer.

- **D92 The depth profile** (2026-10-23, tune round 3; docs/gate-b-round3.md §"Tune round 3"
  §1.1–§1.2; `src/gen/depth.ts`). A house is played the way round 3's playtester did, the cheapest
  deduction first (the autopilot, then the band's grader for one step when it stalls); each
  placed ghost carries the hardest step since the ghost before (free, elim, claim, budget, cross,
  count, chain; `DEPTH_RANK`). Cross, count and chain are the real insights; a stall is a gap only
  one of them ends. Calibrated on the list round 3 played (`tests/fixtures/round3-houses.json`):
  no house 4–24 stalled twice, every real insight came before the first ghost, and every tail was
  4–9 ghosts placed without a thought.
- **D93 The ladder's depth from house 8** (2026-10-23). Houses 9–24 stall at least twice, one real
  step after two ghosts or more; at most 3 ghosts after the last real step and at most 3 in a row
  without a thought; hard houses use two kinds of insight; houses 13, 14 and 17–22 stall three
  times. House 8, the first lamp, is the one planned rest: it stalls once, after its first ghost.
- **D94 The deepening search** (2026-10-23; `src/gen/deepen.ts`, GENERATOR.md §6.2). A ladder house
  grows from a unique candidate by simulated annealing over its room borders (85 %) and its
  shelves (15 %): 6,000 evaluations, the temperature falling from 8 to 0.5; every state graded in
  canonical room ids; the score rewards the depth target and the d window; inside the walk a house
  that meets the target is checked for its lesson and for idle objects, and a literally idle
  object is dropped; a walk with no stall after 35 % of its evaluations stops. Deterministic for
  its seed: the order of the random draws defines the houses.
- **D95 The rungs 8–24** (2026-10-23; `src/gen/params.ts`). 7 × 7 from house 9; roles hard (9,
  11–15, 17–22, 24), teach (8, 10, 16; their insights are crosses) and rest (23); lessons kept at 8
  (light), 10 (shadow), 16 (three in a line), 17 (the lit line) and 18 (two lamps); 15 and 24 lean
  hard houses, 23 a deep rest. A house opens unlike the two before it (`OPENER_MEMORY`, opener
  classes `OPENERS_ANY` and `OPENERS_T2`; a lesson that fixes its opener keeps it), a two-room
  count opens one house only, and no house repeats the pattern of real insights of the house
  before.
- **D96 The start table** (2026-10-23; `LADDER_STARTS`, `npm run levels:starts`). Searched from
  candidate 0 the ladder takes about 16 minutes, over A8's budget; the build starts each ladder
  house at the candidate the search found first (8: 157, 9: 256, 10: 256, …) and runs every check
  as before. `npm run levels:starts` finds the table again after a pipeline change (with
  `--progress=FILE` it resumes after an interruption). A start before the first qualifying
  candidate only costs time, but a start past it would choose a later candidate and so another
  house, and every house after it through the opener history: a stale table changes the list.
  `tests/round3.test.ts` pins every house 8–24 to its start (the A9 re-run's DÜŞÜK). The build
  takes 199 s.
- **D97 A6 for houses 8–24** (2026-10-23, by D91's rule: the prototype's median + 5 s, rounded up to
  5 s). 4–7: 90 (4–11's old ceiling); 8–11: 135; 12–14: 150; 15–16: 135; 17–19: 150; 20–22: 165;
  23–24: 135; every house 1–7 ≤ 130, every house 8–16 ≤ 155. Measured: 70, 128, 144, 125.75, 141,
  160, 128.5; maxima 117 and 146.5. Every other A6 ceiling is unchanged.
- **D98 The hint's reason and recharge** (2026-10-23; `core/hint.ts`, `game/reason.ts`). The first
  press plays the deduction in beats of 700 ms (a claim's band, a count's bands with the digit k
  just outside the board, a cross's see-through ghost and its rays, a chain's ghosts; hint dots
  on every cell a step removes) and ends on the target room pulsing with the digit 1; the picture
  then holds. The cooldown starts when the hint is used (the second press, or the player's own
  move that does what the reason shows); any other move that clears the reason gives the recharge
  back (`HintClock.refund`). The hint still counts once, at the first press (D74). The save keeps
  the recharge: save v2 adds `hintReadyIn` (0–90 s; a v1 save reads as ready); every flush writes
  it, in every phase (a pause on the held card keeps it; round 3's code audit, DÜŞÜK 1), and a save
  that lands after the boot hands its recharge to the running clock when longer
  (`HintClock.adopt`; DÜŞÜK 2).
- **D99 The held result card** (2026-10-23; `game/card.ts`). After the finale the board stays and a
  card rises (240 ms, a small overshoot): the house number, the solve time ticking up over 400 ms,
  a bulb with a tick when no hint was shown, a next arrow pulsing once a second. No auto-advance:
  any tap continues from 600 ms after the card began; the tap that wakes the game after a pause
  never does; a reload during the card opens the next house. The finale's solve time moved to the
  card.
- **D100 The relocation glide** (2026-10-23). 320 ms (was 220), ease in-out, the ghost leaning 8°
  toward its way and straight on arrival; a see-through afterimage fades on the cell it left
  (alpha 0.4 → 0, 300 ms). A relocation stays neutral: no success stack.
- **D101 Swatch rule S1 and the lit stripes** (2026-10-23; `game/look.ts`). Two rooms of a house
  whose patterns are of one family (stripes; hatch; dots; crosshatch; scales) differ by ΔE00 ≥ 21
  and deuteranope ΔE00 ≥ 12 (`SWATCH_CLOSE`, derived from the floors). Each lit stripe is outlined
  in brown on both sides. The stripes cover 0.075 of a lit cell and the four outlines 0.04 in all
  (0.02 each in x + y: 1.7 device pixels on a 360 × 640 phone at 2×), the widest the floors allow
  (round 3's code audit, ORTA 1; the grid in the coder's report): the settled ring must still read
  on a lit floor (F3: 3.01 against the darkest; 2.98 with outlines of 0.045 in all, whatever the
  stripes), and a lit cell must stay closest to its own room (F5: 0.70 here; 0.47 with stripes of
  0.08, which round 2 drew; −1.83 with the plan's 0.10). Outlines of 0.03 a side, 431eb44's width
  on its one side, need 0.06 in all and give F3 2.90–2.94 at any stripe share; the round-3 port's
  0.015 a side rendered as a single device pixel at 3.0–6.5:1. `tests/e2e/round1.spec.ts` scans
  house 8's lit cells at device resolution: both outlines of every stripe render at ≥ 2.5:1 (the
  darker floors 2.7–4.3, mint and rose 6.1–8.0; 0.015 a side gave 2.2–2.4 on two cells). The
  audit's two pixels at ≥ 4.5:1 an outline waits for Epic 4's palette: solid brown is 3.6:1 on
  the clay floors. New check F5b: every stripe is bounded by an outline ≥ 3:1 on both sides, on
  every floor. F1–F7 hold unchanged.
- **D102 The centred landscape** (2026-10-23; `game/layout.ts`). In landscape the board stands in
  the middle of the screen; the swatches in a column left of it, the buttons and the result card
  in a column right of it, each 200 design px wide and 32 from the board; the board shrinks where
  both do not fit (cells ≥ 80 design px at 8 × 8). The dots stand in two columns there.
- **D103 House 8's demonstration** (2026-10-23; `lightDemoCell` in `core/house.ts`). The copy
  stands on a lit cell that is not a solution cell and that no resident sees, diagonal to the
  resident it steps out of where it can, so it shows the light alone (it only squints). The build
  checks that house 8 has such a cell, after the deepening walk.

## Open questions (defaults in force)

- **Answered 2026-10-22 (D91): depth for houses 8–24.** For Hasan (product direction): pace or
  depth? Since Gate B round 1 the default was pace: no board above 8 × 8, depth from the
  deductions (D69). Gate B round 3 (docs/gate-b-round3.md) failed on depth: every house from 4
  was one chain of forced moves, and the houses rated 4 were the new elements and the deeper
  ones (27, 31, 34). Earlier wording, kept for the record:
  **pace or depth, if the first real times disagree with the brief?**
  The brief's own formula puts houses 4–24 at about 65–145 s and houses from 25 at about 2–3 minutes
  (manors about 4), against its minute map's 30–90 s; by the formula the first 10 minutes end around
  house 10 rather than 13 (furniture at about 7:20 instead of 4:20). Default until his answer:
  protect the pace of houses 1–24 (the first-session promise; their windows come down first) and
  keep the brief's board sizes from house 25 (depth for genre fans). Not blocking before Epic 4.
- Final name — default "Shy Ghosts" (working title); check stores, portals and trademarks before
  the listing (brief:400).
- Houses 4–11 for genre fans — the brief's windows give them one or two eliminations each; if Gate B
  finds them dull, raise their windows first (one line each in `params.ts`).
- Mark gesture — default: drag to paint; a drag that starts on a ghost carries it (D72); revisit
  after the phone test (brief:402).
- Elements after v0.1 — two-ghost rooms and mirrors in v0.2, after the first sandbox numbers
  (brief:406).
