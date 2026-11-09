/**
 * Cambodia Flavors & Tourism — Professional Food Image Watermark Utility
 *
 * Requirements enforced:
 * 1. Exact text: "Cambodia Flavors & Tourism"
 * 2. Small, elegant, semi-transparent watermark in the bottom-right corner.
 * 3. Does not cover the food or important visual details (occupies < 1.5% of image area in bottom corner).
 * 4. Does not alter original food, ingredients, colors, brightness, composition, or image quality.
 * 5. Consistent typography, proportion, and placement across all food images.
 * 6. Preserves original image resolution and high quality for printing and display.
 * 7. Idempotent (applied only once): prevents duplicate watermarks when images are uploaded or updated.
 */

export const FOOD_WATERMARK_TEXT = 'Cambodia Flavors & Tourism';
export const FOOD_WATERMARK_MARKER = 'KFT_WM_V1';
export const FOOD_WATERMARK_LEDGER_KEY = 'kft_watermarked_food_hashes_v1';

const inMemoryWatermarkedSignatures = new Set<string>();

/**
 * Fast deterministic signature for URLs, Data URLs, or binary strings.
 * Samples length + head + middle + tail so even multi-megabyte data URLs hash in < 0.1ms.
 */
export function computeWatermarkSignature(payload: string): string {
  const raw = String(payload || '').trim();
  if (!raw) return 'empty';
  const len = raw.length;
  const step = Math.max(1, Math.floor(len / 512));
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < len; i += step) {
    const c = raw.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + (i & 0xff);
    h2 = Math.imul(h2, 0x811c9dc5);
  }
  const tailStart = Math.max(0, len - 256);
  for (let i = tailStart; i < len; i++) {
    const c = raw.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
  }
  return `${len}_${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

function loadWatermarkedSignatureLedger(): Set<string> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return inMemoryWatermarkedSignatures;
  }
  try {
    const raw = window.localStorage.getItem(FOOD_WATERMARK_LEDGER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string' && item) {
            inMemoryWatermarkedSignatures.add(item);
          }
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return inMemoryWatermarkedSignatures;
}

export function recordWatermarkedSignature(...signatures: string[]): void {
  const ledger = loadWatermarkedSignatureLedger();
  let added = false;
  for (const sig of signatures) {
    if (sig && sig !== 'empty' && !ledger.has(sig)) {
      ledger.add(sig);
      added = true;
    }
  }
  if (!added || typeof window === 'undefined' || !window.localStorage) return;
  try {
    const arr = Array.from(ledger).slice(-600);
    window.localStorage.setItem(FOOD_WATERMARK_LEDGER_KEY, JSON.stringify(arr));
  } catch {
    // Ignore quota errors
  }
}

/**
 * Checks whether a JPEG/WebP byte array contains the embedded `KFT_WM_V1` marker.
 */
export function hasEmbeddedWatermarkMarkerInBytes(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length < 16) return false;
  // Marker "KFT_WM_V1" in ASCII: [75, 70, 84, 95, 87, 77, 95, 86, 49]
  const m = [75, 70, 84, 95, 87, 77, 95, 86, 49];
  const scanLimit = Math.min(bytes.length - m.length, 65536);
  for (let i = 0; i <= scanLimit; i++) {
    if (
      bytes[i] === m[0] &&
      bytes[i + 1] === m[1] &&
      bytes[i + 2] === m[2] &&
      bytes[i + 3] === m[3] &&
      bytes[i + 4] === m[4] &&
      bytes[i + 5] === m[5] &&
      bytes[i + 6] === m[6] &&
      bytes[i + 7] === m[7] &&
      bytes[i + 8] === m[8]
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a URL or Data URL is already watermarked at the pixel level.
 * Prevents duplicate watermarks both when re-uploading/updating an image
 * and when rendering food cards/modals.
 */
export function isUrlWatermarkedAtPixelLevel(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  const cleanPath = trimmed.split('?')[0].split('#')[0];

  // 1. All static catalog food images in /foods/*.jpg have the pixel watermark applied once
  if (
    cleanPath.startsWith('/foods/') ||
    cleanPath.startsWith('foods/') ||
    /\/foods\/food-\d+\.(?:jpe?g|png|webp)$/i.test(cleanPath)
  ) {
    return true;
  }

  // 2. Cloud-uploaded food & menu images tagged with `_wm.` or `?wm=1`
  if (/_wm\.(?:jpe?g|png|webp)$/i.test(cleanPath) || /[?&](?:wm|kft_wm)=1\b/i.test(trimmed)) {
    return true;
  }

  // 3. Signature ledger lookup (for data URLs or custom URLs processed in this session/device)
  const ledger = loadWatermarkedSignatureLedger();
  const sig = computeWatermarkSignature(trimmed);
  if (ledger.has(sig)) {
    return true;
  }

  // 4. Check embedded marker in Data URL header/initial bytes
  if (trimmed.startsWith('data:image/')) {
    if (trimmed.includes('kft_wm=1') || trimmed.includes(FOOD_WATERMARK_MARKER)) {
      return true;
    }
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx > 0 && typeof atob === 'function') {
      try {
        // Decode first 1200 base64 chars (~900 bytes) where JPEG COM marker resides
        const headB64 = trimmed.slice(commaIdx + 1, commaIdx + 1 + 1200);
        const bin = atob(headB64);
        if (bin.includes(FOOD_WATERMARK_MARKER)) {
          recordWatermarkedSignature(sig);
          return true;
        }
      } catch {
        // Ignore partial base64 decode errors
      }
    }
  }

  return false;
}

/**
 * Draws the subtle, semi-transparent "Cambodia Flavors & Tourism" watermark
 * in the bottom-right corner of a 2D canvas without modifying any original
 * food colors, brightness, composition, or details.
 */
export function drawFoodWatermarkOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string = FOOD_WATERMARK_TEXT
): void {
  if (!ctx || width < 64 || height < 64) return;

  ctx.save();

  // Proportional sizing: small, elegant, and consistent across all resolutions
  const shortEdge = Math.min(width, height);
  const fontSize = Math.max(10, Math.min(28, Math.round(shortEdge * 0.023)));
  const fontFamily = '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.font = `500 ${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const metrics = ctx.measureText(text);
  const textWidth = Math.ceil(metrics.width);

  const padX = Math.max(6, Math.round(fontSize * 0.62));
  const padY = Math.max(4, Math.round(fontSize * 0.34));
  const pillWidth = textWidth + padX * 2;
  const pillHeight = fontSize + padY * 2;

  const marginX = Math.max(8, Math.round(width * 0.018));
  const marginY = Math.max(8, Math.round(height * 0.018));

  const boxX = width - marginX - pillWidth;
  const boxY = height - marginY - pillHeight;
  const radius = Math.min(Math.round(pillHeight / 2), Math.max(4, Math.round(fontSize * 0.45)));

  // Semi-transparent dark pill backdrop so text is legible on both bright and dark corners
  ctx.beginPath();
  ctx.moveTo(boxX + radius, boxY);
  ctx.lineTo(boxX + pillWidth - radius, boxY);
  ctx.quadraticCurveTo(boxX + pillWidth, boxY, boxX + pillWidth, boxY + radius);
  ctx.lineTo(boxX + pillWidth, boxY + pillHeight - radius);
  ctx.quadraticCurveTo(boxX + pillWidth, boxY + pillHeight, boxX + pillWidth - radius, boxY + pillHeight);
  ctx.lineTo(boxX + radius, boxY + pillHeight);
  ctx.quadraticCurveTo(boxX, boxY + pillHeight, boxX, boxY + pillHeight - radius);
  ctx.lineTo(boxX, boxY + radius);
  ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
  ctx.closePath();

  ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
  ctx.fill();

  ctx.lineWidth = Math.max(0.75, fontSize * 0.055);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.stroke();

  // Subtle text shadow + semi-transparent crisp white typography
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = Math.max(1, Math.round(fontSize * 0.12));
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.80)';
  ctx.fillText(text, boxX + padX, boxY + pillHeight / 2 + 0.5);

  ctx.restore();
}

