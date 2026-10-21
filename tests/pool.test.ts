import { describe, expect, it } from 'vitest';
import { Pool } from '../src/game/pool';

/** Pooled effects (CLAUDE.md "Performance"; audit 2026-10-21, DÜŞÜK 9). */
describe('Pool', () => {
  it('hands a released item out again instead of making a new one', () => {
    let serial = 0;
    const pool = new Pool(
      () => ({ id: ++serial, dirty: false }),
      (item) => {
        item.dirty = false;
      },
    );
    const a = pool.acquire();
    const b = pool.acquire();
    expect([a.id, b.id]).toEqual([1, 2]);
    a.dirty = true;
    pool.release(a);
    expect(a.dirty).toBe(false); // reset on the way back
    const c = pool.acquire();
    expect(c).toBe(a);
    expect({ made: pool.made, used: pool.used, idle: pool.idle }).toEqual({
      made: 2,
      used: 3,
      idle: 0,
    });
  });

  it('keeps an item released twice only once', () => {
    const pool = new Pool(
      () => ({}),
      () => undefined,
    );
    const a = pool.acquire();
    pool.release(a);
    pool.release(a);
    expect(pool.idle).toBe(1);
    expect(pool.acquire()).toBe(a);
    expect(pool.acquire()).not.toBe(a);
    expect(pool.made).toBe(2);
  });
});
