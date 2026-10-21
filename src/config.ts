/**
 * Design-space constants (GDD §12, CLAUDE.md rule 5). All positions are in design px: the short
 * side of the canvas is always DESIGN_SHORT, the long side follows the window aspect and is
 * clamped to DESIGN_LONG_MAX.
 */
export const DESIGN_SHORT = 1080;
/** Long side cap (≈ 20:9). Taller or wider viewports get letterboxed by Scale.FIT. */
export const DESIGN_LONG_MAX = 2400;

/**
 * After an orientation change iOS reports the old viewport for a frame or two: the size is read
 * again after each of these delays (ms) as well.
 */
export const ORIENTATION_RECHECK_MS: readonly number[] = [60, 300];

// ---- House format (GDD §3, GENERATOR.md §1; read by the rules in src/core) ---------------------

/** Smallest and largest side of a house (GDD §3: N = 2 … 9). */
export const HOUSE_N_MIN = 2;
export const HOUSE_N_MAX = 9;
/** Room ids are written in base 36 (GENERATOR.md §1.1), so a house has at most 36 rooms. */
export const ROOM_ID_RADIX = 36;
/** Every room has at least this many cells (GDD §3). */
export const ROOM_MIN_CELLS = 2;
/** Quarter turns that bring a house back to where it started (houses after 1000, D14). */
export const QUARTER_TURNS = 4;

// ---- Input ----------------------------------------------------------------------------------

/**
 * Taps are ignored for this long after a platform resume, so the tap that woke the game is never
 * a game tap (CLAUDE.md rule 4; src/game/resume-grace.ts explains the iOS host case).
 */
export const RESUME_TAP_GRACE_MS = 350;

/** Page and canvas background behind everything (also index.html and the Phaser config). */
export const COLOR_PAGE = 0x161a26;
export const COLOR_PAGE_CSS = '#161a26';

// ---- Boot screen (GDD §11 screen 1: a dark house silhouette and a thin bar, no text) ----------

/** Boot steps that move the bar: the platform, the save, the hand-over to the Game. */
export const BOOT_STEPS = 3;
/** The silhouette: a body this wide and tall with a roof this tall on top, centred. */
export const BOOT_HOUSE_W = 360;
export const BOOT_HOUSE_H = 260;
export const BOOT_ROOF_H = 160;
/** The progress bar sits this far below the silhouette's base. */
export const BOOT_BAR_GAP = 90;
export const BOOT_BAR_W = 360;
export const BOOT_BAR_H = 8;
export const COLOR_BOOT_HOUSE = 0x0d1018;
export const COLOR_BOOT_BAR_TRACK = 0x262b3b;
export const COLOR_BOOT_BAR_FILL = 0x6f86a8;

// ---- Layout (GDD §12; computeLayout in src/game/layout.ts) ------------------------------------

/** Space between the canvas edge, the bands, the HUD column and the board. */
export const LAYOUT_MARGIN = 32;
/**
 * Portrait only: the board's margin to the left and right canvas edge (D69, was 32). A 1,056 px
 * board gives 8 × 8 cells of 132 design px: 44 CSS px on a 360 × 640 phone, 66 at 540 × 960.
 */
export const PORTRAIT_SIDE_MARGIN = 12;
/**
 * A design size this much taller than wide is portrait, this much wider than tall landscape;
 * in between (1:1 and near it) the square arrangement: thinner bands around a smaller board.
 */
export const ARRANGE_RATIO = 1.2;
/** Portrait: the top band (kept for the later HUD: trunk, daily door, pause) and the bottom band. */
export const PORTRAIT_TOP_BAND = 180;
export const PORTRAIT_BOTTOM_BAND = 240;
/** Square: a thin band above and below the board. */
export const SQUARE_BAND = 132;
/** Landscape: the HUD column on the right of the board. */
export const LANDSCAPE_COLUMN = 240;
/** HUD buttons: the largest radius, the space kept around one inside its band, the gap between two. */
export const BUTTON_R_MAX = 84;
export const BUTTON_PAD = 12;
export const BUTTON_GAP = 72;
/** Cells are at least this many design px at 9 × 9 in every arrangement (GDD §12). */
export const CELL_MIN = 80;
/**
 * Progress dots (D75): one per room, in the top band (a row) or the HUD column (rows of
 * DOT_COLUMNS), radius up to DOT_R_MAX (10 CSS px on a 360 px wide phone, after the design
 * critique; was 22) and never under DOT_R_MIN, DOT_GAP apart.
 */
