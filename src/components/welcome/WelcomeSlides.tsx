import React from 'react';
import { ChevronRight, WifiOff, CheckCircle2, Compass } from 'lucide-react';
import type { Language } from '../../types';
import { WELCOME_IMAGES, WELCOME_LABELS } from './welcomeContent';
import { WelcomeTopBar } from './WelcomeTopBar';
import { tr } from '../../utils/i18n';
import type { WelcomeTargetAction } from '../WelcomeScreenModal';

interface Props {
  language: Language;
  onLanguage: (lang: Language) => void;
  onFinish: (action?: WelcomeTargetAction) => void;
}

/**
 * Fully Responsive Angkor AI Robot Welcome / Launch Screen:
 * - Strictly preserves the original 3:4 (768x1024) artwork aspect ratio on ALL phones, foldables, iPads, and tablets.
 * - Matches the exact reference layout:
 *   1. Top-Right Language Switcher (ខ្មែរ | EN | 中文)
 *   2. 3D Gold-Framed App Logo above Title & Subtitle
 *   3. 4 Feature Cards (ម្ហូបខ្មែរ, ទេសចរណ៍ with Hiker/Mountain/Sun icon, ចំណូលចិត្ត, ផែនទី)
 *   4. Primary "ចាប់ផ្តើមប្រើប្រាស់ >" (Get Started) button directly below the 4 feature cards
 *   5. 3-Column Feature Strip below the Get Started button
 *   6. Transparent Offline Mode notice at the bottom over the glowing wave background
 * - Only the "ចាប់ផ្តើមប្រើប្រាស់ >" (Get Started) button (and language switcher) is clickable; all other tiles are non-interactive display elements.
 */
