import type Phaser from 'phaser';
import {
  BADGE_RIM_SHARE,
  COLOR_BADGE,
  COLOR_BOOKS,
  COLOR_CAP,
  COLOR_CAP_TIP,
  COLOR_DOT_RIM,
  COLOR_FURNITURE_EDGE,
  COLOR_GHOST_CALM,
  COLOR_GHOST_EYES,
  COLOR_GHOST_HANDS,
  COLOR_GHOST_LIT,
  COLOR_GHOST_OUTLINE,
  COLOR_GHOST_SEEN,
  COLOR_HATCH,
  COLOR_LAMP_EDGE,
  COLOR_MARK,
  COLOR_SETTLED_RING,
  COLOR_SHELF,
  COLOR_SOLVED_FRAME,
  CONTENT_EYE_R,
  CONTENT_SMILE_R,
  CONTENT_SMILE_Y,
  CONTENT_STROKE,
  DOT_HALO,
  DOT_TEXTURE,
  DOT_TICK,
  DOT_TICK_STROKE,
  GHOST_SHAPE as G,
  GHOST_TEXTURE,
  HAND_SHAPE as HAND,
  LIGHT_RING_TEXTURE,
  MARK_HALO,
  LAMP_DISC,
  LAMP_EDGE,
  LAMP_RAYS,
  LAMP_RAY_IN,
  LAMP_RAY_OUT,
  LAMP_RAY_WIDTH,
  MARK_SHARE,
  PIXEL_TEXTURE,
  SEEN_DOT,
  SHELF,
  WIN_RING_STROKE,
} from '../config';
import type { GhostStatus } from '../core/state';

/**
 * The graybox's drawn textures (TASKS.md Epic 3; CLAUDE.md, Rendering): every state a player must
 * tell apart is a texture of its own, never a runtime tint. Calm: open eyes on a white sheet.
 * Content (a calm ghost in a settled room, D84): eyes closed in a smile. Seen: both hands over the
 * eyes, shiver ticks at the sides, a cool sheet. Lit: squinting under a shading hand, a warm
 * sheet. A resident wears a nightcap (an overlay). Furniture is a bookshelf (an upright case with
 * shelves and book spines), a lamp an amber disc with a brown outline and rays, a mark a small
 * dark dot without a face (D71). Marks and dots carry a ring of the floor they stand on (D85), so
 * they come one texture per floor colour; plain rectangles (the settled ring, flashes, the veils)
 * are a small texture of one colour, scaled. Nothing drawn on the board stays a Graphics object:
 * WebGL would build it again every frame (round 1's code audit, ORTA 4).
 */
export const GHOST_KEY: Record<GhostStatus, string> = {
  calm: 'gb-ghost-calm',
  seen: 'gb-ghost-seen',
  lit: 'gb-ghost-lit',
};
export const CONTENT_KEY = 'gb-ghost-content';
export const CAP_KEY = 'gb-cap';
export const FURNITURE_KEY = 'gb-furniture';
export const LAMP_KEY = 'gb-lamp';
/** The finale's rising tick (warm, outlined), its ring of light, and the demonstration's hand. */
export const TICK_KEY = 'gb-tick';
export const LIGHT_RING_KEY = 'gb-light-ring';
export const HAND_KEY = 'gb-hand';

const S = GHOST_TEXTURE;
const HALF = S / 2;
const FULL_TURN = Math.PI * 2;

/** The sheet: a round head over a body that ends in a wavy hem. */
function sheet(g: Phaser.GameObjects.Graphics, fill: number): void {
  const headY = G.headY * S;
  const r = G.headR * S;
  const hemY = G.hemY * S;
  const waveW = (2 * r) / G.hemWaves;
  const draw = (): void => {
    g.beginPath();
    g.arc(HALF, headY, r, Math.PI, 0, false);
    g.lineTo(HALF + r, hemY);
    for (let k = 0; k < G.hemWaves; k++) {
      const x = HALF + r - k * waveW;
      g.lineTo(x - waveW / 2, hemY - G.hemDepth * S);
      g.lineTo(x - waveW, hemY);
    }
    g.lineTo(HALF - r, headY);
    g.closePath();
  };
  g.fillStyle(fill, 1);
  draw();
  g.fillPath();
  g.lineStyle(G.outline * S, COLOR_GHOST_OUTLINE, 1);
  draw();
  g.strokePath();
}

function eyes(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(COLOR_GHOST_EYES, 1);
  for (const side of [-1, 1]) {
    g.fillEllipse(HALF + side * G.eyeDX * S, G.eyeY * S, 2 * G.eyeRX * S, 2 * G.eyeRY * S);
  }
}

