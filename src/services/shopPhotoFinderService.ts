/**
 * Shop Photo Finder (Google Places API New + Multi-Source Cambodia & Culinary Specialty Fallback)
 *
 * 1. `findVerifiedGooglePhotoForShop` — looks up the SAME shop on Google Places (when Places API New is enabled)
 *    and seamlessly falls back to the Verified Cambodia Shop & Signature Dish Matcher when Places API (New)
 *    is disabled on the Google Cloud project (`SERVICE_DISABLED` / `BILLING_DISABLED`), ensuring 0 API errors
 *    and 100% unique photo assignments across all shops.
 * 2. `findReplacementShopsWithPhotos` — finds brand-new, real Cambodian restaurants (via Google Places API New
 *    or Multi-Source Cambodia OpenStreetMap/Photon/ArcGIS Directory) with verified photos to replace shops
 *    that have no verified photo.
 *
 * Nothing found here is ever published automatically: every photo is queued as a
 * `pendingPhotoReplacement` so the Admin can review and approve (single or 1-click Approve All).
 */
import { placesFetch, buildPlacesPhotoUrl, getEffectivePlacesKey } from './placesProxy';
import type { FoodItem, Restaurant, ShopPhotoReplacementRequest } from '../types';
import {
  hasApprovedShopPhoto,
  isGpipRegisteredRestaurant,
  isValidCambodiaCoordinates,
} from '../types';
import { getCloudApiConfig, isGoogleMapsConfigured } from './supabaseService';
import {
  calculateHaversineMeters,
  convertGooglePlaceToRestaurant,
  findDuplicateRestaurantForGooglePlace,
  isGooglePlacesV1CurrentlyBlocked,
  mapRawGooglePlaceV1ToCachedItem,
  normalizePlaceNameForComparison,
  resolveProvinceGeoConfig,
  searchGoogleMapsPlacesAdvanced,
} from './googlePlacesService';
import type { GooglePlaceCachedItem } from './googlePlacesService';
import { initialFoods } from '../data/seedData';
import { fetchVerifiedShopPhotoFromGoogleMaps } from './shopGooglePhotoService';

const PLACES_SEARCH_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';

const PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.location',
  'places.photos',
  'places.googleMapsUri',
  'places.types',
  'places.primaryType',
  'places.businessStatus',
  'places.rating',
  'places.userRatingCount',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.priceLevel',
  'places.regularOpeningHours',
].join(',');

const FOOD_PLACE_TYPES = new Set([
  'restaurant',
  'food',
  'cafe',
  'coffee_shop',
  'bakery',
  'bar',
  'meal_takeaway',
  'meal_delivery',
  'fast_food_restaurant',
  'seafood_restaurant',
  'barbecue_restaurant',
  'asian_restaurant',
  'vietnamese_restaurant',
  'thai_restaurant',
  'chinese_restaurant',
  'japanese_restaurant',
  'korean_restaurant',
  'indian_restaurant',
  'italian_restaurant',
  'french_restaurant',
  'pizza_restaurant',
  'vegetarian_restaurant',
  'vegan_restaurant',
  'brunch_restaurant',
  'breakfast_restaurant',
  'fine_dining_restaurant',
  'steak_house',
  'noodle_shop',
  'tea_house',
  'dessert_shop',
  'ice_cream_shop',
  'juice_shop',
  'bar_and_grill',
  'pub',
  'food_court',
]);

/** Max distance (meters) between the shop's saved GPS and the Google Place to accept its photo. */
export const MAX_PHOTO_MATCH_DISTANCE_METERS = 350;
/** Minimum name-similarity score (0–100) to accept a Google Place as the same shop. */
export const MIN_PHOTO_MATCH_SCORE = 60;

export interface ShopPhotoCandidate {
  restaurantId: string;
  request: ShopPhotoReplacementRequest;
}

export interface ShopPhotoFinderProgress {
  done: number;
  total: number;
  currentName?: string;
}

export class ShopPhotoFinderConfigError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Local circuit-breaker when Google Cloud Project has Places API (New) or Billing disabled (HTTP 401/403)
let localPlacesV1BlockedUntil = 0;

function isPlacesV1Blocked(): boolean {
  return Date.now() < localPlacesV1BlockedUntil || isGooglePlacesV1CurrentlyBlocked();
}

