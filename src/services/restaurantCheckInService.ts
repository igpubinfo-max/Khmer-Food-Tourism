// Khmer Food & Tourism — Smart Restaurant Discovery & GPS Check-in Service
// Spatial Distance Verification, Anti-Spam Filtering, Moderation Queue & Privacy Protection

import { Restaurant } from '../types';

export interface UserRestaurantCheckIn {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  restaurantId: string;
  restaurantNameKh: string;
  restaurantNameEn: string;
  photoUrl: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  isLocationVerified: boolean;
  rating: number;
  noteKh?: string;
  visitedDishNameKh?: string;
  status: 'verified' | 'pending_moderation' | 'flagged' | 'rejected';
  createdAt: string;
  reviewedByAdmin?: boolean;
}

export interface NearbyRestaurantMatch {
  restaurant: Restaurant;
  distanceMeters: number;
  isWithinThreshold: boolean;
}

export interface GpsLocationResult {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  isInsideCambodia: boolean;
  isSufficientAccuracy: boolean;
  errorMessage?: string;
}

// Configurable spatial thresholds
export const VERIFIED_CHECKIN_MAX_DISTANCE_METERS = 500; // 500m for walking radius
export const EXTENDED_CHECKIN_MAX_DISTANCE_METERS = 1500; // 1.5km for driving radius
export const MIN_REQUIRED_GPS_ACCURACY_METERS = 200; // Must be within 200m GPS error

const CHECKINS_STORAGE_KEY = 'kft_user_restaurant_checkins_v1';
const RATE_LIMIT_STORAGE_KEY = 'kft_checkin_rate_limit_v1';

// Haversine formula to compute exact distance in meters between two GPS coordinates
export function calculateDistanceMeters(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Check if coordinates fall within Cambodia's geographical boundaries
export function isCoordinateInsideCambodia(lat: number, lon: number): boolean {
  return lat >= 9.5 && lat <= 15.0 && lon >= 102.0 && lon <= 108.0;
}

// Acquire device GPS location with error handling and privacy
export async function getCurrentDeviceLocation(): Promise<GpsLocationResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        latitude: 11.5564,
        longitude: 104.9282,
        accuracyMeters: 50,
        isInsideCambodia: true,
        isSufficientAccuracy: true,
        errorMessage: 'Geolocation is not supported by your browser/device'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const accuracy = position.coords.accuracy || 15;
        const inside = isCoordinateInsideCambodia(lat, lon);
        const sufficient = accuracy <= MIN_REQUIRED_GPS_ACCURACY_METERS;

        resolve({
          latitude: lat,
          longitude: lon,
          accuracyMeters: Math.round(accuracy),
          isInsideCambodia: inside,
          isSufficientAccuracy: sufficient,
          errorMessage: !inside 
            ? 'ទីតាំង GPS ស្ថិតនៅក្រៅប្រទេសកម្ពុជា' 
            : !sufficient 
              ? 'កម្រិតសុក្រិត្យភាព GPS ទាបពេក សូមព្យាយាមម្តងទៀត' 
              : undefined
        });
      },
      (error) => {
        // Fallback to central Phnom Penh if permission denied, but flag error
        resolve({
          latitude: 11.5564,
          longitude: 104.9282,
          accuracyMeters: 100,
          isInsideCambodia: true,
          isSufficientAccuracy: false,
          errorMessage: error.message || 'Permission denied or GPS unavailable'
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  });
}

// Find restaurants sorted by distance from current user GPS
export function findNearbyRestaurants(
  userLat: number,
  userLon: number,
  restaurants: Restaurant[],
  maxRadiusMeters: number = 25000 // default 25km search window
): NearbyRestaurantMatch[] {
  const matches: NearbyRestaurantMatch[] = [];

  for (const r of restaurants) {
    if (!r.latitude || !r.longitude) continue;
    const dist = calculateDistanceMeters(userLat, userLon, r.latitude, r.longitude);
    if (dist <= maxRadiusMeters) {
      matches.push({
        restaurant: r,
        distanceMeters: dist,
        isWithinThreshold: dist <= VERIFIED_CHECKIN_MAX_DISTANCE_METERS
      });
    }
  }

  // Sort by closest distance
  matches.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return matches;
}

// Anti-Spam Rate Limiter (Max 10 check-ins per hour per user)
export function checkUserCheckInRateLimit(userId: string): { allowed: boolean; remaining: number; waitMinutes: number } {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    const records: { userId: string; timestamp: number }[] = raw ? JSON.parse(raw) : [];
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    // Clean old records
    const active = records.filter(r => r.timestamp > oneHourAgo);
    const userCount = active.filter(r => r.userId === userId).length;

    if (userCount >= 10) {
      const oldestUser = active.filter(r => r.userId === userId).sort((a, b) => a.timestamp - b.timestamp)[0];
      const waitMinutes = Math.max(1, Math.ceil((oldestUser.timestamp + 60 * 60 * 1000 - Date.now()) / (1000 * 60)));
      return { allowed: false, remaining: 0, waitMinutes };
    }

    return { allowed: true, remaining: 10 - userCount, waitMinutes: 0 };
  } catch {
    return { allowed: true, remaining: 10, waitMinutes: 0 };
  }
}

// Record successful check-in
export function recordCheckInAttempt(userId: string): void {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    const records: { userId: string; timestamp: number }[] = raw ? JSON.parse(raw) : [];
    records.push({ userId, timestamp: Date.now() });
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to record checkin rate limit:', e);
  }
}

// Load saved user check-ins
export function loadAllCheckIns(): UserRestaurantCheckIn[] {
  try {
    const raw = localStorage.getItem(CHECKINS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Save check-in record
export function saveCheckInRecord(checkIn: UserRestaurantCheckIn): void {
  try {
    const list = loadAllCheckIns();
    list.unshift(checkIn);
    localStorage.setItem(CHECKINS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save checkin record:', e);
  }
}

// Format distance human-friendly
export function formatDistance(distanceMeters: number, isKm: boolean): string {
  if (distanceMeters < 1000) {
    return `${distanceMeters} ${isKm ? 'ម៉ែត្រ' : 'm'}`;
  }
  const km = (distanceMeters / 1000).toFixed(1);
  return `${km} ${isKm ? 'គីឡូម៉ែត្រ' : 'km'}`;
}
