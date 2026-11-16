import { Language, isThaiRelatedText } from '../types';
import { tr } from './i18n';
import { uploadImageToPermanentCloud } from '../services/cloudImageStorageService';
import { callAiGateway } from '../services/aiGatewayClient';
import { getCloudApiConfig } from '../services/supabaseService';

export interface ShopImageModerationResult {
  valid: boolean;
  dataUrl?: string;
  thumbnailUrl?: string;
  localWebpDataUrl?: string;
  errorMessage?: string;
  reason?: string;
  category?: 'invalid_format' | 'inappropriate_nsfw' | 'political_offensive' | 'blank_or_unusable';
}

function buildInvalidModerationResult(
  category: NonNullable<ShopImageModerationResult['category']>,
  message: string
): ShopImageModerationResult {
  return {
    valid: false,
    category,
    errorMessage: message,
    reason: message,
  };
}

const PROHIBITED_FILENAME_RE =
  /nsfw|porn|xxx|nude|naked|sex|erotic|hentai|fetish|onlyfans|gore|blood|kill|murder|weapon|gun|knife|terror|politics|political|election|protest|propaganda|casino|gambling|betting|scam|drug|នយោបាយ|បក្ស|បាតុកម្ម|អាសអាភាស|សិច|ស្រាត|ហិង្សា|ឈាម|អាវុធ|ល្បែងស៊ីសង|កាស៊ីណូ|色情|裸体|政治|赌博|暴力|血腥|武器/i;

interface AiModerationVerdict {
  safe: boolean;
  category?: 'inappropriate_nsfw' | 'political_offensive';
  reasonKh?: string;
  reasonEn?: string;
  reasonZh?: string;
}

/**
 * Calls Gemini Vision (via secure Supabase food-ai gateway or configured API key)
 * to inspect the actual visual content of the photo for:
 * - Political figures, political party logos/flags, rallies, protests, propaganda
 * - Sexual content, nudity, underwear/lingerie, suggestive/erotic poses
 * - Violence, blood, gore, weapons, drugs, gambling/casino ads, hate symbols, middle-finger gestures
 */
async function checkImageWithAiVisionModeration(
  jpegBase64: string,
  language: Language
): Promise<AiModerationVerdict> {
  if (!jpegBase64 || typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { safe: true };
  }

  const prompt = [
    'You are a strict content moderation classifier for a Cambodian restaurant, food, and hotel directory app.',
    'Inspect this image and determine if it is SAFE to publish as a shop, restaurant, food, or hotel photo.',
    'REJECT (safe: false) immediately if the image contains ANY of the following:',
    '1. Political content: politicians, political party logos/flags/signs, election campaigns, political rallies, protests, military/war propaganda.',
    '2. Sexual or NSFW content: nudity, partial nudity, cleavage/underwear/lingerie focus, sexual acts, pornographic or erotic imagery.',
    '3. Violence, gore, or illegal content: blood, dead bodies, injuries, guns, knives/weapons, illegal drugs, gambling/casino/betting banners, middle-finger or offensive gestures, hate symbols, or Thai national flags/propaganda.',
    'Return ONLY valid JSON: {"safe": boolean, "violationType": "none" | "political" | "sexual" | "violence_or_illegal"}',
  ].join('\n');

  const geminiBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: jpegBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 120,
      responseMimeType: 'application/json',
    },
  };

  try {
    let rawText = '';
    const gw = await callAiGateway('gemini-2.5-flash', geminiBody, { timeoutMs: 4500 });
    if (gw.ok && gw.json) {
      rawText = gw.json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      const cfg = getCloudApiConfig();
      const apiKey = (cfg.geminiApiKey || '').trim();
      if (apiKey.length > 15) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(geminiBody),
              signal: controller.signal,
            }
          );
          if (res.ok) {
            const data = await res.json();
            rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          }
        } finally {
          clearTimeout(timer);
        }
      }
    }

    if (!rawText) return { safe: true };
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    if (parsed && parsed.safe === false) {
      const vType = String(parsed.violationType || '').toLowerCase();
      if (vType === 'sexual') {
        return {
          safe: false,
          category: 'inappropriate_nsfw',
          reasonKh: 'ប្រព័ន្ធ AI បានរកឃើញថារូបភាពនេះមានលក្ខណៈអាសអាភាស ឬមិនសមរម្យ។ សូមបង្ហោះតែរូបភាពហាង អាហារ ឬសណ្ឋាគារប៉ុណ្ណោះ។',
          reasonEn: 'AI Moderation blocked this image: Sexual or inappropriate content is strictly prohibited. Please upload only shop, food, or hotel photos.',
          reasonZh: 'AI 审核已拦截此图片：严禁上传色情或不当内容，请仅上传店铺、美食或酒店照片。',
        };
      }
      return {
        safe: false,
        category: 'political_offensive',
        reasonKh: 'ប្រព័ន្ធ AI បានរកឃើញថារូបភាពនេះពាក់ព័ន្ធនឹងនយោបាយ អំពើហិង្សា ល្បែងស៊ីសង ឬរូបភាពមិនសមរម្យ។ សូមបង្ហោះតែរូបភាពហាង អាហារ ឬសណ្ឋាគារប៉ុណ្ណោះ។',
        reasonEn: 'AI Moderation blocked this image: Political, violent, gambling, or offensive content is strictly prohibited.',
        reasonZh: 'AI 审核已拦截此图片：严禁上传政治、暴力、赌博或不当内容。',
      };
    }
  } catch {
    // Graceful fallback to pixel heuristics if offline or AI gateway unreachable
  }
  return { safe: true };
}

