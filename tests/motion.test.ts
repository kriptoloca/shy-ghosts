import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as config from '../src/config';
import {
  DOT_POP_MS,
  GLANCE_MS,
  AFTERIMAGE_ALPHA,
  AFTERIMAGE_MS,
  CARD_PULSE_MS,
  CARD_TIME_MS,
  GLIDE_LEAN_DEG,
  GLIDE_MS,
  REASON_BEAT_MS,
  RESULT_GUARD_MS,
  RESULT_IN_MS,
  GLOW_IN_MS,
  GLOW_OUT_MS,
  DEMO_HOLD_MS,
  DEMO_IDLE_MS,
  DEMO_MAX_MS,
  DEMO_REPLAYS,
  DEMO_SKIP_FROM_MS,
  DOT_POP_SCALE,
  HINT_PULSE_MS,
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
  SETTLE_CHEER_MS,
  SETTLE_CHEER_SCALE,
  SETTLE_HOP_PX,
  SETTLE_MS,
  SETTLE_SCALE,
  SETTLE_VEIL_ALPHA,
  SETTLE_VEIL_MS,
  SHIVER_PX,
  SHIVER_SWINGS,
  SHIVER_SWING_MS,
  SLIDE_MS,
  WIN_BEAT_MS,
  WIN_FLASH_FROM,
  WIN_FLASH_TO,
  WIN_HIT_STOP_MS,
  WIN_HOP_MS,
  WIN_RING_MS,
  WIN_SKIP_FROM_MS,
  WIN_STEP_MAX_MS,
  WIN_SWEEP_MS,
  WIN_TICK_FROM,
  WIN_TICK_RISE_PX,
  WIN_TICK_TO,
  WIN_WAVES,
  WIN_WAVE_MS,
} from '../src/config';
import { shiverTween, type ShiverTween } from '../src/game/shiver';

