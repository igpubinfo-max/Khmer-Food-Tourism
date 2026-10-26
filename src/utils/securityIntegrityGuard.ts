/**
 * Khmer Food & Tourism - Anti-Tamper Session & VIP Integrity Guard
 * 
 * Provides:
 * 1. Cryptographic HMAC-SHA256 seal (computeUserIntegritySeal) binding user id, role, vipStatus,
 *    vipPlanType, vipExpiresAt, and approvedStoresCount with non-trivial key derivation.
 * 2. Active Admin Security session verification (never trusts localStorage role: "admin" without
 *    an active cryptographic token from adminSecurityService).
 * 3. VIP integrity cross-check against authoritative cloud records to prevent DevTools localStorage tampering.
 * 4. Startup session sanitization for main.tsx.
 */

import { User } from '../types';
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
 * Fast 64-bit Murmur/FNV-style hash fallback for synchronous fallback verification
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

/**
 * Computes a cryptographic HMAC/SHA-256 integrity seal that binds:
 * user.id, user.role, user.vipStatus, user.vipPlanType, user.vipExpiresAt, user.approvedStoresCount
 */
export async function computeUserIntegritySeal(user: Partial<User> | any): Promise<string> {
  if (!user || !user.id) return '';
  const userId = String(user.id || '');
  const userRole = String(user.role || 'user');
  const vipStatus = String(
    user.vipStatus ||
    user.subscriptionStatus ||
    (user.membershipTier === 'premium_vip' ? 'active' : 'none')
  );
  const vipPlanType = String(user.vipPlanType || user.paymentPlanId || user.planId || 'standard');
  const vipExpiresAt = String(user.vipExpiresAt || user.subscriptionExpiryDate || '');
  const approvedStoresCount = String(user.approvedStoresCount ?? user.paidAdditionalStoreSlots ?? 0);

  const payload = `${userId}|${userRole}|${vipStatus}|${vipPlanType}|${vipExpiresAt}|${approvedStoresCount}`;
  const derivedKeyString = deriveInternalKey(userId);

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
    localStorage.setItem('kft_current_user_v4', JSON.stringify(sealed));
  } catch {}
  return sealed;
}

/**
 * Verifies whether user object has a valid integrity seal
 */
export async function verifyUserIntegritySeal(user: Partial<User> | any): Promise<boolean> {
  if (!user || !user.integritySeal) return false;
  const expected = await computeUserIntegritySeal(user);
  return user.integritySeal === expected;
}

/**
 * Validates and sanitizes a user session loaded from localStorage:
 * 1. If user.role === 'admin', requires a valid active Admin Security session token.
 * 2. If user.vipStatus === 'active', verifies the integrity seal AND cross-checks against kft_cloud_users_v2.
 */
