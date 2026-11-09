import { getAppAttestationHeaders, isAppCloneTampered } from '../utils/appCloneIntegrityGuard';
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

import { adminTokenHeaders, isAdminServerAuthActive, adminServerChangePin } from './adminAuthClient';
import { getCanonicalPhoneDigits, normalizeEmailForIdentity } from '../utils/identityNormalize';
import { ensurePlacesProxyProbed, isPlacesProxyKnownAlive } from './placesProxy';
import {
  User,
  Restaurant,
  TouristDestination,
  RegistrationTransaction,
  DeletedUserRecord,
  AppSettings,
  SupportTicket,
  isSeedRestaurantId,
  parseSafeDateMs,
  getAuthoritativeServerNowMs,
  setAuthoritativeServerNowMs,
  resolveUserActualVipPlanDays,
  sanitizeUserVipPlanAndExpiry,
  isDeprecatedDemoSeedTransaction,
  inferBusinessTypeAndCategory,
} from '../types';
import {
  uploadImageToPermanentCloud,
  isUniqueGrillRestaurant,
  getUniqueGrillFallbackPhotoUrl,
  getRememberedCloudUrlForEntity,
} from './cloudImageStorageService';
import {
  isCustomUploadedAvatarDataUrl,
  cacheUserAvatarForAccount,
  getCachedUserAvatarForAccount,
  createCompactSyncAvatarDataUrl,
} from '../utils/avatarHelper';
import { applyFoodWatermarkOnce, isUrlWatermarkedAtPixelLevel } from '../utils/foodWatermark';
import {
  evaluateAggregatePush,
  isUserAggregateKey,
  isUserCriticalKey,
  mergeOutboxEntry,
  planUserCursorSync,
  MAX_PREFIX_PAGES,
  PREFIX_PAGE_SIZE,
  type OutboxEntry,
} from '../utils/userDataSafety';
import {
  logIntegrityEvent,
  noteServerAggregateCount,
  readServerAggregateCount,
  readUserHighWater,
  readUserSyncCursor,
  writeUserSyncCursor,
  readAtomicBackfillPending,
  writeAtomicBackfillPending,
  runUserDataIntegrityCheck,
} from './userDataIntegrityService';

export interface CloudWriteOptions {
  /** Explicit, intentional admin action that may shrink/delete protected user data (sends x-kft-allow-destructive). */
  allowDestructive?: boolean;
}

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
// SECURITY: no Google Maps / Gemini key is bundled in the app any more (the old ones were extractable from the APK).
// Both keys now live ONLY in Supabase secrets behind the `places-proxy` and `food-ai` Edge Functions.
// A device may still hold its own key (Admin -> Cloud API settings or VITE_* env) as a fall-back for outages.
export const DEFAULT_GOOGLE_MAPS_API_KEY = '';
export const DEFAULT_GEMINI_API_KEY = '';

let cachedCloudApiConfig: CloudApiConfig | null = null;
let cachedCloudApiRawStr: string | null | undefined = undefined;

