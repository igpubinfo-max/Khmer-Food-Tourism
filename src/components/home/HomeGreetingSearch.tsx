import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User as UserIcon, Crown, Shield, ChevronRight, LogIn } from 'lucide-react';
import type { Language, User } from '../../types';
import { getVipRemainingDays } from '../../types';
import { tr } from '../../utils/i18n';
import { headingFont } from './homeUtils';

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
  query: string;
  onChange: (value: string) => void;
}

/**
 * Clean welcome header: a friendly greeting row (avatar, name, small status chip),
 * a clear headline, and one large debounced search bar.
 */
const HomeGreetingSearchInner: React.FC<Props> = ({
  language,
  userName,
  currentUser,
  isVip,
  onSignIn,
  onExploreProfile,
  onOpenAdminPanel,
  hint,
  query,
  onChange,
}) => {
  const [localQuery, setLocalQuery] = useState(query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleInputChange = (val: string) => {
    setLocalQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      onChangeRef.current('');
      return;
    }
    debounceRef.current = setTimeout(() => {
      onChangeRef.current(val);
    }, 220);
  };

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLocalQuery('');
    onChangeRef.current('');
  };

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
    <section className="space-y-4">
      {currentUser ? (
        isAdmin ? (
          <div className="p-3.5 sm:p-4 rounded-3xl bg-gradient-to-r from-[#022c22] via-[#064E3B] to-slate-900 text-white border border-emerald-400/50 shadow-md relative overflow-hidden flex items-center justify-between gap-3">
            <div
              onClick={onOpenAdminPanel || onExploreProfile}
              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
            >
              <div className="relative shrink-0">
                <img
                  src={currentUser.avatar || '/images/admin_profile.png'}
                  alt={currentUser.name}
                  decoding="async"
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 border-emerald-400 shadow-sm bg-white"
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
                src={currentUser.avatar}
                alt={currentUser.name}
                decoding="async"
                className={`w-12 h-12 rounded-2xl object-cover bg-white shadow-md ${
                  isVip ? 'border-2 border-amber-400' : 'border-2 border-emerald-500/40'
                }`}
              />
              {isVip && (
                <span className="absolute -bottom-1 -right-1 p-1 bg-amber-400 text-slate-950 rounded-full shadow-sm">
                  <Crown className="w-2.5 h-2.5 fill-slate-950" />
                </span>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500 dark:text-emerald-200/80 truncate">{greeting}</p>
              <p className={`${headingFont(language)} text-[15px] leading-snug text-[#064E3B] dark:text-white truncate`}>{displayName}</p>
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
          <span className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-300">
            <UserIcon className="w-6 h-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500 dark:text-emerald-200/80 truncate">{greeting}</p>
            <p className={`${headingFont(language)} text-[15px] leading-snug text-[#064E3B] dark:text-white truncate`}>
              {tr(language, 'សូមស្វាគមន៍មកកាន់កម្ពុជា', 'Discover Cambodia', '探索柬埔寨')}
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

      <div>
        <h2 className={`${headingFont(language)} text-xl leading-snug text-[#064E3B] dark:text-emerald-200`}>
          {isAdmin
            ? tr(language, 'ស្វែងរក និងគ្រប់គ្រងទិន្នន័យក្នុងប្រព័ន្ធ', 'Search & Manage Directory', '搜索并管理系统数据')
            : tr(language, 'ភ្លក្សរសជាតិកម្ពុជា • ស្វែងយល់ទឹកដីកម្ពុជា', 'Taste Cambodia. Explore Cambodia.', '品味柬埔寨 · 探索柬埔寨')}
        </h2>
        {!isAdmin && hint && (
          <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400 mt-1">{hint}</p>
        )}
      </div>

      <div className="relative flex items-center">
        <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400 absolute left-4 pointer-events-none" />
        <input
          type="text"
          value={localQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={tr(
            language,
            'ស្វែងរកម្ហូប ហាងអាហារ ឬតំបន់ទេសចរណ៍...',
            'Search dishes, restaurants, or destinations...',
            '搜索美食、餐厅或旅游景点...'
          )}
          aria-label={tr(language, 'ស្វែងរក', 'Search', '搜索')}
          className="w-full min-h-[54px] pl-12 pr-12 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-base shadow-md focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 font-khmer transition"
        />
        {localQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1.5 w-11 h-11 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
            title={tr(language, 'សម្អាតការស្វែងរក', 'Clear search', '清除搜索')}
            aria-label={tr(language, 'សម្អាតការស្វែងរក', 'Clear search', '清除搜索')}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </section>
  );
};

export const HomeGreetingSearch = React.memo(HomeGreetingSearchInner);
