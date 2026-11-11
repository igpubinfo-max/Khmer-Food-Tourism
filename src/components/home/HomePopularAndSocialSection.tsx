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

const LAST_POPULAR_3_STORAGE_KEY = 'kft_last_popular_3_dish_ids_v1';
let sessionPopular3DishIds: string[] | null = null;

function selectSessionRandomThreeDishes(foods: FoodItem[]): FoodItem[] {
  if (!foods || foods.length === 0) return [];
  const byId = new Map(foods.map((f) => [f.id, f]));

  // Keep the 3 chosen dishes stable within the current app launch session
  if (sessionPopular3DishIds && sessionPopular3DishIds.length === 3) {
    const resolved = sessionPopular3DishIds
      .map((id) => byId.get(id))
      .filter((f): f is FoodItem => Boolean(f));
    if (resolved.length === 3) return resolved;
  }

  let previousSessionIds = new Set<string>();
  try {
    const raw = localStorage.getItem(LAST_POPULAR_3_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        previousSessionIds = new Set(parsed.filter((id): id is string => typeof id === 'string'));
      }
    }
  } catch {
    // ignore storage errors
  }

  // Prefer dishes with photos from the existing food database
  const withPhotos = foods.filter((f) => Boolean(f.photoUrl && f.photoUrl.trim()));
  const basePool = withPhotos.length >= 3 ? withPhotos : foods;

  // Exclude previous session's 3 dishes whenever possible
  const nonRepeatingPool = basePool.filter((f) => !previousSessionIds.has(f.id));
  const candidatePool = nonRepeatingPool.length >= 3 ? nonRepeatingPool : basePool;

  // Fisher-Yates shuffle using crypto.getRandomValues when available for true per-launch randomness
  const shuffled = [...candidatePool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    let rand = Math.random();
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      const buf = new Uint32Array(1);
      window.crypto.getRandomValues(buf);
      rand = buf[0] / (0xffffffff + 1);
    }
    const j = Math.floor(rand * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const picks: FoodItem[] = [];
  for (const item of shuffled) {
    if (picks.length >= 3) break;
    if (!picks.some((p) => p.id === item.id)) {
      picks.push(item);
    }
  }

  // Fallback if nonRepeatingPool had < 3 unique items
  if (picks.length < 3) {
    for (const item of basePool) {
      if (picks.length >= 3) break;
      if (!picks.some((p) => p.id === item.id)) {
        picks.push(item);
      }
    }
  }

  sessionPopular3DishIds = picks.map((p) => p.id);
  try {
    localStorage.setItem(LAST_POPULAR_3_STORAGE_KEY, JSON.stringify(sessionPopular3DishIds));
  } catch {
    // ignore storage errors
  }

  return picks;
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
  // Display 3 food images randomly on every app launch, avoiding repeating the previous session's 3 dishes
  const featuredThreeDishes = useMemo(() => selectSessionRandomThreeDishes(foods), [foods]);

  const socialPreviewCards = useMemo(
    () => [
      {
        id: 'tiktok-preview',
        platform: 'tiktok' as const,
        badgeLabel: 'TikTok',
        badgeBg: 'bg-black/90 text-white border border-white/20',
        thumb: '/foods/food-19.jpg',
        title: tr(language, 'សាច់អាំងផ្សាររាត្រី', 'Night Market BBQ', '夜市烧烤测评'),
      },
      {
        id: 'facebook-preview',
        platform: 'facebook' as const,
        badgeLabel: 'Facebook',
        badgeBg: 'bg-[#1877F2] text-white',
        thumb: '/foods/food-36.jpg',
        title: tr(language, 'គុយទាវខ្មែររសជាតិដើម', 'Authentic Khmer Noodle Soup', '正宗高棉粿条探店'),
      },
      {
        id: 'youtube-preview',
        platform: 'youtube' as const,
        badgeLabel: 'YouTube',
        badgeBg: 'bg-[#FF0000] text-white',
        thumb: '/foods/food-18.jpg',
        title: tr(language, 'បង្គាអាំង និងម្ហូបខ្មែរ', 'Grilled Prawns & Khmer Dishes', '高棉烤大虾与街头美食'),
      },
    ],
    [language]
  );

  return (
    <div className="space-y-3">
      {/* 1. ម្ហូបពេញនិយមនៅកម្ពុជា (3 Horizontal Food Photo Cards) */}
      {featuredThreeDishes.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {/* Vibrant Flame Icon */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12.5 2C12.5 2 18.5 7 18.5 13C18.5 17.14 15.14 20.5 11 20.5C6.86 20.5 4.5 17.14 4.5 13.5C4.5 10.5 6.8 8 6.8 8C6.8 8 6.5 10.2 8.2 11C7.8 7.5 10 4.2 12.5 2Z"
                  fill="url(#kftHomeFlameGrad)"
                />
                <path
                  d="M11.2 11.5C11.2 11.5 14.5 13.8 14.5 16.8C14.5 18.84 12.93 20.5 11 20.5C9.07 20.5 7.5 18.84 7.5 16.8C7.5 14.8 9.2 13.2 11.2 11.5Z"
                  fill="#FDE047"
                />
                <defs>
                  <linearGradient id="kftHomeFlameGrad" x1="11.5" y1="2" x2="11.5" y2="20.5" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FB923C" />
                    <stop offset="55%" stopColor="#F97316" />
                    <stop offset="100%" stopColor="#DC2626" />
                  </linearGradient>
                </defs>
              </svg>
              <h3
                className="font-khmer font-extrabold text-[#0F172A] leading-[1.68] py-0.5 break-words"
                style={{ fontSize: 'clamp(15.6px, 4.32vw, 19.2px)' }}
              >
                {tr(language, 'ម្ហូបពេញនិយមនៅកម្ពុជា', 'Popular Dishes in Cambodia', '柬埔寨热门美食')}
              </h3>
            </div>
            <button
              type="button"
              onClick={onSeeAllFoods}
              className="px-3 py-1 rounded-full bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs inline-flex items-center gap-0.5 text-xs font-khmer font-extrabold text-slate-800 transition active:scale-95 cursor-pointer shrink-0"
            >
              <span>{tr(language, 'មើលទាំងអស់', 'See all', '查看全部')}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {featuredThreeDishes.map((food) => {
              const loc = getLocalizedFood(food, language);
              const isFav = favoriteIds.includes(food.id);
              const shortKhName =
                food.id === 'food-1'
                  ? 'អាម៉ុកត្រី'
                  : food.id === 'food-21' || food.id === 'food-118'
                  ? 'មាន់អាំង'
                  : food.id === 'food-36' || food.id === 'food-6'
                  ? 'គុយទាវខ្មែរ'
                  : food.nameKh.replace(/\s*\([^)]*\)\s*/g, '').trim() || food.nameKh;
              const displayTitle = language === 'km' ? shortKhName : loc.name;

              return (
                <div
                  key={food.id}
                  onClick={() => onOpenFood(food)}
                  className="group relative aspect-[1/0.94] rounded-2xl overflow-hidden bg-slate-200 shadow-sm border-2 border-white cursor-pointer active:scale-[0.97] transition"
                >
                  <img
                    src={resolveFoodPhotoUrl(food.photoUrl, food.photoUpdatedAt, 320, food.id)}
                    alt={loc.name}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => handleFoodImageError(e, food.id, food.photoUrl)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Bottom Dark Gradient Overlay for Crisp White Khmer Label */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.82) 100%)',
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
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/35 hover:bg-black/55 border border-white/30 backdrop-blur-xs flex items-center justify-center text-white transition cursor-pointer"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
                  </button>

                  {/* Bottom Centered Dish Title */}
                  <div className="absolute inset-x-1 bottom-1.5 text-center">
                    <span
                      className="font-khmer font-extrabold text-white leading-[1.72] py-0.5 line-clamp-1 block"
                      style={{ fontSize: 'clamp(12.6px, 3.48vw, 16.2px)', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
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

      {/* 2. Two Attractive Horizontal Feature Banners Side-by-Side (ម្ហូបសុខភាព & ជំនួយការ AI ម្ហូបអាហារ) */}
      <section className="grid grid-cols-1 min-[350px]:grid-cols-2 gap-2.5">
        {/* Left Green Banner: ម្ហូបសុខភាព with Leaf Icon & Healthy Food Bowl Photo */}
        <button
          type="button"
          onClick={onOpenHealthyFood}
          style={{
            background: 'linear-gradient(135deg, #E3F9B3 0%, #BCEB74 55%, #9AD94B 100%)',
            boxShadow: '0 4px 14px rgba(22, 101, 52, 0.12)',
          }}
          className="group relative rounded-2xl p-2 flex items-center justify-between gap-1.5 text-left border-2 border-white overflow-hidden active:scale-[0.97] transition cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#248232] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66l.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8Z" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <div
                className="font-khmer font-extrabold text-[#0F291E] leading-[1.68] py-0.5 break-words"
                style={{ fontSize: 'clamp(13.8px, 3.72vw, 16.2px)' }}
              >
                {tr(language, 'ម្ហូបសុខភាព', 'Healthy Food', '健康养生美食')}
              </div>
              <div
                className="font-khmer font-bold text-[#1E4620]/95 leading-[1.65] py-0.5 break-words line-clamp-2"
                style={{ fontSize: 'clamp(11.4px, 3.12vw, 13.2px)' }}
              >
                {tr(language, 'ជ្រើសរើសម្ហូបបំប៉នសុខភាព', 'Nutritious guide', '精选营养健康餐')}
              </div>
            </div>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-white shadow-xs shrink-0 bg-emerald-100">
            <img
              src="/foods/food-13.jpg"
              alt="Healthy Food"
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>
        </button>

        {/* Right Light-Blue Banner: ជំនួយការ AI ម្ហូបអាហារ with Chat Icon & AI Robot Mascot */}
        <button
          type="button"
          onClick={onOpenAiAssistant}
          style={{
            background: 'linear-gradient(135deg, #DEF3FF 0%, #B8E4FF 55%, #8FD3FA 100%)',
            boxShadow: '0 4px 14px rgba(30, 64, 175, 0.12)',
          }}
          className="group relative rounded-2xl p-2 flex items-center justify-between gap-1.5 text-left border-2 border-white overflow-hidden active:scale-[0.97] transition cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1570EF] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.5 3 2 6.58 2 11c0 2.52 1.46 4.77 3.75 6.25L4.5 21l4.28-2.14c1.02.28 2.1.44 3.22.44 5.5 0 10-3.58 10-8s-4.5-8-10-8zm-4 9a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm4 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm4 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <div
                className="font-khmer font-extrabold text-[#0F172A] leading-[1.68] py-0.5 break-words"
                style={{ fontSize: 'clamp(13.8px, 3.72vw, 16.2px)' }}
              >
                {tr(language, 'ជំនួយការ AI ម្ហូបអាហារ', 'AI Food Assistant', 'AI 美食助手')}
              </div>
            </div>
          </div>
          {/* 3D-Styled Cute AI Robot Illustration */}
          <svg className="w-10 h-10 shrink-0 drop-shadow-xs group-hover:scale-105 transition-transform" viewBox="0 0 48 48" fill="none">
            <line x1="24" y1="4" x2="24" y2="9" stroke="#1570EF" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="24" cy="3.5" r="2.2" fill="#38BDF8" stroke="#1570EF" strokeWidth="1.2" />
            <rect x="9" y="9" width="30" height="22" rx="10" fill="#FFFFFF" stroke="#93C5FD" strokeWidth="1.8" />
            <rect x="13" y="13" width="22" height="14" rx="6" fill="#0F172A" />
            <circle cx="19" cy="19.5" r="2.3" fill="#38BDF8" />
            <circle cx="29" cy="19.5" r="2.3" fill="#38BDF8" />
            <path d="M21 23.5c.9.8 1.9 1.2 3 1.2s2.1-.4 3-1.2" stroke="#38BDF8" strokeWidth="1.6" strokeLinecap="round" />
            <rect x="6" y="16" width="3" height="8" rx="1.5" fill="#1570EF" />
            <rect x="39" y="16" width="3" height="8" rx="1.5" fill="#1570EF" />
            <path d="M15 33h18c2.2 0 4 1.8 4 4v5H11v-5c0-2.2 1.8-4 4-4Z" fill="#FFFFFF" stroke="#93C5FD" strokeWidth="1.6" />
            <circle cx="24" cy="38" r="2.2" fill="#38BDF8" />
          </svg>
        </button>
      </section>

      {/* 3. Premium Dark Navy Rounded Section: [TikTok] [Facebook] [YouTube] | Review ម្ហូប និងដំណើរកម្សាន្ត > */}
      <section
        style={{
          background: 'linear-gradient(180deg, #1E2D4A 0%, #131E33 100%)',
          boxShadow: '0 8px 22px rgba(15, 23, 42, 0.22)',
        }}
        className="rounded-[24px] p-3 border border-slate-700/80 space-y-2.5"
      >
        {/* Header Row with TikTok, Facebook, YouTube Icons + Divider + Title */}
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
              className="w-7 h-7 rounded-full bg-black border border-white/15 text-white flex items-center justify-center shrink-0 shadow-2xs hover:scale-105 transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
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

            {/* Vertical Divider */}
            <span className="h-4 w-px bg-white/30 mx-1 shrink-0" aria-hidden="true" />

            <h3
              className="font-khmer font-extrabold text-white leading-[1.68] py-0.5 break-words"
              style={{ fontSize: 'clamp(13.2px, 3.72vw, 16.8px)' }}
            >
              {tr(
                language,
                'Review ម្ហូប និងដំណើរកម្សាន្ត',
                'Food & Travel Video Reviews',
                '美食与旅游视频测评'
              )}
            </h3>
          </div>

          <ChevronRight className="w-4 h-4 text-white shrink-0 group-hover:translate-x-0.5 transition" />
        </div>

        {/* 3 Video Thumbnail Cards */}
        <div className="grid grid-cols-3 gap-2">
          {socialPreviewCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onOpenSocialReviews(card.platform)}
              className="group relative h-24 sm:h-28 rounded-2xl overflow-hidden bg-slate-900 shadow-xs border border-white/30 cursor-pointer active:scale-[0.97] transition"
            >
              <img
                src={card.thumb}
                alt={card.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-black/15" />

              {/* Platform Badge */}
              <span
                className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-extrabold leading-none inline-flex items-center gap-1 shadow-2xs ${card.badgeBg}`}
              >
                {card.platform === 'tiktok' && (
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                )}
                <span>{card.badgeLabel}</span>
              </span>

              {/* Centered Play Button Circle */}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-9 h-9 rounded-full bg-black/50 border-2 border-white/90 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export const HomePopularAndSocialSection = React.memo(HomePopularAndSocialSectionInner);
