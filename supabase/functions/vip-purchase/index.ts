// Supabase Edge Function: vip-purchase
// Server-side check of:
//   1. 1-Time 7-Day Consumer Free Trial claims (action: 'claim_trial') enforced via Two-Line Anti-Abuse
//      (normalized Gmail/+855 Phone SHA-256 identity_hash OR salted Android/Web device_hash).
//   2. ABA / KHQR payment receipts for ALL Consumer VIP plans ($0.99 win-back, $2.99/30d, $6.99/90d, $19.99/365d)
//      and Independent Shop Subscription plans ($6.99/30d, $59.99/365d, $49.99 Early-Bird first 50 shops).
//
// DEFAULT = MANUAL APPROVAL: nothing paid is activated automatically unless VIP_AUTO_APPROVE=true is set.
// Every receipt is stored as `pending` together with the AI pre-check so the admin can approve hundreds of
// Consumer + Shop payments in 5 seconds via the ABA Statement Matcher (Excel .xlsx / CSV) or 1-Click AI Approve.
//
// Deploy:  supabase functions deploy vip-purchase --no-verify-jwt --project-ref ryvltobwuwuulazqjnza

import { geminiEndpoints, shouldTryNextEndpoint } from '../food-ai/endpoint.ts';
import { WindowLimiter, envInt, safeUserId, userKvKey } from '../_shared/common.ts';
import { computeServerIdentityHashes, sanitizeHexHash } from '../_shared/identity-normalize.ts';
import { createAbaReceiptVisionAdapter } from '../_shared/payment-adapter.ts';
import {
  applyShopSubscriptionGrant,
  applyTrial7dGrant,
  applyVipGrant,
  buildReport,
  computeVipWindow,
  resolveOfficialServerPlan,
  resolvePlan,
  type ExtractedReceipt,
  type OfficialPaidPlanId,
  type PricingDoc,
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
const burst = new WindowLimiter(8, 60_000);
const MAX_BODY = 7 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
const receiptAdapter = createAbaReceiptVisionAdapter();

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
          const text = (data?.candidates?.[0]?.content?.parts || [])
            .filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
            .map((p: { text: string }) => p.text)
            .join('');
          const m = /\{[\s\S]*\}/.exec(text);
          if (!m) continue;
          const p = JSON.parse(m[0]);
          const num =
            typeof p.amountUsd === 'number'
              ? Math.abs(p.amountUsd)
              : p.amountUsd
                ? Math.abs(parseFloat(String(p.amountUsd)))
                : undefined;
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
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hasExistingClaim(
  claimType: 'trial_7d' | 'consumer_promo_30d',
  userId: string,
  identityHashes: string[],
  deviceHash: string | null
): Promise<'user' | 'identity' | 'device' | null> {
  const byUser = await restSelectRows(
    `kft_trial_promo_claims?claim_type=eq.${claimType}&user_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`
  );
  if (byUser && byUser[0]) return 'user';

  for (const idHash of identityHashes) {
    const byId = await restSelectRows(
      `kft_trial_promo_claims?claim_type=eq.${claimType}&identity_hash=eq.${encodeURIComponent(idHash)}&select=id&limit=1`
    );
    if (byId && byId[0]) return 'identity';
  }

  if (deviceHash) {
    const byDev = await restSelectRows(
      `kft_trial_promo_claims?claim_type=eq.${claimType}&device_hash=eq.${encodeURIComponent(deviceHash)}&select=id&limit=1`
    );
    if (byDev && byDev[0]) return 'device';
  }

  return null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });

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

  // 1-Time 7-Day Consumer Free Trial (Android & Web only; does not require Gemini vision)
  if (body.action === 'claim_trial') {
    return handleClaimTrial(body, started);
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) return json(503, { ok: false, error: 'NOT_CONFIGURED' });

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

  const requestedPlanId = typeof body.planId === 'string' && body.planId.trim() ? body.planId.trim() : null;
  const shopId = typeof body.shopId === 'string' && body.shopId.trim() ? safeUserId(body.shopId.trim()) : null;

  const officialPlan = requestedPlanId ? resolveOfficialServerPlan(pricing as PricingDoc | null, requestedPlanId) : null;
  const legacyPlan = !requestedPlanId
    ? resolvePlan(pricing as PricingDoc | null, typeof body.durationDays === 'number' ? body.durationDays : Number(body.durationDays))
    : null;

  const plan = officialPlan || legacyPlan;
  if (!plan) return json(400, { ok: false, error: 'UNKNOWN_PLAN' });
  if (officialPlan && officialPlan.category === 'shop' && !shopId) {
    return json(400, { ok: false, error: 'SHOP_ID_REQUIRED' });
  }

  // Enforce Two-Line Eligibility on 1-time $0.99 Win-Back Promo (must have used & expired 7d trial first, never claimed twice)
  const storedUser = userDoc && typeof userDoc === 'object' ? (userDoc as Record<string, unknown>) : {};
  const deviceHash = sanitizeHexHash(body.deviceHash);
  const idInfo = await computeServerIdentityHashes({
    email: storedUser.email ?? body.email,
    phone: storedUser.phone ?? body.phone,
    clientIdentityHashes: body.identityHashes,
  });

  if (officialPlan && officialPlan.planId === 'consumer_promo_30d') {
    if (idInfo.isDisposableEmail) {
      return json(400, { ok: false, error: 'DISPOSABLE_EMAIL_NOT_ALLOWED' });
    }
    if (storedUser.promo099Used === true) {
      return json(400, { ok: false, error: 'PROMO_ALREADY_CLAIMED' });
    }
    const trialExpRaw = storedUser.freeTrialExpiresAt || storedUser.subscriptionExpiryDate || storedUser.vipExpiresAt;
    const hadTrial = Boolean(storedUser.freeTrialActivated || storedUser.freeTrialActivatedAt || storedUser.freeTrialExpiresAt);
    const trialExpMs = typeof trialExpRaw === 'string' ? Date.parse(trialExpRaw) : NaN;
    if (!hadTrial || !Number.isFinite(trialExpMs) || trialExpMs > nowMs) {
      return json(400, { ok: false, error: 'PROMO_REQUIRES_EXPIRED_TRIAL' });
    }
    const priorPromo = await hasExistingClaim('consumer_promo_30d', userId, idInfo.identityHashes, deviceHash);
    if (priorPromo) {
      return json(400, { ok: false, error: 'PROMO_ALREADY_CLAIMED' });
    }
  }

  const imageHash = await sha256Bytes(img.bytes);
  const finish = (decision: ReceiptDecision, extra: Record<string, unknown>): Response => {
    background(logUsage({ user_key: userId, kind: 'vip_purchase', provider: 'gemini', status: decision === 'verified' ? 200 : 202, ms: Date.now() - started, note: officialPlan ? `${decision}:${officialPlan.planId}` : decision }));
    return json(200, { ok: true, decision, ...extra });
  };

  // Same screenshot seen before? (anti-replay, enforced by a UNIQUE index too)
  const seen = await restSelectRows(`kft_payment_receipts?image_hash=eq.${imageHash}&select=status,user_id&limit=1`);
  if (seen && seen[0]) {
    const report = buildReport({
      decision: 'rejected',
      evaluation: null,
      extracted: null,
      duplicate: true,
      nowIso,
      noteKh: '❌ វិក្កយបត្រនេះត្រូវបានប្រើរួចហើយ',
      noteEn: '❌ This receipt screenshot has already been used.',
    });
    return finish('rejected', { report });
  }

  const extracted = await extractWithGemini(geminiKey, img.mime, img.b64);
  const checkOutcome = receiptAdapter.verify({
    extractedReceipt: extracted,
    expectedAmountUsd: plan.priceUsd,
    expectedDays: plan.days,
    submittedTrxId: typeof body.submittedTrxId === 'string' ? body.submittedTrxId : '',
    nowMs,
  });

  const patchPlanAndShopColumns = () => {
    if (!officialPlan) return;
    background(
      restPatch(`kft_payment_receipts?image_hash=eq.${imageHash}`, {
        plan_id: officialPlan.planId,
        shop_id: shopId || null,
      })
    );
  };

  if (checkOutcome.aiUnavailable || !extracted || !checkOutcome.evaluation) {
    await restInsert('kft_payment_receipts', {
      user_id: userId,
      image_hash: imageHash,
      plan_days: plan.days,
      amount_usd: plan.priceUsd,
      status: 'pending',
      reasons: ['ai_unavailable'],
      grant_info: officialPlan ? { planId: officialPlan.planId, shopId: shopId || null, category: officialPlan.category } : null,
    });
    patchPlanAndShopColumns();
    const report = buildReport({
      decision: 'pending',
      evaluation: null,
      extracted: null,
      duplicate: false,
      nowIso,
      noteKh: '⏳ បានទទួលវិក្កយបត្រ។ រដ្ឋបាលនឹងផ្ទៀងផ្ទាត់ និងបើកកញ្ចប់ជូនលោកអ្នក។',
      noteEn: '⏳ Receipt received. An administrator will verify it and activate your plan.',
    });
    return finish('pending', { report });
  }

  const evaluation = checkOutcome.evaluation;

  // Trx ID already claimed (verified OR still pending) by another submission? One payment can fund one plan only.
  let dupTrx = false;
  if (evaluation.trxKey) {
    const rows = await restSelectRows(`kft_payment_receipts?trx_key=eq.${encodeURIComponent(evaluation.trxKey)}&status=in.(verified,pending)&select=id&limit=1`);
    dupTrx = Boolean(rows && rows[0]);
  }
  const autoApprove = Deno.env.get('VIP_AUTO_APPROVE') === 'true';

  const baseRow = {
    user_id: userId,
    image_hash: imageHash,
    trx_key: evaluation.trxKey || null,
    amount_usd: extracted.amountUsd ?? null,
    plan_days: plan.days,
    extracted,
  };

  if (autoApprove && evaluation.allPassed && !dupTrx && userDoc && typeof userDoc === 'object') {
    const isShopPlan = Boolean(officialPlan && officialPlan.category === 'shop' && shopId);
    const win = computeVipWindow((userDoc as Record<string, unknown>).subscriptionExpiryDate, plan.days, nowMs);
    const grant = {
      startIso: win.startIso,
      expiryIso: win.expiryIso,
      days: plan.days,
      planType: plan.planType,
      trxId: evaluation.trxKey,
      ...(officialPlan ? { planId: officialPlan.planId, category: officialPlan.category, shopId: shopId || undefined } : {}),
    };
    // reserve the receipt FIRST: the unique indexes make a double-spend impossible even under concurrent requests
    const ins = await restInsert('kft_payment_receipts', { ...baseRow, status: 'verified', grant_info: grant });
    if (ins.status === 409) {
      const report = buildReport({
        decision: 'rejected',
        evaluation,
        extracted,
        duplicate: true,
        nowIso,
        noteKh: '❌ វិក្កយបត្រ ឬលេខប្រតិបត្តិការនេះត្រូវបានប្រើរួចហើយ',
        noteEn: '❌ This receipt or Trx. ID has already been used.',
      });
      return finish('rejected', { report });
    }
    if (ins.status >= 200 && ins.status < 300) {
      patchPlanAndShopColumns();
      let ok = false;
      if (isShopPlan && officialPlan && shopId) {
        ok = await activateShopOnServer(shopId, officialPlan.planId, plan.days, evaluation.trxKey, nowMs, pricing as PricingDoc | null);
      } else {
        ok = await writeKv(userKvKey(userId), applyVipGrant(userDoc as Record<string, unknown>, { ...grant, planId: officialPlan?.planId }));
        if (ok && officialPlan?.planId === 'consumer_promo_30d') {
          await recordTrialOrPromoClaim('consumer_promo_30d', userId, idInfo.identityHashes, deviceHash, win.expiryIso, { trxId: evaluation.trxKey });
        }
      }
      if (ok) {
        const report = buildReport({
          decision: 'verified',
          evaluation,
          extracted,
          duplicate: false,
          nowIso,
          noteKh: `✅ ផ្ទៀងផ្ទាត់ 100%៖ អ្នកទទួលត្រឹមត្រូវ ចំនួន $${plan.priceUsd.toFixed(2)} USD លេខប្រតិបត្តិការ (${evaluation.trxKey}) ហើយកញ្ចប់ត្រូវបានបើក!`,
          noteEn: `✅ 100% verified: recipient, amount $${plan.priceUsd.toFixed(2)} USD, Trx. ID (${evaluation.trxKey}) and date. Plan activated!`,
        });
        return finish('verified', { report, grant });
      }
      // the entitlement write failed: do not keep a "verified" receipt that granted nothing
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
    grant_info: officialPlan ? { planId: officialPlan.planId, shopId: shopId || null, category: officialPlan.category } : null,
    reasons: readyForAdmin
      ? ['ai_checks_passed_awaiting_admin_statement_check']
      : Object.entries(evaluation.checks)
          .filter(([, c]) => !c.passed)
          .map(([k]) => k)
          .concat(dupTrx ? ['duplicate_trx'] : []),
  });
  patchPlanAndShopColumns();
  const failedKh = Object.values(evaluation.checks)
    .filter((c) => !c.passed)
    .map((c) => c.reasonKh)
    .join(' | ');
  const failedEn = Object.values(evaluation.checks)
    .filter((c) => !c.passed)
    .map((c) => c.reasonEn)
    .join(' | ');
  const report = buildReport({
    decision,
    evaluation,
    extracted,
    duplicate: dupTrx,
    nowIso,
    noteKh:
      decision === 'rejected'
        ? `🚫 ការទូទាត់មិនត្រូវគ្នា (រង់ចាំរដ្ឋបាលពិនិត្យ)៖ ${failedKh}`
        : readyForAdmin
          ? '⏳ បានទទួលវិក្កយបត្រ ហើយការពិនិត្យដោយ AI ជាប់ទាំងអស់ (អ្នកទទួល ចំនួន កាលបរិច្ឆេទ លេខប្រតិបត្តិការ)។ រដ្ឋបាលនឹងផ្ទៀងផ្ទាត់ជាមួយ statement ធនាគារ ហើយបើកកញ្ចប់ជូនលោកអ្នក។'
          : '⏳ បានទទួលវិក្កយបត្រ។ រដ្ឋបាលនឹងផ្ទៀងផ្ទាត់ និងបើកកញ្ចប់ជូនលោកអ្នក។',
    noteEn:
      decision === 'rejected'
        ? `🚫 Payment mismatch (awaiting admin review): ${failedEn}`
        : readyForAdmin
          ? '⏳ Receipt received and the AI pre-check passed (recipient, amount, date, Trx. ID). An administrator will match it against the bank statement and activate your plan.'
          : '⏳ Receipt received. An administrator will verify it and activate your plan.',
  });
  return finish(decision, { report });
});

