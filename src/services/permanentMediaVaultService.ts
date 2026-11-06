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

import {
  FoodItem,
  Restaurant,
  TouristDestination,
  TrendingFoodItem,
  RestaurantMenuItem,
  RestaurantReview,
  RestaurantPriceLevel,
  GoogleMapsPlaceMetadata,
  ShopPhotoReplacementRequest,
  PendingListingUpgradeRequest,
  LocationVerificationStatus,
  APP_BUILD_CODE,
  SEED_FOOD_PHOTO_BASELINE_ISO,
  SEED_FOOD_PHOTO_BASELINE_MS,
  EXCEL_BAKED_FOOD_PHOTO_TIMESTAMPS,
  isSeedRestaurantId,
  isValidCambodiaCoordinates,
  isValidOfficialGooglePlaceId,
  isStrictVerifiedCambodiaRestaurant,
  buildCanonicalGoogleMapsPinUrl,
  sanitizeVerifiedShopPhotoUrl,
  sanitizeRestaurantShopPhoto,
  sanitizeRestaurantGalleryPhotos,
  isValidGoogleMapsUrl,
  computeFastPhotoSignature,
  inferBusinessTypeAndCategory,
} from '../types';
import { initial100Destinations } from '../data/seedDestinations';
import { initial200Foods } from '../data/seedFoods';
import { initial100Restaurants } from '../data/seedRestaurants';
import {
  generateAuthenticRecipeByDishName,
  hasPlaceholderOrIncompleteRecipe,
  areIngredientsIdentical,
  areStepsIdentical,
} from '../utils/khmerRecipeGenerator';
import {
  isSupabaseConfigured,
  isSupabaseEgressCooldownActive,
  resetSupabaseEgressCooldown,
  pullCloudDocument,
  pushCloudDocument,
  pullCloudDocumentsByPrefix,
  pullCloudKeysManifestByPrefix,
  pullCloudDocumentsByKeys,
  deleteCloudDocument,
  uploadBase64ImageToSupabaseStorage,
} from './supabaseService';

const IMMUTABLE_SEED_DEST_MAP = new Map<string, TouristDestination>(
  initial100Destinations.map((d) => [d.id, d])
);

const IMMUTABLE_SEED_FOOD_MAP = new Map<string, FoodItem>(
  initial200Foods.map((f) => [f.id, f])
);

const IMMUTABLE_SEED_REST_MAP = new Map<string, Restaurant>(
  initial100Restaurants.map((r) => [r.id, r])
);
// Authoritative baseline timestamp for bundled `/foods/food-*.jpg` assets
export { SEED_FOOD_PHOTO_BASELINE_ISO, SEED_FOOD_PHOTO_BASELINE_MS };
const BAKED_STATIC_FOOD_ASSETS_MS = SEED_FOOD_PHOTO_BASELINE_MS;

export const DEPRECATED_STALE_FOOD_NAMES_KH = new Set<string>([
  'បបរគ្រឿងសាច់ជ្រូកខ្មែរ',
  'នំផ្លែអាយស្ករត្នោត',
  'ក្រឡានប្ញស្សីថ្មគោលបាត់ដំបង',
  'សម្លម្ជូរទំពាំងត្រីឆ្អើរ',
  'ម៉ាំល្ហុងសាច់ជ្រូកបីជាន់',
  'ព្រៃត្រីអណ្តែងទំពាំងត្រាំ',
  'ខ ប្រហុកត្រីពោធិ៍',
  'មីឆាគ្រឿងសមុទ្របែបខ្មែរ',
  'នំបញ្ចុកទឹកត្រីផ្អែម',
  'ខគោ នំប៉័ង',
  'បាញ់កាញ់ទឹកខ្ទិះត្រីរ៉ស់',
  'គួងបង្គាសាច់ជ្រូកលាយបង្គារទឹកជ្រលក់សណ្តែកដី',
  'ចាដូវបំពងស្នូលត្រាវសាច់ជ្រូក',
  'សាច់ជ្រូកចំហុយពងត្រី និងពងទាប្រៃ',
  'បង្អែមល្ពៅសង់ខ្យាខ្ទិះដូង',
  'នំផ្លែអាយស្ករត្នោតដូងកោស',
  'បាយសាច់ជ្រូកអាំង',
  'ការីក្រហមសាច់ទាដំឡូងជ្វា',
  'សម្លម្ជូរក្តាន់ត្រីអណ្តែង',
  'សម្លកកូរត្នោតសាច់ជ្រូកបីជាន់',
  'សម្លប្រហើរត្រីឆ្អើរស្លឹកម្រុំ',
  'សម្លម្ជូរត្រកួនត្រីប្រាទន្លេមេគង្គ',
  'សម្លខ្ទិះម្នាស់សាច់ជ្រូកបីជាន់',
  'សម្លម្ជូរស្លឹកថ្នឹងសាច់មាន់ស្រែ',
  'សម្លស្ងោរត្រឡាចសាច់ជ្រូកចិញ្ច្រាំ',
  'ត្រីរ៉ស់ដុតអំបិលគល់ស្លឹកគ្រៃ',
  'សាច់គោអាំងទឹកប្រហុកខ្ទិះ',
  'ត្រីអណ្តែងអាំងទឹកត្រីអំពិលទុំ',
  'ស្លាបមាន់អាំងរមៀតស្លឹកគ្រៃ',
  'ត្រីងៀតអាំងទឹកត្រីអំពិលទុំ',
  'ទាដុតម្រេចកំពត',
  'ពោតបារាំង និងត្រប់អាំងទឹកប្រហុក',
  'ឆាខ្ញីសាច់ទា',
  'ឆាផ្កាខាត់ណាបង្គាស្រស់',
  'ឆាគ្រឿងអន្ទង់ម្រះព្រៅហឹរ',
  'ឆាបង្គាពោតបារាំងខ្ទឹមស',
  'ឆាផ្សិតអំបោះសាច់ទ្រូងមាន់',
  'ខត្រីពោធិ៍ទឹកដូងម្រេចកំពត',
  'ញាំត្រយូងចេកសាច់មាន់ស្រែ',
  'ញាំមីសួរគ្រឿងសមុទ្របង្គាមឹក',
  'ភ្លាបង្គាស្រស់ម្រះខ្ចី',
  'ញាំស្តៅត្រីឆ្អើរសាច់ជ្រូកបីជាន់',
  'ញាំគល់ស្លឹកគ្រៃបង្គាសាច់ជ្រូកចិញ្ច្រាំ',
  'ប្រហុកខ្ទិះសាច់ជ្រូកចិញ្ច្រាំបន្លែស្រស់',
  'គុយទាវទូកសាច់គោប្រហិត',
  'លតឆាបង្គាពងទាចៀន',
  'មីគោកសាច់ជ្រូកសាស៊ីវគាវបំពង',
  'នំបញ្ចុកទឹកប្រហុកត្រីឆ្អើរ',
  'មីសួរអប់ក្តាមសេះម្រេចកំពត',
  'បាញ់កាញ់ទឹកស៊ុបឆ្អឹងជ្រូកឈាមជ្រូក',
  'បាយឆាក្តាមសេះពងទាប្រៃ',
  'បាយសាច់ជ្រូកអាំងពងទាខជ្រក់ល្ហុង',
  'បាយមាន់ស្ងោរទឹកត្រីខ្ញី',
  'បាយឆាគ្រាប់ឈូកសាច់ក្រក',
  'បាយដំណើបសាច់គោងៀតជ្រក់ល្ហុង',
  'បាយអប់ឆ្នាំងដីគ្រឿងសមុទ្រម្រេចខ្ចី',
  'ប្រហិតសាច់គោអាំងទឹកត្រីអំពិលទុំ',
  'គួងបង្គាសាច់ជ្រូកទឹកជ្រលក់សណ្តែកដី',
  'បង្អែមចេកខ្ទិះគ្រាប់សាគូ',
  'បង្អែមត្រាវកូរខ្ទិះដូង',
  'ទឹកក្រឡុកស្រកានាគក្រហមទឹកដោះគោស្រស់',
  'សម្លការីសារ៉ាម៉ាន់សាច់គោ',
  'សម្លកកូរត្រីឆ្លូញចេកខ្ចី',
  'ញាំក្រូចថ្លុងបង្គាស្រស់',
  'បង្អែមនំផ្លែអាយការ៉េមខ្ទិះដូងស្ករត្នោត',
  'សម្លការីទាស្រែ',
  'ឆាត្រកួនប្រហុកខ្ទឹមស',
  'សម្លការីសាច់ទាដំឡូងជ្វា',
  'នំគ្រក់ខ្ទិះដូងស្លឹកខ្ទឹមទឹកត្រីផ្អែម',
  'មីឆាសាច់គោពងទាចៀន',
  'សម្លប្រហើរននោងបង្គាស្រស់',
  'ញាំត្រសក់ត្រីឆ្អើរ',
  'បុកល្ហុងសាច់ជ្រូកបីជាន់បំពងស្រួយ',
  'មីសួរស៊ុបប្រហិតសាច់ជ្រូក',
  'ឆាគ្រឿងអន្ទង់',
  'ឆាគ្រឿងអន្ទង់ស្លឹកម្រះព្រៅ',
  'ឆាខ្ញីសាច់ជ្រូកខ្មែរ',
  'ឆាសាច់គោម្រះព្រៅម្ទេសហឹរ',
  'បាយឆាម្រះព្រៅសាច់ជ្រូក',
  'ត្រីអណ្តែងអាំងទឹកត្រីអម្ពិលទុំ',
  'ត្រីងៀតអាំងជ្រលក់ទឹកអម្ពិលទុំ',
  'ស៊ុបពោះគោឆ្នាំងដី',
  'ត្រីរ៉ស់អាំងអំបិលម្ទេស',
  'គុយទាវគ្រឿងក្នុងសាច់ជ្រូកបីជាន់',
  'ត្រីអណ្តែងអាំងទឹកត្រីស្វាយ',
  'ត្រីផ្ទក់អាំងអំបិលម្ទេសបាយក្ដៅ',
  'គួងបង្គាសាច់ជ្រូកទឹកជ្រលក់សណ្តែកដី',
]);

export function isDeprecatedStaleFoodMetadata(
  foodId: string,
  nameKh?: string,
  categorySlug?: string
): boolean {
  if (nameKh) {
    const trimmed = nameKh.trim();
    if (DEPRECATED_STALE_FOOD_NAMES_KH.has(trimmed)) {
      return true;
    }
    if (trimmed.includes('កែងស') || /[\u0E00-\u0E7F\u0C80-\u0CFF]/.test(trimmed)) {
      return true;
    }
  }
  if (foodId === 'food-187' && categorySlug === 'dessert') {
    return true;
  }
  const numId = foodId.startsWith('food-') ? parseInt(foodId.slice(5), 10) : 0;
  if (numId >= 201 && numId <= 230) {
    const seed = IMMUTABLE_SEED_FOOD_MAP.get(foodId);
    if (seed && nameKh && nameKh.trim() !== seed.nameKh.trim()) {
      return true;
    }
  }
  return false;
}

export function isGenuineCustomPhotoUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || isLegacyAutoScrapedFoodPlaceholderUrl(trimmed)) return false;
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  );
}

export function isLegacyAutoScrapedFoodPlaceholderUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.trim().toLowerCase();
  return (
    lower.includes('themealdb.com') ||
    lower.includes('loremflickr.com') ||
    lower.includes('picsum.photos') ||
    lower.includes('source.unsplash.com') ||
    lower.includes('placehold.co') ||
    lower.includes('via.placeholder.com')
  );
}

export function getSeedFoodPhotoBaselineMs(foodId: string): number {
  const excelBakedIso = EXCEL_BAKED_FOOD_PHOTO_TIMESTAMPS[foodId];
  const excelBakedMs = excelBakedIso ? Date.parse(excelBakedIso) || 0 : 0;
  const seedFood = IMMUTABLE_SEED_FOOD_MAP.get(foodId);
  if (!seedFood || !seedFood.photoUrl?.startsWith('/foods/')) {
    return excelBakedMs;
  }
  const seedPhotoMs = seedFood.photoUpdatedAt ? Date.parse(seedFood.photoUpdatedAt) || 0 : 0;
  return Math.max(SEED_FOOD_PHOTO_BASELINE_MS, seedPhotoMs, excelBakedMs);
}

export function isRejectedLegacyFoodOverridePhoto(
  foodId: string,
  ov?: {
    photoUrl?: string;
    nameKh?: string;
    categorySlug?: string;
    updatedAt?: string;
    adminApprovedAt?: string;
    revision?: number;
    isCustomPhoto?: boolean;
  } | null
): boolean {
  if (!ov || typeof ov.photoUrl !== 'string' || !ov.photoUrl.trim()) {
    return true;
  }
  if (isLegacyAutoScrapedFoodPlaceholderUrl(ov.photoUrl) || ov.photoUrl.startsWith('/restaurants/')) {
    return true;
  }
  // Reject any stale pre-baseline cached/cloud override (older than SEED_FOOD_PHOTO_BASELINE_MS, seed photoUpdatedAt,
  // or PC Excel Template bake timestamp) so outdated food pictures can NEVER resurrect!
  const baselineMs = getSeedFoodPhotoBaselineMs(foodId);
  if (baselineMs > 0) {
    const ovEffectiveMs = Math.max(
      ov.adminApprovedAt ? Date.parse(ov.adminApprovedAt) || 0 : 0,
      ov.updatedAt ? Date.parse(ov.updatedAt) || 0 : 0
    );
    if (ovEffectiveMs <= 0 || ovEffectiveMs < baselineMs) {
      return true;
    }
  }
  if (isDeprecatedStaleFoodMetadata(foodId, ov.nameKh, ov.categorySlug)) {
    return true;
  }
  // Never reject any genuine custom base64, blob, or cloud storage URL uploaded by Admin!
  if (isGenuineCustomPhotoUrl(ov.photoUrl)) {
    return false;
  }
  const seedFood = IMMUTABLE_SEED_FOOD_MAP.get(foodId);
  if (seedFood && ov.photoUrl.startsWith('/foods/')) {
    if (isDeprecatedStaleFoodMetadata(foodId, ov.nameKh, ov.categorySlug)) {
      return true;
    }
    const cleanOvBase = ov.photoUrl.split('?')[0].trim();
    const cleanSeedBase = (seedFood.photoUrl || '').split('?')[0].trim();
    if (cleanOvBase !== cleanSeedBase) {
      return true;
    }
    if (!ov.isCustomPhoto && Number(ov.revision || 0) <= 0 && !ov.adminApprovedAt) {
      return true;
    }
  }
  return false;
}

export const VAULT_KEYS = {
  FOODS: 'kft_permanent_food_overrides_v1',
  DELETED_FOODS: 'kft_deleted_foods_v1',
  FOOD_REVISION_LEDGER: 'kft_food_revision_ledger_v1',
  PENDING_CLOUD_QUEUE: 'kft_pending_media_cloud_queue_v1',
  CLOUD_ROW_SEEN: 'kft_cloud_row_seen_v1',
  LAST_SYNCED_BUILD: 'kft_media_vault_last_build_v1',
  RESTAURANTS: 'kft_permanent_restaurant_overrides_v1',
  DELETED_RESTAURANTS: 'kft_deleted_restaurants_v1',
  DESTINATIONS: 'kft_permanent_destination_overrides_v1',
  DELETED_DESTINATIONS: 'kft_deleted_destinations_v1',
  DESTINATIONS_LEGACY: 'kft_destination_photo_overrides_v1',
  TRENDING_FOODS: 'kft_permanent_trending_food_overrides_v1',
  CLOUD_DOC_KEY: 'kft_cloud_media_overrides_v1',
  CLOUD_RECORD_PREFIX: 'kft_ov_',
  TOMBSTONES_CLOUD_KEY: 'kft_ov_tombstones_v1',
} as const;

export interface FoodRevisionLedgerEntry {
  revision: number;
  updatedAt: string;
  photoHash: string;
  cloudSynced?: boolean;
  cloudUrl?: string;
}

export interface PendingMediaCloudQueueItem {
  category: 'food' | 'rest' | 'dest' | 'trend';
  id: string;
  revision: number;
  queuedAt: string;
}

export interface FoodMediaOverride {
  id: string;
  photoUrl: string;
  cloudStorageUrl?: string;
  photoHash?: string;
  revision?: number;
  adminApprovedAt?: string;
  nameKh?: string;
  nameEn?: string;
  categorySlug?: FoodItem['categorySlug'];
  categoryKh?: string;
  categoryEn?: string;
  descriptionKh?: string;
  descriptionEn?: string;
  cookTime?: string;
  servings?: string;
  calories?: number;
  difficulty?: FoodItem['difficulty'];
  ingredients?: FoodItem['ingredients'];
  steps?: FoodItem['steps'];
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
  addressEn?: string;
  provinceKh?: string;
  provinceEn?: string;
  phone?: string;
  openingHoursKh?: string;
  openingHoursEn?: string;
  signatureDishesKh?: string[];
  priceLevel?: RestaurantPriceLevel;
  promoVideoUrl?: string;
  telegramUrl?: string;
  facebookUrl?: string;
  websiteUrl?: string;
  businessCategory?: string;
  businessType?: 'restaurant' | 'hotel';
  categoryKh?: string;
  categoryEn?: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  mapUrl?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
  dataSource?: Restaurant['dataSource'];
  googleMapsMeta?: GoogleMapsPlaceMetadata;
  locationVerificationStatus?: LocationVerificationStatus;
  locationNeedsReview?: boolean;
  locationReviewNote?: string;
  locationVerifiedAt?: string;
  status?: Restaurant['status'];
  isVerified?: boolean;
  isPromoted?: boolean;
  isFeatured?: boolean;
  membershipTier?: Restaurant['membershipTier'];
  membershipExpiresAt?: string;
  storeSlotNumber?: number;
  approvedAt?: string;
  featuredFromAt?: string;
  featuredUntilAt?: string;
  createdAt?: string;
  created_at?: string;
  paymentStatus?: Restaurant['paymentStatus'];
  isAdminEdited?: boolean;
  adminEditedAt?: string;
  pendingPhotoReplacement?: ShopPhotoReplacementRequest;
  pendingUpgradeRequest?: PendingListingUpgradeRequest;
  isCustomPhoto: boolean;
  updatedAt: string;
}

export interface DestinationMediaOverride {
  id: string;
  photoUrl: string;
  photoHash?: string;
  revision?: number;
  adminApprovedAt?: string;
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
  locationVerificationStatus?: LocationVerificationStatus;
  locationNeedsReview?: boolean;
  locationReviewNote?: string;
  locationVerifiedAt?: string;
  isAdminEdited?: boolean;
  adminEditedAt?: string;
  pendingPhotoReplacement?: ShopPhotoReplacementRequest;
  pendingUpgradeRequest?: PendingListingUpgradeRequest;
  isCustomPhoto: boolean;
  updatedAt: string;
}

export interface TrendingFoodMediaOverride {
  id: string;
  photoUrl: string;
  photoHash?: string;
  revision?: number;
  adminApprovedAt?: string;
  foodNameKh?: string;
  foodNameEn?: string;
  restaurantNameKh?: string;
  locationKh?: string;
  priceRange?: string;
  updatedAt: string;
}

export interface AllMediaOverridesBundle {
  foods: Record<string, FoodMediaOverride>;
  deletedFoods?: Record<string, string>;
  restaurants: Record<string, RestaurantMediaOverride>;
  deletedRestaurants?: Record<string, string>;
  destinations: Record<string, DestinationMediaOverride>;
  deletedDestinations?: Record<string, string>;
  trendingFoods: Record<string, TrendingFoodMediaOverride>;
  updatedAt: string;
}

