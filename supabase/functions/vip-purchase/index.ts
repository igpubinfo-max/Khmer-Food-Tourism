// Supabase Edge Function: vip-purchase
// Server-side check of an ABA / KHQR payment receipt and - ONLY when every check passes - activation of VIP.
// The VIP entitlement is written to the user's `kft_user_<id>` row with the SERVICE ROLE, so it no longer depends on
// anything the (modifiable) app says. Receipts are recorded in kft_payment_receipts with a UNIQUE image hash and a
// UNIQUE verified Trx ID, so a receipt can never be used twice.
//
// DEFAULT = MANUAL APPROVAL: nothing is activated automatically. Every receipt is stored as `pending` together with the
// AI pre-check (recipient / amount / date / Trx ID, all shown to the admin), and the admin approves it after matching the
// Trx ID + amount against the REAL bank statement in the ABA account - a forged screenshot can therefore never grant VIP.
// Auto-activation exists but is OFF unless the secret VIP_AUTO_APPROVE=true is set (not recommended with screenshot-only proof).
//
// Deploy:  supabase functions deploy vip-purchase --no-verify-jwt --project-ref ryvltobwuwuulazqjnza
// Needs:   GEMINI_API_KEY (already set), supabase_vip_security_v1.sql (receipt ledger)
//
// POST { userId, durationDays, receiptDataUrl, submittedTrxId? }
//   -> { ok, decision: 'verified'|'pending'|'rejected', report, grant?: {startIso, expiryIso, days, planType, trxId} }

import { geminiEndpoints, shouldTryNextEndpoint } from '../food-ai/endpoint.ts';
import { WindowLimiter, envInt, safeUserId, userKvKey } from '../_shared/common.ts';
import {
  applyVipGrant,
  buildReport,
  computeVipWindow,
  evaluateReceipt,
  resolvePlan,
  type ExtractedReceipt,
  type ReceiptDecision,
} from '../_shared/receipt-rules.ts';
import { background, logUsage, readUserDoc, restInsert, restPatch, restSelectRows, usageHit, writeKv } from '../_shared/supa.ts';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kft-user-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'x-vip-purchase',
  'x-vip-purchase': '1',
};
const burst = new WindowLimiter(6, 60_000);
const MAX_BODY = 7 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  return req.headers.get('cf-connecting-ip') || fwd.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

const PROMPT = `Analyze this Cambodian ABA Bank / KHQR payment receipt image and return ONLY a JSON object with these exact keys:
{
  "isAbaReceipt": boolean,
  "trxId": string or null (the Trx. ID / Reference number printed on the receipt),
  "amountUsd": number or null (the numeric payment amount, positive, e.g. 4.99),
  "currency": "USD" or "KHR",
  "recipientName": string or null (the recipient account name shown on the receipt),
  "recipientAccount": string or null (the "To account" number),
  "transactionDate": string or null (the "Transaction date" exactly as printed, e.g. "Oct 23, 2025 06:31 PM"),
  "senderName": string or null (the "From" name)
}
Read ONLY what is printed. Never guess or invent a value; use null when it is not visible.`;

async function extractWithGemini(apiKey: string, mime: string, b64: string): Promise<ExtractedReceipt | null> {
  for (const model of MODELS) {
    for (const t of geminiEndpoints(apiKey, model)) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25_000);
      try {
        const res = await fetch(t.url, {
          method: 'POST',
          headers: t.headers,
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: PROMPT }, { inlineData: { mimeType: mime, data: b64 } }] }],
            generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 800 },
          }),
        });
        if (res.status === 200) {
          const data = await res.json();
          const text = (data?.candidates?.[0]?.content?.parts || []).filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought).map((p: { text: string }) => p.text).join('');
          const m = /\{[\s\S]*\}/.exec(text);
          if (!m) continue;
          const p = JSON.parse(m[0]);
          const num = typeof p.amountUsd === 'number' ? Math.abs(p.amountUsd) : p.amountUsd ? Math.abs(parseFloat(String(p.amountUsd))) : undefined;
          return {
            isAbaReceipt: Boolean(p.isAbaReceipt),
            trxId: p.trxId ? String(p.trxId).trim() : undefined,
            amountUsd: num !== undefined && Number.isFinite(num) ? num : undefined,
            currency: p.currency ? String(p.currency) : 'USD',
            recipientName: p.recipientName ? String(p.recipientName).trim() : undefined,
            recipientAccount: p.recipientAccount ? String(p.recipientAccount).trim() : undefined,
            transactionDate: p.transactionDate ? String(p.transactionDate).trim() : undefined,
            senderName: p.senderName ? String(p.senderName).trim() : undefined,
          };
        }
        if (!shouldTryNextEndpoint(res.status)) break;
      } catch {
        /* timeout / parse error -> next */
      } finally {
        clearTimeout(timer);
      }
    }
  }
  return null;
}

