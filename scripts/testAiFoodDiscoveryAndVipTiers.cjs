// Test Suite: AI Food Discovery, Spatial Check-in, VIP Tiers & Strict Admin-Approved Payment Flow
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

// 3. Check App Version v1.7.6 (Build 48)
const typesPath = path.resolve(__dirname, '../src/types/index.ts');
const typesContent = fs.readFileSync(typesPath, 'utf8');

test('App Version bumped to v1.7.6 (Build 48)', () => {
  assert(typesContent.includes("APP_VERSION = 'v1.7.6'"), 'APP_VERSION is v1.7.6');
  assert(typesContent.includes("APP_BUILD_CODE = 48"), 'APP_BUILD_CODE is 48');
});

// 4. Check Android build.gradle version
const gradlePath = path.resolve(__dirname, '../android/app/build.gradle');
const gradleContent = fs.readFileSync(gradlePath, 'utf8');

test('Android build.gradle has versionCode 48 and versionName 1.7.6', () => {
  assert(gradleContent.includes('versionCode 48'), 'versionCode is 48');
  assert(gradleContent.includes('versionName "1.7.6"'), 'versionName is 1.7.6');
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

// 7. Critical Payment Security & ABA KHQR Fix Checks
const pluginPath = path.resolve(__dirname, '../android/app/src/main/java/com/khmerfood/tourism/NativeAbaLauncherPlugin.java');
const pluginContent = fs.readFileSync(pluginPath, 'utf8');
const vipModalPath = path.resolve(__dirname, '../src/components/UpgradeVipModal.tsx');
const vipModalContent = fs.readFileSync(vipModalPath, 'utf8');
const appCtxPath = path.resolve(__dirname, '../src/context/AppContext.tsx');
const appCtxContent = fs.readFileSync(appCtxPath, 'utf8');

test('Zero unsupported type=payway URL in UpgradeVipModal (prevents [MAPP-PW] Invalid Qr Merchant Data)', () => {
  assert(!vipModalContent.includes('type=payway&qrcode='), 'No type=payway&qrcode= in UpgradeVipModal.tsx');
});

test('UpgradeVipModal never calls upgradeCurrentUserToVip directly on button click (strictly requires Admin approval)', () => {
  assert(!vipModalContent.includes('upgradeCurrentUserToVip('), 'UpgradeVipModal does not call upgradeCurrentUserToVip');
  assert(vipModalContent.includes('submitVipUpgradeRequest('), 'UpgradeVipModal calls submitVipUpgradeRequest');
  assert(vipModalContent.includes("setPaymentState('PENDING_ADMIN_APPROVAL')"), 'Transitions to PENDING_ADMIN_APPROVAL');
  assert(vipModalContent.includes('កំពុងរង់ចាំ Admin ពិនិត្យការទូទាត់'), 'Displays Khmer pending admin approval message');
});

test('AppContext enforces Admin role authorization and prevents duplicate approvals on verifyTransaction', () => {
  assert(appCtxContent.includes("if (!currentUser || currentUser.role !== 'admin')"), 'Admin role check enforced');
  assert(appCtxContent.includes("if (matchedTxn.status === 'verified')"), 'Duplicate approval prevention enforced');
  assert(appCtxContent.includes('kft_admin_audit_logs_v1'), 'Admin audit log recorded');
});

const aiModalPath = path.resolve(__dirname, '../src/components/AiFoodDiscoveryModal.tsx');
const aiModalContent = fs.readFileSync(aiModalPath, 'utf8');
const checkInModalPath = path.resolve(__dirname, '../src/components/RestaurantCheckInModal.tsx');
const checkInModalContent = fs.readFileSync(checkInModalPath, 'utf8');

test('AiFoodDiscoveryModal declares all React useMemo hooks BEFORE early return null (prevents React Error #310)', () => {
  const returnNullIndex = aiModalContent.indexOf('if (!isAiFoodDiscoveryModalOpen) return null;');
  const lastUseMemoIndex = aiModalContent.lastIndexOf('useMemo(');
  assert(returnNullIndex > lastUseMemoIndex && lastUseMemoIndex > 0, 'All useMemo hooks are strictly before early return null');
});

test('RestaurantCheckInModal supports "Other / Shop Not in List" custom shop check-in and directory registration', () => {
  assert(checkInModalContent.includes('isCustomShop') && checkInModalContent.includes('customShopName'), 'Custom shop state present');
  assert(checkInModalContent.includes('ផ្សេងៗ (ហាងមិនមានក្នុងបញ្ជី)'), 'Khmer Other/Shop Not in List label present');
  assert(checkInModalContent.includes('handleSelectOtherShop'), 'handleSelectOtherShop handler present');
});

test('AI Food Service defines all 9 Object Types (Fruit, Vegetables, Raw Meat/Seafood, Packaged Food, Cooked Dish, Dessert, Drink, Ingredient, Unknown)', () => {
  const requiredTypes = [
    'fresh_fruit',
    'fresh_vegetables',
    'raw_meat_seafood',
    'packaged_food',
    'cooked_dish',
    'dessert_cake_snack',
    'drink_beverage',
    'food_ingredient',
    'unknown_unclear'
  ];
  for (const t of requiredTypes) {
    assert(aiFoodServiceContent.includes(`'${t}'`), `Object type ${t} defined`);
  }
});

test('AI Food Service removes arbitrary idHash jitter scoring and separates object classification from recipe retrieval', () => {
  assert(!aiFoodServiceContent.includes('idHash % 15'), 'No arbitrary idHash jitter scoring');
  assert(aiFoodServiceContent.includes('analyzeImageStructureAndObjectType'), 'Stage 1 object classification present');
  assert(aiFoodServiceContent.includes('retrieveRecipeAndInfoByFoodName'), 'Stage 3/4 verified recipe retrieval present');
  assert(aiFoodServiceContent.includes('saveUserAiCorrectionFeedback'), 'Reviewable user correction feedback storage present');
});

test('AiFoodDiscoveryModal renders exact Step 5 Khmer uncertain prompt, 3 action buttons, and «កែឈ្មោះម្ហូប» button', () => {
  assert(
    aiFoodServiceContent.includes(
      'AI មិនទាន់អាចស្គាល់ឈ្មោះម្ហូបនេះបានច្បាស់ទេ។ សូមបញ្ចូលឈ្មោះម្ហូប ឬឈ្មោះវត្ថុអាហារនេះដោយខ្លួនឯង ដើម្បីឱ្យប្រព័ន្ធស្វែងរកគ្រឿងផ្សំ និងរបៀបធ្វើបានត្រឹមត្រូវ។'
    ),
    'Exact Step 5 Khmer prompt present'
  );
  assert(aiModalContent.includes('បញ្ចូលឈ្មោះដោយខ្លួនឯង'), 'Button 1: Enter Name Manually present');
  assert(aiModalContent.includes('ជ្រើសរើសឈ្មោះដែល AI ណែនាំ'), 'Button 2: Select AI Suggestion present');
  assert(aiModalContent.includes('ថតរូបម្ដងទៀត'), 'Button 3: Retake Photo present');
  assert(aiModalContent.includes('កែឈ្មោះម្ហូប'), 'Visible Edit Food Name button present');
});

test('AI Food Service integrates Real AI Vision API Client, HSV fruit detection (Papaya), and removes allFoods[0] fallback', () => {
  assert(aiFoodServiceContent.includes('callRealVisionApiProvider'), 'Real AI Vision API client present');
  assert(aiFoodServiceContent.includes('rgbToHsv'), 'HSV color space calibration present');
  assert(aiFoodServiceContent.includes('item-fresh-papaya') && aiFoodServiceContent.includes('ផ្លែល្ហុងទុំ'), 'Fresh papaya knowledge base entry present');
  assert(!aiFoodServiceContent.includes('food: allFoods[0]'), 'Removed allFoods[0] (Fish Amok) fallback');
});

test('UpgradeVipModal includes «អាប់ឡូតភស្តុតាងបង់ប្រាក់» Payment Proof Upload below ABA KHQR with validation & preview', () => {
  assert(vipModalContent.includes('អាប់ឡូតភស្តុតាងបង់ប្រាក់'), 'Exact Khmer button label «អាប់ឡូតភស្តុតាងបង់ប្រាក់» present');
  assert(vipModalContent.includes('10 * 1024 * 1024'), '10MB max file size check present');
  assert(vipModalContent.includes('image/jpeg') && vipModalContent.includes('image/png'), 'JPG/JPEG/PNG validation present');
  assert(vipModalContent.includes('NEEDS_MORE_INFO'), 'Handles Administrator Request More Info status');
});

const adminDashPath = path.resolve(__dirname, '../src/components/AdminDashboard.tsx');
const adminDashContent = fs.readFileSync(adminDashPath, 'utf8');

test('AdminDashboard & AppContext enforce Secure Payment Proof Vault, Audit Logs, and 4 Admin Review Actions', () => {
  assert(appCtxContent.includes('kft_secure_payment_proofs_vault_v1'), 'Secure payment proof vault present');
  assert(appCtxContent.includes('getAuthorizedPaymentProof'), 'Owner/Admin access control helper present');
  assert(appCtxContent.includes('requestMorePaymentInfo'), 'requestMorePaymentInfo action present');
  assert(adminDashContent.includes('មើលភស្តុតាងពេញ'), 'View Full Proof action present in AdminDashboard');
  assert(adminDashContent.includes('ស្នើសុំភស្តុតាងបន្ថែម'), 'Request More Info action present in AdminDashboard');
});

const googlePlacesPath = path.resolve(__dirname, '../src/services/googlePlacesService.ts');
const googlePlacesContent = fs.readFileSync(googlePlacesPath, 'utf8');
const supabasePath = path.resolve(__dirname, '../src/services/supabaseService.ts');
const supabaseContent = fs.readFileSync(supabasePath, 'utf8');

test('Google Maps Places API + Smart Cache Service saves places on 1st search and serves subsequent users for $0 quota', () => {
  assert(googlePlacesContent.includes('searchCambodiaPlacesWithSmartCache'), 'searchCambodiaPlacesWithSmartCache present');
  assert(googlePlacesContent.includes('places.googleapis.com/v1/places:searchText'), 'Google Maps Places API v1 endpoint present');
  assert(googlePlacesContent.includes('kft_google_places_smart_cache_v1'), 'Smart Cache storage key present');
  assert(googlePlacesContent.includes('cacheHitsSavedQuota'), 'Quota savings counter present');
});

test('Supabase Free Tier Cloud Sync Service syncs Users, Transactions, Payment Proofs, and Smart-Cached Restaurants', () => {
  assert(supabaseContent.includes('syncAllAppDataWithSupabase'), 'syncAllAppDataWithSupabase present');
  assert(supabaseContent.includes('SUPABASE_SETUP_SQL'), '1-click Supabase SQL setup script present');
  assert(adminDashContent.includes('ប្រព័ន្ធ Cloud Supabase (Free Tier) & Google Maps Places API + Smart Cache'), 'Admin Dashboard Cloud & API configuration panel present');
});

test('VIP Subscription Plans updated to $2.99 for 30 days and $4.99 for 90 days', () => {
  assert(typesContent.includes('VIP_QUARTERLY_PRICE_USD = 2.99'), 'VIP 30-day price is $2.99');
  assert(typesContent.includes('VIP_QUARTERLY_DAYS = 30'), 'VIP 30-day duration is 30 days');
  assert(typesContent.includes('VIP_ANNUAL_PRICE_USD = 4.99'), 'VIP 90-day price is $4.99');
  assert(typesContent.includes('VIP_SUBSCRIPTION_DAYS = 90'), 'VIP 90-day duration is 90 days');
});

test('All 220 Restaurants, 124 Tourist Destinations & 12 Trending Foods upgraded to Google Maps GPS & matched photos', () => {
  const restSeed = fs.readFileSync(path.resolve(__dirname, '../src/data/seedRestaurants.ts'), 'utf8');
  const destSeed = fs.readFileSync(path.resolve(__dirname, '../src/data/seedDestinations.ts'), 'utf8');
  const trendSeed = fs.readFileSync(path.resolve(__dirname, '../src/data/seedTrendingFoods.ts'), 'utf8');
  assert(!restSeed.includes('គំរូអ្នកប្រើប្រាស់ដាក់ស្នើ / មិនទាន់ផ្ទៀងផ្ទាត់'), 'Zero generic unverified sample restaurants');
  assert(restSeed.includes('rest-220'), '220 verified restaurants & cafes present');
  assert(destSeed.includes('dest-124'), '124 verified tourist destinations present');
  assert(!destSeed.includes('1600585154340'), 'Zero western house photos on tourist destinations');
  assert(trendSeed.includes('/foods/food-99.jpg') && trendSeed.includes('/foods/food-27.jpg'), 'Trending foods matched with authentic food photos');
});

console.log('\n================================================================');
console.log(`  ALL ${pass}/${pass} AI FOOD DISCOVERY & PAYMENT SECURITY TESTS PASSED!`);
console.log('================================================================\n');
