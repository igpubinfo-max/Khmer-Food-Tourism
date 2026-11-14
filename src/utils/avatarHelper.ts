import React from 'react';

const AVATAR_CACHE_STORAGE_KEY = 'kft_user_avatar_cache_v2';
const LEGACY_POISONED_AVATAR_CACHE_KEY = 'kft_user_avatar_cache_v1';

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

const AVATAR_IDB_NAME = 'kft_avatar_vault_idb_v2';
const LEGACY_POISONED_AVATAR_IDB_NAME = 'kft_avatar_vault_idb_v1';
const AVATAR_IDB_STORE = 'avatars';

let memoryAvatarCacheMap: Record<string, string> | null = null;
let memoryAdminAvatar: string | null = null;
let idbHydrationStarted = false;

function openAvatarIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(AVATAR_IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(AVATAR_IDB_STORE)) {
          db.createObjectStore(AVATAR_IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function writeAvatarKeyToIdb(key: string, val: string): void {
  openAvatarIdb()
    .then((db) => {
      if (!db) return;
      try {
        const tx = db.transaction(AVATAR_IDB_STORE, 'readwrite');
        tx.objectStore(AVATAR_IDB_STORE).put(val, key);
      } catch {
        // ignore IDB write error
      }
    })
    .catch(() => {});
}

function deleteAvatarKeyFromIdb(key: string): void {
  openAvatarIdb()
    .then((db) => {
      if (!db) return;
      try {
        const tx = db.transaction(AVATAR_IDB_STORE, 'readwrite');
        tx.objectStore(AVATAR_IDB_STORE).delete(key);
      } catch {
        // ignore IDB delete error
      }
    })
    .catch(() => {});
}

function safeWriteAvatarLocalStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
    return;
  } catch {
    try {
      for (const expendableKey of [
        'kft_google_places_smart_cache_v1',
        'kft_foods_200_v9',
        'kft_foods_200_v8',
        'kft_destinations_real_v8',
        'kft_destinations_real_v7',
        'kft_restaurants_real_v12',
      ]) {
        localStorage.removeItem(expendableKey);
      }
      localStorage.setItem(key, value);
    } catch {
      // IndexedDB & memoryAvatarCacheMap still hold the value safely
    }
  }
}

function hydrateAvatarVaultFromIdbOnce(): void {
  if (idbHydrationStarted || typeof window === 'undefined') return;
  idbHydrationStarted = true;
  try {
    localStorage.removeItem(LEGACY_POISONED_AVATAR_CACHE_KEY);
  } catch {}
  try {
    if (typeof indexedDB !== 'undefined') {
      indexedDB.deleteDatabase(LEGACY_POISONED_AVATAR_IDB_NAME);
    }
  } catch {}
  openAvatarIdb()
    .then((db) => {
      if (!db) return;
      try {
        const tx = db.transaction(AVATAR_IDB_STORE, 'readonly');
        const store = tx.objectStore(AVATAR_IDB_STORE);
        const keysReq = store.getAllKeys();
        const valsReq = store.getAll();
        tx.oncomplete = () => {
          try {
            const keys = keysReq.result || [];
            const vals = valsReq.result || [];
            const map = readAvatarCacheMap();
            let changed = false;
            for (let i = 0; i < keys.length; i++) {
              const k = String(keys[i] || '');
              const v = typeof vals[i] === 'string' ? vals[i] : '';
              if (!k || !v) continue;
              if (k === '__admin_avatar__') {
                if (!memoryAdminAvatar && v.startsWith('data:image/')) {
                  memoryAdminAvatar = v;
                  safeWriteAvatarLocalStorage(ADMIN_AVATAR_STORAGE_KEY, v);
                  changed = true;
                }
                continue;
              }
              if (!map[k] || (isCustomUploadedAvatarDataUrl(v) && !isCustomUploadedAvatarDataUrl(map[k]))) {
                map[k] = v;
                changed = true;
              }
            }
            if (changed) {
              memoryAvatarCacheMap = map;
              safeWriteAvatarLocalStorage(AVATAR_CACHE_STORAGE_KEY, JSON.stringify(map));
              window.dispatchEvent(new CustomEvent('kft-avatar-cache-updated'));
            }
          } catch {
            // ignore
          }
        };
      } catch {
        // ignore
      }
    })
    .catch(() => {});
}

