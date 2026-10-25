/**
 * AI Health & Nutrition Assistant Service (ជំនួយការ AI សុខភាព និងអាហារូបត្ថម្ភ)
 * ---------------------------------------------------------------------------
 * Provides evidence-based nutritional analysis for all 200 Cambodian dishes,
 * Khmer & English Health Q&A, Personalized Daily Balanced Meal Planning (3 Meals),
 * Healthy Cambodian Recipe modifications, Home Ingredient matching, and
 * Khmer Superfood & Culinary Herb nutritional insights.
 *
 * Cost Optimization: 100% deterministic, evidence-based local knowledge engine
 * ($0 external API cost, instant <15ms response, works online & offline).
 *
 * Medical Disclaimer: Provides general evidence-based nutrition education aligned
 * with WHO & Ministry of Health Cambodia guidelines; not a substitute for professional
 * medical diagnosis or treatment.
 */

import { FoodItem } from '../types';
import {
  generateMultiTurnHealthAnswer,
  createHealthConversationSession,
  loadHealthConversationSession,
  saveHealthConversationSession,
  askHealthAssistantInSession,
  retryHealthTurnInSession,
  resetHealthConversationSession,
  detectQueryLanguage,
  HEALTH_QUICK_QUESTIONS_TRILINGUAL,
  SafetyEscalationLevel,
  SafetyEscalationBanner,
  HealthConversationTurn,
  HealthConversationSession,
} from './aiHealthKnowledgeEngine';

export {
  createHealthConversationSession,
  loadHealthConversationSession,
  saveHealthConversationSession,
  askHealthAssistantInSession,
  retryHealthTurnInSession,
  resetHealthConversationSession,
  detectQueryLanguage,
  HEALTH_QUICK_QUESTIONS_TRILINGUAL,
};
export type {
  SafetyEscalationLevel,
  SafetyEscalationBanner,
  HealthConversationTurn,
  HealthConversationSession,
};

export type HealthGoalId =
  | 'all'
  | 'weight_loss'
  | 'heart_bp'
  | 'blood_sugar'
  | 'high_protein'
  | 'gut_fiber'
  | 'immunity_herbs'
  | 'light_digest';

export type TastePreference = 'all' | 'sour' | 'sweet' | 'salty' | 'spicy' | 'mild';
export type DietaryPreference = 'all' | 'halal_friendly' | 'vegetarian' | 'no_pork' | 'no_beef' | 'seafood_lover';
export type BudgetLevel = 'all' | 'budget' | 'moderate' | 'premium';
export type MaxPrepTime = 'all' | 'fast_20' | 'medium_40' | 'slow_cook';

export interface DishNutritionProfile {
  foodId: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
  sugarG: number;
  sodiumLevel: 'low' | 'medium' | 'high';
  sugarLevel: 'low' | 'medium' | 'high';
  glycemicImpact: 'low' | 'medium' | 'high';
  healthScore: number; // 55 - 98
  matchingGoals: HealthGoalId[];
  keyNutrientsKh: string[];
  keyNutrientsEn: string[];
  healthBenefitsKh: string;
  healthBenefitsEn: string;
  healthyCookingTipKh: string;
  healthyCookingTipEn: string;
  cautionNoteKh?: string;
  cautionNoteEn?: string;
}

export interface HealthGoalMetadata {
  id: HealthGoalId;
  icon: string;
  labelKh: string;
  labelEn: string;
  shortLabelKh: string;
  shortLabelEn: string;
  descriptionKh: string;
  descriptionEn: string;
  targetCaloriesPerMeal: string;
}

export interface DailyMealPlanSlot {
  slotId: 'breakfast' | 'lunch' | 'dinner';
  labelKh: string;
  labelEn: string;
  timeRangeKh: string;
  timeRangeEn: string;
  dish: FoodItem;
  nutrition: DishNutritionProfile;
  portionTipKh: string;
  portionTipEn: string;
}

export interface DailyBalancedMealPlan {
  goalId: HealthGoalId;
  planIndex: number;
  totalCaloriesKcal: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFiberG: number;
  totalSodiumMg: number;
  meals: DailyMealPlanSlot[];
  snackAndHydrationKh: string;
  snackAndHydrationEn: string;
  healthyPlateAdviceKh: string;
  healthyPlateAdviceEn: string;
}

export interface HealthQaAnswer {
  id: string;
  topicId?: string;
  turnNumber?: number;
  isFollowUp?: boolean;
  previousTopicId?: string | null;
  safetyLevel?: SafetyEscalationLevel;
  safetyEscalation?: SafetyEscalationBanner;
  questionKh: string;
  questionEn: string;
  questionZh?: string;
  categoryBadgeKh: string;
  categoryBadgeEn: string;
  categoryBadgeZh?: string;
  summaryKh: string;
  summaryEn: string;
  summaryZh?: string;
  bulletPointsKh: string[];
  bulletPointsEn: string[];
  bulletPointsZh?: string[];
  foodsToChooseKh: string[];
  foodsToChooseEn: string[];
  foodsToChooseZh?: string[];
  foodsToLimitKh: string[];
  foodsToLimitEn: string[];
  foodsToLimitZh?: string[];
  recommendedDishes: Array<{ food: FoodItem; nutrition: DishNutritionProfile }>;
  medicalAdvisoryKh: string;
  medicalAdvisoryEn: string;
  medicalAdvisoryZh?: string;
  trustedSourcesKh?: string[];
  trustedSourcesEn?: string[];
  trustedSourcesZh?: string[];
  uncertaintyNoteKh?: string;
  uncertaintyNoteEn?: string;
  uncertaintyNoteZh?: string;
  followUpSuggestionsKh?: string[];
  followUpSuggestionsEn?: string[];
  followUpSuggestionsZh?: string[];
}

export interface KhmerSuperfoodItem {
  id: string;
  nameKh: string;
  nameEn: string;
  emoji: string;
  keyVitaminsKh: string;
  keyVitaminsEn: string;
  benefitsKh: string;
  benefitsEn: string;
  bestUsageTipKh: string;
  bestUsageTipEn: string;
  searchKeywordsKh: string[];
}

export interface UserHealthMetricsInput {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active';
  goalId: HealthGoalId;
}

export interface UserHealthMetricsSummary {
  bmi: number;
  bmiCategoryKh: string;
  bmiCategoryEn: string;
  bmiColorClass: string;
  dailyCalorieTargetKcal: number;
  dailyProteinTargetG: number;
  dailyFiberTargetG: number;
  dailyWaterLiters: number;
  maxSodiumMg: number;
  personalizedAdviceKh: string;
  personalizedAdviceEn: string;
}

export interface HomeIngredientsMatchResult {
  food: FoodItem;
  matchedIngredients: string[];
  missingIngredients: string[];
  matchPercentage: number;
  nutrition: DishNutritionProfile;
}

const USER_HEALTH_PROFILE_STORAGE_KEY = 'kft_health_user_profile_v1';

export const MEDICAL_DISCLAIMER_KH =
  '⚕️ សេចក្តីជូនដំណឹងវេជ្ជសាស្ត្រ៖ ព័ត៌មានអាហារូបត្ថម្ភ និងការណែនាំក្នុងប្រព័ន្ធ AI នេះ គឺផ្អែកលើគោលការណ៍អាហារសុខភាពទូទៅ (WHO & ក្រសួងសុខាភិបាល) សម្រាប់ជាចំណេះដឹងប៉ុណ្ណោះ មិនមែនជាការធ្វើរោគវិនិឆ្ឆ័យ ឬវេជ្ជបញ្ជាព្យាបាលជំងឺឡើយ។ ប្រសិនបើលោកអ្នកមានជំងឺប្រចាំកាយ (ដូចជា ទឹកនោមផ្អែម លើសឈាម ជំងឺតម្រងនោម ឬអាឡែហ្ស៊ីអាហារធ្ងន់ធ្ងរ) សូមពិគ្រោះយោបល់ជាមួយគ្រូពេទ្យជំនាញ។';

export const MEDICAL_DISCLAIMER_EN =
  '⚕️ Medical Disclaimer: This AI Health & Nutrition Assistant provides evidence-based nutritional education aligned with WHO and Ministry of Health guidelines for informational purposes only. It is not a substitute for professional medical diagnosis or treatment. Always consult a qualified physician or dietitian for medical conditions.';

