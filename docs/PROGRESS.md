# PROGRESS.md — where we are

Single source of truth for "where did we leave off". Read first at the start of every session;
update at the end of every epic.

## Status
Epics 0–1 done and pushed (`kriptoloca/shy-ghosts`, `main` at `fa66f51`); the Epic 1 audit's
findings are fixed in `35ebc23 fix(epic-1): audit findings` (local, the main session pushes) ·
Epic 2 (content pipeline) built, uncommitted for its review and audit. Gate A: A1–A8 green after
tune round 2 of 2 (round 1: D54 for A8; round 2: the audit's fixes, D55–D58, after A9 failed on
sampling noise); A9 waits for the auditor's re-run over all houses · Next: A9 re-run →
`feat(epic-2)` → Epic 3; if Gate A still fails, the stop rule · Last update: 2026-10-21 ·
Branch: `main`
Munch Pixels is paused (munch-pixels `docs/PROGRESS.md`, 2026-10-21) after its playtests showed the
core loop had no real decisions; this plan builds that lesson in as the fun gate (CLAUDE.md,
docs/questions.md D1).

## How the team works (every epic)
1. **Coder**, the only writer: one epic at a time, tasks in order. Each task starts with its red
   test and ends with `npm test` and `npm run check` green before the next one starts. Every
   decision goes into docs/questions.md in the same epic.
2. **Main session**: runs the gates on the finished epic (`npm run check`, `npm test`,
   `npm run levels:check` from Epic 2, `npm run build`, `npm run e2e`, `npm run size`), commits
   `feat(epic-N): …`, and pushes once the repository exists.
3. **Auditor**, read-only: `code-review` of the epic's diff, then the independent adversarial
   audit against GDD.md, GENERATOR.md and CLAUDE.md (KRİTİK / YÜKSEK / ORTA / DÜŞÜK). At Gate A
   it also re-measures 200 houses with its own code (GENERATOR.md §9, A9).
4. **Playtester**, read-only, independent of the coder: plays the graybox for Gate B by the
   protocol in TASKS.md (no rules given, no solution, real taps), and from Epic 4 runs the feel
   and minute-map audits. Its scripts and screenshots stay in its own scratch directory.
5. The coder closes every KRİTİK, YÜKSEK and playtester FAIL with a red-first test, applies TUNE
   values only in the constants files, and updates this file and docs/questions.md.

Standing rules: no new dependency without a reason line in docs/questions.md; nothing depends on
reading an external site (Bridge names from docs/bridge-notes.md, sounds synthesized); no model
names in any repository file; text-free gameplay, at most 10 strings in `src/data/strings.ts`;
dev hooks and dev URL parameters only inside `import.meta.env.DEV`; **no feel, art, sound, ads,
analytics, daily or share work before Gates A and B pass, and nothing shown to Hasan before
then.**

## Session plan (Epic 0 — scaffold, pipeline, platform shell) — done 2026-10-21
Baseline: `/home/user/shy-ghosts` on `main` with the planning documents only (`a2b713a`). Source
kit: `/home/user/munch-pixels` (its `main`, Epic 4 committed 2026-10-21; copy and adapt, no
shared package yet).

Risk: carrying over Munch Pixels specifics (the Title scene, its save fields, `__munchDebug`, the
`slot`/`undo` placements, its 8 MB size target) or porting more platform than the graybox needs
(D2). De-risk: grep the ported tree for `munch`, `Munch`, `slot`, `undo`, `Title`, `facesFound`
before the gate; the smoke e2e boots straight into the Game; the size script states 5 MB.

Tasks, in order (files in brackets):
1. [x] Commit the plan: `a2b713a docs: plan Shy Ghosts (GDD + Feel spec, GENERATOR, TASKS,
   PROGRESS, Gates A and B)`.
2. [x] Configs [`package.json` (name `shy-ghosts`, version 0.0.1, the kit's exact pins without
   `sharp`, D36; scripts `dev`, `build`, `preview`, `test`, `test:watch`, `check`, `format`,
   `size`, `dev:url`, `build:test`, `e2e`, `e2e:only`, `zip`, `zip:only`), `package-lock.json`
   (fresh `npm install`), `tsconfig.json`, `eslint.config.js` (no-network rules; purity for
   `src/core`, `src/gen`, `src/data`, which also may not import `game/`, `platform/`, `dev/`,
   `main` or `config`), `.prettierrc`, `.prettierignore` (adds `src/data/levels.json`,
   `src/data/dailies.json`), `.editorconfig`, `.gitattributes`, `.gitignore`, `.npmrc`, `.nvmrc`,
   `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`
   (`https://kriptoloca.github.io/shy-ghosts/`), `index.html` (title "Shy Ghosts")].
3. [x] Scripts [`scripts/audit-dist.mjs`, `build-test.mjs`, `write-version.mjs`, `size.mjs` (target
   5 MB, hard 30 MB), `zip.mjs`, `lib/zip.mjs`, `dev-url.mjs` (`?reset=1`, `?house=12`,
   `?playtest=1`)].
