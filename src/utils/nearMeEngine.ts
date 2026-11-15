import {
  Restaurant,
  TouristDestination,
  isHotelBusinessRecord,
  isPlaceLocationVerified,
} from '../types';
import {
  GooglePlaceCachedItem,
  convertGooglePlaceToRestaurant,
  convertGooglePlaceToDestination,
  findDuplicateRestaurantForGooglePlace,
  findDuplicateDestinationForGooglePlace,
  mergeGoogleMapsPlaceWithExistingRestaurant,
  normalizeKhmerSearchText,
} from '../services/googlePlacesService';
import { verifyShopDataForDisplay } from './foodFilters';

// Haversine formula for distance between 2 GPS coordinates in meters
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2) ||
    lat2 <= 0 ||
    lon2 <= 0
  ) {
    return Infinity;
  }
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function calculateDistanceKmRounded(
  lat1: number,
  lon1: number,
  lat2?: number,
  lon2?: number
): number | null {
  if (typeof lat2 !== 'number' || typeof lon2 !== 'number') return null;
  const meters = calculateDistanceMeters(lat1, lon1, lat2, lon2);
  if (!Number.isFinite(meters)) return null;
  return Number((meters / 1000).toFixed(1));
}

export function formatDistanceKmLabel(distanceKm: number | null | undefined, fallback = '0.5 km'): string {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm) || distanceKm < 0) {
    return fallback;
  }
  if (distanceKm < 0.1) return '0.1 km';
  return `${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km`;
}

export const MAX_NEARBY_RADIUS_METERS = 5000;
export const LAST_KNOWN_GPS_STORAGE_KEY = 'kft_last_known_user_gps_v1';

export const RADIUS_OPTIONS: { value: number; labelKh: string; labelEn: string; labelZh: string }[] = [
  { value: 5000, labelKh: '៥ គ.ម (5km)', labelEn: '5 km', labelZh: '5 公里' },
  { value: 10000, labelKh: '១០ គ.ម (10km)', labelEn: '10 km', labelZh: '10 公里' },
  { value: 20000, labelKh: '២០ គ.ម (20km)', labelEn: '20 km', labelZh: '20 公里' },
];

// All 25 Cambodian Provinces & Capital City center coordinates
export const PROVINCE_CENTERS: Record<string, { lat: number; lng: number }> = {
  'រាជធានីភ្នំពេញ': { lat: 11.5564, lng: 104.9282 },
  'ខេត្តសៀមរាប': { lat: 13.3633, lng: 103.8564 },
  'ខេត្តបាត់ដំបង': { lat: 13.0957, lng: 103.2022 },
  'ខេត្តកំពត': { lat: 10.6104, lng: 104.1815 },
  'ខេត្តកែប': { lat: 10.4833, lng: 104.3167 },
  'ខេត្តព្រះសីហនុ': { lat: 10.6275, lng: 103.5221 },
  'ខេត្តកំពង់ចាម': { lat: 11.9934, lng: 105.4635 },
  'ខេត្តមណ្ឌលគិរី': { lat: 12.4558, lng: 107.1881 },
  'ខេត្តរតនគិរី': { lat: 13.7394, lng: 106.9873 },
  'ខេត្តកោះកុង': { lat: 11.6153, lng: 102.9838 },
  'ខេត្តកណ្តាល': { lat: 11.4833, lng: 104.9500 },
  'ខេត្តកំពង់ឆ្នាំង': { lat: 12.2500, lng: 104.6667 },
  'ខេត្តកំពង់ស្ពឺ': { lat: 11.4533, lng: 104.5208 },
  'ខេត្តកំពង់ធំ': { lat: 12.7111, lng: 104.8887 },
  'ខេត្តក្រចេះ': { lat: 12.4881, lng: 106.0188 },
  'ខេត្តតាកែវ': { lat: 10.9908, lng: 104.7850 },
  'ខេត្តព្រៃវែង': { lat: 11.4868, lng: 105.3253 },
  'ខេត្តស្វាយរៀង': { lat: 11.0879, lng: 105.7993 },
  'ខេត្តពោធិ៍សាត់': { lat: 12.5388, lng: 103.9192 },
  'ខេត្តបន្ទាយមានជ័យ': { lat: 13.5859, lng: 102.9737 },
  'ខេត្តប៉ៃលិន': { lat: 12.8489, lng: 102.6093 },
  'ខេត្តឧត្តរមានជ័យ': { lat: 14.1818, lng: 103.5176 },
  'ខេត្តព្រះវិហារ': { lat: 13.8073, lng: 104.9805 },
  'ខេត្តស្ទឹងត្រែង': { lat: 13.5259, lng: 105.9683 },
  'ខេត្តត្បូងឃ្មុំ': { lat: 11.8891, lng: 105.6540 },
};

