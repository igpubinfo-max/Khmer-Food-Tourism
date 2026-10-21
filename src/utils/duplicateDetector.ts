import { Restaurant, FoodItem, AiCheckInSubmission } from '../types';

/**
 * Khmer Text Normalizer
 * Cleans invisible zero-width spaces, diacritics variations, punctuation, and extra whitespace.
 */
export function normalizeKhmer(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '') // remove zero-width spaces
    .replace(/[។៕៖ៗ៘៙៚\s\-_.,/\\()"'’“”]/g, '') // remove punctuation & symbols
    .trim();
}

/**
 * English Text Normalizer
 * Lowercases, strips punctuation and normalizes spacing.
 */
export function normalizeEnglish(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Phone Number Normalizer
 * Strips country code +855 or leading 0, spaces, dashes.
 */
export function normalizePhone(phone?: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('855')) {
    cleaned = '0' + cleaned.substring(3);
  }
  if (!cleaned.startsWith('0') && cleaned.length >= 8) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

/**
 * Levenshtein Distance for typo tolerance
 */
export function levenshteinDistance(s1: string, s2: string): number {
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;

  const row = new Array(s2.length + 1);
  for (let i = 0; i <= s2.length; i++) row[i] = i;

  for (let i = 1; i <= s1.length; i++) {
    let prev = i;
    for (let j = 1; j <= s2.length; j++) {
      let val;
      if (s1.charAt(i - 1) === s2.charAt(j - 1)) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[s2.length] = prev;
  }

  return row[s2.length];
}

/**
 * String Similarity Score (0.0 to 1.0)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const norm1 = str1.trim();
  const norm2 = str2.trim();
  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 1.0;

  const dist = levenshteinDistance(norm1, norm2);
  const levScore = 1.0 - dist / maxLen;

  // Substring bonus
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return Math.max(levScore, 0.85);
  }

  return Math.max(0, levScore);
}

/**
 * Haversine Formula: Calculate Distance in Meters between two GPS coordinates
 */
export function calculateDistanceMeters(
  lat1?: number,
  lon1?: number,
  lat2?: number,
  lon2?: number
): number {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return Infinity;
  }
  if (lat1 === 0 && lon1 === 0) return Infinity;
  if (lat2 === 0 && lon2 === 0) return Infinity;

  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  isDifferentBranch: boolean;
  matchScore: number;
  matchedRestaurant?: Restaurant;
  reason?: string;
}

/**
 * Duplicate Restaurant Detector
 * Analyzes candidate restaurant against existing directory:
 * - Checks phone numbers
 * - Checks Khmer & English name similarities
 * - Checks GPS spatial distance (meters)
 * - Identifies distinct branches vs actual duplicate
 */
export function findDuplicateRestaurant(
  candidate: {
    nameKh: string;
    nameEn?: string;
    phone?: string;
    latitude?: number;
    longitude?: number;
    addressKh?: string;
    addressEn?: string;
    provinceKh?: string;
  },
  existingRestaurants: Restaurant[]
): DuplicateDetectionResult {
  const candKh = normalizeKhmer(candidate.nameKh);
  const candEn = normalizeEnglish(candidate.nameEn || '');
  const candPhone = normalizePhone(candidate.phone);

  let bestMatch: Restaurant | null = null;
  let highestScore = 0;
  let matchReason = '';
  let isBranch = false;

  for (const existing of existingRestaurants) {
    let score = 0;
    const reasons: string[] = [];

    // 1. Phone match check
    const existPhone = normalizePhone(existing.phone);
    if (candPhone && existPhone && candPhone.length >= 8 && candPhone === existPhone) {
      score += 0.85;
      reasons.push('លេខទូរស័ព្ទដូចគ្នា (Identical Phone)');
    }

    // 2. Khmer name similarity
    const existKh = normalizeKhmer(existing.nameKh);
    const khSim = calculateStringSimilarity(candKh, existKh);
    if (khSim >= 0.8) {
      score = Math.max(score, khSim);
      reasons.push(`ឈ្មោះខ្មែរស្រដៀង (${Math.round(khSim * 100)}%)`);
    }

    // 3. English name similarity
    const existEn = normalizeEnglish(existing.nameEn || '');
    if (candEn && existEn) {
      const enSim = calculateStringSimilarity(candEn, existEn);
      if (enSim >= 0.8) {
        score = Math.max(score, enSim);
        reasons.push(`ឈ្មោះអង់គ្លេសស្រដៀង (${Math.round(enSim * 100)}%)`);
      }
    }

    // 4. GPS Distance evaluation
    const distanceM = calculateDistanceMeters(
      candidate.latitude,
      candidate.longitude,
      existing.latitude,
      existing.longitude
    );

    // If names are very similar:
    if (score >= 0.75) {
      // If distance is over 500 meters, this is a separate branch of the same restaurant brand!
      if (distanceM > 500 && distanceM !== Infinity) {
        isBranch = true;
        score = 0.5; // Do not block as duplicate, allow as new branch
        reasons.push(`សាខាផ្សេងគ្នា (គម្លាត ${Math.round(distanceM)} ម៉ែត្រ)`);
      } else if (distanceM <= 200) {
        score = Math.min(1.0, score + 0.25);
        reasons.push(`ទីតាំងភូមិសាស្ត្រជិតគ្នាខ្លាំង (${Math.round(distanceM)} ម៉ែត្រ)`);
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = existing;
      matchReason = reasons.join(', ');
    }
  }

  // Threshold: >= 0.80 considered duplicate if not a separate branch
  const isDuplicate = highestScore >= 0.8 && !isBranch;

  return {
    isDuplicate,
    isDifferentBranch: isBranch && highestScore >= 0.5,
    matchScore: highestScore,
    matchedRestaurant: bestMatch || undefined,
    reason: matchReason || undefined,
  };
}

/**
 * Merge new information into existing restaurant without overwriting valid data
 */
export function mergeRestaurantRecords(
  existing: Restaurant,
  incoming: Partial<Restaurant>
): Restaurant {
  return {
    ...existing,
    // Add missing phone if existing didn't have one
    phone: existing.phone && existing.phone !== '012 000 000' ? existing.phone : (incoming.phone || existing.phone),
    // Update description if existing was brief
    descriptionKh: (existing.descriptionKh?.length || 0) < (incoming.descriptionKh?.length || 0) 
      ? incoming.descriptionKh! 
      : existing.descriptionKh,
    // Merge signature dishes
    signatureDishesKh: Array.from(new Set([
      ...(existing.signatureDishesKh || []),
      ...(incoming.signatureDishesKh || []),
    ])),
    // Add photos to gallery
    galleryPhotos: Array.from(new Set([
      ...(existing.galleryPhotos || []),
      ...(incoming.galleryPhotos || []),
      ...(incoming.photoUrl ? [incoming.photoUrl] : []),
    ])),
    // Retain higher view count / review counts
    reviewCount: Math.max(existing.reviewCount || 0, incoming.reviewCount || 0) + 1,
  };
}
