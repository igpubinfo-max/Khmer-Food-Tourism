// Smoke test for the deployed `vip-purchase` function. Uses a synthetic NON-receipt image and a throw-away user id, so it can
// never grant VIP; it proves: function reachable, Gemini vision works, ledger insert works, the same image is refused the 2nd time.
// Leaves 1 test row in kft_payment_receipts (user_id 'smoke-test-user'); remove with:
//   DELETE FROM public.kft_payment_receipts WHERE user_id = 'smoke-test-user';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const SUPA = 'https://ryvltobwuwuulazqjnza.supabase.co';
const KEY = 'sb_publishable_h5ufAaA0qAL3s-ebprATsw_8AApv71l';
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };

function png(w, h) {
  const crc = (buf) => { let c, crcv = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crcv ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcv = (crcv >>> 8) ^ c; } return (crcv ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; crypto.randomFillSync(raw, y * (w * 3 + 1) + 1, w * 3); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const dataUrl = 'data:image/png;base64,' + png(120, 120).toString('base64');
let bad = 0;
const line = (ok, name, extra = '') => { if (!ok) bad++; console.log((ok ? '  PASS ' : '  FAIL ') + name + (extra ? '  - ' + extra : '')); };
const call = async (body) => { const r = await fetch(`${SUPA}/functions/v1/vip-purchase`, { method: 'POST', headers: { ...H, 'x-kft-user-id': 'smoke-test-user' }, body: JSON.stringify(body) }); return { status: r.status, stamped: r.headers.get('x-vip-purchase') === '1', data: await r.json().catch(() => ({})) }; };

const base = { userId: 'smoke-test-user', durationDays: 30, receiptDataUrl: dataUrl, submittedTrxId: '' };
const a = await call(base);
line(a.stamped, 'vip-purchase deployed', `HTTP ${a.status} ${a.data.error || ''}`);
if (a.status === 400 && a.data.error === 'UNKNOWN_PLAN') {
  console.log('    (server VIP pricing has no 30-day plan - trying the long plan)');
  base.durationDays = 60;
}
const first = a.status === 400 ? await call(base) : a;
line(first.status === 200 && first.data.ok, 'request processed (AI looked at the image)', `HTTP ${first.status} decision=${first.data.decision} ${first.data.error || ''}`);
line(first.data.decision !== 'verified', 'a random picture is NEVER activated as VIP', `decision=${first.data.decision}`);
const second = await call(base);
line(second.data.decision === 'rejected' && second.data.report?.checks?.antiReplay?.passed === false, 'the same image is refused the second time (ledger + unique hash)', `decision=${second.data.decision}`);
const bad1 = await call({ ...base, durationDays: 3650 });
line(bad1.status === 400, 'an invented plan length is refused', `HTTP ${bad1.status} ${bad1.data.error || ''}`);
const ledger = await fetch(`${SUPA}/rest/v1/kft_payment_receipts?select=id&limit=1`, { headers: H });
line(ledger.status === 401, 'the receipt ledger is NOT readable with the public key', `HTTP ${ledger.status}`);
const vipRow = await (await fetch(`${SUPA}/rest/v1/kft_app_kv_store?key=eq.kft_user_smoke-test-user&select=key`, { headers: H })).json();
line(Array.isArray(vipRow) && vipRow.length === 0, 'no user row / VIP was created for the test id');
console.log(bad ? `\n${bad} check(s) FAILED` : '\nAll checks passed');
process.exitCode = bad ? 1 : 0;
