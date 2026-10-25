import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Search, X, Mail, MoreVertical, Camera, Download, Heart, LayoutGrid } from 'lucide-react';
import { openSmartHub } from '../utils/smartHub';
import { Capacitor } from '@capacitor/core';
import { APP_VERSION } from '../types';

export const Header: React.FC = () => {
  const { 
    language, setLanguage, setActiveTab, 
    searchQuery, setSearchQuery, selectedProvince, setSelectedProvince,
    showToast, setIsQrScannerModalOpen, setIsInstallModalOpen, setIsSupportModalOpen
  } = useApp();

  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const provinces = [
    { id: '', nameKh: 'គ្រប់ខេត្តក្រុង', nameEn: 'All Provinces', nameZh: '全部省市' },
    { id: 'រាជធានីភ្នំពេញ', nameKh: 'ភ្នំពេញ', nameEn: 'Phnom Penh', nameZh: '金边' },
    { id: 'ខេត្តសៀមរាប', nameKh: 'សៀមរាប', nameEn: 'Siem Reap', nameZh: '暹粒' },
    { id: 'ខេត្តបាត់ដំបង', nameKh: 'បាត់ដំបង', nameEn: 'Battambang', nameZh: '马德望' },
    { id: 'ខេត្តកំពត', nameKh: 'កំពត', nameEn: 'Kampot', nameZh: '贡布' },
    { id: 'ខេត្តកែប', nameKh: 'កែប', nameEn: 'Kep', nameZh: '白马' },
    { id: 'ខេត្តព្រះសីហនុ', nameKh: 'ព្រះសីហនុ', nameEn: 'Sihanoukville', nameZh: '西哈努克港' },
    { id: 'ខេត្តមណ្ឌលគិរី', nameKh: 'មណ្ឌលគិរី', nameEn: 'Mondulkiri', nameZh: '蒙多基里' },
  ];

  const isKm = language === 'km';
  const isZh = language === 'zh';

  return (
    <header className="sticky top-0 z-40 bg-[#064E3B] text-white shadow-md pt-[env(safe-area-inset-top,0px)] border-b border-[#047857]">
      {/* Main Bar */}
      <div className="max-w-md mx-auto px-2.5 sm:px-4 py-2 flex items-center justify-between gap-1.5">
        {/* Brand */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2 cursor-pointer group min-w-0 flex-1"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-0.5 shadow-md flex items-center justify-center border border-emerald-300/60 shrink-0 overflow-hidden">
            <img src="/icon-192.png?v=2.1.0" alt="Khmer Food" className="w-full h-full rounded-[9px] object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 flex-wrap">
              <h1 className="font-moul text-[12px] sm:text-sm tracking-wide text-white leading-tight drop-shadow-sm truncate">
                {isZh ? '高棉美食与旅游' : 'អាហារ & ទេសចរណ៍ខ្មែរ'}
              </h1>
              <span className="px-1 py-0.2 rounded bg-white/20 text-white font-mono text-[8px] sm:text-[9px] font-bold border border-white/25 shrink-0">
                {APP_VERSION}
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-emerald-200 font-medium tracking-wider uppercase truncate">
              {isZh ? 'Khmer Food & Tourism • 柬埔寨指南' : 'Khmer Food & Tourism'}
            </p>
          </div>
        </div>

        {/* Action icons — Responsive & Properly Aligned on Mobile */}
        <div className="flex items-center gap-1 shrink-0">
          {/* 3-Language Selector (ខ្មែរ / EN / 中文) */}
          <div className="flex items-center gap-0.5 bg-[#053F30]/90 p-0.5 rounded-full border border-emerald-400/40 shadow-xs shrink-0">
            {/* 3-Language Instant Switcher Pills: ខ្មែរ | EN | 中文 */}
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
                        ? '🇨🇳 已切换为 简体中文 (中文)'
                        : '🇬🇧 Switched to English',
                      'info'
                    );
                  }}
                  className={`px-1.5 h-6 sm:h-7 rounded-full text-[9px] sm:text-[10px] font-black transition-all active:scale-95 shrink-0 cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-emerald-100 hover:text-white hover:bg-emerald-800/70'
                  }`}
                  title="ប្តូរភាសា / Switch Language / 切换语言 (ខ្មែរ / EN / 中文)"
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Smart Menu: dish tags + travel & food tools in one place */}
          <button
            type="button"
            onClick={openSmartHub}
            className="w-9 h-9 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center shadow-md ring-2 ring-white/30 transition-all active:scale-95 shrink-0 cursor-pointer"
            title={isKm ? 'ម៉ឺនុយពិសេស & ជម្រើសម្ហូបសុខភាព' : isZh ? '智能菜单与健康饮食筛选' : 'Smart Menu & Healthy Filter'}
            aria-label={isKm ? 'ម៉ឺនុយពិសេស & ជម្រើសម្ហូបសុខភាព' : isZh ? '智能菜单与健康饮食筛选' : 'Smart Menu & Healthy Filter'}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
          </button>

          {/* Search Toggle */}
          <button
            onClick={() => {
              const nextState = !isSearchVisible;
              setIsSearchVisible(nextState);
              if (nextState) {
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }
            }}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors border shrink-0 ${
              isSearchVisible || searchQuery
                ? 'bg-white text-[#064E3B] border-white shadow-xs'
                : 'bg-[#065F46]/80 hover:bg-[#065F46] text-emerald-100 border-emerald-500/40'
            }`}
            title={isKm ? 'ស្វែងរក' : 'Search'}
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
          </button>

          {/* Single overflow "more" menu: Scan QR, Install App, Support */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsMenuOpen((v) => !v)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors border shrink-0 ${
                isMenuOpen
                  ? 'bg-white text-[#064E3B] border-white shadow-xs'
                  : 'bg-[#065F46]/80 hover:bg-[#065F46] text-emerald-100 border-emerald-500/40'
              }`}
              title={isKm ? 'ម៉ឺនុយបន្ថែម' : isZh ? '更多' : 'More'}
              aria-label={isKm ? 'ម៉ឺនុយបន្ថែម' : isZh ? '更多' : 'More'}
              aria-expanded={isMenuOpen}
            >
              <MoreVertical className="w-4 h-4 shrink-0" />
            </button>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden font-khmer">
                  <button
                    type="button"
                    onClick={() => { setIsMenuOpen(false); setIsQrScannerModalOpen(true); }}
                    className="w-full min-h-[44px] px-4 flex items-center gap-3 text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-slate-700 text-left"
                  >
                    <Camera className="w-4 h-4 text-emerald-700" />
                    <span>{isKm ? 'ស្កេន QR កូដ' : isZh ? '扫描二维码' : 'Scan QR Code'}</span>
                  </button>
                  {!isAppInstalled && (
                    <button
                      type="button"
                      onClick={() => { setIsMenuOpen(false); setIsInstallModalOpen(true); }}
                      className="w-full min-h-[44px] px-4 flex items-center gap-3 text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-slate-700 text-left border-t border-slate-100 dark:border-slate-700"
                    >
                      <Download className="w-4 h-4 text-emerald-700" />
                      <span>{isKm ? 'ដំឡើងកម្មវិធី' : isZh ? '安装应用' : 'Install App'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setIsMenuOpen(false); setIsSupportModalOpen(true); }}
                    className="w-full min-h-[44px] px-4 flex items-center gap-3 text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-slate-700 text-left border-t border-slate-100 dark:border-slate-700"
                  >
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    <span>{isKm ? 'ជួយឧបត្ថម្ភកម្មវិធី' : isZh ? '支持我们' : 'Support the App'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Email Bar below action icons */}
      <div className="bg-[#055a42] text-white/95 text-[11px] px-4 py-1.5 flex items-center justify-between border-t border-emerald-500/30 font-khmer">
        <div className="flex items-center gap-1.5 truncate">
          <Mail className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          <span className="text-emerald-200 text-[10px]">{isKm ? 'មតិកែលម្អ (Feedback):' : isZh ? '意见反馈：' : 'Feedback:'}</span>
          <a 
            href="mailto:kftcam@gmail.com" 
            className="font-mono text-white underline hover:text-emerald-200 font-semibold text-[11px]"
          >
            kftcam@gmail.com
          </a>
        </div>
        <button
          type="button"
          onClick={() => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText('kftcam@gmail.com').then(() => {
                showToast(isKm ? 'បានចម្លងអ៊ីមែលជោគជ័យ!' : isZh ? '邮箱地址已复制！' : 'Email copied to clipboard!', 'success');
              }).catch(() => {});
            } else {
              showToast(isKm ? 'បានចម្លងអ៊ីមែលជោគជ័យ!' : isZh ? '邮箱地址已复制！' : 'Email copied to clipboard!', 'success');
            }
          }}
          className="text-[10px] bg-white/15 hover:bg-white/25 px-2 py-0.5 rounded-md text-white font-khmer transition shrink-0 ml-2 border border-white/20 active:scale-95"
          title={isKm ? 'ចម្លងអ៊ីមែល' : isZh ? '复制邮箱' : 'Copy Email'}
        >
          {isKm ? 'ចម្លង' : isZh ? '复制' : 'Copy'}
        </button>
      </div>

      {/* Expandable Search & Province Filter Bar */}
      {isSearchVisible && (
        <div className="max-w-md mx-auto px-4 pb-3 pt-1 border-t border-[#047857] animate-in slide-in-from-top-2 duration-150 bg-[#064E3B]">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-emerald-200 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isKm ? 'ស្វែងរកម្ហូប, ហាងអាហារ, ឬកន្លែងដើរលេង...' : isZh ? '搜索美食、餐厅或旅游景点（支持高棉语/中文/英文）...' : 'Search food, restaurant, or destination...'}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#047857]/70 border border-emerald-400/60 text-white placeholder-emerald-200/70 text-xs focus:outline-none focus:border-white focus:bg-[#047857] transition"
              autoFocus
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-1 text-emerald-200 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick province chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mt-2 pt-1 pb-0.5">
            {provinces.map((prov) => {
              const active = selectedProvince === prov.nameKh || (!selectedProvince && prov.id === '');
              return (
                <button
                  key={prov.id || 'all'}
                  onClick={() => setSelectedProvince(prov.id === '' ? '' : prov.nameKh)}
                  className={`px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-all ${
                    active
                      ? 'bg-white text-[#064E3B] font-bold shadow-xs'
                      : 'bg-[#065F46] text-emerald-100 hover:bg-[#047857] hover:text-white'
                  }`}
                >
                  {isKm ? prov.nameKh : isZh ? prov.nameZh : prov.nameEn}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
