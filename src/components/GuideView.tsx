import { openNearMeModal } from '../utils/nearMeNavigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { FoodItem, Language, Restaurant, TouristDestination } from '../types';
import {
  NEUTRAL_DEFAULT_SHOP_ICON_DATA_URI,
  getRestaurantRatingSummary,
  isAdminAccount,
  isUserVipActive,
  resolveFoodPhotoUrl,
  sanitizeRestaurantShopPhoto,
  sortRestaurantsWithVipRotation,
} from '../types';
import { tr, translateProvince } from '../utils/i18n';
import { smoothScrollToElement } from '../utils/smoothScroll';
import { getLocalizedDestination, getLocalizedFood, getLocalizedRestaurant, toConciseSummary } from '../utils/zhDynamicTranslator';
import { copyTextNativeOrWeb } from '../utils/androidMediaHelper';
import { ShopAvatar } from './icons/DefaultShopIcon';
import { AngkorHeroTopHeader } from './AngkorHeroTopHeader';
import { AngkorParkQuickBar, AngkorVisitGuideModal, type AngkorGuideTab } from './AngkorVisitGuideModal';
import { ANGKOR_CODE_OF_CONDUCT } from '../data/angkorVisitGuideData';
import {
  BookOpen,
  Award,
  MapPinned,
  CalendarDays,
  Lightbulb,
  Heart,
  Star,
  Store,
  Compass,
  Utensils,
  ChevronRight,
  ChevronDown,
  Copy,
  CheckCircle2,
  Route,
  Navigation,
  Maximize2,
  X,
  PhoneCall,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import {
  EMERGENCY_CONTACTS,
  GUIDE_TIPS,
  MEAL_SLOTS,
  PHRASES,
  SEASONAL_ITEMS,
  TIP_CATEGORIES,
  getCambodiaHolidaysForYear,
  getMealSlotForHour,
  getSeasonForMonth,
  monthLabel,
  pickTri,
} from '../data/guideContent';
import type { MealSlotId, TipCategory } from '../data/guideContent';
import {
  PROVINCIAL_ADMIN_HISTORY_HOSPITALS,
  INTERNATIONAL_PORTS_DATA,
  findProvinceAdminHistory,
} from '../data/provincialAdminPortsEmergencyData';
import {
  CAMBODIA_UNESCO_HERITAGE_LIST,
  CAMBODIA_NATIONAL_SYMBOLS_AND_WILDLIFE,
  CAMBODIA_DOMESTIC_TRANSPORT_ROUTES,
  CAMBODIA_FAST_FACTS,
} from '../data/cambodiaHeritageAndFactsData';
import { resolveFestivalFoods } from '../data/festivalFoods';
import { FestivalDishRow } from './home/FestivalFoodSection';

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

const restaurantPhoto = (r: Restaurant) => {
  const clean = sanitizeRestaurantShopPhoto(r.id, r.photoUrl || r.profileImage || '');
  return clean ? resolveFoodPhotoUrl(clean, r.photoUpdatedAt) : NEUTRAL_DEFAULT_SHOP_ICON_DATA_URI;
};

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
  customMedia?: React.ReactNode;
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
  ({ image, customMedia, title, subtitle, tag, rating, meta, saved, onToggleSave, onOpen, saveLabel }) => (
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
      className="group w-40 shrink-0 snap-start rounded-2xl overflow-hidden bg-white border border-slate-200/90 shadow-xs cursor-pointer active:scale-[0.98] transition"
    >
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {customMedia || <Thumb src={image} alt={title} className="w-full h-full object-cover" />}
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
              saved ? 'bg-rose-500 text-white' : 'bg-white/95 text-slate-600'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>
      <div className="p-2.5 space-y-0.5">
        <h4 className="text-xs font-extrabold text-slate-900 line-clamp-1 font-khmer">{title}</h4>
        <p className="text-[10px] text-slate-500 line-clamp-1 font-khmer">{subtitle}</p>
        <div className="flex items-center justify-between gap-1 pt-0.5 min-h-[16px]">
          {typeof rating === 'number' && rating > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600">
              <Star className="w-3 h-3 fill-current" />
              {rating.toFixed(1)}
            </span>
          ) : (
            <span />
          )}
          {meta && <span className="text-[10px] font-bold text-emerald-700">{meta}</span>}
        </div>
      </div>
    </div>
  )
);

const SectionTitle: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  open?: boolean;
  onToggle?: () => void;
}> = ({ icon, title, subtitle, action, open, onToggle }) => (
  <div
    className={`flex items-end justify-between gap-2 ${onToggle ? 'cursor-pointer select-none' : ''}`}
    {...(onToggle
      ? {
          role: 'button',
          tabIndex: 0,
          'aria-expanded': !!open,
          onClick: onToggle,
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') onToggle();
          },
        }
      : {})}
  >
    <div className="min-w-0">
      <h3 className="font-moul text-xs sm:text-sm text-white flex items-center gap-1.5 leading-[1.7] py-0.5">
        <span className="text-amber-400 shrink-0">{icon}</span>
        <span>{title}</span>
      </h3>
      {subtitle && <p className="text-[11px] text-slate-300 mt-0.5 font-khmer leading-[1.6]">{subtitle}</p>}
    </div>
    {action}
    {onToggle && (
      <ChevronDown className={`w-5 h-5 shrink-0 self-center text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`} />
    )}
  </div>
);


