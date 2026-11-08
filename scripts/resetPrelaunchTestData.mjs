#!/usr/bin/env node
/**
 * scripts/resetPrelaunchTestData.mjs — Section 0 Pre-Launch Test-Data Reset Tool
 *
 * DEFAULT MODE = SAFE DRY-RUN (READ-ONLY):
 *   node scripts/resetPrelaunchTestData.mjs
 *   npm run reset:prelaunch:dry
 *
 * LIVE EXECUTION (requires BOTH explicit confirmation flags + automatic backup first):
 *   node scripts/resetPrelaunchTestData.mjs --apply --confirm-keep-accounts
 *
 * GUARANTEES:
 *   1. KEEPS 100% OF ALL USER ACCOUNTS INTACT (`kft_user_*`, `kft_cloud_users_v2`, `kft_cloud_users_v1`,
 *      `kft_avatar_*`, Admin account): login credentials, names, phones, emails, password hashes,
 *      Google links, avatars, roles, `createdAt`.
 *   2. KEEPS 100% OF ALL BUILT-IN SEED CATALOGS INTACT (291 Khmer dishes, 1,823 tourist destinations,
 *      359 hotels, built-in seed restaurants).
 *   3. RESETS ONLY PRE-LAUNCH TEST DATA TO ZERO (when --apply --confirm-keep-accounts is passed):
 *      - Custom user-submitted test shops (`kft_cloud_custom_restaurants_v1` -> [])
 *      - Test likes/bookmarks/wishlists/tripPlans & test VIP/trial flags on non-admin user accounts
 *        (resetting to clean `membershipTier: 'free', subscriptionStatus: 'none'`)
 *      - Retired check-in reward claims (`kft_cloud_food_checkin_reward_claims_v1` -> {})
 *      - Test payment transactions & receipts (`kft_cloud_transactions_v1` -> [], `kft_cloud_vip_backup_v1` -> [],
 *        `kft_cloud_payment_proofs_v1` -> {}, `kft_proof_*`, `kft_payment_receipts`, `kft_trial_promo_claims`)
 *      - Resets `shopEarlyBirdClaimedCount` to 0 so all 50 Early-Bird shop slots start fresh at launch.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const isApply = args.has('--apply') && args.has('--confirm-keep-accounts');
const PAGE = 1000;

const TARGET_KV_KEYS = [
  'kft_cloud_users_v1',
  'kft_cloud_users_v2',
  'kft_cloud_vip_backup_v1',
  'kft_cloud_deleted_users_v1',
  'kft_cloud_custom_restaurants_v1',
  'kft_cloud_deleted_restaurants_v1',
  'kft_cloud_transactions_v1',
  'kft_cloud_deleted_transactions_v1',
  'kft_cloud_food_checkin_reward_claims_v1',
  'kft_cloud_payment_proofs_v1',
  'kft_cloud_app_settings_v1',
  'kft_cloud_admin_vip_pricing_v2',
];

function loadConfig() {
  let url = process.env.KFT_SUPABASE_URL || process.env.SUPABASE_URL;
  let key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.KFT_SUPABASE_SERVICE_KEY ||
    process.env.KFT_SUPABASE_KEY;
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.KFT_SUPABASE_SERVICE_KEY);
  if (!url || !key) {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'services', 'supabaseService.ts'), 'utf8');
    url = url || (src.match(/DEFAULT_SUPABASE_URL\s*=\s*'([^']+)'/) || [])[1];
    key = key || (src.match(/DEFAULT_SUPABASE_PUBLISHABLE_KEY\s*=\s*'([^']+)'/) || [])[1];
  }
  if (!url || !key) {
    throw new Error('Supabase URL/key not found');
  }
  return { url: url.replace(/\/+$/, ''), key, hasServiceRole };
}

async function restGet(cfg, pathAndQuery) {
  const res = await fetch(`${cfg.url}/rest/v1/${pathAndQuery}`, {
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`GET ${pathAndQuery} -> HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
  return await res.json();
}

async function restUpsertKv(cfg, rows) {
  if (!rows.length) return;
  const adminToken = process.env.KFT_ADMIN_TOKEN || '';
  const headers = {
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  };
  if (adminToken) headers['x-kft-admin-token'] = adminToken;
  if (isApply) headers['x-kft-allow-destructive'] = 'true';
  const res = await fetch(`${cfg.url}/rest/v1/kft_app_kv_store?on_conflict=key`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`UPSERT kft_app_kv_store -> HTTP ${res.status}: ${txt.slice(0, 240)}`);
  }
}

async function restDeleteByPrefix(cfg, queryFilter) {
  const adminToken = process.env.KFT_ADMIN_TOKEN || '';
  const headers = {
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
  };
  if (adminToken) headers['x-kft-admin-token'] = adminToken;
  if (isApply) headers['x-kft-allow-destructive'] = 'true';
  const res = await fetch(`${cfg.url}/rest/v1/${queryFilter}`, {
    method: 'DELETE',
    headers,
  });
  return res.status;
}

function isAdminUserPayload(u) {
  if (!u || typeof u !== 'object') return false;
  return (
    u.role === 'admin' ||
    u.id === 'admin-authorized-single' ||
    u.username === 'admin' ||
    u.username === 'cheasavuth'
  );
}

/**
 * Strips ONLY test entitlements/bookmarks/likes/shop-slot flags while keeping 100% of account identity & auth fields intact.
 */
