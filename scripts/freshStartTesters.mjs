#!/usr/bin/env node
/**
 * scripts/freshStartTesters.mjs — "fresh start with tester accounts only" for the PRODUCTION database.
 *
 *   node scripts/freshStartTesters.mjs                    # DRY RUN (default): reads only, prints exactly what would change
 *   node scripts/freshStartTesters.mjs --apply            # does it; ALWAYS writes a full backup of every row it touches first
 *   node scripts/freshStartTesters.mjs --restore backups/freshstart/<dir>   # puts every touched row back
 *
 * KEEPS : every account (kft_user_*, aggregates), profile/avatar/registration date/history, all shops, food/shop/tourism photos
 *         (kft_ov_*), settings, tombstones for deleted users.
 * CLEARS: invoices (kft_cloud_transactions_v1 -> []), receipt images (kft_proof_*, kft_cloud_payment_proofs_v1),
 *         VIP on every account (reset to Free using the SAME fields as the Admin "Cancel VIP" button, so every
 *         device's merge logic accepts it), VIP backup registry, paid extra store slots.
 * ALSO  : writes every cleared transaction id into kft_cloud_deleted_transactions_v1 so phones that still hold a
 *         local copy drop it on their next sync instead of re-uploading it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const NO_BACKUP = argv.includes('--no-backup');
const rIdx = argv.indexOf('--restore');
const src = fs.readFileSync(path.join(ROOT, 'src', 'services', 'supabaseService.ts'), 'utf8');
const SUPA = (process.env.KFT_SUPABASE_URL || (src.match(/DEFAULT_SUPABASE_URL\s*=\s*'([^']+)'/) || [])[1]).replace(/\/+$/, '');
const KEY = process.env.KFT_SUPABASE_KEY || (src.match(/DEFAULT_SUPABASE_PUBLISHABLE_KEY\s*=\s*'([^']+)'/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const JH = { ...H, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' };
const DESTRUCTIVE = { 'x-kft-allow-destructive': 'true' };
const kv = `${SUPA}/rest/v1/kft_app_kv_store`;
const nowIso = new Date().toISOString();

async function getRow(key) {
  const r = await fetch(`${kv}?key=eq.${encodeURIComponent(key)}&select=key,payload,updated_at`, { headers: H });
  if (r.status === 402) throw new Error('HTTP 402: Supabase project is restricted');
  if (!r.ok) throw new Error(`GET ${key} -> HTTP ${r.status}`);
  return (await r.json())[0] || null;
}
async function putRow(key, payload) {
  const r = await fetch(kv, { method: 'POST', headers: { ...JH, ...DESTRUCTIVE }, body: JSON.stringify({ key, payload, updated_at: new Date().toISOString() }) });
  if (!r.ok) throw new Error(`PUT ${key} -> HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
}
async function delRow(key) {
  const r = await fetch(`${kv}?key=eq.${encodeURIComponent(key)}`, { method: 'DELETE', headers: { ...H, ...DESTRUCTIVE } });
  if (!r.ok) throw new Error(`DELETE ${key} -> HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
}
async function listKeys(like) {
  const out = [];
  for (let off = 0; ; off += 500) {
    const r = await fetch(`${kv}?key=like.${encodeURIComponent(like)}&select=key&order=key.asc&limit=500&offset=${off}`, { headers: H });
    if (!r.ok) throw new Error(`list ${like} -> HTTP ${r.status}`);
    const part = await r.json();
    out.push(...part.map((x) => x.key));
    if (part.length < 500) break;
  }
  return out;
}

const hasVipOrPaymentSignal = (p) =>
  (p.membershipTier && p.membershipTier !== 'free') || p.subscriptionStatus === 'active' || p.vipStatus === 'active' ||
  p.subscriptionExpiryDate || p.vipExpiresAt || p.transactionRef || (p.paidAdditionalStoreSlots || 0) > 0 ||
  (p.paymentStatus && !['unpaid', 'none', 'cancelled'].includes(p.paymentStatus));

/** Same shape as AppContext.cancelUserVip() (+ clears the legacy fields normalizeVipExpiryOnUser could re-infer VIP from). */
function resetVip(p) {
  if (!hasVipOrPaymentSignal(p)) return p;
  const n = {
    ...p,
    membershipTier: 'free',
    subscriptionStatus: 'cancelled',
    paymentStatus: 'cancelled',
    vipStatus: 'cancelled',
    autoRenew: false,
    vipCancelledAt: nowIso,
    paidAdditionalStoreSlots: 0,
    additionalStorePaymentIds: [],
  };
  for (const k of ['subscriptionExpiryDate', 'vipExpiresAt', 'transactionRef']) delete n[k];
  return n;
}
const isActiveVip = (p) => p.membershipTier === 'premium_vip' && p.subscriptionStatus === 'active' && (Date.parse(p.subscriptionExpiryDate || p.vipExpiresAt || '') || 0) > Date.now();

