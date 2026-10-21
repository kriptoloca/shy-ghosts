import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as config from '../src/config';
import {
  DOT_POP_MS,
  GLANCE_MS,
  GLIDE_MS,
  GLOW_IN_MS,
  GLOW_OUT_MS,
  HINT_PULSE_MS,
  HINT_REASON_MS,
  HINT_TREMBLE_SWINGS,
  LIT_FLASH_MS,
  MARK_MS,
  MS_PER_S,
  NUDGE_MS,
  NUDGE_PX,
  POP_MS,
  POP_SCALE,
  REMOVE_MS,
  REMOVE_RISE,
  SEEN_LINE_OFF_MS,
  SEEN_LINE_ON_MS,
  SETTLE_HOP_PX,
  SETTLE_MS,
  SETTLE_SCALE,
  SHIVER_PX,
  SHIVER_SWINGS,
  SHIVER_SWING_MS,
  SLIDE_MS,
  WIN_BEAT_MS,
  WIN_DIGITS_MS,
  WIN_HIT_STOP_MS,
  WIN_HOP_MS,
  WIN_SKIP_FROM_MS,
  WIN_STEP_MAX_MS,
  WIN_SWEEP_MS,
  WIN_WAVES,
  WIN_WAVE_MS,
} from '../src/config';

/**
 * The graybox motion follows the Feel spec (GDD §3a is the contract; audit 2026-10-21, DÜŞÜK 10;
 * Gate B tune round 1, D73): every timing and distance in src/config.ts is read against its row of
 * the §3a table, and success outweighs failure on screen (the inversion test of §3a).
 */
const GDD = readFileSync(new URL('../GDD.md', import.meta.url), 'utf8');
const FEEL = GDD.slice(GDD.indexOf('## 3a.'), GDD.indexOf('## 4.'));

function row(label: string): string {
  const line = FEEL.split('\n').find((l) => l.startsWith(`| ${label}`));
  if (!line) throw new Error(`no §3a row "${label}"`);
  return line;
}

const s = String;

describe('graybox motion = GDD §3a', () => {
  it.each([
    ['Place → calm', `scale 0 → ${s(POP_SCALE)} → 1.0`],
    ['Place → calm', `${s(POP_MS)} ms pop, ${s(GLANCE_MS)} ms glance`],
    [
      'Room settles',
      `the ghost bobs (scale ${s(SETTLE_SCALE)} and an ${s(SETTLE_HOP_PX)} px hop, ${s(SETTLE_MS)} ms)`,
    ],
    ['Room settles', `draws round it (${s(GLOW_IN_MS)} ms)`],
    ['Room settles', `fills with a pop (${s(DOT_POP_MS)} ms)`],
    ['Place → seen', `±${s(SHIVER_PX)} px (${s(SHIVER_SWINGS)} swings × ${s(SHIVER_SWING_MS)} ms)`],
    [
      'Place → seen',
      `${s(SEEN_LINE_ON_MS)} ms on, ${s(SEEN_LINE_OFF_MS)} ms off, ${s(SEEN_LINE_ON_MS)} ms on`,
    ],
    ['Place → seen', 'the shiver never repeats'],
    ['Place → lit', `| ${s(LIT_FLASH_MS)} ms |`],
    ['A calm ghost becomes seen or lit', `| ${s(GLOW_OUT_MS)} ms |`],
    ['Relocate', `| ${s(GLIDE_MS)} ms |`],
    ['Remove', `floats up ${s(REMOVE_RISE)} px`],
    ['Remove', `| ${s(REMOVE_MS)} ms |`],
    ['Mark stroke', `${s(MARK_MS)} ms per cell`],
    ['House solved', `hit stop ${s(WIN_HIT_STOP_MS)} ms`],
    ['House solved', `every \`min(${s(WIN_STEP_MAX_MS)}, ${s(WIN_SWEEP_MS)} / R)\` ms`],
    ['House solved', `hops and turns to the camera (${s(WIN_HOP_MS)} ms)`],
    ['House solved', `waves twice (${s(WIN_WAVES)} × ${s(WIN_WAVE_MS)} ms)`],
    ['House solved', `the solve-time digits tick in (${s(WIN_DIGITS_MS)} ms)`],
    ['House solved', `slides in from 1,650 ms (${s(SLIDE_MS)} ms)`],
    ['House solved', `a tap skips from ${s(WIN_SKIP_FROM_MS)} ms on`],
    ['Tap a blocker or given', `a ${s(NUDGE_PX)} px nudge`],
    ['Tap a blocker or given', `| ${s(NUDGE_MS)} ms |`],
  ])('%s: "%s"', (label, text) => {
    expect(row(label)).toContain(text);
  });

  it('the finale is about 2 s: its parts end before the slide, which starts at 1,650 ms', () => {
    expect(WIN_BEAT_MS).toBe(1650);
    const parts =
      WIN_HIT_STOP_MS + WIN_SWEEP_MS + WIN_HOP_MS + WIN_WAVES * WIN_WAVE_MS + WIN_DIGITS_MS;
    expect(parts).toBeLessThanOrEqual(WIN_BEAT_MS);
    expect(Math.abs(WIN_BEAT_MS + SLIDE_MS - 2 * MS_PER_S)).toBeLessThanOrEqual(100);
    // the tap that placed the last ghost never skips the payoff
    expect(WIN_SKIP_FROM_MS).toBeGreaterThan(WIN_HIT_STOP_MS + WIN_SWEEP_MS / 2);
    expect(row('House solved')).toContain('about 2.0 s');
  });
});

