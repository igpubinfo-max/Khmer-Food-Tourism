import type { Language } from '../types';
import { PLAY_STORE_URL, recordMeaningfulAction } from './engagement';
import { savePngDataUrlToGallery } from './androidMediaHelper';
import { shareText } from './shareApp';

export interface ShareCardSpec {
  kind: 'dish' | 'place' | 'passport';
  title: string;
  subtitle?: string;
  photoUrl?: string;
  /** Up to ~4 short lines under the title */
  lines: string[];
  emoji?: string;
}

type ToastFn = (msg: string, type?: 'success' | 'info' | 'warning') => void;

const W = 1080;
const H = 1350;

const pick = (lang: Language, km: string, en: string, zh: string) => (lang === 'km' ? km : lang === 'zh' ? zh : en);

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 6000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null); // graceful: card is drawn without the photo
    };
    img.src = url;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line + w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line.trim());
      line = w.trimStart();
      if (lines.length === maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines && line.trim()) lines.push(line.trim());
  // Khmer/Chinese have no spaces: hard-wrap very long single tokens
  const out: string[] = [];
  for (const l of lines) {
    if (ctx.measureText(l).width <= maxWidth) {
      out.push(l);
      continue;
    }
    let cur = '';
    for (const ch of Array.from(l)) {
      if (ctx.measureText(cur + ch).width > maxWidth) {
        out.push(cur);
        cur = ch;
      } else cur += ch;
    }
    if (cur) out.push(cur);
  }
  return out.slice(0, maxLines);
}

/** Renders the branded card to a PNG data URL (offline, no network except loading the photo). */
export async function renderShareCard(spec: ShareCardSpec): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  const font = (typeof document !== 'undefined' && getComputedStyle(document.body).fontFamily) || 'sans-serif';

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#064E3B');
  bg.addColorStop(1, '#022c22');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Photo (cover crop) or emoji placeholder
  const PHOTO_H = 700;
  const img = await loadImage(spec.photoUrl || '');
  if (img && img.width > 0) {
    const scale = Math.max(W / img.width, PHOTO_H / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, PHOTO_H);
    ctx.clip();
    ctx.drawImage(img, (W - dw) / 2, (PHOTO_H - dh) / 2, dw, dh);
    ctx.restore();
  } else {
    const g = ctx.createLinearGradient(0, 0, W, PHOTO_H);
    g.addColorStop(0, '#059669');
    g.addColorStop(1, '#f59e0b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, PHOTO_H);
    ctx.font = `220px ${font}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(spec.emoji || (spec.kind === 'place' ? '📍' : spec.kind === 'passport' ? '🛂' : '🍲'), W / 2, PHOTO_H / 2 + 80);
  }

  // Fade from photo into card body
  const fade = ctx.createLinearGradient(0, PHOTO_H - 160, 0, PHOTO_H);
  fade.addColorStop(0, 'rgba(6,78,59,0)');
  fade.addColorStop(1, 'rgba(6,78,59,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, PHOTO_H - 160, W, 160);

  // Title
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fde68a';
  ctx.font = `bold 64px ${font}`;
  let y = PHOTO_H + 60;
  for (const l of wrapText(ctx, spec.title, W - 120, 2)) {
    ctx.fillText(l, 60, y);
    y += 78;
  }
  if (spec.subtitle) {
    ctx.fillStyle = '#a7f3d0';
    ctx.font = `38px ${font}`;
    for (const l of wrapText(ctx, spec.subtitle, W - 120, 1)) {
      ctx.fillText(l, 60, y);
      y += 52;
    }
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `34px ${font}`;
  y += 8;
  for (const raw of spec.lines.slice(0, 4)) {
    for (const l of wrapText(ctx, raw, W - 120, 1)) {
      ctx.fillText(l, 60, y);
      y += 48;
    }
  }

  // Footer brand bar
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, H - 150, W, 150);
  ctx.fillStyle = '#fde68a';
  ctx.font = `bold 38px ${font}`;
  ctx.fillText('🇰🇭 អាហារ & ទេសចរណ៍ខ្មែរ · Khmer Food & Tourism', 60, H - 88);
  ctx.fillStyle = '#d1fae5';
  ctx.font = `28px ${font}`;
  ctx.fillText(`Google Play: ${PLAY_STORE_URL.replace('https://', '')}`, 60, H - 40);

  return canvas.toDataURL('image/png');
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = head.match(/:(.*?);/)?.[1] || 'image/png';
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/**
 * Generates the card and shares it: Web Share with the image file when supported,
 * otherwise saves it to the gallery / downloads it and shares the text, otherwise copies the text.
 */
export async function shareCardImage(spec: ShareCardSpec, lang: Language, showToast?: ToastFn): Promise<boolean> {
  const caption = [spec.title, spec.subtitle, ...spec.lines].filter(Boolean).join('\n');
  let dataUrl: string;
  try {
    dataUrl = await renderShareCard(spec);
  } catch {
    // Could not draw the image: fall back to plain text sharing
    return shareText(lang, spec.title, caption, showToast);
  }

  try {
    const blob = dataUrlToBlob(dataUrl);
    const file = new File([blob], 'khmer-food-card.png', { type: 'image/png' });
    if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: spec.title, text: `${caption}\n📲 ${PLAY_STORE_URL}` });
      recordMeaningfulAction('share');
      return true;
    }
  } catch (err) {
    if (err && (err as { name?: string }).name === 'AbortError') return false;
  }

  try {
    await savePngDataUrlToGallery(dataUrl, `khmer-food-card-${Date.now()}.png`);
    showToast?.(
      pick(
        lang,
        'បានរក្សាទុករូបកាតទៅ Gallery — ភ្ជាប់វាពេលចែករំលែក!',
        'Card image saved — attach it when you share!',
        '分享卡片已保存到相册，分享时请附上图片！'
      ),
      'success'
    );
  } catch {
    // ignore: still share the text below
  }
  return shareText(lang, spec.title, caption, showToast);
}
