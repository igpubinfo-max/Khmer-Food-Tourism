import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { FoodItem, Language, Restaurant, TouristDestination } from '../types';
import {
  getRestaurantRatingSummary,
  isAdminAccount,
  isUserVipActive,
  sortRestaurantsWithVipRotation,
} from '../types';
import { tr, translateProvince } from '../utils/i18n';
import { getLocalizedDestination, getLocalizedFood, getLocalizedRestaurant } from '../utils/zhDynamicTranslator';
import { copyTextNativeOrWeb } from '../utils/androidMediaHelper';
import {
  BookOpen, Sparkles, MapPinned, CalendarDays, Lightbulb, Heart, Star, Store, Compass, Utensils,
  ChevronRight, Copy, Lock, CheckCircle2, Route, Navigation, Maximize2, X, PhoneCall, ShieldAlert, Clock,
} from 'lucide-react';
import {
  EMERGENCY_CONTACTS, GUIDE_TIPS, MEAL_SLOTS, PHRASES, SEASONAL_ITEMS, TIP_CATEGORIES,
  getCambodiaHolidaysForYear, getMealSlotForHour, getSeasonForMonth, monthLabel, pickTri,
} from '../data/guideContent';
import type { MealSlotId, TipCategory } from '../data/guideContent';

type GuideTab = 'foryou' | 'provinces' | 'calendar' | 'tips';

const FALLBACK_IMG = '/welcome/hero-bg.webp';

const stripProvincePrefix = (s?: string) => (s || '').replace(/^រាជធានី|^ខេត្ត/g, '').trim();

const ratingScore = (rating?: number, count?: number) => (rating || 0) * Math.log(2 + (count || 0));

const dayOfYear = () => {
  const now = new Date();
  return Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
};

/** Rotate a ranked list by the day number so "picks" feel fresh every day while staying deterministic. */
const rotateDaily = <T,>(list: T[], take: number): T[] => {
  if (list.length <= take) return list;
  const pool = list.slice(0, Math.min(list.length, take * 2));
  const shift = dayOfYear() % pool.length;
  return pool.slice(shift).concat(pool.slice(0, shift)).slice(0, take);
};

const restaurantPhoto = (r: Restaurant) =>
  r.photoUrl && !r.photoUrl.startsWith('/foods/') && !r.photoUrl.startsWith('/restaurants/')
    ? r.photoUrl
    : r.profileImage && !r.profileImage.startsWith('/foods/') && !r.profileImage.startsWith('/restaurants/')
    ? r.profileImage
    : '/Shop/rest-1.jpg';

const isDirectoryRestaurant = (r: Restaurant) =>
  Boolean(r && r.id) &&
  !String(r.id).startsWith('food-') &&
  !String(r.id).startsWith('dest-') &&
  r.status === 'approved' &&
  r.aiCategoryVerification?.isFoodBusiness !== false;

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------
const Thumb: React.FC<{ src?: string; alt: string; className?: string }> = React.memo(({ src, alt, className }) => (
  <img
    src={src || FALLBACK_IMG}
    alt={alt}
    loading="lazy"
    decoding="async"
    className={className}
    onError={(e) => {
      const el = e.currentTarget;
      if (!el.dataset.fallback) {
        el.dataset.fallback = '1';
        el.src = FALLBACK_IMG;
      }
    }}
  />
));

interface MiniCardProps {
  image?: string;
  title: string;
  subtitle: string;
  tag?: string;
  rating?: number;
  meta?: string;
  saved?: boolean;
  onToggleSave?: () => void;
  onOpen: () => void;
  saveLabel: string;
}

