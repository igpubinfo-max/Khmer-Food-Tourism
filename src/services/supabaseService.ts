/**
 * Supabase Cloud Database & Storage Synchronization Service (Free Tier Compatible)
 *
 * Provides real-time cloud persistence across all user devices and Admin phones for:
 * 1. Registered User Accounts (`kft_users`)
 * 2. VIP Payment Requests & Uploaded Payment Proof Receipts (`kft_transactions`)
 * 3. Restaurants & Google Maps Smart-Cached Places (`kft_restaurants`)
 * 4. Tourist Destinations (`kft_destinations`)
 *
 * Works seamlessly in Hybrid Mode:
 * - If Supabase URL & Anon Key are configured (via .env or Admin Dashboard UI),
 *   all data syncs to Supabase Cloud PostgreSQL + Storage automatically.
 * - If not configured yet, safely falls back to local device storage without errors.
 */

import { User, Restaurant, TouristDestination, RegistrationTransaction, DeletedUserRecord, AppSettings, SupportTicket, isSeedRestaurantId } from '../types';

export interface CloudApiConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleMapsApiKey: string;
  geminiApiKey: string;
  aiVisionBackendUrl: string;
  enableAutoCloudSync: boolean;
  updatedAt: string;
}

const CLOUD_API_CONFIG_STORAGE_KEY = 'kft_cloud_api_config_v1';

// Official Production Supabase Free-Tier Project (Southeast Asia - Singapore)
export const DEFAULT_SUPABASE_URL = 'https://ryvltobwuwuulazqjnza.supabase.co';
export const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_h5ufAaA0qAL3s-ebprATsw_8AApv71l';
export const DEFAULT_GOOGLE_MAPS_API_KEY = 'AIzaSyCZnYNQLNcuco5HxdmrWVXKXwvAr7mg7v0';

export function getCloudApiConfig(): CloudApiConfig {
  const envSupabaseUrl =
    (import.meta as any).env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const envSupabaseKey =
    (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  const envGoogleMapsKey =
    (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || DEFAULT_GOOGLE_MAPS_API_KEY;
  const envGeminiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  const envVisionBackend = (import.meta as any).env?.VITE_AI_VISION_BACKEND_URL || '';

  try {
    const raw = localStorage.getItem(CLOUD_API_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        supabaseUrl: (parsed.supabaseUrl || envSupabaseUrl || '').trim().replace(/\/+$/, ''),
        supabaseAnonKey: (parsed.supabaseAnonKey || envSupabaseKey || '').trim(),
        googleMapsApiKey: (parsed.googleMapsApiKey || envGoogleMapsKey || '').trim(),
        geminiApiKey: (parsed.geminiApiKey || envGeminiKey || '').trim(),
        aiVisionBackendUrl: (parsed.aiVisionBackendUrl || envVisionBackend || '').trim(),
        enableAutoCloudSync: parsed.enableAutoCloudSync !== false,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  } catch {
    // ignore storage parse error
  }

  return {
    supabaseUrl: envSupabaseUrl.trim().replace(/\/+$/, ''),
    supabaseAnonKey: envSupabaseKey.trim(),
    googleMapsApiKey: envGoogleMapsKey.trim(),
    geminiApiKey: envGeminiKey.trim(),
    aiVisionBackendUrl: envVisionBackend.trim(),
    enableAutoCloudSync: true,
    updatedAt: new Date().toISOString(),
  };
}

export function saveCloudApiConfig(partial: Partial<CloudApiConfig>): CloudApiConfig {
  const current = getCloudApiConfig();
  const updated: CloudApiConfig = {
    ...current,
    ...partial,
    supabaseUrl: (partial.supabaseUrl ?? current.supabaseUrl).trim().replace(/\/+$/, ''),
    supabaseAnonKey: (partial.supabaseAnonKey ?? current.supabaseAnonKey).trim(),
    googleMapsApiKey: (partial.googleMapsApiKey ?? current.googleMapsApiKey).trim(),
    geminiApiKey: (partial.geminiApiKey ?? current.geminiApiKey).trim(),
    aiVisionBackendUrl: (partial.aiVisionBackendUrl ?? current.aiVisionBackendUrl).trim(),
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(CLOUD_API_CONFIG_STORAGE_KEY, JSON.stringify(updated));
    if (partial.googleMapsApiKey !== undefined) {
      localStorage.removeItem('kft_google_places_api_diag_v1');
    }
    // Also keep AI Vision config in sync so aiFoodService.ts picks up Gemini key automatically
    if (updated.geminiApiKey || updated.aiVisionBackendUrl) {
      const aiVisionCfg = {
        provider: updated.aiVisionBackendUrl
          ? 'backend_proxy'
          : updated.geminiApiKey
          ? 'gemini_vision'
          : 'gemini_vision',
        backendProxyUrl: updated.aiVisionBackendUrl,
        apiKey: updated.geminiApiKey,
        modelName: 'gemini-2.0-flash',
        timeoutMs: 10000,
      };
      localStorage.setItem('kft_ai_vision_config_v1', JSON.stringify(aiVisionCfg));
    }
  } catch (err) {
    console.warn('Failed to save Cloud API config:', err);
  }

  return updated;
}

export function isSupabaseConfigured(): boolean {
  const cfg = getCloudApiConfig();
  return Boolean(
    cfg.supabaseUrl &&
      cfg.supabaseUrl.startsWith('https://') &&
      cfg.supabaseAnonKey &&
      cfg.supabaseAnonKey.length > 20
  );
}

export function isGoogleMapsConfigured(): boolean {
  const cfg = getCloudApiConfig();
  return Boolean(cfg.googleMapsApiKey && cfg.googleMapsApiKey.length > 15);
}

/**
 * Helper to build Supabase REST headers
 */
function getSupabaseHeaders(preferRepresentation = false): Record<string, string> {
  const cfg = getCloudApiConfig();
  const headers: Record<string, string> = {
    apikey: cfg.supabaseAnonKey,
    Authorization: `Bearer ${cfg.supabaseAnonKey}`,
    'Content-Type': 'application/json',
  };
  if (preferRepresentation) {
    headers['Prefer'] = 'resolution=merge-duplicates,return=representation';
  } else {
    headers['Prefer'] = 'resolution=merge-duplicates,return=minimal';
  }
  return headers;
}

/**
 * Safe fetch with strict timeout (prevents app hanging on slow networks / unreachable cloud)
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Test connection to Supabase REST API
 */
export async function testSupabaseConnection(): Promise<{
  ok: boolean;
  messageKh: string;
  latencyMs?: number;
}> {
  const cfg = getCloudApiConfig();
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      messageKh: 'សូមបញ្ចូល Supabase Project URL និង Anon Public Key ជាមុនសិន។',
    };
  }

  const start = Date.now();
  try {
    const res = await fetchWithTimeout(`${cfg.supabaseUrl}/rest/v1/kft_app_kv_store?select=key&limit=1`, {
      method: 'GET',
      headers: getSupabaseHeaders(false),
    }, 3500);
    const latencyMs = Date.now() - start;

    if (res.ok) {
      return {
        ok: true,
        messageKh: `ភ្ជាប់ទៅកាន់ Supabase Cloud ជោគជ័យ! (ល្បឿន ${latencyMs}ms)`,
        latencyMs,
      };
    }

    if (res.status === 404 || res.status === 400) {
      // Connected to Supabase, but table kft_app_kv_store not created yet
      return {
        ok: true,
        messageKh: `ភ្ជាប់ទៅកាន់ Supabase ជោគជ័យ (${latencyMs}ms)! សូមចម្លងកូដ SQL ខាងក្រោមទៅដំណើរការក្នុង Supabase SQL Editor ដើម្បីបង្កើតតារាងទិន្នន័យ។`,
        latencyMs,
      };
    }

    return {
      ok: false,
      messageKh: `មិនអាចភ្ជាប់បានទេ (HTTP ${res.status})។ សូមពិនិត្យមើល Project URL និង Anon Key ម្ដងទៀត។`,
    };
  } catch (err: any) {
    return {
      ok: false,
      messageKh: `កំហុសបណ្តាញ៖ ${err?.name === 'AbortError' ? 'ការតភ្ជាប់លើសពេលកំណត់ (Timeout)' : (err?.message || 'មិនអាចភ្ជាប់ទៅកាន់ Supabase បានទេ')}`,
    };
  }
}

/**
 * Push a shared key-value document to Supabase `kft_app_kv_store` table.
 * Using a unified JSONB table + structured columns makes Free Tier setup 1-click simple
 * and syncs Users, Transactions, Payment Proofs, and Smart-Cached Restaurants reliably.
 */
export async function pushCloudDocument(key: string, payload: any, timeoutMs = 12000): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const cfg = getCloudApiConfig();
  if (!cfg.enableAutoCloudSync) return false;

  try {
    const res = await fetchWithTimeout(`${cfg.supabaseUrl}/rest/v1/kft_app_kv_store`, {
      method: 'POST',
      headers: getSupabaseHeaders(false),
      body: JSON.stringify({
        key,
        payload,
        updated_at: new Date().toISOString(),
      }),
    }, timeoutMs);
    return res.ok;
  } catch (err) {
    console.warn(`Supabase pushCloudDocument(${key}) error:`, err);
    return false;
  }
}

/**
 * Pull a shared key-value document from Supabase `kft_app_kv_store` table.
 * Uses strict cache-busting so mobile WebViews and browsers never return stale cached payloads.
 */
export async function pullCloudDocument<T>(key: string, timeoutMs = 10000): Promise<T | null> {
  if (!isSupabaseConfigured()) return null;
  const cfg = getCloudApiConfig();

  try {
    const res = await fetchWithTimeout(
      `${cfg.supabaseUrl}/rest/v1/kft_app_kv_store?key=eq.${encodeURIComponent(key)}&select=payload,updated_at&limit=1`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: getSupabaseHeaders(false),
      },
      timeoutMs
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0 && rows[0].payload !== undefined) {
      return rows[0].payload as T;
    }
    return null;
  } catch (err) {
    console.warn(`Supabase pullCloudDocument(${key}) error:`, err);
    return null;
  }
}