async function recordTrialOrPromoClaim(
  claimType: 'trial_7d' | 'consumer_promo_30d',
  userId: string,
  identityHashes: string[],
  deviceHash: string | null,
  expiresIso: string,
  meta: Record<string, unknown>
): Promise<{ conflict: boolean }> {
  const primaryIdentity = identityHashes[0] || null;
  const ins = await restInsert('kft_trial_promo_claims', {
    claim_type: claimType,
    user_id: userId,
    identity_hash: primaryIdentity,
    device_hash: deviceHash,
    expires_at: expiresIso,
    meta: {
      ...meta,
      extraIdentityHashes: identityHashes.slice(1),
    },
  });
  return { conflict: ins.status === 409 };
}

async function activateShopOnServer(
  shopId: string,
  planId: OfficialPaidPlanId,
  days: number,
  trxId: string,
  nowMs: number,
  pricing: PricingDoc | null
): Promise<boolean> {
  const customList = await readUserDoc('kft_cloud_custom_restaurants_v1');
  if (!Array.isArray(customList)) return false;
  let found = false;
  const startIso = new Date(nowMs).toISOString();
  const updatedList = customList.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const rec = item as Record<string, unknown>;
    if (String(rec.id || '') !== shopId) return item;
    found = true;
    return applyShopSubscriptionGrant(rec, { startIso, days, planId, trxId, nowMs }).updatedShop;
  });
  if (!found) return false;
  const saved = await writeKv('kft_cloud_custom_restaurants_v1', updatedList);
  if (saved && planId === 'shop_earlybird_365d' && pricing && typeof pricing === 'object') {
    const prevCount = Math.max(0, Math.floor(Number(pricing.shopEarlyBirdClaimedCount) || 0));
    background(writeKv('kft_cloud_admin_vip_pricing_v2', { ...pricing, shopEarlyBirdClaimedCount: prevCount + 1 }));
  }
  return saved;
}

