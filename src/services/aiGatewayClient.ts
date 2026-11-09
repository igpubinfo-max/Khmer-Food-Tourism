import { getAppAttestationHeaders, isAppCloneTampered } from '../utils/appCloneIntegrityGuard';
/**
 * Minimal client for the `food-ai` Edge Function (Gemini / OpenAI gateway) for callers outside the food assistant
 * (e.g. payment-receipt reading). The AI keys live in Supabase secrets; the request carries the user id so the server
 * can apply that user's daily quota. Never throws.
 */
import { getApiUserId } from '../utils/apiIdentity';
import { getCloudApiConfig } from './supabaseService';

export type AiGatewayResult =
  | { ok: true; json: any }
  | { ok: false; reason: 'unavailable' | 'quota' | 'forbidden' | 'error'; status?: number };

export async function callAiGateway(
  model: string,
  body: unknown,
  opts: { timeoutMs?: number; purpose?: 'payment' } = {}
): Promise<AiGatewayResult> {
  if (isAppCloneTampered()) return { ok: false, reason: 'forbidden', status: 403 };
  const cfg = getCloudApiConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || typeof fetch === 'undefined') return { ok: false, reason: 'unavailable' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20000);
  try {
    const userId = getApiUserId();
    const res = await fetch(`${cfg.supabaseUrl.replace(/\/+$/, '')}/functions/v1/food-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        ...(userId ? { 'x-kft-user-id': userId } : {}),
        ...(opts.purpose ? { 'x-kft-purpose': opts.purpose } : {}),
        ...getAppAttestationHeaders(),
      },
      body: JSON.stringify({ model, body }),
      signal: controller.signal,
    });
    if (res.headers.get('x-food-ai-proxy') !== '1' || res.status === 503) return { ok: false, reason: 'unavailable', status: res.status };
    if (res.status === 429) return { ok: false, reason: 'quota', status: 429 };
    if (res.status === 401 || res.status === 403) return { ok: false, reason: 'forbidden', status: res.status };
    if (!res.ok) return { ok: false, reason: 'error', status: res.status };
    return { ok: true, json: await res.json() };
  } catch {
    return { ok: false, reason: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}