async function main() {
  if (rIdx >= 0) {
    const dir = path.resolve(argv[rIdx + 1]);
    const rows = JSON.parse(fs.readFileSync(path.join(dir, 'rows.json'), 'utf8'));
    for (const r of rows) await putRow(r.key, r.payload);
    console.log(`[restore] put back ${rows.length} rows from ${path.basename(dir)}`);
    return;
  }
  console.log(`[fresh-start] ${APPLY ? 'APPLY MODE' : 'DRY RUN (nothing is written)'}\n`);
  const touched = []; // original rows (for backup)
  const plan = [];    // {key, payload|null}  null = delete

  // 1. accounts
  const userKeys = await listKeys('kft_user_*');
  let resetCount = 0, vipActiveBefore = 0, untouched = 0;
  for (const key of userKeys) {
    const row = await getRow(key);
    if (!row || !row.payload || row.payload.role === 'admin') continue;
    if (isActiveVip(row.payload)) vipActiveBefore++;
    const next = resetVip(row.payload);
    if (next !== row.payload) { resetCount++; touched.push(row); plan.push({ key, payload: next }); } else untouched++;
  }
  console.log(`accounts      : ${userKeys.length} kept | VIP/payment fields reset on ${resetCount} (active VIP before: ${vipActiveBefore}) | already Free: ${untouched}`);

  // 2. aggregates + vip backup
  for (const key of ['kft_cloud_users_v2', 'kft_cloud_users_v1']) {
    const row = await getRow(key);
    if (row && Array.isArray(row.payload)) {
      const next = row.payload.map((u) => (u && u.role !== 'admin' ? resetVip(u) : u));
      touched.push(row); plan.push({ key, payload: next });
      console.log(`aggregate     : ${key} ${row.payload.length} accounts kept (VIP fields reset inside)`);
    }
  }
  const vipBackup = await getRow('kft_cloud_vip_backup_v1');
  if (vipBackup) {
    const size = Array.isArray(vipBackup.payload) ? vipBackup.payload.length : Object.keys(vipBackup.payload || {}).length;
    touched.push(vipBackup); plan.push({ key: 'kft_cloud_vip_backup_v1', payload: Array.isArray(vipBackup.payload) ? [] : {} });
    console.log(`vip backup    : ${size} entr${size === 1 ? 'y' : 'ies'} cleared`);
  }

  // 3. invoices + receipts
  const txRow = await getRow('kft_cloud_transactions_v1');
  const txIds = txRow && Array.isArray(txRow.payload) ? txRow.payload.map((t) => t.id).filter(Boolean) : [];
  if (txRow) { touched.push(txRow); plan.push({ key: 'kft_cloud_transactions_v1', payload: [] }); }
  const delTx = await getRow('kft_cloud_deleted_transactions_v1');
  const delIds = Array.from(new Set([...(delTx && Array.isArray(delTx.payload) ? delTx.payload : []), ...txIds]));
  if (delTx) touched.push(delTx);
  plan.push({ key: 'kft_cloud_deleted_transactions_v1', payload: delIds });
  console.log(`invoices      : ${txIds.length} transactions cleared (ids written to the deleted-transactions list so phones drop their local copies)`);
  const proofKeys = await listKeys('kft_proof_*');
  for (const k of proofKeys) { const r = await getRow(k); if (r) touched.push(r); plan.push({ key: k, payload: null }); }
  const vault = await getRow('kft_cloud_payment_proofs_v1');
  if (vault) { touched.push(vault); plan.push({ key: 'kft_cloud_payment_proofs_v1', payload: Array.isArray(vault.payload) ? [] : {} }); }
  const tickets = await getRow('kft_cloud_support_tickets_v1');
  console.log(`receipts      : ${proofKeys.length} receipt images deleted + legacy receipt vault cleared`);
  console.log(`left untouched: shops, food/shop/tourism photos (kft_ov_*), settings, user tombstones, support tickets (${Array.isArray(tickets?.payload) ? tickets.payload.length : 0})`);

  const kb = (touched.reduce((a, r) => a + JSON.stringify(r.payload).length, 0) / 1024).toFixed(0);
  console.log(`\nrows that would change: ${plan.length}  (original data of ${touched.length} rows = ${kb} KB, backed up first)`);
  if (!APPLY) { console.log('\n[fresh-start] DRY RUN complete. Nothing was changed.'); return; }

  let dir = null;
  if (NO_BACKUP) {
    console.log('\n--no-backup: skipping row backup (owner confirmed all accounts are testers; accounts are covered by backups/users)');
  } else {
    dir = path.join(ROOT, 'backups', 'freshstart', nowIso.replace(/[-:.]/g, '').slice(0, 15) + 'Z');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'rows.json'), JSON.stringify(touched));
    fs.writeFileSync(path.join(dir, 'README.txt'), `Original rows removed/changed by freshStartTesters.mjs at ${nowIso}.\nUndo: node scripts/freshStartTesters.mjs --restore ${path.relative(ROOT, dir)}\nContains payment receipt images and user e-mails: keep private, delete when no longer needed.\n`);
    console.log(`\nbackup written: ${path.relative(ROOT, dir)} (${touched.length} rows)`);
  }
  let done = 0;
  for (const step of plan) {
    if (step.payload === null) await delRow(step.key); else await putRow(step.key, step.payload);
    done++;
  }
  console.log(`applied ${done}/${plan.length} changes.`);
  if (dir) console.log(`undo: node scripts/freshStartTesters.mjs --restore ${path.relative(ROOT, dir)}`);
}
main().catch((e) => { console.error('[fresh-start] FAILED:', e.message); process.exit(1); });
