/**
 * Healthy Food & Disease-Friendly Nutrition Guide Database
 * ---------------------------------------------------------------------------
 * Medically reviewed, evidence-based dietary reference aligned with:
 * - World Health Organization (WHO) Healthy Diet Guidelines
 * - Ministry of Health Cambodia (MoH) National Nutrition Guidelines
 * - American Heart Association (AHA) & American Diabetes Association (ADA)
 * - ASEAN Food Composition Database
 *
 * STRICT COMPLIANCE:
 * - Food and nutrition recommendations ONLY.
 * - Does NOT recommend, prescribe, or provide dosages for any medicines,
 *   supplements, or medical treatments.
 * - Does NOT claim that any food can cure or treat disease.
 * - Supports Khmer ('km'), English ('en'), and Simplified Chinese ('zh').
 */

export type NutritionConditionId =
  | 'diabetes'
  | 'high_blood_pressure'
  | 'high_cholesterol'
  | 'gout'
  | 'gastritis'
  | 'healthy_weight';

export interface NutritionFoodItemRecommendation {
  nameKh: string;
  nameEn: string;
  nameZh: string;
  benefitOrReasonKh: string;
  benefitOrReasonEn: string;
  benefitOrReasonZh: string;
  keyNutrientsKh: string;
  keyNutrientsEn: string;
  keyNutrientsZh: string;
}

export interface SuitableCambodianDishGuide {
  foodId: string;
  nameKh: string;
  nameEn: string;
  nameZh: string;
  whySuitableKh: string;
  whySuitableEn: string;
  whySuitableZh: string;
  healthyCookingTipKh: string;
  healthyCookingTipEn: string;
  healthyCookingTipZh: string;
}

export interface DiseaseNutritionConditionGuide {
  id: NutritionConditionId;
  icon: string;
  badgeKh: string;
  badgeEn: string;
  badgeZh: string;
  titleKh: string;
  titleEn: string;
  titleZh: string;
  overviewKh: string;
  overviewEn: string;
  overviewZh: string;
  nutritionalPrinciplesKh: string[];
  nutritionalPrinciplesEn: string[];
  nutritionalPrinciplesZh: string[];
  healthyFoodsToChoose: NutritionFoodItemRecommendation[];
  foodsToLimitOrAvoid: NutritionFoodItemRecommendation[];
  suitableCambodianDishes: SuitableCambodianDishGuide[];
  hydrationAndLifestyleFoodTipKh: string;
  hydrationAndLifestyleFoodTipEn: string;
  hydrationAndLifestyleFoodTipZh: string;
  individualVariationNoteKh: string;
  individualVariationNoteEn: string;
  individualVariationNoteZh: string;
  reviewedSourcesKh: string[];
  reviewedSourcesEn: string[];
  reviewedSourcesZh: string[];
}

export const NUTRITION_GUIDE_MEDICAL_DISCLAIMER = {
  km: '⚕️ សេចក្តីជូនដំណឹងអំពីអាហារូបត្ថម្ភ៖ មគ្គុទ្ទេសក៍នេះផ្តល់ជូនតែការណែនាំអំពីអាហារ និងអត្ថប្រយោជន៍អាហារូបត្ថម្ភទូទៅ ដោយផ្អែកលើប្រភពអាហារូបត្ថម្ភដែលបានពិនិត្យត្រឹមត្រូវ (WHO, ក្រសួងសុខាភិបាលកម្ពុជា និងតារាងអាហារូបត្ថម្ភអាស៊ាន)។ តម្រូវការរបបអាហារមានភាពខុសៗគ្នាទៅតាមបុគ្គលម្នាក់ៗ ហើយគ្មានអាហារណាមួយអាចព្យាបាលជំងឺឱ្យជាសះស្បើយដោយខ្លួនឯងនោះទេ។ ការណែនាំអំពីអាហារទាំងនេះមិនជំនួសការពិគ្រោះយោបល់ ការធ្វើរោគវិនិច្ឆ័យ ឬការណែនាំពីគ្រូពេទ្យជំនាញឡើយ។',
  en: '⚕️ Nutrition & Medical Notice: This guide provides evidence-based food and nutritional information only, reviewed against WHO, Ministry of Health Cambodia, and ASEAN Food Composition standards. Dietary needs vary by individual, and no food can cure disease. These food recommendations do not replace professional medical advice, diagnosis, or care from a qualified healthcare provider.',
  zh: '⚕️ 营养与健康声明：本指南仅依据世界卫生组织（WHO）、柬埔寨卫生部及东盟食物成分表的循证营养数据库提供日常膳食建议。不同个体的营养需求存在差异，任何食物均不能治愈疾病。本膳食建议不能替代执业医师或临床营养师的专业医疗建议与个体化指导。',
};