const MiniCard: React.FC<MiniCardProps> = React.memo(
  ({ image, title, subtitle, tag, rating, meta, saved, onToggleSave, onOpen, saveLabel }) => (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group w-40 shrink-0 snap-start rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-xs cursor-pointer active:scale-[0.98] transition"
    >
      <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <Thumb src={image} alt={title} className="w-full h-full object-cover" />
        {tag && (
          <span className="absolute top-1.5 left-1.5 max-w-[78%] truncate px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#064E3B]/95 text-emerald-100 border border-emerald-400/30">
            {tag}
          </span>
        )}
        {onToggleSave && (
          <button
            type="button"
            aria-label={saveLabel}
            aria-pressed={Boolean(saved)}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
            className={`absolute top-1 right-1 w-8 h-8 rounded-full flex items-center justify-center transition active:scale-90 ${
              saved ? 'bg-rose-500 text-white' : 'bg-white/95 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>
      <div className="p-2.5 space-y-0.5">
        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white line-clamp-1 font-khmer">{title}</h4>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 font-khmer">{subtitle}</p>
        <div className="flex items-center justify-between gap-1 pt-0.5 min-h-[16px]">
          {typeof rating === 'number' && rating > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              <Star className="w-3 h-3 fill-current" />
              {rating.toFixed(1)}
            </span>
          ) : (
            <span />
          )}
          {meta && <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">{meta}</span>}
        </div>
      </div>
    </div>
  )
);

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }> = ({
  icon,
  title,
  subtitle,
  action,
}) => (
  <div className="flex items-end justify-between gap-2">
    <div className="min-w-0">
      <h3 className="font-moul text-xs sm:text-sm text-[#0F172A] dark:text-white flex items-center gap-1.5 leading-snug">
        <span className="text-[#064E3B] dark:text-emerald-400 shrink-0">{icon}</span>
        <span>{title}</span>
      </h3>
      {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-khmer leading-snug">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const HScroll: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="-mx-4 px-4 flex gap-3 overflow-x-auto no-scrollbar snap-x pb-1">{children}</div>
);

interface ListRowProps {
  image?: string;
  title: string;
  subtitle: string;
  badge?: string;
  rating?: number;
  onOpen: () => void;
}

const ListRow: React.FC<ListRowProps> = React.memo(({ image, title, subtitle, badge, rating, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className="w-full p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 flex items-center gap-3 text-left transition active:scale-[0.99] hover:border-emerald-400/60 cursor-pointer"
  >
    <Thumb src={image} alt={title} className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-slate-700" />
    <div className="min-w-0 flex-1">
      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white line-clamp-1 font-khmer">{title}</h4>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 font-khmer">{subtitle}</p>
      <div className="flex items-center gap-2 mt-0.5">
        {typeof rating === 'number' && rating > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
            <Star className="w-3 h-3 fill-current" />
            {rating.toFixed(1)}
          </span>
        )}
        {badge && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            {badge}
          </span>
        )}
      </div>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
  </button>
));

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------
export const GuideView: React.FC = () => {
  const {
    language, currentUser, users, appSettings, foods, restaurants, destinations,
    bookmarks, toggleBookmark, setSelectedFood, setSelectedRestaurant, setSelectedDestination,
    trackRestaurantView, selectedProvince, setSelectedProvince, setActiveTab, showToast,
    setIsAiTripPlannerModalOpen, setIsNearMeModalOpen,
  } = useApp();

  const lang = language as Language;
  const isAdmin = isAdminAccount(currentUser);
  const isVip = isUserVipActive(currentUser);

  const [tab, setTab] = useState<GuideTab>('foryou');
  const [mealOverride, setMealOverride] = useState<MealSlotId | null>(null);
  const [provinceKey, setProvinceKey] = useState<string>(() => stripProvincePrefix(selectedProvince));
  const [tipFilter, setTipFilter] = useState<TipCategory | 'all'>('all');
  const [bigPhraseId, setBigPhraseId] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const hour = now.getHours();
  const month = now.getMonth() + 1;
  const currentSlotId = getMealSlotForHour(hour);
  const activeSlot = MEAL_SLOTS.find((s) => s.id === (mealOverride || currentSlotId)) || MEAL_SLOTS[0];
  const season = getSeasonForMonth(month);

  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks]);
  const saveLabel = tr(language, 'រក្សាទុក', 'Save', '收藏');

  const greeting =
    hour < 11
      ? tr(language, 'អរុណសួស្តី', 'Good morning', '早上好')
      : hour < 17
      ? tr(language, 'ទិវាសួស្តី', 'Good afternoon', '下午好')
      : tr(language, 'សាយ័ណ្ហសួស្តី', 'Good evening', '晚上好');
  const firstName = (currentUser?.name || '').split(' ')[0];

  // ---- open helpers -------------------------------------------------------
  const openRestaurant = useCallback(
    (r: Restaurant) => {
      trackRestaurantView(r.id);
      setSelectedRestaurant(r);
    },
    [trackRestaurantView, setSelectedRestaurant]
  );

  const goToProvince = useCallback(
    (key: string, target: 'tourism' | 'restaurants') => {
      setSelectedProvince(key);
      setActiveTab(target);
    },
    [setSelectedProvince, setActiveTab]
  );

  // ---- derived live data --------------------------------------------------
  const rankedFoods = useMemo(
    () => [...foods].sort((a, b) => ratingScore(b.rating, b.reviewCount) - ratingScore(a.rating, a.reviewCount)),
    [foods]
  );
  const rankedDestinations = useMemo(
    () =>
      [...destinations].sort(
        (a, b) =>
          Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) ||
          ratingScore(b.rating, b.reviewCount) - ratingScore(a.rating, a.reviewCount)
      ),
    [destinations]
  );
  const directoryShops = useMemo(() => restaurants.filter(isDirectoryRestaurant), [restaurants]);

  const mealPicks = useMemo(
    () => rotateDaily(rankedFoods.filter((f) => activeSlot.categories.includes(f.categorySlug)), 10),
    [rankedFoods, activeSlot]
  );

  const savedFoods = useMemo(() => foods.filter((f) => bookmarkSet.has(f.id)), [foods, bookmarkSet]);
  const savedPlaces = useMemo(() => destinations.filter((d) => bookmarkSet.has(d.id)), [destinations, bookmarkSet]);
  const savedShops = useMemo(() => restaurants.filter((r) => bookmarkSet.has(r.id)), [restaurants, bookmarkSet]);
  const savedCount = savedFoods.length + savedPlaces.length + savedShops.length;

  const topCategories = <T extends { categorySlug: string }>(items: T[]) => {
    const counts: Record<string, number> = {};
    for (const it of items) counts[it.categorySlug] = (counts[it.categorySlug] || 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k]) => k);
  };

  const dishRecs = useMemo(() => {
    const cats = topCategories(savedFoods);
    const base = cats.length
      ? rankedFoods.filter((f) => cats.includes(f.categorySlug) && !bookmarkSet.has(f.id))
      : rankedFoods;
    return { personalized: cats.length > 0, items: rotateDaily(base, 10) };
  }, [savedFoods, rankedFoods, bookmarkSet]);

  const placeRecs = useMemo(() => {
    const cats = topCategories(savedPlaces);
    const base = cats.length
      ? rankedDestinations.filter((d) => cats.includes(d.categorySlug) && !bookmarkSet.has(d.id))
      : rankedDestinations;
    return { personalized: cats.length > 0, items: rotateDaily(base, 10) };
  }, [savedPlaces, rankedDestinations, bookmarkSet]);

  const featuredShops = useMemo(
    () => sortRestaurantsWithVipRotation(directoryShops.filter((r) => r.isVerified), users, appSettings).slice(0, 10),
    [directoryShops, users, appSettings]
  );

  // Province groups (live: built from destinations + approved shops)
  const provinceGroups = useMemo(() => {
    const map = new Map<string, { key: string; km: string; en: string; places: TouristDestination[]; shops: Restaurant[] }>();
    const ensure = (kh?: string, en?: string) => {
      const key = stripProvincePrefix(kh) || (en || '').trim();
      if (!key) return null;
      let g = map.get(key);
      if (!g) {
        g = { key, km: key, en: en || key, places: [], shops: [] };
        map.set(key, g);
      }
      return g;
    };
    for (const d of destinations) ensure(d.provinceKh, d.provinceEn)?.places.push(d);
    for (const r of directoryShops) ensure(r.provinceKh, r.provinceEn)?.shops.push(r);
    return Array.from(map.values()).sort((a, b) => b.places.length + b.shops.length - (a.places.length + a.shops.length));
  }, [destinations, directoryShops]);

  const activeGroup = provinceGroups.find((g) => g.key === provinceKey) || provinceGroups[0];
  const provinceName = (g: { km: string; en: string }) =>
    lang === 'km' ? g.km : lang === 'zh' ? translateProvince(g.en, 'zh') : g.en;

  const groupPlaces = useMemo(
    () =>
      activeGroup
        ? [...activeGroup.places]
            .sort((a, b) => ratingScore(b.rating, b.reviewCount) - ratingScore(a.rating, a.reviewCount))
            .slice(0, 6)
        : [],
    [activeGroup]
  );
  const groupShops = useMemo(
    () => (activeGroup ? sortRestaurantsWithVipRotation(activeGroup.shops, users, appSettings).slice(0, 6) : []),
    [activeGroup, users, appSettings]
  );

  // Calendar data (automatically calculates exact solar dates and countdown days for current & next year)
  const seasonalNow = useMemo(() => SEASONAL_ITEMS.filter((s) => s.months.includes(month)), [month]);
  const festivals = useMemo(() => getCambodiaHolidaysForYear(now), [now]);

  const visibleTips = useMemo(
    () => GUIDE_TIPS.filter((t) => tipFilter === 'all' || t.category === tipFilter),
    [tipFilter]
  );

  // ---- card builders ------------------------------------------------------
  const renderFoodCard = (f: FoodItem) => {
    const loc = getLocalizedFood(f, lang);
    return (
      <MiniCard
        key={f.id}
        image={f.photoUrl}
        title={loc.name}
        subtitle={loc.category}
        rating={f.rating}
        meta={
          f.priceUsd > 0
            ? tr(language, `ប្រហាក់ប្រហែល $${f.priceUsd.toFixed(2)}`, `Approx. $${f.priceUsd.toFixed(2)}`, `约 $${f.priceUsd.toFixed(2)}`)
            : undefined
        }
        saved={bookmarkSet.has(f.id)}
        onToggleSave={() => toggleBookmark(f.id)}
        onOpen={() => setSelectedFood(f)}
        saveLabel={saveLabel}
      />
    );
  };

  const renderPlaceCard = (d: TouristDestination) => {
    const loc = getLocalizedDestination(d, lang);
    return (
      <MiniCard
        key={d.id}
        image={d.photoUrl}
        title={loc.name}
        subtitle={loc.province}
        tag={loc.category}
        rating={d.rating}
        saved={bookmarkSet.has(d.id)}
        onToggleSave={() => toggleBookmark(d.id)}
        onOpen={() => setSelectedDestination(d)}
        saveLabel={saveLabel}
      />
    );
  };

  const renderShopCard = (r: Restaurant) => {
    const loc = getLocalizedRestaurant(r, lang);
    const summary = getRestaurantRatingSummary(r);
    return (
      <MiniCard
        key={r.id}
        image={restaurantPhoto(r)}
        title={loc.name}
        subtitle={loc.province}
        tag={r.isVerified ? tr(language, 'ផ្ទៀងផ្ទាត់រួច', 'Verified', '已认证') : undefined}
        rating={summary.hasReviews ? summary.averageRating : undefined}
        meta={
          r.priceLevel
            ? tr(language, `ប្រហាក់ប្រហែល ${r.priceLevel}`, `Approx. ${r.priceLevel}`, `约 ${r.priceLevel}`)
            : undefined
        }
        saved={bookmarkSet.has(r.id)}
        onToggleSave={() => toggleBookmark(r.id)}
        onOpen={() => openRestaurant(r)}
        saveLabel={saveLabel}
      />
    );
  };

  const copyPhrase = async (text: string) => {
    const ok = await copyTextNativeOrWeb(text, text);
    showToast(
      ok
        ? tr(language, 'បានចម្លងរួចរាល់', 'Copied to clipboard', '已复制')
        : tr(language, 'មិនអាចចម្លងបាន', 'Could not copy', '复制失败'),
      ok ? 'success' : 'warning'
    );
  };

  const tabs: Array<{ id: GuideTab; icon: React.ReactNode; label: string }> = [
    { id: 'foryou', icon: <Sparkles className="w-4 h-4" />, label: tr(language, 'សម្រាប់អ្នក', 'For You', '为你推荐') },
    { id: 'provinces', icon: <MapPinned className="w-4 h-4" />, label: tr(language, 'ខេត្ត', 'Provinces', '省份') },
    { id: 'calendar', icon: <CalendarDays className="w-4 h-4" />, label: tr(language, 'ប្រតិទិន', 'Calendar', '日历') },
    { id: 'tips', icon: <Lightbulb className="w-4 h-4" />, label: tr(language, 'គន្លឹះ', 'Tips', '实用') },
  ];

  const bigPhrase = PHRASES.find((p) => p.id === bigPhraseId) || null;

  // Let the Android hardware Back button close the big-text overlay first (see AppContext back handler)
  useEffect(() => {
    if (!bigPhraseId) return;
    const close = () => setBigPhraseId(null);
    (window as any).__kft_guide_overlay_open = true;
    window.addEventListener('kft:close-guide-overlay', close);
    return () => {
      (window as any).__kft_guide_overlay_open = false;
      window.removeEventListener('kft:close-guide-overlay', close);
    };
  }, [bigPhraseId]);

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-4 pb-24 font-khmer">
      {/* Hero */}
      <section className="relative overflow-hidden p-4 rounded-3xl bg-gradient-to-br from-[#064E3B] via-[#065F46] to-[#047857] text-white border border-emerald-600/30 shadow-md">
        <div className="absolute -right-8 -top-10 w-32 h-32 rounded-full bg-amber-300/10 blur-2xl pointer-events-none" />
        <div className="relative space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-emerald-200 truncate">
                {greeting}
                {firstName ? `, ${firstName}` : ''}
              </p>
              <h2 className="font-moul text-sm sm:text-base leading-snug">
                {tr(language, 'ណែនាំ & ស្វែងយល់', 'Guide & Discover', '指南与发现')}
              </h2>
            </div>
          </div>
          <p className="text-[11px] text-emerald-100/95 leading-relaxed">
            {tr(
              language,
              'ជម្រើសម្ហូប ទីកន្លែង ប្រតិទិនបុណ្យ និងគន្លឹះដំណើរកម្សាន្តសម្រាប់ប្រទេសកម្ពុជា',
              'Dish picks, places, a festival calendar and practical tips for exploring Cambodia',
              '为探索柬埔寨准备的美食推荐、景点、节庆日历与实用贴士'
            )}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-[10px] font-bold">
              {season.emoji} {pickTri(season.name, lang)} • {pickTri(season.range, lang)}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-300 text-slate-950 text-[10px] font-black">
              {activeSlot.emoji} {pickTri(MEAL_SLOTS.find((s) => s.id === currentSlotId)!.label, lang)}
            </span>
          </div>
        </div>
      </section>

      {/* Segmented navigation */}
      <div
        role="tablist"
        aria-label={tr(language, 'ផ្នែកណែនាំ', 'Guide sections', '指南分区')}
        className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700"
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`py-2 px-1 rounded-xl flex flex-col items-center gap-0.5 text-[11px] font-bold transition cursor-pointer ${
                active
                  ? 'bg-[#064E3B] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700'
              }`}
            >
              {t.icon}
              <span className="leading-tight truncate max-w-full">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FOR YOU                                                            */}
      {/* ------------------------------------------------------------------ */}
      {tab === 'foryou' && (
        <div className="space-y-5">
          {!isAdmin && (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsAiTripPlannerModalOpen(true)}
                className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 flex items-center gap-2.5 text-left transition active:scale-[0.98] cursor-pointer"
              >
                <span className="w-9 h-9 rounded-xl bg-[#064E3B] text-amber-300 flex items-center justify-center shrink-0">
                  <Route className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-extrabold text-slate-900 dark:text-white truncate">
                    {tr(language, 'ផែនការដើរលេង AI', 'AI Trip Planner', 'AI 行程规划')}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                    {!isVip && <Lock className="w-3 h-3" />}
                    <span>{isVip ? tr(language, 'បើកភ្លាមៗ', 'Open now', '立即打开') : 'VIP'}</span>
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsNearMeModalOpen(true)}
                className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 flex items-center gap-2.5 text-left transition active:scale-[0.98] cursor-pointer"
              >
                <span className="w-9 h-9 rounded-xl bg-[#064E3B] text-amber-300 flex items-center justify-center shrink-0">
                  <Navigation className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-extrabold text-slate-900 dark:text-white truncate">
                    {tr(language, 'នៅជិតខ្ញុំ', 'Near Me', '附近')}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                    {!isVip && <Lock className="w-3 h-3" />}
                    <span>{isVip ? tr(language, 'តាម GPS', 'Using GPS', '使用定位') : 'VIP'}</span>
                  </span>
                </span>
              </button>
            </div>
          )}

          {/* Time-aware meal picks */}
          <section className="space-y-2.5">
            <SectionTitle
              icon={<Utensils className="w-4 h-4" />}
              title={tr(language, 'ញ៉ាំអ្វីល្អឥឡូវនេះ?', 'What to eat right now', '现在吃什么')}
              subtitle={pickTri(activeSlot.hint, lang)}
            />
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
              {MEAL_SLOTS.map((s) => {
                const active = s.id === activeSlot.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setMealOverride(s.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition cursor-pointer ${
                      active
                        ? 'bg-emerald-700 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {s.emoji} {pickTri(s.label, lang)}
                    {s.id === currentSlotId && <span className="ml-1 text-[9px] opacity-80">• {tr(language, 'ឥឡូវ', 'now', '当前')}</span>}
                  </button>
                );
              })}
            </div>
            {mealPicks.length > 0 ? (
              <HScroll>{mealPicks.map(renderFoodCard)}</HScroll>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tr(language, 'មិនទាន់មានម្ហូបសម្រាប់ពេលនេះទេ', 'No dishes available for this time yet.', '该时段暂无菜品。')}
              </p>
            )}
          </section>

          {/* Saved */}
          {savedCount > 0 && (
            <section className="space-y-2.5">
              <SectionTitle
                icon={<Heart className="w-4 h-4" />}
                title={tr(language, 'ចំណូលចិត្តរបស់អ្នក', 'Your saved picks', '我的收藏')}
                subtitle={tr(language, `${savedCount} ធាតុដែលអ្នកបានរក្សាទុក`, `${savedCount} items you saved`, `已收藏 ${savedCount} 项`)}
              />
              <HScroll>
                {savedFoods.slice(0, 6).map(renderFoodCard)}
                {savedPlaces.slice(0, 6).map(renderPlaceCard)}
                {savedShops.slice(0, 6).map(renderShopCard)}
              </HScroll>
            </section>
          )}

          {/* Dishes you may love */}
          {dishRecs.items.length > 0 && (
            <section className="space-y-2.5">
              <SectionTitle
                icon={<Sparkles className="w-4 h-4" />}
                title={tr(language, 'ម្ហូបដែលអ្នកប្រហែលចូលចិត្ត', 'Dishes you may love', '你可能喜欢的菜品')}
                subtitle={
                  dishRecs.personalized
                    ? tr(language, 'ផ្អែកលើម្ហូបដែលអ្នកបានរក្សាទុក', 'Based on the dishes you saved', '根据你收藏的菜品推荐')
                    : tr(language, 'ម្ហូបខ្មែរដែលមានពិន្ទុខ្ពស់បំផុត', 'Top-rated Khmer dishes', '评分最高的高棉菜品')
                }
                action={
                  <button
                    type="button"
                    onClick={() => setActiveTab('food')}
                    className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0 cursor-pointer"
                  >
                    {tr(language, 'មើលទាំងអស់', 'See all', '查看全部')}
                  </button>
                }
              />
              <HScroll>{dishRecs.items.map(renderFoodCard)}</HScroll>
            </section>
          )}

          {/* Places you may love */}
          {placeRecs.items.length > 0 && (
            <section className="space-y-2.5">
              <SectionTitle
                icon={<Compass className="w-4 h-4" />}
                title={tr(language, 'កន្លែងដែលអ្នកប្រហែលចូលចិត្ត', 'Places you may love', '你可能喜欢的景点')}
                subtitle={
                  placeRecs.personalized
                    ? tr(language, 'ផ្អែកលើកន្លែងដែលអ្នកបានរក្សាទុក', 'Based on the places you saved', '根据你收藏的景点推荐')
                    : tr(language, 'រមណីយដ្ឋានពេញនិយម និងពិន្ទុខ្ពស់', 'Featured & top-rated destinations', '精选与高评分景点')
                }
                action={
                  <button
                    type="button"
                    onClick={() => setActiveTab('tourism')}
                    className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0 cursor-pointer"
                  >
                    {tr(language, 'មើលទាំងអស់', 'See all', '查看全部')}
                  </button>
                }
              />
              <HScroll>{placeRecs.items.map(renderPlaceCard)}</HScroll>
            </section>
          )}

          {/* Verified shops */}
          {featuredShops.length > 0 && (
            <section className="space-y-2.5">
              <SectionTitle
                icon={<Store className="w-4 h-4" />}
                title={tr(language, 'ហាងផ្ទៀងផ្ទាត់ដែលគួរទៅ', 'Verified shops worth a visit', '值得一去的认证店铺')}
                subtitle={tr(language, 'ហាង VIP ដែលកំពុងបង្ហាញមុខគេនៅខាងមុខ', 'Currently featured VIP shops appear first', '当前置顶的 VIP 店铺优先展示')}
                action={
                  <button
                    type="button"
                    onClick={() => setActiveTab('restaurants')}
                    className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0 cursor-pointer"
                  >
                    {tr(language, 'មើលទាំងអស់', 'See all', '查看全部')}
                  </button>
                }
              />
              <HScroll>{featuredShops.map(renderShopCard)}</HScroll>
            </section>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* PROVINCES                                                          */}
      {/* ------------------------------------------------------------------ */}
      {tab === 'provinces' && (
        <div className="space-y-4">
          <SectionTitle
            icon={<MapPinned className="w-4 h-4" />}
            title={tr(language, 'ស្វែងយល់តាមខេត្ត', 'Explore by province', '按省份探索')}
            subtitle={tr(language, 'ជ្រើសរើសខេត្ត ដើម្បីមើលកន្លែងទេសចរណ៍ និងហាងអាហារ', 'Pick a province to see its places and shops', '选择省份查看景点与餐厅')}
          />
          {provinceGroups.length === 0 ? (
            <p className="text-xs text-slate-500">{tr(language, 'មិនទាន់មានទិន្នន័យ', 'No data available yet.', '暂无数据。')}</p>
          ) : (
            <>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 py-0.5">
                {provinceGroups.map((g) => {
                  const active = activeGroup?.key === g.key;
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setProvinceKey(g.key)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition cursor-pointer ${
                        active
                          ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {provinceName(g)}
                      <span className="ml-1 opacity-70">{g.places.length + g.shops.length}</span>
                    </button>
                  );
                })}
              </div>

              {activeGroup && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/40 border border-emerald-200/80 dark:border-emerald-800/50 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-moul text-sm text-[#064E3B] dark:text-emerald-300 truncate">{provinceName(activeGroup)}</h3>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                        {tr(
                          language,
                          `${activeGroup.places.length} កន្លែងទេសចរណ៍ • ${activeGroup.shops.length} ហាងអាហារ`,
                          `${activeGroup.places.length} places • ${activeGroup.shops.length} shops`,
                          `${activeGroup.places.length} 个景点 • ${activeGroup.shops.length} 家餐厅`
                        )}
                      </p>
                    </div>
                  </div>

                  {groupPlaces.length > 0 && (
                    <section className="space-y-2">
                      <SectionTitle
                        icon={<Compass className="w-4 h-4" />}
                        title={tr(language, 'កន្លែងគួរទៅលេង', 'Places to visit', '值得一游')}
                        action={
                          <button
                            type="button"
                            onClick={() => goToProvince(activeGroup.key, 'tourism')}
                            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0 cursor-pointer"
                          >
                            {tr(language, 'មើលទាំងអស់', 'See all', '查看全部')}
                          </button>
                        }
                      />
                      <div className="space-y-2">
                        {groupPlaces.map((d) => {
                          const loc = getLocalizedDestination(d, lang);
                          return (
                            <ListRow
                              key={d.id}
                              image={d.photoUrl}
                              title={loc.name}
                              subtitle={loc.category}
                              rating={d.rating}
                              onOpen={() => setSelectedDestination(d)}
                            />
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {groupShops.length > 0 && (
                    <section className="space-y-2">
                      <SectionTitle
                        icon={<Store className="w-4 h-4" />}
                        title={tr(language, 'ហាងអាហារ', 'Where to eat', '特色餐厅')}
                        action={
                          <button
                            type="button"
                            onClick={() => goToProvince(activeGroup.key, 'restaurants')}
                            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0 cursor-pointer"
                          >
                            {tr(language, 'មើលទាំងអស់', 'See all', '查看全部')}
                          </button>
                        }
                      />
                      <div className="space-y-2">
                        {groupShops.map((r) => {
                          const loc = getLocalizedRestaurant(r, lang);
                          const summary = getRestaurantRatingSummary(r);
                          return (
                            <ListRow
                              key={r.id}
                              image={restaurantPhoto(r)}
                              title={loc.name}
                              subtitle={loc.address || loc.province}
                              rating={summary.hasReviews ? summary.averageRating : undefined}
                              badge={r.isVerified ? tr(language, 'ផ្ទៀងផ្ទាត់រួច', 'Verified', '已认证') : undefined}
                              onOpen={() => openRestaurant(r)}
                            />
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* CALENDAR                                                           */}
      {/* ------------------------------------------------------------------ */}
      {tab === 'calendar' && (
        <div className="space-y-5">
          <section className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-moul text-xs sm:text-sm text-[#0F172A] dark:text-white">
                {season.emoji} {pickTri(season.name, lang)}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                {pickTri(season.range, lang)}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{pickTri(season.tip, lang)}</p>
          </section>

          {seasonalNow.length > 0 && (
            <section className="space-y-2.5">
              <SectionTitle
                icon={<span className="text-sm">🍍</span>}
                title={tr(language, 'ផលិតផលតាមរដូវឥឡូវនេះ', 'In season right now', '当季美味')}
                subtitle={tr(language, 'ពេលវេលាប្រមាណតាមរដូវកាល', 'Approximate harvest windows', '大致采收时间')}
              />
              <div className="grid grid-cols-1 gap-2">
                {seasonalNow.map((s) => (
                  <div
                    key={s.name.en}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 flex items-start gap-3"
                  >
                    <span className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-xl shrink-0">
                      {s.emoji}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">{pickTri(s.name, lang)}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{pickTri(s.note, lang)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2.5">
            <SectionTitle
              icon={<CalendarDays className="w-4 h-4" />}
              title={tr(language, 'បុណ្យជាតិ & ពិធីបុណ្យផ្លូវការនៅកម្ពុជា (១៦ ពិធី)', 'Cambodian Public Holidays & Festivals (Auto-Updated Yearly)', '柬埔寨官方公共假日与传统庆典（每年自动更新）')}
              subtitle={tr(
                language,
                'បង្ហាញកាលបរិច្ឆេទពិតប្រាកដ ចំនួនថ្ងៃនៅសល់ និងរយៈពេលឈប់សម្រាកផ្លូវការ',
                'Live countdown in days and official public holiday duration',
                '显示准确日期、倒计时天数及官方放假时长'
              )}
            />
            <ol className="space-y-3">
              {festivals.map((f, idx) => (
                <li
                  key={f.id}
                  className={`p-3.5 rounded-2xl border space-y-2.5 ${
                    f.isOngoingToday
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 dark:border-rose-600 shadow-sm'
                      : idx === 0
                      ? 'bg-amber-50 dark:bg-amber-950/25 border-amber-300/80 dark:border-amber-700/60 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200/90 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 shrink-0 text-center p-1.5 rounded-2xl bg-emerald-50 dark:bg-slate-700/70 border border-emerald-200/60 dark:border-slate-600">
                      <div className="text-2xl leading-none">{f.emoji}</div>
                      <div className="mt-1 text-[10px] font-black text-[#064E3B] dark:text-emerald-300">{monthLabel(f.month, lang)}</div>
                      <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{f.activeYear}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                          {pickTri(f.name, lang)}
                        </h4>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                            f.isOngoingToday
                              ? 'bg-rose-600 text-white'
                              : idx === 0
                              ? 'bg-amber-400 text-slate-950 shadow-2xs'
                              : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          {pickTri(f.countdownBadge, lang)}
                        </span>
                      </div>

                      <p className="text-[11px] font-bold text-[#064E3B] dark:text-emerald-300 mt-1">
                        📅 {pickTri(f.formattedDateRange, lang)} • <span className="font-normal text-slate-500 dark:text-slate-400">{pickTri(f.when, lang)}</span>
                      </p>

                      {/* Explicit Duration Pill */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-800 dark:text-slate-200 text-[10px] font-bold border border-slate-200 dark:border-slate-600">
                          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>{tr(language, 'រយៈពេល៖', 'Duration:', '时长：')} {pickTri(f.durationLabel, lang)}</span>
                        </span>
                      </div>

                      <p className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-200 mt-2 leading-relaxed">{pickTri(f.about, lang)}</p>
                    </div>
                  </div>
                  <div className="grid gap-1.5 text-[11px] leading-snug">
                    <p className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200">
                      🍽️ <span className="font-bold">{tr(language, 'ម្ហូបប្រចាំពិធី៖', 'Festival Foods:', '节日美食：')}</span> {pickTri(f.foods, lang)}
                    </p>
                    <p className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300">
                      💡 {pickTri(f.tip, lang)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TIPS & PHRASEBOOK                                                  */}
      {/* ------------------------------------------------------------------ */}
      {tab === 'tips' && (
        <div className="space-y-5">
          {/* Dedicated Police & Emergency Contacts Section */}
          {(tipFilter === 'all' || tipFilter === 'safety') && (
            <section className="p-4 rounded-3xl bg-gradient-to-br from-rose-50 via-amber-50/70 to-white dark:from-rose-950/40 dark:via-slate-900 dark:to-slate-800 border-2 border-rose-300 dark:border-rose-800/80 space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-moul text-xs sm:text-sm text-rose-900 dark:text-rose-200 truncate">
                      {tr(language, '🚨 លេខទូរស័ព្ទប៉ូលីស & សង្គ្រោះបន្ទាន់ (24 ម៉ោង)', '🚨 Police & Emergency Hotlines (24/7)', '🚨 柬埔寨警察与紧急救援电话（24小时）')}
                    </h3>
                    <p className="text-[10px] text-rose-700 dark:text-rose-300">
                      {tr(language, 'ចុចលើលេខទូរស័ព្ទខាងក្រោមដើម្បីហៅចេញភ្លាមៗក្នុងករណីមានអាសន្ន', 'Tap any emergency number below to dial immediately', '遇到紧急情况请点击下方号码直接拨打')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EMERGENCY_CONTACTS.map((ec) => (
                  <div
                    key={ec.id}
                    className="p-2.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-rose-200/80 dark:border-slate-700 flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-lg shrink-0">
                        {ec.emoji}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                          {pickTri(ec.name, lang)}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {pickTri(ec.note, lang)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`tel:${ec.number}`}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono font-black text-xs flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95 transition"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>{ec.number}</span>
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2.5">
            <SectionTitle
              icon={<Lightbulb className="w-4 h-4" />}
              title={tr(language, `គន្លឹះដំណើរកម្សាន្ត & ញ៉ាំអាហារ (${GUIDE_TIPS.length} គន្លឹះ)`, `Travel & dining tips (${GUIDE_TIPS.length} tips)`, `旅行与用餐实用贴士（共 ${GUIDE_TIPS.length} 条）`)}
            />
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
              {TIP_CATEGORIES.map((c) => {
                const active = tipFilter === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setTipFilter(c.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition cursor-pointer ${
                      active
                        ? 'bg-emerald-700 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {c.emoji} {pickTri(c.label, lang)}
                  </button>
                );
              })}
            </div>
            <ul className="space-y-2">
              {visibleTips.map((t) => (
                <li
                  key={t.id}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 flex items-start gap-3"
                >
                  <span className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-xl shrink-0">
                    {t.emoji}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">{pickTri(t.title, lang)}</h4>
                    <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">{pickTri(t.body, lang)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2.5">
            <SectionTitle
              icon={<span className="text-sm">🗣️</span>}
              title={tr(language, 'ឃ្លាខ្មែរចាំបាច់', 'Khmer phrasebook', '高棉语常用语')}
              subtitle={tr(
                language,
                'ចុចចម្លង ឬបង្ហាញអក្សរធំដល់អ្នកលក់',
                'Copy a phrase or show it in big text to the vendor',
                '可复制短语，或放大文字展示给店家'
              )}
            />
            <ul className="space-y-2">
              {PHRASES.map((p) => (
                <li
                  key={p.id}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 flex items-center gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-[#064E3B] dark:text-emerald-300 font-khmer leading-snug">{p.khmer}</p>
                    <p className="text-[10px] italic text-slate-500 dark:text-slate-400">{p.roman}</p>
                    <p className="text-[11px] text-slate-700 dark:text-slate-200 mt-0.5">
                      {lang === 'zh' ? p.zh : p.en}
                      {lang === 'km' && <span className="text-slate-400"> • {p.zh}</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBigPhraseId(p.id)}
                    aria-label={tr(language, 'បង្ហាញអក្សរធំ', 'Show in big text', '放大显示')}
                    className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 active:scale-90 transition cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => copyPhrase(p.khmer)}
                    aria-label={tr(language, 'ចម្លង', 'Copy', '复制')}
                    className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 active:scale-90 transition cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {/* Big-text overlay for showing a phrase to a vendor */}
      {bigPhrase && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] bg-[#022c22]/97 flex flex-col items-center justify-center p-6 text-center"
          onClick={() => setBigPhraseId(null)}
        >
          <button
            type="button"
            aria-label={tr(language, 'បិទ', 'Close', '关闭')}
            onClick={() => setBigPhraseId(null)}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center active:scale-90 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <p className="text-4xl sm:text-5xl font-extrabold text-amber-300 font-khmer leading-snug break-words max-w-full">{bigPhrase.khmer}</p>
          <p className="mt-4 text-base italic text-emerald-100">{bigPhrase.roman}</p>
          <p className="mt-2 text-sm text-white/80">{lang === 'zh' ? bigPhrase.zh : bigPhrase.en}</p>
        </div>
      )}
    </div>
  );
};
