#!/usr/bin/env node
/**
 * scripts/egressSlim.mjs â€” one-time, REVERSIBLE egress reduction of the production database.
 *
 *   node scripts/egressSlim.mjs                 # DRY RUN (default): reads only, reports what would change + savings
 *   node scripts/egressSlim.mjs --apply         # applies; ALWAYS writes a full backup of every row it touches first
 *   node scripts/egressSlim.mjs --apply --only=transactions     # or --only=overrides
 *   node scripts/egressSlim.mjs --restore backups/egress/<file>.json   # puts the original rows back
 *
 * What it does (and ONLY this):
 *  1. kft_cloud_transactions_v1: payment-receipt screenshots stored INLINE (base64, ~100 KB each, downloaded by EVERY device on
 *     every 5-minute sync) are copied to their own row `kft_proof_<txnId>` (if not already there) and replaced by `vault:<txnId>`,
 *     the exact format the app already resolves on demand (fetchPaymentProofFromCloudOnDemand).
 *  2. kft_ov_*: Admin photo overrides stored as base64 inside the row (~400 KB each, re-downloaded by every device on every app
 *     update) are uploaded to Supabase Storage bucket `food-media`; the row then points to the public https URL.
 *     Each upload is verified (HTTP 200 + identical byte length) BEFORE the row is touched.
 * It never touches user rows (kft_user_*), VIP data, settings, or deletes anything.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const ONLY = (argv.find((a) => a.startsWith('--only=')) || '').slice(7);
const restoreIdx = argv.indexOf('--restore');
const BUCKET = 'food-media';
const src = fs.readFileSync(path.join(ROOT, 'src', 'services', 'supabaseService.ts'), 'utf8');
const SUPA = (process.env.KFT_SUPABASE_URL || (src.match(/DEFAULT_SUPABASE_URL\s*=\s*'([^']+)'/) || [])[1]).replace(/\/+$/, '');
const KEY = process.env.KFT_SUPABASE_KEY || (src.match(/DEFAULT_SUPABASE_PUBLISHABLE_KEY\s*=\s*'([^']+)'/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const JSONH = { ...H, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' };
const kv = `${SUPA}/rest/v1/kft_app_kv_store`;
const kb = (n) => (n / 1024).toFixed(0) + ' KB';

async function getRow(key) {
  const r = await fetch(`${kv}?key=eq.${encodeURIComponent(key)}&select=key,payload,updated_at`, { headers: H });
  if (r.status === 402) throw new Error('HTTP 402: Supabase project still restricted');
  if (!r.ok) throw new Error(`GET ${key} -> HTTP ${r.status}`);
  return (await r.json())[0] || null;
}
async function putRow(key, payload) {
  const r = await fetch(kv, { method: 'POST', headers: JSONH, body: JSON.stringify({ key, payload, updated_at: new Date().toISOString() }) });
  if (!r.ok) throw new Error(`PUT ${key} -> HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
}
async function listKeys(prefix) {
  const r = await fetch(`${kv}?key=like.${encodeURIComponent(prefix)}*&select=key&order=key.asc&limit=2000`, { headers: H });
  if (!r.ok) throw new Error(`list ${prefix} -> HTTP ${r.status}`);
  return (await r.json()).map((x) => x.key);
}
const DATA_IMG = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/is;
const isHeavyInline = (v) => typeof v === 'string' && v.length > 4000 && DATA_IMG.test(v);

async function uploadToStorage(objectPath, dataUrl) {
  const m = DATA_IMG.exec(dataUrl);
  const bytes = Buffer.from(m[2], 'base64');
  const up = await fetch(`${SUPA}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': m[1], 'x-upsert': 'true', 'cache-control': 'max-age=31536000' },
    body: bytes,
  });
  if (!up.ok) throw new Error(`storage upload HTTP ${up.status} ${(await up.text()).slice(0, 140)}`);
  const url = `${SUPA}/storage/v1/object/public/${BUCKET}/${objectPath}`;
  const chk = await fetch(url);
  const got = chk.ok ? (await chk.arrayBuffer()).byteLength : -1;
  if (!chk.ok || got !== bytes.length) throw new Error(`verification failed (${chk.status}, ${got} vs ${bytes.length} bytes)`);
  return url;
}

/** Replace every heavy inline image anywhere inside a JSON value. */
async function slimDeep(value, keyHint, ctx) {
  if (isHeavyInline(value)) {
    ctx.found++;
    ctx.bytesBefore += value.length;
    if (!APPLY) return value;
    const ext = (DATA_IMG.exec(value)[1].split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace(/[^a-z0-9]/g, '');
    const hash = Buffer.from(value.slice(-64) + value.length).toString('base64url').slice(0, 10);
    const objectPath = `ov/${keyHint.replace(/[^a-zA-Z0-9_-]/g, '_')}_${hash}.${ext}`;
    const url = await uploadToStorage(objectPath, value);
    ctx.replaced++;
    return url;
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const v of value) out.push(await slimDeep(v, keyHint, ctx));
    return out;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = await slimDeep(v, keyHint, ctx);
    return out;
  }
  return value;
}