/**
 * The graybox motion follows the Feel spec (GDD §3a is the contract; audit 2026-10-21, DÜŞÜK 10;
 * Gate B tune rounds 1 and 2, D73, D83, D84, D86): every timing and distance in src/config.ts is
 * read against its row of the §3a table, and success outweighs failure on screen (the inversion
 * test of §3a; the pixel measure is the e2e's, tests/e2e/timing.spec.ts).
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
      `the ghost bobs (scale ${s(SETTLE_SCALE)} and a ${s(SETTLE_HOP_PX)} px hop, ${s(SETTLE_MS)} ms)`,
    ],
    ['Room settles', `(alpha ${s(SETTLE_VEIL_ALPHA)} → 0, ${s(SETTLE_VEIL_MS)} ms)`],
    ['Room settles', `draws round it (${s(GLOW_IN_MS)} ms)`],
    ['Room settles', `pops to ${s(DOT_POP_SCALE)}× (${s(DOT_POP_MS)} ms)`],
    [
      'Room settles',
      `small content pop (scale ${s(SETTLE_CHEER_SCALE)}, ${s(SETTLE_CHEER_MS)} ms) as its progress dot pops`,
    ],
    ['Room settles', 'keeps a tick from the first beat'],
    ['Place → seen', `±${s(SHIVER_PX)} px (${s(SHIVER_SWINGS)} swings × ${s(SHIVER_SWING_MS)} ms)`],
    ['Place → seen', 'a dotted line between them appears and stays'],
    ['Place → seen', 'the shiver never repeats'],
    ['Place → lit', `| ${s(LIT_FLASH_MS)} ms |`],
    ['A calm ghost becomes seen or lit', `| ${s(GLOW_OUT_MS)} ms |`],
    ['Relocate', `| ${s(GLIDE_MS)} ms |`],
    ['Relocate', `leaning ${s(GLIDE_LEAN_DEG)}° toward its way and straight on arrival`],
    ['Relocate', `(alpha ${s(AFTERIMAGE_ALPHA)} → 0, ${s(AFTERIMAGE_MS)} ms)`],
    ['Remove', `floats up ${s(REMOVE_RISE)} px`],
    ['Remove', `| ${s(REMOVE_MS)} ms |`],
    ['Mark stroke', `${s(MARK_MS)} ms per cell`],
    ['House solved', `hit stop ${s(WIN_HIT_STOP_MS)} ms`],
    ['House solved', `every \`min(${s(WIN_STEP_MAX_MS)}, ${s(WIN_SWEEP_MS)} / R)\` ms`],
    ['House solved', `(alpha ${s(WIN_FLASH_FROM)} → ${s(WIN_FLASH_TO)})`],
    [
      'House solved',
      `(scale ${s(WIN_TICK_FROM)} → ${s(WIN_TICK_TO)}, ${s(WIN_TICK_RISE_PX)} px higher a room)`,
    ],
    ['House solved', `to its frame (${s(WIN_RING_MS)} ms)`],
    ['House solved', `hops and turns to the camera (${s(WIN_HOP_MS)} ms)`],
    ['House solved', `waves twice (${s(WIN_WAVES)} × ${s(WIN_WAVE_MS)} ms)`],
    ['House solved', `the beat ${WIN_BEAT_MS.toLocaleString('en-US')} ms, then the result card`],
    ['House solved', `the next house slides in after the card (${s(SLIDE_MS)} ms)`],
    ['Result card', `with a small overshoot (${s(RESULT_IN_MS)} ms)`],
    ['Result card', `the solve time ticking up from 0:00 (${s(CARD_TIME_MS)} ms)`],
    ['Result card', `pulsing once every ${CARD_PULSE_MS.toLocaleString('en-US')} ms`],
    ['Result card', `continues from ${s(RESULT_GUARD_MS)} ms after the card began`],
    ['Hint', `the reason in beats of ${s(REASON_BEAT_MS)} ms`],
    ['House solved', `a tap skips from ${s(WIN_SKIP_FROM_MS)} ms on`],
    ['Teaching demonstration', `on an ${s(DEMO_HOLD_MS)} ms hold frame`],
    ['Teaching demonstration', `after ${s(DEMO_IDLE_MS / MS_PER_S)} s without input`],
    ['Teaching demonstration', `at most ${s(DEMO_REPLAYS)} times`],
    ['Teaching demonstration', `≤ ${s(DEMO_MAX_MS / MS_PER_S)} s`],
    ['Teaching demonstration', `a first play never in its first ${s(DEMO_SKIP_FROM_MS)} ms`],
    ['Teaching demonstration', "never while a finger or a button is down or a hint's reason shows"],
    ['Tap a blocker or given', `a ${s(NUDGE_PX)} px nudge`],
    ['Tap a blocker or given', `| ${s(NUDGE_MS)} ms |`],
  ])('%s: "%s"', (label, text) => {
    expect(row(label)).toContain(text);
  });

  it('the finale is about 2.4 s: its parts end before the result card, which rises at 2,050 ms', () => {
    expect(WIN_BEAT_MS).toBe(2050);
    // the sweep (at most WIN_SWEEP_MS), the ring of light, the hop, the waves; the solve time ticks
    // in on the result card that follows (D99)
    const parts =
      WIN_HIT_STOP_MS + WIN_SWEEP_MS + WIN_RING_MS + WIN_HOP_MS + WIN_WAVES * WIN_WAVE_MS;
    expect(parts).toBeLessThanOrEqual(WIN_BEAT_MS);
    expect(CARD_TIME_MS).toBeLessThanOrEqual(WIN_HOP_MS + WIN_WAVES * WIN_WAVE_MS);
    expect(Math.abs(WIN_BEAT_MS + SLIDE_MS - 2.4 * MS_PER_S)).toBeLessThanOrEqual(100);
    // the tap that placed the last ghost never skips the payoff
    expect(WIN_SKIP_FROM_MS).toBeGreaterThan(WIN_HIT_STOP_MS + WIN_SWEEP_MS / 2);
    expect(row('House solved')).toContain('about 2.4 s');
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

  /** How long Phaser plays a tween: once per repeat, and back again with yoyo. */
  const tweenMs = (t: ShiverTween): number => (t.repeat + 1) * (t.yoyo ? 2 : 1) * t.duration;

  it('a shiver plays its swings and no more: a seen ghost 2 × 30 ms, the hint tremble 4 × 30 ms', () => {
    expect(tweenMs(shiverTween(SHIVER_PX, SHIVER_SWINGS))).toBe(SHIVER_SWINGS * SHIVER_SWING_MS);
    expect(tweenMs(shiverTween(SHIVER_PX, HINT_TREMBLE_SWINGS))).toBe(
      HINT_TREMBLE_SWINGS * SHIVER_SWING_MS,
    );
    expect(row('Hint')).toContain(
      `trembles (${s(HINT_TREMBLE_SWINGS)} × ${s(SHIVER_SWING_MS)} ms)`,
    );
  });

  it('the shiver is 60 ms and never repeats (no repeat constants left)', () => {
    expect(SHIVER_SWINGS * SHIVER_SWING_MS).toBe(60);
    expect('SHIVER_AGAIN_MS' in config).toBe(false);
    expect('SHIVER_AGAIN_PX' in config).toBe(false);
  });

  it('no flash repeats faster than 3 times a second (D23): the conflict flashes nothing (D84)', () => {
    expect('SEEN_LINE_ON_MS' in config).toBe(false);
    expect(HINT_PULSE_MS).toBeGreaterThan(MS_PER_S / 3);
  });

  it('the finale outlasts every failure motion many times over', () => {
    for (const f of failures) expect(WIN_BEAT_MS + SLIDE_MS).toBeGreaterThan(10 * f.ms);
  });

  it("the hint's reason (D74, D86): until the next move, its pulse slower than 3 a second, a wrong ghost's tremble short", () => {
    expect('HINT_REASON_MS' in config).toBe(false);
    expect(HINT_PULSE_MS).toBeGreaterThan(MS_PER_S / 3);
    // the tremble points at a ghost; it stays smaller and shorter than a settle
    expect(SHIVER_PX).toBeLessThan(SETTLE_HOP_PX);
    expect(HINT_TREMBLE_SWINGS * SHIVER_SWING_MS).toBeLessThan(SETTLE_MS);
    expect(row('Hint')).toContain("until the player's next move");
    expect(row('Hint')).toContain(`every ${s(HINT_PULSE_MS)} ms`);
  });

  it('a settle has three cues that stay (ring, content face, tick) and moves longer than a conflict', () => {
    expect(row('Room settles')).toContain('keeps a content face');
    expect(row('Room settles')).toContain('keeps a tick');
    expect(row('Room settles')).toContain('and stays');
    expect(SETTLE_VEIL_MS).toBeGreaterThan(2 * SHIVER_SWINGS * SHIVER_SWING_MS);
    // three beats: the veil, the ring as it fades, the pops; a conflict moves for its pop at most
    const settle = SETTLE_VEIL_MS + GLOW_IN_MS + SETTLE_CHEER_MS;
    expect(row('Room settles')).toContain(`about ${s(settle)} ms`);
    expect(settle).toBeGreaterThan(
      2 * Math.max(POP_MS, SHIVER_SWINGS * SHIVER_SWING_MS, GLOW_OUT_MS),
    );
  });
});
