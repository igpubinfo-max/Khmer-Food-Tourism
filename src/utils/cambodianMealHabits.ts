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

const MORNING_ICONIC_NOODLE_RE =
  /^គុយទាវ(?!ឆា)|^នំបញ្ចុក|^មីគោក|^មីស៊ុប|^មីទឹក|^មីកូឡា|^មីលាក់ខ្លួន|^មីសួរសាច់មាន់|^មីខគោ|^មីក្រឡុក|^បាញ់កាញ់|^បាញ់ស៊ុង|^បាញ់ហយ|^ហ្វឺ|\bkuy\s*teav(?!\s*cha)\b|\bkuyteav\b|\bnum\s*banh\s*chok\b|\bnom\s*banh\s*chok\b|\bbanh\s*kanh\b|\bbanh\s*hoy\b|\bmee\s*kola\b/i;

const MORNING_ICONIC_RICE_BREAD_RE =
  /^បាយសាច់ជ្រូក|^បាយមាន់|^បាយខជើងជ្រូក|^បាយគោងៀត|^បាយត្រីងៀត|^បាយស្រូប|^នំប៉័ងប៉ាតេ|^ខគោនំប៉័ង|^សម្លការីមាន់នំប៉័ង|^អូម៉ាឡែត.*នំប៉័ង|^នំប៉័ងផូសបារាំង|^នំអន្សម|\bbai\s*sach\s*chrouk\b|\bnum\s*pang\s*pate\b|\bbeef\s*stew\s*with\s*(?:crispy\s*)?baguette\b/i;

const MORNING_FRIED_NOODLE_OR_RICE_RE =
  /^លតឆា|^គុយទាវឆា|^មីឆាសាច់គោ|^មីឆាបួស|^មីឆាពងទា|^បាយឆាអំបិល|^បាយឆាបួសខ្ចប់ពងមាន់|^បាយឆាពងទា$/i;

const NON_MORNING_NOODLE_OR_RICE_RE =
  /^មីឆាគ្រឿងសមុទ្រ|^មីសួរឆាក្តាម|^បាយឆាក្តាម|^បាយឆាឡុកឡាក់|^បាយឆាម្រះព្រៅ|^បាយឆាយ៉ាងចូវ|^បាយឆាសាច់ជ្រូកស្រួយ|^បាយក្តាំង|^បាយស៊ូផាយ|^បាយជាមួយតៅហ៊ូខ/i;

const MORNING_ONLY_DISH_RE =
  /^គុយទាវ(?!ឆា)|^នំបញ្ចុក|^មីគោក|^មីស៊ុប|^មីទឹក|^មីកូឡា|^មីលាក់ខ្លួន|^មីសួរសាច់មាន់|^មីខគោ|^មីក្រឡុក|^បាញ់កាញ់|^បាញ់ស៊ុង|^បាញ់ហយ|^ហ្វឺ|^បាយសាច់ជ្រូក|^បាយមាន់ស្ងោរ|^បាយខជើងជ្រូក|^បាយគោងៀត|^បាយត្រីងៀត|^បាយស្រូប|^បាយឆាអំបិល|^បាយឆាបួសខ្ចប់ពងមាន់|^នំប៉័ងប៉ាតេ|^ខគោនំប៉័ង|^សម្លការីមាន់នំប៉័ង|^អូម៉ាឡែត.*នំប៉័ង|^នំប៉័ងផូសបារាំង|^នំអន្សម|\bkuy\s*teav(?!\s*cha)\b|\bkuyteav\b|\bnum\s*banh\s*chok\b|\bnom\s*banh\s*chok\b|\bbanh\s*kanh\b|\bbanh\s*hoy\b|\bmee\s*kola\b|\bbai\s*sach\s*chrouk\b|\bnum\s*pang\s*pate\b|\bbeef\s*stew\s*with\s*(?:crispy\s*)?baguette\b/i;

const MORNING_SWEET_OR_DRINK_RE =
  /^កាហ្វេ|^តែ|^ទឹកសណ្តែក|^ទឹកសណ្ដែក|^ទឹកដោះគោ|^នំកង|^នំគម|^នំអន្សម|^អន្សម|^ចេកចៀន|^ដំឡូង.*បំពង|^នំចាក់ចុល|^នំប៉ាវ|^នំចេក|^បបរផ្អែម|^បបរសណ្តែក|^បបរសណ្ដែក|^បបរត្រាវ|^ក្រឡាន|\bcoffee\b|\bsoy\s*milk\b|\bdonut\b|\bfried\s*banana\b/i;