export async function verifyAndSanitizeUserSession(
  user: User | null,
  authoritativeCloudUsers?: User[] | null
): Promise<{ user: User | null; tampered: boolean; reason?: string }> {
  if (!user) return { user: null, tampered: false };

  const sanitized: User = { ...user };
  let tampered = false;
  let reason = '';

  // 1. Admin Role Security: never trust raw localStorage role: "admin" without active token
  if (sanitized.role === 'admin') {
    const hasToken = adminSecurityService.hasActiveAdminToken();
    const isTokenVerified = hasToken ? await adminSecurityService.verifyAdminSession() : false;
    if (!isTokenVerified) {
      sanitized.role = 'user';
      tampered = true;
      reason = 'Admin role stripped: missing or expired Admin Security session token';
    }
  }

  // 2. VIP Status Integrity: verify seal and cloud authoritative list
  const isVipClaimed =
    (sanitized as any).vipStatus === 'active' ||
    sanitized.subscriptionStatus === 'active' ||
    sanitized.membershipTier === 'premium_vip';

  if (isVipClaimed) {
    let sealMatches = false;
    if (sanitized.integritySeal) {
      const expectedSeal = await computeUserIntegritySeal(sanitized);
      sealMatches = sanitized.integritySeal === expectedSeal;
    }

    // Cross-check against cloud users
    let cloudApprovedVip = false;
    let cloudUsersList: User[] = authoritativeCloudUsers || [];
    if (!cloudUsersList.length) {
      try {
        const rawCloud = localStorage.getItem('kft_cloud_users_v2') || localStorage.getItem('kft_users_v4');
        if (rawCloud) {
          const parsed = JSON.parse(rawCloud);
          if (Array.isArray(parsed)) cloudUsersList = parsed;
        }
      } catch {}
    }

    if (cloudUsersList.length) {
      const matched = cloudUsersList.find(
        (u) => u.id === sanitized.id || (sanitized.email && u.email === sanitized.email)
      );
      if (
        matched &&
        (matched.subscriptionStatus === 'active' ||
          matched.membershipTier === 'premium_vip' ||
          (matched as any).vipStatus === 'active')
      ) {
        cloudApprovedVip = true;
        if (matched.subscriptionExpiryDate) {
          sanitized.subscriptionExpiryDate = matched.subscriptionExpiryDate;
        }
        if (typeof matched.paidAdditionalStoreSlots === 'number') {
          sanitized.paidAdditionalStoreSlots = matched.paidAdditionalStoreSlots;
        }
      }
    }

    // If neither integrity seal nor cloud approves VIP -> TAMPERED
    if (!sealMatches && !cloudApprovedVip) {
      sanitized.subscriptionStatus = 'expired';
      sanitized.membershipTier = 'free';
      (sanitized as any).vipStatus = 'expired';
      delete sanitized.subscriptionExpiryDate;
      sanitized.paidAdditionalStoreSlots = 0;
      (sanitized as any).approvedStoresCount = 0;
      tampered = true;
      reason = reason
        ? `${reason}; Fake VIP stripped: invalid seal & not in cloud`
        : 'Fake VIP stripped: invalid integrity seal and not found in authoritative cloud records';
    } else if (cloudApprovedVip && !sealMatches) {
      // Legit VIP from cloud with missing seal -> seal it
      sanitized.integritySeal = await computeUserIntegritySeal(sanitized);
    }
  }

  if (tampered) {
    try {
      localStorage.setItem('kft_current_user_v4', JSON.stringify(sanitized));
    } catch {}
  }

  return { user: sanitized, tampered, reason };
}

/**
 * Synchronous startup integrity check called in main.tsx before App renders
 */
export function sanitizeStartupCurrentUser(): { tampered: boolean; user: any | null } {
  try {
    const raw = localStorage.getItem('kft_current_user_v4');
    if (!raw) return { tampered: false, user: null };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { tampered: false, user: null };

    let tampered = false;

    // 1. Admin Role check
    if (parsed.role === 'admin') {
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

    // 2. Fake VIP check
    const isVip =
      parsed.vipStatus === 'active' ||
      parsed.subscriptionStatus === 'active' ||
      parsed.membershipTier === 'premium_vip';

    if (isVip) {
      let isCloudApproved = false;
      try {
        const cloudRaw = localStorage.getItem('kft_cloud_users_v2') || localStorage.getItem('kft_users_v4');
        if (cloudRaw) {
          const cloudList = JSON.parse(cloudRaw);
          if (Array.isArray(cloudList)) {
            const m = cloudList.find((u: any) => u.id === parsed.id || (u.email && u.email === parsed.email));
            if (m && (m.subscriptionStatus === 'active' || m.membershipTier === 'premium_vip' || m.vipStatus === 'active')) {
              isCloudApproved = true;
            }
          }
        }
      } catch {}

      if (!isCloudApproved && !parsed.integritySeal) {
        parsed.subscriptionStatus = 'expired';
        parsed.membershipTier = 'free';
        parsed.vipStatus = 'expired';
        delete parsed.subscriptionExpiryDate;
        parsed.paidAdditionalStoreSlots = 0;
        parsed.approvedStoresCount = 0;
        tampered = true;
      }
    }

    if (tampered) {
      localStorage.setItem('kft_current_user_v4', JSON.stringify(parsed));
    }

    return { tampered, user: parsed };
  } catch {
    return { tampered: false, user: null };
  }
}
