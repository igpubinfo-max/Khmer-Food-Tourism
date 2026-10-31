import React from 'react';
import { X, Heart, ShieldCheck, Download, Smartphone, Mail, Share2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { tr } from '../utils/i18n';
import { savePngDataUrlToGallery, shareQrImageNativeOrWeb } from '../utils/androidMediaHelper';

export const SupportModal: React.FC = () => {
  const {
    isSupportModalOpen,
    setIsSupportModalOpen,
    appSettings,
    language,
    showToast,
  } = useApp();

  if (!isSupportModalOpen) return null;

  const officialQrUrl =
    appSettings.supportQrImageUrl && appSettings.supportQrImageUrl !== '/donation-qr.png'
      ? appSettings.supportQrImageUrl
      : '/images/aba_khqr_official_kimseng.png';

  const handleDownloadQr = async () => {
    try {
      const res = await savePngDataUrlToGallery(officialQrUrl, 'ABA-KHQR-KIMSENG-CHEA-095245959.png');
      showToast(
        res.duplicate
          ? tr(language, '✅ រូបភាព ABA QR ច្បាប់ដើមមាននៅក្នុង Gallery / Photos រួចហើយ!', '✅ Original ABA QR image is already in Gallery/Photos!', '✅ 原始 ABA 二维码图片已在相册中！')
          : tr(language, '✅ បានរក្សាទុករូបភាព ABA QR ច្បាប់ដើមទៅក្នុង Gallery / Photos រួចរាល់!', '✅ Saved original ABA QR image to Gallery/Photos!', '✅ 已保存原始 ABA 二维码图片到相册！'),
        'success'
      );
    } catch {
      showToast(tr(language, 'សូមថតអេក្រង់រូបភាព QR ដើម្បីរក្សាទុក', 'Please screenshot QR to save', '请截图保存二维码'), 'warning');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative bg-[#064E3B] text-white p-6 pb-5 border-b border-[#047857]">
          <button
            onClick={() => setIsSupportModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/20 shadow-inner">
              <Heart className="w-7 h-7 text-emerald-300 fill-emerald-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-khmer text-white">
                {tr(language, 'គាំទ្រការអភិវឌ្ឍន៍កម្មវិធី', 'Support Cambodia Flavors & Tourism', '支持应用开发')}
              </h2>
              <p className="text-xs text-emerald-200 font-khmer">
                {tr(language, 'ការចូលរួមគាំទ្រដោយស្ម័គ្រចិត្តតាមរយៈ Bakong KHQR', 'Voluntary contribution via Bakong KHQR', '通过 Bakong KHQR 自愿支持')}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-[#0F172A] font-khmer">
            <ShieldCheck className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#064E3B]">
                {tr(language, 'ចំណាំសំខាន់៖', 'Important Notice:', '温馨提示：')}
              </p>
              <p className="text-[#0F172A]/80 mt-0.5 leading-relaxed">
                {tr(
                  language,
                  'នេះជា QR Code សម្រាប់ការចូលរួមគាំទ្រដោយស្ម័គ្រចិត្តដល់កម្មវិធី «រសជាតិ និងទេសចរណ៍កម្ពុជា» ប៉ុណ្ណោះ ដោយដាច់ដោយឡែកពី QR Code ទាញយកកម្មវិធី។',
                  'This QR code is strictly for voluntary contributions to support Cambodia Flavors & Tourism, separate from the app download QR code.',
                  '此二维码仅用于自愿支持“柬埔寨风味与旅游”的持续开发与维护，与应用下载二维码完全独立。'
                )}
              </p>
            </div>
          </div>

          {/* Genuine KHQR Presentation Frame */}
          <div className="bg-gradient-to-b from-stone-50 to-rose-50/30 rounded-3xl p-5 border border-rose-200 text-center flex flex-col items-center shadow-inner">
            <div className="w-full max-w-[280px] bg-white rounded-2xl p-4 shadow-xl border-2 border-red-500 mb-3 relative">
              <div className="flex items-center justify-between border-b border-red-200 pb-2 mb-3">
                <span className="text-[11px] font-bold text-red-600 tracking-wide">BAKONG KHQR</span>
                <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">KHR & USD</span>
              </div>

              <button
                type="button"
                onClick={handleDownloadQr}
                title={tr(language, 'ចុចលើរូប QR ដើម្បីរក្សាទុកក្នុង Gallery / Photos', 'Tap QR to save original image to Gallery/Photos', '点击二维码保存原图到相册')}
                className="relative w-full rounded-xl overflow-hidden border border-stone-200 bg-white p-0 cursor-pointer active:scale-[0.985] transition block"
              >
                <img
                  src={officialQrUrl}
                  alt="ABA KHQR — KIMSENG CHEA"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto object-contain rounded-lg block"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/aba_khqr_official_kimseng.png';
                  }}
                />
              </button>

              <div className="mt-3 text-left bg-stone-50 p-2.5 rounded-xl border border-stone-100 space-y-1">
                <div className="text-[10px] text-stone-500 font-khmer">
                  {tr(language, 'ធនាគារ / បណ្តាញទូទាត់៖', 'Bank / Payment Network:', '收款银行 / 支付网络：')}
                </div>
                <div className="text-xs font-bold text-stone-800">
                  {appSettings.supportBankName}
                </div>
                <div className="text-[10px] text-stone-500 font-khmer pt-1">
                  {tr(language, 'ឈ្មោះគណនីទទួល៖', 'Beneficiary Name:', '收款账户名称：')}
                </div>
                <div className="text-xs font-bold text-red-800">
                  {appSettings.supportAccountName}
                </div>
              </div>
            </div>

            <button
              onClick={handleDownloadQr}
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-stone-50 text-stone-700 font-medium rounded-xl text-xs border border-stone-200 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-red-600" />
              <span className="font-khmer">{tr(language, 'រក្សាទុករូបភាព QR Code', 'Save QR Image', '保存二维码图片')}</span>
            </button>
          </div>

          {/* Support Message */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-center space-y-2">
            <p className="text-xs text-[#0F172A] font-khmer leading-relaxed">
              {language === 'km'
                ? appSettings.supportMessageKh
                : language === 'zh'
                ? '感谢您支持“柬埔寨风味与旅游”。您的每一份心意都将助力我们持续完善应用并推广柬埔寨美食与文化。'
                : appSettings.supportMessageEn}
            </p>
            <div className="flex items-center justify-center gap-1 text-[11px] text-[#059669] font-khmer">
              <Heart className="w-3.5 h-3.5 fill-[#059669]" />
              <span>{tr(language, 'សូមថ្លែងអំណរគុណដោយស្មោះ!', 'Thank you for your support!', '衷心感谢您的支持！')}</span>
            </div>
          </div>

          {/* Feedback & Inquiries Email Section */}
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 font-khmer">
            <div className="flex items-center gap-2 text-xs font-bold text-[#064E3B]">
              <Mail className="w-4 h-4 text-[#059669]" />
              <span>{tr(language, 'មតិកែលម្អ និងទំនាក់ទំនង', 'Feedback & Support Email', '意见反馈与联系邮箱')}</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {tr(
                language,
                'សម្រាប់មតិកែលម្អ សំណូមពរ ឬសាកសួរព័ត៌មានបន្ថែម សូមទាក់ទងមកកាន់អ៊ីមែលផ្លូវការ៖',
                'For feedback, suggestions, or inquiries, please email us directly:',
                '如有任何建议、反馈或合作咨询，欢迎发送邮件至官方邮箱：'
              )}
            </p>
            <div className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-emerald-300 shadow-2xs">
              <a
                href="mailto:kftcam@gmail.com"
                className="text-xs font-bold text-[#064E3B] hover:underline flex items-center gap-1.5 font-mono truncate"
              >
                <span>kftcam@gmail.com</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  const msg = tr(language, 'បានចម្លងអ៊ីមែលរួចរាល់', 'Email copied', '已复制邮箱地址');
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText('kftcam@gmail.com').then(() => {
                      showToast(msg, 'success');
                    }).catch(() => {});
                  } else {
                    showToast(msg, 'success');
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-[#064E3B] hover:bg-[#047857] text-white text-[10px] font-bold shrink-0 transition active:scale-95 cursor-pointer"
              >
                {tr(language, 'ចម្លង', 'Copy', '复制')}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-600 font-khmer flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-stone-500" />
              {tr(language, 'គាំទ្រកម្មវិធីធនាគារទូទាំងកម្ពុជា', 'Compatible with Cambodian banking apps', '支持柬埔寨各大银行应用扫码')}
            </h4>
            <p className="text-[11px] text-stone-500 font-khmer leading-normal">
              {tr(
                language,
                'អាចស្កេនតាមរយៈ ABA Mobile, Bakong App, ACLEDA, Wing, TrueMoney និងកម្មវិធីធនាគារសមាជិក Bakong ទាំងអស់។',
                'Scan with ABA Mobile, Bakong, ACLEDA, Wing, or any member banking app on the Bakong network.',
                '支持使用 ABA Mobile、Bakong、ACLEDA、Wing 等所有接入 Bakong 网络的银行应用扫码支付。'
              )}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 flex justify-between items-center text-xs text-stone-500 font-khmer">
          <span>{tr(language, 'ប្រព័ន្ធទូទាត់ស្តង់ដារ KHQR', 'Official KHQR Standard', '官方 KHQR 标准支付')}</span>
          <button
            onClick={() => setIsSupportModalOpen(false)}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl transition-colors font-medium cursor-pointer"
          >
            {tr(language, 'បិទ', 'Close', '关闭')}
          </button>
        </div>
      </div>
    </div>
  );
};
