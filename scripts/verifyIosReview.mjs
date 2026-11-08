/* Apple App Store review contract checks - run: npm run test:ios (pure source checks, no network, no Xcode needed) */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
let passed = 0;
const ok = (name, fn) => {
  fn();
  passed++;
  console.log('  \u2713 ' + name);
};

console.log('[ios-review] Guideline 4.8 / 2.3 - no fake "Sign in with Apple"');
ok('AuthModal has no home-made Apple login (no fabricated privaterelay.appleid.com address)', () => {
  const t = read('src/components/AuthModal.tsx');
  assert.ok(!/apple_in_app|handleAppleSignInSubmit|appleRelayMode|privaterelay\.appleid\.com/.test(t));
});
ok('Google OAuth (blocked in embedded WebViews) is hidden in the native iOS app', () => {
  const t = read('src/components/AuthModal.tsx');
  assert.ok(t.includes('isNativeIosApp') && /!isNativeIosApp\(\) && \(/.test(t));
});

console.log('[ios-review] Guideline 3.1.1 - no external payment / donation inside the iOS app');
ok('"Support App" (KHQR donation) menu item and modal are disabled in the native iOS app', () => {
  assert.ok(/!isNativeIosApp\(\) && \(\s*<button[\s\S]*?setIsSupportModalOpen\(true\)/.test(read('src/components/Header.tsx')));
  assert.ok(read('src/components/SupportModal.tsx').includes('if (!isSupportModalOpen || isNativeIosApp()) return null;'));
});
ok('?platform=ios / ?ios_review=1 only works on localhost (cannot unlock VIP for web visitors)', () => {
  const t = read('src/types/index.ts');
  assert.ok(/isLocalDev && \(search\.includes\('ios_review=1'\)/.test(t));
  assert.ok(!/^\s*if \(search\.includes\('ios_review=1'\)[^\n]*return true;/m.test(t));
});

console.log('[ios-review] Guideline 5.1.1(v) - account deletion must really delete');
ok('Privacy Policy "Delete My Account & Data Now" calls deleteUserAccount (it used to only log out)', () => {
  const t = read('src/components/PrivacyPolicyModal.tsx');
  assert.ok(t.includes('await deleteUserAccount(currentUser.id)'));
  assert.ok(!/\blogout\(\)/.test(t), 'must not merely log the user out and claim the account was deleted');
});
ok('Profile > Settings has a visible "Delete My Account & Data" button wired to handleSelfDeleteAccount', () => {
  const t = read('src/components/ProfileView.tsx');
  assert.ok(/onClick=\{handleSelfDeleteAccount\}/.test(t));
});

console.log('[ios-review] Guideline 5.1.2(i) - consent before third-party AI');
ok('askFoodAssistant asks for explicit permission before any data leaves the device', () => {
  const t = read('src/services/foodAssistantLlm.ts');
  assert.ok(t.includes("from './aiConsent'") && t.includes('ensureAiConsent(consentText)'));
  assert.ok(t.indexOf('ensureAiConsent(consentText)') < t.indexOf('const key = resolveGeminiApiKey(params.geminiApiKey);'));
  const c = read('src/services/aiConsent.ts');
  assert.ok(c.includes('kft_ai_consent_v1') && c.includes('export function revokeAiConsent'));
});

console.log('[ios-review] iOS project / metadata');
ok('Info.plist: consistent app name and no payment wording (payments are not offered on iOS)', () => {
  const t = read('ios/App/App/Info.plist');
  assert.ok(!/Discover Cambodia Food/.test(t));
  assert.ok(!/payment|KHQR|receipt/i.test(t));
  for (const k of ['NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription', 'NSPhotoLibraryAddUsageDescription', 'NSLocationWhenInUseUsageDescription']) assert.ok(t.includes(k), k);
});
ok('PrivacyInfo.xcprivacy exists, declares no tracking, and is part of the Xcode target', () => {
  const m = read('ios/App/App/PrivacyInfo.xcprivacy');
  assert.ok(/<key>NSPrivacyTracking<\/key>\s*<false\/>/.test(m));
  const p = read('ios/App/App.xcodeproj/project.pbxproj');
  assert.equal((p.match(/7A5B1C0E2D3F4A5B6C7D8E01/g) || []).length, 3, 'file reference: definition + build file + group');
  assert.equal((p.match(/7A5B1C0E2D3F4A5B6C7D8E02/g) || []).length, 2, 'build file: definition + Resources phase');
  assert.equal(p.split('{').length, p.split('}').length, 'pbxproj braces must stay balanced');
});
ok('public privacy policy names the real processors, the AI consent and the deletion path', () => {
  const t = read('public/privacy-policy.html');
  for (const k of ['Supabase', 'Google Maps Platform', 'Gemini', 'OpenAI', 'Face ID', 'Data Retention', 'Delete My Account']) assert.ok(t.includes(k), k);
  assert.ok(!t.includes('Ver. 2.5.9'));
});
ok('App Store Connect review notes do not claim a "Sign in with Apple" button or an IAP that the app lacks', () => {
  const t = read('scripts/update-asc-review-notes.mjs');
  assert.ok(!/Added "Sign in with Apple"/.test(t));
  assert.ok(t.includes('Delete My Account & Data'));
  assert.ok(t.includes('Support/donation screen is not shown on iOS'));
});

console.log(`\n[ios-review] ALL ${passed} CHECKS PASSED`);
