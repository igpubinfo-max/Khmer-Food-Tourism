import React from 'react';
import type { Language } from '../../types';
import { LANGUAGE_SWITCH } from './welcomeContent';

interface Props {
  language: Language;
  onLanguage: (lang: Language) => void;
  onSkip?: () => void;
  skipLabel?: string;
}

/** Top bar: Language selector positioned at top-right inside the 3:4 Angkor AI launch stage. */
export const WelcomeTopBar: React.FC<Props> = ({ language, onLanguage }) => (
  <div
    style={{ top: '2.2%', right: '3.2%' }}
    className="absolute z-30 flex items-center justify-end"
  >
    <div
      className="inline-flex items-center bg-[#1B2B4B]/88 rounded-full p-1 border border-white/20 shadow-[0_6px_20px_rgba(0,0,0,0.45)]"
      role="group"
      aria-label="Language"
    >
      {LANGUAGE_SWITCH.map((l, idx) => {
        const active = language === l.code;
        return (
          <React.Fragment key={l.code}>
            {idx > 0 && !active && language !== LANGUAGE_SWITCH[idx - 1].code && (
              <span className="h-3.5 w-px bg-white/25 mx-0.5" aria-hidden="true" />
            )}
            <button
              type="button"
              onClick={() => onLanguage(l.code)}
              aria-pressed={active}
              style={{
                fontSize: 'clamp(10.5px, 2.85cqw, 13px)',
                minWidth: 'clamp(42px, 11.5cqw, 54px)',
                minHeight: 'clamp(28px, 7.2cqw, 36px)',
              }}
              className={`px-2.5 rounded-full font-extrabold whitespace-nowrap leading-none flex items-center justify-center transition-all cursor-pointer ${
                active
                  ? 'bg-gradient-to-b from-[#FDE047] via-[#FACC15] to-[#EAB308] text-slate-950 shadow-[0_2px_10px_rgba(250,204,21,0.55)] font-black'
                  : 'text-white/95 hover:text-white'
              }`}
            >
              {l.label}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  </div>
);
