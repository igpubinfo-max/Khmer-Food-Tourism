/**
 * Shop Photo Finder (Google Places API — New)
 *
 * 1. `findVerifiedGooglePhotoForShop` — looks up the SAME shop on Google Places and only returns a
 *    photo when the Google Place clearly matches the shop (name similarity + GPS distance + food business type).
 * 2. `findReplacementShopsWithPhotos` — finds brand-new, real Cambodian restaurants (with real Google photos,
 *    good ratings, and exact GPS) that can replace shops which have no verified photo.
 *
 * Nothing found here is ever published automatically: every photo is queued as a
 * `pendingPhotoReplacement` so the Admin must review and approve it before users can see it.
 */
import type { Restaurant, ShopPhotoReplacementRequest } from '../types';
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
  mapRawGooglePlaceV1ToCachedItem,
  normalizePlaceNameForComparison,
  resolveProvinceGeoConfig,
} from './googlePlacesService';
import type { GooglePlaceCachedItem } from './googlePlacesService';

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
      // Every distinctive word of the shop name must appear for a strong match
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
  if (!isGoogleMapsConfigured()) {
    throw new ShopPhotoFinderConfigError(
      'Google Maps API key is not configured. Add it in Admin → Settings → Cloud & Google Maps.'
    );
  }
  const cfg = getCloudApiConfig();
  const res = await fetch(PLACES_SEARCH_TEXT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': cfg.googleMapsApiKey,
      'X-Goog-FieldMask': PLACES_FIELD_MASK,
    },
    body: JSON.stringify({ regionCode: 'KH', languageCode: 'en', ...body }),
  });
  if (!res.ok) {
    const errJson: any = await res.json().catch(() => ({}));
    const msg = errJson?.error?.message || `HTTP ${res.status}`;
    if (res.status === 401 || res.status === 403) {
      throw new ShopPhotoFinderConfigError(`Google Places API rejected the request: ${msg}`);
    }
    throw new Error(`Google Places API error: ${msg}`);
  }
  const data: any = await res.json().catch(() => ({}));
  return Array.isArray(data?.places) ? data.places : [];
}

/** Small, fast thumbnail URL (Places photo media endpoint) for the shop list thumbnail. */
function buildThumbnailPhotoUrl(rawPlace: any): string {
  const photo = Array.isArray(rawPlace?.photos) ? rawPlace.photos[0] : null;
  if (!photo?.name) return '';
  const key = getCloudApiConfig().googleMapsApiKey;
  return `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=480&maxHeightPx=480&key=${encodeURIComponent(
    key
  )}`;
}

function firstPhotoAttribution(rawPlace: any): string | undefined {
  const photo = Array.isArray(rawPlace?.photos) ? rawPlace.photos[0] : null;
  const names: string[] = Array.isArray(photo?.authorAttributions)
    ? photo.authorAttributions.map((a: any) => a?.displayName).filter(Boolean)
    : [];
  return names.length > 0 ? `Google Maps • ${names.join(', ')}` : 'Google Maps';
}

/**
 * Look up the exact same shop on Google Places and return a photo candidate ONLY when the match is certain.
 * Returns `null` when no confident match (so no incorrect or unrelated photo is ever suggested).
 */
export async function findVerifiedGooglePhotoForShop(
  shop: Restaurant
): Promise<ShopPhotoReplacementRequest | null> {
  const hasCoords = isValidCambodiaCoordinates(shop.latitude, shop.longitude);
  const name = (shop.nameEn || shop.nameKh || '').trim();
  if (!name) return null;
  const province = (shop.provinceEn || shop.provinceKh || '').trim();

  const body: Record<string, unknown> = {
    textQuery: [name, province, 'Cambodia'].filter(Boolean).join(' '),
    maxResultCount: 5,
  };
  if (hasCoords) {
    body.locationBias = {
      circle: { center: { latitude: shop.latitude, longitude: shop.longitude }, radius: 1500 },
    };
  }

  const places = await placesSearchText(body);
  let best: { raw: any; score: number; dist: number } | null = null;

  for (const p of places) {
    if (!p || p.businessStatus === 'CLOSED_PERMANENTLY') continue;
    if (!Array.isArray(p.photos) || p.photos.length === 0) continue;
    const types: string[] = Array.isArray(p.types) ? p.types : [];
    if (!isFoodBusiness(types)) continue;
    const lat = Number(p.location?.latitude);
    const lng = Number(p.location?.longitude);
    if (!isValidCambodiaCoordinates(lat, lng)) continue;

    const placeName = String(p.displayName?.text || '').trim();
    const score = scoreShopNameMatch(shop, placeName);
    if (score < MIN_PHOTO_MATCH_SCORE) continue;

    const dist = hasCoords ? calculateHaversineMeters(shop.latitude, shop.longitude, lat, lng) : -1;
    if (hasCoords) {
      if (dist > MAX_PHOTO_MATCH_DISTANCE_METERS) continue;
    } else {
      // Without saved GPS we require a near-exact name AND the same province in the address
      const address = String(p.formattedAddress || '').toLowerCase();
      const provGeo = resolveProvinceGeoConfig(shop.provinceKh || shop.provinceEn);
      const sameProvince = provGeo
        ? address.includes(provGeo.en.toLowerCase()) || provGeo.aliases.some((a) => address.includes(a))
        : false;
      if (score < 85 || !sameProvince) continue;
    }

    if (!best || score > best.score || (score === best.score && dist >= 0 && dist < best.dist)) {
      best = { raw: p, score, dist };
    }
  }

  if (!best) return null;
  const photoUrl = buildThumbnailPhotoUrl(best.raw);
  if (!photoUrl) return null;

  return {
    newPhotoUrl: photoUrl,
    status: 'pending',
    submittedAt: new Date().toISOString(),
    submittedByName: 'Google Places (auto)',
    source: 'google_places_match',
    matchedGooglePlaceId: String(best.raw.id || ''),
    matchedPlaceName: String(best.raw.displayName?.text || ''),
    matchedPlaceAddress: String(best.raw.formattedAddress || ''),
    matchedGoogleMapsUrl: best.raw.googleMapsUri || undefined,
    matchDistanceMeters: best.dist >= 0 ? Math.round(best.dist) : undefined,
    matchScore: best.score,
    photoAttribution: firstPhotoAttribution(best.raw),
  };
}