/**
 * Validates and moderates an uploaded or captured shop/hotel photo to prevent
 * inappropriate, offensive, political, sexual, violent, blank, or unusable images.
 * Also compresses the image into an optimized WebP/JPEG data URL representing the shop.
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
        return buildInvalidModerationResult(
          'invalid_format',
          tr(
            language,
            'សូមជ្រើសរើសឯកសាររូបភាពហាងឱ្យបានត្រឹមត្រូវ (JPG, PNG ឬ WEBP)។',
            'Please select a valid shop image file (JPG, PNG, or WEBP).',
            '请选择有效的店铺图片文件（JPG、PNG 或 WEBP）。'
          )
        );
      }
      if (file.name && (PROHIBITED_FILENAME_RE.test(file.name) || isThaiRelatedText(file.name))) {
        return buildInvalidModerationResult(
          'political_offensive',
          tr(
            language,
            'រូបភាពនេះមិនត្រូវបានអនុញ្ញាតទេ៖ ហាមបង្ហោះរូបភាពអាសអាភាស នយោបាយ ហិង្សា ឬរូបភាពមិនទាក់ទងនឹងហាងអាហារ/សណ្ឋាគារ។',
            'Image rejected by moderation: Inappropriate, sexual, political, offensive, or unrelated images are strictly prohibited.',
            '图片未通过审核：严禁上传色情、政治、冒犯性或与店铺/酒店无关的图片。'
          )
        );
      }
      if (file.size > 15 * 1024 * 1024) {
        return buildInvalidModerationResult(
          'invalid_format',
          tr(
            language,
            'ទំហំរូបភាពធំពេក (លើស 15MB)។ សូមជ្រើសរើសរូបភាពតំណាងហាងផ្សេង។',
            'Image file is too large (over 15MB). Please choose another shop photo.',
            '图片文件过大（超过 15MB），请选择其他店铺照片。'
          )
        );
      }
      rawDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
      });
    } else {
      rawDataUrl = fileOrDataUrl.trim();
      if (PROHIBITED_FILENAME_RE.test(rawDataUrl.slice(0, 300)) || isThaiRelatedText(rawDataUrl.slice(0, 300))) {
        return buildInvalidModerationResult(
          'political_offensive',
          tr(
            language,
            'រូបភាពនេះមិនត្រូវបានអនុញ្ញាតទេ៖ ហាមបង្ហោះរូបភាពអាសអាភាស នយោបាយ ឬមិនសមរម្យ។',
            'Image rejected by moderation: Inappropriate, sexual, political, or offensive content is prohibited.',
            '图片未通过审核：严禁上传色情、政治或不当内容。'
          )
        );
      }
    }

    if (!rawDataUrl) {
      return buildInvalidModerationResult(
        'invalid_format',
        tr(
          language,
          'មិនអាចអានរូបភាពបានទេ។ សូមសាកល្បងម្ដងទៀត។',
          'Could not read the selected image. Please try again.',
          '无法读取所选图片，请重试。'
        )
      );
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
      return buildInvalidModerationResult(
        'invalid_format',
        tr(
          language,
          'ទំហំរូបភាពតូចពេក។ សូមបង្ហោះរូបភាពតំណាងហាងដែលច្បាស់ល្អ។',
          'Image resolution is too small. Please upload a clear photo representing your shop.',
          '图片分辨率过低，请上传清晰的店铺照片。'
        )
      );
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

    let aiModerationBase64 = '';

    // Sample pixel statistics for visual safety (NSFW skin clusters, gore/blood crimson clusters, & blankness check)
    try {
      const sampleW = Math.min(targetW, 160);
      const sampleH = Math.min(targetH, 160);
      const sCanvas = document.createElement('canvas');
      sCanvas.width = sampleW;
      sCanvas.height = sampleH;
      const sCtx = sCanvas.getContext('2d');
      if (sCtx) {
        sCtx.drawImage(canvas, 0, 0, sampleW, sampleH);
        const modJpegUrl = sCanvas.toDataURL('image/jpeg', 0.72);
        const commaIdx = modJpegUrl.indexOf(',');
        if (commaIdx > 0) {
          aiModerationBase64 = modJpegUrl.slice(commaIdx + 1);
        }

        const { data } = sCtx.getImageData(0, 0, sampleW, sampleH);
        const totalPixels = sampleW * sampleH;
        let skinPixels = 0;
        let centerSkinPixels = 0;
        let centerTotalPixels = 0;
        let bloodGorePixels = 0;
        let sumLum = 0;
        let sumLumSq = 0;

        const minX = Math.floor(sampleW * 0.2);
        const maxX = Math.ceil(sampleW * 0.8);
        const minY = Math.floor(sampleH * 0.2);
        const maxY = Math.ceil(sampleH * 0.8);

        for (let i = 0; i < data.length; i += 4) {
          const pIdx = i >> 2;
          const px = pIdx % sampleW;
          const py = Math.floor(pIdx / sampleW);
          const inCenter = px >= minX && px <= maxX && py >= minY && py <= maxY;
          if (inCenter) centerTotalPixels++;

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
            if (inCenter) centerSkinPixels++;
          }

          // Deep crimson blood/gore cluster check
          if (r > 115 && r < 210 && g < 35 && b < 35 && r - g > 90 && r - b > 90) {
            bloodGorePixels++;
          }
        }

        const meanLum = sumLum / totalPixels;
        const variance = sumLumSq / totalPixels - meanLum * meanLum;
        const skinRatio = skinPixels / totalPixels;
        const centerSkinRatio = centerTotalPixels > 0 ? centerSkinPixels / centerTotalPixels : 0;
        const bloodRatio = bloodGorePixels / totalPixels;

        if (variance < 6) {
          return buildInvalidModerationResult(
            'blank_or_unusable',
            tr(
              language,
              'រូបភាពទទេ ឬងងឹតពេក។ សូមថត ឬជ្រើសរើសរូបភាពតំណាងហាងឱ្យបានច្បាស់។',
              'The image appears blank or solid-colored. Please take or upload a clear photo of your shop.',
              '图片似乎为空白或纯色，请拍摄或上传清晰的店铺照片。'
            )
          );
        }

        if (skinRatio > 0.56 || (centerSkinRatio > 0.68 && skinRatio > 0.42)) {
          return buildInvalidModerationResult(
            'inappropriate_nsfw',
            tr(
              language,
              'ប្រព័ន្ធត្រួតពិនិត្យរូបភាព៖ ហាមបង្ហោះរូបភាពមិនសមរម្យ អាសអាភាស ឬរូបភាពដែលមិនមែនជារូបតំណាងហាង/សណ្ឋាគារ។ សូមប្រើរូបភាពមុខហាង អាហារ ឬសណ្ឋាគារប៉ុណ្ណោះ។',
              'Image Moderation Alert: Inappropriate, sexual, or non-storefront personal photos are not allowed. Please upload a photo representing your shop or hotel only.',
              '图片审核提醒：禁止上传不当、色情或非店铺照片，请仅上传代表您店铺或酒店的照片。'
            )
          );
        }

        if (bloodRatio > 0.35) {
          return buildInvalidModerationResult(
            'political_offensive',
            tr(
              language,
              'ប្រព័ន្ធត្រួតពិនិត្យរូបភាព៖ ហាមបង្ហោះរូបភាពហិង្សា ឈាម ឬរូបភាពអាក្រក់ៗ។ សូមបង្ហោះតែរូបភាពហាង ឬសណ្ឋាគារប៉ុណ្ណោះ។',
              'Image Moderation Alert: Violent, bloody, or graphic images are strictly prohibited.',
              '图片审核提醒：严禁上传暴力、血腥或令人不适的图片。'
            )
          );
        }
      }
    } catch {
      // Ignore canvas taint if external URL
    }

    // AI Vision Content Moderation Check (blocks political, sexual, violent, gambling, or offensive photos)
    if (aiModerationBase64) {
      const aiVerdict = await checkImageWithAiVisionModeration(aiModerationBase64, language);
      if (!aiVerdict.safe) {
        return buildInvalidModerationResult(
          aiVerdict.category || 'political_offensive',
          tr(
            language,
            aiVerdict.reasonKh || 'រូបភាពនេះមិនត្រូវបានអនុញ្ញាតទេ៖ ហាមបង្ហោះរូបភាពនយោបាយ អាសអាភាស ឬរូបភាពមិនសមរម្យ។',
            aiVerdict.reasonEn || 'Image rejected by AI moderation: Political, sexual, or offensive content is prohibited.',
            aiVerdict.reasonZh || '图片未通过 AI 审核：严禁上传政治、色情或不当内容。'
          )
        );
      }
    }

    const webpCandidate = canvas.toDataURL('image/webp', 0.84);
    const compressedDataUrl =
      webpCandidate && webpCandidate.startsWith('data:image/webp')
        ? webpCandidate
        : canvas.toDataURL('image/jpeg', 0.84);

    // Immediately upload compressed WebP + Thumbnail to Permanent Cloud Storage
    try {
      const cloudRes = await uploadImageToPermanentCloud(compressedDataUrl, 'shops', 'shop_upload');
      if (cloudRes && cloudRes.url) {
        return {
          valid: true,
          dataUrl: cloudRes.url,
          thumbnailUrl: cloudRes.thumbnailUrl || cloudRes.url,
          localWebpDataUrl: compressedDataUrl,
        };
      }
    } catch {
      // Fallback to compressed WebP dataUrl if offline; background migration will upload when online
    }

    return {
      valid: true,
      dataUrl: compressedDataUrl,
      thumbnailUrl: compressedDataUrl,
      localWebpDataUrl: compressedDataUrl,
    };
  } catch {
    return buildInvalidModerationResult(
      'invalid_format',
      tr(
        language,
        'មិនអាចផ្ទៀងផ្ទាត់រូបភាពបានទេ។ សូមជ្រើសរើសរូបភាពតំណាងហាងម្ដងទៀត។',
        'Failed to validate shop image. Please select a valid image file.',
        '无法验证店铺图片，请重新选择有效的图片文件。'
      )
    );
  }
}
