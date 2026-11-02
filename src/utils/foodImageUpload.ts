/**
 * Prepares a user-selected food photo for the vision model:
 *  - validates type / size
 *  - fixes EXIF orientation
 *  - downsizes to a sharp-but-light JPEG (default 1280px longest side) - big enough to keep fine food
 *    details (broth, herbs, garnish) for accurate recognition, small enough for mobile data
 *  - returns a tiny preview for the chat bubble
 */

export type FoodImageErrorCode = 'not_image' | 'too_large' | 'decode_failed';

export class FoodImageError extends Error {
  code: FoodImageErrorCode;
  constructor(code: FoodImageErrorCode, message?: string) {
    super(message || code);
    this.code = code;
    this.name = 'FoodImageError';
  }
}

export interface PreparedFoodImage {
  mimeType: 'image/jpeg';
  base64: string;
  previewDataUrl: string;
  width: number;
  height: number;
  bytes: number;
}

export const MAX_INPUT_IMAGE_BYTES = 25 * 1024 * 1024;

/** Pure: scale (w,h) so the longest side is <= maxSide (never upscales). */
export function computeScaledSize(width: number, height: number, maxSide: number): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width: Math.round(width), height: Math.round(height) };
  const ratio = maxSide / longest;
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

async function decodeImage(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close?.() };
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new FoodImageError('decode_failed'));
      el.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err instanceof FoodImageError ? err : new FoodImageError('decode_failed');
  }
}

function renderJpeg(decoded: Decoded, maxSide: number, quality: number): { dataUrl: string; width: number; height: number } {
  const size = computeScaledSize(decoded.width, decoded.height, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new FoodImageError('decode_failed');
  ctx.fillStyle = '#ffffff'; // transparent PNGs -> white instead of black
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(decoded.source, 0, 0, size.width, size.height);
  return { dataUrl: canvas.toDataURL('image/jpeg', quality), width: size.width, height: size.height };
}

export async function prepareFoodImage(
  file: File,
  opts: { maxSide?: number; quality?: number; previewSide?: number } = {}
): Promise<PreparedFoodImage> {
  const isImageType = /^image\//i.test(file.type) || /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(file.name || '');
  if (!isImageType) throw new FoodImageError('not_image');
  if (file.size > MAX_INPUT_IMAGE_BYTES) throw new FoodImageError('too_large');

  const decoded = await decodeImage(file);
  try {
    if (!decoded.width || !decoded.height) throw new FoodImageError('decode_failed');
    const main = renderJpeg(decoded, opts.maxSide ?? 1280, opts.quality ?? 0.86);
    const preview = renderJpeg(decoded, opts.previewSide ?? 360, 0.7);
    const base64 = main.dataUrl.slice(main.dataUrl.indexOf(',') + 1);
    return {
      mimeType: 'image/jpeg',
      base64,
      previewDataUrl: preview.dataUrl,
      width: main.width,
      height: main.height,
      bytes: Math.round((base64.length * 3) / 4),
    };
  } finally {
    decoded.release();
  }
}
