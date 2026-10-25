import type { Language } from '../types';

export const APP_SHARE_URL = 'https://igpubinfo-max.github.io/Khmer-Food-Tourism/';

type ToastFn = (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;

const pick = (lang: Language, km: string, en: string, zh: string) =>
  lang === 'km' ? km : lang === 'zh' ? zh : en;

/**
 * Share arbitrary text with navigator.share, falling back to clipboard.
 */
export async function shareText(
  lang: Language,
  title: string,
  text: string,
  showToast?: ToastFn,
  url: string = APP_SHARE_URL
): Promise<boolean> {
  const fullText = `${text}\n${url}`;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title, text, url });
      return true;
    }
  } catch (err) {
    // User cancelled the share sheet: do not fall back to clipboard.
    if (err && (err as { name?: string }).name === 'AbortError') return false;
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(fullText);
      showToast?.(
        pick(lang, 'បានចម្លងសម្រាប់ចែករំលែករួចរាល់!', 'Copied to clipboard — paste it to share!', '已复制，可粘贴分享给好友！'),
        'success'
      );
      return true;
    }
  } catch {
    // fall through
  }
  showToast?.(pick(lang, 'មិនអាចចែករំលែកបានទេ', 'Unable to share right now', '暂时无法分享'), 'warning');
  return false;
}

/**
 * Share / recommend the whole app to friends.
 */
export function shareApp(lang: Language, showToast?: ToastFn) {
  return shareText(
    lang,
    pick(lang, 'អាហារ & ទេសចរណ៍ខ្មែរ', 'Khmer Food & Tourism', '高棉美食与旅游'),
    pick(
      lang,
      '🇰🇭 សាកល្បងកម្មវិធី «អាហារ & ទេសចរណ៍ខ្មែរ» — មុខម្ហូបខ្មែរ ភោជនីយដ្ឋាន ទេសចរណ៍ និងមគ្គុទ្ទេសក៍អាហារសុខភាព!',
      '🇰🇭 Try “Khmer Food & Tourism” — Khmer dishes, restaurants, travel spots and a healthy food guide!',
      '🇰🇭 推荐“高棉美食与旅游”应用——高棉菜肴、餐厅、景点与健康饮食指南！'
    ),
    showToast
  );
}
