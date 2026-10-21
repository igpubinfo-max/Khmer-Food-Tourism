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
    { id: 'trending_social', nameKh: '🔥 ល្បីលើ TikTok & FB', nameEn: '🔥 TikTok & FB Viral' },
    { id: 'temple', nameKh: 'ប្រាសាទបុរាណ', nameEn: 'Temples' },
    { id: 'nature', nameKh: 'ធម្មជាតិ & ទឹកធ្លាក់', nameEn: 'Nature & Falls' },
    { id: 'beach', nameKh: 'កោះ & ឆ្នេរសមុទ្រ', nameEn: 'Islands & Beaches' },
    { id: 'mountain', nameKh: 'ភ្នំ & ឧទ្យានជាតិ', nameEn: 'Mountains' },
  ];

  const filteredDestinations = destinations.filter((d) => {
    // category filter
    if (selectedCategory === 'trending_social') {
      if (!d.isTrendingSocial) return false;
    } else if (selectedCategory !== 'all' && d.categorySlug !== selectedCategory) {
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
        <h2 className="font-moul text-sm sm:text-base text-[#0F172A] dark:text-white flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#059669]" />
          <span>{language === 'km' ? 'តំបន់ទេសចរណ៍ស្រស់ត្រកាល' : 'Scenic Destinations'}</span>
        </h2>
        <p className="text-[11px] text-slate-500 font-khmer">
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
                  ? 'bg-[#064E3B] text-white font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {language === 'km' ? cat.nameKh : cat.nameEn}
            </button>
          );
        })}
      </div>

      {/* Destination List */}
      {filteredDestinations.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2 font-khmer shadow-xs">
          <Compass className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs text-slate-500 font-medium">
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