const STREET_SNACK_ONLY_RE =
  /^ពងទាកូន|^ពងក្រួចកូន|^លៀសហាល|^ប្រហិតសាច់គោចៀន|^ប្រហិតខ្យង|^នំកាឆាយ|^នំត្រាវបំពង|^គួងបង្គា|^ចាយ៉បួសបំពង|^គល់ផ្សិតបំពង|^គល់ផ្សិតអាំងចង្កាក់|^សាច់បួសអាំងចង្កាក់|^សាច់គោចង្កាក់អាំង|^កោះមាន់អាំង|^ខ្យងស្រែអាំង|^ងាវស្រុះ|^ហៃប៊ីក្រូចឆ្មារ|^ជ្រក់គ្រប់មខក្រឡុក|^ជ្រក់គ្រប់មុខក្រឡុក|^ជ្រក់បង្គាឆៃប៉ូវក្រឡុក|^ជ្រក់ជើងមាន់|^បុកមីកញ្ចប់|^បុកមីជើងមាន់|^ឃ្មុំអាំង|^បាញ់ឆែវ|^បឺហ្គឺរ|^នំអន្សម/i;

const EVENING_SEAFOOD_OR_BAR_ONLY_RE =
  /^អយស្ទ័រ|^គ្រំសមុទ្រអាំង|^ងាវអប់|^សរសៃកែងមាន់បំពង|^ព្រុយត្រីសាលម៉ុនអាំង|^ក្ដាមពងជ្រក់|^ត្រីសាលម៉ុនត្រាំ|^ស្លាបមាន់អាំង/i;

const LUNCH_SAMLOR_RE =
  /^សម្លកកូរ|^សម្លម្ជូរ|^សម្លប្រហើរ|^សម្លការី|^សម្លខ្ទិះ|^សម្លខ្នុរ|^សម្លទំពាំង|^ម្ជូរពងត្រី|^ម្ជូរក្រអៅឈូក|^អាម៉ុក|^ទឹកគ្រឿង|^ប្រហុក|^កាពិ|^ផ្អកចំហុយ|^ខសាច់ជ្រូក|^ខត្រី|^ខជើងជ្រូក|^ខប្រហុក|^ខម៉ាំ|^ផាក់ឡូវ|^ស្ងោរជ្រក់|^ស្ងោរម្រះ|^ស្ងោរង៉ាំង៉ូវ|^ស្ងោរត្រី|^ស្ងោរមាន់|^ស្ងោរឆ្អឹងជំនីរ|^ស្ងោរទំពាំង|^ស្ងោរផ្ទី|^ស្ងោរស្ពៃ|^ស្ងោរត្រឡាច|^ស្ងោរល្ហុង/i;

const LUNCH_CHA_RE =
  /^ឆាក្តៅ|^ឆាខ្ញី|^ឆាម្រះព្រៅ|^ឆាត្រកួន|^ឆាគ្រឿង|^ឆាបន្លែ|^ឆាផ្សិត|^ឆាត្រប់|^ឆាសណ្តែក|^ឆាផ្កាខាត់ណា|^ឆាខាត់ណា|^ឆាមាន់|^ឆាជូរផ្អែម|^ឆាម្នាស់|^ឆាសាច់គោ|^ឆាស្ពៃ|^ឡុកឡាក់|^ត្រីចៀន|^ត្រីអាំង|^ត្រីបំពង|^មាន់អាំង|^មាន់ដុត|^សាច់គោអាំង|^សាច់ជ្រូកអាំង|^បាយឆាឡុកឡាក់|^បាយឆាក្តាម|^បាយឆាម្រះព្រៅ|^បាយឆាយ៉ាងចូវ|^បាយឆាសាច់ជ្រូកស្រួយ|^បាយស៊ូផាយ|^បាយជាមួយតៅហ៊ូខ|^ញាំ|^ភ្លា|^បុកល្ហុង|^បុកក្រសាំង|^បុកសណ្តែកកួរ|^បុកស្វាយ/i;

