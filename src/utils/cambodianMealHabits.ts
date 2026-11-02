import type { FoodItem } from '../types';
import { isBeverageFood, isSweetOrBeverageFood } from './khmerFoodSearch';

export type CambodianMealTime = 'breakfast' | 'lunch' | 'snack' | 'dinner';

const SWEET_DESSERT_OR_CAKE_RE =
  /^បង្អែម|ចេកខ្ទិះ|សង់ខ្យា|អន្សម|ក្រឡាន|បបរផ្អែម|បបរត្នោត|បបរត្រាវ|បបរសណ្តែក|បបរល្ពៅ|បាញ់ឌុក|លតស្វិត|នំផ្លែអាយ|នំកង|នំគម|នំចាក់ចុល|នំល្ពៅ|នំចេក|ចេកចៀន|ដំឡូង.*បំពង|អំបុក|\bdessert\b|\bcustard\b|\bsweet\b/i;

const SAVORY_CONGEE_RE =
  /^(បបរស|បបរមាន់|បបរត្រី|បបរគ្រឿងក្នុង|បបរឈាម|បបរគ្រឿងសមុទ្រ|បបរសាច់)|\bcongee\b|\brice\s*porridge\b/i;

const MORNING_NOODLE_RE =
  /^គុយទាវ|^នំបញ្ចុក|^មីគោក|^មីស៊ុប|^មីឆា|^មីកូឡា|^លតឆា|^បាញ់កាញ់|^បាញ់ស៊ុង|^ហ្វឺ|\bkuy\s*teav\b|\bnum\s*banh\s*chok\b|\blort\s*cha\b|\bnoodle\s*soup\b/i;

const MORNING_RICE_OR_BREAD_RE =
  /^បាយសាច់ជ្រូក|^បាយមាន់|^បាយខជើងជ្រូក|^បាយគោងៀត|^បាយត្រីងៀត|^បាយស្រូប|^នំប៉័ងប៉ាតេ|^ខគោនំប៉័ង|^សម្លការីមាន់នំប៉័ង|\bpork\s*(?:and|&)?\s*rice\b|\bbai\s*sach\s*chrouk\b|\bhainanese\s*chicken\s*rice\b|\bcambodian\s*chicken\s*rice\b|\bbaguette\b|\bbeef\s*stew\s*with\s*bread\b/i;

const HEAVY_LUNCH_DINNER_ONLY_RE =
  /^សម្លកកូរ|^សម្លម្ជូរ|^សម្លប្រហើរ|^សម្លខ្នុរ|^ស្ងោរ|^ស៊ុបពោះគោ|^ស៊ុបឆ្នាំងដី|^ប្រហុក|^ទឹកគ្រឿង|^កាពិ|^អាម៉ុក|^ឡុកឡាក់|^ឆាក្តៅ|^ឆាគ្រឿង|^ភ្លា|^ញាំ|^បុកល្ហុង|^ក្តាម.*ឆា|^មឹកអាំង|^បង្គាអាំង|^គ្រំអាំង|^ត្រីដុត/i;

const EVENING_HOTPOT_RE = /^ស៊ុបពោះគោ|^ស៊ុបឆ្នាំងដី|^ស៊ុបម្រះ|\bhot\s*pot\b|\bclaypot\s*soup\b/i;

const AFTERNOON_SAVORY_SNACK_RE =
  /^លតឆា|^នំគ្រក់|^នំកាឆាយ|^នំត្រាវ|^បាញ់ឆែវ|^បាញ់ហយ|^គួង|^ចាដូវ|^សាយ៉|^បុកល្ហុង|^លៀសហាល|^ប្រហិត|^សាច់ក្រក|^សាច់គោចង្កាក់|^ស្លាបមាន់|^ពងទាកូន|^នំប៉័ងប៉ាតេ|^មីកូឡា|\bspring\s*roll\b|\bpancake\b|\bskewer\b|\bstreet\b|\bpapaya\s*salad\b/i;

function isSweetCakeOrDessert(food: FoodItem): boolean {
  if (food.categorySlug === 'dessert' || food.categorySlug === 'cake') return true;
  const text = `${food.nameKh || ''} ${food.nameEn || ''}`;
  return SWEET_DESSERT_OR_CAKE_RE.test(text);
}

/**
 * Authentic Cambodian meal-time classifier reflecting real Cambodian eating habits
 * across Breakfast (អាហារពេលព្រឹក), Lunch (អាហារថ្ងៃត្រង់), Afternoon Snack (អាហារសម្រន់រសៀល), and Dinner (អាហារពេលល្ងាច).
 */
