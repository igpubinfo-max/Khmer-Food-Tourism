import { FoodItem, Restaurant, isPlaceLocationVerified } from '../types';
import { DISH_PROVINCES, doesDishBelongToProvince, type ProvinceFilterOption } from '../utils/foodFilters';
import {
  getAuthenticCambodianDishesForMealTime,
  isBeverageDish,
  isGrilledOrFriedDish,
  isRiceDishItem,
  isSaladOrDipDish,
  isSamlorSoupOrCurryDish,
  isStirFriedDish,
  isSweetDessertOrCakeDish,
  type CambodianMealTime,
} from '../utils/cambodianMealHabits';
import { getDishTagIds } from '../utils/dishTags';
import { classifyVegetarianDish } from './aiFoodAdvisorService';

/**
 * AI Smart Missions — 6 NON-OVERLAPPING "need-based" modes for the Smart AI Assistant.
 * Each mission answers a different real-life question using a different real-data signal:
 *   now    → clock          (what suits this meal time?)
 *   kcal   → calories       (top-rated dishes within my calorie goal)
 *   quick  → prep+cook time (ready in ≤ 20 minutes)
 *   local  → GPS province   (signature dishes + shops of where I am)
 *   group  → party size     (complete table menu + cost for N people)
 *   gems   → review volume  (high-rated but under-discovered dishes)
 * Dish-type search (rice, noodles, soup…) stays in the craving box / chips and is never duplicated here.
 */
export type SmartMissionId = 'now' | 'kcal' | 'quick' | 'local' | 'group' | 'gems';

export interface Tri {
  km: string;
  en: string;
  zh: string;
}

export interface MissionDish {
  food: FoodItem;
  note: Tri;
}

export interface MissionOptions {
  seed: number;
  kcalCap: number;
  people: number;
  gps: { lat: number; lng: number } | null;
  now?: Date;
}

export interface MissionResult {
  id: SmartMissionId;
  dishes: MissionDish[];
  total: number;
  summary: Tri;
  shops: Restaurant[];
  totalPortions?: number;
  tips?: Tri[];
  province?: ProvinceFilterOption;
  usedGps?: boolean;
}

export const KCAL_CAPS = [350, 500, 650];
export const GROUP_SIZES = [2, 4, 6, 8];
export const QUICK_MINUTES_LIMIT = 20;
const PAGE = 5;

export function resolveMealSlot(date: Date): CambodianMealTime {
  const h = date.getHours();
  if (h >= 5 && h < 10) return 'breakfast';
  if (h >= 10 && h < 14) return 'lunch';
  if (h >= 14 && h < 17) return 'snack';
  return 'dinner';
}

const SLOT_LABEL: Record<CambodianMealTime, Tri> = {
  breakfast: { km: 'អាហារពេលព្រឹក', en: 'Breakfast time', zh: '早餐时段' },
  lunch: { km: 'អាហារថ្ងៃត្រង់', en: 'Lunch time', zh: '午餐时段' },
  snack: { km: 'អាហារសម្រន់ពេលរសៀល', en: 'Afternoon snack time', zh: '下午茶时段' },
  dinner: { km: 'អាហារពេលល្ងាច', en: 'Dinner time', zh: '晚餐时段' },
};

export function getMealSlotLabel(slot: CambodianMealTime): Tri {
  return SLOT_LABEL[slot];
}

/** Parses "15 min", "1 hour 30 min", "១៥ នាទី", "30分钟" … → minutes (NaN when unknown). */
export function parseMinutes(input?: string): number {
  if (!input) return NaN;
  const text = String(input).replace(/[០-៩]/g, (d) => String('០១២៣៤៥៦៧៨៩'.indexOf(d)));
  let total = 0;
  let matched = false;
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:h\b|hr|hrs|hour|ម៉ោង|小时|時)/i);
  if (hours) {
    total += parseFloat(hours[1]) * 60;
    matched = true;
  }
  const mins = text.match(/(\d+(?:\.\d+)?)\s*(?:m\b|min|នាទី|分)/i);
  if (mins) {
    total += parseFloat(mins[1]);
    matched = true;
  }
  if (!matched) {
    const bare = text.match(/^\s*(\d+(?:\.\d+)?)\s*$/);
    if (bare) return parseFloat(bare[1]);
    return NaN;
  }
  return total;
}