export const DOT_R_MAX = 30;
export const DOT_R_MIN = 10;
export const DOT_GAP = 14;
export const DOT_COLUMNS = 3;
/** A filled dot's dark ring, as a share of its radius, and its pop. */
export const DOT_RING = 0.28;
export const DOT_POP_SCALE = 1.35;
/**
 * An empty dot shows its swatch faint; every dot has a thin light rim (DOT_RIM design px, ≥ 3:1
 * against the page), so the rooms can be counted whether their dots are full or not.
 */
export const DOT_EMPTY_ALPHA = 0.4;
export const DOT_RIM = 4;
export const COLOR_DOT_RIM = 0x6c7590;
/**
 * A dot's wallpaper marks, as shares of its radius: the width of a stripe, the size of a dot or a
 * check, and how far from the middle they sit (so every mark stays inside the dot).
 */
export const DOT_PATTERN_LINE = 0.14;
export const DOT_PATTERN_MARK = 0.16;
export const DOT_PATTERN_OFFSET = 0.45;
/**
 * Walls between rooms and around the house: this share of a cell, within [WALL_MIN, WALL_MAX]
 * design px (≥ 4 CSS px on a 360 px wide phone, D71); the grid inside a room is GRID_LINE px, a
 * third of the thinnest wall at most.
 */
export const WALL_SHARE = 0.09;
export const WALL_MIN = 12;
export const WALL_MAX = 18;
export const GRID_LINE = 2;

// ---- Input and session (GDD §3.1) -------------------------------------------------------------

/** A pointer that moves this far (design px) from where it went down drags instead of tapping. */
export const DRAG_PX = 24;
/** The graybox hint is free with this cooldown, in seconds of unpaused play (D32). */
export const HINT_COOLDOWN_S = 90;
/**
 * The hint's first press shows its reason this long (D74): the target room pulses once every
 * HINT_PULSE_MS (slower than 3 a second, D23); a wrong ghost trembles HINT_TREMBLE_SWINGS swings.
 */
export const HINT_REASON_MS = 2000;
export const HINT_PULSE_MS = 500;
export const HINT_TREMBLE_SWINGS = 4;
/** The house in progress is written this long after the last change (debounced, GDD §9). */
export const SAVE_DEBOUNCE_MS = 400;
/** Milliseconds in a second (the scene ticks in ms, the save keeps seconds). */
export const MS_PER_S = 1000;
/** Seconds in a minute (the solve time shows as m:ss). */
export const S_PER_MIN = 60;

// ---- Graybox look (Epic 3; Gate B tune round 1, D71; the art arrives in Epic 4) ---------------

/**
 * Room floors (D71): a light, muted "old wallpaper" house at night (the page around it stays
 * dark). By lightness level (L* 89, 79, 69, 59), then hue family (dusty rose, sand, slate: the
 * triple that stays apart best for a deuteranope); chroma ≤ 20, so it reads as a lived-in house,
 * never as a nursery or a coloured grid. Every room of a house gets a floor of its own, and
 * neighbouring rooms differ by a level (src/game/look.ts); tests/contrast.test.ts holds the floors
 * F1–F7 for every value here.
 */
export const COLOR_FLOORS: readonly (readonly number[])[] = [
  [0xf1d9e3, 0xefdccf, 0xc9e4ed],
  [0xdcbbc8, 0xd8bfac, 0xa4cad5],
  [0xc49eae, 0xc0a38d, 0x81b0be],
  [0xac8394, 0xa78870, 0x6196a5],
];
/** Each floor's wallpaper ink, in the same order: its L* 13 lower, a touch more chroma. */
export const COLOR_FLOOR_INKS: readonly (readonly number[])[] = [
  [0xd3b3c0, 0xd0b7a5, 0x9cc1ce],
  [0xbe95a6, 0xb99b83, 0x76a8b6],
  [0xa6798d, 0xa18066, 0x528fa0],
  [0x8f5f74, 0x88664a, 0x2e7688],
];
/** The thin grid inside a room: the wall colour, faint, so it never reads as a wall. */
export const GRID_ALPHA = 0.18;
/** A settled room: a dashed teal ring inside its walls and a faint teal wash over its floor. */
export const COLOR_SETTLED_RING = 0x004c45;
export const COLOR_SETTLED_WASH = 0x7cd6ca;
export const SETTLED_WASH_ALPHA = 0.15;
/**
 * Lit cells: thin amber stripes outlined in brown over the unchanged wallpaper (the light cue, a
 * geometry of its own next to the settled ring). The stripes cover HATCH_SHARE of a lit cell's
 * area and their outline HATCH_EDGE_SHARE (≤ 12 % in all), so a lit cell keeps its room's colour.
 */
