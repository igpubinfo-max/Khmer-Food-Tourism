import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TouristCard } from './TouristCard';
import { Compass, Sparkles, MapPin, Globe, Loader2, Plus } from 'lucide-react';
import { DestinationCategorySlug } from '../types';
import {
  searchCambodiaPlacesWithSmartCache,
  convertGooglePlaceToDestination,
  findDuplicateDestinationForGooglePlace,
  GooglePlaceCachedItem,
} from '../services/googlePlacesService';

const TOURISM_BATCH_SIZE = 20;

export const TourismView: React.FC = () => {
  const {
    destinations,
    language,
    currentUser,
    searchQuery,
    selectedProvince,
    setSelectedProvince,
    addDestination,
    showToast,
    openGoogleMapsSearchModal,
    importGooglePlaceToApp,
  } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(TOURISM_BATCH_SIZE);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);
  const [smartCacheTourism, setSmartCacheTourism] = useState<GooglePlaceCachedItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  useEffect(() => {
    setVisibleCount(TOURISM_BATCH_SIZE);
  }, [selectedCategory, selectedProvince, searchQuery]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSmartCacheTourism([]);
      setIsSearchingOnline(false);
      return;
    }

    let cancelled = false;
    setIsSearchingOnline(true);
    const timer = setTimeout(async () => {
      const res = await searchCambodiaPlacesWithSmartCache(
        q,
        selectedProvince || 'ទាំងអស់',
        'tourism'
      );
      if (!cancelled) {
        setSmartCacheTourism(res.results);
        setIsSearchingOnline(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedProvince]);

  const categories = [
    { id: 'all', nameKh: 'ទាំងអស់', nameEn: 'All' },
    { id: 'trending_social', nameKh: '🔥 ល្បីលើ TikTok & FB', nameEn: '🔥 TikTok & FB Viral' },
    { id: 'temple', nameKh: 'ប្រាសាទបុរាណ', nameEn: 'Temples' },
    { id: 'nature', nameKh: 'ធម្មជាតិ & ទឹកធ្លាក់', nameEn: 'Nature & Falls' },
    { id: 'beach', nameKh: 'កោះ & ឆ្នេរសមុទ្រ', nameEn: 'Islands & Beaches' },
    { id: 'mountain', nameKh: 'ភ្នំ & ឧទ្យានជាតិ', nameEn: 'Mountains' },
  ];

  const filteredDestinations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return destinations.filter((d) => {
      if (selectedCategory === 'trending_social') {
        if (!d.isTrendingSocial) return false;
      } else if (selectedCategory !== 'all' && d.categorySlug !== selectedCategory) {
        return false;
      }
      if (selectedProvince && !d.provinceKh.includes(selectedProvince)) {
        return false;
      }
      if (q) {
        const matchName = d.nameKh.toLowerCase().includes(q) || d.nameEn.toLowerCase().includes(q);
        const matchDesc = d.descriptionKh.toLowerCase().includes(q) || d.descriptionEn.toLowerCase().includes(q);
        const matchProv = d.provinceKh.toLowerCase().includes(q) || d.provinceEn.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchProv) return false;
      }
      return true;
    });
  }, [destinations, selectedCategory, selectedProvince, searchQuery]);

  const displayedDestinations = useMemo(
    () => filteredDestinations.slice(0, visibleCount),
    [filteredDestinations, visibleCount]
  );

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
      { rootMargin: '320px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, filteredDestinations.length]);

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-4 pb-24">
      {/* Title Bar */}
      <div className="flex items-center justify-between gap-2">
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

        <button
          type="button"
          onClick={() => openGoogleMapsSearchModal('tourism')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-bold text-xs shadow-xs font-khmer transition active:scale-95 cursor-pointer shrink-0"
          title={language === 'km' ? 'ស្វែងរកតំបន់ទេសចរណ៍លើផែនទី Google Maps' : 'Search Tourist Attractions on Google Maps'}
        >
          <Globe className="w-3.5 h-3.5 text-emerald-200" />
          <span>{language === 'km' ? 'ស្វែងរកលើ Google Maps' : 'Google Maps'}</span>
        </button>
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
      {filteredDestinations.length === 0 && !isSearchingOnline && smartCacheTourism.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2 font-khmer shadow-xs">
          <Compass className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs text-slate-500 font-medium">
            {language === 'km' ? 'មិនមានតំបន់ទេសចរណ៍ដែលត្រូវគ្នានឹងការស្វែងរកទេ' : 'No destinations match your criteria'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedDestinations.map((dest) => (
            <TouristCard key={dest.id} destination={dest} />
          ))}
          {visibleCount < filteredDestinations.length && (
            <div ref={loadMoreTriggerRef} className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => Math.min(filteredDestinations.length, prev + TOURISM_BATCH_SIZE))}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#064E3B] dark:text-emerald-400 shadow-2xs font-khmer"
              >
                {language === 'km'
                  ? `បង្ហាញតំបន់ទេសចរណ៍បន្ថែម (${displayedDestinations.length} / ${filteredDestinations.length})`
                  : `Show More Destinations (${displayedDestinations.length} / ${filteredDestinations.length})`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Google Maps Places API + Smart Cache Tourism Results */}
      {searchQuery.trim().length >= 2 && (
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3 font-khmer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                លទ្ធផលតំបន់ទេសចរណ៍ពី Google Maps & Smart Cache
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold">
              ⚡ Smart Cache
            </span>
          </div>

          {isSearchingOnline ? (
            <div className="py-5 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>កំពុងស្វែងរកតំបន់ទេសចរណ៍ពី Google Maps...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {smartCacheTourism.map((place) => {
                const mappedDest = convertGooglePlaceToDestination(place);
                const existingDest = findDuplicateDestinationForGooglePlace(place, destinations);
                const alreadyInApp = Boolean(existingDest);
                return (
                  <div key={place.placeId} className="space-y-1.5">
                    <TouristCard destination={existingDest || mappedDest} />
                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => importGooglePlaceToApp(place, { category: 'tourism' })}
                        className={`w-full py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          alreadyInApp
                            ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                            : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          {alreadyInApp
                            ? '✓ មានក្នុងបញ្ជីរួចហើយ (ចុចដើម្បីធ្វើបច្ចុប្បន្នភាពទិន្នន័យ Google Maps)'
                            : '📥 នាំចូលតំបន់ទេសចរណ៍នេះចូលក្នុងកម្មវិធីអចិន្ត្រៃយ៍ (Import from Google Maps)'}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
