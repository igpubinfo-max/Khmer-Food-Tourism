import React, { useCallback, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Send, Server, ShieldCheck, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { fetchServerUserCounts, flushCloudOutbox, getCloudOutboxSize } from '../../services/supabaseService';
import {
  clearIntegrityLog,
  readIntegrityLog,
  readUpgradeAudit,
  readUserHighWater,
  runUserDataIntegrityCheck,
  type IntegrityLogEntry,
} from '../../services/userDataIntegrityService';

/**
 * Admin visibility into the user-data safety net: local vs central-server user counts, durable outbox,
 * upgrade before/after audit and the integrity error log (requirement: find problems BEFORE data is lost).
 */
export const AdminUserDataSafetyCard: React.FC = () => {
  const { language, users, currentUser, showToast, syncUsersNow } = useApp();
  const isKm = language === 'km';
  const [busy, setBusy] = useState(false);
  const [server, setServer] = useState<{ ok: boolean; status: number; total: number; vipActive: number; error?: string } | null>(null);
  const [logVersion, setLogVersion] = useState(0);
  const [outbox, setOutbox] = useState(() => getCloudOutboxSize());
  const [nowMs] = useState(() => Date.now());

  const realUsers = users.filter((u) => u.role !== 'admin' && u.id !== 'admin-authorized-single');
  const localVip = realUsers.filter(
    (u) => u.membershipTier === 'premium_vip' && u.subscriptionStatus === 'active' && Date.parse(String(u.subscriptionExpiryDate || '')) > nowMs
  ).length;
  const highWater = readUserHighWater();
  const log: IntegrityLogEntry[] = (logVersion >= 0 && readIntegrityLog().slice(0, 8)) || [];
  const audit = readUpgradeAudit().slice(0, 3);

  const runCheck = useCallback(async () => {
    setBusy(true);
    try {
      runUserDataIntegrityCheck(realUsers, currentUser?.id);
      const res = await fetchServerUserCounts();
      setServer(res);
      setOutbox(getCloudOutboxSize());
      if (!res.ok) {
        showToast(
          isKm
            ? `âš ï¸ áž˜áž·áž“áž¢áž¶áž…áž¢áž¶áž“áž˜áž¼áž›ážŠáŸ’áž‹áž¶áž“áž‘áž·áž“áŸ’áž“áž“áŸáž™áž€ážŽáŸ’ážáž¶áž›áž”áž¶áž“ (${res.error || res.status})`
            : `âš ï¸ Central database unreachable (${res.error || res.status})`,
          'error'
        );
      } else if (res.total > realUsers.length) {
        showToast(
          isKm
            ? `âš ï¸ Server áž˜áž¶áž“áž¢áŸ’áž“áž€áž”áŸ’ážšáž¾ ${res.total} áž…áŸ’ážšáž¾áž“áž‡áž¶áž„áž§áž”áž€ážšážŽáŸáž“áŸáŸ‡ (${realUsers.length}) â€” ážŸáž¼áž˜áž…áž»áž… Sync`
            : `âš ï¸ Server has ${res.total} users vs ${realUsers.length} on this device â€” press Sync`,
          'info'
        );
      } else {
        showToast(isKm ? 'âœ… áž‘áž·áž“áŸ’áž“áž“áŸáž™áž¢áŸ’áž“áž€áž”áŸ’ážšáž¾ážáŸ’ážšáž¼ážœáž‚áŸ’áž“áž¶' : 'âœ… User data consistent with server', 'success');
      }
    } finally {
      setLogVersion((v) => v + 1);
      setBusy(false);
    }
  }, [realUsers, currentUser?.id, showToast, isKm]);

  const retryOutbox = useCallback(async () => {
    setBusy(true);
    try {
      const r = await flushCloudOutbox(60);
      setOutbox(r.remaining);
      showToast(
        isKm ? `áž”áž¶áž“áž•áŸ’áž‰áž¾ ${r.flushed} â€¢ áž“áŸ…ážŸáž›áŸ‹ ${r.remaining}` : `Delivered ${r.flushed} â€¢ ${r.remaining} remaining`,
        r.remaining === 0 ? 'success' : 'info'
      );
    } finally {
      setBusy(false);
    }
  }, [showToast, isKm]);

  const serverBlocked = server && !server.ok;
  const mismatch = server && server.ok && server.total > realUsers.length;

  return (
    <div className="p-4 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{isKm ? 'áž€áž¶ážšáž–áž¶ážšáž‘áž·áž“áŸ’áž“áž“áŸáž™áž¢áŸ’áž“áž€áž”áŸ’ážšáž¾ (Server áž‘áž›áŸ‹áž“áž¹áž„ áž§áž”áž€ážšážŽáŸ)' : 'User Data Safety (Server vs Device)'}</span>
          </h4>
          <p className="text-[11px] text-stone-500 mt-0.5">
            {isKm
              ? 'ážšáž€ážƒáž¾áž‰áž”áž‰áŸ’áž áž¶áž˜áž»áž“áž–áŸáž›áž‘áž·áž“áŸ’áž“áž“áŸáž™áž”áž¶ážáŸ‹ â€¢ Outbox áž’áž¶áž“áž¶ážáž¶áž‚ážŽáž“áž¸ážáŸ’áž˜áž¸áž˜áž·áž“áž”áž¶ážáŸ‹áž–áŸáž› Server ážŠáž¶áž…áŸ‹'
              : 'Detects problems before data is lost â€¢ Outbox guarantees new accounts survive server outages'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={runCheck}
            className="px-3 py-2 rounded-xl bg-[#064E3B] hover:bg-emerald-900 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
            <span>{isKm ? 'áž–áž·áž“áž·ážáŸ’áž™ Server áž¥áž¡áž¼ážœáž“áŸáŸ‡' : 'Check server now'}</span>
          </button>
          {syncUsersNow && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await syncUsersNow();
                } finally {
                  setBusy(false);
                  setLogVersion((v) => v + 1);
                }
              }}
              className="px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-emerald-600 text-emerald-700 dark:text-emerald-300 text-xs font-bold cursor-pointer"
            >
              {isKm ? 'Sync' : 'Sync'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-900">
          <div className="text-lg font-black text-stone-900 dark:text-white">{realUsers.length}</div>
          <div className="text-[10px] text-stone-500">{isKm ? 'áž§áž”áž€ážšážŽáŸáž“áŸáŸ‡' : 'This device'}</div>
        </div>
        <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-900">
          <div className="text-lg font-black text-stone-900 dark:text-white flex items-center justify-center gap-1">
            <Server className="w-3.5 h-3.5 text-sky-600" />
            {server ? (server.ok ? server.total : 'â€”') : '?'}
          </div>
          <div className="text-[10px] text-stone-500">{isKm ? 'Server áž€ážŽáŸ’ážáž¶áž›' : 'Central server'}</div>
        </div>
        <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-900">
          <div className="text-lg font-black text-amber-600">
            {localVip}
            {server && server.ok ? ` / ${server.vipActive}` : ''}
          </div>
          <div className="text-[10px] text-stone-500">{isKm ? 'VIP (áž§áž”áž€ážšážŽáŸ/Server)' : 'VIP (device/server)'}</div>
        </div>
        <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-900">
          <div className={`text-lg font-black ${outbox > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{outbox}</div>
          <div className="text-[10px] text-stone-500">{isKm ? 'ážšáž„áŸ‹áž…áž¶áŸ†áž•áŸ’áž‰áž¾ (Outbox)' : 'Pending uploads'}</div>
        </div>
      </div>

      {serverBlocked && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-xs text-rose-900 dark:text-rose-200 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <b>{isKm ? 'áž˜áž¼áž›ážŠáŸ’áž‹áž¶áž“áž‘áž·áž“áŸ’áž“áž“áŸáž™áž€ážŽáŸ’ážáž¶áž›áž˜áž·áž“ážŠáŸ†ážŽáž¾ážšáž€áž¶ážšáŸ–' : 'Central database is not serving requests:'}</b> {server?.error || `HTTP ${server?.status}`}
            <div className="mt-1">
              {isKm
                ? 'áž€áŸ’áž“áž»áž„áž¢áŸ†áž¡áž»áž„áž–áŸáž›áž“áŸáŸ‡ áž‚ážŽáž“áž¸ážáŸ’áž˜áž¸/VIP ážáŸ’ážšáž¼ážœáž”áž¶áž“ážšáž€áŸ’ážŸáž¶áž€áŸ’áž“áž»áž„ Outbox áž áž¾áž™áž“áž¹áž„áž•áŸ’áž‰áž¾ážŠáŸ„áž™ážŸáŸ’ážœáŸáž™áž”áŸ’ážšážœážáŸ’ážáž·áž–áŸáž› Server ážáŸ’ážšáž¡áž”áŸ‹áž˜áž€ážœáž·áž‰áŸ” ážŸáž¼áž˜ážŠáŸ†áž¡áž¾áž„ Supabase Plan áž¬áž”áž·áž‘ Spend CapáŸ”'
                : 'New accounts/VIP changes are held in the outbox and delivered automatically when the server recovers. Upgrade the Supabase plan or lift the spend cap.'}
            </div>
          </div>
        </div>
      )}
      {mismatch && (
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-xs text-amber-900 dark:text-amber-200 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {isKm
              ? `Server áž˜áž¶áž“áž¢áŸ’áž“áž€áž”áŸ’ážšáž¾ ${server?.total} áž”áŸ‰áž»áž“áŸ’ážáŸ‚áž§áž”áž€ážšážŽáŸáž“áŸáŸ‡áž”áž„áŸ’áž áž¶áž‰ ${realUsers.length}áŸ” áž…áž»áž… Sync ážŠáž¾áž˜áŸ’áž”áž¸áž‘áž¶áž‰áž™áž€áž‘áž¶áŸ†áž„áž¢ážŸáŸ‹ (áž”áŸ’ážšáž–áŸáž“áŸ’áž’áž˜áž·áž“ážŸážšážŸáŸážšáž‡áž¶áž“áŸ‹ Server áž‘áŸ)áŸ”`
              : `Server has ${server?.total} users but this device shows ${realUsers.length}. Press Sync to pull them all (the app will not overwrite the server).`}
          </span>
        </div>
      )}
      {server && server.ok && !mismatch && (
        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-xs text-emerald-900 dark:text-emerald-200 flex gap-2 items-center">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{isKm ? 'áž§áž”áž€ážšážŽáŸ áž“áž·áž„ Server ážáŸ’ážšáž¼ážœáž‚áŸ’áž“áž¶' : 'Device and server are in agreement'}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-[11px] text-stone-600 dark:text-stone-300">
        <span>
          {isKm ? 'áž€áŸ†ážŽážáŸ‹ážáŸ’ážšáž¶ážáŸ’áž–ážŸáŸ‹áž”áŸ†áž•áž»ážáŸ–' : 'Confirmed high-water:'} <b>{highWater.count}</b> ({highWater.vipCount} VIP)
        </span>
        {outbox > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={retryOutbox}
            className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <Send className="w-3 h-3" />
            {isKm ? 'áž•áŸ’áž‰áž¾ Outbox áž¥áž¡áž¼ážœáž“áŸáŸ‡' : 'Retry outbox now'}
          </button>
        )}
      </div>

      {audit.length > 0 && (
        <div className="text-[11px] space-y-0.5">
          <div className="font-bold text-stone-700 dark:text-stone-200">{isKm ? 'áž”áŸ’ážšážœážáŸ’ážáž· Update (áž˜áž»áž“ â†’ áž€áŸ’ážšáŸ„áž™)' : 'Update history (before â†’ after)'}</div>
          {audit.map((a, i) => (
            <div key={i} className={a.usersAfter < a.usersBefore || a.vipAfter < a.vipBefore ? 'text-rose-600 font-bold' : 'text-stone-600 dark:text-stone-300'}>
              {String(a.from)} â†’ {String(a.to)}: users {a.usersBefore}â†’{a.usersAfter}, VIP {a.vipBefore}â†’{a.vipAfter}
            </div>
          ))}
        </div>
      )}

      <div className="text-[11px] space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-bold text-stone-700 dark:text-stone-200">{isKm ? 'áž€áŸ†ážŽážáŸ‹áž áŸážáž» Integrity' : 'Integrity log'}</span>
          {log.length > 0 && (
            <button
              type="button"
              onClick={() => {
                clearIntegrityLog();
                setLogVersion((v) => v + 1);
              }}
              className="text-stone-400 hover:text-rose-600 inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              {isKm ? 'ážŸáž˜áŸ’áž¢áž¶áž' : 'Clear'}
            </button>
          )}
        </div>
        {log.length === 0 ? (
          <div className="text-stone-400">{isKm ? 'áž‚áŸ’áž˜áž¶áž“áž”áž‰áŸ’áž áž¶' : 'No events'}</div>
        ) : (
          log.map((e, i) => (
            <div
              key={i}
              className={`px-2 py-1 rounded-lg ${
                e.level === 'critical'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200'
                  : e.level === 'warn'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200'
                  : 'bg-stone-50 dark:bg-stone-900 text-stone-600 dark:text-stone-300'
              }`}
            >
              <span className="font-mono">{e.at.slice(5, 19).replace('T', ' ')}</span> <b>{e.code}</b> â€” {e.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
