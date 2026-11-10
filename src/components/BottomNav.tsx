import React from 'react';
import { useApp, ActiveTab } from '../context/AppContext';
import { tr } from '../utils/i18n';
import {
  IconNavHome,
  IconNavFood,
  IconNavShop,
  IconNavHotel,
  IconNavTourism,
  IconNavGuide,
  IconNavProfile,
} from './icons/HandcraftedIcons';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, language } = useApp();

  const navItems: ReadonlyArray<{
    id: ActiveTab;
    labelKh: string;
    labelEn: string;
    labelZh: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'home', labelKh: 'ទំព័រដើម', labelEn: 'Home', labelZh: '首页', icon: IconNavHome },
    { id: 'food', labelKh: 'មុខម្ហូប', labelEn: 'Food', labelZh: '美食', icon: IconNavFood },
    { id: 'restaurants', labelKh: 'ហាងអាហារ', labelEn: 'Shop', labelZh: '餐厅', icon: IconNavShop },
    { id: 'hotels', labelKh: 'សណ្ឋាគារ', labelEn: 'Hotel', labelZh: '酒店', icon: IconNavHotel },
    { id: 'tourism', labelKh: 'ទេសចរណ៍', labelEn: 'Tourism', labelZh: '景点', icon: IconNavTourism },
    { id: 'guide', labelKh: 'មគ្គុទ្ទេសក៍', labelEn: 'Guide', labelZh: '指南', icon: IconNavGuide },
    { id: 'profile', labelKh: 'គណនី', labelEn: 'Profile', labelZh: '我的', icon: IconNavProfile },
  ];

  return (
    <nav
      id="kft-bottom-nav"
      aria-label={tr(language, 'ម៉ឺនុយមេខាងក្រោម', 'Primary bottom navigation', '底部主导航')}
      className="relative shrink-0 w-full z-30 bg-gradient-to-b from-[#0C332B] via-[#08251F] to-[#051814] text-slate-200 border-t border-slate-700/80 shadow-[0_-10px_28px_rgba(2,6,23,0.65)] select-none"
    >
      {/* Subtle luxury gold hairline highlight across top edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/55 to-transparent" />

      <div className="max-w-md md:max-w-5xl lg:max-w-6xl mx-auto grid grid-cols-7 gap-0.5 px-1 py-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                if (activeTab === item.id) {
                  const mainEl = document.getElementById('kft-main-scroll');
                  if (mainEl) mainEl.scrollTop = 0;
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`group relative min-h-[48px] min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-b from-amber-400/20 via-amber-500/10 to-amber-500/5 border border-amber-400/45 text-amber-300 shadow-[0_4px_14px_rgba(251,191,36,0.16)]'
                  : 'border border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 active:scale-95'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1.5 w-6 h-1 rounded-full bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              )}
              <div
                className={`p-1 rounded-xl shrink-0 transition-transform duration-200 ${
                  isActive
                    ? 'text-amber-300 scale-105'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <Icon className="w-[19px] h-[19px] shrink-0" />
              </div>
              <span
                style={{ fontSize: 'clamp(9.2px, 2.4vw, 11px)' }}
                className={`mt-0.5 leading-[1.6] py-0.5 text-center max-w-full tracking-tight font-khmer whitespace-nowrap ${
                  isActive ? 'font-extrabold text-amber-300' : 'font-medium text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {tr(language, item.labelKh, item.labelEn, item.labelZh)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
