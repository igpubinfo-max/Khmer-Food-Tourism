import React, { useMemo, useRef, useState } from 'react';
import { Camera, RefreshCw, Search, StopCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { hasApprovedShopPhoto, isGpipRegisteredRestaurant } from '../types';
import { isGoogleMapsConfigured } from '../services/supabaseService';
import {
  findReplacementShopsWithPhotos,
  findVerifiedPhotosForShops,
  getShopsMissingVerifiedPhoto,
  ShopPhotoFinderConfigError,
  ShopPhotoFinderProgress,
} from '../services/shopPhotoFinderService';

/**
 * Admin tool: automatically finds REAL shop photos on Google Places for shops that have no verified photo,
 * or replaces those shops with new real shops that do have photos. Every result is queued for Admin approval
 * in the "Shop Photo Replacement Requests" list below — nothing is published automatically.
 */
export const AdminShopPhotoFinderPanel: React.FC = () => {
  const { restaurants, language, showToast, queueShopPhotoCandidates } = useApp();
  const isKm = language === 'km';

  const [batchSize, setBatchSize] = useState<number>(25);
  const [running, setRunning] = useState<null | 'match' | 'replace'>(null);
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

  const apiReady = isGoogleMapsConfigured();

  const handleError = (err: any) => {
    const msg = err?.message || String(err);
    setErrorText(
      err instanceof ShopPhotoFinderConfigError
        ? isKm
          ? `⚠️ សូមដាក់ Google Maps API Key (Places API New) ក្នុង Admin → ការកំណត់ ជាមុនសិន។ (${msg})`
          : `⚠️ Please configure the Google Maps API key (Places API New) in Admin → Settings first. (${msg})`
        : msg
    );
  };

  const runFindExactPhotos = async () => {
    const targets = getShopsMissingVerifiedPhoto(restaurants, 'match').slice(0, batchSize);
    if (targets.length === 0) {
      showToast(isKm ? '✅ គ្មានហាងដែលខ្វះរូបភាពទៀតទេ' : '✅ No shops are missing photos', 'success');
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
        () => cancelRef.current
      );
      const { queuedPhotos } = queueShopPhotoCandidates(candidates, []);
      setSummary(
        isKm
          ? `🔍 បានពិនិត្យ ${targets.length} ហាង • រកឃើញរូបភាពត្រឹមត្រូវ ${queuedPhotos} ហាង (រង់ចាំ Admin អនុម័ត) • រកមិនឃើញ ${noMatch.length} ហាង${
              errors.length ? ` • កំហុស ${errors.length}` : ''
            }`
          : `🔍 Checked ${targets.length} shops • Found matching photos for ${queuedPhotos} (awaiting Admin approval) • No confident match for ${noMatch.length}${
              errors.length ? ` • ${errors.length} errors` : ''
            }`
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
      showToast(isKm ? '✅ គ្មានហាងដែលត្រូវជំនួសទៀតទេ' : '✅ No shops need replacing', 'success');
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
        isKm
          ? `🔄 រកឃើញហាងថ្មីដែលមានរូបភាពពិត ${addedShops} ហាង ដើម្បីជំនួសហាងគ្មានរូបភាព (រង់ចាំ Admin អនុម័ត) • មិនទាន់មានហាងជំនួស ${unreplaced.length}${
              errors.length ? ` • កំហុស ${errors.length}` : ''
            }`
          : `🔄 Found ${addedShops} new shops with real photos to replace photo-less shops (awaiting Admin approval) • ${unreplaced.length} not replaced yet${
              errors.length ? ` • ${errors.length} errors` : ''
            }`
      );
      if (errors.length) setErrorText(errors.slice(0, 3).join('\n'));
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
      <div className="flex items-center gap-2">
        <Camera className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
        <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-xs sm:text-sm">
          {isKm ? '📸 ស្វែងរករូបភាពហាងពិតពី Google Maps' : '📸 Google Places Shop Photo Finder'}
        </h4>
      </div>

      <p className="text-[11px] text-slate-600 dark:text-stone-300 leading-relaxed">
        {isKm
          ? 'ហាងដែលគ្មានរូបភាពត្រឹមត្រូវ មិនបង្ហាញក្នុងបញ្ជីហាងសាធារណៈទេ។ ប្រើឧបករណ៍ខាងក្រោមដើម្បីស្វែងរករូបភាពពិតរបស់ហាងដដែល (ឈ្មោះ + GPS ត្រូវគ្នា) ឬជំនួសដោយហាងថ្មីដែលមានរូបភាពពិត។ រូបភាពទាំងអស់ត្រូវរង់ចាំ Admin អនុម័តជាមុនសិន។'
          : 'Shops without a verified photo are hidden from the public Shop List. Use these tools to find the REAL photo of the same shop (name + GPS must match), or replace it with a new real shop that has a photo. Every photo waits for Admin approval before it is published.'}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-emerald-200 dark:border-emerald-800/60">
          <div className="text-base font-black text-emerald-700 dark:text-emerald-400">{stats.withPhoto}</div>
          <div className="text-[10px] text-slate-500">{isKm ? 'មានរូបភាព (បង្ហាញ)' : 'With photo (visible)'}</div>
        </div>
        <div className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-rose-200 dark:border-rose-800/60">
          <div className="text-base font-black text-rose-600 dark:text-rose-400">{stats.missingForReplace}</div>
          <div className="text-[10px] text-slate-500">{isKm ? 'គ្មានរូបភាព (លាក់)' : 'No photo (hidden)'}</div>
        </div>
        <div className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-amber-800/60">
          <div className="text-base font-black text-amber-600 dark:text-amber-400">{stats.pending}</div>
          <div className="text-[10px] text-slate-500">{isKm ? 'រង់ចាំអនុម័ត' : 'Pending review'}</div>
        </div>
        <div className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700">
          <select
            value={batchSize}
            disabled={Boolean(running)}
            onChange={(e) => setBatchSize(Number(e.target.value))}
            className="w-full bg-transparent text-sm font-black text-slate-800 dark:text-white text-center cursor-pointer"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <div className="text-[10px] text-slate-500">{isKm ? 'ចំនួនហាងក្នុងមួយដង' : 'Shops per run'}</div>
        </div>
      </div>

      {!apiReady && (
        <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            {isKm
              ? 'មិនទាន់មាន Google Maps API Key។ សូមបញ្ចូលក្នុង Admin → ការកំណត់ → Cloud & Google Maps (Places API New)។'
              : 'Google Maps API key is not set. Add it in Admin → Settings → Cloud & Google Maps (Places API New).'}
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          id="kft-admin-find-exact-shop-photos"
          disabled={Boolean(running) || !apiReady || stats.missingForMatch === 0}
          onClick={runFindExactPhotos}
          className="flex-1 px-3 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:cursor-not-allowed"
        >
          {running === 'match' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          <span>
            {isKm
              ? `១. ស្វែងរករូបភាពពិតរបស់ហាងដដែល (${stats.missingForMatch})`
              : `1. Find real photos of the same shops (${stats.missingForMatch})`}
          </span>
        </button>
        <button
          type="button"
          id="kft-admin-replace-photoless-shops"
          disabled={Boolean(running) || !apiReady || stats.missingForReplace === 0}
          onClick={runReplaceShops}
          className="flex-1 px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:cursor-not-allowed"
        >
          {running === 'replace' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>
            {isKm
              ? `២. ជំនួសដោយហាងថ្មីដែលមានរូបភាព (${stats.missingForReplace})`
              : `2. Replace with new shops that have photos (${stats.missingForReplace})`}
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
              {isKm ? 'បញ្ឈប់' : 'Stop'}
            </button>
          </div>
        </div>
      )}

      {summary && (
        <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-emerald-200 dark:border-emerald-800/60 text-[11px] text-slate-700 dark:text-stone-200 flex items-start gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            {summary}
            {stats.pending > 0 &&
              (isKm
                ? ' — សូមពិនិត្យ និងអនុម័តរូបភាពនៅក្នុងបញ្ជី «សំណើប្តូររូបភាពហាងថ្មី» ខាងក្រោម។'
                : ' — Review and approve them in the "Shop Photo Replacement Requests" list below.')}
          </span>
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
