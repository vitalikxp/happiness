/** Seeded PRNG (mulberry32) whose whole state is a JSON-safe number kept in game state. */
export interface RngState {
  a: number;
}

/** Derive an RNG state from any string seed (32-bit murmur-style hash). */
export function seedRng(seed: string): RngState {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return { a: (h ^ (h >>> 16)) >>> 0 };
}

/** Next float in [0, 1). Advances `rng` in place — only call on a draft state. */
export function nextFloat(rng: RngState): number {
  rng.a = (rng.a + 0x6d2b79f5) | 0;
  let t = rng.a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Fisher–Yates shuffle into a new array. */
export function shuffle<T>(rng: RngState, items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(nextFloat(rng) * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}
