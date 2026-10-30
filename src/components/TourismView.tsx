import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TouristCard } from './TouristCard';
import { Compass } from 'lucide-react';
import { shuffleForCurrentSession } from '../utils/sessionShuffle';
import { tr } from '../utils/i18n';

const TOURISM_BATCH_SIZE = 20;

export const TourismView: React.FC = () => {
  const {
    destinations,
    language,
    selectedProvince,
  } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(TOURISM_BATCH_SIZE);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(TOURISM_BATCH_SIZE);
  }, [selectedCategory, selectedProvince]);

  const categories = [
    { id: 'all', nameKh: 'ទាំងអស់', nameEn: 'All', nameZh: '全部景点' },
    { id: 'trending_social', nameKh: 'កំពុងពេញនិយម', nameEn: 'Popular Now', nameZh: '热门打卡' },
    { id: 'temple', nameKh: 'ប្រាសាទបុរាណ', nameEn: 'Temples', nameZh: '古迹与寺庙' },
    { id: 'nature', nameKh: 'ធម្មជាតិ & ទឹកធ្លាក់', nameEn: 'Nature & Falls', nameZh: '自然生态与瀑布' },
    { id: 'beach', nameKh: 'កោះ & ឆ្នេរសមុទ្រ', nameEn: 'Islands & Beaches', nameZh: '海岛与海滩' },
    { id: 'mountain', nameKh: 'ភ្នំ & ឧទ្យានជាតិ', nameEn: 'Mountains', nameZh: '高山与国家公园' },
  ];

  const sessionShuffledDestinations = useMemo(
    () => shuffleForCurrentSession(destinations),
    [destinations]
  );

  const filteredDestinations = useMemo(() => {
    const cleanSelProv = (selectedProvince || '').replace(/^រាជធានី|^ខេត្ត/g, '').trim();
    return sessionShuffledDestinations.filter((d) => {
      if (selectedCategory === 'trending_social') {
        if (!d.isTrendingSocial) return false;
      } else if (selectedCategory !== 'all' && d.categorySlug !== selectedCategory) {
        return false;
      }
      if (cleanSelProv && !d.provinceKh.replace(/^រាជធានី|^ខេត្ត/g, '').includes(cleanSelProv)) {
        return false;
      }
      return true;
    });
  }, [sessionShuffledDestinations, selectedCategory, selectedProvince]);

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
      { root: document.getElementById('kft-main-scroll'), rootMargin: '320px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, filteredDestinations.length]);

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-4 pb-6">
      {/* Title Bar (Search removed — kept on Home Screen only) */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-moul text-sm sm:text-base text-[#0F172A] dark:text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#059669]" />
            <span>{tr(language, 'តំបន់ទេសចរណ៍ស្រស់ត្រកាល', 'Scenic Destinations', '柬埔寨著名旅游景点')}</span>
          </h2>
          <p className="text-[11px] text-slate-500 font-khmer">
            {tr(
              language,
              `មានទីតាំងទេសចរណ៍ចំនួន ${filteredDestinations.length} កន្លែង`,
              `Showing ${filteredDestinations.length} travel spots`,
              `当前显示 ${filteredDestinations.length} 个旅游景点`
            )}
          </p>
        </div>
      </div>

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

      {/* Destination List */}
      {filteredDestinations.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-2 font-khmer shadow-xs">
          <Compass className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs text-slate-500 font-medium">
            {tr(language, 'មិនមានតំបន់ទេសចរណ៍ក្នុងផ្នែកនេះទេ', 'No destinations match your criteria', '未找到符合条件的旅游景点')}
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
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#064E3B] dark:text-emerald-400 shadow-2xs font-khmer cursor-pointer"
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
  );
};