export const HEALTHY_NUTRITION_CONDITIONS_DATA: DiseaseNutritionConditionGuide[] = [
  {
    id: 'diabetes',
    icon: '🩸',
    badgeKh: 'ទឹកនោមផ្អែម & ជាតិស្ករ',
    badgeEn: 'Diabetes & Blood Sugar',
    badgeZh: '糖尿病与控糖膳食',
    titleKh: 'របបអាហារសម្រាប់អ្នកមានជំងឺទឹកនោមផ្អែម និងការគ្រប់គ្រងជាតិស្ករក្នុងឈាម',
    titleEn: 'Diabetes-Friendly & Steady Blood Sugar Nutrition Guide',
    titleZh: '糖尿病友好型与平稳血糖膳食指南',
    overviewKh:
      'ការជ្រើសរើសអាហារដែលមានសន្ទស្សន៍ជាតិស្ករទាប (Low GI) សម្បូរជាតិសរសៃពីបន្លែបៃតង និងប្រូតេអ៊ីនគ្មានខ្លាញ់ពីត្រីទឹកសាប ជួយឱ្យការស្រូបយកជាតិស្ករទៅក្នុងឈាមប្រព្រឹត្តទៅយឺតៗ និងរក្សាថាមពលប្រចាំថ្ងៃឱ្យមានលំនឹង។',
    overviewEn:
      'Choosing low-glycemic foods rich in soluble fiber from leafy vegetables and lean protein from freshwater fish slows carbohydrate absorption and supports steady post-meal blood glucose levels.',
    overviewZh:
      '优先选择低升糖指数（Low GI）食材、富含膳食纤维的绿叶蔬菜以及淡水鱼等优质瘦蛋白，有助于延缓碳水化合物的消化吸收，维持餐后血糖与日常能量平稳。',
    nutritionalPrinciplesKh: [
      'អនុវត្តរូបមន្តចានអាហារ ២:១:១៖ បន្លែមិនសូវមានម្សៅ ៥០% (២ ភាគ) + ត្រី ឬសាច់គ្មានខ្លាញ់ ២៥% (១ ភាគ) + បាយសម្រូប ឬគ្រាប់ធញ្ញជាតិ ២៥% (១ ភាគ)។',
      'ទទួលទានបន្លែបៃតង និងសម្លបន្លែមុនពេលញ៉ាំបាយ ដើម្បីឱ្យជាតិសរសៃជួយបន្ថយល្បឿនស្រូបយកជាតិស្ករ។',
      'ជ្រើសរើសការចម្អិនដោយស្ងោរ ចំហុយ អាំង ឬស្លទឹកថ្លា ជំនួសការខផ្អែម ឬឆាដាក់ស្ករច្រើន។',
    ],
    nutritionalPrinciplesEn: [
      'Follow the 2:1:1 Healthy Plate method: 50% non-starchy vegetables, 25% lean fish or poultry, and 25% brown or red rice.',
      'Eat fibrous vegetables and clear soup first before rice to slow glucose absorption into the bloodstream.',
      'Prefer steaming, boiling, grilling, or clear herbal soups over sweet braised or sugar-glazed dishes.',
    ],
    nutritionalPrinciplesZh: [
      '遵循“2:1:1 健康餐盘法则”：50% 非淀粉类绿叶蔬菜 + 25% 淡水鱼或去皮禽肉 + 25% 糙米或红米饭。',
      '进餐时先喝清汤、吃绿叶蔬菜，再吃主食米饭，利用膳食纤维减缓葡萄糖吸收速度。',
      '烹调方式以清蒸、水煮、炭烤或香茅清汤为主，避免加糖红烧或拔丝油炸做法。',
    ],
    healthyFoodsToChoose: [
      {
        nameKh: 'ស្លឹកម្រុំ ម្រះ ត្រកួន និងស្ពៃបៃតង',
        nameEn: 'Moringa Leaves, Bitter Melon, Morning Glory & Leafy Greens',
        nameZh: '辣木叶、苦瓜、空心菜与绿叶时蔬',
        benefitOrReasonKh: 'សម្បូរជាតិសរសៃរលាយ និងសារធាតុរុក្ខជាតិធម្មជាតិ ដែលជួយពន្យឺតការស្រូបយកជាតិស្ករនៅក្នុងពោះវៀន។',
        benefitOrReasonEn: 'High in soluble dietary fiber and phytonutrients that slow intestinal glucose absorption.',
        benefitOrReasonZh: '富含可溶性膳食纤维与植物活性成分，可延缓肠道对糖分的吸收并增强饱腹感。',
        keyNutrientsKh: 'ជាតិសរសៃ, វីតាមីន A, C, ម៉ាញេស្យូម និងជាតិដែក',
        keyNutrientsEn: 'Dietary Fiber, Vitamins A & C, Magnesium, Iron',
        keyNutrientsZh: '膳食纤维、维生素 A 与 C、镁、铁',
      },
      {
        nameKh: 'ត្រីរ៉ស់ ត្រីកែស និងត្រីទឹកសាបកម្ពុជា',
        nameEn: 'Snakehead Fish (Trey Ross) & Freshwater Fish',
        nameZh: '高棉黑鱼（生鱼）与淡水鱼类',
        benefitOrReasonKh: 'ផ្តល់ប្រូតេអ៊ីនសុទ្ធគ្មានជាតិម្សៅ (0g Carbs) ជួយឱ្យឆ្អែតបានយូរដោយមិនធ្វើឱ្យឡើងជាតិស្ករក្នុងឈាម។',
        benefitOrReasonEn: 'Provides zero-carbohydrate lean protein that promotes satiety without spiking blood sugar.',
        benefitOrReasonZh: '提供零碳水化合物的优质瘦蛋白，饱腹感强且不会引起餐后血糖波动。',
        keyNutrientsKh: 'ប្រូតេអ៊ីនគ្មានខ្លាញ់, អាស៊ីតខ្លាញ់ Omega-3 និងវីតាមីន D',
        keyNutrientsEn: 'Lean Protein, Omega-3 Fatty Acids, Vitamin D',
        keyNutrientsZh: '优质瘦蛋白、Omega-3 脂肪酸、维生素 D',
      },
      {
        nameKh: 'អង្ករសម្រូប និងអង្ករក្រហមខ្មែរ',
        nameEn: 'Cambodian Brown Rice & Red Cargo Rice',
        nameZh: '柬埔寨糙米与红糙米',
        benefitOrReasonKh: 'មានស្រទាប់កន្ទក់សម្បូរជាតិសរសៃខ្ពស់ជាងបាយសធម្មតា ជួយរក្សាលំនឹងថាមពលក្រោយអាហារ។',
        benefitOrReasonEn: 'Retains the fiber-rich bran layer, resulting in a lower glycemic response than polished white rice.',
        benefitOrReasonZh: '保留富含膳食纤维与B族维生素的米糠层，升糖指数显著低于精白米饭。',
        keyNutrientsKh: 'ជាតិសរសៃ Complex Carbs, វីតាមីន B1 និងម៉ង់ហ្គាណែស',
        keyNutrientsEn: 'Complex Carbohydrates, Fiber, Vitamin B1, Manganese',
        keyNutrientsZh: '复合碳水化合物、膳食纤维、维生素 B1',
      },
      {
        nameKh: 'ផ្លែត្របែក ផ្លែក្រូចថ្លុង និងផ្លែល្ហុងទុំល្មម',
        nameEn: 'Fresh Guava, Pomelo & Moderately Ripe Papaya',
        nameZh: '鲜番石榴（芭乐）、甜柚与适度木瓜',
        benefitOrReasonKh: 'ជាផ្លែឈើក្នុងស្រុកដែលមានកម្រិតជាតិស្ករមធ្យម និងសម្បូរជាតិសរសៃ (គួរញ៉ាំទាំងសាច់ មិនគួរកៀបយកតែទឹក)។',
        benefitOrReasonEn: 'Lower-glycemic local fruits rich in fiber and Vitamin C when eaten whole rather than juiced.',
        benefitOrReasonZh: '属于低至中升糖指数的本地水果，直接食用果肉可摄取丰富果胶纤维与维生素 C。',
        keyNutrientsKh: 'វីតាមីន C, ជាតិសរសៃ Pectin និងសារធាតុប្រឆាំងអុកស៊ីតកម្ម',
        keyNutrientsEn: 'Vitamin C, Pectin Fiber, Antioxidants',
        keyNutrientsZh: '维生素 C、果胶膳食纤维、天然抗氧化物',
      },
    ],
    foodsToLimitOrAvoid: [
      {
        nameKh: 'ភេសជ្ជៈផ្អែម ទឹកក្រូចកំប៉ុង តែគុជ និងកាហ្វេទឹកដោះគោខាប់',
        nameEn: 'Sugary Soft Drinks, Bubble Tea & Condensed Milk Coffee',
        nameZh: '含糖碳酸饮料、珍珠奶茶与炼乳冰咖啡',
        benefitOrReasonKh: 'មានជាតិស្កររាវខ្ពស់ដែលជ្រាបចូលក្នុងឈាមភ្លាមៗ ធ្វើឱ្យកម្រិតជាតិស្ករឡើងខ្ពស់យ៉ាងឆាប់រហ័ស។',
        benefitOrReasonEn: 'Contains rapidly absorbed liquid sugars that cause immediate blood glucose spikes.',
        benefitOrReasonZh: '含有大量游离液态糖，饮用后会迅速进入血液导致血糖急剧升高。',
        keyNutrientsKh: 'ស្ករសុទ្ធខ្ពស់ (30g–50g ក្នុង ១ កែវ)',
        keyNutrientsEn: 'High Added Sugar (30g–50g per cup)',
        keyNutrientsZh: '高添加糖（每杯含糖约 30–50 克）',
      },
      {
        nameKh: 'បង្អែមខ្ទិះដូងផ្អែមខ្លាំង និងនំបំពងស្រោបស្ករ',
        nameEn: 'Heavy Sweet Coconut Desserts & Sugar-Glazed Fried Cakes',
        nameZh: '高糖浓椰浆甜品与挂糖油炸糕饼',
        benefitOrReasonKh: 'ផ្សំពីម្សៅអង្ករដំណើប ស្ករត្នោត/ស្ករសច្រើន និងខ្លាញ់ឆ្អែត ដែលបង្កើនទាំងជាតិស្ករ និងកាឡូរីលើសកម្រិត។',
        benefitOrReasonEn: 'Combines high glycemic glutinous rice flour with concentrated sugar and saturated fat.',
        benefitOrReasonZh: '由高升糖糯米粉、大量糖浆与饱和脂肪制成，容易引起血糖与热量双重超标。',
        keyNutrientsKh: 'សន្ទស្សន៍ជាតិស្ករខ្ពស់ (High GI) និងខ្លាញ់ឆ្អែត',
        keyNutrientsEn: 'High Glycemic Index & Saturated Fat',
        keyNutrientsZh: '高升糖指数（High GI）与高饱和脂肪',
      },
      {
        nameKh: 'បាយសច្រើនហួសប្រមាណ ឬបាយដំណើបក្នុងពេលតែមួយ',
        nameEn: 'Large Portions of Polished White Rice or Sticky Rice at One Sitting',
        nameZh: '单次过量食用精白米饭或糯米饭',
        benefitOrReasonKh: 'ម្សៅអង្ករសម្រិត និងអង្ករដំណើបបំបែកទៅជាជាតិស្ករលឿន ប្រសិនបើញ៉ាំច្រើនដោយគ្មានបន្លែផ្ទាប់។',
        benefitOrReasonEn: 'Refined white rice and glutinous rice digest rapidly into glucose when eaten in large portions.',
        benefitOrReasonZh: '精白米与糯米淀粉消化速度快，若大量食用且缺乏蔬菜搭配，易使餐后血糖上升。',
        keyNutrientsKh: 'កាបូអ៊ីដ្រាតសាមញ្ញខ្ពស់ និងជាតិសរសៃទាប',
        keyNutrientsEn: 'High Simple Starch, Low Fiber',
        keyNutrientsZh: '高精制淀粉、低膳食纤维',
      },
    ],
    suitableCambodianDishes: [
      {
        foodId: 'food-2',
        nameKh: 'សម្លកកូរត្រីរ៉ស់បន្លែចម្រុះ',
        nameEn: 'Samlor Korko (Traditional Multi-Vegetable & Moringa Fish Soup)',
        nameZh: '高棉传统什锦时蔬辣木叶黑鱼汤（Samlor Korko）',
        whySuitableKh: 'សម្បូរបន្លែចម្រុះជាង ៧ មុខ (ស្លឹកម្រុំ ល្ហុង ត្រប់ សណ្តែកគួរ) និងត្រីរ៉ស់ ផ្តល់ជាតិសរសៃខ្ពស់ និងជាតិស្ករទាប។',
        whySuitableEn: 'Packed with 7+ local vegetables including moringa and green papaya plus lean snakehead fish for high fiber and low glycemic load.',
        whySuitableZh: '汇聚辣木叶、青木瓜、茄子、长豆角等7种以上本地蔬菜与黑鱼肉，高纤维、低升糖。',
        healthyCookingTipKh: 'ប្រើអង្ករលីងក្នុងបរិមាណល្មម (១ ស្លាបព្រាបាយ) និងមិនបន្ថែមស្ករច្រើន។',
        healthyCookingTipEn: 'Use a moderate spoonful of toasted rice powder and avoid adding extra sugar.',
        healthyCookingTipZh: '使用适量炒米粉增稠，烹调时不额外添加白糖。',
      },
      {
        foodId: 'food-5',
        nameKh: 'សម្លប្រហើរត្រីស្លឹកម្រុំ និងននោង',
        nameEn: 'Samlor Proher (Herbal Lemongrass Soup with Fish, Luffa & Moringa)',
        nameZh: '高棉香茅辣木叶丝瓜鲜鱼养生汤（Samlor Proher）',
        whySuitableKh: 'សម្លទឹកថ្លាគ្មានខ្លាញ់ សម្បូរស្លឹកម្រុំ ននោង និងផ្សិត ជួយឱ្យឆ្អែតស្រួលពោះ និងរក្សាលំនឹងជាតិស្ករ។',
        whySuitableEn: 'Oil-free herbal broth rich in moringa leaves, luffa gourd, and mushrooms with minimal carbohydrates.',
        whySuitableZh: '无油清爽的草本鱼汤，富含辣木叶、丝瓜与草菇，碳水化合物极低。',
        healthyCookingTipKh: 'ដាក់ស្លឹកម្រុំនៅចុងបញ្ចប់នៃការដាំ ដើម្បីរក្សាវីតាមីន និងជាតិសរសៃ។',
        healthyCookingTipEn: 'Add moringa leaves during the final 2 minutes of simmering to preserve nutrients.',
        healthyCookingTipZh: '出锅前2分钟放入新鲜辣木叶，以充分保留维生素与营养。',
      },
      {
        foodId: 'food-55',
        nameKh: 'ស្ងោរម្រះញាត់សាច់ជ្រូកចិញ្ច្រាំ',
        nameEn: 'Clear Bitter Melon Soup Stuffed with Lean Minced Pork',
        nameZh: '苦瓜酿瘦肉清汤',
        whySuitableKh: 'ម្រះគឺជាបន្លែប្រពៃណីដ៏ល្អសម្រាប់អ្នកគ្រប់គ្រងជាតិស្ករ ចម្អិនជាស្ងោរទឹកថ្លាមិនប្រើខ្លាញ់។',
        whySuitableEn: 'Bitter melon is prized in nutritional science for supporting healthy glucose metabolism in a clear, low-fat broth.',
        whySuitableZh: '苦瓜富含苦瓜皂苷与膳食纤维，采用清炖做法少油清淡，非常适合控糖人群。',
        healthyCookingTipKh: 'ជ្រើសរើសសាច់ជ្រូកសុទ្ធគ្មានខ្លាញ់ ឬជំនួសដោយសាច់ត្រី/សាច់មាន់ចិញ្ច្រាំ។',
        healthyCookingTipEn: 'Use lean minced pork loin or substitute with minced fish or chicken breast.',
        healthyCookingTipZh: '选用去脂猪瘦肉末，或改用鱼肉蓉、鸡胸肉末酿制。',
      },
      {
        foodId: 'food-1',
        nameKh: 'អាម៉ុកត្រីរ៉ស់ស្លឹកញ',
        nameEn: 'Steamed Khmer Fish Amok with Noni Leaves',
        nameZh: '高棉阿莫克蒸鱼（诺丽叶椰香蒸黑鱼）',
        whySuitableKh: 'ចម្អិនដោយការចំហុយ ផ្តល់ប្រូតេអ៊ីនខ្ពស់ពីត្រីរ៉ស់ និងស្លឹកញដែលសម្បូរសារធាតុប្រឆាំងអុកស៊ីតកម្ម។',
        whySuitableEn: 'Steamed preparation delivering high fish protein, turmeric kroeung, and antioxidant-rich noni leaves.',
        whySuitableZh: '采用清蒸工艺锁住黑鱼高蛋白，底铺富含抗氧化物的嫩诺丽叶与姜黄香茅泥。',
        healthyCookingTipKh: 'ប្រើខ្ទិះដូងក្នុងបរិមាណល្មម និងកាត់បន្ថយស្ករត្នោតមកត្រឹមបន្តិចបន្តួចដើម្បីយកក្លិន។',
        healthyCookingTipEn: 'Use moderate coconut milk and minimal palm sugar while doubling the bed of steamed noni leaves.',
        healthyCookingTipZh: '减少椰浆与棕榈糖用量，并在蒸盅底部多铺一层嫩诺丽叶或蔬菜。',
      },
    ],
    hydrationAndLifestyleFoodTipKh:
      '💧 ការផឹកទឹក៖ គួរផឹកទឹកស្អាត ២ លីត្រក្នុងមួយថ្ងៃ ឬទឹកស្លឹកគ្រៃ/ទឹកខ្ញីក្តៅឧណ្ហៗដែលមិនដាក់ស្ករ ជំនួសទឹកផ្លែឈើកំប៉ុង។',
    hydrationAndLifestyleFoodTipEn:
      '💧 Hydration Tip: Drink 2 liters of plain water daily or unsweetened warm lemongrass and ginger infusion instead of sweetened beverages.',
    hydrationAndLifestyleFoodTipZh:
      '💧 饮水建议：每日饮用约 2 升白开水，或饮用无糖温热香茅水、生姜茶，替代含糖果汁与甜饮。',
    individualVariationNoteKh:
      'តម្រូវការកាបូអ៊ីដ្រាត និងថាមពលប្រចាំថ្ងៃមានភាពខុសៗគ្នាទៅតាមអាយុ ទម្ងន់ សកម្មភាពរាងកាយ និងស្ថានភាពសុខភាពរបស់បុគ្គលម្នាក់ៗ។ សូមពិគ្រោះជាមួយគ្រូពេទ្យ ឬអ្នកជំនាញអាហារូបត្ថម្ភសម្រាប់ផែនការរបបអាហារផ្ទាល់ខ្លួន។',
    individualVariationNoteEn:
      'Carbohydrate tolerance and daily energy needs vary by age, body weight, physical activity, and individual health status. Always consult your physician or registered dietitian for personalized meal targets.',
    individualVariationNoteZh:
      '每个人的碳水化合物耐受量与每日热量需求因年龄、体重、活动量及个体健康状况而异，请咨询执业医师或营养师制定个体化饮食方案。',
    reviewedSourcesKh: [
      'អង្គការសុខភាពពិភពលោក (WHO) — គោលការណ៍របបអាហារសុខភាព និងការគ្រប់គ្រងជាតិស្ករ',
      'ក្រសួងសុខាភិបាលកម្ពុជា (MoH) — មគ្គុទ្ទេសក៍អាហារូបត្ថម្ភជាតិ',
      'សមាគមទឹកនោមផ្អែមអាមេរិក (ADA) — វិធីសាស្ត្ររៀបចំចានអាហារសុខភាព',
    ],
    reviewedSourcesEn: [
      'World Health Organization (WHO) — Healthy Diet & Carbohydrate Intake Guidelines',
      'Ministry of Health Cambodia (MoH) — National Dietary & Nutrition Guidelines',
      'American Diabetes Association (ADA) — Diabetes Plate Method & Glycemic Nutrition',
    ],
    reviewedSourcesZh: [
      '世界卫生组织 (WHO) — 健康膳食与碳水化合物摄入指南',
      '柬埔寨卫生部 (MoH Cambodia) — 国家居民膳食与营养指南',
      '美国糖尿病协会 (ADA) — 糖尿病健康餐盘法则与循证营养指南',
    ],
  },
  {
    id: 'high_blood_pressure',
    icon: '❤️',
    badgeKh: 'លើសសម្ពាធឈាម & បេះដូង',
    badgeEn: 'High Blood Pressure & Heart',
    badgeZh: '高血压与低钠护心膳食',
    titleKh: 'របបអាហារកាត់បន្ថយជាតិប្រៃ (DASH Diet) សម្រាប់អ្នកលើសសម្ពាធឈាម និងសុខភាពបេះដូង',
    titleEn: 'Low-Sodium & Potassium-Rich Nutrition Guide for High Blood Pressure',
    titleZh: '高血压与心血管健康低钠高钾（DASH）膳食指南',
    overviewKh:
      'ការកាត់បន្ថយជាតិសូដ្យូម (អំបិល ទឹកត្រី ទឹកស៊ីអ៊ីវ ប៊ីចេង និងអាហារប្រឡាក់ផ្អាប់) រួមជាមួយការបង្កើនអាហារសម្បូរប៉ូតាស្យូម ម៉ាញេស្យូម និងជាតិសរសៃពីបន្លែផ្លែឈើធម្មជាតិ ជួយទ្រទ្រង់សុខភាពសរសៃឈាម និងរក្សាសម្ពាធឈាមឱ្យមានតុល្យភាព។',
    overviewEn:
      'Reducing dietary sodium (salt, fish sauce, soy sauce, MSG, and heavily salted preserved foods) while increasing potassium-, magnesium-, and fiber-rich fruits and vegetables supports healthy blood vessel relaxation and blood pressure balance.',
    overviewZh:
      '遵循得舒饮食（DASH）原则，减少膳食钠（食盐、鱼露、酱油、味精及高盐腌制品）摄入，同时增加富含钾、镁与膳食纤维的新鲜蔬果和淡水鱼类，有助于维护血管弹性与血压平稳。',
    nutritionalPrinciplesKh: [
      'កំណត់ការទទួលទានសូដ្យូមឱ្យតិចជាង ១,៥០០–២,០០០ មីលីក្រាមក្នុងមួយថ្ងៃ (ប្រហែលមិនលើសពី ១ ស្លាបព្រាកាហ្វេអំបិលសរុបក្នុងគ្រប់មុខម្ហូប)។',
      'ប្រើគ្រឿងទេសធម្មជាតិខ្មែរ (គល់ស្លឹកគ្រៃ ស្លឹកក្រូចសើច រមៀត ខ្ញី រំដេង ខ្ទឹមស និងក្រូចឆ្មា) ដើម្បីបង្កើនក្លិន និងរសជាតិជំនួសការដាក់អំបិល ឬទឹកត្រីច្រើន។',
      'ជៀសវាងការដាក់ចានទឹកត្រីម្ទេស ឬអំបិលម្ទេសថែមនៅលើតុបាយ។',
    ],
    nutritionalPrinciplesEn: [
      'Keep total daily sodium intake below 1,500–2,000 mg (less than 1 level teaspoon of total salt across all meals).',
      'Flavor dishes generously with aromatic Khmer herbs—lemongrass, kaffir lime leaves, turmeric, ginger, galangal, garlic, and fresh lime—instead of extra salt or fish sauce.',
      'Avoid adding extra dipping bowls of fish sauce or chili salt at the dining table.',
    ],
    nutritionalPrinciplesZh: [
      '每日总钠摄入量控制在 1,500–2,000 毫克以内（全天所有菜肴食盐与鱼露折合不超过 1 平茶匙盐）。',
      '善用香茅、青柠叶、姜黄、生姜、南姜、大蒜与鲜青柠汁等高棉天然香草提味，可减少 30% 以上食盐与鱼露用量。',
      '养成清淡饮食习惯，餐桌上不再额外摆放高盐鱼露碟或椒盐碟。',
    ],
    healthyFoodsToChoose: [
      {
        nameKh: 'បន្លែសម្បូរប៉ូតាស្យូម (ស្លឹកម្រុំ ស្ពៃ ននោង ល្ពៅ និងត្រកួន)',
        nameEn: 'Potassium-Rich Greens (Moringa, Leafy Greens, Luffa & Pumpkin)',
        nameZh: '高钾蔬菜（辣木叶、绿叶菜、丝瓜、南瓜与空心菜）',
        benefitOrReasonKh: 'សារធាតុប៉ូតាស្យូមជួយឱ្យរាងកាយបញ្ចេញជាតិសូដ្យូមលើសតាមទឹកនោម និងជួយបន្ធូរភាពតានតឹងនៃជញ្ជាំងសរសៃឈាម។',
        benefitOrReasonEn: 'Dietary potassium helps the kidneys excrete excess sodium and eases tension in blood vessel walls.',
        benefitOrReasonZh: '丰富的钾元素有助于促进体内多余钠离子排出，帮助舒张血管壁。',
        keyNutrientsKh: 'ប៉ូតាស្យូម, ម៉ាញេស្យូម, កាល់ស្យូម និងជាតិសរសៃ',
        keyNutrientsEn: 'Potassium, Magnesium, Calcium, Dietary Fiber',
        keyNutrientsZh: '钾、镁、钙、膳食纤维',
      },
      {
        nameKh: 'ត្រីទឹកសាប និងត្រីសមុទ្រស្រស់ (ចំហុយ អាំង ឬស្ងោរ)',
        nameEn: 'Fresh Steamed, Grilled, or Poached Fish',
        nameZh: '清蒸、炭烤或清炖新鲜鱼类',
        benefitOrReasonKh: 'ផ្តល់អាស៊ីតខ្លាញ់ល្អ Omega-3 និងប្រូតេអ៊ីនដែលជួយថែរក្សាសុខភាពបេះដូង និងសរសៃឈាម។',
        benefitOrReasonEn: 'Supplies heart-friendly Omega-3 fatty acids and lean protein without saturated animal fat.',
        benefitOrReasonZh: '提供有益心血管健康的 Omega-3 脂肪酸与优质蛋白，且饱和脂肪含量低。',
        keyNutrientsKh: 'អាស៊ីតខ្លាញ់ Omega-3, ប្រូតេអ៊ីនគ្មានខ្លាញ់ និងវីតាមីន B12',
        keyNutrientsEn: 'Omega-3 Fatty Acids, Lean Protein, Vitamin B12',
        keyNutrientsZh: 'Omega-3 脂肪酸、优质瘦蛋白、维生素 B12',
      },
      {
        nameKh: 'ខ្ទឹមស ខ្ញី ស្លឹកគ្រៃ និងរមៀតស្រស់',
        nameEn: 'Fresh Garlic, Ginger, Lemongrass & Turmeric',
        nameZh: '新鲜大蒜、生姜、香茅与姜黄',
        benefitOrReasonKh: 'មានសារធាតុ Allicin និងសារធាតុប្រឆាំងអុកស៊ីតកម្មជួយទ្រទ្រង់ចរន្តឈាម និងកាត់បន្ថយការប្រើប្រាស់អំបិល។',
        benefitOrReasonEn: 'Contains natural bioactive compounds like allicin and antioxidants that support healthy circulation and flavor food without sodium.',
        benefitOrReasonZh: '富含大蒜素与天然抗氧化成分，既能支持健康血液循环，又能为菜肴增香减盐。',
        keyNutrientsKh: 'សារធាតុ Allicin, Curcumin និងប្រេងក្រអូបធម្មជាតិ',
        keyNutrientsEn: 'Allicin, Curcuminoids, Essential Oils',
        keyNutrientsZh: '大蒜素、姜黄素、天然芳香精油',
      },
      {
        nameKh: 'ផ្លែចេកទុំ ផ្លែល្ហុង និងផ្លែក្រូចថ្លុង',
        nameEn: 'Ripe Banana, Papaya & Pomelo',
        nameZh: '香蕉、木瓜与甜柚',
        benefitOrReasonKh: 'ជាប្រភពប៉ូតាស្យូម និងវីតាមីន C ធម្មជាតិដ៏ល្អសម្រាប់អាហារសម្រន់ជំនួសនំកញ្ចប់ប្រៃ។',
        benefitOrReasonEn: 'Excellent natural sources of potassium and Vitamin C as a healthy alternative to salty snacks.',
        benefitOrReasonZh: '天然富含钾元素与维生素 C，适合作为日常加餐以替代高盐包装零食。',
        keyNutrientsKh: 'ប៉ូតាស្យូមខ្ពស់, វីតាមីន C និងជាតិសរសៃ',
        keyNutrientsEn: 'High Potassium, Vitamin C, Fiber',
        keyNutrientsZh: '高钾、维生素 C、膳食纤维',
      },
    ],
    foodsToLimitOrAvoid: [
      {
        nameKh: 'ត្រីងៀត ត្រីប្រឡាក់ ផ្អក ម៉ាំ និងប្រហុកប្រៃខ្លាំង',
        nameEn: 'Heavily Salted Dried Fish, Fermented Fish (Pha-ok, Mam) & Excess Prahok',
        nameZh: '高盐咸鱼干、腌鱼（Pha-ok / Mam）及过量高棉发酵鱼酱（Prahok）',
        benefitOrReasonKh: 'មានផ្ទុកជាតិសូដ្យូមខ្ពស់ខ្លាំង ដែលធ្វើឱ្យរាងកាយស្ទះជាតិទឹក និងបង្កើនសម្ពាធឈាម។',
        benefitOrReasonEn: 'Extremely high in sodium from salt curing, which promotes fluid retention and elevates blood pressure.',
        benefitOrReasonZh: '腌制过程中使用大量食盐，钠含量极高，易导致水钠潴留并升高血压。',
        keyNutrientsKh: 'ជាតិសូដ្យូមខ្ពស់ខ្លាំង (> 800mg–1,500mg ក្នុង ១ ចំណែក)',
        keyNutrientsEn: 'Very High Sodium (> 800mg–1,500mg per serving)',
        keyNutrientsZh: '极高钠含量（每份超过 800–1,500 毫克）',
      },
      {
        nameKh: 'មីកញ្ចប់ សាច់ក្រក សាច់ប៉ាតេ និងអាហារកំប៉ុង',
        nameEn: 'Instant Noodles, Processed Sausages, Pâté & Canned Foods',
        nameZh: '方便面、加工香肠、肉酱（Pâté）与罐头食品',
        benefitOrReasonKh: 'កញ្ចប់គ្រឿងទេសមី និងសាច់កែច្នៃមានទាំងអំបិល ប៊ីចេង និងខ្លាញ់ឆ្អែតខ្ពស់។',
        benefitOrReasonEn: 'Seasoning packets and cured meats contain hidden sodium, MSG, and saturated fats.',
        benefitOrReasonZh: '调味料包与腌制加工肉类含有大量隐形盐、味精及饱和脂肪。',
        keyNutrientsKh: 'សូដ្យូមលាក់កំបាំងខ្ពស់ និងខ្លាញ់ឆ្អែត',
        keyNutrientsEn: 'High Hidden Sodium & Saturated Fat',
        keyNutrientsZh: '高隐形钠与饱和脂肪',
      },
      {
        nameKh: 'ទឹកជ្រលក់ប្រៃៗ ទឹកស៊ីអ៊ីវ ទឹកត្រី និងម្សៅស៊ុបច្រើន',
        nameEn: 'Heavy Table Dipping Sauces, Soy Sauce, Fish Sauce & Bouillon Cubes',
        nameZh: '重盐蘸水、浓酱油、过量鱼露与高盐鸡精块',
        benefitOrReasonKh: '១ ស្លាបព្រាបាយនៃទឹកត្រី មានផ្ទុកសូដ្យូមប្រហែល ១,២០០–១,៤០០ មីលីក្រាម។',
        benefitOrReasonEn: 'Just 1 tablespoon of fish sauce contains roughly 1,200–1,400 mg of sodium.',
        benefitOrReasonZh: '仅 1 汤匙普通鱼露即含有约 1,200–1,400 毫克钠，接近全天推荐上限。',
        keyNutrientsKh: 'សូដ្យូមប្រមូលផ្តុំខ្ពស់',
        keyNutrientsEn: 'Concentrated Sodium',
        keyNutrientsZh: '高浓度钠',
      },
    ],
    suitableCambodianDishes: [
      {
        foodId: 'food-9',
        nameKh: 'ស្ងោរជ្រក់ត្រីទន្លេស្លឹកក្រូចសើច និងជីរណា',
        nameEn: 'Samlor Chrouk Trey (Clear Lime & Herb Freshwater Fish Soup)',
        nameZh: '高棉青柠香草清炖河鱼汤（ស្ងោរជ្រក់ត្រី）',
        whySuitableKh: 'ប្រើរសជាតិជូរក្រអូបពីក្រូចឆ្មាស្រស់ ស្លឹកគ្រៃ និងជីរណា អាចចម្អិនដោយប្រើអំបិលតិចបំផុត។',
        whySuitableEn: 'Brightened with fresh lime juice, lemongrass, and sawtooth herb so it remains flavorful with minimal salt.',
        whySuitableZh: '依靠鲜榨青柠汁、香茅与刺芫荽提鲜，只需极少盐分即可鲜美可口。',
        healthyCookingTipKh: 'បន្ថែមទឹកក្រូចឆ្មាស្រស់ក្រោយពេលបិទភ្លើង និងកាត់បន្ថយទឹកត្រីពាក់កណ្តាល។',
        healthyCookingTipEn: 'Squeeze fresh lime juice after turning off the heat and cut fish sauce by half.',
        healthyCookingTipZh: '关火后挤入鲜青柠汁，并将鱼露用量减半。',
      },
      {
        foodId: 'food-54',
        nameKh: 'សម្លប្រហើរននោងបង្គាស្រស់ស្លឹកម្រុំ',
        nameEn: 'Luffa Gourd, Fresh Shrimp & Moringa Herbal Soup',
        nameZh: '鲜虾丝瓜辣木叶草本清汤',
        whySuitableKh: 'ននោង និងស្លឹកម្រុំសម្បូរប៉ូតាស្យូមខ្ពស់ រួមជាមួយប្រូតេអ៊ីនបង្គាស្រស់ដែលមានខ្លាញ់ទាប។',
        whySuitableEn: 'Luffa gourd and moringa leaves provide abundant potassium paired with low-fat fresh shrimp.',
        whySuitableZh: '丝瓜与辣木叶富含天然钾元素，搭配低脂鲜虾仁，清甜少盐。',
        healthyCookingTipKh: 'ចម្អិនដោយមិនដាក់ប្រហុក ឬដាក់ត្រឹមបន្តិចបន្តួចដើម្បីកាត់បន្ថយជាតិប្រៃ។',
        healthyCookingTipEn: 'Prepare without prahok or use only a tiny pinch so sodium stays low.',
        healthyCookingTipZh: '烹煮时不加或仅加极少量高棉发酵鱼酱（Prahok），保持低钠清甜。',
      },
      {
        foodId: 'food-35',
        nameKh: 'ញាំក្រូចថ្លុងបង្គាស្រស់ និងសាច់មាន់',
        nameEn: 'Pomelo Salad with Poached Prawns & Shredded Chicken',
        nameZh: '橘洲甜柚鲜虾手撕鸡肉沙拉',
        whySuitableKh: 'ក្រូចថ្លុងសម្បូរប៉ូតាស្យូម និងវីតាមីន C ផ្សំជាមួយសាច់មាន់ស្ងោរ និងបង្គាដោយមិនបំពងខ្លាញ់។',
        whySuitableEn: 'Fresh pomelo sacs deliver potassium and Vitamin C alongside poached chicken breast and prawns.',
        whySuitableZh: '新鲜甜柚果粒富含钾与维生素 C，搭配白灼鸡丝与鲜虾，清爽护心。',
        healthyCookingTipKh: 'លាយទឹកញាំដោយបង្កើនទឹកក្រូចឆ្មា និងខ្ទឹមស ហើយបន្ថយទឹកត្រី។',
        healthyCookingTipEn: 'Make a light dressing with extra lime juice and garlic while using minimal fish sauce.',
        healthyCookingTipZh: '调制沙拉汁时多用青柠汁与蒜蓉，减少鱼露用量。',
      },
      {
        foodId: 'food-1',
        nameKh: 'អាម៉ុកត្រីរ៉ស់ចំហុយស្លឹកញ',
        nameEn: 'Steamed Khmer Fish Amok with Noni Leaves',
        nameZh: '高棉阿莫克蒸鱼（诺丽叶椰香蒸黑鱼）',
        whySuitableKh: 'ត្រីចំហុយសម្បូរ Omega-3 និងគ្រឿងបុករមៀតស្លឹកគ្រៃ ដែលមានកម្រិតសូដ្យូមទាបជាងម្ហូបឆា ឬខ។',
        whySuitableEn: 'Steamed freshwater fish with turmeric and lemongrass paste offers heart-healthy Omega-3s and lower sodium than braised dishes.',
        whySuitableZh: '清蒸黑鱼富含 Omega-3 脂肪酸与姜黄香茅草本营养，钠含量远低于红烧菜肴。',
        healthyCookingTipKh: 'មិនចាំបាច់បន្ថែមប្រហុកក្នុងគ្រឿងអាម៉ុក សម្រាប់អ្នកតមប្រៃ។',
        healthyCookingTipEn: 'Omit prahok from the kroeung paste for a delicious low-sodium version.',
        healthyCookingTipZh: '控盐人群可在调制阿莫克香料泥时省略发酵鱼酱（Prahok）。',
      },
    ],
    hydrationAndLifestyleFoodTipKh:
      '💧 ការផឹកទឹក និងទម្លាប់ញ៉ាំ៖ ផឹកទឹកស្អាតឱ្យបានគ្រប់គ្រាន់ និងភ្លក្សម្ហូបមុនពេលថែមគ្រឿងប្រៃ។',
    hydrationAndLifestyleFoodTipEn:
      '💧 Hydration & Dining Habit: Stay well hydrated with plain water and always taste food before reaching for salt or fish sauce.',
    hydrationAndLifestyleFoodTipZh:
      '💧 饮水与就餐习惯：日常保持充足白开水摄入，培养清淡味觉，不在餐桌上额外加盐或鱼露。',
    individualVariationNoteKh:
      'កម្រិតសូដ្យូម និងប៉ូតាស្យូមដែលសមស្របអាចប្រែប្រួលទៅតាមមុខងារតម្រងនោម និងស្ថានភាពសុខភាពរបស់បុគ្គលម្នាក់ៗ។ សូមពិគ្រោះជាមួយគ្រូពេទ្យជំនាញមុនពេលផ្លាស់ប្តូររបបអាហារសំខាន់ៗ។',
    individualVariationNoteEn:
      'Optimal sodium and potassium targets vary depending on kidney function and individual health status. Consult a healthcare professional for personalized dietary guidance.',
    individualVariationNoteZh:
      '适宜的钠与钾摄入量因个人肾脏功能及整体健康状况而异，若合并肾脏疾病请在医师指导下调整高钾食物摄入。',
    reviewedSourcesKh: [
      'អង្គការសុខភាពពិភពលោក (WHO) — គោលការណ៍កាត់បន្ថយជាតិសូដ្យូម',
      'សមាគមបេះដូងអាមេរិក (AHA) & គោលការណ៍របបអាហារ DASH',
      'ក្រសួងសុខាភិបាលកម្ពុជា (MoH) — ការណែនាំអាហារសុខភាពបេះដូង',
    ],
    reviewedSourcesEn: [
      'World Health Organization (WHO) — Guideline: Sodium Intake for Adults and Children',
      'American Heart Association (AHA) & DASH Eating Plan Guidelines',
      'Ministry of Health Cambodia (MoH) — Cardiovascular Nutrition Education',
    ],
    reviewedSourcesZh: [
      '世界卫生组织 (WHO) — 成人与儿童钠摄入量指南',
      '美国心脏协会 (AHA) 与 DASH（终止高血压膳食疗法）指南',
      '柬埔寨卫生部 (MoH Cambodia) — 心血管健康膳食宣教指南',
    ],
  },
  {
    id: 'high_cholesterol',
    icon: '🥑',
    badgeKh: 'លើសជាតិខ្លាញ់ក្នុងឈាម',
    badgeEn: 'High Cholesterol & Lipids',
    badgeZh: '高胆固醇与血脂健康',
    titleKh: 'របបអាហារសម្រាប់អ្នកលើសជាតិខ្លាញ់ក្នុងឈាម (កូឡេស្តេរ៉ុល និងទ្រីគ្លីសេរីត)',
    titleEn: 'Cholesterol-Friendly & Heart-Healthy Lipid Nutrition Guide',
    titleZh: '高胆固醇与血脂管理（低饱和脂肪）膳食指南',
    overviewKh:
      'ការជំនួសខ្លាញ់ឆ្អែត (ខ្លាញ់សាច់ជ្រូក ស្បែកមាន់ ទា គ្រឿងក្នុង និងអាហារបំពង) ដោយប្រូតេអ៊ីនពីត្រី សណ្តែក និងជាតិសរសៃរលាយពីបន្លែផ្លែឈើ ជួយកាត់បន្ថយការស្រូបយកជាតិខ្លាញ់អាក្រក់ (LDL) នៅក្នុងពោះវៀន និងជួយថែរក្សាសុខភាពសរសៃឈាម។',
    overviewEn:
      'Replacing saturated and trans fats (fatty pork belly, poultry skin, organ meats, and deep-fried foods) with fish Omega-3s, legumes, and soluble fiber from vegetables helps bind dietary cholesterol in the digestive tract and supports healthy lipid profiles.',
    overviewZh:
      '减少饱和脂肪与反式脂肪（五花肉肥膏、禽类皮层、动物内脏及油炸食品）摄入，增加富含可溶性膳食纤维的蔬菜、豆类以及富含 Omega-3 的鱼类，有助于减少肠道对胆固醇的吸收，维护血脂与血管健康。',
    nutritionalPrinciplesKh: [
      'ជ្រើសរើសសាច់ត្រី ឬសាច់មាន់បកស្បែកចេញ ជំនួសសាច់ជ្រូកបីជាន់ ស្បែកមាន់ និងគ្រឿងក្នុងសត្វ។',
      'បង្កើនការញ៉ាំបន្លែសម្បូរជាតិសរសៃរលាយ (ដូចជា ត្រប់ ននោង ពោតបារាំង ស្លឹកម្រុំ និងសណ្តែក) ដែលជួយចាប់យកជាតិខ្លាញ់ក្នុងពោះវៀន។',
      'ចម្អិនដោយការស្ងោរ ចំហុយ អាំង ឬញាំ ជំនួសការបំពងខ្លាញ់ច្រើន ឬសម្លដាក់ខ្ទិះដូងខាប់ខ្លាំង។',
    ],
    nutritionalPrinciplesEn: [
      'Choose freshwater fish or skinless poultry breast instead of pork belly, poultry skin, and organ meats.',
      'Eat plenty of soluble-fiber vegetables—eggplant, luffa gourd, okra, moringa leaves, and beans—which help bind cholesterol in the gut.',
      'Prefer steaming, boiling, grilling, and fresh herb salads over deep-frying or heavy coconut cream curries.',
    ],
    nutritionalPrinciplesZh: [
      '优先选择淡水鱼、海鱼或去皮鸡胸肉，替代五花肉、鸡鸭皮及动物内脏。',
      '多吃富含可溶性膳食纤维的茄子、丝瓜、秋葵、辣木叶与豆类，帮助在肠道内结合并排出多余脂质。',
      '采用清蒸、白灼、炭烤或凉拌替代高温油炸与浓稠头道椰浆炖煮。',
    ],
    healthyFoodsToChoose: [
      {
        nameKh: 'ត្រីទឹកសាប និងត្រីសមុទ្រ (ត្រីរ៉ស់ ត្រីកែស ត្រីសមុទ្រ)',
        nameEn: 'Freshwater & Ocean Fish Rich in Unsaturated Fats',
        nameZh: '富含不饱和脂肪酸的淡水鱼与海鱼',
        benefitOrReasonKh: 'មានអាស៊ីតខ្លាញ់មិនឆ្អែត Omega-3 ដែលជួយទ្រទ្រង់កម្រិតជាតិខ្លាញ់ល្អ (HDL) និងសុខភាពបេះដូង។',
        benefitOrReasonEn: 'Provides beneficial Omega-3 unsaturated fatty acids that support healthy HDL levels and cardiovascular wellness.',
        benefitOrReasonZh: '富含优质 Omega-3 不饱和脂肪酸，有助于支持高密度脂蛋白（好胆固醇）与心血管健康。',
        keyNutrientsKh: 'អាស៊ីតខ្លាញ់ Omega-3, ប្រូតេអ៊ីនគ្មានខ្លាញ់ឆ្អែត',
        keyNutrientsEn: 'Omega-3 Fatty Acids, Low-Saturated-Fat Protein',
        keyNutrientsZh: 'Omega-3 不饱和脂肪酸、低饱和脂肪蛋白',
      },
      {
        nameKh: 'ត្រប់ ននោង ពោតបារាំង និងស្លឹកម្រុំ',
        nameEn: 'Eggplant, Luffa Gourd, Okra & Moringa Leaves',
        nameZh: '紫茄、丝瓜、秋葵与辣木叶',
        benefitOrReasonKh: 'សម្បូរជាតិសរសៃរលាយ (Mucilage & Pectin) ដែលជួយកាត់បន្ថយការស្រូបយកកូឡេស្តេរ៉ុលពីអាហារ។',
        benefitOrReasonEn: 'Rich in viscous soluble fiber and pectin that reduce dietary cholesterol absorption in the intestine.',
        benefitOrReasonZh: '富含植物黏液蛋白与果胶等可溶性纤维，能有效减少肠道对食物胆固醇的吸收。',
        keyNutrientsKh: 'ជាតិសរសៃរលាយ Pectin, សារធាតុប្រឆាំងអុកស៊ីតកម្ម Anthocyanins',
        keyNutrientsEn: 'Soluble Pectin Fiber, Anthocyanin Antioxidants',
        keyNutrientsZh: '可溶性果胶纤维、花青素抗氧化物',
      },
      {
        nameKh: 'តៅហ៊ូ សណ្តែកសៀង សណ្តែកបាយ និងគ្រាប់ធញ្ញជាតិ',
        nameEn: 'Tofu, Soybeans, Mung Beans & Whole Grains',
        nameZh: '豆腐、黄豆、绿豆与全谷物糙米',
        benefitOrReasonKh: 'ប្រូតេអ៊ីនរុក្ខជាតិគ្មានកូឡេស្តេរ៉ុល (0mg Cholesterol) និងមានសារធាតុ Phytosterols ជួយតុល្យភាពជាតិខ្លាញ់។',
        benefitOrReasonEn: 'Plant proteins contain zero dietary cholesterol and supply natural phytosterols.',
        benefitOrReasonZh: '植物蛋白不含胆固醇（0毫克），且含有天然植物固醇与膳食纤维。',
        keyNutrientsKh: 'ប្រូតេអ៊ីនរុក្ខជាតិ, Phytosterols និងជាតិសរសៃ',
        keyNutrientsEn: 'Plant Protein, Phytosterols, Dietary Fiber',
        keyNutrientsZh: '植物蛋白、植物固醇、膳食纤维',
      },
      {
        nameKh: 'ខ្ទឹមស ខ្ញី រមៀត និងក្រូចឆ្មាស្រស់',
        nameEn: 'Fresh Garlic, Ginger, Turmeric & Lime',
        nameZh: '大蒜、生姜、姜黄与鲜青柠',
        benefitOrReasonKh: 'គ្រឿងទេសធម្មជាតិខ្មែរសម្បូរសារធាតុប្រឆាំងអុកស៊ីតកម្ម ជួយការពារសរសៃឈាម និងកាត់បន្ថយភាពទ្រលាន់នៃអាហារ។',
        benefitOrReasonEn: 'Antioxidant-rich culinary herbs that protect blood vessels from oxidative stress and brighten low-oil cooking.',
        benefitOrReasonZh: '富含天然抗氧化物质，有助于保护血管内皮，并在少油烹饪中提升风味。',
        keyNutrientsKh: 'សារធាតុ Allicin, Gingerol និងវីតាមីន C',
        keyNutrientsEn: 'Allicin, Gingerol, Curcumin, Vitamin C',
        keyNutrientsZh: '大蒜素、姜辣素、姜黄素、维生素 C',
      },
    ],
    foodsToLimitOrAvoid: [
      {
        nameKh: 'សាច់ជ្រូកបីជាន់ ខ្លាញ់ជ្រូក ស្បែកមាន់-ទា និងផាក់ឡូវគ្រឿងក្នុង',
        nameEn: 'Fatty Pork Belly, Lard, Poultry Skin & Braised Organ Meats (Paklov)',
        nameZh: '肥五花肉、猪油、鸡鸭皮及卤水动物内脏（Paklov）',
        benefitOrReasonKh: 'សម្បូរខ្លាញ់ឆ្អែត (Saturated Fat) និងកូឡេស្តេរ៉ុលខ្ពស់ ដែលបង្កើនកម្រិតខ្លាញ់អាក្រក់ LDL ក្នុងឈាម។',
        benefitOrReasonEn: 'High in saturated fatty acids and dietary cholesterol, which directly raise blood LDL cholesterol levels.',
        benefitOrReasonZh: '含有大量饱和脂肪酸与胆固醇，过多摄入会显著升高血液低密度脂蛋白（LDL）。',
        keyNutrientsKh: 'ខ្លាញ់ឆ្អែត និងកូឡេស្តេរ៉ុលខ្ពស់',
        keyNutrientsEn: 'High Saturated Fat & Dietary Cholesterol',
        keyNutrientsZh: '高饱和脂肪与高胆固醇',
      },
      {
        nameKh: 'អាហារបំពងខ្លាញ់ច្រើន និងប្រេងឆាប្រើឡើងវិញច្រើនដង',
        nameEn: 'Deep-Fried Foods & Repeatedly Reused Cooking Oil',
        nameZh: '高温油炸食品与反复使用的煎炸油',
        benefitOrReasonKh: 'មានផ្ទុកខ្លាញ់ Trans Fat និងកាឡូរីខ្ពស់ ដែលប៉ះពាល់ដល់សុខភាពសរសៃឈាមបេះដូង។',
        benefitOrReasonEn: 'Contains oxidized fats and trans fatty acids that negatively impact cardiovascular lipid balance.',
        benefitOrReasonZh: '含有反式脂肪酸与氧化脂质，不利于血脂控制与心血管健康。',
        keyNutrientsKh: 'ខ្លាញ់ Trans Fat និងកាឡូរីលើសកម្រិត',
        keyNutrientsEn: 'Trans Fats & Excess Calories',
        keyNutrientsZh: '反式脂肪与过高热量',
      },
      {
        nameKh: 'សម្ល ឬបង្អែមដែលប្រើខ្ទិះដូងខាប់ច្រើនពេកជាប្រចាំ',
        nameEn: 'Frequent Heavy First-Press Coconut Cream Curries & Desserts',
        nameZh: '频繁大量食用浓稠头道椰浆咖喱与甜品',
        benefitOrReasonKh: 'ខ្ទិះដូងខាប់មានខ្លាញ់ឆ្អែតខ្ពស់ គួរប្រើក្នុងបរិមាណតិចល្មម ឬជំនួសដោយសម្លទឹកថ្លា។',
        benefitOrReasonEn: 'Thick coconut cream is naturally high in saturated fat and should be used sparingly in favor of clear herbal broths.',
        benefitOrReasonZh: '浓椰浆天然饱和脂肪较高，血脂偏高人群宜少量使用或优先选择高棉清汤。',
        keyNutrientsKh: 'ខ្លាញ់ឆ្អែតពីខ្ទិះដូងខាប់',
        keyNutrientsEn: 'Saturated Fat from Heavy Coconut Cream',
        keyNutrientsZh: '椰浆饱和脂肪酸',
      },
    ],
    suitableCambodianDishes: [
      {
        foodId: 'food-33',
        nameKh: 'ទឹកគ្រឿងត្រីរ៉ស់បន្លែស្រស់ចម្រុះ',
        nameEn: 'Tuk Kroeung (Poached Fish & Herb Dip with Fresh Vegetable Platter)',
        nameZh: '高棉传统鱼蓉香草蘸酱配鲜蔬拼盘（Tuk Kroeung）',
        whySuitableKh: 'ធ្វើពីសាច់ត្រីស្ងោរគ្មានខ្លាញ់ ផ្ទាប់ជាមួយបន្លែស្រស់ និងបន្លែស្រុសជាច្រើនមុខ (ត្រប់ ត្រសក់ ស្ពៃ ព្រលិត)។',
        whySuitableEn: 'Made from poached lean snakehead fish without oil, served with an abundant platter of raw and blanched vegetables.',
        whySuitableZh: '采用无油白灼黑鱼肉捣制，搭配茄子、黄瓜、睡莲茎等大量新鲜与焯水蔬菜，高纤低脂。',
        healthyCookingTipKh: 'ដាក់ប្រហុកតិចល្មម និងញ៉ាំបន្លែស្រស់ឱ្យបានច្រើនជាងបាយ។',
        healthyCookingTipEn: 'Use moderate prahok and fill most of your plate with crisp seasonal vegetables.',
        healthyCookingTipZh: '适量少放发酵鱼酱，多搭配新鲜时蔬食用。',
      },
      {
        foodId: 'food-76',
        nameKh: 'ញាំត្រយូងចេកសាច់មាន់ស្រែ',
        nameEn: 'Banana Blossom Salad with Poached Free-Range Chicken',
        nameZh: '香蕉花蕊手撕土鸡清爽沙拉',
        whySuitableKh: 'ត្រយូងចេកសម្បូរជាតិសរសៃខ្ពស់ លាយជាមួយសាច់មាន់ស្ងោរបកស្បែក មិនប្រើប្រេងឆា។',
        whySuitableEn: 'Shredded banana blossom provides abundant dietary fiber tossed with skinless poached chicken and lime-herb dressing.',
        whySuitableZh: '香蕉花蕊富含膳食纤维，搭配去皮白灼鸡丝与青柠香草汁，零油清爽。',
        healthyCookingTipKh: 'បកស្បែកមាន់ចេញមុនពេលហែកសាច់ញាំ។',
        healthyCookingTipEn: 'Remove poultry skin completely before shredding the chicken breast.',
        healthyCookingTipZh: '制作时完全去除鸡皮，仅选用瘦鸡肉丝。',
      },
      {
        foodId: 'food-65',
        nameKh: 'ត្រីរ៉ស់ដុតស្លឹកចេកជ្រលក់ទឹកត្រីអំពិលទុំ',
        nameEn: 'Banana-Leaf Grilled Snakehead Fish with Tamarind Herb Dip',
        nameZh: '蕉叶炭烤野生黑鱼配罗望子香草汁',
        whySuitableKh: 'ត្រីរ៉ស់ដុតក្នុងស្លឹកចេកដោយមិនប្រើខ្លាញ់ ផ្តល់ប្រូតេអ៊ីនសុទ្ធ និងខ្លាញ់ទាបបំផុត។',
        whySuitableEn: 'Wrapped in banana leaves and grilled without added oil, preserving lean protein and natural moisture.',
        whySuitableZh: '用芭蕉叶包裹炭烤，无需一滴油即可锁住黑鱼鲜嫩蛋白，低脂健康。',
        healthyCookingTipKh: 'ញ៉ាំផ្ទាប់ជាមួយបន្លែស្រស់ និងជីរខ្មែរឱ្យបានច្រើន។',
        healthyCookingTipEn: 'Serve with generous fresh leafy greens, cucumber slices, and herbs.',
        healthyCookingTipZh: '搭配大量生菜、黄瓜片与新鲜高棉香草一同享用。',
      },
      {
        foodId: 'food-51',
        nameKh: 'សម្លម្ជូរត្រីកែវរំដេងត្រកួន',
        nameEn: 'River Fish Sour Soup with Galangal & Water Spinach',
        nameZh: '湄公河娇鱼南姜空心菜酸汤',
        whySuitableKh: 'សម្លម្ជូរទឹកថ្លាគ្មានខ្លាញ់ឆ្អែត សម្បូរត្រកួន និងរំដេងជួយសម្រួលការរំលាយអាហារ។',
        whySuitableEn: 'Clear tamarind broth completely free of saturated fat, enriched with galangal and fibrous water spinach.',
        whySuitableZh: '清澈的罗望子南姜酸汤不含饱和脂肪，富含空心菜膳食纤维与鲜嫩河鱼。',
        healthyCookingTipKh: 'មិនចាំបាច់បំពងត្រីមុនទេ គឺដាក់ត្រីស្រស់ស្ងោរក្នុងទឹកសម្លផ្ទាល់។',
        healthyCookingTipEn: 'Poach the fresh fish directly in the boiling herbal broth rather than frying it first.',
        healthyCookingTipZh: '鲜鱼不经油煎，直接入沸汤清煮以保持低脂。',
      },
    ],
    hydrationAndLifestyleFoodTipKh:
      '💧 ការផឹកទឹក៖ ផឹកទឹកស្អាត ឬតែបៃតង/ទឹកស្លឹកគ្រៃក្តៅឧណ្ហៗមិនដាក់ស្ករ ក្រោយអាហារ ដើម្បីជួយសម្រួលប្រព័ន្ធរំលាយអាហារ។',
    hydrationAndLifestyleFoodTipEn:
      '💧 Hydration Tip: Drink plain water or unsweetened warm green tea or lemongrass infusion to support healthy metabolism.',
    hydrationAndLifestyleFoodTipZh:
      '💧 饮水建议：日常多喝白开水、淡绿茶或无糖温香茅水，有助于促进新陈代谢。',
    individualVariationNoteKh:
      'កម្រិតកូឡេស្តេរ៉ុល និងទ្រីគ្លីសេរីតក្នុងឈាមអាស្រ័យលើទាំងរបបអាហារ សកម្មភាពរាងកាយ និងកត្តាហ្សែនរបស់បុគ្គលម្នាក់ៗ។ សូមពិគ្រោះជាមួយគ្រូពេទ្យជំនាញសម្រាប់ការពិនិត្យឈាម និងការណែនាំផ្ទាល់ខ្លួន។',
    individualVariationNoteEn:
      'Blood cholesterol and triglyceride levels are influenced by diet, physical activity, and individual genetics. Consult your physician for lipid testing and tailored medical advice.',
    individualVariationNoteZh:
      '血脂水平受日常饮食、运动量及遗传体质等多重因素影响，请定期进行血脂检查并遵循医师的专业指导。',
    reviewedSourcesKh: [
      'អង្គការសុខភាពពិភពលោក (WHO) — ការណែនាំអំពីការទទួលទានខ្លាញ់ឆ្អែត និងខ្លាញ់ Trans',
      'សមាគមបេះដូងអាមេរិក (AHA) — របបអាហារសម្រាប់គ្រប់គ្រងកូឡេស្តេរ៉ុល',
      'ក្រសួងសុខាភិបាលកម្ពុជា (MoH) — គោលការណ៍អាហារសុខភាព',
    ],
    reviewedSourcesEn: [
      'World Health Organization (WHO) — Saturated Fatty Acid and Trans-Fatty Acid Intake Guidelines',
      'American Heart Association (AHA) — Dietary Cholesterol & Lipid Management Guidelines',
      'Ministry of Health Cambodia (MoH) — Healthy Nutrition Guidelines',
    ],
    reviewedSourcesZh: [
      '世界卫生组织 (WHO) — 饱和脂肪酸与反式脂肪酸摄入指南',
      '美国心脏协会 (AHA) — 血脂管理与心脏健康膳食指南',
      '柬埔寨卫生部 (MoH Cambodia) — 健康营养膳食指南',
    ],
  },
  {
    id: 'gout',
    icon: '🦴',
    badgeKh: 'សន្លាក់ហ្គោត & អាស៊ីតអ៊ុយរិក',
    badgeEn: 'Gout & Low-Purine Diet',
    badgeZh: '痛风与低嘌呤膳食',
    titleKh: 'របបអាហារកាត់បន្ថយសារធាតុ Purine សម្រាប់អ្នកមានជំងឺសន្លាក់ហ្គោត និងលើសអាស៊ីតអ៊ុយរិក',
    titleEn: 'Gout-Friendly & Low-Purine Nutrition Guide for Uric Acid Balance',
    titleZh: '痛风与高尿酸血症（低嘌呤、足量饮水）膳食指南',
    overviewKh:
      'អាស៊ីតអ៊ុយរិកកើតឡើងពីការបំបែកសារធាតុ Purine ក្នុងអាហារ។ ការកាត់បន្ថយអាហារដែលមាន Purine ខ្ពស់ (ដូចជា គ្រឿងក្នុងសត្វ សាច់ក្រហមច្រើន អាហារសមុទ្រមានសំបក និងគ្រឿងស្រវឹង) រួមជាមួយការផឹកទឹកស្អាតឱ្យបានច្រើន និងញ៉ាំបន្លែផ្លែឈើសម្បូរវីតាមីន C ជួយឱ្យរាងកាយបញ្ចេញអាស៊ីតអ៊ុយរិកតាមទឹកនោមបានល្អ។',
    overviewEn:
      'Uric acid is produced when the body breaks down purines. Limiting high-purine foods (organ meats, excess red meat, shellfish, and alcohol/fructose drinks) while eating low-purine plant proteins, eggs, and Vitamin C-rich produce alongside generous water intake supports natural uric acid excretion.',
    overviewZh:
      '尿酸是体内嘌呤代谢的产物。严格限制高嘌呤食物（动物内脏、浓肉汤、贝壳类海鲜、大量红肉及酒精/果糖饮料），优先选择鸡蛋、低脂豆制品、新鲜蔬果并保持充足饮水，有助于促进尿酸经肾脏自然排泄。',
    nutritionalPrinciplesKh: [
      'ផឹកទឹកស្អាតឱ្យបានយ៉ាងតិច ២.៥ ទៅ ៣ លីត្រក្នុងមួយថ្ងៃ (ប្រសិនបើគ្មានបញ្ហាតម្រងនោមហាមឃាត់) ដើម្បីជួយលាងបញ្ចេញអាស៊ីតអ៊ុយរិកតាមទឹកនោម។',
      'ជ្រើសរើសប្រភពប្រូតេអ៊ីនដែលមានសារធាតុ Purine ទាប ដូចជា ស៊ុត តៅហ៊ូ និងសាច់មាន់ឬត្រីទឹកសាបក្នុងបរិមាណល្មម។',
      'ជៀសវាងដាច់ខាតនូវគ្រឿងស្រវឹង (ជាពិសេសស្រាបៀរ) និងភេសជ្ជៈផ្អែមដែលមានស្ករ Fructose ខ្ពស់។',
    ],
    nutritionalPrinciplesEn: [
      'Drink 2.5 to 3.0 liters of plain water daily (unless fluid-restricted by a physician) to support renal uric acid clearance.',
      'Obtain daily protein primarily from low-purine sources such as eggs, tofu, and moderate portions of freshwater fish or skinless poultry.',
      'Strictly avoid beer, alcoholic beverages, and high-fructose sweetened drinks, which inhibit uric acid excretion.',
    ],
    nutritionalPrinciplesZh: [
      '每日保证 2.5 至 3.0 升白开水摄入（若无肾脏限水医嘱），以增加尿量、促进尿酸排泄。',
      '蛋白质来源优先选择鸡蛋、豆腐及适量的淡水鱼或去皮禽肉等低至中嘌呤食材。',
      '严格避免啤酒、烈酒及富含果糖的甜饮料，因为酒精与果糖会加速尿酸生成并阻碍其排出。',
    ],
    healthyFoodsToChoose: [
      {
        nameKh: 'ស៊ុតមាន់ ស៊ុតទា និងតៅហ៊ូសរីរាង្គ',
        nameEn: 'Eggs & Fresh Tofu (Low-Purine Proteins)',
        nameZh: '鸡蛋、鸭蛋与豆腐（优质低嘌呤蛋白）',
        benefitOrReasonKh: 'ជាប្រភពប្រូតេអ៊ីនដ៏ល្អបំផុតដែលមានសារធាតុ Purine ទាបបំផុត មិនធ្វើឱ្យឡើងអាស៊ីតអ៊ុយរិក។',
        benefitOrReasonEn: 'Eggs and soy tofu are complete proteins with virtually negligible purine content.',
        benefitOrReasonZh: '蛋类与豆腐几乎不含或仅含极低量嘌呤，是痛风人群最安全的优质蛋白质来源。',
        keyNutrientsKh: 'ប្រូតេអ៊ីនសុទ្ធ (Purine ទាបបំផុត), កាល់ស្យូម និងវីតាមីន D',
        keyNutrientsEn: 'Very Low-Purine Protein, Calcium, Vitamin D',
        keyNutrientsZh: '极低嘌呤优质蛋白、钙、维生素 D',
      },
      {
        nameKh: 'បន្លែសម្បូរជាតិទឹក (ត្រឡាច ននោង ល្ពៅ ត្រសក់ ស្ពៃ និងត្រកួន)',
        nameEn: 'Hydrating Vegetables (Winter Melon, Luffa, Pumpkin, Cucumber & Greens)',
        nameZh: '高水分时蔬（冬瓜、丝瓜、南瓜、黄瓜与绿叶菜）',
        benefitOrReasonKh: 'សម្បូរជាតិទឹក ប៉ូតាស្យូម និងអាល់កាឡាំងធម្មជាតិ ដែលជួយបន្សាប និងបញ្ចេញអាស៊ីតអ៊ុយរិក។',
        benefitOrReasonEn: 'High water content and natural alkalizing minerals support urinary dilution and uric acid clearance.',
        benefitOrReasonZh: '富含水分与钾元素，呈天然碱性，有助于碱化尿液并促进尿酸排出。',
        keyNutrientsKh: 'ជាតិទឹកខ្ពស់, ប៉ូតាស្យូម, វីតាមីន C និងជាតិសរសៃ',
        keyNutrientsEn: 'High Water Content, Potassium, Vitamin C, Fiber',
        keyNutrientsZh: '高水分、钾、维生素 C、膳食纤维',
      },
      {
        nameKh: 'ផ្លែឈើសម្បូរវីតាមីន C (ផ្លែត្របែក ក្រូចថ្លុង ល្ហុង និងក្រូចពោធិ៍សាត់)',
        nameEn: 'Vitamin C-Rich Local Fruits (Guava, Pomelo, Papaya & Pursat Orange)',
        nameZh: '富含维生素 C 的本地鲜果（番石榴、甜柚、木瓜与菩萨甜橙）',
        benefitOrReasonKh: 'វីតាមីន C ធម្មជាតិពីផ្លែឈើស្រស់ជួយទ្រទ្រង់តម្រងនោមក្នុងការបញ្ចេញអាស៊ីតអ៊ុយរិក។',
        benefitOrReasonEn: 'Adequate dietary Vitamin C from whole fruits supports healthy renal excretion of uric acid.',
        benefitOrReasonZh: '来自天然鲜果的维生素 C 有助于支持肾脏排泄尿酸。',
        keyNutrientsKh: 'វីតាមីន C ខ្ពស់, Flavonoids និងជាតិសរសៃ',
        keyNutrientsEn: 'High Vitamin C, Bioflavonoids, Fiber',
        keyNutrientsZh: '高维生素 C、生物类黄酮、膳食纤维',
      },
      {
        nameKh: 'រមៀត ខ្ញី និងស្លឹកគ្រៃស្រស់',
        nameEn: 'Fresh Turmeric, Ginger & Lemongrass',
        nameZh: '新鲜姜黄、生姜与香茅',
        benefitOrReasonKh: 'មានសារធាតុប្រឆាំងការរលាកធម្មជាតិ ជួយទ្រទ្រង់ផាសុកភាពនៃសន្លាក់។',
        benefitOrReasonEn: 'Contains natural anti-inflammatory phytonutrients that support joint comfort.',
        benefitOrReasonZh: '富含姜黄素与姜辣素等天然抗炎植物营养素，有助于呵护关节健康。',
        keyNutrientsKh: 'សារធាតុ Curcumin និង Gingerol',
        keyNutrientsEn: 'Curcumin & Gingerol Antioxidants',
        keyNutrientsZh: '姜黄素与姜辣素抗氧化物',
      },
    ],
    foodsToLimitOrAvoid: [
      {
        nameKh: 'គ្រឿងក្នុងសត្វគ្រប់ប្រភេទ (ថ្លើម ពោះវៀន បេះដូង ក្រលៀន ផាក់ឡូវ)',
        nameEn: 'All Organ Meats (Liver, Kidney, Intestines, Tripe & Paklov)',
        nameZh: '各类动物内脏（猪肝、腰花、大肠、牛肚及卤水内脏）',
        benefitOrReasonKh: 'មានកម្រិតសារធាតុ Purine ខ្ពស់បំផុត ដែលបង្កើនអាស៊ីតអ៊ុយរិកក្នុងឈាមយ៉ាងរហ័ស និងអាចបង្កការឈឺសន្លាក់ស្រួចស្រាវ។',
        benefitOrReasonEn: 'Contains the highest concentration of purines, rapidly elevating serum uric acid and triggering gout flares.',
        benefitOrReasonZh: '属于极高嘌呤食物，食用后会迅速升高血尿酸浓度并极易诱发痛风急性发作。',
        keyNutrientsKh: 'សារធាតុ Purine ខ្ពស់បំផុត (> 300mg/100g)',
        keyNutrientsEn: 'Extremely High Purines (> 300mg/100g)',
        keyNutrientsZh: '极高嘌呤含量（> 300毫克/100克）',
      },
      {
        nameKh: 'គ្រឿងសមុទ្រមានសំបកច្រើន (បង្កង ក្តាម ងាវ ខ្យង) និងសាច់គោ/សាច់ក្រហមច្រើន',
        nameEn: 'Large Portions of Shellfish (Prawns, Crabs, Clams) & Excess Red Meat',
        nameZh: '大量贝壳类海鲜（虾、蟹、蛤蜊、螺类）及过量红肉',
        benefitOrReasonKh: 'មានសារធាតុ Purine ខ្ពស់ គួរកាត់បន្ថយ ឬជៀសវាងក្នុងអំឡុងពេលកំពុងឈឺហើមសន្លាក់។',
        benefitOrReasonEn: 'Rich in purines and should be strictly limited, especially during active joint inflammation.',
        benefitOrReasonZh: '嘌呤含量较高，在尿酸偏高或关节红肿期应严格限制或暂停食用。',
        keyNutrientsKh: 'សារធាតុ Purine ខ្ពស់',
        keyNutrientsEn: 'High Purine Content',
        keyNutrientsZh: '高嘌呤含量',
      },
      {
        nameKh: 'ស្រាបៀរ ស្រាគ្រប់ប្រភេទ ទឹកស៊ុបរំងាស់ឆ្អឹងខាប់ៗ និងភេសជ្ជៈផ្អែម',
        nameEn: 'Beer, All Alcoholic Drinks, Concentrated Bone Broths & Fructose Sodas',
        nameZh: '啤酒、各类酒品、长时间熬制的浓骨汤及果糖甜饮',
        benefitOrReasonKh: 'ស្រាបៀរមានទាំងជាតិអាល់កុល និង Purine ពីមេដំបែ ហើយទឹកស៊ុបរំងាស់ឆ្អឹងយូរម៉ោងមានសារធាតុ Purine រលាយចូលក្នុងទឹកស៊ុបខ្ពស់។',
        benefitOrReasonEn: 'Beer provides brewer’s yeast purines while blocking renal uric acid excretion; long-simmered bone broths concentrate dissolved purines.',
        benefitOrReasonZh: '啤酒富含鸟苷酸且抑制尿酸排泄；久熬浓肉汤中溶出了大量水溶性嘌呤。',
        keyNutrientsKh: 'អាល់កុល, ស្ករ Fructose និង Purine រលាយក្នុងទឹកស៊ុប',
        keyNutrientsEn: 'Alcohol, Fructose & Dissolved Broth Purines',
        keyNutrientsZh: '酒精、高果糖与浓汤水溶性嘌呤',
      },
    ],
    suitableCambodianDishes: [
      {
        foodId: 'food-73',
        nameKh: 'ឆាស្ពៃក្តោបជាមួយពងទា',
        nameEn: 'Homestyle Stir-Fried Cabbage with Duck Eggs',
        nameZh: '高棉家常鸭蛋炒包菜丝',
        whySuitableKh: 'ប្រើស៊ុតជាប្រភពប្រូតេអ៊ីនដែលមាន Purine ទាបបំផុត ផ្សំជាមួយស្ពៃក្តោបសម្បូរវីតាមីន C និងជាតិសរសៃ។',
        whySuitableEn: 'Uses eggs as a very low-purine protein source paired with Vitamin C-rich cabbage.',
        whySuitableZh: '以极低嘌呤的蛋类作为蛋白质来源，搭配富含维生素 C 与膳食纤维的新鲜包菜。',
        healthyCookingTipKh: 'ឆាដោយប្រើប្រេងបន្លែតិច (១ ស្លាបព្រាបាយ) និងកាត់បន្ថយទឹកត្រី។',
        healthyCookingTipEn: 'Stir-fry with just 1 tablespoon of plant oil and light seasoning.',
        healthyCookingTipZh: '使用 1 汤匙植物油快炒，少放鱼露保持清淡。',
      },
      {
        foodId: 'food-15',
        nameKh: 'សម្លម្ជូរត្រឡាចឆ្អឹងជំនីរជ្រូក (ប្រើសាច់តិច បន្លែច្រើន)',
        nameEn: 'Winter Melon Soup (Prepared with Extra Winter Melon & Minimal Lean Meat)',
        nameZh: '清甜冬瓜汤（多冬瓜、少肉或改用蛋花豆腐）',
        whySuitableKh: 'ត្រឡាចជាបន្លែសម្បូរជាតិទឹកខ្ពស់បំផុត ជួយបញ្ចុះទឹកនោម និងបញ្ចេញអាស៊ីតអ៊ុយរិក។',
        whySuitableEn: 'Winter melon is an exceptionally hydrating vegetable that supports natural fluid balance and uric acid excretion.',
        whySuitableZh: '冬瓜含水量极高且有利水排酸作用，是痛风人群非常理想的养生蔬菜。',
        healthyCookingTipKh: 'សម្រាប់អ្នកលើសអាស៊ីតអ៊ុយរិកខ្លាំង គួរដាក់ត្រឡាចឱ្យច្រើន និងជំនួសឆ្អឹងជ្រូកដោយតៅហ៊ូ ស៊ុត ឬសាច់ត្រីបន្តិចបន្តួច។',
        healthyCookingTipEn: 'For strict low-purine diets, double the winter melon and substitute pork ribs with tofu, egg drops, or a small portion of fish.',
        healthyCookingTipZh: '高尿酸期建议多放冬瓜，并将排骨替换为豆腐块、蛋花或少量鱼片清煮。',
      },
      {
        foodId: 'food-52',
        nameKh: 'សម្លម្ជូរល្ពៅបន្លែជីរ (ប្រើសាច់តិច)',
        nameEn: 'Sweet Pumpkin & Herb Soup (Prepared Lightly with Extra Pumpkin)',
        nameZh: '金瓜九层塔清汤（多南瓜少肉版）',
        whySuitableKh: 'ល្ពៅមានសារធាតុ Purine ទាបបំផុត សម្បូរវីតាមីន A, C និងប៉ូតាស្យូម។',
        whySuitableEn: 'Pumpkin is naturally very low in purines and rich in beta-carotene, Vitamin C, and potassium.',
        whySuitableZh: '南瓜属于极低嘌呤食材，富含胡萝卜素、维生素 C 与钾元素。',
        healthyCookingTipKh: 'ចម្អិនជាទឹកសម្លស្រាល មិនរំងាស់ឆ្អឹងយូរម៉ោង។',
        healthyCookingTipEn: 'Simmer briefly in a light vegetable broth rather than a heavy long-boiled bone stock.',
        healthyCookingTipZh: '采用清水或清淡蔬菜汤快煮，避免使用长时间熬制的浓骨汤。',
      },
      {
        foodId: 'food-89',
        nameKh: 'បបរត្រីរ៉ស់ខ្ញីស្រស់',
        nameEn: 'Light Snakehead Fish & Fresh Ginger Rice Congee',
        nameZh: '鲜切黑鱼嫩姜茉莉米粥',
        whySuitableKh: 'បបរសម្បូរជាតិទឹក ខ្ញីស្រស់ជួយប្រឆាំងការរលាក និងប្រើសាច់ត្រីទឹកសាបក្នុងបរិមាណល្មម។',
        whySuitableEn: 'Hydrating rice congee infused with anti-inflammatory ginger and a modest portion of lean freshwater fish.',
        whySuitableZh: '米粥水分充足，配以抗炎嫩姜丝与适量低脂黑鱼片，温和易消化。',
        healthyCookingTipKh: 'ដាំបបរជាមួយទឹកស្អាត (មិនប្រើទឹកស៊ុបឆ្អឹង) និងដាក់សាច់ត្រីល្មម (៥០–៧០ ក្រាម)។',
        healthyCookingTipEn: 'Cook the congee in plain water rather than bone broth and use a moderate 50–70g portion of fish.',
        healthyCookingTipZh: '用清水熬粥（不用浓骨汤底），鱼片控制在 50–70 克适量范围。',
      },
    ],
    hydrationAndLifestyleFoodTipKh:
      '💧 គន្លឹះសំខាន់បំផុត៖ ផឹកទឹកស្អាត ១ កែវ រៀងរាល់ ១–២ ម៉ោងម្តងពេញមួយថ្ងៃ ដើម្បីកុំឱ្យទឹកនោមខាប់ និងការពារការកកគ្រីស្តាល់អាស៊ីតអ៊ុយរិក។',
    hydrationAndLifestyleFoodTipEn:
      '💧 Essential Hydration Tip: Drink a glass of plain water every 1–2 hours throughout the day to keep urine diluted and help prevent uric acid crystal formation.',
    hydrationAndLifestyleFoodTipZh:
      '💧 核心饮水建议：全天每隔 1–2 小时饮用一杯白开水，保持尿液稀释，帮助减少尿酸结晶沉积。',
    individualVariationNoteKh:
      'កម្រិតអាស៊ីតអ៊ុយរិកក្នុងឈាមអាស្រ័យលើទាំងការបង្កើតក្នុងរាងកាយ និងការបញ្ចេញតាមតម្រងនោមរបស់បុគ្គលម្នាក់ៗ។ សូមពិគ្រោះជាមួយគ្រូពេទ្យជំនាញ ប្រសិនបើមានអាការៈហើម ក្តៅ ក្រហម ឬឈឺសន្លាក់ខ្លាំង។',
    individualVariationNoteEn:
      'Serum uric acid levels depend on both endogenous production and individual kidney excretion. Consult a physician for proper evaluation if you experience acute joint swelling or pain.',
    individualVariationNoteZh:
      '血尿酸水平同时受体内代谢生成与肾脏排泄能力影响，如出现关节剧烈红肿热痛，请及时就医诊治。',
    reviewedSourcesKh: [
      'មហាវិទ្យាល័យឈឺសន្លាក់អាមេរិក (ACR) — គោលការណ៍របបអាហារសម្រាប់ជំងឺសន្លាក់ហ្គោត',
      'អង្គការសុខភាពពិភពលោក (WHO) & ក្រសួងសុខាភិបាលកម្ពុជា (MoH)',
    ],
    reviewedSourcesEn: [
      'American College of Rheumatology (ACR) — Dietary Guidelines for Gout Management',
      'World Health Organization (WHO) & Ministry of Health Cambodia (MoH)',
    ],
    reviewedSourcesZh: [
      '美国风湿病学会 (ACR) — 痛风患者膳食与生活方式指南',
      '世界卫生组织 (WHO) 与柬埔寨卫生部 (MoH Cambodia)',
    ],
  },
  {
    id: 'gastritis',
    icon: '🥣',
    badgeKh: 'រលាកក្រពះ & ការរំលាយអាហារ',
    badgeEn: 'Gastritis & Gentle Digestion',
    badgeZh: '胃炎与温和养胃膳食',
    titleKh: 'របបអាហារទន់ស្រួលរំលាយ សម្រាប់អ្នករលាកក្រពះ ឆ្អល់ពោះ និងច្រាលទឹកអាស៊ីតក្រពះ',
    titleEn: 'Gastritis-Friendly & Gentle Digestive Nutrition Guide',
    titleZh: '胃炎、胃酸反流与敏感肠胃温和易消化膳食指南',
    overviewKh:
      'សម្រាប់អ្នកដែលមានបញ្ហារលាកក្រពះ ឈឺចុងដង្ហើម ឆ្អល់ពោះ ឬច្រាលទឹកអាស៊ីត ការជ្រើសរើសអាហារដែលចម្អិនឆ្អិនល្អ ទន់ ក្តៅឧណ្ហៗ មិនហឹរ មិនជូរខ្លាំង និងខ្លាញ់ទាប ជួយកាត់បន្ថយការរលាកភ្នាសក្រពះ និងជួយឱ្យក្រពះរំលាយអាហារបានស្រួល។',
    overviewEn:
      'For individuals with gastritis, acid reflux, or sensitive digestion, choosing warm, well-cooked, soft, low-fat, and non-spicy foods minimizes irritation to the gastric mucosa and supports comfortable digestion.',
    overviewZh:
      '针对胃炎、胃胀气或胃酸反流人群，选择温热、软烂、少油、不辛辣且酸度温和的熟食，有助于减少对胃黏膜的机械与化学刺激，减轻胃部排空负担。',
    nutritionalPrinciplesKh: [
      'ញ៉ាំអាហារឱ្យទៀងទាត់ពេលវេលា ដោយបែងចែកជាចំណែកតូចល្មម (កុំទុកឱ្យឃ្លានខ្លាំងពេក ឬញ៉ាំឆ្អែតពេកក្នុងពេលតែមួយ) និងទំពាឱ្យម៉ដ្ឋល្អ។',
      'ជ្រើសរើសអាហារក្តៅឧណ្ហៗដូចជា បបរ ស៊ុបថ្លា ត្រីចំហុយ និងបន្លែស្ងោរទន់ៗ ជំនួសបន្លែឆៅរឹង ឬអាហារបំពងខ្លាញ់។',
      'បញ្ចប់អាហារពេលល្ងាចឱ្យបានយ៉ាងតិច ២.៥ ទៅ ៣ ម៉ោង មុនពេលចូលគេង ដើម្បីការពារការច្រាលទឹកអាស៊ីតក្រពះ។',
    ],
    nutritionalPrinciplesEn: [
      'Eat smaller, regular meals on time without skipping meals or overeating at one sitting, and chew thoroughly.',
      'Prefer warm porridges (Borbor), clear soups, steamed fish, and well-cooked tender vegetables over raw fibrous greens or greasy fried foods.',
      'Finish dinner at least 2.5 to 3 hours before lying down to sleep to prevent nighttime acid reflux.',
    ],
    nutritionalPrinciplesZh: [
      '定时定量进餐，少食多餐、细嚼慢咽，避免过度饥饿或暴饮暴食。',
      '优先选择温热的米粥、清炖汤品、清蒸鱼肉及煮软的瓜菜，避免生冷硬菜与油腻煎炸食物。',
      '晚餐宜在睡前 2.5 至 3 小时完成，餐后不宜立即平卧，以减少胃酸反流。',
    ],
    healthyFoodsToChoose: [
      {
        nameKh: 'បបរស ឬបបរត្រី/សាច់មាន់រំងាស់ផុយល្អ',
        nameEn: 'Well-Simmered Rice Porridge (Congee) with Lean Fish or Chicken',
        nameZh: '熬至软烂绵密的鲜鱼粥或去皮鸡丝粥',
        benefitOrReasonKh: 'គ្រាប់អង្កររំងាស់ផុយងាយស្រួលរំលាយបំផុត ជួយស្រោបការពារភ្នាសក្រពះ និងផ្តល់ថាមពលស្រាលៗ។',
        benefitOrReasonEn: 'Softly broken-down rice grains soothe the stomach lining and digest effortlessly with minimal gastric acid stimulation.',
        benefitOrReasonZh: '充分糊化的米粥温和包裹胃黏膜，极易消化吸收，不会过度刺激胃酸分泌。',
        keyNutrientsKh: 'កាបូអ៊ីដ្រាតងាយរំលាយ, ប្រូតេអ៊ីនទន់ និងជាតិទឹក',
        keyNutrientsEn: 'Easily Digestible Starch, Gentle Lean Protein, Hydration',
        keyNutrientsZh: '易消化碳水化合物、温和瘦蛋白、水分',
      },
      {
        nameKh: 'ល្ពៅ ននោង ត្រឡាច ការ៉ុត និងល្ហុងចម្អិនឆ្អិនទន់',
        nameEn: 'Well-Cooked Pumpkin, Luffa Gourd, Winter Melon, Carrot & Papaya',
        nameZh: '炖煮软烂的南瓜、丝瓜、冬瓜、胡萝卜与木瓜',
        benefitOrReasonKh: 'សម្បូរវីតាមីន A (Beta-carotene) និងជាតិសរសៃទន់ Pectin ដែលជួយទ្រទ្រង់ការជួសជុលភ្នាសក្រពះពោះវៀន។',
        benefitOrReasonEn: 'Rich in beta-carotene (Vitamin A precursor) and gentle soluble pectin that support healthy mucosal lining integrity.',
        benefitOrReasonZh: '富含胡萝卜素（维生素 A 前体）与温和果胶，有助于支持胃肠道黏膜健康。',
        keyNutrientsKh: 'Beta-carotene (វីតាមីន A), ជាតិសរសៃទន់ Pectin',
        keyNutrientsEn: 'Beta-Carotene (Provitamin A), Soft Soluble Pectin',
        keyNutrientsZh: 'β-胡萝卜素、温和果胶纤维',
      },
      {
        nameKh: 'ត្រីទឹកសាបចំហុយ សាច់មាន់ស្ងោរទន់ និងតៅហ៊ូទន់',
        nameEn: 'Steamed Freshwater Fish, Tender Poached Chicken & Soft Tofu',
        nameZh: '清蒸淡水鱼、嫩煮去皮鸡肉与水嫩豆腐',
        benefitOrReasonKh: 'សរសៃសាច់ទន់ខ្លី និងខ្លាញ់ទាប ធ្វើឱ្យក្រពះចំណាយពេលខ្លីក្នុងការរំលាយ មិនធ្វើឱ្យឆ្អល់ពោះ។',
        benefitOrReasonEn: 'Short muscle fibers and low fat allow rapid gastric emptying without heavy fullness or bloating.',
        benefitOrReasonZh: '肉质纤维细短且脂肪含量低，胃排空快，不会造成胃部沉重与胀满感。',
        keyNutrientsKh: 'ប្រូតេអ៊ីនងាយរំលាយ និងអាស៊ីតអាមីណូ',
        keyNutrientsEn: 'High-Digestibility Protein & Amino Acids',
        keyNutrientsZh: '高消化率优质蛋白与氨基酸',
      },
      {
        nameKh: 'ខ្ញីខ្ចីបន្តិចបន្តួច និងផ្លែចេកទុំល្អ',
        nameEn: 'Mild Fresh Ginger & Ripe Sweet Bananas',
        nameZh: '适量嫩姜丝与熟透的甜香蕉',
        benefitOrReasonKh: 'ខ្ញីខ្ចីក្នុងបរិមាណល្មមជួយកាត់បន្ថយអាការៈចង្អោរ និងហើមពោះ ចំណែកចេកទុំជួយស្រោបក្រពះ។',
        benefitOrReasonEn: 'Mild ginger relieves nausea and gas, while ripe bananas provide natural pectin that is gentle on the stomach.',
        benefitOrReasonZh: '少量嫩姜有助于缓解恶心与胀气，熟香蕉富含天然果胶，温和护胃。',
        keyNutrientsKh: 'សារធាតុ Gingerol, ប៉ូតាស្យូម និង Pectin',
        keyNutrientsEn: 'Gingerol, Potassium, Natural Pectin',
        keyNutrientsZh: '温和姜辣素、钾、天然果胶',
      },
    ],
    foodsToLimitOrAvoid: [
      {
        nameKh: 'ម្ទេសហឹរខ្លាំង ម្រេចច្រើន និងមុខម្ហូបឆាក្តៅ/បុកល្ហុងហឹរ',
        nameEn: 'Fiery Chilies, Heavy Black Pepper & Spicy Stir-Fries/Salads',
        nameZh: '朝天椒、重胡椒及辛辣爆炒/重辣凉拌菜',
        benefitOrReasonKh: 'សារធាតុ Capsaicin ក្នុងម្ទេសប៉ះពាល់ផ្ទាល់ដល់ភ្នាសក្រពះដែលកំពុងរលាក ធ្វើឱ្យក្រហាយ និងឈឺចុងដង្ហើម។',
        benefitOrReasonEn: 'Capsaicin directly irritates inflamed gastric tissue, worsening burning sensations and epigastric pain.',
        benefitOrReasonZh: '辣椒素会直接刺激充血发炎的胃黏膜，加重胃部灼热感与上腹疼痛。',
        keyNutrientsKh: 'សារធាតុហឹរ Capsaicin ធ្វើឱ្យរលាកភ្នាសក្រពះ',
        keyNutrientsEn: 'Mucosal Irritant (Capsaicin)',
        keyNutrientsZh: '辛辣刺激成分（辣椒素）',
      },
      {
        nameKh: 'អាហារជូរខ្លាំង (ម្ជូរគ្រឿងជូរខ្លាំង ផ្លែឈើខ្ចីជ្រក់) នៅពេលពោះទទេ',
        nameEn: 'Very Sour Soups, Pickled Unripe Fruits & Citrus on an Empty Stomach',
        nameZh: '空腹食用重酸汤品、酸腌生果及高酸度食物',
        benefitOrReasonKh: 'ជាតិអាស៊ីតខ្ពស់បង្កើនកម្រិតអាស៊ីតក្នុងក្រពះ ធ្វើឱ្យក្រហាយក្រពះ និងច្រាលទឹកអាស៊ីត។',
        benefitOrReasonEn: 'High acidity increases gastric acid load and triggers heartburn or reflux, especially when the stomach is empty.',
        benefitOrReasonZh: '高酸度食物会增加胃内酸负荷，空腹食用极易引发反酸与烧心。',
        keyNutrientsKh: 'អាស៊ីតខ្ពស់ (Citric / Acetic Acid)',
        keyNutrientsEn: 'High Organic Acidity',
        keyNutrientsZh: '高有机酸含量',
      },
      {
        nameKh: 'កាហ្វេចាស់ ភេសជ្ជៈប៉ូវកម្លាំង គ្រឿងស្រវឹង និងអាហារបំពងខ្លាញ់ច្រើន',
        nameEn: 'Strong Coffee, Energy Drinks, Alcohol & Greasy Fried Foods',
        nameZh: '浓咖啡、功能饮料、酒精饮品及油腻煎炸食品',
        benefitOrReasonKh: 'កាហ្វេអ៊ីន និងអាល់កុលជំរុញការបញ្ចេញទឹកអាស៊ីតក្រពះ ចំណែកខ្លាញ់ច្រើនធ្វើឱ្យអាហារដក់ក្នុងក្រពះយូរ។',
        benefitOrReasonEn: 'Caffeine and alcohol stimulate excess stomach acid secretion, while heavy fats delay gastric emptying and relax the esophageal sphincter.',
        benefitOrReasonZh: '咖啡因与酒精会刺激胃酸大量分泌，而高脂油炸食物会延缓胃排空并诱发胃食管反流。',
        keyNutrientsKh: 'កាហ្វេអ៊ីន, អាល់កុល និងខ្លាញ់ពិបាករំលាយ',
        keyNutrientsEn: 'Caffeine, Alcohol & Slow-Digesting Fats',
        keyNutrientsZh: '咖啡因、酒精与难消化高油脂',
      },
    ],
    suitableCambodianDishes: [
      {
        foodId: 'food-88',
        nameKh: 'បបរមាន់ស្រែខ្ញីខ្ចី',
        nameEn: 'Warm Free-Range Chicken Rice Porridge with Mild Ginger',
        nameZh: '高棉散养土鸡丝鲜姜养生粥',
        whySuitableKh: 'បបរក្តៅឧណ្ហៗរំងាស់ផុយល្អ ជាមួយសាច់មាន់បេះតូចៗ និងខ្ញីខ្ចីបន្តិច ជួយឱ្យកក់ក្តៅក្រពះ និងស្រួលរំលាយ។',
        whySuitableEn: 'Velvety rice congee with finely shredded poached chicken and warming ginger slices is the gentlest Khmer comfort meal for the stomach.',
        whySuitableZh: '慢火熬至米粒开花的鸡汤白粥，配以细嫩手撕鸡丝与少许嫩姜丝，温润养胃。',
        healthyCookingTipKh: 'មិនដាក់ម្ទេស ឬម្រេចច្រើន និងចម្អិនឱ្យគ្រាប់អង្ករផុយល្អ។',
        healthyCookingTipEn: 'Serve warm without chili or heavy black pepper, and avoid squeezing sour lime if you have active reflux.',
        healthyCookingTipZh: '食用时不加辣椒与重胡椒，胃酸过多者免加青柠汁。',
      },
      {
        foodId: 'food-89',
        nameKh: 'បបរត្រីរ៉ស់សាច់ត្រីស្រស់',
        nameEn: 'Silky Snakehead Fish Rice Congee',
        nameZh: '鲜切黑鱼片茉莉米粥',
        whySuitableKh: 'សាច់ត្រីរ៉ស់ហាន់ស្តើងៗឆ្អិនក្នុងបបរក្តៅៗ ទន់ស្រួលទំពា និងមិនធ្វើឱ្យឆ្អល់ពោះ។',
        whySuitableEn: 'Thinly sliced snakehead fish poached in soft jasmine rice congee provides easily absorbed protein for sensitive digestion.',
        whySuitableZh: '薄切黑鱼片在绵密白粥中滑熟，肉质雪白滑嫩，极易被敏感肠胃消化吸收。',
        healthyCookingTipKh: 'ដាក់ខ្ទឹមបំពងតែបន្តិចបន្តួច ឬជំនួសដោយស្លឹកខ្ទឹម និងជីរវ៉ាន់ស៊ុយស្រស់។',
        healthyCookingTipEn: 'Use minimal fried garlic oil and garnish lightly with fresh scallions.',
        healthyCookingTipZh: '少放炸蒜油，改用少许新鲜葱花提香。',
      },
      {
        foodId: 'food-85',
        nameKh: 'ស្ងោរមីសួរប្រហិតសាច់ជ្រូកសុទ្ធបន្លែទន់',
        nameEn: 'Clear Glass Noodle Soup with Lean Pork Meatballs & Soft Greens',
        nameZh: '瘦肉丸绿豆粉丝嫩菜清汤',
        whySuitableKh: 'ទឹកស៊ុបថ្លាក្តៅឧណ្ហៗ មីសួរទន់ងាយរំលាយ និងមិនមានជាតិជូរ ឬហឹរ។',
        whySuitableEn: 'Soothing, non-acidic, non-spicy clear broth with soft glass noodles, tender greens, and lean meatballs.',
        whySuitableZh: '汤头清澈温和、不酸不辣，粉丝与嫩青菜软滑易消化。',
        healthyCookingTipKh: 'ស្ងោរបន្លែឱ្យទន់ល្អ និងមិនបន្ថែមម្ទេសឆៅ។',
        healthyCookingTipEn: 'Simmer the greens until completely tender and serve without chili.',
        healthyCookingTipZh: '将青菜煮至软嫩，不放生辣椒。',
      },
      {
        foodId: 'food-5',
        nameKh: 'សម្លប្រហើរត្រីននោង និងល្ពៅ',
        nameEn: 'Mild Herbal Fish Soup with Soft Pumpkin & Luffa Gourd',
        nameZh: '温和香茅南瓜丝瓜鲜鱼汤（សម្លប្រហើរ）',
        whySuitableKh: 'ជាសម្លខ្មែរដែលមិនប្រើម្ជូរ មិនហឹរ និងមានល្ពៅ-ននោងចម្អិនទន់ល្អសម្រាប់ក្រពះ។',
        whySuitableEn: 'Naturally non-sour and non-spicy Cambodian soup featuring soft simmered pumpkin, luffa gourd, and flaked fish.',
        whySuitableZh: '高棉传统不酸不辣的温和鱼汤，内含炖至软糯的南瓜与丝瓜，对胃黏膜十分友好。',
        healthyCookingTipKh: 'ដាក់ប្រហុកតិចបំផុត និងរំងាស់ល្ពៅឱ្យផុយទន់។',
        healthyCookingTipEn: 'Use only a tiny amount of prahok and simmer the pumpkin and luffa until soft.',
        healthyCookingTipZh: '仅放极少许鱼酱提鲜，将南瓜与丝瓜炖至软烂。',
      },
    ],
    hydrationAndLifestyleFoodTipKh:
      '💧 ការផឹកទឹក៖ ផឹកទឹកក្តៅឧណ្ហៗបន្តិចម្តងៗពេញមួយថ្ងៃ ហើយជៀសវាងការផឹកទឹកច្រើនពេកភ្លាមៗក្នុងពេលកំពុងញ៉ាំបាយ។',
    hydrationAndLifestyleFoodTipEn:
      '💧 Hydration Tip: Sip warm water throughout the day between meals rather than gulping large volumes of ice-cold liquid during meals.',
    hydrationAndLifestyleFoodTipZh:
      '💧 饮水建议：全天在两餐之间小口慢饮温开水，避免在进餐时大量饮用冰水。',
    individualVariationNoteKh:
      'មុខម្ហូបដែលធ្វើឱ្យឆ្អល់ ឬក្រហាយក្រពះអាចខុសគ្នាពីមនុស្សម្នាក់ទៅម្នាក់ទៀត។ ប្រសិនបើមានអាការៈឈឺក្រពះរ៉ាំរ៉ៃ ស្រកទម្ងន់ ពិបាកលេបអាហារ ឬក្អួត/បន្ទោរបង់មានឈាម សូមទៅជួបគ្រូពេទ្យជំនាញជាបន្ទាន់។',
    individualVariationNoteEn:
      'Food triggers for gastritis and reflux vary by individual. If you experience persistent stomach pain, unexplained weight loss, difficulty swallowing, or dark stools, seek prompt medical evaluation.',
    individualVariationNoteZh:
      '每个人对食物的肠胃耐受度不同。若出现持续胃痛、吞咽困难、体重莫名下降或黑便呕血等症状，请立即前往医院消化科就诊。',
    reviewedSourcesKh: [
      'វិទ្យាស្ថានជាតិជំងឺប្រព័ន្ធរំលាយអាហារ (NIDDK) — ការណែនាំអាហារសម្រាប់រលាកក្រពះ និងច្រាលអាស៊ីត',
      'អង្គការសុខភាពពិភពលោក (WHO) & ក្រសួងសុខាភិបាលកម្ពុជា (MoH)',
    ],
    reviewedSourcesEn: [
      'National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK) — Gastritis & GERD Nutrition',
      'World Health Organization (WHO) & Ministry of Health Cambodia (MoH)',
    ],
    reviewedSourcesZh: [
      '美国国家糖尿病、消化与肾脏疾病研究所 (NIDDK) — 胃炎与胃食管反流饮食指南',
      '世界卫生组织 (WHO) 与柬埔寨卫生部 (MoH Cambodia)',
    ],
  },
  {
    id: 'healthy_weight',
    icon: '⚖️',
    badgeKh: 'គ្រប់គ្រងទម្ងន់ & សុខភាពទូទៅ',
    badgeEn: 'Healthy Weight & Vitality',
    badgeZh: '健康体重与均衡营养',
    titleKh: 'របបអាហារតុល្យភាពកាឡូរី ជាតិសរសៃខ្ពស់ និងប្រូតេអ៊ីនល្អ សម្រាប់ការគ្រប់គ្រងទម្ងន់ និងសុខភាពទូទៅ',
    titleEn: 'Balanced Calorie, High-Fiber & Lean Protein Guide for Healthy Weight & General Wellness',
    titleZh: '健康体重管理与日常均衡营养（高纤高蛋白）膳食指南',
    overviewKh:
      'ការគ្រប់គ្រងទម្ងន់ប្រកបដោយសុខភាពល្អ មិនមែនជាការបង្អត់អាហារនោះទេ ប៉ុន្តែគឺជាការជ្រើសរើសអាហារដែលមានសារធាតុចិញ្ចឹមខ្ពស់ កាឡូរីសមស្រប សម្បូរបន្លែបៃតង និងប្រូតេអ៊ីនគ្មានខ្លាញ់ ដែលជួយឱ្យឆ្អែតបានយូរ រក្សាសាច់ដុំ និងផ្តល់ថាមពលពេញមួយថ្ងៃ។',
    overviewEn:
      'Sustainable weight management relies on nutrient-dense, moderate-calorie meals rich in high-volume vegetables and lean protein—promoting natural fullness, preserving muscle mass, and supporting daily vitality without crash dieting.',
    overviewZh:
      '健康的体重管理并非盲目节食，而是选择高营养密度、适度热量、富含膳食纤维与优质瘦蛋白的天然食物，既能提供持久饱腹感、维持肌肉量，又能保障全天充沛精力。',
    nutritionalPrinciplesKh: [
      'រៀបចំចានអាហារតាមរូបមន្ត ២:១:១៖ បន្លែចម្រុះ ៥០% + ត្រី ឬសាច់គ្មានខ្លាញ់ ២៥% + បាយសម្រូប ឬបាយសល្មម ២៥%។',
      'ជ្រើសរើសមុខម្ហូបខ្មែរប្រភេទសម្លទឹកថ្លា ស្ងោរ ចំហុយ អាំង និងញាំ ដែលមានកាឡូរីត្រឹម ២៥០–៣៩០ kcal ក្នុង ១ ចំណែក។',
      'កាត់បន្ថយអាហារសម្រន់បំពង ភេសជ្ជៈផ្អែម និងការញ៉ាំអាហារច្រើននៅពេលយប់ជ្រៅ។',
    ],
    nutritionalPrinciplesEn: [
      'Build every meal with the 2:1:1 Plate Rule: 50% vegetables, 25% lean fish/protein, and 25% complex carbohydrates.',
      'Center meals around Cambodian clear soups, steamed dishes, grills, and fresh herb salads (typically 250–390 kcal per serving).',
      'Replace sugary drinks and fried snacks with whole local fruits and plain water, and avoid heavy late-night meals.',
    ],
    nutritionalPrinciplesZh: [
      '每餐践行“2:1:1 餐盘法则”：50% 多彩蔬菜 + 25% 鱼虾或去皮禽肉 + 25% 糙米或适量主食。',
      '日常主菜优选高棉清汤、清蒸、炭烤及香草凉拌菜（每份热量约 250–390 千卡）。',
      '用天然低糖水果与白开水替代油炸零食与含糖饮料，避免夜间过量进食。',
    ],
    healthyFoodsToChoose: [
      {
        nameKh: 'បន្លែបៃតង និងបន្លែសម្បូរជាតិសរសៃគ្រប់មុខ (ម្រុំ ត្រកួន ស្ពៃ ល្ហុង ត្រយូងចេក)',
        nameEn: 'High-Volume Leafy Greens & Fibrous Vegetables (Moringa, Water Spinach, Papaya, Banana Blossom)',
        nameZh: '高体积低热量时蔬（辣木叶、空心菜、绿叶菜、青木瓜与香蕉花蕊）',
        benefitOrReasonKh: 'មានកាឡូរីទាបបំផុត ប៉ុន្តែសម្បូរជាតិសរសៃ ទឹក និងវីតាមីន ដែលជួយឱ្យឆ្អែតពេញពោះដោយមិនឡើងទម្ងន់។',
        benefitOrReasonEn: 'Very low in calories yet high in water, fiber, and micronutrients to promote meal volume and satiety.',
        benefitOrReasonZh: '热量极低而水分、膳食纤维与维生素丰富，能显著增加餐食体积与饱腹感。',
        keyNutrientsKh: 'ជាតិសរសៃខ្ពស់, វីតាមីន A, C, K, Folate និងកាឡូរីទាប',
        keyNutrientsEn: 'High Dietary Fiber, Vitamins A, C, K, Folate, Low Energy Density',
        keyNutrientsZh: '高膳食纤维、维生素 A/C/K、叶酸、低能量密度',
      },
      {
        nameKh: 'ត្រីទឹកសាប សាច់មាន់ស្រែបកស្បែក បង្គាស្រស់ និងស៊ុតស្ងោរ',
        nameEn: 'Freshwater Fish, Skinless Poultry, Fresh Prawns & Boiled Eggs',
        nameZh: '淡水鱼、去皮土鸡肉、鲜虾与水煮蛋',
        benefitOrReasonKh: 'ប្រូតេអ៊ីនជួយឱ្យឆ្អែតបានយូរជាងម្សៅ និងជួយរក្សាម៉ាសសាច់ដុំក្នុងពេលគ្រប់គ្រងទម្ងន់។',
        benefitOrReasonEn: 'High-quality lean protein increases satiety hormones and preserves lean muscle mass during weight management.',
        benefitOrReasonZh: '优质瘦蛋白能延长饱腹时间，并在控制体重期间维持健康肌肉量。',
        keyNutrientsKh: 'ប្រូតេអ៊ីនគ្មានខ្លាញ់ខ្ពស់ (20g–28g ក្នុង ១ ចំណែក)',
        keyNutrientsEn: 'High Lean Protein (20g–28g per serving)',
        keyNutrientsZh: '高比例优质蛋白（每份约 20–28 克）',
      },
      {
        nameKh: 'គ្រឿងទេសឱសថខ្មែរ (ស្លឹកគ្រៃ រមៀត ខ្ញី រំដេង ស្លឹកក្រូចសើច ម្រេចកំពត)',
        nameEn: 'Aromatic Khmer Culinary Herbs (Lemongrass, Turmeric, Ginger, Galangal, Kampot Pepper)',
        nameZh: '高棉天然香草与香料（香茅、姜黄、生姜、南姜、青柠叶、贡布胡椒）',
        benefitOrReasonKh: 'ផ្តល់ក្លិនក្រអូប និងរសជាតិឆ្ងាញ់ដល់មុខម្ហូបដោយមិនបន្ថែមកាឡូរី ខ្លាញ់ ឬស្ករ។',
        benefitOrReasonEn: 'Delivers rich culinary flavor and antioxidant benefits with virtually zero added calories, fat, or sugar.',
        benefitOrReasonZh: '赋予菜肴浓郁香气与抗氧化营养，且几乎不增加任何额外热量、油脂或糖分。',
        keyNutrientsKh: 'សារធាតុប្រឆាំងអុកស៊ីតកម្ម Phytonutrients (0 កាឡូរីបន្ថែម)',
        keyNutrientsEn: 'Antioxidant Phytonutrients (Zero Added Calories)',
        keyNutrientsZh: '植物抗氧化活性成分（零额外热量）',
      },
    ],
    foodsToLimitOrAvoid: [
      {
        nameKh: 'អាហារបំពងខ្លាញ់ សាច់ជាប់ខ្លាញ់ច្រើន និងអាហារកែច្នៃរហ័ស',
        nameEn: 'Deep-Fried Dishes, Fatty Meats & Ultra-Processed Fast Foods',
        nameZh: '高温油炸食品、肥肉及高热量快餐零食',
        benefitOrReasonKh: 'ខ្លាញ់ ១ ក្រាម មាន ៩ កាឡូរី (ច្រើនជាងប្រូតេអ៊ីន និងម្សៅដល់ទៅជាង ២ ដង) ងាយធ្វើឱ្យលើសកាឡូរីប្រចាំថ្ងៃ។',
        benefitOrReasonEn: 'Fat provides 9 kcal per gram—more than double that of protein or carbs—making fried foods very calorie-dense.',
        benefitOrReasonZh: '每克脂肪提供 9 千卡热量（是蛋白质与碳水化合物的两倍以上），极易导致每日总热量超标。',
        keyNutrientsKh: 'ដង់ស៊ីតេកាឡូរី និងខ្លាញ់ខ្ពស់',
        keyNutrientsEn: 'High Caloric & Fat Density',
        keyNutrientsZh: '高能量密度与高油脂',
      },
      {
        nameKh: 'ភេសជ្ជៈផ្អែម ទឹកផ្លែឈើកំប៉ុង និងបង្អែមស្ករខ្ទិះច្រើន',
        nameEn: 'Sweetened Beverages, Packaged Juices & Heavy Sugary Desserts',
        nameZh: '含糖饮料、包装果汁与高糖浓椰浆甜点',
        benefitOrReasonKh: 'ផ្តល់ «កាឡូរីទទេ» (Empty Calories) ដែលមិនជួយឱ្យឆ្អែត តែបែរជាស្តុកជាខ្លាញ់ក្នុងរាងកាយ។',
        benefitOrReasonEn: 'Supplies liquid "empty calories" that do not trigger fullness signals and promote fat storage.',
        benefitOrReasonZh: '提供缺乏饱腹感的“空热量”，多余糖分极易在体内转化为脂肪堆积。',
        keyNutrientsKh: 'ស្ករសេរីខ្ពស់ និងកាឡូរីលើសកម្រិត',
        keyNutrientsEn: 'High Free Sugars & Empty Calories',
        keyNutrientsZh: '高游离糖与空热量',
      },
    ],
    suitableCambodianDishes: [
      {
        foodId: 'food-2',
        nameKh: 'សម្លកកូរត្រីរ៉ស់បន្លែចម្រុះ',
        nameEn: 'Samlor Korko (Multi-Vegetable & Moringa Fish Soup)',
        nameZh: '高棉什锦时蔬辣木叶黑鱼汤（Samlor Korko）',
        whySuitableKh: 'ផ្តល់បន្លែចម្រុះ និងប្រូតេអ៊ីនត្រីពេញមួយចាន ក្នុងកម្រិតថាមពលសមស្រប និងជាតិសរសៃខ្ពស់។',
        whySuitableEn: 'Delivers a complete spectrum of local vegetables and lean fish protein with high fiber and moderate calories.',
        whySuitableZh: '一碗汇聚多种天然蔬菜与黑鱼瘦蛋白，高膳食纤维、热量适中，营养全面。',
        healthyCookingTipKh: 'ញ៉ាំសម្លកកូរ ១ ចានគោមធំ ជាមួយបាយសម្រូប ១ កូនចានតូច។',
        healthyCookingTipEn: 'Enjoy a generous bowl of Samlor Korko paired with a modest half-bowl of brown rice.',
        healthyCookingTipZh: '盛一大碗什锦蔬菜鱼汤，搭配小半碗糙米饭即可饱腹又控卡。',
      },
      {
        foodId: 'food-32',
        nameKh: 'ញាំស្វាយខ្ចីត្រីឆ្អើរ និងជីរខ្មែរ',
        nameEn: 'Green Mango Salad with Smoked Freshwater Fish & Fresh Herbs',
        nameZh: '爽脆青芒果烟熏河鱼香草沙拉',
        whySuitableKh: 'ជាមុខម្ហូបគ្មានខ្លាញ់ឆា សម្បូរវីតាមីន C ជាតិសរសៃ និងប្រូតេអ៊ីនពីត្រីឆ្អើរ។',
        whySuitableEn: 'Oil-free salad rich in Vitamin C, crisp dietary fiber, aromatic herbs, and smoky fish protein.',
        whySuitableZh: '零油凉拌菜，富含维生素 C、爽脆膳食纤维与烟熏河鱼蛋白质。',
        healthyCookingTipKh: 'បន្ថយស្ករក្នុងទឹកញាំ និងបន្ថែមបន្លែជីរឱ្យបានច្រើន។',
        healthyCookingTipEn: 'Keep the lime-fish sauce dressing light on sugar and add extra fresh herbs.',
        healthyCookingTipZh: '调制凉拌汁时少放糖，多加新鲜薄荷与香草。',
      },
      {
        foodId: 'food-37',
        nameKh: 'នំបញ្ចុកសម្លខ្មែរត្រីរ៉ស់បន្លែស្រស់',
        nameEn: 'Traditional Num Banh Chok with Green Fish Herb Gravy & Fresh Vegetables',
        nameZh: '高棉传统香茅鱼汤鲜米线配时令鲜蔬（Num Banh Chok）',
        whySuitableKh: 'ទឹកសម្លខ្មែរធ្វើពីសាច់ត្រីសុទ្ធ និងគ្រឿងបុករមៀត ញ៉ាំជាមួយបន្លែស្រស់ច្រើនមុខ (ត្រយូងចេក ព្រលិត ត្រសក់ សណ្តែកគួរ)។',
        whySuitableEn: 'Light herbal fish broth ladled over rice noodles with a mountain of crisp banana blossom, water lily stems, and cucumber.',
        whySuitableZh: '清香少油的黑鱼香茅汤浇在鲜米线上，配以大量香蕉花丝、睡莲茎与黄瓜丝。',
        healthyCookingTipKh: 'ដាក់បន្លែស្រស់ឱ្យបានពាក់កណ្តាលចាន និងដាក់ចាប់នំបញ្ចុកល្មម។',
        healthyCookingTipEn: 'Fill half the bowl with fresh raw vegetables and use a moderate portion of noodles.',
        healthyCookingTipZh: '碗中一半放新鲜配菜，米线分量适中，营养更均衡。',
      },
      {
        foodId: 'food-6',
        nameKh: 'ស្ងោរង៉ាំង៉ូវសាច់មាន់ស្រែផ្សិតចំបើង',
        nameEn: 'Ngam Nguv (Clear Chicken Soup with Preserved Lime & Straw Mushrooms)',
        nameZh: '高棉陈年咸柠檬草菇清炖土鸡汤（Ngam Nguv）',
        whySuitableKh: 'ស៊ុបទឹកថ្លាកាឡូរីទាប សម្បូរប្រូតេអ៊ីនពីសាច់មាន់ស្រែ និងផ្សិតចំបើង។',
        whySuitableEn: 'Low-calorie clear herbal broth featuring lean country chicken and nutrient-rich straw mushrooms.',
        whySuitableZh: '低热量清澈鸡汤，富含土鸡优质蛋白与草菇膳食纤维。',
        healthyCookingTipKh: 'ដួសពពុះខ្លាញ់លើផ្ទៃទឹកស៊ុបចេញ និងកុំច្របាច់ក្រូចង៉ាំង៉ូវឱ្យបែកដើម្បីកាត់បន្ថយជាតិប្រៃ។',
        healthyCookingTipEn: 'Skim surface fat from the broth and keep the preserved lime whole so sodium stays moderate.',
        healthyCookingTipZh: '撇净汤面浮油，炖煮时保持咸柠檬完整不戳破以控制咸度。',
      },
    ],
    hydrationAndLifestyleFoodTipKh:
      '💧 ការផឹកទឹក៖ ផឹកទឹកស្អាត ១ កែវ មុនអាហារ ១៥–២០ នាទី ជួយឱ្យប្រព័ន្ធរំលាយអាហារដំណើរការល្អ និងជួយគ្រប់គ្រងបរិមាណអាហារបានសមស្រប។',
    hydrationAndLifestyleFoodTipEn:
      '💧 Hydration Tip: Drink a glass of plain water 15–20 minutes before meals to support hydration and mindful portion control.',
    hydrationAndLifestyleFoodTipZh:
      '💧 饮水建议：餐前 15–20 分钟饮用一杯白开水，有助于补充水分并自然控制正餐食量。',
    individualVariationNoteKh:
      'តម្រូវការថាមពល (កាឡូរី) និងប្រូតេអ៊ីនប្រចាំថ្ងៃមានភាពខុសៗគ្នាទៅតាមអាយុ ភេទ កម្ពស់ ទម្ងន់ និងកម្រិតនៃការធ្វើពលកម្ម ឬហាត់ប្រាណរបស់បុគ្គលម្នាក់ៗ។',
    individualVariationNoteEn:
      'Daily calorie and protein requirements vary by age, sex, height, weight, and physical activity level. Consult a healthcare professional or dietitian for individualized nutrition planning.',
    individualVariationNoteZh:
      '每日所需热量与蛋白质因年龄、性别、身高、体重及体力活动水平而异，建议结合自身情况合理安排膳食。',
    reviewedSourcesKh: [
      'អង្គការសុខភាពពិភពលោក (WHO) — គោលការណ៍របបអាហារសុខភាពសម្រាប់មនុស្សពេញវ័យ',
      'ក្រសួងសុខាភិបាលកម្ពុជា (MoH) — ប្រអប់អាហារូបត្ថម្ភ និងចានអាហារសុខភាពគ្រួសារខ្មែរ',
      'តារាងសមាសធាតុអាហារអាស៊ាន (ASEAN Food Composition Database)',
    ],
    reviewedSourcesEn: [
      'World Health Organization (WHO) — Healthy Diet Fact Sheet & Macronutrient Guidelines',
      'Ministry of Health Cambodia (MoH) — Cambodian Family Healthy Plate Guidelines',
      'ASEAN Food Composition Database (Institute of Nutrition)',
    ],
    reviewedSourcesZh: [
      '世界卫生组织 (WHO) — 成人健康膳食与宏量营养素指南',
      '柬埔寨卫生部 (MoH Cambodia) — 柬埔寨家庭健康餐盘指南',
      '东盟食物成分数据库 (ASEAN Food Composition Database)',
    ],
  },
];