export function isValidCambodiaGps(lat?: number, lng?: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 9.5 &&
    lat <= 15.0 &&
    lng >= 102.0 &&
    lng <= 108.0
  );
}

export function readSavedUserGps(): { lat: number; lng: number } | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(LAST_KNOWN_GPS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const lat = Number(parsed?.lat);
    const lng = Number(parsed?.lng);
    if (isValidCambodiaGps(lat, lng)) {
      return { lat, lng };
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export const readCachedUserGps = readSavedUserGps;
export const calculateDistanceKm = calculateDistanceKmRounded;

/**
 * Resolves the active user GPS coordinates from explicit parameters or cached localStorage GPS.
 * Returns null if no valid Cambodia GPS coordinate is available.
 */
export function resolveGlobalUserGpsCoords(
  explicitCoords?: { lat?: number | null; lng?: number | null } | null
): { lat: number; lng: number } | null {
  if (
    explicitCoords &&
    typeof explicitCoords.lat === 'number' &&
    typeof explicitCoords.lng === 'number' &&
    isValidCambodiaGps(explicitCoords.lat, explicitCoords.lng)
  ) {
    return { lat: explicitCoords.lat, lng: explicitCoords.lng };
  }
  return readSavedUserGps();
}

/**
 * Extracts valid Cambodia GPS coordinates from any shop, restaurant, hotel, tourist attraction, or Google Place record.
 */
export function extractEntityGpsCoords(entity: any): { lat: number; lng: number } | null {
  if (!entity || typeof entity !== 'object') return null;
  const candidate = entity.item && typeof entity.item === 'object' ? entity.item : entity;
  const rawLat = Number(
    candidate.latitude ??
      candidate.lat ??
      candidate.location?.lat ??
      candidate.geometry?.location?.lat
  );
  const rawLng = Number(
    candidate.longitude ??
      candidate.lng ??
      candidate.location?.lng ??
      candidate.geometry?.location?.lng
  );
  if (isValidCambodiaGps(rawLat, rawLng)) {
    return { lat: rawLat, lng: rawLng };
  }
  return null;
}

/**
 * Returns the accurate Haversine distance in meters between the user's GPS location and an entity.
 * Returns Infinity when either the user's GPS or the entity's coordinates are unavailable.
 */
export function getEntityDistanceMeters(
  entity: any,
  userCoords?: { lat?: number | null; lng?: number | null } | null
): number {
  if (!entity || typeof entity !== 'object') return Infinity;
  const gps = resolveGlobalUserGpsCoords(userCoords);
  const entityCoords = extractEntityGpsCoords(entity);
  if (gps && entityCoords) {
    return calculateDistanceMeters(gps.lat, gps.lng, entityCoords.lat, entityCoords.lng);
  }
  const precomputedMeters = Number(entity.distanceMeters ?? entity.distMeters ?? entity.item?.distanceMeters);
  if (Number.isFinite(precomputedMeters) && precomputedMeters >= 0 && precomputedMeters < 9999990) {
    return Math.round(precomputedMeters);
  }
  const precomputedKm = Number(entity.distanceKm ?? entity.item?.distanceKm);
  if (Number.isFinite(precomputedKm) && precomputedKm >= 0 && precomputedKm < 9999) {
    return Math.round(precomputedKm * 1000);
  }
  return Infinity;
}

/**
 * Clearly defined deterministic fallback comparator when GPS is unavailable or when two locations share the exact same distance:
 * 1. Exact product/dish/name match
 * 2. Search relevance score descending
 * 3. Verified / Featured / Recommended status
 * 4. Rating descending
 * 5. Review count descending
 * 6. Name alphabetical
 */
export function compareByFallbackRelevance(a: any, b: any): number {
  const itemA = a?.item && typeof a.item === 'object' ? a.item : a;
  const itemB = b?.item && typeof b.item === 'object' ? b.item : b;

  const exactA = Boolean(a?._isExactProductMatch ?? a?.isExactProductMatch ?? itemA?._isExactProductMatch);
  const exactB = Boolean(b?._isExactProductMatch ?? b?.isExactProductMatch ?? itemB?._isExactProductMatch);
  if (exactA !== exactB) return exactA ? -1 : 1;

  const scoreA = Number(a?._matchScore ?? a?.score ?? itemA?._matchScore ?? itemA?.score ?? 0);
  const scoreB = Number(b?._matchScore ?? b?.score ?? itemB?._matchScore ?? itemB?.score ?? 0);
  if (Number.isFinite(scoreA) && Number.isFinite(scoreB) && scoreA !== scoreB) {
    return scoreB - scoreA;
  }

  const verA = Boolean(itemA?.isVerified || itemA?.isFeatured || itemA?.recommended);
  const verB = Boolean(itemB?.isVerified || itemB?.isFeatured || itemB?.recommended);
  if (verA !== verB) return verA ? -1 : 1;

  const ratingA = Number(itemA?.rating) || 0;
  const ratingB = Number(itemB?.rating) || 0;
  if (ratingA !== ratingB) return ratingB - ratingA;

  const revA = Number(itemA?.reviewCount ?? itemA?.userRatingsTotal) || 0;
  const revB = Number(itemB?.reviewCount ?? itemB?.userRatingsTotal) || 0;
  if (revA !== revB) return revB - revA;

  const nameA = String(itemA?.nameKh || itemA?.nameEn || itemA?.id || '');
  const nameB = String(itemB?.nameKh || itemB?.nameEn || itemB?.id || '');
  return nameA.localeCompare(nameB);
}

/**
 * Global GPS Distance-First Comparator:
 * - Always sorts by actual GPS distance in ascending order (closest to farthest) when GPS coordinates are available.
 * - Locations with valid coordinates always appear before locations without coordinates.
 * - Falls back to customFallback (if provided) and compareByFallbackRelevance when GPS is unavailable or distances are equal.
 */
export function compareByGpsDistanceAscending<T>(
  a: T,
  b: T,
  userCoords?: { lat?: number | null; lng?: number | null } | null,
  customFallback?: (a: T, b: T) => number
): number {
  const distA = getEntityDistanceMeters(a, userCoords);
  const distB = getEntityDistanceMeters(b, userCoords);
  const finA = Number.isFinite(distA);
  const finB = Number.isFinite(distB);

  if (finA && !finB) return -1;
  if (!finA && finB) return 1;
  if (finA && finB && distA !== distB) {
    return distA - distB;
  }

  if (customFallback) {
    const fb = customFallback(a, b);
    if (fb !== 0) return fb;
  }
  return compareByFallbackRelevance(a, b);
}

/**
 * Returns a new array of search/category results sorted nearest-first by actual GPS distance (with deterministic fallback when GPS is unavailable).
 */
export function sortResultsByGpsDistance<T>(
  items: readonly T[],
  userCoords?: { lat?: number | null; lng?: number | null } | null,
  customFallback?: (a: T, b: T) => number
): T[] {
  return [...items].sort((a, b) => compareByGpsDistanceAscending(a, b, userCoords, customFallback));
}

export async function detectUserGpsCoordinate(
  forceHighAccuracy = false
): Promise<{ coord: { lat: number; lng: number } | null; error?: string }> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return { coord: readSavedUserGps(), error: 'Geolocation not supported' };
  }
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (lat?: number, lng?: number, error?: string) => {
      if (resolved) return;
      resolved = true;
      if (typeof lat === 'number' && typeof lng === 'number' && isValidCambodiaGps(lat, lng)) {
        saveUserGps({ lat, lng });
        resolve({ coord: { lat, lng } });
      } else {
        resolve({ coord: readSavedUserGps(), error });
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => finish(pos.coords.latitude, pos.coords.longitude),
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => finish(pos.coords.latitude, pos.coords.longitude),
          (err) => finish(undefined, undefined, err.message),
          { enableHighAccuracy: false, timeout: 3500, maximumAge: 180000 }
        );
      },
      { enableHighAccuracy: forceHighAccuracy, timeout: 4000, maximumAge: forceHighAccuracy ? 0 : 60000 }
    );
  });
}

