import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Heart,
  Bell,
  QrCode,
  MoreVertical,
  ShieldCheck,
} from 'lucide-react';
import { IconSmartAssistant } from './icons/HandcraftedIcons';
import { openSmartHub } from '../utils/smartHub';
import { tr } from '../utils/i18n';
import { isNativeIosApp } from '../types';
import { resolveUserAvatarUrl, handleAvatarImageError } from '../utils/avatarHelper';

interface HeaderProps {
  onOpenSmartHub?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSmartHub }) => {
  const {
    language,
    setLanguage,
    setActiveTab,
    setIsSupportModalOpen,
    setIsQrScannerModalOpen,
    setIsAiTripPlannerModalOpen,
    setIsNotificationsModalOpen,
    currentUser,
    users,
    setIsAuthModalOpen,
    unreadNotificationsCount,
  } = useApp();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [avatarTick, setAvatarTick] = useState(0);

  useEffect(() => {
    const onAvatarUpdated = () => setAvatarTick((t) => t + 1);
    window.addEventListener('kft-avatar-cache-updated', onAvatarUpdated);
    return () => window.removeEventListener('kft-avatar-cache-updated', onAvatarUpdated);
  }, []);

  const effectiveUser = React.useMemo(() => {
    void avatarTick;
    if (!currentUser) return null;
    const matched = Array.isArray(users)
      ? users.find((u) => u.id === currentUser.id || (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase()))
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
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleOpenSmartMenu = () => {
    if (onOpenSmartHub) {
      onOpenSmartHub();
    } else {
      openSmartHub();
    }
  };

  return (
    <header
      className="shrink-0 w-full z-30 bg-[#064E3B] text-white shadow-md border-b border-emerald-400/20"
      style={{ paddingTop: 'var(--kft-safe-top, 0px)' }}
    >
      <div className="max-w-md md:max-w-5xl lg:max-w-6xl mx-auto px-3 py-2 flex items-center justify-between gap-2">
        {/* Brand Logo & Title */}
        <div
          onClick={() => {
            setActiveTab('home');
            const mainEl = document.getElementById('kft-main-scroll');
            if (mainEl) mainEl.scrollTop = 0;
          }}
          className="flex items-center gap-2 cursor-pointer group min-w-0 flex-1"
        >
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 p-[1.5px] flex items-center justify-center shadow-md group-hover:scale-105 transition shrink-0">
            <img
              src="/logo-kft.png"
              alt="រសជាតិ និងទេសចរណ៍កម្ពុជា"
              className="w-full h-full rounded-[10px] object-cover bg-[#064E3B]"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (!img.dataset.fallback) {
                  img.dataset.fallback = '1';
                  img.src = '/welcome-app-icon.png';
                }
              }}
            />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h1
              className={`${
                language === 'km'
                  ? 'font-moul text-[11px] min-[360px]:text-[11.5px] sm:text-[13px] leading-[1.65]'
                  : 'font-khmer font-extrabold text-[12px] min-[360px]:text-[13px] sm:text-[14.5px] leading-[1.28]'
              } tracking-tight text-white pt-0.5 pb-0.5 line-clamp-2 break-words`}
            >
              {tr(language, 'រសជាតិ និងទេសចរណ៍កម្ពុជា', 'Cambodia Flavors & Tourism', '柬埔寨风味与旅游')}
            </h1>
            <p className="text-[9.5px] min-[360px]:text-[10px] text-amber-300 font-semibold leading-[1.35] pt-0.5 pb-0.5 line-clamp-1">
              {tr(
                language,
                'ស្វែងយល់អាហារ • ទីតាំង • បទពិសោធន៍',
                'Food • Places • Experiences',
                '探索美食 • 景点 • 文化体验'
              )}
            </p>
          </div>
        </div>

        {/* Right Controls: Essential Actions + Clean More Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Profile Picture Button */}
          <button
            type="button"
            onClick={() => {
              if (currentUser) {
                setActiveTab('profile');
              } else {
                setIsAuthModalOpen(true);
              }
            }}
            className="w-9 h-9 rounded-full bg-emerald-900 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0"
            title={tr(language, 'គណនីរបស់ខ្ញុំ', 'My Account', '我的账户')}
            aria-label={tr(language, 'គណនីរបស់ខ្ញុំ', 'My Account', '我的账户')}
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

          {/* Notifications Bell Button */}
          <button
            type="button"
            onClick={() => setIsNotificationsModalOpen(true)}
            className="relative w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center border border-white/20 transition active:scale-95 cursor-pointer shrink-0"
            title={tr(language, 'ដំណឹងថ្មីៗ', 'Notifications', '最新通知')}
            aria-label={tr(language, 'ដំណឹងថ្មីៗ', 'Notifications', '最新通知')}
          >
            <Bell className="w-4 h-4 text-amber-300" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border border-[#064E3B]">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Language Switcher Pill: ខ្មែរ / EN / 中文 (Direct tap on each language) */}
          <div
            className="h-9 px-1 rounded-xl bg-white/15 border border-white/25 text-[11px] font-extrabold tracking-wide inline-flex items-center gap-0.5 shrink-0"
            title="ប្តូរភាសា / Switch Language / 切换语言 (ខ្មែរ • EN • 中文)"
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
                  {idx > 0 && <span className="text-white/30 select-none">/</span>}
                  <button
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className={`px-1.5 py-0.5 rounded-lg transition active:scale-95 cursor-pointer ${
                      active ? 'text-amber-300 bg-black/25' : 'text-white/75 hover:text-white'
                    }`}
                  >
                    {lang.label}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Overflow Menu Button (Smart Menu, QR, Install, Support — No Admin Login or Duplicate Bell) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center border border-white/20 transition active:scale-95 cursor-pointer"
              title={tr(language, 'មុខងារបន្ថែម', 'More Options', '更多选项')}
              aria-label={tr(language, 'មុខងារបន្ថែម', 'More Options', '更多选项')}
              aria-expanded={isMenuOpen}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 text-white shadow-2xl border border-white/15 py-1.5 z-50 font-khmer text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleOpenSmartMenu();
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-white/10 transition cursor-pointer text-left"
                  >
                    <span className="flex items-center gap-2.5 font-bold text-amber-300">
                      <IconSmartAssistant className="w-4 h-4 text-amber-400" />
                      <span>{tr(language, 'ម៉ឺនុយឆ្លាតវៃ', 'Smart Menu', '智能菜单')}</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsQrScannerModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-white/10 transition cursor-pointer text-left font-semibold"
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>{tr(language, 'ស្កេនកូដ QR ហាង', 'Scan QR Code', '扫描店铺二维码')}</span>
                  </button>

                  {/* App Store Guideline 3.1.1: no external donation / KHQR payment inside the iOS app */}
                  {!isNativeIosApp() && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsSupportModalOpen(true);
                      }}
                      className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-white/10 transition cursor-pointer text-left font-semibold"
                    >
                      <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                      <span>{tr(language, 'គាំទ្រការអភិវឌ្ឍកម្មវិធី', 'Support App', '支持应用开发')}</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-white/10" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      window.dispatchEvent(new CustomEvent('kft:open-privacy-policy'));
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-white/10 transition cursor-pointer text-left font-semibold text-emerald-300"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{tr(language, 'គោលការណ៍ឯកជនភាព (Privacy)', 'Privacy Policy', '隐私政策 (Privacy)')}</span>
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
