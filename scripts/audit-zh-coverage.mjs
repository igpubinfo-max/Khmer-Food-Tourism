#!/usr/bin/env node
/**
 * Coverage check for the English -> Chinese runtime translator.
 * The app shows English in `isKm ? khmer : english` ternaries and relies on translateTextToChinese()
 * (src/utils/i18n.ts) to turn that English into Simplified Chinese when language === 'zh'.
 * This script runs the REAL translator over every such English string and lists the ones that stay English.
 *
 *   node scripts/audit-zh-coverage.mjs [--json out.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const ts = require(path.join(root, 'node_modules/typescript'));

// minimal TS -> CJS loader
Module._extensions['.ts'] = Module._extensions['.tsx'] = (module, filename) => {
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(out.outputText, filename);
};
globalThis.window = undefined;

const i18n = require(path.join(root, 'src/utils/i18n.ts'));
const translate = i18n.translateTextToChinese;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/backup|node_modules/i.test(e.name)) walk(p, out); }
    else if (/\.(ts|tsx)$/.test(e.name) && !/backup/i.test(e.name)) out.push(p);
  }
  return out;
}
const STR = String.raw`(?:'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|\`(?:[^\`\\]|\\.)*\`)`;
const unq = (s) => s.slice(1, -1).replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n');
const KHMER = /[\u1780-\u17FF]/;
const CJK = /[\u4E00-\u9FFF]/;

const seen = new Map(); // english -> {files:Set,count}
const re = new RegExp(String.raw`(?:isKm|language\s*===\s*'km'|lang\s*===\s*'km')\s*\?\s*(${STR})\s*:\s*(${STR})`, 'g');
for (const file of walk(path.join(root, 'src'))) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(re)) {
    const kh = unq(m[1]);
    const en = unq(m[2]);
    if (!KHMER.test(kh) || /\$\{/.test(en) || !/[A-Za-z]{2,}/.test(en)) continue;
    const rec = seen.get(en) || { files: new Set(), count: 0 };
    rec.files.add(path.relative(root, file).replace(/\\/g, '/'));
    rec.count++;
    seen.set(en, rec);
  }
}

const untranslated = [];
const partial = [];
for (const [en, rec] of seen) {
  const zh = translate(en);
  const stillEnglish = zh.replace(/\([^)]*\)|（[^）]*）/g, '').match(/[A-Za-z]{4,}/g) || [];
  if (!CJK.test(zh)) untranslated.push({ en, files: [...rec.files] });
  else if (stillEnglish.length >= 2) partial.push({ en, zh, files: [...rec.files] });
}
console.log(`Unique English fallback strings: ${seen.size}`);
console.log(`NOT translated to Chinese at runtime: ${untranslated.length}`);
console.log(`Only partially translated:            ${partial.length}`);
const jsonArg = process.argv.indexOf('--json');
if (jsonArg > -1) fs.writeFileSync(process.argv[jsonArg + 1], JSON.stringify({ untranslated, partial }, null, 1), 'utf8');
else {
  untranslated.slice(0, 40).forEach((u) => console.log('  EN: ' + u.en.slice(0, 90) + '   [' + u.files[0] + ']'));
}
process.exit(untranslated.length + partial.length > 0 ? 1 : 0);