if (typeof window !== 'undefined') {
  hydrateAvatarVaultFromIdbOnce();
}

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
  hydrateAvatarVaultFromIdbOnce();
  if (memoryAdminAvatar && isCustomUploadedAvatarDataUrl(memoryAdminAvatar)) {
    return memoryAdminAvatar;
  }
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(ADMIN_AVATAR_STORAGE_KEY);
      if (saved && isCustomUploadedAvatarDataUrl(saved)) {
        memoryAdminAvatar = saved;
        return saved;
      }
    } catch {
      // ignore
    }
  }
  const cachedAdmin = getCachedUserAvatar('admin-authorized-single') || getCachedUserAvatar('admin');
  if (cachedAdmin && isCustomUploadedAvatarDataUrl(cachedAdmin)) {
    return cachedAdmin;
  }
  return resolvePublicAssetUrl(DEFAULT_ADMIN_AVATAR_PATH);
}

export function saveAdminAvatar(dataUrl: string): void {
  if (!dataUrl || !isCustomUploadedAvatarDataUrl(dataUrl)) return;
  memoryAdminAvatar = dataUrl;
  safeWriteAvatarLocalStorage(ADMIN_AVATAR_STORAGE_KEY, dataUrl);
  writeAvatarKeyToIdb('__admin_avatar__', dataUrl);
  cacheUserAvatar('admin-authorized-single', dataUrl, true);
  cacheUserAvatar('admin', dataUrl, true);
}

/**
 * Checks if a URL is a custom user-uploaded avatar:
 * Either a non-SVG `data:image/...` URI OR a permanent Cloud Storage avatar URL (`/storage/v1/object/public/...` or `/avatars/`).
 */
export function isCustomUploadedAvatarDataUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.includes('ntfy.sh/file/') || trimmed.includes('ntfy.sh/kft_cloud_media_cdn')) {
    return false;
  }
  if (trimmed.startsWith('data:image/') && !trimmed.startsWith('data:image/svg')) {
    return true;
  }
  if (
    (trimmed.startsWith('https://') || trimmed.startsWith('http://')) &&
    (trimmed.includes('/storage/v1/object/public/') || trimmed.includes('/avatars/'))
  ) {
    return true;
  }
  return false;
}

/**
 * Verifies that an avatar URL is valid AND is not a Cloud Storage avatar belonging to a different user account.
 * Cloud Storage avatars follow `/avatars/<ownerSafeId>(_revN)?_<timestamp>_<rand>.<ext>`.
 */
export function isAvatarOwnedByUser(
  url?: string | null,
  user?: {
    id?: string;
    email?: string;
    phone?: string;
    name?: string;
    role?: string;
    legacyIds?: string[];
  } | null
): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (isPlaceholderOrInvalidAvatarUrl(trimmed)) return false;

  const avatarsIdx = trimmed.indexOf('/avatars/');
  if (avatarsIdx !== -1 && user) {
    const afterAvatars = trimmed.slice(avatarsIdx + '/avatars/'.length).split(/[?#]/)[0];
    const m = afterAvatars.match(/^(.+?)(?:_rev\d+)?_\d{10,}_[a-z0-9]+\.[a-z0-9]+$/i);
    if (m && m[1]) {
      const embeddedOwner = m[1].trim().toLowerCase();
      if (user.role === 'admin' || user.id === 'admin-authorized-single') {
        return embeddedOwner === 'admin-authorized-single' || embeddedOwner === 'admin';
      }
      const userKeys = getUserAvatarLookupKeys(user);
      if (userKeys.length > 0) {
        const matchesOwner = userKeys.some((k) => {
          const safeK = k.replace(/[^a-z0-9_-]/g, '_');
          return k === embeddedOwner || safeK === embeddedOwner;
        });
        if (!matchesOwner) return false;
      }
    }
  }
  return true;
}

export const isCustomUploadedAvatarUrl = isCustomUploadedAvatarDataUrl;

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

  const primaryJpg = outCanvas.toDataURL('image/jpeg', quality);
  if (primaryJpg.length <= 22000) {
    return primaryJpg;
  }

  // Adaptive compression so avatars never exceed 22KB (fitting in all localStorage, pre-update backup & cloud sync limits)
  for (const q of [0.76, 0.68]) {
    try {
      const candidate = outCanvas.toDataURL('image/jpeg', q);
      if (candidate.length <= 22000) return candidate;
    } catch {
      // ignore
    }
  }

  try {
    const compactSize = Math.min(targetSize, 240);
    const compactCanvas = document.createElement('canvas');
    compactCanvas.width = compactSize;
    compactCanvas.height = compactSize;
    const cCtx = compactCanvas.getContext('2d');
    if (cCtx) {
      cCtx.imageSmoothingEnabled = true;
      cCtx.imageSmoothingQuality = 'high';
      cCtx.fillStyle = '#0f172a';
      cCtx.fillRect(0, 0, compactSize, compactSize);
      cCtx.drawImage(outCanvas, 0, 0, compactSize, compactSize);
      return compactCanvas.toDataURL('image/jpeg', 0.75);
    }
  } catch {
    // ignore
  }

  return primaryJpg;
}

