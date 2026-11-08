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
