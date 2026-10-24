import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Heart, Globe, Shield, User as UserIcon, X, QrCode, Download, ShieldCheck, Mail, Camera } from 'lucide-react';
import { APP_VERSION } from '../types';

export const Header: React.FC = () => {
  const { 
    language, setLanguage, bookmarks, setActiveTab, 
    currentUser, setIsAuthModalOpen, setIsAdminOpen, setIsAdminLoginModalOpen,
    setIsInstallModalOpen, setIsSupportModalOpen, setIsQrScannerModalOpen,
    searchQuery, setSearchQuery, selectedProvince, setSelectedProvince,
    showToast
  } = useApp();

  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
          {/* Scan QR Code Button */}
          <button
            onClick={() => setIsQrScannerModalOpen(true)}
            className="w-7 h-7 sm:w-auto sm:px-2 sm:py-1 rounded-full bg-emerald-800 hover:bg-emerald-700 text-white text-[10px] font-bold border border-emerald-400/50 shadow-xs flex items-center justify-center gap-1 transition-all active:scale-95 shrink-0"
            title={isKm ? 'ស្កេន QR កូដ (Scan QR Code)' : 'Scan QR Code'}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
            <span className="hidden sm:inline">{isKm ? 'ស្កេន' : 'Scan'}</span>
          </button>

          {/* App Install QR Button */}
          <button
            onClick={() => setIsInstallModalOpen(true)}
            className="w-7 h-7 sm:w-auto sm:px-2 sm:py-1 rounded-full bg-[#065F46] hover:bg-[#047857] text-white text-[10px] font-bold border border-emerald-500/40 shadow-xs flex items-center justify-center gap-1 transition-all active:scale-95 shrink-0"
            title={isKm ? 'ដំឡើងកម្មវិធីលើទូរស័ព្ទ (Install App)' : 'Install App'}
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
            <span className="hidden sm:inline">{isKm ? 'ដំឡើង' : 'Install'}</span>
          </button>

          {/* Heart & 3-Language Selector Area (ខ្មែរ / EN / 中文) */}
          <div className="flex items-center gap-0.5 bg-[#053F30]/90 p-0.5 rounded-full border border-emerald-400/40 shadow-xs shrink-0">
            {/* Heart / Support Button */}
            <button
              onClick={() => setIsSupportModalOpen(true)}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#10B981] hover:bg-[#059669] text-white flex items-center justify-center shadow-xs transition-all active:scale-95 shrink-0"
              title={isKm ? 'ជួយឧបត្ថម្ភគាំទ្រកម្មវិធី (Support App)' : isZh ? '支持我们 (Support App)' : 'Support App'}
            >
              <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white text-white shrink-0" />
            </button>

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

          {/* Admin Action (Only visible when authenticated as admin) */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setIsAdminOpen(true)}
              className="flex items-center gap-0.5 px-2 h-7 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-black shadow-xs transition-all active:scale-95 cursor-pointer font-khmer shrink-0"
              title={isKm ? 'ផ្ទាំងគ្រប់គ្រងរដ្ឋបាល (Admin Dashboard)' : 'Admin Dashboard'}
            >
              <Shield className="w-3 h-3 fill-slate-950 shrink-0" />
              <span className="hidden xs:inline">Admin</span>
            </button>
          )}
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
