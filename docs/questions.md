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

## Open questions (defaults in force)

- **For Hasan (product direction): pace or depth, if the first real times disagree with the brief?**
  The brief's own formula puts houses 4–24 at about 65–145 s and houses from 25 at about 2–3 minutes
  (manors about 4), against its minute map's 30–90 s; by the formula the first 10 minutes end around
  house 10 rather than 13 (furniture at about 7:20 instead of 4:20). Default until his answer:
  protect the pace of houses 1–24 (the first-session promise; their windows come down first) and
  keep the brief's board sizes from house 25 (depth for genre fans). Not blocking before Epic 4.
- Final name — default "Shy Ghosts" (working title); check stores, portals and trademarks before
  the listing (brief:400).
- Houses 4–11 for genre fans — the brief's windows give them one or two eliminations each; if Gate B
  finds them dull, raise their windows first (one line each in `params.ts`).
- Mark gesture — default: drag to paint; revisit after the phone test (brief:402).
- Elements after v0.1 — two-ghost rooms and mirrors in v0.2, after the first sandbox numbers
  (brief:406).