function parseDataUrl(s: unknown): { mime: string; b64: string; bytes: Uint8Array } | null {
  if (typeof s !== 'string') return null;
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(s.replace(/\s+/g, ''));
  if (!m) return null;
  try {
    const bin = atob(m[2]);
    if (bin.length > MAX_IMAGE_BYTES || bin.length < 2000) return null;
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { mime: m[1], b64: m[2], bytes };
  } catch {
    return null;
  }
}

async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) return json(503, { ok: false, error: 'NOT_CONFIGURED' });

  const started = Date.now();
  const ip = clientIp(req);
  if (!burst.allow(ip)) return json(429, { ok: false, error: 'RATE_LIMITED' });
  if (Number(req.headers.get('content-length') || '0') > MAX_BODY) return json(413, { ok: false, error: 'TOO_LARGE' });

  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return json(413, { ok: false, error: 'TOO_LARGE' });
    body = JSON.parse(text);
  } catch {
    return json(400, { ok: false, error: 'BAD_REQUEST' });
  }

  const userId = safeUserId(body.userId);
  if (!userId) return json(400, { ok: false, error: 'BAD_USER' });
  const img = parseDataUrl(body.receiptDataUrl);
  if (!img) return json(400, { ok: false, error: 'BAD_IMAGE' });

  const used = await usageHit(userId, 'vip_purchase', 1);
  if (used !== null && used > envInt(Deno.env.get('VIP_PURCHASE_DAILY_LIMIT'), 8, 1, 100)) {
    return json(429, { ok: false, error: 'DAILY_LIMIT' });
  }

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const [userDoc, pricing] = await Promise.all([readUserDoc(userKvKey(userId)), readUserDoc('kft_cloud_admin_vip_pricing_v2')]);
  const plan = resolvePlan(pricing as Record<string, number> | null, typeof body.durationDays === 'number' ? body.durationDays : Number(body.durationDays));
  if (!plan) return json(400, { ok: false, error: 'UNKNOWN_PLAN' });

  const imageHash = await sha256Bytes(img.bytes);
  const finish = (decision: ReceiptDecision, extra: Record<string, unknown>): Response => {
    background(logUsage({ user_key: userId, kind: 'vip_purchase', provider: 'gemini', status: decision === 'verified' ? 200 : 202, ms: Date.now() - started, note: decision }));
    return json(200, { ok: true, decision, ...extra });
  };

  // Same screenshot seen before? (anti-replay, enforced by a UNIQUE index too)
  const seen = await restSelectRows(`kft_payment_receipts?image_hash=eq.${imageHash}&select=status,user_id&limit=1`);
  if (seen && seen[0]) {
    const report = buildReport({
      decision: 'rejected', evaluation: null, extracted: null, duplicate: true, nowIso,
      noteKh: '❌ វិក្កយបត្រនេះត្រូវបានប្រើរួចហើយ',
      noteEn: '❌ This receipt screenshot has already been used.',
    });
    return finish('rejected', { report });
  }

  const extracted = await extractWithGemini(geminiKey, img.mime, img.b64);
  if (!extracted) {
    await restInsert('kft_payment_receipts', { user_id: userId, image_hash: imageHash, plan_days: plan.days, amount_usd: plan.priceUsd, status: 'pending', reasons: ['ai_unavailable'] });
    const report = buildReport({
      decision: 'pending', evaluation: null, extracted: null, duplicate: false, nowIso,
      noteKh: '⏳ បានទទួលវិក្កយបត្រ។ រដ្ឋបាលនឹងផ្ទៀងផ្ទាត់ និងបើក VIP ជូនលោកអ្នក។',
      noteEn: '⏳ Receipt received. An administrator will verify it and activate your VIP.',
    });
    return finish('pending', { report });
  }

  const evaluation = evaluateReceipt({ extracted, expectedAmountUsd: plan.priceUsd, expectedDays: plan.days, submittedTrxId: typeof body.submittedTrxId === 'string' ? body.submittedTrxId : '', nowMs });

  // Trx ID already claimed (verified OR still pending) by another submission? One payment can fund one VIP only.
  let dupTrx = false;
  if (evaluation.trxKey) {
    const rows = await restSelectRows(`kft_payment_receipts?trx_key=eq.${encodeURIComponent(evaluation.trxKey)}&status=in.(verified,pending)&select=id&limit=1`);
    dupTrx = Boolean(rows && rows[0]);
  }
  const autoApprove = Deno.env.get('VIP_AUTO_APPROVE') === 'true';

  const baseRow = { user_id: userId, image_hash: imageHash, trx_key: evaluation.trxKey || null, amount_usd: extracted.amountUsd ?? null, plan_days: plan.days, extracted };

  if (autoApprove && evaluation.allPassed && !dupTrx && userDoc && typeof userDoc === 'object') {
    const win = computeVipWindow((userDoc as Record<string, unknown>).subscriptionExpiryDate, plan.days, nowMs);
    const grant = { startIso: win.startIso, expiryIso: win.expiryIso, days: plan.days, planType: plan.planType, trxId: evaluation.trxKey };
    // reserve the receipt FIRST: the unique indexes make a double-spend impossible even under concurrent requests
    const ins = await restInsert('kft_payment_receipts', { ...baseRow, status: 'verified', grant_info: grant });
    if (ins.status === 409) {
      const report = buildReport({ decision: 'rejected', evaluation, extracted, duplicate: true, nowIso, noteKh: '❌ វិក្កយបត្រ ឬលេខប្រតិបត្តិការនេះត្រូវបានប្រើរួចហើយ', noteEn: '❌ This receipt or Trx. ID has already been used.' });
      return finish('rejected', { report });
    }
    if (ins.status >= 200 && ins.status < 300) {
      const ok = await writeKv(userKvKey(userId), applyVipGrant(userDoc as Record<string, unknown>, grant));
      if (ok) {
        const report = buildReport({
          decision: 'verified', evaluation, extracted, duplicate: false, nowIso,
          noteKh: `✅ ផ្ទៀងផ្ទាត់ 100%៖ អ្នកទទួលត្រឹមត្រូវ ចំនួន $${plan.priceUsd.toFixed(2)} USD លេខប្រតិបត្តិការ (${evaluation.trxKey}) ហើយ VIP ត្រូវបានបើក!`,
          noteEn: `✅ 100% verified: recipient, amount $${plan.priceUsd.toFixed(2)} USD, Trx. ID (${evaluation.trxKey}) and date. VIP activated!`,
        });
        return finish('verified', { report, grant });
      }
      // the VIP write failed: do not keep a "verified" receipt that granted nothing
      await restPatch(`kft_payment_receipts?image_hash=eq.${imageHash}`, { status: 'pending', reasons: ['grant_write_failed'] });
    }
  }

  // Not a clean pass -> keep for the admin. A recipient/amount/date mismatch or a duplicate is "rejected", anything else pending.
  const hardFail = dupTrx || (extracted.isAbaReceipt && (!evaluation.checks.recipient.passed || !evaluation.checks.amount.passed || !evaluation.checks.date.passed));
  const decision: ReceiptDecision = hardFail ? 'rejected' : 'pending';
  const readyForAdmin = decision === 'pending' && evaluation.allPassed && !dupTrx;
  await restInsert('kft_payment_receipts', {
    ...baseRow,
    status: decision === 'rejected' ? 'rejected' : 'pending',
    reasons: readyForAdmin ? ['ai_checks_passed_awaiting_admin_statement_check'] : Object.entries(evaluation.checks).filter(([, c]) => !c.passed).map(([k]) => k).concat(dupTrx ? ['duplicate_trx'] : []),
  });
  const failedKh = Object.values(evaluation.checks).filter((c) => !c.passed).map((c) => c.reasonKh).join(' | ');
  const failedEn = Object.values(evaluation.checks).filter((c) => !c.passed).map((c) => c.reasonEn).join(' | ');
  const report = buildReport({
    decision, evaluation, extracted, duplicate: dupTrx, nowIso,
    noteKh: decision === 'rejected'
      ? `🚫 ការទូទាត់មិនត្រូវគ្នា (រង់ចាំរដ្ឋបាលពិនិត្យ)៖ ${failedKh}`
      : readyForAdmin
      ? '⏳ បានទទួលវិក្កយបត្រ ហើយការពិនិត្យដោយ AI ជាប់ទាំងអស់ (អ្នកទទួល ចំនួន កាលបរិច្ឆេទ លេខប្រតិបត្តិការ)។ រដ្ឋបាលនឹងផ្ទៀងផ្ទាត់ជាមួយ statement ធនាគារ ហើយបើក VIP ជូនលោកអ្នក។'
      : '⏳ បានទទួលវិក្កយបត្រ។ រដ្ឋបាលនឹងផ្ទៀងផ្ទាត់ និងបើក VIP ជូនលោកអ្នក។',
    noteEn: decision === 'rejected'
      ? `🚫 Payment mismatch (awaiting admin review): ${failedEn}`
      : readyForAdmin
      ? '⏳ Receipt received and the AI pre-check passed (recipient, amount, date, Trx. ID). An administrator will match it against the bank statement and activate your VIP.'
      : '⏳ Receipt received. An administrator will verify it and activate your VIP.',
  });
  return finish(decision, { report });
});
