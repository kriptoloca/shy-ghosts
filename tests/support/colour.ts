/**
 * Colour arithmetic for the readability floors (tests/contrast.test.ts, D71): sRGB channels, WCAG 2
 * relative luminance and contrast, alpha blending as the canvas does it, a simulated colour vision
 * deficiency (Machado, Oliveira and Fernandes 2009, severity 1.0, applied in linear RGB), grayscale
 * (luminance only), CIELAB (D65) with its lightness L* and chroma C*, and the CIE76 and CIEDE2000
 * colour differences.
 */
export type Rgb = readonly [number, number, number];

export function rgb(hex: number): Rgb {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

function linear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function encode(v: number): number {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
}

export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG 2 contrast ratio, 1 (none) to 21. */
export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

function each(f: (i: 0 | 1 | 2) => number): Rgb {
  return [f(0), f(1), f(2)];
}

/** `over` drawn on `base` at `alpha` (8-bit sRGB blending, as the canvas renderer does). */
export function mix(base: Rgb, over: Rgb, alpha: number): Rgb {
  return each((i) => Math.round(base[i] + alpha * (over[i] - base[i])));
}

const DEUTAN = [
  [0.367322, 0.860646, -0.227968],
  [0.280085, 0.672501, 0.047413],
  [-0.01182, 0.04294, 0.968881],
] as const;

/** How a deuteranope (no green cones) sees a colour. */
export function deuteranope(c: Rgb): Rgb {
  const l = each((i) => linear(c[i]));
  return each((k) => encode(DEUTAN[k][0] * l[0] + DEUTAN[k][1] * l[1] + DEUTAN[k][2] * l[2]));
}

export function lab(c: Rgb): [number, number, number] {
  const [r, g, b] = each((i) => linear(c[i]));
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIE76 colour difference: about 2.3 is just noticeable, past 10 clearly different. */
export function deltaE(a: Rgb, b: Rgb): number {
  const p = lab(a);
  const q = lab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** CIELAB lightness L* (0 black … 100 white). */
export function lightness(c: Rgb): number {
  return lab(c)[0];
}

/** CIELAB chroma C*: how far from gray (a muted palette stays low). */
export function chroma(c: Rgb): number {
  const [, a, b] = lab(c);
  return Math.hypot(a, b);
}

/** CIELAB hue angle in degrees, 0 … 360. */
export function hueAngle(c: Rgb): number {
  const [, a, b] = lab(c);
  return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
}

/** The gray of the same luminance (a grayscale screen or print). */
export function gray(c: Rgb): Rgb {
  const v = encode(luminance(c));
  return [v, v, v];
}

const RAD = Math.PI / 180;

/**
 * CIEDE2000 colour difference (Sharma, Wu and Dalal 2005): about 1 is just noticeable; the floors
 * of D71 ask 6 between neighbouring rooms for a deuteranope and 7 between any two room colours.
 */
export function deltaE00(c1: Rgb, c2: Rgb): number {
  return deltaE00Lab(lab(c1), lab(c2));
}

/** CIEDE2000 between two CIELAB colours (checked against Sharma's published pairs). */
export function deltaE00Lab(
  [l1, a1, b1]: readonly [number, number, number],
  [l2, a2, b2]: readonly [number, number, number],
): number {
  const cBar = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const g = 0.5 * (1 - Math.sqrt(cBar ** 7 / (cBar ** 7 + 25 ** 7)));
  const ap1 = (1 + g) * a1;
  const ap2 = (1 + g) * a2;
  const cp1 = Math.hypot(ap1, b1);
  const cp2 = Math.hypot(ap2, b2);
  const hp = (b: number, ap: number): number =>
    b === 0 && ap === 0 ? 0 : (((Math.atan2(b, ap) / RAD) % 360) + 360) % 360;
  const hp1 = hp(b1, ap1);
  const hp2 = hp(b2, ap2);
  const dL = l2 - l1;
  const dC = cp2 - cp1;
  let dh = 0;
  if (cp1 * cp2 !== 0) {
    dh = hp2 - hp1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(cp1 * cp2) * Math.sin((dh / 2) * RAD);
  const lBar = (l1 + l2) / 2;
  const cpBar = (cp1 + cp2) / 2;
  let hBar = hp1 + hp2;
  if (cp1 * cp2 !== 0) {
    if (Math.abs(hp1 - hp2) <= 180) hBar = (hp1 + hp2) / 2;
    else hBar = hp1 + hp2 < 360 ? (hp1 + hp2 + 360) / 2 : (hp1 + hp2 - 360) / 2;
  }
  const t =
    1 -
    0.17 * Math.cos((hBar - 30) * RAD) +
    0.24 * Math.cos(2 * hBar * RAD) +
    0.32 * Math.cos((3 * hBar + 6) * RAD) -
    0.2 * Math.cos((4 * hBar - 63) * RAD);
  const dTheta = 30 * Math.exp(-(((hBar - 275) / 25) ** 2));
  const rc = 2 * Math.sqrt(cpBar ** 7 / (cpBar ** 7 + 25 ** 7));
  const sl = 1 + (0.015 * (lBar - 50) ** 2) / Math.sqrt(20 + (lBar - 50) ** 2);
  const sc = 1 + 0.045 * cpBar;
  const sh = 1 + 0.015 * cpBar * t;
  const rt = -Math.sin(2 * dTheta * RAD) * rc;
  return Math.sqrt((dL / sl) ** 2 + (dC / sc) ** 2 + (dH / sh) ** 2 + rt * (dC / sc) * (dH / sh));
}
