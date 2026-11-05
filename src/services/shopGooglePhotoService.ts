/**
 * Automatic Shop Image Fetching Service from Google Maps (Google Places API v1 + Coordinate-Verified Geosearch)
 *
 * Whenever shops are added to or displayed from the database without a verified photo,
 * automatically retrieves the corresponding place photos from Google Maps (Google Places API)
 * and uses them as the shop icons or thumbnails.
 *
 * Strict Guarantees:
 * 1. Matches photos accurately using BOTH the shop's Place Name (`scoreShopNameSimilarity`) and GPS Coordinates (`calculateHaversineMeters`).
 * 2. Ensures each image belongs to the correct shop (verifies food/dining place types and rejects unrelated businesses, logos, maps, or generic stock images).
 * 3. Displays high-quality thumbnails (480x480px optimized Google Places media thumbnails).
 * 4. Prevents duplicate images across all shops via a normalized photo fingerprint registry (`buildAssignedShopPhotoFingerprints`).
 * 5. If no matching photo is available, returns `null` so the UI cleanly displays `<DefaultShopIcon />`.
 */

import type { Restaurant } from '../types';
import { isValidCambodiaCoordinates, sanitizeRestaurantShopPhoto } from '../types';
import { getCloudApiConfig } from './supabaseService';
import {
  calculateHaversineMeters,
  isGooglePlacesV1CurrentlyBlocked,
  normalizePlaceNameForComparison,
  resolveProvinceGeoConfig,
} from './googlePlacesService';

const PLACES_SEARCH_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';
const SHOP_PHOTO_CACHE_KEY = 'kft_verified_shop_google_photos_v1';

const PLACES_SHOP_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.photos',
  'places.types',
  'places.primaryType',
  'places.businessStatus',
  'places.googleMapsUri',
].join(',');

/** Eligible food, dining, cafe, bakery, and beverage business types on Google Maps */
const ELIGIBLE_SHOP_PLACE_TYPES = new Set([
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
  'bistro',
]);

/** Non-food place types that must never be matched as a culinary shop */
const REJECTED_NON_SHOP_PLACE_TYPES = new Set([
  'gas_station',
  'atm',
  'bank',
  'pharmacy',
  'drugstore',
  'hospital',
  'dentist',
  'doctor',
  'car_repair',
  'car_wash',
  'car_dealer',
  'parking',
  'laundry',
  'hair_care',
  'beauty_salon',
  'real_estate_agency',
  'insurance_agency',
  'accounting',
  'lawyer',
  'post_office',
  'police',
  'storage',
  'hardware_store',
  'electronics_store',
  'clothing_store',
  'shoe_store',
  'jewelry_store',
]);

/** Filenames/keywords that indicate non-photo files, logos, maps, or generic placeholders */
const REJECTED_IMAGE_KEYWORDS = [
  '.svg',
  '.pdf',
  '.gif',
  '.tif',
  'map',
  'locator',
  'flag',
  'logo',
  'icon',
  'emblem',
  'coat_of_arms',
  'diagram',
  'floorplan',
  'placeholder',
  'no_image',
  'default',
  'unsplash.com',
  'loremflickr.com',
  'picsum.photos',
  'placehold.co',
];

const GENERIC_SHOP_WORDS = new Set([
  'restaurant',
  'restaurants',
  'cafe',
  'café',
  'coffee',
  'shop',
  'store',
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
  'ភោជនីយដ្ឋាន',
  'ហាង',
  'អាហារដ្ឋាន',
  'ហាងកាហ្វេ',
  'កាហ្វេ',
  'ហាងបាយ',
  'មុខម្ហូប',
  'សាខា',
]);

export interface ShopPhotoMatchResult {
  restaurantId: string;
  photoUrl: string;
  galleryPhotos: string[];
  googlePlaceId?: string;
  matchedPlaceId?: string;
  matchedLat?: number;
  matchedLng?: number;
  matchedName: string;
  matchedAddress?: string;
  matchedGoogleMapsUrl?: string;
  distanceMeters?: number;
  confidenceScore: number;
  photoAttribution?: string;
  source: 'google_maps_places' | 'wikimedia_geosearch';
}

export interface ShopBatchFetchProgress {
  done: number;
  processed: number;
  total: number;
  matched: number;
  skippedNoMatch: number;
  currentName?: string;
}