/** An arm raised from the side of the sheet to (x, y): white with a dark edge. */
function arm(g: Phaser.GameObjects.Graphics, fromX: number, x: number, y: number): void {
  g.lineStyle(G.armWidth * S, COLOR_GHOST_OUTLINE, 1);
  g.lineBetween(fromX, G.armY * S, x, y);
  g.lineStyle(G.armInner * S, COLOR_GHOST_HANDS, 1);
  g.lineBetween(fromX, G.armY * S, x, y);
}

function mitten(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(COLOR_GHOST_HANDS, 1);
  g.fillEllipse(x, y, 2 * G.mittenRX * S, 2 * G.mittenRY * S);
  g.lineStyle(G.fingerWidth * S, COLOR_GHOST_OUTLINE, 1);
  g.strokeEllipse(x, y, 2 * G.mittenRX * S, 2 * G.mittenRY * S);
  // finger lines from the top edge down
  const top = y - G.mittenRY * S;
  for (const k of [-1, 0, 1]) {
    const fx = x + k * G.fingerGap * S;
    g.lineBetween(fx, top + G.fingerWidth * S, fx, top + G.fingerLen * S);
  }
}

/** Eyes closed in two arcs and a small smile: content (D84). */
function drawContent(g: Phaser.GameObjects.Graphics): void {
  sheet(g, COLOR_GHOST_CALM);
  g.lineStyle(CONTENT_STROKE * S, COLOR_GHOST_EYES, 1);
  for (const side of [-1, 1]) {
    g.beginPath();
    g.arc(HALF + side * G.eyeDX * S, G.eyeY * S, CONTENT_EYE_R * S, Math.PI, 0, false);
    g.strokePath();
  }
  g.beginPath();
  g.arc(HALF, CONTENT_SMILE_Y * S, CONTENT_SMILE_R * S, 0, Math.PI, false);
  g.strokePath();
}

function drawGhost(g: Phaser.GameObjects.Graphics, state: GhostStatus): void {
  if (state === 'calm') {
    sheet(g, COLOR_GHOST_CALM);
    eyes(g);
    return;
  }
  if (state === 'seen') {
    sheet(g, COLOR_GHOST_SEEN);
    for (const side of [-1, 1]) {
      arm(g, HALF + side * G.armX * S, HALF + side * G.mittenDX * S, G.eyeY * S);
    }
    for (const side of [-1, 1]) mitten(g, HALF + side * G.mittenDX * S, G.eyeY * S);
    // shiver ticks beside the sheet
    g.lineStyle(G.tickWidth * S, COLOR_GHOST_OUTLINE, 1);
    for (const side of [-1, 1]) {
      const x = HALF + side * G.tickX * S;
      g.lineBetween(x, (G.eyeY - G.tickLen) * S, x, (G.eyeY + G.tickLen) * S);
    }
    return;
  }
  sheet(g, COLOR_GHOST_LIT);
  // squinting eyes, > <, under a hand held flat above them
  g.lineStyle(G.squintWidth * S, COLOR_GHOST_EYES, 1);
  for (const side of [-1, 1]) {
    const x = HALF + side * G.eyeDX * S;
    const y = G.squintY * S;
    const d = G.squintLen * S;
    const tip = x - side * d;
    g.lineBetween(x + side * d, y - d / 2, tip, y);
    g.lineBetween(x + side * d, y + d / 2, tip, y);
  }
  arm(g, HALF + G.armX * S, HALF + G.shadeRX * S, G.shadeY * S);
  g.fillStyle(COLOR_GHOST_HANDS, 1);
  g.fillEllipse(HALF, G.shadeY * S, 2 * G.shadeRX * S, 2 * G.shadeRY * S);
  g.lineStyle(G.fingerWidth * S, COLOR_GHOST_OUTLINE, 1);
  g.strokeEllipse(HALF, G.shadeY * S, 2 * G.shadeRX * S, 2 * G.shadeRY * S);
}

function drawCap(g: Phaser.GameObjects.Graphics): void {
  const lx = G.capLeftX * S;
  const ly = G.capLeftY * S;
  const rx = G.capRightX * S;
  const ry = G.capRightY * S;
  const tx = G.capTipX * S;
  const ty = G.capTipY * S;
  g.fillStyle(COLOR_CAP, 1);
  g.fillTriangle(lx, ly, rx, ry, tx, ty);
  g.lineStyle(G.outline * S, COLOR_GHOST_OUTLINE, 1);
  g.strokeTriangle(lx, ly, rx, ry, tx, ty);
  // the cuff along the base, then the pompom
  g.lineStyle(G.capCuff * S, COLOR_CAP_TIP, 1);
  g.lineBetween(lx, ly, rx, ry);
  g.fillStyle(COLOR_CAP_TIP, 1);
  g.fillCircle(tx, ty, G.capTipR * S);
  g.lineStyle(G.outline * S, COLOR_GHOST_OUTLINE, 1);
  g.strokeCircle(tx, ty, G.capTipR * S);
}

