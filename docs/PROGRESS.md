# PROGRESS.md — where we are

Single source of truth for "where did we leave off". Read first at the start of every session;
update at the end of every epic.

## Status
**Gate B round 4 played on `363ccbb` (2026-10-23, docs/gate-b-round4.md): B1 and B3–B7 pass,
verdict YES (Flow 4, Fair 4), interest median 4 over houses 4–20 with 14 of 17 at 4 or more;
B2 reads 20 of 23 houses cell for cell (three shelf cells put in the neighbouring room; a shelf
cell holds nothing) against its 100 %. Whether Gate B passes on this is Hasan's decision; the
main session moves no bar.** Gate B tune round 3, the last (D91–D103), is built, audited and
pushed: Gate A A1–A9 passed on the auditor's checker with only A6's ceilings for houses 8–24
raised (D97). · Epics 0–3 and tune rounds 1–3 done and pushed (`kriptoloca/shy-ghosts`, `main`
at `363ccbb feat(gate-b): tune round 3`) · Last update: 2026-10-23 · Branch: `main`
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

## Session plan (Epic 2 — content pipeline, `src/gen`) — done 2026-10-21 (`4cd221d`, Gate A passed)
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

## Session plan (Epic 3 — layout and graybox loop) — built and audited 2026-10-21, fixes uncommitted
Baseline: `4cd221d feat(epic-2)` (Gate A passed). First the A9 re-audit's three DÜŞÜK items:
GENERATOR.md §5, §7, §9 and GDD.md §7, §9 follow D55 and D56 (no threshold changed); GENERATOR.md
§5 records why the exact walk fails the build at `PLAYER_STATE_LIMIT`; `scripts/size.mjs` reports
the first download and the lazy chunks apart (`tests/scripts.test.ts`, red on the old script).

Risk: a graybox that a player without rules cannot read (Gate B), or one that looks like the
coloured grid of other region puzzles. De-risk: rooms by lightness and pattern (never hue alone),
thick walls, every ghost state a texture of its own that differs in shape, lightness and colour,
the cause of every shiver drawn (D59); screenshots at 9:16, 1:1 and 16:9 checked by eye; the
e2e compares what is drawn with the rules and the strict model screen after every step.

Tasks, in order (each with its tests, red first where they test a fix):
1. [x] `computeLayout`, `cellAt`, `cellCenter` (D61) [`tests/layout.test.ts` (10): every design
   size in 40 px steps, both orientations: cells ≥ 80 px at 9 × 9, no overlap, all on screen].
2. [x] `src/game/look.ts`: room styles and wall runs [`tests/look.test.ts` (3): neighbours differ
   in tone and pattern on all 1,795 houses; walls exactly between rooms].
