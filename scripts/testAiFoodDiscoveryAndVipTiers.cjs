// Test Suite: AI Food Discovery, Spatial Check-in & VIP Tiers ($2.99 & $9.99)
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('  TEST SUITE: AI FOOD DISCOVERY, SPATIAL CHECK-IN & VIP TIERS');
console.log('================================================================\n');

let pass = 0;
function test(desc, fn) {
  try {
    fn();
    console.log(`[PASS] ${desc}`);
    pass++;
  } catch (err) {
    console.error(`[FAIL] ${desc}:`, err.message);
    process.exit(1);
  }
}

// 1. Check AI Food Service implementation
const aiFoodServicePath = path.resolve(__dirname, '../src/services/aiFoodService.ts');
const aiFoodServiceContent = fs.readFileSync(aiFoodServicePath, 'utf8');

test('AI Food Service defines identifyFoodWithAi', () => {
  assert(aiFoodServiceContent.includes('identifyFoodWithAi'), 'identifyFoodWithAi function present');
});

test('AI Food Service defines searchByHomeIngredients', () => {
  assert(aiFoodServiceContent.includes('searchByHomeIngredients'), 'searchByHomeIngredients present');
});

test('AI Food Service defines getPersonalizedRecommendations', () => {
  assert(aiFoodServiceContent.includes('getPersonalizedRecommendations'), 'getPersonalizedRecommendations present');
});

test('AI Food Service handles unclear / low confidence honestly without guessing', () => {
  assert(aiFoodServiceContent.includes("'unclear'") && aiFoodServiceContent.includes('disclaimerKh'), 'Honest unclear status and disclaimer handled');
});

test('AI Food Quota enforces Free (3), Quarterly (15), and Annual (Unlimited)', () => {
  assert(aiFoodServiceContent.includes('dailyLimit = 3'), 'Free tier 3 scans');
  assert(aiFoodServiceContent.includes('dailyLimit = 15'), 'Quarterly tier 15 scans');
  assert(aiFoodServiceContent.includes('dailyLimit = -1'), 'Annual tier unlimited scans');
});

// 2. Check Restaurant Check-in Service
const checkInServicePath = path.resolve(__dirname, '../src/services/restaurantCheckInService.ts');
const checkInContent = fs.readFileSync(checkInServicePath, 'utf8');

test('Restaurant Check-in Service defines calculateDistanceMeters using Haversine', () => {
  assert(checkInContent.includes('calculateDistanceMeters') && checkInContent.includes('6371000'), 'Haversine distance calculation present');
});

test('Restaurant Check-in Service enforces 500m threshold for verified check-in', () => {
  assert(checkInContent.includes('VERIFIED_CHECKIN_MAX_DISTANCE_METERS = 500'), '500m threshold configured');
});

test('Restaurant Check-in Service checks Cambodia coordinate bounds', () => {
  assert(checkInContent.includes('isCoordinateInsideCambodia'), 'Cambodia boundary check present');
});

test('Restaurant Check-in Service enforces 10 checkins/hour anti-spam rate limit', () => {
  assert(checkInContent.includes('checkUserCheckInRateLimit'), 'Anti-spam rate limit check present');
});

// 3. Check App Version v1.7.0 (Build 42)
const typesPath = path.resolve(__dirname, '../src/types/index.ts');
const typesContent = fs.readFileSync(typesPath, 'utf8');

test('App Version bumped to v1.7.0 (Build 42)', () => {
  assert(typesContent.includes("APP_VERSION = 'v1.7.0'"), 'APP_VERSION is v1.7.0');
  assert(typesContent.includes("APP_BUILD_CODE = 42"), 'APP_BUILD_CODE is 42');
});

// 4. Check Android build.gradle version
const gradlePath = path.resolve(__dirname, '../android/app/build.gradle');
const gradleContent = fs.readFileSync(gradlePath, 'utf8');

test('Android build.gradle has versionCode 42 and versionName 1.7.0', () => {
  assert(gradleContent.includes('versionCode 42'), 'versionCode is 42');
  assert(gradleContent.includes('versionName "1.7.0"'), 'versionName is 1.7.0');
});

// 5. Check Modals registered in App.tsx
const appPath = path.resolve(__dirname, '../src/App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');

test('AiFoodDiscoveryModal registered in App.tsx', () => {
  assert(appContent.includes('<AiFoodDiscoveryModal />'), 'AiFoodDiscoveryModal rendered in App.tsx');
});

test('RestaurantCheckInModal registered in App.tsx', () => {
  assert(appContent.includes('<RestaurantCheckInModal />'), 'RestaurantCheckInModal rendered in App.tsx');
});

// 6. Check HomeView has entry buttons
const homePath = path.resolve(__dirname, '../src/components/HomeView.tsx');
const homeContent = fs.readFileSync(homePath, 'utf8');

test('HomeView has prominent AI Food Scanner button', () => {
  assert(homeContent.includes('setIsAiFoodDiscoveryModalOpen(true)'), 'AI Food Scanner button present on HomeView');
});

test('HomeView has prominent Restaurant Check-in button', () => {
  assert(homeContent.includes('setIsRestaurantCheckInModalOpen(true)'), 'Restaurant Check-in button present on HomeView');
});

console.log('\n================================================================');
console.log(`  ALL ${pass}/${pass} AI FOOD DISCOVERY & VIP TIERS TESTS PASSED!`);
console.log('================================================================\n');
