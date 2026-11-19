import {
  Language,
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
import { classifyShopBusinessKind, verifyShopDataForDisplay, isVegetarianShop } from './foodFilters';
import { isShopExcludedFromSearch } from './excludedShopsRegistry';
import { normalizeKhmerFoodText } from './khmerFoodSearch';
import { getLocalizedRestaurant } from './zhDynamicTranslator';

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

let inMemorySavedGpsCache: { coords: { lat: number; lng: number } | null; readAt: number } | null = null;

export interface DetailedSavedGps {
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  isRealGps: boolean;
  updatedAt: number;
}

export function isHardcodedDefaultFallbackCoord(lat: number, lng: number): boolean {
  return (
    Math.abs(lat - 11.5564) < 0.00005 &&
    (Math.abs(lng - 104.9282) < 0.00005 || Math.abs(lng - 104.9182) < 0.00005)
  );
}

export function readSavedUserGpsDetailed(): DetailedSavedGps | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(LAST_KNOWN_GPS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const lat = Number(parsed?.lat);
    const lng = Number(parsed?.lng);
    if (!isValidCambodiaGps(lat, lng)) return null;
    if (parsed?.isRealGps === false) return null;
    if (parsed?.isRealGps !== true && isHardcodedDefaultFallbackCoord(lat, lng)) {
      return null;
    }
    return {
      lat,
      lng,
      accuracy: typeof parsed?.accuracy === 'number' && Number.isFinite(parsed.accuracy) ? parsed.accuracy : null,
      heading: typeof parsed?.heading === 'number' && Number.isFinite(parsed.heading) ? parsed.heading : null,
      speed: typeof parsed?.speed === 'number' && Number.isFinite(parsed.speed) ? parsed.speed : null,
      isRealGps: true,
      updatedAt: Number(parsed?.updatedAt || Date.now()),
    };
  } catch {
    return null;
  }
}

export function readSavedUserGps(): { lat: number; lng: number } | null {
  const now = Date.now();
  if (inMemorySavedGpsCache && now - inMemorySavedGpsCache.readAt < 5_000) {
    return inMemorySavedGpsCache.coords;
  }
  const detailed = readSavedUserGpsDetailed();
  if (detailed) {
    const coords = { lat: detailed.lat, lng: detailed.lng };
    inMemorySavedGpsCache = { coords, readAt: now };
    return coords;
  }
  inMemorySavedGpsCache = { coords: null, readAt: now };
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
    const finish = (pos?: GeolocationPosition, error?: string) => {
      if (resolved) return;
      resolved = true;
      const lat = pos?.coords?.latitude;
      const lng = pos?.coords?.longitude;
      if (typeof lat === 'number' && typeof lng === 'number' && isValidCambodiaGps(lat, lng)) {
        saveUserGps({
          lat,
          lng,
          accuracy: pos?.coords?.accuracy,
          heading: pos?.coords?.heading,
          speed: pos?.coords?.speed,
          isRealGps: true,
        });
        resolve({ coord: { lat, lng } });
      } else {
        resolve({ coord: readSavedUserGps(), error });
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => finish(pos),
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => finish(pos),
          (err) => finish(undefined, err.message),
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 120000 }
        );
      },
      { enableHighAccuracy: forceHighAccuracy, timeout: 8000, maximumAge: forceHighAccuracy ? 0 : 45000 }
    );
  });
}

export function saveUserGps(coords: {
  lat: number;
  lng: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  isRealGps?: boolean;
}): void {
  if (!isValidCambodiaGps(coords?.lat, coords?.lng)) return;
  try {
    const now = Date.now();
    const payload = {
      lat: coords.lat,
      lng: coords.lng,
      accuracy: typeof coords.accuracy === 'number' && Number.isFinite(coords.accuracy) ? Math.round(coords.accuracy) : null,
      heading: typeof coords.heading === 'number' && Number.isFinite(coords.heading) ? coords.heading : null,
      speed: typeof coords.speed === 'number' && Number.isFinite(coords.speed) ? coords.speed : null,
      isRealGps: coords.isRealGps !== false,
      updatedAt: now,
    };
    const prevCoords = inMemorySavedGpsCache?.coords;
    const movedMeters = prevCoords
      ? calculateDistanceMeters(prevCoords.lat, prevCoords.lng, coords.lat, coords.lng)
      : Infinity;
    if (typeof localStorage !== 'undefined') {
      inMemorySavedGpsCache = { coords: { lat: coords.lat, lng: coords.lng }, readAt: now };
      if (movedMeters >= 10) {
        localStorage.setItem(LAST_KNOWN_GPS_STORAGE_KEY, JSON.stringify(payload));
        localStorage.setItem('kft_offline_map_last_gps', JSON.stringify(payload));
      }
    }
    if (typeof window !== 'undefined' && movedMeters >= 15) {
      window.dispatchEvent(new CustomEvent('kft:gps-updated', { detail: payload }));
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

  // Thermal & battery guard: if saved GPS was updated within the last 2 minutes and forceRefresh is false,
  // skip waking up the hardware GNSS/GPS radio again.
  if (savedGps && !forceRefresh) {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_KNOWN_GPS_STORAGE_KEY) : null;
      const parsed = raw ? JSON.parse(raw) : null;
      const updatedAt = Number(parsed?.updatedAt || 0);
      if (updatedAt > 0 && Date.now() - updatedAt < 120_000) {
        onGranted(savedGps, detectClosestProvinceFromCoords(savedGps));
        return;
      }
    } catch {
      // ignore storage read errors
    }
  }

  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    const handleSuccess = (position: GeolocationPosition) => {
      if (!isCurrentReq()) return;
      const rawLat = position.coords.latitude;
      const rawLng = position.coords.longitude;
      if (isValidCambodiaGps(rawLat, rawLng)) {
        const nextCoords = { lat: rawLat, lng: rawLng };
        saveUserGps({
          lat: rawLat,
          lng: rawLng,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
          isRealGps: true,
        });
        onGranted(nextCoords, detectClosestProvinceFromCoords(nextCoords));
      } else {
        const fallback = savedGps || defaultCenter;
        onFallback(fallback, detectClosestProvinceFromCoords(fallback));
      }
    };

    const handleFinalFallback = () => {
      if (!isCurrentReq()) return;
      const fallback = savedGps || defaultCenter;
      onFallback(fallback, detectClosestProvinceFromCoords(fallback));
    };

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      () => {
        if (!isCurrentReq()) return;
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          handleFinalFallback,
          { enableHighAccuracy: false, timeout: 7000, maximumAge: 180000 }
        );
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: forceRefresh ? 0 : 60000 }
    );
  } else {
    const fallback = savedGps || defaultCenter;
    onFallback(fallback, detectClosestProvinceFromCoords(fallback));
  }
}

