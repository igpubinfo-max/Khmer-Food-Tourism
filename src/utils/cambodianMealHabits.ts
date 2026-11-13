import { classifyKhmerFoodPrimaryGroup, type FoodItem } from '../types';
import { isSweetOrBeverageFood } from './khmerFoodSearch';
import {
  isBeverageDishStrict,
  isGrilledOrFriedDishStrict,
  isNoodleDishStrict,
  isRiceDishStrict,
  isSaladOrDipDishStrict,
  isSoupOrCurryDishStrict,
  isStirFriedDishStrict,
  isSweetDessertOrCakeDishStrict,
  isVegetarianDishStrict,
  matchesStrictFoodCategory,
  resolveCanonicalFoodCategorySlug,
  type StrictFoodCategoryId,
} from './foodFilters';

export {
  isBeverageDishStrict,
  isGrilledOrFriedDishStrict,
  isNoodleDishStrict,
  isRiceDishStrict,
  isSaladOrDipDishStrict,
  isSoupOrCurryDishStrict,
  isStirFriedDishStrict,
  isSweetDessertOrCakeDishStrict,
  isVegetarianDishStrict,
  matchesStrictFoodCategory,
  resolveCanonicalFoodCategorySlug,
  type StrictFoodCategoryId,
};

export type CambodianMealTime = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type FoodCategoryTabId = 'all' | 'samlor' | 'cha' | 'vegetarian' | 'bong_aem';

const SAVORY_CONGEE_RE =
  /^(បបរស|បបរមាន់|បបរត្រី|បបរគ្រឿង|បបរឈាម|បបរសាមចូក|បបរសាមចុក|បបរសាច់|បបរទា|បបរកង្កែប|បបរតុការ)|\bcongee\b|\brice\s*porridge\b/i;

const MORNING_NOODLE_RE =
  /^គុយទាវ|^នំបញ្ចុក|^មីគោក|^មីស៊ុប|^មីទឹក|^មីឆា|^មីកូឡា|^មីលាក់ខ្លួន|^លតឆា|^បាញ់កាញ់|^បាញ់ស៊ុង|^បាញ់ហយ|^ហ្វឺ|\bkuy\s*teav\b|\bnum\s*banh\s*chok\b|\blort\s*cha\b|\bnoodle\s*soup\b/i;

const MORNING_RICE_OR_BREAD_RE =
  /^បាយសាច់ជ្រូក|^បាយមាន់|^បាយខជើងជ្រូក|^បាយគោងៀត|^បាយត្រីងៀត|^បាយស្រូប|^បាយឆា|^នំប៉័ងប៉ាតេ|^ខគោនំប៉័ង|^សម្លការីមាន់នំប៉័ង|^ពងទាចៀន|\bpork\s*(?:and|&)?\s*rice\b|\bbai\s*sach\s*chrouk\b|\bhainanese\s*chicken\s*rice\b|\bcambodian\s*chicken\s*rice\b|\bbaguette\b|\bbeef\s*stew\s*with\s*bread\b/i;

const MORNING_SAMLOR_STEW_RE =
  /^ខគោ|^ខសាច់ជ្រូក|^ខជើងជ្រូក|^ខត្រី|^ខពងទា|^សម្លការី|^សម្លប្រហើរ|^ស្ងោរជ្រក់|^ស្ងោរង៉ាំង៉ូវ|^ស្ងោរមាន់|^ស្ងោរត្រី|^ស៊ុបមាន់|^ស៊ុបគោ|\bbeef\s*stew\b|\bchicken\s*curry\b|\bbraised\s*pork\b|\bclear\s*soup\b/i;

const MORNING_SWEET_OR_DRINK_RE =
  /^កាហ្វេ|^តែ|^ទឹកសណ្តែក|^ទឹកសណ្ដែក|^ទឹកដោះគោ|^នំកង|^នំគម|^នំអន្សម|^អន្សម|^ចេកចៀន|^ដំឡូង.*បំពង|^នំចាក់ចុល|^នំប៉ាវ|^នំចេក|^បបរផ្អែម|^បបរសណ្តែក|^បបរសណ្ដែក|^បបរត្រាវ|^ក្រឡាន|\bcoffee\b|\bsoy\s*milk\b|\bdonut\b|\bfried\s*banana\b/i;