export function getCloudApiConfig(): CloudApiConfig {
  let rawConfigStr: string | null = null;
  try {
    rawConfigStr = typeof localStorage !== 'undefined' ? localStorage.getItem(CLOUD_API_CONFIG_STORAGE_KEY) : null;
    if (cachedCloudApiConfig && rawConfigStr === cachedCloudApiRawStr) {
      return cachedCloudApiConfig;
    }
  } catch {
    if (cachedCloudApiConfig) return cachedCloudApiConfig;
  }

  const envSupabaseUrl =
    (import.meta as any).env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const envSupabaseKey =
    (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  const envGoogleMapsKey =
    (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || DEFAULT_GOOGLE_MAPS_API_KEY;
  const envGeminiKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY || DEFAULT_GEMINI_API_KEY;
  const envVisionBackend = (import.meta as any).env?.VITE_AI_VISION_BACKEND_URL || '';

  let fallbackGeminiKey = envGeminiKey.trim();
  let fallbackMapsKey = envGoogleMapsKey.trim();
  try {
    for (const [storageKey, field] of [
      ['kft_ai_vision_config_v1', 'apiKey'],
      ['kft_settings_v5', 'geminiApiKey'],
      ['kft_pre_update_db_backup_v1', 'geminiApiKey'],
    ] as const) {
      if (fallbackGeminiKey) break;
      const rawFallback = localStorage.getItem(storageKey);
      if (rawFallback && rawFallback !== 'undefined' && rawFallback !== 'null') {
        const parsedFb = JSON.parse(rawFallback);
        const candidate = typeof parsedFb?.[field] === 'string' ? parsedFb[field].trim() : '';
        if (candidate.length > 10) {
          fallbackGeminiKey = candidate;
        }
      }
    }
  } catch {
    // ignore fallback parse error
  }

  try {
    if (rawConfigStr) {
      const parsed = JSON.parse(rawConfigStr);
      const resolved: CloudApiConfig = {
        supabaseUrl: (parsed.supabaseUrl || envSupabaseUrl || '').trim().replace(/\/+$/, ''),
        supabaseAnonKey: (parsed.supabaseAnonKey || envSupabaseKey || '').trim(),
        googleMapsApiKey: (parsed.googleMapsApiKey || fallbackMapsKey || '').trim(),
        geminiApiKey: (parsed.geminiApiKey || fallbackGeminiKey || '').trim(),
        aiVisionBackendUrl: (parsed.aiVisionBackendUrl || envVisionBackend || '').trim(),
        enableAutoCloudSync: parsed.enableAutoCloudSync !== false,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
      cachedCloudApiRawStr = rawConfigStr;
      cachedCloudApiConfig = resolved;
      return resolved;
    }
  } catch {
    // ignore storage parse error
  }

  const fallbackConfig: CloudApiConfig = {
    supabaseUrl: envSupabaseUrl.trim().replace(/\/+$/, ''),
    supabaseAnonKey: envSupabaseKey.trim(),
    googleMapsApiKey: fallbackMapsKey,
    geminiApiKey: fallbackGeminiKey,
    aiVisionBackendUrl: envVisionBackend.trim(),
    enableAutoCloudSync: true,
    updatedAt: new Date().toISOString(),
  };
  cachedCloudApiRawStr = rawConfigStr;
  cachedCloudApiConfig = fallbackConfig;
  return fallbackConfig;
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
    const serialized = JSON.stringify(updated);
    localStorage.setItem(CLOUD_API_CONFIG_STORAGE_KEY, serialized);
    cachedCloudApiRawStr = serialized;
    cachedCloudApiConfig = updated;
    if (partial.googleMapsApiKey !== undefined && partial.googleMapsApiKey !== current.googleMapsApiKey) {
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
        modelName: 'gemini-3.5-flash-lite',
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
  if (cfg.googleMapsApiKey && cfg.googleMapsApiKey.length > 15) return true;
  // No Google key on this device: still "configured" when the secure `places-proxy` Edge Function holds the key.
  if (isPlacesProxyKnownAlive()) return true;
  ensurePlacesProxyProbed();
  return false;
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
    ...getAppAttestationHeaders(),
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

    if (res.status === 402) {
      supabaseEgressCooldownUntilMs = Date.now() + 60_000;
      const failoverStart = Date.now();
      const failoverStore = await pullAllFromSecondaryCloudFailover(true);
      const failoverLatency = Date.now() - failoverStart;
      if (failoverStore) {
        return {
          ok: true,
          messageKh: `ប្រព័ន្ធ Cloud Sync បម្រុង (Real-Time Secondary Cloud) កំពុងដំណើរការធម្មតា (${failoverLatency}ms) ខណៈពេល Supabase Primary រង់ចាំការបើកកូតាប្រចាំខែឡើងវិញ។`,
          latencyMs: failoverLatency,
        };
      }
      return {
        ok: false,
        messageKh:
          'គម្រោង Supabase Free Tier បានដល់កម្រិតទិន្នន័យទាញយកប្រចាំខែបណ្តោះអាសន្ន (HTTP 402 Egress Quota)។ ប្រព័ន្ធបានបើកមុខងារបង្រួមទំហំទិន្នន័យ 99% រួចរាល់ — កូតានឹងបើកឡើងវិញនៅដើមខែថ្មី ឬបន្ទាប់ពីបិទ Spend Cap ក្នុង Supabase Dashboard។',
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

// Circuit-breaker timestamp when Supabase returns HTTP 402 (exceed_egress_quota) so background syncs don't hammer the endpoint
let supabaseEgressCooldownUntilMs = 0;
export function isSupabaseEgressCooldownActive(): boolean {
  return Date.now() < supabaseEgressCooldownUntilMs;
}

export function resetSupabaseEgressCooldown(): void {
  supabaseEgressCooldownUntilMs = 0;
}

// ============================================================================
// SECONDARY REAL-TIME CLOUD FAILOVER & PUB/SUB ENGINE
// ============================================================================
// Guarantees 100% cross-device synchronization for User/Tester Registrations,
// Support Messages, VIP Transactions, and Business Submissions even when the
// Primary Supabase Free-Tier project hits HTTP 402 (exceed_egress_quota).
const SECONDARY_CLOUD_SYNC_TOPIC = 'kft_cloud_sync_v270_prod_9482';
const SECONDARY_CLOUD_LOCAL_MIRROR_KEY = 'kft_secondary_cloud_mirror_v1';

interface SecondaryKvEntry {
  key: string;
  payload: any;
  updated_at: string;
}

const secondaryFailoverMemoryMap = new Map<string, SecondaryKvEntry>();
const decodedSecondaryMessageById = new Map<string, SecondaryKvEntry | { __deleted: true; key: string; updated_at: string }>();
let lastSecondaryFailoverPullAtMs = 0;
let inFlightSecondaryPullPromise: Promise<Map<string, SecondaryKvEntry> | null> | null = null;
let secondaryPushQueuePromise: Promise<void> = Promise.resolve();
let hydratedSecondaryMirror = false;
let persistSecondaryMirrorTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_SECONDARY_CACHE_ENTRIES = 200;

function trimMapToMaxSize<K, V>(map: Map<K, V>, max: number): void {
  while (map.size > max) {
    const oldestKey = map.keys().next().value;
    if (oldestKey === undefined) break;
    map.delete(oldestKey);
  }
}

function hydrateSecondaryMirrorOnce(): void {
  if (hydratedSecondaryMirror) return;
  hydratedSecondaryMirror = true;
  let purgedIneligible = false;
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(SECONDARY_CLOUD_LOCAL_MIRROR_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      for (const [k, v] of Object.entries(parsed)) {
        const entry = v as SecondaryKvEntry;
        if (!isKeyEligibleForSecondaryFailover(k)) {
          purgedIneligible = true; // drop personal data cached by older app versions
          continue;
        }
        if (entry && typeof entry.key === 'string' && entry.payload !== undefined) {
          secondaryFailoverMemoryMap.set(k, entry);
        }
      }
    }
    if (purgedIneligible) persistSecondaryMirrorToStorage();
  } catch {
    // ignore local mirror read error
  }
}

function persistSecondaryMirrorToStorage(): void {
  trimMapToMaxSize(secondaryFailoverMemoryMap, MAX_SECONDARY_CACHE_ENTRIES);
  trimMapToMaxSize(decodedSecondaryMessageById, MAX_SECONDARY_CACHE_ENTRIES);
  if (persistSecondaryMirrorTimer) return;
  persistSecondaryMirrorTimer = setTimeout(() => {
    persistSecondaryMirrorTimer = null;
    try {
      if (typeof localStorage === 'undefined') return;
      const snapshot: Record<string, SecondaryKvEntry> = {};
      for (const [k, v] of secondaryFailoverMemoryMap.entries()) {
        if (k.startsWith('kft_proof_') || k.startsWith('kft_ov_')) continue;
        snapshot[k] = v;
      }
      const serialized = JSON.stringify(snapshot);
      if (serialized.length < 250_000) {
        localStorage.setItem(SECONDARY_CLOUD_LOCAL_MIRROR_KEY, serialized);
      }
    } catch {
      // ignore storage quota errors
    }
  }, 1500);
}

/**
 * PRIVACY: the secondary failover channel is a PUBLIC ntfy.sh topic - anyone who knows the
 * topic name can read every message. It must therefore NEVER carry personal data
 * (emails, phone numbers, names, avatars, payment receipts, owner contacts) or secrets
 * (admin password / PIN hashes). This is a strict ALLOW-LIST of public, non-personal
 * catalogue content only. Everything else (users, VIP backup, transactions, receipts,
 * tickets, custom restaurants with owner contacts, app settings, admin PIN ...) is
 * deliberately NOT eligible; those documents only live in Supabase (+ the local durable outbox).
 */
export function isKeyEligibleForSecondaryFailover(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  if (key.startsWith('kft_ov_food_')) return true;
  if (key.startsWith('kft_ov_dest_')) return true;
  if (key.startsWith('kft_ov_trend_')) return true;
  return key === 'kft_cloud_deleted_restaurants_v1';
}

function compactUserForInlineSecondarySync(u: any): any {
  if (!u || typeof u !== 'object') return u;
  const copy = { ...u };
  if (typeof copy.avatar === 'string' && copy.avatar.startsWith('data:') && copy.avatar.length > 900) {
    copy.avatar = copy.cloudAvatarUrl && !copy.cloudAvatarUrl.startsWith('data:') ? copy.cloudAvatarUrl : '';
  }
  if (typeof copy.cloudAvatarUrl === 'string' && copy.cloudAvatarUrl.startsWith('data:') && copy.cloudAvatarUrl.length > 900) {
    delete copy.cloudAvatarUrl;
  }
  if (Array.isArray(copy.vipMembershipHistory) && copy.vipMembershipHistory.length > 3) {
    copy.vipMembershipHistory = copy.vipMembershipHistory.slice(0, 3);
  }
  return copy;
}

async function pushToSecondaryCloudFailover(key: string, payload: any, timeoutMs = 10000): Promise<boolean> {
  if (!isKeyEligibleForSecondaryFailover(key)) return false;
  hydrateSecondaryMirrorOnce();

  const updatedAt = new Date(getAuthoritativeServerNowMs()).toISOString();
  const entry: SecondaryKvEntry = { key, payload, updated_at: updatedAt };
  secondaryFailoverMemoryMap.set(key, entry);
  persistSecondaryMirrorToStorage();

  let wirePayload = payload;
  let envelope = JSON.stringify(entry);
  // Keep atomic user & VIP backup records under 3800 bytes whenever possible so ntfy.sh stores them inline (never expiring as attachments)
  if (envelope.length > 3700) {
    if (key.startsWith('kft_user_') && payload && typeof payload === 'object') {
      wirePayload = compactUserForInlineSecondarySync(payload);
      envelope = JSON.stringify({ key, payload: wirePayload, updated_at: updatedAt });
    } else if (key === 'kft_cloud_vip_backup_v1' && Array.isArray(payload)) {
      wirePayload = payload.map(u => {
        const c = compactUserForInlineSecondarySync(u);
        if (!c || typeof c !== 'object') return c;
        return {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          role: c.role,
          membershipTier: c.membershipTier,
          subscriptionStartDate: c.subscriptionStartDate,
          subscriptionExpiryDate: c.subscriptionExpiryDate,
          subscriptionStatus: c.subscriptionStatus,
          paymentStatus: c.paymentStatus,
          paymentMethod: c.paymentMethod,
          transactionRef: c.transactionRef,
          vipStatus: c.vipStatus,
          vipPlanDays: c.vipPlanDays,
          vipPlanType: c.vipPlanType,
          vipExpiresAt: c.vipExpiresAt,
          freeTrialActivated: c.freeTrialActivated,
          freeTrialActivatedAt: c.freeTrialActivatedAt,
          freeTrialExpiresAt: c.freeTrialExpiresAt,
          freeTrialDurationDays: c.freeTrialDurationDays,
          foodCheckInRewardAt: c.foodCheckInRewardAt,
          paidAdditionalStoreSlots: c.paidAdditionalStoreSlots,
          legacyIds: c.legacyIds,
          registeredDeviceHash: c.registeredDeviceHash,
          integritySeal: c.integritySeal,
        };
      });
      envelope = JSON.stringify({ key, payload: wirePayload, updated_at: updatedAt });
      if (envelope.length > 3700) {
        wirePayload = wirePayload.map((c: any) => ({
          id: c.id,
          email: c.email,
          membershipTier: c.membershipTier,
          subscriptionStartDate: c.subscriptionStartDate,
          subscriptionExpiryDate: c.subscriptionExpiryDate,
          subscriptionStatus: c.subscriptionStatus,
          paymentStatus: c.paymentStatus,
          vipPlanDays: c.vipPlanDays,
          freeTrialActivated: c.freeTrialActivated,
          freeTrialActivatedAt: c.freeTrialActivatedAt,
          freeTrialExpiresAt: c.freeTrialExpiresAt,
          freeTrialDurationDays: c.freeTrialDurationDays,
          ...(c.paidAdditionalStoreSlots ? { paidAdditionalStoreSlots: c.paidAdditionalStoreSlots } : {}),
        }));
        envelope = JSON.stringify({ key, payload: wirePayload, updated_at: updatedAt });
      }
    }
  }

  // Avoid pushing oversized >2MB payloads to pub/sub relay
  if (envelope.length > 2_000_000) return false;

  const isLarge = envelope.length > 3800;
  const safeFileKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');

  let pushOk = false;
  const runPush = async () => {
    try {
      const res = await fetchWithTimeout(
        `https://ntfy.sh/${SECONDARY_CLOUD_SYNC_TOPIC}`,
        {
          method: isLarge ? 'PUT' : 'POST',
          headers: isLarge
            ? { Title: key, Filename: `${safeFileKey}.json` }
            : { Title: key },
          body: envelope,
        },
        timeoutMs
      );
      pushOk = res.ok;
      if (res.ok) {
        try {
          const msgMeta = await res.json();
          if (msgMeta && typeof msgMeta.time === 'number') {
            setAuthoritativeServerNowMs(msgMeta.time * 1000);
          }
          if (msgMeta && msgMeta.id) {
            decodedSecondaryMessageById.set(msgMeta.id, entry);
          }
        } catch {}
      }
    } catch {
      pushOk = false;
    }
    await new Promise(r => setTimeout(r, 180));
  };

  secondaryPushQueuePromise = secondaryPushQueuePromise.then(runPush, runPush);
  await secondaryPushQueuePromise;
  return pushOk;
}

async function deleteFromSecondaryCloudFailover(key: string, timeoutMs = 8000): Promise<boolean> {
  if (!isKeyEligibleForSecondaryFailover(key)) return false;
  hydrateSecondaryMirrorOnce();
  secondaryFailoverMemoryMap.delete(key);
  persistSecondaryMirrorToStorage();

  const updatedAt = new Date().toISOString();
  const tombEnvelope = JSON.stringify({ key, __deleted: true, updated_at: updatedAt });
  try {
    const res = await fetchWithTimeout(
      `https://ntfy.sh/${SECONDARY_CLOUD_SYNC_TOPIC}`,
      {
        method: 'POST',
        headers: { Title: key },
        body: tombEnvelope,
      },
      timeoutMs
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function pullAllFromSecondaryCloudFailover(
  forceRefresh = false,
  timeoutMs = 9000
): Promise<Map<string, SecondaryKvEntry> | null> {
  hydrateSecondaryMirrorOnce();
  const now = Date.now();
  if (!forceRefresh && now - lastSecondaryFailoverPullAtMs < 3500 && secondaryFailoverMemoryMap.size > 0) {
    return secondaryFailoverMemoryMap;
  }
  if (inFlightSecondaryPullPromise) {
    return inFlightSecondaryPullPromise;
  }

  inFlightSecondaryPullPromise = (async () => {
    try {
      const res = await fetchWithTimeout(
        `https://ntfy.sh/${SECONDARY_CLOUD_SYNC_TOPIC}/json?poll=1&since=all`,
        {
          method: 'GET',
          cache: 'no-store',
        },
        timeoutMs
      );
      if (!res.ok) {
        return secondaryFailoverMemoryMap.size > 0 ? secondaryFailoverMemoryMap : null;
      }
      const text = await res.text();
      const lines = text.trim().split('\n').filter(Boolean);
      const latestMsgByKey = new Map<string, any>();
      let maxServerEpochSec = 0;
      for (const line of lines) {
        try {
          const m = JSON.parse(line);
          if (m && typeof m.time === 'number' && m.time > maxServerEpochSec) {
            maxServerEpochSec = m.time;
          }
          if (m && m.event === 'message' && typeof m.title === 'string' && m.title) {
            latestMsgByKey.set(m.title, m);
          }
        } catch {}
      }
      if (maxServerEpochSec > 0) {
        setAuthoritativeServerNowMs(maxServerEpochSec * 1000);
      }

      for (const [k, m] of latestMsgByKey.entries()) {
        // Never ingest anything outside the public allow-list (old builds published personal data here).
        if (!isKeyEligibleForSecondaryFailover(k)) continue;
        try {
          let decoded = m.id ? decodedSecondaryMessageById.get(m.id) : undefined;
          if (!decoded) {
            let rawJson = m.message;
            if (m.attachment?.url) {
              const attRes = await fetchWithTimeout(m.attachment.url, { method: 'GET' }, 7000);
              if (attRes.ok) {
                rawJson = await attRes.text();
              }
            }
            const parsed = JSON.parse(rawJson);
            if (parsed && parsed.__deleted) {
              decoded = {
                __deleted: true,
                key: k,
                updated_at: parsed.updated_at || new Date((m.time || 0) * 1000).toISOString(),
              };
            } else if (parsed && parsed.key && parsed.payload !== undefined) {
              decoded = {
                key: parsed.key,
                payload: parsed.payload,
                updated_at: parsed.updated_at || new Date((m.time || 0) * 1000).toISOString(),
              };
            }
            if (decoded && m.id) {
              decodedSecondaryMessageById.set(m.id, decoded);
            }
          }

          if (!decoded) continue;
          const incomingMs = Date.parse(decoded.updated_at) || (m.time ? m.time * 1000 : 0);
          const existing = secondaryFailoverMemoryMap.get(k);
          const existingMs = existing ? Date.parse(existing.updated_at) || 0 : 0;

          if ('__deleted' in decoded && decoded.__deleted) {
            if (incomingMs >= existingMs) {
              secondaryFailoverMemoryMap.delete(k);
            }
          } else if ('payload' in decoded) {
            // Special merge for user lists, VIP backups, and Free Trial claim registries so concurrent updates never clobber each other
            if (
              (k === 'kft_cloud_users_v2' || k === 'kft_cloud_users_v1' || k === 'kft_cloud_vip_backup_v1') &&
              existing &&
              Array.isArray(existing.payload) &&
              Array.isArray(decoded.payload)
            ) {
              const combined = deduplicateAndNormalizeUsers([...existing.payload, ...decoded.payload], []);
              secondaryFailoverMemoryMap.set(k, {
                key: k,
                payload: combined,
                updated_at: incomingMs >= existingMs ? decoded.updated_at : existing.updated_at,
              });
            } else if (
              k === 'kft_cloud_food_checkin_reward_claims_v1' &&
              existing &&
              existing.payload &&
              typeof existing.payload === 'object' &&
              decoded.payload &&
              typeof decoded.payload === 'object'
            ) {
              secondaryFailoverMemoryMap.set(k, {
                key: k,
                payload: {
                  byUserId: { ...(existing.payload.byUserId || {}), ...(decoded.payload.byUserId || {}) },
                  byEmail: { ...(existing.payload.byEmail || {}), ...(decoded.payload.byEmail || {}) },
                  trialsByUserId: { ...(existing.payload.trialsByUserId || {}), ...(decoded.payload.trialsByUserId || {}) },
                  trialsByEmail: { ...(existing.payload.trialsByEmail || {}), ...(decoded.payload.trialsByEmail || {}) },
                  updatedAt: incomingMs >= existingMs ? decoded.updated_at : existing.updated_at,
                },
                updated_at: incomingMs >= existingMs ? decoded.updated_at : existing.updated_at,
              });
            } else if (incomingMs >= existingMs || !existing) {
              secondaryFailoverMemoryMap.set(k, decoded);
            }
          }
        } catch {}
      }

      lastSecondaryFailoverPullAtMs = Date.now();
      persistSecondaryMirrorToStorage();
      return secondaryFailoverMemoryMap;
    } catch {
      return secondaryFailoverMemoryMap.size > 0 ? secondaryFailoverMemoryMap : null;
    } finally {
      inFlightSecondaryPullPromise = null;
    }
  })();

  return inFlightSecondaryPullPromise;
}

/**
 * Real-time Server-Sent Events (SSE) subscription for instant cross-device updates.
 * Automatically pauses when `document.hidden` is true to prevent battery/CPU drain,
 * and delivers newly registered tester accounts, support messages, and shop submissions in < 1 second.
 */
export function subscribeToCloudRealtimeUpdates(
  onUpdate: (event: { key: string; payload: any; updated_at: string }) => void
): () => void {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return () => {};
  }
  hydrateSecondaryMirrorOnce();

  let es: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const cleanupSocket = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (es) {
      try {
        es.close();
      } catch {}
      es = null;
    }
  };

  const connect = () => {
    if (disposed) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    // Only open secondary public SSE stream when primary Supabase is in HTTP 402 egress cooldown.
    // Prevents continuous background SSE reconnects, battery/CPU drain, and memory growth when Supabase Pro is healthy.
    if (!isSupabaseEgressCooldownActive()) {
      cleanupSocket();
      return;
    }
    cleanupSocket();

    try {
      es = new EventSource(`https://ntfy.sh/${SECONDARY_CLOUD_SYNC_TOPIC}/sse`);
      es.onmessage = async (evt) => {
        if (disposed || !evt?.data) return;
        try {
          const m = JSON.parse(evt.data);
          if (!m || m.event !== 'message' || typeof m.title !== 'string' || !m.title) return;
          const k = m.title;
          if (!isKeyEligibleForSecondaryFailover(k)) return;
          let rawJson = m.message;
          if (m.attachment?.url) {
            const attRes = await fetchWithTimeout(m.attachment.url, { method: 'GET' }, 7000);
            if (attRes.ok) {
              rawJson = await attRes.text();
            }
          }
          const parsed = JSON.parse(rawJson);
          if (!parsed) return;
          const updatedAt = parsed.updated_at || new Date((m.time || 0) * 1000).toISOString();
          if (parsed.__deleted) {
            secondaryFailoverMemoryMap.delete(k);
            if (m.id) decodedSecondaryMessageById.set(m.id, { __deleted: true, key: k, updated_at: updatedAt });
            persistSecondaryMirrorToStorage();
            return;
          }
          if (parsed.key && parsed.payload !== undefined) {
            const entry: SecondaryKvEntry = {
              key: parsed.key,
              payload: parsed.payload,
              updated_at: updatedAt,
            };
            if (m.id) decodedSecondaryMessageById.set(m.id, entry);
            secondaryFailoverMemoryMap.set(k, entry);
            persistSecondaryMirrorToStorage();
            onUpdate(entry);
          }
        } catch {}
      };
      es.onerror = () => {
        cleanupSocket();
        if (!disposed && (typeof document === 'undefined' || !document.hidden)) {
          reconnectTimer = setTimeout(connect, 10_000);
        }
      };
    } catch {
      if (!disposed && (typeof document === 'undefined' || !document.hidden)) {
        reconnectTimer = setTimeout(connect, 12_000);
      }
    }
  };

  const handleVisibility = () => {
    if (disposed) return;
    if (document.hidden) {
      cleanupSocket();
    } else {
      connect();
    }
  };

  connect();
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibility);
  }

  return () => {
    disposed = true;
    cleanupSocket();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibility);
    }
  };
}

export const PROOF_RECORD_PREFIX = 'kft_proof_';
const pushedProofKeysInSession = new Set<string>();

/**
 * Strips heavy inline base64 `data:image/...` strings out of aggregate transaction payloads
 * before pushing `kft_cloud_transactions_v1` to Supabase, storing each proof once in `kft_proof_<txnId>`.
 * Reduces cloud sync bandwidth/egress by >99% while keeping full receipts accessible on-demand for Admin.
 */
export function sanitizeTransactionsForCloudPush(
  txns: RegistrationTransaction[]
): RegistrationTransaction[] {
  if (!Array.isArray(txns)) return [];
  return txns.map(t => {
    if (!t || !t.id) return t;
    if (typeof t.paymentProofUrl === 'string' && t.paymentProofUrl.startsWith('data:image/')) {
      const proofKey = `${PROOF_RECORD_PREFIX}${t.id}`;
      if (!pushedProofKeysInSession.has(proofKey) && isSupabaseConfigured()) {
        pushedProofKeysInSession.add(proofKey);
        pushCloudDocument(proofKey, {
          txnId: t.id,
          userId: t.userId || t.ownerId,
          dataUrl: t.paymentProofUrl,
          fileName: t.paymentProofFileName || 'aba_receipt.jpg',
          mimeType: t.paymentProofMimeType || 'image/jpeg',
          uploadedAt: t.paymentProofUploadedAt || t.createdAt || new Date().toISOString(),
        }).catch(() => {});
      }
      return {
        ...t,
        paymentProofUrl: `vault:${t.id}`,
      };
    }
    return t;
  });
}

/**
 * Strips heavy inline base64 `data:image/...` strings out of aggregate support ticket payloads
 * before pushing `kft_cloud_support_tickets_v1`, storing each attachment once in `kft_proof_ticket_<id>`.
 */
export function sanitizeSupportTicketsForCloudPush(
  tickets: SupportTicket[]
): SupportTicket[] {
  if (!Array.isArray(tickets)) return [];
  return tickets.map(tk => {
    if (!tk || !tk.id) return tk;
    let nextTk = tk;
    if (typeof tk.receiptUrl === 'string' && tk.receiptUrl.startsWith('data:image/')) {
      const proofKey = `${PROOF_RECORD_PREFIX}ticket_${tk.id}`;
      if (!pushedProofKeysInSession.has(proofKey) && isSupabaseConfigured()) {
        pushedProofKeysInSession.add(proofKey);
        pushCloudDocument(proofKey, {
          ticketId: tk.id,
          userId: tk.userId,
          dataUrl: tk.receiptUrl,
          uploadedAt: tk.createdAt || new Date().toISOString(),
        }).catch(() => {});
      }
      nextTk = { ...nextTk, receiptUrl: `vault:ticket_${tk.id}` };
    }
    if (Array.isArray(nextTk.messages)) {
      let msgChanged = false;
      const cleanMsgs = nextTk.messages.map(m => {
        if (m && typeof m.attachmentUrl === 'string' && m.attachmentUrl.startsWith('data:image/')) {
          msgChanged = true;
          const mKey = `${PROOF_RECORD_PREFIX}msg_${m.id}`;
          if (!pushedProofKeysInSession.has(mKey) && isSupabaseConfigured()) {
            pushedProofKeysInSession.add(mKey);
            pushCloudDocument(mKey, { msgId: m.id, dataUrl: m.attachmentUrl }).catch(() => {});
          }
          return { ...m, attachmentUrl: `vault:msg_${m.id}` };
        }
        return m;
      });
      if (msgChanged) {
        nextTk = { ...nextTk, messages: cleanMsgs };
      }
    }
    return nextTk;
  });
}

/**
 * Fetches an individual payment proof receipt on-demand from `kft_proof_<id>` when Admin views it.
 */
export async function fetchPaymentProofFromCloudOnDemand(idOrVaultRef: string): Promise<string | null> {
  if (!idOrVaultRef || !isSupabaseConfigured()) return null;
  const cleanId = idOrVaultRef.startsWith('vault:') ? idOrVaultRef.slice(6) : idOrVaultRef;
  if (!cleanId) return null;
  const doc = await pullCloudDocument<{ dataUrl?: string }>(`${PROOF_RECORD_PREFIX}${cleanId}`, 8000);
  if (doc && typeof doc.dataUrl === 'string' && doc.dataUrl.startsWith('data:image/')) {
    return doc.dataUrl;
  }
  return null;
}

/**
 * Pulls existing cloud transactions first and merges with local transactions before pushing,
 * preventing a newly installed device from overwriting other users' verified/pending transactions.
 */
export async function mergeAndPushTransactionsToCloud(
  localTxns: RegistrationTransaction[]
): Promise<RegistrationTransaction[]> {
  const cleanLocalTxns = (Array.isArray(localTxns) ? localTxns : []).filter(
    (t) => t && t.id && !isDeprecatedDemoSeedTransaction(t)
  );
  if (!isSupabaseConfigured()) return cleanLocalTxns;
  try {
    const [cloudTxns, cloudDeletedTxnIds] = await Promise.all([
      pullCloudDocument<RegistrationTransaction[]>('kft_cloud_transactions_v1', 8000),
      pullCloudDocument<string[]>('kft_cloud_deleted_transactions_v1', 8000),
    ]);
    let localDeletedTxnIds: string[] = [];
    try {
      const rawDel = localStorage.getItem('kft_deleted_transactions_v1');
      if (rawDel) {
        const parsedDel = JSON.parse(rawDel);
        if (Array.isArray(parsedDel)) localDeletedTxnIds = parsedDel;
      }
    } catch {}
    const deletedSet = new Set<string>([
      ...localDeletedTxnIds,
      ...(Array.isArray(cloudDeletedTxnIds) ? cloudDeletedTxnIds : []),
    ]);

    const txnMap = new Map<string, RegistrationTransaction>();
    for (const ct of Array.isArray(cloudTxns) ? cloudTxns : []) {
      if (ct && ct.id && !deletedSet.has(ct.id) && !isDeprecatedDemoSeedTransaction(ct)) {
        txnMap.set(ct.id, ct);
      }
    }
    for (const lt of cleanLocalTxns) {
      if (!lt || !lt.id || deletedSet.has(lt.id) || isDeprecatedDemoSeedTransaction(lt)) continue;
      const existing = txnMap.get(lt.id);
      if (!existing) {
        txnMap.set(lt.id, lt);
      } else {
        // Keep 'verified' status if either record is verified unless explicitly rejected/failed more recently
        const localVerified = lt.status === 'verified';
        const cloudVerified = existing.status === 'verified';
        if (cloudVerified && !localVerified && lt.status === 'pending_verification') {
          txnMap.set(lt.id, { ...lt, ...existing, paymentProofUrl: lt.paymentProofUrl || existing.paymentProofUrl });
        } else {
          txnMap.set(lt.id, { ...existing, ...lt, paymentProofUrl: lt.paymentProofUrl || existing.paymentProofUrl });
        }
      }
    }
    const merged = Array.from(txnMap.values()).sort(
      (a, b) => (parseSafeDateMs(b.createdAt) || 0) - (parseSafeDateMs(a.createdAt) || 0)
    );
    await pushCloudDocument('kft_cloud_transactions_v1', merged);
    return merged;
  } catch {
    await pushCloudDocument('kft_cloud_transactions_v1', cleanLocalTxns);
    return cleanLocalTxns;
  }
}

/**
 * Pulls existing cloud support tickets first and merges with local tickets before pushing,
 * preventing a fresh device from overwriting existing tickets or approved VIP support replies.
 */
export async function mergeAndPushSupportTicketsToCloud(
  localTickets: SupportTicket[]
): Promise<SupportTicket[]> {
  if (!isSupabaseConfigured()) return localTickets;
  try {
    const cloudTickets = await pullCloudDocument<SupportTicket[]>('kft_cloud_support_tickets_v1', 8000);
    const ticketMap = new Map<string, SupportTicket>();
    for (const ct of Array.isArray(cloudTickets) ? cloudTickets : []) {
      if (ct && ct.id) ticketMap.set(ct.id, ct);
    }
    for (const lt of Array.isArray(localTickets) ? localTickets : []) {
      if (!lt || !lt.id) continue;
      const existing = ticketMap.get(lt.id);
      if (!existing) {
        ticketMap.set(lt.id, lt);
      } else {
        const msgMap = new Map<string, any>();
        for (const m of [...(existing.messages || []), ...(lt.messages || [])]) {
          if (m && m.id) msgMap.set(m.id, m);
        }
        ticketMap.set(lt.id, {
          ...existing,
          ...lt,
          vipApproved: Boolean(existing.vipApproved || lt.vipApproved),
          vipApprovedAt: lt.vipApprovedAt || existing.vipApprovedAt,
          messages: Array.from(msgMap.values()),
        });
      }
    }
    const merged = Array.from(ticketMap.values());
    await pushCloudDocument('kft_cloud_support_tickets_v1', merged);
    return merged;
  } catch {
    await pushCloudDocument('kft_cloud_support_tickets_v1', localTickets);
    return localTickets;
  }
}

/**
 * Push a shared key-value document to Supabase `kft_app_kv_store` table.
 * Using a unified JSONB table + structured columns makes Free Tier setup 1-click simple
 * and syncs Users, Transactions, Payment Proofs, and Smart-Cached Restaurants reliably.
 */
export async function pushCloudDocument(
  key: string,
  payload: any,
  timeoutMs = 12000,
  opts: CloudWriteOptions = {}
): Promise<boolean> {
  if (isAppCloneTampered()) {
    logIntegrityEvent('critical', 'clone_write_blocked', `Blocked cloud write for ${key} from unauthorized cloned/repackaged app`, { key });
    return false;
  }
  if (!isSupabaseConfigured()) return false;
  const cfg = getCloudApiConfig();
  if (!cfg.enableAutoCloudSync) return false;

  let effectivePayload = payload;
  if (key === 'kft_cloud_transactions_v1' && Array.isArray(payload)) {
    effectivePayload = sanitizeTransactionsForCloudPush(payload);
  } else if (key === 'kft_cloud_support_tickets_v1' && Array.isArray(payload)) {
    effectivePayload = sanitizeSupportTicketsForCloudPush(payload);
  }

  // ROOT-CAUSE GUARD #1: never let a device with an incomplete local list overwrite the central user list.
  if (isUserAggregateKey(key)) {
    const decision = evaluateAggregatePush({
      key,
      payload: effectivePayload,
      baselineCount: readServerAggregateCount(),
      allowDestructive: opts.allowDestructive,
    });
    if (!decision.allow) {
      if (decision.reason === 'shrink_blocked' || decision.reason === 'not_array') {
        logIntegrityEvent('critical', 'aggregate_push_blocked', `${key}: ${decision.detail}`, { key });
      }
      return decision.treatAsSuccess;
    }
  }

  // Egress reduction: inline base64 avatars are replaced by their cloud-hosted URL when one exists.
  if (key.startsWith(USER_RECORD_PREFIX) && effectivePayload && typeof effectivePayload === 'object') {
    effectivePayload = stripInlineAvatarWhenCloudHosted(effectivePayload);
  }

  const eligibleForFailover = isKeyEligibleForSecondaryFailover(key);
  const critical = isUserCriticalKey(key);

  // ROOT-CAUSE GUARD #2: durable outbox. A critical write that did not reach the PRIMARY database
  // (HTTP 402 quota, offline, timeout) is queued and retried until the primary accepts it.
  const finish = (primaryOk: boolean, ret: boolean, retryable = true): boolean => {
    if (critical) {
      if (primaryOk || !retryable) dropFromCloudOutbox(key);
      else enqueueCloudOutbox(key, effectivePayload);
    }
    if (primaryOk && isUserAggregateKey(key) && Array.isArray(effectivePayload)) {
      noteServerAggregateCount(effectivePayload.length);
    }
    return ret;
  };

  if (Date.now() < supabaseEgressCooldownUntilMs) {
    if (eligibleForFailover) {
      return finish(false, await pushToSecondaryCloudFailover(key, effectivePayload, timeoutMs));
    }
    return finish(false, false);
  }

  try {
    const res = await fetchWithTimeout(`${cfg.supabaseUrl}/rest/v1/kft_app_kv_store`, {
      method: 'POST',
      headers: {
        ...getSupabaseHeaders(false),
        ...(opts.allowDestructive ? { 'x-kft-allow-destructive': 'true' } : {}),
        ...adminTokenHeaders(key), // admin-only documents (settings / pricing / PIN) need the signed admin token
      },
      body: JSON.stringify({
        key,
        payload: effectivePayload,
        updated_at: new Date().toISOString(),
      }),
    }, timeoutMs);
    if (res.status === 402) {
      supabaseEgressCooldownUntilMs = Date.now() + 60_000;
      logIntegrityEvent('critical', 'primary_db_402', `Supabase primary rejected write for ${key} (HTTP 402 quota). Queued in outbox.`, { key });
      if (eligibleForFailover) {
        return finish(false, await pushToSecondaryCloudFailover(key, effectivePayload, timeoutMs));
      }
      return finish(false, false);
    }
    if (res.ok && supabaseEgressCooldownUntilMs > 0) {
      supabaseEgressCooldownUntilMs = 0;
    }
    if (!res.ok && eligibleForFailover) {
      pushToSecondaryCloudFailover(key, effectivePayload, timeoutMs).catch(() => {});
    }
    if (!res.ok && critical) {
      let bodyText = '';
      try {
        bodyText = (await res.text()).slice(0, 300);
      } catch {
        /* ignore */
      }
      const guardBlocked = res.status >= 400 && res.status < 500 && bodyText.includes('KFT_GUARD');
      logIntegrityEvent(guardBlocked ? 'critical' : 'warn', guardBlocked ? 'server_guard_blocked' : 'push_http_error', `${key} HTTP ${res.status} ${bodyText}`, { key, status: res.status });
      return finish(false, false, !guardBlocked && !(res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429));
    }
    return finish(res.ok, res.ok);
  } catch (err) {
    console.warn(`Supabase pushCloudDocument(${key}) error:`, err);
    if (eligibleForFailover) {
      return finish(false, await pushToSecondaryCloudFailover(key, effectivePayload, timeoutMs));
    }
    return finish(false, false);
  }
}

// ---------------------------------------------------------------------------------------------
// Durable cloud outbox (critical user/VIP writes survive 402 outages, offline mode and app restarts)
// ---------------------------------------------------------------------------------------------
const CLOUD_OUTBOX_KEY = 'kft_cloud_outbox_v1';
let cloudOutboxFlushInFlight = false;

function readCloudOutbox(): OutboxEntry[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CLOUD_OUTBOX_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.key === 'string') : [];
  } catch {
    return [];
  }
}

function writeCloudOutbox(queue: OutboxEntry[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (queue.length === 0) {
      localStorage.removeItem(CLOUD_OUTBOX_KEY);
      return;
    }
    localStorage.setItem(CLOUD_OUTBOX_KEY, JSON.stringify(queue));
  } catch {
    // Quota: keep only the lightweight per-user entries so accounts are never the thing that gets dropped.
    try {
      const slim = queue.filter((e) => e.key.startsWith(USER_RECORD_PREFIX)).slice(-150);
      localStorage.setItem(CLOUD_OUTBOX_KEY, JSON.stringify(slim));
    } catch {
      /* ignore */
    }
  }
}

function enqueueCloudOutbox(key: string, payload: unknown): void {
  try {
    // Whole-list aggregates can be megabytes; atomic rows are the source of truth so skip oversized ones.
    if (isUserAggregateKey(key) && JSON.stringify(payload).length > 400_000) return;
    const next = mergeOutboxEntry(
      readCloudOutbox(),
      { key, payload, queuedAt: new Date().toISOString(), attempts: 0 },
      300
    );
    writeCloudOutbox(next);
  } catch {
    /* ignore */
  }
}

function dropFromCloudOutbox(key: string): void {
  const q = readCloudOutbox();
  if (q.some((e) => e.key === key)) writeCloudOutbox(q.filter((e) => e.key !== key));
}

export function getCloudOutboxSize(): number {
  return readCloudOutbox().length;
}

/** Retry queued critical writes against the PRIMARY database. Safe to call often; no-ops when empty/offline. */
export async function flushCloudOutbox(maxEntries = 40): Promise<{ flushed: number; remaining: number }> {
  if (cloudOutboxFlushInFlight || !isSupabaseConfigured()) {
    return { flushed: 0, remaining: getCloudOutboxSize() };
  }
  const cfg = getCloudApiConfig();
  if (!cfg.enableAutoCloudSync || Date.now() < supabaseEgressCooldownUntilMs) {
    return { flushed: 0, remaining: getCloudOutboxSize() };
  }
  let queue = readCloudOutbox();
  if (queue.length === 0) return { flushed: 0, remaining: 0 };
  cloudOutboxFlushInFlight = true;
  let flushed = 0;
  try {
    for (const entry of queue.slice(0, maxEntries)) {
      if (isUserAggregateKey(entry.key)) {
        const decision = evaluateAggregatePush({
          key: entry.key,
          payload: entry.payload,
          baselineCount: readServerAggregateCount(),
        });
        if (!decision.allow) {
          queue = queue.filter((e) => e.key !== entry.key);
          continue;
        }
      }
      try {
        const res = await fetchWithTimeout(`${cfg.supabaseUrl}/rest/v1/kft_app_kv_store`, {
          method: 'POST',
          headers: getSupabaseHeaders(false),
          body: JSON.stringify({ key: entry.key, payload: entry.payload, updated_at: new Date().toISOString() }),
        }, 10000);
        if (res.status === 402) {
          supabaseEgressCooldownUntilMs = Date.now() + 60_000;
          break;
        }
        if (res.ok) {
          queue = queue.filter((e) => e.key !== entry.key);
          flushed++;
          if (isUserAggregateKey(entry.key) && Array.isArray(entry.payload)) noteServerAggregateCount(entry.payload.length);
        } else if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
          // Permanent rejection (e.g. server guard): do not retry forever.
          queue = queue.filter((e) => e.key !== entry.key);
          logIntegrityEvent('warn', 'outbox_rejected', `${entry.key} rejected with HTTP ${res.status}; dropped from outbox`, { key: entry.key });
        } else {
          queue = queue.map((e) => (e.key === entry.key ? { ...e, attempts: e.attempts + 1 } : e));
        }
      } catch {
        break; // offline / timeout: keep everything, try again next cycle
      }
    }
  } finally {
    writeCloudOutbox(queue);
    cloudOutboxFlushInFlight = false;
  }
  if (flushed > 0) {
    logIntegrityEvent('info', 'outbox_flushed', `Delivered ${flushed} queued write(s) to the primary database`, { flushed, remaining: queue.length });
  }
  return { flushed, remaining: queue.length };
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('online', () => {
    flushCloudOutbox().catch(() => {});
  });
}

