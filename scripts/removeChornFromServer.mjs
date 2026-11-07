// Removes the injected phantom "Chorn Ponnakka" record from server aggregate documents.
// Default = DRY RUN. Use --apply to write. Always takes a local backup of the originals first.
import fs from 'node:fs';
const SUPA = 'https://ryvltobwuwuulazqjnza.supabase.co';
const KEY = 'sb_publishable_h5ufAaA0qAL3s-ebprATsw_8AApv71l';
const base = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
const url = `${SUPA}/rest/v1/kft_app_kv_store`;
const APPLY = process.argv.includes('--apply');
const isChorn = (u) => /ponnakka/i.test(JSON.stringify([u?.id, u?.email, u?.name, u?.username]));
const get = async (k) => (await (await fetch(`${url}?key=eq.${encodeURIComponent(k)}&select=payload,updated_at`, { headers: base })).json())[0];

const targets = ['kft_cloud_users_v2', 'kft_cloud_users_v1', 'kft_cloud_vip_backup_v1', 'kft_cloud_deleted_users_v1'];
const backup = {};
for (const k of targets) {
  const row = await get(k);
  if (!row) { console.log(k.padEnd(30), 'absent'); continue; }
  const payload = row.payload;
  if (!Array.isArray(payload)) { console.log(k.padEnd(30), 'not an array - skipped'); continue; }
  const hits = payload.filter(isChorn);
  console.log(k.padEnd(30), 'entries', payload.length, '-> matching Chorn:', hits.length);
  if (!hits.length) continue;
  backup[k] = row;
  const next = payload.filter((u) => !isChorn(u));
  if (!APPLY) continue;
  fs.mkdirSync('backups/egress', { recursive: true });
  const bf = `backups/egress/${new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15)}Z_chorn_originals.json`;
  fs.writeFileSync(bf, JSON.stringify(backup, null, 1));
  const r = await fetch(`${url}?key=eq.${encodeURIComponent(k)}`, {
    method: 'PATCH',
    headers: { ...base, Prefer: 'return=minimal', 'x-kft-allow-destructive': 'true' },
    body: JSON.stringify({ payload: next, updated_at: new Date().toISOString() }),
  });
  console.log('   PATCH', k, 'HTTP', r.status, '  entries now', next.length, ' backup:', bf);
}
// atomic row?
const atomic = await get('kft_user_google-chorn_ponnakka_cp_gmail_com');
console.log('atomic row kft_user_google-chorn_ponnakka_cp_gmail_com:', atomic ? 'EXISTS (not touched)' : 'absent');
console.log(APPLY ? 'APPLIED' : 'DRY RUN only (add --apply)');