const LUNCH_SAMLOR_RE =
  /^សម្លកកូរ|^សម្លម្ជូរ|^សម្លប្រហើរ|^សម្លការី|^សម្លខ្នុរ|^សម្លទំពាំង|^អាម៉ុក|^ទឹកគ្រឿង|^ប្រហុក|^កាពិ|^ខសាច់ជ្រូក|^ខត្រី|^ខជើងជ្រូក|^ផាក់ឡូវ|^ស្ងោរជ្រក់|^ស្ងោរម្រះ|^ស្ងោរង៉ាំង៉ូវ|^ស្ងោរត្រី|^ស្ងោរមាន់|^ស្ងោរឆ្អឹងជំនីរ/i;

const LUNCH_CHA_RE =
  /^ឆាក្តៅ|^ឆាខ្ញី|^ឆាម្រះព្រៅ|^ឆាត្រកួន|^ឆាគ្រឿង|^ឆាបន្លែ|^ឆាផ្សិត|^ឆាត្រប់|^ឆាសណ្តែក|^ឆាផ្កាខាត់ណា|^ឡុកឡាក់|^ត្រីចៀន|^ត្រីអាំង|^ត្រីបំពង|^មាន់អាំង|^មាន់ដុត|^សាច់គោអាំង|^សាច់ជ្រូកអាំង|^បាយឆា|^មីឆា|^គុយទាវឆា|^លតឆា|^នំបញ្ចុក|^បាញ់ឆែវ|^ញាំ|^ភ្លា|^បុក/i;

const LUNCH_SWEET_OR_DRINK_RE =
  /^ទឹកអំពៅ|^ទឹកដូង|^ទឹកក្រឡុក|^តែក្រូចឆ្មារ|^ទឹកត្រឡាច|^ទឹកផ្លែឈើ|^បង្អែម|^ទឹកកកឈូស|^ចាហួយ|^តៅហ៊ូទឹកស្ករ|^បាញ់ឌុក|^សង់ខ្យា|^ចេកខ្ទិះ|^បាយដំណើបស្វាយទុំ/i;

const AFTERNOON_SAVORY_SNACK_RE =
  /^លតឆា|^មីឆា|^បាញ់ឆែវ|^បាញ់ហយ|^នំគ្រក់|^គួង|^ចាដូវ|^ណែម|^បុកល្ហុង|^បុកក្ដាម|^បុកក្តាម|^បុកមី|^បុកពោត|^បុកស្វាយ|^បុកកន្ទួត|^បុកក្រសាំង|^សាច់គោអាំងចង្កាក់|^សាច់ជ្រូកអាំងចង្កាក់|^ប្រហិត|^ពងទាកូន|^ពងក្រួចកូន|^ស្លាបមាន់|^នំប៉័ងប៉ាតេ|^គូឆាយ|^កាឆាយ|^កចាយ|^នំត្រាវបំពង|^អន្សមចៀន|^កំពិសលីង|^ងាវស្រុះ|^ងាវអប់|^ញាំ|\blort\s*cha\b|\bbanh\s*chao\b|\bnum\s*krok\b|\bspring\s*roll\b|\bpapaya\s*salad\b|\bskewer\b|\bmeatball\b|\bbalut\b|\bchive\s*cake\b/i;

const EVENING_HOTPOT_RE =
  /ឆ្នាំងភ្លើង|យ៉ាវហន|ស៊ុបគោ|ស៊ុបមាន់ខ្មៅ|ស៊ុបពពែ|ស៊ុបគ្រឿងសមុទ្រ|ស៊ុបម្រះ|\bhot\s*pot\b|\byao\s*hon\b|\bbeef\s*hotpot\b/i;