// ============================================================================
// ADMIN 6-DIGIT PIN SECURITY HELPERS
// ============================================================================
export const DEFAULT_ADMIN_PIN_HASH = '03ae5db7cfcf3954b2d11fb5f60733b0372fc65c54446a1c9f703519893fadf8';
export const ADMIN_PIN_SALT = 'kft_admin_pin_salt_v1:';
export const ADMIN_PIN_KV_KEY = 'kft_admin_pin_security_v1';

export async function hashAdminPin(pin: string): Promise<string> {
  const salted = `${ADMIN_PIN_SALT}${pin}`;
  const enc = new TextEncoder();
  const data = enc.encode(salted);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getAdminPinHash(): Promise<string> {
  try {
    const cloudRecord = await pullCloudDocument<{ pinHash: string }>(ADMIN_PIN_KV_KEY, 4000);
    if (cloudRecord && typeof cloudRecord.pinHash === 'string' && cloudRecord.pinHash.length === 64) {
      try {
        localStorage.setItem(ADMIN_PIN_KV_KEY, cloudRecord.pinHash);
      } catch {}
      return cloudRecord.pinHash;
    }
  } catch {}
  try {
    const cached = localStorage.getItem(ADMIN_PIN_KV_KEY);
    if (cached && cached.length === 64) return cached;
  } catch {}
  return DEFAULT_ADMIN_PIN_HASH;
}

export async function setAdminPinHash(newPin: string): Promise<boolean> {
  const hash = await hashAdminPin(newPin);
  try {
    localStorage.setItem(ADMIN_PIN_KV_KEY, hash);
  } catch {}
  const pushed = await pushCloudDocument(ADMIN_PIN_KV_KEY, {
    pinHash: hash,
    updatedAt: new Date().toISOString()
  });
  return pushed;
}

/**
 * Normalize and sanitize AppSettings so VIP prices, durations, names, promotional banners,
 * and additional-store fees are always consistent across all screens and payment checks.
 */
export function normalizeAuthoritativeAppSettings(
  raw: Partial<AppSettings>,
  fallback?: Partial<AppSettings>
): AppSettings {
  const rawVer = Number(raw?.settingsVersion || 0);
  const fbVer = Number(fallback?.settingsVersion || 0);
  const rawTime = raw?.settingsUpdatedAt ? Date.parse(raw.settingsUpdatedAt) || 0 : 0;
  const fbTime = fallback?.settingsUpdatedAt ? Date.parse(fallback.settingsUpdatedAt) || 0 : 0;

  // Prefer whichever payload has a newer settingsVersion, or if equal, a newer settingsUpdatedAt timestamp
  const preferFallback =
    Boolean(fallback) &&
    (fbVer > rawVer || (fbVer === rawVer && fbTime > rawTime));

  const merged = (preferFallback
    ? { ...(raw || {}), ...(fallback || {}) }
    : { ...(fallback || {}), ...(raw || {}) }) as AppSettings;

  const ver = Number(merged.settingsVersion || 0);
  const isLegacyCorrupted =
    ver < 25 &&
    (Number(merged.vipShortPriceUsd) === 9.99 ||
      Number(merged.vipLongPriceUsd) === 24.99 ||
      (Number(merged.vipShortDurationDays) === 3 && Number(merged.vipLongDurationDays) === 9));

  const rawShortDays = Number(merged.vipShortDurationDays);
  let shortDays =
    Number.isFinite(rawShortDays) && rawShortDays >= 1
      ? Math.round(rawShortDays)
      : 30;

  const rawShortPrice = Number(merged.vipShortPriceUsd);
  let shortPrice =
    Number.isFinite(rawShortPrice) && rawShortPrice > 0
      ? Math.round(rawShortPrice * 100) / 100
      : 4.99;

  const rawLongDays = Number(merged.vipLongDurationDays);
  let longDays =
    Number.isFinite(rawLongDays) && rawLongDays >= 1
      ? Math.round(rawLongDays)
      : 60;

  const rawLongPrice = Number(merged.vipLongPriceUsd);
  let longPrice =
    Number.isFinite(rawLongPrice) && rawLongPrice > 0
      ? Math.round(rawLongPrice * 100) / 100
      : 6.99;

  const rawExtraFee = Number(merged.additionalStoreFeeUsd);
  let extraStoreFee =
    merged.additionalStoreFeeUsd !== undefined &&
    merged.additionalStoreFeeUsd !== null &&
    Number.isFinite(rawExtraFee) &&
    rawExtraFee >= 0
      ? Math.round(rawExtraFee * 100) / 100
      : 5.0;

  if (isLegacyCorrupted) {
    if (shortPrice === 9.99) shortPrice = 4.99;
    if (shortDays === 3) shortDays = 30;
    if (longPrice === 24.99) longPrice = 6.99;
    if (longDays === 9 || longDays === 90) longDays = 60;
    if (ver < 15 && extraStoreFee === 10.0) extraStoreFee = 5.0;
  }

  const includedFree =
    typeof merged.includedFreeStoresPerVip === 'number' && merged.includedFreeStoresPerVip >= 1
      ? Math.round(merged.includedFreeStoresPerVip)
      : 1;

  const vipFeaturedRotationEnabled = merged.vipFeaturedRotationEnabled !== false;
  const rawFeaturedDays = Number(merged.vipFeaturedDurationDays);
  const vipFeaturedDurationDays =
    Number.isFinite(rawFeaturedDays) && rawFeaturedDays >= 1
      ? Math.min(365, Math.round(rawFeaturedDays))
      : 1;

  const shortNameKhRaw = (merged.vipShortNameKh || '').trim();
  const shortNameEnRaw = (merged.vipShortNameEn || '').trim();
  const longNameKhRaw = (merged.vipLongNameKh || '').trim();
  const longNameEnRaw = (merged.vipLongNameEn || '').trim();

  const shortNameKh =
    !shortNameKhRaw || /^VIP\s+\d+\s*(ថ្ងៃ|\?+)$/i.test(shortNameKhRaw)
      ? `VIP ${shortDays} ថ្ងៃ`
      : shortNameKhRaw;
  const shortNameEn =
    !shortNameEnRaw || /^VIP\s+\d+\s*Days?$/i.test(shortNameEnRaw)
      ? `VIP ${shortDays} Days`
      : shortNameEnRaw;
  const longNameKh =
    !longNameKhRaw || /^VIP\s+\d+\s*(ថ្ងៃ|\?+)$/i.test(longNameKhRaw)
      ? `VIP ${longDays} ថ្ងៃ`
      : longNameKhRaw;
  const longNameEn =
    !longNameEnRaw || /^VIP\s+\d+\s*Days?$/i.test(longNameEnRaw)
      ? `VIP ${longDays} Days`
      : longNameEnRaw;

  return {
    ...merged,
    apkDownloadUrl: '',
    playStoreUrl: merged.playStoreUrl || 'https://play.google.com/store/apps/details?id=com.khmerfood.tourism',
    settingsVersion: Math.max(25, ver),
    supportAccountName: merged.supportAccountName || 'CHEA KIMSENG',
    vipShortDurationDays: shortDays,
    vipShortPriceUsd: shortPrice,
    vipShortNameKh: shortNameKh,
    vipShortNameEn: shortNameEn,
    vipLongDurationDays: longDays,
    vipLongPriceUsd: longPrice,
    vipLongNameKh: longNameKh,
    vipLongNameEn: longNameEn,
    additionalStoreFeeUsd: extraStoreFee,
    includedFreeStoresPerVip: includedFree,
    vipFeaturedRotationEnabled,
    vipFeaturedDurationDays,
    promotionalFeeUsd: shortPrice,
    promotionPeriodKh: `កញ្ចប់ VIP ផ្លូវការ៖ ${shortPrice.toFixed(2)} សម្រាប់ ${shortDays} ថ្ងៃ ឬ ${longPrice.toFixed(2)} សម្រាប់ ${longDays} ថ្ងៃ • បន្ថែមហាងថ្មី៖ ${extraStoreFee.toFixed(2)} / ១ ហាង`,
    promotionPeriodEn: `Official VIP Plans: ${shortPrice.toFixed(2)} for ${shortDays} Days or ${longPrice.toFixed(2)} for ${longDays} Days • Additional Store: ${extraStoreFee.toFixed(2)} / store`,
  };
}

/**
 * Fetch the authoritative Admin-configured AppSettings directly from the server (`kft_cloud_admin_vip_pricing_v2` & `kft_cloud_app_settings_v1`).
 * Pure read operation — never overwrites server settings with a local client fallback.
 */
export async function fetchAuthoritativeAppSettingsFromServer(
  fallback?: Partial<AppSettings>,
  timeoutMs = 6000
): Promise<{
  ok: boolean;
  settings: AppSettings | null;
  updatedAt?: string;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      settings: fallback ? normalizeAuthoritativeAppSettings(fallback) : null,
    };
  }

  try {
    const [v2Payload, v1Payload] = await Promise.all([
      pullCloudDocument<Partial<AppSettings>>('kft_cloud_admin_vip_pricing_v2', timeoutMs),
      pullCloudDocument<Partial<AppSettings>>('kft_cloud_app_settings_v1', timeoutMs),
    ]);

    let chosenPayload = v2Payload || v1Payload;
    if (v2Payload && v1Payload) {
      chosenPayload = normalizeAuthoritativeAppSettings(v2Payload, v1Payload);
    }
    if (chosenPayload && typeof chosenPayload === 'object') {
      const normalized = normalizeAuthoritativeAppSettings(chosenPayload, fallback);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('kft_settings_v3');
          localStorage.removeItem('kft_settings_v4');
          localStorage.setItem('kft_settings_v5', JSON.stringify(normalized));
        }
      } catch {
        // ignore localStorage errors
      }
      return {
        ok: true,
        settings: normalized,
        updatedAt: normalized.settingsUpdatedAt,
      };
    }

    return {
      ok: true,
      settings: fallback ? normalizeAuthoritativeAppSettings(fallback) : null,
    };
  } catch (err: any) {
    return {
      ok: false,
      settings: fallback ? normalizeAuthoritativeAppSettings(fallback) : null,
      error: err?.message || 'Failed to fetch settings from server',
    };
  }
}