/**
 * Generates an ultra-compact inline data URL (<= 3,100 chars) from an avatar image or Data URL
 * so real-time secondary cloud pub/sub messages can embed the avatar inline without hitting attachment quotas.
 */
export function createCompactSyncAvatarDataUrl(
  sourceDataOrUrl: string,
  targetSize = 88,
  quality = 0.62
): Promise<string | null> {
  if (!sourceDataOrUrl || typeof document === 'undefined') {
    return Promise.resolve(null);
  }
  if (sourceDataOrUrl.startsWith('data:image/') && sourceDataOrUrl.length <= 3100) {
    return Promise.resolve(sourceDataOrUrl);
  }
  return new Promise((resolve) => {
    const img = new Image();
    if (sourceDataOrUrl.startsWith('http://') || sourceDataOrUrl.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      try {
        for (const [dim, q] of [
          [targetSize, quality],
          [72, 0.56],
          [64, 0.5],
        ] as const) {
          const canvas = document.createElement('canvas');
          canvas.width = dim;
          canvas.height = dim;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          const srcW = img.naturalWidth || img.width || dim;
          const srcH = img.naturalHeight || img.height || dim;
          const side = Math.min(srcW, srcH);
          const sx = Math.max(0, (srcW - side) / 2);
          const sy = Math.max(0, (srcH - side) / 2);
          ctx.drawImage(img, sx, sy, side, side, 0, 0, dim, dim);
          try {
            const webp = canvas.toDataURL('image/webp', q);
            if (webp.startsWith('data:image/webp') && webp.length <= 3100) {
              resolve(webp);
              return;
            }
          } catch {}
          const jpg = canvas.toDataURL('image/jpeg', q);
          if (jpg.length <= 3100) {
            resolve(jpg);
            return;
          }
        }
        resolve(null);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = sourceDataOrUrl;
  });
}

/**
 * Takes any existing Data URL or HTTP(S) image URL (such as an already-saved sideways avatar),
 * rotates it by `degrees` (e.g. 90, 180, 270), crops to square, and returns the upright JPEG Data URL.
 */
export function rotateDataUrl(
  dataUrl: string,
  degrees = 90,
  targetSize = 320,
  quality = 0.86
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!dataUrl || (!dataUrl.startsWith('data:') && !dataUrl.startsWith('http://') && !dataUrl.startsWith('https://') && !dataUrl.startsWith('blob:'))) {
      reject(new Error('invalid_data_url'));
      return;
    }
    const img = new Image();
    if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
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
 * Turns a picked photo File/Blob, Data URL, or HTTP(S) image URL into an upright, crisp square JPEG data URL (center-cropped).
 * Supports manual rotation (0, 90, 180, 270) and avoids double-rotating images on modern browsers/WebViews.
 */
export async function fileToAvatarDataUrl(
  fileOrDataUrl: File | Blob | string,
  size = 320,
  quality = 0.86,
  manualRotation = 0
): Promise<string> {
  if (typeof fileOrDataUrl === 'string') {
    const trimmed = fileOrDataUrl.trim();
    if (
      !trimmed.startsWith('data:') &&
      !trimmed.startsWith('http://') &&
      !trimmed.startsWith('https://') &&
      !trimmed.startsWith('blob:') &&
      !trimmed.startsWith('./') &&
      !trimmed.startsWith('/')
    ) {
      throw new Error('invalid_data_url');
    }

    // Modern Chromium / Android WebView / Safari HTMLImageElement automatically applies EXIF orientation
    // (`image-orientation: from-image` is standard), and NativeAbaLauncherPlugin already normalizes EXIF.
    // Therefore, only apply `manualRotation` so upright photos are never double-rotated sideways.
    const totalDeg = ((manualRotation % 360) + 360) % 360;

    return new Promise((resolve, reject) => {
      const img = new Image();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        try {
          const res = cropAndRotateSourceToSquare(img, totalDeg, size, quality);
          resolve(res);
        } catch {
          resolve(trimmed);
        }
      };
      img.onerror = () => {
        if (trimmed.startsWith('data:image/')) resolve(trimmed);
        else reject(new Error('image_decode_failed'));
      };
      img.src = trimmed;
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
      return cropAndRotateSourceToSquare(bmp, manualRotation, size, quality);
    } catch {
      // Fallback to FileReader below
    }
  }

  // 2. Fallback via FileReader
  return new Promise((resolve, reject) => {
    try {
      const totalDeg = ((manualRotation % 360) + 360) % 360;
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
  if (memoryAvatarCacheMap) {
    return memoryAvatarCacheMap;
  }
  hydrateAvatarVaultFromIdbOnce();
  if (typeof localStorage === 'undefined') {
    memoryAvatarCacheMap = {};
    return memoryAvatarCacheMap;
  }
  try {
    const raw = localStorage.getItem(AVATAR_CACHE_STORAGE_KEY);
    if (!raw) {
      memoryAvatarCacheMap = {};
      return memoryAvatarCacheMap;
    }
    const parsed = JSON.parse(raw);
    memoryAvatarCacheMap = parsed && typeof parsed === 'object' ? parsed : {};
    return memoryAvatarCacheMap!;
  } catch {
    memoryAvatarCacheMap = {};
    return memoryAvatarCacheMap;
  }
}

function writeAvatarCacheMap(map: Record<string, string>): void {
  memoryAvatarCacheMap = map;
  safeWriteAvatarLocalStorage(AVATAR_CACHE_STORAGE_KEY, JSON.stringify(map));
}

/**
 * Checks whether an avatar string is a generic Unsplash stock placeholder or broken URL.
 */
export function isPlaceholderOrInvalidAvatarUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return true;
  // Known broken, expired ephemeral relay (ntfy.sh/file/), or stock Unsplash placeholders from seed data
  if (
    trimmed.includes('ntfy.sh/file/') ||
    trimmed.includes('ntfy.sh/kft_cloud_media_cdn') ||
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
 * Persists a user's valid avatar URL in localStorage + IndexedDB so it never disappears across sessions or cloud merges.
 * Custom uploaded photos are never overwritten by external/stock URLs unless forceOverwrite is true.
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
  if (!cleanKey) return;
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
    writeAvatarKeyToIdb(cleanKey, normalized);
  }
}

export function getCachedUserAvatar(keyId?: string | null): string | null {
  if (!keyId) return null;
  const map = readAvatarCacheMap();
  const cleanKey = keyId.trim().toLowerCase();
  return map[cleanKey] || null;
}

/**
 * Returns all candidate cache lookup keys for a user account (id, canonical email IDs, legacyIds, email, phone, name)
 * so the user's profile picture is found regardless of whether they logged in via Google, Email, or Phone.
 */
export function getUserAvatarLookupKeys(user?: {
  id?: string;
  email?: string;
  phone?: string;
  name?: string;
  legacyIds?: string[];
} | null): string[] {
  if (!user) return [];
  const keys = new Set<string>();
  const add = (k?: string | null) => {
    if (!k) return;
    const clean = k.trim().toLowerCase();
    if (clean) keys.add(clean);
  };
  add(user.id);
  if (Array.isArray(user.legacyIds)) {
    for (const lid of user.legacyIds) add(lid);
  }
  if (user.email) {
    const cleanEmail = user.email.trim().toLowerCase();
    add(cleanEmail);
    if (cleanEmail.includes('@')) {
      const slug = cleanEmail.replace(/[^a-z0-9]/g, '_');
      add(`google-${slug}`);
      add(`user-${slug}`);
      add(`owner-${slug}`);
    }
  }
  if (user.phone) {
    const digits = user.phone.replace(/[\s-+()]/g, '');
    if (digits.length >= 7) {
      add(`phone:${digits}`);
      add(`user-phone-${digits}`);
    }
  }
  return Array.from(keys);
}

/**
 * Caches a user's avatar strictly across unique identity keys for their own account.
 */
export function cacheUserAvatarForAccount(
  user?: {
    id?: string;
    email?: string;
    phone?: string;
    name?: string;
    role?: string;
    legacyIds?: string[];
  } | null,
  avatarUrl?: string | null,
  forceOverwrite = false
): void {
  if (!user || !avatarUrl) return;
  if (!isAvatarOwnedByUser(avatarUrl, user)) return;
  if (user.role === 'admin') {
    saveAdminAvatar(avatarUrl);
  }
  const accountKeys = getUserAvatarLookupKeys(user);
  for (const k of accountKeys) {
    cacheUserAvatar(k, avatarUrl, forceOverwrite);
  }
}

/**
 * Retrieves the best cached avatar strictly for THIS user across their own identity keys,
 * prioritizing custom uploaded `data:image/` or Cloud Storage avatars over generic URLs.
 * Never scans or returns avatars belonging to other accounts on the device.
 */
export function getCachedUserAvatarForAccount(
  user?: {
    id?: string;
    email?: string;
    phone?: string;
    name?: string;
    role?: string;
    legacyIds?: string[];
  } | null
): string | null {
  if (!user) return null;
  const keys = getUserAvatarLookupKeys(user);
  if (keys.length === 0) return null;
  let fallbackValid: string | null = null;
  for (const k of keys) {
    const cand = getCachedUserAvatar(k);
    if (!cand || !isAvatarOwnedByUser(cand, user)) continue;
    if (cand.startsWith('data:image/') && !cand.startsWith('data:image/svg')) {
      return cand;
    }
    if (isCustomUploadedAvatarDataUrl(cand) && !fallbackValid) {
      fallbackValid = cand;
    } else if (!fallbackValid) {
      fallbackValid = cand;
    }
  }
  return fallbackValid;
}

/**
 * Explicitly clears cached custom avatars for a user account ONLY when the user manually taps "Use Default Avatar (Reset)".
 */
export function clearCachedUserAvatarForAccount(
  user?: {
    id?: string;
    email?: string;
    phone?: string;
    name?: string;
    role?: string;
    legacyIds?: string[];
  } | null
): void {
  if (!user) return;
  if (user.role === 'admin') {
    memoryAdminAvatar = null;
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(ADMIN_AVATAR_STORAGE_KEY);
      } catch {}
    }
    deleteAvatarKeyFromIdb('__admin_avatar__');
  }
  const map = readAvatarCacheMap();
  let changed = false;
  for (const k of getUserAvatarLookupKeys(user)) {
    if (k in map) {
      delete map[k];
      deleteAvatarKeyFromIdb(k);
      changed = true;
    }
  }
  if (changed) {
    writeAvatarCacheMap(map);
  }
}

/**
 * Resolves the best possible avatar URL for a user:
 * 1. Direct custom uploaded `data:image/` or Cloud Storage avatar on the user object (cached immediately)
 * 2. Previously cached custom uploaded avatar for this user ID, canonical email ID, legacyIds, email, phone, or name
 * 3. Valid external avatar URL on the user object or in cache
 * 4. Instant deterministic SVG data-URI fallback with the user's initials
 */
export function resolveUserAvatarUrl(
  userOrAvatar?:
    | {
        id?: string;
        email?: string;
        phone?: string;
        name?: string;
        avatar?: string;
        cloudAvatarUrl?: string;
        role?: string;
        legacyIds?: string[];
      }
    | string
    | null,
  nameArg?: string,
  roleArg?: string,
  idArg?: string,
  emailArg?: string
): string {
  const user =
    typeof userOrAvatar === 'string'
      ? {
          avatar: userOrAvatar,
          name: nameArg,
          role: roleArg,
          id: idArg,
          email: emailArg,
        }
      : userOrAvatar && typeof userOrAvatar === 'object'
        ? userOrAvatar
        : nameArg || roleArg || idArg || emailArg
          ? {
              avatar: '',
              name: nameArg,
              role: roleArg,
              id: idArg,
              email: emailArg,
            }
          : null;
  if (!user) {
    return getFallbackAvatarDataUri('Guest', 'user');
  }

  if (user.role === 'admin') {
    if (typeof user.avatar === 'string' && isCustomUploadedAvatarDataUrl(user.avatar)) {
      saveAdminAvatar(user.avatar);
      return user.avatar;
    }
    if (typeof user.cloudAvatarUrl === 'string' && isCustomUploadedAvatarDataUrl(user.cloudAvatarUrl)) {
      return user.cloudAvatarUrl;
    }
    return getAdminAvatarUrl();
  }

  const socialTkAv = (user as any)?.socialAccounts?.tiktok?.avatarUrl;
  const socialFbAv = (user as any)?.socialAccounts?.facebook?.avatarUrl;
  const rawDirect = normalizeAvatarUrl(user.avatar);
  const rawCloud = normalizeAvatarUrl(user.cloudAvatarUrl);
  const normalizedDirect = rawDirect && isAvatarOwnedByUser(rawDirect, user) ? rawDirect : null;
  const normalizedCloud = rawCloud && isAvatarOwnedByUser(rawCloud, user) ? rawCloud : null;
  const normalizedSocial = normalizeAvatarUrl(socialTkAv) || normalizeAvatarUrl(socialFbAv);

  // If user.avatar is a direct custom data:image/, cache it across all account keys and return immediately
  if (normalizedDirect && normalizedDirect.startsWith('data:image/') && !normalizedDirect.startsWith('data:image/svg')) {
    cacheUserAvatarForAccount(user, normalizedDirect, true);
    return normalizedDirect;
  }

  // Check if we have a local data:image/ cached for instant offline-capable rendering
  const cachedAccountAv = getCachedUserAvatarForAccount(user);
  if (cachedAccountAv && cachedAccountAv.startsWith('data:image/') && !cachedAccountAv.startsWith('data:image/svg')) {
    return cachedAccountAv;
  }

  // If user.avatar or user.cloudAvatarUrl is a custom Cloud Storage URL, cache & return it
  if (normalizedDirect && isCustomUploadedAvatarDataUrl(normalizedDirect)) {
    cacheUserAvatarForAccount(user, normalizedDirect, true);
    return normalizedDirect;
  }
  if (normalizedCloud && isCustomUploadedAvatarDataUrl(normalizedCloud)) {
    cacheUserAvatarForAccount(user, normalizedCloud, true);
    return normalizedCloud;
  }

  if (cachedAccountAv && isCustomUploadedAvatarDataUrl(cachedAccountAv)) {
    return cachedAccountAv;
  }

  if (normalizedDirect) {
    cacheUserAvatarForAccount(user, normalizedDirect, false);
    return normalizedDirect;
  }

  if (cachedAccountAv) {
    return cachedAccountAv;
  }
  if (normalizedSocial) {
    return normalizedSocial;
  }

  return getFallbackAvatarDataUri(user.name, user.role);
}

/**
 * Global onError handler for any avatar `<img>` element.
 * First attempts to recover from any cached `data:image/` avatar for the user before falling back
 * to the crisp SVG data-URI badge so broken image icons never appear.
 */
export function handleAvatarImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  user?: {
    id?: string;
    email?: string;
    phone?: string;
    name?: string;
    role?: string;
    legacyIds?: string[];
  } | null
): void {
  const img = e.currentTarget;
  const cached = getCachedUserAvatarForAccount(user);
  if (
    cached &&
    cached.startsWith('data:image/') &&
    !cached.startsWith('data:image/svg') &&
    img.src !== cached
  ) {
    img.src = cached;
    return;
  }
  const fallback = getFallbackAvatarDataUri(user?.name, user?.role);
  if (img.src !== fallback) {
    img.onerror = null;
    img.src = fallback;
  }
}
