import React, { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { useApp } from '../context/AppContext';
import { TouristCard } from './TouristCard';
import { Compass, MapPin } from 'lucide-react';
import { shuffleForCurrentSession } from '../utils/sessionShuffle';
import { DISH_PROVINCES } from '../utils/foodFilters';
import { tr } from '../utils/i18n';
import { ListingSearchInput } from './listing/ListingUI';
import {
  rankBySearchRelevance,
  destinationSearchFields,
  normalizeSearchText,
  analyzeSearchQuery,
} from '../utils/searchEngine';
import { parseSmartSearchIntent } from '../utils/aiSearchBridge';
import { getLocalizedDestination } from '../utils/zhDynamicTranslator';

const TOURISM_BATCH_SIZE = 24;

export const TourismView: React.FC = () => {
  const {
    destinations,
    language,
    selectedProvince,
    setSelectedProvince,
  } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [visibleCount, setVisibleCount] = useState<number>(TOURISM_BATCH_SIZE);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(TOURISM_BATCH_SIZE);
  }, [selectedCategory, selectedProvince, deferredSearchQuery]);

  const categories = [
    { id: 'all', nameKh: 'ទាំងអស់', nameEn: 'All', nameZh: '全部景点' },
    { id: 'trending_social', nameKh: 'កំពុងពេញនិយម', nameEn: 'Popular Now', nameZh: '热门打卡' },
    { id: 'temple', nameKh: 'ប្រាសាទបុរាណ', nameEn: 'Temples', nameZh: '古迹与寺庙' },
    { id: 'nature', nameKh: 'ធម្មជាតិ & ទឹកធ្លាក់', nameEn: 'Nature & Falls', nameZh: '自然生态与瀑布' },
    { id: 'beach', nameKh: 'កោះ & ឆ្នេរសមុទ្រ', nameEn: 'Islands & Beaches', nameZh: '海岛与海滩' },
    { id: 'mountain', nameKh: 'ភ្នំ & ឧទ្យានជាតិ', nameEn: 'Mountains', nameZh: '高山与国家公园' },
    { id: 'cultural', nameKh: 'វប្បធម៌ & ប្រវត្តិសាស្ត្រ', nameEn: 'Cultural & History', nameZh: '文化与历史遗址' },
  ];

  // Exclude hotels (categorySlug === 'hotel') since Hotels have their own dedicated BottomNav menu tab
  const scenicDestinationsOnly = useMemo(
    () => destinations.filter((d) => Boolean(d && d.categorySlug !== 'hotel')),
    [destinations]
  );

  // Filter destinations by category first so province dropdown counts reflect the selected category
  const categoryMatchedDestinations = useMemo(() => {
    return scenicDestinationsOnly.filter((d) => {
      if (selectedCategory === 'trending_social') return Boolean(d.isTrendingSocial);
      if (selectedCategory === 'cultural') return d.categorySlug === 'cultural' || d.categorySlug === 'resort';
      if (selectedCategory !== 'all') return d.categorySlug === selectedCategory;
      return true;
    });
  }, [scenicDestinationsOnly, selectedCategory]);

  // Build 25 Provinces & Capital City dropdown options with live attraction counts
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
        if (d.categorySlug !== 'cultural' && d.categorySlug !== 'resort') return false;
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

    if (!trimmedQuery) return scoped;
    const qa = analyzeSearchQuery(trimmedQuery);
    if (qa.distinctive.length === 0 && (smartIntent?.detectedProvinceKh || mappedSemanticCat)) {
      return scoped;
    }

    const ranked = rankBySearchRelevance(
      scoped,
      trimmedQuery,
      (d) => searchIndexById.get(d.id)?.fields || destinationSearchFields(d),
      {
        bucketSize: 80,
        tieBreak: (a, b) => (b.rating || 0) - (a.rating || 0),
      }
    );

    if (ranked.length > 0) return ranked;

    // Fast partial-keyword fallback (including 1-2 character partial keywords in Khmer, English, or Chinese)
    const normQuery = normalizeSearchText(trimmedQuery);
    if (!normQuery) return scoped;
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
    return [...nameMatches, ...metaMatches];
  }, [orderedSessionDestinations, selectedCategory, selectedProvince, deferredSearchQuery, searchIndexById]);

  const displayedDestinations = useMemo(
    () => filteredDestinations.slice(0, visibleCount),
    [filteredDestinations, visibleCount]
  );

  const hasActiveFilters =
    selectedCategory !== 'all' || Boolean(selectedProvince) || Boolean(searchQuery.trim());
  const resetAllFilters = () => {
    setSelectedCategory('all');
    setSelectedProvince('');
    setSearchQuery('');
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
    <div className="w-full max-w-6xl mx-auto px-2.5 min-[360px]:px-4 py-3 space-y-4 pb-10 overflow-x-hidden">
      {/* Title Bar */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-moul text-sm sm:text-base text-[#0F172A] dark:text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#059669]" />
            <span>{tr(language, 'តំបន់ទេសចរណ៍ស្រស់ត្រកាល', 'Scenic Destinations', '柬埔寨著名旅游景点')}</span>
          </h2>
        </div>
        {searchQuery.trim() && (
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 text-[11px] font-bold text-[#064E3B] dark:text-emerald-300 font-khmer">
            {tr(
              language,
              `រកឃើញ ${filteredDestinations.length}`,
              `${filteredDestinations.length} found`,
              `找到 ${filteredDestinations.length} 处`
            )}
          </span>
        )}
      </div>

      {/* Trilingual Search Bar (Khmer, English, Simplified Chinese + partial keywords) */}
      <ListingSearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={tr(
          language,
          'ស្វែងរកតំបន់ទេសចរណ៍ (ខ្មែរ / EN / 中文)...',
          'Search destinations by Khmer, English, or Chinese name...',
          '搜索旅游景点名称（支持中文 / 英文 / 柬文）...'
        )}
        clearLabel={tr(language, 'សម្អាតការស្វែងរក', 'Clear search', '清除搜索')}
      />

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 font-khmer">
        {categories.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition font-medium cursor-pointer ${
                active
                  ? 'bg-[#064E3B] text-white font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {tr(language, cat.nameKh, cat.nameEn, cat.nameZh)}
            </button>
          );
        })}
      </div>

      {/* 25 Provinces & Capital City Dropdown Filter */}
      <div className="grid grid-cols-1 gap-2 font-khmer">
        <label className="block">
          <span className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              {tr(
                language,
                'ជ្រើសរើសរាជធានី-ខេត្ត (២៥ ខេត្ត/ក្រុង)',
                'Select Province / Capital (25 Provinces)',
                '选择省份/直辖市（柬埔寨 25 省市）'
              )}
            </span>
          </span>
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-900 dark:text-white cursor-pointer"
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
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetAllFilters}
            className="min-h-[42px] rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold active:scale-[0.98] transition cursor-pointer"
          >
            ↺ {tr(language, 'កំណត់តម្រងឡើងវិញ', 'Reset filters', '重置筛选')}
          </button>
        )}
      </div>

      {/* Destination List */}
      {filteredDestinations.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2 font-khmer shadow-xs">
          <Compass className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs text-slate-500 font-medium">
            {tr(language, 'មិនមានតំបន់ទេសចរណ៍ក្នុងផ្នែកនេះទេ', 'No destinations match your criteria', '未找到符合条件的旅游景点')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {displayedDestinations.map((dest) => (
            <TouristCard key={dest.id} destination={dest} />
          ))}
          {visibleCount < filteredDestinations.length && (
            <div ref={loadMoreTriggerRef} className="col-span-full pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => Math.min(filteredDestinations.length, prev + TOURISM_BATCH_SIZE))}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#064E3B] dark:text-emerald-400 shadow-2xs font-khmer cursor-pointer"
              >
                {tr(
                  language,
                  'បង្ហាញតំបន់ទេសចរណ៍បន្ថែម',
                  'Show More Destinations',
                  '加载更多旅游景点'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
