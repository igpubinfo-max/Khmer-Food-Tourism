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
    const hasKhmer = /[\u1780-\u17FF]/.test(cleanName);
    // Khmer syllables are multi-codepoint clusters: take ONE whole cluster so vowel signs / coeng are never cut off.
    const take = (word: string, count: number) => splitGraphemes(word).slice(0, count).join('');
    if (hasKhmer) {
      initials = take(parts[0], 1);
    } else if (parts.length >= 2) {
      initials = (take(parts[0], 1) + take(parts[parts.length - 1], 1)).toUpperCase();
    } else {
      initials = take(parts[0], 2).toUpperCase();
    }
    if (!initials) initials = 'KH';
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

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Splits text into user-perceived characters (Khmer clusters, emoji, combining marks stay together). */
function splitGraphemes(text: string): string[] {
  try {
    const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(s: string): Iterable<{ segment: string }> } }).Segmenter;
    if (Seg) {
      return Array.from(new Seg(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment);
    }
  } catch {
    // fall through to manual clustering
  }
  const out: string[] = [];
  let prevWasCoeng = false;
  for (const ch of Array.from(text)) {
    const isMark = /\p{M}/u.test(ch);
    if (out.length > 0 && (isMark || prevWasCoeng)) {
      out[out.length - 1] += ch;
    } else {
      out.push(ch);
    }
    prevWasCoeng = ch === '\u17D2';
  }
  return out;
}

const ADMIN_AVATAR_STORAGE_KEY = 'kft_admin_avatar_v1';
export const DEFAULT_ADMIN_AVATAR_PATH = 'images/admin_profile.png';

/** Resolves a bundled public asset (e.g. `images/x.png` or `/images/x.png`) for web, GitHub Pages sub-paths and the Android WebView. */
export function resolvePublicAssetUrl(path: string): string {
  const clean = String(path || '').replace(/^\.?\//, '');
  let base = './';
  try {
    base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL || './';
  } catch {
    base = './';
  }
  if (!base.endsWith('/')) base += '/';
  return `${base}${clean}`;
}

/** Admin portrait: a photo the admin uploaded on this device, otherwise the bundled official photo. */
export function getAdminAvatarUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(ADMIN_AVATAR_STORAGE_KEY);
      if (saved && saved.startsWith('data:image/')) return saved;
    } catch {
      // ignore
    }
  }
  return resolvePublicAssetUrl(DEFAULT_ADMIN_AVATAR_PATH);
}

export function saveAdminAvatar(dataUrl: string): void {
  if (typeof window === 'undefined' || !dataUrl.startsWith('data:image/')) return;
  try {
    localStorage.setItem(ADMIN_AVATAR_STORAGE_KEY, dataUrl);
  } catch {
    // ignore quota errors
  }
}

export function isCustomUploadedAvatarDataUrl(url?: string | null): boolean {
  return Boolean(
    url &&
      typeof url === 'string' &&
      url.startsWith('data:image/') &&
      !url.startsWith('data:image/svg')
  );
}

/**
 * Reads EXIF orientation (1-8) from JPEG Uint8Array buffer without external libraries.
 * Tag 0x0112:
 * 1: Normal (0°)
 * 3: Upside down (180°)
 * 6: Rotated 90° CW (Smartphone portrait photo)
 * 8: Rotated 270° CW (90° CCW)
 */
