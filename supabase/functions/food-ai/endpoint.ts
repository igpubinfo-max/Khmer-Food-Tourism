/**
 * Which Google endpoint(s) a Gemini key can use.
 *  - AI Studio keys ("AIza...")      -> generativelanguage.googleapis.com (key in the x-goog-api-key header)
 *  - Auth keys bound to a service account ("AQ.Ab8...", created in Google AI Studio / Cloud Console as "Gemini API Key")
 *    are normally restricted to the Gemini (Generative Language) API, so that endpoint is tried FIRST; the
 *    Vertex AI Express endpoint (aiplatform.googleapis.com, ?key=) is the second attempt for unrestricted Vertex keys.
 * Pure / erasable TS (tested from Node: `npm run test:edge`).
 */
export interface GeminiTarget {
  url: string;
  headers: Record<string, string>;
}

export function isVertexExpressKey(key: string): boolean {
  return key.trim().startsWith('AQ.');
}

export function geminiEndpoints(key: string, model: string): GeminiTarget[] {
  const k = key.trim();
  const studio: GeminiTarget = {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': k },
  };
  if (!isVertexExpressKey(k)) return [studio];
  const vertex: GeminiTarget = {
    url: `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${encodeURIComponent(k)}`,
    headers: { 'Content-Type': 'application/json' },
  };
  return [studio, vertex];
}

/** Statuses that mean "this endpoint does not accept this key / model" => try the next endpoint. */
export function shouldTryNextEndpoint(status: number): boolean {
  return status === 400 || status === 401 || status === 403 || status === 404;
}
