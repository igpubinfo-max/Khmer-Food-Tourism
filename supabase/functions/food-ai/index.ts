// Supabase Edge Function: food-ai
// Secure proxy for the Google Gemini API used by the in-app "AI Food Assistant".
// The Gemini key is read from the Supabase secret GEMINI_API_KEY (Deno.env) - it never ships in the APK / web bundle.
//
// Deploy:
//   supabase secrets set GEMINI_API_KEY=<your Google AI Studio key> --project-ref ryvltobwuwuulazqjnza
//   supabase functions deploy food-ai --project-ref ryvltobwuwuulazqjnza
//
// Every response carries `x-food-ai-proxy: 1` so the app can tell "my proxy answered" from "gateway / not deployed".

import { MAX_REQUEST_BYTES, SlidingWindowLimiter, sanitizeGeminiRequest } from './sanitize.ts';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'x-food-ai-proxy',
  'x-food-ai-proxy': '1',
};

const perMinute = new SlidingWindowLimiter(20, 60_000);
const perHour = new SlidingWindowLimiter(240, 60 * 60_000);

function json(status: number, payload: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  });
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') || '';
  return (
    req.headers.get('cf-connecting-ip') ||
    fwd.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: { status: 'METHOD_NOT_ALLOWED', message: 'POST only' } });

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    // 503 tells the app to fall back to its own configured key.
    return json(503, { error: { status: 'FOOD_AI_NOT_CONFIGURED', message: 'GEMINI_API_KEY secret is not set' } });
  }

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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55_000);
  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${checked.model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(checked.body),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': upstream.headers.get('content-type') || 'application/json' },
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted = (err as { name?: string })?.name === 'AbortError';
    return json(aborted ? 504 : 502, {
      error: { status: aborted ? 'DEADLINE_EXCEEDED' : 'UPSTREAM_UNAVAILABLE', message: aborted ? 'Gemini timed out' : 'Gemini unreachable' },
    });
  }
});
