import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Send,
  X,
} from 'lucide-react';
import { tr } from '../utils/i18n';
import { resolveUserAvatarUrl, handleAvatarImageError } from '../utils/avatarHelper';

interface AngkorHeroTopHeaderProps {
  mode: 'home' | 'food';
  foodCount?: number;
  query?: string;
  onChangeQuery?: (val: string) => void;
  onAskAi?: (queryText?: string) => void;
  onOpenCameraAi?: () => void;
}

const AngkorHeroTopHeaderInner: React.FC<AngkorHeroTopHeaderProps> = ({
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
    users,
    setIsAuthModalOpen,
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
    return resolveUserAvatarUrl(effectiveUser || { name: 'IG', role: 'user' });
  }, [effectiveUser, avatarTick]);

  const handleTriggerAskAi = () => {
    if (onAskAi) {
      onAskAi(query.trim());
    }
  };

  return (
    <div
      className={`relative w-full overflow-visible select-none ${
        mode === 'home' ? 'h-[260px] sm:h-[274px]' : 'h-[236px] sm:h-[250px]'
      }`}
      style={{ paddingTop: 'var(--kft-safe-top, 0px)' }}
    >
      {/* Full-Bleed High-Resolution Angkor Wat Sunrise/Sunset Hero Background */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={mode === 'food' ? '/welcome/food-angkor-hero.jpg' : '/welcome/home-angkor-hero-v2.jpg'}
          alt="Angkor Wat Cambodia"
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover"
          style={{
            objectPosition: mode === 'food' ? 'center 14%' : 'center 20%',
          }}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (!img.dataset.fallback) {
              img.dataset.fallback = '1';
              img.src = mode === 'food' ? '/welcome/shop-angkor-hero.jpg' : '/welcome/angkor-lotus-hero.jpg';
            }
          }}
        />
        {/* Subtle top sky contrast gradient so white title & icons are always crisp while keeping rich sky */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-20"
          style={{
            background:
              'linear-gradient(180deg, rgba(2, 24, 54, 0.42) 0%, rgba(2, 24, 54, 0.14) 65%, rgba(2, 24, 54, 0) 100%)',
          }}
        />
        {mode === 'home' ? (
          <>
            {/* Smooth cyan-to-white gradient fade & soft blur rising from the bottom of the Home hero background */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
              style={{
                maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)',
              }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
              style={{
                background:
                  'linear-gradient(180deg, rgba(103, 214, 232, 0) 0%, rgba(152, 230, 244, 0.48) 44%, rgba(226, 246, 252, 0.88) 78%, #F8FAFC 100%)',
              }}
            />
          </>
        ) : (
          /* Food Mode: Preserve lush emerald water reflection of Sunset Temple Reflections in Lush Cambodia and blend bottom edge smoothly */
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14"
            style={{
              background:
                'linear-gradient(180deg, rgba(30, 41, 59, 0) 0%, rgba(30, 41, 59, 0.72) 68%, #1E293B 100%)',
            }}
          />
        )}
      </div>

      {/* Top Overlay Header Row: Official App Logo on Left + Title + Bell + Profile */}
      <div className="relative z-10 px-2.5 min-[360px]:px-3.5 sm:px-5 pt-2.5 flex items-start justify-between gap-1.5 min-[360px]:gap-2.5 max-w-6xl mx-auto">
        {/* Left: Official Rounded-Square Gold-Bordered App Logo + Khmer Title & English Subtitle */}
        <div className="flex items-center gap-2 min-[380px]:gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('home');
              const mainEl = document.getElementById('kft-main-scroll');
              if (mainEl) mainEl.scrollTop = 0;
            }}
            style={{
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45)',
            }}
            className="w-10 h-10 min-[380px]:w-[46px] min-[380px]:h-[46px] rounded-[12px] min-[380px]:rounded-[13px] p-[1.5px] bg-gradient-to-b from-[#FDE047] via-[#D4AF37] to-[#9A6F1A] overflow-hidden shrink-0 cursor-pointer active:scale-95 transition"
            title={tr(language, 'ទំព័រដើម', 'Home', '首页')}
          >
            <img loading="lazy"
              src="/logo-kft.png"
              alt="រសជាតិ និងទេសចរណ៍កម្ពុជា"
              decoding="async"
              className="w-full h-full rounded-[10px] min-[380px]:rounded-[11px] object-cover bg-[#064E3B]"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (!img.dataset.fallback) {
                  img.dataset.fallback = '1';
                  img.src = '/app-logo-v200.png';
                } else if (img.dataset.fallback === '1') {
                  img.dataset.fallback = '2';
                  img.src = '/icon-192.png';
                }
              }}
            />
          </button>

          <div className="min-w-0 flex-1 pt-0.5">
            <h1
              className="font-khmer font-extrabold text-white leading-[1.62] py-0.5 break-words"
              style={{
                fontSize: 'clamp(14.4px, 4.32vw, 20.4px)',
                textShadow: '0 1.5px 4px rgba(0, 0, 0, 0.78), 0 0 10px rgba(0, 0, 0, 0.4)',
              }}
            >
              រសជាតិ និងទេសចរណ៍កម្ពុជា
            </h1>
            <p
              className="font-extrabold text-white/95 tracking-tight leading-snug break-words"
              style={{
                fontSize: 'clamp(11.8px, 3.36vw, 15px)',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.85)',
              }}
            >
              Cambodia Flavors &amp; Tourism
            </p>
          </div>
        </div>

        {/* Right: User Avatar + Language Switcher + (Home Mode: 7-Day Free Trial Banner Directly Below Language Selector) */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 min-[360px]:gap-2">
            {/* User Profile Circle */}
            <button
              type="button"
              onClick={() => (effectiveUser ? setActiveTab('profile') : setIsAuthModalOpen(true))}
              style={{
                boxShadow: '0 3px 10px rgba(0, 0, 0, 0.35)',
              }}
              className="w-9 h-9 rounded-full border-[1.5px] border-white/85 overflow-hidden bg-[#1E6F50] flex items-center justify-center text-white font-extrabold text-xs shrink-0 active:scale-95 transition cursor-pointer"
              title={
                effectiveUser
                  ? effectiveUser.name
                  : tr(language, 'ចូលគណនី', 'Sign In', '登录')
              }
            >
              <img loading="lazy"
                src={resolvedProfileAvatar}
                alt={effectiveUser?.name || 'IG'}
                decoding="async"
                className="w-full h-full object-cover"
                onError={(e) => handleAvatarImageError(e, effectiveUser || { name: 'IG', role: 'user' })}
              />
            </button>
          </div>

          {/* Language Pill Switcher (ខ្មែរ | EN | 中文) - Kept in current exact position */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.78)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.32)',
            }}
            className="inline-flex items-center rounded-full p-[2px] border border-white/35"
          >
            {(
              [
                { code: 'km', label: 'ខ្មែរ' },
                { code: 'en', label: 'EN' },
                { code: 'zh', label: '中文' },
              ] as const
            ).map((lang, idx) => {
              const active = language === lang.code;
              return (
                <React.Fragment key={lang.code}>
                  {idx > 0 && !active && language !== (['km', 'en', 'zh'] as const)[idx - 1] && (
                    <span className="text-white/30 text-[9px] select-none px-0.5">|</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    style={
                      active
                        ? {
                            background: 'linear-gradient(180deg, #FDE047 0%, #F59E0B 100%)',
                            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
                          }
                        : undefined
                    }
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold leading-tight transition cursor-pointer ${
                      active ? 'text-slate-950' : 'text-white/95 hover:text-white'
                    }`}
                  >
                    {lang.label}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Home Mode: 7-Day Free Trial / Account Information Banner Below Language Selection Banner + Translucent AI Search Strip */}
      {mode === 'home' && (
        <div className="absolute inset-x-0 bottom-3 z-20 px-2.5 min-[360px]:px-3.5 sm:px-5 max-w-6xl mx-auto space-y-2">
          {/* 7-Day Free Trial / Account Information Banner (Aligned on the right directly below the language selector, out of the temple towers) */}
          <AccountTrialStatusBar className="px-0" />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTriggerAskAi();
            }}
            style={{
              background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.84) 0%, rgba(30, 41, 59, 0.80) 55%, rgba(15, 23, 42, 0.86) 100%)',
              boxShadow:
                '0 0 0 1px rgba(245, 197, 66, 0.45), 0 4px 14px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.16)',
            }}
            className="w-full min-w-0 h-[46px] rounded-full px-2 flex items-center gap-1.5 border border-[#F5C542]/85"
          >
            {/* Left Glowing Gold Circle Camera Button (Scaled +20% to 34px) */}
            <button
              type="button"
              onClick={() => onOpenCameraAi && onOpenCameraAi()}
              style={{
                background: 'radial-gradient(circle at 35% 30%, #FFFBEB 0%, #FDE68A 58%, #F59E0B 100%)',
                boxShadow: '0 0 8px rgba(251, 191, 36, 0.5), inset 0 1px 1.5px rgba(255, 255, 255, 0.9)',
              }}
              className="w-[34px] h-[34px] rounded-full border border-[#F59E0B] flex items-center justify-center shrink-0 active:scale-95 transition cursor-pointer"
              title={tr(language, 'ថតរូបម្ហូបដើម្បីសួរ AI', 'Snap food photo for AI', '拍照识菜')}
            >
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none">
                <path d="M4 8V6a2 2 0 0 1 2-2h2" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
                <path d="M16 4h2a2 2 0 0 1 2 2v2" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
                <path d="M20 16v2a2 2 0 0 1-2 2h-2" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
                <path d="M8 20H6a2 2 0 0 1-2-2v-2" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
                <rect x="6.5" y="8" width="11" height="8.5" rx="2" fill="#065F46" stroke="#047857" strokeWidth="1.2" />
                <path d="M9.5 8L10.3 6.6h3.4L14.5 8H9.5Z" fill="#047857" />
                <circle cx="12" cy="12.3" r="2.6" fill="#FEF3C7" />
                <circle cx="12" cy="12.3" r="1.5" fill="#0284C7" />
                <circle cx="15.3" cy="9.8" r="0.7" fill="#FDE047" />
              </svg>
            </button>

            {/* Center Input: សួរអ្វីក៏បានអំពីម្ហូប ឬថតរូបម្ហូប... */}
            <div className="flex-1 min-w-0 flex items-center">
              <input
                type="text"
                size={1}
                enterKeyHint="send"
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
                  '询问任何美食问题或拍照识菜...'
                )}
                className="w-full min-w-0 bg-transparent text-white placeholder:text-white/95 text-[12px] sm:text-[13px] font-khmer font-extrabold focus:outline-none truncate"
                style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.7)' }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => onChangeQuery && onChangeQuery('')}
                  className="p-1 text-white/75 hover:text-white shrink-0 cursor-pointer"
                  aria-label="Clear"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Right Orange Pill Button: សួរ AI */}
            <button
              type="submit"
              style={{
                background: 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
                boxShadow: '0 2px 6px rgba(234, 88, 12, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
              }}
              className="h-[34px] px-2.5 sm:px-3.5 rounded-full text-white font-khmer font-extrabold text-[11.5px] sm:text-[12px] flex items-center gap-1 sm:gap-1.5 shrink-0 active:scale-95 transition cursor-pointer border border-amber-200/50 whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5 -rotate-12 stroke-[2.3] shrink-0" />
              <span>{tr(language, 'សួរ AI', 'Ask AI', '问 AI')}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

/**
 * Clean 7-Day Free Trial / Account Status Banner
 * Placed outside the Angkor Wat background area, below the language selector/top header
 * on all four menus (Food, Shop, Hotel, Tourism) to reveal more of the temple scenery.
 */
export const AccountTrialStatusBar: React.FC<{ className?: string; inline?: boolean }> = ({
  className = '',
  inline = false,
}) => {
  const {
    language,
    currentUser,
    users,
    openUpgradeVipModal,
  } = useApp();

  const effectiveUser = React.useMemo(() => {
    if (!currentUser) return null;
    return (Array.isArray(users) && users.find((u) => u.id === currentUser.id)) || currentUser;
  }, [currentUser, users]);

  const trialDaysLeft = React.useMemo(() => {
    const TOTAL_DAYS = 7;
    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (effectiveUser?.freeTrialExpiresAt) {
      const expMs = Date.parse(effectiveUser.freeTrialExpiresAt);
      if (Number.isFinite(expMs)) {
        if (expMs > now) {
          const diffDays = Math.ceil((expMs - now) / DAY_MS);
          return Math.max(1, Math.min(TOTAL_DAYS, diffDays));
        }
        return 0;
      }
    }

    const candidateStart = effectiveUser?.freeTrialActivatedAt || effectiveUser?.createdAt;
    if (candidateStart) {
      const startMs = Date.parse(candidateStart);
      if (Number.isFinite(startMs) && startMs <= now && now - startMs < TOTAL_DAYS * DAY_MS) {
        const expMs = startMs + TOTAL_DAYS * DAY_MS;
        return Math.max(1, Math.min(TOTAL_DAYS, Math.ceil((expMs - now) / DAY_MS)));
      }
    }

    try {
      const storageKey = `kft_free_account_7d_trial_start_v1_${effectiveUser?.id || 'guest'}`;
      const raw = localStorage.getItem(storageKey);
      let startMs = raw ? Number(raw) : NaN;
      if (!Number.isFinite(startMs) || startMs <= 0 || now - startMs >= TOTAL_DAYS * DAY_MS) {
        startMs = now - 2 * DAY_MS;
        localStorage.setItem(storageKey, String(startMs));
      }
      const expMs = startMs + TOTAL_DAYS * DAY_MS;
      return Math.max(1, Math.min(TOTAL_DAYS, Math.ceil((expMs - now) / DAY_MS)));
    } catch {
      return 5;
    }
  }, [effectiveUser?.id, effectiveUser?.freeTrialExpiresAt, effectiveUser?.freeTrialActivatedAt, effectiveUser?.createdAt]);

  const trialProgressRatio = Math.max(0.14, Math.min(1, trialDaysLeft / 7));

  return (
    <div className={`${inline ? 'inline-flex shrink-0' : 'w-full flex justify-end px-1 sm:px-1.5'} ${className}`}>
      <button
        type="button"
        onClick={() => openUpgradeVipModal()}
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(6, 78, 59, 0.92) 100%)',
          boxShadow: '0 3px 12px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.16)',
        }}
        className="relative min-h-[34px] min-[360px]:min-h-[38px] py-1 px-2.5 min-[360px]:px-3 rounded-full border border-[#FDE047]/65 flex items-center gap-1.5 text-white hover:border-[#FDE047]/90 transition active:scale-95 cursor-pointer shrink-0 overflow-hidden"
        title={tr(
          language,
          `គណនីឥតគិតថ្លៃ • សាកល្បង 7 ថ្ងៃ (សល់ ${trialDaysLeft} ថ្ងៃ)`,
          `7-Day Free Trial • FREE – ${trialDaysLeft} ${trialDaysLeft === 1 ? 'Day' : 'Days'} Left`,
          `7天免费试用 • 剩余 ${trialDaysLeft} 天`
        )}
        aria-label={`7-Day Free Trial: FREE – ${trialDaysLeft} ${trialDaysLeft === 1 ? 'Day' : 'Days'} Left`}
      >
        {/* Circular Countdown Indicator */}
        <span className="relative w-4 h-4 min-[360px]:w-[18px] min-[360px]:h-[18px] flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 20 20" aria-hidden="true">
            <circle
              cx="10"
              cy="10"
              r="7.5"
              fill="none"
              stroke="rgba(255, 255, 255, 0.18)"
              strokeWidth="2.2"
            />
            <circle
              cx="10"
              cy="10"
              r="7.5"
              fill="none"
              stroke="#FDE047"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray={`${(2 * Math.PI * 7.5).toFixed(2)}`}
              strokeDashoffset={`${(2 * Math.PI * 7.5 * (1 - trialProgressRatio)).toFixed(2)}`}
            />
          </svg>
          <span className="absolute text-[6.5px] font-black text-[#FDE047] leading-none tracking-tighter">
            7D
          </span>
        </span>

        {/* Clear Compact Typography */}
        <span className="flex flex-col items-start justify-center leading-none pr-0.5">
          <span className="text-[7px] min-[360px]:text-[7.5px] font-extrabold uppercase tracking-[0.05em] text-[#FDE047] leading-none mb-[2px] whitespace-nowrap">
            {tr(language, 'សាកល្បង ៧ ថ្ងៃឥតគិតថ្លៃ', '7-Day Free Trial', '7天免费试用')}
          </span>
          <span className="text-[9px] min-[360px]:text-[10px] sm:text-[10.5px] font-extrabold text-white tracking-tight leading-none whitespace-nowrap">
            {tr(language, `ឥតគិតថ្លៃ • នៅសល់ ${trialDaysLeft} ថ្ងៃ`, `FREE – ${trialDaysLeft} ${trialDaysLeft === 1 ? 'Day' : 'Days'} Left`, `免费 • 剩余 ${trialDaysLeft} 天`)}
          </span>
        </span>

        {/* Subtle Bottom Countdown Progress Bar */}
        <span
          className="pointer-events-none absolute inset-x-2.5 bottom-[1.5px] h-[1.5px] rounded-full bg-white/15 overflow-hidden"
          aria-hidden="true"
        >
          <span
            className="block h-full rounded-full bg-gradient-to-r from-[#10B981] via-[#34D399] to-[#FDE047]"
            style={{ width: `${Math.round(trialProgressRatio * 100)}%` }}
          />
        </span>
      </button>
    </div>
  );
};

export const AngkorHeroTopHeader = React.memo(AngkorHeroTopHeaderInner);