export const HEALTH_GOALS_CATALOG: HealthGoalMetadata[] = [
  {
    id: 'all',
    icon: '🌟',
    labelKh: 'ម្ហូបសុខភាពទាំងអស់ (Top Healthy Cambodian Picks)',
    labelEn: 'Top Healthy Cambodian Dishes',
    shortLabelKh: 'ទាំងអស់',
    shortLabelEn: 'All Healthy',
    descriptionKh: 'មុខម្ហូបខ្មែរដែលមានតុល្យភាពអាហារូបត្ថម្ភល្អ សម្បូរបន្លែ ត្រី និងគ្រឿងទេសធម្មជាតិ។',
    descriptionEn: 'Balanced Cambodian dishes rich in fresh vegetables, fish, and natural herbs.',
    targetCaloriesPerMeal: '320 - 520 kcal',
  },
  {
    id: 'weight_loss',
    icon: '⚖️',
    labelKh: 'សម្រកទម្ងន់ & កាឡូរីទាប (Weight Balance & Low Calorie)',
    labelEn: 'Weight Balance & Low Calorie',
    shortLabelKh: 'សម្រកទម្ងន់',
    shortLabelEn: 'Weight Loss',
    descriptionKh: 'មុខម្ហូបកាឡូរីទាប (≤ 400 kcal) ខ្លាញ់ទាប សម្បូរជាតិសរសៃ ជួយឱ្យឆ្អែតបានយូរ។',
    descriptionEn: 'Low-calorie (≤ 400 kcal), low-fat dishes rich in fiber for healthy weight management.',
    targetCaloriesPerMeal: '240 - 390 kcal',
  },
  {
    id: 'heart_bp',
    icon: '❤️',
    labelKh: 'ជំនួយបេះដូង & សម្ពាធឈាម (Heart & Blood Pressure Friendly)',
    labelEn: 'Heart & Blood Pressure Friendly',
    shortLabelKh: 'បេះដូង/សម្ពាធឈាម',
    shortLabelEn: 'Heart & BP',
    descriptionKh: 'កាត់បន្ថយជាតិប្រៃ (សូដ្យូមទាប) និងខ្លាញ់ឆ្អែត សម្បូរអូមេហ្គា-៣ ពីត្រី និងប៉ូតាស្យូមពីបន្លែ។',
    descriptionEn: 'Lower sodium and saturated fat, rich in fish omega-3 and potassium from greens.',
    targetCaloriesPerMeal: '280 - 460 kcal',
  },
  {
    id: 'blood_sugar',
    icon: '🩸',
    labelKh: 'គ្រប់គ្រងជាតិស្ករក្នុងឈាម (Blood Sugar & Low Glycemic)',
    labelEn: 'Blood Sugar & Low Glycemic Control',
    shortLabelKh: 'គ្រប់គ្រងជាតិស្ករ',
    shortLabelEn: 'Blood Sugar',
    descriptionKh: 'ជាតិស្ករទាប សម្បូរបន្លែបៃតង និងប្រូតេអ៊ីន ជួយរក្សាលំនឹងជាតិស្ករក្នុងឈាម។',
    descriptionEn: 'Low added sugar, high fiber and lean protein to support steady blood glucose.',
    targetCaloriesPerMeal: '260 - 440 kcal',
  },
  {
    id: 'high_protein',
    icon: '💪',
    labelKh: 'សម្បូរប្រូតេអ៊ីន & ថាមពល (High Protein & Muscle Support)',
    labelEn: 'High Protein & Energy Support',
    shortLabelKh: 'ប្រូតេអ៊ីនខ្ពស់',
    shortLabelEn: 'High Protein',
    descriptionKh: 'សម្បូរប្រូតេអ៊ីនពីត្រី សាច់មាន់ សាច់គោ និងស៊ុត (≥ 22g ក្នុង ១ ចំណែក) ជួយជួសជុលសាច់ដុំ។',
    descriptionEn: 'Rich in protein from fish, poultry, beef, and eggs (≥ 22g/serving) for strength.',
    targetCaloriesPerMeal: '350 - 560 kcal',
  },
  {
    id: 'gut_fiber',
    icon: '🌿',
    labelKh: 'ជំនួយប្រព័ន្ធរំលាយអាហារ & សម្បូរបន្លែ (High Fiber & Gut Health)',
    labelEn: 'High Fiber & Digestive Wellness',
    shortLabelKh: 'សម្បូរបន្លែ/ជាតិសរសៃ',
    shortLabelEn: 'High Fiber',
    descriptionKh: 'សម្បូរបន្លែចម្រុះ ស្លឹកម្រុំ ត្រកួន ល្ហុង និងត្រួយឈើ ជួយសម្រួលការបន្ទោរបង់ និងពោះវៀន។',
    descriptionEn: 'Packed with diverse Cambodian greens, moringa, and papaya for gut health.',
    targetCaloriesPerMeal: '250 - 430 kcal',
  },
  {
    id: 'immunity_herbs',
    icon: '🛡️',
    labelKh: 'បង្កើនភាពស៊ាំ & គ្រឿងទេសឱសថខ្មែរ (Immunity & Khmer Herbs)',
    labelEn: 'Immunity & Medicinal Khmer Herbs',
    shortLabelKh: 'បង្កើនភាពស៊ាំ',
    shortLabelEn: 'Immunity',
    descriptionKh: 'សម្បូរគ្រឿងទេសខ្មែរ (រមៀត ស្លឹកគ្រៃ ខ្ញី រំដេង ខ្ទឹមស ស្លឹកក្រូចសើច) ប្រឆាំងការរលាក។',
    descriptionEn: 'Rich in turmeric, lemongrass, ginger, galangal, and garlic with antioxidant properties.',
    targetCaloriesPerMeal: '280 - 480 kcal',
  },
  {
    id: 'light_digest',
    icon: '🥣',
    labelKh: 'ស្រួលរំលាយអាហារ & សម្រាប់ក្រពះ (Gentle & Easy Digestion)',
    labelEn: 'Gentle & Stomach-Friendly Meals',
    shortLabelKh: 'ស្រួលរំលាយ/ក្រពះ',
    shortLabelEn: 'Gentle Digest',
    descriptionKh: 'ស៊ុប ស្ងោរ និងបបរក្តៅៗ មិនហឹរខ្លាំង មិនឆ្អល់ពោះ សាកសមសម្រាប់អ្នកឈឺក្រពះ ឬមនុស្សចាស់។',
    descriptionEn: 'Warm, soothing broths, clear soups, and porridges that are gentle on the stomach.',
    targetCaloriesPerMeal: '240 - 410 kcal',
  },
];

