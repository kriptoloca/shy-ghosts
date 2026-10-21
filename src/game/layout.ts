import {
  BOOT_BAR_GAP,
  BOOT_BAR_H,
  BOOT_BAR_W,
  BOOT_HOUSE_H,
  BOOT_HOUSE_W,
  BOOT_ROOF_H,
  BOOT_STEPS,
  DESIGN_LONG_MAX,
  DESIGN_SHORT,
} from '../config';

/**
 * Screen geometry in design px (GDD §12, CLAUDE.md rule 5). Epic 0 holds the design size only;
 * `computeLayout` (HUD bands, the board square, the cell size) arrives with the graybox (Epic 3).
 */
export interface Size {
  width: number;
  height: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Design canvas size for a viewport (CLAUDE.md rule 5): short side DESIGN_SHORT, long side follows
 * the viewport aspect, clamped to [DESIGN_SHORT, DESIGN_LONG_MAX]. Viewports past the clamp are
 * letterboxed by Scale.FIT.
 */
export function designSize(viewW: number, viewH: number): Size {
  const w = Math.max(1, viewW);
  const h = Math.max(1, viewH);
  if (w >= h) {
    const long = clamp(Math.round(DESIGN_SHORT * (w / h)), DESIGN_SHORT, DESIGN_LONG_MAX);
    return { width: long, height: DESIGN_SHORT };
  }
  const long = clamp(Math.round(DESIGN_SHORT * (h / w)), DESIGN_SHORT, DESIGN_LONG_MAX);
  return { width: DESIGN_SHORT, height: long };
}

/** The boot screen's sizes (config.ts), as a parameter so the tests can vary them. */
export interface BootSizes {
  houseW: number;
  houseH: number;
  roofH: number;
  barGap: number;
  barW: number;
  barH: number;
  steps: number;
}

export const BOOT_SIZES: BootSizes = {
  houseW: BOOT_HOUSE_W,
  houseH: BOOT_HOUSE_H,
  roofH: BOOT_ROOF_H,
  barGap: BOOT_BAR_GAP,
  barW: BOOT_BAR_W,
  barH: BOOT_BAR_H,
  steps: BOOT_STEPS,
};

/** Where the boot screen draws (GDD §11 screen 1); every x is a left edge, every y a top. */
export interface BootLayout {
  house: { x: number; y: number; width: number; height: number };
  /** The roof's apex; its base is the house's top edge. */
  roofTop: { x: number; y: number };
  /** The bar's track and, from the same left edge, its fill as far as the boot got. */
  track: { x: number; y: number; width: number; height: number };
  fill: { x: number; y: number; width: number; height: number };
}

/**
 * The boot screen: the silhouette centred, the bar below it, filled to `done` of `steps`
 * (at least 1 px wide, so it shows from the start).
 */
export function bootLayout(size: Size, done: number, b: BootSizes = BOOT_SIZES): BootLayout {
  const cx = size.width / 2;
  const base = (size.height + b.houseH) / 2;
  const left = cx - b.houseW / 2;
  const top = base - b.houseH;
  const barX = cx - b.barW / 2;
  const barY = base + b.barGap - b.barH / 2;
  return {
    house: { x: left, y: top, width: b.houseW, height: b.houseH },
    roofTop: { x: cx, y: top - b.roofH },
    track: { x: barX, y: barY, width: b.barW, height: b.barH },
    fill: { x: barX, y: barY, width: Math.max(1, (b.barW * done) / b.steps), height: b.barH },
  };
}
