import { classifyKhmerFoodPrimaryGroup, type FoodItem } from '../types';
import { isBeverageFood, isSweetOrBeverageFood } from './khmerFoodSearch';

export type CambodianMealTime = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type FoodCategoryTabId = 'all' | 'samlor' | 'cha' | 'bong_aem';

const SWEET_DESSERT_OR_CAKE_RE =
  /^បង្អែម|ចេកខ្ទិះ|សង់ខ្យា|អន្សម(?!ជ្រូក|ចៀន)|ក្រឡាន|បបរផ្អែម|បបរត្នោត|បបរត្រាវ|បបរសណ្តែក|បបរសណ្ដែក|បបរល្ពៅ|បាញ់ឌុក|បាញ់ចានឿក|បាយដំណើបស្វាយទុំ|លតស្វិត|លតអង្ករ|នំផ្លែអាយ|នំកង|នំគម|នំចាក់ចុល|នំល្ពៅ|នំចេក|ចេកចៀន|ដំឡូង.*បំពង|អំបុក|ចាហួយ|តៅហ៊ូទឹកស្ករ|ទឹកកកឈូស|ការ៉េម|\bdessert\b|\bcustard\b|\bsweet\s*soup\b|\bsweet\s*pudding\b|\bice\s*cream\b/i;

const SAVORY_NON_DESSERT_EXCLUSION_RE =
  /បាញ់ឆែវ|បាញ់ហយ|នំប៉័ង|គួង|ណែម|គូឆាយ|កាឆាយ|កចាយ|នំត្រាវបំពង|អន្សមជ្រូក|អន្សមចៀន|ពងទាកូន|ប្រហិត|នំគ្រក់|នំបញ្ចុក|ទឹកគ្រឿង/i;

const BEVERAGE_RE =
  /ភេសជ្ជៈ|^កាហ្វេ|^តែ(?!ងៀត)|^ទឹកអំពៅ|^ទឹកដូង|^ទឹកក្រឡុក|^ទឹកសណ្តែក|^ទឹកសណ្ដែក|^ទឹកផ្លែឈើ|^ទឹកត្រឡាច|^ទឹកមាត់ចាប|^ទឹកត្នោត|\bdrink\b|\bbeverage\b|\bsmoothie\b|\biced\s*tea\b|\bcoffee\b|\bcoconut\s*water\b|\bsugarcane\s*juice\b/i;

const NOODLE_DISH_RE =
  /(^មី|មីឆា|មីគោក|មីទឹក|មីលាក់ខ្លួន|មីសួរឆា|មីកូឡា|គុយទាវ|នំបញ្ចុក|លតឆា|បាញ់កាញ់|បាញ់ហយ|បាញ់ស៊ុង|ស្ប៉ាហ្គេទី|ហ្វឺ|\bnoodle|\bkuy\s*teav|\bkuyteav|\bnom\s*banh\s*chok|\bnum\s*banh\s*chok|\blort\s*cha|\bspaghetti|\bvermicelli)/i;

const SAVORY_CONGEE_RE =
  /^(បបរស|បបរមាន់|បបរត្រី|បបរគ្រឿងក្នុង|បបរឈាម|បបរគ្រឿងសមុទ្រ|បបរសាច់|បបរទា|បបរកង្កែប)|\bcongee\b|\brice\s*porridge\b/i;

const MORNING_NOODLE_RE =
  /^គុយទាវ|^នំបញ្ចុក|^មីគោក|^មីស៊ុប|^មីទឹក|^មីឆា|^មីកូឡា|^លតឆា|^បាញ់កាញ់|^បាញ់ស៊ុង|^ហ្វឺ|\bkuy\s*teav\b|\bnum\s*banh\s*chok\b|\blort\s*cha\b|\bnoodle\s*soup\b/i;