export function saveUserGps(coords: { lat: number; lng: number }): void {
  if (!isValidCambodiaGps(coords?.lat, coords?.lng)) return;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        LAST_KNOWN_GPS_STORAGE_KEY,
        JSON.stringify({ lat: coords.lat, lng: coords.lng, updatedAt: Date.now() })
      );
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kft:gps-updated', { detail: coords }));
    }
  } catch {
    // ignore storage errors
  }
}

export function detectClosestProvinceFromCoords(coords: { lat: number; lng: number }): string {
  let bestProv = 'រាជធានីភ្នំពេញ';
  let bestDist = Infinity;
  for (const [provName, center] of Object.entries(PROVINCE_CENTERS)) {
    const d = calculateDistanceMeters(coords.lat, coords.lng, center.lat, center.lng);
    if (d < bestDist) {
      bestDist = d;
      bestProv = provName;
    }
  }
  return bestProv;
}

export function normalizeProvinceKeyKh(provRaw?: string): string {
  const clean = (provRaw || '').trim();
  if (!clean || clean === 'ទាំងអស់' || clean.toLowerCase() === 'all') return '';
  if (PROVINCE_CENTERS[clean]) return clean;
  const stripped = clean.replace(/^(ខេត្ត|រាជធានី)/, '').trim();
  for (const key of Object.keys(PROVINCE_CENTERS)) {
    if (key.replace(/^(ខេត្ត|រាជធានី)/, '').trim() === stripped) {
      return key;
    }
  }
  return clean;
}