/** A bookshelf: an upright case, book spines on every shelf, the case and its boards in ink. */
function drawFurniture(g: Phaser.GameObjects.Graphics): void {
  const x0 = SHELF.left * S;
  const x1 = SHELF.right * S;
  const y0 = SHELF.top * S;
  const y1 = SHELF.bottom * S;
  const rowH = (y1 - y0) / SHELF.rows;
  g.fillStyle(COLOR_SHELF, 1);
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let row = 0; row < SHELF.rows; row++) {
    const floor = y0 + (row + 1) * rowH;
    let x = x0 + SHELF.side * S;
    for (let k = 0; ; k++) {
      const w = (SHELF.bookWidths[(k + row) % SHELF.bookWidths.length] as number) * S;
      if (x + w > x1 - SHELF.side * S) break;
      const h = (SHELF.bookHeights[(k + 2 * row) % SHELF.bookHeights.length] as number) * rowH;
      g.fillStyle(COLOR_BOOKS[(k + row) % COLOR_BOOKS.length] as number, 1);
      g.fillRect(x, floor - h, w, h);
      x += w + SHELF.gap * S;
    }
  }
  g.lineStyle(SHELF.edge * S, COLOR_FURNITURE_EDGE, 1);
  for (let row = 1; row < SHELF.rows; row++)
    g.lineBetween(x0, y0 + row * rowH, x1, y0 + row * rowH);
  g.strokeRect(x0, y0, x1 - x0, y1 - y0);
}

/** A lamp: rays, then an amber disc with a brown outline (the colours of its light, D71). */
function drawLamp(g: Phaser.GameObjects.Graphics): void {
  g.lineStyle(LAMP_RAY_WIDTH * S, COLOR_LAMP_EDGE, 1);
  for (let k = 0; k < LAMP_RAYS; k++) {
    const a = (k / LAMP_RAYS) * FULL_TURN;
    g.lineBetween(
      HALF + Math.cos(a) * LAMP_RAY_IN * S,
      HALF + Math.sin(a) * LAMP_RAY_IN * S,
      HALF + Math.cos(a) * LAMP_RAY_OUT * S,
      HALF + Math.sin(a) * LAMP_RAY_OUT * S,
    );
  }
  g.fillStyle(COLOR_HATCH, 1);
  g.fillCircle(HALF, HALF, LAMP_DISC * S);
  g.lineStyle(LAMP_EDGE * S, COLOR_LAMP_EDGE, 1);
  g.strokeCircle(HALF, HALF, LAMP_DISC * S);
}

/** A check mark through `points` (shares of `r` around (cx, cy)), as a thick polyline. */
function check(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
  g.beginPath();
  DOT_TICK.forEach(([x, y], k) => {
    if (k === 0) g.moveTo(cx + x * r, cy + y * r);
    else g.lineTo(cx + x * r, cy + y * r);
  });
  g.strokePath();
}

/** The finale's tick: a warm check mark with a dark outline, readable on every floor. */
function drawTick(g: Phaser.GameObjects.Graphics): void {
  const r = HALF * (1 - DOT_TICK_STROKE);
  g.lineStyle(2 * DOT_TICK_STROKE * S, COLOR_GHOST_OUTLINE, 1);
  check(g, HALF, HALF, r);
  g.lineStyle(DOT_TICK_STROKE * S, COLOR_SOLVED_FRAME, 1);
  check(g, HALF, HALF, r);
}

/** A ring of light, its stroke WIN_RING_STROKE of its diameter; the finale scales it out. */
function drawLightRing(g: Phaser.GameObjects.Graphics): void {
  const w = WIN_RING_STROKE * LIGHT_RING_TEXTURE;
  g.lineStyle(w, COLOR_SOLVED_FRAME, 1);
  g.strokeCircle(LIGHT_RING_TEXTURE / 2, LIGHT_RING_TEXTURE / 2, LIGHT_RING_TEXTURE / 2 - w);
}

/**
 * A hand pointing up with one finger (the drag-to-mark demonstration, D83; shown see-through): a
 * dark outline, then the white palm and finger inside it.
 */
function drawHand(g: Phaser.GameObjects.Graphics): void {
  const shape = (pad: number): void => {
    g.fillRoundedRect(
      HAND.palmX * S + pad,
      HAND.palmY * S + pad,
      HAND.palmW * S - 2 * pad,
      HAND.palmH * S - 2 * pad,
      HAND.round * S,
    );
    g.fillRoundedRect(
      HAND.fingerX * S + pad,
      HAND.fingerY * S + pad,
      HAND.fingerW * S - 2 * pad,
      HAND.fingerH * S,
      (HAND.fingerW * S) / 2 - pad,
    );
  };
  g.fillStyle(COLOR_GHOST_OUTLINE, 1);
  shape(0);
  g.fillStyle(COLOR_GHOST_HANDS, 1);
  shape(HAND.outline * S);
}

