import { Capacitor, registerPlugin } from '@capacitor/core';
import { PLAY_STORE_URL, recordMeaningfulAction } from './engagement';
import jsQR from 'jsqr';

interface NativeMediaLauncherPlugin {
  saveImageToGallery(options: { base64Data: string; fileName?: string }): Promise<{
    saved: boolean;
    duplicate?: boolean;
    uri?: string;
    fileName?: string;
    message?: string;
  }>;
  pickImageFromGallery(): Promise<{
    cancelled: boolean;
    dataUrl?: string;
    uri?: string;
    width?: number;
    height?: number;
  }>;
  pickMultipleImagesFromGallery(options?: {
    maxCount?: number;
    maxDimension?: number;
  }): Promise<{
    success: boolean;
    cancelled: boolean;
    dataUrls: string[];
    count?: number;
  }>;
  shareContent(options: {
    title?: string;
    text?: string;
    url?: string;
    photoUrl?: string;
  }): Promise<{
    shared: boolean;
    hasImage?: boolean;
  }>;
  copyToClipboard(options: {
    text: string;
    label?: string;
  }): Promise<{
    copied: boolean;
  }>;
}

const NativeMediaLauncher = registerPlugin<NativeMediaLauncherPlugin>('NativeAbaLauncher');

let lastSavedDataHash = '';
let lastSaveTimestamp = 0;

/**
 * Saves a PNG/JPG Data URL directly to Android Gallery/Photos (Pictures/KhmerFoodTourism)
 * using Android MediaStore (Scoped Storage compatible on Android 10–14+) or downloads in browser.
 * Includes duplicate-save prevention.
 */
export async function savePngDataUrlToGallery(
  inputUrlOrDataUrl: string,
  fileName: string = `ABA-KHQR-${Date.now()}.png`
): Promise<{ saved: boolean; duplicate?: boolean; message: string }> {
  if (!inputUrlOrDataUrl) {
    throw new Error('រូបភាព QR មិនត្រឹមត្រូវសម្រាប់រក្សាទុក។');
  }

  let dataUrl = inputUrlOrDataUrl;
  if (!dataUrl.startsWith('data:image/')) {
    const resp = await fetch(dataUrl);
    if (!resp.ok) {
      throw new Error('មិនអាចទាញយករូបភាព QR ផ្លូវការបានទេ។');
    }
    const blob = await resp.blob();
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('បរាជ័យក្នុងការអានរូបភាព QR។'));
        }
      };
      reader.onerror = () => reject(new Error('បរាជ័យក្នុងការអានរូបភាព QR។'));
      reader.readAsDataURL(blob);
    });
  }

  const now = Date.now();
  const quickHash = `${dataUrl.length}:${dataUrl.slice(-64)}`;
  if (quickHash === lastSavedDataHash && now - lastSaveTimestamp < 2500) {
    return {
      saved: true,
      duplicate: true,
      message: 'រូបភាព QR នេះត្រូវបានរក្សាទុករួចហើយនៅក្នុង Gallery / Photos!'
    };
  }

  const sanitizedName = fileName.endsWith('.png') ? fileName : `${fileName}.png`;

  if (Capacitor.isNativePlatform()) {
    try {
      const result = await NativeMediaLauncher.saveImageToGallery({
        base64Data: dataUrl,
        fileName: sanitizedName
      });
      if (result && result.saved) {
        lastSavedDataHash = quickHash;
        lastSaveTimestamp = Date.now();
        return {
          saved: true,
          duplicate: Boolean(result.duplicate),
          message: result.duplicate
            ? 'រូបភាព QR ត្រូវបានរក្សាទុករួចហើយនៅក្នុង Gallery / Photos!'
            : `បានរក្សាទុករូបភាព QR ទៅក្នុង Gallery / Photos រួចរាល់ (${result.fileName || sanitizedName})!`
        };
      }
    } catch (nativeErr) {
      console.warn('Native saveImageToGallery fallback:', nativeErr);
    }
  }

  // Web / fallback download via Blob URL (works reliably across modern browsers)
  try {
    const parts = dataUrl.split(',');
    const byteString = atob(parts[1]);
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = sanitizedName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);

    lastSavedDataHash = quickHash;
    lastSaveTimestamp = Date.now();
    return {
      saved: true,
      duplicate: false,
      message: `បានទាញយករូបភាព QR (${sanitizedName}) រួចរាល់!`
    };
  } catch (err: any) {
    throw new Error(err?.message || 'មិនអាចរក្សាទុករូបភាព QR បានទេ។ សូមព្យាយាមម្ដងទៀត។');
  }
}

