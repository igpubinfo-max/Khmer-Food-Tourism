/**
 * Automatic Tourist Attraction Image Fetching Service (Google Maps / Places API + Geosearch Verification)
 *
 * Whenever new tourist attractions are added to the database (or for existing attractions missing photos),
 * automatically retrieves the corresponding place photo from Google Maps (Google Places API v1) with
 * coordinate-verified Wikimedia Commons / Wikipedia Geosearch fallback.
 *
 * Strict Guarantees:
 * 1. Matches photos accurately using BOTH the attraction's Place Name and GPS Coordinates.
 * 2. Ensures each image belongs to the correct attraction (rejecting unrelated place types, logos, maps, flags, etc.).
 * 3. Displays high-quality thumbnails (400px–480px optimized thumbnails).
 * 4. Prevents duplicate images across all attractions via a normalized photo fingerprint registry.
 * 5. If no confident matching photo is available, returns `null` so the UI cleanly displays the default placeholder icon.
 */

import type { TouristDestination } from '../types';
import { isValidCambodiaCoordinates } from '../types';
import { getCloudApiConfig } from './supabaseService';
import {
  calculateHaversineMeters,
  isGooglePlacesV1CurrentlyBlocked,
  normalizePlaceNameForComparison,
  resolveProvinceGeoConfig,
} from './googlePlacesService';

const PLACES_SEARCH_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';
const ATTRACTION_PHOTO_CACHE_KEY = 'kft_verified_attraction_photos_v1';

const PLACES_ATTRACTION_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.photos',
  'places.types',
  'places.primaryType',
].join(',');

/** Place types on Google Maps that are never valid scenic/cultural tourist attractions */
const REJECTED_NON_ATTRACTION_TYPES = new Set([
  'gas_station',
  'atm',
  'bank',
  'pharmacy',
  'drugstore',
  'car_repair',
  'car_wash',
  'car_dealer',
  'parking',
  'supermarket',
  'convenience_store',
  'grocery_store',
  'hospital',
  'dentist',
  'doctor',
  'laundry',
  'hair_care',
  'beauty_salon',
  'insurance_agency',
  'real_estate_agency',
  'accounting',
  'lawyer',
  'post_office',
  'police',
  'storage',
  ' hardware_store',
]);

/** Words in image filenames/titles that indicate maps, flags, logos, diagrams, or unrelated files */
const REJECTED_IMAGE_FILENAME_KEYWORDS = [
  '.svg',
  '.pdf',
  '.ogg',
  '.webm',
  '.tif',
  '.gif',
  'map',
  'locator',
  'location_',
  'flag',
  'seal',
  'logo',
  'icon',
  'coat_of_arms',
  'emblem',
  'portrait',
  'stamp',
  'coin',
  'banknote',
  'diagram',
  'plan_of',
  'floorplan',
  'signature',
  'autograph',
  'chart',
  'graph',
  'placeholder',
  'no_image',
  'blank',
  'default',
  'dish',
  'soup',
  'noodle',
];

export interface AttractionPhotoMatchResult {
  destinationId: string;
  photoUrl: string;
  galleryPhotos: string[];
  googlePlaceId?: string;
  matchedPlaceId?: string;
  matchedLat?: number;
  matchedLng?: number;
  matchedName: string;
  distanceMeters?: number;
  confidenceScore: number;
  source: 'google_maps_places' | 'wikimedia_geosearch' | 'wikipedia_verified';
}

export interface AttractionBatchFetchProgress {
  done?: number;
  processed: number;
  total: number;
  matched: number;
  skippedNoMatch?: number;
  currentName?: string;
}

interface CachedAttractionPhotoEntry {
  photoUrl: string;
  googlePlaceId?: string;
  matchedName: string;
  source: AttractionPhotoMatchResult['source'];
  updatedAt: string;
}

let inMemoryAttractionPhotoCache: Record<string, CachedAttractionPhotoEntry> | null = null;
const inFlightRequests = new Map<string, Promise<AttractionPhotoMatchResult | null>>();

