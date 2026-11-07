#!/usr/bin/env node
/**
 * scripts/userDataRestoreTest.mjs — RESTORE TEST for the latest (or given) user backup.
 *
 *   npm run test:users:restore                  # validates backups/users/LATEST.txt
 *   node scripts/userDataRestoreTest.mjs <dir>  # validate a specific backup folder
 *   node scripts/userDataRestoreTest.mjs --compare-live   # also compare against the live server (read-only)
 *
 * A backup that was never restored is not a backup. This test:
 *  1. verifies manifest + SHA-256 of every file (detects truncated/corrupted backups)
 *  2. validates every record (key, id, registration date, unique keys, VIP counts)
 *  3. TOTAL-LOSS drill: restores into an EMPTY store and proves the result is byte-identical
 *  4. PARTIAL-LOSS drill: deletes 30% of rows and edits 5%; the (non-destructive) restore must bring back every deleted
 *     account and must NEVER overwrite a newer live record — same semantics as SQL kft_restore_missing_users_from_snapshot().
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const canonical = (v) => JSON.stringify(v, (_, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));

function resolveBackupDir() {
  const explicit = argv.find((a) => !a.startsWith('--'));
  if (explicit) return path.resolve(explicit);
  const latestFile = path.join(ROOT, 'backups', 'users', 'LATEST.txt');
  if (!fs.existsSync(latestFile)) {
    console.error('[restore-test] No backup found. Run `npm run backup:users` first.');
    process.exit(2);
  }
  return path.join(ROOT, 'backups', 'users', fs.readFileSync(latestFile, 'utf8').trim());
}

/** Non-destructive restore: only re-creates MISSING rows; never overwrites a live row. */
function restoreMissing(live, backupRows) {
  let restored = 0;
  for (const r of backupRows) {
    if (!live.has(r.key)) {
      live.set(r.key, structuredClone(r));
      restored++;
    }
  }
  return restored;
}

async function main() {
  const dir = resolveBackupDir();
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  console.log(`[restore-test] backup: ${path.relative(ROOT, dir)}  (${manifest.counts.atomicUsers} users, ${manifest.counts.vipActive} active VIP, v${manifest.appVersion})`);

  // 1. integrity of the files themselves
  for (const [name, meta] of Object.entries(manifest.files)) {
    const buf = fs.readFileSync(path.join(dir, name));
    assert.equal(buf.length, meta.bytes, `${name}: size mismatch (truncated backup?)`);
    assert.equal(sha256(buf), meta.sha256, `${name}: SHA-256 mismatch (corrupted backup)`);
  }
  console.log('  ✓ 1. checksums match (files are complete and untampered)');

  const rows = JSON.parse(fs.readFileSync(path.join(dir, 'kft_users.json'), 'utf8'));
  assert.ok(Array.isArray(rows), 'kft_users.json must be an array');

  // 2. record validation
  const keys = new Set();
  let vip = 0;
  let noDate = 0;
  const emails = new Map();
  for (const r of rows) {
    assert.ok(r && typeof r.key === 'string' && r.key.startsWith('kft_user_'), `bad key: ${r && r.key}`);
    assert.ok(r.payload && typeof r.payload === 'object', `payload missing for ${r.key}`);
    assert.ok(!keys.has(r.key), `duplicate key ${r.key}`);
    keys.add(r.key);
    if (r.payload.role === 'admin') continue;
    assert.ok(r.payload.id, `user id missing in ${r.key}`);
    if (!r.payload.createdAt && !r.payload.registeredAtIso) noDate++;
    if (
      r.payload.membershipTier === 'premium_vip' &&
      r.payload.subscriptionStatus === 'active' &&
      (Date.parse(r.payload.subscriptionExpiryDate || r.payload.vipExpiresAt || '') || 0) > Date.parse(manifest.createdAt)
    ) vip++;
    const e = String(r.payload.email || '').toLowerCase();
    if (e) emails.set(e, (emails.get(e) || 0) + 1);
  }
  const nonAdmin = rows.filter((r) => r.payload.role !== 'admin').length;
  assert.equal(nonAdmin, manifest.counts.atomicUsers, 'user count differs from manifest');
  assert.equal(vip, manifest.counts.vipActive, 'VIP count differs from manifest');
  const dupEmails = Array.from(emails.values()).filter((n) => n > 1).length;
  console.log(`  ✓ 2. ${nonAdmin} records valid • ${vip} VIP • ${noDate} without registration date • ${dupEmails} duplicate e-mails`);

  // 3. total-loss drill
  const live = new Map();
  const restoredAll = restoreMissing(live, rows);
  assert.equal(restoredAll, rows.length);
  assert.equal(
    sha256(Buffer.from(canonical(Array.from(live.values()).sort((a, b) => (a.key < b.key ? -1 : 1))))),
    sha256(Buffer.from(canonical(rows.slice().sort((a, b) => (a.key < b.key ? -1 : 1))))),
    'restored store must be identical to the backup'
  );
  console.log(`  ✓ 3. TOTAL-LOSS drill: ${restoredAll} rows restored into an empty store, identical to backup`);

  // 4. partial-loss drill (deterministic pseudo-random)
  const part = new Map(rows.map((r) => [r.key, structuredClone(r)]));
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const deleted = [];
  const edited = [];
  for (const r of rows) {
    const x = rnd();
    if (x < 0.3) {
      part.delete(r.key);
      deleted.push(r.key);
    } else if (x < 0.35) {
      const live2 = part.get(r.key);
      live2.payload.name = `${live2.payload.name || ''} (newer edit)`;
      edited.push(r.key);
    }
  }
  const restoredPartial = restoreMissing(part, rows);
  assert.equal(restoredPartial, deleted.length, 'every deleted account must be restored');
  assert.equal(part.size, rows.length, 'row count back to the backup count');
  for (const k of edited) assert.ok(String(part.get(k).payload.name).endsWith('(newer edit)'), `restore must not overwrite newer live record ${k}`);
  console.log(`  ✓ 4. PARTIAL-LOSS drill: ${deleted.length} deleted accounts restored, ${edited.length} newer live edits preserved`);

  if (argv.includes('--compare-live')) {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'services', 'supabaseService.ts'), 'utf8');
    const url = process.env.KFT_SUPABASE_URL || (src.match(/DEFAULT_SUPABASE_URL\s*=\s*'([^']+)'/) || [])[1];
    const key = process.env.KFT_SUPABASE_KEY || (src.match(/DEFAULT_SUPABASE_PUBLISHABLE_KEY\s*=\s*'([^']+)'/) || [])[1];
    const res = await fetch(`${url}/rest/v1/kft_app_kv_store?select=key&key=like.kft_user_*&payload-%3E%3Erole=neq.admin&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact', Range: '0-0' },
    });
    if (res.status === 402) {
      console.log('  ! 5. live compare skipped: server is restricted (HTTP 402)');
    } else {
      const total = Number((res.headers.get('content-range') || '').split('/')[1]);
      console.log(`  ${total >= manifest.counts.atomicUsers ? '✓' : '✗'} 5. live server has ${total} users vs ${manifest.counts.atomicUsers} in backup`);
      if (total < manifest.counts.atomicUsers) process.exitCode = 1;
    }
  }
  console.log('[restore-test] PASS');
}

main().catch((e) => {
  console.error('[restore-test] FAIL:', e.message);
  process.exit(1);
});
