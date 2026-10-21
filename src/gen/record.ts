import { QUARTER_TURNS } from '../config';
import { rotate, type HouseData } from '../core/house';
import type { Grade, Insight } from './grade';
import { LEVEL_COUNT, ROTATION_FROM, ROTATION_SPAN, type Role } from './params';

/**
 * A house as the game plays it (D57): what src/data/levels.json and src/data/dailies.json hold,
 * one per line. The rules need nothing else, and the files ship with the game.
 */
export interface PlayHouse extends HouseData {
  /** 1-based place in the list; a daily's id is its day index (1–792). */
  id: number;
  givens: number[];
  solution: number[];
}

/**
 * What the build measured about a house (GENERATOR.md §1.1, D13, D57): src/data/levels-meta.json
 * and src/data/dailies-meta.json, for the tests and the build report; never shipped.
 */
export interface HouseMeta {
  id: number;
  grade: Grade;
  /** Per episode, the insight of each of its steps (GENERATOR.md §4.6, D67). */
  insights: Insight[][];
  /** The episodes that need a real insight: a step other than `shape` (D67). */
  insightEpisodes: number;
  /** The naive and the shallow player's exact chance to win (§5, D55). */
  players: { naive: number; shallow: number };
  role: Role;
  /** The winning candidate's seed (uint32). */
  seed: number;
}

/** A house with everything the build knows about it. */
export interface House extends PlayHouse, HouseMeta {
  id: number;
}

/** The play record of a house. */
export function playOf(h: House): PlayHouse {
  return {
    id: h.id,
    n: h.n,
    rooms: h.rooms,
    objects: h.objects,
    givens: h.givens,
    solution: h.solution,
  };
}

/** The build metadata of a house. */
export function metaOf(h: House): HouseMeta {
  return {
    id: h.id,
    grade: h.grade,
    insights: h.insights,
    insightEpisodes: h.insightEpisodes,
    players: h.players,
    role: h.role,
    seed: h.seed,
  };
}

/** Play records and their metadata, joined place by place; fails loudly on any mismatch. */
export function withMeta(play: readonly PlayHouse[], meta: readonly HouseMeta[]): House[] {
  if (play.length !== meta.length) {
    throw new Error(`withMeta: ${String(play.length)} houses, ${String(meta.length)} records`);
  }
  return play.map((p, i) => {
    const m = meta[i] as HouseMeta;
    if (m.id !== p.id)
      throw new Error(`withMeta: house ${String(p.id)} meets record ${String(m.id)}`);
    return { ...p, ...m };
  });
}

/**
 * Where house `k` of the endless list comes from (D14 as amended, D56): itself up to house 1000;
 * after that house ROTATION_FROM + ((k − 1001) mod ROTATION_SPAN) (506–1000, whole cycles, so the
 * cycle phase runs on), turned by (1 + floor((k − 1001) / ROTATION_SPAN)) mod 4 quarter turns.
 */
export function baseOf(k: number): { id: number; turns: number } {
  if (!Number.isInteger(k) || k < 1) throw new Error(`houseAt: ${String(k)} is not a house`);
  if (k <= LEVEL_COUNT) return { id: k, turns: 0 };
  const past = k - LEVEL_COUNT - 1;
  return {
    id: ROTATION_FROM + (past % ROTATION_SPAN),
    turns: (1 + Math.floor(past / ROTATION_SPAN)) % QUARTER_TURNS,
  };
}

/** The build metadata that names a house's steps (GENERATOR.md §4.6). */
type StepNames = 'insights' | 'insightEpisodes';

/**
 * House `k` of the endless list: 1 … 1000 as stored, then `baseOf(k)` turned. The rules are
 * symmetric, so the solution carries over, and every house the list turns grades the same in all
 * four turns (D54), so the grade does too (Gate A, A8). The base house's step names do not: a
 * turn can name a step otherwise (267 of the 1,485 turned houses), and no game code reads them,
 * so a turned house carries none (A9, round 2; round 2's code audit, DÜŞÜK 8; D88).
 */
export function houseAt<T extends PlayHouse>(levels: readonly T[], k: number): Omit<T, StepNames> {
  if (!Number.isInteger(k) || k < 1) throw new Error(`houseAt: ${String(k)} is not a house`);
  if (k <= LEVEL_COUNT) return levels[k - 1] as T;
  const { id, turns } = baseOf(k);
  const base = levels[id - 1] as T;
  const turned = rotate(base, turns);
  const out: Omit<T, StepNames> & Partial<Record<StepNames, unknown>> = {
    ...base,
    ...turned,
    givens: [...turned.givens],
    solution: [...turned.solution],
    id: k,
  };
  delete out.insights;
  delete out.insightEpisodes;
  return out;
}