const MORNING_RICE_OR_BREAD_RE =
  /^បាយសាច់ជ្រូក|^បាយមាន់|^បាយខជើងជ្រូក|^បាយគោងៀត|^បាយត្រីងៀត|^បាយស្រូប|^បាយឆា|^នំប៉័ងប៉ាតេ|^ខគោនំប៉័ង|^សម្លការីមាន់នំប៉័ង|^ពងទាចៀន|\bpork\s*(?:and|&)?\s*rice\b|\bbai\s*sach\s*chrouk\b|\bhainanese\s*chicken\s*rice\b|\bcambodian\s*chicken\s*rice\b|\bbaguette\b|\bbeef\s*stew\s*with\s*bread\b/i;

const MORNING_SAMLOR_STEW_RE =
  /^ខគោ|^ខសាច់ជ្រូក|^ខជើងជ្រូក|^ខត្រី|^ខពងទា|^សម្លការី|^សម្លប្រហើរ|^ស្ងោរជ្រក់|^ស្ងោរង៉ាំង៉ូវ|^ស្ងោរមាន់|^ស្ងោរត្រី|^ស៊ុបមាន់|^ស៊ុបគោ|\bbeef\s*stew\b|\bchicken\s*curry\b|\bbraised\s*pork\b|\bclear\s*soup\b/i;

const MORNING_SWEET_OR_DRINK_RE =
  /^កាហ្វេ|^តែ|^ទឹកសណ្តែក|^ទឹកសណ្ដែក|^ទឹកដោះគោ|^នំកង|^នំគម|^នំអន្សម|^អន្សម|^ចេកចៀន|^ដំឡូង.*បំពង|^នំចាក់ចុល|^នំប៉ាវ|^នំចេក|^បបរផ្អែម|^បបរសណ្តែក|^បបរសណ្ដែក|^បបរត្រាវ|^ក្រឡាន|\bcoffee\b|\bsoy\s*milk\b|\bdonut\b|\bfried\s*banana\b/i;

const LUNCH_SAMLOR_RE =
  /^សម្លកកូរ|^សម្លម្ជូរ|^សម្លប្រហើរ|^សម្លការី|^សម្លខ្នុរ|^សម្លទំពាំង|^អាម៉ុក|^ទឹកគ្រឿង|^ប្រហុក|^កាពិ|^ខសាច់ជ្រូក|^ខជើងជ្រូក|^ខត្រី|^ស្ងោរម្រះ|^ស្ងោរជ្រក់|^ស្ងោរស្ពៃ|^ស្ងោរត្រឡាច/i;

const LUNCH_CHA_RE =
  /^ឡុកឡាក់|^ឆាក្តៅ|^ឆាក្ដៅ|^ឆាគ្រឿង|^ឆាខ្ញី|^ឆាបន្លែ|^ឆាត្រកួន|^ឆាមីសួរ|^ឆាប្រហុក|^ត្រីបំពង|^ត្រីអាំង|^មាន់ដុត|^មាន់អាំង|^សាច់គោអាំង|^សាច់ជ្រូកអាំង|^បាយឆា|^មីឆា|^លតឆា|^បុកល្ហុង|^ញាំ|^បាញ់ឆែវ|^ណែម/i;

const LUNCH_SWEET_OR_DRINK_RE =
  /^ទឹកអំពៅ|^ទឹកដូង|^ទឹកក្រឡុក|^តែក្រូចឆ្មារ|^ទឹកផ្លែឈើ|^កាហ្វេ|^បង្អែម|^ចេកខ្ទិះ|^លតស្វិត|^បាញ់ឌុក|^ទឹកកកឈូស|^ចាហួយ|^តៅហ៊ូទឹកស្ករ|^សង់ខ្យា|^ផ្លែឈើ/i;

const EVENING_HOTPOT_RE =
  /^ស៊ុបពោះគោ|^ស៊ុបឆ្នាំងដី|^ស៊ុបម្រះ|^ឆ្នាំងភ្លើង|^យ៉ាវហន|\bhot\s*pot\b|\bclaypot\s*soup\b/i;

