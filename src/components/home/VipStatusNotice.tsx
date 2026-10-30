import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import type { Language } from '../../types';
import { tr } from '../../utils/i18n';

interface Props {
  language: Language;
  /** 'expiring' = active VIP with <= 3 days left, 'expired' = recently downgraded */
  kind: 'expiring' | 'expired';
  daysLeft?: number;
  onRenew: () => void;
}

/** One slim, informative line about the member's VIP status. Only shown when it actually matters. */
export const VipStatusNotice: React.FC<Props> = ({ language, kind, daysLeft = 0, onRenew }) => {
  const Icon = kind === 'expiring' ? Clock : AlertCircle;
  const message =
    kind === 'expiring'
      ? tr(
          language,
          `VIP របស់អ្នកនៅសល់ ${daysLeft} ថ្ងៃទៀត`,
          `Your VIP ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
          `您的 VIP 还剩 ${daysLeft} 天`
        )
      : tr(language, 'VIP របស់អ្នកបានផុតកំណត់', 'Your VIP has ended', '您的 VIP 已到期');

  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/25">
      <span className="flex items-center gap-2 min-w-0 text-[13px] font-semibold text-amber-900 dark:text-amber-200">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      <button
        type="button"
        onClick={onRenew}
        className="shrink-0 min-h-[36px] px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold active:scale-95 transition cursor-pointer"
      >
        {tr(language, 'បន្ត VIP', 'Renew', '续费')}
      </button>
    </div>
  );
};
