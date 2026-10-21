# Build brief: Shy Ghosts (`writing-game-agent-briefs`, 2026-10-20)

Working title. This brief is self-contained: a coding agent with no other context can build and
verify the game from it. It lives in the studio's planning repository until the game's own
repository exists (default `kriptoloca/shy-ghosts`, §12), where it moves to `briefs/shy-ghosts.md`.
Background, not needed to build: the idea card (`reports/2026-10-20-ideas.md`, idea C), the
evaluation (`reports/2026-10-20-eval-shy-ghosts.md`, GO at 29/35), the house skills
`pebblit-game-craft` (Feel spec), `pebblit-retention` (Hold plan) and `pebblit-game-dna`
(originality distance 9 to a queens-style puzzle and to Meowdoku).

## 1. Goal & hypothesis

We believe **a logic puzzle with a new rule and a face** (place one ghost in every room of a
house so that no ghost is seen by another ghost or by a lamp; ghosts shiver when seen and glow
when safe), with endless solver-proved houses and a daily house with a forgiving streak, will
reach on the Playgama sandbox:

| Metric | Target | Source |
| --- | --- | --- |
| Plays not by Hasan | ≥ 100 | Playgama sandbox dashboard, 2026-10-18 |
| Average play time | ≥ 5:00 (goal 10:00) | same; `pebblit-retention` |
| Conversion to play (still playing after the first minute) | ≥ 65 % | Poki target via Defold's guide (search summary, 2026) |
| Players back for the next day's house | ≥ 6.7 % | CrazyGames' platform D1 average as a floor (CrazyGames docs, undated) |