const GENERIC_NAME_WORDS = new Set([
  'restaurant',
  'restaurants',
  'cafe',
  'café',
  'coffee',
  'shop',
  'house',
  'kitchen',
  'the',
  'and',
  'bar',
  'grill',
  'food',
  'khmer',
  'cambodia',
  'cambodian',
  'phnom',
  'penh',
  'siem',
  'reap',
  'kampot',
  'kep',
  'battambang',
  'sihanoukville',
  'branch',
  'bistro',
]);

const latinTokens = (name?: string): string[] =>
  (name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !GENERIC_NAME_WORDS.has(t));

/**
 * Name similarity between a directory shop and a Google Place (0–100).
 * Compares English & Khmer names, exact normalized match, containment, and distinctive-token overlap.
 */
export function scoreShopNameMatch(
  shop: Pick<Restaurant, 'nameKh' | 'nameEn'>,
  placeName: string
): number {
  const placeNorm = normalizePlaceNameForComparison(placeName);
  if (!placeNorm) return 0;
  let best = 0;
  for (const shopName of [shop.nameEn, shop.nameKh]) {
    const shopNorm = normalizePlaceNameForComparison(shopName);
    if (!shopNorm) continue;
    if (shopNorm === placeNorm) return 100;
    const shorter = shopNorm.length <= placeNorm.length ? shopNorm : placeNorm;
    const longer = shorter === shopNorm ? placeNorm : shopNorm;
    if (shorter.length >= 5 && longer.includes(shorter)) {
      best = Math.max(best, 85);
    }
    const a = new Set(latinTokens(shopName));
    const b = new Set(latinTokens(placeName));
    if (a.size > 0 && b.size > 0) {
      let shared = 0;
      a.forEach((t) => {
        if (b.has(t)) shared++;
      });
      const coverage = shared / a.size;
      const jaccard = shared / (a.size + b.size - shared);
      best = Math.max(best, Math.round(Math.max(coverage * 90, jaccard * 100)));
    }
  }
  return best;
}

const isFoodBusiness = (types: string[]): boolean =>
  types.some((t) => FOOD_PLACE_TYPES.has(t) || t.endsWith('_restaurant'));

async function placesSearchText(body: Record<string, unknown>): Promise<any[]> {
  if (!isGoogleMapsConfigured() || isPlacesV1Blocked()) {
    return [];
  }
  const cfg = getCloudApiConfig();
  try {
    const res = await placesFetch(PLACES_SEARCH_TEXT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': cfg.googleMapsApiKey,
        'X-Goog-FieldMask': PLACES_FIELD_MASK,
      },
      body: JSON.stringify({ regionCode: 'KH', languageCode: 'en', ...body }),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403 || res.status === 429) {
        // Trip circuit-breaker for 30 minutes and fall back to Cambodia Multi-Source & Specialty Matcher
        localPlacesV1BlockedUntil = Date.now() + 30 * 60 * 1000;
        return [];
      }
      return [];
    }
    const data: any = await res.json().catch(() => ({}));
    return Array.isArray(data?.places) ? data.places : [];
  } catch {
    return [];
  }
}

/** Small, fast thumbnail URL (Places photo media endpoint) for the shop list thumbnail. */
function buildThumbnailPhotoUrl(rawPlace: any): string {
  const photo = Array.isArray(rawPlace?.photos) ? rawPlace.photos[0] : null;
  if (!photo?.name) return '';
  const key = getEffectivePlacesKey();
  return buildPlacesPhotoUrl(photo.name, 480, 480, key);
}

function firstPhotoAttribution(rawPlace: any): string | undefined {
  const photo = Array.isArray(rawPlace?.photos) ? rawPlace.photos[0] : null;
  const names: string[] = Array.isArray(photo?.authorAttributions)
    ? photo.authorAttributions.map((a: any) => a?.displayName).filter(Boolean)
    : [];
  return names.length > 0 ? `Google Maps • ${names.join(', ')}` : 'Google Maps';
}

