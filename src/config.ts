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
 * Walls between rooms: this share of a cell, within [WALL_MIN, WALL_MAX] px; the grid inside a
 * room is GRID_LINE px, always thinner than a wall.
 */
export const WALL_SHARE = 0.09;
export const WALL_MIN = 7;
export const WALL_MAX = 14;
export const GRID_LINE = 2;

// ---- Input and session (GDD §3.1) -------------------------------------------------------------

/** A pointer that moves this far (design px) from where it went down drags instead of tapping. */
export const DRAG_PX = 24;
/** The graybox hint is free with this cooldown, in seconds of unpaused play (D32). */
export const HINT_COOLDOWN_S = 90;
/** The house in progress is written this long after the last change (debounced, GDD §9). */
export const SAVE_DEBOUNCE_MS = 400;
/** Milliseconds in a second (the scene ticks in ms, the save keeps seconds). */
export const MS_PER_S = 1000;

// ---- Graybox look (Epic 3; the art arrives in Epic 4) -----------------------------------------

/**
 * Room floors: four lightness steps of one slate hue. Rooms differ by pattern and lightness, never
 * by hue alone (CLAUDE.md, Rendering), so the house reads as a floor plan, not a coloured grid.
 */
export const COLOR_ROOM_TONES: readonly number[] = [0x262c3d, 0x343c53, 0x434c68, 0x535d7c];
/** Wallpaper lines and dots: each floor tone moved 16 % of the way toward white. */
export const COLOR_ROOM_PATTERNS: readonly number[] = [0x494e5c, 0x555b6e, 0x616980, 0x6e7791];
/** Wallpaper geometry, as shares of a cell: stripe and dot spacing, line width, dot radius. */
export const PATTERN_STEP = 0.25;
export const PATTERN_LINE = 0.035;
export const PATTERN_DOT = 0.05;
export const COLOR_GRID = 0x1b2030;
export const COLOR_WALL = 0x07090f;
/** Furniture: a dark block inset in its cell, with a lighter rim so it never reads as a wall. */
export const COLOR_FURNITURE = 0x14171f;
export const COLOR_FURNITURE_RIM = 0x6a7189;
export const FURNITURE_INSET = 0.12;
export const FURNITURE_RIM = 0.05;
export const FURNITURE_CORNER = 0.12;
/** A lamp: a warm disc with rays on a dark cell. */
export const COLOR_LAMP = 0xf6c665;
export const COLOR_LAMP_BASE = 0x14171f;
export const LAMP_DISC = 0.17;
export const LAMP_RAY_IN = 0.24;
export const LAMP_RAY_OUT = 0.38;
export const LAMP_RAY_WIDTH = 0.05;
export const LAMP_RAYS = 8;
/** Lit cells: a warm wash (a fill, not a tint). */
export const COLOR_LIT = 0xf7c35a;
export const LIT_ALPHA = 0.36;
/** A settled room glows teal; the solved house gets a warm frame. */
export const COLOR_GLOW = 0x4fd3c1;
export const GLOW_ALPHA = 0.45;
export const COLOR_SOLVED_FRAME = 0xffe3a0;
/** Marks: a small grey dot, far smaller than a ghost and without a face. */
export const COLOR_MARK = 0xb3bbcf;
export const MARK_SHARE = 0.1;
/** The dotted sight line between two ghosts that see each other. */
export const COLOR_SEEN_LINE = 0xe2e8ff;
export const SEEN_LINE_ALPHA = 0.55;
export const SEEN_LINE_FLASH_ALPHA = 1;
export const SEEN_DOT = 0.045;
export const SEEN_DOT_STEP = 0.2;
/** The glance of a calm ghost: faint dots along its row and column, up to the first blocker. */
export const COLOR_GLANCE = 0xffffff;
export const GLANCE_ALPHA = 0.5;

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
/** Seen: shiver ±SHIVER_PX in SHIVER_SWINGS swings; again every SHIVER_AGAIN_MS at ±SHIVER_AGAIN_PX. */
export const SHIVER_PX = 4;
export const SHIVER_SWING_MS = 40;
export const SHIVER_SWINGS = 3;
export const SHIVER_AGAIN_MS = 1500;
export const SHIVER_AGAIN_PX = 2;
/** The sight line between the two ghosts flashes twice: on, off, on (D23, under 3 a second). */
export const SEEN_LINE_ON_MS = 100;
export const SEEN_LINE_OFF_MS = 240;
/** Lit: the lamp's lit cells flash warm once. */
export const LIT_FLASH_MS = 200;
export const LIT_FLASH_ALPHA = 0.55;
/** Calm: the glance rays show and fade (GDD §3a: 250 ms; audit 2026-10-21, DÜŞÜK 10). */
export const GLANCE_MS = 250;
/** A room settles (glows) or cools. */
export const GLOW_IN_MS = 250;
export const GLOW_OUT_MS = 200;
/** A mark pops in or shrinks away. */
export const MARK_MS = 60;
/** A tap on furniture, a lamp or a resident: a small nudge. */
export const NUDGE_PX = 2;
export const NUDGE_MS = 80;
/** The win beat: rooms flash in room-id order every min(STEP_MAX, SWEEP / rooms) ms, the ghosts hop. */
export const WIN_STEP_MAX_MS = 90;
export const WIN_SWEEP_MS = 700;
export const WIN_FLASH_MS = 160;
export const WIN_HOP_PX = 14;
export const WIN_HOP_MS = 180;
export const WIN_BEAT_MS = 1000;
/** The next house slides in. */
export const SLIDE_MS = 350;
