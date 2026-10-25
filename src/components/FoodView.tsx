import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import {
  FoodItem,
  KHMER_FOOD_PRIMARY_CATEGORIES,
  KhmerFoodPrimaryGroup,
  classifyKhmerFoodPrimaryGroup,
  organizeAndDeduplicateFoods
} from '../types';
import { Utensils } from 'lucide-react';
import { DISH_PROVINCES, detectDishProvince } from '../utils/foodFilters';
import { TAG_FILTERS, TAG_ESTIMATE_NOTE, GENERAL_FOOD_INFO_NOTE, matchesTagFilter, TagFilterId } from '../utils/dishTags';
import { TAG_FILTER_EVENT, consumePendingTagFilter } from '../utils/smartHub';
import { tr } from '../utils/i18n';
import { getLocalizedFood } from '../utils/zhDynamicTranslator';

const PAGE_BATCH_SIZE = 48;

export const FoodView: React.FC = () => {
  const { foods, language, searchQuery, setSearchQuery } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_BATCH_SIZE);
  const [provinceFilter, setProvinceFilter] = useState<string>('');
  // A tag chosen in the Smart Menu before this screen mounted (in-memory handoff, no storage)
  const [initialTag] = useState<TagFilterId | null>(() => consumePendingTagFilter());
  const [tagFilter, setTagFilter] = useState<TagFilterId>(initialTag ?? 'all');
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const isKm = language === 'km';


  // Smart Menu -> Food tab: pre-select the exact tag and show all matching dishes
  useEffect(() => {
    if (initialTag) setSearchQuery('');
    const onTag = (e: Event) => {
      const id = (e as CustomEvent<TagFilterId>).detail;
      consumePendingTagFilter();
      setTagFilter(id);
      setSelectedCategory('all');
      setProvinceFilter('');
      setSearchQuery('');
    };
    window.addEventListener(TAG_FILTER_EVENT, onTag);
    return () => window.removeEventListener(TAG_FILTER_EVENT, onTag);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_BATCH_SIZE);
  }, [selectedCategory, searchQuery, provinceFilter, tagFilter]);

  // Deduplicate and sort all dishes in exact category order: សម្ល -> ឆា -> ស្ងោរ -> បង្អែម
  const organizedFoods = useMemo(() => organizeAndDeduplicateFoods(foods), [foods]);

  // Count dishes in each primary group
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: organizedFoods.length,
      samlor: 0,
      cha: 0,
      sngor: 0,
      bong_aem: 0,
    };
    for (const f of organizedFoods) {
      const grp = classifyKhmerFoodPrimaryGroup(f);
      counts[grp] = (counts[grp] || 0) + 1;
    }
    return counts;
  }, [organizedFoods]);

  // Ordered exactly as requested: សម្ល, ឆា, ស្ងោរ, បង្អែម
  const categories = [
    { id: 'all', nameKh: 'ទាំងអស់', nameEn: 'All Menus', nameZh: '全部菜品', emoji: '🍽️' },
    { id: 'samlor', nameKh: '១. សម្ល', nameEn: '1. Samlor (Soup/Curry)', nameZh: '1. 传统汤与咖喱', emoji: '🍲' },
    { id: 'cha', nameKh: '២. ឆា', nameEn: '2. Cha (Stir-Fry)', nameZh: '2. 风味热炒', emoji: '🥘' },
    { id: 'sngor', nameKh: '៣. ស្ងោរ', nameEn: '3. Sngor (Boiled Soup)', nameZh: '3. 清炖鲜汤', emoji: '🥣' },
    { id: 'bong_aem', nameKh: '៤. បង្អែម', nameEn: '4. Bong Aem (Dessert)', nameZh: '4. 高棉甜品', emoji: '🍨' },
  ];

  const sectionZhMeta: Record<KhmerFoodPrimaryGroup, { titleZh: string; subtitleZh: string }> = {
    samlor: { titleZh: '1. 高棉传统浓汤与咖喱 (Samlor)', subtitleZh: '正宗高棉浓汤、阿莫克与红绿咖喱' },
    cha: { titleZh: '2. 高棉风味小炒与烤物 (Cha)', subtitleZh: '香茅热炒、摇摇牛肉、炙烤与凉拌菜' },
    sngor: { titleZh: '3. 清炖鲜汤、米粉与主食 (Sngor)', subtitleZh: '酸汤、清汤、高棉米粉与特色饭面' },
    bong_aem: { titleZh: '4. 传统高棉甜品与糕点 (Bong Aem)', subtitleZh: '椰奶甜汤、传统糕点与特色饮品' },
  };

  const filteredFoods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return organizedFoods.filter((f) => {
      if (!matchesTagFilter(f, tagFilter)) return false;
      if (provinceFilter && detectDishProvince(f) !== provinceFilter) return false;
      if (selectedCategory !== 'all') {
        const grp = classifyKhmerFoodPrimaryGroup(f);
        if (grp !== selectedCategory && f.categorySlug !== selectedCategory) {
          return false;
        }
      }
      if (q) {
        const loc = getLocalizedFood(f, 'zh');
        const matchName =
          f.nameKh.toLowerCase().includes(q) ||
          f.nameEn.toLowerCase().includes(q) ||
          loc.name.toLowerCase().includes(q);
        const matchDesc =
          f.descriptionKh.toLowerCase().includes(q) ||
          f.descriptionEn.toLowerCase().includes(q) ||
          loc.description.toLowerCase().includes(q);
        const matchIng = f.ingredients.some(
          i => i.nameKh.toLowerCase().includes(q) || i.nameEn.toLowerCase().includes(q)
        );
        if (!matchName && !matchDesc && !matchIng) return false;
      }
      return true;
    });
  }, [organizedFoods, selectedCategory, searchQuery, provinceFilter, tagFilter]);

  // Provinces that actually appear in dish names/descriptions (no empty filter options)
  const provinceOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of organizedFoods) {
      const id = detectDishProvince(f);
      if (id) counts.set(id, (counts.get(id) || 0) + 1);
    }
    return DISH_PROVINCES.filter((p) => counts.has(p.id)).map((p) => ({ ...p, count: counts.get(p.id) || 0 }));
  }, [organizedFoods]);

  const hasActiveFilters = selectedCategory !== 'all' || Boolean(provinceFilter) || tagFilter !== 'all' || Boolean(searchQuery.trim());
  const resetAllFilters = () => {
    setSelectedCategory('all');
    setProvinceFilter('');
    setTagFilter('all');
    setSearchQuery('');
  };

  useEffect(() => {
    const node = loadMoreTriggerRef.current;
    if (!node || visibleCount >= filteredFoods.length) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(filteredFoods.length, prev + PAGE_BATCH_SIZE));
        }
      },
      { rootMargin: '320px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, filteredFoods.length]);

  const displayedFoods = useMemo(
    () => filteredFoods.slice(0, visibleCount),
    [filteredFoods, visibleCount]
  );

  // Group displayedFoods by primary category in exact order: សម្ល, ឆា, ស្ងោរ, បង្អែម
  const groupedDisplayedSections = useMemo(() => {
    const map: Record<KhmerFoodPrimaryGroup, FoodItem[]> = {
      samlor: [],
      cha: [],
      sngor: [],
      bong_aem: [],
    };
    for (const f of displayedFoods) {
      const grp = classifyKhmerFoodPrimaryGroup(f);
      map[grp].push(f);
    }
    return KHMER_FOOD_PRIMARY_CATEGORIES
      .map((meta) => ({
        meta,
        items: map[meta.id],
        totalInCategory: categoryCounts[meta.id] || 0,
      }))
      .filter((sec) => sec.items.length > 0);
  }, [displayedFoods, categoryCounts]);

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-4 pb-24">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-moul text-sm sm:text-base text-[#0F172A] dark:text-white flex items-center gap-2">
            <Utensils className="w-4 h-4 text-[#059669]" />
            <span>
              {tr(language, 'វិចិត្រសាលមុខម្ហូបខ្មែរ (100+ មុខ)', 'Khmer Food Collection (100+ Dishes)', '高棉美食大全（100+ 道正宗菜品）')}
            </span>
          </h2>
          <p className="text-[11px] text-slate-500 font-khmer">
            {tr(
              language,
              `បង្ហាញ ${filteredFoods.length} លើ ${foods.length} មុខម្ហូបខ្មែរពិតៗ`,
              `Showing ${filteredFoods.length} of ${foods.length} authentic dishes`,
              `当前显示 ${filteredFoods.length} / ${foods.length} 道正宗高棉菜品`
            )}
          </p>
        </div>

        {/* Admin entry removed from Food tab: Admin Dashboard opens only from Profile */}
      </div>



      {/* Ordered Primary Category Pills: ទាំងអស់ | ១. សម្ល | ២. ឆា | ៣. ស្ងោរ | ៤. បង្អែម */}
      <div className="bg-white dark:bg-slate-800/90 p-2 rounded-2xl border border-emerald-500/20 shadow-2xs space-y-2 font-khmer">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-[#064E3B] dark:text-emerald-300">
            {tr(
              language,
              '📂 បញ្ជីមុខម្ហូបតាមផ្នែក (សម្ល • ឆា • ស្ងោរ • បង្អែម)៖',
              '📂 Browse by Category (Samlor • Cha • Sngor • Dessert):',
              '📂 按分类浏览菜品（浓汤 • 热炒 • 清炖 • 甜品）：'
            )}
          </span>
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            {organizedFoods.length} {tr(language, 'មុខម្ហូប', 'dishes', '道菜品')}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {categories.map((cat) => {
            const active = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] ?? 0;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all duration-150 cursor-pointer border ${
                  active
                    ? 'bg-gradient-to-b from-[#064E3B] to-[#047857] text-white font-black border-amber-400 shadow-sm scale-[1.02]'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-emerald-50/60'
                }`}
              >
                <span className="text-sm leading-none mb-1">{cat.emoji}</span>
                <span className="text-[10px] sm:text-[11px] leading-tight truncate w-full">
                  {tr(language, cat.nameKh, cat.nameEn.split(' (')[0], cat.nameZh)}
                </span>
                <span
                  className={`mt-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                    active ? 'bg-amber-400 text-slate-950' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Foods Grid Grouped by Category in Order: សម្ល -> ឆា -> ស្ងោរ -> បង្អែម */}
      {/* Dish tag filter (estimated from the recipe) */}
      <div className="space-y-1.5 font-khmer">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
          {TAG_FILTERS.map((t) => {
            const active = tagFilter === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTagFilter(t.id)}
                aria-pressed={active}
                className={`shrink-0 min-h-[44px] px-3.5 rounded-full text-sm font-bold border transition cursor-pointer ${
                  active
                    ? 'bg-[#064E3B] text-white border-[#064E3B]'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                }`}
              >
                {t.emoji} {tr(language, t.labelKh, t.labelEn, t.labelZh)}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400">
          ℹ️ {tr(language, TAG_ESTIMATE_NOTE.km, TAG_ESTIMATE_NOTE.en, TAG_ESTIMATE_NOTE.zh)}
        </p>
      </div>

      {/* Province filter with ONE reset button */}
      <div className="grid grid-cols-1 gap-2 font-khmer">
        <label className="block">
          <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
            📍 {tr(language, 'ខេត្ត', 'Province', '省份')}
          </span>
          <select
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className="w-full min-h-[44px] px-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-sm text-slate-900 dark:text-white"
          >
            <option value="">{tr(language, 'គ្រប់ខេត្ត', 'All provinces', '全部省份')}</option>
            {provinceOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {tr(language, p.kh, p.en, p.zh)} ({p.count})
              </option>
            ))}
          </select>
        </label>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetAllFilters}
            className="min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold active:scale-[0.98] transition cursor-pointer"
          >
            ↺ {tr(language, 'កំណត់តម្រងឡើងវិញ', 'Reset filters', '重置筛选')}
          </button>
        )}
      </div>

      {filteredFoods.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2 font-khmer shadow-xs">
          <Utensils className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs text-slate-500 font-medium">
            {tr(language, 'មិនមានមុខម្ហូបដែលត្រូវគ្នានឹងការស្វែងរកទេ', 'No matching dishes found', '未找到匹配的菜品')}
          </p>
          <p className="text-[11px] text-slate-400">
            {tr(language, 'សូមប្រើប៊ូតុង «កំណត់តម្រងឡើងវិញ» ខាងលើ', 'Use the "Reset filters" button above', '请使用上方“重置筛选”按钮')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedDisplayedSections.map((section) => {
            const zhMeta = sectionZhMeta[section.meta.id];
            return (
              <div key={section.meta.id} className="space-y-2.5">
                {/* Category Section Banner Header */}
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-[#064E3B] via-[#047857] to-emerald-700 text-white shadow-sm border border-emerald-400/30 font-khmer">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-lg shrink-0 border border-white/20">
                      {section.meta.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[10px] font-black">
                          {tr(language, `ផ្នែកទី ${section.meta.order}`, `Category #${section.meta.order}`, `第 ${section.meta.order} 类`)}
                        </span>
                        <h3 className="font-moul text-xs sm:text-sm text-white truncate">
                          {tr(language, section.meta.shortNameKh, section.meta.nameEn, zhMeta?.titleZh || section.meta.nameEn)}
                        </h3>
                      </div>
                      <p className="text-[10px] text-emerald-100 truncate mt-0.5">
                        {tr(language, section.meta.subtitleKh, section.meta.subtitleEn, zhMeta?.subtitleZh || section.meta.subtitleEn)}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold shrink-0 border border-white/25">
                    {section.totalInCategory} {tr(language, 'មុខ', 'items', '道菜')}
                  </span>
                </div>

                {/* Dishes in this category */}
                <div className="grid grid-cols-1 gap-4">
                  {section.items.map((food) => (
                    <FoodCard key={food.id} food={food} />
                  ))}
                </div>
              </div>
            );
          })}

          {visibleCount < filteredFoods.length && (
            <div ref={loadMoreTriggerRef} className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => Math.min(filteredFoods.length, prev + PAGE_BATCH_SIZE))}
                className="px-4 py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-bold shadow-sm font-khmer cursor-pointer transition"
              >
                {tr(
                  language,
                  `បង្ហាញមុខម្ហូបបន្ថែម (${displayedFoods.length} / ${filteredFoods.length})`,
                  `Show More Dishes (${displayedFoods.length} / ${filteredFoods.length})`,
                  `加载更多菜品 (${displayedFoods.length} / ${filteredFoods.length})`
                )}
              </button>
            </div>
          )}
        </div>
      )}

      <p className="text-center text-[11px] text-slate-400 font-khmer pt-2">
        {tr(language, GENERAL_FOOD_INFO_NOTE.km, GENERAL_FOOD_INFO_NOTE.en, GENERAL_FOOD_INFO_NOTE.zh)}
      </p>
    </div>
  );
};