/**
 * Category Classifiers to strictly isolate Shop vs Hotel vs Tourism in Near Me
 */
const HOTEL_KEYWORD_REGEX =
  /សណ្ឋាគារ|ផ្ទះសំណាក់|ផ្ទះស្នាក់|បឹងហ្គាឡូ|បឹងកាឡូ|រីសត|អេកូរីសត|អេកូឡច|វីឡា|ប៊ូទិក|រេស៊ីដង់|រ៉េស៊ីដិន|អាផាតមិន|ស្វីត|ភូមិគ្រឹះ|ហូមស្ទេ|ហូស្តេល|ឡច|\b(hotel|hotels|guesthouse|guest\s*house|hostel|motel|homestay|home\s*stay|bungalow|bungalows|lodge|lodging|inn|suites?|resort|resorts|eco-resort|eco-lodge|villa|villas|boutique|residence|residences|apartment|apartments|retreat|glamping)\b/i;

const FOOD_SHOP_KEYWORD_REGEX =
  /ភោជនីយដ្ឋាន|អាហារដ្ឋាន|ហាងអាហារ|ហាងកាហ្វេ|កាហ្វេ|ហាងបាយ|បាយ|ម្ហូប|សម្ល|អាម៉ុក|ឡុកឡាក់|គុយទាវ|(?<!\u17D2)មី(?:ស៊ុប|គោក|ឆា|ហឹរ|ហិរ|ទាញ|កូឡា|សួរ|សួ|គាវ|ទា|សាច់|គ្រឿង|ប៉ាតេ|ប្រហិត|ពង|លាក់ខ្លួន|ជាតិ)|នំបញ្ចុក|លតឆា|បបរ|សាច់អាំង|ស៊ុប|គ្រឿងសមុទ្រ|ប៊ូហ្វេ|ឆ្នាំងភ្លើង|តែគុជ|ហាងតែ|ភេសជ្ជៈ|នំប៉័ង|នំខេក|ការ៉េម|បង្អែម|ភីហ្សា|ម្ហូបបួស|អាហារបួស|អាហារព្រឹក|ហាងផឹកស៊ី|ស្រាបៀរ|ខារ៉ាអូខេ|\b(restaurant|cafe|café|coffee|cofe|coffe|kopi|roastery|espresso|latte|matcha|bakery|bistro|eatery|diner|noodle|noodles|kuy\s*teav|pho|ramen|udon|bbq|hotpot|grill|seafood|buffet|steak|steakhouse|sushi|dim\s*sum|pizza|burger|burrito|tacos|boba|milk\s*tea|tea\s*house|smoothie|juice|ice\s*cream|dessert|vegetarian|vegan|breakfast|pub|bar|beer|brewery|karaoke|ktv|nightclub|night\s*club|lounge)\b|酒吧|夜店|啤酒/i;

const TOURISM_ONLY_KEYWORD_REGEX =
  /ប្រាសាទ|វត្ត|ទឹកធ្លាក់|សារមន្ទីរ|ភ្នំ(?!ពេញ)|ឆ្នេរ|កោះ|ឧទ្យានជាតិ|រមណីយដ្ឋាន|ពហុកីឡដ្ឋាន|កីឡដ្ឋាន|សួនសត្វ|សួនទឹក|សួនកម្សាន្ត|វិមានឯករាជ្យ|ព្រះបរមរាជវាំង|ស្តូប|រូបសំណាក|ផ្សារធំថ្មី|ផ្សារទួលទំពូង|ផ្សាររាត្រី|ផ្លូវថ្មើរជើង|មជ្ឈមណ្ឌលប្រល័យពូជសាសន៍|ទួលស្លែង|ជើងឯក|\b(temple|pagoda|wat\b|museum|waterfall|national\s*park|monument|palace|sanctuary|beach|island|mountain|stadium|zoo|safari\s*world|genocide|memorial\s*statue|walk\s*street|promenade|tourist\s*attraction|amusement\s*park|water\s*park|botanical\s*garden|heritage)\b/i;

const STRICT_NON_HOTEL_ATTRACTION_REGEX =
  /ពហុកីឡដ្ឋាន|កីឡដ្ឋាន|សារមន្ទីរ|ប្រាសាទ|វត្ត|សួនសត្វ|វិមានឯករាជ្យ|ស្តូប|រូបសំណាក|ផ្សារធំថ្មី|ផ្សារទួលទំពូង|ផ្សាររាត្រី|ផ្លូវថ្មើរជើង|មជ្ឈមណ្ឌលប្រល័យពូជសាសន៍|ទួលស្លែង|ជើងឯក|សួនមាត់ទន្លេ|វិថីមាត់ទន្លេ|កោះពេជ្រ\s*ទីក្រុងរណប|ឧទ្យានជាតិ|ក្លឹបហាត់ប្រាណ|សាលាគុន|\b(stadium|museum|pagoda|wat\b|zoo|safari\s*world|monument|memorial\s*statue|genocide|central\s*market|russian\s*market|night\s*market|walk\s*street|promenade|national\s*park|martial\s*arts|boxing\s*gym|fitness\s*gym|crossfit)\b/i;

