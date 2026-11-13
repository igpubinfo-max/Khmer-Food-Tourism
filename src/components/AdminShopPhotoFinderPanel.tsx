import React, { useMemo, useRef, useState } from 'react';
import { Camera, RefreshCw, Search, StopCircle, CheckCircle2, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { hasApprovedShopPhoto, isGpipRegisteredRestaurant } from '../types';
import {
  findReplacementShopsWithPhotos,
  findVerifiedPhotosForShops,
  getShopsMissingVerifiedPhoto,
  ShopPhotoFinderProgress,
} from '../services/shopPhotoFinderService';
import { batchAutoFetchMissingShopPhotos } from '../services/shopGooglePhotoService';
import { tr } from '../utils/i18n';

/**
 * Admin tool: automatically finds REAL shop photos on Google Places / Cambodia Verified Directory
 * for shops that have no verified photo, or replaces those shops with new real shops that have photos.
 * Every result is queued for Admin approval in the "Shop Photo Replacement Requests" list below.
 */
export const AdminShopPhotoFinderPanel: React.FC = () => {
  const {
    restaurants,
    updateRestaurant,
    language,
    showToast,
    queueShopPhotoCandidates,
    approveAllPendingShopPhotoReplacements,
  } = useApp();
  const isKm = language === 'km';

  const [batchSize, setBatchSize] = useState<number>(25);
  const [running, setRunning] = useState<null | 'match' | 'replace' | 'auto_apply'>(null);
  const [progress, setProgress] = useState<ShopPhotoFinderProgress | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [errorText, setErrorText] = useState<string>('');
  const cancelRef = useRef(false);

  const stats = useMemo(() => {
    let withPhoto = 0;
    let pending = 0;
    for (const r of restaurants) {
      if (r.status === 'rejected') continue;
      if (hasApprovedShopPhoto(r) || isGpipRegisteredRestaurant(r)) withPhoto++;
      if (r.pendingPhotoReplacement?.status === 'pending') pending++;
    }
    return {
      withPhoto,
      pending,
      missingForMatch: getShopsMissingVerifiedPhoto(restaurants, 'match').length,
      missingForReplace: getShopsMissingVerifiedPhoto(restaurants, 'replace').length,
    };
  }, [restaurants]);

  const handleError = (err: any) => {
    const msg = err?.message || String(err);
    setErrorText(msg);
  };

  const runFindExactPhotos = async () => {
    const targets = getShopsMissingVerifiedPhoto(restaurants, 'match').slice(0, batchSize);
    if (targets.length === 0) {
      showToast(tr(language, '✅ គ្មានហាងដែលខ្វះរូបភាពទៀតទេ', '✅ No shops are missing photos', '✅ 没有缺少照片的店铺'), 'success');
      return;
    }
    cancelRef.current = false;
    setRunning('match');
    setSummary('');
    setErrorText('');
    try {
      const { candidates, noMatch, errors } = await findVerifiedPhotosForShops(
        targets,
        setProgress,
        () => cancelRef.current,
        restaurants
      );
      const { queuedPhotos } = queueShopPhotoCandidates(candidates, []);
      setSummary(
        tr(language, `🔍 បានពិនិត្យ ${targets.length} ហាង • រកឃើញរូបភាពត្រឹមត្រូវ ${queuedPhotos} ហាង (រង់ចាំ Admin អនុម័ត) • រកមិនឃើញ ${noMatch.length} ហាង${
              errors.length ? ` • កំហុស ${errors.length}` : ''
            }`, `🔍 Checked ${targets.length} shops • Found matching photos for ${queuedPhotos} (awaiting Admin approval) • No confident match for ${noMatch.length}${
              errors.length ? ` • ${errors.length} errors` : ''
            }`, `🔍 已检查 ${targets.length} 家店铺 • 为 ${queuedPhotos} 家找到匹配照片（等待管理员审批） • ${noMatch.length} 家无高可信匹配${
              errors.length ? ` • ${errors.length} errors` : ''
            }`)
      );
      if (errors.length) setErrorText(errors.slice(0, 3).join('\n'));
    } catch (err) {
      handleError(err);
    } finally {
      setRunning(null);
      setProgress(null);
    }
  };

  const runReplaceShops = async () => {
    const targets = getShopsMissingVerifiedPhoto(restaurants, 'replace').slice(0, batchSize);
    if (targets.length === 0) {
      showToast(tr(language, '✅ គ្មានហាងដែលត្រូវជំនួសទៀតទេ', '✅ No shops need replacing', '✅ 没有需要替换的店铺'), 'success');
      return;
    }
    cancelRef.current = false;
    setRunning('replace');
    setSummary('');
    setErrorText('');
    try {
      const { newShops, unreplaced, errors } = await findReplacementShopsWithPhotos(
        targets,
        restaurants,
        setProgress,
        () => cancelRef.current
      );
      const { addedShops } = queueShopPhotoCandidates([], newShops);
      setSummary(
        tr(language, `🔄 រកឃើញហាងថ្មីដែលមានរូបភាពពិត ${addedShops} ហាង ដើម្បីជំនួសហាងគ្មានរូបភាព (រង់ចាំ Admin អនុម័ត) • មិនទាន់មានហាងជំនួស ${unreplaced.length}${
              errors.length ? ` • កំហុស ${errors.length}` : ''
            }`, `🔄 Found ${addedShops} new shops with real photos to replace photo-less shops (awaiting Admin approval) • ${unreplaced.length} not replaced yet${
              errors.length ? ` • ${errors.length} errors` : ''
            }`, `🔄 已找到 ${addedShops} 家带有真实照片的新店铺以替换无照片店铺（等待管理员审批） • 尚有 ${unreplaced.length} 家未被替换${
              errors.length ? ` • ${errors.length} errors` : ''
            }`)
      );
      if (errors.length) setErrorText(errors.slice(0, 3).join('\n'));
    } catch (err) {
      handleError(err);
    } finally {
      setRunning(null);
      setProgress(null);
    }
  };

  const runAutoFetchAndApplyPhotos = async () => {
    const targets = getShopsMissingVerifiedPhoto(restaurants, 'match').slice(0, batchSize);
    if (targets.length === 0) {
      showToast(tr(language, 'គ្មានហាងដែលខ្វះរូបភាពទៀតទេ', 'No shops are missing photos', '没有缺少照片的店铺'), 'success');
      return;
    }
    cancelRef.current = false;
    setRunning('auto_apply');
    setSummary('');
    setErrorText('');
    try {
      const res = await batchAutoFetchMissingShopPhotos(
        targets,
        restaurants,
        (prog) => setProgress({ done: prog.processed, total: prog.total, currentName: prog.currentName }),
        (updatedShop) => {
          updateRestaurant(updatedShop);
        },
        () => cancelRef.current
      );
      setSummary(
        tr(language, `បានទាញយក និងដាក់បង្ហាញរូបភាពពី Google Maps ដោយស្វ័យប្រវត្តិសម្រាប់ ${res.matched}/${res.processed} ហាង (ប្រើ Icon លំនាំដើមសម្រាប់ ${res.skippedCount} ហាងដែលមិនមានរូបត្រូវគ្នា)`, `Auto-fetched and applied Google Maps photos for ${res.matched}/${res.processed} shops (${res.skippedCount} kept default placeholder icon)`, `已为 ${res.matched}/${res.processed} 家店铺自动获取并应用 Google Maps 照片（${res.skippedCount} 家保留默认占位图标）`)
      );
    } catch (err) {
      handleError(err);
    } finally {
      setRunning(null);
      setProgress(null);
    }
  };

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div
      id="kft-admin-shop-photo-finder"
      className="p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-700/60 space-y-3 font-khmer"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-xs sm:text-sm">
            {tr(language, '📸 ស្វែងរករូបភាពហាងពិតពី Google Maps & Cambodia Directory', '📸 Google Places & Cambodia Shop Photo Finder', '📸 Google Places 与柬埔寨店铺照片查找器')}
          </h4>
        </div>
        {stats.pending > 0 && (
          <button
            type="button"
            id="kft-admin-approve-all-shop-photos-top"
            onClick={() => approveAllPendingShopPhotoReplacements()}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>
              {tr(language, `អនុម័តរូបភាពទាំងអស់ (${stats.pending})`, `Approve All (${stats.pending})`, `全部批准 (${stats.pending})`)}
            </span>
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-600 dark:text-stone-300 leading-relaxed">
        {tr(language, 'ប្រើឧបករណ៍ខាងក្រោមដើម្បីស្វែងរករូបភាពពិត និងម្ហូបប្រចាំហាងរបស់ហាងដដែល ឬជំនួសដោយហាងថ្មីដែលមានរូបភាពពិត។ រូបភាពទាំងអស់ត្រូវរង់ចាំ Admin អនុម័តជាមុនសិន។', 'Use these tools to find verified photos & signature dish photos for existing shops, or replace photo-less shops with new verified shops. Every photo waits for Admin approval before publishing.', '使用这些工具为现有店铺查找已验证的照片和招牌菜照片，或用新的已验证店铺替换无照片店铺。所有照片在发布前均需等待管理员审批。')}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-emerald-200 dark:border-emerald-800/60">
          <div className="text-base font-black text-emerald-700 dark:text-emerald-400">{stats.withPhoto}</div>
          <div className="text-[10px] text-slate-500">{tr(language, 'មានរូបភាព (បង្ហាញ)', 'With photo (visible)', '有照片（显示）')}</div>
        </div>
        <div className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-rose-200 dark:border-rose-800/60">
          <div className="text-base font-black text-rose-600 dark:text-rose-400">{stats.missingForReplace}</div>
          <div className="text-[10px] text-slate-500">{tr(language, 'គ្មានរូបភាព (លាក់)', 'No photo (hidden)', '无照片（隐藏）')}</div>
        </div>
        <div className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-800/60">
          <div className="text-base font-black text-amber-600 dark:text-amber-400">{stats.pending}</div>
          <div className="text-[10px] text-slate-500">{tr(language, 'រង់ចាំអនុម័ត', 'Pending review', '等待审核')}</div>
        </div>
        <div className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700">
          <select
            value={batchSize}
            disabled={Boolean(running)}
            onChange={(e) => setBatchSize(Number(e.target.value))}
            className="w-full bg-transparent text-sm font-black text-slate-800 dark:text-white text-center cursor-pointer"
          >
            {[10, 25, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <div className="text-[10px] text-slate-500">{tr(language, 'ចំនួនហាងក្នុងមួយដង', 'Shops per run', '每次处理店铺数量')}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          id="kft-admin-auto-apply-shop-photos"
          disabled={Boolean(running) || stats.missingForMatch === 0}
          onClick={runAutoFetchAndApplyPhotos}
          className="flex-1 px-3 py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] disabled:opacity-50 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:cursor-not-allowed"
        >
          {running === 'auto_apply' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          <span>
            {tr(language, `ទាញរូបពី Google Maps ស្វ័យប្រវត្តិ (${stats.missingForMatch})`, `Auto-Fetch Google Maps Photos (${stats.missingForMatch})`, `自动获取 Google Maps 照片 (${stats.missingForMatch})`)}
          </span>
        </button>
        <button
          type="button"
          id="kft-admin-find-exact-shop-photos"
          disabled={Boolean(running) || stats.missingForMatch === 0}
          onClick={runFindExactPhotos}
          className="flex-1 px-3 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:cursor-not-allowed"
        >
          {running === 'match' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          <span>
            {tr(language, `១. ស្វែងរករូបភាពពិតរបស់ហាងដដែល (${stats.missingForMatch})`, `1. Find real photos of the same shops (${stats.missingForMatch})`, `1. 查找相同店铺的真实照片 (${stats.missingForMatch})`)}
          </span>
        </button>
        <button
          type="button"
          id="kft-admin-replace-photoless-shops"
          disabled={Boolean(running) || stats.missingForReplace === 0}
          onClick={runReplaceShops}
          className="flex-1 px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:cursor-not-allowed"
        >
          {running === 'replace' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>
            {tr(language, `២. ជំនួសដោយហាងថ្មីដែលមានរូបភាព (${stats.missingForReplace})`, `2. Replace with new shops that have photos (${stats.missingForReplace})`, `2. 用带有照片的新店铺替换 (${stats.missingForReplace})`)}
          </span>
        </button>
      </div>

      {running && progress && (
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-emerald-100 dark:bg-stone-800 overflow-hidden">
            <div className="h-full bg-emerald-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-stone-300">
            <span className="truncate">
              {progress.done}/{progress.total} {progress.currentName ? `• ${progress.currentName}` : ''}
            </span>
            <button
              type="button"
              onClick={() => {
                cancelRef.current = true;
              }}
              className="px-2 py-0.5 rounded-lg bg-rose-600 text-white font-bold flex items-center gap-1 cursor-pointer"
            >
              <StopCircle className="w-3 h-3" />
              {tr(language, 'បញ្ឈប់', 'Stop', '停止')}
            </button>
          </div>
        </div>
      )}

      {summary && (
        <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-emerald-200 dark:border-emerald-800/60 text-[11px] text-slate-700 dark:text-stone-200 flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              {summary}
              {stats.pending > 0 &&
                (tr(language, ' — សូមពិនិត្យ និងអនុម័តរូបភាពនៅក្នុងបញ្ជី «សំណើប្តូររូបភាពហាងថ្មី» ខាងក្រោម ឬចុច «អនុម័តរូបភាពទាំងអស់»។', ' — Review and approve them in the "Shop Photo Replacement Requests" list below or click "Approve All".', ' — 请在下方的“店铺照片更换申请”列表中查看并批准它们，或点击“全部批准”。'))}
            </span>
          </div>
          {stats.pending > 0 && (
            <button
              type="button"
              onClick={() => approveAllPendingShopPhotoReplacements()}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition cursor-pointer shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {tr(language, `✅ អនុម័តរូបភាពទាំងអស់ (${stats.pending})`, `✅ Approve All (${stats.pending})`, `✅ 全部批准 (${stats.pending})`)}
              </span>
            </button>
          )}
        </div>
      )}

      {errorText && (
        <pre className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-[10px] text-rose-700 dark:text-rose-300 whitespace-pre-wrap font-khmer">
          {errorText}
        </pre>
      )}
    </div>
  );
};