/**
 * Authoritative Admin-only save for centralized VIP settings (`kft_cloud_admin_vip_pricing_v2` & `kft_cloud_app_settings_v1`).
 * Reads current server version first, increments `settingsVersion`, writes to both authoritative keys, and verifies persistence.
 */
export async function saveAuthoritativeAppSettingsToServer(
  settings: AppSettings,
  timeoutMs = 8000
): Promise<{
  ok: boolean;
  settings: AppSettings;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      settings,
      error: 'Cloud server is not configured.',
    };
  }

  let serverMaxVer = 25;
  try {
    const [existingV2, existingV1] = await Promise.all([
      pullCloudDocument<Partial<AppSettings>>('kft_cloud_admin_vip_pricing_v2', 4000),
      pullCloudDocument<Partial<AppSettings>>('kft_cloud_app_settings_v1', 4000),
    ]);
    serverMaxVer = Math.max(
      25,
      Number(existingV2?.settingsVersion) || 0,
      Number(existingV1?.settingsVersion) || 0,
      Number(settings.settingsVersion) || 0
    );
  } catch {
    serverMaxVer = Math.max(25, Number(settings.settingsVersion) || 0);
  }

  const nextVersion = serverMaxVer + 1;
  const nowIso = new Date().toISOString();

  const shortDays = Math.max(1, Math.round(Number(settings.vipShortDurationDays) || 30));
  const shortPrice = Math.max(0.01, Math.round((Number(settings.vipShortPriceUsd) || 4.99) * 100) / 100);
  const longDays = Math.max(1, Math.round(Number(settings.vipLongDurationDays) || 60));
  const longPrice = Math.max(0.01, Math.round((Number(settings.vipLongPriceUsd) || 6.99) * 100) / 100);
  const extraStoreFee = Math.max(0, Math.round((Number(settings.additionalStoreFeeUsd ?? 5.0)) * 100) / 100);
  const vipFeaturedRotationEnabled = settings.vipFeaturedRotationEnabled !== false;
  const rawFeaturedDays = Number(settings.vipFeaturedDurationDays);
  const vipFeaturedDurationDays =
    Number.isFinite(rawFeaturedDays) && rawFeaturedDays >= 1
      ? Math.min(365, Math.round(rawFeaturedDays))
      : 1;

  const shortNameKh = (settings.vipShortNameKh || '').trim() || `VIP ${shortDays} ថ្ងៃ`;
  const shortNameEn = (settings.vipShortNameEn || '').trim() || `VIP ${shortDays} Days`;
  const longNameKh = (settings.vipLongNameKh || '').trim() || `VIP ${longDays} ថ្ងៃ`;
  const longNameEn = (settings.vipLongNameEn || '').trim() || `VIP ${longDays} Days`;

  const normalized: AppSettings = {
    ...settings,
    apkDownloadUrl: '',
    playStoreUrl: settings.playStoreUrl || 'https://play.google.com/store/apps/details?id=com.khmerfood.tourism',
    settingsVersion: nextVersion,
    settingsUpdatedAt: nowIso,
    vipShortDurationDays: shortDays,
    vipShortPriceUsd: shortPrice,
    vipShortNameKh: shortNameKh,
    vipShortNameEn: shortNameEn,
    vipLongDurationDays: longDays,
    vipLongPriceUsd: longPrice,
    vipLongNameKh: longNameKh,
    vipLongNameEn: longNameEn,
    additionalStoreFeeUsd: extraStoreFee,
    vipFeaturedRotationEnabled,
    vipFeaturedDurationDays,
    promotionalFeeUsd: shortPrice,
    promotionPeriodKh: `កញ្ចប់ VIP ផ្លូវការ៖ ${shortPrice.toFixed(2)} សម្រាប់ ${shortDays} ថ្ងៃ ឬ ${longPrice.toFixed(2)} សម្រាប់ ${longDays} ថ្ងៃ • បន្ថែមហាងថ្មី៖ ${extraStoreFee.toFixed(2)} / ១ ហាង`,
    promotionPeriodEn: `Official VIP Plans: ${shortPrice.toFixed(2)} for ${shortDays} Days or ${longPrice.toFixed(2)} for ${longDays} Days • Additional Store: ${extraStoreFee.toFixed(2)} / store`,
  };

  const [pushedV2, pushedV1] = await Promise.all([
    pushCloudDocument('kft_cloud_admin_vip_pricing_v2', normalized, timeoutMs),
    pushCloudDocument('kft_cloud_app_settings_v1', normalized, timeoutMs),
  ]);

  if (!pushedV2) {
    return {
      ok: false,
      settings: normalized,
      error: 'Could not save VIP settings to cloud database. Please check your internet connection and try again.',
    };
  }

  // Verify database persistence by reading back the authoritative record
  const verifiedV2 = await pullCloudDocument<Partial<AppSettings>>('kft_cloud_admin_vip_pricing_v2', 5000);
  if (
    !verifiedV2 ||
    Number(verifiedV2.vipShortDurationDays) !== shortDays ||
    Math.abs(Number(verifiedV2.vipShortPriceUsd) - shortPrice) > 0.001 ||
    Number(verifiedV2.vipLongDurationDays) !== longDays ||
    Math.abs(Number(verifiedV2.vipLongPriceUsd) - longPrice) > 0.001
  ) {
    return {
      ok: false,
      settings: normalized,
      error: 'Database verification failed: saved VIP values did not match on read-back.',
    };
  }

  const confirmedSettings = normalizeAuthoritativeAppSettings(verifiedV2, normalized);

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('kft_settings_v3');
      localStorage.removeItem('kft_settings_v4');
      localStorage.setItem('kft_settings_v5', JSON.stringify(confirmedSettings));
    }
  } catch {
    // ignore storage errors
  }

  return {
    ok: true,
    settings: confirmedSettings,
  };
}

/**
 * Pull all key-value documents matching a key prefix (e.g. `kft_ov_`) from Supabase `kft_app_kv_store`.
 * Enables atomic per-record cloud storage for Admin-updated images so one item update never overwrites another.
 */
export async function pullCloudDocumentsByPrefix<T = any>(
  prefix: string,
  timeoutMs = 12000
): Promise<Array<{ key: string; payload: T; updated_at?: string }>> {
  if (!isSupabaseConfigured()) return [];
  const cfg = getCloudApiConfig();

  try {
    const res = await fetchWithTimeout(
      `${cfg.supabaseUrl}/rest/v1/kft_app_kv_store?key=like.${encodeURIComponent(prefix)}*&select=key,payload,updated_at&limit=1000`,
      {
        method: 'GET',
        headers: getSupabaseHeaders(false),
      },
      timeoutMs
    );
    if (!res.ok) return [];
    const rows = await res.json();
    if (Array.isArray(rows)) {
      return rows.filter(r => r && typeof r.key === 'string' && r.payload !== undefined);
    }
    return [];
  } catch (err) {
    console.warn(`Supabase pullCloudDocumentsByPrefix(${prefix}) error:`, err);
    return [];
  }
}

/**
 * Lightweight manifest fetch of all keys and `updated_at` timestamps matching a prefix (e.g. `kft_ov_`)
 * without downloading multi-megabyte base64 payloads at once.
 */
export async function pullCloudKeysManifestByPrefix(
  prefix: string,
  timeoutMs = 8000
): Promise<Array<{ key: string; updated_at: string }>> {
  if (!isSupabaseConfigured()) return [];
  const cfg = getCloudApiConfig();

  try {
    const res = await fetchWithTimeout(
      `${cfg.supabaseUrl}/rest/v1/kft_app_kv_store?key=like.${encodeURIComponent(prefix)}*&select=key,updated_at&limit=1000`,
      {
        method: 'GET',
        headers: getSupabaseHeaders(false),
        cache: 'no-store',
      },
      timeoutMs
    );
    if (!res.ok) return [];
    const rows = await res.json();
    if (Array.isArray(rows)) {
      return rows.filter(r => r && typeof r.key === 'string');
    }
    return [];
  } catch (err) {
    console.warn(`Supabase pullCloudKeysManifestByPrefix(${prefix}) error:`, err);
    return [];
  }
}

/**
 * Fetch specific keys in a small batch so large base64 images never time out on mobile networks.
 */
export async function pullCloudDocumentsByKeys<T = any>(
  keys: string[],
  timeoutMs = 15000
): Promise<Array<{ key: string; payload: T; updated_at?: string }>> {
  if (!isSupabaseConfigured() || !Array.isArray(keys) || keys.length === 0) return [];
  const cfg = getCloudApiConfig();

  try {
    const results = await Promise.allSettled(
      keys.map(async k => {
        const res = await fetchWithTimeout(
          `${cfg.supabaseUrl}/rest/v1/kft_app_kv_store?key=eq.${encodeURIComponent(k)}&select=key,payload,updated_at&limit=1`,
          {
            method: 'GET',
            headers: getSupabaseHeaders(false),
            cache: 'no-store',
          },
          timeoutMs
        );
        if (!res.ok) return null;
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0]?.payload !== undefined) {
          return rows[0] as { key: string; payload: T; updated_at?: string };
        }
        return null;
      })
    );
    const out: Array<{ key: string; payload: T; updated_at?: string }> = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        out.push(r.value);
      }
    }
    return out;
  } catch (err) {
    console.warn('Supabase pullCloudDocumentsByKeys error:', err);
    return [];
  }
}

