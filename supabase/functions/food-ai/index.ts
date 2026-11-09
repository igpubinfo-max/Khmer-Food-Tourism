// Supabase Edge Function: food-ai
// Secure AI gateway for the in-app AI features (AI Food Assistant, food recognition, health & nutrition notes).
//   * Gemini API key (GEMINI_API_KEY) and OpenAI key (OPENAI_API_KEY, optional fail-over) live ONLY in Supabase
//     secrets - they never ship in the APK / web bundle.
//   * Per-user (or per-IP) DAILY quota, stored in Postgres (kft_api_usage_daily) -> hard cost control.
//   * Optional server-side VIP enforcement (FOOD_AI_ENFORCE_VIP=true).
//   * Every call is logged (provider, model, tokens, status) in kft_api_usage_log for the Admin cost report.
//
// Deploy (see docs/SUPABASE_PRO_SETUP.md or run deploy_supabase_pro.bat):
//   supabase secrets set GEMINI_API_KEY=... [OPENAI_API_KEY=...] --project-ref ryvltobwuwuulazqjnza
//   supabase functions deploy food-ai --no-verify-jwt --project-ref ryvltobwuwuulazqjnza
//
// Every response carries `x-food-ai-proxy: 1` so the app can tell "my proxy answered" from "gateway / not deployed".

import { MAX_REQUEST_BYTES, SlidingWindowLimiter, sanitizeGeminiRequest } from './sanitize.ts';
import { geminiToOpenAi, openAiToGemini, pickOpenAiModel, shouldFailover } from './openai.ts';
import { geminiEndpoints, shouldTryNextEndpoint } from './endpoint.ts';
import { decideQuota, isVipActive, resolveUserAiDailyLimit, safeUserId, userKvKey, verifyClientAppIntegrity } from '../_shared/common.ts';
import { background, logUsage, readUserDoc, usageHit } from '../_shared/supa.ts';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kft-user-id, x-kft-purpose, x-kft-app-id, x-kft-app-platform, x-kft-app-sig',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'x-food-ai-proxy, x-food-ai-provider, x-kft-quota-used, x-kft-quota-limit, x-kft-quota-tier',
  'x-food-ai-proxy': '1',
};

const perMinute = new SlidingWindowLimiter(20, 60_000);
const perHour = new SlidingWindowLimiter(240, 60 * 60_000);

let cachedPricingDoc: unknown = null;
let cachedPricingAt = 0;
async function getCachedPricingDoc(): Promise<unknown> {
  const now = Date.now();
  if (cachedPricingDoc && now - cachedPricingAt < 60_000) return cachedPricingDoc;
  const doc = await readUserDoc('kft_cloud_admin_vip_pricing_v2');
  if (doc) {
    cachedPricingDoc = doc;
    cachedPricingAt = now;
  }
  return cachedPricingDoc;
}

function json(status: number, payload: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  });
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  return req.headers.get('cf-connecting-ip') || fwd.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

type Upstream = { status: number; text: string; provider: 'gemini' | 'openai'; model: string } | null;

async function callGemini(apiKey: string, model: string, body: unknown, timeoutMs: number): Promise<Upstream> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const targets = geminiEndpoints(apiKey, model);
    let first: Upstream = null;
    let last: Upstream = null;
    for (let i = 0; i < targets.length; i++) {
      const upstream = await fetch(targets[i].url, {
        method: 'POST',
        headers: targets[i].headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      last = { status: upstream.status, text: await upstream.text(), provider: 'gemini', model };
      if (i === 0) first = last;
      if (last.status === 200) return last;
      if (!shouldTryNextEndpoint(last.status)) return last;
    }
    // every endpoint refused: report the PRIMARY endpoint's answer (its error message is the meaningful one)
    return first || last;
  } catch {
    return null; // timeout / network
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAi(apiKey: string, body: Record<string, unknown>, timeoutMs: number): Promise<Upstream> {
  const model = pickOpenAiModel(Deno.env.get('OPENAI_MODEL'));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(geminiToOpenAi(body, model)),
      signal: controller.signal,
    });
    const raw = await upstream.text();
    if (!upstream.ok) return { status: upstream.status, text: raw, provider: 'openai', model };
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      /* handled below */
    }
    const gem = openAiToGemini(parsed);
    if (!gem) return { status: 502, text: JSON.stringify({ error: { status: 'BAD_UPSTREAM', message: 'OpenAI returned no text' } }), provider: 'openai', model };
    return { status: 200, text: JSON.stringify(gem), provider: 'openai', model };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Opens a Gemini SSE stream. Returns the live upstream Response on 200, otherwise the failure as an Upstream. */