const LUNCH_SWEET_OR_DRINK_RE =
  /^ទឹកអំពៅ|^ទឹកដូង|^ទឹកក្រឡុក|^តែក្រូចឆ្មារ|^ទឹកត្រឡាច|^ទឹកត្នោត|^ទឹកផ្លែឈើ|^បង្អែម|^ទឹកកកឈូស|^ចាហួយ|^តៅហ៊ូទឹកស្ករ|^បាញ់ឌុក|^សង់ខ្យា|^ចេកខ្ទិះ|^បាយដំណើបស្វាយទុំ|^លតអង្ករ/i;

const AFTERNOON_SAVORY_SNACK_RE =
  /^លតឆា|^គុយទាវឆា|^មីឆាសាច់គោ|^មីឆាបួស|^បាញ់ឆែវ|^បាញ់ហយ|^នំគ្រក់|^គួង|^ចាដូវ|^ណែម|^ចាយ៉|^បុកល្ហុង|^បុកក្ដាម|^បុកក្តាម|^បុកមី|^បុកពោត|^បុកស្វាយ|^បុកកន្ទួត|^បុកក្រសាំង|^បុកកំពឹស|^បុកសណ្តែក|^សាច់គោអាំងចង្កាក់|^សាច់គោចង្កាក់|^សាច់ជ្រូកអាំងចង្កាក់|^សាច់បួសអាំងចង្កាក់|^គល់ផ្សិតអាំងចង្កាក់|^គល់ផ្សិតបំពង|^តៅហ៊ូបំពង|^ប្រហិត|^ពងទាកូន|^ពងក្រួចកូន|^ស្លាបមាន់|^នំប៉័ងប៉ាតេ|^គូឆាយ|^កាឆាយ|^នំកាឆាយ|^កចាយ|^នំត្រាវបំពង|^នំអន្សម|^អន្សមចៀន|^កំពិសលីង|^លៀសហាល|^ងាវស្រុះ|^ងាវអប់|^ខ្យងស្រែអាំង|^កោះមាន់អាំង|^ជ្រក់ជើងមាន់|^ជ្រក់គ្រប់មុខ|^ជ្រក់បង្គា|^ហៃប៊ីក្រូចឆ្មារ|^ញាំ|^បឺហ្គឺរ|\blort\s*cha\b|\bbanh\s*chao\b|\bnum\s*krok\b|\bspring\s*roll\b|\bpapaya\s*salad\b|\bskewer\b|\bmeatball\b|\bbalut\b|\bchive\s*cake\b/i;

const EVENING_HOTPOT_RE =
  /ឆ្នាំងភ្លើង|យ៉ាវហន|ស៊ុបគោឆ្នាំងដី|ស៊ុបមាន់ខ្មៅ|ស៊ុបពពែ|ស៊ុបគ្រឿងសមុទ្រ|ស៊ុបម្រះ|ស៊ុបឆ្អឹងជំនីជ្រូកជូរហឹរ|ស៊ុបជើងមាន់ជូរហឹរ|ស៊ុបឈាមមាន់ជូរហឹរ|\bhot\s*pot\b|\byao\s*hon\b|\bbeef\s*hotpot\b|\bclaypot\s*soup\b/i;

const DINNER_ICONIC_RE =
  /ឆ្នាំងភ្លើង|យ៉ាវហន|ស៊ុបគោឆ្នាំងដី|ស៊ុបឆ្អឹងជំនីជ្រូកជូរហឹរ|ស៊ុបជើងមាន់ជូរហឹរ|ស៊ុបឈាមមាន់ជូរហឹរ|^មាន់ដុត|^ទាអាំង|^ទាផាក់ឡូវ|^មឹកអាំង|^បង្គាអាំង|^ក្តាមសេះឆាម្រេចខ្ចី|^ឆាបង្កង|^បង្កងឆាពងទាប្រៃ|^ឆាមឹក|^ត្រីតុកកែចំហុយ|^ត្រីរ៉ស់ដុត|^សាច់គោអាំងទឹកប្រហុក|^សាច់ជ្រូកបីជាន់អាំង|^ឆ្អឹងជំនីរជ្រូកអាំង|^ឡុកឡាក់សាច់គោ|^អាម៉ុក|^ហុងជើងជ្រូក|^បាយក្តាំងពិសេស|^មីសួរឆាក្តាម|^មីឆាគ្រឿងសមុទ្រ|^អយស្ទ័រ|^គ្រំសមុទ្រអាំង|^ងាវអប់/i;

