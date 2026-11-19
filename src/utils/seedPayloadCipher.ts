/**
 * Build-Time & Runtime Seed Database Payload Cipher (Anti-APK-Unpack Protection)
 *
 * Encrypts static restaurant, hotel, tourist destination, and food datasets inside
 * compiled production bundles (`dist/assets/*.js`) so unpacking the `.apk` / `.ipa`
 * never exposes plain-text JSON, names, descriptions, or GPS coordinates.
 */

const UC2_PREFIX = 'KFT_UC2:';
const CIPHER_KEY_MATERIAL = 'KFT_CAMBODIA_FLAVORS_TOURISM_2026_V271_PROTECTED_SEED_KEY_9F4A7C2E';

const KEY_CODES: number[] = Array.from(CIPHER_KEY_MATERIAL).map((ch) => ch.charCodeAt(0));
const A_MIN = 0x0020;
const A_MAX = 0x007e;
const A_SPAN = A_MAX - A_MIN + 1;
const B_MIN = 0x00a0;
const B_MAX = 0xd7ff;
const B_SPAN = B_MAX - B_MIN + 1;

function isAuthorizedRuntimeEnvironment(): boolean {
  if (typeof window === 'undefined' || !window.location) {
    return true; // Node.js / SSR / unit test environment
  }
  const proto = String(window.location.protocol || '').toLowerCase();
  const host = String(window.location.hostname || '').toLowerCase().trim();
  if (proto === 'capacitor:' || proto === 'ionic:' || proto === 'app:' || proto === 'file:') {
    return true;
  }
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
    return true;
  }
  const allowedSuffixes = [
    '.vercel.app',
    '.netlify.app',
    '.pages.dev',
    '.github.io',
    '.supabase.co',
    'khmerfood.tourism',
    'cambodiaflavorstourism.com',
  ];
  return allowedSuffixes.some((suffix) => host === suffix.replace(/^\./, '') || host.endsWith(suffix));
}

/**
 * Encrypts a JSON-serializable dataset into a zero-bloat `KFT_UC2:...` dual-ring stream ciphertext.
 */
export function encodeProtectedSeedPayload(data: unknown): string {
  const json = JSON.stringify(data);
  const len = json.length;
  const keyLen = KEY_CODES.length;
  const out = new Array<string>(len);

  for (let i = 0; i < len; i++) {
    const c = json.charCodeAt(i);
    const k = KEY_CODES[i % keyLen];
    if (c >= A_MIN && c <= A_MAX) {
      const offset = (k * 31 + i * 17 + 19) % A_SPAN;
      out[i] = String.fromCharCode(A_MIN + ((c - A_MIN + offset) % A_SPAN));
    } else if (c >= B_MIN && c <= B_MAX) {
      const offset = (k * 257 + i * 43 + 0x0393) % B_SPAN;
      out[i] = String.fromCharCode(B_MIN + ((c - B_MIN + offset) % B_SPAN));
    } else {
      out[i] = json[i];
    }
  }

  return UC2_PREFIX + out.join('');
}

/**
 * Decrypts a `KFT_UC2:...` payload string back into the original dataset at runtime.
 */
export function decodeProtectedSeedPayload<T = unknown>(payload: string | T): T {
  if (typeof payload !== 'string') {
    return payload;
  }
  if (!payload.startsWith(UC2_PREFIX)) {
    return JSON.parse(payload) as T;
  }
  if (!isAuthorizedRuntimeEnvironment()) {
    return [] as unknown as T;
  }

  const raw = payload.slice(UC2_PREFIX.length);
  const len = raw.length;
  const keyLen = KEY_CODES.length;
  const out = new Array<string>(len);

  for (let i = 0; i < len; i++) {
    const c = raw.charCodeAt(i);
    const k = KEY_CODES[i % keyLen];
    if (c >= A_MIN && c <= A_MAX) {
      const offset = (k * 31 + i * 17 + 19) % A_SPAN;
      out[i] = String.fromCharCode(A_MIN + ((c - A_MIN - offset + A_SPAN) % A_SPAN));
    } else if (c >= B_MIN && c <= B_MAX) {
      const offset = (k * 257 + i * 43 + 0x0393) % B_SPAN;
      out[i] = String.fromCharCode(B_MIN + ((c - B_MIN - offset + B_SPAN) % B_SPAN));
    } else {
      out[i] = raw[i];
    }
  }

  try {
    return JSON.parse(out.join('')) as T;
  } catch (err) {
    console.error('[KFT Seed Cipher] Fallback empty array on malformed payload:', err);
    return [] as unknown as T;
  }
}