4. [x] Platform shell [`src/platform/bridge.ts` (`RewardedPlacement = 'hint' | 'streak'`, stubs and
   dev pause as the kit; no `level_failed`; fake ads behind DEV at every call site, D39),
   `src/platform/storage.ts` (save v1: `version`, `house`, `housesSolved`, `current`, `sound`,
   `music`; key `shy-ghosts:save`; `migrate`, load timeout, late-read merge; D40),
   `src/platform/host.ts`, `src/platform/timeout.ts`, `src/game/resume-grace.ts`,
   `src/game/progress.ts` (the save in memory, D37), `public/playgama-bridge-config.json`,
   `docs/bridge-notes.md` (copied, placements `hint` and `streak`)]. Not ported: `ads.ts`,
   `analytics.ts`, `haptics.ts`, `ios-unmute.ts` (D2).
5. [x] Scenes and dev hooks [`src/main.ts` (Boot → Game, no Title), `src/config.ts`,
   `src/game/layout.ts` (`designSize` only), `src/game/scenes/BootScene.ts` (a dark house
   silhouette and a thin bar, no text; `?reset=1`, `?house=N`, D38),
   `src/game/scenes/GameScene.ts` (stub: a placeholder board, the resume grace, then
   `markInteractive`), `src/dev/debug.ts`, `src/dev/game-debug.ts` (`window.__ghostDebug.state()`
   with the house, the messages, the pause and the input gate; `pause()`)].
6. [x] Tests [`tests/storage.test.ts`, `tests/resume-grace.test.ts`, `tests/bridge-config.test.ts`,
   `tests/bridge-lifecycle.test.ts`, `tests/layout.test.ts` (`designSize`),
   `tests/e2e/helpers.ts`, `tests/e2e/smoke.spec.ts`].
7. [x] CI and session hooks [`.github/workflows/ci.yml`, `.github/workflows/pages.yml` (names and URL
   for shy-ghosts), `.claude/settings.json`, `.claude/hooks/session-start.sh`].
8. [x] Gate: `npm run check`, `npm test`, `npm run build`, `npm run e2e`, `npm run size` green; the
   grep of the risk note clean (the remaining hits are history notes, "no title screen" and the
   save "slot"); this file; commit `feat(epic-0): scaffold, pipeline and platform shell from the
   Munch Pixels kit`. `code-review` and the adversarial audit: folded into the Epic 1 audit (the
   auditor reviews `a2b713a..` and the Epic 1 working tree together).

Reuse from Munch Pixels (copy and adapt):
- `/home/user/munch-pixels/package.json`, `tsconfig.json`, `eslint.config.js`, `vite.config.ts`,
  `vitest.config.ts`, `playwright.config.ts`, `index.html` and the dotfiles.
- `/home/user/munch-pixels/scripts/` (`audit-dist.mjs`, `build-test.mjs`, `write-version.mjs`,
  `size.mjs`, `zip.mjs`, `lib/zip.mjs`, `dev-url.mjs`).
- `/home/user/munch-pixels/src/platform/bridge.ts`, `storage.ts`, `host.ts`, `timeout.ts`;
  `/home/user/munch-pixels/src/game/resume-grace.ts`; `/home/user/munch-pixels/src/main.ts`;
  `/home/user/munch-pixels/src/game/scenes/BootScene.ts`.
- `/home/user/munch-pixels/tests/storage.test.ts`, `resume-grace.test.ts`,
  `bridge-config.test.ts`, `bridge-lifecycle.test.ts`, `tests/e2e/helpers.ts`,
  `tests/e2e/smoke.spec.ts`.
- `/home/user/munch-pixels/.github/workflows/ci.yml` (without the audio and levels steps for now)
  and `pages.yml`; `/home/user/munch-pixels/.claude/`.
- `/home/user/munch-pixels/docs/bridge-notes.md` and `public/playgama-bridge-config.json`.

AC → test (TASKS.md Epic 0):

