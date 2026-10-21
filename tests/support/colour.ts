/**
 * Colour arithmetic for the readability report (tests/contrast.test.ts): sRGB channels, WCAG 2
 * relative luminance and contrast, alpha blending as the canvas does it, a simulated colour vision
 * deficiency (Machado, Oliveira and Fernandes 2009, severity 1.0, applied in linear RGB) and the
 * CIE76 colour difference in CIELAB (D65).
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

function lab(c: Rgb): [number, number, number] {
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