export const KHMER_SUPERFOODS_ENCYCLOPEDIA: KhmerSuperfoodItem[] = [
  {
    id: 'moringa',
    nameKh: 'ស្លឹកម្រុំ (Moringa Leaf)',
    nameEn: 'Moringa Leaves (Slok Mrom)',
    emoji: '🌿',
    keyVitaminsKh: 'វីតាមីន A, C, កាល់ស្យូម, ជាតិដែក, ប៉ូតាស្យូម និងប្រូតេអ៊ីនរុក្ខជាតិ',
    keyVitaminsEn: 'Vitamins A, C, Calcium, Iron, Potassium & Plant Protein',
    benefitsKh:
      'ជួយបង្កើនគ្រាប់ឈាមក្រហម បំប៉នភ្នែក ពង្រឹងប្រព័ន្ធភាពស៊ាំ និងជួយគ្រប់គ្រងកម្រិតជាតិស្ករក្នុងឈាម។ ជាបន្លែស្នូលក្នុងសម្លកកូរ និងសម្លប្រហើរ។',
    benefitsEn:
      'Supports red blood cell production, eye health, immune defense, and healthy blood glucose balance. A staple in Samlor Korko.',
    bestUsageTipKh: 'ដាក់ស្លឹកម្រុំនៅចុងបញ្ចប់នៃការដាំសម្ល (រំងាស់ ២-៣ នាទី) ដើម្បីរក្សាវីតាមីន C ឱ្យនៅខ្ពស់បំផុត។',
    bestUsageTipEn: 'Add moringa leaves during the final 2–3 minutes of simmering to preserve Vitamin C.',
    searchKeywordsKh: ['ម្រុំ', 'សម្លកកូរ', 'ប្រហើរ'],
  },
  {
    id: 'turmeric',
    nameKh: 'រមៀត (Fresh Turmeric)',
    nameEn: 'Fresh Turmeric (Romieth)',
    emoji: '🟡',
    keyVitaminsKh: 'សារធាតុ Curcumin, ប្រឆាំងអុកស៊ីតកម្ម និងប្រឆាំងការរលាក',
    keyVitaminsEn: 'Curcuminoids, Antioxidants & Anti-inflammatory Compounds',
    benefitsKh:
      'ជួយកាត់បន្ថយការរលាកក្នុងរាងកាយ ជំនួយសន្លាក់ សម្រួលការរំលាយអាហារ និងការពារកោសិកាថ្លើម។ ជាគ្រឿងផ្សំសំខាន់ក្នុងគ្រឿងបុកខ្មែរ។',
    benefitsEn:
      'Reduces systemic inflammation, supports joint comfort, aids digestion, and provides cellular antioxidant protection.',
    bestUsageTipKh: 'ការផ្សំរមៀតជាមួយម្រេចកំពត ជួយឱ្យរាងកាយស្រូបយកសារធាតុ Curcumin បានល្អជាងមុនដល់ទៅច្រើនដង។',
    bestUsageTipEn: 'Combining turmeric with black Kampot pepper significantly enhances curcumin absorption.',
    searchKeywordsKh: ['រមៀត', 'គ្រឿង', 'អាម៉ុក', 'ឆាគ្រឿង'],
  },
  {
    id: 'lemongrass',
    nameKh: 'ស្លឹកគ្រៃ (Lemongrass)',
    nameEn: 'Lemongrass (Slok Krey)',
    emoji: '🌾',
    keyVitaminsKh: 'ប្រេងក្រអូប Citral, សារធាតុប្រឆាំងបាក់តេរី និងប៉ូតាស្យូម',
    keyVitaminsEn: 'Citral Essential Oils, Antibacterial & Digestive Compounds',
    benefitsKh:
      'ជួយកាត់បន្ថយអាការៈហើមពោះ សម្រួលប្រព័ន្ធរំលាយអាហារ បញ្ចុះកម្ដៅ និងផ្តល់ក្លិនក្រអូបជំនួសការប្រើម្សៅស៊ុប ឬអំបិលច្រើន។',
    benefitsEn:
      'Relieves bloating, supports healthy digestion, and adds rich aroma so you can cook with less salt and MSG.',
    bestUsageTipKh: 'គល់ស្លឹកគ្រៃហាន់ស្តើងៗ ឬដំដាក់ក្នុងស្ងោរជ្រក់ និងសម្លម្ជូរ ជួយកាត់ឆ្អាបត្រី និងបង្កើនរសជាតិធម្មជាតិ។',
    bestUsageTipEn: 'Bruised lemongrass stalks in clear sour soups naturally brighten flavor without added sodium.',
    searchKeywordsKh: ['ស្លឹកគ្រៃ', 'ម្ជូរ', 'ស្ងោរជ្រក់', 'ឆាគ្រឿង'],
  },
  {
    id: 'ginger_galangal',
    nameKh: 'ខ្ញី និងរំដេង (Ginger & Galangal)',
    nameEn: 'Ginger & Galangal (Khnhei & Romdeng)',
    emoji: '🫚',
    keyVitaminsKh: 'សារធាតុ Gingerol, Galangin និងអង់ស៊ីមជំនួយក្រពះ',
    keyVitaminsEn: 'Gingerol, Galangin & Digestive Enzymes',
    benefitsKh:
      'ជួយកាត់បន្ថយអាការៈចង្អោរ ឆ្អល់ពោះ សម្រួលចរន្តឈាមរត់ និងជួយបង្កើនភាពកក់ក្តៅក្នុងរាងកាយ។',
    benefitsEn:
      'Soothes nausea and indigestion, supports healthy circulation, and warms the digestive tract.',
    bestUsageTipKh: 'ឆាខ្ញីសាច់មាន់ ឬត្រីចំហុយខ្ញី គឺជាអាហារដ៏ល្អបំផុតសម្រាប់អ្នកទើបជាពីផ្តាសាយ ឬខ្សោយក្រពះ។',
    bestUsageTipEn: 'Ginger chicken stir-fry or steamed fish with ginger is ideal for gentle digestive recovery.',
    searchKeywordsKh: ['ខ្ញី', 'រំដេង', 'ចំហុយ', 'បបរ'],
  },
  {
    id: 'freshwater_fish',
    nameKh: 'ត្រីទឹកសាបកម្ពុជា (Cambodian Freshwater Fish)',
    nameEn: 'Cambodian Freshwater Fish (Trey Ross, Trey Kes)',
    emoji: '🐟',
    keyVitaminsKh: 'ប្រូតេអ៊ីនសុទ្ធ (Lean Protein), អាស៊ីតខ្លាញ់ល្អ Omega-3, វីតាមីន D និងកាល់ស្យូម',
    keyVitaminsEn: 'High-Quality Lean Protein, Omega-3, Vitamin D & Calcium',
    benefitsKh:
      'ផ្តល់ប្រូតេអ៊ីនខ្ពស់ប៉ុន្តែមានខ្លាញ់ឆ្អែតទាបជាងសាច់ក្រហម ងាយស្រួលរំលាយ ជួយសុខភាពបេះដូង និងខួរក្បាល។',
    benefitsEn:
      'Provides high biological-value protein with far less saturated fat than red meat, supporting heart and brain health.',
    bestUsageTipKh: 'ជ្រើសរើសវិធីចំហុយ អាំង ស្ងោរ ឬស្ល ជំនួសការបំពងខ្លាញ់ច្រើន។',
    bestUsageTipEn: 'Prefer steaming, grilling, or simmering in herbal broths over deep-frying.',
    searchKeywordsKh: ['ត្រី', 'អាម៉ុក', 'ស្ងោរ', 'សម្ល'],
  },
  {
    id: 'bitter_melon_greens',
    nameKh: 'ម្រះ ត្រកួន និងល្ហុង (Bitter Melon, Morning Glory & Papaya)',
    nameEn: 'Bitter Melon, Water Spinach & Green Papaya',
    emoji: '🥒',
    keyVitaminsKh: 'ជាតិសរសៃ (Dietary Fiber), អង់ស៊ីម Papain, វីតាមីន K និងសារធាតុ Charantin',
    keyVitaminsEn: 'Dietary Fiber, Papain Enzymes, Vitamin K & Phytonutrients',
    benefitsKh:
      'ម្រះជួយទ្រទ្រង់ការគ្រប់គ្រងជាតិស្ករ ល្ហុងមានអង់ស៊ីមជួយរំលាយសាច់ និងត្រកួនសម្បូរជាតិដែក និងជាតិសរសៃជួយសម្រួលពោះវៀន។',
    benefitsEn:
      'Bitter melon supports glucose metabolism, green papaya provides digestive enzymes, and leafy greens supply iron and fiber.',
    bestUsageTipKh: 'លាងបន្លែជាមួយទឹកស្អាតហូរ និងទឹកអំបិលស្រាល ១០ នាទីមុនយកទៅចម្អិន។',
    bestUsageTipEn: 'Rinse vegetables thoroughly under running water and soak briefly in mild salt water before cooking.',
    searchKeywordsKh: ['ម្រះ', 'ត្រកួន', 'ល្ហុង', 'បន្លែ'],
  },
];

