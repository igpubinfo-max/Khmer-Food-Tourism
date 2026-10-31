import { Language } from '../types';
import { tr } from './i18n';

export interface ShopImageModerationResult {
  valid: boolean;
  dataUrl?: string;
  errorMessage?: string;
  category?: 'invalid_format' | 'inappropriate_nsfw' | 'political_offensive' | 'blank_or_unusable';
}

const PROHIBITED_FILENAME_RE =
  /nsfw|porn|xxx|nude|naked|sex|erotic|hentai|fetish|onlyfans|gore|blood|kill|murder|weapon|terror|politics|political|election|protest|propaganda|casino|gambling|betting|នយោបាយ|អាសអាភាស|សិច|ល្បែងស៊ីសង|色情|裸体|政治|赌博/i;

/**
 * Validates and moderates an uploaded or captured shop photo to prevent
 * inappropriate, offensive, political, sexual, blank, or unusable images.
 * Also compresses the image into an optimized JPEG data URL representing the shop.
 */
export async function validateAndModerateShopImage(
  fileOrDataUrl: File | string,
  language: Language = 'km'
): Promise<ShopImageModerationResult> {
  try {
    let rawDataUrl = '';
    if (typeof fileOrDataUrl !== 'string') {
      const file = fileOrDataUrl;
      if (!file.type || !/^image\/(jpeg|jpg|png|webp|heic|heif)$/i.test(file.type)) {
        return {
          valid: false,
          category: 'invalid_format',
          errorMessage: tr(
            language,
            'សូមជ្រើសរើសឯកសាររូបភាពហាងឱ្យបានត្រឹមត្រូវ (JPG, PNG ឬ WEBP)។',
            'Please select a valid shop image file (JPG, PNG, or WEBP).',
            '请选择有效的店铺图片文件（JPG、PNG 或 WEBP）。'
          ),
        };
      }
      if (file.name && PROHIBITED_FILENAME_RE.test(file.name)) {
        return {
          valid: false,
          category: 'political_offensive',
          errorMessage: tr(
            language,
            'រូបភាពនេះមិនត្រូវបានអនុញ្ញាតទេ៖ ហាមបង្ហោះរូបភាពអាសអាភាស នយោបាយ ហិង្សា ឬរូបភាពមិនទាក់ទងនឹងហាងអាហារ។',
            'Image rejected by moderation: Inappropriate, sexual, political, offensive, or unrelated images are strictly prohibited.',
            '图片未通过审核：严禁上传色情、政治、冒犯性或与餐厅无关的图片。'
          ),
        };
      }
      if (file.size > 15 * 1024 * 1024) {
        return {
          valid: false,
          category: 'invalid_format',
          errorMessage: tr(
            language,
            'ទំហំរូបភាពធំពេក (លើស 15MB)។ សូមជ្រើសរើសរូបភាពតំណាងហាងផ្សេង។',
            'Image file is too large (over 15MB). Please choose another shop photo.',
            '图片文件过大（超过 15MB），请选择其他店铺照片。'
          ),
        };
      }
      rawDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
      });
    } else {
      rawDataUrl = fileOrDataUrl.trim();
      if (PROHIBITED_FILENAME_RE.test(rawDataUrl.slice(0, 300))) {
        return {
          valid: false,
          category: 'political_offensive',
          errorMessage: tr(
            language,
            'រូបភាពនេះមិនត្រូវបានអនុញ្ញាតទេ៖ ហាមបង្ហោះរូបភាពអាសអាភាស នយោបាយ ឬមិនសមរម្យ។',
            'Image rejected by moderation: Inappropriate, sexual, political, or offensive content is prohibited.',
            '图片未通过审核：严禁上传色情、政治或不当内容。'
          ),
        };
      }
    }

    if (!rawDataUrl) {
      return {
        valid: false,
        category: 'invalid_format',
        errorMessage: tr(
          language,
          'មិនអាចអានរូបភាពបានទេ។ សូមសាកល្បងម្ដងទៀត។',
          'Could not read the selected image. Please try again.',
          '无法读取所选图片，请重试。'
        ),
      };
    }

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Invalid image data'));
      el.src = rawDataUrl;
    });

    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;

    if (origW < 80 || origH < 80) {
      return {
        valid: false,
        category: 'invalid_format',
        errorMessage: tr(
          language,
          'ទំហំរូបភាពតូចពេក។ សូមបង្ហោះរូបភាពតំណាងហាងដែលច្បាស់ល្អ។',
          'Image resolution is too small. Please upload a clear photo representing your shop.',
          '图片分辨率过低，请上传清晰的店铺照片。'
        ),
      };
    }

    const maxDim = 960;
    const scale = Math.min(1, maxDim / Math.max(origW, origH));
    const targetW = Math.max(1, Math.round(origW * scale));
    const targetH = Math.max(1, Math.round(origH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { valid: true, dataUrl: rawDataUrl };
    }
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // Sample pixel statistics for visual safety & blankness check
    try {
      const sampleW = Math.min(targetW, 120);
      const sampleH = Math.min(targetH, 120);
      const sCanvas = document.createElement('canvas');
      sCanvas.width = sampleW;
      sCanvas.height = sampleH;
      const sCtx = sCanvas.getContext('2d');
      if (sCtx) {
        sCtx.drawImage(canvas, 0, 0, sampleW, sampleH);
        const { data } = sCtx.getImageData(0, 0, sampleW, sampleH);
        const totalPixels = sampleW * sampleH;
        let skinPixels = 0;
        let sumLum = 0;
        let sumLumSq = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          sumLum += lum;
          sumLumSq += lum * lum;

          // YCbCr skin-tone cluster check
          const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
          if (
            r > 95 &&
            g > 40 &&
            b > 20 &&
            Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
            Math.abs(r - g) > 15 &&
            r > g &&
            r > b &&
            cb >= 77 &&
            cb <= 127 &&
            cr >= 133 &&
            cr <= 173
          ) {
            skinPixels++;
          }
        }

        const meanLum = sumLum / totalPixels;
        const variance = sumLumSq / totalPixels - meanLum * meanLum;
        const skinRatio = skinPixels / totalPixels;

        if (variance < 6) {
          return {
            valid: false,
            category: 'blank_or_unusable',
            errorMessage: tr(
              language,
              'រូបភាពទទេ ឬងងឹតពេក។ សូមថត ឬជ្រើសរើសរូបភាពតំណាងហាងឱ្យបានច្បាស់។',
              'The image appears blank or solid-colored. Please take or upload a clear photo of your shop.',
              '图片似乎为空白或纯色，请拍摄或上传清晰的店铺照片。'
            ),
          };
        }

        if (skinRatio > 0.62) {
          return {
            valid: false,
            category: 'inappropriate_nsfw',
            errorMessage: tr(
              language,
              'ប្រព័ន្ធត្រួតពិនិត្យរូបភាព៖ ហាមបង្ហោះរូបភាពមិនសមរម្យ អាសអាភាស ឬរូបភាពដែលមិនមែនជារូបតំណាងហាង។ សូមប្រើរូបភាពមុខហាង ឬស្លាកយីហោហាងប៉ុណ្ណោះ។',
              'Image Moderation Alert: Inappropriate, sexual, or non-storefront personal photos are not allowed. Please upload a photo representing your shop only.',
              '图片审核提醒：禁止上传不当、色情或非店铺照片，请仅上传代表您店铺的门面或招牌照片。'
            ),
          };
        }
      }
    } catch {
      // Ignore canvas taint if external URL
    }

    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.84);
    return {
      valid: true,
      dataUrl: compressedDataUrl,
    };
  } catch {
    return {
      valid: false,
      category: 'invalid_format',
      errorMessage: tr(
        language,
        'មិនអាចផ្ទៀងផ្ទាត់រូបភាពបានទេ។ សូមជ្រើសរើសរូបភាពតំណាងហាងម្ដងទៀត។',
        'Failed to validate shop image. Please select a valid image file.',
        '无法验证店铺图片，请重新选择有效的图片文件。'
      ),
    };
  }
}
