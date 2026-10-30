import React, { useEffect, useState } from 'react';
import { 
  X, Download, Share2, Smartphone, CheckCircle, ExternalLink, 
  Apple, Compass, ArrowRight, ShieldCheck
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import QRCode from 'qrcode';
import { useApp } from '../context/AppContext';
import { APP_VERSION, APP_BUILD_CODE } from '../types';
import { tr } from '../utils/i18n';

export const InstallModal: React.FC = () => {
  const { 
    isInstallModalOpen, 
    setIsInstallModalOpen, 
    appSettings, 
    language,
    showToast,
    installPlatformTab,
    setInstallPlatformTab
  } = useApp();

  const [androidQrUrl, setAndroidQrUrl] = useState<string>('');
  const [iosQrUrl, setIosQrUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const LATEST_SIGNED_APK_URL = 'https://github.com/igpubinfo-max/Khmer-Food-Tourism/releases/download/v2.5.0/DiscoverCambodia-v2.5.0.apk';
  const LATEST_RELEASE_PAGE_URL = 'https://github.com/igpubinfo-max/Khmer-Food-Tourism/releases/tag/v2.5.0';
  const apkDownloadTarget =
    appSettings.apkDownloadUrl &&
    !appSettings.apkDownloadUrl.includes('app-debug.apk') &&
    appSettings.apkDownloadUrl.includes('v2.5.0')
      ? appSettings.apkDownloadUrl
      : LATEST_SIGNED_APK_URL;
  const playStoreTarget = appSettings.playStoreUrl || 'https://play.google.com/store/apps/details?id=com.khmerfood.tourism';
  const iosWebTarget = 'https://igpubinfo-max.github.io/Khmer-Food-Tourism/';

  const handleExternalDownload = async (url: string, e?: React.MouseEvent) => {
    if (Capacitor.isNativePlatform()) {
      if (e) e.preventDefault();
      try {
        const NativeAbaLauncher = (window as any)?.Capacitor?.Plugins?.NativeAbaLauncher;
        if (NativeAbaLauncher && typeof NativeAbaLauncher.openExternalUrl === 'function') {
          await NativeAbaLauncher.openExternalUrl({ url });
          return;
        }
      } catch {
        // Fallback to window.open
      }
      window.open(url, '_system');
    }
  };

  useEffect(() => {
    if (isInstallModalOpen) {
      // Android QR generates direct APK link
      QRCode.toDataURL(apkDownloadTarget, {
        width: 320,
        margin: 2,
        color: { dark: '#991b1b', light: '#ffffff' },
      }).then(url => setAndroidQrUrl(url)).catch(console.error);

      // iOS QR generates web / PWA installation URL
      QRCode.toDataURL(iosWebTarget, {
        width: 320,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' },
      }).then(url => setIosQrUrl(url)).catch(console.error);
    }
  }, [isInstallModalOpen, apkDownloadTarget, iosWebTarget]);

  if (!isInstallModalOpen) return null;

  const handleCopyLink = (target: string) => {
    navigator.clipboard.writeText(target);
    setCopied(true);
    showToast(tr(language, 'បានចម្លងតំណភ្ជាប់ជោគជ័យ!', 'Link copied to clipboard!', '链接已成功复制！'), 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-[#064E3B] text-white p-5 pb-4 border-b border-[#047857]">
          <button
            onClick={() => setIsInstallModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white transition-colors"
            aria-label={tr(language, 'បិទ', 'Close', '关闭')}
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
              <Smartphone className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-khmer text-white">
                {tr(language, 'ទាញយក និងអាប់ដេតកម្មវិធីទូរស័ព្ទដៃ', 'Download & Update Mobile App', '下载与更新手机应用')}
              </h2>
              <p className="text-[11px] text-emerald-200 font-khmer">
                {tr(
                  language,
                  `រសជាតិ និងទេសចរណ៍កម្ពុជា (${APP_VERSION} • Build ${APP_BUILD_CODE})`,
                  `Cambodia Flavors & Tourism (${APP_VERSION} • Build ${APP_BUILD_CODE})`,
                  `柬埔寨风味与旅游 (${APP_VERSION} • Build ${APP_BUILD_CODE})`
                )}
              </p>
            </div>
          </div>

          {/* Platform Tab Switcher */}
          <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-black/25 rounded-2xl backdrop-blur-sm">
            <button
              onClick={() => setInstallPlatformTab('android')}
              className={`py-2 px-3 rounded-xl font-khmer text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                installPlatformTab === 'android'
                  ? 'bg-[#059669] text-white shadow-md'
                  : 'text-emerald-200 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>{tr(language, 'ប្រព័ន្ធ Android', 'Android (APK)', 'Android 手机')}</span>
            </button>

            <button
              onClick={() => setInstallPlatformTab('ios')}
              className={`py-2 px-3 rounded-xl font-khmer text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                installPlatformTab === 'ios'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-emerald-200 hover:text-white'
              }`}
            >
              <Apple className="w-4 h-4" />
              <span>{tr(language, 'ប្រព័ន្ធ iPhone', 'Apple iOS (iPhone)', '苹果 iPhone')}</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* ANDROID TAB */}
          {installPlatformTab === 'android' && (
            <div className="space-y-4">
              {/* QR Code Presentation Box */}
              <div className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center flex flex-col items-center">
                <div className="relative p-2.5 bg-white rounded-2xl shadow-md border-2 border-slate-300 mb-2">
                  {androidQrUrl ? (
                    <img 
                      src={androidQrUrl} 
                      alt={tr(language, 'កូដ QR ទាញយកកម្មវិធី', 'Android APK Install QR', 'Android APK 下载二维码')} 
                      className="w-40 h-40 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center text-slate-400">
                      <span className="font-khmer text-xs">
                        {tr(language, 'កំពុងបង្កើតកូដ QR...', 'Generating QR...', '正在生成二维码...')}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white p-1 rounded-full shadow-md border border-slate-300">
                      <span className="text-base">🤖</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-[#0F172A] dark:text-slate-300 font-khmer max-w-xs">
                  {tr(
                    language,
                    'ស្កេនកូដ QR នេះដោយកាមេរ៉ាទូរស័ព្ទដើម្បីទាញយកកម្មវិធីដំឡើងភ្លាមៗ',
                    'Scan this QR code with your Android phone camera to download the APK directly.',
                    '使用 Android 手机相机扫描此二维码即可直接下载安装。'
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <a
                  href={apkDownloadTarget}
                  onClick={e => handleExternalDownload(apkDownloadTarget, e)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#064E3B] hover:bg-[#047857] text-white font-bold rounded-2xl shadow-md shadow-emerald-950/20 active:scale-[0.98] transition-all font-khmer text-xs"
                >
                  <Download className="w-4 h-4 text-emerald-300" />
                  <span>
                    {tr(
                      language,
                      `ទាញយកកម្មវិធីផ្លូវការ (${APP_VERSION} • Build ${APP_BUILD_CODE})`,
                      `Download Official Android APK (${APP_VERSION} • Build ${APP_BUILD_CODE})`,
                      `下载官方 Android 安装包 (${APP_VERSION} • Build ${APP_BUILD_CODE})`
                    )}
                  </span>
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCopyLink(apkDownloadTarget)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-2xl transition font-khmer text-xs border border-slate-200 dark:border-slate-700"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 text-[#059669]" /> : <Share2 className="w-4 h-4 text-slate-500" />}
                    <span>
                      {copied
                        ? tr(language, 'បានចម្លងរួចរាល់!', 'Copied!', '已复制！')
                        : tr(language, 'ចម្លងតំណភ្ជាប់', 'Copy APK Link', '复制下载链接')}
                    </span>
                  </button>

                  <a
                    href={LATEST_RELEASE_PAGE_URL}
                    onClick={e => handleExternalDownload(LATEST_RELEASE_PAGE_URL, e)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-2xl transition font-khmer text-xs border border-slate-200 dark:border-slate-700"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-600" />
                    <span>
                      {tr(language, 'ទំព័រទាញយកផ្ទាល់', 'Release Page', '官方发布页')}
                    </span>
                  </a>
                </div>
              </div>

              {/* Official Google Play Store Option */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800/90 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#059669] flex items-center justify-center text-white shrink-0 font-bold shadow-xs">
                    ▶
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white font-khmer text-xs flex items-center gap-1.5">
                      <span>Google Play Store</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-bold">
                        {tr(language, 'ផ្លូវការ', 'Official', '官方')}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-300 font-khmer leading-snug mt-0.5">
                      {tr(
                        language,
                        'ដំឡើងដោយសុវត្ថិភាពតាមរយៈហាងកម្មវិធីផ្លូវការ',
                        'Install safely from the official Google Play Store',
                        '通过官方 Google Play 商店安全安装'
                      )}
                    </div>
                  </div>
                </div>
                <a
                  href={playStoreTarget}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-[10px] font-bold font-khmer shrink-0 shadow-2xs"
                >
                  {tr(language, 'បើកហាងកម្មវិធី', 'Play Store', '打开商店')}
                </a>
              </div>

              {/* Safe Installation Guide */}
              <div className="bg-amber-50/90 dark:bg-amber-950/30 rounded-2xl p-4 border border-amber-300 dark:border-amber-700/70 space-y-2 font-khmer">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-amber-200">
                    {tr(
                      language,
                      '🛡️ វិធីដំឡើងដោយសុវត្ថិភាពលើទូរស័ព្ទ Android',
                      '🛡️ Safe Android Installation Steps',
                      '🛡️ Android 安全安装指南'
                    )}
                  </h4>
                </div>
                <ul className="text-[11px] text-slate-700 dark:text-slate-200 space-y-1.5 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#064E3B] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                    <span>
                      {tr(
                        language,
                        'ចុចប៊ូតុងទាញយកកម្មវិធីផ្លូវការ ឬស្កេនកូដ QR ខាងលើ។',
                        'Tap "Download Official Android APK" or scan the QR code above.',
                        '点击“下载官方 Android 安装包”或扫描上方二维码。'
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#064E3B] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                    <span>
                      {tr(
                        language,
                        'បើកឯកសារដែលបានទាញយករួច ដើម្បីដំឡើងជាន់លើកំណែចាស់ដោយមិនបាត់ទិន្នន័យ។',
                        'Open the downloaded APK file to install directly without losing existing data.',
                        '打开已下载的安装包，直接覆盖安装且不会丢失已有数据。'
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#064E3B] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                    <span>
                      {tr(
                        language,
                        'ប្រសិនបើទូរស័ព្ទសួរសិទ្ធិដំឡើង សូមចុចអនុញ្ញាត និងចុចដំឡើងជាការស្រេច!',
                        'If prompted by your browser or Play Protect, tap Scan / Install to finish!',
                        '如浏览器提示安装权限，请允许安装并点击完成！'
                      )}
                    </span>
                  </li>
                </ul>
              </div>

              {/* Quick Switch to iOS button */}
              <button
                onClick={() => setInstallPlatformTab('ios')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl border border-slate-200 dark:border-slate-700 transition font-khmer text-xs font-semibold"
              >
                <Apple className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <span>
                  {tr(
                    language,
                    'ប្រើប្រាស់ទូរស័ព្ទ iPhone? ចុចទីនេះសម្រាប់ការណែនាំ',
                    'Using Apple iPhone? Switch to iOS guide',
                    '使用苹果 iPhone？点击查看 iOS 安装指南'
                  )}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* IPHONE / IOS TAB */}
          {installPlatformTab === 'ios' && (
            <div className="space-y-4">
              {/* iOS Instant Web / PWA QR */}
              <div className="bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center flex flex-col items-center">
                <div className="relative p-2.5 bg-white rounded-2xl shadow-md border-2 border-slate-700 mb-2">
                  {iosQrUrl ? (
                    <img 
                      src={iosQrUrl} 
                      alt={tr(language, 'កូដ QR សម្រាប់ iPhone', 'iPhone Web App QR', 'iPhone 网页应用二维码')} 
                      className="w-40 h-40 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center text-slate-400">
                      <span className="font-khmer text-xs">
                        {tr(language, 'កំពុងបង្កើតកូដ QR...', 'Generating QR...', '正在生成二维码...')}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white p-1 rounded-full shadow-md border border-slate-700">
                      <Apple className="w-4 h-4 text-slate-900" />
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-khmer max-w-xs">
                  {tr(
                    language,
                    'ស្កេនកូដ QR នេះដោយកាមេរ៉ា iPhone ដើម្បីបើកកម្មវិធី និងបន្ថែមទៅអេក្រង់ដើម',
                    'Scan with your iPhone camera to open in Safari and add to Home Screen.',
                    '使用 iPhone 相机扫描二维码，在 Safari 中打开并添加到主屏幕。'
                  )}
                </p>

                <div className="w-full space-y-2 pt-2">
                  <a
                    href={iosWebTarget}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-md active:scale-[0.98] transition-all font-khmer text-xs"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-400" />
                    <span>
                      {tr(language, 'បើកកម្មវិធីលើកម្មវិធីរុករក Safari', 'Open Web App in Safari', '在 Safari 中打开应用')}
                    </span>
                  </a>

                  <button
                    onClick={() => handleCopyLink(iosWebTarget)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-2xl transition font-khmer text-xs border border-slate-200 dark:border-slate-700"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 text-[#059669]" /> : <Share2 className="w-4 h-4 text-slate-500" />}
                    <span>
                      {copied
                        ? tr(language, 'បានចម្លងរួចរាល់!', 'Copied!', '已复制！')
                        : tr(language, 'ចម្លងតំណភ្ជាប់សម្រាប់ iPhone', 'Copy iPhone Web App Link', '复制 iPhone 网页版链接')}
                    </span>
                  </button>
                </div>
              </div>

              {/* Safari Add to Home Screen (PWA Guide for iPhone) */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="text-xs font-bold text-[#064E3B] dark:text-emerald-400 font-khmer flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-[#059669]" />
                  {tr(
                    language,
                    'វិធីបន្ថែមកម្មវិធីទៅអេក្រង់ដើមលើទូរស័ព្ទ iPhone',
                    'Install on iPhone via Safari (Full App Mode)',
                    '在 iPhone 上通过 Safari 添加到主屏幕'
                  )}
                </h4>
                <ul className="text-[11px] text-slate-700 dark:text-slate-300 space-y-2 font-khmer pl-1">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#064E3B] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                    <span>
                      {tr(
                        language,
                        'បើកតំណភ្ជាប់កម្មវិធីនៅក្នុង Safari នៅលើទូរស័ព្ទ iPhone របស់អ្នក។',
                        'Open the app link in Safari on your iPhone.',
                        '在 iPhone 的 Safari 浏览器中打开应用链接。'
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#064E3B] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                    <span>
                      {tr(
                        language,
                        'ចុចលើប៊ូតុងចែករំលែក (សញ្ញាការ៉េព្រួញឡើងលើ) នៅរបារខាងក្រោម។',
                        'Tap the Share button at the bottom toolbar.',
                        '点击底部工具栏的“分享”按钮。'
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#064E3B] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                    <span>
                      {tr(
                        language,
                        'អូសចុះក្រោម រួចជ្រើសរើស «បន្ថែមទៅអេក្រង់ដើម» និងចុចបន្ថែមជាការស្រេច!',
                        'Scroll down, tap "Add to Home Screen", and tap "Add"!',
                        '向下滚动并点击“添加到主屏幕”，然后点击“添加”即可！'
                      )}
                    </span>
                  </li>
                </ul>
              </div>

              {/* Quick Switch to Android APK */}
              <button
                onClick={() => setInstallPlatformTab('android')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-[#064E3B] dark:text-emerald-300 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/80 transition font-khmer text-xs font-semibold"
              >
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {tr(
                    language,
                    'ប្រើប្រាស់ទូរស័ព្ទ Android? ចុចទីនេះដើម្បីទាញយកកម្មវិធី',
                    'Using Android? Switch to APK Download',
                    '使用 Android 手机？点击切换至 APK 下载'
                  )}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500 font-khmer">
          <span>
            {tr(
              language,
              `កំណែចុងក្រោយ (${APP_VERSION} • Build ${APP_BUILD_CODE})`,
              `Latest Release (${APP_VERSION} • Build ${APP_BUILD_CODE})`,
              `最新版本 (${APP_VERSION} • Build ${APP_BUILD_CODE})`
            )}
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
