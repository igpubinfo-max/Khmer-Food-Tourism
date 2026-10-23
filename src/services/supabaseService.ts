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

import { User, Restaurant, TouristDestination, RegistrationTransaction, isSeedRestaurantId } from '../types';

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
          ? 'gemini_direct'
          : 'none',
        backendEndpointUrl: updated.aiVisionBackendUrl,
        apiKey: updated.geminiApiKey,
        modelName: 'gemini-2.5-flash',
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
export async function pushCloudDocument(key: string, payload: any): Promise<boolean> {
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
    }, 4000);
    return res.ok;
  } catch (err) {
    console.warn(`Supabase pushCloudDocument(${key}) error:`, err);
    return false;
  }
}

/**
 * Pull a shared key-value document from Supabase `kft_app_kv_store` table.
 */
export async function pullCloudDocument<T>(key: string): Promise<T | null> {
  if (!isSupabaseConfigured()) return null;
  const cfg = getCloudApiConfig();

  try {
    const res = await fetchWithTimeout(
      `${cfg.supabaseUrl}/rest/v1/kft_app_kv_store?key=eq.${encodeURIComponent(key)}&select=payload,updated_at&limit=1`,
      {
        method: 'GET',
        headers: getSupabaseHeaders(false),
      },
      3500
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
 * Synchronize Users, Transactions, Payment Proofs Vault, and Custom/Cached Restaurants
 * between this device and Supabase Cloud.
 */
export async function syncAllAppDataWithSupabase(localState: {
  users: User[];
  transactions: RegistrationTransaction[];
  customRestaurants: Restaurant[];
  customDestinations?: TouristDestination[];
  paymentProofsVault: Record<string, any>;
}): Promise<{
  synced: boolean;
  mergedUsers: User[];
  mergedTransactions: RegistrationTransaction[];
  mergedCustomRestaurants: Restaurant[];
  mergedPaymentProofsVault: Record<string, any>;
}> {
  if (!isSupabaseConfigured()) {
    return {
      synced: false,
      mergedUsers: localState.users,
      mergedTransactions: localState.transactions,
      mergedCustomRestaurants: localState.customRestaurants,
      mergedPaymentProofsVault: localState.paymentProofsVault,
    };
  }

  try {
    // 1. Pull existing cloud records
    const [cloudUsers, cloudTxns, cloudRests, cloudProofs] = await Promise.all([
      pullCloudDocument<User[]>('kft_cloud_users_v1'),
      pullCloudDocument<RegistrationTransaction[]>('kft_cloud_transactions_v1'),
      pullCloudDocument<Restaurant[]>('kft_cloud_custom_restaurants_v1'),
      pullCloudDocument<Record<string, any>>('kft_cloud_payment_proofs_v1'),
    ]);

    // 2. Merge Users by ID (prefer VIP active / most recent status)
    const userMap = new Map<string, User>();
    if (Array.isArray(cloudUsers)) {
      for (const u of cloudUsers) {
        if (u && u.id) userMap.set(u.id, u);
      }
    }
    for (const u of localState.users) {
      if (!u || !u.id) continue;
      const existing = userMap.get(u.id);
      if (!existing) {
        userMap.set(u.id, u);
      } else {
        // If either cloud or local was upgraded to VIP by Admin, preserve VIP status
        const isCloudVip = existing.membershipTier === 'premium_vip' || existing.subscriptionStatus === 'active';
        const isLocalVip = u.membershipTier === 'premium_vip' || u.subscriptionStatus === 'active';
        if (isCloudVip && !isLocalVip) {
          userMap.set(u.id, existing);
        } else {
          userMap.set(u.id, { ...existing, ...u });
        }
      }
    }
    const mergedUsers = Array.from(userMap.values());

    // 3. Merge Transactions by ID
    const txnMap = new Map<string, RegistrationTransaction>();
    if (Array.isArray(cloudTxns)) {
      for (const t of cloudTxns) {
        if (t && t.id) txnMap.set(t.id, t);
      }
    }
    for (const t of localState.transactions) {
      if (!t || !t.id) continue;
      const existing = txnMap.get(t.id);
      if (!existing) {
        txnMap.set(t.id, t);
      } else {
        // Prefer verified/rejected/needs_more_info over pending_verification
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

    // 4. Merge Custom & Google Maps Smart-Cached Restaurants by ID (excluding built-in rest-1..220 seeds)
    const restMap = new Map<string, Restaurant>();
    if (Array.isArray(cloudRests)) {
      for (const r of cloudRests) {
        if (r && r.id && !isSeedRestaurantId(String(r.id))) {
          restMap.set(r.id, r);
        }
      }
    }
    for (const r of localState.customRestaurants) {
      if (r && r.id && !isSeedRestaurantId(String(r.id))) {
        restMap.set(r.id, { ...(restMap.get(r.id) || {}), ...r });
      }
    }
    const mergedCustomRestaurants = Array.from(restMap.values());

    // 5. Merge Payment Proofs Vault
    const mergedPaymentProofsVault: Record<string, any> = {
      ...(cloudProofs || {}),
      ...(localState.paymentProofsVault || {}),
    };

    // 6. Push merged state back to Supabase Cloud
    await Promise.all([
      pushCloudDocument('kft_cloud_users_v1', mergedUsers),
      pushCloudDocument('kft_cloud_transactions_v1', mergedTransactions),
      pushCloudDocument('kft_cloud_custom_restaurants_v1', mergedCustomRestaurants),
      pushCloudDocument('kft_cloud_payment_proofs_v1', mergedPaymentProofsVault),
    ]);

    return {
      synced: true,
      mergedUsers,
      mergedTransactions,
      mergedCustomRestaurants,
      mergedPaymentProofsVault,
    };
  } catch (err) {
    console.warn('Supabase syncAllAppDataWithSupabase error:', err);
    return {
      synced: false,
      mergedUsers: localState.users,
      mergedTransactions: localState.transactions,
      mergedCustomRestaurants: localState.customRestaurants,
      mergedPaymentProofsVault: localState.paymentProofsVault,
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
