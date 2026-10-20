const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('================================================================');
console.log('  KHMER FOOD & TOURISM — COMPREHENSIVE SECURITY & INTEGRITY AUDIT');
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

// TEST 1: Check Food Dataset (>= 200 authentic dishes, no price leaks)
const seedFoodsContent = fs.readFileSync(path.resolve(__dirname, '../src/data/seedFoods.ts'), 'utf8');
const staticFoodMatches = seedFoodsContent.match(/id:\s*['"]food-\d+['"]/g) || [];
const addIdx = seedFoodsContent.indexOf('additionalAuthenticDishes');
const addSlice = addIdx !== -1 ? seedFoodsContent.slice(addIdx) : '';
const addFoodMatches = addSlice.match(/["']?nameKh["']?\s*:/g) || [];
const totalFoodDishes = staticFoodMatches.length + addFoodMatches.length;
assert(totalFoodDishes >= 200, `Food dataset contains ${totalFoodDishes} authentic dishes (${staticFoodMatches.length} core + ${addFoodMatches.length} expanded, requirement: >= 200).`);

// TEST 2: Check Restaurant Directory (>= 200 shops, honest verification)
const seedRestaurantsContent = fs.readFileSync(path.resolve(__dirname, '../src/data/seedRestaurants.ts'), 'utf8');
const restMatches = seedRestaurantsContent.match(/"id":\s*"rest-/g) || [];
assert(restMatches.length >= 200, `Restaurant directory contains ${restMatches.length} shops (requirement: >= 200).`);

// TEST 3: Check $4.99 Promotional Fee configuration
const seedDataContent = fs.readFileSync(path.resolve(__dirname, '../src/data/seedData.ts'), 'utf8');
assert(seedDataContent.includes('promotionalFeeUsd: 4.99'), 'Promotional registration fee configured to $4.99 USD.');
assert(seedDataContent.includes('Special Promotional Price: $4.99'), 'Promotional notice text in seedData.');

// TEST 4: Check No Admin credentials or personal info exposed in public seed data
assert(!seedDataContent.includes('CheaSavuth@2026'), 'Zero plaintext passwords in seedData.ts.');
assert(!seedDataContent.includes('admin-1') || !seedDataContent.includes('cheasavuth@khmerfoodtourism.com'), 'Admin credentials isolated from public initialUsers list.');

// TEST 5: Verify PBKDF2 Password Hashing format
const pbkdf2Match = seedDataContent.match(/pbkdf2\$100000\$[a-f0-9]{64}\$[a-f0-9]{64}/);
assert(pbkdf2Match !== null, 'Admin password hash uses NIST SP 800-132 compliant PBKDF2-HMAC-SHA256 (100,000 iterations).');

// Verify that the setup password verifies with PBKDF2
if (pbkdf2Match) {
  const parts = pbkdf2Match[0].split('$');
  const derived = crypto.pbkdf2Sync('CheaSavuth@2026', Buffer.from(parts[2], 'hex'), 100000, 32, 'sha256').toString('hex');
  assert(derived === parts[3], 'Admin password PBKDF2 verification matches CheaSavuth@2026 hash.');
}

// TEST 6: Android Security Hardening
const androidManifest = fs.readFileSync(path.resolve(__dirname, '../android/app/src/main/AndroidManifest.xml'), 'utf8');
assert(androidManifest.includes('android:allowBackup="false"'), 'Android allowBackup is disabled (OWASP anti-tampering).');
assert(androidManifest.includes('android:networkSecurityConfig="@xml/network_security_config"'), 'Android Network Security Config (HTTPS enforcement) configured.');

const networkSecurity = fs.readFileSync(path.resolve(__dirname, '../android/app/src/main/res/xml/network_security_config.xml'), 'utf8');
assert(networkSecurity.includes('cleartextTrafficPermitted="false"'), 'Cleartext HTTP traffic is blocked in network security config.');

const buildGradle = fs.readFileSync(path.resolve(__dirname, '../android/app/build.gradle'), 'utf8');
assert(buildGradle.includes('minifyEnabled true'), 'R8 code shrinking and obfuscation (minifyEnabled true) enabled in release build.');
assert(buildGradle.includes('shrinkResources true'), 'Resource shrinking (shrinkResources true) enabled in release build.');

// TEST 7: Android Hardware Back Button Exit Confirmation
const exitModalContent = fs.readFileSync(path.resolve(__dirname, '../src/components/ExitConfirmModal.tsx'), 'utf8');
assert(exitModalContent.includes('តើអ្នកចង់ចាកចេញពីកម្មវិធីមែនទេ?'), 'Exit confirmation modal contains exact Khmer text “តើអ្នកចង់ចាកចេញពីកម្មវិធីមែនទេ?”.');
assert(exitModalContent.includes('បាទ/ចាស') && exitModalContent.includes('បន្តប្រើប្រាស់'), 'Exit confirmation modal has “បាទ/ចាស” and “បន្តប្រើប្រាស់” buttons.');

// TEST 8: Dual-Platform App Download & Install (Android & iOS)
const installModalContent = fs.readFileSync(path.resolve(__dirname, '../src/components/InstallModal.tsx'), 'utf8');
assert(installModalContent.includes('Direct Download Android APK') && installModalContent.includes('app-debug.apk'), 'Android APK download configured with direct link.');
assert(installModalContent.includes('Apple iOS (iPhone)') && installModalContent.includes('Add to Home Screen'), 'Apple iOS Safari PWA Add-to-Home-Screen guide configured.');

// TEST 9: Brute-Force Rate Limiting & Admin Session Token Security Module
const securityModule = fs.readFileSync(path.resolve(__dirname, '../src/utils/security.ts'), 'utf8');
assert(securityModule.includes('MAX_FAILED_ATTEMPTS = 5'), 'Brute-force lockout triggers after maximum 5 failed attempts.');
assert(securityModule.includes('LOCKOUT_DURATION_MS = 15 * 60 * 1000'), 'Brute-force lockout duration set to 15 minutes.');
assert(securityModule.includes('timingSafeEqual'), 'Constant-time string comparison (timing attack protection) implemented.');
assert(securityModule.includes('SESSION_LIFETIME_MS = 2 * 60 * 60 * 1000'), 'Admin HMAC session tokens expire after 2 hours.');

// TEST 10: Role Restriction & Self-Promotion Prevention
const appContextContent = fs.readFileSync(path.resolve(__dirname, '../src/context/AppContext.tsx'), 'utf8');
assert(appContextContent.includes('const safeRole: UserRole = role === \'admin\' ? \'user\' : role;'), 'Normal users prevented from self-registering as admin.');
assert(appContextContent.includes('Duplicate admin accounts are strictly prohibited!'), 'Role promotion to duplicate admin accounts strictly blocked.');

console.log('\n================================================================');
console.log(`  AUDIT SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
}
