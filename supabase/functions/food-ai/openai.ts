/**
 * Gemini-request -> OpenAI Chat Completions adapter (and back), so the `food-ai` function can fail over to
 * OpenAI WITHOUT the app noticing: the app always receives a Gemini-shaped response.
 * Input is the already-sanitised request from sanitize.ts. Pure / erasable TS only (tested from Node).
 */

export const OPENAI_ALLOWED_MODELS = ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4.1'] as const;
export const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini';

export function pickOpenAiModel(configured: string | undefined): string {
  return configured && (OPENAI_ALLOWED_MODELS as readonly string[]).includes(configured) ? configured : OPENAI_DEFAULT_MODEL;
}

type Json = Record<string, unknown>;

function isObj(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function geminiToOpenAi(body: Json, model: string): Json {
  const messages: Json[] = [];
  const wantsJson = isObj(body.generationConfig) && body.generationConfig.responseMimeType === 'application/json';

  let system = '';
  if (isObj(body.systemInstruction) && Array.isArray(body.systemInstruction.parts)) {
    system = (body.systemInstruction.parts as Json[]).map((p) => String(p.text || '')).join('\n');
  }
  // OpenAI's json_object mode requires the word "JSON" to appear in the conversation.
  if (wantsJson) system += (system ? '\n\n' : '') + 'Respond with a single valid JSON object only (no markdown fences).';
  if (system) messages.push({ role: 'system', content: system });

  for (const turn of (Array.isArray(body.contents) ? body.contents : []) as Json[]) {
    const role = turn.role === 'model' ? 'assistant' : 'user';
    const parts = (Array.isArray(turn.parts) ? turn.parts : []) as Json[];
    const content: Json[] = [];
    for (const p of parts) {
      if (typeof p.text === 'string') content.push({ type: 'text', text: p.text });
      else if (isObj(p.inlineData)) {
        content.push({
          type: 'image_url',
          image_url: { url: `data:${String(p.inlineData.mimeType)};base64,${String(p.inlineData.data)}` },
        });
      }
    }
    if (role === 'assistant') {
      messages.push({ role, content: content.map((c) => String(c.text || '')).join('\n') });
    } else {
      messages.push({ role, content: content.length === 1 && content[0].type === 'text' ? content[0].text : content });
    }
  }

  const out: Json = { model, messages };
  const g = isObj(body.generationConfig) ? body.generationConfig : {};
  if (typeof g.temperature === 'number') out.temperature = g.temperature;
  if (typeof g.topP === 'number') out.top_p = g.topP;
  if (typeof g.maxOutputTokens === 'number') out.max_tokens = Math.min(8192, Math.floor(g.maxOutputTokens));
  if (wantsJson) out.response_format = { type: 'json_object' };
  return out;
}

export function openAiToGemini(resp: unknown): Json | null {
  if (!isObj(resp) || !Array.isArray(resp.choices) || !isObj(resp.choices[0])) return null;
  const choice = resp.choices[0] as Json;
  const msg = isObj(choice.message) ? choice.message : {};
  const text = typeof msg.content === 'string' ? msg.content : '';
  if (!text) return null;
  const usage = isObj(resp.usage) ? resp.usage : {};
  const inTok = Number(usage.prompt_tokens) || 0;
  const outTok = Number(usage.completion_tokens) || 0;
  return {
    candidates: [
      {
        content: { role: 'model', parts: [{ text }] },
        finishReason: choice.finish_reason === 'length' ? 'MAX_TOKENS' : 'STOP',
        index: 0,
      },
    ],
    usageMetadata: { promptTokenCount: inTok, candidatesTokenCount: outTok, totalTokenCount: inTok + outTok },
    modelVersion: String(resp.model || ''),
  };
}

/** Upstream conditions where failing over to the other provider makes sense. */
export function shouldFailover(status: number): boolean {
  // 401/403 here mean OUR Gemini key is revoked/leaked/over its project quota - another provider can still answer.
  // 402 = our Gemini project has run out of prepaid credits (billing problem on OUR side, not the user's).
  return status === 429 || status === 408 || status === 402 || status === 401 || status === 403 || status >= 500;
}
