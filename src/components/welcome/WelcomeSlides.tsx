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
 * - App Logo reduced by 40% (13.2% width, 1:1 square) with proportional Title & Subtitle below it.
 * - Recognizable Angkor Wat 3-spire landmark icon for Tourism.
 * - Middle AI bar removed per user design.
 * - Only the "ចាប់ផ្តើមប្រើប្រាស់ >" (Get Started) button is clickable; all other tiles are non-interactive display elements.
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

        {/* 1. App Logo Reduced by 40% inside Glowing Gold 1:1 Square (Right of Robot, Above Title) */}
        <div
          style={{
            top: '23.4%',
            left: '58.2%',
            width: '13.0%',
            aspectRatio: '1 / 1',
          }}
          className="pointer-events-none absolute z-20 flex items-center justify-center"
        >
          <div className="w-full h-full rounded-[22%] p-[2px] bg-gradient-to-b from-[#FEF08A] via-[#FACC15] to-[#D97706] shadow-[0_0_18px_rgba(250,204,21,0.85),0_4px_12px_rgba(0,0,0,0.5)]">
            <div className="w-full h-full rounded-[20%] overflow-hidden bg-[#06281E] flex items-center justify-center">
              <img
                src={WELCOME_IMAGES.logo}
                alt="Cambodia Flavors & Tourism Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = WELCOME_IMAGES.logoFallback;
                }}
              />
            </div>
          </div>
        </div>

        {/* 2. Proportional Khmer Title & English/Chinese Subtitle (Above the Golden Arc) */}
        <div
          style={{
            top: '37.2%',
            left: '36.5%',
            right: '3.0%',
            height: '8.0%',
          }}
          className="pointer-events-none absolute z-20 flex flex-col items-center justify-center text-center px-1"
        >
          <h1
            className="font-khmer font-extrabold text-white tracking-wide leading-[1.32] whitespace-nowrap"
            style={{
              fontSize: 'clamp(11px, 3.55cqw, 17.5px)',
              textShadow: '0 2px 10px rgba(0, 15, 40, 0.95), 0 0 16px rgba(56, 189, 248, 0.45)',
            }}
          >
            រសជាតិ និងទេសចរណ៍កម្ពុជា
          </h1>
          <p
            className="font-extrabold text-white/95 tracking-wide leading-tight mt-0.5 whitespace-nowrap"
            style={{
              fontSize: 'clamp(8.5px, 2.5cqw, 12.2px)',
              textShadow: '0 2px 8px rgba(0, 15, 40, 0.95)',
            }}
          >
            {language === 'zh' ? '柬埔寨风味与旅游 • Cambodia Flavors & Tourism' : 'Cambodia Flavors & Tourism'}
          </p>
        </div>

        {/* 3. Four Glowing Cyan Square Feature Tiles (y = 51.17% .. 63.28%, Non-Clickable Visual Preview) */}
        {/* Tile 1: ម្ហូបខ្មែរ (Food) */}
        <div
          style={{
            top: '51.17%',
            left: '9.38%',
            width: '17.71%',
            height: '12.11%',
          }}
          className="pointer-events-none absolute z-20 flex flex-col items-center justify-center gap-1 px-1 rounded-[16px]"
        >
          <svg
            className="w-[38%] h-[38%] text-[#FACC15] drop-shadow-[0_2px_6px_rgba(250,204,21,0.45)]"
            viewBox="0 0 36 36"
            fill="none"
          >
            <path d="M13 6c0 2.2-1.8 2.8-1.8 5M18 5c0 2.2-1.8 2.8-1.8 5M23 6c0 2.2-1.8 2.8-1.8 5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
            <path d="M6 15h24c0 7.2-5.2 12.5-12 12.5S6 22.2 6 15Z" fill="currentColor" fillOpacity="0.88" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 29.5h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span
            className="font-khmer font-extrabold text-white leading-tight text-center whitespace-nowrap"
            style={{
              fontSize: 'clamp(9.5px, 2.75cqw, 13.5px)',
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            }}
          >
            {tr(language, 'ម្ហូបខ្មែរ', 'Food', '高棉美食')}
          </span>
        </div>

        {/* Tile 2: ទេសចរណ៍ (Tourism — Recognizable Angkor Wat 3-Tower Landmark Icon) */}
        <div
          style={{
            top: '51.17%',
            left: '30.99%',
            width: '17.58%',
            height: '12.11%',
          }}
          className="pointer-events-none absolute z-20 flex flex-col items-center justify-center gap-1 px-1 rounded-[16px]"
        >
          <svg
            className="w-[40%] h-[40%] text-[#FACC15] drop-shadow-[0_2px_6px_rgba(250,204,21,0.45)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Stepped temple foundation & gallery */}
            <path d="M2.5 20h19" />
            <path d="M4 20v-4.5h16V20" fill="currentColor" fillOpacity="0.18" />
            {/* Central Angkor lotus tower */}
            <path d="M9.5 15.5V9l2.5-5 2.5 5v6.5" fill="currentColor" fillOpacity="0.22" />
            <path d="M12 2.5V4" />
            {/* Left lotus tower */}
            <path d="M5 15.5v-4.2l2.2-3.5 2.3 3.5v4.2" />
            {/* Right lotus tower */}
            <path d="M14.5 15.5v-4.2l2.3-3.5 2.2 3.5v4.2" />
            {/* Central sanctuary entrance */}
            <path d="M11 20v-2.4a1 1 0 0 1 2 0V20" />
          </svg>
          <span
            className="font-khmer font-extrabold text-white leading-tight text-center whitespace-nowrap"
            style={{
              fontSize: 'clamp(9.5px, 2.75cqw, 13.5px)',
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            }}
          >
            {tr(language, 'ទេសចរណ៍', 'Tourism', '旅游景点')}
          </span>
        </div>

        {/* Tile 3: ចំណូលចិត្ត (Favorites / Heart) */}
        <div
          style={{
            top: '51.17%',
            left: '52.47%',
            width: '17.58%',
            height: '12.11%',
          }}
          className="pointer-events-none absolute z-20 flex flex-col items-center justify-center gap-1 px-1 rounded-[16px]"
        >
          <svg
            className="w-[38%] h-[38%] text-[#FACC15] drop-shadow-[0_2px_6px_rgba(250,204,21,0.45)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          <span
            className="font-khmer font-extrabold text-white leading-tight text-center whitespace-nowrap"
            style={{
              fontSize: 'clamp(9.5px, 2.75cqw, 13.5px)',
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            }}
          >
            {tr(language, 'ចំណូលចិត្ត', 'Favorites', '我的收藏')}
          </span>
        </div>

        {/* Tile 4: ផែនទី (Map / Near Me) */}
        <div
          style={{
            top: '51.17%',
            left: '73.96%',
            width: '17.58%',
            height: '12.11%',
          }}
          className="pointer-events-none absolute z-20 flex flex-col items-center justify-center gap-1 px-1 rounded-[16px]"
        >
          <svg
            className="w-[38%] h-[38%] text-[#FACC15] drop-shadow-[0_2px_6px_rgba(250,204,21,0.45)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a6 6 0 0 0-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 0 0-6-6Z" />
            <circle cx="12" cy="8" r="2.2" />
            <path d="M4 16l-2 5 6-1.5 4 1.5 4-1.5 6 1.5-2-5" />
          </svg>
          <span
            className="font-khmer font-extrabold text-white leading-tight text-center whitespace-nowrap"
            style={{
              fontSize: 'clamp(9.5px, 2.75cqw, 13.5px)',
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            }}
          >
            {tr(language, 'ផែនទី', 'Map', '附近地图')}
          </span>
        </div>

        {/* 4. ONLY Functional Button: Glowing Blue-Purple "ចាប់ផ្តើមប្រើប្រាស់ >" (Get Started) CTA Pill (y = 65.82% .. 74.61%) */}
        <button
          type="button"
          onClick={() => onFinish('home')}
          style={{
            top: '65.82%',
            left: '15.89%',
            width: '68.22%',
            height: '8.79%',
          }}
          className="
            absolute z-30 rounded-full flex items-center justify-center gap-1.5 px-4
            bg-transparent hover:bg-white/5 active:scale-[0.98] transition cursor-pointer group
          "
        >
          <span
            className="font-khmer font-extrabold text-white tracking-wide whitespace-nowrap"
            style={{
              fontSize: 'clamp(14px, 4.3cqw, 21px)',
              textShadow: '0 2px 8px rgba(15, 23, 42, 0.85)',
            }}
          >
            {WELCOME_LABELS.start[language]}
          </span>
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.8] shrink-0 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* 5. Three Non-Interactive Feature Highlights with Crisp CSS Cyan Dividers (y = 76.2% .. 83.6%) */}
        <div
          style={{
            top: '76.2%',
            left: '4.8%',
            right: '4.8%',
            height: '7.4%',
          }}
          className="pointer-events-none absolute z-20 grid grid-cols-[1fr_1.08fr_1.18fr] items-center divide-x divide-cyan-300/45"
        >
          {/* Column 1: សុខភាព និងអាហារូបត្ថម្ភ */}
          <div className="h-full flex flex-col items-center justify-center gap-0.5 px-1">
            <svg
              style={{ width: '4.6cqw', height: '4.6cqw', minWidth: '16px', minHeight: '16px', maxWidth: '22px', maxHeight: '22px' }}
              className="text-white shrink-0 drop-shadow-[0_1px_4px_rgba(56,189,248,0.6)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              <path d="M3.5 12h4l2-3 3 6 2-3h5" />
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
          <div className="h-full flex flex-col items-center justify-center gap-0.5 px-1">
            <svg
              style={{ width: '4.6cqw', height: '4.6cqw', minWidth: '16px', minHeight: '16px', maxWidth: '22px', maxHeight: '22px' }}
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
                fontSize: 'clamp(7.4px, 2.05cqw, 10.5px)',
                textShadow: '0 1px 4px rgba(0,0,0,0.95)',
              }}
            >
              {tr(language, 'មុខម្ហូបគួរឱ្យចង់ញ៉ាំថ្ងៃនេះ', 'Dishes to Try Today', '今日推荐美食')}
            </span>
          </div>

          {/* Column 3: ស្វែងរកទីកន្លែងដើរលេងសម្រាប់ថ្ងៃនេះ */}
          <div className="h-full flex flex-col items-center justify-center gap-0.5 px-1">
            <Compass
              style={{ width: '4.6cqw', height: '4.6cqw', minWidth: '16px', minHeight: '16px', maxWidth: '22px', maxHeight: '22px' }}
              className="text-white shrink-0 drop-shadow-[0_1px_4px_rgba(56,189,248,0.6)]"
            />
            <span
              className="font-khmer font-bold text-white leading-[1.28] text-center whitespace-nowrap"
              style={{
                fontSize: 'clamp(7.1px, 1.95cqw, 10px)',
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

        {/* 6. Offline Mode Readiness Badge ("ប្រើបានទោះគ្មានអ៊ីនធឺណិត") */}
        <div
          style={{
            top: '85.2%',
            left: '6.5%',
            right: '6.5%',
          }}
          className="pointer-events-none absolute z-20 inline-flex flex-col gap-0.5 rounded-2xl bg-[#042f2e]/92 border border-emerald-400/45 px-2.5 py-1.5 shadow-[0_6px_20px_rgba(0,0,0,0.55)]"
        >
          <div
            style={{ fontSize: 'clamp(9.5px, 2.7cqw, 13px)' }}
            className="flex items-center gap-1.5 text-emerald-300 font-extrabold leading-tight"
          >
            <span
              style={{ width: '4.6cqw', height: '4.6cqw', minWidth: '18px', minHeight: '18px', maxWidth: '24px', maxHeight: '24px' }}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500/25 border border-emerald-400/40 shrink-0"
            >
              <WifiOff className="w-3 h-3 text-emerald-300" />
            </span>
            <span className="truncate">{WELCOME_LABELS.offlineBadge[language]}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-auto" />
          </div>
          <p
            style={{ fontSize: 'clamp(8px, 2.15cqw, 10.8px)' }}
            className="text-emerald-100/95 leading-snug pl-6 line-clamp-2"
          >
            {WELCOME_LABELS.offlineSub[language]}
          </p>
        </div>
      </div>
    </div>
  );
};
