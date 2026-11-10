import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  User as UserIcon,
  Menu,
  ArrowLeft,
  Camera,
  Send,
  X,
  QrCode,
  Heart,
  ShieldCheck,
  Shield,
} from 'lucide-react';
import { IconSmartAssistant } from './icons/HandcraftedIcons';
import { tr } from '../utils/i18n';
import { isNativeIosApp, isAdminAccount } from '../types';
import { resolveUserAvatarUrl, handleAvatarImageError } from '../utils/avatarHelper';

interface AngkorHeroTopHeaderProps {
  mode: 'home' | 'food';
  query?: string;
  onChangeQuery?: (val: string) => void;
  onAskAi?: (queryText?: string) => void;
  onOpenCameraAi?: () => void;
}

export const AngkorHeroTopHeader: React.FC<AngkorHeroTopHeaderProps> = ({
  mode,
  query = '',
  onChangeQuery,
  onAskAi,
  onOpenCameraAi,
}) => {
  const {
    language,
    setLanguage,
    setActiveTab,
    currentUser,
    setIsAuthModalOpen,
    setIsSupportModalOpen,
    setIsQrScannerModalOpen,
    setIsAiTripPlannerModalOpen,
    setIsNotificationsModalOpen,
    setIsAdminOpen,
    unreadNotificationsCount,
  } = useApp();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isAdmin = isAdminAccount(currentUser);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handlePointerOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerOutside);
    document.addEventListener('touchstart', handlePointerOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handlePointerOutside);
      document.removeEventListener('touchstart', handlePointerOutside);
    };
  }, [isMenuOpen]);

  const handleTriggerAskAi = () => {
    if (onAskAi) {
      onAskAi(query.trim());
    }
  };

  return (
    <div
      className={`relative w-full overflow-visible select-none ${
        mode === 'home' ? 'h-[268px] sm:h-[282px]' : 'h-[192px] sm:h-[206px]'
      }`}
      style={{ paddingTop: 'var(--kft-safe-top, 0px)' }}
    >
      {/* Full-Bleed Angkor Wat Sunrise & Lotus Pond Background (No Green Bar) */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="/welcome/angkor-lotus-hero.png"
          alt="Angkor Wat Cambodia"
          decoding="async"
          className="w-full h-full object-cover object-top"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (!img.dataset.fallback) {
              img.dataset.fallback = '1';
              img.src = '/welcome/angkor-sunrise-hero.png';
            }
          }}
        />
        {/* Subtle top sky contrast gradient so white title & icons are always crisp */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{
            background:
              'linear-gradient(180deg, rgba(15, 28, 75, 0.55) 0%, rgba(20, 40, 100, 0.22) 65%, rgba(20, 40, 100, 0) 100%)',
          }}
        />
      </div>

      {/* Top Overlay Header Row: Menu/Back + Real App Logo on Left + Title + Bell + Profile */}
      <div className="relative z-20 px-3 pt-2.5 flex items-center justify-between gap-2">
        {/* Left Side: Menu or Back Button + User's Real App Logo + App Name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {mode === 'food' ? (
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              aria-label={tr(language, 'ត្រឡប់ទៅទំព័រដើម', 'Back to Home', '返回首页')}
              className="w-9 h-9 rounded-full bg-black/25 hover:bg-black/40 border border-white/40 text-white flex items-center justify-center shrink-0 backdrop-blur-xs active:scale-95 transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((v) => !v)}
                aria-label={tr(language, 'ម៉ឺនុយបន្ថែម', 'Menu', '菜单')}
                className="w-9 h-9 rounded-full bg-black/25 hover:bg-black/40 border border-white/40 text-white flex items-center justify-center shrink-0 backdrop-blur-xs active:scale-95 transition cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              {isMenuOpen && (
                <div className="absolute left-0 mt-2 w-60 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white shadow-2xl border border-slate-700/90 py-1.5 z-50 font-khmer text-xs">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        (window as any).__kft_admin_tab = 'stats';
                        setIsAdminOpen(true);
                      }}
                      className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-white/10 text-left text-amber-300 font-bold transition cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{tr(language, 'ផ្ទាំងរដ្ឋបាលប្រព័ន្ធ (Admin)', 'System Admin Panel', '系统管理后台')}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsAiTripPlannerModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-white/10 text-left transition cursor-pointer"
                  >
                    <IconSmartAssistant className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-bold text-amber-200">
                      {tr(language, 'ជំនួយការឆ្លាតវៃ AI & រៀបចំដំណើរ', 'Smart AI & Trip Planner', 'AI 智能助手与行程规划')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsQrScannerModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-white/10 text-left transition cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold">
                      {tr(language, 'ស្កេន QR Code ហាងអាហារ', 'Scan Restaurant QR Code', '扫描餐厅二维码')}
                    </span>
                  </button>

                  {!isNativeIosApp() && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsSupportModalOpen(true);
                      }}
                      className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-white/10 text-left transition cursor-pointer"
                    >
                      <Heart className="w-4 h-4 text-rose-400 fill-rose-400 shrink-0" />
                      <span className="font-semibold">
                        {tr(language, 'គាំទ្រការអភិវឌ្ឍកម្មវិធី', 'Support App Development', '支持应用开发')}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      window.dispatchEvent(new CustomEvent('kft:open-privacy'));
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-white/10 text-left transition cursor-pointer border-t border-slate-800 mt-1 pt-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="font-semibold text-slate-300">
                      {tr(language, 'គោលការណ៍ឯកជនភាព', 'Privacy Policy', '隐私政策')}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* User's Real App Logo on the Left Side of Title */}
          <div
            onClick={() => {
              setActiveTab('home');
              const mainEl = document.getElementById('kft-main-scroll');
              if (mainEl) mainEl.scrollTop = 0;
            }}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
          >
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full border-2 border-white shadow-lg overflow-hidden bg-[#063124] shrink-0 ring-2 ring-amber-400/70 group-hover:scale-105 transition">
              <img
                src="/app-logo-v200.png"
                alt="រសជាតិ និងទេសចរណ៍កម្ពុជា"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = '1';
                    img.src = '/icon-192.png';
                  }
                }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <h1
                className="font-khmer font-extrabold text-[15px] sm:text-[17px] text-white leading-tight truncate"
                style={{ textShadow: '0 2px 6px rgba(0,0,0,0.65)' }}
              >
                {tr(language, 'រសជាតិ និងទេសចរណ៍កម្ពុជា', 'Cambodia Flavors & Tourism', '柬埔寨风味与旅游')}
              </h1>
              <p
                className="text-[11px] sm:text-xs font-bold text-white/95 truncate mt-0.5"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.65)' }}
              >
                Cambodia Flavors &amp; Tourism
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Notification Bell + Profile Icon */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsNotificationsModalOpen(true)}
            title={tr(language, 'ដំណឹងថ្មីៗ', 'Notifications', '最新通知')}
            aria-label={tr(language, 'ដំណឹងថ្មីៗ', 'Notifications', '最新通知')}
            className="relative w-9 h-9 rounded-full bg-black/25 hover:bg-black/40 border border-white/60 text-white flex items-center justify-center backdrop-blur-xs active:scale-95 transition cursor-pointer"
          >
            <Bell className="w-4 h-4 text-white" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border border-white">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (currentUser) {
                setActiveTab('profile');
              } else {
                setIsAuthModalOpen(true);
              }
            }}
            title={tr(language, 'គណនីរបស់ខ្ញុំ', 'My Account', '我的账户')}
            aria-label={tr(language, 'គណនីរបស់ខ្ញុំ', 'My Account', '我的账户')}
            className="w-9 h-9 rounded-full bg-black/25 hover:bg-black/40 border-2 border-white/80 text-white flex items-center justify-center overflow-hidden backdrop-blur-xs active:scale-95 transition cursor-pointer"
          >
            {currentUser ? (
              <img
                src={resolveUserAvatarUrl(currentUser)}
                alt={currentUser.name}
                onError={(e) => handleAvatarImageError(e, currentUser)}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Second Row on Right: Language Switcher Pill [ខ្មែរ / EN / 中文] (+ Admin shortcut if Admin) */}
      <div className="relative z-10 px-3 mt-1.5 flex items-center justify-end gap-2">
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              (window as any).__kft_admin_tab = 'stats';
              setIsAdminOpen(true);
            }}
            className="px-2.5 py-1 rounded-full bg-amber-400/95 hover:bg-amber-300 text-slate-950 font-khmer font-extrabold text-[10px] shadow-md flex items-center gap-1 cursor-pointer active:scale-95 transition"
          >
            <Shield className="w-3 h-3" />
            <span>{tr(language, 'ផ្ទាំងរដ្ឋបាល', 'Admin', '管理')}</span>
          </button>
        )}

        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/35 border border-white/65 backdrop-blur-xs text-[11px] font-extrabold text-white shadow-sm">
          <button
            type="button"
            onClick={() => setLanguage('km')}
            className={`cursor-pointer transition ${
              language === 'km' ? 'text-amber-300 font-black' : 'text-white/90 hover:text-white'
            }`}
          >
            ខ្មែរ
          </button>
          <span className="text-white/50">/</span>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`cursor-pointer transition ${
              language === 'en' ? 'text-amber-300 font-black' : 'text-white/90 hover:text-white'
            }`}
          >
            EN
          </button>
          <span className="text-white/50">/</span>
          <button
            type="button"
            onClick={() => setLanguage('zh')}
            className={`cursor-pointer transition ${
              language === 'zh' ? 'text-amber-300 font-black' : 'text-white/90 hover:text-white'
            }`}
          >
            中文
          </button>
        </div>
      </div>

      {/* Home Mode: Cream & Gold Ask AI Bar positioned inside the bottom of the Angkor Wat Hero */}
      {mode === 'home' && (
        <div className="absolute inset-x-3 bottom-7 z-20">
          <div
            style={{
              background: 'linear-gradient(180deg, #FFFDF5 0%, #FBE9A8 100%)',
              boxShadow: '0 6px 18px rgba(0, 0, 0, 0.35)',
            }}
            className="w-full h-[54px] rounded-full border-2 border-[#E8B923] p-1.5 flex items-center gap-2"
          >
            {/* Left Camera AI Button */}
            <button
              type="button"
              onClick={onOpenCameraAi}
              title={tr(language, 'ថតរូបម្ហូបដើម្បីសួរ AI', 'Snap food photo for AI', '拍照识别美食')}
              aria-label={tr(language, 'ថតរូបម្ហូបដើម្បីសួរ AI', 'Snap food photo for AI', '拍照识别美食')}
              className="w-10 h-10 rounded-full bg-white hover:bg-amber-50 text-amber-700 border border-amber-200/80 shadow-xs flex items-center justify-center shrink-0 active:scale-95 transition cursor-pointer"
            >
              <Camera className="w-5 h-5" />
            </button>

            {/* Middle Ask AI / Search Input */}
            <div className="flex-1 min-w-0 flex items-center px-1">
              <input
                type="text"
                value={query}
                onChange={(e) => onChangeQuery && onChangeQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTriggerAskAi();
                  }
                }}
                placeholder={tr(
                  language,
                  'សួរអ្វីក៏បានអំពីម្ហូប ឬថតរូបម្ហូប...',
                  'Ask anything about food or snap a photo...',
                  '询问任何美食问题或拍照识别...'
                )}
                className="w-full bg-transparent text-xs sm:text-[13px] font-khmer font-bold text-slate-800 placeholder-slate-600 focus:outline-none truncate"
              />
              {query && onChangeQuery && (
                <button
                  type="button"
                  onClick={() => onChangeQuery('')}
                  aria-label="Clear"
                  className="p-1 text-slate-500 hover:text-slate-800 shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Right សួរ AI Pill Button */}
            <button
              type="button"
              onClick={handleTriggerAskAi}
              style={{
                background: 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
              }}
              className="h-10 px-3.5 rounded-full text-white font-khmer font-extrabold text-xs sm:text-[13px] flex items-center justify-center gap-1.5 shrink-0 shadow-sm active:scale-95 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-white" />
              <span>{tr(language, 'សួរ AI', 'Ask AI', '问 AI')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
