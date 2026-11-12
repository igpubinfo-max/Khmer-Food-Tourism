import React, { useCallback, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Send, Server, ShieldCheck, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { tr } from '../../utils/i18n';
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
          tr(
            language,
            `⚠️ មិនអាចអានមូលដ្ឋានទិន្នន័យកណ្ដាលបាន (${res.error || res.status})`,
            `⚠️ Central database unreachable (${res.error || res.status})`,
            `⚠️ 无法连接中央数据库 (${res.error || res.status})`
          ),
          'error'
        );
      } else if (res.total > realUsers.length) {
        showToast(
          tr(
            language,
            `⚠️ Server មានអ្នកប្រើ ${res.total} ច្រើនជាងឧបករណ៍នេះ (${realUsers.length}) — សូមចុច Sync`,
            `⚠️ Server has ${res.total} users vs ${realUsers.length} on this device — press Sync`,
            `⚠️ 服务器有 ${res.total} 位用户，多于本设备 (${realUsers.length}) — 请点击同步`
          ),
          'info'
        );
      } else {
        showToast(
          tr(
            language,
            '✅ ទិន្នន័យអ្នកប្រើត្រូវគ្នា',
            '✅ User data consistent with server',
            '✅ 用户数据与服务器一致'
          ),
          'success'
        );
      }
    } finally {
      setLogVersion((v) => v + 1);
      setBusy(false);
    }
  }, [realUsers, currentUser?.id, showToast, language]);

  const retryOutbox = useCallback(async () => {
    setBusy(true);
    try {
      const r = await flushCloudOutbox(60);
      setOutbox(r.remaining);
      showToast(
        tr(
          language,
          `បានផ្ញើ ${r.flushed} • នៅសល់ ${r.remaining}`,
          `Delivered ${r.flushed} • ${r.remaining} remaining`,
          `已发送 ${r.flushed} 项 • 剩余 ${r.remaining} 项`
        ),
        r.remaining === 0 ? 'success' : 'info'
      );
    } finally {
      setBusy(false);
    }
  }, [showToast, language]);

  const serverBlocked = server && !server.ok;
  const mismatch = server && server.ok && server.total > realUsers.length;

  return (
    <div className="p-4 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              {tr(
                language,
                'ការពារទិន្នន័យអ្នកប្រើ (Server ទល់នឹង ឧបករណ៍)',
                'User Data Safety (Server vs Device)',
                '用户数据安全保护（服务器对比本设备）'
              )}
            </span>
          </h4>
          <p className="text-[11px] text-stone-500 mt-0.5">
            {tr(
              language,
              'រកឃើញបញ្ហាមុនពេលទិន្នន័យបាត់ • Outbox ធានាថាគណនីថ្មីមិនបាត់ពេល Server ដាច់',
              'Detects problems before data is lost • Outbox guarantees new accounts survive server outages',
              '在数据丢失前检测异常 • 发件箱确保服务器中断期间新账户不会丢失'
            )}
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
            <span>{tr(language, 'ពិនិត្យ Server ឥឡូវនេះ', 'Check server now', '立即检查服务器')}</span>
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
              {tr(language, 'ធ្វើសមកាលកម្ម', 'Sync', '同步')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-900">
          <div className="text-lg font-black text-stone-900 dark:text-white">{realUsers.length}</div>
          <div className="text-[10px] text-stone-500">{tr(language, 'ឧបករណ៍នេះ', 'This device', '本设备')}</div>
        </div>
        <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-900">
          <div className="text-lg font-black text-stone-900 dark:text-white flex items-center justify-center gap-1">
            <Server className="w-3.5 h-3.5 text-sky-600" />
            {server ? (server.ok ? server.total : '—') : '?'}
          </div>
          <div className="text-[10px] text-stone-500">{tr(language, 'Server កណ្ដាល', 'Central server', '中央服务器')}</div>
        </div>
        <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-900">
          <div className="text-lg font-black text-amber-600">
            {localVip}
            {server && server.ok ? ` / ${server.vipActive}` : ''}
          </div>
          <div className="text-[10px] text-stone-500">{tr(language, 'VIP (ឧបករណ៍/Server)', 'VIP (device/server)', 'VIP（本机/服务器）')}</div>
        </div>
        <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-900">
          <div className={`text-lg font-black ${outbox > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{outbox}</div>
          <div className="text-[10px] text-stone-500">{tr(language, 'រង់ចាំផ្ញើ (Outbox)', 'Pending uploads', '待上传队列')}</div>
        </div>
      </div>

      {serverBlocked && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-xs text-rose-900 dark:text-rose-200 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <b>
              {tr(
                language,
                'មូលដ្ឋានទិន្នន័យកណ្ដាលមិនដំណើរការ៖',
                'Central database is not serving requests:',
                '中央数据库未响应请求：'
              )}
            </b>{' '}
            {server?.error || `HTTP ${server?.status}`}
            <div className="mt-1">
              {tr(
                language,
                'ក្នុងអំឡុងពេលនេះ គណនីថ្មី/VIP ត្រូវបានរក្សាក្នុង Outbox ហើយនឹងផ្ញើដោយស្វ័យប្រវត្តិពេល Server ត្រឡប់មកវិញ។ សូមដំឡើង Supabase Plan ឬបិទ Spend Cap។',
                'New accounts/VIP changes are held in the outbox and delivered automatically when the server recovers. Upgrade the Supabase plan or lift the spend cap.',
                '在此期间，新账户与 VIP 变更已保存在发件箱中，待服务器恢复后将自动同步。请升级 Supabase 套餐或解除消费限额。'
              )}
            </div>
          </div>
        </div>
      )}
      {mismatch && (
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-xs text-amber-900 dark:text-amber-200 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {tr(
              language,
              `Server មានអ្នកប្រើ ${server?.total} ប៉ុន្តែឧបករណ៍នេះបង្ហាញ ${realUsers.length}។ ចុច Sync ដើម្បីទាញយកទាំងអស់ (ប្រព័ន្ធមិនសរសេរជាន់ Server ទេ)។`,
              `Server has ${server?.total} users but this device shows ${realUsers.length}. Press Sync to pull them all (the app will not overwrite the server).`,
              `服务器共有 ${server?.total} 位用户，但本设备仅显示 ${realUsers.length} 位。请点击同步拉取全部数据（应用不会覆盖服务器数据）。`
            )}
          </span>
        </div>
      )}
      {server && server.ok && !mismatch && (
        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-xs text-emerald-900 dark:text-emerald-200 flex gap-2 items-center">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{tr(language, 'ឧបករណ៍ និង Server ត្រូវគ្នា', 'Device and server are in agreement', '本设备与服务器数据完全一致')}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-[11px] text-stone-600 dark:text-stone-300">
        <span>
          {tr(language, 'កំណត់ត្រាខ្ពស់បំផុត៖', 'Confirmed high-water:', '历史最高记录：')} <b>{highWater.count}</b> ({highWater.vipCount} VIP)
        </span>
        {outbox > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={retryOutbox}
            className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <Send className="w-3 h-3" />
            {tr(language, 'ផ្ញើ Outbox ឥឡូវនេះ', 'Retry outbox now', '立即重试发件箱')}
          </button>
        )}
      </div>

      {audit.length > 0 && (
        <div className="text-[11px] space-y-0.5">
          <div className="font-bold text-stone-700 dark:text-stone-200">
            {tr(language, 'ប្រវត្តិ Update (មុន → ក្រោយ)', 'Update history (before → after)', '更新历史（更新前 → 更新后）')}
          </div>
          {audit.map((a, i) => (
            <div key={i} className={a.usersAfter < a.usersBefore || a.vipAfter < a.vipBefore ? 'text-rose-600 font-bold' : 'text-stone-600 dark:text-stone-300'}>
              {String(a.from)} → {String(a.to)}: users {a.usersBefore}→{a.usersAfter}, VIP {a.vipBefore}→{a.vipAfter}
            </div>
          ))}
        </div>
      )}

      <div className="text-[11px] space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-bold text-stone-700 dark:text-stone-200">
            {tr(language, 'កំណត់ហេតុ Integrity', 'Integrity log', '数据完整性日志')}
          </span>
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
              {tr(language, 'សម្អាត', 'Clear', '清空')}
            </button>
          )}
        </div>
        {log.length === 0 ? (
          <div className="text-stone-400">{tr(language, 'គ្មានបញ្ហា', 'No events', '暂无异常记录')}</div>
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
              <span className="font-mono">{e.at.slice(5, 19).replace('T', ' ')}</span> <b>{e.code}</b> — {e.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
};