| AC | Test | Status |
| --- | --- | --- |
| `npm run check`, `npm test`, `npm run build` green | the commands; `scripts/audit-dist.mjs` inside the build (no external URL, no compressed file) | green |
| Save v1: defaults, migrate, garbage, newer version, load timeout, late-read merge | `tests/storage.test.ts` (11 tests: the Shy Ghosts fields, the house in progress, stale slots) | green |
| Resume grace; GameReady once | `tests/resume-grace.test.ts` (6), `tests/bridge-lifecycle.test.ts` (2: `markInteractive`, the platform's once-per-page guard) | green |
| Bridge config: `sendAnalyticsEvents: false`, minimum delay 120 | `tests/bridge-config.test.ts` (2) | green |
| `designSize` follows the aspect with the [1080, 2400] clamp | `tests/layout.test.ts` (4) | green |
| Boot → Game stub interactive → `game_ready` once, after `in_game_loading_started` | `tests/e2e/smoke.spec.ts` › "boot → the Game stub is interactive → GameReady once, after loading started" | green |
| No external requests, no console errors | the `guard` fixture of `tests/e2e/helpers.ts`, after every e2e test | green |
| Production carries no debug hooks | smoke.spec › "the production build carries no debug hooks" (no `__ghostDebug`, `fpsmin`, `playtest`, `fakeads` in the shipped scripts) | green |
| (added) `?house=N` and the save across a reload; the pause gates input, the grace after it | smoke.spec › "?house=N plays house N…", "a platform pause turns input off…" | green |

Done when: every row green; `npm run size` reports the initial download against 5 MB; the risk
grep is clean; `code-review` and the audit have no open KRİTİK or YÜKSEK; this file updated;
`feat(epic-0): …` committed on `main` (pushed once the repository exists).

## Session plan (Epic 1 — core rules, `src/core`) — done 2026-10-21 (`fa66f51`, audit fixes in `fix(epic-1)`)
Baseline: `e5161dc feat(epic-0)`. Committed by the main session as `fa66f51` after the audit
(no KRİTİK or YÜKSEK); the ORTA and DÜŞÜK findings are fixed in `fix(epic-1): audit findings`.

Tasks, in order (each started with its red test, each ended with `npm test` and `npm run check`
green):
1. [x] `src/gen/rng.ts`, copied from the kit (D45) [`tests/rng.test.ts`].
2. [x] `src/core/house.ts`: `houseErrors` / `parseHouse` (structure, D44), segments, sight
   (`sees`), light, candidates, `fromRows`, `canonicalIds`, `rotate` (D14); `src/data/tutorial.ts`
   (GDD §3.3) [`tests/house.test.ts`].
3. [x] `src/core/hint.ts`: `hintStep` (GDD §3.1, D43) [`tests/hint.test.ts`].
4. [x] `src/core/state.ts`: `PlayState` with `tap`, `stroke`, `undo`, `hint` and their events
   (D41), the state of each ghost, settled rooms, solved (D42), `serialize` / `restore` (D46)
   [`tests/state.test.ts`, `tests/tutorial.test.ts`].
5. [x] Property tests over 2,000 random houses [`tests/core-props.test.ts`; helpers in
   `tests/support/`: brute-force sight, light and solutions straight from GDD §3, random houses
   in the generator's shape, a model screen that plays the events back].
6. [x] The save's cell bound derives from `N_MAX` (`src/platform/storage.ts`).
7. [x] Gate: `npm run check`, `npm test`, `npm run build`, `npm run e2e` green; this file,
   TASKS.md, docs/questions.md D41–D46.

AC → test (TASKS.md Epic 1):

| AC | Test | Status |
| --- | --- | --- |
| GENERATOR.md §2 worked example 1: sight and light | house.test › "worked example 1, cell by cell", "worked example 1: exactly the lamp column and row"; state.test › "worked example 1 …" (4 tests on the board) | green |
| Worked example 2: relocation and the given | state.test › "worked example 2 …" (2, exact event lists) | green |
| Worked example 3: marks and undo | state.test › "worked example 3 …" (exact event lists) | green |
| Houses 1–3 solved by their solution taps | tutorial.test › "are solved by their solution taps in any order …"; also: one solution with the given, 2, 4 and 9 without (brute force); house 2 rows and columns; house 3 three last free cells | green |
| Relocation, removal, nudges | state.test › "tap: …" (7: relocation within a full room, onto a mark, removal, nudges, light, cascades) | green |
| Marks: paint, erase, cleared by a placement | state.test › "marks …" (3); worked example 3; relocation and hint onto a mark | green |
| Undo of every move kind, a hint's included | state.test › "undo …" (2); core-props › "undo gives back exactly the board before each move …" | green |
| Property: a random move sequence equals its replay | core-props › "… equals its replay, event for event"; "played back on a screen, the events always end equal to the rules, in a fixed order" | green |
| Property: status flags equal a brute-force sight check | core-props › "every ghost state equals a brute-force sight and light check …"; house.test › sight and light against a brute-force walk on 300 houses up to 9 × 9 | green |
| Rotation keeps the solution | house.test › "rotate …" (4: the turn map, whole turns only, four turns and back, solution and solution count kept) | green |
| (added) The win; solved is final; the save round trip; broken saves | state.test › "solved", "serialize and restore …" (4); core-props › "a saved board restores …" | green |

## Session plan (Epic 2 — content pipeline, `src/gen`) — built 2026-10-21, audited, fixes uncommitted for A9's re-run
Baseline: `35ebc23 fix(epic-1): audit findings`.

Risk: GENERATOR.md §7's windows and §9's thresholds not reachable together in the real code (the
prototype sampled houses 4–80 and 30 houses per row), or the build over its 10-minute budget.
De-risk: build the whole list early, measure every Gate A number on the files, tune only the
generator's mechanics and the windows, at most two rounds, thresholds untouched.

Tasks, in order (each with its tests, green before the next):
1. [x] `src/gen/params.ts`: §7's bands and windows (`bandFor`, `DAILY_BAND`, `cycleOf`, D7's
   rise) and every constant of §3–§8, named.
2. [x] `src/gen/solve.ts`: exact solver, fewest candidates first, stops at 2, node limit
   2,000,000 [`tests/solve.test.ts` (5): brute force on 500 random small houses].
3. [x] `src/gen/grade.ts`: T1–T4 with §4.3's accounting, d, estSeconds, episodes
   [`tests/grade.test.ts` (7): the three §4.5 fixtures, path for path].
4. [x] `src/gen/players.ts`: blind (exact), naive, shallow, 400 seeded playouts
   [`tests/players.test.ts` (4)].
5. [x] `src/gen/generate.ts`: §6 steps 1–5 (D53) [`tests/gen.test.ts` (15): invariants over 200
   seeds in each of 14 bands; determinism].
6. [x] `src/gen/build-levels.ts`, `dates.ts` (UTC keys by integer arithmetic), `record.ts`
   (`houseAt`, D14); `scripts/levels.mjs`; `levels` and `levels:check` in package.json and CI
   [`tests/daily-date.test.ts` (3), `tests/build-levels.test.ts` (5)].
7. [x] Gate A A1–A8 as tests over the built files [`tests/gate-a.test.ts` (42)]. The first build
   met A1–A7 and failed A8 (house 1001 graded d 35 against 29): tune round 1, D54; green since.
8. [x] Gate: `npm run check`, `npm test` (211), `npm run build`, `npm run e2e` (4),
   `npm run levels:check` green; this file, TASKS.md, D53–D54. Uncommitted for `code-review`,
   the audit and A9.
9. [x] The audit (A9 failed on sampling noise; KRİTİK 1, YÜKSEK 2, ORTA 3, DÜŞÜK 4–7), each fix
   red first: exact win rates selected and stored (D55) [`tests/players.test.ts` (13)]; the
   turned list keeps the cycle phase (D56) [`tests/build-levels.test.ts` (7)]; play files and
   metadata, lazy dailies (D57) [`tests/houses.test.ts` (6)]; the build's budget, CI timeout and
   root (D58) [`tests/scripts.test.ts` (6)]; the boot bar (`tests/layout.test.ts` (6)). This is
   tune round 2 of 2.
10. [x] Rebuild (120.0 s); Gate A A1–A8 green on the exact values; `npm run check`, `npm test`
    (233), `npm run build`, `npm run e2e` (4), `npm run levels:check` green; this file,
    TASKS.md, D55–D58. Uncommitted for A9's re-run over all houses.

AC → test (TASKS.md Epic 2):

| AC | Test | Status |
| --- | --- | --- |
| `npm run levels`: 1,000 houses and 792 dailies in ≤ 10 minutes | the script's own timer: 120.0 s here; the script fails above 600 s and CI stops the step at 10 minutes (scripts.test › "fails above its time budget", "CI stops levels:check after 10 minutes") | green |
| `npm run levels:check` byte-identical | the command (a CI step after `npm test`); gate-a › A8 "the four files are in the canonical byte form" | green |
| The three grader fixtures (§4.5) | grade.test › T2, T3, T4 (exact paths and d; stuck one technique lower) | green |
| The solver against brute force | solve.test › "agrees with brute force on 500 random small houses" | green |
| Generator invariants over 200 seeds per band | gen.test › 14 bands × 200 seeds (band, room rules, objects, one solution) | green |
| Determinism | gen.test › "the same seed gives the same house"; players.test; gate-a › A8 "houses 1–36 and the first 3 dailies rebuilt byte for byte" | green |
| A1 one solution, 1,792 of 1,792 | gate-a › A1 | green |
| A2 no guessing; T4 only in manors, at most once | gate-a › A2 (2) | green |
| A3 technique mix | gate-a › A3 (4) | green |
| A4 depth curve | gate-a › A4 (6) | green |
| A5 tutorial order | gate-a › A5 (8) | green |
| A6 estimated solve time | gate-a › A6 (11) | green |
| A7 the naive player fails most mid and late houses | gate-a › A7 (5; the stored rates are the exact ones, re-measured on all 1,792 houses) | green |
| A8 reproducible, in budget, the turn after 1000 | gate-a › A8 (5: bytes of the four files, ids and dates, rebuild, 1001–1010 = 506–515 at 90°, all 1,485 turned houses 1001–2485); build-levels.test › the cycle phase past 1000; `levels:check` | green |
| A9 the auditor's re-measurement of 200 houses | the auditor: failed on the first files (sampling noise, KRİTİK 1); re-run over all houses pending | open |

## Epic board
| Epic / gate | Scope | Status | Evidence |
| --- | --- | --- | --- |
| 0 | Scaffold, pipeline, platform shell | done, audited, pushed (`e5161dc`); CI and Pages green | 25 unit tests (5 files) + 4 e2e; check clean; build 1.46 MB (target 5 MB); audit-dist OK |
| 1 | Core rules (`src/core`) | done, audited (0 KRİTİK, 0 YÜKSEK, 2 ORTA, 9 DÜŞÜK), pushed (`fa66f51`); findings fixed in `fix(epic-1)` | 124 unit tests (16 files) incl. 5 property tests over 2,000 random houses; the auditor's oracle: 488,915 moves on 16,000 houses, 0 mismatches; 4 e2e |
| 2 | Content pipeline (M0): solver, grader, players, generator, 1,000 houses + 792 dailies | built and audited (A9 failed: 1 KRİTİK, 1 YÜKSEK, 1 ORTA, 4 DÜŞÜK, all fixed red first, D55–D58), uncommitted for A9's re-run | 233 unit tests (24 files; Epic 2 adds 109); `npm run levels` 120.0 s; `levels:check` byte-identical; check, build (1.46 MB), e2e (4) green |
| **Gate A** | GENERATOR.md §9, A1–A9 | A1–A8 green after tune round 2 of 2 (D54; D55–D58); A9 failed once on sampling noise, re-run open (the auditor). Still failing after this round: the stop rule | `tests/gate-a.test.ts` (42); "Measured (Epic 2)" below |
| 3 | Layout and graybox loop (M1) | planned | |
| **Gate B** | TASKS.md Epic 3, B1–B7 (the playtester's verdict) | not run | |
| 4 | Feel, face and sound (M2, part 1) — only after both gates | blocked by the gates | |
| 5 | Meta, daily, hint and ads (M2, part 2) | blocked by the gates | |
| 6 | Pause sheet, brand, store, release (M3) | blocked by the gates | |

## Measured
### Epic 0 (2026-10-21, this container, Node 22.22, Chromium 141 headless)
- `npm run check`: clean (tsc, eslint, prettier).
- `npm test`: 25 tests in 5 files, green (≈ 0.7 s).
- `npm run build`: green; audit-dist OK (5 files, no external URLs outside `playgama-bridge.js`,
  no compressed files).
- `npm run size`: initial download 1.46 MB (target 5 MB, hard 30 MB): bundle 1,195 KB (Phaser),
  `playgama-bridge.js` 300 KB, the rest < 1 KB.
- `npm run e2e`: 4 tests green (≈ 8 s).

### Epic 1 (2026-10-21, same container)
- `npm run check`: clean.
- `npm test`: 89 tests in 11 files, green (≈ 5.5 s). Epic 1 adds 64: rng 3, house 19, state 28,
  hint 4, tutorial 5, core-props 5 (each property test 0.5–1.4 s over 2,000 houses).
- What the property tests' random sequences exercise (a throwaway count, seed 77, 2,000 houses
  of sides 2–9, 229–270 per side): 8,567 placements, 5,991 relocations, 4,359 removals, 2,872
  nudges, 8,722 mark events, 3,899 undos, 2,942 hints (881 placements, 2,061 removals), 5,891
  ghosts turning seen and 3,940 turning lit, 508 moves that calmed two or more ghosts at once,
  726 houses solved.
- Tutorial houses (brute force): one solution each with the given, 2, 4 and 9 without, as
  GDD §3.3 states; each solved by its solution taps in every order without a shiver.
- `npm run build`: green, 1.46 MB (the rules are not in the bundle yet), audit OK;
  `npm run e2e`: 4 green.

### Epic 2 (2026-10-21, same container): Gate A on the built files
The prototype's numbers that set the thresholds are in GENERATOR.md §10; the real code's are
below. "Round 2" is the final build (exact win rates, D55; the cycle-phase turn, D56); "round 1"
is the build the auditor checked (400-playout rates, for the A7 rows re-measured exactly in
brackets). A1–A7 passed in both rounds by the repository's own tests; A8 needed round 1 (D54);
A9 failed on round 1's sampled rates.

| # | Round 2 (final) | Round 1 | Threshold |
| --- | --- | --- | --- |
| A1 | 1,792 of 1,792 with exactly one solution, the stored one | same | 1,792 of 1,792 |
| A2 | 1,792 of 1,792 finished within their band, each reproducing its stored grade; no T4 outside manors; none with two | same | all; 0; 0 |
| A3 | houses 1–3 T1 only; ≥ 1 episode in 1,789 of 1,789; teach, rest, breather at maxTech 2: 103 of 103; hard, positions 4–9, manors using T3: 627 of 627; first T3 at 12; dailies at most T3, **T3 in 46.97 %** | T3 in 47.2 % | ≥ 40 % |
| A3 reported | T3 in positions 1–3: 34.5 %; T4 in 5 of 88 manors (496, 518, 595, 804, 914), one step each | 35.2 %; the same 5 | — |
| A4 | every d in its window (1,789); medians 4–8 **8** < 12–14 **22** > 15–16 **11.5**; 17–19 **9** < 20–22 **28** > 23–24 **10.5** | same | strict order |
| A4 | breathers below their cycle's 4–9 median: 88 of 88; every manor above its cycle: 88 of 88 (d 35–64) | same | 88 of 88 |
| A4 | MA(13) 12.2, MA(50) 24.1: **ratio 1.98** (MA(24) 15.3); worst fall below the running best over 13–50: **3.7** | same | ≥ 1.4; ≤ 6 |
| A4 | cycle means 0–2 / 4–6 / 8–10: 24.24 < 27.06 < 31.12; cycles 10–88 against the mean of 10–87 (30.81): **worst −10.3 %** (cycle 21), cycle 88 (8 houses) −8.7 % | 24.24 < 27.03 < 31.12; −10.3 % | rising; ±15 % |
| A5 | houses 1–3 = GDD §3.3, T1 only, one solution with the given, 2 / 4 / 9 without; houses 1, 2, 3 teach as specified; house 4 (d 8) no objects, first step T2; furniture first at 9, between two solution ghosts; lamp first at 17, its light necessary; first T3 at 12; first T4 at 496 | same | as listed |
| A6 | estSeconds medians: 4–11 **70.75**; 12–14 **116.5**; 15–16 **73.25**; 17–19 **83**; 20–22 **150.5**; 23–24 **87**; positions 1–3 **137**; 4–9 **174**; manors **266.25**; cycle breathers **83**; dailies **159.25**; the longest of 1–16 116.5 s | the same, dailies 159.5 | ≤ 90; 130; 85; 105; 160; 100; 150; 200; 300; 100; 120–200; ≤ 130 |
| A6 reported | the brief's human targets beside the formula (D18): houses 1–3 ≤ 15 s → 10 / 21.5 / 36 s; then a median of 30–90 s → 155.5 s (houses 4–1000 without manors); manors about 120 s → 266.25 s | 156.5 s; 266.25 s | not gated |
| A7 | exact naive on hard houses, positions 1–9 and dailies: **max 0.34375**; on manors: **max 0.25** (house 320) | 0.35 sampled (**0.375 exact**: 14 over the cap); 0.25 | ≤ 0.35; ≤ 0.25 |
| A7 | 1,781 mid and late houses: **mean naive 0.1389**; naive < 0.5 on **97.9 %** | 0.1385 (0.1390 exact); 98.5 % (97.9 % exact) | ≤ 0.25; ≥ 90 % |
| A7 | shallow on the 1,091 houses that use T3: **max 0.5**, **mean 0.272** (median 0.259) | 1,095 houses: max 0.555 (0.5 exact), mean 0.272 | ≤ 0.60; ≤ 0.40 |
| A7 | blind on every generated house: max 0.0012 | same | ≤ 0.01 |
| A7 reported | teach, rest and breather houses (103): naive mean 0.410, max 0.5, < 0.5 on 58.3 % | 0.413, 0.5725, 70.9 % (sampled) | not capped |
| A8 | `npm run levels` **120.0 s** (this container, one core); `levels:check` byte-identical on all four files; 1–36 and 3 dailies rebuilt byte for byte; 792 dailies on 2026-11-01 … 2028-12-31; 1001–1010 (506–515 at 90°) and all 1,485 turned houses 1001–2485 keep one solution and the grade; every house past 1000 keeps its cycle position | 133.7–142.6 s; two files; 501–510 and 1,500 turned houses (old mapping) | ≤ 10 min; identical; as listed |
| A9 | the auditor's re-run over all houses | failed: rates within ±0.07 of the exact ones fell short (house 651 stored 0.5725, exact 0.5; 486 stored 0.3275, exact 0.4049) | 200 of 200 unique; naive within ±0.07 |

Tune rounds (CLAUDE.md, the fun gate: at most two, thresholds fixed):
1. **Round 1 (D54, for A8):** the first build's house 1001 graded d 35 against its stored 29;
   houses that come back turned now grade the same in all four turns. 221 houses changed.
2. **Round 2 (D55–D58, the audit's findings, for A9 and A7):** exact win rates, selected on
   and stored (14 capped houses had passed the cap on a noisy estimate); the turned list keeps
   the cycle phase; play-only files with lazy dailies; the build's 10-minute budget enforced;
   the script rooted at the repository; the boot bar. 19 houses and 11 dailies changed. If
   Gate A still fails after this round, the work stops and Hasan gets the gate report.

Band table next to the calibration (GENERATOR.md §10; prototype in brackets; exact win rates).
The d-window yield is the share of generated candidates (not rejected by steps 2–5) whose grade
at the band's techniques falls inside the d window; the bands of houses 4–24 hold 2–5 houses
each, so their columns are small samples.

| Band | d median | estSeconds median | naive mean | naive < 0.5 | T3 used | d-window yield | candidates per house |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4–8 | 8 | 65.5 s (74) | 0.43 (0.42) | 40 % (67 %) | — | 0.32 (27 %) | 151.0 |
| 9–11 | 12 | 76 s (72) | 0.42 (0.52) | 33 % (53 %) | — | 0.33 (34 %) | 279.7 |
| 12–14 | 22 | 116.5 s (111) | 0.07 (0.26) | 100 % (88 %) | 100 % (38 %; required since D16) | 0.22 (31 %) | 82.7 |
| 15–16 | 11.5 | 73.25 s (68) | 0.36 (0.47) | 50 % (65 %) | — | 0.25 (31 %) | 33.5 |
| 17–19 | 9 | 83 s (90) | 0.36 (0.39) | 100 % (77 %) | — | 0.38 (30 %) | 270.3 |
| 20–22 | 28 | 150.5 s (141) | 0.17 (0.18) | 100 % (95 %) | 100 % (40 %; required since D16) | 0.32 (27 %) | 41.7 |
| 23–24 | 10.5 | 87 s (91) | 0.42 (0.39) | 50 % (85 %) | — | 1.00 (29 %) | 5.5 |

| Row (from house 25) | Houses | d median | estSeconds median | naive median | T3 used | d-window yield | candidates per house |
| --- | --- | --- | --- | --- | --- | --- | --- |
| positions 1–3 | 267 | 22 | 137 s (123 / 137 at cycles 0 / 10) | 0.14 (0.19 / 0.20) | 34 % | 0.27 (19 % / 23 %) | 45.5 |
| positions 4–9 (T3 required) | 533 | 33 | 174 s (159 / 179) | 0.08 (0.11 / 0.11) | 100 % | 0.29 (8 % / 17 %, counted after the T3 rule) | 64.4 |
| cycle breathers | 88 | 10 | 83 s (84) | 0.42 (0.47) | — | 0.47 (27 %) | 38.0 |
| dailies | 792 | 27 | 159.25 s (162) | 0.125 (0.14) | 47 % (57 %) | 0.30 (24 %) | 25.3 |
| manors (T4 allowed once, not required: D8) | 88 | 54 | 266.25 s (243 / 272 with one T4 required) | 0.03 (0.10 / 0.04) | 100 % | 0.35 (0.4 % / 0.9 % with one T4 required) | 61.9 |

Also measured: the shallow player wins T3 houses with a median of 0.26 (prototype 0.31–0.38),
never above 0.5 (0.6). Houses 1–16 at most 116.5 s (120). Houses 4, 9 and 17 took 642, 812 and
790 candidates to find their 50 qualifying ones. The exact walk takes 0.6 s for both players
over all 1,792 houses (the slowest house 8.6 ms). The unit tests: 233 in 24 files, ≈ 9 s (Epic
2 adds 109: solve 5, grade 7, players 13, gen 15, daily-date 3, build-levels 7, houses 6,
gate-a 42, layout 2, scripts 3, and 6 more source rules for `src/gen`). The build stays at
1.46 MB because nothing imports the houses yet; `levels.json` (197 KB) will join the first
download with Epic 3 and `dailies.json` (168 KB) loads on first use (D57).

## Reviews and audits
### Epics 0–1, independent audit (2026-10-21)
Verdict: pass, 0 KRİTİK, 0 YÜKSEK. The auditor's own oracle (written from GDD §3 and D21–D46,
its own generator and grid walks) agreed with `PlayState` event for event on 488,915 moves over
16,000 houses; restore matched D46 on 3,000 junk saves. Findings and their fixes
(`fix(epic-1): audit findings`, each with its test written first and seen failing):

| # | Finding | Fix | Test |
| --- | --- | --- | --- |
| ORTA 1 | An unreadable or newer save was taken for no save and overwritten | D47: v1 fields read from any version ≥ 1; a failed `get` rejects; `SaveStore` states read / newer / pending / unread; no write before a read, none over a newer save, a retried read before writing after a failure | `tests/storage.test.ts` (17: newer save, failed read then retry, late newer, late failure, Bridge backend) |
| ORTA 2 | The model screen missed 5 of 6 faults planted in the rules | D52: strict `Screen` (house-aware: rooms, marks, nudges, phases, required and spurious states, lit rooms, win) | the planted faults (scratch harness): before 1 of 6 caught by the property tests, after 6 of 6, each by the screen test alone; `tests/screen.test.ts` (8) pins each reason |
| DÜŞÜK 3 | The ZIP's SHA differed by time zone | local-midnight `FIXED_MTIME` | `tests/zip.test.ts` (UTC, Europe/Istanbul, America/Los_Angeles) |
| DÜŞÜK 4 | `//host` links passed the audit; a path with a space or "ü" crashed it | protocol-relative pattern; `fileURLToPath` in `audit-dist.mjs` and `size.mjs` | `tests/scripts.test.ts` (3, run from "Shy Ghosts ü") |
| DÜŞÜK 5 | The production smoke scanned only the scripts index.html names and slept 3 s | scans every shipped file on disk (crawls when live); polls the SDK's `platform_message_sent` for GameReady | smoke.spec (a planted stray chunk fails it) |
| DÜŞÜK 6 | A board restored solved stalls the scene | D49: `solvedAtStart` | state.test |
| DÜŞÜK 7 | Status events named neither the other ghost nor the lamp | D48: `by`, `lamps` (`lampsOf` in the house model) | state.test, house.test and core-props (brute force) |
| DÜŞÜK 8 | Nothing kept Epic 3 from writing a slot for the wrong house or moving the house back | D50: `recordHouseInProgress`, `advanceHouse` (`Math.max`), `persistProgress` drops a stale slot | `tests/progress.test.ts` (3) |
| DÜŞÜK 9–10 | Pages publishes `/test/` before the gates; `.claude/` hooks do not load from /home/user | left as they are, on the main session's word | — |
| DÜŞÜK 11 | Constants outside config.ts, unnamed iOS delays, no Boot re-layout | D51: moved to `src/config.ts`, named, Boot lays out on RESIZE | `tests/source-rules.test.ts` (11; red on the committed sources) |

### Epic 2, independent audit and A9 (2026-10-21)
Verdict: Gate A not passed; A9 failed. The auditor's own solver, grader and players (no
repository imports) agreed with the files on uniqueness (1,792 of 1,792), on every grade (1,792
of 1,792) and on the naive policy itself (stored against exact: z mean −0.03, sd 0.98); the
failure was the sampling noise of 400 playouts. Fixes, each with its test written first and seen
failing (tune round 2 of 2; uncommitted for the re-run):

