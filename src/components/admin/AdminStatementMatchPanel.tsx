import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, Database, FileSpreadsheet, History, Lock, RefreshCw, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { resolveOfficialPlanById } from '../../types';
import { matchPayments, normalizeRows, normalizeTrxKey, parseCsv, type MatchResult, type PendingPayment } from '../../utils/statementMatch';

/**
 * Admin helper: upload the statement exported from the ABA account (CSV or Excel) and see which PENDING payments are really
 * in it (Trx ID + incoming amount). The admin then approves one by one or all matched at once. The file is read on this
 * device only; nothing is uploaded. The admin remains the one who approves.
 */
async function readStatementFile(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const rows: string[][] = [];
    wb.eachSheet((ws) => {
      ws.eachRow({ includeEmpty: false }, (row) => {
        const cells: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          const v = cell.value as unknown;
          if (v === null || v === undefined) cells.push('');
          else if (typeof v === 'object' && v !== null && 'result' in (v as Record<string, unknown>)) cells.push(String((v as { result: unknown }).result ?? ''));
          else if (v instanceof Date) cells.push(v.toISOString());
          else if (typeof v === 'object' && v !== null && 'text' in (v as Record<string, unknown>)) cells.push(String((v as { text: unknown }).text ?? ''));
          else cells.push(String(v));
        });
        rows.push(cells);
      });
    });
    return rows;
  }
  if (name.endsWith('.csv') || name.endsWith('.txt') || file.type.startsWith('text/')) {
    return parseCsv(await file.text());
  }
  throw new Error('UNSUPPORTED');
}

