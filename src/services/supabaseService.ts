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

/**
 * Normalize and sanitize AppSettings so VIP prices, durations, names, promotional banners,
 * and additional-store fees are always consistent across all screens and payment checks.
 */
export function normalizeAuthoritativeAppSettings(
  raw: Partial<AppSettings>,
  fallback?: Partial<AppSettings>
): AppSettings {
  const merged = { ...(fallback || {}), ...(raw || {}) } as AppSettings;
  const shortDays =
    typeof merged.vipShortDurationDays === 'number' && merged.vipShortDurationDays >= 1
      ? Math.round(merged.vipShortDurationDays)
      : 30;
  const shortPrice =
    typeof merged.vipShortPriceUsd === 'number' && merged.vipShortPriceUsd > 0
      ? Math.round(merged.vipShortPriceUsd * 100) / 100
      : 9.99;
  const longDays =
    typeof merged.vipLongDurationDays === 'number' && merged.vipLongDurationDays >= 1
      ? Math.round(merged.vipLongDurationDays)
      : 90;
  const longPrice =
    typeof merged.vipLongPriceUsd === 'number' && merged.vipLongPriceUsd > 0
      ? Math.round(merged.vipLongPriceUsd * 100) / 100
      : 24.99;
  const extraStoreFee =
    typeof merged.additionalStoreFeeUsd === 'number' && merged.additionalStoreFeeUsd >= 0
      ? Math.round(merged.additionalStoreFeeUsd * 100) / 100
      : 10.0;
  const includedFree =
    typeof merged.includedFreeStoresPerVip === 'number' && merged.includedFreeStoresPerVip >= 1
      ? Math.round(merged.includedFreeStoresPerVip)
      : 1;

  const shortNameKh = (merged.vipShortNameKh || '').trim() || `VIP ${shortDays} ថ្ងៃ`;
  const shortNameEn = (merged.vipShortNameEn || '').trim() || `VIP ${shortDays} Days`;
  const longNameKh = (merged.vipLongNameKh || '').trim() || `កញ្ចប់ VIP ${longDays} ថ្ងៃ`;
  const longNameEn = (merged.vipLongNameEn || '').trim() || `VIP ${longDays} Days`;

  return {
    ...merged,
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
    promotionalFeeUsd: shortPrice,
    promotionPeriodKh: `កញ្ចប់ VIP ផ្លូវការ៖ $${shortPrice.toFixed(2)} សម្រាប់ ${shortDays} ថ្ងៃ ឬ $${longPrice.toFixed(2)} សម្រាប់ ${longDays} ថ្ងៃ • បន្ថែមហាងថ្មី៖ $${extraStoreFee.toFixed(2)} / ១ ហាង`,
    promotionPeriodEn: `Official VIP Plans: $${shortPrice.toFixed(2)} for ${shortDays} Days or $${longPrice.toFixed(2)} for ${longDays} Days • Additional Store: $${extraStoreFee.toFixed(2)} / store`,
  };
}

/**
 * Fetch the authoritative Admin-configured AppSettings directly from the server (`kft_cloud_app_settings_v1`).
 * Immediately invalidates outdated local caches (`kft_settings_v3`) and updates `kft_settings_v4`.
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

    const chosenPayload = v2Payload || v1Payload;
    if (chosenPayload && typeof chosenPayload === 'object') {
      const normalized = normalizeAuthoritativeAppSettings(chosenPayload, fallback);
      if (
        v2Payload &&
        (!v1Payload ||
          Number(v1Payload.vipShortPriceUsd) !== normalized.vipShortPriceUsd ||
          Number(v1Payload.vipLongPriceUsd) !== normalized.vipLongPriceUsd)
      ) {
        pushCloudDocument('kft_cloud_app_settings_v1', normalized, 6000).catch(() => {});
      }
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('kft_settings_v3');
          localStorage.setItem('kft_settings_v4', JSON.stringify(normalized));
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
  } catch {
    return {
      ok: true,
      settings: fallback ? normalizeAuthoritativeAppSettings(fallback) : null,
    };
  }
}

/**
 * Authoritative Admin-only save for centralized VIP settings (`kft_cloud_admin_vip_pricing_v2` & `kft_cloud_app_settings_v1`).
 * Increments `settingsVersion`, writes directly to the server, and invalidates stale local caches.
 */