/**
 * Ensures any native gallery Data URL larger than ~160 KB (e.g. uncompressed PNG screenshots)
 * is downscaled and compressed to an optimized JPEG Data URL so it never bloats localStorage or Supabase.
 */
async function compressDataUrlIfLarge(
  dataUrl: string,
  maxDimension: number = 1000,
  quality: number = 0.80
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/') || dataUrl.length <= 220000) {
    return dataUrl;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.width || maxDimension;
        let h = img.height || maxDimension;
        if (w > maxDimension || h > maxDimension) {
          if (w > h) {
            h = Math.round((h * maxDimension) / w);
            w = maxDimension;
          } else {
            w = Math.round((w * maxDimension) / h);
            h = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function isNativeAndroidOrIosPlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Opens the native Android Photo/Gallery picker when running on Android and returns a Data URL.
 * Returns { cancelled: true } safely if the user closes the picker without choosing an image.
 */
export async function pickImageUsingNativeAndroidGallery(
  _maxDimension?: number,
  _quality?: number
): Promise<{
  success?: boolean;
  cancelled: boolean;
  dataUrl?: string;
  fileName?: string;
  mimeType?: string;
}> {
  if (!isNativeAndroidOrIosPlatform()) {
    return { success: false, cancelled: false };
  }
  try {
    const res = await NativeMediaLauncher.pickImageFromGallery();
    if (!res || res.cancelled || !res.dataUrl) {
      return { success: false, cancelled: true };
    }
    const optimizedUrl = await compressDataUrlIfLarge(res.dataUrl, 1000, 0.80);
    return {
      success: true,
      cancelled: false,
      dataUrl: optimizedUrl
    };
  } catch (err) {
    console.warn('Native pickImageFromGallery error:', err);
    return { success: false, cancelled: false };
  }
}

/**
 * Opens the native Android Photo/Gallery picker with MULTIPLE SELECTION enabled in one step.
 * Allows users to select several photos from their phone gallery at once.
 */
export async function pickMultipleImagesUsingNativeAndroidGallery(
  maxCount: number = 10,
  maxDimension: number = 1200
): Promise<{
  success: boolean;
  cancelled: boolean;
  dataUrls: string[];
}> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, cancelled: false, dataUrls: [] };
  }
  try {
    const res = await NativeMediaLauncher.pickMultipleImagesFromGallery({
      maxCount,
      maxDimension,
    });
    if (!res || res.cancelled || !Array.isArray(res.dataUrls)) {
      return { success: false, cancelled: Boolean(res?.cancelled), dataUrls: [] };
    }
    const optimizedUrls: string[] = [];
    for (const rawUrl of res.dataUrls) {
      optimizedUrls.push(await compressDataUrlIfLarge(rawUrl, 1000, 0.80));
    }
    return {
      success: optimizedUrls.length > 0,
      cancelled: false,
      dataUrls: optimizedUrls,
    };
  } catch (err) {
    console.warn('Native pickMultipleImagesFromGallery error:', err);
    return { success: false, cancelled: false, dataUrls: [] };
  }
}

/**
 * Validates and batch-compresses multiple File objects (up to maxCount) into Data URLs.
 */
