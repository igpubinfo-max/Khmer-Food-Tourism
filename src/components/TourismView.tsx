import React, { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { useApp } from '../context/AppContext';
import { TouristCard } from './TouristCard';
import { AngkorHeroTopHeader } from './AngkorHeroTopHeader';
import {
  Compass,
  MapPin,
  Search,
  X,
  Landmark,
  Trees,
  Waves,
  Mountain,
  Sparkles,
  Flame,
} from 'lucide-react';
import { shuffleForCurrentSession } from '../utils/sessionShuffle';
import { smoothScrollToElement } from '../utils/smoothScroll';
import { DISH_PROVINCES } from '../utils/foodFilters';
import { tr } from '../utils/i18n';
import {
  rankBySearchRelevance,
  destinationSearchFields,
  normalizeSearchText,
  analyzeSearchQuery,
} from '../utils/searchEngine';
import { parseSmartSearchIntent } from '../utils/aiSearchBridge';
import { getLocalizedDestination } from '../utils/zhDynamicTranslator';

const TOURISM_BATCH_SIZE = 18;
const DEFAULT_PP_COORDS = { lat: 11.5564, lng: 104.9282 };

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const TourismView: React.FC = () => {
  const {
    destinations,
    language,
    selectedProvince,
    setSelectedProvince,
    showToast,
  } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [nearMeActive, setNearMeActive] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(TOURISM_BATCH_SIZE);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const tourismListStartRef = useRef<HTMLDivElement | null>(null);
  const tourismCategoryCardRef = useRef<HTMLDivElement | null>(null);

  const scrollToTourismList = (keepCategoriesVisible = false) => {
    if (keepCategoriesVisible && tourismCategoryCardRef.current) {
      smoothScrollToElement(tourismCategoryCardRef.current, { offsetTop: 8, onlyIfOutOfView: true });
      return;
    }
    smoothScrollToElement(tourismListStartRef.current, { offsetTop: 10 });
  };

  useEffect(() => {
    setVisibleCount(TOURISM_BATCH_SIZE);
  }, [selectedCategory, selectedProvince, deferredSearchQuery, nearMeActive]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__kft_tourism_near_me) {
      (window as any).__kft_tourism_near_me = undefined;
      setSelectedCategory('all');
      if (!nearMeActive) {
        handleToggleNearMe();
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleToggleNearMe = () => {
    if (nearMeActive) {
      setNearMeActive(false);
      return;
    }
    setNearMeActive(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          showToast(
            tr(
              language,
              '📍 បានរៀបតំបន់ទេសចរណ៍តាមចម្ងាយជិតអ្នកបំផុត!',
              '📍 Sorted destinations nearest to your location!',
              '📍 已按距离您最近排序旅游景点！'
            ),
            'success'
          );
        },
        () => {
          setUserCoords(DEFAULT_PP_COORDS);
          showToast(
            tr(
              language,
              '📍 បង្ហាញតំបន់ទេសចរណ៍នៅជិតអ្នក',
              '📍 Showing destinations near you',
              '📍 显示您附近的旅游景点'
            ),
            'info'
          );
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 120000 }
      );
    } else {
      setUserCoords(DEFAULT_PP_COORDS);
    }
  };

  // 6 Premium 3D Gold-Framed Category Buttons
  const primaryCategoryButtons = useMemo(
    () => [
      {
        id: 'all',
        imageSrc: '/categories/travel_cat_all.png',
        nameKh: 'ទាំងអស់',
        nameEn: 'All Places',
        nameZh: '全部景点',
        isLongLabel: false,
      },
      {
        id: 'temple',
        imageSrc: '/categories/travel_cat_temples.png',
        nameKh: 'ប្រាសាទបុរាណ',
        nameEn: 'Temples',
        nameZh: '古迹与寺庙',
        isLongLabel: language === 'km',
      },
      {
        id: 'nature',
        imageSrc: '/categories/travel_cat_nature.png',
        nameKh: 'ធម្មជាតិ & ទឹកធ្លាក់',
        nameEn: 'Nature & Falls',
        nameZh: '自然与瀑布',
        isLongLabel: true,
      },
      {
        id: 'beach',
        imageSrc: '/categories/travel_cat_beach.png',
        nameKh: 'កោះ & ឆ្នេរសមុទ្រ',
        nameEn: 'Islands & Beaches',
        nameZh: '海岛与海滩',
        isLongLabel: true,
      },
      {
        id: 'mountain',
        imageSrc: '/categories/travel_cat_mountain.png',
        nameKh: 'ភ្នំ & ឧទ្យានជាតិ',
        nameEn: 'Mountains',
        nameZh: '高山与森林',
        isLongLabel: language === 'km',
      },
      {
        id: 'cultural',
        imageSrc: '/categories/travel_cat_culture.png',
        nameKh: 'វប្បធម៌ & ពេញនិយម',
        nameEn: 'Culture & Popular',
        nameZh: '文化与热门',
        isLongLabel: true,
      },
    ],
    [language]
  );

  // Exclude hotels (categorySlug === 'hotel') since Hotels have their own dedicated BottomNav menu tab
  const scenicDestinationsOnly = useMemo(
    () => destinations.filter((d) => Boolean(d && d.categorySlug !== 'hotel')),
    [destinations]
  );

  // Compute GPS distance (in km) for each destination
  const distanceMap = useMemo(() => {
    const origin = userCoords || DEFAULT_PP_COORDS;
    const map = new Map<string, number>();
    for (const d of scenicDestinationsOnly) {
      if (
        typeof d.latitude === 'number' &&
        typeof d.longitude === 'number' &&
        Number.isFinite(d.latitude) &&
        Number.isFinite(d.longitude) &&
        d.latitude !== 0 &&
        d.longitude !== 0
      ) {
        const km = haversineDistanceKm(origin.lat, origin.lng, d.latitude, d.longitude);
        if (Number.isFinite(km) && km >= 0) {
          map.set(d.id, km);
        }
      }
    }
    return map;
  }, [scenicDestinationsOnly, userCoords]);

  // Filter destinations by category first so province dropdown counts reflect the selected category
  const categoryMatchedDestinations = useMemo(() => {
    return scenicDestinationsOnly.filter((d) => {
      if (selectedCategory === 'trending_social') return Boolean(d.isTrendingSocial);
      if (selectedCategory === 'cultural') {
        return d.categorySlug === 'cultural' || d.categorySlug === 'resort' || Boolean(d.isTrendingSocial);
      }
      if (selectedCategory !== 'all') return d.categorySlug === selectedCategory;
      return true;
    });
  }, [scenicDestinationsOnly, selectedCategory]);

  // Build 25 Provinces & Capital City dropdown options
  const provinceOptions = useMemo(() => {
    return DISH_PROVINCES.map((p) => {
      const cleanKey = p.kh.replace(/^រាជធានី|^ខេត្ត/g, '').trim();
      const count = categoryMatchedDestinations.filter((d) =>
        (d.provinceKh || '').replace(/^រាជធានី|^ខេត្ត/g, '').includes(cleanKey)
      ).length;
      return {
        ...p,
        value: p.kh,
        count,
      };
    });
  }, [categoryMatchedDestinations]);

  // Precompute trilingual (Khmer, English, Simplified Chinese) search fields once per destination
  const hasActiveTourismSearch = deferredSearchQuery.trim().length > 0;
  const searchIndexById = useMemo(() => {
    if (!hasActiveTourismSearch) return new Map();
    const map = new Map<
      string,
      {
        fields: ReturnType<typeof destinationSearchFields>;
        combinedNormName: string;
        combinedNormAll: string;
      }
    >();
    for (const d of scenicDestinationsOnly) {
      const zhLoc = getLocalizedDestination(d, 'zh');
      const fields = destinationSearchFields(d, [
        zhLoc.name,
        zhLoc.category,
        zhLoc.province,
        zhLoc.address,
      ]);
      const combinedNormName = normalizeSearchText(
        `${d.nameKh || ''} ${d.nameEn || ''} ${zhLoc.name || ''}`
      );
      const combinedNormAll = normalizeSearchText(
        `${d.nameKh || ''} ${d.nameEn || ''} ${zhLoc.name || ''} ${d.provinceKh || ''} ${d.provinceEn || ''} ${zhLoc.province || ''} ${d.categoryKh || ''} ${d.categoryEn || ''} ${zhLoc.category || ''}`
      );
      map.set(d.id, { fields, combinedNormName, combinedNormAll });
    }
    return map;
  }, [scenicDestinationsOnly, hasActiveTourismSearch]);

  // Separate full-card HD destinations (shuffled first) and compact directory rows (shuffled second)
  const orderedSessionDestinations = useMemo(() => {
    const fullCards = scenicDestinationsOnly.filter(
      (d) => Boolean(d.photoUrl && d.photoUrl.trim()) && (!d.id.startsWith('rac-') || Boolean(d.isFeatured))
    );
    const compactRows = scenicDestinationsOnly.filter(
      (d) => Boolean(!d.photoUrl || !d.photoUrl.trim() || (d.id.startsWith('rac-') && !d.isFeatured))
    );
    return [
      ...shuffleForCurrentSession(fullCards),
      ...shuffleForCurrentSession(compactRows),
    ];
  }, [scenicDestinationsOnly]);

  const filteredDestinations = useMemo(() => {
    const trimmedQuery = deferredSearchQuery.trim();
    const smartIntent = trimmedQuery ? parseSmartSearchIntent(trimmedQuery) : null;
    const effectiveProvRaw = selectedProvince || smartIntent?.detectedProvinceKh || '';
    const cleanSelProv = effectiveProvRaw.replace(/^រាជធានី|^ខេត្ត/g, '').trim();
    const mappedSemanticCat =
      smartIntent?.semanticCategory === 'waterfall'
        ? 'nature'
        : smartIntent?.semanticCategory === 'temple' ||
          smartIntent?.semanticCategory === 'beach' ||
          smartIntent?.semanticCategory === 'mountain'
        ? smartIntent.semanticCategory
        : '';

    const scoped = orderedSessionDestinations.filter((d) => {
      if (selectedCategory === 'trending_social') {
        if (!d.isTrendingSocial) return false;
      } else if (selectedCategory === 'cultural') {
        if (d.categorySlug !== 'cultural' && d.categorySlug !== 'resort' && !d.isTrendingSocial) return false;
      } else if (selectedCategory !== 'all' && d.categorySlug !== selectedCategory) {
        return false;
      } else if (selectedCategory === 'all' && mappedSemanticCat && d.categorySlug !== mappedSemanticCat) {
        return false;
      }
      if (cleanSelProv && !(d.provinceKh || '').replace(/^រាជធានី|^ខេត្ត/g, '').includes(cleanSelProv)) {
        return false;
      }
      return true;
    });

    let results = scoped;

    if (trimmedQuery) {
      const qa = analyzeSearchQuery(trimmedQuery);
      if (!(qa.distinctive.length === 0 && (smartIntent?.detectedProvinceKh || mappedSemanticCat))) {
        const ranked = rankBySearchRelevance(
          scoped,
          trimmedQuery,
          (d) => searchIndexById.get(d.id)?.fields || destinationSearchFields(d),
          {
            bucketSize: 80,
            tieBreak: (a, b) => (b.rating || 0) - (a.rating || 0),
          }
        );

        if (ranked.length > 0) {
          results = ranked;
        } else {
          const normQuery = normalizeSearchText(trimmedQuery);
          if (normQuery) {
            const tokens = normQuery.split(/\s+/).filter(Boolean);
            const nameMatches: typeof scoped = [];
            const metaMatches: typeof scoped = [];
            for (const d of scoped) {
              const entry = searchIndexById.get(d.id);
              if (!entry) continue;
              if (tokens.every((tok) => entry.combinedNormName.includes(tok))) {
                nameMatches.push(d);
              } else if (tokens.every((tok) => entry.combinedNormAll.includes(tok))) {
                metaMatches.push(d);
              }
            }
            results = [...nameMatches, ...metaMatches];
          }
        }
      }
    }

    if (nearMeActive) {
      return [...results].sort((a, b) => {
        const distA = distanceMap.get(a.id) ?? 9999;
        const distB = distanceMap.get(b.id) ?? 9999;
        return distA - distB;
      });
    }

    return results;
  }, [
    orderedSessionDestinations,
    selectedCategory,
    selectedProvince,
    deferredSearchQuery,
    searchIndexById,
    nearMeActive,
    distanceMap,
  ]);

  const displayedDestinations = useMemo(
    () => filteredDestinations.slice(0, visibleCount),
    [filteredDestinations, visibleCount]
  );

  const hasActiveFilters =
    selectedCategory !== 'all' || Boolean(selectedProvince) || Boolean(searchQuery.trim()) || nearMeActive;

  const resetAllFilters = () => {
    setSelectedCategory('all');
    setSelectedProvince('');
    setSearchQuery('');
    setNearMeActive(false);
  };

  useEffect(() => {
    const node = loadMoreTriggerRef.current;
    if (!node || visibleCount >= filteredDestinations.length) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(filteredDestinations.length, prev + TOURISM_BATCH_SIZE));
        }
      },
      { root: document.getElementById('kft-main-scroll'), rootMargin: '320px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, filteredDestinations.length]);

  return (
    <div className="w-full max-w-6xl mx-auto bg-[#1E293B] text-white min-h-full font-khmer pb-20 overflow-x-hidden">
      {/* 1. Shared Master Hero Header with Free Account Status Badge */}
      <AngkorHeroTopHeader mode="food" />

      {/* 2. MAIN CONTENT CONTAINER (Dark Slate #1E293B + Clean White Cards & 6 Colorful Category Buttons) */}
      <div className="relative z-20 -mt-[82px] px-3 min-[360px]:px-4 sm:px-5 space-y-3 bg-[#1E293B]/0">
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
              <Landmark className="w-4 h-4 text-[#042F2E]" strokeWidth={2.4} />
            </div>

            <span className="relative z-10 h-6 w-px bg-white/35 shrink-0" aria-hidden="true" />

            <div className="relative z-10 min-w-0">
              <h2
                className="font-khmer font-extrabold text-white leading-[1.65] py-0.5 break-words"
                style={{ fontSize: 'clamp(13.8px, 3.96vw, 16.2px)', textShadow: '0 1px 3px rgba(0, 0, 0, 0.65)' }}
              >
                {tr(language, 'តំបន់ទេសចរណ៍កម្ពុជា', 'Tourism & Destinations', '旅游景点与度假胜地')}
              </h2>
              <p
                className="font-khmer font-bold text-[#FDE68A] leading-[1.62] py-0.5 break-words"
                style={{ fontSize: 'clamp(11px, 3.12vw, 13.2px)', textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)' }}
              >
                {tr(language, 'ប្រាសាទ ធម្មជាតិ និងឆ្នេរគ្រប់ខេត្ត', 'Temples, nature & beaches across Cambodia', '探索全柬古迹、自然风光与海滩')}
              </p>
            </div>
          </div>
        </div>

        {/* Row 1: Essential Search Bar + GPS Near Me Button (Compact ~60% Width Aligned Left) */}
        <div className="w-full flex items-center gap-2 min-w-0">
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1)',
            }}
            className="flex-1 min-w-0 min-h-[48px] py-1 rounded-full border border-white pl-3.5 pr-2 flex items-center gap-2"
          >
            <Search className="w-5 h-5 text-slate-500 shrink-0" strokeWidth={2.3} />
            <input
              type="text"
              size={1}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tr(
                language,
                'ស្វែងរកតំបន់ទេសចរណ៍ (ខ្មែរ / EN / 中文)...',
                'Search destinations by Khmer, English, or Chinese...',
                '搜索旅游景点名称（支持中文 / 英文 / 柬文）...'
              )}
              className="flex-1 min-w-0 bg-transparent text-xs sm:text-[13.5px] font-bold text-slate-900 placeholder-slate-400 focus:outline-none truncate"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={tr(language, 'សម្អាតការស្វែងរក', 'Clear search', '清除搜索')}
                className="p-1 text-slate-400 hover:text-slate-700 shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                handleToggleNearMe();
                scrollToTourismList();
              }}
              style={
                nearMeActive
                  ? {
                      background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
                      boxShadow: '0 4px 12px rgba(21, 128, 61, 0.35)',
                    }
                  : {
                      background: 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
                      boxShadow: '0 4px 12px rgba(234, 88, 12, 0.35)',
                    }
              }
              className="min-h-[36px] px-2.5 min-[360px]:px-3.5 py-1 rounded-full text-white font-extrabold text-xs inline-flex items-center gap-1.5 shrink-0 border border-white/80 transition active:scale-95 cursor-pointer leading-[1.6]"
            >
              <MapPin className="w-3.5 h-3.5 text-white fill-white/25 shrink-0" strokeWidth={2.3} />
              <span>{tr(language, 'នៅជិតខ្ញុំ', 'Near Me', '附近')}</span>
            </button>
          </div>
        </div>

        {/* Row 2: 6 Premium 3D Gold-Framed Tourism Category Buttons (3×2 Grid) + Clear White Text Below Each Button + Compact 25-Province Selector */}
        <div
          ref={tourismCategoryCardRef}
          style={{
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.84) 0%, rgba(15, 23, 42, 0.94) 100%)',
            boxShadow: '0 10px 28px rgba(15, 23, 42, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
          }}
          className="w-full max-w-full min-w-0 rounded-[24px] p-2 min-[360px]:p-2.5 sm:p-3.5 border border-amber-400/25 space-y-2.5"
        >
          <div className="kft-cat-grid grid grid-cols-3 gap-x-1.5 min-[360px]:gap-x-2 sm:gap-x-3 gap-y-2 min-[360px]:gap-y-2.5 sm:gap-y-3 items-start">
            {primaryCategoryButtons.map((cat) => {
              const active = selectedCategory === cat.id;
              const label = tr(language, cat.nameKh, cat.nameEn, cat.nameZh);
              return (
                <button
                  key={cat.id}
                  id={`kft-travel-cat-${cat.id}-btn`}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    scrollToTourismList(true);
                  }}
                  aria-pressed={active}
                  className="kft-cat-btn group relative flex flex-col items-center justify-start w-full max-w-full min-w-0 overflow-visible p-0 bg-transparent border-0 transition-transform duration-150 active:scale-[0.95] cursor-pointer focus:outline-none select-none"
                >
                  {/* 3D Gold-Bordered Button Graphic */}
                  <div
                    className="kft-cat-img-wrap relative w-full max-w-full min-w-0 min-h-0 aspect-[2.12/1] overflow-visible transition-all duration-200 rounded-[14px]"
                    style={{
                      filter: 'drop-shadow(0 4px 8px rgba(2, 6, 23, 0.42))',
                      transform: 'none',
                    }}
                  >
                    <img
                      src={cat.imageSrc}
                      alt={label}
                      loading="eager"
                      decoding="async"
                      draggable={false}
                      className="block w-full h-full max-w-full min-w-0 min-h-0 object-contain pointer-events-none select-none"
                    />
                  </div>

                  {/* Clear White Title Below Each Button */}
                  <span
                    className="mt-1 px-0.5 font-khmer font-extrabold leading-[1.62] text-center break-words whitespace-normal w-full transition-colors duration-150"
                    style={{
                      fontSize: 'clamp(11px, 3.05vw, 13.4px)',
                      color: active ? '#FDE047' : '#FFFFFF',
                      textShadow: active
                        ? '0 1px 3px rgba(0, 0, 0, 0.92), 0 0 8px rgba(250, 204, 21, 0.45)'
                        : '0 1.5px 3px rgba(0, 0, 0, 0.90), 0 0 2px rgba(0, 0, 0, 0.75)',
                    }}
                  >
                    {label}
                  </span>

                  {/* Subtle Gold Active Indicator Bar Below Title */}
                  {active && (
                    <span
                      className="mt-0.5 h-1 w-7 rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, #FDE047 0%, #F59E0B 100%)',
                        boxShadow: '0 0 6px rgba(250, 204, 21, 0.8)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Compact 25-Province Selector Bar inside the Card */}
          <div className="flex items-center gap-2 pt-1 border-t border-white/10">
            <div className="relative flex-1 min-w-0">
              <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedProvince}
                onChange={(e) => {
                  setSelectedProvince(e.target.value);
                  scrollToTourismList();
                }}
                aria-label={tr(
                  language,
                  'ជ្រើសរើសរាជធានី-ខេត្ត (២៥ ខេត្ត/ក្រុង)',
                  'Select Province / Capital (25 Provinces)',
                  '选择省份/直辖市（柬埔寨 25 省市）'
                )}
                className="w-full min-h-[40px] pl-9 pr-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-xs font-extrabold text-slate-800 cursor-pointer focus:outline-none focus:border-emerald-500 transition shadow-xs"
              >
                <option value="">
                  {tr(
                    language,
                    'គ្រប់រាជធានី-ខេត្តទាំង ២៥',
                    'All 25 Provinces & Capital',
                    '全部 25 个省市'
                  )}
                </option>
                {provinceOptions.map((p) => (
                  <option key={p.id} value={p.value}>
                    {tr(language, p.fullKh, p.en, p.zh)} ({p.count})
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="kft-btn-reset"
              >
                <span>↺ {tr(language, 'កំណត់ឡើងវិញ', 'Reset', '重置')}</span>
              </button>
            )}
          </div>
        </div>

        <div ref={tourismListStartRef} id="kft-tourism-list-section" className="scroll-mt-3" />

        {/* Row 3: Section Title Bar on Dark Slate (#1E293B) */}
        <div className="flex items-center justify-between gap-2 px-0.5 pt-0.5">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <Flame className="w-5 h-5 text-orange-400 fill-amber-400 shrink-0" />
              <h2 className="font-extrabold text-[15px] sm:text-base text-white leading-[1.65] break-words">
                {tr(language, 'តំបន់ទេសចរណ៍ស្រស់ត្រកាល', 'Scenic Destinations', '柬埔寨著名旅游景点')}
              </h2>
            </div>

            {nearMeActive && (
              <span
                style={{
                  background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
                }}
                className="px-2.5 py-0.5 rounded-full text-white text-[11px] font-extrabold inline-flex items-center gap-1 shadow-2xs shrink-0 select-none"
              >
                <MapPin className="w-3 h-3 text-white fill-white/25 shrink-0" />
                <span>{tr(language, 'ជិតខ្ញុំ', 'Near Me', '附近')}</span>
              </span>
            )}
          </div>

          <span className="px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs text-xs font-extrabold text-slate-800 shrink-0">
            {tr(
              language,
              `${filteredDestinations.length} កន្លែង`,
              `${filteredDestinations.length} places`,
              `${filteredDestinations.length} 处景点`
            )}
          </span>
        </div>

        {/* Row 4: Destination Cards Grid */}
        {filteredDestinations.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-[24px] border border-slate-200 space-y-2.5 font-khmer shadow-xs text-slate-900">
            <Compass className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-xs text-slate-600 font-bold">
              {tr(language, 'មិនមានតំបន់ទេសចរណ៍ក្នុងផ្នែកនេះទេ', 'No destinations match your criteria', '未找到符合条件的旅游景点')}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                style={{
                  background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
                }}
                className="px-4 py-2 rounded-full text-white text-xs font-extrabold shadow-xs cursor-pointer"
              >
                {tr(language, 'បង្ហាញតំបន់ទេសចរណ៍ទាំងអស់', 'Show All Destinations', '显示全部景点')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 min-h-[65vh] content-start">
            {displayedDestinations.map((dest) => (
              <TouristCard
                key={dest.id}
                destination={dest}
                distanceKm={distanceMap.get(dest.id) ?? null}
              />
            ))}
            {visibleCount < filteredDestinations.length && (
              <div ref={loadMoreTriggerRef} className="col-span-full pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((prev) => Math.min(filteredDestinations.length, prev + TOURISM_BATCH_SIZE))
                  }
                  className="kft-btn-load-more"
                >
                  {tr(
                    language,
                    `បង្ហាញតំបន់ទេសចរណ៍បន្ថែម (${displayedDestinations.length} / ${filteredDestinations.length})`,
                    `Show More Destinations (${displayedDestinations.length} / ${filteredDestinations.length})`,
                    `加载更多旅游景点 (${displayedDestinations.length} / ${filteredDestinations.length})`
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