export function inferHotelCategoryLabels(text: string): { categoryKh: string; categoryEn: string } {
  const lower = String(text || '').toLowerCase();
  if (
    /ផ្ទះសំណាក់|ផ្ទះស្នាក់|បឹងហ្គាឡូ|បឹងកាឡូ|ហូមស្ទេ|ហូស្តេល|\b(guesthouse|guest\s*house|homestay|home\s*stay|hostel|motel|bungalow|bungalows)\b/i.test(
      lower
    ) &&
    !/សណ្ឋាគារ|រីសត|វីឡា|ប៊ូទិក|រេស៊ីដង់|រ៉េស៊ីដិន|អាផាតមិន|ស្វីត|\b(hotel|hotels|resort|resorts|villa|villas|boutique|residence|residences|apartment|apartments|suite|suites)\b/i.test(
      lower
    )
  ) {
    return { categoryKh: 'ផ្ទះសំណាក់ & បឹងហ្គាឡូ', categoryEn: 'Guesthouse & Bungalow' };
  }
  if (/រីសត|អេកូរីសត|អេកូឡច|\b(resort|resorts|eco-resort|eco\s*resort|eco-lodge|eco\s*lodge|retreat|glamping)\b/i.test(lower)) {
    return { categoryKh: 'សណ្ឋាគារ & រីសត', categoryEn: 'Hotel & Resort' };
  }
  if (/វីឡា|ប៊ូទិក|រេស៊ីដង់|រ៉េស៊ីដិន|អាផាតមិន|ស្វីត|\b(villa|villas|boutique|suite|suites|residence|residences|apartment|apartments)\b/i.test(lower)) {
    return { categoryKh: 'វីឡា & ប៊ូទិក', categoryEn: 'Boutique & Villa' };
  }
  return { categoryKh: 'សណ្ឋាគារ & កន្លែងស្នាក់នៅ', categoryEn: 'Hotel & Stay' };
}

export function isStrictHotelDestination(d: Partial<TouristDestination> | null | undefined): boolean {
  if (!d || d.categorySlug !== 'hotel') return false;
  const rawId = String(d.id || '').trim();
  // Reject any seed tourism destination ID (e.g. dest-145, gmap-dest-dest-145, gmap-seed-dest-dest-145, rac-k01006, gmap-kandal-kbal-koh-ecotourism)
  if (
    /^(?:gmap-(?:seed-)?dest-(?!hotel-)|(?:dest|kft-site|rac)-[a-z0-9_-]+|gmap-kandal-kbal-koh-ecotourism)/i.test(rawId) &&
    !/^(?:dest-)?hotel-\d+$/i.test(rawId)
  ) {
    return false;
  }
  const nameText = `${d.nameKh || ''} ${d.nameEn || ''}`;
  const catText = `${d.categoryKh || ''} ${d.categoryEn || ''}`;
  if (/\b(martial\s*arts|boxing\s*gym|fitness\s*gym|crossfit)\b|ក្លឹបហាត់ប្រាណ|សាលាគុន|ពហុកីឡដ្ឋាន|កីឡដ្ឋាន|\bstadium\b/i.test(nameText)) {
    return false;
  }
  if (STRICT_NON_HOTEL_ATTRACTION_REGEX.test(nameText) && !HOTEL_KEYWORD_REGEX.test(nameText)) {
    return false;
  }
  if (
    /^\s*រមណីយដ្ឋាន/.test(d.nameKh || '') &&
    !/សណ្ឋាគារ|ផ្ទះសំណាក់|ផ្ទះស្នាក់|បឹងហ្គាឡូ|បឹងកាឡូ|រីសត|វីឡា|ប៊ូទិក|រេស៊ីដង់|រ៉េស៊ីដិន|អាផាតមិន|ហូមស្ទេ|ហូស្តេល/.test(
      d.nameKh || ''
    )
  ) {
    return false;
  }
  if (!HOTEL_KEYWORD_REGEX.test(nameText)) {
    if (TOURISM_ONLY_KEYWORD_REGEX.test(nameText) || FOOD_SHOP_KEYWORD_REGEX.test(nameText)) {
      return false;
    }
    if (!HOTEL_KEYWORD_REGEX.test(catText)) {
      return false;
    }
  }
  return true;
}

export function isHotelGooglePlace(gp: GooglePlaceCachedItem): boolean {
  if (!gp) return false;
  const pid = String(gp.placeId || gp.googlePlaceId || '').trim();
  // Never classify a seed tourism attraction (dest-*, rac-*, gmap-dest-*, gmap-seed-dest-*) as a hotel
  if (
    /^(?:gmap-(?:seed-)?dest-(?!hotel-)|(?:dest|kft-site|rac)-[a-z0-9_-]+|gmap-kandal-kbal-koh-ecotourism)/i.test(pid) &&
    !/^(?:gmap-(?:seed-)?dest-)?(?:dest-)?hotel-\d+$/i.test(pid)
  ) {
    return false;
  }
  const nameText = `${gp.nameKh || ''} ${gp.nameEn || ''}`;
  const text = `${nameText} ${gp.primaryTypeDisplayName || ''}`;
  if (/\b(martial\s*arts|boxing\s*gym|fitness\s*gym|crossfit)\b|ក្លឹបហាត់ប្រាណ|សាលាគុន|ពហុកីឡដ្ឋាន|កីឡដ្ឋាន|\bstadium\b/i.test(nameText)) {
    return false;
  }
  if (STRICT_NON_HOTEL_ATTRACTION_REGEX.test(nameText) && !HOTEL_KEYWORD_REGEX.test(nameText)) {
    return false;
  }
  if (
    /^\s*រមណីយដ្ឋាន/.test(gp.nameKh || '') &&
    !/សណ្ឋាគារ|ផ្ទះសំណាក់|ផ្ទះស្នាក់|បឹងហ្គាឡូ|បឹងកាឡូ|រីសត|វីឡា|ប៊ូទិក|រេស៊ីដង់|រ៉េស៊ីដិន|អាផាតមិន|ហូមស្ទេ|ហូស្តេល/.test(
      gp.nameKh || ''
    )
  ) {
    return false;
  }
  if (gp.subCategorySlug === 'hotel') return true;
  if (gp.subCategorySlug && gp.subCategorySlug !== 'resort') {
    return false;
  }
  const types = (gp.types || []).map((t) => String(t).toLowerCase());
  const hasStrictLodgingType = types.some((t) =>
    [
      'hotel',
      'lodging',
      'motel',
      'guest_house',
      'guesthouse',
      'hostel',
      'bed_and_breakfast',
      'resort_hotel',
      'extended_stay_hotel',
      'inn',
      'cottage',
      'villa',
    ].includes(t)
  );
  if (hasStrictLodgingType && !FOOD_SHOP_KEYWORD_REGEX.test(nameText)) {
    return true;
  }
  if (HOTEL_KEYWORD_REGEX.test(nameText) && !FOOD_SHOP_KEYWORD_REGEX.test(nameText)) {
    return true;
  }
  if (
    HOTEL_KEYWORD_REGEX.test(text) &&
    !FOOD_SHOP_KEYWORD_REGEX.test(text) &&
    !TOURISM_ONLY_KEYWORD_REGEX.test(nameText)
  ) {
    return true;
  }
  return false;
}