async function openGeminiStream(apiKey: string, model: string, body: unknown, timeoutMs: number): Promise<Response | Upstream> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs); // covers time-to-first-byte only
  try {
    const targets = geminiEndpoints(apiKey, model, true);
    let first: Upstream = null;
    let last: Upstream = null;
    for (let i = 0; i < targets.length; i++) {
      const upstream = await fetch(targets[i].url, {
        method: 'POST',
        headers: targets[i].headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (upstream.status === 200 && upstream.body) {
        clearTimeout(timer);
        return upstream;
      }
      last = { status: upstream.status, text: await upstream.text(), provider: 'gemini', model };
      if (i === 0) first = last;
      if (!shouldTryNextEndpoint(last.status)) return last;
    }
    clearTimeout(timer);
    return first || last;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/** Pass-through of the SSE stream that remembers the last usageMetadata so the usage log stays accurate. */
function tapStream(upstream: Response, onDone: (inTok: number | null, outTok: number | null) => void): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  let tail = '';
  let inTok: number | null = null;
  let outTok: number | null = null;
  const scan = (chunkText: string) => {
    tail += chunkText;
    const lines = tail.split('\n');
    tail = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data:') || !line.includes('usageMetadata')) continue;
      try {
        const u = JSON.parse(line.slice(5).trim())?.usageMetadata;
        if (u) {
          inTok = Number(u.promptTokenCount) || inTok;
          outTok = Number(u.candidatesTokenCount) || outTok;
        }
      } catch {
        /* ignore partial line */
      }
    }
  };
  return upstream.body!.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        scan(decoder.decode(chunk, { stream: true }));
      },
      flush() {
        onDone(inTok, outTok);
      },
    })
  );
}

