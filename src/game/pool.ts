/**
 * A pool of reusable objects (CLAUDE.md "Performance: pooled effects"): `acquire` hands out a
 * released object, or makes one when none is free; `release` resets an object and keeps it for
 * the next `acquire`. Pure, so it is unit-tested without Phaser.
 */
export class Pool<T> {
  private readonly free: T[] = [];
  private makes = 0;
  private uses = 0;

  constructor(
    private readonly create: () => T,
    private readonly reset: (item: T) => void,
  ) {}

  acquire(): T {
    this.uses++;
    const item = this.free.pop();
    if (item !== undefined) return item;
    this.makes++;
    return this.create();
  }

  /** Puts an object back; one already back is not kept twice. */
  release(item: T): void {
    if (this.free.includes(item)) return;
    this.reset(item);
    this.free.push(item);
  }

  /** Objects made so far. */
  get made(): number {
    return this.makes;
  }

  /** Objects handed out so far. */
  get used(): number {
    return this.uses;
  }

  /** Objects waiting to be handed out again. */
  get idle(): number {
    return this.free.length;
  }
}