| # | Finding | Fix | Test |
| --- | --- | --- | --- |
| KRİTİK 1 | Each win rate was one 400-playout estimate (±0.07 is 2.8 SE at p ≈ 0.5): house 651 stored 0.5725 (exact 0.5), 486 stored 0.3275 (exact 0.4049) | D55: `exactWinRate`, a memoized walk over every guess of the policy; selected on and stored for both players | `tests/players.test.ts` (13: the T2 and T3 fixtures by hand, an independent exact-fraction enumeration on 300 houses, 50,000 playouts and the auditor's values on four houses); gate-a › A7 re-measures all 1,792 exactly |
| YÜKSEK 2 | A8's 10-minute budget was checked nowhere | D58: the script exits 1 above 600 s; `timeout-minutes: 10` on the CI step | `tests/scripts.test.ts` (`--budget=0` fails it; the CI step's timeout) |
| ORTA 3 | The build selected on the noisy estimate it stored: 14 capped houses above 0.35 exactly | D55 (selection on exact values); the rebuild changed 19 houses and 11 dailies | gate-a › A7 on the exact values (capped max 0.34375) |
| DÜŞÜK 4 | Past house 1000 the cycle phase broke (11 cycle-high houses in a row at 996–1006; breathers 16 apart), every 500 houses | D56: house `506 + ((k − 1001) mod 495)`, 45 whole cycles | `tests/build-levels.test.ts` (the phase over 1001–5455, red on the old mapping for all 4,455 houses) |
| DÜŞÜK 5 | The level files (653 KB, 47 % build metadata) would push the first download to 2.1 MB | D57: play-only `levels.json` (197 KB) and `dailies.json` (168 KB, loaded lazily by `src/data/houses.ts`); metadata in `*-meta.json` | `tests/houses.test.ts` (6: fields, 256 KiB budgets, no source imports the metadata, a Vite build puts the dailies in a chunk of their own behind a relative `import()`) |
| DÜŞÜK 6 | `levels.mjs` gave Vite no root and failed outside the repository | D58: `scripts/lib/levels.mjs` roots Vite at the repository | `tests/scripts.test.ts` (`--smoke` from a directory outside the repository) |
| DÜŞÜK 7 | The boot bar's fill started at the house's left edge (equal widths hid it) | the pure `bootLayout` in `src/game/layout.ts`; BootScene draws from it | `tests/layout.test.ts` (other house widths; red before the fix) |

