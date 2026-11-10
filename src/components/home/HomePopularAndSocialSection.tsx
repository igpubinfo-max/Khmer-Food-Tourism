import React, { useMemo } from 'react';
import { Heart, ChevronRight, Play } from 'lucide-react';
import type { FoodItem, Language } from '../../types';
import { resolveFoodPhotoUrl, handleFoodImageError } from '../../types';
import { tr } from '../../utils/i18n';
import { getLocalizedFood } from '../../utils/zhDynamicTranslator';

interface Props {
  language: Language;
  foods: FoodItem[];
  favoriteIds?: string[];
  onToggleFavorite?: (foodId: string) => void;
  onOpenFood: (food: FoodItem) => void;
  onSeeAllFoods: () => void;
  onOpenHealthyFood: () => void;
  onOpenAiAssistant: () => void;
  onOpenSocialReviews: (platform?: 'all' | 'tiktok' | 'facebook' | 'youtube') => void;
}

const HomePopularAndSocialSectionInner: React.FC<Props> = ({
  language,
  foods,
  favoriteIds = [],
  onToggleFavorite,
  onOpenFood,
  onSeeAllFoods,
  onOpenHealthyFood,
  onOpenAiAssistant,
  onOpenSocialReviews,
}) => {
  // Select 3 signature popular Cambodian dishes (prioritizing Fish Amok, Grilled Chicken, Khmer Noodle Soup)
  const featuredThreeDishes = useMemo(() => {
    if (!foods || foods.length === 0) return [];
    const byId = new Map(foods.map((f) => [f.id, f]));
    const picks: FoodItem[] = [];

    const findMatch = (predicate: (f: FoodItem) => boolean) =>
      foods.find((f) => !picks.some((p) => p.id === f.id) && predicate(f));

    // 1. អាម៉ុកត្រី (Fish Amok)
    const amok =
      byId.get('food-1') ||
      findMatch((f) => /អាម៉ុក|amok/i.test(`${f.nameKh} ${f.nameEn}`));
    if (amok) picks.push(amok);

    // 2. មាន់អាំង (Grilled Chicken)
    const grilledChicken =
      byId.get('food-21') ||
      findMatch((f) => /មាន់អាំង|មាន់ដុត|grilled chicken/i.test(`${f.nameKh} ${f.nameEn}`));
    if (grilledChicken && !picks.some((p) => p.id === grilledChicken.id)) {
      picks.push(grilledChicken);
    }

    // 3. គុយទាវខ្មែរ (Khmer Kuy Teav Noodle Soup)
    const kuyTeav =
      byId.get('food-36') ||
      byId.get('food-6') ||
      findMatch((f) => /គុយទាវ|kuy teav|noodle soup/i.test(`${f.nameKh} ${f.nameEn}`));
    if (kuyTeav && !picks.some((p) => p.id === kuyTeav.id)) {
      picks.push(kuyTeav);
    }

    for (const f of foods) {
      if (picks.length >= 3) break;
      if (!picks.some((p) => p.id === f.id)) {
        picks.push(f);
      }
    }
    return picks.slice(0, 3);
  }, [foods]);

  const socialPreviewCards = useMemo(
    () => [
      {
        id: 'tiktok-preview',
        platform: 'tiktok' as const,
        badgeLabel: 'TikTok',
        badgeBg: 'bg-black/85 text-white',
        thumb: '/foods/food-19.jpg',
        title: tr(language, 'សាច់អាំងផ្សាររាត្រី', 'Night Market BBQ', '夜市烧烤测评'),
      },
      {
        id: 'facebook-preview',
        platform: 'facebook' as const,
        badgeLabel: 'Facebook',
        badgeBg: 'bg-[#1877F2]/90 text-white',
        thumb: '/welcome/places.webp',
        title: tr(language, 'ទេសចរណ៍មាត់ទន្លេ', 'Riverfront Sunset', '河畔日落探店'),
      },
      {
        id: 'youtube-preview',
        platform: 'youtube' as const,
        badgeLabel: 'YouTube',
        badgeBg: 'bg-[#FF0000]/90 text-white',
        thumb: '/foods/food-21.jpg',
        title: tr(language, 'ម្ហូបតាមផ្លូវខ្មែរ', 'Khmer Street Food', '高棉街头美食'),
      },
    ],
    [language]
  );

  return (
    <div className="space-y-3">
      {/* 1. ម្ហូបពេញនិយមនៅកម្ពុជា (3 Square Dish Photo Cards) */}
      {featuredThreeDishes.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="font-khmer font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
              {tr(language, 'ម្ហូបពេញនិយមនៅកម្ពុជា', 'Popular Dishes in Cambodia', '柬埔寨热门美食')}
            </h3>
            <button
              type="button"
              onClick={onSeeAllFoods}
              className="inline-flex items-center gap-0.5 text-xs font-bold text-slate-700 dark:text-emerald-300 hover:text-[#064E3B] transition cursor-pointer"
            >
              <span>{tr(language, 'មើលទាំងអស់', 'See all', '查看全部')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {featuredThreeDishes.map((food) => {
              const loc = getLocalizedFood(food, language);
              const isFav = favoriteIds.includes(food.id);
              // Short crisp display name matching the reference card style
              const shortKhName =
                food.id === 'food-1'
                  ? 'អាម៉ុកត្រី'
                  : food.id === 'food-21'
                  ? 'មាន់អាំង'
                  : food.id === 'food-36' || food.id === 'food-6'
                  ? 'គុយទាវខ្មែរ'
                  : loc.name;
              const displayTitle = language === 'km' ? shortKhName : loc.name;

              return (
                <div
                  key={food.id}
                  onClick={() => onOpenFood(food)}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-sm border border-slate-200/80 dark:border-slate-700 cursor-pointer active:scale-[0.97] transition"
                >
                  <img
                    src={resolveFoodPhotoUrl(food.photoUrl, food.photoUpdatedAt, 320, food.id)}
                    onError={(e) => handleFoodImageError(e, food.id, food.photoUrl)}
                    alt={displayTitle}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.78) 100%)',
                    }}
                  />

                  {/* Top-right Heart Icon */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleFavorite) {
                        onToggleFavorite(food.id);
                      } else {
                        onOpenFood(food);
                      }
                    }}
                    aria-label="Favorite"
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-xs flex items-center justify-center text-white transition cursor-pointer"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
                  </button>

                  {/* Bottom Centered Dish Title */}
                  <div className="absolute inset-x-1.5 bottom-2 text-center">
                    <span
                      className="font-khmer font-extrabold text-xs sm:text-[13px] text-white line-clamp-1"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                    >
                      {displayTitle}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. Two Wide Pastel Feature Banners Side-by-Side (ម្ហូបសុខភាព & ជំនួយការ AI ម្ហូបអាហារ) */}
      <section className="grid grid-cols-2 gap-2.5">
        {/* Left Green Pastel Banner: ម្ហូបសុខភាព */}
        <button
          type="button"
          onClick={onOpenHealthyFood}
          style={{
            background: 'linear-gradient(135deg, #D9F39B 0%, #B8E66E 55%, #9AD64D 100%)',
          }}
          className="group relative rounded-2xl p-2.5 flex items-center gap-2.5 text-left shadow-xs border border-[#96D14B]/60 overflow-hidden active:scale-[0.97] transition cursor-pointer"
        >
          <span className="w-10 h-10 rounded-full bg-[#2E8B3C] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            {/* Leaf Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8Z" />
            </svg>
          </span>
          <span className="font-khmer font-extrabold text-xs sm:text-sm text-[#0F291E] leading-snug line-clamp-2">
            {tr(language, 'ម្ហូបសុខភាព', 'Healthy Food', '健康养生美食')}
          </span>
        </button>

        {/* Right Sky-Blue Pastel Banner: ជំនួយការ AI ម្ហូបអាហារ */}
        <button
          type="button"
          onClick={onOpenAiAssistant}
          style={{
            background: 'linear-gradient(135deg, #D4F1FE 0%, #B3E5FC 55%, #90D8FA 100%)',
          }}
          className="group relative rounded-2xl p-2.5 flex items-center gap-2.5 text-left shadow-xs border border-[#7CCDF7]/60 overflow-hidden active:scale-[0.97] transition cursor-pointer"
        >
          <span className="w-10 h-10 rounded-full bg-[#1E78D6] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            {/* Chat Bubble Dots Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.5 3 2 6.58 2 11c0 2.52 1.46 4.77 3.75 6.25L4.5 21l4.28-2.14c1.02.28 2.1.44 3.22.44 5.5 0 10-3.58 10-8s-4.5-8-10-8zm-4 9a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm4 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm4 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
            </svg>
          </span>
          <span className="font-khmer font-extrabold text-xs sm:text-sm text-[#0F172A] leading-snug line-clamp-2">
            {tr(language, 'ជំនួយការ AI ម្ហូបអាហារ', 'AI Food Assistant', 'AI 美食助手')}
          </span>
        </button>
      </section>

      {/* 3. [TikTok] [Facebook] [YouTube] Review ម្ហូប និងដំណើរកម្សាន្ត > Section */}
      <section className="rounded-3xl p-3 bg-[#FCFBF5] dark:bg-slate-800/95 border border-amber-200/70 dark:border-slate-700 shadow-sm space-y-2.5">
        {/* Header Row with TikTok, Facebook, and YouTube Icons */}
        <div
          onClick={() => onOpenSocialReviews('all')}
          className="flex items-center justify-between gap-2 cursor-pointer group"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {/* TikTok Icon */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSocialReviews('tiktok');
              }}
              title="TikTok Reviews"
              className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center shrink-0 shadow-2xs hover:scale-105 transition cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
              </svg>
            </button>

            {/* Facebook Icon */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSocialReviews('facebook');
              }}
              title="Facebook Reviews"
              className="w-7 h-7 rounded-full bg-[#1877F2] text-white flex items-center justify-center shrink-0 shadow-2xs hover:scale-105 transition cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.12 5.32H17V2.14A26.11 26.11 0 0 0 14.26 2c-2.72 0-4.58 1.66-4.58 4.7v2.62H6.61v3.56h3.07V22h3.68v-9.12h3.06l.46-3.56h-3.52V6.65c0-1.05.29-1.73 1.76-1.73Z" />
              </svg>
            </button>

            {/* YouTube Icon */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSocialReviews('youtube');
              }}
              title="YouTube Reviews"
              className="w-7 h-7 rounded-lg bg-[#FF0000] text-white flex items-center justify-center shrink-0 shadow-2xs hover:scale-105 transition cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.56 31.56 0 0 0 0 12a31.56 31.56 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.56 31.56 0 0 0 24 12a31.56 31.56 0 0 0-.5-5.81zM9.54 15.57V8.43L15.82 12l-6.28 3.57z" />
              </svg>
            </button>

            <h3 className="font-khmer font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate ml-1">
              {tr(
                language,
                'Review ម្ហូប និងដំណើរកម្សាន្ត',
                'Food & Travel Video Reviews',
                '美食与旅游视频测评'
              )}
            </h3>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300 shrink-0 group-hover:translate-x-0.5 transition" />
        </div>

        {/* 3 Video Thumbnail Cards */}
        <div className="grid grid-cols-3 gap-2">
          {socialPreviewCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onOpenSocialReviews(card.platform)}
              className="group relative h-24 sm:h-28 rounded-2xl overflow-hidden bg-slate-900 shadow-xs border border-slate-200/60 dark:border-slate-700 cursor-pointer active:scale-[0.97] transition"
            >
              <img
                src={card.thumb}
                alt={card.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/15" />

              {/* Platform Badge */}
              <span
                className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold leading-none shadow-2xs ${card.badgeBg}`}
              >
                {card.badgeLabel}
              </span>

              {/* Centered Play Button Circle */}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-9 h-9 rounded-full bg-black/55 border-2 border-white/90 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </span>
              </span>

              {/* Short Caption at Bottom */}
              <span className="absolute inset-x-1.5 bottom-1.5 text-center font-khmer font-bold text-[10px] text-white truncate">
                {card.title}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export const HomePopularAndSocialSection = React.memo(HomePopularAndSocialSectionInner);
