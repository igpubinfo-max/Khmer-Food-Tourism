/**
 * Privacy-Safe Device Identity Hash Service (@capacitor/device)
 *
 * Strictly used ONLY when claiming a one-time 7-Day Free Trial or one-time $0.99 Win-Back Promo
 * on Android and Web (Two-Line Abuse Protection: Identity Hash OR Device Hash).
 *
 * Key Guarantees:
 *  1. Phone-Change Safety: Paid VIP and Shop subscriptions live on the user's cloud account (`kft_user_<id>`),
 *     NEVER locked to a single device. Changing phones never revokes an active VIP or shop entitlement.
 *  2. Apple App Store Compliance: On native iOS / iPadOS runtimes, this service skips reading any device ID
 *     and returns `deviceHash: null` because iOS stays 100% free with zero trials or payments.
 *  3. Privacy Protection: Only a salted one-way SHA-256 hash leaves the device; never used for tracking or ads.
 */

import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { isIosOrIpadAppStoreRuntime, isNativeIosApp } from '../types';
import { sha256Hex } from '../utils/identityNormalize';

const WEB_DEVICE_TOKEN_STORAGE_KEY = 'kft_web_device_token_v1';
const DEVICE_HASH_CACHE_KEY = 'kft_device_hash_cache_v1';
const IDB_NAME = 'kft_device_identity_db_v1';
const IDB_STORE = 'tokens';

let memoizedHash: string | null = null;

function generateRandomToken(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {}
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

async function readWebTokenFromIdb(): Promise<string | null> {
  if (typeof indexedDB === 'undefined') return null;
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onerror = () => resolve(null);
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction(IDB_STORE, 'readonly');
          const getReq = tx.objectStore(IDB_STORE).get(WEB_DEVICE_TOKEN_STORAGE_KEY);
          getReq.onsuccess = () => {
            db.close();
            resolve(typeof getReq.result === 'string' && getReq.result ? getReq.result : null);
          };
          getReq.onerror = () => {
            db.close();
            resolve(null);
          };
        } catch {
          resolve(null);
        }
      };
    } catch {
      resolve(null);
    }
  });
}

async function writeWebTokenToIdb(token: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onerror = () => resolve();
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).put(token, WEB_DEVICE_TOKEN_STORAGE_KEY);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        } catch {
          resolve();
        }
      };
    } catch {
      resolve();
    }
  });
}

async function getOrCreatePersistentWebToken(): Promise<string> {
  let lsToken: string | null = null;
  try {
    lsToken = typeof localStorage !== 'undefined' ? localStorage.getItem(WEB_DEVICE_TOKEN_STORAGE_KEY) : null;
  } catch {}

  const idbToken = await readWebTokenFromIdb();
  let capId = '';
  try {
    const res = await Device.getId();
    capId = String(res?.identifier || '').trim();
  } catch {}

  const chosen = (lsToken && lsToken.length >= 12 ? lsToken : null) ||
    (idbToken && idbToken.length >= 12 ? idbToken : null) ||
    (capId.length >= 12 ? capId : null) ||
    generateRandomToken();

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(WEB_DEVICE_TOKEN_STORAGE_KEY, chosen);
    }
  } catch {}
  await writeWebTokenToIdb(chosen);
  return chosen;
}

export interface DeviceIdentityResult {
  deviceHash: string | null;
  platform: 'android' | 'ios' | 'web';
  skippedForIosPolicy: boolean;
}

/**
 * Computes the salted one-way SHA-256 device hash for Trial / $0.99 Promo eligibility checks.
 * Never called on iOS (returns `deviceHash: null, skippedForIosPolicy: true`).
 */
