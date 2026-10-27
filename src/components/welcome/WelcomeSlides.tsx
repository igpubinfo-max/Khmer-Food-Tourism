import React from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';
import type { Language } from '../../types';
import { WELCOME_SLIDES, WELCOME_LABELS, WELCOME_IMAGES } from './welcomeContent';
import { WelcomeTopBar } from './WelcomeTopBar';

interface Props {
  language: Language;
  onLanguage: (lang: Language) => void;
  onFinish: () => void;
}

/**
 * Single Angkor Wat Welcome Screen featuring:
 * - Language selector at top-right
 * - Clear view of Angkor Wat towers in background
 * - Centered prominent app icon positioned directly above the offline-status badge
 * - Offline mode badge ("Works Offline — No Internet Required")
 * - Headline & description
 * - High-contrast "Get Started" button
 */
export const WelcomeSlides: React.FC<Props> = ({ language, onLanguage, onFinish }) => {
  const slide = WELCOME_SLIDES[0];

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-slate-950 select-none"
      role="region"
      aria-label={WELCOME_LABELS.appName[language]}
    >
      <div className="relative h-full w-full">
        {/* Full-bleed Angkor Wat Background */}
        <img
          src={slide.image}
          alt=""
          width={slide.imageWidth}
          height={slide.imageHeight}
          loading="eager"
          decoding="async"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: slide.objectPosition }}
        />

        {/* Ambient gradients for high readability while keeping Angkor Wat scenery luminous */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 via-black/25 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black/95 via-black/80 to-transparent pointer-events-none" />

        {/* Main Content pinned cleanly at the bottom */}
        <div
          className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center justify-end px-5 sm:px-6 pointer-events-auto"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
        >
          <div className="w-full max-w-sm flex flex-col items-center">
            {/* Centered Large App Icon positioned directly above the offline panel */}
            <div className="mb-3 sm:mb-4 flex items-center justify-center">
              <img
                src={WELCOME_IMAGES.logo}
                alt="Khmer Food & Tourism"
                width={156}
                height={156}
                className="w-32 h-32 sm:w-36 sm:h-36 object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.75)] select-none animate-in fade-in zoom-in-95 duration-500"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = WELCOME_IMAGES.logoFallback;
                }}
              />
            </div>

            {/* Offline Mode Badge */}
            <div className="w-full mb-3 sm:mb-4 inline-flex flex-col gap-1 rounded-2xl bg-emerald-950/85 backdrop-blur-md border border-emerald-400/40 px-3.5 py-2.5 shadow-lg">
              <div className="flex items-center gap-2 text-emerald-300 text-xs sm:text-sm font-extrabold">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/25 border border-emerald-400/40 shrink-0">
                  <WifiOff className="w-3.5 h-3.5 text-emerald-300" />
                </span>
                <span className="truncate">{WELCOME_LABELS.offlineBadge[language]}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-auto" />
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-100/90 leading-snug pl-8">
                {WELCOME_LABELS.offlineSub[language]}
              </p>
            </div>

            {/* Title & Description */}
            <div className="w-full text-left mb-4 sm:mb-5">
              <h2
                className={`font-extrabold text-white leading-tight ${language === 'km' ? 'font-moul text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}
                style={{ textShadow: '0 2px 14px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.9)' }}
              >
                {slide.headline[language]}
              </h2>
              <p
                className="mt-1.5 text-xs sm:text-sm font-medium text-white/95 leading-relaxed line-clamp-2"
                style={{ textShadow: '0 1px 8px rgba(0,0,0,0.95)' }}
              >
                {slide.sub[language]}
              </p>
            </div>

            {/* Start Button */}
            <button
              type="button"
              onClick={onFinish}
              className="w-full min-h-[52px] sm:min-h-[56px] rounded-full bg-gradient-to-r from-[#f6c343] via-[#f08c2b] to-[#e05326] hover:brightness-105 active:scale-[0.98] transition motion-reduce:transition-none text-white text-base sm:text-lg font-extrabold tracking-wide shadow-[0_10px_26px_rgba(224,83,38,0.45)] cursor-pointer"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}
            >
              {WELCOME_LABELS.start[language]}
            </button>
          </div>
        </div>
      </div>

      {/* Top bar with language selector at top-right */}
      <WelcomeTopBar language={language} onLanguage={onLanguage} />
    </div>
  );
};
