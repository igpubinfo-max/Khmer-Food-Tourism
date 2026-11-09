/**
 * Cambodia Flavors & Tourism - Anti-Tamper Session & VIP Integrity Guard
 *
 * Provides:
 * 1. Cryptographic HMAC-SHA256 seal (computeUserIntegritySeal) & synchronous seal (computeUserIntegritySealSync)
 *    binding user id, role, vipStatus, vipPlanType, vipExpiresAt, and approvedStoresCount.
 * 2. Active Admin Security session verification.
 * 3. Multi-source VIP integrity & self-healing reconciliation across:
 *    - `kft_vip_registry_backup_v1`
 *    - `kft_pre_update_db_backup_v1`
 *    - `kft_users_v5` / `kft_users_v4`
 *    - `kft_cloud_users_v2` / `kft_cloud_users_v1`
 *    - `kft_transactions_v4` / `kft_transactions_v3`
 *    - `kft_support_tickets_v1`
 *    Guarantees legitimate VIP accounts are NEVER cleared or downgraded on app version updates or restarts.
 */

import {
  User,
  parseSafeDateMs,
  getAuthoritativeServerNowMs,
  isPermanentVipEmail,
  resolveUserActualVipPlanDays,
  sanitizeUserVipPlanAndExpiry,
} from '../types';
import { verifyAdminSession, createAdminSession, revokeAdminSession } from './security';

const INTEGRITY_SALT_BASE = 'kft_tamper_guard_v2026_cheasavuth_khmer_food_secure';
const DERIVATION_ROUNDS = 2026;

export const adminSecurityService = {
  verifyAdminSession,
  createAdminSession,
  revokeAdminSession,
  hasActiveAdminToken: (): boolean => {
    try {
      const token = sessionStorage.getItem('kft_admin_session_token');
      if (!token) return false;
      const parts = token.split('.');
      if (parts.length !== 2) return false;
      const payload = JSON.parse(atob(parts[0]));
      return Boolean(payload && typeof payload.expiresAt === 'number' && Date.now() < payload.expiresAt);
    } catch {
      return false;
    }
  },
};

/**
 * Derives a deterministic internal cryptographic secret bound to user ID and internal salt
 */