export const COLOR_HATCH = 0xffca46;
export const COLOR_HATCH_EDGE = 0x5a2b0e;
export const HATCH_SHARE = 0.08;
export const HATCH_EDGE_SHARE = 0.03;
/** Outlines on the floors: the bookshelf in the wall colour, the lamp in the hatch's brown. */
export const COLOR_FURNITURE_EDGE = 0x1c2025;
export const COLOR_LAMP_EDGE = 0x5a2b0e;

/**
 * Wallpaper geometry, as shares of a cell: the motif spacing, a stripe's width, half a small
 * diamond's diagonal (about the area of a dot of radius 0.05; diamonds, not polka dots, after the
 * design critique: dots on the palest rose read as a nursery) and a check's side.
 */
export const PATTERN_STEP = 0.25;
export const PATTERN_LINE = 0.035;
export const PATTERN_DIAMOND = 0.065;
export const PATTERN_CHECK = 0.08;
/** Walls: dark ink, ≥ 4.5:1 against every floor in every state (F1). */
export const COLOR_WALL = 0x1c2025;
/**
 * The settled ring's line: its width, its inset from the wall's inner edge (so it never reads as a
 * wall), and its dashes, in design px.
 */
export const RING_WIDTH = 4;
export const RING_INSET = 4;
export const RING_DASH = 14;
export const RING_GAP = 9;
/**
 * Furniture is a bookshelf (D71): an upright case in shares of its cell, SHELF_ROWS compartments of
 * book spines (widths and heights in turn), so it reads as furniture, never as a box or a hole.
 */
export const SHELF = {
  left: 0.2,
  right: 0.8,
  top: 0.08,
  bottom: 0.94,
  edge: 0.05,
  side: 0.05,
  gap: 0.015,
  rows: 3,
  bookWidths: [0.09, 0.07, 0.1, 0.08, 0.06],
  bookHeights: [0.8, 0.68, 0.74, 0.62, 0.78],
} as const;
export const COLOR_SHELF = 0x7a5236;
export const COLOR_BOOKS: readonly number[] = [0x9c3d33, 0x2f4f6b, 0xc79a3a, 0x55663a];
/** A lamp: an amber disc with a brown outline and rays, the colours of the light it casts. */
export const LAMP_DISC = 0.17;
export const LAMP_EDGE = 0.04;
export const LAMP_RAY_IN = 0.24;
export const LAMP_RAY_OUT = 0.38;
export const LAMP_RAY_WIDTH = 0.05;
export const LAMP_RAYS = 8;
/** The solved house gets a warm frame; its rooms flash in turn at this opacity. */
export const COLOR_SOLVED_FRAME = 0xffe3a0;
export const WIN_FLASH_ALPHA = 0.45;
/** Marks: a small dark dot, far smaller than a ghost and without a face (F4). */
export const COLOR_MARK = 0x2e353d;
export const MARK_SHARE = 0.1;
/** The dotted sight line between two ghosts that see each other: dark indigo ink (F6). */
export const COLOR_SEEN_LINE = 0x33306b;
export const SEEN_LINE_ALPHA = 1;
export const SEEN_LINE_FLASH_ALPHA = 1;
export const SEEN_DOT = 0.045;
export const SEEN_DOT_STEP = 0.2;
/** The glance of a calm ghost: dots along its row and column, up to the first blocker (F6). */
export const COLOR_GLANCE = 0x2e353d;
export const GLANCE_ALPHA = 1;
/**
 * The hint's reason (D74): every cell outside the lines and rooms that force the next ghost goes
 * dim under a veil of the page colour, so those stay bright; the target room pulses light; a wrong
 * ghost gets a dashed outline in the marks' ink (F6).
 */
export const HINT_VEIL_ALPHA = 0.45;
export const COLOR_HINT_PULSE = 0xffffff;
export const HINT_PULSE_ALPHA = 0.4;