/** Replace a huge inline `data:` avatar with its already-uploaded cloud URL (never drops the only copy). */
function stripInlineAvatarWhenCloudHosted(user: any): any {
  if (!user || typeof user !== 'object') return user;
  const av = typeof user.avatar === 'string' ? user.avatar : '';
  const cloud = typeof user.cloudAvatarUrl === 'string' ? user.cloudAvatarUrl : '';
  if (av.startsWith('data:') && av.length > 900 && cloud.startsWith('http')) {
    return { ...user, avatar: cloud };
  }
  return user;
}

/**
 * Pull a shared key-value document from Supabase `kft_app_kv_store` table.
 * Uses strict cache-busting so mobile WebViews and browsers never return stale cached payloads.
 */
export async function pullCloudDocument<T>(key: string, timeoutMs = 10000): Promise<T | null> {
  if (!isSupabaseConfigured()) return null;
  const cfg = getCloudApiConfig();
  const eligibleForFailover = isKeyEligibleForSecondaryFailover(key);

  // `cloudPullOkByKey` lets callers tell "server answered: document absent/empty" apart from
  // "server unreachable / quota-blocked" (both used to look like `null`, which caused destructive overwrites).
  const readFromSecondary = async (): Promise<T | null> => {
    cloudPullOkByKey.set(key, false);
    if (!eligibleForFailover) return null;
    const store = await pullAllFromSecondaryCloudFailover(false, timeoutMs);
    const entry = store?.get(key);
    return entry && entry.payload !== undefined ? (entry.payload as T) : null;
  };

  if (Date.now() < supabaseEgressCooldownUntilMs) {
    return readFromSecondary();
  }

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
    if (res.status === 402) {
      supabaseEgressCooldownUntilMs = Date.now() + 60_000;
      return readFromSecondary();
    }
    if (!res.ok) {
      return readFromSecondary();
    }
    if (supabaseEgressCooldownUntilMs > 0) {
      supabaseEgressCooldownUntilMs = 0;
    }
    cloudPullOkByKey.set(key, true);
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0 && rows[0].payload !== undefined) {
      const primaryPayload = rows[0].payload as T;
      const primaryUpdatedMs = rows[0].updated_at ? Date.parse(rows[0].updated_at) || 0 : 0;
      void primaryUpdatedMs;
      if (isUserAggregateKey(key) && Array.isArray(primaryPayload)) {
        noteServerAggregateCount((primaryPayload as unknown[]).length);
      }
      return primaryPayload;
    }
    return null;
  } catch (err) {
    console.warn(`Supabase pullCloudDocument(${key}) error:`, err);
    return readFromSecondary();
  }
}

/** true only when the PRIMARY database answered the last read of `key` (even if the document is absent). */
export function wasCloudPullOk(key: string): boolean {
  return cloudPullOkByKey.get(key) === true;
}

/** true only when the last paginated prefix pull completed every page against the PRIMARY database. */
export function wasPrefixPullComplete(prefix: string): boolean {
  return prefixPullCompleteByPrefix.get(prefix) === true;
}