function deriveInternalKey(userId: string): string {
  let hash = 0x811c9dc5;
  const input = `${INTEGRITY_SALT_BASE}:${userId}:${DERIVATION_ROUNDS}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `kft_sec_seal_${(hash >>> 0).toString(16)}_${userId.slice(-6)}`;
}

/**
 * Fast 64-bit Murmur/FNV-style hash fallback for synchronous verification & sealing
 */
function fallbackHash(str: string): string {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

function buildIntegrityPayload(user: Partial<User> | any): { userId: string; payload: string; derivedKeyString: string } {
  const userId = String(user?.id || '');
  const userRole = String(user?.role || 'user');
  const vipStatus = String(
    user?.vipStatus ||
      user?.subscriptionStatus ||
      (user?.membershipTier === 'premium_vip' ? 'active' : 'none')
  );
  const vipPlanType = String(user?.vipPlanType || user?.paymentPlanId || user?.planId || 'standard');
  const vipExpiresAt = String(user?.vipExpiresAt || user?.subscriptionExpiryDate || '');
  const approvedStoresCount = String(user?.approvedStoresCount ?? user?.paidAdditionalStoreSlots ?? 0);
  const payload = `${userId}|${userRole}|${vipStatus}|${vipPlanType}|${vipExpiresAt}|${approvedStoresCount}`;
  const derivedKeyString = deriveInternalKey(userId);
  return { userId, payload, derivedKeyString };
}

/**
 * Synchronous deterministic integrity seal generator
 */
export function computeUserIntegritySealSync(user: Partial<User> | any): string {
  if (!user || !user.id) return '';
  const { payload, derivedKeyString } = buildIntegrityPayload(user);
  return fallbackHash(`${derivedKeyString}:${payload}`);
}

/**
 * Computes a cryptographic HMAC/SHA-256 integrity seal that binds:
 * user.id, user.role, user.vipStatus, user.vipPlanType, user.vipExpiresAt, user.approvedStoresCount
 */
export async function computeUserIntegritySeal(user: Partial<User> | any): Promise<string> {
  if (!user || !user.id) return '';
  const { payload, derivedKeyString } = buildIntegrityPayload(user);

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(derivedKeyString),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return fallbackHash(`${derivedKeyString}:${payload}`);
  }
}

/**
 * Computes and attaches integrity seal to user object and writes back to localStorage
 */
export async function sealUserSession(user: User): Promise<User> {
  const seal = await computeUserIntegritySeal(user);
  const sealed = { ...user, integritySeal: seal };
  try {
    localStorage.setItem('kft_current_user_v5', JSON.stringify(sealed));
  } catch {}
  return sealed;
}

/**
 * Verifies whether user object has a valid integrity seal (accepts either async HMAC or sync deterministic seal)
 */
export async function verifyUserIntegritySeal(user: Partial<User> | any): Promise<boolean> {
  if (!user || !user.integritySeal) return false;
  const syncExpected = computeUserIntegritySealSync(user);
  if (user.integritySeal === syncExpected) return true;
  const expected = await computeUserIntegritySeal(user);
  return user.integritySeal === expected;
}

/**
 * Cross-provider identity matcher for startup & session reconciliation
 */
function doesUserMatchCandidate(
  u: any,
  target: { id?: string; email?: string; phone?: string; legacyIds?: string[] }
): boolean {
  if (!u || !target) return false;
  const uIds = new Set<string>(
    [
      u.id ? String(u.id).trim() : '',
      u.userId ? String(u.userId).trim() : '',
      u.ownerId ? String(u.ownerId).trim() : '',
      ...(Array.isArray(u.legacyIds) ? u.legacyIds.map((x: any) => String(x).trim()) : []),
    ].filter(Boolean)
  );
  const tIds = new Set<string>(
    [
      target.id ? String(target.id).trim() : '',
      ...(Array.isArray(target.legacyIds) ? target.legacyIds.map((x: any) => String(x).trim()) : []),
    ].filter(Boolean)
  );

  const uEmail = String(u.email || u.userEmail || '').trim().toLowerCase();
  const tEmail = String(target.email || '').trim().toLowerCase();
  if (uEmail && uEmail.includes('@')) {
    const slug = uEmail.replace(/[^a-z0-9]/g, '_');
    uIds.add(`user-${slug}`);
    uIds.add(`google-${slug}`);
    uIds.add(`owner-${slug}`);
  }
  if (tEmail && tEmail.includes('@')) {
    const slug = tEmail.replace(/[^a-z0-9]/g, '_');
    tIds.add(`user-${slug}`);
    tIds.add(`google-${slug}`);
    tIds.add(`owner-${slug}`);
  }

  for (const tid of tIds) {
    if (uIds.has(tid)) return true;
  }
  if (uEmail && tEmail && uEmail === tEmail) return true;

  const uPhone = String(u.phone || u.userPhone || u.ownerPhone || '').replace(/[\s-+()]/g, '');
  const tPhone = String(target.phone || '').replace(/[\s-+()]/g, '');
  if (uPhone.length >= 7 && tPhone.length >= 7 && uPhone === tPhone) return true;

  return false;
}

export interface LocalAuthoritativeVipMatch {
  found: boolean;
  expiryMs: number;
  expiryIso?: string;
  startIso?: string;
  transactionRef?: string;
  paymentMethod?: User['paymentMethod'];
  paidAdditionalStoreSlots?: number;
  matchedUser?: User;
}

const parsedStorageCache = new Map<string, { raw: string; parsed: any }>();

export function isUserExplicitlyCancelled(u: Partial<User> | null | undefined): boolean {
  if (!u || typeof u !== 'object') return false;
  return (
    u.subscriptionStatus === 'cancelled' ||
    u.paymentStatus === 'cancelled' ||
    (Boolean(u.vipCancelledAt) && u.subscriptionStatus !== 'active')
  );
}

/**
 * Purges a cancelled user's stale VIP records from all local caches and backup registries
 * so local storage never resurrects VIP status after an Admin cancellation.
 */
export function purgeCancelledUserFromLocalCaches(targetUser: Partial<User> | null | undefined): void {
  if (!targetUser) return;
  parsedStorageCache.clear();
  try {
    if (typeof localStorage === 'undefined') return;

    // 1. Remove from kft_vip_registry_backup_v1
    const rawVipBackup = localStorage.getItem('kft_vip_registry_backup_v1');
    if (rawVipBackup) {
      try {
        const parsed = JSON.parse(rawVipBackup);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((u: any) => !doesUserMatchCandidate(u, targetUser));
          localStorage.setItem('kft_vip_registry_backup_v1', JSON.stringify(filtered));
        }
      } catch {}
    }

    // 2. Clean kft_pre_update_db_backup_v1 (vipUsers, allUsers, verifiedTransactions)
    const rawPreUpdate = localStorage.getItem('kft_pre_update_db_backup_v1');
    if (rawPreUpdate) {
      try {
        const snap = JSON.parse(rawPreUpdate);
        if (snap && typeof snap === 'object') {
          let changed = false;
          if (Array.isArray(snap.vipUsers)) {
            const nextVip = snap.vipUsers.filter((u: any) => !doesUserMatchCandidate(u, targetUser));
            if (nextVip.length !== snap.vipUsers.length) {
              snap.vipUsers = nextVip;
              changed = true;
            }
          }
          if (Array.isArray(snap.allUsers)) {
            snap.allUsers = snap.allUsers.map((u: any) => {
              if (!doesUserMatchCandidate(u, targetUser)) return u;
              changed = true;
              return {
                ...u,
                membershipTier: 'free',
                subscriptionStatus: 'cancelled',
                paymentStatus: 'cancelled',
                vipStatus: 'none',
                subscriptionExpiryDate: undefined,
                vipExpiresAt: undefined,
                freeTrialActivated: false,
                freeTrialExpiresAt: undefined,
                autoRenew: false,
                vipCancelledAt: targetUser.vipCancelledAt || new Date().toISOString(),
              };
            });
          }
          if (Array.isArray(snap.verifiedTransactions)) {
            const nextTxns = snap.verifiedTransactions.filter((t: any) => !doesUserMatchCandidate(t, targetUser));
            if (nextTxns.length !== snap.verifiedTransactions.length) {
              snap.verifiedTransactions = nextTxns;
              changed = true;
            }
          }
          if (changed) {
            localStorage.setItem('kft_pre_update_db_backup_v1', JSON.stringify(snap));
          }
        }
      } catch {}
    }

    // 3. Downgrade in legacy/aggregate local user lists
    for (const listKey of ['kft_cloud_users_v2', 'kft_cloud_users_v1', 'kft_users_v4']) {
      const rawList = localStorage.getItem(listKey);
      if (!rawList) continue;
      try {
        const parsed = JSON.parse(rawList);
        if (Array.isArray(parsed)) {
          let changed = false;
          const updated = parsed.map((u: any) => {
            if (!doesUserMatchCandidate(u, targetUser)) return u;
            changed = true;
            return {
              ...u,
              membershipTier: 'free',
              subscriptionStatus: 'cancelled',
              paymentStatus: 'cancelled',
              vipStatus: 'none',
              subscriptionExpiryDate: undefined,
              vipExpiresAt: undefined,
              freeTrialActivated: false,
              freeTrialExpiresAt: undefined,
              autoRenew: false,
              vipCancelledAt: targetUser.vipCancelledAt || new Date().toISOString(),
            };
          });
          if (changed) {
            localStorage.setItem(listKey, JSON.stringify(updated));
          }
        }
      } catch {}
    }

    // 4. Clean legacy kft_current_user_v4 if matching
    const rawV4 = localStorage.getItem('kft_current_user_v4');
    if (rawV4) {
      try {
        const parsedV4 = JSON.parse(rawV4);
        if (parsedV4 && doesUserMatchCandidate(parsedV4, targetUser)) {
          localStorage.removeItem('kft_current_user_v4');
        }
      } catch {}
    }

    // 5. Clean kft_secondary_cloud_mirror_v1 so secondary failover mirror never resurrects VIP
    const rawMirror = localStorage.getItem('kft_secondary_cloud_mirror_v1');
    if (rawMirror) {
      try {
        const mirrorObj = JSON.parse(rawMirror);
        if (mirrorObj && typeof mirrorObj === 'object') {
          let mirrorChanged = false;
          for (const [mKey, rawMEntry] of Object.entries(mirrorObj)) {
            const mEntry = rawMEntry as any;
            if (!mEntry || typeof mEntry !== 'object') continue;
            if (mKey.startsWith('kft_user_') && mEntry.payload && doesUserMatchCandidate(mEntry.payload, targetUser)) {
              mEntry.payload = {
                ...mEntry.payload,
                membershipTier: 'free',
                subscriptionStatus: 'cancelled',
                paymentStatus: 'cancelled',
                vipStatus: 'none',
                subscriptionExpiryDate: undefined,
                vipExpiresAt: undefined,
                freeTrialActivated: false,
                freeTrialExpiresAt: undefined,
                autoRenew: false,
                vipCancelledAt: targetUser.vipCancelledAt || new Date().toISOString(),
              };
              mirrorChanged = true;
            } else if (mKey === 'kft_cloud_vip_backup_v1' && Array.isArray(mEntry.payload)) {
              const filtered = mEntry.payload.filter((u: any) => !doesUserMatchCandidate(u, targetUser));
              if (filtered.length !== mEntry.payload.length) {
                mEntry.payload = filtered;
                mirrorChanged = true;
              }
            }
          }
          if (mirrorChanged) {
            localStorage.setItem('kft_secondary_cloud_mirror_v1', JSON.stringify(mirrorObj));
          }
        }
      } catch {}
    }
  } catch {}
  parsedStorageCache.clear();
}

function getCachedParsedLocalStorage(key: string): any {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw || raw === 'undefined' || raw === 'null') {
      parsedStorageCache.delete(key);
      return null;
    }
    const cached = parsedStorageCache.get(key);
    if (cached && cached.raw === raw) {
      return cached.parsed;
    }
    const parsed = JSON.parse(raw);
    parsedStorageCache.set(key, { raw, parsed });
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Inspects all local persistence registries, backups, transactions, and support tickets
 * to verify or recover a user's active VIP membership across app version updates.
 */
export function findLocalAuthoritativeVipEntitlement(
  targetUser: Partial<User> | null | undefined,
  extraCloudUsers?: User[] | null
): LocalAuthoritativeVipMatch {
  if (!targetUser) return { found: false, expiryMs: 0 };
  let bestSlots = typeof targetUser.paidAdditionalStoreSlots === 'number' ? targetUser.paidAdditionalStoreSlots : 0;

  // Never resurrect VIP from local cache if targetUser itself is explicitly cancelled
  if (isUserExplicitlyCancelled(targetUser)) {
    return { found: false, expiryMs: 0, paidAdditionalStoreSlots: bestSlots };
  }

  const nowMs = getAuthoritativeServerNowMs();
  let latestCancelMs = 0;
  let hasExplicitCancelledRecord = false;
  let latestActiveCloudGrantMs = 0;

  const inspectForCancellation = (rawCand: any, isAuthoritativeList: boolean) => {
    if (!rawCand || typeof rawCand !== 'object') return;
    if (!doesUserMatchCandidate(rawCand, targetUser)) return;
    if (isUserExplicitlyCancelled(rawCand)) {
      hasExplicitCancelledRecord = true;
      const cMs = parseSafeDateMs(rawCand.vipCancelledAt || rawCand.autoRenewCancelledAt || rawCand.lastActiveAt);
      if (cMs > latestCancelMs) latestCancelMs = cMs;
    } else if (
      isAuthoritativeList &&
      (rawCand.membershipTier === 'premium_vip' || rawCand.subscriptionStatus === 'active')
    ) {
      const sMs = parseSafeDateMs(rawCand.subscriptionStartDate || rawCand.verifiedAt);
      if (sMs > latestActiveCloudGrantMs) latestActiveCloudGrantMs = sMs;
    }
  };

  if (Array.isArray(extraCloudUsers)) {
    for (const u of extraCloudUsers) inspectForCancellation(u, true);
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const parsedCur = getCachedParsedLocalStorage('kft_current_user_v5');
      if (parsedCur) inspectForCancellation(parsedCur, false);
      const parsedUsersV5 = getCachedParsedLocalStorage('kft_users_v5');
      if (Array.isArray(parsedUsersV5)) {
        for (const u of parsedUsersV5) inspectForCancellation(u, true);
      }
    }
  } catch {}

  // If an explicit Admin cancellation exists and no newer authoritative VIP grant happened after it, block local cache resurrection
  if (hasExplicitCancelledRecord && (latestCancelMs === 0 || latestActiveCloudGrantMs <= latestCancelMs)) {
    return { found: false, expiryMs: 0, paidAdditionalStoreSlots: bestSlots };
  }

  let bestExpMs = 0;
  let bestStartIso: string | undefined;
  let bestTxnRef: string | undefined;
  let bestMethod: User['paymentMethod'] | undefined;
  let bestMatchedUser: User | undefined;

  const considerUserRecord = (rawCand: any) => {
    if (!rawCand || typeof rawCand !== 'object') return;
    if (!doesUserMatchCandidate(rawCand, targetUser)) return;
    if (isUserExplicitlyCancelled(rawCand)) return;
    const cand = sanitizeUserVipPlanAndExpiry(rawCand as User);
    if (typeof cand.paidAdditionalStoreSlots === 'number' && cand.paidAdditionalStoreSlots > bestSlots) {
      bestSlots = cand.paidAdditionalStoreSlots;
    }
    if (isUserExplicitlyCancelled(cand)) return;
    const isVip =
      cand.membershipTier === 'premium_vip' ||
      cand.subscriptionStatus === 'active' ||
      cand.vipStatus === 'active';
    if (!isVip) return;

    const candStartMs = parseSafeDateMs(cand.subscriptionStartDate || cand.verifiedAt);
    if (latestCancelMs > 0 && candStartMs <= latestCancelMs) {
      return;
    }

    const rawExp = cand.subscriptionExpiryDate || cand.vipExpiresAt;
    let expMs = parseSafeDateMs(rawExp);
    const planDays = resolveUserActualVipPlanDays(cand);
    if (expMs <= 0 && cand.membershipTier === 'premium_vip' && cand.subscriptionStatus === 'active') {
      const startMs = parseSafeDateMs(cand.subscriptionStartDate || cand.verifiedAt || cand.lastLoginAt || cand.registeredAtIso) || nowMs;
      expMs = Math.max(startMs, nowMs) + planDays * 24 * 60 * 60 * 1000;
    }
    if (expMs > nowMs && expMs > bestExpMs) {
      bestExpMs = expMs;
      bestStartIso = cand.subscriptionStartDate || cand.verifiedAt || bestStartIso;
      bestTxnRef = cand.transactionRef || bestTxnRef;
      bestMethod = cand.paymentMethod || bestMethod;
      bestMatchedUser = cand as User;
    }
  };

  if (Array.isArray(extraCloudUsers)) {
    for (const u of extraCloudUsers) considerUserRecord(u);
  }

  try {
    if (typeof localStorage !== 'undefined') {
      // 0. Check active signed-in session keys (`kft_current_user_v5`, `kft_current_user_v4`)
      for (const curKey of ['kft_current_user_v5', 'kft_current_user_v4']) {
        const parsedCur = getCachedParsedLocalStorage(curKey);
        if (parsedCur && typeof parsedCur === 'object' && !Array.isArray(parsedCur)) {
          considerUserRecord(parsedCur);
        }
      }

      // 1. Check all user list & VIP backup keys (no short-circuiting so stale keys never shadow fresh ones)
      const userListKeys = [
        'kft_vip_registry_backup_v1',
        'kft_users_v5',
        'kft_cloud_users_v2',
        'kft_cloud_users_v1',
        'kft_users_v4',
      ];
      for (const key of userListKeys) {
        const parsed = getCachedParsedLocalStorage(key);
        if (Array.isArray(parsed)) {
          for (const u of parsed) considerUserRecord(u);
        }
      }

      // 2. Check Pre-Update Database Snapshot (`kft_pre_update_db_backup_v1`)
      const snap = getCachedParsedLocalStorage('kft_pre_update_db_backup_v1');
      if (snap && typeof snap === 'object') {
        if (Array.isArray(snap?.vipUsers)) {
          for (const u of snap.vipUsers) considerUserRecord(u);
        }
        if (Array.isArray(snap?.verifiedTransactions)) {
          for (const t of snap.verifiedTransactions) {
            if (!t || t.status !== 'verified' || t.type === 'additional_store_slot') continue;
            if (!doesUserMatchCandidate(t, targetUser)) continue;
            const txnStartMs = parseSafeDateMs(t.verifiedAt || t.createdAt);
            if (latestCancelMs > 0 && txnStartMs <= latestCancelMs) continue;
            const expMs = parseSafeDateMs(t.expiresAt);
            if (expMs > nowMs && expMs > bestExpMs) {
              bestExpMs = expMs;
              bestStartIso = t.verifiedAt || t.createdAt || bestStartIso;
              bestTxnRef = t.transactionRef || bestTxnRef;
              bestMethod = t.paymentMethod || bestMethod;
            }
          }
        }
      }

      // 3. Check Verified Transactions (`kft_transactions_v4` & `kft_transactions_v3`)
      for (const txnKey of ['kft_transactions_v4', 'kft_transactions_v3']) {
        const txns = getCachedParsedLocalStorage(txnKey);
        if (Array.isArray(txns)) {
          for (const t of txns) {
            if (!t || t.status !== 'verified') continue;
            if (!doesUserMatchCandidate(t, targetUser)) continue;
            if (t.type === 'additional_store_slot') continue;
            const txnStartMs = parseSafeDateMs(t.verifiedAt || t.createdAt);
            if (latestCancelMs > 0 && txnStartMs <= latestCancelMs) continue;
            const expMs = parseSafeDateMs(t.expiresAt);
            if (expMs > nowMs && expMs > bestExpMs) {
              bestExpMs = expMs;
              bestStartIso = t.verifiedAt || t.createdAt || bestStartIso;
              bestTxnRef = t.transactionRef || bestTxnRef;
              bestMethod = t.paymentMethod || bestMethod;
            }
          }
        }
      }

      // 4. Check Resolved VIP-Approved Support Tickets (`kft_support_tickets_v1`)
      const tickets = getCachedParsedLocalStorage('kft_support_tickets_v1');
      if (Array.isArray(tickets)) {
        for (const tk of tickets) {
          if (!tk || !tk.vipApproved || tk.status !== 'resolved') continue;
          if (!doesUserMatchCandidate(tk, targetUser)) continue;
          const baseMs =
            parseSafeDateMs(tk.vipApprovedAt) ||
            parseSafeDateMs(tk.updatedAt) ||
            parseSafeDateMs(tk.createdAt);
          const days = typeof tk.durationDays === 'number' && tk.durationDays >= 1 ? tk.durationDays : 30;
          if (baseMs > 0 && (latestCancelMs <= 0 || baseMs > latestCancelMs)) {
            const expMs = baseMs + days * 24 * 60 * 60 * 1000;
            if (expMs > nowMs && expMs > bestExpMs) {
              bestExpMs = expMs;
              bestStartIso = new Date(baseMs).toISOString();
              bestTxnRef = tk.paymentRef || bestTxnRef;
            }
          }
        }
      }

      // Retired: old 30-dish check-in reward (`kft_v3_food_checkin_reward_claims_v1`) never grants VIP.
    }
  } catch {}

  if (bestExpMs > nowMs) {
    return {
      found: true,
      expiryMs: bestExpMs,
      expiryIso: new Date(bestExpMs).toISOString(),
      startIso: bestStartIso,
      transactionRef: bestTxnRef,
      paymentMethod: bestMethod,
      paidAdditionalStoreSlots: bestSlots,
      matchedUser: bestMatchedUser,
    };
  }

  if (isPermanentVipEmail(targetUser.email)) {
    const planDays = resolveUserActualVipPlanDays(targetUser as User);
    const existingTargetExpMs = parseSafeDateMs(targetUser.subscriptionExpiryDate || targetUser.vipExpiresAt);
    // Reuse existing future expiry timestamp so permanent VIP email does not trigger a 60-second cloud push loop
    const permExpMs = existingTargetExpMs > nowMs ? existingTargetExpMs : nowMs + planDays * 24 * 60 * 60 * 1000;
    return {
      found: true,
      expiryMs: permExpMs,
      expiryIso: new Date(permExpMs).toISOString(),
      startIso: targetUser.subscriptionStartDate || new Date(nowMs).toISOString(),
      transactionRef: targetUser.transactionRef || `VIP-${planDays}D-IGP2026D`,
      paymentMethod: targetUser.paymentMethod || 'KHQR',
      paidAdditionalStoreSlots: Math.max(targetUser.paidAdditionalStoreSlots || 0, 2),
    };
  }

  return { found: false, expiryMs: 0, paidAdditionalStoreSlots: bestSlots };
}

/**
 * Validates and sanitizes a user session loaded from localStorage:
 * 1. Preserves authorized Admin account or verifies active Admin Security session token.
 * 2. Preserves and self-heals legitimate VIP accounts across all local & cloud sources.
 */
export async function verifyAndSanitizeUserSession(
  user: User | null,
  authoritativeCloudUsers?: User[] | null
): Promise<{ user: User | null; tampered: boolean; reason?: string }> {
  if (!user) return { user: null, tampered: false };

  const sanitized: User = sanitizeUserVipPlanAndExpiry({ ...user });
  let tampered = false;
  let reason = '';

  const isDedicatedAdminProfile =
    sanitized.id === 'admin-authorized-single' ||
    sanitized.username === 'cheasavuth' ||
    sanitized.username === 'admin';

  // 1. Admin Role Security: never trust arbitrary non-admin account with role: "admin" without active token
  if (sanitized.role === 'admin' && !isDedicatedAdminProfile) {
    const hasToken = adminSecurityService.hasActiveAdminToken();
    const isTokenVerified = hasToken ? await adminSecurityService.verifyAdminSession() : false;
    if (!isTokenVerified) {
      sanitized.role = 'user';
      tampered = true;
      reason = 'Admin role stripped: missing or expired Admin Security session token';
    }
  }

  // 2. VIP Status Integrity & Self-Healing
  const cloudMatchedCancelled = Array.isArray(authoritativeCloudUsers)
    ? authoritativeCloudUsers.find(cu => doesUserMatchCandidate(cu, sanitized) && isUserExplicitlyCancelled(cu))
    : undefined;
  if (isUserExplicitlyCancelled(user) || isUserExplicitlyCancelled(sanitized) || cloudMatchedCancelled) {
    const cancelIso =
      cloudMatchedCancelled?.vipCancelledAt ||
      sanitized.vipCancelledAt ||
      user.vipCancelledAt ||
      new Date().toISOString();
    sanitized.membershipTier = 'free';
    sanitized.subscriptionStatus = 'cancelled';
    sanitized.paymentStatus = 'cancelled';
    sanitized.vipStatus = 'none';
    delete sanitized.subscriptionExpiryDate;
    delete sanitized.vipExpiresAt;
    sanitized.freeTrialActivated = false;
    delete sanitized.freeTrialExpiresAt;
    sanitized.autoRenew = false;
    sanitized.vipCancelledAt = cancelIso;
    sanitized.integritySeal = await computeUserIntegritySeal(sanitized);
    purgeCancelledUserFromLocalCaches(sanitized);
    try {
      localStorage.setItem('kft_current_user_v5', JSON.stringify(sanitized));
    } catch {}
    return { user: sanitized, tampered, reason };
  }

  const isVipClaimed =
    (sanitized as any).vipStatus === 'active' ||
    sanitized.subscriptionStatus === 'active' ||
    sanitized.membershipTier === 'premium_vip';

  const nowServerMs = getAuthoritativeServerNowMs();
  const entitlement = findLocalAuthoritativeVipEntitlement(sanitized, authoritativeCloudUsers);
  const ownExpMs = parseSafeDateMs(
    sanitized.subscriptionExpiryDate || sanitized.vipExpiresAt || (sanitized.freeTrialActivated ? sanitized.freeTrialExpiresAt : undefined)
  );
  const hasOwnValidFutureExpiry =
    (isVipClaimed || sanitized.freeTrialActivated) &&
    sanitized.subscriptionStatus !== 'cancelled' &&
    sanitized.paymentStatus !== 'cancelled' &&
    ownExpMs > nowServerMs;

  if (isVipClaimed || sanitized.freeTrialActivated || entitlement.found) {
    let sealMatches = false;
    if (sanitized.integritySeal) {
      sealMatches = await verifyUserIntegritySeal(sanitized);
    }

    if (entitlement.found || hasOwnValidFutureExpiry || sealMatches) {
      const bestExpMs = Math.max(
        entitlement.expiryIso ? parseSafeDateMs(entitlement.expiryIso) : 0,
        hasOwnValidFutureExpiry ? ownExpMs : 0
      );
      if (bestExpMs > nowServerMs) {
        const cleanExpIso = new Date(bestExpMs).toISOString();
        sanitized.membershipTier = 'premium_vip';
        sanitized.subscriptionStatus = 'active';
        sanitized.paymentStatus = 'verified';
        sanitized.vipStatus = 'active';
        sanitized.subscriptionExpiryDate = cleanExpIso;
        sanitized.vipExpiresAt = cleanExpIso;
        sanitized.vipCancelledAt = undefined;
        if (!sanitized.subscriptionStartDate && entitlement.startIso) {
          sanitized.subscriptionStartDate = entitlement.startIso;
        }
        if (!sanitized.transactionRef && entitlement.transactionRef) {
          sanitized.transactionRef = entitlement.transactionRef;
        }
        if (typeof entitlement.paidAdditionalStoreSlots === 'number') {
          sanitized.paidAdditionalStoreSlots = Math.max(
            sanitized.paidAdditionalStoreSlots || 0,
            entitlement.paidAdditionalStoreSlots
          );
        }
        if (entitlement.matchedUser) {
          const mu = entitlement.matchedUser;
          const ownArMs = parseSafeDateMs(sanitized.autoRenewUpdatedAt || sanitized.autoRenewConsentAt);
          const matchArMs = parseSafeDateMs(mu.autoRenewUpdatedAt || mu.autoRenewConsentAt);
          if (matchArMs > ownArMs || (sanitized.autoRenew === undefined && mu.autoRenew !== undefined)) {
            const isExplicitlyCancelled = Boolean(
              mu.autoRenewCancelledAt || (mu.autoRenew === false && mu.autoRenewCancelledAt)
            );
            sanitized.autoRenew = isExplicitlyCancelled ? false : (mu.autoRenew !== false);
            sanitized.autoRenewPlanId = mu.autoRenewPlanId || sanitized.autoRenewPlanId;
            sanitized.autoRenewPaymentMethod = mu.autoRenewPaymentMethod || sanitized.autoRenewPaymentMethod;
            sanitized.autoRenewPaymentLabel = mu.autoRenewPaymentLabel || sanitized.autoRenewPaymentLabel;
            sanitized.autoRenewConsentAt =
              mu.autoRenewConsentAt ||
              sanitized.autoRenewConsentAt ||
              (!isExplicitlyCancelled ? (sanitized.subscriptionStartDate || sanitized.verifiedAt || new Date().toISOString()) : undefined);
            sanitized.autoRenewCancelledAt = isExplicitlyCancelled
              ? (mu.autoRenewCancelledAt || sanitized.autoRenewCancelledAt)
              : undefined;
            sanitized.autoRenewLastChargedAt = mu.autoRenewLastChargedAt || sanitized.autoRenewLastChargedAt;
            sanitized.autoRenewLastStatus = mu.autoRenewLastStatus;
            sanitized.autoRenewFailureReason = mu.autoRenewFailureReason;
            sanitized.autoRenewUpdatedAt = mu.autoRenewUpdatedAt || sanitized.autoRenewUpdatedAt;
          }
          if (Array.isArray(mu.vipMembershipHistory) && mu.vipMembershipHistory.length > 0) {
            const histMap = new Map<string, any>();
            for (const h of [
              ...(Array.isArray(sanitized.vipMembershipHistory) ? sanitized.vipMembershipHistory : []),
              ...mu.vipMembershipHistory,
            ]) {
              if (h && h.id) histMap.set(h.id, h);
            }
            sanitized.vipMembershipHistory = Array.from(histMap.values())
              .sort((a, b) => parseSafeDateMs(b.date) - parseSafeDateMs(a.date))
              .slice(0, 50);
          }
        }
        sanitized.integritySeal = await computeUserIntegritySeal(sanitized);
      }
    } else if (!sealMatches && !entitlement.found && !hasOwnValidFutureExpiry) {
      sanitized.subscriptionStatus = 'expired';
      sanitized.membershipTier = 'free';
      (sanitized as any).vipStatus = 'expired';
      delete sanitized.subscriptionExpiryDate;
      sanitized.paidAdditionalStoreSlots = 0;
      (sanitized as any).approvedStoresCount = 0;
      tampered = true;
      reason = reason
        ? `${reason}; Fake VIP stripped: invalid seal & not in cloud`
        : 'Fake VIP stripped: invalid integrity seal and not found in authoritative records';
    }
  }

  try {
    localStorage.setItem('kft_current_user_v5', JSON.stringify(sanitized));
  } catch {}

  return { user: sanitized, tampered, reason };
}

/**
 * Synchronous startup integrity & VIP self-healing check called in main.tsx before App renders.
 * Ensures that updating the app version NEVER clears or downgrades a valid VIP account.
 */
export function sanitizeStartupCurrentUser(): { tampered: boolean; user: any | null } {
  try {
    if (localStorage.getItem('kft_explicit_logged_out_v1') === '1') {
      localStorage.removeItem('kft_current_user_v5');
      localStorage.removeItem('kft_current_user_v4');
      return { tampered: false, user: null };
    }
    // Migrate legacy v4 user keys if v5 is not yet present
    const rawV5 = localStorage.getItem('kft_current_user_v5');
    const rawV4 = localStorage.getItem('kft_current_user_v4');
    const raw =
      rawV5 && rawV5 !== 'undefined' && rawV5 !== 'null'
        ? rawV5
        : rawV4 && rawV4 !== 'undefined' && rawV4 !== 'null'
        ? rawV4
        : null;

    if (!raw) return { tampered: false, user: null };
    const rawParsed = JSON.parse(raw);
    if (!rawParsed || typeof rawParsed !== 'object') return { tampered: false, user: null };

    const parsed: any = sanitizeUserVipPlanAndExpiry(rawParsed as User);
    let tampered = false;
    let updated =
      parsed.subscriptionExpiryDate !== rawParsed.subscriptionExpiryDate ||
      parsed.vipPlanDays !== rawParsed.vipPlanDays;

    const isDedicatedAdminProfile =
      parsed.id === 'admin-authorized-single' ||
      parsed.username === 'cheasavuth' ||
      parsed.username === 'admin';

    // 1. Admin Role check (preserve dedicated single Administrator profile across APK updates when sessionStorage resets)
    if (parsed.role === 'admin' && !isDedicatedAdminProfile) {
      const token = sessionStorage.getItem('kft_admin_session_token');
      let valid = false;
      if (token && token.includes('.')) {
        try {
          const payload = JSON.parse(atob(token.split('.')[0]));
          if (payload && typeof payload.expiresAt === 'number' && payload.expiresAt > Date.now()) {
            valid = true;
          }
        } catch {}
      }
      if (!valid) {
        parsed.role = 'user';
        tampered = true;
      }
    }

    // 2. VIP Self-Healing & Verification across all local backups, transactions, and tickets
    if (!isDedicatedAdminProfile && parsed.role !== 'admin') {
      const isVipClaimed =
        parsed.vipStatus === 'active' ||
        parsed.subscriptionStatus === 'active' ||
        parsed.membershipTier === 'premium_vip';

      const isExplicitlyCancelled =
        isUserExplicitlyCancelled(rawParsed) || isUserExplicitlyCancelled(parsed);
      if (isExplicitlyCancelled) {
        parsed.membershipTier = 'free';
        parsed.subscriptionStatus = 'cancelled';
        parsed.paymentStatus = 'cancelled';
        parsed.vipStatus = 'none';
        delete parsed.subscriptionExpiryDate;
        delete parsed.vipExpiresAt;
        parsed.freeTrialActivated = false;
        delete parsed.freeTrialExpiresAt;
        parsed.autoRenew = false;
        parsed.integritySeal = computeUserIntegritySealSync(parsed);
        purgeCancelledUserFromLocalCaches(parsed);
        updated = true;
      }

      const entitlement = !isExplicitlyCancelled
        ? findLocalAuthoritativeVipEntitlement(parsed)
        : { found: false, expiryMs: 0 };

      const ownExpMs = parseSafeDateMs(parsed.subscriptionExpiryDate || parsed.vipExpiresAt);
      const hasOwnValidFutureExpiry = !isExplicitlyCancelled && isVipClaimed && ownExpMs > Date.now();

      if (entitlement.found || hasOwnValidFutureExpiry) {
        const bestExpMs = Math.max(
          entitlement.expiryIso ? parseSafeDateMs(entitlement.expiryIso) : 0,
          hasOwnValidFutureExpiry ? ownExpMs : 0
        );
        if (bestExpMs > Date.now()) {
          const cleanExpIso = new Date(bestExpMs).toISOString();
          if (
            parsed.membershipTier !== 'premium_vip' ||
            parsed.subscriptionStatus !== 'active' ||
            parsed.paymentStatus !== 'verified' ||
            parsed.subscriptionExpiryDate !== cleanExpIso ||
            !parsed.integritySeal
          ) {
            parsed.membershipTier = 'premium_vip';
            parsed.subscriptionStatus = 'active';
            parsed.paymentStatus = 'verified';
            parsed.vipStatus = 'active';
            parsed.subscriptionExpiryDate = cleanExpIso;
            parsed.vipExpiresAt = cleanExpIso;
            parsed.vipCancelledAt = undefined;
            if (!parsed.subscriptionStartDate && entitlement.startIso) {
              parsed.subscriptionStartDate = entitlement.startIso;
            }
            if (!parsed.transactionRef && entitlement.transactionRef) {
              parsed.transactionRef = entitlement.transactionRef;
            }
            if (typeof entitlement.paidAdditionalStoreSlots === 'number') {
              parsed.paidAdditionalStoreSlots = Math.max(
                parsed.paidAdditionalStoreSlots || 0,
                entitlement.paidAdditionalStoreSlots
              );
            }
            if (entitlement.matchedUser) {
              const mu = entitlement.matchedUser;
              const ownArMs = parseSafeDateMs(parsed.autoRenewUpdatedAt || parsed.autoRenewConsentAt);
              const matchArMs = parseSafeDateMs(mu.autoRenewUpdatedAt || mu.autoRenewConsentAt);
              if (matchArMs > ownArMs || (parsed.autoRenew === undefined && mu.autoRenew !== undefined)) {
                const isExplicitlyCancelled = Boolean(
                  mu.autoRenewCancelledAt || (mu.autoRenew === false && mu.autoRenewCancelledAt)
                );
                parsed.autoRenew = isExplicitlyCancelled ? false : (mu.autoRenew !== false);
                parsed.autoRenewPlanId = mu.autoRenewPlanId || parsed.autoRenewPlanId;
                parsed.autoRenewPaymentMethod = mu.autoRenewPaymentMethod || parsed.autoRenewPaymentMethod;
                parsed.autoRenewPaymentLabel = mu.autoRenewPaymentLabel || parsed.autoRenewPaymentLabel;
                parsed.autoRenewConsentAt =
                  mu.autoRenewConsentAt ||
                  parsed.autoRenewConsentAt ||
                  (!isExplicitlyCancelled ? (parsed.subscriptionStartDate || parsed.verifiedAt || new Date().toISOString()) : undefined);
                parsed.autoRenewCancelledAt = isExplicitlyCancelled
                  ? (mu.autoRenewCancelledAt || parsed.autoRenewCancelledAt)
                  : undefined;
                parsed.autoRenewLastChargedAt = mu.autoRenewLastChargedAt || parsed.autoRenewLastChargedAt;
                parsed.autoRenewLastStatus = mu.autoRenewLastStatus;
                parsed.autoRenewFailureReason = mu.autoRenewFailureReason;
                parsed.autoRenewUpdatedAt = mu.autoRenewUpdatedAt || parsed.autoRenewUpdatedAt;
              }
              if (Array.isArray(mu.vipMembershipHistory) && mu.vipMembershipHistory.length > 0) {
                const histMap = new Map<string, any>();
                for (const h of [
                  ...(Array.isArray(parsed.vipMembershipHistory) ? parsed.vipMembershipHistory : []),
                  ...mu.vipMembershipHistory,
                ]) {
                  if (h && h.id) histMap.set(h.id, h);
                }
                parsed.vipMembershipHistory = Array.from(histMap.values())
                  .sort((a, b) => parseSafeDateMs(b.date) - parseSafeDateMs(a.date))
                  .slice(0, 50);
              }
            }
            parsed.integritySeal = computeUserIntegritySealSync(parsed);
            updated = true;
          }
        }
      } else if (isVipClaimed && !parsed.integritySeal) {
        // Check if this is a legacy active VIP record where subscriptionExpiryDate was omitted
        const startMs = parseSafeDateMs(
          parsed.subscriptionStartDate || parsed.verifiedAt || parsed.lastLoginAt || parsed.registeredAtIso
        );
        const planDays = resolveUserActualVipPlanDays(parsed);
        const inferredExpMs =
          (startMs > 0 ? Math.max(startMs, Date.now()) : Date.now()) + planDays * 24 * 60 * 60 * 1000;
        if (parsed.paymentStatus === 'verified' || (parsed.membershipTier === 'premium_vip' && parsed.subscriptionStatus === 'active')) {
          const cleanExpIso = new Date(inferredExpMs).toISOString();
          parsed.membershipTier = 'premium_vip';
          parsed.subscriptionStatus = 'active';
          parsed.paymentStatus = 'verified';
          parsed.vipStatus = 'active';
          parsed.vipPlanDays = planDays;
          parsed.subscriptionExpiryDate = cleanExpIso;
          parsed.vipExpiresAt = cleanExpIso;
          parsed.integritySeal = computeUserIntegritySealSync(parsed);
          updated = true;
        }
      }
    }

    if (tampered || updated || !rawV5) {
      const serialized = JSON.stringify(parsed);
      try {
        localStorage.setItem('kft_current_user_v5', serialized);
      } catch {
        // Quota recovery: evict expendable caches so active logged-in session is NEVER lost
        try {
          for (const expendableKey of [
            'kft_google_places_smart_cache_v1',
            'kft_foods_200_v9',
            'kft_destinations_real_v8',
            'kft_restaurants_real_v12',
            'kft_foods_200_v10',
            'kft_destinations_real_v9',
          ]) {
            localStorage.removeItem(expendableKey);
          }
          localStorage.setItem('kft_current_user_v5', serialized);
        } catch {}
      }
    }

    return { tampered, user: parsed };
  } catch {
    return { tampered: false, user: null };
  }
}