/**
 * Delete a specific key from Supabase `kft_app_kv_store`.
 */
export async function deleteCloudDocument(key: string, timeoutMs = 8000): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const cfg = getCloudApiConfig();
  if (!cfg.enableAutoCloudSync) return false;

  try {
    const res = await fetchWithTimeout(
      `${cfg.supabaseUrl}/rest/v1/kft_app_kv_store?key=eq.${encodeURIComponent(key)}`,
      {
        method: 'DELETE',
        headers: getSupabaseHeaders(false),
      },
      timeoutMs
    );
    return res.ok;
  } catch (err) {
    console.warn(`Supabase deleteCloudDocument(${key}) error:`, err);
    return false;
  }
}

export const USER_RECORD_PREFIX = 'kft_user_';

/**
 * Determine a deterministic canonical User ID so the same person (across Android APK, Web OAuth,
 * or Email/Phone sign-in) always maps to a single unified account without creating duplicates.
 */
export function getCanonicalUserId(u: Partial<User>): string {
  const rawId = String(u.id || '').trim();
  const cleanEmail = String(u.email || '').trim().toLowerCase();
  const cleanPhone = String(u.phone || '').replace(/[\s-+()]/g, '');

  // Preserve protected built-in IDs
  if (rawId === 'admin-authorized-single') return 'admin-authorized-single';
  if (rawId === 'user-vip-kimseng' || cleanEmail === 'kimseng@khmerfoodtourism.com') return 'user-vip-kimseng';
  if (rawId === 'owner-1' || cleanEmail === 'kimly@restaurant.com') return 'owner-1';
  if (rawId === 'owner-2' || rawId === 'owner-3' || rawId === 'user-1') return rawId;

  // Canonical ID for Google accounts (or Gmail accounts created via Google OAuth)
  if (cleanEmail && cleanEmail.includes('@')) {
    const emailSlug = cleanEmail.replace(/[^a-z0-9]/g, '_');
    if (
      u.authProvider === 'google' ||
      rawId.startsWith('google-') ||
      (Array.isArray(u.linkedProviders) && u.linkedProviders.includes('google'))
    ) {
      return `google-${emailSlug}`;
    }
    if (!rawId || /^user-\d+$/.test(rawId) || /^owner-\d+$/.test(rawId)) {
      return `${u.role === 'owner' ? 'owner' : 'user'}-${emailSlug}`;
    }
    return rawId;
  }

  if (cleanPhone.length >= 7) {
    if (!rawId || /^user-\d+$/.test(rawId)) {
      return `user-phone-${cleanPhone}`;
    }
    return rawId;
  }

  return rawId || `user-${Date.now()}`;
}

export function normalizeVipExpiryOnUser(u: User): User {
  const isAdmin =
    u.role === 'admin' ||
    u.id === 'admin-authorized-single' ||
    u.username === 'admin' ||
    u.username === 'cheasavuth';
  if (isAdmin) return u;
  if (u.subscriptionExpiryDate) {
    const expMs = new Date(u.subscriptionExpiryDate).getTime();
    if (!Number.isNaN(expMs) && expMs <= Date.now()) {
      if (u.membershipTier === 'premium_vip' || u.subscriptionStatus === 'active') {
        return {
          ...u,
          membershipTier: 'free',
          subscriptionStatus: 'expired',
        };
      }
    }
  } else if (u.membershipTier === 'premium_vip' || u.subscriptionStatus === 'active') {
    return {
      ...u,
      membershipTier: 'free',
      subscriptionStatus: 'expired',
    };
  }
  return u;
}

/**
 * Merge two User records representing the same person, preserving:
 * - Canonical ID + all legacy IDs (so transactions/shops/posts/tickets always link properly)
 * - Earliest valid registration date (`createdAt` / `registeredAtIso`)
 * - Latest login / activity date (`lastLoginAt` / `lastActiveAt`)
 * - Active non-expired VIP membership with furthest expiration date
 * - Highest `paidAdditionalStoreSlots` and merged `linkedProviders`
 */
export function mergeTwoUserRecordsCanonical(first: User, second: User): User {
  const canonicalId = getCanonicalUserId({
    ...first,
    ...second,
    email: second.email || first.email,
    phone: second.phone || first.phone,
    authProvider: second.authProvider === 'google' || first.authProvider === 'google' ? 'google' : (second.authProvider || first.authProvider),
  });

  const legacyIdSet = new Set<string>();
  for (const idCandidate of [
    first.id,
    second.id,
    ...(Array.isArray(first.legacyIds) ? first.legacyIds : []),
    ...(Array.isArray(second.legacyIds) ? second.legacyIds : []),
  ]) {
    if (idCandidate && idCandidate !== canonicalId) {
      legacyIdSet.add(idCandidate);
    }
  }

  // Earliest registration date
  const parseValidMs = (d?: string): number => {
    if (!d) return 0;
    const ms = new Date(d).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  };
  const firstCreatedMs = parseValidMs(first.registeredAtIso || first.createdAt);
  const secondCreatedMs = parseValidMs(second.registeredAtIso || second.createdAt);
  let earliestCreatedIso = first.createdAt || second.createdAt || '2026-01-01';
  let earliestRegisteredIso = first.registeredAtIso || second.registeredAtIso || first.createdAt || second.createdAt || '2026-01-01T00:00:00.000Z';
  if (firstCreatedMs > 0 && secondCreatedMs > 0) {
    if (secondCreatedMs < firstCreatedMs) {
      earliestCreatedIso = second.createdAt || earliestCreatedIso;
      earliestRegisteredIso = second.registeredAtIso || second.createdAt || earliestRegisteredIso;
    } else {
      earliestCreatedIso = first.createdAt || earliestCreatedIso;
      earliestRegisteredIso = first.registeredAtIso || first.createdAt || earliestRegisteredIso;
    }
  }

  // Latest login / active timestamp
  const firstLoginMs = parseValidMs(first.lastLoginAt || first.lastActiveAt || first.verifiedAt);
  const secondLoginMs = parseValidMs(second.lastLoginAt || second.lastActiveAt || second.verifiedAt);
  const latestLoginAt =
    secondLoginMs >= firstLoginMs
      ? (second.lastLoginAt || second.lastActiveAt || second.verifiedAt || first.lastLoginAt)
      : (first.lastLoginAt || first.lastActiveAt || first.verifiedAt || second.lastLoginAt);

  // Providers
  const linkedSet = new Set<'google' | 'apple' | 'phone' | 'email'>([
    ...(Array.isArray(first.linkedProviders) ? first.linkedProviders : []),
    ...(Array.isArray(second.linkedProviders) ? second.linkedProviders : []),
  ]);
  if (first.authProvider) linkedSet.add(first.authProvider);
  if (second.authProvider) linkedSet.add(second.authProvider);

  const mergedRole =
    first.role === 'admin' || second.role === 'admin'
      ? 'admin'
      : first.role === 'owner' || second.role === 'owner'
      ? 'owner'
      : 'user';

  const baseMerged: User = {
    ...first,
    ...second,
    id: canonicalId,
    name:
      second.name && !second.name.includes('@')
        ? second.name
        : first.name || second.name || 'User',
    email: (second.email || first.email || '').trim().toLowerCase(),
    phone: second.phone || first.phone || undefined,
    role: mergedRole,
    avatar:
      second.avatar && !second.avatar.includes('photo-1535713875002')
        ? second.avatar
        : first.avatar || second.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    restaurantId: second.restaurantId || first.restaurantId,
    authProvider:
      first.authProvider === 'google' || second.authProvider === 'google'
        ? 'google'
        : second.authProvider || first.authProvider || 'email',
    linkedProviders: Array.from(linkedSet),
    isVerified: Boolean(first.isVerified || second.isVerified),
    verifiedAt: first.verifiedAt || second.verifiedAt,
    createdAt: earliestCreatedIso,
    registeredAtIso: earliestRegisteredIso,
    lastLoginAt: latestLoginAt,
    lastActiveAt: second.lastActiveAt || first.lastActiveAt || latestLoginAt,
    googleSub: second.googleSub || first.googleSub,
    legacyIds: legacyIdSet.size > 0 ? Array.from(legacyIdSet) : undefined,
    paidAdditionalStoreSlots: Math.max(
      first.paidAdditionalStoreSlots || 0,
      second.paidAdditionalStoreSlots || 0
    ),
    additionalStorePaymentIds: Array.from(
      new Set([
        ...(Array.isArray(first.additionalStorePaymentIds) ? first.additionalStorePaymentIds : []),
        ...(Array.isArray(second.additionalStorePaymentIds) ? second.additionalStorePaymentIds : []),
      ])
    ),
  };

  const nowMs = Date.now();
  const firstExpMs = parseValidMs(first.subscriptionExpiryDate);
  const secondExpMs = parseValidMs(second.subscriptionExpiryDate);

  const isFirstValidVip =
    first.membershipTier === 'premium_vip' &&
    first.subscriptionStatus === 'active' &&
    firstExpMs > nowMs;
  const isSecondValidVip =
    second.membershipTier === 'premium_vip' &&
    second.subscriptionStatus === 'active' &&
    secondExpMs > nowMs;

  const wasSecondCancelledAfterFirstStart =
    second.subscriptionStatus === 'cancelled' &&
    second.vipCancelledAt &&
    (!first.subscriptionStartDate ||
      parseValidMs(second.vipCancelledAt) >= parseValidMs(first.subscriptionStartDate));

  const wasFirstCancelledAfterSecondStart =
    first.subscriptionStatus === 'cancelled' &&
    first.vipCancelledAt &&
    (!second.subscriptionStartDate ||
      parseValidMs(first.vipCancelledAt) >= parseValidMs(second.subscriptionStartDate));

  if (wasSecondCancelledAfterFirstStart || wasFirstCancelledAfterSecondStart) {
    const cancelledRec = wasSecondCancelledAfterFirstStart ? second : first;
    return normalizeVipExpiryOnUser({
      ...baseMerged,
      membershipTier: 'free',
      subscriptionStatus: 'cancelled',
      subscriptionExpiryDate: undefined,
      paymentStatus: 'cancelled',
      vipCancelledAt: cancelledRec.vipCancelledAt,
    });
  }

  if (isFirstValidVip && isSecondValidVip) {
    const bestVip = firstExpMs >= secondExpMs ? first : second;
    return normalizeVipExpiryOnUser({
      ...baseMerged,
      membershipTier: 'premium_vip',
      subscriptionStatus: 'active',
      subscriptionStartDate: bestVip.subscriptionStartDate,
      subscriptionExpiryDate: bestVip.subscriptionExpiryDate,
      paymentStatus: 'verified',
      paymentMethod: bestVip.paymentMethod || second.paymentMethod || first.paymentMethod,
      transactionRef: bestVip.transactionRef || second.transactionRef || first.transactionRef,
    });
  }

  if (isFirstValidVip || isSecondValidVip) {
    const activeVip = isFirstValidVip ? first : second;
    return normalizeVipExpiryOnUser({
      ...baseMerged,
      membershipTier: 'premium_vip',
      subscriptionStatus: 'active',
      subscriptionStartDate: activeVip.subscriptionStartDate,
      subscriptionExpiryDate: activeVip.subscriptionExpiryDate,
      paymentStatus: 'verified',
      paymentMethod: activeVip.paymentMethod || baseMerged.paymentMethod,
      transactionRef: activeVip.transactionRef || baseMerged.transactionRef,
    });
  }

  return normalizeVipExpiryOnUser(baseMerged);
}

