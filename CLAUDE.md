# CLAUDE.md — Shy Ghosts (Pebblit Games)

You are building a text-free logic puzzle for Playgama (web portals) and YouTube Playables,
published via Playgama Bridge: place one ghost in every room of a house so that no ghost is seen
by another ghost or lit by a lamp. Read `GDD.md` (design and the Feel spec), `GENERATOR.md`
(exact rules, solver, grader, generator, Gate A), `briefs/shy-ghosts.md` (scope and milestones)
and `TASKS.md` (epics and gates) before any work. Where `docs/questions.md` and the brief
differ, `docs/questions.md` wins. Platform rules below are hard constraints; violating them fails
certification.

**Session start:** read `docs/PROGRESS.md` first (where we left off, next steps, Hasan's pending
steps), then `docs/questions.md` (decisions that override the spec). **Epic end:** update
`docs/PROGRESS.md` (board, measured, next steps) in the same commit.

## The fun gate (hard rule; the Munch Pixels lesson)

Munch Pixels reached feel and art before anyone checked that its levels asked for decisions: a
bot that tapped any muncher able to eat won 98.3 % of levels 1–20 and 93.5 % of 21–100
(munch-pixels `docs/core-rework-spec.md` §1.1, 2026-10-21). Correct is not the same as fun.
So, here:

- **Gate A** closes Epic 2 (generator and grader): pure tests over every house prove unique
  solutions, no guessing at any band, the technique mix per band, the deduction depth curve, the
  tutorial order, the estimated solve time per band, and that a naive player who places ghosts
  without full deduction fails most mid and late houses. Thresholds: GENERATOR.md §9.
- **Gate B** closes Epic 3 (graybox loop): the playtester plays the graybox in a browser and must
  judge that a fan of Queens- or Star Battle-style puzzles would keep playing past house 10.
  Thresholds: TASKS.md, Epic 3.
- **No Epic 4 (feel, face, sound) and no further platform work** (ads, analytics, haptics,
  daily, share) before both gates pass. Epic 0 ports only the platform shell the graybox needs to
  boot and resume.
- **Hasan is shown nothing before both gates pass.** Then he gets screenshots first, then the
  `/test/` link.
- A gate threshold never moves to make a gate pass; only Hasan can change one. The generator's
  windows (`src/gen/params.ts`) are the tuning levers. A gate that still fails after two tune
  rounds stops the work: Hasan gets the gate report and a recommendation, no screenshots.

## Stack
- Phaser 3.90.0, TypeScript 5.9.3 (strict), Vite 7.3.7, Vitest 4.1.12, Playwright 1.56.1,
  @playgama/bridge 2.3.1. No React, no UI frameworks.
- npm, Node ≥ 20 (CI and `.nvmrc`: 22). Every dependency pinned exactly (`.npmrc` save-exact);
  no new dependency without a reason line in `docs/questions.md`.
- Tests: Vitest for everything pure (rules, solver, grader, generator, player models, layout,
  save model, ad gate, streak, feel constants); Playwright e2e against the dev build
  (`npm run build:test`).
- Commands: `npm run dev` (LAN dev server), `npm run build` (dist/ + post-build audit),
  `npm test`, `npm run check` (tsc + eslint + prettier --check), `npm run levels` (rebuild
  `src/data/levels.json` and `src/data/dailies.json`), `npm run levels:check`, `npm run e2e`,
  `npm run size`, `npm run zip` (submission ZIP + SHA-256). Each arrives with the epic that
  needs it (TASKS.md).

## Platform hard constraints (YouTube Playables; same as Peek & Find and Munch Pixels)
1. **No external network calls.** No fetch/XHR/WebSocket/beacon, no analytics SDKs, no external
   fonts, no CDN scripts. ESLint forbids them in `src/`; `scripts/audit-dist.mjs` fails the build
   on any `http(s)://` URL in `dist/` other than the bundled Bridge script, or any
   `.gz`/`.br`/`.zip` file.
2. **Size:** initial download ≤ 5 MB (brief §9; expect < 2 MB: procedural art, synthesized
   sound), 30 MB hard. No file > 30 MB. No build-time compression. `build.assetsInlineLimit = 0`;
   relative paths only; anything loaded later comes from the same origin.
3. **No title screen. GameReady** fires when the first house is interactive with its assets
   loaded; FirstFrameReady when the first frame is drawn. Load to first input ≤ 3 s on a
   mid-range phone with 4× CPU throttling.
4. **Pause/mute:** platform pause stops all tweens, timers, audio and input, with a dim overlay;
   resume restores. Platform mute silences everything regardless of in-game toggles. The tap
   that wakes the game after a pause is never a game tap (`ResumeGrace`).
5. **Aspect ratios:** 9:16 (primary), 1:1, 16:9 all correct. Phaser `Scale.FIT` with a design
   size that follows the window aspect: short side 1080 design px, long side `1080 × aspect`
   clamped to [1080, 2400]; on resize `scale.setGameSize(w, h)` then `layout()`. `computeLayout`
   is pure and unit-tested over every design size. Cells ≥ 80 design px at 9 × 9 in every aspect.
6. **Ads:** an interstitial only between houses, after a solve, and only when all of these hold
   (GDD §8): ≥ 5:00 of play this session before the first one; ≥ 3 houses and ≥ 120 s since the
   last one (or the session start); ≥ 60 s since a rewarded ad; never before house 4; never
   before, during or right after the daily house. `setMinimumDelayBetweenInterstitial(120)` as a
   second guard. Never a countdown. Rewarded only for `hint` and `streak`. Check support before
   every call; a failed rewarded ad still grants the reward; the game is complete with no ads.