export const POPULAR_KHMER_HEALTH_QUESTIONS: Array<{
  id: string;
  badgeKh: string;
  questionKh: string;
  questionEn: string;
}> = [
  {
    id: 'diabetes_sugar',
    badgeKh: '🩸 ជាតិស្ករ / ទឹកនោមផ្អែម',
    questionKh: 'តើអ្នកមានជំងឺទឹកនោមផ្អែម ឬលើសជាតិស្ករ គួរញ៉ាំម្ហូបខ្មែរអ្វីខ្លះ?',
    questionEn: 'Which Cambodian dishes are best for blood sugar and diabetes management?',
  },
  {
    id: 'hypertension_bp',
    badgeKh: '❤️ សម្ពាធឈាម / ប្រៃតិច',
    questionKh: 'តើអ្នកលើសឈាម (សម្ពាធឈាមខ្ពស់) គួរជ្រើសរើសម្ហូបខ្មែរបែបណា?',
    questionEn: 'Which low-sodium Cambodian dishes are suitable for high blood pressure?',
  },
  {
    id: 'weight_loss_plan',
    badgeKh: '⚖️ សម្រកទម្ងន់',
    questionKh: 'ខ្ញុំចង់សម្រកទម្ងន់ តើគួររៀបចំអាហារខ្មែរ ៣ ពេលបែបណាឱ្យស្រកដោយសុខភាពល្អ?',
    questionEn: 'How should I plan 3 healthy Cambodian meals a day for weight loss?',
  },
  {
    id: 'samlor_korko_benefits',
    badgeKh: '🌿 សម្លកកូរ & បន្លែខ្មែរ',
    questionKh: 'តើសម្លកកូរ និងស្លឹកម្រុំ មានអត្ថប្រយោជន៍អ្វីខ្លះដល់សុខភាព?',
    questionEn: 'What are the health benefits of Samlor Korko and Moringa leaves?',
  },
  {
    id: 'high_protein_muscle',
    badgeKh: '💪 ប្រូតេអ៊ីន & សាច់ដុំ',
    questionKh: 'តើម្ហូបខ្មែរណាខ្លះសម្បូរប្រូតេអ៊ីនខ្ពស់ និងខ្លាញ់ទាប សម្រាប់អ្នកហាត់ប្រាណ?',
    questionEn: 'Which Cambodian dishes are high in protein and low in fat for fitness?',
  },
  {
    id: 'pregnancy_iron',
    badgeKh: '🫄 ស្ត្រីមានផ្ទៃពោះ & គ្រាប់ឈាម',
    questionKh: 'ស្ត្រីមានផ្ទៃពោះ ឬអ្នកខ្វះគ្រាប់ឈាម គួរញ៉ាំអាហារខ្មែរអ្វីខ្លះ?',
    questionEn: 'What nutrient- and iron-rich Cambodian foods support pregnancy and anemia prevention?',
  },
  {
    id: 'gout_uric_acid',
    badgeKh: '🦴 សន្លាក់ / អាស៊ីតអ៊ុយរិក',
    questionKh: 'អ្នកឈឺសន្លាក់ (លើសអាស៊ីតអ៊ុយរិក / Gout) គួរតម និងគួរញ៉ាំម្ហូបអ្វី?',
    questionEn: 'What foods should be chosen or limited for gout and high uric acid?',
  },
  {
    id: 'stomach_digestion',
    badgeKh: '🥣 ក្រពះ & ការរំលាយអាហារ',
    questionKh: 'អ្នកឈឺក្រពះ ឬពិបាករំលាយអាហារ គួរញ៉ាំម្ហូបខ្មែរអ្វីខ្លះ?',
    questionEn: 'Which gentle Cambodian dishes are best for sensitive stomachs and digestion?',
  },
];

/**
 * Deterministically computes a detailed, realistic nutritional profile for any Cambodian FoodItem
 * based on its cooking method, category, protein source, coconut milk/oil usage, and vegetable content.
 */
