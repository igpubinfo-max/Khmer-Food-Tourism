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
  DELETED_RESTAURANTS: 'kft_deleted_restaurants_v1',
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
  menuItemsUpdatedAt?: string;
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
  websiteUrl?: string;
  businessCategory?: string;
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
  deletedRestaurants?: Record<string, string>;
  destinations: Record<string, DestinationMediaOverride>;
  trendingFoods: Record<string, TrendingFoodMediaOverride>;
  updatedAt: string;
}

const IDB_NAME = 'kft_permanent_media_vault_idb_v1';

export function loadDeletedRestaurantIdsMap(): Record<string, string> {
  return safeReadJsonMap<string>(VAULT_KEYS.DELETED_RESTAURANTS);
}

export function saveDeletedRestaurantIdsMap(map: Record<string, string>): void {
  safeWriteJsonMap(VAULT_KEYS.DELETED_RESTAURANTS, map);
}

export function isRestaurantIdDeleted(
  restaurantId: string,
  _itemTimestampIso?: string,
  deletedMap: Record<string, string> = loadDeletedRestaurantIdsMap(),
  googlePlaceId?: string
): boolean {
  if (!deletedMap) return false;
  if (restaurantId && deletedMap[restaurantId]) return true;
  if (googlePlaceId && (deletedMap[`gplace:${googlePlaceId}`] || deletedMap[googlePlaceId])) return true;
  return false;
}
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

// O(1) in-memory sets of IDs confirmed written to synchronous localStorage so `isOverridePersistedInLocalStorage`
// never needs to call `JSON.parse(localStorage.getItem(...))` inside a 200-item loop!
const persistedInLocalStorageSets: Record<'foods' | 'restaurants' | 'destinations', Set<string> | null> = {
  foods: null,
  restaurants: null,
  destinations: null,
};

function getPersistedSetForCategory(category: 'foods' | 'restaurants' | 'destinations'): Set<string> {
  if (persistedInLocalStorageSets[category]) {
    return persistedInLocalStorageSets[category]!;
  }
  const key =
    category === 'foods'
      ? VAULT_KEYS.FOODS
      : category === 'restaurants'
      ? VAULT_KEYS.RESTAURANTS
      : VAULT_KEYS.DESTINATIONS;
  const diskMap = safeReadJsonMap<{ photoUrl?: string }>(key);
  const set = new Set<string>();
  for (const [id, rec] of Object.entries(diskMap)) {
    if (rec && rec.photoUrl && rec.photoUrl.trim().length > 0) {
      set.add(id);
    }
  }
  persistedInLocalStorageSets[category] = set;
  return set;
}

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

