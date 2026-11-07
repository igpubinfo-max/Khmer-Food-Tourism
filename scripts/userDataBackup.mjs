#!/usr/bin/env node
/**
 * scripts/userDataBackup.mjs  —  AUTOMATIC PRE-DEPLOY BACKUP of every account / VIP / registration record
 * stored on the CENTRAL server (Supabase `kft_app_kv_store`).
 *
 *   npm run backup:users            # writes backups/users/<UTC>_v<version>/
 *   node scripts/userDataBackup.mjs --allow-empty   # (first install only) permit a 0-user backup
 *   node scripts/userDataBackup.mjs --force         # keep going even if the server list looks smaller than the last backup
 *
 * READ-ONLY against the server (GET only). Exit codes: 0 ok | 2 server restricted (HTTP 402) | 3 server/network error
 * | 4 refused to write an empty backup | 5 server list shrank vs last backup (investigate before deploying!)
 *
 * Credentials: env KFT_SUPABASE_URL / KFT_SUPABASE_KEY, otherwise the same public defaults the shipped app uses.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const PAGE = 1000;
const AGGREGATE_KEYS = [
  'kft_cloud_users_v1',
  'kft_cloud_users_v2',
  'kft_cloud_vip_backup_v1',
  'kft_cloud_deleted_users_v1',
  'kft_cloud_transactions_v1',
];

function loadConfig() {
  let url = process.env.KFT_SUPABASE_URL;
  let key = process.env.KFT_SUPABASE_KEY;
  if (!url || !key) {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'services', 'supabaseService.ts'), 'utf8');
    url = url || (src.match(/DEFAULT_SUPABASE_URL\s*=\s*'([^']+)'/) || [])[1];
    key = key || (src.match(/DEFAULT_SUPABASE_PUBLISHABLE_KEY\s*=\s*'([^']+)'/) || [])[1];
  }
  if (!url || !key) throw new Error('Supabase URL/key not found (set KFT_SUPABASE_URL and KFT_SUPABASE_KEY)');
  return { url: url.replace(/\/+$/, ''), key };
}

async function getJson(cfg, pathAndQuery, attempt = 1) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(`${cfg.url}/rest/v1/${pathAndQuery}`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (res.status === 402) {
      const body = await res.text();
      const err = new Error(`HTTP 402 — Supabase project is restricted: ${body.slice(0, 200)}`);
      err.code = 'QUOTA';
      throw err;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
    return await res.json();
  } catch (e) {
    if (e.code === 'QUOTA') throw e;
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 800 * attempt));
      return getJson(cfg, pathAndQuery, attempt + 1);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const isActiveVip = (p) =>
  p &&
  p.membershipTier === 'premium_vip' &&
  p.subscriptionStatus === 'active' &&
  (Date.parse(p.subscriptionExpiryDate || p.vipExpiresAt || '') || 0) > Date.now();

async function main() {
  const cfg = loadConfig();
  const host = new URL(cfg.url).host;
  console.log(`[backup] source: ${host}`);

  const users = [];
  for (let offset = 0; ; offset += PAGE) {
    const rows = await getJson(
      cfg,
      `kft_app_kv_store?key=like.kft_user_*&select=key,payload,updated_at&order=key.asc&limit=${PAGE}&offset=${offset}`
    );
    users.push(...rows);
    process.stdout.write(`\r[backup] downloaded ${users.length} user rows…`);
    if (rows.length < PAGE) break;
    if (offset > 500_000) throw new Error('safety stop: > 500k rows');
  }
  process.stdout.write('\n');
  const aggRows = await getJson(
    cfg,
    `kft_app_kv_store?key=in.(${AGGREGATE_KEYS.join(',')})&select=key,payload,updated_at`
  );
  const aggregates = Object.fromEntries(aggRows.map((r) => [r.key, r.payload]));

  const nonAdmin = users.filter((r) => r.payload && r.payload.role !== 'admin');
  const vipActive = nonAdmin.filter((r) => isActiveVip(r.payload)).length;
  if (nonAdmin.length === 0 && !args.has('--allow-empty')) {
    console.error('[backup] REFUSED: server returned 0 user rows. An empty backup would look valid but protect nothing. Use --allow-empty only on a brand-new install.');
    process.exit(4);
  }

  const outRoot = path.join(ROOT, 'backups', 'users');
  fs.mkdirSync(outRoot, { recursive: true });
  const previous = fs
    .readdirSync(outRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  if (previous.length > 0) {
    try {
      const lastManifest = JSON.parse(fs.readFileSync(path.join(outRoot, previous[previous.length - 1], 'manifest.json'), 'utf8'));
      const prevCount = lastManifest.counts?.atomicUsers || 0;
      if (prevCount >= 5 && nonAdmin.length < Math.ceil(prevCount * 0.8) && !args.has('--force')) {
        console.error(`[backup] ALARM: server has ${nonAdmin.length} users but the previous backup had ${prevCount}. Do NOT deploy; investigate (docs/USER_DATA_SAFETY.md). Re-run with --force to store this state anyway.`);
        process.exit(5);
      }
    } catch {
      /* previous manifest unreadable: continue */
    }
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const dir = path.join(outRoot, `${stamp}_v${pkg.version}`);
  fs.mkdirSync(dir, { recursive: true });

  const usersBuf = Buffer.from(JSON.stringify(users));
  const aggBuf = Buffer.from(JSON.stringify(aggregates));
  fs.writeFileSync(path.join(dir, 'kft_users.json'), usersBuf);
  fs.writeFileSync(path.join(dir, 'aggregates.json'), aggBuf);
  const manifest = {
    schema: 1,
    createdAt: new Date().toISOString(),
    appVersion: pkg.version,
    sourceHost: host,
    counts: {
      atomicUsers: nonAdmin.length,
      atomicRowsTotal: users.length,
      vipActive,
      aggregateLengths: Object.fromEntries(
        Object.entries(aggregates).map(([k, v]) => [k, Array.isArray(v) ? v.length : Object.keys(v || {}).length])
      ),
    },
    files: {
      'kft_users.json': { bytes: usersBuf.length, sha256: sha256(usersBuf) },
      'aggregates.json': { bytes: aggBuf.length, sha256: sha256(aggBuf) },
    },
  };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(outRoot, 'LATEST.txt'), path.basename(dir));
  console.log(`[backup] OK  ${nonAdmin.length} users (${vipActive} active VIP) -> ${path.relative(ROOT, dir)}`);
}

main().catch((e) => {
  if (e.code === 'QUOTA') {
    console.error(`\n[backup] SERVER RESTRICTED: ${e.message}\n  -> Supabase Dashboard > Billing: upgrade the plan or remove the spend cap, then re-run.\n  -> NOTHING was written. Do not deploy until a backup succeeds.`);
    process.exit(2);
  }
  console.error(`\n[backup] FAILED: ${e.message}`);
  process.exit(3);
});