export function doesPlaceBelongToProvince(
  lat: number,
  lng: number,
  declaredProvinceKh: string | undefined,
  targetProvinceKh: string
): boolean {
  const cleanTarget = (targetProvinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim();
  if (!cleanTarget || cleanTarget === 'ទាំងអស់' || cleanTarget.toLowerCase() === 'all') return true;
  const cleanDeclared = (declaredProvinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim();
  if (cleanDeclared && cleanDeclared !== cleanTarget) {
    return false;
  }
  const closestProv = detectClosestProvinceFromCoords({ lat, lng })
    .replace(/^(ខេត្ត|រាជធានី)/, '')
    .trim();
  if (closestProv !== cleanTarget) {
    const fullTargetKey = normalizeProvinceKeyKh(targetProvinceKh);
    const targetCenter = PROVINCE_CENTERS[fullTargetKey];
    if (!targetCenter) return false;
    const distToProvinceCenter = calculateDistanceMeters(lat, lng, targetCenter.lat, targetCenter.lng);
    if (distToProvinceCenter > 25000) return false;
  }
  return true;
}

export function resolveActiveNearMeCoords(
  baseCoords: { lat: number; lng: number },
  detectedGpsProvince: string,
  manualProvince: string
): { lat: number; lng: number } {
  const normManual = normalizeProvinceKeyKh(manualProvince);
  if (!normManual) return baseCoords;
  if (doesPlaceBelongToProvince(baseCoords.lat, baseCoords.lng, detectedGpsProvince, normManual)) {
    return baseCoords;
  }
  return PROVINCE_CENTERS[normManual] || baseCoords;
}

/**
 * Two-stage GPS location request matching Home Screen NearMeModal.tsx:
 * 1. Immediately resolves saved GPS if available (unless forceRefresh).
 * 2. Requests fresh GPS via navigator.geolocation (high-accuracy -> fast fallback).
 * 3. Validates Cambodia bounds so overseas/desktop IP geolocation smoothly falls back to Cambodia GPS.
 */
export function requestCambodiaGpsLocation(options: {
  forceRefresh?: boolean;
  defaultProvinceKh?: string;
  isCurrentReq: () => boolean;
  onImmediateSaved?: (coords: { lat: number; lng: number }, detectedProvince: string) => void;
  onGranted: (coords: { lat: number; lng: number }, detectedProvince: string) => void;
  onFallback: (coords: { lat: number; lng: number }, detectedProvince: string) => void;
}): void {
  const {
    forceRefresh = false,
    defaultProvinceKh = 'រាជធានីភ្នំពេញ',
    isCurrentReq,
    onImmediateSaved,
    onGranted,
    onFallback,
  } = options;

  const savedGps = readSavedUserGps();
  const normDefaultProv = normalizeProvinceKeyKh(defaultProvinceKh) || 'រាជធានីភ្នំពេញ';
  const defaultCenter = PROVINCE_CENTERS[normDefaultProv] || PROVINCE_CENTERS['រាជធានីភ្នំពេញ'];

  if (savedGps && !forceRefresh && onImmediateSaved) {
    onImmediateSaved(savedGps, detectClosestProvinceFromCoords(savedGps));
  }

  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    const handleSuccess = (position: GeolocationPosition) => {
      if (!isCurrentReq()) return;
      const rawLat = position.coords.latitude;
      const rawLng = position.coords.longitude;
      if (isValidCambodiaGps(rawLat, rawLng)) {
        const nextCoords = { lat: rawLat, lng: rawLng };
        saveUserGps(nextCoords);
        onGranted(nextCoords, detectClosestProvinceFromCoords(nextCoords));
      } else {
        const fallback = savedGps || defaultCenter;
        saveUserGps(fallback);
        onFallback(fallback, detectClosestProvinceFromCoords(fallback));
      }
    };

    const handleFinalFallback = () => {
      if (!isCurrentReq()) return;
      const fallback = savedGps || defaultCenter;
      saveUserGps(fallback);
      onFallback(fallback, detectClosestProvinceFromCoords(fallback));
    };

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      () => {
        if (!isCurrentReq()) return;
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          handleFinalFallback,
          { enableHighAccuracy: false, timeout: 4000, maximumAge: 180000 }
        );
      },
      { enableHighAccuracy: true, timeout: 4500, maximumAge: forceRefresh ? 0 : 60000 }
    );
  } else {
    const fallback = savedGps || defaultCenter;
    saveUserGps(fallback);
    onFallback(fallback, detectClosestProvinceFromCoords(fallback));
  }
}

