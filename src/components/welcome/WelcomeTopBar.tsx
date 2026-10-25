import React from 'react';
import type { Language } from '../../types';
import { WELCOME_IMAGES, LANGUAGE_SWITCH } from './welcomeContent';

interface Props {
  language: Language;
  onLanguage: (lang: Language) => void;
  onSkip?: () => void;
  skipLabel?: string;
}

/** Top bar: small round logo (left) and compact KM | EN | 中 switch (right). */
export const WelcomeTopBar: React.FC<Props> = ({ language, onLanguage }) => (
  <div
    className="absolute top-0 inset-x-0 z-20 flex items-center justify-between gap-2 px-4"
    style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
  >
    <div className="w-11 h-11 rounded-full bg-white/95 p-1 shadow-lg ring-2 ring-white/40 overflow-hidden shrink-0">
      <img
        src={WELCOME_IMAGES.logo}
        alt="Khmer Food & Tourism"
        width={256}
        height={256}
        className="w-full h-full rounded-full object-contain select-none"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = WELCOME_IMAGES.logoFallback;
        }}
      />
    </div>

    <div className="flex items-center gap-1.5">
      <div className="inline-flex items-center bg-black/45 backdrop-blur-md rounded-full p-0.5 border border-white/25" role="group" aria-label="Language">
        {LANGUAGE_SWITCH.map((l) => {
          const active = language === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => onLanguage(l.code)}
              aria-pressed={active}
              className={`min-w-[44px] min-h-[40px] px-2.5 rounded-full text-xs font-extrabold transition-colors motion-reduce:transition-none cursor-pointer ${
                active ? 'bg-amber-400 text-slate-950' : 'text-white/90 hover:text-white'
              }`}
            >
              {l.label}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);