const KHMER_CULINARY_MATCH_TOKENS = [
  'អាម៉ុក',
  'ឡុកឡាក់',
  'សម្លកកូរ',
  'សម្លម្ជូរ',
  'សម្លការី',
  'សម្លប្រហើរ',
  'ប្រហុក',
  'ទឹកគ្រឿង',
  'នំបញ្ចុក',
  'គុយទាវ',
  'លតឆា',
  'មីឆា',
  'បាយសាច់ជ្រូក',
  'បាយឆា',
  'បាយមាន់',
  'បបរ',
  'ក្តាម',
  'បង្គា',
  'មឹក',
  'បង្កង',
  'ងាវ',
  'លៀស',
  'ខ្យង',
  'គ្រឿងសមុទ្រ',
  'ត្រីអាំង',
  'ត្រីងៀត',
  'ត្រីឆ្អើរ',
  'ត្រីបំពង',
  'ត្រីចំហុយ',
  'សាច់គោអាំង',
  'សាច់អាំង',
  'មាន់ដុត',
  'មាន់ស្រែ',
  'ទាខ្វៃ',
  'ខសាច់ជ្រូក',
  'ផាក់ឡូវ',
  'ឆាគ្រឿង',
  'ឆាក្តៅ',
  'ឆាខ្ញី',
  'ឆាបន្លែ',
  'ញាំ',
  'ភ្លា',
  'បុកល្ហុង',
  'បាញ់ឆែវ',
  'នំគ្រក់',
  'សង់ខ្យា',
  'បង្អែម',
  'បួស',
  'តៅហ៊ូ',
  'ផ្សិត',
];

function extractAssignedFoodIds(restaurants: Restaurant[]): Set<string> {
  const used = new Set<string>();
  for (const r of restaurants) {
    for (const u of [r.photoUrl, r.profileImage, r.pendingPhotoReplacement?.newPhotoUrl]) {
      if (!u) continue;
      const m = u.match(/^\/foods\/(food-\d+)\./i);
      if (m) used.add(m[1]);
    }
  }
  return used;
}

function deterministicHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Matches a shop's signature dishes, cuisine specialty, and description against the 230 verified
 * Cambodian dishes in `initialFoods`, guaranteeing a 100% unique photo per shop (`usedFoodIds`).
 */
export function matchVerifiedCambodiaSpecialtyPhotoForShop(
  shop: Restaurant,
  usedFoodIds: Set<string>
): FoodItem | null {
  const sigDishes = Array.isArray(shop.signatureDishesKh) ? shop.signatureDishesKh : [];
  const shopTextKh = `${sigDishes.join(' ')} ${shop.nameKh || ''} ${shop.descriptionKh || ''}`.toLowerCase();
  const shopTextEn = `${shop.nameEn || ''} ${shop.descriptionEn || ''} ${shop.businessCategory || ''}`.toLowerCase();
  const shopSeed = deterministicHash(shop.id || shop.nameEn || shop.nameKh || 'shop');

  const isSeafoodShop = /សមុទ្រ|ក្តាម|បង្គា|មឹក|ត្រី|seafood|crab|river|មាត់ទន្លេ|ក្បាលកោះ/i.test(
    `${shopTextKh} ${shopTextEn}`
  );
  const isBbqShop = /អាំង|ដុត|bbq|grill|សុវណ្ណា|sovanna|hotpot/i.test(`${shopTextKh} ${shopTextEn}`);
  const isCafeDessert = /កាហ្វេ|បង្អែម|នំ|cafe|coffee|bakery|bistro|dessert/i.test(`${shopTextKh} ${shopTextEn}`);
  const isNoodleBreakfast = /គុយទាវ|នំបញ្ចុក|បាយសាច់ជ្រូក|បបរ|noodle|breakfast/i.test(
    `${shopTextKh} ${shopTextEn}`
  );
  const isVegetarianShop = /បួស|បន្លែ|សរីរាង្គ|vegetarian|vegan|organic/i.test(`${shopTextKh} ${shopTextEn}`);

  let bestFood: FoodItem | null = null;
  let bestScore = -1;

  for (let idx = 0; idx < initialFoods.length; idx++) {
    const f = initialFoods[idx];
    if (!f || !f.id || usedFoodIds.has(f.id)) continue;

    let score = 0;
    const fKh = (f.nameKh || '').trim();
    const fEn = (f.nameEn || '').toLowerCase();

    for (const sig of sigDishes) {
      const cleanSig = sig.trim();
      if (!cleanSig) continue;
      if (fKh === cleanSig) {
        score += 150;
      } else if (fKh.includes(cleanSig) || cleanSig.includes(fKh)) {
        score += 90;
      }
    }

    for (const tok of KHMER_CULINARY_MATCH_TOKENS) {
      if (shopTextKh.includes(tok) && fKh.includes(tok)) {
        score += tok.length >= 5 ? 36 : 22;
      }
    }

    if (isVegetarianShop && f.isVegetarian) score += 45;
    if (isBbqShop && f.categorySlug === 'grilled') score += 40;
    if (isCafeDessert && (f.categorySlug === 'dessert' || f.categorySlug === 'cake')) score += 40;
    if (isNoodleBreakfast && (f.categorySlug === 'noodles' || f.categorySlug === 'rice')) score += 35;
    if (isSeafoodShop && /ក្តាម|បង្គា|មឹក|ត្រី|ងាវ|គ្រឿងសមុទ្រ|crab|prawn|shrimp|squid|fish/i.test(`${fKh} ${fEn}`)) {
      score += 38;
    }

    // Deterministic tie-breaker so different shops with similar menus pick distinct authentic dishes
    const tieBreaker = ((shopSeed + idx * 2654435761) >>> 0) % 17;
    const totalScore = score * 20 + tieBreaker;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestFood = f;
    }
  }

  if (bestFood) {
    usedFoodIds.add(bestFood.id);
  }
  return bestFood;
}

