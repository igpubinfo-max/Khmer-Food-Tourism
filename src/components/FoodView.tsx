import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FoodCard } from './FoodCard';
import { FoodCategorySlug } from '../types';
import { Search, Utensils, Plus, Sparkles } from 'lucide-react';

export const FoodView: React.FC = () => {
  const { foods, language, searchQuery, setSearchQuery, currentUser, setIsAdminOpen } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const isKm = language === 'km';

  const categories = [
    { id: 'all', nameKh: 'ទាំងអស់', nameEn: 'All Foods' },
    { id: 'soup', nameKh: 'សម្ល & អាម៉ុក', nameEn: 'Soups & Amok' },
    { id: 'grilled', nameKh: 'ម្ហូបអាំង', nameEn: 'Grilled & BBQ' },
    { id: 'stirfry', nameKh: 'ម្ហូបឆា', nameEn: 'Stir-fried' },
    { id: 'salad', nameKh: 'ញាំ & ភ្លា', nameEn: 'Salads & Dips' },
    { id: 'noodles', nameKh: 'គុយទាវ & នំបញ្ចុក', nameEn: 'Noodles' },
    { id: 'rice', nameKh: 'ម្ហូបបាយ & បបរ', nameEn: 'Rice Dishes' },
    { id: 'dessert', nameKh: 'នំ & បង្អែម', nameEn: 'Desserts' },
    { id: 'specialty', nameKh: 'មុខម្ហូបពិសេស', nameEn: 'Specialties' },
  ];

  const filteredFoods = foods.filter((f) => {
    // category filter
    if (selectedCategory !== 'all' && f.categorySlug !== selectedCategory) {
      return false;
    }
    // search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = f.nameKh.toLowerCase().includes(q) || f.nameEn.toLowerCase().includes(q);
      const matchDesc = f.descriptionKh.toLowerCase().includes(q) || f.descriptionEn.toLowerCase().includes(q);
      const matchIng = f.ingredients.some(i => i.nameKh.toLowerCase().includes(q) || i.nameEn.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchIng) return false;
    }
    return true;
  });

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-4 pb-24">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-moul text-sm sm:text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Utensils className="w-4 h-4 text-amber-600" />
            <span>{isKm ? 'វិចិត្រសាលមុខម្ហូបខ្មែរ (100+ មុខ)' : 'Khmer Food Collection (100+ Dishes)'}</span>
          </h2>
          <p className="text-[11px] text-stone-500 font-khmer">
            {isKm 
              ? `បង្ហាញ ${filteredFoods.length} លើ ${foods.length} មុខម្ហូបខ្មែរពិតៗ` 
              : `Showing ${filteredFoods.length} of ${foods.length} authentic dishes`}
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setIsAdminOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs font-khmer"
          >
            <Plus className="w-3.5 h-3.5" />
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
                  ? 'bg-amber-600 text-white font-bold shadow-xs scale-102'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-amber-50'
              }`}
            >
              {isKm ? cat.nameKh : cat.nameEn}
            </button>
          );
        })}
      </div>

      {/* Foods Grid */}
      {filteredFoods.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 space-y-2 font-khmer">
          <Utensils className="w-8 h-8 mx-auto text-stone-300" />
          <p className="text-xs text-stone-500 font-medium">
            {isKm ? 'មិនមានមុខម្ហូបដែលត្រូវគ្នានឹងការស្វែងរកទេ' : 'No matching dishes found'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3 py-1 text-xs text-amber-600 font-bold hover:underline"
            >
              {isKm ? 'សម្អាតការស្វែងរក' : 'Clear search'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredFoods.map((food) => (
            <FoodCard key={food.id} food={food} />
          ))}
        </div>
      )}
    </div>
  );
};
