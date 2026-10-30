import React from 'react';
import { useApp, ActiveTab } from '../context/AppContext';
import { tr } from '../utils/i18n';
import {
  IconNavHome,
  IconNavFood,
  IconNavShop,
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
    { id: 'tourism', labelKh: 'ទេសចរណ៍', labelEn: 'Tourism', labelZh: '景点', icon: IconNavTourism },
    { id: 'guide', labelKh: 'មគ្គុទ្ទេសក៍', labelEn: 'Guide', labelZh: '指南', icon: IconNavGuide },
    { id: 'profile', labelKh: 'គណនី', labelEn: 'Profile', labelZh: '我的', icon: IconNavProfile },
  ];

  return (
    <nav
      id="kft-bottom-nav"
      className="shrink-0 w-full z-30 bg-[#064E3B] text-white border-t border-emerald-400/20 shadow-[0_-4px_16px_rgba(0,0,0,0.28)]"
    >
      <div className="max-w-md mx-auto grid grid-cols-6 px-1 pt-1.5 pb-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (activeTab === item.id) {
                  const mainEl = document.getElementById('kft-main-scroll');
                  if (mainEl) mainEl.scrollTop = 0;
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`relative flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-colors duration-150 cursor-pointer ${
                isActive
                  ? 'text-amber-300'
                  : 'text-emerald-100/75 hover:text-white'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1.5 w-6 h-1 rounded-full bg-amber-400" />
              )}
              <div className={`p-1 rounded-xl transition-colors duration-150 ${isActive ? 'bg-white/15' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] sm:text-[11px] mt-0.5 leading-normal truncate max-w-full ${isActive ? 'font-extrabold text-amber-300' : 'font-semibold'}`}>
                {tr(language, item.labelKh, item.labelEn, item.labelZh)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