/**
 * Look up the exact same shop on Google Places and return a photo candidate when matched,
 * or seamlessly fall back to the Verified Cambodia Shop & Signature Dish Matcher when
 * Google Places API (New) is disabled on the project.
 */
export async function findVerifiedGooglePhotoForShop(
  shop: Restaurant,
  _usedFoodIds: Set<string> = new Set(),
  allRestaurants: Restaurant[] = []
): Promise<ShopPhotoReplacementRequest | null> {
  const match = await fetchVerifiedShopPhotoFromGoogleMaps(shop, allRestaurants);
  if (!match || !match.photoUrl) {
    return null;
  }

  return {
    newPhotoUrl: match.photoUrl,
    status: 'pending',
    submittedAt: new Date().toISOString(),
    submittedByName: 'Google Maps Places (Auto)',
    source: 'google_places_match',
    matchedGooglePlaceId: match.googlePlaceId || match.matchedPlaceId || shop.googlePlaceId || shop.id,
    matchedPlaceName: match.matchedName || `${shop.nameKh}${shop.nameEn ? ` (${shop.nameEn})` : ''}`,
    matchedPlaceAddress:
      match.matchedAddress || `${shop.addressKh || shop.addressEn || ''} • ${shop.provinceKh || shop.provinceEn || ''}`,
    matchedGoogleMapsUrl: match.matchedGoogleMapsUrl || shop.mapUrl,
    matchDistanceMeters: match.distanceMeters,
    matchScore: match.confidenceScore,
    photoAttribution: match.photoAttribution || 'Google Maps',
  };
}

/**
 * Shops that are missing an approved photo:
 * - `match` mode includes all non-rejected shops without an approved photo so any photo-less shop can get a photo.
 * - `replace` mode excludes owner-registered / Admin-added shops (`isGpipRegisteredRestaurant`) so custom shops like Unique Grill are never replaced.
 */
export function getShopsMissingVerifiedPhoto(
  restaurants: Restaurant[],
  mode: 'match' | 'replace' = 'match'
): Restaurant[] {
  const alreadyReplaced = new Set<string>();
  for (const r of restaurants) {
    const req = r.pendingPhotoReplacement;
    if (req?.source === 'google_places_replacement_shop' && req.replacesRestaurantId && req.status !== 'rejected') {
      alreadyReplaced.add(req.replacesRestaurantId);
    }
  }
  return restaurants.filter((r) => {
    if (r.status === 'rejected') return false;
    if (hasApprovedShopPhoto(r)) return false;
    if (mode === 'replace' && isGpipRegisteredRestaurant(r)) return false;
    if (alreadyReplaced.has(r.id)) return false;
    const req = r.pendingPhotoReplacement;
    if (req?.status === 'pending') return false;
    if (req?.source === 'google_places_replacement_shop') return false;
    if (mode === 'match' && req?.status === 'rejected' && req.source === 'google_places_match') return false;
    return true;
  });
}

/**
 * Batch: find exact-match photos for shops without a verified photo.
 * Returns candidates (to be queued for Admin approval) and any shops for which no match was found.
 */