const IDB_NAME = 'kft_permanent_media_vault_idb_v1';

export function loadDeletedFoodIdsMap(): Record<string, string> {
  return safeReadJsonMap<string>(VAULT_KEYS.DELETED_FOODS);
}

export function saveDeletedFoodIdsMap(map: Record<string, string>): void {
  safeWriteJsonMap(VAULT_KEYS.DELETED_FOODS, map);
}

export function loadDeletedRestaurantIdsMap(): Record<string, string> {
  return safeReadJsonMap<string>(VAULT_KEYS.DELETED_RESTAURANTS);
}

export function saveDeletedRestaurantIdsMap(map: Record<string, string>): void {
  safeWriteJsonMap(VAULT_KEYS.DELETED_RESTAURANTS, map);
}

export function loadDeletedDestinationIdsMap(): Record<string, string> {
  return safeReadJsonMap<string>(VAULT_KEYS.DELETED_DESTINATIONS);
}

export function saveDeletedDestinationIdsMap(map: Record<string, string>): void {
  safeWriteJsonMap(VAULT_KEYS.DELETED_DESTINATIONS, map);
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

export function isDestinationIdDeleted(
  destId: string,
  _itemTimestampIso?: string,
  deletedMap: Record<string, string> = loadDeletedDestinationIdsMap(),
  googlePlaceId?: string
): boolean {
  if (!deletedMap) return false;
  if (destId && deletedMap[destId]) return true;
  if (googlePlaceId && (deletedMap[`gplace:${googlePlaceId}`] || deletedMap[googlePlaceId])) return true;
  return false;
}
const IDB_STORE = 'media_overrides';
const IDB_BUNDLE_KEY = 'master_bundle';
const IDB_PENDING_QUEUE_KEY = 'pending_cloud_queue';
const IDB_TOMBSTONES_KEY = 'tombstones:v1';

let hasHydratedFromIdbOnce = false;

function getIndexedDbFactory(): IDBFactory | null {
  try {
    if (typeof globalThis !== 'undefined' && 'indexedDB' in globalThis && globalThis.indexedDB) {
      return globalThis.indexedDB;
    }
    if (typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB) {
      return window.indexedDB;
    }
  } catch {}
  return null;
}

function openVaultIdb(): Promise<IDBDatabase | null> {
  const idbFactory = getIndexedDbFactory();
  if (!idbFactory) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = idbFactory.open(IDB_NAME, 1);
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

/**
 * Atomic per-record IndexedDB write (`food:<id>`, `trend:<id>`, `rest:<id>`, `dest:<id>`)
 * Completes in <2ms without serializing a 25MB master bundle, guaranteeing immediate durability.
 */
export async function saveSingleRecordToIdb(recordKey: string, payload: any): Promise<boolean> {
  const db = await openVaultIdb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const getReq = store.get(recordKey);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (existing && typeof existing === 'object' && payload && typeof payload === 'object') {
          const exRev = Number(existing.revision || 0);
          const inRev = Number(payload.revision || 0);
          if (exRev > 0 && inRev > 0 && inRev < exRev) {
            return; // Never overwrite a newer revision with an out-of-order older write
          }
          if (exRev === inRev) {
            const exTime = existing.updatedAt ? Date.parse(existing.updatedAt) || 0 : 0;
            const inTime = payload.updatedAt ? Date.parse(payload.updatedAt) || 0 : 0;
            if (inTime > 0 && exTime > inTime) {
              return;
            }
          }
        }
        store.put(payload, recordKey);
      };
      getReq.onerror = () => {
        store.put(payload, recordKey);
      };
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    } catch {
      db.close();
      resolve(false);
    }
  });
}

export async function deleteSingleRecordFromIdb(recordKey: string): Promise<boolean> {
  const db = await openVaultIdb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(recordKey);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    } catch {
      db.close();
      resolve(false);
    }
  });
}

function readRawAllEntriesFromIdb(db: IDBDatabase): Promise<Record<string, any>> {
  return new Promise((resolve) => {
    const entries: Record<string, any> = {};
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          entries[String(cursor.key)] = cursor.value;
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve(entries);
      tx.onerror = () => resolve(entries);
    } catch {
      resolve(entries);
    }
  });
}

function assembleBundleFromIdbEntries(entries: Record<string, any>): AllMediaOverridesBundle | null {
  const rawTombstones = entries[IDB_TOMBSTONES_KEY];
  const idbDeletedFoods: Record<string, string> = {
    ...(rawTombstones && typeof rawTombstones.deletedFoods === 'object' ? rawTombstones.deletedFoods : {}),
    ...loadDeletedFoodIdsMap(),
  };
  const idbDeletedRestaurants: Record<string, string> = {
    ...(rawTombstones && typeof rawTombstones.deletedRestaurants === 'object' ? rawTombstones.deletedRestaurants : {}),
    ...loadDeletedRestaurantIdsMap(),
  };
  const idbDeletedDestinations: Record<string, string> = {
    ...(rawTombstones && typeof rawTombstones.deletedDestinations === 'object' ? rawTombstones.deletedDestinations : {}),
    ...loadDeletedDestinationIdsMap(),
  };
  const hasAnyTombstones =
    Object.keys(idbDeletedFoods).length > 0 ||
    Object.keys(idbDeletedRestaurants).length > 0 ||
    Object.keys(idbDeletedDestinations).length > 0;

  const rawMaster = (entries[IDB_BUNDLE_KEY] as AllMediaOverridesBundle | undefined) || null;
  let master: AllMediaOverridesBundle | null = null;
  if (rawMaster && typeof rawMaster === 'object') {
    const cleanMasterFoods: Record<string, FoodMediaOverride> = {};
    for (const [fid, fOv] of Object.entries(rawMaster.foods || {})) {
      if (fOv && !idbDeletedFoods[fid] && !isRejectedLegacyFoodOverridePhoto(fid, fOv)) {
        cleanMasterFoods[fid] = fOv;
      }
    }
    const cleanMasterRests: Record<string, RestaurantMediaOverride> = {};
    for (const [rid, rOv] of Object.entries(rawMaster.restaurants || {})) {
      if (rOv && !isRestaurantIdDeleted(rid, rOv.updatedAt, idbDeletedRestaurants, rOv.googlePlaceId)) {
        cleanMasterRests[rid] = rOv;
      }
    }
    const cleanMasterDests: Record<string, DestinationMediaOverride> = {};
    for (const [did, dOv] of Object.entries(rawMaster.destinations || {})) {
      if (dOv && !isDestinationIdDeleted(did, dOv.updatedAt, idbDeletedDestinations, dOv.googlePlaceId)) {
        cleanMasterDests[did] = dOv;
      }
    }
    master = {
      ...rawMaster,
      foods: cleanMasterFoods,
      deletedFoods: { ...(rawMaster.deletedFoods || {}), ...idbDeletedFoods },
      restaurants: cleanMasterRests,
      deletedRestaurants: { ...(rawMaster.deletedRestaurants || {}), ...idbDeletedRestaurants },
      destinations: cleanMasterDests,
      deletedDestinations: { ...(rawMaster.deletedDestinations || {}), ...idbDeletedDestinations },
    };
  }
  const atomicOverlay: AllMediaOverridesBundle = {
    foods: {},
    deletedFoods: idbDeletedFoods,
    restaurants: {},
    deletedRestaurants: idbDeletedRestaurants,
    destinations: {},
    deletedDestinations: idbDeletedDestinations,
    trendingFoods: {},
    updatedAt: new Date(0).toISOString(),
  };
  let hasAtomic = hasAnyTombstones;
  for (const [k, val] of Object.entries(entries)) {
    if (!val || typeof val !== 'object') continue;
    if (k.startsWith('food:') && val.id) {
      if (idbDeletedFoods[val.id] || isRejectedLegacyFoodOverridePhoto(val.id, val as FoodMediaOverride)) {
        deleteSingleRecordFromIdb(k).catch(() => {});
        continue;
      }
      atomicOverlay.foods[val.id] = val as FoodMediaOverride;
      hasAtomic = true;
    } else if (k.startsWith('rest:') && val.id) {
      const rVal = val as RestaurantMediaOverride;
      if (isRestaurantIdDeleted(rVal.id, rVal.updatedAt, idbDeletedRestaurants, rVal.googlePlaceId)) {
        deleteSingleRecordFromIdb(k).catch(() => {});
        continue;
      }
      atomicOverlay.restaurants[val.id] = rVal;
      hasAtomic = true;
    } else if (k.startsWith('dest:') && val.id) {
      const dVal = val as DestinationMediaOverride;
      if (isDestinationIdDeleted(dVal.id, dVal.updatedAt, idbDeletedDestinations, dVal.googlePlaceId)) {
        deleteSingleRecordFromIdb(k).catch(() => {});
        continue;
      }
      atomicOverlay.destinations[val.id] = dVal;
      hasAtomic = true;
    } else if (k.startsWith('trend:') && val.id) {
      if (isLegacyAutoScrapedFoodPlaceholderUrl((val as TrendingFoodMediaOverride).photoUrl)) {
        deleteSingleRecordFromIdb(k).catch(() => {});
        continue;
      }
      atomicOverlay.trendingFoods[val.id] = val as TrendingFoodMediaOverride;
      hasAtomic = true;
    }
  }
  if (!master && !hasAtomic) return null;
  if (!master) return atomicOverlay;
  if (!hasAtomic) return master;
  return mergeOverrideBundles(master, atomicOverlay);
}

