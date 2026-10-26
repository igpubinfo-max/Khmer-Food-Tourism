/**
 * Permanent Media & Admin Override Vault Service
 *
 * Guarantees that any image, photo URL, gallery photo, or item detail updated by Admin
 * (or authorized VIP shop owner) across:
 *   1. Tourist Attractions (`destinations`)
 *   2. Shops / Restaurants (`restaurants`)
 *   3. Food Menus (`foods`)
 *   4. Trending Foods (`trendingFoods`)
 * is saved permanently in:
 *   - Unversioned `localStorage` vault keys (never purged on version upgrades)
 *   - Browser `IndexedDB` (`kft_permanent_media_vault_idb_v1` — immune to 5MB localStorage quota)
 *   - `Supabase Cloud` (`kft_cloud_media_overrides_v1` — survives app reinstalls and syncs across devices)
 *
 * Default seed images NEVER overwrite any record present in this vault.
 */

import { FoodItem, Restaurant, TouristDestination, TrendingFoodItem, RestaurantMenuItem, RestaurantReview, RestaurantPriceLevel, GoogleMapsPlaceMetadata } from '../types';
import { initial100Destinations } from '../data/seedDestinations';
import {
  isSupabaseConfigured,
  pullCloudDocument,
  pushCloudDocument,
  pullCloudDocumentsByPrefix,
  pullCloudKeysManifestByPrefix,
  pullCloudDocumentsByKeys,
  deleteCloudDocument,
} from './supabaseService';

const IMMUTABLE_SEED_DEST_MAP = new Map<string, TouristDestination>(
  initial100Destinations.map((d) => [d.id, d])
);

export const VAULT_KEYS = {
  FOODS: 'kft_permanent_food_overrides_v1',
  RESTAURANTS: 'kft_permanent_restaurant_overrides_v1',
  DESTINATIONS: 'kft_permanent_destination_overrides_v1',
  DESTINATIONS_LEGACY: 'kft_destination_photo_overrides_v1',
  TRENDING_FOODS: 'kft_permanent_trending_food_overrides_v1',
  CLOUD_DOC_KEY: 'kft_cloud_media_overrides_v1',
  CLOUD_RECORD_PREFIX: 'kft_ov_',
} as const;

export interface FoodMediaOverride {
  id: string;
  photoUrl: string;
  nameKh?: string;
  nameEn?: string;
  categorySlug?: FoodItem['categorySlug'];
  categoryKh?: string;
  categoryEn?: string;
  descriptionKh?: string;
  descriptionEn?: string;
  priceRiel?: number;
  priceUsd?: number;
  imageAuditStatus?: FoodItem['imageAuditStatus'];
  imageAuditNote?: string;
  isCustomPhoto: boolean;
  updatedAt: string;
}

export interface RestaurantMediaOverride {
  id: string;
  photoUrl: string;
  profileImage: string;
  galleryPhotos?: string[];
  foodImages?: string[];
  menuItems?: RestaurantMenuItem[];
  reviews?: RestaurantReview[];
  rating?: number;
  reviewCount?: number;
  nameKh?: string;
  nameEn?: string;
  descriptionKh?: string;
  descriptionEn?: string;
  addressKh?: string;
  provinceKh?: string;
  phone?: string;
  openingHoursKh?: string;
  priceLevel?: RestaurantPriceLevel;
  promoVideoUrl?: string;
  telegramUrl?: string;
  facebookUrl?: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  mapUrl?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  dataSource?: Restaurant['dataSource'];
  googleMapsMeta?: GoogleMapsPlaceMetadata;
  isAdminEdited?: boolean;
  adminEditedAt?: string;
  isCustomPhoto: boolean;
  updatedAt: string;
}

export interface DestinationMediaOverride {
  id: string;
  photoUrl: string;
  galleryPhotos?: string[];
  nameKh?: string;
  nameEn?: string;
  descriptionKh?: string;
  descriptionEn?: string;
  provinceKh?: string;
  provinceEn?: string;
  addressKh?: string;
  mapUrl?: string;
  latitude?: number;
  longitude?: number;
  entryFeeKh?: string;
  openingHoursKh?: string;
  googlePlaceId?: string;
  dataSource?: TouristDestination['dataSource'];
  googleMapsMeta?: GoogleMapsPlaceMetadata;
  isAdminEdited?: boolean;
  adminEditedAt?: string;
  isCustomPhoto: boolean;
  updatedAt: string;
}

export interface TrendingFoodMediaOverride {
  id: string;
  photoUrl: string;
  foodNameKh?: string;
  foodNameEn?: string;
  restaurantNameKh?: string;
  locationKh?: string;
  priceRange?: string;
  updatedAt: string;
}

export interface AllMediaOverridesBundle {
  foods: Record<string, FoodMediaOverride>;
  restaurants: Record<string, RestaurantMediaOverride>;
  destinations: Record<string, DestinationMediaOverride>;
  trendingFoods: Record<string, TrendingFoodMediaOverride>;
  updatedAt: string;
}

const IDB_NAME = 'kft_permanent_media_vault_idb_v1';
const IDB_STORE = 'media_overrides';
const IDB_BUNDLE_KEY = 'master_bundle';

function openVaultIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveBundleToIdb(bundle: AllMediaOverridesBundle): Promise<void> {
  const db = await openVaultIdb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(bundle, IDB_BUNDLE_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export async function loadBundleFromIdb(): Promise<AllMediaOverridesBundle | null> {
  const db = await openVaultIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_BUNDLE_KEY);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as AllMediaOverridesBundle) || null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

// Live in-memory master cache so that even if localStorage reaches its 5MB quota limit,
// no Admin-replaced image is ever lost during subsequent edits in the session.
let inMemoryMasterBundle: AllMediaOverridesBundle | null = null;

function isObsoleteSeedPhoto(url?: string): boolean {
  if (!url) return true;
  return url.includes('Huay_Kaew_waterfall_mu_yang.jpg') || url.includes('Global_Forest_Change_tree-cover_loss_year');
}

function isFakeSeedRestaurantOverride(rec?: RestaurantMediaOverride | null): boolean {
  if (!rec || !rec.id) return true;
  const isSeedId = /^rest-\d+$/.test(String(rec.id).trim());
  if (!isSeedId) return false;
  const url = String(rec.photoUrl || rec.profileImage || '').trim();
  const isStaticDefaultPath = /^\/(Shop\/rest-\d+|foods\/food-\d+)\.(jpg|jpeg|png|webp)$/i.test(url);
  const hasCustomName = Boolean(rec.nameKh && rec.nameKh.trim().length > 0);
  const hasReviews = Array.isArray(rec.reviews) && rec.reviews.length > 0;
  const hasCustomMenu =
    Array.isArray(rec.menuItems) &&
    rec.menuItems.length > 0 &&
    !(rec.id === 'rest-19' && rec.menuItems.length === 3 && rec.menuItems[0]?.id === 'menu-1');
  return isStaticDefaultPath && !hasCustomName && !hasReviews && !hasCustomMenu;
}

function safeReadJsonMap<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    if (raw && raw !== 'undefined' && raw !== 'null') {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, T>;
      }
    }
  } catch (e) {
    console.warn(`Failed to read vault key ${key}:`, e);
  }
  return {};
}

function safeWriteJsonMap<T>(key: string, map: Record<string, T>): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(map));
    return true;
  } catch (e) {
    // Attempt to free obsolete legacy keys and retry once
    try {
      localStorage.removeItem(VAULT_KEYS.DESTINATIONS_LEGACY);
      localStorage.removeItem('kft_destinations_real_v5');
      localStorage.removeItem('kft_destinations_real_v6');
      localStorage.removeItem('kft_destinations_real_v7');
      localStorage.removeItem('kft_restaurants_real_v8');
      localStorage.removeItem('kft_foods_200_v6');
      localStorage.setItem(key, JSON.stringify(map));
      return true;
    } catch {
      console.warn(`localStorage quota warning on ${key} (preserved in inMemoryMasterBundle, IndexedDB & Supabase Cloud):`, e);
      return false;
    }
  }
}

export function loadLocalMediaOverrides(): AllMediaOverridesBundle {
  const foods = safeReadJsonMap<FoodMediaOverride>(VAULT_KEYS.FOODS);
  const restaurants = safeReadJsonMap<RestaurantMediaOverride>(VAULT_KEYS.RESTAURANTS);
  const destinations = safeReadJsonMap<DestinationMediaOverride>(VAULT_KEYS.DESTINATIONS);
  const legacyDest = safeReadJsonMap<{ photoUrl: string; updatedAt?: string }>(VAULT_KEYS.DESTINATIONS_LEGACY);
  const trendingFoods = safeReadJsonMap<TrendingFoodMediaOverride>(VAULT_KEYS.TRENDING_FOODS);

  // Merge legacy destination photo overrides into the unified destinations vault & remove duplicate legacy key
  let hadLegacy = false;
  for (const [id, val] of Object.entries(legacyDest)) {
    hadLegacy = true;
    if (val && val.photoUrl && !isObsoleteSeedPhoto(val.photoUrl) && !destinations[id]) {
      destinations[id] = {
        id,
        photoUrl: val.photoUrl,
        isCustomPhoto: true,
        updatedAt: val.updatedAt || new Date().toISOString(),
      };
    }
  }
  if (hadLegacy) {
    try {
      localStorage.removeItem(VAULT_KEYS.DESTINATIONS_LEGACY);
    } catch {}
  }

  // Strip any obsolete broken seed URLs from destinations vault
  for (const [id, destOv] of Object.entries(destinations)) {
    if (destOv && isObsoleteSeedPhoto(destOv.photoUrl)) {
      delete destinations[id];
    }
  }

  // Strip any accidental unedited seed restaurant entries from restaurants vault
  for (const [id, restOv] of Object.entries(restaurants)) {
    if (isFakeSeedRestaurantOverride(restOv)) {
      delete restaurants[id];
    }
  }

  const fromDisk: AllMediaOverridesBundle = {
    foods,
    restaurants,
    destinations,
    trendingFoods,
    updatedAt: new Date().toISOString(),
  };

  if (inMemoryMasterBundle) {
    inMemoryMasterBundle = mergeOverrideBundles(fromDisk, inMemoryMasterBundle);
    return inMemoryMasterBundle;
  }

  inMemoryMasterBundle = fromDisk;
  return inMemoryMasterBundle;
}

/**
 * Check whether an override's photo is actually persisted in synchronous `localStorage`
 * (as opposed to only living in `inMemoryMasterBundle` / `IndexedDB` when localStorage hits its 5MB limit).
 * Used by `compactDataForBulkLocalStorage` so it never strips a custom `data:` photo unless `localStorage`
 * has safely stored that override on disk.
 */
export function isOverridePersistedInLocalStorage(
  category: 'foods' | 'restaurants' | 'destinations',
  id: string
): boolean {
  try {
    const key =
      category === 'foods'
        ? VAULT_KEYS.FOODS
        : category === 'restaurants'
        ? VAULT_KEYS.RESTAURANTS
        : VAULT_KEYS.DESTINATIONS;
    const diskMap = safeReadJsonMap<{ photoUrl?: string }>(key);
    return Boolean(diskMap[id] && diskMap[id].photoUrl && diskMap[id].photoUrl!.trim().length > 0);
  } catch {
    return false;
  }
}

