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
import { isSupabaseConfigured, pullCloudDocument, pushCloudDocument, pullCloudDocumentsByPrefix, deleteCloudDocument } from './supabaseService';

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

export function saveLocalMediaOverrides(bundle: AllMediaOverridesBundle): void {
  inMemoryMasterBundle = bundle;
  // Remove duplicate legacy key first to maximize available localStorage space
  try {
    localStorage.removeItem(VAULT_KEYS.DESTINATIONS_LEGACY);
  } catch {}
  safeWriteJsonMap(VAULT_KEYS.FOODS, bundle.foods);
  safeWriteJsonMap(VAULT_KEYS.RESTAURANTS, bundle.restaurants);
  safeWriteJsonMap(VAULT_KEYS.DESTINATIONS, bundle.destinations);
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
  const now = food.photoUpdatedAt || new Date().toISOString();
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
  const now = dest.photoUpdatedAt || new Date().toISOString();
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
  return restaurants.map((r) => {
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
    };
  });
}

/**
 * Apply permanent destination overrides on top of any destination list (seed or cached).
 */
export function applyDestinationOverrides(
  destinations: TouristDestination[],
  overridesMap: Record<string, DestinationMediaOverride> = loadLocalMediaOverrides().destinations
): TouristDestination[] {
  if (!overridesMap || Object.keys(overridesMap).length === 0) return destinations;
  return destinations.map((d) => {
    const ov = overridesMap[d.id];
    if (!ov || !ov.photoUrl || isObsoleteSeedPhoto(ov.photoUrl)) return d;
    return {
      ...d,
      photoUrl: ov.photoUrl,
      galleryPhotos:
        Array.isArray(ov.galleryPhotos) && ov.galleryPhotos.length > 0
          ? [ov.photoUrl, ...ov.galleryPhotos.filter((g) => g && g !== ov.photoUrl)]
          : [ov.photoUrl],
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
      photoUpdatedAt: ov.updatedAt,
    };
  });
}

/**
 * Apply permanent trending food overrides on top of any trending food list.
 */
export function applyTrendingFoodOverrides(
  items: TrendingFoodItem[],
  overridesMap: Record<string, TrendingFoodMediaOverride> = loadLocalMediaOverrides().trendingFoods
): TrendingFoodItem[] {
  if (!overridesMap || Object.keys(overridesMap).length === 0) return items;
  return items.map((item) => {
    const ov = overridesMap[item.id];
    if (!ov || !ov.photoUrl) return item;
    return {
      ...item,
      photoUrl: ov.photoUrl,
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
 * Hydrate and synchronize permanent media overrides from:
 *   1. In-memory master cache (`inMemoryMasterBundle`)
 *   2. LocalStorage (`VAULT_KEYS`)
 *   3. IndexedDB (`kft_permanent_media_vault_idb_v1`)
 *   4. Supabase Cloud Master Bundle (`kft_cloud_media_overrides_v1`)
 *   5. Supabase Cloud Atomic Per-Record Keys (`kft_ov_food_*`, `kft_ov_rest_*`, `kft_ov_dest_*`, `kft_ov_trend_*`)
 */
export async function hydrateAndSyncMediaOverrides(): Promise<AllMediaOverridesBundle> {
  let current = loadLocalMediaOverrides();

  // 1. Merge from IndexedDB (immune to 5MB localStorage quota limit)
  try {
    const idbBundle = await loadBundleFromIdb();
    if (idbBundle) {
      current = mergeOverrideBundles(current, idbBundle);
    }
  } catch {}

  // 2. Merge from Supabase Cloud (both master bundle AND atomic per-record rows)
  if (isSupabaseConfigured()) {
    try {
      const [cloudBundle, perRecordRows] = await Promise.all([
        pullCloudDocument<AllMediaOverridesBundle>(VAULT_KEYS.CLOUD_DOC_KEY, 12000),
        pullCloudDocumentsByPrefix<any>(VAULT_KEYS.CLOUD_RECORD_PREFIX, 12000),
      ]);

      if (cloudBundle) {
        current = mergeOverrideBundles(current, cloudBundle);
      }

      const existingPerRecordKeys = new Set<string>();
      if (Array.isArray(perRecordRows) && perRecordRows.length > 0) {
        const perRecordBundle: AllMediaOverridesBundle = {
          foods: {},
          restaurants: {},
          destinations: {},
          trendingFoods: {},
          updatedAt: new Date().toISOString(),
        };
        for (const row of perRecordRows) {
          existingPerRecordKeys.add(row.key);
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
        current = mergeOverrideBundles(current, perRecordBundle);
      }

      // Backfill any missing atomic per-record keys in Supabase so every existing override has its own isolated cloud row
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

      // Push merged master bundle back to cloud if we have any overrides
      const totalOverrides =
        Object.keys(current.foods).length +
        Object.keys(current.restaurants).length +
        Object.keys(current.destinations).length +
        Object.keys(current.trendingFoods).length;
      if (totalOverrides > 0) {
        await pushCloudDocument(VAULT_KEYS.CLOUD_DOC_KEY, current, 15000);
      }
    } catch {}
  }

  saveLocalMediaOverrides(current);
  return current;
}
