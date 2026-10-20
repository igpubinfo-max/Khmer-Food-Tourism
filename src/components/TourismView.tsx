import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TouristCard } from './TouristCard';
import { Compass, Sparkles, MapPin } from 'lucide-react';
import { DestinationCategorySlug } from '../types';

export const TourismView: React.FC = () => {
  const { destinations, language, searchQuery, selectedProvince, setSelectedProvince } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', nameKh: 'ទាំងអស់', nameEn: 'All' },
    { id: 'temple', nameKh: 'ប្រាសាទបុរាណ', nameEn: 'Temples' },
    { id: 'nature', nameKh: 'ធម្មជាតិ & ទឹកធ្លាក់', nameEn: 'Nature & Falls' },
    { id: 'beach', nameKh: 'កោះ & ឆ្នេរសមុទ្រ', nameEn: 'Islands & Beaches' },
    { id: 'mountain', nameKh: 'ភ្នំ & ឧទ្យានជាតិ', nameEn: 'Mountains' },
  ];

  const filteredDestinations = destinations.filter((d) => {
    // category filter
    if (selectedCategory !== 'all' && d.categorySlug !== selectedCategory) {
      return false;
    }
    // province filter
    if (selectedProvince && !d.provinceKh.includes(selectedProvince)) {
      return false;
    }
    // search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = d.nameKh.toLowerCase().includes(q) || d.nameEn.toLowerCase().includes(q);
      const matchDesc = d.descriptionKh.toLowerCase().includes(q) || d.descriptionEn.toLowerCase().includes(q);
      const matchProv = d.provinceKh.toLowerCase().includes(q) || d.provinceEn.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchProv) return false;
    }
    return true;
  });

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-4 pb-24">
      {/* Title Bar */}
      <div>
        <h2 className="font-moul text-sm sm:text-base text-[#183326] dark:text-stone-100 flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#228B4E]" />
          <span>{language === 'km' ? 'តំបន់ទេសចរណ៍ស្រស់ត្រកាល' : 'Scenic Destinations'}</span>
        </h2>
        <p className="text-[11px] text-stone-500 font-khmer">
          {language === 'km' 
            ? `មានទីតាំងទេសចរណ៍ចំនួន ${filteredDestinations.length} កន្លែង` 
            : `Showing ${filteredDestinations.length} travel spots`}
        </p>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 font-khmer">
        {categories.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition font-medium ${
                active
                  ? 'bg-[#14532D] text-white font-bold shadow-xs border border-[#34A853]'
                  : 'bg-white dark:bg-stone-800 text-[#183326] dark:text-stone-300 border border-[#A7DCA5]/60 hover:bg-[#EAF6EC]'
              }`}
            >
              {language === 'km' ? cat.nameKh : cat.nameEn}
            </button>
          );
        })}
      </div>

      {/* Destination List */}
      {filteredDestinations.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-stone-800 rounded-3xl border border-[#A7DCA5]/40 dark:border-stone-700 space-y-2 font-khmer">
          <Compass className="w-8 h-8 mx-auto text-stone-300" />
          <p className="text-xs text-stone-500 font-medium">
            {language === 'km' ? 'មិនមានតំបន់ទេសចរណ៍ដែលត្រូវគ្នានឹងការស្វែងរកទេ' : 'No destinations match your criteria'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDestinations.map((dest) => (
            <TouristCard key={dest.id} destination={dest} />
          ))}
        </div>
      )}
    </div>
  );
};