export async function getDeviceHashForTrialOrPromoClaim(): Promise<DeviceIdentityResult> {
  if (isNativeIosApp() || isIosOrIpadAppStoreRuntime()) {
    return { deviceHash: null, platform: 'ios', skippedForIosPolicy: true };
  }

  const platformRaw = Capacitor.getPlatform();
  const platform: 'android' | 'web' = platformRaw === 'android' ? 'android' : 'web';

  if (memoizedHash && /^[a-f0-9]{64}$/.test(memoizedHash)) {
    return { deviceHash: memoizedHash, platform, skippedForIosPolicy: false };
  }

  if (platform === 'android') {
    try {
      const idInfo = await Device.getId();
      const rawAndroidId = String(idInfo?.identifier || '').trim();
      if (rawAndroidId.length >= 6) {
        const hash = await sha256Hex(`kft-device-v1:android:${rawAndroidId}`);
        memoizedHash = hash;
        try {
          localStorage.setItem(DEVICE_HASH_CACHE_KEY, hash);
        } catch {}
        return { deviceHash: hash, platform: 'android', skippedForIosPolicy: false };
      }
    } catch {}
  }

  // Web (or fallback if native plugin bridge wasn't ready)
  try {
    const webToken = await getOrCreatePersistentWebToken();
    const hash = await sha256Hex(`kft-device-v1:${platform}:${webToken}`);
    memoizedHash = hash;
    try {
      localStorage.setItem(DEVICE_HASH_CACHE_KEY, hash);
    } catch {}
    return { deviceHash: hash, platform, skippedForIosPolicy: false };
  } catch {
    try {
      const cached = localStorage.getItem(DEVICE_HASH_CACHE_KEY);
      if (cached && /^[a-f0-9]{64}$/.test(cached)) {
        return { deviceHash: cached, platform, skippedForIosPolicy: false };
      }
    } catch {}
    return { deviceHash: null, platform, skippedForIosPolicy: false };
  }
}


export const MAX_ACCOUNTS_PER_DEVICE = 2;
export const ACCOUNT_REGISTRATION_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes between 1st and 2nd account on same device
const DEVICE_REGISTERED_ACCOUNTS_KEY = 'kft_device_registered_accounts_v1';

export interface DeviceRegisteredAccountsLedger {
  deviceHash: string | null;
  accounts: Array<{ key: string; registeredAtMs: number }>;
}

function readLocalDeviceAccountsLedger(): DeviceRegisteredAccountsLedger {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(DEVICE_REGISTERED_ACCOUNTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.accounts)) {
          return {
            deviceHash: typeof parsed.deviceHash === 'string' ? parsed.deviceHash : null,
            accounts: parsed.accounts.filter(
              (a: any) => a && typeof a.key === 'string' && a.key.trim() && Number.isFinite(Number(a.registeredAtMs))
            ),
          };
        }
      }
    }
  } catch {}
  return { deviceHash: null, accounts: [] };
}

function writeLocalDeviceAccountsLedger(ledger: DeviceRegisteredAccountsLedger): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DEVICE_REGISTERED_ACCOUNTS_KEY, JSON.stringify(ledger));
    }
  } catch {}
}

export interface DeviceRegistrationEligibilityResult {
  allowed: boolean;
  deviceHash: string | null;
  registeredCount: number;
  reason?: 'device_account_limit_reached' | 'registration_cooldown';
  waitSeconds?: number;
  messageKh?: string;
  messageEn?: string;
}

/**
 * Checks whether this device is allowed to register a NEW account:
 *  - Existing accounts re-signing in are ALWAYS allowed.
 *  - Caps new account creation at MAX_ACCOUNTS_PER_DEVICE (2 accounts per device).
 *  - Enforces a 3-minute anti-spam cooldown between creating the 1st and 2nd account on the same device.
 */