export function scoreCambodianDishForMealTime(food: FoodItem, slot: CambodianMealTime): number {
  if (!food || !food.id || !food.nameKh) return 0;
  const kh = (food.nameKh || '').trim();
  const en = (food.nameEn || '').trim();
  const title = `${kh} ${en}`;
  const isDrink = isBeverageFood(food);
  const isSweet = isSweetCakeOrDessert(food);
  const isCongee = !isSweet && SAVORY_CONGEE_RE.test(title);

  if (slot === 'breakfast') {
    // Exclude beverages as main dish recommendations, desserts, heavy lunch/dinner soups, prahok, BBQ & hotpots
    if (isDrink || isSweet || isSweetOrBeverageFood(food)) return 0;
    if (HEAVY_LUNCH_DINNER_ONLY_RE.test(kh)) return 0;

    if (/^បាយសាច់ជ្រូក|^គុយទាវភ្នំពេញ|^នំបញ្ចុកសម្លខ្មែរ|^បបរមាន់|^បបរត្រី|^បាយមាន់|^នំប៉័ងប៉ាតេ|^ខគោនំប៉័ង/i.test(kh)) {
      return 100;
    }
    if (MORNING_RICE_OR_BREAD_RE.test(title) || MORNING_NOODLE_RE.test(title) || isCongee) {
      return 85;
    }
    return 0;
  }

  if (slot === 'lunch') {
    // Exclude drinks, desserts/cakes, morning congee, morning baguette, and late-night hotpots
    if (isDrink || isSweet || isSweetOrBeverageFood(food)) return 0;
    if (isCongee || /^នំប៉័ងប៉ាតេ|^បាយសាច់ជ្រូក$/i.test(kh) || EVENING_HOTPOT_RE.test(title)) return 0;

    // Signature Cambodian lunchtime rice-table mains (សម្ល, ស្ងោរ, អាម៉ុក, ទឹកគ្រឿង, ប្រហុក, ខ, ឆា, ត្រីអាំង/បំពង, បាយឆា)
    if (
      /^សម្លកកូរ|^សម្លម្ជូរ|^សម្លប្រហើរ|^សម្លការី|^អាម៉ុក|^ទឹកគ្រឿង|^ប្រហុកខ្ទិះ|^ខសាច់ជ្រូក|^ខជើងជ្រូក|^ស្ងោរម្រះ|^ស្ងោរជ្រក់|^ឡុកឡាក់|^ឆាក្តៅ|^ឆាគ្រឿង|^ត្រីបំពងទឹកត្រីស្វាយ|^ត្រីអាំង|^មាន់ដុត|^បាយឆា/i.test(
        kh
      )
    ) {
      return 100;
    }
    if (
      food.categorySlug === 'soup' ||
      food.categorySlug === 'stirfry' ||
      food.categorySlug === 'rice' ||
      /^សម្ល|^ស្ងោរ|^ខ|^ឆា|^ទឹកគ្រឿង|^ប្រហុក|^កាពិ|^ត្រី|^មាន់|^បុកល្ហុង|^ញាំ/i.test(kh)
    ) {
      return 80;
    }
    if (food.categorySlug === 'grilled' || food.categorySlug === 'salad' || food.categorySlug === 'noodles') {
      return 60;
    }
    return 0;
  }

  if (slot === 'snack') {
    // Afternoon treats: Khmer street snacks, spring rolls, Banh Chao, Bok Lhong, traditional Num/Bong'aem desserts, and refreshing drinks
    if (HEAVY_LUNCH_DINNER_ONLY_RE.test(kh) && !/^បុកល្ហុង/i.test(kh)) return 0;
    if (isCongee) return 0;

    if (AFTERNOON_SAVORY_SNACK_RE.test(title)) return 100;
    if (isSweet) return 95;
    if (isDrink && !/កាហ្វេ/i.test(kh)) return 75;
    return 0;
  }

  // Dinner (អាហារពេលល្ងាច)
  if (isDrink || isSweet || isSweetOrBeverageFood(food)) return 0;
  if (isCongee || /^នំប៉័ងប៉ាតេ|^បាយសាច់ជ្រូក$|^នំបញ្ចុកសម្លខ្មែរ$/i.test(kh)) return 0;

  // Prime Cambodian dinner favorites: claypot soups, grilled meats & coastal seafood, family samlor/stews, stir-fries, and zesty salads
  if (
    EVENING_HOTPOT_RE.test(title) ||
    /^សាច់គោអាំង|^មាន់ដុត|^ទាអាំង|^ត្រីដុត|^ក្តាម.*ឆា|^បង្គា|^មឹក|^គ្រំ|^ឡុកឡាក់|^អាម៉ុក|^ស្ងោរង៉ាំង៉ូវ|^ស្ងោរជ្រក់|^សម្លម្ជូរ|^សម្លកកូរ|^ភ្លាសាច់គោ|^ញាំមីសួរ|^ឆាក្តៅ/i.test(
      kh
    )
  ) {
    return 100;
  }
  if (
    food.categorySlug === 'grilled' ||
    food.categorySlug === 'soup' ||
    food.categorySlug === 'stirfry' ||
    food.categorySlug === 'specialty' ||
    food.categorySlug === 'salad' ||
    /^បាយឆា|^មីឆា|^គុយទាវឆា/i.test(kh)
  ) {
    return 80;
  }
  return 0;
}

export function isAuthenticCambodianDishForMealTime(food: FoodItem, slot: CambodianMealTime): boolean {
  return scoreCambodianDishForMealTime(food, slot) > 0;
}

export function getAuthenticCambodianDishesForMealTime(foods: FoodItem[], slot: CambodianMealTime): FoodItem[] {
  const withPhoto = foods.filter((f) => f && f.id && f.photoUrl);
  const scored = withPhoto
    .map((food) => ({ food, score: scoreCambodianDishForMealTime(food, slot) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || (b.food.rating || 0) - (a.food.rating || 0));

  return scored.length > 0 ? scored.map((entry) => entry.food) : withPhoto;
}
