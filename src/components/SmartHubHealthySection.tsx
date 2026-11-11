import React, { useMemo, useRef, useState } from 'react';
import { RefreshCw, ChevronRight, Lock, Crown, CheckCircle2, Utensils, Sun, Sunset, Moon, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { resolveFoodPhotoUrl, handleFoodImageError, type FoodItem } from '../types';
import { tr } from '../utils/i18n';
import {
  DISH_TAG_DEFS, getDishTagIds, tagBenefit, tagCookingTip, TAG_ESTIMATE_NOTE, GENERAL_FOOD_INFO_NOTE,
} from '../utils/dishTags';
import type { DishTagId } from '../utils/dishTags';
import { buildMealPlan } from '../utils/mealPlan';
import { hasSpecialAndHealthyFoodVipAccess } from '../utils/smartHub';
import { getLocalizedFood } from '../utils/zhDynamicTranslator';
import { DishTagIcon, IconDishCategory, IconHealthyLeaf } from './icons/HandcraftedIcons';

// The six tag cards (recipe-based estimates only: no health/medical claims)
const HUB_TAGS: DishTagId[] = ['light', 'steamed_boiled', 'grilled', 'vegetable_rich', 'protein_rich', 'vegetarian_friendly'];

const TAG_GRADIENTS: Record<DishTagId, string> = {
  light: 'linear-gradient(180deg, #FF9933 0%, #D94E08 100%)',
  steamed_boiled: 'linear-gradient(180deg, #2EA856 0%, #0D6630 100%)',
  grilled: 'linear-gradient(180deg, #F75977 0%, #C41D4B 100%)',
  vegetable_rich: 'linear-gradient(180deg, #3290FA 0%, #1254C7 100%)',
  protein_rich: 'linear-gradient(180deg, #F4B630 0%, #C67D0D 100%)',
  vegetarian_friendly: 'linear-gradient(180deg, #22AAA3 0%, #0E6769 100%)',
  fried: 'linear-gradient(180deg, #EA580C 0%, #9A3412 100%)',
  spicy: 'linear-gradient(180deg, #DC2626 0%, #991B1B 100%)',
  fish_sauce_prahok: 'linear-gradient(180deg, #7C3AED 0%, #4C1D95 100%)',
};

interface Props {
  foods: FoodItem[];
  onViewAll: (id: DishTagId) => void;
  onOpenFood: (food: FoodItem) => void;
  onUpgradeVip?: () => void;
}

/** Healthy dish tags: compact 2-column category cards, inline recommended dishes and a daily 3-meal idea (VIP-only). */
export const SmartHubHealthySection: React.FC<Props> = ({ foods, onViewAll, onOpenFood, onUpgradeVip }) => {
  const { language, currentUser, openUpgradeVipModal } = useApp();
  const canUseVip = hasSpecialAndHealthyFoodVipAccess(currentUser);
  const [selected, setSelected] = useState<DishTagId>('light');
  const [seed, setSeed] = useState(1);
  const recommendedRef = useRef<HTMLDivElement | null>(null);

  const handleSelectTag = (id: DishTagId) => {
    if (!canUseVip) {
      (onUpgradeVip || openUpgradeVipModal)();
      return;
    }
    setSelected(id);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        recommendedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  };

  // Matches per tag, best-rated & most representative first, photo-first so cards always look appetizing (computed only for verified VIP accounts)
  const byTag = useMemo(() => {
    const map: Record<string, FoodItem[]> = {};
    for (const id of HUB_TAGS) map[id] = [];
    if (!canUseVip) return map;
    for (const f of foods) {
      for (const id of getDishTagIds(f)) if (map[id]) map[id].push(f);
    }
    const getCategoryLeadScore = (tagId: DishTagId, item: FoodItem): number => {
      const kh = item.nameKh || '';
      const en = (item.nameEn || '').toLowerCase();
      if (tagId === 'steamed_boiled') {
        if (/ចំហុយ|ស្ងោរ|អាម៉ុក|ស្រុះ/.test(kh) || /\bsteamed\b(?!\s+(?:jasmine\s+)?rice\b)|\bpoached\b|\bamok\b/.test(en)) {
          return 3;
        }
        if (/ស៊ុប|សម្លប្រហើរ|បបរ|គុយទាវ/.test(kh)) return 2;
        return 1;
      }
      if (tagId === 'grilled') {
        return /អាំង|ដុត/.test(kh) ? 2 : 1;
      }
      if (tagId === 'vegetarian_friendly') {
        return item.categorySlug !== 'dessert' && item.categorySlug !== 'cake' ? 2 : 1;
      }
      return 1;
    };
    for (const id of HUB_TAGS) {
      map[id].sort(
        (a, b) =>
          Number(!!b.photoUrl) - Number(!!a.photoUrl) ||
          getCategoryLeadScore(id, b) - getCategoryLeadScore(id, a) ||
          (b.rating || 0) - (a.rating || 0) ||
          (b.reviewCount || 0) - (a.reviewCount || 0)
      );
    }
    return map;
  }, [foods, canUseVip]);

  const plan = useMemo(() => buildMealPlan(foods, seed, canUseVip), [foods, seed, canUseVip]);

  if (!canUseVip) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-moul text-sm text-[#064E3B] flex items-center gap-1.5">
              <IconHealthyLeaf className="w-4 h-4 shrink-0" />
              <span>{tr(language, 'មុខម្ហូបសុខភាព និងជម្រើសពិសេស', 'Healthy & Light Dishes', '健康轻食与特色菜品')}</span>
            </h3>
            <p className="text-xs text-slate-600">
              {tr(language, 'មុខងារពិសេសសម្រាប់សមាជិក VIP ប៉ុណ្ណោះ', 'Exclusive feature for VIP members only', 'VIP 会员专属功能')}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-extrabold inline-flex items-center gap-1 shadow-2xs shrink-0 border border-amber-300">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>VIP</span>
          </span>
        </div>

        <div className="p-3.5 rounded-[22px] bg-white text-slate-900 border border-slate-200/90 shadow-[0_5px_18px_rgba(15,23,42,0.06)] space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
              <Crown className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-extrabold mb-1">
                <Lock className="w-3 h-3 text-amber-600" />
                <span>{tr(language, 'សម្រាប់សមាជិក VIP', 'VIP Members Only', '仅限 VIP 会员')}</span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                {tr(
                  language,
                  'ដោះសោម៉ឺនុយពិសេស & ជម្រើសម្ហូបសុខភាព',
                  'Unlock Healthy Dish Filters & Meal Ideas',
                  '解锁特色菜单与健康饮食指南'
                )}
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {tr(
                  language,
                  'ដំឡើងទៅគណនី VIP ដើម្បីប្រើប្រាស់ស្លាកម្ហូបសុខភាពទាំង ៦ ប្រភេទ ឈុតម្ហូបសុខភាពប្រចាំថ្ងៃ ៣ ពេល និងមុខងារពិសេសទាំងអស់។',
                  'Upgrade to VIP to access all 6 healthy dish categories, daily balanced 3-meal ideas, and special food filters.',
                  '升级至 VIP 会员，即可使用全部 6 大健康菜品分类、每日均衡三餐搭配及特色美食筛选功能。'
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 min-[360px]:grid-cols-3 gap-2">
            {HUB_TAGS.map((id) => {
              const def = DISH_TAG_DEFS[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => (onUpgradeVip || openUpgradeVipModal)()}
                  style={{
                    background: TAG_GRADIENTS[id],
                    boxShadow: '0 4px 10px rgba(15, 23, 42, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.36)',
                  }}
                  className="group relative min-h-[74px] rounded-[16px] py-2 px-1.5 flex flex-col items-center justify-center gap-1 text-white transition active:scale-[0.96] cursor-pointer overflow-hidden"
                >
                  <span
                    className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%)',
                    }}
                  />
                  <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-[1px] rounded-full bg-black/25 border border-white/30 text-[8px] font-extrabold text-white flex items-center gap-0.5">
                    <Lock className="w-2 h-2 text-amber-300" />
                    <span>VIP</span>
                  </span>
                  <span className="relative z-10 flex items-center justify-center text-white drop-shadow-xs mt-1">
                    <DishTagIcon id={id} className="w-6 h-6 shrink-0" />
                  </span>
                  <span
                    className="relative z-10 font-khmer font-extrabold leading-[1.68] text-center break-words whitespace-normal w-full px-0.5 text-white"
                    style={{ fontSize: 'clamp(9.5px, 2.7vw, 11.5px)', textShadow: '0 1px 2px rgba(0,0,0,0.30)' }}
                  >
                    {tr(language, def.labelKh, def.labelEn, def.labelZh)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-1 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => (onUpgradeVip || openUpgradeVipModal)()}
              className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-105 text-slate-950 text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition cursor-pointer"
            >
              <Crown className="w-4 h-4" />
              <span>{tr(language, 'ដំឡើងទៅ VIP ឥឡូវនេះ', 'Upgrade to VIP Now', '立即升级 VIP')}</span>
            </button>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {tr(
                  language,
                  'បើកដំណើរការភ្លាមៗបន្ទាប់ពីផ្ទៀងផ្ទាត់ការទូទាត់',
                  'Instant access once your VIP subscription is verified',
                  'VIP 订阅验证通过后立即解锁全部功能'
                )}
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const selDef = DISH_TAG_DEFS[selected];
  const selList = byTag[selected] || [];
  const top = selList.slice(0, 6);
  const name = (f: FoodItem) => getLocalizedFood(f, language).name;

  const meals: Array<{ key: 'breakfast' | 'lunch' | 'dinner'; icon: React.ReactNode; label: string; food: FoodItem | null }> = [
    { key: 'breakfast', icon: <Sunset className="w-3.5 h-3.5 text-amber-500" />, label: tr(language, 'អាហារពេលព្រឹក', 'Breakfast', '早餐'), food: plan.breakfast },
    { key: 'lunch', icon: <Sun className="w-3.5 h-3.5 text-amber-500" />, label: tr(language, 'អាហារថ្ងៃត្រង់', 'Lunch', '午餐'), food: plan.lunch },
    { key: 'dinner', icon: <Moon className="w-3.5 h-3.5 text-indigo-500" />, label: tr(language, 'អាហារពេលល្ងាច', 'Dinner', '晚餐'), food: plan.dinner },
  ];

  return (
    <section className="space-y-2.5">
      <div>
        <h3 className="font-moul text-sm text-[#064E3B] flex items-center gap-1.5">
          <IconHealthyLeaf className="w-4 h-4 shrink-0" />
          <span>{tr(language, 'ស្លាកម្ហូបសុខភាព', 'Healthy Dish Tags', '健康菜品标签')}</span>
        </h3>
        <p className="text-xs text-slate-500">
          {tr(language, 'ជ្រើសរើសម្ហូបតាមស្លាក — ប៉ាន់ស្មានពីរូបមន្តប៉ុណ្ណោះ', 'Pick dishes by tag — estimated from the recipe only', '按标签挑选菜肴——仅根据食谱估算')}
        </p>
      </div>

      {/* 6 Colorful, Distinct Gradient Category Buttons (Matching Reference Image 2) */}
      <div className="rounded-[22px] bg-white p-2.5 sm:p-3 shadow-[0_5px_18px_rgba(15,23,42,0.06)] border border-slate-200/85">
        <div className="grid grid-cols-2 min-[360px]:grid-cols-3 gap-2 sm:gap-2.5">
          {HUB_TAGS.map((id) => {
            const def = DISH_TAG_DEFS[id];
            const list = byTag[id] || [];
            const isSel = id === selected;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectTag(id)}
                aria-pressed={isSel}
                style={{
                  background: TAG_GRADIENTS[id],
                  boxShadow: isSel
                    ? '0 6px 14px rgba(15, 23, 42, 0.22), 0 0 0 2.5px #064E3B, inset 0 1px 1px rgba(255, 255, 255, 0.45)'
                    : '0 4px 10px rgba(15, 23, 42, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.36)',
                }}
                className="group relative min-h-[76px] rounded-[16px] py-2 px-1.5 flex flex-col items-center justify-center gap-1 text-white active:scale-[0.96] transition cursor-pointer overflow-hidden"
              >
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 100%)',
                  }}
                />
                <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-[1px] rounded-full bg-black/25 border border-white/30 text-[8.5px] font-extrabold text-white">
                  {list.length}
                </span>
                <span className="relative z-10 flex items-center justify-center text-white drop-shadow-xs mt-1">
                  <DishTagIcon id={id} className="w-6 h-6 shrink-0" />
                </span>
                <span
                  className="relative z-10 font-khmer font-extrabold leading-[1.68] text-center break-words whitespace-normal w-full px-0.5 text-white"
                  style={{ fontSize: 'clamp(9.5px, 2.7vw, 11.5px)', textShadow: '0 1px 2px rgba(0,0,0,0.30)' }}
                >
                  {tr(language, def.labelKh, def.labelEn, def.labelZh)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inline recommended dishes */}
      <div ref={recommendedRef} className="p-3 rounded-2xl bg-white border border-slate-200 space-y-2.5">
        <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 flex-wrap">
          <DishTagIcon id={selected} className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{tr(language, 'ម្ហូបណែនាំក្នុងប្រភេទនេះ', 'Recommended Dishes in This Category', '本分类推荐菜品')}</span>
          <span className="font-semibold text-slate-500"> · {tr(language, selDef.labelKh, selDef.labelEn, selDef.labelZh)}</span>
        </h4>
        {top.length === 0 && (
          <p className="text-xs text-slate-500">{tr(language, 'មិនទាន់មានម្ហូបក្នុងប្រភេទនេះ', 'No dishes in this category yet', '该分类暂无菜品')}</p>
        )}
        <div className="grid grid-cols-1 gap-2">
          {top.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onOpenFood(f)}
              className="w-full flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-200 text-left active:scale-[0.98] transition motion-reduce:transition-none cursor-pointer"
            >
              <img src={resolveFoodPhotoUrl(f.photoUrl, f.photoUpdatedAt, 320, f.id)} onError={(e) => handleFoodImageError(e, f.id, f.photoUrl)} alt={name(f)} loading="lazy" decoding="async" className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-200" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 leading-snug line-clamp-2">{name(f)}</span>
                <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-extrabold">
                  <Utensils className="w-3 h-3 shrink-0" />
                  <span>{f.calories ?? '—'} {tr(language, 'គីឡូកាឡូរី', 'kcal', '千卡')}</span>
                </span>
                <span className="block mt-0.5 text-xs leading-snug text-slate-500 line-clamp-2">{tagCookingTip(selDef, language)}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
        {selList.length > 0 && (
          <button
            type="button"
            onClick={() => onViewAll(selected)}
            className="w-full min-h-[48px] rounded-xl bg-[#064E3B] hover:bg-emerald-800 text-white text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            {tr(
              language,
              `មើលម្ហូបទាំង ${selList.length} មុខក្នុងផ្ទាំងម្ហូប`,
              `View All ${selList.length} Dishes`,
              `查看全部 ${selList.length} 道菜`
            )}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Daily balanced 3-meal idea */}
      <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-emerald-50 border border-amber-200 space-y-2.5">
        <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
          <IconDishCategory className="w-4 h-4 shrink-0" />
          <span>{tr(language, 'ឈុតម្ហូបសុខភាពប្រចាំថ្ងៃ ៣ ពេល', 'Daily Balanced 3-Meal Idea', '每日均衡三餐搭配')}</span>
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {meals.map((m) => (
            <button
              key={m.key}
              type="button"
              disabled={!m.food}
              onClick={() => m.food && onOpenFood(m.food)}
              className="rounded-xl bg-white border border-slate-200 p-1.5 text-center cursor-pointer active:scale-[0.97] disabled:opacity-50"
            >
              <span className="inline-flex items-center justify-center gap-1 text-xs font-extrabold text-slate-600">
                {m.icon}
                <span>{m.label}</span>
              </span>
              {m.food ? (
                <>
                  <img src={resolveFoodPhotoUrl(m.food.photoUrl, m.food.photoUpdatedAt, 320, m.food.id)} onError={(e) => handleFoodImageError(e, m.food!.id, m.food!.photoUrl)} alt={name(m.food)} loading="lazy" decoding="async" className="mt-1 w-full aspect-square rounded-lg object-cover bg-slate-200" />
                  <span className="block mt-1 text-xs font-bold text-slate-900 leading-tight line-clamp-2 min-h-[30px]">{name(m.food)}</span>
                  <span className="inline-flex items-center justify-center gap-0.5 text-[11px] font-extrabold text-orange-600">
                    <Utensils className="w-3 h-3 shrink-0" />
                    <span>{m.food.calories} {tr(language, 'គីឡូកាឡូរី', 'kcal', '千卡')}</span>
                  </span>
                </>
              ) : (
                <span className="block mt-3 text-[11px] text-slate-400">—</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-emerald-800">
            {tr(language, `សរុបប្រហែល ${plan.totalKcal} គីឡូកាឡូរី`, `Total ≈ ${plan.totalKcal} kcal`, `合计约 ${plan.totalKcal} 千卡`)}
          </span>
          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            className="min-h-[44px] px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer active:scale-[0.97]"
          >
            <RefreshCw className="w-4 h-4" />
            {tr(language, 'ប្ដូរឈុតម្ហូបថ្មី', 'Shuffle Meal Plan', '换一套搭配')}
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 flex items-start gap-1">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          {tr(language, TAG_ESTIMATE_NOTE.km, TAG_ESTIMATE_NOTE.en, TAG_ESTIMATE_NOTE.zh)} ·{' '}
          {tr(language, GENERAL_FOOD_INFO_NOTE.km, GENERAL_FOOD_INFO_NOTE.en, GENERAL_FOOD_INFO_NOTE.zh)}
        </span>
      </p>
    </section>
  );
};