export async function batchProcessAndCompressImageFiles(
  files: File[],
  maxCount: number = 10,
  maxDimension: number = 1100,
  quality: number = 0.82
): Promise<string[]> {
  const selectedFiles = Array.from(files || []).slice(0, maxCount);
  const results: string[] = [];

  for (const file of selectedFiles) {
    try {
      const dataUrl = await processAndCompressImageFile(file, maxDimension, quality);
      if (dataUrl) {
        results.push(dataUrl);
      }
    } catch (err) {
      console.warn('Skipping unreadable or invalid image file:', file.name, err);
    }
  }

  return results;
}

export const MAX_IMAGE_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Validates and compresses a File (JPG, JPEG, PNG, WebP) up to 20MB into a clean JPEG/WebP Data URL.
 * Supports both (file, maxDimension, quality) and legacy 4-arg (file, maxWidth, maxHeight, quality).
 */
export function processAndCompressImageFile(
  file: File,
  maxDimension: number = 1000,
  quality: number = 0.82,
  maybeQuality?: number
): Promise<string> {
  const effectiveQuality =
    typeof maybeQuality === 'number' && maybeQuality > 0 && maybeQuality <= 1
      ? maybeQuality
      : quality > 0 && quality <= 1
        ? quality
        : 0.85;

  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('មិនមានឯកសាររូបភាពត្រូវបានជ្រើសរើសទេ។'));
      return;
    }

    const validMime = /^image\/(jpeg|jpg|png|webp|heic|heif)$/i.test(file.type) ||
      /\.(jpe?g|png|webp|heic)$/i.test(file.name || '');
    if (!validMime && file.type && !file.type.startsWith('image/')) {
      reject(new Error('សូមជ្រើសរើសប្រភេទរូបភាពដែលត្រឹមត្រូវ (JPG, JPEG, WebP ឬ PNG)។'));
      return;
    }

    const maxBytes = 20 * 1024 * 1024; // 20 MB
    if (file.size > maxBytes) {
      reject(new Error('ទំហំរូបភាពធំពេក (លើសពី 20MB)។ សូមជ្រើសរើសរូបភាពតូចជាងនេះ។'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('មិនអាចអានឯកសាររូបភាពពី Gallery បានទេ។'));
    reader.onload = (ev) => {
      const rawDataUrl = ev.target?.result as string;
      if (!rawDataUrl) {
        reject(new Error('ទិន្នន័យរូបភាពទទេ។'));
        return;
      }

      const img = new Image();
      img.onerror = () => {
        // Fallback to raw data URL if Image decode fails
        resolve(rawDataUrl);
      };
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', effectiveQuality);
          resolve(compressed);
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Multi-scale + multi-crop QR decoder from an image Data URL.
 * Reliably extracts QR payloads from full-screen phone screenshots (ABA KHQR screenshots)
 * as well as standalone QR images.
 */
export function decodeQrFromImageDataUrl(dataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => resolve(null);
    img.onload = () => {
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;
      if (!origW || !origH) {
        resolve(null);
        return;
      }

      const tryScanRegion = (
        sx: number,
        sy: number,
        sw: number,
        sh: number,
        targetMaxDim: number
      ): string | null => {
        try {
          let dw = sw;
          let dh = sh;
          if (dw > targetMaxDim || dh > targetMaxDim) {
            const ratio = Math.min(targetMaxDim / dw, targetMaxDim / dh);
            dw = Math.max(64, Math.round(dw * ratio));
            dh = Math.max(64, Math.round(dh * ratio));
          }
          const canvas = document.createElement('canvas');
          canvas.width = dw;
          canvas.height = dh;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return null;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, dw, dh);
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
          const imageData = ctx.getImageData(0, 0, dw, dh);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
          });
          if (code && code.data && code.data.trim()) {
            return code.data.trim();
          }
        } catch {
          // ignore
        }
        return null;
      };

      // Pass 1: Full image at multiple target resolutions (handles both tiny QRs and 4K phone screenshots)
      const fullScales = [1200, 800, 520, 1600];
      for (const maxDim of fullScales) {
        const res = tryScanRegion(0, 0, origW, origH, maxDim);
        if (res) {
          resolve(res);
          return;
        }
      }

      // Pass 2: Center crops (ABA KHQR cards sit in the middle of tall phone screenshots)
      const cropConfigs = [
        { x: 0.05, y: 0.15, w: 0.9, h: 0.7 },
        { x: 0.1, y: 0.2, w: 0.8, h: 0.6 },
        { x: 0.0, y: 0.1, w: 1.0, h: 0.8 },
        { x: 0.15, y: 0.25, w: 0.7, h: 0.5 }
      ];
      for (const crop of cropConfigs) {
        const sx = Math.round(origW * crop.x);
        const sy = Math.round(origH * crop.y);
        const sw = Math.round(origW * crop.w);
        const sh = Math.round(origH * crop.h);
        if (sw > 40 && sh > 40) {
          const res = tryScanRegion(sx, sy, sw, sh, 900);
          if (res) {
            resolve(res);
            return;
          }
        }
      }

      resolve(null);
    };
    img.src = dataUrl;
  });
}