/** Parses servings such as "៣-៤ នាក់", "4-6 people", "3人" → midpoint number of people (1 when unknown). */
export function parseServings(input?: string): number {
  if (!input) return 1;
  const text = String(input).replace(/[០-៩]/g, (d) => String('០១២៣៤៥៦៧៨៩'.indexOf(d)));
  const nums = (text.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter((n) => n > 0);
  if (nums.length === 0) return 1;
  if (nums.length === 1) return nums[0];
  return (nums[0] + nums[1]) / 2;
}

function isMainDish(food: FoodItem): boolean {
  return Boolean(
    food &&
      food.id &&
      food.photoUrl &&
      !isBeverageDish(food) &&
      !isSweetDessertOrCakeDish(food)
  );
}

function rotate<T>(list: T[], seed: number, size = PAGE): T[] {
  if (list.length <= size || seed <= 1) return list.slice(0, size);
  const offset = ((seed - 1) * size) % list.length;
  return [...list.slice(offset), ...list.slice(0, offset)].slice(0, size);
}

function nearestProvince(gps: { lat: number; lng: number } | null): ProvinceFilterOption {
  const fallback = DISH_PROVINCES.find((p) => p.id === 'phnom_penh') || DISH_PROVINCES[0];
  if (!gps) return fallback;
  const toRad = (v: number) => (v * Math.PI) / 180;
  let best = fallback;
  let bestKm = Infinity;
  for (const p of DISH_PROVINCES) {
    const dLat = toRad(p.lat - gps.lat);
    const dLng = toRad(p.lng - gps.lng);
    const a =
      Math.sin(dLat / 2) ** 2 + Math.cos(toRad(gps.lat)) * Math.cos(toRad(p.lat)) * Math.sin(dLng / 2) ** 2;
    const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (km < bestKm) {
      bestKm = km;
      best = p;
    }
  }
  return best;
}

function byRating(a: FoodItem, b: FoodItem): number {
  return (b.rating || 0) - (a.rating || 0) || (b.reviewCount || 0) - (a.reviewCount || 0);
}

function empty(id: SmartMissionId, summary: Tri): MissionResult {
  return { id, dishes: [], total: 0, summary, shops: [] };
}

export function runSmartMission(
  id: SmartMissionId,
  foods: FoodItem[],
  restaurants: Restaurant[],
  options: MissionOptions
): MissionResult {
  const seed = Math.max(1, options.seed);
  const mains = foods.filter(isMainDish);

  if (id === 'now') {
    const slot = resolveMealSlot(options.now || new Date());
    const label = SLOT_LABEL[slot];
    const pool = getAuthenticCambodianDishesForMealTime(mains, slot);
    const picks = rotate(pool, seed);
    return {
      id,
      total: pool.length,
      shops: [],
      dishes: picks.map((food) => ({
        food,
        note: { km: `ស័ក្តិសម ${label.km}`, en: `Fits ${label.en.toLowerCase()}`, zh: `适合${label.zh}` },
      })),
      summary: {
        km: `ឥឡូវជា ${label.km} — AI ជ្រើសម្ហូបខ្មែរដែលអ្នកស្រុកញ៉ាំពេលនេះ (${pool.length} មុខ)`,
        en: `It's ${label.en.toLowerCase()} — dishes Cambodians actually eat right now (${pool.length} matches)`,
        zh: `现在是${label.zh} — 当地人此刻最常吃的菜品（共 ${pool.length} 道）`,
      },
    };
  }

  if (id === 'kcal') {
    const cap = options.kcalCap;
    const pool = mains
      .filter((f) => typeof f.calories === 'number' && f.calories > 0 && f.calories <= cap && (f.rating || 0) >= 4.0)
      .sort((a, b) => byRating(a, b) || (a.calories || 0) - (b.calories || 0));
    if (pool.length === 0) {
      return empty(id, {
        km: `មិនមានម្ហូបក្រោម ${cap} kcal ទេ — សូមបង្កើនកម្រិត`,
        en: `No dishes under ${cap} kcal — try a higher limit`,
        zh: `没有 ${cap} 千卡以下的菜品 — 请提高上限`,
      });
    }
    return {
      id,
      total: pool.length,
      shops: [],
      dishes: rotate(pool, seed).map((food) => ({
        food,
        note: {
          km: `≈ ${food.calories} kcal • ★${food.rating}`,
          en: `≈ ${food.calories} kcal • ★${food.rating}`,
          zh: `约 ${food.calories} 千卡 • ★${food.rating}`,
        },
      })),
      summary: {
        km: `ម្ហូបពិន្ទុខ្ពស់ក្នុងកម្រិតមិនលើស ${cap} kcal (${pool.length} មុខ)`,
        en: `Top-rated dishes within ${cap} kcal (${pool.length} matches)`,
        zh: `${cap} 千卡以内的高分菜品（共 ${pool.length} 道）`,
      },
    };
  }

  if (id === 'quick') {
    const timed = mains
      .map((food) => ({ food, minutes: parseMinutes(food.prepTime) + parseMinutes(food.cookTime) }))
      .filter((e) => Number.isFinite(e.minutes) && e.minutes > 0 && e.minutes <= QUICK_MINUTES_LIMIT)
      .sort((a, b) => a.minutes - b.minutes || byRating(a.food, b.food));
    if (timed.length === 0) {
      return empty(id, {
        km: 'មិនទាន់មានទិន្នន័យម្ហូបរហ័សទេ',
        en: 'No quick-cook data yet',
        zh: '暂无快手菜数据',
      });
    }
    const picks = rotate(timed, seed);
    return {
      id,
      total: timed.length,
      shops: [],
      dishes: picks.map(({ food, minutes }) => ({
        food,
        note: {
          km: `${Math.round(minutes)} នាទី (រៀបចំ + ចម្អិន)`,
          en: `${Math.round(minutes)} min (prep + cook)`,
          zh: `${Math.round(minutes)} 分钟（备料+烹饪）`,
        },
      })),
      summary: {
        km: `ចម្អិនរួចក្នុង ${QUICK_MINUTES_LIMIT} នាទី ឬតិចជាង — តម្រៀបពីលឿនបំផុត (${timed.length} មុខ)`,
        en: `Ready in ${QUICK_MINUTES_LIMIT} minutes or less — fastest first (${timed.length} matches)`,
        zh: `${QUICK_MINUTES_LIMIT} 分钟内出锅 — 由快到慢（共 ${timed.length} 道）`,
      },
    };
  }

  if (id === 'local') {
    const province = nearestProvince(options.gps);
    const sig = new Set(province.signatureDishIds || []);
    const pool = mains
      .filter((f) => doesDishBelongToProvince(f, province.id))
      .sort((a, b) => Number(sig.has(b.id)) - Number(sig.has(a.id)) || byRating(a, b));
    const shops = restaurants
      .filter(
        (r) =>
          isPlaceLocationVerified(r) &&
          (r.provinceKh || '').replace(/^រាជធានី|^ខេត្ត/g, '').includes(province.kh.replace(/^រាជធានី|^ខេត្ត/g, ''))
      )
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3);
    return {
      id,
      province,
      usedGps: Boolean(options.gps),
      total: pool.length,
      shops,
      dishes: rotate(pool, seed).map((food) => ({
        food,
        note: sig.has(food.id)
          ? { km: `ម្ហូបស្រុក ${province.kh}`, en: `Signature of ${province.en}`, zh: `${province.zh}招牌菜` }
          : { km: `${province.kh}`, en: `${province.en}`, zh: `${province.zh}` },
      })),
      summary: {
        km: `${options.gps ? 'ខេត្តជិតអ្នកបំផុត' : 'ទីតាំងលំនាំដើម'}៖ ${province.fullKh} — ម្ហូបបុរាណ និងហាងជិតៗ (${pool.length} មុខ)`,
        en: `${options.gps ? 'Nearest province' : 'Default area'}: ${province.en} — local specialties & shops (${pool.length} dishes)`,
        zh: `${options.gps ? '距您最近' : '默认地区'}：${province.zh} — 地道名菜与餐厅（共 ${pool.length} 道）`,
      },
    };
  }

  if (id === 'group') {
    const people = options.people;
    // Party-size aware planning: how MANY dishes and what KIND of dishes fit 2 / 4 / 6 / 8 people.
    const tier = people <= 2 ? 2 : people <= 4 ? 4 : people <= 6 ? 6 : 8;
    const targetServ = tier === 2 ? 2 : tier === 4 ? 4 : 6; // ideal "serves N" size of a SHARED dish
    type Role = { role: Tri; test: (f: FoodItem) => boolean; single?: boolean };
    const rice: Role = { role: { km: 'បាយ', en: 'Rice', zh: '主食' }, test: isRiceDishItem, single: true };
    const soup: Role = { role: { km: 'សម្ល/ស៊ុប', en: 'Soup', zh: '汤' }, test: isSamlorSoupOrCurryDish };
    const isGrillDish = (f: FoodItem) =>
      (getDishTagIds(f).includes('grilled') || isGrilledOrFriedDish(f)) && !isSaladOrDipDish(f) && !isSamlorSoupOrCurryDish(f);
    const grill: Role = {
      role: { km: 'អាំង/ដុត', en: 'Grill', zh: '烧烤' },
      test: isGrillDish,
    };
    const grill2: Role = { ...grill, role: { km: 'អាំង/ដុត (មុខទី ២)', en: 'Grill (2nd)', zh: '烧烤（第二道）' } };
    const shared: Role = {
      role: { km: 'ម្ហូបចែករំលែក', en: 'Shared main', zh: '分享主菜' },
      test: (f) => isSamlorSoupOrCurryDish(f) || isGrillDish(f),
    };
    const veg: Role = {
      role: { km: 'បន្លែ/ឆា', en: 'Veggie / stir-fry', zh: '时蔬/炒菜' },
      // Vegetable-forward dishes only (no meat/fish in title or ingredients) so this slot is a true veggie dish
      test: (f) =>
        !isSaladOrDipDish(f) &&
        !isSamlorSoupOrCurryDish(f) &&
        (isStirFriedDish(f) || getDishTagIds(f).includes('vegetable_rich')) &&
        classifyVegetarianDish(f) !== 'none',
    };
    const salad: Role = { role: { km: 'ញាំ/ទឹកជ្រលក់', en: 'Salad / dip', zh: '凉拌/蘸酱' }, test: isSaladOrDipDish };

    const plans: Record<number, Role[]> = {
      2: [rice, shared, veg], // 3 dishes — enough, no waste
      4: [rice, soup, grill, veg], // 4 dishes
      6: [rice, soup, grill, veg, salad], // 5 big-sharing dishes
      8: [rice, soup, grill, grill2, veg, salad], // 6 dishes, large platters
    };
    const tipsByTier: Record<number, Tri[]> = {
      2: [
        {
          km: '២ នាក់ ញ៉ាំ ៣ មុខគ្រប់គ្រាន់ — បាយម្នាក់ ១ ចាន ហើយចែកម្ហូប ២ មុខ ជៀសវាងកុម្ម៉ង់ច្រើនពេកខ្ជះខ្ជាយ។',
          en: '3 dishes is plenty for two — one rice each, then share 2 dishes. Avoid over-ordering.',
          zh: '两人点 3 道菜刚好 — 每人一份主食，再分享 2 道菜，避免浪费。',
        },
        {
          km: 'ជ្រើសម្ហូបទំហំតូច (បម្រើ ២–៣ នាក់) ជាជាងឆ្នាំងធំ។',
          en: 'Pick small-size dishes (serves 2–3) instead of big pots.',
          zh: '选择小份菜（2–3 人份），不要点大锅。',
        },
      ],
      4: [
        {
          km: 'បាយម្នាក់ ១ ចាន + ម្ហូបចែករំលែក ៣ មុខ (សម្ល សាច់អាំង បន្លែ) — រសជាតិមានតុល្យភាព។',
          en: 'One rice each + 3 shared dishes (soup, grill, veggie) — a balanced table.',
          zh: '每人一份主食 + 3 道共享菜（汤、烧烤、时蔬）— 搭配均衡。',
        },
        {
          km: 'ម្ហូបទំហំមធ្យម (បម្រើ ៣–៥ នាក់) ល្អបំផុត។',
          en: 'Medium-size dishes (serves 3–5) fit best.',
          zh: '中份菜（3–5 人份）最合适。',
        },
      ],
      6: [
        {
          km: 'ជ្រើសម្ហូបទំហំធំ ចែកគ្នាបាន (ឆ្នាំងសម្ល ចានសាច់អាំងធំ) ហើយកុម្ម៉ង់បាយជាឆ្នាំងធំ — ល្អជាងកុម្ម៉ង់ចានតូចៗច្រើន។',
          en: 'Choose big sharing dishes (a soup pot, a large grill platter) and order rice by the pot — better than many small plates.',
          zh: '选择可多人分享的大份菜（汤锅、大份烧烤拼盘），主食点一锅 — 比点很多小盘更合适。',
        },
        {
          km: 'បន្ថែមម្ហូបញាំ/ទឹកជ្រលក់ ១ មុខ ដើម្បីកាត់ក្លិនខ្លាញ់ និងបំពេញរសជាតិ។',
          en: 'Add one salad or dip to cut the richness and balance flavors.',
          zh: '加一道凉拌或蘸酱，解腻并平衡口味。',
        },
      ],
      8: [
        {
          km: 'សុំទំហំធំ/ទំហំក្រុមពីហាង ហើយរៀបម្ហូបអាំង ២ មុខ + ឆ្នាំងសម្ល ១ — មនុស្សច្រើនត្រូវការចានធំ មិនមែនចានច្រើនទេ។',
          en: 'Ask the shop for the large / group size: 2 grill dishes + 1 big soup pot — big groups need big platters, not more plates.',
          zh: '向店家要大份/团体份：2 道烧烤 + 1 大锅汤 — 人多要点大份菜，而不是更多小盘。',
        },
        {
          km: 'ទុកបន្ថែម ១០% សម្រាប់អ្នកញ៉ាំច្រើន ឬកុមារ ហើយកុម្ម៉ង់ម្ហូបមួយៗទៅមុន កុំបញ្ជាទាំងអស់ម្តង។',
          en: 'Keep ~10% extra for big eaters or kids, and order in rounds instead of all at once.',
          zh: '多留约 10% 的余量给食量大的人或孩子，并分批点菜。',
        },
      ],
    };

    const used = new Set<string>();
    const dishes: MissionDish[] = [];
    let totalPortions = 0;
    for (const { role, test, single } of plans[tier]) {
      const target = single ? 1 : targetServ;
      const candidates = mains
        .filter((f) => !used.has(f.id) && test(f))
        .map((f) => ({ f, score: (f.rating || 0) * 10 - Math.abs(parseServings(f.servings) - target) * 4 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((e) => e.f);
      if (candidates.length === 0) continue;
      const pick = rotate(candidates, seed, 1)[0];
      used.add(pick.id);
      const serves = Math.max(1, parseServings(pick.servings));
      const portions = Math.max(1, Math.ceil(people / serves));
      totalPortions += portions;
      dishes.push({
        food: pick,
        note: {
          km: `${role.km} • ${portions} ចាន • ${serves <= 1 ? 'ម្នាក់ ១ ចាន' : `ចែកបាន ~${Math.round(serves)} នាក់/ចាន`}`,
          en: `${role.en} • ${portions} serving${portions > 1 ? 's' : ''} • ${serves <= 1 ? 'one per person' : `shares ~${Math.round(serves)} people each`}`,
          zh: `${role.zh} • ${portions} 份 • ${serves <= 1 ? '每人一份' : `每份约 ${Math.round(serves)} 人`}`,
        },
      });
    }
    if (dishes.length === 0) {
      return empty(id, { km: 'មិនទាន់មានទិន្នន័យគ្រប់គ្រាន់', en: 'Not enough data yet', zh: '数据暂不足' });
    }
    return {
      id,
      total: dishes.length,
      shops: [],
      totalPortions,
      tips: tipsByTier[tier],
      dishes,
      summary: {
        km: `ឈុតតុសម្រាប់ ${people} នាក់ — ${dishes.length} មុខ • សរុប ${totalPortions} ចាន`,
        en: `Table for ${people} people — ${dishes.length} dishes • ${totalPortions} servings in total`,
        zh: `${people} 人餐桌 — ${dishes.length} 道菜 • 共 ${totalPortions} 份`,
      },
    };
  }

  // gems — high rating, low review volume
  const counts = mains.map((f) => f.reviewCount || 0).sort((a, b) => a - b);
  const median = counts.length ? counts[Math.floor(counts.length / 2)] : 0;
  const pool = mains
    .filter((f) => (f.rating || 0) >= 4.5 && (f.reviewCount || 0) <= Math.max(median, 1))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (a.reviewCount || 0) - (b.reviewCount || 0));
  return {
    id: 'gems',
    total: pool.length,
    shops: [],
    dishes: rotate(pool, seed).map((food) => ({
      food,
      note: {
        km: `★${food.rating} • ត្រូវបានវាយតម្លៃតែ ${food.reviewCount || 0} ដង`,
        en: `★${food.rating} • only ${food.reviewCount || 0} reviews`,
        zh: `★${food.rating} • 仅 ${food.reviewCount || 0} 条评价`,
      },
    })),
    summary: {
      km: `ម្ហូបលាក់កំបាំងដែលពិន្ទុខ្ពស់ តែនៅមិនសូវល្បី (${pool.length} មុខ)`,
      en: `Hidden gems — top-rated but still under-discovered (${pool.length} dishes)`,
      zh: `隐藏宝藏 — 高分但仍少有人知（共 ${pool.length} 道）`,
    },
  };
}