const DINNER_SAMLOR_RE =
  /^សម្លម្ជូរ|^សម្លកកូរ|^សម្លការី|^សម្លប្រហើរ|^អាម៉ុក|^ស្ងោរជ្រក់|^ស្ងោរង៉ាំង៉ូវ|^ស្ងោរម្រះ|^ស្ងោរត្រី|^ស្ងោរមាន់|^ទឹកគ្រឿង|^ប្រហុកខ្ទិះ|^ប្រហុកគ្រឿង|^ខសាច់ជ្រូក|^ខត្រី|^ខជើងជ្រូក/i;

const DINNER_CHA_RE =
  /^ឡុកឡាក់|^ឆាក្តៅ|^ឆាខ្ញី|^ឆាម្រះព្រៅ|^ឆាគ្រឿង|^ឆាត្រកួន|^ឆាផ្សិត|^ឆាបន្លែ|^ឆាមឹក|^ឆាបង្គា|^ឆាក្តាម|^ក្តាមឆា|^ក្ដាមឆា|^បង្កងឆា|^លាសឆា|^ត្រីដុត|^ត្រីអាំង|^ត្រីបំពង|^ត្រីចៀន|^មាន់ដុត|^មាន់អាំង|^សាច់គោអាំង|^សាច់ជ្រូកអាំង|^បង្គាអាំង|^មឹកអាំង|^ភ្លា|^ញាំ|^បុក/i;

const DINNER_SWEET_OR_DRINK_RE =
  /^បង្អែម|^សង់ខ្យា|^ចេកខ្ទិះ|^បាយដំណើបស្វាយទុំ|^នំផ្លែអាយ|^បាញ់ចានឿក|^តៅហ៊ូទឹកស្ករ|^ទឹកដូង|^ទឹកក្រឡុក|^ទឹកត្រឡាច|^ទឹកសណ្តែក|^ទឹកសណ្ដែក/i;

const HEAVY_LUNCH_DINNER_ONLY_RE =
  /ឆ្នាំងភ្លើង|យ៉ាវហន|សម្លកកូរ|សម្លម្ជូរ|អាម៉ុក|ប្រហុកខ្ទិះ|ប្រហុកកប់|ទឹកគ្រឿង|ភ្លាសាច់គោ|បុកល្ហុង|ក្តាមឆា|ក្ដាមឆា|បង្កងអាំង|មឹកអាំង|ត្រីដុតអំបិល|\bhot\s*pot\b|\byao\s*hon\b|\bamok\b/i;

export function isBeverageDish(food: FoodItem): boolean {
  return isBeverageDishStrict(food);
}

export function isSweetDessertOrCakeDish(food: FoodItem): boolean {
  return isSweetDessertOrCakeDishStrict(food);
}

export function isRiceDishItem(food: FoodItem): boolean {
  return isRiceDishStrict(food);
}

export function isNoodleDishItem(food: FoodItem): boolean {
  return isNoodleDishStrict(food);
}

export function isSamlorSoupOrCurryDish(food: FoodItem): boolean {
  return isSoupOrCurryDishStrict(food);
}

export function isStirFriedDish(food: FoodItem): boolean {
  return isStirFriedDishStrict(food);
}

export function isGrilledOrFriedDish(food: FoodItem): boolean {
  return isGrilledOrFriedDishStrict(food);
}

export function isSaladOrDipDish(food: FoodItem): boolean {
  return isSaladOrDipDishStrict(food);
}

export function isVegetarianDish(food: FoodItem): boolean {
  return isVegetarianDishStrict(food);
}

/**
 * Classifies a dish into one of the primary Food Screen tabs ('samlor' | 'cha' | 'vegetarian' | 'bong_aem')
 * for meal-time scoring and general categorization.
 */
export function resolveFoodScreenCategoryTab(food: FoodItem): Exclude<FoodCategoryTabId, 'all'> {
  if (isBeverageDish(food) || isSweetDessertOrCakeDish(food)) {
    return 'bong_aem';
  }
  if (isSamlorSoupOrCurryDish(food)) {
    return 'samlor';
  }
  if (isGrilledOrFriedDish(food) || isStirFriedDish(food)) {
    return 'cha';
  }
  const grp = classifyKhmerFoodPrimaryGroup(food);
  if (grp === 'samlor' || grp === 'sngor') return 'samlor';
  if (grp === 'bong_aem') return 'bong_aem';
  return 'cha';
}

