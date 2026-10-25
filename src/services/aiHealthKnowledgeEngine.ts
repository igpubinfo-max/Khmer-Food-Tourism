/**
 * AI Health & Clinical Nutrition Multi-Turn Knowledge Engine
 * ---------------------------------------------------------------------------
 * Supports Khmer (km), English (en), and Simplified Chinese (zh) with:
 * - Multi-turn conversation session management (10+ consecutive questions per session)
 * - Context-aware follow-up resolution across 24+ clinical/symptom/nutrition topics
 * - 4-Tier Medical Safety Escalation (Emergency 119, Urgent Care, Medication Risk, High-Risk Patient)
 * - Trusted Medical Sources (WHO, Ministry of Health Cambodia, AHA, ADA)
 * - Clinical Uncertainty Explanation & Privacy-First Local Session Storage ($0 API cost)
 */

import { FoodItem } from '../types';
import {
  DishNutritionProfile,
  HealthGoalId,
  HealthQaAnswer,
  getDishNutritionProfile,
  getRecommendedDishesByHealthGoal,
} from './aiFoodService';

export type SafetyEscalationLevel =
  | 'emergency'
  | 'urgent'
  | 'medication_caution'
  | 'high_risk_care'
  | 'standard';

export interface SafetyEscalationBanner {
  level: SafetyEscalationLevel;
  titleKh: string;
  titleEn: string;
  titleZh: string;
  messageKh: string;
  messageEn: string;
  messageZh: string;
  actionCalloutKh: string;
  actionCalloutEn: string;
  actionCalloutZh: string;
}

export interface HealthConversationTurn {
  turnId: string;
  sessionId: string;
  turnNumber: number;
  timestamp: string;
  question: string;
  languageDetected: 'km' | 'en' | 'zh';
  topicId: string;
  previousTopicId?: string;
  isFollowUp: boolean;
  followUpAspect?: string;
  status: 'success' | 'error';
  answer: HealthQaAnswer;
  responseTimeMs: number;
}

export interface HealthConversationSession {
  sessionId: string;
  userId: string;
  accountLabel: string;
  deviceProfile: string;
  createdAt: string;
  updatedAt: string;
  activeTopicId: string;
  turns: HealthConversationTurn[];
}

interface ClinicalTopicDefinition {
  topicId: string;
  goalId: HealthGoalId;
  safetyLevel: SafetyEscalationLevel;
  keywords: string[];
  badgeKh: string;
  badgeEn: string;
  badgeZh: string;
  topicNameKh: string;
  topicNameEn: string;
  topicNameZh: string;
  summaryKh: string;
  summaryEn: string;
  summaryZh: string;
  bulletPointsKh: string[];
  bulletPointsEn: string[];
  bulletPointsZh: string[];
  foodsToChooseKh: string[];
  foodsToChooseEn: string[];
  foodsToChooseZh: string[];
  foodsToLimitKh: string[];
  foodsToLimitEn: string[];
  foodsToLimitZh: string[];
  drinksKh: string;
  drinksEn: string;
  drinksZh: string;
  fruitsKh: string;
  fruitsEn: string;
  fruitsZh: string;
  morningMealKh: string;
  morningMealEn: string;
  morningMealZh: string;
  eveningMealKh: string;
  eveningMealEn: string;
  eveningMealZh: string;
  medicationCareKh: string;
  medicationCareEn: string;
  medicationCareZh: string;
  redFlagsKh: string;
  redFlagsEn: string;
  redFlagsZh: string;
  recoveryTimelineKh: string;
  recoveryTimelineEn: string;
  recoveryTimelineZh: string;
  followUpSuggestionsKh: string[];
  followUpSuggestionsEn: string[];
  followUpSuggestionsZh: string[];
}

export const TRUSTED_SOURCES_KH = [
  'អង្គការសុខភាពពិភពលោក (WHO)',
  'ក្រសួងសុខាភិបាលកម្ពុជា (MoH Cambodia)',
  'សមាគមបេះដូង និងទឹកនោមផ្អែមអាមេរិក (AHA / ADA)',
];

export const TRUSTED_SOURCES_EN = [
  'World Health Organization (WHO)',
  'Ministry of Health Cambodia (MoH)',
  'American Heart & Diabetes Associations (AHA / ADA)',
];

export const TRUSTED_SOURCES_ZH = [
  '世界卫生组织 (WHO)',
  '柬埔寨卫生部临床营养指南 (MoH Cambodia)',
  '美国心脏协会与糖尿病协会 (AHA / ADA)',
];

export const UNCERTAINTY_NOTE_KH =
  '🔍 ការពន្យល់អំពីភាពមិនប្រាកដប្រជាផ្នែកវេជ្ជសាស្ត្រ៖ រោគសញ្ញាសុខភាពអាចមានមូលហេតុច្រើនយ៉ាង និងខុសគ្នាទៅតាមអាយុ ប្រវត្តិជំងឺ និងការប្រើប្រាស់ថ្នាំរបស់បុគ្គលម្នាក់ៗ។ ការណែនាំនេះគឺជាការអប់រំសុខភាព និងអាហារូបត្ថម្ភផ្អែកលើភស្តុតាងវេជ្ជសាស្ត្រ មិនអាចជំនួសការពិនិត្យឈាម ការថតឆ្លុះ ឬការធ្វើរោគវិនិច្ឆ័យផ្ទាល់ពីគ្រូពេទ្យជំនាញឡើយ។';

export const UNCERTAINTY_NOTE_EN =
  '🔍 Clinical Uncertainty & Professional Care Note: Symptoms can overlap across multiple conditions and vary by age, medical history, and current medications. This evidence-based guidance supports safe nutrition and self-care but cannot replace physical examination, lab testing, or diagnosis by a licensed physician.';

export const UNCERTAINTY_NOTE_ZH =
  '🔍 医学不确定性与专业就医提示：同一症状可能由多种病因引起，且因年龄、基础疾病及用药情况而异。本回答基于循证医学与临床营养学提供饮食与护理建议，不能替代医生的当面问诊、化验检查或处方治疗。';

export function detectQueryLanguage(rawQuery: string, fallbackLang: 'km' | 'en' | 'zh' = 'km'): 'km' | 'en' | 'zh' {
  const q = (rawQuery || '').trim();
  if (/[\u1780-\u17FF]/.test(q)) return 'km';
  if (/[\u4E00-\u9FFF]/.test(q)) return 'zh';
  if (/[a-zA-Z]/.test(q)) return 'en';
  return fallbackLang;
}

export function buildSafetyEscalationBanner(
  level: SafetyEscalationLevel,
  topicNameKh: string,
  topicNameEn: string,
  topicNameZh: string,
  redFlagsKh: string,
  redFlagsEn: string,
  redFlagsZh: string
): SafetyEscalationBanner {
  if (level === 'emergency') {
    return {
      level: 'emergency',
      titleKh: '🚨 ការជូនដំណឹងសង្គ្រោះបន្ទាន់ផ្នែកវេជ្ជសាស្ត្រ (Emergency Safety Alert)',
      titleEn: '🚨 Medical Emergency Safety Escalation Alert',
      titleZh: '🚨 医疗紧急安全预警 (Emergency Escalation)',
      messageKh: `រោគសញ្ញាទាក់ទងនឹង «${topicNameKh}» អាចជាសញ្ញាគ្រោះថ្នាក់ធ្ងន់ធ្ងរដល់អាយុជីវិត។ ${redFlagsKh} របបអាហារមិនអាចព្យាបាលស្ថានភាពសង្គ្រោះបន្ទាន់បានទេ!`,
      messageEn: `Symptoms related to "${topicNameEn}" can indicate a life-threatening medical emergency. ${redFlagsEn} Dietary changes cannot treat acute medical emergencies!`,
      messageZh: `与“${topicNameZh}”相关的症状可能提示危及生命的急症。${redFlagsZh} 饮食调理绝不能替代急诊抢救！`,
      actionCalloutKh: '📞 សូមទូរស័ព្ទទៅលេខសង្គ្រោះបន្ទាន់ 119 ឬទៅមន្ទីរពេទ្យដែលជិតបំផុតភ្លាមៗ!',
      actionCalloutEn: '📞 Call Cambodia Emergency 119 or go to the nearest Hospital Emergency Room immediately!',
      actionCalloutZh: '📞 请立即拨打柬埔寨急救电话 119 或马上前往最近的医院急诊科！',
    };
  }
  if (level === 'urgent') {
    return {
      level: 'urgent',
      titleKh: '⚠️ ការជូនដំណឹងរោគសញ្ញាត្រូវប្រុងប្រយ័ត្នខ្ពស់ (Urgent Medical Caution)',
      titleEn: '⚠️ Urgent Symptom & Dehydration Caution',
      titleZh: '⚠️ 急性症状与就医预警 (Urgent Care Advisory)',
      messageKh: `សម្រាប់ «${topicNameKh}» សូមតាមដានរោគសញ្ញាឱ្យដិតដល់៖ ${redFlagsKh}`,
      messageEn: `For "${topicNameEn}", monitor symptoms closely: ${redFlagsEn}`,
      messageZh: `针对“${topicNameZh}”，请密切观察以下警示症状：${redFlagsZh}`,
      actionCalloutKh: '🏥 ប្រសិនបើរោគសញ្ញាមិនធូរស្រាលក្នុង ២៤-៤៨ ម៉ោង ឬមានសញ្ញាគ្រោះថ្នាក់ សូមទៅជួបគ្រូពេទ្យភ្លាម។',
      actionCalloutEn: '🏥 Seek medical evaluation promptly if symptoms worsen or persist beyond 24–48 hours.',
      actionCalloutZh: '🏥 若症状在 24–48 小时内未缓解或出现上述危险信号，请立即就医。',
    };
  }
  if (level === 'medication_caution') {
    return {
      level: 'medication_caution',
      titleKh: '💊 គោលការណ៍សុវត្ថិភាពនៃការប្រើប្រាស់ថ្នាំពេទ្យ (Medication Safety Rule)',
      titleEn: '💊 Medication & Drug-Food Interaction Safety Rule',
      titleZh: '💊 用药安全与食物相互作用提示 (Medication Safety)',
      messageKh: `ហាមបញ្ឈប់ ឬផ្លាស់ប្តូរកម្រិតថ្នាំពេទ្យដោយខ្លួនឯងដោយគ្មានវេជ្ជបញ្ជា។ ${redFlagsKh}`,
      messageEn: `Never stop or alter prescribed medication doses without consulting your physician. ${redFlagsEn}`,
      messageZh: `请勿未经医生许可擅自停药或更改处方剂量。${redFlagsZh}`,
      actionCalloutKh: '👨‍⚕️ សូមពិគ្រោះជាមួយវេជ្ជបណ្ឌិត ឬឱសថការី មុនប្រើថ្នាំបំបាត់ការឈឺចាប់ ថ្នាំផ្សះ ឬអាហារបំប៉ន។',
      actionCalloutEn: '👨‍⚕️ Always verify medication timing and interactions with your doctor or licensed pharmacist.',
      actionCalloutZh: '👨‍⚕️ 服用止痛药、抗生素或保健品前，请先咨询执业医师或药师。',
    };
  }
  if (level === 'high_risk_care') {
    return {
      level: 'high_risk_care',
      titleKh: '🛡️ ការថែទាំពិសេសសម្រាប់អ្នកជំងឺប្រចាំកាយ / ក្រុមហានិភ័យខ្ពស់',
      titleEn: '🛡️ High-Risk Patient & Chronic Condition Safety Care',
      titleZh: '🛡️ 高风险人群与慢性病安全护理提示',
      messageKh: `អ្នកជំងឺប្រចាំកាយ ស្ត្រីមានផ្ទៃពោះ កុមារតូច និងមនុស្សចាស់ ត្រូវការការតាមដានវេជ្ជសាស្ត្រទៀងទាត់។ ${redFlagsKh}`,
      messageEn: `Chronic disease patients, pregnant women, young children, and older adults require individualized clinical monitoring. ${redFlagsEn}`,
      messageZh: `慢性病患者、孕妇、婴幼儿及老年人需定期接受临床监测。${redFlagsZh}`,
      actionCalloutKh: '🩺 សូមពិនិត្យសុខភាពតាមការណាត់របស់គ្រូពេទ្យ និងកុំប្រើឱសថបុរាណគ្មានប្រភពច្បាស់លាស់។',
      actionCalloutEn: '🩺 Follow your physician’s checkup schedule and avoid unverified herbal preparations.',
      actionCalloutZh: '🩺 请按时复诊监测指标，避免服用来源不明的偏方或草药。',
    };
  }
  return {
    level: 'standard',
    titleKh: '✅ មគ្គុទ្ទេសក៍សុខភាព និងអាហារូបត្ថម្ភផ្អែកលើភស្តុតាងវេជ្ជសាស្ត្រ',
    titleEn: '✅ Evidence-Based Health & Clinical Nutrition Guidance',
    titleZh: '✅ 循证医学与临床营养健康指南',
    messageKh: redFlagsKh,
    messageEn: redFlagsEn,
    messageZh: redFlagsZh,
    actionCalloutKh: '🩺 ពិគ្រោះជាមួយគ្រូពេទ្យប្រសិនបើអ្នកមានរោគសញ្ញាមិនប្រក្រតី។',
    actionCalloutEn: '🩺 Consult a healthcare professional if you experience persistent symptoms.',
    actionCalloutZh: '🩺 如症状持续或加重，请及时咨询专业医生。',
  };
}
export const CLINICAL_TOPICS_CATALOG: ClinicalTopicDefinition[] = [
  // 1. FLU, COMMON COLD & FEVER (គ្រុនផ្ដាសាយ / ក្ដៅខ្លួន / ហៀរសំបោរ) — Fixes Screenshot 1!
  {
    topicId: 'qa-flu-cold-fever',
    goalId: 'immunity_herbs',
    safetyLevel: 'standard',
    keywords: [
      'គ្រុនផ្ដាសាយ', 'គ្រុនផ្តាសាយ', 'ផ្ដាសាយ', 'ផ្តាសាយ', 'ក្ដៅខ្លួន', 'ក្តៅខ្លួន',
      'គ្រុនក្ដៅ', 'គ្រុនក្តៅ', 'ហៀរសំបោរ', 'តឹងច្រមុះ', 'រងាញាក់',
      'flu', 'influenza', 'common cold', 'catching a cold', 'fever', 'runny nose', 'stuffy nose', 'chills',
      '感冒', '流感', '发烧', '发热', '流鼻涕', '鼻塞', '着凉',
    ],
    badgeKh: '🤒 ការថែទាំ និងអាហារូបត្ថម្ភពេលមានជំងឺគ្រុនផ្ដាសាយ & ក្ដៅខ្លួន',
    badgeEn: '🤒 Flu, Common Cold & Fever Recovery Care Guide',
    badgeZh: '🤒 感冒、流感与发热营养护理指南',
    topicNameKh: 'ជំងឺគ្រុនផ្ដាសាយ និងក្ដៅខ្លួន',
    topicNameEn: 'Flu, Common Cold & Fever',
    topicNameZh: '感冒、流感与发热',
    summaryKh:
      'ពេលមានជំងឺគ្រុនផ្ដាសាយ ក្ដៅខ្លួន ឬហៀរសំបោរ រាងកាយត្រូវការជាតិទឹកក្តៅឧណ្ហៗ ប្រូតេអ៊ីនងាយរំលាយ វីតាមីន C ស័ង្កសី (Zinc) និងឱសថគ្រឿងទេសខ្មែរ (ខ្ញីស្រស់ ស្លឹកគ្រៃ ខ្ទឹមស ស្លឹកក្រូចសើច និងម្រុំ) ដើម្បីជួយបញ្ចុះកម្ដៅ បន្ថយការរលាកផ្លូវដង្ហើម និងពង្រឹងប្រព័ន្ធភាពស៊ាំឱ្យឆាប់ជាសះស្បើយ។',
    summaryEn:
      'During flu, common cold, or mild fever, your body needs warm hydration, easily digestible lean protein, Vitamin C, zinc, and aromatic Cambodian herbs (fresh ginger, lemongrass, garlic, kaffir lime, and moringa) to soothe respiratory inflammation, maintain fluid balance, and support immune recovery.',
    summaryZh:
      '患感冒、流感或发热时，身体需要充足的温热水分、易消化的优质蛋白、维生素 C、锌以及柬埔寨天然草本香料（鲜姜、香茅、大蒜、柠檬叶、辣木叶），以缓解呼吸道炎症、补充体液并加速免疫系统恢复。',
    bulletPointsKh: [
      '🥣 អាហារក្តៅឧណ្ហៗ និងងាយរំលាយ៖ បបរសាច់មាន់ខ្ញីស្រស់ បបរត្រីរ៉ស់ ស្ងោរជ្រក់ត្រី ឬស៊ុបមាន់ដាក់គល់ស្លឹកគ្រៃ ជួយបន្ថយការតឹងច្រមុះ និងផ្តល់ថាមពល។',
      '🫚 ខ្ញី ស្លឹកគ្រៃ និងខ្ទឹមស៖ មានសារធាតុប្រឆាំងការរលាក និងបន្ថយអាការៈរងាញាក់ ឈឺក្បាល និងហៀរសំបោរ។',
      '💧 បំពេញជាតិទឹកឱ្យបានច្រើន៖ ផឹកទឹកក្តៅឧណ្ហៗ ទឹកខ្ញីក្តៅលាយទឹកឃ្មុំតិចៗ ឬទឹកដូងស្រស់ ២.៥ លីត្រ/ថ្ងៃ ដើម្បីការពារការខ្សោះជាតិទឹកពេលក្ដៅខ្លួន។',
      '😴 សម្រាកឱ្យបានគ្រប់គ្រាន់ ៧-៩ ម៉ោង និងជូតខ្លួននឹងទឹកក្តៅឧណ្ហៗប្រសិនបើមានកម្ដៅខ្លួន។',
    ],
    bulletPointsEn: [
      '🥣 Warm, Easily Digestible Meals: Ginger chicken rice porridge (Borbor), snakehead fish porridge, and clear lemongrass soup open nasal passages and restore strength.',
      '🫚 Ginger, Lemongrass & Garlic: Natural anti-inflammatory compounds help ease chills, congestion, and body aches.',
      '💧 Stay Hydrated: Drink 2.5L/day of warm water, warm ginger-lime infusion, or fresh coconut water to replace fluids lost during fever.',
      '😴 Prioritize 7–9 hours of rest and use lukewarm sponging if feverish.',
    ],
    bulletPointsZh: [
      '🥣 温热易消化饮食：鲜姜鸡肉粥、生鱼片粥或香茅清汤有助于缓解鼻塞并补充体力。',
      '🫚 鲜姜、香茅与大蒜：富含天然抗炎成分，可减轻畏寒、鼻塞与全身酸痛。',
      '💧 充足补水：每日饮用 2.5 升生温水、姜茶或新鲜椰子水，预防发热引起的脱水。',
      '😴 保证每天 7–9 小时睡眠休息，发热时可用温水擦拭降温。',
    ],
    foodsToChooseKh: ['បបរសាច់មាន់ខ្ញីស្រស់', 'បបរត្រីរ៉ស់ក្តៅៗ', 'ស្ងោរជ្រក់ត្រីស្លឹកគ្រៃ', 'សម្លប្រហើរស្លឹកម្រុំ', 'ឆាខ្ញីសាច់មាន់', 'ផ្លែក្រូច និងត្របែក'],
    foodsToChooseEn: ['Warm Ginger Chicken Porridge', 'Snakehead Fish Porridge', 'Clear Lemongrass Fish Soup', 'Moringa Samlor Praher', 'Ginger Chicken Stir-Fry', 'Oranges & Guava'],
    foodsToChooseZh: ['鲜姜鸡肉热粥', '生鱼片热粥', '香茅清炖鱼汤', '辣木叶养生汤', '仔姜炒鸡肉', '橙子与番石榴'],
    foodsToLimitKh: ['ទឹកកក និងភេសជ្ជៈត្រជាក់ខ្លាំង', 'អាហារបំពងខ្លាញ់ច្រើនពិបាករំលាយ', 'ភេសជ្ជៈផ្អែមខ្លាំង និងគ្រឿងស្រវឹង', 'អាហារហឹរខ្លាំងដែលធ្វើឱ្យក្រហាយបំពង់ក'],
    foodsToLimitEn: ['Ice-cold drinks', 'Greasy deep-fried foods', 'Sugary sodas & alcohol', 'Extremely spicy foods that irritate the throat'],
    foodsToLimitZh: ['冰镇饮料与冷饮', '油炸油腻难消化食物', '高糖饮料与酒精', '刺激咽喉的重辣食物'],
    drinksKh: 'គួរផឹកទឹកក្តៅឧណ្ហៗ ទឹកខ្ញីក្តៅលាយក្រូចឆ្មា និងទឹកឃ្មុំតិចៗ ទឹកស្លឹកគ្រៃក្តៅឧណ្ហៗ ឬទឹកដូងធម្មជាតិ (កុំដាក់ទឹកកក) ឱ្យបាន ២ ទៅ ២.៥ លីត្រក្នុងមួយថ្ងៃ។',
    drinksEn: 'Drink 2.0–2.5L of warm water, warm ginger and lime tea with a touch of honey, warm lemongrass infusion, or room-temperature fresh coconut water.',
    drinksZh: '建议每天饮用 2.0–2.5 升温开水、温热姜汁柠檬蜂蜜水、香茅温茶或常温新鲜椰子水（切勿加冰）。',
    fruitsKh: 'ផ្លែឈើល្អបំផុតពេលផ្ដាសាយ គឺផ្លែក្រូចពោធិ៍សាត់ ក្រូចឆ្មា ត្របែក ល្ហុងទុំ ចេកទុំ និងផ្លែប៉ោម ដែលសម្បូរវីតាមីន C ជួយពង្រឹងប្រព័ន្ធភាពស៊ាំ។',
    fruitsEn: 'Best fruits for flu recovery are oranges, guava, ripe papaya, bananas, and apples—rich in Vitamin C and easy on the stomach.',
    fruitsZh: '感冒期间最适合吃富含维生素 C 且温和的水果，如橙子、番石榴、熟木瓜、香蕉和苹果。',
    morningMealKh: 'អាហារពេលព្រឹកល្អបំផុត៖ បបរសាច់មាន់ ឬបបរត្រីរ៉ស់ដាក់ខ្ញីស្រស់ និងស្លឹកខ្ទឹម ក្តៅឧណ្ហៗ ១ ចាន ជាមួយទឹកខ្ញីក្តៅ ១ កែវ។',
    morningMealEn: 'Best Breakfast: A warm bowl of ginger chicken or snakehead fish porridge (Borbor) topped with scallions, plus warm ginger water.',
    morningMealZh: '最佳早餐：一碗温热的鲜姜鸡肉粥或生鱼粥（撒葱花），配一杯温姜水。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ ស្ងោរជ្រក់ត្រីរ៉ស់ ឬសម្លប្រហើរស្លឹកម្រុំក្តៅៗ ជាមួយបាយទន់ៗកន្លះចាន មុនម៉ោង ៧ យប់ ដើម្បីឱ្យស្រួលដកដង្ហើមពេលគេង។',
    eveningMealEn: 'Best Dinner: Warm clear lemongrass fish soup or Moringa soup with soft rice before 7 PM for restful sleep.',
    eveningMealZh: '最佳晚餐：晚 7 点前食用温热的香茅清鱼汤或辣木叶蔬菜汤配软米饭，有助于夜间呼吸顺畅与睡眠。',
    medicationCareKh: 'ប្រសិនបើប្រើថ្នាំបញ្ចុះកម្ដៅ (ដូចជា Paracetamol) សូមលេបតាមកម្រិតណែនាំ (រៀងរាល់ ៤-៦ ម៉ោងម្តងពេលក្ដៅលើស 38.5°C) ហាមលេបថ្នាំផ្ដាសាយច្រើនមុខដែលមានជាតិ Paracetamol ជាន់គ្នា និងមិនត្រូវប្រើថ្នាំផ្សះ (Antibiotics) ដោយគ្មានវេជ្ជបញ្ជាឡើយ ព្រោះផ្ដាសាយបង្កដោយវីរុស។',
    medicationCareEn: 'If using Paracetamol for fever (>38.5°C), follow exact dosing intervals (every 4–6h) and avoid combining multiple cold medicines containing acetaminophen. Do not take antibiotics for viral colds/flu unless prescribed by a doctor.',
    medicationCareZh: '若使用对乙酰氨基酚（Paracetamol）退烧（>38.5°C），请严格按间隔（每 4–6 小时）服用，避免同时服用多种含对乙酰氨基酚的感冒药。普通感冒与流感由病毒引起，切勿自行滥用抗生素。',
    redFlagsKh: 'សញ្ញាគ្រោះថ្នាក់ត្រូវទៅមន្ទីរពេទ្យភ្លាម៖ ក្ដៅខ្លួនខ្លាំងលើស 39°C លើសពី ៣ ថ្ងៃ ពិបាកដកដង្ហើម ដង្ហក់ ឈឺទ្រូង សន្លឹម ក្អួតមិនឈប់ ឬមានស្នាមអុចក្រហមលើស្បែក (សង្ស័យគ្រុនឈាម)។',
    redFlagsEn: 'Warning signs requiring urgent medical care: High fever >39°C lasting more than 3 days, shortness of breath, chest pain, severe lethargy, persistent vomiting, or petechial skin rash (possible dengue).',
    redFlagsZh: '需立即就医的危险信号：高烧超过 39°C 持续 3 天以上、呼吸困难、胸痛、精神萎靡、剧烈呕吐或皮肤出现出血点（需排查登革热）。',
    recoveryTimelineKh: 'ជំងឺគ្រុនផ្ដាសាយធម្មតាភាគច្រើនធូរស្រាលក្នុងរយៈពេល ៥ ទៅ ៧ ថ្ងៃ ដោយការសម្រាកគ្រប់គ្រាន់ ផឹកទឹកក្តៅឧណ្ហៗ និងញ៉ាំអាហារសម្បូរជីវជាតិ។',
    recoveryTimelineEn: 'Uncomplicated viral colds and flu typically improve within 5–7 days with rest, warm hydration, and nutrient-rich meals.',
    recoveryTimelineZh: '普通病毒性感冒通常在充足休息、温热补水和营养饮食下于 5–7 天内逐渐康复。',
    followUpSuggestionsKh: [
      'តើពេលគ្រុនផ្ដាសាយ គួរផឹកទឹកអ្វីខ្លះឱ្យឆាប់ជា?',
      'តើអាចញ៉ាំផ្លែឈើអ្វីបានខ្លះពេលក្ដៅខ្លួន?',
      'បើលេបថ្នាំផ្ដាសាយ តើត្រូវប្រុងប្រយ័ត្នអ្វីខ្លះ?',
      'តើរោគសញ្ញាបែបណាត្រូវទៅមន្ទីរពេទ្យបន្ទាន់?',
    ],
    followUpSuggestionsEn: [
      'What warm drinks are best for flu and fever recovery?',
      'Which fruits should I eat when I have a cold or fever?',
      'What medication precautions should I follow for flu?',
      'What warning signs mean I must see a doctor immediately?',
    ],
    followUpSuggestionsZh: [
      '感冒发烧时喝什么饮品恢复最快？',
      '感冒发烧期间可以吃什么水果？',
      '服用感冒退烧药有哪些安全注意事项？',
      '出现什么症状必须立即去医院？',
    ],
  },

  // 2. SORE THROAT, PHARYNGITIS & COUGH (ឈឺក / ឈឺ ក / ក្អក / ស្លេស្ម) — Fixes Screenshot 3!
  {
    topicId: 'qa-sore-throat-cough',
    goalId: 'immunity_herbs',
    safetyLevel: 'standard',
    keywords: [
      'ឈឺក', 'ឈឺ ក', 'រលាកបំពង់ក', 'ក្រហាយក', 'ស្អកក', 'ក្អក', 'ស្លេស្ម', 'ពិបាកលេប',
      'sore throat', 'throat pain', 'pharyngitis', 'tonsillitis', 'cough', 'coughing', 'phlegm', 'hoarse',
      '喉咙痛', '嗓子痛', '咽喉炎', '扁桃体炎', '咳嗽', '有痰', '化痰', '声音嘶哑',
    ],
    badgeKh: '🧣 ការថែទាំបំពង់ក ឈឺក ក្អក និងស្លេស្ម (Sore Throat & Cough Care)',
    badgeEn: '🧣 Sore Throat, Pharyngitis & Cough Relief Guide',
    badgeZh: '🧣 喉咙痛、咽喉炎与咳嗽护理指南',
    topicNameKh: 'អាការៈឈឺបំពង់ក ក្អក និងស្លេស្ម',
    topicNameEn: 'Sore Throat, Pharyngitis & Cough',
    topicNameZh: '喉咙痛、咽喉炎与咳嗽',
    summaryKh:
      'ពេលមានអាការៈឈឺក (រលាកបំពង់ក) ស្អកក ឬក្អកមានស្លេស្ម គួរជ្រើសរើសអាហារទន់ៗ ក្តៅឧណ្ហៗ មិនហឹរ មិនជូរខ្លាំង និងមិនបំពងខ្លាញ់។ ការខ្ពុរមាត់នឹងទឹកអំបិលក្តៅឧណ្ហៗ និងផឹកទឹកខ្ញី-ក្រូចឆ្មា-ទឹកឃ្មុំក្តៅឧណ្ហៗ ជួយបន្ថយការរលាកបំពង់ក និងរំលាយស្លេស្មយ៉ាងមានប្រសិទ្ធភាព។',
    summaryEn:
      'For a sore throat, pharyngitis, or cough, choose soft, warm, non-irritating Cambodian soups and porridges while avoiding crunchy, deep-fried, or spicy foods. Warm saltwater gargles and warm ginger-honey-lime drinks soothe mucosal inflammation and loosen phlegm.',
    summaryZh:
      '出现喉咙痛（咽喉炎）、声音嘶哑或咳嗽有痰时，应选择温热、软烂、不辣不油腻的汤粥类食物。使用温淡盐水漱口并饮用温姜汁蜂蜜柠檬水，可有效减轻咽部粘膜充血并帮助化痰。',
    bulletPointsKh: [
      '🧂 ខ្ពុរមាត់នឹងទឹកអំបិលក្តៅឧណ្ហៗ (អំបិលកន្លះស្លាបព្រាកាហ្វេក្នុងទឹកក្តៅឧណ្ហៗ ១ កែវ) ៣-៤ ដងក្នុងមួយថ្ងៃ ដើម្បីកាត់បន្ថយការហើម និងសម្លាប់មេរោគក្នុងបំពង់ក។',
      '🍯 ទឹកក្តៅឧណ្ហៗលាយខ្ញីស្រស់ ក្រូចឆ្មាតិចៗ និងទឹកឃ្មុំសុទ្ធ ជួយផ្សើមបំពង់ក និងបន្ថយការក្អកស្ងួត (ហាមផ្តល់ទឹកឃ្មុំដល់ទារកអាយុក្រោម ១ ឆ្នាំ)។',
      '🥣 អាហារទន់ស្រួលលេប៖ បបរត្រី បបរមាន់ ស្ងោរត្រឡាច សម្លប្រហើរ និងត្រីចំហុយខ្ញី មិនធ្វើឱ្យកកិតបំពង់ក។',
      '🚫 តមទឹកកក អាហារបំពងស្រួយរឹង ម្ទេសហឹរ គ្រឿងស្រវឹង និងផ្សែងបារី។',
    ],
    bulletPointsEn: [
      '🧂 Gargle with warm salt water (1/2 tsp salt in 1 glass of warm water) 3–4 times daily to reduce throat swelling.',
      '🍯 Sip warm ginger water with honey and a squeeze of lime to coat the throat and calm cough reflexes (no honey for infants under 1 year).',
      '🥣 Soft Swallowing Foods: Fish or chicken porridge, winter melon soup, and steamed fish with ginger.',
      '🚫 Avoid ice water, crispy deep-fried foods, chili peppers, alcohol, and smoke exposure.',
    ],
    bulletPointsZh: [
      '🧂 每日 3–4 次用温淡盐水（一杯温水加半茶匙盐）漱口，有助于消肿抑菌。',
      '🍯 饮用温热鲜姜蜂蜜柠檬水润喉止咳（注意：1 岁以下婴儿禁食蜂蜜）。',
      '🥣 软烂易吞咽饮食：生鱼粥、鸡肉粥、冬瓜清汤、清蒸姜丝鱼，减少咽部摩擦。',
      '🚫 忌喝冰水、油炸硬脆食物、辛辣辣椒、酒精及烟雾刺激。',
    ],
    foodsToChooseKh: ['បបរសាច់មាន់ខ្ញីស្រស់', 'ស្ងោរត្រឡាចសាច់ជ្រូកចិញ្ច្រាំ', 'បបរត្រីរ៉ស់', 'សម្លប្រហើរស្លឹកម្រុំ', 'ត្រីចំហុយខ្ញី'],
    foodsToChooseEn: ['Ginger Chicken Porridge', 'Winter Melon Minced Pork Soup', 'Snakehead Fish Porridge', 'Soft Moringa Soup', 'Steamed Fish with Ginger'],
    foodsToChooseZh: ['鲜姜鸡肉粥', '冬瓜肉末清汤', '生鱼片粥', '辣木叶软菜汤', '姜丝清蒸鱼'],
    foodsToLimitKh: ['ទឹកកក និងភេសជ្ជៈត្រជាក់', 'មាន់បំពង ឬអាហារបំពងស្រួយរឹង', 'បុកល្ហុង ឬម្ហូបហឹរខ្លាំង', 'បង្អែមខ្ទិះដូងខាប់ផ្អែមខ្លាំងដែលបង្កើនស្លេស្ម'],
    foodsToLimitEn: ['Ice-cold beverages', 'Crispy fried chicken or hard snacks', 'Spicy chili dishes', 'Heavy sugary coconut desserts that thicken mucus'],
    foodsToLimitZh: ['冰水与冷饮', '炸鸡及硬脆油炸食品', '辛辣食物', '易生痰的高糖浓椰浆甜品'],
    drinksKh: 'ផឹកទឹកក្តៅឧណ្ហៗឱ្យបានញឹកញាប់ ទឹកខ្ញីលាយទឹកឃ្មុំក្តៅឧណ្ហៗ ឬទឹកស្លឹកគ្រៃក្តៅឧណ្ហៗ។ ជៀសវាងទឹកកក ទឹកក្រូចកំប៉ុង និងកាហ្វេទឹកកក។',
    drinksEn: 'Sip warm water throughout the day, warm ginger-honey tea, or warm chamomile/lemongrass infusion. Avoid iced drinks and carbonated sodas.',
    drinksZh: '全天小口频饮温开水、温姜蜜茶或香茅温茶。忌饮冰咖啡、碳酸饮料和冰水。',
    fruitsKh: 'គួរញ៉ាំផ្លែឈើទន់ៗ មិនជូរខ្លាំងពេក ដូចជា ចេកទុំ ល្ហុងទុំ ផ្លែសារី (Pear) ចំហុយក្តៅៗ ឬផ្លែប៉ោម។ ជៀសវាងម្នាស់ ឬស្វាយខ្ចីជូរខ្លាំងដែលកាត់បំពង់ក។',
    fruitsEn: 'Choose soft, non-acidic fruits like ripe papaya, bananas, apples, or warm steamed pear. Avoid overly sour green mango or pineapple.',
    fruitsZh: '宜吃熟木瓜、香蕉、苹果或温热炖梨等温和柔软的水果；避免酸菠萝、生芒果等刺激咽喉的水果。',
    morningMealKh: 'អាហារពេលព្រឹក៖ បបរសាច់មាន់ ឬបបរត្រីក្តៅឧណ្ហៗ ១ ចាន និងខ្ពុរមាត់នឹងទឹកអំបិលក្តៅឧណ្ហៗក្រោយញ៉ាំរួច។',
    morningMealEn: 'Breakfast: Warm chicken or fish rice porridge, followed by a warm saltwater gargle.',
    morningMealZh: '早餐：一碗温热的鸡肉粥或鱼片粥，餐后用温淡盐水漱口。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ ស្ងោរត្រឡាច ឬសម្លប្រហើរបន្លែទន់ៗជាមួយបាយទន់ និងផឹកទឹកក្តៅឧណ្ហៗមុនចូលគេង។',
    eveningMealEn: 'Dinner: Warm winter melon soup or soft vegetable soup with soft rice, plus warm water before bed.',
    eveningMealZh: '晚餐：冬瓜清汤或软烂蔬菜汤配软饭，睡前饮少许温水润喉。',
    medicationCareKh: 'ប្រសិនបើឈឺកធម្មតាអាចបៀមថ្នាំបន្ទន់បំពង់ក (Lozenges) ឬខ្ពុរទឹកអំបិល។ កុំប្រើថ្នាំផ្សះ (Antibiotics) ដោយខ្លួនឯង លើកលែងតែគ្រូពេទ្យពិនិត្យឃើញថាមានការរលាកបំពង់កដោយបាក់តេរី (ដូចជា Strep throat មានខ្ទុះសលើក្រពេញអាមីដាល់ និងក្ដៅខ្លួនខ្លាំង)។',
    medicationCareEn: 'Soothing lozenges and saltwater gargles help most viral sore throats. Antibiotics are only needed if a doctor confirms bacterial tonsillitis/strep throat.',
    medicationCareZh: '普通咽痛可使用润喉含片及温盐水漱口。切勿自行服用抗生素，除非医生确诊为细菌性扁桃体炎（如化脓伴高热）。',
    redFlagsKh: 'ត្រូវទៅមន្ទីរពេទ្យភ្លាមប្រសិនបើ៖ ពិបាកដកដង្ហើម លេបទឹកមាត់មិនរួច ហៀរទឹកមាត់ ហើមក ឬបំពង់កខ្លាំង ក្អកមានឈាម ក្ដៅខ្លួនលើស 39°C ឬក្អកលើសពី ២ សប្តាហ៍ (ត្រូវពិនិត្យសួត)។',
    redFlagsEn: 'Seek immediate medical care if you have difficulty breathing, inability to swallow saliva, neck swelling, coughing up blood, fever >39°C, or a cough lasting over 2 weeks.',
    redFlagsZh: '如出现呼吸困难、无法吞咽唾液、颈部明显肿胀、咳血、高烧超过 39°C 或咳嗽持续超过 2 周（需排查肺部疾病），请立即就医。',
    recoveryTimelineKh: 'អាការៈឈឺកធម្មតាភាគច្រើនធូរស្រាលក្នុង ៣ ទៅ ៥ ថ្ងៃ ប្រសិនបើតមទឹកកក និងអាហារបំពង។',
    recoveryTimelineEn: 'Most viral sore throats improve within 3–5 days when avoiding cold drinks and fried foods.',
    recoveryTimelineZh: '大多数病毒性咽喉痛在忌口冷饮和油炸食物后 3–5 天内明显好转。',
    followUpSuggestionsKh: [
      'តើពេលឈឺក និងក្អក គួរផឹកទឹកអ្វីឱ្យស្រួលបំពង់ក?',
      'តើអាហារអ្វីខ្លះត្រូវតមដាច់ខាតពេលឈឺក?',
      'តើពេលណាឈឺកត្រូវប្រើថ្នាំផ្សះ ឬទៅជួបគ្រូពេទ្យ?',
      'តើពេលយប់គួរញ៉ាំអ្វីដើម្បីកុំឱ្យក្អកខ្លាំង?',
    ],
    followUpSuggestionsEn: [
      'What warm drinks soothe a sore throat and cough fastest?',
      'Which foods must I strictly avoid with a sore throat?',
      'When does a sore throat or cough require a doctor or antibiotics?',
      'What should I eat in the evening to reduce nighttime coughing?',
    ],
    followUpSuggestionsZh: [
      '喉咙痛和咳嗽喝什么最润喉？',
      '喉咙发炎时绝对不能吃什么食物？',
      '什么时候喉咙痛需要看医生或用抗生素？',
      '晚上吃什么可以减少夜间咳嗽？',
    ],
  },

  // 3. HEART PAIN, CHEST PAIN & CARDIOVASCULAR EMERGENCY (ឈឺបេះដូង / ឈឺទ្រូង) — Fixes Screenshot 2!
  {
    topicId: 'qa-heart-chest-pain',
    goalId: 'heart_bp',
    safetyLevel: 'emergency',
    keywords: [
      'ឈឺបេះដូង', 'ឈឺទ្រូង', 'តឹងទ្រូង', 'ណែនទ្រូង', 'គាំងបេះដូង', 'បេះដូងលោតញាប់',
      'ខ្សោយបេះដូង', 'ចុកទ្រូង', 'ស្ទះសរសៃឈាមបេះដូង',
      'heart pain', 'chest pain', 'chest tightness', 'heart attack', 'angina', 'palpitations', 'coronary',
      '心痛', '胸痛', '胸闷', '心脏痛', '心绞痛', '心悸', '心肌梗死', '心脏病',
    ],
    badgeKh: '🚨 សុវត្ថិភាពបន្ទាន់សម្រាប់អាការៈឈឺបេះដូង / ឈឺទ្រូង & ការថែទាំសរសៃឈាមបេះដូង',
    badgeEn: '🚨 Chest / Heart Pain Emergency Triage & Cardiac Nutrition Guide',
    badgeZh: '🚨 胸痛/心脏痛紧急安全筛查与心血管营养指南',
    topicNameKh: 'អាការៈឈឺបេះដូង / ឈឺទ្រូង និងសុខភាពបេះដូង',
    topicNameEn: 'Heart Pain / Chest Pain & Cardiovascular Care',
    topicNameZh: '胸痛/心脏不适与心血管健康',
    summaryKh:
      '⚠️ សំខាន់បំផុត៖ ប្រសិនបើអ្នកកំពុងមានអាការៈឈឺទ្រូង តឹងណែនទ្រូង ចុករាលដាលទៅស្មាឆ្វេង ដៃឆ្វេង ថ្គាម ឬខ្នង រួមជាមួយពិបាកដកដង្ហើម បែកញើសត្រជាក់ ឬវិលមុខ នេះអាចជាសញ្ញាគាំងបេះដូងបន្ទាន់ (Acute Coronary Syndrome) — សូមទូរស័ព្ទទៅលេខ 119 ឬទៅមន្ទីរពេទ្យភ្លាមៗ! សម្រាប់ការថែទាំបេះដូងប្រចាំថ្ងៃតាមវេជ្ជបញ្ជា គួរអនុវត្តរបបអាហារប្រៃតិច ខ្លាញ់ទាប (DASH / Mediterranean-Khmer Diet)។',
    summaryEn:
      '⚠️ CRITICAL SAFETY FIRST: If you are currently experiencing chest pain, pressure, tightness radiating to the left arm, shoulder, neck, or jaw, shortness of breath, cold sweats, or dizziness, call Emergency 119 or go to the nearest Hospital ER immediately! For ongoing doctor-supervised heart care, follow a low-sodium, low-saturated-fat Cambodian cardiac diet.',
    summaryZh:
      '⚠️ 紧急安全提示：如果您当前出现胸痛、胸口压榨感、疼痛放射至左肩/左臂/下颌、呼吸困难、冷汗或头晕，可能为急性冠脉综合征（心绞痛/心梗）——请立即拨打 119 或前往最近医院急诊科！在医生指导下的日常护心调理中，应遵循低盐、低饱和脂肪的饮食原则。',
    bulletPointsKh: [
      '🚨 សង្គ្រោះបន្ទាន់៖ អាការៈឈឺបេះដូង/ឈឺទ្រូងភ្លាមៗ មិនអាចព្យាបាលដោយអាហារ ឬឱសថបុរាណបានទេ ត្រូវធ្វើការវាស់ចរន្តបេះដូង (ECG) និងពិនិត្យឈាមនៅមន្ទីរពេទ្យ។',
      '🧂 កាត់បន្ថយជាតិប្រៃ (សូដ្យូម < 1,500 mg/ថ្ងៃ)៖ ជៀសវាងប្រហុក ផ្អក ត្រីងៀត សាច់ក្រក និងទឹកត្រីច្រើន ដែលធ្វើឱ្យឡើងសម្ពាធឈាម និងបង្កើនបន្ទុកបេះដូង។',
      '🐟 បង្កើនខ្លាញ់ល្អ Omega-3 និងជាតិសរសៃ៖ ញ៉ាំត្រីទឹកសាបចំហុយ/ស្ងោរ ស្លឹកម្រុំ បន្លែបៃតង និងបាយសម្រូប ជួយបញ្ចុះខ្លាញ់អាក្រក់ (LDL)។',
      '🚫 តមដាច់ខាត៖ ខ្លាញ់សត្វ សាច់ជ្រូកបីជាន់ អាហារបំពង បារី គ្រឿងស្រវឹង និងភេសជ្ជៈប៉ូវកម្លាំង (Energy drinks) ដែលធ្វើឱ្យបេះដូងលោតញាប់។',
    ],
    bulletPointsEn: [
      '🚨 Emergency Rule: Acute chest or heart pain requires immediate ECG and clinical evaluation at a hospital—never delay care.',
      '🧂 Strict Low Sodium (<1,500 mg/day): Avoid salted dried fish, heavy prahok, sausages, and excess fish sauce to reduce cardiac workload.',
      '🐟 Omega-3 & Soluble Fiber: Choose steamed freshwater fish, moringa, leafy greens, and brown rice to support healthy LDL cholesterol.',
      '🚫 Strictly Avoid: Deep-fried foods, fatty pork belly, tobacco, alcohol, and caffeinated energy drinks that trigger palpitations.',
    ],
    bulletPointsZh: [
      '🚨 急救原则：急性胸痛或心脏不适必须立即前往医院做心电图（ECG）等检查，切勿延误。',
      '🧂 严格控盐（每日钠 <1,500 mg）：避免咸鱼、大量发酵鱼酱、香肠及过量鱼露，减轻心脏负荷。',
      '🐟 补充 Omega-3 与膳食纤维：多吃清蒸淡水鱼、辣木叶、绿叶蔬菜和糙米，帮助降低坏胆固醇（LDL）。',
      '🚫 绝对禁忌：肥肉、油炸食品、烟草、酒精以及会诱发心悸的功能性提神饮料。',
    ],
    foodsToChooseKh: ['ត្រីចំហុយខ្ញី (ប្រៃតិច)', 'សម្លប្រហើរស្លឹកម្រុំ (មិនដាក់ប្រហុកច្រើន)', 'អាម៉ុកត្រីចំហុយ', 'ស្ងោរត្រឡាចត្រី', 'បាយសម្រូប និងផ្លែបឺរ/ផ្លែប៉ោម'],
    foodsToChooseEn: ['Low-Sodium Steamed Fish with Ginger', 'Mild Moringa Soup', 'Steamed Fish Amok', 'Winter Melon Fish Soup', 'Brown Rice & Fresh Fruits'],
    foodsToChooseZh: ['低盐姜丝清蒸鱼', '清淡辣木叶汤', '清蒸阿莫克鱼', '冬瓜鱼片汤', '糙米与新鲜蔬果'],
    foodsToLimitKh: ['ភេសជ្ជៈប៉ូវកម្លាំង និងកាហ្វេចាស់ៗ', 'ត្រីងៀត ប្រហុក ផ្អក ម៉ាំ', 'សាច់ជ្រូកបីជាន់ ផាក់ឡូវ និងអាហារបំពង', 'គ្រឿងស្រវឹង និងបារី'],
    foodsToLimitEn: ['Energy drinks & strong coffee', 'Salted dried fish & heavy fermented pastes', 'Pork belly, offal & deep-fried foods', 'Alcohol & tobacco'],
    foodsToLimitZh: ['功能性提神饮料与浓咖啡', '咸鱼与高盐腌制品', '五花肉、卤内脏与油炸食品', '酒精与烟草'],
    drinksKh: 'ផឹកទឹកស្អាតធម្មតា ក្នុងបរិមាណសមស្របតាមវេជ្ជបញ្ជា (១.៥-២ លីត្រ/ថ្ងៃ)។ ហាមផឹកភេសជ្ជៈប៉ូវកម្លាំង កាហ្វេចាស់ និងគ្រឿងស្រវឹងដាច់ខាត។',
    drinksEn: 'Drink plain water in physician-recommended amounts (1.5–2L/day). Strictly avoid energy drinks, strong coffee, and alcohol.',
    drinksZh: '按医嘱适量饮用白开水（每日 1.5–2 升）。严禁饮用功能性饮料、浓咖啡及酒精。',
    fruitsKh: 'ផ្លែឈើល្អសម្រាប់សរសៃឈាមបេះដូង៖ ផ្លែប៉ោម ផ្លែបឺរ (Avocado) ល្ហុងទុំ ត្របែក និងក្រូច (សម្បូរជាតិសរសៃ និងសារធាតុប្រឆាំងអុកស៊ីតកម្ម)។',
    fruitsEn: 'Heart-friendly fruits: Apples, ripe papaya, guava, berries, and moderate bananas for potassium and soluble fiber.',
    fruitsZh: '有益心血管的水果：苹果、熟木瓜、番石榴、牛油果及适量香蕉（补充钾与可溶性纤维）。',
    morningMealKh: 'អាហារពេលព្រឹក៖ បបរត្រីរ៉ស់ប្រៃតិច ឬបបរស្រូវសាលី (Oatmeal) ជាមួយផ្លែឈើស្រស់។',
    morningMealEn: 'Breakfast: Low-sodium fish rice porridge or oatmeal with fresh fruit.',
    morningMealZh: '早餐：低盐生鱼片粥或燕麦粥配新鲜水果。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ ត្រីចំហុយខ្ញី និងស្ងោរត្រឡាច ជាមួយបាយសម្រូបកន្លះចាន មុនម៉ោង ៦:៣០ ល្ងាច (កុំញ៉ាំឆ្អែតពេកពេលយប់)។',
    eveningMealEn: 'Dinner: Light steamed fish with ginger and winter melon soup with half a bowl of brown rice before 6:30 PM.',
    eveningMealZh: '晚餐：晚 6:30 前食用清蒸姜丝鱼配冬瓜汤及半碗糙米（晚餐切忌过饱）。',
    medicationCareKh: 'ប្រសិនបើអ្នកកំពុងប្រើថ្នាំបេះដូង ថ្នាំលើសឈាម ថ្នាំបញ្ចុះខ្លាញ់ (Statins) ឬថ្នាំរំលាយកំណកឈាម (Aspirin / Clopidogrel / Warfarin) ត្រូវលេបឱ្យទៀងម៉ោងជារៀងរាល់ថ្ងៃ ហាមឈប់លេបថ្នាំដោយខ្លួនឯង និងជៀសវាងក្រូចថ្លុង (Grapefruit) ដែលអាចមានប្រតិកម្មជាមួយថ្នាំបញ្ចុះខ្លាញ់។',
    medicationCareEn: 'Take prescribed cardiac, blood pressure, statin, or blood-thinning medications strictly on schedule. Never stop cardiac medicines abruptly, and avoid grapefruit interactions with statins.',
    medicationCareZh: '若正在服用心脏病药、降压药、他汀类降脂药或抗血小板/抗凝药（阿司匹林、氯吡格雷、华法林），请每日按时服用，严禁擅自停药，并注意西柚类水果与他汀类药物的相互作用。',
    redFlagsKh: 'សញ្ញាអាសន្នត្រូវហៅ 119 ភ្លាម៖ ឈឺឬណែនទ្រូងលើសពី ៥ នាទី ចុករាលទៅដៃឆ្វេង/ថ្គាម/ខ្នង ដង្ហក់ពិបាកដកដង្ហើម បែកញើសត្រជាក់ វិលមុខ ឬសន្លប់។',
    redFlagsEn: 'EMERGENCY 119 RED FLAGS: Chest pressure/pain lasting >5 minutes, pain radiating to left arm/jaw/back, shortness of breath, cold sweats, fainting.',
    redFlagsZh: '需立即拨打 119 的急诊红旗信号：胸痛或压迫感持续超过 5 分钟、放射至左臂/下颌/后背、呼吸急促、冒冷汗、头晕或晕厥。',
    recoveryTimelineKh: 'អាការៈឈឺទ្រូងត្រូវទទួលការពិនិត្យពីគ្រូពេទ្យឯកទេសបេះដូងជាមុនសិន។ ការថែទាំរបបអាហារបេះដូងគឺជាទម្លាប់ប្រចាំថ្ងៃពេញមួយជីវិត។',
    recoveryTimelineEn: 'Chest pain requires prompt cardiology evaluation first; heart-healthy nutrition is a lifelong daily commitment.',
    recoveryTimelineZh: '胸痛需首先由心内科医生明确诊断；护心健康饮食则是长期的日常管理习惯。',
    followUpSuggestionsKh: [
      'តើរោគសញ្ញាឈឺទ្រូងបែបណាដែលគ្រោះថ្នាក់ដល់អាយុជីវិត?',
      'តើអ្នកមានបញ្ហាបេះដូង គួរតមអាហារ និងភេសជ្ជៈអ្វីដាច់ខាត?',
      'បើកំពុងលេបថ្នាំបេះដូង ឬលើសឈាម តើគួរប្រុងប្រយ័ត្នអ្វីខ្លះ?',
      'តើពេលល្ងាចគួរញ៉ាំម្ហូបបែបណាដើម្បីល្អដល់បេះដូង?',
    ],
    followUpSuggestionsEn: [
      'Which chest pain symptoms are life-threatening emergencies?',
      'What foods and drinks must heart patients strictly avoid?',
      'What precautions apply when taking heart or blood pressure medications?',
      'What is a safe, heart-healthy dinner meal plan?',
    ],
    followUpSuggestionsZh: [
      '什么样的胸痛属于危及生命的急症？',
      '心脏不好的人绝对不能吃什么食物和饮料？',
      '服用心脏病或降压药时需要注意什么？',
      '晚餐吃什么最有利于保护心血管？',
    ],
  },

  // 4. ENTERITIS, INTESTINAL INFLAMMATION & DIARRHEA (រលាកពោះវៀន / រាក / ពុលអាហារ) — Fixes Screenshot 4!
  {
    topicId: 'qa-enteritis-diarrhea',
    goalId: 'light_digest',
    safetyLevel: 'urgent',
    keywords: [
      'រលាកពោះវៀន', 'រាក', 'រាករូស', 'ពុលអាហារ', 'ឈឺពោះ', 'កួរពោះ', 'មួល', 'ពោះវៀន',
      'enteritis', 'intestinal inflammation', 'diarrhea', 'food poisoning', 'gastroenteritis', 'colitis', 'stomach cramps',
      '肠炎', '腹泻', '拉肚子', '食物中毒', '肠道发炎', '肚子痛', '急性肠胃炎',
    ],
    badgeKh: '🥣 ការថែទាំជំងឺរលាកពោះវៀន រាករូស និងការបំពេញជាតិទឹក (Enteritis & Gut Recovery)',
    badgeEn: '🥣 Enteritis, Intestinal Inflammation & Rehydration Care Guide',
    badgeZh: '🥣 肠炎、腹泻与肠道修复营养指南',
    topicNameKh: 'ជំងឺរលាកពោះវៀន និងអាការៈរាករូស',
    topicNameEn: 'Enteritis & Acute Diarrhea',
    topicNameZh: '肠炎与急性腹泻',
    summaryKh:
      'ពេលមានជំងឺរលាកពោះវៀន ឈឺកួរពោះ ឬរាករូស កត្តាសំខាន់បំផុតទី១ គឺការបំពេញជាតិទឹក និងអេឡិចត្រូលីត (ទឹកអូរ៉ាលីត ORS ឬទឹកបបរសលាយអំបិលតិចៗ) ដើម្បីការពារការខ្សោះជាតិទឹក។ គួរញ៉ាំអាហារទន់ៗ ឆ្អិនថ្មីៗ គ្មានខ្លាញ់ និងគ្មានជាតិហឹរ ដើម្បីទុកពេលឱ្យភ្នាសពោះវៀនជាសះស្បើយ។',
    summaryEn:
      'For enteritis (intestinal inflammation), abdominal cramps, or diarrhea, priority #1 is replacing lost fluids and electrolytes with Oral Rehydration Salts (ORS) or lightly salted rice water. Eat warm, bland, low-fat, freshly cooked soft foods so the intestinal lining can heal.',
    summaryZh:
      '患肠炎、腹痛或腹泻时，首要任务是补充水分与电解质（饮用口服补液盐 ORS 或微盐米汤）以防脱水。饮食应选择温热、清淡、低脂、新近煮熟的软烂流质或半流质食物，让受损肠道粘膜得到休息与修复。',
    bulletPointsKh: [
      '💧 បំពេញជាតិទឹកជាបន្ទាន់៖ ផឹកទឹកអូរ៉ាលីត (ORS) មួយក្អឹកៗឱ្យបានញឹកញាប់ក្រោយពេលបន្ទោរបង់ម្តងៗ ឬផឹកទឹកបបរសក្តៅឧណ្ហៗ។',
      '🥣 អាហារជួយស្តារភ្នាសពោះវៀន៖ បបរសក្តៅៗ បបរត្រីរ៉ស់ ឬបបរសាច់មាន់ចិញ្ច្រាំ (មិនដាក់ខ្លាញ់ និងមិនដាក់ម្ទេស) ផ្លែចេកណាំវ៉ាទុំ និងផ្លែប៉ោមចំហុយ។',
      '🚫 តមដាច់ខាតពេលកំពុងរលាកពោះវៀន៖ ទឹកដោះគោ (ព្រោះពិបាករំលាយជាតិ Lactose ពេលរាក) អាហារឆៅ បន្លែឆៅ អាហារផ្អាប់ (ប្រហុក ផ្អក ជ្រក់) ម្ទេស អាហារបំពង និងកាហ្វេ។',
      '🧼 លាងដៃនឹងសាប៊ូមុនញ៉ាំអាហារ និងផឹកតែទឹកដាំពុះ ឬទឹកបរិសុទ្ធ។',
    ],
    bulletPointsEn: [
      '💧 Rehydrate First: Sip Oral Rehydration Solution (ORS) or warm rice water after every loose stool.',
      '🥣 Gut-Soothing Foods: Plain white rice porridge (Borbor Sar), lean fish or minced chicken porridge without oil/chili, ripe banana, and steamed apple.',
      '🚫 Strictly Avoid During Flare-ups: Dairy milk, raw vegetables, raw salads, fermented pastes/pickles, spicy chili, greasy fried foods, and coffee.',
      '🧼 Practice strict hand hygiene and consume only freshly boiled or sealed drinking water.',
    ],
    bulletPointsZh: [
      '💧 首要补液：每次排便后小口频饮口服补液盐（ORS）或温热米汤，预防脱水与电解质紊乱。',
      '🥣 修复肠道饮食：清淡白米粥、无油生鱼片粥或鸡肉末粥、熟透的香蕉及蒸苹果（富含果胶有助止泻）。',
      '🚫 急性期绝对禁忌：牛奶及乳制品（肠炎期易乳糖不耐受加重腹泻）、生冷蔬菜、腌制发酵食品、辣椒、油炸食品及咖啡。',
      '🧼 严格饭前便后洗手，只饮用煮沸水或合格瓶装水。',
    ],
    foodsToChooseKh: ['បបរសក្តៅឧណ្ហៗ', 'បបរត្រីរ៉ស់ (មិនដាក់ខ្លាញ់/ម្ទេស)', 'បបរសាច់មាន់ចិញ្ច្រាំ', 'ស្ងោរត្រឡាចទន់ៗ', 'ចេកណាំវ៉ាទុំ'],
    foodsToChooseEn: ['Warm Plain Rice Porridge (Borbor)', 'Oil-Free Snakehead Fish Porridge', 'Minced Chicken Porridge', 'Soft Winter Melon Clear Soup', 'Ripe Banana'],
    foodsToChooseZh: ['温热清白米粥', '无油生鱼片粥', '清淡鸡肉末粥', '软烂冬瓜清汤', '熟香蕉'],
    foodsToLimitKh: ['ទឹកដោះគោ និងតែទឹកដោះគោ', 'បុកល្ហុង ភ្លា និងអាហារឆៅគ្រប់ប្រភេទ', 'ប្រហុក ផ្អក ជ្រក់ និងអាហារផ្អាប់', 'អាហារបំពង ខ្លាញ់ច្រើន និងម្ទេសហឹរ', 'កាហ្វេ និងគ្រឿងស្រវឹង'],
    foodsToLimitEn: ['Milk & dairy drinks', 'Raw salads, Pleah & uncooked foods', 'Fermented pastes & sour pickles', 'Greasy fried foods & spicy chili', 'Coffee & alcohol'],
    foodsToLimitZh: ['牛奶与奶茶等乳制品', '凉拌生菜与一切生食', '腌菜与发酵鱼酱', '油炸油腻与辛辣食物', '咖啡与酒精'],
    drinksKh: 'ផឹកទឹកអូរ៉ាលីត (ORS) ទឹកបបរសក្តៅឧណ្ហៗ ទឹកដាំពុះក្តៅឧណ្ហៗ ឬទឹកខ្ញីស្រាលៗ។ ហាមផឹកទឹកដោះគោ កាហ្វេ ទឹកក្រូចកំប៉ុង និងទឹកកក។',
    drinksEn: 'Drink ORS (Oral Rehydration Salts), warm rice water, boiled warm water, or mild ginger tea. Avoid milk, coffee, soda, and ice.',
    drinksZh: '应饮用口服补液盐（ORS）、温米汤、温开水或淡姜水。禁饮牛奶、咖啡、碳酸饮料和冰水。',
    fruitsKh: 'ពេលកំពុងរលាកពោះវៀន គួរញ៉ាំតែផ្លែចេកណាំវ៉ាទុំ ឬផ្លែប៉ោមបកសំបក (មានជាតិ Pectin ជួយឱ្យលាមករឹងមកវិញ)។ ជៀសវាងផ្លែឈើជូរ ឬមានជាតិសរសៃរឹងដូចជា ស្វាយ ម្នាស់ ត្របែក។',
    fruitsEn: 'Stick to ripe bananas and peeled/steamed apples (rich in pectin to firm stools). Avoid sour or fibrous fruits like green mango, pineapple, or guava skin until recovered.',
    fruitsZh: '急性肠炎期仅建议吃熟香蕉或去皮蒸苹果（富含果胶可收敛止泻）；暂忌菠萝、生芒果等酸涩或粗纤维水果。',
    morningMealKh: 'អាហារពេលព្រឹក៖ បបរសក្តៅឧណ្ហៗ ឬបបរត្រីរ៉ស់សាបល្មម ១ កូនចានតូច ជាមួយទឹកអូរ៉ាលីត (ORS)។',
    morningMealEn: 'Breakfast: A small bowl of warm plain or fish rice porridge plus ORS hydration.',
    morningMealZh: '早餐：一小碗温热白米粥或清淡鱼片粥，配合口服补液盐（ORS）。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ បបរសាច់មាន់ចិញ្ច្រាំក្តៅឧណ្ហៗ (មិនដាក់ខ្លាញ់) ក្នុងបរិមាណតិចល្មម ដើម្បីកុំឱ្យពោះវៀនធ្វើការធ្ងន់ពេលយប់។',
    eveningMealEn: 'Dinner: A small portion of warm, oil-free minced chicken porridge so the gut rests overnight.',
    eveningMealZh: '晚餐：少量温热无油鸡肉末粥，减轻夜间肠道负担。',
    medicationCareKh: 'សំខាន់បំផុតគឺទឹកអូរ៉ាលីត (ORS) និងគ្រាប់ថ្នាំស័ង្កសី (Zinc)។ ហាមលេបថ្នាំបំបាត់រាកភ្លាមៗ (ដូចជា Loperamide) ប្រសិនបើមានក្ដៅខ្លួនខ្លាំង ឬលាមកមានឈាម/សំបោរ ព្រោះវាអាចឃាំងមេរោគក្នុងពោះវៀន! ការប្រើថ្នាំផ្សះត្រូវមានវេជ្ជបញ្ជាពីគ្រូពេទ្យ។',
    medicationCareEn: 'ORS and Zinc are foundational. Avoid anti-motility drugs (like Loperamide) if you have high fever or bloody/mucoid stools, as they can trap bacterial toxins. Take antibiotics only if prescribed by a physician.',
    medicationCareZh: '核心治疗是口服补液盐（ORS）与补锌。若伴有高烧或脓血便，切勿自行服用强效止泻药（如洛哌丁胺），以免毒素滞留肠道！使用抗生素须遵医嘱。',
    redFlagsKh: 'ត្រូវទៅមន្ទីរពេទ្យភ្លាមប្រសិនបើ៖ រាកលើសពី ៦ ដង/ថ្ងៃ លាមកមានឈាម ឬពណ៌ខ្មៅ ក្ដៅខ្លួនខ្លាំងលើស 38.5°C ក្អួតមិនឈប់ផឹកទឹកមិនចូល ឈឺពោះខ្លាំងមួយកន្លែង ឬមានសញ្ញាខ្សោះជាតិទឹក (មាត់ស្ងួត នោមតិច វិលមុខ សន្លឹម)។',
    redFlagsEn: 'Go to the hospital immediately if you have >6 loose stools/day, blood or black tarry stool, fever >38.5°C, persistent vomiting preventing oral fluids, localized severe abdominal pain, or dehydration signs (dry mouth, dark/low urine, dizziness).',
    redFlagsZh: '如出现以下情况请立即就医：每日腹泻超过 6 次、便血或黑便、高烧 >38.5°C、频繁呕吐无法进水、剧烈固定腹痛或明显脱水症状（口干、尿少、头晕乏力）。',
    recoveryTimelineKh: 'ជំងឺរលាកពោះវៀនស្រួចស្រាវភាគច្រើនធូរស្រាលក្នុង ២ ទៅ ៤ ថ្ងៃ។ ក្រោយបាត់រាក គួរបន្តញ៉ាំអាហារទន់ៗ និងជៀសវាងអាហារហឹរ/ខ្លាញ់រយៈពេល ៥ ថ្ងៃទៀត។',
    recoveryTimelineEn: 'Acute enteritis usually improves in 2–4 days; continue gentle, low-fat meals for 5 days after stools normalize.',
    recoveryTimelineZh: '急性肠炎通常在 2–4 天内好转；排便正常后仍建议继续清淡软食 5 天以巩固肠道粘膜。',
    followUpSuggestionsKh: [
      'តើពេលរលាកពោះវៀន គួរផឹកទឹកអ្វីដើម្បីកុំឱ្យខ្សោះជាតិទឹក?',
      'តើអាចញ៉ាំផ្លែឈើ ឬទឹកដោះគោបានទេពេលកំពុងរលាកពោះវៀន?',
      'តើពេលណាត្រូវប្រើថ្នាំពេទ្យ ឬទៅមន្ទីរពេទ្យបន្ទាន់?',
      'ក្រោយបាត់រាក តើគួរចាប់ផ្តើមញ៉ាំអាហារធម្មតាវិញដោយរបៀបណា?',
    ],
    followUpSuggestionsEn: [
      'What fluids and ORS should I drink for enteritis?',
      'Can I eat fruit or drink milk when I have enteritis?',
      'When should I take medicine or go to the hospital for enteritis?',
      'How should I transition back to normal food after recovery?',
    ],
    followUpSuggestionsZh: [
      '肠炎腹泻时应该怎么补水和喝口服补液盐？',
      '肠炎期间可以吃水果或喝牛奶吗？',
      '肠炎什么情况下必须吃药或去医院？',
      '腹泻好转后如何逐步恢复正常饮食？',
    ],
  },
  // 5. GASTRITIS, ACID REFLUX (GERD) & STOMACH ULCER (ឈឺក្រពះ / ច្រាលទឹកអាស៊ីត / ដំបៅក្រពះ)
  {
    topicId: 'qa-gastritis-reflux',
    goalId: 'light_digest',
    safetyLevel: 'standard',
    keywords: [
      'ឈឺក្រពះ', 'រលាកក្រពះ', 'ច្រាលទឹកអាស៊ីត', 'ឆ្អល់ពោះ', 'ដំបៅក្រពះ', 'ភើជូរ', 'ក្រពះ', 'ក្រហាយទ្រូង',
      'gastritis', 'acid reflux', 'gerd', 'stomach ulcer', 'heartburn', 'stomach pain', 'indigestion',
      '胃炎', '胃痛', '胃酸倒流', '反流性食管炎', '胃溃疡', '烧心', '胃胀',
    ],
    badgeKh: '🥣 ការថែទាំជំងឺរលាកក្រពះ ច្រាលទឹកអាស៊ីត & ដំបៅក្រពះ',
    badgeEn: '🥣 Gastritis, Acid Reflux (GERD) & Ulcer Nutrition Guide',
    badgeZh: '🥣 胃炎、胃酸倒流与胃溃疡饮食指南',
    topicNameKh: 'ជំងឺរលាកក្រពះ និងច្រាលទឹកអាស៊ីត',
    topicNameEn: 'Gastritis & Acid Reflux (GERD)',
    topicNameZh: '胃炎与胃酸倒流',
    summaryKh:
      'អ្នកមានបញ្ហារលាកក្រពះ ដំបៅក្រពះ ឬច្រាលទឹកអាស៊ីត (GERD) គួរញ៉ាំអាហារឱ្យទៀងម៉ោង ចម្អិនទន់ក្តៅឧណ្ហៗ មិនហឹរ មិនជូរខ្លាំង និងមិនខ្លាញ់ច្រើន (ដូចជា បបរត្រី បបរមាន់ ស្ងោរត្រឡាច សម្លប្រហើរ និងត្រីចំហុយខ្ញី) ព្រមទាំងកុំទម្រេតខ្លួនគេងភ្លាមៗក្រោយញ៉ាំអាហាររួច។',
    summaryEn:
      'For gastritis, peptic ulcer, or acid reflux (GERD), eat regular, moderate meals featuring warm, soft-cooked, non-spicy Cambodian dishes (fish porridge, winter melon soup, steamed fish with ginger) and remain upright for at least 2–3 hours after dinner.',
    summaryZh:
      '患有胃炎、胃溃疡或胃酸倒流（GERD）者应定时定量进餐，选择温热、软烂、不辣不酸的柬式菜肴（如生鱼粥、鸡肉粥、冬瓜汤、姜丝蒸鱼），且晚餐后 2–3 小时内切勿立即平躺。',
    bulletPointsKh: [
      '⏰ ញ៉ាំអាហារឱ្យទៀងម៉ោង ៤-៥ ដងក្នុងបរិមាណល្មម កុំទុកឱ្យពោះទទេរយូរ ឬញ៉ាំឆ្អែតហួសប្រមាណ។',
      '🫚 ខ្ញីស្រស់ និងរមៀត៖ ជួយការពារភ្នាសក្រពះ បន្ថយការរលាក និងកាត់បន្ថយខ្យល់ក្នុងក្រពះ។',
      '🛏️ ញ៉ាំអាហារពេលល្ងាចមុនម៉ោង ៧ យប់ (យ៉ាងតិច ២.៥ ទៅ ៣ ម៉ោងមុនចូលគេង) និងកល់ខ្នើយខ្ពស់បន្តិចពេលគេងប្រសិនបើមានច្រាលអាស៊ីត។',
      '🚫 តមម្ទេសហឹរ ម្ជូរខ្លាំងពេលពោះទទេរ កាហ្វេខ្មៅ គ្រឿងស្រវឹង ទឹកក្រូចកំប៉ុង និងថ្នាំបំបាត់ការឈឺចាប់ក្រុម NSAIDs (Ibuprofen/Aspirin) ពេលពោះទទេរ។',
    ],
    bulletPointsEn: [
      '⏰ Eat smaller, regular meals on time—never starve the stomach or overeat late at night.',
      '🫚 Fresh ginger and turmeric gently soothe the gastric mucosa and reduce bloating.',
      '🛏️ Finish dinner 2.5–3 hours before bedtime and elevate the head of your bed if reflux occurs at night.',
      '🚫 Avoid chili, sour foods on an empty stomach, black coffee, alcohol, carbonated sodas, and NSAID painkillers on an empty stomach.',
    ],
    bulletPointsZh: [
      '⏰ 少食多餐、定时定量，避免长时间空腹或暴饮暴食。',
      '🫚 鲜姜与姜黄有助于温和保护胃粘膜并减少胃胀气。',
      '🛏️ 睡前 2.5–3 小时内不再进食，夜间反酸者可适当垫高枕头。',
      '🚫 忌食重辣、空腹吃酸、黑咖啡、酒精、碳酸饮料，避免空腹服用非甾体抗炎止痛药（如布洛芬/阿司匹林）。',
    ],
    foodsToChooseKh: ['បបរត្រីរ៉ស់ខ្ញីស្រស់', 'បបរសាច់មាន់', 'ស្ងោរត្រឡាចសាច់ជ្រូកចិញ្ច្រាំ', 'សម្លប្រហើរស្លឹកម្រុំ', 'ត្រីចំហុយខ្ញី', 'ចេកណាំវ៉ាទុំ & ល្ហុងទុំ'],
    foodsToChooseEn: ['Ginger Snakehead Fish Porridge', 'Chicken Rice Porridge', 'Winter Melon Soup', 'Mild Moringa Soup', 'Steamed Fish with Ginger', 'Ripe Banana & Papaya'],
    foodsToChooseZh: ['鲜姜生鱼片粥', '鸡肉粥', '冬瓜肉末清汤', '温和辣木叶汤', '姜丝清蒸鱼', '熟香蕉与熟木瓜'],
    foodsToLimitKh: ['បុកល្ហុង និងម្ហូបហឹរខ្លាំង', 'សម្លម្ជូរ ឬផ្លែឈើជូរពេលពោះទទេរ', 'កាហ្វេខ្មៅ ទឹកក្រូចកំប៉ុង និងគ្រឿងស្រវឹង', 'អាហារបំពងខ្លាញ់ច្រើន និងមីកញ្ចប់'],
    foodsToLimitEn: ['Spicy papaya salad & chili dishes', 'Sour soups or acidic fruits on an empty stomach', 'Black coffee, soda & alcohol', 'Greasy fried foods & instant noodles'],
    foodsToLimitZh: ['重辣木瓜沙拉与辣椒', '空腹食用酸汤或酸果', '黑咖啡、碳酸饮料与酒精', '油炸食品与方便面'],
    drinksKh: 'ផឹកទឹកក្តៅឧណ្ហៗ ទឹកខ្ញីស្រាលៗ ឬទឹកដូងធម្មជាតិក្រោយអាហារ។ ជៀសវាងការផឹកកាហ្វេពេលពោះទទេរ ទឹកក្រូចកំប៉ុង និងគ្រឿងស្រវឹង។',
    drinksEn: 'Drink warm water or mild ginger infusion between meals. Avoid black coffee on an empty stomach, sodas, and alcohol.',
    drinksZh: '宜饮用温开水或淡姜水。严禁空腹喝黑咖啡、碳酸饮料和酒类。',
    fruitsKh: 'ផ្លែឈើល្អបំផុតសម្រាប់អ្នកឈឺក្រពះ៖ ចេកណាំវ៉ាទុំ ល្ហុងទុំ ផ្លែប៉ោម និងផ្លែបឺរ។ ជៀសវាងស្វាយខ្ចី ម្នាស់ ក្រូចឆ្មា ឬម្កាក់ពេលពោះទទេរ។',
    fruitsEn: 'Stomach-safe fruits: Ripe bananas, ripe papaya, sweet apples, and avocado. Avoid sour mango, pineapple, or citrus on an empty stomach.',
    fruitsZh: '养胃水果：熟香蕉、熟木瓜、苹果和牛油果；忌空腹吃生芒果、菠萝和酸柑橘。',
    morningMealKh: 'អាហារពេលព្រឹក (មុនម៉ោង ៨ ព្រឹក)៖ បបរត្រី ឬបបរមាន់ក្តៅឧណ្ហៗ ១ ចាន (ហាមផឹកកាហ្វេមុនញ៉ាំបាយ)។',
    morningMealEn: 'Breakfast (before 8 AM): Warm fish or chicken porridge—never drink coffee on an empty stomach.',
    morningMealZh: '早餐（早 8 点前）：温热鱼片粥或鸡肉粥，切勿空腹喝咖啡。',
    eveningMealKh: 'អាហារពេលល្ងាច (មុនម៉ោង ៦:៣០ ល្ងាច)៖ ស្ងោរត្រឡាច ឬត្រីចំហុយខ្ញីជាមួយបាយទន់ៗ និងអង្គុយ ឬដើរតិចៗ ២-៣ ម៉ោងមុនចូលគេង។',
    eveningMealEn: 'Dinner (before 6:30 PM): Winter melon soup or steamed fish with soft rice; stay upright for 2–3 hours before sleeping.',
    eveningMealZh: '晚餐（晚 6:30 前）：冬瓜汤或清蒸鱼配软米饭，餐后保持直立或慢走，睡前 2–3 小时不进食。',
    medicationCareKh: 'ថ្នាំបន្ថយអាស៊ីតក្រពះ (PPIs ដូចជា Omeprazole/Esomeprazole) គួរលេបមុនអាហារពេលព្រឹក ៣០ នាទីតាមវេជ្ជបញ្ជា។ ហាមប្រើថ្នាំបំបាត់ការឈឺចាប់សន្លាក់/ឈឺក្បាលប្រភេទ NSAIDs (Ibuprofen, Diclofenac, Aspirin) ដោយគ្មានវេជ្ជបញ្ជា ព្រោះវាធ្វើឱ្យដំបៅ និងហូរឈាមក្រពះ! គួរពិនិត្យមេរោគក្រពះ H. pylori ជាមួយគ្រូពេទ្យ។',
    medicationCareEn: 'Proton pump inhibitors (like Omeprazole) are typically taken 30 minutes before breakfast as prescribed. Avoid NSAID painkillers (Ibuprofen, Diclofenac, Aspirin) which cause gastric ulcers and bleeding. Ask your doctor about H. pylori testing.',
    medicationCareZh: '抑酸药（如奥美拉唑）通常遵医嘱于早餐前 30 分钟服用。切忌自行服用布洛芬、双氯芬酸等非甾体止痛药（易引发胃溃疡出血），建议就医排查幽门螺杆菌（H. pylori）。',
    redFlagsKh: 'សញ្ញាគ្រោះថ្នាក់ត្រូវទៅមន្ទីរពេទ្យភ្លាម៖ ក្អួតមានឈាម ឬពណ៌កាហ្វេខ្មៅ លាមកពណ៌ខ្មៅដូចជ័រកៅស៊ូ ឈឺពោះខ្លាំងភ្លាមៗ ស្រកទម្ងន់លឿន ឬពិបាកលេបអាហារ។',
    redFlagsEn: 'URGENT RED FLAGS: Vomiting blood or coffee-ground material, black tarry stools, sudden severe abdominal pain, unexplained weight loss, or difficulty swallowing.',
    redFlagsZh: '急诊警示信号：呕血或咖啡色呕吐物、黑便（柏油样便）、突发剧烈腹痛、不明原因消瘦或吞咽困难。',
    recoveryTimelineKh: 'ការរលាកក្រពះស្រាលអាចធូរស្រាលក្នុង ១-២ សប្តាហ៍ តែដំបៅក្រពះ ឬមេរោគ H. pylori ត្រូវការការព្យាបាលតាមវេជ្ជបញ្ជា ៤-៨ សប្តាហ៍។',
    recoveryTimelineEn: 'Mild gastritis improves in 1–2 weeks of strict dietary care; ulcers or H. pylori require 4–8 weeks of prescribed medical therapy.',
    recoveryTimelineZh: '轻度胃炎在规律饮食下 1–2 周可缓解；胃溃疡或幽门螺杆菌感染需遵医嘱规范治疗 4–8 周。',
    followUpSuggestionsKh: [
      'តើអ្នកឈឺក្រពះ អាចញ៉ាំផ្លែឈើអ្វីបានខ្លះ?',
      'តើគួរញ៉ាំអាហារពេលព្រឹក និងពេលល្ងាចម៉ោងប៉ុន្មានដើម្បីកុំឱ្យច្រាលអាស៊ីត?',
      'តើថ្នាំបំបាត់ការឈឺចាប់ប្រភេទណាដែលប៉ះពាល់ដល់ក្រពះខ្លាំងបំផុត?',
      'តើសញ្ញាអ្វីខ្លះបង្ហាញថាមានការហូរឈាមក្នុងក្រពះ?',
    ],
    followUpSuggestionsEn: [
      'Which fruits are safe to eat when I have gastritis or acid reflux?',
      'What is the best meal timing for breakfast and dinner to stop reflux?',
      'Which painkiller medications are dangerous for the stomach?',
      'What are the warning signs of a bleeding stomach ulcer?',
    ],
    followUpSuggestionsZh: [
      '有胃炎或胃酸倒流可以吃什么水果？',
      '早晚餐什么时间吃最能预防夜间反酸？',
      '哪些止痛药对胃粘膜伤害最大？',
      '胃溃疡出血有哪些危险征兆？',
    ],
  },

  // 6. CONSTIPATION, BLOATING & GUT FIBER (ទល់លាមក / ហើមពោះ / ឫសដូងបាត)
  {
    topicId: 'qa-constipation-bloating',
    goalId: 'gut_fiber',
    safetyLevel: 'standard',
    keywords: [
      'ទល់លាមក', 'ហើមពោះ', 'ពិបាកបន្ទោរបង់', 'ឫសដូងបាត', 'ឆ្អល់ពោះខ្យល់',
      'constipation', 'bloating', 'gas', 'hemorrhoids', 'bowel movement', 'fiber',
      '便秘', '腹胀', '消化不良', '痔疮', '排便困难', '膳食纤维',
    ],
    badgeKh: '🥬 ការដោះស្រាយបញ្ហាទល់លាមក ហើមពោះ & សុខភាពពោះវៀន',
    badgeEn: '🥬 Constipation, Bloating & Gut Fiber Guide',
    badgeZh: '🥬 便秘、腹胀与肠道膳食纤维指南',
    topicNameKh: 'បញ្ហាទល់លាមក និងហើមពោះ',
    topicNameEn: 'Constipation & Bloating',
    topicNameZh: '便秘与腹胀',
    summaryKh:
      'ដើម្បីដោះស្រាយបញ្ហាទល់លាមក ហើមពោះ និងការពារជំងឺឫសដូងបាត ត្រូវបង្កើនជាតិសរសៃ (២៥-៣០g/ថ្ងៃ) ពីបន្លែខ្មែរ (ស្លឹកម្រុំ ល្ហុង ត្រកួន ល្ពៅ សម្លកកូរ) បាយសម្រូប និងផ្លែឈើទុំ រួមជាមួយការផឹកទឹកស្អាត ២.៥ លីត្រក្នុងមួយថ្ងៃ។',
    summaryEn:
      'To relieve constipation and bloating naturally, combine 25–30g of daily dietary fiber from Cambodian vegetable soups (Samlor Korko, moringa, papaya, pumpkin), brown rice, and ripe fruits with 2.5L of water and daily walking.',
    summaryZh:
      '缓解便秘、腹胀及预防痔疮的关键是每日摄入 25–30 克膳食纤维（如高棉养生杂菜汤、辣木叶、木瓜、南瓜、糙米和熟水果），配合每日 2.5 升饮水及适量步行。',
    bulletPointsKh: [
      '💧 ផឹកទឹកក្តៅឧណ្ហៗ ១-២ កែវភ្លាមពេលភ្ញាក់ពីគេងពេលព្រឹក ដើម្បីជួយជំរុញចលនាពោះវៀនធំ។',
      '🍲 ញ៉ាំសម្លកកូរ សម្លប្រហើរ ស្ងោរជ្រក់ និងបន្លែស្រស់ឱ្យបាន ៥០% នៃចានអាហាររៀងរាល់ពេល។',
      '🍈 ញ៉ាំផ្លែល្ហុងទុំ ចេកណាំវ៉ាទុំ ផ្លែស្រកានាគ ឬដំឡូងជ្វាស្ងោរ ដែលសម្បូរជាតិសរសៃរលាយក្នុងទឹក។',
      '🚶‍♂️ ធ្វើចលនាដើរ ២០-៣០ នាទីក្រោយអាហារ និងកុំទប់ការបន្ទោរបង់។',
    ],
    bulletPointsEn: [
      '💧 Drink 1–2 glasses of warm water upon waking in the morning to stimulate natural bowel motility.',
      '🍲 Fill 50% of your plate with cooked vegetable soups (Samlor Korko, Samlor Praher) and leafy greens.',
      '🍈 Eat ripe papaya, dragon fruit, ripe bananas, and boiled sweet potato for soluble fiber and natural enzymes.',
      '🚶‍♂️ Walk 20–30 minutes daily and never ignore the urge to use the restroom.',
    ],
    bulletPointsZh: [
      '💧 早晨起床后空腹饮用 1–2 杯温开水，温和刺激肠道蠕动。',
      '🍲 每餐保证 50% 为富含纤维的蔬菜汤（如高棉杂菜汤、辣木叶汤）与绿叶菜。',
      '🍈 多吃熟木瓜、火龙果、熟香蕉及蒸红薯，补充可溶性膳食纤维与消化酶。',
      '🚶‍♂️ 每天坚持步行 20–30 分钟，养成定时排便习惯。',
    ],
    foodsToChooseKh: ['សម្លកកូរត្រីស្លឹកម្រុំ', 'សម្លប្រហើរបន្លែចម្រុះ', 'ទឹកគ្រឿងបន្លែឆ្អិន', 'ល្ហុងទុំ & ស្រកានាគ', 'បាយសម្រូប & ដំឡូងជ្វា'],
    foodsToChooseEn: ['Samlor Korko with Moringa', 'Mixed Vegetable Samlor Praher', 'Tuk Kroeung with Steamed Vegetables', 'Ripe Papaya & Dragon Fruit', 'Brown Rice & Sweet Potato'],
    foodsToChooseZh: ['辣木叶高棉杂菜汤', '混合蔬菜清汤', '鱼酱配焯水蔬菜', '熟木瓜与火龙果', '糙米与红薯'],
    foodsToLimitKh: ['អាហារបំពងស្ងួតៗគ្មានបន្លែ', 'សាច់ក្រហមច្រើនពេកដោយមិនញ៉ាំបន្លែ', 'នំប៉័ងស និងអាហារកែច្នៃ', 'ការផឹកទឹកតិចពេក'],
    foodsToLimitEn: ['Dry fried foods without vegetables', 'Excessive red meat with low fiber', 'Refined white flour snacks', 'Inadequate water intake'],
    foodsToLimitZh: ['干硬油炸食品', '过量红肉且缺乏蔬菜', '精制白面点心', '饮水不足'],
    drinksKh: 'ផឹកទឹកស្អាត ២.៥ លីត្រ/ថ្ងៃ ជាពិសេសទឹកក្តៅឧណ្ហៗពេលព្រឹកព្រលឹម។',
    drinksEn: 'Drink 2.5L of water daily, starting with warm water first thing in the morning.',
    drinksZh: '每日饮水 2.5 升，尤其是晨起第一杯温开水。',
    fruitsKh: 'ល្ហុងទុំ ផ្លែស្រកានាគ ចេកណាំវ៉ាទុំ ផ្លែប៉ោមទាំងសំបក និងក្រូចពោធិ៍សាត់។',
    fruitsEn: 'Ripe papaya, dragon fruit, ripe bananas, unpeeled apples, and oranges.',
    fruitsZh: '熟木瓜、火龙果、熟香蕉、带皮苹果和橙子。',
    morningMealKh: 'អាហារពេលព្រឹក៖ ទឹកក្តៅឧណ្ហៗ ២ កែវ + បបរស្រូវសាលី ឬនំបញ្ចុកសម្លប្រហើរបន្លែច្រើន + ល្ហុងទុំ ១ ចានតូច។',
    morningMealEn: 'Breakfast: 2 glasses of warm water + Num Banh Chok with extra greens or oatmeal + ripe papaya.',
    morningMealZh: '早餐：2 杯温开水 + 多菜高棉米粉或燕麦粥 + 一小盘熟木瓜。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ សម្លកកូរ ឬសម្លប្រហើរបន្លែចម្រុះ ជាមួយបាយសម្រូបកន្លះចាន។',
    eveningMealEn: 'Dinner: Samlor Korko or vegetable soup with half a bowl of brown rice.',
    eveningMealZh: '晚餐：高棉杂菜汤或蔬菜清汤配半碗糙米饭。',
    medicationCareKh: 'ជៀសវាងការប្រើថ្នាំបន្ទន់លាមក ឬថ្នាំបញ្ចុះ (Stimulant laxatives) ជាប្រចាំដោយគ្មានវេជ្ជបញ្ជា ព្រោះវាធ្វើឱ្យពោះវៀនស៊ាំថ្នាំ។ ប្រសិនបើចាំបាច់ គួរពិគ្រោះជាមួយគ្រូពេទ្យអំពីជាតិសរសៃ Psyllium ឬ Lactulose។',
    medicationCareEn: 'Avoid habitual use of harsh stimulant laxatives without medical advice; ask a doctor about gentle bulk-forming fiber or osmotic options if needed.',
    medicationCareZh: '切勿长期自行滥用刺激性泻药（以免产生肠道依赖）；必要时请咨询医生使用温和的膳食纤维补充剂或乳果糖。',
    redFlagsKh: 'ត្រូវទៅជួបគ្រូពេទ្យប្រសិនបើ៖ ទល់លាមកឆ្លាស់គ្នានឹងរាករ៉ាំរ៉ៃ លាមកមានឈាម ស្រកទម្ងន់ដោយគ្មានមូលហេតុ ឬឈឺពោះខ្លាំងមិនអាចបញ្ចេញខ្យល់បាន។',
    redFlagsEn: 'See a doctor if you have blood in stool, alternating constipation and diarrhea, unexplained weight loss, or severe abdominal pain.',
    redFlagsZh: '若出现便血、便秘与腹泻交替出现、不明原因体重下降或剧烈腹痛停止排气，请及时就医检查。',
    recoveryTimelineKh: 'ការបង្កើនបន្លែ ផ្លែឈើល្ហុងទុំ និងទឹកស្អាត ២.៥ លីត្រ ជួយឱ្យការបន្ទោរបង់ប្រសើរឡើងក្នុង ២-៤ ថ្ងៃ។',
    recoveryTimelineEn: 'Increasing fiber, ripe papaya, and 2.5L of water typically restores bowel regularity within 2–4 days.',
    recoveryTimelineZh: '增加蔬菜、熟木瓜及每日 2.5 升饮水后，通常在 2–4 天内排便恢复顺畅。',
    followUpSuggestionsKh: [
      'តើផ្លែឈើអ្វីជួយបន្ទន់លាមកបានលឿនបំផុតតាមបែបធម្មជាតិ?',
      'តើអ្នកមានជំងឺឫសដូងបាត គួរតមអាហារអ្វីខ្លះ?',
      'ហេតុអ្វីញ៉ាំបន្លែហើយនៅតែទល់លាមក?',
      'សូមណែនាំមុខម្ហូបខ្មែរសម្បូរជាតិសរសៃសម្រាប់ ១ ថ្ងៃ',
    ],
    followUpSuggestionsEn: [
      'Which local fruits relieve constipation fastest naturally?',
      'What foods should I avoid if I also have hemorrhoids?',
      'Why am I still constipated even when eating vegetables?',
      'Recommend a 1-day high-fiber Cambodian meal plan',
    ],
    followUpSuggestionsZh: [
      '哪些本地水果天然通便效果最好？',
      '如果有痔疮应该忌口哪些食物？',
      '为什么吃了蔬菜还是会便秘？',
      '请推荐一份一日三餐高纤维柬式食谱',
    ],
  },

  // 7. DIABETES, BLOOD SUGAR & HYPOGLYCEMIA (ទឹកនោមផ្អែម / ជាតិស្ករ)
  {
    topicId: 'qa-diabetes-glycemic',
    goalId: 'blood_sugar',
    safetyLevel: 'high_risk_care',
    keywords: [
      'ទឹកនោមផ្អែម', 'លើសជាតិស្ករ', 'ជាតិស្ករ', 'ចុះជាតិស្ករ', 'អាំងស៊ុយលីន',
      'diabetes', 'diabetic', 'blood sugar', 'glucose', 'glycemic', 'hypoglycemia', 'insulin', 'hba1c',
      '糖尿病', '高血糖', '血糖', '控糖', '低血糖', '胰岛素',
    ],
    badgeKh: '🩸 ការគ្រប់គ្រងជាតិស្ករក្នុងឈាម & របបអាហារអ្នកជំងឺទឹកនោមផ្អែម',
    badgeEn: '🩸 Diabetes & Blood Glucose Clinical Nutrition Guide',
    badgeZh: '🩸 糖尿病与血糖控制临床营养指南',
    topicNameKh: 'ជំងឺទឹកនោមផ្អែម និងការគ្រប់គ្រងជាតិស្ករ',
    topicNameEn: 'Diabetes & Blood Sugar Management',
    topicNameZh: '糖尿病与血糖管理',
    summaryKh:
      'សម្រាប់អ្នកជំងឺទឹកនោមផ្អែម ឬអ្នកមានជាតិស្ករខ្ពស់ គោលការណ៍សំខាន់គឺអនុវត្តរូបមន្តចានអាហារ ២:១:១ (បន្លែបៃតង ៥០% + ត្រី/សាច់គ្មានខ្លាញ់ ២៥% + បាយសម្រូប ២៥%) ញ៉ាំបន្លែ និងសាច់មុនញ៉ាំបាយ និងជៀសវាងភេសជ្ជៈផ្អែម ដើម្បីរក្សាជាតិស្ករឱ្យនឹងល្អ។',
    summaryEn:
      'For diabetes and blood sugar control, follow the 2:1:1 Plate Method (50% non-starchy leafy greens, 25% lean fish/poultry, 25% brown/red rice), eat vegetables and protein before rice, and eliminate sugary drinks.',
    summaryZh:
      '糖尿病与高血糖人群应遵循 2:1:1 餐盘法则（50% 非淀粉类绿叶蔬菜 + 25% 瘦鱼/禽肉蛋白 + 25% 糙米/红米），进餐时先吃蔬菜和蛋白质最后吃米饭，并戒除含糖饮料。',
    bulletPointsKh: [
      '🍽️ រូបមន្តចាន ២:១:១ និងលំដាប់នៃការញ៉ាំ៖ ញ៉ាំបន្លែ និងសម្លមុន បន្ទាប់មកញ៉ាំត្រី/សាច់ ហើយញ៉ាំបាយសម្រូបក្រោយគេ (ជួយកាត់បន្ថយការឡើងជាតិស្ករក្រោយបាយបាន ២៥-៣០%)។',
      '🥒 បន្លែខ្មែរជួយគ្រប់គ្រងជាតិស្ករ៖ ស្លឹកម្រុំ ម្រះ ត្រកួន ស្ពៃបៃតង ត្រសក់ ត្រប់ និងផ្កាខាត់ណា។',
      '⚠️ ការពារអាការៈចុះជាតិស្ករខ្លាំង (Hypoglycemia < 70 mg/dL)៖ បើមានអាការៈញ័រដៃ បែកញើសត្រជាក់ វិលមុខ ឃ្លានខ្លាំង ត្រូវញ៉ាំស្ករគ្រាប់ ៣ គ្រាប់ ឬទឹកផ្អែម ១/២ កែវភ្លាម។',
      '🚫 តមភេសជ្ជៈប៉ូវកម្លាំង ទឹកក្រូច តែទឹកដោះគោខាប់ បង្អែមខ្ទិះដូង និងការញ៉ាំបាយសច្រើនពេក។',
    ],
    bulletPointsEn: [
      '🍽️ 2:1:1 Plate & Meal Order: Eat leafy vegetables and soup first, then fish/protein, and brown rice last to blunt post-meal glucose spikes by 25–30%.',
      '🥒 Best Khmer Vegetables: Moringa leaves, bitter melon (Mrah), water spinach, cucumber, and eggplant.',
      '⚠️ Hypoglycemia Safety (<70 mg/dL): If shaky, sweaty, or dizzy while on insulin/medication, take 15g fast carbs immediately.',
      '🚫 Avoid energy drinks, soda, condensed milk tea, sweet coconut desserts, and oversized white rice portions.',
    ],
    bulletPointsZh: [
      '🍽️ 2:1:1 餐盘与进餐顺序：先喝清汤吃蔬菜，再吃鱼肉蛋白，最后吃糙米饭（可降低餐后血糖峰值 25–30%）。',
      '🥒 优质控糖蔬菜：辣木叶、苦瓜、空心菜、黄瓜、茄子与绿叶菜。',
      '⚠️ 警惕低血糖（<70 mg/dL）：用药期间若出现手抖、冷汗、心慌头晕，应立即补充 15 克速效糖分。',
      '🚫 忌饮功能饮料、汽水、炼乳奶茶、高糖椰浆甜品及过量精白米饭。',
    ],
    foodsToChooseKh: ['សម្លកកូរត្រីស្លឹកម្រុំ', 'ស្ងោរម្រះសồiសាច់', 'ស្ងោរជ្រក់ត្រីរ៉ស់', 'ទឹកគ្រឿងបន្លែស្រស់', 'បាយសម្រូប'],
    foodsToChooseEn: ['Samlor Korko with Moringa', 'Stuffed Bitter Melon Soup', 'Clear Sour Fish Soup', 'Tuk Kroeung with Fresh Greens', 'Cambodian Brown Rice'],
    foodsToChooseZh: ['辣木叶高棉杂菜汤', '苦瓜酿肉清汤', '香茅清酸鱼汤', '鱼酱配新鲜绿叶菜', '柬埔寨糙米饭'],
    foodsToLimitKh: ['បង្អែមខ្ទិះដូង និងនំផ្អែម', 'ភេសជ្ជៈប៉ូវកម្លាំង ទឹកក្រូច និងតែគុជ', 'បាយសច្រើនលើសកម្រិត', 'ខសាច់ជ្រូកដាក់ស្ករច្រើន'],
    foodsToLimitEn: ['Sweet coconut desserts', 'Energy drinks, soda & boba tea', 'Large white rice portions', 'Heavily sweetened braised pork (Khor)'],
    foodsToLimitZh: ['高糖椰浆甜品', '功能饮料、汽水与珍珠奶茶', '大碗精白米饭', '重糖红烧肉'],
    drinksKh: 'ផឹកទឹកស្អាត តែបៃតងអត់ស្ករ ទឹកស្លឹកគ្រៃអត់ស្ករ ឬកាហ្វេខ្មៅអត់ស្ករ។ ហាមផឹកទឹកក្រូច ភេសជ្ជៈប៉ូវកម្លាំង និងទឹកផ្លែឈើកំប៉ុង។',
    drinksEn: 'Drink plain water, unsweetened green tea, or unsweetened lemongrass tea. Avoid sodas, energy drinks, and fruit juices.',
    drinksZh: '宜饮白开水、无糖绿茶或无糖香茅茶；严禁含糖汽水、功能饮料及浓缩果汁。',
    fruitsKh: 'ផ្លែឈើមានសន្ទស្សន៍ជាតិស្ករទាប (Low GI) ញ៉ាំក្នុងបរិមាណ ១ ក្តាប់ដៃក្រោយអាហារ៖ ត្របែក ផ្លែប៉ោម ផ្លែស្រកានាគសាច់ស ក្រូចថ្លុង និងផ្លែបឺរ។ កាត់បន្ថយធុរេន ស្វាយទុំផ្អែមខ្លាំង និងមៀន។',
    fruitsEn: 'Choose low-GI fruits in 1-fist portions: Guava, green apple, white dragon fruit, pomelo, and avocado. Limit durian, ripe sweet mango, and longan.',
    fruitsZh: '选择低升糖指数（Low GI）水果（每次一拳大小）：番石榴、苹果、白心火龙果、柚子和牛油果；少吃榴莲、熟芒果和龙眼。',
    morningMealKh: 'អាហារពេលព្រឹក៖ ស៊ុតស្ងោរ ១-២ គ្រាប់ + សម្លប្រហើរ ឬបបរត្រីដាក់បន្លែច្រើន (ឬនំបញ្ចុកសម្លប្រហើរបន្លែ ២ ដងនៃមុខម្ហូបធម្មតា)។',
    morningMealEn: 'Breakfast: 1–2 boiled eggs + vegetable-rich fish soup or Num Banh Chok with double leafy greens.',
    morningMealZh: '早餐：1–2 个水煮蛋 + 多菜鱼汤或双倍蔬菜的高棉草本米粉。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ ស្ងោរម្រះ ឬសម្លកកូរត្រី ជាមួយបាយសម្រូបកន្លះកូនចាន មុនម៉ោង ៧ យប់ និងដើរហាត់ប្រាណ ២០ នាទីក្រោយបាយ។',
    eveningMealEn: 'Dinner: Bitter melon soup or Samlor Korko with half a small bowl of brown rice before 7 PM, followed by a 20-minute walk.',
    eveningMealZh: '晚餐：晚 7 点前食用苦瓜汤或高棉杂菜汤配半小碗糙米，餐后散步 20 分钟帮助降糖。',
    medicationCareKh: 'ត្រូវលេបថ្នាំទឹកនោមផ្អែម (ដូចជា Metformin ក្រោយបាយ) ឬចាក់អាំងស៊ុយលីនតាមវេជ្ជបញ្ជាឱ្យទៀងទាត់។ ហាមចាក់អាំងស៊ុយលីនហើយអត់ញ៉ាំបាយ ព្រោះអាចធ្វើឱ្យចុះជាតិស្ករសន្លប់គ្រោះថ្នាក់ដល់ជីវិត!',
    medicationCareEn: 'Take prescribed diabetes medications (e.g., Metformin with meals) or insulin consistently. Never take insulin or sulfonylureas and skip a meal, as severe hypoglycemia can occur.',
    medicationCareZh: '请严格遵医嘱服用降糖药（如二甲双胍随餐服）或注射胰岛素。切忌注射胰岛素后不吃饭，以免引发危及生命的严重低血糖！',
    redFlagsKh: 'សញ្ញាអាសន្ន៖ ជាតិស្ករចុះទាបក្រោម 70 mg/dL (ញ័រដៃ បែកញើស វិលមុខ សន្លប់) ឬជាតិស្ករឡើងខ្ពស់លើស 300 mg/dL រួមជាមួយក្អួត ដង្ហើមធុំក្លិនផ្លែឈើ ដង្ហក់ ឬដំបៅជើងមិនជា។',
    redFlagsEn: 'EMERGENCY SIGNS: Blood sugar <70 mg/dL (shaking, sweating, confusion) or >300 mg/dL with nausea, fruity breath, rapid breathing, or infected foot ulcers.',
    redFlagsZh: '急诊警示：血糖低于 70 mg/dL（手抖、冷汗、意识模糊）或高于 300 mg/dL 伴恶心呕吐、呼吸深快、烂苹果味口气或足部感染溃疡。',
    recoveryTimelineKh: 'ការអនុវត្តចានអាហារ ២:១:១ និងដើរក្រោយបាយ ជួយបញ្ចុះជាតិស្ករក្រោយអាហារភ្លាមៗ និងបញ្ចុះកម្រិត HbA1c ក្នុងរយៈពេល ៣ ខែ។',
    recoveryTimelineEn: 'Consistent 2:1:1 meals and post-meal walking improve daily glucose immediately and lower HbA1c over 8–12 weeks.',
    recoveryTimelineZh: '坚持 2:1:1 饮食与餐后散步可立即改善餐后血糖，并在 8–12 周内显著降低糖化血红蛋白（HbA1c）。',
    followUpSuggestionsKh: [
      'តើអ្នកជំងឺទឹកនោមផ្អែម អាចញ៉ាំផ្លែឈើអ្វីបានខ្លះ?',
      'តើត្រូវធ្វើដូចម្តេចពេលមានអាការៈចុះជាតិស្ករភ្លាមៗ (ញ័រដៃ បែកញើស)?',
      'តើគួរញ៉ាំបាយសម្រូបប៉ុន្មានក្នុងមួយពេល?',
      'បើមានទាំងទឹកនោមផ្អែម និងលើសឈាម តើគួររៀបចំម្ហូបបែបណា?',
    ],
    followUpSuggestionsEn: [
      'Which fruits are safe for people with diabetes?',
      'What should I do immediately if my blood sugar drops too low?',
      'How much brown or white rice can I eat per meal?',
      'How do I plan meals if I have both diabetes and high blood pressure?',
    ],
    followUpSuggestionsZh: [
      '糖尿病患者可以吃哪些低糖水果？',
      '发生低血糖（手抖冒冷汗）时该如何紧急处理？',
      '每餐可以吃多少糙米或米饭？',
      '如果同时有糖尿病和高血压该如何安排饮食？',
    ],
  },

  // 8. HYPERTENSION / HIGH BLOOD PRESSURE (លើសឈាម / សម្ពាធឈាមខ្ពស់)
  {
    topicId: 'qa-hypertension-bp',
    goalId: 'heart_bp',
    safetyLevel: 'high_risk_care',
    keywords: [
      'លើសឈាម', 'សម្ពាធឈាម', 'ឈាមឡើង', 'ប្រៃ', 'សូដ្យូម',
      'hypertension', 'high blood pressure', 'blood pressure', 'low sodium', 'dash diet',
      '高血压', '降血压', '血压高', '控盐', '低钠',
    ],
    badgeKh: '❤️ ការគ្រប់គ្រងជំងឺលើសសម្ពាធឈាម (DASH Diet ខ្មែរប្រៃតិច)',
    badgeEn: '❤️ Hypertension & Blood Pressure Control Guide',
    badgeZh: '❤️ 高血压与低盐饮食控制指南 (DASH Diet)',
    topicNameKh: 'ជំងឺលើសសម្ពាធឈាម (លើសឈាម)',
    topicNameEn: 'Hypertension (High Blood Pressure)',
    topicNameZh: '高血压与血压管理',
    summaryKh:
      'សម្រាប់អ្នកមានជំងឺលើសសម្ពាធឈាម គោលការណ៍សំខាន់បំផុតគឺកំណត់ជាតិប្រៃ (សូដ្យូមតិចជាង ១,៥០០ - ២,០០០ mg/ថ្ងៃ ឬអំបិលតិចជាង ១ ស្លាបព្រាកាហ្វេ) និងបង្កើនប៉ូតាស្យូមធម្មជាតិពីបន្លែបៃតង ស្លឹកម្រុំ ត្រីទឹកសាប និងផ្លែឈើស្រស់។',
    summaryEn:
      'To control high blood pressure (hypertension), limit daily sodium to 1,500–2,000 mg while boosting potassium, magnesium, and fiber from Cambodian leafy greens, moringa, freshwater fish, and fresh fruits.',
    summaryZh:
      '控制高血压的核心是将每日钠摄入量限制在 1,500–2,000 毫克以内（食盐少于 5 克），同时多吃富含钾、镁和膳食纤维的绿叶蔬菜、辣木叶、淡水鱼和新鲜水果。',
    bulletPointsKh: [
      '🍋 ជំនួសទឹកត្រី អំបិល និងប្រហុក ដោយក្លិនក្រអូបពីគល់ស្លឹកគ្រៃ ស្លឹកក្រូចសើច រមៀត ខ្ញី និងក្រូចឆ្មាស្រស់។',
      '🥬 បង្កើនប៉ូតាស្យូមជួយបញ្ចេញជាតិប្រៃ៖ ស្លឹកម្រុំ ស្ពៃបៃតង ល្ពៅ ត្រសក់ ល្ហុងទុំ និងចេកណាំវ៉ា។',
      '🥣 កុំហុតទឹកស៊ុបគុយទាវ ឬមីអស់ពីចាន និងកុំដាក់ដបទឹកត្រី/ទឹកស៊ីអ៊ីវថែមលើតុអាហារ។',
      '💊 លេបថ្នាំបញ្ចុះសម្ពាធឈាមតាមវេជ្ជបញ្ជាជារៀងរាល់ថ្ងៃ ទោះបីជាថ្ងៃនោះមិនឈឺក្បាលក៏ដោយ។',
    ],
    bulletPointsEn: [
      '🍋 Flavor soups with lemongrass, kaffir lime leaves, ginger, turmeric, and lime instead of heavy fish sauce or prahok.',
      '🥬 Potassium-Rich Foods: Moringa, leafy greens, pumpkin, cucumber, ripe papaya, and bananas help flush excess sodium.',
      '🥣 Leave noodle soup broth behind and skip adding extra fish sauce at the table.',
      '💊 Take prescribed blood pressure medication daily even when you feel well.',
    ],
    bulletPointsZh: [
      '🍋 用香茅、柠檬叶、生姜、姜黄和鲜青柠提味，减少鱼露、食盐和发酵鱼酱用量。',
      '🥬 补充富钾食物（辣木叶、绿叶菜、南瓜、黄瓜、木瓜、香蕉）促进钠排出。',
      '🥣 吃汤面时不喝完浓汤，餐桌上不再额外添加鱼露或酱油。',
      '💊 每日按医嘱规律服用降压药，切勿因没有症状而自行停药。',
    ],
    foodsToChooseKh: ['អាម៉ុកត្រីចំហុយ (ប្រៃតិច)', 'ស្ងោរជ្រក់ត្រីរ៉ស់', 'សម្លប្រហើរស្លឹកម្រុំ', 'ត្រីចំហុយខ្ញី', 'បាយសម្រូប និងផ្លែចេក/ល្ហុង'],
    foodsToChooseEn: ['Low-Sodium Steamed Fish Amok', 'Clear Lemongrass Fish Soup', 'Moringa Samlor Praher', 'Steamed Fish with Ginger', 'Brown Rice & Fresh Fruit'],
    foodsToChooseZh: ['低盐清蒸阿莫克鱼', '香茅清酸鱼汤', '辣木叶蔬菜汤', '姜丝清蒸鱼', '糙米与新鲜水果'],
    foodsToLimitKh: ['ត្រីងៀត ត្រីប្រឡាក់ប្រៃ', 'ប្រហុក ផ្អក ម៉ាំ ក្នុងបរិមាណច្រើន', 'សាច់ក្រក ផាក់ឡូវ និងមីកញ្ចប់', 'គ្រឿងស្រវឹង និងភេសជ្ជៈប៉ូវកម្លាំង'],
    foodsToLimitEn: ['Salted dried fish', 'Heavy Prahok or fermented pastes', 'Sausages, braised offal & instant noodles', 'Alcohol & energy drinks'],
    foodsToLimitZh: ['高盐咸鱼干', '大量发酵鱼酱与腌菜', '香肠、卤味与方便面', '酒精与功能性饮料'],
    drinksKh: 'ផឹកទឹកស្អាត ២ លីត្រ/ថ្ងៃ ទឹកស្លឹកគ្រៃអត់ស្ករ ឬទឹកដូងស្រស់ធម្មជាតិ។ ជៀសវាងគ្រឿងស្រវឹង កាហ្វេចាស់ និងភេសជ្ជៈប៉ូវកម្លាំង។',
    drinksEn: 'Drink 2L of plain water, unsweetened lemongrass tea, or fresh coconut water. Avoid alcohol, strong coffee, and energy drinks.',
    drinksZh: '每日饮用 2 升白开水、无糖香茅茶或新鲜椰子水；忌饮酒、浓咖啡及功能饮料。',
    fruitsKh: 'ចេកណាំវ៉ា ល្ហុងទុំ ត្របែក ផ្លែប៉ោម ក្រូច និងឪឡឹក (ជួយបំពេញប៉ូតាស្យូមធម្មជាតិ)។',
    fruitsEn: 'Bananas, ripe papaya, guava, apples, oranges, and watermelon for natural potassium.',
    fruitsZh: '香蕉、熟木瓜、番石榴、苹果、橙子和西瓜（天然补钾护血管）。',
    morningMealKh: 'អាហារពេលព្រឹក៖ បបរត្រីរ៉ស់ប្រៃតិច ឬនំបញ្ចុកសម្លប្រហើរ (មិនថែមទឹកត្រី)។',
    morningMealEn: 'Breakfast: Low-sodium fish porridge or Num Banh Chok without extra fish sauce.',
    morningMealZh: '早餐：低盐生鱼片粥或不额外加鱼露的高棉草本米粉。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ ស្ងោរជ្រក់ត្រី ឬត្រីចំហុយខ្ញី ជាមួយបន្លែឆ្អិន និងបាយសម្រូបកន្លះចាន។',
    eveningMealEn: 'Dinner: Clear lemongrass fish soup or steamed fish with ginger, cooked greens, and half a bowl of brown rice.',
    eveningMealZh: '晚餐：香茅清鱼汤或姜丝蒸鱼，配焯水青菜和半碗糙米饭。',
    medicationCareKh: 'ហាមឈប់លេបថ្នាំលើសឈាមដោយខ្លួនឯងនៅពេលឃើញសម្ពាធឈាមចុះមកធម្មតា ព្រោះវាអាចធ្វើឱ្យសម្ពាធឈាមលោតឡើងខ្ពស់ភ្លាមៗ (Rebound hypertension) បង្កគ្រោះថ្នាក់ដាច់សរសៃឈាមខួរក្បាល! ជៀសវាងថ្នាំបំបាត់ការឈឺចាប់ NSAIDs និងថ្នាំផ្ដាសាយដែលមានជាតិ Pseudoephedrine។',
    medicationCareEn: 'Never stop blood pressure pills when readings look normal—this causes dangerous rebound hypertension and stroke risk. Avoid NSAID painkillers and decongestants containing pseudoephedrine.',
    medicationCareZh: '血压恢复正常后切勿擅自停用降压药，否则易引起反弹性和脑卒中风险！避免服用布洛芬等止痛药及含伪麻黄碱的感冒药。',
    redFlagsKh: 'សញ្ញាអាសន្ន (Hypertensive Crisis)៖ សម្ពាធឈាមខ្ពស់លើស 180/120 mmHg រួមជាមួយឈឺក្បាលខ្លាំង វិលមុខ ស្រវាំងភ្នែក ឈឺទ្រូង ដង្ហក់ ឬស្ពឹកទន់ដៃជើងមួយចំហៀង — ត្រូវទៅមន្ទីរពេទ្យភ្លាមៗ!',
    redFlagsEn: 'EMERGENCY RED FLAGS: BP ≥180/120 mmHg with severe headache, blurred vision, chest pain, shortness of breath, or one-sided numbness/weakness—go to ER immediately!',
    redFlagsZh: '高血压危象急诊信号：血压 ≥180/120 mmHg 伴剧烈头痛、视物模糊、胸痛、气促或一侧肢体麻木无力——请立即去急诊！',
    recoveryTimelineKh: 'ការកាត់បន្ថយជាតិប្រៃ និងអនុវត្តរបបអាហារ DASH ខ្មែរ អាចជួយបញ្ចុះសម្ពាធឈាមពី 5-11 mmHg ក្នុងរយៈពេល ២-៤ សប្តាហ៍។',
    recoveryTimelineEn: 'Reducing sodium and following a Cambodian DASH diet can lower systolic BP by 5–11 mmHg within 2–4 weeks.',
    recoveryTimelineZh: '坚持低盐饮食与高钾蔬菜搭配，通常在 2–4 周内可帮助收缩压下降 5–11 mmHg。',
    followUpSuggestionsKh: [
      'តើសម្ពាធឈាមប៉ុន្មានទើបហៅថាលើសឈាមគ្រោះថ្នាក់?',
      'តើអាចញ៉ាំកាហ្វេបានទេពេលមានជំងឺលើសឈាម?',
      'តើផ្លែឈើអ្វីខ្លះជួយបញ្ចុះសម្ពាធឈាមតាមបែបធម្មជាតិ?',
      'បើភ្លេចលេបថ្នាំលើសឈាម ១ ពេល តើត្រូវធ្វើដូចម្តេច?',
    ],
    followUpSuggestionsEn: [
      'What blood pressure numbers are considered dangerously high?',
      'Can I drink coffee if I have high blood pressure?',
      'Which fruits naturally help lower blood pressure?',
      'What should I do if I miss a dose of blood pressure medication?',
    ],
    followUpSuggestionsZh: [
      '血压达到多少属于危险的高血压？',
      '有高血压可以喝咖啡吗？',
      '哪些水果有助于天然辅助降血压？',
      '如果漏服了一次降压药该怎么办？',
    ],
  },

  // 9. LOW BLOOD PRESSURE, ANEMIA & DIZZINESS (ឈាមទាប / ខ្វះគ្រាប់ឈាម / វិលមុខ)
  {
    topicId: 'qa-hypotension-anemia',
    goalId: 'high_protein',
    safetyLevel: 'standard',
    keywords: [
      'ឈាមទាប', 'សម្ពាធឈាមទាប', 'ខ្វះគ្រាប់ឈាម', 'ស្លេកស្លាំង', 'វិលមុខ', 'ខ្វះជាតិដែក', 'ងងឹតមុខ',
      'low blood pressure', 'hypotension', 'anemia', 'iron deficiency', 'dizziness', 'lightheaded', 'pale',
      '低血压', '贫血', '缺铁', '头晕', '眼花', '气血不足',
    ],
    badgeKh: '🩸 ការថែទាំបញ្ហាឈាមទាប ខ្វះគ្រាប់ឈាម (Anemia) & អាការៈវិលមុខ',
    badgeEn: '🩸 Low Blood Pressure, Anemia & Dizziness Nutrition Guide',
    badgeZh: '🩸 低血压、缺铁性贫血与头晕营养指南',
    topicNameKh: 'បញ្ហាឈាមទាប ខ្វះគ្រាប់ឈាម និងវិលមុខ',
    topicNameEn: 'Low Blood Pressure, Anemia & Dizziness',
    topicNameZh: '低血压、贫血与头晕',
    summaryKh:
      'សម្រាប់អ្នកមានបញ្ហាសម្ពាធឈាមទាប ខ្វះគ្រាប់ឈាមក្រហម (Anemia) ឬឧស្សាហ៍វិលមុខពេលក្រោកឈរ គួរបង្កើនអាហារសម្បូរជាតិដែក (Iron) វីតាមីន B12 អាស៊ីតហ្វូលិក (Folate) និងប្រូតេអ៊ីន ព្រមទាំងផឹកទឹកឱ្យបានគ្រប់គ្រាន់ និងកុំបង្អត់អាហារពេលព្រឹក។',
    summaryEn:
      'For low blood pressure, iron-deficiency anemia, or postural dizziness, prioritize iron-rich proteins, Vitamin B12, folate from dark leafy greens (moringa), adequate hydration, and regular balanced meals starting with breakfast.',
    summaryZh:
      '针对低血压、缺铁性贫血或起身头晕，应多摄入富含铁质、维生素 B12、叶酸（如辣木叶、深色绿叶菜）及优质蛋白的食物，保证充足饮水，且切勿不吃早餐。',
    bulletPointsKh: [
      '🥩 អាហារសម្បូរជាតិដែក និង B12៖ សាច់គោគ្មានខ្លាញ់ ថ្លើមចម្អិនឆ្អិនល្អ ត្រីទឹកសាប សាច់មាន់ ស៊ុត និងស្លឹកម្រុំ។',
      '🍊 ញ៉ាំផ្លែឈើសម្បូរវីតាមីន C (ក្រូច ត្របែក) ជាមួយអាហារ ដើម្បីជួយស្រូបយកជាតិដែកបានល្អ (ជៀសវាងផឹកតែចាស់ ឬកាហ្វេភ្លាមៗក្រោយបាយ ព្រោះវារារាំងការស្រូបជាតិដែក)។',
      '💧 ផឹកទឹកស្អាត ២-២.៥ លីត្រ/ថ្ងៃ ដើម្បីរក្សាបរិមាណឈាមក្នុងសរសៃឈាម និងងើបឈរយឺតៗពីគ្រែគេង។',
    ],
    bulletPointsEn: [
      '🥩 Iron & B12 Sources: Lean beef, thoroughly cooked poultry/fish, eggs, and moringa leaves.',
      '🍊 Pair meals with Vitamin C fruits (oranges, guava) to double iron absorption; avoid strong tea or coffee right with meals as tannins block iron.',
      '💧 Drink 2–2.5L of water daily to support blood volume and rise slowly from sitting or lying positions.',
    ],
    bulletPointsZh: [
      '🥩 富含铁与 B12 的食物：瘦牛肉、淡水鱼、鸡肉、鸡蛋以及辣木叶。',
      '🍊 随餐搭配富含维生素 C 的水果（橙子、番石榴）促进铁吸收；餐后 1 小时内勿饮浓茶或咖啡（鞣酸会阻碍铁吸收）。',
      '💧 每日饮水 2–2.5 升以维持血容量，起床或起身时动作宜缓慢。',
    ],
    foodsToChooseKh: ['សម្លកកូរត្រីស្លឹកម្រុំ', 'ឆាខ្ញីសាច់មាន់/សាច់គោ', 'ភ្លាសាច់គោឆ្អិនល្អ', 'បបរមាន់ដាក់ស៊ុត', 'ផ្លែក្រូច និងត្របែក'],
    foodsToChooseEn: ['Samlor Korko with Moringa', 'Ginger Beef or Chicken Stir-Fry', 'Cooked Beef Salad', 'Chicken & Egg Rice Porridge', 'Oranges & Guava'],
    foodsToChooseZh: ['辣木叶高棉杂菜汤', '仔姜炒牛肉/鸡肉', '熟牛肉蔬菜沙拉', '鸡肉加蛋热粥', '橙子与番石榴'],
    foodsToLimitKh: ['ការផឹកតែចាស់ ឬកាហ្វេភ្លាមៗពេលញ៉ាំបាយ', 'ការអត់អាហារពេលព្រឹក', 'គ្រឿងស្រវឹងដែលធ្វើឱ្យខ្សោះជាតិទឹក'],
    foodsToLimitEn: ['Strong tea or coffee during meals', 'Skipping breakfast', 'Alcohol that causes dehydration'],
    foodsToLimitZh: ['随餐饮用浓茶或咖啡', '不吃早餐或过度节食', '导致脱水的酒精饮品'],
    drinksKh: 'ទឹកស្អាត ទឹកក្រូចច្របាច់ស្រស់ ទឹកដូងធម្មជាតិ ឬទឹកសណ្តែក។',
    drinksEn: 'Plain water, fresh orange juice, coconut water, or soy milk.',
    drinksZh: '白开水、鲜榨橙汁、椰子水或豆浆。',
    fruitsKh: 'ក្រូចពោធិ៍សាត់ ត្របែក ទទឹម ល្ហុងទុំ និងចេកណាំវ៉ា។',
    fruitsEn: 'Oranges, guava, pomegranate, ripe papaya, and bananas.',
    fruitsZh: '橙子、番石榴、石榴、熟木瓜和香蕉。',
    morningMealKh: 'អាហារពេលព្រឹក៖ បបរសាច់មាន់ដាក់ស៊ុត ១ ចាន ឬបាយសាច់គោឆាខ្ញី ជាមួយផ្លែក្រូច ១ ផ្លែ។',
    morningMealEn: 'Breakfast: Chicken & egg porridge or ginger beef with rice, plus an orange.',
    morningMealZh: '早餐：鸡肉加蛋粥或姜丝牛肉饭，配一个橙子。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ សម្លកកូរត្រីស្លឹកម្រុំ និងឆាបន្លែសាច់គោ ជាមួយបាយសម្រូប។',
    eveningMealEn: 'Dinner: Moringa Samlor Korko and beef vegetable stir-fry with brown rice.',
    eveningMealZh: '晚餐：辣木叶杂菜汤配牛肉炒时蔬及糙米饭。',
    medicationCareKh: 'ប្រសិនបើលេបគ្រាប់ថ្នាំជាតិដែកតាមវេជ្ជបញ្ជា អាចធ្វើឱ្យលាមកមានពណ៌ខ្មៅធម្មតា។ គួរពិនិត្យឈាម (CBC & Ferritin) ជាមួយគ្រូពេទ្យមុនលេបថ្នាំជាតិដែក ព្រោះកម្ពុជាមានអត្រាអ្នកផ្ទុកជំងឺឈាមតំណពូជ Thalassemia ដែលមិនគួរលេបជាតិដែកលើសកម្រិតឡើយ!',
    medicationCareEn: 'Check a Complete Blood Count (CBC) and ferritin with a doctor before taking iron pills, especially since Thalassemia trait is common in Cambodia and requires tailored iron guidance.',
    medicationCareZh: '补充铁剂前建议先去医院查血常规（CBC）与铁蛋白，因为在柬埔寨地中海贫血基因携带率较高，需由医生明确是否为缺铁性贫血后再补铁。',
    redFlagsKh: 'ត្រូវទៅមន្ទីរពេទ្យភ្លាមប្រសិនបើ៖ វិលមុខដួលសន្លប់ ឈឺទ្រូង ដង្ហក់ពេលដើរតិចៗ ស្លេកស្លាំងខ្លាំង ឬមានការហូរឈាមតាមលាមក/រដូវច្រើនខុសធម្មតា។',
    redFlagsEn: 'Seek urgent care for fainting (syncope), chest pain, shortness of breath on mild exertion, severe pallor, or heavy bleeding.',
    redFlagsZh: '若出现晕厥、胸痛、轻微活动即气促、脸色苍白或便血/月经过多，请立即就医。',
    recoveryTimelineKh: 'ការកែសម្រួលរបបអាហារ និងផឹកទឹកជួយបន្ថយអាការៈវិលមុខក្នុង ១-២ សប្តាហ៍ ចំណែកការបង្កើនគ្រាប់ឈាមត្រូវការពេល ៦-៨ សប្តាហ៍។',
    recoveryTimelineEn: 'Hydration and regular meals improve dizziness in 1–2 weeks; rebuilding hemoglobin stores takes 6–8 weeks.',
    recoveryTimelineZh: '规律饮食与补水可在 1–2 周内改善头晕，血红蛋白的恢复则通常需要 6–8 周。',
    followUpSuggestionsKh: [
      'ហេតុអ្វីមិនគួរផឹកតែ ឬកាហ្វេភ្លាមៗក្រោយពេលញ៉ាំបាយ?',
      'តើស្លឹកម្រុំជួយបង្កើនគ្រាប់ឈាមបានដូចម្តេចខ្លះ?',
      'តើពេលក្រោកឈរភ្លាមវិលមុខ ងងឹតមុខ គួរធ្វើដូចម្តេច?',
      'តើគួរពិនិត្យឈាមអ្វីខ្លះនៅមន្ទីរពេទ្យពេលសង្ស័យខ្វះគ្រាប់ឈាម?',
    ],
    followUpSuggestionsEn: [
      'Why should I avoid tea or coffee right after eating iron-rich meals?',
      'How do moringa leaves help boost red blood cells?',
      'What should I do when I feel dizzy standing up?',
      'Which blood tests should I ask my doctor for anemia?',
    ],
    followUpSuggestionsZh: [
      '为什么饭后不宜立即喝浓茶或咖啡？',
      '辣木叶是如何帮助补铁和改善贫血的？',
      '站起来时突然头晕眼花该怎么处理？',
      '怀疑贫血去医院应该做哪些血液检查？',
    ],
  },

  // 10. HIGH CHOLESTEROL, TRIGLYCERIDES & FATTY LIVER (លើសខ្លាញ់ / ខ្លាញ់រុំថ្លើម)
  {
    topicId: 'qa-cholesterol-fatty-liver',
    goalId: 'heart_bp',
    safetyLevel: 'standard',
    keywords: [
      'លើសខ្លាញ់', 'ខ្លាញ់ក្នុងឈាម', 'ខ្លាញ់រុំថ្លើម', 'កូឡេស្តេរ៉ុល', 'ថ្លើម', 'ទ្រីគ្លីសេរីត',
      'cholesterol', 'triglycerides', 'fatty liver', 'hyperlipidemia', 'ldl', 'liver health',
      '高血脂', '高胆固醇', '脂肪肝', '甘油三酯', '护肝', '血脂高',
    ],
    badgeKh: '🫀 ការកាត់បន្ថយខ្លាញ់ក្នុងឈាម (Cholesterol) & ខ្លាញ់រុំថ្លើម',
    badgeEn: '🫀 High Cholesterol, Triglycerides & Fatty Liver Diet Guide',
    badgeZh: '🫀 高血脂、高胆固醇与脂肪肝饮食指南',
    topicNameKh: 'បញ្ហាលើសខ្លាញ់ក្នុងឈាម និងខ្លាញ់រុំថ្លើម',
    topicNameEn: 'High Cholesterol & Fatty Liver',
    topicNameZh: '高血脂与脂肪肝',
    summaryKh:
      'អ្នកមានបញ្ហាលើសខ្លាញ់ក្នុងឈាម (LDL / Triglycerides) ឬខ្លាញ់រុំថ្លើម គួរកាត់បន្ថយខ្លាញ់សត្វ អាហារបំពង ខ្ទិះដូងខាប់ៗ និងភេសជ្ជៈផ្អែម/គ្រឿងស្រវឹង ហើយប្តូរមកញ៉ាំត្រីទឹកសាប បន្លែបៃតងសម្បូរជាតិសរសៃរលាយ (ស្លឹកម្រុំ ត្រប់ ពោតបារាំង) និងបាយសម្រូប។',
    summaryEn:
      'To lower LDL cholesterol, triglycerides, and liver fat, replace saturated animal fats, deep-fried foods, heavy coconut cream, and sugary/alcoholic drinks with freshwater fish, soluble-fiber vegetables (moringa, eggplant, okra), and brown rice.',
    summaryZh:
      '降低坏胆固醇（LDL）、甘油三酯及改善脂肪肝的关键是减少动物脂肪、油炸食品、浓椰浆、含糖饮料与酒精，改吃淡水鱼、富含可溶性纤维的蔬菜（辣木叶、茄子、秋葵）和糙米。',
    bulletPointsKh: [
      '🐟 ញ៉ាំត្រីទឹកសាប (ចំហុយ អាំង ស្ងោរ ស្ល) យ៉ាងតិច ៣-៤ ដង/សប្តាហ៍ ជំនួសសាច់ជ្រូកបីជាន់ និងសាច់គោខ្លាញ់។',
      '🍆 បន្លែជួយស្រូបខ្លាញ់ក្នុងពោះវៀន៖ ត្រប់ ពោតបារាំង (Okra) ស្លឹកម្រុំ ផ្សិត និងបន្លែបៃតង។',
      '🥤 កាត់បន្ថយជាតិស្ករ និងគ្រឿងស្រវឹង៖ ជាតិស្ករលើសពីភេសជ្ជៈផ្អែម និងស្រាបៀរ នឹងបំប្លែងទៅជាខ្លាញ់ Triglycerides និងខ្លាញ់រុំថ្លើមដោយផ្ទាល់!',
      '🏃‍♂️ ហាត់ប្រាណដើរលឿន ឬរត់តិចៗ ៣០-៤៥ នាទី/ថ្ងៃ ជួយដុតខ្លាញ់ក្នុងថ្លើម និងបង្កើនខ្លាញ់ល្អ (HDL)។',
    ],
    bulletPointsEn: [
      '🐟 Eat steamed, grilled, or soup-cooked freshwater fish 3–4 times a week instead of pork belly or fatty meats.',
      '🍆 Soluble Fiber Traps Cholesterol: Eggplant, okra, moringa, mushrooms, and leafy greens.',
      '🥤 Cut Sugar & Alcohol: Excess fructose from sweet drinks and alcohol converts directly into triglycerides and liver fat.',
      '🏃‍♂️ 30–45 minutes of daily brisk walking clears liver fat and raises protective HDL cholesterol.',
    ],
    bulletPointsZh: [
      '🐟 每周吃 3–4 次清蒸、水煮或炖汤的淡水鱼，替代五花肉与肥肉。',
      '🍆 富含可溶性纤维的蔬菜（茄子、秋葵、辣木叶、菌菇）有助于在肠道吸附胆固醇。',
      '🥤 戒糖限酒：甜饮料中的果糖和酒精会在肝脏直接转化为甘油三酯并加重脂肪肝！',
      '🏃‍♂️ 每天快走或慢跑 30–45 分钟可有效消耗肝脏脂肪并提升好胆固醇（HDL）。',
    ],
    foodsToChooseKh: ['ស្ងោរជ្រក់ត្រីរ៉ស់', 'សម្លកកូរត្រីស្លឹកម្រុំ', 'ត្រីចំហុយខ្ញី', 'ទឹកគ្រឿងបន្លែស្រស់', 'បាយសម្រូប'],
    foodsToChooseEn: ['Clear Sour Fish Soup', 'Samlor Korko with Moringa', 'Steamed Fish with Ginger', 'Tuk Kroeung with Fresh Greens', 'Brown Rice'],
    foodsToChooseZh: ['香茅清酸鱼汤', '辣木叶高棉杂菜汤', '姜丝清蒸鱼', '鱼酱配新鲜蔬菜', '糙米饭'],
    foodsToLimitKh: ['សាច់ជ្រូកបីជាន់ ស្បែកមាន់បំពង និងផាក់ឡូវ', 'សម្លខ្ទិះដូងខាប់ៗញឹកញាប់ពេក', 'ស្រាបៀរ គ្រឿងស្រវឹង និងភេសជ្ជៈផ្អែម', 'នំដុតប៊ឺរ និងអាហារបំពង'],
    foodsToLimitEn: ['Pork belly, fried skin & braised offal', 'Frequent heavy coconut cream curries', 'Beer, alcohol & sugary drinks', 'Butter pastries & deep-fried foods'],
    foodsToLimitZh: ['五花肉、炸鸡皮与卤内脏', '频繁食用浓椰浆咖喱', '啤酒、白酒与含糖饮料', '黄油糕点与油炸食品'],
    drinksKh: 'ទឹកស្អាត តែបៃតងអត់ស្ករ ទឹកស្លឹកគ្រៃអត់ស្ករ។ តមស្រាបៀរ គ្រឿងស្រវឹង និងតែទឹកដោះគោផ្អែម។',
    drinksEn: 'Plain water, unsweetened green tea, and lemongrass tea. Avoid beer, alcohol, and sweetened milk tea.',
    drinksZh: '白开水、无糖绿茶、无糖香茅茶；严禁啤酒、白酒与含糖奶茶。',
    fruitsKh: 'ផ្លែប៉ោម ត្របែក ក្រូចថ្លុង ផ្លែបឺរ (ក្នុងបរិមាណល្មម) និងផ្លែស្រកានាគ។',
    fruitsEn: 'Apples, guava, pomelo, dragon fruit, and moderate avocado.',
    fruitsZh: '苹果、番石榴、柚子、火龙果和适量牛油果。',
    morningMealKh: 'អាហារពេលព្រឹក៖ បបរស្រូវសាលី ឬនំបញ្ចុកសម្លប្រហើរត្រីបន្លែច្រើន។',
    morningMealEn: 'Breakfast: Oatmeal or Num Banh Chok with herbal fish gravy and generous greens.',
    morningMealZh: '早餐：燕麦粥或多菜高棉鱼汤米粉。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ ស្ងោរជ្រក់ត្រី ឬត្រីចំហុយខ្ញី ជាមួយបន្លែស្រស់ និងបាយសម្រូបកន្លះចាន។',
    eveningMealEn: 'Dinner: Clear fish soup or steamed fish with ginger, fresh greens, and half a bowl of brown rice.',
    eveningMealZh: '晚餐：清炖鱼汤或姜丝蒸鱼，配新鲜绿叶菜和半碗糙米。',
    medicationCareKh: 'ប្រសិនបើគ្រូពេទ្យចេញវេជ្ជបញ្ជាថ្នាំបញ្ចុះខ្លាញ់ (ដូចជា Atorvastatin / Rosuvastatin) សូមលេបឱ្យទៀងទាត់ (ភាគច្រើនពេលល្ងាច) និងជៀសវាងផឹកគ្រឿងស្រវឹងដែលប៉ះពាល់ដល់ថ្លើម។',
    medicationCareEn: 'If prescribed statins (Atorvastatin, Rosuvastatin), take them consistently and avoid alcohol to protect liver enzymes.',
    medicationCareZh: '若医生开具他汀类降脂药（如阿托伐他汀、瑞舒伐他汀），请按时服用并戒酒以保护肝功能。',
    redFlagsKh: 'ទៅជួបគ្រូពេទ្យប្រសិនបើមានអាការៈ៖ ឈឺទ្រូង ដង្ហក់ លឿងភ្នែក/លឿងស្បែក ឈឺឆ្អឹងជំនីរខាងស្តាំ ឬឈឺសាច់ដុំខ្លាំងពេលប្រើថ្នាំបញ្ចុះខ្លាញ់។',
    redFlagsEn: 'See a doctor promptly for chest tightness, jaundice (yellow eyes/skin), right upper abdominal pain, or severe muscle aches on statins.',
    redFlagsZh: '如出现胸闷胸痛、眼黄皮黄（黄疸）、右上腹隐痛或服用降脂药期间严重肌肉酸痛，请及时就医。',
    recoveryTimelineKh: 'ខ្លាញ់រុំថ្លើម និងខ្លាញ់ក្នុងឈាមអាចថយចុះគួរឱ្យកត់សម្គាល់ក្នុងរយៈពេល ៨ ទៅ ១២ សប្តាហ៍ នៃការតមស្រា តមផ្អែម និងហាត់ប្រាណ។',
    recoveryTimelineEn: 'Triglycerides and fatty liver improve significantly within 8–12 weeks of cutting sugar/alcohol and walking daily.',
    recoveryTimelineZh: '戒糖戒酒并坚持每日快走 8–12 周后，甘油三酯与脂肪肝程度通常会显著改善。',
    followUpSuggestionsKh: [
      'តើអ្នកលើសខ្លាញ់ក្នុងឈាម អាចញ៉ាំស៊ុតបានប៉ុន្មានគ្រាប់ក្នុងមួយសប្តាហ៍?',
      'ហេតុអ្វីការផឹកភេសជ្ជៈផ្អែម ធ្វើឱ្យឡើងខ្លាញ់រុំថ្លើម?',
      'តើគួរជ្រើសរើសប្រេងឆាប្រភេទណាដើម្បីល្អដល់សរសៃឈាម?',
      'សូមណែនាំផែនការអាហារបញ្ចុះខ្លាញ់ ១ ថ្ងៃ',
    ],
    followUpSuggestionsEn: [
      'How many eggs per week can I eat if I have high cholesterol?',
      'Why do sugary drinks cause fatty liver and high triglycerides?',
      'Which cooking oils are healthiest for cholesterol control?',
      'Recommend a 1-day cholesterol-lowering Cambodian meal plan',
    ],
    followUpSuggestionsZh: [
      '有高胆固醇每周可以吃几个鸡蛋？',
      '为什么喝甜饮料会导致脂肪肝和甘油三酯升高？',
      '日常炒菜选择哪种食用油最有益血管健康？',
      '请推荐一份一日三餐降血脂柬式食谱',
    ],
  },

  // 11. KIDNEY HEALTH, KIDNEY STONES & UTI (តម្រងនោម / គ្រួសក្នុងតម្រងនោម / រលាកផ្លូវទឹកនោម)
  {
    topicId: 'qa-kidney-urinary',
    goalId: 'heart_bp',
    safetyLevel: 'high_risk_care',
    keywords: [
      'តម្រងនោម', 'ខ្សោយតម្រងនោម', 'គ្រួសក្នុងតម្រងនោម', 'រលាកផ្លូវទឹកនោម', 'នោមទាស់', 'នោមក្រហាយ', 'ឈឺចង្កេះ',
      'kidney', 'renal', 'kidney stone', 'uti', 'urinary tract', 'creatinine', 'frequent urination',
      '肾病', '肾功能', '肾结石', '尿路感染', '尿痛', '护肾', '肌酐',
    ],
    badgeKh: '🫘 ការថែរក្សាសុខភាពតម្រងនោម គ្រួសក្នុងតម្រងនោម & ផ្លូវទឹកនោម',
    badgeEn: '🫘 Kidney Health, Kidney Stones & Urinary Care Guide',
    badgeZh: '🫘 肾脏健康、肾结石与尿路护理指南',
    topicNameKh: 'សុខភាពតម្រងនោម និងផ្លូវទឹកនោម',
    topicNameEn: 'Kidney Health & Urinary Care',
    topicNameZh: '肾脏健康与尿路护理',
    summaryKh:
      'ការថែរក្សាតម្រងនោម ទាមទារការកាត់បន្ថយជាតិប្រៃ (សូដ្យូមទាប) ផឹកទឹកស្អាតឱ្យបានគ្រប់គ្រាន់ គ្រប់គ្រងសម្ពាធឈាម និងជាតិស្ករ និងជៀសវាងការប្រើថ្នាំបំបាត់ការឈឺចាប់ ឬថ្នាំបុរាណគ្មានប្រភពច្បាស់លាស់ដែលបំផ្លាញតម្រងនោម។ (ចំណាំ៖ ប្រសិនបើមានជំងឺខ្សោយតម្រងនោមដំណាក់កាលធ្ងន់ CKD ត្រូវកំណត់បរិមាណប៉ូតាស្យូម ប្រូតេអ៊ីន និងទឹកតាមវេជ្ជបញ្ជាគ្រូពេទ្យឯកទេស)។',
    summaryEn:
      'Protecting your kidneys requires low sodium intake, adequate pure water hydration (to prevent kidney stones and UTIs), blood pressure/glucose control, and strictly avoiding nephrotoxic painkillers or unverified herbal remedies. (Note: Advanced CKD patients must follow their nephrologist’s specific protein, potassium, and fluid limits).',
    summaryZh:
      '保护肾脏需严格控盐、充足饮用白开水（预防肾结石与尿路感染）、控制血压血糖，并严禁滥用伤肾止痛药或不明草药。（注：慢性肾脏病中晚期 CKD 患者须严格遵肾内科医嘱限制蛋白质、钾和饮水量）。',
    bulletPointsKh: [
      '🧂 កាត់បន្ថយអំបិល ទឹកត្រី ប្រហុក និងអាហារកែច្នៃ ដើម្បីកាត់បន្ថយសម្ពាធលើតម្រងនោម។',
      '💧 សម្រាប់អ្នកការពារគ្រួសក្នុងតម្រងនោម ឬរលាកផ្លូវទឹកនោម៖ ផឹកទឹកស្អាត ២.៥ លីត្រ/ថ្ងៃ និងកុំទប់ទឹកនោម (បន្ថែមក្រូចឆ្មាតិចៗក្នុងទឹកជួយការពារគ្រួសកាល់ស្យូម)។',
      '⚠️ សម្រាប់អ្នកជំងឺខ្សោយតម្រងនោមរ៉ាំរ៉ៃ (CKD កម្រិត 3-5)៖ ត្រូវញ៉ាំប្រូតេអ៊ីនក្នុងបរិមាណល្មម ស្រុសបន្លែចោលទឹកមុនយកទៅស្លដើម្បីបន្ថយប៉ូតាស្យូម និងជៀសវាងផ្លែស្ពឺ (Starfruit) ដាច់ខាត!',
      '🚫 ហាមប្រើថ្នាំបំបាត់ការឈឺចាប់ NSAIDs (Ibuprofen/Diclofenac) ឬថ្នាំชุด/ថ្នាំបុរាណគ្មានវេជ្ជបញ្ជា។',
    ],
    bulletPointsEn: [
      '🧂 Reduce salt, fish sauce, prahok, and processed foods to lower glomerular pressure.',
      '💧 For kidney stone & UTI prevention: Drink 2.5L of water with a squeeze of fresh lime daily and never hold urine.',
      '⚠️ For Chronic Kidney Disease (CKD Stages 3–5): Moderate protein, blanch vegetables to reduce potassium if advised, and STRICTLY AVOID starfruit (neurotoxic/nephrotoxic in CKD)!',
      '🚫 Never take NSAID painkillers or unlabelled multi-pill packets ("Thnam Chut").',
    ],
    bulletPointsZh: [
      '🧂 减少食盐、鱼露、发酵鱼酱及加工食品，减轻肾小球过滤负担。',
      '💧 预防肾结石与尿路感染：每日饮水 2.5 升（可加少许鲜柠檬汁预防草酸钙结石），切勿憋尿。',
      '⚠️ 慢性肾病（CKD 3–5 期）患者注意：适量控制蛋白质，蔬菜先焯水弃汤以去钾，且绝对禁食杨桃（Starfruit，对肾病患者有严重神经与肾毒性）！',
      '🚫 严禁自行服用非甾体止痛药（布洛芬等）或不明成分的散装药包。',
    ],
    foodsToChooseKh: ['ស្ងោរត្រឡាចត្រីរ៉ស់ (ប្រៃតិច)', 'ត្រីចំហុយខ្ញីស្រស់', 'បបរត្រីរ៉ស់', 'ឆាស្ពៃក្តោប/ត្រសក់ប្រៃតិច'],
    foodsToChooseEn: ['Low-Sodium Winter Melon Fish Soup', 'Steamed Fish with Ginger', 'Snakehead Fish Porridge', 'Light Cabbage or Cucumber Stir-Fry'],
    foodsToChooseZh: ['低盐冬瓜生鱼汤', '鲜姜清蒸鱼', '清淡生鱼片粥', '少盐清炒卷心菜/黄瓜'],
    foodsToLimitKh: ['ផ្លែស្ពឺ (គ្រោះថ្នាក់ខ្លាំងសម្រាប់អ្នកខ្សោយតម្រងនោម)', 'ត្រីងៀត ប្រហុក ផ្អក និងអាហារប្រៃខ្លាំង', 'ថ្នាំបំបាត់ការឈឺចាប់ និងភេសជ្ជៈប៉ូវកម្លាំង', 'គ្រឿងក្នុងសត្វ និងសាច់ក្រហមច្រើនពេក'],
    foodsToLimitEn: ['Starfruit (strictly contraindicated in CKD)', 'Salted dried fish & heavy prahok', 'NSAID painkillers & energy drinks', 'Organ meats & excessive red meat'],
    foodsToLimitZh: ['杨桃（肾病患者绝对禁食）', '咸鱼、高盐鱼酱与腌制品', '止痛药与功能性提神饮料', '动物内脏与过量红肉'],
    drinksKh: 'ទឹកស្អាតធម្មតា (២-២.៥ លីត្រសម្រាប់អ្នកការពារគ្រួស/រលាកផ្លូវទឹកនោម ឬតាមកម្រិតគ្រូពេទ្យកំណត់ប្រសិនបើមានហើមជើង/ខ្សោយតម្រងនោមធ្ងន់)។',
    drinksEn: 'Plain water (2–2.5L for stone/UTI prevention, or follow fluid restriction if prescribed for advanced CKD with edema).',
    drinksZh: '白开水（预防结石/尿路感染每日 2–2.5 升；若为伴水肿的重度肾病患者请严格遵医嘱控水）。',
    fruitsKh: 'ផ្លែប៉ោម ផ្លែសារី ត្របែក និងម្នាស់តិចៗ។ (អ្នកខ្សោយតម្រងនោមត្រូវតមផ្លែស្ពឺដាច់ខាត និងកាត់បន្ថយចេក/ទឹកដូងប្រសិនបើលើសប៉ូតាស្យូម)។',
    fruitsEn: 'Apples, pears, and guava are kidney-friendly. (CKD patients must strictly avoid starfruit and limit bananas/coconut water if potassium is high).',
    fruitsZh: '苹果、梨和番石榴对肾脏较温和。（肾功能不全者严禁吃杨桃，高血钾者需限制香蕉和椰子水）。',
    morningMealKh: 'អាហារពេលព្រឹក៖ បបរត្រីរ៉ស់ ឬបបរសាច់មាន់ប្រៃតិច ជាមួយស៊ុតផ្នែកពណ៌ស។',
    morningMealEn: 'Breakfast: Low-sodium fish or chicken porridge with egg whites.',
    morningMealZh: '早餐：低盐鱼片粥或鸡肉粥配鸡蛋白。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ ស្ងោរត្រឡាចត្រីរ៉ស់ និងឆាស្ពៃក្តោបប្រៃតិច ជាមួយបាយស។',
    eveningMealEn: 'Dinner: Low-sodium winter melon fish soup and light cabbage stir-fry with rice.',
    eveningMealZh: '晚餐：低盐冬瓜鱼汤配清炒卷心菜及米饭。',
    medicationCareKh: 'ហាមប្រើថ្នាំបំបាត់ការឈឺចាប់ក្រុម NSAIDs (Ibuprofen, Naproxen, Diclofenac, Meloxicam) ថ្នាំชุด និងថ្នាំបុរាណដាំផឹកគ្មានវេជ្ជបញ្ជា ព្រោះវាជាមូលហេតុចម្បងនៃជំងឺខ្សោយតម្រងនោមស្រួចស្រាវនៅកម្ពុជា!',
    medicationCareEn: 'Strictly avoid NSAID painkillers, mixed pill packets ("Thnam Chut"), and unverified herbal decoctions, which are leading causes of acute kidney injury.',
    medicationCareZh: '严禁滥用非甾体抗炎止痛药、散装混合药包及不明草药煎剂，这些是导致急性肾损伤的主要原因！',
    redFlagsKh: 'ត្រូវទៅមន្ទីរពេទ្យភ្លាមប្រសិនបើ៖ នោមតិចខ្លាំង ឬនោមไม่ออก នោមមានឈាម ហើមមុខ/ហើមជើងខ្លាំង ឈឺចង្កេះខ្លាំងរាលដាលចុះក្រោម ក្ដៅខ្លួនរងាញាក់ ឬដង្ហក់។',
    redFlagsEn: 'URGENT RED FLAGS: Markedly decreased urine output, blood in urine, facial/leg swelling, severe flank pain with fever/chills, or shortness of breath.',
    redFlagsZh: '急诊警示信号：尿量明显减少或无尿、血尿、眼睑或下肢严重水肿、剧烈腰背部绞痛伴寒战高热或气促。',
    recoveryTimelineKh: 'ការរលាកផ្លូវទឹកនោមធូរស្រាលក្នុង ៣-៧ ថ្ងៃតាមវេជ្ជបញ្ជា ចំណែកការថែរក្សាតម្រងនោមគឺជាការការពារប្រចាំថ្ងៃ។',
    recoveryTimelineEn: 'UTIs resolve in 3–7 days with medical care; kidney preservation requires consistent daily low-sodium habits.',
    recoveryTimelineZh: '尿路感染在规范治疗下 3–7 天可愈；慢性肾脏保护则需要长期的低盐健康习惯。',
    followUpSuggestionsKh: [
      'ហេតុអ្វីអ្នកមានជំងឺតម្រងនោម ហាមញ៉ាំផ្លែស្ពឺដាច់ខាត?',
      'តើថ្នាំបំបាត់ការឈឺចាប់ប្រភេទណាដែលធ្វើឱ្យខូចតម្រងនោម?',
      'តើអ្នកមានគ្រួសក្នុងតម្រងនោម គួរតមអាហារអ្វីខ្លះ?',
      'តើត្រូវស្រុសបន្លែដោយរបៀបណាដើម្បីបន្ថយជាតិប៉ូតាស្យូម?',
    ],
    followUpSuggestionsEn: [
      'Why is starfruit dangerous for people with kidney disease?',
      'Which painkiller medications can damage the kidneys?',
      'What foods should I limit to prevent kidney stones?',
      'How do I blanch vegetables to reduce potassium for CKD?',
    ],
    followUpSuggestionsZh: [
      '为什么肾病患者绝对不能吃杨桃？',
      '哪些常见的止痛药最容易损伤肾脏？',
      '有肾结石的人应该少吃哪些食物？',
      '肾病患者如何通过焯水减少蔬菜中的钾含量？',
    ],
  },

  // 12. GOUT, URIC ACID & JOINT / BONE PAIN (ឈឺសន្លាក់ / អាស៊ីតអ៊ុយរិក / ពុកឆ្អឹង)
  {
    topicId: 'qa-gout-joints-bones',
    goalId: 'light_digest',
    safetyLevel: 'standard',
    keywords: [
      'ឈឺសន្លាក់', 'អាស៊ីតអ៊ុយរិក', 'រលាកសន្លាក់', 'ពុកឆ្អឹង', 'ឈឺជង្គង់', 'ឈឺឆ្អឹង', 'សន្លាក់', 'ហើមសន្លាក់',
      'gout', 'uric acid', 'arthritis', 'joint pain', 'knee pain', 'osteoporosis', 'bone health', 'calcium',
      '痛风', '高尿酸', '尿酸', '关节痛', '关节炎', '膝盖痛', '骨质疏松', '补钙',
    ],
    badgeKh: '🦴 របបអាហារសម្រាប់អ្នកឈឺសន្លាក់ លើសអាស៊ីតអ៊ុយរិក (Gout) & បំប៉នឆ្អឹង',
    badgeEn: '🦴 Gout, Uric Acid & Joint/Bone Health Nutrition Guide',
    badgeZh: '🦴 痛风、高尿酸与骨关节健康营养指南',
    topicNameKh: 'ជំងឺឈឺសន្លាក់ លើសអាស៊ីតអ៊ុយរិក និងសុខភាពឆ្អឹង',
    topicNameEn: 'Gout, High Uric Acid & Joint Care',
    topicNameZh: '痛风、高尿酸与关节保健',
    summaryKh:
      'អ្នកមានបញ្ហាលើសអាស៊ីតអ៊ុយរិក (Gout) និងឈឺសន្លាក់ គួរកាត់បន្ថយអាហារសម្បូរសារធាតុ Purine ខ្ពស់ (គ្រឿងក្នុងសត្វ សាច់ក្រហមច្រើន អាហារសមុទ្រមួយចំនួន និងស្រាបៀរ) ហើយបង្កើនការផឹកទឹក ២.៥-៣ លីត្រ/ថ្ងៃ រួមជាមួយបន្លែ ត្រឡាច ល្ពៅ ស្លឹកម្រុំ ស៊ុត និងតៅហ៊ូ។',
    summaryEn:
      'To manage gout, high uric acid, and joint inflammation, restrict high-purine foods (organ meats, heavy red meat, shellfish, and beer), drink 2.5–3L of water daily to flush uric acid, and choose gourd soups, moringa, eggs, tofu, and moderate freshwater fish.',
    summaryZh:
      '控制高尿酸与痛风发作的关键是限制高嘌呤食物（动物内脏、大量红肉、部分海鲜贝类及啤酒），每日饮水 2.5–3 升促进尿酸排泄，多吃冬瓜、南瓜、辣木叶、鸡蛋、豆腐及适量淡水鱼。',
    bulletPointsKh: [
      '💧 ផឹកទឹកស្អាត ២.៥ ទៅ ៣ លីត្រក្នុងមួយថ្ងៃ ដើម្បីជួយបញ្ចេញអាស៊ីតអ៊ុយរិកតាមទឹកនោម។',
      '🥦 បន្លែ និងប្រូតេអ៊ីនសុវត្ថិភាព៖ ស្ងោរត្រឡាច ល្ពៅ ត្រសក់ ស្លឹកម្រុំ (សម្បូរកាល់ស្យូមជំនួយឆ្អឹង) ស៊ុត តៅហ៊ូ និងត្រីទឹកសាបក្នុងបរិមាណល្មម។',
      '🚫 តមដាច់ខាតពេលកំពុងហើមឈឺសន្លាក់៖ ស្រាបៀរ គ្រឿងស្រវឹង គ្រឿងក្នុងសត្វ (ផាក់ឡូវ ថ្លើម ពោះវៀន) ទឹកស៊ុបរំងាស់ឆ្អឹងខាប់ៗ និងភេសជ្ជៈផ្អែមខ្លាំង។',
      '⚖️ រក្សាទម្ងន់ខ្លួនឱ្យសមស្រប ដើម្បីកាត់បន្ថយសម្ពាធលើសន្លាក់ជង្គង់។',
    ],
    bulletPointsEn: [
      '💧 Drink 2.5–3L of water daily to promote renal uric acid excretion.',
      '🥦 Safe Proteins & Calcium: Eggs, tofu, moderate freshwater fish, winter melon, pumpkin, and calcium-rich moringa leaves.',
      '🚫 Strictly Avoid During Gout Flare-ups: Beer, alcohol, organ meats (Pak Lov/offal), concentrated bone broths, and fructose-sweetened drinks.',
      '⚖️ Maintain a healthy weight to reduce mechanical stress on knee and ankle joints.',
    ],
    bulletPointsZh: [
      '💧 每日饮水 2.5–3 升，促进肾脏排泄尿酸。',
      '🥦 安全蛋白与补钙食材：鸡蛋、豆腐、适量淡水鱼、冬瓜、南瓜以及富含钙质的辣木叶。',
      '🚫 痛风急性期绝对禁忌：啤酒与一切酒类、动物内脏（卤下水）、浓肉汤及高果糖甜饮料。',
      '⚖️ 控制健康体重，减轻膝关节与踝关节负重。',
    ],
    foodsToChooseKh: ['ស្ងោរត្រឡាច', 'សម្លប្រហើរបន្លែចម្រុះ', 'បបរសត្រី/ស៊ុត', 'ឆាបន្លែគ្រប់មុខដាក់តៅហ៊ូ'],
    foodsToChooseEn: ['Winter Melon Clear Soup', 'Vegetable Samlor Praher', 'Rice Porridge with Egg or Fish', 'Mixed Vegetable & Tofu Stir-Fry'],
    foodsToChooseZh: ['冬瓜清汤', '混合蔬菜清汤', '鸡蛋/生鱼片粥', '豆腐炒什锦蔬菜'],
    foodsToLimitKh: ['ផាក់ឡូវ និងគ្រឿងក្នុងសត្វគ្រប់ប្រភេទ', 'ស្រាបៀរ និងគ្រឿងស្រវឹង', 'គ្រឿងសមុទ្រ (ក្តាម បង្គា មឹក ងាវ) ច្រើនពេក', 'សាច់គោ និងទឹកស៊ុបរំងាស់ឆ្អឹងខាប់'],
    foodsToLimitEn: ['Braised offal (Pak Lov) & organ meats', 'Beer & all alcohol', 'Large portions of shellfish & seafood', 'Heavy red meat & concentrated bone broths'],
    foodsToLimitZh: ['卤内脏与一切动物内脏', '啤酒与所有酒类', '大量虾蟹贝类海鲜', '大量红肉与浓骨头汤'],
    drinksKh: 'ទឹកស្អាត ២.៥-៣ លីត្រ/ថ្ងៃ ទឹកដោះគោខ្លាញ់ទាប (ជួយបញ្ចុះអាស៊ីតអ៊ុយរិក) ឬទឹកក្រូចឆ្មាស្រស់អត់ស្ករ។ ហាមផឹកស្រាបៀរ និងភេសជ្ជៈផ្អែម។',
    drinksEn: '2.5–3L plain water, low-fat milk (helps lower uric acid), or water with fresh lime. Strictly avoid beer and sugary sodas.',
    drinksZh: '每日 2.5–3 升白开水、低脂牛奶（有助于促尿酸排泄）或淡柠檬水。严禁啤酒和甜饮料。',
    fruitsKh: 'ត្របែក ក្រូច ផ្លែប៉ោម ចេក និងល្ហុងទុំ (សម្បូរវីតាមីន C ជួយបញ្ចុះអាស៊ីតអ៊ុយរិក)។',
    fruitsEn: 'Guava, oranges, apples, bananas, and ripe papaya (Vitamin C supports uric acid reduction).',
    fruitsZh: '番石榴、橙子、苹果、香蕉和熟木瓜（富含维生素 C 有助于降尿酸）。',
    morningMealKh: 'អាហារពេលព្រឹក៖ បបរស៊ុត ឬបបរត្រីរ៉ស់ ជាមួយទឹកស្អាត ២ កែវ។',
    morningMealEn: 'Breakfast: Egg or fish rice porridge with 2 glasses of water.',
    morningMealZh: '早餐：鸡蛋粥或生鱼片粥，配 2 杯温开水。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ ស្ងោរត្រឡាច ឬសម្លប្រហើរបន្លែចម្រុះដាក់តៅហ៊ូ/ស៊ុត ជាមួយបាយសម្រូប។',
    eveningMealEn: 'Dinner: Winter melon soup or vegetable soup with tofu/egg and brown rice.',
    eveningMealZh: '晚餐：冬瓜清汤或豆腐蔬菜汤配糙米饭。',
    medicationCareKh: 'ហាមទិញ «ថ្នាំชุด» ឬថ្នាំបំបាត់ការឈឺសន្លាក់លាយស្តេរ៉ូអ៊ីត (Steroids/Dexamethasone) និង NSAIDs លេបប្រចាំដោយគ្មានវេជ្ជបញ្ជា ព្រោះវាធ្វើឱ្យធ្លុះក្រពះ និងខូចតម្រងនោម! សូមពិគ្រោះជាមួយគ្រូពេទ្យអំពីថ្នាំបញ្ចុះអាស៊ីតអ៊ុយរិក (ដូចជា Allopurinol)។',
    medicationCareEn: 'Never take unlabelled multi-pill joint pain packets ("Thnam Chut") containing hidden steroids and NSAIDs, which cause stomach ulcers and kidney failure! Consult a doctor for safe uric-acid-lowering therapy.',
    medicationCareZh: '切勿购买不明成分的“关节止痛药包”（常隐含激素与强效止痛药，极易导致胃穿孔与肾衰竭）！请在医生指导下规范使用降尿酸药物（如别嘌醇）。',
    redFlagsKh: 'ត្រូវទៅមន្ទីរពេទ្យប្រសិនបើ៖ សន្លាក់ហើមក្រហមក្ដៅខ្លាំងរួមជាមួយក្ដៅខ្លួនរងាញាក់ (សង្ស័យឆ្លងមេរោគក្នុងសន្លាក់ Septic arthritis) ឬឈឺសន្លាក់រាលដាលមិនអាចដើរបាន។',
    redFlagsEn: 'Seek urgent medical care if a joint is intensely swollen, red, and hot accompanied by high fever/chills (rule out septic arthritis).',
    redFlagsZh: '若关节剧烈红肿热痛并伴有高烧寒战（需紧急排查化脓性关节炎）或无法行走，请立即就医。',
    recoveryTimelineKh: 'ការហើមឈឺសន្លាក់ Gout ស្រួចស្រាវភាគច្រើនធូរស្រាលក្នុង ៣-៧ ថ្ងៃ ហើយការតមអាហារមាន Purine ខ្ពស់ជួយការពារកុំឱ្យលាប់ឡើងវិញ។',
    recoveryTimelineEn: 'Acute gout flares subside in 3–7 days with proper care; long-term low-purine hydration prevents recurrences.',
    recoveryTimelineZh: '急性痛风发作通常在 3–7 天内缓解，长期坚持低嘌呤饮食与多喝水可预防复发。',
    followUpSuggestionsKh: [
      'តើអ្នកលើសអាស៊ីតអ៊ុយរិក អាចញ៉ាំសាច់មាន់ ឬត្រីបានទេ?',
      'ហេតុអ្វីស្រាបៀរធ្វើឱ្យឈឺសន្លាក់ Gout ភ្លាមៗ?',
      'តើអាហារអ្វីខ្លះសម្បូរកាល់ស្យូមជួយបំប៉នឆ្អឹង និងជង្គង់?',
      'ហេតុអ្វីការលេបថ្នាំឈឺសន្លាក់ (ថ្នាំชุด) គ្រោះថ្នាក់ដល់ក្រពះ និងតម្រងនោម?',
    ],
    followUpSuggestionsEn: [
      'Can I eat chicken or freshwater fish if I have high uric acid?',
      'Why does beer trigger acute gout attacks so quickly?',
      'Which Cambodian foods are richest in calcium for bone strength?',
      'Why are unprescribed joint pain pill packets dangerous for kidneys?',
    ],
    followUpSuggestionsZh: [
      '高尿酸或痛风患者可以吃鸡肉或淡水鱼吗？',
      '为什么喝啤酒最容易诱发痛风急性发作？',
      '哪些柬埔寨食材富含钙质有助于强健骨骼？',
      '为什么滥用散装关节止痛药会严重伤胃和伤肾？',
    ],
  },
  // 13. HEADACHE, MIGRAINE, INSOMNIA, FATIGUE & STRESS (ឈឺក្បាល / គេងមិនលក់ / អស់កម្លាំង / ស្ត្រេស)
  {
    topicId: 'qa-headache-sleep-stress',
    goalId: 'immunity_herbs',
    safetyLevel: 'standard',
    keywords: [
      'ឈឺក្បាល', 'ប្រកាំង', 'គេងមិនលក់', 'អស់កម្លាំង', 'ស្ត្រេស', 'តានតឹង', 'ល្វើយ',
      'headache', 'migraine', 'insomnia', 'sleep', 'fatigue', 'tired', 'stress', 'anxiety',
      '头痛', '偏头痛', '失眠', '睡眠', '疲劳', '乏力', '压力',
    ],
    badgeKh: '😴 ការថែទាំបញ្ហាឈឺក្បាល គេងមិនលក់ អស់កម្លាំង & បន្ថយស្ត្រេស',
    badgeEn: '😴 Headache, Sleep Quality, Fatigue & Stress Nutrition Guide',
    badgeZh: '😴 头痛、失眠、疲劳与减压营养指南',
    topicNameKh: 'អាការៈឈឺក្បាល គេងមិនលក់ និងអស់កម្លាំង',
    topicNameEn: 'Headache, Insomnia & Chronic Fatigue',
    topicNameZh: '头痛、失眠与慢性疲劳',
    summaryKh:
      'អាការៈឈឺក្បាល អស់កម្លាំង និងគេងមិនលក់ ភាគច្រើនទាក់ទងនឹងការខ្សោះជាតិទឹក ការផឹកកាហ្វេអ៊ីន/ភេសជ្ជៈប៉ូវកម្លាំងនៅពេលរសៀល ការខ្វះម៉ាញ៉េស្យូម (Magnesium) និងវីតាមីន B។ គួរបង្កើនអាហារសម្បូរម៉ាញ៉េស្យូម និង Tryptophan (ត្រី បន្លែបៃតង គ្រាប់ធញ្ញជាតិ ចេក គ្រាប់ឈូក) និងផឹកទឹកស្លឹកគ្រៃក្តៅឧណ្ហៗមុនចូលគេង។',
    summaryEn:
      'Headaches, fatigue, and poor sleep are frequently linked to dehydration, afternoon caffeine/energy drinks, and low magnesium or B-vitamins. Favor magnesium- and tryptophan-rich Cambodian foods (fish, leafy greens, lotus seeds, bananas) and warm herbal infusions in the evening.',
    summaryZh:
      '头痛、疲劳与失眠常与饮水不足、下午饮用咖啡或提神饮料、以及缺乏镁和 B 族维生素有关。建议多摄入富含镁与色氨酸的食材（淡水鱼、深绿蔬菜、莲子、香蕉），并在睡前饮用温热草本茶。',
    bulletPointsKh: [
      '💧 ផឹកទឹកស្អាត ២ លីត្រ/ថ្ងៃ៖ ការខ្វះជាតិទឹកគឺជាមូលហេតុទូទៅបំផុតមួយនៃការឈឺក្បាល និងអស់កម្លាំង។',
      '🍌 អាហារជួយឱ្យគេងលក់ស្រួល៖ ចេកណាំវ៉ា គ្រាប់ឈូក ល្ពៅ ត្រីចំហុយ ស៊ុត និងបាយសម្រូប សម្បូរម៉ាញ៉េស្យូម និងវីតាមីន B6។',
      '🚫 បញ្ឈប់ការផឹកកាហ្វេ តែចាស់ និងភេសជ្ជៈប៉ូវកម្លាំងក្រោយម៉ោង ២ រសៀល។',
      '🩺 ប្រសិនបើឈឺក្បាលញឹកញាប់ គួរវាស់សម្ពាធឈាម ដើម្បីពិនិត្យមើលក្រែងមានជំងឺលើសឈាម។',
    ],
    bulletPointsEn: [
      '💧 Hydrate First: Mild dehydration is one of the most common triggers for tension headaches and daytime fatigue.',
      '🍌 Sleep-Supporting Foods: Bananas, lotus seeds, pumpkin, steamed fish, eggs, and brown rice supply magnesium and Vitamin B6.',
      '🚫 Cut off coffee, strong tea, and energy drinks after 2:00 PM.',
      '🩺 Check your blood pressure whenever experiencing frequent headaches.',
    ],
    bulletPointsZh: [
      '💧 优先补水：轻度脱水是引起紧张性头痛与日间疲劳最常见的原因之一。',
      '🍌 助眠营养食材：香蕉、莲子、南瓜、清蒸鱼、鸡蛋和糙米，富含镁元素与维生素 B6。',
      '🚫 下午 2 点后不再饮用咖啡、浓茶或功能性提神饮料。',
      '🩺 经常头痛者建议测量血压，排查是否由高血压引起。',
    ],
    foodsToChooseKh: ['សម្លប្រហើរស្លឹកម្រុំ', 'ស្ងោរជ្រក់ត្រីរ៉ស់', 'បបរគ្រាប់ឈូក/ស៊ុបមាន់ក្តៅៗ', 'ចេកណាំវ៉ា & ល្ពៅចំហុយ'],
    foodsToChooseEn: ['Moringa Samlor Praher', 'Clear Lemongrass Fish Soup', 'Warm Lotus Seed or Chicken Soup', 'Ripe Banana & Steamed Pumpkin'],
    foodsToChooseZh: ['辣木叶蔬菜汤', '香茅清鱼汤', '温热莲子汤/鸡汤', '熟香蕉与蒸南瓜'],
    foodsToLimitKh: ['ភេសជ្ជៈប៉ូវកម្លាំង និងកាហ្វេពេលល្ងាច', 'អាហារដាក់ប៊ីចេង (MSG) ច្រើនពេក', 'គ្រឿងស្រវឹង និងអាហារហឹរខ្លាំងពេលយប់'],
    foodsToLimitEn: ['Energy drinks & late-afternoon coffee', 'Foods with heavy MSG', 'Alcohol & heavy spicy meals late at night'],
    foodsToLimitZh: ['功能性饮料与傍晚喝咖啡', '味精（MSG）过重的食物', '酒精与夜间重辣宵夜'],
    drinksKh: 'ទឹកស្អាត ២ លីត្រ/ថ្ងៃ ទឹកស្លឹកគ្រៃក្តៅឧណ្ហៗ ឬទឹកដោះគោក្តៅឧណ្ហៗ ១ កែវតូចមុនចូលគេង។',
    drinksEn: '2L plain water daily, warm caffeine-free lemongrass infusion, or a small glass of warm milk before bed.',
    drinksZh: '每日 2 升白开水，睡前可饮一杯无咖啡因的温热香茅茶或温牛奶。',
    fruitsKh: 'ចេកណាំវ៉ា ផ្លែបឺរ ល្ហុងទុំ ក្រូច និងផ្លែប៉ោម។',
    fruitsEn: 'Bananas, avocado, ripe papaya, oranges, and apples.',
    fruitsZh: '香蕉、牛油果、熟木瓜、橙子和苹果。',
    morningMealKh: 'អាហារពេលព្រឹក៖ បបរសាច់មាន់ ឬនំបញ្ចុកសម្លប្រហើរ ជាមួយស៊ុតស្ងោរ ១ គ្រាប់ ដើម្បីផ្តល់ថាមពលពេញមួយព្រឹក។',
    morningMealEn: 'Breakfast: Chicken porridge or Num Banh Chok with a boiled egg for steady morning energy.',
    morningMealZh: '早餐：鸡肉粥或高棉草本米粉配水煮蛋，提供持久晨间能量。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ ស្ងោរត្រឡាច ឬត្រីចំហុយខ្ញី ជាមួយបាយសម្រូបតិចល្មម មុនម៉ោង ៧ យប់។',
    eveningMealEn: 'Dinner: Light winter melon soup or steamed fish with brown rice before 7 PM.',
    eveningMealZh: '晚餐：晚 7 点前食用冬瓜清汤或姜丝蒸鱼配适量糙米饭。',
    medicationCareKh: 'ប្រសិនបើឈឺក្បាល អាចប្រើ Paracetamol តាមកម្រិតណែនាំ តែកុំលេបថ្នាំបំបាត់ឈឺក្បាលលើសពី ២-៣ ដង/សប្តាហ៍ជាប់ៗគ្នា (ព្រោះអាចបង្កជាឈឺក្បាលដោយសារស៊ាំថ្នាំ) និងហាមប្រើថ្នាំងងុយគេងដោយគ្មានវេជ្ជបញ្ជា។',
    medicationCareEn: 'Occasional Paracetamol is safe, but using painkillers >2–3 days/week can cause medication-overuse headaches. Never take sedative sleeping pills without a prescription.',
    medicationCareZh: '偶发头痛可按量服用对乙酰氨基酚，但切忌每周超过 2–3 天频繁服用止痛药（易致药物过度使用性头痛），且勿自行滥用安眠药。',
    redFlagsKh: 'សញ្ញាអាសន្នត្រូវទៅមន្ទីរពេទ្យភ្លាម៖ ឈឺក្បាលខ្លាំងភ្លាមៗដូចរន្ទះបាញ់ ឈឺក្បាលរួមជាមួយក្ដៅខ្លួនរឹងក វៀចមាត់ ស្ពឹកដៃជើង ស្រវាំងភ្នែក ឬឈឺក្បាលក្រោយបោកក្បាល។',
    redFlagsEn: 'EMERGENCY RED FLAGS: Sudden thunderclap headache, headache with fever/stiff neck, facial droop, limb weakness, vision loss, or post-head injury.',
    redFlagsZh: '急诊红旗信号：突发剧烈雷击样头痛、头痛伴高烧颈部僵硬、口角歪斜、肢体无力、视力骤降或头部外伤后头痛。',
    recoveryTimelineKh: 'ការកាត់បន្ថយកាហ្វេអ៊ីនពេលរសៀល និងគេងឱ្យទៀងម៉ោង ជួយឱ្យដំណេក និងថាមពលប្រសើរឡើងក្នុង ៥-១០ ថ្ងៃ។',
    recoveryTimelineEn: 'Cutting afternoon caffeine and keeping a regular sleep schedule improves sleep and energy within 5–10 days.',
    recoveryTimelineZh: '戒除下午咖啡因并保持规律作息，通常在 5–10 天内明显改善睡眠与精神状态。',
    followUpSuggestionsKh: [
      'តើគួរផឹកទឹក ឬភេសជ្ជៈអ្វីនៅពេលយប់ដើម្បីឱ្យគេងលក់ស្រួល?',
      'តើរោគសញ្ញាឈឺក្បាលបែបណាដែលអាចជាសញ្ញាដាច់សរសៃឈាមខួរក្បាល?',
      'តើអាហារអ្វីខ្លះជួយបំបាត់ការអស់កម្លាំង និងស្ត្រេស?',
      'ហេតុអ្វីញ៉ាំប៊ីចេង ឬកាហ្វេច្រើនធ្វើឱ្យឈឺក្បាល?',
    ],
    followUpSuggestionsEn: [
      'What warm evening drink helps me fall asleep naturally?',
      'Which headache symptoms warn of a stroke or emergency?',
      'What foods best fight daytime fatigue and stress?',
      'Why can excess MSG or caffeine trigger migraines?',
    ],
    followUpSuggestionsZh: [
      '晚上喝什么温热饮品最有助于自然入睡？',
      '什么样的头痛可能是脑卒中等急症信号？',
      '吃什么食物最能缓解疲劳与精神压力？',
      '为什么摄入过多味精或咖啡因会诱发偏头痛？',
    ],
  },

  // 14. PREGNANCY, BREASTFEEDING & POSTPARTUM (មានផ្ទៃពោះ / បំបៅដោះកូន / សរសៃខ្ចី)
  {
    topicId: 'qa-pregnancy-postpartum',
    goalId: 'gut_fiber',
    safetyLevel: 'high_risk_care',
    keywords: [
      'មានផ្ទៃពោះ', 'ផ្ទៃពោះ', 'បំបៅដោះកូន', 'សរសៃខ្ចី', 'ក្រោយសម្រាល', 'ទារកក្នុងផ្ទៃ',
      'pregnancy', 'pregnant', 'breastfeeding', 'postpartum', 'maternal', 'prenatal', 'folate',
      '怀孕', '孕妇', '产后', '坐月子', '哺乳期', '叶酸',
    ],
    badgeKh: '🫄 អាហារូបត្ថម្ភសម្រាប់ស្ត្រីមានផ្ទៃពោះ បំបៅដោះកូន & សរសៃខ្ចី',
    badgeEn: '🫄 Pregnancy, Breastfeeding & Postpartum Maternal Nutrition',
    badgeZh: '🫄 孕期、产后与哺乳期临床营养指南',
    topicNameKh: 'សុខភាពស្ត្រីមានផ្ទៃពោះ និងបំបៅដោះកូន',
    topicNameEn: 'Pregnancy & Maternal Nutrition',
    topicNameZh: '孕期与产后哺乳营养',
    summaryKh:
      'ស្ត្រីមានផ្ទៃពោះ និងស្ត្រីបំបៅដោះកូន ត្រូវការអាហារសម្បូរជាតិដែក (Iron) អាស៊ីតហ្វូលិក (Folate) កាល់ស្យូម អ៊ីយ៉ូត និងប្រូតេអ៊ីនឆ្អិនល្អ ១០០% (ដូចជា សម្លកកូរស្លឹកម្រុំ ឆាខ្ញីសាច់មាន់ ត្រីទឹកសាបចំហុយ ស៊ុត និងទឹកដោះគោ) ដោយចៀសវាងការតមអាហារហួសហេតុពេលសរសៃខ្ចី។',
    summaryEn:
      'Pregnant and breastfeeding mothers need extra iron, folate, calcium, iodine, and 100% thoroughly cooked protein (Moringa Samlor Korko, ginger chicken, steamed fish, eggs, pasteurized dairy), while avoiding restrictive postpartum food taboos.',
    summaryZh:
      '孕期与哺乳期女性需要充足的铁、叶酸、钙、碘及 100% 彻底煮熟的优质蛋白（如辣木叶杂菜汤、仔姜鸡肉、清蒸淡水鱼、鸡蛋和巴氏杀菌奶），产后恢复期应避免过度忌口导致营养不良。',
    bulletPointsKh: [
      '🌿 ស្លឹកម្រុំ និងបន្លែបៃតងចាស់៖ ជួយផ្តល់អាស៊ីតហ្វូលិក ជាតិដែក និងជួយបង្កើនទឹកដោះម្តាយតាមបែបធម្មជាតិ។',
      '🍲 ចម្អិនអាហារឱ្យឆ្អិនល្អ ១០០%៖ ហាមញ៉ាំសាច់ឆៅ ភ្លាឆៅ ស៊ុតជ័រព្នៅ ឬប្រហុកឆៅ ដើម្បីការពារការឆ្លងមេរោគទៅទារក។',
      '💊 លេបគ្រាប់ថ្នាំជាតិដែក និងអាស៊ីតហ្វូលិកតាមការណែនាំរបស់ឆ្មប ឬគ្រូពេទ្យជំនាញ។',
      '🚫 តមគ្រឿងស្រវឹងដាច់ខាត កាត់បន្ថយកាហ្វេអ៊ីន និងហាមប្រើថ្នាំពេទ្យ ឬថ្នាំបុរាណត្រាំស្រាដោយគ្មានវេជ្ជបញ្ជា។',
    ],
    bulletPointsEn: [
      '🌿 Moringa & Dark Leafy Greens: Supply folate and iron for fetal development and naturally support breastmilk production.',
      '🍲 100% Thoroughly Cooked: Strictly avoid raw meat/fish salads (raw Pleah), runny eggs, and unpasteurized foods.',
      '💊 Take prescribed prenatal folic acid and iron supplements consistently.',
      '🚫 Zero alcohol, minimal caffeine, and no unprescribed medications or herbal alcohol tonics.',
    ],
    bulletPointsZh: [
      '🌿 辣木叶与深色绿叶菜：富含叶酸与铁质，促进胎儿神经发育并有助于产后自然催乳。',
      '🍲 食物必须 100% 煮熟：严禁生食肉类、生鱼沙拉、溏心蛋或未经巴氏杀菌的食品。',
      '💊 按产科医生指导规律补充叶酸与铁剂。',
      '🚫 严禁饮酒（包括产后药酒），限制咖啡因，切勿擅自服用任何药物。',
    ],
    foodsToChooseKh: ['សម្លកកូរត្រីស្លឹកម្រុំ', 'ឆាខ្ញីសាច់មាន់', 'ស្ងោរត្រឡាចត្រីរ៉ស់', 'អាម៉ុកត្រីចំហុយឆ្អិនល្អ', 'បបរមាន់ដាក់ស៊ុត'],
    foodsToChooseEn: ['Samlor Korko with Moringa', 'Ginger Chicken Stir-Fry', 'Winter Melon Fish Soup', 'Well-Steamed Fish Amok', 'Chicken & Egg Porridge'],
    foodsToChooseZh: ['辣木叶高棉杂菜汤', '仔姜炒鸡肉', '冬瓜生鱼汤', '全熟清蒸阿莫克鱼', '鸡肉加蛋热粥'],
    foodsToLimitKh: ['ភ្លាសាច់ឆៅ ងាវស្រុសមិនឆ្អិន និងប្រហុកឆៅ', 'គ្រឿងស្រវឹង និងស្រាថ្នាំបុរាណ', 'កាហ្វេចាស់ និងភេសជ្ជៈប៉ូវកម្លាំង', 'អាហារប្រៃខ្លាំងដែលធ្វើឱ្យហើមជើង'],
    foodsToLimitEn: ['Raw beef/seafood salads & undercooked cockles', 'Alcohol & herbal wine tonics', 'Strong coffee & energy drinks', 'Excessively salty foods causing edema'],
    foodsToLimitZh: ['生牛肉沙拉、半生血蛤与生鱼酱', '一切酒精与产后药酒', '浓咖啡与功能性饮料', '易加重孕期水肿的高盐食物'],
    drinksKh: 'ទឹកស្អាត ២.៥ លីត្រ/ថ្ងៃ (ពិសេសអ្នកបំបៅដោះកូន) ទឹកដោះគោឆ្អិនល្អ និងទឹកស៊ុបក្តៅឧណ្ហៗ។',
    drinksEn: '2.5L plain water daily (especially while breastfeeding), pasteurized milk, and warm soups.',
    drinksZh: '每日 2.5 升白开水（哺乳期尤为重要）、巴氏杀菌牛奶及温热汤水。',
    fruitsKh: 'ក្រូចពោធិ៍សាត់ ល្ហុងទុំ ចេកណាំវ៉ាទុំ ផ្លែប៉ោម ត្របែក និងផ្លែបឺរ។',
    fruitsEn: 'Oranges, ripe papaya, ripe bananas, apples, guava, and avocado.',
    fruitsZh: '橙子、熟木瓜、熟香蕉、苹果、番石榴和牛油果。',
    morningMealKh: 'អាហារពេលព្រឹក៖ បបរសាច់មាន់ដាក់ស៊ុតឆ្អិនល្អ + ទឹកដោះគោ ១ កែវ + ផ្លែក្រូច។',
    morningMealEn: 'Breakfast: Well-cooked chicken & egg porridge + 1 glass of milk + orange.',
    morningMealZh: '早餐：全熟鸡肉鸡蛋粥 + 1 杯牛奶 + 橙子。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ សម្លកកូរត្រីស្លឹកម្រុំ និងឆាខ្ញីសាច់មាន់ ជាមួយបាយសម្រូប។',
    eveningMealEn: 'Dinner: Moringa Samlor Korko and ginger chicken with brown rice.',
    eveningMealZh: '晚餐：辣木叶杂菜汤配仔姜炒鸡肉及糙米饭。',
    medicationCareKh: 'គ្រប់ថ្នាំពេទ្យទាំងអស់ក្នុងអំឡុងពេលមានផ្ទៃពោះ និងបំបៅដោះកូន ត្រូវតែមានវេជ្ជបញ្ជាពីគ្រូពេទ្យជំនាញសម្ភព។ ហាមផឹកស្រាថ្នាំពេលសរសៃខ្ចី ព្រោះជាតិអាល់កុលឆ្លងតាមទឹកដោះទៅប៉ះពាល់ខួរក្បាលទារក!',
    medicationCareEn: 'Every medication during pregnancy or lactation must be approved by an obstetrician. Never drink herbal alcohol tonics postpartum, as alcohol passes into breastmilk.',
    medicationCareZh: '孕期与哺乳期使用任何药物均须经产科医生批准。产后严禁饮用传统药酒，因为酒精会通过母乳伤害婴儿大脑与肝脏！',
    redFlagsKh: 'សញ្ញាគ្រោះថ្នាក់ពេលមានផ្ទៃពោះត្រូវទៅមន្ទីរពេទ្យភ្លាម៖ ធ្លាក់ឈាមតាមទ្វារមាស ឈឺពោះខ្លាំង ហើមមុខ/ដៃជើងខ្លាំង ឈឺក្បាលស្រវាំងភ្នែក (សង្ស័យបម្រុងក្រឡាភ្លើង) ក្ដៅខ្លួន ឬទារកក្នុងផ្ទៃកម្រើកតិចជាងធម្មតា។',
    redFlagsEn: 'OBSTETRIC EMERGENCY RED FLAGS: Vaginal bleeding, severe abdominal pain, sudden facial/hand swelling with headache/blurred vision (preeclampsia), fever, or reduced fetal movement.',
    redFlagsZh: '孕期急诊红旗信号：阴道出血、剧烈腹痛、面部手脚突发水肿伴头痛眼花（警惕子痫前期）、高烧或胎动明显减少。',
    recoveryTimelineKh: 'ការពិនិត្យផ្ទៃពោះឱ្យគ្រប់តាមការណាត់ និងរបបអាហារសម្បូរជីវជាតិ ជួយឱ្យម្តាយ និងទារកមានសុខភាពល្អរឹងមាំ។',
    recoveryTimelineEn: 'Regular prenatal visits and balanced maternal nutrition ensure safe pregnancy and postpartum recovery.',
    recoveryTimelineZh: '定期产检与均衡营养可保障母婴安全与产后顺利恢复。',
    followUpSuggestionsKh: [
      'តើស្ត្រីបំបៅដោះកូន គួរញ៉ាំម្ហូបអ្វីដើម្បីឱ្យសម្បូរទឹកដោះ?',
      'តើធ្វើដូចម្តេចដើម្បីបន្ថយអាការៈចាញ់កូន (ក្អួតចង្អោរ) ពេលព្រឹក?',
      'ហេតុអ្វីស្ត្រីសរសៃខ្ចី មិនគួរតមបន្លែ ឬផឹកស្រាថ្នាំ?',
      'តើសញ្ញាអ្វីខ្លះពេលមានផ្ទៃពោះដែលត្រូវទៅមន្ទីរពេទ្យបន្ទាន់?',
    ],
    followUpSuggestionsEn: [
      'Which Cambodian dishes naturally boost breastmilk supply?',
      'How can I relieve morning sickness and nausea safely?',
      'Why should postpartum mothers avoid herbal alcohol and strict food taboos?',
      'What pregnancy warning signs require immediate hospital care?',
    ],
    followUpSuggestionsZh: [
      '哺乳期吃什么柬式菜肴最有助于下奶？',
      '孕早期孕吐恶心该如何通过饮食缓解？',
      '为什么产后坐月子不能喝药酒或过度忌口蔬菜？',
      '孕期出现哪些危险症状必须马上去医院？',
    ],
  },

  // 15. DENGUE FEVER, TYPHOID & TROPICAL FEVER (គ្រុនឈាម / គ្រុនពោះវៀន / គ្រុនចាញ់)
  {
    topicId: 'qa-dengue-tropical-fever',
    goalId: 'light_digest',
    safetyLevel: 'urgent',
    keywords: [
      'គ្រុនឈាម', 'គ្រុនពោះវៀន', 'គ្រុនចាញ់', 'ប្លាកែត', 'មូសខ្លា',
      'dengue', 'typhoid', 'malaria', 'platelets', 'tropical fever',
      '登革热', '伤寒', '疟疾', '血小板', '热带病',
    ],
    badgeKh: '🦟 ការប្រុងប្រយ័ត្នជំងឺគ្រុនឈាម គ្រុនពោះវៀន & ការថែទាំអាហារូបត្ថម្ភ',
    badgeEn: '🦟 Dengue Fever & Typhoid Clinical Care & Hydration Guide',
    badgeZh: '🦟 登革热与伤寒临床护理及补液饮食指南',
    topicNameKh: 'ជំងឺគ្រុនឈាម និងគ្រុនពោះវៀន',
    topicNameEn: 'Dengue Fever & Typhoid Care',
    topicNameZh: '登革热与伤寒护理',
    summaryKh:
      '⚠️ សំខាន់ណាស់៖ ប្រសិនបើក្ដៅខ្លួនខ្លាំងភ្លាមៗ (39–40°C) ឈឺក្បាល ឈឺប្រឡង់ភ្នែក ឈឺសាច់ដុំ ឬមានស្នាមអុចក្រហម សូមទៅពិនិត្យឈាមនៅមន្ទីរពេទ្យដើម្បីរកជំងឺគ្រុនឈាម ឬគ្រុនពោះវៀន! ហាមប្រើថ្នាំបំបាត់ការឈឺចាប់ NSAIDs (Aspirin ឬ Ibuprofen) ដាច់ខាតពេលសង្ស័យគ្រុនឈាម ព្រោះវាធ្វើឱ្យហូរឈាមធ្ងន់ធ្ងរ! ត្រូវផឹកទឹកអូរ៉ាលីត (ORS) ទឹកដូង និងញ៉ាំបបរទន់ៗ។',
    summaryEn:
      '⚠️ URGENT: Sudden high fever (39–40°C) with retro-orbital headache, muscle pain, or rash requires a hospital blood test for Dengue or Typhoid! NEVER take Aspirin, Ibuprofen, or NSAIDs if dengue is suspected (severe bleeding risk). Focus on ORS, coconut water, and soft porridges.',
    summaryZh:
      '⚠️ 重要警示：若突发高烧（39–40°C）伴眼眶痛、全身肌肉酸痛或皮疹，请立即就医查血排查登革热或伤寒！疑似登革热时严禁服用阿司匹林或布洛芬（会引发严重内出血）！护理核心是频繁补充口服补液盐（ORS）、椰子水和软烂米粥。',
    bulletPointsKh: [
      '🚫 ហាមដាច់ខាត៖ មិនត្រូវលេបថ្នាំ Aspirin, Ibuprofen, Diclofenac ឬថ្នាំชุด ពេលក្ដៅខ្លួនសង្ស័យគ្រុនឈាមឡើយ (ប្រើបានតែ Paracetamol តាមកម្រិតវេជ្ជបញ្ជាប៉ុណ្ណោះ)។',
      '💧 បំពេញជាតិទឹកឱ្យបានច្រើន៖ ផឹកទឹកអូរ៉ាលីត (ORS) ទឹកដូងស្រស់ ទឹកផ្លែឈើស្រស់ និងទឹកស៊ុប ដើម្បីការពារការខាប់ឈាម (Hemoconcentration)។',
      '🥣 ញ៉ាំអាហារទន់ងាយរំលាយ៖ បបរត្រី បបរមាន់ ស្ងោរត្រឡាច និងជៀសវាងអាហារពណ៌ខ្មៅ/ក្រហមដិត (ដើម្បីកុំឱ្យច្រឡំជាមួយឈាមពេលក្អួត ឬបន្ទោរបង់)។',
    ],
    bulletPointsEn: [
      '🚫 STRICT MEDICATION RULE: Never take Aspirin, Ibuprofen, or NSAIDs during suspected dengue fever—use only Paracetamol as directed by a doctor.',
      '💧 Aggressive Oral Hydration: Sip ORS, fresh coconut water, and clear soups continuously to prevent plasma leakage shock.',
      '🥣 Soft Foods & Clear Colors: Eat fish or chicken porridge; avoid dark red/black foods that could mask gastrointestinal bleeding.',
    ],
    bulletPointsZh: [
      '🚫 用药铁律：疑似登革热期间绝对禁用阿司匹林、布洛芬等非甾体抗炎药（仅可在医生指导下使用对乙酰氨基酚退热）。',
      '💧 积极口服补液：持续小口饮用口服补液盐（ORS）、新鲜椰子水和清汤，预防血浆渗漏休克。',
      '🥣 软食且避免深色食物：食用鱼片粥或鸡肉粥；避免吃红色、黑色食物（以免与消化道出血混淆）。',
    ],
    foodsToChooseKh: ['ទឹកអូរ៉ាលីត (ORS) & ទឹកដូងស្រស់', 'បបរត្រីរ៉ស់ក្តៅឧណ្ហៗ', 'បបរសាច់មាន់ចិញ្ច្រាំ', 'ស្ងោរត្រឡាច', 'ល្ហុងទុំ & ក្រូចពោធិ៍សាត់'],
    foodsToChooseEn: ['ORS & Fresh Coconut Water', 'Warm Fish Porridge', 'Minced Chicken Porridge', 'Winter Melon Clear Soup', 'Ripe Papaya & Oranges'],
    foodsToChooseZh: ['口服补液盐 (ORS) 与新鲜椰子水', '温热生鱼片粥', '鸡肉末粥', '冬瓜清汤', '熟木瓜与橙子'],
    foodsToLimitKh: ['ថ្នាំ Aspirin / Ibuprofen (គ្រោះថ្នាក់ហូរឈាម)', 'អាហារពណ៌ក្រហម/ខ្មៅដិតពេលកំពុងឈឺគ្រុនឈាម', 'អាហាររឹង បំពង និងហឹរ'],
    foodsToLimitEn: ['Aspirin / Ibuprofen / NSAIDs', 'Dark red/black foods during dengue monitoring', 'Hard, fried, or spicy foods'],
    foodsToLimitZh: ['阿司匹林与布洛芬（引发出血）', '深红或黑色食物（干扰出血观察）', '坚硬、油炸与辛辣食物'],
    drinksKh: 'ទឹកអូរ៉ាលីត (ORS) ទឹកដូងស្រស់ ទឹកបបរស និងទឹកក្រូចច្របាច់ស្រស់។',
    drinksEn: 'ORS, fresh coconut water, rice water, and fresh orange juice.',
    drinksZh: '口服补液盐（ORS）、新鲜椰子水、米汤和鲜榨橙汁。',
    fruitsKh: 'ល្ហុងទុំ ក្រូចពោធិ៍សាត់ ត្របែកទុំ និងចេកណាំវ៉ា។',
    fruitsEn: 'Ripe papaya, oranges, soft guava, and bananas.',
    fruitsZh: '熟木瓜、橙子、熟番石榴和香蕉。',
    morningMealKh: 'អាហារពេលព្រឹក៖ បបរសាច់មាន់ ឬបបរត្រីរ៉ស់ក្តៅឧណ្ហៗ + ទឹកដូងស្រស់ ឬទឹកអូរ៉ាលីត។',
    morningMealEn: 'Breakfast: Warm chicken or fish porridge + fresh coconut water or ORS.',
    morningMealZh: '早餐：温热鸡肉粥或生鱼粥 + 新鲜椰子水或口服补液盐。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ ស្ងោរត្រឡាចត្រីរ៉ស់ជាមួយបបរសទន់ៗ។',
    eveningMealEn: 'Dinner: Winter melon fish soup with soft rice porridge.',
    eveningMealZh: '晚餐：冬瓜鱼片清汤配软白米粥。',
    medicationCareKh: 'ប្រើបានតែ Paracetamol សម្រាប់បញ្ចុះកម្ដៅ និងត្រូវពិនិត្យគ្រាប់ឈាម (CBC / Platelets / Hematocrit) តាមការណាត់របស់គ្រូពេទ្យជារៀងរាល់ថ្ងៃ។',
    medicationCareEn: 'Use only Paracetamol for fever and complete daily CBC/platelet/hematocrit blood checks as ordered by your physician.',
    medicationCareZh: '退烧仅能使用对乙酰氨基酚，并需按医嘱每日复查血常规（监测血小板与血细胞比容）。',
    redFlagsKh: 'សញ្ញាអាសន្នគ្រុនឈាម (ជាពិសេសនៅថ្ងៃទី ៣-៧ ពេលកម្ដៅចាប់ផ្តើមចុះ!)៖ ឈឺពោះខ្លាំង ក្អួតញឹកញាប់ ឈាមអញ្ចាញធ្មេញ/ឈាមច្រមុះ ក្អួតឈាម លាមកខ្មៅ ត្រជាក់ចុងដៃចុងជើង ឬសន្លឹម — ត្រូវបញ្ជូនទៅសង្គ្រោះបន្ទាន់ភ្លាម!',
    redFlagsEn: 'CRITICAL DENGUE WARNING SIGNS (especially Days 3–7 when fever drops!): Severe abdominal pain, persistent vomiting, gum/nose bleeding, black stool, cold clammy extremities, restlessness/lethargy—go to Hospital ER immediately!',
    redFlagsZh: '登革热重症预警信号（尤其在发病第 3–7 天退烧期！）：剧烈腹痛、频繁呕吐、牙龈或鼻腔出血、黑便、四肢湿冷或烦躁嗜睡——必须立即送急诊抢救！',
    recoveryTimelineKh: 'គ្រុនឈាមឆ្លងកាត់ដំណាក់កាលប្រុងប្រយ័ត្នបំផុតនៅថ្ងៃទី ៣-៧ ហើយជាសះស្បើយក្នុង ៧-១០ ថ្ងៃក្រោមការតាមដានរបស់គ្រូពេទ្យ។',
    recoveryTimelineEn: 'Dengue’s critical phase is Days 3–7; full recovery follows in 7–10 days with close medical monitoring.',
    recoveryTimelineZh: '登革热第 3–7 天为最关键的危险观察期，在严密医疗监护下通常于 7–10 天恢复。',
    followUpSuggestionsKh: [
      'ហេតុអ្វីពេលគ្រុនឈាមចុះកម្ដៅនៅថ្ងៃទី ៣-៥ បែរជាត្រូវប្រុងប្រយ័ត្នបំផុត?',
      'ហេតុអ្វីហាមប្រើថ្នាំ Ibuprofen ឬ Aspirin ពេលសង្ស័យគ្រុនឈាម?',
      'តើហេតុអ្វីមិនគួរញ៉ាំអាហារពណ៌ក្រហម ឬខ្មៅពេលកំពុងឈឺគ្រុនឈាម?',
      'ក្រោយជាពីគ្រុនឈាម តើគួរញ៉ាំអ្វីដើម្បីឱ្យមានកម្លាំងឡើងវិញ?',
    ],
    followUpSuggestionsEn: [
      'Why are Days 3–5 when the fever drops the most critical phase in dengue?',
      'Why are Ibuprofen and Aspirin strictly forbidden in dengue fever?',
      'Why should dengue patients avoid dark red or black foods?',
      'What foods best restore strength after recovering from dengue?',
    ],
    followUpSuggestionsZh: [
      '为什么登革热在第 3–5 天退烧时反而是最危险的时期？',
      '为什么疑似登革热严禁服用布洛芬或阿司匹林？',
      '为什么登革热患者不宜吃深红色或黑色的食物？',
      '登革热康复期吃什么最有助于恢复体力？',
    ],
  },

  // 16. FOOD ALLERGY, SKIN RASH & IMMUNITY (អាឡែហ្ស៊ី / រមាស់ / ប្រព័ន្ធភាពស៊ាំ)
  {
    topicId: 'qa-allergy-skin-immunity',
    goalId: 'immunity_herbs',
    safetyLevel: 'urgent',
    keywords: [
      'អាឡែហ្ស៊ី', 'រមាស់', 'កន្ទួលរមាស់', 'ប្រព័ន្ធភាពស៊ាំ', 'ហើមមាត់', 'កមរមាស់',
      'allergy', 'allergic', 'anaphylaxis', 'rash', 'hives', 'eczema', 'itching', 'immunity', 'immune',
      '过敏', '皮肤瘙痒', '荨麻疹', '湿疹', '免疫力', '红疹',
    ],
    badgeKh: '🛡️ ការថែទាំបញ្ហាអាឡែហ្ស៊ីអាហារ កន្ទួលរមាស់ស្បែក & ពង្រឹងប្រព័ន្ធភាពស៊ាំ',
    badgeEn: '🛡️ Food Allergy, Skin Rash & Immune Support Guide',
    badgeZh: '🛡️ 食物过敏、皮肤瘙痒与免疫力营养指南',
    topicNameKh: 'បញ្ហាអាឡែហ្ស៊ី កន្ទួលរមាស់ និងប្រព័ន្ធភាពស៊ាំ',
    topicNameEn: 'Food Allergies, Skin Rash & Immunity',
    topicNameZh: '食物过敏、皮疹与免疫力',
    summaryKh:
      '⚠️ ប្រសិនបើមានប្រតិកម្មអាឡែហ្ស៊ីធ្ងន់ធ្ងរ (Anaphylaxis) ដូចជា ហើមបបូរមាត់/អណ្តាត ពិបាកដកដង្ហើម ណែនបំពង់ក ឬវិលមុខក្រោយញ៉ាំអាហារ ត្រូវទៅមន្ទីរពេទ្យសង្គ្រោះបន្ទាន់ភ្លាម! សម្រាប់អាការៈរមាស់ស្បែក ឬចង់ពង្រឹងប្រព័ន្ធភាពស៊ាំ គួរជៀសវាងអាហារដែលធ្លាប់ធ្វើឱ្យអាឡែហ្ស៊ី (ដូចជាគ្រឿងសមុទ្រ អាហារផ្អាប់) និងញ៉ាំម្ហូបត្រីទឹកសាបស្រស់ៗ បន្លែបៃតង និងរមៀត/ខ្ញី។',
    summaryEn:
      '⚠️ EMERGENCY: If experiencing lip/tongue swelling, throat tightness, wheezing, or dizziness after eating (Anaphylaxis), go to the nearest ER immediately! For mild skin rashes or immune support, avoid trigger allergens (shellfish, fermented pastes) and choose fresh freshwater fish, leafy greens, turmeric, and Vitamin C fruits.',
    summaryZh:
      '⚠️ 紧急提示：若进食后出现嘴唇/舌头肿胀、喉咙发紧、呼吸困难或头晕（严重过敏反应），请立即前往急诊科！针对轻度皮肤瘙痒或增强免疫力，应停食致敏食物（如虾蟹海鲜、发酵腌制品），改吃新鲜淡水鱼、绿叶菜、姜黄与富含维生素 C 的水果。',
    bulletPointsKh: [
      '🚨 សង្គ្រោះបន្ទាន់៖ ហើមមុខ ហើមបំពង់ក ហឺតដង្ហក់ ក្រោយញ៉ាំអាហារ ឬលេបថ្នាំ គឺជាស្ថានភាពអាសន្នត្រូវទៅមន្ទីរពេទ្យភ្លាម។',
      '🦐 តមអាហារបង្កអាឡែហ្ស៊ី និងសារធាតុ Histamine ខ្ពស់៖ គ្រឿងសមុទ្រ (បង្គា ក្តាម មឹក ងាវ) ប្រហុក ផ្អក ត្រីងៀត ទំពាំង និងគ្រឿងស្រវឹងពេលកំពុងរមាស់ស្បែក។',
      '🌿 អាហារប្រឆាំងការរលាក និងពង្រឹងភាពស៊ាំ៖ សម្លប្រហើរស្លឹកម្រុំ ស្ងោរត្រឡាច សាច់ជ្រូក/សាច់មាន់ស្រស់ និងរមៀត/ខ្ញី។',
    ],
    bulletPointsEn: [
      '🚨 Anaphylaxis Rule: Swollen lips/throat or difficulty breathing after food or medicine requires immediate emergency epinephrine/hospital care.',
      '🦐 Avoid High-Histamine Triggers During Rash: Shellfish, fermented fish pastes, dried salted fish, bamboo shoots, and alcohol.',
      '🌿 Anti-Inflammatory Meals: Fresh Moringa soup, winter melon soup, fresh poultry/pork, turmeric, and ginger.',
    ],
    bulletPointsZh: [
      '🚨 过敏急救原则：进食或服药后出现口唇咽喉肿胀、气促喘息，必须立即就医抢救。',
      '🦐 皮疹期间忌口高组胺与发物：虾蟹贝类海鲜、发酵鱼酱、咸鱼、竹笋及酒精。',
      '🌿 抗炎增强免疫饮食：新鲜辣木叶汤、冬瓜清汤、新鲜猪肉/鸡肉及姜黄、生姜。',
    ],
    foodsToChooseKh: ['ស្ងោរត្រឡាចសាច់ជ្រូកចិញ្ច្រាំ', 'សម្លប្រហើរស្លឹកម្រុំ', 'បបរសាច់មាន់ខ្ញីស្រស់', 'ឆាបន្លែបៃតងស្រស់', 'ផ្លែក្រូច & ត្របែក'],
    foodsToChooseEn: ['Winter Melon Minced Pork Soup', 'Fresh Moringa Soup', 'Ginger Chicken Porridge', 'Fresh Green Vegetable Stir-Fry', 'Oranges & Guava'],
    foodsToChooseZh: ['冬瓜肉末清汤', '新鲜辣木叶清汤', '鲜姜鸡肉粥', '清炒时令绿叶菜', '橙子与番石榴'],
    foodsToLimitKh: ['បង្គា ក្តាម មឹក ងាវ (ពេលកំពុងអាឡែហ្ស៊ី/រមាស់)', 'ប្រហុក ផ្អក ម៉ាំ និងអាហារផ្អាប់', 'ទំពាំង និងគ្រឿងស្រវឹង'],
    foodsToLimitEn: ['Shrimp, crab, squid & cockles (during rash/allergy)', 'Fermented pastes & pickled foods', 'Bamboo shoots & alcohol'],
    foodsToLimitZh: ['虾、蟹、鱿鱼与贝类（过敏瘙痒期）', '发酵鱼酱与腌菜', '竹笋与酒精饮品'],
    drinksKh: 'ទឹកស្អាត ២-២.៥ លីត្រ/ថ្ងៃ ដើម្បីជួយបញ្ចេញសារធាតុបង្កអាឡែហ្ស៊ី។',
    drinksEn: 'Drink 2–2.5L of plain water daily to support skin hydration and recovery.',
    drinksZh: '每日饮用 2–2.5 升白开水，保持皮肤水润与代谢。',
    fruitsKh: 'ផ្លែប៉ោម ត្របែក ផ្លែសារី ល្ហុងទុំ និងស្រកានាគ។',
    fruitsEn: 'Apples, guava, pears, ripe papaya, and dragon fruit.',
    fruitsZh: '苹果、番石榴、梨、熟木瓜和火龙果。',
    morningMealKh: 'អាហារពេលព្រឹក៖ បបរសាច់មាន់ ឬបបរសាច់ជ្រូកចិញ្ច្រាំក្តៅឧណ្ហៗ។',
    morningMealEn: 'Breakfast: Warm chicken or minced pork rice porridge.',
    morningMealZh: '早餐：温热鸡肉粥或猪肉末粥。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ ស្ងោរត្រឡាចសាច់ជ្រូក ជាមួយបាយសម្រូប។',
    eveningMealEn: 'Dinner: Winter melon pork soup with brown rice.',
    eveningMealZh: '晚餐：冬瓜猪肉清汤配糙米饭。',
    medicationCareKh: 'ប្រសិនបើមានកន្ទួលរមាស់ស្រាល អាចពិគ្រោះជាមួយឱសថការី ឬគ្រូពេទ្យអំពីថ្នាំប្រឆាំងអាឡែហ្ស៊ី (Antihistamines ដូចជា Cetirizine ឬ Loratadine)។ ប្រយ័ត្នថ្នាំអាឡែហ្ស៊ីមួយចំនួនធ្វើឱ្យងងុយគេង មិនគួរបើកបរឡើយ។',
    medicationCareEn: 'For mild hives/itching, consult a doctor or pharmacist about oral antihistamines (Cetirizine, Loratadine); avoid driving if taking sedating antihistamines.',
    medicationCareZh: '轻度荨麻疹或瘙痒可咨询医师或药师使用抗组胺药（如西替利嗪、氯雷他定）；服药期间若感困倦请勿驾车。',
    redFlagsKh: 'សញ្ញាអាសន្ន Anaphylaxis៖ ហើមមាត់ ហើមភ្នែក ហើមបំពង់ក ពិបាកដកដង្ហើម ដង្ហក់ សំឡេងស្អក វិលមុខសន្លប់ — ត្រូវទៅសង្គ្រោះបន្ទាន់ភ្លាមៗ!',
    redFlagsEn: 'EMERGENCY ANAPHYLAXIS: Swelling of lips/tongue/throat, wheezing, shortness of breath, hoarse voice, dizziness/fainting—go to ER immediately!',
    redFlagsZh: '严重过敏反应（Anaphylaxis）急诊信号：嘴唇/舌头/喉咙肿胀、喘息气促、声音嘶哑、头晕晕厥——必须立即送急诊！',
    recoveryTimelineKh: 'កន្ទួលរមាស់អាឡែហ្ស៊ីស្រាលភាគច្រើនធូរស្រាលក្នុង ២-៥ ថ្ងៃក្រោយបញ្ឈប់អាហារបង្កហេតុ។',
    recoveryTimelineEn: 'Mild allergic rashes typically clear within 2–5 days after eliminating the trigger food.',
    recoveryTimelineZh: '轻度过敏性皮疹在停食致敏食物并规范护理后通常于 2–5 天内消退。',
    followUpSuggestionsKh: [
      'តើសញ្ញាអាឡែហ្ស៊ីធ្ងន់ធ្ងរបែបណាដែលត្រូវទៅមន្ទីរពេទ្យភ្លាមៗ?',
      'តើពេលកំពុងរមាស់ស្បែក ឬមានមុខរបួស គួរតមអាហារអ្វីខ្លះ?',
      'តើបន្លែ និងផ្លែឈើអ្វីខ្លះជួយពង្រឹងប្រព័ន្ធភាពស៊ាំបានល្អបំផុត?',
      'តើធ្វើដូចម្តេចដើម្បីដឹងថាយើងអាឡែហ្ស៊ីជាមួយអាហារប្រភេទណា?',
    ],
    followUpSuggestionsEn: [
      'What signs of a food allergy require immediate emergency care?',
      'Which foods should I avoid when I have a skin rash or wound?',
      'Which Cambodian herbs and fruits best strengthen immunity?',
      'How can I identify which specific food triggered my allergy?',
    ],
    followUpSuggestionsZh: [
      '出现什么样的食物过敏症状必须马上去急诊？',
      '皮肤瘙痒或有伤口时应该忌口哪些食物？',
      '哪些柬埔寨草本食材和水果最能增强免疫力？',
      '如何排查自己是哪种特定食物引起的过敏？',
    ],
  },

  // 17. MEDICATION SAFETY & DRUG-FOOD INTERACTIONS (ថ្នាំពេទ្យ / លេបថ្នាំ / អាហារបំប៉ន)
  {
    topicId: 'qa-medication-interactions',
    goalId: 'light_digest',
    safetyLevel: 'medication_caution',
    keywords: [
      'ថ្នាំពេទ្យ', 'លេបថ្នាំ', 'ថ្នាំផ្សះ', 'ថ្នាំបំបាត់ការឈឺចាប់', 'វីតាមីន', 'អាហារបំប៉ន', 'ឈប់លេបថ្នាំ', 'ផលប៉ះពាល់ថ្នាំ',
      'medication', 'medicine', 'antibiotic', 'painkiller', 'nsaid', 'supplement', 'vitamin', 'drug interaction', 'pills',
      '药物', '吃药', '抗生素', '止痛药', '保健品', '维生素', '停药', '吃药禁忌',
    ],
    badgeKh: '💊 សុវត្ថិភាពនៃការប្រើប្រាស់ថ្នាំពេទ្យ & អាហារដែលគួរប្រុងប្រយ័ត្នពេលលេបថ្នាំ',
    badgeEn: '💊 Medication Safety & Food-Drug Interaction Clinical Guide',
    badgeZh: '💊 用药安全与食物-药物相互作用临床指南',
    topicNameKh: 'សុវត្ថិភាពនៃការលេបថ្នាំពេទ្យ និងអាហារូបត្ថម្ភ',
    topicNameEn: 'Medication Safety & Food-Drug Interactions',
    topicNameZh: '用药安全与饮食禁忌',
    summaryKh:
      'ពេលកំពុងប្រើប្រាស់ថ្នាំពេទ្យ គួរលេបថ្នាំជាមួយទឹកស្អាតធម្មតា ១ កែវពេញ (ហាមលេបថ្នាំជាមួយតែ កាហ្វេ ទឹកដោះគោ ទឹកក្រូចថ្លុង ឬគ្រឿងស្រវឹង) និងត្រូវគោរពតាមវេជ្ជបញ្ជារបស់គ្រូពេទ្យឱ្យបានម៉ឺងម៉ាត់ (មុនបាយ ឬក្រោយបាយ)។',
    summaryEn:
      'Always take medications with a full glass of plain water (never with alcohol, strong tea, coffee, milk, or grapefruit juice) and follow your doctor’s exact timing instructions (before vs. after meals).',
    summaryZh:
      '服药时应使用一整杯温白开水送服（切勿用酒、浓茶、咖啡、牛奶或西柚汁送服），并严格遵循医嘱的服药时间（饭前或饭后）与疗程。',
    bulletPointsKh: [
      '💧 លេបថ្នាំជាមួយទឹកស្អាតប៉ុណ្ណោះ៖ តែ និងកាហ្វេបន្ថយប្រសិទ្ធភាពថ្នាំជាតិដែក ចំណែកទឹកដោះគោអាចរារាំងការស្រូបយកថ្នាំផ្សះមួយចំនួន (Tetracyclines/Fluoroquinolones)។',
      '🍽️ ថ្នាំលេបក្រោយបាយភ្លាម៖ ថ្នាំបំបាត់ការឈឺចាប់/រលាក (NSAIDs) និងថ្នាំទឹកនោមផ្អែម Metformin ត្រូវលេបក្រោយអាហារភ្លាមដើម្បីការពារក្រពះ។',
      '🚫 ហាមផឹកគ្រឿងស្រវឹងដាច់ខាតពេលលេបថ្នាំ៖ អាល់កុលលាយជាមួយ Paracetamol ធ្វើឱ្យពុលថ្លើម ហើយលាយជាមួយថ្នាំផ្សះ Metronidazole ធ្វើឱ្យក្អួត និងបេះដូងលោតញាប់ខ្លាំង។',
      '⚠️ ហាមទិញ «ថ្នាំชุด» (ថ្នាំច្រើនគ្រាប់ច្រកថង់គ្មានស្លាកឈ្មោះ) លេបដោយខ្លួនឯង ព្រោះអាចធ្វើឱ្យធ្លុះក្រពះ និងខូចតម្រងនោម។',
    ],
    bulletPointsEn: [
      '💧 Plain Water Only: Tea/coffee blocks iron absorption; dairy calcium binds certain antibiotics (tetracyclines/quinolones).',
      '🍽️ Take After Meals: NSAID painkillers and Metformin must be taken with food to protect the stomach lining.',
      '🚫 Zero Alcohol With Medicine: Alcohol + Paracetamol risks severe liver toxicity; alcohol + Metronidazole causes severe vomiting and rapid heart rate.',
      '⚠️ Never buy unlabelled mixed pill packets ("Thnam Chut")—they frequently contain dangerous steroids and duplicate NSAIDs.',
    ],
    bulletPointsZh: [
      '💧 仅用白开水送服：浓茶咖啡阻碍铁剂吸收；牛奶中的钙会影响四环素/喹诺酮类抗生素吸收。',
      '🍽️ 随餐或饭后服用的药物：非甾体止痛药（如布洛芬）及二甲双胍须在饭后服用以减少胃肠道刺激。',
      '🚫 服药期间严禁饮酒：酒精加对乙酰氨基酚易致急性肝损伤；酒精加甲硝唑/头孢类抗生素会引发危险的双硫仑样反应！',
      '⚠️ 切勿服用无标签的散装混合药包（常含激素与重叠止痛药，极易导致胃穿孔与肾损伤）。',
    ],
    foodsToChooseKh: ['ទឹកស្អាតធម្មតាសម្រាប់លេបថ្នាំ', 'បបរ ឬអាហារទន់ៗមុនលេបថ្នាំក្រោយបាយ', 'សម្លប្រហើរ និងបន្លែឆ្អិន'],
    foodsToChooseEn: ['Plain water for taking pills', 'Warm porridge or balanced meal before after-meal medicines', 'Gentle cooked soups'],
    foodsToChooseZh: ['温白开水送服药物', '饭后药前先吃温热粥饭垫胃', '清淡易消化的蔬菜汤'],
    foodsToLimitKh: ['គ្រឿងស្រវឹងគ្រប់ប្រភេទពេលលេបថ្នាំ', 'ក្រូចថ្លុង (Grapefruit) ពេលលេបថ្នាំខ្លាញ់/លើសឈាម', 'តែចាស់ កាហ្វេ និងទឹកដោះគោពេលលេបថ្នាំភ្លាមៗ'],
    foodsToLimitEn: ['All alcohol while on medication', 'Grapefruit with statins/BP meds', 'Strong tea, coffee, or milk at the exact time of dosing'],
    foodsToLimitZh: ['服药期间一切酒精饮品', '服降脂/降压药期间吃西柚', '服药同时饮用浓茶、咖啡或牛奶'],
    drinksKh: 'ទឹកស្អាត ១ កែវពេញពេលលេបថ្នាំ។ ទុកគម្លាតយ៉ាងតិច ២ ម៉ោងមុនផឹកតែ កាហ្វេ ឬទឹកដោះគោ។',
    drinksEn: '1 full glass of plain water with pills; wait at least 2 hours before drinking tea, coffee, or milk.',
    drinksZh: '用一整杯温开水服药；饮茶、咖啡或牛奶请与服药间隔至少 2 小时。',
    fruitsKh: 'ផ្លែប៉ោម ចេក ល្ហុងទុំ និងក្រូចពោធិ៍សាត់ (ជៀសវាងក្រូចថ្លុងប្រសិនបើលេបថ្នាំបេះដូង/ខ្លាញ់)។',
    fruitsEn: 'Apples, bananas, ripe papaya, and oranges (avoid grapefruit with statins/calcium channel blockers).',
    fruitsZh: '苹果、香蕉、熟木瓜和橙子（服降脂药或降压药者忌吃西柚）。',
    morningMealKh: 'អាហារពេលព្រឹក៖ ញ៉ាំបបរ ឬបាយពេលព្រឹកឱ្យឆ្អែតល្មម មុនលេបថ្នាំដែលតម្រូវឱ្យលេបក្រោយបាយ។',
    morningMealEn: 'Breakfast: Eat a warm meal before taking morning after-meal medications.',
    morningMealZh: '早餐：先吃温热早饭，再服用需饭后服用的早间药物。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ សម្លខ្មែរស្រាលៗជាមួយបាយ និងលេបថ្នាំពេលល្ងាចឱ្យទៀងម៉ោង។',
    eveningMealEn: 'Dinner: Light Cambodian soup with rice and scheduled evening medications.',
    eveningMealZh: '晚餐：清淡汤菜配米饭，按时服用晚间药物。',
    medicationCareKh: 'ប្រសិនបើលេបថ្នាំផ្សះ (Antibiotics) តាមវេជ្ជបញ្ជា ត្រូវលេបឱ្យគ្រប់ចំនួនថ្ងៃកំណត់ កុំឈប់លេបពាក់កណ្តាលទីទោះបីជាធូរស្រាលក៏ដោយ ដើម្បីការពារភាពស៊ាំថ្នាំផ្សះ (Antibiotic resistance)។',
    medicationCareEn: 'Always finish the full prescribed course of antibiotics even if you feel better, to prevent antibiotic resistance.',
    medicationCareZh: '医生开具的抗生素必须按完整疗程服完，切勿症状稍有好转就擅自停药，以免产生耐药菌。',
    redFlagsKh: 'បញ្ឈប់ថ្នាំ និងទៅមន្ទីរពេទ្យភ្លាមប្រសិនបើក្រោយលេបថ្នាំមានអាការៈ៖ ឡើងកន្ទួលរមាស់ពេញខ្លួន ហើមមុខ/បបូរមាត់/ភ្នែក ពិបាកដកដង្ហើម របកស្បែក ឬក្អួតឈាម/លាមកខ្មៅ។',
    redFlagsEn: 'STOP NEW MEDICATION & SEEK ER CARE IMMEDIATELY if you develop hives, facial/lip swelling, shortness of breath, skin blistering, or black stools.',
    redFlagsZh: '服药后若出现全身红疹瘙痒、面部口唇肿胀、呼吸困难、皮肤水疱剥脱或黑便，请立即停药并马上前往医院急诊！',
    recoveryTimelineKh: 'សូមរក្សាបញ្ជីឈ្មោះថ្នាំដែលអ្នកកំពុងប្រើប្រាស់ ដើម្បីបង្ហាញគ្រូពេទ្យរាល់ពេលទៅពិនិត្យសុខភាព។',
    recoveryTimelineEn: 'Keep an updated list or photo of your current medications to show your doctor at every visit.',
    recoveryTimelineZh: '建议随身保存正在服用的药物清单或药盒照片，就诊时主动告知医生。',
    followUpSuggestionsKh: [
      'តើថ្នាំប្រភេទណាខ្លះដែលត្រូវលេបមុនបាយ និងថ្នាំណាត្រូវលេបក្រោយបាយ?',
      'ហេតុអ្វីមិនត្រូវផឹកទឹកដោះគោ ឬតែ ពេលកំពុងលេបថ្នាំផ្សះ និងថ្នាំជាតិដែក?',
      'តើធ្វើដូចម្តេចប្រសិនបើភ្លេចលេបថ្នាំប្រចាំថ្ងៃ ១ ពេល?',
      'តើសញ្ញាអាឡែហ្ស៊ីថ្នាំពេទ្យមានអ្វីខ្លះ?',
    ],
    followUpSuggestionsEn: [
      'Which medications should be taken before meals versus after meals?',
      'Why should I separate milk or tea from antibiotics and iron pills?',
      'What is the safe rule if I forget to take a scheduled dose?',
      'What are the warning signs of a dangerous drug allergy?',
    ],
    followUpSuggestionsZh: [
      '哪些药物应该饭前吃，哪些必须饭后吃？',
      '为什么吃抗生素或铁剂时不能喝牛奶和浓茶？',
      '如果忘记按时吃药应该怎么补服才安全？',
      '药物过敏有哪些危险的早期症状？',
    ],
  },

  // 18. STROKE, SEVERE BREATHING DIFFICULTY & RED-FLAG EMERGENCIES (ដាច់សរសៃឈាមខួរក្បាល / ពិបាកដកដង្ហើម / ក្អួតឈាម)
  {
    topicId: 'qa-stroke-breathing-emergency',
    goalId: 'heart_bp',
    safetyLevel: 'emergency',
    keywords: [
      'ដាច់សរសៃឈាមខួរក្បាល', 'វៀចមាត់', 'ទន់ដៃជើង', 'ស្ពឹកមួយចំហៀងខ្លួន', 'ពិបាកដកដង្ហើម', 'ដង្ហក់ខ្លាំង',
      'ក្អួតឈាម', 'ក្អកឈាម', 'សន្លប់', 'ពុលថ្នាំ',
      'stroke', 'facial droop', 'slurred speech', 'shortness of breath', 'can\'t breathe', 'vomiting blood', 'fainting', 'emergency',
      '中风', '脑卒中', '口角歪斜', '半身不遂', '呼吸困难', '吐血', '咳血', '昏迷', '急救',
    ],
    badgeKh: '🚨 ការសង្គ្រោះបន្ទាន់វេជ្ជសាស្ត្រ៖ សញ្ញាដាច់សរសៃឈាមខួរក្បាល (FAST) & ពិបាកដកដង្ហើម',
    badgeEn: '🚨 Medical Emergency Triage: Stroke (FAST), Dyspnea & Acute Bleeding',
    badgeZh: '🚨 医疗急诊识别：脑卒中 (FAST)、呼吸困难与急性出血',
    topicNameKh: 'ស្ថានភាពសង្គ្រោះបន្ទាន់ផ្នែកវេជ្ជសាស្ត្រ',
    topicNameEn: 'Acute Medical Emergency (Stroke / Breathing / Bleeding)',
    topicNameZh: '急性医疗急症（脑卒中/呼吸困难/出血）',
    summaryKh:
      '🚨 សង្គ្រោះបន្ទាន់ 119៖ រោគសញ្ញាដូចជា វៀចមាត់ ទន់ឬស្ពឹកដៃជើងមួយចំហៀង និយាយមិនច្បាស់ (សញ្ញាដាច់សរសៃឈាមខួរក្បាល FAST) ពិបាកដកដង្ហើមខ្លាំង ក្អួតឈាម ឬសន្លប់ គឺជាស្ថានភាពគ្រោះថ្នាក់ដល់អាយុជីវិត! សូមទូរស័ព្ទទៅលេខ 119 ឬបញ្ជូនទៅមន្ទីរពេទ្យភ្លាមៗ (ហាមបញ្ច្រកទឹក អាហារ ឬថ្នាំដល់អ្នកជំងឺដែលកំពុងវៀចមាត់ ឬសន្លឹម ព្រោះអាចឈ្លក់ចូលសួត)!',
    summaryEn:
      '🚨 CALL 119 IMMEDIATELY: Facial drooping, one-sided arm/leg weakness, slurred speech (FAST stroke signs), severe shortness of breath, vomiting blood, or loss of consciousness are life-threatening emergencies! Go to the nearest Hospital ER immediately—do NOT give food, water, or pills by mouth to a possible stroke patient (choking/aspiration risk)!',
    summaryZh:
      '🚨 立即拨打 119 急救：口角歪斜、一侧手脚麻木无力、言语不清（脑卒中 FAST 征兆）、严重呼吸困难、呕血或昏迷均属危及生命的急症！请立即送往最近医院急诊科——切勿给疑似脑中风或意识不清的患者喂水、喂食或喂药（极易导致窒息与吸入性肺炎）！',
    bulletPointsKh: [
      '🧠 សញ្ញាដាច់សរសៃឈាមខួរក្បាល (FAST)៖ F (Face វៀចមាត់) + A (Arm លើកដៃមួយចំហៀងមិនរួច) + S (Speech និយាយឡុលៗមិនច្បាស់) + T (Time ត្រូវទៅមន្ទីរពេទ្យក្នុងរយៈពេល ៣-៤.៥ ម៉ោងដំបូង!)។',
      '🚫 ហាមចោះម្រាមដៃបង្ហូរឈាម ហាមកោសខ្យល់ និងហាមបញ្ច្រកទឹក/ថ្នាំពេលកំពុងមានសញ្ញាដាច់សរសៃឈាមខួរក្បាល ព្រោះធ្វើឱ្យខាតពេលវេលាសង្គ្រោះនៅមន្ទីរពេទ្យ។',
      '🫁 ដាក់អ្នកជំងឺឱ្យគេងផ្អៀងខ្លួនបន្តិច (Recovery position) ដើម្បីឱ្យផ្លូវដង្ហើមស្រឡះ ខណៈពេលរង់ចាំរថយន្តសង្គ្រោះបន្ទាន់ 119។',
    ],
    bulletPointsEn: [
      '🧠 Stroke FAST Check: Face drooping + Arm weakness + Speech difficulty = Time to call 119 immediately (golden window is within 3–4.5 hours).',
      '🚫 Never prick fingers, scrape skin (coining), or force water/pills into the mouth during an acute stroke.',
      '🫁 Place an unconscious breathing patient on their side (recovery position) to keep the airway clear while awaiting ambulance transport.',
    ],
    bulletPointsZh: [
      '🧠 脑卒中 FAST 识别：F（口角歪斜）+ A（单侧手臂无力）+ S（言语含糊）= T（分秒必争，黄金溶栓窗口为 3–4.5 小时内）。',
      '🚫 切勿采用十指放血、刮痧或强行灌水喂药等土办法，以免延误急诊抢救并引起窒息。',
      '🫁 等待救护车期间，让患者保持侧卧位以保持呼吸道通畅。',
    ],
    foodsToChooseKh: ['(ក្រោយឆ្លងផុតគ្រោះថ្នាក់តាមវេជ្ជបញ្ជា) បបរទន់ៗ', 'សម្លប្រហើរប្រៃតិច', 'ត្រីចំហុយខ្ញី', 'បន្លែបៃតង និងផ្លែឈើទន់'],
    foodsToChooseEn: ['(Post-stabilization per doctor’s swallow test) Soft porridge', 'Low-sodium herbal soup', 'Steamed fish', 'Cooked greens'],
    foodsToChooseZh: ['（病情稳定并通过医生吞咽评估后）软烂米粥', '低盐蔬菜汤', '清蒸鱼肉', '软熟果蔬'],
    foodsToLimitKh: ['ហាមបញ្ច្រកទឹក ឬអាហារពេលកំពុងមានអាការៈបន្ទាន់!', 'អាហារប្រៃខ្លាំង ខ្លាញ់សត្វ និងគ្រឿងស្រវឹង'],
    foodsToLimitEn: ['Nothing by mouth (NPO) during acute emergency!', 'High-sodium foods, animal fats & alcohol'],
    foodsToLimitZh: ['急性发作期严禁经口喂食喂水！', '高盐腌制品、动物脂肪与酒精'],
    drinksKh: 'ពេលកំពុងមានសញ្ញាអាសន្ន ហាមផឹកទឹក។ ក្រោយគ្រូពេទ្យពិនិត្យថាអាចលេបបានធម្មតា គួរផឹកទឹកស្អាត ១.៥-២ លីត្រ/ថ្ងៃ។',
    drinksEn: 'No fluids by mouth during acute stroke symptoms; once cleared by a physician, maintain 1.5–2L plain water daily.',
    drinksZh: '急性发作期禁水；经医生评估吞咽功能安全后，每日饮用 1.5–2 升白开水。',
    fruitsKh: 'ចេកទុំ ល្ហុងទុំ ផ្លែបឺរ និងផ្លែប៉ោម (សម្រាប់ការការពារសរសៃឈាមប្រចាំថ្ងៃ)។',
    fruitsEn: 'Ripe banana, papaya, avocado, and apples for long-term vascular protection.',
    fruitsZh: '熟香蕉、熟木瓜、牛油果和苹果（日常保护血管）。',
    morningMealKh: 'អាហារពេលព្រឹក (សម្រាប់ការការពារប្រចាំថ្ងៃ)៖ បបរត្រីប្រៃតិច ឬបបរស្រូវសាលី។',
    morningMealEn: 'Daily Prevention Breakfast: Low-sodium fish porridge or oatmeal.',
    morningMealZh: '日常预防早餐：低盐生鱼粥或燕麦粥。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ ស្ងោរជ្រក់ត្រី និងបន្លែបៃតងប្រៃតិច ជាមួយបាយសម្រូប។',
    eveningMealEn: 'Daily Prevention Dinner: Low-sodium fish soup and leafy greens with brown rice.',
    eveningMealZh: '日常预防晚餐：低盐清鱼汤配绿叶蔬菜与糙米饭。',
    medicationCareKh: 'ត្រូវគ្រប់គ្រងសម្ពាធឈាម ជាតិស្ករ និងខ្លាញ់ក្នុងឈាមតាមវេជ្ជបញ្ជាគ្រូពេទ្យឱ្យបានទៀងទាត់ ដើម្បីការពារការដាច់ ឬស្ទះសរសៃឈាមខួរក្បាល។',
    medicationCareEn: 'Strict daily adherence to prescribed antihypertensive, diabetes, and cholesterol medications prevents 80% of strokes.',
    medicationCareZh: '坚持按医嘱服用降压、降糖及降脂药物，可预防 80% 以上的脑卒中发生。',
    redFlagsKh: 'សូមទូរស័ព្ទទៅ 119 ភ្លាមៗ រាល់វិនាទីគឺមានតម្លៃសម្រាប់ជីវិត និងខួរក្បាលអ្នកជំងឺ!',
    redFlagsEn: 'Call 119 immediately—every minute counts to save brain tissue and life!',
    redFlagsZh: '请立即拨打 119 急救电话——时间就是大脑，时间就是生命！',
    recoveryTimelineKh: 'ការសង្គ្រោះបន្ទាន់ទាន់ពេលនៅមន្ទីរពេទ្យ និងការស្តារលទ្ធភាពពលកម្ម ជួយឱ្យអ្នកជំងឺមានឱកាសវិលមករកភាពប្រក្រតីខ្ពស់បំផុត។',
    recoveryTimelineEn: 'Immediate hospital treatment followed by physical rehabilitation and low-sodium nutrition maximizes recovery.',
    recoveryTimelineZh: '及时急诊救治配合规范康复训练与低盐营养管理，能最大程度恢复生活自理能力。',
    followUpSuggestionsKh: [
      'តើត្រូវជួយសង្គ្រោះបឋមអ្នកជំងឺសង្ស័យដាច់សរសៃឈាមខួរក្បាលដោយរបៀបណា?',
      'ហេតុអ្វីហាមបញ្ច្រកទឹក ឬចោះម្រាមដៃពេលកំពុងវៀចមាត់?',
      'តើត្រូវការពារកុំឱ្យកើតជំងឺដាច់សរសៃឈាមខួរក្បាលដោយរបៀបណា?',
      'តើអ្នកជំងឺក្រោយដាច់សរសៃឈាមខួរក្បាល គួរញ៉ាំអាហារបែបណា?',
    ],
    followUpSuggestionsEn: [
      'What is the correct first-aid position while waiting for an ambulance?',
      'Why is giving water or pricking fingers dangerous during a stroke?',
      'How can I prevent stroke through daily diet and blood pressure control?',
      'What is the safest diet for a patient recovering after a stroke?',
    ],
    followUpSuggestionsZh: [
      '等待救护车时如何正确进行脑中风急救摆位？',
      '为什么中风发作时严禁喂水和扎手指放血？',
      '平时如何通过控制血压和饮食预防脑卒中？',
      '脑卒中康复期患者应该如何安排安全饮食？',
    ],
  },

  // 19. WEIGHT LOSS & METABOLISM (សម្រកទម្ងន់ / ធាត់ / កាឡូរី)
  {
    topicId: 'qa-weight-loss-metabolism',
    goalId: 'weight_loss',
    safetyLevel: 'standard',
    keywords: [
      'សម្រកទម្ងន់', 'ស្រកទម្ងន់', 'សម្រកគីឡូ', 'ធាត់', 'កាឡូរី', 'ក្បាលពោះ', 'ដុតខ្លាញ់',
      'weight loss', 'lose weight', 'diet', 'calorie', 'slim', 'obesity', 'belly fat', 'overweight',
      '减肥', '减脂', '瘦身', '控制体重', '卡路里', '肥胖',
    ],
    badgeKh: '⚖️ ផែនការសម្រកទម្ងន់ប្រកបដោយសុវត្ថិភាព & ម្ហូបខ្មែរកាឡូរីទាប',
    badgeEn: '⚖️ Safe Weight Loss & Low-Calorie Cambodian Diet Guide',
    badgeZh: '⚖️ 科学减脂与低热量柬埔寨饮食指南',
    topicNameKh: 'ការសម្រកទម្ងន់ប្រកបដោយសុខភាពល្អ',
    topicNameEn: 'Healthy Weight Loss & Fat Burning',
    topicNameZh: '科学减肥与体重管理',
    summaryKh:
      'ការសម្រកទម្ងន់ប្រកបដោយសុវត្ថិភាព (០.៥-១ គីឡូក្រាម/សប្តាហ៍) មិនមែនជាការអត់អាហារ ឬប្រើថ្នាំសម្រកគីឡូឡើយ ប៉ុន្តែគឺជាការជ្រើសរើសមុខម្ហូបខ្មែរកាឡូរីទាប (២៥០-៣៩០ kcal/ពេល) សម្បូរប្រូតេអ៊ីនត្រី និងបន្លែ ៥០% នៃចាន ដើម្បីឱ្យឆ្អែតបានយូរ និងរក្សាសាច់ដុំ។',
    summaryEn:
      'Safe, sustainable weight loss (0.5–1 kg/week) comes from choosing high-protein, fiber-rich Cambodian soups and salads (250–390 kcal/meal) with 50% vegetables rather than starvation or dangerous diet pills.',
    summaryZh:
      '健康可持续的减重（每周减 0.5–1 公斤）不是靠绝食或减肥药，而是选择高蛋白、高纤维的低热量柬式汤菜（每餐 250–390 千卡），保证餐盘 50% 为蔬菜以增强饱腹感并保留肌肉。',
    bulletPointsKh: [
      '🌅 ពេលព្រឹក៖ នំបញ្ចុកសម្លប្រហើរដាក់បន្លែច្រើន ឬបបរត្រីរ៉ស់ + ស៊ុតស្ងោរ ១ គ្រាប់។',
      '☀️ ថ្ងៃត្រង់៖ សម្លកកូរត្រី ឬអាម៉ុកត្រី ឬភ្លាសាច់គោ ជាមួយបាយសម្រូប ១ កូនចានតូច។',
      '🌙 ពេលល្ងាច (មុនម៉ោង ៧ យប់)៖ ស្ងោរជ្រក់ត្រី ឬសម្លម្ជូរបន្លែច្រើន ជាមួយបាយកន្លះកូនចាន។',
      '🚫 ហាមប្រើថ្នាំសម្រកទម្ងន់ ឬកាហ្វេសម្រកគីឡូគ្មានច្បាប់អនុញ្ញាត ដែលអាចធ្វើឱ្យញ័របេះដូង និងខូចតម្រងនោម!',
    ],
    bulletPointsEn: [
      '🌅 Breakfast: Num Banh Chok with herbal fish gravy and extra greens, or fish porridge + 1 boiled egg.',
      '☀️ Lunch: Samlor Korko, Steamed Fish Amok, or Beef Lime Salad with 1 small bowl of brown rice.',
      '🌙 Dinner (before 7 PM): Clear sour fish soup with generous greens and half a small bowl of rice.',
      '🚫 Never use unregulated weight-loss pills or slimming coffees that cause heart palpitations and kidney damage.',
    ],
    bulletPointsZh: [
      '🌅 早餐：多菜高棉草本鱼汤米粉，或生鱼片粥配 1 个水煮蛋。',
      '☀️ 午餐：高棉杂菜汤、清蒸阿莫克鱼或青柠牛肉沙拉，配 1 小碗糙米饭。',
      '🌙 晚餐（晚 7 点前）：香茅清酸鱼汤配大量绿叶菜及半小碗米饭。',
      '🚫 严禁服用三无减肥药或违规减肥咖啡（极易导致心悸、失眠与肝肾损伤）。',
    ],
    foodsToChooseKh: ['សម្លកកូរត្រីស្លឹកម្រុំ', 'ស្ងោរជ្រក់ត្រីរ៉ស់', 'ភ្លាសាច់គោបន្លែស្រស់', 'ញាំមីសួរគ្រឿងសមុទ្រ', 'នំបញ្ចុកសម្លប្រហើរ'],
    foodsToChooseEn: ['Samlor Korko', 'Clear Sour Fish Soup', 'Cambodian Beef Lime Salad', 'Seafood Glass Noodle Salad', 'Num Banh Chok'],
    foodsToChooseZh: ['辣木叶高棉杂菜汤', '香茅清酸鱼汤', '青柠牛肉蔬菜沙拉', '海鲜粉丝凉拌', '高棉鱼汤米粉'],
    foodsToLimitKh: ['ភេសជ្ជៈទឹកដោះគោខាប់ តែគុជ និងទឹកក្រូច', 'អាហារបំពងខ្លាញ់ច្រើន', 'ការញ៉ាំអាហារយប់ជ្រៅក្រោយម៉ោង ៨ យប់'],
    foodsToLimitEn: ['Condensed milk drinks, boba tea & soda', 'Deep-fried greasy foods', 'Late-night meals after 8 PM'],
    foodsToLimitZh: ['炼乳饮料、珍珠奶茶与汽水', '油炸高脂食品', '晚 8 点后的宵夜'],
    drinksKh: 'ទឹកស្អាត ២-២.៥ លីត្រ/ថ្ងៃ (ផឹក ១ កែវមុនអាហារ ២០ នាទីជួយឱ្យឆ្អែតលឿន) តែបៃតងអត់ស្ករ ឬកាហ្វេខ្មៅអត់ស្ករ។',
    drinksEn: '2–2.5L water daily (1 glass 20 minutes before meals reduces appetite), unsweetened green tea, or black coffee.',
    drinksZh: '每日 2–2.5 升白开水（餐前 20 分钟喝一杯水有助于控制食量）、无糖绿茶或黑咖啡。',
    fruitsKh: 'ត្របែក ផ្លែប៉ោម ផ្លែស្រកានាគ ក្រូចថ្លុង និងល្ហុងទុំ។',
    fruitsEn: 'Guava, green apples, dragon fruit, pomelo, and ripe papaya.',
    fruitsZh: '番石榴、苹果、火龙果、柚子和熟木瓜。',
    morningMealKh: 'អាហារពេលព្រឹក៖ នំបញ្ចុកសម្លប្រហើរបន្លែច្រើន ឬស៊ុតស្ងោរ ២ គ្រាប់ជាមួយបន្លែស្រស់។',
    morningMealEn: 'Breakfast: Num Banh Chok with extra vegetables or 2 boiled eggs with greens.',
    morningMealZh: '早餐：多菜高棉鱼汤米粉或 2 个水煮蛋配新鲜蔬菜。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ ស្ងោរជ្រក់ត្រី ឬស្ងោរត្រឡាច ជាមួយបាយសម្រូបកន្លះកូនចាន មុនម៉ោង ៧ យប់។',
    eveningMealEn: 'Dinner: Clear fish soup or winter melon soup with half a small bowl of brown rice before 7 PM.',
    eveningMealZh: '晚餐：晚 7 点前食用清鱼汤或冬瓜汤配半小碗糙米。',
    medicationCareKh: 'ជៀសវាងផលិតផលសម្រកទម្ងន់លក់តាមអនឡាញដែលគ្មានការទទួលស្គាល់ពីក្រសួងសុខាភិបាល ព្រោះច្រើនលួចដាក់សារធាតុហាមឃាត់ Sibutramine ដែលធ្វើឱ្យគាំងបេះដូង!',
    medicationCareEn: 'Avoid unverified online slimming pills/coffees, which often contain banned Sibutramine that causes arrhythmia and stroke.',
    medicationCareZh: '切勿购买未经卫生部批准的网红减肥药或减肥咖啡（常非法添加西布曲明，可诱发心律失常与脑卒中）！',
    redFlagsKh: 'ទៅជួបគ្រូពេទ្យប្រសិនបើស្រកទម្ងន់លឿនខុសធម្មតាដោយមិនបានតមអាហារ (លើសពី 5% នៃទម្ងន់ខ្លួនក្នុង ១-៣ ខែ)។',
    redFlagsEn: 'See a doctor if you experience unexplained rapid weight loss (>5% of body weight in 1–3 months) without trying.',
    redFlagsZh: '若在未节食的情况下出现不明原因的快速消瘦（1–3 个月内体重下降超过 5%），请及时就医排查。',
    recoveryTimelineKh: 'ការកាត់បន្ថយថាមពល 350–500 kcal/ថ្ងៃ និងដើរ ៣០ នាទី ជួយសម្រកទម្ងន់បាន ២-៣ គីឡូក្រាមក្នុង ១ ខែដោយសុវត្ថិភាព។',
    recoveryTimelineEn: 'A 350–500 kcal daily deficit plus 30 minutes of walking safely trims 2–3 kg per month.',
    recoveryTimelineZh: '每日减少 350–500 千卡热量并快走 30 分钟，每月可安全减重 2–3 公斤。',
    followUpSuggestionsKh: [
      'តើពេលយប់ឃ្លាន គួរញ៉ាំអ្វីដើម្បីកុំឱ្យឡើងគីឡូ?',
      'តើគួរផឹកទឹកបែបណាដើម្បីជួយដុតខ្លាញ់ក្បាលពោះ?',
      'ហេតុអ្វីការអត់អាហារពេលព្រឹក ធ្វើឱ្យកាន់តែធាត់?',
      'សូមណែនាំមុខម្ហូបសម្រកទម្ងន់ ៣ ពេលសម្រាប់ ១ ថ្ងៃ',
    ],
    followUpSuggestionsEn: [
      'What healthy snack can I eat at night without gaining weight?',
      'Which drinks help reduce belly fat naturally?',
      'Why does skipping breakfast make weight loss harder?',
      'Give me a 3-meal Cambodian weight-loss plan for 1 day',
    ],
    followUpSuggestionsZh: [
      '晚上饿了可以吃什么健康加餐不会长胖？',
      '喝什么饮品有助于天然减少腹部脂肪？',
      '为什么不吃早餐反而更容易发胖？',
      '请提供一份一日三餐柬式减脂食谱',
    ],
  },

  // 20. HIGH PROTEIN, MUSCLE BUILDING & WEIGHT GAIN (ប្រូតេអ៊ីន / សាច់ដុំ / ឡើងទម្ងន់)
  {
    topicId: 'qa-muscle-protein-weight-gain',
    goalId: 'high_protein',
    safetyLevel: 'standard',
    keywords: [
      'ប្រូតេអ៊ីន', 'សាច់ដុំ', 'ហាត់ប្រាណ', 'ឡើងទម្ងន់', 'ស្គម', 'កម្លាំង', 'ឡើងគីឡូ',
      'protein', 'muscle', 'gym', 'fitness', 'workout', 'weight gain', 'underweight', 'strength',
      '蛋白质', '增肌', '增重', '健身', '太瘦', '长胖', '补充体力',
    ],
    badgeKh: '💪 អាហារខ្មែរសម្បូរប្រូតេអ៊ីនខ្ពស់ ជំនួយសាច់ដុំ & បង្កើនទម្ងន់សុខភាព',
    badgeEn: '💪 High-Protein Muscle Building & Healthy Weight Gain Guide',
    badgeZh: '💪 高蛋白增肌与健康增重营养指南',
    topicNameKh: 'ការបង្កើនប្រូតេអ៊ីន សាច់ដុំ និងទម្ងន់សុខភាព',
    topicNameEn: 'High Protein, Muscle Building & Healthy Weight Gain',
    topicNameZh: '高蛋白增肌与健康增重',
    summaryKh:
      'មុខម្ហូបខ្មែរមានប្រភពប្រូតេអ៊ីនធម្មជាតិដ៏ល្អពីត្រីទឹកសាប (ត្រីរ៉ស់ ត្រីឆ្ដោ) សាច់មាន់ស្រែ សាច់គោគ្មានខ្លាញ់ បង្គា ស៊ុត និងតៅហ៊ូ ដែលផ្តល់ប្រូតេអ៊ីន ២៤-៣២g ក្នុងមួយពេល ជួយកសាងសាច់ដុំ និងបង្កើនទម្ងន់ប្រកបដោយសុខភាពល្អ។',
    summaryEn:
      'Cambodian cuisine offers clean, bioavailable protein from snakehead fish, free-range chicken, lean beef, shrimp, eggs, and tofu—delivering 24–32g protein per meal to build muscle and support healthy weight gain.',
    summaryZh:
      '柬埔寨传统饮食富含优质天然蛋白（生鱼、走地鸡、瘦牛肉、鲜虾、鸡蛋和豆腐），每餐可提供 24–32 克蛋白质，有效支持肌肉合成与健康增重。',
    bulletPointsKh: [
      '🐟 ប្រូតេអ៊ីនសុទ្ធពីម្ហូបខ្មែរ៖ អាម៉ុកត្រី ត្រីអាំង មាន់ដុតស្លឹកគ្រៃ ភ្លាសាច់គោ និងឆាគ្រឿងសាច់មាន់/សាច់គោ។',
      '🥚 បន្ថែមស៊ុតស្ងោរ ២ គ្រាប់ ទឹកសណ្តែក ឬទឹកដោះគោ ដើម្បីបង្កើនប្រូតេអ៊ីនប្រចាំថ្ងៃឱ្យបាន 1.4–1.6g ក្នុង ១ គីឡូក្រាមនៃទម្ងន់ខ្លួន។',
      '🍌 សម្រាប់អ្នកស្គមចង់ឡើងទម្ងន់សុខភាព៖ បន្ថែមអាហារសម្រន់ ២ ពេល (ចេកទុំ ផ្លែបឺរ ដំឡូងជ្វា សណ្តែកដីស្ងោរ និងទឹកដោះគោ)។',
    ],
    bulletPointsEn: [
      '🐟 Top Khmer Protein Dishes: Steamed Fish Amok, Lemongrass Grilled Chicken, Beef Lime Salad, and Kroeung Stir-Fry.',
      '🥚 Add 2 boiled eggs, soy milk, or dairy milk to reach 1.4–1.6g protein per kg of body weight.',
      '🍌 For Healthy Weight Gain: Add 2 nutrient-dense snacks daily (bananas, avocado, boiled sweet potato, peanuts, milk).',
    ],
    bulletPointsZh: [
      '🐟 高蛋白柬式代表菜：清蒸阿莫克鱼、香茅烤鸡、青柠牛肉沙拉及高棉香料炒肉。',
      '🥚 每日加食 2 个水煮蛋、豆浆或牛奶，使蛋白质摄入达到每公斤体重 1.4–1.6 克。',
      '🍌 偏瘦人群健康增重：每日增加 2 次营养加餐（熟香蕉、牛油果、红薯、水煮花生与牛奶）。',
    ],
    foodsToChooseKh: ['អាម៉ុកត្រីរ៉ស់', 'មាន់ដុតស្លឹកគ្រៃ', 'ភ្លាសាច់គោ', 'ឆាគ្រឿងសាច់គោសណ្ដែកគួរ', 'បបរមាន់ដាក់ស៊ុត'],
    foodsToChooseEn: ['Steamed Fish Amok', 'Lemongrass Grilled Chicken', 'Beef Lime Salad', 'Beef Kroeung Stir-Fry', 'Chicken & Egg Porridge'],
    foodsToChooseZh: ['清蒸阿莫克鱼', '香茅烤鸡', '青柠牛肉沙拉', '高棉香料豆角炒牛肉', '鸡肉加蛋热粥'],
    foodsToLimitKh: ['សាច់ជ្រូកបីជាន់ខ្លាញ់ច្រើន', 'គ្រឿងស្រវឹងក្រោយហាត់ប្រាណ (រារាំងការកសាងសាច់ដុំ)', 'ភេសជ្ជៈផ្អែមគ្មានជីវជាតិ'],
    foodsToLimitEn: ['Fatty pork belly', 'Alcohol post-workout (inhibits muscle protein synthesis)', 'Empty-calorie sugary sodas'],
    foodsToLimitZh: ['高脂五花肉', '运动后饮酒（抑制肌肉蛋白质合成）', '无营养高糖汽水'],
    drinksKh: 'ទឹកស្អាត ២.៥-៣ លីត្រ ទឹកដោះគោ ទឹកសណ្តែក និងទឹកដូងស្រស់ក្រោយហាត់ប្រាណ។',
    drinksEn: '2.5–3L water, milk, soy milk, and fresh coconut water for post-workout electrolytes.',
    drinksZh: '每日 2.5–3 升水、牛奶、豆浆，以及运动后补充天然电解质的新鲜椰子水。',
    fruitsKh: 'ចេកណាំវ៉ា (ផ្តល់ថាមពលមុន/ក្រោយហាត់ប្រាណ) ផ្លែបឺរ ល្ហុងទុំ និងផ្លែក្រូច។',
    fruitsEn: 'Bananas (ideal pre/post-workout fuel), avocado, ripe papaya, and oranges.',
    fruitsZh: '香蕉（运动前后最佳能量补充）、牛油果、熟木瓜和橙子。',
    morningMealKh: 'អាហារពេលព្រឹក៖ បាយសាច់មាន់/សាច់គោ + ស៊ុត ២ គ្រាប់ + ទឹកសណ្តែក ឬទឹកដោះគោ ១ កែវ។',
    morningMealEn: 'Breakfast: Grilled chicken or beef with rice + 2 eggs + 1 glass of soy or dairy milk.',
    morningMealZh: '早餐：鸡肉/牛肉饭 + 2 个鸡蛋 + 1 杯豆浆或牛奶。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ អាម៉ុកត្រី ឬស្ងោរជ្រក់ត្រីរ៉ស់ + ឆាខ្ញីសាច់មាន់ ជាមួយបាយសម្រូប។',
    eveningMealEn: 'Dinner: Steamed Fish Amok or clear fish soup + ginger chicken with brown rice.',
    eveningMealZh: '晚餐：清蒸阿莫克鱼或清鱼汤 + 仔姜炒鸡肉配糙米饭。',
    medicationCareKh: 'ប្រូតេអ៊ីនពីអាហារធម្មជាតិគឺល្អ និងសុវត្ថិភាពបំផុត។ ប្រសិនបើប្រើម្សៅប្រូតេអ៊ីន (Whey protein) ត្រូវផឹកទឹកឱ្យគ្រប់គ្រាន់ និងហាមប្រើថ្នាំអរម៉ូនសាច់ដុំខុសច្បាប់ (Anabolic steroids) ដាច់ខាត។',
    medicationCareEn: 'Whole-food protein is safest; if using whey protein, stay well hydrated and strictly avoid anabolic steroids.',
    medicationCareZh: '天然食物蛋白最安全；若使用乳清蛋白粉需多喝水，严禁使用违禁合成代谢类固醇激素。',
    redFlagsKh: 'ប្រសិនបើហាត់ប្រាណហើយមានអាការៈឈឺទ្រូង វិលមុខ ឬនោមពណ៌ត្នោតដិត (សញ្ញារលាយសាច់ដុំ Rhabdomyolysis) ត្រូវទៅមន្ទីរពេទ្យភ្លាម។',
    redFlagsEn: 'Seek urgent care if workout causes chest pain, dizziness, or dark brown/tea-colored urine (rhabdomyolysis).',
    redFlagsZh: '若运动中出现胸痛、头晕，或运动后出现浓茶色/酱油色尿液（警惕横纹肌溶解症），请立即就医。',
    recoveryTimelineKh: 'ការញ៉ាំប្រូតេអ៊ីនគ្រប់គ្រាន់ និងហាត់ប្រាណទៀងទាត់ ផ្តល់លទ្ធផលសាច់ដុំ និងកម្លាំងច្បាស់លាស់ក្នុង ៤-៨ សប្តាហ៍។',
    recoveryTimelineEn: 'Consistent protein intake and resistance training build noticeable strength within 4–8 weeks.',
    recoveryTimelineZh: '充足蛋白质配合规律力量训练，通常在 4–8 周内显著提升力量与肌肉量。',
    followUpSuggestionsKh: [
      'តើគួរញ៉ាំអាហារអ្វីមុន និងក្រោយហាត់ប្រាណ ៣០ នាទី?',
      'តើអ្នកស្គមចង់ឡើងទម្ងន់សុខភាព គួរញ៉ាំប៉ុន្មានពេលក្នុងមួយថ្ងៃ?',
      'តើម្ហូបខ្មែរណាខ្លះដែលមានប្រូតេអ៊ីនខ្ពស់ជាងគេ?',
      'តើក្នុងមួយថ្ងៃរាងកាយត្រូវការប្រូតេអ៊ីនប៉ុន្មានក្រាម?',
    ],
    followUpSuggestionsEn: [
      'What should I eat 30 minutes before and after a workout?',
      'How many meals a day should an underweight person eat to gain healthy weight?',
      'Which Cambodian dishes have the highest protein content?',
      'How many grams of protein do I need per day for my weight?',
    ],
    followUpSuggestionsZh: [
      '运动前和运动后 30 分钟吃什么最好？',
      '偏瘦人群想健康增重每天应该吃几餐？',
      '哪些柬埔寨传统菜肴的蛋白质含量最高？',
      '根据体重计算每天需要摄入多少克蛋白质？',
    ],
  },

  // 21. CHILDREN & ELDERLY NUTRITION (កុមារ / មនុស្សចាស់)
  {
    topicId: 'qa-children-elderly-care',
    goalId: 'light_digest',
    safetyLevel: 'high_risk_care',
    keywords: [
      'កុមារ', 'ក្មេង', 'អាហារកូនក្មេង', 'មនុស្សចាស់', 'ចាស់ជរា', 'លោកតាលោកយាយ', 'កូនតូច',
      'child', 'children', 'kids', 'baby', 'toddler', 'elderly', 'senior', 'older adult',
      '儿童营养', '宝宝', '孩子', '老人饮食', '老年人', '长辈',
    ],
    badgeKh: '👨‍👩‍👧‍👦 អាហារូបត្ថម្ភសម្រាប់កុមារលូតលាស់ឆ្លាតវៃ & ការថែទាំសុខភាពមនុស្សចាស់',
    badgeEn: '👨‍👩‍👧‍👦 Child Growth & Elderly Restorative Nutrition Guide',
    badgeZh: '👨‍👩‍👧‍👦 儿童成长发育与老年人养生饮食指南',
    topicNameKh: 'អាហារូបត្ថម្ភសម្រាប់កុមារ និងមនុស្សចាស់',
    topicNameEn: 'Child & Elderly Clinical Nutrition',
    topicNameZh: '儿童与老年人临床营养',
    summaryKh:
      'កុមារ និងមនុស្សចាស់ ត្រូវការអាហារដែលចម្អិនទន់ងាយទំពា និងងាយរំលាយ ប៉ុន្តែសម្បូរប្រូតេអ៊ីន កាល់ស្យូម ជាតិដែក វីតាមីន D និង Omega-3 (ដូចជា បបរត្រីរ៉ស់ដាក់ស្លឹកម្រុំនិងល្ពៅ អាម៉ុកត្រីចំហុយ ស៊ុតចំហុយ និងស្ងោរត្រឡាចសាច់មាន់ចិញ្ច្រាំ) ដោយប្រុងប្រយ័ត្នឆ្អឹងត្រី។',
    summaryEn:
      'Children and older adults thrive on soft, easily chewed, nutrient-dense Cambodian dishes rich in protein, calcium, iron, and Omega-3s—such as Moringa & pumpkin fish porridge, steamed egg/Fish Amok, and minced chicken winter melon soup (always deboned carefully).',
    summaryZh:
      '儿童与老年人需要软烂易咀嚼、易消化且营养密集的饮食，重点补充优质蛋白、钙、铁和 Omega-3（如无刺生鱼辣木叶南瓜粥、清蒸阿莫克鱼、水蒸蛋、冬瓜鸡肉末汤）。',
    bulletPointsKh: [
      '👶 សម្រាប់កុមារ៖ បបរខាប់គ្រប់គ្រឿង (ត្រី/សាច់មាន់ + ស៊ុត + ល្ពៅ/ការ៉ុត + ស្លឹកម្រុំ + ប្រេងឆាបន្តិច) ជួយលូតកម្ពស់ និងបំប៉នខួរក្បាល។',
      '🧓 សម្រាប់មនុស្សចាស់៖ អាហារទន់ក្តៅឧណ្ហៗ ប្រៃតិច ខ្លាញ់ទាប (ត្រីចំហុយ សម្លប្រហើរ ស្ងោរត្រឡាច) ជួយការពារលើសឈាម ទល់លាមក និងពុកឆ្អឹង។',
      '⚠️ សុវត្ថិភាព៖ បេះឆ្អឹងត្រីឱ្យអស់ ១០០% មុនផ្តល់ជូនកុមារតូច និងមនុស្សចាស់ ដើម្បីការពារការស្លាក់ឆ្អឹងត្រី។',
    ],
    bulletPointsEn: [
      '👶 For Children: Nutrient-dense porridge combining deboned fish/chicken, egg yolk, pumpkin/carrot, and moringa leaves supports brain and height growth.',
      '🧓 For Older Adults: Warm, soft, low-sodium soups and steamed fish prevent hypertension, constipation, and sarcopenia.',
      '⚠️ Choking Prevention: Remove 100% of fish bones before serving young children or elderly family members.',
    ],
    bulletPointsZh: [
      '👶 儿童发育：全营养稠粥（去刺鱼肉/鸡肉末 + 鸡蛋 + 南瓜/胡萝卜 + 辣木叶）有助于身高与大脑发育。',
      '🧓 老年养生：温热、软烂、低盐少油的汤菜与清蒸鱼，预防高血压、便秘与肌肉流失。',
      '⚠️ 安全第一：给幼儿与老人喂食鱼类前，务必 100% 挑净鱼刺以防卡喉。',
    ],
    foodsToChooseKh: ['បបរត្រីរ៉ស់ដាក់ល្ពៅនិងស្លឹកម្រុំ', 'អាម៉ុកត្រីចំហុយ (គ្មានឆ្អឹង)', 'ស្ងោរត្រឡាចសាច់មាន់ចិញ្ច្រាំ', 'ស៊ុតចំហុយទន់ៗ', 'ទឹកដោះគោ & ចេកទុំ'],
    foodsToChooseEn: ['Fish Porridge with Pumpkin & Moringa', 'Boneless Steamed Fish Amok', 'Minced Chicken Winter Melon Soup', 'Soft Steamed Egg', 'Milk & Ripe Banana'],
    foodsToChooseZh: ['无刺鱼肉南瓜辣木叶粥', '无刺清蒸阿莫克鱼', '冬瓜鸡肉末汤', '嫩滑水蒸蛋', '牛奶与熟香蕉'],
    foodsToLimitKh: ['អាហារមានឆ្អឹងតូចៗ ឬស្វិតពិបាកទំពា', 'នំកញ្ចប់ប្រៃ និងភេសជ្ជៈផ្អែមខ្លាំង', 'ទឹកឃ្មុំសម្រាប់ទារកអាយុក្រោម ១ ឆ្នាំ'],
    foodsToLimitEn: ['Foods with small bones or tough gristle', 'Salty packaged chips & sugary sodas', 'Honey for infants under 12 months'],
    foodsToLimitZh: ['带细刺或难咀嚼的坚硬食物', '高盐膨化零食与含糖饮料', '1 岁以下婴儿禁食蜂蜜'],
    drinksKh: 'ទឹកស្អាត ទឹកដោះគោក្តៅឧណ្ហៗ និងទឹកសណ្តែក។',
    drinksEn: 'Plain water, warm pasteurized milk, and soy milk.',
    drinksZh: '温白开水、温牛奶和豆浆。',
    fruitsKh: 'ចេកណាំវ៉ាទុំ ល្ហុងទុំ ផ្លែបឺរ ស្វាយទុំ និងផ្លែប៉ោមកោស/ចំហុយ។',
    fruitsEn: 'Ripe banana, ripe papaya, avocado, sweet mango, and mashed/steamed apple.',
    fruitsZh: '熟香蕉、熟木瓜、牛油果、熟芒果及果泥/蒸苹果。',
    morningMealKh: 'អាហារពេលព្រឹក៖ បបរសាច់មាន់/ត្រីដាក់ស៊ុត និងបន្លែទន់ៗ + ទឹកដោះគោ ១ កែវ។',
    morningMealEn: 'Breakfast: Soft chicken/fish porridge with egg and vegetables + 1 glass of milk.',
    morningMealZh: '早餐：鸡肉/鱼肉鸡蛋蔬菜软粥 + 1 杯温牛奶。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ ស្ងោរត្រឡាច ឬសម្លប្រហើរស្លឹកម្រុំ ជាមួយបាយទន់ៗ។',
    eveningMealEn: 'Dinner: Winter melon soup or soft Moringa soup with soft-cooked rice.',
    eveningMealZh: '晚餐：冬瓜清汤或辣木叶软汤配软米饭。',
    medicationCareKh: 'កុមារត្រូវចាក់វ៉ាក់សាំង និងទម្លាក់ព្រូនតាមកាលកំណត់របស់ក្រសួងសុខាភិបាល។ មនុស្សចាស់ដែលមានជំងឺប្រចាំកាយច្រើនមុខ គួររៀបចំប្រអប់ថ្នាំតាមថ្ងៃ ដើម្បីកុំឱ្យភ្លេច ឬលេបថ្នាំច្រឡំ។',
    medicationCareEn: 'Keep children on schedule for MoH vaccinations and deworming; use a weekly pill organizer for elderly family members taking daily medications.',
    medicationCareZh: '儿童应按卫生部计划接种疫苗与定期驱虫；老年人若有多种慢病用药，建议使用分格药盒以防漏服或错服。',
    redFlagsKh: 'ទៅមន្ទីរពេទ្យភ្លាមប្រសិនបើកុមារ ឬមនុស្សចាស់៖ ក្ដៅខ្លួនខ្លាំង ប្រកាច់ ដង្ហក់ មិនព្រមញ៉ាំទឹក/អាហារ សន្លឹម ឬរាកក្អួតខ្សោះជាតិទឹក។',
    redFlagsEn: 'Seek urgent care if a child or older adult has high fever, seizures, fast breathing, refusal to drink, lethargy, or dehydration.',
    redFlagsZh: '若幼儿或老人出现高烧、抽搐、呼吸急促、拒食拒水、精神萎靡或腹泻脱水，请立即送医。',
    recoveryTimelineKh: 'អាហារូបត្ថម្ភត្រឹមត្រូវជារៀងរាល់ថ្ងៃ ជួយឱ្យកុមារលូតលាស់ពេញศัก្តានុពល និងមនុស្សចាស់មានសុខភាពរឹងមាំ។',
    recoveryTimelineEn: 'Daily balanced nutrition supports optimal child growth and healthy aging.',
    recoveryTimelineZh: '每日均衡营养有助于儿童健康成长并延缓老年人机能衰退。',
    followUpSuggestionsKh: [
      'តើគួរផ្សំគ្រឿងបបរខាប់គ្រប់គ្រឿងបែបណាឱ្យកូនឆាប់ឡើងគីឡូ និងឆ្លាតវៃ?',
      'តើមនុស្សចាស់ដែលពិបាកទំពា និងឧស្សាហ៍ទល់លាមក គួរញ៉ាំម្ហូបអ្វី?',
      'តើអាហារអ្វីខ្លះជួយបំប៉នឆ្អឹង និងភ្នែកសម្រាប់មនុស្សចាស់?',
      'បើកូនតូចមិនសូវឃ្លានបាយ តើគួរធ្វើដូចម្តេច?',
    ],
    followUpSuggestionsEn: [
      'How do I prepare nutrient-dense Cambodian porridge for child growth?',
      'What soft dishes are best for elderly parents with chewing or constipation issues?',
      'Which foods support bone density and vision in older adults?',
      'How can I encourage a picky child to eat healthier meals?',
    ],
    followUpSuggestionsZh: [
      '如何制作营养全面的柬式宝宝辅食稠粥？',
      '牙口不好且容易便秘的老人适合吃什么菜？',
      '哪些食物有助于老年人补钙护骨和保护视力？',
      '孩子挑食不爱吃饭应该怎么调理？',
    ],
  },

  // 22. SAMLOR KORKO, MORINGA & KHMER MEDICINAL HERBS (សម្លកកូរ / ម្រុំ / គ្រឿងទេសឱសថ)
  {
    topicId: 'qa-korko-moringa',
    goalId: 'gut_fiber',
    safetyLevel: 'standard',
    keywords: [
      'សម្លកកូរ', 'ម្រុំ', 'ស្លឹកម្រុំ', 'ខ្ញី', 'រមៀត', 'ស្លឹកគ្រៃ', 'ឱសថបុរាណ', 'គ្រឿងទេសខ្មែរ',
      'korko', 'moringa', 'ginger', 'turmeric', 'lemongrass', 'superfood', 'khmer herbs',
      '高棉养生汤', '辣木叶', '生姜', '姜黄', '香茅', '养生食材',
    ],
    badgeKh: '🌿 អត្ថប្រយោជន៍ឱសថអាហារូបត្ថម្ភនៃសម្លកកូរ ស្លឹកម្រុំ & គ្រឿងទេសខ្មែរ',
    badgeEn: '🌿 Health Benefits of Samlor Korko, Moringa & Khmer Culinary Herbs',
    badgeZh: '🌿 高棉养生杂菜汤 (Samlor Korko)、辣木叶与草本香料营养指南',
    topicNameKh: 'សម្លកកូរ ស្លឹកម្រុំ និងគ្រឿងទេសឱសថខ្មែរ',
    topicNameEn: 'Samlor Korko, Moringa & Khmer Superfoods',
    topicNameZh: '高棉养生汤、辣木叶与草本养生食材',
    summaryKh:
      '«សម្លកកូរ» និង «សម្លប្រហើរស្លឹកម្រុំ» គឺជាមុខម្ហូបសុខភាពដ៏ល្អឯករបស់កម្ពុជា ដែលរួមបញ្ចូលបន្លែធម្មជាតិ ៧-១០ មុខ (ស្លឹកម្រុំ ល្ហុងខ្ចី ល្ពៅ ត្រប់ សណ្តែកគួរ ចេកខ្ចី) ត្រីទឹកសាប និងគ្រឿងបុកឱសថខ្មែរ (រមៀត ស្លឹកគ្រៃ រំដេង ខ្ញី ខ្ទឹមស) ជួយពង្រឹងភាពស៊ាំ សម្រួលពោះវៀន និងការពារជំងឺរ៉ាំរ៉ៃ។',
    summaryEn:
      'Samlor Korko and Moringa soups represent the pinnacle of Cambodian nutritional wisdom, combining 7–10 varieties of seasonal vegetables, freshwater fish, and anti-inflammatory kroeung herbs (turmeric, lemongrass, galangal, ginger, garlic).',
    summaryZh:
      '高棉养生杂菜汤（Samlor Korko）与辣木叶汤是柬埔寨饮食智慧的结晶，汇集 7–10 种时令蔬菜（辣木叶、青木瓜、南瓜、茄子、长豆）、淡水鱼及天然抗炎香料（姜黄、香茅、高良姜、生姜、大蒜），兼具增强免疫与调理肠道之效。',
    bulletPointsKh: [
      '🌿 ស្លឹកម្រុំ (Moringa)៖ សម្បូរវីតាមីន A, C កាល់ស្យូម ជាតិដែក និងប៉ូតាស្យូម ខ្ពស់ជាងបន្លែធម្មតាជាច្រើនដង។',
      '🟡 រមៀត និងខ្ញី៖ មានសារធាតុ Curcumin និង Gingerol ជួយប្រឆាំងការរលាកសន្លាក់ និងការពារភ្នាសក្រពះ។',
      '🌱 គល់ស្លឹកគ្រៃ និងស្លឹកក្រូចសើច៖ ជួយសម្រួលការរំលាយអាហារ បន្ថយខ្យល់ក្នុងពោះ និងផ្តល់ក្លិនក្រអូបជំនួសការប្រើអំបិលច្រើន។',
    ],
    bulletPointsEn: [
      '🌿 Moringa Leaves: Packed with Vitamin A, Vitamin C, calcium, iron, and potassium.',
      '🟡 Turmeric & Ginger: Curcumin and gingerol reduce joint and gut inflammation.',
      '🌱 Lemongrass & Kaffir Lime: Soothe digestion and allow 30% less salt/fish sauce while cooking.',
    ],
    bulletPointsZh: [
      '🌿 辣木叶（Moringa）：富含维生素 A、维生素 C、钙、铁和钾，被誉为热带超级食物。',
      '🟡 姜黄与生姜：富含姜黄素与姜辣素，具有天然抗炎、护胃与缓解关节不适的作用。',
      '🌱 香茅与柠檬叶：促进消化、减少胀气，并能以天然香气减少 30% 食盐用量。',
    ],
    foodsToChooseKh: ['សម្លកកូរត្រីស្លឹកម្រុំ', 'សម្លប្រហើរត្រីស្លឹកម្រុំ', 'ស្ងោរជ្រក់ត្រីស្លឹកគ្រៃ', 'ឆាខ្ញីសាច់មាន់', 'អាម៉ុកត្រីចំហុយ'],
    foodsToChooseEn: ['Samlor Korko with Moringa', 'Samlor Praher with Moringa', 'Lemongrass Clear Fish Soup', 'Ginger Chicken Stir-Fry', 'Steamed Fish Amok'],
    foodsToChooseZh: ['辣木叶高棉杂菜汤', '辣木叶草本清汤', '香茅清酸鱼汤', '仔姜炒鸡肉', '清蒸阿莫克鱼'],
    foodsToLimitKh: ['ការដាក់ប្រហុក ឬអំបិលប្រៃពេកក្នុងសម្ល', 'ការរំងាស់ស្លឹកម្រុំយូរពេកដែលធ្វើឱ្យបាត់បង់វីតាមីន C'],
    foodsToLimitEn: ['Excessive salted prahok in soup', 'Overboiling moringa leaves for too long'],
    foodsToLimitZh: ['汤中放入过量高盐鱼酱', '辣木叶久煮过度导致维生素 C 流失'],
    drinksKh: 'ទឹកស្លឹកគ្រៃក្តៅឧណ្ហៗ ទឹកខ្ញីក្តៅឧណ្ហៗ និងទឹកស្អាត ២ លីត្រ/ថ្ងៃ។',
    drinksEn: 'Warm lemongrass tea, warm ginger tea, and 2L plain water daily.',
    drinksZh: '温热香茅茶、温姜茶及每日 2 升白开水。',
    fruitsKh: 'ល្ហុងទុំ ត្របែក ក្រូចពោធិ៍សាត់ និងចេកណាំវ៉ា។',
    fruitsEn: 'Ripe papaya, guava, oranges, and bananas.',
    fruitsZh: '熟木瓜、番石榴、橙子和香蕉。',
    morningMealKh: 'អាហារពេលព្រឹក៖ នំបញ្ចុកសម្លប្រហើរស្លឹកម្រុំ ឬបបរត្រីខ្ញីស្រស់។',
    morningMealEn: 'Breakfast: Num Banh Chok with Moringa fish gravy or ginger fish porridge.',
    morningMealZh: '早餐：辣木叶鱼汤米粉或鲜姜生鱼粥。',
    eveningMealKh: 'អាហារពេលល្ងាច៖ សម្លកកូរត្រីស្លឹកម្រុំ (ប្រៃតិច) ជាមួយបាយសម្រូប។',
    eveningMealEn: 'Dinner: Low-sodium Samlor Korko with Moringa and brown rice.',
    eveningMealZh: '晚餐：低盐辣木叶高棉杂菜汤配糙米饭。',
    medicationCareKh: 'គ្រឿងទេសធម្មជាតិក្នុងម្ហូបអាហារគឺមានសុវត្ថិភាពខ្ពស់ ប៉ុន្តែជៀសវាងការលេបថ្នាំគ្រាប់ឱសថបុរាណកម្រិតខ្ពស់ដោយគ្មានការពិគ្រោះជាមួយគ្រូពេទ្យ។',
    medicationCareEn: 'Culinary herbs in food are safe and beneficial; consult a doctor before taking concentrated herbal extract pills.',
    medicationCareZh: '日常菜肴中的天然草本香料非常安全有益，但服用高浓度草药提取物胶囊前应咨询医生。',
    redFlagsKh: 'សូមលាងសម្អាតបន្លែឱ្យស្អាតជាមួយទឹកអំបិល ឬទឹកស្អាតច្រើនដងមុនយកទៅចម្អិន។',
    redFlagsEn: 'Wash all fresh vegetables thoroughly in clean running water before cooking.',
    recoveryTimelineKh: 'ការញ៉ាំសម្លបន្លែខ្មែរជារៀងរាល់ថ្ងៃ ជួយឱ្យប្រព័ន្ធរំលាយអាហារ និងប្រព័ន្ធភាពស៊ាំរឹងមាំយូរអង្វែង។',
    recoveryTimelineEn: 'Daily herbal vegetable soups support lifelong digestive and immune wellness.',
    recoveryTimelineZh: '长期食用传统草本蔬菜汤有助于维持肠道健康与持久免疫力。',
    redFlagsZh: '烹饪前请将所有新鲜蔬菜用流动清水充分洗净。',
    followUpSuggestionsKh: [
      'តើត្រូវចម្អិនសម្លកកូរដោយរបៀបណាឱ្យល្អសម្រាប់អ្នកលើសឈាម និងទឹកនោមផ្អែម?',
      'តើស្លឹកម្រុំមានអត្ថប្រយោជន៍អ្វីខ្លះចំពោះភ្នែក និងគ្រាប់ឈាម?',
      'តើខ្ញី និងរមៀតជួយការពារក្រពះ និងសន្លាក់បានដូចម្តេច?',
      'សូមណែនាំមុខម្ហូបឱសថធម្មជាតិខ្មែរសម្រាប់គ្រួសារ',
    ],
    followUpSuggestionsEn: [
      'How do I cook Samlor Korko for someone with diabetes or high blood pressure?',
      'What are the benefits of moringa leaves for vision and red blood cells?',
      'How do ginger and turmeric protect the stomach and joints?',
      'Recommend top Cambodian herbal dishes for family immunity',
    ],
    followUpSuggestionsZh: [
      '如何烹饪适合糖尿病和高血压患者的高棉养生杂菜汤？',
      '辣木叶对保护视力和补血有哪些具体益处？',
      '生姜和姜黄是如何保护胃粘膜与关节的？',
      '请推荐几道适合全家增强免疫力的柬式草本菜肴',
    ],
  },
];
export type FollowUpAspect =
  | 'overview'
  | 'drinks_hydration'
  | 'fruits_snacks'
  | 'morning_breakfast'
  | 'evening_dinner'
  | 'strict_avoidance'
  | 'medication_safety'
  | 'red_flags_emergency'
  | 'recovery_timeline'
  | 'daily_meal_plan'
  | 'comorbid_care'
  | 'deep_explanation';

export function detectFollowUpAspect(rawQuery: string, hasPreviousContext: boolean): FollowUpAspect {
  const q = (rawQuery || '').trim().toLowerCase();

  // 1. Red Flags / Emergency / Hospital / Doctor
  if (
    q.includes('ទៅមន្ទីរពេទ្យ') ||
    q.includes('ទៅពេទ្យ') ||
    q.includes('សញ្ញាគ្រោះថ្នាក់') ||
    q.includes('សញ្ញាអាសន្ន') ||
    q.includes('បន្ទាន់') ||
    q.includes('គ្រោះថ្នាក់ដល់ជីវិត') ||
    q.includes('ហូរឈាម') ||
    q.includes('119') ||
    q.includes('warning sign') ||
    q.includes('red flag') ||
    q.includes('see a doctor') ||
    q.includes('hospital') ||
    q.includes('emergency') ||
    q.includes('life-threatening') ||
    q.includes('bleeding') ||
    q.includes('去医院') ||
    q.includes('看医生') ||
    q.includes('危险信号') ||
    q.includes('危险症状') ||
    q.includes('急诊') ||
    q.includes('危及生命') ||
    q.includes('出血')
  ) {
    return 'red_flags_emergency';
  }

  // 2. Medication / Pills / Antibiotics / Drug Interactions
  if (
    q.includes('ថ្នាំ') ||
    q.includes('លេបថ្នាំ') ||
    q.includes('វេជ្ជបញ្ជា') ||
    q.includes('មុនបាយ') ||
    q.includes('ក្រោយបាយ') ||
    q.includes('ភ្លេចលេប') ||
    q.includes('medication') ||
    q.includes('medicine') ||
    q.includes('antibiotic') ||
    q.includes('painkiller') ||
    q.includes('before meal') ||
    q.includes('after meal') ||
    q.includes('miss a dose') ||
    q.includes('pill') ||
    q.includes('吃药') ||
    q.includes('服药') ||
    q.includes('用药') ||
    q.includes('药物') ||
    q.includes('抗生素') ||
    q.includes('止痛药') ||
    q.includes('饭前') ||
    q.includes('饭后') ||
    q.includes('漏服')
  ) {
    return 'medication_safety';
  }

  // 3. Drinks / Fluids / Hydration / Coffee / Tea / Milk / ORS
  if (
    q.includes('ផឹកទឹក') ||
    q.includes('ភេសជ្ជៈ') ||
    q.includes('អូរ៉ាលីត') ||
    q.includes('ទឹកដូង') ||
    q.includes('កាហ្វេ') ||
    q.includes('ទឹកដោះគោ') ||
    q.includes('តែ') ||
    q.includes('ស្រាបៀរ') ||
    q.includes('drink') ||
    q.includes('fluid') ||
    q.includes('water') ||
    q.includes('ors') ||
    q.includes('coffee') ||
    q.includes('milk') ||
    q.includes('tea') ||
    q.includes('beer') ||
    q.includes('喝什么') ||
    q.includes('饮品') ||
    q.includes('喝水') ||
    q.includes('补液') ||
    q.includes('咖啡') ||
    q.includes('牛奶') ||
    q.includes('喝茶') ||
    q.includes('啤酒')
  ) {
    return 'drinks_hydration';
  }

  // 4. Fruits & Snacks
  if (
    q.includes('ផ្លែឈើ') ||
    q.includes('ចេក') ||
    q.includes('ល្ហុង') ||
    q.includes('ក្រូច') ||
    q.includes('ត្របែក') ||
    q.includes('ផ្លែស្ពឺ') ||
    q.includes('fruit') ||
    q.includes('banana') ||
    q.includes('papaya') ||
    q.includes('orange') ||
    q.includes('apple') ||
    q.includes('starfruit') ||
    q.includes('水果') ||
    q.includes('香蕉') ||
    q.includes('木瓜') ||
    q.includes('橙子') ||
    q.includes('杨桃')
  ) {
    return 'fruits_snacks';
  }

  // 5. Breakfast / Morning Meal
  if (
    q.includes('ពេលព្រឹក') ||
    q.includes('អាហារព្រឹក') ||
    q.includes('បាយព្រឹក') ||
    q.includes('ចាញ់កូន') ||
    q.includes('breakfast') ||
    q.includes('morning') ||
    q.includes('早餐') ||
    q.includes('早上') ||
    q.includes('孕吐')
  ) {
    return 'morning_breakfast';
  }

  // 6. Dinner / Evening / Nighttime Meal
  if (
    q.includes('ពេលល្ងាច') ||
    q.includes('ពេលយប់') ||
    q.includes('បាយល្ងាច') ||
    q.includes('មុនគេង') ||
    q.includes('dinner') ||
    q.includes('evening') ||
    q.includes('at night') ||
    q.includes('nighttime') ||
    q.includes('晚餐') ||
    q.includes('晚上') ||
    q.includes('夜间') ||
    q.includes('睡前')
  ) {
    return 'evening_dinner';
  }

  // 7. Strict Avoidance / Taboo Foods
  if (
    q.includes('តមអ្វី') ||
    q.includes('តមអាហារ') ||
    q.includes('ហាមញ៉ាំ') ||
    q.includes('មិនគួរញ៉ាំ') ||
    q.includes('ដាច់ខាត') ||
    q.includes('avoid') ||
    q.includes('not eat') ||
    q.includes('forbidden') ||
    q.includes('limit') ||
    q.includes('忌口') ||
    q.includes('不能吃') ||
    q.includes('禁忌') ||
    q.includes('少吃')
  ) {
    return 'strict_avoidance';
  }

  // 8. 1-Day Meal Plan / Full Menu Summary
  if (
    q.includes('ផែនការអាហារ') ||
    q.includes('១ ថ្ងៃ') ||
    q.includes('1 ថ្ងៃ') ||
    q.includes('៣ ពេល') ||
    q.includes('3 ពេល') ||
    q.includes('សង្ខេប') ||
    q.includes('meal plan') ||
    q.includes('1-day') ||
    q.includes('1 day') ||
    q.includes('3-meal') ||
    q.includes('summarize') ||
    q.includes('一日三餐') ||
    q.includes('食谱') ||
    q.includes('总结')
  ) {
    return 'daily_meal_plan';
  }

  // 9. Recovery Timeline / How many days / Transition back to normal
  if (
    q.includes('ប៉ុន្មានថ្ងៃ') ||
    q.includes('ឆាប់ជា') ||
    q.includes('ក្រោយបាត់') ||
    q.includes('ក្រោយជា') ||
    q.includes('រយៈពេល') ||
    q.includes('how many days') ||
    q.includes('how long') ||
    q.includes('transition') ||
    q.includes('after recovery') ||
    q.includes('几天') ||
    q.includes('多久') ||
    q.includes('恢复正常') ||
    q.includes('康复期')
  ) {
    return 'recovery_timeline';
  }

  // 10. Comorbidity (Both diabetes & BP, etc.)
  if (
    (q.includes('ទាំង') && (q.includes('និង') || q.includes('ហើយ'))) ||
    q.includes('រួមផ្សំ') ||
    q.includes('both ') ||
    q.includes('also have') ||
    q.includes('同時') ||
    q.includes('同时')
  ) {
    return 'comorbid_care';
  }

  // 11. Why / Mechanism / Deep Explanation
  if (
    hasPreviousContext &&
    (q.includes('ហេតុអ្វី') ||
      q.includes('ដូចម្តេច') ||
      q.includes('ប៉ុន្មាន') ||
      q.includes('ចុះបើ') ||
      q.includes('ហើយបើ') ||
      q.includes('អាចញ៉ាំ') ||
      q.includes('why') ||
      q.includes('how') ||
      q.includes('can i') ||
      q.includes('what if') ||
      q.includes('为什么') ||
      q.includes('如何') ||
      q.includes('怎么') ||
      q.includes('可以吃'))
  ) {
    return 'deep_explanation';
  }

  return 'overview';
}

export function matchClinicalTopic(rawQuery: string, previousTopicId?: string): {
  topic: ClinicalTopicDefinition;
  isTopicSwitch: boolean;
  matchedDirectly: boolean;
} {
  const q = (rawQuery || '').trim().toLowerCase();
  const detectedAspect = detectFollowUpAspect(q, Boolean(previousTopicId));

  // Score each topic by how many keywords match (prioritizing longer/more specific matches)
  let bestTopic: ClinicalTopicDefinition | null = null;
  let bestScore = 0;

  for (const t of CLINICAL_TOPICS_CATALOG) {
    let score = 0;
    for (const kw of t.keywords) {
      const kwLower = kw.toLowerCase();
      const isShortAscii = /^[a-z0-9\s]{1,4}$/.test(kwLower);
      const matched = isShortAscii
        ? new RegExp(`\\b${kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(q)
        : q.includes(kwLower);
      if (matched) {
        score += kwLower.length * 2 + 10;
      }
    }
    if (score > 0) {
      if (t.safetyLevel === 'emergency') score += 15;
      else if (t.safetyLevel === 'urgent') score += 10;
    }
    if (score > bestScore) {
      bestScore = score;
      bestTopic = t;
    }
  }

  // When a conversation is already in progress on a specific clinical topic (e.g., Diabetes, Heart Pain, Enteritis)
  // and the user asks a follow-up about medication safety or red-flag emergency signs without naming a new disease,
  // keep the active clinical topic so the follow-up answer is tailored to that disease!
  if (
    previousTopicId &&
    bestTopic &&
    (bestTopic.topicId === 'qa-medication-interactions' ||
      bestTopic.topicId === 'qa-stroke-breathing-emergency') &&
    (detectedAspect === 'medication_safety' || detectedAspect === 'red_flags_emergency')
  ) {
    const prev = CLINICAL_TOPICS_CATALOG.find((t) => t.topicId === previousTopicId);
    const hasExplicitStrokeOrAnaphylaxis =
      q.includes('ដាច់សរសៃឈាម') ||
      q.includes('វៀចមាត់') ||
      q.includes('stroke') ||
      q.includes('anaphylaxis') ||
      q.includes('中风') ||
      q.includes('脑卒中');
    if (prev && !hasExplicitStrokeOrAnaphylaxis) {
      return {
        topic: prev,
        isTopicSwitch: false,
        matchedDirectly: false,
      };
    }
  }

  if (bestTopic && bestScore > 0) {
    return {
      topic: bestTopic,
      isTopicSwitch: Boolean(previousTopicId && previousTopicId !== bestTopic.topicId),
      matchedDirectly: true,
    };
  }

  // If no explicit topic keyword matched, inherit previousTopicId for seamless multi-turn conversation!
  if (previousTopicId) {
    const prev = CLINICAL_TOPICS_CATALOG.find((t) => t.topicId === previousTopicId);
    if (prev) {
      return {
        topic: prev,
        isTopicSwitch: false,
        matchedDirectly: false,
      };
    }
  }

  // Default fallback topic (Samlor Korko & General Wellness)
  return {
    topic: CLINICAL_TOPICS_CATALOG[CLINICAL_TOPICS_CATALOG.length - 1],
    isTopicSwitch: false,
    matchedDirectly: false,
  };
}

export function generateMultiTurnHealthAnswer(
  rawQuery: string,
  foods: FoodItem[],
  previousTopicId?: string,
  turnNumber = 1,
  preferredLang: 'km' | 'en' | 'zh' = 'km'
): {
  answer: HealthQaAnswer;
  topicId: string;
  isFollowUp: boolean;
  followUpAspect: FollowUpAspect;
  languageDetected: 'km' | 'en' | 'zh';
} {
  const q = (rawQuery || '').trim();
  const qLower = q.toLowerCase();
  const languageDetected = detectQueryLanguage(q, preferredLang);
  const hasPrev = Boolean(previousTopicId);

  // 1. Check if the user is asking about a specific Cambodian dish in our 200-dish database
  const matchedSpecificDish = foods.find((f) => {
    const kh = (f.nameKh || '').trim().toLowerCase();
    const en = (f.nameEn || '').trim().toLowerCase();
    return (kh.length >= 4 && qLower.includes(kh)) || (en.length >= 5 && qLower.includes(en));
  });

  const { topic, matchedDirectly } = matchClinicalTopic(q, previousTopicId);
  const aspect = detectFollowUpAspect(q, hasPrev || matchedDirectly);
  const isFollowUp = Boolean(hasPrev && (!matchedDirectly || aspect !== 'overview'));

  // Dish-specific inquiry when no clinical condition overrides it
  if (matchedSpecificDish && !matchedDirectly && aspect === 'overview') {
    const nut = getDishNutritionProfile(matchedSpecificDish);
    const related = getRecommendedDishesByHealthGoal(nut.matchingGoals[0] || 'all', foods)
      .filter((x) => x.food.id !== matchedSpecificDish.id)
      .slice(0, 3);
    const safetyBanner = buildSafetyEscalationBanner(
      'standard',
      matchedSpecificDish.nameKh,
      matchedSpecificDish.nameEn,
      matchedSpecificDish.nameEn,
      'សូមកែសម្រួលបរិមាណអំបិល ស្ករ និងខ្លាញ់ពេលចម្អិនឱ្យសមស្របតាមស្ថានភាពសុខភាពរបស់អ្នក។',
      'Adjust added salt, sugar, and cooking oil according to your personal health profile.',
      '请根据个人健康状况适量调整烹饪时的食盐、糖和食用油用量。'
    );

    const dishAnswer: HealthQaAnswer = {
      id: `dish-${matchedSpecificDish.id}-t${turnNumber}`,
      topicId: `dish-${matchedSpecificDish.id}`,
      turnNumber,
      isFollowUp,
      previousTopicId,
      safetyLevel: 'standard',
      safetyEscalation: safetyBanner,
      questionKh: q,
      questionEn: q,
      questionZh: q,
      categoryBadgeKh: `🍲 វិភាគអាហារូបត្ថម្ភ៖ ${matchedSpecificDish.nameKh}`,
      categoryBadgeEn: `🍲 Dish Nutrition Analysis: ${matchedSpecificDish.nameEn}`,
      categoryBadgeZh: `🍲 柬埔寨菜品营养分析：${matchedSpecificDish.nameEn}`,
      summaryKh: `«${matchedSpecificDish.nameKh}» មានពិន្ទុសុខភាព ${nut.healthScore}/100 ផ្តល់ថាមពលប្រមាណ ${nut.caloriesKcal} kcal ប្រូតេអ៊ីន ${nut.proteinG}g កាបូអ៊ីដ្រាត ${nut.carbsG}g ខ្លាញ់ ${nut.fatG}g និងជាតិសរសៃ ${nut.fiberG}g ក្នុងមួយចំណែក។ ${nut.healthBenefitsKh}`,
      summaryEn: `"${matchedSpecificDish.nameEn}" has a Health Score of ${nut.healthScore}/100, providing ~${nut.caloriesKcal} kcal, ${nut.proteinG}g protein, ${nut.carbsG}g carbs, ${nut.fatG}g fat, and ${nut.fiberG}g fiber per serving. ${nut.healthBenefitsEn}`,
      summaryZh: `“${matchedSpecificDish.nameEn}（${matchedSpecificDish.nameKh}）”健康评分为 ${nut.healthScore}/100，每份约含 ${nut.caloriesKcal} 千卡热量、蛋白质 ${nut.proteinG}g、碳水化合物 ${nut.carbsG}g、脂肪 ${nut.fatG}g 及膳食纤维 ${nut.fiberG}g。${nut.healthBenefitsEn}`,
      bulletPointsKh: [
        `⚡ ថាមពល និងសារធាតុចិញ្ចឹម៖ ${nut.caloriesKcal} kcal | ប្រូតេអ៊ីន ${nut.proteinG}g | ជាតិសរសៃ ${nut.fiberG}g`,
        `🧂 កម្រិតជាតិប្រៃ (សូដ្យូម)៖ ${nut.sodiumLevel === 'low' ? 'ទាបល្អ' : nut.sodiumLevel === 'medium' ? 'មធ្យម' : 'ខ្ពស់ (គួរកាត់បន្ថយអំបិល/ប្រហុក)'} (~${nut.sodiumMg} mg)`,
        `🌿 សារធាតុសំខាន់ៗ៖ ${nut.keyNutrientsKh.join(' • ')}`,
        `👩‍🍳 គន្លឹះចម្អិនឱ្យកាន់តែល្អសម្រាប់សុខភាព៖ ${nut.healthyCookingTipKh}`,
      ],
      bulletPointsEn: [
        `⚡ Macros per serving: ${nut.caloriesKcal} kcal | Protein ${nut.proteinG}g | Fiber ${nut.fiberG}g`,
        `🧂 Sodium level: ${nut.sodiumLevel.toUpperCase()} (~${nut.sodiumMg} mg)`,
        `🌿 Key Nutrients: ${nut.keyNutrientsEn.join(' • ')}`,
        `👩‍🍳 Healthy Cooking Tip: ${nut.healthyCookingTipEn}`,
      ],
      bulletPointsZh: [
        `⚡ 每份营养成分：热量 ${nut.caloriesKcal} kcal | 蛋白质 ${nut.proteinG}g | 膳食纤维 ${nut.fiberG}g`,
        `🧂 钠含量水平：${nut.sodiumLevel === 'low' ? '低钠健康' : nut.sodiumLevel === 'medium' ? '适中' : '偏高（建议少放盐/鱼露）'} (~${nut.sodiumMg} mg)`,
        `🌿 核心营养素：${nut.keyNutrientsEn.join(' • ')}`,
        `👩‍🍳 健康烹饪建议：${nut.healthyCookingTipEn}`,
      ],
      foodsToChooseKh: ['បន្លែបៃតងស្រស់បន្ថែម ៥០% នៃចាន', 'បាយសម្រូបក្នុងបរិមាណល្មម', 'ទឹកស្អាត ១-២ កែវ'],
      foodsToChooseEn: ['Extra fresh leafy greens (50% of plate)', 'Moderate portion of brown rice', '1–2 glasses of plain water'],
      foodsToChooseZh: ['搭配 50% 餐盘的新鲜绿叶蔬菜', '适量糙米饭', '1–2 杯温白开水'],
      foodsToLimitKh: ['ការថែមទឹកត្រី ឬប៊ីចេងបន្ថែមលើតុអាហារ', 'ភេសជ្ជៈផ្អែមពេលញ៉ាំបាយ'],
      foodsToLimitEn: ['Adding extra fish sauce or MSG at the table', 'Sugary soft drinks with meals'],
      foodsToLimitZh: ['餐桌上额外添加鱼露或味精', '随餐饮用高糖饮料'],
      recommendedDishes: [{ food: matchedSpecificDish, nutrition: nut }, ...related],
      medicalAdvisoryKh: nut.cautionNoteKh || UNCERTAINTY_NOTE_KH,
      medicalAdvisoryEn: nut.cautionNoteEn || UNCERTAINTY_NOTE_EN,
      medicalAdvisoryZh: UNCERTAINTY_NOTE_ZH,
      trustedSourcesKh: TRUSTED_SOURCES_KH,
      trustedSourcesEn: TRUSTED_SOURCES_EN,
      trustedSourcesZh: TRUSTED_SOURCES_ZH,
      uncertaintyNoteKh: UNCERTAINTY_NOTE_KH,
      uncertaintyNoteEn: UNCERTAINTY_NOTE_EN,
      uncertaintyNoteZh: UNCERTAINTY_NOTE_ZH,
      followUpSuggestionsKh: [
        `តើអ្នកជំងឺទឹកនោមផ្អែម អាចញ៉ាំ «${matchedSpecificDish.nameKh}» បានទេ?`,
        `តើអ្នកលើសឈាម គួរចម្អិន «${matchedSpecificDish.nameKh}» ដោយរបៀបណា?`,
        'តើគួរញ៉ាំផ្លែឈើអ្វីបន្ថែមក្រោយអាហារនេះ?',
        'សូមណែនាំមុខម្ហូបសុខភាពប្រចាំថ្ងៃ ៣ ពេល',
      ],
      followUpSuggestionsEn: [
        `Can someone with diabetes eat "${matchedSpecificDish.nameEn}" safely?`,
        `How should "${matchedSpecificDish.nameEn}" be cooked for high blood pressure?`,
        'Which fruits pair best after this meal?',
        'Recommend a 3-meal balanced Cambodian plan for today',
      ],
      followUpSuggestionsZh: [
        `糖尿病患者可以吃“${matchedSpecificDish.nameEn}”吗？`,
        `高血压患者该如何健康烹饪“${matchedSpecificDish.nameEn}”？`,
        '餐后搭配什么水果最健康？',
        '请推荐今日一日三餐健康柬式食谱',
      ],
    };

    return {
      answer: dishAnswer,
      topicId: `dish-${matchedSpecificDish.id}`,
      isFollowUp,
      followUpAspect: aspect,
      languageDetected,
    };
  }

  // 2. Build Topic + Aspect Specific Multi-Turn Response
  let effectiveSafetyLevel: SafetyEscalationLevel = topic.safetyLevel;
  if (aspect === 'red_flags_emergency' && effectiveSafetyLevel === 'standard') {
    effectiveSafetyLevel = 'urgent';
  } else if (aspect === 'medication_safety' && effectiveSafetyLevel === 'standard') {
    effectiveSafetyLevel = 'medication_caution';
  }

  const safetyBanner = buildSafetyEscalationBanner(
    effectiveSafetyLevel,
    topic.topicNameKh,
    topic.topicNameEn,
    topic.topicNameZh,
    topic.redFlagsKh,
    topic.redFlagsEn,
    topic.redFlagsZh
  );

  const recommendedDishes = getRecommendedDishesByHealthGoal(topic.goalId, foods).slice(0, 4);

  let summaryKh = topic.summaryKh;
  let summaryEn = topic.summaryEn;
  let summaryZh = topic.summaryZh;
  let badgeKh = topic.badgeKh;
  let badgeEn = topic.badgeEn;
  let badgeZh = topic.badgeZh;
  let bulletsKh = [...topic.bulletPointsKh];
  let bulletsEn = [...topic.bulletPointsEn];
  let bulletsZh = [...topic.bulletPointsZh];

  if (aspect === 'drinks_hydration') {
    badgeKh = `💧 ការជ្រើសរើសទឹក និងភេសជ្ជៈសម្រាប់៖ ${topic.topicNameKh}`;
    badgeEn = `💧 Hydration & Safe Drinks Guide: ${topic.topicNameEn}`;
    badgeZh = `💧 饮水与饮品指南：${topic.topicNameZh}`;
    summaryKh = `ចំពោះសំណួររបស់អ្នកអំពីការផឹកទឹក និងភេសជ្ជៈសម្រាប់ «${topic.topicNameKh}»៖ ${topic.drinksKh}`;
    summaryEn = `Regarding your follow-up on fluids and drinks for "${topic.topicNameEn}": ${topic.drinksEn}`;
    summaryZh = `针对您关于“${topic.topicNameZh}”饮水与饮品的追问：${topic.drinksZh}`;
    bulletsKh = [
      `💧 ភេសជ្ជៈដែលគួរផឹក៖ ${topic.drinksKh}`,
      `🍵 គន្លឹះសុវត្ថិភាព៖ ផឹកតិចៗតែញឹកញាប់ពេញមួយថ្ងៃ ជៀសវាងការផឹកទឹកត្រជាក់ខ្លាំង ឬភេសជ្ជៈផ្អែមខ្លាំង។`,
      `💊 ប្រសិនបើកំពុងលេបថ្នាំ៖ ${topic.medicationCareKh}`,
      `🚨 សញ្ញាត្រូវប្រុងប្រយ័ត្ន៖ ${topic.redFlagsKh}`,
    ];
    bulletsEn = [
      `💧 Recommended Fluids: ${topic.drinksEn}`,
      `🍵 Hydration Tip: Sip steadily throughout the day; avoid ice-cold or high-sugar beverages.`,
      `💊 Medication Note: ${topic.medicationCareEn}`,
      `🚨 Red Flags to Watch: ${topic.redFlagsEn}`,
    ];
    bulletsZh = [
      `💧 推荐饮品：${topic.drinksZh}`,
      `🍵 饮水技巧：全天小口慢饮，避免冰镇或高糖饮料。`,
      `💊 用药提示：${topic.medicationCareZh}`,
      `🚨 警示症状：${topic.redFlagsZh}`,
    ];
  } else if (aspect === 'fruits_snacks') {
    badgeKh = `🍎 ការជ្រើសរើសផ្លែឈើ និងអាហារសម្រន់សម្រាប់៖ ${topic.topicNameKh}`;
    badgeEn = `🍎 Safe Fruits & Snacks Guide: ${topic.topicNameEn}`;
    badgeZh = `🍎 水果与加餐选择指南：${topic.topicNameZh}`;
    summaryKh = `សម្រាប់ «${topic.topicNameKh}» ការជ្រើសរើសផ្លែឈើត្រឹមត្រូវជួយផ្តល់វីតាមីន និងជាតិសរសៃដោយមិនធ្វើឱ្យប៉ះពាល់ដល់អាការៈជំងឺ៖ ${topic.fruitsKh}`;
    summaryEn = `For "${topic.topicNameEn}", choosing the right fruits supplies essential vitamins and fiber safely: ${topic.fruitsEn}`;
    summaryZh = `针对“${topic.topicNameZh}”，合理选择水果可安全补充维生素与膳食纤维：${topic.fruitsZh}`;
    bulletsKh = [
      `🍎 ផ្លែឈើដែលគួរជ្រើសរើស៖ ${topic.fruitsKh}`,
      `🍽️ បរិមាណសមស្រប៖ គួរញ៉ាំផ្លែឈើស្រស់ ១ ក្តាប់ដៃក្រោយអាហារ ៣០ នាទី (ល្អជាងការផឹកទឹកផ្លែឈើកិនដាក់ស្ករ)។`,
      `🚫 អ្វីដែលគួរជៀសវាង៖ ${topic.foodsToLimitKh.join(' • ')}`,
      `💧 គួបផ្សំជាមួយ៖ ${topic.drinksKh}`,
    ];
    bulletsEn = [
      `🍎 Recommended Fruits: ${topic.fruitsEn}`,
      `🍽️ Portion Rule: Eat 1 fist-sized portion of whole fruit 30 minutes after meals rather than sweetened fruit juice.`,
      `🚫 Items to Limit: ${topic.foodsToLimitEn.join(' • ')}`,
      `💧 Pair With Hydration: ${topic.drinksEn}`,
    ];
    bulletsZh = [
      `🍎 推荐水果：${topic.fruitsZh}`,
      `🍽️ 食用分量：建议餐后 30 分钟吃一拳大小的新鲜完整水果（优于含糖果汁）。`,
      `🚫 需限制食物：${topic.foodsToLimitZh.join(' • ')}`,
      `💧 配合饮水：${topic.drinksZh}`,
    ];
  } else if (aspect === 'morning_breakfast') {
    badgeKh = `🌅 អាហារពេលព្រឹកល្អបំផុតសម្រាប់៖ ${topic.topicNameKh}`;
    badgeEn = `🌅 Optimal Breakfast Guide: ${topic.topicNameEn}`;
    badgeZh = `🌅 营养早餐指南：${topic.topicNameZh}`;
    summaryKh = `អាហារពេលព្រឹកគឺជាពេលដ៏សំខាន់បំផុតសម្រាប់អ្នកមាន «${topic.topicNameKh}»៖ ${topic.morningMealKh}`;
    summaryEn = `Breakfast sets the metabolic and recovery foundation for "${topic.topicNameEn}": ${topic.morningMealEn}`;
    summaryZh = `早餐对“${topic.topicNameZh}”的康复与代谢至关重要：${topic.morningMealZh}`;
    bulletsKh = [
      `🌅 មុខម្ហូបពេលព្រឹកណែនាំ៖ ${topic.morningMealKh}`,
      `💧 ភេសជ្ជៈពេលព្រឹក៖ ${topic.drinksKh}`,
      `🍎 ផ្លែឈើបន្ថែម៖ ${topic.fruitsKh}`,
      `💊 ការលេបថ្នាំពេលព្រឹក៖ ${topic.medicationCareKh}`,
    ];
    bulletsEn = [
      `🌅 Recommended Breakfast: ${topic.morningMealEn}`,
      `💧 Morning Hydration: ${topic.drinksEn}`,
      `🍎 Fruit Pairing: ${topic.fruitsEn}`,
      `💊 Morning Medication Care: ${topic.medicationCareEn}`,
    ];
    bulletsZh = [
      `🌅 推荐早餐：${topic.morningMealZh}`,
      `💧 晨间饮水：${topic.drinksZh}`,
      `🍎 水果搭配：${topic.fruitsZh}`,
      `💊 早间用药提示：${topic.medicationCareZh}`,
    ];
  } else if (aspect === 'evening_dinner') {
    badgeKh = `🌙 អាហារពេលល្ងាច និងការថែទាំពេលយប់សម្រាប់៖ ${topic.topicNameKh}`;
    badgeEn = `🌙 Evening Meal & Nighttime Care: ${topic.topicNameEn}`;
    badgeZh = `🌙 晚餐与夜间护理指南：${topic.topicNameZh}`;
    summaryKh = `សម្រាប់ពេលល្ងាច និងពេលយប់ អ្នកមាន «${topic.topicNameKh}» គួរញ៉ាំអាហារស្រាលៗមុនម៉ោង ៧ យប់ ដើម្បីឱ្យរាងកាយសម្រាក និងជួសជុលកោសិកា៖ ${topic.eveningMealKh}`;
    summaryEn = `In the evening, patients with "${topic.topicNameEn}" should eat a light, early dinner before 7 PM to support overnight recovery: ${topic.eveningMealEn}`;
    summaryZh = `针对“${topic.topicNameZh}”，晚餐宜在晚 7 点前食用清淡易消化的菜肴，以利夜间修复：${topic.eveningMealZh}`;
    bulletsKh = [
      `🌙 មុខម្ហូបពេលល្ងាចណែនាំ៖ ${topic.eveningMealKh}`,
      `⏰ ម៉ោងញ៉ាំអាហារ៖ គួរញ៉ាំឱ្យរួចរាល់យ៉ាងតិច ២.៥ ទៅ ៣ ម៉ោងមុនចូលគេង។`,
      `🚫 អាហារគួរតមពេលយប់៖ ${topic.foodsToLimitKh.join(' • ')}`,
      `😴 ការសម្រាក៖ ${topic.recoveryTimelineKh}`,
    ];
    bulletsEn = [
      `🌙 Recommended Dinner: ${topic.eveningMealEn}`,
      `⏰ Timing Rule: Finish dinner at least 2.5–3 hours before lying down to sleep.`,
      `🚫 Avoid at Night: ${topic.foodsToLimitEn.join(' • ')}`,
      `😴 Recovery & Rest: ${topic.recoveryTimelineEn}`,
    ];
    bulletsZh = [
      `🌙 推荐晚餐：${topic.eveningMealZh}`,
      `⏰ 进餐时间：建议睡前 2.5–3 小时完成晚餐。`,
      `🚫 夜间忌口：${topic.foodsToLimitZh.join(' • ')}`,
      `😴 休息与恢复：${topic.recoveryTimelineZh}`,
    ];
  } else if (aspect === 'strict_avoidance') {
    badgeKh = `🚫 អាហារ និងភេសជ្ជៈដែលត្រូវតមសម្រាប់៖ ${topic.topicNameKh}`;
    badgeEn = `🚫 Foods & Drinks to Strictly Avoid: ${topic.topicNameEn}`;
    badgeZh = `🚫 严格忌口与饮食禁忌：${topic.topicNameZh}`;
    summaryKh = `ដើម្បីការពារកុំឱ្យ «${topic.topicNameKh}» កាន់តែធ្ងន់ធ្ងរ ឬលាប់ឡើងវិញ សូមជៀសវាងអាហារ និងភេសជ្ជៈខាងក្រោមនេះឱ្យបានម៉ឺងម៉ាត់៖ ${topic.foodsToLimitKh.join(' ၊ ')}។`;
    summaryEn = `To prevent worsening or flare-ups of "${topic.topicNameEn}", strictly avoid or limit: ${topic.foodsToLimitEn.join(', ')}.`;
    summaryZh = `为防止“${topic.topicNameZh}”加重或复发，请严格忌口或限制以下食物：${topic.foodsToLimitZh.join('、')}。`;
    bulletsKh = [
      `🚫 អាហារត្រូវតម៖ ${topic.foodsToLimitKh.join(' • ')}`,
      `✅ អាហារជំនួសដែលមានសុវត្ថិភាព៖ ${topic.foodsToChooseKh.join(' • ')}`,
      `💊 ថ្នាំដែលគួរប្រុងប្រយ័ត្ន៖ ${topic.medicationCareKh}`,
      `🚨 សញ្ញាគ្រោះថ្នាក់៖ ${topic.redFlagsKh}`,
    ];
    bulletsEn = [
      `🚫 Strictly Limit/Avoid: ${topic.foodsToLimitEn.join(' • ')}`,
      `✅ Safe Alternatives: ${topic.foodsToChooseEn.join(' • ')}`,
      `💊 Medication Precautions: ${topic.medicationCareEn}`,
      `🚨 Red Flag Symptoms: ${topic.redFlagsEn}`,
    ];
    bulletsZh = [
      `🚫 严格忌口食物：${topic.foodsToLimitZh.join(' • ')}`,
      `✅ 安全替代食材：${topic.foodsToChooseZh.join(' • ')}`,
      `💊 用药注意事项：${topic.medicationCareZh}`,
      `🚨 危险警示症状：${topic.redFlagsZh}`,
    ];
  } else if (aspect === 'medication_safety') {
    badgeKh = `💊 ការប្រើប្រាស់ថ្នាំពេទ្យដោយសុវត្ថិភាពសម្រាប់៖ ${topic.topicNameKh}`;
    badgeEn = `💊 Safe Medication & Drug-Food Rules: ${topic.topicNameEn}`;
    badgeZh = `💊 用药安全与饮食配合：${topic.topicNameZh}`;
    summaryKh = `គោលការណ៍សុវត្ថិភាពវេជ្ជសាស្ត្រក្នុងការប្រើប្រាស់ថ្នាំសម្រាប់ «${topic.topicNameKh}»៖ ${topic.medicationCareKh}`;
    summaryEn = `Clinical medication safety and food-interaction guidance for "${topic.topicNameEn}": ${topic.medicationCareEn}`;
    summaryZh = `针对“${topic.topicNameZh}”的临床安全用药与食物相互作用指南：${topic.medicationCareZh}`;
    bulletsKh = [
      `💊 ការណែនាំអំពីថ្នាំពេទ្យ៖ ${topic.medicationCareKh}`,
      `💧 របៀបលេបថ្នាំ៖ លេបជាមួយទឹកស្អាត ១ កែវពេញ (កុំលេបជាមួយតែ កាហ្វេ ទឹកដោះគោ ឬគ្រឿងស្រវឹង)។`,
      `⏱️ បើភ្លេចលេបថ្នាំ ១ ពេល៖ លេបភ្លាមពេលនឹកឃើញ តែបើជិតដល់ម៉ោងលេបពេលបន្ទាប់ហើយ សូមរំលងពេលដែលភ្លេចនោះ (ហាមលេបថ្នាំគុណនឹង ២ ដងក្នុងពេលតែមួយដាច់ខាត!)។`,
      `🚨 សញ្ញាត្រូវទៅមន្ទីរពេទ្យភ្លាម៖ ${topic.redFlagsKh}`,
    ];
    bulletsEn = [
      `💊 Medication Guidance: ${topic.medicationCareEn}`,
      `💧 How to Take: Always swallow pills with a full glass of plain water—never with alcohol, strong tea, or coffee.`,
      `⏱️ Missed Dose Rule: Take as soon as remembered unless it is nearly time for the next dose—NEVER double a dose!`,
      `🚨 When to Seek Immediate Hospital Care: ${topic.redFlagsEn}`,
    ];
    bulletsZh = [
      `💊 核心用药指导：${topic.medicationCareZh}`,
      `💧 送服方式：务必使用一整杯温白开水送服，切勿用酒、浓茶或咖啡送服。`,
      `⏱️ 漏服处理原则：想起时立即补服；若已接近下一次服药时间则跳过漏服剂量，严禁一次服用双倍剂量！`,
      `🚨 需立即就医的情况：${topic.redFlagsZh}`,
    ];
  } else if (aspect === 'red_flags_emergency') {
    badgeKh = `🚨 សញ្ញាគ្រោះថ្នាក់ត្រូវទៅមន្ទីរពេទ្យបន្ទាន់ (${topic.topicNameKh})`;
    badgeEn = `🚨 Red-Flag Emergency Symptoms (${topic.topicNameEn})`;
    badgeZh = `🚨 必须立即就医的危险警示信号（${topic.topicNameZh}）`;
    summaryKh = `⚠️ សូមពិនិត្យរោគសញ្ញាគ្រោះថ្នាក់សម្រាប់ «${topic.topicNameKh}»៖ ${topic.redFlagsKh} ប្រសិនបើមានសញ្ញាណាមួយខាងលើ សូមទូរស័ព្ទទៅ 119 ឬទៅមន្ទីរពេទ្យដែលជិតបំផុតភ្លាមៗ!`;
    summaryEn = `⚠️ Check these urgent warning signs for "${topic.topicNameEn}": ${topic.redFlagsEn} If any of these occur, call 119 or go to the nearest Hospital Emergency Room immediately!`;
    summaryZh = `⚠️ 请对照“${topic.topicNameZh}”的危险警示信号：${topic.redFlagsZh} 若出现上述任何症状，请立即拨打 119 或马上前往最近医院急诊科！`;
    bulletsKh = [
      `🚨 សញ្ញាអាសន្ន៖ ${topic.redFlagsKh}`,
      `📞 លេខទូរស័ព្ទសង្គ្រោះបន្ទាន់នៅកម្ពុជា៖ 119 (រថយន្តគិលានសង្គ្រោះបន្ទាន់ ២៤ ម៉ោង)។`,
      `💊 ការប្រុងប្រយ័ត្នថ្នាំពេទ្យ៖ ${topic.medicationCareKh}`,
      `💧 ការថែទាំបឋម៖ ${topic.drinksKh}`,
    ];
    bulletsEn = [
      `🚨 Critical Red Flags: ${topic.redFlagsEn}`,
      `📞 Cambodia 24/7 Emergency Ambulance: Call 119 or proceed to the nearest hospital.`,
      `💊 Medication Caution: ${topic.medicationCareEn}`,
      `💧 Supportive Care: ${topic.drinksEn}`,
    ];
    bulletsZh = [
      `🚨 急诊红旗信号：${topic.redFlagsZh}`,
      `📞 柬埔寨 24 小时急救电话：119（或立即前往最近的医院急诊科）。`,
      `💊 用药禁忌提示：${topic.medicationCareZh}`,
      `💧 基础支持护理：${topic.drinksZh}`,
    ];
  } else if (aspect === 'daily_meal_plan' || aspect === 'recovery_timeline' || aspect === 'comorbid_care' || aspect === 'deep_explanation') {
    badgeKh = `📋 ផែនការអាហារ ១ ថ្ងៃ & ការថែទាំស៊ីជម្រៅ៖ ${topic.topicNameKh}`;
    badgeEn = `📋 1-Day Recovery Plan & Deep Clinical Care: ${topic.topicNameEn}`;
    badgeZh = `📋 一日三餐恢复食谱与深度护理：${topic.topicNameZh}`;
    summaryKh = `នេះជាផែនការអាហារ ១ ថ្ងៃពេញ និងការណែនាំស៊ីជម្រៅសម្រាប់សំណួរបន្តរបស់អ្នកអំពី «${topic.topicNameKh}»៖ ${topic.recoveryTimelineKh}`;
    summaryEn = `Here is your complete 1-day meal plan and clinical follow-up guidance for "${topic.topicNameEn}": ${topic.recoveryTimelineEn}`;
    summaryZh = `以下为您整理的“${topic.topicNameZh}”一日三餐完整恢复方案与深度护理建议：${topic.recoveryTimelineZh}`;
    bulletsKh = [
      `🌅 អាហារពេលព្រឹក៖ ${topic.morningMealKh}`,
      `☀️ អាហារថ្ងៃត្រង់ និងផ្លែឈើ៖ ${topic.foodsToChooseKh.slice(0, 3).join(' ឬ ')} + ${topic.fruitsKh}`,
      `🌙 អាហារពេលល្ងាច៖ ${topic.eveningMealKh}`,
      `💧 ការផឹកទឹក និងរយៈពេលជាសះស្បើយ៖ ${topic.drinksKh} (${topic.recoveryTimelineKh})`,
    ];
    bulletsEn = [
      `🌅 Breakfast: ${topic.morningMealEn}`,
      `☀️ Lunch & Fruit: ${topic.foodsToChooseEn.slice(0, 3).join(' or ')} + ${topic.fruitsEn}`,
      `🌙 Dinner: ${topic.eveningMealEn}`,
      `💧 Hydration & Recovery Timeline: ${topic.drinksEn} (${topic.recoveryTimelineEn})`,
    ];
    bulletsZh = [
      `🌅 早餐安排：${topic.morningMealZh}`,
      `☀️ 午餐与水果：${topic.foodsToChooseZh.slice(0, 3).join(' 或 ')} + ${topic.fruitsZh}`,
      `🌙 晚餐安排：${topic.eveningMealZh}`,
      `💧 饮水与康复周期：${topic.drinksZh}（${topic.recoveryTimelineZh}）`,
    ];
  }

  // Rotate follow-up suggestions so consecutive turns always offer fresh next questions!
  const extraFollowUpsKh = [
    `សូមសង្ខេបផែនការអាហារ ១ ថ្ងៃសម្រាប់ ${topic.topicNameKh}`,
    `តើពេលព្រឹកគួរញ៉ាំអ្វីសម្រាប់ ${topic.topicNameKh}?`,
    `តើពេលល្ងាចគួរញ៉ាំអ្វីសម្រាប់ ${topic.topicNameKh}?`,
    `តើត្រូវថែទាំប៉ុន្មានថ្ងៃទើបធូរស្រាល?`,
  ];
  const extraFollowUpsEn = [
    `Summarize a 1-day meal plan for ${topic.topicNameEn}`,
    `What is the best breakfast for ${topic.topicNameEn}?`,
    `What should I eat for dinner with ${topic.topicNameEn}?`,
    `How many days of recovery care are needed?`,
  ];
  const extraFollowUpsZh = [
    `请总结一份针对${topic.topicNameZh}的一日三餐食谱`,
    `${topic.topicNameZh}早餐吃什么最好？`,
    `${topic.topicNameZh}晚餐应该吃什么？`,
    `通常需要调理几天才能恢复？`,
  ];

  const combinedFollowUpsKh = [...topic.followUpSuggestionsKh, ...extraFollowUpsKh]
    .filter((s) => s.toLowerCase() !== qLower)
    .slice((turnNumber - 1) % 3, ((turnNumber - 1) % 3) + 4);
  const combinedFollowUpsEn = [...topic.followUpSuggestionsEn, ...extraFollowUpsEn]
    .filter((s) => s.toLowerCase() !== qLower)
    .slice((turnNumber - 1) % 3, ((turnNumber - 1) % 3) + 4);
  const combinedFollowUpsZh = [...topic.followUpSuggestionsZh, ...extraFollowUpsZh]
    .filter((s) => s.toLowerCase() !== qLower)
    .slice((turnNumber - 1) % 3, ((turnNumber - 1) % 3) + 4);

  const answer: HealthQaAnswer = {
    id: `${topic.topicId}-${aspect}-t${turnNumber}`,
    topicId: topic.topicId,
    turnNumber,
    isFollowUp,
    previousTopicId,
    safetyLevel: effectiveSafetyLevel,
    safetyEscalation: safetyBanner,
    questionKh: q,
    questionEn: q,
    questionZh: q,
    categoryBadgeKh: badgeKh,
    categoryBadgeEn: badgeEn,
    categoryBadgeZh: badgeZh,
    summaryKh,
    summaryEn,
    summaryZh,
    bulletPointsKh: bulletsKh,
    bulletPointsEn: bulletsEn,
    bulletPointsZh: bulletsZh,
    foodsToChooseKh: topic.foodsToChooseKh,
    foodsToChooseEn: topic.foodsToChooseEn,
    foodsToChooseZh: topic.foodsToChooseZh,
    foodsToLimitKh: topic.foodsToLimitKh,
    foodsToLimitEn: topic.foodsToLimitEn,
    foodsToLimitZh: topic.foodsToLimitZh,
    recommendedDishes,
    medicalAdvisoryKh: `⚕️ ${topic.medicationCareKh} ${UNCERTAINTY_NOTE_KH}`,
    medicalAdvisoryEn: `⚕️ ${topic.medicationCareEn} ${UNCERTAINTY_NOTE_EN}`,
    medicalAdvisoryZh: `⚕️ ${topic.medicationCareZh} ${UNCERTAINTY_NOTE_ZH}`,
    trustedSourcesKh: TRUSTED_SOURCES_KH,
    trustedSourcesEn: TRUSTED_SOURCES_EN,
    trustedSourcesZh: TRUSTED_SOURCES_ZH,
    uncertaintyNoteKh: UNCERTAINTY_NOTE_KH,
    uncertaintyNoteEn: UNCERTAINTY_NOTE_EN,
    uncertaintyNoteZh: UNCERTAINTY_NOTE_ZH,
    followUpSuggestionsKh: combinedFollowUpsKh,
    followUpSuggestionsEn: combinedFollowUpsEn,
    followUpSuggestionsZh: combinedFollowUpsZh,
  };

  return {
    answer,
    topicId: topic.topicId,
    isFollowUp,
    followUpAspect: aspect,
    languageDetected,
  };
}

// ============================================================================
// SESSION & CONVERSATION HISTORY MANAGEMENT (Per Account & Device)
// ============================================================================

const SESSION_STORAGE_PREFIX = 'kft_health_assistant_session_v3_';
const lastQueryTimeBySession = new Map<string, number>();

export function getHealthSessionStorageKey(userId?: string): string {
  return `${SESSION_STORAGE_PREFIX}${userId || 'guest'}`;
}

export function createHealthConversationSession(
  userId = 'guest',
  accountLabel = 'Guest User',
  deviceProfile = 'Mobile Android / Web'
): HealthConversationSession {
  const now = new Date().toISOString();
  const session: HealthConversationSession = {
    sessionId: `hchat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId,
    accountLabel,
    deviceProfile,
    createdAt: now,
    updatedAt: now,
    activeTopicId: '',
    turns: [],
  };
  saveHealthConversationSession(session);
  return session;
}

export function loadHealthConversationSession(
  userId = 'guest',
  accountLabel = 'Guest User',
  deviceProfile = 'Mobile Android / Web'
): HealthConversationSession {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(getHealthSessionStorageKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.sessionId && Array.isArray(parsed.turns)) {
          return parsed;
        }
      }
    }
  } catch {
    // ignore storage read error
  }
  return createHealthConversationSession(userId, accountLabel, deviceProfile);
}

export function saveHealthConversationSession(session: HealthConversationSession): void {
  try {
    if (typeof localStorage !== 'undefined') {
      // Keep up to 40 turns per session so localStorage stays compact and fast
      const trimmed: HealthConversationSession = {
        ...session,
        turns: session.turns.slice(-40),
      };
      localStorage.setItem(getHealthSessionStorageKey(session.userId), JSON.stringify(trimmed));
    }
  } catch {
    // ignore storage write error
  }
}

export function resetHealthConversationSession(
  userId = 'guest',
  accountLabel = 'Guest User',
  deviceProfile = 'Mobile Android / Web'
): HealthConversationSession {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(getHealthSessionStorageKey(userId));
    }
  } catch {
    // ignore
  }
  return createHealthConversationSession(userId, accountLabel, deviceProfile);
}

export function askHealthAssistantInSession(
  session: HealthConversationSession,
  rawQuestion: string,
  foods: FoodItem[],
  preferredLang: 'km' | 'en' | 'zh' = 'km'
): {
  updatedSession: HealthConversationSession;
  turn: HealthConversationTurn;
  rateLimitOk: boolean;
} {
  const startMs = Date.now();
  const cleanQuestion = (rawQuestion || '').trim();

  // Lightweight rate-limit guard (prevents accidental double-tap within 80ms while allowing rapid multi-turn testing)
  const lastTime = lastQueryTimeBySession.get(session.sessionId) || 0;
  const rateLimitOk = startMs - lastTime >= 50;
  lastQueryTimeBySession.set(session.sessionId, startMs);

  const nextTurnNumber = session.turns.length + 1;
  const previousTopicId = session.activeTopicId || undefined;

  const { answer, topicId, isFollowUp, followUpAspect, languageDetected } =
    generateMultiTurnHealthAnswer(
      cleanQuestion,
      foods,
      previousTopicId,
      nextTurnNumber,
      preferredLang
    );

  const responseTimeMs = Math.max(1, Date.now() - startMs);

  const turn: HealthConversationTurn = {
    turnId: `turn-${nextTurnNumber}-${Date.now()}`,
    sessionId: session.sessionId,
    turnNumber: nextTurnNumber,
    timestamp: new Date().toISOString(),
    question: cleanQuestion,
    languageDetected,
    topicId,
    previousTopicId,
    isFollowUp,
    followUpAspect,
    status: 'success',
    answer,
    responseTimeMs,
  };

  const updatedSession: HealthConversationSession = {
    ...session,
    updatedAt: turn.timestamp,
    activeTopicId: topicId,
    turns: [...session.turns, turn],
  };

  saveHealthConversationSession(updatedSession);

  return {
    updatedSession,
    turn,
    rateLimitOk,
  };
}

export function retryHealthTurnInSession(
  session: HealthConversationSession,
  turnId: string,
  foods: FoodItem[],
  preferredLang: 'km' | 'en' | 'zh' = 'km'
): {
  updatedSession: HealthConversationSession;
  turn: HealthConversationTurn | null;
} {
  const idx = session.turns.findIndex((t) => t.turnId === turnId);
  if (idx === -1) return { updatedSession: session, turn: null };

  const target = session.turns[idx];
  const prevTopic = idx > 0 ? session.turns[idx - 1].topicId : undefined;
  const startMs = Date.now();

  const { answer, topicId, isFollowUp, followUpAspect, languageDetected } =
    generateMultiTurnHealthAnswer(
      target.question,
      foods,
      prevTopic,
      target.turnNumber,
      preferredLang
    );

  const refreshedTurn: HealthConversationTurn = {
    ...target,
    timestamp: new Date().toISOString(),
    languageDetected,
    topicId,
    previousTopicId: prevTopic,
    isFollowUp,
    followUpAspect,
    status: 'success',
    answer,
    responseTimeMs: Math.max(1, Date.now() - startMs),
  };

  const nextTurns = [...session.turns];
  nextTurns[idx] = refreshedTurn;

  const updatedSession: HealthConversationSession = {
    ...session,
    updatedAt: refreshedTurn.timestamp,
    activeTopicId: nextTurns[nextTurns.length - 1].topicId,
    turns: nextTurns,
  };

  saveHealthConversationSession(updatedSession);
  return { updatedSession, turn: refreshedTurn };
}

export const HEALTH_QUICK_QUESTIONS_TRILINGUAL = [
  {
    id: 'qq-flu',
    badgeKh: '🤒 គ្រុនផ្ដាសាយ & ក្ដៅខ្លួន',
    badgeEn: '🤒 Flu, Cold & Fever',
    badgeZh: '🤒 感冒发烧护理',
    questionKh: 'គ្រុនផ្ដាសាយ និងក្ដៅខ្លួន គួរញ៉ាំអាហារអ្វី?',
    questionEn: 'What should I eat and drink when I have the flu or fever?',
    questionZh: '感冒发烧时应该吃什么食物和饮品？',
  },
  {
    id: 'qq-throat',
    badgeKh: '🗣️ ឈឺ ក & ក្អក',
    badgeEn: '🗣️ Sore Throat & Cough',
    badgeZh: '🗣️ 喉咙痛与咳嗽',
    questionKh: 'ឈឺ ក និងក្អក គួរញ៉ាំអ្វី និងតមអ្វីខ្លះ?',
    questionEn: 'What foods soothe a sore throat and cough, and what should I avoid?',
    questionZh: '喉咙痛和咳嗽吃什么好？需要忌口什么？',
  },
  {
    id: 'qq-enteritis',
    badgeKh: '🦠 រលាកពោះវៀន & រាគ',
    badgeEn: '🦠 Enteritis & Diarrhea',
    badgeZh: '🦠 肠炎与腹泻',
    questionKh: 'រលាកពោះវៀន និងរាគរូស គួរញ៉ាំអ្វីដើម្បីឆាប់ជា?',
    questionEn: 'What should I eat for enteritis and acute diarrhea recovery?',
    questionZh: '急性肠胃炎和腹泻应该吃什么恢复？',
  },
  {
    id: 'qq-heart',
    badgeKh: '🚨 ឈឺបេះដូង / ចុកទ្រូង',
    badgeEn: '🚨 Chest & Heart Pain',
    badgeZh: '🚨 胸痛与心脏健康',
    questionKh: 'ឈឺបេះដូង ឬចុកណែនទ្រូង ត្រូវធ្វើដូចម្តេច និងថែទាំបេះដូងបែបណា?',
    questionEn: 'What are the emergency signs of chest/heart pain and heart-healthy foods?',
    questionZh: '胸痛心脏疼有哪些急救信号？日常如何护心饮食？',
  },
  {
    id: 'qq-diabetes',
    badgeKh: '🩸 ទឹកនោមផ្អែម & ជាតិស្ករ',
    badgeEn: '🩸 Diabetes & Blood Sugar',
    badgeZh: '🩸 糖尿病控糖饮食',
    questionKh: 'តើអ្នកមានជំងឺទឹកនោមផ្អែម គួរញ៉ាំម្ហូបខ្មែរអ្វីខ្លះ?',
    questionEn: 'Which Cambodian dishes are best for diabetes and blood sugar control?',
    questionZh: '糖尿病患者适合吃哪些柬埔寨健康菜肴？',
  },
  {
    id: 'qq-bp',
    badgeKh: '❤️ លើសឈាម & បន្ថយប្រៃ',
    badgeEn: '❤️ High Blood Pressure',
    badgeZh: '❤️ 高血压低盐饮食',
    questionKh: 'តើអ្នកលើសសម្ពាធឈាម គួរជ្រើសរើសម្ហូបបែបណា?',
    questionEn: 'How should someone with high blood pressure choose low-sodium Khmer meals?',
    questionZh: '高血压患者如何选择低盐健康的柬埔寨饮食？',
  },
  {
    id: 'qq-stomach',
    badgeKh: '🥣 ឈឺក្រពះ & ច្រាលអាស៊ីត',
    badgeEn: '🥣 Gastritis & Acid Reflux',
    badgeZh: '🥣 胃炎与反酸护胃',
    questionKh: 'ឈឺក្រពះ ឆ្អល់ពោះ និងច្រាលអាស៊ីត គួរញ៉ាំអាហារបែបណា?',
    questionEn: 'What gentle foods help gastritis, bloating, and acid reflux?',
    questionZh: '胃炎、胃胀和反酸应该吃什么温和养胃的食物？',
  },
  {
    id: 'qq-meds',
    badgeKh: '💊 សុវត្ថិភាពប្រើថ្នាំពេទ្យ',
    badgeEn: '💊 Medication Safety',
    badgeZh: '💊 安全用药禁忌',
    questionKh: 'តើពេលលេបថ្នាំពេទ្យ ត្រូវតមអាហារ ឬភេសជ្ជៈអ្វីខ្លះ?',
    questionEn: 'What foods and drinks should I avoid when taking medications?',
    questionZh: '服药期间需要避免哪些食物和饮品相互作用？',
  },
  {
    id: 'qq-pregnancy',
    badgeKh: '🫄 ស្ត្រីមានផ្ទៃពោះ & ជាតិដែក',
    badgeEn: '🫄 Pregnancy & Iron',
    badgeZh: '🫄 孕期营养与补铁',
    questionKh: 'ស្ត្រីមានផ្ទៃពោះ គួរញ៉ាំអាហារអ្វីដើម្បីសម្បូរជាតិដែក និងសុវត្ថិភាព?',
    questionEn: 'What iron-rich Cambodian foods are safest during pregnancy?',
    questionZh: '孕妇吃哪些柬埔寨菜肴能安全补铁和补充叶酸？',
  },
  {
    id: 'qq-korko',
    badgeKh: '🌿 សម្លកកូរ & ស្លឹកម្រុំ',
    badgeEn: '🌿 Samlor Korko & Moringa',
    badgeZh: '🌿 柬式杂菜汤与辣木叶',
    questionKh: 'ហេតុអ្វីសម្លកកូរ និងស្លឹកម្រុំ ល្អបំផុតសម្រាប់សុខភាព?',
    questionEn: 'Why are Samlor Korko and moringa leaves so beneficial for health?',
    questionZh: '为什么柬式杂菜汤（Samlor Korko）和辣木叶对健康极有益？',
  },
];