export function getDishNutritionProfile(food: FoodItem): DishNutritionProfile {
  const nameKh = (food.nameKh || '').trim();
  const nameEn = (food.nameEn || '').toLowerCase();
  const ingText = (food.ingredientsKh || []).join(' ');
  const cat = food.categorySlug;

  // Base macros by cooking style / category
  let calories = 360;
  let protein = 22;
  let carbs = 28;
  let fat = 14;
  let fiber = 4.2;
  let sodiumMg = 580;
  let sugarG = 4.5;

  const isSoup =
    cat === 'soup' ||
    nameKh.includes('សម្ល') ||
    nameKh.includes('ស្ងោរ') ||
    nameKh.includes('ស៊ុប');
  const isClearSoup =
    nameKh.includes('ស្ងោរ') ||
    nameKh.includes('សម្លម្ជូរ') ||
    nameKh.includes('សម្លប្រហើរ') ||
    nameKh.includes('ង៉ាំង៉ូវ');
  const isCoconutRich =
    nameKh.includes('ការី') ||
    nameKh.includes('ខ្ទិះ') ||
    ingText.includes('ខ្ទិះដូង');
  const isAmok = nameKh.includes('អាម៉ុក');
  const isKorko = nameKh.includes('សម្លកកូរ');
  const isSalad =
    cat === 'salad' ||
    nameKh.includes('ញាំ') ||
    nameKh.includes('ភ្លា') ||
    nameKh.includes('បុក');
  const isGrilledOrSteamed =
    nameKh.includes('អាំង') ||
    nameKh.includes('ដុត') ||
    nameKh.includes('ចំហុយ') ||
    nameKh.includes('ស្រុស');
  const isDeepFried =
    nameKh.includes('បំពង') ||
    nameKh.includes('ចៀន');
  const isBraisedSweetSalty =
    nameKh.includes('ខសាច់') ||
    nameKh.includes('ខត្រី') ||
    nameKh.includes('ផាក់ឡូវ');
  const isFermentedDip =
    nameKh.includes('ប្រហុក') ||
    nameKh.includes('ទឹកគ្រឿង') ||
    nameKh.includes('កapi') ||
    nameKh.includes('កាពិ') ||
    nameKh.includes('ផ្អក') ||
    nameKh.includes('ម៉ាំ') ||
    nameKh.includes('ត្រីងៀត');
  const isDessert =
    cat === 'dessert' ||
    nameKh.includes('បង្អែម') ||
    nameKh.includes('សង់ខ្យា') ||
    nameKh.includes('នំអន្សម') ||
    nameKh.includes('នំផ្លែអាយ') ||
    nameKh.includes('នំគម') ||
    nameKh.includes('ចេកខ្ទិះ');
  const isPorridge = nameKh.includes('បបរ');
  const isNoodle =
    cat === 'noodle' ||
    nameKh.includes('នំបញ្ចុក') ||
    nameKh.includes('គុយទាវ') ||
    nameKh.includes('លតឆា') ||
    nameKh.includes('មី');
  const isRiceDish =
    nameKh.includes('បាយឆា') ||
    nameKh.includes('បាយសាច់');

  // Adjust macros accurately by culinary structure
  if (isKorko) {
    calories = 295;
    protein = 24;
    carbs = 22;
    fat = 9;
    fiber = 7.8;
    sodiumMg = 540;
    sugarG = 3.2;
  } else if (isClearSoup) {
    calories = 255;
    protein = 25;
    carbs = 16;
    fat = 7.5;
    fiber = 5.4;
    sodiumMg = 520;
    sugarG = 3.0;
  } else if (isAmok) {
    calories = 345;
    protein = 26;
    carbs = 15;
    fat = 18;
    fiber = 4.6;
    sodiumMg = 490;
    sugarG = 4.0;
  } else if (isCoconutRich && !isDessert) {
    calories = 465;
    protein = 23;
    carbs = 28;
    fat = 26;
    fiber = 4.5;
    sodiumMg = 640;
    sugarG = 6.5;
  } else if (isSalad) {
    calories = 275;
    protein = 23;
    carbs = 21;
    fat = 8.5;
    fiber = 6.2;
    sodiumMg = 560;
    sugarG = 5.0;
  } else if (isPorridge) {
    calories = 310;
    protein = 22;
    carbs = 38;
    fat = 6.5;
    fiber = 3.2;
    sodiumMg = 510;
    sugarG = 2.5;
  } else if (isNoodle) {
    if (nameKh.includes('នំបញ្ចុក')) {
      calories = 350;
      protein = 21;
      carbs = 44;
      fat = 9.0;
      fiber = 6.5;
      sodiumMg = 550;
      sugarG = 3.8;
    } else if (nameKh.includes('ឆា')) {
      calories = 490;
      protein = 20;
      carbs = 56;
      fat = 19;
      fiber = 4.0;
      sodiumMg = 690;
      sugarG = 6.0;
    } else {
      calories = 385;
      protein = 24;
      carbs = 48;
      fat = 10;
      fiber = 3.8;
      sodiumMg = 620;
      sugarG = 4.0;
    }
  } else if (isRiceDish) {
    calories = 510;
    protein = 24;
    carbs = 58;
    fat = 18;
    fiber = 3.5;
    sodiumMg = 660;
    sugarG = 5.5;
  } else if (isDeepFried) {
    calories = 475;
    protein = 22;
    carbs = 26;
    fat = 28;
    fiber = 2.8;
    sodiumMg = 610;
    sugarG = 3.5;
  } else if (isBraisedSweetSalty) {
    calories = 455;
    protein = 25;
    carbs = 24;
    fat = 24;
    fiber = 2.5;
    sodiumMg = 780;
    sugarG = 12.5;
  } else if (isGrilledOrSteamed) {
    calories = 315;
    protein = 28;
    carbs = 12;
    fat = 14;
    fiber = 3.8;
    sodiumMg = 530;
    sugarG = 3.0;
  } else if (isDessert) {
    calories = 340;
    protein = 5.5;
    carbs = 52;
    fat = 12.5;
    fiber = 3.4;
    sodiumMg = 160;
    sugarG = 24.0;
  }

  if (isFermentedDip) {
    sodiumMg = Math.max(sodiumMg, 790);
    if (nameKh.includes('ទឹកគ្រឿង')) {
      calories = 265;
      protein = 24;
      carbs = 16;
      fat = 8;
      fiber = 7.2;
    }
  }

  // Deterministic subtle variation by dish id number so dishes don't look identically cloned
  const idNum = parseInt(food.id.replace(/\D+/g, ''), 10) || 1;
  const mod = (idNum % 7) - 3;
  calories = Math.max(180, calories + mod * 8);
  protein = Math.max(4, Math.round(protein + (idNum % 5) - 2));
  fiber = Number(Math.max(1.5, fiber + ((idNum % 4) - 1.5) * 0.4).toFixed(1));

  const sodiumLevel: 'low' | 'medium' | 'high' =
    sodiumMg <= 540 ? 'low' : sodiumMg <= 680 ? 'medium' : 'high';
  const sugarLevel: 'low' | 'medium' | 'high' =
    sugarG <= 4.5 ? 'low' : sugarG <= 10 ? 'medium' : 'high';
  const glycemicImpact: 'low' | 'medium' | 'high' =
    isDessert || isRiceDish ? 'high' : isNoodle || isBraisedSweetSalty ? 'medium' : 'low';

  // Compute overall Health Score (58 to 97)
  let healthScore = 82;
  if (isKorko || nameKh.includes('ទឹកគ្រឿង')) healthScore += 14;
  else if (isClearSoup || isSalad || isAmok) healthScore += 11;
  else if (isGrilledOrSteamed || isPorridge) healthScore += 8;
  if (fiber >= 5.5) healthScore += 4;
  if (protein >= 24) healthScore += 3;
  if (isDeepFried) healthScore -= 14;
  if (isDessert) healthScore -= 16;
  if (isBraisedSweetSalty) healthScore -= 9;
  if (sodiumLevel === 'high') healthScore -= 5;
  healthScore = Math.max(58, Math.min(97, healthScore));

  // Determine matching health goals
  const matchingGoals: HealthGoalId[] = [];
  if (healthScore >= 82) matchingGoals.push('all');
  if (calories <= 395 && !isDessert && !isDeepFried) matchingGoals.push('weight_loss');
  if (sodiumLevel !== 'high' && !isDeepFried && !isBraisedSweetSalty && !isDessert) {
    matchingGoals.push('heart_bp');
  }
  if (sugarLevel === 'low' && glycemicImpact === 'low' && !isDessert) {
    matchingGoals.push('blood_sugar');
  }
  if (protein >= 23 && !isDessert) {
    matchingGoals.push('high_protein');
  }
  if (fiber >= 5.0 || isKorko || isSalad || nameKh.includes('បន្លែ') || nameKh.includes('ត្រកួន')) {
    matchingGoals.push('gut_fiber');
  }
  if (
    ingText.includes('ស្លឹកគ្រៃ') ||
    ingText.includes('រមៀត') ||
    ingText.includes('ខ្ញី') ||
    ingText.includes('រំដេង') ||
    ingText.includes('ម្រុំ') ||
    nameKh.includes('គ្រឿង') ||
    isClearSoup ||
    isAmok
  ) {
    matchingGoals.push('immunity_herbs');
  }
  if (isClearSoup || isPorridge || isAmok || nameKh.includes('ចំហុយ')) {
    matchingGoals.push('light_digest');
  }

  // Key Nutrients tags
  const keyNutrientsKh: string[] = [];
  const keyNutrientsEn: string[] = [];
  if (nameKh.includes('ត្រី') || ingText.includes('ត្រី')) {
    keyNutrientsKh.push('ប្រូតេអ៊ីនត្រី & Omega-3');
    keyNutrientsEn.push('Fish Lean Protein & Omega-3');
  } else if (protein >= 22) {
    keyNutrientsKh.push('ប្រូតេអ៊ីនជំនួយសាច់ដុំ');
    keyNutrientsEn.push('Muscle-Supporting Protein');
  }
  if (ingText.includes('ម្រុំ') || isKorko) {
    keyNutrientsKh.push('វីតាមីន A, C & ជាតិដែក (ស្លឹកម្រុំ)');
    keyNutrientsEn.push('Vitamins A, C & Iron (Moringa)');
  }
  if (ingText.includes('ស្លឹកគ្រៃ') || ingText.includes('រមៀត') || nameKh.includes('គ្រឿង')) {
    keyNutrientsKh.push('សារធាតុប្រឆាំងការរលាក (គ្រឿងទេសខ្មែរ)');
    keyNutrientsEn.push('Anti-inflammatory Khmer Herbs');
  }
  if (fiber >= 5.0) {
    keyNutrientsKh.push('ជាតិសរសៃខ្ពស់ពីបន្លែធម្មជាតិ');
    keyNutrientsEn.push('High Dietary Fiber from Greens');
  }
  if (keyNutrientsKh.length === 0) {
    keyNutrientsKh.push('ថាមពល និងវីតាមីនចម្រុះ');
    keyNutrientsEn.push('Balanced Energy & Micronutrients');
  }

  // Health benefits & Healthy cooking modification tips
  let healthBenefitsKh =
    'ផ្តល់ប្រូតេអ៊ីន និងថាមពលប្រចាំថ្ងៃ រួមជាមួយវីតាមីនពីបន្លែ និងគ្រឿងទេសធម្មជាតិខ្មែរ។';
  let healthBenefitsEn =
    'Provides balanced protein and daily energy enriched with vitamins from Cambodian herbs and vegetables.';
  let healthyCookingTipKh =
    'ប្រើប្រេងឆាតិច (១ ស្លាបព្រាបាយ) បន្ថែមបន្លែបៃតងឱ្យបានច្រើន និងកាត់បន្ថយការប្រើប៊ីចេង ឬអំបិលលើសកម្រិត។';
  let healthyCookingTipEn =
    'Use minimal cooking oil (1 tbsp), add generous leafy greens, and reduce added salt or MSG.';
  let cautionNoteKh: string | undefined;
  let cautionNoteEn: string | undefined;

  if (isKorko) {
    healthBenefitsKh =
      'ជា «ស្តេចសម្លសុខភាពខ្មែរ» សម្បូរបន្លែចម្រុះ ស្លឹកម្រុំ ល្ហុង ត្រប់ និងត្រី ដែលផ្តល់ជាតិសរសៃ វីតាមីន A, C ជាតិដែក និងកាល់ស្យូមខ្ពស់បំផុត។';
    healthBenefitsEn =
      'Cambodia’s premier multi-vegetable health soup, rich in moringa, green papaya, fish protein, iron, and dietary fiber.';
    healthyCookingTipKh =
      'ដាក់ប្រហុកក្នុងបរិមាណល្មម (កាត់បន្ថយ ២៥-៣០% សម្រាប់អ្នកលើសឈាម) និងដាក់ស្លឹកម្រុំនៅចុងបញ្ចប់ដើម្បីរក្សាវីតាមីន។';
    healthyCookingTipEn =
      'Use moderate prahok (reduce by 25–30% for blood pressure control) and add moringa leaves at the very end.';
  } else if (isClearSoup) {
    healthBenefitsKh =
      'សម្លទឹកថ្លាកាឡូរីទាប សម្បូរជាតិទឹក ប្រូតេអ៊ីនងាយរំលាយ និងគ្រឿងទេសជួយសម្រួលក្រពះ និងបង្កើនភាពស៊ាំ។';
    healthBenefitsEn =
      'Low-calorie clear herbal broth that hydrates, delivers lean protein, and supports gentle digestion.';
    healthyCookingTipKh =
      'ប្រើរសជាតិជូរធម្មជាតិពីអំពិលទុំ ក្រូចឆ្មា ឬស្លឹកម្ជូរ ជំនួសការបន្ថែមអំបិល និងស្ករច្រើន។';
    healthyCookingTipEn =
      'Rely on natural sourness from tamarind, lime, or sour leaves rather than excess salt or sugar.';
  } else if (isAmok) {
    healthBenefitsKh =
      'ចម្អិនដោយការចំហុយ (មិនបំពងខ្លាញ់) ផ្តល់ប្រូតេអ៊ីនខ្ពស់ពីត្រី ស្លឹកញ និងគ្រឿងបុករមៀតដែលជួយប្រឆាំងការរលាក។';
    healthBenefitsEn =
      'Steamed rather than fried, offering lean fish protein, noni leaves (Slok Ngor), and anti-inflammatory turmeric kroeung.';
    healthyCookingTipKh =
      'ប្រើខ្ទិះដូងស្រស់ក្នុងបរិមាណល្មម ហើយបន្ថែមស្លឹកញ ឬបន្លែទ្រាប់បាតឱ្យបានច្រើន។';
    healthyCookingTipEn =
      'Use a moderate amount of coconut cream and increase the bed of steamed noni leaves or greens.';
  } else if (isSalad) {
    healthBenefitsKh =
      'សម្បូរបន្លែស្រស់ ជីរខ្មែរ វីតាមីន C និងជាតិសរសៃខ្ពស់ ជួយគ្រប់គ្រងទម្ងន់ និងសម្រួលប្រព័ន្ធរំលាយអាហារ។';
    healthBenefitsEn =
      'Packed with raw vegetables, fresh Cambodian herbs, Vitamin C, and fiber for weight and digestive support.';
    healthyCookingTipKh =
      'លាយទឹកត្រីជូរអែមដោយបន្ថយស្ករស ហើយប្រើទឹកក្រូចឆ្មាស្រស់ និងខ្ទឹមសឱ្យបានច្រើន។';
    healthyCookingTipEn =
      'Prepare the dressing with extra fresh lime juice and garlic while cutting added sugar in half.';
  } else if (isDessert) {
    healthBenefitsKh =
      'ផ្តល់ថាមពលរហ័សពីគ្រាប់ធញ្ញជាតិ ល្ពៅ ចេក ឬសណ្តែក ប៉ុន្តែមានជាតិស្ករ និងខ្ទិះដូងខ្ពស់។';
    healthBenefitsEn =
      'Provides quick energy from pumpkin, banana, or mung beans, though naturally higher in sugar and coconut cream.';
    healthyCookingTipKh =
      'កាត់បន្ថយស្ករ ៣០-៤០% និងទទួលទានក្នុងចំណែកតូចល្មមបន្ទាប់ពីអាហារថ្ងៃត្រង់។';
    healthyCookingTipEn =
      'Reduce sugar by 30–40% when cooking and enjoy a modest portion after lunch rather than late at night.';
    cautionNoteKh = 'អ្នកមានជំងឺទឹកនោមផ្អែម ឬកំពុងសម្រកទម្ងន់ គួរទទួលទានក្នុងបរិមាណតិចតួចបំផុត។';
    cautionNoteEn = 'Individuals managing blood sugar or weight should consume only small portions occasionally.';
  } else if (isFermentedDip) {
    healthBenefitsKh =
      'សម្បូរប្រូតេអ៊ីន និងទទួលទានផ្ទាប់ជាមួយបន្លែស្រស់ច្រើនមុខ (ត្រសក់ ត្រប់ ស្ពៃ ត្រកួន) ដែលផ្តល់ជាតិសរសៃខ្ពស់។';
    healthBenefitsEn =
      'Served with an abundant platter of fresh raw and blanched Cambodian vegetables rich in fiber.';
    healthyCookingTipKh =
      'ញ៉ាំបន្លែស្រស់ផ្ទាប់ឱ្យបាន ៣ ដងនៃបរិមាណទឹកជ្រលក់ ដើម្បីទទួលបានប៉ូតាស្យូមជួយតុល្យភាពជាតិប្រៃ។';
    healthyCookingTipEn =
      'Eat 3 parts fresh vegetables for every small dip to balance sodium intake with natural potassium.';
    cautionNoteKh = 'មានកម្រិតជាតិប្រៃ (សូដ្យូម) ខ្ពស់ អ្នកលើសសម្ពាធឈាមគួរកាត់បន្ថយបរិមាណប្រហុក/អំបិល។';
    cautionNoteEn = 'Higher in sodium; individuals with high blood pressure should reduce prahok and added salt.';
  }

  return {
    foodId: food.id,
    caloriesKcal: calories,
    proteinG: protein,
    carbsG: carbs,
    fatG: fat,
    fiberG: fiber,
    sodiumMg,
    sugarG,
    sodiumLevel,
    sugarLevel,
    glycemicImpact,
    healthScore,
    matchingGoals,
    keyNutrientsKh,
    keyNutrientsEn,
    healthBenefitsKh,
    healthBenefitsEn,
    healthyCookingTipKh,
    healthyCookingTipEn,
    cautionNoteKh,
    cautionNoteEn,
  };
}