export async function saveBundleToIdb(bundle: AllMediaOverridesBundle): Promise<void> {
  const db = await openVaultIdb();
  if (!db) return;
  let safeBundleToWrite = bundle;
  // Pre-hydration guard: never clobber existing IndexedDB overrides if saveLocalMediaOverrides
  // runs early during startup before hydrateFromLocalIdbImmediate() finishes!
  if (!hasHydratedFromIdbOnce) {
    try {
      const existingEntries = await readRawAllEntriesFromIdb(db);
      const existingBundle = assembleBundleFromIdbEntries(existingEntries);
      if (existingBundle) {
        safeBundleToWrite = mergeOverrideBundles(existingBundle, bundle);
        inMemoryMasterBundle = safeBundleToWrite;
      }
    } catch {}
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(safeBundleToWrite, IDB_BUNDLE_KEY);
      store.put(
        {
          id: 'tombstones_v1',
          deletedFoods: safeBundleToWrite.deletedFoods || {},
          deletedRestaurants: safeBundleToWrite.deletedRestaurants || {},
          deletedDestinations: safeBundleToWrite.deletedDestinations || {},
          updatedAt: safeBundleToWrite.updatedAt || new Date().toISOString(),
        },
        IDB_TOMBSTONES_KEY
      );
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
  try {
    const entries = await readRawAllEntriesFromIdb(db);
    if (entries[IDB_PENDING_QUEUE_KEY] && typeof entries[IDB_PENDING_QUEUE_KEY] === 'object') {
      const localQueue = safeReadJsonMap<PendingMediaCloudQueueItem>(VAULT_KEYS.PENDING_CLOUD_QUEUE);
      const mergedQueue = { ...entries[IDB_PENDING_QUEUE_KEY], ...localQueue };
      if (Object.keys(mergedQueue).length > Object.keys(localQueue).length) {
        safeWriteJsonMap(VAULT_KEYS.PENDING_CLOUD_QUEUE, mergedQueue);
      }
    }
    return assembleBundleFromIdbEntries(entries);
  } finally {
    db.close();
  }
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

/**
 * Authoritative lightweight Food Revision Ledger (~60 bytes per edited dish, immune to 5MB localStorage quota).
 * Prevents stale localStorage caches (`VAULT_KEYS.FOODS` or `kft_foods_200_v9`) from ever resurrecting an older photo!
 */
export function loadFoodRevisionLedger(): Record<string, FoodRevisionLedgerEntry> {
  return safeReadJsonMap<FoodRevisionLedgerEntry>(VAULT_KEYS.FOOD_REVISION_LEDGER);
}

function saveFoodRevisionLedger(ledger: Record<string, FoodRevisionLedgerEntry>): void {
  safeWriteJsonMap(VAULT_KEYS.FOOD_REVISION_LEDGER, ledger);
}

export function loadPendingMediaCloudQueue(): Record<string, PendingMediaCloudQueueItem> {
  return safeReadJsonMap<PendingMediaCloudQueueItem>(VAULT_KEYS.PENDING_CLOUD_QUEUE);
}

function savePendingMediaCloudQueue(queue: Record<string, PendingMediaCloudQueueItem>): void {
  safeWriteJsonMap(VAULT_KEYS.PENDING_CLOUD_QUEUE, queue);
  saveSingleRecordToIdb(IDB_PENDING_QUEUE_KEY, queue).catch(() => {});
}

function enqueuePendingMediaCloudSync(
  category: 'food' | 'rest' | 'dest' | 'trend',
  id: string,
  revision: number,
  queuedAt: string
): void {
  const queue = loadPendingMediaCloudQueue();
  queue[`${category}:${id}`] = { category, id, revision, queuedAt };
  savePendingMediaCloudQueue(queue);
}

function dequeuePendingMediaCloudSync(
  category: 'food' | 'rest' | 'dest' | 'trend',
  id: string,
  syncedRevision: number
): void {
  const queue = loadPendingMediaCloudQueue();
  const key = `${category}:${id}`;
  const cur = queue[key];
  if (cur && (cur.revision || 0) <= syncedRevision) {
    delete queue[key];
    savePendingMediaCloudQueue(queue);
  }
}

function loadSeenCloudRowTimestamps(): Record<string, string> {
  return safeReadJsonMap<string>(VAULT_KEYS.CLOUD_ROW_SEEN);
}

function saveSeenCloudRowTimestamps(seen: Record<string, string>): void {
  safeWriteJsonMap(VAULT_KEYS.CLOUD_ROW_SEEN, seen);
}

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
  if (rec.pendingPhotoReplacement || rec.isAdminEdited) return false;
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
    if (typeof localStorage === 'undefined') return {};
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
    if (typeof localStorage === 'undefined') return false;
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
      localStorage.removeItem('kft_foods_200_v7');
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
  const deletedFoods = safeReadJsonMap<string>(VAULT_KEYS.DELETED_FOODS);
  const ledger = loadFoodRevisionLedger();
  const restaurants = safeReadJsonMap<RestaurantMediaOverride>(VAULT_KEYS.RESTAURANTS);
  const deletedRestaurants = safeReadJsonMap<string>(VAULT_KEYS.DELETED_RESTAURANTS);
  const destinations = safeReadJsonMap<DestinationMediaOverride>(VAULT_KEYS.DESTINATIONS);
  const deletedDestinations = safeReadJsonMap<string>(VAULT_KEYS.DELETED_DESTINATIONS);
  const legacyDest = safeReadJsonMap<{ photoUrl: string; updatedAt?: string }>(VAULT_KEYS.DESTINATIONS_LEGACY);
  const trendingFoods = safeReadJsonMap<TrendingFoodMediaOverride>(VAULT_KEYS.TRENDING_FOODS);

  // Verify every localStorage food entry against the authoritative Food Revision Ledger.
  // If localStorage hit a 5MB QuotaExceededError during an earlier replacement, VAULT_KEYS.FOODS on disk
  // might hold an older base64 image than the ledger's latest revision/photoHash. Evict any stale photo immediately
  // so an outdated localStorage photo can NEVER reappear while IndexedDB hydrates the latest revision!
  let evictedStaleFoodFromDisk = false;
  let evictedStaleLedgerEntry = false;
  for (const [lid, lEntry] of Object.entries(ledger)) {
    if (
      !lEntry ||
      isLegacyAutoScrapedFoodPlaceholderUrl(lEntry.cloudUrl)
    ) {
      delete ledger[lid];
      evictedStaleLedgerEntry = true;
    }
  }
  if (evictedStaleLedgerEntry) {
    saveFoodRevisionLedger(ledger);
  }

  for (const [id, foodOv] of Object.entries(foods)) {
    if (!foodOv || isRejectedLegacyFoodOverridePhoto(id, foodOv)) {
      delete foods[id];
      evictedStaleFoodFromDisk = true;
      continue;
    }
    const ledgerEntry = ledger[id];
    if (ledgerEntry && ledgerEntry.photoHash) {
      const diskHash = foodOv.photoHash || computeFastPhotoSignature(foodOv.photoUrl);
      const diskRev = Number(foodOv.revision || 0);
      if (diskRev < ledgerEntry.revision && diskHash !== ledgerEntry.photoHash) {
        if (ledgerEntry.cloudUrl && !isLegacyAutoScrapedFoodPlaceholderUrl(ledgerEntry.cloudUrl)) {
          foods[id] = {
            ...foodOv,
            photoUrl: ledgerEntry.cloudUrl,
            photoHash: ledgerEntry.photoHash,
            revision: ledgerEntry.revision,
            updatedAt: ledgerEntry.updatedAt,
          };
        } else {
          delete foods[id];
        }
        evictedStaleFoodFromDisk = true;
      }
    }
  }
  if (evictedStaleFoodFromDisk) {
    safeWriteJsonMap(VAULT_KEYS.FOODS, foods);
  }

  let evictedStaleTrending = false;
  for (const [tid, tOv] of Object.entries(trendingFoods)) {
    if (!tOv || isLegacyAutoScrapedFoodPlaceholderUrl(tOv.photoUrl)) {
      delete trendingFoods[tid];
      evictedStaleTrending = true;
    }
  }
  if (evictedStaleTrending) {
    safeWriteJsonMap(VAULT_KEYS.TRENDING_FOODS, trendingFoods);
  }

  // Merge legacy destination photo overrides into the unified destinations vault & remove duplicate legacy key
  let hadLegacy = false;
  for (const [id, val] of Object.entries(legacyDest)) {
    hadLegacy = true;
    if (val && val.photoUrl && !isObsoleteSeedPhoto(val.photoUrl) && !destinations[id]) {
      destinations[id] = {
        id,
        photoUrl: val.photoUrl,
        isCustomPhoto: true,
        updatedAt: val.updatedAt || '1970-01-01T00:00:00.000Z',
      };
    }
  }
  if (hadLegacy) {
    try {
      localStorage.removeItem(VAULT_KEYS.DESTINATIONS_LEGACY);
    } catch {}
  }

  // Strip any obsolete broken seed URLs or stale recycled static `/destinations/` paths from destinations vault
  let evictedStaleDestFromDisk = false;
  for (const [id, destOv] of Object.entries(destinations)) {
    if (!destOv || isObsoleteSeedPhoto(destOv.photoUrl)) {
      delete destinations[id];
      evictedStaleDestFromDisk = true;
      continue;
    }
    const seedDest = IMMUTABLE_SEED_DEST_MAP.get(id);
    if (
      seedDest &&
      typeof destOv.photoUrl === 'string' &&
      destOv.photoUrl.startsWith('/destinations/') &&
      destOv.photoUrl.split('?')[0].trim() !== (seedDest.photoUrl || '').split('?')[0].trim()
    ) {
      if (!destOv.isAdminEdited) {
        delete destinations[id];
      } else {
        destinations[id] = {
          ...destOv,
          photoUrl: seedDest.photoUrl,
          galleryPhotos: [seedDest.photoUrl],
        };
      }
      evictedStaleDestFromDisk = true;
    }
  }
  if (evictedStaleDestFromDisk) {
    safeWriteJsonMap(VAULT_KEYS.DESTINATIONS, destinations);
  }

  // Strip any accidental unedited seed restaurant entries or deleted restaurants from restaurants vault
  for (const [id, restOv] of Object.entries(restaurants)) {
    if (isFakeSeedRestaurantOverride(restOv) || isRestaurantIdDeleted(id, restOv?.updatedAt, deletedRestaurants)) {
      delete restaurants[id];
    }
  }

  for (const fid of Object.keys(deletedFoods)) {
    if (foods[fid]) {
      delete foods[fid];
    }
  }
  for (const [did, destOv] of Object.entries(destinations)) {
    if (isDestinationIdDeleted(did, destOv?.updatedAt, deletedDestinations, destOv?.googlePlaceId)) {
      delete destinations[did];
    }
  }

  const fromDisk: AllMediaOverridesBundle = {
    foods,
    deletedFoods,
    restaurants,
    deletedRestaurants,
    destinations,
    deletedDestinations,
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

export function saveLocalMediaOverrides(incomingBundle: AllMediaOverridesBundle): void {
  // Guard against stale async bundle snapshots overwriting newer in-memory revisions
  const bundle =
    inMemoryMasterBundle && inMemoryMasterBundle !== incomingBundle
      ? mergeOverrideBundles(inMemoryMasterBundle, incomingBundle)
      : incomingBundle;
  inMemoryMasterBundle = bundle;
  // Remove duplicate legacy key first to maximize available localStorage space
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(VAULT_KEYS.DESTINATIONS_LEGACY);
    }
  } catch {}

  // Keep food revision ledger synchronized with every entry in bundle.foods
  const currentLedger = loadFoodRevisionLedger();
  let ledgerChanged = false;
  for (const [fid, fOv] of Object.entries(bundle.foods || {})) {
    if (!fOv || !fOv.photoUrl) continue;
    const rev = Number(fOv.revision || 0);
    const hash = fOv.photoHash || computeFastPhotoSignature(fOv.photoUrl);
    const prev = currentLedger[fid];
    const fTime = fOv.updatedAt ? Date.parse(fOv.updatedAt) || 0 : 0;
    const pTime = prev?.updatedAt ? Date.parse(prev.updatedAt) || 0 : 0;
    if (!prev || rev > prev.revision || (rev === prev.revision && fTime > pTime)) {
      currentLedger[fid] = {
        revision: Math.max(rev, (prev?.revision || 0) || 1),
        updatedAt: fOv.updatedAt || new Date().toISOString(),
        photoHash: hash,
        cloudSynced: prev?.photoHash === hash ? prev?.cloudSynced : false,
        cloudUrl: fOv.photoUrl.startsWith('https://') ? fOv.photoUrl : prev?.photoHash === hash ? prev?.cloudUrl : undefined,
      };
      ledgerChanged = true;
    }
  }
  if (ledgerChanged) {
    saveFoodRevisionLedger(currentLedger);
  }

  // Measure remaining UTF-16 character budget across ALL localStorage keys (~2 bytes per char, 5.0MB browser cap)
  // in a single pass so writing vault maps NEVER triggers QuotaExceededError or 4x full localStorage scans!
  const SAFE_TOTAL_UTF16_CHARS = 2_350_000; // 4.70MB UTF-16, leaving 300KB safety margin for ledger & queue
  const managedVaultKeys = new Set<string>([
    VAULT_KEYS.FOODS,
    VAULT_KEYS.DESTINATIONS,
    VAULT_KEYS.RESTAURANTS,
    VAULT_KEYS.TRENDING_FOODS,
  ]);
  let baseNonVaultChars = 0;
  try {
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || managedVaultKeys.has(k)) continue;
        const v = localStorage.getItem(k);
        baseNonVaultChars += k.length + (v ? v.length : 0);
      }
    }
  } catch {
    baseNonVaultChars = 1_500_000;
  }
  let writtenVaultCharsSoFar = 0;
  const recordWrittenKeySize = (key: string) => {
    try {
      if (typeof localStorage !== 'undefined') {
        const v = localStorage.getItem(key);
        writtenVaultCharsSoFar += key.length + (v ? v.length : 0);
      }
    } catch {}
  };
  const getRemainingCharBudgetForKey = (targetKey: string, capChars: number, reservedForLaterKeysChars: number = 0): number => {
    try {
      if (typeof localStorage === 'undefined') return 0;
      const available = Math.max(
        0,
        SAFE_TOTAL_UTF16_CHARS - baseNonVaultChars - writtenVaultCharsSoFar - reservedForLaterKeysChars - targetKey.length - 2048
      );
      return Math.min(capChars, available);
    } catch {
      return Math.min(capChars, 250_000);
    }
  };

  // Budget localStorage keys dynamically so 5MB UTF-16 quota never overflows
  // and stale old base64 images are ALWAYS overwritten/evicted from localStorage while IndexedDB holds 100%.
  const trimFoodMapForLocalStorage = (
    foodMap: Record<string, FoodMediaOverride>,
    maxChars: number
  ): Record<string, FoodMediaOverride> => {
    const entries = Object.entries(foodMap).sort((a, b) => {
      const rDiff = (Number(b[1]?.revision) || 0) - (Number(a[1]?.revision) || 0);
      if (rDiff !== 0) return rDiff;
      const tA = a[1]?.updatedAt ? Date.parse(a[1].updatedAt) || 0 : 0;
      const tB = b[1]?.updatedAt ? Date.parse(b[1].updatedAt) || 0 : 0;
      return tB - tA;
    });
    const trimmed: Record<string, FoodMediaOverride> = {};
    let approxChars = 2; // '{}'
    for (const [k, v] of entries) {
      if (!v) continue;
      // HTTP/static URLs are tiny (<200 chars), keep them whenever they fit
      const entrySize = JSON.stringify(v).length + k.length + 6;
      const isTinyUrl = !v.photoUrl || !v.photoUrl.startsWith('data:');
      if ((isTinyUrl && approxChars + entrySize <= maxChars + 32_000) || approxChars + entrySize <= maxChars) {
        trimmed[k] = v;
        approxChars += entrySize;
      }
    }
    return trimmed;
  };

  // Reserve guaranteed space for Destinations (Travel) & Restaurants so Foods never starves Travel to 0 bytes
  const hasDestinations = Object.keys(bundle.destinations || {}).length > 0;
  const hasRestaurants = Object.keys(bundle.restaurants || {}).length > 0;
  const reservedForDestAndRest = (hasDestinations ? 420_000 : 0) + (hasRestaurants ? 180_000 : 0);

  const foodCharBudget = getRemainingCharBudgetForKey(VAULT_KEYS.FOODS, 1_250_000, reservedForDestAndRest);
  const compactFoodsPrimary = trimFoodMapForLocalStorage(bundle.foods || {}, foodCharBudget);
  if (safeWriteJsonMap(VAULT_KEYS.FOODS, compactFoodsPrimary)) {
    persistedInLocalStorageSets.foods = new Set(
      Object.entries(compactFoodsPrimary)
        .filter(([, v]) => v && v.photoUrl && v.photoUrl.trim().length > 0)
        .map(([k]) => k)
    );
  } else {
    const urlsOnly = trimFoodMapForLocalStorage(bundle.foods || {}, 0);
    safeWriteJsonMap(VAULT_KEYS.FOODS, urlsOnly);
    persistedInLocalStorageSets.foods = new Set(Object.keys(urlsOnly));
  }
  recordWrittenKeySize(VAULT_KEYS.FOODS);

  // Budget Destinations & Restaurants safely with revision-aware sorting
  const trimGenericMap = <T extends { updatedAt?: string; revision?: number; photoUrl?: string }>(
    map: Record<string, T>,
    maxChars: number
  ): Record<string, T> => {
    const entries = Object.entries(map || {}).sort((a, b) => {
      const rDiff = (Number(b[1]?.revision) || 0) - (Number(a[1]?.revision) || 0);
      if (rDiff !== 0) return rDiff;
      const tA = a[1]?.updatedAt ? Date.parse(a[1].updatedAt) || 0 : 0;
      const tB = b[1]?.updatedAt ? Date.parse(b[1].updatedAt) || 0 : 0;
      return tB - tA;
    });
    const out: Record<string, T> = {};
    let used = 2;
    for (const [k, v] of entries) {
      if (!v) continue;
      const sz = JSON.stringify(v).length + k.length + 6;
      const isTiny = !v.photoUrl || !v.photoUrl.startsWith('data:');
      if ((isTiny && used + sz <= maxChars + 32_000) || used + sz <= maxChars) {
        out[k] = v;
        used += sz;
      }
    }
    return out;
  };

  const destCharBudget = getRemainingCharBudgetForKey(VAULT_KEYS.DESTINATIONS, 550_000, hasRestaurants ? 180_000 : 0);
  const compactDests = trimGenericMap(bundle.destinations || {}, destCharBudget);
  if (safeWriteJsonMap(VAULT_KEYS.DESTINATIONS, compactDests)) {
    persistedInLocalStorageSets.destinations = new Set(
      Object.entries(compactDests)
        .filter(([, v]) => v && v.photoUrl && v.photoUrl.trim().length > 0)
        .map(([k]) => k)
    );
  }
  recordWrittenKeySize(VAULT_KEYS.DESTINATIONS);

  const restCharBudget = getRemainingCharBudgetForKey(VAULT_KEYS.RESTAURANTS, 300_000);
  const compactRests = trimGenericMap(bundle.restaurants || {}, restCharBudget);
  if (safeWriteJsonMap(VAULT_KEYS.RESTAURANTS, compactRests)) {
    persistedInLocalStorageSets.restaurants = new Set(
      Object.entries(compactRests)
        .filter(([, v]) => v && (v.photoUrl || v.profileImage))
        .map(([k]) => k)
    );
  }
  recordWrittenKeySize(VAULT_KEYS.RESTAURANTS);
  if (bundle.deletedFoods && typeof bundle.deletedFoods === 'object') {
    safeWriteJsonMap(VAULT_KEYS.DELETED_FOODS, bundle.deletedFoods);
  }
  if (bundle.deletedRestaurants && typeof bundle.deletedRestaurants === 'object') {
    safeWriteJsonMap(VAULT_KEYS.DELETED_RESTAURANTS, bundle.deletedRestaurants);
  }
  if (bundle.deletedDestinations && typeof bundle.deletedDestinations === 'object') {
    safeWriteJsonMap(VAULT_KEYS.DELETED_DESTINATIONS, bundle.deletedDestinations);
  }

  const trendCharBudget = getRemainingCharBudgetForKey(VAULT_KEYS.TRENDING_FOODS, 180_000);
  const compactTrending = trimGenericMap(bundle.trendingFoods || {}, trendCharBudget);
  safeWriteJsonMap(VAULT_KEYS.TRENDING_FOODS, compactTrending);
  saveBundleToIdb(bundle).catch(() => {});
}