const DINNER_SAMLOR_RE =
  /^ស៊ុប|^ស្ងោរង៉ាំង៉ូវ|^ស្ងោរជ្រក់|^ស្ងោរម្រះ|^ស្ងោរ|^សម្លម្ជូរ|^សម្លកកូរ|^សម្លការី|^សម្លប្រហើរ|^អាម៉ុក|^ខគោ|^ខសាច់ជ្រូក|^ទឹកគ្រឿង|^ប្រហុកខ្ទិះ/i;

const DINNER_CHA_RE =
  /^សាច់គោអាំង|^មាន់ដុត|^មាន់អាំង|^ទាអាំង|^ទាដុត|^ត្រីដុត|^ត្រីអាំង|^ត្រីបំពង|^ក្តាម.*ឆា|^ក្ដាម.*ឆា|^បង្គា|^មឹក|^គ្រំ|^ស្លាបមាន់|^ឡុកឡាក់|^ឆាក្តៅ|^ឆាក្ដៅ|^ឆាគ្រឿង|^ឆាខ្ញី|^ឆាបន្លែ|^ភ្លា|^ញាំ|^បុកល្ហុង|^បាយឆា|^មីឆា|^លតឆា|^បាញ់ឆែវ/i;

const DINNER_SWEET_OR_DRINK_RE =
  /^សង់ខ្យា|^បង្អែម|^ចេកខ្ទិះ|^បបរត្នោត|^បបរល្ពៅ|^បបរត្រាវ|^បបរសណ្តែក|^បបរសណ្ដែក|^បបរផ្អែម|^នំផ្លែអាយ|^លតស្វិត|^អន្សម|^ក្រឡាន|^អំបុក|^ការ៉េម|^ចាហួយ|^ទឹកដូង|^ទឹកក្រឡុក|^ទឹកផ្លែឈើ|^តែ/i;

const HEAVY_LUNCH_DINNER_ONLY_RE =
  /^សម្លកកូរ|^សម្លម្ជូរ|^សម្លខ្នុរ|^ស៊ុបពោះគោ|^ស៊ុបឆ្នាំងដី|^ប្រហុក|^ទឹកគ្រឿង|^កាពិ|^អាម៉ុក|^ឡុកឡាក់|^ឆាក្តៅ|^ឆាក្ដៅ|^ឆាគ្រឿង|^ភ្លា|^ញាំ|^បុកល្ហុង|^ក្តាម.*ឆា|^ក្ដាម.*ឆា|^មឹកអាំង|^បង្គាអាំង|^គ្រំអាំង|^ត្រីដុត/i;

const AFTERNOON_SAVORY_SNACK_RE =
  /^លតឆា|^នំគ្រក់|^នំកាឆាយ|^នំត្រាវ|^បាញ់ឆែវ|^បាញ់ហយ|^គួង|^ចាដូវ|^សាយ៉|^បុកល្ហុង|^លៀសហាល|^ប្រហិត|^សាច់ក្រក|^សាច់គោចង្កាក់|^ស្លាបមាន់|^ពងទាកូន|^នំប៉័ងប៉ាតេ|^មីកូឡា|\bspring\s*roll\b|\bpancake\b|\bskewer\b|\bstreet\b|\bpapaya\s*salad\b/i;

export function isBeverageDish(food: FoodItem): boolean {
  if (!food) return false;
  const kh = (food.nameKh || '').trim();
  if (SAVORY_NON_DESSERT_EXCLUSION_RE.test(kh)) return false;
  if (food.categorySlug === 'drink') return true;
  if (isBeverageFood(food)) return true;
  const text = `${food.nameKh || ''} ${food.nameEn || ''} ${food.categoryKh || ''} ${food.categoryEn || ''}`;
  return BEVERAGE_RE.test(text);
}