export function isTourismAttractionGooglePlace(gp: GooglePlaceCachedItem): boolean {
  if (!gp) return false;
  if (isHotelGooglePlace(gp)) return false;
  if (gp.category === 'restaurant' || gp.category === 'cafe' || gp.category === 'street_food') {
    return false;
  }
  const cleanText = `${gp.nameKh || ''} ${gp.nameEn || ''}`.replace(
    /រាជធានីភ្នំពេញ|ក្រុងភ្នំពេញ|ភ្នំពេញ|phnom\s*penh/gi,
    ' '
  );
  if (FOOD_SHOP_KEYWORD_REGEX.test(cleanText)) {
    return false;
  }
  const types = (gp.types || []).map((t) => String(t).toLowerCase());
  const hasFoodGoogleType = types.some((t) =>
    [
      'restaurant',
      'cafe',
      'coffee_shop',
      'bakery',
      'bar',
      'meal_takeaway',
      'meal_delivery',
      'food',
      'steak_house',
      'seafood_restaurant',
      'ramen_restaurant',
      'pizza_restaurant',
      'hamburger_restaurant',
      'ice_cream_shop',
    ].includes(t)
  );
  if (hasFoodGoogleType && !STRICT_NON_HOTEL_ATTRACTION_REGEX.test(cleanText)) {
    return false;
  }
  const hasTourismGoogleType = types.some((t) =>
    [
      'tourist_attraction',
      'museum',
      'hindu_temple',
      'buddhist_temple',
      'place_of_worship',
      'historical_landmark',
      'national_park',
      'park',
      'zoo',
      'amusement_park',
      'aquarium',
      'art_gallery',
      'stadium',
      'natural_feature',
    ].includes(t)
  );
  const pid = String(gp.placeId || gp.googlePlaceId || '').trim();
  const isCuratedSeedDest = /^(?:gmap-(?:seed-)?dest-(?!hotel-)|(?:dest|kft-site|rac)-[a-z0-9_-]+)/i.test(pid);
  return isCuratedSeedDest || hasTourismGoogleType || TOURISM_ONLY_KEYWORD_REGEX.test(cleanText);
}

const NON_FOOD_STORE_GOOGLE_TYPES = new Set([
  'car_repair',
  'car_dealer',
  'car_wash',
  'car_rental',
  'auto_parts_store',
  'gas_station',
  'hardware_store',
  'electronics_store',
  'home_goods_store',
  'furniture_store',
  'clothing_store',
  'shoe_store',
  'jewelry_store',
  'hair_care',
  'beauty_salon',
  'laundry',
  'hospital',
  'doctor',
  'dentist',
  'pharmacy',
  'bank',
  'atm',
  'accounting',
  'insurance_agency',
  'real_estate_agency',
  'lawyer',
  'locksmith',
  'plumber',
  'electrician',
  'moving_company',
  'storage',
  'veterinary_care',
]);

