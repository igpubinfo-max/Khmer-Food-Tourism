#!/usr/bin/env node
/**
 * scripts/verifyUserDataSafety.mjs â€” fast, offline checks for the user-data safety rules and for the
 * source-code CONTRACTS that prevent the "user list vanished after update" regression from coming back.
 *
 *   npm run test:users:safety
 *
 * Imports the real pure module (src/utils/userDataSafety.ts) via Node's built-in TypeScript type stripping.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = await import(pathToFileURL(path.join(ROOT, 'src', 'utils', 'userDataSafety.ts')).href);
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
let passed = 0;
const ok = (name, fn) => {
  fn();
  passed++;
  console.log(`  âœ“ ${name}`);
};

console.log('[user-data-safety] pure rules');
ok('aggregate push: 100 -> 2 users is BLOCKED', () => {
  const d = S.evaluateAggregatePush({ key: 'kft_cloud_users_v2', payload: new Array(2).fill({}), baselineCount: 100 });
  assert.equal(d.allow, false);
  assert.equal(d.reason, 'shrink_blocked');
});
ok('aggregate push: 100 -> 85 users (normal churn) is allowed', () => {
  assert.equal(S.evaluateAggregatePush({ key: 'kft_cloud_users_v2', payload: new Array(85).fill({}), baselineCount: 100 }).allow, true);
});
ok('aggregate push: boundary 100 -> 80 allowed, 100 -> 79 blocked', () => {
  assert.equal(S.evaluateAggregatePush({ key: 'kft_cloud_users_v1', payload: new Array(80).fill({}), baselineCount: 100 }).allow, true);
  assert.equal(S.evaluateAggregatePush({ key: 'kft_cloud_users_v1', payload: new Array(79).fill({}), baselineCount: 100 }).allow, false);
});
ok('aggregate push: tiny deployments (<5 users) are not blocked', () => {
  assert.equal(S.evaluateAggregatePush({ key: 'kft_cloud_users_v2', payload: [], baselineCount: 4 }).allow, true);
});
ok('aggregate push: explicit admin override is honoured', () => {
  const d = S.evaluateAggregatePush({ key: 'kft_cloud_users_v2', payload: [], baselineCount: 100, allowDestructive: true });
  assert.equal(d.allow, true);
  assert.equal(d.reason, 'destructive_override');
});
ok('aggregate push: non-array payload is rejected, > 2500 users skipped as success', () => {
  assert.equal(S.evaluateAggregatePush({ key: 'kft_cloud_users_v2', payload: { a: 1 }, baselineCount: 10 }).allow, false);
  const big = S.evaluateAggregatePush({ key: 'kft_cloud_users_v2', payload: new Array(2501).fill({}), baselineCount: 2500 });
  assert.equal(big.allow, false);
  assert.equal(big.treatAsSuccess, true);
});
ok('non-aggregate keys are never touched by the aggregate guard', () => {
  assert.equal(S.evaluateAggregatePush({ key: 'kft_user_abc', payload: {}, baselineCount: 100 }).reason, 'not_aggregate');
});
ok('critical-key classifier', () => {
  for (const k of ['kft_user_x', 'kft_cloud_users_v2', 'kft_cloud_vip_backup_v1', 'kft_cloud_deleted_users_v1', 'kft_cloud_transactions_v1']) assert.equal(S.isUserCriticalKey(k), true, k);
  for (const k of ['kft_ov_food_1', 'kft_avatar_1', 'kft_cloud_app_settings_v1']) assert.equal(S.isUserCriticalKey(k), false, k);
});
ok('shrink assessment: 500 -> 3 critical, 10 -> 9 warn, 10 -> 10 ok, tiny lists never critical', () => {
  assert.equal(S.assessUserCountShrink(500, 3).level, 'critical');
  assert.equal(S.assessUserCountShrink(10, 9).level, 'warn');
  assert.equal(S.assessUserCountShrink(10, 10).level, 'ok');
  assert.notEqual(S.assessUserCountShrink(3, 0).level, 'critical');
});
ok('cursor plan: no cursor => full; healthy => delta with overlap; suspiciously small local copy => full re-pull', () => {
  assert.equal(S.planUserCursorSync({ cursorIso: null, localCount: 100, baselineCount: 100 }).mode, 'full');
  const delta = S.planUserCursorSync({ cursorIso: '2026-11-07T00:10:00.000Z', localCount: 100, baselineCount: 100 });
  assert.equal(delta.mode, 'delta');
  assert.equal(delta.sinceIso, '2026-11-07T00:08:00.000Z');
  assert.equal(S.planUserCursorSync({ cursorIso: '2026-11-07T00:10:00.000Z', localCount: 2, baselineCount: 100 }).mode, 'full');
});
ok('pagination offsets: 10,000 users = 10 pages, 25,500 = 26, bounded', () => {
  assert.equal(S.buildPageOffsets(10000).length, 10);
  assert.equal(S.buildPageOffsets(25500).length, 26);
  assert.ok(S.buildPageOffsets(1e12).length <= S.MAX_PREFIX_PAGES);
});
ok('outbox: latest write wins per key and user rows survive eviction', () => {
  let q = [];
  q = S.mergeOutboxEntry(q, { key: 'kft_user_a', payload: 1, queuedAt: 'x', attempts: 0 }, 3);
  q = S.mergeOutboxEntry(q, { key: 'kft_user_a', payload: 2, queuedAt: 'y', attempts: 0 }, 3);
  assert.equal(q.length, 1);
  assert.equal(q[0].payload, 2);
  q = S.mergeOutboxEntry(q, { key: 'kft_cloud_transactions_v1', payload: [], queuedAt: 'z', attempts: 0 }, 3);
  q = S.mergeOutboxEntry(q, { key: 'kft_user_b', payload: 1, queuedAt: 'z', attempts: 0 }, 3);
  q = S.mergeOutboxEntry(q, { key: 'kft_user_c', payload: 1, queuedAt: 'z', attempts: 0 }, 3);
  assert.equal(q.length, 3);
  assert.ok(q.some((e) => e.key === 'kft_user_a') && q.some((e) => e.key === 'kft_user_c'));
});

console.log('[user-data-safety] scale (10,000 / 50,000 users)');
const mk = (i) => ({ id: `u${i}`, email: `u${i}@x.com`, role: i % 50 === 0 ? 'owner' : 'user', createdAt: '2026-01-01', ...(i % 7 === 0 ? { membershipTier: 'premium_vip', subscriptionStatus: 'active', subscriptionExpiryDate: new Date(Date.now() + 864e5 * 20).toISOString() } : {}) });
ok('integrity analysis of 50,000 users completes < 1.5 s and finds injected defects', () => {
  const users = Array.from({ length: 50000 }, (_, i) => mk(i));
  users.push({ ...mk(5), email: 'dup@x.com' }, { ...mk(6), email: 'u5@x.com' }, { email: 'noid@x.com' }, { id: 'nodate', email: 'nd@x.com', role: 'user' });
  const t0 = performance.now();
  const r = S.analyzeUserListIntegrity(users, Date.now(), 'u10');
  const ms = performance.now() - t0;
  assert.ok(ms < 1500, `took ${ms.toFixed(0)}ms`);
  assert.equal(r.stats.total, users.length);
  assert.ok(r.issues.some((i) => i.code === 'duplicate_id'));
  assert.ok(r.issues.some((i) => i.code === 'duplicate_email'));
  assert.ok(r.issues.some((i) => i.code === 'missing_id'));
  assert.ok(r.issues.some((i) => i.code === 'missing_created_at'));
  assert.ok(r.stats.vipActive > 7000);
  console.log(`      (50,004 records analysed in ${ms.toFixed(0)} ms)`);
});
ok('integrity analysis flags a signed-in user missing from the list', () => {
  const r = S.analyzeUserListIntegrity([mk(1)], Date.now(), 'someone-else');
  assert.ok(r.issues.some((i) => i.code === 'current_user_missing_from_list'));
});

console.log('[user-data-safety] source contracts (fail the build if a regression is re-introduced)');
const supa = read('src/services/supabaseService.ts');
ok('pushCloudDocument runs the aggregate shrink guard and the durable outbox', () => {
  const body = supa.slice(supa.indexOf('export async function pushCloudDocument('), supa.indexOf('const CLOUD_OUTBOX_KEY'));
  assert.ok(body.includes('evaluateAggregatePush('), 'aggregate guard missing');
  assert.ok(body.includes('enqueueCloudOutbox('), 'outbox missing');
  assert.ok(body.includes('x-kft-allow-destructive'), 'explicit-destructive header missing');
});
ok('prefix pulls are paginated (no hard limit=1000 request)', () => {
  const body = supa.slice(supa.indexOf('export async function pullCloudDocumentsByPrefix'), supa.indexOf('export async function fetchServerUserCounts'));
  assert.ok(body.includes('PREFIX_PAGE_SIZE') && body.includes('offset='), 'pagination missing');
  assert.ok(!/&limit=1000['"`]/.test(body), 'hard 1000 cap came back');
});
ok('login (upsertSingleUserToCloud) never rewrites the whole-list aggregate', () => {
  const body = supa.slice(supa.indexOf('export async function upsertSingleUserToCloud'), supa.indexOf('export interface ServerPaginatedUsersRequest'));
  assert.ok(!/pushCloudDocument\(\s*'kft_cloud_users_v[12]'/.test(body), 'login rewrites the aggregate again');
});
ok('sync pushes aggregates only after a trusted (successful) read', () => {
  const body = supa.slice(supa.indexOf('export async function syncAllAppDataWithSupabase'), supa.indexOf('export const SUPABASE_SETUP_SQL'));
  assert.ok(/wasCloudPullOk\('kft_cloud_users_v2'\)/.test(body), 'trusted-read check missing for users aggregate');
  assert.ok(/wasCloudPullOk\('kft_cloud_deleted_users_v1'\)/.test(body), 'trusted-read check missing for tombstones');
});
const main = read('src/main.tsx');
ok('main.tsx keeps the markers the migration test harness extracts + audits every upgrade', () => {
  assert.ok(main.includes('// 0. Pre-boot cache sanitation'));
  assert.ok(main.includes('// 2b. Protect original food photography'));
  assert.ok(main.includes('kft_upgrade_audit_log_v1'));
  assert.ok(!/localStorage\.clear\(\)/.test(main), 'localStorage.clear() must never run at boot');
});
ok('no source file wipes localStorage wholesale or recreates the users key as empty on boot', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [path.join(d, e.name)] : []));
  const offenders = [];
  for (const f of walk(path.join(ROOT, 'src'))) {
    const t = fs.readFileSync(f, 'utf8');
    if (/localStorage\.clear\(\)/.test(t) || /window\.localStorage\.clear\(\)/.test(t)) offenders.push(path.relative(ROOT, f));
  }
  assert.deepEqual(offenders, [], `localStorage.clear() found in ${offenders.join(', ')}`);
});
ok('user storage key is consistent across boot migration, AppContext and the integrity guard', () => {
  for (const f of ['src/main.tsx', 'src/context/AppContext.tsx', 'src/utils/securityIntegrityGuard.ts']) assert.ok(read(f).includes("'kft_users_v5'"), `${f} must use kft_users_v5`);
  assert.ok(main.includes("'kft_users_v4'"), 'legacy v4 -> v5 migration must remain');
});
ok('origin fingerprint unchanged (changing appId / iOS scheme / android scheme resets ALL WebView storage on update)', () => {
  const fp = JSON.parse(read('scripts/origin-fingerprint.json'));
  const cap = read('capacitor.config.ts');
  assert.ok(cap.includes(`appId: '${fp.appId}'`), `appId changed (expected ${fp.appId})`);
  assert.ok(cap.includes(`scheme: '${fp.iosScheme}'`), `ios.scheme changed (expected ${fp.iosScheme})`);
  assert.equal(/androidScheme/.test(cap), fp.androidSchemeConfigured, 'android.androidScheme configuration changed');
  assert.equal(/hostname\s*:/.test(cap), fp.serverHostnameConfigured, 'server.hostname configuration changed');
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  assert.ok(manifest.includes('android:allowBackup="false"') === fp.androidAllowBackupFalse, 'allowBackup flag changed');
});
ok('server migration contains the guard, archive, snapshot and restore objects', () => {
  const sql = read('supabase_user_data_safety_v1.sql');
  for (const needle of ['a_kft_kv_guard', 'b_kft_kv_archive', 'kft_app_kv_history', 'kft_create_snapshot', 'kft_restore_missing_users_from_snapshot', 'kft_users_integrity_report', 'x-kft-allow-destructive']) assert.ok(sql.includes(needle), needle);
  const sqlCode = sql.split(/\r?\n/).filter((l) => !l.trim().startsWith('--')).join('\n');
  assert.ok(!/DROP\s+TABLE|TRUNCATE|DELETE\s+FROM\s+public\.kft_app_kv_store/i.test(sqlCode), 'migration must be non-destructive');
});

ok('no hard-coded personal account is injected into the user list', () => {
  assert.ok(!supa.includes('verifiedInvitedTesters'), 'hard-coded tester injection came back');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [path.join(d, e.name)] : []));
  const offenders = walk(path.join(ROOT, 'src')).filter((f) => /ponnakka/i.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(ROOT, f));
  assert.deepEqual(offenders, [], `hard-coded personal account found in ${offenders.join(', ')}`);
});
ok('public ntfy.sh failover is an allow-list of non-personal keys only', () => {
  const start = supa.indexOf('export function isKeyEligibleForSecondaryFailover');
  const body = supa.slice(start, supa.indexOf('function compactUserForInlineSecondarySync'));
  assert.ok(start > 0, 'eligibility function missing/not exported');
  for (const banned of ['kft_user_', 'kft_avatar_', 'kft_proof_', 'users_v', 'vip_backup', 'deleted_users', 'transactions', 'support_tickets', 'app_settings', 'vip_pricing', 'admin_pin', 'reward_claims', 'custom_restaurants', 'media_overrides', 'kft_ov_rest_']) {
    assert.ok(!body.includes(banned), `personal/secret key "${banned}" must not be eligible for the public ntfy channel`);
  }
  assert.ok(/pullCloudDocumentsByPrefix[\s\S]*?const eligibleForFailover = isKeyEligibleForSecondaryFailover\(prefix\)/.test(supa), 'prefix pull must use the same allow-list');
  assert.ok(supa.includes('if (!isKeyEligibleForSecondaryFailover(k)) continue;') && supa.includes('if (!isKeyEligibleForSecondaryFailover(k)) return;'), 'ingestion filters for pulled/streamed ntfy messages missing');
});
ok('personal images (avatars, payment proofs) and catalog photos are never uploaded to the public ntfy media CDN', () => {
  const t = read('src/services/cloudImageStorageService.ts');
  const fnStart = t.indexOf('export async function uploadBlobToSecondaryCloudCdn');
  const fnBody = t.slice(fnStart, t.indexOf('}', fnStart) + 1);
  assert.ok(fnStart > 0 && !fnBody.includes('fetch(') && fnBody.includes('return null;'), 'ntfy media uploader must remain a disabled no-op');
  assert.ok(!/await\s+uploadBlobToSecondaryCloudCdn\(/.test(t), 'uploadImageToPermanentCloud must never invoke ntfy binary upload');
});

console.log(`\n[user-data-safety] ALL ${passed} CHECKS PASSED`);
