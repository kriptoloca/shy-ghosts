import { describe, expect, it } from 'vitest';
import { Rng, hashSeed } from '../src/gen/rng';

/**
 * The seeded randomness every house and every property test draws from (CLAUDE.md: same seed →
 * identical house). Copied from the kit in Epic 1 because the rules' property tests need it.
 */
describe('Rng', () => {
  it('the same seed gives the same stream; another seed another one', () => {
    const a = new Rng(hashSeed('shy-ghosts/level/4'));
    const b = new Rng(hashSeed('shy-ghosts/level/4'));
    const c = new Rng(hashSeed('shy-ghosts/level/5'));
    const sa = Array.from({ length: 20 }, () => a.next());
    expect(Array.from({ length: 20 }, () => b.next())).toEqual(sa);
    expect(Array.from({ length: 20 }, () => c.next())).not.toEqual(sa);
    for (const x of sa) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('hashSeed is a stable uint32 (the house list depends on it)', () => {
    const h = hashSeed('shy-ghosts/level/4');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
    expect(hashSeed('shy-ghosts/level/4')).toBe(h);
    expect(hashSeed('')).not.toBe(hashSeed(' '));
  });

  it('int stays in range and reaches both ends; shuffle permutes; pick and weighted stay inside', () => {
    const rng = new Rng(9);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = rng.int(2, 9);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(9);
      seen.add(v);
    }
    expect([...seen].sort((x, y) => x - y)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    const arr = Array.from({ length: 30 }, (_, i) => i);
    const sh = rng.shuffle([...arr]);
    expect([...sh].sort((x, y) => x - y)).toEqual(arr);
    expect(['a', 'b']).toContain(rng.pick(['a', 'b']));
    expect(rng.weighted([0, 0, 5])).toBe(2);
    expect(() => rng.int(3, 2)).toThrow();
    expect(() => rng.pick([])).toThrow();
  });
});
