import React, { useEffect, useState } from 'react';
import { Star, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { tr } from '../utils/i18n';
import { PLAY_STORE_URL, RATE_PROMPT_EVENT } from '../utils/engagement';

/** Gentle one-time rating prompt, shown after the 5th meaningful action (see utils/engagement.ts). */
export const RatePrompt: React.FC = () => {
  const { language } = useApp();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onPrompt = () => setVisible(true);
    window.addEventListener(RATE_PROMPT_EVENT, onPrompt);
    return () => window.removeEventListener(RATE_PROMPT_EVENT, onPrompt);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed left-0 right-0 bottom-20 z-50 px-4 pointer-events-none">
      <div
        role="dialog"
        aria-live="polite"
        className="max-w-md mx-auto p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-amber-300 shadow-xl pointer-events-auto font-khmer animate-in slide-in-from-bottom-4 duration-200"
      >
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 fill-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-slate-900 dark:text-white">
              {tr(language, 'ចូលចិត្តកម្មវិធីនេះទេ?', 'Enjoying the app?', '喜欢这个应用吗？')}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {tr(
                language,
                'សូមជួយដាក់ផ្កាយ ដើម្បីឱ្យមិត្តភក្តិរកឃើញកម្មវិធីនេះ',
                'A quick rating helps friends discover it too.',
                '给个好评，帮助更多朋友发现它。'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="w-9 h-9 -mt-1 -mr-1 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
            aria-label={tr(language, 'បិទ', 'Close', '关闭')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              window.open(PLAY_STORE_URL, '_blank');
              setVisible(false);
            }}
            className="flex-1 min-h-[44px] rounded-xl bg-[#064E3B] text-white text-sm font-bold active:scale-95 transition cursor-pointer"
          >
            ⭐ {tr(language, 'ដាក់ផ្កាយ', 'Rate now', '去评分')}
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="min-h-[44px] px-4 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold active:scale-95 transition cursor-pointer"
          >
            {tr(language, 'ពេលក្រោយ', 'Later', '以后再说')}
          </button>
        </div>
      </div>
    </div>
  );
};
