# TASKS.md — epics and gates in build order

Each epic ends with the checks in CLAUDE.md (check, test, build, levels:check from Epic 2, e2e),
`code-review` and an independent adversarial audit (KRİTİK/YÜKSEK closed), PROGRESS updated,
one commit `feat(epic-N): …` on `main` (pushed once the GitHub repository exists). "AC" =
acceptance criteria; each has a test or a check. The fun gate (CLAUDE.md) sits between Epic 3 and
Epic 4: **Gate A** closes Epic 2, **Gate B** closes Epic 3, and Epic 4 starts only when both have
passed. Source of the order: brief §6, adjusted by docs/questions.md D2–D3.

## Epic 0 — Scaffold, pipeline, platform shell
Port from the Munch Pixels kit (`/home/user/munch-pixels`, same versions); keep the platform layer
to what the graybox needs (D2).
- Configs: `package.json` (`shy-ghosts`, 0.0.1, exact pins as the kit: phaser 3.90.0,
  @playgama/bridge 2.3.1, typescript 5.9.3, vite 7.3.7, vitest 4.1.12, @playwright/test 1.56.1 and
  the kit's lint and format pins), tsconfig, eslint (no-network rules; `src/core`, `src/gen`,
  `src/data` pure), prettier, vite (Bridge plugin in local mode, relative base, no inlining),
  vitest, playwright (`E2E_BASE_URL` for `kriptoloca.github.io/shy-ghosts`), `.npmrc`, `.nvmrc`,
  `.gitignore`, `.gitattributes`, `.editorconfig`, `.prettierignore`, `index.html`.
- Scripts: `audit-dist.mjs`, `build-test.mjs`, `write-version.mjs`, `size.mjs` (5 MB target),
  `zip.mjs` + `lib/zip.mjs`, `dev-url.mjs` (links `?reset=1`, `?house=12`, `?playtest=1`).
- Platform shell: `bridge.ts` (stub-first; placements typed `'hint' | 'streak'`, unused until
  Epic 5), `storage.ts` (save v1, GDD §9), `host.ts`, `timeout.ts`,
  `public/playgama-bridge-config.json`, `docs/bridge-notes.md`, `game/resume-grace.ts`. Not yet:
  `ads.ts`, `analytics.ts` (Epic 5), `haptics.ts`, `ios-unmute.ts` (Epic 4).
- Scenes: Boot (Bridge, save with its timeout, `in_game_loading_started`) → Game stub (a
  placeholder board; `markInteractive` sends `in_game_loading_stopped` and `game_ready` once). No
  Title.
- Dev hooks: `window.__ghostDebug` (`state()`, messages) in DEV only; `?reset=1`,
  `?renderer=canvas`, `?fpsmin=N`.
- CI: `.github/workflows/ci.yml` (check, test, build, size, zip artifact, e2e) and `pages.yml`
  (production and `/test/`, e2e-live; the deploy is skipped with a warning until Pages is on).
- `.claude/settings.json` and `.claude/hooks/session-start.sh` (npm install in cloud sessions;
  Prettier after every write), as the kit.
- AC: `npm run check`, `npm test`, `npm run build` green; unit: save v1 (defaults, migrate,
  garbage, newer version, load timeout, late-read merge), resume grace, Bridge config
  (`sendAnalyticsEvents: false`, minimum delay 120), GameReady once; e2e smoke: boot → the Game
  stub is interactive → `game_ready` once, after `in_game_loading_started`; no external
  requests; no console errors; the production bundle carries no debug hooks.