/**
 * Deduplicate and normalize an array of users so every unique person appears EXACTLY ONCE,
 * matching by canonical ID, legacy IDs, lowercase email, googleSub, or 7+ digit phone number.
 */
export function deduplicateAndNormalizeUsers(
  rawUsers: Array<User | null | undefined>,
  deletedUsers: DeletedUserRecord[] = []
): User[] {
  const deletedIds = new Set(deletedUsers.map(d => d.id).filter(Boolean));
  const deletedEmails = new Set(
    deletedUsers.map(d => (d.email || '').toLowerCase().trim()).filter(Boolean)
  );
  const deletedPhones = new Set(
    deletedUsers
      .map(d => (d.phone || '').replace(/[\s-+()]/g, ''))
      .filter(p => p.length >= 7)
  );

  const isAccountDeleted = (u: Partial<User> | undefined | null): boolean => {
    if (!u) return true;
    // Never delete system admin or protected owner accounts unless explicitly in deletedIds
    if (
      u.role === 'admin' ||
      u.id === 'admin-authorized-single' ||
      u.username === 'admin' ||
      u.username === 'cheasavuth'
    ) {
      return true; // Exclude admin from regular users array (Admin is handled separately by ADMIN_USER)
    }
    if (u.id && deletedIds.has(u.id)) return true;
    if (u.email && deletedEmails.has(u.email.toLowerCase().trim())) return true;
    if (u.phone) {
      const cleanP = u.phone.replace(/[\s-+()]/g, '');
      if (cleanP.length >= 7 && deletedPhones.has(cleanP)) return true;
    }
    return false;
  };

  const canonicalMap = new Map<string, User>();
  const emailToCanonical = new Map<string, string>();
  const phoneToCanonical = new Map<string, string>();
  const legacyIdToCanonical = new Map<string, string>();
  const googleSubToCanonical = new Map<string, string>();

  const indexUser = (u: User) => {
    legacyIdToCanonical.set(u.id, u.id);
    if (Array.isArray(u.legacyIds)) {
      for (const lid of u.legacyIds) {
        if (lid) legacyIdToCanonical.set(lid, u.id);
      }
    }
    if (u.email) {
      emailToCanonical.set(u.email.toLowerCase().trim(), u.id);
    }
    if (u.phone) {
      const cleanP = u.phone.replace(/[\s-+()]/g, '');
      if (cleanP.length >= 7) phoneToCanonical.set(cleanP, u.id);
    }
    if (u.googleSub) {
      googleSubToCanonical.set(u.googleSub, u.id);
    }
  };

  for (const item of rawUsers) {
    if (!item || (!item.id && !item.email && !item.phone) || isAccountDeleted(item)) continue;

    const cleanEmail = (item.email || '').trim().toLowerCase();
    const cleanPhone = (item.phone || '').replace(/[\s-+()]/g, '');
    if (!cleanEmail && cleanPhone.length < 7 && (!item.name || item.name === 'Member')) {
      continue;
    }
    const targetCanonicalId = getCanonicalUserId(item);

    const existingKey =
      (canonicalMap.has(targetCanonicalId) ? targetCanonicalId : undefined) ||
      (item.id ? legacyIdToCanonical.get(item.id) : undefined) ||
      (cleanEmail ? emailToCanonical.get(cleanEmail) : undefined) ||
      (item.googleSub ? googleSubToCanonical.get(item.googleSub) : undefined) ||
      (cleanPhone.length >= 7 ? phoneToCanonical.get(cleanPhone) : undefined);

    if (!existingKey || !canonicalMap.has(existingKey)) {
      const legacyIds = item.id && item.id !== targetCanonicalId ? [item.id] : item.legacyIds;
      const normalized: User = normalizeVipExpiryOnUser({
        ...item,
        id: targetCanonicalId,
        email: cleanEmail || item.email || '',
        createdAt: item.createdAt || '2026-01-01',
        registeredAtIso: item.registeredAtIso || item.createdAt || '2026-01-01T00:00:00.000Z',
        legacyIds: legacyIds && legacyIds.length > 0 ? Array.from(new Set(legacyIds)) : undefined,
      });
      canonicalMap.set(normalized.id, normalized);
      indexUser(normalized);
    } else {
      const existing = canonicalMap.get(existingKey)!;
      const merged = mergeTwoUserRecordsCanonical(existing, item);
      if (existingKey !== merged.id) {
        canonicalMap.delete(existingKey);
      }
      canonicalMap.set(merged.id, merged);
      indexUser(merged);
    }
  }

  return Array.from(canonicalMap.values());
}

/**
 * Atomic per-user cloud persistence:
 * Immediately writes `kft_user_<canonicalId>` to Supabase AND pulls, merges, and updates `kft_cloud_users_v1`
 * so no device can ever overwrite or lose a newly registered or logged-in user.
 */
// Session-level deduplication cache for atomic user cloud writes to prevent redundant radio/network wakeups
const lastPushedAtomicUserSigMap = new Map<string, string>();

/**
 * Atomic per-user cloud persistence:
 * Immediately writes `kft_user_<canonicalId>` to Supabase.
 * Only pulls and updates the aggregate `kft_cloud_users_v2` table when `updateAggregate` is true,
 * avoiding 7-request network bursts on every profile/session touch.
 */
export async function upsertSingleUserToCloud(
  user: User,
  deletedUsers: DeletedUserRecord[] = [],
  updateAggregate = false
): Promise<User[]> {
  if (!user || user.role === 'admin' || user.id === 'admin-authorized-single') {
    return [];
  }
  const canonicalList = deduplicateAndNormalizeUsers([user], deletedUsers);
  if (canonicalList.length === 0) return [];
  const canonicalUser = canonicalList[0];

  if (!isSupabaseConfigured()) return [canonicalUser];

  try {
    // 1. Write atomic per-user row immediately (deduplicated within session so unchanged user state never fires redundant network requests)
    const atomicKey = `${USER_RECORD_PREFIX}${canonicalUser.id}`;
    const userSig = JSON.stringify(canonicalUser);
    if (lastPushedAtomicUserSigMap.get(atomicKey) !== userSig) {
      lastPushedAtomicUserSigMap.set(atomicKey, userSig);
      await pushCloudDocument(atomicKey, canonicalUser);
    }

    if (!updateAggregate) {
      return [canonicalUser];
    }

    // 2. When explicitly updating the aggregate table, pull `kft_cloud_users_v2` + `kft_cloud_deleted_users_v1` only
    const [cloudUsersV2, cloudDeleted] = await Promise.all([
      pullCloudDocument<User[]>('kft_cloud_users_v2'),
      pullCloudDocument<DeletedUserRecord[]>('kft_cloud_deleted_users_v1'),
    ]);

    const allDeleted = [
      ...deletedUsers,
      ...(Array.isArray(cloudDeleted) ? cloudDeleted : []),
    ];

    const merged = deduplicateAndNormalizeUsers(
      [
        ...(Array.isArray(cloudUsersV2) ? cloudUsersV2 : []),
        canonicalUser,
      ],
      allDeleted
    );

    await pushCloudDocument('kft_cloud_users_v2', merged);
    return merged;
  } catch (err) {
    console.warn('upsertSingleUserToCloud warning:', err);
    return [canonicalUser];
  }
}

/**
 * Synchronize Users, Transactions, Payment Proofs Vault, and Custom/Cached Restaurants
 * between this device and Supabase Cloud.
 */
