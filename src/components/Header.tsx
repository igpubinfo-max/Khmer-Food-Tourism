import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Heart, Globe, Shield, User as UserIcon, X, QrCode, Download, ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    language, setLanguage, bookmarks, setActiveTab, 
    currentUser, setIsAuthModalOpen, setIsAdminOpen, setIsAdminLoginModalOpen,
    setIsInstallModalOpen, setIsSupportModalOpen,
    searchQuery, setSearchQuery, selectedProvince, setSelectedProvince
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
    <header className="sticky top-0 z-40 bg-[#0B3D2E]/98 backdrop-blur-md text-white shadow-md transition-all pt-[env(safe-area-inset-top,0px)] border-b border-[#14532D]">
      {/* Main Bar */}
      <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Brand */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#228B4E] via-[#14532D] to-[#0B3D2E] p-0.5 shadow-md flex items-center justify-center border border-[#A7DCA5]/30">
            <img src="/logo.svg" alt="Khmer Food" className="w-full h-full rounded-[10px] object-cover" />
          </div>
          <div>
            <h1 className="font-moul text-sm sm:text-base tracking-wide text-white leading-tight drop-shadow-sm">
              អាហារ & ទេសចរណ៍ខ្មែរ
            </h1>
            <p className="text-[10px] text-[#A7DCA5] font-medium tracking-wider uppercase">
              Khmer Food & Tourism
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          {/* App Install QR Button */}
          <button
            onClick={() => setIsInstallModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#14532D] hover:bg-[#228B4E] text-[#A7DCA5] hover:text-white text-[11px] font-bold border border-[#228B4E]/60 shadow-sm transition-all"
            title={isKm ? 'ដំឡើងកម្មវិធីលើទូរស័ព្ទ (Install App)' : 'Install App'}
          >
            <QrCode className="w-3.5 h-3.5 text-[#A7DCA5]" />
            <span className="hidden xs:inline">{isKm ? 'ដំឡើង' : 'Install'}</span>
          </button>

          {/* Support Our App Button */}
          <button
            onClick={() => setIsSupportModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#34A853] hover:bg-[#228B4E] text-white text-[11px] font-bold shadow-sm transition-all"
            title={isKm ? 'ជួយឧបត្ថម្ភគាំទ្រកម្មវិធី (Support App)' : 'Support App'}
          >
            <Heart className="w-3.5 h-3.5 fill-white text-white" />
            <span className="hidden xs:inline">{isKm ? 'ឧបត្ថម្ភ' : 'Support'}</span>
          </button>

          {/* Search Toggle */}
          <button
            onClick={() => setIsSearchVisible(!isSearchVisible)}
            className={`p-2 rounded-full transition-colors ${
              isSearchVisible || searchQuery ? 'bg-[#14532D] text-white ring-1 ring-[#A7DCA5]/50' : 'hover:bg-[#14532D] text-[#A7DCA5]'
            }`}
            title={isKm ? 'ស្វែងរក' : 'Search'}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(isKm ? 'en' : 'km')}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#14532D] hover:bg-[#228B4E] text-[11px] font-semibold text-[#A7DCA5] hover:text-white transition-colors border border-[#228B4E]/40"
            title="ផ្លាស់ប្តូរភាសា / Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-[#A7DCA5]" />
            <span>{isKm ? 'EN' : 'ខ្មែរ'}</span>
          </button>

          {/* Admin Action (Only visible when authenticated as admin) */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setIsAdminOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#14532D] to-[#228B4E] text-white border border-[#A7DCA5]/50 text-[11px] font-bold shadow hover:brightness-110"
              title="ផ្ទាំងគ្រប់គ្រងរដ្ឋបាល"
            >
              <Shield className="w-3.5 h-3.5 text-[#A7DCA5]" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Search & Province Filter Bar */}
      {isSearchVisible && (
        <div className="max-w-md mx-auto px-4 pb-3 pt-1 border-t border-[#14532D] animate-in slide-in-from-top-2 duration-150 bg-[#0B3D2E]">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#A7DCA5] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isKm ? 'ស្វែងរកម្ហូប, ហាងអាហារ, ឬកន្លែងដើរលេង...' : 'Search food, restaurant, or destination...'}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#14532D]/80 border border-[#228B4E] text-white placeholder-[#A7DCA5]/60 text-xs focus:outline-none focus:border-[#A7DCA5] transition"
              autoFocus
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-1 text-[#A7DCA5] hover:text-white"
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
                      ? 'bg-[#34A853] text-white font-bold shadow'
                      : 'bg-[#14532D] text-[#A7DCA5] hover:bg-[#228B4E] hover:text-white'
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