export function loadLocalMediaOverrides(forceDiskRead = false): AllMediaOverridesBundle {
  if (inMemoryMasterBundle && !forceDiskRead) {
    return inMemoryMasterBundle;
  }
  const foods = safeReadJsonMap<FoodMediaOverride>(VAULT_KEYS.FOODS);
  const restaurants = safeReadJsonMap<RestaurantMediaOverride>(VAULT_KEYS.RESTAURANTS);
  const deletedRestaurants = safeReadJsonMap<string>(VAULT_KEYS.DELETED_RESTAURANTS);
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

  // Strip any accidental unedited seed restaurant entries or deleted restaurants from restaurants vault
  for (const [id, restOv] of Object.entries(restaurants)) {
    if (isFakeSeedRestaurantOverride(restOv) || isRestaurantIdDeleted(id, restOv?.updatedAt, deletedRestaurants)) {
      delete restaurants[id];
    }
  }

  const fromDisk: AllMediaOverridesBundle = {
    foods,
    restaurants,
    deletedRestaurants,
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
    return getPersistedSetForCategory(category).has(id);
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
  if (safeWriteJsonMap(VAULT_KEYS.FOODS, bundle.foods)) {
    persistedInLocalStorageSets.foods = new Set(
      Object.entries(bundle.foods)
        .filter(([, v]) => v && v.photoUrl && v.photoUrl.trim().length > 0)
        .map(([k]) => k)
    );
  }
  if (safeWriteJsonMap(VAULT_KEYS.RESTAURANTS, bundle.restaurants)) {
    persistedInLocalStorageSets.restaurants = new Set(
      Object.entries(bundle.restaurants)
        .filter(([, v]) => v && (v.photoUrl || v.profileImage))
        .map(([k]) => k)
    );
  }
  if (bundle.deletedRestaurants && typeof bundle.deletedRestaurants === 'object') {
    safeWriteJsonMap(VAULT_KEYS.DELETED_RESTAURANTS, bundle.deletedRestaurants);
  }
  const destWritten = safeWriteJsonMap(VAULT_KEYS.DESTINATIONS, bundle.destinations);
  if (destWritten) {
    persistedInLocalStorageSets.destinations = new Set(
      Object.entries(bundle.destinations)
        .filter(([, v]) => v && v.photoUrl && v.photoUrl.trim().length > 0)
        .map(([k]) => k)
    );
  } else {
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
      if (safeWriteJsonMap(VAULT_KEYS.DESTINATIONS, trimmed)) {
        persistedInLocalStorageSets.destinations = new Set(Object.keys(trimmed));
      }
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

  const mergedDeletedRestaurants: Record<string, string> = {
    ...(base.deletedRestaurants || {}),
  };
  if (incoming.deletedRestaurants && typeof incoming.deletedRestaurants === 'object') {
    for (const [delId, delIso] of Object.entries(incoming.deletedRestaurants)) {
      if (!delId || !delIso) continue;
      const curIso = mergedDeletedRestaurants[delId];
      if (!curIso || (new Date(delIso).getTime() || 0) >= (new Date(curIso).getTime() || 0)) {
        mergedDeletedRestaurants[delId] = delIso;
      }
    }
  }

  const mergedRestaurants = mergeMaps(base.restaurants, incoming.restaurants || {});
  for (const id of Object.keys(mergedRestaurants)) {
    const a = base.restaurants?.[id];
    const b = incoming.restaurants?.[id];
    if (a && b) {
      const aMenu = Array.isArray(a.menuItems) ? a.menuItems : [];
      const bMenu = Array.isArray(b.menuItems) ? b.menuItems : [];
      const aMenuTime = a.menuItemsUpdatedAt ? new Date(a.menuItemsUpdatedAt).getTime() : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
      const bMenuTime = b.menuItemsUpdatedAt ? new Date(b.menuItemsUpdatedAt).getTime() : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
      if (aMenu.length > 0 && bMenu.length === 0 && !b.menuItemsUpdatedAt) {
        mergedRestaurants[id] = { ...mergedRestaurants[id], menuItems: aMenu, menuItemsUpdatedAt: a.menuItemsUpdatedAt };
      } else if (bMenu.length > 0 && aMenu.length === 0 && !a.menuItemsUpdatedAt) {
        mergedRestaurants[id] = { ...mergedRestaurants[id], menuItems: bMenu, menuItemsUpdatedAt: b.menuItemsUpdatedAt };
      } else if (aMenuTime > bMenuTime) {
        mergedRestaurants[id] = { ...mergedRestaurants[id], menuItems: aMenu, menuItemsUpdatedAt: a.menuItemsUpdatedAt };
      } else if (bMenuTime > aMenuTime) {
        mergedRestaurants[id] = { ...mergedRestaurants[id], menuItems: bMenu, menuItemsUpdatedAt: b.menuItemsUpdatedAt };
      }
    }
  }
  for (const [id, restOv] of Object.entries(mergedRestaurants)) {
    if (
      isFakeSeedRestaurantOverride(restOv) ||
      isRestaurantIdDeleted(id, restOv?.updatedAt, mergedDeletedRestaurants, restOv?.googlePlaceId)
    ) {
      delete mergedRestaurants[id];
    }
  }

  return {
    foods: mergeMaps(base.foods, incoming.foods || {}),
    restaurants: mergedRestaurants,
    deletedRestaurants: mergedDeletedRestaurants,
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
  const gallerySet = new Set([primaryPhoto, ...(dedupedGallery || [])].filter(Boolean));
  const overrideRecord: RestaurantMediaOverride = {
    id: rest.id,
    photoUrl: primaryPhoto,
    profileImage: primaryPhoto,
    galleryPhotos: dedupedGallery && dedupedGallery.length > 0 ? dedupedGallery : undefined,
    foodImages: Array.isArray(rest.foodImages)
      ? rest.foodImages.filter((g) => g && !gallerySet.has(g))
      : undefined,
    menuItems: rest.menuItems,
    menuItemsUpdatedAt: now,
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
    websiteUrl: rest.websiteUrl,
    businessCategory: rest.businessCategory,
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
  if (bundle.deletedRestaurants) {
    let tombChanged = false;
    if (bundle.deletedRestaurants[rest.id]) {
      delete bundle.deletedRestaurants[rest.id];
      tombChanged = true;
    }
    if (rest.googlePlaceId) {
      if (bundle.deletedRestaurants[`gplace:${rest.googlePlaceId}`]) {
        delete bundle.deletedRestaurants[`gplace:${rest.googlePlaceId}`];
        tombChanged = true;
      }
      if (bundle.deletedRestaurants[rest.googlePlaceId]) {
        delete bundle.deletedRestaurants[rest.googlePlaceId];
        tombChanged = true;
      }
    }
    if (tombChanged) {
      saveDeletedRestaurantIdsMap(bundle.deletedRestaurants);
    }
  }
  bundle.updatedAt = now;
  saveLocalMediaOverrides(bundle);
  syncSingleOverrideRecordToCloud('rest', rest.id, overrideRecord, bundle).catch(() => {});
}

/**
 * Remove a deleted restaurant from the permanent override vault and record a permanent deletion tombstone.
 */
export function removePermanentRestaurantOverride(restaurantId: string, extraKeys: string[] = []): void {
  const bundle = loadLocalMediaOverrides();
  const now = new Date().toISOString();
  if (!bundle.deletedRestaurants) {
    bundle.deletedRestaurants = loadDeletedRestaurantIdsMap();
  }
  bundle.deletedRestaurants[restaurantId] = now;
  const existingOv = bundle.restaurants[restaurantId];
  if (existingOv?.googlePlaceId) {
    bundle.deletedRestaurants[`gplace:${existingOv.googlePlaceId}`] = now;
    bundle.deletedRestaurants[existingOv.googlePlaceId] = now;
  }
  for (const extraKey of extraKeys) {
    if (extraKey) {
      bundle.deletedRestaurants[extraKey] = now;
      if (bundle.restaurants[extraKey]) {
        delete bundle.restaurants[extraKey];
      }
    }
  }
  saveDeletedRestaurantIdsMap(bundle.deletedRestaurants);
  if (bundle.restaurants[restaurantId]) {
    delete bundle.restaurants[restaurantId];
  }
  bundle.updatedAt = now;
  saveLocalMediaOverrides(bundle);
  const deletePromises: Promise<any>[] = [
    deleteCloudDocument(`${VAULT_KEYS.CLOUD_RECORD_PREFIX}rest_${restaurantId}`),
  ];
  for (const extraKey of extraKeys) {
    if (extraKey && !extraKey.startsWith('gplace:')) {
      deletePromises.push(deleteCloudDocument(`${VAULT_KEYS.CLOUD_RECORD_PREFIX}rest_${extraKey}`));
    }
  }
  Promise.allSettled(deletePromises).finally(() => {
    pushMediaOverridesToCloud(bundle).catch(() => {});
  });
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
 * Preserves item and array references when no overrides actually change any field.
 */
export function stripLegacyFoodPhraseKh(text?: string): string {
  if (!text) return '';
  return text.replace(/\s*តាមរូបមន្តប្រពៃណីខ្មែរពិតៗ/g, '').trim();
}

export function applyFoodOverrides(
  foods: FoodItem[],
  overridesMap: Record<string, FoodMediaOverride> = loadLocalMediaOverrides().foods
): FoodItem[] {
  const safeOverrides = overridesMap || {};
  let anyChanged = false;
  const mapped = foods.map((f) => {
    const cleanedBaseDescKh = stripLegacyFoodPhraseKh(f.descriptionKh);
    const ov = safeOverrides[f.id];
    if (!ov || !ov.photoUrl) {
      if (cleanedBaseDescKh !== (f.descriptionKh || '')) {
        anyChanged = true;
        return { ...f, descriptionKh: cleanedBaseDescKh };
      }
      return f;
    }
    const nextPhotoUrl = ov.photoUrl;
    const nextNameKh = ov.nameKh || f.nameKh;
    const nextNameEn = ov.nameEn || f.nameEn;
    const nextCategorySlug = ov.categorySlug || f.categorySlug;
    const nextCategoryKh = ov.categoryKh || f.categoryKh;
    const nextCategoryEn = ov.categoryEn || f.categoryEn;
    const nextDescriptionKh = stripLegacyFoodPhraseKh(ov.descriptionKh || cleanedBaseDescKh);
    const nextDescriptionEn = ov.descriptionEn || f.descriptionEn;
    const nextPriceRiel = typeof ov.priceRiel === 'number' ? ov.priceRiel : f.priceRiel;
    const nextPriceUsd = typeof ov.priceUsd === 'number' ? ov.priceUsd : f.priceUsd;
    const nextAuditStatus = ov.imageAuditStatus || 'verified';
    const nextAuditNote = ov.imageAuditNote || f.imageAuditNote;
    const nextPhotoUpdatedAt = ov.updatedAt;

    if (
      f.photoUrl === nextPhotoUrl &&
      f.nameKh === nextNameKh &&
      f.nameEn === nextNameEn &&
      f.categorySlug === nextCategorySlug &&
      f.categoryKh === nextCategoryKh &&
      f.categoryEn === nextCategoryEn &&
      f.descriptionKh === nextDescriptionKh &&
      f.descriptionEn === nextDescriptionEn &&
      f.priceRiel === nextPriceRiel &&
      f.priceUsd === nextPriceUsd &&
      f.imageAuditStatus === nextAuditStatus &&
      f.imageAuditNote === nextAuditNote &&
      f.isCustomPhoto === true &&
      f.photoUpdatedAt === nextPhotoUpdatedAt
    ) {
      return f;
    }

    anyChanged = true;
    return {
      ...f,
      photoUrl: nextPhotoUrl,
      nameKh: nextNameKh,
      nameEn: nextNameEn,
      categorySlug: nextCategorySlug,
      categoryKh: nextCategoryKh,
      categoryEn: nextCategoryEn,
      descriptionKh: nextDescriptionKh,
      descriptionEn: nextDescriptionEn,
      priceRiel: nextPriceRiel,
      priceUsd: nextPriceUsd,
      imageAuditStatus: nextAuditStatus,
      imageAuditNote: nextAuditNote,
      isCustomPhoto: true,
      photoUpdatedAt: nextPhotoUpdatedAt,
    };
  });
  return anyChanged ? mapped : foods;
}

/**
 * Apply permanent restaurant overrides on top of any restaurant list (seed or cached).
 * Preserves item and array references when no overrides actually change any field.
 */
export function applyRestaurantOverrides(
  restaurants: Restaurant[],
  overridesMap: Record<string, RestaurantMediaOverride> = loadLocalMediaOverrides().restaurants
): Restaurant[] {
  const deletedMap = loadLocalMediaOverrides().deletedRestaurants || loadDeletedRestaurantIdsMap();
  const hasDeleted = Object.keys(deletedMap).length > 0;
  const filteredBase = hasDeleted
    ? restaurants.filter(
        (r) => !isRestaurantIdDeleted(r.id, r.updatedAt || r.photoUpdatedAt || r.adminEditedAt || r.createdAt, deletedMap, r.googlePlaceId)
      )
    : restaurants;
  let anyChanged = filteredBase.length !== restaurants.length;
  if (!overridesMap || Object.keys(overridesMap).length === 0) return anyChanged ? filteredBase : restaurants;
  const seenIds = new Set<string>();
  const mapped = filteredBase.map((r) => {
    seenIds.add(r.id);
    const ov = overridesMap[r.id];
    if (!ov) return r;
    const rTime = Math.max(
      r.updatedAt ? new Date(r.updatedAt).getTime() || 0 : 0,
      r.photoUpdatedAt ? new Date(r.photoUpdatedAt).getTime() || 0 : 0,
      r.adminEditedAt ? new Date(r.adminEditedAt).getTime() || 0 : 0
    );
    const ovTime = ov.updatedAt ? new Date(ov.updatedAt).getTime() || 0 : 0;
    const rMenu = Array.isArray(r.menuItems) ? r.menuItems : [];
    const ovMenu = Array.isArray(ov.menuItems) ? ov.menuItems : [];
    const resolvedMenuItems =
      rTime > ovTime
        ? rMenu
        : ovMenu.length === 0 && rMenu.length > 0 && !ov.menuItemsUpdatedAt
        ? rMenu
        : Array.isArray(ov.menuItems)
        ? ovMenu
        : rMenu;
    const photoUrl = ov.photoUrl || ov.profileImage || r.photoUrl;
    const nextPhotoUpdatedAt = ovTime >= rTime ? (ov.updatedAt || r.photoUpdatedAt) : (r.photoUpdatedAt || ov.updatedAt);
    const nextUpdatedAt = ovTime >= rTime ? (ov.updatedAt || r.updatedAt) : (r.updatedAt || ov.updatedAt);
    const nextProfileImage = ov.profileImage || photoUrl;

    if (
      r.photoUrl === photoUrl &&
      r.profileImage === nextProfileImage &&
      r.isCustomPhoto === true &&
      r.photoUpdatedAt === nextPhotoUpdatedAt &&
      r.updatedAt === nextUpdatedAt &&
      r.nameKh === (ov.nameKh || r.nameKh) &&
      r.nameEn === (ov.nameEn || r.nameEn) &&
      r.descriptionKh === (ov.descriptionKh || r.descriptionKh) &&
      r.addressKh === (ov.addressKh || r.addressKh) &&
      r.provinceKh === (ov.provinceKh || r.provinceKh) &&
      r.phone === (ov.phone !== undefined ? ov.phone : r.phone) &&
      (r.menuItems || []).length === resolvedMenuItems.length &&
      (r.reviews || []).length === (Array.isArray(ov.reviews) ? ov.reviews : r.reviews || []).length
    ) {
      return r;
    }

    anyChanged = true;
    return {
      ...r,
      photoUrl,
      profileImage: nextProfileImage,
      galleryPhotos: Array.isArray(ov.galleryPhotos) && ov.galleryPhotos.length > 0
        ? Array.from(new Set([photoUrl, ...ov.galleryPhotos])).filter(Boolean)
        : (Array.isArray(r.galleryPhotos) && r.galleryPhotos.length > 0
            ? Array.from(new Set([photoUrl, ...r.galleryPhotos])).filter(Boolean)
            : [photoUrl].filter(Boolean)),
      foodImages: (() => {
        const gList = Array.isArray(ov.galleryPhotos) && ov.galleryPhotos.length > 0
          ? [photoUrl, ...ov.galleryPhotos]
          : [photoUrl, ...(r.galleryPhotos || [])];
        const gSet = new Set(gList.filter(Boolean));
        const rawFood = Array.isArray(ov.foodImages) ? ov.foodImages : (r.foodImages || []);
        return rawFood.filter((u: string) => u && !gSet.has(u));
      })(),
      menuItems: resolvedMenuItems,
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
      websiteUrl: ov.websiteUrl !== undefined ? ov.websiteUrl : r.websiteUrl,
      businessCategory: ov.businessCategory !== undefined ? ov.businessCategory : r.businessCategory,
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
      photoUpdatedAt: nextPhotoUpdatedAt,
      updatedAt: nextUpdatedAt,
    };
  });

  // Also append any custom VIP/Admin restaurants present in overridesMap that aren't in the list yet (excluding deleted restaurants)
  for (const [ovId, ov] of Object.entries(overridesMap)) {
    if (!seenIds.has(ovId) && ov && ov.nameKh && (ov.photoUrl || ov.profileImage) && !isRestaurantIdDeleted(ovId, ov.updatedAt, deletedMap, ov.googlePlaceId)) {
      anyChanged = true;
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
        websiteUrl: ov.websiteUrl,
        businessCategory: ov.businessCategory,
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

  return anyChanged ? mapped : restaurants;
}

/**
 * Apply permanent destination overrides on top of any destination list (seed or cached).
 * Compares override timestamps strictly against the immutable seed (`IMMUTABLE_SEED_DEST_MAP`)
 * so that `compactDataForBulkLocalStorage` can never cause a custom photo to revert to an older seed photo.
 * Preserves item and array references when no overrides actually change any field.
 */
export function applyDestinationOverrides(
  destinations: TouristDestination[],
  overridesMap: Record<string, DestinationMediaOverride> = loadLocalMediaOverrides().destinations
): TouristDestination[] {
  if (!overridesMap || Object.keys(overridesMap).length === 0) return destinations;
  const seenIds = new Set<string>();
  let anyChanged = false;
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
    const nextPhotoUpdatedAt = ovTime >= seedTime ? (ov.updatedAt || d.photoUpdatedAt) : (seedItem?.photoUpdatedAt || d.photoUpdatedAt);

    if (
      d.photoUrl === effectivePhotoUrl &&
      d.isCustomPhoto === true &&
      d.photoUpdatedAt === nextPhotoUpdatedAt &&
      d.nameKh === (ov.nameKh || d.nameKh) &&
      d.nameEn === (ov.nameEn || d.nameEn) &&
      d.descriptionKh === (ov.descriptionKh || d.descriptionKh) &&
      d.provinceKh === (ov.provinceKh || d.provinceKh) &&
      d.addressKh === (ov.addressKh || d.addressKh)
    ) {
      return d;
    }

    anyChanged = true;
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
      photoUpdatedAt: nextPhotoUpdatedAt,
    };
  });

  // Also append any custom/imported destinations present in overridesMap that aren't in the array yet
  for (const [ovId, ov] of Object.entries(overridesMap)) {
    if (!seenIds.has(ovId) && ov && ov.photoUrl && !isObsoleteSeedPhoto(ov.photoUrl) && ov.nameKh) {
      anyChanged = true;
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

  return anyChanged ? mapped : destinations;
}

/**
 * Apply permanent trending food overrides on top of any trending food list.
 * Preserves item and array references when no overrides actually change any field.
 */
export function applyTrendingFoodOverrides(
  items: TrendingFoodItem[],
  overridesMap: Record<string, TrendingFoodMediaOverride> = loadLocalMediaOverrides().trendingFoods
): TrendingFoodItem[] {
  if (!Array.isArray(items)) return [];
  const hasInvalid = items.some((item) => !item || !item.id);
  const validItems = hasInvalid ? items.filter((item): item is TrendingFoodItem => Boolean(item && item.id)) : items;
  if (!overridesMap || Object.keys(overridesMap).length === 0) return validItems;
  let anyChanged = hasInvalid;
  const mapped = validItems.map((item) => {
    const ov = overridesMap[item.id];
    if (!ov || !ov.photoUrl) return item;
    const nextPhotoUrl = ov.photoUrl || item.photoUrl;
    const nextFoodNameKh = ov.foodNameKh || item.foodNameKh;
    const nextFoodNameEn = ov.foodNameEn || item.foodNameEn;
    const nextRestNameKh = ov.restaurantNameKh || item.restaurantNameKh;
    const nextLocationKh = ov.locationKh || item.locationKh;
    const nextPriceRange = ov.priceRange || item.priceRange;
    if (
      item.photoUrl === nextPhotoUrl &&
      item.foodNameKh === nextFoodNameKh &&
      item.foodNameEn === nextFoodNameEn &&
      item.restaurantNameKh === nextRestNameKh &&
      item.locationKh === nextLocationKh &&
      item.priceRange === nextPriceRange
    ) {
      return item;
    }
    anyChanged = true;
    return {
      ...item,
      photoUrl: nextPhotoUrl,
      foodNameKh: nextFoodNameKh,
      foodNameEn: nextFoodNameEn,
      restaurantNameKh: nextRestNameKh,
      locationKh: nextLocationKh,
      priceRange: nextPriceRange,
    };
  });
  return anyChanged ? mapped : validItems;
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

let hasHydratedFromIdbOnce = false;
let mediaSyncInFlightPromise: Promise<AllMediaOverridesBundle> | null = null;
let lastMediaCloudSyncAtMs = 0;
let hasBackfilledPerRecordKeysOnce = false;
const MEDIA_CLOUD_SYNC_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes cooldown

/**
 * Fast local-only hydration from `localStorage` + `IndexedDB` (<15ms, zero network wait).
 * Called immediately on startup so custom photos stored in IndexedDB render before any network request.
 */
export async function hydrateFromLocalIdbImmediate(): Promise<AllMediaOverridesBundle> {
  if (inMemoryMasterBundle && hasHydratedFromIdbOnce) {
    return inMemoryMasterBundle;
  }
  let current = loadLocalMediaOverrides();
  try {
    const idbBundle = await loadBundleFromIdb();
    hasHydratedFromIdbOnce = true;
    if (idbBundle) {
      current = mergeOverrideBundles(current, idbBundle);
      inMemoryMasterBundle = current;
    }
  } catch {
    hasHydratedFromIdbOnce = true;
  }
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
export async function hydrateAndSyncMediaOverrides(forceCloud = false): Promise<AllMediaOverridesBundle> {
  if (mediaSyncInFlightPromise) {
    return mediaSyncInFlightPromise;
  }
  const now = Date.now();
  if (!forceCloud && lastMediaCloudSyncAtMs > 0 && now - lastMediaCloudSyncAtMs < MEDIA_CLOUD_SYNC_COOLDOWN_MS && inMemoryMasterBundle) {
    return inMemoryMasterBundle;
  }

  mediaSyncInFlightPromise = (async () => {
    let current = await hydrateFromLocalIdbImmediate();
    let hasRemoteChanges = false;

    // Merge from Supabase Cloud using manifest-first delta sync + chunked batching
    if (isSupabaseConfigured()) {
      try {
        lastMediaCloudSyncAtMs = Date.now();
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
              if (current.deletedRestaurants?.[id] || isRestaurantIdDeleted(id, undefined, current.deletedRestaurants)) {
                deleteCloudDocument(item.key).catch(() => {});
                continue;
              }
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
              if (row.updated_at) {
                const rowMs = new Date(row.updated_at).getTime() || 0;
                const payloadMs = payload.updatedAt ? new Date(payload.updatedAt).getTime() || 0 : 0;
                if (rowMs > payloadMs) {
                  payload.updatedAt = row.updated_at;
                }
              }
              hasRemoteChanges = true;
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
          if (hasRemoteChanges) {
            current = mergeOverrideBundles(current, perRecordBundle);
          }
        }

        // Also pull master bundle if manifest returned empty or had no per-record keys yet
        if (existingPerRecordKeys.size === 0) {
          const cloudBundle = await pullCloudDocument<AllMediaOverridesBundle>(VAULT_KEYS.CLOUD_DOC_KEY, 15000);
          if (cloudBundle) {
            hasRemoteChanges = true;
            current = mergeOverrideBundles(current, cloudBundle);
          }
        }

        // Per-record keys are written on Admin/owner save via syncSingleOverrideRecordToCloud
      } catch {}
    }

    if (inMemoryMasterBundle && hasRemoteChanges) {
      current = mergeOverrideBundles(current, inMemoryMasterBundle);
    }
    if (hasRemoteChanges) {
      saveLocalMediaOverrides(current);
    }
    return current;
  })();

  try {
    return await mediaSyncInFlightPromise;
  } finally {
    mediaSyncInFlightPromise = null;
  }
}
