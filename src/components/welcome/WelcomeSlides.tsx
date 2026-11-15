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
 * Full-screen Angkor AI Robot Welcome / Launch Screen matching the user's artwork template (768x1024).
 * Overlays crisp interactive Logo, Khmer/English/Chinese titles, 4 glowing feature tiles,
 * AI Assistant bar, 3 quick-action items, bottom "ចាប់ផ្តើមប្រើប្រាស់ >" CTA button,
 * and "ប្រើបានទោះគ្មានអ៊ីនធឺណិត" offline readiness badge.
 */
export const WelcomeSlides: React.FC<Props> = ({ language, onLanguage, onFinish }) => {
  return (
    <div className="relative w-full h-full bg-[#031B38] overflow-hidden select-none flex items-center justify-center font-khmer">
      {/* Blurred ambient backdrop for ultra-wide desktop screens */}
      <img
        src={WELCOME_IMAGES.hero.src}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full object-cover blur-2xl opacity-50 scale-105"
      />

      {/* Main Responsive Stage locked to the artwork coordinate space */}
      <div className="relative w-full h-full max-w-[540px] mx-auto overflow-hidden shadow-2xl">
        {/* Clean artwork background (768x1024) */}
        <img
          src={WELCOME_IMAGES.hero.src}
          alt="Cambodia Flavors & Tourism Welcome"
          width={WELCOME_IMAGES.hero.width}
          height={WELCOME_IMAGES.hero.height}
          fetchPriority="high"
          decoding="async"
          className="pointer-events-none absolute inset-0 w-full h-full object-fill select-none"
        />

        {/* Top-Right Language Switcher (ខ្មែរ | EN | 中文) */}
        <WelcomeTopBar language={language} onLanguage={onLanguage} />

        {/* 1. App Logo inside Glowing Gold Rounded Square (Right of Robot, Above Title) */}
        <div
          style={{
            top: '18.6%',
            left: '53.2%',
            width: '22.4%',
            height: '15.4%',
          }}
          className="absolute z-20 flex items-center justify-center"
        >
          <div className="w-full h-full rounded-[24%] p-[2.5px] bg-gradient-to-b from-[#FEF08A] via-[#FACC15] to-[#D97706] shadow-[0_0_24px_rgba(250,204,21,0.85),0_6px_18px_rgba(0,0,0,0.5)]">
            <div className="w-full h-full rounded-[22%] overflow-hidden bg-[#06281E] flex items-center justify-center">
              <img
                src={WELCOME_IMAGES.logo}
                alt="Cambodia Flavors & Tourism Logo"
                className="w-full h-full object-cover scale-[1.04]"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = WELCOME_IMAGES.logoFallback;
                }}
              />
            </div>
          </div>
        </div>

        {/* 2. Main Khmer Title & English/Chinese Subtitle (Above the Golden Arc at y=44.5%) */}
        <div
          style={{
            top: '35.0%',
            left: '34.5%',
            right: '2.5%',
            height: '9.2%',
          }}
          className="absolute z-20 flex flex-col items-center justify-center text-center px-1"
        >
          <h1
            className="font-khmer font-extrabold text-white tracking-wide leading-[1.35] whitespace-nowrap"
            style={{
              fontSize: 'clamp(16px, 4.9vw, 24px)',
              textShadow: '0 2px 10px rgba(0, 15, 40, 0.95), 0 0 18px rgba(56, 189, 248, 0.45)',
            }}
          >
            រសជាតិ និងទេសចរណ៍កម្ពុជា
          </h1>
          <p
            className="font-extrabold text-white/95 tracking-wide leading-tight mt-0.5 whitespace-nowrap"
            style={{
              fontSize: 'clamp(11.5px, 3.35vw, 16px)',
              textShadow: '0 2px 8px rgba(0, 15, 40, 0.95)',
            }}
          >
            {language === 'zh' ? '柬埔寨风味与旅游 • Cambodia Flavors & Tourism' : 'Cambodia Flavors & Tourism'}
          </p>
        </div>

        {/* 3. Four Glowing Cyan Square Feature Tiles (y = 48.05% .. 59.38%) */}
        {/* Tile 1: ម្ហូបខ្មែរ (Food) */}
        <button
          type="button"
          onClick={() => onFinish('food')}
          style={{
            top: '48.05%',
            left: '9.38%',
            width: '17.71%',
            height: '11.33%',
          }}
          className="absolute z-20 flex flex-col items-center justify-center gap-1 px-1 rounded-[18px] bg-transparent hover:bg-cyan-400/10 active:scale-95 transition cursor-pointer group"
        >
          <svg
            className="w-[38%] h-[38%] text-[#FACC15] drop-shadow-[0_2px_6px_rgba(250,204,21,0.45)] group-hover:scale-105 transition-transform"
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
              fontSize: 'clamp(10px, 2.85vw, 13.5px)',
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            }}
          >
            {tr(language, 'ម្ហូបខ្មែរ', 'Food', '高棉美食')}
          </span>
        </button>

        {/* Tile 2: ទេសចរណ៍ (Tourism / Angkor Wat) */}
        <button
          type="button"
          onClick={() => onFinish('tourism')}
          style={{
            top: '48.05%',
            left: '31.25%',
            width: '17.32%',
            height: '11.33%',
          }}
          className="absolute z-20 flex flex-col items-center justify-center gap-1 px-1 rounded-[18px] bg-transparent hover:bg-cyan-400/10 active:scale-95 transition cursor-pointer group"
        >
          <svg
            className="w-[40%] h-[40%] text-[#FACC15] drop-shadow-[0_2px_6px_rgba(250,204,21,0.45)] group-hover:scale-105 transition-transform"
            viewBox="0 0 36 36"
            fill="currentColor"
          >
            <path d="M18 5l3.2 6.5h-6.4L18 5zm-8.5 5.5l2.4 5H7.1l2.4-5zm17 0l2.4 5h-4.8l2.4-5zM14 12.5h8v5h-8v-5zm-7.5 4h5v5h-5v-5zm18 0h5v5h-5v-5zM5 22.5h26v3H5v-3zm-1.5 4h29v2.5h-29v-2.5z" />
          </svg>
          <span
            className="font-khmer font-extrabold text-white leading-tight text-center whitespace-nowrap"
            style={{
              fontSize: 'clamp(10px, 2.85vw, 13.5px)',
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            }}
          >
            {tr(language, 'ទេសចរណ៍', 'Tourism', '旅游景点')}
          </span>
        </button>

        {/* Tile 3: ចំណូលចិត្ត (Favorites / Heart) */}
        <button
          type="button"
          onClick={() => onFinish('favorites')}
          style={{
            top: '48.05%',
            left: '52.86%',
            width: '17.19%',
            height: '11.33%',
          }}
          className="absolute z-20 flex flex-col items-center justify-center gap-1 px-1 rounded-[18px] bg-transparent hover:bg-cyan-400/10 active:scale-95 transition cursor-pointer group"
        >
          <svg
            className="w-[38%] h-[38%] text-[#FACC15] drop-shadow-[0_2px_6px_rgba(250,204,21,0.45)] group-hover:scale-105 transition-transform"
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
              fontSize: 'clamp(10px, 2.85vw, 13.5px)',
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            }}
          >
            {tr(language, 'ចំណូលចិត្ត', 'Favorites', '我的收藏')}
          </span>
        </button>

        {/* Tile 4: ផែនទី (Map / Near Me) */}
        <button
          type="button"
          onClick={() => onFinish('map')}
          style={{
            top: '48.05%',
            left: '74.22%',
            width: '17.19%',
            height: '11.33%',
          }}
          className="absolute z-20 flex flex-col items-center justify-center gap-1 px-1 rounded-[18px] bg-transparent hover:bg-cyan-400/10 active:scale-95 transition cursor-pointer group"
        >
          <svg
            className="w-[38%] h-[38%] text-[#FACC15] drop-shadow-[0_2px_6px_rgba(250,204,21,0.45)] group-hover:scale-105 transition-transform"
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
              fontSize: 'clamp(10px, 2.85vw, 13.5px)',
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            }}
          >
            {tr(language, 'ផែនទី', 'Map', '附近地图')}
          </span>
        </button>

        {/* 4. Long Horizontal Glowing Cyan AI Pill Bar (y = 61.52% .. 68.55%) */}
        <button
          type="button"
          onClick={() => onFinish('ai_assistant')}
          style={{
            top: '61.52%',
            left: '9.25%',
            width: '82.16%',
            height: '7.03%',
          }}
          className="absolute z-20 flex items-center justify-between px-2.5 sm:px-3.5 rounded-full bg-transparent hover:bg-cyan-400/10 active:scale-[0.99] transition cursor-pointer group"
        >
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            {/* Cute AI Robot Head Icon */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-cyan-300/70 shadow-[0_0_10px_rgba(56,189,248,0.65)] shrink-0 bg-[#0A2540]">
              <img
                src={WELCOME_IMAGES.robotHead}
                alt="AI Assistant"
                className="w-full h-full object-cover"
              />
            </div>
            {/* AI Pill Tag */}
            <span className="px-2 py-0.5 rounded-full bg-blue-500/40 border border-cyan-300/60 text-white font-black text-[11px] sm:text-xs tracking-wider shrink-0 shadow-[0_0_8px_rgba(56,189,248,0.45)]">
              AI
            </span>
            {/* Vertical Divider */}
            <span className="h-5 w-px bg-cyan-300/50 shrink-0" aria-hidden="true" />
            {/* AI Bar Title */}
            <span
              className="font-khmer font-extrabold text-white truncate"
              style={{
                fontSize: 'clamp(11px, 3.2vw, 15px)',
                textShadow: '0 1px 5px rgba(0,0,0,0.9)',
              }}
            >
              {tr(
                language,
                'ជំនួយការ AI ម្ហូបអាហារ និងទេសចរណ៍',
                'AI Food & Travel Assistant',
                'AI 美食与旅游智能助手'
              )}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-white shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* 5. Three Quick-Action Items Separated by the 2 Vertical Cyan Lines (y = 70.3% .. 77.7%) */}
        {/* Column 1: សុខភាព និងអាហារូបត្ថម្ភ (left of x=37.45%) */}
        <button
          type="button"
          onClick={() => onFinish('healthy')}
          style={{
            top: '70.1%',
            left: '5.5%',
            width: '31.5%',
            height: '7.6%',
          }}
          className="absolute z-20 flex flex-col items-center justify-center gap-0.5 px-1 rounded-xl hover:bg-white/5 active:scale-95 transition cursor-pointer"
        >
          <svg
            className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white shrink-0 drop-shadow-[0_1px_4px_rgba(56,189,248,0.6)]"
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
            className="font-khmer font-bold text-white leading-[1.3] text-center line-clamp-2"
            style={{
              fontSize: 'clamp(9px, 2.45vw, 12px)',
              textShadow: '0 1px 4px rgba(0,0,0,0.95)',
            }}
          >
            {tr(language, 'សុខភាព និងអាហារូបត្ថម្ភ', 'Health & Nutrition', '健康与营养')}
          </span>
        </button>

        {/* Column 2: មុខម្ហូបគួរឱ្យចង់ញ៉ាំថ្ងៃនេះ (between x=37.5% and x=62.5%) */}
        <button
          type="button"
          onClick={() => onFinish('what_to_eat')}
          style={{
            top: '70.1%',
            left: '37.8%',
            width: '24.4%',
            height: '7.6%',
          }}
          className="absolute z-20 flex flex-col items-center justify-center gap-0.5 px-1 rounded-xl hover:bg-white/5 active:scale-95 transition cursor-pointer"
        >
          <svg
            className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white shrink-0 drop-shadow-[0_1px_4px_rgba(56,189,248,0.6)]"
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
            className="font-khmer font-bold text-white leading-[1.3] text-center line-clamp-2"
            style={{
              fontSize: 'clamp(8.8px, 2.35vw, 11.5px)',
              textShadow: '0 1px 4px rgba(0,0,0,0.95)',
            }}
          >
            {tr(language, 'មុខម្ហូបគួរឱ្យចង់ញ៉ាំថ្ងៃនេះ', 'Recommended Dishes Today', '今日推荐美食')}
          </span>
        </button>

        {/* Column 3: ស្វែងរកទីកន្លែងដើរលេងសម្រាប់ថ្ងៃនេះ (right of x=62.55%) */}
        <button
          type="button"
          onClick={() => onFinish('discover_places')}
          style={{
            top: '70.1%',
            left: '62.8%',
            width: '31.7%',
            height: '7.6%',
          }}
          className="absolute z-20 flex flex-col items-center justify-center gap-0.5 px-1 rounded-xl hover:bg-white/5 active:scale-95 transition cursor-pointer"
        >
          <Compass className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white shrink-0 drop-shadow-[0_1px_4px_rgba(56,189,248,0.6)]" />
          <span
            className="font-khmer font-bold text-white leading-[1.3] text-center line-clamp-2"
            style={{
              fontSize: 'clamp(8.8px, 2.35vw, 11.5px)',
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
        </button>

        {/* 6. Bottom Glowing Blue-Purple CTA Pill Button (y = 79.10% .. 86.72%) */}
        <button
          type="button"
          onClick={() => onFinish('home')}
          style={{
            top: '79.10%',
            left: '20.83%',
            width: '58.08%',
            height: '7.62%',
          }}
          className="absolute z-20 rounded-full flex items-center justify-center gap-2 px-4 bg-transparent hover:bg-white/5 active:scale-[0.98] transition cursor-pointer group"
        >
          <span
            className="font-khmer font-extrabold text-white tracking-wide whitespace-nowrap"
            style={{
              fontSize: 'clamp(15px, 4.4vw, 21px)',
              textShadow: '0 2px 8px rgba(15, 23, 42, 0.85)',
            }}
          >
            {WELCOME_LABELS.start[language]}
          </span>
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.8] shrink-0 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* 7. Offline Mode Readiness Badge ("ប្រើបានទោះគ្មានអ៊ីនធឺណិត") */}
        <div
          style={{
            top: '88.0%',
            left: '6.5%',
            right: '6.5%',
          }}
          className="absolute z-20 inline-flex flex-col gap-0.5 rounded-2xl bg-[#042f2e]/90 border border-emerald-400/45 px-3 py-2 shadow-[0_6px_20px_rgba(0,0,0,0.55)] backdrop-blur-xs"
        >
          <div className="flex items-center gap-2 text-emerald-300 text-xs sm:text-sm font-extrabold">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/25 border border-emerald-400/40 shrink-0">
              <WifiOff className="w-3.5 h-3.5 text-emerald-300" />
            </span>
            <span className="truncate">{WELCOME_LABELS.offlineBadge[language]}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-auto" />
          </div>
          <p className="text-[10.5px] sm:text-xs text-emerald-100/95 leading-snug pl-8 line-clamp-2">
            {WELCOME_LABELS.offlineSub[language]}
          </p>
        </div>
      </div>
    </div>
  );
};