async function main() {
  if (restoreIdx >= 0) {
    const file = path.resolve(argv[restoreIdx + 1]);
    const rows = JSON.parse(fs.readFileSync(file, 'utf8')).rows;
    for (const r of rows) await putRow(r.key, r.payload);
    console.log(`[restore] put back ${rows.length} original rows from ${path.basename(file)}`);
    return;
  }
  console.log(`[egress-slim] ${APPLY ? 'APPLY MODE' : 'DRY RUN (nothing is written)'}  ${ONLY ? 'only=' + ONLY : ''}\n`);
  const backup = [];
  let savedTotal = 0;
  const backupFile = path.join(ROOT, 'backups', 'egress', `${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 17)}Z_${ONLY || 'all'}_originals.json`);
  const saveBackup = () => { fs.mkdirSync(path.dirname(backupFile), { recursive: true }); fs.writeFileSync(backupFile, JSON.stringify({ createdAt: new Date().toISOString(), rows: backup })); };

  if (!ONLY || ONLY === 'transactions') {
    const row = await getRow('kft_cloud_transactions_v1');
    if (row && Array.isArray(row.payload)) {
      const before = JSON.stringify(row.payload).length;
      let moved = 0, already = 0;
      const next = [];
      for (const t of row.payload) {
        if (t && typeof t.paymentProofUrl === 'string' && isHeavyInline(t.paymentProofUrl)) {
          if (APPLY) {
            const proofKey = `kft_proof_${t.id}`;
            const existing = await getRow(proofKey);
            if (!existing) {
              await putRow(proofKey, { txnId: t.id, userId: t.userId || t.ownerId, dataUrl: t.paymentProofUrl, fileName: t.paymentProofFileName || 'receipt.jpg', mimeType: t.paymentProofMimeType || 'image/jpeg', uploadedAt: t.paymentProofUploadedAt || t.createdAt || new Date().toISOString() });
              const verify = await getRow(proofKey);
              if (!verify || verify.payload.dataUrl !== t.paymentProofUrl) throw new Error(`proof copy verification failed for ${t.id}`);
            } else already++;
          }
          moved++;
          next.push({ ...t, paymentProofUrl: `vault:${t.id}` });
        } else next.push(t);
      }
      const after = JSON.stringify(next).length;
      console.log(`transactions: ${row.payload.length} rows, ${moved} inline receipts (${already} already had their own row)  ${kb(before)} -> ${kb(after)}  saves ${kb(before - after)} per sync, per device`);
      savedTotal += before - after;
      if (APPLY && moved > 0) { backup.push(row); saveBackup(); await putRow('kft_cloud_transactions_v1', next); console.log('  applied.'); }
    }
  }

  if (!ONLY || ONLY === 'overrides') {
    const keys = [...(await listKeys('kft_ov_')), 'kft_cloud_media_overrides_v1'];
    let rowsChanged = 0, found = 0, replaced = 0, before = 0, after = 0;
    for (const key of keys) {
      const row = await getRow(key);
      if (!row) continue;
      const ctx = { found: 0, replaced: 0, bytesBefore: 0 };
      const rowBefore = JSON.stringify(row.payload).length;
      const slim = await slimDeep(row.payload, key, ctx);
      if (ctx.found === 0) continue;
      const rowAfter = APPLY ? JSON.stringify(slim).length : rowBefore - ctx.bytesBefore + ctx.found * 140;
      rowsChanged++; found += ctx.found; replaced += ctx.replaced; before += rowBefore; after += rowAfter;
      if (APPLY) { backup.push(row); saveBackup(); await putRow(key, slim); }
    }
    console.log(`overrides (kft_ov_*): ${keys.length} rows, ${rowsChanged} contain ${found} inline images  ${kb(before)} -> ~${kb(after)}  saves ~${kb(before - after)} per full download (every device, every app update)`);
    if (APPLY) console.log(`  uploaded+verified ${replaced} images to Storage bucket "${BUCKET}"`);
    savedTotal += before - after;
  }

  if (APPLY && backup.length) console.log(`\nbackup of ${backup.length} original rows: ${path.relative(ROOT, backupFile)}   (undo: node scripts/egressSlim.mjs --restore ${path.relative(ROOT, backupFile)})`);
  console.log(`\n[egress-slim] ${APPLY ? 'saved' : 'would save'} ~${(savedTotal / 1048576).toFixed(1)} MB per full download of these rows`);
}
main().catch((e) => { console.error('[egress-slim] FAILED:', e.message); process.exit(1); });