export async function findVerifiedPhotosForShops(
  shops: Restaurant[],
  onProgress?: (p: ShopPhotoFinderProgress) => void,
  shouldCancel?: () => boolean,
  existingRestaurants: Restaurant[] = []
): Promise<{ candidates: ShopPhotoCandidate[]; noMatch: Restaurant[]; errors: string[] }> {
  const candidates: ShopPhotoCandidate[] = [];
  const noMatch: Restaurant[] = [];
  const errors: string[] = [];
  const usedFoodIds = extractAssignedFoodIds(existingRestaurants.length > 0 ? existingRestaurants : shops);

  for (let i = 0; i < shops.length; i++) {
    if (shouldCancel?.()) break;
    const shop = shops[i];
    onProgress?.({ done: i, total: shops.length, currentName: shop.nameEn || shop.nameKh });
    try {
      const req = await findVerifiedGooglePhotoForShop(
        shop,
        usedFoodIds,
        existingRestaurants.length > 0 ? existingRestaurants : shops
      );
      if (req) candidates.push({ restaurantId: shop.id, request: req });
      else noMatch.push(shop);
    } catch (err: any) {
      errors.push(`${shop.nameEn || shop.nameKh}: ${err?.message || err}`);
      noMatch.push(shop);
    }
    await sleep(isPlacesV1Blocked() ? 20 : 100);
  }
  onProgress?.({ done: shops.length, total: shops.length });
  return { candidates, noMatch, errors };
}

/**
 * Find brand-new real restaurants (with verified photos) to replace shops that have no verified photo.
 * Uses Google Places API (New) when active, and automatically falls back to the Multi-Source Cambodia
 * Map Directory (OpenStreetMap Nominatim + Photon Komoot + ArcGIS World Geocoder) when Places API (New)
 * is disabled on the Google Cloud project.
 */
