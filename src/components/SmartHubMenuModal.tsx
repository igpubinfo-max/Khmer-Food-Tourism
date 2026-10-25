import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Compass, Navigation, Heart, BadgeCheck, Wifi, WifiOff, Bot, ChevronDown, Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isUserVipActive, organizeAndDeduplicateFoods } from '../types';
import { tr } from '../utils/i18n';
import { DISH_TAG_DEFS, getDishTagIds, TAG_ESTIMATE_NOTE, GENERAL_FOOD_INFO_NOTE, TagFilterId } from '../utils/dishTags';
import type { DishTagId } from '../utils/dishTags';
import { requestTagFilter } from '../utils/smartHub';
import { useFoodPassport, getPassportLevel, levelTitle } from '../utils/foodPassport';
import { FoodTripTemplates } from './FoodTripTemplates';
import { FoodPassportCard } from './FoodPassportCard';
import { InviteFriendsCard } from './InviteFriendsCard';

interface Props {
  onClose: () => void;
}

// The six tag cards (recipe-based estimates only: no health/medical claims)
const HUB_TAGS: DishTagId[] = ['light', 'steamed_boiled', 'grilled', 'vegetable_rich', 'protein_rich', 'vegetarian_friendly'];

const toneBg = (tone: 'green' | 'blue' | 'amber') =>
  tone === 'green'
    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-200'
    : tone === 'blue'
    ? 'bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-200'
    : 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-200';

