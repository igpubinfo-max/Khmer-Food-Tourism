import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import { FoodImageModal } from './FoodImageModal';
import { FoodItem } from '../types';
import { Utensils, Plus, Sparkles, Globe, Check } from 'lucide-react';
import { searchOnlineFoodImages, OnlineFoodImageCandidate } from '../services/onlineFoodImageService';

const PAGE_BATCH_SIZE = 24;

export const FoodView: React.FC = () => {
  const { foods, updateFood, showToast, language, searchQuery, setSearchQuery, currentUser, setIsAdminOpen } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_BATCH_SIZE);
  const [showOnlineSearchPanel, setShowOnlineSearchPanel] = useState<boolean>(true);
  const [selectedFoodIdForOnline, setSelectedFoodIdForOnline] = useState<string>('');
  const [isSearchingOnline, setIsSearchingOnline] = useState<boolean>(false);
  const [onlineCandidates, setOnlineCandidates] = useState<OnlineFoodImageCandidate[]>([]);
  const [editingFoodModal, setEditingFoodModal] = useState<FoodItem | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const isKm = language === 'km';

  const activeFoodForOnline = useMemo(() => {
    if (selectedFoodIdForOnline) {
      const found = foods.find((f) => f.id === selectedFoodIdForOnline);
      if (found) return found;
    }
    return foods[0] || null;
  }, [foods, selectedFoodIdForOnline]);

  const handleRunOnlineFoodSearch = async (targetFood?: FoodItem | null) => {
    const food = targetFood || activeFoodForOnline;
    if (!food) return;
    setShowOnlineSearchPanel(true);
    setSelectedFoodIdForOnline(food.id);
    setIsSearchingOnline(true);
    try {
      const results = await searchOnlineFoodImages({
        nameKh: food.nameKh,
        nameEn: food.nameEn,
        categorySlug: food.categorySlug,
        existingUrls: food.photoUrl ? [food.photoUrl] : [],
      });
      setOnlineCandidates(results);
      if (results.length > 0) {
        showToast(
          isKm
            ? `✨ រកឃើញរូបភាពម្ហូបពី Online ចំនួន ${results.length} សន្លឹកសម្រាប់ «${food.nameKh}»!`
            : `✨ Found ${results.length} online photos for "${food.nameEn}"!`,
          'success'
        );
      }
    } catch {
      showToast(
        isKm ? 'មិនអាចស្វែងរករូបភាពពី Online បានទេ' : 'Failed to search online food photos',
        'warning'
      );
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handleApplyCandidatePhoto = (cand: OnlineFoodImageCandidate) => {
    if (!activeFoodForOnline) return;
    updateFood({
      ...activeFoodForOnline,
      photoUrl: cand.url,
      imageAuditStatus: 'verified',
      imageAuditNote: `រូបភាពជ្រើសរើសពី Online (${cand.source})`,
    });
    showToast(
      isKm
        ? `✅ បានប្តូររូបភាព «${activeFoodForOnline.nameKh}» ពី Online រួចរាល់!`
        : `✅ Updated photo for "${activeFoodForOnline.nameEn}"!`,
      'success'
    );
  };

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

      {/* Prominent Online Food Photo Auto-Search Card (ឥតគិតថ្លៃ $0) - ADMIN ONLY per Requirement #1 */}
      {currentUser?.role === 'admin' && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#064E3B] via-emerald-900 to-teal-900 text-white border-2 border-amber-400/60 shadow-lg space-y-2.5 font-khmer">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-amber-300 leading-snug">
                  {isKm
                    ? 'ស្វែងរក និងប្តូររូបភាពម្ហូបពី Online ដោយស្វ័យប្រវត្តិ (Admin)'
                    : 'Auto-Search & Match Food Photos Online (Admin)'}
                </h3>
                <p className="text-[10px] text-emerald-200">
                  {isKm
                    ? 'Wikimedia Commons • TheMealDB • ឥតគិតថ្លៃ $0'
                    : 'Wikimedia Commons • TheMealDB • 100% Free ($0)'}
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black shrink-0">
              {isKm ? 'ឥតគិតថ្លៃ $0' : 'FREE $0'}
            </span>
          </div>

          <button
            type="button"
            disabled={isSearchingOnline}
            onClick={() => handleRunOnlineFoodSearch(activeFoodForOnline)}
            className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer"
          >
            <Sparkles className={`w-4 h-4 text-slate-950 shrink-0 ${isSearchingOnline ? 'animate-spin' : ''}`} />
            <span>
              {isSearchingOnline
                ? (isKm ? 'កំពុងស្វែងរករូបភាពម្ហូបពី Online...' : 'Searching online food photos...')
                : (isKm
                    ? '🤖 ស្វែងរករូបភាពម្ហូបពី Online ដោយស្វ័យប្រវត្តិ (ឥតគិតថ្លៃ $0)'
                    : '🤖 Auto-Search Matching Food Photos Online (Free $0)')}
            </span>
          </button>

          {showOnlineSearchPanel && activeFoodForOnline && (
            <div className="pt-2 border-t border-white/15 space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={activeFoodForOnline.id}
                  onChange={(e) => {
                    const nextFood = foods.find((f) => f.id === e.target.value);
                    setSelectedFoodIdForOnline(e.target.value);
                    if (nextFood) {
                      handleRunOnlineFoodSearch(nextFood);
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900/90 border border-emerald-400/40 text-white text-xs font-bold focus:outline-none"
                >
                  {foods.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nameKh} ({f.nameEn})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setEditingFoodModal(activeFoodForOnline)}
                  className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-amber-200 font-bold text-[11px] border border-amber-300/30 transition cursor-pointer shrink-0"
                >
                  {isKm ? '⚙️ បើកផ្ទាំងគ្រប់គ្រងរូបពេញ' : '⚙️ Open Full Photo Editor'}
                </button>
              </div>

              {onlineCandidates.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-amber-200">
                    {isKm
                      ? `✨ រកឃើញរូបភាពម្ហូបពី Online ចំនួន ${onlineCandidates.length} សន្លឹកសម្រាប់ «${activeFoodForOnline.nameKh}» (ចុចជ្រើសរើស)៖`
                      : `✨ Found ${onlineCandidates.length} matching photos for "${activeFoodForOnline.nameEn}" (tap to apply):`}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {onlineCandidates.map((cand, idx) => {
                      const isSelected = activeFoodForOnline.photoUrl === cand.url;
                      return (
                        <button
                          key={`${cand.url}-${idx}`}
                          type="button"
                          onClick={() => handleApplyCandidatePhoto(cand)}
                          className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition cursor-pointer group ${
                            isSelected
                              ? 'border-amber-400 ring-2 ring-amber-400/50'
                              : 'border-white/20 hover:border-amber-300'
                          }`}
                        >
                          <img
                            src={cand.url}
                            alt={cand.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                          />
                          <div className="absolute bottom-0 inset-x-0 bg-black/75 text-white text-[9px] px-1.5 py-0.5 truncate">
                            {cand.source}
                          </div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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

      {editingFoodModal && (
        <FoodImageModal
          food={editingFoodModal}
          isOpen={Boolean(editingFoodModal)}
          onClose={() => setEditingFoodModal(null)}
          onSave={(updated) => {
            updateFood(updated);
            setEditingFoodModal(null);
            showToast(
              isKm ? '✅ បានរក្សាទុករូបភាពមុខម្ហូបរួចរាល់!' : '✅ Food photo saved!',
              'success'
            );
          }}
          isKm={isKm}
        />
      )}
    </div>
  );
};
