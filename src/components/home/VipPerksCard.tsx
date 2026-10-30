import React from 'react';
import { Crown, Store, Wand2, BarChart3, ChevronRight } from 'lucide-react';
import type { Language } from '../../types';
import { tr } from '../../utils/i18n';
import { headingFont } from './homeUtils';

interface Props {
  language: Language;
  onLearnMore: () => void;
}

/**
 * The single, calm VIP invitation on Home. It leads with concrete benefits (no prices, no urgency,
 * no glow animations) and is shown only to non-VIP users, once, near the end of the page.
 */
export const VipPerksCard: React.FC<Props> = ({ language, onLearnMore }) => {
  const perks = [
    {
      Icon: Store,
      title: tr(language, 'ផ្សព្វផ្សាយហាងរបស់អ្នក', 'Promote your own shop', '推广您的店铺'),
      desc: tr(language, 'ស្លាក VIP មាស និងទីតាំងលេចធ្លោលើផែនទី', 'Gold badge and a highlighted map pin', '金色徽章与醒目的地图标记'),
    },
    {
      Icon: Wand2,
      title: tr(language, 'ឧបករណ៍ឆ្លាតវៃ', 'Smart food & trip tools', '智能美食与行程工具'),
      desc: tr(language, 'ញ៉ាំអ្វីល្អ ម៉ឺនុយសុខភាព និងផែនការដើរលេង AI', 'What to Eat, healthy menu and AI trip plans', '吃什么、健康菜单与 AI 行程规划'),
    },
    {
      Icon: BarChart3,
      title: tr(language, 'ស្ថិតិអ្នកទស្សនា', 'See who visits your shop', '查看访客数据'),
      desc: tr(language, 'ចំនួនមើល ហៅទូរស័ព្ទ និងចុចផែនទី', 'Views, calls and direction taps', '浏览、来电与导航点击统计'),
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#022c22] via-[#064E3B] to-[#0b1f1a] border border-amber-300/25 p-5 text-white shadow-lg">
      <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-200 to-amber-500 text-slate-950 flex items-center justify-center shadow">
          <Crown className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h3 className={`${headingFont(language)} text-[15px] leading-snug text-amber-100`}>
            {tr(language, 'ទទួលបានច្រើនជាងមុនជាមួយ VIP', 'Get more with VIP', '开通 VIP，体验更多')}
          </h3>
          <p className="text-xs text-emerald-100/85 mt-0.5">
            {tr(language, 'ជម្រើសសម្រាប់អ្នកដែលចង់ទទួលបានអត្ថប្រយោជន៍បន្ថែម', 'Optional extras for food lovers and shop owners', '为美食爱好者与店主准备的可选特权')}
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
        <span>{tr(language, 'មើលអត្ថប្រយោជន៍ VIP', 'See VIP benefits', '查看 VIP 特权')}</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </section>
  );
};