/**
 * Shops that are publicly listable but have no approved photo (owner-registered shops are excluded).
 * - `match` mode skips shops whose Google match was already rejected by Admin (never re-suggest a wrong photo).
 * - Both modes skip shops that already have a pending photo or a pending/approved replacement shop.
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
    if (hasApprovedShopPhoto(r) || isGpipRegisteredRestaurant(r)) return false;
    if (alreadyReplaced.has(r.id)) return false;
    const req = r.pendingPhotoReplacement;
    if (req?.status === 'pending') return false;
    if (req?.source === 'google_places_replacement_shop') return false;
    if (mode === 'match' && req?.status === 'rejected' && req.source === 'google_places_match') return false;
    return true;
  });
}

/**
 * Batch: find exact-match Google photos for shops without a verified photo.
 * Returns candidates (to be queued for Admin approval) and the shops for which no confident match exists.
 */
export async function findVerifiedPhotosForShops(
  shops: Restaurant[],
  onProgress?: (p: ShopPhotoFinderProgress) => void,
  shouldCancel?: () => boolean
): Promise<{ candidates: ShopPhotoCandidate[]; noMatch: Restaurant[]; errors: string[] }> {
  const candidates: ShopPhotoCandidate[] = [];
  const noMatch: Restaurant[] = [];
  const errors: string[] = [];
  for (let i = 0; i < shops.length; i++) {
    if (shouldCancel?.()) break;
    const shop = shops[i];
    onProgress?.({ done: i, total: shops.length, currentName: shop.nameEn || shop.nameKh });
    try {
      const req = await findVerifiedGooglePhotoForShop(shop);
      if (req) candidates.push({ restaurantId: shop.id, request: req });
      else noMatch.push(shop);
    } catch (err: any) {
      if (err instanceof ShopPhotoFinderConfigError) throw err;
      errors.push(`${shop.nameEn || shop.nameKh}: ${err?.message || err}`);
      noMatch.push(shop);
    }
    await sleep(120);
  }
  onProgress?.({ done: shops.length, total: shops.length });
  return { candidates, noMatch, errors };
}

/**
 * Find brand-new real restaurants (with real Google photos) to replace shops that have no verified photo.
 * Replacements are picked in the SAME province as the shop being replaced, skip duplicates of any existing
 * shop, and require a good rating + enough reviews so only well-known, reliable shops are suggested.
 * Each new shop is returned with its photo queued as pending (hidden from users until Admin approves).
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
        const apiKey = getCloudApiConfig().googleMapsApiKey;
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
        if (err instanceof ShopPhotoFinderConfigError) throw err;
        errors.push(`${provinceEn} (${q}): ${err?.message || err}`);
      }
      await sleep(150);
    }

    shops.forEach((oldShop, idx) => {
      const item = pool[idx];
      processed++;
      if (!item) {
        unreplaced.push(oldShop);
        return;
      }
      const base = convertGooglePlaceToRestaurant(item);
      const nowIso = new Date().toISOString();
      const thumb: string = (item as any).__thumb || item.photoUrl;
      const newShop: Restaurant = {
        ...base,
        // Photo stays EMPTY until the Admin approves it, so the shop remains hidden from users
        photoUrl: '',
        profileImage: '',
        galleryPhotos: [],
        status: 'approved',
        isVerified: true,
        createdAt: nowIso,
        updatedAt: nowIso,
        replacedFromRestaurantId: oldShop.id,
        locationVerificationStatus: 'verified',
        locationNeedsReview: false,
        locationVerifiedAt: nowIso,
        pendingPhotoReplacement: {
          newPhotoUrl: thumb,
          status: 'pending',
          submittedAt: nowIso,
          submittedByName: 'Google Places (auto)',
          source: 'google_places_replacement_shop',
          matchedGooglePlaceId: item.googlePlaceId,
          matchedPlaceName: item.nameEn || item.nameKh,
          matchedPlaceAddress: item.address,
          matchedGoogleMapsUrl: (item as any).__mapsUri || item.googleMapsUrl,
          matchScore: 100,
          photoAttribution: (item as any).__attribution,
          replacesRestaurantId: oldShop.id,
          replacesRestaurantName: oldShop.nameKh || oldShop.nameEn,
        },
      };
      newShops.push(newShop);
      knownList.push(newShop);
    });
    onProgress?.({ done: processed, total: shopsToReplace.length });
  }

  return { newShops, unreplaced, errors };
}
