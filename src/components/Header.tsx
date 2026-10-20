import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Heart, Globe, Shield, User as UserIcon, X, QrCode, Download, ShieldCheck, Mail } from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    language, setLanguage, bookmarks, setActiveTab, 
    currentUser, setIsAuthModalOpen, setIsAdminOpen, setIsAdminLoginModalOpen,
    setIsInstallModalOpen, setIsSupportModalOpen,
    searchQuery, setSearchQuery, selectedProvince, setSelectedProvince,
    showToast
  } = useApp();

  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const provinces = [
    { id: '', nameKh: 'គ្រប់ខេត្តក្រុង', nameEn: 'All Provinces' },
    { id: 'រាជធានីភ្នំពេញ', nameKh: 'ភ្នំពេញ', nameEn: 'Phnom Penh' },
    { id: 'ខេត្តសៀមរាប', nameKh: 'សៀមរាប', nameEn: 'Siem Reap' },
    { id: 'ខេត្តបាត់ដំបង', nameKh: 'បាត់ដំបង', nameEn: 'Battambang' },
    { id: 'ខេត្តកំពត', nameKh: 'កំពត', nameEn: 'Kampot' },
    { id: 'ខេត្តកែប', nameKh: 'កែប', nameEn: 'Kep' },
    { id: 'ខេត្តព្រះសីហនុ', nameKh: 'ព្រះសីហនុ', nameEn: 'Sihanoukville' },
    { id: 'ខេត្តមណ្ឌលគិរី', nameKh: 'មណ្ឌលគិរី', nameEn: 'Mondulkiri' },
  ];

  const isKm = language === 'km';

  return (
    <header className="sticky top-0 z-40 bg-[#064E3B] backdrop-blur-md text-white shadow-md transition-all pt-[env(safe-area-inset-top,0px)] border-b border-[#047857]">
      {/* Main Bar */}
      <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Brand */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#059669] to-[#064E3B] p-0.5 shadow-md flex items-center justify-center border border-emerald-400/30">
            <img src="/logo.svg" alt="Khmer Food" className="w-full h-full rounded-[10px] object-cover" />
          </div>
          <div>
            <h1 className="font-moul text-sm sm:text-base tracking-wide text-white leading-tight drop-shadow-sm">
              អាហារ & ទេសចរណ៍ខ្មែរ
            </h1>
            <p className="text-[10px] text-emerald-200 font-medium tracking-wider uppercase">
              Khmer Food & Tourism
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          {/* App Install QR Button */}
          <button
            onClick={() => setIsInstallModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#065F46] hover:bg-[#047857] text-white text-[11px] font-bold border border-emerald-500/40 shadow-xs transition-all"
            title={isKm ? 'ដំឡើងកម្មវិធីលើទូរស័ព្ទ (Install App)' : 'Install App'}
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-200" />
            <span className="hidden xs:inline">{isKm ? 'ដំឡើង' : 'Install'}</span>
          </button>

          {/* Support Our App Button */}
          <button
            onClick={() => setIsSupportModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-bold shadow-xs transition-all"
            title={isKm ? 'ជួយឧបត្ថម្ភគាំទ្រកម្មវិធី (Support App)' : 'Support App'}
          >
            <Heart className="w-3.5 h-3.5 fill-white text-white" />
            <span className="hidden xs:inline">{isKm ? 'ឧបត្ថម្ភ' : 'Support'}</span>
          </button>

          {/* Search Toggle */}
          <button
            onClick={() => setIsSearchVisible(!isSearchVisible)}
            className={`p-2 rounded-full transition-colors ${
              isSearchVisible || searchQuery ? 'bg-white text-[#064E3B] shadow-xs' : 'hover:bg-[#065F46] text-emerald-100'
            }`}
            title={isKm ? 'ស្វែងរក' : 'Search'}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(isKm ? 'en' : 'km')}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#065F46] hover:bg-[#047857] text-[11px] font-semibold text-emerald-100 hover:text-white transition-colors border border-emerald-500/40"
            title="ផ្លាស់ប្តូរភាសា / Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-200" />
            <span>{isKm ? 'EN' : 'ខ្មែរ'}</span>
          </button>

          {/* Admin Action (Only visible when authenticated as admin) */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setIsAdminOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#059669] to-[#047857] text-white border border-emerald-300/40 text-[11px] font-bold shadow-xs hover:brightness-110"
              title="ផ្ទាំងគ្រប់គ្រងរដ្ឋបាល"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Email Bar below action icons */}
      <div className="bg-[#055a42] text-white/95 text-[11px] px-4 py-1.5 flex items-center justify-between border-t border-emerald-500/30 font-khmer">
        <div className="flex items-center gap-1.5 truncate">
          <Mail className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          <span className="text-emerald-200 text-[10px]">{isKm ? 'មតិកែលម្អ (Feedback):' : 'Feedback:'}</span>
          <a 
            href="mailto:kftapp@gmail.com" 
            className="font-mono text-white underline hover:text-emerald-200 font-semibold text-[11px]"
          >
            kftapp@gmail.com
          </a>
        </div>
        <button
          type="button"
          onClick={() => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText('kftapp@gmail.com').then(() => {
                showToast(isKm ? 'បានចម្លងអ៊ីមែលជោគជ័យ!' : 'Email copied to clipboard!', 'success');
              }).catch(() => {});
            } else {
              showToast(isKm ? 'បានចម្លងអ៊ីមែលជោគជ័យ!' : 'Email copied to clipboard!', 'success');
            }
          }}
          className="text-[10px] bg-white/15 hover:bg-white/25 px-2 py-0.5 rounded-md text-white font-khmer transition shrink-0 ml-2 border border-white/20 active:scale-95"
          title={isKm ? 'ចម្លងអ៊ីមែល' : 'Copy Email'}
        >
          {isKm ? 'ចម្លង' : 'Copy'}
        </button>
      </div>

      {/* Expandable Search & Province Filter Bar */}
      {isSearchVisible && (
        <div className="max-w-md mx-auto px-4 pb-3 pt-1 border-t border-[#047857] animate-in slide-in-from-top-2 duration-150 bg-[#064E3B]">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-emerald-200 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isKm ? 'ស្វែងរកម្ហូប, ហាងអាហារ, ឬកន្លែងដើរលេង...' : 'Search food, restaurant, or destination...'}
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
                  {isKm ? prov.nameKh : prov.nameEn}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