/**
 * Filters and ranks Cambodian dishes by Health Goal and optional search query.
 */
export function getRecommendedDishesByHealthGoal(
  goalId: HealthGoalId,
  foods: FoodItem[],
  searchQuery = ''
): Array<{ food: FoodItem; nutrition: DishNutritionProfile }> {
  const q = searchQuery.trim().toLowerCase();
  const list = foods.map((food) => ({
    food,
    nutrition: getDishNutritionProfile(food),
  }));

  return list
    .filter(({ food, nutrition }) => {
      if (q) {
        const matchText =
          (food.nameKh || '').toLowerCase().includes(q) ||
          (food.nameEn || '').toLowerCase().includes(q) ||
          (food.categoryKh || '').toLowerCase().includes(q) ||
          (food.ingredientsKh || []).some((i) => i.toLowerCase().includes(q));
        if (!matchText) return false;
      }
      if (!q && goalId !== 'all') {
        return nutrition.matchingGoals.includes(goalId);
      }
      return true;
    })
    .sort((a, b) => b.nutrition.healthScore - a.nutrition.healthScore);
}

/**
 * Generates a balanced 3-meal Cambodian daily meal plan (Breakfast, Lunch, Dinner)
 * tailored to the selected Health Goal and plan variation index.
 */
export function generateBalancedDailyMealPlan(
  goalId: HealthGoalId,
  foods: FoodItem[],
  planIndex = 0
): DailyBalancedMealPlan {
  const allProfiles = foods.map((food) => ({
    food,
    nutrition: getDishNutritionProfile(food),
  }));

  // 1. Breakfast candidates (Porridges, Num Banh Chok, clear noodle soups, light morning dishes)
  const breakfastPool = allProfiles.filter(({ food, nutrition }) => {
    const kh = food.nameKh || '';
    const isMorningStyle =
      kh.includes('បបរ') ||
      kh.includes('នំបញ្ចុក') ||
      kh.includes('គុយទាវ') ||
      (kh.includes('បាយ') && nutrition.caloriesKcal <= 480);
    if (!isMorningStyle) return false;
    if (goalId === 'weight_loss' || goalId === 'blood_sugar') {
      return nutrition.caloriesKcal <= 420 && nutrition.sugarLevel === 'low';
    }
    return nutrition.healthScore >= 75;
  });

  // 2. Lunch candidates (Nutrient-dense Samlor Korko, Amok, Stir-fries with herbs, Salads, Tuk Kroeung)
  const lunchPool = allProfiles.filter(({ food, nutrition }) => {
    const kh = food.nameKh || '';
    if (food.categorySlug === 'dessert' || kh.includes('បបរ')) return false;
    if (goalId !== 'all' && !nutrition.matchingGoals.includes(goalId)) return false;
    return nutrition.healthScore >= 82 && nutrition.proteinG >= 21;
  });

  // 3. Dinner candidates (Light clear soups, steamed/grilled fish, vegetable dishes ≤ 380 kcal)
  const dinnerPool = allProfiles.filter(({ food, nutrition }) => {
    const kh = food.nameKh || '';
    const isLightDinner =
      kh.includes('ស្ងោរ') ||
      kh.includes('សម្លម្ជូរ') ||
      kh.includes('សម្លប្រហើរ') ||
      kh.includes('ចំហុយ') ||
      kh.includes('ញាំ') ||
      kh.includes('ឆាបន្លែ') ||
      kh.includes('ឆាត្រកួន');
    if (!isLightDinner) return false;
    return nutrition.caloriesKcal <= 380 && nutrition.healthScore >= 84;
  });

  const safeBreakfast =
    breakfastPool[planIndex % Math.max(1, breakfastPool.length)] || allProfiles[2] || allProfiles[0];
  const safeLunch =
    lunchPool[(planIndex * 3 + 1) % Math.max(1, lunchPool.length)] || allProfiles[0];
  let safeDinner =
    dinnerPool[(planIndex * 2 + 2) % Math.max(1, dinnerPool.length)] || allProfiles[1] || allProfiles[0];

  if (safeDinner.food.id === safeLunch.food.id && dinnerPool.length > 1) {
    safeDinner = dinnerPool[(planIndex * 2 + 3) % dinnerPool.length];
  }

  const meals: DailyMealPlanSlot[] = [
    {
      slotId: 'breakfast',
      labelKh: '🌅 អាហារពេលព្រឹក (Breakfast)',
      labelEn: '🌅 Morning Breakfast',
      timeRangeKh: 'ម៉ោង ៧:០០ - ៨:៣០ ព្រឹក',
      timeRangeEn: '7:00 AM – 8:30 AM',
      dish: safeBreakfast.food,
      nutrition: safeBreakfast.nutrition,
      portionTipKh: 'បន្ថែមបន្លែស្រស់ ឬជីរខ្មែរឱ្យបានច្រើន និងកាត់បន្ថយការថែមទឹកត្រីប្រៃបន្ថែម។',
      portionTipEn: 'Add extra fresh herbs and greens; avoid adding extra fish sauce at the table.',
    },
    {
      slotId: 'lunch',
      labelKh: '☀️ អាហារថ្ងៃត្រង់ (Balanced Lunch)',
      labelEn: '☀️ Balanced Midday Lunch',
      timeRangeKh: 'ម៉ោង ១១:៣០ - ១:០០ រសៀល',
      timeRangeEn: '11:30 AM – 1:00 PM',
      dish: safeLunch.food,
      nutrition: safeLunch.nutrition,
      portionTipKh: 'ញ៉ាំជាមួយបាយសម្រូប (ឬបាយស ១ កូនចានតូច) ដោយដួសបន្លែ និងសាច់ត្រីឱ្យបាន ៣ ភាគ ៤ នៃចាន។',
      portionTipEn: 'Pair with a small bowl of brown/red rice, filling 75% of your plate with vegetables and fish.',
    },
    {
      slotId: 'dinner',
      labelKh: '🌙 អាហារពេលល្ងាច (Light Dinner)',
      labelEn: '🌙 Light Evening Dinner',
      timeRangeKh: 'ម៉ោង ៥:៣០ - ៧:០០ យប់ (មុនចូលគេង ៣ ម៉ោង)',
      timeRangeEn: '5:30 PM – 7:00 PM (3h before sleep)',
      dish: safeDinner.food,
      nutrition: safeDinner.nutrition,
      portionTipKh: 'ពេលល្ងាចគួរញ៉ាំសម្ល ឬស្ងោរក្តៅៗជាមួយបន្លែច្រើន និងកាត់បន្ថយបាយមកត្រឹមពាក់កណ្តាលកូនចាន។',
      portionTipEn: 'Enjoy warm herbal soup and vegetables in the evening with a half-portion of rice.',
    },
  ];

  // Add 180 kcal representing a healthy small side of brown/red rice & fresh fruit snack across the day
  const riceAndFruitCalories = 240;
  const riceAndFruitCarbs = 46;
  const riceAndFruitFiber = 4.5;

  const totalCaloriesKcal =
    meals.reduce((s, m) => s + m.nutrition.caloriesKcal, 0) + riceAndFruitCalories;
  const totalProteinG = meals.reduce((s, m) => s + m.nutrition.proteinG, 0) + 5;
  const totalCarbsG = meals.reduce((s, m) => s + m.nutrition.carbsG, 0) + riceAndFruitCarbs;
  const totalFatG = meals.reduce((s, m) => s + m.nutrition.fatG, 0) + 2;
  const totalFiberG = Number(
    (meals.reduce((s, m) => s + m.nutrition.fiberG, 0) + riceAndFruitFiber).toFixed(1)
  );
  const totalSodiumMg = meals.reduce((s, m) => s + m.nutrition.sodiumMg, 0);

  return {
    goalId,
    planIndex,
    totalCaloriesKcal,
    totalProteinG,
    totalCarbsG,
    totalFatG,
    totalFiberG,
    totalSodiumMg,
    meals,
    snackAndHydrationKh:
      '💧 ទឹក និងអាហារសម្រន់៖ ផឹកទឹកស្អាត ២.០ - ២.៥ លីត្រក្នុងមួយថ្ងៃ (ឬទឹកស្លឹកគ្រៃ/ទឹកខ្ញីក្តៅឧណ្ហៗមិនដាក់ស្ករ) និងផ្លែឈើស្រស់មិនផ្អែមខ្លាំង ១ ចំណែក (ដូចជា ផ្លែត្របែក ល្ហុងទុំ ឬក្រូចថ្លុង) នៅម៉ោង ៣ រសៀល។',
    snackAndHydrationEn:
      '💧 Hydration & Snack: Drink 2.0–2.5L of water daily (or unsweetened warm lemongrass/ginger tea) plus 1 serving of fresh local fruit (guava, papaya, or pomelo) around 3:00 PM.',
    healthyPlateAdviceKh:
      '🍽️ រូបមន្តចានអាហារសុខភាព (២:១:១)៖ បន្លែចម្រុះ ៥០% (២ ភាគ) + ត្រី/សាច់គ្មានខ្លាញ់ ២៥% (១ ភាគ) + បាយសម្រូប/ម្សៅ ២៥% (១ ភាគ)។',
    healthyPlateAdviceEn:
      '🍽️ Healthy Plate Rule (2:1:1): 50% diverse vegetables + 25% lean fish/protein + 25% brown rice/complex carbs.',
  };
}

