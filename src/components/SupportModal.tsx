import React from 'react';
import { X, Heart, ShieldCheck, Download, Smartphone, HelpCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SupportModal: React.FC = () => {
  const { 
    isSupportModalOpen, 
    setIsSupportModalOpen, 
    appSettings, 
    language,
    showToast 
  } = useApp();

  if (!isSupportModalOpen) return null;

  const isKm = language === 'km';

  const handleDownloadQr = () => {
    const link = document.createElement('a');
    link.href = appSettings.supportQrImageUrl;
    link.download = 'KhmerFoodTourism-Support-KHQR.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isKm ? 'បានទាញយករូបភាព KHQR រួចរាល់!' : 'Saved KHQR image!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#A7DCA5]/40 max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-[#0B3D2E] via-[#14532D] to-[#0B3D2E] text-white p-6 pb-5">
          <button
            onClick={() => setIsSupportModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-[#A7DCA5] hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-[#A7DCA5]/30 shadow-inner">
              <Heart className="w-7 h-7 text-[#A7DCA5] fill-[#A7DCA5]" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-khmer text-white">
                {isKm ? 'ជួយឧបត្ថម្ភគាំទ្រកម្មវិធី' : 'Support Our Application'}
              </h2>
              <p className="text-xs text-[#A7DCA5] font-khmer">
                {isKm ? 'ការបរិច្ចាគស្ម័គ្រចិត្តតាមរយៈ Bakong KHQR' : 'Voluntary contribution via Bakong KHQR'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Important Separation Notice */}
          <div className="flex items-start gap-2.5 p-3.5 bg-[#EAF6EC] border border-[#A7DCA5]/50 rounded-2xl text-xs text-[#183326] font-khmer">
            <ShieldCheck className="w-5 h-5 text-[#228B4E] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#14532D]">
                {isKm ? 'ចំណាំសំខាន់ (Important Note):' : 'Important Notice:'}
              </p>
              <p className="text-[#183326]/80 mt-0.5">
                {isKm 
                  ? 'នេះជា QR Code សម្រាប់តែការជួយឧបត្ថម្ភស្ម័គ្រចិត្តដល់ការអភិវឌ្ឍន៍កម្មវិធី "អាហារ និងទេសចរណ៍ខ្មែរ" ប៉ុណ្ណោះ។ ដាច់ដោយឡែកពី QR Code ដំឡើងកម្មវិធី។' 
                  : 'This QR code is strictly for voluntary support to develop Khmer Food & Tourism. It is kept completely separate from the app installation QR code.'}
              </p>
            </div>
          </div>

          {/* Genuine KHQR Presentation Frame */}
          <div className="bg-gradient-to-b from-stone-50 to-rose-50/30 rounded-3xl p-5 border border-rose-200 text-center flex flex-col items-center shadow-inner">
            <div className="w-full max-w-[280px] bg-white rounded-2xl p-4 shadow-xl border-2 border-red-500 mb-3 relative">
              {/* KHQR Header Banner */}
              <div className="flex items-center justify-between border-b border-red-200 pb-2 mb-3">
                <span className="text-[11px] font-bold text-red-600 tracking-wide">BAKONG KHQR</span>
                <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">KHR & USD</span>
              </div>

              {/* QR Image */}
              <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-white p-1">
                <img 
                  src={appSettings.supportQrImageUrl} 
                  alt="KHQR Donation QR Code" 
                  className="w-full h-auto object-contain rounded-lg"
                  onError={(e) => {
                    // Fallback placeholder if custom image fails to load
                    (e.target as HTMLImageElement).src = '/donation-qr.png';
                  }}
                />
              </div>

              {/* Account Details */}
              <div className="mt-3 text-left bg-stone-50 p-2.5 rounded-xl border border-stone-100 space-y-1">
                <div className="text-[10px] text-stone-500 font-khmer">
                  {isKm ? 'ធនាគារ / បណ្តាញទូទាត់:' : 'Bank / Payment:'}
                </div>
                <div className="text-xs font-bold text-stone-800">
                  {appSettings.supportBankName}
                </div>
                <div className="text-[10px] text-stone-500 font-khmer pt-1">
                  {isKm ? 'ឈ្មោះគណនីទទួល:' : 'Beneficiary Name:'}
                </div>
                <div className="text-xs font-bold text-red-800">
                  {appSettings.supportAccountName}
                </div>
              </div>
            </div>

            {/* Save Image Action */}
            <button
              onClick={handleDownloadQr}
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-stone-50 text-stone-700 font-medium rounded-xl text-xs border border-stone-200 shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5 text-red-600" />
              <span className="font-khmer">{isKm ? 'រក្សាទុករូបភាព QR Code' : 'Save QR Image'}</span>
            </button>
          </div>

          {/* Support Message */}
          <div className="bg-[#EAF6EC]/60 rounded-2xl p-4 border border-[#A7DCA5]/40 text-center space-y-2">
            <p className="text-xs text-[#183326] font-khmer leading-relaxed">
              {isKm ? appSettings.supportMessageKh : appSettings.supportMessageEn}
            </p>
            <div className="flex items-center justify-center gap-1 text-[11px] text-[#228B4E] font-khmer">
              <Heart className="w-3.5 h-3.5 fill-[#228B4E]" />
              <span>{isKm ? 'សូមថ្លែងអំណរគុណយ៉ាងជ្រាលជ្រៅ!' : 'Thank you for your generous support!'}</span>
            </div>
          </div>

          {/* Banking Apps Compatibility */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-600 font-khmer flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-stone-500" />
              {isKm ? 'គាំទ្រកម្មវិធីធនាគារទូទាំងកម្ពុជា' : 'Compatible with all Cambodian banking apps'}
            </h4>
            <p className="text-[11px] text-stone-500 font-khmer leading-normal">
              {isKm 
                ? 'លោកអ្នកអាចប្រើប្រាស់កម្មវិធីធនាគារណាមួយក៏បាន ដូចជា ABA Mobile, Bakong App, ACLEDA mobile, Wing, TrueMoney និងកម្មវិធីសមាជិក Bakong ទាំងអស់ដើម្បីស្កេន។' 
                : 'Scan with ABA Mobile, Bakong App, ACLEDA, Wing, or any member app of National Bank of Cambodia Bakong network.'}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 flex justify-between items-center text-xs text-stone-500 font-khmer">
          <span>{isKm ? 'សុវត្ថិភាពខ្ពស់តាមស្តង់ដា KHQR' : 'Secure Official KHQR Standard'}</span>
          <button
            onClick={() => setIsSupportModalOpen(false)}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl transition-colors font-medium"
          >
            {isKm ? 'បិទ' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