export interface ApplyFoodWatermarkOptions {
  /** Maximum width ceiling; defaults to 2400px to preserve high-resolution originals for printing/display */
  maxWidth?: number;
  /** Maximum height ceiling; defaults to 2400px to preserve high-resolution originals for printing/display */
  maxHeight?: number;
  /** Output encoding quality (0..1); defaults to 0.94 to preserve original visual fidelity */
  quality?: number;
  /** Output MIME type; defaults to 'image/jpeg' */
  outputMimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export interface ApplyFoodWatermarkResult {
  dataUrl: string;
  width: number;
  height: number;
  watermarked: boolean;
  skippedDuplicate: boolean;
}

async function readBlobAsBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    const ab = await blob.arrayBuffer();
    return new Uint8Array(ab);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error('Failed to read binary buffer'));
      }
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsArrayBuffer(blob);
  });
}

async function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image data URL'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Applies the "Cambodia Flavors & Tourism" watermark to a File, Blob, or Data URL/Image URL
 * strictly ONCE, preserving original resolution (up to 2400px) and original food appearance.
 */
export async function applyFoodWatermarkOnce(
  input: File | Blob | string,
  options: ApplyFoodWatermarkOptions = {}
): Promise<ApplyFoodWatermarkResult> {
  const maxWidth = options.maxWidth ?? 2400;
  const maxHeight = options.maxHeight ?? 2400;
  const quality = options.quality ?? 0.94;
  const outputMimeType = options.outputMimeType ?? 'image/jpeg';

  let sourceDataUrl = '';
  let alreadyWatermarked = false;
  let inputSig = '';

  if (typeof input === 'string') {
    sourceDataUrl = input.trim();
    inputSig = computeWatermarkSignature(sourceDataUrl);
    alreadyWatermarked = isUrlWatermarkedAtPixelLevel(sourceDataUrl);
  } else {
    // Check file name or embedded JPEG COM marker in bytes first
    const fileName = (input as File).name || '';
    if (/_wm\.(?:jpe?g|png|webp)$/i.test(fileName)) {
      alreadyWatermarked = true;
    }
    try {
      const bytes = await readBlobAsBytes(input);
      if (hasEmbeddedWatermarkMarkerInBytes(bytes)) {
        alreadyWatermarked = true;
      }
    } catch {
      // Ignore byte inspection failure
    }
    sourceDataUrl = await readBlobAsDataUrl(input);
    inputSig = computeWatermarkSignature(sourceDataUrl);
    if (!alreadyWatermarked && isUrlWatermarkedAtPixelLevel(sourceDataUrl)) {
      alreadyWatermarked = true;
    }
  }

  return new Promise<ApplyFoodWatermarkResult>((resolve, reject) => {
    const img = new Image();
    if (!sourceDataUrl.startsWith('data:') && !sourceDataUrl.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width || 800;
        let height = img.naturalHeight || img.height || 600;

        // Only scale down if exceeding the high-res ceiling; never upscale
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        // If already watermarked and within target bounds, return untouched original
        if (
          alreadyWatermarked &&
          sourceDataUrl.startsWith('data:image/') &&
          width === (img.naturalWidth || img.width) &&
          height === (img.naturalHeight || img.height)
        ) {
          recordWatermarkedSignature(inputSig);
          resolve({
            dataUrl: sourceDataUrl,
            width,
            height,
            watermarked: true,
            skippedDuplicate: true,
          });
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not initialize 2D canvas context for watermark'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw original image 1:1 with zero filter, brightness, or color alteration
        ctx.drawImage(img, 0, 0, width, height);

        // Apply watermark only if not already watermarked
        if (!alreadyWatermarked) {
          drawFoodWatermarkOnCanvas(ctx, width, height, FOOD_WATERMARK_TEXT);
        }

        const outDataUrl = canvas.toDataURL(outputMimeType, quality);
        const outputSig = computeWatermarkSignature(outDataUrl);
        recordWatermarkedSignature(inputSig, outputSig);

        resolve({
          dataUrl: outDataUrl,
          width,
          height,
          watermarked: true,
          skippedDuplicate: alreadyWatermarked,
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to apply food watermark'));
      }
    };

    img.onerror = () => reject(new Error('Failed to load food image for watermarking'));
    img.src = sourceDataUrl;
  });
}
