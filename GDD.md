# Shy Ghosts — Game Design Document v0.1

Studio: Pebblit Games · Working title: **Shy Ghosts** (name check open, docs/questions.md)
Platforms: Playgama (Bridge, web portals) first, then YouTube Playables with the same build.
Language: text-free gameplay; digits are allowed (solve time, streak, the daily door's day).
Origin: idea C of `peek-and-find/reports/2026-10-20-ideas.md`, evaluated GO at 29/35
(`peek-and-find/reports/2026-10-20-eval-shy-ghosts.md`), built from `briefs/shy-ghosts.md` with
the `pebblit-game-craft` skill (Face, Feel, Flow, Fair, Share). Where this document and the brief
differ, docs/questions.md records why.

## 1. One line

Place one ghost in every room of a house. The ghosts are shy: none may see another along a row
or column, and none may stand in a lamp's light. A ghost that is seen shivers and hides behind its
hands; a calm one sighs and its room glows; when every room glows, the house lights up room by
room and the next house slides in.

Hook (launch plan §4, brand voice v1.2): **"Every ghost wants to be alone."**

The one-line test (`pebblit-game-craft`): a muted 3-second clip shows **a face** (the shy
ghosts), **a cascade after one tap** (the last ghost drops in, the two shivering ghosts sigh one
after the other, the rooms light up one by one with a rising chord) and ends with **something to
send** (the daily result card). House scores from the evaluation: Face 4, Feel 3; the Feel spec
below exists to lift Feel by making the rule itself the juice (evaluation §6).

## 2. Core loop

1. A **house** appears: a square grid of N × N cells (N = 2 … 9) cut into **rooms**, with
   furniture and lamps in some cells. Nothing is placed yet (the three tutorial houses start with
   one resident).
2. The player taps an empty cell: a ghost appears there. If that room already holds a ghost the
   player placed, the ghost glides to the tapped cell instead.
3. At once, each ghost shows its state: **seen** (another ghost sees it) → it shivers and covers
   its eyes; **lit** (a lamp's light reaches it) → it squints and shields its eyes; **calm** → it
   sighs, glances along its row and column, and its room warms to a soft glow.
4. Every room settled (one calm ghost each) → the house lights up room by room, the ghosts turn
   to the camera, smile, float up and wave → the next house slides in by itself.
5. No fail state, no timer that can fail you. Undo is unlimited and free; a hint is one tap away.
   One **daily house** per UTC date with a forgiving streak and a personal-best time.

Every house has exactly one solution and can be solved by deduction alone, without guessing
(GENERATOR.md §3–§4; proved for every house at build time).

## 3. Rules (exact; GENERATOR.md §2 holds the formal version)

- **Cells:** rows `r` from the top, columns `c` from the left; cell index `i = r × N + c`. Every
  cell is **empty** (a ghost may stand here), **furniture** (a bookshelf, wardrobe or piano; no
  ghost; blocks sight and light) or a **lamp** (no ghost; blocks sight and light; casts light).
  Furniture and lamp cells still belong to a room.
- **Rooms:** every cell belongs to exactly one room; rooms are 4-connected and have ≥ 2 cells. In
  v0.1 every room needs exactly one ghost.
- **Sight:** a ghost sees every cell along its row and its column, in all four directions, up to
  the first furniture or lamp cell or the edge. Thin room walls and other ghosts do not block
  sight (ghosts are translucent).
- **Light:** a lamp lights every cell along its row and column, in all four directions, up to the
  first furniture or lamp cell or the edge.
- A ghost is **seen** when another ghost sees its cell, **lit** when its cell is lit, **calm**
  when it is neither. A room is **settled** when it holds exactly one ghost and that ghost is
  calm. The house is **solved** when every room is settled; since every house has one solution,
  the solved state is always the stored solution.
- **Givens** (tutorial houses only): a resident that starts placed, can't be moved, and wears a
  nightcap.

### 3.1 Input (brief §3.3, with decision D21 of docs/questions.md)

- **Tap an empty cell** (with or without a mark): a ghost appears there and the mark goes. If the
  room already holds a ghost the player placed, that ghost glides to the tapped cell instead
  (relocation); if the room's ghost is a given, the given just nudges.
- **Tap a placed ghost:** it is removed.
- **Tap furniture, a lamp or a given:** a small nudge, nothing else.
- **Drag** (the pointer moves ≥ 24 design px from where it went down): paints a mark on every
  empty, ghost-free cell it passes over, the starting cell included; a drag that starts on a
  marked cell erases marks instead. Marks are small dots with no effect on the rules.
- **Undo:** reverts the last placement, removal, relocation, mark stroke or hint action;
  unlimited and free. The undo history lives for the session; a reload restores the board, not
  the history.
- **Hint:** if a placed ghost differs from the solution, the first such ghost in reading order
  floats away; otherwise the solution ghost of the unsettled room with the fewest free candidate
  cells (ties: the lowest room id) appears. Free with a 90 s cooldown when rewarded ads are not
  supported (the graybox uses this form); otherwise a rewarded `hint` ad, granted even when the ad
  fails (§8).
- A **tap** is a pointer-down and pointer-up in the same cell with < 24 design px of movement.
  Taps during the resume grace after a platform pause never count. Optional on desktop: arrow keys
  move a cell cursor and Enter taps.

### 3.2 Win, no fail

The board is checked after every change. When solved: input locks, the win beat plays (§3a), the
solve time is recorded (from the first input in this house, paused time excluded), progress is
saved, and the next house slides in by itself; a tap skips the beat. Nothing can be lost.

### 3.3 The three tutorial houses (hand-made data, `src/data/tutorial.ts`)

Rows top to bottom, one letter per room. Verified for this plan: each has exactly one solution
with its given and is solved by "last free cell" placements alone (without the given: 2, 4 and 9
solutions).

| House | Rooms | Given | Solution | Teaches |
| --- | --- | --- | --- | --- |
| 1 | `AB / AB` | (0,0) | (0,0), (1,1) | tapping (0,1) makes both ghosts shiver (same row); tapping (1,1) relocates the ghost and solves |
| 2 | `ABB / ABB / CCC` | (0,1) | (0,1), (1,0), (2,2) | rows and columns both count |
| 3 | `ACCC / ACBB / ADDB / DDDB` | (0,3) | (0,3), (1,2), (2,0), (3,1) | three placements, each the last free cell of its room |

Then each new element is taught by the house that introduces it, and tests prove it (GENERATOR.md
§9, A5): house 4 is the first without a resident and needs the first deduction; house 9's
solution has two ghosts in one row or column with furniture between them (furniture blocks
sight); house 12 is the first that needs the counting deduction (T3); house 17's lamp is
load-bearing (without its light the house would have more than one solution).

## 3a. Feel spec (`pebblit-game-craft` workflow A; brief §4.2)

Rule: the right move is the loudest moment. Failure stays on the ghosts involved, soft and short;
success gets the stack. Values are starting points behind named constants in
`src/game/feel.ts`, tuned on Hasan's phone. Gains are relative to the settle chime as played
(file level + gain, `pebblit-game-craft` references/juice.md §1).

| Action → outcome | Visual | Sound | Camera | Haptic (Android) | Duration |
| --- | --- | --- | --- | --- | --- |
| Place → calm | pop in (scale 0 → 1.2 → 1.0); the eyes glance left, right, up, down while faint dotted rays sweep its row and column up to the first blocker; a sigh puff | settle chime, +1 semitone per room settled in this house (cap +8), reset per house | none | 10 ms | 120 ms pop, 250 ms glance |
| Room settles | the room's wallpaper warms from dark to a soft teal glow; the ghost glows | (the chime above) | none | (above) | 250 ms |
| Place → seen | both ghosts shiver ±4 px (3 swings × 40 ms) and cover their eyes with their hands; a dotted line between them shows twice (100 ms on, 240 ms off, 100 ms on: under 3 flashes a second, D23); their rooms stay dark; a small shiver (±2 px) repeats every 1.5 s while the conflict lasts | soft low "eep", −10 dB, 120 ms | none | none | 240 ms (the line 440 ms) |
| Place → lit | the ghost squints and shields its eyes; the lit cells of that lamp flash warm once; repeats every 1.5 s while lit | soft "hiss", −10 dB | none | none | 200 ms |
| A calm ghost becomes seen or lit (D22) | its room cools from teal back to dark | none of its own (the placement's eep or hiss covers it) | none | none | 200 ms |
| One move calms k ghosts | each freed ghost sighs (scale 1.1, puff) 70 ms after the previous, rising one semitone each: the cascade from one tap | rising ticks | none | 10 ms on the last | 70 ms × k |
| Relocate | the ghost glides to the new cell (ease in-out), then the outcome row above | soft swish, −14 dB | none | none | 220 ms |
| Remove | floats up 20 px and fades | whoosh, −14 dB | none | none | 180 ms |
| Mark stroke | dots pop in per cell (scale 0 → 1) / shrink when erased | tick, −20 dB | none | none | 60 ms per cell |
| Hint | a sparkle trail from the hint button to the cell, then the place or remove row | sparkle | none | none | 300 ms |
| House solved | hit stop 50 ms; every ghost turns to the camera and smiles; rooms light one by one in room-id order (reading order of each room's first cell, so the light sweeps down the house, D9) every `min(90, 700 / R)` ms, +1 semitone each, the last one louder; 8 sparks per room (≤ 40 on screen); the ghosts float up together and wave; the solve-time digits tick in | rising arpeggio, last note loudest | 3 px kick on the last room | 35 ms | ≤ 1.2 s; the next house slides in (350 ms) overlapping the wave by 200 ms; a tap skips |
| Daily solved | the win above, then the streak flame grows and its digits flip; the share card button pops in (web portals only) | flame whoosh | none | 35 ms | +600 ms |
| Trunk opens (every 3 houses) | the trunk shakes twice, the lid pops, a costume piece flies onto the ghosts | pop + chime | none | 15 ms | 700 ms, during the slide-in |
| Tap a blocker or given | a 2 px nudge | none | none | none | 80 ms |

- **Inversion test** (unit, brief §4.2): every failure row (seen, lit, cools, nudge) plays below
  the settle chime as played; no failure row moves the camera or vibrates; no flash repeats faster
  than 3 times a second; haptics: failure never longer than the success tick.
- **Cascade per input:** a placement that ends a conflict releases the sigh cascade (k × 70 ms)
  and the chimes; the last placement releases the win cascade (≤ 1.2 s) the player does not
  drive.
- **Escalation:** the chime climbs one semitone per settled room (cap +8, reset per house), so the
  fifth settle sounds different from the first; the win arpeggio tops it.
- **Micro-win cadence:** room settles are the micro-wins, about 6–10 a minute after the tutorial
  (brief §6a). Checked on the Epic 4 capture and on Hasan's first session; flag any 10 s stretch
  without a settle on a recording of houses 4–11.
- **Input stays open** during every cascade except the win (input locks; a tap skips the beat).
- **Pause** freezes every tween, timer, repeating shiver and sound; a pending hit stop never
  resumes a paused game.
- **iPhone:** no Vibration API on the web, so the hand-feel there is visual and audio only.
- **The muted 3-second clip** (brief §4.5): the last ghost drops in → the two shivering ghosts
  sigh one after the other → the rooms light up one by one with a rising chord → the ghosts float
  up and wave. Epic 4's capture stages it on house 12.

## 4. Face

- **Shy ghosts:** rounded sheets with two big eyes, a blush and tiny hands they hide behind when
  seen. The joke: they are too shy to be seen, even by each other. 13+ and never baby-faced
  (D24): oval eyes set high with lids and brows that carry the mood, a slim sheet silhouette, the
  blush as a muted stroke rather than pink discs, chapter palettes without nursery pastels.
- **States read at a glance:** calm (soft glow, eyes open), seen (hands over the eyes, shiver),
  lit (squint, a hand shielding the eyes), given (a nightcap). Each state is its own drawn
  texture (CLAUDE.md, Rendering).
- **Cast:** the tutorial residents wear nightcaps; from chapter 2 one brave ghost wears
  sunglasses (the October "ghost photoshoot" trend, `reports/2026-10-20-social-trends.md`). The
  sunglasses are cosmetic: when lit, the brave ghost's shades slide down and it squints like any
  other, so nobody reads it as immune to light (D25). Costume pieces from the trunk sit on the
  head or the hem and never cover the eyes or hands.
- **The house:** a cross-section, each room with its own wallpaper pattern and lightness (not
  hue alone), thin walls between rooms; bookshelves, wardrobes and pianos as furniture; lamps
  with a warm cone of light along their row and column; a facade and sky per chapter.
- **Thumbnail at 128 px:** one ghost peeking through its fingers, one lit window.

## 5. Share

A text-free **daily result card** drawn by the game: the house silhouette with lit windows, the
date and the solve time as digits, the streak flame with its digits, the ghosts' costumes. On web
portals a share button uses the Web Share API with the image when available, otherwise saves the
PNG; the share text is one string of `src/data/strings.ts` without a URL ("Every ghost wants to be
alone."). **Hidden on YouTube Playables** (an off-platform action) and wherever the Bridge
platform id is `youtube`; after a refused share and a refused download the button hides for the
session (Munch Pixels D11).

## 6. Fair

- Every house has exactly one solution, proved by an exact solver at build time.
- Every house is solved by a human-like grader with the techniques its band allows: no house ever
  needs a guess (GENERATOR.md §4).
- Difficulty is measured, not guessed: the grader's score D, its highest technique, its steps,
  and two player models — a naive player who sees the shiver but does not deduce must fail most
  mid and late houses (GENERATOR.md §5, §9).
- No fail state: undo is unlimited and free, and the hint always moves the player forward
  (§3.1). Rewarded ads rescue; they never gate a house.

## 7. Flow and Hold

- **One rule, everything visible:** the sight lines, the light and the rooms are on screen; a
  placed ghost's glance draws its sight lines, so the rule teaches itself without text.
- **Chaos to order:** dark rooms warm one by one; the board visibly fills with glow, so progress
  needs no counter.
- **Tension saved for a few houses:** each new element runs teach easy → test hard → rest
  (houses 4–24 in GENERATOR.md §7), then cycles of rising houses with a 9 × 9 manor and a
  breather.
- **Minute map** (brief §6a, a promise to compare with the gamer's audit): houses 1–3 in the
  first minute with the first costume at ≈ 0:53; the daily door in minute 2–3; furniture at
  ≈ 4:20; the first interstitial allowed from 5:00; night and a music layer at house 10;
  the first hard house at minute 8–9; chapter 2 at house 16.
- **Durations** (brief §6a): houses 1–3 ≤ 15 s each (first win ≤ 20 s); then a median of
  30–90 s; manors up to about 120 s. The brief's own time formula (`estSeconds`) runs longer than
  these targets for boards of 6 × 6 and up (GENERATOR.md §9, A6); the first human times decide
  (Hasan's first session after the gates, then `level_complete` in the sandbox).
- **Novelty schedule:** the rule (house 1), a costume every 3 houses, the daily (house 6),
  furniture (9), night and a music layer (10), chapter 2 Library with the sunglasses ghost (16),
  lamps (17), chapter 3 Cellar (31), chapter 4 Greenhouse (46), then a chapter every 15 houses.
- **Rescue:** unlimited free undo; the hint; no fail, so a hard house never ends a session.
- **Never run out:** 1000 houses, then the list continues from house 501 rotated (D14), plus a
  daily house for every date to the end of 2028.
- **Session estimate** (brief §6a, `pebblit-retention`): 11:14 with 20 s interstitials and the
  first not before 5:00. Hold score 5. An estimate; players decide the real number.

## 8. Monetization (Playgama Bridge 2.3.1, same wrapper as Munch Pixels)

One interface in `src/platform/bridge.ts`: `showRewarded(placement: 'hint' | 'streak'):
Promise<boolean>` and `showInterstitial(): Promise<void>`, stubbed when the SDK is absent, with
dev fakes (`?fakeads=1`, `?fakeads=fail`, `?adfast=1`).

- **Interstitial** only between houses, after a solve, when all hold (`AdGate`, pure, D27):
  ≥ 300 s of play in this session before the first one (paused time excluded); ≥ 3 houses and
  ≥ 120 s since the last one (or the session start); ≥ 60 s since a rewarded ad ended; the house
  just solved is house 4 or later; the next house is not the daily, and the house just solved was
  not the daily (the daily's slot is skipped so the share card has its moment). Bridge
  `setMinimumDelayBetweenInterstitial(120)` as a second guard. Never a countdown.
- **Rewarded:** `hint` (the HUD button) and `streak` (the save offer on launch). If rewarded ads
  are unsupported, the hint is free with a 90 s cooldown and the streak save is free; if an ad
  fails, the reward is granted anyway. Check support before every call; the game is complete
  with no ads at all.
- No banners, no in-app purchases, no off-platform links.

## 9. Progression, meta and saves

- **Houses:** a fixed list, the same for every player: houses 1–3 hand-made, 4–1000 generated at
  build time (`src/data/levels.json`); after house 1000 the list continues from house 501 rotated
  (D14). The game always plays the lowest unsolved house; there is no level select.
- **Chapters** every 15 houses: Attic (1–15; night falls at house 10 with a music layer), Library
  (16–30), Cellar (31–45), Greenhouse (46–60), Ballroom, Kitchen, Observatory, Boathouse, then
  palette remixes. Each chapter has its own facade, sky, wallpapers and music loop.
- **Trunk:** a 3-segment bar in the HUD; every solved house fills a segment, every third opens the
  trunk and a costume piece flies onto the ghosts (8 shapes × 3 colorways = 24 in v0.1, then color
  variants). Always ≤ 3 houses from the next piece. All cosmetic.
- **Wardrobe:** the trunk button opens a text-free grid of the collected pieces.
- **Save** (Bridge storage, localStorage in dev; never blocks or throws; `version` for
  migrations):
  - v1 (Epics 0–3): `{ version, house, housesSolved, current, sound, music }`, where `current` is
    the house in progress `{ id, ghosts, marks, seconds, hints, moves, conflicts }` or null.
    Saved after every house and after every change inside a house (debounced), so a reload
    resumes the house in progress.
  - v2 (Epic 5) adds `costumes`, `trunk`, `streak { count, best, lastSolved, shieldUsedOn,
    saveUsedOn }`, `dailyBest` (date → seconds, the last 400 dates) and `currentDaily`, with a
    tested migration from v1.

## 10. The daily house and the streak (brief §3.6; D28–D29)

- One daily house per **UTC** date, the same for every player, generated at build time for
  2026-11-01 to 2028-12-31 (792 houses, `src/data/dailies.json`). CI warns from 2028-11-01 (60 days
  before the range runs out). Outside the range the daily door stays hidden.
- The **daily door** (a calendar icon showing today's day number) appears in the HUD after house 5
  and pulses until today's daily is solved. The daily plays in the same scene, with its own
  in-progress slot, so the main house waits where it was.
- **Streak:** consecutive UTC days with the daily solved. One missed day is forgiven
  automatically once in any 7 days (a shield). If a second day is missed inside those 7 days, the
  next launch offers a rewarded **streak save**; if the ad fails or is not supported, the save is
  granted anyway. One shield and one save per rolling 7 days, each covering one missed day; a
  third missed day inside those 7 days, or three missed days in a row, resets the streak (the
  best stays).
- The daily keeps a personal-best time per date, shown as digits.

## 11. Screens and HUD

1. **Boot:** a dark house silhouette with a thin progress bar (no text, no title). The first
   house is interactive as soon as it is drawn: GameReady fires then (no title screen, brief §9).
2. **Game:** the house; HUD buttons undo, hint, pause, trunk (with its 3-segment bar), and the
   daily door after house 5. Digits only where the brief puts them (solve time at the win, streak,
   the door's day).
3. **Pause sheet:** resume, sound, music (Epic 6).
4. **Wardrobe:** the collected costume pieces (Epic 5).
5. **Daily:** the same scene with the calendar mark; on a solve, the streak flame and, on web
   portals, the share card button (Epic 5).
6. **Streak save offer** on launch, only when a save is due: a cracked flame and the rewarded mark;
   accept or dismiss (Epic 5).

## 12. Layout (same scale rules as Munch Pixels; CLAUDE.md rule 5)

Design size: short side 1080, long side follows the viewport aspect, clamped to [1080, 2400];
`Scale.FIT`; `setGameSize` on every resize, then `layout()`. Portrait (primary): a top HUD band,
the board square, a bottom band with undo and hint. Landscape: the board left, the HUD as a column
on the right. 1:1: thinner bands around a smaller board. Cells ≥ 80 design px at 9 × 9 in every
aspect; the hit area of a cell is the cell. `computeLayout` is pure and tested over every design
size in 40 px steps.

## 13. Audio

Synthesized placeholders (the kit's `scripts/lib/synth.mjs` → OGG + M4A, Epic 4): settle chime
(pitched in semitone steps), eep, hiss, swish, whoosh, tick, sparkle, win arpeggio, flame whoosh,
trunk pop and chime, button; a soft music loop per chapter and the night layer from house 10.
Music on at low volume; platform mute always wins; in-game toggles never override it. Failure
cues are measured as played below the chime (§3a).

## 14. Analytics (local only, brief §8)

`track(event, props)` in `src/platform/analytics.ts` counts in memory, shows in the dev state and
forwards the lifecycle messages the Bridge knows: `session_start`; `level_start` {id, n, rooms,
furniture, lamps} (→ `level_started`); `level_complete` {id, seconds, hints, moves, conflicts}
(→ `level_completed`); `level_abandon` {id, seconds, settledRooms} when a session ends inside a
house (no `level_fail`: nothing can be lost); `hint_used`; `ad_rewarded_shown` {placement};
`ad_interstitial_shown`; `daily_start` and `daily_complete` {date, seconds, streak}; `unlock`
{costumeId}; `session_milestone` at 1, 3, 5 and 10 minutes; `session_end`. Gameplay start and stop
go to the Bridge as well. Built in Epic 5.

## 15. Platform rules (all hard; CLAUDE.md)

No external network calls; initial download ≤ 5 MB, 30 MB hard; no title screen, GameReady when
the first house is interactive; host pause and mute stop everything; 9:16, 1:1 and 16:9 correct;
text-free gameplay; 13+; no third-party IP and nothing that imitates Queens, Star Battle or
Meowdoku; no off-platform links on YouTube.

## 16. Out of scope for v0.1 (brief §2)

A title screen or menu before the first house, a text tutorial, accounts, a backend, any network
call, leaderboards, multiplayer, in-app purchases, banners, a shop, a level select or map, a level
editor, localization, lives, energy, hearts, a timer that can fail you, a fail state, runtime
level generation on the device, two-ghost rooms and mirrors (v0.2), more than one ghost per room,
givens outside the three tutorial houses, analytics SDKs, cloud saves beyond the Bridge storage
API, push notifications, anything that names or imitates LinkedIn Queens, Star Battle or
Meowdoku. Not chasing Halloween: the ghosts are evergreen.

## 17. Targets and kill switch (brief §1; evaluation §7)

On the Playgama sandbox: ≥ 100 plays not by Hasan; average play time ≥ 5:00 (goal 10:00);
conversion to play ≥ 65 %; players back for the next day's house ≥ 6.7 % (CrazyGames' platform D1
average as a floor). Kill after ≥ 300 plays not by Hasan if the average stays under 3:00 or
conversion under 40 % with two fix releases behind it. The fun gates (TASKS.md) come first: no
sandbox upload before Gates A and B pass and Epics 4–6 are done.
