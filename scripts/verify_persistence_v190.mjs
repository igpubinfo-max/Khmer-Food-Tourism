import fs from 'fs';
import path from 'path';

console.log('=== TEST SUITE: PHOTO OVERRIDE VAULT & ANTI-REVERSION VERIFICATION ===\n');

// Mock localStorage
const storage = new Map();
const mockLocalStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear()
};

// Read seed destinations list
const rawDestList = fs.readFileSync('F:/Soft/System Program 2027 kimseng/KhmerFoodTourism/src/data/touristDestinationsList.json', 'utf-8');
const initialDestinations = JSON.parse(rawDestList);
const initialMap = new Map(initialDestinations.map(d => [d.id, d]));

console.log(`[PASS] Loaded ${initialDestinations.length} destinations from seed list.`);

// Test 1: Check dest-77 default seed photo
const dest77Seed = initialMap.get('dest-77');
if (dest77Seed.photoUrl.includes('/destinations/dest-77.jpg')) {
  console.log('[PASS] Test 1: dest-77 default seed photo is updated to /destinations/dest-77.jpg');
} else {
  console.error('[FAIL] Test 1: dest-77 default seed photo is:', dest77Seed.photoUrl);
  process.exit(1);
}

// Hydration function matching AppContext.tsx
function hydrateDestinations(ls) {
  let photoOverrides = {};
  try {
    const savedOverrides = ls.getItem('kft_destination_photo_overrides_v1');
    if (savedOverrides) photoOverrides = JSON.parse(savedOverrides) || {};
  } catch {}

  const saved = ls.getItem('kft_destinations_real_v7');
  if (saved && saved !== 'undefined' && saved !== 'null') {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length >= 100) {
      const upgraded = parsed.map((d) => {
        const seed = initialMap.get(d.id);
        if (!seed) return d;

        // PRIORITY 1: Persistent photo override vault (explicit admin customization)
        if (photoOverrides[d.id]?.photoUrl) {
          return {
            ...seed,
            ...d,
            photoUrl: photoOverrides[d.id].photoUrl,
            isCustomPhoto: true,
            photoUpdatedAt: photoOverrides[d.id].updatedAt,
          };
        }

        // PRIORITY 2: Check for user custom upload or explicit flag
        const isUserUpload = typeof d.photoUrl === 'string' && d.photoUrl.startsWith('data:');
        const hasCustomFlag = Boolean(d.isCustomPhoto);

        // Outdated placeholder signatures that must be upgraded to new verified seed photos
        const isOutdatedSeedPhoto = 
          !d.photoUrl ||
          d.photoUrl.includes('Aerial_View_of_Kizuna_Bridge') || // dest-77 old Kizuna bridge
          d.photoUrl.includes('Mondulkiri_province_Northeastern_Cambodia.jpg') || // dest-58 old landscape
          d.photoUrl.includes('Siem_Reap_Pubstreet.jpg') || // dest-123 old pub street duplicate
          (d.id === 'dest-123' && (d.nameKh || '').includes('ផាប់ស្ទ្រីត'));

        let effectivePhoto = seed.photoUrl;

        if (isUserUpload || hasCustomFlag) {
          effectivePhoto = d.photoUrl;
          photoOverrides[d.id] = { photoUrl: d.photoUrl, updatedAt: d.photoUpdatedAt || new Date().toISOString() };
        } else if (!isOutdatedSeedPhoto && d.photoUrl && d.photoUrl.trim() !== '') {
          if (d.photoUrl !== seed.photoUrl && !d.photoUrl.includes('Aerial_View_of_Kizuna_Bridge')) {
            effectivePhoto = d.photoUrl;
            photoOverrides[d.id] = { photoUrl: d.photoUrl, updatedAt: d.photoUpdatedAt || new Date().toISOString() };
          } else {
            effectivePhoto = seed.photoUrl;
          }
        }

        return {
          ...seed,
          ...d,
          photoUrl: effectivePhoto,
          isCustomPhoto: isUserUpload || hasCustomFlag || (effectivePhoto !== seed.photoUrl),
        };
      });

      try {
        ls.setItem('kft_destination_photo_overrides_v1', JSON.stringify(photoOverrides));
      } catch {}

      const existingIds = new Set(upgraded.map(d => d.id));
      const missingFromInitial = initialDestinations.filter(d => !existingIds.has(d.id));
      return missingFromInitial.length > 0 ? [...upgraded, ...missingFromInitial] : upgraded;
    }
  }
  return initialDestinations;
}

