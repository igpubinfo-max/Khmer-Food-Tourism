import React, { useEffect, useState } from 'react';
import { 
  X, Download, Share2, Smartphone, CheckCircle, ExternalLink, 
  QrCode, Apple, Compass, PlusSquare, ArrowRight, ShieldCheck 
} from 'lucide-react';
import QRCode from 'qrcode';
import { useApp } from '../context/AppContext';

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

  const isKm = language === 'km';
  const LATEST_SIGNED_APK_URL = 'https://github.com/igpubinfo-max/Khmer-Food-Tourism/releases/download/v1.9.7/KhmerFoodTourism-v1.9.7.apk';
  const apkDownloadTarget =
    appSettings.apkDownloadUrl &&
    !appSettings.apkDownloadUrl.includes('app-debug.apk') &&
    appSettings.apkDownloadUrl.includes('v1.9.7')
      ? appSettings.apkDownloadUrl
      : LATEST_SIGNED_APK_URL;
  const playStoreTarget = appSettings.playStoreUrl || 'https://play.google.com/store/apps/details?id=com.khmerfood.tourism';
  const iosWebTarget = 'https://igpubinfo-max.github.io/Khmer-Food-Tourism/';

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
    showToast(isKm ? 'បានចម្លងតំណភ្ជាប់ជោគជ័យ!' : 'Link copied to clipboard!', 'success');
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
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
              <Smartphone className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-khmer text-white">
                {isKm ? 'ទាញយក និងដំឡើងកម្មវិធីទូរស័ព្ទដៃ' : 'Download & Install Mobile App'}
              </h2>
              <p className="text-[11px] text-emerald-200 font-khmer">
                {isKm ? 'គាំទ្រប្រព័ន្ធ Android និង Apple iOS (iPhone)' : 'Supported on Android & Apple iOS (iPhone)'}
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
              <span>{isKm ? 'ប្រព័ន្ធ Android (APK)' : 'Android (APK)'}</span>
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
              <span>{isKm ? 'ប្រព័ន្ធ iPhone (iOS)' : 'Apple iOS (iPhone)'}</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* ANDROID TAB */}
          {installPlatformTab === 'android' && (
            <div className="space-y-4">
              {/* QR Code Presentation Box */}
              <div className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 text-center flex flex-col items-center">
                <div className="relative p-2.5 bg-white rounded-2xl shadow-md border-2 border-slate-300 mb-2">
                  {androidQrUrl ? (
                    <img 
                      src={androidQrUrl} 
                      alt="Android APK Install QR" 
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                      <span className="font-khmer text-xs">{isKm ? 'កំពុងបង្កើត QR Code...' : 'Generating QR...'}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white p-1 rounded-full shadow-md border border-slate-300">
                      <span className="text-base">🤖</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-[#0F172A] dark:text-slate-300 font-khmer max-w-xs">
                  {isKm 
                    ? 'ស្កេន QR Code នេះដោយកាមេរ៉ាទូរស័ព្ទ Android ដើម្បីទាញយក APK ដំឡើងភ្លាមៗ' 
                    : 'Scan this QR code with your Android phone camera to download APK directly.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <a
                  href={apkDownloadTarget}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#064E3B] hover:bg-[#047857] text-white font-bold rounded-2xl shadow-md shadow-emerald-950/20 active:scale-[0.98] transition-all font-khmer text-xs"
                >
                  <Download className="w-4 h-4 text-emerald-300" />
                  <span>{isKm ? 'ទាញយកកម្មវិធី Android APK ផ្លូវការ (v1.9.6 Signed Release)' : 'Download Official Signed Android APK (v1.9.6)'}</span>
                </a>

                <button
                  onClick={() => handleCopyLink(apkDownloadTarget)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-2xl transition font-khmer text-xs border border-slate-200 dark:border-slate-700"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-[#059669]" /> : <Share2 className="w-4 h-4 text-slate-500" />}
                  <span>{copied ? (isKm ? 'បានចម្លងរួចរាល់!' : 'Copied!') : (isKm ? 'ចម្លងតំណភ្ជាប់ APK' : 'Copy APK Download Link')}</span>
                </button>
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
                        VerifiedV2/V3
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-600 dark:text-slate-300 font-khmer leading-snug mt-0.5">
                      {isKm
                        ? 'ចុះហត្ថលេខាឌីជីថលផ្លូវការ (V1/V2/V3 Signed Release) • គាំទ្រប្រព័ន្ធ Google Play Protect ១០០%'
                        : 'Signed with official V1/V2/V3 release certificate • 100% Google Play Protect compatible'}
                    </div>
                  </div>
                </div>
                <a
                  href={playStoreTarget}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-[10px] font-bold font-khmer shrink-0 shadow-2xs"
                >
                  {isKm ? 'Play Store' : 'Play Store'}
                </a>
              </div>

              {/* Google Play Protect Safe Installation Guide in Khmer (Never Disable Play Protect!) */}
              <div className="bg-amber-50/90 dark:bg-amber-950/30 rounded-2xl p-4 border-2 border-amber-300 dark:border-amber-700/70 space-y-2.5 font-khmer">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-amber-200">
                    {isKm
                      ? '🛡️ វិធីដំឡើងដោយសុវត្ថិភាពជាមួយ Google Play Protect (មិនបាច់បិទ Play Protect ទេ!)'
                      : '🛡️ Safe Installation with Google Play Protect (Keep Play Protect ON!)'}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  {isKm
                    ? 'កម្មវិធីនេះត្រូវបានចុះហត្ថលេខាឌីជីថលផ្លូវការ (Official Release Signature)។ សូមកុំបិទ (Do NOT disable) Google Play Protect ឡើយ! ប្រសិនបើទូរស័ព្ទលោតផ្ទាំងសួរពេលដំឡើង សូមអនុវត្តតាមជំហានងាយៗខាងក្រោម៖'
                    : 'This app is digitally signed with our official release key. Do NOT disable Google Play Protect! If Android shows a security prompt during installation, follow these safe steps:'}
                </p>
                <div className="space-y-2 text-[11px] text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-amber-200 dark:border-slate-700">
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] shrink-0">ជំហាន ១</span>
                    <span>
                      {isKm
                        ? 'នៅពេលលោតផ្ទាំង "App scan recommended" (ណែនាំឱ្យស្កេនកម្មវិធី) សូមចុចប៊ូតុងពណ៌ខៀវ «Scan app (ស្កេនកម្មវិធី)» ដើម្បីឱ្យ Google Play Protect ត្រួតពិនិត្យសុវត្ថិភាពដោយស្វ័យប្រវត្តិ។'
                        : 'When "App scan recommended" appears, tap the blue "Scan app" button so Google Play Protect verifies the APK.'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] shrink-0">ជំហាន ២</span>
                    <span>
                      {isKm
                        ? 'បន្ទាប់ពីស្កេនចប់ (ប្រហែល ២-៣ វិនាទី) ឬប្រសិនបើលោតផ្ទាំងបញ្ជាក់បន្ថែម សូមចុច «More details (ព័ត៌មានលម្អិតបន្ថែម)» រួចចុច «Install anyway / Install (ដំឡើង)»។'
                        : 'Once the scan completes (or if prompted under "More details"), tap "Install" to finish installation.'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] shrink-0">ជំហាន ៣</span>
                    <span>
                      {isKm
                        ? 'ប្រសិនបើទូរស័ព្ទសួរសិទ្ធិដំឡើងពី Browser (Chrome/Telegram) សូមបើកកុងតាក់ «Allow from this source (អនុញ្ញាតពីប្រភពនេះ)» រួចចុច Install ជាការស្រេច!'
                        : 'If your browser (Chrome/Telegram) asks permission, toggle ON "Allow from this source" and tap Install!'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4-Step Android Installation Guide */}
              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="text-xs font-bold text-[#064E3B] dark:text-emerald-400 font-khmer flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#059669]"></span>
                  {isKm ? 'សង្ខេបជំហានដំឡើងលើទូរស័ព្ទ Android (៤ ជំហានងាយៗ)' : '4 Easy Installation Steps for Android'}
                </h4>
                <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5 font-khmer pl-1">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#064E3B] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                    <span>{isKm ? 'ចុចប៊ូតុង "ទាញយកកម្មវិធី Android APK ផ្លូវការ" ឬស្កេន QR Code ខាងលើ' : 'Click "Download Official Signed Android APK" or scan QR Code.'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#064E3B] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                    <span>{isKm ? 'បើកឯកសារ KhmerFoodTourism-v1.9.6.apk ដែលបានទាញយករួច' : 'Open the downloaded KhmerFoodTourism-v1.9.6.apk file.'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#064E3B] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                    <span>{isKm ? 'ពេលលោតផ្ទាំង Google Play Protect សូមចុច "Scan app (ស្កេនកម្មវិធី)" ដោយរក្សា Play Protect ឱ្យនៅបើកដដែល' : 'When Google Play Protect prompts, tap "Scan app" while keeping Play Protect enabled.'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#064E3B] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
                    <span>{isKm ? 'ចុច "ដំឡើង (Install)" ហើយបើកដំណើរការកម្មវិធីជាការស្រេច!' : 'Tap "Install" and enjoy Khmer Food & Tourism!'}</span>
                  </li>
                </ul>
              </div>

              {/* Quick Switch to iOS button */}
              <button
                onClick={() => setInstallPlatformTab('ios')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl border border-slate-200 dark:border-slate-700 transition font-khmer text-xs font-semibold"
              >
                <Apple className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <span>{isKm ? 'ប្រើប្រាស់ Apple iPhone? ចុចទីនេះសម្រាប់ iOS' : 'Using Apple iPhone? Switch to iOS guide'}</span>
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
                      alt="iPhone Web App QR" 
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                      <span className="font-khmer text-xs">{isKm ? 'កំពុងបង្កើត QR Code...' : 'Generating QR...'}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white p-1 rounded-full shadow-md border border-slate-700">
                      <Apple className="w-4 h-4 text-slate-900" />
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-khmer max-w-xs">
                  {isKm 
                    ? 'ស្កេន QR Code នេះដោយកាមេរ៉ា iPhone ដើម្បីបើកកម្មវិធីលើ Safari និងបន្ថែមទៅអេក្រង់ដើម (Home Screen)' 
                    : 'Scan with your iPhone camera to open in Safari and add to Home Screen.'}
                </p>

                <div className="w-full space-y-2 pt-2">
                  <a
                    href={iosWebTarget}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-md active:scale-[0.98] transition-all font-khmer text-xs"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-400" />
                    <span>{isKm ? 'បើកកម្មវិធីលើ Safari ផ្ទាល់ (Open in Safari)' : 'Open Web App in Safari'}</span>
                  </a>

                  <button
                    onClick={() => handleCopyLink(iosWebTarget)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-2xl transition font-khmer text-xs border border-slate-200 dark:border-slate-700"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 text-[#059669]" /> : <Share2 className="w-4 h-4 text-slate-500" />}
                    <span>{copied ? (isKm ? 'បានចម្លងរួចរាល់!' : 'Copied!') : (isKm ? 'ចម្លងតំណភ្ជាប់ Web App សម្រាប់ iPhone' : 'Copy iPhone Web App Link')}</span>
                  </button>
                </div>
              </div>

              {/* Official Apple Store & TestFlight Status */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={appSettings.iosTestFlightUrl || 'https://testflight.apple.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex flex-col items-center text-center transition"
                >
                  <Apple className="w-5 h-5 text-slate-800 dark:text-slate-200 mb-1" />
                  <span className="font-bold font-khmer text-xs">Apple TestFlight</span>
                  <span className="text-[9px] text-slate-500 font-khmer">{isKm ? 'កំណែសាកល្បង Beta' : 'Beta Testing'}</span>
                </a>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex flex-col items-center text-center opacity-85">
                  <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold mb-1">
                    A
                  </div>
                  <span className="font-bold font-khmer text-xs">App Store</span>
                  <span className="text-[9px] text-slate-500 font-khmer">{isKm ? 'កំពុងត្រួតពិនិត្យ (Coming Soon)' : 'In Review (Coming)'}</span>
                </div>
              </div>

              {/* Safari Add to Home Screen (PWA Guide for iPhone) */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="text-xs font-bold text-[#064E3B] dark:text-emerald-400 font-khmer flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-[#059669]" />
                  {isKm ? 'វិធីដំឡើងលើ iPhone តាម Safari (ដំណើរការដូច App ពេញលេញ)' : 'Install on iPhone via Safari (Full App Mode)'}
                </h4>
                <ul className="text-[11px] text-slate-700 dark:text-slate-300 space-y-2 font-khmer pl-1">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#064E3B] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                    <span>{isKm ? 'បើកតំណភ្ជាប់កម្មវិធីនៅក្នុង Safari នៅលើទូរស័ព្ទ iPhone' : 'Open the app link in Safari on your iPhone.'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#064E3B] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                    <span>
                      {isKm ? 'ចុចលើប៊ូតុង "Share" ' : 'Tap the "Share" button '}
                      <Share2 className="w-3.5 h-3.5 inline text-[#059669] mx-0.5" />
                      {isKm ? '(សញ្ញាការ៉េព្រួញឡើងលើ) នៅរបារខាងក្រោម' : 'at the bottom toolbar.'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#064E3B] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                    <span>
                      {isKm ? 'អូសចុះក្រោម រួចជ្រើសរើស ' : 'Scroll down and tap '}
                      <strong className="text-slate-900 dark:text-white">"Add to Home Screen"</strong>
                      {isKm ? ' (បន្ថែមទៅអេក្រង់ដើម)' : '.'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#064E3B] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
                    <span>{isKm ? 'ចុច "Add (បន្ថែម)" — រូបសញ្ញាកម្មវិធីនឹងបង្ហាញលើអេក្រង់ដើមទូរស័ព្ទ iPhone របស់អ្នកភ្លាមៗ!' : 'Tap "Add" — The app icon appears on your home screen and opens full-screen!'}</span>
                  </li>
                </ul>
              </div>

              {/* Quick Switch to Android APK */}
              <button
                onClick={() => setInstallPlatformTab('android')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-[#064E3B] dark:text-emerald-300 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/80 transition font-khmer text-xs font-semibold"
              >
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isKm ? 'ប្រើប្រាស់ Android? ចុចទីនេះដើម្បីទាញយក APK' : 'Using Android? Switch to APK Download'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500 font-khmer">
          <span>{isKm ? 'កំណែចុងក្រោយ (v1.6.3)' : 'Release v1.6.3'}</span>
          <button
            onClick={() => setIsInstallModalOpen(false)}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition font-medium"
          >
            {isKm ? 'បិទ' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
