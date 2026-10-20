import React, { useEffect, useState } from 'react';
import { X, Download, Share2, Smartphone, CheckCircle, ExternalLink, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { useApp } from '../context/AppContext';

export const InstallModal: React.FC = () => {
  const { 
    isInstallModalOpen, 
    setIsInstallModalOpen, 
    appSettings, 
    language,
    showToast 
  } = useApp();

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Fallback download page or current URL if no APK link set
  const downloadTarget = appSettings.apkDownloadUrl || window.location.href;

  useEffect(() => {
    if (isInstallModalOpen && downloadTarget) {
      QRCode.toDataURL(downloadTarget, {
        width: 320,
        margin: 2,
        color: {
          dark: '#991b1b', // Deep Cambodian crimson red
          light: '#ffffff',
        },
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Failed to generate install QR', err));
    }
  }, [isInstallModalOpen, downloadTarget]);

  if (!isInstallModalOpen) return null;

  const isKm = language === 'km';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(downloadTarget);
    setCopied(true);
    showToast(isKm ? 'បានចម្លងតំណភ្ជាប់ដំឡើងកម្មវិធីជោគជ័យ!' : 'Install link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-amber-200/50 max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Cambodian Temple Pattern */}
        <div className="relative bg-gradient-to-r from-red-800 via-amber-700 to-red-900 text-white p-6 pb-5">
          <button
            onClick={() => setIsInstallModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
              <QrCode className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-khmer">
                {isKm ? 'ដំឡើងកម្មវិធីទូរស័ព្ទដៃ' : 'Install Mobile App'}
              </h2>
              <p className="text-xs text-amber-200 font-khmer">
                {isKm ? 'អាហារ និងទេសចរណ៍ខ្មែរ (Khmer Food & Tourism)' : 'Download Android APK & Install Guide'}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* QR Code Presentation Box */}
          <div className="bg-gradient-to-b from-amber-50 to-orange-50/40 rounded-2xl p-5 border border-amber-200 text-center flex flex-col items-center">
            <div className="relative p-3 bg-white rounded-2xl shadow-md border-2 border-amber-300/80 mb-3">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="QR Code for App Installation" 
                  className="w-52 h-52 object-contain rounded-lg"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-stone-400">
                  <span className="font-khmer text-sm">{isKm ? 'កំពុងបង្កើត QR Code...' : 'Generating QR Code...'}</span>
                </div>
              )}
              {/* Angkor Center Icon Badge */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white p-1 rounded-full shadow-md border border-amber-400">
                  <span className="text-lg">🇰🇭</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-stone-600 font-khmer max-w-xs">
              {isKm 
                ? 'ស្កេន QR Code នេះដោយប្រើកាមេរ៉ាទូរស័ព្ទ Android ដើម្បីទាញយក APK ដោយផ្ទាល់' 
                : 'Scan this QR code with your Android camera to download the APK directly'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <a
              href={appSettings.apkDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-gradient-to-r from-red-700 to-amber-600 hover:from-red-800 hover:to-amber-700 text-white font-semibold rounded-2xl shadow-lg shadow-red-700/20 active:scale-[0.98] transition-all font-khmer text-sm"
            >
              <Download className="w-5 h-5 text-amber-200" />
              <span>{isKm ? 'ទាញយកឯកសារ Android APK ផ្ទាល់' : 'Direct Download Android APK'}</span>
            </a>

            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-2xl transition-all font-khmer text-xs border border-stone-200"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-stone-500" />}
              <span>{copied ? (isKm ? 'បានចម្លងរួចរាល់!' : 'Copied!') : (isKm ? 'ចម្លងតំណភ្ជាប់ទាញយក' : 'Copy Download Link')}</span>
            </button>
          </div>

          {/* App Store Availability Badges */}
          <div className="border-t border-stone-200 pt-4">
            <h4 className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-2.5 font-khmer">
              {isKm ? 'ការទាញយកពីផ្លូវការ' : 'Official Stores'}
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={appSettings.playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2.5 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 text-stone-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="text-left overflow-hidden">
                  <div className="text-[10px] text-stone-500">Google Play</div>
                  <div className="text-xs font-bold truncate">Android Store</div>
                </div>
              </a>

              <a
                href={appSettings.appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2.5 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 text-stone-800 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="text-left overflow-hidden">
                  <div className="text-[10px] text-stone-500">Apple Store</div>
                  <div className="text-xs font-bold truncate">iOS App (Coming)</div>
                </div>
              </a>
            </div>
          </div>

          {/* 4-Step Installation Guide */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-2.5">
            <h4 className="text-xs font-bold text-red-900 font-khmer flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              {isKm ? 'ការណែនាំដំឡើងលើទូរស័ព្ទ Android' : 'Installation Guide for Android'}
            </h4>
            <ul className="text-xs text-stone-600 space-y-2 font-khmer pl-1">
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <span>{isKm ? 'ចុចប៊ូតុង "ទាញយកឯកសារ Android APK ផ្ទាល់" ឬស្កេន QR Code' : 'Click "Direct Download Android APK" or scan the QR code.'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <span>{isKm ? 'បើកឯកសារ .apk ដែលបានទាញយករួច' : 'Open the downloaded .apk file.'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <span>{isKm ? 'ប្រសិនបើទូរស័ព្ទសួរ សូមចុចអនុញ្ញាត "Install from this source" ឬ "ដំឡើងពីប្រភពនេះ"' : 'If prompted, allow "Install from this source".'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
                <span>{isKm ? 'ចុច "ដំឡើង (Install)" ហើយបើកដំណើរការកម្មវិធីជាការស្រេច!' : 'Tap "Install" and enjoy Khmer Food & Tourism!'}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 flex justify-between items-center text-xs text-stone-500 font-khmer">
          <span>{isKm ? 'កំណែចុងក្រោយ (v1.0)' : 'Latest Version (v1.0)'}</span>
          <button
            onClick={() => setIsInstallModalOpen(false)}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl transition-colors font-medium"
          >
            {isKm ? 'បិទ' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
