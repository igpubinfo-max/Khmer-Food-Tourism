import React from 'react';
import { X, ShieldCheck, Lock, Trash2, Globe, Mail, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { tr } from '../utils/i18n';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  const { language, currentUser, logout, showToast } = useApp();

  if (!isOpen) return null;

  const handleDeleteAccount = () => {
    if (
      window.confirm(
        tr(
          language,
          'តើអ្នកពិតជាចង់លុបគណនី និងទិន្នន័យផ្ទាល់ខ្លួនរបស់អ្នកចេញពីប្រព័ន្ធមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។',
          'Are you sure you want to permanently delete your account and personal data? This cannot be undone.',
          '您确定要永久删除您的账号和个人数据吗？此操作无法撤销。'
        )
      )
    ) {
      logout();
      showToast(
        tr(
          language,
          'គណនី និងទិន្នន័យត្រូវបានលុបជោគជ័យ',
          'Account and data deleted successfully',
          '账号与个人数据已成功删除'
        ),
        'success'
      );
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
                {tr(language, 'គោលការណ៍ឯកជនភាព & សុវត្ថិភាព', 'Privacy Policy & Data Safety', '隐私政策与数据安全')}
              </h3>
              <p className="text-[10px] text-emerald-200 font-khmer">
                {tr(
                  language,
                  'រសជាតិ និងទេសចរណ៍កម្ពុជា • អនុលោមតាមស្តង់ដារសុវត្ថិភាព',
                  'Cambodia Flavors & Tourism • Google Play Compliant',
                  '柬埔寨风味与旅游 • 符合 Google Play 规范'
                )}
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
              <span className="font-bold">
                {tr(language, 'ការសន្យាសុវត្ថិភាពទិន្នន័យ៖', 'Our Privacy Commitment:', '我们的隐私安全承诺：')}
              </span>{' '}
              {tr(
                language,
                'កម្មវិធីយើងខ្ញុំមិនលក់ មិនចែកចាយ ឬជួញដូរទិន្នន័យឯកជនរបស់អ្នកប្រើប្រាស់ទៅឱ្យតតិយជនឡើយ។ រាល់ការតភ្ជាប់ប្រើប្រាស់បច្ចេកវិទ្យាការពារការអ៊ិនគ្រីបកម្រិតខ្ពស់។',
                'We do not sell, trade, or distribute your private data. All network communications are encrypted via HTTPS/TLS.',
                '我们绝不出售、交易或分发您的私人数据。所有网络通信均采用 HTTPS/TLS 加密保护。'
              )}
            </div>
          </div>

          {/* Section 1 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              <span>{tr(language, '១. ព័ត៌មានដែលយើងប្រមូល', '1. Information We Collect', '1. 我们收集的信息')}</span>
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-5 whitespace-pre-line">
              {tr(
                language,
                '• ព័ត៌មានគណនី៖ ឈ្មោះ អ៊ីមែល តួនាទីអ្នកប្រើប្រាស់ និងរូបតំណាង។\n• ព័ត៌មានភោជនីយដ្ឋាន៖ ឈ្មោះហាង អាសយដ្ឋាន លេខទូរស័ព្ទទំនាក់ទំនង រូបភាពមុខម្ហូប និងម៉ោងបើកលក់ (ដែលម្ចាស់ហាងស្ម័គ្រចិត្តចុះបញ្ជី)។\n• ចំណូលចិត្ត៖ មុខម្ហូប និងកន្លែងទេសចរណ៍ដែលអ្នកប្រើប្រាស់បានរក្សាទុក។',
                '• Account Data: Name, email, role, and avatar.\n• Restaurant Data: Shop name, public address, phone, menu photos, and operating hours submitted voluntarily by owners.\n• User Preferences: Saved favorite dishes and destinations.',
                '• 账号数据：姓名、电子邮箱、用户角色及头像。\n• 餐厅数据：商家自愿提交的店铺名称、公开地址、联系电话、菜品图片与营业时间。\n• 用户偏好：收藏的菜品与旅游景点。'
              )}
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              <span>{tr(language, '២. ការប្រើប្រាស់សិទ្ធិទូរស័ព្ទ', '2. Device Permissions', '2. 设备权限使用说明')}</span>
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-5 whitespace-pre-line">
              {tr(
                language,
                '• កាមេរ៉ា និងរូបភាព៖ ប្រើសម្រាប់តែពេលម្ចាស់ហាងថតរូបម្ហូប ឬជ្រើសរើសរូបភាពវិក្កយបត្រដើម្បីបង្ហោះចូលក្នុងប្រព័ន្ធប៉ុណ្ណោះ។\n• ទីតាំង៖ ប្រើដើម្បីបង្ហាញភោជនីយដ្ឋាន និងគោលដៅទេសចរណ៍នៅជិតអ្នក។ យើងមិនតាមដានទីតាំងរបស់អ្នកនៅពេលបិទកម្មវិធីឡើយ។',
                '• Camera & Storage: Used exclusively when voluntarily uploading restaurant photos or receipt previews.\n• Location: Used only for discovering nearby restaurants and attractions.',
                '• 相机与相册：仅在您主动上传餐厅照片或付款凭证截图时使用。\n• 位置信息：仅用于查找附近的餐厅与旅游景点，关闭应用后不会后台追踪您的位置。'
              )}
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              <span>{tr(language, '៣. សុវត្ថិភាព និងការរក្សាទុកទិន្នន័យ', '3. Security & Storage', '3. 数据安全与存储')}</span>
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-5 whitespace-pre-line">
              {tr(
                language,
                '• ពាក្យសម្ងាត់ត្រូវបានការពារដោយបច្ចេកវិទ្យាអ៊ិនគ្រីបកម្រិតខ្ពស់។\n• ការពារការវាយលុកដោយចាក់សោបណ្តោះអាសន្នក្រោយវាយខុសច្រើនដង។\n• រាល់ការបញ្ជូនទិន្នន័យត្រូវបានការពារដោយសុវត្ថិភាព។',
                '• Passwords are protected via PBKDF2-HMAC-SHA256 (100,000 rounds).\n• Brute-force defense with 15-minute lockouts.\n• Cleartext HTTP strictly disabled via Android Network Security Config.',
                '• 密码采用 PBKDF2-HMAC-SHA256（100,000 次迭代）加密保护。\n• 防暴力破解保护机制。\n• 全程启用 HTTPS 安全传输配置。'
              )}
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-1.5">
            <h4 className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              <span>{tr(language, '៤. សមាជិកភាព VIP និងការផ្សព្វផ្សាយហាង', '4. VIP Membership & Store Listings', '4. VIP 会员与店铺登记')}</span>
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-5">
              {tr(
                language,
                'ការភ្ជាប់សមាជិកភាព VIP និងការចុះបញ្ជីហាងត្រូវបានផ្ទៀងផ្ទាត់យ៉ាងត្រឹមត្រូវ។ យើងមិនរក្សាទុកលេខកាតឥណទាន ឬព័ត៌មានសម្ងាត់ធនាគាររបស់អ្នកនៅក្នុងកម្មវិធីឡើយ។',
                'VIP membership and merchant listings are verified securely. No credit card numbers or private banking credentials are stored on the device.',
                'VIP 会员与商家入驻均经过安全核验。应用内不会存储任何信用卡号或银行敏感凭据。'
              )}
            </p>
          </div>

          {/* Section 5: Account & Data Deletion */}
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
              <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{tr(language, '៥. សិទ្ធិលុបគណនី និងទិន្នន័យ', '5. Account & Data Deletion', '5. 账号与数据删除权利')}</span>
            </div>
            <p className="text-[11px] text-rose-900 dark:text-rose-200 leading-relaxed">
              {tr(
                language,
                'អ្នកប្រើប្រាស់មានសិទ្ធិលុបគណនី និងទិន្នន័យផ្ទាល់ខ្លួនរបស់ខ្លួនចេញពីប្រព័ន្ធបានគ្រប់ពេលវេលា។',
                'In accordance with Google Play and Apple App Store policies, you can permanently delete your account and personal data at any time.',
                '根据应用商店隐私政策，您可以随时永久删除您的账号和个人数据。'
              )}
            </p>

            {currentUser && (
              <button
                onClick={handleDeleteAccount}
                className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {tr(language, 'លុបគណនី និងទិន្នន័យរបស់ខ្ញុំឥឡូវនេះ', 'Delete My Account & Data Now', '立即删除我的账号与数据')}
                </span>
              </button>
            )}
          </div>

          {/* Developer Contact */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] space-y-1 text-slate-500">
            <p className="font-bold text-[#0F172A] dark:text-white">
              {tr(language, 'ទំនាក់ទំនងអ្នកអភិវឌ្ឍន៍៖', 'Developer & Support Contact:', '开发者与客服联系方式：')}
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
            {tr(language, 'យល់ព្រម និងបិទ', 'Close', '同意并关闭')}
          </button>
        </div>
      </div>
    </div>
  );
};