export function isSweetDessertOrCakeDish(food: FoodItem): boolean {
  if (!food) return false;
  if (isBeverageDish(food)) return false;
  const kh = (food.nameKh || '').trim();
  if (SAVORY_NON_DESSERT_EXCLUSION_RE.test(kh)) return false;
  if (food.categorySlug === 'dessert' || food.categorySlug === 'cake') return true;
  const text = `${food.nameKh || ''} ${food.nameEn || ''}`;
  if (SWEET_DESSERT_OR_CAKE_RE.test(text)) return true;
  return classifyKhmerFoodPrimaryGroup(food) === 'bong_aem';
}

export function isNoodleDishItem(food: FoodItem): boolean {
  if (!food) return false;
  if (isBeverageDish(food) || isSweetDessertOrCakeDish(food)) return false;
  if (food.categorySlug === 'noodles') return true;
  if (food.categorySlug === 'soup') return false;
  const text = `${food.nameKh || ''} ${food.nameEn || ''} ${food.categoryKh || ''} ${food.categoryEn || ''}`;
  return NOODLE_DISH_RE.test(text);
}

/**
 * Strictly checks if a dish belongs to the សម្ល (Cambodian Soups & Curries) category:
 * Includes Cambodian soups (សម្ល, ស្ងោរ, ស៊ុប), curries (ការី), and steamed curry amok (អាម៉ុក).
 * Excludes noodles, rice, congee, dry braised dishes, stir-fries, salads, grilled/fried items, and desserts/drinks.
 */
export function isSamlorSoupOrCurryDish(food: FoodItem): boolean {
  if (!food || !food.id || !food.nameKh) return false;
  if (isBeverageDish(food) || isSweetDessertOrCakeDish(food)) return false;
  const kh = (food.nameKh || '').trim();
  if (
    /^(គុយទាវ|មី|លត|បាញ់កាញ់|បាញ់ស៊ុង|នំបញ្ចុក|បបរ|បាយ|ប្រហុក|ទឹកគ្រឿង|កាពិ|ផាក់ឡូវ|ផាកឡូវ|ត្រី.*ចំហុយ|ខួរជ្រូកខ|ខមុំា|ខត្រី|ខសាច់|ខជើងជ្រូក|ខកង្កែប|ហុងជើងជ្រូក)/i.test(
      kh
    )
  ) {
    return false;
  }
  return (
    /^(សម្ល|ស្ងោរ|ស៊ុប|ការី|អាម៉ុក|ម្ជូរ|ឆ្នាំងភ្លើង|យ៉ាវហន|ខគោ)/i.test(kh) ||
    /(សម្ល|ការី|អាម៉ុក|កកូរ|ម្ជូរ|ប្រហើរ|ស្ងោរ|ស៊ុប|ឆ្នាំងភ្លើង|យ៉ាវហន)/i.test(kh)
  );
}

/**
 * Strictly checks if a dish belongs to the អាំង/ចៀន (Grilled & Fried) category:
 * Includes only grilled (អាំង/ដុត) and pan-fried / deep-fried (ចៀន/បំពង) food items.
 * Excludes soups, curries, stir-fries (ឆា), fried rice (បាយឆា), noodle dishes, salads (ញាំ/ភ្លា/ជ្រក់/បុក), and desserts/drinks.
 */
export function isGrilledOrFriedDish(food: FoodItem): boolean {
  if (!food || !food.id || !food.nameKh) return false;
  if (isBeverageDish(food) || isSweetDessertOrCakeDish(food) || isSamlorSoupOrCurryDish(food)) {
    return false;
  }
  const kh = (food.nameKh || '').trim();
  if (
    /^(ឆា|បាយ|មី|គុយទាវ|លត|នំបញ្ចុក|បាញ់កាញ់|បាញ់ស៊ុង|បបរ|សម្ល|ស្ងោរ|ស៊ុប|ញាំ|ភ្លា|ជ្រក់|បុក|ទឹកគ្រឿង|ឡុកឡាក់|ក្តាម.*ឆា|ក្ដាម.*ឆា|លាសឆា|បង្កងឆា|អយស្ទ័រស្រស់|ផាកឡូវ|ផាក់ឡូវ|ពងក្រួចកូន|ត្រីហើមក្រឡុក)/i.test(
      kh
    )
  ) {
    return false;
  }
  return /(អាំង|ចៀន|ដុត|បំពង|បាញ់ឆែវ|នំគ្រក់|សាច់ក្រក|សង្វាក់អាំង)/i.test(kh);
}

