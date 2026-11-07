import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileSpreadsheet, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { matchPayments, normalizeRows, parseCsv, type MatchResult, type PendingPayment } from '../../utils/statementMatch';

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
  const { language, transactions, verifyTransaction, showToast } = useApp();
  const isKm = language === 'km';
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rowCount, setRowCount] = useState(0);
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState(false);
  const [statementRows, setStatementRows] = useState<ReturnType<typeof normalizeRows> | null>(null);

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
        })),
    [transactions]
  );

  const rematch = (rows: ReturnType<typeof normalizeRows>) => setResults(matchPayments(pending, rows));

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
