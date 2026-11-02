/**
 * Pure request-hardening helpers for the `food-ai` edge function.
 * (No Deno globals here so the exact same code is unit-tested from Node: `npm run test:food-ai`.)
 *
 * The proxy exists so the Gemini API key lives ONLY in Supabase secrets, never in the APK / web bundle.
 * Because anybody with the public anon key can call it, it must NOT behave like an open Gemini relay:
 * only the models, fields and sizes the food assistant really needs are forwarded.
 */

export const ALLOWED_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
] as const;

export const MAX_REQUEST_BYTES = 6 * 1024 * 1024; // whole JSON request
export const MAX_TOTAL_TEXT_CHARS = 150_000; // system prompt + history + question
export const MAX_SYSTEM_TEXT_CHARS = 70_000;
export const MAX_INLINE_IMAGES = 2;
export const MAX_IMAGE_BASE64_CHARS = 5 * 1024 * 1024;
export const MAX_CONTENT_TURNS = 40;
export const MAX_PARTS_PER_TURN = 8;
export const MAX_OUTPUT_TOKENS_CAP = 8192;
export const MAX_THINKING_BUDGET_CAP = 4096;
export const MAX_SCHEMA_JSON_CHARS = 20_000;

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const BASE64_RE = /^[A-Za-z0-9+/_-]+={0,2}$/;

export type SanitizeResult =
  | { ok: true; model: string; body: Record<string, unknown> }
  | { ok: false; status: number; message: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function clampNumber(v: unknown, min: number, max: number): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined;
}

/** Validate + rebuild the Gemini request from a WHITELIST of fields (anything else is dropped). */
export function sanitizeGeminiRequest(input: unknown): SanitizeResult {
  if (!isObject(input)) return { ok: false, status: 400, message: 'JSON object expected' };
  const model = input.model;
  if (typeof model !== 'string' || !(ALLOWED_MODELS as readonly string[]).includes(model)) {
    return { ok: false, status: 400, message: 'model not allowed' };
  }
  if (!isObject(input.body)) return { ok: false, status: 400, message: 'body object expected' };
  const raw = input.body;

  let totalText = 0;
  let imageCount = 0;

  const cleanParts = (parts: unknown, allowImages: boolean): Array<Record<string, unknown>> | null => {
    if (!Array.isArray(parts) || parts.length === 0 || parts.length > MAX_PARTS_PER_TURN) return null;
    const out: Array<Record<string, unknown>> = [];
    for (const p of parts) {
      if (!isObject(p)) return null;
      if (typeof p.text === 'string') {
        totalText += p.text.length;
        out.push({ text: p.text });
      } else if (isObject(p.inlineData) && allowImages) {
        const mime = p.inlineData.mimeType;
        const data = p.inlineData.data;
        if (typeof mime !== 'string' || !ALLOWED_IMAGE_MIME.has(mime)) return null;
        if (typeof data !== 'string' || data.length === 0 || data.length > MAX_IMAGE_BASE64_CHARS || !BASE64_RE.test(data)) return null;
        imageCount++;
        if (imageCount > MAX_INLINE_IMAGES) return null;
        out.push({ inlineData: { mimeType: mime, data } });
      } else {
        return null; // tools, fileData, functionCall... are not part of the food assistant
      }
    }
    return out;
  };

  const body: Record<string, unknown> = {};

  if (raw.systemInstruction !== undefined) {
    if (!isObject(raw.systemInstruction)) return { ok: false, status: 400, message: 'bad systemInstruction' };
    const parts = cleanParts(raw.systemInstruction.parts, false);
    if (!parts) return { ok: false, status: 400, message: 'bad systemInstruction parts' };
    const sysChars = parts.reduce((n, p) => n + String(p.text || '').length, 0);
    if (sysChars > MAX_SYSTEM_TEXT_CHARS) return { ok: false, status: 413, message: 'systemInstruction too large' };
    body.systemInstruction = { parts };
  }

  if (!Array.isArray(raw.contents) || raw.contents.length === 0 || raw.contents.length > MAX_CONTENT_TURNS) {
    return { ok: false, status: 400, message: 'contents invalid' };
  }
  const contents: Array<Record<string, unknown>> = [];
  for (const turn of raw.contents) {
    if (!isObject(turn) || (turn.role !== 'user' && turn.role !== 'model')) {
      return { ok: false, status: 400, message: 'content role invalid' };
    }
    const parts = cleanParts(turn.parts, turn.role === 'user');
    if (!parts) return { ok: false, status: 400, message: 'content parts invalid' };
    contents.push({ role: turn.role, parts });
  }
  if (totalText > MAX_TOTAL_TEXT_CHARS) return { ok: false, status: 413, message: 'text too large' };
  body.contents = contents;

  if (raw.generationConfig !== undefined) {
    if (!isObject(raw.generationConfig)) return { ok: false, status: 400, message: 'bad generationConfig' };
    const g = raw.generationConfig;
    const cfg: Record<string, unknown> = {};
    const temperature = clampNumber(g.temperature, 0, 1);
    if (temperature !== undefined) cfg.temperature = temperature;
    const topP = clampNumber(g.topP, 0, 1);
    if (topP !== undefined) cfg.topP = topP;
    const maxOut = clampNumber(g.maxOutputTokens, 1, MAX_OUTPUT_TOKENS_CAP);
    if (maxOut !== undefined) cfg.maxOutputTokens = Math.floor(maxOut);
    if (g.responseMimeType === 'application/json') cfg.responseMimeType = 'application/json';
    if (g.responseSchema !== undefined) {
      if (!isObject(g.responseSchema) || JSON.stringify(g.responseSchema).length > MAX_SCHEMA_JSON_CHARS) {
        return { ok: false, status: 400, message: 'bad responseSchema' };
      }
      cfg.responseSchema = g.responseSchema;
    }
    if (isObject(g.thinkingConfig)) {
      const budget = clampNumber(g.thinkingConfig.thinkingBudget, 0, MAX_THINKING_BUDGET_CAP);
      if (budget !== undefined) cfg.thinkingConfig = { thinkingBudget: Math.floor(budget) };
    }
    body.generationConfig = cfg;
  }

  return { ok: true, model, body };
}

/** Best-effort in-memory sliding-window limiter (per edge isolate). */
export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();
  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  /** Returns true when the call is allowed (and records it). */
  allow(key: string, now: number = Date.now()): boolean {
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(key) || []).filter((t) => t > cutoff);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 5000) {
      for (const [k, v] of this.hits) if (v.every((t) => t <= cutoff)) this.hits.delete(k);
    }
    return true;
  }
}
