import React from 'react';
import { useApp } from '../context/AppContext';
import { X, ExternalLink, ShieldCheck } from 'lucide-react';
import { APP_VERSION, APP_BUILD_CODE } from '../types';
import { tr } from '../utils/i18n';

const OFFICIAL_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.khmerfood.tourism';

/**
 * Official Google Play Store installation modal.
 * Direct APK downloads and sideloading are disabled across the entire application.
 */
export const InstallModal: React.FC = () => {
  const { isInstallModalOpen, setIsInstallModalOpen, language, appSettings } = useApp();

  if (!isInstallModalOpen) return null;

  const playStoreUrl = appSettings.playStoreUrl || OFFICIAL_PLAY_STORE_URL;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-fadeIn overflow-y-auto"
      onClick={() => setIsInstallModalOpen(false)}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#064E3B] via-[#047857] to-[#059669] p-5 text-white relative">
          <button
            onClick={() => setIsInstallModalOpen(false)}
            aria-label={tr(language, 'បិទ', 'Close', '关闭')}
            className="absolute top-3 right-3 w-10 h-10 bg-black/25 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-2xl border border-white/25">
              <ShieldCheck className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold font-moul">
                {tr(language, 'ទាញយកពី Google Play Store', 'Available on Google Play Store', '在 Google Play 商店获取')}
              </h3>
              <p className="text-xs text-emerald-100 font-khmer mt-0.5">
                {tr(
                  language,
                  'ដំឡើងកម្មវិធីផ្លូវការតាមរយៈ Google Play Store ប៉ុណ្ណោះ',
                  'Install the official app exclusively via Google Play Store',
                  '仅通过 Google Play 官方商店下载与安装'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 font-khmer">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {tr(
              language,
              'ដើម្បីសុវត្ថិភាពគណនី និងទទួលបានកំណែអាប់ដេតផ្លូវការ សូមទាញយក និងដំឡើងកម្មវិធី «រសជាតិ និងទេសចរណ៍កម្ពុជា» ពី Google Play Store។',
              'For your security and automatic updates, please download and install Cambodia Flavors & Tourism from the official Google Play Store.',
              '为保障账户安全并获取官方自动更新，请通过 Google Play 官方商店下载并安装“柬埔寨风味与旅游”。'
            )}
          </p>

          <a
            href={playStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[#064E3B] hover:bg-[#047857] text-white font-bold rounded-2xl shadow-md transition text-sm"
          >
            <ExternalLink className="w-4 h-4 text-amber-300" />
            <span>
              {tr(language, 'បើក Google Play Store', 'Open Google Play Store', '打开 Google Play 商店')}
            </span>
          </a>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500 font-khmer">
          <span>
            {APP_VERSION} • Build {APP_BUILD_CODE}
          </span>
          <button
            onClick={() => setIsInstallModalOpen(false)}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition font-medium"
          >
            {tr(language, 'បិទ', 'Close', '关闭')}
          </button>
        </div>
      </div>
    </div>
  );
};
