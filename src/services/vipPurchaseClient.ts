/**
 * Client of the `vip-purchase` Edge Function: the SERVER reads the payment receipt and (only on a clean pass) activates VIP.
 * "unavailable" (not deployed / not configured / unreachable / odd answer) tells the caller to use the legacy on-device
 * check, so nothing breaks before or during the roll-out.
 */
import { getCloudApiConfig } from './supabaseService';

export interface ServerVipGrant {
  startIso: string;
  expiryIso: string;
  days: number;
  planType: string;
  trxId: string;
}

export type ServerPurchaseOutcome =
  | { kind: 'verified'; report: Record<string, unknown>; grant: ServerVipGrant }
  | { kind: 'pending'; report: Record<string, unknown> }
  | { kind: 'rejected'; report: Record<string, unknown> }
  | { kind: 'unavailable' };

export async function verifyVipPurchaseOnServer(params: {
  userId: string;
  durationDays: number;
  receiptDataUrl: string;
  submittedTrxId?: string;
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
