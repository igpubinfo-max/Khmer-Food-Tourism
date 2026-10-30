import React from 'react';
import { Crown, Store, Wand2, BarChart3, ChevronRight } from 'lucide-react';
import type { Language } from '../../types';
import { tr } from '../../utils/i18n';
import { headingFont } from './homeUtils';

interface Props {
  language: Language;
  onLearnMore: () => void;
}

const VipPerksCardInner: React.FC<Props> = ({ language, onLearnMore }) => {
  const perks = [
    {
      Icon: Store,
      title: tr(language, 'ផ្សព្វផ្សាយហាងរបស់អ្នក', 'Promote your own restaurant', '推广您的餐厅'),
      desc: tr(language, 'ស្លាក VIP មាស និងបង្ហាញទីតាំងលេចធ្លោលើផែនទី', 'Verified gold badge and highlighted map listing', '金色认证徽章与醒目地图标记'),
    },
    {
      Icon: Wand2,
      title: tr(language, 'ឧបករណ៍ម្ហូប និងផែនការដើរលេង', 'Food & travel tools', '美食与出行工具'),
      desc: tr(language, 'ណែនាំមុខម្ហូបប្រចាំថ្ងៃ ម៉ឺនុយសុខភាព និងរៀបចំផែនការដើរលេង', 'Daily dish ideas, healthy menu filters, and custom trip plans', '每日荐菜、健康轻食筛选与定制行程'),
    },
    {
      Icon: BarChart3,
      title: tr(language, 'ស្ថិតិអ្នកចូលមើលហាង', 'Track visitor engagement', '查看访客数据'),
      desc: tr(language, 'មើលចំនួនអ្នកចូលទស្សនា ហៅទូរស័ព្ទ និងចុចបង្ហាញផ្លូវ', 'Views, phone calls, and map direction taps', '浏览、来电与路线导航统计'),
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#022c22] via-[#064E3B] to-[#0b1f1a] border border-amber-300/25 p-5 text-white shadow-lg">
      <div className="relative flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-200 to-amber-500 text-slate-950 flex items-center justify-center shadow">
          <Crown className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h3 className={`${headingFont(language)} text-[15px] leading-snug text-amber-100`}>
            {tr(language, 'អត្ថប្រយោជន៍សមាជិក VIP', 'VIP Membership Perks', 'VIP 会员专属权益')}
          </h3>
          <p className="text-xs text-emerald-100/85 mt-0.5">
            {tr(language, 'សម្រាប់ម្ចាស់ហាងអាហារ និងអ្នកចូលចិត្តធ្វើដំណើរ', 'For restaurant owners and frequent travelers', '适合餐厅店主与深度旅行爱好者')}
          </p>
        </div>
      </div>

      <ul className="relative mt-4 space-y-3">
        {perks.map(({ Icon, title, desc }) => (
          <li key={title} className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 text-amber-300 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-bold text-white leading-snug">{title}</span>
              <span className="block text-xs text-emerald-100/80 leading-relaxed">{desc}</span>
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onLearnMore}
        className="relative mt-5 w-full min-h-[46px] rounded-2xl bg-white/10 hover:bg-white/15 border border-amber-300/50 text-amber-100 text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition cursor-pointer"
      >
        <span>{tr(language, 'មើលព័ត៌មានលម្អិត VIP', 'Explore VIP membership', '了解 VIP 会员详情')}</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </section>
  );
};

export const VipPerksCard = React.memo(VipPerksCardInner);