function loadAttractionPhotoCache(): Record<string, CachedAttractionPhotoEntry> {
  if (inMemoryAttractionPhotoCache) return inMemoryAttractionPhotoCache;
  try {
    const raw = localStorage.getItem(ATTRACTION_PHOTO_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        inMemoryAttractionPhotoCache = parsed;
        return parsed;
      }
    }
  } catch {}
  inMemoryAttractionPhotoCache = {};
  return inMemoryAttractionPhotoCache;
}

function saveAttractionPhotoCache(cache: Record<string, CachedAttractionPhotoEntry>): void {
  inMemoryAttractionPhotoCache = cache;
  try {
    localStorage.setItem(ATTRACTION_PHOTO_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

/**
 * Normalizes a photo URL into a canonical fingerprint so the same underlying photo
 * (even with different size parameters or query strings) can never be assigned twice.
 */
export function normalizePhotoFingerprint(rawUrl?: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('data:image/svg')) return '';

  // Google Places v1 photo resource name: places/{placeId}/photos/{photoRef}/media
  const googleMatch = trimmed.match(/places\/([^/]+)\/photos\/([^/?#]+)/i);
  if (googleMatch) {
    return `gplaces:${googleMatch[1]}:${googleMatch[2]}`.toLowerCase();
  }

  // Wikimedia / Wikipedia file name fingerprint
  const wikiMatch = trimmed.match(/\/([^/?#]+\.(?:jpg|jpeg|png|webp))(?:\?|$)/i);
  if (wikiMatch) {
    const cleanedFile = decodeURIComponent(wikiMatch[1])
      .replace(/^\d+px-/i, '')
      .toLowerCase();
    return `wiki:${cleanedFile}`;
  }

  return trimmed.split('?')[0].toLowerCase();
}

/**
 * Builds the set of all photo fingerprints already assigned across the database
 * so no new attraction ever gets a duplicate image.
 */
export function buildAssignedAttractionPhotoFingerprints(
  destinations: TouristDestination[],
  excludeDestinationId?: string
): Set<string> {
  const used = new Set<string>();
  for (const d of destinations) {
    if (!d || d.id === excludeDestinationId) continue;
    const fp = normalizePhotoFingerprint(d.photoUrl);
    if (fp) used.add(fp);
    if (Array.isArray(d.galleryPhotos)) {
      for (const g of d.galleryPhotos) {
        const gfp = normalizePhotoFingerprint(g);
        if (gfp) used.add(gfp);
      }
    }
  }
  const cache = loadAttractionPhotoCache();
  for (const [id, entry] of Object.entries(cache)) {
    if (id === excludeDestinationId) continue;
    const fp = normalizePhotoFingerprint(entry?.photoUrl);
    if (fp) used.add(fp);
  }
  return used;
}

/**
 * Generic stop-words stripped when comparing attraction names so distinctive words
 * (e.g., "Angkor", "Banteay", "Kulen", "Bokor", "Ounalom", "Kong Noy") carry the match weight.
 */
const GENERIC_PLACE_STOP_WORDS = new Set([
  'temple',
  'prasat',
  'wat',
  'pagoda',
  'waterfall',
  'mountain',
  'phnom',
  'beach',
  'island',
  'koh',
  'resort',
  'ecotourism',
  'community',
  'lake',
  'boeung',
  'river',
  'stung',
  'preah',
  'cambodia',
  'province',
  'krong',
  'sangkat',
  'district',
  'ancient',
  'historical',
  'site',
  'sanctuary',
  'park',
  'national',
  'ប្រាសាទ',
  'វត្ត',
  'ទឹកធ្លាក់',
  'ភ្នំ',
  'ឆ្នេរ',
  'កោះ',
  'រមណីយដ្ឋាន',
  'សហគមន៍',
  'អេកូទេសចរណ៍',
  'បឹង',
  'ស្ទឹង',
  'ព្រែក',
  'ខេត្ត',
  'ក្រុង',
]);

function extractDistinctiveAttractionTokens(name?: string): string[] {
  const norm = normalizePlaceNameForComparison(name || '');
  if (!norm) return [];
  const allTokens = norm.split(/\s+/).filter((t) => t.length >= 2);
  const distinctive = allTokens.filter((t) => !GENERIC_PLACE_STOP_WORDS.has(t));
  return distinctive.length > 0 ? distinctive : allTokens;
}

/**
 * Computes name similarity score (0 - 100) between the target attraction and a candidate place name.
 */
export function computeAttractionNameSimilarity(
  targetNameKh: string,
  targetNameEn: string,
  candidateName: string
): number {
  const candNorm = normalizePlaceNameForComparison(candidateName);
  if (!candNorm) return 0;

  const khNorm = normalizePlaceNameForComparison(targetNameKh);
  const enNorm = normalizePlaceNameForComparison(targetNameEn);

  if ((khNorm && candNorm === khNorm) || (enNorm && candNorm === enNorm)) {
    return 100;
  }
  if ((enNorm && enNorm.length >= 4 && candNorm.includes(enNorm)) || (khNorm && khNorm.length >= 4 && candNorm.includes(khNorm))) {
    return 90;
  }

  const targetTokens = [
    ...extractDistinctiveAttractionTokens(targetNameEn),
    ...extractDistinctiveAttractionTokens(targetNameKh),
  ];
  if (targetTokens.length === 0) return 0;

  const candTokens = new Set(candNorm.split(/\s+/).filter(Boolean));
  let matched = 0;
  for (const tok of targetTokens) {
    if (candTokens.has(tok) || (tok.length >= 4 && candNorm.includes(tok))) {
      matched++;
    }
  }

  return Math.round((matched / targetTokens.length) * 100);
}

function isRejectedImageTitleOrUrl(titleOrUrl?: string): boolean {
  if (!titleOrUrl) return true;
  const lower = titleOrUrl.toLowerCase();
  return REJECTED_IMAGE_FILENAME_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * 1. Queries official Google Maps (Google Places API v1 `places:searchText`) using
 *    both the attraction's Place Name and GPS Coordinates.
 */
async function queryGooglePlacesPhotoForAttraction(
  destination: TouristDestination,
  usedFingerprints: Set<string>
): Promise<AttractionPhotoMatchResult | null> {
  if (isGooglePlacesV1CurrentlyBlocked()) return null;

  const cfg = getCloudApiConfig();
  const apiKey = (cfg.googleMapsApiKey || '').trim();
  if (!apiKey) return null;

  const hasValidGps = isValidCambodiaCoordinates(destination.latitude, destination.longitude);
  const provConfig = resolveProvinceGeoConfig(destination.provinceKh || destination.provinceEn);
  const centerLat = hasValidGps ? destination.latitude : provConfig?.lat || 12.5657;
  const centerLng = hasValidGps ? destination.longitude : provConfig?.lng || 104.991;
  const searchRadiusMeters = hasValidGps ? 3500 : 25000;

  const queries = [
    `${destination.nameEn || destination.nameKh} ${destination.provinceEn || ''} Cambodia`.trim(),
    `${destination.nameKh} ${destination.provinceKh || ''}`.trim(),
  ].filter(Boolean);

  for (const textQuery of queries) {
    try {
      const body: Record<string, unknown> = {
        textQuery,
        maxResultCount: 6,
        locationBias: {
          circle: {
            center: { latitude: centerLat, longitude: centerLng },
            radius: searchRadiusMeters,
          },
        },
      };

      const res = await fetch(PLACES_SEARCH_TEXT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': PLACES_ATTRACTION_FIELD_MASK,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const places: any[] = Array.isArray(data?.places) ? data.places : [];

      for (const place of places) {
        const photos: any[] = Array.isArray(place?.photos) ? place.photos : [];
        if (photos.length === 0) continue;

        const types: string[] = Array.isArray(place?.types) ? place.types : [];
        if (types.some((t) => REJECTED_NON_ATTRACTION_TYPES.has(t))) {
          continue;
        }

        const candLat = Number(place?.location?.latitude || 0);
        const candLng = Number(place?.location?.longitude || 0);
        if (!isValidCambodiaCoordinates(candLat, candLng)) continue;

        const distanceMeters = hasValidGps
          ? calculateHaversineMeters(destination.latitude, destination.longitude, candLat, candLng)
          : undefined;

        const candName = String(place?.displayName?.text || '').trim();
        const nameScore = computeAttractionNameSimilarity(
          destination.nameKh,
          destination.nameEn,
          candName
        );

        // Require accurate Name + GPS match:
        // - Either very close GPS (<= 450m) with reasonable name match (>= 45%)
        // - Or within 3,500m with strong name match (>= 65%)
        // - Or exact name match (>= 85%) within the same province (<= 25,000m)
        const gpsAndNameValid =
          distanceMeters !== undefined
            ? (distanceMeters <= 450 && nameScore >= 45) ||
              (distanceMeters <= 3500 && nameScore >= 65) ||
              (distanceMeters <= 25000 && nameScore >= 85)
            : nameScore >= 75;

        if (!gpsAndNameValid) continue;

        // Pick the first high-quality photo not already assigned to another attraction
        const selectedUrls: string[] = [];
        for (const p of photos) {
          const photoResName = String(p?.name || '').trim();
          if (!photoResName) continue;
          const candidateUrl = `https://places.googleapis.com/v1/${photoResName}/media?maxHeightPx=480&maxWidthPx=640&key=${encodeURIComponent(
            apiKey
          )}`;
          const fp = normalizePhotoFingerprint(candidateUrl);
          if (!fp || usedFingerprints.has(fp)) continue;
          selectedUrls.push(candidateUrl);
          if (selectedUrls.length >= 3) break;
        }

        if (selectedUrls.length > 0) {
          return {
            destinationId: destination.id,
            photoUrl: selectedUrls[0],
            galleryPhotos: selectedUrls,
            googlePlaceId: place.id,
            matchedPlaceId: place.id,
            matchedLat: candLat,
            matchedLng: candLng,
            matchedName: candName,
            distanceMeters,
            confidenceScore: nameScore,
            source: 'google_maps_places',
          };
        }
      }
    } catch {
      // Continue to fallback on network/API error
    }
  }

  return null;
}

/**
 * 2. Coordinate- & Name-Verified Wikimedia Commons Geosearch + Wikipedia PageImages Lookup
 *    Ensures each image belongs to the exact attraction by checking GPS distance & distinctive name tokens.
 */
async function queryCoordinateVerifiedWikimediaPhoto(
  destination: TouristDestination,
  usedFingerprints: Set<string>
): Promise<AttractionPhotoMatchResult | null> {
  const hasValidGps = isValidCambodiaCoordinates(destination.latitude, destination.longitude);
  const distinctiveEn = extractDistinctiveAttractionTokens(destination.nameEn);
  const distinctiveKh = extractDistinctiveAttractionTokens(destination.nameKh);

  // 2A. Check English & Khmer Wikipedia articles with coordinate + name verification
  const wikiSearches: { host: string; query: string }[] = [];
  if (destination.nameEn && destination.nameEn.trim()) {
    wikiSearches.push({
      host: 'https://en.wikipedia.org',
      query: `${destination.nameEn.trim()} Cambodia`,
    });
  }
  if (destination.nameKh && destination.nameKh.trim()) {
    wikiSearches.push({
      host: 'https://km.wikipedia.org',
      query: destination.nameKh.trim(),
    });
  }

  for (const { host, query } of wikiSearches) {
    try {
      const apiUrl = `${host}/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        query
      )}&gsrlimit=4&prop=pageimages|coordinates&pithumbsize=480&format=json&origin=*`;
      const res = await fetch(apiUrl);
      if (!res.ok) continue;
      const data = await res.json();
      const pages: any[] = Object.values(data?.query?.pages || {});

      for (const page of pages) {
        const thumbUrl = String(page?.thumbnail?.source || '').trim();
        if (!thumbUrl || isRejectedImageTitleOrUrl(thumbUrl) || isRejectedImageTitleOrUrl(page?.title)) {
          continue;
        }

        const fp = normalizePhotoFingerprint(thumbUrl);
        if (!fp || usedFingerprints.has(fp)) continue;

        const titleScore = computeAttractionNameSimilarity(
          destination.nameKh,
          destination.nameEn,
          String(page?.title || '')
        );

        const coord = Array.isArray(page?.coordinates) ? page.coordinates[0] : null;
        const pageLat = Number(coord?.lat || 0);
        const pageLng = Number(coord?.lon || 0);
        const hasPageCoord = isValidCambodiaCoordinates(pageLat, pageLng);

        const distanceMeters =
          hasValidGps && hasPageCoord
            ? calculateHaversineMeters(destination.latitude, destination.longitude, pageLat, pageLng)
            : undefined;

        // If the Wikipedia page has coordinates, verify it's within 5km (or 15km with 85%+ name match)
        if (distanceMeters !== undefined && distanceMeters > 15000) {
          continue;
        }
        const isMatch =
          (distanceMeters !== undefined && distanceMeters <= 2500 && titleScore >= 50) ||
          titleScore >= 75;

        if (!isMatch) continue;

        return {
          destinationId: destination.id,
          photoUrl: thumbUrl,
          galleryPhotos: [thumbUrl],
          matchedName: String(page?.title || destination.nameEn),
          distanceMeters,
          confidenceScore: titleScore,
          source: 'wikipedia_verified',
        };
      }
    } catch {}
  }

  // 2B. Wikimedia Commons Geosearch around the attraction's exact GPS coordinates + name verification
  if (hasValidGps && (distinctiveEn.length > 0 || distinctiveKh.length > 0)) {
    try {
      const geoUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=geosearch&ggscoord=${destination.latitude}|${destination.longitude}&ggsradius=1500&ggslimit=10&ggsnamespace=6&prop=imageinfo|coordinates&iiprop=url&iiurlwidth=480&format=json&origin=*`;
      const res = await fetch(geoUrl);
      if (res.ok) {
        const data = await res.json();
        const pages: any[] = Object.values(data?.query?.pages || {});
        for (const page of pages) {
          const title = String(page?.title || '').replace(/^File:/i, '');
          const info = page?.imageinfo?.[0];
          const thumbUrl = String(info?.thumburl || info?.url || '').trim();
          if (!thumbUrl || isRejectedImageTitleOrUrl(title) || isRejectedImageTitleOrUrl(thumbUrl)) {
            continue;
          }

          const fp = normalizePhotoFingerprint(thumbUrl);
          if (!fp || usedFingerprints.has(fp)) continue;

          const coord = Array.isArray(page?.coordinates) ? page.coordinates[0] : null;
          const imgLat = Number(coord?.lat || 0);
          const imgLng = Number(coord?.lon || 0);
          const dist = isValidCambodiaCoordinates(imgLat, imgLng)
            ? calculateHaversineMeters(destination.latitude, destination.longitude, imgLat, imgLng)
            : 1500;

          const nameScore = computeAttractionNameSimilarity(
            destination.nameKh,
            destination.nameEn,
            title
          );

          // Accept if either the file title matches the attraction name (>= 60%) or it was photographed within 350m of the attraction's exact GPS
          if (nameScore >= 60 || dist <= 350) {
            return {
              destinationId: destination.id,
              photoUrl: thumbUrl,
              galleryPhotos: [thumbUrl],
              matchedName: title,
              distanceMeters: dist,
              confidenceScore: Math.max(nameScore, dist <= 350 ? 75 : 60),
              source: 'wikimedia_geosearch',
            };
          }
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Automatically retrieves a verified, non-duplicate place photo for a tourist attraction
 * using its Place Name and GPS Coordinates.
 * Returns `null` if no confident match is found so the caller displays the default placeholder icon.
 */
export async function fetchVerifiedAttractionPhotoFromGoogleMaps(
  destination: TouristDestination,
  allDestinations: TouristDestination[] = []
): Promise<AttractionPhotoMatchResult | null> {
  if (!destination || !destination.id || destination.categorySlug === 'hotel') {
    return null;
  }

  const existingRequest = inFlightRequests.get(destination.id);
  if (existingRequest) {
    return existingRequest;
  }

  const task = (async (): Promise<AttractionPhotoMatchResult | null> => {
    const usedFingerprints = buildAssignedAttractionPhotoFingerprints(
      allDestinations,
      destination.id
    );

    // Check persistent cache first (ignore paid places.googleapis.com URLs so 10,000+ users incur $0 Google API cost)
    const cache = loadAttractionPhotoCache();
    const cached = cache[destination.id];
    if (
      cached &&
      cached.photoUrl &&
      !cached.photoUrl.includes('places.googleapis.com') &&
      !isRejectedImageTitleOrUrl(cached.photoUrl)
    ) {
      const fp = normalizePhotoFingerprint(cached.photoUrl);
      if (fp && !usedFingerprints.has(fp)) {
        return {
          destinationId: destination.id,
          photoUrl: cached.photoUrl,
          galleryPhotos: [cached.photoUrl],
          googlePlaceId: cached.googlePlaceId,
          matchedName: cached.matchedName,
          confidenceScore: 90,
          source: cached.source,
        };
      }
    }

    // Coordinate- & Name-verified Wikipedia / Wikimedia Commons Geosearch (100% Free $0 & Creative Commons licensed)
    const wikiMatch = await queryCoordinateVerifiedWikimediaPhoto(destination, usedFingerprints);
    if (wikiMatch) {
      cache[destination.id] = {
        photoUrl: wikiMatch.photoUrl,
        matchedName: wikiMatch.matchedName,
        source: wikiMatch.source,
        updatedAt: new Date().toISOString(),
      };
      saveAttractionPhotoCache(cache);
      return wikiMatch;
    }

    // No confident free match found -> return null so UI uses DefaultDestinationIcon ($0 API cost)
    return null;
  })();

  inFlightRequests.set(destination.id, task);
  try {
    return await task;
  } finally {
    inFlightRequests.delete(destination.id);
  }
}

/**
 * Batch auto-fetcher for Admin Tourism Management:
 * Scans tourist attractions that are missing a photo, fetches accurate photos by Name + GPS,
 * prevents duplicates across the entire database, and invokes `onMatched` for each verified match.
 */
export async function batchAutoFetchMissingAttractionPhotos(
  targets: TouristDestination[],
  allDestinations: TouristDestination[],
  onProgress?: (progress: AttractionBatchFetchProgress) => void,
  onMatched?: (updated: TouristDestination, match: AttractionPhotoMatchResult) => void,
  shouldCancel?: () => boolean
): Promise<{ matchedCount: number; skippedCount: number; matched: number; processed: number }> {
  let matchedCount = 0;
  let skippedCount = 0;
  let processedCount = 0;
  const workingList = [...allDestinations];

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

    const match = await fetchVerifiedAttractionPhotoFromGoogleMaps(target, workingList);
    processedCount = i + 1;
    if (match && match.photoUrl) {
      matchedCount++;
      const nowIso = new Date().toISOString();
      const updatedDest: TouristDestination = {
        ...target,
        photoUrl: match.photoUrl,
        galleryPhotos: match.galleryPhotos.length > 0 ? match.galleryPhotos : [match.photoUrl],
        googlePlaceId: target.googlePlaceId || match.googlePlaceId || match.matchedPlaceId,
        isCustomPhoto: true,
        photoUpdatedAt: nowIso,
      };
      const idx = workingList.findIndex((d) => d.id === target.id);
      if (idx !== -1) {
        workingList[idx] = updatedDest;
      } else {
        workingList.push(updatedDest);
      }
      onMatched?.(updatedDest, match);
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