export function getExifOrientationFromBytes(bytes: Uint8Array): number {
  if (!bytes || bytes.length < 14) return 1;
  // Check JPEG SOI (0xFFD8)
  if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return 1;

  let offset = 2;
  const length = bytes.length;

  while (offset < length - 2) {
    if (bytes[offset] !== 0xFF) break;
    const marker = bytes[offset + 1];
    if (marker === 0xDA || marker === 0xD9) break; // SOS or EOI

    const segmentLength = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (segmentLength < 2 || offset + 2 + segmentLength > length) break;

    // APP1 marker (0xFFE1) contains EXIF metadata
    if (marker === 0xE1 && segmentLength >= 14) {
      const app1Start = offset + 4;
      // Check for ASCII "Exif\0\0"
      if (
        bytes[app1Start] === 0x45 &&
        bytes[app1Start + 1] === 0x78 &&
        bytes[app1Start + 2] === 0x69 &&
        bytes[app1Start + 3] === 0x66 &&
        bytes[app1Start + 4] === 0x00 &&
        bytes[app1Start + 5] === 0x00
      ) {
        const tiffStart = app1Start + 6;
        const isLittle = bytes[tiffStart] === 0x49 && bytes[tiffStart + 1] === 0x49; // "II"
        const isBig = bytes[tiffStart] === 0x4D && bytes[tiffStart + 1] === 0x4D; // "MM"
        if (!isLittle && !isBig) return 1;

        const readUint16 = (pos: number) => {
          if (pos + 1 >= length) return 0;
          return isLittle
            ? bytes[pos] | (bytes[pos + 1] << 8)
            : (bytes[pos] << 8) | bytes[pos + 1];
        };

        const readUint32 = (pos: number) => {
          if (pos + 3 >= length) return 0;
          return isLittle
            ? (bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24)) >>> 0
            : ((bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3]) >>> 0;
        };

        const ifd0Offset = readUint32(tiffStart + 4);
        if (ifd0Offset < 8 || tiffStart + ifd0Offset >= length) return 1;

        const numEntries = readUint16(tiffStart + ifd0Offset);
        let entryOffset = tiffStart + ifd0Offset + 2;

        for (let i = 0; i < numEntries && entryOffset + 12 <= length; i++) {
          const tag = readUint16(entryOffset);
          if (tag === 0x0112) {
            // Orientation tag
            const orientationVal = readUint16(entryOffset + 8);
            if (orientationVal >= 1 && orientationVal <= 8) {
              return orientationVal;
            }
          }
          entryOffset += 12;
        }
      }
      break;
    }
    offset += 2 + segmentLength;
  }
  return 1;
}

export function getExifOrientationFromDataUrl(dataUrl: string): number {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return 1;
  const comma = dataUrl.indexOf(',');
  if (comma === -1) return 1;
  try {
    const rawB64 = dataUrl.slice(comma + 1, comma + 1 + 65536);
    const bin = atob(rawB64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      u8[i] = bin.charCodeAt(i);
    }
    return getExifOrientationFromBytes(u8);
  } catch {
    return 1;
  }
}

export function exifOrientationToDegrees(orientation: number): number {
  switch (orientation) {
    case 3:
      return 180;
    case 6:
      return 90;
    case 8:
      return 270;
    default:
      return 0;
  }
}

/**
 * Transforms an image source (HTMLImageElement or ImageBitmap) by rotating it by `degrees` (0, 90, 180, 270)
 * and center-cropping to a crisp square at `targetSize` (e.g. 320x320) with high smoothing quality.
 */
export function cropAndRotateSourceToSquare(
  source: HTMLImageElement | ImageBitmap,
  degrees = 0,
  targetSize = 320,
  quality = 0.88
): string {
  const normDeg = ((degrees % 360) + 360) % 360;
  const srcW = 'naturalWidth' in source ? (source.naturalWidth || source.width) : source.width;
  const srcH = 'naturalHeight' in source ? (source.naturalHeight || source.height) : source.height;

  if (!srcW || !srcH) {
    throw new Error('empty_image_dimensions');
  }

  const isRotated90 = normDeg === 90 || normDeg === 270;
  const uprightW = isRotated90 ? srcH : srcW;
  const uprightH = isRotated90 ? srcW : srcH;

  // Step 1: Upright intermediate canvas
  const intCanvas = document.createElement('canvas');
  intCanvas.width = uprightW;
  intCanvas.height = uprightH;
  const intCtx = intCanvas.getContext('2d');
  if (!intCtx) throw new Error('canvas_context_failed');

  intCtx.imageSmoothingEnabled = true;
  intCtx.imageSmoothingQuality = 'high';

  if (normDeg === 90) {
    intCtx.translate(uprightW, 0);
    intCtx.rotate(Math.PI / 2);
  } else if (normDeg === 180) {
    intCtx.translate(uprightW, uprightH);
    intCtx.rotate(Math.PI);
  } else if (normDeg === 270) {
    intCtx.translate(0, uprightH);
    intCtx.rotate((3 * Math.PI) / 2);
  }
  intCtx.drawImage(source, 0, 0);

  // Step 2: Center crop square onto output canvas
  const side = Math.min(uprightW, uprightH);
  const sx = Math.max(0, (uprightW - side) / 2);
  const sy = Math.max(0, (uprightH - side) / 2);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = targetSize;
  outCanvas.height = targetSize;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('canvas_context_failed');

  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.fillStyle = '#0f172a';
  outCtx.fillRect(0, 0, targetSize, targetSize);
  outCtx.drawImage(intCanvas, sx, sy, side, side, 0, 0, targetSize, targetSize);

  return outCanvas.toDataURL('image/jpeg', quality);
}

