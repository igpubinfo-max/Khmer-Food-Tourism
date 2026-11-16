/**
 * Centralized registry for Admin-excluded (hidden) irrelevant shops (e.g., auto parts stores,
 * garages, or non-food businesses imported from Google Maps such as "13 Club").
 *
 * IMPORTANT:
 * - Excluding a shop does NOT delete it from Google Maps or permanently destroy database records.
 * - It simply hides/excludes the listing from restaurant, food, karaoke, and nightlife search results
 *   across the entire app (including live Google Maps imported listings), and can be restored by Admin anytime.
 */

export const EXCLUDED_SHOPS_STORAGE_KEY = 'kft_excluded_search_shops_v1';
export const EXCLUDED_SHOPS_CLOUD_KEY = 'kft_cloud_excluded_search_shops_v1';
export const EXCLUDED_SHOPS_UPDATED_EVENT = 'kft:excluded-shops-updated';

export interface ExcludedShopEntry {
  id: string;
  googlePlaceId?: string;
  nameKh: string;
  nameEn?: string;
  addressKh?: string;
  provinceKh?: string;
  photoUrl?: string;
  reason?: string;
  excludedAt: string;
  excludedBy?: string;
}

// Default pre-excluded non-restaurant Google Maps places reported by Admin (e.g., "13 Club" auto parts store)
const DEFAULT_EXCLUDED_SHOPS: Record<string, ExcludedShopEntry> = {
  'name:13 club': {
    id: 'name:13 club',
    nameKh: '13 Club',
    nameEn: '13 Club',
    reason: 'Auto parts store (not a restaurant or nightlife venue)',
    excludedAt: '2026-11-16T00:00:00.000Z',
    excludedBy: 'Admin',
  },
};

let inMemoryExcludedMap: Record<string, ExcludedShopEntry> | null = null;

function normalizeShopNameKey(raw?: string | null): string {
  return String(raw || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizePlaceIdVariants(id?: string | null, googlePlaceId?: string | null): string[] {
  const keys = new Set<string>();
  const addId = (val?: string | null) => {
    const clean = String(val || '').trim();
    if (!clean) return;
    keys.add(clean);
    if (clean.startsWith('gmap-')) {
      const bare = clean.slice(5);
      if (bare) {
        keys.add(bare);
        keys.add(`gplace:${bare}`);
      }
    } else if (clean.startsWith('gplace:')) {
      const bare = clean.slice(7);
      if (bare) {
        keys.add(bare);
        keys.add(`gmap-${bare}`);
      }
    } else {
      keys.add(`gmap-${clean}`);
      keys.add(`gplace:${clean}`);
    }
  };
  addId(id);
  addId(googlePlaceId);
  return Array.from(keys);
}

export function loadExcludedShopsMap(): Record<string, ExcludedShopEntry> {
  if (inMemoryExcludedMap) {
    return inMemoryExcludedMap;
  }
  const merged: Record<string, ExcludedShopEntry> = { ...DEFAULT_EXCLUDED_SHOPS };
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(EXCLUDED_SHOPS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const [k, v] of Object.entries(parsed)) {
            if (v && typeof v === 'object' && (v as any).__unexcluded) {
              delete merged[k];
            } else if (v && typeof v === 'object') {
              merged[k] = v as ExcludedShopEntry;
            }
          }
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  inMemoryExcludedMap = merged;
  return merged;
}

export function saveExcludedShopsMap(map: Record<string, ExcludedShopEntry>): void {
  inMemoryExcludedMap = { ...map };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(EXCLUDED_SHOPS_STORAGE_KEY, JSON.stringify(inMemoryExcludedMap));
    }
  } catch {
    // ignore storage errors
  }
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EXCLUDED_SHOPS_UPDATED_EVENT, { detail: inMemoryExcludedMap }));
    }
  } catch {
    // ignore event errors
  }
}

