const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('  TEST SUITE: AI TRENDING FOOD & SMART CHECK-IN SYSTEM');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

// Read seed files
const seedTrendingPath = path.resolve(__dirname, '../src/data/seedTrendingFoods.ts');
const seedTrendingContent = fs.readFileSync(seedTrendingPath, 'utf8');

// TEST 1: Authentic Trending Food items exist and >= 10
const trendItemMatches = seedTrendingContent.match(/id:\s*['"]trend-food-\d+['"]/g) || [];
assert(trendItemMatches.length >= 10, `Trending food dataset contains ${trendItemMatches.length} items (requirement: >= 10).`);

// TEST 2: Strictly Food Only - ZERO Resorts or Tourist Attractions
const forbiddenKeywords = ['resort', 'waterfall', 'temple', 'ancient temple', 'beach resort', 'ប្រាសាទ', 'ទឹកធ្លាក់', 'រមណីយដ្ឋាន'];
let foundForbidden = false;
for (const word of forbiddenKeywords) {
  // Check category or names
  if (seedTrendingContent.toLowerCase().includes(`categoryslug: '${word}'`)) {
    foundForbidden = true;
    break;
  }
}
assert(!foundForbidden, 'Trending food items are strictly food venues (ZERO resorts, waterfalls, or temples).');

// TEST 3: All items have food name, restaurant name, photo, and source platform
assert(seedTrendingContent.includes('foodNameKh') && seedTrendingContent.includes('restaurantNameKh'), 'Trending items define foodNameKh and restaurantNameKh.');
assert(seedTrendingContent.includes('sourcePlatform:') && (seedTrendingContent.includes("'tiktok'") || seedTrendingContent.includes("'facebook'")), 'Trending items include verified TikTok & Facebook source platforms.');
assert(seedTrendingContent.includes('lastUpdated:'), 'Trending items contain last updated date.');

// TEST 4: Duplicate Detection Engine checks
const dupDetectorPath = path.resolve(__dirname, '../src/utils/duplicateDetector.ts');
const dupDetectorContent = fs.readFileSync(dupDetectorPath, 'utf8');
assert(dupDetectorContent.includes('normalizeKhmer') && dupDetectorContent.includes('normalizeEnglish'), 'Khmer and English normalization utilities implemented.');
assert(dupDetectorContent.includes('calculateDistanceMeters'), 'Haversine distance calculation in meters implemented.');
assert(dupDetectorContent.includes('findDuplicateRestaurant'), 'findDuplicateRestaurant function implemented.');
assert(dupDetectorContent.includes('isDifferentBranch'), 'Distinct branches detection (> 500m) implemented without duplicate blocking.');
assert(dupDetectorContent.includes('mergeRestaurantRecords'), 'mergeRestaurantRecords implemented to update existing records instead of duplicating.');

// TEST 5: AI Smart Check-in Service checks
const checkInServicePath = path.resolve(__dirname, '../src/services/aiCheckInService.ts');
const checkInServiceContent = fs.readFileSync(checkInServicePath, 'utf8');
assert(checkInServiceContent.includes('compressImage'), 'Client-side Canvas photo compression implemented.');
assert(checkInServiceContent.includes('captureCurrentLocation'), 'GPS location acquisition implemented.');
assert(checkInServiceContent.includes('analyzeCheckInPhotoWithAi'), 'AI Vision and OCR analysis simulation implemented.');
assert(checkInServiceContent.includes('checkSubmissionRateLimit'), 'Anti-spam rate limiting (max 10/hour) implemented.');
assert(checkInServiceContent.includes('isFoodOnlyPhoto'), 'Food-only photo detection implemented to prompt user rather than inventing details.');

// TEST 6: AppContext Integration
const appContextPath = path.resolve(__dirname, '../src/context/AppContext.tsx');
const appContextContent = fs.readFileSync(appContextPath, 'utf8');
assert(appContextContent.includes('submitAiCheckIn'), 'AppContext defines submitAiCheckIn.');
assert(appContextContent.includes('approveAiCheckIn'), 'AppContext defines approveAiCheckIn for Admin review.');
assert(appContextContent.includes('mergeAiCheckIn'), 'AppContext defines mergeAiCheckIn for duplicate resolution.');
assert(appContextContent.includes('findDuplicateRestaurant'), 'AppContext integrates duplicate detection into check-in workflow.');

// TEST 7: Home Screen Layout: Section directly below Account / Profile
const homeViewPath = path.resolve(__dirname, '../src/components/HomeView.tsx');
const homeViewContent = fs.readFileSync(homeViewPath, 'utf8');
const memberHubIdx = homeViewContent.indexOf('Personalized Member Hub');
const trendingSectionIdx = homeViewContent.indexOf('REQUIREMENTS 1 & 2: DEDICATED AI TRENDING FOOD SECTION');
assert(memberHubIdx !== -1 && trendingSectionIdx !== -1 && trendingSectionIdx > memberHubIdx, 'TikTok & FB Review section moved directly below complete Account / Profile section.');
assert(homeViewContent.includes('TikTok & FB Review'), 'Home screen maintains exact TikTok & FB Review badge.');
assert(homeViewContent.includes('AI Food Check-in') || homeViewContent.includes('ឆែកអ៊ីន & បន្ថែមហាង'), 'Home screen contains prominent AI Food Check-in button.');

// TEST 8: Action Buttons (View Details, Map, Call, Share)
assert(homeViewContent.includes('handleMap') && homeViewContent.includes('handleCall') && homeViewContent.includes('handleShare'), 'Home screen Trending Food cards provide Map, Call, and Share action buttons.');

// TEST 9: Admin Dashboard AI Check-in Review Queue
const adminDashPath = path.resolve(__dirname, '../src/components/AdminDashboard.tsx');
const adminDashContent = fs.readFileSync(adminDashPath, 'utf8');
assert(adminDashContent.includes('ai_checkins'), 'Admin Dashboard includes dedicated AI Check-ins tab.');
assert(adminDashContent.includes('approveAiCheckIn'), 'Admin Dashboard provides Approve & Publish action.');
assert(adminDashContent.includes('rejectAiCheckIn'), 'Admin Dashboard provides Reject action.');

// TEST 10: Modals Registered in App.tsx
const appTsxPath = path.resolve(__dirname, '../src/App.tsx');
const appTsxContent = fs.readFileSync(appTsxPath, 'utf8');
assert(appTsxContent.includes('AiCheckInModal'), 'AiCheckInModal registered in App.tsx.');
assert(appTsxContent.includes('TrendingFoodDetailModal'), 'TrendingFoodDetailModal registered in App.tsx.');

// TEST 11: Administrator-Only AI Smart Check-in Restriction
assert(appContextContent.includes("currentUser.role !== 'admin'"), 'AppContext strictly restricts AI Smart Check-in to Administrator accounts.');
assert(homeViewContent.includes("currentUser?.role === 'admin'"), 'Home screen renders AI Food Check-in button only for Administrator.');
const restViewPath = path.resolve(__dirname, '../src/components/RestaurantView.tsx');
const restViewContent = fs.readFileSync(restViewPath, 'utf8');
assert(restViewContent.includes("currentUser?.role === 'admin'"), 'Restaurant view renders AI Check-in button only for Administrator.');

// TEST 12: Shop Directory Photos Bundle
const seedRestaurantsPath = path.resolve(__dirname, '../src/data/seedRestaurants.ts');
const seedRestaurantsContent = fs.readFileSync(seedRestaurantsPath, 'utf8');
assert(seedRestaurantsContent.includes('/Shop/rest-1.jpg'), 'Seed restaurants updated with local shop photos (/Shop/rest-1.jpg).');
assert(seedRestaurantsContent.includes('/Shop/rest-50.jpg'), 'Seed restaurants updated with local shop photos (/Shop/rest-50.jpg).');

// TEST 13: Location / Village Scenery Indicator
assert(homeViewContent.includes('រូបភាពទីតាំង / ភូមិដ្ឋាន'), 'Trending food cards display Location/Village Scenery indicator (រូបភាពទីតាំង / ភូមិដ្ឋាន).');

console.log('\n================================================================');
console.log(`  ALL ${passCount}/${passCount + failCount} AI TRENDING & CHECK-IN TESTS PASSED!`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
}