/** Clean collapsible info card: flat icon tile, clear title, simple chevron. */
const AccordionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  open?: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}> = ({ icon, title, subtitle, open, onToggle, children }) => (
  <section
    className={`rounded-2xl overflow-hidden border bg-slate-800/70 transition-colors ${
      open ? 'border-emerald-500/50' : 'border-white/10'
    }`}
  >
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!!open}
      className="w-full flex items-center gap-3 p-3.5 text-left cursor-pointer select-none focus:outline-none"
    >
      <span className="w-10 h-10 rounded-xl bg-emerald-700/25 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-300">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-khmer font-extrabold text-[15px] leading-[1.6] text-white break-words">{title}</span>
        {subtitle && (
          <span className="block mt-0.5 font-khmer text-[12px] leading-[1.6] text-slate-300 break-words">{subtitle}</span>
        )}
      </span>
      <ChevronDown className={`w-5 h-5 shrink-0 text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.75} />
    </button>
    {open && <div className="px-3 pb-3.5 space-y-2.5 border-t border-white/10 pt-3">{children}</div>}
  </section>
);

const TIP_CAT_STYLES: Record<string, { bar: string; tagBg: string; tagText: string }> = {
  dining: { bar: '#EA580C', tagBg: '#FFEDD5', tagText: '#9A3412' },
  money: { bar: '#059669', tagBg: '#D1FAE5', tagText: '#065F46' },
  culture: { bar: '#D97706', tagBg: '#FEF3C7', tagText: '#92400E' },
  safety: { bar: '#0369A1', tagBg: '#E0F2FE', tagText: '#075985' },
};

const HScroll: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="kft-hscroll -mx-3.5 px-3.5 sm:-mx-4 sm:px-4 flex gap-3 overflow-x-auto no-scrollbar snap-x scroll-pl-3.5 sm:scroll-pl-4 pb-1">{children}</div>
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
    className="w-full p-2.5 rounded-2xl bg-white border border-slate-200/90 flex items-center gap-3 text-left transition active:scale-[0.99] hover:border-emerald-400/60 cursor-pointer shadow-2xs"
  >
    <Thumb src={image} alt={title} className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-100" />
    <div className="min-w-0 flex-1">
      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 line-clamp-1 font-khmer">{title}</h4>
      <p className="text-[11px] text-slate-500 line-clamp-1 font-khmer">{subtitle}</p>
      <div className="flex items-center gap-2 mt-0.5">
        {typeof rating === 'number' && rating > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600">
            <Star className="w-3 h-3 fill-current" />
            {rating.toFixed(1)}
          </span>
        )}
        {badge && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
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
    pushNavigationStep,
    isRestoringHistoryRef,
    activeTab,
  } = useApp();

  const lang = language as Language;
  const isAdmin = isAdminAccount(currentUser);
  const isVip = isUserVipActive(currentUser);

  const [tab, setTabRaw] = useState<GuideTab>('foryou');
  const [mealOverride, setMealOverrideRaw] = useState<MealSlotId | null>(null);
  const [provinceKey, setProvinceKeyRaw] = useState<string>(() => stripProvincePrefix(selectedProvince));
  const [tipFilter, setTipFilterRaw] = useState<TipCategory | 'all'>('all');

  const recordGuideStep = (label?: string) => {
    if (isRestoringHistoryRef.current) return;
    const snap = { tab, mealOverride, provinceKey, tipFilter };
    pushNavigationStep({
      label: label || 'guide-step',
      restoreViewStep: () => {
        setTabRaw(snap.tab);
        setMealOverrideRaw(snap.mealOverride);
        setProvinceKeyRaw(snap.provinceKey);
        setTipFilterRaw(snap.tipFilter);
      },
    });
  };

  const setTab = (next: GuideTab) => {
    if (next !== tab) recordGuideStep('guide-tab:' + next);
    setTabRaw(next);
  };
  const setMealOverride = (next: MealSlotId | null) => {
    if (next !== mealOverride) recordGuideStep('guide-meal:' + String(next));
    setMealOverrideRaw(next);
  };
  const setProvinceKey = (next: string) => {
    if (next !== provinceKey) recordGuideStep('guide-prov:' + next);
    setProvinceKeyRaw(next);
  };
  const setTipFilter = (next: TipCategory | 'all') => {
    if (next !== tipFilter) recordGuideStep('guide-tip:' + next);
    setTipFilterRaw(next);
  };
  const [bigPhraseId, setBigPhraseId] = useState<string | null>(null);
  const [angkorGuideOpen, setAngkorGuideOpen] = useState<boolean>(false);
  const [angkorGuideTab, setAngkorGuideTab] = useState<AngkorGuideTab>('conduct');
  const [portCategoryFilter, setPortCategoryFilter] = useState<'all' | 'airport' | 'thailand' | 'vietnam' | 'laos_seaport'>('all');
  const [showAll25History, setShowAll25History] = useState<boolean>(false);
  const [showAll25Hospitals, setShowAll25Hospitals] = useState<boolean>(false);
  const [openSecs, setOpenSecs] = useState<Record<string, boolean>>({ tips: true });
  const toggleSec = useCallback((k: string) => setOpenSecs((p) => ({ ...p, [k]: !p[k] })), []);
  const portsSectionRef = useRef<HTMLElement | null>(null);
  const hospitalsSectionRef = useRef<HTMLElement | null>(null);
  const provAdminSectionRef = useRef<HTMLDivElement | null>(null);
  const guideContentStartRef = useRef<HTMLDivElement | null>(null);
  const mealPicksSectionRef = useRef<HTMLElement | null>(null);
  const provinceResultsRef = useRef<HTMLDivElement | null>(null);
  const tipResultsRef = useRef<HTMLUListElement | null>(null);

  const [scrollRequestTick, setScrollRequestTick] = useState<number>(0);
  const lastTargetRef = useRef<HTMLElement | null>(null);

  const scrollToGuideSection = (targetEl?: HTMLElement | null) => {
    lastTargetRef.current = targetEl || guideContentStartRef.current;
    setScrollRequestTick((prev) => prev + 1);
    smoothScrollToElement(targetEl || guideContentStartRef.current, {
      containerId: 'kft-main-scroll',
      targetId: targetEl?.id || 'kft-guide-content-section',
      offsetTop: 6,
      delayMs: 25,
    });
  };

  useEffect(() => {
    if (scrollRequestTick === 0 || isRestoringHistoryRef.current) return;
    const target = lastTargetRef.current || guideContentStartRef.current;
    smoothScrollToElement(target, {
      containerId: 'kft-main-scroll',
      targetId: target?.id || 'kft-guide-content-section',
      offsetTop: 6,
      delayMs: 25,
    });
  }, [scrollRequestTick]);

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
      destinations.filter((d) => d && d.categorySlug !== 'hotel').sort(
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
    for (const d of destinations) {
      if (d && d.categorySlug !== 'hotel') ensure(d.provinceKh, d.provinceEn)?.places.push(d);
    }
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
        image={resolveFoodPhotoUrl(f.photoUrl, f.photoUpdatedAt)}
        title={loc.name}
        subtitle={loc.category}
        rating={f.rating}
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
        customMedia={
          <ShopAvatar
            restaurant={r}
            alt={loc.name}
            className="w-full h-full rounded-none border-0"
          />
        }
        title={loc.name}
        subtitle={loc.province}
        rating={summary.hasReviews ? summary.averageRating : undefined}
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
    { id: 'foryou', icon: <Award className="w-4 h-4" />, label: tr(language, 'សម្រាប់អ្នក', 'For You', '为你推荐') },
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

  if (activeTab !== 'guide') return null;

  return (
    <div className="w-full max-w-6xl mx-auto bg-[#1E293B] text-slate-900 min-h-full font-khmer pb-12">
      {/* 1. Shared Master Hero Header with Angkor Wat Backdrop */}
      <AngkorHeroTopHeader mode="food" />

      {/* 2. Main Content Container rising smoothly from the Angkor Wat reflection into Dark Slate (#1E293B) */}
      <div className="relative z-20 -mt-[82px] px-2.5 min-[360px]:px-3.5 sm:px-5 space-y-3.5">
        {/* Compact Promotional Title Banner (Aligned Left) */}
        <div className="flex items-center justify-start pl-0.5 sm:pl-1">
          <div className="relative py-1 pl-1 pr-2 bg-transparent inline-flex items-center gap-2.5 max-w-[65%] min-w-0">
            <div
              style={{
                background: 'linear-gradient(180deg, #FDE047 0%, #F59E0B 100%)',
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.26), inset 0 1px 1px rgba(255, 255, 255, 0.65)',
              }}
              className="relative z-10 w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0"
            >
              <BookOpen className="w-4 h-4 text-[#042F2E]" strokeWidth={2.4} />
            </div>

            <span className="relative z-10 h-6 w-px bg-white/35 shrink-0" aria-hidden="true" />

            <div className="relative z-10 min-w-0">
              <h2
                className="font-khmer font-extrabold text-white leading-[1.65] py-0.5 break-words"
                style={{ fontSize: 'clamp(13.8px, 3.96vw, 16.2px)', textShadow: '0 1px 3px rgba(0, 0, 0, 0.65)' }}
              >
                {tr(language, 'មគ្គុទ្ទេសក៍ និងស្វែងយល់', 'Cambodia Guide & Discover', '柬埔寨旅游与美食指南')}
              </h2>
              <p
                className="font-khmer font-bold text-[#FDE68A] leading-[1.62] py-0.5 break-words"
                style={{ fontSize: 'clamp(11px, 3.12vw, 13.2px)', textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)' }}
              >
                {tr(
                  language,
                  'ជម្រើសម្ហូប ប្រតិទិនបុណ្យ និងគន្លឹះសំខាន់ៗ',
                  'Dish picks, festival calendar & travel tips',
                  '精选高棉美食、节庆日历与实用贴士'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Dark-Navy Glassmorphic Season & Meal Slot Status Card + 4 Premium 3D Gold-Framed Guide Section Buttons */}
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.84) 0%, rgba(15, 23, 42, 0.94) 100%)',
            boxShadow: '0 10px 28px rgba(15, 23, 42, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
          }}
          className="w-full max-w-full min-w-0 rounded-[24px] p-2 min-[360px]:p-2.5 sm:p-3.5 border border-amber-400/25 space-y-2.5"
        >
          <div className="px-1 pt-0.5 space-y-2">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="w-1 h-4 rounded-full bg-amber-400/80" />
              <span className="text-[13px] font-extrabold text-white leading-[1.6] truncate">
                {greeting}
                {firstName ? `, ${firstName}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/15 text-slate-200 text-[10px] font-bold">
                {season.emoji} {pickTri(season.name, lang)} • {pickTri(season.range, lang)}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-300/40 text-amber-200 text-[10px] font-bold">
                {activeSlot.emoji} {pickTri(MEAL_SLOTS.find((s) => s.id === currentSlotId)!.label, lang)}
              </span>
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden="true" />
          </div>

          <div
            role="tablist"
            aria-label={tr(language, 'ផ្នែកណែនាំ', 'Guide sections', '指南分区')}
            className="grid grid-cols-2 w-full max-w-[340px] mx-auto gap-2.5 sm:gap-3 items-stretch"
          >
            {[
              {
                id: 'foryou' as GuideTab,
                imageSrc: './categories/guide_cat_foryou.png',
                label: tr(language, 'សម្រាប់អ្នក', 'For You', '为你推荐'),
              },
              {
                id: 'provinces' as GuideTab,
                imageSrc: './categories/guide_cat_provinces.png',
                label: tr(language, 'ខេត្ត', 'Provinces', '省份'),
              },
              {
                id: 'calendar' as GuideTab,
                imageSrc: './categories/guide_cat_calendar.png',
                label: tr(language, 'ប្រតិទិន', 'Calendar', '日历'),
              },
              {
                id: 'tips' as GuideTab,
                imageSrc: './categories/guide_cat_tips.png',
                label: tr(language, 'គន្លឹះ', 'Tips', '实用'),
              },
            ].map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setTab(t.id);
                    scrollToGuideSection(guideContentStartRef.current);
                  }}
                  className={`kft-cat-btn group relative flex flex-col items-center justify-start w-full max-w-full min-w-0 overflow-visible px-2 pt-2 pb-1.5 rounded-[18px] border transition-all duration-150 cursor-pointer focus:outline-none select-none active:scale-[0.98] ${active ? 'bg-amber-400/10 border-amber-300/60 shadow-[0_4px_14px_rgba(0,0,0,0.3)]' : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07]'}`}
                >
                  {/* 3D Gold-Bordered Button Graphic */}
                  <div
                    className={`kft-cat-img-wrap relative w-full max-w-full min-w-0 min-h-0 aspect-[2.12/1] overflow-visible transition-all duration-200 rounded-[14px] ${active ? '' : 'opacity-90'}`}
                    style={{
                      transform: 'none',
                    }}
                  >
                    <img
                      src={`${t.imageSrc}?v=hq1623`}
                      alt={t.label}
                      loading="eager"
                      decoding="async"
                      draggable={false}
                      className="block w-full h-full max-w-full min-w-0 min-h-0 object-contain pointer-events-none select-none"
                    />
                  </div>

                  {/* Clear White Title Below Each Button */}
                  <span className={`kft-cat-label ${active ? 'kft-cat-label-active' : ''}`}>
                    {t.label}
                  </span>

                  {/* Subtle Gold Active Indicator Bar Below Title */}
                  <span
                      aria-hidden="true"
                      className={`mt-0.5 h-1 w-7 rounded-full transition-opacity duration-150 ${active ? 'opacity-100' : 'opacity-0'}`}
                      style={{
                        background: 'linear-gradient(90deg, #FDE047 0%, #F59E0B 100%)',
                        boxShadow: '0 0 6px rgba(250, 204, 21, 0.8)',
                      }}
                    />
                </button>
              );
            })}
          </div>
        </div>

      {/* Quick-Access Guide Directories: vertical tiles so every title is fully readable on phones */}
        <div data-testid="guide-rac-quick-links" className="grid grid-cols-3 gap-2">
          {[
            {
              key: 'prov',
              emoji: '🏛️',
              title: tr(language, 'ប្រវត្តិខេត្ត និងរដ្ឋបាល', 'Provincial History & Admin', '各省历史与行政机构'),
              sub: tr(language, '២៥ ខេត្ត-រាជធានី', '25 Provinces', '25省市'),
              tone: 'border-amber-400/40 text-amber-200 bg-amber-400/15',
              onClick: () => {
                setTab('provinces');
                setTimeout(() => scrollToGuideSection(provAdminSectionRef.current || guideContentStartRef.current), 40);
              },
            },
            {
              key: 'ports',
              emoji: '🛂',
              title: tr(language, 'ច្រកទ្វារព្រំដែនអន្តរជាតិ', 'International Border Ports', '国际口岸与机场指南'),
              sub: tr(language, 'ព្រំដែន អាកាស កំពង់ផែ', 'Borders, Air & Sea', '口岸·机场·海港'),
              tone: 'border-emerald-400/40 text-emerald-200 bg-emerald-400/15',
              onClick: () => {
                setTab('tips');
                setTipFilter('all');
                setOpenSecs((p) => ({ ...p, ports: true }));
                setTimeout(() => scrollToGuideSection(portsSectionRef.current || guideContentStartRef.current), 40);
              },
            },
            {
              key: 'hosp',
              emoji: '🏥',
              title: tr(language, 'មន្ទីរពេទ្យ និងសង្គ្រោះបន្ទាន់', 'Hospitals & Emergency', '各省医院与紧急救援'),
              sub: tr(language, 'បន្ទាន់ ២៤ ម៉ោង', '24/7 Hotlines', '24小时热线'),
              tone: 'border-rose-400/40 text-rose-200 bg-rose-500/20',
              onClick: () => {
                setTab('tips');
                setTipFilter('all');
                setOpenSecs((p) => ({ ...p, hosp: true }));
                setTimeout(() => scrollToGuideSection(hospitalsSectionRef.current || guideContentStartRef.current), 40);
              },
            },
          ].map((q) => (
            <button
              key={q.key}
              type="button"
              onClick={q.onClick}
              className={`min-w-0 px-1.5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border ${q.tone.split(' ')[0]} flex flex-col items-center text-center gap-1.5 shadow-sm active:scale-[0.97] transition cursor-pointer`}
            >
              <span className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xl shrink-0 ${q.tone}`}>
                {q.emoji}
              </span>
              <span className="block w-full text-[11px] font-extrabold text-white leading-snug line-clamp-2 min-h-[2.4em] break-words">
                {q.title}
              </span>
              <span className="block w-full text-[9.5px] font-semibold text-slate-300 leading-tight line-clamp-1">
                {q.sub}
              </span>
            </button>
          ))}
        </div>

        {/* Emergency numbers: always one tap away */}
        <div
          data-testid="guide-emergency-strip"
          className="rounded-2xl border border-rose-400/35 bg-rose-950/40 p-2.5 flex items-center gap-2"
        >
          <span className="text-[11px] font-extrabold text-rose-200 leading-snug shrink-0 max-w-[30%]">
            🚨 {tr(language, 'លេខបន្ទាន់', 'Emergency', '紧急电话')}
          </span>
          <div className="flex-1 grid grid-cols-3 gap-1.5">
            {[
              { n: '117', l: tr(language, 'ប៉ូលិស', 'Police', '警察'), cls: 'bg-blue-600 text-white' },
              { n: '118', l: tr(language, 'អគ្គិភ័យ', 'Fire', '消防'), cls: 'bg-orange-500 text-slate-950' },
              { n: '119', l: tr(language, 'ពេទ្យ', 'Ambulance', '急救'), cls: 'bg-rose-600 text-white' },
            ].map((x) => (
              <a
                key={x.n}
                href={`tel:${x.n}`}
                className={`h-10 rounded-xl flex flex-col items-center justify-center leading-none shadow active:scale-95 transition ${x.cls}`}
              >
                <span className="font-mono font-extrabold text-[14px]">{x.n}</span>
                <span className="text-[9px] font-bold mt-0.5">{x.l}</span>
              </a>
            ))}
          </div>
        </div>

      <div ref={guideContentStartRef} id="kft-guide-content-section" className="scroll-mt-2" />

      {/* ------------------------------------------------------------------ */}
      {/* FOR YOU                                                            */}
      {/* ------------------------------------------------------------------ */}
      {tab === 'foryou' && (
        <div className="space-y-5">
          {/* Saved / Favorites — Available by default to all users without login or VIP blocking */}
          <section data-testid="guide-favorites-section" className="space-y-2.5">
            <SectionTitle
              icon={<Heart className="w-4 h-4" />}
              title={tr(language, 'ចំណូលចិត្តរបស់អ្នក', 'Your saved picks', '我的收藏')}
              subtitle={
                savedCount > 0
                  ? tr(language, `${savedCount} ធាតុដែលអ្នកបានរក្សាទុក`, `${savedCount} items you saved`, `已收藏 ${savedCount} 项`)
                  : tr(
                      language,
                      'ចុចរូបបេះដូង ❤️ ដើម្បីរក្សាទុកម្ហូប និងតំបន់ទេសចរណ៍ដែលអ្នកចូលចិត្តភ្លាមៗ (ឥតគិតថ្លៃ)',
                      'Tap ❤️ to save your favorite food & tourism items anytime (Free)',
                      '随时点击 ❤️ 免费收藏您喜爱的美食与旅游景点'
                    )
              }
            />
            {savedCount > 0 ? (
              <HScroll>
                {savedFoods.slice(0, 6).map(renderFoodCard)}
                {savedPlaces.slice(0, 6).map(renderPlaceCard)}
                {savedShops.slice(0, 6).map(renderShopCard)}
              </HScroll>
            ) : (
              <HScroll>
                {rankedFoods.slice(0, 3).map(renderFoodCard)}
                {rankedDestinations.slice(0, 3).map(renderPlaceCard)}
              </HScroll>
            )}
          </section>

          {!isAdmin && (
            <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsAiTripPlannerModalOpen(true)}
                className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-2.5 text-left transition active:scale-[0.98] cursor-pointer"
              >
                <span className="w-9 h-9 rounded-xl bg-[#064E3B] text-amber-300 flex items-center justify-center shrink-0">
                  <Route className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold text-slate-900 leading-[1.62] break-words">
                    {tr(language, 'ផែនការដើរលេង AI', 'AI Trip Planner', 'AI 行程规划')}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>{tr(language, 'បើកភ្លាមៗ • FREE', 'Open now • FREE', '免费使用')}</span>
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  openNearMeModal(setIsNearMeModalOpen, { tab: 'restaurants' });
                }}
                className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-2.5 text-left transition active:scale-[0.98] cursor-pointer"
              >
                <span className="w-9 h-9 rounded-xl bg-[#064E3B] text-amber-300 flex items-center justify-center shrink-0">
                  <Navigation className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-extrabold text-slate-900 leading-[1.62] break-words">
                    {tr(language, 'នៅជិតខ្ញុំ', 'Near Me', '附近')}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>{tr(language, 'តាម GPS • FREE', 'Using GPS • FREE', '免费定位')}</span>
                  </span>
                </span>
              </button>
            </div>
          )}

          {/* Time-aware meal picks */}
          <section ref={mealPicksSectionRef} className="space-y-2.5 scroll-mt-2">
            <SectionTitle
              icon={<Utensils className="w-4 h-4" />}
              title={tr(language, 'ញ៉ាំអ្វីល្អឥឡូវនេះ?', 'What to eat right now', '现在吃什么')}
              subtitle={pickTri(activeSlot.hint, lang)}
            />
            <div className="kft-hscroll flex gap-1.5 overflow-x-auto no-scrollbar -mx-3.5 px-3.5 sm:-mx-4 sm:px-4 py-0.5">
              {MEAL_SLOTS.map((s) => {
                const active = s.id === activeSlot.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setMealOverride(s.id);
                      scrollToGuideSection(mealPicksSectionRef.current);
                    }}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition cursor-pointer ${
                      active
                        ? 'bg-emerald-700 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200'
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
              <p className="text-[11px] text-slate-500">
                {tr(language, 'មិនទាន់មានម្ហូបសម្រាប់ពេលនេះទេ', 'No dishes available for this time yet.', '该时段暂无菜品。')}
              </p>
            )}
          </section>

          {/* Dishes you may love */}
          {dishRecs.items.length > 0 && (
            <section className="space-y-2.5">
              <SectionTitle
                icon={<Award className="w-4 h-4" />}
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
                    className="px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-300/40 text-[11px] font-extrabold text-amber-200 hover:bg-amber-400/25 shrink-0 cursor-pointer transition"
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
                    className="px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-300/40 text-[11px] font-extrabold text-amber-200 hover:bg-amber-400/25 shrink-0 cursor-pointer transition"
                  >
                    {tr(language, 'មើលទាំងអស់', 'See all', '查看全部')}
                  </button>
                }
              />
              <HScroll>{placeRecs.items.map(renderPlaceCard)}</HScroll>
            </section>
          )}

          {/* Recommended shops */}
          {featuredShops.length > 0 && (
            <section className="space-y-2.5">
              <SectionTitle
                icon={<Store className="w-4 h-4" />}
                title={tr(language, 'ហាងអាហារដែលគួរទៅសាក', 'Recommended shops worth a visit', '值得一去的推荐餐厅')}
                subtitle={tr(language, 'ហាង VIP ដែលកំពុងបង្ហាញមុខគេនៅខាងមុខ', 'Currently featured VIP shops appear first', '当前置顶的 VIP 店铺优先展示')}
                action={
                  <button
                    type="button"
                    onClick={() => setActiveTab('restaurants')}
                    className="px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-300/40 text-[11px] font-extrabold text-amber-200 hover:bg-amber-400/25 shrink-0 cursor-pointer transition"
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
              <div className="kft-hscroll flex gap-1.5 overflow-x-auto no-scrollbar -mx-3.5 px-3.5 sm:-mx-4 sm:px-4 py-0.5">
                {provinceGroups.map((g) => {
                  const active = activeGroup?.key === g.key;
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => {
                        setProvinceKey(g.key);
                        scrollToGuideSection(provinceResultsRef.current || guideContentStartRef.current);
                      }}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition cursor-pointer ${
                        active
                          ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {provinceName(g)}
                      <span className="ml-1 opacity-70">{g.places.length + g.shops.length}</span>
                    </button>
                  );
                })}
              </div>

              {activeGroup && (
                <div ref={provinceResultsRef} className="space-y-4 min-h-[82vh] scroll-mt-2">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-moul text-sm text-[#064E3B] leading-[1.7] py-0.5 break-words">{provinceName(activeGroup)}</h3>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-[1.55]">
                        {tr(
                          language,
                          `${activeGroup.places.length} កន្លែងទេសចរណ៍ • ${activeGroup.shops.length} ហាងអាហារ`,
                          `${activeGroup.places.length} places • ${activeGroup.shops.length} shops`,
                          `${activeGroup.places.length} 个景点 • ${activeGroup.shops.length} 家餐厅`
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Provincial History, Administration & Referral Hospital Card (No External Copyrighted Photos) */}
                  {(() => {
                    const adminInfo = findProvinceAdminHistory(activeGroup.key);
                    return (
                      <div
                        ref={provAdminSectionRef}
                        id="kft-guide-prov-admin"
                        data-testid="guide-province-history-admin"
                        className="p-4 rounded-2xl bg-white border border-emerald-200/90 shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-base shrink-0">
                              🏛️
                            </span>
                            <div>
                              <h4 className="text-xs sm:text-sm font-extrabold text-[#064E3B]">
                                {tr(language, 'ប្រវត្តិខេត្ត និងរដ្ឋបាលខេត្ត', 'Provincial History & Administration', '省份历史与行政概况')}
                              </h4>
                              <p className="text-[11px] text-slate-500 font-semibold">
                                {pickTri(adminInfo.provinceName, lang)} • {pickTri(adminInfo.capitalCity, lang)}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowAll25History((v) => !v)}
                            className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-extrabold cursor-pointer transition"
                          >
                            {showAll25History
                              ? tr(language, 'បង្រួមបញ្ជី ២៥ ខេត្ត', 'Hide All 25 Provinces', '收起全部25省市')
                              : tr(language, 'មើលប្រវត្តិទាំង ២៥ ខេត្ត-រាជធានី', 'View All 25 Provinces', '查看全部25省市历史')}
                          </button>
                        </div>

                        {/* Historical Summary */}
                        <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1">
                          <p className="text-[11px] font-extrabold text-emerald-900">
                            📜 {tr(language, 'ប្រវត្តិសង្ខេប និងសក្ដានុពលទេសចរណ៍៖', 'Historical & Cultural Overview:', '历史背景与旅游特色：')}
                          </p>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {pickTri(adminInfo.historySummary, lang)}
                          </p>
                        </div>

                        {/* Administrative Hall & Districts */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
                            <p className="font-extrabold text-slate-900">
                              📍 {tr(language, 'ទីតាំងរដ្ឋបាលខេត្ត៖', 'Administrative Location:', '省政府驻地：')}
                            </p>
                            <p className="text-slate-600 leading-relaxed">
                              {pickTri(adminInfo.adminLocation, lang)}
                            </p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
                            <p className="font-extrabold text-slate-900">
                              🗺️ {tr(language, 'រដ្ឋបាលក្រុង/ស្រុក/ខណ្ឌ៖', 'Municipalities & Districts:', '下辖市县行政区划：')}
                            </p>
                            <p className="text-slate-600 leading-relaxed">
                              {pickTri(adminInfo.districtsSummary, lang)}
                            </p>
                          </div>
                        </div>

                        {/* Provincial Referral Hospital & Emergency Bar */}
                        <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="text-xs font-extrabold text-rose-900 flex items-center gap-1.5">
                              <span>🏥</span>
                              <span>{pickTri(adminInfo.hospitalName, lang)}</span>
                            </p>
                            <p className="text-[11px] text-rose-700 leading-snug">
                              {pickTri(adminInfo.hospitalAddress, lang)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={`tel:${adminInfo.hospitalPhone}`}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono font-extrabold text-xs inline-flex items-center gap-1 shadow-xs"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>{adminInfo.hospitalPhone}</span>
                            </a>
                            <a
                              href="tel:119"
                              className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono font-extrabold text-xs inline-flex items-center gap-1 shadow-xs"
                            >
                              <span>🚑 119</span>
                            </a>
                          </div>
                        </div>

                        {/* Optional Expanded Directory of All 25 Provinces */}
                        {showAll25History && (
                          <div className="pt-2 border-t border-slate-200 space-y-2">
                            <h5 className="text-xs font-extrabold text-slate-900">
                              {tr(language, '📚 បញ្ជីប្រវត្តិសង្ខេប និងរដ្ឋបាលទាំង ២៥ ខេត្ត-រាជធានី', '📚 All 25 Provinces History & Administration Directory', '📚 柬埔寨全国25省市历史与行政名录')}
                            </h5>
                            <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                              {PROVINCIAL_ADMIN_HISTORY_HOSPITALS.map((item) => (
                                <div key={item.key} className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1 text-xs">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="font-extrabold text-[#064E3B] text-xs sm:text-sm">
                                      🏛️ {pickTri(item.provinceName, lang)} ({pickTri(item.capitalCity, lang)})
                                    </span>
                                    <a
                                      href={`tel:${item.hospitalPhone}`}
                                      className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 font-mono font-bold text-[11px]"
                                    >
                                      🏥 {item.hospitalPhone}
                                    </a>
                                  </div>
                                  <p className="text-slate-700 leading-relaxed">{pickTri(item.historySummary, lang)}</p>
                                  <p className="text-[11px] text-slate-500">
                                    <span className="font-bold text-slate-700">{tr(language, 'រដ្ឋបាល៖ ', 'Admin: ', '行政驻地：')}</span>
                                    {pickTri(item.adminLocation, lang)} • {pickTri(item.districtsSummary, lang)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {groupPlaces.length > 0 && (
                    <section className="space-y-2">
                      <SectionTitle
                        icon={<Compass className="w-4 h-4" />}
                        title={tr(language, 'កន្លែងគួរទៅលេង', 'Places to visit', '值得一游')}
                        action={
                          <button
                            type="button"
                            onClick={() => goToProvince(activeGroup.key, 'tourism')}
                            className="px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-300/40 text-[11px] font-extrabold text-amber-200 hover:bg-amber-400/25 shrink-0 cursor-pointer transition"
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
                            className="px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-300/40 text-[11px] font-extrabold text-amber-200 hover:bg-amber-400/25 shrink-0 cursor-pointer transition"
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
          <section className="p-4 rounded-3xl bg-white border border-slate-200/90 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-moul text-xs sm:text-sm text-[#0F172A]">
                {season.emoji} {pickTri(season.name, lang)}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                {pickTri(season.range, lang)}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">{pickTri(season.tip, lang)}</p>
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
                    className="p-3 rounded-2xl bg-white border border-slate-200/90 flex items-start gap-3"
                  >
                    <span className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl shrink-0">
                      {s.emoji}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold text-slate-900">{pickTri(s.name, lang)}</h4>
                      <p className="text-[11px] text-slate-500 leading-snug">{pickTri(s.note, lang)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2.5">
            <SectionTitle
              icon={<CalendarDays className="w-4 h-4" />}
              title={tr(language, 'បុណ្យជាតិ & ពិធីបុណ្យផ្លូវការនៅកម្ពុជា', 'Cambodian Public Holidays & Festivals', '柬埔寨公共假日与传统节庆')}
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
                      ? 'bg-rose-50 border-rose-400 shadow-sm'
                      : idx === 0
                      ? 'bg-amber-50 border-amber-300/80 shadow-xs'
                      : 'bg-white border-slate-200/90'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 shrink-0 text-center p-1.5 rounded-2xl bg-emerald-50 border border-emerald-200/60">
                      <div className="text-2xl leading-none">{f.emoji}</div>
                      <div className="mt-1 text-[10px] font-black text-[#064E3B]">{monthLabel(f.month, lang)}</div>
                      <div className="text-[9px] font-bold text-slate-500">{f.activeYear}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                          {pickTri(f.name, lang)}
                        </h4>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                            f.isOngoingToday
                              ? 'bg-rose-600 text-white'
                              : idx === 0
                              ? 'bg-amber-400 text-slate-950 shadow-2xs'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {pickTri(f.countdownBadge, lang)}
                        </span>
                      </div>

                      <p className="text-[11px] font-bold text-[#064E3B] mt-1">
                        📅 {pickTri(f.formattedDateRange, lang)}
                      </p>

                      {/* Explicit Duration Pill */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200">
                          <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{tr(language, 'រយៈពេល៖', 'Duration:', '时长：')} {pickTri(f.durationLabel, lang)}</span>
                        </span>
                      </div>

                      <p className="text-[11px] sm:text-xs text-slate-700 mt-2 leading-relaxed">{toConciseSummary(pickTri(f.about, lang), lang)}</p>
                    </div>
                  </div>
                  <div className="text-[11px] leading-snug">
                    <p className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900">
                      🍽️ <span className="font-bold">{tr(language, 'ម្ហូបប្រចាំពិធី៖', 'Festival Foods:', '节日美食：')}</span> {pickTri(f.foods, lang)}
                    </p>
                  </div>
                  {/* Tappable real dishes from the catalog (only for festivals that have a curated collection) */}
                  <FestivalDishRow
                    language={language}
                    dishes={resolveFestivalFoods(f.id, foods)}
                    onOpenFood={setSelectedFood}
                    variant="chip"
                  />
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
          {/* Official APSARA Visitor Code of Conduct & Angkor Park Guide */}
          <section className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 border-2 border-amber-400/40 space-y-3 shadow-md">
            <AngkorParkQuickBar
              language={language}
              onOpenTab={(t) => {
                setAngkorGuideTab(t);
                setAngkorGuideOpen(true);
              }}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {ANGKOR_CODE_OF_CONDUCT.map((rule) => {
                const isDo = rule.type === 'do';
                return (
                  <div
                    key={rule.id}
                    className={`p-2.5 rounded-2xl border flex items-start gap-2.5 ${
                      isDo
                        ? 'bg-emerald-900/45 border-emerald-400/35'
                        : 'bg-rose-950/55 border-rose-400/35'
                    }`}
                  >
                    <span className="w-8 h-8 rounded-xl bg-black/30 flex items-center justify-center text-base shrink-0">
                      {rule.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-khmer font-extrabold text-xs text-white leading-[1.55] break-words">
                        {tr(language, rule.titleKh, rule.titleEn, rule.titleZh)}
                      </h4>
                      <p className="text-[11px] font-khmer text-slate-200 leading-[1.55] mt-0.5 break-words">
                        {tr(language, rule.detailKh, rule.detailEn, rule.detailZh)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          {/* Dedicated Police & Emergency Contacts Section */}
          {(tipFilter === 'all' || tipFilter === 'safety') && (
            <section className="p-4 rounded-3xl bg-gradient-to-br from-rose-50 via-amber-50/70 to-white border-2 border-rose-300 space-y-3 shadow-xs">
              <div role="button" tabIndex={0} onClick={() => toggleSec('police')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSec('police'); }} aria-expanded={!!openSecs.police} className="flex items-center justify-between gap-2 cursor-pointer">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-moul text-xs sm:text-sm text-rose-900 leading-[1.7] py-0.5 break-words">
                      {tr(language, '🚨 លេខទូរស័ព្ទប៉ូលីស & សង្គ្រោះបន្ទាន់ (24 ម៉ោង)', '🚨 Police & Emergency Hotlines (24/7)', '🚨 柬埔寨警察与紧急救援电话（24小时）')}
                    </h3>
                    <p className="text-[10px] text-rose-700 leading-[1.55] break-words">
                      {tr(language, 'ចុចលើលេខទូរស័ព្ទខាងក្រោមដើម្បីហៅចេញភ្លាមៗក្នុងករណីមានអាសន្ន', 'Tap any emergency number below to dial immediately', '遇到紧急情况请点击下方号码直接拨打')}
                    </p>
                  </div>
                </div>
<ChevronDown className={`w-5 h-5 shrink-0 transition-transform text-rose-700 ${openSecs.police ? 'rotate-180' : ''}`} />
              </div>

{openSecs.police && (<>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EMERGENCY_CONTACTS.map((ec) => (
                  <div
                    key={ec.id}
                    className="p-2.5 rounded-2xl bg-white border border-rose-200/80 flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-lg shrink-0">
                        {ec.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-extrabold text-slate-900 leading-[1.6] break-words">
                          {pickTri(ec.name, lang)}
                        </h4>
                        <p className="text-[10px] text-slate-500 leading-[1.55] break-words">
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
</>)}
            </section>
          )}

          {/* Provincial Hospitals & Emergency Services Near Tourist Destinations (All 25 Provinces) */}
          <section
            ref={hospitalsSectionRef}
            id="kft-guide-hospitals-section"
            data-testid="guide-hospitals-emergency-section"
            className="p-4 rounded-3xl bg-white border-2 border-rose-200/90 space-y-3 shadow-xs scroll-mt-2"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div role="button" tabIndex={0} onClick={() => toggleSec('hosp')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSec('hosp'); }} aria-expanded={!!openSecs.hosp} className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1 cursor-pointer">
                <span className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-lg shrink-0">
                  🏥
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-moul text-xs sm:text-sm text-rose-900 leading-[1.7] py-0.5 break-words">
                    {tr(
                      language,
                      '🏥 មន្ទីរពេទ្យបង្អែក និងសេវាសង្គ្រោះបន្ទាន់តាមខេត្ត-រាជធានី',
                      '🏥 Provincial Referral Hospitals & Tourist Emergency Services',
                      '🏥 各省转诊医院与景区周边紧急医疗救援'
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-[1.55]">
                    {tr(
                      language,
                      'ទីតាំងមន្ទីរពេទ្យបង្អែក និងលេខទូរស័ព្ទសង្គ្រោះបន្ទាន់នៅក្បែរតំបន់ទេសចរណ៍ទូទាំងប្រទេស',
                      'Locations and direct emergency numbers of referral hospitals near major tourist hubs',
                      '全国各省主要景区周边的省级转诊医院位置与一键拨号'
                    )}
                  </p>
                </div>
<ChevronDown className={`w-5 h-5 shrink-0 transition-transform text-rose-700 self-center ${openSecs.hosp ? 'rotate-180' : ''}`} />
              </div>

            </div>

{openSecs.hosp && (<>
<div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowAll25Hospitals((v) => !v)}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-extrabold cursor-pointer transition"
              >
                {showAll25Hospitals
                  ? tr(language, 'បង្ហាញខេត្តសំខាន់ៗ', 'Show Major Hubs', '仅显示重点旅游省市')
                  : tr(language, `មើលទាំង ${PROVINCIAL_ADMIN_HISTORY_HOSPITALS.length} ខេត្ត-រាជធានី`, `View All ${PROVINCIAL_ADMIN_HISTORY_HOSPITALS.length} Provinces`, `查看全部 ${PROVINCIAL_ADMIN_HISTORY_HOSPITALS.length} 省市医院`)}
              </button>
</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(showAll25Hospitals ? PROVINCIAL_ADMIN_HISTORY_HOSPITALS : PROVINCIAL_ADMIN_HISTORY_HOSPITALS.slice(0, 8)).map((h) => (
                <div
                  key={h.key}
                  className="p-3 rounded-2xl bg-rose-50/40 border border-rose-200/80 flex flex-col justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 font-extrabold text-[10.5px]">
                        📍 {pickTri(h.provinceName, lang)}
                      </span>
                      <span className="text-[10.5px] font-bold text-slate-500">
                        🚑 119 • 🚓 {h.policePhone}
                      </span>
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-900 leading-snug">
                      {pickTri(h.hospitalName, lang)}
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {pickTri(h.hospitalAddress, lang)}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-rose-100">
                    <a
                      href={`tel:${h.hospitalPhone}`}
                      className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono font-extrabold text-xs inline-flex items-center gap-1 shadow-xs"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>{h.hospitalPhone}</span>
                    </a>
                    <a
                      href="tel:119"
                      className="px-2.5 py-1 rounded-xl bg-slate-900 text-white font-mono font-extrabold text-xs inline-flex items-center gap-1"
                    >
                      <span>119</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
</>)}
          </section>

          {/* International Border Checkpoints, Airports & Seaports Directory (Zero External Photos) */}
          <section
            ref={portsSectionRef}
            id="kft-guide-international-ports"
            data-testid="guide-international-ports-section"
            className="p-4 rounded-3xl bg-white border-2 border-emerald-200/90 space-y-3 shadow-xs scroll-mt-2"
          >
            <div role="button" tabIndex={0} onClick={() => toggleSec('ports')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSec('ports'); }} aria-expanded={!!openSecs.ports} className="flex items-center gap-2.5 cursor-pointer">
              <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg shrink-0">
                🛂
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-moul text-xs sm:text-sm text-[#064E3B] leading-[1.7] py-0.5 break-words">
                  {tr(
                    language,
                    '🛂 ច្រកទ្វារព្រំដែនអន្តរជាតិ និងអាកាសយានដ្ឋានអន្តរជាតិ',
                    '🛂 International Border Ports, Airports & Seaports',
                    '🛂 柬埔寨国际边境口岸、国际机场与海港指南'
                  )}
                </h3>
                <p className="text-[11px] text-slate-600 leading-[1.55]">
                  {tr(
                    language,
                    'ព័ត៌មានច្រកទ្វារព្រំដែនអន្តរជាតិ ម៉ោងធ្វើការ សេវាទិដ្ឋាការ (Visa) និងផ្លូវធ្វើដំណើរសម្រាប់ភ្ញៀវទេសចរជាតិ និងអន្តរជាតិ',
                    'Official international entry/exit checkpoints, operating hours, Visa on Arrival / e-Visa & highway routes',
                    '面向国内外游客的国际出入境口岸、开放时间、落地签/电子签及国道交通路线'
                  )}
                </p>
              </div>
<ChevronDown className={`w-5 h-5 shrink-0 transition-transform text-emerald-800 ${openSecs.ports ? 'rotate-180' : ''}`} />
            </div>

{openSecs.ports && (<>
            {/* Category Filter Pills */}
            <div className="kft-hscroll flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'all' as const, label: tr(language, `ទាំងអស់ (${INTERNATIONAL_PORTS_DATA.length})`, `All Ports (${INTERNATIONAL_PORTS_DATA.length})`, `全部口岸 (${INTERNATIONAL_PORTS_DATA.length})`) },
                { id: 'airport' as const, label: tr(language, '✈️ អាកាសយានដ្ឋានអន្តរជាតិ', '✈️ International Airports', '✈️ 国际机场') },
                { id: 'thailand' as const, label: tr(language, '🇹🇭 ព្រំដែនកម្ពុជា–ថៃ', '🇹🇭 Cambodia–Thailand', '🇹🇭 柬泰边境口岸') },
                { id: 'vietnam' as const, label: tr(language, '🇻🇳 ព្រំដែនកម្ពុជា–វៀតណាម', '🇻🇳 Cambodia–Vietnam', '🇻🇳 柬越边境口岸') },
                { id: 'laos_seaport' as const, label: tr(language, '🇱🇦 ព្រំដែនឡាវ & កំពង់ផែសមុទ្រ', '🇱🇦 Laos Border & Seaports', '🇱🇦 柬老口岸与国际海港') },
              ].map((catBtn) => {
                const active = portCategoryFilter === catBtn.id;
                return (
                  <button
                    key={catBtn.id}
                    type="button"
                    onClick={() => setPortCategoryFilter(catBtn.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-extrabold whitespace-nowrap border transition cursor-pointer ${
                      active
                        ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {catBtn.label}
                  </button>
                );
              })}
            </div>

            {/* Ports Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {INTERNATIONAL_PORTS_DATA.filter((p) => portCategoryFilter === 'all' || p.category === portCategoryFilter).map((port) => (
                <div
                  key={port.id}
                  className="p-3 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-[#064E3B] text-amber-300 font-extrabold text-[10.5px]">
                      {port.badge}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-emerald-900 font-bold text-[10.5px]">
                      🕒 {port.hours}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug">
                    {pickTri(port.name, lang)}
                  </h4>

                  <p className="text-[11px] text-emerald-800 font-bold">
                    📍 {pickTri(port.province, lang)}
                  </p>

                  <div className="space-y-1 text-[11px] text-slate-700 pt-1 border-t border-emerald-200/60">
                    <p>
                      <span className="font-bold text-slate-900">{tr(language, 'តភ្ជាប់ទៅ៖ ', 'Connects to: ', '连接方向：')}</span>
                      {pickTri(port.connectsTo, lang)}
                    </p>
                    <p>
                      <span className="font-bold text-slate-900">{tr(language, 'ផ្លូវធ្វើដំណើរ៖ ', 'Route: ', '交通路线：')}</span>
                      {pickTri(port.routeInfo, lang)}
                    </p>
                    <p className="text-emerald-900 bg-white/80 px-2 py-1 rounded-lg border border-emerald-200/70">
                      ✅ {pickTri(port.visaAndServices, lang)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
</>)}
          </section>


          <AccordionCard open={!!openSecs.tips} onToggle={() => toggleSec('tips')} icon={<Compass className="w-5 h-5" strokeWidth={1.75} />}
              title={tr(language, `គន្លឹះដំណើរកម្សាន្ត & ញ៉ាំអាហារ (${GUIDE_TIPS.length} គន្លឹះ)`, `Travel & dining tips (${GUIDE_TIPS.length} tips)`, `旅行与用餐实用贴士（共 ${GUIDE_TIPS.length} 条）`)}
            >

            <div className="kft-hscroll flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 py-1">
              {TIP_CATEGORIES.map((c) => {
                const active = tipFilter === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setTipFilter(c.id);
                      scrollToGuideSection(tipResultsRef.current || guideContentStartRef.current);
                    }}
                    style={
                      active
                        ? { background: '#F59E0B' }
                        : { background: 'rgba(255,255,255,0.08)' }
                    }
                    className={`shrink-0 min-h-[38px] px-3.5 py-1.5 rounded-full font-khmer text-[12.5px] font-extrabold whitespace-nowrap border transition active:scale-95 cursor-pointer ${
                      active ? 'text-slate-950 border-amber-200' : 'text-slate-100 border-white/15 hover:border-amber-300/60'
                    }`}
                  >
                    {pickTri(c.label, lang)}
                  </button>
                );
              })}
            </div>
            <ul ref={tipResultsRef} className="space-y-2.5 min-h-[60vh] scroll-mt-2">
              {visibleTips.map((t) => {
                const isEmergency = t.id === 'emergency-police-hotlines';
                const cs = TIP_CAT_STYLES[t.category] || TIP_CAT_STYLES.culture;
                const cat = TIP_CATEGORIES.find((c) => c.id === t.category);
                return (
                  <li
                    key={t.id}
                    className="relative rounded-2xl overflow-hidden flex items-start gap-3 py-3 pr-3 pl-4 border"
                    style={
                      isEmergency
                        ? { background: '#FFF1F2', borderColor: '#FDA4AF' }
                        : { background: '#FFFFFF', borderColor: 'rgba(226,232,240,0.9)' }
                    }
                  >
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-0 bottom-0 w-1.5"
                      style={{ background: isEmergency ? '#BE123C' : cs.bar }}
                    />
                    <div className="min-w-0 flex-1">
                      {cat && (
                        <span
                          className="inline-block mb-1 px-2 py-0.5 rounded-full text-[10.5px] font-extrabold font-khmer leading-[1.5]"
                          style={{ background: isEmergency ? '#FFE4E6' : cs.tagBg, color: isEmergency ? '#9F1239' : cs.tagText }}
                        >
                          {pickTri(cat.label, lang)}
                        </span>
                      )}
                      <h4 className={`font-khmer text-[14px] sm:text-[15px] font-extrabold leading-[1.6] break-words ${isEmergency ? 'text-rose-900' : 'text-slate-900'}`}>
                        {pickTri(t.title, lang)}
                      </h4>
                      <p className={`font-khmer text-[12.5px] sm:text-[13px] leading-[1.7] mt-0.5 break-words ${isEmergency ? 'text-rose-800' : 'text-slate-600'}`}>
                        {toConciseSummary(pickTri(t.body, lang), lang)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            </AccordionCard>

          <AccordionCard open={!!openSecs.phrases} onToggle={() => toggleSec('phrases')} icon={<BookOpen className="w-5 h-5" strokeWidth={1.75} />}
              title={tr(language, 'ឃ្លាខ្មែរចាំបាច់', 'Khmer phrasebook', '高棉语常用语')}
              subtitle={tr(
                language,
                'ចុចចម្លង ឬបង្ហាញអក្សរធំដល់អ្នកលក់',
                'Copy a phrase or show it in big text to the vendor',
                '可复制短语，或放大文字展示给店家'
              )}
            >

            <ul className="space-y-2">
              {PHRASES.map((p) => (
                <li
                  key={p.id}
                  className="p-3 rounded-2xl bg-white border border-slate-200/90 flex items-center gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-[#064E3B] font-khmer leading-snug">{p.khmer}</p>
                    <p className="text-[10px] italic text-slate-500">{p.roman}</p>
                    <p className="text-[11px] text-slate-700 mt-0.5">
                      {lang === 'zh' ? p.zh : p.en}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBigPhraseId(p.id)}
                    aria-label={tr(language, 'បង្ហាញអក្សរធំ', 'Show in big text', '放大显示')}
                    className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 active:scale-90 transition cursor-pointer"
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
            </AccordionCard>

          {/* 1. UNESCO World Heritage & Intangible Heritage of Cambodia */}
          <AccordionCard open={!!openSecs.unesco} onToggle={() => toggleSec('unesco')} icon={<Award className="w-5 h-5" strokeWidth={1.75} />}
              title={tr(language, 'បេតិកភណ្ឌពិភពលោក UNESCO របស់កម្ពុជា', 'Cambodia UNESCO World Heritage', '柬埔寨联合国教科文组织世界遗产')}
              subtitle={tr(
                language,
                'សម្បត្តិបេតិកភណ្ឌរូបី និងអរូបីនៃមនុស្សជាតិដែលពិភពលោកទទួលស្គាល់',
                'Inscribed World Heritage monuments & Intangible Cultural Masterpieces',
                '列入世界遗产名录的古迹遗址与人类非物质文化遗产代表作'
              )}
            >

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CAMBODIA_UNESCO_HERITAGE_LIST.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5 text-slate-900"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300/70">
                      {item.badge}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700">
                      {item.kind === 'tangible'
                        ? tr(language, 'បេតិកភណ្ឌរូបី', 'World Heritage Site', '世界文化遗产')
                        : tr(language, 'បេតិកភណ្ឌអរូបី', 'Intangible Heritage', '人类非物质文化遗产')}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                    {pickTri(item.title, lang)}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                    {pickTri(item.summary, lang)}
                  </p>
                </div>
              ))}
            </div>
            </AccordionCard>

          {/* 2. National Symbols, Flora & Rare Wildlife of Cambodia */}
          <AccordionCard open={!!openSecs.symbols} onToggle={() => toggleSec('symbols')} icon={<MapPinned className="w-5 h-5" strokeWidth={1.75} />}
              title={tr(language, 'និមិត្តរូបជាតិ រុក្ខជាតិ និងសត្វព្រៃកម្រនៅកម្ពុជា', 'National Symbols, Flora & Wildlife', '柬埔寨国家象征与珍稀动植物')}
              subtitle={tr(
                language,
                'អត្តសញ្ញាណធម្មជាតិជាតិ និងសត្វកម្រដែលភ្ញៀវទេសចរគួរស្វែងយល់',
                'Official national flora, fauna, and iconic Mekong wildlife',
                '官方认定的国花、国树、国兽与湄公河珍稀生态物种'
              )}
            >

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CAMBODIA_NATIONAL_SYMBOLS_AND_WILDLIFE.map((sym) => (
                <div
                  key={sym.id}
                  className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-start gap-2.5 text-slate-900"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wide">
                      {pickTri(sym.category, lang)}
                    </span>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                      {pickTri(sym.name, lang)}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed mt-0.5">
                      {pickTri(sym.desc, lang)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            </AccordionCard>

          {/* 3. Domestic Travel Routes: Expressway, Railways, Speed Ferries & Flights */}
          <AccordionCard open={!!openSecs.transport} onToggle={() => toggleSec('transport')} icon={<Route className="w-5 h-5" strokeWidth={1.75} />}
              title={tr(language, 'មធ្យោបាយធ្វើដំណើរក្នុងស្រុក (ផ្លូវល្បឿនលឿន រថភ្លើង និងទូក)', 'Domestic Travel Routes (Expressway, Rail & Ferry)', '柬埔寨境内交通指南（高速、火车与快艇）')}
              subtitle={tr(
                language,
                'ផ្លូវធ្វើដំណើរសំខាន់ៗសម្រាប់ភ្ញៀវទេសចរឆ្លងរាជធានី-ខេត្ត និងទៅកាន់កោះ',
                'Key inter-provincial highways, passenger trains, island speedboats & flights',
                '连接各省市与海岛的高速公路、客运铁路、快艇及国内航线'
              )}
            >

            <ul className="space-y-2">
              {CAMBODIA_DOMESTIC_TRANSPORT_ROUTES.map((rt) => (
                <li
                  key={rt.id}
                  className="p-3 rounded-2xl bg-white border border-slate-200/90 flex items-start gap-2.5 text-slate-900"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                      {pickTri(rt.title, lang)}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed mt-0.5">
                      {pickTri(rt.detail, lang)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            </AccordionCard>

          {/* 4. Cambodia Fast Facts ("Did You Know?") */}
          <AccordionCard open={!!openSecs.facts} onToggle={() => toggleSec('facts')} icon={<Star className="w-5 h-5" strokeWidth={1.75} />}
              title={tr(language, 'តើអ្នកដឹងទេ? កំណត់ត្រាពិភពលោក និងការពិតអំពីកម្ពុជា', 'Did You Know? Amazing Facts About Cambodia', '趣味百科：关于柬埔寨的世界纪录与冷知识')}
              subtitle={tr(
                language,
                'ចំណេះដឹងគួរឱ្យស្ញប់ស្ញែងអំពីប្រទេសកម្ពុជាដែលភ្ញៀវទេសចរទូទាំងពិភពលោកចាប់អារម្មណ៍',
                'World records and remarkable natural & historical facts of the Kingdom of Wonder',
                '令全球游客赞叹的高棉历史奇迹与自然奇观'
              )}
            >

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CAMBODIA_FAST_FACTS.map((f) => (
                <div
                  key={f.id}
                  className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-start gap-2.5 text-slate-900"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                      {pickTri(f.title, lang)}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed mt-0.5">
                      {pickTri(f.fact, lang)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            </AccordionCard>
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

      <AngkorVisitGuideModal
        isOpen={angkorGuideOpen}
        initialTab={angkorGuideTab}
        language={language}
        destinations={destinations}
        onClose={() => setAngkorGuideOpen(false)}
        onSelectDestination={(dest) => setSelectedDestination(dest)}
      />
    </div>
  );
};