/** Makes the graybox textures once per game (scene restarts reuse them). */
export function makeGrayboxTextures(scene: Phaser.Scene): void {
  const make = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void, size = S): void => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({}, false);
    draw(g);
    g.generateTexture(key, size, size);
    g.destroy();
  };
  for (const state of ['calm', 'seen', 'lit'] as const) {
    make(GHOST_KEY[state], (g) => {
      drawGhost(g, state);
    });
  }
  make(CONTENT_KEY, drawContent);
  make(CAP_KEY, drawCap);
  make(FURNITURE_KEY, drawFurniture);
  make(LAMP_KEY, drawLamp);
  make(TICK_KEY, drawTick);
  make(LIGHT_RING_KEY, drawLightRing, LIGHT_RING_TEXTURE);
  make(HAND_KEY, drawHand);
}

/**
 * The texture of a mark on a floor of colour `floor`: a dark dot in a ring of that floor (D85); with
 * another `ink`, the hint's dot of the same shape (D98).
 */
export function markKey(scene: Phaser.Scene, floor: number, ink = COLOR_MARK): string {
  const tag = ink === COLOR_MARK ? '' : `${ink.toString(16)}-`;
  const key = `gb-mark-${tag}${floor.toString(16)}`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(floor, 1);
    g.fillCircle(HALF, HALF, (MARK_SHARE + MARK_HALO) * S);
    g.fillStyle(ink, 1);
    g.fillCircle(HALF, HALF, MARK_SHARE * S);
    g.generateTexture(key, S, S);
    g.destroy();
  }
  return key;
}

/**
 * The texture of one dot of a dotted line (a sight line, a glance, a trail) in `ink` on a floor of
 * colour `floor`, with a ring of that floor (D85). Its texture is the dot and its halo, edge to
 * edge: shown at `dotSize(cell)` design px across.
 */
export function dotKey(scene: Phaser.Scene, ink: number, floor: number): string {
  const key = `gb-dot-${ink.toString(16)}-${floor.toString(16)}`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    const c = DOT_TEXTURE / 2;
    g.fillStyle(floor, 1);
    g.fillCircle(c, c, c);
    g.fillStyle(ink, 1);
    g.fillCircle(c, c, (c * SEEN_DOT) / (SEEN_DOT + DOT_HALO));
    g.generateTexture(key, DOT_TEXTURE, DOT_TEXTURE);
    g.destroy();
  }
  return key;
}

/** A dot's display size, halo included, in design px for a cell of `cell` px. */
export function dotSize(cell: number): number {
  return 2 * (SEEN_DOT + DOT_HALO) * cell;
}

/**
 * The hint's digit badge (D98): a dark disc that reads on every floor, in a light rim that reads on
 * the dark page (the progress dots' rim), drawn into a texture and scaled.
 */
export const BADGE_KEY = 'gb-badge';
export function badgeKey(scene: Phaser.Scene): string {
  if (!scene.textures.exists(BADGE_KEY)) {
    const g = scene.make.graphics({}, false);
    const c = DOT_TEXTURE / 2;
    g.fillStyle(COLOR_DOT_RIM, 1);
    g.fillCircle(c, c, c);
    g.fillStyle(COLOR_BADGE, 1);
    g.fillCircle(c, c, c * (1 - BADGE_RIM_SHARE));
    g.generateTexture(BADGE_KEY, DOT_TEXTURE, DOT_TEXTURE);
    g.destroy();
  }
  return BADGE_KEY;
}

/** A small texture of one colour, scaled to any rectangle (the ring, the flashes, the veils). */
export function pixelKey(scene: Phaser.Scene, color: number): string {
  const key = `gb-px-${color.toString(16)}`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(color, 1);
    g.fillRect(0, 0, PIXEL_TEXTURE, PIXEL_TEXTURE);
    g.generateTexture(key, PIXEL_TEXTURE, PIXEL_TEXTURE);
    g.destroy();
  }
  return key;
}

/** The swatch's tick (D84): a check in the settled ring's teal, in a texture of `size` texels. */
export function swatchTickKey(scene: Phaser.Scene, size: number): string {
  const key = `gb-swatch-tick-${String(size)}`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    const r = size / 2;
    g.lineStyle(DOT_TICK_STROKE * r, COLOR_SETTLED_RING, 1);
    check(g, r, r, r * (1 - DOT_TICK_STROKE));
    g.generateTexture(key, size, size);
    g.destroy();
  }
  return key;
}