3. [x] `src/game/view.ts` (the scene's board picture, played back from events) and
   `src/game/visible.ts` [`tests/view.test.ts` (6): equal to the rules after every move on
   1,000 random houses, the strict model screen accepting every list; the text, cell by cell].
4. [x] `src/game/gesture.ts` (taps, drags, the 24 px threshold) [`tests/gesture.test.ts` (6)];
   `src/game/session.ts` (solve time, moves, hints, conflicts, the hint's cooldown)
   [`tests/session.test.ts` (5)].
5. [x] `src/game/graybox.ts` (the drawn textures), `src/game/board.ts` (the house on screen,
   playback, read-back), `src/game/hud.ts` (undo, hint), `src/game/scenes/GameScene.ts` (the
   loop, the win beat and slide, saves, resume, pause), `src/data/houses.ts` wired in.
6. [x] Dev hooks: `state()` (with a per-house tally), `cellCenter(i)`, `buttonCenter(name)`,
   `solution()` (null under `?playtest=1`), `house()`, `visible()`, `drawn()`, `rules()`,
   `events()` (D62); `?house=N`; `scripts/dev-url.mjs` prints the playtest links.
7. [x] E2e [`tests/e2e/graybox.spec.ts` (14)]; the source rules also hold for the new game files
   and keep the Game scene on the save guards (D50) [`tests/source-rules.test.ts` (26)]. One e2e
   caught a real bug: Phaser's `setInteractive` keeps an existing hit area, so after a new screen
   size the buttons answered to their old circle; the HUD now moves the circle itself.
8. [x] Gate: `npm run check`, `npm test` (267), `npm run levels:check`, `npm run build`,
   `npm run e2e` (18) green; this file, TASKS.md, D59–D62.
9. [x] The audit's findings, each red first ("Epic 3, independent audit" below; D63–D66): 26
   unit tests and 8 e2e added, 10 e2e and the production scan extended; `npm test` (293),
   `npm run e2e` (26) green.

AC → test (TASKS.md Epic 3):

| AC | Test | Status |
| --- | --- | --- |
| Load → house 1 interactive within 3 s | graybox.spec › "load → house 1 interactive within 3 s → houses 1–3 …" (`interactiveAt` ≤ 3,000 ms; measured ≈ 0.5 s) | green |
| Houses 1–3 solved through real taps in under a minute; each next house starts by itself | the same test (real mouse taps at `cellCenter`, the next house slides in by itself) | green |
| A conflict shows the seen state at once | graybox.spec › "a conflict shows the seen state at once" (drawn right after the tap) | green |
| Relocation, removal, marks (paint, erase) and undo | graybox.spec › "relocation, removal, marks (paint, erase) and undo …" | green |
| A reload resumes the house in progress (ghosts, marks, seconds) | graybox.spec › "a reload resumes the house in progress …" | green |
| After rapid taps the settled screen equals the rules | graybox.spec › "after rapid taps, drags, undos and a hint …" (drawn = strict model screen = rules). Every graybox e2e that plays a move ends with the same check, and every house it finishes is replayed on the strict model screen through `previous()` (the four tests that did not before were the audit's DÜŞÜK 7) | green |
| 9:16, 1:1 and 16:9 lay out without overlap, cells ≥ 80 px at 9 × 9 | layout.test (every design size); graybox.spec › the three aspect runs, "a new screen size mid-house …" and "the buttons follow a new screen size …" | green |
| A platform pause freezes everything; the waking tap is ignored | graybox.spec › "a platform pause freezes the house and dims it …"; smoke.spec › "a platform pause turns input off …" | green |
| No external requests | the `guard` fixture after every e2e test | green |
| `solution()` is null under `?playtest=1` | graybox.spec › "?playtest=1 hides the solution …" | green |
| (carried over) a board restored solved plays its win (D49); the save only through the guards (D50) | graybox.spec › "a house restored already solved …"; source-rules › the Game scene and the progress guards | green |
| (carried over) the strict model screen is the reference (D52); `by` and `lamps` drive the sight line and the lamp flash (D48) | every e2e step replays `events()` on `tests/support/screen.ts`; `src/game/board.ts` `flashLines(by)`, `flashLamps(lamps)` | green |

### For the Gate B playtester (TASKS.md Epic 3 protocol)
Start the dev server with `npm run dev` (port 5173; it also prints LAN links for a phone). The
protocol's start link is `http://localhost:5173/?reset=1&playtest=1&renderer=canvas&fpsmin=1`:
house 1 on a fresh save; every next house slides in by itself after a solve. `?house=N` opens house
N (with `?reset=1` on a fresh save); without `?reset=1` a reload goes on from the save. The hooks
on `window.__ghostDebug`: `visible()` (the board as text, in words of what is drawn and never of
the rules, D63), `state()` (in playtest mode only the neutral fields of D87: the house to play
and the one on screen, seconds, paused, input open or closed, taps, drags, presses of the arrow
and the bulb, `bulbReadyIn`, arrangement, n and cell), `cellCenter(i)` and
`buttonCenter('undo' | 'hint')` (page px for aiming real taps); `solution()` is null in playtest
mode. Since round 2 the demonstrations (houses 1, 2, 3, 5, 8, 10) play before input opens and
again after 5 s without input until the house's first placement (D83).

| House | URL |
| --- | --- |
| 1 | `http://localhost:5173/?reset=1&house=1&playtest=1&renderer=canvas&fpsmin=1` |
| 2 | `http://localhost:5173/?reset=1&house=2&playtest=1&renderer=canvas&fpsmin=1` |
| 3 | `http://localhost:5173/?reset=1&house=3&playtest=1&renderer=canvas&fpsmin=1` |
| 4 | `http://localhost:5173/?reset=1&house=4&playtest=1&renderer=canvas&fpsmin=1` |
| 5 | `http://localhost:5173/?reset=1&house=5&playtest=1&renderer=canvas&fpsmin=1` |
| 6 | `http://localhost:5173/?reset=1&house=6&playtest=1&renderer=canvas&fpsmin=1` |
| 7 | `http://localhost:5173/?reset=1&house=7&playtest=1&renderer=canvas&fpsmin=1` |
| 8 | `http://localhost:5173/?reset=1&house=8&playtest=1&renderer=canvas&fpsmin=1` |
| 9 | `http://localhost:5173/?reset=1&house=9&playtest=1&renderer=canvas&fpsmin=1` |
| 10 | `http://localhost:5173/?reset=1&house=10&playtest=1&renderer=canvas&fpsmin=1` |
| 11 | `http://localhost:5173/?reset=1&house=11&playtest=1&renderer=canvas&fpsmin=1` |
| 12 | `http://localhost:5173/?reset=1&house=12&playtest=1&renderer=canvas&fpsmin=1` |
| 13 | `http://localhost:5173/?reset=1&house=13&playtest=1&renderer=canvas&fpsmin=1` |
| 14 | `http://localhost:5173/?reset=1&house=14&playtest=1&renderer=canvas&fpsmin=1` |
| 15 | `http://localhost:5173/?reset=1&house=15&playtest=1&renderer=canvas&fpsmin=1` |
| 16 | `http://localhost:5173/?reset=1&house=16&playtest=1&renderer=canvas&fpsmin=1` |
| 17 | `http://localhost:5173/?reset=1&house=17&playtest=1&renderer=canvas&fpsmin=1` |
| 18 | `http://localhost:5173/?reset=1&house=18&playtest=1&renderer=canvas&fpsmin=1` |
| 19 | `http://localhost:5173/?reset=1&house=19&playtest=1&renderer=canvas&fpsmin=1` |
| 20 | `http://localhost:5173/?reset=1&house=20&playtest=1&renderer=canvas&fpsmin=1` |
| 27 | `http://localhost:5173/?reset=1&house=27&playtest=1&renderer=canvas&fpsmin=1` |
| 31 | `http://localhost:5173/?reset=1&house=31&playtest=1&renderer=canvas&fpsmin=1` |
| 34 | `http://localhost:5173/?reset=1&house=34&playtest=1&renderer=canvas&fpsmin=1` |

## Session plan (Gate B tune round 1 of 2) — done 2026-10-21 (`bfd2b96`)
Baseline: `4e40bd2 feat(epic-3)`. The plan is the lead designer's, copied whole into
docs/gate-b-round1.md; its decisions are D67–D79. Gate A's thresholds and Gate B's bars are
unchanged. Each task's tests were written first and seen failing (the new e2e against the
`4e40bd2` build: 13 of 13 red), then green before the next task.

1. [x] Insight names in the grader's one pass; `insights` and `insightEpisodes` in the meta
   [`tests/grade.test.ts`: the §4.5 fixtures (shape, count, chain), new `line`, `lamp` and
   `cross` fixtures, the simplest name on a tie].
2. [x] Object relevance, literal and rule isolation, decided by the grader
   [`tests/relevance.test.ts`].
3. [x] House rules, residents, 6 × 6 for 10–11, 8 × 8 manors, tricks, `CANDIDATE_LIMIT` 50,000,
   `UNIQUE_FIX_MOVES` 50, the insight-aware turn test; rebuild [`tests/round1.test.ts` (14),
   `tests/build-levels.test.ts`; Gate A unchanged].
4. [x] Layout: portrait side margin 12 [`tests/layout.test.ts`: CSS cells, walls].
5. [x] Palette and room styles [`tests/contrast.test.ts`: F1–F7 over every floor state;
   `tests/look.test.ts`].
6. [x] Walls, bookshelf, lamp outline, hatch, settled ring and wash, dark marks and lines
   [`tests/source-rules.test.ts`; round1.spec › wall pixels at 360 × 640 in houses 1, 17, 34].
7. [x] Feedback and timing: settle bob, 60 ms shiver, the finale [`tests/motion.test.ts` against
   GDD §3a; round1.spec › the finale's length, the 300 and 700 ms taps].
8. [x] Teaching demonstrations [`tests/demo.test.ts`; round1.spec › houses 1, 9, 17, the skip,
   no replay on a resume].
9. [x] Drag moves a ghost [`tests/state.test.ts`, `tests/gesture.test.ts`,
   `tests/house-log.test.ts`; round1.spec › carrying, refused drops, paint and resident drags].
10. [x] The two-press hint [`tests/hint.test.ts`, `tests/state.test.ts`, `tests/session.test.ts`;
    graybox.spec › the hint, the playtest test (no cell in the hooks)].
11. [x] Progress dots [`tests/layout.test.ts`, `tests/contrast.test.ts`; every e2e rest checks the
    full dots against the settled rooms; round1.spec › the dots fill].
12. [x] The neutral legend [`tests/view.test.ts`, `tests/support/rule-words.ts`; the e2e].
13. [x] Docs: GDD §3.1, §3.3, §3a, §4, §7, §11, §12; GENERATOR §1.1, §4.6, §6, §6.1, §7, §8,
    §10.1; TASKS Epic 3; docs/questions.md D67–D79; this file.
14. [x] Gates: `npm run check`, `npm test` (392), `npm run levels:check` (207.0 s),
    `npm run build`, `npm run e2e` (39), `npm run size` (1.71 MB) green; the design critique of
    the palette ("Measured" below). Open for the main session: the auditor's A9 re-run on the new
    levels, `code-review` and the adversarial audit, the commit.

AC → test (docs/gate-b-round1.md §8):

| AC | Test | Status |
| --- | --- | --- |
| Two insight episodes in every house from 10 and every daily | round1.test › "two insight episodes …" (991 of 991, 792 of 792) | green |
| Two kinds in hard, cycle 1–9, manor and daily houses | round1.test › "two kinds of insight …" (1,686 of 1,686) | green |
| Houses 4–8: shape, line, cross, line and cross, another; 9 a real insight; 10 a cross; consecutive teach houses differ | round1.test › houses 4–8, house 10 (0 of 9 pairs share a trick) | green |
| Turned houses 1001–2485 keep their insights | round1.test › "past house 1000 …" | green |
| No object idle by either test | round1.test › "no block or lamp is idle …" (1,734 houses with objects) | green |
| No board above 8 × 8 | round1.test › "no board above 8 × 8" | green |
| Residents only in 1–3, 9 and 17; 9's pair across a shelf; 17's beside the beam, unlit | round1.test › the residents tests | green |
| Gate A unchanged | gate-a.test (42) on the new files | green |
| Cells ≥ 44 CSS px at 360 × 640, ≥ 66 at 540 × 960, ≥ 80 design px everywhere | layout.test; round1.spec › walls (the CSS cell at 8 × 8) | green |
| F1–F7 in normal vision, grayscale, deuteranope | contrast.test (every floor state) | green |
| Wall pixels ≥ 4.5:1 against the floor beside them at 360 × 640 (houses 1, 17, 34) | round1.spec › "house N at 360 × 640: every wall …" | green |
| The finale lasts 2.0 ± 0.2 s; a tap at 300 ms does not skip, one at 700 ms does | round1.spec › the two finale tests | green |
| Demos in 1, 9, 17: input opens ≤ 1.6 s; a tap skips without placing; no replay on a resume | round1.spec › the demonstration tests | green |
| A ghost dragged across rooms; a drag from an empty cell still paints | round1.spec › the two drag tests | green |
| Press 1 places nothing, press 2 places, one cooldown | graybox.spec › "the hint: the first press shows why …" | green |
| Dots fill with the rooms | round1.spec › "the progress dots fill …"; `settledEqualsRules` at every rest | green |
| The legend names no rule | view.test; graybox.spec › the playtest test | green |

## Session plan (Gate B tune round 2 of 2, the last) — built 2026-10-21, uncommitted
Baseline: `bfd2b96`. The plan is the lead designer's, copied whole into docs/gate-b-round2.md;
its decisions are D80–D89. Gate B's bars B1–B7 are unchanged; Gate A's thresholds are unchanged
and one of its clauses moved, with Hasan's approval ("Evet, öne al", D82). The round-1 code
audit's findings (0 KRİTİK, 0 YÜKSEK) are fixed in the same round. Each task's tests were written
first and seen failing, then green before the next task.

1. [x] The autopilot (`src/gen/autopilot.ts`) [`tests/autopilot.test.ts`: a fixture per pattern
   and per budget level, a count stall and a cross stall; calibration on the list round 2 played
   (`tests/fixtures/round2-houses.json`): it finishes houses 4–20 but 13 and 20].
2. [x] A9's three fixes [`tests/relevance.test.ts`, `tests/build-levels.test.ts`,
   `tests/round1.test.ts` (turned houses); D88: since the round-2 code audit, `houseAt` leaves a
   turned house's step names out].
3. [x] The ladder of houses 4–24, the lesson tests, the opening rules; rebuild
   [`tests/round2.test.ts` (22); the build equals the plan's prototype byte for byte].
4. [x] The Gate A amendment [`tests/gate-a.test.ts` 42 of 42; GENERATOR §9; D82].
5. [x] Demonstrations in 1, 2, 3, 5, 8, 10 [`tests/demo.test.ts`, `tests/session.test.ts`;
   round1.spec, round2.spec, timing.spec].
6. [x] Success louder than failure [`tests/motion.test.ts`; timing.spec › the pixel measure].
7. [x] Palette, room looks, swatch ticks, no wash, the time below the board
   [`tests/contrast.test.ts`, `tests/look.test.ts`, `tests/layout.test.ts`; round2.spec].
8. [x] The hint's reason until the next move [`tests/session.test.ts`; round2.spec].
9. [x] The neutral `state()`, the legend's colour words [`tests/view.test.ts`; round2.spec].
10. [x] Docs: GDD §3.3, §3a, §4, §7, §11; GENERATOR §4.6, §4.7, §6, §7, §8, §9, §10.2; TASKS
    Epic 3; docs/questions.md D80–D89 (D69 and D72: CLAUDE.md updated by the main session); this
    file.
11. [x] Gates: `npm run check`, `npm test` (468), `npm run levels:check` (195.3 s),
    `npm run build`, `npm run e2e` (56, none retried), `npm run size` (1.72 MB) green; the design
    critique of the palette ("Measured" below).
12. [x] The round-2 code audit (1 KRİTİK, 1 YÜKSEK, 2 ORTA, 10 DÜŞÜK; "Reviews and audits"
    below), each finding with a test seen failing first; the A9 re-run passed. Gates again:
    `npm run check`, `npm test` (477), `npm run levels:check` (188.3 s, byte-identical),
    `npm run build`, `npm run e2e` (66, none retried; the timing project green three runs in a
    row), `npm run size` (1.72 MB). Open for the main session: the re-audit, the commit.

AC → test (docs/gate-b-round2.md §8, and the round-1 code audit):

| AC | Test | Status |
| --- | --- | --- |
| The autopilot's patterns and budget levels; calibrated on round 2's list (4–20 finished but 13 and 20) | autopilot.test | green |
| A9: the see-through block stays a block; `lightNeeded` with the residents placed; turned houses carry no base step names | relevance.test, build-levels.test, round1.test › turned houses | green |
| No house 4–10 finished on autopilot with nothing new; only 15 of 4–20 asks nothing; 8 open with a real insight | round2.test › (a) | green |
| Each lesson proved by its test; insight houses stall before their first ghost; the roles and boards of §1.3 | round2.test › (a) | green |
| No free opening in 11–24 but 17; no two houses in a row open alike; house 12 a cross | round2.test › how the houses open | green |
| Shelf at 5, count at 7, lamp at 8; residents only in 1–3, 5 and 8 | round2.test; gate-a.test (A3, A5 as amended) | green |
| Houses 25–1000 and the dailies as round 1's but daily 2027-10-02 | round2.test › the digests (`tests/fixtures/round1-digests.json`) | green |
| Gate A, 42 of 42; `levels:check` ≤ 600 s | gate-a.test; `levels:check` 195.3 s | green |
| Each demonstration shows its element and ends on the hold frame; house 1's copy on (0,1) | demo.test | green |
| Input closed during the first play; a skip is never a game tap; no first play on a resume | round1.spec › houses 1, 5, 8, the skip, the resume | green |
| Replays after 5 s idle, none after the first placement; a resume replays; a leftover finale tap never skips (ORTA 2) | session.test; round2.spec (3) | green |
| A demonstration lasts its script; a pause of 300, 450 or 800 ms lengthens it by the pause (ORTA 3) | timing.spec (6) | green |
| A settle ≥ 3× a conflict's changed area and 2× its time in motion; a solve 10× and 6× | timing.spec › success outweighs failure | green |
| §3a rows, the inversion test; a shiver plays 2 × 30 ms (the hint's tremble 4 × 30) | motion.test | green |
| The finale about 2.4 s, its beat ending on the first frame past 2,050 ms; a tap at 700 ms cuts it, one at 300 ms does not | timing.spec (2); round1.spec | green |
| F1–F7 over every floor state in three views; every ink against the floor it touches (DÜŞÜK 7) | contrast.test | green |
| Room styles on all 1,795 boards: neighbours differ in level, hue and pattern; up to 8 rooms all distinct | look.test | green |
| No wash; every ink touches only its floor on screen | round2.spec (2) | green |
| The time box never meets a swatch, in every arrangement | layout.test › timeBox | green |
| The hint's reason stays at 5 s and 10 s; the next tap takes it away and acts | session.test; round2.spec | green |
| A new size keeps the reason and the finale's time; it ends the slide, then the demonstration (DÜŞÜK 6) | round2.spec (2) | green |
| `state()` under `?playtest=1` names no rule and no mechanic (ORTA 1); colour words tied to their constants | round2.spec; view.test | green |
| A placed ghost nudges only in a drag; each move's kind is logged (DÜŞÜK 8) | screen.test, house-log.test | green |
| The dev state stays out of the production bundle (DÜŞÜK 9); no test retried, a flaky one fails (ORTA 5) | smoke.spec (`DEV_ONLY`); playwright.config | green |
| Round 2's code audit: the finale's beat within 50 ms of 2,050 (KRİTİK 1) | timing.spec › the finale (no GPU flags) | green |
| No replay while a carry, a finger, a button or a hint's reason is held; a resumed house too (YÜKSEK 1, ORTA 1) | round2-audit.spec (5); session.test › never while held | green |
| A pause during a replay saves (DÜŞÜK 1); a move clears a pulse-only reason (DÜŞÜK 2) | round2-audit.spec (2) | green |
| The start frame does not count; a replay skips at once (DÜŞÜK 3) | session.test (2) | green |
| The hop ends the last settle (DÜŞÜK 4); the solve scored on its beat (DÜŞÜK 5) | timing.spec (3) | green |
| The resize test asserts the beat (DÜŞÜK 6) | round2.spec › a new screen size keeps … | green |
| Digits drawn only when they change; styles once per house (DÜŞÜK 7) | look.test (2) | green |
| Turned houses carry no step names; no game code reads them (DÜŞÜK 8) | round1.test (2) | green |
| The rule hooks throw under `?playtest=1` (DÜŞÜK 9) | round2-audit.spec | green |
| One shadow walk for house 10's lesson and demonstration; the levels unchanged (DÜŞÜK 10) | house.test (2), demo.test; `levels:check` | green |

## Session plan (Gate B tune round 3, the last) — built 2026-10-23, uncommitted
Baseline: `4d4ba4e feat(gate-b): tune round 2` and round 3's report. The plan is the project
manager's, appended whole to docs/gate-b-round3.md ("Tune round 3 (D91–D103): the plan") with the
port's departures after it; its prototype (scratch) is the reference, and its decisions are
D92–D103. Gate A's thresholds are unchanged but A6's ceilings for houses 8–24, raised by Hasan's
D91 to the plan's §1.7 values (D97). Each task's tests were written first and seen failing, then
green with `npm test` and `npm run check` before the next task.

1. [x] The depth profile (`src/gen/depth.ts`) [`tests/depth.test.ts`: tags on fixtures; the
   calibration on round 3's list, `tests/fixtures/round3-houses.json`: no house stalls twice,
   every tail ≥ 4].
2. [x] The deepening search (`src/gen/deepen.ts`) [`tests/deepen.test.ts` (16): determinism, the
   solution kept and unique, rooms connected and within size, residents and lamps fixed,
   canonical grading, a small target met, an idle shelf dropped, the early stop; seven mutations
   of the module, each caught].
3. [x] The rungs 8–24, the opener and pattern history, `LADDER_STARTS`, house 8's demonstration
   cell, `npm run levels:starts`; rebuild in 198.9 s [`tests/round3.test.ts` (16), which
   replaces the seven round-2 ladder tests that fail on the new list as the plan says;
   `tests/house.test.ts` (`lightDemoCell`); `tests/scripts.test.ts` (`levels:starts`)].
4. [x] Gate A: A6 split at house 8 and raised for 8–24 only [`tests/gate-a.test.ts`: red on the
   new list (4–11 median 102 > 90), then 43 of 43].
5. [x] The hint: the reason in beats with digits, the recharge refunded when a move cancels the
   reason and kept by the save (v2) [`tests/hint.test.ts`, `session.test.ts`, `storage.test.ts`,
   `layout.test.ts` (badges), `contrast.test.ts` (hint dots), `view.test.ts`;
   `tests/e2e/round3.spec.ts` (4)].
6. [x] The held result card (`src/game/card.ts`, the scene's `card` phase) [`layout.test.ts` ›
   `cardBox`; round3.spec (4); timing.spec › the finale].
7. [x] The relocation glide: 320 ms, a lean of 8°, an afterimage [`motion.test.ts` (the GDD row);
   timing.spec › "a relocation glides …": red on the old glide (afterimage 0 ms), green 10 frames
   between and 298 ms].
8. [x] Swatch rule S1, lit stripes outlined on both sides [`look.test.ts` (S1 on every house;
   house 34 failed it); `contrast.test.ts` (F5 kept, F5b new)].
9. [x] The centred landscape [`layout.test.ts` over every landscape design size].
10. [x] House 8's demonstration on a lit cell no resident sees [`demo.test.ts`].
11. [x] Docs: GDD §2, §3.1–§3.3, §3a, §11, §12; GENERATOR §4.8, §6, §6.2, §7, §8, §9, §10.3;
    TASKS (the A6 line, the round-3 checklist); docs/questions.md D92–D103;
    docs/gate-b-round3.md; this file.
12. [x] Gates: `npm run check`, `npm test` (549), `npm run levels:check` (195.9 s,
    byte-identical), `npm run build`, `npm run e2e` (75, none retried), `npm run size`
    (1.73 MB) green; the design critique of the swatch rule and the card ("Measured" below).
13. [x] The code audit (1 KRİTİK, 1 ORTA, 5 DÜŞÜK) and the A9 re-run (passed; 2 DÜŞÜK), each
    finding fixed with a test seen failing first ("Reviews and audits" below). Gates again:
    `npm run check`, `npm test` (554), `npm run levels:check` (199.2 s, byte-identical),
    `npm run build`, `npm run e2e` (77, none retried; the timing project green three runs in a
    row), `npm run size` (1.73 MB). Open for the main session: the commit; then round 4.

E2e tests changed by the held card and the rebuild (no assertion dropped, none loosened, no
retries):
- graybox.spec: "load → house 1 interactive …", the three aspect runs, "a house restored already
  solved …" (now also asserts the card of house 2) and "a new screen size during the win beat …"
  tap the card to go on; "a press held on the hint from the win beat …" and "a tap in the beat
  skips it …" now also press through the card; the playtest test reads house 17 as 7 × 7 (D95).
- round1.spec: "a tap 300 ms into the finale …" taps the card after the beat.
- round2.spec: "a tap left over from the finale …" taps the card first; "a new screen size keeps
  the hint's reason, and the solve time on the held card" (the time now sits on the card, and the
  card's house is asserted); "a new screen size during the slide …" waits for the slide after
  the card; "a settled room keeps its floor" picks an unlit cell (round 3's first empty cell is
  lit now).
- timing.spec: the finale test measures the beat (±50 ms as before), the card up within 2.7 s of
  the last placement, and the slide within 200 ms of its length after the tap (the whole 2.4 s
  finale no longer runs on by itself); "a tap 700 ms …" and the demonstration-after-solve tests
  tap the card; the glide test is new.

AC → test (the plan's §9):

| AC | Test | Status |
| --- | --- | --- |
| Depth tags on fixtures; round 3's houses 4–24 never stall twice, every tail ≥ 4 | depth.test | green |
| The search: deterministic, one solution, rooms connected and sized, residents and lamps fixed, canonical grade, a small target met, an idle shelf dropped, the early stop | deepen.test | green |
| Houses 9–24 stall ≥ 2 (13, 14, 17–22 ≥ 3); a real step after ≥ 2 ghosts; tail ≤ 3; autopilot runs ≤ 3; two kinds in hard houses; house 8 stalls once, after its first ghost | round3.test › depth | green |
| Boards 6 × 6 at 7–8 and 7 × 7 from 9; lessons 5, 7, 8, 10, 16, 17, 18 pass their tests | round3.test › depth, the lessons | green |
| Each opener unlike the two before; the two-room count opens one house; no pattern repeats the house before | round3.test › openers and patterns | green |
| Houses 8–24 the prototype's byte for byte; 1–7, 25–1000 and the dailies round 3's | round3.test › the files (`round3-ladder.json`, `round3-digests.json`); the byte check against the prototype's files | green |
| `levels:starts` reproduces the starts of 8–10 (157, 256, 256); build ≤ 600 s | round3.test, scripts.test; `levels:check` 195.9 s | green |
| Gate A 43 of 43 with A6 as D97 | gate-a.test | green |
| The reason script on a count, a cross and a claim (digits, dots, the final 1); the refund; a v1 save migrates | hint.test, session.test, storage.test | green |
| The first press: the count's digit 2 and dots on exactly the cells the grader removes; a tap elsewhere clears it and the bulb is ready; the second press starts the cooldown; a reload with 50 s left restores 50 ± 1 s | round3.spec (4) | green |
| The card up within 2.7 s and held 10 s; a tap at 300 ms does nothing, at 700 ms continues; the waking tap does nothing; `visible()` lists its digits; it never meets the board, a swatch or a button | round3.spec (4), timing.spec, layout.test | green |
| The glide: ≥ 3 frames between, an afterimage ≥ 200 ms | timing.spec | green |
| S1 on every house; F5 kept; F5b | look.test, contrast.test | green |
| Landscape: the board's centre at the screen's ± 1, no overlap, cells ≥ 80 at 8 × 8 (aspect 1.2–2.22) | layout.test | green |
| House 8's copy on a lit cell no resident sees | demo.test, house.test, round3.test | green |

## Epic board
| Epic / gate | Scope | Status | Evidence |
| --- | --- | --- | --- |
| 0 | Scaffold, pipeline, platform shell | done, audited, pushed (`e5161dc`); CI and Pages green | 25 unit tests (5 files) + 4 e2e; check clean; build 1.46 MB (target 5 MB); audit-dist OK |
| 1 | Core rules (`src/core`) | done, audited (0 KRİTİK, 0 YÜKSEK, 2 ORTA, 9 DÜŞÜK), pushed (`fa66f51`); findings fixed in `fix(epic-1)` | 124 unit tests (16 files) incl. 5 property tests over 2,000 random houses; the auditor's oracle: 488,915 moves on 16,000 houses, 0 mismatches; 4 e2e |
| 2 | Content pipeline (M0): solver, grader, players, generator, 1,000 houses + 792 dailies | done, audited, pushed (`4cd221d`); tune round 2 of 2 used (D55–D58) | 233 unit tests (24 files); `npm run levels` 120.0 s; `levels:check` byte-identical |
| **Gate A** | GENERATOR.md §9, A1–A9 | **passed** (2026-10-21): the auditor's own segment code, solver and players agree on all 1,792 houses | `tests/gate-a.test.ts` (42); "Measured (Epic 2)" below |
| 3 | Layout and graybox loop (M1) | done, audited, every finding fixed red-first, pushed (`4e40bd2`) | 293 unit tests (32 files), 26 e2e; "Measured (Epic 3)" below |
| **Gate B** | TASKS.md Epic 3, B1–B7 (the playtester's verdict) | rounds 1–3: **not passed** (round 3: B5, B7); tune rounds 1 and 2 committed (`bfd2b96`, `4d4ba4e`); tune round 3, the last (D91), built, uncommitted (D92–D103); round 4 next, a fail ends Shy Ghosts | 554 unit tests (40 files), 77 e2e; "Measured (Gate B tune round 3)" below |
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

### Epic 3 (2026-10-21, same container): the graybox
- `npm run check`: clean. `npm test`: 267 tests in 28 files, green (≈ 10 s; Epic 3 adds 34:
  layout 4, look 3, view 6, gesture 6, session 5, scripts 1 (size), source rules 9).
- `npm run levels:check`: byte-identical (≈ 2 minutes).
- `npm run build`: green, audit OK. `npm run size`: first download 1.69 MB (bundle 1,425 KB with
  Phaser and the 197 KB `levels.json`, Bridge 300 KB), no lazy chunk yet (nothing calls
  `dailyHouse` before Epic 5, so the dailies are not in the build at all).
- `npm run e2e`: 18 green (smoke 4, graybox 14). The first house is interactive ≈ 0.5 s after
  navigation (dev build, headless Chromium, Canvas renderer); the e2e that loads and then solves
  houses 1–3 by real taps, win beats and slides included, takes 7–9 s.
- Cell size at 9 × 9: 112.9 design px at 9:16 (≈ 41 CSS px on a 390 px wide phone) and 16:9,
  83.6 at 1:1 (≈ 46 CSS px at 600 × 600).
- Screenshots checked by eye (9:16 houses 1, 9, 12, 17, 9:16 close-ups of every ghost state, 1:1
  house 34, 16:9 house 17, the win beat and the slide); scratch only, not in the repository.
- After the audit fixes: `npm test` 293 tests in 32 files (≈ 16 s; adds visible 1, house-log 3,
  pool 2, layout 1, motion 17, contrast 1, source rules 1 for `pool.ts`);
  `npm run e2e` 26 green (smoke 4, graybox 22, ≈ 1.8 minutes). The rapid-tap e2e plays its 45
  taps, undos, a drag and a hint with a handful of pooled effect drawings (made < used). The
  production bundle no longer holds the move log, the tally or `drawn()`'s read-back.
- Colour margins (`npx vitest run tests/contrast.test.ts --reporter=verbose`; WCAG contrast, ΔE,
  deuteranope ΔE; no thresholds until the tune plan): walls on the darkest floor 1.43:1 (ΔE
  18.1); neighbouring floor tones 1.27–1.30:1 (ΔE 7.3–8.1); a glowing room against the closest
  plain tone 1.26:1 for tone 0 (ΔE 27.5, deuteranope 12.1), 1.44, 1.63 and 2.40:1 for tones 1–3;
  marks on lit cells at least 1.96:1, on glowing cells 1.84:1, on lit cells of a glowing room
  1.41:1.

### Gate B tune round 1 (2026-10-21, same container)
- `npm run check` clean; `npm test` 392 tests in 35 files (≈ 35 s; Gate A and the round-1 tests
  over every house included); `npm run e2e` 39 green (smoke 4, graybox 22, round1 13; ≈ 2.6
  minutes); `npm run size`: first download 1.71 MB. The wall-clock tests (the finale's length,
  the 300 and 700 ms taps, the demonstrations' timing) retry up to twice: with two workers a
  headless frame sometimes stalls past 200 ms at the slide's end (2.27 and 2.38 s seen in 2 of 8
  full runs; alone, 6 of 6 repeats pass); CI runs one worker.
- `npm run levels:check`: all four files reproduced in **207.0 s** (the rebuild itself 198.5 s);
  A8's budget is 600 s. The plan's prototype took 448.8 s; the difference: the insight names from
  the grader's own pass, relevance by the grader alone, at most 50 border moves (D77).
- Gate A on the new files against the committed ones (`4e40bd2`), every threshold unchanged:

| # | New | Committed | Threshold |
| --- | --- | --- | --- |
| A1 | 1,792 of 1,792 | same | all |
| A2 | 1,792 of 1,792; T4 outside manors 0; two T4 in a manor 0 | same | all; 0; 0 |
| A3 | dailies T3 48.4 %; positions 1–3 T3 46.4 %; T4 in manors 100, 287, 452, 507; first T3 at 12 | 47.0 %; 34.5 %; 496, 518, 595, 804, 914; 12 | ≥ 40 %; reported |
| A4 medians | 4–8 **11** < 12–14 **22** > 15–16 **12**; 17–19 **12** < 20–22 **28** > 23–24 **12** | 8 < 22 > 11.5; 9 < 28 > 10.5 | strict order |
| A4 curve | MA(13) 13.8, MA(50) 25.4, ratio **1.84**; worst fall 2.4; breathers 88 of 88; manors 88 of 88 (d 36–65); cycles 0–2 / 4–6 / 8–10: 25.7 < 28.2 < 32.4; worst cycle −12.9 % (cycle 12) | 1.98; 3.7; 88; 88 (35–64); 24.2 < 27.1 < 31.1; −10.3 % | ≥ 1.4; ≤ 6; all; rising; ±15 % |
| A6 | 4–11 **77.5**; 12–14 116.5; 15–16 75.25; 17–19 **91**; 20–22 150.5; 23–24 91; positions 1–3 140.5; 4–9 176.5; manors **241.5**; breathers 91; dailies 160.75; longest of 1–16 118 | 70.75; 116.5; 73.25; 83; 150.5; 87; 137; 174; 266.25; 83; 159.25; 116.5 | ≤ 90; 130; 85; 105; 160; 100; 150; 200; 300; 100; 120–200; ≤ 130 |
| A7 | capped max 0.344, manors 0.182; mean naive 0.121, < 0.5 on 99.9 %; shallow (1,134 T3 houses) max 0.5, mean 0.257; blind max 0.005 | 0.344, 0.25; 0.139, 97.9 %; 1,091: 0.5, 0.272; 0.001 | ≤ 0.35, 0.25; ≤ 0.25, ≥ 90 %; ≤ 0.6, ≤ 0.4; ≤ 0.01 |
| A7 reported | teach, rest, breather: naive mean 0.310, max 0.5, < 0.5 on 96.1 % | 0.410, 0.5, 58.3 % | — |
| A8 | `levels:check` identical (207.0 s); 1,485 turned houses keep one solution and the grade | same (120 s) | ≤ 600 s |

- The round's requirements (docs/gate-b-round1.md §1.4), new against committed: two insight
  episodes in houses 10–1000 **991 of 991** (582) and dailies **792 of 792** (511); two kinds in
  the bands that carry difficulty **1,686 of 1,686** (1,339); rest, breather and teach houses from
  12 with two kinds 41 of 95 (7, not required); houses 4–24 with two episodes of two kinds 11 of
  21 (4); houses 5–9 with a real insight **5 of 5** (0); consecutive teach houses with one trick
  **0 of 9** (6); idle objects by rule isolation **0 of 4,231 blocks and 0 of 1,932 lamps**
  (1,183 of 5,171; 14 of 1,892), by the literal test **0 of 6,163** (645 of 7,063); largest board
  **8 × 8** (9 × 9). The first houses (insight steps per episode; `shape` left out where an
  episode has more): 4 shape · 5 shape | line · 6 shape | cross · 7 shape | line | cross ·
  8 shape | line | line · 9 line · 10 cross | line · 11 line+line | line · 12 count |
  line+line+line · 17 lamp | line · 18 lamp+lamp | cross · 34 lamp+count+line+… | line.
- Palette floors (D71; the thresholds of docs/gate-b-round1.md §2.2), each over every floor state
  (plain, lit, settled, both) and, for the contrast floors, the lowest of normal vision /
  grayscale / deuteranope: F1 walls **4.99 / 4.97 / 4.84** (≥ 4.5); F2 neighbours **1.32:1**, ΔL*
  **9.82**, deuteranope ΔE00 **6.37** (≥ 1.3, 9.5, 6); any two floors ΔE00 **7.25** (≥ 7); F3 the
  ring **3.02 / 3.02 / 3.04** (≥ 3), the wash margin **0.87** (≥ 0.5); F4 marks **3.78 / 3.80 /
  3.66** (≥ 3); F5 the hatch's outline **3.58 / 3.58 / 3.25** (≥ 3), the lit margin **0.70**
  (≥ 0.5); F6 every line and outline ≥ **3.02** in every view (sight 3.56, glance and marks 3.66,
  ring 3.02, shelf 4.84, lamp 3.25); F7 chroma ≤ **19.19** (≤ 20). Checking every floor in all
  three views found the hatch's and the lamp's brown outline at 2.96:1 for a deuteranope; a darker
  brown (`#5a2b0e`, was `#633010`) fixed it, red first. Reported: walls against the darkest
  wallpaper ink 3.15:1. Progress dots: rim 3.79:1 against the page, full against empty ≥ 2.76:1.
- Cells and walls: at 360 × 640, 8 × 8 **44.0 CSS px** (132 design), 7 × 7 50.3, 6 × 6 58.7,
  5 × 5 70.4; walls 4.0 CSS px at 8 × 8. At 540 × 960, 8 × 8 **66.0**. 8 × 8 at 600 × 600: 94
  design px; at 844 × 390: 127.
- Timing, headless Chromium (Canvas renderer): the finale 2.02–2.09 s from the last placement to
  the next house (at most one frame of 45–100 ms past 2.0 s); measured first on Phaser's clock it
  took up to 6.5 s, hence D73's wall clock. Input opens 1.11–1.13 s (house 1), 0.96–1.07 s (9)
  and 1.25–1.27 s (17) after the house appears (scripts 1.1, 0.9 and 1.2 s; bound 1.6 s); house 1
  is interactive (GameReady) 0.28–0.72 s after navigation.
- The design critique (`design:design-critique`; screenshots at 360 × 640 @2x of houses 1, 9, 17,
  17's demonstration and 34 at rest and in play, in scratch outside the repository): not a
  nursery palette and not a coloured grid (muted dusty hues, a dark page and dark walls,
  patterned floors, furniture and lamps). Two fixes made at once, red first: small diamonds
  instead of polka dots (dots on the palest rose read as a nursery wallpaper) and larger progress
  dots with a light rim (an empty dot was 1.9:1 against the page). Left for Epic 4: the
  demonstration's light is a flat fill that tints slate floors olive; the hatch shares its slant
  with the diagonal wallpaper (told apart by colour and width).

### Gate B tune round 2 (2026-10-21, same container)
- `npm run check` clean; `npm test` 477 tests in 37 files (≈ 30 s; Gate A, the autopilot and the
  round-2 tests over every house included); `npm run e2e` 66 green, none retried, a flaky test
  failing the run (smoke 4, graybox 22, round1 12, round2 9, round2-audit 8; then the timing
  project's 11 alone, one at a time, without the GPU flags; ≈ 5.0 minutes); `npm run size`:
  first download 1.72 MB (target 5 MB). After the round-2 code audit the timing project passed
  11 of 11 three runs in a row.
- `npm run levels` 204.7 s; `npm run levels:check` reproduces all four files in **195.3 s**, and
  in 188.3 s with the shared shadow walk (A8's budget 600 s; the plan's prototype 173 s). The
  files equal the prototype's byte for byte; houses 25–1000 and the dailies are round 1's but
  daily 2027-10-02 (D88).
- Gate A on the new files (A3/A5 positions amended, D82) against the committed ones (`bfd2b96`),
  every threshold unchanged; `tests/gate-a.test.ts` 42 of 42 on both, each with its own clauses:

| # | New | Committed | Threshold |
| --- | --- | --- | --- |
| A1, A2 | 1,792 of 1,792 unique and graded; T4 outside manors 0, two T4 in a manor 0 | same | all; 0; 0 |
| A3 | dailies T3 48.4 %; positions 1–3 46.4 %; T4 in manors 100, 287, 452, 507; **first T3 at 7** | same; first T3 at 12 | ≥ 40 %; reported; no T3 before 7 (was 12) |
| A5 | **first shelf 5, first lamp 8**, first T3 7, first T4 100 | 9, 17, 12, 100 | 5, 8, 7 (were 9, 17, 12); T4 from 34 |
| A4 medians | 4–8 **8** < 12–14 **22** > 15–16 **11**; 17–19 **15** < 20–22 **28** > 23–24 **10.5** | 11 < 22 > 12; 12 < 28 > 12 | strict order |
| A4 curve | MA(13) 14.0, MA(50) 25.4, ratio **1.81**; worst fall 2.4; breathers 88 of 88; manors 88 of 88 (d 36–65); cycles 25.7 < 28.2 < 32.4; worst cycle −12.9 % (cycle 12) | 1.84; 2.4; 88; 88; same; same | ≥ 1.4; ≤ 6; all; rising; ±15 % |
| A6 | 4–11 **76**; 12–14 115; 15–16 72.5; 17–19 **99**; 20–22 152; 23–24 87; positions 1–3 140.5; 4–9 176.5; manors 241.5; breathers 91; dailies 160.75; longest of 1–16 117 | 77.5; 116.5; 75.25; 91; 150.5; 91; 140.5; 176.5; 241.5; 91; 160.75; 118 | ≤ 90; 130; 85; 105; 160; 100; 150; 200; 300; 100; 120–200; ≤ 130 |
| A7 | capped max 0.344, manors 0.182; mean naive 0.121, < 0.5 on 99.9 %; shallow (1,138 T3 houses) max 0.5, mean 0.257; blind max 0.008 | 0.344, 0.182; 0.121, 99.9 %; 1,134: 0.5, 0.257; 0.005 | ≤ 0.35, 0.25; ≤ 0.25, ≥ 90 %; ≤ 0.6, ≤ 0.4; ≤ 0.01 |
| A8 | `levels:check` identical (195.3 s); 1,485 turned houses keep one solution and the grade | same (207.0 s) | ≤ 600 s |

- The round's measures (docs/gate-b-round2.md §1.5; the autopilot, `tests/round2.test.ts`),
  against the list round 2 played: houses 4–10 finished on autopilot with nothing new **0 of 7**
  (5 of 7); houses 4–20 that teach or ask **16 of 17**, only the rest at 15 asking nothing (7);
  real insight at the opening **8** (7, 9, 11, 12, 13, 14, 19, 20; round 2: 2); free openings in
  houses 11–24 only 17's lesson (8 of 10 in 11–20); consecutive houses opening alike **0** (6 of
  16 pairs); house 12 opens with a cross; house 1's coin flip 1 cell (2). From house 25 round 1's
  rules hold: two insight episodes in 976 of 976 houses 25–1000 and 792 of 792 dailies, two kinds
  in 1,680 of 1,680 houses that carry difficulty.
- Palette floors (D85; plan §4), each the lowest over every floor state and normal vision,
  grayscale and deuteranope: F1 walls **4.84** (≥ 4.5); F2 neighbours **1.31:1**, ΔL* **9.76**,
  deuteranope ΔE00 **6.23** (≥ 1.3, 9.5, 6); any two floors that may share a house ΔE00
  **11.06** (≥ 7); F3 the ring **3.01** (≥ 3); F4 marks **3.66** (≥ 3); F5 the hatch's outline
  **3.25** (≥ 3), the lit margin **0.59** (≥ 0.5); F6 every line ≥ **3.01** (sight 3.56, glance
  and marks 3.66, ring 3.01, shelf 4.84, lamp 3.25); F7 chroma ≤ **19.3** (≤ 20). Local contrast
  (DÜŞÜK 7), each ink against the floor it touches: wall 4.84, ring 3.01, mark 3.66, sight line
  3.56, the hatch's edge 3.25 (were 1.39, 1.91, 2.39 and 1.06, 2.28). Room styles valid on all
  1,795 boards.
- Success against failure on screen (D84; `tests/e2e/timing.spec.ts` at 360 × 640, house 12, the
  timing project without the GPU flags, the solve scored on its beat; four runs): changed area, a
  settle **4.0–4.1×** a conflict's (≥ 3×), the beat **18.0–18.3×** (≥ 10×); time in motion, a
  settle **4.8–5.0×** (≥ 2×), the beat **10.8–11.6×** (≥ 6×). A conflict moves for 150 ms, a
  settle 717–750 ms, the beat 1.6–1.7 s. Under the SwiftShader flags and over the whole finale
  (before the audit) they were 4.2× and 22.3–22.6× the area, 2.7–4.3× and 7.9–10.9× the time;
  a beat that showed nothing passed then on the slide alone. The shiver played 2 × 60 ms against
  the spec's 2 × 30 (the hint's tremble 240 ms against 120); fixed red first.
- WebGL garbage at rest mid-play (SwiftShader, house 20 with settled rooms, a conflict and marks,
  240 frames): **0.22 MB a frame** by the sampling heap profiler, **0.21** by heap growth (round
  1's build 1.42 and 0.92; `4e40bd2` 0.35–0.43). About half of what is left is the two HUD
  buttons' Graphics, which ORTA 4 did not cover; they wait for Epic 4's art (round 2's code audit,
  DÜŞÜK 7, D90).
- Timing, headless Chromium (Canvas renderer): in the timing project, without the GPU flags
  (frames 14–23 ms), the finale 2.40–2.42 s from the last placement to the next house, its beat
  2,050.2–2,062 ms (≤ 2,100); under the SwiftShader flags frames took 54–137 ms and the beat ran
  up to 2,173 ms (D89). Input opens after the demonstrations at 1.95 s (house 1), 1.66 (2), 1.53
  (3), 1.71 (5), 1.70 (8) and 1.71 (10) (≤ 2.3 s; chromium project); a pause of 300, 450 or
  800 ms lengthens house 5's by the pause.
- Screenshots at 360 × 640 @2x (scratch, outside the repository): houses 1, 5 and 8 at rest, 5's
  and 8's demonstrations on their hold frame, house 20 (the first 7 × 7) mid-play.
- The design critique of the 8-hue palette (`design:design-critique`, the nursery check): not a
  nursery palette and not a coloured grid. Dusty hues under chroma 20, a dark page, dark walls,
  a wallpaper pattern on every floor, bookshelves and a lamp read as rooms of an old house, not
  as cells of a colour puzzle; the ghosts' states (smile, hands over the eyes) carry the play.
  The sweetest pair is the palest rose (stripes) and the palest sky (diamonds) when they meet in
  one house; they pass every floor, and F2's deuteranope margin (6.23 against 6) leaves no room to
  mute them now: Epic 4's art takes them down a step. Also for Epic 4: the settled ring is dark
  teal beside a dark wall, so the content face and the swatch's tick carry most of "settled" at
  a glance; the demonstration's light is still a flat warm fill that tints the floors it covers.

### Gate B tune round 3 (2026-10-23, same container)
- `npm run check` clean; `npm test` 554 tests in 40 files (≈ 30 s); `npm run e2e` 77 green,
  none retried, a flaky test failing the run (smoke 4, graybox 22, round1 13, round2 9,
  round2-audit 8, round3 9; then the timing project's 12 alone, without the GPU flags; ≈ 6.4
  minutes); `npm run build` green; `npm run size`: first download **1.73 MB** (target 5 MB).
  After the code audit the timing project passed 12 of 12 three runs in a row (the card up
  2,321–2,341 ms after the last placement, against 2,490).
- `npm run levels` **198.9 s**; `npm run levels:check` reproduces all four files in **195.9–199.2 s**
  (A8's budget 600 s). The four files equal the prototype's final data byte for byte (sha-256,
  first 16 hex: levels 066651b70b058afa, levels-meta a90cde428aed3ac6, dailies 54fe5d1391ab03ad,
  dailies-meta 48a4362d29a03007); houses 1–7, 25–1000 and the dailies equal round 3's files
  (`4d4ba4e`); the per-house table equals the prototype's.
- Gate A on the new files against the committed ones (`4d4ba4e`); `tests/gate-a.test.ts` 43 of
  43 (A6's 4–11 split into 4–7 and 8–11), every threshold unchanged but A6 for 8–24 (D91, D97):

| # | New | Committed | Threshold |
| --- | --- | --- | --- |
| A1, A2 | 1,792 of 1,792 unique and graded; T4 outside manors 0, two T4 in a manor 0 | same | all; 0; 0 |
| A3 | dailies T3 48.4 %; T4 in manors 100, 287, 452, 507; first T3 at 7 | same | ≥ 40 %; no T3 before 7 |
| A5 | first shelf 5, first lamp 8, first T3 7, first T4 100 | same | 5, 8, 7; T4 from 34 |
| A4 medians | 4–8 **11** < 12–14 **26** > 15–16 **19.5**; 17–19 **26** < 20–22 **33** > 23–24 **19.5** | 8 < 22 > 11; 15 < 28 > 10.5 | strict order |
| A4 curve | MA(13) 16.8, MA(50) 25.4, ratio **1.51**; worst fall 3.1 | 14.0, 25.4, 1.81; 2.4 | ≥ 1.4; ≤ 6 |
| A6 | 4–7 **70**; 8–11 **128**; 12–14 **144**; 15–16 **125.75**; 17–19 **141**; 20–22 **160**; 23–24 **128.5**; positions 1–3 140.5; 4–9 176.5; manors 241.5; dailies 160.75; longest of 1–7 117, of 8–16 146.5 | 4–11 76; 115; 72.5; 99; 152; 87; same; same; same; same | ≤ 90; 135; 150; 135; 150; 165; 135 (D97); 150; 200; 300; 120–200; ≤ 130; ≤ 155 |
| A7 | capped max 0.344, manors 0.182; mean naive 0.120, < 0.5 on 100 %; shallow (1,142 T3 houses) max 0.5, mean 0.257 | 0.344, 0.182; 0.121, 99.9 %; 1,138: 0.5, 0.257 | ≤ 0.35, 0.25; ≤ 0.25, ≥ 90 %; ≤ 0.6, ≤ 0.4 |
| A8 | `levels:check` identical (195.9 s) | same (188.3 s) | ≤ 600 s |

- Every A6 median of houses 8–24 lies at or under the plan's §1.7 ceilings (the prototype's
  median + 5 s, rounded up to 5 s); none was raised.
- The ladder (houses 8–24, the depth profile; the plan's §1.6): stalls 1 at house 8 (after its
  first ghost), 2 at 9–11, 15, 16, 23, 24 and 3 at 12–14 and 17–22; tails 1–3; the longest
  autopilot run 2–3; d 11–34; est 87–160 s; naive 0.02–0.38. Round 3's houses 4–24 stalled at
  most once, with tails 4–9 (D92).
- Timing, headless Chromium, the timing project without the GPU flags (two full runs): the beat
  2,052.8–2,053.9 ms (± 50 of 2,050), the card up 2,329.5–2,341 ms after the last placement
  (≤ 2,700), the slide 352.1–355.6 ms after the tap (± 200 of 320); the glide 10 frames between
  its cells in a 30 ms sampling, the afterimage 269–298 ms (≥ 3 and ≥ 200; red on the old glide:
  6 frames, 0 ms).
- Swatches and light (D101): S1 holds on all 1,795 boards (the tutorial, houses 1–1000, the
  dailies; round 3's house 34 broke it with clay and sand, both vertical stripes, 12.8). The lit stripes cover 0.075 of a lit cell and their outlines 0.04 in all (0.02 a
  side, after the code audit's ORTA 1): F3's ring 3.01, F5's margin 0.70 (≥ 0.5), F5b holds; the
  plan's stripes of 0.10 give F5 −1.83, outlines of 0.03 a side F3 2.90–2.94. At device resolution
  on a 360 × 640 phone at 2× each outline is 1.7 px: its strongest pixel 6.1–8.0:1 on mint and
  rose, 2.7–4.3 on house 8's darker floors (0.015 a side: 2.2–7.4).
- Screenshots for the critique at 360 × 640, 540 × 960, 600 × 600 and 844 × 390 @2x (scratch,
  outside the repository): houses 17, 18, 20 and 34 at rest, the hint's reason in house 7, the
  card of house 12 in each arrangement.
- The design critique of the swatch rule and the card (`design:design-critique`, the nursery
  check): **pass**, nothing blocking round 4. Not a nursery palette and not a coloured grid:
  S1 keeps rooms whose wallpapers share a family apart at swatch size while the hues stay dusty
  (chroma ≤ 20), and the wallpaper, walls and shelves still read as an old house; the lit stripes read as light laid
  over a room (amber, outlined), not as a room of its own. The card is a flat slate bar with
  cream digits, the bulb with a teal tick and a plain arrow: no stars, confetti or bounce
  beyond its small overshoot, so it reads as a quiet summary, and the arrow on the right is the
  clear way on. For Epic 4: (1) at 1:1 the card's 2 × 2 grid puts the arrow under the time,
  small beside the full-size undo and hint buttons, which stay lit while the card holds; dim
  them during the card or give the arrow the larger slot; (2) where a room's own wallpaper runs
  on the same diagonal as the lit stripes (house 20's rose room), hue and outline alone carry
  "lit": run the stripes on the other diagonal there, or re-measure F5 for a crossed pattern;
  (3) the pale lilac of house 20 and the palest rose are the sweetest tones left (round 2's
  note): a step down in Epic 4; (4) the hint's room badge "1" stands on the room's wall where
  rooms meet and can read as the wall's; Epic 4 may set it inside the room.

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

### Gate A, the auditor's re-run (2026-10-21)
Gate A passed: the auditor's own code agrees with the files on all 1,792 houses (A1–A9). Three
DÜŞÜK items followed, fixed at the start of Epic 3: GENERATOR.md and GDD.md brought in line with
D55 and D56 (no threshold changed); the exact walk's loud failure at `PLAYER_STATE_LIMIT`
documented in GENERATOR.md §5; `size.mjs` reports the first download and the lazy chunks apart
(`tests/scripts.test.ts`, red on the old script, which counted a planted lazy chunk as initial).

### Epic 3, independent audit (2026-10-21)
Verdict: not ready for `feat(epic-3)`: 0 KRİTİK, 3 YÜKSEK, 3 ORTA, 5 DÜŞÜK; the auditor
reproduced every runtime claim on `dist/test`. Fixes (uncommitted), each with its test written
first and seen failing (11 e2e and 4 unit tests failed on the unfixed code, for the reasons below):

| # | Finding | Fix | Test |
| --- | --- | --- | --- |
| YÜKSEK 1 | `visible()` stated the rules in words ("resident seen by", "lit by the lamp"), and the playtester reads it | D63: poses, a warm wash, dark blocks, sun icons, dotted lines, grey dots, glowing rooms; no rule word | `tests/view.test.ts` (500 random boards; exact texts); graybox.spec › the conflict and playtest tests |
| YÜKSEK 2 | A flush wrote only a pending save: a pause, a hidden page or a reload after 3 s of thinking restored 0.4 s | D64: every flush writes while the house is in play and started | graybox.spec › "the solve time … survives a pause / a hidden page / a reload" (the stored and the restored time ≥ the time shown) |
| YÜKSEK 3 | A press held from the beat, or a tap on the hint during the slide, used the hint on the next house | D64: `hud.cancelPress()` in `win()` and `skip()` | graybox.spec › "a press held on the hint from the win beat …", "a tap in the beat skips it; a tap on the hint in the slide only ends the slide" |
| ORTA 4 | A touch the system cancels acted as a release (placed a ghost, undid, used the hint) | D64: `wasCanceled` cancels the gesture and the press | graybox.spec › "on a touch screen › a touch the system cancels …" (CDP touchStart → touchCancel on a cell, in a drag, on undo, on the hint) |
| ORTA 5 | Every RESIZE rebuilt the board, the same size too (3 builds for one event), and a resize in the beat cut it | D65: the layout copies the size; no rebuild at the same size; the beat's timer is the scene's | `tests/layout.test.ts` (the copy); graybox.spec › "a resize at the same size keeps the board; a new size builds it once", "a new screen size during the win beat …" |
| ORTA 6 | `tally.shivers` counted ghosts (2 for one conflicting tap) | D66: one per move | `tests/house-log.test.ts`; graybox.spec › the conflict test |
| DÜŞÜK 7 | Four e2e never replayed their moves; nothing tested the beat, the slide, the flushes or the dim | `previous()`; every graybox e2e that moves ends on the replay check; `dimmed` | graybox.spec (houses 1–3, the aspects, D49, the beat tests; the pause test checks `dimmed`) |
| DÜŞÜK 8 | The move log, the tally and `drawn()` shipped in production | D66: `src/dev/house-log.ts` and `drawn()` in DEV only | smoke.spec › the production scan (`relocations`, `shivers`, `residents`) |
| DÜŞÜK 9 | A new Graphics per flash and glance | `src/game/pool.ts` for the effect drawings | `tests/pool.test.ts`; graybox.spec › rapid taps (`effects`: made < used) |
| DÜŞÜK 10 | `GLANCE_MS` 400 against GDD §3a's 250 | 250 | `tests/motion.test.ts` (every motion constant against its §3a row) |
| DÜŞÜK 11 | Thin colour margins | measured and printed only; thresholds come with the tune plan | `tests/contrast.test.ts` ("Measured (Epic 3)") |

Not changed: Phaser 3.90 calls preventDefault on every `touchcancel`, which Chrome reports as a
console error on a real cancelled touch; only the touch e2e allows it (D64).

### Gate B tune round 1, the code audit (2026-10-21)
Verdict: 0 KRİTİK, 0 YÜKSEK. Every finding fixed in tune round 2, each with its test written
first and seen failing:

| # | Finding | Fix | Test |
| --- | --- | --- | --- |
| ORTA 1 | `state()` under `?playtest=1` named mechanics (placements, shivers, the finale) | D87: only neutral fields | round2.spec › the playtest state |
| ORTA 2 | A tap left over from the finale skipped the next house's demonstration | D83: a tap in a demonstration's first 300 ms does nothing | session.test; round2.spec › house 4 to 5 |
| ORTA 3 | Phaser's tween clock credited up to 500 ms of a pause on the resume (house 9's demonstration opened input at 909 ms instead of about 1,200) | D89: the tween clock runs at timeScale 0 from the pause to its first step after | timing.spec › pauses of 300, 450, 800 ms |
| ORTA 4 | The dots and rings were Graphics, rebuilt by WebGL every frame: 0.9–1.6 MB of garbage a frame | D85: textures drawn once, images of them | garbage 0.22 MB a frame ("Measured") |
| ORTA 5 | The timing e2e retried, read the beat late and mixed functional checks into retried tests | D89: no retries, a flaky test fails the run; the timing tests alone in a project of their own; `slidAt` read as the slide begins | playwright.config; timing.spec; round1.spec |
| DÜŞÜK 6 | A new screen size handled the demonstration before ending the slide, and a rebuild lost the finale's digits and a shown hint's reason | D83, D86: the slide ends first; the rebuild keeps both | round2.spec (2) |
| DÜŞÜK 7 | Local contrast: ring on ink 1.91, mark on ink 2.39, sight line 2.28, wall on the hatch's edge 1.39, mark on the hatch's edge 1.06 | D85: a plain band inside every wall, halos, nothing on object cells | contrast.test (local); round2.spec (on screen) |
| DÜŞÜK 8 | The model screen accepted a nudge of a placed ghost from a tap | D89: only in a drag; the log records each move's kind | screen.test, house-log.test |
| DÜŞÜK 9 | The scene's dev state shipped in production | D89: inside `import.meta.env.DEV`; the bundle check lists it | smoke.spec (`DEV_ONLY`) |
| 10 | CLAUDE.md: rule 5's 9 × 9 and the input rule's drag | updated by the main session, approved by Hasan (D69, D72) | — |

### Gate A, the auditor's A9 re-run on tune round 2's files (2026-10-21)
Gate A passed: the auditor's own code agrees with the files on all 1,792 houses (A1–A9); the
three findings of its earlier re-run are closed (D88). Watch item: house 5's blind win rate is
0.0078 against A7's cap of 0.01, the only generated house above 0.004 (D90).

### Gate B tune round 2, the code audit (2026-10-21)
Verdict: 1 KRİTİK, 1 YÜKSEK, 2 ORTA, 10 DÜŞÜK. Every one fixed in the uncommitted tree, each with
its test written first and seen failing (the unfixed scene rebuilt in scratch where the fix had
already gone in); no gate threshold, floor or test tolerance moved (D90):

| # | Finding | Fix | Test (red → green) |
| --- | --- | --- | --- |
| KRİTİK 1 | The finale test's `\|beat − 2,050\| ≤ 50` (bfd2b96) had become two assertions that cannot fail | Round 1's bound back; `stepMs` logged, not asserted; the timing project without the GPU flags, Chrome's software-WebGL warning allowed there only (D89) | timing.spec › the finale: 123 ms past in 1 of 4 runs under SwiftShader; 0.2–12 ms past without the flags; the project green three runs in a row |
| YÜKSEK 1 | A replay during a carry left the carried ghost drawn on the wrong cell | No replay while a pointer or a button is down; input in hand is no idle time; a move resets the idle clock; `playDemo` ends the carry, the press and the stroke (D83) | round2-audit.spec › house 3, fresh and resumed: a replay under the carry (demos 2 and 1) → none, the ghost lands |
| ORTA 1 | A replay dropped a held stroke, played over the hint's reason (the answering tap only skipped it) and let a press held through it count | The same guards; `due()` false while a reason waits (D83) | round2-audit.spec › house 2 finger, house 5 reason, house 2 button: each replayed under the input → none; session.test |
| ORTA 2 | D88 and `turned.ts` claimed the bundle carries no grader | Corrected: `src/core/hint.ts` carries it for the hint, and it stays; the smoke e2e had caught `residents` from the band defaults that `bandFor` pulled in (+4.1 KB), checked by a scratch build | D88 |
| DÜŞÜK 1 | A pause during a replay skipped the save | The save writes in the demo phase too | round2-audit.spec › 0.47 s saved against 5.0 s played → saved |
| DÜŞÜK 2 | A move could leave a reason that dims nothing pulsing | The reason clears whenever one was pending (D86) | round2-audit.spec › house 141 (press and tap in one frame): still shown → cleared |
| DÜŞÜK 3 | The frame that ended the slide counted toward the 300 ms; replays had the dead zone too | `DemoClock` skips the frame a demonstration starts in; a replay skips at once (D83) | session.test (2) |
| DÜŞÜK 4 | In houses 1 and 2 the finale's hop met the last ghost's content pop | The hop ends the settle's motions first (D84) | timing.spec › houses 1 and 2: 1 settling at the hop → 0 |
| DÜŞÜK 5 | The solve's salience passed on the next house's slide alone | Scored on the beat (D84) | a mutant whose beat shows nothing passed the old scoring (21.6×, 7.3×), fails the new (2.5× the area) |
| DÜŞÜK 6 | A conditional assertion in the resize test | The phase is asserted first | a mutant resizing after the beat passed the old form, fails the new |
| DÜŞÜK 7 | Per-frame work: the digits, the room styles | `TickingTime` sets the text only on new digits (Phaser skipped the redraw already; the string and the call each frame went); `roomStyles` once per house; the HUD Graphics wait for Epic 4 | look.test (2) |
| DÜŞÜK 8 | `houseAt` gave 267 of 1,485 turned houses the base house's step names; `turnedHouse` served only a test | No game code reads them: `houseAt` leaves them out past 1000; `turnedHouse` gone (D88) | round1.test (2): 1,485 named → 0 |
| DÜŞÜK 9 | `rules()`, `drawn()`, `events()`, `previous()` stated the rules under `?playtest=1` | They throw there (D87) | round2-audit.spec: they gave → they throw |
| DÜŞÜK 10 | House 10's lesson and its demonstration walked the shadow apart | `shadowsOf` in `src/core/house.ts` for both; `levels:check` byte-identical | house.test (2), demo.test |

The re-audit (2026-10-21) closed all 14 with its own probes on a fresh build: no replay under a
carry, a held finger, a held button or a waiting reason (a replay follows 4.3–5.0 s after the
release); the beat 2,050.9–2,069 ms without the GPU flags; the software-WebGL allowance an exact
match in the timing project only. One new DÜŞÜK: `inputHeld()` ran every frame in play and
allocated (`Object.values` in `hud.ts`, two closures); the main session fixed it (a fixed list of
the buttons, plain loops).

### Gate B tune round 3, the code audit and the A9 re-run (2026-10-23)
Verdict: Gate A A1–A9 passed on the auditor's own checker, its numbers identical to the build's.
The code audit: 1 KRİTİK, 1 ORTA, 5 DÜŞÜK; the A9 re-run: 2 DÜŞÜK. Every finding fixed in the
uncommitted tree, each with its test seen failing first (the e2e against the build before the
fix, or a scratch mutant); no threshold, floor or test tolerance moved:

| # | Finding | Fix | Test (red → green) |
| --- | --- | --- | --- |
| KRİTİK 1 | The card's wall-clock bound, `cardUpMs ≤ 2,700`, allowed +410 ms over 2,050 + 240 where round 1's whole-finale check allowed ±200 | `CARD_UP_MAX_MS = WIN_BEAT_MS + RESULT_IN_MS + FINALE_SLACK_MS` (2,490); the lower bound kept | timing.spec › the finale: a scratch mutant with the card's rise 300 ms late (up at 2,631–2,648 ms) passed the old bound and fails the new; the real build 2,321–2,341 ms; the timing project green three runs in a row (12 of 12 each) |
| ORTA 1 | Each stripe outline 0.015 of the cell in x + y: one device pixel at 3.0–6.5:1 on the round-4 phone, where 431eb44 drew two at 7.9–8.6:1 on its one side; worse on teal | The widest the floors allow: outlines 0.04 in all (0.02 a side) with stripes 0.075 (F3's ring 3.01, F5's margin 0.70; 0.03 a side needs 0.06 in all and gives F3 2.90–2.94 at any stripe share; stripes 0.08 with 0.04 gives F5 0.47); D101 | round1.spec › the lit stripes at 2×: house 8's lit cells scanned at device resolution, both outlines of every stripe ≥ 1 px at ≥ 2.5:1 (0.015 a side: 2.2–2.4 on cells 3 and 19 → 2.7–4.3 on the darker floors, 6.1–8.0 on mint and rose). The audit's two pixels at ≥ 4.5:1 is out of reach: the floors pin the width at 1.7 px and solid brown is 3.6:1 on the clay floors |
| DÜŞÜK 1 | The recharge was not saved while the card held | A flush writes in every phase: the house in progress in play, the progress alone elsewhere (`recordHintRecharge`) | round3.spec › a pause while the card holds: 4.26 s off → within 1 s |
| DÜŞÜK 2 | A late merged save's `hintReadyIn` never reached the running clock | `onLateSaveMerged` (progress.ts); `HintClock.adopt` takes a longer recharge | progress.test, session.test: no hook → 60 taken, 10 ignored |
| DÜŞÜK 3 | GDD §3.1 and §3a said the hint's cell "stays hidden" | The cell bears no mark, the room's other cells do (D98) | — |
| DÜŞÜK 4 | No opener test on the files | round3.test: every house 8–24 in its rung's classes, none free, 17 by the budget | red on round 3's files (house 15 opened with the budget) → green |
| DÜŞÜK 5 | An empty opener filter searched CANDIDATE_LIMIT walks before failing | `openersLeft`, decided once before the loop, throws at once | build-levels.test: house 16's rung with both classes used: ran on → throws within 1 s |
| DÜŞÜK 6 (A9) | `chosen === start` pinned for houses 8–10 only; D96 said a stale start only costs time | round3.test pins every house 8–24 to its start; D96 reworded | a table one short at house 12 chooses 3,328, not 3,327 → red; the table green |
| DÜŞÜK 7 (A9) | GENERATOR §4.8's tail counted one more than `depth.ts` | "ghosts placed after the one the last real step placed" (§4.8, `DepthSpec`) | — |
| DÜŞÜK 8 | `inputHeld()` listed as still allocating | The tree already has the fixed form: `hud.pressing` walks the fixed `list`, the scene walks `input.manager.pointers`; nothing reintroduced an allocation (checked) | — |

## Hasan's steps (outside the code)
- [x] Create the GitHub repository `kriptoloca/shy-ghosts` and give the Claude GitHub App access
      (done 2026-10-21; `main` pushed through `fa66f51`; CI and the Pages workflow ran green on
      Epic 0, per the main session).
- [ ] Switch on GitHub Pages once the first build exists (after Epic 0 is pushed): Settings →
      Pages → Source: "GitHub Actions". The workflow skips the deploy with a warning until then.
- [x] 2026-10-21: approved the Gate A amendment (the first shelf, count and lamp at houses 5, 7
      and 8; D82) and the CLAUDE.md update of rule 5 and the input rule (D69, D72).
- [x] 2026-10-22: chose depth for tune round 3, the last (D91): A6's ceilings for houses 8–24
      free to rise (set by D97), a new blind playtest after it, a fail ends Shy Ghosts.

## Next steps (in order)
1. **Hasan decides on Gate B** (docs/gate-b-round4.md): pass on six bars with B2's three shelf
   cells read as outside the bar's purpose, or not. Nothing is shown and no Epic 4 work starts
   before his answer (CLAUDE.md, the fun gate).
2. If Gate B passes: graybox screenshots to Hasan first (houses 1, 4, 9, 12, 17, 20, 34 at 9:16,
   one line each), then the `/test/` link (GitHub Pages is still off: the Pages workflow's
   `configure-pages` cannot switch it on with the workflow's token, so every run so far skipped
   the deploy; Hasan's step above); Epic 4 (feel, face and sound) starts. Its feel constants
   move from `src/config.ts` ("Graybox motion") to `src/game/feel.ts`; it decides whether the two
   graybox aids of D59 (the lasting sight line, the glance dots) stay, and takes the palest rose
   and sky down a step (the design critique above); round 3's critique adds the card at 1:1 (the
   arrow's slot, the buttons dimmed while it holds), the lit stripes over a wallpaper on the same
   diagonal, and the room badge "1" on a wall; round 4's playtest adds the shelf cell's floor
   band, house 3's hand and a visible refusal, the cooldown shake, the conflict's weight against
   the settle, the swatch that reads as a face.
3. Open: arrow keys and Enter on desktop (GDD §3.1, optional, D60).
