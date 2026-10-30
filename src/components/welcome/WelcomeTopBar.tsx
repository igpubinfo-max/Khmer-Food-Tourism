import React from 'react';
import type { Language } from '../../types';
import { LANGUAGE_SWITCH } from './welcomeContent';

interface Props {
  language: Language;
  onLanguage: (lang: Language) => void;
  onSkip?: () => void;
  skipLabel?: string;
}

/** Top bar: Language selector positioned at top-right corner without top-left logo. */
export const WelcomeTopBar: React.FC<Props> = ({ language, onLanguage }) => (
  <div
    className="absolute top-0 inset-x-0 z-20 flex items-center justify-end px-4 sm:px-6"
    style={{ paddingTop: 'calc(var(--kft-safe-top, 0px) + 12px)' }}
  >
    <div className="flex items-center gap-1.5">
      <div
        className="inline-flex items-center gap-0.5 bg-black/50 backdrop-blur-md rounded-full p-1 border border-white/25 shadow-lg"
        role="group"
        aria-label="Language"
      >
        {LANGUAGE_SWITCH.map((l) => {
          const active = language === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => onLanguage(l.code)}
              aria-pressed={active}
              className={`min-w-[50px] min-h-[38px] px-3 rounded-full text-xs font-extrabold whitespace-nowrap leading-none flex items-center justify-center transition-colors motion-reduce:transition-none cursor-pointer ${
                active ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-white/90 hover:text-white'
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
