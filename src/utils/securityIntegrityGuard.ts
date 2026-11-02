/**
 * Khmer Food & Tourism - Anti-Tamper Session & VIP Integrity Guard
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

import { User, parseSafeDateMs } from '../types';
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

/**
 * Inspects all local persistence registries, backups, transactions, and support tickets
 * to verify or recover a user's active VIP membership across app version updates.
 */
export function findLocalAuthoritativeVipEntitlement(
  targetUser: Partial<User> | null | undefined,
  extraCloudUsers?: User[] | null
): LocalAuthoritativeVipMatch {
  if (!targetUser) return { found: false, expiryMs: 0 };
  const nowMs = Date.now();
  let bestExpMs = 0;
  let bestStartIso: string | undefined;
  let bestTxnRef: string | undefined;
  let bestMethod: User['paymentMethod'] | undefined;
  let bestSlots = typeof targetUser.paidAdditionalStoreSlots === 'number' ? targetUser.paidAdditionalStoreSlots : 0;
  let bestMatchedUser: User | undefined;

  const considerUserRecord = (cand: any) => {
    if (!cand || typeof cand !== 'object') return;
    if (!doesUserMatchCandidate(cand, targetUser)) return;
    if (typeof cand.paidAdditionalStoreSlots === 'number' && cand.paidAdditionalStoreSlots > bestSlots) {
      bestSlots = cand.paidAdditionalStoreSlots;
    }
    if (cand.subscriptionStatus === 'cancelled' || cand.paymentStatus === 'cancelled') return;
    const isVip =
      cand.membershipTier === 'premium_vip' ||
      cand.subscriptionStatus === 'active' ||
      cand.vipStatus === 'active';
    if (!isVip) return;

    const rawExp = cand.subscriptionExpiryDate || cand.vipExpiresAt;
    let expMs = parseSafeDateMs(rawExp);
    if (expMs <= 0 && cand.membershipTier === 'premium_vip' && cand.subscriptionStatus === 'active') {
      const startMs = parseSafeDateMs(cand.subscriptionStartDate || cand.verifiedAt || cand.lastLoginAt || cand.registeredAtIso) || nowMs;
      expMs = Math.max(startMs, nowMs) + 30 * 24 * 60 * 60 * 1000;
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
        try {
          const rawCur = localStorage.getItem(curKey);
          if (!rawCur || rawCur === 'undefined' || rawCur === 'null') continue;
          const parsedCur = JSON.parse(rawCur);
          if (parsedCur && typeof parsedCur === 'object' && !Array.isArray(parsedCur)) {
            considerUserRecord(parsedCur);
          }
        } catch {}
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
        try {
          const raw = localStorage.getItem(key);
          if (!raw || raw === 'undefined' || raw === 'null') continue;
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (const u of parsed) considerUserRecord(u);
          }
        } catch {}
      }

      // 2. Check Pre-Update Database Snapshot (`kft_pre_update_db_backup_v1`)
      try {
        const rawPre = localStorage.getItem('kft_pre_update_db_backup_v1');
        if (rawPre && rawPre !== 'undefined' && rawPre !== 'null') {
          const snap = JSON.parse(rawPre);
          if (Array.isArray(snap?.vipUsers)) {
            for (const u of snap.vipUsers) considerUserRecord(u);
          }
          if (Array.isArray(snap?.verifiedTransactions)) {
            for (const t of snap.verifiedTransactions) {
              if (!t || t.status !== 'verified' || t.type === 'additional_store_slot') continue;
              if (!doesUserMatchCandidate(t, targetUser)) continue;
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
      } catch {}

      // 3. Check Verified Transactions (`kft_transactions_v4` & `kft_transactions_v3`)
      for (const txnKey of ['kft_transactions_v4', 'kft_transactions_v3']) {
        try {
          const rawTxns = localStorage.getItem(txnKey);
          if (!rawTxns || rawTxns === 'undefined' || rawTxns === 'null') continue;
          const txns = JSON.parse(rawTxns);
          if (Array.isArray(txns)) {
            for (const t of txns) {
              if (!t || t.status !== 'verified') continue;
              if (!doesUserMatchCandidate(t, targetUser)) continue;
              if (t.type === 'additional_store_slot') continue;
              const expMs = parseSafeDateMs(t.expiresAt);
              if (expMs > nowMs && expMs > bestExpMs) {
                bestExpMs = expMs;
                bestStartIso = t.verifiedAt || t.createdAt || bestStartIso;
                bestTxnRef = t.transactionRef || bestTxnRef;
                bestMethod = t.paymentMethod || bestMethod;
              }
            }
          }
        } catch {}
      }

      // 4. Check Resolved VIP-Approved Support Tickets (`kft_support_tickets_v1`)
      try {
        const rawTickets = localStorage.getItem('kft_support_tickets_v1');
        if (rawTickets && rawTickets !== 'undefined' && rawTickets !== 'null') {
          const tickets = JSON.parse(rawTickets);
          if (Array.isArray(tickets)) {
            for (const tk of tickets) {
              if (!tk || !tk.vipApproved || tk.status !== 'resolved') continue;
              if (!doesUserMatchCandidate(tk, targetUser)) continue;
              const baseMs =
                parseSafeDateMs(tk.vipApprovedAt) ||
                parseSafeDateMs(tk.updatedAt) ||
                parseSafeDateMs(tk.createdAt);
              const days = typeof tk.durationDays === 'number' && tk.durationDays >= 1 ? tk.durationDays : 30;
              if (baseMs > 0) {
                const expMs = baseMs + days * 24 * 60 * 60 * 1000;
                if (expMs > nowMs && expMs > bestExpMs) {
                  bestExpMs = expMs;
                  bestStartIso = new Date(baseMs).toISOString();
                  bestTxnRef = tk.paymentRef || bestTxnRef;
                }
              }
            }
          }
        }
      } catch {}
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

  const sanitized: User = { ...user };
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
  const isVipClaimed =
    (sanitized as any).vipStatus === 'active' ||
    sanitized.subscriptionStatus === 'active' ||
    sanitized.membershipTier === 'premium_vip';

  const entitlement = findLocalAuthoritativeVipEntitlement(sanitized, authoritativeCloudUsers);
  const ownExpMs = parseSafeDateMs(sanitized.subscriptionExpiryDate || sanitized.vipExpiresAt);
  const hasOwnValidFutureExpiry =
    isVipClaimed &&
    sanitized.subscriptionStatus !== 'cancelled' &&
    sanitized.paymentStatus !== 'cancelled' &&
    ownExpMs > Date.now();

  if (isVipClaimed || entitlement.found) {
    let sealMatches = false;
    if (sanitized.integritySeal) {
      sealMatches = await verifyUserIntegritySeal(sanitized);
    }

    if (entitlement.found || hasOwnValidFutureExpiry || sealMatches) {
      const bestExpMs = Math.max(
        entitlement.expiryIso ? parseSafeDateMs(entitlement.expiryIso) : 0,
        hasOwnValidFutureExpiry ? ownExpMs : 0
      );
      if (bestExpMs > Date.now()) {
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
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { tampered: false, user: null };

    let tampered = false;
    let updated = false;

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
        parsed.subscriptionStatus === 'cancelled' || parsed.paymentStatus === 'cancelled';

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
            parsed.integritySeal = computeUserIntegritySealSync(parsed);
            updated = true;
          }
        }
      } else if (isVipClaimed && !parsed.integritySeal) {
        // Check if this is a legacy active VIP record where subscriptionExpiryDate was omitted
        const startMs = parseSafeDateMs(
          parsed.subscriptionStartDate || parsed.verifiedAt || parsed.lastLoginAt || parsed.registeredAtIso
        );
        const inferredExpMs = (startMs > 0 ? Math.max(startMs, Date.now()) : Date.now()) + 30 * 24 * 60 * 60 * 1000;
        if (parsed.paymentStatus === 'verified' || (parsed.membershipTier === 'premium_vip' && parsed.subscriptionStatus === 'active')) {
          const cleanExpIso = new Date(inferredExpMs).toISOString();
          parsed.membershipTier = 'premium_vip';
          parsed.subscriptionStatus = 'active';
          parsed.paymentStatus = 'verified';
          parsed.vipStatus = 'active';
          parsed.subscriptionExpiryDate = cleanExpIso;
          parsed.vipExpiresAt = cleanExpIso;
          parsed.integritySeal = computeUserIntegritySealSync(parsed);
          updated = true;
        }
      }
    }

    if (tampered || updated || !rawV5) {
      try {
        localStorage.setItem('kft_current_user_v5', JSON.stringify(parsed));
      } catch {}
    }

    return { tampered, user: parsed };
  } catch {
    return { tampered: false, user: null };
  }
}
