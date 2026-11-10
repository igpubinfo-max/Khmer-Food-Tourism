import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  ArrowLeft,
  Send,
  X,
  Shield,
} from 'lucide-react';
import { tr } from '../utils/i18n';
import { isAdminAccount } from '../types';
import { resolveUserAvatarUrl, handleAvatarImageError } from '../utils/avatarHelper';

interface AngkorHeroTopHeaderProps {
  mode: 'home' | 'food';
  foodCount?: number;
  query?: string;
  onChangeQuery?: (val: string) => void;
  onAskAi?: (queryText?: string) => void;
  onOpenCameraAi?: () => void;
}

export const AngkorHeroTopHeader: React.FC<AngkorHeroTopHeaderProps> = ({
  mode,
  foodCount,
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
    users,
    setIsAuthModalOpen,
    setIsNotificationsModalOpen,
    setIsAdminOpen,
    unreadNotificationsCount,
  } = useApp();

  const [avatarTick, setAvatarTick] = useState(0);

  useEffect(() => {
    const onAvatarUpdated = () => setAvatarTick((t) => t + 1);
    window.addEventListener('kft-avatar-cache-updated', onAvatarUpdated);
    window.addEventListener('storage', onAvatarUpdated);
    return () => {
      window.removeEventListener('kft-avatar-cache-updated', onAvatarUpdated);
      window.removeEventListener('storage', onAvatarUpdated);
    };
  }, []);

  const effectiveUser = React.useMemo(() => {
    void avatarTick;
    if (!currentUser) return null;
    const matched = Array.isArray(users)
      ? users.find(
          (u) =>
            u.id === currentUser.id ||
            (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase()) ||
            (u.name && currentUser.name && u.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
        )
      : undefined;
    if (matched && matched.avatar && (!currentUser.avatar || currentUser.avatar.startsWith('data:image/svg'))) {
      return { ...currentUser, avatar: matched.avatar, cloudAvatarUrl: matched.cloudAvatarUrl || currentUser.cloudAvatarUrl };
    }
    return currentUser;
  }, [currentUser, users, avatarTick]);

  const resolvedProfileAvatar = React.useMemo(() => {
    void avatarTick;
    return resolveUserAvatarUrl(effectiveUser || { name: 'KH', role: 'user' });
  }, [effectiveUser, avatarTick]);
  const isAdmin = isAdminAccount(currentUser);

  const handleTriggerAskAi = () => {
    if (onAskAi) {
      onAskAi(query.trim());
    }
  };

  return (
    <div
      className={`relative w-full overflow-visible select-none ${
        mode === 'home' ? 'h-[268px] sm:h-[282px]' : 'h-[196px] sm:h-[210px]'
      }`}
      style={{ paddingTop: 'var(--kft-safe-top, 0px)' }}
    >
      {/* Full-Bleed Angkor Wat Sunrise & Lotus Pond Background */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="/welcome/angkor-lotus-hero.jpg"
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

      {/* Top Overlay Header Row: Back Button (Food Mode Only) + Real App Logo on Left + Title + Bell + Profile */}
      <div className="relative z-20 px-3 pt-2.5 flex items-center justify-between gap-2">
        {/* Left Side: Back Button (in food mode only; NO hamburger button on home screen) + Real App Logo + App Name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {mode === 'food' && (
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              aria-label={tr(language, 'ត្រឡប់ទៅទំព័រដើម', 'Back to Home', '返回首页')}
              className="w-9 h-9 rounded-full bg-black/25 hover:bg-black/40 border border-white/40 text-white flex items-center justify-center shrink-0 backdrop-blur-xs active:scale-95 transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
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
            className="w-10 h-10 rounded-full bg-emerald-900/80 hover:bg-emerald-800 border-2 border-white shadow-md text-white flex items-center justify-center overflow-hidden active:scale-95 transition cursor-pointer shrink-0"
          >
            <img
              key={resolvedProfileAvatar}
              src={resolvedProfileAvatar}
              alt={effectiveUser?.name || 'Profile'}
              referrerPolicy="no-referrer"
              decoding="async"
              onError={(e) => handleAvatarImageError(e, effectiveUser)}
              className="w-full h-full object-cover"
            />
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

      {/* Home Mode: Wide Rounded AI Food Search Bar with Transparent Dark Background, Gold Border, Left Gold Camera Button & Right Orange AI Button */}
      {mode === 'home' && (
        <div className="absolute inset-x-0 bottom-6 z-20 px-3.5">
          <div
            style={{
              background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.64) 0%, rgba(15, 23, 42, 0.72) 50%, rgba(15, 23, 42, 0.64) 100%)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            }}
            className="w-full h-[50px] rounded-full border-[1.5px] border-[#FBBF24] p-1.5 flex items-center gap-2"
          >
            {/* Left Circular Gold Camera Recognition Button */}
            <button
              type="button"
              onClick={onOpenCameraAi}
              title={tr(language, 'ថតរូបម្ហូបដើម្បីសួរ AI', 'Snap food photo for AI', '拍照识别美食')}
              aria-label={tr(language, 'ថតរូបម្ហូបដើម្បីសួរ AI', 'Snap food photo for AI', '拍照识别美食')}
              style={{
                background: 'linear-gradient(180deg, #FDE68A 0%, #F59E0B 100%)',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.85)',
              }}
              className="group relative w-[38px] h-[38px] rounded-full border border-amber-200 flex items-center justify-center shrink-0 active:scale-95 transition cursor-pointer overflow-hidden"
            >
              <svg className="w-5 h-5 text-[#064E3B] group-hover:scale-105 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.4 4.5a1.5 1.5 0 0 0-1.26.69L7.12 6.75H5A2.75 2.75 0 0 0 2.25 9.5v8.25A2.75 2.75 0 0 0 5 20.5h14a2.75 2.75 0 0 0 2.75-2.75V9.5A2.75 2.75 0 0 0 19 6.75h-2.12l-1.02-1.56a1.5 1.5 0 0 0-1.26-.69H9.4Zm2.6 4.75a4.25 4.25 0 1 1 0 8.5 4.25 4.25 0 0 1 0-8.5Zm0 1.75a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />
              </svg>
            </button>

            {/* Middle Ask AI / Search Input (Preserving Exact Khmer Placeholder) */}
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
                style={{ color: '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
                className="w-full bg-transparent text-xs sm:text-[13px] font-khmer font-extrabold text-white placeholder-white/95 focus:outline-none truncate"
              />
              {query && onChangeQuery && (
                <button
                  type="button"
                  onClick={() => onChangeQuery('')}
                  aria-label="Clear"
                  className="p-1 text-white/80 hover:text-white shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Subtle Vertical Divider */}
            <span className="h-5 w-px bg-white/30 shrink-0" aria-hidden="true" />

            {/* Right Orange សួរ AI Pill Button */}
            <button
              type="button"
              onClick={handleTriggerAskAi}
              style={{
                background: 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
                boxShadow: '0 2px 8px rgba(234, 88, 12, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
              }}
              className="h-[38px] px-3.5 rounded-full border border-orange-300/60 text-white font-khmer font-extrabold text-xs flex items-center justify-center gap-1.5 shrink-0 active:scale-95 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-white" />
              <span>{tr(language, 'សួរ AI', 'Ask AI', '问 AI')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Food Mode: One Elegant Horizontal Strip with Semi-Transparent Background behind the Khmer Food Title, allowing Angkor Wat to remain clearly visible (NO VIP button on right) */}
      {mode === 'food' && (
        <div className="absolute inset-x-0 bottom-5 z-20 px-3.5">
          <div
            style={{
              background: 'linear-gradient(100deg, rgba(6, 78, 59, 0.94) 0%, rgba(15, 23, 42, 0.92) 100%)',
              boxShadow: '0 8px 22px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255,255,255,0.14)',
            }}
            className="relative w-full py-2.5 pl-3 pr-3.5 rounded-2xl border border-amber-300/50 flex items-center gap-3 overflow-hidden"
          >
            <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-amber-300 to-amber-500" aria-hidden="true" />
            <div className="ml-1 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shrink-0 shadow-md">
              <svg className="w-5 h-5 text-emerald-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                <path d="M7 2v20" />
                <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-khmer font-extrabold text-[15px] sm:text-base text-white leading-tight truncate">
                {tr(language, 'មុខម្ហូបខ្មែរ ទាំងអស់', 'All Cambodian Dishes', '柬埔寨全部美食')}
              </h2>
              <p className="text-[10.5px] font-bold text-amber-200/90 leading-tight truncate">
                {tr(language, 'រកឃើញរសជាតិដើមខ្មែរ គ្រប់ខេត្ត', 'Discover authentic Khmer flavors', '探索正宗高棉风味')}
              </p>
            </div>
            {typeof foodCount === 'number' && (
              <span className="shrink-0 px-2.5 py-1 rounded-full bg-amber-400 text-emerald-950 text-[11px] font-extrabold shadow-sm">
                {foodCount}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
