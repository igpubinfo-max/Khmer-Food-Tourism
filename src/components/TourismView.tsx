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

const TOURISM_BATCH_SIZE = 24;
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

  useEffect(() => {
    setVisibleCount(TOURISM_BATCH_SIZE);
  }, [selectedCategory, selectedProvince, deferredSearchQuery, nearMeActive]);

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

  // 6 Colorful Glossy Gradient Category Buttons Matching Reference Image 2
  const primaryCategoryButtons = useMemo(
    () => [
      {
        id: 'all',
        nameKh: 'ទាំងអស់',
        nameEn: 'All Places',
        nameZh: '全部景点',
        icon: Compass,
        gradient: 'linear-gradient(180deg, #FF9933 0%, #D94E08 100%)',
        shadow: '0 5px 12px rgba(217, 78, 8, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
        activeRing: '0 0 0 3px #1E293B, 0 6px 14px rgba(217, 78, 8, 0.45)',
      },
      {
        id: 'temple',
        nameKh: 'ប្រាសាទបុរាណ',
        nameEn: 'Temples',
        nameZh: '古迹与寺庙',
        icon: Landmark,
        gradient: 'linear-gradient(180deg, #2EA856 0%, #0D6630 100%)',
        shadow: '0 5px 12px rgba(13, 102, 48, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
        activeRing: '0 0 0 3px #1E293B, 0 6px 14px rgba(13, 102, 48, 0.45)',
      },
      {
        id: 'nature',
        nameKh: 'ធម្មជាតិ & ទឹកធ្លាក់',
        nameEn: 'Nature & Falls',
        nameZh: '自然与瀑布',
        icon: Trees,
        gradient: 'linear-gradient(180deg, #F75977 0%, #C41D4B 100%)',
        shadow: '0 5px 12px rgba(196, 29, 75, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
        activeRing: '0 0 0 3px #1E293B, 0 6px 14px rgba(196, 29, 75, 0.45)',
      },
      {
        id: 'beach',
        nameKh: 'កោះ & ឆ្នេរសមុទ្រ',
        nameEn: 'Islands & Beaches',
        nameZh: '海岛与海滩',
        icon: Waves,
        gradient: 'linear-gradient(180deg, #3290FA 0%, #1254C7 100%)',
        shadow: '0 5px 12px rgba(18, 84, 199, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
        activeRing: '0 0 0 3px #1E293B, 0 6px 14px rgba(18, 84, 199, 0.45)',
      },
      {
        id: 'mountain',
        nameKh: 'ភ្នំ & ឧទ្យានជាតិ',
        nameEn: 'Mountains',
        nameZh: '高山与国家公园',
        icon: Mountain,
        gradient: 'linear-gradient(180deg, #F4B630 0%, #C67D0D 100%)',
        shadow: '0 5px 12px rgba(198, 125, 13, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
        activeRing: '0 0 0 3px #1E293B, 0 6px 14px rgba(198, 125, 13, 0.45)',
      },
      {
        id: 'cultural',
        nameKh: 'វប្បធម៌ & ពេញនិយម',
        nameEn: 'Culture & Popular',
        nameZh: '文化与热门',
        icon: Sparkles,
        gradient: 'linear-gradient(180deg, #22AAA3 0%, #0E6769 100%)',
        shadow: '0 5px 12px rgba(14, 103, 105, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
        activeRing: '0 0 0 3px #1E293B, 0 6px 14px rgba(14, 103, 105, 0.45)',
      },
    ],
    []
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
    <div className="w-full max-w-6xl mx-auto bg-[#1E293B] text-white min-h-full font-khmer pb-12 overflow-x-hidden">
      {/* 1. Shared Master Hero Header with Free Account Status Badge */}
      <AngkorHeroTopHeader mode="food" />

      {/* 2. MAIN CONTENT CONTAINER (Dark Slate #1E293B + Clean White Cards & 6 Colorful Category Buttons) */}
      <div className="relative z-20 -mt-12 px-3 min-[360px]:px-4 sm:px-5 space-y-3.5 bg-[#1E293B] pt-1">
        {/* Row 1: Essential Search Bar + GPS Near Me Button */}
        <div className="flex items-center gap-2">
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
              onClick={handleToggleNearMe}
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

        {/* Row 2: 6 Colorful Gradient Category Buttons + Compact 25-Province Selector Inside Clean White Card */}
        <div
          style={{
            background: '#FFFFFF',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          }}
          className="rounded-[24px] p-2.5 sm:p-3 border border-slate-100 space-y-2.5"
        >
          <div className="grid grid-cols-3 gap-2">
            {primaryCategoryButtons.map((cat) => {
              const Icon = cat.icon;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  aria-pressed={active}
                  style={{
                    background: cat.gradient,
                    boxShadow: active ? cat.activeRing : cat.shadow,
                  }}
                  className="group relative min-h-[68px] px-1.5 py-2 rounded-[16px] flex flex-col items-center justify-center gap-1 min-w-0 text-white transition active:scale-[0.96] cursor-pointer overflow-hidden"
                >
                  <span
                    className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%)',
                    }}
                  />
                  <Icon className="relative z-10 w-5 h-5 text-white shrink-0 drop-shadow-xs" strokeWidth={2.2} />
                  <span
                    className="relative z-10 font-khmer font-extrabold leading-[1.62] py-0.5 text-center break-words whitespace-normal w-full"
                    style={{ fontSize: 'clamp(11.4px, 3.12vw, 13.8px)', textShadow: '0 1px 2px rgba(0,0,0,0.30)' }}
                  >
                    {tr(language, cat.nameKh, cat.nameEn, cat.nameZh)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Compact 25-Province Selector Bar inside the White Card */}
          <div className="flex items-center gap-2 pt-0.5">
            <div className="relative flex-1 min-w-0">
              <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                aria-label={tr(
                  language,
                  'ជ្រើសរើសរាជធានី-ខេត្ត (២៥ ខេត្ត/ក្រុង)',
                  'Select Province / Capital (25 Provinces)',
                  '选择省份/直辖市（柬埔寨 25 省市）'
                )}
                className="w-full min-h-[40px] pl-9 pr-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 text-xs font-extrabold text-slate-800 cursor-pointer focus:outline-none focus:border-emerald-500 transition"
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
                    {tr(language, p.fullKh, p.en, p.zh)}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="min-h-[40px] px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold active:scale-95 transition cursor-pointer shrink-0"
              >
                ↺ {tr(language, 'កំណត់ឡើងវិញ', 'Reset', '重置')}
              </button>
            )}
          </div>
        </div>

        {/* Row 3: Section Title Bar on Dark Slate (#1E293B) */}
        <div className="flex items-center justify-between gap-2 px-0.5 pt-0.5">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <Flame className="w-5 h-5 text-orange-400 fill-amber-400 shrink-0" />
              <h2 className="font-extrabold text-[15px] sm:text-base text-white leading-[1.65] break-words">
                {tr(language, 'តំបន់ទេសចរណ៍ស្រស់ត្រកាល', 'Scenic Destinations', '柬埔寨著名旅游景点')}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleToggleNearMe}
              style={{
                background: nearMeActive
                  ? 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)'
                  : 'linear-gradient(180deg, #FB923C 0%, #EA580C 100%)',
              }}
              className="px-2.5 py-0.5 rounded-full text-white text-[11px] font-extrabold inline-flex items-center gap-1 shadow-2xs active:scale-95 transition cursor-pointer shrink-0"
            >
              <MapPin className="w-3 h-3 text-white fill-white/25 shrink-0" />
              <span>{tr(language, 'ជិតខ្ញុំ', 'Near Me', '附近')}</span>
            </button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
                  style={{
                    background: 'linear-gradient(180deg, #22C55E 0%, #15803D 100%)',
                  }}
                  className="px-5 py-2.5 rounded-full text-white text-xs font-extrabold shadow-xs font-khmer cursor-pointer transition active:scale-95"
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
