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

import { FoodItem, Restaurant, TouristDestination, TrendingFoodItem, RestaurantMenuItem, RestaurantReview, RestaurantPriceLevel } from '../types';
import { isSupabaseConfigured, pullCloudDocument, pushCloudDocument } from './supabaseService';

export const VAULT_KEYS = {
  FOODS: 'kft_permanent_food_overrides_v1',
  RESTAURANTS: 'kft_permanent_restaurant_overrides_v1',
  DESTINATIONS: 'kft_permanent_destination_overrides_v1',
  DESTINATIONS_LEGACY: 'kft_destination_photo_overrides_v1',
  TRENDING_FOODS: 'kft_permanent_trending_food_overrides_v1',
  CLOUD_DOC_KEY: 'kft_cloud_media_overrides_v1',
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

function safeWriteJsonMap<T>(key: string, map: Record<string, T>): void {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch (e) {
    console.warn(`localStorage quota warning on ${key} (saved in IndexedDB & Cloud instead):`, e);
  }
}

export function loadLocalMediaOverrides(): AllMediaOverridesBundle {
  const foods = safeReadJsonMap<FoodMediaOverride>(VAULT_KEYS.FOODS);
  const restaurants = safeReadJsonMap<RestaurantMediaOverride>(VAULT_KEYS.RESTAURANTS);
  const destinations = safeReadJsonMap<DestinationMediaOverride>(VAULT_KEYS.DESTINATIONS);
  const legacyDest = safeReadJsonMap<{ photoUrl: string; updatedAt?: string }>(VAULT_KEYS.DESTINATIONS_LEGACY);
  const trendingFoods = safeReadJsonMap<TrendingFoodMediaOverride>(VAULT_KEYS.TRENDING_FOODS);

  // Merge legacy destination photo overrides into the unified destinations vault
  for (const [id, val] of Object.entries(legacyDest)) {
    if (val && val.photoUrl && !destinations[id]) {
      destinations[id] = {
        id,
        photoUrl: val.photoUrl,
        isCustomPhoto: true,
        updatedAt: val.updatedAt || new Date().toISOString(),
      };
    }
  }

  return {
    foods,
    restaurants,
    destinations,
    trendingFoods,
    updatedAt: new Date().toISOString(),
  };
}

export function saveLocalMediaOverrides(bundle: AllMediaOverridesBundle): void {
  safeWriteJsonMap(VAULT_KEYS.FOODS, bundle.foods);
  safeWriteJsonMap(VAULT_KEYS.RESTAURANTS, bundle.restaurants);
  safeWriteJsonMap(VAULT_KEYS.DESTINATIONS, bundle.destinations);
  safeWriteJsonMap(VAULT_KEYS.DESTINATIONS_LEGACY, bundle.destinations);
  safeWriteJsonMap(VAULT_KEYS.TRENDING_FOODS, bundle.trendingFoods);
  saveBundleToIdb(bundle).catch(() => {});
}

export function mergeOverrideBundles(
  base: AllMediaOverridesBundle,
  incoming: Partial<AllMediaOverridesBundle> | null | undefined
): AllMediaOverridesBundle {
  if (!incoming) return base;

  const mergeMaps = <T extends { updatedAt?: string }>(
    a: Record<string, T> = {},
    b: Record<string, T> = {}
  ): Record<string, T> => {
    const out: Record<string, T> = { ...a };
    for (const [id, itemB] of Object.entries(b)) {
      if (!itemB) continue;
      const itemA = out[id];
      if (!itemA) {
        out[id] = itemB;
      } else {
        const timeA = itemA.updatedAt ? new Date(itemA.updatedAt).getTime() : 0;
        const timeB = itemB.updatedAt ? new Date(itemB.updatedAt).getTime() : 0;
        out[id] = timeB >= timeA ? { ...itemA, ...itemB } : { ...itemB, ...itemA };
      }
    }
    return out;
  };

  return {
    foods: mergeMaps(base.foods, incoming.foods || {}),
    restaurants: mergeMaps(base.restaurants, incoming.restaurants || {}),
    destinations: mergeMaps(base.destinations, incoming.destinations || {}),
    trendingFoods: mergeMaps(base.trendingFoods, incoming.trendingFoods || {}),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Record an Admin or authorized user update to a FoodItem permanently.
 */
export function recordPermanentFoodOverride(food: FoodItem): void {
  const bundle = loadLocalMediaOverrides();
  const now = food.photoUpdatedAt || new Date().toISOString();
  bundle.foods[food.id] = {
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
  bundle.updatedAt = now;
  saveLocalMediaOverrides(bundle);
  pushMediaOverridesToCloud(bundle).catch(() => {});
}

/**
 * Record an Admin or VIP shop owner update to a Restaurant permanently.
 */
export function recordPermanentRestaurantOverride(rest: Restaurant): void {
  const bundle = loadLocalMediaOverrides();
  const now = new Date().toISOString();
  const primaryPhoto = rest.profileImage || rest.photoUrl;
  bundle.restaurants[rest.id] = {
    id: rest.id,
    photoUrl: primaryPhoto,
    profileImage: primaryPhoto,
    galleryPhotos: rest.galleryPhotos,
    foodImages: rest.foodImages,
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
    isCustomPhoto: true,
    updatedAt: now,
  };
  bundle.updatedAt = now;
  saveLocalMediaOverrides(bundle);
  pushMediaOverridesToCloud(bundle).catch(() => {});
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
    pushMediaOverridesToCloud(bundle).catch(() => {});
  }
}

/**
 * Record an Admin update to a TouristDestination permanently.
 */
export function recordPermanentDestinationOverride(dest: TouristDestination): void {
  const bundle = loadLocalMediaOverrides();
  const now = dest.photoUpdatedAt || new Date().toISOString();
  bundle.destinations[dest.id] = {
    id: dest.id,
    photoUrl: dest.photoUrl,
    galleryPhotos: dest.galleryPhotos,
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
    isCustomPhoto: true,
    updatedAt: now,
  };
  bundle.updatedAt = now;
  saveLocalMediaOverrides(bundle);
  pushMediaOverridesToCloud(bundle).catch(() => {});
}

/**
 * Record an Admin update to a TrendingFoodItem permanently.
 */
export function recordPermanentTrendingFoodOverride(item: TrendingFoodItem): void {
  const bundle = loadLocalMediaOverrides();
  const now = new Date().toISOString();
  bundle.trendingFoods[item.id] = {
    id: item.id,
    photoUrl: item.photoUrl,
    foodNameKh: item.foodNameKh,
    foodNameEn: item.foodNameEn,
    restaurantNameKh: item.restaurantNameKh,
    locationKh: item.locationKh,
    priceRange: item.priceRange,
    updatedAt: now,
  };
  bundle.updatedAt = now;
  saveLocalMediaOverrides(bundle);
  pushMediaOverridesToCloud(bundle).catch(() => {});
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
    if (!ov || !ov.photoUrl) return d;
    return {
      ...d,
      photoUrl: ov.photoUrl,
      galleryPhotos: Array.isArray(ov.galleryPhotos) && ov.galleryPhotos.length > 0 ? ov.galleryPhotos : d.galleryPhotos,
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
 * Push media overrides bundle to Supabase Cloud.
 */
export async function pushMediaOverridesToCloud(bundle?: AllMediaOverridesBundle): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const toPush = bundle || loadLocalMediaOverrides();
  return pushCloudDocument(VAULT_KEYS.CLOUD_DOC_KEY, toPush);
}

/**
 * Hydrate and synchronize permanent media overrides from IndexedDB and Supabase Cloud.
 */
export async function hydrateAndSyncMediaOverrides(): Promise<AllMediaOverridesBundle> {
  let current = loadLocalMediaOverrides();

  // 1. Merge from IndexedDB (in case localStorage was cleared or hit 5MB limit)
  try {
    const idbBundle = await loadBundleFromIdb();
    if (idbBundle) {
      current = mergeOverrideBundles(current, idbBundle);
    }
  } catch {}

  // 2. Merge from Supabase Cloud (ensures reinstalls and new versions keep all Admin changes)
  if (isSupabaseConfigured()) {
    try {
      const cloudBundle = await pullCloudDocument<AllMediaOverridesBundle>(VAULT_KEYS.CLOUD_DOC_KEY);
      if (cloudBundle) {
        current = mergeOverrideBundles(current, cloudBundle);
      }
      // Push merged bundle back to cloud if we have any overrides
      const totalOverrides =
        Object.keys(current.foods).length +
        Object.keys(current.restaurants).length +
        Object.keys(current.destinations).length +
        Object.keys(current.trendingFoods).length;
      if (totalOverrides > 0) {
        await pushCloudDocument(VAULT_KEYS.CLOUD_DOC_KEY, current);
      }
    } catch {}
  }

  saveLocalMediaOverrides(current);
  return current;
}
