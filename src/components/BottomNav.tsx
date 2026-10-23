import React from 'react';
import { useApp, ActiveTab } from '../context/AppContext';
import { Home, Utensils, Store, Compass, MessageSquare, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, language } = useApp();

  const navItems: Array<{ id: ActiveTab; labelKh: string; labelEn: string; icon: React.ReactNode }> = [
    { id: 'home', labelKh: 'ទំព័រដើម', labelEn: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'food', labelKh: 'មុខម្ហូប', labelEn: 'Food', icon: <Utensils className="w-5 h-5" /> },
    { id: 'restaurants', labelKh: 'ភោជនីយដ្ឋាន', labelEn: 'Shops', icon: <Store className="w-5 h-5" /> },
    { id: 'tourism', labelKh: 'ទេសចរណ៍', labelEn: 'Travel', icon: <Compass className="w-5 h-5" /> },
    { id: 'community', labelKh: 'សហគមន៍', labelEn: 'Feed', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'profile', labelKh: 'គណនី', labelEn: 'Profile', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
      <div className="max-w-md mx-auto px-2 py-1 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all duration-150 relative ${
                isActive
                  ? 'text-[#064E3B] dark:text-emerald-400 font-bold scale-105 bg-emerald-50 dark:bg-emerald-950/50'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium'
              }`}
            >
              <div className="relative">
                {item.icon}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#059669] dark:bg-emerald-400" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none">
                {language === 'km' ? item.labelKh : item.labelEn}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
