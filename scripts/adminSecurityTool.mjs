#!/usr/bin/env node
/**
 * Admin security helper (run by the ADMIN on their own PC - credentials are typed here, never passed on the command line).
 *
 *   node scripts/adminSecurityTool.mjs test      -> logs in through the admin-auth Edge Function and proves the roll-out works
 *   node scripts/adminSecurityTool.mjs migrate   -> removes the admin password hash from the public settings documents and
 *                                                   scrambles the legacy public PIN hash (needs a valid admin login)
 *
 * test checks: PIN step, password step, token verification, wrong credentials rejected, and what the database does with a
 * write that has NO admin token (blocked = enforcement ON; accepted = enforcement still OFF).
 */
import readline from 'node:readline';
import crypto from 'node:crypto';

const SUPA = 'https://ryvltobwuwuulazqjnza.supabase.co';
const KEY = 'sb_publishable_h5ufAaA0qAL3s-ebprATsw_8AApv71l';
const base = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const cmd = process.argv[2];

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    if (!hidden || !process.stdin.isTTY) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); });
      return;
    }
    // hidden input that still shows one * per typed character, so a typo or an empty paste is visible
    process.stdout.write(question);
    let buf = '';
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const onKey = (str, key) => {
      if (key && key.ctrl && key.name === 'c') { process.stdin.setRawMode(false); process.exit(130); }
      if (key && (key.name === 'return' || key.name === 'enter')) {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('keypress', onKey);
        process.stdout.write('  (' + buf.length + ' characters)\n');
        resolve(buf.trim());
        return;
      }
      if (key && key.name === 'backspace') { if (buf.length) { buf = buf.slice(0, -1); process.stdout.write('\b \b'); } return; }
      if (str && str >= ' ') { buf += str; process.stdout.write('*'); }
    };
    process.stdin.on('keypress', onKey);
  });
}
const call = async (action, extra = {}) => {
  const r = await fetch(`${SUPA}/functions/v1/admin-auth`, { method: 'POST', headers: { ...base, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
  return { status: r.status, stamped: r.headers.get('x-admin-auth') === '1', data: await r.json().catch(() => ({})) };
};
let bad = 0;
const line = (ok, name, extra = '') => { if (!ok) bad++; console.log((ok ? '  PASS ' : '  FAIL ') + name + (extra ? '  - ' + extra : '')); };

const st = await call('status');
line(st.stamped && st.status === 200, 'admin-auth function is deployed', `HTTP ${st.status}`);
line(Boolean(st.data.configured), 'ADMIN_PIN / ADMIN_PASSWORD secrets are set and the signing secret exists (supabase_admin_security_v1.sql was run)', JSON.stringify(st.data));
if (!st.data.configured) { console.log('\nNot configured yet - finish the deploy steps first.'); process.exit(1); }

const pin = await ask('Admin PIN (6 digits, hidden): ', true);
const password = await ask('Admin password (hidden): ', true);

// negative controls first (they count towards the server-side lockout, so only 1 of each, and skipped on migrate)
const SKIP_NEG = cmd === 'migrate' || process.argv.includes('--skip-negative');
if (!/^\d{6}$/.test(pin)) { console.log('\nThe PIN must be exactly 6 digits (you typed ' + pin.length + ' characters). Run again.'); process.exit(1); }
if (!SKIP_NEG) {
  const wrongPin = await call('pin', { pin: pin === '000000' ? '111111' : '000000' });
  line(wrongPin.status === 401, 'wrong PIN is rejected', `HTTP ${wrongPin.status}`);
}

const p = await call('pin', { pin });
line(p.status === 200 && p.data.ok && p.data.ticket, 'correct PIN accepted', `HTTP ${p.status} ${p.data.error || ''}${p.data.attemptsLeft !== undefined ? ' (attempts left today from this network: ' + p.data.attemptsLeft + ')' : ''}`);
if (!p.data.ticket) {
  console.log('\nThe server rejected this PIN. Re-type it carefully (the stars show how many characters you entered).');
  console.log('If you are sure it is right, run  .\\scripts\\setAdminSecrets.ps1  again to set a fresh PIN/password, then re-test.');
  process.exit(1);
}
const noTicket = await call('login', { username: 'admin', password });
line(noTicket.status === 401 && noTicket.data.error === 'PIN_REQUIRED', 'password step refuses to run without the PIN ticket', `HTTP ${noTicket.status}`);
if (!SKIP_NEG) {
  const wrongPass = await call('login', { username: 'admin', password: password + 'x', ticket: p.data.ticket });
  line(wrongPass.status === 401, 'wrong password is rejected', `HTTP ${wrongPass.status}`);
}
const login = await call('login', { username: 'admin', password, ticket: p.data.ticket });
line(login.status === 200 && login.data.ok && login.data.token, 'correct password accepted -> signed admin token issued', `HTTP ${login.status} ${login.data.error || ''}`);
if (!login.data.token) process.exit(1);
const token = login.data.token;
const ver = await call('verify', { token });
line(ver.data.ok === true, 'token verifies on the server');
const verTicket = await call('verify', { token: p.data.ticket });
line(verTicket.data.ok === false, 'a PIN ticket is NOT accepted as an admin token');

// ---- database behaviour on the admin-only documents
const KV = `${SUPA}/rest/v1/kft_app_kv_store`;
const getDoc = async (k) => (await (await fetch(`${KV}?key=eq.${k}&select=payload`, { headers: base })).json())[0]?.payload;
const put = (k, payload, headers = {}) => fetch(KV, { method: 'POST', headers: { ...base, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal', ...headers }, body: JSON.stringify({ key: k, payload, updated_at: new Date().toISOString() }) });

const SETTINGS = 'kft_cloud_app_settings_v1';
const settings = await getDoc(SETTINGS);
if (cmd === 'test' || !cmd) {
  const noTok = await put(SETTINGS, settings);
  const enforcing = noTok.status >= 400;
  line(true, `write to the payment/pricing settings WITHOUT an admin token`, enforcing ? `BLOCKED (HTTP ${noTok.status}) = enforcement is ON` : `accepted (HTTP ${noTok.status}) = enforcement is still OFF`);
  const withTok = await put(SETTINGS, settings, { 'x-kft-admin-token': token });
  line(withTok.ok, 'write WITH the admin token is accepted', `HTTP ${withTok.status}`);
  const forged = await put(SETTINGS, settings, { 'x-kft-admin-token': token.slice(0, -2) + 'zz' });
  line(!enforcing || forged.status >= 400, 'a forged token is rejected (checked only when enforcement is ON)', `HTTP ${forged.status}`);
}

if (cmd === 'migrate') {
  const H = { 'x-kft-admin-token': token };
  let changed = 0;
  for (const k of ['kft_cloud_app_settings_v1', 'kft_cloud_admin_vip_pricing_v2']) {
    const doc = await getDoc(k);
    if (doc && doc.adminPasswordHash) {
      const { adminPasswordHash, ...rest } = doc;
      const r = await put(k, rest, H);
      line(r.ok, `removed adminPasswordHash from ${k}`, `HTTP ${r.status}`);
      changed++;
    } else console.log(`  (skip) ${k}: no adminPasswordHash`);
  }
  const pinDoc = await getDoc('kft_admin_pin_security_v1');
  if (pinDoc && pinDoc.pinHash) {
    const r = await put('kft_admin_pin_security_v1', { pinHash: crypto.randomBytes(32).toString('hex'), updatedAt: new Date().toISOString(), note: 'legacy local PIN disabled - PIN is verified by the admin-auth Edge Function' }, H);
    line(r.ok, 'legacy public PIN hash replaced by a random unusable value', `HTTP ${r.status}`);
    changed++;
  } else console.log('  (skip) PIN document: nothing to scramble');
  const after1 = await getDoc('kft_cloud_app_settings_v1');
  const after2 = await getDoc('kft_cloud_admin_vip_pricing_v2');
  line(!after1?.adminPasswordHash && !after2?.adminPasswordHash, 'no admin password hash is publicly readable any more');
  console.log(changed ? `\nMigrated ${changed} document(s). The legacy local login no longer works - the server login is now the only way in.` : '\nNothing to migrate.');
}
console.log(bad ? `\n${bad} check(s) FAILED` : '\nAll checks passed');
process.exitCode = bad ? 1 : 0;