/**
 * Takes any existing Data URL (such as an already-saved sideways avatar),
 * rotates it by `degrees` (e.g. 90, 180, 270), crops to square, and returns the upright JPEG Data URL.
 */
export function rotateDataUrl(
  dataUrl: string,
  degrees = 90,
  targetSize = 320,
  quality = 0.88
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      reject(new Error('invalid_data_url'));
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const result = cropAndRotateSourceToSquare(img, degrees, targetSize, quality);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('image_decode_failed'));
    img.src = dataUrl;
  });
}

/**
 * Turns a picked photo File/Blob or Data URL into an upright, crisp square JPEG data URL (center-cropped).
 * Auto-corrects EXIF orientation tags from Android/iOS camera sensors and supports manual rotation (0, 90, 180, 270).
 */
export async function fileToAvatarDataUrl(
  fileOrDataUrl: File | Blob | string,
  size = 320,
  quality = 0.88,
  manualRotation = 0
): Promise<string> {
  // If it's a string data URL
  if (typeof fileOrDataUrl === 'string') {
    if (!fileOrDataUrl.startsWith('data:')) {
      throw new Error('invalid_data_url');
    }
    const exifOrientation = getExifOrientationFromDataUrl(fileOrDataUrl);
    const autoExifDeg = exifOrientationToDegrees(exifOrientation);
    const totalDeg = (autoExifDeg + manualRotation) % 360;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const res = cropAndRotateSourceToSquare(img, totalDeg, size, quality);
          resolve(res);
        } catch {
          resolve(fileOrDataUrl);
        }
      };
      img.onerror = () => {
        if (fileOrDataUrl.startsWith('data:image/')) resolve(fileOrDataUrl);
        else reject(new Error('image_decode_failed'));
      };
      img.src = fileOrDataUrl;
    });
  }

  // If it's a File or Blob
  const blob = fileOrDataUrl;
  const fileName = (blob as File).name || '';
  const fileType = blob.type || '';
  if (
    fileType &&
    !fileType.startsWith('image/') &&
    fileType !== 'application/octet-stream' &&
    !/\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(fileName)
  ) {
    throw new Error('not_an_image');
  }

  // 1. Try createImageBitmap with imageOrientation: 'from-image' (modern standard)
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      // createImageBitmap handles EXIF orientation automatically! Only manualRotation needed
      return cropAndRotateSourceToSquare(bmp, manualRotation, size, quality);
    } catch {
      // Fallback to FileReader below
    }
  }

  // 2. Fallback via FileReader + manual EXIF orientation detection
  return new Promise(async (resolve, reject) => {
    try {
      let exifDeg = 0;
      try {
        const arrayBuf = await blob.arrayBuffer();
        const u8 = new Uint8Array(arrayBuf);
        const orientation = getExifOrientationFromBytes(u8);
        exifDeg = exifOrientationToDegrees(orientation);
      } catch {
        exifDeg = 0;
      }

      const totalDeg = (exifDeg + manualRotation) % 360;
      const reader = new FileReader();
      reader.onload = () => {
        const raw = typeof reader.result === 'string' ? reader.result : '';
        if (!raw) {
          reject(new Error('empty_file_reader'));
          return;
        }
        const normalized = raw.startsWith('data:image/')
          ? raw
          : raw.replace(/^data:[^;]+;base64,/, 'data:image/jpeg;base64,');

        const img = new Image();
        img.onload = () => {
          try {
            const out = cropAndRotateSourceToSquare(img, totalDeg, size, quality);
            resolve(out);
          } catch {
            resolve(normalized);
          }
        };
        img.onerror = () => reject(new Error('image_decode_failed'));
        img.src = normalized;
      };
      reader.onerror = () => reject(new Error('file_reader_failed'));
      reader.readAsDataURL(blob);
    } catch (err) {
      reject(err);
    }
  });
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
    !trimmed.startsWith('./') &&
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
  // blob: URLs die on reload — never treat them as a persistent avatar
  if (trimmed.startsWith('blob:')) return null;
  // Bundled assets (e.g. /images/admin_profile.png) must respect the app base path (GitHub Pages / Android WebView)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return resolvePublicAssetUrl(trimmed);
  }
  return trimmed;
}