/**
 * Category Classifiers to strictly isolate Shop vs Hotel vs Tourism in Near Me
 */
const HOTEL_KEYWORD_REGEX =
  /សណ្ឋាគារ|ផ្ទះសំណាក់|ផ្ទះស្នាក់|បឹងហ្គាឡូ|បឹងកាឡូ|រីសត|វីឡា|ប៊ូទិក|រេស៊ីដង់|រ៉េស៊ីដិន|អាផាតមិន|\b(hotel|hotels|guesthouse|guest\s*house|hostel|motel|homestay|bungalow|lodging|inn|suites?|resort|resorts|villa|villas|boutique|residence|apartment)\b/i;

const FOOD_SHOP_KEYWORD_REGEX =
  /ភោជនីយដ្ឋាន|អាហារដ្ឋាន|ហាងកាហ្វេ|ហាងបាយ|គុយទាវ|មីឆា|នំបញ្ចុក|សាច់អាំង|ស៊ុប|តែគុជ|នំប៉័ង|ម្ហូបបួស|អាហារបួស|អាហារព្រឹក|\b(restaurant|cafe|café|coffee|bakery|bistro|eatery|noodle|noodles|bbq|hotpot|grill|pizza|burger|boba|vegetarian|vegan|breakfast)\b/i;

