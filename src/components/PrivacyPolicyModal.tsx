import React from 'react';
import { X, ShieldCheck, Lock, Trash2, Globe, Mail, CheckCircle2, ArrowLeft, FileText, Smartphone, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { APP_VERSION_NAME, APP_BUILD_CODE } from '../types';
import { tr } from '../utils/i18n';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  const { language, setLanguage, currentUser, deleteUserAccount } = useApp();

  if (!isOpen) return null;

  // App Store Guideline 5.1.1(v): this button must REALLY delete the account (it used to only log the user out).
  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    const confirmed = window.confirm(
      tr(
        language,
        'តើអ្នកពិតជាចង់លុបគណនី និងទិន្នន័យផ្ទាល់ខ្លួនរបស់អ្នកជាអចិន្ត្រៃយ៍មែនទេ? ហាង សមាជិកភាព VIP និងកំណត់ត្រាទូទាត់ដែលភ្ជាប់នឹងគណនីនេះក៏នឹងត្រូវលុបផងដែរ ហើយមិនអាចយកមកវិញបានទេ។',
        'Are you sure you want to permanently delete your account and personal data? Restaurants you listed, your VIP membership and related payment records will also be removed. This cannot be undone.',
        '您确定要永久删除您的账号和个人数据吗？您发布的店铺、VIP 会员资格及相关付款记录也将被一并删除，且无法恢复。'
      )
    );
    if (!confirmed) return;
    const result = await deleteUserAccount(currentUser.id);
    if (result.success) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[92vh] bg-white dark:bg-slate-900 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border-0 sm:border border-slate-200 dark:border-slate-800"
        style={{
          paddingTop: 'var(--kft-safe-top, 0px)',
          paddingBottom: 'var(--kft-safe-bottom, 0px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top App Bar (Cambodia Tour style green bar with Back arrow + Title + Language Switcher) */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-[#064E3B] text-white shrink-0 border-b border-[#047857] shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h3 className="font-moul text-xs sm:text-sm text-white truncate">
                {tr(language, 'រសជាតិ និងទេសចរណ៍កម្ពុជា', 'Cambodia Flavors & Tourism', '柬埔寨风味与旅游')}
              </h3>
              <p className="text-[10px] text-emerald-200 font-khmer truncate">
                {tr(
                  language,
                  'គោលការណ៍ឯកជនភាពផ្លូវការ • Privacy Policy',
                  'Official Privacy Policy & Data Safety',
                  '官方隐私政策与数据安全声明'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Language Switcher inside Privacy Policy */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'km' ? 'en' : language === 'en' ? 'zh' : 'km')}
              className="px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-[10px] font-extrabold tracking-wide border border-white/25 transition cursor-pointer"
            >
              <span className={language === 'km' ? 'text-amber-300' : 'text-white/75'}>ខ្មែរ</span>
              <span className="text-white/40 mx-0.5">/</span>
              <span className={language === 'en' ? 'text-amber-300' : 'text-white/75'}>EN</span>
              <span className="text-white/40 mx-0.5">/</span>
              <span className={language === 'zh' ? 'text-amber-300' : 'text-white/75'}>中文</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs space-y-5 font-khmer text-slate-800 dark:text-slate-200 leading-relaxed">
          {/* Brand Logo + Version Header (Matches "CAMBODIA Ver. 4.0 — Privacy Policy" layout) */}
          <div className="flex items-end gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-col items-center shrink-0">
              <span className="text-[11px] font-black tracking-wider text-[#059669] dark:text-emerald-400 uppercase mb-1">
                CAMBODIA
              </span>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 p-[2px] shadow-md">
                <img
                  src="/icon-192.png?v=2.5.4"
                  alt="Cambodia Flavors & Tourism"
                  className="w-full h-full rounded-[14px] object-cover bg-[#064E3B]"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    if (!img.dataset.fallback) {
                      img.dataset.fallback = '1';
                      img.src = '/welcome-app-icon.png';
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[#064E3B] dark:text-emerald-300 font-bold text-[11px]">
                <span>Ver. {APP_VERSION_NAME}</span>
                <span className="text-emerald-400">•</span>
                <span>Build {APP_BUILD_CODE}</span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                {tr(language, 'គោលការណ៍ឯកជនភាព (Privacy Policy)', 'Privacy Policy', '隐私政策 (Privacy Policy)')}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tr(
                  language,
                  'រសជាតិ និងទេសចរណ៍កម្ពុជា • Cambodia Flavors & Tourism',
                  'Cambodia Flavors & Tourism • Official Mobile & Web Application',
                  '柬埔寨风味与旅游 • 官方移动与网页应用'
                )}
              </p>
            </div>
          </div>

          {/* 1. Who's Who */}
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-[13px]">
              <Users className="w-4 h-4 text-[#059669] shrink-0" />
              <span>{tr(language, '១. និយមន័យ (Who’s who)', 'Who’s who', '1. 适用对象 (Who’s who)')}</span>
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              {tr(
                language,
                'នៅក្នុងគោលការណ៍ឯកជនភាពនេះ៖',
                'In this Privacy Policy:',
                '在本隐私政策中：'
              )}
            </p>
            <ul className="space-y-1.5 pl-4 text-xs text-slate-700 dark:text-slate-300 list-disc">
              <li>
                {tr(
                  language,
                  '«អ្នក» (you) សំដៅលើអ្នក ដែលជាអ្នកប្រើប្រាស់ ឬម្ចាស់ហាងអាហារនៅលើគេហទំព័រ ឬកម្មវិធីទូរស័ព្ទនេះ។',
                  '“you” means you, the user or shop owner of the website or phone App.',
                  '“您” (you) 指使用本网站或手机应用程序的个人用户或餐厅商家。'
                )}
              </li>
              <li>
                {tr(
                  language,
                  '«យើង» «របស់យើង» និង «យើងខ្ញុំ» (we, our, us) សំដៅលើកម្មវិធី «រសជាតិ និងទេសចរណ៍កម្ពុជា» (Cambodia Flavors & Tourism) និងក្រុមការងារគ្រប់គ្រងប្រព័ន្ធផ្លូវការ។',
                  '“we”, “our” and “us” means Cambodia Flavors & Tourism (រសជាតិ និងទេសចរណ៍កម្ពុជា) and its official platform administration.',
                  '“我们” (we, our, us) 指“柬埔寨风味与旅游” (Cambodia Flavors & Tourism) 及其官方平台管理团队。'
                )}
              </li>
            </ul>
          </div>

          {/* 2. Purpose */}
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-[13px]">
              <FileText className="w-4 h-4 text-[#059669] shrink-0" />
              <span>{tr(language, '២. គោលបំណង (Purpose)', 'Purpose', '2. 政策目的 (Purpose)')}</span>
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {tr(
                language,
                'ដើម្បីផ្តល់ជូននូវសេវាកម្មស្វែងរកមុខម្ហូប ភោជនីយដ្ឋាន និងតំបន់ទេសចរណ៍ប្រកបដោយស្តង់ដារខ្ពស់បំផុត យើងអាចស្នើសុំឱ្យអ្នកផ្តល់ព័ត៌មានទំនាក់ទំនងផ្ទាល់ខ្លួន ឬព័ត៌មានហាង។ យើងជឿជាក់ថាវាមានសារៈសំខាន់ណាស់ដែលអ្នកត្រូវដឹងពីរបៀបដែលយើងថែរក្សាព័ត៌មានទាំងនោះ។ គោលការណ៍នេះពន្យល់ពីរបៀប និងមូលហេតុដែលយើងប្រមូលព័ត៌មានពីអ្នក របៀបដែលយើងរក្សាទុក និងពេលណាដែលយើងបង្ហាញព័ត៌មានហាងជាសាធារណៈជូនអ្នកប្រើប្រាស់ដទៃ។',
                'To deliver the highest standard of service, we will ask you to provide us personal contact information when registering an account or listing a shop. At all our products, we believe it is important that you know how we treat that information. This policy outlines how and why we collect information from you, how we store it, and when we might disclose information to other people.',
                '为了向您提供高标准的美食与旅游指南服务，在您注册账号或登记店铺时，我们会请您提供个人联系信息。我们认为让您了解我们如何处理这些信息至关重要。本政策阐述了我们如何及为何收集您的信息、如何存储信息以及在何种情况下向他人展示相关信息。'
              )}
            </p>
          </div>

          {/* 3. Collection and Storage */}
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-[13px]">
              <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
              <span>
                {tr(
                  language,
                  '៣. ការប្រមូល និងការរក្សាទុកទិន្នន័យ (Collection and storage)',
                  'Collection and storage',
                  '3. 信息收集与存储 (Collection and storage)'
                )}
              </span>
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {tr(
                language,
                'យើងនឹងប្រមូលព័ត៌មានអំពីអ្នក នៅពេលអ្នកចូលប្រើប្រាស់គេហទំព័រ និងកម្មវិធីទូរស័ព្ទរបស់យើង ឬបំពេញទម្រង់ចុះឈ្មោះគណនី និងទម្រង់បន្ថែមហាង (ឧទាហរណ៍៖ ឈ្មោះ លេខទូរស័ព្ទទំនាក់ទំនង អ៊ីមែល និងរូបភាពហាង/រូបតំណាង)។ យើងក៏ប្រមូលព័ត៌មាននៅពេលអ្នកប្រើប្រាស់មុខងារក្នុងកម្មវិធីផងដែរ (ដូចជា សារជំនួយ ព័ត៌មានទីតាំង GPS កាលបរិច្ឆេទ និងពេលវេលា)។ ប្រសិនបើអ្នកជ្រើសរើសមិនផ្តល់ព័ត៌មាននៅពេលយើងស្នើសុំ សេវាកម្ម ឬមុខងារមួយចំនួន (ដូចជាការរកហាងជិតអ្នក ឬការចុះបញ្ជីហាង) អាចនឹងមិនដំណើរការពេញលេញឡើយ។',
                'We will collect information about you when you visit our website and mobile application sites, or complete application forms (for instance, your contact number(s), email, profile photo, and shop details). We will also collect information about you when you use website and application(s) (such as support messages, location information, date, time). If you choose not to provide information when we ask for it, certain services and/or features may not work properly or we may not be able to provide you with certain personalized services.',
                '当您访问我们的网站和移动应用程序、填写注册或店铺申请表单（例如您的联系电话、电子邮箱、头像及店铺信息）时，我们会收集您的相关信息。当您使用网站和应用程序功能（如客服消息、GPS位置信息、日期和时间）时，我们也会收集相关信息。如果您选择不提供相关信息，部分个性化服务或功能可能无法正常运行。'
              )}
            </p>
          </div>

          {/* 4. Use */}
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-[13px]">
              <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
              <span>{tr(language, '៤. ការប្រើប្រាស់ព័ត៌មាន (Use)', 'Use', '4. 信息使用 (Use)')}</span>
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              {tr(
                language,
                'យើងរក្សាទុក និងប្រើប្រាស់ព័ត៌មានដែលយើងប្រមូលបានសម្រាប់គោលបំណងមួយចំនួន រួមមាន៖',
                'We hold and use the information we collect for a number of purposes, including:',
                '我们保存并使用所收集的信息用于以下目的：'
              )}
            </p>
            <ul className="space-y-1.5 pl-4 text-xs text-slate-700 dark:text-slate-300 list-disc">
              <li>
                {tr(
                  language,
                  'ផ្តល់ជូនអ្នកនូវសេវាកម្មដែលអ្នកស្នើសុំ (ការស្វែងរកមុខម្ហូប ហាងអាហារ ការនាំផ្លូវលើផែនទី និងតំបន់ទេសចរណ៍)។',
                  'Providing you with service(s) you request;',
                  '向您提供您所请求的服务（美食检索、餐厅导航、旅游景点指南等）；'
                )}
              </li>
              <li>
                {tr(
                  language,
                  'ត្រួតពិនិត្យការអនុលោមតាមលក្ខខណ្ឌនៃការប្រើប្រាស់កម្មវិធី រួមទាំងគោលការណ៍ប្រើប្រាស់ដោយស្មោះត្រង់ (Fair Use Policy) និងការផ្ទៀងផ្ទាត់ហាងពិត។',
                  'Monitoring compliance with the terms and conditions of application you use, including our Fair Use Policy;',
                  '监督您所使用应用程序的条款与条件遵守情况，包括我们的公平使用政策（Fair Use Policy）与真实店铺审核规范；'
                )}
              </li>
              <li>
                {tr(
                  language,
                  'ផ្តល់ជូនអ្នកនូវព័ត៌មានអំពីមុខងារថ្មីៗ ឬកំណែអាប់ដេតនៃកម្មវិធី។',
                  'Providing you with information on new application updates and features;',
                  '向您提供有关新应用功能及版本更新的信息；'
                )}
              </li>
              <li>
                {tr(
                  language,
                  'ឆ្លើយតប និងតាមដានរាល់សំណួរ បណ្តឹង ឬសំណើនានាដែលអ្នកបានដាក់ស្នើ (ដូចជាសំណើបន្ថែមហាង ឬសមាជិកភាព VIP)។',
                  'Responding and following up on any queries, complaints or requests you might have made;',
                  '回复并跟进您提出的任何咨询、投诉或申请（如新店入驻或 VIP 会员申请）；'
                )}
              </li>
              <li>
                {tr(
                  language,
                  'អនុលោមតាមសំណើផ្លូវច្បាប់ ឬស្ថាប័នមានសមត្ថកិច្ច ពាក់ព័ន្ធនឹងការការពារការក្លែងបន្លំ ការរក្សាសុវត្ថិភាពប្រព័ន្ធ ឬនីតិវិធីច្បាប់។',
                  'Complying with legal, governmental or regulatory agencies’ requests in connection with crime or fraud prevention or detection, or legal proceedings.',
                  '遵守法律法规或监管机构关于防范欺诈、网络安全及法律程序的要求。'
                )}
              </li>
            </ul>
          </div>

          {/* 5. Device Permissions */}
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-[13px]">
              <Smartphone className="w-4 h-4 text-[#059669] shrink-0" />
              <span>
                {tr(
                  language,
                  '៥. សិទ្ធិប្រើប្រាស់ទូរស័ព្ទ (Device Permissions)',
                  'Device Permissions',
                  '5. 设备权限说明 (Device Permissions)'
                )}
              </span>
            </h4>
            <ul className="space-y-1.5 pl-4 text-xs text-slate-700 dark:text-slate-300 list-disc">
              <li>
                {tr(
                  language,
                  'កាមេរ៉ា និងរូបភាព (Camera & Photos)៖ ប្រើសម្រាប់តែពេលអ្នកជ្រើសរើសរូបតំណាង (Profile) ថតរូបហាង/មុខម្ហូប ស្កេន QR ឬបង្ហោះរូបវិក្កយបត្រប៉ុណ្ណោះ។',
                  'Camera & Photos: Used only when you voluntarily upload a profile photo, shop/food photos, scan a QR code, or attach a payment receipt.',
                  '相机与相册：仅在您主动上传头像、店铺/菜品照片、扫描二维码或上传付款凭证时使用。'
                )}
              </li>
              <li>
                {tr(
                  language,
                  'ទីតាំង GPS (Location)៖ ប្រើដើម្បីបង្ហាញភោជនីយដ្ឋាន និងគោលដៅទេសចរណ៍នៅជិតអ្នក និងជ្រើសរើសទីតាំងហាងលើផែនទី។ យើងមិនតាមដានទីតាំងរបស់អ្នកនៅពេលបិទកម្មវិធីឡើយ។',
                  'Location (GPS): Used only while the app is open to discover nearby restaurants/attractions and pin shop locations on the map. No background tracking.',
                  '位置信息 (GPS)：仅在应用打开时用于查找附近餐厅/景点及地图选点，绝不在后台追踪您的位置。'
                )}
              </li>
            </ul>
          </div>

          {/* Privacy Commitment Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
            <div className="text-[11px] text-[#064E3B] dark:text-emerald-200">
              <span className="font-bold">
                {tr(language, 'ការសន្យាសុវត្ថិភាពទិន្នន័យ៖', 'Data Protection Commitment:', '数据安全承诺：')}
              </span>{' '}
              {tr(
                language,
                'កម្មវិធីយើងខ្ញុំមិនលក់ មិនចែកចាយ ឬជួញដូរទិន្នន័យឯកជនរបស់អ្នកប្រើប្រាស់ទៅឱ្យតតិយជនឡើយ។ រាល់ការតភ្ជាប់ប្រើប្រាស់បច្ចេកវិទ្យាការពារការអ៊ិនគ្រីប HTTPS/TLS កម្រិតខ្ពស់។ នៅលើប្រព័ន្ធ Android និង Web កម្មវិធីប្រើប្រាស់លេខសម្គាល់ឧបករណ៍ដែលបានបម្លែងកូដសម្ងាត់ (SHA-256 Device Hash) សម្រាប់ការពារការបន្លំប្រើប្រាស់សាកល្បង (Trial/Promo Fraud Prevention) តែមួយមុខគត់ ដោយមិនប្រើសម្រាប់តាមដានពាណិជ្ជកម្មឡើយ (ហើយសិទ្ធិសមាជិកដែលបានបង់ប្រាក់រួចនៅតែប្រើបន្តបានធម្មតាពេលប្តូរទូរស័ព្ទថ្មី)។',
                'We never sell, rent, or trade your personal information to third parties. All network traffic is encrypted via HTTPS/TLS. On Android and Web, a one-way cryptographic hash (SHA-256) of an app-scoped device identifier is processed strictly for fraud and one-time trial/promotion abuse prevention (never for advertising or cross-app tracking, and never collected on iOS; paid memberships remain portable when changing phones).',
                '我们绝不向第三方出售、出租或交易您的个人数据。所有网络通信均采用 HTTPS/TLS 加密保护。在 Android 与网页版上，应用仅使用单向加密（SHA-256）设备标识哈希值用于防范一次性免费试用/优惠滥用，绝不用于广告追踪（iOS 端不收集；已付费会员更换手机登录仍可正常使用）。'
              )}
            </div>
          </div>

          {/* 6. Account & Data Deletion */}
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
              <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                {tr(
                  language,
                  '៦. សិទ្ធិលុបគណនី និងទិន្នន័យ (Account & Data Deletion)',
                  'Account & Data Deletion',
                  '6. 账号与数据删除权利 (Account Deletion)'
                )}
              </span>
            </div>
            <p className="text-[11px] text-rose-900 dark:text-rose-200 leading-relaxed">
              {tr(
                language,
                'អនុលោមតាមគោលការណ៍ Google Play និង Apple App Store អ្នកប្រើប្រាស់មានសិទ្ធិលុបគណនី និងទិន្នន័យផ្ទាល់ខ្លួនរបស់ខ្លួនចេញពីប្រព័ន្ធបានគ្រប់ពេលវេលា។',
                'In accordance with Google Play and Apple App Store policies, you can permanently delete your account and personal data at any time.',
                '根据 Google Play 与 Apple App Store 政策，您可以随时永久删除您的账号和个人数据。'
              )}
            </p>

            {currentUser && (
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {tr(language, 'លុបគណនី និងទិន្នន័យរបស់ខ្ញុំឥឡូវនេះ', 'Delete My Account & Data Now', '立即删除我的账号与数据')}
                </span>
              </button>
            )}
          </div>

          {/* Developer Contact */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] space-y-1 text-slate-500 dark:text-slate-400">
            <p className="font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
              <span>{tr(language, 'ទំនាក់ទំនងផ្លូវការ៖', 'Official Support & Contact:', '官方支持与联系方式：')}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#059669]" />
              <span>igpub.info@gmail.com • support@khmerfoodtourism.com</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#059669]" />
              <span>https://github.com/igpubinfo-max/Khmer-Food-Tourism</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            Cambodia Flavors &amp; Tourism • Ver. {APP_VERSION_NAME}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#064E3B] hover:bg-[#047857] text-white font-bold rounded-xl text-xs font-khmer transition shadow-xs cursor-pointer"
          >
            {tr(language, 'យល់ព្រម និងបិទ', 'Agree & Close', '同意并关闭')}
          </button>
        </div>
      </div>
    </div>
  );
};
