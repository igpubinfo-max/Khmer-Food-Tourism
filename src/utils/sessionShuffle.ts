/**
 * Pure Fisher–Yates session shuffler with an in-memory seed generated once per launch.
 * Ensures that cards reshuffle on every fresh app launch, but remain stable and deterministic
 * across re-renders and filter changes during the current active session.
 */

// Generate a random seed once per app process launch in memory
const SESSION_SEED: number = Math.floor(Math.random() * 2147483647) + 1;

/**
 * Deterministic pseudo-random number generator (Mulberry32)
 */
function createMulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pure Fisher–Yates shuffle using the per-session seed.
 * - Does not mutate the input array
 * - Stable across re-renders in the same session
 * - Preserves all properties, ratings, photos, etc.
 * - Reshuffles on the next fresh app launch
 */
export function shuffleForCurrentSession<T extends { id: string }>(items: readonly T[]): T[] {
  if (!items || items.length <= 1) {
    return items ? [...items] : [];
  }

  const result = [...items];
  const rng = createMulberry32(SESSION_SEED);

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}