- Status 2026-10-21: done (`feat(epic-0)` on `main`; review and audit folded into Epic 1's).
  - [x] configs, fresh lockfile, scripts, CI and Pages workflows, `.claude/` hooks
  - [x] platform shell: `bridge.ts`, `storage.ts` (save v1), `host.ts`, `timeout.ts`,
        `resume-grace.ts`, `progress.ts`, Bridge config and notes
  - [x] Boot → Game stub, `markInteractive`, `__ghostDebug` (DEV only), `?reset=1`, `?house=N`,
        `?renderer=canvas`, `?fpsmin=N`
  - [x] `npm run check`, `npm test` (25), `npm run build` (1.46 MB, audit OK) green
  - [x] unit: save v1, resume grace, Bridge config, GameReady once, `designSize`
  - [x] e2e smoke (4): GameReady once after loading; same-origin, no console errors; no debug
        hooks in production; `?house=N` and the save; the pause gates input

## Epic 1 — Core rules (`src/core`, pure)
- `house.ts`: parse `rooms`/`objects`, segments, sight, light, candidates, `rotate` (houses after
  1000).
- `state.ts`: the play state; `tap`, `stroke`, `undo`, `hint` with their events (GENERATOR.md §2);
  status per ghost, settled rooms, solved; serialize and restore `{ ghosts, marks }` for the save.
- `hint.ts`: the hint step. `src/data/tutorial.ts`: the three hand-made houses.
- AC: GENERATOR.md §2 worked examples 1–3 as tests; houses 1–3 solved by their solution taps;
  relocation, removal, nudges, marks (paint, erase, cleared by a placement), undo of every move
  kind (a hint's included); property tests over 2,000 random houses (a random move sequence equals
  its replay; status flags equal a brute-force sight check); rotation keeps the solution.
- Status 2026-10-21: done (`fa66f51`, pushed); audited (0 KRİTİK, 0 YÜKSEK, 2 ORTA, 9 DÜŞÜK),
  findings fixed in `fix(epic-1): audit findings` (D47–D52); decisions D41–D46.
  - [x] `house.ts`: parse and validate, segments, sight, light, candidates, `fromRows`, `rotate`
  - [x] `state.ts`: `tap`, `stroke`, `undo`, `hint` with their events; states, settled, solved;
        `serialize` / `restore`
  - [x] `hint.ts`; `src/data/tutorial.ts`; `src/gen/rng.ts` (moved here from Epic 2, D45)
  - [x] worked examples 1–3 as tests (exact event lists for 2 and 3)
  - [x] houses 1–3 solved by their solution taps (every order); unique with the given
  - [x] relocation, removal, nudges, marks (paint, erase, cleared by a placement), undo of every
        move kind (a hint's included)
  - [x] property tests over 2,000 random houses: replay, events played back equal the rules,
        brute-force states, undo, save round trip
  - [x] rotation keeps the solution
  - [x] `npm run check`, `npm test` (89), `npm run build`, `npm run e2e` (4) green
  - [x] `code-review` and the adversarial audit (the auditor), then `feat(epic-1)`
  - [x] audit findings closed red-first: saves never overwritten unread or newer, strict model
        screen (6 of 6 planted faults caught), ZIP bytes in every time zone, the dist audit,
        the production smoke, `solvedAtStart`, `by` / `lamps`, progress guards, constants

## Epic 2 — Content pipeline (M0) → Gate A
- `gen/rng.ts` (copied), `gen/params.ts` (§7 bands and windows), `gen/solve.ts`, `gen/grade.ts`,
  `gen/players.ts`, `gen/generate.ts`, `gen/build-levels.ts`, `scripts/levels.mjs`,
  `src/data/levels.json`, `src/data/dailies.json`; `levels` and `levels:check` in package.json
  and CI.
- AC (brief M0): `npm run levels` writes 1,000 houses and 792 dailies in ≤ 10 minutes;
  `npm run levels:check` byte-identical; the three grader fixtures (GENERATOR.md §4.5); the solver
  against brute force; generator invariants over 200 seeds per band; determinism.
- **AC — Gate A** (GENERATOR.md §9; thresholds fixed):
  - A1 one solution: 1,792 of 1,792.
  - A2 no guessing: every house finished within its band; T4 only in manors, at most once.
  - A3 technique mix: T1-only tutorial; ≥ 1 deduction episode in every generated house; teach,
    rest and breather houses at T2; hard houses, cycle positions 4–9 and manors use T3; no T3
    before house 12; dailies T3 in ≥ 40 %.
  - A4 depth curve: every d in its window; teach < test hard > rest (4–8 < 12–14 > 15–16;
    17–19 < 20–22 > 23–24; breathers below their cycle); MA(50) ≥ 1.4 × MA(13), never more than
    6 below its running best over 13–50; every manor its cycle's maximum (88 of 88); cycles
    0–2 < 4–6 < 8–10, then within ±15 % of the capped cycles' mean.
  - A5 tutorial order: houses 1–3, 4, 9, 12, 17 and 34 teach their element as GENERATOR.md §9
    says.
  - A6 estimated solve time per band: the median ceilings of GENERATOR.md §9; every house among
    1–16 ≤ 130 s; dailies 120–200 s.
  - A7 the naive player fails most mid and late houses: ≤ 0.35 on every hard house, cycle
    position 1–9 and daily, ≤ 0.25 on every manor; mean ≤ 0.25 and below 0.5 on ≥ 90 % of houses
    12–1000 and dailies; shallow ≤ 0.60 on every T3 house (mean ≤ 0.40); blind ≤ 0.01.
  - A8 reproducible and in budget.
  - A9 the auditor's independent re-measurement on 200 sampled houses agrees.
- Done when: every row green; PROGRESS.md "Measured (Epic 2)" holds the band table next to the
  calibration (GENERATOR.md §10); the gate verdict recorded on the epic board. A failing threshold
  gets at most two tune rounds (windows in `params.ts`, generator mechanics), then the stop rule
  (CLAUDE.md).
- Status 2026-10-21: done (`4cd221d`, pushed); **Gate A passed** (the auditor's independent code
  agrees on all 1,792 houses); tune round 2 of 2 used (D55–D58); decisions D53–D58.
  - [x] `params.ts`, `solve.ts`, `grade.ts`, `players.ts`, `generate.ts`, `build-levels.ts`,
        `dates.ts`, `record.ts`, `src/data/houses.ts`; `scripts/levels.mjs` and
        `scripts/lib/levels.mjs`; `levels` and `levels:check` in package.json and CI
  - [x] `npm run levels`: 1,000 houses and 792 dailies in 120.0 s (fails above 600 s; CI step
        `timeout-minutes: 10`); `levels:check` byte-identical on all four files
  - [x] the three grader fixtures; the solver against brute force; generator invariants over
        200 seeds per band; determinism; exact win rates against hand counts, an independent
        enumeration and 50,000 playouts
  - [x] Gate A A1–A8 as tests over the built files (`tests/gate-a.test.ts`, 42); A9 by the
        auditor
  - [x] `code-review` and the adversarial audit, findings fixed red first, then `feat(epic-2)`

## Epic 3 — Layout and graybox loop (M1) → Gate B
- `game/layout.ts` (`computeLayout`, pure: HUD bands, the board square, the cell size; portrait,
  square and landscape arrangements) and `main.ts` scaling.
- `game/scenes/GameScene.ts`, graybox look (no art, no sound): rooms as flat fills in distinct
  lightness steps with simple procedural patterns and walls thicker than the cell grid; furniture
  as a dark block, a lamp as a disc with rays, lit cells as a warm wash (fills, not tint); ghosts
  as simple shapes per state (calm; seen: hands over the eyes and the ±4 px shiver; lit: squint
  lines; given: a nightcap); a settled room brightens; marks as dots. Taps and drags (24 px
  threshold), relocation glide, removal, nudge; undo and hint buttons (the hint in its no-ads
  form: free, 90 s cooldown, D32); the win → a short graybox beat → the next house slides in;
  save after every change (debounced) and every house; resume of a house in progress after a
  reload; ResumeGrace; the platform pause freezes and dims.
- Debug hooks: `state()`, `cellCenter(i)`, `solution()` (null under `?playtest=1`), `visible()`
  (the board as a player sees it, as text: rooms, walls, objects, lit cells, ghosts and their
  state, marks; in words of what is drawn, never of the rules, D63), `?house=N`.
- AC (brief M1, e2e on the dev build): load → house 1 interactive within 3 s → houses 1–3 solved
  through real taps in under a minute → each next house starts by itself; a conflict shows the
  seen state at once; relocation, removal, marks (paint, erase) and undo; a reload resumes the
  house in progress (ghosts, marks, seconds); after rapid taps the settled screen equals the rules;
  9:16, 1:1 and 16:9 lay out without overlap and with cells ≥ 80 design px at 9 × 9 (layout unit
  tests over every design size; since D69: no house above 8 × 8, cells ≥ 80 design px in every
  arrangement and ≥ 44 CSS px at 360 × 640); a platform pause freezes everything and the waking
  tap is ignored; no external requests; `solution()` is null under `?playtest=1`.
- **AC — Gate B** (the playtester's verdict; thresholds fixed):
  - Protocol. The playtester (read-only, independent of the coder; its scripts and screenshots in
    its own scratch directory) gets the dev URL `/?reset=1&playtest=1&renderer=canvas&fpsmin=1`, the
    persona — a player who knows LinkedIn Queens or Star Battle and plays a few puzzles a day — and
    "tap and drag". It gets **no rules** and reads no document before B1's statements. Headless
    Chromium through Playwright at 390 × 844; it sees screenshots and `__ghostDebug.visible()`,
    never the solution, and plays by real taps and drags only. It plays houses 1–20 in order, then
    houses 27, 31 and 34 (the first manor) through `?house=`, and repeats houses 9, 17, 20 and 34 at
    600 × 600 and 844 × 390 for readability. Per house it logs taps, placements, removals,
    relocations, undos, marks, hints and shivers; the reason for every placement as a tag (last free
    cell, elimination, count, contradiction, guess); an interest score 1–5; one line on what felt
    good or bad.
  - B1 the rule reads without text: houses 1–3 solved with no hint and ≤ 2 shivering placements
    in total; the rules stated in its own words after house 3 (one ghost per room; no two ghosts
    in one row or column with nothing between), house 9 (furniture blocks sight) and house 17
    (a lamp's light): 3 of 3 correct against GDD §3.
  - B2 the screen shows the rules: its transcription of every house's first screenshot (rooms,
    walls, furniture, lamps, lit cells) and of every ghost state it reports matches `visible()`
    cell for cell: 100 %.
  - B3 deductions are findable: ≤ 2 placements tagged "guess" over houses 4–20 and the three
    samples, none in houses 4–11 (Gate A proves a deduction always exists; a guess here means the
    screen hid it).
  - B4 decisions: ≥ 14 of the 17 houses 4–20 have at least one placement tagged beyond "last free
    cell"; each hard house (12, 13, 14, 20) has ≥ 2.
  - B5 interest holds: median ≥ 3.5 of 5 over houses 4–20; the median of houses 11–20 ≥ that of
    houses 4–10; no house scored 1.
  - B6 input and resume: 0 taps that act on another cell than the one aimed at; relocation,
    removal, painting and erasing marks, undo and hint each behave as GDD §3.1 in ≥ 5 trials; a
    reload mid-house restores ghosts, marks and the timer in 3 of 3 trials.
  - B7 the verdict: "Would a fan of Queens- or Star Battle-style puzzles keep playing past house
    10?" — **YES**, with Flow ≥ 4 of 5 and Fair ≥ 4 of 5 (`pebblit-game-craft`), the reasons
    named, and no FAIL open. Face and Feel are noted, not gated (no art yet).
  - Pass: the main session records the report on the epic board; Hasan gets graybox screenshots
    first (houses 1, 4, 9, 12, 17, 20, 34 at 9:16, one line each), then the `/test/` link once
    the repository and Pages exist; Epic 4 starts. Fail: a tune round (windows, layout, graybox
    readability) and the failing items replayed; still failing after two tune rounds → the stop
    rule (CLAUDE.md).

- Status 2026-10-21: built and audited (0 KRİTİK, 3 YÜKSEK, 3 ORTA, 5 DÜŞÜK); every finding
  fixed red-first and uncommitted for the main session (docs/PROGRESS.md); Gate B round 1 not
  passed (interest, Flow, readability), its tune plan pending; decisions D59–D66.
  - [x] `computeLayout` (portrait, square, landscape; cells ≥ 80 px at 9 × 9 over every design
        size), `main.ts` scaling
  - [x] graybox look: rooms by lightness and pattern with thick walls, furniture, lamps, the lit
        wash, ghost states as textures of their own (calm; seen: hands and shiver; lit: squint;
        resident: nightcap), settled rooms glow, marks as dots, the solved frame
  - [x] taps and drags (24 px), relocation glide, removal, nudge, undo, the free hint (90 s
        cooldown), the win beat and the next house sliding in, saves (debounced, every house),
        resume, ResumeGrace, the pause that freezes and dims
  - [x] hooks `state()`, `cellCenter(i)`, `solution()` (null under `?playtest=1`), `visible()`,
        plus `drawn()`, `rules()`, `events()`, `house()`, `buttonCenter()`; `?house=N`
  - [x] e2e (14 graybox + 4 smoke); `npm run check`, `npm test` (267), `npm run levels:check`,
        `npm run build`, `npm run e2e` green
  - [x] `code-review` and the adversarial audit; the findings fixed red-first (D63–D66):
        `npm test` (293), `npm run e2e` (22 graybox + 4 smoke) green
  - [x] `feat(epic-3)` (the main session, `4e40bd2`)
  - [ ] Gate B (the playtester), B1–B7: round 1 not passed; tune round 1 of 2 built (below);
        round 2 next

- **Gate B tune round 1 of 2** (the plan: docs/gate-b-round1.md; decisions D67–D79; Gate A's
  thresholds and Gate B's bars B1–B7 unchanged). Each task's tests were seen failing first.
  - [x] 1 insight names in the grader's one pass; `insights`, `insightEpisodes` in the meta
        (`grade.ts`, `record.ts`; `tests/grade.test.ts`)
  - [x] 2 object relevance, the literal test and rule isolation (`relevance.ts`;
        `tests/relevance.test.ts`)
  - [x] 3 house rules (insights, tricks, residents in 9 and 17, 6 × 6 for 10–11, 8 × 8 manors,
        `CANDIDATE_LIMIT`, the insight-aware turn test), rebuild (`params.ts`, `build-levels.ts`;
        `tests/round1.test.ts`, Gate A unchanged)
  - [x] 4 portrait side margin 12; cells ≥ 44 CSS px at 360 × 640, ≥ 66 at 540 × 960
        (`layout.ts`; `tests/layout.test.ts`)
  - [x] 5 palette and room styles, F1–F7 (`config.ts`, `look.ts`; `tests/contrast.test.ts`,
        `tests/look.test.ts`)
  - [x] 6 walls, bookshelf, lamp outline, light hatch, settled ring and wash, dark marks and lines
        (`board.ts`, `graybox.ts`; source rules; e2e wall pixels at 360 × 640 in 1, 17, 34)
  - [x] 7 feedback and timing: settle bob, 60 ms shiver, the 2 s finale and its skip from 600 ms
        (`tests/motion.test.ts` against GDD §3a; e2e)
  - [x] 8 teaching demonstrations in 1, 2, 9, 17 (`demo.ts`, `demo-play.ts`; `tests/demo.test.ts`;
        e2e: input opens ≤ 1.6 s, a tap skips without placing, no replay on a resume)
  - [x] 9 drag moves a ghost (`gesture.ts`, `state.ts`; unit and e2e)
  - [x] 10 the two-press hint (`hint.ts`, `reason.ts`; unit and e2e)
  - [x] 11 progress dots (`dots.ts`, `layout.ts`; unit and e2e)
  - [x] 12 the neutral legend (`visible.ts`, `tests/support/rule-words.ts`)
  - [x] 13 docs: GDD §3.1, §3.3, §3a, §4, §11, §12; GENERATOR §1.1, §4.6, §6, §6.1, §7, §8,
        §10.1; docs/questions.md D67–D79; PROGRESS
  - [x] 14 gates green: `npm run check`, `npm test` (392), `npm run levels:check` (207.0 s),
        `npm run build`, `npm run e2e` (39), `npm run size` (1.71 MB); the design critique of
        the palette (diamonds for polka dots, larger dots with a rim)
  - [ ] the auditor's A9 re-run on the new files, `code-review` and the adversarial audit
        (KRİTİK and YÜKSEK closed); the commit (the main session)
  - [ ] round 2, the last (docs/gate-b-round1.md §9: a new playtester at 360 × 640 @2x, houses
        1–20, 27, 31, 34; B1–B7 unchanged; a fail stops the work)

## Epic 4 — Feel, face and sound (M2, part 1) — only after Gates A and B
- `game/feel.ts` (every GDD §3a value as a named constant), procedural textures (ghost states,
  nightcap, the sunglasses ghost, rooms with wallpaper pattern and lightness, the teal glow,
  bookshelf, wardrobe, piano, lamps and their light, the attic facade and sky), the glance rays,
  shiver, sigh cascade, relocation glide, removal, marks, nudge, the win cascade (hit stop,
  room-by-room lighting, pooled sparks, float and wave, slide-in); one hit-stop function on the
  scene clock and the tweens (the kit's); `?feelslow=K`.
- Sound: the kit's synth pipeline (`scripts/audio.mjs`, `scripts/lib/synth.mjs`, `audio:check`
  in CI), the GDD §13 set, the attic loop and the night layer; AudioManager (platform mute wins,
  pause silences, nothing before the first gesture); `ios-unmute.ts`; `haptics.ts` with the
  GDD §3a patterns.
- AC: the inversion test (brief §4.2: failure below the chime as played, no camera or haptic on
  failure, no flash faster than 3 a second) and haptics "failure never outweighs success" green;
  e2e feel log (the chime +1 semitone per settle, cap +8, reset per house; the cascade's ticks
  rise; the kick only on the last room of a win; a seen placement logs no shake); a muted
  10-second capture of house 12 (shiver → sigh cascade → rooms light up → ghosts wave) linked in
  PROGRESS (brief M2); `design:design-critique` and `design:accessibility-review` on 9:16, 1:1
  and 16:9 (rooms not by hue alone; never baby-faced); the gamer's feel audit
  (`references/juice.md` §1) with no FAIL; initial download still ≤ 5 MB.

## Epic 5 — Meta, daily, hint and ads (M2, part 2)
- Meta: the trunk (3-segment bar, opens every 3 houses), 24 procedural costume pieces, the
  wardrobe; chapters every 15 houses (facade, sky, wallpapers, music loop), night at house 10.
- Daily: the door after house 5 (pulses until solved), the daily house with its own in-progress
  slot, the streak with its shield and save (D28), the personal best per date, the share card
  (Web Share API or download; hidden on YouTube and for platform id `youtube`), the range guard
  (D29); save v2 with its migration from v1.
- Ads and platform: `ads.ts` `AdGate` with the GDD §8 rules (D27); rewarded `hint` and `streak`
  (granted when the ad fails; free when unsupported); the interstitial between houses; dev fakes
  `?fakeads=1`, `?fakeads=fail`, `?adfast=1`; Bridge lifecycle (gameplay started and stopped,
  level messages); `analytics.ts` with the brief §8 events.
- AC (brief §11, M2): unit: the daily date in UTC; the streak (a shield once in 7 days, the save,
  a failed ad still grants, a third miss resets); the ad gate over a simulated 10-minute session
  (none before 5:00, none before house 4, none before, during or right after the daily, none
  within 60 s of a rewarded ad, ≤ 3 in total); save v1 → v2. E2E: the trunk opens at house 3; a
  hint with fake ads; the daily solved → streak 1 → the share card hidden with `platform=youtube`;
  ads unsupported → the hint is free with a 90 s cooldown and the whole suite still passes. The
  gamer's minute-map audit (`pebblit-retention`) estimates ≥ 7:00 (brief M2).

## Epic 6 — Pause sheet, brand, store, release (M3)
- The pause sheet (resume, sound, music; a platform pause over it keeps it frozen); brand: the icon
  (a ghost peeking through its fingers, one lit window, readable at 128 px), the "Shy Ghosts"
  wordmark, the Pebblit cairn, the boot visuals; `scripts/screenshots.mjs` (1080 × 1920,
  1080 × 1080, 1920 × 1080) and `scripts/thumbnails.mjs`; the store listing through
  `design:ux-copy` and the brand voice (Pebblit Games, US English, no exclamation marks or
  superlatives, never kids, children, toddler, baby or preschool; the hook "Every ghost wants to
  be alone."); the certification checklist; version 0.1.0; `npm run zip`; the size report.
- AC (brief M3): ZIP within limits with its SHA-256 in `docs/store/submission.md`; screenshots in
  three aspects; store-text tests (banned words, pitch ≤ 90 characters, three description lines,
  five tags, no exclamation marks, US spelling, "Pebblit Games"); before the release: the feel
  audit, the minute-map audit, an adversarial audit and `code-review`. Hasan: the name check,
  the Playgama upload and QA tool, a phone check (60 fps, load ≤ 3 s).
