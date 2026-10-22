import { Capacitor, registerPlugin } from '@capacitor/core';
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
  dataUrl: string,
  fileName: string = `ABA-KHQR-${Date.now()}.png`
): Promise<{ saved: boolean; duplicate?: boolean; message: string }> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    throw new Error('រូបភាព QR មិនត្រឹមត្រូវសម្រាប់រក្សាទុក។');
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
 * Opens the native Android Photo/Gallery picker when running on Android and returns a Data URL.
 * Returns { cancelled: true } safely if the user closes the picker without choosing an image.
 */
export async function pickImageUsingNativeAndroidGallery(): Promise<{
  success?: boolean;
  cancelled: boolean;
  dataUrl?: string;
}> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, cancelled: false };
  }
  try {
    const res = await NativeMediaLauncher.pickImageFromGallery();
    if (!res || res.cancelled || !res.dataUrl) {
      return { success: false, cancelled: true };
    }
    return {
      success: true,
      cancelled: false,
      dataUrl: res.dataUrl
    };
  } catch (err) {
    console.warn('Native pickImageFromGallery error:', err);
    return { success: false, cancelled: false };
  }
}

export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validates and compresses a File (JPG, JPEG, PNG, WebP) up to 10MB into a clean JPEG/PNG Data URL.
 */
export function processAndCompressImageFile(
  file: File,
  maxDimension: number = 1000,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('មិនមានឯកសាររូបភាពត្រូវបានជ្រើសរើសទេ។'));
      return;
    }

    const validMime = /^image\/(jpeg|jpg|png|webp|heic|heif)$/i.test(file.type) ||
      /\.(jpe?g|png|webp|heic)$/i.test(file.name || '');
    if (!validMime && file.type && !file.type.startsWith('image/')) {
      reject(new Error('សូមជ្រើសរើសប្រភេទរូបភាពដែលត្រឹមត្រូវ (JPG, JPEG, ឬ PNG)។'));
      return;
    }

    const maxBytes = 12 * 1024 * 1024; // 12 MB
    if (file.size > maxBytes) {
      reject(new Error('ទំហំរូបភាពធំពេក (លើសពី 12MB)។ សូមជ្រើសរើសរូបភាពតូចជាងនេះ។'));
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
          const compressed = canvas.toDataURL('image/jpeg', quality);
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
