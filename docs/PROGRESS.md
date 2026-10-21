# PROGRESS.md — where we are

Single source of truth for "where did we leave off". Read first at the start of every session;
update at the end of every epic.

## Status
Epics 0–1 done and pushed (`kriptoloca/shy-ghosts`, `main` at `fa66f51`); the audit's findings are
fixed in `fix(epic-1): audit findings` (local, the main session pushes) · Next: Epic 2 (content
pipeline) → Gate A · Last update: 2026-10-21 · Branch: `main`
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

## Epic board
| Epic / gate | Scope | Status | Evidence |
| --- | --- | --- | --- |
| 0 | Scaffold, pipeline, platform shell | done, audited, pushed (`e5161dc`); CI and Pages green | 25 unit tests (5 files) + 4 e2e; check clean; build 1.46 MB (target 5 MB); audit-dist OK |
| 1 | Core rules (`src/core`) | done, audited (0 KRİTİK, 0 YÜKSEK, 2 ORTA, 9 DÜŞÜK), pushed (`fa66f51`); findings fixed in `fix(epic-1)` | 124 unit tests (16 files) incl. 5 property tests over 2,000 random houses; the auditor's oracle: 488,915 moves on 16,000 houses, 0 mismatches; 4 e2e |
| 2 | Content pipeline (M0): solver, grader, players, generator, 1,000 houses + 792 dailies | planned | |
| **Gate A** | GENERATOR.md §9, A1–A9 | not run | |
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

The plan's prototype numbers, which set Gate A's thresholds, are in GENERATOR.md §10; Epic 2
re-measures them with the real code here ("Measured (Epic 2)").

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

## Hasan's steps (outside the code)
- [x] Create the GitHub repository `kriptoloca/shy-ghosts` and give the Claude GitHub App access
      (done 2026-10-21; `main` pushed through `fa66f51`; CI and the Pages workflow ran green on
      Epic 0, per the main session).
- [ ] Switch on GitHub Pages once the first build exists (after Epic 0 is pushed): Settings →
      Pages → Source: "GitHub Actions". The workflow skips the deploy with a warning until then.

## Next steps (in order)
1. Epic 2 (content pipeline: solver, grader, players, generator, 1,000 houses + 792 dailies) →
   **Gate A**.
2. Epic 3 (graybox loop) → **Gate B**. Carried over from the Epic 1 audit:
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