export async function checkDeviceAccountRegistrationEligibility(params: {
  candidateAccountKey: string;
  existingUsers?: Array<{ id?: string; email?: string; phone?: string; registeredDeviceHash?: string }>;
  nowMs?: number;
}): Promise<DeviceRegistrationEligibilityResult> {
  const now = params.nowMs ?? Date.now();
  const cleanCandidate = String(params.candidateAccountKey || '').trim().toLowerCase();
  const devInfo = await getDeviceHashForTrialOrPromoClaim();
  const deviceHash = devInfo.deviceHash;

  const ledger = readLocalDeviceAccountsLedger();
  const distinctKeys = new Set<string>();
  let latestRegMs = 0;

  for (const entry of ledger.accounts) {
    const k = entry.key.trim().toLowerCase();
    if (k) {
      distinctKeys.add(k);
      if (entry.registeredAtMs > latestRegMs) {
        latestRegMs = entry.registeredAtMs;
      }
    }
  }

  // Also include accounts in the synced user list that share this deviceHash
  if (deviceHash && Array.isArray(params.existingUsers)) {
    for (const u of params.existingUsers) {
      if (u && u.registeredDeviceHash && u.registeredDeviceHash === deviceHash) {
        const uKey = String(u.phone || u.email || u.id || '').trim().toLowerCase();
        if (uKey) distinctKeys.add(uKey);
      }
    }
  }

  // If this account key is already registered on this device, allow re-registration/sign-in
  if (cleanCandidate && distinctKeys.has(cleanCandidate)) {
    return {
      allowed: true,
      deviceHash,
      registeredCount: distinctKeys.size,
    };
  }

  if (distinctKeys.size >= MAX_ACCOUNTS_PER_DEVICE) {
    return {
      allowed: false,
      deviceHash,
      registeredCount: distinctKeys.size,
      reason: 'device_account_limit_reached',
      messageKh: `⚠️ ឧបករណ៍នេះបានបង្កើតគណនីគ្រប់កំណត់អតិបរមាហើយ (${MAX_ACCOUNTS_PER_DEVICE} គណនីក្នុងមួយទូរសព្ទ)។ សូមចុច «ចូលគណនី» ដើម្បីប្រើគណនីដែលមានស្រាប់របស់អ្នក!`,
      messageEn: `⚠️ This device has reached the maximum limit of ${MAX_ACCOUNTS_PER_DEVICE} registered accounts. Please sign in to your existing account!`,
    };
  }

  if (latestRegMs > 0 && now - latestRegMs < ACCOUNT_REGISTRATION_COOLDOWN_MS) {
    const waitSeconds = Math.max(1, Math.ceil((ACCOUNT_REGISTRATION_COOLDOWN_MS - (now - latestRegMs)) / 1000));
    return {
      allowed: false,
      deviceHash,
      registeredCount: distinctKeys.size,
      reason: 'registration_cooldown',
      waitSeconds,
      messageKh: `⚠️ សូមរង់ចាំ ${waitSeconds} វិនាទីទៀត មុនពេលបង្កើតគណនីថ្មីបន្ថែមនៅលើឧបករណ៍ដដែលនេះ។`,
      messageEn: `⚠️ Please wait ${waitSeconds} seconds before registering another account on this device.`,
    };
  }

  return {
    allowed: true,
    deviceHash,
    registeredCount: distinctKeys.size,
  };
}

export async function recordDeviceAccountRegistration(
  candidateAccountKey: string,
  explicitDeviceHash?: string | null,
  nowMs?: number
): Promise<string | null> {
  const now = nowMs ?? Date.now();
  const cleanKey = String(candidateAccountKey || '').trim().toLowerCase();
  const devInfo = explicitDeviceHash
    ? { deviceHash: explicitDeviceHash }
    : await getDeviceHashForTrialOrPromoClaim();
  if (!cleanKey) return devInfo.deviceHash;

  const ledger = readLocalDeviceAccountsLedger();
  const filtered = ledger.accounts.filter((a) => a.key.trim().toLowerCase() !== cleanKey);
  filtered.push({ key: cleanKey, registeredAtMs: now });
  writeLocalDeviceAccountsLedger({
    deviceHash: devInfo.deviceHash || ledger.deviceHash,
    accounts: filtered,
  });
  return devInfo.deviceHash;
}

/**
 * Generates a deterministic 4-digit in-app security OTP verification code for phone registration.
 */
export function generateInAppPhoneOtpCode(canonicalPhone: string, sessionSalt: string): string {
  const input = `kft-otp-v1:${canonicalPhone}:${sessionSalt}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const fourDigit = 1000 + (hash % 9000);
  return String(fourDigit);
}