export function saveLocalMediaOverrides(bundle: AllMediaOverridesBundle): void {
  inMemoryMasterBundle = bundle;
  // Remove duplicate legacy key first to maximize available localStorage space
  try {
    localStorage.removeItem(VAULT_KEYS.DESTINATIONS_LEGACY);
  } catch {}
  safeWriteJsonMap(VAULT_KEYS.FOODS, bundle.foods);
  safeWriteJsonMap(VAULT_KEYS.RESTAURANTS, bundle.restaurants);
  const destWritten = safeWriteJsonMap(VAULT_KEYS.DESTINATIONS, bundle.destinations);
  if (!destWritten) {
    // If all base64 destination photos exceed localStorage's 5MB limit, prioritize storing the newest overrides
    // in localStorage while preserving 100% of overrides in IndexedDB and inMemoryMasterBundle.
    try {
      const entries = Object.entries(bundle.destinations).sort((a, b) => {
        const tA = a[1]?.updatedAt ? new Date(a[1].updatedAt).getTime() : 0;
        const tB = b[1]?.updatedAt ? new Date(b[1].updatedAt).getTime() : 0;
        return tB - tA;
      });
      const trimmed: Record<string, DestinationMediaOverride> = {};
      let approxBytes = 0;
      for (const [k, v] of entries) {
        const entrySize = JSON.stringify(v).length;
        if (approxBytes + entrySize < 2_400_000) {
          trimmed[k] = v;
          approxBytes += entrySize;
        }
      }
      safeWriteJsonMap(VAULT_KEYS.DESTINATIONS, trimmed);
    } catch {}
  }
  safeWriteJsonMap(VAULT_KEYS.TRENDING_FOODS, bundle.trendingFoods);
  saveBundleToIdb(bundle).catch(() => {});
}

