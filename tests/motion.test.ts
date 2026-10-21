import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  GLANCE_MS,
  GLIDE_MS,
  GLOW_IN_MS,
  GLOW_OUT_MS,
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
  SHIVER_AGAIN_MS,
  SHIVER_AGAIN_PX,
  SHIVER_PX,
  SHIVER_SWINGS,
  SHIVER_SWING_MS,
  SLIDE_MS,
  WIN_BEAT_MS,
  WIN_STEP_MAX_MS,
  WIN_SWEEP_MS,
} from '../src/config';

/**
 * The graybox motion follows the Feel spec (GDD §3a is the contract; audit 2026-10-21, DÜŞÜK 10):
 * every timing and distance in src/config.ts is read against its row of the §3a table.
 */
const GDD = readFileSync(new URL('../GDD.md', import.meta.url), 'utf8');
const FEEL = GDD.slice(GDD.indexOf('## 3a.'), GDD.indexOf('## 4.'));

function row(label: string): string {
  const line = FEEL.split('\n').find((l) => l.startsWith(`| ${label}`));
  if (!line) throw new Error(`no §3a row "${label}"`);
  return line;
}

describe('graybox motion = GDD §3a', () => {
  it.each([
    ['Place → calm', `scale 0 → ${String(POP_SCALE)} → 1.0`],
    ['Place → calm', `${String(POP_MS)} ms pop, ${String(GLANCE_MS)} ms glance`],
    ['Room settles', `| ${String(GLOW_IN_MS)} ms |`],
    [
      'Place → seen',
      `±${String(SHIVER_PX)} px (${String(SHIVER_SWINGS)} swings × ${String(SHIVER_SWING_MS)} ms)`,
    ],
    [
      'Place → seen',
      `${String(SEEN_LINE_ON_MS)} ms on, ${String(SEEN_LINE_OFF_MS)} ms off, ` +
        `${String(SEEN_LINE_ON_MS)} ms on`,
    ],
    [
      'Place → seen',
      `(±${String(SHIVER_AGAIN_PX)} px) repeats every ${String(SHIVER_AGAIN_MS / MS_PER_S)} s`,
    ],
    ['Place → lit', `| ${String(LIT_FLASH_MS)} ms |`],
    ['A calm ghost becomes seen or lit', `| ${String(GLOW_OUT_MS)} ms |`],
    ['Relocate', `| ${String(GLIDE_MS)} ms |`],
    ['Remove', `floats up ${String(REMOVE_RISE)} px`],
    ['Remove', `| ${String(REMOVE_MS)} ms |`],
    ['Mark stroke', `${String(MARK_MS)} ms per cell`],
    ['House solved', `every \`min(${String(WIN_STEP_MAX_MS)}, ${String(WIN_SWEEP_MS)} / R)\` ms`],
    ['House solved', `slides in (${String(SLIDE_MS)} ms)`],
    ['Tap a blocker or given', `a ${String(NUDGE_PX)} px nudge`],
    ['Tap a blocker or given', `| ${String(NUDGE_MS)} ms |`],
  ])('%s: "%s"', (label, text) => {
    expect(row(label)).toContain(text);
  });

  it('the win beat fits the row\'s "≤ 1.2 s"', () => {
    expect(row('House solved')).toContain('≤ 1.2 s');
    expect(WIN_BEAT_MS).toBeLessThanOrEqual(1.2 * MS_PER_S);
  });
});