export const WelcomeSlides: React.FC<Props> = ({ language, onLanguage, onFinish }) => {
  return (
    <div
      style={{
        paddingTop: 'var(--kft-safe-top, 0px)',
        paddingBottom: 'var(--kft-safe-bottom, 0px)',
        paddingLeft: 'var(--kft-safe-left, 0px)',
        paddingRight: 'var(--kft-safe-right, 0px)',
      }}
      className="relative w-full h-full bg-[#12151C] overflow-y-auto overflow-x-hidden select-none flex items-center justify-center font-khmer"
    >
      {/* Aspect-Ratio Locked Stage (768x1024 = 3:4) — Never stretches vertically or horizontally */}
      <div
        style={{
          width: 'min(100vw, calc((100dvh - var(--kft-safe-top, 0px) - var(--kft-safe-bottom, 0px)) * 0.75), 480px)',
          aspectRatio: '3 / 4',
          containerType: 'inline-size',
        }}
        className="relative mx-auto my-auto shrink-0 overflow-hidden bg-[#031B38] min-[481px]:rounded-[28px] min-[481px]:shadow-[0_20px_60px_rgba(0,0,0,0.85)] min-[481px]:border min-[481px]:border-white/10"
      >
        {/* Clean artwork background (768x1024 = 3:4) */}
        <img
          src={WELCOME_IMAGES.hero.src}
          alt="Cambodia Flavors & Tourism Welcome"
          width={WELCOME_IMAGES.hero.width}
          height={WELCOME_IMAGES.hero.height}
          fetchPriority="high"
          decoding="async"
          className="pointer-events-none absolute inset-0 w-full h-full object-contain select-none"
        />

        {/* Top-Right Language Badge (ខ្មែរ | EN | 中文) */}
        <WelcomeTopBar language={language} onLanguage={onLanguage} />

        {/* 1. App Logo (3D Gold-Framed PNG, Right of Robot, Above Title) */}
        <div
          style={{
            top: '26.1%',
            left: '60.4%',
            width: '14.2%',
            aspectRatio: '1 / 1',
          }}
          className="pointer-events-none absolute z-20 flex items-center justify-center"
        >
          <img
            src={WELCOME_IMAGES.logo}
            alt="Cambodia Flavors & Tourism Logo"
            className="w-full h-full object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.6)]"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = WELCOME_IMAGES.logoFallback;
            }}
          />
        </div>

        {/* 2. Proportional Khmer Title & English/Chinese Subtitle (Above the Golden Arc) */}
        <div
          style={{
            top: '38.0%',
            left: '36.5%',
            right: '3.0%',
            height: '8.0%',
          }}
          className="pointer-events-none absolute z-20 flex flex-col items-center justify-center text-center px-1"
        >
          <h1
            className="font-khmer font-extrabold text-white tracking-wide leading-[1.32] whitespace-nowrap"
            style={{
              fontSize: 'clamp(11px, 3.6cqw, 18px)',
              textShadow: '0 2px 10px rgba(0, 15, 40, 0.95), 0 0 16px rgba(56, 189, 248, 0.45)',
            }}
          >
            រសជាតិ និងទេសចរណ៍កម្ពុជា
          </h1>
          <p
            className="font-extrabold text-white/95 tracking-wide leading-tight mt-0.5 whitespace-nowrap"
            style={{
              fontSize: 'clamp(9.5px, 2.95cqw, 14.5px)',
              textShadow: '0 2px 8px rgba(0, 15, 40, 0.95)',
            }}
          >
            {language === 'zh' ? '柬埔寨风味与旅游' : 'Cambodia Flavors & Tourism'}
          </p>
        </div>

        {/* 3. Row 1: 4 Feature Cards (Non-clickable display elements aligned inside the 4 cyan boxes) */}
        {/* Card 1: ម្ហូបខ្មែរ (Khmer Food) */}
        <div
          style={{ top: '51.2%', left: '9.6%', width: '17.8%', height: '12.1%' }}
          className="pointer-events-none absolute z-20 rounded-2xl flex flex-col items-center justify-between py-[10%] px-1"
        >
          <svg
            style={{ width: '7.5cqw', height: '7.5cqw', minWidth: '24px', minHeight: '24px', maxWidth: '38px', maxHeight: '38px' }}
            className="drop-shadow-[0_2px_6px_rgba(250,204,21,0.55)] shrink-0"
            viewBox="0 0 36 36"
            fill="none"
          >
            <path d="M13 7c0 2-1.5 3-1.5 5M18 6c0 2-1.5 3-1.5 5M23 7c0 2-1.5 3-1.5 5" stroke="#FACC15" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M6 15h24c0 7.5-5.2 13-12 13S6 22.5 6 15Z" fill="url(#goldGrad1)" />
            <rect x="12" y="28.5" width="12" height="2.6" rx="1.3" fill="#FACC15" />
            <defs>
              <linearGradient id="goldGrad1" x1="18" y1="15" x2="18" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FEF08A" />
                <stop offset="1" stopColor="#EAB308" />
              </linearGradient>
            </defs>
          </svg>
          <span
            className="font-khmer font-extrabold text-white tracking-wide leading-[1.25] text-center truncate w-full"
            style={{
              fontSize: 'clamp(9.5px, 2.95cqw, 14px)',
              textShadow: '0 2px 6px rgba(0,0,0,0.9)',
            }}
          >
            {tr(language, 'ម្ហូបខ្មែរ', 'Khmer Food', '高棉美食')}
          </span>
        </div>

        {/* Card 2: ទេសចរណ៍ (Tourism — Hiker, Mountain Trail & Sun Icon) */}
        <div
          style={{ top: '51.2%', left: '31.0%', width: '17.8%', height: '12.1%' }}
          className="pointer-events-none absolute z-20 rounded-2xl flex flex-col items-center justify-between py-[9%] px-1"
        >
          <img
            src={WELCOME_IMAGES.tourismIcon}
            alt="Tourism"
            style={{ width: '9.6cqw', height: '7.4cqw', minWidth: '30px', minHeight: '22px', maxWidth: '48px', maxHeight: '36px' }}
            className="object-contain drop-shadow-[0_2px_6px_rgba(250,204,21,0.55)] shrink-0"
          />
          <span
            className="font-khmer font-extrabold text-white tracking-wide leading-[1.25] text-center truncate w-full"
            style={{
              fontSize: 'clamp(9.5px, 2.95cqw, 14px)',
              textShadow: '0 2px 6px rgba(0,0,0,0.9)',
            }}
          >
            {tr(language, 'ទេសចរណ៍', 'Tourism', '旅游景点')}
          </span>
        </div>

        {/* Card 3: ចំណូលចិត្ត (Favorites) */}
        <div
          style={{ top: '51.2%', left: '52.3%', width: '17.8%', height: '12.1%' }}
          className="pointer-events-none absolute z-20 rounded-2xl flex flex-col items-center justify-between py-[10%] px-1"
        >
          <svg
            style={{ width: '7.5cqw', height: '7.5cqw', minWidth: '24px', minHeight: '24px', maxWidth: '38px', maxHeight: '38px' }}
            className="drop-shadow-[0_2px_6px_rgba(250,204,21,0.55)] shrink-0"
            viewBox="0 0 36 36"
            fill="none"
          >
            <path
              d="M18 30s-11-6.8-11-14.5C7 11.2 10.4 8 14.5 8c2.4 0 4.5 1.2 5.5 3 1-1.8 3.1-3 5.5-3 4.1 0 7.5 3.2 7.5 7.5C29 23.2 18 30 18 30Z"
              stroke="url(#goldGrad3)"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="goldGrad3" x1="18" y1="8" x2="18" y2="30" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FEF08A" />
                <stop offset="1" stopColor="#EAB308" />
              </linearGradient>
            </defs>
          </svg>
          <span
            className="font-khmer font-extrabold text-white tracking-wide leading-[1.25] text-center truncate w-full"
            style={{
              fontSize: 'clamp(9.5px, 2.95cqw, 14px)',
              textShadow: '0 2px 6px rgba(0,0,0,0.9)',
            }}
          >
            {tr(language, 'ចំណូលចិត្ត', 'Favorites', '我的收藏')}
          </span>
        </div>

        {/* Card 4: ផែនទី (Map) */}
        <div
          style={{ top: '51.2%', left: '73.8%', width: '17.8%', height: '12.1%' }}
          className="pointer-events-none absolute z-20 rounded-2xl flex flex-col items-center justify-between py-[10%] px-1"
        >
          <svg
            style={{ width: '7.5cqw', height: '7.5cqw', minWidth: '24px', minHeight: '24px', maxWidth: '38px', maxHeight: '38px' }}
            className="drop-shadow-[0_2px_6px_rgba(250,204,21,0.55)] shrink-0"
            viewBox="0 0 36 36"
            fill="none"
          >
            <path
              d="M18 6c-4.4 0-8 3.4-8 7.6 0 5.2 8 12.4 8 12.4s8-7.2 8-12.4C26 9.4 22.4 6 18 6Zm0 10.2a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6Z"
              stroke="#FACC15"
              strokeWidth="2.5"
            />
            <path
              d="M9 24l-3 5.5 7.5-1.5 4.5 2 4.5-2 7.5 1.5L27 24"
              stroke="#EAB308"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className="font-khmer font-extrabold text-white tracking-wide leading-[1.25] text-center truncate w-full"
            style={{
              fontSize: 'clamp(9.5px, 2.95cqw, 14px)',
              textShadow: '0 2px 6px rgba(0,0,0,0.9)',
            }}
          >
            {tr(language, 'ផែនទី', 'Map', '地图探索')}
          </span>
        </div>

        {/* 4. ONLY Active Button: ចាប់ផ្តើមប្រើប្រាស់ > (Get Started — Directly below the 4 Feature Cards) */}
        <button
          type="button"
          onClick={() => onFinish('home')}
          aria-label={WELCOME_LABELS.start[language]}
          style={{
            top: '66.0%',
            left: '15.1%',
            right: '14.3%',
            height: '8.6%',
          }}
          className="absolute z-20 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-[0.98] hover:brightness-110 focus:outline-none cursor-pointer group"
        >
          <span
            className="font-khmer font-extrabold text-white tracking-wide leading-[1.3]"
            style={{
              fontSize: 'clamp(13.5px, 4.35cqw, 21px)',
              textShadow: '0 2px 8px rgba(15, 23, 42, 0.85)',
            }}
          >
            {WELCOME_LABELS.start[language]}
          </span>
          <ChevronRight
            style={{ width: '5.5cqw', height: '5.5cqw', minWidth: '18px', minHeight: '18px', maxWidth: '26px', maxHeight: '26px' }}
            className="text-white stroke-[3] drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] group-hover:translate-x-1 transition-transform"
          />
        </button>

        {/* 5. 3-Column Feature Strip (Below Get Started Button — Non-clickable display row) */}
        <div
          style={{
            top: '75.5%',
            left: '3.0%',
            right: '3.0%',
            height: '7.5%',
          }}
          className="pointer-events-none absolute z-20 grid grid-cols-3 items-center divide-x divide-sky-300/35"
        >
          {/* Column 1: សុខភាព និងអាហារូបត្ថម្ភ */}
          <div className="h-full flex flex-col items-center justify-center gap-1 px-1">
            <svg
              style={{ width: '4.8cqw', height: '4.8cqw', minWidth: '16px', minHeight: '16px', maxWidth: '23px', maxHeight: '23px' }}
              className="text-white shrink-0 drop-shadow-[0_1px_4px_rgba(56,189,248,0.6)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19.5 12.572 12 20l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572" />
              <path d="M8 12h2l1.5-3 2 5 1.5-2h2" />
            </svg>
            <span
              className="font-khmer font-bold text-white leading-[1.28] text-center whitespace-nowrap"
              style={{
                fontSize: 'clamp(7.5px, 2.1cqw, 10.8px)',
                textShadow: '0 1px 4px rgba(0,0,0,0.95)',
              }}
            >
              {tr(language, 'សុខភាព និងអាហារូបត្ថម្ភ', 'Health & Nutrition', '健康与营养')}
            </span>
          </div>

          {/* Column 2: មុខម្ហូបគួរឱ្យចង់ញ៉ាំថ្ងៃនេះ */}
          <div className="h-full flex flex-col items-center justify-center gap-1 px-1">
            <svg
              style={{ width: '4.8cqw', height: '4.8cqw', minWidth: '16px', minHeight: '16px', maxWidth: '23px', maxHeight: '23px' }}
              className="text-white shrink-0 drop-shadow-[0_1px_4px_rgba(56,189,248,0.6)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 4c0 1.5-1.2 2-1.2 3.5M12 3.5c0 1.5-1.2 2-1.2 3.5" />
              <path d="M15.5 4.2a2 2 0 0 1 3.5 1.3c0 1.3-1.8 1.6-1.8 2.8" />
              <circle cx="17.2" cy="10.2" r="0.6" fill="currentColor" />
              <path d="M4 12h16c0 5-3.5 8.5-8 8.5S4 17 4 12Z" />
            </svg>
            <span
              className="font-khmer font-bold text-white leading-[1.28] text-center whitespace-nowrap"
              style={{
                fontSize: 'clamp(7.5px, 2.1cqw, 10.8px)',
                textShadow: '0 1px 4px rgba(0,0,0,0.95)',
              }}
            >
              {tr(language, 'មុខម្ហូបគួរឱ្យចង់ញ៉ាំថ្ងៃនេះ', 'Dishes to Try Today', '今日推荐美食')}
            </span>
          </div>

          {/* Column 3: ស្វែងរកទីកន្លែងដើរលេងសម្រាប់ថ្ងៃនេះ */}
          <div className="h-full flex flex-col items-center justify-center gap-1 px-1">
            <Compass
              style={{ width: '4.8cqw', height: '4.8cqw', minWidth: '16px', minHeight: '16px', maxWidth: '23px', maxHeight: '23px' }}
              className="text-white shrink-0 drop-shadow-[0_1px_4px_rgba(56,189,248,0.6)]"
            />
            <span
              className="font-khmer font-bold text-white leading-[1.28] text-center whitespace-nowrap"
              style={{
                fontSize: 'clamp(7.2px, 2.0cqw, 10.3px)',
                textShadow: '0 1px 4px rgba(0,0,0,0.95)',
              }}
            >
              {tr(
                language,
                'ស្វែងរកទីកន្លែងដើរលេងសម្រាប់ថ្ងៃនេះ',
                'Places to Visit Today',
                '今日出游景点推荐'
              )}
            </span>
          </div>
        </div>

        {/* 6. Offline Mode Readiness Notice (Transparent over the wave background, matching first attachment) */}
        <div
          style={{
            top: '85.2%',
            left: '9.8%',
            right: '9.2%',
          }}
          className="pointer-events-none absolute z-20 flex flex-col gap-1"
        >
          <div
            style={{
              fontSize: 'clamp(10px, 2.9cqw, 14px)',
              textShadow: '0 2px 6px rgba(0, 12, 32, 0.9)',
            }}
            className="flex items-center gap-2 text-[#6EE7B7] font-extrabold leading-tight"
          >
            <WifiOff
              style={{ width: '4.0cqw', height: '4.0cqw', minWidth: '14px', minHeight: '14px', maxWidth: '19px', maxHeight: '19px' }}
              className="text-[#6EE7B7] shrink-0 drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]"
            />
            <span className="truncate">{WELCOME_LABELS.offlineBadge[language]}</span>
            <CheckCircle2
              style={{ width: '3.8cqw', height: '3.8cqw', minWidth: '13px', minHeight: '13px', maxWidth: '18px', maxHeight: '18px' }}
              className="text-[#6EE7B7]/85 shrink-0 ml-auto drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]"
            />
          </div>
          <p
            style={{
              fontSize: 'clamp(8px, 2.15cqw, 10.8px)',
              textShadow: '0 1px 5px rgba(0, 10, 28, 0.95)',
            }}
            className="text-slate-100/90 font-semibold leading-snug pl-[5.2cqw] whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {WELCOME_LABELS.offlineSub[language]}
          </p>
        </div>
      </div>
    </div>
  );
};