const cloudPullOkByKey = new Map<string, boolean>();
const prefixPullCompleteByPrefix = new Map<string, boolean>();

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
  const cleanPin = (newPin || '').trim();
  if (!/^\d{6}$/.test(cleanPin)) return false;

  if (await isAdminServerAuthActive()) {
    const srv = await adminServerChangePin(cleanPin);
    if (srv.kind !== 'ok') {
      return false;
    }
    const hash = await hashAdminPin(cleanPin);
    try {
      localStorage.setItem(ADMIN_PIN_KV_KEY, hash);
    } catch {}
    pushCloudDocument(ADMIN_PIN_KV_KEY, {
      pinHash: hash,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
    return true;
  }

  const hash = await hashAdminPin(cleanPin);
  try {
    localStorage.setItem(ADMIN_PIN_KV_KEY, hash);
  } catch {}
  const pushed = await pushCloudDocument(ADMIN_PIN_KV_KEY, {
    pinHash: hash,
    updatedAt: new Date().toISOString(),
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
    typeof merged.includedFreeStoresPerVip === 'number' && merged.includedFreeStoresPerVip >= 0
      ? Math.round(merged.includedFreeStoresPerVip)
      : 0;

  const sanitizeMoney = (v: unknown, def: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : def;
  };
  const sanitizeDays = (v: unknown, def: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 ? Math.min(3650, Math.round(n)) : def;
  };

  const consumerVipEnabled = merged.consumerVipEnabled !== false;
  const consumerTrialDays = sanitizeDays(merged.consumerTrialDays, 7);
  const consumerTrialAiDailyLimit = sanitizeDays(merged.consumerTrialAiDailyLimit, 15);
  const consumerPaidAiDailyLimit = sanitizeDays(merged.consumerPaidAiDailyLimit, 80);
  const consumerPromo30dPriceUsd = sanitizeMoney(merged.consumerPromo30dPriceUsd, 0.99);
  const consumerPromo30dDays = sanitizeDays(merged.consumerPromo30dDays, 30);
  const consumer30dPriceUsd = sanitizeMoney(merged.consumer30dPriceUsd, 2.99);
  const consumer30dDays = sanitizeDays(merged.consumer30dDays, 30);
  const consumer90dPriceUsd = sanitizeMoney(merged.consumer90dPriceUsd, 6.99);
  const consumer90dDays = sanitizeDays(merged.consumer90dDays, 90);
  const consumer365dPriceUsd = sanitizeMoney(merged.consumer365dPriceUsd, 19.99);
  const consumer365dDays = sanitizeDays(merged.consumer365dDays, 365);

  const shopMonthlyPriceUsd = sanitizeMoney(merged.shopMonthlyPriceUsd, 6.99);
  const shopMonthlyDays = sanitizeDays(merged.shopMonthlyDays, 30);
  const shopYearlyPriceUsd = sanitizeMoney(merged.shopYearlyPriceUsd, 59.99);
  const shopYearlyDays = sanitizeDays(merged.shopYearlyDays, 365);
  const shopEarlyBirdEnabled = merged.shopEarlyBirdEnabled !== false;
  const shopEarlyBirdYearlyPriceUsd = sanitizeMoney(merged.shopEarlyBirdYearlyPriceUsd, 49.99);
  const shopEarlyBirdMaxShops = sanitizeDays(merged.shopEarlyBirdMaxShops, 50);
  const shopEarlyBirdClaimedCount = Math.max(0, Math.floor(Number(merged.shopEarlyBirdClaimedCount) || 0));
  const shopPayAfterApproval = merged.shopPayAfterApproval !== false;

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

  const currentCfg = getCloudApiConfig();
  const mergedGemini = (merged.geminiApiKey || '').trim();
  const mergedMaps = (merged.googleMapsApiKey || '').trim();
  const resolvedGeminiKey = mergedGemini || currentCfg.geminiApiKey || '';
  const resolvedMapsKey = mergedMaps || currentCfg.googleMapsApiKey || '';
  if (
    (mergedGemini && mergedGemini !== currentCfg.geminiApiKey) ||
    (mergedMaps && mergedMaps !== currentCfg.googleMapsApiKey)
  ) {
    try {
      saveCloudApiConfig({
        ...(mergedGemini ? { geminiApiKey: mergedGemini } : {}),
        ...(mergedMaps ? { googleMapsApiKey: mergedMaps } : {}),
      });
    } catch {
      // ignore storage errors
    }
  }

  return {
    ...merged,
    apkDownloadUrl: '',
    playStoreUrl: merged.playStoreUrl || 'https://play.google.com/store/apps/details?id=com.khmerfood.tourism',
    settingsVersion: Math.max(25, ver),
    supportAccountName: merged.supportAccountName || 'CHEA KIMSENG',
    geminiApiKey: resolvedGeminiKey,
    googleMapsApiKey: resolvedMapsKey,
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
    consumerVipEnabled,
    consumerTrialDays,
    consumerTrialAiDailyLimit,
    consumerPaidAiDailyLimit,
    consumerPromo30dPriceUsd,
    consumerPromo30dDays,
    consumer30dPriceUsd,
    consumer30dDays,
    consumer90dPriceUsd,
    consumer90dDays,
    consumer365dPriceUsd,
    consumer365dDays,
    shopMonthlyPriceUsd,
    shopMonthlyDays,
    shopYearlyPriceUsd,
    shopYearlyDays,
    shopEarlyBirdEnabled,
    shopEarlyBirdYearlyPriceUsd,
    shopEarlyBirdMaxShops,
    shopEarlyBirdClaimedCount,
    shopPayAfterApproval,
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
  if (!isSupabaseConfigured() || isSupabaseEgressCooldownActive()) {
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

  const normalized: AppSettings = normalizeAuthoritativeAppSettings({
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
  });

  // When the admin password is verified on the server, the (offline-crackable) hash must not be published in the
  // world-readable settings documents any more.
  let publicDoc: AppSettings = normalized;
  if (await isAdminServerAuthActive()) {
    const { adminPasswordHash: _omitHash, ...rest } = normalized as AppSettings & { adminPasswordHash?: string };
    publicDoc = rest as AppSettings;
  }
  const [pushedV2, pushedV1] = await Promise.all([
    pushCloudDocument('kft_cloud_admin_vip_pricing_v2', publicDoc, timeoutMs),
    pushCloudDocument('kft_cloud_app_settings_v1', publicDoc, timeoutMs),
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
  timeoutMs = 12000,
  opts: { sinceIso?: string } = {}
): Promise<Array<{ key: string; payload: T; updated_at?: string }>> {
  if (!isSupabaseConfigured()) return [];
  const cfg = getCloudApiConfig();
  // Personal-data prefixes (kft_user_/kft_avatar_/kft_proof_) are never mirrored to the public channel.
  const eligibleForFailover = isKeyEligibleForSecondaryFailover(prefix);
  const sinceMs = opts.sinceIso ? Date.parse(opts.sinceIso) || 0 : 0;

  const readPrefixFromSecondary = async (): Promise<Array<{ key: string; payload: T; updated_at?: string }>> => {
    prefixPullCompleteByPrefix.set(prefix, false);
    if (!eligibleForFailover) return [];
    const store = await pullAllFromSecondaryCloudFailover(false, timeoutMs);
    if (!store) return [];
    const out: Array<{ key: string; payload: T; updated_at?: string }> = [];
    for (const [k, v] of store.entries()) {
      if (k.startsWith(prefix) && v.payload !== undefined) {
        if (sinceMs > 0 && (Date.parse(v.updated_at || '') || 0) <= sinceMs) continue;
        out.push({ key: k, payload: v.payload as T, updated_at: v.updated_at });
      }
    }
    return out;
  };

  if (Date.now() < supabaseEgressCooldownUntilMs) {
    return readPrefixFromSecondary();
  }

  try {
    // ROOT-CAUSE FIX: this used to be a single request hard-capped at `limit=1000` with no ordering, so any
    // deployment above 1000 users silently saw (and then merged/pushed) only a random 1000. Now fully paginated.
    const primaryRows: Array<{ key: string; payload: T; updated_at?: string }> = [];
    let complete = true;
    const sinceQuery = opts.sinceIso ? `&updated_at=gt.${encodeURIComponent(opts.sinceIso)}` : '';
    for (let page = 0; page < MAX_PREFIX_PAGES; page++) {
      const offset = page * PREFIX_PAGE_SIZE;
      const res = await fetchWithTimeout(
        `${cfg.supabaseUrl}/rest/v1/kft_app_kv_store?key=like.${encodeURIComponent(prefix)}*${sinceQuery}&select=key,payload,updated_at&order=key.asc&limit=${PREFIX_PAGE_SIZE}&offset=${offset}`,
        {
          method: 'GET',
          headers: getSupabaseHeaders(false),
        },
        timeoutMs
      );
      if (res.status === 402) {
        supabaseEgressCooldownUntilMs = Date.now() + 60_000;
        if (page === 0) return readPrefixFromSecondary();
        complete = false;
        break;
      }
      if (!res.ok) {
        if (page === 0) return readPrefixFromSecondary();
        complete = false;
        break;
      }
      const rows = await res.json();
      const valid = Array.isArray(rows)
        ? rows.filter((r) => r && typeof r.key === 'string' && r.payload !== undefined)
        : [];
      primaryRows.push(...valid);
      if (!Array.isArray(rows) || rows.length < PREFIX_PAGE_SIZE) break;
      if (page === MAX_PREFIX_PAGES - 1) complete = false;
    }
    prefixPullCompleteByPrefix.set(prefix, complete);
    if (!complete) {
      logIntegrityEvent('warn', 'prefix_pull_incomplete', `Paginated pull of ${prefix}* stopped early after ${primaryRows.length} rows`, { prefix, rows: primaryRows.length });
    }
    if (eligibleForFailover) {
      const secRows = await readPrefixFromSecondary();
      prefixPullCompleteByPrefix.set(prefix, complete);
      if (secRows.length > 0) {
        const mergedMap = new Map<string, { key: string; payload: T; updated_at?: string }>();
        for (const r of primaryRows) mergedMap.set(r.key, r);
        for (const s of secRows) {
          const ex = mergedMap.get(s.key);
          const exMs = ex?.updated_at ? Date.parse(ex.updated_at) || 0 : 0;
          const sMs = s.updated_at ? Date.parse(s.updated_at) || 0 : 0;
          if (!ex) {
            mergedMap.set(s.key, s);
          } else if (s.key.startsWith('kft_user_')) {
            const mergedUser = deduplicateAndNormalizeUsers(
              sMs >= exMs ? [ex.payload as any, s.payload as any] : [s.payload as any, ex.payload as any],
              []
            );
            mergedMap.set(s.key, {
              key: s.key,
              payload: (mergedUser[0] || (sMs >= exMs ? s.payload : ex.payload)) as unknown as T,
              updated_at: sMs >= exMs ? s.updated_at : ex.updated_at,
            });
          } else if (sMs >= exMs) {
            mergedMap.set(s.key, s);
          }
        }
        return Array.from(mergedMap.values());
      }
    }
    return primaryRows;
  } catch (err) {
    console.warn(`Supabase pullCloudDocumentsByPrefix(${prefix}) error:`, err);
    return readPrefixFromSecondary();
  }
}

/**
 * Cheap server-side user counts (HTTP `Prefer: count=exact`, zero rows downloaded) for integrity checks.
 */
export async function fetchServerUserCounts(
  timeoutMs = 8000
): Promise<{ ok: boolean; status: number; total: number; vipActive: number; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, status: 0, total: 0, vipActive: 0, error: 'Supabase not configured' };
  const cfg = getCloudApiConfig();
  const count = async (extra: string): Promise<{ ok: boolean; status: number; n: number; err?: string }> => {
    try {
      const res = await fetchWithTimeout(
        `${cfg.supabaseUrl}/rest/v1/kft_app_kv_store?select=key&key=like.${encodeURIComponent(USER_RECORD_PREFIX)}*&payload-%3E%3Erole=neq.admin${extra}&limit=1`,
        {
          method: 'GET',
          headers: { ...getSupabaseHeaders(false), Prefer: 'count=exact', Range: '0-0', 'Range-Unit': 'items' },
        },
        timeoutMs
      );
      if (res.status === 402) {
        supabaseEgressCooldownUntilMs = Date.now() + 60_000;
        return { ok: false, status: 402, n: 0, err: 'HTTP 402 exceed_egress_quota (primary database restricted)' };
      }
      if (!res.ok && res.status !== 206) return { ok: false, status: res.status, n: 0, err: `HTTP ${res.status}` };
      const range = res.headers.get('content-range') || '';
      const total = Number(range.split('/')[1]);
      return { ok: true, status: res.status, n: Number.isFinite(total) ? total : 0 };
    } catch (e: any) {
      return { ok: false, status: 0, n: 0, err: e?.message || 'network error' };
    }
  };
  const all = await count('');
  if (!all.ok) return { ok: false, status: all.status, total: 0, vipActive: 0, error: all.err };
  const vip = await count('&payload-%3E%3EmembershipTier=eq.premium_vip&payload-%3E%3EsubscriptionStatus=eq.active');
  return { ok: true, status: all.status, total: all.n, vipActive: vip.ok ? vip.n : 0 };
}

/**
 * Lightweight manifest fetch of all keys and `updated_at` timestamps matching a prefix (e.g. `kft_ov_`)
 * without downloading multi-megabyte base64 payloads at once.
 */
export async function pullCloudKeysManifestByPrefix(
  prefix: string,
  timeoutMs = 8000
): Promise<Array<{ key: string; updated_at: string }> | null> {
  if (!isSupabaseConfigured()) return null;
  if (Date.now() < supabaseEgressCooldownUntilMs) return null;
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
    if (res.status === 402) {
      supabaseEgressCooldownUntilMs = Date.now() + 60_000;
      return null;
    }
    if (!res.ok) return null;
    if (supabaseEgressCooldownUntilMs > 0) {
      supabaseEgressCooldownUntilMs = 0;
    }
    const rows = await res.json();
    if (Array.isArray(rows)) {
      return rows.filter(r => r && typeof r.key === 'string');
    }
    return [];
  } catch (err) {
    console.warn(`Supabase pullCloudKeysManifestByPrefix(${prefix}) error:`, err);
    return null;
  }
}

/**
 * Fetch specific keys in a single compact PostgREST batch (`key=in.(...)`) so large base64 images never time out
 * and HTTP overhead/egress is minimized.
 */
export async function pullCloudDocumentsByKeys<T = any>(
  keys: string[],
  timeoutMs = 15000
): Promise<Array<{ key: string; payload: T; updated_at?: string }>> {
  if (!isSupabaseConfigured() || !Array.isArray(keys) || keys.length === 0) return [];
  const cfg = getCloudApiConfig();

  const cleanKeys = Array.from(new Set(keys.filter(Boolean)));
  if (cleanKeys.length === 0) return [];

  const readKeysFromSecondary = async (): Promise<Array<{ key: string; payload: T; updated_at?: string }>> => {
    const eligibleKeys = cleanKeys.filter(isKeyEligibleForSecondaryFailover);
    if (eligibleKeys.length === 0) return [];
    const store = await pullAllFromSecondaryCloudFailover(false, timeoutMs);
    if (!store) return [];
    const out: Array<{ key: string; payload: T; updated_at?: string }> = [];
    for (const k of eligibleKeys) {
      const entry = store.get(k);
      if (entry && entry.payload !== undefined) {
        out.push({ key: k, payload: entry.payload as T, updated_at: entry.updated_at });
      }
    }
    return out;
  };

  if (Date.now() < supabaseEgressCooldownUntilMs) {
    return readKeysFromSecondary();
  }

  try {
    const inList = cleanKeys.map(k => `"${k.replace(/"/g, '')}"`).join(',');
    const res = await fetchWithTimeout(
      `${cfg.supabaseUrl}/rest/v1/kft_app_kv_store?key=in.(${encodeURIComponent(inList)})&select=key,payload,updated_at`,
      {
        method: 'GET',
        headers: getSupabaseHeaders(false),
        cache: 'no-store',
      },
      timeoutMs
    );
    if (res.status === 402) {
      supabaseEgressCooldownUntilMs = Date.now() + 60_000;
      return readKeysFromSecondary();
    }
    if (res.ok) {
      if (supabaseEgressCooldownUntilMs > 0) {
        supabaseEgressCooldownUntilMs = 0;
      }
      const rows = await res.json();
      if (Array.isArray(rows)) {
        const primaryRows = rows.filter(
          (r): r is { key: string; payload: T; updated_at?: string } =>
            Boolean(r && typeof r.key === 'string' && r.payload !== undefined)
        );
        const secRows = await readKeysFromSecondary();
        if (secRows.length > 0) {
          const mergedMap = new Map<string, { key: string; payload: T; updated_at?: string }>();
          for (const r of primaryRows) mergedMap.set(r.key, r);
          for (const s of secRows) {
            const ex = mergedMap.get(s.key);
            const exMs = ex?.updated_at ? Date.parse(ex.updated_at) || 0 : 0;
            const sMs = s.updated_at ? Date.parse(s.updated_at) || 0 : 0;
            if (!ex) {
              mergedMap.set(s.key, s);
            } else if (s.key.startsWith('kft_user_')) {
              const mergedUser = deduplicateAndNormalizeUsers(
                sMs >= exMs ? [ex.payload as any, s.payload as any] : [s.payload as any, ex.payload as any],
                []
              );
              mergedMap.set(s.key, {
                key: s.key,
                payload: (mergedUser[0] || (sMs >= exMs ? s.payload : ex.payload)) as unknown as T,
                updated_at: sMs >= exMs ? s.updated_at : ex.updated_at,
              });
            } else if (sMs >= exMs) {
              mergedMap.set(s.key, s);
            }
          }
          return Array.from(mergedMap.values());
        }
        if (primaryRows.length > 0) return primaryRows;
      }
    }
    return readKeysFromSecondary();
  } catch (err) {
    console.warn('Supabase pullCloudDocumentsByKeys error:', err);
    return readKeysFromSecondary();
  }
}

let storageBucketAvailabilityState: 'unknown' | 'available' | 'unavailable' = 'unknown';
let lastStorageBucketCheckProjectUrl = '';

/**
 * Attempt to upload a base64 `data:image/...` directly to Supabase Cloud Storage (`food-media` public bucket)
 * and return its permanent CDN public URL (`https://<project>.supabase.co/storage/v1/object/public/food-media/...`).
 * Uses standard `Blob` binary payloads for 100% Android Capacitor WebView + mobile Safari/Chrome compatibility,
 * immutable revisioned object paths so WebView/CDN cache never serves stale bytes, and automatic retry.
 * Returns `null` cleanly if Supabase Storage bucket is not provisioned or offline so KV fallback handles it seamlessly.
 */
export async function uploadBase64ImageToSupabaseStorage(
  folder: 'foods' | 'restaurants' | 'destinations' | 'trending' | 'avatars',
  recordId: string,
  dataUrl: string,
  timeoutMs = 20000,
  revision?: number
): Promise<string | null> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return null;
  }
  if ((folder === 'foods' || folder === 'trending') && !isUrlWatermarkedAtPixelLevel(dataUrl)) {
    try {
      const wmRes = await applyFoodWatermarkOnce(dataUrl, { maxWidth: 2400, maxHeight: 2400, quality: 0.94 });
      dataUrl = wmRes.dataUrl;
    } catch {
      // Keep original dataUrl if canvas is unavailable in test runner
    }
  }
  const cfg = getCloudApiConfig();
  if (!cfg.enableAutoCloudSync) return null;

  const fallbackToPermanentCloudCdn = async (): Promise<string | null> => {
    try {
      const mappedFolder = folder === 'restaurants' ? 'shops' : folder;
      const uploaded = await uploadImageToPermanentCloud(dataUrl, mappedFolder, recordId);
      if (uploaded && uploaded.url && uploaded.url.startsWith('https://')) {
        return uploaded.url;
      }
    } catch {
      // Ignore
    }
    return null;
  };

  if (!isSupabaseConfigured() || Date.now() < supabaseEgressCooldownUntilMs) {
    return fallbackToPermanentCloudCdn();
  }

  if (lastStorageBucketCheckProjectUrl !== cfg.supabaseUrl) {
    lastStorageBucketCheckProjectUrl = cfg.supabaseUrl;
    storageBucketAvailabilityState = 'unknown';
  }
  if (storageBucketAvailabilityState === 'unavailable') {
    return fallbackToPermanentCloudCdn();
  }

  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx < 0) return null;
    const header = dataUrl.slice(0, commaIdx);
    const b64 = dataUrl.slice(commaIdx + 1);
    const mimeMatch = header.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64$/i);
    const mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : 'image/jpeg';
    const ext = mimeType.includes('webp') ? 'webp' : mimeType.includes('png') ? 'png' : 'jpg';

    let bytes: Uint8Array;
    if (typeof atob === 'function') {
      const bin = atob(b64);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
    } else if (typeof (globalThis as any).Buffer !== 'undefined') {
      bytes = new Uint8Array((globalThis as any).Buffer.from(b64, 'base64'));
    } else {
      return fallbackToPermanentCloudCdn();
    }

    const blobBody: BodyInit =
      typeof Blob !== 'undefined'
        ? new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], {
            type: mimeType,
          })
        : (bytes as unknown as BodyInit);

    const safeId = recordId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const revTag = typeof revision === 'number' && revision > 0 ? `_rev${revision}` : '';
    const randSuffix = Math.random().toString(36).slice(2, 6);
    const objectPath = `${folder}/${safeId}${revTag}_${Date.now()}_${randSuffix}.${ext}`;
    const bucketName = 'food-media';
    const uploadUrl = `${cfg.supabaseUrl}/storage/v1/object/${bucketName}/${objectPath}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetchWithTimeout(
          uploadUrl,
          {
            method: 'POST',
            headers: {
              apikey: cfg.supabaseAnonKey,
              Authorization: `Bearer ${cfg.supabaseAnonKey}`,
              'Content-Type': mimeType,
              'x-upsert': 'true',
              'Cache-Control': '31536000',
            },
            body: blobBody,
          },
          timeoutMs
        );

        if (res.ok) {
          storageBucketAvailabilityState = 'available';
          if (supabaseEgressCooldownUntilMs > 0) {
            supabaseEgressCooldownUntilMs = 0;
          }
          return `${cfg.supabaseUrl}/storage/v1/object/public/${bucketName}/${objectPath}`;
        }

        if (res.status === 402) {
          supabaseEgressCooldownUntilMs = Date.now() + 30_000;
          return fallbackToPermanentCloudCdn();
        }

        if (res.status === 404 || res.status === 400) {
          const errText = await res.text().catch(() => '');
          if (/bucket not found/i.test(errText)) {
            storageBucketAvailabilityState = 'unavailable';
            return fallbackToPermanentCloudCdn();
          }
        }
      } catch {
        // Retry once on mobile network hiccup
      }
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 900));
      }
    }
    return fallbackToPermanentCloudCdn();
  } catch {
    return fallbackToPermanentCloudCdn();
  }
}

/**
 * Delete a specific key from Supabase `kft_app_kv_store`.
 */
export async function deleteCloudDocument(key: string, timeoutMs = 8000, opts: CloudWriteOptions = {}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const cfg = getCloudApiConfig();
  if (!cfg.enableAutoCloudSync) return false;

  const eligibleForFailover = isKeyEligibleForSecondaryFailover(key);
  if (Date.now() < supabaseEgressCooldownUntilMs) {
    if (eligibleForFailover) {
      deleteFromSecondaryCloudFailover(key, timeoutMs).catch(() => {});
    }
    return eligibleForFailover;
  }

  if (false) {
    return eligibleForFailover;
  }

  try {
    const res = await fetchWithTimeout(
      `${cfg.supabaseUrl}/rest/v1/kft_app_kv_store?key=eq.${encodeURIComponent(key)}`,
      {
        method: 'DELETE',
        headers: {
          ...getSupabaseHeaders(false),
          ...(opts.allowDestructive ? { 'x-kft-allow-destructive': 'true' } : {}),
          ...adminTokenHeaders(key),
        },
      },
      timeoutMs
    );
    if (res.status === 402) {
      supabaseEgressCooldownUntilMs = Date.now() + 60_000;
      return eligibleForFailover;
    }
    return res.ok || eligibleForFailover;
  } catch (err) {
    console.warn(`Supabase deleteCloudDocument(${key}) error:`, err);
    return eligibleForFailover;
  }
}

export const USER_RECORD_PREFIX = 'kft_user_';

/**
 * Determine a deterministic canonical User ID so the same person (across Android APK, Web OAuth,
 * or Email/Phone sign-in) always maps to a single unified account without creating duplicates.
 */

// Short-lived cache (15s) for authoritative backend VIP verification so rapid UI taps do not spam Supabase
const backendVipVerifyCache = new Map<string, { expiresAt: number; isVip: boolean; verifiedUser: User | null }>();

export function clearBackendVipVerifyCache(user?: Partial<User> | null): void {
  if (!user) {
    backendVipVerifyCache.clear();
    lastPushedAtomicUserSigMap.clear();
    return;
  }
  const canonicalId = getCanonicalUserId(user);
  backendVipVerifyCache.delete(canonicalId);
  if (user.id) backendVipVerifyCache.delete(user.id);
  for (const k of getCandidateAtomicUserKeys(user)) {
    lastPushedAtomicUserSigMap.delete(k);
  }
}

/**
 * Authoritative Backend VIP Verification:
 * Verifies a user's active VIP membership status against Supabase Cloud (`kft_user_<canonicalId>`,
 * `kft_cloud_vip_backup_v1`, and `kft_cloud_users_v2`) rather than trusting frontend localStorage state alone.
 */
export async function verifyUserVipStatusFromBackend(
  user?: User | null,
  forceRefresh = false
): Promise<{ isVip: boolean; verifiedUser: User | null; source: 'admin' | 'supabase_cloud' | 'local_fallback' }> {
  if (!user || !user.id) {
    return { isVip: false, verifiedUser: null, source: 'supabase_cloud' };
  }
  if (
    user.role === 'admin' ||
    user.id === 'admin-authorized-single' ||
    user.username === 'admin' ||
    user.username === 'cheasavuth'
  ) {
    return { isVip: true, verifiedUser: user, source: 'admin' };
  }

  const canonicalId = getCanonicalUserId(user);
  if (!forceRefresh) {
    const cached = backendVipVerifyCache.get(canonicalId);
    if (cached && cached.expiresAt > Date.now()) {
      return { isVip: cached.isVip, verifiedUser: cached.verifiedUser, source: 'supabase_cloud' };
    }
  }

  const localNormalized = normalizeVipExpiryOnUser(user);
  const localHasVip = Boolean(
    localNormalized.membershipTier === 'premium_vip' &&
      localNormalized.subscriptionStatus === 'active' &&
      localNormalized.paymentStatus !== 'cancelled' &&
      !localNormalized.vipCancelledAt
  );

  if (!isSupabaseConfigured()) {
    return { isVip: localHasVip, verifiedUser: localNormalized, source: 'local_fallback' };
  }

  try {
    const candidateKeys = getCandidateAtomicUserKeys(user);
    const atomicRows = candidateKeys.length > 0 ? await pullCloudDocumentsByKeys<User>(candidateKeys, 4500) : [];
    let serverUser: User | null = null;

    for (const row of atomicRows) {
      const doc = row?.payload;
      if (doc && typeof doc === 'object' && doc.id) {
        serverUser = serverUser ? mergeTwoUserRecordsCanonical(serverUser, doc) : normalizeVipExpiryOnUser(doc);
      }
    }

    const isServerExplicitlyCancelled = Boolean(
      serverUser &&
        (serverUser.subscriptionStatus === 'cancelled' ||
          serverUser.paymentStatus === 'cancelled' ||
          (Boolean(serverUser.vipCancelledAt) && serverUser.subscriptionStatus !== 'active'))
    );

    // Also check cloud VIP backup registry ONLY if atomic record was not explicitly cancelled and not yet marked VIP
    if (!isServerExplicitlyCancelled && (!serverUser || serverUser.membershipTier !== 'premium_vip')) {
      const vipBackup = await pullCloudDocument<any>('kft_cloud_vip_backup_v1', 4500);
      const emailLower = (user.email || '').trim().toLowerCase();
      if (Array.isArray(vipBackup)) {
        const match = vipBackup.find(
          (v: any) =>
            v &&
            (getCanonicalUserId(v) === canonicalId ||
              (emailLower && String(v.email || '').trim().toLowerCase() === emailLower))
        );
        if (match) {
          const normMatch = normalizeVipExpiryOnUser({ ...user, ...match });
          serverUser = serverUser ? mergeTwoUserRecordsCanonical(serverUser, normMatch) : normMatch;
        }
      } else if (vipBackup && typeof vipBackup === 'object') {
        for (const [k, val] of Object.entries(vipBackup)) {
          const vObj = val as any;
          if (
            k === canonicalId ||
            (emailLower && k.toLowerCase() === emailLower) ||
            (vObj && getCanonicalUserId(vObj) === canonicalId)
          ) {
            const normMatch = normalizeVipExpiryOnUser({ ...user, ...vObj });
            serverUser = serverUser ? mergeTwoUserRecordsCanonical(serverUser, normMatch) : normMatch;
          }
        }
      }
    }

    if (serverUser) {
      let finalNorm = normalizeVipExpiryOnUser(serverUser);
      const expMs = finalNorm.subscriptionExpiryDate ? Date.parse(finalNorm.subscriptionExpiryDate) : 0;
      let isServerVip = Boolean(
        finalNorm.membershipTier === 'premium_vip' &&
          finalNorm.subscriptionStatus === 'active' &&
          !finalNorm.vipCancelledAt &&
          (!expMs || expMs > Date.now())
      );

      // Self-heal check: if local device has active VIP and cloud transaction ledger (kft_cloud_transactions_v1)
      // has a verified, non-expired VIP upgrade for this user (newer than any old cancellation), honor it.
      if (!isServerVip && localHasVip) {
        try {
          const cloudTxns = await pullCloudDocument<RegistrationTransaction[]>('kft_cloud_transactions_v1', 3500);
          if (Array.isArray(cloudTxns)) {
            const emailLower = (user.email || '').trim().toLowerCase();
            const cancelMs = finalNorm.vipCancelledAt ? Date.parse(finalNorm.vipCancelledAt) : 0;
            const matchingVerifiedTxn = cloudTxns.find((t) => {
              if (!t || t.status !== 'verified' || t.type === 'restaurant_registration') return false;
              const tExpMs = t.expiresAt ? Date.parse(t.expiresAt) : 0;
              if (!tExpMs || tExpMs <= Date.now()) return false;
              if (t.rejectionReason && cancelMs > 0) return false;
              const tUserMatch =
                (t.userId && getCanonicalUserId({ id: t.userId, email: t.userEmail }) === canonicalId) ||
                (emailLower && String(t.userEmail || '').trim().toLowerCase() === emailLower);
              return Boolean(tUserMatch);
            });
            if (matchingVerifiedTxn) {
              finalNorm = normalizeVipExpiryOnUser({
                ...finalNorm,
                ...localNormalized,
                membershipTier: 'premium_vip',
                subscriptionStatus: 'active',
                vipStatus: 'active',
                paymentStatus: 'verified',
                subscriptionExpiryDate: matchingVerifiedTxn.expiresAt || localNormalized.subscriptionExpiryDate,
                vipExpiresAt: matchingVerifiedTxn.expiresAt || localNormalized.subscriptionExpiryDate,
                vipCancelledAt: undefined,
              });
              isServerVip = true;
            }
          }
        } catch {}
      }

      backendVipVerifyCache.set(canonicalId, {
        expiresAt: Date.now() + 15000,
        isVip: isServerVip,
        verifiedUser: finalNorm,
      });
      return { isVip: isServerVip, verifiedUser: finalNorm, source: 'supabase_cloud' };
    }

    // User does not exist in cloud VIP records -> reject any unverified frontend VIP claim
    backendVipVerifyCache.set(canonicalId, {
      expiresAt: Date.now() + 10000,
      isVip: false,
      verifiedUser: null,
    });
    return { isVip: false, verifiedUser: null, source: 'supabase_cloud' };
  } catch {
    // Offline / transient network timeout fallback
    return { isVip: localHasVip, verifiedUser: localNormalized, source: 'local_fallback' };
  }
}

export function getCanonicalUserId(u: Partial<User>): string {
  const rawId = String(u.id || '').trim();
  const cleanEmail = String(u.email || '').trim().toLowerCase();
  const cleanPhone = getCanonicalPhoneDigits(u.phone) || String(u.phone || '').replace(/[\s-+()]/g, '');

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

/**
 * Returns all candidate `kft_user_<id>` atomic keys that might store a user's cloud record
 * (covering canonical ID, raw ID, legacyIds, and email/phone provider variants).
 */
export function getCandidateAtomicUserKeys(u?: Partial<User> | null): string[] {
  if (!u) return [];
  const keys = new Set<string>();
  const canonicalId = getCanonicalUserId(u);
  if (canonicalId) keys.add(`${USER_RECORD_PREFIX}${canonicalId}`);
  const rawId = String(u.id || '').trim();
  if (rawId) keys.add(`${USER_RECORD_PREFIX}${rawId}`);
  if (Array.isArray(u.legacyIds)) {
    for (const lid of u.legacyIds) {
      if (lid) keys.add(`${USER_RECORD_PREFIX}${lid}`);
    }
  }
  const cleanEmail = String(u.email || '').trim().toLowerCase();
  if (cleanEmail && cleanEmail.includes('@')) {
    const slug = cleanEmail.replace(/[^a-z0-9]/g, '_');
    keys.add(`${USER_RECORD_PREFIX}user-${slug}`);
    keys.add(`${USER_RECORD_PREFIX}google-${slug}`);
    keys.add(`${USER_RECORD_PREFIX}owner-${slug}`);
  }
  const rawPhoneDigits = String(u.phone || '').replace(/[\s-+()]/g, '');
  const canonPhoneDigits = getCanonicalPhoneDigits(u.phone);
  if (canonPhoneDigits && canonPhoneDigits.length >= 8) {
    keys.add(`${USER_RECORD_PREFIX}user-phone-${canonPhoneDigits}`);
    keys.add(`${USER_RECORD_PREFIX}user-phone_${canonPhoneDigits}_phone_kh`);
  }
  if (rawPhoneDigits.length >= 7) {
    keys.add(`${USER_RECORD_PREFIX}user-phone-${rawPhoneDigits}`);
  }
  return Array.from(keys);
}

export function normalizeVipExpiryOnUser(rawUser: User): User {
  const isAdmin =
    rawUser.role === 'admin' ||
    rawUser.id === 'admin-authorized-single' ||
    rawUser.username === 'admin' ||
    rawUser.username === 'cheasavuth';
  if (isAdmin) return rawUser;
  if (
    rawUser.subscriptionStatus === 'cancelled' ||
    rawUser.paymentStatus === 'cancelled' ||
    (Boolean(rawUser.vipCancelledAt) && rawUser.subscriptionStatus !== 'active')
  ) {
    return {
      ...rawUser,
      membershipTier: 'free',
      subscriptionStatus: 'cancelled',
      paymentStatus: 'cancelled',
      vipStatus: 'none',
      subscriptionExpiryDate: undefined,
      vipExpiresAt: undefined,
      freeTrialActivated: false,
      freeTrialExpiresAt: undefined,
      autoRenew: false,
    };
  }
  const u = sanitizeUserVipPlanAndExpiry(rawUser);
  const nowServerMs = getAuthoritativeServerNowMs();
  const rawExp = u.subscriptionExpiryDate || (u as any).vipExpiresAt || (u.freeTrialActivated ? u.freeTrialExpiresAt : undefined);
  if (rawExp) {
    const expMs = parseSafeDateMs(rawExp);
    if (expMs > 0 && expMs <= nowServerMs) {
      if (u.membershipTier === 'premium_vip' || u.subscriptionStatus === 'active') {
        return {
          ...u,
          membershipTier: 'free',
          subscriptionStatus: 'expired',
        };
      }
    } else if (
      expMs > nowServerMs &&
      u.subscriptionStatus !== 'cancelled' &&
      u.subscriptionStatus !== 'expired' &&
      u.paymentStatus !== 'cancelled' &&
      u.paymentStatus !== 'rejected' &&
      (u.membershipTier === 'premium_vip' ||
        u.subscriptionStatus === 'active' ||
        (u as any).vipStatus === 'active' ||
        u.freeTrialActivated)
    ) {
      const cleanExpIso = new Date(expMs).toISOString();
      const planDays = resolveUserActualVipPlanDays(u);
      if (
        u.membershipTier !== 'premium_vip' ||
        u.subscriptionStatus !== 'active' ||
        u.paymentStatus !== 'verified' ||
        u.subscriptionExpiryDate !== cleanExpIso ||
        u.vipPlanDays !== planDays ||
        Boolean(u.vipCancelledAt)
      ) {
        return {
          ...u,
          membershipTier: 'premium_vip',
          subscriptionStatus: 'active',
          paymentStatus: 'verified',
          subscriptionExpiryDate: cleanExpIso,
          vipStatus: 'active',
          vipPlanDays: planDays,
          vipExpiresAt: cleanExpIso,
          vipCancelledAt: undefined,
        };
      }
    }
  } else if (
    (u.membershipTier === 'premium_vip' || u.subscriptionStatus === 'active' || (u as any).vipStatus === 'active') &&
    u.subscriptionStatus !== 'cancelled' &&
    u.subscriptionStatus !== 'expired' &&
    u.paymentStatus !== 'cancelled' &&
    u.paymentStatus !== 'rejected'
  ) {
    // Legacy active VIP record without explicit subscriptionExpiryDate: infer plan window from start/verification date instead of stripping VIP
    const baseMs =
      parseSafeDateMs(u.subscriptionStartDate || u.verifiedAt || u.lastLoginAt || u.registeredAtIso || u.createdAt) ||
      Date.now();
    const planDays = resolveUserActualVipPlanDays(u);
    const inferredExpMs = baseMs + planDays * 24 * 60 * 60 * 1000;
    if (inferredExpMs > Date.now()) {
      const inferredIso = new Date(inferredExpMs).toISOString();
      return {
        ...u,
        membershipTier: 'premium_vip',
        subscriptionStatus: 'active',
        paymentStatus: 'verified',
        subscriptionStartDate: u.subscriptionStartDate || new Date(baseMs).toISOString(),
        subscriptionExpiryDate: inferredIso,
        vipStatus: 'active',
        vipPlanDays: planDays,
        vipExpiresAt: inferredIso,
        vipCancelledAt: undefined,
      };
    }
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
  const parseValidMs = (d?: string): number => parseSafeDateMs(d);
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

  const isCustomAvatar = (av?: string) => isCustomUploadedAvatarDataUrl(av);
  const isValidNonStockAvatar = (av?: string) =>
    Boolean(
      av &&
        !av.includes('photo-1535713875002') &&
        !av.includes('photo-1534528741775') &&
        !av.includes('photo-1507003211169') &&
        !av.includes('photo-1517841905240')
    );

  const firstHasCustomAvatar = isCustomAvatar(first.avatar) || isCustomAvatar(first.cloudAvatarUrl);
  const secondHasCustomAvatar = isCustomAvatar(second.avatar) || isCustomAvatar(second.cloudAvatarUrl);
  const firstAvatarMs = parseValidMs(first.avatarUpdatedAt);
  const secondAvatarMs = parseValidMs(second.avatarUpdatedAt);

  let chosenAvatar = '';
  let chosenCloudAvatarUrl = second.cloudAvatarUrl || first.cloudAvatarUrl;
  let chosenAvatarUpdatedAt = second.avatarUpdatedAt || first.avatarUpdatedAt;

  if (firstHasCustomAvatar && secondHasCustomAvatar) {
    if (firstAvatarMs > 0 && secondAvatarMs > 0 && firstAvatarMs > secondAvatarMs) {
      chosenAvatar = isCustomAvatar(first.avatar) ? first.avatar! : first.cloudAvatarUrl!;
      chosenCloudAvatarUrl = first.cloudAvatarUrl || second.cloudAvatarUrl;
      chosenAvatarUpdatedAt = first.avatarUpdatedAt;
    } else if (secondAvatarMs > 0 && firstAvatarMs === 0) {
      chosenAvatar = isCustomAvatar(second.avatar) ? second.avatar! : second.cloudAvatarUrl!;
      chosenCloudAvatarUrl = second.cloudAvatarUrl || first.cloudAvatarUrl;
      chosenAvatarUpdatedAt = second.avatarUpdatedAt;
    } else if (firstAvatarMs > 0 && secondAvatarMs === 0) {
      chosenAvatar = isCustomAvatar(first.avatar) ? first.avatar! : first.cloudAvatarUrl!;
      chosenCloudAvatarUrl = first.cloudAvatarUrl || second.cloudAvatarUrl;
      chosenAvatarUpdatedAt = first.avatarUpdatedAt;
    } else {
      // Equal or no timestamps: prefer full data:image/ if one side is a remote URL and the other is data:image/, otherwise prefer second
      chosenAvatar = isCustomAvatar(second.avatar) ? second.avatar! : isCustomAvatar(first.avatar) ? first.avatar! : (second.cloudAvatarUrl || first.cloudAvatarUrl || '');
      chosenCloudAvatarUrl = second.cloudAvatarUrl || first.cloudAvatarUrl;
      chosenAvatarUpdatedAt = second.avatarUpdatedAt || first.avatarUpdatedAt;
    }
  } else if (secondHasCustomAvatar) {
    chosenAvatar = isCustomAvatar(second.avatar) ? second.avatar! : second.cloudAvatarUrl!;
    chosenCloudAvatarUrl = second.cloudAvatarUrl || (second.avatar?.startsWith('http') ? second.avatar : first.cloudAvatarUrl);
    chosenAvatarUpdatedAt = second.avatarUpdatedAt || first.avatarUpdatedAt;
  } else if (firstHasCustomAvatar) {
    chosenAvatar = isCustomAvatar(first.avatar) ? first.avatar! : first.cloudAvatarUrl!;
    chosenCloudAvatarUrl = first.cloudAvatarUrl || (first.avatar?.startsWith('http') ? first.avatar : second.cloudAvatarUrl);
    chosenAvatarUpdatedAt = first.avatarUpdatedAt || second.avatarUpdatedAt;
  } else {
    const cachedAvatar = getCachedUserAvatarForAccount(second) || getCachedUserAvatarForAccount(first);
    if (cachedAvatar && isCustomAvatar(cachedAvatar)) {
      chosenAvatar = cachedAvatar;
    } else if (isValidNonStockAvatar(second.avatar)) {
      chosenAvatar = second.avatar!;
    } else if (isValidNonStockAvatar(first.avatar)) {
      chosenAvatar = first.avatar!;
    } else {
      chosenAvatar = second.avatar || first.avatar || '';
    }
  }

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
    avatar: chosenAvatar,
    cloudAvatarUrl: chosenCloudAvatarUrl,
    avatarUpdatedAt: chosenAvatarUpdatedAt,
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
    registeredDeviceHash: first.registeredDeviceHash || second.registeredDeviceHash || undefined,
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
    // Server-verified 7-Day Free Trial fields survive merges across updates and devices (unless VIP was explicitly cancelled).
    freeTrialActivated:
      first.subscriptionStatus === 'cancelled' ||
      second.subscriptionStatus === 'cancelled' ||
      first.paymentStatus === 'cancelled' ||
      second.paymentStatus === 'cancelled'
        ? false
        : Boolean(
            first.freeTrialActivated ||
              second.freeTrialActivated ||
              first.freeTrialActivatedAt ||
              second.freeTrialActivatedAt
          ) || undefined,
    freeTrialActivatedAt:
      [first.freeTrialActivatedAt, second.freeTrialActivatedAt]
        .filter((v): v is string => typeof v === 'string' && v.length > 0 && v !== 'granted')
        .sort()[0] || undefined,
    freeTrialExpiresAt: (() => {
      const fExp = parseValidMs(first.freeTrialExpiresAt);
      const sExp = parseValidMs(second.freeTrialExpiresAt);
      const best = Math.max(fExp, sExp);
      return best > 0 ? new Date(best).toISOString() : first.freeTrialExpiresAt || second.freeTrialExpiresAt || undefined;
    })(),
    freeTrialDurationDays: Math.max(first.freeTrialDurationDays || 0, second.freeTrialDurationDays || 0) || undefined,
    foodCheckInLedger: (() => {
      const fEntries = Array.isArray(first.foodCheckInLedger?.entries) ? first.foodCheckInLedger!.entries : [];
      const sEntries = Array.isArray(second.foodCheckInLedger?.entries) ? second.foodCheckInLedger!.entries : [];
      if (fEntries.length === 0 && sEntries.length === 0 && !first.foodCheckInLedger?.grantedAt && !second.foodCheckInLedger?.grantedAt) {
        return undefined;
      }
      const seenFoods = new Set<string>();
      const seenDays = new Set<string>();
      const mergedEntries: Array<{ foodId: string; day: string; at: string }> = [];
      for (const e of [...fEntries, ...sEntries]) {
        if (!e || !e.foodId || !e.day || seenFoods.has(e.foodId) || seenDays.has(e.day)) continue;
        seenFoods.add(e.foodId);
        seenDays.add(e.day);
        mergedEntries.push({ foodId: e.foodId, day: e.day, at: e.at || '' });
        if (mergedEntries.length >= 30) break;
      }
      const grantedAt =
        [first.foodCheckInLedger?.grantedAt, second.foodCheckInLedger?.grantedAt]
          .filter((v): v is string => typeof v === 'string' && v.length > 0 && v !== 'granted')
          .sort()[0] ||
        first.foodCheckInLedger?.grantedAt ||
        second.foodCheckInLedger?.grantedAt;
      return { entries: mergedEntries, ...(grantedAt ? { grantedAt } : {}) };
    })(),
    ...(() => {
      const firstArMs = Math.max(
        parseValidMs(first.autoRenewUpdatedAt),
        parseValidMs(first.autoRenewCancelledAt),
        parseValidMs(first.autoRenewConsentAt),
        parseValidMs(first.autoRenewLastChargedAt)
      );
      const secondArMs = Math.max(
        parseValidMs(second.autoRenewUpdatedAt),
        parseValidMs(second.autoRenewCancelledAt),
        parseValidMs(second.autoRenewConsentAt),
        parseValidMs(second.autoRenewLastChargedAt)
      );
      const arSource =
        secondArMs > firstArMs
          ? second
          : firstArMs > secondArMs
          ? first
          : typeof second.autoRenew === 'boolean'
          ? second
          : first;

      const historyMap = new Map<string, NonNullable<User['vipMembershipHistory']>[number]>();
      for (const h of [
        ...(Array.isArray(first.vipMembershipHistory) ? first.vipMembershipHistory : []),
        ...(Array.isArray(second.vipMembershipHistory) ? second.vipMembershipHistory : []),
      ]) {
        if (h && typeof h === 'object' && h.id) {
          historyMap.set(h.id, h);
        }
      }
      const mergedHistory = Array.from(historyMap.values())
        .sort((a, b) => parseValidMs(b.date) - parseValidMs(a.date))
        .slice(0, 50);

      const isExplicitlyCancelled = Boolean(
        arSource.autoRenewCancelledAt || (arSource.autoRenew === false && arSource.autoRenewCancelledAt)
      );
      const resolvedAutoRenew = isExplicitlyCancelled ? false : (arSource.autoRenew !== false);

      return {
        autoRenew: resolvedAutoRenew,
        autoRenewPlanId: arSource.autoRenewPlanId || second.autoRenewPlanId || first.autoRenewPlanId,
        autoRenewPaymentMethod:
          arSource.autoRenewPaymentMethod ||
          second.autoRenewPaymentMethod ||
          first.autoRenewPaymentMethod,
        autoRenewPaymentLabel:
          arSource.autoRenewPaymentLabel ||
          second.autoRenewPaymentLabel ||
          first.autoRenewPaymentLabel,
        autoRenewConsentAt:
          arSource.autoRenewConsentAt ||
          second.autoRenewConsentAt ||
          first.autoRenewConsentAt ||
          (!isExplicitlyCancelled ? (arSource.subscriptionStartDate || arSource.verifiedAt || new Date().toISOString()) : undefined),
        autoRenewCancelledAt: isExplicitlyCancelled
          ? (arSource.autoRenewCancelledAt || second.autoRenewCancelledAt || first.autoRenewCancelledAt)
          : undefined,
        autoRenewLastChargedAt:
          parseValidMs(second.autoRenewLastChargedAt) >= parseValidMs(first.autoRenewLastChargedAt)
            ? second.autoRenewLastChargedAt || first.autoRenewLastChargedAt
            : first.autoRenewLastChargedAt || second.autoRenewLastChargedAt,
        autoRenewLastStatus: arSource.autoRenewLastStatus,
        autoRenewFailureReason: arSource.autoRenewFailureReason,
        autoRenewUpdatedAt:
          secondArMs >= firstArMs
            ? second.autoRenewUpdatedAt || first.autoRenewUpdatedAt
            : first.autoRenewUpdatedAt || second.autoRenewUpdatedAt,
        vipMembershipHistory: mergedHistory.length > 0 ? mergedHistory : undefined,
      };
    })(),
  };

  const nowMs = getAuthoritativeServerNowMs();
  const firstNorm = normalizeVipExpiryOnUser(first);
  const secondNorm = normalizeVipExpiryOnUser(second);
  const firstExpMs = parseValidMs(firstNorm.subscriptionExpiryDate || (firstNorm as any).vipExpiresAt);
  const secondExpMs = parseValidMs(secondNorm.subscriptionExpiryDate || (secondNorm as any).vipExpiresAt);

  const isFirstValidVip =
    (firstNorm.membershipTier === 'premium_vip' || firstNorm.subscriptionStatus === 'active' || (firstNorm as any).vipStatus === 'active') &&
    firstNorm.subscriptionStatus !== 'cancelled' &&
    firstNorm.subscriptionStatus !== 'expired' &&
    firstNorm.paymentStatus !== 'cancelled' &&
    firstNorm.paymentStatus !== 'rejected' &&
    firstExpMs > nowMs;
  const isSecondValidVip =
    (secondNorm.membershipTier === 'premium_vip' || secondNorm.subscriptionStatus === 'active' || (secondNorm as any).vipStatus === 'active') &&
    secondNorm.subscriptionStatus !== 'cancelled' &&
    secondNorm.subscriptionStatus !== 'expired' &&
    secondNorm.paymentStatus !== 'cancelled' &&
    secondNorm.paymentStatus !== 'rejected' &&
    secondExpMs > nowMs;

  const firstStartMs = Math.max(
    parseValidMs(firstNorm.subscriptionStartDate),
    parseValidMs(firstNorm.verifiedAt),
    parseValidMs(firstNorm.freeTrialActivatedAt)
  );
  const secondStartMs = Math.max(
    parseValidMs(secondNorm.subscriptionStartDate),
    parseValidMs(secondNorm.verifiedAt),
    parseValidMs(secondNorm.freeTrialActivatedAt)
  );
  const firstCancelMs = parseValidMs(first.vipCancelledAt);
  const secondCancelMs = parseValidMs(second.vipCancelledAt);

  const isFirstExplicitlyCancelled =
    first.subscriptionStatus === 'cancelled' ||
    first.paymentStatus === 'cancelled' ||
    (Boolean(first.vipCancelledAt) && first.subscriptionStatus !== 'active');
  const isSecondExplicitlyCancelled =
    second.subscriptionStatus === 'cancelled' ||
    second.paymentStatus === 'cancelled' ||
    (Boolean(second.vipCancelledAt) && second.subscriptionStatus !== 'active');

  if (isFirstExplicitlyCancelled || isSecondExplicitlyCancelled) {
    const effectiveCancelMs = Math.max(
      isFirstExplicitlyCancelled ? firstCancelMs : 0,
      isSecondExplicitlyCancelled ? secondCancelMs : 0
    );
    const effectiveCancelIso =
      (isSecondExplicitlyCancelled && secondCancelMs >= firstCancelMs
        ? second.vipCancelledAt
        : first.vipCancelledAt) ||
      second.vipCancelledAt ||
      first.vipCancelledAt ||
      new Date(nowMs).toISOString();

    // A cancelled record is only superseded if the other record is an active VIP whose subscriptionStartDate is strictly newer than the cancellation
    const isFirstNewerRegrant =
      !isFirstExplicitlyCancelled &&
      isFirstValidVip &&
      effectiveCancelMs > 0 &&
      firstStartMs > effectiveCancelMs;
    const isSecondNewerRegrant =
      !isSecondExplicitlyCancelled &&
      isSecondValidVip &&
      effectiveCancelMs > 0 &&
      secondStartMs > effectiveCancelMs;

    if (!isFirstNewerRegrant && !isSecondNewerRegrant) {
      return normalizeVipExpiryOnUser({
        ...baseMerged,
        membershipTier: 'free',
        subscriptionStatus: 'cancelled',
        subscriptionExpiryDate: undefined,
        vipExpiresAt: undefined,
        vipStatus: 'none',
        paymentStatus: 'cancelled',
        freeTrialActivated: false,
        freeTrialExpiresAt: undefined,
        autoRenew: false,
        vipCancelledAt: effectiveCancelIso,
      });
    }
  }

  if (isFirstValidVip && isSecondValidVip) {
    const bestVip = firstExpMs >= secondExpMs ? firstNorm : secondNorm;
    return normalizeVipExpiryOnUser({
      ...baseMerged,
      membershipTier: 'premium_vip',
      subscriptionStatus: 'active',
      subscriptionStartDate: bestVip.subscriptionStartDate || secondNorm.subscriptionStartDate || firstNorm.subscriptionStartDate,
      subscriptionExpiryDate: bestVip.subscriptionExpiryDate,
      vipStatus: 'active',
      vipPlanDays: bestVip.vipPlanDays || secondNorm.vipPlanDays || firstNorm.vipPlanDays,
      vipPlanType: bestVip.vipPlanType || secondNorm.vipPlanType || firstNorm.vipPlanType,
      vipExpiresAt: bestVip.subscriptionExpiryDate,
      vipCancelledAt: undefined,
      paymentStatus: 'verified',
      paymentMethod: bestVip.paymentMethod || second.paymentMethod || first.paymentMethod,
      transactionRef: bestVip.transactionRef || second.transactionRef || first.transactionRef,
    });
  }

  if (isFirstValidVip || isSecondValidVip) {
    const activeVip = isFirstValidVip ? firstNorm : secondNorm;
    return normalizeVipExpiryOnUser({
      ...baseMerged,
      membershipTier: 'premium_vip',
      subscriptionStatus: 'active',
      subscriptionStartDate: activeVip.subscriptionStartDate || baseMerged.subscriptionStartDate,
      subscriptionExpiryDate: activeVip.subscriptionExpiryDate,
      vipStatus: 'active',
      vipPlanDays: activeVip.vipPlanDays || baseMerged.vipPlanDays,
      vipPlanType: activeVip.vipPlanType || baseMerged.vipPlanType,
      vipExpiresAt: activeVip.subscriptionExpiryDate,
      vipCancelledAt: undefined,
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
  // Pre-index deletedUsers in O(D) so tombstone checks for 10,000-50,000+ users run in O(1) time
  const deletedById = new Map<string, number>();
  const deletedByEmail = new Map<string, number>();
  const deletedByPhone = new Map<string, number>();
  for (let i = 0; i < deletedUsers.length; i++) {
    const d = deletedUsers[i];
    if (!d) continue;
    const dMs = d.deletedAt ? parseSafeDateMs(d.deletedAt) : 0;
    const effectiveMs = dMs > 0 ? dMs : 1;
    if (d.id) {
      const k = String(d.id).trim();
      const prev = deletedById.get(k) || 0;
      if (effectiveMs > prev) deletedById.set(k, effectiveMs);
    }
    if (d.email) {
      const k = String(d.email).toLowerCase().trim();
      const prev = deletedByEmail.get(k) || 0;
      if (effectiveMs > prev) deletedByEmail.set(k, effectiveMs);
    }
    if (d.phone) {
      const k = String(d.phone).replace(/[\s-+()]/g, '');
      if (k.length >= 7) {
        const prev = deletedByPhone.get(k) || 0;
        if (effectiveMs > prev) deletedByPhone.set(k, effectiveMs);
      }
    }
  }

  const getDeletedTimeMsForUser = (u: Partial<User>): number => {
    const uId = String(u.id || '').trim();
    const uEmail = String(u.email || '').toLowerCase().trim();
    const uPhone = String(u.phone || '').replace(/[\s-+()]/g, '');
    return Math.max(
      uId ? deletedById.get(uId) || 0 : 0,
      uEmail ? deletedByEmail.get(uEmail) || 0 : 0,
      uPhone.length >= 7 ? deletedByPhone.get(uPhone) || 0 : 0
    );
  };

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
    const delMs = getDeletedTimeMsForUser(u);
    if (delMs <= 0) return false;

    // If the user re-registered, signed in, or was restored AFTER the deletion timestamp, allow the account!
    const latestUserActivityMs = Math.max(
      parseSafeDateMs(u.lastLoginAt),
      parseSafeDateMs(u.registeredAtIso),
      parseSafeDateMs((u as any).restoredAt)
    );
    if (delMs > 1 && latestUserActivityMs > delMs + 5000) {
      return false;
    }
    return true;
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
      const normE = normalizeEmailForIdentity(u.email)?.canonical || u.email.toLowerCase().trim();
      emailToCanonical.set(normE, u.id);
      emailToCanonical.set(u.email.toLowerCase().trim(), u.id);
    }
    if (u.phone) {
      const cleanP = getCanonicalPhoneDigits(u.phone) || u.phone.replace(/[\s-+()]/g, '');
      if (cleanP.length >= 7) phoneToCanonical.set(cleanP, u.id);
    }
    if (u.googleSub) {
      googleSubToCanonical.set(u.googleSub, u.id);
    }
  };

  for (const item of rawUsers) {
    if (!item || (!item.id && !item.email && !item.phone) || isAccountDeleted(item)) continue;

    const cleanEmail = (item.email || '').trim().toLowerCase();
    const normEmailIdentity = normalizeEmailForIdentity(cleanEmail)?.canonical || cleanEmail;
    const cleanPhone = getCanonicalPhoneDigits(item.phone) || (item.phone || '').replace(/[\s-+()]/g, '');
    if (!cleanEmail && cleanPhone.length < 7 && (!item.name || item.name === 'Member')) {
      continue;
    }
    const targetCanonicalId = getCanonicalUserId(item);

    const existingKey =
      (canonicalMap.has(targetCanonicalId) ? targetCanonicalId : undefined) ||
      (item.id ? legacyIdToCanonical.get(item.id) : undefined) ||
      (normEmailIdentity ? emailToCanonical.get(normEmailIdentity) : undefined) ||
      (cleanEmail ? emailToCanonical.get(cleanEmail) : undefined) ||
      (item.googleSub ? googleSubToCanonical.get(item.googleSub) : undefined) ||
      (cleanPhone.length >= 7 ? phoneToCanonical.get(cleanPhone) : undefined);

    if (!existingKey || !canonicalMap.has(existingKey)) {
      const legacyIds = item.id && item.id !== targetCanonicalId ? [item.id] : item.legacyIds;
      let resolvedFirstAvatar = item.avatar || '';
      if (!isCustomUploadedAvatarDataUrl(resolvedFirstAvatar)) {
        if (isCustomUploadedAvatarDataUrl(item.cloudAvatarUrl)) {
          resolvedFirstAvatar = item.cloudAvatarUrl!;
        } else {
          const cached = getCachedUserAvatarForAccount({ ...item, id: targetCanonicalId });
          if (cached && isCustomUploadedAvatarDataUrl(cached)) {
            resolvedFirstAvatar = cached;
          }
        }
      }
      const normalized: User = normalizeVipExpiryOnUser({
        ...item,
        id: targetCanonicalId,
        email: cleanEmail || item.email || '',
        avatar: resolvedFirstAvatar,
        createdAt: item.createdAt || '2026-01-01',
        registeredAtIso: item.registeredAtIso || item.createdAt || '2026-01-01T00:00:00.000Z',
        legacyIds: legacyIds && legacyIds.length > 0 ? Array.from(new Set(legacyIds)) : undefined,
      });
      if (isCustomUploadedAvatarDataUrl(normalized.avatar)) {
        cacheUserAvatarForAccount(normalized, normalized.avatar, false);
      }
      canonicalMap.set(normalized.id, normalized);
      indexUser(normalized);
    } else {
      const existing = canonicalMap.get(existingKey)!;
      const merged = mergeTwoUserRecordsCanonical(existing, item);
      if (isCustomUploadedAvatarDataUrl(merged.avatar)) {
        cacheUserAvatarForAccount(merged, merged.avatar, false);
      }
      if (existingKey !== merged.id) {
        canonicalMap.delete(existingKey);
      }
      canonicalMap.set(merged.id, merged);
      indexUser(merged);
    }
  }

  return Array.from(canonicalMap.values());
}

export const AVATAR_RECORD_PREFIX = 'kft_avatar_';

export interface CloudAvatarRecord {
  userId: string;
  email?: string;
  phone?: string;
  avatarUrl: string;
  cloudAvatarUrl?: string;
  dataUrl?: string;
  updatedAt: string;
}

/**
 * Permanently upload and synchronize a user's (or Admin's) profile picture to Cloud Storage
 * and atomic Cloud KV (`kft_avatar_<canonicalId>`), ensuring it persists across logins,
 * app updates, and multiple devices even if Primary Supabase is in HTTP 402 cooldown.
 */
export async function uploadAndSyncUserAvatarToCloud(
  user: User,
  avatarDataUrl: string
): Promise<{ avatarUrl: string; cloudAvatarUrl?: string; updatedAt: string }> {
  const updatedAt = user.avatarUpdatedAt || new Date().toISOString();
  const isAdmin =
    user.role === 'admin' ||
    user.id === 'admin-authorized-single' ||
    user.username === 'admin' ||
    user.username === 'cheasavuth';
  const canonicalId = isAdmin ? 'admin-authorized-single' : getCanonicalUserId(user);
  const cleanEmail = (user.email || '').trim().toLowerCase();
  const cleanPhone = (user.phone || '').replace(/[\s-+()]/g, '');

  cacheUserAvatarForAccount({ id: canonicalId, email: user.email, phone: user.phone, name: user.name, role: user.role, legacyIds: user.legacyIds }, avatarDataUrl, true);

  let cloudUrl: string | null = null;
  if (avatarDataUrl.startsWith('data:image/')) {
    try {
      cloudUrl = await uploadBase64ImageToSupabaseStorage('avatars', canonicalId, avatarDataUrl, 15000);
    } catch {
      // Ignore upload error; compact dataUrl fallback will still sync via KV
    }
  } else if (avatarDataUrl.startsWith('http://') || avatarDataUrl.startsWith('https://')) {
    cloudUrl = avatarDataUrl;
  }

  if (cloudUrl) {
    cacheUserAvatarForAccount({ id: canonicalId, email: user.email, phone: user.phone, name: user.name, role: user.role, legacyIds: user.legacyIds }, avatarDataUrl, true);
  }

  let compactDataUrl = avatarDataUrl.startsWith('data:image/') && avatarDataUrl.length <= 3200 ? avatarDataUrl : '';
  if (!compactDataUrl && avatarDataUrl.startsWith('data:image/')) {
    try {
      compactDataUrl = (await createCompactSyncAvatarDataUrl(avatarDataUrl)) || '';
    } catch {}
  }

  const record: CloudAvatarRecord = {
    userId: canonicalId,
    email: cleanEmail || undefined,
    phone: cleanPhone || undefined,
    avatarUrl: cloudUrl || compactDataUrl || avatarDataUrl,
    cloudAvatarUrl: cloudUrl || undefined,
    dataUrl: compactDataUrl || (avatarDataUrl.startsWith('data:image/') && avatarDataUrl.length <= 24000 ? avatarDataUrl : undefined),
    updatedAt,
  };

  try {
    await pushCloudDocument(`${AVATAR_RECORD_PREFIX}${canonicalId}`, record, 8000);
    if (cleanEmail && cleanEmail.includes('@')) {
      const emailSlug = cleanEmail.replace(/[^a-z0-9]/g, '_');
      if (`user-${emailSlug}` !== canonicalId && `google-${emailSlug}` !== canonicalId) {
        pushCloudDocument(`${AVATAR_RECORD_PREFIX}email_${emailSlug}`, record, 8000).catch(() => {});
      }
    }
  } catch {
    // Ignore network errors
  }

  return {
    avatarUrl: avatarDataUrl.startsWith('data:image/') ? avatarDataUrl : (cloudUrl || avatarDataUrl),
    cloudAvatarUrl: cloudUrl || undefined,
    updatedAt,
  };
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
 * Pulls any existing atomic cloud record(s) for this user FIRST and merges them before pushing
 * `kft_user_<canonicalId>` to Supabase — guaranteeing a fresh login NEVER overwrites an Admin-approved VIP record!
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
  let canonicalUser = canonicalList[0];

  if (!isSupabaseConfigured()) return [canonicalUser];

  try {
    // 1. Pull any existing atomic per-user rows (and aggregate/VIP backup when updateAggregate is requested) FIRST
    // so logging in on an updated device NEVER overwrites an Admin-approved VIP user with a blank `free` login record
    const candidateKeys = getCandidateAtomicUserKeys(canonicalUser);
    const candidateAvatarKeys = Array.from(
      new Set([
        `${AVATAR_RECORD_PREFIX}${canonicalUser.id}`,
        ...(canonicalUser.email && canonicalUser.email.includes('@')
          ? [`${AVATAR_RECORD_PREFIX}email_${canonicalUser.email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}`]
          : []),
      ])
    );
    const [existingAtomicDocs, existingAvatarDocs] = await Promise.all([
      candidateKeys.length > 0 ? pullCloudDocumentsByKeys<User>(candidateKeys, 6000) : Promise.resolve([]),
      candidateAvatarKeys.length > 0 ? pullCloudDocumentsByKeys<CloudAvatarRecord>(candidateAvatarKeys, 6000) : Promise.resolve([]),
    ]);
    // ROOT-CAUSE/EGRESS FIX: every login used to download AND rewrite the entire user list. The whole-list
    // aggregates are now consulted only for LEGACY accounts that have no atomic `kft_user_<id>` row yet.
    const needLegacyAggregateLookup = updateAggregate && existingAtomicDocs.length === 0;
    const [cloudUsersV2, cloudVipBackup, cloudDeleted]: [User[] | null, any, DeletedUserRecord[] | null] =
      needLegacyAggregateLookup
        ? await Promise.all([
            pullCloudDocument<User[]>('kft_cloud_users_v2'),
            pullCloudDocument<any>('kft_cloud_vip_backup_v1'),
            pullCloudDocument<DeletedUserRecord[]>('kft_cloud_deleted_users_v1'),
          ])
        : [null, null, null];

    const allDeleted = [
      ...deletedUsers,
      ...(Array.isArray(cloudDeleted) ? cloudDeleted : []),
    ];

    const vipBackupUsers: User[] = [];
    if (Array.isArray(cloudVipBackup)) {
      for (const v of cloudVipBackup) {
        if (v && typeof v === 'object') vipBackupUsers.push(v as User);
      }
    } else if (cloudVipBackup && typeof cloudVipBackup === 'object') {
      for (const [key, val] of Object.entries(cloudVipBackup)) {
        if (!val || typeof val !== 'object') continue;
        const vObj = val as Partial<User>;
        const emailFromKey = key.startsWith('email:') ? key.slice(6) : (vObj.email || '');
        const idFromKey = key.startsWith('id:') ? key.slice(3) : (vObj.id || '');
        if (!idFromKey && !emailFromKey) continue;
        vipBackupUsers.push({
          ...(vObj as User),
          id: idFromKey || `google-${emailFromKey.replace(/[^a-z0-9]/g, '_')}`,
          email: emailFromKey,
          name: vObj.name || (emailFromKey ? emailFromKey.split('@')[0] : 'VIP Member'),
          role: vObj.role || 'user',
          avatar: vObj.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          createdAt: vObj.createdAt || (vObj.subscriptionStartDate ? vObj.subscriptionStartDate.split('T')[0] : '2026-01-01'),
        });
      }
    }

    const avatarDocUsers: User[] = [];
    for (const avDoc of existingAvatarDocs) {
      const rec = avDoc?.payload;
      if (!rec || (!rec.avatarUrl && !rec.dataUrl && !rec.cloudAvatarUrl)) continue;
      avatarDocUsers.push({
        id: rec.userId || canonicalUser.id,
        email: rec.email || canonicalUser.email || '',
        phone: rec.phone || canonicalUser.phone,
        name: canonicalUser.name,
        role: canonicalUser.role,
        avatar: rec.dataUrl || rec.cloudAvatarUrl || rec.avatarUrl,
        cloudAvatarUrl: rec.cloudAvatarUrl || (rec.avatarUrl?.startsWith('http') ? rec.avatarUrl : undefined),
        avatarUpdatedAt: rec.updatedAt,
        createdAt: canonicalUser.createdAt || '2026-01-01',
      });
    }

    const matchesCanonicalTarget = (u: any): boolean =>
      Boolean(
        u &&
          (u.id === canonicalUser.id ||
            (Array.isArray(u.legacyIds) && u.legacyIds.includes(canonicalUser.id)) ||
            (canonicalUser.email && u.email && u.email.toLowerCase().trim() === canonicalUser.email.toLowerCase().trim()))
      );

    const cloudAuthoritativeMatches = [
      ...existingAtomicDocs.map(d => d.payload),
      ...(Array.isArray(cloudUsersV2) ? cloudUsersV2 : []),
    ].filter(matchesCanonicalTarget);

    const cloudCancelledRecord = cloudAuthoritativeMatches.find(
      u =>
        u.subscriptionStatus === 'cancelled' ||
        u.paymentStatus === 'cancelled' ||
        (Boolean(u.vipCancelledAt) && u.subscriptionStatus !== 'active')
    );
    const cloudCancelMs = cloudCancelledRecord ? parseSafeDateMs(cloudCancelledRecord.vipCancelledAt) : 0;
    const localStartMs = parseSafeDateMs(canonicalUser.subscriptionStartDate || canonicalUser.verifiedAt);

    // If cloud says this user's VIP was cancelled and local user wasn't newly granted VIP after cloudCancelMs, strip stale local VIP
    if (cloudCancelledRecord && (cloudCancelMs === 0 || localStartMs <= cloudCancelMs)) {
      canonicalUser = normalizeVipExpiryOnUser({
        ...canonicalUser,
        membershipTier: 'free',
        subscriptionStatus: 'cancelled',
        paymentStatus: 'cancelled',
        vipStatus: 'none',
        subscriptionExpiryDate: undefined,
        vipExpiresAt: undefined,
        freeTrialActivated: false,
        freeTrialExpiresAt: undefined,
        autoRenew: false,
        vipCancelledAt: cloudCancelledRecord.vipCancelledAt || new Date().toISOString(),
      });
    }

    const matchingCloudUsers = [
      ...cloudAuthoritativeMatches,
      ...avatarDocUsers,
      ...(cloudCancelledRecord ? [] : vipBackupUsers.filter(matchesCanonicalTarget)),
    ];

    if (matchingCloudUsers.length > 0) {
      const mergedSingle = deduplicateAndNormalizeUsers(
        [...matchingCloudUsers, canonicalUser],
        allDeleted
      );
      if (mergedSingle.length > 0) {
        canonicalUser = mergedSingle[0];
      }
    }

    // 2. Write merged atomic per-user row immediately (and update any existing alias atomic keys so they never diverge)
    const keysToPush = Array.from(
      new Set([
        `${USER_RECORD_PREFIX}${canonicalUser.id}`,
        ...existingAtomicDocs.map(d => d.key).filter(Boolean),
      ])
    );
    const userSig = JSON.stringify(canonicalUser);
    for (const atomicKey of keysToPush) {
      if (lastPushedAtomicUserSigMap.get(atomicKey) !== userSig) {
        const atomicOk = await pushCloudDocument(atomicKey, canonicalUser);
        if (atomicOk) lastPushedAtomicUserSigMap.set(atomicKey, userSig);
      }
    }

    if (!updateAggregate) {
      return [canonicalUser];
    }

    // 3. The whole-list aggregate is NO LONGER rewritten from a login. A per-login read-modify-write of one shared
    // JSON document was a classic lost-update race (two logins => one overwrote the other) and re-uploaded every
    // user on every login. Admin devices rebuild the aggregate from the atomic rows (guarded, see pushCloudDocument).
    return [canonicalUser];
  } catch (err) {
    console.warn('upsertSingleUserToCloud warning:', err);
    return [canonicalUser];
  }
}

/**
 * Synchronize Users, Transactions, Payment Proofs Vault, and Custom/Cached Restaurants
 * between this device and Supabase Cloud.
 */

export interface ServerPaginatedUsersRequest {
  searchQuery?: string;
  roleFilter?: 'all' | 'regular' | 'owner' | 'vip';
  vipStatusFilter?: 'all' | 'active_vip' | 'expired_vip' | 'pending_vip' | 'free';
  accountStatusFilter?: 'all' | 'active' | 'disabled' | 'verified' | 'unverified';
  authProviderFilter?: 'all' | 'google' | 'phone' | 'email';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  timeoutMs?: number;
}

export interface ServerPaginatedUsersResponse {
  ok: boolean;
  source: 'supabase_postgrest' | 'local_indexed_fallback';
  items: User[];
  totalServerCount: number;
  page: number;
  pageSize: number;
  latencyMs: number;
}

/**
 * Server-Side Paginated & Indexed User Query against Supabase PostgreSQL (PostgREST).
 * Fetches ONLY a single page slice (`limit` & `offset` with `Range` and `Prefer: count=exact`)
 * and applies server-side filtering & ILIKE search on indexed JSONB expressions so the client
 * never downloads all 10,000+ user records at once.
 */
export async function fetchServerPaginatedUsersFromSupabase(
  req: ServerPaginatedUsersRequest
): Promise<ServerPaginatedUsersResponse> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const page = Math.max(1, req.page || 1);
  const pageSize = Math.max(5, Math.min(250, req.pageSize || 25));
  const offset = (page - 1) * pageSize;

  if (!isSupabaseConfigured() || isSupabaseEgressCooldownActive()) {
    return {
      ok: false,
      source: 'local_indexed_fallback',
      items: [],
      totalServerCount: 0,
      page,
      pageSize,
      latencyMs: 0,
    };
  }

  const cfg = getCloudApiConfig();
  const baseUrl = cfg.supabaseUrl.replace(/\/+$/, '');
  const timeoutMs = req.timeoutMs || 8000;

  try {
    const queryParts: string[] = [
      'select=key,payload,updated_at',
      `key=like.${encodeURIComponent(USER_RECORD_PREFIX)}*`,
      'payload->>role=neq.admin',
    ];

    // 1. Server-side Role / Account Type filter
    if (req.roleFilter === 'owner') {
      queryParts.push('payload->>role=eq.owner');
    } else if (req.roleFilter === 'regular') {
      queryParts.push('payload->>role=eq.user');
    } else if (req.roleFilter === 'vip') {
      queryParts.push('payload->>membershipTier=eq.premium_vip');
      queryParts.push('payload->>subscriptionStatus=eq.active');
    }

    // 2. Server-side VIP status filter
    if (req.vipStatusFilter === 'active_vip') {
      queryParts.push('payload->>membershipTier=eq.premium_vip');
      queryParts.push('payload->>subscriptionStatus=eq.active');
    } else if (req.vipStatusFilter === 'expired_vip') {
      queryParts.push('payload->>subscriptionStatus=eq.expired');
    } else if (req.vipStatusFilter === 'pending_vip') {
      queryParts.push('payload->>paymentStatus=eq.pending_verification');
    } else if (req.vipStatusFilter === 'free') {
      queryParts.push('or=(payload->>membershipTier.is.null,payload->>membershipTier.eq.free)');
    }

    // 3. Server-side Account Status filter
    if (req.accountStatusFilter === 'disabled') {
      queryParts.push('payload->>isDisabled=eq.true');
    } else if (req.accountStatusFilter === 'active') {
      queryParts.push('or=(payload->>isDisabled.is.null,payload->>isDisabled.eq.false)');
    }

    // 4. Server-side Auth Provider filter
    if (req.authProviderFilter && req.authProviderFilter !== 'all') {
      queryParts.push(`payload->>authProvider=eq.${encodeURIComponent(req.authProviderFilter)}`);
    }

    // 5. Server-side Search Query (name, email, phone, username, id)
    const rawQ = (req.searchQuery || '').trim();
    if (rawQ) {
      const safeQ = rawQ.replace(/[,()*]/g, '').trim();
      if (safeQ) {
        const enc = encodeURIComponent(`*${safeQ}*`);
        queryParts.push(
          `or=(key.ilike.${enc},payload->>name.ilike.${enc},payload->>email.ilike.${enc},payload->>phone.ilike.${enc},payload->>username.ilike.${enc},payload->>id.ilike.${enc})`
        );
      }
    }

    // 6. Server-side Ordering & Limit/Offset Pagination
    const dir = req.sortOrder === 'asc' ? 'asc' : 'desc';
    queryParts.push(`order=updated_at.${dir}`);
    queryParts.push(`limit=${pageSize}`);
    queryParts.push(`offset=${offset}`);

    const url = `${baseUrl}/rest/v1/kft_app_kv_store?${queryParts.join('&')}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        Accept: 'application/json',
        Prefer: 'count=exact',
        'Range-Unit': 'items',
        Range: `${offset}-${offset + pageSize - 1}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.status === 402 || res.status === 429) {
      return {
        ok: false,
        source: 'local_indexed_fallback',
        items: [],
        totalServerCount: 0,
        page,
        pageSize,
        latencyMs: Number(((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0).toFixed(2)),
      };
    }

    if (!res.ok && res.status !== 206) {
      return {
        ok: false,
        source: 'local_indexed_fallback',
        items: [],
        totalServerCount: 0,
        page,
        pageSize,
        latencyMs: Number(((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0).toFixed(2)),
      };
    }

    // Parse exact server count from Content-Range header (e.g. "0-24/10450" or "*/0")
    const contentRange = res.headers.get('content-range') || '';
    let totalServerCount = 0;
    const slashIdx = contentRange.indexOf('/');
    if (slashIdx !== -1) {
      const parsedTotal = parseInt(contentRange.slice(slashIdx + 1), 10);
      if (Number.isFinite(parsedTotal) && parsedTotal >= 0) {
        totalServerCount = parsedTotal;
      }
    }

    const rows = await res.json();
    const rawUsers: User[] = [];
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (row && row.payload && typeof row.payload === 'object') {
          rawUsers.push(normalizeVipExpiryOnUser(row.payload as User));
        }
      }
    }

    if (totalServerCount === 0 && rawUsers.length > 0) {
      totalServerCount = rawUsers.length;
    }

    const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      ok: true,
      source: 'supabase_postgrest',
      items: rawUsers,
      totalServerCount,
      page,
      pageSize,
      latencyMs: Number((t1 - t0).toFixed(2)),
    };
  } catch {
    const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      ok: false,
      source: 'local_indexed_fallback',
      items: [],
      totalServerCount: 0,
      page,
      pageSize,
      latencyMs: Number((t1 - t0).toFixed(2)),
    };
  }
}

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
  mergedSupportTickets?: SupportTicket[];
  mergedPaymentProofsVault: Record<string, any>;
  mergedAppSettings?: AppSettings;
}> {
  const buildOfflineFallbackResult = () => ({
    synced: false,
    mergedUsers: deduplicateAndNormalizeUsers(
      [...(localState.users || []), localState.currentUser || undefined],
      localState.deletedUsers || []
    ),
    mergedDeletedUsers: localState.deletedUsers || [],
    mergedTransactions: Array.isArray(localState.transactions) ? localState.transactions : [],
    mergedCustomRestaurants: Array.isArray(localState.customRestaurants) ? localState.customRestaurants : [],
    mergedSupportTickets: Array.isArray(localState.supportTickets) ? localState.supportTickets : [],
    mergedPaymentProofsVault: localState.paymentProofsVault,
    mergedAppSettings: localState.appSettings,
  });

  if (!isSupabaseConfigured()) {
    return buildOfflineFallbackResult();
  }

  try {
    // Deliver any critical writes that previously failed (402 / offline) before doing anything else.
    void flushCloudOutbox().catch(() => {});
    const isAdminDevice = Boolean(
      localState.currentUser &&
        (localState.currentUser.role === 'admin' ||
          localState.currentUser.id === 'admin-authorized-single' ||
          localState.currentUser.username === 'admin' ||
          localState.currentUser.username === 'cheasavuth')
    );
    const shouldFetchHeavyAdminVaults = Boolean(isAdminDevice && localState.includeHeavyAdminVaults);
    const shouldSyncPaymentProofs = shouldFetchHeavyAdminVaults;
    // Admin devices download only CHANGED user rows once they hold a trustworthy local copy (egress + 10k scale).
    const userCursorPlan = planUserCursorSync({
      cursorIso: readUserSyncCursor(),
      localCount: Array.isArray(localState.users) ? localState.users.length : 0,
      baselineCount: readUserHighWater().count,
    });
    const userDeltaMode = isAdminDevice && userCursorPlan.mode === 'delta';

    // Always fetch atomic `kft_user_*` prefix documents on Admin devices or when using Secondary Cloud Failover
    // (where prefix reads come from the shared single-poll memory map at 0 extra network cost).
    const shouldPullAllAtomicUsers = Boolean(
      isAdminDevice || shouldFetchHeavyAdminVaults || isSupabaseEgressCooldownActive()
    );
    const currentCandidateAtomicKeys =
      !shouldPullAllAtomicUsers && localState.currentUser
        ? getCandidateAtomicUserKeys(localState.currentUser)
        : [];
    const currentCandidateAvatarKeys =
      !shouldPullAllAtomicUsers && localState.currentUser
        ? Array.from(
            new Set([
              `${AVATAR_RECORD_PREFIX}${getCanonicalUserId(localState.currentUser)}`,
              `${AVATAR_RECORD_PREFIX}${localState.currentUser.id}`,
              ...(localState.currentUser.email && localState.currentUser.email.includes('@')
                ? [`${AVATAR_RECORD_PREFIX}email_${localState.currentUser.email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}`]
                : []),
            ])
          )
        : [];

    // 1. Pull existing cloud records in a single batch
    // eslint-disable-next-line prefer-const
    let [
      cloudUsersV2,
      atomicUserDocs,
      avatarDocs,
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
      isAdminDevice || shouldFetchHeavyAdminVaults
        ? pullCloudDocument<User[]>('kft_cloud_users_v2')
        : Promise.resolve(null as User[] | null),
      shouldPullAllAtomicUsers
        ? pullCloudDocumentsByPrefix<User>(
            USER_RECORD_PREFIX,
            12000,
            userDeltaMode ? { sinceIso: userCursorPlan.sinceIso } : {}
          )
        : currentCandidateAtomicKeys.length > 0
        ? pullCloudDocumentsByKeys<User>(currentCandidateAtomicKeys).then(docs =>
            docs.map(d => ({ key: d.key, payload: d.payload, updated_at: d.updated_at || '' }))
          )
        : Promise.resolve([] as Array<{ key: string; payload: User; updated_at: string }>),
      shouldPullAllAtomicUsers
        ? pullCloudDocumentsByPrefix<CloudAvatarRecord>(AVATAR_RECORD_PREFIX)
        : currentCandidateAvatarKeys.length > 0
        ? pullCloudDocumentsByKeys<CloudAvatarRecord>(currentCandidateAvatarKeys).then(docs =>
            docs.map(d => ({ key: d.key, payload: d.payload, updated_at: d.updated_at || '' }))
          )
        : Promise.resolve([] as Array<{ key: string; payload: CloudAvatarRecord; updated_at: string }>),
      isAdminDevice
        ? pullCloudDocument<Record<string, Partial<User>>>('kft_cloud_vip_backup_v1')
        : Promise.resolve(null as Record<string, Partial<User>> | null),
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

    // Regular devices skip the PII-heavy whole-list documents; only legacy accounts without an atomic row need them.
    const needLegacyAggregateFallback =
      !isAdminDevice && !shouldFetchHeavyAdminVaults && Boolean(localState.currentUser) && atomicUserDocs.length === 0;
    if (needLegacyAggregateFallback) {
      const [aggFallback, vipFallback] = await Promise.all([
        pullCloudDocument<User[]>('kft_cloud_users_v2'),
        pullCloudDocument<Record<string, Partial<User>>>('kft_cloud_vip_backup_v1'),
      ]);
      cloudUsersV2 = aggFallback;
      cloudVipBackup = vipFallback;
    }
    const allowLegacyAggregatePull = isAdminDevice || shouldFetchHeavyAdminVaults || needLegacyAggregateFallback;
    const cloudUsers =
      cloudUsersV2 || !allowLegacyAggregatePull ? null : await pullCloudDocument<User[]>('kft_cloud_users_v1');
    const cloudSettingsV1 = cloudSettingsV2 ? null : await pullCloudDocument<AppSettings>('kft_cloud_app_settings_v1');
    const cloudSettings = cloudSettingsV2 || cloudSettingsV1;

    // 1b. Merge Deleted Users Registry (with timestamp-aware superseding for re-invited testers)
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

    // If any user in local or cloud sources registered, signed in, or was restored AFTER a deletion tombstone,
    // remove the stale tombstone so re-invited testers automatically appear in the Admin Dashboard.
    const allCandidateLiveUsers: Array<User | null | undefined> = [
      ...(Array.isArray(localState.users) ? localState.users : []),
      localState.currentUser,
      ...atomicUserDocs.map(d => d.payload),
      ...(Array.isArray(cloudUsersV2) ? cloudUsersV2 : []),
    ];
    for (const u of allCandidateLiveUsers) {
      if (!u) continue;
      const latestActivityMs = Math.max(
        parseSafeDateMs(u.lastLoginAt),
        parseSafeDateMs(u.registeredAtIso),
        parseSafeDateMs((u as any).restoredAt)
      );
      if (latestActivityMs <= 0) continue;
      const uEmail = String(u.email || '').toLowerCase().trim();
      const uPhone = String(u.phone || '').replace(/[\s-+()]/g, '');
      for (const [delKey, delRec] of Array.from(deletedMap.entries())) {
        const dEmail = String(delRec.email || '').toLowerCase().trim();
        const dPhone = String(delRec.phone || '').replace(/[\s-+()]/g, '');
        const isMatch =
          (u.id && delRec.id === u.id) ||
          (uEmail && dEmail && uEmail === dEmail) ||
          (uPhone.length >= 7 && dPhone.length >= 7 && uPhone === dPhone);
        if (isMatch) {
          const deletedMs = delRec.deletedAt ? parseSafeDateMs(delRec.deletedAt) : 0;
          if (deletedMs > 0 && latestActivityMs > deletedMs + 5000) {
            deletedMap.delete(delKey);
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

    // Build authoritative cancellation lookup across Cloud & Local records so cancelled users are never re-upgraded by old backups/txns
    const cancelledById = new Map<string, number>();
    const cancelledByEmail = new Map<string, number>();
    const cancelledByPhone = new Map<string, number>();
    const recordCancelledUser = (u: Partial<User> | null | undefined) => {
      if (!u || typeof u !== 'object') return;
      const isCanc =
        u.subscriptionStatus === 'cancelled' ||
        u.paymentStatus === 'cancelled' ||
        (Boolean(u.vipCancelledAt) && u.subscriptionStatus !== 'active');
      if (!isCanc) return;
      const cMs = parseSafeDateMs(u.vipCancelledAt) || Date.now();
      const registerKey = (map: Map<string, number>, k?: string) => {
        if (!k) return;
        const prev = map.get(k) || 0;
        if (cMs > prev) map.set(k, cMs);
      };
      if (u.id) registerKey(cancelledById, String(u.id).trim());
      if (Array.isArray(u.legacyIds)) {
        for (const lid of u.legacyIds) if (lid) registerKey(cancelledById, String(lid).trim());
      }
      const em = String(u.email || '').trim().toLowerCase();
      if (em) {
        registerKey(cancelledByEmail, em);
        if (em.includes('@')) {
          const slug = em.replace(/[^a-z0-9]/g, '_');
          registerKey(cancelledById, `user-${slug}`);
          registerKey(cancelledById, `google-${slug}`);
          registerKey(cancelledById, `owner-${slug}`);
        }
      }
      const ph = String(u.phone || '').replace(/[\s-+()]/g, '');
      if (ph.length >= 7) registerKey(cancelledByPhone, ph);
    };
    for (const doc of atomicUserDocs) recordCancelledUser(doc?.payload);
    if (Array.isArray(cloudUsersV2)) for (const u of cloudUsersV2) recordCancelledUser(u);
    if (Array.isArray(cloudUsers)) for (const u of cloudUsers) recordCancelledUser(u);
    if (Array.isArray(localState.users)) for (const u of localState.users) recordCancelledUser(u);
    recordCancelledUser(localState.currentUser);

    const getCancelledMsForActivity = (uid?: string, email?: string, phone?: string): number => {
      const cleanId = String(uid || '').trim();
      const cleanE = String(email || '').trim().toLowerCase();
      const cleanP = String(phone || '').replace(/[\s-+()]/g, '');
      return Math.max(
        cleanId ? cancelledById.get(cleanId) || 0 : 0,
        cleanE ? cancelledByEmail.get(cleanE) || 0 : 0,
        cleanP.length >= 7 ? cancelledByPhone.get(cleanP) || 0 : 0
      );
    };

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
      const isGoogle = String(uid || '').startsWith('google-');
      const createdDate = t.createdAt ? t.createdAt.split('T')[0].split(' ')[0] : '2026-01-01';
      const txnExpMs = parseSafeDateMs(t.expiresAt);
      const txnStartMs = parseSafeDateMs(t.verifiedAt || t.createdAt);
      const userCancelMs = getCancelledMsForActivity(uid, uEmail, uPhone);
      const isCancelledAfterTxn = userCancelMs > 0 && (txnStartMs <= 0 || txnStartMs <= userCancelMs);
      const isActiveVerifiedVipTxn = t.status === 'verified' && txnExpMs > Date.now() && !isCancelledAfterTxn;
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
        membershipTier: isActiveVerifiedVipTxn ? 'premium_vip' : 'free',
        subscriptionStatus: isActiveVerifiedVipTxn ? 'active' : 'none',
        subscriptionStartDate: isActiveVerifiedVipTxn ? (t.verifiedAt || t.createdAt) : undefined,
        subscriptionExpiryDate: isActiveVerifiedVipTxn ? t.expiresAt : undefined,
        paymentStatus: isActiveVerifiedVipTxn ? 'verified' : t.status === 'pending_verification' ? 'pending_verification' : 'unpaid',
        paymentMethod: (t.paymentMethod as any) || undefined,
        transactionRef: t.transactionRef || undefined,
      });
    }

    for (const tk of allTicketsCombined) {
      if (!tk || !tk.userId || tk.userId === 'guest') continue;
      const uEmail = (tk.userEmail || '').trim().toLowerCase();
      if (isActivityUserDeleted(tk.userId, uEmail, tk.userPhone)) continue;
      const isGoogle = String(tk.userId).startsWith('google-');
      let tkExpiryIso: string | undefined;
      const tkCancelMs = getCancelledMsForActivity(tk.userId, uEmail, tk.userPhone);
      if (tk.vipApproved && tk.status === 'resolved') {
        const baseMs = parseSafeDateMs(tk.vipApprovedAt || tk.updatedAt || tk.createdAt) || Date.now();
        if (tkCancelMs <= 0 || baseMs > tkCancelMs) {
          const days = typeof tk.durationDays === 'number' && tk.durationDays >= 1 ? tk.durationDays : 30;
          const calcExpMs = baseMs + days * 24 * 60 * 60 * 1000;
          if (calcExpMs > Date.now()) {
            tkExpiryIso = new Date(calcExpMs).toISOString();
          }
        }
      }
      recoveredUsersFromActivity.push({
        id: tk.userId,
        name: tk.userName || tk.username || (uEmail ? uEmail.split('@')[0] : 'Member'),
        email: uEmail,
        phone: tk.userPhone || undefined,
        role: tk.userRole === 'owner' ? 'owner' : 'user',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        authProvider: isGoogle ? 'google' : 'email',
        linkedProviders: [isGoogle ? 'google' : 'email'],
        isVerified: true,
        createdAt: tk.createdAt ? tk.createdAt.split('T')[0].split(' ')[0] : '2026-01-01',
        registeredAtIso: tk.createdAt || '2026-01-01T00:00:00.000Z',
        lastActiveAt: tk.updatedAt || tk.createdAt,
        ...(tkExpiryIso
          ? {
              membershipTier: 'premium_vip' as const,
              subscriptionStatus: 'active' as const,
              subscriptionStartDate: tk.vipApprovedAt || tk.updatedAt || tk.createdAt,
              subscriptionExpiryDate: tkExpiryIso,
              paymentStatus: 'verified' as const,
              paymentMethod: 'KHQR' as const,
              transactionRef: tk.paymentRef,
            }
          : {}),
      });
    }

    if (Array.isArray(cloudVipBackup)) {
      for (const val of cloudVipBackup) {
        if (!val || typeof val !== 'object') continue;
        const vObj = val as Partial<User>;
        if (!vObj.id && !vObj.email) continue;
        if (isActivityUserDeleted(vObj.id, vObj.email, vObj.phone)) continue;
        if (getCancelledMsForActivity(vObj.id, vObj.email, vObj.phone) > 0) continue;
        recoveredUsersFromActivity.push({
          ...(vObj as User),
          id: vObj.id || `google-${(vObj.email || '').replace(/[^a-z0-9]/g, '_')}`,
          name: vObj.name || (vObj.email ? vObj.email.split('@')[0] : 'VIP Member'),
          email: (vObj.email || '').toLowerCase().trim(),
          role: vObj.role || 'user',
          avatar: vObj.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          createdAt: vObj.createdAt || (vObj.subscriptionStartDate ? vObj.subscriptionStartDate.split('T')[0] : '2026-01-01'),
          registeredAtIso: vObj.registeredAtIso || vObj.subscriptionStartDate || '2026-01-01T00:00:00.000Z',
        });
      }
    } else if (cloudVipBackup && typeof cloudVipBackup === 'object') {
      for (const [key, val] of Object.entries(cloudVipBackup)) {
        if (!val || typeof val !== 'object') continue;
        const emailFromKey = key.startsWith('email:') ? key.slice(6) : (val.email || '');
        const idFromKey = key.startsWith('id:') ? key.slice(3) : (val.id || '');
        if (!idFromKey && !emailFromKey) continue;
        if (isActivityUserDeleted(idFromKey, emailFromKey, val.phone)) continue;
        if (getCancelledMsForActivity(idFromKey, emailFromKey, val.phone) > 0) continue;
        recoveredUsersFromActivity.push({
          ...(val as User),
          id: idFromKey || `google-${emailFromKey.replace(/[^a-z0-9]/g, '_')}`,
          name: val.name || (emailFromKey ? emailFromKey.split('@')[0] : 'VIP Member'),
          email: emailFromKey,
          phone: val.phone,
          role: val.role || 'user',
          avatar: val.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          createdAt: val.createdAt || (val.subscriptionStartDate ? val.subscriptionStartDate.split('T')[0] : '2026-01-01'),
          registeredAtIso: val.registeredAtIso || val.subscriptionStartDate || '2026-01-01T00:00:00.000Z',
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

    // Also include local `kft_vip_registry_backup_v1` and `kft_pre_update_db_backup_v1.vipUsers` so version updates never lose local VIP records
    try {
      if (typeof localStorage !== 'undefined') {
        const rawLocalVip = localStorage.getItem('kft_vip_registry_backup_v1');
        if (rawLocalVip) {
          const parsedLocalVip = JSON.parse(rawLocalVip);
          if (Array.isArray(parsedLocalVip)) {
            for (const v of parsedLocalVip) {
              if (
                v &&
                (v.id || v.email) &&
                !isActivityUserDeleted(v.id, v.email, v.phone) &&
                getCancelledMsForActivity(v.id, v.email, v.phone) <= 0
              ) {
                recoveredUsersFromActivity.push(v as User);
              }
            }
          }
        }
        const rawPreUpdate = localStorage.getItem('kft_pre_update_db_backup_v1');
        if (rawPreUpdate) {
          const parsedPreUpdate = JSON.parse(rawPreUpdate);
          if (Array.isArray(parsedPreUpdate?.allUsers)) {
            for (const u of parsedPreUpdate.allUsers) {
              if (
                u &&
                (u.id || u.email) &&
                !isActivityUserDeleted(u.id, u.email, u.phone) &&
                getCancelledMsForActivity(u.id, u.email, u.phone) <= 0
              ) {
                recoveredUsersFromActivity.push(u as User);
              }
            }
          }
          if (Array.isArray(parsedPreUpdate?.vipUsers)) {
            for (const v of parsedPreUpdate.vipUsers) {
              if (
                v &&
                (v.id || v.email) &&
                !isActivityUserDeleted(v.id, v.email, v.phone) &&
                getCancelledMsForActivity(v.id, v.email, v.phone) <= 0
              ) {
                recoveredUsersFromActivity.push(v as User);
              }
            }
          }
        }
      }
    } catch {}

    // 2. Deduplicate & Normalize Users across all sources (Recovered activity first, then Cloud, then Local users & CurrentUser last so live profile edits win)
    const mergedUsers = deduplicateAndNormalizeUsers(
      [
        ...recoveredUsersFromActivity,
        ...(Array.isArray(cloudUsers) ? cloudUsers : []),
        ...(Array.isArray(cloudUsersV2) ? cloudUsersV2 : []),
        ...atomicUserDocs.map(doc => doc.payload),
        ...(Array.isArray(localState.users) ? localState.users : []),
        localState.currentUser && localState.currentUser.role !== 'admin' ? localState.currentUser : undefined,
      ],
      mergedDeletedUsers
    );

    // Delta cursor + integrity bookkeeping (cursor only advances after a COMPLETE, successful primary pull)
    try {
      if (isAdminDevice && shouldPullAllAtomicUsers && wasPrefixPullComplete(USER_RECORD_PREFIX)) {
        let maxMs = userDeltaMode ? Date.parse(readUserSyncCursor() || '') || 0 : 0;
        for (const d of atomicUserDocs) {
          const ms = d.updated_at ? Date.parse(d.updated_at) || 0 : 0;
          if (ms > maxMs) maxMs = ms;
        }
        if (maxMs > 0) writeUserSyncCursor(new Date(maxMs).toISOString());
      }
      runUserDataIntegrityCheck(mergedUsers, localState.currentUser?.id);
    } catch {
      /* integrity bookkeeping must never break sync */
    }

    // 2a. Apply atomic Cloud Avatar records (`kft_avatar_*`) so profile pictures sync across devices for all users & Admin
    if (Array.isArray(avatarDocs) && avatarDocs.length > 0) {
      for (const avDoc of avatarDocs) {
        const rec = avDoc?.payload;
        if (!rec || (!rec.avatarUrl && !rec.dataUrl && !rec.cloudAvatarUrl)) continue;
        const bestAv = rec.dataUrl || rec.cloudAvatarUrl || rec.avatarUrl;
        if (!isCustomUploadedAvatarDataUrl(bestAv)) continue;

        if (rec.userId === 'admin-authorized-single') {
          cacheUserAvatarForAccount(
            { id: 'admin-authorized-single', role: 'admin', name: 'System Administrator', email: rec.email || '' },
            bestAv,
            true
          );
          continue;
        }

        const recEmail = (rec.email || '').trim().toLowerCase();
        const recPhone = (rec.phone || '').replace(/[\s-+()]/g, '');
        const recMs = parseSafeDateMs(rec.updatedAt);

        for (let i = 0; i < mergedUsers.length; i++) {
          const usr = mergedUsers[i];
          const usrEmail = (usr.email || '').trim().toLowerCase();
          const usrPhone = (usr.phone || '').replace(/[\s-+()]/g, '');
          const matched =
            usr.id === rec.userId ||
            (Array.isArray(usr.legacyIds) && usr.legacyIds.includes(rec.userId)) ||
            (recEmail && usrEmail && recEmail === usrEmail) ||
            (recPhone.length >= 7 && usrPhone.length >= 7 && recPhone === usrPhone);
          if (!matched) continue;

          const usrMs = parseSafeDateMs(usr.avatarUpdatedAt);
          if (!isCustomUploadedAvatarDataUrl(usr.avatar) || (recMs > 0 && recMs >= usrMs)) {
            const updatedUsr: User = {
              ...usr,
              avatar: bestAv,
              cloudAvatarUrl: rec.cloudAvatarUrl || usr.cloudAvatarUrl,
              avatarUpdatedAt: rec.updatedAt || usr.avatarUpdatedAt,
            };
            mergedUsers[i] = updatedUsr;
            cacheUserAvatarForAccount(updatedUsr, bestAv, true);
          }
        }
      }
    }

    // 2b. Pre-index transactions in O(T) so reconciling against 10,000-50,000+ users runs in O(U + T)
    const txnsByUserKey = new Map<string, RegistrationTransaction[]>();
    const addTxnKey = (k: string | undefined | null, t: RegistrationTransaction) => {
      if (!k) return;
      const clean = k.trim().toLowerCase();
      if (!clean) return;
      const arr = txnsByUserKey.get(clean);
      if (arr) arr.push(t);
      else txnsByUserKey.set(clean, [t]);
    };
    for (let ti = 0; ti < allTxnsCombined.length; ti++) {
      const t = allTxnsCombined[ti];
      if (!t) continue;
      addTxnKey(t.userId, t);
      if (t.ownerId && t.ownerId !== t.userId) addTxnKey(t.ownerId, t);
      addTxnKey(t.userEmail, t);
      const tPhone = (t.phone || t.ownerPhone || '').replace(/[\s-+()]/g, '');
      if (tPhone.length >= 7) addTxnKey(`phone:${tPhone}`, t);
    }

    const nowReconcileMs = Date.now();
    for (let i = 0; i < mergedUsers.length; i++) {
      const usr = mergedUsers[i];
      if (
        usr.role === 'admin' ||
        usr.subscriptionStatus === 'cancelled' ||
        usr.paymentStatus === 'cancelled' ||
        (Boolean(usr.vipCancelledAt) && usr.subscriptionStatus !== 'active')
      ) {
        continue;
      }
      const usrEmail = (usr.email || '').toLowerCase().trim();
      const usrPhone = (usr.phone || '').replace(/[\s-+()]/g, '');
      const lookupKeys: string[] = [usr.id.toLowerCase()];
      if (Array.isArray(usr.legacyIds)) {
        for (const lid of usr.legacyIds) if (lid) lookupKeys.push(lid.toLowerCase());
      }
      if (usrEmail) {
        lookupKeys.push(usrEmail);
        if (usrEmail.includes('@')) {
          const slug = usrEmail.replace(/[^a-z0-9]/g, '_');
          lookupKeys.push(`user-${slug}`, `google-${slug}`, `owner-${slug}`);
        }
      }
      if (usrPhone.length >= 7) lookupKeys.push(`phone:${usrPhone}`);

      const candidateTxnMap = new Map<string, RegistrationTransaction>();
      for (let ki = 0; ki < lookupKeys.length; ki++) {
        const list = txnsByUserKey.get(lookupKeys[ki]);
        if (list) {
          for (let li = 0; li < list.length; li++) {
            const tx = list[li];
            if (tx && tx.id) candidateTxnMap.set(tx.id, tx);
          }
        }
      }
      if (candidateTxnMap.size === 0) continue;

      const userTxns = Array.from(candidateTxnMap.values());
      const verifiedFutureTxns = userTxns.filter(
        t =>
          t.status === 'verified' &&
          t.type !== 'additional_store_slot' &&
          Boolean(t.expiresAt) &&
          parseSafeDateMs(t.expiresAt) > nowReconcileMs
      );
      if (verifiedFutureTxns.length > 0) {
        verifiedFutureTxns.sort((a, b) => parseSafeDateMs(b.expiresAt) - parseSafeDateMs(a.expiresAt));
        const bestTxn = verifiedFutureTxns[0];
        const currentExpMs = parseSafeDateMs(usr.subscriptionExpiryDate);
        const txnExpMs = parseSafeDateMs(bestTxn.expiresAt);
        if (
          usr.membershipTier !== 'premium_vip' ||
          usr.subscriptionStatus !== 'active' ||
          usr.paymentStatus !== 'verified' ||
          txnExpMs > currentExpMs
        ) {
          mergedUsers[i] = {
            ...usr,
            membershipTier: 'premium_vip',
            subscriptionStatus: 'active',
            subscriptionStartDate: usr.subscriptionStartDate || bestTxn.verifiedAt || bestTxn.createdAt,
            subscriptionExpiryDate: bestTxn.expiresAt,
            vipStatus: 'active',
            vipExpiresAt: bestTxn.expiresAt,
            vipCancelledAt: undefined,
            paymentStatus: 'verified',
            paymentMethod: (bestTxn.paymentMethod as any) || usr.paymentMethod || 'KHQR',
            transactionRef: bestTxn.transactionRef || usr.transactionRef,
          };
        }
      }

      if (mergedUsers[i].membershipTier !== 'premium_vip') {
        const pendingVipTxn = userTxns.find(t => t.status === 'pending_verification');
        if (pendingVipTxn && mergedUsers[i].paymentStatus !== 'verified') {
          mergedUsers[i] = {
            ...mergedUsers[i],
            paymentStatus: 'pending_verification',
            subscriptionStatus: mergedUsers[i].subscriptionStatus || 'pending',
            transactionRef: pendingVipTxn.transactionRef || mergedUsers[i].transactionRef,
          };
        }
      }

      const verifiedAdditionalStoreTxns = userTxns.filter(
        t => t.type === 'additional_store_slot' && t.status === 'verified'
      );
      {
        const uniqueVerifiedRefs = new Set(verifiedAdditionalStoreTxns.map(t => t.id));
        const slotCount = uniqueVerifiedRefs.size;
        const currentIds: string[] = Array.isArray(mergedUsers[i].additionalStorePaymentIds)
          ? (mergedUsers[i].additionalStorePaymentIds as string[])
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
    let cloudHadDeprecatedSeedTxns = false;
    if (Array.isArray(cloudTxns)) {
      for (const t of cloudTxns) {
        if (isDeprecatedDemoSeedTransaction(t)) {
          cloudHadDeprecatedSeedTxns = true;
          continue;
        }
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
      if (
        !t ||
        !t.id ||
        isDeprecatedDemoSeedTransaction(t) ||
        deletedTxnIdSet.has(t.id) ||
        isActivityUserDeleted(t.userId || t.ownerId, t.userEmail, t.phone)
      ) {
        continue;
      }
      const existing = txnMap.get(t.id);
      if (!existing) {
        txnMap.set(t.id, t);
      } else {
        const bestProofUrl =
          t.paymentProofUrl?.startsWith('data:image/')
            ? t.paymentProofUrl
            : existing.paymentProofUrl?.startsWith('data:image/')
            ? existing.paymentProofUrl
            : t.paymentProofUrl || existing.paymentProofUrl;
        if (existing.status === 'rejected' || t.status === 'rejected') {
          const rejSource = existing.status === 'rejected' ? existing : t;
          txnMap.set(t.id, {
            ...existing,
            ...t,
            status: 'rejected',
            notes: (rejSource as any).rejectionReason || rejSource.notes || 'Admin cancelled VIP membership',
            paymentProofUrl: bestProofUrl,
          });
        } else if (existing.status !== 'pending_verification' && t.status === 'pending_verification') {
          txnMap.set(t.id, { ...existing, paymentProofUrl: bestProofUrl });
        } else {
          txnMap.set(t.id, { ...existing, ...t, paymentProofUrl: bestProofUrl });
        }
      }
    }
    const mergedTransactions = Array.from(txnMap.values()).sort(
      (a, b) => parseSafeDateMs(b.createdAt) - parseSafeDateMs(a.createdAt)
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

    let preUpdateCustomRests: Restaurant[] = [];
    try {
      if (typeof localStorage !== 'undefined') {
        const rawPreUpdate = localStorage.getItem('kft_pre_update_db_backup_v1');
        if (rawPreUpdate) {
          const parsedPreUpdate = JSON.parse(rawPreUpdate);
          if (Array.isArray(parsedPreUpdate?.customRestaurants)) {
            preUpdateCustomRests = parsedPreUpdate.customRestaurants;
          }
        }
      }
    } catch {}

    const candidateLocalCustomRests: Restaurant[] = [
      ...preUpdateCustomRests,
      ...(Array.isArray(localState.customRestaurants) ? localState.customRestaurants : []),
    ];

    for (const r of candidateLocalCustomRests) {
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
          const isRealHttpPhoto = (u?: string) =>
            Boolean(u && (u.startsWith('https://') || u.startsWith('http://') || u.startsWith('/')));
          const bestPhoto =
            localMs >= existingMs
              ? (r.photoUrl && r.photoUrl.trim().length > 0 ? r.photoUrl : existing.photoUrl || r.photoUrl || '')
              : isRealHttpPhoto(existing.photoUrl)
              ? existing.photoUrl
              : isRealHttpPhoto(r.photoUrl)
              ? r.photoUrl
              : existing.photoUrl || r.photoUrl || '';
          const bestThumb =
            localMs >= existingMs
              ? r.thumbnailUrl || existing.thumbnailUrl || (isRealHttpPhoto(bestPhoto) ? bestPhoto : undefined)
              : existing.thumbnailUrl || r.thumbnailUrl || (isRealHttpPhoto(bestPhoto) ? bestPhoto : undefined);
          restMap.set(r.id, {
            ...base,
            menuItems: bestMenuItems,
            photoUrl: bestPhoto,
            thumbnailUrl: bestThumb,
            profileImage: base.profileImage && base.profileImage.trim().length > 0 ? base.profileImage : bestPhoto,
            updatedAt: localMs >= existingMs ? (r.updatedAt || existing.updatedAt) : (existing.updatedAt || r.updatedAt),
            photoUpdatedAt: localMs >= existingMs ? (r.photoUpdatedAt || existing.photoUpdatedAt) : (existing.photoUpdatedAt || r.photoUpdatedAt),
          });
        }
      }
    }
    const mergedCustomRestaurants = Array.from(restMap.values()).map((r) => {
      const biz = inferBusinessTypeAndCategory(r);
      const isUG = isUniqueGrillRestaurant({ id: r.id, name: r.nameKh, nameEn: r.nameEn });
      let resolvedPhoto = (
        r.photoUrl ||
        r.profileImage ||
        r.pendingUpgradeRequest?.proposedChanges?.photoUrl ||
        r.pendingPhotoReplacement?.newPhotoUrl ||
        ''
      ).trim();
      let resolvedThumb = (r.thumbnailUrl || '').trim();
      if (!resolvedPhoto) {
        const remembered = getRememberedCloudUrlForEntity(r.id);
        if (remembered?.url) {
          resolvedPhoto = remembered.url;
          resolvedThumb = remembered.thumbnailUrl || remembered.url;
        } else if (isUG) {
          resolvedPhoto = getUniqueGrillFallbackPhotoUrl(r.id);
          resolvedThumb = resolvedPhoto;
        }
      }
      return {
        ...r,
        ownerEmail: r.ownerEmail || (isUG ? 'igp2026d@gmail.com' : r.ownerEmail),
        ownerName: r.ownerName || (isUG ? 'Igp2026d' : r.ownerName),
        photoUrl: resolvedPhoto || r.photoUrl,
        profileImage: (r.profileImage || '').trim() || resolvedPhoto || r.profileImage,
        thumbnailUrl: resolvedThumb || (resolvedPhoto.startsWith('https://') ? resolvedPhoto : r.thumbnailUrl),
        businessType: biz.businessType,
        businessCategory: biz.businessCategory,
        categoryKh: biz.categoryKh,
        categoryEn: biz.categoryEn,
      };
    });

    // 4b. Merge Support Tickets (`kft_cloud_support_tickets_v1`) so user/tester messages & Admin replies sync across devices
    const ticketMap = new Map<string, SupportTicket>();
    for (const ct of Array.isArray(cloudTickets) ? cloudTickets : []) {
      if (ct && ct.id) ticketMap.set(ct.id, ct);
    }
    for (const lt of Array.isArray(localState.supportTickets) ? localState.supportTickets : []) {
      if (!lt || !lt.id) continue;
      const existing = ticketMap.get(lt.id);
      if (!existing) {
        ticketMap.set(lt.id, lt);
      } else {
        const msgMap = new Map<string, any>();
        for (const m of [...(existing.messages || []), ...(lt.messages || [])]) {
          if (m && m.id) msgMap.set(m.id, m);
        }
        const exUpd = parseSafeDateMs(existing.updatedAt || existing.createdAt);
        const ltUpd = parseSafeDateMs(lt.updatedAt || lt.createdAt);
        const newerBase = ltUpd >= exUpd ? { ...existing, ...lt } : { ...lt, ...existing };
        ticketMap.set(lt.id, {
          ...newerBase,
          vipApproved: Boolean(existing.vipApproved || lt.vipApproved),
          vipApprovedAt: lt.vipApprovedAt || existing.vipApprovedAt,
          messages: Array.from(msgMap.values()),
        });
      }
    }
    const mergedSupportTickets = Array.from(ticketMap.values()).sort(
      (a, b) => parseSafeDateMs(b.updatedAt || b.createdAt) - parseSafeDateMs(a.updatedAt || a.createdAt)
    );

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
    // Scale Optimization (10,000+ users): Regular user devices ONLY sync their own atomic kft_user_<id> record below, never uploading the entire user list!
    // Never rewrite the central list unless the PRIMARY database actually answered our read (a failed/402 read
    // used to look like "no users" and let a tiny local list overwrite the real one).
    if (
      isAdminDevice &&
      mergedUsers.length <= 2500 &&
      wasCloudPullOk('kft_cloud_users_v2') &&
      mergedUsersSig !== safeJsonSig(cloudUsersV2)
    ) {
      pushPromises.push(pushCloudDocument('kft_cloud_users_v2', mergedUsers));
    }
    if (
      isAdminDevice &&
      wasCloudPullOk('kft_cloud_deleted_users_v1') &&
      safeJsonSig(mergedDeletedUsers) !== safeJsonSig(cloudDeletedUsers || [])
    ) {
      pushPromises.push(pushCloudDocument('kft_cloud_deleted_users_v1', mergedDeletedUsers));
    }
    if (
      (isAdminDevice || Boolean(localState.currentUser) || cloudHadDeprecatedSeedTxns) &&
      safeJsonSig(mergedTransactions) !== safeJsonSig(cloudTxns || [])
    ) {
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
    if (
      (isAdminDevice || Boolean(localState.currentUser) || (Array.isArray(localState.supportTickets) && localState.supportTickets.length > 0)) &&
      safeJsonSig(mergedSupportTickets) !== safeJsonSig(cloudTickets || [])
    ) {
      pushPromises.push(pushCloudDocument('kft_cloud_support_tickets_v1', mergedSupportTickets));
    }

    // Ensure active user(s) have an up-to-date atomic `kft_user_<id>` record in Cloud without write-back storms (capped at 12 per cycle for 10,000+ user scale)
    const currentCanonicalId = localState.currentUser ? getCanonicalUserId(localState.currentUser) : null;
    let atomicBackfillCount = 0;
    // Legacy users that exist only inside the old whole-list document get an atomic row progressively
    // (12 per cycle). On a FULL pull we recompute who is missing; in delta mode we continue the saved list.
    let pendingBackfill: Set<string> = new Set(readAtomicBackfillPending());
    if (isAdminDevice && !userDeltaMode && shouldPullAllAtomicUsers && wasPrefixPullComplete(USER_RECORD_PREFIX)) {
      pendingBackfill = new Set(
        mergedUsers.filter((u) => !existingAtomicMap.has(`${USER_RECORD_PREFIX}${u.id}`)).map((u) => u.id)
      );
    }
    for (const u of mergedUsers) {
      const isActiveLocalUser = Boolean(
        localState.currentUser && (u.id === localState.currentUser.id || u.id === currentCanonicalId)
      );
      if (!isActiveLocalUser) {
        if (isSupabaseEgressCooldownActive() || !shouldFetchHeavyAdminVaults || atomicBackfillCount >= 12) {
          continue;
        }
        if (userDeltaMode && !pendingBackfill.has(u.id)) continue;
      }
      const atomicKey = `${USER_RECORD_PREFIX}${u.id}`;
      const existingAtomic = existingAtomicMap.get(atomicKey);
      if (!existingAtomic || safeJsonSig(existingAtomic) !== safeJsonSig(u)) {
        pushPromises.push(pushCloudDocument(atomicKey, u));
        if (!isActiveLocalUser) {
          atomicBackfillCount++;
          pendingBackfill.delete(u.id);
        }
      }
    }
    if (isAdminDevice) writeAtomicBackfillPending(Array.from(pendingBackfill).slice(0, 5000));

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
      mergedSupportTickets,
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
      mergedTransactions: Array.isArray(localState.transactions) ? localState.transactions : [],
      mergedCustomRestaurants: Array.isArray(localState.customRestaurants) ? localState.customRestaurants : [],
      mergedSupportTickets: Array.isArray(localState.supportTickets) ? localState.supportTickets : [],
      mergedPaymentProofsVault: localState.paymentProofsVault,
      mergedAppSettings: localState.appSettings,
    };
  }
}

/**
 * SQL Script for 1-Click Setup in Supabase SQL Editor (Free Tier)
 */
export const SUPABASE_SETUP_SQL = `-- ============================================================================
-- Cambodia Flavors & Tourism (v1.7.5) — Supabase Free Tier Cloud Database Setup
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

-- Optional: Public Cloud Storage Bucket for Food, Shop & Tourism Media
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-media', 'food-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public read and upload on food-media" ON storage.objects;
CREATE POLICY "Allow public read and upload on food-media"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'food-media')
  WITH CHECK (bucket_id = 'food-media');
`;