export function mergeOverrideBundles(
  base: AllMediaOverridesBundle,
  incoming: Partial<AllMediaOverridesBundle> | null | undefined
): AllMediaOverridesBundle {
  if (!incoming) return base;

  const getRecordEffectiveMs = (rec: { adminApprovedAt?: string; updatedAt?: string }): number => {
    const tAdmin = rec.adminApprovedAt ? Date.parse(rec.adminApprovedAt) || 0 : 0;
    const tUpd = rec.updatedAt ? Date.parse(rec.updatedAt) || 0 : 0;
    return Math.max(tAdmin, tUpd);
  };

  const mergeMaps = <
    T extends {
      updatedAt?: string;
      adminApprovedAt?: string;
      revision?: number;
      isCustomPhoto?: boolean;
      photoUrl?: string;
      profileImage?: string;
    }
  >(
    a: Record<string, T> = {},
    b: Record<string, T> = {},
    allowEmptyPhoto: boolean = false
  ): Record<string, T> => {
    const isRejectedPhoto = (url?: string): boolean => {
      if (!url || !url.trim()) {
        return !allowEmptyPhoto;
      }
      return isObsoleteSeedPhoto(url) || isLegacyAutoScrapedFoodPlaceholderUrl(url);
    };
    const out: Record<string, T> = {};
    for (const [id, itemA] of Object.entries(a)) {
      if (!itemA || isRejectedPhoto(itemA.photoUrl)) {
        continue;
      }
      out[id] = itemA;
    }
    for (const [id, itemB] of Object.entries(b)) {
      if (!itemB || isRejectedPhoto(itemB.photoUrl)) {
        continue;
      }
      const itemA = out[id];
      if (!itemA) {
        out[id] = itemB;
      } else {
        const revA = Number(itemA.revision || 0);
        const revB = Number(itemB.revision || 0);
        const timeA = getRecordEffectiveMs(itemA);
        const timeB = getRecordEffectiveMs(itemB);

        // Strictly prioritize the latest Admin-approved timestamp (`adminApprovedAt` / `updatedAt`) as the single source of truth,
        // using `revision` to break same-second ties. This guarantees a fresh mobile Admin image replacement (even after an APK
        // reinstall or cache clear where local revision starts at 1) NEVER gets overwritten by an older cached/cloud revision!
        let bWins: boolean;
        if (timeA > 0 && timeB > 0 && Math.abs(timeB - timeA) > 1000) {
          bWins = timeB > timeA;
        } else if (revA > 0 && revB > 0 && revA !== revB) {
          bWins = revB > revA;
        } else if (timeA > 0 && timeB > 0 && timeA !== timeB) {
          bWins = timeB > timeA;
        } else if (revA !== revB) {
          bWins = revB > revA;
        } else {
          bWins = timeB >= timeA;
        }

        const winner = bWins ? itemB : itemA;
        const loser = bWins ? itemA : itemB;
        const mergedRecord: any = { ...loser, ...winner };
        // Preserve non-empty text/recipe fields from `loser` if omitted on `winner`
        for (const field of [
          'nameKh',
          'nameEn',
          'categorySlug',
          'categoryKh',
          'categoryEn',
          'descriptionKh',
          'descriptionEn',
          'cookTime',
          'servings',
          'difficulty',
        ]) {
          if (!mergedRecord[field] && (loser as any)[field]) {
            mergedRecord[field] = (loser as any)[field];
          }
        }
        if (
          (!Array.isArray(mergedRecord.ingredients) || mergedRecord.ingredients.length === 0) &&
          Array.isArray((loser as any).ingredients) &&
          (loser as any).ingredients.length > 0
        ) {
          mergedRecord.ingredients = (loser as any).ingredients;
        }
        if (
          (!Array.isArray(mergedRecord.steps) || mergedRecord.steps.length === 0) &&
          Array.isArray((loser as any).steps) &&
          (loser as any).steps.length > 0
        ) {
          mergedRecord.steps = (loser as any).steps;
        }
        out[id] = mergedRecord as T;
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

  const mergedRestaurants = mergeMaps(base.restaurants, incoming.restaurants || {}, true);
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

  const mergedDeletedFoods: Record<string, string> = {
    ...(base.deletedFoods || {}),
  };
  if (incoming.deletedFoods && typeof incoming.deletedFoods === 'object') {
    for (const [delId, delIso] of Object.entries(incoming.deletedFoods)) {
      if (!delId || !delIso) continue;
      const curIso = mergedDeletedFoods[delId];
      if (!curIso || (new Date(delIso).getTime() || 0) >= (new Date(curIso).getTime() || 0)) {
        mergedDeletedFoods[delId] = delIso;
      }
    }
  }

  const mergedFoods = mergeMaps(base.foods, incoming.foods || {});
  for (const [fid, fOv] of Object.entries(mergedFoods)) {
    if (isRejectedLegacyFoodOverridePhoto(fid, fOv) || mergedDeletedFoods[fid]) {
      delete mergedFoods[fid];
    }
  }

  const mergedDeletedDestinations: Record<string, string> = {
    ...(base.deletedDestinations || {}),
  };
  if (incoming.deletedDestinations && typeof incoming.deletedDestinations === 'object') {
    for (const [delId, delIso] of Object.entries(incoming.deletedDestinations)) {
      if (!delId || !delIso) continue;
      const curIso = mergedDeletedDestinations[delId];
      if (!curIso || (new Date(delIso).getTime() || 0) >= (new Date(curIso).getTime() || 0)) {
        mergedDeletedDestinations[delId] = delIso;
      }
    }
  }

  const mergedDestinations = mergeMaps(base.destinations, incoming.destinations || {});
  for (const [did, destOv] of Object.entries(mergedDestinations)) {
    if (isDestinationIdDeleted(did, destOv?.updatedAt, mergedDeletedDestinations, destOv?.googlePlaceId)) {
      delete mergedDestinations[did];
    }
  }

  return {
    foods: mergedFoods,
    deletedFoods: mergedDeletedFoods,
    restaurants: mergedRestaurants,
    deletedRestaurants: mergedDeletedRestaurants,
    destinations: mergedDestinations,
    deletedDestinations: mergedDeletedDestinations,
    trendingFoods: mergeMaps(base.trendingFoods, incoming.trendingFoods || {}),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * After confirming a new per-record override (`kft_ov_food_<id>`) is safely saved to Supabase,
 * clean up any outdated duplicate reference for `<id>` inside legacy `kft_cloud_media_overrides_v1`
 * so old master-bundle snapshots can never resurrect outdated pictures.
 */
const cleanedLegacyMasterIdsInSession = new Set<string>();
async function cleanupOutdatedLegacyMasterCloudEntry(
  section: 'foods' | 'trendingFoods',
  recordId: string
): Promise<void> {
  const sig = `${section}:${recordId}`;
  if (cleanedLegacyMasterIdsInSession.has(sig) || !isSupabaseConfigured() || isSupabaseEgressCooldownActive()) {
    return;
  }
  cleanedLegacyMasterIdsInSession.add(sig);
  try {
    const legacyMaster = await pullCloudDocument<AllMediaOverridesBundle>(VAULT_KEYS.CLOUD_DOC_KEY, 8000);
    if (legacyMaster && legacyMaster[section] && legacyMaster[section][recordId]) {
      delete legacyMaster[section][recordId];
      legacyMaster.updatedAt = new Date().toISOString();
      await pushCloudDocument(VAULT_KEYS.CLOUD_DOC_KEY, legacyMaster, 12000);
    }
  } catch {}
}

const persistentMediaVaultSubscribers = new Set<(bundle: AllMediaOverridesBundle) => void>();

export function subscribeMediaVaultUpdates(
  listener: (bundle: AllMediaOverridesBundle) => void
): () => void {
  persistentMediaVaultSubscribers.add(listener);
  return () => {
    persistentMediaVaultSubscribers.delete(listener);
  };
}

function notifyPersistentMediaVaultSubscribers(bundle: AllMediaOverridesBundle): void {
  for (const fn of Array.from(persistentMediaVaultSubscribers)) {
    try {
      fn(bundle);
    } catch {}
  }
}

/**
 * Push a single record override to Supabase Storage (if base64 & bucket available) and its dedicated
 * Supabase KV key (`kft_ov_<type>_<id>`).
 * Uses atomic per-record upsert + remote monotonic revision guard + persistent retry queue (`kft_pending_media_cloud_queue_v1`)
 * so replacements are permanently saved across restarts, offline periods, app updates, or APK reinstalls.
 */
async function syncSingleOverrideRecordToCloud(
  category: 'food' | 'rest' | 'dest' | 'trend',
  recordId: string,
  overridePayload: any,
  _localBundle?: AllMediaOverridesBundle,
  options?: { isLiveAdminSave?: boolean }
): Promise<boolean> {
  let rev = Number(overridePayload?.revision || 1);
  if (!isSupabaseConfigured()) return false;
  const perRecordKey = `${VAULT_KEYS.CLOUD_RECORD_PREFIX}${category}_${recordId}`;

  let payloadToPush = { ...overridePayload };

  // 0. For food & trending items, inspect existing cloud record first so:
  //    a) An older queued offline item never overwrites a newer Admin-approved cloud image, AND
  //    b) A fresh live Admin replacement (even from a newly installed mobile APK with empty local storage)
  //       ALWAYS gets a strictly higher monotonic revision & timestamp than any previous cloud record!
  if (category === 'food' || category === 'trend') {
    try {
      const remoteExisting = await pullCloudDocument<any>(perRecordKey, 6000);
      if (remoteExisting && remoteExisting.id === recordId) {
        const remoteMs = Math.max(
          remoteExisting.adminApprovedAt ? Date.parse(remoteExisting.adminApprovedAt) || 0 : 0,
          remoteExisting.updatedAt ? Date.parse(remoteExisting.updatedAt) || 0 : 0
        );
        const localMs = Math.max(
          payloadToPush.adminApprovedAt ? Date.parse(payloadToPush.adminApprovedAt) || 0 : 0,
          payloadToPush.updatedAt ? Date.parse(payloadToPush.updatedAt) || 0 : 0
        );
        const remoteRev = Number(remoteExisting.revision || 0);

        if (!options?.isLiveAdminSave && remoteMs > localMs + 5000) {
          // Remote cloud already has a strictly newer Admin-approved image than this queued background item — adopt remote!
          dequeuePendingMediaCloudSync(category, recordId, rev);
          const curBundle = loadLocalMediaOverrides();
          if (category === 'food' && !isRejectedLegacyFoodOverridePhoto(recordId, remoteExisting)) {
            const adoptedBundle = mergeOverrideBundles(curBundle, { foods: { [recordId]: remoteExisting } });
            inMemoryMasterBundle = adoptedBundle;
            await saveSingleRecordToIdb(`food:${recordId}`, adoptedBundle.foods[recordId]).catch(() => {});
            saveLocalMediaOverrides(adoptedBundle);
            notifyPersistentMediaVaultSubscribers(adoptedBundle);
          }
          return true;
        }

        // Monotonically advance revision & timestamp above remoteExisting so no older device cache can ever beat this save!
        const nextMonotonicRev = Math.max(rev, remoteRev + 1);
        const nextMonotonicIso = new Date(Math.max(Date.now(), localMs, remoteMs + 1000)).toISOString();
        rev = nextMonotonicRev;
        payloadToPush = {
          ...remoteExisting,
          ...payloadToPush,
          revision: nextMonotonicRev,
          adminApprovedAt: nextMonotonicIso,
          updatedAt: nextMonotonicIso,
        };
        if (category === 'food') {
          if (
            (!Array.isArray(payloadToPush.ingredients) || payloadToPush.ingredients.length === 0) &&
            Array.isArray(remoteExisting.ingredients) &&
            remoteExisting.ingredients.length > 0
          ) {
            payloadToPush.ingredients = remoteExisting.ingredients;
          }
          if (
            (!Array.isArray(payloadToPush.steps) || payloadToPush.steps.length === 0) &&
            Array.isArray(remoteExisting.steps) &&
            remoteExisting.steps.length > 0
          ) {
            payloadToPush.steps = remoteExisting.steps;
          }
        }
      }
    } catch {
      // Proceed cleanly even if pre-flight read timed out
    }
  }

  // 1. If image is inline base64, upload permanently to Supabase Cloud Storage (`food-media` bucket) first
  if (typeof payloadToPush.photoUrl === 'string' && payloadToPush.photoUrl.startsWith('data:image/')) {
    const folder =
      category === 'food'
        ? 'foods'
        : category === 'rest'
        ? 'restaurants'
        : category === 'dest'
        ? 'destinations'
        : 'trending';
    const uploadedPublicUrl = await uploadBase64ImageToSupabaseStorage(
      folder,
      recordId,
      payloadToPush.photoUrl,
      20000,
      rev
    );
    if (uploadedPublicUrl) {
      const cloudHash = computeFastPhotoSignature(uploadedPublicUrl);
      payloadToPush = {
        ...payloadToPush,
        photoUrl: uploadedPublicUrl,
        cloudStorageUrl: uploadedPublicUrl,
        photoHash: cloudHash,
        ...(category === 'rest' ? { profileImage: uploadedPublicUrl } : {}),
      };
    }
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const ok = await pushCloudDocument(perRecordKey, payloadToPush, 20000);
      if (ok) {
        // Confirmed safely saved to cloud! Now update revision ledger, dequeue retry item, and clean outdated refs.
        dequeuePendingMediaCloudSync(category, recordId, rev);
        dequeuePendingMediaCloudSync(category, recordId, Number(overridePayload?.revision || 1));

        if (category === 'food') {
          const ledger = loadFoodRevisionLedger();
          const curLedger = ledger[recordId];
          const pushedHash = payloadToPush.photoHash || computeFastPhotoSignature(payloadToPush.photoUrl);
          if (!curLedger || curLedger.revision <= rev) {
            ledger[recordId] = {
              revision: rev,
              updatedAt: payloadToPush.updatedAt || new Date().toISOString(),
              photoHash: pushedHash,
              cloudSynced: true,
              cloudUrl: payloadToPush.photoUrl?.startsWith('https://')
                ? payloadToPush.photoUrl
                : curLedger?.photoHash === pushedHash
                ? curLedger?.cloudUrl
                : undefined,
            };
            saveFoodRevisionLedger(ledger);
          }
          // Only replace local base64 / revision with cloud Storage URL AFTER confirming both Storage + DB save succeeded
          // AND only if no newer local revision was created by Admin while the upload was in flight!
          const latestBundle = loadLocalMediaOverrides();
          const currentLocalRev = Number(latestBundle.foods[recordId]?.revision || 0);
          const origRev = Number(overridePayload?.revision || 1);
          if (currentLocalRev <= origRev || currentLocalRev <= rev) {
            const upgradedBundle: AllMediaOverridesBundle = {
              ...latestBundle,
              foods: {
                ...latestBundle.foods,
                [recordId]: payloadToPush,
              },
              updatedAt: payloadToPush.updatedAt || new Date().toISOString(),
            };
            inMemoryMasterBundle = upgradedBundle;
            await saveSingleRecordToIdb(`food:${recordId}`, payloadToPush);
            saveLocalMediaOverrides(upgradedBundle);
            notifyPersistentMediaVaultSubscribers(upgradedBundle);
          }
          cleanupOutdatedLegacyMasterCloudEntry('foods', recordId).catch(() => {});
        } else if (category === 'rest') {
          const latestBundle = loadLocalMediaOverrides();
          const upgradedBundle: AllMediaOverridesBundle = {
            ...latestBundle,
            restaurants: {
              ...latestBundle.restaurants,
              [recordId]: payloadToPush,
            },
            updatedAt: payloadToPush.updatedAt || new Date().toISOString(),
          };
          inMemoryMasterBundle = upgradedBundle;
          await saveSingleRecordToIdb(`rest:${recordId}`, payloadToPush);
          saveLocalMediaOverrides(upgradedBundle);
          notifyPersistentMediaVaultSubscribers(upgradedBundle);
        } else if (category === 'dest') {
          const latestBundle = loadLocalMediaOverrides();
          const upgradedBundle: AllMediaOverridesBundle = {
            ...latestBundle,
            destinations: {
              ...latestBundle.destinations,
              [recordId]: payloadToPush,
            },
            updatedAt: payloadToPush.updatedAt || new Date().toISOString(),
          };
          inMemoryMasterBundle = upgradedBundle;
          await saveSingleRecordToIdb(`dest:${recordId}`, payloadToPush);
          saveLocalMediaOverrides(upgradedBundle);
          notifyPersistentMediaVaultSubscribers(upgradedBundle);
        } else if (category === 'trend') {
          const latestBundle = loadLocalMediaOverrides();
          const upgradedBundle: AllMediaOverridesBundle = {
            ...latestBundle,
            trendingFoods: {
              ...latestBundle.trendingFoods,
              [recordId]: payloadToPush,
            },
            updatedAt: payloadToPush.updatedAt || new Date().toISOString(),
          };
          inMemoryMasterBundle = upgradedBundle;
          await saveSingleRecordToIdb(`trend:${recordId}`, payloadToPush);
          saveLocalMediaOverrides(upgradedBundle);
          notifyPersistentMediaVaultSubscribers(upgradedBundle);
          cleanupOutdatedLegacyMasterCloudEntry('trendingFoods', recordId).catch(() => {});
        }
        return true;
      }
    } catch (err) {
      console.warn(`syncSingleOverrideRecordToCloud(${perRecordKey}) attempt ${attempt} warning:`, err);
    }
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1200 * attempt));
    }
  }
  return false;
}

/**
 * Flush any queued unsynced local media overrides (`kft_pending_media_cloud_queue_v1`) to Supabase Cloud.
 */
let flushQueueInFlight: Promise<number> | null = null;
export async function flushPendingMediaCloudQueue(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  if (flushQueueInFlight) return flushQueueInFlight;

  flushQueueInFlight = (async () => {
    const queue = loadPendingMediaCloudQueue();
    const items = Object.values(queue);
    if (items.length === 0) return 0;

    const bundle = await hydrateFromLocalIdbImmediate();
    let flushedCount = 0;
    for (const item of items) {
      let payload: any = null;
      if (item.category === 'food') payload = bundle.foods[item.id];
      else if (item.category === 'rest') payload = bundle.restaurants[item.id];
      else if (item.category === 'dest') payload = bundle.destinations[item.id];
      else if (item.category === 'trend') payload = bundle.trendingFoods[item.id];

      if (!payload) {
        dequeuePendingMediaCloudSync(item.category, item.id, item.revision);
        continue;
      }
      const ok = await syncSingleOverrideRecordToCloud(item.category, item.id, payload, bundle);
      if (ok) flushedCount++;
    }
    return flushedCount;
  })();

  try {
    return await flushQueueInFlight;
  } finally {
    flushQueueInFlight = null;
  }
}

/**
 * Record an Admin or authorized user update to a FoodItem permanently across:
 *   1. Authoritative Food Revision Ledger (`kft_food_revision_ledger_v1`)
 *   2. Atomic Per-Record IndexedDB (`food:<id>`) & Master Bundle (`master_bundle`)
 *   3. Quota-Safe LocalStorage (`VAULT_KEYS.FOODS`)
 *   4. Persistent Cloud Sync Queue + Supabase Storage (`food-media/foods/...`) & KV (`kft_ov_food_<id>`)
 *
 * Preserves all existing Admin-edited food names, descriptions, categories, recipes (`ingredients`, `steps`),
 * and prices when replacing only the food image.
 */
export function saveAdminFoodOverridePermanently(
  food: FoodItem,
  options?: { awaitCloud?: boolean }
): Promise<{ override: FoodMediaOverride; cloudSynced: boolean }> {
  const bundle = loadLocalMediaOverrides();
  const ledger = loadFoodRevisionLedger();
  const prevOv = bundle.foods[food.id];
  const prevLedger = ledger[food.id];
  const nextRevision = Math.max(Number(prevOv?.revision || 0), Number(prevLedger?.revision || 0)) + 1;
  const prevMs = Math.max(
    prevOv?.adminApprovedAt ? Date.parse(prevOv.adminApprovedAt) || 0 : 0,
    prevOv?.updatedAt ? Date.parse(prevOv.updatedAt) || 0 : 0,
    prevLedger?.updatedAt ? Date.parse(prevLedger.updatedAt) || 0 : 0
  );
  // Guarantee strictly monotonic timestamp above seed baseline even if Admin replaces twice within the same millisecond
  const nowMs = Math.max(Date.now(), prevMs + 1, SEED_FOOD_PHOTO_BASELINE_MS + 1);
  const now = new Date(nowMs).toISOString();
  const photoHash = computeFastPhotoSignature(food.photoUrl);

  const seedFood = IMMUTABLE_SEED_FOOD_MAP.get(food.id);
  const cleanPhotoBase = (food.photoUrl || '').split('?')[0].trim();
  const cleanSeedBase = (seedFood?.photoUrl || `/foods/${food.id}.jpg`).split('?')[0].trim();
  const isCustomPhoto = cleanPhotoBase !== cleanSeedBase || Boolean(food.isCustomPhoto);

  const preservedIngredients =
    Array.isArray(food.ingredients) && food.ingredients.length > 0
      ? food.ingredients
      : Array.isArray(prevOv?.ingredients) && prevOv.ingredients.length > 0
      ? prevOv.ingredients
      : undefined;
  const preservedSteps =
    Array.isArray(food.steps) && food.steps.length > 0
      ? food.steps
      : Array.isArray(prevOv?.steps) && prevOv.steps.length > 0
      ? prevOv.steps
      : undefined;

  const overrideRecord: FoodMediaOverride = {
    id: food.id,
    photoUrl: food.photoUrl,
    cloudStorageUrl: food.photoUrl?.startsWith('https://') ? food.photoUrl : undefined,
    photoHash,
    revision: nextRevision,
    adminApprovedAt: now,
    nameKh: food.nameKh || prevOv?.nameKh,
    nameEn: food.nameEn || prevOv?.nameEn,
    categorySlug: food.categorySlug || prevOv?.categorySlug,
    categoryKh: food.categoryKh || prevOv?.categoryKh,
    categoryEn: food.categoryEn || prevOv?.categoryEn,
    descriptionKh: food.descriptionKh || prevOv?.descriptionKh,
    descriptionEn: food.descriptionEn || prevOv?.descriptionEn,
    cookTime: food.cookTime || prevOv?.cookTime,
    servings: food.servings || prevOv?.servings,
    calories: typeof food.calories === 'number' ? food.calories : prevOv?.calories,
    difficulty: food.difficulty || prevOv?.difficulty,
    ingredients: preservedIngredients,
    steps: preservedSteps,
    priceRiel: typeof food.priceRiel === 'number' ? food.priceRiel : prevOv?.priceRiel,
    priceUsd: typeof food.priceUsd === 'number' ? food.priceUsd : prevOv?.priceUsd,
    imageAuditStatus: food.imageAuditStatus || prevOv?.imageAuditStatus || 'verified',
    imageAuditNote: food.imageAuditNote || prevOv?.imageAuditNote,
    isCustomPhoto,
    updatedAt: now,
  };

  // 1. Write lightweight authoritative revision ledger FIRST (cannot fail 5MB quota)
  ledger[food.id] = {
    revision: nextRevision,
    updatedAt: now,
    photoHash,
    cloudSynced: false,
    cloudUrl: food.photoUrl?.startsWith('https://') ? food.photoUrl : undefined,
  };
  saveFoodRevisionLedger(ledger);

  // 2. Enqueue persistent cloud upload retry item BEFORE network call
  enqueuePendingMediaCloudSync('food', food.id, nextRevision, now);

  // 3. Update authoritative in-memory master bundle & synchronous localStorage immediately for zero-flicker UI
  const nextDeletedFoods = { ...(bundle.deletedFoods || loadDeletedFoodIdsMap()) };
  if (nextDeletedFoods[food.id]) {
    delete nextDeletedFoods[food.id];
    saveDeletedFoodIdsMap(nextDeletedFoods);
  }
  const nextBundle: AllMediaOverridesBundle = {
    ...bundle,
    foods: {
      ...bundle.foods,
      [food.id]: overrideRecord,
    },
    deletedFoods: nextDeletedFoods,
    updatedAt: now,
  };
  inMemoryMasterBundle = nextBundle;
  saveLocalMediaOverrides(nextBundle);

  // 4. Persist atomic per-record key to IndexedDB & push permanently to Supabase Cloud Storage + DB
  const idbPromise = saveSingleRecordToIdb(`food:${food.id}`, overrideRecord).catch(() => {});
  const cloudPromise = syncSingleOverrideRecordToCloud('food', food.id, overrideRecord, nextBundle, {
    isLiveAdminSave: true,
  }).catch(() => false);

  if (options?.awaitCloud) {
    return Promise.all([idbPromise, cloudPromise]).then(([, synced]) => {
      const latestOv = loadLocalMediaOverrides().foods[food.id] || overrideRecord;
      return { override: latestOv, cloudSynced: Boolean(synced) };
    });
  }

  return idbPromise.then(() => ({ override: overrideRecord, cloudSynced: false }));
}

export function recordPermanentFoodOverride(food: FoodItem): Promise<FoodMediaOverride> {
  return saveAdminFoodOverridePermanently(food, { awaitCloud: false }).then((res) => res.override);
}

async function syncTombstonesToCloud(bundle: AllMediaOverridesBundle): Promise<void> {
  const payload = {
    id: 'tombstones_v1',
    deletedFoods: bundle.deletedFoods || loadDeletedFoodIdsMap(),
    deletedRestaurants: bundle.deletedRestaurants || loadDeletedRestaurantIdsMap(),
    deletedDestinations: bundle.deletedDestinations || loadDeletedDestinationIdsMap(),
    updatedAt: bundle.updatedAt || new Date().toISOString(),
  };
  await saveSingleRecordToIdb(IDB_TOMBSTONES_KEY, payload).catch(() => {});
  if (!isSupabaseConfigured() || isSupabaseEgressCooldownActive()) return;
  try {
    await pushCloudDocument(VAULT_KEYS.TOMBSTONES_CLOUD_KEY, payload, 12000);
  } catch {}
}

/**
 * Remove an Admin-deleted food item from the permanent override vault and record a permanent deletion tombstone
 * across localStorage, IndexedDB, and Supabase Cloud so deleted items NEVER resurrect after app updates or cloud sync.
 */
export function removePermanentFoodOverride(foodId: string): void {
  if (!foodId) return;
  const bundle = loadLocalMediaOverrides();
  const now = new Date().toISOString();
  const nextDeletedFoods: Record<string, string> = {
    ...(bundle.deletedFoods || loadDeletedFoodIdsMap()),
    [foodId]: now,
  };
  saveDeletedFoodIdsMap(nextDeletedFoods);
  const nextFoods = { ...bundle.foods };
  delete nextFoods[foodId];
  const ledger = loadFoodRevisionLedger();
  if (ledger[foodId]) {
    delete ledger[foodId];
    saveFoodRevisionLedger(ledger);
  }
  dequeuePendingMediaCloudSync('food', foodId, Number.MAX_SAFE_INTEGER);
  deleteSingleRecordFromIdb(`food:${foodId}`).catch(() => {});
  const nextBundle: AllMediaOverridesBundle = {
    ...bundle,
    foods: nextFoods,
    deletedFoods: nextDeletedFoods,
    updatedAt: now,
  };
  inMemoryMasterBundle = nextBundle;
  saveLocalMediaOverrides(nextBundle);
  notifyPersistentMediaVaultSubscribers(nextBundle);
  Promise.allSettled([
    deleteCloudDocument(`${VAULT_KEYS.CLOUD_RECORD_PREFIX}food_${foodId}`),
    syncTombstonesToCloud(nextBundle),
  ]).catch(() => {});
}

/**
 * Record an Admin or VIP shop owner update to a Restaurant permanently.
 */
export function recordPermanentRestaurantOverride(rest: Restaurant): void {
  const bundle = loadLocalMediaOverrides();
  const now = new Date().toISOString();
  const primaryPhoto = sanitizeRestaurantShopPhoto(rest.id, rest.profileImage || rest.photoUrl || '');
  const cleanGallery = sanitizeRestaurantGalleryPhotos(rest.id, rest.galleryPhotos, primaryPhoto);
  const dedupedGallery = cleanGallery.filter((g) => g && g !== primaryPhoto);
  const gallerySet = new Set([primaryPhoto, ...dedupedGallery].filter(Boolean));
  const inferredBiz = inferBusinessTypeAndCategory(rest);
  const overrideRecord: RestaurantMediaOverride = {
    id: rest.id,
    photoUrl: primaryPhoto,
    profileImage: primaryPhoto,
    galleryPhotos: dedupedGallery.length > 0 ? dedupedGallery : undefined,
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
    addressEn: rest.addressEn,
    provinceKh: rest.provinceKh,
    provinceEn: rest.provinceEn,
    phone: rest.phone,
    openingHoursKh: rest.openingHoursKh,
    openingHoursEn: rest.openingHoursEn,
    signatureDishesKh: rest.signatureDishesKh,
    priceLevel: rest.priceLevel,
    promoVideoUrl: rest.promoVideoUrl,
    telegramUrl: rest.telegramUrl,
    facebookUrl: rest.facebookUrl,
    websiteUrl: rest.websiteUrl,
    businessCategory: inferredBiz.businessCategory,
    businessType: inferredBiz.businessType,
    categoryKh: inferredBiz.categoryKh,
    categoryEn: inferredBiz.categoryEn,
    ownerId: rest.ownerId,
    ownerName: rest.ownerName,
    ownerEmail: rest.ownerEmail,
    ownerPhone: rest.ownerPhone,
    mapUrl: rest.mapUrl,
    latitude: rest.latitude,
    longitude: rest.longitude,
    googlePlaceId: rest.googlePlaceId,
    dataSource: rest.dataSource,
    googleMapsMeta: rest.googleMapsMeta,
    locationVerificationStatus: rest.locationVerificationStatus,
    locationNeedsReview: rest.locationNeedsReview,
    locationReviewNote: rest.locationReviewNote,
    locationVerifiedAt: rest.locationVerifiedAt,
    status: rest.status,
    isVerified: rest.isVerified,
    isPromoted: rest.isPromoted,
    isFeatured: rest.isFeatured,
    membershipTier: rest.membershipTier,
    membershipExpiresAt: rest.membershipExpiresAt,
    storeSlotNumber: rest.storeSlotNumber,
    approvedAt: rest.approvedAt,
    featuredFromAt: rest.featuredFromAt,
    featuredUntilAt: rest.featuredUntilAt,
    createdAt: rest.createdAt || rest.created_at,
    created_at: rest.created_at || rest.createdAt,
    paymentStatus: rest.paymentStatus,
    isAdminEdited: true,
    adminEditedAt: rest.adminEditedAt || now,
    pendingPhotoReplacement: rest.pendingPhotoReplacement,
    pendingUpgradeRequest: rest.pendingUpgradeRequest,
    isCustomPhoto: Boolean(primaryPhoto),
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
  inMemoryMasterBundle = bundle;
  saveSingleRecordToIdb(`rest:${rest.id}`, overrideRecord).catch(() => {});
  enqueuePendingMediaCloudSync('rest', rest.id, 1, now);
  saveLocalMediaOverrides(bundle);
  notifyPersistentMediaVaultSubscribers(bundle);
  syncSingleOverrideRecordToCloud('rest', rest.id, overrideRecord, bundle).catch(() => {});
}

/**
 * Remove a deleted restaurant from the permanent override vault and record a permanent deletion tombstone.
 */
export function removePermanentRestaurantOverride(restaurantId: string, extraKeys: string[] = []): void {
  if (!restaurantId) return;
  const bundle = loadLocalMediaOverrides();
  const now = new Date().toISOString();
  const nextDeletedRestaurants: Record<string, string> = {
    ...(bundle.deletedRestaurants || loadDeletedRestaurantIdsMap()),
    [restaurantId]: now,
  };
  const existingOv = bundle.restaurants[restaurantId];
  if (existingOv?.googlePlaceId) {
    nextDeletedRestaurants[`gplace:${existingOv.googlePlaceId}`] = now;
    nextDeletedRestaurants[existingOv.googlePlaceId] = now;
  }
  const nextRestaurants = { ...bundle.restaurants };
  delete nextRestaurants[restaurantId];
  dequeuePendingMediaCloudSync('rest', restaurantId, Number.MAX_SAFE_INTEGER);
  deleteSingleRecordFromIdb(`rest:${restaurantId}`).catch(() => {});
  for (const extraKey of extraKeys) {
    if (extraKey) {
      nextDeletedRestaurants[extraKey] = now;
      if (nextRestaurants[extraKey]) {
        delete nextRestaurants[extraKey];
      }
      if (!extraKey.startsWith('gplace:')) {
        dequeuePendingMediaCloudSync('rest', extraKey, Number.MAX_SAFE_INTEGER);
        deleteSingleRecordFromIdb(`rest:${extraKey}`).catch(() => {});
      }
    }
  }
  saveDeletedRestaurantIdsMap(nextDeletedRestaurants);
  const nextBundle: AllMediaOverridesBundle = {
    ...bundle,
    restaurants: nextRestaurants,
    deletedRestaurants: nextDeletedRestaurants,
    updatedAt: now,
  };
  inMemoryMasterBundle = nextBundle;
  saveLocalMediaOverrides(nextBundle);
  notifyPersistentMediaVaultSubscribers(nextBundle);
  const deletePromises: Promise<any>[] = [
    deleteCloudDocument(`${VAULT_KEYS.CLOUD_RECORD_PREFIX}rest_${restaurantId}`),
    syncTombstonesToCloud(nextBundle),
  ];
  for (const extraKey of extraKeys) {
    if (extraKey && !extraKey.startsWith('gplace:')) {
      deletePromises.push(deleteCloudDocument(`${VAULT_KEYS.CLOUD_RECORD_PREFIX}rest_${extraKey}`));
    }
  }
  Promise.allSettled(deletePromises).finally(() => {
    pushMediaOverridesToCloud(nextBundle).catch(() => {});
  });
}

/**
 * Record an Admin update to a TouristDestination permanently.
 */
export function recordPermanentDestinationOverride(dest: TouristDestination): void {
  const bundle = loadLocalMediaOverrides();
  const prevOv = bundle.destinations[dest.id];
  const nextRevision = Math.max(Number(prevOv?.revision || 0) + 1, 1);
  const prevMs = Math.max(
    prevOv?.adminApprovedAt ? Date.parse(prevOv.adminApprovedAt) || 0 : 0,
    prevOv?.updatedAt ? Date.parse(prevOv.updatedAt) || 0 : 0
  );
  const now = new Date(Math.max(Date.now(), prevMs + 1)).toISOString();
  // Avoid storing a duplicate copy of a base64 photoUrl inside galleryPhotos
  const extraGallery = Array.isArray(dest.galleryPhotos)
    ? dest.galleryPhotos.filter((g) => g && g !== dest.photoUrl && !isObsoleteSeedPhoto(g))
    : undefined;
  const overrideRecord: DestinationMediaOverride = {
    id: dest.id,
    photoUrl: dest.photoUrl,
    photoHash: computeFastPhotoSignature(dest.photoUrl),
    revision: nextRevision,
    adminApprovedAt: now,
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
    locationVerificationStatus: dest.locationVerificationStatus,
    locationNeedsReview: dest.locationNeedsReview,
    locationReviewNote: dest.locationReviewNote,
    locationVerifiedAt: dest.locationVerifiedAt,
    isAdminEdited: dest.isAdminEdited ?? true,
    adminEditedAt: dest.adminEditedAt || now,
    isCustomPhoto: true,
    updatedAt: now,
  };
  const nextDeletedDestinations = { ...(bundle.deletedDestinations || loadDeletedDestinationIdsMap()) };
  let destTombChanged = false;
  if (nextDeletedDestinations[dest.id]) {
    delete nextDeletedDestinations[dest.id];
    destTombChanged = true;
  }
  if (dest.googlePlaceId) {
    if (nextDeletedDestinations[`gplace:${dest.googlePlaceId}`]) {
      delete nextDeletedDestinations[`gplace:${dest.googlePlaceId}`];
      destTombChanged = true;
    }
    if (nextDeletedDestinations[dest.googlePlaceId]) {
      delete nextDeletedDestinations[dest.googlePlaceId];
      destTombChanged = true;
    }
  }
  if (destTombChanged) {
    saveDeletedDestinationIdsMap(nextDeletedDestinations);
  }
  const nextBundle: AllMediaOverridesBundle = {
    ...bundle,
    destinations: {
      ...bundle.destinations,
      [dest.id]: overrideRecord,
    },
    deletedDestinations: nextDeletedDestinations,
    updatedAt: now,
  };
  inMemoryMasterBundle = nextBundle;
  saveSingleRecordToIdb(`dest:${dest.id}`, overrideRecord).catch(() => {});
  if (destTombChanged) {
    syncTombstonesToCloud(nextBundle).catch(() => {});
  }
  enqueuePendingMediaCloudSync('dest', dest.id, nextRevision, now);
  saveLocalMediaOverrides(nextBundle);
  notifyPersistentMediaVaultSubscribers(nextBundle);
  syncSingleOverrideRecordToCloud('dest', dest.id, overrideRecord, nextBundle).catch(() => {});
}

export function removePermanentDestinationOverride(destId: string, extraKeys: string[] = []): void {
  if (!destId) return;
  const bundle = loadLocalMediaOverrides();
  const now = new Date().toISOString();
  const nextDeletedDestinations: Record<string, string> = {
    ...(bundle.deletedDestinations || loadDeletedDestinationIdsMap()),
    [destId]: now,
  };
  const existingOv = bundle.destinations[destId];
  if (existingOv?.googlePlaceId) {
    nextDeletedDestinations[`gplace:${existingOv.googlePlaceId}`] = now;
    nextDeletedDestinations[existingOv.googlePlaceId] = now;
  }
  const nextDestinations = { ...bundle.destinations };
  delete nextDestinations[destId];
  dequeuePendingMediaCloudSync('dest', destId, Number.MAX_SAFE_INTEGER);
  deleteSingleRecordFromIdb(`dest:${destId}`).catch(() => {});
  for (const extraKey of extraKeys) {
    if (extraKey) {
      nextDeletedDestinations[extraKey] = now;
      if (nextDestinations[extraKey]) {
        delete nextDestinations[extraKey];
      }
      if (!extraKey.startsWith('gplace:')) {
        dequeuePendingMediaCloudSync('dest', extraKey, Number.MAX_SAFE_INTEGER);
        deleteSingleRecordFromIdb(`dest:${extraKey}`).catch(() => {});
      }
    }
  }
  saveDeletedDestinationIdsMap(nextDeletedDestinations);
  const nextBundle: AllMediaOverridesBundle = {
    ...bundle,
    destinations: nextDestinations,
    deletedDestinations: nextDeletedDestinations,
    updatedAt: now,
  };
  inMemoryMasterBundle = nextBundle;
  saveLocalMediaOverrides(nextBundle);
  notifyPersistentMediaVaultSubscribers(nextBundle);
  const deletePromises: Promise<any>[] = [
    deleteCloudDocument(`${VAULT_KEYS.CLOUD_RECORD_PREFIX}dest_${destId}`),
    syncTombstonesToCloud(nextBundle),
  ];
  for (const extraKey of extraKeys) {
    if (extraKey && !extraKey.startsWith('gplace:')) {
      deletePromises.push(deleteCloudDocument(`${VAULT_KEYS.CLOUD_RECORD_PREFIX}dest_${extraKey}`));
    }
  }
  Promise.allSettled(deletePromises).finally(() => {
    pushMediaOverridesToCloud(nextBundle).catch(() => {});
  });
}

/**
 * Record an Admin update to a TrendingFoodItem permanently.
 */
export function recordPermanentTrendingFoodOverride(item: TrendingFoodItem): void {
  const bundle = loadLocalMediaOverrides();
  const prevOv = bundle.trendingFoods[item.id];
  const nextRevision = Number(prevOv?.revision || 0) + 1;
  const prevMs = prevOv?.updatedAt ? Date.parse(prevOv.updatedAt) || 0 : 0;
  const now = new Date(Math.max(Date.now(), prevMs + 1)).toISOString();
  const overrideRecord: TrendingFoodMediaOverride = {
    id: item.id,
    photoUrl: item.photoUrl,
    photoHash: computeFastPhotoSignature(item.photoUrl),
    revision: nextRevision,
    adminApprovedAt: now,
    foodNameKh: item.foodNameKh,
    foodNameEn: item.foodNameEn,
    restaurantNameKh: item.restaurantNameKh,
    locationKh: item.locationKh,
    priceRange: item.priceRange,
    updatedAt: now,
  };
  saveSingleRecordToIdb(`trend:${item.id}`, overrideRecord).catch(() => {});
  enqueuePendingMediaCloudSync('trend', item.id, nextRevision, now);
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
  return text
    .replace(/\s*តាមរូបមន្តប្រពៃណីខ្មែរពិតៗ/g, '')
    .replace(/គឺជាម្ហូបតំណាងអត្តសញ្ញាណជាតិខ្មែរដ៏ល្បីល្បាញលើពិភពលោក[។\s]*/g, '')
    .replace(/ជាម្ហូបតំណាងអត្តសញ្ញាណជាតិខ្មែរ[^។]*[។\s]*/g, '')
    .replace(/ជាម្ហូបតំណាងជាតិខ្មែរ\s*(ដែល)?/g, '')
    .replace(/ជាម្[ហភ]ូបតំណាងខ្មែរ\s*(ដែល)?/g, '')
    .replace(/ម្[ហភ]ូបតំណាងខ្មែរ\s*/g, '')
    .replace(/ម្[ហភ]ូបតំណាងជាតិខ្មែរ\s*/g, '')
    .replace(/ជាកំពូលការីរាជវាំងខ្មែរដែល/g, '')
    .replace(/ជាសម្លការីបែបរាជវាំងខ្មែរ\s*(ដែល)?/g, '')
    .replace(/ជាកំពូលបង្អែមរាជវាំងដ៏ប្រណិត[។\s]*/g, '')
    .replace(/ជាម្[ហភ]ូបរាជវាំងខ្មែរ\s*(ដែល)?/g, '')
    .replace(/ម្[ហភ]ូបព្រះបរមរាជវាំង\s*/g, '')
    .replace(/ម្[ហភ]ូបរាជវាំង\s*/g, '')
    .replace(/ការីរាជវាំង/g, 'ការីពិសេស')
    .replace(/បង្អែមរាជវាំង/g, 'បង្អែមប្រពៃណី')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function applyFoodOverrides(
  foods: FoodItem[],
  overridesMap: Record<string, FoodMediaOverride> = loadLocalMediaOverrides().foods,
  explicitDeletedMap?: Record<string, string>
): FoodItem[] {
  const safeOverrides = overridesMap || {};
  const deletedFoodsMap =
    explicitDeletedMap || loadLocalMediaOverrides().deletedFoods || loadDeletedFoodIdsMap();
  const hasDeletedFoods = Object.keys(deletedFoodsMap).length > 0;
  const filteredBaseFoods = hasDeletedFoods
    ? foods.filter((f) => f && f.id && !deletedFoodsMap[f.id])
    : foods;

  // Also synthesize any Admin-inserted custom foods in safeOverrides that are not yet in filteredBaseFoods
  const existingFoodIds = new Set(filteredBaseFoods.map((f) => f.id));
  const synthesizedAdminFoods: FoodItem[] = [];
  for (const [ovId, ov] of Object.entries(safeOverrides)) {
    if (
      !ov ||
      !ovId ||
      existingFoodIds.has(ovId) ||
      deletedFoodsMap[ovId] ||
      IMMUTABLE_SEED_FOOD_MAP.has(ovId) ||
      !ov.nameKh ||
      !ov.photoUrl ||
      isRejectedLegacyFoodOverridePhoto(ovId, ov)
    ) {
      continue;
    }
    const gen = generateAuthenticRecipeByDishName(
      ov.nameKh,
      ov.nameEn || ov.nameKh,
      ov.categorySlug || 'specialty',
      ov.descriptionKh || ''
    );
    synthesizedAdminFoods.push({
      id: ovId,
      nameKh: ov.nameKh,
      nameEn: ov.nameEn || ov.nameKh,
      categorySlug: ov.categorySlug || 'specialty',
      categoryKh: ov.categoryKh || 'ម្ហូបខ្មែរ',
      categoryEn: ov.categoryEn || 'Cambodian Dish',
      descriptionKh: ov.descriptionKh || gen.descriptionKh,
      descriptionEn: ov.descriptionEn || gen.descriptionEn,
      photoUrl: ov.photoUrl,
      prepTime: '១៥ នាទី',
      cookTime: ov.cookTime || '៣០ នាទី',
      servings: ov.servings || '២-៣ នាក់',
      calories: ov.calories,
      difficulty: ov.difficulty || 'medium',
      priceRiel: typeof ov.priceRiel === 'number' ? ov.priceRiel : 0,
      priceUsd: typeof ov.priceUsd === 'number' ? ov.priceUsd : 0,
      rating: 5.0,
      reviewCount: 1,
      ingredients:
        Array.isArray(ov.ingredients) && ov.ingredients.length > 0 ? ov.ingredients : gen.ingredients,
      steps: Array.isArray(ov.steps) && ov.steps.length > 0 ? ov.steps : gen.steps,
      imageAuditStatus: ov.imageAuditStatus || 'verified',
      imageAuditNote: ov.imageAuditNote,
      isCustomPhoto: true,
      isAdminEdited: true,
      photoUpdatedAt: ov.updatedAt,
      adminApprovedAt: ov.adminApprovedAt || ov.updatedAt,
    });
    existingFoodIds.add(ovId);
  }

  const baseList =
    synthesizedAdminFoods.length > 0
      ? [...synthesizedAdminFoods, ...filteredBaseFoods]
      : filteredBaseFoods;
  let anyChanged = baseList.length !== foods.length || synthesizedAdminFoods.length > 0;
  const mapped = baseList.map((f) => {
    const cleanedBaseDescKh = stripLegacyFoodPhraseKh(f.descriptionKh);
    const ov = safeOverrides[f.id];
    if (!ov || !ov.photoUrl || isRejectedLegacyFoodOverridePhoto(f.id, ov)) {
      if (hasPlaceholderOrIncompleteRecipe(f.ingredients, f.steps)) {
        const gen = generateAuthenticRecipeByDishName(
          f.nameKh,
          f.nameEn,
          f.categorySlug,
          cleanedBaseDescKh
        );
        anyChanged = true;
        return {
          ...f,
          descriptionKh: gen.descriptionKh,
          descriptionEn: f.descriptionEn || gen.descriptionEn,
          ingredients: gen.ingredients,
          steps: gen.steps,
        };
      }
      if (cleanedBaseDescKh !== (f.descriptionKh || '')) {
        anyChanged = true;
        return { ...f, descriptionKh: cleanedBaseDescKh };
      }
      return f;
    }
    const seedFood = IMMUTABLE_SEED_FOOD_MAP.get(f.id);
    const ovTime = ov.updatedAt ? new Date(ov.updatedAt).getTime() : 0;
    const TRILINGUAL_RECIPE_AUDIT_BASELINE_MS = Date.parse('2026-11-01T14:30:00.000Z');
    const isPreAuditOverride = ovTime > 0 && ovTime < TRILINGUAL_RECIPE_AUDIT_BASELINE_MS;
    const isPreBakeOverride = ovTime > 0 && ovTime <= BAKED_STATIC_FOOD_ASSETS_MS && !ov.isCustomPhoto;
    const hasDeprecatedFoodMeta = Boolean(
      seedFood && isDeprecatedStaleFoodMetadata(f.id, ov.nameKh, ov.categorySlug)
    );

    const nextPhotoUrl =
      seedFood && ov.photoUrl.startsWith('/foods/') && !isGenuineCustomPhotoUrl(ov.photoUrl)
        ? seedFood.photoUrl
        : ov.photoUrl;
    const nextNameKh = hasDeprecatedFoodMeta && seedFood ? seedFood.nameKh : (ov.nameKh || f.nameKh);
    const isSameDishNameAsSeed = Boolean(
      seedFood && (nextNameKh || '').trim() === (seedFood.nameKh || '').trim()
    );
    const useAuditedSeedRecipeAndLocale = Boolean(
      seedFood && (hasDeprecatedFoodMeta || (isSameDishNameAsSeed && isPreAuditOverride))
    );

    const nextNameEn = useAuditedSeedRecipeAndLocale && seedFood ? seedFood.nameEn : (ov.nameEn || f.nameEn);
    const nextCategorySlug = useAuditedSeedRecipeAndLocale && seedFood ? seedFood.categorySlug : (ov.categorySlug || f.categorySlug);
    const nextCategoryKh = useAuditedSeedRecipeAndLocale && seedFood ? seedFood.categoryKh : (ov.categoryKh || f.categoryKh);
    const nextCategoryEn = useAuditedSeedRecipeAndLocale && seedFood ? seedFood.categoryEn : (ov.categoryEn || f.categoryEn);

    let nextDescriptionKh = stripLegacyFoodPhraseKh(
      useAuditedSeedRecipeAndLocale && seedFood?.descriptionKh
        ? seedFood.descriptionKh
        : ov.descriptionKh
        ? ov.descriptionKh
        : isSameDishNameAsSeed && isPreBakeOverride && seedFood?.descriptionKh
        ? seedFood.descriptionKh
        : cleanedBaseDescKh
    );
    let nextDescriptionEn =
      useAuditedSeedRecipeAndLocale && seedFood?.descriptionEn
        ? seedFood.descriptionEn
        : ov.descriptionEn
        ? ov.descriptionEn
        : isSameDishNameAsSeed && isPreBakeOverride && seedFood?.descriptionEn
        ? seedFood.descriptionEn
        : f.descriptionEn;

    const nextCookTime = ov.cookTime || f.cookTime;
    const nextServings = ov.servings || f.servings;
    const nextCalories = typeof ov.calories === 'number' && ov.calories > 0 ? ov.calories : f.calories;
    const nextDifficulty = ov.difficulty || f.difficulty;

    let nextIngredients =
      useAuditedSeedRecipeAndLocale && seedFood
        ? seedFood.ingredients
        : Array.isArray(ov.ingredients) && ov.ingredients.length > 0 && !hasPlaceholderOrIncompleteRecipe(ov.ingredients, ov.steps)
        ? ov.ingredients
        : isSameDishNameAsSeed && seedFood
        ? seedFood.ingredients
        : Array.isArray(ov.ingredients) && ov.ingredients.length > 0
        ? ov.ingredients
        : f.ingredients;

    let nextSteps =
      useAuditedSeedRecipeAndLocale && seedFood
        ? seedFood.steps
        : Array.isArray(ov.steps) && ov.steps.length > 0 && !hasPlaceholderOrIncompleteRecipe(ov.ingredients, ov.steps)
        ? ov.steps
        : isSameDishNameAsSeed && seedFood
        ? seedFood.steps
        : Array.isArray(ov.steps) && ov.steps.length > 0
        ? ov.steps
        : f.steps;

    // If a dish was newly inserted or renamed on device to a different dish name, ensure its recipe matches the new dish!
    if (
      hasPlaceholderOrIncompleteRecipe(nextIngredients, nextSteps) ||
      (!isSameDishNameAsSeed &&
        seedFood &&
        (areIngredientsIdentical(nextIngredients, seedFood.ingredients) ||
          areStepsIdentical(nextSteps, seedFood.steps)))
    ) {
      const generated = generateAuthenticRecipeByDishName(
        nextNameKh,
        nextNameEn,
        nextCategorySlug,
        nextDescriptionKh
      );
      nextIngredients = generated.ingredients;
      nextSteps = generated.steps;
      if (!nextDescriptionKh || (seedFood && nextDescriptionKh === stripLegacyFoodPhraseKh(seedFood.descriptionKh))) {
        nextDescriptionKh = generated.descriptionKh;
      }
      if (!nextDescriptionEn || (seedFood && nextDescriptionEn === seedFood.descriptionEn)) {
        nextDescriptionEn = generated.descriptionEn;
      }
    }

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
      f.cookTime === nextCookTime &&
      f.servings === nextServings &&
      f.calories === nextCalories &&
      f.difficulty === nextDifficulty &&
      f.ingredients === nextIngredients &&
      f.steps === nextSteps &&
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
      cookTime: nextCookTime,
      servings: nextServings,
      calories: nextCalories,
      difficulty: nextDifficulty,
      ingredients: nextIngredients,
      steps: nextSteps,
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
  overridesMap: Record<string, RestaurantMediaOverride> = loadLocalMediaOverrides().restaurants,
  explicitDeletedMap?: Record<string, string>
): Restaurant[] {
  const deletedMap =
    explicitDeletedMap || loadLocalMediaOverrides().deletedRestaurants || loadDeletedRestaurantIdsMap();
  const hasDeleted = Object.keys(deletedMap).length > 0;
  const filteredBase = restaurants.filter((r) => {
    if (!isStrictVerifiedCambodiaRestaurant(r)) return false;
    if (
      hasDeleted &&
      isRestaurantIdDeleted(
        r.id,
        r.updatedAt || r.photoUpdatedAt || r.adminEditedAt || r.createdAt,
        deletedMap,
        r.googlePlaceId
      )
    ) {
      return false;
    }
    return true;
  });
  let anyChanged = filteredBase.length !== restaurants.length;
  const safeOverrides = overridesMap || {};
  const seenIds = new Set<string>();
  const mapped = filteredBase.map((r) => {
    seenIds.add(r.id);
    const ov = safeOverrides[r.id];
    if (!ov) {
      const cleanBasePhoto = sanitizeRestaurantShopPhoto(r.id, r.photoUrl || r.profileImage || '');
      const cleanBaseProfile = sanitizeRestaurantShopPhoto(r.id, r.profileImage) || cleanBasePhoto;
      const cleanBaseGallery = sanitizeRestaurantGalleryPhotos(r.id, r.galleryPhotos, cleanBasePhoto);
      if (
        r.photoUrl !== cleanBasePhoto ||
        r.profileImage !== cleanBaseProfile ||
        (r.galleryPhotos || []).length !== cleanBaseGallery.length
      ) {
        anyChanged = true;
        return {
          ...r,
          photoUrl: cleanBasePhoto,
          profileImage: cleanBaseProfile,
          galleryPhotos: cleanBaseGallery,
        };
      }
      return r;
    }
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
    const CLEAN_STATIC_MEDIA_CUTOFF_MS = new Date('2026-10-29T15:05:00.000Z').getTime();
    const sanitizedBasePhoto = sanitizeVerifiedShopPhotoUrl(r.id, r.photoUrl);
    const hasCleanBundledShopPhoto =
      typeof sanitizedBasePhoto === 'string' && sanitizedBasePhoto.startsWith('/Shop/');
    const useOverrideShopPhoto =
      !hasCleanBundledShopPhoto ||
      ov.isCustomPhoto ||
      ov.isAdminEdited ||
      Boolean(ov.photoUrl && ov.photoUrl.startsWith('data:image/')) ||
      ovTime > CLEAN_STATIC_MEDIA_CUTOFF_MS;
    const candidateOvPhoto = ov.photoUrl || ov.profileImage || '';
    const rawOvPhoto = sanitizeVerifiedShopPhotoUrl(r.id, candidateOvPhoto);
    const photoUrl =
      useOverrideShopPhoto && rawOvPhoto
        ? rawOvPhoto
        : sanitizedBasePhoto || rawOvPhoto;
    const nextPhotoUpdatedAt = ovTime >= rTime ? (ov.updatedAt || r.photoUpdatedAt) : (r.photoUpdatedAt || ov.updatedAt);
    const nextUpdatedAt = ovTime >= rTime ? (ov.updatedAt || r.updatedAt) : (r.updatedAt || ov.updatedAt);
    const candidateOvProfile = sanitizeVerifiedShopPhotoUrl(r.id, ov.profileImage);
    const nextProfileImage =
      useOverrideShopPhoto && candidateOvProfile ? candidateOvProfile : photoUrl;
    const mergedBiz = inferBusinessTypeAndCategory({
      ...r,
      businessType: ov.businessType || r.businessType,
      businessCategory: ov.businessCategory || r.businessCategory,
      categoryKh: ov.categoryKh || r.categoryKh,
      categoryEn: ov.categoryEn || r.categoryEn,
      nameKh: ov.nameKh || r.nameKh,
      nameEn: ov.nameEn || r.nameEn,
      openingHoursKh: ov.openingHoursKh || r.openingHoursKh,
    });

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
      r.businessType === mergedBiz.businessType &&
      r.businessCategory === mergedBiz.businessCategory &&
      r.categoryKh === mergedBiz.categoryKh &&
      r.categoryEn === mergedBiz.categoryEn &&
      r.isVerified === (typeof ov.isVerified === 'boolean' ? ov.isVerified : r.isVerified) &&
      r.status === (ov.status || r.status) &&
      r.pendingPhotoReplacement === (ov.pendingPhotoReplacement !== undefined ? ov.pendingPhotoReplacement : r.pendingPhotoReplacement) &&
      r.pendingUpgradeRequest === (ov.pendingUpgradeRequest !== undefined ? ov.pendingUpgradeRequest : r.pendingUpgradeRequest) &&
      (r.menuItems || []).length === resolvedMenuItems.length &&
      (r.reviews || []).length === (Array.isArray(ov.reviews) ? ov.reviews : r.reviews || []).length
    ) {
      return r;
    }

    const ovHasVerifiedCambodiaLoc =
      isValidCambodiaCoordinates(ov.latitude, ov.longitude) &&
      ov.locationNeedsReview !== true &&
      ov.locationVerificationStatus !== 'needs_admin_review';
    const nextCleanGpid = isValidOfficialGooglePlaceId(ov.googlePlaceId)
      ? ov.googlePlaceId
      : (isValidOfficialGooglePlaceId(r.googlePlaceId) ? r.googlePlaceId : undefined);

    anyChanged = true;
    return {
      ...r,
      photoUrl,
      profileImage: nextProfileImage,
      galleryPhotos: useOverrideShopPhoto && Array.isArray(ov.galleryPhotos) && ov.galleryPhotos.length > 0
        ? Array.from(new Set([photoUrl, ...ov.galleryPhotos.map((u: string) => sanitizeVerifiedShopPhotoUrl(r.id, u))])).filter(Boolean)
        : (Array.isArray(r.galleryPhotos) && r.galleryPhotos.length > 0
            ? Array.from(new Set([photoUrl, ...r.galleryPhotos.map((u: string) => sanitizeVerifiedShopPhotoUrl(r.id, u))])).filter(Boolean)
            : [photoUrl].filter(Boolean)),
      foodImages: (() => {
        const gList = useOverrideShopPhoto && Array.isArray(ov.galleryPhotos) && ov.galleryPhotos.length > 0
          ? [photoUrl, ...ov.galleryPhotos]
          : [photoUrl, ...(r.galleryPhotos || [])];
        const gSet = new Set(gList.filter(Boolean));
        const rawFood = useOverrideShopPhoto && Array.isArray(ov.foodImages) ? ov.foodImages : (r.foodImages || []);
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
      addressEn: ov.addressEn || r.addressEn,
      provinceKh: ov.provinceKh || r.provinceKh,
      provinceEn: ov.provinceEn || r.provinceEn,
      phone: ov.phone !== undefined ? ov.phone : r.phone,
      openingHoursKh: ov.openingHoursKh || r.openingHoursKh,
      openingHoursEn: ov.openingHoursEn || r.openingHoursEn,
      signatureDishesKh: Array.isArray(ov.signatureDishesKh) && ov.signatureDishesKh.length > 0 ? ov.signatureDishesKh : r.signatureDishesKh,
      priceLevel: ov.priceLevel || r.priceLevel,
      promoVideoUrl: ov.promoVideoUrl !== undefined ? ov.promoVideoUrl : r.promoVideoUrl,
      telegramUrl: ov.telegramUrl !== undefined ? ov.telegramUrl : r.telegramUrl,
      facebookUrl: ov.facebookUrl !== undefined ? ov.facebookUrl : r.facebookUrl,
      websiteUrl: ov.websiteUrl !== undefined ? ov.websiteUrl : r.websiteUrl,
      businessCategory: mergedBiz.businessCategory,
      businessType: mergedBiz.businessType,
      categoryKh: mergedBiz.categoryKh,
      categoryEn: mergedBiz.categoryEn,
      ownerId: ov.ownerId || r.ownerId,
      ownerName: ov.ownerName || r.ownerName,
      ownerEmail: ov.ownerEmail || r.ownerEmail,
      ...((Boolean(ov.locationVerifiedAt) || !isSeedRestaurantId(r.id)) && ovHasVerifiedCambodiaLoc
        ? {
            mapUrl:
              isValidGoogleMapsUrl(ov.mapUrl) && (ov.isAdminEdited || ov.dataSource === 'vip_owner' || Boolean(ov.ownerId))
                ? ov.mapUrl!.trim()
                : buildCanonicalGoogleMapsPinUrl(ov.latitude!, ov.longitude!, nextCleanGpid),
            latitude: ov.latitude!,
            longitude: ov.longitude!,
            locationVerificationStatus: 'verified' as const,
            locationNeedsReview: false,
            locationReviewNote: ov.locationReviewNote ?? r.locationReviewNote,
            locationVerifiedAt: ov.locationVerifiedAt ?? r.locationVerifiedAt,
          }
        : isValidGoogleMapsUrl(ov.mapUrl)
          ? { mapUrl: ov.mapUrl!.trim() }
          : {}),
      googlePlaceId: nextCleanGpid,
      dataSource: ov.dataSource || r.dataSource,
      googleMapsMeta: ov.googleMapsMeta || r.googleMapsMeta,
      status: ov.status || r.status,
      isVerified: typeof ov.isVerified === 'boolean' ? ov.isVerified : r.isVerified,
      paymentStatus: ov.paymentStatus || r.paymentStatus,
      isAdminEdited: ov.isAdminEdited ?? r.isAdminEdited,
      adminEditedAt: ov.adminEditedAt || r.adminEditedAt,
      pendingPhotoReplacement: ov.pendingPhotoReplacement !== undefined ? ov.pendingPhotoReplacement : r.pendingPhotoReplacement,
      pendingUpgradeRequest: ov.pendingUpgradeRequest !== undefined ? ov.pendingUpgradeRequest : r.pendingUpgradeRequest,
      isCustomPhoto: Boolean(photoUrl),
      photoUpdatedAt: nextPhotoUpdatedAt,
      updatedAt: nextUpdatedAt,
    };
  });

  // Also append any custom VIP/Admin restaurants present in overridesMap that aren't in the list yet
  for (const [ovId, ov] of Object.entries(safeOverrides)) {
    if (seenIds.has(ovId) || !ov || (!ov.nameKh && !ov.nameEn)) continue;
    if (isRestaurantIdDeleted(ovId, ov.updatedAt, deletedMap, ov.googlePlaceId)) continue;
    // Never resurrect purged unverified seed restaurant IDs unless owned by a real VIP user
    if (
      isSeedRestaurantId(ovId) &&
      !IMMUTABLE_SEED_REST_MAP.has(ovId) &&
      (!ov.ownerId || ov.ownerId === 'owner-1')
    ) {
      continue;
    }
    const hasValidCoords = isValidCambodiaCoordinates(ov.latitude, ov.longitude);
    const hasVerifiedOvCoords =
      hasValidCoords &&
      ov.locationNeedsReview !== true &&
      ov.locationVerificationStatus !== 'needs_admin_review';
    const isRegisteredVipOrAdminShop =
      !isSeedRestaurantId(ovId) ||
      Boolean(ov.ownerId && ov.ownerId !== 'owner-1') ||
      ov.dataSource === 'vip_owner' ||
      Boolean(ov.isAdminEdited);
    if (!hasVerifiedOvCoords && !isRegisteredVipOrAdminShop) {
      continue;
    }

    const photoUrl = sanitizeRestaurantShopPhoto(ovId, ov.photoUrl || ov.profileImage || '');
    const cleanGpid = isValidOfficialGooglePlaceId(ov.googlePlaceId) ? ov.googlePlaceId : undefined;
    const resolvedCreatedAt = ov.createdAt || ov.created_at || ov.adminEditedAt || ov.updatedAt || new Date().toISOString();
    const synthBiz = inferBusinessTypeAndCategory({
      id: ovId,
      businessType: ov.businessType,
      businessCategory: ov.businessCategory,
      categoryKh: ov.categoryKh,
      categoryEn: ov.categoryEn,
      nameKh: ov.nameKh,
      nameEn: ov.nameEn,
      openingHoursKh: ov.openingHoursKh,
    });
    const isSynthHotel = synthBiz.businessType === 'hotel';
    const candidateRest: Restaurant = {
      id: ovId,
      nameKh: ov.nameKh || ov.nameEn || (isSynthHotel ? 'សណ្ឋាគារ និងកន្លែងស្នាក់នៅ' : 'ភោជនីយដ្ឋានខ្មែរ'),
      nameEn: ov.nameEn || ov.nameKh || (isSynthHotel ? 'Hotel & Stay' : 'Khmer Restaurant'),
      descriptionKh:
        ov.descriptionKh ||
        (isSynthHotel
          ? 'សណ្ឋាគារ និងកន្លែងស្នាក់នៅស្អាត មានផាសុកភាព និងសេវាកម្មល្អសម្រាប់ភ្ញៀវទេសចរ។'
          : 'ភោជនីយដ្ឋានម្ហូបខ្មែររសជាតិដើម ផាសុកភាព និងអនាម័យខ្ពស់។'),
      descriptionEn:
        ov.descriptionEn ||
        (isSynthHotel
          ? 'Comfortable hotel and accommodation with quality amenities for travelers.'
          : 'Authentic Cambodian restaurant.'),
      photoUrl,
      profileImage: photoUrl,
      galleryPhotos: sanitizeRestaurantGalleryPhotos(ovId, ov.galleryPhotos, photoUrl),
      foodImages: Array.isArray(ov.foodImages) ? ov.foodImages : [],
      menuItems: Array.isArray(ov.menuItems) ? ov.menuItems : [],
      reviews: Array.isArray(ov.reviews) ? ov.reviews : [],
      addressKh: ov.addressKh || 'រាជធានីភ្នំពេញ',
      addressEn: ov.addressEn || ov.addressKh || 'Phnom Penh',
      provinceKh: ov.provinceKh || 'រាជធានីភ្នំពេញ',
      provinceEn: ov.provinceEn || 'Phnom Penh',
      phone: ov.phone || '',
      openingHoursKh: ov.openingHoursKh || (isSynthHotel ? 'បើកទទួលភ្ញៀវ ២៤ ម៉ោង' : '០៧:០០ ព្រឹក - ០៩:០០ យប់'),
      openingHoursEn: ov.openingHoursEn || (isSynthHotel ? 'Open 24 Hours' : '07:00 AM - 09:00 PM'),
      priceLevel: ov.priceLevel || '$$',
      mapUrl:
        isValidGoogleMapsUrl(ov.mapUrl) && (ov.isAdminEdited || ov.dataSource === 'vip_owner' || Boolean(ov.ownerId) || !hasValidCoords)
          ? ov.mapUrl!.trim()
          : hasValidCoords
            ? buildCanonicalGoogleMapsPinUrl(ov.latitude!, ov.longitude!, cleanGpid)
            : (ov.mapUrl || ''),
      latitude: hasValidCoords ? ov.latitude! : (typeof ov.latitude === 'number' ? ov.latitude : 0),
      longitude: hasValidCoords ? ov.longitude! : (typeof ov.longitude === 'number' ? ov.longitude : 0),
      locationVerificationStatus:
        hasVerifiedOvCoords || ov.locationVerificationStatus === 'verified'
          ? 'verified'
          : (ov.locationVerificationStatus || 'needs_admin_review'),
      locationNeedsReview: !(hasVerifiedOvCoords || ov.locationVerificationStatus === 'verified'),
      locationReviewNote: ov.locationReviewNote,
      locationVerifiedAt: ov.locationVerifiedAt,
      rating: typeof ov.rating === 'number' ? ov.rating : 0,
      reviewCount: typeof ov.reviewCount === 'number' ? ov.reviewCount : 0,
      signatureDishesKh:
        Array.isArray(ov.signatureDishesKh) && ov.signatureDishesKh.length > 0
          ? ov.signatureDishesKh
          : [isSynthHotel ? 'បន្ទប់ស្អាត មានម៉ាស៊ីនត្រជាក់ និង Wi-Fi' : 'ម្ហូបប្រចាំហាង'],
      promoVideoUrl: ov.promoVideoUrl,
      telegramUrl: ov.telegramUrl,
      facebookUrl: ov.facebookUrl,
      websiteUrl: ov.websiteUrl,
      businessCategory: synthBiz.businessCategory,
      businessType: synthBiz.businessType,
      categoryKh: synthBiz.categoryKh,
      categoryEn: synthBiz.categoryEn,
      ownerId: ov.ownerId,
      ownerName: ov.ownerName,
      ownerEmail: ov.ownerEmail,
      ownerPhone: ov.ownerPhone,
      googlePlaceId: cleanGpid,
      dataSource: ov.dataSource || 'vip_owner',
      googleMapsMeta: ov.googleMapsMeta,
      status: ov.status || 'approved',
      isVerified: typeof ov.isVerified === 'boolean' ? ov.isVerified : true,
      isPromoted: typeof ov.isPromoted === 'boolean' ? ov.isPromoted : true,
      isFeatured: typeof ov.isFeatured === 'boolean' ? ov.isFeatured : true,
      membershipTier: ov.membershipTier || 'premium',
      membershipExpiresAt: ov.membershipExpiresAt,
      storeSlotNumber: ov.storeSlotNumber,
      approvedAt: ov.approvedAt || resolvedCreatedAt,
      featuredFromAt: ov.featuredFromAt || resolvedCreatedAt,
      featuredUntilAt: ov.featuredUntilAt,
      paymentStatus: ov.paymentStatus || 'verified',
      isAdminEdited: true,
      adminEditedAt: ov.adminEditedAt || ov.updatedAt,
      pendingPhotoReplacement: ov.pendingPhotoReplacement,
      pendingUpgradeRequest: ov.pendingUpgradeRequest,
      isCustomPhoto: Boolean(photoUrl),
      photoUpdatedAt: ov.updatedAt,
      created_at: resolvedCreatedAt,
      createdAt: resolvedCreatedAt,
      updatedAt: ov.updatedAt,
    };
    if (isStrictVerifiedCambodiaRestaurant(candidateRest)) {
      anyChanged = true;
      seenIds.add(ovId);
      mapped.push(candidateRest);
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
  overridesMap: Record<string, DestinationMediaOverride> = loadLocalMediaOverrides().destinations,
  explicitDeletedMap?: Record<string, string>
): TouristDestination[] {
  const deletedMap =
    explicitDeletedMap || loadLocalMediaOverrides().deletedDestinations || loadDeletedDestinationIdsMap();
  const hasDeleted = Object.keys(deletedMap).length > 0;
  const safeOverrides = overridesMap || {};
  const hasOverrides = Object.keys(safeOverrides).length > 0;
  if (!hasOverrides && !hasDeleted) return destinations;

  const filteredBase = hasDeleted
    ? destinations.filter(
        (d) => d && d.id && !isDestinationIdDeleted(d.id, undefined, deletedMap, d.googlePlaceId)
      )
    : destinations;

  const seenIds = new Set<string>();
  let anyChanged = filteredBase.length !== destinations.length;
  const mapped = filteredBase.map((d) => {
    seenIds.add(d.id);
    const ov = safeOverrides[d.id];
    if (!ov || !ov.photoUrl || isObsoleteSeedPhoto(ov.photoUrl)) return d;

    const seedItem = IMMUTABLE_SEED_DEST_MAP.get(d.id);
    const seedPhotoUrl = seedItem?.photoUrl || '';
    const isSeedBundledStaticPhoto =
      typeof seedPhotoUrl === 'string' && seedPhotoUrl.startsWith('/destinations/');
    const seedTime = seedItem?.photoUpdatedAt ? new Date(seedItem.photoUpdatedAt).getTime() : 0;
    const ovTime = ov.updatedAt ? new Date(ov.updatedAt).getTime() : 0;

    const CLEAN_STATIC_MEDIA_CUTOFF_MS = new Date('2026-10-29T15:05:00.000Z').getTime();
    const isOvStaticBundledDestPath =
      Boolean(seedItem) &&
      typeof ov.photoUrl === 'string' &&
      ov.photoUrl.startsWith('/destinations/');
    const useOverridePhoto =
      !isOvStaticBundledDestPath &&
      ovTime >= seedTime - 1000 &&
      (!isSeedBundledStaticPhoto ||
        isGenuineCustomPhotoUrl(ov.photoUrl) ||
        ov.isCustomPhoto ||
        ov.isAdminEdited ||
        Number(ov.revision || 0) > 0 ||
        Boolean(ov.adminApprovedAt) ||
        (ovTime > Math.max(seedTime, CLEAN_STATIC_MEDIA_CUTOFF_MS) + 1000));

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
        useOverridePhoto && Array.isArray(ov.galleryPhotos) && ov.galleryPhotos.length > 0
          ? [effectivePhotoUrl, ...ov.galleryPhotos.filter((g) => g && g !== effectivePhotoUrl && g !== ov.photoUrl)]
          : [effectivePhotoUrl],
      nameKh: ov.nameKh || d.nameKh,
      nameEn: ov.nameEn || d.nameEn,
      descriptionKh: ov.descriptionKh || d.descriptionKh,
      descriptionEn: ov.descriptionEn || d.descriptionEn,
      provinceKh: ov.provinceKh || d.provinceKh,
      provinceEn: ov.provinceEn || d.provinceEn,
      addressKh: ov.addressKh || d.addressKh,
      ...(Boolean(ov.locationVerifiedAt) || !seedItem
        ? {
            mapUrl: ov.mapUrl !== undefined ? ov.mapUrl : d.mapUrl,
            latitude: typeof ov.latitude === 'number' ? ov.latitude : d.latitude,
            longitude: typeof ov.longitude === 'number' ? ov.longitude : d.longitude,
            locationVerificationStatus: ov.locationVerificationStatus ?? d.locationVerificationStatus,
            locationNeedsReview: ov.locationNeedsReview ?? d.locationNeedsReview,
            locationReviewNote: ov.locationReviewNote ?? d.locationReviewNote,
            locationVerifiedAt: ov.locationVerifiedAt ?? d.locationVerifiedAt,
          }
        : {}),
      entryFeeKh: '',
      openingHoursKh: ov.openingHoursKh || d.openingHoursKh,
      googlePlaceId: isValidOfficialGooglePlaceId(ov.googlePlaceId)
        ? ov.googlePlaceId
        : (isValidOfficialGooglePlaceId(d.googlePlaceId) ? d.googlePlaceId : undefined),
      dataSource: ov.dataSource || d.dataSource,
      googleMapsMeta: ov.googleMapsMeta || d.googleMapsMeta,
      isAdminEdited: ov.isAdminEdited ?? d.isAdminEdited,
      adminEditedAt: ov.adminEditedAt || d.adminEditedAt,
      isCustomPhoto: true,
      photoUpdatedAt: nextPhotoUpdatedAt,
    };
  });

  // Also append any custom/imported destinations present in overridesMap that aren't in the array yet
  for (const [ovId, ov] of Object.entries(safeOverrides)) {
    if (
      !seenIds.has(ovId) &&
      ov &&
      !isDestinationIdDeleted(ovId, ov.updatedAt, deletedMap, ov.googlePlaceId) &&
      ov.photoUrl &&
      !isObsoleteSeedPhoto(ov.photoUrl) &&
      ov.nameKh
    ) {
      anyChanged = true;
      seenIds.add(ovId);
      const hasValidOvCoords = isValidCambodiaCoordinates(ov.latitude, ov.longitude) && !ov.locationNeedsReview;
      const cleanGpid = isValidOfficialGooglePlaceId(ov.googlePlaceId) ? ov.googlePlaceId : undefined;
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
        entranceFeeKh: '',
        entranceFeeEn: '',
        bestTimeToVisitKh: ov.openingHoursKh || '០៧:០០ ព្រឹក - ០៦:០០ ល្ងាច',
        bestTimeToVisitEn: '07:00 AM - 06:00 PM',
        mapUrl: hasValidOvCoords ? buildCanonicalGoogleMapsPinUrl(ov.latitude!, ov.longitude!, cleanGpid) : '',
        latitude: hasValidOvCoords ? ov.latitude! : 0,
        longitude: hasValidOvCoords ? ov.longitude! : 0,
        locationVerificationStatus: hasValidOvCoords ? 'verified' : 'needs_admin_review',
        locationNeedsReview: !hasValidOvCoords,
        locationReviewNote: hasValidOvCoords ? ov.locationReviewNote : (ov.locationReviewNote || 'Unverified attraction GPS — flagged for Admin review'),
        locationVerifiedAt: ov.locationVerifiedAt,
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
 * Apply permanent trending food overrides AND food photo overrides on top of any trending food list.
 * Ensures that replacing a food image in the Food tab (`vault.foods` / `foodsList`) immediately updates
 * the corresponding item in `TrendingFoodsRow` (`ម្ហូបកំពុងពេញនិយម`) and never shows stale static images.
 */
export function applyTrendingFoodOverrides(
  items: TrendingFoodItem[],
  overridesMap: Record<string, TrendingFoodMediaOverride> = loadLocalMediaOverrides().trendingFoods,
  foodOverridesMap: Record<string, FoodMediaOverride> = loadLocalMediaOverrides().foods,
  foodsList?: FoodItem[]
): TrendingFoodItem[] {
  if (!Array.isArray(items)) return [];
  const hasInvalid = items.some((item) => !item || !item.id);
  const validItems = hasInvalid ? items.filter((item): item is TrendingFoodItem => Boolean(item && item.id)) : items;
  const safeTrendOverrides = overridesMap || {};
  const safeFoodOverrides = foodOverridesMap || {};
  const foodByIdMap = new Map<string, FoodItem>();
  if (Array.isArray(foodsList)) {
    for (const f of foodsList) {
      if (f && f.id) foodByIdMap.set(f.id, f);
    }
  }

  let anyChanged = hasInvalid;
  const mapped = validItems.map((item) => {
    const ov = safeTrendOverrides[item.id];

    // Determine candidate food IDs linked to this trending dish
    const candidateIds: string[] = [];
    if (item.matchedFoodId) candidateIds.push(item.matchedFoodId);
    const pathMatch = String(item.photoUrl || '').match(/\/foods\/(food-\d+)\./);
    if (pathMatch && !candidateIds.includes(pathMatch[1])) {
      candidateIds.push(pathMatch[1]);
    }
    if (Array.isArray(item.fallbackFoodIds)) {
      for (const fid of item.fallbackFoodIds) {
        if (fid && !candidateIds.includes(fid)) candidateIds.push(fid);
      }
    }

    // Find the best updated food photo from vault.foods or foodsList
    let resolvedFoodPhoto = '';
    let resolvedFoodUpdatedAt = '';
    let resolvedMatchedFoodId = item.matchedFoodId;

    for (const fid of candidateIds) {
      const foodOv = safeFoodOverrides[fid];
      if (foodOv && foodOv.photoUrl && !isRejectedLegacyFoodOverridePhoto(fid, foodOv)) {
        resolvedFoodPhoto = foodOv.photoUrl;
        resolvedFoodUpdatedAt = foodOv.adminApprovedAt || foodOv.updatedAt || '';
        resolvedMatchedFoodId = fid;
        break;
      }
      const foodObj = foodByIdMap.get(fid);
      if (
        foodObj &&
        foodObj.photoUrl &&
        !isLegacyAutoScrapedFoodPlaceholderUrl(foodObj.photoUrl) &&
        (foodObj.isCustomPhoto ||
          foodObj.photoUrl.startsWith('data:') ||
          foodObj.photoUrl.startsWith('http') ||
          foodObj.photoUrl.startsWith('/foods/'))
      ) {
        resolvedFoodPhoto = foodObj.photoUrl;
        resolvedFoodUpdatedAt = foodObj.photoUpdatedAt || '';
        resolvedMatchedFoodId = fid;
        break;
      }
    }

    // Priority:
    // Compare timestamps between explicit TrendingFood override and updated Food override (`vault.foods` / `foodsList`)
    // so whichever image Admin replaced most recently ALWAYS appears across both Food and Trending Food views!
    let nextPhotoUrl = item.photoUrl;
    let nextPhotoUpdatedAt = item.photoUpdatedAt;
    let nextIsCustomPhoto = item.isCustomPhoto;

    const hasCustomTrendOvPhoto = Boolean(
      ov?.photoUrl &&
        !isObsoleteSeedPhoto(ov.photoUrl) &&
        !isLegacyAutoScrapedFoodPlaceholderUrl(ov.photoUrl) &&
        (ov.photoUrl.startsWith('data:') || ov.photoUrl.startsWith('http'))
    );
    const trendOvMs = ov?.updatedAt ? Date.parse(ov.updatedAt) || 0 : 0;
    const foodOvMs = resolvedFoodUpdatedAt ? Date.parse(resolvedFoodUpdatedAt) || 0 : 0;

    if (hasCustomTrendOvPhoto && resolvedFoodPhoto) {
      if (foodOvMs >= trendOvMs && foodOvMs > 0) {
        nextPhotoUrl = resolvedFoodPhoto;
        nextPhotoUpdatedAt = resolvedFoodUpdatedAt || nextPhotoUpdatedAt;
        nextIsCustomPhoto = true;
      } else {
        nextPhotoUrl = ov!.photoUrl;
        nextPhotoUpdatedAt = ov!.updatedAt || nextPhotoUpdatedAt;
        nextIsCustomPhoto = true;
      }
    } else if (hasCustomTrendOvPhoto) {
      nextPhotoUrl = ov!.photoUrl;
      nextPhotoUpdatedAt = ov!.updatedAt || nextPhotoUpdatedAt;
      nextIsCustomPhoto = true;
    } else if (resolvedFoodPhoto) {
      nextPhotoUrl = resolvedFoodPhoto;
      nextPhotoUpdatedAt = resolvedFoodUpdatedAt || nextPhotoUpdatedAt;
      nextIsCustomPhoto = true;
    } else if (ov?.photoUrl && !isObsoleteSeedPhoto(ov.photoUrl)) {
      nextPhotoUrl = ov.photoUrl;
      nextPhotoUpdatedAt = ov.updatedAt || nextPhotoUpdatedAt;
    }

    const nextFoodNameKh = ov?.foodNameKh || item.foodNameKh;
    const nextFoodNameEn = ov?.foodNameEn || item.foodNameEn;
    const nextRestNameKh = ov?.restaurantNameKh || item.restaurantNameKh;
    const nextLocationKh = ov?.locationKh || (item as any).locationKh;

    if (
      item.photoUrl === nextPhotoUrl &&
      item.foodNameKh === nextFoodNameKh &&
      item.foodNameEn === nextFoodNameEn &&
      item.restaurantNameKh === nextRestNameKh &&
      (item as any).locationKh === nextLocationKh &&
      item.matchedFoodId === resolvedMatchedFoodId &&
      item.isCustomPhoto === nextIsCustomPhoto &&
      item.photoUpdatedAt === nextPhotoUpdatedAt
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
      ...(nextLocationKh ? { locationKh: nextLocationKh } : {}),
      matchedFoodId: resolvedMatchedFoodId,
      isCustomPhoto: nextIsCustomPhoto,
      photoUpdatedAt: nextPhotoUpdatedAt,
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

let mediaSyncInFlightPromise: Promise<AllMediaOverridesBundle> | null = null;
let lastMediaCloudSyncAtMs = 0;
let hasBackfilledPerRecordKeysOnce = false;
const MEDIA_CLOUD_SYNC_COOLDOWN_MS = 25 * 1000; // 25s manifest delta cooldown (zero egress when unchanged)

/**
 * Reset in-memory vault caches (used for deterministic cold-restart automated verification).
 */
export function __resetMediaVaultInMemoryStateForTests(): void {
  inMemoryMasterBundle = null;
  hasHydratedFromIdbOnce = false;
  mediaSyncInFlightPromise = null;
  lastMediaCloudSyncAtMs = 0;
  hasBackfilledPerRecordKeysOnce = false;
  persistedInLocalStorageSets.foods = null;
  persistedInLocalStorageSets.restaurants = null;
  persistedInLocalStorageSets.destinations = null;
  resetSupabaseEgressCooldown();
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('online', () => {
    resetSupabaseEgressCooldown();
    flushPendingMediaCloudQueue().catch(() => {});
  });
}

function didOverrideBundleRecordsChange(
  prev: AllMediaOverridesBundle,
  next: AllMediaOverridesBundle
): boolean {
  const compareMap = (a: Record<string, any> = {}, b: Record<string, any> = {}): boolean => {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return true;
    for (const k of bKeys) {
      const av = a[k];
      const bv = b[k];
      if (av === bv) continue;
      if (!av || !bv) return true;
      if (typeof av === 'string' || typeof bv === 'string') {
        if (av !== bv) return true;
        continue;
      }
      if (
        av.revision !== bv.revision ||
        av.updatedAt !== bv.updatedAt ||
        av.photoUrl !== bv.photoUrl ||
        av.photoHash !== bv.photoHash
      ) {
        return true;
      }
    }
    return false;
  };
  return (
    compareMap(prev.foods, next.foods) ||
    compareMap(prev.restaurants, next.restaurants) ||
    compareMap(prev.destinations, next.destinations) ||
    compareMap(prev.trendingFoods, next.trendingFoods) ||
    compareMap(prev.deletedFoods, next.deletedFoods) ||
    compareMap(prev.deletedRestaurants, next.deletedRestaurants) ||
    compareMap(prev.deletedDestinations, next.deletedDestinations)
  );
}

/**
 * Fast local-only hydration from `localStorage` + `IndexedDB` (<15ms, zero network wait).
 * Called immediately on startup so custom photos stored in IndexedDB render before any network request.
 */
export async function hydrateFromLocalIdbImmediate(): Promise<AllMediaOverridesBundle> {
  if (inMemoryMasterBundle && hasHydratedFromIdbOnce) {
    return inMemoryMasterBundle;
  }
  const beforeIdb = loadLocalMediaOverrides();
  let current = beforeIdb;
  try {
    const idbBundle = await loadBundleFromIdb();
    hasHydratedFromIdbOnce = true;
    if (idbBundle) {
      current = mergeOverrideBundles(beforeIdb, idbBundle);
      inMemoryMasterBundle = current;
      // Only rewrite localStorage + IndexedDB if IndexedDB actually contained newer or additional records
      if (didOverrideBundleRecordsChange(beforeIdb, current)) {
        saveLocalMediaOverrides(current);
        notifyPersistentMediaVaultSubscribers(current);
      }
    }
  } catch {
    hasHydratedFromIdbOnce = true;
  }
  return current;
}

const mediaSyncProgressListeners = new Set<(bundle: AllMediaOverridesBundle) => void>();

/**
 * Hydrate and synchronize permanent media overrides from:
 *   1. In-memory master cache (`inMemoryMasterBundle`)
 *   2. LocalStorage (`VAULT_KEYS` + `kft_food_revision_ledger_v1`)
 *   3. IndexedDB (`kft_permanent_media_vault_idb_v1` — atomic per-record keys + `master_bundle`)
 *   4. Persistent Cloud Retry Queue (`kft_pending_media_cloud_queue_v1`) -> pushed first!
 *   5. Supabase Cloud Atomic Per-Record Keys (`kft_ov_food_*`, `kft_ov_rest_*`, `kft_ov_dest_*`, `kft_ov_trend_*`)
 *      via lightweight manifest delta check (`kft_cloud_row_seen_v1`) + strict revision/timestamp ordering
 */
export async function hydrateAndSyncMediaOverrides(
  forceCloud: boolean | { force?: boolean; resetCooldown?: boolean } = false,
  onProgress?: (bundle: AllMediaOverridesBundle) => void
): Promise<AllMediaOverridesBundle> {
  const isForced = typeof forceCloud === 'object' ? Boolean(forceCloud?.force) : Boolean(forceCloud);
  const shouldResetCooldown = typeof forceCloud === 'object' && Boolean(forceCloud?.resetCooldown);
  if (shouldResetCooldown) {
    resetSupabaseEgressCooldown();
  }
  if (onProgress) {
    mediaSyncProgressListeners.add(onProgress);
  }
  const notifyListeners = (bundle: AllMediaOverridesBundle) => {
    const uniqueListeners = new Set<(b: AllMediaOverridesBundle) => void>([
      ...Array.from(mediaSyncProgressListeners),
      ...Array.from(persistentMediaVaultSubscribers),
    ]);
    for (const fn of uniqueListeners) {
      try {
        fn(bundle);
      } catch {}
    }
  };

  // Detect fresh APK installation, app build upgrade, or cleared cache so we always force a full cloud verification
  let isBuildUpgradeOrEmptyVault = false;
  try {
    if (typeof localStorage !== 'undefined') {
      const savedBuild = localStorage.getItem(VAULT_KEYS.LAST_SYNCED_BUILD);
      if (savedBuild !== String(APP_BUILD_CODE)) {
        isBuildUpgradeOrEmptyVault = true;
      }
    }
  } catch {}

  if (mediaSyncInFlightPromise) {
    try {
      return await mediaSyncInFlightPromise;
    } finally {
      if (onProgress) mediaSyncProgressListeners.delete(onProgress);
    }
  }
  const now = Date.now();
  if (
    !isForced &&
    !isBuildUpgradeOrEmptyVault &&
    lastMediaCloudSyncAtMs > 0 &&
    now - lastMediaCloudSyncAtMs < MEDIA_CLOUD_SYNC_COOLDOWN_MS &&
    inMemoryMasterBundle
  ) {
    if (onProgress) mediaSyncProgressListeners.delete(onProgress);
    return inMemoryMasterBundle;
  }

  mediaSyncInFlightPromise = (async () => {
    let current = await hydrateFromLocalIdbImmediate();
    let hasRemoteChanges = false;
    if (Object.keys(current.foods || {}).length === 0) {
      isBuildUpgradeOrEmptyVault = true;
    }

    // 1. Flush any pending unsynced local Admin overrides to Supabase Cloud FIRST
    // so newer local replacements are never overwritten by stale cloud state
    if (isSupabaseConfigured() && !isSupabaseEgressCooldownActive()) {
      await flushPendingMediaCloudQueue().catch(() => {});
      if (inMemoryMasterBundle) {
        current = mergeOverrideBundles(current, inMemoryMasterBundle);
      }
    }

    // 2. Merge from Supabase Cloud using manifest-first delta sync + progressive chunked batching
    if (isSupabaseConfigured() && !isSupabaseEgressCooldownActive()) {
      try {
        lastMediaCloudSyncAtMs = Date.now();
        const manifest = await pullCloudKeysManifestByPrefix(VAULT_KEYS.CLOUD_RECORD_PREFIX, 12000);
        const existingPerRecordKeys = new Set<string>();
        const remoteUpdatedAtMap = new Map<string, number>();
        const keysToFetch: string[] = [];
        // On APK update, reinstall, or cache clear, ignore stale seenRows so every cloud override is verified fresh
        const seenRows = isBuildUpgradeOrEmptyVault ? {} : loadSeenCloudRowTimestamps();
        const pendingQueue = loadPendingMediaCloudQueue();

        if (Array.isArray(manifest) && manifest.length > 0) {
          for (const item of manifest) {
            existingPerRecordKeys.add(item.key);
            const remoteMs = item.updated_at ? new Date(item.updated_at).getTime() : 0;
            remoteUpdatedAtMap.set(item.key, remoteMs);
            let hasLocalPhoto = false;
            let seedUpdatedAtMs = 0;
            let hasUnsyncedLocalPending = false;
            if (item.key === VAULT_KEYS.TOMBSTONES_CLOUD_KEY) {
              if (isBuildUpgradeOrEmptyVault || !item.updated_at || seenRows[item.key] !== item.updated_at) {
                keysToFetch.unshift(item.key);
              }
              continue;
            } else if (item.key.startsWith('kft_ov_food_')) {
              const id = item.key.slice('kft_ov_food_'.length);
              if (current.deletedFoods?.[id]) {
                deleteCloudDocument(item.key).catch(() => {});
                continue;
              }
              hasLocalPhoto = Boolean(current.foods[id]?.photoUrl && !isObsoleteSeedPhoto(current.foods[id]?.photoUrl));
              hasUnsyncedLocalPending = Boolean(pendingQueue[`food:${id}`]);
              seedUpdatedAtMs = 0;
            } else if (item.key.startsWith('kft_ov_rest_')) {
              const id = item.key.slice('kft_ov_rest_'.length);
              if (current.deletedRestaurants?.[id] || isRestaurantIdDeleted(id, undefined, current.deletedRestaurants)) {
                deleteCloudDocument(item.key).catch(() => {});
                continue;
              }
              hasLocalPhoto = Boolean(current.restaurants[id]?.photoUrl || current.restaurants[id]?.profileImage);
              hasUnsyncedLocalPending = Boolean(pendingQueue[`rest:${id}`]);
            } else if (item.key.startsWith('kft_ov_dest_')) {
              const id = item.key.slice('kft_ov_dest_'.length);
              if (current.deletedDestinations?.[id] || isDestinationIdDeleted(id, undefined, current.deletedDestinations)) {
                deleteCloudDocument(item.key).catch(() => {});
                continue;
              }
              hasLocalPhoto = Boolean(current.destinations[id]?.photoUrl && !isObsoleteSeedPhoto(current.destinations[id]?.photoUrl));
              hasUnsyncedLocalPending = Boolean(pendingQueue[`dest:${id}`]);
              const seedDest = IMMUTABLE_SEED_DEST_MAP.get(id);
              if (seedDest?.photoUrl?.startsWith('/destinations/') && seedDest.photoUpdatedAt) {
                seedUpdatedAtMs = new Date(seedDest.photoUpdatedAt).getTime() || 0;
              }
            } else if (item.key.startsWith('kft_ov_trend_')) {
              const id = item.key.slice('kft_ov_trend_'.length);
              hasLocalPhoto = Boolean(current.trendingFoods[id]?.photoUrl && !isObsoleteSeedPhoto(current.trendingFoods[id]?.photoUrl));
              hasUnsyncedLocalPending = Boolean(pendingQueue[`trend:${id}`]);
            }

            // Never pull an older remote record over an unsynced local replacement waiting in queue
            if (hasUnsyncedLocalPending && hasLocalPhoto) {
              continue;
            }
            // Skip downloading unchanged cloud rows we already fetched & verified on this exact build (0 bytes wasted egress!)
            if (hasLocalPhoto && item.updated_at && seenRows[item.key] === item.updated_at) {
              continue;
            }

            // Skip downloading destination cloud rows whose table timestamp is older than the bundled destination seed baseline
            if (seedUpdatedAtMs > 0 && remoteMs > 0 && remoteMs <= seedUpdatedAtMs) {
              continue;
            }

            // Always fetch any missing or updated cloud row (never skip changed cloud rows due to client/server clock skew!)
            keysToFetch.push(item.key);
          }
        }

        // Fetch any missing or newer per-record overrides in progressive batches of 10 keys
        if (keysToFetch.length > 0) {
          const BATCH_SIZE = 10;
          let seenChanged = false;
          const canCleanupStaleCloud =
            typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('kft_admin_session_token'));
          for (let i = 0; i < keysToFetch.length; i += BATCH_SIZE) {
            const batchKeys = keysToFetch.slice(i, i + BATCH_SIZE);
            const rows = await pullCloudDocumentsByKeys<any>(batchKeys, 18000);
            if (!Array.isArray(rows) || rows.length === 0) continue;

            const batchBundle: AllMediaOverridesBundle = {
              foods: {},
              restaurants: {},
              destinations: {},
              trendingFoods: {},
              updatedAt: new Date().toISOString(),
            };
            let batchChanged = false;

            for (const row of rows) {
              const payload = row.payload;
              if (!payload || typeof payload !== 'object') continue;
              if (row.key === VAULT_KEYS.TOMBSTONES_CLOUD_KEY) {
                if (row.updated_at) {
                  seenRows[row.key] = row.updated_at;
                  seenChanged = true;
                }
                if (payload.deletedFoods && typeof payload.deletedFoods === 'object') {
                  batchBundle.deletedFoods = { ...(batchBundle.deletedFoods || {}), ...payload.deletedFoods };
                  batchChanged = true;
                  hasRemoteChanges = true;
                }
                if (payload.deletedRestaurants && typeof payload.deletedRestaurants === 'object') {
                  batchBundle.deletedRestaurants = {
                    ...(batchBundle.deletedRestaurants || {}),
                    ...payload.deletedRestaurants,
                  };
                  batchChanged = true;
                  hasRemoteChanges = true;
                }
                if (payload.deletedDestinations && typeof payload.deletedDestinations === 'object') {
                  batchBundle.deletedDestinations = {
                    ...(batchBundle.deletedDestinations || {}),
                    ...payload.deletedDestinations,
                  };
                  batchChanged = true;
                  hasRemoteChanges = true;
                }
                continue;
              }
              if (!payload.id) continue;
              // Record seen row timestamp WITHOUT inflating payload.updatedAt!
              if (row.updated_at) {
                seenRows[row.key] = row.updated_at;
                seenChanged = true;
              }
              if (row.key.startsWith('kft_ov_food_')) {
                if (isRejectedLegacyFoodOverridePhoto(payload.id, payload)) {
                  if (!current.foods[payload.id]) {
                    deleteSingleRecordFromIdb(`food:${payload.id}`).catch(() => {});
                  }
                  if (canCleanupStaleCloud && !current.foods[payload.id] && !pendingQueue[`food:${payload.id}`]) {
                    deleteCloudDocument(row.key).catch(() => {});
                  }
                  continue;
                }
                batchBundle.foods[payload.id] = payload;
                batchChanged = true;
                hasRemoteChanges = true;
              } else if (row.key.startsWith('kft_ov_rest_')) {
                batchBundle.restaurants[payload.id] = payload;
                batchChanged = true;
                hasRemoteChanges = true;
              } else if (row.key.startsWith('kft_ov_dest_')) {
                batchBundle.destinations[payload.id] = payload;
                batchChanged = true;
                hasRemoteChanges = true;
              } else if (row.key.startsWith('kft_ov_trend_')) {
                if (isLegacyAutoScrapedFoodPlaceholderUrl(payload.photoUrl)) {
                  if (!current.trendingFoods[payload.id]) {
                    deleteSingleRecordFromIdb(`trend:${payload.id}`).catch(() => {});
                  }
                  continue;
                }
                batchBundle.trendingFoods[payload.id] = payload;
                batchChanged = true;
                hasRemoteChanges = true;
              }
            }

            if (batchChanged) {
              current = mergeOverrideBundles(current, batchBundle);
              inMemoryMasterBundle = current;
              // Persist ONLY the winning merged records into IndexedDB so an older cloud payload never clobbers a newer local replacement
              for (const fid of Object.keys(batchBundle.foods)) {
                const winner = current.foods[fid];
                if (winner) {
                  saveSingleRecordToIdb(`food:${fid}`, winner).catch(() => {});
                }
              }
              for (const rid of Object.keys(batchBundle.restaurants)) {
                const winner = current.restaurants[rid];
                if (winner) {
                  saveSingleRecordToIdb(`rest:${rid}`, winner).catch(() => {});
                }
              }
              for (const did of Object.keys(batchBundle.destinations)) {
                const winner = current.destinations[did];
                if (winner) {
                  saveSingleRecordToIdb(`dest:${did}`, winner).catch(() => {});
                }
              }
              for (const tid of Object.keys(batchBundle.trendingFoods)) {
                const winner = current.trendingFoods[tid];
                if (winner) {
                  saveSingleRecordToIdb(`trend:${tid}`, winner).catch(() => {});
                }
              }
              notifyListeners(current);
            }
          }
          if (seenChanged) {
            saveSeenCloudRowTimestamps(seenRows);
          }
        }

        // On fresh install / build upgrade, also merge any historical overrides from legacy `kft_cloud_media_overrides_v1`
        // that do NOT yet have a dedicated `kft_ov_*` per-record key (never letting legacy entries override per-record keys!)
        if (Array.isArray(manifest) && (existingPerRecordKeys.size === 0 || isBuildUpgradeOrEmptyVault)) {
          const cloudBundle = await pullCloudDocument<AllMediaOverridesBundle>(VAULT_KEYS.CLOUD_DOC_KEY, 15000);
          if (cloudBundle) {
            const filteredLegacy: AllMediaOverridesBundle = {
              foods: {},
              deletedFoods: cloudBundle.deletedFoods,
              restaurants: {},
              deletedRestaurants: cloudBundle.deletedRestaurants,
              destinations: {},
              deletedDestinations: cloudBundle.deletedDestinations,
              trendingFoods: {},
              updatedAt: cloudBundle.updatedAt || new Date().toISOString(),
            };
            let anyLegacyMissingFromPerRecord = false;
            for (const [fid, fOv] of Object.entries(cloudBundle.foods || {})) {
              if (
                !current.deletedFoods?.[fid] &&
                !cloudBundle.deletedFoods?.[fid] &&
                !existingPerRecordKeys.has(`kft_ov_food_${fid}`) &&
                !pendingQueue[`food:${fid}`]
              ) {
                filteredLegacy.foods[fid] = fOv;
                anyLegacyMissingFromPerRecord = true;
              }
            }
            for (const [rid, rOv] of Object.entries(cloudBundle.restaurants || {})) {
              if (
                !isRestaurantIdDeleted(rid, rOv?.updatedAt, current.deletedRestaurants, rOv?.googlePlaceId) &&
                !isRestaurantIdDeleted(rid, rOv?.updatedAt, cloudBundle.deletedRestaurants, rOv?.googlePlaceId) &&
                !existingPerRecordKeys.has(`kft_ov_rest_${rid}`) &&
                !pendingQueue[`rest:${rid}`]
              ) {
                filteredLegacy.restaurants[rid] = rOv;
                anyLegacyMissingFromPerRecord = true;
              }
            }
            for (const [did, dOv] of Object.entries(cloudBundle.destinations || {})) {
              if (
                !isDestinationIdDeleted(did, dOv?.updatedAt, current.deletedDestinations, dOv?.googlePlaceId) &&
                !isDestinationIdDeleted(did, dOv?.updatedAt, cloudBundle.deletedDestinations, dOv?.googlePlaceId) &&
                !existingPerRecordKeys.has(`kft_ov_dest_${did}`) &&
                !pendingQueue[`dest:${did}`]
              ) {
                filteredLegacy.destinations[did] = dOv;
                anyLegacyMissingFromPerRecord = true;
              }
            }
            for (const [tid, tOv] of Object.entries(cloudBundle.trendingFoods || {})) {
              if (!existingPerRecordKeys.has(`kft_ov_trend_${tid}`) && !pendingQueue[`trend:${tid}`]) {
                filteredLegacy.trendingFoods[tid] = tOv;
                anyLegacyMissingFromPerRecord = true;
              }
            }
            const hasCloudTombstones =
              Boolean(cloudBundle.deletedFoods && Object.keys(cloudBundle.deletedFoods).length > 0) ||
              Boolean(cloudBundle.deletedRestaurants && Object.keys(cloudBundle.deletedRestaurants).length > 0) ||
              Boolean(cloudBundle.deletedDestinations && Object.keys(cloudBundle.deletedDestinations).length > 0);
            if (anyLegacyMissingFromPerRecord || hasCloudTombstones) {
              hasRemoteChanges = true;
              current = mergeOverrideBundles(current, filteredLegacy);
              inMemoryMasterBundle = current;
            }
          }
        }

        if (Array.isArray(manifest)) {
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(VAULT_KEYS.LAST_SYNCED_BUILD, String(APP_BUILD_CODE));
            }
          } catch {}
        }

        // Automatically backfill any local admin overrides missing from Supabase (only when an admin session is active)
        const hasActiveAdminSession =
          typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('kft_admin_session_token'));
        if (hasActiveAdminSession && !hasBackfilledPerRecordKeysOnce && Array.isArray(manifest)) {
          hasBackfilledPerRecordKeysOnce = true;
          (async () => {
            try {
              for (const [fid, fOv] of Object.entries(current.foods || {})) {
                if (isSupabaseEgressCooldownActive()) break;
                if (!fOv || !fOv.photoUrl || isObsoleteSeedPhoto(fOv.photoUrl)) continue;
                const key = `kft_ov_food_${fid}`;
                const localMs = (fOv.adminApprovedAt ? Date.parse(fOv.adminApprovedAt) : 0) || (fOv.updatedAt ? Date.parse(fOv.updatedAt) : 0) || 0;
                const remoteMs = remoteUpdatedAtMap.get(key) || 0;
                if (!existingPerRecordKeys.has(key) || (localMs > 0 && localMs > remoteMs + 2000)) {
                  await syncSingleOverrideRecordToCloud('food', fid, fOv, current);
                }
              }
              for (const [tid, tOv] of Object.entries(current.trendingFoods || {})) {
                if (isSupabaseEgressCooldownActive()) break;
                if (!tOv || !tOv.photoUrl || isObsoleteSeedPhoto(tOv.photoUrl)) continue;
                const key = `kft_ov_trend_${tid}`;
                const localMs = (tOv.adminApprovedAt ? Date.parse(tOv.adminApprovedAt) : 0) || (tOv.updatedAt ? Date.parse(tOv.updatedAt) : 0) || 0;
                const remoteMs = remoteUpdatedAtMap.get(key) || 0;
                if (!existingPerRecordKeys.has(key) || (localMs > 0 && localMs > remoteMs + 2000)) {
                  await syncSingleOverrideRecordToCloud('trend', tid, tOv, current);
                }
              }
            } catch {}
          })();
        }
      } catch {}
    }

    if (inMemoryMasterBundle && hasRemoteChanges) {
      current = mergeOverrideBundles(current, inMemoryMasterBundle);
    }
    if (hasRemoteChanges) {
      saveLocalMediaOverrides(current);
      notifyListeners(current);
    }
    return current;
  })();

  try {
    return await mediaSyncInFlightPromise;
  } finally {
    mediaSyncInFlightPromise = null;
    if (onProgress) mediaSyncProgressListeners.delete(onProgress);
  }
}