export function mergeOverrideBundles(
  base: AllMediaOverridesBundle,
  incoming: Partial<AllMediaOverridesBundle> | null | undefined
): AllMediaOverridesBundle {
  if (!incoming) return base;

  const mergeMaps = <T extends { updatedAt?: string; photoUrl?: string }>(
    a: Record<string, T> = {},
    b: Record<string, T> = {}
  ): Record<string, T> => {
    const out: Record<string, T> = { ...a };
    for (const [id, itemB] of Object.entries(b)) {
      if (!itemB || isObsoleteSeedPhoto(itemB.photoUrl)) continue;
      const itemA = out[id];
      if (!itemA || isObsoleteSeedPhoto(itemA.photoUrl)) {
        out[id] = itemB;
      } else {
        const timeA = itemA.updatedAt ? new Date(itemA.updatedAt).getTime() : 0;
        const timeB = itemB.updatedAt ? new Date(itemB.updatedAt).getTime() : 0;
        out[id] = timeB >= timeA ? { ...itemA, ...itemB } : { ...itemB, ...itemA };
      }
    }
    return out;
  };

  const mergedRestaurants = mergeMaps(base.restaurants, incoming.restaurants || {});
  for (const [id, restOv] of Object.entries(mergedRestaurants)) {
    if (isFakeSeedRestaurantOverride(restOv)) {
      delete mergedRestaurants[id];
    }
  }

  return {
    foods: mergeMaps(base.foods, incoming.foods || {}),
    restaurants: mergedRestaurants,
    destinations: mergeMaps(base.destinations, incoming.destinations || {}),
    trendingFoods: mergeMaps(base.trendingFoods, incoming.trendingFoods || {}),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Push a single record override to its own dedicated Supabase key (`kft_ov_<type>_<id>`)
 * AND safely merge-push the master bundle so no record can ever overwrite another.
 */
async function syncSingleOverrideRecordToCloud(
  category: 'food' | 'rest' | 'dest' | 'trend',
  recordId: string,
  overridePayload: any,
  localBundle: AllMediaOverridesBundle
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const perRecordKey = `${VAULT_KEYS.CLOUD_RECORD_PREFIX}${category}_${recordId}`;
  try {
    // 1. Atomic per-record upsert (fast, small payload, zero risk of overwriting other records)
    await pushCloudDocument(perRecordKey, overridePayload, 12000);

    // 2. Pull existing master bundle first, merge with localBundle, then push merged master bundle
    const remoteMaster = await pullCloudDocument<AllMediaOverridesBundle>(VAULT_KEYS.CLOUD_DOC_KEY, 10000);
    const mergedMaster = remoteMaster ? mergeOverrideBundles(remoteMaster, localBundle) : localBundle;
    inMemoryMasterBundle = mergedMaster;
    saveLocalMediaOverrides(mergedMaster);
    await pushCloudDocument(VAULT_KEYS.CLOUD_DOC_KEY, mergedMaster, 15000);
  } catch (err) {
    console.warn(`syncSingleOverrideRecordToCloud(${perRecordKey}) warning:`, err);
  }
}

/**
 * Record an Admin or authorized user update to a FoodItem permanently.
 */
export function recordPermanentFoodOverride(food: FoodItem): void {
  const bundle = loadLocalMediaOverrides();
  const now = new Date().toISOString();
  const overrideRecord: FoodMediaOverride = {
    id: food.id,
    photoUrl: food.photoUrl,
    nameKh: food.nameKh,
    nameEn: food.nameEn,
    categorySlug: food.categorySlug,
    categoryKh: food.categoryKh,
    categoryEn: food.categoryEn,
    descriptionKh: food.descriptionKh,
    descriptionEn: food.descriptionEn,
    priceRiel: food.priceRiel,
    priceUsd: food.priceUsd,
    imageAuditStatus: food.imageAuditStatus,
    imageAuditNote: food.imageAuditNote,
    isCustomPhoto: true,
    updatedAt: now,
  };
  bundle.foods[food.id] = overrideRecord;
  bundle.updatedAt = now;
  saveLocalMediaOverrides(bundle);
  syncSingleOverrideRecordToCloud('food', food.id, overrideRecord, bundle).catch(() => {});
}

/**
 * Record an Admin or VIP shop owner update to a Restaurant permanently.
 */
export function recordPermanentRestaurantOverride(rest: Restaurant): void {
  const bundle = loadLocalMediaOverrides();
  const now = new Date().toISOString();
  const primaryPhoto = rest.profileImage || rest.photoUrl;
  const dedupedGallery = Array.isArray(rest.galleryPhotos)
    ? rest.galleryPhotos.filter((g) => g && g !== primaryPhoto)
    : undefined;
  const overrideRecord: RestaurantMediaOverride = {
    id: rest.id,
    photoUrl: primaryPhoto,
    profileImage: primaryPhoto,
    galleryPhotos: dedupedGallery && dedupedGallery.length > 0 ? dedupedGallery : undefined,
    foodImages: Array.isArray(rest.foodImages)
      ? rest.foodImages.filter((g) => g && g !== primaryPhoto)
      : undefined,
    menuItems: rest.menuItems,
    reviews: rest.reviews,
    rating: rest.rating,
    reviewCount: rest.reviewCount,
    nameKh: rest.nameKh,
    nameEn: rest.nameEn,
    descriptionKh: rest.descriptionKh,
    descriptionEn: rest.descriptionEn,
    addressKh: rest.addressKh,
    provinceKh: rest.provinceKh,
    phone: rest.phone,
    openingHoursKh: rest.openingHoursKh,
    priceLevel: rest.priceLevel,
    promoVideoUrl: rest.promoVideoUrl,
    telegramUrl: rest.telegramUrl,
    facebookUrl: rest.facebookUrl,
    ownerId: rest.ownerId,
    ownerName: rest.ownerName,
    ownerEmail: rest.ownerEmail,
    mapUrl: rest.mapUrl,
    latitude: rest.latitude,
    longitude: rest.longitude,
    googlePlaceId: rest.googlePlaceId,
    dataSource: rest.dataSource,
    googleMapsMeta: rest.googleMapsMeta,
    isAdminEdited: rest.isAdminEdited ?? true,
    adminEditedAt: rest.adminEditedAt || now,
    isCustomPhoto: true,
    updatedAt: now,
  };
  bundle.restaurants[rest.id] = overrideRecord;
  bundle.updatedAt = now;
  saveLocalMediaOverrides(bundle);
  syncSingleOverrideRecordToCloud('rest', rest.id, overrideRecord, bundle).catch(() => {});
}

/**
 * Remove a deleted restaurant from the permanent override vault.
 */
export function removePermanentRestaurantOverride(restaurantId: string): void {
  const bundle = loadLocalMediaOverrides();
  if (bundle.restaurants[restaurantId]) {
    delete bundle.restaurants[restaurantId];
    bundle.updatedAt = new Date().toISOString();
    saveLocalMediaOverrides(bundle);
    deleteCloudDocument(`${VAULT_KEYS.CLOUD_RECORD_PREFIX}rest_${restaurantId}`).catch(() => {});
    pushMediaOverridesToCloud(bundle).catch(() => {});
  }
}

/**
 * Record an Admin update to a TouristDestination permanently.
 */
export function recordPermanentDestinationOverride(dest: TouristDestination): void {
  const bundle = loadLocalMediaOverrides();
  const now = new Date().toISOString();
  // Avoid storing a duplicate copy of a 300KB base64 photoUrl inside galleryPhotos
  const extraGallery = Array.isArray(dest.galleryPhotos)
    ? dest.galleryPhotos.filter((g) => g && g !== dest.photoUrl && !isObsoleteSeedPhoto(g))
    : undefined;
  const overrideRecord: DestinationMediaOverride = {
    id: dest.id,
    photoUrl: dest.photoUrl,
    galleryPhotos: extraGallery && extraGallery.length > 0 ? extraGallery : undefined,
    nameKh: dest.nameKh,
    nameEn: dest.nameEn,
    descriptionKh: dest.descriptionKh,
    descriptionEn: dest.descriptionEn,
    provinceKh: dest.provinceKh,
    provinceEn: dest.provinceEn,
    addressKh: dest.addressKh,
    mapUrl: dest.mapUrl,
    latitude: dest.latitude,
    longitude: dest.longitude,
    entryFeeKh: dest.entryFeeKh,
    openingHoursKh: dest.openingHoursKh,
    googlePlaceId: dest.googlePlaceId,
    dataSource: dest.dataSource,
    googleMapsMeta: dest.googleMapsMeta,
    isAdminEdited: dest.isAdminEdited ?? true,
    adminEditedAt: dest.adminEditedAt || now,
    isCustomPhoto: true,
    updatedAt: now,
  };
  bundle.destinations[dest.id] = overrideRecord;
  bundle.updatedAt = now;
  saveLocalMediaOverrides(bundle);
  syncSingleOverrideRecordToCloud('dest', dest.id, overrideRecord, bundle).catch(() => {});
}

export function removePermanentDestinationOverride(destId: string): void {
  const bundle = loadLocalMediaOverrides();
  if (bundle.destinations[destId]) {
    delete bundle.destinations[destId];
    bundle.updatedAt = new Date().toISOString();
    saveLocalMediaOverrides(bundle);
    deleteCloudDocument(`${VAULT_KEYS.CLOUD_RECORD_PREFIX}dest_${destId}`).catch(() => {});
    pushMediaOverridesToCloud(bundle).catch(() => {});
  }
}

/**
 * Record an Admin update to a TrendingFoodItem permanently.
 */
export function recordPermanentTrendingFoodOverride(item: TrendingFoodItem): void {
  const bundle = loadLocalMediaOverrides();
  const now = new Date().toISOString();
  const overrideRecord: TrendingFoodMediaOverride = {
    id: item.id,
    photoUrl: item.photoUrl,
    foodNameKh: item.foodNameKh,
    foodNameEn: item.foodNameEn,
    restaurantNameKh: item.restaurantNameKh,
    locationKh: item.locationKh,
    priceRange: item.priceRange,
    updatedAt: now,
  };
  bundle.trendingFoods[item.id] = overrideRecord;
  bundle.updatedAt = now;
  saveLocalMediaOverrides(bundle);
  syncSingleOverrideRecordToCloud('trend', item.id, overrideRecord, bundle).catch(() => {});
}

/**
 * Apply permanent food overrides on top of any food list (seed or cached).
 */
export function applyFoodOverrides(
  foods: FoodItem[],
  overridesMap: Record<string, FoodMediaOverride> = loadLocalMediaOverrides().foods
): FoodItem[] {
  if (!overridesMap || Object.keys(overridesMap).length === 0) return foods;
  return foods.map((f) => {
    const ov = overridesMap[f.id];
    if (!ov || !ov.photoUrl) return f;
    return {
      ...f,
      photoUrl: ov.photoUrl,
      nameKh: ov.nameKh || f.nameKh,
      nameEn: ov.nameEn || f.nameEn,
      categorySlug: ov.categorySlug || f.categorySlug,
      categoryKh: ov.categoryKh || f.categoryKh,
      categoryEn: ov.categoryEn || f.categoryEn,
      descriptionKh: ov.descriptionKh || f.descriptionKh,
      descriptionEn: ov.descriptionEn || f.descriptionEn,
      priceRiel: typeof ov.priceRiel === 'number' ? ov.priceRiel : f.priceRiel,
      priceUsd: typeof ov.priceUsd === 'number' ? ov.priceUsd : f.priceUsd,
      imageAuditStatus: ov.imageAuditStatus || 'verified',
      imageAuditNote: ov.imageAuditNote || f.imageAuditNote,
      isCustomPhoto: true,
      photoUpdatedAt: ov.updatedAt,
    };
  });
}

/**
 * Apply permanent restaurant overrides on top of any restaurant list (seed or cached).
 */
export function applyRestaurantOverrides(
  restaurants: Restaurant[],
  overridesMap: Record<string, RestaurantMediaOverride> = loadLocalMediaOverrides().restaurants
): Restaurant[] {
  if (!overridesMap || Object.keys(overridesMap).length === 0) return restaurants;
  const seenIds = new Set<string>();
  const mapped = restaurants.map((r) => {
    seenIds.add(r.id);
    const ov = overridesMap[r.id];
    if (!ov) return r;
    const photoUrl = ov.photoUrl || ov.profileImage || r.photoUrl;
    return {
      ...r,
      photoUrl,
      profileImage: ov.profileImage || photoUrl,
      galleryPhotos: Array.isArray(ov.galleryPhotos) ? ov.galleryPhotos : r.galleryPhotos,
      foodImages: Array.isArray(ov.foodImages) ? ov.foodImages : r.foodImages,
      menuItems: Array.isArray(ov.menuItems) ? ov.menuItems : r.menuItems,
      reviews: Array.isArray(ov.reviews) ? ov.reviews : r.reviews,
      rating: typeof ov.rating === 'number' ? ov.rating : r.rating,
      reviewCount: typeof ov.reviewCount === 'number' ? ov.reviewCount : r.reviewCount,
      nameKh: ov.nameKh || r.nameKh,
      nameEn: ov.nameEn || r.nameEn,
      descriptionKh: ov.descriptionKh || r.descriptionKh,
      descriptionEn: ov.descriptionEn || r.descriptionEn,
      addressKh: ov.addressKh || r.addressKh,
      provinceKh: ov.provinceKh || r.provinceKh,
      phone: ov.phone !== undefined ? ov.phone : r.phone,
      openingHoursKh: ov.openingHoursKh || r.openingHoursKh,
      priceLevel: ov.priceLevel || r.priceLevel,
      promoVideoUrl: ov.promoVideoUrl !== undefined ? ov.promoVideoUrl : r.promoVideoUrl,
      telegramUrl: ov.telegramUrl !== undefined ? ov.telegramUrl : r.telegramUrl,
      facebookUrl: ov.facebookUrl !== undefined ? ov.facebookUrl : r.facebookUrl,
      ownerId: ov.ownerId || r.ownerId,
      ownerName: ov.ownerName || r.ownerName,
      ownerEmail: ov.ownerEmail || r.ownerEmail,
      mapUrl: ov.mapUrl || r.mapUrl,
      latitude: typeof ov.latitude === 'number' ? ov.latitude : r.latitude,
      longitude: typeof ov.longitude === 'number' ? ov.longitude : r.longitude,
      googlePlaceId: ov.googlePlaceId || r.googlePlaceId,
      dataSource: ov.dataSource || r.dataSource,
      googleMapsMeta: ov.googleMapsMeta || r.googleMapsMeta,
      isAdminEdited: ov.isAdminEdited ?? r.isAdminEdited,
      adminEditedAt: ov.adminEditedAt || r.adminEditedAt,
      isCustomPhoto: true,
      photoUpdatedAt: ov.updatedAt || r.photoUpdatedAt,
    };
  });

  // Also append any custom VIP/Admin restaurants present in overridesMap that aren't in the list yet
  for (const [ovId, ov] of Object.entries(overridesMap)) {
    if (!seenIds.has(ovId) && ov && ov.nameKh && (ov.photoUrl || ov.profileImage)) {
      seenIds.add(ovId);
      const photoUrl = ov.photoUrl || ov.profileImage || '/Shop/rest-1.jpg';
      mapped.push({
        id: ovId,
        nameKh: ov.nameKh,
        nameEn: ov.nameEn || ov.nameKh,
        descriptionKh: ov.descriptionKh || 'ភោជនីយដ្ឋានម្ហូបខ្មែររសជាតិដើម ផាសុកភាព និងអនាម័យខ្ពស់។',
        descriptionEn: ov.descriptionEn || 'Authentic Cambodian restaurant.',
        photoUrl,
        profileImage: ov.profileImage || photoUrl,
        galleryPhotos: Array.isArray(ov.galleryPhotos) && ov.galleryPhotos.length > 0 ? ov.galleryPhotos : [photoUrl],
        foodImages: Array.isArray(ov.foodImages) ? ov.foodImages : [],
        menuItems: Array.isArray(ov.menuItems) ? ov.menuItems : [],
        reviews: Array.isArray(ov.reviews) ? ov.reviews : [],
        addressKh: ov.addressKh || 'ភ្នំពេញ',
        addressEn: ov.addressKh || 'Phnom Penh',
        provinceKh: ov.provinceKh || 'រាជធានីភ្នំពេញ',
        provinceEn: 'Phnom Penh',
        phone: ov.phone || '',
        openingHoursKh: ov.openingHoursKh || '០៧:០០ ព្រឹក - ០៩:០០ យប់',
        openingHoursEn: '07:00 AM - 09:00 PM',
        priceLevel: ov.priceLevel || '$$',
        mapUrl: ov.mapUrl || 'https://maps.google.com',
        latitude: typeof ov.latitude === 'number' ? ov.latitude : 11.5564,
        longitude: typeof ov.longitude === 'number' ? ov.longitude : 104.9282,
        rating: typeof ov.rating === 'number' && ov.rating > 0 ? ov.rating : 4.9,
        reviewCount: typeof ov.reviewCount === 'number' ? ov.reviewCount : 1,
        signatureDishesKh: ['ម្ហូបប្រចាំហាង'],
        promoVideoUrl: ov.promoVideoUrl,
        telegramUrl: ov.telegramUrl,
        facebookUrl: ov.facebookUrl,
        ownerId: ov.ownerId,
        ownerName: ov.ownerName,
        ownerEmail: ov.ownerEmail,
        googlePlaceId: ov.googlePlaceId,
        dataSource: ov.dataSource,
        googleMapsMeta: ov.googleMapsMeta,
        status: 'approved',
        isVerified: true,
        isPromoted: Boolean(ov.ownerId),
        membershipTier: ov.ownerId ? 'premium' : 'free',
        paymentStatus: ov.ownerId ? 'paid' : 'unpaid',
        isAdminEdited: ov.isAdminEdited ?? true,
        adminEditedAt: ov.adminEditedAt || ov.updatedAt,
        isCustomPhoto: true,
        photoUpdatedAt: ov.updatedAt,
        createdAt: ov.adminEditedAt || ov.updatedAt || new Date().toISOString(),
      });
    }
  }

  return mapped;
}

/**
 * Apply permanent destination overrides on top of any destination list (seed or cached).
 * Compares override timestamps strictly against the immutable seed (`IMMUTABLE_SEED_DEST_MAP`)
 * so that `compactDataForBulkLocalStorage` can never cause a custom photo to revert to an older seed photo.
 */
export function applyDestinationOverrides(
  destinations: TouristDestination[],
  overridesMap: Record<string, DestinationMediaOverride> = loadLocalMediaOverrides().destinations
): TouristDestination[] {
  if (!overridesMap || Object.keys(overridesMap).length === 0) return destinations;
  const seenIds = new Set<string>();
  const mapped = destinations.map((d) => {
    seenIds.add(d.id);
    const ov = overridesMap[d.id];
    if (!ov || !ov.photoUrl || isObsoleteSeedPhoto(ov.photoUrl)) return d;

    const seedItem = IMMUTABLE_SEED_DEST_MAP.get(d.id);
    const seedPhotoUrl = seedItem?.photoUrl || '';
    const isSeedBundledStaticPhoto =
      typeof seedPhotoUrl === 'string' && seedPhotoUrl.startsWith('/destinations/');
    const seedTime = seedItem?.photoUpdatedAt ? new Date(seedItem.photoUpdatedAt).getTime() : 0;
    const ovTime = ov.updatedAt ? new Date(ov.updatedAt).getTime() : 0;

    // If the seed already has this exact override baked into `/destinations/<id>.jpg` (`seedTime >= ovTime - 1000`),
    // use the fast static `/destinations/<id>.jpg` asset.
    // Otherwise (if `ov` is newer than the seed OR the seed is not a baked `/destinations/` file), always use `ov.photoUrl`!
    const useOverridePhoto =
      !isSeedBundledStaticPhoto ||
      ov.photoUrl.startsWith('/destinations/') ||
      ovTime > seedTime + 1000 ||
      seedTime === 0;

    const effectivePhotoUrl = useOverridePhoto ? ov.photoUrl : seedPhotoUrl;

    return {
      ...d,
      photoUrl: effectivePhotoUrl,
      galleryPhotos:
        Array.isArray(ov.galleryPhotos) && ov.galleryPhotos.length > 0
          ? [effectivePhotoUrl, ...ov.galleryPhotos.filter((g) => g && g !== effectivePhotoUrl && g !== ov.photoUrl)]
          : [effectivePhotoUrl],
      nameKh: ov.nameKh || d.nameKh,
      nameEn: ov.nameEn || d.nameEn,
      descriptionKh: ov.descriptionKh || d.descriptionKh,
      descriptionEn: ov.descriptionEn || d.descriptionEn,
      provinceKh: ov.provinceKh || d.provinceKh,
      provinceEn: ov.provinceEn || d.provinceEn,
      addressKh: ov.addressKh || d.addressKh,
      mapUrl: ov.mapUrl || d.mapUrl,
      latitude: typeof ov.latitude === 'number' ? ov.latitude : d.latitude,
      longitude: typeof ov.longitude === 'number' ? ov.longitude : d.longitude,
      entryFeeKh: ov.entryFeeKh || d.entryFeeKh,
      openingHoursKh: ov.openingHoursKh || d.openingHoursKh,
      googlePlaceId: ov.googlePlaceId || d.googlePlaceId,
      dataSource: ov.dataSource || d.dataSource,
      googleMapsMeta: ov.googleMapsMeta || d.googleMapsMeta,
      isAdminEdited: ov.isAdminEdited ?? d.isAdminEdited,
      adminEditedAt: ov.adminEditedAt || d.adminEditedAt,
      isCustomPhoto: true,
      photoUpdatedAt: ovTime >= seedTime ? (ov.updatedAt || d.photoUpdatedAt) : (seedItem?.photoUpdatedAt || d.photoUpdatedAt),
    };
  });

  // Also append any custom/imported destinations present in overridesMap that aren't in the array yet
  for (const [ovId, ov] of Object.entries(overridesMap)) {
    if (!seenIds.has(ovId) && ov && ov.photoUrl && !isObsoleteSeedPhoto(ov.photoUrl) && ov.nameKh) {
      seenIds.add(ovId);
      mapped.push({
        id: ovId,
        nameKh: ov.nameKh,
        nameEn: ov.nameEn || ov.nameKh,
        categorySlug: 'nature',
        categoryKh: 'ធម្មជាតិ & រមណីយដ្ឋាន',
        categoryEn: 'Nature & Resorts',
        descriptionKh: ov.descriptionKh || ov.nameKh,
        descriptionEn: ov.descriptionEn || ov.nameEn || ov.nameKh,
        photoUrl: ov.photoUrl,
        galleryPhotos: Array.isArray(ov.galleryPhotos) && ov.galleryPhotos.length > 0 ? ov.galleryPhotos : [ov.photoUrl],
        provinceKh: ov.provinceKh || 'កម្ពុជា',
        provinceEn: ov.provinceEn || 'Cambodia',
        addressKh: ov.addressKh || ov.provinceKh || 'កម្ពុជា',
        addressEn: ov.provinceEn || 'Cambodia',
        entranceFeeKh: ov.entryFeeKh || 'ចូលទស្សនាឥតគិតថ្លៃ ($0)',
        entranceFeeEn: 'Free Entry ($0)',
        bestTimeToVisitKh: ov.openingHoursKh || '០៧:០០ ព្រឹក - ០៦:០០ ល្ងាច',
        bestTimeToVisitEn: '07:00 AM - 06:00 PM',
        mapUrl: ov.mapUrl || 'https://www.google.com/maps',
        latitude: typeof ov.latitude === 'number' ? ov.latitude : 11.5564,
        longitude: typeof ov.longitude === 'number' ? ov.longitude : 104.9282,
        rating: 4.8,
        reviewCount: 120,
        highlightsKh: [ov.nameKh],
        isFeatured: false,
        googlePlaceId: ov.googlePlaceId,
        dataSource: ov.dataSource,
        googleMapsMeta: ov.googleMapsMeta,
        isAdminEdited: true,
        adminEditedAt: ov.adminEditedAt || ov.updatedAt,
        isCustomPhoto: true,
        photoUpdatedAt: ov.updatedAt,
      });
    }
  }

  return mapped;
}

/**
 * Apply permanent trending food overrides on top of any trending food list.
 */
export function applyTrendingFoodOverrides(
  items: TrendingFoodItem[],
  overridesMap: Record<string, TrendingFoodMediaOverride> = loadLocalMediaOverrides().trendingFoods
): TrendingFoodItem[] {
  if (!Array.isArray(items)) return [];
  const validItems = items.filter((item): item is TrendingFoodItem => Boolean(item && item.id));
  if (!overridesMap || Object.keys(overridesMap).length === 0) return validItems;
  return validItems.map((item) => {
    const ov = overridesMap[item.id];
    if (!ov || !ov.photoUrl) return item;
    return {
      ...item,
      photoUrl: ov.photoUrl || item.photoUrl,
      foodNameKh: ov.foodNameKh || item.foodNameKh,
      foodNameEn: ov.foodNameEn || item.foodNameEn,
      restaurantNameKh: ov.restaurantNameKh || item.restaurantNameKh,
      locationKh: ov.locationKh || item.locationKh,
      priceRange: ov.priceRange || item.priceRange,
    };
  });
}

/**
 * Push media overrides bundle to Supabase Cloud (pull-merge-push safe).
 */
export async function pushMediaOverridesToCloud(bundle?: AllMediaOverridesBundle): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const localToPush = bundle || loadLocalMediaOverrides();
  try {
    const remote = await pullCloudDocument<AllMediaOverridesBundle>(VAULT_KEYS.CLOUD_DOC_KEY, 10000);
    const merged = remote ? mergeOverrideBundles(remote, localToPush) : localToPush;
    inMemoryMasterBundle = merged;
    return await pushCloudDocument(VAULT_KEYS.CLOUD_DOC_KEY, merged, 15000);
  } catch {
    return await pushCloudDocument(VAULT_KEYS.CLOUD_DOC_KEY, localToPush, 15000);
  }
}

/**
 * Fast local-only hydration from `localStorage` + `IndexedDB` (<15ms, zero network wait).
 * Called immediately on startup so custom photos stored in IndexedDB render before any network request.
 */
export async function hydrateFromLocalIdbImmediate(): Promise<AllMediaOverridesBundle> {
  let current = loadLocalMediaOverrides();
  try {
    const idbBundle = await loadBundleFromIdb();
    if (idbBundle) {
      current = mergeOverrideBundles(current, idbBundle);
      inMemoryMasterBundle = current;
    }
  } catch {}
  return current;
}

/**
 * Hydrate and synchronize permanent media overrides from:
 *   1. In-memory master cache (`inMemoryMasterBundle`)
 *   2. LocalStorage (`VAULT_KEYS`)
 *   3. IndexedDB (`kft_permanent_media_vault_idb_v1`)
 *   4. Supabase Cloud Atomic Per-Record Keys (`kft_ov_food_*`, `kft_ov_rest_*`, `kft_ov_dest_*`, `kft_ov_trend_*`)
 *      via lightweight manifest check + chunked batch downloads so large base64 images never time out
 *   5. Supabase Cloud Master Bundle (`kft_cloud_media_overrides_v1`)
 */
export async function hydrateAndSyncMediaOverrides(): Promise<AllMediaOverridesBundle> {
  let current = await hydrateFromLocalIdbImmediate();

  // Merge from Supabase Cloud using manifest-first delta sync + chunked batching
  if (isSupabaseConfigured()) {
    try {
      const manifest = await pullCloudKeysManifestByPrefix(VAULT_KEYS.CLOUD_RECORD_PREFIX, 8000);
      const existingPerRecordKeys = new Set<string>();
      const keysToFetch: string[] = [];

      if (Array.isArray(manifest) && manifest.length > 0) {
        for (const item of manifest) {
          existingPerRecordKeys.add(item.key);
          const remoteMs = item.updated_at ? new Date(item.updated_at).getTime() : 0;
          let localUpdatedAt: string | undefined;
          let seedUpdatedAtMs = 0;
          if (item.key.startsWith('kft_ov_food_')) {
            const id = item.key.slice('kft_ov_food_'.length);
            localUpdatedAt = current.foods[id]?.updatedAt;
          } else if (item.key.startsWith('kft_ov_rest_')) {
            const id = item.key.slice('kft_ov_rest_'.length);
            localUpdatedAt = current.restaurants[id]?.updatedAt;
          } else if (item.key.startsWith('kft_ov_dest_')) {
            const id = item.key.slice('kft_ov_dest_'.length);
            localUpdatedAt = current.destinations[id]?.updatedAt;
            const seedDest = IMMUTABLE_SEED_DEST_MAP.get(id);
            if (seedDest?.photoUrl?.startsWith('/destinations/') && seedDest.photoUpdatedAt) {
              seedUpdatedAtMs = new Date(seedDest.photoUpdatedAt).getTime() || 0;
            }
          } else if (item.key.startsWith('kft_ov_trend_')) {
            const id = item.key.slice('kft_ov_trend_'.length);
            localUpdatedAt = current.trendingFoods[id]?.updatedAt;
          }
          const localMs = Math.max(
            localUpdatedAt ? new Date(localUpdatedAt).getTime() || 0 : 0,
            seedUpdatedAtMs
          );
          if (localMs === 0 || remoteMs > localMs + 1000) {
            keysToFetch.push(item.key);
          }
        }
      }

      // Fetch any missing or newer per-record overrides in small batches of 6 keys so requests never time out
      if (keysToFetch.length > 0) {
        const BATCH_SIZE = 6;
        const perRecordBundle: AllMediaOverridesBundle = {
          foods: {},
          restaurants: {},
          destinations: {},
          trendingFoods: {},
          updatedAt: new Date().toISOString(),
        };
        for (let i = 0; i < keysToFetch.length; i += BATCH_SIZE) {
          const batchKeys = keysToFetch.slice(i, i + BATCH_SIZE);
          const rows = await pullCloudDocumentsByKeys<any>(batchKeys, 15000);
          for (const row of rows) {
            const payload = row.payload;
            if (!payload || !payload.id) continue;
            if (row.key.startsWith('kft_ov_food_')) {
              perRecordBundle.foods[payload.id] = payload;
            } else if (row.key.startsWith('kft_ov_rest_')) {
              perRecordBundle.restaurants[payload.id] = payload;
            } else if (row.key.startsWith('kft_ov_dest_')) {
              perRecordBundle.destinations[payload.id] = payload;
            } else if (row.key.startsWith('kft_ov_trend_')) {
              perRecordBundle.trendingFoods[payload.id] = payload;
            }
          }
        }
        current = mergeOverrideBundles(current, perRecordBundle);
      }

      // Also pull master bundle if manifest returned empty or had no per-record keys yet
      if (existingPerRecordKeys.size === 0) {
        const cloudBundle = await pullCloudDocument<AllMediaOverridesBundle>(VAULT_KEYS.CLOUD_DOC_KEY, 15000);
        if (cloudBundle) {
          current = mergeOverrideBundles(current, cloudBundle);
        }
      }

      // Backfill any missing atomic per-record keys in Supabase ONLY if manifest succeeded (`existingPerRecordKeys.size > 0`)
      if (existingPerRecordKeys.size > 0) {
        const backfillPromises: Promise<any>[] = [];
        for (const [id, ov] of Object.entries(current.foods)) {
          const k = `kft_ov_food_${id}`;
          if (!existingPerRecordKeys.has(k)) backfillPromises.push(pushCloudDocument(k, ov, 10000));
        }
        for (const [id, ov] of Object.entries(current.restaurants)) {
          const k = `kft_ov_rest_${id}`;
          if (!existingPerRecordKeys.has(k)) backfillPromises.push(pushCloudDocument(k, ov, 10000));
        }
        for (const [id, ov] of Object.entries(current.destinations)) {
          const k = `kft_ov_dest_${id}`;
          if (!existingPerRecordKeys.has(k)) backfillPromises.push(pushCloudDocument(k, ov, 10000));
        }
        for (const [id, ov] of Object.entries(current.trendingFoods)) {
          const k = `kft_ov_trend_${id}`;
          if (!existingPerRecordKeys.has(k)) backfillPromises.push(pushCloudDocument(k, ov, 10000));
        }
        if (backfillPromises.length > 0) {
          Promise.allSettled(backfillPromises).catch(() => {});
        }
      }
    } catch {}
  }

  saveLocalMediaOverrides(current);
  return current;
}
