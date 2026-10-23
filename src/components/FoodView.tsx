import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import { FoodCategorySlug } from '../types';
import { Search, Utensils, Plus, Sparkles } from 'lucide-react';

const PAGE_BATCH_SIZE = 24;

export const FoodView: React.FC = () => {
  const { foods, language, searchQuery, setSearchQuery, currentUser, setIsAdminOpen } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_BATCH_SIZE);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const isKm = language === 'km';

  useEffect(() => {
    setVisibleCount(PAGE_BATCH_SIZE);
  }, [selectedCategory, searchQuery]);

  const categories = [
    { id: 'all', nameKh: 'ទាំងអស់', nameEn: 'All Foods' },
    { id: 'dessert', nameKh: 'បង្អែមខ្មែរ', nameEn: 'Khmer Desserts' },
    { id: 'cake', nameKh: 'នំខ្មែរ & អាហារសម្រន់', nameEn: 'Traditional Cakes & Snacks' },
    { id: 'rice', nameKh: 'ម្ហូបបាយ', nameEn: 'Rice Dishes' },
    { id: 'noodles', nameKh: 'មី គុយទាវ & នំបញ្ចុក', nameEn: 'Noodle Dishes' },
    { id: 'soup', nameKh: 'ស៊ុប សម្ល & បបរ', nameEn: 'Soups & Porridges' },
    { id: 'grilled', nameKh: 'ម្ហូបអាំង ចៀន & ចំហុយ', nameEn: 'Grilled & Steamed' },
    { id: 'stirfry', nameKh: 'ម្ហូបឆា', nameEn: 'Stir-fried' },
    { id: 'salad', nameKh: 'ញាំ ភ្លា & ទឹកគ្រឿង', nameEn: 'Salads & Dips' },
    { id: 'specialty', nameKh: 'មុខម្ហូបពិសេស', nameEn: 'Specialties' },
  ];

  const filteredFoods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return foods.filter((f) => {
      if (selectedCategory !== 'all' && f.categorySlug !== selectedCategory) {
        return false;
      }
      if (q) {
        const matchName = f.nameKh.toLowerCase().includes(q) || f.nameEn.toLowerCase().includes(q);
        const matchDesc = f.descriptionKh.toLowerCase().includes(q) || f.descriptionEn.toLowerCase().includes(q);
        const matchIng = f.ingredients.some(i => i.nameKh.toLowerCase().includes(q) || i.nameEn.toLowerCase().includes(q));
        if (!matchName && !matchDesc && !matchIng) return false;
      }
      return true;
    });
  }, [foods, selectedCategory, searchQuery]);

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

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-4 pb-24">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-moul text-sm sm:text-base text-[#0F172A] dark:text-white flex items-center gap-2">
            <Utensils className="w-4 h-4 text-[#059669]" />
            <span>{isKm ? 'វិចិត្រសាលមុខម្ហូបខ្មែរ (100+ មុខ)' : 'Khmer Food Collection (100+ Dishes)'}</span>
          </h2>
          <p className="text-[11px] text-slate-500 font-khmer">
            {isKm 
              ? `បង្ហាញ ${filteredFoods.length} លើ ${foods.length} មុខម្ហូបខ្មែរពិតៗ` 
              : `Showing ${filteredFoods.length} of ${foods.length} authentic dishes`}
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setIsAdminOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white font-bold text-xs shadow-xs font-khmer transition"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-200" />
            <span>{isKm ? 'បញ្ចូលម្ហូប' : 'Add Food'}</span>
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 font-khmer">
        {categories.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all duration-150 font-medium ${
                active
                  ? 'bg-[#064E3B] text-white font-bold shadow-xs scale-102'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {isKm ? cat.nameKh : cat.nameEn}
            </button>
          );
        })}
      </div>

      {/* Foods Grid */}
      {filteredFoods.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2 font-khmer shadow-xs">
          <Utensils className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs text-slate-500 font-medium">
            {isKm ? 'មិនមានមុខម្ហូបដែលត្រូវគ្នានឹងការស្វែងរកទេ' : 'No matching dishes found'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3 py-1 text-xs text-[#064E3B] font-bold hover:underline"
            >
              {isKm ? 'សម្អាតការស្វែងរក' : 'Clear search'}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {displayedFoods.map((food) => (
              <FoodCard key={food.id} food={food} />
            ))}
          </div>

          {visibleCount < filteredFoods.length && (
            <div ref={loadMoreTriggerRef} className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => Math.min(filteredFoods.length, prev + PAGE_BATCH_SIZE))}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#064E3B] dark:text-emerald-400 shadow-2xs font-khmer"
              >
                {isKm
                  ? `បង្ហាញមុខម្ហូបបន្ថែម (${displayedFoods.length} / ${filteredFoods.length})`
                  : `Show More Dishes (${displayedFoods.length} / ${filteredFoods.length})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
