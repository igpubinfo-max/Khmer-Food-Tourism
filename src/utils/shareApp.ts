import type { Language } from '../types';
import { PLAY_STORE_URL, recordMeaningfulAction } from './engagement';

export const APP_SHARE_URL = 'https://igpubinfo-max.github.io/Khmer-Food-Tourism/';

type ToastFn = (msg: string, type?: 'success' | 'info' | 'warning') => void;

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
  const fullText = `${text}\n${url}\n📲 Google Play: ${PLAY_STORE_URL}`;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title, text: `${text}\n📲 Google Play: ${PLAY_STORE_URL}`, url });
      recordMeaningfulAction('share');
      return true;
    }
  } catch (err) {
    // User cancelled the share sheet: do not fall back to clipboard.
    if (err && (err as { name?: string }).name === 'AbortError') return false;
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(fullText);
      recordMeaningfulAction('share');
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