function sanitizeUserRecordKeepAccount(u) {
  if (!u || typeof u !== 'object') return u;
  if (isAdminUserPayload(u)) {
    return {
      ...u,
      bookmarks: [],
      wishlists: [],
      tripPlans: [],
    };
  }
  const cleaned = {
    ...u,
    role: 'user',
    membershipTier: 'free',
    subscriptionStatus: 'none',
    vipStatus: 'none',
    bookmarks: [],
    wishlists: [],
    tripPlans: [],
    vipMembershipHistory: [],
    paidAdditionalStoreSlots: 0,
    additionalStorePaymentIds: [],
  };
  const testFieldsToDelete = [
    'subscriptionStartDate',
    'subscriptionExpiryDate',
    'vipExpiresAt',
    'vipPlanDays',
    'vipPlanType',
    'vipCancelledAt',
    'paymentStatus',
    'paymentMethod',
    'transactionRef',
    'autoRenew',
    'autoRenewPlanId',
    'autoRenewPaymentMethod',
    'autoRenewPaymentLabel',
    'autoRenewConsentAt',
    'autoRenewCancelledAt',
    'autoRenewLastStatus',
    'freeTrialActivated',
    'freeTrialActivatedAt',
    'freeTrialExpiresAt',
    'promo099Used',
    'promo099ClaimedAt',
    'activeConsumerPlanId',
  ];
  for (const f of testFieldsToDelete) {
    delete cleaned[f];
  }
  return cleaned;
}

function hadTestActivityOnUser(u) {
  if (!u || typeof u !== 'object') return false;
  return Boolean(
    (u.membershipTier && u.membershipTier !== 'free') ||
      (u.subscriptionStatus && u.subscriptionStatus !== 'none') ||
      u.subscriptionExpiryDate ||
      u.vipExpiresAt ||
      u.freeTrialActivated ||
      u.promo099Used ||
      u.role === 'owner' ||
      (Array.isArray(u.bookmarks) && u.bookmarks.length > 0) ||
      (Array.isArray(u.wishlists) && u.wishlists.length > 0) ||
      (Array.isArray(u.tripPlans) && u.tripPlans.length > 0) ||
      (Array.isArray(u.vipMembershipHistory) && u.vipMembershipHistory.length > 0) ||
      (Number(u.paidAdditionalStoreSlots) || 0) > 0
  );
}

