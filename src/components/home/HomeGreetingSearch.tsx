import React from 'react';
import { User as UserIcon, Crown, Shield, ChevronRight, LogIn, Camera, Search, Send, X } from 'lucide-react';
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
  onAskAi?: (queryText?: string) => void;
  onOpenCameraAi?: () => void;
  hint?: string;
  query?: string;
  onChange?: (value: string) => void;
}

const HomeGreetingSearchInner: React.FC<Props> = ({
  language,
  userName,
  currentUser,
  isVip,
  onSignIn,
  onExploreProfile,
  onOpenAdminPanel,
  onAskAi,
  onOpenCameraAi,
  query = '',
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

  const displayName = currentUser?.name || userName;

  const handleTriggerAskAi = () => {
    if (onAskAi) {
      onAskAi(query.trim());
    }
  };

  return (
    <section className="space-y-2">
      {/* Compact User / Admin status bar */}
      {currentUser ? (
        isAdmin ? (
          <div className="p-2.5 rounded-2xl bg-gradient-to-r from-[#022c22] via-[#064E3B] to-slate-900 text-white border border-emerald-400/50 shadow-sm relative overflow-hidden flex items-center justify-between gap-2.5">
            <div
              onClick={onOpenAdminPanel || onExploreProfile}
              className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
            >
              <div className="relative shrink-0">
                <img loading="lazy"
                  key={resolveUserAvatarUrl(currentUser)}
                  src={resolveUserAvatarUrl(currentUser)}
                  alt={currentUser.name}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(e) => handleAvatarImageError(e, currentUser)}
                  className="w-10 h-10 rounded-xl object-cover border-2 border-emerald-400 shadow-xs bg-emerald-950"
                />
                <div className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-500 text-white rounded-full shadow-xs border border-slate-900">
                  <Shield className="w-2.5 h-2.5" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-emerald-200 font-medium">{greeting},</span>
                  <span className="font-extrabold text-xs text-white truncate">{currentUser.name}</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/25 text-emerald-200 border border-emerald-400/50 shrink-0">
                    <Shield className="w-2.5 h-2.5 text-emerald-300" />
                    <span>{tr(language, 'រដ្ឋបាលប្រព័ន្ធ', 'System Admin', '系统管理员')}</span>
                  </span>
                </div>
                <p className="text-[10px] text-slate-200 font-khmer truncate">
                  {tr(
                    language,
                    'មជ្ឈមណ្ឌលគ្រប់គ្រងទិន្នន័យ និងសមាជិកភាព',
                    'Directory & Membership Management',
                    '名录与会员管理中心'
                  )}
                </p>
              </div>
            </div>

            {onOpenAdminPanel && (
              <button
                type="button"
                onClick={onOpenAdminPanel}
                className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] shadow-xs transition active:scale-95 cursor-pointer shrink-0 flex items-center gap-1"
              >
                <span>{tr(language, 'ផ្ទាំងរដ្ឋបាល', 'Admin Panel', '管理后台')}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-950" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-1">
            <button
              type="button"
              onClick={onExploreProfile}
              aria-label={tr(language, 'គណនីរបស់ខ្ញុំ', 'My profile', '我的账户')}
              className="relative shrink-0 cursor-pointer active:scale-95 transition"
            >
              <img loading="lazy"
                key={resolveUserAvatarUrl(currentUser)}
                src={resolveUserAvatarUrl(currentUser)}
                alt={currentUser.name}
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => handleAvatarImageError(e, currentUser)}
                className={`w-9 h-9 rounded-xl object-cover bg-emerald-950 shadow-sm ${
                  isVip ? 'border-2 border-amber-400' : 'border-2 border-emerald-500/40'
                }`}
              />
              {isVip && (
                <span className="absolute -bottom-1 -right-1 p-0.5 bg-amber-400 text-slate-950 rounded-full shadow-xs">
                  <Crown className="w-2.5 h-2.5 fill-slate-950" />
                </span>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-slate-500 dark:text-emerald-200/80 truncate">{greeting}</p>
              <p className={`${headingFont(language)} text-sm leading-snug text-[#064E3B] dark:text-white truncate`}>
                {displayName}
              </p>
            </div>
            {isVip && (
              <button
                type="button"
                onClick={onExploreProfile}
                className="shrink-0 min-h-[32px] px-2.5 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 text-[10px] font-extrabold inline-flex items-center gap-1 shadow-xs active:scale-95 transition cursor-pointer"
              >
                <Crown className="w-3 h-3 fill-slate-950" />
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
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-300">
              <UserIcon className="w-4 h-4" />
            </span>
            <p className="text-xs font-bold text-slate-700 dark:text-emerald-200/90 truncate">{greeting}</p>
          </div>
          {onSignIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="shrink-0 min-h-[34px] px-3 rounded-full bg-[#064E3B] dark:bg-amber-400 text-white dark:text-slate-950 text-[11px] font-extrabold inline-flex items-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
            >
              <LogIn className="w-3 h-3" />
              <span>{tr(language, 'ចូល / ចុះឈ្មោះ', 'Sign in', '登录 / 注册')}</span>
            </button>
          )}
        </div>
      )}

      {/* Angkor Wat Sunrise Hero Banner + Ask AI Bar */}
      <div className="relative rounded-3xl overflow-hidden shadow-md border border-amber-500/30 bg-slate-950">
        <img loading="lazy" decoding="async"
          src="/welcome/angkor-sunrise-hero.png"
          alt="Angkor Wat Sunrise"
          className="w-full h-36 sm:h-40 object-cover object-center block"
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(10,20,16,0.52) 48%, rgba(10,20,16,0.72) 100%)',
          }}
        />

        {/* Hero Title & Ask AI Bar Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3 flex flex-col gap-2">
          <h2
            className="font-khmer font-extrabold text-sm sm:text-base text-white text-center tracking-tight"
            style={{ textShadow: '0 2px 6px rgba(0,0,0,0.85)' }}
          >
            {tr(
              language,
              'ស្វែងយល់អាហារ • ទីតាំង • បទពិសោធន៍',
              'Discover Food • Places • Experiences',
              '探索美食 • 景点 • 体验'
            )}
          </h2>

          {/* Ask AI Bar: [Camera] + [Search/Ask AI Input] + [សួរ AI Button] */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-amber-400/45 shadow-lg">
            {/* Left Camera Button */}
            <button
              type="button"
              onClick={onOpenCameraAi || handleTriggerAskAi}
              title={tr(language, 'ថតរូបម្ហូបសួរ AI', 'Snap food photo for AI', '拍照识别美食')}
              className="w-9 h-9 rounded-xl bg-amber-950/75 hover:bg-amber-900/80 border border-amber-500/70 flex items-center justify-center text-amber-400 shrink-0 transition active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Middle Input Box */}
            <div className="relative flex-1 flex items-center min-w-0 h-9 rounded-xl bg-slate-800/95 border border-slate-600/75 px-2.5">
              <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0 mr-1.5" />
              <input
                type="text"
                value={query}
                onChange={(e) => onChange && onChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTriggerAskAi();
                  }
                }}
                placeholder={tr(
                  language,
                  'សួរអ្វីក៏បានអំពីម្ហូប ឬថតរូបម្ហូប...',
                  'Ask anything about food or snap a photo...',
                  '询问任何美食问题或拍照识别...'
                )}
                className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none font-khmer truncate"
              />
              {query && onChange && (
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="p-0.5 text-slate-400 hover:text-white shrink-0 cursor-pointer"
                  aria-label="Clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Right សួរ AI Button */}
            <button
              type="button"
              onClick={handleTriggerAskAi}
              className="h-9 px-3 rounded-xl bg-gradient-to-b from-[#0D7A52] to-[#065F46] hover:from-emerald-600 hover:to-emerald-800 border border-emerald-400/45 text-white font-khmer font-extrabold text-xs flex items-center justify-center gap-1 shrink-0 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-amber-300" />
              <span>{tr(language, 'សួរ AI', 'Ask AI', '问 AI')}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export const HomeGreetingSearch = React.memo(HomeGreetingSearchInner);