## Hasan's steps (outside the code)
- [x] Create the GitHub repository `kriptoloca/shy-ghosts` and give the Claude GitHub App access
      (done 2026-10-21; `main` pushed through `fa66f51`; CI and the Pages workflow ran green on
      Epic 0, per the main session).
- [ ] Switch on GitHub Pages once the first build exists (after Epic 0 is pushed): Settings →
      Pages → Source: "GitHub Actions". The workflow skips the deploy with a warning until then.

## Next steps (in order)
1. The auditor re-runs A9 over all houses on the uncommitted tree (exact rates now: D55), with
   the review of the fixes. Gate A passes when A1–A9 hold and no KRİTİK or YÜKSEK is open: then
   `feat(epic-2)` and the verdict on the board. This was tune round 2 of 2: if Gate A still
   fails, the work stops and Hasan gets the gate report with a recommendation (CLAUDE.md).
2. Epic 3 (graybox loop) → **Gate B**. From Epic 2: read the houses through `src/data/houses.ts`
   (`playHouse(k)`, which turns 506–1000 after house 1000 keeping the cycle phase, D56;
   `dailyHouse(date)`, lazy, D57); never import the `*-meta.json` files. `levels.json` adds
   197 KB to the first download (about 1.66 MB of the 5 MB budget). Carried over from the Epic 1
   audit:
   - after every restore, check `PlayState.solvedAtStart` and play the win (or move on) yourself:
     no `solved` event will come (D49);
   - change the save only through `recordHouseInProgress` and `advanceHouse` (D50);
   - draw the seen lines from `status.by` and flash the lamps in `status.lamps` (D48);
   - the screen e2e compares the scene with the strict model screen of
     `tests/support/screen.ts` (D52).
3. Both gates passed: graybox screenshots to Hasan, then the `/test/` link; Epic 4 starts. A gate
   still failing after two tune rounds: stop, and Hasan gets the gate report with a
   recommendation (CLAUDE.md, the fun gate).
4. Open, not blocking before Epic 4: Hasan's answer on pace or depth (docs/questions.md, Open
   questions).
