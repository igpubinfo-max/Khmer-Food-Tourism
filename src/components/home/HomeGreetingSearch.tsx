import React from 'react';
import { Search, X, User as UserIcon, Crown, Shield, CheckCircle2, Sparkles, ChevronRight, LogIn } from 'lucide-react';
import type { Language, User } from '../../types';
import { tr } from '../../utils/i18n';

interface Props {
  language: Language;
  userName?: string;
  currentUser?: User | null;
  isVip?: boolean;
  onSignIn?: () => void;
  onExploreProfile?: () => void;
  onUpgradeVip?: () => void;
  query: string;
  onChange: (value: string) => void;
}

/** Friendly greeting + compact Guest/Registered User Profile Card + one big, easy-to-tap search bar. */
export const HomeGreetingSearch: React.FC<Props> = ({
  language,
  userName,
  currentUser,
  isVip,
  onSignIn,
  onExploreProfile,
  onUpgradeVip,
  query,
  onChange,
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

  return (
    <section className="space-y-3">
      {/* Compact User Profile & Account Status Card (Guest vs Registered) */}
      {currentUser ? (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-[#064E3B] via-[#047857] to-[#065F46] text-white shadow-sm border border-emerald-400/40 flex items-center justify-between gap-2.5">
          <div
            onClick={onExploreProfile}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className={`w-12 h-12 sm:w-14 sm:h-14 ${currentUser.role === 'admin' ? 'rounded-full ring-2 ring-emerald-300' : 'rounded-2xl'} object-cover border-2 border-amber-300/80 shadow-xs shrink-0 bg-white`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-emerald-200 font-medium">
                  {greeting},
                </span>
                <span className="font-bold text-xs sm:text-sm text-white truncate">
                  {currentUser.name}
                </span>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white shadow-2xs shrink-0">
                    <Shield className="w-2.5 h-2.5" />
                    <span>{tr(language, 'អ្នកគ្រប់គ្រង', 'Admin', '管理员')}</span>
                  </span>
                ) : isVip ? (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-950 shadow-2xs shrink-0">
                    <Crown className="w-2.5 h-2.5" />
                    <span>{tr(language, 'សមាជិក VIP', 'VIP Member', 'VIP 会员')}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-900/90 text-emerald-200 border border-emerald-400/40 shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-300" />
                    <span>{tr(language, 'សមាជិកចុះឈ្មោះ', 'Registered', '已注册会员')}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-100/95 truncate mt-0.5">
                {isVip || isAdmin
                  ? tr(
                      language,
                      '✨ គណនី VIP សកម្ម • ប្រើប្រាស់មុខងារពិសេសទាំងអស់ដោយសេរី',
                      '✨ Full VIP access unlocked — explore all special features',
                      '✨ VIP 尊享权益已激活 • 畅享全部专属功能'
                    )
                  : tr(
                      language,
                      'គណនីបានចុះឈ្មោះរួចរាល់ • ស្វែងរកមុខងារបន្ថែមក្នុងគណនីរបស់អ្នក',
                      'Registered account active — explore more features in your profile',
                      '账户已登录 • 前往个人中心探索更多功能'
                    )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isVip && !isAdmin && onUpgradeVip && (
              <button
                type="button"
                onClick={onUpgradeVip}
                className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[10px] sm:text-[11px] shadow-xs flex items-center gap-1 transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>{tr(language, 'ដំឡើង VIP', 'Get VIP', '开通 VIP')}</span>
              </button>
            )}
            {onExploreProfile && (
              <button
                type="button"
                onClick={onExploreProfile}
                className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-[10px] sm:text-[11px] border border-white/25 flex items-center gap-0.5 transition active:scale-95 cursor-pointer"
              >
                <span>{tr(language, 'គណនី', 'Profile', '我的')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-[#064E3B] to-emerald-900 text-white shadow-sm border border-emerald-500/40 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 text-amber-300">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs sm:text-sm text-white truncate">
                  {greeting} 👋
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/15 text-amber-200 border border-amber-300/30 shrink-0">
                  {tr(language, 'គណនីភ្ញៀវ', 'Guest Mode', '访客模式')}
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/95 truncate mt-0.5">
                {tr(
                  language,
                  'ចុះឈ្មោះគណនីឥតគិតថ្លៃ ដើម្បីរក្សាទុកម្ហូប និងមុខងារពិសេសៗ',
                  'Register a free account to save dishes & unlock more features',
                  '免费注册登录，收藏喜爱的美食并解锁更多功能'
                )}
              </p>
            </div>
          </div>

          {onSignIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] shadow-sm flex items-center gap-1.5 shrink-0 transition active:scale-95 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{tr(language, 'ចុះឈ្មោះ / ចូល', 'Sign In', '注册 / 登录')}</span>
            </button>
          )}
        </div>
      )}

      <div>
        <h2 className="font-moul text-base sm:text-lg leading-snug text-[#064E3B] dark:text-emerald-300">
          {tr(language, 'ថ្ងៃនេះចង់ញ៉ាំអ្វី?', 'What would you like to eat today?', '今天想吃点什么？')}
        </h2>
      </div>

      <div className="relative flex items-center">
        <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400 absolute left-4 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder={tr(
            language,
            'ស្វែងរកម្ហូប ហាង ឬកន្លែងដើរលេង...',
            'Search dishes, restaurants or places...',
            '搜索菜肴、餐厅或景点...'
          )}
          aria-label={tr(language, 'ស្វែងរក', 'Search', '搜索')}
          className="w-full min-h-[52px] pl-12 pr-12 rounded-2xl bg-white dark:bg-slate-800 border-2 border-emerald-500/40 text-slate-900 dark:text-white placeholder-slate-400 text-base shadow-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-khmer transition"
        />
        {query && (
          <button
            type="button"
            onClick={() => onChange('')}
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