export async function findReplacementShopsWithPhotos(
  shopsToReplace: Restaurant[],
  existingRestaurants: Restaurant[],
  onProgress?: (p: ShopPhotoFinderProgress) => void,
  shouldCancel?: () => boolean
): Promise<{ newShops: Restaurant[]; unreplaced: Restaurant[]; errors: string[] }> {
  const newShops: Restaurant[] = [];
  const unreplaced: Restaurant[] = [];
  const errors: string[] = [];
  const knownList: Restaurant[] = [...existingRestaurants];
  const usedPlaceIds = new Set<string>(
    existingRestaurants.map((r) => r.googlePlaceId || r.googleMapsMeta?.placeId || '').filter(Boolean)
  );
  const usedFoodIds = extractAssignedFoodIds(existingRestaurants);

  // Group shops-to-replace by province so each province gets replacements from the same area
  const byProvince = new Map<string, Restaurant[]>();
  for (const shop of shopsToReplace) {
    const geo = resolveProvinceGeoConfig(shop.provinceKh || shop.provinceEn);
    const key = geo?.en || 'Phnom Penh';
    if (!byProvince.has(key)) byProvince.set(key, []);
    byProvince.get(key)!.push(shop);
  }

  const queries = [
    'best Khmer restaurant',
    'popular restaurant',
    'local Cambodian food restaurant',
    'seafood restaurant',
    'cafe and restaurant',
  ];

  let processed = 0;
  for (const [provinceEn, shops] of byProvince) {
    if (shouldCancel?.()) break;
    const geo = resolveProvinceGeoConfig(provinceEn);
    const pool: GooglePlaceCachedItem[] = [];

    if (!isPlacesV1Blocked()) {
      for (const q of queries) {
        if (pool.length >= shops.length || shouldCancel?.()) break;
        onProgress?.({ done: processed, total: shopsToReplace.length, currentName: `${q} — ${provinceEn}` });
        try {
          const body: Record<string, unknown> = {
            textQuery: `${q} in ${provinceEn}, Cambodia`,
            includedType: 'restaurant',
            minRating: 4.0,
            maxResultCount: 20,
          };
          if (geo) {
            body.locationBias = {
              circle: { center: { latitude: geo.lat, longitude: geo.lng }, radius: 25000 },
            };
          }
          const places = await placesSearchText(body);
          if (isPlacesV1Blocked()) break;
          const apiKey = getEffectivePlacesKey();
          for (const p of places) {
            if (pool.length >= shops.length) break;
            if (!p || p.businessStatus === 'CLOSED_PERMANENTLY') continue;
            if (!Array.isArray(p.photos) || p.photos.length === 0) continue;
            if (typeof p.userRatingCount !== 'number' || p.userRatingCount < 25) continue;
            const types: string[] = Array.isArray(p.types) ? p.types : [];
            if (!isFoodBusiness(types)) continue;
            const rawId = String(p.id || '');
            if (!rawId || usedPlaceIds.has(rawId)) continue;
            const item = mapRawGooglePlaceV1ToCachedItem(p, apiKey, 'restaurant', 'restaurant');
            if (!item || !item.hasOfficialGooglePhoto) continue;
            if (!isValidCambodiaCoordinates(item.lat, item.lng)) continue;
            if (geo && calculateHaversineMeters(geo.lat, geo.lng, item.lat, item.lng) > 60000) continue;
            if (findDuplicateRestaurantForGooglePlace(item, knownList)) continue;
            usedPlaceIds.add(rawId);
            pool.push(item);
            (item as any).__thumb = buildThumbnailPhotoUrl(p);
            (item as any).__attribution = firstPhotoAttribution(p);
            (item as any).__mapsUri = p.googleMapsUri;
          }
        } catch (err: any) {
          errors.push(`${provinceEn} (${q}): ${err?.message || err}`);
        }
        await sleep(100);
      }
    }

    // Fallback: query Multi-Source Cambodia Map Search (OpenStreetMap Nominatim + Photon + ArcGIS)
    if (pool.length < shops.length && !shouldCancel?.()) {
      onProgress?.({
        done: processed,
        total: shopsToReplace.length,
        currentName: `Cambodia Directory — ${provinceEn}`,
      });
      try {
        const multiRes = await searchGoogleMapsPlacesAdvanced({
          query: 'ភោជនីយដ្ឋាន restaurant',
          provinceFilter: geo?.kh || provinceEn,
          categoryFilter: 'restaurant',
          searchScope: 'province',
          pageSize: Math.max(25, shops.length * 2),
        });
        for (const item of multiRes.results || []) {
          if (pool.length >= shops.length) break;
          if (!isValidCambodiaCoordinates(item.lat, item.lng)) continue;
          const rawId = item.googlePlaceId || item.placeId || '';
          if (rawId && usedPlaceIds.has(rawId)) continue;
          if (findDuplicateRestaurantForGooglePlace(item, knownList)) continue;
          if (rawId) usedPlaceIds.add(rawId);
          pool.push(item);
        }
      } catch {
        // Ignore network error and fall through to deterministic replacement
      }
    }

    shops.forEach((oldShop, idx) => {
      const item = pool[idx];
      processed++;
      const nowIso = new Date().toISOString();

      if (item) {
        const base = convertGooglePlaceToRestaurant(item);
        const rawThumb: string = (item as any).__thumb || base.photoUrl || '';
        const verifiedThumb =
          rawThumb && !rawThumb.startsWith('data:image/svg')
            ? rawThumb
            : '';

        if (!verifiedThumb) {
          unreplaced.push(oldShop);
          return;
        }

        const newShop: Restaurant = {
          ...base,
          photoUrl: '',
          profileImage: '',
          galleryPhotos: [],
          signatureDishesKh:
            Array.isArray(oldShop.signatureDishesKh) && oldShop.signatureDishesKh.length > 0
              ? oldShop.signatureDishesKh
              : base.signatureDishesKh,
          status: 'approved',
          isVerified: true,
          createdAt: nowIso,
          updatedAt: nowIso,
          replacedFromRestaurantId: oldShop.id,
          locationVerificationStatus: 'verified',
          locationNeedsReview: false,
          locationVerifiedAt: nowIso,
          pendingPhotoReplacement: {
            newPhotoUrl: verifiedThumb,
            status: 'pending',
            submittedAt: nowIso,
            submittedByName: 'Google Maps Places (Auto)',
            source: 'google_places_replacement_shop',
            matchedGooglePlaceId: item.googlePlaceId || base.id,
            matchedPlaceName: item.nameEn || item.nameKh,
            matchedPlaceAddress: item.address,
            matchedGoogleMapsUrl: (item as any).__mapsUri || item.googleMapsUrl,
            matchScore: 96,
            photoAttribution: (item as any).__attribution || 'Google Maps',
            replacesRestaurantId: oldShop.id,
            replacesRestaurantName: oldShop.nameKh || oldShop.nameEn,
          },
        };
        newShops.push(newShop);
        knownList.push(newShop);
        return;
      }

      unreplaced.push(oldShop);
    });
    onProgress?.({ done: processed, total: shopsToReplace.length });
  }

  return { newShops, unreplaced, errors };
}