/**
 * Strict category filter for the 5 Food Menu category buttons:
 * - 'all' (គ្រប់មុខម្ហូប): All food items
 * - 'samlor' (សម្ល): Cambodian soups and curry dishes only
 * - 'cha' (អាំង/ចៀន): Grilled and fried food only
 * - 'vegetarian' (ម្ហូបបួស): Vegetarian & plant-based dishes
 * - 'bong_aem' (បង្អែម/ភេសជ្ជៈ): Desserts and beverages only
 */
export function matchesFoodScreenCategoryTab(food: FoodItem, catId: string): boolean {
  if (!food || !food.id || !food.nameKh) return false;
  if (!catId || catId === 'all') return true;
  if (catId === 'samlor') {
    return isSamlorSoupOrCurryDish(food) && !isVegetarianDish(food);
  }
  if (catId === 'cha') {
    return isGrilledOrFriedDish(food) && !isVegetarianDish(food);
  }
  if (catId === 'vegetarian') {
    return isVegetarianDish(food);
  }
  if (catId === 'bong_aem') {
    return isBeverageDish(food) || isSweetDessertOrCakeDish(food);
  }
  return resolveFoodScreenCategoryTab(food) === catId;
}

/**
 * Scores a dish for a specific meal time ('breakfast' | 'lunch' | 'snack' | 'dinner')
 * while supporting all food categories.
 */
export function scoreCambodianDishForCategoryAndMealTime(
  food: FoodItem,
  slot: CambodianMealTime
): number {
  if (!food || !food.id || !food.nameKh) return 0;
  const kh = (food.nameKh || '').trim();
  const en = (food.nameEn || '').trim();
  const title = `${kh} ${en}`;
  const catTab = resolveFoodScreenCategoryTab(food);
  const isCongee = SAVORY_CONGEE_RE.test(title);

  if (slot === 'breakfast') {
    if (catTab === 'bong_aem') {
      if (MORNING_SWEET_OR_DRINK_RE.test(title)) return 92;
      if (isBeverageDish(food) || /^បង្អែម|^នំ/i.test(kh)) return 75;
      return 0;
    }
    if (catTab === 'samlor' || isCongee) {
      if (isCongee) return 100;
      if (/^ខគោ|^សម្លការី/i.test(kh)) return 96;
      if (MORNING_SAMLOR_STEW_RE.test(title)) return 86;
      return 0;
    }
    if (HEAVY_LUNCH_DINNER_ONLY_RE.test(kh)) return 0;
    if (/^បាយសាច់ជ្រូក|^គុយទាវ|^នំបញ្ចុក|^បាយមាន់|^នំប៉័ងប៉ាតេ/i.test(kh)) {
      return 100;
    }
    if (MORNING_RICE_OR_BREAD_RE.test(title) || MORNING_NOODLE_RE.test(title)) {
      return 88;
    }
    if (/^សាច់ជ្រូកអាំង|^មាន់អាំង|^ត្រីអាំង|^សាច់គោអាំង|^ពងទា|^ឆាខ្ញី|^ឆាបន្លែ|^ឆាត្រកួន|^ឆាផ្សិត|^ឆាសណ្តែក/i.test(kh)) {
      return 78;
    }
    return 0;
  }

  if (slot === 'lunch') {
    if (catTab === 'bong_aem') {
      if (LUNCH_SWEET_OR_DRINK_RE.test(title)) return 94;
      return 76;
    }
    if (catTab === 'samlor') {
      if (isCongee || EVENING_HOTPOT_RE.test(title)) return 0;
      if (LUNCH_SAMLOR_RE.test(kh)) return 100;
      return 84;
    }
    if (/^នំប៉័ងប៉ាតេ|^បាយសាច់ជ្រូក$/i.test(kh)) return 0;
    if (LUNCH_CHA_RE.test(kh)) return 100;
    if (
      isStirFriedDish(food) ||
      isGrilledOrFriedDish(food) ||
      isSaladOrDipDish(food) ||
      isRiceDishItem(food) ||
      isNoodleDishItem(food)
    ) {
      return 82;
    }
    return 72;
  }

  if (slot === 'snack') {
    if (HEAVY_LUNCH_DINNER_ONLY_RE.test(kh) && !/^បុកល្ហុង/i.test(kh)) return 0;
    if (isCongee) return 0;
    if (AFTERNOON_SAVORY_SNACK_RE.test(title)) return 100;
    if (catTab === 'bong_aem') return 95;
    if (/^(បុក|ញាំ|ប្រហិត|សាច់ចង្កាក់|សាច់គោចង្កាក់|សាច់គោអាំងចង្កាក់|ស្លាបមាន់|នំគ្រក់|បាញ់ឆែវ|គួង|ណែម|ចាយ៉|ពងទាកូន|ពងក្រួច|សាច់ក្រក|សង្វាក់|កំពិសលីង|ងាវស្រុះ|ខ្យងស្រែអាំង)/i.test(kh)) return 82;
    return 0;
  }

  // slot === 'dinner'
  if (catTab === 'bong_aem') {
    if (/^កាហ្វេ/i.test(kh)) return 0;
    if (DINNER_SWEET_OR_DRINK_RE.test(title)) return 94;
    return 76;
  }
  if (catTab === 'samlor') {
    if (isCongee) return 0;
    if (EVENING_HOTPOT_RE.test(title)) return 100;
    if (DINNER_SAMLOR_RE.test(kh)) return 94;
    return 80;
  }
  if (/^នំប៉័ងប៉ាតេ|^បាយសាច់ជ្រូក$|^នំបញ្ចុកសម្លខ្មែរ$/i.test(kh)) return 0;
  if (DINNER_CHA_RE.test(kh)) return 100;
  if (
    isGrilledOrFriedDish(food) ||
    isStirFriedDish(food) ||
    isSaladOrDipDish(food) ||
    isRiceDishItem(food) ||
    /^បាយឆា|^មីឆា|^គុយទាវឆា|^លតឆា/i.test(kh)
  ) {
    return 85;
  }
  return 0;
}