/** One unified menu: dish tags + trips, near me, favorites, stamp collection, share/invite and offline status. */
export const SmartHubMenuModal: React.FC<Props> = ({ onClose }) => {
  const {
    language, foods, restaurants, destinations, bookmarks, currentUser, showToast,
    setActiveTab, setIsNearMeModalOpen, setIsAiTripPlannerModalOpen, setIsWishlistsModalOpen, openUpgradeVipModal,
  } = useApp();
  const [openPanel, setOpenPanel] = useState<'trips' | 'stamps' | null>(null);
  const [online, setOnline] = useState<boolean>(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  const { count: stampCount } = useFoodPassport();

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
  const tagCounts = useMemo(() => {
    const counts: Partial<Record<DishTagId, number>> = {};
    for (const f of organizedFoods) for (const id of getDishTagIds(f)) counts[id] = (counts[id] || 0) + 1;
    return counts;
  }, [organizedFoods]);

  const canUseVip = isUserVipActive(currentUser) || currentUser?.role === 'admin';
  const { level } = getPassportLevel(stampCount);

  const pickTag = (id: DishTagId) => {
    requestTagFilter(id as TagFilterId);
    setActiveTab('food');
    onClose();
  };

  const vipOnly = (open: () => void) => () => {
    if (!canUseVip) {
      showToast(
        tr(language, 'មុខងារនេះសម្រាប់គណនី VIP • សូមដំឡើង VIP!', 'This feature is for VIP accounts — please unlock VIP!', '此功能仅限 VIP 账户，请先开通 VIP！'),
        'info'
      );
      onClose();
      openUpgradeVipModal();
      return;
    }
    onClose();
    open();
  };

  const openFavorites = () => {
    onClose();
    if (canUseVip) setIsWishlistsModalOpen(true);
    else setActiveTab('profile');
  };

  const rowCls =
    'w-full min-h-[64px] flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left active:scale-[0.98] transition motion-reduce:transition-none cursor-pointer';
  const iconBox = 'w-11 h-11 rounded-xl flex items-center justify-center shrink-0';

  return (
    <div
      className="fixed inset-0 z-[45] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200 motion-reduce:animate-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md max-h-[94vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-slate-50 dark:bg-slate-900 shadow-2xl overflow-hidden font-khmer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-[#064E3B] via-emerald-800 to-[#047857] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="font-moul text-base text-amber-300">
              {tr(language, 'ម៉ឺនុយពិសេស', 'Smart Menu', '智能菜单')}
            </h2>
            <p className="text-xs text-emerald-100">
              {tr(language, 'ស្លាកម្ហូប និងឧបករណ៍ទេសចរណ៍នៅទីតែមួយ', 'Dish tags & travel tools in one place', '菜品标签与出行工具，一站直达')}
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

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-6">
          {/* SECTION 1: Healthy Eating Tags */}
          <section className="space-y-2.5">
            <div>
              <h3 className="font-moul text-sm text-[#064E3B] dark:text-emerald-300">
                🥗 {tr(language, 'ស្លាកម្ហូបសុខភាព', 'Healthy Eating Tags', '健康饮食标签')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tr(
                  language,
                  'ជ្រើសរើសម្ហូបតាមស្លាក — ប៉ាន់ស្មានពីរូបមន្តប៉ុណ្ណោះ',
                  'Pick dishes by tag — estimated from the recipe only',
                  '按标签挑选菜肴——仅根据食谱估算'
                )}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {HUB_TAGS.map((id) => {
                const def = DISH_TAG_DEFS[id];
                const n = tagCounts[id] || 0;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => pickTag(id)}
                    className={`min-h-[84px] p-3 rounded-2xl border-2 text-left flex flex-col justify-between active:scale-[0.97] transition motion-reduce:transition-none cursor-pointer ${toneBg(def.tone)}`}
                  >
                    <span className="text-2xl leading-none" aria-hidden="true">{def.emoji}</span>
                    <span>
                      <span className="block text-sm font-extrabold leading-tight">
                        {tr(language, def.labelKh, def.labelEn, def.labelZh)}
                      </span>
                      <span className="block text-xs opacity-80">
                        {n} {tr(language, 'មុខ', 'dishes', '道菜')}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400">
              ℹ️ {tr(language, TAG_ESTIMATE_NOTE.km, TAG_ESTIMATE_NOTE.en, TAG_ESTIMATE_NOTE.zh)} ·{' '}
              {tr(language, GENERAL_FOOD_INFO_NOTE.km, GENERAL_FOOD_INFO_NOTE.en, GENERAL_FOOD_INFO_NOTE.zh)}
            </p>
          </section>

          {/* SECTION 2: Smart Travel & Food Tools */}
          <section className="space-y-2.5">
            <h3 className="font-moul text-sm text-[#064E3B] dark:text-emerald-300">
              🧭 {tr(language, 'ឧបករណ៍ទេសចរណ៍ និងម្ហូបឆ្លាតវៃ', 'Smart Travel & Food Tools', '智能出行与美食工具')}
            </h3>

            {/* 1-Day food trips (free) */}
            <button type="button" className={rowCls} onClick={() => setOpenPanel(openPanel === 'trips' ? null : 'trips')} aria-expanded={openPanel === 'trips'}>
              <span className={`${iconBox} bg-amber-100 text-amber-700`}><Compass className="w-5 h-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 dark:text-white">
                  {tr(language, 'ដំណើរម្ហូប ១ ថ្ងៃ', '1-Day Food Trips', '一日美食行程')}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {tr(language, 'ផែនការរួចរាល់ + ផែនទី', 'Ready-made itineraries + maps', '现成行程 + 地图')}
                </span>
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform motion-reduce:transition-none ${openPanel === 'trips' ? 'rotate-180' : ''}`} />
            </button>
            {openPanel === 'trips' && <FoodTripTemplates />}

            {/* AI Trip Planner (VIP) */}
            <button type="button" className={rowCls} onClick={vipOnly(() => setIsAiTripPlannerModalOpen(true))}>
              <span className={`${iconBox} bg-sky-100 text-sky-700`}><Bot className="w-5 h-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 dark:text-white">
                  {tr(language, 'រៀបផែនការដើរលេង (AI)', 'AI Trip Planner', 'AI 行程规划')}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {tr(language, 'AI រៀបចំផ្លូវតាមថវិកា', 'Itinerary built for your budget', '按预算自动生成行程')}
                </span>
              </span>
              {!canUseVip && <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[10px] font-bold flex items-center gap-0.5"><Lock className="w-3 h-3" />VIP</span>}
            </button>

            {/* Near me (VIP) */}
            <button type="button" className={rowCls} onClick={vipOnly(() => setIsNearMeModalOpen(true))}>
              <span className={`${iconBox} bg-emerald-100 text-emerald-700`}><Navigation className="w-5 h-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 dark:text-white">
                  {tr(language, 'នៅជិតខ្ញុំ', 'Near Me', '附近')}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {tr(language, 'ហាង និងកន្លែងក្បែរខ្លួន', 'Places & distances around you', '身边的餐厅与景点')}
                </span>
              </span>
              {!canUseVip && <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[10px] font-bold flex items-center gap-0.5"><Lock className="w-3 h-3" />VIP</span>}
            </button>

            {/* Favorites with live count */}
            <button type="button" className={rowCls} onClick={openFavorites}>
              <span className={`${iconBox} bg-rose-100 text-rose-600`}><Heart className="w-5 h-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 dark:text-white">
                  {tr(language, 'ចំណូលចិត្តរបស់ខ្ញុំ', 'My Favorites', '我的收藏')}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {tr(language, 'បញ្ជីដែលបានរក្សាទុក', 'Your saved list', '已保存列表')}
                </span>
              </span>
              <span className="min-w-[32px] h-8 px-2 rounded-full bg-rose-500 text-white text-sm font-extrabold flex items-center justify-center" aria-label={`${bookmarks.length}`}>
                {bookmarks.length}
              </span>
            </button>

            {/* Stamp collection */}
            <button type="button" className={rowCls} onClick={() => setOpenPanel(openPanel === 'stamps' ? null : 'stamps')} aria-expanded={openPanel === 'stamps'}>
              <span className={`${iconBox} bg-emerald-100 text-emerald-700`}><BadgeCheck className="w-5 h-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 dark:text-white">
                  {tr(language, 'កត់ត្រាម្ហូប', 'Discover & Dish Record', '探索与美食记录')}
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {level.emoji} {levelTitle(level, language)} · {stampCount} / {organizedFoods.length}
                </span>
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform motion-reduce:transition-none ${openPanel === 'stamps' ? 'rotate-180' : ''}`} />
            </button>
            {openPanel === 'stamps' && <FoodPassportCard />}

            {/* Share & recommend */}
            <InviteFriendsCard />

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