export async function syncAllAppDataWithSupabase(localState: {
  users: User[];
  currentUser?: User | null;
  deletedUsers?: DeletedUserRecord[];
  transactions: RegistrationTransaction[];
  customRestaurants: Restaurant[];
  deletedRestaurantIds?: Record<string, string>;
  customDestinations?: TouristDestination[];
  supportTickets?: SupportTicket[];
  paymentProofsVault: Record<string, any>;
  appSettings?: AppSettings;
  includeHeavyAdminVaults?: boolean;
}): Promise<{
  synced: boolean;
  mergedUsers: User[];
  mergedDeletedUsers: DeletedUserRecord[];
  mergedTransactions: RegistrationTransaction[];
  mergedCustomRestaurants: Restaurant[];
  mergedDeletedRestaurantIds?: Record<string, string>;
  mergedPaymentProofsVault: Record<string, any>;
  mergedAppSettings?: AppSettings;
}> {
  if (!isSupabaseConfigured()) {
    return {
      synced: false,
      mergedUsers: deduplicateAndNormalizeUsers(
        [...(localState.users || []), localState.currentUser || undefined],
        localState.deletedUsers || []
      ),
      mergedDeletedUsers: localState.deletedUsers || [],
      mergedTransactions: localState.transactions,
      mergedCustomRestaurants: localState.customRestaurants,
      mergedPaymentProofsVault: localState.paymentProofsVault,
      mergedAppSettings: localState.appSettings,
    };
  }

  try {
    const isAdminDevice = Boolean(
      localState.currentUser &&
        (localState.currentUser.role === 'admin' ||
          localState.currentUser.id === 'admin-authorized-single' ||
          localState.currentUser.username === 'admin' ||
          localState.currentUser.username === 'cheasavuth')
    );
    const shouldFetchHeavyAdminVaults = Boolean(isAdminDevice && localState.includeHeavyAdminVaults);
    const shouldSyncPaymentProofs = shouldFetchHeavyAdminVaults;

    // Only fetch all 1,000 `kft_user_*` prefix documents when Admin Dashboard is open (`includeHeavyAdminVaults`);
    // routine background syncs rely on `kft_cloud_users_v2` plus the active user's atomic row to prevent CPU/radio overheating.
    const currentCanonicalIdForFetch =
      !isAdminDevice && localState.currentUser ? getCanonicalUserId(localState.currentUser) : null;

    // 1. Pull existing cloud records in a single batch (skipping heavy base64 payment proofs and 1,000-row prefix scan on background syncs)
    const [
      cloudUsersV2,
      atomicUserDocs,
      cloudVipBackup,
      cloudDeletedUsers,
      cloudTxns,
      cloudDeletedTxnIds,
      cloudRests,
      cloudDeletedRests,
      cloudTickets,
      cloudProofs,
      cloudSettingsV2,
    ] = await Promise.all([
      pullCloudDocument<User[]>('kft_cloud_users_v2'),
      shouldFetchHeavyAdminVaults
        ? pullCloudDocumentsByPrefix<User>(USER_RECORD_PREFIX)
        : currentCanonicalIdForFetch
        ? pullCloudDocument<User>(`${USER_RECORD_PREFIX}${currentCanonicalIdForFetch}`).then(doc =>
            doc ? [{ key: `${USER_RECORD_PREFIX}${currentCanonicalIdForFetch}`, payload: doc, updated_at: '' }] : []
          )
        : Promise.resolve([] as Array<{ key: string; payload: User; updated_at: string }>),
      pullCloudDocument<Record<string, Partial<User>>>('kft_cloud_vip_backup_v1'),
      pullCloudDocument<DeletedUserRecord[]>('kft_cloud_deleted_users_v1'),
      pullCloudDocument<RegistrationTransaction[]>('kft_cloud_transactions_v1'),
      pullCloudDocument<string[]>('kft_cloud_deleted_transactions_v1'),
      pullCloudDocument<Restaurant[]>('kft_cloud_custom_restaurants_v1'),
      pullCloudDocument<Record<string, string>>('kft_cloud_deleted_restaurants_v1'),
      pullCloudDocument<SupportTicket[]>('kft_cloud_support_tickets_v1'),
      shouldSyncPaymentProofs
        ? pullCloudDocument<Record<string, any>>('kft_cloud_payment_proofs_v1')
        : Promise.resolve(null),
      pullCloudDocument<AppSettings>('kft_cloud_admin_vip_pricing_v2'),
    ]);
    const cloudUsers = cloudUsersV2 ? null : await pullCloudDocument<User[]>('kft_cloud_users_v1');
    const cloudSettingsV1 = cloudSettingsV2 ? null : await pullCloudDocument<AppSettings>('kft_cloud_app_settings_v1');
    const cloudSettings = cloudSettingsV2 || cloudSettingsV1;

    // 1b. Merge Deleted Users Registry (Permanent Blacklist)
    const deletedMap = new Map<string, DeletedUserRecord>();
    if (Array.isArray(cloudDeletedUsers)) {
      for (const d of cloudDeletedUsers) {
        if (d && d.id) deletedMap.set(d.id, d);
      }
    }
    if (Array.isArray(localState.deletedUsers)) {
      for (const d of localState.deletedUsers) {
        if (d && d.id) deletedMap.set(d.id, { ...(deletedMap.get(d.id) || {}), ...d });
      }
    }
    // If a user in localState.users was explicitly restored by Admin (restoredAt), remove from deletedMap if not permanentlyDeleted
    if (Array.isArray(localState.users)) {
      for (const u of localState.users) {
        if (u && u.id && u.restoredAt) {
          const delRec = deletedMap.get(u.id);
          if (delRec && !delRec.permanentlyDeleted) {
            const restoredMs = new Date(u.restoredAt).getTime();
            const deletedMs = delRec.deletedAt ? new Date(delRec.deletedAt).getTime() : 0;
            if (restoredMs >= deletedMs) {
              deletedMap.delete(u.id);
            }
          }
        }
      }
    }
    const mergedDeletedUsers = Array.from(deletedMap.values());
    const deletedIds = new Set(mergedDeletedUsers.map(d => d.id).filter(Boolean));
    const deletedEmails = new Set(
      mergedDeletedUsers.map(d => (d.email || '').toLowerCase().trim()).filter(Boolean)
    );
    const deletedPhones = new Set(
      mergedDeletedUsers
        .map(d => (d.phone || '').replace(/[\s-+()]/g, ''))
        .filter(p => p.length >= 7)
    );
    const isActivityUserDeleted = (uid?: string, email?: string, phone?: string): boolean => {
      if (uid && deletedIds.has(uid)) return true;
      const cleanE = (email || '').toLowerCase().trim();
      if (cleanE && deletedEmails.has(cleanE)) return true;
      const cleanP = (phone || '').replace(/[\s-+()]/g, '');
      if (cleanP.length >= 7 && deletedPhones.has(cleanP)) return true;
      return false;
    };

    // 1c. Reconstruct any missing non-deleted users from Transactions, Support Tickets, Custom Restaurants, and VIP Backup
    const allTxnsCombined = [
      ...(Array.isArray(cloudTxns) ? cloudTxns : []),
      ...(Array.isArray(localState.transactions) ? localState.transactions : []),
    ];
    const allTicketsCombined = [
      ...(Array.isArray(cloudTickets) ? cloudTickets : []),
      ...(Array.isArray(localState.supportTickets) ? localState.supportTickets : []),
    ];

    const recoveredUsersFromActivity: User[] = [];
    for (const t of allTxnsCombined) {
      if (!t) continue;
      const uid = t.userId || t.ownerId;
      const uEmail = (t.userEmail || '').trim().toLowerCase();
      const uPhone = (t.phone || '').replace(/[\s-+()]/g, '');
      // Skip nameless seed owner placeholders that have no email, phone, or userName
      if (!uEmail && uPhone.length < 7 && !t.userName) continue;
      if (!uid && !uEmail) continue;
      if (isActivityUserDeleted(uid, uEmail, uPhone) || isActivityUserDeleted(t.ownerId, uEmail, uPhone)) continue;
      const isGoogle = String(uid || '').startsWith('google-') || uEmail.endsWith('@gmail.com');
      const createdDate = t.createdAt ? t.createdAt.split('T')[0] : '2026-01-01';
      recoveredUsersFromActivity.push({
        id: uid || `user-${uEmail.replace(/[^a-z0-9]/g, '_')}`,
        name: t.userName || (uEmail ? uEmail.split('@')[0] : 'Member'),
        email: uEmail,
        phone: t.phone || undefined,
        role: t.type === 'restaurant_registration' ? 'owner' : 'user',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        authProvider: isGoogle ? 'google' : 'email',
        linkedProviders: [isGoogle ? 'google' : 'email'],
        isVerified: true,
        createdAt: createdDate,
        registeredAtIso: t.createdAt || '2026-01-01T00:00:00.000Z',
        lastActiveAt: t.verifiedAt || t.createdAt,
        membershipTier: t.status === 'verified' && t.expiresAt && new Date(t.expiresAt).getTime() > Date.now() ? 'premium_vip' : 'free',
        subscriptionStatus: t.status === 'verified' && t.expiresAt && new Date(t.expiresAt).getTime() > Date.now() ? 'active' : 'none',
        subscriptionStartDate: t.status === 'verified' ? (t.verifiedAt || t.createdAt) : undefined,
        subscriptionExpiryDate: t.status === 'verified' ? t.expiresAt : undefined,
        paymentStatus: t.status === 'verified' ? 'verified' : t.status === 'pending_verification' ? 'pending_verification' : 'unpaid',
        paymentMethod: (t.paymentMethod as any) || undefined,
        transactionRef: t.transactionRef || undefined,
      });
    }

    for (const tk of allTicketsCombined) {
      if (!tk || !tk.userId || tk.userId === 'guest') continue;
      const uEmail = (tk.userEmail || '').trim().toLowerCase();
      if (isActivityUserDeleted(tk.userId, uEmail, tk.userPhone)) continue;
      const isGoogle = String(tk.userId).startsWith('google-') || uEmail.endsWith('@gmail.com');
      recoveredUsersFromActivity.push({
        id: tk.userId,
        name: tk.userName || (uEmail ? uEmail.split('@')[0] : 'Member'),
        email: uEmail,
        phone: tk.userPhone || undefined,
        role: tk.userRole === 'owner' ? 'owner' : 'user',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        authProvider: isGoogle ? 'google' : 'email',
        linkedProviders: [isGoogle ? 'google' : 'email'],
        isVerified: true,
        createdAt: tk.createdAt ? tk.createdAt.split('T')[0] : '2026-01-01',
        registeredAtIso: tk.createdAt || '2026-01-01T00:00:00.000Z',
        lastActiveAt: tk.updatedAt || tk.createdAt,
      });
    }

    if (cloudVipBackup && typeof cloudVipBackup === 'object') {
      for (const [key, val] of Object.entries(cloudVipBackup)) {
        if (!val || typeof val !== 'object') continue;
        const emailFromKey = key.startsWith('email:') ? key.slice(6) : (val.email || '');
        const idFromKey = key.startsWith('id:') ? key.slice(3) : (val.id || '');
        if (!idFromKey && !emailFromKey) continue;
        if (isActivityUserDeleted(idFromKey, emailFromKey, val.phone)) continue;
        recoveredUsersFromActivity.push({
          id: idFromKey || `google-${emailFromKey.replace(/[^a-z0-9]/g, '_')}`,
          name: val.name || (emailFromKey ? emailFromKey.split('@')[0] : 'VIP Member'),
          email: emailFromKey,
          phone: val.phone,
          role: val.role || 'user',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          createdAt: val.subscriptionStartDate ? val.subscriptionStartDate.split('T')[0] : '2026-01-01',
          registeredAtIso: val.subscriptionStartDate || '2026-01-01T00:00:00.000Z',
          membershipTier: val.membershipTier,
          subscriptionStatus: val.subscriptionStatus,
          subscriptionStartDate: val.subscriptionStartDate,
          subscriptionExpiryDate: val.subscriptionExpiryDate,
          paymentStatus: val.paymentStatus,
          paymentMethod: val.paymentMethod,
          transactionRef: val.transactionRef,
          paidAdditionalStoreSlots: val.paidAdditionalStoreSlots,
          additionalStorePaymentIds: val.additionalStorePaymentIds,
        });
      }
    }

    // 2. Deduplicate & Normalize Users across all sources (Cloud v2 + Cloud v1 + Atomic per-user rows + Local users + CurrentUser + Recovered activity)
    const mergedUsers = deduplicateAndNormalizeUsers(
      [
        ...(Array.isArray(cloudUsersV2) ? cloudUsersV2 : []),
        ...(Array.isArray(cloudUsers) ? cloudUsers : []),
        ...atomicUserDocs.map(doc => doc.payload),
        ...(Array.isArray(localState.users) ? localState.users : []),
        localState.currentUser && localState.currentUser.role !== 'admin' ? localState.currentUser : undefined,
        ...recoveredUsersFromActivity,
      ],
      mergedDeletedUsers
    );

    // 2b. Reconcile verified VIP transactions against mergedUsers (matching canonical ID, legacyIds, or email)
    for (let i = 0; i < mergedUsers.length; i++) {
      const usr = mergedUsers[i];
      if (usr.role === 'admin' || usr.subscriptionStatus === 'cancelled') continue;
      const usrEmail = (usr.email || '').toLowerCase().trim();
      const usrIdSet = new Set<string>([usr.id, ...(Array.isArray(usr.legacyIds) ? usr.legacyIds : [])]);

      const verifiedFutureTxns = allTxnsCombined.filter(t => {
        if (!t || t.status !== 'verified' || !t.expiresAt) return false;
        const expMs = new Date(t.expiresAt).getTime();
        if (Number.isNaN(expMs) || expMs <= Date.now()) return false;
        return (
          (t.userId && usrIdSet.has(t.userId)) ||
          (t.ownerId && usrIdSet.has(t.ownerId)) ||
          (usrEmail && t.userEmail && t.userEmail.toLowerCase().trim() === usrEmail)
        );
      });
      if (verifiedFutureTxns.length > 0) {
        verifiedFutureTxns.sort((a, b) => new Date(b.expiresAt!).getTime() - new Date(a.expiresAt!).getTime());
        const bestTxn = verifiedFutureTxns[0];
        const currentExpMs = usr.subscriptionExpiryDate ? new Date(usr.subscriptionExpiryDate).getTime() : 0;
        const txnExpMs = new Date(bestTxn.expiresAt!).getTime();
        if (usr.membershipTier !== 'premium_vip' || usr.subscriptionStatus !== 'active' || txnExpMs > currentExpMs) {
          mergedUsers[i] = {
            ...usr,
            membershipTier: 'premium_vip',
            subscriptionStatus: 'active',
            subscriptionStartDate: usr.subscriptionStartDate || bestTxn.verifiedAt || bestTxn.createdAt,
            subscriptionExpiryDate: bestTxn.expiresAt,
            paymentStatus: 'verified',
            paymentMethod: (bestTxn.paymentMethod as any) || usr.paymentMethod || 'KHQR',
            transactionRef: bestTxn.transactionRef || usr.transactionRef,
          };
        }
      }

      // Also reconcile pending_verification VIP transactions if user has no active VIP
      if (mergedUsers[i].membershipTier !== 'premium_vip') {
        const pendingVipTxn = allTxnsCombined.find(t => {
          if (!t || t.status !== 'pending_verification') return false;
          return (
            (t.userId && usrIdSet.has(t.userId)) ||
            (t.ownerId && usrIdSet.has(t.ownerId)) ||
            (usrEmail && t.userEmail && t.userEmail.toLowerCase().trim() === usrEmail)
          );
        });
        if (pendingVipTxn && mergedUsers[i].paymentStatus !== 'verified') {
          mergedUsers[i] = {
            ...mergedUsers[i],
            paymentStatus: 'pending_verification',
            subscriptionStatus: mergedUsers[i].subscriptionStatus || 'pending',
            transactionRef: pendingVipTxn.transactionRef || mergedUsers[i].transactionRef,
          };
        }
      }

      // Also reconcile verified additional_store_slot transactions so paidAdditionalStoreSlots is always accurate
      const verifiedAdditionalStoreTxns = allTxnsCombined.filter(t => {
        if (!t || t.type !== 'additional_store_slot' || t.status !== 'verified') return false;
        return (
          (t.userId && usrIdSet.has(t.userId)) ||
          (t.ownerId && usrIdSet.has(t.ownerId)) ||
          (usrEmail && t.userEmail && t.userEmail.toLowerCase().trim() === usrEmail)
        );
      });
      {
        const uniqueVerifiedRefs = new Set(verifiedAdditionalStoreTxns.map(t => t.id));
        const slotCount = uniqueVerifiedRefs.size;
        const currentIds = Array.isArray(mergedUsers[i].additionalStorePaymentIds)
          ? mergedUsers[i].additionalStorePaymentIds
          : [];
        if (
          slotCount !== (mergedUsers[i].paidAdditionalStoreSlots || 0) ||
          currentIds.length !== uniqueVerifiedRefs.size
        ) {
          mergedUsers[i] = {
            ...mergedUsers[i],
            paidAdditionalStoreSlots: slotCount,
            additionalStorePaymentIds: Array.from(uniqueVerifiedRefs),
          };
        }
      }
    }

    // 3. Merge Transactions by ID (excluding transactions of deleted users and Admin-deleted transaction records)
    let localDeletedTxnIds: string[] = [];
    try {
      const rawDelTxns = localStorage.getItem('kft_deleted_transactions_v1');
      if (rawDelTxns) localDeletedTxnIds = JSON.parse(rawDelTxns);
    } catch {}
    const deletedTxnIdSet = new Set<string>([
      ...(Array.isArray(localDeletedTxnIds) ? localDeletedTxnIds : []),
      ...(Array.isArray(cloudDeletedTxnIds) ? cloudDeletedTxnIds : []),
    ]);
    try {
      localStorage.setItem('kft_deleted_transactions_v1', JSON.stringify(Array.from(deletedTxnIdSet)));
    } catch {}

    const txnMap = new Map<string, RegistrationTransaction>();
    if (Array.isArray(cloudTxns)) {
      for (const t of cloudTxns) {
        if (
          t &&
          t.id &&
          !deletedTxnIdSet.has(t.id) &&
          !isActivityUserDeleted(t.userId || t.ownerId, t.userEmail, t.phone)
        ) {
          txnMap.set(t.id, t);
        }
      }
    }
    for (const t of localState.transactions) {
      if (!t || !t.id || deletedTxnIdSet.has(t.id) || isActivityUserDeleted(t.userId || t.ownerId, t.userEmail, t.phone)) continue;
      const existing = txnMap.get(t.id);
      if (!existing) {
        txnMap.set(t.id, t);
      } else {
        if (existing.status !== 'pending_verification' && t.status === 'pending_verification') {
          txnMap.set(t.id, existing);
        } else {
          txnMap.set(t.id, { ...existing, ...t });
        }
      }
    }
    const mergedTransactions = Array.from(txnMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 4. Merge Custom & Google Maps Smart-Cached Restaurants by ID (excluding built-in rest-1..250 seeds, deleted users' shops, and permanently deleted shop IDs)
    let localDeletedRestsMap: Record<string, string> = { ...(localState.deletedRestaurantIds || {}) };
    try {
      const rawDelRests = localStorage.getItem('kft_deleted_restaurants_v1');
      if (rawDelRests) {
        const parsedDel = JSON.parse(rawDelRests);
        if (parsedDel && typeof parsedDel === 'object' && !Array.isArray(parsedDel)) {
          localDeletedRestsMap = { ...parsedDel, ...localDeletedRestsMap };
        }
      }
    } catch {}

    const mergedDeletedRestaurantIds: Record<string, string> = {};
    if (cloudDeletedRests && typeof cloudDeletedRests === 'object' && !Array.isArray(cloudDeletedRests)) {
      for (const [id, iso] of Object.entries(cloudDeletedRests)) {
        if (id && typeof iso === 'string') mergedDeletedRestaurantIds[id] = iso;
      }
    }
    for (const [id, iso] of Object.entries(localDeletedRestsMap)) {
      if (!id || typeof iso !== 'string') continue;
      const curIso = mergedDeletedRestaurantIds[id];
      if (!curIso || (new Date(iso).getTime() || 0) >= (new Date(curIso).getTime() || 0)) {
        mergedDeletedRestaurantIds[id] = iso;
      }
    }

    const getRestTimestampMs = (x: any): number =>
      Math.max(
        x?.updatedAt ? new Date(x.updatedAt).getTime() || 0 : 0,
        x?.photoUpdatedAt ? new Date(x.photoUpdatedAt).getTime() || 0 : 0,
        x?.adminEditedAt ? new Date(x.adminEditedAt).getTime() || 0 : 0,
        x?.createdAt ? new Date(x.createdAt).getTime() || 0 : 0
      );

    const isShopDeleted = (r: any): boolean => {
      if (!r || !r.id) return true;
      const rId = String(r.id);
      if (mergedDeletedRestaurantIds[rId]) return true;
      const gPlaceId = r.googlePlaceId ? String(r.googlePlaceId) : '';
      if (gPlaceId && (mergedDeletedRestaurantIds[`gplace:${gPlaceId}`] || mergedDeletedRestaurantIds[gPlaceId])) {
        return true;
      }
      return false;
    };

    try {
      localStorage.setItem('kft_deleted_restaurants_v1', JSON.stringify(mergedDeletedRestaurantIds));
    } catch {}

    const restMap = new Map<string, Restaurant>();
    if (Array.isArray(cloudRests)) {
      for (const r of cloudRests) {
        if (
          r &&
          r.id &&
          !isSeedRestaurantId(String(r.id)) &&
          (!r.ownerId || !deletedIds.has(r.ownerId)) &&
          !isShopDeleted(r)
        ) {
          restMap.set(r.id, r);
        }
      }
    }

    for (const r of localState.customRestaurants) {
      if (
        r &&
        r.id &&
        !isSeedRestaurantId(String(r.id)) &&
        (!r.ownerId || !deletedIds.has(r.ownerId)) &&
        !isShopDeleted(r)
      ) {
        const existing = restMap.get(r.id);
        if (!existing) {
          restMap.set(r.id, r);
        } else {
          const existingMs = getRestTimestampMs(existing);
          const localMs = getRestTimestampMs(r);
          const base = localMs >= existingMs ? { ...existing, ...r } : { ...r, ...existing };
          const localMenu = Array.isArray(r.menuItems) ? r.menuItems : [];
          const existingMenu = Array.isArray(existing.menuItems) ? existing.menuItems : [];
          const bestMenuItems =
            localMs >= existingMs
              ? localMenu.length > 0 || existingMenu.length === 0
                ? localMenu
                : localMenu
              : existingMenu.length > 0
              ? existingMenu
              : localMenu;
          const bestPhoto =
            r.photoUrl?.startsWith('data:') && localMs >= existingMs
              ? r.photoUrl
              : existing.photoUrl?.startsWith('data:')
              ? existing.photoUrl
              : base.photoUrl || existing.photoUrl || r.photoUrl;
          restMap.set(r.id, {
            ...base,
            menuItems: bestMenuItems,
            photoUrl: bestPhoto,
            profileImage: base.profileImage?.startsWith('data:') ? base.profileImage : bestPhoto,
            updatedAt: localMs >= existingMs ? (r.updatedAt || existing.updatedAt) : (existing.updatedAt || r.updatedAt),
            photoUpdatedAt: localMs >= existingMs ? (r.photoUpdatedAt || existing.photoUpdatedAt) : (existing.photoUpdatedAt || r.photoUpdatedAt),
          });
        }
      }
    }
    const mergedCustomRestaurants = Array.from(restMap.values());

    // 5. Merge Payment Proofs Vault (excluding deleted transactions)
    const mergedPaymentProofsVault: Record<string, any> = {
      ...(cloudProofs || {}),
      ...(localState.paymentProofsVault || {}),
    };
    for (const delId of deletedTxnIdSet) {
      delete mergedPaymentProofsVault[delId];
    }

    // 5b. Resolve Centralized AppSettings: Server (`kft_cloud_admin_vip_pricing_v2` & `kft_cloud_app_settings_v1`) is the single source of truth!
    let mergedAppSettings: AppSettings | undefined = localState.appSettings;
    const authoritativeCloudSettings =
      cloudSettingsV2 && cloudSettingsV1
        ? normalizeAuthoritativeAppSettings(cloudSettingsV2, cloudSettingsV1)
        : cloudSettings;
    if (authoritativeCloudSettings) {
      mergedAppSettings = normalizeAuthoritativeAppSettings(authoritativeCloudSettings, localState.appSettings);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('kft_settings_v3');
          localStorage.removeItem('kft_settings_v4');
          localStorage.setItem('kft_settings_v5', JSON.stringify(mergedAppSettings));
        }
      } catch {
        // ignore storage errors
      }
      // Server VIP settings are read-only during general sync; only saveAuthoritativeAppSettingsToServer writes VIP settings.
    } else if (localState.appSettings) {
      mergedAppSettings = normalizeAuthoritativeAppSettings(localState.appSettings);
    }

    // 6. Push merged state back to Supabase Cloud ONLY when merged data differs from cloud state,
    // and backfill any missing or changed atomic `kft_user_<id>` rows.
    const existingAtomicMap = new Map(atomicUserDocs.map(d => [d.key, d.payload]));
    const pushPromises: Promise<boolean>[] = [];

    const safeJsonSig = (val: unknown): string => {
      try {
        return JSON.stringify(val ?? null);
      } catch {
        return '';
      }
    };

    const mergedUsersSig = safeJsonSig(mergedUsers);
    if ((isAdminDevice || Boolean(localState.currentUser)) && mergedUsersSig !== safeJsonSig(cloudUsersV2)) {
      pushPromises.push(pushCloudDocument('kft_cloud_users_v2', mergedUsers));
    }
    if (isAdminDevice && safeJsonSig(mergedDeletedUsers) !== safeJsonSig(cloudDeletedUsers || [])) {
      pushPromises.push(pushCloudDocument('kft_cloud_deleted_users_v1', mergedDeletedUsers));
    }
    if ((isAdminDevice || Boolean(localState.currentUser)) && safeJsonSig(mergedTransactions) !== safeJsonSig(cloudTxns || [])) {
      pushPromises.push(pushCloudDocument('kft_cloud_transactions_v1', mergedTransactions));
    }
    const mergedDeletedTxnArr = Array.from(deletedTxnIdSet);
    if (isAdminDevice && safeJsonSig(mergedDeletedTxnArr) !== safeJsonSig(cloudDeletedTxnIds || [])) {
      pushPromises.push(pushCloudDocument('kft_cloud_deleted_transactions_v1', mergedDeletedTxnArr));
    }
    if (
      (isAdminDevice || Boolean(localState.currentUser) || localState.customRestaurants.length > 0 || Object.keys(mergedDeletedRestaurantIds).length > 0) &&
      safeJsonSig(mergedCustomRestaurants) !== safeJsonSig(cloudRests || [])
    ) {
      pushPromises.push(pushCloudDocument('kft_cloud_custom_restaurants_v1', mergedCustomRestaurants));
    }
    if (
      (isAdminDevice || Boolean(localState.currentUser) || Object.keys(mergedDeletedRestaurantIds).length > 0) &&
      safeJsonSig(mergedDeletedRestaurantIds) !== safeJsonSig(cloudDeletedRests || {})
    ) {
      pushPromises.push(pushCloudDocument('kft_cloud_deleted_restaurants_v1', mergedDeletedRestaurantIds));
    }
    if (shouldSyncPaymentProofs && safeJsonSig(mergedPaymentProofsVault) !== safeJsonSig(cloudProofs || {})) {
      pushPromises.push(pushCloudDocument('kft_cloud_payment_proofs_v1', mergedPaymentProofsVault));
    }

    // Ensure active user(s) have an up-to-date atomic `kft_user_<id>` record in Supabase without write-back storms
    const currentCanonicalId = localState.currentUser ? getCanonicalUserId(localState.currentUser) : null;
    for (const u of mergedUsers) {
      if (!shouldFetchHeavyAdminVaults && u.id !== localState.currentUser?.id && u.id !== currentCanonicalId) {
        continue;
      }
      const atomicKey = `${USER_RECORD_PREFIX}${u.id}`;
      const existingAtomic = existingAtomicMap.get(atomicKey);
      if (!existingAtomic || safeJsonSig(existingAtomic) !== safeJsonSig(u)) {
        pushPromises.push(pushCloudDocument(atomicKey, u));
      }
    }

    // Do not overwrite cloud VIP settings during general sync
    if (pushPromises.length > 0) {
      await Promise.all(pushPromises);
    }

    return {
      synced: true,
      mergedUsers,
      mergedDeletedUsers,
      mergedTransactions,
      mergedCustomRestaurants,
      mergedDeletedRestaurantIds,
      mergedPaymentProofsVault,
      mergedAppSettings,
    };
  } catch (err) {
    console.warn('Supabase syncAllAppDataWithSupabase error:', err);
    return {
      synced: false,
      mergedUsers: deduplicateAndNormalizeUsers(
        [...(localState.users || []), localState.currentUser || undefined],
        localState.deletedUsers || []
      ),
      mergedDeletedUsers: localState.deletedUsers || [],
      mergedTransactions: localState.transactions,
      mergedCustomRestaurants: localState.customRestaurants,
      mergedPaymentProofsVault: localState.paymentProofsVault,
      mergedAppSettings: localState.appSettings,
    };
  }
}

/**
 * SQL Script for 1-Click Setup in Supabase SQL Editor (Free Tier)
 */
export const SUPABASE_SETUP_SQL = `-- ============================================================================
-- Khmer Food & Tourism (v1.7.5) — Supabase Free Tier Cloud Database Setup
-- Copy and Run this once in your Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kft_app_kv_store (
  key TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS) with public app access policy for sync
ALTER TABLE public.kft_app_kv_store ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read and write for app sync" ON public.kft_app_kv_store;
CREATE POLICY "Allow public read and write for app sync"
  ON public.kft_app_kv_store
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Optional: Index on updated_at for fast queries
CREATE INDEX IF NOT EXISTS idx_kft_app_kv_updated_at ON public.kft_app_kv_store(updated_at DESC);
`;
