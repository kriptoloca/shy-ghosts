import type Phaser from 'phaser';
import {
  COLOR_CAP,
  COLOR_CAP_TIP,
  COLOR_FURNITURE,
  COLOR_FURNITURE_RIM,
  COLOR_GHOST_CALM,
  COLOR_GHOST_EYES,
  COLOR_GHOST_HANDS,
  COLOR_GHOST_LIT,
  COLOR_GHOST_OUTLINE,
  COLOR_GHOST_SEEN,
  COLOR_LAMP,
  COLOR_LAMP_BASE,
  COLOR_MARK,
  FURNITURE_CORNER,
  FURNITURE_INSET,
  FURNITURE_RIM,
  GHOST_SHAPE as G,
  GHOST_TEXTURE,
  LAMP_DISC,
  LAMP_RAYS,
  LAMP_RAY_IN,
  LAMP_RAY_OUT,
  LAMP_RAY_WIDTH,
  MARK_SHARE,
} from '../config';
import type { GhostStatus } from '../core/state';

/**
 * The graybox's drawn textures (TASKS.md Epic 3; CLAUDE.md, Rendering): every state a player must
 * tell apart is a texture of its own, never a runtime tint. Calm: open eyes on a white sheet.
 * Seen: both hands over the eyes, shiver ticks at the sides, a cool sheet. Lit: squinting under a
 * shading hand, a warm sheet. A resident wears a nightcap (an overlay). Furniture is a dark block
 * with a light rim, a lamp a warm disc with rays, a mark a small grey dot without a face.
 */
export const GHOST_KEY: Record<GhostStatus, string> = {
  calm: 'gb-ghost-calm',
  seen: 'gb-ghost-seen',
  lit: 'gb-ghost-lit',
};
export const CAP_KEY = 'gb-cap';
export const MARK_KEY = 'gb-mark';
export const FURNITURE_KEY = 'gb-furniture';
export const LAMP_KEY = 'gb-lamp';

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

function drawFurniture(g: Phaser.GameObjects.Graphics): void {
  const inset = FURNITURE_INSET * S;
  const side = S - 2 * inset;
  const corner = FURNITURE_CORNER * S;
  g.fillStyle(COLOR_FURNITURE, 1);
  g.fillRoundedRect(inset, inset, side, side, corner);
  g.lineStyle(FURNITURE_RIM * S, COLOR_FURNITURE_RIM, 1);
  g.strokeRoundedRect(inset, inset, side, side, corner);
}

function drawLamp(g: Phaser.GameObjects.Graphics): void {
  const inset = FURNITURE_INSET * S;
  const side = S - 2 * inset;
  g.fillStyle(COLOR_LAMP_BASE, 1);
  g.fillRoundedRect(inset, inset, side, side, FURNITURE_CORNER * S);
  g.lineStyle(LAMP_RAY_WIDTH * S, COLOR_LAMP, 1);
  for (let k = 0; k < LAMP_RAYS; k++) {
    const a = (k / LAMP_RAYS) * FULL_TURN;
    g.lineBetween(
      HALF + Math.cos(a) * LAMP_RAY_IN * S,
      HALF + Math.sin(a) * LAMP_RAY_IN * S,
      HALF + Math.cos(a) * LAMP_RAY_OUT * S,
      HALF + Math.sin(a) * LAMP_RAY_OUT * S,
    );
  }
  g.fillStyle(COLOR_LAMP, 1);
  g.fillCircle(HALF, HALF, LAMP_DISC * S);
}

function drawMark(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(COLOR_MARK, 1);
  g.fillCircle(HALF, HALF, MARK_SHARE * S);
}

/** Makes the graybox textures once per game (scene restarts reuse them). */
export function makeGrayboxTextures(scene: Phaser.Scene): void {
  const make = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void): void => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({}, false);
    draw(g);
    g.generateTexture(key, S, S);
    g.destroy();
  };
  for (const state of ['calm', 'seen', 'lit'] as const) {
    make(GHOST_KEY[state], (g) => {
      drawGhost(g, state);
    });
  }
  make(CAP_KEY, drawCap);
  make(FURNITURE_KEY, drawFurniture);
  make(LAMP_KEY, drawLamp);
  make(MARK_KEY, drawMark);
}