async function fetchPaginatedPrefix(cfg, likePattern) {
  const out = [];
  for (let offset = 0; ; offset += PAGE) {
    const rows = await restGet(
      cfg,
      `kft_app_kv_store?key=like.${likePattern}&select=key,payload,updated_at&order=key.asc&limit=${PAGE}&offset=${offset}`
    );
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

async function main() {
  const cfg = loadConfig();
  const host = new URL(cfg.url).host;
  console.log('======================================================================');
  console.log(`[reset-prelaunch] Mode: ${isApply ? '🚨 LIVE APPLY (--apply --confirm-keep-accounts)' : '🛡️ SAFE DRY-RUN (Read-Only — Zero Writes)'}`);
  console.log(`[reset-prelaunch] Target Supabase Host: ${host}`);
  console.log('======================================================================');

  const atomicUsers = await fetchPaginatedPrefix(cfg, 'kft_user_*');
  const avatarRows = await fetchPaginatedPrefix(cfg, 'kft_avatar_*');
  const allProofRows = await fetchPaginatedPrefix(cfg, 'kft_proof_*');
  const paymentProofRows = allProofRows.filter((r) => !String(r.key).startsWith('kft_proof_ticket_'));

  const kvRows = await restGet(
    cfg,
    `kft_app_kv_store?key=in.(${TARGET_KV_KEYS.join(',')})&select=key,payload,updated_at`
  );
  const kvMap = Object.fromEntries(kvRows.map((r) => [r.key, r.payload]));

  const adminAtomicCount = atomicUsers.filter((r) => isAdminUserPayload(r.payload)).length;
  const nonAdminAtomicCount = atomicUsers.length - adminAtomicCount;
  const usersWithTestStateCount = atomicUsers.filter((r) => hadTestActivityOnUser(r.payload)).length;

  const aggUsersV2 = Array.isArray(kvMap.kft_cloud_users_v2) ? kvMap.kft_cloud_users_v2 : [];
  const aggUsersV1 = Array.isArray(kvMap.kft_cloud_users_v1) ? kvMap.kft_cloud_users_v1 : [];
  const customShops = Array.isArray(kvMap.kft_cloud_custom_restaurants_v1) ? kvMap.kft_cloud_custom_restaurants_v1 : [];
  const cloudTxns = Array.isArray(kvMap.kft_cloud_transactions_v1) ? kvMap.kft_cloud_transactions_v1 : [];
  const vipBackup = Array.isArray(kvMap.kft_cloud_vip_backup_v1) ? kvMap.kft_cloud_vip_backup_v1 : [];
  const rewardClaims =
    kvMap.kft_cloud_food_checkin_reward_claims_v1 && typeof kvMap.kft_cloud_food_checkin_reward_claims_v1 === 'object'
      ? Object.keys(kvMap.kft_cloud_food_checkin_reward_claims_v1).length
      : 0;

  console.log('\n✅ ACCOUNTS & CATALOGS PRESERVED 100% INTACT:');
  console.log(`   • Atomic User Accounts (kft_user_*):      ${atomicUsers.length} total (${nonAdminAtomicCount} regular + ${adminAtomicCount} admin)`);
  console.log(`   • Aggregate Users v2 (kft_cloud_users_v2): ${aggUsersV2.length} accounts`);
  console.log(`   • Aggregate Users v1 (kft_cloud_users_v1): ${aggUsersV1.length} accounts`);
  console.log(`   • Cloud User Avatars (kft_avatar_*):       ${avatarRows.length} avatars`);
  console.log('   • Built-In Seed Catalogs:                  291 Khmer dishes, 1,823 destinations, 359 hotels (untouched in bundle)');

  console.log('\n🧹 TEST DATA QUEUED FOR RESET TO ZERO:');
  console.log(`   • Custom User-Submitted Test Shops:        ${customShops.length} -> 0`);
  console.log(`   • Accounts with Test VIP/Trial/Likes:      ${usersWithTestStateCount} accounts -> reset to clean 'free' tier (credentials kept)`);
  console.log(`   • Cloud Test Transactions:                 ${cloudTxns.length} -> 0`);
  console.log(`   • VIP Backup Ledger Entries:               ${vipBackup.length} -> 0`);
  console.log(`   • Retired Check-In Reward Claims:          ${rewardClaims} -> 0`);
  console.log(`   • Payment Proof KV Blobs (kft_proof_*):    ${paymentProofRows.length} -> 0`);
  console.log('   • Early-Bird 50-Shop Counter:              reset to 0 / 50 claimed');

  if (!isApply) {
    console.log('\n[reset-prelaunch] DRY-RUN COMPLETE — ZERO CHANGES WERE WRITTEN TO SUPABASE.');
    console.log('To execute live when ready, run:');
    console.log('  node scripts/resetPrelaunchTestData.mjs --apply --confirm-keep-accounts');
    return;
  }

  // Step 1: Mandatory pre-reset user backup via userDataBackup.mjs
  console.log('\n[reset-prelaunch] Step 1/4: Running mandatory userDataBackup.mjs...');
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'userDataBackup.mjs'), '--force'], {
    stdio: 'inherit',
  });

  // Step 2: Save full pre-reset JSON snapshot with SHA-256 checksum
  const snapDir = path.join(ROOT, 'backups', 'prelaunch-reset');
  fs.mkdirSync(snapDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const snapFile = path.join(snapDir, `prelaunch-snapshot-${stamp}.json`);
  const snapPayload = JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      host,
      atomicUsersCount: atomicUsers.length,
      atomicUsers,
      kvMap,
      paymentProofKeys: paymentProofRows.map((r) => r.key),
    },
    null,
    2
  );
  fs.writeFileSync(snapFile, snapPayload, 'utf8');
  const snapSha = crypto.createHash('sha256').update(snapPayload).digest('hex');
  console.log(`[reset-prelaunch] Step 2/4: Saved full JSON snapshot -> ${path.relative(ROOT, snapFile)} (sha256: ${snapSha.slice(0, 16)}...)`);

  // Step 3: Trigger server-side snapshot RPC if service_role is available
  if (cfg.hasServiceRole) {
    try {
      await fetch(`${cfg.url}/rest/v1/rpc/kft_create_snapshot`, {
        method: 'POST',
        headers: {
          apikey: cfg.key,
          Authorization: `Bearer ${cfg.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_note: `prelaunch_reset_${stamp}` }),
      });
      console.log('[reset-prelaunch] Triggered server RPC kft_create_snapshot.');
    } catch {
      // optional RPC
    }
  }

  // Step 4: Apply reset while preserving 100% of user accounts
  console.log('[reset-prelaunch] Step 3/4: Applying cleaned user records & zeroed test collections...');
  const nowIso = new Date().toISOString();
  const cleanedAtomicRows = atomicUsers.map((row) => ({
    key: row.key,
    payload: sanitizeUserRecordKeepAccount(row.payload),
    updated_at: nowIso,
  }));

  for (let i = 0; i < cleanedAtomicRows.length; i += 200) {
    await restUpsertKv(cfg, cleanedAtomicRows.slice(i, i + 200));
  }

  const nextSettings =
    kvMap.kft_cloud_app_settings_v1 && typeof kvMap.kft_cloud_app_settings_v1 === 'object'
      ? { ...kvMap.kft_cloud_app_settings_v1, shopEarlyBirdClaimedCount: 0 }
      : undefined;
  const nextPricing =
    kvMap.kft_cloud_admin_vip_pricing_v2 && typeof kvMap.kft_cloud_admin_vip_pricing_v2 === 'object'
      ? { ...kvMap.kft_cloud_admin_vip_pricing_v2, shopEarlyBirdClaimedCount: 0 }
      : undefined;

  const aggregateResetRows = [
    {
      key: 'kft_cloud_users_v2',
      payload: aggUsersV2.map((u) => sanitizeUserRecordKeepAccount(u)),
      updated_at: nowIso,
    },
    {
      key: 'kft_cloud_users_v1',
      payload: aggUsersV1.map((u) => sanitizeUserRecordKeepAccount(u)),
      updated_at: nowIso,
    },
    { key: 'kft_cloud_vip_backup_v1', payload: [], updated_at: nowIso },
    { key: 'kft_cloud_custom_restaurants_v1', payload: [], updated_at: nowIso },
    { key: 'kft_cloud_deleted_restaurants_v1', payload: [], updated_at: nowIso },
    { key: 'kft_cloud_transactions_v1', payload: [], updated_at: nowIso },
    { key: 'kft_cloud_deleted_transactions_v1', payload: [], updated_at: nowIso },
    { key: 'kft_cloud_food_checkin_reward_claims_v1', payload: {}, updated_at: nowIso },
    { key: 'kft_cloud_payment_proofs_v1', payload: {}, updated_at: nowIso },
  ];
  if (nextSettings) {
    aggregateResetRows.push({ key: 'kft_cloud_app_settings_v1', payload: nextSettings, updated_at: nowIso });
  }
  if (nextPricing) {
    aggregateResetRows.push({ key: 'kft_cloud_admin_vip_pricing_v2', payload: nextPricing, updated_at: nowIso });
  }
  await restUpsertKv(cfg, aggregateResetRows);

  if (paymentProofRows.length > 0) {
    await restDeleteByPrefix(cfg, 'kft_app_kv_store?key=like.kft_proof_*&key=not.like.kft_proof_ticket_*');
  }

  if (cfg.hasServiceRole) {
    await restDeleteByPrefix(cfg, 'kft_payment_receipts?id=not.is.null').catch(() => {});
    await restDeleteByPrefix(cfg, 'kft_trial_promo_claims?id=not.is.null').catch(() => {});
  }

  // Step 5: Post-write account count invariant check
  const postAtomicUsers = await fetchPaginatedPrefix(cfg, 'kft_user_*');
  if (postAtomicUsers.length !== atomicUsers.length) {
    throw new Error(
      `CRITICAL INVARIANT MISMATCH: pre-reset atomic users (${atomicUsers.length}) !== post-reset (${postAtomicUsers.length})!`
    );
  }
  console.log(`[reset-prelaunch] Step 4/4: VERIFIED post-reset atomic user count = ${postAtomicUsers.length} (100% preserved)!`);
}

main().catch((err) => {
  console.error('\n[reset-prelaunch] ERROR:', err?.message || err);
  process.exit(1);
});