export function isShopExcludedFromSearch(
  candidate:
    | {
        id?: string | null;
        placeId?: string | null;
        googlePlaceId?: string | null;
        nameKh?: string | null;
        nameEn?: string | null;
        isExcludedFromSearch?: boolean | null;
      }
    | null
    | undefined
): boolean {
  if (!candidate) return false;
  if (candidate.isExcludedFromSearch) return true;

  const map = loadExcludedShopsMap();
  const idVariants = normalizePlaceIdVariants(candidate.id || candidate.placeId, candidate.googlePlaceId);
  for (const key of idVariants) {
    if (map[key]) return true;
  }

  const nameKhKey = normalizeShopNameKey(candidate.nameKh);
  if (nameKhKey && map[`name:${nameKhKey}`]) return true;

  const nameEnKey = normalizeShopNameKey(candidate.nameEn);
  if (nameEnKey && map[`name:${nameEnKey}`]) return true;

  return false;
}

export function excludeShopFromSearch(
  shop: {
    id?: string | null;
    placeId?: string | null;
    googlePlaceId?: string | null;
    nameKh?: string | null;
    nameEn?: string | null;
    addressKh?: string | null;
    address?: string | null;
    provinceKh?: string | null;
    province?: string | null;
    photoUrl?: string | null;
  },
  options?: { reason?: string; excludedBy?: string }
): ExcludedShopEntry {
  const primaryId = String(shop.id || shop.placeId || shop.googlePlaceId || '').trim() || `excluded-${Date.now()}`;
  const nameKh = String(shop.nameKh || shop.nameEn || primaryId).trim();
  const nameEn = String(shop.nameEn || shop.nameKh || '').trim();
  const nowIso = new Date().toISOString();

  const entry: ExcludedShopEntry = {
    id: primaryId,
    googlePlaceId: shop.googlePlaceId ? String(shop.googlePlaceId).trim() : undefined,
    nameKh,
    nameEn: nameEn || undefined,
    addressKh: String(shop.addressKh || shop.address || '').trim() || undefined,
    provinceKh: String(shop.provinceKh || shop.province || '').trim() || undefined,
    photoUrl: shop.photoUrl ? String(shop.photoUrl).trim() : undefined,
    reason: options?.reason || 'Irrelevant / non-restaurant listing hidden by Admin',
    excludedAt: nowIso,
    excludedBy: options?.excludedBy || 'Admin',
  };

  const current = { ...loadExcludedShopsMap() };
  const idVariants = normalizePlaceIdVariants(primaryId, shop.googlePlaceId);
  for (const key of idVariants) {
    current[key] = entry;
  }
  const normKh = normalizeShopNameKey(nameKh);
  if (normKh.length >= 2) {
    current[`name:${normKh}`] = entry;
  }
  const normEn = normalizeShopNameKey(nameEn);
  if (normEn.length >= 2) {
    current[`name:${normEn}`] = entry;
  }

  saveExcludedShopsMap(current);
  return entry;
}

export function restoreExcludedShopToSearch(
  target: { id?: string | null; googlePlaceId?: string | null; nameKh?: string | null; nameEn?: string | null } | string
): void {
  const current = { ...loadExcludedShopsMap() };
  if (typeof target === 'string') {
    const existing = current[target];
    delete current[target];
    if (existing) {
      for (const k of Object.keys(current)) {
        if (current[k]?.id === existing.id || (existing.nameKh && current[k]?.nameKh === existing.nameKh)) {
          delete current[k];
        }
      }
    }
  } else if (target && typeof target === 'object') {
    const idVariants = normalizePlaceIdVariants(target.id, target.googlePlaceId);
    for (const k of idVariants) delete current[k];
    const normKh = normalizeShopNameKey(target.nameKh);
    if (normKh) delete current[`name:${normKh}`];
    const normEn = normalizeShopNameKey(target.nameEn);
    if (normEn) delete current[`name:${normEn}`];
    for (const k of Object.keys(current)) {
      if (target.id && current[k]?.id === target.id) {
        delete current[k];
      }
    }
  }
  saveExcludedShopsMap(current);
}

export function getExcludedShopsList(): ExcludedShopEntry[] {
  const map = loadExcludedShopsMap();
  const uniqueById = new Map<string, ExcludedShopEntry>();
  for (const entry of Object.values(map)) {
    if (!entry || !entry.nameKh) continue;
    const dedupKey = `${entry.id}::${normalizeShopNameKey(entry.nameKh)}`;
    if (!uniqueById.has(dedupKey)) {
      uniqueById.set(dedupKey, entry);
    }
  }
  return Array.from(uniqueById.values()).sort((a, b) => (b.excludedAt || '').localeCompare(a.excludedAt || ''));
}