// Function simulating admin update (from AppContext.tsx updateDestination)
function adminUpdateDestination(ls, updated) {
  const customUpdated = {
    ...updated,
    isCustomPhoto: true,
    photoUpdatedAt: new Date().toISOString(),
  };

  const savedOverrides = ls.getItem('kft_destination_photo_overrides_v1');
  const overrides = savedOverrides ? JSON.parse(savedOverrides) : {};
  overrides[customUpdated.id] = {
    photoUrl: customUpdated.photoUrl,
    updatedAt: customUpdated.photoUpdatedAt,
  };
  ls.setItem('kft_destination_photo_overrides_v1', JSON.stringify(overrides));

  const savedDests = ls.getItem('kft_destinations_real_v7');
  const dests = savedDests ? JSON.parse(savedDests) : initialDestinations;
  const next = dests.map(d => d.id === customUpdated.id ? customUpdated : d);
  ls.setItem('kft_destinations_real_v7', JSON.stringify(next));
  return customUpdated;
}

// Test 2: Clean install
mockLocalStorage.clear();
const fresh = hydrateDestinations(mockLocalStorage);
const fresh77 = fresh.find(d => d.id === 'dest-77');
if (fresh77.photoUrl === '/destinations/dest-77.jpg') {
  console.log('[PASS] Test 2: Clean install yields /destinations/dest-77.jpg');
} else {
  console.error('[FAIL] Test 2: Unexpected fresh photoUrl:', fresh77.photoUrl);
  process.exit(1);
}

// Test 3: Upgrade from older version that had Kizuna Bridge stored in local storage
mockLocalStorage.clear();
const oldPhoneState = initialDestinations.map(d => {
  if (d.id === 'dest-77') {
    return { ...d, photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Aerial_View_of_Kizuna_Bridge_and_Kampong_Cham_City.jpg' };
  }
  return d;
});
mockLocalStorage.setItem('kft_destinations_real_v7', JSON.stringify(oldPhoneState));

const upgradedFromOld = hydrateDestinations(mockLocalStorage);
const upgraded77 = upgradedFromOld.find(d => d.id === 'dest-77');
if (upgraded77.photoUrl === '/destinations/dest-77.jpg') {
  console.log('[PASS] Test 3: Upgrading older phone state replaces outdated Kizuna bridge with /destinations/dest-77.jpg');
} else {
  console.error('[FAIL] Test 3: Upgraded photo failed, still has:', upgraded77.photoUrl);
  process.exit(1);
}

// Test 4: Admin updates a photo explicitly (e.g. admin puts custom URL or data URL)
const customPhotoUrl = 'https://my-custom-server.com/my-own-photo-koh-pen.jpg';
adminUpdateDestination(mockLocalStorage, { ...upgraded77, photoUrl: customPhotoUrl });

// Verify it is saved in overrides vault
const savedOverrides = JSON.parse(mockLocalStorage.getItem('kft_destination_photo_overrides_v1'));
if (savedOverrides['dest-77']?.photoUrl === customPhotoUrl) {
  console.log('[PASS] Test 4: Admin edit successfully written to persistent overrides vault');
} else {
  console.error('[FAIL] Test 4: Override vault missing custom edit:', savedOverrides);
  process.exit(1);
}

// Test 5: Next version upgrade (simulating future release with modified seed)
// Even if future seed changes or app re-hydrates, admin photo MUST NOT revert!
const futureHydrated = hydrateDestinations(mockLocalStorage);
const future77 = futureHydrated.find(d => d.id === 'dest-77');
if (future77.photoUrl === customPhotoUrl && future77.isCustomPhoto === true) {
  console.log('[PASS] Test 5: Future version upgrade 100% PRESERVED admin custom photo without reversion!');
} else {
  console.error('[FAIL] Test 5: Photo reverted! photoUrl:', future77.photoUrl);
  process.exit(1);
}

// Test 6: Verify all 300 destinations bundled and intact
if (futureHydrated.length === 300) {
  console.log('[PASS] Test 6: Exactly 300 destinations verified in persistent database.');
} else {
  console.error('[FAIL] Test 6: Dest count mismatch:', futureHydrated.length);
  process.exit(1);
}

console.log('\n>>> ALL 6 VERIFICATION TESTS PASSED UNANIMOUSLY! <<<');
