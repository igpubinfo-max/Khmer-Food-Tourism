import React from 'react';
import { useApp, ActiveTab } from '../context/AppContext';
import { Home, Utensils, Store, Compass, BookOpen, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, language } = useApp();

  const navItems: Array<{ id: ActiveTab; labelKh: string; labelEn: string; labelZh: string; icon: React.ReactNode }> = [
    { id: 'home', labelKh: 'ទំព័រដើម', labelEn: 'Home', labelZh: '首页', icon: <Home className="w-5 h-5" /> },
    { id: 'food', labelKh: 'មុខម្ហូប', labelEn: 'Food', labelZh: '美食', icon: <Utensils className="w-5 h-5" /> },
    { id: 'restaurants', labelKh: 'ភោជនីយដ្ឋាន', labelEn: 'Shops', labelZh: '餐厅', icon: <Store className="w-5 h-5" /> },
    { id: 'tourism', labelKh: 'ទេសចរណ៍', labelEn: 'Travel', labelZh: '旅游', icon: <Compass className="w-5 h-5" /> },
    { id: 'guide', labelKh: 'ណែនាំ', labelEn: 'Guide', labelZh: '指南', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'profile', labelKh: 'គណនី', labelEn: 'Profile', labelZh: '我的', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
      <div className="max-w-md mx-auto px-2 py-1 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const isGuide = item.id === 'guide';
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl transition-all duration-150 relative cursor-pointer ${
                isGuide
                  ? isActive
                    ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-yellow-500 text-slate-950 font-black scale-105 shadow-md shadow-amber-500/35 ring-2 ring-amber-400/90'
                    : 'bg-amber-400/20 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400/80 dark:border-amber-400/60 font-extrabold shadow-xs hover:bg-amber-400/35'
                  : isActive
                  ? 'text-[#064E3B] dark:text-emerald-400 font-bold scale-105 bg-emerald-50 dark:bg-emerald-950/50'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium'
              }`}
            >
              {isGuide && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white dark:border-slate-900 animate-pulse" />
              )}
              <div className="relative">
                {item.icon}
                {isActive && (
                  <span
                    className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                      isGuide ? 'bg-slate-950' : 'bg-[#059669] dark:bg-emerald-400'
                    }`}
                  />
                )}
              </div>
              <span className="text-[11px] sm:text-xs font-bold mt-1 tracking-tight leading-none">
                {language === 'km' ? item.labelKh : language === 'zh' ? item.labelZh : item.labelEn}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
