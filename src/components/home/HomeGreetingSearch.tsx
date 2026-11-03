import React from 'react';
import { User as UserIcon, Crown, Shield, ChevronRight, LogIn } from 'lucide-react';
import type { Language, User } from '../../types';
import { getVipRemainingDays } from '../../types';
import { tr } from '../../utils/i18n';
import { headingFont } from './homeUtils';
import { resolveUserAvatarUrl, handleAvatarImageError } from '../../utils/avatarHelper';

interface Props {
  language: Language;
  userName?: string;
  currentUser?: User | null;
  isVip?: boolean;
  onSignIn?: () => void;
  onExploreProfile?: () => void;
  onUpgradeVip?: () => void;
  onOpenAdminPanel?: () => void;
  /** Short personalized line under the headline (e.g. a time-of-day food suggestion). */
  hint?: string;
  query?: string;
  onChange?: (value: string) => void;
}

/**
 * Clean welcome header: a friendly greeting row (avatar, name, small status chip).
 */
const HomeGreetingSearchInner: React.FC<Props> = ({
  language,
  userName,
  currentUser,
  isVip,
  onSignIn,
  onExploreProfile,
  onOpenAdminPanel,
}) => {
  const hour = new Date().getHours();
  const greeting =
    hour < 11
      ? tr(language, 'អរុណសួស្តី', 'Good morning', '早上好')
      : hour < 17
      ? tr(language, 'ទិវាសួស្តី', 'Good afternoon', '下午好')
      : tr(language, 'សាយ័ណ្ហសួស្តី', 'Good evening', '晚上好');

  const isAdmin =
    currentUser?.role === 'admin' ||
    currentUser?.id === 'admin-authorized-single' ||
    currentUser?.username === 'admin' ||
    currentUser?.username === 'cheasavuth';

  const displayName = currentUser?.name || userName;

  return (
    <section>
      {currentUser ? (
        isAdmin ? (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-[#022c22] via-[#064E3B] to-slate-900 text-white border border-emerald-400/50 shadow-md relative overflow-hidden flex items-center justify-between gap-3">
            <div
              onClick={onOpenAdminPanel || onExploreProfile}
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
            >
              <div className="relative shrink-0">
                <img
                  src={resolveUserAvatarUrl(currentUser)}
                  alt={currentUser.name}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(e) => handleAvatarImageError(e, currentUser)}
                  className="w-11 h-11 rounded-xl object-cover border-2 border-emerald-400 shadow-sm bg-emerald-950"
                />
                <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-white rounded-full shadow-xs border border-slate-900">
                  <Shield className="w-3 h-3" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-emerald-200 font-medium">
                    {greeting},
                  </span>
                  <span className="font-extrabold text-xs sm:text-sm text-white truncate">
                    {currentUser.name}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/25 text-emerald-200 border border-emerald-400/50 shrink-0">
                    <Shield className="w-2.5 h-2.5 text-emerald-300" />
                    <span>{tr(language, 'រដ្ឋបាលប្រព័ន្ធ', 'System Admin', '系统管理员')}</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-200 font-khmer mt-0.5 truncate">
                  {tr(
                    language,
                    'មជ្ឈមណ្ឌលគ្រប់គ្រងទិន្នន័យ និងសមាជិកភាព',
                    'Directory & Membership Management',
                    '名录与会员管理中心'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenAdminPanel && (
                <button
                  type="button"
                  onClick={onOpenAdminPanel}
                  className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] shadow-sm transition active:scale-95 cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <span>{tr(language, 'ផ្ទាំងរដ្ឋបាល', 'Admin Panel', '管理后台')}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-950" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onExploreProfile}
              aria-label={tr(language, 'គណនីរបស់ខ្ញុំ', 'My profile', '我的账户')}
              className="relative shrink-0 cursor-pointer active:scale-95 transition"
            >
              <img
                src={resolveUserAvatarUrl(currentUser)}
                alt={currentUser.name}
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => handleAvatarImageError(e, currentUser)}
                className={`w-10 h-10 rounded-xl object-cover bg-emerald-950 shadow-md ${
                  isVip ? 'border-2 border-amber-400' : 'border-2 border-emerald-500/40'
                }`}
              />
              {isVip && (
                <span className="absolute -bottom-1 -right-1 p-1 bg-amber-400 text-slate-950 rounded-full shadow-sm">
                  <Crown className="w-2.5 h-2.5 fill-slate-950" />
                </span>
              )}
            </button>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-xs text-slate-500 dark:text-emerald-200/80 truncate">{greeting}</p>
              <p className={`${headingFont(language)} text-[15px] leading-relaxed pt-0.5 pb-0.5 text-[#064E3B] dark:text-white truncate`}>{displayName}</p>
            </div>
            {isVip && (
              <button
                type="button"
                onClick={onExploreProfile}
                className="shrink-0 min-h-[36px] px-3 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 text-[11px] font-extrabold inline-flex items-center gap-1 shadow-sm active:scale-95 transition cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 fill-slate-950" />
                <span>
                  {tr(
                    language,
                    `VIP · ${getVipRemainingDays(currentUser)} ថ្ងៃ`,
                    `VIP · ${getVipRemainingDays(currentUser)} days`,
                    `VIP · ${getVipRemainingDays(currentUser)} 天`
                  )}
                </span>
              </button>
            )}
          </div>
        )
      ) : (
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-300">
            <UserIcon className="w-6 h-6" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-xs text-slate-500 dark:text-emerald-200/80 truncate">{greeting}</p>
            <p className={`${headingFont(language)} text-[15px] leading-relaxed pt-0.5 pb-0.5 text-[#064E3B] dark:text-white truncate`}>
              {tr(language, 'រសជាតិ និងទេសចរណ៍កម្ពុជា', 'Cambodia Flavors & Tourism', '柬埔寨风味与旅游')}
            </p>
          </div>
          {onSignIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="shrink-0 min-h-[40px] px-4 rounded-full bg-[#064E3B] dark:bg-amber-400 text-white dark:text-slate-950 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{tr(language, 'ចូល / ចុះឈ្មោះ', 'Sign in', '登录 / 注册')}</span>
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export const HomeGreetingSearch = React.memo(HomeGreetingSearchInner);