interface CachedShopPhotoEntry {
  photoUrl: string;
  googlePlaceId?: string;
  matchedLat?: number;
  matchedLng?: number;
  matchedName: string;
  matchedAddress?: string;
  distanceMeters?: number;
  confidenceScore: number;
  photoAttribution?: string;
  source: ShopPhotoMatchResult['source'];
  updatedAt: string;
}

let inMemoryShopPhotoCache: Record<string, CachedShopPhotoEntry | null> | null = null;
const inFlightShopRequests = new Map<string, Promise<ShopPhotoMatchResult | null>>();
const sessionAssignedShopFingerprints = new Set<string>();

function loadShopPhotoCache(): Record<string, CachedShopPhotoEntry | null> {
  if (inMemoryShopPhotoCache) return inMemoryShopPhotoCache;
  try {
    const raw = localStorage.getItem(SHOP_PHOTO_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        inMemoryShopPhotoCache = parsed;
        return parsed;
      }
    }
  } catch {}
  inMemoryShopPhotoCache = {};
  return inMemoryShopPhotoCache;
}

function saveShopPhotoCache(cache: Record<string, CachedShopPhotoEntry | null>): void {
  inMemoryShopPhotoCache = cache;
  try {
    localStorage.setItem(SHOP_PHOTO_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

/**
 * Normalizes a shop photo URL into a canonical fingerprint so the same underlying photo
 * (even with different size query parameters) can never be assigned to two different shops.
 */
export function normalizeShopPhotoFingerprint(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('data:image/svg')) return '';

  // Google Places v1 photo resource name: places/<PLACE_ID>/photos/<PHOTO_REF>/media
  const googlePlacesMatch = trimmed.match(/\/places\/([^/]+)\/photos\/([^/?#]+)/i);
  if (googlePlacesMatch) {
    return `gplace_photo:${googlePlacesMatch[1]}:${googlePlacesMatch[2]}`;
  }

  // Wikimedia Commons filename
  const wikiMatch = trimmed.match(/\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/i);
  if (wikiMatch) {
    return `wikimedia:${decodeURIComponent(wikiMatch[1]).toLowerCase()}`;
  }

  return trimmed.split('?')[0].split('#')[0].toLowerCase();
}

/**
 * Collects fingerprints of all photos already assigned across all shops in the database
 * so we never assign a duplicate image to another shop.
 */
export function buildAssignedShopPhotoFingerprints(
  allRestaurants: Restaurant[],
  excludeShopId?: string
): Set<string> {
  const used = new Set<string>(sessionAssignedShopFingerprints);
  for (const r of allRestaurants) {
    if (!r || (excludeShopId && r.id === excludeShopId)) continue;
    const candidates = [
      r.photoUrl,
      r.profileImage,
      r.pendingPhotoReplacement?.newPhotoUrl,
      ...(Array.isArray(r.galleryPhotos) ? r.galleryPhotos : []),
    ];
    for (const u of candidates) {
      const fp = normalizeShopPhotoFingerprint(u);
      if (fp) used.add(fp);
    }
  }
  return used;
}

function extractDistinctiveShopTokens(name?: string): string[] {
  if (!name) return [];
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()（）[\]{}"'«».,/#!$%^&*;:{}=\-_`~]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !GENERIC_SHOP_WORDS.has(t));
}

/**
 * Computes name similarity (0 to 100) between a shop's Khmer/English names
 * and a candidate place name from Google Maps.
 */
export function scoreShopNameSimilarity(
  shop: Pick<Restaurant, 'nameKh' | 'nameEn'>,
  candidateName?: string
): number {
  const candNorm = normalizePlaceNameForComparison(candidateName || '');
  if (!candNorm) return 0;

  let bestScore = 0;
  for (const rawTarget of [shop.nameEn, shop.nameKh]) {
    const targetNorm = normalizePlaceNameForComparison(rawTarget || '');
    if (!targetNorm) continue;
    if (targetNorm === candNorm) return 100;

    const shorter = targetNorm.length <= candNorm.length ? targetNorm : candNorm;
    const longer = shorter === targetNorm ? candNorm : targetNorm;
    if (shorter.length >= 4 && longer.includes(shorter)) {
      bestScore = Math.max(bestScore, 88);
    }

    const targetTokens = extractDistinctiveShopTokens(rawTarget);
    const candTokens = extractDistinctiveShopTokens(candidateName);
    if (targetTokens.length > 0 && candTokens.length > 0) {
      let matched = 0;
      for (const tt of targetTokens) {
        if (candTokens.some((ct) => ct === tt || (ct.length >= 4 && tt.length >= 4 && (ct.includes(tt) || tt.includes(ct))))) {
          matched++;
        }
      }
      const coverage = matched / targetTokens.length;
      const jaccard = matched / (targetTokens.length + candTokens.length - matched);
      bestScore = Math.max(bestScore, Math.round(Math.max(coverage * 90, jaccard * 100)));
    }
  }

  return bestScore;
}

function isEligibleFoodPlaceTypes(types: string[], primaryType?: string): boolean {
  const allTypes = [...types, ...(primaryType ? [primaryType] : [])];
  if (allTypes.some((t) => REJECTED_NON_SHOP_PLACE_TYPES.has(t))) {
    return false;
  }
  if (allTypes.length === 0) return true;
  return allTypes.some(
    (t) =>
      ELIGIBLE_SHOP_PLACE_TYPES.has(t) ||
      t.endsWith('_restaurant') ||
      t.endsWith('_cafe') ||
      t.endsWith('_shop') ||
      t === 'point_of_interest' ||
      t === 'establishment'
  );
}

function isAcceptableShopImageUrl(url: string, titleOrMeta = ''): boolean {
  const combined = `${url} ${titleOrMeta}`.toLowerCase();
  for (const kw of REJECTED_IMAGE_KEYWORDS) {
    if (combined.includes(kw)) return false;
  }
  return true;
}

/**
 * 1. Primary Lookup: Google Places API v1 (`places:searchText` + Place Photos media endpoint)
 *    Matches strictly using Place Name + GPS Coordinates.
 */
async function searchGoogleMapsShopPhoto(
  shop: Restaurant,
  usedFingerprints: Set<string>
): Promise<ShopPhotoMatchResult | null> {
  if (isGooglePlacesV1CurrentlyBlocked()) return null;
  const cfg = getCloudApiConfig();
  const apiKey = (cfg.googleMapsApiKey || '').trim();
  if (!apiKey || apiKey.length < 15) return null;

  const hasValidGps = isValidCambodiaCoordinates(shop.latitude, shop.longitude);
  const provConfig = resolveProvinceGeoConfig(shop.provinceKh || shop.provinceEn || '');
  const centerLat = hasValidGps ? shop.latitude : provConfig?.lat || 11.5564;
  const centerLng = hasValidGps ? shop.longitude : provConfig?.lng || 104.9282;
  const biasRadius = hasValidGps ? 1800 : 20000;

  const queries: string[] = [];
  if (shop.nameEn && shop.nameEn.trim()) {
    queries.push(`${shop.nameEn.trim()} ${provConfig?.en || shop.provinceEn || ''} Cambodia`.trim());
  }
  if (shop.nameKh && shop.nameKh.trim() && shop.nameKh.trim() !== shop.nameEn?.trim()) {
    queries.push(`${shop.nameKh.trim()} ${shop.provinceKh || ''} Cambodia`.trim());
  }

  for (const textQuery of queries) {
    try {
      const body: Record<string, unknown> = {
        textQuery,
        regionCode: 'KH',
        maxResultCount: 5,
        locationBias: {
          circle: {
            center: { latitude: centerLat, longitude: centerLng },
            radius: biasRadius,
          },
        },
      };

      const res = await fetch(PLACES_SEARCH_TEXT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': PLACES_SHOP_FIELD_MASK,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const places: any[] = Array.isArray(data?.places) ? data.places : [];

      for (const place of places) {
        if (!place || place.businessStatus === 'CLOSED_PERMANENTLY') continue;
        const photos: any[] = Array.isArray(place?.photos) ? place.photos : [];
        if (photos.length === 0) continue;

        const types: string[] = Array.isArray(place?.types) ? place.types : [];
        if (!isEligibleFoodPlaceTypes(types, place?.primaryType)) continue;

        const candLat = Number(place?.location?.latitude || 0);
        const candLng = Number(place?.location?.longitude || 0);
        if (!isValidCambodiaCoordinates(candLat, candLng)) continue;

        const distanceMeters = hasValidGps
          ? calculateHaversineMeters(shop.latitude, shop.longitude, candLat, candLng)
          : undefined;

        const candName = String(place?.displayName?.text || '').trim();
        const nameScore = scoreShopNameSimilarity(shop, candName);

        // Strict Name + GPS verification:
        // - If shop has GPS: either within 350m with name score >= 60%, or within 1,500m with strong name score >= 82%
        // - If shop has no GPS yet: requires strong name score >= 82% within the same province
        let isVerifiedMatch = false;
        if (distanceMeters !== undefined) {
          isVerifiedMatch =
            (distanceMeters <= 350 && nameScore >= 60) ||
            (distanceMeters <= 1500 && nameScore >= 82);
        } else {
          const formattedAddr = String(place?.formattedAddress || '').toLowerCase();
          const sameProvince = provConfig
            ? formattedAddr.includes(provConfig.en.toLowerCase()) ||
              provConfig.aliases.some((a) => formattedAddr.includes(a.toLowerCase()))
            : true;
          isVerifiedMatch = nameScore >= 82 && sameProvince;
        }

        if (!isVerifiedMatch) continue;

        const selectedUrls: string[] = [];
        for (const p of photos) {
          const photoResName = String(p?.name || '').trim();
          if (!photoResName) continue;
          const candidateUrl = `https://places.googleapis.com/v1/${photoResName}/media?maxWidthPx=480&maxHeightPx=480&key=${encodeURIComponent(
            apiKey
          )}`;
          const fp = normalizeShopPhotoFingerprint(candidateUrl);
          if (!fp || usedFingerprints.has(fp)) continue;
          selectedUrls.push(candidateUrl);
          if (selectedUrls.length >= 3) break;
        }

        if (selectedUrls.length > 0) {
          const firstPhoto = photos[0];
          const attrNames: string[] = Array.isArray(firstPhoto?.authorAttributions)
            ? firstPhoto.authorAttributions.map((a: any) => a?.displayName).filter(Boolean)
            : [];
          const attribution = attrNames.length > 0 ? `Google Maps • ${attrNames.join(', ')}` : 'Google Maps';

          return {
            restaurantId: shop.id,
            photoUrl: selectedUrls[0],
            galleryPhotos: selectedUrls,
            googlePlaceId: String(place.id || ''),
            matchedPlaceId: String(place.id || ''),
            matchedLat: candLat,
            matchedLng: candLng,
            matchedName: candName,
            matchedAddress: String(place.formattedAddress || ''),
            matchedGoogleMapsUrl: place.googleMapsUri || undefined,
            distanceMeters: distanceMeters !== undefined ? Math.round(distanceMeters) : undefined,
            confidenceScore: nameScore,
            photoAttribution: attribution,
            source: 'google_maps_places',
          };
        }
      }
    } catch {
      // Continue to next query
    }
  }

  return null;
}

/**
 * 2. Coordinate- & Name-Verified Wikimedia Commons Geosearch Fallback
 *    Only accepts a photo if it is within 250m of the shop's exact GPS coordinates AND its title matches the shop's distinctive name tokens.
 */
async function searchCoordinateVerifiedWikimediaShopPhoto(
  shop: Restaurant,
  usedFingerprints: Set<string>
): Promise<ShopPhotoMatchResult | null> {
  if (!isValidCambodiaCoordinates(shop.latitude, shop.longitude)) return null;
  const distinctiveTokens = [
    ...extractDistinctiveShopTokens(shop.nameEn),
    ...extractDistinctiveShopTokens(shop.nameKh),
  ];
  if (distinctiveTokens.length === 0) return null;

  try {
    const geoUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${shop.latitude}|${shop.longitude}&ggsradius=250&ggsnamespace=6&ggslimit=8&prop=imageinfo|coordinates&iiprop=url&iiurlwidth=480&format=json&origin=*`;
    const res = await fetch(geoUrl);
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages ? Object.values(data.query.pages) : [];

    for (const page of pages as any[]) {
      const title = String(page?.title || '').replace(/^File:/i, '');
      const thumbUrl = String(page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url || '').trim();
      if (!thumbUrl || !isAcceptableShopImageUrl(thumbUrl, title)) continue;

      const fp = normalizeShopPhotoFingerprint(thumbUrl);
      if (!fp || usedFingerprints.has(fp)) continue;

      const titleLower = title.toLowerCase();
      const hasNameTokenMatch = distinctiveTokens.some((tok) => tok.length >= 3 && titleLower.includes(tok));
      if (!hasNameTokenMatch) continue;

      const coord = Array.isArray(page?.coordinates) ? page.coordinates[0] : null;
      const dist = coord
        ? calculateHaversineMeters(shop.latitude, shop.longitude, Number(coord.lat), Number(coord.lon))
        : 100;

      if (dist <= 250) {
        return {
          restaurantId: shop.id,
          photoUrl: thumbUrl,
          galleryPhotos: [thumbUrl],
          matchedLat: coord ? Number(coord.lat) : shop.latitude,
          matchedLng: coord ? Number(coord.lon) : shop.longitude,
          matchedName: title.replace(/\.[^.]+$/, ''),
          distanceMeters: Math.round(dist),
          confidenceScore: 84,
          photoAttribution: 'Wikimedia Commons Geosearch',
          source: 'wikimedia_geosearch',
        };
      }
    }
  } catch {
    // Ignore network error
  }

  return null;
}

/**
 * Main Entry Point:
 * Automatically retrieves a verified, non-duplicate place photo for a shop (`Restaurant`)
 * using its Place Name and GPS Coordinates.
 * If no matching photo belongs to the shop, returns `null` so the UI displays `<DefaultShopIcon />`.
 */
export async function fetchVerifiedShopPhotoFromGoogleMaps(
  shop: Restaurant,
  allRestaurants: Restaurant[] = []
): Promise<ShopPhotoMatchResult | null> {
  if (!shop || !shop.id) return null;

  // If the shop already has a verified photo that is not a duplicate, keep it
  const existingClean = sanitizeRestaurantShopPhoto(
    shop.id,
    shop.photoUrl || shop.profileImage || ''
  );
  const usedFingerprints = buildAssignedShopPhotoFingerprints(allRestaurants, shop.id);
  if (existingClean && !existingClean.startsWith('/foods/')) {
    const existingFp = normalizeShopPhotoFingerprint(existingClean);
    if (existingFp && !usedFingerprints.has(existingFp)) {
      sessionAssignedShopFingerprints.add(existingFp);
      return {
        restaurantId: shop.id,
        photoUrl: existingClean,
        galleryPhotos: shop.galleryPhotos?.length ? shop.galleryPhotos : [existingClean],
        googlePlaceId: shop.googlePlaceId,
        matchedPlaceId: shop.googlePlaceId,
        matchedLat: shop.latitude,
        matchedLng: shop.longitude,
        matchedName: shop.nameEn || shop.nameKh,
        confidenceScore: 100,
        source: 'google_maps_places',
      };
    }
  }

  // Check local verified cache first
  const cache = loadShopPhotoCache();
  if (Object.prototype.hasOwnProperty.call(cache, shop.id)) {
    const cached = cache[shop.id];
    if (!cached) {
      return null;
    }
    const cachedFp = normalizeShopPhotoFingerprint(cached.photoUrl);
    if (cachedFp && !usedFingerprints.has(cachedFp)) {
      sessionAssignedShopFingerprints.add(cachedFp);
      return {
        restaurantId: shop.id,
        photoUrl: cached.photoUrl,
        galleryPhotos: [cached.photoUrl],
        googlePlaceId: cached.googlePlaceId,
        matchedPlaceId: cached.googlePlaceId,
        matchedLat: cached.matchedLat,
        matchedLng: cached.matchedLng,
        matchedName: cached.matchedName,
        matchedAddress: cached.matchedAddress,
        distanceMeters: cached.distanceMeters,
        confidenceScore: cached.confidenceScore,
        photoAttribution: cached.photoAttribution,
        source: cached.source,
      };
    }
  }

  // Deduplicate concurrent requests for the same shop ID
  const existingPromise = inFlightShopRequests.get(shop.id);
  if (existingPromise) return existingPromise;

  const task = (async (): Promise<ShopPhotoMatchResult | null> => {
    // 1. Try Google Maps Places API (Name + GPS)
    const googleMatch = await searchGoogleMapsShopPhoto(shop, usedFingerprints);
    if (googleMatch) {
      const fp = normalizeShopPhotoFingerprint(googleMatch.photoUrl);
      if (fp) {
        usedFingerprints.add(fp);
        sessionAssignedShopFingerprints.add(fp);
      }
      cache[shop.id] = {
        photoUrl: googleMatch.photoUrl,
        googlePlaceId: googleMatch.googlePlaceId,
        matchedLat: googleMatch.matchedLat,
        matchedLng: googleMatch.matchedLng,
        matchedName: googleMatch.matchedName,
        matchedAddress: googleMatch.matchedAddress,
        distanceMeters: googleMatch.distanceMeters,
        confidenceScore: googleMatch.confidenceScore,
        photoAttribution: googleMatch.photoAttribution,
        source: googleMatch.source,
        updatedAt: new Date().toISOString(),
      };
      saveShopPhotoCache(cache);
      return googleMatch;
    }

    // 2. Try coordinate-verified Wikimedia Geosearch
    const wikiMatch = await searchCoordinateVerifiedWikimediaShopPhoto(shop, usedFingerprints);
    if (wikiMatch) {
      const fp = normalizeShopPhotoFingerprint(wikiMatch.photoUrl);
      if (fp) {
        usedFingerprints.add(fp);
        sessionAssignedShopFingerprints.add(fp);
      }
      cache[shop.id] = {
        photoUrl: wikiMatch.photoUrl,
        matchedLat: wikiMatch.matchedLat,
        matchedLng: wikiMatch.matchedLng,
        matchedName: wikiMatch.matchedName,
        distanceMeters: wikiMatch.distanceMeters,
        confidenceScore: wikiMatch.confidenceScore,
        photoAttribution: wikiMatch.photoAttribution,
        source: wikiMatch.source,
        updatedAt: new Date().toISOString(),
      };
      saveShopPhotoCache(cache);
      return wikiMatch;
    }

    // No confident match -> return null so UI uses <DefaultShopIcon />
    return null;
  })();

  inFlightShopRequests.set(shop.id, task);
  try {
    return await task;
  } finally {
    inFlightShopRequests.delete(shop.id);
  }
}

/**
 * Batch auto-fetcher for Admin Shop Management:
 * Scans shops missing a verified photo, matches photos from Google Maps by Place Name + GPS,
 * prevents duplicates across all shops, and invokes `onMatched` for each verified match.
 */
export async function batchAutoFetchMissingShopPhotos(
  targets: Restaurant[],
  allRestaurants: Restaurant[],
  onProgress?: (progress: ShopBatchFetchProgress) => void,
  onMatched?: (updated: Restaurant, match: ShopPhotoMatchResult) => void,
  shouldCancel?: () => boolean
): Promise<{ matchedCount: number; skippedCount: number; matched: number; processed: number }> {
  let matchedCount = 0;
  let skippedCount = 0;
  let processedCount = 0;
  const workingList = [...allRestaurants];

  for (let i = 0; i < targets.length; i++) {
    if (shouldCancel?.()) break;
    const target = targets[i];
    onProgress?.({
      done: i,
      processed: i,
      total: targets.length,
      matched: matchedCount,
      skippedNoMatch: skippedCount,
      currentName: target.nameKh || target.nameEn,
    });

    const match = await fetchVerifiedShopPhotoFromGoogleMaps(target, workingList);
    processedCount = i + 1;
    if (match && match.photoUrl) {
      matchedCount++;
      const nowIso = new Date().toISOString();
      const updatedShop: Restaurant = {
        ...target,
        photoUrl: match.photoUrl,
        profileImage: match.photoUrl,
        galleryPhotos: match.galleryPhotos.length > 0 ? match.galleryPhotos : [match.photoUrl],
        googlePlaceId: target.googlePlaceId || match.googlePlaceId || match.matchedPlaceId,
        latitude: isValidCambodiaCoordinates(target.latitude, target.longitude)
          ? target.latitude
          : match.matchedLat || target.latitude,
        longitude: isValidCambodiaCoordinates(target.latitude, target.longitude)
          ? target.longitude
          : match.matchedLng || target.longitude,
        photoUpdatedAt: nowIso,
        updatedAt: nowIso,
      };
      const idx = workingList.findIndex((r) => r.id === target.id);
      if (idx !== -1) {
        workingList[idx] = updatedShop;
      } else {
        workingList.push(updatedShop);
      }
      onMatched?.(updatedShop, match);
    } else {
      skippedCount++;
    }

    onProgress?.({
      done: processedCount,
      processed: processedCount,
      total: targets.length,
      matched: matchedCount,
      skippedNoMatch: skippedCount,
      currentName: target.nameKh || target.nameEn,
    });
  }

  return { matchedCount, skippedCount, matched: matchedCount, processed: processedCount };
}
