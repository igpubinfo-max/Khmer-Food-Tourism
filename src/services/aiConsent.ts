/**
 * Explicit, revocable permission before any personal data (a question, a photo, the account id used for quota) is
 * shared with a third-party AI provider (Google Gemini / OpenAI via our own Supabase `food-ai` gateway).
 * Required by Apple App Store Guideline 5.1.2(i). The answer is remembered per device; declining is remembered for
 * the current session only so the question is not repeated on every message.
 */
const AI_CONSENT_KEY = 'kft_ai_consent_v1';

let grantedThisSession = false;
let declinedThisSession = false;

export function hasAiConsent(): boolean {
  if (grantedThisSession) return true;
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(AI_CONSENT_KEY) === 'granted';
  } catch {
    return false;
  }
}

export function grantAiConsent(): void {
  grantedThisSession = true;
  declinedThisSession = false;
  try {
    localStorage.setItem(AI_CONSENT_KEY, 'granted');
  } catch {
    // storage unavailable: the in-memory grant above still covers this session
  }
}

export function revokeAiConsent(): void {
  grantedThisSession = false;
  declinedThisSession = false;
  try {
    localStorage.removeItem(AI_CONSENT_KEY);
  } catch {
    // ignore
  }
}

/** Returns true when the user has agreed (asking once through a native confirm dialog if needed). */
export function ensureAiConsent(message: string): boolean {
  if (hasAiConsent()) return true;
  if (declinedThisSession) return false;
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') return false;
  const agreed = window.confirm(message);
  if (agreed) grantAiConsent();
  else declinedThisSession = true;
  return agreed;
}