function tokensOf(text: string): { inTok: number | null; outTok: number | null } {
  try {
    const u = JSON.parse(text)?.usageMetadata;
    return { inTok: Number(u?.promptTokenCount) || null, outTok: Number(u?.candidatesTokenCount) || null };
  } catch {
    return { inTok: null, outTok: null };
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: { status: 'METHOD_NOT_ALLOWED', message: 'POST only' } });
  const appIntegrity = verifyClientAppIntegrity(req);
  if (!appIntegrity.ok) return json(403, { error: { status: 'PERMISSION_DENIED', message: 'Unauthorized cloned/modified app' } });

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  if (!geminiKey && !openAiKey) {
    // 503 tells the app to fall back to its own configured key.
    return json(503, { error: { status: 'FOOD_AI_NOT_CONFIGURED', message: 'GEMINI_API_KEY secret is not set' } });
  }

  const started = Date.now();
  const ip = clientIp(req);
  if (!perMinute.allow(ip) || !perHour.allow(ip)) {
    return json(429, { error: { status: 'RESOURCE_EXHAUSTED', message: 'Too many AI requests, please slow down.' } }, { 'Retry-After': '30' });
  }

  const declaredLength = Number(req.headers.get('content-length') || '0');
  if (declaredLength > MAX_REQUEST_BYTES) {
    return json(413, { error: { status: 'PAYLOAD_TOO_LARGE', message: 'Request too large' } });
  }

  let rawText = '';
  try {
    rawText = await req.text();
  } catch {
    return json(400, { error: { status: 'BAD_REQUEST', message: 'Unreadable body' } });
  }
  if (rawText.length > MAX_REQUEST_BYTES) {
    return json(413, { error: { status: 'PAYLOAD_TOO_LARGE', message: 'Request too large' } });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return json(400, { error: { status: 'BAD_REQUEST', message: 'Invalid JSON' } });
  }

  const checked = sanitizeGeminiRequest(parsed);
  if (!checked.ok) {
    return json(checked.status, { error: { status: 'INVALID_ARGUMENT', message: checked.message } });
  }

  // ---- identity, VIP and daily quota ------------------------------------------------------------------------
  const userId = safeUserId(req.headers.get('x-kft-user-id'));
  // Payment-receipt checks are needed by people who are NOT VIP yet (they are paying to become VIP): they bypass the
  // VIP rule but have their own small daily allowance and must carry an image.
  const isPayment = req.headers.get('x-kft-purpose') === 'payment';
  const enforceVip = Deno.env.get('FOOD_AI_ENFORCE_VIP') === 'true' && !isPayment;
  const [userDoc, pricingDoc] = userId
    ? await Promise.all([readUserDoc(userKvKey(userId)), getCachedPricingDoc()])
    : [null, null];
  // Only bind daily quota to userId when a real user record exists in kft_app_kv_store;
  // invented/self-asserted userId strings without a stored user record fall back to IP quota.
  const verifiedUserId = userDoc && typeof userDoc === 'object' ? userId : null;
  const vip = verifiedUserId ? isVipActive(userDoc) : false;
  if (enforceVip) {
    if (!verifiedUserId) return json(401, { error: { status: 'AUTH_REQUIRED', message: 'Sign in to use AI.' } });
    if (!vip) return json(403, { error: { status: 'VIP_REQUIRED', message: 'VIP membership is required for AI features.' } });
  }

  const contents = (checked.body.contents as Array<{ parts?: Array<Record<string, unknown>> }>) || [];
  const hasImage = contents.some((t) => (t.parts || []).some((p) => p.inlineData));
  if (isPayment && !hasImage) return json(400, { error: { status: 'INVALID_ARGUMENT', message: 'payment check needs an image' } });
  const weight = hasImage ? 3 : 1; // image recognition costs more than a text question
  const { limit, tier: quotaTier } = resolveUserAiDailyLimit({
    isPayment,
    userId: verifiedUserId,
    userDoc,
    pricingDoc,
    envTrial: Deno.env.get('AI_DAILY_LIMIT_TRIAL'),
    envVip: Deno.env.get('AI_DAILY_LIMIT_VIP'),
    envFree: Deno.env.get('AI_DAILY_LIMIT_FREE'),
    envAnon: Deno.env.get('AI_DAILY_LIMIT_ANON'),
    envPayment: Deno.env.get('AI_DAILY_LIMIT_PAYMENT'),
  });
  const quotaKey = verifiedUserId || `ip:${ip}`;
  const used = await usageHit(quotaKey, isPayment ? 'ai_payment' : 'ai', weight); // null => counter unavailable => fail open
  const quotaHeaders: Record<string, string> =
    used === null
      ? { 'x-kft-quota-tier': quotaTier }
      : { 'x-kft-quota-used': String(used), 'x-kft-quota-limit': String(limit), 'x-kft-quota-tier': quotaTier };
  if (used !== null && !decideQuota(used, limit).allowed) {
    background(logUsage({ user_key: quotaKey, kind: 'ai', status: 429, note: 'daily_quota', ms: Date.now() - started }));
    return json(429, { error: { status: 'DAILY_QUOTA_EXCEEDED', message: 'Daily AI limit reached. Try again tomorrow.' } }, { 'Retry-After': '3600', ...quotaHeaders });
  }

  // ---- provider call: Gemini first, OpenAI as fail-over -----------------------------------------------------
  let result: Upstream = null;
  const wantsStream = Boolean((parsed as Record<string, unknown>)?.stream === true) && Boolean(geminiKey);
  if (wantsStream && geminiKey) {
    // Progressive answer: the first tokens reach the phone as soon as Gemini produces them.
    const opened = await openGeminiStream(geminiKey, checked.model, checked.body, 55_000);
    if (opened instanceof Response) {
      const tapped = tapStream(opened, (inTok, outTok) => {
        background(
          logUsage({
            user_key: quotaKey,
            kind: 'ai',
            provider: 'gemini',
            model: checked.model,
            status: 200,
            tokens_in: inTok,
            tokens_out: outTok,
            ms: Date.now() - started,
            note: hasImage ? 'image,stream' : 'stream',
          })
        );
      });
      return new Response(tapped, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'x-food-ai-provider': 'gemini',
          ...quotaHeaders,
        },
      });
    }
    result = opened; // stream refused -> same failure handling / OpenAI fail-over as before
  } else if (geminiKey) {
    result = await callGemini(geminiKey, checked.model, checked.body, 55_000);
  }
  const geminiFailed = !geminiKey || result === null || shouldFailover(result.status);
  if (geminiFailed && openAiKey) {
    const fallback = await callOpenAi(openAiKey, checked.body, 55_000);
    if (fallback && (fallback.status === 200 || result === null)) result = fallback;
  }

  if (!result) {
    background(logUsage({ user_key: quotaKey, kind: 'ai', provider: 'gemini', model: checked.model, status: 504, ms: Date.now() - started, note: 'timeout_or_network' }));
    return json(504, { error: { status: 'DEADLINE_EXCEEDED', message: 'AI provider timed out or is unreachable' } }, quotaHeaders);
  }

  const { inTok, outTok } = result.status === 200 ? tokensOf(result.text) : { inTok: null, outTok: null };
  background(
    logUsage({
      user_key: quotaKey,
      kind: 'ai',
      provider: result.provider,
      model: result.model,
      status: result.status,
      tokens_in: inTok,
      tokens_out: outTok,
      ms: Date.now() - started,
      note: hasImage ? 'image' : undefined,
    })
  );
  return new Response(result.text, {
    status: result.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-food-ai-provider': result.provider, ...quotaHeaders },
  });
});