export async function saveAuthoritativeAppSettingsToServer(
  settings: AppSettings,
  timeoutMs = 8000
): Promise<{
  ok: boolean;
  settings: AppSettings;
  error?: string;
}> {
  const nextVersion = (Number(settings.settingsVersion) || 0) + 1;
  const nowIso = new Date().toISOString();
  const normalized = normalizeAuthoritativeAppSettings({
    ...settings,
    settingsVersion: nextVersion,
    settingsUpdatedAt: nowIso,
  });

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('kft_settings_v3');
      localStorage.setItem('kft_settings_v4', JSON.stringify(normalized));
    }
  } catch {
    // ignore storage errors
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      settings: normalized,
      error: 'Cloud server is not configured.',
    };
  }

  const [pushedV2, pushedV1] = await Promise.all([
    pushCloudDocument('kft_cloud_admin_vip_pricing_v2', normalized, timeoutMs),
    pushCloudDocument('kft_cloud_app_settings_v1', normalized, timeoutMs),
  ]);
  if (!pushedV2 && !pushedV1) {
    return {
      ok: false,
      settings: normalized,
      error: 'Could not save VIP settings to cloud server. Please check your connection and try again.',
    };
  }

  return {
    ok: true,
    settings: normalized,
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
  let earliestCreatedIso = first.createdAt || second.createdAt || new Date().toISOString().split('T')[0];
  let earliestRegisteredIso = first.registeredAtIso || second.registeredAtIso || first.createdAt || second.createdAt;
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
        createdAt: item.createdAt || new Date().toISOString().split('T')[0],
        registeredAtIso: item.registeredAtIso || item.createdAt || new Date().toISOString(),
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
export async function upsertSingleUserToCloud(
  user: User,
  deletedUsers: DeletedUserRecord[] = []
): Promise<User[]> {
  if (!user || user.role === 'admin' || user.id === 'admin-authorized-single') {
    return [];
  }
  const canonicalList = deduplicateAndNormalizeUsers([user], deletedUsers);
  if (canonicalList.length === 0) return [];
  const canonicalUser = canonicalList[0];

  if (!isSupabaseConfigured()) return [canonicalUser];

  try {
    // 1. Write atomic per-user row immediately (cannot be overwritten by any other user's device)
    const atomicKey = `${USER_RECORD_PREFIX}${canonicalUser.id}`;
    await pushCloudDocument(atomicKey, canonicalUser);

    // 2. Pull latest cloud users (v2 + v1) + per-user atomic records, merge with canonicalUser, and push back
    const [cloudUsersV2, cloudUsersV1, atomicUserRows, cloudDeleted] = await Promise.all([
      pullCloudDocument<User[]>('kft_cloud_users_v2'),
      pullCloudDocument<User[]>('kft_cloud_users_v1'),
      pullCloudDocumentsByPrefix<User>(USER_RECORD_PREFIX),
      pullCloudDocument<DeletedUserRecord[]>('kft_cloud_deleted_users_v1'),
    ]);

    const allDeleted = [
      ...deletedUsers,
      ...(Array.isArray(cloudDeleted) ? cloudDeleted : []),
    ];

    const merged = deduplicateAndNormalizeUsers(
      [
        ...(Array.isArray(cloudUsersV2) ? cloudUsersV2 : []),
        ...(Array.isArray(cloudUsersV1) ? cloudUsersV1 : []),
        ...atomicUserRows.map(r => r.payload),
        canonicalUser,
      ],
      allDeleted
    );

    await Promise.all([
      pushCloudDocument('kft_cloud_users_v2', merged),
      pushCloudDocument('kft_cloud_users_v1', merged),
    ]);
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
  customDestinations?: TouristDestination[];
  supportTickets?: SupportTicket[];
  paymentProofsVault: Record<string, any>;
  appSettings?: AppSettings;
}): Promise<{
  synced: boolean;
  mergedUsers: User[];
  mergedDeletedUsers: DeletedUserRecord[];
  mergedTransactions: RegistrationTransaction[];
  mergedCustomRestaurants: Restaurant[];
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
    // 1. Pull existing cloud records including v2 users, v1 users, atomic per-user rows (`kft_user_*`), and VIP backups
    const [
      cloudUsersV2,
      cloudUsers,
      atomicUserDocs,
      cloudVipBackup,
      cloudDeletedUsers,
      cloudTxns,
      cloudRests,
      cloudTickets,
      cloudProofs,
      cloudSettingsV2,
      cloudSettingsV1,
    ] = await Promise.all([
      pullCloudDocument<User[]>('kft_cloud_users_v2'),
      pullCloudDocument<User[]>('kft_cloud_users_v1'),
      pullCloudDocumentsByPrefix<User>(USER_RECORD_PREFIX),
      pullCloudDocument<Record<string, Partial<User>>>('kft_cloud_vip_backup_v1'),
      pullCloudDocument<DeletedUserRecord[]>('kft_cloud_deleted_users_v1'),
      pullCloudDocument<RegistrationTransaction[]>('kft_cloud_transactions_v1'),
      pullCloudDocument<Restaurant[]>('kft_cloud_custom_restaurants_v1'),
      pullCloudDocument<SupportTicket[]>('kft_cloud_support_tickets_v1'),
      pullCloudDocument<Record<string, any>>('kft_cloud_payment_proofs_v1'),
      pullCloudDocument<AppSettings>('kft_cloud_admin_vip_pricing_v2'),
      pullCloudDocument<AppSettings>('kft_cloud_app_settings_v1'),
    ]);
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
    const deletedIds = new Set(mergedDeletedUsers.map(d => d.id));

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
      if (uid && deletedIds.has(uid)) continue;
      const isGoogle = String(uid || '').startsWith('google-') || uEmail.endsWith('@gmail.com');
      const createdDate = t.createdAt ? t.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
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
        registeredAtIso: t.createdAt || new Date().toISOString(),
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
      if (deletedIds.has(tk.userId)) continue;
      const uEmail = (tk.userEmail || '').trim().toLowerCase();
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
        createdAt: tk.createdAt ? tk.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        registeredAtIso: tk.createdAt,
        lastActiveAt: tk.updatedAt || tk.createdAt,
      });
    }

    if (cloudVipBackup && typeof cloudVipBackup === 'object') {
      for (const [key, val] of Object.entries(cloudVipBackup)) {
        if (!val || typeof val !== 'object') continue;
        const emailFromKey = key.startsWith('email:') ? key.slice(6) : (val.email || '');
        const idFromKey = key.startsWith('id:') ? key.slice(3) : (val.id || '');
        if (!idFromKey && !emailFromKey) continue;
        recoveredUsersFromActivity.push({
          id: idFromKey || `google-${emailFromKey.replace(/[^a-z0-9]/g, '_')}`,
          name: val.name || (emailFromKey ? emailFromKey.split('@')[0] : 'VIP Member'),
          email: emailFromKey,
          phone: val.phone,
          role: val.role || 'user',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
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
        ...recoveredUsersFromActivity,
        ...(Array.isArray(cloudUsersV2) ? cloudUsersV2 : []),
        ...(Array.isArray(cloudUsers) ? cloudUsers : []),
        ...atomicUserDocs.map(doc => doc.payload),
        ...(Array.isArray(localState.users) ? localState.users : []),
        localState.currentUser && localState.currentUser.role !== 'admin' ? localState.currentUser : undefined,
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
      if (verifiedAdditionalStoreTxns.length > 0) {
        const uniqueVerifiedRefs = new Set(verifiedAdditionalStoreTxns.map(t => t.id));
        const slotCount = Math.max(mergedUsers[i].paidAdditionalStoreSlots || 0, uniqueVerifiedRefs.size);
        if (slotCount !== (mergedUsers[i].paidAdditionalStoreSlots || 0)) {
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
    const cloudDeletedTxnIds = await pullCloudDocument<string[]>('kft_cloud_deleted_transactions_v1');
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
          (!t.ownerId || !deletedIds.has(t.ownerId))
        ) {
          txnMap.set(t.id, t);
        }
      }
    }
    for (const t of localState.transactions) {
      if (!t || !t.id || deletedTxnIdSet.has(t.id) || (t.ownerId && deletedIds.has(t.ownerId))) continue;
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

    // 4. Merge Custom & Google Maps Smart-Cached Restaurants by ID (excluding built-in rest-1..250 seeds and deleted users' custom shops)
    const restMap = new Map<string, Restaurant>();
    if (Array.isArray(cloudRests)) {
      for (const r of cloudRests) {
        if (r && r.id && !isSeedRestaurantId(String(r.id)) && (!r.ownerId || !deletedIds.has(r.ownerId))) {
          restMap.set(r.id, r);
        }
      }
    }
    for (const r of localState.customRestaurants) {
      if (r && r.id && !isSeedRestaurantId(String(r.id)) && (!r.ownerId || !deletedIds.has(r.ownerId))) {
        const existing = restMap.get(r.id);
        if (!existing) {
          restMap.set(r.id, r);
        } else {
          const existingMs = new Date(existing.photoUpdatedAt || existing.adminEditedAt || existing.createdAt || 0).getTime() || 0;
          const localMs = new Date(r.photoUpdatedAt || r.adminEditedAt || r.createdAt || 0).getTime() || 0;
          const base = localMs >= existingMs ? { ...existing, ...r } : { ...r, ...existing };
          const bestPhoto =
            r.photoUrl?.startsWith('data:') && localMs >= existingMs
              ? r.photoUrl
              : existing.photoUrl?.startsWith('data:')
              ? existing.photoUrl
              : base.photoUrl || existing.photoUrl || r.photoUrl;
          restMap.set(r.id, {
            ...base,
            photoUrl: bestPhoto,
            profileImage: base.profileImage?.startsWith('data:') ? base.profileImage : bestPhoto,
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

    // 5b. Resolve Centralized AppSettings: Server (`kft_cloud_app_settings_v1`) is the single source of truth!
    let mergedAppSettings: AppSettings | undefined = localState.appSettings;
    if (cloudSettings) {
      mergedAppSettings = normalizeAuthoritativeAppSettings(cloudSettings, localState.appSettings);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('kft_settings_v3');
          localStorage.setItem('kft_settings_v4', JSON.stringify(mergedAppSettings));
        }
      } catch {
        // ignore storage errors
      }
    } else if (localState.appSettings) {
      mergedAppSettings = normalizeAuthoritativeAppSettings(localState.appSettings);
    }

    // 6. Push merged state back to Supabase Cloud AND backfill atomic `kft_user_<id>` rows for every active user
    const existingAtomicKeySet = new Set(atomicUserDocs.map(d => d.key));
    const pushPromises: Promise<boolean>[] = [
      pushCloudDocument('kft_cloud_users_v2', mergedUsers),
      pushCloudDocument('kft_cloud_users_v1', mergedUsers),
      pushCloudDocument('kft_cloud_deleted_users_v1', mergedDeletedUsers),
      pushCloudDocument('kft_cloud_transactions_v1', mergedTransactions),
      pushCloudDocument('kft_cloud_deleted_transactions_v1', Array.from(deletedTxnIdSet)),
      pushCloudDocument('kft_cloud_custom_restaurants_v1', mergedCustomRestaurants),
      pushCloudDocument('kft_cloud_payment_proofs_v1', mergedPaymentProofsVault),
    ];

    // Ensure every active user has an atomic `kft_user_<id>` record in Supabase
    for (const u of mergedUsers) {
      const atomicKey = `${USER_RECORD_PREFIX}${u.id}`;
      const isCurrentUser = localState.currentUser && localState.currentUser.id === u.id;
      if (!existingAtomicKeySet.has(atomicKey) || isCurrentUser) {
        pushPromises.push(pushCloudDocument(atomicKey, u));
      }
    }

    if (!cloudSettings && mergedAppSettings) {
      pushPromises.push(pushCloudDocument('kft_cloud_app_settings_v1', mergedAppSettings));
    }
    await Promise.all(pushPromises);

    return {
      synced: true,
      mergedUsers,
      mergedDeletedUsers,
      mergedTransactions,
      mergedCustomRestaurants,
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
