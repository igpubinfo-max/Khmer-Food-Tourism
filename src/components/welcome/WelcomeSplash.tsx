import React, { useEffect } from 'react';
import type { Language } from '../../types';
import { WELCOME_IMAGES, WELCOME_LABELS } from './welcomeContent';

interface Props {
  language: Language;
  onDone: () => void;
  /** milliseconds before the splash closes by itself */
  durationMs?: number;
}

/** Returning users: logo + hero photo for ~1.2s (tap anywhere to skip), then continue into the app. */
export const WelcomeSplash: React.FC<Props> = ({ language, onDone, durationMs = 1200 }) => {
  useEffect(() => {
    const t = setTimeout(onDone, durationMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs]);

  return (
    <button
      type="button"
      onClick={onDone}
      aria-label={WELCOME_LABELS.skip[language]}
      className="absolute inset-0 overflow-hidden bg-slate-950 cursor-pointer"
    >
      <img
        src={WELCOME_IMAGES.hero.src}
        alt=""
        width={WELCOME_IMAGES.hero.width}
        height={WELCOME_IMAGES.hero.height}
        loading="eager"
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: '30% 50%' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/85" />
      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center gap-4 px-6 text-center animate-in fade-in duration-500 motion-reduce:animate-none">
        <div className="w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center">
          <img
            src={WELCOME_IMAGES.logo}
            alt="Khmer Food & Tourism"
            width={256}
            height={256}
            className="w-full h-full object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.75)] select-none"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = WELCOME_IMAGES.logoFallback;
            }}
          />
        </div>
        <p
          className={`text-white font-extrabold ${language === 'km' ? 'font-moul text-xl' : 'text-2xl'}`}
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}
        >
          {WELCOME_LABELS.appName[language]}
        </p>
      </div>
    </button>
  );
};