const DINNER_SAMLOR_RE =
  /^សម្លម្ជូរ|^សម្លកកូរ|^សម្លការី|^សម្លប្រហើរ|^សម្លខ្ទិះ|^អាម៉ុក|^ស្ងោរជ្រក់|^ស្ងោរង៉ាំង៉ូវ|^ស្ងោរម្រះ|^ស្ងោរត្រី|^ស្ងោរមាន់|^ស្ងោរផ្ទី|^ស្ងោរស្ពៃ|^ស្ងោរត្រឡាច|^ស្ងោរល្ហុង|^ស៊ុបប្រហិតត្រី|^ទឹកគ្រឿង|^ប្រហុកខ្ទិះ|^ប្រហុកគ្រឿង|^ខសាច់ជ្រូក|^ខត្រី|^ខជើងជ្រូក|^ហុងជើងជ្រូក/i;

const DINNER_CHA_RE =
  /^ឡុកឡាក់|^ឆាក្តៅ|^ឆាខ្ញី|^ឆាម្រះព្រៅ|^ឆាគ្រឿង|^ឆាត្រកួន|^ឆាផ្សិត|^ឆាបន្លែ|^ឆាមឹក|^ឆាបង្គា|^ឆាបង្កង|^ឆាក្តាម|^ក្តាមសេះឆា|^ក្ដាមឆា|^បង្កងឆា|^លៀសឆា|^ត្រីដុត|^ត្រីអាំង|^ត្រីបំពង|^ត្រីចៀន|^ត្រីតុកកែចំហុយ|^មាន់ដុត|^មាន់អាំង|^ទាអាំង|^ទាផាក់ឡូវ|^សាច់គោអាំង|^សាច់ជ្រូកបីជាន់អាំង|^សាច់ជ្រូកអាំង|^ឆ្អឹងជំនីរជ្រូកអាំង|^បង្គាអាំង|^មឹកអាំង|^អយស្ទ័រ|^គ្រំសមុទ្រអាំង|^ងាវអប់|^ភ្លា|^ញាំ|^បាយក្តាំង|^បាយឆាឡុកឡាក់|^បាយឆាក្តាម|^បាយឆាម្រះព្រៅ|^បាយឆាយ៉ាងចូវ|^បាយឆាសាច់ជ្រូកស្រួយ|^មីសួរឆាក្តាម|^មីឆាគ្រឿងសមុទ្រ/i;

const DINNER_SWEET_OR_DRINK_RE =
  /^បង្អែម|^សង់ខ្យា|^ចេកខ្ទិះ|^បាយដំណើបស្វាយទុំ|^នំផ្លែអាយ|^បាញ់ចានឿក|^តៅហ៊ូទឹកស្ករ|^ទឹកដូង|^ទឹកក្រឡុក|^ទឹកត្រឡាច|^ទឹកសណ្តែក|^ទឹកសណ្ដែក|^លតអង្ករ/i;