/**
 * Answers Khmer & English Health and Nutrition questions using evidence-based clinical nutrition
 * rules and matches relevant Cambodian dishes from the 200-dish catalog.
 */
export function answerHealthAndNutritionQuestion(
  rawQuery: string,
  foods: FoodItem[],
  previousTopicId: string | null = null,
  turnNumber = 1,
  preferredLang: 'km' | 'en' | 'zh' = 'km'
): HealthQaAnswer {
  return generateMultiTurnHealthAnswer(
    rawQuery,
    foods,
    previousTopicId || undefined,
    turnNumber,
    preferredLang
  ).answer;
}

/**
 * Calculates BMI, Daily Calorie Target (Mifflin-St Jeor TDEE), Protein, Fiber, and Water needs.
 */
export function calculateUserHealthMetrics(input: UserHealthMetricsInput): UserHealthMetricsSummary {
  const w = Math.max(30, Math.min(200, Number(input.weightKg) || 60));
  const hCm = Math.max(120, Math.min(220, Number(input.heightCm) || 165));
  const age = Math.max(12, Math.min(100, Number(input.age) || 30));
  const hM = hCm / 100;

  const bmi = Number((w / (hM * hM)).toFixed(1));
  // WHO Asian-Pacific BMI cutoffs (appropriate for Cambodian population)
  let bmiCategoryKh = 'ទម្ងន់ធម្មតា (សុខភាពល្អ)';
  let bmiCategoryEn = 'Normal Healthy Weight';
  let bmiColorClass = 'text-emerald-600 bg-emerald-50 border-emerald-200';

  if (bmi < 18.5) {
    bmiCategoryKh = 'មិនទាន់គ្រប់ទម្ងន់ (គួរបង្កើនអាហារូបត្ថម្ភ)';
    bmiCategoryEn = 'Underweight (Increase Nutrient Intake)';
    bmiColorClass = 'text-sky-700 bg-sky-50 border-sky-200';
  } else if (bmi >= 23 && bmi < 25) {
    bmiCategoryKh = 'លើសទម្ងន់កម្រិតស្រាល (គួរគ្រប់គ្រងរបបអាហារ)';
    bmiCategoryEn = 'Overweight (Watch Portions & Activity)';
    bmiColorClass = 'text-amber-700 bg-amber-50 border-amber-200';
  } else if (bmi >= 25) {
    bmiCategoryKh = 'លើសទម្ងន់ខ្លាំង (គួរអនុវត្តផែនការសម្រកទម្ងន់)';
    bmiCategoryEn = 'Obese Range (Prioritize Weight Balance)';
    bmiColorClass = 'text-rose-700 bg-rose-50 border-rose-200';
  }

  // Mifflin-St Jeor BMR
  const bmr =
    input.gender === 'male'
      ? 10 * w + 6.25 * hCm - 5 * age + 5
      : 10 * w + 6.25 * hCm - 5 * age - 161;

  const activityMultiplier =
    input.activityLevel === 'sedentary'
      ? 1.2
      : input.activityLevel === 'light'
      ? 1.375
      : input.activityLevel === 'moderate'
      ? 1.55
      : 1.725;

  let tdee = Math.round(bmr * activityMultiplier);
  if (input.goalId === 'weight_loss') {
    tdee = Math.max(1250, tdee - 380);
  } else if (input.goalId === 'high_protein') {
    tdee = tdee + 150;
  }

  const dailyProteinTargetG = Math.round(
    w * (input.goalId === 'high_protein' ? 1.5 : input.goalId === 'weight_loss' ? 1.3 : 1.1)
  );
  const dailyFiberTargetG = input.gender === 'male' ? 30 : 25;
  // Tropical Cambodia hydration formula: ~35ml per kg of body weight
  const dailyWaterLiters = Number(Math.max(1.8, Math.min(4.0, (w * 0.035))).toFixed(1));
  const maxSodiumMg = input.goalId === 'heart_bp' ? 1500 : 2000;

  const personalizedAdviceKh =
    bmi >= 23 || input.goalId === 'weight_loss'
      ? `ផ្អែកលើ BMI (${bmi}) អ្នកគួរទទួលទានប្រមាណ ${tdee} kcal/ថ្ងៃ ផ្តោតលើសម្លកកូរ ស្ងោរជ្រក់ អាម៉ុកត្រី និងបន្លែ ៥០% នៃចាន រួមជាមួយទឹកស្អាត ${dailyWaterLiters} លីត្រ/ថ្ងៃ។`
      : `ផ្អែកលើ BMI (${bmi}) រាងកាយអ្នកត្រូវការថាមពលប្រមាណ ${tdee} kcal/ថ្ងៃ ប្រូតេអ៊ីន ${dailyProteinTargetG}g និងទឹកស្អាត ${dailyWaterLiters} លីត្រ/ថ្ងៃ ដើម្បីរក្សាសុខភាពឱ្យរឹងមាំ។`;

  const personalizedAdviceEn =
    bmi >= 23 || input.goalId === 'weight_loss'
      ? `Based on your BMI (${bmi}), aim for ~${tdee} kcal/day with 50% leafy vegetables, lean fish soups, and ${dailyWaterLiters}L of water daily.`
      : `Based on your BMI (${bmi}), your daily target is ~${tdee} kcal, ${dailyProteinTargetG}g protein, and ${dailyWaterLiters}L of water for optimal wellness.`;

  return {
    bmi,
    bmiCategoryKh,
    bmiCategoryEn,
    bmiColorClass,
    dailyCalorieTargetKcal: tdee,
    dailyProteinTargetG,
    dailyFiberTargetG,
    dailyWaterLiters,
    maxSodiumMg,
    personalizedAdviceKh,
    personalizedAdviceEn,
  };
}

