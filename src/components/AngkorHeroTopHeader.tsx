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
        mode === 'home' ? 'h-[248px] sm:h-[262px]' : 'h-[228px] sm:h-[242px]'
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
              'linear-gradient(180deg, rgba(10, 22, 60, 0.62) 0%, rgba(15, 32, 85, 0.26) 65%, rgba(15, 32, 85, 0) 100%)',
          }}
        />
      </div>

      {/* Top Overlay Header Row: Back Button (Food Mode Only) + Clear Official App Logo on Left + Title + Bell + Profile */}
      <div className="relative z-20 px-3 pt-2.5 flex items-center justify-between gap-1.5">
        {/* Left Side: Back Button (in food mode only) + Clear App Logo + App Name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {mode === 'food' && (
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              aria-label={tr(language, 'ត្រឡប់ទៅទំព័រដើម', 'Back to Home', '返回首页')}
              className="w-8.5 h-8.5 rounded-full bg-black/35 hover:bg-black/50 border border-white/45 text-white flex items-center justify-center shrink-0 active:scale-95 transition cursor-pointer"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
          )}

          {/* Clear Official App Logo (Rounded-Square Gold Frame preserved without circular clipping) */}
          <div
            onClick={() => {
              setActiveTab('home');
              const mainEl = document.getElementById('kft-main-scroll');
              if (mainEl) mainEl.scrollTop = 0;
            }}
            className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-[13px] overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.45)] shrink-0 group-hover:scale-105 transition">
              <img
                src="/logo-kft.png"
                alt="រសជាតិ និងទេសចរណ៍កម្ពុជា"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = '1';
                    img.src = '/app-logo-v200.png';
                  }
                }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <h1
                className="font-khmer font-extrabold text-white leading-tight truncate"
                style={{ fontSize: '14.5px', textShadow: '0 2px 6px rgba(0,0,0,0.75)' }}
              >
                {tr(language, 'រសជាតិ និងទេសចរណ៍កម្ពុជា', 'Cambodia Flavors & Tourism', '柬埔寨风味与旅游')}
              </h1>
              <p
                className="font-bold text-white/95 truncate mt-0.5"
                style={{ fontSize: '11.5px', textShadow: '0 1px 4px rgba(0,0,0,0.75)' }}
              >
                Cambodia Flavors &amp; Tourism
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Notification Bell + Profile Icon */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsNotificationsModalOpen(true)}
            title={tr(language, 'ដំណឹងថ្មីៗ', 'Notifications', '最新通知')}
            aria-label={tr(language, 'ដំណឹងថ្មីៗ', 'Notifications', '最新通知')}
            className="relative w-9 h-9 rounded-full bg-slate-950/55 hover:bg-slate-950/75 border border-white/65 text-white flex items-center justify-center active:scale-95 transition cursor-pointer shadow-sm"
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
            className="w-9.5 h-9.5 rounded-full bg-emerald-900/90 hover:bg-emerald-800 border-2 border-white shadow-md text-white flex items-center justify-center overflow-hidden active:scale-95 transition cursor-pointer shrink-0"
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

      {/* Second Row on Right: High-Contrast Dark Language Switcher Pill with Clear Gold Highlighting */}
      <div className="relative z-20 px-3 mt-1.5 flex items-center justify-end gap-2">
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              (window as any).__kft_admin_tab = 'stats';
              setIsAdminOpen(true);
            }}
            className="px-2.5 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-khmer font-extrabold text-[10px] shadow-md flex items-center gap-1 cursor-pointer active:scale-95 transition"
          >
            <Shield className="w-3 h-3" />
            <span>{tr(language, 'ផ្ទាំងរដ្ឋបាល', 'Admin', '管理')}</span>
          </button>
        )}

        <div
          style={{
            background: 'rgba(9, 16, 32, 0.90)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.52), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
          }}
          className="inline-flex items-center gap-0.5 p-0.5 rounded-full border-[1.5px] border-[#FBBF24] text-white"
        >
          <button
            type="button"
            onClick={() => setLanguage('km')}
            style={
              language === 'km'
                ? {
                    background: 'linear-gradient(180deg, #FDE047 0%, #F59E0B 100%)',
                    fontSize: '11px',
                  }
                : { fontSize: '11px' }
            }
            className={`px-2.5 py-0.5 rounded-full cursor-pointer transition ${
              language === 'km'
                ? 'text-slate-950 font-black shadow-2xs'
                : 'text-white/95 hover:text-amber-300 font-extrabold'
            }`}
          >
            ខ្មែរ
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            style={
              language === 'en'
                ? {
                    background: 'linear-gradient(180deg, #FDE047 0%, #F59E0B 100%)',
                    fontSize: '11px',
                  }
                : { fontSize: '11px' }
            }
            className={`px-2.5 py-0.5 rounded-full cursor-pointer transition ${
              language === 'en'
                ? 'text-slate-950 font-black shadow-2xs'
                : 'text-white/95 hover:text-amber-300 font-extrabold'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('zh')}
            style={
              language === 'zh'
                ? {
                    background: 'linear-gradient(180deg, #FDE047 0%, #F59E0B 100%)',
                    fontSize: '11px',
                  }
                : { fontSize: '11px' }
            }
            className={`px-2.5 py-0.5 rounded-full cursor-pointer transition ${
              language === 'zh'
                ? 'text-slate-950 font-black shadow-2xs'
                : 'text-white/95 hover:text-amber-300 font-extrabold'
            }`}
          >
            中文
          </button>
        </div>
      </div>

      {/* Home Mode: Sleek Rounded AI Food Search Bar with Transparent Dark Background & Gold Border */}
      {mode === 'home' && (
        <div className="absolute inset-x-0 bottom-5 z-20 px-3.5">
          <div
            style={{
              background: 'linear-gradient(90deg, rgba(12, 20, 38, 0.72) 0%, rgba(12, 20, 38, 0.78) 50%, rgba(12, 20, 38, 0.72) 100%)',
              boxShadow: '0 6px 18px rgba(0, 0, 0, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
            }}
            className="w-full h-[44px] rounded-full border-[1.5px] border-[#FBBF24] p-1 flex items-center gap-1.5"
          >
            {/* Left Circular Gold Camera Recognition Button */}
            <button
              type="button"
              onClick={onOpenCameraAi}
              title={tr(language, 'ថតរូបម្ហូបដើម្បីសួរ AI', 'Snap food photo for AI', '拍照识别美食')}
              aria-label={tr(language, 'ថតរូបម្ហូបដើម្បីសួរ AI', 'Snap food photo for AI', '拍照识别美食')}
              style={{
                background: 'linear-gradient(180deg, #FDE68A 0%, #F59E0B 100%)',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.85)',
              }}
              className="group relative w-[34px] h-[34px] rounded-full border border-amber-200 flex items-center justify-center shrink-0 active:scale-95 transition cursor-pointer overflow-hidden"
            >
              <svg className="w-4.5 h-4.5 text-[#064E3B] group-hover:scale-105 transition-transform" viewBox="0 0 24 24" fill="currentColor">
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
                style={{ color: '#FFFFFF', fontSize: '12px', textShadow: '0 1px 2px rgba(0,0,0,0.75)' }}
                className="w-full bg-transparent font-khmer font-extrabold text-white placeholder-white/95 focus:outline-none truncate"
              />
              {query && onChangeQuery && (
                <button
                  type="button"
                  onClick={() => onChangeQuery('')}
                  aria-label="Clear"
                  className="p-0.5 text-white/80 hover:text-white shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Subtle Vertical Divider */}
            <span className="h-4.5 w-px bg-white/30 shrink-0" aria-hidden="true" />

            {/* Right Orange សួរ AI Pill Button */}
            <button
              type="button"
              onClick={handleTriggerAskAi}
              style={{
                background: 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
                boxShadow: '0 2px 6px rgba(234, 88, 12, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
                fontSize: '11.5px',
              }}
              className="h-[34px] px-3 rounded-full border border-orange-300/60 text-white font-khmer font-extrabold flex items-center justify-center gap-1 shrink-0 active:scale-95 transition cursor-pointer"
            >
              <Send className="w-3 h-3 text-white" />
              <span>{tr(language, 'សួរ AI', 'Ask AI', '问 AI')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Food Mode: Compact Centered Dark Emerald-Green Banner (30-35% shorter, no counter/arrow, Angkor silhouette) */}
      {mode === 'food' && (
        <>
          {/* Soft bottom mist transition into the clean white Food sheet */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 z-10"
            style={{
              background:
                'linear-gradient(180deg, rgba(248, 250, 252, 0) 0%, rgba(248, 250, 252, 0.72) 70%, #F8FAFC 100%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-3 z-20 px-5 flex justify-center">
            <div
              style={{
                background: 'linear-gradient(92deg, #043F2E 0%, #065F46 52%, #044E3A 100%)',
                boxShadow:
                  '0 0 0 1.5px rgba(254, 243, 199, 0.65), 0 6px 16px rgba(0, 0, 0, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
              }}
              className="relative w-full max-w-[356px] py-1.5 pl-2.5 pr-3 rounded-[18px] border-[1.5px] border-[#F5C542] flex items-center gap-2.5 overflow-hidden"
            >
              {/* Decorative subtle green hills & gold Angkor Wat silhouette on the right */}
              <svg
                className="pointer-events-none absolute right-0 bottom-0 h-full w-32 opacity-90"
                viewBox="0 0 160 56"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M18 56C46 38 82 34 160 42V56H18Z"
                  fill="rgba(16, 185, 129, 0.16)"
                />
                <path
                  d="M52 56C78 44 114 40 160 47V56H52Z"
                  fill="rgba(5, 150, 105, 0.24)"
                />
                {/* Gold Angkor Wat 5-tower silhouette */}
                <g fill="#F5C542" fillOpacity="0.38" transform="translate(86, 10)">
                  {/* Base terraces */}
                  <rect x="4" y="34" width="52" height="3" rx="1" />
                  <rect x="8" y="30" width="44" height="4" rx="1" />
                  {/* Center main lotus tower */}
                  <path d="M30 4 L34 14 L35 30 L25 30 L26 14 Z" />
                  {/* Inner Left & Right towers */}
                  <path d="M19 11 L22 18 L23 30 L15 30 L16 18 Z" />
                  <path d="M41 11 L44 18 L45 30 L37 30 L38 18 Z" />
                  {/* Outer Left & Right towers */}
                  <path d="M10 18 L12.5 23 L13 30 L7 30 L7.5 23 Z" />
                  <path d="M50 18 L52.5 23 L53 30 L47 30 L47.5 23 Z" />
                </g>
              </svg>

              {/* Left Gold Rounded Food Icon */}
              <div
                style={{
                  background: 'linear-gradient(180deg, #FDE047 0%, #F59E0B 100%)',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.28), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
                }}
                className="relative z-10 w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
              >
                <svg
                  className="w-4.5 h-4.5 text-[#042F2E]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                  <path d="M7 2v20" />
                  <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
                </svg>
              </div>

              {/* Subtle Vertical Divider */}
              <span className="relative z-10 h-6 w-px bg-white/25 shrink-0" aria-hidden="true" />

              {/* Khmer Title & Subtitle (No counter badge, no right arrow) */}
              <div className="relative z-10 min-w-0 flex-1 py-0.5">
                <h2
                  className="font-khmer font-extrabold text-white leading-tight truncate"
                  style={{ fontSize: '13.5px', textShadow: '0 1px 3px rgba(0, 0, 0, 0.55)' }}
                >
                  {tr(language, 'មុខម្ហូបខ្មែរ ទាំងអស់', 'All Cambodian Dishes', '柬埔寨全部美食')}
                </h2>
                <p
                  className="font-khmer font-bold text-[#FDE68A] leading-tight truncate mt-0.5"
                  style={{ fontSize: '9.5px', textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}
                >
                  {tr(language, 'រកឃើញរសជាតិដើមខ្មែរ គ្រប់ខេត្ត', 'Discover authentic Khmer flavors', '探索正宗高棉风味')}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