/**
 * Authentic Cambodian meal-time classifier reflecting real Cambodian eating habits
 * across Breakfast (អាហារពេលព្រឹក), Lunch (អាហារថ្ងៃត្រង់), Afternoon Snack (អាហារសម្រន់រសៀល), and Dinner (អាហារពេលល្ងាច).
 */
export function scoreCambodianDishForMealTime(food: FoodItem, slot: CambodianMealTime): number {
  if (!food || !food.id || !food.nameKh) return 0;
  const isDrink = isBeverageDish(food);
  const isSweet = isSweetDessertOrCakeDish(food);

  // For main-meal recommendation carousels (breakfast/lunch/dinner), prioritize savory dishes over drinks/desserts
  if (slot !== 'snack' && (isDrink || isSweet || isSweetOrBeverageFood(food))) {
    return 0;
  }
  return scoreCambodianDishForCategoryAndMealTime(food, slot);
}

export function isAuthenticCambodianDishForMealTime(food: FoodItem, slot: CambodianMealTime): boolean {
  return scoreCambodianDishForMealTime(food, slot) > 0;
}

export function getAuthenticCambodianDishesForMealTime(
  foods: FoodItem[],
  slot: CambodianMealTime,
  options?: { includeDessertsAndDrinks?: boolean }
): FoodItem[] {
  const withPhoto = foods.filter((f) => f && f.id && f.photoUrl);
  const scorer = options?.includeDessertsAndDrinks
    ? scoreCambodianDishForCategoryAndMealTime
    : scoreCambodianDishForMealTime;

  const scored = withPhoto
    .map((food) => ({ food, score: scorer(food, slot) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || (b.food.rating || 0) - (a.food.rating || 0));

  return scored.length > 0 ? scored.map((entry) => entry.food) : withPhoto;
}