export function isFoodShopGooglePlace(gp: GooglePlaceCachedItem): boolean {
  if (!gp) return false;
  if (isShopExcludedFromSearch(gp)) return false;
  if (isHotelGooglePlace(gp)) return false;
  const gpTypes = (gp.types || []).map((t) => String(t || '').toLowerCase());
  const fullMetaText = `${gp.nameKh || ''} ${gp.nameEn || ''} ${gp.primaryTypeDisplayName || ''}`;
  if (
    /\b(?:13\s*club|auto\s*parts?|car\s*parts?|car\s*repair|spare\s*parts?|motor\s*parts?|garage|hardware\s*store)\b|គ្រឿងបន្លាស់|ជួសជុលរថយន្ត|យានដ្ឋាន/i.test(
      fullMetaText
    )
  ) {
    return false;
  }
  if (gpTypes.some((t) => NON_FOOD_STORE_GOOGLE_TYPES.has(t)) && !FOOD_SHOP_KEYWORD_REGEX.test(fullMetaText)) {
    return false;
  }
  const cleanText = `${gp.nameKh || ''} ${gp.nameEn || ''}`.replace(
    /រាជធានីភ្នំពេញ|ក្រុងភ្នំពេញ|ភ្នំពេញ|phnom\s*penh/gi,
    ' '
  );
  if (STRICT_NON_HOTEL_ATTRACTION_REGEX.test(cleanText) && !FOOD_SHOP_KEYWORD_REGEX.test(cleanText)) {
    return false;
  }
  if (gp.category === 'tourism') {
    return FOOD_SHOP_KEYWORD_REGEX.test(cleanText) && !TOURISM_ONLY_KEYWORD_REGEX.test(cleanText);
  }
  if (TOURISM_ONLY_KEYWORD_REGEX.test(cleanText) && !FOOD_SHOP_KEYWORD_REGEX.test(cleanText)) {
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
  const mergedList: Restaurant[] = [];
  const mergedIdxById = new Map<string, number>();
  const seenNameKeys = new Set<string>();

  const setMergedRestaurant = (id: string, r: Restaurant) => {
    mergedMap.set(id, r);
    const prevIdx = mergedIdxById.get(id);
    if (prevIdx !== undefined) {
      mergedList[prevIdx] = r;
    } else {
      mergedIdxById.set(id, mergedList.length);
      mergedList.push(r);
    }
  };

  const registerNameKey = (r: Restaurant) => {
    const key = `${normalizeKhmerSearchText(r.nameKh || r.nameEn || '')}::${(r.provinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim()}`;
    if (key.length > 3) seenNameKeys.add(key);
  };

  for (const r of restaurants) {
    if (!r || isHotelBusinessRecord(r) || isShopExcludedFromSearch(r)) continue;
    if (!verifyShopDataForDisplay(r)) continue;
    const dist = calculateDistanceMeters(refCoords.lat, refCoords.lng, r.latitude, r.longitude);
    if (dist > radiusMeters) continue;
    if (!doesPlaceBelongToProvince(r.latitude, r.longitude, r.provinceKh, targetProvinceKh)) continue;
    setMergedRestaurant(r.id, r);
    registerNameKey(r);
  }

  for (const gp of liveNearbyRestaurants) {
    if (!isFoodShopGooglePlace(gp) || isShopExcludedFromSearch(gp)) continue;
    const dist = calculateDistanceMeters(refCoords.lat, refCoords.lng, gp.lat, gp.lng);
    if (dist > radiusMeters) continue;
    if (!doesPlaceBelongToProvince(gp.lat, gp.lng, gp.provinceKh || gp.province, targetProvinceKh)) continue;

    const existingMatch = findDuplicateRestaurantForGooglePlace(gp, mergedList);
    if (existingMatch) {
      const merged = mergeGoogleMapsPlaceWithExistingRestaurant(existingMatch, gp);
      if (!isHotelBusinessRecord(merged) && verifyShopDataForDisplay(merged)) {
        setMergedRestaurant(existingMatch.id, merged);
      }
    } else {
      const converted = convertGooglePlaceToRestaurant(gp);
      if (!isHotelBusinessRecord(converted) && verifyShopDataForDisplay(converted)) {
        const normKey = `${normalizeKhmerSearchText(converted.nameKh || converted.nameEn || '')}::${(converted.provinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim()}`;
        if (normKey.length > 3 && seenNameKeys.has(normKey)) continue;
        setMergedRestaurant(converted.id, converted);
        if (normKey.length > 3) seenNameKeys.add(normKey);
      }
    }
  }

  return mergedList
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
  const mergedList: TouristDestination[] = [];
  const seenNameKeys = new Set<string>();

  for (const h of allHotels) {
    if (!isStrictHotelDestination(h)) continue;
    const dist = calculateDistanceMeters(refCoords.lat, refCoords.lng, h.latitude, h.longitude);
    if (dist > radiusMeters) continue;
    if (!doesPlaceBelongToProvince(h.latitude, h.longitude, h.provinceKh, targetProvinceKh)) continue;
    const normKey = `${normalizeKhmerSearchText(h.nameKh || h.nameEn || '')}::${(h.provinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim()}`;
    if (normKey.length > 3 && seenNameKeys.has(normKey)) continue;
    if (!mergedMap.has(h.id)) mergedList.push(h);
    mergedMap.set(h.id, h);
    if (normKey.length > 3) seenNameKeys.add(normKey);
  }

  const hotelCandidates = [...liveNearbyAttractions, ...liveNearbyRestaurants].filter(isHotelGooglePlace);
  for (const gp of hotelCandidates) {
    const dist = calculateDistanceMeters(refCoords.lat, refCoords.lng, gp.lat, gp.lng);
    if (dist > radiusMeters) continue;
    if (!doesPlaceBelongToProvince(gp.lat, gp.lng, gp.provinceKh || gp.province, targetProvinceKh)) continue;

    const existingMatch = findDuplicateDestinationForGooglePlace(gp, mergedList);
    if (!existingMatch) {
      const inferredLabels = inferHotelCategoryLabels(`${gp.nameKh || ''} ${gp.nameEn || ''} ${gp.primaryTypeDisplayName || ''}`);
      const converted: TouristDestination = {
        ...convertGooglePlaceToDestination({ ...gp, subCategorySlug: 'hotel' }),
        categorySlug: 'hotel',
        categoryKh: inferredLabels.categoryKh,
        categoryEn: inferredLabels.categoryEn,
      };
      if (!isStrictHotelDestination(converted)) continue;
      const normKey = `${normalizeKhmerSearchText(converted.nameKh || converted.nameEn || '')}::${(converted.provinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim()}`;
      if (normKey.length > 3 && seenNameKeys.has(normKey)) continue;
      if (!mergedMap.has(converted.id)) mergedList.push(converted);
      mergedMap.set(converted.id, converted);
      if (normKey.length > 3) seenNameKeys.add(normKey);
    }
  }

  return mergedList
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
  const mergedList: TouristDestination[] = [];
  const seenNameKeys = new Set<string>();

  for (const d of destinations) {
    if (!d || d.categorySlug === 'hotel') continue;
    if (!isPlaceLocationVerified(d)) continue;
    const dist = calculateDistanceMeters(refCoords.lat, refCoords.lng, d.latitude, d.longitude);
    if (dist > radiusMeters) continue;
    if (!doesPlaceBelongToProvince(d.latitude, d.longitude, d.provinceKh, targetProvinceKh)) continue;
    const normKey = `${normalizeKhmerSearchText(d.nameKh || d.nameEn || '')}::${(d.provinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim()}`;
    if (normKey.length > 3 && seenNameKeys.has(normKey)) continue;
    if (!mergedMap.has(d.id)) mergedList.push(d);
    mergedMap.set(d.id, d);
    if (normKey.length > 3) seenNameKeys.add(normKey);
  }

  for (const gp of liveNearbyAttractions) {
    if (!isTourismAttractionGooglePlace(gp)) continue;
    const dist = calculateDistanceMeters(refCoords.lat, refCoords.lng, gp.lat, gp.lng);
    if (dist > radiusMeters) continue;
    if (!doesPlaceBelongToProvince(gp.lat, gp.lng, gp.provinceKh || gp.province, targetProvinceKh)) continue;

    const existingMatch = findDuplicateDestinationForGooglePlace(gp, mergedList);
    if (!existingMatch) {
      const converted = convertGooglePlaceToDestination(gp);
      if (converted.categorySlug === 'hotel') continue;
      const normKey = `${normalizeKhmerSearchText(converted.nameKh || converted.nameEn || '')}::${(converted.provinceKh || '').replace(/^(ខេត្ត|រាជធានី)/, '').trim()}`;
      if (normKey.length > 3 && seenNameKeys.has(normKey)) continue;
      if (!mergedMap.has(converted.id)) mergedList.push(converted);
      mergedMap.set(converted.id, converted);
      if (normKey.length > 3) seenNameKeys.add(normKey);
    }
  }

  return mergedList
    .map((d) => {
      const distanceMeters = calculateDistanceMeters(refCoords.lat, refCoords.lng, d.latitude, d.longitude);
      const distanceKm = Number((distanceMeters / 1000).toFixed(1));
      return { ...d, distanceMeters, distanceKm };
    })
    .filter((d) => Number.isFinite(d.distanceMeters) && d.distanceMeters <= radiusMeters)
    .sort((a, b) => compareByGpsDistanceAscending(a, b, refCoords));
}

// ============================================================================
// Centralized 6-Category Button Classifier & Localized Dish Badge Selector
// ============================================================================

const NOODLE_CATEGORY_REGEX =
  /គុយទាវ|(?<!\u17D2)មី(?:ស៊ុប|គោក|ឆា|ហឹរ|ហិរ|ទាញ|កូឡា|សួរ|សួ|គាវ|ទា|សាច់|គ្រឿង|ប៉ាតេ|ប្រហិត|ពង|លាក់ខ្លួន|ជាតិ|ខ្លាឃ្មុំ)|(?<![ក-អ\u17B6-\u17D2])មី(?=\s|$|[&,/()])|បុកមី|ហាងមី|នំបញ្ចុក|លតឆា|បាញ់កាញ់|ហ្វឺ|គាវ|បបរ|\b(?:noodle|noodles|kuy\s*teav|kuyteav|pho|ramen|udon|vermicelli|wonton|dumpling|dumplings)\b|粿条|米粉|面条|拉面|汤面|炒面|粉面|云吞|饺子/i;

const RICE_KHMER_CATEGORY_REGEX =
  /បាយ|ម្ហូបខ្មែរ|អាហារខ្មែរ|ម្ហូបបួស|អាហារបួស|សម្ល|អាម៉ុក|ឡុកឡាក់|ប្រហុក|កកូរ|ម្ជូរ|ឆាក្តៅ|ត្រីចៀន|ត្រីអាំង|មាន់ដុត|ទាខ្វៃ|បាញ់ឆែវ|ណែម|ភោជនីយដ្ឋានខ្មែរ|ហាងបាយ|\b(?:khmer|cambodian|rice(?!\s*(?:noodles?|vermicelli|paper|flour|cake|wine))|amok|lok\s*lak|prahok|curry)\b|柬式|高棉|柬埔寨菜|米饭|炒饭|猪脚饭|鸡饭|阿莫克|禄拉克/i;

const COFFEE_DRINK_CATEGORY_REGEX =
  /កាហ្វេ|តែគុជ|តែបៃតង|តែក្រូចឆ្មា|តែទឹកដោះគោ|តែផ្លែឈើ|តែត្រជាក់|តែក្ដៅ|ហាងតែ|ភេសជ្ជៈ|ទឹកផ្លែឈើ|ទឹកក្រឡុក|ទឹកអំពៅ|ការ៉េម|នំប៉័ង|នំខេក|នំដុត|\b(?:coffee|cafe|café|cofe|coffe|kopi|espresso|latte|cappuccino|americano|mocha|macchiato|matcha|roastery|tea|boba|bubble\s*tea|milk\s*tea|smoothie|juice|bakery|pastry|croissant|cake|ice\s*cream|gelato|chagee|koi\s*th[eé]|gong\s*cha|the\s*alley|mixue|starbucks)\b|咖啡|奶茶|茶饮|果茶|冰沙|果汁|烘焙|面包|蛋糕|冰淇淋|甜品/i;

const BBQ_SEAFOOD_CATEGORY_REGEX =
  /សាច់អាំង|សាច់គោអាំង|គ្រឿងសមុទ្រ|ស៊ុបឆ្នាំងដី|ស៊ុបឆ្នាំងភ្លើង|ស៊ុបគោ|ស៊ុបម្រះ|ស៊ុបពិសេស|ស៊ុបសាច់គោ|ស៊ុបពពែ|ស៊ុបខួរ|ស៊ុបហឹរ|ឆ្នាំងភ្លើង|ឆ្នាំងដី|ហតផត|ប៊ូហ្វេ|ក្តាម|បង្គា|មឹក|អយស្ទ័រ|ងៀត|ត្រីដុត|បង្កង|\b(?:bbq|barbecue|seafood|grill|grilled|hotpot|hot\s*pot|shabu|sukiyaki|buffet|crab|prawns?|shrimp|squid|oyster|lobster|yakiniku)\b|烧烤|烤肉|海鲜|火锅|自助餐|螃蟹|大虾|鱿鱼/i;

/** Eligibility only (a shop may be eligible for several of these) — see matchesNearMeQuickCategory for the exclusive result. */
function isEligibleForNearMeCategory(r: Restaurant, quickFilterId: string): boolean {
  if (!r) return false;
  if (!quickFilterId || quickFilterId === 'all') return true;

  const shopKind = classifyShopBusinessKind(r);
  const zhLoc = getLocalizedRestaurant(r, 'zh');
  const nameAndCatText = normalizeKhmerFoodText(
    [r.nameKh, r.nameEn, zhLoc?.name, r.categoryKh, r.categoryEn, r.businessCategory]
      .filter(Boolean)
      .join(' ')
  );
  const fullHaystack = normalizeKhmerFoodText(
    [
      r.nameKh,
      r.nameEn,
      zhLoc?.name,
      r.categoryKh,
      r.categoryEn,
      r.businessCategory,
      ...(r.signatureDishesKh || []),
      ...(r.signatureDishesEn || []),
      ...(zhLoc?.signatureDishes || []),
      ...((r.menuItems || []).map((m) => `${m.nameKh || ''} ${m.nameEn || ''}`)),
    ]
      .filter(Boolean)
      .join(' ')
  );

  if (quickFilterId === 'coffee') {
    if (shopKind === 'coffee_drink' || shopKind === 'bakery_bread' || r.businessCategory === 'cafe') {
      return true;
    }
    if (shopKind === 'noodle_soup_restaurant' || shopKind === 'pizza_western') {
      return false;
    }
    // Only include a general restaurant in Coffee & Drinks if its name/category is a cafe/bakery/tea house,
    // or if its primary signature dish is explicitly a coffee/tea/bakery item (preventing Steakhouses or generic restaurants from leaking in).
    if (COFFEE_DRINK_CATEGORY_REGEX.test(nameAndCatText)) {
      return true;
    }
    const primaryDishText = normalizeKhmerFoodText(
      `${(r.signatureDishesKh || [])[0] || ''} ${(r.signatureDishesEn || [])[0] || ''}`
    );
    return (
      COFFEE_DRINK_CATEGORY_REGEX.test(primaryDishText) &&
      !/ភោជនីយដ្ឋាន|អាហារដ្ឋាន|ហាងបាយ|សាច់អាំង|ស៊ុប|គ្រឿងសមុទ្រ|\b(?:steak|steakhouse|bbq|hotpot|seafood|buffet)\b/i.test(
        nameAndCatText
      )
    );
  }

  // Non-coffee categories strictly exclude pure bakeries and pure coffee/drink shops
  if (shopKind === 'bakery_bread' || shopKind === 'coffee_drink' || r.businessCategory === 'cafe') {
    return false;
  }

  if (quickFilterId === 'noodles') {
    if (shopKind === 'pizza_western') return false;
    if (shopKind === 'noodle_soup_restaurant') return true;
    return NOODLE_CATEGORY_REGEX.test(fullHaystack);
  }

  if (quickFilterId === 'rice_khmer') {
    if (shopKind === 'pizza_western') return false;
    if (shopKind === 'noodle_soup_restaurant') {
      return /បាយ|អាម៉ុក|សម្ល|ឡុកឡាក់|ប្រហុក|\b(?:steamed\s*rice|fried\s*rice|pork\s*rice|chicken\s*rice|amok|lok\s*lak)\b/i.test(
        fullHaystack
      );
    }
    const khmerAndEnHaystack = normalizeKhmerFoodText(
      [
        r.nameKh,
        r.nameEn,
        r.categoryKh,
        r.categoryEn,
        ...(r.signatureDishesKh || []),
        ...(r.signatureDishesEn || []),
        ...((r.menuItems || []).map((m) => `${m.nameKh || ''} ${m.nameEn || ''}`)),
      ]
        .filter(Boolean)
        .join(' ')
    );
    if (RICE_KHMER_CATEGORY_REGEX.test(khmerAndEnHaystack)) {
      return true;
    }
    if (
      shopKind === 'khmer_restaurant' &&
      !BBQ_SEAFOOD_CATEGORY_REGEX.test(nameAndCatText) &&
      !NOODLE_CATEGORY_REGEX.test(nameAndCatText) &&
      !COFFEE_DRINK_CATEGORY_REGEX.test(nameAndCatText) &&
      !/\b(?:steak|steakhouse|japanese|ramen|sushi|izakaya|dim\s*sum|indian|french|italian|mexican|korean|western)\b|ជប៉ុន|កូរ៉េ|ឥណ្ឌា|បារាំង|អ៊ីតាលី|ឌីមសាំ|ស្ទេក/i.test(
        nameAndCatText
      )
    ) {
      return true;
    }
    return false;
  }

  if (quickFilterId === 'bbq_seafood') {
    if (shopKind === 'pizza_western') return false;
    if (shopKind === 'noodle_soup_restaurant') {
      return /សាច់អាំង|ស៊ុបឆ្នាំង|ហតផត|ប៊ូហ្វេ|\b(?:bbq|barbecue|hotpot|hot\s*pot|grill|buffet|seafood\s*restaurant)\b/i.test(
        nameAndCatText
      );
    }
    return BBQ_SEAFOOD_CATEGORY_REGEX.test(fullHaystack);
  }

  return true;
}

export type NearMePrimaryCategory = 'vegetarian' | 'coffee' | 'noodles' | 'bbq_seafood' | 'rice_khmer';

const nearMePrimaryCatCache = new WeakMap<
  Restaurant,
  { sig: string; val: NearMePrimaryCategory | null }
>();

/**
 * Assigns every food shop to AT MOST ONE of the 5 specific Near Me categories so the buttons never overlap
 * (only 'all' shows every shop). Priority: vegetarian → café & drinks → name hint (noodles / BBQ) →
 * first signature dish hint → general Khmer rice (default).
 */
export function classifyNearMePrimaryCategory(r: Restaurant): NearMePrimaryCategory | null {
  if (!r) return null;
  const dishesKh = r.signatureDishesKh || [];
  const dishesEn = r.signatureDishesEn || [];
  const sig = `${r.nameKh || ''}|${r.nameEn || ''}|${r.categoryKh || ''}|${r.categoryEn || ''}|${r.businessCategory || ''}|${(r.descriptionKh || '').length}|${dishesKh[0] || ''}|${dishesKh.length}|${dishesEn[0] || ''}|${dishesEn.length}|${(r.menuItems || []).length}`;
  const cached = nearMePrimaryCatCache.get(r);
  if (cached && cached.sig === sig) {
    return cached.val;
  }

  const compute = (): NearMePrimaryCategory | null => {
    if (isVegetarianShop(r)) return 'vegetarian';
    if (isEligibleForNearMeCategory(r, 'coffee')) return 'coffee';

    const eligNoodles = isEligibleForNearMeCategory(r, 'noodles');
    const eligBbq = isEligibleForNearMeCategory(r, 'bbq_seafood');
    const eligRice = isEligibleForNearMeCategory(r, 'rice_khmer');
    if (!eligNoodles && !eligBbq && !eligRice) return null;
    if (eligNoodles && !eligBbq && !eligRice) return 'noodles';
    if (eligBbq && !eligNoodles && !eligRice) return 'bbq_seafood';
    if (eligRice && !eligNoodles && !eligBbq) return 'rice_khmer';

    const nameAndCat = normalizeKhmerFoodText(
      [r.nameKh, r.nameEn, r.categoryKh, r.categoryEn, r.businessCategory].filter(Boolean).join(' ')
    );
    if (eligNoodles && NOODLE_CATEGORY_REGEX.test(nameAndCat)) return 'noodles';
    if (eligBbq && BBQ_SEAFOOD_CATEGORY_REGEX.test(nameAndCat)) return 'bbq_seafood';

    const firstDish = normalizeKhmerFoodText(
      `${(r.signatureDishesKh || [])[0] || ''} ${(r.signatureDishesEn || [])[0] || ''}`
    );
    if (eligNoodles && NOODLE_CATEGORY_REGEX.test(firstDish)) return 'noodles';
    if (eligBbq && BBQ_SEAFOOD_CATEGORY_REGEX.test(firstDish)) return 'bbq_seafood';
    if (eligRice) return 'rice_khmer';
    return eligNoodles ? 'noodles' : 'bbq_seafood';
  };

  const val = compute();
  nearMePrimaryCatCache.set(r, { sig, val });
  return val;
}

/**
 * Near Me category buttons (mutually exclusive except 'all'):
 * - 'all' (ហាងទាំងអស់) · 'rice_khmer' (បាយ & ម្ហូបខ្មែរ) · 'noodles' (គុយទាវ & មី)
 * - 'coffee' (កាហ្វេ & ភេសជ្ជៈ) · 'bbq_seafood' (សាច់អាំង & ស៊ុប) · 'vegetarian' (អាហារបួស)
 */
export function matchesNearMeQuickCategory(r: Restaurant, quickFilterId: string): boolean {
  if (!r) return false;
  if (!quickFilterId || quickFilterId === 'all') return true;
  return classifyNearMePrimaryCategory(r) === quickFilterId;
}

/**
 * Selects up to 2 localized signature/menu dish badges for a restaurant card in Near Me,
 * prioritizing dishes that match the active quick category button and current UI language (km / en / zh).
 */
export function selectLocalizedBadgeDishesForCategory(
  r: Restaurant,
  quickFilterId: string,
  language: Language
): string[] {
  if (!r) return [];
  const loc = getLocalizedRestaurant(r, language);
  const localizedPool =
    Array.isArray(loc?.signatureDishes) && loc.signatureDishes.length > 0
      ? loc.signatureDishes
      : language === 'en' && Array.isArray(r.signatureDishesEn) && r.signatureDishesEn.length > 0
      ? r.signatureDishesEn
      : r.signatureDishesKh || [];

  const khPool = r.signatureDishesKh || [];
  const enPool = r.signatureDishesEn || [];

  let categoryRegex: RegExp | null = null;
  if (quickFilterId === 'noodles') categoryRegex = NOODLE_CATEGORY_REGEX;
  else if (quickFilterId === 'rice_khmer') categoryRegex = RICE_KHMER_CATEGORY_REGEX;
  else if (quickFilterId === 'coffee') categoryRegex = COFFEE_DRINK_CATEGORY_REGEX;
  else if (quickFilterId === 'bbq_seafood') categoryRegex = BBQ_SEAFOOD_CATEGORY_REGEX;
  else if (quickFilterId === 'vegetarian') categoryRegex = /បួស|បន្លែ|តៅហ៊ូ|vegetarian|vegan|veggie|vegetable|tofu|素|蔬|豆腐/i;

  const fallbackBadgeByLang = (): string => {
    if (quickFilterId === 'coffee') {
      return language === 'zh' ? '现萃咖啡与特调饮品' : language === 'en' ? 'Freshly Brewed Coffee & Drinks' : 'កាហ្វេ និងភេសជ្ជៈ';
    }
    if (quickFilterId === 'noodles') {
      return language === 'zh' ? '招牌金边粿条与汤面' : language === 'en' ? 'Kuy Teav & Signature Noodle Soup' : 'គុយទាវ និងមីស៊ុប';
    }
    if (quickFilterId === 'vegetarian') {
      return language === 'zh' ? '素食与健康餐点' : language === 'en' ? 'Vegetarian & Healthy Dishes' : 'ម្ហូបបួស និងអាហារសុខភាព';
    }
    if (quickFilterId === 'bbq_seafood') {
      return language === 'zh' ? '炭火烧烤与生猛海鲜' : language === 'en' ? 'Charcoal BBQ, Hotpot & Seafood' : 'សាច់អាំង ស៊ុប និងគ្រឿងសមុទ្រ';
    }
    return language === 'zh' ? '正宗高棉特色料理' : language === 'en' ? 'Traditional Khmer Cuisine' : 'បាយ និងម្ហូបខ្មែរ';
  };

  const sanitizeForLang = (items: string[]): string[] => {
    const clean = items
      .map((s) =>
        String(s || '')
          .replace(/Authentic Cambodian Cultural & Scenic Highlight/gi, '')
          .replace(/高棉自然与文化名胜景观/g, '')
          .replace(/^\s*[&,•·\-]+\s*|\s*[&,•·\-]+\s*$/g, '')
          .trim()
      )
      .filter(Boolean);
    const langFiltered =
      language === 'zh'
        ? clean
        : clean.filter((it) => !/[\u4e00-\u9fff]/.test(it));
    const finalItems = langFiltered.length > 0 ? langFiltered : [fallbackBadgeByLang()];
    return Array.from(new Set(finalItems)).slice(0, 2);
  };

  if (!categoryRegex) {
    return sanitizeForLang(localizedPool);
  }

  const matchedLocalized: string[] = [];
  const maxLen = Math.max(localizedPool.length, khPool.length, enPool.length);
  for (let i = 0; i < maxLen; i++) {
    const combinedDishText = normalizeKhmerFoodText(
      `${khPool[i] || ''} ${enPool[i] || ''} ${localizedPool[i] || ''}`
    );
    if (categoryRegex.test(combinedDishText)) {
      const candidate = localizedPool[i] || khPool[i] || enPool[i];
      if (candidate && !matchedLocalized.includes(candidate)) {
        matchedLocalized.push(candidate);
      }
    }
  }

  if (matchedLocalized.length > 0) {
    return sanitizeForLang(matchedLocalized);
  }
  return sanitizeForLang(localizedPool);
}