const TOURISM_ONLY_KEYWORD_REGEX =
  /ប្រាសាទ|វត្ត|ទឹកធ្លាក់|សារមន្ទីរ|ភ្នំ|ឆ្នេរ|កោះ|ឧទ្យានជាតិ|រមណីយដ្ឋាន|\b(temple|pagoda|wat\b|museum|waterfall|national\s*park|monument|palace|sanctuary|beach|island|mountain)\b/i;

export function isHotelGooglePlace(gp: GooglePlaceCachedItem): boolean {
  if (!gp) return false;
  if (gp.subCategorySlug === 'hotel' || gp.subCategorySlug === 'resort') return true;
  const types = (gp.types || []).map((t) => String(t).toLowerCase());
  if (
    types.some((t) =>
      [
        'hotel',
        'lodging',
        'motel',
        'guest_house',
        'guesthouse',
        'hostel',
        'bed_and_breakfast',
        'resort_hotel',
        'resort',
        'extended_stay_hotel',
        'inn',
        'cottage',
        'villa',
      ].includes(t)
    )
  ) {
    return true;
  }
  const text = `${gp.nameKh || ''} ${gp.nameEn || ''} ${gp.primaryTypeDisplayName || ''}`;
  if (HOTEL_KEYWORD_REGEX.test(text) && !FOOD_SHOP_KEYWORD_REGEX.test(text)) {
    return true;
  }
  return false;
}

export function isTourismAttractionGooglePlace(gp: GooglePlaceCachedItem): boolean {
  if (!gp) return false;
  if (isHotelGooglePlace(gp)) return false;
  const text = `${gp.nameKh || ''} ${gp.nameEn || ''}`;
  if (FOOD_SHOP_KEYWORD_REGEX.test(text) && !TOURISM_ONLY_KEYWORD_REGEX.test(text)) {
    return false;
  }
  if (gp.category === 'tourism') return true;
  return TOURISM_ONLY_KEYWORD_REGEX.test(text);
}

export function isFoodShopGooglePlace(gp: GooglePlaceCachedItem): boolean {
  if (!gp) return false;
  if (isHotelGooglePlace(gp)) return false;
  if (gp.category === 'tourism') return false;
  const text = `${gp.nameKh || ''} ${gp.nameEn || ''}`;
  if (TOURISM_ONLY_KEYWORD_REGEX.test(text) && !FOOD_SHOP_KEYWORD_REGEX.test(text)) {
    return false;
  }
  return true;
}

/**
 * 1. Merge & deduplicate verified Food/Drink Shops within radiusMeters, sorted nearest-first.
 * Strictly excludes Hotels and Tourist Attractions.
 */