/**
 * Classifies a dish into one of the primary Food Screen tabs ('samlor' | 'cha' | 'bong_aem')
 * for meal-time scoring and general categorization.
 */
export function resolveFoodScreenCategoryTab(food: FoodItem): Exclude<FoodCategoryTabId, 'all'> {
  if (isBeverageDish(food) || isSweetDessertOrCakeDish(food)) {
    return 'bong_aem';
  }
  if (isSamlorSoupOrCurryDish(food)) {
    return 'samlor';
  }
  if (isGrilledOrFriedDish(food)) {
    return 'cha';
  }
  const grp = classifyKhmerFoodPrimaryGroup(food);
  if (grp === 'samlor' || grp === 'sngor') return 'samlor';
  if (grp === 'bong_aem') return 'bong_aem';
  return 'cha';
}

/**
 * Strict category filter for the 4 Food Menu category buttons:
 * - 'all' (គ្រប់មុខម្ហូប): All food items
 * - 'samlor' (សម្ល): Cambodian soups and curry dishes only
 * - 'cha' (អាំង/ចៀន): Grilled and fried food only
 * - 'bong_aem' (បង្អែម/ភេសជ្ជៈ): Desserts and beverages only
 */
export function matchesFoodScreenCategoryTab(food: FoodItem, catId: string): boolean {
  if (!food || !food.id || !food.nameKh) return false;
  if (!catId || catId === 'all') return true;
  if (catId === 'samlor') {
    return isSamlorSoupOrCurryDish(food);
  }
  if (catId === 'cha') {
    return isGrilledOrFriedDish(food);
  }
  if (catId === 'bong_aem') {
    return isBeverageDish(food) || isSweetDessertOrCakeDish(food);
  }
  return resolveFoodScreenCategoryTab(food) === catId;
}

/**
 * Scores a dish for a specific meal time ('breakfast' | 'lunch' | 'snack' | 'dinner')
 * while supporting all 3 food categories ('samlor', 'cha', 'bong_aem').
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
    if (catTab === 'samlor') {
      if (isCongee) return 100;
      if (/^ខគោ|^សម្លការី/i.test(kh)) return 96;
      if (MORNING_SAMLOR_STEW_RE.test(title)) return 86;
      if (HEAVY_LUNCH_DINNER_ONLY_RE.test(kh)) return 0;
      if (/^សម្លប្រហើរ|^ស្ងោរ|^ខ/i.test(kh)) return 76;
      return 0;
    }
    if (HEAVY_LUNCH_DINNER_ONLY_RE.test(kh)) return 0;
    if (/^បាយសាច់ជ្រូក|^គុយទាវ|^នំបញ្ចុក|^បាយមាន់|^នំប៉័ងប៉ាតេ/i.test(kh)) {
      return 100;
    }
    if (MORNING_RICE_OR_BREAD_RE.test(title) || MORNING_NOODLE_RE.test(title)) {
      return 88;
    }
    if (/^សាច់ជ្រូកអាំង|^មាន់អាំង|^ត្រីអាំង|^សាច់គោអាំង|^ពងទា/i.test(kh)) {
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
      food.categorySlug === 'stirfry' ||
      food.categorySlug === 'grilled' ||
      food.categorySlug === 'salad' ||
      food.categorySlug === 'rice' ||
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
    food.categorySlug === 'grilled' ||
    food.categorySlug === 'stirfry' ||
    food.categorySlug === 'salad' ||
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
