/**
 * Design-space constants (GDD §12, CLAUDE.md rule 5). All positions are in design px: the short
 * side of the canvas is always DESIGN_SHORT, the long side follows the window aspect and is
 * clamped to DESIGN_LONG_MAX.
 */
export const DESIGN_SHORT = 1080;
/** Long side cap (≈ 20:9). Taller or wider viewports get letterboxed by Scale.FIT. */
export const DESIGN_LONG_MAX = 2400;

/** Page and canvas background behind everything (also index.html and the Phaser config). */
export const COLOR_PAGE = 0x161a26;
export const COLOR_PAGE_CSS = '#161a26';

// ---- Boot screen (GDD §11 screen 1: a dark house silhouette and a thin bar, no text) ----------

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

// ---- Game stub (Epic 0: a placeholder board until the graybox of Epic 3) ---------------------

/** The placeholder board: this many cells a side, this share of the short side, its colours. */
export const STUB_BOARD_CELLS = 5;
export const STUB_BOARD_SHARE = 0.8;
export const STUB_GRID_LINE = 4;
export const COLOR_STUB_BOARD = 0x262b3b;
export const COLOR_STUB_GRID = 0x3a4157;
