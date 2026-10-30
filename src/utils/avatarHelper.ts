import React from 'react';

const AVATAR_CACHE_STORAGE_KEY = 'kft_user_avatar_cache_v1';

/**
 * Generates a crisp, self-contained SVG data-URI avatar badge with the user's initials.
 * Zero network dependency — guaranteed to render instantaneously offline or when external URLs fail.
 */
export function getFallbackAvatarDataUri(name?: string, role?: string): string {
  const cleanName = (name || '').trim();
  let initials = 'KH';
  if (cleanName) {
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      initials = (Array.from(parts[0])[0] + Array.from(parts[parts.length - 1])[0]).toUpperCase();
    } else if (parts.length === 1) {
      initials = Array.from(parts[0]).slice(0, 2).join('').toUpperCase();
    }
  } else if (role === 'admin') {
    initials = 'AD';
  }

  const isAdmin = role === 'admin';
  const gradStart = isAdmin ? '#059669' : '#0d9488';
  const gradEnd = isAdmin ? '#064e3b' : '#115e59';
  const ringColor = isAdmin ? '#34d399' : '#5eead4';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${gradStart}" />
        <stop offset="100%" stop-color="${gradEnd}" />
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="28" fill="url(#bg)" />
    <rect x="4" y="4" width="112" height="112" rx="24" fill="none" stroke="${ringColor}" stroke-opacity="0.35" stroke-width="2.5" />
    <circle cx="60" cy="44" r="19" fill="#ffffff" fill-opacity="0.16" />
    <path d="M26 104 C26 82 94 82 94 104" fill="#ffffff" fill-opacity="0.16" />
    <text x="60" y="68" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, 'Battambang', sans-serif" font-weight="800" font-size="38" letter-spacing="1">${escapeXml(initials)}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function readAvatarCacheMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(AVATAR_CACHE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAvatarCacheMap(map: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AVATAR_CACHE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Checks whether an avatar string is a generic Unsplash stock placeholder or broken URL.
 */
export function isPlaceholderOrInvalidAvatarUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return true;
  // Known broken or stock Unsplash placeholders from seed data
  if (
    trimmed.includes('photo-1534528741775-53994a69daeb') ||
    trimmed.includes('photo-1507003211169-0a1dd7228f2d') ||
    trimmed.includes('photo-1517841905240-472988babdf9') ||
    trimmed.includes('photo-1535713875002-d1d0cf377fde')
  ) {
    return true;
  }
  if (
    !trimmed.startsWith('data:image/') &&
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('blob:') &&
    !trimmed.startsWith('/')
  ) {
    return true;
  }
  return false;
}

/**
 * Normalizes external avatar URLs (such as Google OAuth lh3.googleusercontent.com URLs)
 * so they load reliably inside Android WebView and desktop browsers.
 */
export function normalizeAvatarUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (isPlaceholderOrInvalidAvatarUrl(trimmed)) return null;

  // Normalize Google profile image URLs (e.g. =s96-c -> =s256-c)
  if (trimmed.includes('googleusercontent.com')) {
    return trimmed.replace(/=s\d+(-c)?$/, '=s256-c');
  }
  return trimmed;
}

/**
 * Persists a user's valid avatar URL in localStorage so it never disappears across sessions or cloud merges.
 */
export function cacheUserAvatar(keyId?: string | null, avatarUrl?: string | null): void {
  if (!keyId) return;
  const normalized = normalizeAvatarUrl(avatarUrl);
  if (!normalized) return;
  // Avoid storing SVG fallback data URIs in the persistent cache
  if (normalized.startsWith('data:image/svg+xml')) return;

  const map = readAvatarCacheMap();
  const cleanKey = keyId.trim().toLowerCase();
  if (map[cleanKey] !== normalized) {
    map[cleanKey] = normalized;
    writeAvatarCacheMap(map);
  }
}

export function getCachedUserAvatar(keyId?: string | null): string | null {
  if (!keyId) return null;
  const map = readAvatarCacheMap();
  return map[keyId.trim().toLowerCase()] || null;
}

/**
 * Resolves the best possible avatar URL for a user:
 * 1. Valid direct avatar on the user object (cached immediately for future sessions)
 * 2. Previously cached valid avatar for this user ID or email/name
 * 3. Instant deterministic SVG data-URI fallback with the user's initials
 */
export function resolveUserAvatarUrl(
  user?: { id?: string; email?: string; name?: string; avatar?: string; role?: string } | null
): string {
  if (!user) {
    return getFallbackAvatarDataUri('Guest', 'user');
  }

  const normalizedDirect = normalizeAvatarUrl(user.avatar);
  if (normalizedDirect) {
    if (user.id) cacheUserAvatar(user.id, normalizedDirect);
    if (user.email) cacheUserAvatar(user.email, normalizedDirect);
    if (user.name) cacheUserAvatar(`name:${user.name}`, normalizedDirect);
    return normalizedDirect;
  }

  const cachedById = getCachedUserAvatar(user.id);
  if (cachedById) return cachedById;

  const cachedByEmail = getCachedUserAvatar(user.email);
  if (cachedByEmail) return cachedByEmail;

  const cachedByName = user.name ? getCachedUserAvatar(`name:${user.name}`) : null;
  if (cachedByName) return cachedByName;

  return getFallbackAvatarDataUri(user.name, user.role);
}

/**
 * Global onError handler for any avatar `<img>` element.
 * Immediately swaps the broken image source to the crisp SVG data-URI badge so the browser's
 * broken-image icon and truncated alt text can never appear.
 */
export function handleAvatarImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  user?: { id?: string; name?: string; role?: string } | null
): void {
  const img = e.currentTarget;
  const fallback = getFallbackAvatarDataUri(user?.name, user?.role);
  if (img.src !== fallback) {
    img.onerror = null;
    img.src = fallback;
  }
}
