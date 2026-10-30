import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Download,
  Heart,
  Bell,
  QrCode,
  MoreVertical,
} from 'lucide-react';
import { IconSmartAssistant } from './icons/HandcraftedIcons';
import { openSmartHub } from '../utils/smartHub';
import { tr } from '../utils/i18n';

interface HeaderProps {
  onOpenSmartHub?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSmartHub }) => {
  const {
    language,
    setLanguage,
    setActiveTab,
    openInstallModal,
    setIsSupportModalOpen,
    setIsQrScannerModalOpen,
    setIsAiTripPlannerModalOpen,
    setIsNotificationsModalOpen,
    unreadNotificationsCount,
  } = useApp();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
      <div className="max-w-md mx-auto px-3 py-2 flex items-center justify-between gap-2">
        {/* Brand Logo & Title */}
        <div
          onClick={() => {
            setActiveTab('home');
            const mainEl = document.getElementById('kft-main-scroll');
            if (mainEl) mainEl.scrollTop = 0;
          }}
          className="flex items-center gap-2.5 cursor-pointer group min-w-0 flex-1"
        >
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 p-[1.5px] flex items-center justify-center shadow-md group-hover:scale-105 transition shrink-0">
            <img
              src="/icon-192.png?v=2.5.4"
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
          <div className="min-w-0 flex-1">
            <h1 className="font-moul text-[12px] sm:text-[13px] tracking-wide text-white leading-snug truncate">
              {tr(language, 'រសជាតិ និងទេសចរណ៍កម្ពុជា', 'Cambodia Flavors & Tourism', '柬埔寨风味与旅游')}
            </h1>
            <p className="text-[10px] text-amber-300 font-semibold leading-tight truncate mt-0.5">
              {tr(
                language,
                'Cambodia Flavors & Tourism',
                'Discover Food • Places • Experiences',
                '探索美食 • 景点 • 文化体验'
              )}
            </p>
          </div>
        </div>

        {/* Right Controls: Essential Actions + Clean More Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Smart Menu Button */}
          <button
            type="button"
            onClick={handleOpenSmartMenu}
            className="w-9 h-9 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 flex items-center justify-center shadow-sm transition active:scale-95 cursor-pointer shrink-0"
            title={tr(language, 'ម៉ឺនុយឆ្លាតវៃ', 'Smart Menu', '智能菜单')}
            aria-label={tr(language, 'ម៉ឺនុយឆ្លាតវៃ', 'Smart Menu', '智能菜单')}
          >
            <IconSmartAssistant className="w-4 h-4 shrink-0 text-slate-950" />
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

          {/* Language Toggle Pill: ខ្មែរ / EN / 中文 */}
          <button
            type="button"
            onClick={() =>
              setLanguage(language === 'km' ? 'en' : language === 'en' ? 'zh' : 'km')
            }
            className="px-2 h-9 rounded-xl bg-white/15 hover:bg-white/25 text-[11px] font-extrabold tracking-wide flex items-center gap-1 border border-white/25 transition active:scale-95 cursor-pointer shrink-0"
            title="ប្តូរភាសា / Switch Language / 切换语言 (ខ្មែរ • EN • 中文)"
          >
            <span className={language === 'km' ? 'text-amber-300' : 'text-white/70'}>ខ្មែរ</span>
            <span className="text-white/30">/</span>
            <span className={language === 'en' ? 'text-amber-300' : 'text-white/70'}>EN</span>
            <span className="text-white/30">/</span>
            <span className={language === 'zh' ? 'text-amber-300' : 'text-white/70'}>中文</span>
          </button>

          {/* Overflow Menu Button (AI Assistant, Notifications, QR, Install, Support — No Admin Login) */}
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
                      setIsAiTripPlannerModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-white/10 transition cursor-pointer text-left"
                  >
                    <span className="flex items-center gap-2.5 font-bold text-amber-300">
                      <IconSmartAssistant className="w-4 h-4 text-amber-400" />
                      <span>{tr(language, 'ជំនួយការ AI ឆ្លាតវៃ', 'Smart AI Assistant', 'AI 智能助手')}</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsNotificationsModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-white/10 transition cursor-pointer text-left"
                  >
                    <span className="flex items-center gap-2.5 font-semibold">
                      <Bell className="w-4 h-4 text-emerald-400" />
                      <span>{tr(language, 'ដំណឹង និងការណែនាំ', 'Notifications', '通知与推荐')}</span>
                    </span>
                    {unreadNotificationsCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold">
                        {unreadNotificationsCount}
                      </span>
                    )}
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
                    <span>{tr(language, 'ស្កេន QR Code ហាង', 'Scan QR Code', '扫描店铺二维码')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      openInstallModal('android');
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-white/10 transition cursor-pointer text-left font-semibold"
                  >
                    <Download className="w-4 h-4 text-sky-400" />
                    <span>{tr(language, 'ទាញយកកម្មវិធី (APK / App)', 'Download App', '下载应用 (APK)')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsSupportModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-white/10 transition cursor-pointer text-left font-semibold"
                  >
                    <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                    <span>{tr(language, 'គាំទ្រការអភិវឌ្ឍ App', 'Support App', '支持应用开发')}</span>
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
