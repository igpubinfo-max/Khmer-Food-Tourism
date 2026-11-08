/**
 * Client of the `vip-purchase` Edge Function:
 *   1. `claimConsumerTrialOnServer`: activates the 1-time 7-Day Consumer Free Trial (Android/Web only) with
 *      Two-Line Anti-Abuse protection (normalized Gmail/+855 Phone SHA-256 OR salted Device SHA-256).
 *   2. `verifyVipPurchaseOnServer`: server-side ABA/KHQR receipt check for ALL Consumer VIP & Shop plans.
 *
 * "unavailable" (not deployed / unreachable / unexpected response) lets the caller fall back safely during roll-out.
 */
import { getCloudApiConfig } from './supabaseService';

export interface ServerVipGrant {
  startIso: string;
  expiryIso: string;
  days: number;
  planType: string;
  trxId: string;
  planId?: string;
  shopId?: string;
  category?: 'consumer' | 'shop';
}

export type ServerPurchaseOutcome =
  | { kind: 'verified'; report: Record<string, unknown>; grant: ServerVipGrant }
  | { kind: 'pending'; report: Record<string, unknown> }
  | { kind: 'rejected'; report: Record<string, unknown> }
  | { kind: 'unavailable' };

export type ServerTrialClaimOutcome =
  | { kind: 'granted'; grant: ServerVipGrant }
  | {
      kind: 'already_claimed';
      reason: string;
      messageKh: string;
      messageEn: string;
    }
  | { kind: 'unavailable' };

export async function verifyVipPurchaseOnServer(params: {
  userId: string;
  durationDays: number;
  receiptDataUrl: string;
  submittedTrxId?: string;
  planId?: string;
  shopId?: string;
  email?: string;
  phone?: string;
  deviceHash?: string | null;
  identityHashes?: string[];
}): Promise<ServerPurchaseOutcome> {
  const cfg = getCloudApiConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || typeof fetch === 'undefined') return { kind: 'unavailable' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000); // vision model + database writes
  try {
    const res = await fetch(`${cfg.supabaseUrl.replace(/\/+$/, '')}/functions/v1/vip-purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        'x-kft-user-id': params.userId,
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    if (res.headers.get('x-vip-purchase') !== '1' || res.status !== 200) return { kind: 'unavailable' };
    const data = await res.json().catch(() => null);
    if (!data || data.ok !== true || !data.report || typeof data.report !== 'object') return { kind: 'unavailable' };
    if (data.decision === 'verified' && data.grant && typeof data.grant.expiryIso === 'string') {
      return { kind: 'verified', report: data.report, grant: data.grant as ServerVipGrant };
    }
    if (data.decision === 'rejected') return { kind: 'rejected', report: data.report };
    return { kind: 'pending', report: data.report };
  } catch {
    return { kind: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

export async function claimConsumerTrialOnServer(params: {
  userId: string;
  email?: string;
  phone?: string;
  deviceHash?: string | null;
  identityHashes?: string[];
  platform?: 'android' | 'web' | 'ios';
}): Promise<ServerTrialClaimOutcome> {
  const cfg = getCloudApiConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || typeof fetch === 'undefined') return { kind: 'unavailable' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${cfg.supabaseUrl.replace(/\/+$/, '')}/functions/v1/vip-purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        'x-kft-user-id': params.userId,
      },
      body: JSON.stringify({
        action: 'claim_trial',
        ...params,
      }),
      signal: controller.signal,
    });
    if (res.headers.get('x-vip-purchase') !== '1' || res.status !== 200) return { kind: 'unavailable' };
    const data = await res.json().catch(() => null);
    if (!data || data.ok !== true) return { kind: 'unavailable' };
    if (data.decision === 'trial_granted' && data.grant && typeof data.grant.expiryIso === 'string') {
      return { kind: 'granted', grant: data.grant as ServerVipGrant };
    }
    if (data.decision === 'already_claimed') {
      return {
        kind: 'already_claimed',
        reason: String(data.reason || 'claimed'),
        messageKh:
          typeof data.messageKh === 'string' && data.messageKh
            ? data.messageKh
            : 'ការសាកល្បងឥតគិតថ្លៃ 7 ថ្ងៃត្រូវបានប្រើរួចហើយ។',
        messageEn:
          typeof data.messageEn === 'string' && data.messageEn
            ? data.messageEn
            : 'The one-time 7-day free trial has already been used.',
      };
    }
    return { kind: 'unavailable' };
  } catch {
    return { kind: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}
