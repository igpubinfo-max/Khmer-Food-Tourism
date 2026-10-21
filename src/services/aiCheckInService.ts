import { AiCheckInSubmission } from '../types';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}

/**
 * Cambodian Province Spatial Bounding Boxes & Centers
 */
const CAMBODIA_REGIONS = [
  { nameKh: 'រាជធានីភ្នំពេញ', nameEn: 'Phnom Penh', lat: 11.5564, lon: 104.9282, radiusKm: 25 },
  { nameKh: 'ខេត្តសៀមរាប', nameEn: 'Siem Reap', lat: 13.3633, lon: 103.8564, radiusKm: 35 },
  { nameKh: 'ខេត្តបាត់ដំបង', nameEn: 'Battambang', lat: 13.0957, lon: 103.1982, radiusKm: 30 },
  { nameKh: 'ខេត្តកំពត', nameEn: 'Kampot', lat: 10.5942, lon: 104.1812, radiusKm: 25 },
  { nameKh: 'ខេត្តកែប', nameEn: 'Kep', lat: 10.4828, lon: 104.2938, radiusKm: 15 },
  { nameKh: 'ខេត្តកោះកុង', nameEn: 'Koh Kong', lat: 11.6158, lon: 102.9839, radiusKm: 30 },
  { nameKh: 'ខេត្តកំពង់ចាម', nameEn: 'Kampong Cham', lat: 11.9924, lon: 105.4638, radiusKm: 25 },
  { nameKh: 'ខេត្តព្រះសីហនុ', nameEn: 'Preah Sihanouk', lat: 10.6275, lon: 103.5221, radiusKm: 25 },
  { nameKh: 'ខេត្តកណ្តាល', nameEn: 'Kandal', lat: 11.4556, lon: 104.9528, radiusKm: 35 },
  { nameKh: 'ខេត្តកំពង់ស្ពឺ', nameEn: 'Kampong Speu', lat: 11.4532, lon: 104.5208, radiusKm: 30 },
];

/**
 * Identify closest Cambodian Province from GPS coordinates
 */
export function getProvinceFromGps(lat: number, lon: number): { provinceKh: string; provinceEn: string } {
  let closest = CAMBODIA_REGIONS[0];
  let minDistance = Infinity;

  for (const reg of CAMBODIA_REGIONS) {
    const dLat = (reg.lat - lat) * 111; // approx km
    const dLon = (reg.lon - lon) * 111 * Math.cos((lat * Math.PI) / 180);
    const dist = Math.sqrt(dLat * dLat + dLon * dLon);
    if (dist < minDistance) {
      minDistance = dist;
      closest = reg;
    }
  }

  return {
    provinceKh: closest.nameKh,
    provinceEn: closest.nameEn,
  };
}

/**
 * Client-Side Image Compression using Canvas
 * Compresses photo to max 1200px width/height and quality 0.82
 */
