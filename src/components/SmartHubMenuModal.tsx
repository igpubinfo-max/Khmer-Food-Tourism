import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Compass, Navigation, Heart, BadgeCheck, Wifi, WifiOff, Route, ChevronDown, Lock, Flame, CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isAdminAccount, isUserVipActive, organizeAndDeduplicateFoods } from '../types';
import type { FoodItem } from '../types';
import { tr } from '../utils/i18n';
import type { TagFilterId, DishTagId } from '../utils/dishTags';
import { requestTagFilter } from '../utils/smartHub';
import { useFoodPassport, getPassportLevel, levelTitle } from '../utils/foodPassport';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';
import { SmartHubHealthySection } from './SmartHubHealthySection';
import { FoodTripTemplates } from './FoodTripTemplates';
import { FoodPassportCard } from './FoodPassportCard';

interface Props {
  onClose: () => void;
}

/** One unified menu: dish tags + trips, near me, favorites, stamp collection, share/invite and offline status. */
export const SmartHubMenuModal: React.FC<Props> = ({ onClose }) => {
  const {
    language, foods, restaurants, destinations, bookmarks, currentUser, showToast,
    setActiveTab, setSelectedFood, setIsNearMeModalOpen, setIsAiTripPlannerModalOpen, setIsWishlistsModalOpen, setIsTrendingSocialModalOpen, openUpgradeVipModal,
  } = useApp();
  const [openPanel, setOpenPanel] = useState<'trips' | 'stamps' | null>(null);
  const [online, setOnline] = useState<boolean>(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  const { count: stampCount } = useFoodPassport();
  useBodyScrollLock(true);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  const organizedFoods = useMemo(() => organizeAndDeduplicateFoods(foods), [foods]);

  const canUseVip = Boolean(currentUser && (isUserVipActive(currentUser) || isAdminAccount(currentUser)));
  const { level } = getPassportLevel(stampCount);

  const triggerVipUpgrade = () => {
    showToast(
      tr(language, 'មុខងារនេះសម្រាប់គណនី VIP • សូមដំឡើង VIP!', 'This feature is for VIP accounts — please unlock VIP!', '此功能仅限 VIP 账户，请先开通 VIP！'),
      'info'
    );
    onClose();
    openUpgradeVipModal();
  };

  const pickTag = (id: DishTagId) => {
    if (!canUseVip) {
      triggerVipUpgrade();
      return;
    }
    if (!requestTagFilter(id as TagFilterId, currentUser)) {
      triggerVipUpgrade();
      return;
    }
    setActiveTab('food');
    onClose();
  };

  const openFood = (food: FoodItem) => {
    if (!canUseVip) {
      triggerVipUpgrade();
      return;
    }
    onClose();
    setSelectedFood(food);
  };

  const openFavorites = () => {
    onClose();
    setIsWishlistsModalOpen(true);
  };

  const rowCls =
    'w-full min-h-[64px] flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left active:scale-[0.98] transition motion-reduce:transition-none cursor-pointer';
  const iconBox = 'w-11 h-11 rounded-xl flex items-center justify-center shrink-0';

  return (
    <div
      className="fixed inset-0 z-[45] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200 motion-reduce:animate-none overscroll-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md max-h-[94dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-slate-50 dark:bg-slate-900 shadow-2xl overflow-hidden font-khmer overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-[#064E3B] via-emerald-800 to-[#047857] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="font-moul text-base text-amber-300">
              {tr(language, 'ម៉ឺនុយពិសេស', 'Explore Hub', '精选菜单')}
            </h2>
            <p className="text-xs text-emerald-100">
              {tr(language, 'ស្លាកម្ហូបសុខភាព (VIP) និងឧបករណ៍ប្រចាំថ្ងៃ (FREE)', 'VIP Healthy Tags & Free Daily Tools', 'VIP 健康标签与免费日常工具')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 cursor-pointer"
            aria-label={tr(language, 'បិទ', 'Close', '关闭')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 space-y-5 [-webkit-overflow-scrolling:touch]">
          {/* SECTION 1: Healthy Dish Tags (cards, inline dishes, 3-meal idea — VIP) */}
          <SmartHubHealthySection foods={organizedFoods} onViewAll={pickTag} onOpenFood={openFood} onUpgradeVip={triggerVipUpgrade} />

          {/* SECTION 2: Smart Travel & Food Tools */}
          <section className="space-y-2.5">
            <h3 className="font-moul text-sm text-[#064E3B] dark:text-emerald-300 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{tr(language, 'ឧបករណ៍ម្ហូប និងទេសចរណ៍', 'Food & Travel Tools', '美食与出行工具')}</span>
            </h3>

            {/* Near me (FREE) */}
            <button
              type="button"
              className={rowCls}
              onClick={() => {
                onClose();
                setIsNearMeModalOpen(true);
              }}
            >
              <span className={`${iconBox} bg-emerald-100 text-emerald-700`}><Navigation className="w-5 h-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 dark:text-white">
                  {tr(language, 'ស្វែងរកម្ហូប & កន្លែងជិតខ្ញុំ', 'Nearby Food & Places', '附近美食与景点')}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {tr(language, 'ហាងអាហារ និងកន្លែងកម្សាន្តក្បែរ GPS អ្នក', 'Restaurants & attractions near your GPS', '搜索身边的餐厅与景点')}
                </span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {tr(language, 'ឥតគិតថ្លៃ', 'FREE', '免费')}
              </span>
            </button>

            {/* Smart AI Assistant (Free Preview + VIP) */}
            <button
              type="button"
              className={rowCls}
              onClick={() => {
                onClose();
                setIsAiTripPlannerModalOpen(true);
              }}
            >
              <span className={`${iconBox} bg-amber-100 text-amber-700`}><Route className="w-5 h-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 dark:text-white">
                  {tr(language, 'ជំនួយការឆ្លាតវៃ AI', 'Smart AI Assistant', 'AI 智能助手')}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {tr(language, 'ជំនួយការរើសម្ហូប សុខភាព និងរៀបផែនការ AI', 'AI food advisor, nutrition & route planner', 'AI 选餐顾问、营养与路线助手')}
                </span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[10px] font-bold flex items-center gap-0.5">
                👑 VIP
              </span>
            </button>

            {/* 1-Day food trips (VIP) */}
            <button
              type="button"
              className={rowCls}
              onClick={() => {
                if (!canUseVip) {
                  triggerVipUpgrade();
                  return;
                }
                setOpenPanel(openPanel === 'trips' ? null : 'trips');
              }}
              aria-expanded={canUseVip && openPanel === 'trips'}
            >
              <span className={`${iconBox} bg-amber-100 text-amber-700`}><Compass className="w-5 h-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 dark:text-white">
                  {tr(language, 'ដំណើរម្ហូប ១ ថ្ងៃ', '1-Day Food Trips', '一日美食行程')}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {tr(language, 'ផែនការរួចរាល់ + ផែនទី', 'Ready-made itineraries + maps', '现成行程 + 地图')}
                </span>
              </span>
              {!canUseVip ? (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[10px] font-bold flex items-center gap-0.5"><Lock className="w-3 h-3" />VIP</span>
              ) : (
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform motion-reduce:transition-none ${openPanel === 'trips' ? 'rotate-180' : ''}`} />
              )}
            </button>
            {canUseVip && openPanel === 'trips' && <FoodTripTemplates />}

            {/* Favorites with live count (FREE) */}
            <button type="button" className={rowCls} onClick={openFavorites}>
              <span className={`${iconBox} bg-rose-100 text-rose-600`}><Heart className="w-5 h-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 dark:text-white">
                  {tr(language, 'ចំណូលចិត្តរបស់ខ្ញុំ', 'My Favorites', '我的收藏')}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {tr(language, 'បញ្ជីដែលបានរក្សាទុក (ឥតគិតថ្លៃ)', 'Your saved list (Free)', '已保存列表（免费）')}
                </span>
              </span>
              <span className="min-w-[32px] h-8 px-2 rounded-full bg-rose-500 text-white text-sm font-extrabold flex items-center justify-center" aria-label={`${bookmarks.length}`}>
                {bookmarks.length}
              </span>
            </button>

            {/* Trending Khmer Food & Online Discovery (FREE) */}
            <button
              type="button"
              className={rowCls}
              onClick={() => {
                onClose();
                setIsTrendingSocialModalOpen(true);
              }}
            >
              <span className={`${iconBox} bg-rose-100 text-rose-600`}><Flame className="w-5 h-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 dark:text-white">
                  {tr(language, 'ម្ហូបខ្មែរកំពុងពេញនិយម (YouTube)', 'Trending Khmer Food (YouTube)', '热门高棉美食（YouTube）')}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {tr(language, 'វីដេអូពេញនិយម YouTube', 'Trending YouTube Videos', 'YouTube 热门视频')}
                </span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold">
                {tr(language, 'ឥតគិតថ្លៃ', 'FREE', '免费')}
              </span>
            </button>

            {/* Stamp collection (VIP) */}
            <button
              type="button"
              className={rowCls}
              onClick={() => {
                if (!canUseVip) {
                  triggerVipUpgrade();
                  return;
                }
                setOpenPanel(openPanel === 'stamps' ? null : 'stamps');
              }}
              aria-expanded={canUseVip && openPanel === 'stamps'}
            >
              <span className={`${iconBox} bg-emerald-100 text-emerald-700`}><BadgeCheck className="w-5 h-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 dark:text-white">
                  {tr(language, 'កំណត់ត្រាម្ហូបដែលបានភ្លក្ស', 'Food Passport', '美食打卡护照')}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {level.emoji} {levelTitle(level, language)} · {stampCount} / {organizedFoods.length}
                </span>
              </span>
              {!canUseVip ? (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[10px] font-bold flex items-center gap-0.5"><Lock className="w-3 h-3" />VIP</span>
              ) : (
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform motion-reduce:transition-none ${openPanel === 'stamps' ? 'rotate-180' : ''}`} />
              )}
            </button>
            {canUseVip && openPanel === 'stamps' && <FoodPassportCard />}

            {/* Offline status */}
            <div
              className={`p-3 rounded-2xl border-2 flex items-center gap-3 ${
                online
                  ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700'
                  : 'bg-slate-900 border-amber-400 text-white'
              }`}
              role="status"
              aria-live="polite"
            >
              <span className={`${iconBox} ${online ? 'bg-emerald-600 text-white' : 'bg-amber-400 text-slate-900'}`}>
                {online ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-extrabold ${online ? 'text-emerald-900 dark:text-emerald-200' : 'text-white'}`}>
                  {online
                    ? tr(language, 'អនឡាញ • អាចប្រើគ្មានអ៊ីនធឺណិតបាន', 'Online · Offline Ready', '在线 · 支持离线使用')
                    : tr(language, 'របៀបគ្មានអ៊ីនធឺណិត', 'Offline mode', '离线模式')}
                </span>
                <span className={`block text-xs ${online ? 'text-emerald-800/80 dark:text-emerald-300/80' : 'text-slate-300'}`}>
                  {tr(
                    language,
                    `មាន ${organizedFoods.length} ម្ហូប • ${restaurants.length} ហាង • ${destinations.length} កន្លែងទេសចរណ៍ ក្នុងឧបករណ៍`,
                    `${organizedFoods.length} dishes · ${restaurants.length} places · ${destinations.length} sights saved on this device`,
                    `本机已存 ${organizedFoods.length} 道菜 · ${restaurants.length} 家餐厅 · ${destinations.length} 个景点`
                  )}
                </span>
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
