import React from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';
import type { Language } from '../../types';
import { WELCOME_SLIDES, WELCOME_LABELS } from './welcomeContent';
import { WelcomeTopBar } from './WelcomeTopBar';

interface Props {
  language: Language;
  onLanguage: (lang: Language) => void;
  onFinish: () => void;
}

/** Single Angkor Wat Welcome Screen with language selector, Offline Mode badge, and one clear Get Started button. */
export const WelcomeSlides: React.FC<Props> = ({ language, onLanguage, onFinish }) => {
  const slide = WELCOME_SLIDES[0];

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-slate-950 select-none"
      role="region"
      aria-label={WELCOME_LABELS.appName[language]}
    >
      <div className="relative h-full w-full">
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
        {/* Strong gradients so text stays readable on the Angkor Wat photo */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-black/95 via-black/75 to-transparent pointer-events-none" />

        <div
          className="absolute inset-x-0 bottom-0 px-6 text-white"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 112px)' }}
        >
          {/* Offline Mode Badge */}
          <div className="mb-3.5 inline-flex flex-col gap-1 rounded-2xl bg-emerald-950/85 backdrop-blur-md border border-emerald-400/40 px-3.5 py-2.5 shadow-lg max-w-sm">
            <div className="flex items-center gap-2 text-emerald-300 text-xs sm:text-sm font-extrabold">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/25 border border-emerald-400/40 shrink-0">
                <WifiOff className="w-3.5 h-3.5 text-emerald-300" />
              </span>
              <span>{WELCOME_LABELS.offlineBadge[language]}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-auto" />
            </div>
            <p className="text-[11px] sm:text-xs text-emerald-100/90 leading-snug pl-8">
              {WELCOME_LABELS.offlineSub[language]}
            </p>
          </div>

          <h2
            className={`font-extrabold leading-snug ${language === 'km' ? 'font-moul text-2xl' : 'text-3xl'}`}
            style={{ textShadow: '0 2px 14px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.9)' }}
          >
            {slide.headline[language]}
          </h2>
          <p
            className="mt-2 text-base font-medium text-white/95 leading-relaxed"
            style={{ textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}
          >
            {slide.sub[language]}
          </p>
        </div>
      </div>

      <WelcomeTopBar language={language} onLanguage={onLanguage} />

      {/* Bottom control: ONE clear Get Started button */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 px-6 flex flex-col items-center"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
      >
        <button
          type="button"
          onClick={onFinish}
          className="w-full max-w-sm min-h-[56px] rounded-full bg-gradient-to-r from-[#f6c343] via-[#f08c2b] to-[#e05326] hover:brightness-105 active:scale-[0.98] transition motion-reduce:transition-none text-white text-lg font-extrabold tracking-wide shadow-[0_10px_26px_rgba(224,83,38,0.45)] cursor-pointer"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}
        >
          {WELCOME_LABELS.start[language]}
        </button>
      </div>
    </div>
  );
};