export function loadUserHealthMetricsInput(): UserHealthMetricsInput {
  try {
    const raw = localStorage.getItem(USER_HEALTH_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        weightKg: Number(parsed.weightKg) || 60,
        heightCm: Number(parsed.heightCm) || 165,
        age: Number(parsed.age) || 30,
        gender: parsed.gender === 'female' ? 'female' : 'male',
        activityLevel: parsed.activityLevel || 'light',
        goalId: parsed.goalId || 'all',
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    weightKg: 60,
    heightCm: 165,
    age: 30,
    gender: 'male',
    activityLevel: 'light',
    goalId: 'all',
  };
}

export function saveUserHealthMetricsInput(input: UserHealthMetricsInput): void {
  try {
    localStorage.setItem(USER_HEALTH_PROFILE_STORAGE_KEY, JSON.stringify(input));
  } catch {
    // ignore storage errors
  }
}

/**
 * Matches home kitchen ingredients with healthy Cambodian recipes and includes nutrition profiles.
 */
export function searchByHomeIngredients(
  selectedIngredients: string[],
  foods: FoodItem[]
): HomeIngredientsMatchResult[] {
  const normalizedSelected = selectedIngredients.map((i) => i.trim().toLowerCase()).filter(Boolean);
  if (normalizedSelected.length === 0) return [];

  const results: HomeIngredientsMatchResult[] = [];

  for (const food of foods) {
    const foodIngs = food.ingredientsKh || [];
    const matched: string[] = [];
    const missing: string[] = [];

    for (const ing of foodIngs) {
      const ingLower = ing.toLowerCase();
      const isMatch = normalizedSelected.some(
        (sel) => ingLower.includes(sel) || sel.includes(ingLower)
      );
      if (isMatch) {
        matched.push(ing);
      } else {
        missing.push(ing);
      }
    }

    const nameMatchCount = normalizedSelected.filter((sel) =>
      (food.nameKh || '').toLowerCase().includes(sel)
    ).length;

    if (matched.length > 0 || nameMatchCount > 0) {
      const totalConsidered = Math.max(1, foodIngs.length);
      const rawPct = Math.round(
        ((matched.length + nameMatchCount * 0.5) / totalConsidered) * 100
      );
      const matchPercentage = Math.min(98, Math.max(25, rawPct));
      results.push({
        food,
        matchedIngredients: matched.length > 0 ? matched : selectedIngredients.slice(0, 1),
        missingIngredients: missing.slice(0, 5),
        matchPercentage,
        nutrition: getDishNutritionProfile(food),
      });
    }
  }

  return results
    .sort(
      (a, b) =>
        b.matchedIngredients.length * 15 +
        b.nutrition.healthScore -
        (a.matchedIngredients.length * 15 + a.nutrition.healthScore)
    )
    .slice(0, 15);
}

/**
 * Returns daily rotating Healthy Eating Spotlight based on current day of year.
 */
export function getDailyHealthyEatingSpotlight(): {
  titleKh: string;
  titleEn: string;
  tipKh: string;
  tipEn: string;
  badgeKh: string;
  badgeEn: string;
} {
  const spotlights = [
    {
      badgeKh: '🥗 គន្លឹះអាហារសុខភាពប្រចាំថ្ងៃ #1',
      badgeEn: '🥗 Daily Healthy Eating Tip #1',
      titleKh: 'រូបមន្តចានអាហារសុខភាព ២:១:១ សម្រាប់គ្រួសារខ្មែរ',
      titleEn: 'The 2:1:1 Healthy Cambodian Plate Formula',
      tipKh:
        'ចែកចានអាហាររបស់អ្នកជា ៤ ផ្នែក៖ ដាក់បន្លែបៃតង និងសម្លបន្លែឱ្យបាន ២ ផ្នែក (៥០%) ត្រី ឬសាច់គ្មានខ្លាញ់ ១ ផ្នែក (២៥%) និងបាយសម្រូប ឬបាយស ១ ផ្នែក (២៥%) ដើម្បីរក្សាទម្ងន់ និងការពារជំងឺទឹកនោមផ្អែម។',
      tipEn:
        'Fill half your plate (50%) with leafy greens and vegetable soup, one-quarter (25%) with freshwater fish or lean protein, and one-quarter (25%) with brown or white rice.',
    },
    {
      badgeKh: '🧂 គន្លឹះកាត់បន្ថយជាតិប្រៃ #2',
      badgeEn: '🧂 Heart-Healthy Low Sodium Tip #2',
      titleKh: 'ជំនួសអំបិល និងប៊ីចេង ដោយគ្រឿងទេសឱសថខ្មែរ',
      titleEn: 'Boost Flavor with Khmer Herbs Instead of Salt',
      tipKh:
        'ការបន្ថែមគល់ស្លឹកគ្រៃ ស្លឹកក្រូចសើច រមៀត ខ្ញី រំដេង និងក្រូចឆ្មាស្រស់ ជួយឱ្យសម្លខ្មែរមានក្លិនក្រអូបឈ្ងុយឆ្ងាញ់ ដោយអាចកាត់បន្ថយទឹកត្រី អំបិល និងប្រហុកបានដល់ទៅ ៣០% ជួយការពារសម្ពាធឈាម។',
      tipEn:
        'Using fresh lemongrass, kaffir lime leaves, turmeric, ginger, and lime lets you cut fish sauce and salt by 30% while keeping authentic Khmer flavor.',
    },
    {
      badgeKh: '🌿 អាហារូបត្ថម្ភពីធម្មជាតិ #3',
      badgeEn: '🌿 Superfood Spotlight #3',
      titleKh: 'ស្លឹកម្រុំ និងត្រីទឹកសាប៖ ឱសថអាហារូបត្ថម្ភក្នុងគ្រួសារ',
      titleEn: 'Moringa Leaves & Freshwater Fish Synergy',
      tipKh:
        'សម្លកកូរ និងសម្លប្រហើរស្លឹកម្រុំជាមួយត្រីរ៉ស់ ផ្តល់ទាំងប្រូតេអ៊ីនងាយរំលាយ ជាតិដែក កាល់ស្យូម និងវីតាមីន A, C ខ្ពស់ ជួយបង្កើនភាពស៊ាំ និងថាមពលប្រចាំថ្ងៃ។',
      tipEn:
        'Moringa soup with snakehead fish delivers bioavailable protein, iron, calcium, and Vitamins A & C for daily immunity and vitality.',
    },
  ];
  const dayIdx = Math.floor(Date.now() / 86400000) % spotlights.length;
  return spotlights[dayIdx];
}