async function handleClaimTrial(body: Record<string, unknown>, started: number): Promise<Response> {
  if (body.platform === 'ios') {
    return json(200, {
      ok: true,
      decision: 'already_claimed',
      reason: 'ios_blocked',
      messageKh: 'កម្មវិធីលើ iOS បើកជូនប្រើប្រាស់ដោយឥតគិតថ្លៃរួចហើយ។',
      messageEn: 'All features are already free on iOS.',
    });
  }

  const userId = safeUserId(body.userId);
  if (!userId) return json(400, { ok: false, error: 'BAD_USER' });

  const used = await usageHit(userId, 'trial_claim', 1);
  if (used !== null && used > 5) {
    return json(429, { ok: false, error: 'DAILY_LIMIT' });
  }

  const targetKvKey = `kft_user_${userId}`;
  const [rawUser, rawPricing] = await Promise.all([
    readUserDoc(targetKvKey),
    readUserDoc('kft_cloud_admin_vip_pricing_v2'),
  ]);
  const pricing = (rawPricing && typeof rawPricing === 'object' ? rawPricing : {}) as PricingDoc;
  if (pricing.consumerVipEnabled === false) {
    return json(200, {
      ok: true,
      decision: 'already_claimed',
      reason: 'disabled',
      messageKh: 'ការសាកល្បង VIP ត្រូវបានផ្អាកជាបណ្ដោះអាសន្ន។',
      messageEn: 'Free trial is temporarily paused.',
    });
  }

  const stored = rawUser && typeof rawUser === 'object' ? (rawUser as Record<string, unknown>) : { id: userId };
  if (
    stored.freeTrialActivated === true ||
    Boolean(stored.freeTrialActivatedAt) ||
    Boolean(stored.freeTrialExpiresAt) ||
    Boolean(stored.subscriptionExpiryDate) ||
    Boolean(stored.vipExpiresAt)
  ) {
    return json(200, {
      ok: true,
      decision: 'already_claimed',
      reason: 'user',
      messageKh: 'គណនីនេះធ្លាប់បានប្រើការសាកល្បងឥតគិតថ្លៃរួចហើយ (ម្តងគត់)។',
      messageEn: 'This account has already used its one-time free trial.',
    });
  }

  const deviceHash = sanitizeHexHash(body.deviceHash);
  const idInfo = await computeServerIdentityHashes({
    email: stored.email ?? body.email,
    phone: stored.phone ?? body.phone,
    clientIdentityHashes: body.identityHashes,
  });

  if (idInfo.isDisposableEmail) {
    return json(200, {
      ok: true,
      decision: 'already_claimed',
      reason: 'disposable_email',
      messageKh: 'សូមប្រើលេខទូរស័ព្ទ ឬអ៊ីមែលផ្លូវការ (មិនអនុញ្ញាតអ៊ីមែលបណ្ដោះអាសន្នសម្រាប់សាកល្បងឥតគិតថ្លៃឡើយ)។',
      messageEn: 'Please sign in with a valid phone number or Google/email account (disposable emails are not eligible for free trial).',
    });
  }

  const existingReason = await hasExistingClaim('trial_7d', userId, idInfo.identityHashes, deviceHash);
  if (existingReason) {
    const msgKh =
      existingReason === 'device'
        ? 'ឧបករណ៍នេះធ្លាប់បានប្រើការសាកល្បងឥតគិតថ្លៃ 7 ថ្ងៃរួចហើយ (ម្តងគត់ក្នុងមួយឧបករណ៍)។ ការមើលម្ហូប ហាង សណ្ឋាគារ តំបន់ទេសចរណ៍ និងផែនទី នៅតែ FREE ជារៀងរហូត!'
        : 'គណនី ឬលេខទូរស័ព្ទ/អ៊ីមែលនេះធ្លាប់បានប្រើការសាកល្បងឥតគិតថ្លៃ 7 ថ្ងៃរួចហើយ។';
    const msgEn =
      existingReason === 'device'
        ? 'This device has already used its one-time 7-day free trial. Core browsing & maps remain 100% FREE forever!'
        : 'This account or phone/email has already used its one-time 7-day free trial.';
    return json(200, { ok: true, decision: 'already_claimed', reason: existingReason, messageKh: msgKh, messageEn: msgEn });
  }

  const trialDays = Math.min(60, Math.max(1, Math.round(Number(pricing.consumerTrialDays) || 7)));
  const nowMs = Date.now();
  const startIso = new Date(nowMs).toISOString();
  const expiryIso = new Date(nowMs + trialDays * 86_400_000).toISOString();
  const trxId = `TRIAL-7D-${nowMs.toString(36).toUpperCase()}`;

  const claimRes = await recordTrialOrPromoClaim('trial_7d', userId, idInfo.identityHashes, deviceHash, expiryIso, {
    platform: typeof body.platform === 'string' ? body.platform.slice(0, 20) : 'unknown',
    trxId,
  });
  if (claimRes.conflict) {
    return json(200, {
      ok: true,
      decision: 'already_claimed',
      reason: 'device',
      messageKh: 'ការសាកល្បងឥតគិតថ្លៃ 7 ថ្ងៃត្រូវបានប្រើរួចហើយលើគណនី ឬឧបករណ៍នេះ។',
      messageEn: 'The one-time 7-day free trial has already been claimed on this account or device.',
    });
  }

  const grant = { startIso, expiryIso, days: trialDays, planType: 'trial_7d', planId: 'trial_7d', trxId };
  const ok = await writeKv(targetKvKey, applyTrial7dGrant(stored, { startIso, expiryIso, days: trialDays, trxId }));
  background(logUsage({ user_key: userId, kind: 'trial_claim', provider: 'server', status: ok ? 200 : 500, ms: Date.now() - started, note: ok ? 'granted' : 'kv_write_failed' }));
  if (!ok) {
    return json(500, { ok: false, error: 'WRITE_FAILED' });
  }
  return json(200, { ok: true, decision: 'trial_granted', grant });
}
