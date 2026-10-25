import React, { useState } from 'react';
import { ImageDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { tr } from '../utils/i18n';
import { shareCardImage, ShareCardSpec } from '../utils/shareCard';

interface Props {
  /** Build the card lazily so heavy work only happens on tap */
  getSpec: () => ShareCardSpec;
  className?: string;
}

/** "Share as card" button: draws a branded image (dish / place / passport) and shares it. */
export const ShareCardButton: React.FC<Props> = ({ getSpec, className }) => {
  const { language, showToast } = useApp();
  const [busy, setBusy] = useState(false);

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      await shareCardImage(getSpec(), language, showToast);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={
        className ??
        'min-h-[44px] px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-bold flex items-center gap-1.5 active:scale-95 transition cursor-pointer disabled:opacity-60'
      }
    >
      <ImageDown className="w-4 h-4" />
      <span>
        {busy
          ? tr(language, 'កំពុងបង្កើត...', 'Creating...', '生成中...')
          : tr(language, 'ចែករំលែកជាកាត', 'Share as card', '分享卡片')}
      </span>
    </button>
  );
};
