import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Lock, RefreshCw, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { tr } from '../utils/i18n';
import {
  CHECK_APP_UPDATE_EVENT,
  checkLiveAppUpdate,
  isUpdateSnoozed,
  snoozeUpdateAlert,
  subscribeToInstallState,
  triggerAutoAppUpdate,
  type AppUpdateStatus,
} from '../services/appUpdateService';

const MIN_AUTO_CHECK_COOLDOWN_MS = 5 * 60 * 1000; // 5-minute cooldown between automatic background checks

export const AppUpdateBanner: React.FC = () => {
  const { language, appSettings, currentUser, showToast } = useApp();
  const [updateStatus, setUpdateStatus] = useState<AppUpdateStatus | null>(null);
  const [visible, setVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [downloadProgressPct, setDownloadProgressPct] = useState<number | null>(null);
  const [adminTempDismissed, setAdminTempDismissed] = useState(false);
  const checkingRef = useRef(false);
  const lastAutoCheckAtRef = useRef(0);
  const latestContextRef = useRef({ appSettings, language, showToast });
  latestContextRef.current = { appSettings, language, showToast };

  const isAdminAccount =
    currentUser?.role === 'admin' ||
    currentUser?.id === 'admin-authorized-single' ||
    currentUser?.username === 'admin' ||
    currentUser?.username === 'cheasavuth';

  const runCheck = useCallback(async (isManual = false) => {
    if (checkingRef.current) return;
    if (!isManual && Date.now() - lastAutoCheckAtRef.current < MIN_AUTO_CHECK_COOLDOWN_MS) {
      return;
    }
    const { appSettings: curSettings, language: curLang, showToast: toastFn } = latestContextRef.current;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (isManual) {
        toastFn(
          tr(
            curLang,
            'សូមភ្ជាប់អ៊ីនធឺណិតដើម្បីពិនិត្យកំណែអាប់ដេតថ្មី',
            'Please connect to the internet to check for updates',
            '请连接网络以检查新版本'
          ),
          'info'
        );
      }
      return;
    }

    checkingRef.current = true;
    if (!isManual) {
      lastAutoCheckAtRef.current = Date.now();
    }
    try {
      const status = await checkLiveAppUpdate(curSettings);
      setUpdateStatus(status);

      if (status.hasUpdate) {
        if (
          isManual ||
          status.forceUpdate ||
          status.updateDownloaded ||
          !isUpdateSnoozed(status.latestBuildCode, status.latestVersion)
        ) {
          setVisible(true);
        } else {
          setVisible(false);
        }
      } else {
        setVisible(false);
        if (isManual) {
          toastFn(
            tr(
              curLang,
              `កម្មវិធីរបស់អ្នកជាកំណែចុងក្រោយបង្អស់រួចហើយ (${status.currentVersion} • Build ${status.currentBuildCode})`,
              `You are already on the latest version (${status.currentVersion} • Build ${status.currentBuildCode})`,
              `当前已是最新版本 (${status.currentVersion} • Build ${status.currentBuildCode})`
            ),
            'success'
          );
        }
      }
    } catch {
      // Silent fail on background network hiccups
    } finally {
      checkingRef.current = false;
    }
  }, []);

  // Initial check once on app startup + manual check trigger
  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      runCheck(false);
    }, 3500);

    const onManualEvent = (evt: Event) => {
      const custom = evt as CustomEvent<{ manual?: boolean }>;
      setAdminTempDismissed(false);
      runCheck(Boolean(custom?.detail?.manual ?? true));
    };

    window.addEventListener(CHECK_APP_UPDATE_EVENT, onManualEvent as EventListener);

    return () => {
      window.clearTimeout(initialTimer);
      window.removeEventListener(CHECK_APP_UPDATE_EVENT, onManualEvent as EventListener);
    };
  }, [runCheck]);

  // Re-evaluate immediately when Cloud Sync updates forceAppUpdate / latestAppBuildCode / minRequiredBuildCode / latestAppVersion
  useEffect(() => {
    setAdminTempDismissed(false);
    const syncTimer = window.setTimeout(() => {
      lastAutoCheckAtRef.current = 0;
      runCheck(false);
    }, 400);
    return () => window.clearTimeout(syncTimer);
  }, [
    appSettings?.forceAppUpdate,
    appSettings?.latestAppBuildCode,
    appSettings?.minRequiredBuildCode,
    appSettings?.latestAppVersion,
    runCheck,
  ]);

  // Listen to native Google Play In-App Update download progress
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    subscribeToInstallState((state) => {
      if (state.isDownloading && state.totalBytesToDownload > 0) {
        const pct = Math.min(99, Math.max(1, Math.round((state.bytesDownloaded / state.totalBytesToDownload) * 100)));
        setDownloadProgressPct(pct);
      } else if (state.isDownloaded || state.isInstalling) {
        setDownloadProgressPct(100);
      }
    }).then((unsub) => {
      unsubscribe = unsub;
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (!visible || !updateStatus || !updateStatus.hasUpdate) {
    return null;
  }

  const isBlockingForceUpdate = Boolean(updateStatus.forceUpdate) && !adminTempDismissed;

  const handleUpdateNow = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    if (!updateStatus.forceUpdate) {
      snoozeUpdateAlert(updateStatus.latestBuildCode, updateStatus.latestVersion);
      setVisible(false);
    }
    try {
      await triggerAutoAppUpdate(updateStatus.latestBuildCode, appSettings, updateStatus.latestVersion);
    } finally {
      window.setTimeout(() => {
        setIsUpdating(false);
      }, 2500);
    }
  };

  const handleSnooze = () => {
    if (updateStatus.forceUpdate) {
      if (isAdminAccount) {
        setAdminTempDismissed(true);
      }
      return;
    }
    snoozeUpdateAlert(updateStatus.latestBuildCode, updateStatus.latestVersion);
    setVisible(false);
  };

  const versionBadgeText =
    updateStatus.latestBuildCode > updateStatus.currentBuildCode
      ? `${updateStatus.latestVersion} • Build ${updateStatus.latestBuildCode}`
      : updateStatus.latestVersion;

  const customNote =
    language === 'km'
      ? updateStatus.releaseNotesKh
      : updateStatus.releaseNotesEn || updateStatus.releaseNotesKh;

  // Full-Screen Mandatory Force-Update Lock Modal (prevents using outdated app versions when forceUpdate / minRequiredBuildCode is active)
  if (isBlockingForceUpdate) {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-live="assertive"
        className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto font-khmer animate-in fade-in duration-200"
      >
        <div className="w-full max-w-md rounded-3xl bg-gradient-to-br from-[#064E3B] via-[#065F46] to-[#0F172A] border-2 border-amber-400 shadow-2xl p-6 text-white space-y-4">
          <div className="flex flex-col items-center text-center space-y-2.5">
            <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border-2 border-amber-300/60 flex items-center justify-center shadow-lg">
              <Lock className="w-8 h-8 text-amber-300" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-bold">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {tr(
                  language,
                  'តម្រូវឱ្យអាប់ដេតកម្មវិធីជាចាំបាច់',
                  'Mandatory App Update Required',
                  '需要强制更新应用'
                )}
              </span>
            </div>

            <h3 className="text-lg font-extrabold text-white leading-snug">
              {tr(
                language,
                'សូមអាប់ដេតទៅកាន់កំណែថ្មីដើម្បីបន្តប្រើប្រាស់',
                'Please Update to the Latest Version to Continue',
                '请更新至最新版本以继续使用'
              )}
            </h3>

            <div className="flex items-center justify-center flex-wrap gap-2 text-[11px] font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-black/35 border border-white/15 text-slate-300">
                {tr(language, 'កំណែបច្ចុប្បន្ន៖', 'Current:', '当前版本:')} {updateStatus.currentVersion} (Build {updateStatus.currentBuildCode})
              </span>
              <span className="text-amber-300 font-bold">→</span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-400/25 border border-amber-300/50 text-amber-200 font-bold">
                {tr(language, 'កំណែថ្មី៖', 'Latest:', '最新版本:')} {versionBadgeText}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/30 border border-emerald-400/25 text-xs text-emerald-50/95 leading-relaxed text-center">
            {customNote ||
              tr(
                language,
                'កំណែចាស់នេះលែងអាចប្រើប្រាស់បានទៀតហើយ ដោយសារកម្មវិធីបានដំឡើងប្រព័ន្ធសុវត្ថិភាព និងមុខងារថ្មី។ សូមចុច «អាប់ដេតឥឡូវនេះ» ដើម្បីទាញយកកំណែថ្មី (គណនី និងទិន្នន័យ VIP របស់អ្នកត្រូវបានរក្សាទុកដោយសុវត្ថិភាព ១០០%)។',
                'This older version is no longer supported due to important system and feature updates. Tap "Update Now" below to install the latest version (your account & VIP data remain 100% safe).',
                '由于系统与功能的重要升级，此旧版本已停止支持。请点击下方“立即更新”安装最新版本（您的账户与 VIP 数据 100% 安全保留）。'
              )}
          </div>

          {downloadProgressPct !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-amber-200 font-bold">
                <span>
                  {tr(language, 'កំពុងទាញយកកំណែថ្មី...', 'Downloading update...', '正在下载更新...')}
                </span>
                <span>{downloadProgressPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${downloadProgressPct}%` }}
                />
              </div>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleUpdateNow}
              disabled={isUpdating}
              className="w-full min-h-[48px] px-5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-xl active:scale-[0.98] transition cursor-pointer disabled:opacity-70"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>{tr(language, 'កំពុងបើកការអាប់ដេត...', 'Launching Update...', '正在启动更新...')}</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>
                    {updateStatus.updateDownloaded
                      ? tr(language, 'ដំឡើង & បើកឡើងវិញឥឡូវនេះ', 'Install & Restart Now', '立即安装并重启')
                      : tr(language, 'អាប់ដេតឥឡូវនេះ (Google Play / ផ្លូវការ)', 'Update Now (Official Store)', '立即更新（官方商店）')}
                  </span>
                </>
              )}
            </button>

            {isAdminAccount && (
              <button
                type="button"
                onClick={handleSnooze}
                className="w-full min-h-[38px] px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-emerald-100 text-xs font-semibold transition cursor-pointer"
              >
                {tr(
                  language,
                  '🛡️ ចូលផ្ទាំង Admin បណ្តោះអាសន្ន (សម្រាប់តែ Admin)',
                  '🛡️ Temporary Admin Bypass (Admin Only)',
                  '🛡️ 管理员临时进入后台（仅限管理员）'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed left-0 right-0 z-[110] px-3.5 pointer-events-none"
      style={{ bottom: 'calc(var(--kft-safe-bottom, 0px) + 74px)' }}
    >
      <div
        role="alertdialog"
        aria-live="polite"
        className="max-w-md mx-auto rounded-2xl bg-gradient-to-br from-[#064E3B] via-[#065F46] to-[#0F172A] border-2 border-amber-400/80 shadow-2xl p-3.5 text-white pointer-events-auto font-khmer animate-in slide-in-from-bottom-4 duration-200"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/50 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5 text-amber-300" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="font-extrabold text-sm text-amber-300">
                {tr(language, 'មានកំណែអាប់ដេតថ្មី!', 'New Update Available!', '发现新版本更新！')}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-black/30 border border-emerald-300/30 text-[10px] font-mono text-emerald-200">
                {versionBadgeText}
              </span>
            </div>

            <p className="text-xs text-emerald-50/95 mt-1 leading-relaxed">
              {customNote ||
                tr(
                  language,
                  'កម្មវិធីបានធ្វើបច្ចុប្បន្នភាពមុខងារ និងទិន្នន័យថ្មី។ ចុច «អាប់ដេតឥឡូវនេះ» ដើម្បីដំឡើងដោយស្វ័យប្រវត្តិ (គណនី និង VIP របស់អ្នកត្រូវបានរក្សាទុកដដែល)។',
                  'A newer version with latest features & improvements is ready. Tap "Update Now" to update automatically (your account & VIP stay safe).',
                  '新版本与功能优化已就绪。点击“立即更新”即可自动升级（您的账户与 VIP 权益将完整保留）。'
                )}
            </p>

            {downloadProgressPct !== null && (
              <div className="mt-2">
                <div className="flex justify-between text-[10px] text-amber-200 mb-1">
                  <span>
                    {tr(language, 'កំពុងទាញយកកំណែថ្មី...', 'Downloading update...', '正在下载更新...')}
                  </span>
                  <span>{downloadProgressPct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${downloadProgressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {!updateStatus.forceUpdate && (
            <button
              type="button"
              onClick={handleSnooze}
              aria-label={tr(language, 'បិទ', 'Close', '关闭')}
              className="w-8 h-8 -mt-1 -mr-1 rounded-full flex items-center justify-center text-emerald-200/80 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleUpdateNow}
            disabled={isUpdating}
            className="flex-1 min-h-[42px] px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition cursor-pointer disabled:opacity-70"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{tr(language, 'កំពុងអាប់ដេត...', 'Updating...', '正在更新...')}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>
                  {updateStatus.updateDownloaded
                    ? tr(language, 'ដំឡើង & បើកឡើងវិញឥឡូវនេះ', 'Install & Restart Now', '立即安装并重启')
                    : tr(language, 'អាប់ដេតឥឡូវនេះ', 'Update Now', '立即更新')}
                </span>
              </>
            )}
          </button>

          {!updateStatus.forceUpdate && (
            <button
              type="button"
              onClick={handleSnooze}
              className="min-h-[42px] px-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-emerald-50 text-xs font-semibold active:scale-[0.98] transition cursor-pointer"
            >
              {tr(language, 'ពេលក្រោយ', 'Later', '稍后')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
