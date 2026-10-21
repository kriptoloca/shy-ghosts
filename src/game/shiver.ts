import { SHIVER_SWING_MS } from '../config';

/** The parts of a Phaser tween config that set a shiver's path and length. */
export interface ShiverTween {
  x: { from: number; to: number };
  duration: number;
  yoyo: boolean;
  repeat: number;
}

/**
 * A shiver: `swings` swings of SHIVER_SWING_MS each between −px and +px (GDD §3a: a seen ghost
 * 2 × 30 ms, the hint's tremble 4 × 30 ms). One swing crosses once, so a yoyo is two swings and
 * plays swings / 2 times, rounded up to whole pairs (until round 2 it played `swings` yoyos, twice
 * the length the Feel spec gives).
 */
export function shiverTween(px: number, swings: number): ShiverTween {
  const pairs = Math.max(1, Math.ceil(swings / 2));
  return { x: { from: -px, to: px }, duration: SHIVER_SWING_MS, yoyo: true, repeat: pairs - 1 };
}