export interface RichShareOptions {
  title: string;
  nameKh?: string;
  nameEn?: string;
  description?: string;
  location?: string;
  phone?: string;
  priceDisplay?: string;
  signatureDishes?: string[];
  photoUrl?: string;
  mapUrl?: string;
  itemType: 'restaurant' | 'food' | 'destination' | 'trending' | 'post';
  itemId?: string;
  isKm?: boolean;
}

export function buildPublicDirectLink(itemType: string, itemId?: string, mapUrl?: string): string {
  const origin =
    typeof window !== 'undefined' &&
    window.location?.origin &&
    !window.location.origin.includes('localhost') &&
    !window.location.origin.includes('127.0.0.1') &&
    !window.location.origin.startsWith('capacitor://')
      ? window.location.origin
      : 'https://khmerfoodtourism.com';

  if (itemId) {
    return `${origin}/?${itemType}=${encodeURIComponent(itemId)}`;
  }
  return mapUrl || origin;
}

export function formatRichShareText(options: RichShareOptions): {
  title: string;
  fullText: string;
  directLink: string;
} {
  const isKm = options.isKm !== false;
  const directLink = buildPublicDirectLink(options.itemType, options.itemId, options.mapUrl);
  const titleHeader =
    options.nameKh && options.nameEn && options.nameKh !== options.nameEn
      ? `${options.nameKh} (${options.nameEn})`
      : options.title;

  const lines: string[] = [];
  const typeEmoji =
    options.itemType === 'restaurant'
      ? '🏪'
      : options.itemType === 'food'
      ? '🍲'
      : options.itemType === 'destination'
      ? '🏛️'
      : options.itemType === 'trending'
      ? '🔥'
      : '🇰🇭';

  lines.push(`${typeEmoji} ${titleHeader}`);

  if (options.description && options.description.trim()) {
    lines.push(`📝 ${options.description.trim()}`);
  }

  if (options.signatureDishes && options.signatureDishes.length > 0) {
    const label = isKm ? '🍽️ មុខម្ហូបពិសេស៖' : '🍽️ Signature Dishes:';
    lines.push(`${label} ${options.signatureDishes.slice(0, 4).join(', ')}`);
  }

  if (options.priceDisplay && options.priceDisplay.trim()) {
    const rawPrice = options.priceDisplay.trim();
    const label = isKm
      ? rawPrice.includes('ប្រហាក់ប្រហែល') ? '💰 តម្លៃ៖' : '💰 តម្លៃប្រហាក់ប្រហែល៖'
      : /approx/i.test(rawPrice) ? '💰 Price:' : '💰 Approx. Price:';
    lines.push(`${label} ${rawPrice}`);
  }

  if (options.location && options.location.trim()) {
    lines.push(`📍 ${isKm ? 'ទីតាំង៖' : 'Location:'} ${options.location.trim()}`);
  }

  if (options.phone && options.phone.trim()) {
    lines.push(`📞 ${isKm ? 'ទូរស័ព្ទ៖' : 'Phone:'} ${options.phone.trim()}`);
  }

  if (options.mapUrl && options.mapUrl.trim()) {
    lines.push(`🗺️ Google Maps: ${options.mapUrl.trim()}`);
  }

  lines.push(`🔗 ${isKm ? 'តំណភ្ជាប់ផ្ទាល់៖' : 'Direct Link:'} ${directLink}`);

  // Short bilingual recommendation line + Play Store link (placeholder id until the app is published)
  lines.push('');
  lines.push('🇰🇭 រសជាតិ និងទេសចរណ៍កម្ពុជា — Cambodia Flavors & Tourism');
  lines.push(`📲 Google Play: ${PLAY_STORE_URL}`);

  return {
    title: titleHeader,
    fullText: lines.join('\n'),
    directLink,
  };
}

