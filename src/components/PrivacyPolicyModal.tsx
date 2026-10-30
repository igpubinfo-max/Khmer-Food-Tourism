import React from 'react';
import { X, ShieldCheck, Lock, Trash2, Globe, Mail, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  const { language, currentUser, logout, showToast } = useApp();
  const isKm = language === 'km';

  if (!isOpen) return null;

  const handleDeleteAccount = () => {
    if (window.confirm(isKm 
      ? 'តើអ្នកពិតជាចង់លុបគណនី និងទិន្នន័យផ្ទាល់ខ្លួនរបស់អ្នកចេញពីប្រព័ន្ធមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។' 
      : 'Are you sure you want to permanently delete your account and personal data? This cannot be undone.')) {
      logout();
      showToast(isKm ? 'គណនី និងទិន្នន័យត្រូវបានលុបជោគជ័យ' : 'Account and data deleted successfully', 'success');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-lg max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#064E3B] text-white shrink-0 border-b border-[#047857]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-200 rounded-xl border border-emerald-400/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-moul text-sm text-white">
                {isKm ? 'គោលការណ៍ឯកជនភាព & សុវត្ថិភាព' : 'Privacy Policy & Data Safety'}
              </h3>
              <p className="text-[10px] text-emerald-200 font-khmer">
                {language === 'km' ? 'រសជាតិ និងទេសចរណ៍កម្ពុជា • Google Play Compliant' : language === 'zh' ? '柬埔寨风味与旅游 • 符合 Google Play 规范' : 'Cambodia Flavors & Tourism • Google Play Compliant'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs space-y-4 font-khmer text-slate-700 dark:text-slate-300 leading-relaxed">
          {/* Summary Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
            <div className="text-[11px] text-[#064E3B] dark:text-emerald-200">
              <span className="font-bold">{isKm ? 'ការសន្យាសុវត្ថិភាពទិន្នន័យ៖' : 'Our Privacy Commitment:'}</span>{' '}
              {isKm 
                ? 'កម្មវិធីយើងខ្ញុំមិនលក់ មិនចែកចាយ ឬជួញដូរទិន្នន័យឯកជនរបស់អ្នកប្រើប្រាស់ទៅឱ្យតតិយជនឡើយ។ រាល់ការតភ្ជាប់ប្រើប្រាស់បច្ចេកវិទ្យាការពារ HTTPS/TLS និងការអ៊ិនគ្រីបកម្រិតខ្ពស់។'
                : 'We do not sell, trade, or distribute your private data. All network communications are encrypted via HTTPS/TLS.'}
            </div>
          </div>

          {/* Section 1 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              <span>{isKm ? '១. ព័ត៌មានដែលយើងប្រមូល (Information We Collect)' : '1. Information We Collect'}</span>
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-5">
              {isKm 
                ? '• ព័ត៌មានគណនី៖ ឈ្មោះ អ៊ីមែល តួនាទីអ្នកប្រើប្រាស់ និងរូបតំណាង (Avatar)។\n• ព័ត៌មានភោជនីយដ្ឋាន៖ ឈ្មោះហាង អាសយដ្ឋាន លេខទូរស័ព្ទទំនាក់ទំនង រូបភាពមុខម្ហូប និងម៉ោងបើកលក់ (ដែលម្ចាស់ហាងស្ម័គ្រចិត្តចុះបញ្ជី)។\n• ចំណូលចិត្ត៖ មុខម្ហូប និងកន្លែងទេសចរណ៍ដែលអ្នកប្រើប្រាស់បានចុច Bookmark។'
                : '• Account Data: Name, email, role, and avatar.\n• Restaurant Data: Shop name, public address, phone, menu photos, and operating hours submitted voluntarily by owners.\n• User Preferences: Saved favorite dishes and destinations.'}
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              <span>{isKm ? '២. ការប្រើប្រាស់សិទ្ធិទូរស័ព្ទ (Device Permissions)' : '2. Device Permissions'}</span>
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-5">
              {isKm 
                ? '• CAMERA & STORAGE៖ ប្រើសម្រាប់តែពេលម្ចាស់ហាងថតរូបម្ហូប ឬជ្រើសរើសរូបភាពវិក្កយបត្រដើម្បីបង្ហោះចូលក្នុងប្រព័ន្ធប៉ុណ្ណោះ។\n• LOCATION (ទីតាំង)៖ ប្រើដើម្បីបង្ហាញភោជនីយដ្ឋាន និងគោលដៅទេសចរណ៍នៅជិតអ្នក (Nearby Discovery)។ យើងមិនតាមដានទីតាំងរបស់អ្នកនៅពេលបិទកម្មវិធីឡើយ។'
                : '• Camera & Storage: Used exclusively when voluntarily uploading restaurant photos or receipt previews.\n• Location: Used only for discovering nearby restaurants and attractions.'}
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              <span>{isKm ? '៣. សុវត្ថិភាព និងការរក្សាទុក (Security & Storage)' : '3. Security & Storage'}</span>
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-5">
              {isKm 
                ? '• ពាក្យសម្ងាត់រដ្ឋបាលត្រូវបានការពារដោយ PBKDF2-HMAC-SHA256 (100,000 Iterations)។\n• ការពារការវាយលុក Brute-Force ដោយចាក់សោ 15 នាទីក្រោយវាយខុស 5 ដង។\n• Network Security Config បិទ Cleartext HTTP និងអនុញ្ញាតតែ HTTPS គ្រប់ច្រកចេញចូល។'
                : '• Passwords are protected via PBKDF2-HMAC-SHA256 (100,000 rounds).\n• Brute-force defense with 15-minute lockouts.\n• Cleartext HTTP strictly disabled via Android Network Security Config.'}
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              <span>{isKm ? '៤. ការទូទាត់ប្រាក់ និងប្រូម៉ូសិន (Payment & Promotions)' : '4. Payment & Promotions'}</span>
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-5">
              {isKm 
                ? 'តម្លៃចុះបញ្ជីហាងប្រូម៉ូសិន $4.99 USD គឺជាសេវាកម្មពាណិជ្ជកម្មផ្សព្វផ្សាយហាងពិតប្រាកដ (B2B Merchant Listing)。 ការផ្ទៀងផ្ទាត់ត្រូវធ្វើឡើងដោយរដ្ឋបាលផ្លូវការមុននឹងធ្វើឱ្យហាងសកម្ម។ យើងមិនរក្សាទុកលេខកាតឥណទាន ឬគណនីសម្ងាត់ធនាគារក្នុងកម្មវិធីឡើយ។'
                : 'The $4.99 USD restaurant promotional registration fee is a physical business marketing service. Official admin verification is required before activation. No credit card or private bank credentials are stored on the device.'}
            </p>
          </div>

          {/* Section 5: Account & Data Deletion */}
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
              <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{isKm ? '៥. សិទ្ធិលុបគណនី និងទិន្នន័យ (Account & Data Deletion)' : '5. Account & Data Deletion'}</span>
            </div>
            <p className="text-[11px] text-rose-900 dark:text-rose-200 leading-relaxed">
              {isKm 
                ? 'អនុលោមតាមគោលការណ៍ Google Play Store និង Apple App Store អ្នកប្រើប្រាស់មានសិទ្ធិលុបគណនី និងទិន្នន័យផ្ទាល់ខ្លួនរបស់ខ្លួនបានគ្រប់ពេលវេលា។'
                : 'In accordance with Google Play and Apple App Store policies, you can permanently delete your account and personal data at any time.'}
            </p>

            {currentUser && (
              <button
                onClick={handleDeleteAccount}
                className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isKm ? 'លុបគណនី និងទិន្នន័យរបស់ខ្ញុំឥឡូវនេះ (Delete My Account)' : 'Delete My Account & Data Now'}</span>
              </button>
            )}
          </div>

          {/* Developer Contact */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] space-y-1 text-slate-500">
            <p className="font-bold text-[#0F172A] dark:text-white">
              {isKm ? 'ទំនាក់ទំនងអ្នកអភិវឌ្ឍន៍ (Developer Contact):' : 'Developer & Support Contact:'}
            </p>
            <p className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#059669]" />
              <span>support@khmerfoodtourism.com</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#059669]" />
              <span>https://github.com/igpubinfo-max/Khmer-Food-Tourism</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#064E3B] hover:bg-[#047857] text-white font-bold rounded-xl text-xs font-khmer transition shadow-xs"
          >
            {isKm ? 'យល់ព្រម និងបិទ' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
