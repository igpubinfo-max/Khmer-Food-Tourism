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
} from './icons/HandcraftedIcons';

const NAV_COUNT = 6;

const BottomNavInner: React.FC = () => {
  const { activeTab, setActiveTab, language } = useApp();

  // Profile is opened from the avatar button at the top-right of every page header.
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
  ];

  const activeIndex = navItems.findIndex((item) => item.id === activeTab);
  const hasActive = activeIndex >= 0;

  return (
    <nav
      id="kft-bottom-nav"
      aria-label={tr(language, 'ម៉ឺនុយមេខាងក្រោម', 'Primary bottom navigation', '底部主导航')}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      className="relative shrink-0 w-full z-30 bg-gradient-to-b from-[#0C332B] via-[#08251F] to-[#051814] text-slate-200 border-t border-slate-700/80 shadow-[0_-10px_28px_rgba(2,6,23,0.65)] select-none"
    >
      {/* Subtle luxury gold hairline highlight across top edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/55 to-transparent" />

      <div className="w-full max-w-6xl mx-auto px-1.5 sm:px-3 py-1.5">
        <div className="relative grid grid-cols-6">
          {/* Single sliding active pill (glides between tabs) */}
          <div
            aria-hidden="true"
            className="kft-nav-pill pointer-events-none absolute inset-y-0 left-0 p-[2px]"
            style={{
              width: `${100 / NAV_COUNT}%`,
              transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
              opacity: hasActive ? 1 : 0,
            }}
          >
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-b from-amber-400/25 via-amber-500/12 to-amber-500/5 border border-amber-400/50 shadow-[0_4px_14px_rgba(251,191,36,0.18)]">
              <span className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-7 h-1 rounded-full bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            </div>
          </div>

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
                    if (item.id === 'tourism' && typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('kft:tourism-menu-refresh'));
                    }
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className="group relative z-10 min-h-[54px] min-w-0 flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-2xl bg-transparent border-0 cursor-pointer focus:outline-none active:scale-95 transition-transform duration-150"
              >
                <div
                  className={`shrink-0 transition-all duration-200 ${
                    isActive ? 'text-amber-300 scale-110' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-[21px] h-[21px] shrink-0" />
                </div>
                <span
                  className={`kft-nav-label max-w-full truncate leading-[1.5] transition-colors duration-200 ${
                    isActive ? 'font-extrabold text-amber-300' : 'font-semibold text-slate-400 group-hover:text-slate-200'
                  }`}
                  style={{ fontSize: 'clamp(10.5px, 2.9vw, 12px)' }}
                >
                  {tr(language, item.labelKh, item.labelEn, item.labelZh)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .kft-nav-pill {
          transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .kft-nav-pill { transition: none; }
        }
      `}</style>
    </nav>
  );
};

export const BottomNav = React.memo(BottomNavInner);
