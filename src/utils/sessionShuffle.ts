/**
 * Pure Fisher–Yates shuffler with both per-session deterministic seeding and
 * dynamic multi-tier rating randomization for the Tourism menu.
 */

// Generate a random seed once per app process launch in memory
const SESSION_SEED: number = Math.floor(Math.random() * 2147483647) + 1;

const RECENT_TOP_TOURISM_STORAGE_KEY = 'kft_tourism_recent_top_ids_v1';

/**
 * Deterministic pseudo-random number generator (Mulberry32)
 */
export function createMulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a fresh non-zero 31-bit random seed whenever a menu is reopened or refreshed.
 */
export function generateFreshShuffleSeed(): number {
  const randomPart = Math.floor(Math.random() * 2147483646) + 1;
  const timePart = (Date.now() & 0x7fffffff) ^ (typeof performance !== 'undefined' ? Math.floor(performance.now() * 1000) : 0);
  return ((randomPart ^ timePart) & 0x7fffffff) || 1;
}

/**
 * Pure Fisher–Yates shuffle using a specific seed.
 */
export function shuffleWithSeed<T>(items: readonly T[], seed: number): T[] {
  if (!items || items.length <= 1) {
    return items ? [...items] : [];
  }

  const result = [...items];
  const rng = createMulberry32(seed || SESSION_SEED);

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}

/**
 * Pure Fisher–Yates shuffle using the per-session seed.
 * - Does not mutate the input array
 * - Stable across re-renders in the same session
 * - Preserves all properties, ratings, photos, etc.
 * - Reshuffles on the next fresh app launch
 */
export function shuffleForCurrentSession<T extends { id: string }>(items: readonly T[]): T[] {
  return shuffleWithSeed(items, SESSION_SEED);
}

/**
 * Read recently displayed top Tourism attraction IDs so consecutive opens/refreshes
 * always rotate fresh 5-star attractions to the very top of the menu.
 */
export function getRecentTopTourismIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(RECENT_TOP_TOURISM_STORAGE_KEY) || localStorage.getItem(RECENT_TOP_TOURISM_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((id): id is string => typeof id === 'string'));
    }
  } catch {
    // ignore storage errors
  }
  return new Set();
}

/**
 * Save the current top displayed Tourism attraction IDs for anti-repeat rotation on the next refresh/reopen.
 */
export function saveRecentTopTourismIds(ids: readonly string[]): void {
  try {
    const payload = JSON.stringify(ids.slice(0, 10));
    sessionStorage.setItem(RECENT_TOP_TOURISM_STORAGE_KEY, payload);
    localStorage.setItem(RECENT_TOP_TOURISM_STORAGE_KEY, payload);
  } catch {
    // ignore storage errors
  }
}

/**
 * Deduplicate and randomize verified tourist attractions by strict rating tiers:
 * - Tier 1: Verified 5-Star Flagship Attractions (rating >= 4.95 / 5.0★) — always prioritized at the top!
 * - Tier 2: 4.9★ Highly Rated Attractions (4.85 <= rating < 4.95)
 * - Tier 3: 4.8★ Highly Rated Attractions (4.75 <= rating < 4.85)
 * - Tier 4: 4.7★ Attractions (4.65 <= rating < 4.75)
 * - Tier 5: Remaining Verified Attractions (< 4.65)
 *
 * Within each rating tier, attractions are randomly shuffled using the dynamic seed,
 * and recently shown top cards are rotated down within Tier 1 so every menu open or refresh
 * displays a fresh set of verified 5-star attractions at the top.
 */
export function shuffleTourismByRatingTiers<
  T extends {
    id: string;
    nameKh?: string;
    nameEn?: string;
    photoUrl?: string;
    rating?: number;
  }
>(items: readonly T[], dynamicSeed: number, avoidTopIds?: ReadonlySet<string>): T[] {
  if (!items || items.length === 0) return [];

  // 1. Strict deduplication by ID, normalized Khmer name, normalized English name, and clean photoUrl
  const seenIds = new Set<string>();
  const seenNameKh = new Set<string>();
  const seenNameEn = new Set<string>();
  const seenPhotos = new Set<string>();
  const uniqueItems: T[] = [];

  for (const item of items) {
    if (!item || !item.id) continue;
    const rawPhoto = (item.photoUrl || '').trim();
    if (!rawPhoto) continue;

    const cleanPhotoKey = rawPhoto.split('?')[0].trim().toLowerCase();
    const normKh = (item.nameKh || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const normEn = (item.nameEn || '').trim().replace(/\s+/g, ' ').toLowerCase();

    if (seenIds.has(item.id)) continue;
    if (cleanPhotoKey && seenPhotos.has(cleanPhotoKey)) continue;
    if (normKh && seenNameKh.has(normKh)) continue;
    if (normEn && seenNameEn.has(normEn)) continue;

    seenIds.add(item.id);
    if (cleanPhotoKey) seenPhotos.add(cleanPhotoKey);
    if (normKh) seenNameKh.add(normKh);
    if (normEn) seenNameEn.add(normEn);
    uniqueItems.push(item);
  }

  // 2. Partition into rating priority tiers (5.0★ first, followed by 4.9★, 4.8★, 4.7★, and 4.6★/4.5★)
  const tier50: T[] = [];
  const tier49: T[] = [];
  const tier48: T[] = [];
  const tier47: T[] = [];
  const tierRest: T[] = [];

  for (const item of uniqueItems) {
    const r = typeof item.rating === 'number' && Number.isFinite(item.rating) ? item.rating : 4.5;
    if (r >= 4.95) {
      tier50.push(item);
    } else if (r >= 4.85) {
      tier49.push(item);
    } else if (r >= 4.75) {
      tier48.push(item);
    } else if (r >= 4.65) {
      tier47.push(item);
    } else {
      tierRest.push(item);
    }
  }

  // 3. Shuffle each tier independently with derived seeds
  let shuffled50 = shuffleWithSeed(tier50, dynamicSeed ^ 0x13579bdf);
  const shuffled49 = shuffleWithSeed(tier49, dynamicSeed ^ 0x2468ace0);
  const shuffled48 = shuffleWithSeed(tier48, dynamicSeed ^ 0x369cf036);
  const shuffled47 = shuffleWithSeed(tier47, dynamicSeed ^ 0x48ae159d);
  const shuffledRest = shuffleWithSeed(tierRest, dynamicSeed ^ 0x5ad027b3);

  // 4. Rotate any recently shown top cards to the back of Tier 1 so consecutive opens/refreshes
  // never repeat the exact same lead cards at the top of the screen
  if (avoidTopIds && avoidTopIds.size > 0 && shuffled50.length > avoidTopIds.size + 3) {
    const freshLead: T[] = [];
    const rotatedBack: T[] = [];
    for (const d of shuffled50) {
      if (avoidTopIds.has(d.id)) {
        rotatedBack.push(d);
      } else {
        freshLead.push(d);
      }
    }
    shuffled50 = [...freshLead, ...rotatedBack];
  }

  return [...shuffled50, ...shuffled49, ...shuffled48, ...shuffled47, ...shuffledRest];
}