/**
 * Copies text reliably on both Android native (via ClipboardManager) and Web browsers.
 */
export async function copyTextNativeOrWeb(text: string, label: string = 'Cambodia Flavors & Tourism'): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await NativeMediaLauncher.copyToClipboard({ text, label });
      if (res && res.copied) return true;
    } catch {
      // fallback below
    }
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback textarea
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

/**
 * Shares restaurant, food, destination, or community post using the Android Native Share Sheet
 * (with photo attachment, name, description, location, and direct links for Telegram, Facebook,
 * Messenger, WhatsApp, and other installed apps), or Web Share API / Clipboard fallback.
 */
async function shareRichContentInner(
  options: RichShareOptions,
  onToast?: (msg: string, type?: 'success' | 'info' | 'warning') => void
): Promise<boolean> {
  const isKm = options.isKm !== false;
  const { title, fullText, directLink } = formatRichShareText(options);

  // 1. Native Android Share Sheet via Capacitor Plugin (supports photo + text + links across all apps)
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await NativeMediaLauncher.shareContent({
        title,
        text: fullText,
        url: options.mapUrl || directLink,
        photoUrl: options.photoUrl || '',
      });
      if (res && res.shared) {
        return true;
      }
    } catch (err) {
      console.warn('Native shareContent fallback:', err);
    }
  }

  // 2. Web Share API (Mobile / Desktop Browsers)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      // Try attaching the image file if browser supports file sharing
      if (options.photoUrl && typeof navigator.canShare === 'function') {
        try {
          const resp = await fetch(options.photoUrl);
          if (resp.ok) {
            const blob = await resp.blob();
            const file = new File([blob], 'discover-cambodia.jpg', { type: blob.type || 'image/jpeg' });
            if (navigator.canShare({ files: [file], title, text: fullText })) {
              await navigator.share({
                files: [file],
                title,
                text: fullText,
              });
              return true;
            }
          }
        } catch {
          // continue to text/url web share
        }
      }

      await navigator.share({
        title,
        text: fullText,
        url: options.mapUrl || directLink,
      });
      return true;
    } catch (err: any) {
      if (err && err.name === 'AbortError') {
        return false;
      }
    }
  }

  // 3. Fallback: Copy full details & direct links to clipboard
  const copied = await copyTextNativeOrWeb(fullText, title);
  if (copied && onToast) {
    onToast(
      isKm
        ? 'បានចម្លងឈ្មោះ ពិពណ៌នា ទីតាំង និងតំណភ្ជាប់ផ្ទាល់រួចរាល់!'
        : 'Copied name, description, location, and direct link!',
      'success'
    );
  }
  return copied;
}

/** Public share entry point: shares, and counts a successful share as a meaningful action. */
export async function shareRichContent(
  options: RichShareOptions,
  onToast?: (msg: string, type?: 'success' | 'info' | 'warning') => void
): Promise<boolean> {
  const ok = await shareRichContentInner(options, onToast);
  if (ok) recordMeaningfulAction('share');
  return ok;
}