const HEAVY_LUNCH_DINNER_ONLY_RE =
  /ឆ្នាំងភ្លើង|យ៉ាវហន|ស៊ុបគោឆ្នាំងដី|សម្លកកូរ|សម្លម្ជូរ|សម្លប្រហើរ|សម្លការី|អាម៉ុក|ប្រហុកខ្ទិះ|ប្រហុកកប់|ទឹកគ្រឿង|ភ្លាសាច់គោ|ក្តាមសេះឆា|ក្ដាមឆា|បង្កងឆា|មឹកអាំង|ត្រីរ៉ស់ដុត|\bhot\s*pot\b|\byao\s*hon\b|\bamok\b/i;

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
 * - 'noodles' (គុយទាវ/មី): Noodle dishes only (kuy teav, num banh chok, mee ...)
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
  if (catId === 'noodles') {
    return isNoodleDishStrict(food) && !isVegetarianDish(food) && !isBeverageDish(food) && !isSweetDessertOrCakeDish(food);
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
 * strictly following authentic Cambodian eating habits so dishes from the wrong meal time never mix.
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
  const isCongee = SAVORY_CONGEE_RE.test(title) && catTab !== 'bong_aem';

  // 1. BREAKFAST (ពេលព្រឹក): Strictly authentic Cambodian morning dishes only
  if (slot === 'breakfast') {
    if (catTab === 'bong_aem') {
      if (MORNING_SWEET_OR_DRINK_RE.test(title)) return 92;
      return 0;
    }
    if (NON_MORNING_NOODLE_OR_RICE_RE.test(kh)) return 0;
    if (isCongee) {
      return /^បបរមាន់|^បបរត្រី|^បបរសាមចូក|^បបរសាច់ជ្រូក|^បបរសពងទាប្រៃ/i.test(kh) ? 100 : 95;
    }
    if (
      /^បាយសាច់ជ្រូក|^គុយទាវភ្នំពេញ|^គុយទាវខសាច់គោ|^នំបញ្ចុកសម្លខ្មែរ|^បាយមាន់ស្ងោរ|^នំប៉័ងប៉ាតេ|^ខគោនំប៉័ង/i.test(
        kh
      )
    ) {
      return 100;
    }
    if (MORNING_ICONIC_NOODLE_RE.test(title) || MORNING_ICONIC_RICE_BREAD_RE.test(title)) {
      return 96;
    }
    if (MORNING_FRIED_NOODLE_OR_RICE_RE.test(title)) {
      return 88;
    }
    return 0;
  }

  // 2. LUNCH (ពេលថ្ងៃត្រង់): Strictly authentic Cambodian midday meals (no morning-only noodles/bread/congee, no evening hotpots/bar snacks)
  if (slot === 'lunch') {
    if (catTab === 'bong_aem') {
      if (/^កាហ្វេ/i.test(kh)) return 78;
      if (LUNCH_SWEET_OR_DRINK_RE.test(title)) return 94;
      return 76;
    }
    if (isCongee) return 0;
    if (MORNING_ONLY_DISH_RE.test(title)) return 0;
    if (STREET_SNACK_ONLY_RE.test(kh)) return 0;
    if (EVENING_HOTPOT_RE.test(title)) return 0;
    if (EVENING_SEAFOOD_OR_BAR_ONLY_RE.test(kh)) return 0;
    if (LUNCH_SAMLOR_RE.test(kh) || LUNCH_CHA_RE.test(kh)) return 100;
    return 86;
  }

  // 3. AFTERNOON SNACK (រសៀល): Street snacks, savory bites, pounded salads, desserts & drinks
  if (slot === 'snack') {
    if (HEAVY_LUNCH_DINNER_ONLY_RE.test(kh)) return 0;
    if (isCongee) return 0;
    if (AFTERNOON_SAVORY_SNACK_RE.test(title)) return 100;
    if (catTab === 'bong_aem') return 95;
    return 0;
  }

  // 4. DINNER (ពេលល្ងាច): Strictly authentic Cambodian evening & family dinner dishes (no morning-only breakfast items or daytime street snacks)
  if (catTab === 'bong_aem') {
    if (/^កាហ្វេ/i.test(kh)) return 0;
    if (DINNER_SWEET_OR_DRINK_RE.test(title)) return 94;
    return 76;
  }
  if (isCongee) return 0;
  if (MORNING_ONLY_DISH_RE.test(title)) return 0;
  if (STREET_SNACK_ONLY_RE.test(kh)) return 0;
  if (/^ប្រហុកឆៅ|^ម៉ាំឆៅ|^ម៉ាំល្ហុង|^ត្រីហើមក្រឡុក|^ពងទាប្រៃ$|^លតឆា|^គុយទាវឆា|^មីឆាសាច់គោ|^មីឆាបួស/i.test(kh)) {
    return 0;
  }
  if (DINNER_ICONIC_RE.test(kh) || EVENING_HOTPOT_RE.test(title)) return 100;
  if (DINNER_SAMLOR_RE.test(kh) || DINNER_CHA_RE.test(kh)) return 94;
  return 85;
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

  return scored.length > 0 ? scored.map((entry) => entry.food) : [];
}