7. **Saves:** Bridge storage; dev fallback localStorage behind the same interface; never throw;
   the save carries `version`.
8. **Content:** no text in gameplay (digits allowed), no third-party IP, cartoon only, 13+, no
   nursery palette, no baby-faced characters; nothing that names or imitates LinkedIn Queens,
   Star Battle or Meowdoku (no crowns, no stars, no colored-grid look). Store text never says
   "kids", "children", "toddler", "baby" or "preschool"; it follows the brand voice (Pebblit
   Games, US English, no exclamation marks, no superlatives).
9. **No timers before interstitials, no banners, no IAP, no off-platform links** (the share
   button is hidden on YouTube and wherever the Bridge platform id is `youtube`).

## Rendering
- Every state a player must tell apart (calm, seen, lit, given; a settled room; a lit cell) is a
  drawn texture or fill of its own, never produced with runtime tint (`setTint` only darkens and
  the Canvas renderer ignores it). `setTintFill` is allowed for feedback flashes only.
- Rooms differ by wallpaper pattern **and** lightness, never by hue alone (color-blind
  players). Walls between rooms are drawn thicker than the cell grid inside a room.
- Costume pieces never cover a ghost's eyes or hands: the state must stay readable.

## Project structure
```
src/
  main.ts               # Phaser config, scale, scenes (Boot → Game; no Title)
  config.ts             # design sizes and layout constants
  core/                 # house.ts (model, segments, sight, light), state.ts (play state,
                        # moves, undo, marks, win), hint.ts, streak.ts (Epic 5) — pure
  gen/                  # rng.ts, params.ts (bands), solve.ts, grade.ts, players.ts,
                        # generate.ts, build-levels.ts — pure
  data/                 # tutorial.ts, levels.json, dailies.json, strings.ts
  platform/             # bridge.ts, storage.ts, host.ts, timeout.ts (Epic 0);
                        # haptics.ts, ios-unmute.ts (Epic 4); ads.ts, analytics.ts (Epic 5)
  game/                 # layout.ts, resume-grace.ts, scenes/, views (Epic 3); feel.ts,
                        # audio.ts, textures.ts, fx.ts (Epic 4); meta, daily, share (Epic 5)
  dev/                  # debug hooks (window.__ghostDebug), dev-only
scripts/                # levels.mjs, audit-dist.mjs, build-test.mjs, write-version.mjs, size.mjs,
                        # zip.mjs, dev-url.mjs, lib/; audio.mjs and capture.mjs from Epic 4
tests/                  # vitest (*.test.ts), tests/e2e (Playwright)
docs/                   # PROGRESS.md, questions.md, skills.md, bridge-notes.md
briefs/                 # the build brief
```
`src/core` and `src/gen` stay pure (no Phaser, no clocks, no `Math.random`; ESLint enforces it)
so they are deterministic and unit-testable.

## Coding rules
- TypeScript strict, no `any`. ESLint + Prettier, 100 columns.
- Determinism: all randomness goes through `Rng` from a seed; same seed → identical house.
- No magic numbers in gameplay code: constants live in `src/config.ts`, `src/game/feel.ts` and
  `src/gen/params.ts`, each with a comment.
- Input (GDD §3): a **tap** is a pointer-down and pointer-up in the same cell with < 24 design
  px of movement; a **drag** (≥ 24 design px) paints marks, or erases them when it starts on a
  marked cell. HUD buttons act on a pointer-up that follows a pointer-down on the same button,
  so a press held through a pause never counts.
- The rules resolve at once in `src/core`; the scene only plays them back. The settled screen
  always equals the rules (an e2e compares them).
- Dev hooks and dev URL parameters live only inside `import.meta.env.DEV` (an e2e checks the
  production bundle). The playtest mode (`?playtest=1`) hides the solution from the hooks.
- Performance: pooled effects, no per-frame allocations in update loops, heap flat over a
  15-minute session, 60 fps on a mid-range phone.
- Every behavior change gets a test; a bug fix starts with a red test.
- No model names in any repository file.

## Skills (`docs/skills.md` maps them to steps)
Every game design, feel or polish change goes through `pebblit-game-craft` (Face, Feel, Flow,
Fair, Share; the Feel spec in GDD §3a is the contract). Every epic ends with `code-review` and an
independent adversarial audit subagent against GDD.md, GENERATOR.md and these rules; KRİTİK and
YÜKSEK findings are closed before the push. Store text goes through `design:ux-copy` and the
brand voice; the launch through `game-trend-skills:launching-on-zero-budget`; numbers after the
launch through `game-trend-skills:tracking-game-metrics`.

## Commits and definition of done
- Commit per epic: `feat(epic-N): <summary>`; small fix commits allowed. The repository is
  local on `main` until Hasan creates `kriptoloca/shy-ghosts`; then push to `main`.
- Every epic ends with: `npm run check` clean, `npm test` green, `npm run build` succeeds,
  `npm run levels:check` clean (from Epic 2), `npm run e2e` green, PROGRESS updated.
- Project done (v0.1, brief M3): Playgama QA tool passes; 9:16, 1:1, 16:9 screenshot-verified;
  60 fps and load ≤ 3 s on a phone; initial download ≤ 5 MB.