/**
 * Persists a user's valid avatar URL in localStorage so it never disappears across sessions or cloud merges.
 * Custom uploaded `data:image/` photos are never overwritten by external/stock URLs unless forceOverwrite is true.
 */
export function cacheUserAvatar(
  keyId?: string | null,
  avatarUrl?: string | null,
  forceOverwrite = false
): void {
  if (!keyId) return;
  const normalized = normalizeAvatarUrl(avatarUrl);
  if (!normalized) return;
  // Avoid storing SVG fallback data URIs in the persistent cache
  if (normalized.startsWith('data:image/svg+xml')) return;

  const map = readAvatarCacheMap();
  const cleanKey = keyId.trim().toLowerCase();
  const existing = map[cleanKey];
  if (
    !forceOverwrite &&
    isCustomUploadedAvatarDataUrl(existing) &&
    !isCustomUploadedAvatarDataUrl(normalized)
  ) {
    return;
  }
  if (existing !== normalized) {
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
 * 1. Direct custom uploaded `data:image/` avatar on the user object (cached immediately)
 * 2. Previously cached custom uploaded `data:image/` avatar for this user ID, email, or name
 * 3. Valid external avatar URL on the user object or in cache
 * 4. Instant deterministic SVG data-URI fallback with the user's initials
 */
export function resolveUserAvatarUrl(
  user?: { id?: string; email?: string; name?: string; avatar?: string; role?: string } | null
): string {
  if (!user) {
    return getFallbackAvatarDataUri('Guest', 'user');
  }

  if (user.role === 'admin') {
    return typeof user.avatar === 'string' && isCustomUploadedAvatarDataUrl(user.avatar)
      ? user.avatar
      : getAdminAvatarUrl();
  }

  const normalizedDirect = normalizeAvatarUrl(user.avatar);
  if (isCustomUploadedAvatarDataUrl(normalizedDirect)) {
    if (user.id) cacheUserAvatar(user.id, normalizedDirect, true);
    if (user.email) cacheUserAvatar(user.email, normalizedDirect, true);
    if (user.name) cacheUserAvatar(`name:${user.name}`, normalizedDirect, true);
    return normalizedDirect!;
  }

  const cachedById = getCachedUserAvatar(user.id);
  if (isCustomUploadedAvatarDataUrl(cachedById)) return cachedById!;

  const cachedByEmail = getCachedUserAvatar(user.email);
  if (isCustomUploadedAvatarDataUrl(cachedByEmail)) return cachedByEmail!;

  const cachedByName = user.name ? getCachedUserAvatar(`name:${user.name}`) : null;
  if (isCustomUploadedAvatarDataUrl(cachedByName)) return cachedByName!;

  if (normalizedDirect) {
    if (user.id) cacheUserAvatar(user.id, normalizedDirect);
    if (user.email) cacheUserAvatar(user.email, normalizedDirect);
    if (user.name) cacheUserAvatar(`name:${user.name}`, normalizedDirect);
    return normalizedDirect;
  }

  if (cachedById) return cachedById;
  if (cachedByEmail) return cachedByEmail;
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