/** Ghosts: their size as a share of a cell, and the texture they are drawn into. */
export const GHOST_SHARE = 0.86;
export const GHOST_TEXTURE = 128;
export const COLOR_GHOST_CALM = 0xf3f6fc;
export const COLOR_GHOST_SEEN = 0xb4c1f5;
export const COLOR_GHOST_LIT = 0xffdc96;
export const COLOR_GHOST_OUTLINE = 0x0d1019;
export const COLOR_GHOST_EYES = 0x161b29;
export const COLOR_GHOST_HANDS = 0xffffff;
export const COLOR_CAP = 0x7d6aa8;
export const COLOR_CAP_TIP = 0xf3f6fc;
/**
 * The graybox ghost, in shares of its texture: a round head over a sheet with a wavy hem, room
 * above for the nightcap. Calm: two dark eyes on a white sheet. Seen: a lavender sheet, both hands
 * (white mittens with finger lines) across the eyes, shiver ticks beside it. Lit: a yellow sheet,
 * squinting eyes under a flat shading hand. A resident wears a nightcap with a white cuff and a
 * pompom, never over the eyes or hands. Each state is a texture of its own (CLAUDE.md, Rendering),
 * and they differ in shape and lightness as well as colour.
 */
export const GHOST_SHAPE = {
  headY: 0.5,
  headR: 0.28,
  hemY: 0.93,
  hemWaves: 3,
  hemDepth: 0.06,
  outline: 0.03,
  eyeY: 0.5,
  eyeDX: 0.11,
  eyeRX: 0.055,
  eyeRY: 0.085,
  /** Seen: arms raised from the sides to mittens over the eyes, finger lines, shiver ticks. */
  armX: 0.26,
  armY: 0.72,
  armWidth: 0.08,
  armInner: 0.045,
  mittenDX: 0.085,
  mittenRX: 0.115,
  mittenRY: 0.09,
  fingerLen: 0.045,
  fingerGap: 0.04,
  fingerWidth: 0.02,
  tickX: 0.4,
  tickLen: 0.1,
  tickWidth: 0.035,
  /** Lit: squint strokes, and one hand held flat above them. */
  squintY: 0.53,
  squintLen: 0.065,
  squintWidth: 0.035,
  shadeY: 0.43,
  shadeRX: 0.18,
  shadeRY: 0.05,
  /** Nightcap: base corners on the head, the tip, the cuff, the pompom. */
  capLeftX: 0.25,
  capLeftY: 0.36,
  capRightX: 0.75,
  capRightY: 0.33,
  capTipX: 0.88,
  capTipY: 0.07,
  capCuff: 0.075,
  capTipR: 0.065,
} as const;

/** HUD buttons: the disc, its rim, the icons' stroke, and the dimmed look of a button at rest. */
export const COLOR_BUTTON = 0x2a3044;
export const COLOR_BUTTON_RIM = 0x59617c;
export const COLOR_BUTTON_ICON = 0xe9edf7;
export const COLOR_COOLDOWN = 0x10131c;
export const BUTTON_RIM = 0.06;
export const BUTTON_ICON_STROKE = 0.1;
export const BUTTON_DISABLED_ALPHA = 0.35;
/**
 * Icon geometry in shares of the button radius: undo is an arc over the top from the left
 * (angles in half turns, clockwise from the right) with an arrowhead pointing down at its left end;
 * hint is a bulb on a small base. No text, no stars (CLAUDE.md rule 8).
 */
export const ICON_SHAPE = {
  arcR: 0.42,
  arcFrom: 1,
  arcTo: 2.25,
  headLen: 0.2,
  bulbR: 0.3,
  bulbY: -0.12,
  baseW: 0.26,
  baseY: 0.26,
  baseH: 0.14,
} as const;
/** The cooldown shade over the hint button. */
export const COOLDOWN_ALPHA = 0.75;
/** The platform pause dims everything under this cover (CLAUDE.md rule 4). */
export const DIM_ALPHA = 0.6;

// ---- Graybox motion (GDD §3a values; Epic 4 moves them to src/game/feel.ts and adds the rest) ---

/** Place: pop in, scale 0 → POP_SCALE → 1. */
export const POP_MS = 120;
export const POP_SCALE = 1.2;
/** Relocate: glide to the new cell, ease in-out. */
export const GLIDE_MS = 220;
/** Remove: float up and fade. */
export const REMOVE_MS = 180;
export const REMOVE_RISE = 20;
/**
 * Seen: shiver ±SHIVER_PX in SHIVER_SWINGS swings, 60 ms in all, and never again (D73): the pose
 * and the dotted line carry the state while the conflict lasts.
 */