describe('success outweighs failure on screen (the inversion test, GDD §3a; D73)', () => {
  /** Failure motions: the shiver of a seen ghost and the nudge of a refused tap. */
  const failures = [
    { px: SHIVER_PX, ms: SHIVER_SWINGS * SHIVER_SWING_MS },
    { px: NUDGE_PX, ms: NUDGE_MS },
  ];

  it('the settle bob moves farther and lasts longer than any failure motion', () => {
    for (const f of failures) {
      expect(SETTLE_HOP_PX).toBeGreaterThan(f.px);
      expect(SETTLE_MS).toBeGreaterThan(f.ms);
    }
    expect(SETTLE_SCALE).toBeGreaterThan(1);
  });

  it('the shiver is 60 ms and never repeats (no repeat constants left)', () => {
    expect(SHIVER_SWINGS * SHIVER_SWING_MS).toBe(60);
    expect('SHIVER_AGAIN_MS' in config).toBe(false);
    expect('SHIVER_AGAIN_PX' in config).toBe(false);
  });

  it('no flash repeats faster than 3 times a second (D23)', () => {
    expect(SEEN_LINE_ON_MS + SEEN_LINE_OFF_MS).toBeGreaterThan(MS_PER_S / 3);
  });

  it('the finale outlasts every failure motion many times over', () => {
    for (const f of failures) expect(WIN_BEAT_MS + SLIDE_MS).toBeGreaterThan(10 * f.ms);
  });

  it("the hint's reason (D74): 2 s, its pulse slower than 3 a second, a wrong ghost's tremble short", () => {
    expect(HINT_REASON_MS).toBe(2 * MS_PER_S);
    expect(HINT_PULSE_MS).toBeGreaterThan(MS_PER_S / 3);
    expect(HINT_REASON_MS % HINT_PULSE_MS).toBe(0);
    // the tremble points at a ghost; it stays smaller and shorter than a settle
    expect(SHIVER_PX).toBeLessThan(SETTLE_HOP_PX);
    expect(HINT_TREMBLE_SWINGS * SHIVER_SWING_MS).toBeLessThan(SETTLE_MS);
    expect(row('Hint')).toContain(`for ${s(HINT_REASON_MS / MS_PER_S)} s`);
    expect(row('Hint')).toContain(`every ${s(HINT_PULSE_MS)} ms`);
  });
});
