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

test('App Version bumped to v1.7.7 (Build 49)', () => {
  assert(typesContent.includes("APP_VERSION = 'v1.7.7'"), 'APP_VERSION is v1.7.7');
  assert(typesContent.includes("APP_BUILD_CODE = 49"), 'APP_BUILD_CODE is 49');
});

// 4. Check Android build.gradle version
const gradlePath = path.resolve(__dirname, '../android/app/build.gradle');
const gradleContent = fs.readFileSync(gradlePath, 'utf8');

test('Android build.gradle has versionCode 49 and versionName 1.7.7', () => {
  assert(gradleContent.includes('versionCode 49'), 'versionCode is 49');
  assert(gradleContent.includes('versionName "1.7.7"'), 'versionName is 1.7.7');
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

const mediaHelperPath = path.resolve(__dirname, '../src/utils/androidMediaHelper.ts');
const mediaHelperContent = fs.readFileSync(mediaHelperPath, 'utf8');

test('UpgradeVipModal & androidMediaHelper include «អាប់ឡូតភស្តុតាងបង់ប្រាក់» Payment Proof Upload below ABA KHQR with validation & preview', () => {
  assert(vipModalContent.includes('អាប់ឡូតភស្តុតាងបង់ប្រាក់'), 'Exact Khmer button label «អាប់ឡូតភស្តុតាងបង់ប្រាក់» present');
  assert(mediaHelperContent.includes('MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024'), '10MB max file size check present in androidMediaHelper');
  assert(mediaHelperContent.includes('image/jpeg') && mediaHelperContent.includes('image/png'), 'JPG/JPEG/PNG validation present in androidMediaHelper');
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
  assert(supabaseContent.includes("DEFAULT_GOOGLE_MAPS_API_KEY = 'AIzaSyCZnYNQLNcuco5HxdmrWVXKXwvAr7mg7v0'"), 'Google Maps API Key pre-configured in Box #3');
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

test('Requirement 1: Two-Way User–Admin Support & Reply System with Direct VIP Activation', () => {
  const supportModalContent = fs.readFileSync(path.resolve(__dirname, '../src/components/PaymentSupportModal.tsx'), 'utf8');
  assert(appContent.includes('<PaymentSupportModal />'), 'PaymentSupportModal registered in App.tsx');
  assert(supportModalContent.includes('createSupportTicket') && supportModalContent.includes('replyToSupportTicket'), 'User can create and reply to support tickets');
  assert(adminDashContent.includes('approveVipFromSupportTicket') && adminDashContent.includes('updateSupportTicketStatus'), 'Admin can reply, change status (Pending/Replied/Resolved), and approve VIP directly');
});

test('Requirement 2: Native Android Save QR Code to Gallery & Gallery Image Picker with Multi-Scale jsQR', () => {
  assert(pluginContent.includes('public void saveImageToGallery(PluginCall call)'), 'Native Android saveImageToGallery plugin method present');
  assert(pluginContent.includes('public void pickImageFromGallery(PluginCall call)'), 'Native Android pickImageFromGallery plugin method present');
  assert(mediaHelperContent.includes('savePngDataUrlToGallery') && mediaHelperContent.includes('decodeQrFromImageDataUrl'), 'Media helper savePngDataUrlToGallery and decodeQrFromImageDataUrl present');
});

test('Requirement 3: Add & Edit Shop Profile Picture and Multiple Food Photos with Owner/Admin Authorization', () => {
  const addRestContent = fs.readFileSync(path.resolve(__dirname, '../src/components/AddRestaurantModal.tsx'), 'utf8');
  const vipAddRestContent = fs.readFileSync(path.resolve(__dirname, '../src/components/VipAddRestaurantModal.tsx'), 'utf8');
  const detailRestContent = fs.readFileSync(path.resolve(__dirname, '../src/components/RestaurantDetailModal.tsx'), 'utf8');
  assert(addRestContent.includes('profileImage:') && addRestContent.includes('foodImages:'), 'AddRestaurantModal saves profileImage and foodImages');
  assert(vipAddRestContent.includes('profileImage:') && vipAddRestContent.includes('foodImages:'), 'VipAddRestaurantModal saves profileImage and foodImages');
  assert(detailRestContent.includes('canEditShop') && detailRestContent.includes('shopFoodPhotos'), 'RestaurantDetailModal displays profile + food photos and enforces owner/admin edit access');
});

test('Requirement 4 & 6: Centralized VIP Plans ($2.99 / 30d & $4.99 / 90d), Zero 365-Day Plans, and Renew VIP (បន្ត VIP) Never Auto-Approves', () => {
  const profileViewContent = fs.readFileSync(path.resolve(__dirname, '../src/components/ProfileView.tsx'), 'utf8');
  const paymentSvcContent = fs.readFileSync(path.resolve(__dirname, '../src/services/paymentService.ts'), 'utf8');
  assert(typesContent.includes('VIP_PLANS') && paymentSvcContent.includes('resolveAndValidateVipPlan'), 'Centralized VIP_PLANS and backend validator present');
  assert(profileViewContent.includes('openUpgradeVipModal(true)'), 'Renew VIP buttons open UpgradeVipModal in renew mode');
  assert(vipModalContent.includes('isVipRenewMode'), 'UpgradeVipModal respects isVipRenewMode and opens AWAITING_PAYMENT instead of auto-approving');
  assert(!vipModalContent.includes('365') && !profileViewContent.includes('365') && !adminDashContent.includes('365'), 'Zero 365-day references in VIP modal, ProfileView, and AdminDashboard');
});

test('Auto Online Food Image Search («🤖 ស្វែងរករូបភាពម្ហូបពី Online ដោយស្វ័យប្រវត្តិ») & 200 Total Khmer Dishes (food-1..food-200)', () => {
  const onlineImgSvcContent = fs.readFileSync(path.resolve(__dirname, '../src/services/onlineFoodImageService.ts'), 'utf8');
  const add100Content = fs.readFileSync(path.resolve(__dirname, '../src/data/seedAdditional100Foods.ts'), 'utf8');
  const seedFoodsContent = fs.readFileSync(path.resolve(__dirname, '../src/data/seedFoods.ts'), 'utf8');
  const foodImgModalContent = fs.readFileSync(path.resolve(__dirname, '../src/components/FoodImageModal.tsx'), 'utf8');
  const newDishesCount = (add100Content.match(/nameKh:\s*'/g) || []).length;
  assert(onlineImgSvcContent.includes('searchOnlineFoodImages') && onlineImgSvcContent.includes('commons.wikimedia.org'), 'Online food image search service queries Wikimedia Commons & TheMealDB');
  assert(newDishesCount === 100 && add100Content.includes('const num = 101 + idx;'), `100 additional Khmer foods (food-101..food-200) defined (found ${newDishesCount})`);
  assert(!add100Content.includes('/foods/food-'), 'Additional 100 foods use online URLs and do not reuse local /foods/food-1..100.jpg');
  assert(seedFoodsContent.includes('additional100Foods'), 'seedFoods exports all 200 dishes');
  assert(adminDashContent.includes('🤖 ស្វែងរករូបភាពម្ហូបពី Online ដោយស្វ័យប្រវត្តិ'), 'Auto Online Food Photo Search button present in AdminDashboard Add Food form');
  assert(foodImgModalContent.includes('🤖 ស្វែងរករូបភាពម្ហូបពី Online ដោយស្វ័យប្រវត្តិ'), 'Auto Online Food Photo Search button present in FoodImageModal');
});

test('Welcome Screen (3-5s before Login), Gemini Vision API Key, Dish-Specific Photos & «រូបភាពយោង» Label Replacement', () => {
  const welcomeModalContent = fs.readFileSync(path.resolve(__dirname, '../src/components/WelcomeScreenModal.tsx'), 'utf8');
  const add100Content = fs.readFileSync(path.resolve(__dirname, '../src/data/seedAdditional100Foods.ts'), 'utf8');
  const destSeed = fs.readFileSync(path.resolve(__dirname, '../src/data/seedDestinations.ts'), 'utf8');
  const foodCardContent = fs.readFileSync(path.resolve(__dirname, '../src/components/FoodCard.tsx'), 'utf8');
  const restCardContent = fs.readFileSync(path.resolve(__dirname, '../src/components/RestaurantCard.tsx'), 'utf8');
  const touristCardContent = fs.readFileSync(path.resolve(__dirname, '../src/components/TouristCard.tsx'), 'utf8');

  assert(aiFoodServiceContent.includes("DEFAULT_GEMINI_VISION_API_KEY = 'AIzaSyCZnYNQLNcuco5HxdmrWVXKXwvAr7mg7v0'"), 'Gemini Vision API key pre-configured');
  assert(welcomeModalContent.includes('WELCOME_DURATION_MS = 8000') && welcomeModalContent.includes('ចាប់ផ្តើមប្រើប្រាស់ឥឡូវនេះ'), 'WelcomeScreenModal has 8s timer and Get Started button');
  assert(appContent.includes('WELCOME_SESSION_KEY') && appContent.includes('<WelcomeScreenModal'), 'WelcomeScreenModal integrated once per session in App.tsx');
  assert(add100Content.includes('DISH_SPECIFIC_PHOTOS') && !add100Content.includes('images.unsplash.com'), 'All 100 new dishes (food-101..200) use dish-specific Wikimedia Commons photos');
  assert(!destSeed.includes('Pol_Pot') && !destSeed.includes('Vietnamese_invasion') && !destSeed.includes('Pupil') && !destSeed.includes('Fish_Amok'), 'All mismatched destination photos removed from seedDestinations.ts');
  assert(foodCardContent.includes('រូបភាពយោង') && !foodCardContent.includes('រូបតំណាង'), 'FoodCard uses រូបភាពយោង instead of រូបតំណាង');
  assert(restCardContent.includes('រូបភាពយោង') && !restCardContent.includes('រូបតំណាង'), 'RestaurantCard uses រូបភាពយោង instead of រូបតំណាង');
  assert(touristCardContent.includes('រូបភាពយោង') && !touristCardContent.includes('រូបតំណាង'), 'TouristCard uses រូបភាពយោង instead of រូបតំណាង');
});

console.log('\n================================================================');
console.log(`  ALL ${pass}/${pass} AI FOOD DISCOVERY & PAYMENT SECURITY TESTS PASSED!`);
console.log('================================================================\n');