export const SHIVER_PX = 3;
export const SHIVER_SWING_MS = 30;
export const SHIVER_SWINGS = 2;
/** The sight line between the two ghosts flashes twice: on, off, on (D23, under 3 a second). */
export const SEEN_LINE_ON_MS = 100;
export const SEEN_LINE_OFF_MS = 240;
/** Lit: the lamp's lit cells flash warm once. */
export const LIT_FLASH_MS = 200;
export const LIT_FLASH_ALPHA = 0.55;
/** Calm: the glance rays show and fade (GDD §3a: 250 ms; audit 2026-10-21, DÜŞÜK 10). */
export const GLANCE_MS = 250;
/** A room settles (its ring and wash come in) or cools (they fade). */
export const GLOW_IN_MS = 250;
export const GLOW_OUT_MS = 200;
/**
 * A room settles (D73): its ghost bobs, up to SETTLE_SCALE and SETTLE_HOP_PX up and back in
 * SETTLE_MS, farther and longer than any failure motion; its progress dot pops in DOT_POP_MS.
 */
export const SETTLE_SCALE = 1.15;
export const SETTLE_HOP_PX = 8;
export const SETTLE_MS = 160;
export const DOT_POP_MS = 120;
/** A mark pops in or shrinks away. */
export const MARK_MS = 60;
/** A tap on furniture, a lamp or a resident: a small nudge. */
export const NUDGE_PX = 2;
export const NUDGE_MS = 80;
/** A carried ghost is lifted (D72): drawn this much larger while it follows the pointer. */
export const CARRY_SCALE = 1.1;
/**
 * The finale of a solved house (GDD §3a, D73), about 2 s: a hit stop, the rooms flashing in room-id
 * order every min(STEP_MAX, SWEEP / rooms) ms, every ghost hopping and turning to the camera, then
 * waving twice, the solve-time digits ticking in; the next house slides in at WIN_BEAT_MS. A tap
 * skips it from WIN_SKIP_FROM_MS on: earlier taps are ignored, so the last placement's tap never
 * skips the payoff.
 */
export const WIN_HIT_STOP_MS = 50;
export const WIN_STEP_MAX_MS = 90;
export const WIN_SWEEP_MS = 700;
export const WIN_FLASH_MS = 160;
export const WIN_HOP_PX = 14;
export const WIN_HOP_MS = 180;
/** The turn to the camera: the sheet narrows to this share and back during the hop. */
export const WIN_TURN_SCALE = 0.8;
export const WIN_WAVES = 2;
export const WIN_WAVE_MS = 200;
/** A wave tips the ghost this many degrees each way. */
export const WIN_WAVE_DEG = 12;
export const WIN_DIGITS_MS = 300;
export const WIN_BEAT_MS = 1650;
export const WIN_SKIP_FROM_MS = 600;
/**
 * The solve-time digits (m:ss), where the progress dots were (they give way as the digits tick
 * in): their size in design px, font and colour, on the dark page.
 */
export const WIN_DIGITS_SIZE = 72;
export const WIN_DIGITS_FONT = 'sans-serif';
export const COLOR_WIN_DIGITS = '#ffe3a0';
/** The next house slides in. */
export const SLIDE_MS = 350;

// ---- Teaching demonstrations (docs/gate-b-round1.md §3, D70) -----------------------------------

/** The first house of sight, of rows and columns, of blocks and of lamps: each shows its rule. */
export const DEMO_SIGHT_HOUSE = 1;
export const DEMO_LINES_HOUSE = 2;
export const DEMO_BLOCK_HOUSE = 9;
export const DEMO_LAMP_HOUSE = 17;
/**
 * The resident blinks awake; dotted trails run along its row and column (shorter in house 2);
 * house 17's lamp sweeps its light out, then a see-through copy of the resident steps into it.
 * Input stays closed for the whole demonstration, never longer than DEMO_MAX_MS; a tap skips it.
 */
export const DEMO_BLINK_MS = 200;
export const DEMO_TRAIL_MS = 900;
export const DEMO_TRAIL_SHORT_MS = 600;
export const DEMO_BEAM_MS = 500;
export const DEMO_COPY_MS = 700;
export const DEMO_MAX_MS = 1500;
/** The see-through copy's opacity. */
export const DEMO_COPY_ALPHA = 0.55;
/** A trail runs out in this share of its time, then fades; the copy steps in and back in this share. */
export const DEMO_RUN_SHARE = 0.6;
export const DEMO_STEP_SHARE = 0.35;
/** The blink squashes the resident to this height; a bump or a lamp switching on pops this much. */
export const DEMO_BLINK_SCALE = 0.7;
export const DEMO_BUMP_SCALE = 1.12;
/** The light and the copy fade out over the demonstration's last DEMO_FADE_MS. */
export const DEMO_FADE_MS = 200;