export function mergeNearbyFoodShops(params: {
  restaurants: Restaurant[];
  liveNearbyRestaurants: GooglePlaceCachedItem[];
  refCoords: { lat: number; lng: number };
  radiusMeters: number;
  targetProvinceKh: string;
}): Array<Restaurant & { distanceMeters: number; distanceKm: number }> {
  const { restaurants, liveNearbyRestaurants, refCoords, radiusMeters, targetProvinceKh } = params;
  const mergedMap = new Map<string, Restaurant>();
  const seenNameKeys = new Set<string>();

  const registerNameKey = (r: Restaurant) => {
    const key = `${normalizeKhmerSearchText(r.nameKh || r.nameEn || '')}::${(r.provinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim()}`;
    if (key.length > 3) seenNameKeys.add(key);
  };

  for (const r of restaurants) {
    if (!r || isHotelBusinessRecord(r)) continue;
    if (!verifyShopDataForDisplay(r)) continue;
    const dist = calculateDistanceMeters(refCoords.lat, refCoords.lng, r.latitude, r.longitude);
    if (dist > radiusMeters) continue;
    if (!doesPlaceBelongToProvince(r.latitude, r.longitude, r.provinceKh, targetProvinceKh)) continue;
    mergedMap.set(r.id, r);
    registerNameKey(r);
  }

  for (const gp of liveNearbyRestaurants) {
    if (!isFoodShopGooglePlace(gp)) continue;
    const dist = calculateDistanceMeters(refCoords.lat, refCoords.lng, gp.lat, gp.lng);
    if (dist > radiusMeters) continue;
    if (!doesPlaceBelongToProvince(gp.lat, gp.lng, gp.provinceKh || gp.province, targetProvinceKh)) continue;

    const existingMatch = findDuplicateRestaurantForGooglePlace(gp, Array.from(mergedMap.values()));
    if (existingMatch) {
      const merged = mergeGoogleMapsPlaceWithExistingRestaurant(existingMatch, gp);
      if (!isHotelBusinessRecord(merged) && verifyShopDataForDisplay(merged)) {
        mergedMap.set(existingMatch.id, merged);
      }
    } else {
      const converted = convertGooglePlaceToRestaurant(gp);
      if (!isHotelBusinessRecord(converted) && verifyShopDataForDisplay(converted)) {
        const normKey = `${normalizeKhmerSearchText(converted.nameKh || converted.nameEn || '')}::${(converted.provinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim()}`;
        if (normKey.length > 3 && seenNameKeys.has(normKey)) continue;
        mergedMap.set(converted.id, converted);
        if (normKey.length > 3) seenNameKeys.add(normKey);
      }
    }
  }

  return Array.from(mergedMap.values())
    .map((r) => {
      const distanceMeters = calculateDistanceMeters(refCoords.lat, refCoords.lng, r.latitude, r.longitude);
      const distanceKm = Number((distanceMeters / 1000).toFixed(1));
      return { ...r, distanceMeters, distanceKm };
    })
    .filter((r) => Number.isFinite(r.distanceMeters) && r.distanceMeters <= radiusMeters)
    .sort((a, b) => compareByGpsDistanceAscending(a, b, refCoords));
}

/**
 * 2. Merge & deduplicate verified Hotels/Guesthouses/Resorts/Villas within radiusMeters, sorted nearest-first.
 * Strictly excludes Food/Drink Shops and Scenic Tourist Attractions.
 */
export function mergeNearbyHotels(params: {
  allHotels: TouristDestination[];
  liveNearbyAttractions: GooglePlaceCachedItem[];
  liveNearbyRestaurants: GooglePlaceCachedItem[];
  refCoords: { lat: number; lng: number };
  radiusMeters: number;
  targetProvinceKh: string;
}): Array<TouristDestination & { distanceMeters: number; distanceKm: number }> {
  const {
    allHotels,
    liveNearbyAttractions,
    liveNearbyRestaurants,
    refCoords,
    radiusMeters,
    targetProvinceKh,
  } = params;
  const mergedMap = new Map<string, TouristDestination>();
  const seenNameKeys = new Set<string>();

  for (const h of allHotels) {
    if (!h || h.categorySlug !== 'hotel') continue;
    const dist = calculateDistanceMeters(refCoords.lat, refCoords.lng, h.latitude, h.longitude);
    if (dist > radiusMeters) continue;
    if (!doesPlaceBelongToProvince(h.latitude, h.longitude, h.provinceKh, targetProvinceKh)) continue;
    const normKey = `${normalizeKhmerSearchText(h.nameKh || h.nameEn || '')}::${(h.provinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim()}`;
    if (normKey.length > 3 && seenNameKeys.has(normKey)) continue;
    mergedMap.set(h.id, h);
    if (normKey.length > 3) seenNameKeys.add(normKey);
  }

  const hotelCandidates = [...liveNearbyAttractions, ...liveNearbyRestaurants].filter(isHotelGooglePlace);
  for (const gp of hotelCandidates) {
    const dist = calculateDistanceMeters(refCoords.lat, refCoords.lng, gp.lat, gp.lng);
    if (dist > radiusMeters) continue;
    if (!doesPlaceBelongToProvince(gp.lat, gp.lng, gp.provinceKh || gp.province, targetProvinceKh)) continue;

    const existingMatch = findDuplicateDestinationForGooglePlace(gp, Array.from(mergedMap.values()));
    if (!existingMatch) {
      const converted: TouristDestination = {
        ...convertGooglePlaceToDestination({ ...gp, subCategorySlug: 'hotel' }),
        categorySlug: 'hotel',
        categoryKh: 'សណ្ឋាគារ & ផ្ទះសំណាក់',
        categoryEn: 'Hotel & Guesthouse',
      };
      const normKey = `${normalizeKhmerSearchText(converted.nameKh || converted.nameEn || '')}::${(converted.provinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim()}`;
      if (normKey.length > 3 && seenNameKeys.has(normKey)) continue;
      mergedMap.set(converted.id, converted);
      if (normKey.length > 3) seenNameKeys.add(normKey);
    }
  }

  return Array.from(mergedMap.values())
    .map((h) => {
      const distanceMeters = calculateDistanceMeters(refCoords.lat, refCoords.lng, h.latitude, h.longitude);
      const distanceKm = Number((distanceMeters / 1000).toFixed(1));
      return { ...h, distanceMeters, distanceKm };
    })
    .filter((h) => Number.isFinite(h.distanceMeters) && h.distanceMeters <= radiusMeters)
    .sort((a, b) => compareByGpsDistanceAscending(a, b, refCoords));
}

