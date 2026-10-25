#!/usr/bin/env node
/**
 * Simplified Chinese (zh) audit for the Khmer Food & Tourism app.
 *   node scripts/audit-zh.mjs            -> prints a report, exit code 1 if blocking issues exist
 *   node scripts/audit-zh.mjs --verbose  -> also lists every "isKm without zh" fallback
 *
 * Blocking issue categories (must be 0):
 *   EMPTY, SAME_AS_EN, KHMER_IN_ZH, MOJIBAKE, TRADITIONAL, NO_CHINESE, WRONG_TERM
 * Informational: FALLBACK (isKm ? A : B without a zh branch nearby)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERBOSE = process.argv.includes('--verbose');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/backup|node_modules/i.test(e.name)) continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(e.name) && !/backup/i.test(e.name)) out.push(p);
  }
  return out;
}
const files = walk(path.join(root, 'src'));

// ---------- helpers ----------
const STR = String.raw`(?:'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|\`(?:[^\`\\]|\\.)*\`)`;
const unq = (s) => s.slice(1, -1).replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n');
const KHMER = /[\u1780-\u17FF]/;
const CJK = /[\u4E00-\u9FFF]/;
const MOJIBAKE = /\uFFFD|\?{3,}|Ã.|â€|Â[^\w]/;
// Characters that exist ONLY in Traditional Chinese (their Simplified forms differ)
const TRAD = new Set(
  Array.from(
    '體國這說們個來時會學開關門問間點無為與區幣價號後從對業專實灣觀覽貓廳飯麵湯雞蝦糧檢測統計設電話啟閉資訊網頁連結帳註冊錄選擇確認儲讀寫傳訂購賣額線顯顏標籤籃劃畫異據項種類產館鎮縣島嶼風險環錢費優錶廚營養氣濕涼熱燒滷鹽醬調飲豬鴨鵝鮮鹹漿餅團隊遊歷蹟廟橋龍亞華語際響應該當處寶貴頭腦愛親歲樂書聽見買賣現場錯誤車質簡單複雜夠讓還經過運動護擁幫萬總結構廣準備園轉幾條聯繫'
  )
);
// Wrong / unnatural culinary & tourism terms (wrong -> hint)
const WRONG_TERMS = [
  [/洛克拉克|洛克拉克牛肉/, 'Lok Lak: 用 柬式摇滚牛肉 / 柬式黑椒摇滚牛肉粒'],
  [/柬埔寨国菜阿莫克/, 'Amok: 阿莫克鱼 / 高棉阿莫克蒸鱼'],
  [/普农奔|金邊|暹粒市市|柏威夏省寺/, 'Province/place name'],
  [/西哈努克维尔|西哈努克城(?!港)/, 'Sihanoukville: 西哈努克港 / 西港'],
  [/贡布省省|白马省省/, 'duplicate 省'],
  [/高棉汤饭|高棉面条汤粉|粿条汤粿条/, 'duplicate/wrong noodle term'],
];

const issues = { EMPTY: [], SAME_AS_EN: [], KHMER_IN_ZH: [], MOJIBAKE: [], TRADITIONAL: [], NO_CHINESE: [], WRONG_TERM: [], FALLBACK: [] };
const rel = (f) => path.relative(root, f).replace(/\\/g, '/');
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

function checkZh(file, text, idx, zh, en, kind) {
  const loc = `${rel(file)}:${lineOf(text, idx)}`;
  const preview = zh.replace(/\s+/g, ' ').slice(0, 70);
  if (!zh.trim()) return issues.EMPTY.push(`${loc} [${kind}] empty zh`);
  if (en !== undefined && zh.trim().toLowerCase() === en.trim().toLowerCase() && /[A-Za-z]{3,}/.test(zh))
    issues.SAME_AS_EN.push(`${loc} [${kind}] zh identical to English: ${preview}`);
  if (KHMER.test(zh)) issues.KHMER_IN_ZH.push(`${loc} [${kind}] Khmer in zh: ${preview}`);
  if (MOJIBAKE.test(zh)) issues.MOJIBAKE.push(`${loc} [${kind}] garbled: ${preview}`);
  const trad = Array.from(zh).filter((c) => TRAD.has(c));
  if (trad.length) issues.TRADITIONAL.push(`${loc} [${kind}] Traditional chars (${[...new Set(trad)].join('')}): ${preview}`);
  if (!CJK.test(zh) && /[A-Za-z]{4,}/.test(zh) && !/^[\w\s&@.,:;!?()\/+\-'’"“”•·|%$#→←↑↓✓×0-9]*$/.test('')) {
    // pure-Latin zh text (brand names like "KHQR" are tolerated when <= 6 letters)
    if (zh.replace(/[^A-Za-z]/g, '').length > 6) issues.NO_CHINESE.push(`${loc} [${kind}] no Chinese characters: ${preview}`);
  }
  for (const [re, hint] of WRONG_TERMS) if (re.test(zh)) issues.WRONG_TERM.push(`${loc} [${kind}] ${hint}: ${preview}`);
}

// ---------- scan ----------
const zhTranslationFiles = /zhCompleteTranslations|zhDynamicTranslator|i18n\.ts$/;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');

  // (b1) tr(lang, km, en, zh)
  for (const m of text.matchAll(new RegExp(String.raw`\btr\(\s*[A-Za-z_.]+\s*,\s*(${STR})\s*,\s*(${STR})\s*,\s*(${STR})\s*\)`, 'g')))
    checkZh(file, text, m.index, unq(m[3]), unq(m[2]), 'tr()');
  // (b2) local tr(km, en, zh)
  for (const m of text.matchAll(new RegExp(String.raw`\btr\(\s*(${STR})\s*,\s*(${STR})\s*,\s*(${STR})\s*\)`, 'g')))
    checkZh(file, text, m.index, unq(m[3]), unq(m[2]), 'tr3()');
  // (b3) xxxZh: '...' properties
  for (const m of text.matchAll(new RegExp(String.raw`\b(\w*Zh)\s*:\s*(${STR})`, 'g')))
    checkZh(file, text, m.index, unq(m[2]), undefined, m[1]);
  // (b4) zh: '...'  (Record<Language,string> style)
  for (const m of text.matchAll(new RegExp(String.raw`(?<![\w.])zh\s*:\s*(${STR})`, 'g')))
    checkZh(file, text, m.index, unq(m[1]), undefined, 'zh:');
  // (b5) tuples ['kh','en','zh'] and "en": "zh" maps in translation files
  if (zhTranslationFiles.test(file)) {
    for (const m of text.matchAll(new RegExp(String.raw`\[\s*(${STR})\s*,\s*(${STR})\s*,\s*(${STR})\s*\]`, 'g')))
      checkZh(file, text, m.index, unq(m[3]), unq(m[2]), 'tuple');
    for (const m of text.matchAll(new RegExp(String.raw`^\s*(${STR})\s*:\s*(${STR})\s*,?\s*$`, 'gm'))) {
      const key = unq(m[1]);
      const val = unq(m[2]);
      if (['Khmer', 'English', 'Simplified Chinese'].includes(key)) continue; // language-name endonyms are intentional
      if (/[A-Za-z]/.test(key) || KHMER.test(key)) checkZh(file, text, m.index, val, key, 'map');
    }
  }

  // (a) isKm ? A : B without a zh branch nearby
  const lines = text.split('\n');
  lines.forEach((ln, i) => {
    if (!/\bisKm\s*\?|(?:language|lang|assistantLang)\s*===\s*'km'\s*\?/.test(ln)) return;
    const win = lines.slice(Math.max(0, i - 2), i + 7).join('\n');
    if (/isZh|===\s*'zh'|===\s*"zh"|\btr\(|\btr3\(|zhDynamic|getLocalized/.test(win)) return;
    if (/^\s*(\/\/|\*|\/\*)/.test(ln)) return;
    issues.FALLBACK.push(`${rel(file)}:${i + 1}: ${ln.trim().slice(0, 100)}`);
  });
}

// ---------- report ----------
const blocking = ['EMPTY', 'SAME_AS_EN', 'KHMER_IN_ZH', 'MOJIBAKE', 'TRADITIONAL', 'NO_CHINESE', 'WRONG_TERM'];
let total = 0;
console.log('=== Simplified Chinese audit ===');
for (const k of blocking) {
  total += issues[k].length;
  console.log(`${k.padEnd(12)} ${issues[k].length}`);
  issues[k].slice(0, 60).forEach((l) => console.log('   ' + l));
  if (issues[k].length > 60) console.log(`   ... +${issues[k].length - 60} more`);
}
const byFile = {};
for (const l of issues.FALLBACK) byFile[l.split(':')[0]] = (byFile[l.split(':')[0]] || 0) + 1;
console.log(`FALLBACK     ${issues.FALLBACK.length}  (isKm ? A : B with no zh branch nearby)`);
Object.entries(byFile)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 25)
  .forEach(([f, n]) => console.log(`   ${String(n).padStart(4)}  ${f}`));
if (VERBOSE) issues.FALLBACK.forEach((l) => console.log('   ' + l));
console.log(`\nBLOCKING ISSUES: ${total}   FALLBACKS: ${issues.FALLBACK.length}`);
process.exit(total > 0 ? 1 : 0);