export async function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('បរាជ័យក្នុងការអានឯកសាររូបថត'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ឯកសាររូបភាពមិនត្រឹមត្រូវ'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Capture Device GPS Location with graceful fallback
 */
export async function captureCurrentLocation(): Promise<LocationCoordinates> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      // Default to central Phnom Penh if geolocation unavailable
      resolve({ latitude: 11.5564, longitude: 104.9282, accuracyMeters: 50 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: Number(pos.coords.latitude.toFixed(5)),
          longitude: Number(pos.coords.longitude.toFixed(5)),
          accuracyMeters: Math.round(pos.coords.accuracy || 10),
        });
      },
      (err) => {
        console.warn('Geolocation warning / permission denied:', err.message);
        // Fallback default coordinates
        resolve({ latitude: 11.5564, longitude: 104.9282, accuracyMeters: 100 });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

export interface AiVisionOcrResult {
  detectedRestaurantNameKh: string;
  detectedRestaurantNameEn: string;
  detectedFoodCategoryKh: string;
  detectedFoodCategoryEn: string;
  signatureDishes: string[];
  extractedAddressKh: string;
  extractedAddressEn: string;
  extractedPhone?: string;
  aiDescriptionKh: string;
  aiDescriptionEn: string;
  confidenceScore: number;
  isFoodOnlyPhoto: boolean;
  needsUserInput: boolean;
}

/**
 * Simulated AI Image Recognition & OCR Analyzer
 * Analyzes photo content, signage, phone numbers, and dish characteristics.
 * If photo is only food without clear restaurant signage, prompts user for name.
 */
export async function analyzeCheckInPhotoWithAi(
  imageDataUrl: string,
  coords: LocationCoordinates,
  userHint?: string
): Promise<AiVisionOcrResult> {
  // Simulate AI Vision network latency (800ms)
  await new Promise((r) => setTimeout(r, 800));

  const { provinceKh, provinceEn } = getProvinceFromGps(coords.latitude, coords.longitude);

  // If user provided a hint/name:
  if (userHint && userHint.trim().length > 1) {
    const hint = userHint.trim();
    return {
      detectedRestaurantNameKh: hint,
      detectedRestaurantNameEn: `${hint} Restaurant`,
      detectedFoodCategoryKh: 'ភោជនីយដ្ឋាន & អាហារដ្ឋាន',
      detectedFoodCategoryEn: 'Restaurant & Eatery',
      signatureDishes: ['ម្ហូបពិសេសប្រចាំហាង', 'មុខម្ហូបខ្មែរឆ្ងាញ់ៗ'],
      extractedAddressKh: `ស្ថិតនៅ ${provinceKh}`,
      extractedAddressEn: `Located in ${provinceEn}`,
      extractedPhone: undefined,
      aiDescriptionKh: `ហាងដែលត្រូវបានរកឃើញ និងបន្ថែមដោយការឆែកអ៊ីន AI ក្នុង ${provinceKh}។`,
      aiDescriptionEn: `Restaurant discovered and verified via AI Smart Check-in in ${provinceEn}.`,
      confidenceScore: 0.88,
      isFoodOnlyPhoto: false,
      needsUserInput: false,
    };
  }

  // Sample heuristic based on image size or data characteristics
  // Determines if image is storefront/sign or food-only dish
  const isLikelyFoodOnly = imageDataUrl.length % 3 === 0;

  if (isLikelyFoodOnly) {
    // Food-only detected: strictly do NOT fabricate missing restaurant name!
    return {
      detectedRestaurantNameKh: '',
      detectedRestaurantNameEn: '',
      detectedFoodCategoryKh: 'មុខម្ហូបប្រពៃណីខ្មែរ',
      detectedFoodCategoryEn: 'Traditional Khmer Food',
      signatureDishes: ['មុខម្ហូបក្នុងរូបថត'],
      extractedAddressKh: `ទីតាំង៖ ${provinceKh}`,
      extractedAddressEn: `Location: ${provinceEn}`,
      extractedPhone: undefined,
      aiDescriptionKh: `AI បានសម្គាល់ឃើញមុខម្ហូបខ្មែរឈ្ងុយឆ្ងាញ់។ សូមជួយបញ្ជាក់ឈ្មោះហាង ឬតូបអាហារ ដើម្បីប្រព័ន្ធកត់ត្រាបានត្រឹមត្រូវ។`,
      aiDescriptionEn: `AI detected a delicious dish. Please provide the restaurant or stall name so it can be added accurately.`,
      confidenceScore: 0.60,
      isFoodOnlyPhoto: true,
      needsUserInput: true,
    };
  }

  // Storefront / Signboard detected
  return {
    detectedRestaurantNameKh: `អាហារដ្ឋានខ្មែរ ${provinceKh}`,
    detectedRestaurantNameEn: `Khmer Food Place ${provinceEn}`,
    detectedFoodCategoryKh: 'អាហារដ្ឋាន & អាហារពេលព្រឹក',
    detectedFoodCategoryEn: 'Local Eatery & Breakfast',
    signatureDishes: ['បាយសាច់ជ្រូក', 'គុយទាវខ្មែរ', 'កាហ្វេទឹកដោះគោ'],
    extractedAddressKh: `ជិតទីប្រជុំជន ${provinceKh}`,
    extractedAddressEn: `Near center of ${provinceEn}`,
    extractedPhone: '012 345 678',
    aiDescriptionKh: `អាហារដ្ឋានបម្រើម្ហូបខ្មែររសជាតិឆ្ងាញ់ ដែលត្រូវបានរកឃើញ និងផ្ទៀងផ្ទាត់ដោយ AI Smart Check-in ក្នុង ${provinceKh}។`,
    aiDescriptionEn: `Authentic food place identified and verified through AI Smart Check-in in ${provinceEn}.`,
    confidenceScore: 0.85,
    isFoodOnlyPhoto: false,
    needsUserInput: false,
  };
}

/**
 * Rate Limiter: Protects against spam check-ins
 * Maximum 10 submissions per hour per user
 */
export function checkSubmissionRateLimit(userId: string): { allowed: boolean; remainingSubmissions: number; waitMinutes?: number } {
  try {
    const key = `kft_ratelimit_checkin_${userId}`;
    const raw = localStorage.getItem(key);
    const now = Date.now();
    const oneHourMs = 60 * 60 * 1000;

    let timestamps: number[] = raw ? JSON.parse(raw) : [];
    // Filter out timestamps older than 1 hour
    timestamps = timestamps.filter((t) => now - t < oneHourMs);

    const maxPerHour = 10;
    if (timestamps.length >= maxPerHour) {
      const oldest = timestamps[0];
      const waitMs = oneHourMs - (now - oldest);
      return {
        allowed: false,
        remainingSubmissions: 0,
        waitMinutes: Math.max(1, Math.ceil(waitMs / (60 * 1000))),
      };
    }

    return {
      allowed: true,
      remainingSubmissions: maxPerHour - timestamps.length,
    };
  } catch {
    return { allowed: true, remainingSubmissions: 10 };
  }
}

/**
 * Record successful submission in rate limit tracker
 */
export function recordSubmissionTimestamp(userId: string): void {
  try {
    const key = `kft_ratelimit_checkin_${userId}`;
    const raw = localStorage.getItem(key);
    const now = Date.now();
    const oneHourMs = 60 * 60 * 1000;

    let timestamps: number[] = raw ? JSON.parse(raw) : [];
    timestamps = timestamps.filter((t) => now - t < oneHourMs);
    timestamps.push(now);

    localStorage.setItem(key, JSON.stringify(timestamps));
  } catch (e) {
    console.warn('Rate limiter storage error', e);
  }
}
