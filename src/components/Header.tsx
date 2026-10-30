import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MoreVertical, Camera, Download, Heart, LayoutGrid, RefreshCw, Shield, Bell } from 'lucide-react';
import { openSmartHub } from '../utils/smartHub';
import { Capacitor } from '@capacitor/core';
import { APP_VERSION } from '../types';

export const Header: React.FC = () => {
  const {
    language,
    setLanguage,
    setActiveTab,
    showToast,
    setIsQrScannerModalOpen,
    setIsInstallModalOpen,
    setIsSupportModalOpen,
    setIsNotificationsModalOpen,
    unreadNotificationsCount,
    setIsAdminLoginModalOpen,
    setIsAdminOpen,
    currentUser,
  } = useApp();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Hide "Install App" automatically when already running as the native app / installed PWA
  const isAppInstalled = (() => {
    try {
      if (Capacitor.isNativePlatform()) return true;
      if (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) return true;
      if ((navigator as unknown as { standalone?: boolean }).standalone) return true;
    } catch {
      // ignore
    }
    return false;
  })();

  const isKm = language === 'km';
  const isZh = language === 'zh';

  return (
    <header className="sticky top-0 z-40 bg-[#064E3B] text-white shadow-md pt-[env(safe-area-inset-top,0px)] border-b border-[#047857]">
      {/* Main Bar */}
      <div className="max-w-md mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Brand */}
        <div
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 cursor-pointer group min-w-0 flex-1"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white p-0.5 shadow-md flex items-center justify-center border border-emerald-300/60 shrink-0 overflow-hidden">
            <img src="/icon-192.png?v=2.4.1" alt="Discover Cambodia" className="w-full h-full rounded-[13px] object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="font-moul text-[10.5px] sm:text-xs tracking-wide text-white leading-snug drop-shadow-sm truncate">
                {isKm
                  ? 'ស្វែងយល់អាហារ និងទេសចរណ៍កម្ពុជា'
                  : isZh
                  ? '探索柬埔寨美食与旅游'
                  : 'Discover Cambodia Food & Tourism'}
              </h1>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-950/70 text-emerald-200 font-mono text-[8px] sm:text-[9px] font-bold border border-emerald-400/30 shrink-0">
                {APP_VERSION}
              </span>
              <p className="text-[10px] sm:text-[11px] text-emerald-200/95 font-medium truncate">
                {isKm
                  ? 'ភ្លក្សរសជាតិកម្ពុជា • ស្វែងយល់ទឹកដីកម្ពុជា'
                  : isZh
                  ? '品味柬埔寨 · 探索柬埔寨'
                  : 'Taste Cambodia. Explore Cambodia.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* 3-Language Selector (ខ្មែរ / EN / 中文) */}
          <div className="flex items-center gap-0.5 bg-[#053F30]/95 p-0.5 rounded-full border border-emerald-400/40 shadow-xs shrink-0">
            {(['km', 'en', 'zh'] as const).map((langOption) => {
              const isSelected = language === langOption;
              const label = langOption === 'km' ? 'ខ្មែរ' : langOption === 'en' ? 'EN' : '中文';
              return (
                <button
                  key={langOption}
                  type="button"
                  onClick={() => {
                    setLanguage(langOption);
                    showToast(
                      langOption === 'km'
                        ? '🇰🇭 បានប្តូរទៅជា ភាសាខ្មែរ'
                        : langOption === 'zh'
                        ? '🇨🇳 已切换为 简体中文'
                        : '🇬🇧 Switched to English',
                      'info'
                    );
                  }}
                  className={`px-1.5 sm:px-2 h-6 sm:h-7 rounded-full text-[9px] sm:text-[11px] font-black transition-all active:scale-95 shrink-0 cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-emerald-100 hover:text-white hover:bg-emerald-800/70'
                  }`}
                  title={isKm ? 'ប្តូរភាសា' : isZh ? '切换语言' : 'Switch Language'}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Smart Menu: dish tags + travel & food tools */}
          <button
            type="button"
            onClick={() => openSmartHub()}
            className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center shadow-md ring-2 ring-white/30 transition-all active:scale-95 shrink-0 cursor-pointer"
            title={isKm ? 'ម៉ឺនុយឆ្លាតវៃ' : isZh ? '精选菜单' : 'Smart Menu'}
            aria-label={isKm ? 'ម៉ឺនុយឆ្លាតវៃ' : isZh ? '精选菜单' : 'Smart Menu'}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
          </button>

          {/* Overflow "more" menu: Notifications, Scan QR, Update/Install App, Support, Admin */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsMenuOpen((v) => !v)}
              className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors border shrink-0 cursor-pointer ${
                isMenuOpen
                  ? 'bg-white text-[#064E3B] border-white shadow-xs'
                  : 'bg-[#065F46]/80 hover:bg-[#065F46] text-emerald-100 border-emerald-500/40'
              }`}
              title={isKm ? 'ម៉ឺនុយបន្ថែម' : isZh ? '更多' : 'More'}
              aria-label={isKm ? 'ម៉ឺនុយបន្ថែម' : isZh ? '更多' : 'More'}
              aria-expanded={isMenuOpen}
            >
              <MoreVertical className="w-4 h-4 shrink-0" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#064E3B]" />
              )}
            </button>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden font-khmer">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsNotificationsModalOpen(true);
                    }}
                    className="w-full min-h-[44px] px-4 flex items-center justify-between gap-3 text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-slate-700 text-left"
                  >
                    <span className="flex items-center gap-3">
                      <Bell className="w-4 h-4 text-rose-500" />
                      <span>{isKm ? 'ការជូនដំណឹង' : isZh ? '消息通知' : 'Notifications'}</span>
                    </span>
                    {unreadNotificationsCount > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
                        {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsQrScannerModalOpen(true);
                    }}
                    className="w-full min-h-[44px] px-4 flex items-center gap-3 text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-slate-700 text-left border-t border-slate-100 dark:border-slate-700"
                  >
                    <Camera className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span>{isKm ? 'ស្កេន QR កូដ' : isZh ? '扫描二维码' : 'Scan QR Code'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsInstallModalOpen(true);
                    }}
                    className="w-full min-h-[44px] px-4 flex items-center gap-3 text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-slate-700 text-left border-t border-slate-100 dark:border-slate-700"
                  >
                    {isAppInstalled ? (
                      <RefreshCw className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    ) : (
                      <Download className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    )}
                    <span>
                      {isAppInstalled
                        ? isKm
                          ? 'ពិនិត្យអាប់ដេតកម្មវិធី'
                          : isZh
                          ? '检查应用更新'
                          : 'Check for Updates'
                        : isKm
                        ? 'ដំឡើងកម្មវិធី'
                        : isZh
                        ? '安装应用'
                        : 'Install App'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsSupportModalOpen(true);
                    }}
                    className="w-full min-h-[44px] px-4 flex items-center gap-3 text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-slate-700 text-left border-t border-slate-100 dark:border-slate-700"
                  >
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    <span>{isKm ? 'ជួយឧបត្ថម្ភកម្មវិធី' : isZh ? '支持我们' : 'Support Us'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (currentUser?.role === 'admin') {
                        setIsAdminOpen(true);
                      } else {
                        setIsAdminLoginModalOpen(true);
                      }
                    }}
                    className="w-full min-h-[44px] px-4 flex items-center gap-3 text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-slate-700 text-left border-t border-slate-100 dark:border-slate-700"
                  >
                    <Shield className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span>
                      {currentUser?.role === 'admin'
                        ? isKm
                          ? 'ផ្ទាំងគ្រប់គ្រងរដ្ឋបាល'
                          : isZh
                          ? '管理后台'
                          : 'Admin Dashboard'
                        : isKm
                        ? 'ច្រកចូលរដ្ឋបាល'
                        : isZh
                        ? '管理员登录'
                        : 'Admin Login'}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