export const AdminStatementMatchPanel: React.FC = () => {
  const { language, transactions, verifyTransaction, showToast, centralizedUsedTrxRecords = [], centralizedPaymentAuditLogs = [], refreshCentralizedPaymentRegistry } = useApp();
  const isKm = language === 'km';
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rowCount, setRowCount] = useState(0);
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState(false);
  const [statementRows, setStatementRows] = useState<ReturnType<typeof normalizeRows> | null>(null);
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);

  const usedTrxKeysSet = useMemo(() => {
    const set = new Set<string>();
    for (const r of centralizedUsedTrxRecords) {
      const k = normalizeTrxKey(r.trx_key || r.raw_trx_id);
      if (k) set.add(k);
    }
    for (const t of transactions) {
      if (t.status === 'verified') {
        const k1 = normalizeTrxKey(t.transactionRef);
        const k2 = normalizeTrxKey(t.aiVerificationReport?.extractedReceipt?.trxId);
        if (k1) set.add(k1);
        if (k2) set.add(k2);
      }
    }
    return set;
  }, [centralizedUsedTrxRecords, transactions]);

  const pending = useMemo<PendingPayment[]>(
    () =>
      transactions
        .filter((t) => t.status === 'pending_verification' || t.status === 'needs_more_info')
        .map((t) => ({
          id: t.id,
          userName: t.userName || t.ownerName,
          userEmail: t.userEmail,
          trxId: String(t.aiVerificationReport?.extractedReceipt?.trxId || t.transactionRef || ''),
          amountUsd: Number(t.amountUsd) || 0,
          planId: t.planId,
          planLabel: (() => {
            const resolved = t.planId ? resolveOfficialPlanById(t.planId) : null;
            if (resolved) return isKm ? resolved.titleKm : resolved.titleEn;
            if (t.type === 'restaurant_registration') return isKm ? `កញ្ចប់ហាង (${t.durationDays || 30} ថ្ងៃ)` : `Shop Plan (${t.durationDays || 30}d)`;
            return isKm ? `Consumer VIP (${t.durationDays || 30} ថ្ងៃ)` : `Consumer VIP (${t.durationDays || 30}d)`;
          })(),
          shopId: t.shopId || t.restaurantId,
          shopName: t.restaurantNameKh,
          isShopPlan: Boolean((t.planId && String(t.planId).startsWith('shop_')) || t.type === 'restaurant_registration'),
          paymentStatus: t.aiVerificationReport?.extractedReceipt?.paymentStatus,
          isModifiedOrFake: Boolean(t.aiVerificationReport?.extractedReceipt?.isModifiedOrFake),
        })),
    [transactions, isKm]
  );

  const rematch = (rows: ReturnType<typeof normalizeRows>) => setResults(matchPayments(pending, rows, usedTrxKeysSet));

  // Payments whose AI pre-check passed EVERY check (recipient, amount, date, Trx ID, not a duplicate).
  // This is the "lazy" shortcut: no bank-statement check - see the warning in the confirmation dialog.
  const aiPassed = useMemo(
    () =>
      transactions.filter((t) => {
        if (t.status !== 'pending_verification') return false;
        const r = t.aiVerificationReport;
        if (!r || r.status === 'rejected_mismatch') return false;
        if (r.extractedReceipt?.isModifiedOrFake) return false;
        const c = r.checks;
        if (!Boolean(c && c.recipient?.passed && c.amount?.passed && c.date?.passed && c.trxId?.passed && c.antiReplay?.passed)) return false;
        const k = normalizeTrxKey(r.extractedReceipt?.trxId || t.transactionRef);
        if (!k || usedTrxKeysSet.has(k)) return false;
        return true;
      }),
    [transactions, usedTrxKeysSet]
  );
  const aiPassedTotal = aiPassed.reduce((sum, t) => sum + (Number(t.amountUsd) || 0), 0);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const raw = await readStatementFile(file);
      const rows = normalizeRows(raw);
      setFileName(file.name);
      setRowCount(rows.length);
      setStatementRows(rows);
      rematch(rows);
    } catch (e) {
      const unsupported = (e as Error)?.message === 'UNSUPPORTED';
      showToast(
        unsupported
          ? isKm ? 'ប្រភេទឯកសារមិនគាំទ្រ។ សូមប្រើ CSV ឬ Excel (.xlsx)' : 'Unsupported file. Use CSV or Excel (.xlsx).'
          : isKm ? 'មិនអាចអានឯកសារ statement បានទេ' : 'Could not read the statement file.',
        'warning'
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const matched = (results || []).filter((r) => r.status === 'matched');

  const approveOne = (r: MatchResult) => {
    verifyTransaction(r.payment.id);
  };

  const approveAllMatched = async () => {
    if (matched.length === 0) return;
    const ok = window.confirm(
      isKm
        ? `អនុម័ត ${matched.length} ការទូទាត់ដែលត្រូវគ្នានឹង statement? (ពិនិត្យម្តងទៀតមុនបញ្ជាក់)`
        : `Approve ${matched.length} payment(s) that match your statement? (Double-check before confirming)`
    );
    if (!ok) return;
    setApproving(true);
    try {
      for (const r of matched) {
        verifyTransaction(r.payment.id);
        await new Promise((res) => setTimeout(res, 700)); // let each approval settle before the next one
      }
      showToast(isKm ? `✅ បានអនុម័ត ${matched.length} ការទូទាត់` : `✅ Approved ${matched.length} payment(s)`, 'success');
    } finally {
      setApproving(false);
    }
  };

  const approveAllAiPassed = async () => {
    if (aiPassed.length === 0) return;
    const ok = window.confirm(
      isKm
        ? `⚠️ អនុម័ត ${aiPassed.length} ការទូទាត់ (សរុប $${aiPassedTotal.toFixed(2)}) ដោយ មិនបានផ្ទៀងផ្ទាត់ជាមួយ statement ធនាគារ?\n\nមានតែការពិនិត្យរូបភាពដោយ AI ប៉ុណ្ណោះ។ វិក្កយបត្រក្លែងដែលមើលទៅត្រឹមត្រូវអាចបានជាប់។ អ្នកទទួលខុសត្រូវលើការអនុម័តនេះ។`
        : `⚠️ Approve ${aiPassed.length} payment(s) (total $${aiPassedTotal.toFixed(2)}) WITHOUT checking your bank statement?\n\nOnly the AI image check was done. A well-forged receipt could pass it. You take responsibility for this approval.`
    );
    if (!ok) return;
    setApproving(true);
    try {
      for (const t of aiPassed) {
        verifyTransaction(t.id);
        await new Promise((res) => setTimeout(res, 700));
      }
      showToast(isKm ? `✅ បានអនុម័ត ${aiPassed.length} ការទូទាត់ (មិនទាន់ផ្ទៀងផ្ទាត់ statement)` : `✅ Approved ${aiPassed.length} payment(s) (statement not checked)`, 'success');
    } finally {
      setApproving(false);
    }
  };

  // after an approval the pending list shrinks: refresh the table from the cached statement
  React.useEffect(() => {
    if (statementRows) rematch(statementRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending.length]);

  const label = (r: MatchResult): { text: string; cls: string } => {
    switch (r.status) {
      case 'matched': return { text: isKm ? '✅ ត្រូវគ្នា' : '✅ Matched', cls: 'bg-emerald-100 text-emerald-800' };
      case 'amount_mismatch': return { text: isKm ? '⚠️ ចំនួនខុស' : '⚠️ Amount differs', cls: 'bg-amber-100 text-amber-800' };
      case 'not_credit': return { text: isKm ? '⚠️ មិនមែនប្រាក់ចូល' : '⚠️ Not incoming', cls: 'bg-amber-100 text-amber-800' };
      case 'duplicate_trx': return { text: isKm ? '🚫 Trx ID ស្ទួន' : '🚫 Duplicate Trx ID', cls: 'bg-rose-100 text-rose-800' };
      case 'row_already_used': return { text: isKm ? '🚫 ជួរត្រូវបានប្រើ' : '🚫 Row already used', cls: 'bg-rose-100 text-rose-800' };
      case 'no_trx_id': return { text: isKm ? '❔ គ្មាន Trx ID' : '❔ No Trx ID', cls: 'bg-slate-100 text-slate-700' };
      default: return { text: isKm ? '❌ រកមិនឃើញ' : '❌ Not in statement', cls: 'bg-rose-100 text-rose-800' };
    }
  };

  return (
    <div className="mb-4 p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 space-y-3">
      <div className="flex items-start gap-2">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h4 className="font-khmer font-bold text-sm text-emerald-900 dark:text-emerald-200">
            {isKm ? 'ផ្គូផ្គងការទូទាត់ជាមួយ Statement ធនាគារ (ដោយ Admin អនុម័ត)' : 'Match payments with your bank statement (you approve)'}
          </h4>
          <p className="font-khmer text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
            {isKm
              ? 'ទាញយក statement ពីគណនី ABA (CSV ឬ Excel .xlsx) ហើយបញ្ចូលទីនេះ។ ឯកសារត្រូវបានអានលើឧបករណ៍នេះប៉ុណ្ណោះ មិនត្រូវបានផ្ញើទៅណាទេ។ ប្រព័ន្ធរក Trx ID + ចំនួនប្រាក់ចូល ហើយលោកអ្នកជាអ្នកចុចអនុម័ត។'
              : 'Export the statement from your ABA account (CSV or Excel .xlsx) and load it here. It is read on this device only - nothing is uploaded. We look for the Trx ID + incoming amount; you press Approve.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        <button
          type="button"
          disabled={busy || approving}
          onClick={() => fileRef.current?.click()}
          className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-khmer text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          {busy ? (isKm ? 'កំពុងអាន...' : 'Reading...') : isKm ? 'ជ្រើស Statement (CSV/Excel)' : 'Choose statement (CSV/Excel)'}
        </button>
        {true && (
          <button
            type="button"
            onClick={() => {
              setShowAuditDrawer((v) => !v);
              void refreshCentralizedPaymentRegistry?.();
            }}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-khmer text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Database className="w-4 h-4" />
            {isKm ? `បញ្ជី Trx (${usedTrxKeysSet.size}) & Audit Log` : `Used Trx (${usedTrxKeysSet.size}) & Audit Log`}
          </button>
        )}
        {fileName && (
          <span className="font-khmer text-[11px] text-stone-600 dark:text-stone-300 flex items-center gap-1">
            <FileSpreadsheet className="w-3.5 h-3.5" /> {fileName} · {rowCount} {isKm ? 'ជួរ' : 'rows'} · {pending.length} {isKm ? 'កំពុងរង់ចាំ' : 'pending'}
          </span>
        )}
        {matched.length > 0 && (
          <button
            type="button"
            disabled={approving}
            onClick={() => void approveAllMatched()}
            className="ml-auto px-3 py-2 rounded-xl bg-[#064E3B] hover:bg-emerald-900 text-white font-khmer text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            {approving ? (isKm ? 'កំពុងអនុម័ត...' : 'Approving...') : isKm ? `អនុម័តទាំងអស់ដែលត្រូវគ្នា (${matched.length})` : `Approve all matched (${matched.length})`}
          </button>
        )}
      </div>

      {showAuditDrawer && (
        <div className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="font-khmer font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <History className="w-4 h-4 text-emerald-600" />
              {isKm
                ? `Centralized Used ABA Transactions (${centralizedUsedTrxRecords.length}) & Payment Audit Log (${centralizedPaymentAuditLogs.length})`
                : `Centralized Used ABA Transactions (${centralizedUsedTrxRecords.length}) & Payment Audit Log (${centralizedPaymentAuditLogs.length})`}
            </div>
            <button
              type="button"
              onClick={() => void refreshCentralizedPaymentRegistry?.()}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-khmer text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
              <div className="font-khmer font-bold text-[11px] text-emerald-800 dark:text-emerald-300 sticky top-0 bg-white dark:bg-slate-900 pb-1">
                1. Permanently Locked ABA Transaction IDs (Single-Use)
              </div>
              {centralizedUsedTrxRecords.length === 0 ? (
                <div className="text-[11px] text-slate-500">No records yet</div>
              ) : (
                centralizedUsedTrxRecords.slice(0, 40).map((rec) => (
                  <div key={rec.trx_key} className="text-[10px] font-mono border-b border-slate-100 dark:border-slate-800 py-1 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">{rec.trx_key}</span>
                      <span className="text-slate-500"> · ${Number(rec.amount_usd || 0).toFixed(2)} · {rec.user_email || rec.user_id}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-[9px]">
                      <Lock className="w-2.5 h-2.5 inline mr-0.5" />LOCKED
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
              <div className="font-khmer font-bold text-[11px] text-indigo-800 dark:text-indigo-300 sticky top-0 bg-white dark:bg-slate-900 pb-1">
                2. Complete Payment Verification Audit Log
              </div>
              {centralizedPaymentAuditLogs.length === 0 ? (
                <div className="text-[11px] text-slate-500">No audit events yet</div>
              ) : (
                centralizedPaymentAuditLogs.slice(0, 40).map((ev) => (
                  <div key={ev.id} className="text-[10px] font-mono border-b border-slate-100 dark:border-slate-800 py-1">
                    <span className={`font-bold ${String(ev.event_type).includes('rejected') || String(ev.event_type).includes('blocked') ? 'text-rose-600' : 'text-indigo-600'}`}>
                      [{ev.event_type}]
                    </span>{' '}
                    <span>Trx: {ev.trx_key || '—'}</span> · <span>{ev.user_email || ev.user_id || '—'}</span> ·{' '}
                    <span className="text-slate-400">{String(ev.created_at || '').slice(0, 16).replace('T', ' ')}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {aiPassed.length > 0 && (
        <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1 font-khmer text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
            {isKm
              ? `⚡ ផ្លូវកាត់ (ខ្ជិល)៖ មាន ${aiPassed.length} ការទូទាត់ (សរុប $${aiPassedTotal.toFixed(2)}) ដែល AI ពិនិត្យជាប់ទាំងអស់ (អ្នកទទួល ចំនួន កាលបរិច្ឆេទ Trx ID មិនស្ទួន)។ ចុចម្តងអនុម័តទាំងអស់ — ប៉ុន្តែ មិនបានផ្ទៀងផ្ទាត់ statement វិក្កយបត្រក្លែងអាចជាប់។`
              : `⚡ Shortcut: ${aiPassed.length} payment(s) (total $${aiPassedTotal.toFixed(2)}) passed every AI check (recipient, amount, date, Trx ID, not a duplicate). One click approves them all - but your bank statement is NOT checked, so a forged receipt could pass.`}
          </div>
          <button
            type="button"
            disabled={approving}
            onClick={() => void approveAllAiPassed()}
            className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-khmer text-xs font-bold cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            {isKm ? 'អនុម័តទាំងអស់ (មិនពិនិត្យ statement)' : 'Approve all (no statement check)'}
          </button>
        </div>
      )}

      {results && results.length === 0 && (
        <p className="font-khmer text-xs text-stone-600 dark:text-stone-300">{isKm ? 'គ្មានការទូទាត់កំពុងរង់ចាំទេ។' : 'No pending payments to match.'}</p>
      )}

      {results && results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => {
            const l = label(r);
            return (
              <div key={r.payment.id} className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full font-khmer font-bold text-[10px] ${l.cls}`}>{l.text}</span>
                    <span className="font-mono text-[11px] font-bold">{r.payment.id}</span>
                    <span className="font-mono text-[11px] text-emerald-700 font-bold">${r.payment.amountUsd.toFixed(2)}</span>
                    <span className={`px-2 py-0.5 rounded-full font-khmer text-[10px] font-bold ${r.payment.isShopPlan ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200' : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200'}`}>
                      {r.payment.isShopPlan ? `🏪 ${r.payment.shopName || r.payment.planLabel || 'Shop'}` : `👑 ${r.payment.planLabel || 'VIP'}`}
                    </span>
                  </div>
                  <div className="font-khmer text-[11px] text-stone-600 dark:text-stone-300 truncate">
                    {r.payment.userName || r.payment.userEmail || '—'} · Trx ID: <span className="font-mono">{r.payment.trxId || '—'}</span>
                  </div>
                  <div className="font-khmer text-[10px] text-stone-500">
                    {r.detail}
                    {r.entry?.dateText ? ` · ${r.entry.dateText}` : ''}
                  </div>
                </div>
                {r.status === 'matched' ? (
                  <button
                    type="button"
                    disabled={approving}
                    onClick={() => approveOne(r)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-khmer text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> {isKm ? 'អនុម័ត' : 'Approve'}
                  </button>
                ) : (
                  <span className="text-stone-400 flex items-center gap-1 font-khmer text-[10px]">
                    <XCircle className="w-3.5 h-3.5" /> {isKm ? 'ត្រូវពិនិត្យដោយដៃ' : 'Check manually'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