/**
 * 3. Merge & deduplicate verified Scenic Tourist Attractions within radiusMeters, sorted nearest-first.
 * Strictly excludes Hotels and Food/Drink Shops.
 */
export function mergeNearbyTourismDestinations(params: {
  destinations: TouristDestination[];
  liveNearbyAttractions: GooglePlaceCachedItem[];
  refCoords: { lat: number; lng: number };
  radiusMeters: number;
  targetProvinceKh: string;
}): Array<TouristDestination & { distanceMeters: number; distanceKm: number }> {
  const { destinations, liveNearbyAttractions, refCoords, radiusMeters, targetProvinceKh } = params;
  const mergedMap = new Map<string, TouristDestination>();
  const seenNameKeys = new Set<string>();

  for (const d of destinations) {
    if (!d || d.categorySlug === 'hotel') continue;
    if (!isPlaceLocationVerified(d)) continue;
    const dist = calculateDistanceMeters(refCoords.lat, refCoords.lng, d.latitude, d.longitude);
    if (dist > radiusMeters) continue;
    if (!doesPlaceBelongToProvince(d.latitude, d.longitude, d.provinceKh, targetProvinceKh)) continue;
    const normKey = `${normalizeKhmerSearchText(d.nameKh || d.nameEn || '')}::${(d.provinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim()}`;
    if (normKey.length > 3 && seenNameKeys.has(normKey)) continue;
    mergedMap.set(d.id, d);
    if (normKey.length > 3) seenNameKeys.add(normKey);
  }

  for (const gp of liveNearbyAttractions) {
    if (!isTourismAttractionGooglePlace(gp)) continue;
    const dist = calculateDistanceMeters(refCoords.lat, refCoords.lng, gp.lat, gp.lng);
    if (dist > radiusMeters) continue;
    if (!doesPlaceBelongToProvince(gp.lat, gp.lng, gp.provinceKh || gp.province, targetProvinceKh)) continue;

    const existingMatch = findDuplicateDestinationForGooglePlace(gp, Array.from(mergedMap.values()));
    if (!existingMatch) {
      const converted = convertGooglePlaceToDestination(gp);
      if (converted.categorySlug === 'hotel') continue;
      const normKey = `${normalizeKhmerSearchText(converted.nameKh || converted.nameEn || '')}::${(converted.provinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim()}`;
      if (normKey.length > 3 && seenNameKeys.has(normKey)) continue;
      mergedMap.set(converted.id, converted);
      if (normKey.length > 3) seenNameKeys.add(normKey);
    }
  }

  return Array.from(mergedMap.values())
    .map((d) => {
      const distanceMeters = calculateDistanceMeters(refCoords.lat, refCoords.lng, d.latitude, d.longitude);
      const distanceKm = Number((distanceMeters / 1000).toFixed(1));
      return { ...d, distanceMeters, distanceKm };
    })
    .filter((d) => Number.isFinite(d.distanceMeters) && d.distanceMeters <= radiusMeters)
    .sort((a, b) => compareByGpsDistanceAscending(a, b, refCoords));
}

