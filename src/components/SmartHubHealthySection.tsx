import React, { useMemo, useRef, useState } from 'react';
import { RefreshCw, ChevronRight, Lock, Crown, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { FoodItem } from '../types';
import { tr } from '../utils/i18n';
import {
  DISH_TAG_DEFS, getDishTagIds, tagBenefit, tagCookingTip, TAG_ESTIMATE_NOTE, GENERAL_FOOD_INFO_NOTE,
} from '../utils/dishTags';
import type { DishTagId } from '../utils/dishTags';
import { buildMealPlan } from '../utils/mealPlan';
import { hasSpecialAndHealthyFoodVipAccess } from '../utils/smartHub';
import { getLocalizedFood } from '../utils/zhDynamicTranslator';

// The six tag cards (recipe-based estimates only: no health/medical claims)
const HUB_TAGS: DishTagId[] = ['light', 'steamed_boiled', 'grilled', 'vegetable_rich', 'protein_rich', 'vegetarian_friendly'];

const toneBg = (tone: 'green' | 'blue' | 'amber') =>
  tone === 'green'
    ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
    : tone === 'blue'
    ? 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200'
    : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200';

const toneRing = (tone: 'green' | 'blue' | 'amber') =>
  tone === 'green' ? 'border-emerald-600 ring-2 ring-emerald-500/40' : tone === 'blue' ? 'border-blue-600 ring-2 ring-blue-500/40' : 'border-amber-600 ring-2 ring-amber-500/40';

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

  // Matches per tag, best-rated first, photo-first so cards always look appetizing (computed only for verified VIP accounts)
  const byTag = useMemo(() => {
    const map: Record<string, FoodItem[]> = {};
    for (const id of HUB_TAGS) map[id] = [];
    if (!canUseVip) return map;
    for (const f of foods) {
      for (const id of getDishTagIds(f)) if (map[id]) map[id].push(f);
    }
    for (const id of HUB_TAGS) {
      map[id].sort((a, b) => Number(!!b.photoUrl) - Number(!!a.photoUrl) || (b.rating || 0) - (a.rating || 0) || (b.reviewCount || 0) - (a.reviewCount || 0));
    }
    return map;
  }, [foods, canUseVip]);

  const plan = useMemo(() => buildMealPlan(foods, seed, canUseVip), [foods, seed, canUseVip]);

  if (!canUseVip) {
    return (
      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-moul text-sm text-[#064E3B] dark:text-emerald-300 flex items-center gap-1.5">
              <span>🥗 {tr(language, 'ស្លាកម្ហូបសុខភាព & ម៉ឺនុយពិសេស', 'Special Food & Healthy Food', '特色菜单与健康饮食')}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tr(language, 'មុខងារពិសេសសម្រាប់សមាជិក VIP ប៉ុណ្ណោះ', 'Exclusive feature for VIP members only', 'VIP 会员专属功能')}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-slate-900 text-amber-300 text-xs font-extrabold inline-flex items-center gap-1 shadow-xs shrink-0 border border-amber-400/40">
            <Lock className="w-3.5 h-3.5" />
            <span>VIP</span>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-[#064E3B] to-slate-900 text-white border-2 border-amber-400/50 shadow-lg space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
              <Crown className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-[10px] font-extrabold mb-1">
                <Lock className="w-3 h-3" />
                <span>{tr(language, 'សម្រាប់សមាជិក VIP', 'VIP Members Only', '仅限 VIP 会员')}</span>
              </div>
              <h4 className="text-sm font-extrabold text-white leading-snug">
                {tr(
                  language,
                  'ដោះសោម៉ឺនុយពិសេស & ជម្រើសម្ហូបសុខភាព',
                  'Unlock Special Food & Healthy Food Menu',
                  '解锁特色菜单与健康饮食指南'
                )}
              </h4>
              <p className="text-xs text-emerald-100/90 mt-1 leading-relaxed">
                {tr(
                  language,
                  'ដំឡើងទៅគណនី VIP ដើម្បីប្រើប្រាស់ស្លាកម្ហូបសុខភាពទាំង ៦ ប្រភេទ ឈុតម្ហូបសុខភាពប្រចាំថ្ងៃ ៣ ពេល និងមុខងារពិសេសទាំងអស់។',
                  'Upgrade to VIP to access all 6 healthy dish categories, daily balanced 3-meal ideas, and special food filters.',
                  '升级至 VIP 会员，即可使用全部 6 大健康菜品分类、每日均衡三餐搭配及特色美食筛选功能。'
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-emerald-100">
            {HUB_TAGS.map((id) => {
              const def = DISH_TAG_DEFS[id];
              return (
                <div
                  key={id}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 flex items-center justify-between gap-1.5"
                >
                  <span className="truncate font-bold">
                    {def.emoji} {tr(language, def.labelKh, def.labelEn, def.labelZh)}
                  </span>
                  <Lock className="w-3 h-3 text-amber-300 shrink-0" />
                </div>
              );
            })}
          </div>

          <div className="pt-1 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => (onUpgradeVip || openUpgradeVipModal)()}
              className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-105 text-slate-950 text-sm font-extrabold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition cursor-pointer"
            >
              <Crown className="w-4 h-4" />
              <span>{tr(language, 'ដំឡើងទៅ VIP ឥឡូវនេះ', 'Upgrade to VIP Now', '立即升级 VIP')}</span>
            </button>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-200/90">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
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

  const meals: Array<{ key: 'breakfast' | 'lunch' | 'dinner'; emoji: string; label: string; food: FoodItem | null }> = [
    { key: 'breakfast', emoji: '🌅', label: tr(language, 'អាហារពេលព្រឹក', 'Breakfast', '早餐'), food: plan.breakfast },
    { key: 'lunch', emoji: '☀️', label: tr(language, 'អាហារថ្ងៃត្រង់', 'Lunch', '午餐'), food: plan.lunch },
    { key: 'dinner', emoji: '🌙', label: tr(language, 'អាហារពេលល្ងាច', 'Dinner', '晚餐'), food: plan.dinner },
  ];

  return (
    <section className="space-y-2.5">
      <div>
        <h3 className="font-moul text-sm text-[#064E3B] dark:text-emerald-300">
          🥗 {tr(language, 'ស្លាកម្ហូបសុខភាព', 'Healthy Dish Tags', '健康菜品标签')}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {tr(language, 'ជ្រើសរើសម្ហូបតាមស្លាក — ប៉ាន់ស្មានពីរូបមន្តប៉ុណ្ណោះ', 'Pick dishes by tag — estimated from the recipe only', '按标签挑选菜肴——仅根据食谱估算')}
        </p>
      </div>

      {/* 6 compact category cards in a responsive 2-column grid */}
      <div className="grid grid-cols-2 gap-2">
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
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 active:scale-[0.98] transition motion-reduce:transition-none cursor-pointer ${isSel ? toneRing(def.tone) : ''} ${toneBg(def.tone)}`}
            >
              <span className="flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="text-lg leading-none shrink-0" aria-hidden="true">{def.emoji}</span>
                  <span className="text-xs font-extrabold leading-tight truncate">{tr(language, def.labelKh, def.labelEn, def.labelZh)}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/80 dark:bg-slate-900/70 text-[10px] font-extrabold shrink-0">
                  {list.length} {tr(language, 'មុខ', 'dishes', '道')}
                </span>
              </span>
              <span className="block text-[10px] leading-snug opacity-85 line-clamp-2">{tagBenefit(def, language)}</span>
            </button>
          );
        })}
      </div>

      {/* Inline recommended dishes */}
      <div ref={recommendedRef} className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5">
        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
          {selDef.emoji} {tr(language, 'ម្ហូបណែនាំក្នុងប្រភេទនេះ', 'Recommended Dishes in This Category', '本分类推荐菜品')}
          <span className="font-semibold text-slate-500 dark:text-slate-400"> · {tr(language, selDef.labelKh, selDef.labelEn, selDef.labelZh)}</span>
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
              className="w-full flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-left active:scale-[0.98] transition motion-reduce:transition-none cursor-pointer"
            >
              <img src={f.photoUrl} alt={name(f)} loading="lazy" decoding="async" className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-200" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 dark:text-white truncate">{name(f)}</span>
                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-extrabold">
                  🔥 {f.calories ?? '—'} kcal
                </span>
                <span className="block mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400 line-clamp-2">{tagCookingTip(selDef, language)}</span>
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
      <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800 border border-amber-200 dark:border-slate-700 space-y-2.5">
        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
          🍽️ {tr(language, 'ឈុតម្ហូបសុខភាពប្រចាំថ្ងៃ ៣ ពេល', 'Daily Balanced 3-Meal Idea', '每日均衡三餐搭配')}
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {meals.map((m) => (
            <button
              key={m.key}
              type="button"
              disabled={!m.food}
              onClick={() => m.food && onOpenFood(m.food)}
              className="rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 p-1.5 text-center cursor-pointer active:scale-[0.97] disabled:opacity-50"
            >
              <span className="block text-[11px] font-extrabold text-slate-600 dark:text-slate-300">{m.emoji} {m.label}</span>
              {m.food ? (
                <>
                  <img src={m.food.photoUrl} alt={name(m.food)} loading="lazy" decoding="async" className="mt-1 w-full aspect-square rounded-lg object-cover bg-slate-200" />
                  <span className="block mt-1 text-[11px] font-bold text-slate-900 dark:text-white leading-tight line-clamp-2 min-h-[28px]">{name(m.food)}</span>
                  <span className="block text-[11px] font-extrabold text-orange-600">🔥 {m.food.calories} kcal</span>
                </>
              ) : (
                <span className="block mt-3 text-[11px] text-slate-400">—</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
            {tr(language, `សរុបប្រហែល ${plan.totalKcal} kcal`, `Total ≈ ${plan.totalKcal} kcal`, `合计约 ${plan.totalKcal} kcal`)}
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

      <p className="text-[11px] text-slate-400">
        ℹ️ {tr(language, TAG_ESTIMATE_NOTE.km, TAG_ESTIMATE_NOTE.en, TAG_ESTIMATE_NOTE.zh)} ·{' '}
        {tr(language, GENERAL_FOOD_INFO_NOTE.km, GENERAL_FOOD_INFO_NOTE.en, GENERAL_FOOD_INFO_NOTE.zh)}
      </p>
    </section>
  );
};