Kill after ≥ 300 plays not by Hasan if the average stays under 3:00 or conversion under 40 %
with two fix releases behind it (an estimate; the evaluation's kill switch). This build exists to
test the hypothesis as cheaply as possible.

## 2. Non-goals (do not build)

A title screen or menu before the first house, a text tutorial, accounts, a backend, any network
call, leaderboards, multiplayer, in-app purchases, banners, a shop, a level select or map, a level
editor, localisation (gameplay and UI are text-free; digits are allowed), lives, energy, hearts, a
timer that can fail you, a fail state of any kind, runtime level generation on the device (every
house is generated at build time), rooms that need two ghosts and mirrors (planned for v0.2), more
than one ghost per room in v0.1, givens (pre-placed ghosts) outside the three tutorial houses,
analytics SDKs, cloud saves beyond the Bridge storage API, push notifications, anything that names
or imitates LinkedIn Queens, Star Battle or Meowdoku (no crowns, no stars, no coloured-grid look).

## 3. Core loop spec

Input → tap a cell to place a ghost → feedback: a ghost that is seen or lit shivers at once, a
calm ghost settles its room → goal: every room settled → the house lights up and the next house
starts by itself. No fail state; a personal-best time on the daily house.

### 3.1 The house

- A square grid of N × N cells, N = 2 … 9; rows `r` from the top, columns `c` from the left; cell
  index `i = r × N + c`.
- Every cell belongs to exactly one **room**. Rooms are 4-connected. A house has R rooms; in v0.1
  every room needs exactly **one** ghost. Rooms are drawn as parts of a house cross-section, each
  with its own wallpaper pattern and lightness (not hue alone), separated by thin walls.
- Every cell is one of: **empty** (a ghost may stand here), **furniture** (a bookshelf, wardrobe,
  piano; no ghost; blocks sight and light) or a **lamp** (no ghost; blocks sight and light; casts
  light). Furniture and lamp cells still belong to a room.
- **Givens** (tutorial houses only): a ghost that starts placed and can't be moved; it wears a
  nightcap.

### 3.2 Rules

- **Sight:** a ghost sees every cell along its row and its column, in all four directions, up to
  the first furniture or lamp cell or the edge. Thin room walls and other ghosts do not block
  sight (ghosts are translucent).
- **Light:** a lamp lights every cell along its row and column, in all four directions, up to the
  first furniture or lamp cell or the edge.
- A ghost is **seen** when another ghost sees its cell, **lit** when its cell is lit, and **calm**
  when it is neither.
- A room is **settled** when it holds exactly one ghost and that ghost is calm.
- The house is **solved** when every room is settled. Every house has exactly one solution
  (proved at generation, §5), so the solved state is always the stored solution.

### 3.3 Input semantics

- **Tap an empty cell** (with or without a mark): a ghost appears there. If the room already
  holds a ghost the player placed, that ghost glides to the tapped cell instead (relocation); if
  the room's ghost is a given, the given just nudges.
- **Tap a placed ghost:** it is removed.
- **Tap furniture, a lamp or a given:** a small nudge, nothing else.
- **Drag** (the pointer moves ≥ 24 design px from where it went down): paints a mark on every
  empty cell it passes over; a drag that starts on a marked cell erases marks instead. Marks are
  small dots with no effect on the rules.
- **Undo:** reverts the last placement, removal, relocation or mark stroke; unlimited and free.
- **Hint** (§7): if a placed ghost differs from the solution, the first such ghost in reading
  order floats away; otherwise the solution ghost of the unsettled room with the fewest free
  candidate cells (ties: the lowest room id) appears.
- A tap is a pointer-down and pointer-up in the same cell with < 24 design px of movement. Taps
  during the resume grace after a platform pause never count.

### 3.4 Win, no fail

The board is checked after every change. When solved: input locks, the win beat plays (§4.2),
the solve time is recorded (from the first input in this house, paused time excluded), progress
is saved, and the next house slides in by itself; a tap skips the beat. Nothing can be lost.

### 3.5 The three tutorial houses (hand-made data; verified unique)

Rows are written top to bottom, one letter per room.

| House | Rooms | Given | Solution | Teaches |
| --- | --- | --- | --- | --- |
| 1 | `AB / AB` | (0,0) | (0,0), (1,1) | tapping (0,1) makes both ghosts shiver (same row); tapping (1,1) relocates the ghost and solves |
| 2 | `ABB / ABB / CCC` | (0,1) | (0,1), (1,0), (2,2) | rows and columns both count |
| 3 | `ACCC / ACBB / ADDB / DDDB` | (0,3) | (0,3), (1,2), (2,0), (3,1) | three placements, each the last free cell of its room |

A unit test proves each has exactly one solution and is solvable with T1 alone (§5.2).

### 3.6 The daily house and the streak

- One daily house per **UTC** date, the same for every player, generated at build time for
  2026-11-01 to 2028-12-31 (792 houses). CI warns 60 days before the range runs out.
- The daily door (a calendar icon showing today's day number) appears in the HUD after house 5
  and pulses until today's daily is solved.
- **Streak:** the number of consecutive UTC days with the daily solved. One missed day is forgiven
  automatically once in any 7 days (a shield). If a second day is missed inside those 7 days, the
  next launch offers a rewarded **streak save**; if the ad fails or is not supported, the save is
  granted anyway (a broken streak video was a top complaint about Meowdoku).
- The daily keeps a personal-best time per date, shown as digits.

## 4. Controls & feel

### 4.1 Input mapping

One finger: tap (place, remove, relocate), drag (paint or erase marks). HUD buttons: undo, hint,
daily door, pause (resume, sound, music), trunk (opens the wardrobe). No long press, no double
tap, no keyboard requirement (arrow keys + Enter may move a cell cursor on desktop; optional).

### 4.2 Feel spec

Success outweighs failure: failure stays on the ghosts involved, soft and short; success gets the
stack. All values are starting points behind named constants in `src/game/feel.ts`; Hasan tunes
them on a phone.

| Action → outcome | Visual | Sound (gain vs the settle chime) | Camera | Haptic (Android) | Duration |
| --- | --- | --- | --- | --- | --- |
| Place → calm | pop in (scale 0 → 1.2 → 1.0); eyes glance left, right, up, down while faint dotted rays sweep its row and column; a sigh puff | settle chime, +1 semitone per room settled in this house (cap +8), reset per house | none | 10 ms | 120 ms pop, 250 ms glance |
| Room settles | the room's wallpaper warms from dark to a soft teal glow; the ghost glows | (the chime above) | none | (above) | 250 ms |
| Place → seen | both ghosts shiver ±4 px (3 × 40 ms) and cover their eyes; a dotted line between them flashes twice; their rooms stay dark; a small shiver repeats every 1.5 s while the conflict lasts | soft low "eep", −10 dB, 120 ms | none | none | 240 ms |
| Place → lit | the ghost squints and shields its eyes; the lit cells flash warm once; repeats every 1.5 s while lit | soft "hiss", −10 dB | none | none | 200 ms |
| One move calms k ghosts | each freed ghost sighs (scale 1.1, puff) 70 ms after the previous, rising one semitone each: the cascade from one tap | rising ticks | none | 10 ms on the last | 70 ms × k |
| Relocate | the ghost glides to the new cell (ease in-out), then the outcome row above | soft swish, −14 dB | none | none | 220 ms |
| Remove | floats up 20 px and fades | whoosh, −14 dB | none | none | 180 ms |
| Mark stroke | dots pop in per cell (scale 0 → 1) / shrink when erased | tick, −20 dB | none | none | 60 ms per cell |
| Hint | a sparkle trail from the hint button to the cell, then the place or remove row | sparkle | none | none | 300 ms |
| House solved | hit stop 50 ms; every ghost turns to the camera and smiles; rooms light one by one in room-id order every `min(90, 700 / R)` ms, +1 semitone each, the last one louder; 8 sparks per room (≤ 40 on screen); the ghosts float up together and wave; the solve-time digits tick in | rising arpeggio, last note loudest | 3 px kick on the last room | 35 ms | ≤ 1.2 s; the next house slides in (350 ms) overlapping the wave by 200 ms; a tap skips |
| Daily solved | the win above, then the streak flame grows and its digits flip; the share card button pops in (web portals only) | flame whoosh | none | 35 ms | +600 ms |
| Trunk opens (every 3 houses) | the trunk shakes twice, the lid pops, a costume piece flies onto the ghosts | pop + chime | none | 15 ms | 700 ms, during the slide-in |
| Tap a blocker or given | a 2 px nudge | none | none | none | 80 ms |

Inversion check (unit test): every failure row has a lower gain than the settle chime, no
failure row moves the camera or vibrates, and no flash repeats faster than 3 times a second.

### 4.3 Face

Shy ghosts: rounded sheets with two big eyes, a blush and tiny hands they hide behind when seen;
the tutorial residents wear nightcaps; from chapter 2 one brave ghost wears sunglasses (the
October "ghost photoshoot" trend, `reports/2026-10-20-social-trends.md`). The joke: they are too
shy to be seen, even by each other. The thumbnail at 128 px: one ghost peeking through its
fingers, one lit window.

### 4.4 Share object

A text-free daily result card drawn by the game: the house silhouette with lit windows, the date
and the solve time as digits, the streak flame with its digits, the ghosts' costumes. On web
portals a share button uses the Web Share API with the image when available, otherwise saves the
PNG. **Hidden on YouTube Playables** (off-platform action) and wherever the Bridge platform id is
`youtube`.

### 4.5 The muted 3-second clip

The last ghost drops in → the two shivering ghosts sigh one after the other → the rooms light up
one by one with a rising chord → the ghosts float up and wave.

## 5. Content pipeline (build first, as a separate tool)

`src/gen` (pure TypeScript, no Phaser) + `scripts/levels.mjs`. Seeded and deterministic
(mulberry32; level seed = hash of `shy-ghosts/level/<id>`, daily seed = hash of
`shy-ghosts/daily/<YYYY-MM-DD>`).

### 5.1 Exact solver

Backtracking over rooms, always the room with the fewest candidates first; candidates are the
room's empty cells that are not lit and not seen by the ghosts placed so far; it counts solutions
and stops at 2. Used to prove uniqueness.

### 5.2 Human-like grader

Applies the cheapest technique that makes progress, from the givens, until solved:

| Technique | Rule | Weight |
| --- | --- | --- |
| T0 | sight and light of placed ghosts remove candidates (free, automatic) | 0 |
| T1 | a room with exactly one candidate: place it | 1 |
| T2 | a cell whose ghost would leave some other room with no candidate is removed (this covers "a room confined to one sight segment clears the rest of that segment") | 3 |
| T3 | k rooms whose candidates all lie inside k row segments, or inside k column segments (a segment is a maximal run of non-blocked cells in one row or one column; it can hold at most one ghost, because any two of its cells see each other), fill those segments: the segments' other cells are removed. Never mix rows and columns in one count: a ghost at a crossing would sit in two segments | 4 + k |
| T4 | contradiction at depth 1: if placing a ghost on a cell and applying T0–T1 leaves a room with no candidate, the cell is removed | 8 |

A house the grader can't finish with the techniques allowed for its band is rejected (no
guessing). Its grade: D = sum of the weights of the steps taken, the highest technique used,
the step count, and `estSeconds` = 4 per T1 + 8 per T2 + 15 per T3 + 25 per T4 + 1.5 per empty
cell (a starting heuristic, to calibrate with `level_complete` times after launch).

### 5.3 Generator (per house)

1. Take the band's parameters (§5.4): N, room count, furniture count, lamp count, allowed
   techniques, D window.
2. Place lamps and furniture on random cells; compute the lit cells.
3. Pick a solution: as many cells as rooms, all empty and unlit, none seeing another
   (randomised backtracking).
4. Grow the rooms from the solution cells by randomised flood fill until every cell belongs to a
   room; every room is 4-connected, has ≥ 2 cells, and no room is more than 2.5 × the average
   size.
5. Run the exact solver. If there are two solutions, move one border cell between two rooms to
   break the second solution, keeping every room connected; up to 200 tries, then start over with
   the next seed.
6. Grade it. Keep it only if the grader finishes with the allowed techniques and D falls in the
   window; otherwise start over.

### 5.4 Bands (starting values; the generator logs the real distributions)

| Houses | N | Rooms | Furniture | Lamps | Techniques | D window | Role |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1–3 | 2, 3, 4 | N | 0 | 0 | T1 | — | tutorial data (§3.5) |
| 4–8 | 5 | 5 | 0 | 0 | ≤ T2 | 4–12 | first generated houses |
| 9–11 | 5 | 5–6 | 1–2 | 0 | ≤ T2 | 6–14 | furniture, introduced easy |
| 12–14 | 6 | 6–7 | 2–3 | 0 | ≤ T3 | 14–24 | furniture, tested hard |
| 15–16 | 5 | 5–6 | 1–2 | 0 | ≤ T2 | 6–12 | breathers |
| 17–19 | 6 | 6 | 0–2 | 1 | ≤ T2 | 8–16 | lamps, introduced easy |
| 20–22 | 7 | 7–8 | 1–3 | 1–2 | ≤ T3 | 18–30 | lamps, tested hard |
| 23–24 | 6 | 6 | 0–1 | 1 | ≤ T2 | 8–14 | rest |
| 25–1000 | cycles of 10: positions 1–3 at 7, 4–9 at 7–8, 10 = a 9 × 9 manor, then a 6 × 6 breather | N to N+3 | 0–5 | 0–3 | ≤ T3; T4 once at the manor | rising per cycle to a cap | sawtooth |
| Daily | 7 or 8 | N to N+2 | 1–4 | 0–2 | ≤ T3 | the middle of house 25+'s range | one per date |

After house 1000 the list continues from house 501 rotated by 90° (the rules are symmetric, so
uniqueness and grades carry over).

### 5.5 Export

`src/data/levels.json` (houses 1–1000) and `src/data/dailies.json` (date → house), byte-stable
(sorted keys, fixed formatting). One house:
`{ id, n, rooms: string (n² chars, room id in base 36), objects: string (n² chars: "." empty,
"F" furniture, "L" lamp), givens: number[], solution: number[] (cell index per room id), grade:
{ d, maxTech, steps, estSeconds }, seed }`.

**Acceptance:** `npm run levels` writes 1000 houses and 792 dailies in ≤ 10 minutes; every one has
exactly one solution and is finished by the grader within its band; the 10-house moving average
of D rises from house 4 to house 50 with dips at the breathers, and every manor is its cycle's
maximum; `npm run levels:check` reproduces both files byte for byte (CI step).

## 6. Systems, in build order

1. **Scaffold and pipeline** from the Munch Pixels kit (`kriptoloca/munch-pixels`): configs,
   lint, types, tests, build, size audit, ZIP, CI, Pages `/test/`.
2. **Platform layer** from the same kit: Bridge wrapper with stubs, versioned storage, ad gate,
   local analytics, haptics, iOS unmute, resume grace, host focus.
3. **Core rules** `src/core` (pure): house model, sight, light, room status, relocation, win
   check, undo stack, hint step.
4. **Content pipeline** (§5).
5. **Layout** (`computeLayout`, pure, tested over every design size) and the graybox scene:
   house, rooms, objects, ghosts, marks, taps and drags, undo, win → next house, save after every
   house, resume of a house in progress after a reload.
6. **Feel and procedural art** (§4.2–4.3): ghost textures per state (calm, seen, lit, given),
   furniture, lamps and their light, wallpapers (pattern + lightness), a facade and sky per
   chapter, synthesized sounds and a soft music loop per chapter, particles, the win cascade.
7. **Meta:** the trunk (a 3-segment bar, opens every 3 houses) with procedural costume pieces
   (8 shapes × 3 colourways = 24 in v0.1, then colour variants); chapters every 15 houses; the
   wardrobe view (a grid of collected pieces, text-free).
8. **Daily house:** the door, the streak with its shield and rewarded save, the share card.
9. **Hint and interstitials** (§7).
10. **Pause sheet, brand, store assets, release.**

### 6a. Hold plan (`pebblit-retention`)

**Minute map of the first 10 minutes** (a promise to compare with the gamer's audit):

| Minute | What the player does | Wins this minute | New this minute | Next goal (houses away) | Friction (s) |
| --- | --- | --- | --- | --- | --- |
| 0–1 | houses 1–3 | 3 houses, 9 rooms lit | the rule itself (shiver, sigh); the first costume at house 3 (≈ 0:53) | trunk (3) | 3 |
| 1–2 | house 4, the first without a resident; house 5 begins | 1–2 houses, ≈ 8 rooms | deducing without a given | trunk (2) | 1.5 |
| 2–3 | houses 5–6 | 2 houses | the daily door appears; costume 2 at house 6 | trunk (3), today's daily | 3 |
| 3–4 | house 7 | 1–2 houses | — | trunk (2) | 1.5 |
| 4–5 | house 8, house 9 begins | 1–2 houses | furniture (≈ 4:20) | trunk (1) | 1.5 |
| 5–6 | house 9 ends | 1 house | costume 3; the first interstitial is allowed from 5:00 | trunk (3) | 1.5 + ad |
| 6–7 | house 10 | 1 house | night falls over the attic with a music layer | trunk (2) | 1.5 |
| 7–8 | house 11 | 1 house | — | trunk (1) | 1.5 |
| 8–9 | house 12, the first hard house | 1 house | costume 4 | trunk (3) | 1.5 + ad |
| 9–10 | house 13 | 1 house | — | trunk (2), chapter 2 (3) | 1.5 |

Room settles are the micro-wins between houses: about 6–10 a minute after the tutorial.

- **Durations:** houses 1–3 ≤ 15 s each (first win ≤ 20 s); then a median of 30–90 s; manors up
  to about 120 s.
- **Difficulty shape, houses 1–50:** the bands of §5.4; each new element runs teach easy → test
  hard → rest; a breather after every hard house; no walls (nothing can be lost, and the hint
  always moves the player forward).
- **Novelty schedule:** the rule (house 1), a costume every 3 houses, the daily (house 6),
  furniture (9), night and a music layer (10), chapter 2 Library with the sunglasses ghost (16),
  lamps (17), chapter 3 Cellar (31), chapter 4 Greenhouse (46), then a chapter every 15 houses
  (Ballroom, Kitchen, Observatory, Boathouse, then palette remixes). Two-ghost rooms and mirrors
  come in v0.2 as new elements.
- **Meta:** the trunk bar (always ≤ 3 houses from the next piece), the chapter, the wardrobe; all
  cosmetic.
- **Rescue:** unlimited free undo; the hint; no fail, so a hard house never ends a session.
- **Never run out:** 1000 houses (≈ 20 hours at 75 s each, an estimate) plus a daily for every
  date to the end of 2028.
- **Ad pacing:** §7.
- **Session estimate** (`pebblit-retention` session model, its starting coefficients; inputs:
  the durations above, a 1.45 s win beat, no fails, a costume every 3 houses, interstitials where
  the gate allows them): **11:14** with 20 s interstitials and the first one not before 5:00,
  **15:38** with 10 s interstitials; with the house rule's earliest first ad at 2:00 instead,
  **8:50** and **13:26**. Every variant clears the 7:00 bar; the 5:00 first-ad delay is worth 2:12 to
  2:24, so it is the default. All four are estimates: players decide the real number.

**Hold score: 5** (something new or a goal reached at least every 2 minutes for 10 minutes,
generated content, rescue, a daily).

## 7. Monetization hooks

One interface in `src/platform/bridge.ts`, as in the kit:
`showRewarded(placement: 'hint' | 'streak'): Promise<boolean>` and `showInterstitial():
Promise<void>`, stubbed when the SDK is absent, with a dev fake (`?fakeads=1`, `?adfast=1`).

- **Interstitial** only between houses, after a solve, when all hold: ≥ 5:00 of play in this
  session before the first one; then ≥ 3 houses and ≥ 120 s since the last; ≥ 60 s since a
  rewarded ad; never before house 4; never before or during the daily house. Bridge
  `setMinimumDelayBetweenInterstitial(120)` as a second guard. Never a countdown.
- **Rewarded:** `hint` (the HUD button), `streak` (the save offer on launch). If rewarded ads are
  unsupported, the hint is free with a 90 s cooldown; if an ad fails, the reward is granted
  anyway. Check support before every call; the game is complete with no ads at all.
- No banners, no in-app purchases (YouTube Playables has none; tests are reported for 2027).

## 8. Analytics events

No network, so one local interface `track(event, props)` (`src/platform/analytics.ts`) that
counts in memory, shows in the dev state and forwards the lifecycle messages the Bridge knows:
`session_start`; `level_start` {id, n, rooms, furniture, lamps} (→ `level_started`);
`level_complete` {id, seconds, hints, moves, conflicts} (→ `level_completed`); `level_abandon`
{id, seconds, settledRooms} when a session ends inside a house (there is no `level_fail`: nothing
can be lost); `hint_used` (the booster event); `ad_rewarded_shown` {placement};
`ad_interstitial_shown`; `daily_start` and `daily_complete` {date, seconds, streak}; `unlock`
{costumeId}; `session_milestone` at 1, 3, 5 and 10 minutes; `session_end`. Gameplay start and stop
go to the Bridge as well.

## 9. Tech constraints

- Phaser 3.90.0, TypeScript 5.9.3 strict, Vite 7.3.7, Vitest 4.1.12, Playwright 1.56.1,
  @playgama/bridge 2.3.1, Node 22, npm; exact versions, no `^` or `~`; no new dependency without
  a reason line in `docs/questions.md`.
- Web: Playgama first, YouTube Playables next. Portrait primary; 1:1 and 16:9 correct. Design
  size: short side 1080 px, long side 1080 × aspect clamped to [1080, 2400]; on resize
  `scale.setGameSize(w, h)` then `layout()`. Cells ≥ 80 design px at 9 × 9 in every aspect.
- **No title screen:** the first house is interactive on load and GameReady fires then (Hold
  rule 1); FirstFrameReady when the first frame is drawn.
- Platform pause stops tweens, timers, audio and input with a dim overlay; platform mute
  silences everything regardless of in-game toggles; the tap that ends a pause never counts.
- No network calls at all (ESLint forbids them; the post-build audit fails on any external URL in
  `dist/` except the bundled Bridge script, and on any `.gz`, `.br` or `.zip`).
- Load to first input ≤ 3 s on a mid-range phone with 4× CPU throttling; initial download
  ≤ 5 MB (expect < 2 MB: procedural art, synthesized sound); 60 fps on a mid-range phone; no
  per-frame allocations in update loops; heap flat over a 15-minute session.
- `src/core` and `src/gen` stay pure (no Phaser imports; ESLint enforces it); every number lives in
  a constants file with a comment (`src/config.ts`, `src/game/feel.ts`, `src/gen/params.ts`).
- Content: text-free (digits allowed), 13+, cartoon only, no third-party IP; store text never says
  "kids", "children", "toddler" or "baby".

## 10. Milestones with acceptance criteria

| M | What | A person can check |
| --- | --- | --- |
| M0 | Content tool | `npm run levels` → 1000 houses and 792 dailies, all unique and graded within band; the D curve rises with breathers; `levels:check` byte-identical; tests green |
| M1 | Graybox loop | houses 1–3 solved by taps in under a minute; a seen ghost shivers; relocation, removal, marks and undo work; the next house starts by itself; a reload resumes the house in progress |
| M2 | Juice, meta, daily, stubs | a muted 10-second capture of house 12 looks like an ad (shiver → sigh cascade → rooms light up → ghosts wave); the trunk opens at house 3; the daily, streak, shield, save and share card work with fake ads; the inversion test passes; the gamer's minute-map audit estimates ≥ 7:00 |
| M3 | Build | `npm run zip` → a ZIP within limits; 9:16, 1:1 and 16:9 screenshots; the Playgama QA tool passes (Hasan); 60 fps and load ≤ 3 s on a phone (Hasan) |

## 11. Verification

- **Vitest:** rules on worked examples (sight stops at furniture and lamps, not at thin walls or
  ghosts; light; relocation; win); the three tutorial houses (unique, T1 only); the exact solver
  on a known two-solution house; one fixture per grader technique where it is the first that
  applies; generator invariants (connected rooms, sizes, uniqueness, band windows) and
  determinism; the daily date mapping in UTC; the streak (shield once in 7 days, the save, a failed
  ad still grants); the ad gate over a simulated 10-minute session (none before 5:00, none before
  house 4, none in the daily, ≤ 3 in total); the inversion test (§4.2); `computeLayout` over every
  design size; the save model's versioning.
- **Playwright** on the dev build with `window.__ghostDebug` hooks (state, cell centres, the
  solution): load → house 1 interactive within 3 s → houses 1–3 solved through real taps →
  auto-advance; a conflict shows the seen state; drag marks and undo; a hint with fake ads; the
  daily solved → streak 1 → share card hidden with `platform=youtube`; platform pause freezes
  everything and the waking tap is ignored; 9:16, 1:1, 16:9; no external requests; GameReady
  order.
- `npm run check` (tsc + eslint + prettier), `npm test`, `npm run build` with the size audit,
  `npm run levels:check`, `npm run e2e`, `npm run zip`; CI on every push.
- Before release: `pebblit-game-craft`'s feel audit, `pebblit-retention`'s minute-map audit, an
  independent adversarial audit (KRİTİK and YÜKSEK closed before the push), and `code-review`.

## 12. Open questions (defaults used until answered)

| Question | Default |
| --- | --- |
| Repository | `kriptoloca/shy-ghosts`, created by Hasan (or by Claude with his yes), public if GitHub Pages is wanted without a paid plan |
| Final name | "Shy Ghosts" as a working title; check stores, portals and trademarks before the listing |
| Daily boundary | UTC midnight (03:00 in Türkiye) |
| Mark gesture | drag to paint; revisit after the phone test |
| Relocation inside a full room | on |
| Hint without rewarded ads | free with a 90 s cooldown |
| First interstitial | not before 5:00 of a session (stricter than the house rule's 120 s; the session model favours it) |
| Elements after v0.1 | two-ghost rooms (two candles) and mirrors in v0.2, after the first sandbox numbers |
| Music | on at low volume; platform mute always wins |
| Halloween | not chased; the ghosts are evergreen |
| Who builds | a manual build with Claude Code, after Munch Pixels ships; the factory, if ready, takes it instead |
