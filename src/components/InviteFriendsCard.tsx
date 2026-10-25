import React from 'react';
import { Gift, Share2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { shareText } from '../utils/shareApp';
import { tr } from '../utils/i18n';

/** "Invite friends" card with a personal referral message (uses the signed-in user's name). */
export const InviteFriendsCard: React.FC = () => {
  const { language, currentUser, showToast } = useApp();
  const name = currentUser?.name?.trim();

  const handleInvite = () => {
    const message = tr(
      language,
      `🇰🇭 ខ្ញុំ${name ? ` (${name})` : ''} កំពុងប្រើកម្មវិធី «អាហារ & ទេសចរណ៍ខ្មែរ» — រកម្ហូបឆ្ងាញ់ ហាង និងកន្លែងទេសចរណ៍ និងមគ្គុទ្ទេសក៍អាហារសុខភាព។ មកសាកល្បងជាមួយខ្ញុំ! / I'm using “Khmer Food & Tourism” — join me!`,
      `🇰🇭 ${name ? `${name} here — ` : ''}I'm using “Khmer Food & Tourism” to find great Khmer dishes, restaurants, travel spots and a healthy food guide. Come try it with me! / ខ្ញុំកំពុងប្រើកម្មវិធី «អាហារ & ទេសចរណ៍ខ្មែរ»`,
      `🇰🇭 ${name ? `我是${name}，` : ''}我正在用“高棉美食与旅游”找美食、餐厅、景点和健康饮食指南，一起来试试吧！/ Khmer Food & Tourism`
    );
    shareText(
      language,
      tr(language, 'អាហារ & ទេសចរណ៍ខ្មែរ', 'Khmer Food & Tourism', '高棉美食与旅游'),
      message,
      showToast
    );
  };

  return (
    <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-50 via-white to-emerald-50 dark:from-slate-800 dark:via-slate-800 dark:to-emerald-950/40 border-2 border-amber-300/70 shadow-xs flex items-center gap-3 font-khmer">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center shadow-sm shrink-0">
        <Gift className="w-6 h-6" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-bold text-sm text-[#064E3B] dark:text-emerald-300">
          {tr(language, 'អញ្ជើញមិត្តភក្តិ', 'Invite friends', '邀请好友')}
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
          {tr(
            language,
            'ចែករំលែកកម្មវិធីជាមួយគ្រួសារ និងមិត្តភក្តិ',
            'Share the app with family & friends',
            '把应用分享给家人和朋友'
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={handleInvite}
        className="min-h-[44px] px-4 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-sm font-bold flex items-center gap-1.5 active:scale-95 transition cursor-pointer shrink-0"
      >
        <Share2 className="w-4 h-4" />
        <span>{tr(language, 'អញ្ជើញ', 'Invite', '邀请')}</span>
      </button>
    </div>
  );
};
