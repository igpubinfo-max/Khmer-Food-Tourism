/**
 * Static, genuine cultural & practical content for the Guide tab.
 * Everything that depends on live app data (dishes, shops, places, saved items) is computed in GuideView.
 * Festival dates follow the lunar calendar, so only the typical month is listed.
 */

export interface Tri {
  km: string;
  en: string;
  zh: string;
}

// ---------------------------------------------------------------------------
// Meal slots (used for time-aware dish picks)
// ---------------------------------------------------------------------------
export type MealSlotId = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export interface MealSlot {
  id: MealSlotId;
  emoji: string;
  label: Tri;
  hint: Tri;
  /** FoodCategorySlug values that suit this part of the day */
  categories: string[];
}

export const MEAL_SLOTS: MealSlot[] = [
  {
    id: 'breakfast',
    emoji: '🍜',
    label: { km: 'អាហារពេលព្រឹក', en: 'Breakfast', zh: '早餐' },
    hint: {
      km: 'គុយទាវ នំបញ្ចុក បាយសាច់ជ្រូក — ចាប់ផ្តើមព្រឹកតាមបែបខ្មែរ',
      en: 'Noodle soups and rice plates — start the day the Khmer way',
      zh: '粉面与米饭，地道高棉式早晨',
    },
    categories: ['noodles', 'rice', 'soup'],
  },
  {
    id: 'lunch',
    emoji: '🍚',
    label: { km: 'អាហារថ្ងៃត្រង់', en: 'Lunch', zh: '午餐' },
    hint: {
      km: 'បាយជាមួយម្ហូបឆា សម្ល និងសាឡាដ',
      en: 'Rice with stir-fries, soups and fresh salads',
      zh: '米饭配炒菜、汤品与凉拌',
    },
    categories: ['rice', 'stirfry', 'soup', 'salad'],
  },
  {
    id: 'snack',
    emoji: '🍮',
    label: { km: 'បង្អែម & អាហារសម្រន់', en: 'Snacks & Sweets', zh: '甜点与小吃' },
    hint: {
      km: 'នំ បង្អែម និងភេសជ្ជៈត្រជាក់ៗសម្រាប់រសៀល',
      en: 'Cakes, desserts and cool treats for the afternoon',
      zh: '下午茶糕点与清凉甜品',
    },
    categories: ['dessert', 'cake'],
  },
  {
    id: 'dinner',
    emoji: '🍖',
    label: { km: 'អាហារពេលល្ងាច', en: 'Dinner', zh: '晚餐' },
    hint: {
      km: 'សាច់អាំង សម្លក្តៅៗ និងម្ហូបពិសេសសម្រាប់ជួបជុំគ្នា',
      en: 'Grills, hot soups and signature dishes to share',
      zh: '烧烤、热汤与适合分享的招牌菜',
    },
    categories: ['grilled', 'soup', 'stirfry', 'specialty'],
  },
];

export const getMealSlotForHour = (hour: number): MealSlotId => {
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'snack';
  return 'dinner';
};

// ---------------------------------------------------------------------------
// Seasons (Cambodia)
// ---------------------------------------------------------------------------
export interface SeasonInfo {
  id: 'cool' | 'hot' | 'rainy';
  emoji: string;
  months: number[]; // 1-12
  name: Tri;
  range: Tri;
  tip: Tri;
}

export const SEASONS: SeasonInfo[] = [
  {
    id: 'cool',
    emoji: '🌤️',
    months: [11, 12, 1, 2],
    name: { km: 'រដូវត្រជាក់ និងស្ងួត', en: 'Cool & Dry Season', zh: '凉爽旱季' },
    range: { km: 'វិច្ឆិកា – កុម្ភៈ', en: 'Nov – Feb', zh: '11月 – 2月' },
    tip: {
      km: 'ពេលវេលាល្អបំផុតសម្រាប់ទស្សនាប្រាសាទ ឆ្នេរ និងដើរលេងក្រៅ។',
      en: 'Best time for temples, beaches and outdoor trips — pleasant weather and clear skies.',
      zh: '参观古迹、海滩和户外出行的最佳季节，天气宜人、天空晴朗。',
    },
  },
  {
    id: 'hot',
    emoji: '☀️',
    months: [3, 4, 5],
    name: { km: 'រដូវក្តៅ', en: 'Hot Season', zh: '炎热季' },
    range: { km: 'មីនា – ឧសភា', en: 'Mar – May', zh: '3月 – 5月' },
    tip: {
      km: 'ក្តៅខ្លាំង៖ ទស្សនាពេលព្រឹកព្រលឹម ផឹកទឹកឱ្យបានច្រើន និងសប្បាយជាមួយផ្លែឈើតាមរដូវ។',
      en: 'Very hot: sightsee early in the morning, drink plenty of water and enjoy the fruit season.',
      zh: '天气炎热：清晨出行、多喝水，并尽情享用当季水果。',
    },
  },
  {
    id: 'rainy',
    emoji: '🌦️',
    months: [6, 7, 8, 9, 10],
    name: { km: 'រដូវវស្សា', en: 'Rainy Season', zh: '雨季' },
    range: { km: 'មិថុនា – តុលា', en: 'Jun – Oct', zh: '6月 – 10月' },
    tip: {
      km: 'ទេសភាពបៃតងខៀវស្រងាត់ ទឹកធ្លាក់ស្រស់ស្អាត មនុស្សតិច — ត្រៀមឆ័ត្រសម្រាប់ភ្លៀងរសៀល។',
      en: 'Lush green landscapes, full waterfalls and fewer crowds — pack an umbrella for afternoon showers.',
      zh: '风景翠绿、瀑布丰沛、游客较少，请备好雨伞应对午后阵雨。',
    },
  },
];

export const getSeasonForMonth = (month: number): SeasonInfo =>
  SEASONS.find((s) => s.months.includes(month)) || SEASONS[0];

// ---------------------------------------------------------------------------
// Seasonal produce (approximate harvest windows)
// ---------------------------------------------------------------------------
export interface SeasonalItem {
  emoji: string;
  months: number[]; // 1-12
  name: Tri;
  note: Tri;
}

export const SEASONAL_ITEMS: SeasonalItem[] = [
  {
    emoji: '🥭',
    months: [3, 4, 5],
    name: { km: 'ស្វាយ', en: 'Mango', zh: '芒果' },
    note: { km: 'ស្វាយទុំផ្អែម ញ៉ាំជាមួយអំបិលម្ទេស ឬបាយដំណើប', en: 'Sweet ripe mango — try it with sticky rice or chili salt', zh: '香甜熟芒果，可配糯米饭或辣椒盐' },
  },
  {
    emoji: '🍈',
    months: [4, 5, 6],
    name: { km: 'ទុរេន', en: 'Durian', zh: '榴莲' },
    note: { km: 'ទុរេនកំពត និងកែប ល្បីឈ្មោះ', en: 'Kampot and Kep durians are well known', zh: '贡布与白马的榴莲久负盛名' },
  },
  {
    emoji: '🍇',
    months: [5, 6, 7, 8],
    name: { km: 'មង្ឃុត & ផ្លែឈើរដូវភ្លៀង', en: 'Mangosteen & Rambutan', zh: '山竹与红毛丹' },
    note: { km: 'ផ្លែឈើរដូវភ្លៀងដ៏ត្រជាក់ស្រស់', en: 'Refreshing fruits of the early rainy season', zh: '雨季初期清爽多汁的水果' },
  },
  {
    emoji: '🌶️',
    months: [1, 2, 3, 4],
    name: { km: 'ម្រេចខ្ចីកំពត', en: 'Kampot Fresh Pepper', zh: '贡布鲜胡椒' },
    note: { km: 'រដូវប្រមូលផល — ល្អសម្រាប់ក្តាមឆាម្រេចខ្ចី', en: 'Harvest time — perfect for pepper crab', zh: '收获季节，最适合品尝胡椒蟹' },
  },
  {
    emoji: '🌴',
    months: [11, 12, 1, 2, 3, 4],
    name: { km: 'ទឹកត្នោតស្រស់ & ស្ករត្នោត', en: 'Fresh Palm Sap & Palm Sugar', zh: '鲜棕榈汁与棕榈糖' },
    note: { km: 'ទឹកត្នោតផ្អែមស្រស់ពីដើមត្នោត', en: 'Sweet sap collected fresh from sugar palms', zh: '直接从糖棕树采集的香甜汁液' },
  },
  {
    emoji: '🐟',
    months: [12, 1, 2],
    name: { km: 'ត្រីទន្លេសាប & ប្រហុក', en: 'Tonle Sap Fish & Prahok', zh: '洞里萨湖鱼与鱼酱' },
    note: { km: 'រដូវចាប់ត្រី និងធ្វើប្រហុក', en: 'Peak fishing and prahok-making season', zh: '捕鱼与制作鱼酱的旺季' },
  },
  {
    emoji: '🪷',
    months: [6, 7, 8, 9, 10, 11],
    name: { km: 'បន្លែទឹក & ត្រីទន្លេ', en: 'Water Greens & River Fish', zh: '水生蔬菜与河鲜' },
    note: { km: 'ត្រកួន ទងឈូក និងត្រីទន្លេក្នុងរដូវទឹក', en: 'Water spinach, lotus stems and river fish in the wet season', zh: '雨季的空心菜、莲藕茎与河鱼' },
  },
];

// ---------------------------------------------------------------------------
// Cambodian Official Public Holidays & Major Festivals (with Automatic Yearly Updates)
// ---------------------------------------------------------------------------
export interface Festival {
  id: string;
  emoji: string;
  month: number; // 1-12
  fixedDay?: number;
  fixedEndDay?: number;
  durationDays: number;
  isPublicHoliday: boolean;
  name: Tri;
  when: Tri;
  durationLabel: Tri;
  pricingLabel: Tri;
  about: Tri;
  foods: Tri;
  tip: Tri;
}

export interface DynamicCambodiaHoliday extends Festival {
  activeYear: number;
  startDateIso: string;
  endDateIso: string;
  daysUntil: number;
  isOngoingToday: boolean;
  formattedDateRange: Tri;
  countdownBadge: Tri;
}

// Lunar holiday start dates (YYYY-MM-DD) for 2025–2032 (with automatic fallback for future years)
const LUNAR_HOLIDAY_DATES_BY_YEAR: Record<
  string,
  Record<number, { month: number; startDay: number; endDay: number; dakBenStart?: string }>
> = {
  'meak-bochea': {
    2025: { month: 2, startDay: 12, endDay: 12 },
    2026: { month: 3, startDay: 3, endDay: 3 },
    2027: { month: 2, startDay: 20, endDay: 20 },
    2028: { month: 2, startDay: 9, endDay: 9 },
    2029: { month: 2, startDay: 27, endDay: 27 },
    2030: { month: 2, startDay: 17, endDay: 17 },
  },
  'visak-bochea': {
    2025: { month: 5, startDay: 11, endDay: 11 },
    2026: { month: 5, startDay: 31, endDay: 31 },
    2027: { month: 5, startDay: 20, endDay: 20 },
    2028: { month: 5, startDay: 8, endDay: 8 },
    2029: { month: 5, startDay: 27, endDay: 27 },
    2030: { month: 5, startDay: 16, endDay: 16 },
  },
  'royal-ploughing': {
    2025: { month: 5, startDay: 15, endDay: 15 },
    2026: { month: 5, startDay: 4, endDay: 4 },
    2027: { month: 5, startDay: 24, endDay: 24 },
    2028: { month: 5, startDay: 12, endDay: 12 },
    2029: { month: 5, startDay: 31, endDay: 31 },
    2030: { month: 5, startDay: 20, endDay: 20 },
  },
  'pchum-ben': {
    2025: { month: 9, startDay: 21, endDay: 23, dakBenStart: '09-08' },
    2026: { month: 10, startDay: 9, endDay: 11, dakBenStart: '09-26' },
    2027: { month: 9, startDay: 29, endDay: 31, dakBenStart: '09-16' },
    2028: { month: 9, startDay: 17, endDay: 19, dakBenStart: '09-04' },
    2029: { month: 10, startDay: 6, endDay: 8, dakBenStart: '09-23' },
    2030: { month: 9, startDay: 26, endDay: 28, dakBenStart: '09-13' },
  },
  'water-festival': {
    2025: { month: 11, startDay: 4, endDay: 6 },
    2026: { month: 11, startDay: 23, endDay: 25 },
    2027: { month: 11, startDay: 13, endDay: 15 },
    2028: { month: 11, startDay: 1, endDay: 3 },
    2029: { month: 11, startDay: 20, endDay: 22 },
    2030: { month: 11, startDay: 9, endDay: 11 },
  },
};

export const FESTIVALS: Festival[] = [
  {
    id: 'intl-new-year',
    emoji: '🎆',
    month: 1,
    fixedDay: 1,
    fixedEndDay: 1,
    durationDays: 1,
    isPublicHoliday: true,
    name: { km: 'ទិវាចូលឆ្នាំសកល', en: 'International New Year’s Day', zh: '国际元旦' },
    when: { km: 'ថ្ងៃទី ១ ខែមករា (រៀងរាល់ឆ្នាំ)', en: '1 January (Every Year)', zh: '每年1月1日' },
    durationLabel: { km: 'ឈប់សម្រាក ១ ថ្ងៃ', en: '1-Day Public Holiday', zh: '法定休假 1 天' },
    pricingLabel: { km: 'ឥតគិតថ្លៃ ($0 • បុណ្យជាតិផ្លូវការ)', en: 'Free ($0 • Official Public Holiday)', zh: '免费 ($0 • 官方公共假日)' },
    about: {
      km: 'ថ្ងៃឈប់សម្រាកផ្លូវការទូទាំងប្រទេស អបអរសាទរការចូលឆ្នាំសកលថ្មី ជាមួយការបាញ់កាំជ្រួច និងការជួបជុំគ្រួសារ។',
      en: 'Official nationwide public holiday celebrating the start of the Gregorian calendar year with fireworks and family dining.',
      zh: '全国法定假日，以烟花秀与家庭聚餐庆祝公历新年。',
    },
    foods: { km: 'ស៊ុបឆ្នាំងភ្លើង សាច់អាំងគ្រឿងសមុទ្រ និងម្ហូបជួបជុំគ្រួសារ', en: 'Hotpot, grilled seafood and festive family dishes', zh: '火锅、海鲜烧烤与团圆美食' },
    tip: { km: 'ភោជនីយដ្ឋានមាត់ទន្លេ និងកន្លែងកម្សាន្តមានមនុស្សច្រើននៅយប់ឆ្លងឆ្នាំ', en: 'Riverside restaurants and dining spots are busy on New Year’s Eve.', zh: '跨年夜河畔餐厅人流较多，建议提前预订。' },
  },
  {
    id: 'victory-day',
    emoji: '🕊️',
    month: 1,
    fixedDay: 7,
    fixedEndDay: 7,
    durationDays: 1,
    isPublicHoliday: true,
    name: { km: 'ទិវាជ័យជម្នះលើរបបប្រល័យពូជសាសន៍', en: 'Victory over Genocide Day', zh: '胜利日（推翻种族灭绝政权纪念日）' },
    when: { km: 'ថ្ងៃទី ៧ ខែមករា (រៀងរាល់ឆ្នាំ)', en: '7 January (Every Year)', zh: '每年1月7日' },
    durationLabel: { km: 'ឈប់សម្រាក ១ ថ្ងៃ', en: '1-Day Public Holiday', zh: '法定休假 1 天' },
    pricingLabel: { km: 'ឥតគិតថ្លៃ ($0 • បុណ្យជាតិផ្លូវការ)', en: 'Free ($0 • Official Public Holiday)', zh: '免费 ($0 • 官方公共假日)' },
    about: {
      km: 'ថ្ងៃឈប់សម្រាកជាតិរំលឹកដល់ការបញ្ចប់របបខ្មែរក្រហមនៅថ្ងៃទី ៧ មករា ១៩៧៩។',
      en: 'National public holiday commemorating the end of the Khmer Rouge regime on 7 January 1979.',
      zh: '纪念1979年1月7日红色高棉政权结束的全国公共假日。',
    },
    foods: { km: 'ម្ហូបខ្មែរប្រចាំគ្រួសារ និងនំបញ្ចុក', en: 'Traditional home-style Khmer dishes and Num Banh Chok', zh: '传统家常高棉菜与高棉米粉' },
    tip: { km: 'ស្ថាប័នរដ្ឋ និងធនាគារបិទទ្វារ ប៉ុន្តែភោជនីយដ្ឋាន និងរមណីយដ្ឋានបើកធម្មតា', en: 'Government offices and banks close, while restaurants and tourist sites remain open.', zh: '政府机构与银行休息，餐厅及景点正常营业。' },
  },
  {
    id: 'meak-bochea',
    emoji: '🕯️',
    month: 2,
    durationDays: 1,
    isPublicHoliday: true,
    name: { km: 'ពិធីបុណ្យមាឃបូជា', en: 'Meak Bochea Day', zh: '万佛节（麦加宝蕉节）' },
    when: { km: 'ថ្ងៃ ១៥ កើត ខែមាឃ (ពេញបូណ៌មី)', en: 'Full Moon of Meak (Feb / early Mar)', zh: '高棉历三月十五满月日（2月或3月初）' },
    durationLabel: { km: 'ពិធីបុណ្យព្រះពុទ្ធសាសនា (១ ថ្ងៃ)', en: '1-Day Buddhist Observance', zh: '佛教传统节日（1天）' },
    pricingLabel: { km: 'ឥតគិតថ្លៃ ($0 • ចូលវត្តដោយសេរី)', en: 'Free ($0 • Open Temple Entry)', zh: '免费 ($0 • 寺庙免费开放)' },
    about: {
      km: 'ថ្ងៃរំលឹកដល់មហាសន្និបាតព្រះសង្ឃ ១,២៥០ អង្គ និងការសម្តែងឱវាទបាតិមោក្ខរបស់ព្រះពុទ្ធ។ ប្រជាជនទៅវត្តហែទៀនធូបជុំវិញព្រះវិហារ។',
      en: 'Buddhists gather at pagodas for evening candle-lit processions (Wien Tien) honouring the Buddha’s teachings.',
      zh: '佛教徒傍晚前往寺庙参加烛光巡礼，纪念佛陀弘法。',
    },
    foods: { km: 'ម្ហូបបួស ចង្ហាន់ថ្វាយព្រះសង្ឃ និងបង្អែមខ្មែរ', en: 'Vegetarian meals, temple offerings and Khmer desserts', zh: '素食、供僧餐食与高棉甜品' },
    tip: { km: 'ស្លៀកពាក់សមរម្យ (អាវស ឬសម្លៀកបំពាក់สุភាព) ពេលទៅវត្តនាពេលល្ងាច', en: 'Wear modest clothing (often white shirts) when visiting pagodas in the evening.', zh: '傍晚前往寺庙请着装得体（当地人常穿白衣）。' },
  },
  {
    id: 'womens-day',
    emoji: '🌸',
    month: 3,
    fixedDay: 8,
    fixedEndDay: 8,
    durationDays: 1,
    isPublicHoliday: true,
    name: { km: 'ទិវានារីអន្តរជាតិ', en: 'International Women’s Day', zh: '国际妇女节' },
    when: { km: 'ថ្ងៃទី ៨ ខែមីនា (រៀងរាល់ឆ្នាំ)', en: '8 March (Every Year)', zh: '每年3月8日' },
    durationLabel: { km: 'ឈប់សម្រាក ១ ថ្ងៃ', en: '1-Day Public Holiday', zh: '法定休假 1 天' },
    pricingLabel: { km: 'ឥតគិតថ្លៃ ($0 • បុណ្យជាតិផ្លូវការ)', en: 'Free ($0 • Official Public Holiday)', zh: '免费 ($0 • 官方公共假日)' },
    about: {
      km: 'ថ្ងៃឈប់សម្រាកផ្លូវការនៅកម្ពុជា ដើម្បីអបអរសាទរសិទ្ធិ និងសមិទ្ធផលរបស់ស្ត្រី។',
      en: 'Official public holiday in Cambodia celebrating women’s rights, leadership and family appreciation.',
      zh: '柬埔寨官方公共假日，表彰女性的贡献与权益。',
    },
    foods: { km: 'អាហារថ្ងៃត្រង់ជួបជុំគ្រួសារ នំខេក និងភេសជ្ជៈពិសេស', en: 'Special family lunches, cakes and café treats', zh: '家庭聚餐、蛋糕与特色饮品' },
    tip: { km: 'ហាងអាហារ និងហាងកាហ្វេជាច្រើនមានកម្មវិធីបញ្ចុះតម្លៃពិសេសសម្រាប់ស្ត្រី', en: 'Many restaurants and cafés offer special promotions on 8 March.', zh: '许多餐厅和咖啡馆在当天推出女性专属优惠。' },
  },
  {
    id: 'khmer-new-year',
    emoji: '🎊',
    month: 4,
    fixedDay: 14,
    fixedEndDay: 16,
    durationDays: 3,
    isPublicHoliday: true,
    name: { km: 'ពិធីបុណ្យចូលឆ្នាំថ្មីប្រពៃណីជាតិខ្មែរ', en: 'Khmer New Year (Choul Chnam Thmey)', zh: '高棉传统新年（宋干节）' },
    when: { km: 'ថ្ងៃទី ១៤–១៦ ខែមេសា (ឈប់សម្រាក ៣ ថ្ងៃ)', en: '14–16 April (3-Day Official Holiday)', zh: '每年4月14–16日（法定休假3天）' },
    durationLabel: { km: 'ឈប់សម្រាក ៣ ថ្ងៃ', en: '3-Day Public Holiday', zh: '法定休假 3 天' },
    pricingLabel: { km: 'ឥតគិតថ្លៃ ($0 • បុណ្យជាតិធំបំផុត)', en: 'Free ($0 • National Festival)', zh: '免费 ($0 • 全国盛大庆典)' },
    about: {
      km: 'បុណ្យប្រពៃណីជាតិធំបំផុតរយៈពេល ៣ ថ្ងៃ (មហាសង្ក្រាន្ត វនបត និងឡើងស័ក) — ប្រជាជនទៅវត្តពូនភ្នំខ្សាច់ សรงទឹកព្រះ លេងល្បែងប្រជាប្រិយ និងសង្ក្រាន្តតាមខេត្ត។',
      en: 'Cambodia’s biggest 3-day national celebration featuring Angkor Sankranta, temple visits, traditional games and family reunions.',
      zh: '柬埔寨最盛大的三天传统节日，包含吴哥宋干节、寺庙祈福、传统民俗游戏与阖家团圆。',
    },
    foods: { km: 'នំអន្សមជ្រូក នំអន្សមចេក នំគម សម្លការី និងផ្លែឈើតាមរដូវ', en: 'Num Ansom (sticky rice cake), Num Kom, Khmer red curry and tropical fruit', zh: '高棉竹筒棕（Num Ansom）、椰丝糯米糕、红咖喱与时令水果' },
    tip: {
      km: 'រាជធានីភ្នំពេញស្ងាត់ព្រោះពលរដ្ឋទៅលេងស្រុកកំណើត និងសៀមរាប — គួរកក់សណ្ឋាគារ និងសំបុត្រឡានមុនឱ្យបានលឿន។',
      en: 'Phnom Penh gets quiet while Siem Reap and provinces are packed — book hotels and transport early.',
      zh: '金边较为安静，暹粒及各省非常热闹，请提前预订酒店与车票。',
    },
  },
  {
    id: 'labor-day',
    emoji: '🛠️',
    month: 5,
    fixedDay: 1,
    fixedEndDay: 1,
    durationDays: 1,
    isPublicHoliday: true,
    name: { km: 'ទិវាពលកម្មអន្តរជាតិ', en: 'International Labor Day', zh: '国际劳动节' },
    when: { km: 'ថ្ងៃទី ១ ខែឧសភា (រៀងរាល់ឆ្នាំ)', en: '1 May (Every Year)', zh: '每年5月1日' },
    durationLabel: { km: 'ឈប់សម្រាក ១ ថ្ងៃ', en: '1-Day Public Holiday', zh: '法定休假 1 天' },
    pricingLabel: { km: 'ឥតគិតថ្លៃ ($0 • បុណ្យជាតិផ្លូវការ)', en: 'Free ($0 • Official Public Holiday)', zh: '免费 ($0 • 官方公共假日)' },
    about: {
      km: 'ថ្ងៃឈប់សម្រាកផ្លូវការទូទាំងប្រទេសដើម្បីលើកកម្ពស់សិទ្ធិ និងសុខុមាលភាពកម្មករនិយោជិត។',
      en: 'National public holiday honouring workers and employees across Cambodia.',
      zh: '全国法定假日，致敬全国劳动者。',
    },
    foods: { km: 'ម្ហូបអាំង ស៊ុប និងអាហារជួបជុំមិត្តភក្តិ', en: 'BBQ, hotpot and casual group dining', zh: '烧烤、火锅与朋友聚餐' },
    tip: { km: 'ធនាគារ និងស្ថាប័នរដ្ឋបិទទ្វារ ១ ថ្ងៃ', en: 'Banks and government offices close for the day.', zh: '银行与政府机构当天休息。' },
  },
  {
    id: 'visak-bochea',
    emoji: '🪷',
    month: 5,
    durationDays: 1,
    isPublicHoliday: true,
    name: { km: 'ពិធីបុណ្យវិសាខបូជា', en: 'Visak Bochea Day', zh: '卫塞节（佛诞日）' },
    when: { km: 'ថ្ងៃ ១៥ កើត ខែពិសាខ (ពេញបូណ៌មី ខែឧសភា)', en: 'Full Moon of Visak (May)', zh: '高棉历六月十五满月日（5月）' },
    durationLabel: { km: 'ឈប់សម្រាក ១ ថ្ងៃ', en: '1-Day Public Holiday', zh: '法定休假 1 天' },
    pricingLabel: { km: 'ឥតគិតថ្លៃ ($0 • បុណ្យជាតិផ្លូវការ)', en: 'Free ($0 • Official Public Holiday)', zh: '免费 ($0 • 官方公共假日)' },
    about: {
      km: 'ថ្ងៃឈប់សម្រាកជាតិដ៏សំខាន់បំផុតក្នុងព្រះពុទ្ធសាសនា រំលឹកដល់ថ្ងៃប្រសូត ត្រាស់ដឹង និងបរិនិព្វានរបស់ព្រះសម្មាសម្ពុទ្ធ។',
      en: 'Sacred Buddhist public holiday commemorating the birth, enlightenment and passing (Parinirvana) of the Buddha.',
      zh: '纪念佛陀诞生、成道与涅槃的法定佛教假日。',
    },
    foods: { km: 'ម្ហូបបួស ចង្ហាន់វត្ត និងបង្អែមផ្លែឈើ', en: 'Vegetarian dishes, temple offerings and fruit desserts', zh: '素食、寺庙供品与水果甜点' },
    tip: { km: 'វត្តអារាមនានាមានមនុស្សច្រើន សូមដោះមួក និងស្បែកជើងពេលចូលព្រះវិហារ', en: 'Pagodas are busy — remove hats and shoes before entering temple halls.', zh: '寺庙香客众多，进入殿堂请脱帽脱鞋。' },
  },
  {
    id: 'royal-ploughing',
    emoji: '🐂',
    month: 5,
    durationDays: 1,
    isPublicHoliday: true,
    name: { km: 'ព្រះរាជពិធីច្រត់ព្រះនង្គ័ល', en: 'Royal Ploughing Ceremony', zh: '皇家春耕节' },
    when: { km: 'ថ្ងៃ ៤ រោច ខែពិសាខ (ខែឧសភា)', en: '4th Waning Moon of Visak (May)', zh: '高棉历六月下弦初四（5月）' },
    durationLabel: { km: 'ឈប់សម្រាក ១ ថ្ងៃ', en: '1-Day Public Holiday', zh: '法定休假 1 天' },
    pricingLabel: { km: 'ឥតគិតថ្លៃ ($0 • បុណ្យជាតិផ្លូវការ)', en: 'Free ($0 • Official Public Holiday)', zh: '免费 ($0 • 官方公共假日)' },
    about: {
      km: 'ព្រះរាជពិធីបុរាណបើករដូវធ្វើស្រែចម្ការ ដោយគោឧសភរាជជ្រើសរើសចំណីអាហារ ៧ មុខ ដើម្បីទស្សន៍ទាយទឹកភ្លៀង និងទិន្នផលកសិកម្ម។',
      en: 'Ancient royal ceremony marking the start of the rice-growing season, where sacred royal oxen predict the year’s harvest.',
      zh: '标志着农耕季开启的古老皇家仪式，由神牛择食预测当年降雨与丰收。',
    },
    foods: { km: 'បាយអង្ករថ្មី ពោត សណ្ដែក ល្ង និងម្ហូបខ្មែរតាមរដូវ', en: 'Fresh harvest rice, corn, beans, sesame and traditional dishes', zh: '新米饭、玉米、豆类、芝麻与当季高棉菜' },
    tip: { km: 'ប្រារព្ធធ្វើយ៉ាងអធិកអធមក្រោមព្រះរាជាធិបតីភាពព្រះមហាក្សត្រ', en: 'Presided over by His Majesty the King at the Royal Field.', zh: '由国王陛下亲临主持，仪式庄严隆重。' },
  },
  {
    id: 'kings-birthday',
    emoji: '👑',
    month: 5,
    fixedDay: 14,
    fixedEndDay: 14,
    durationDays: 1,
    isPublicHoliday: true,
    name: { km: 'ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម ព្រះករុណាព្រះបាទសម្តេចព្រះបរមនាថ នរោត្តម សីហមុនី', en: 'King Norodom Sihamoni’s Birthday', zh: '诺罗敦·西哈莫尼国王华诞' },
    when: { km: 'ថ្ងៃទី ១៤ ខែឧសភា (រៀងរាល់ឆ្នាំ)', en: '14 May (Every Year)', zh: '每年5月14日' },
    durationLabel: { km: 'ឈប់សម្រាក ១ ថ្ងៃ', en: '1-Day Public Holiday', zh: '法定休假 1 天' },
    pricingLabel: { km: 'ឥតគិតថ្លៃ ($0 • បុណ្យជាតិផ្លូវការ)', en: 'Free ($0 • Official Public Holiday)', zh: '免费 ($0 • 官方公共假日)' },
    about: {
      km: 'ថ្ងៃឈប់សម្រាកជាតិអបអរសាទរព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្មព្រះមហាក្សត្រនៃព្រះរាជាណាចក្រកម្ពុជា ជាមួយការតុបតែងភ្លើងពណ៌ និងកាំជ្រួចនៅមុខព្រះបរមរាជវាំង។',
      en: 'Official national holiday celebrating the birthday of His Majesty King Norodom Sihamoni with royal illuminations and fireworks.',
      zh: '庆祝诺罗敦·西哈莫尼国王诞辰的法定假日，皇宫前有彩灯与烟花表演。',
    },
    foods: { km: 'ម្ហូបខ្មែរតាមភោជនីយដ្ឋានមាត់ទន្លេ និងអាហារសម្រន់ពេលល្ងាច', en: 'Riverside dining and evening street food around the Royal Palace', zh: '皇宫河畔餐厅美食与夜市小吃' },
    tip: { km: 'ពេលយប់នៅមាត់ទន្លេមុខព្រះបរមរាជវាំងមានការបាញ់កាំជ្រួចយ៉ាងស្រស់ស្អាត', en: 'Visit the Phnom Penh riverfront in the evening to watch the fireworks.', zh: '傍晚可前往金边皇宫河畔观赏璀璨烟花。' },
  },
  {
    id: 'queen-mothers-birthday',
    emoji: '💐',
    month: 6,
    fixedDay: 18,
    fixedEndDay: 18,
    durationDays: 1,
    isPublicHoliday: true,
    name: { km: 'ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម សម្តេចព្រះមហាក្សត្រី នរោត្តម មុនីនាថ សីហនុ', en: 'Queen Mother Norodom Monineath Sihanouk’s Birthday', zh: '莫尼列太后华诞' },
    when: { km: 'ថ្ងៃទី ១៨ ខែមិថុនា (រៀងរាល់ឆ្នាំ)', en: '18 June (Every Year)', zh: '每年6月18日' },
    durationLabel: { km: 'ឈប់សម្រាក ១ ថ្ងៃ', en: '1-Day Public Holiday', zh: '法定休假 1 天' },
    pricingLabel: { km: 'ឥតគិតថ្លៃ ($0 • បុណ្យជាតិផ្លូវការ)', en: 'Free ($0 • Official Public Holiday)', zh: '免费 ($0 • 官方公共假日)' },
    about: {
      km: 'ថ្ងៃឈប់សម្រាកជាតិអបអរសាទរព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម សម្តេចព្រះមហាក្សត្រី ព្រះវររាជមាតាជាតិខ្មែរ។',
      en: 'Official public holiday honouring the birthday of Her Majesty Queen Mother Norodom Monineath Sihanouk.',
      zh: '庆祝柬埔寨太后诺罗敦·莫尼列·西哈努克华诞的全国公共假日。',
    },
    foods: { km: 'ម្ហូបខ្មែរប្រពៃណី និងបង្អែមខ្មែរ', en: 'Traditional Khmer cuisine and royal-style desserts', zh: '传统高棉美食与宫廷风味甜点' },
    tip: { km: 'ស្ថាប័នរដ្ឋ និងធនាគារឈប់សម្រាក ១ ថ្ងៃ', en: 'Government offices and banks close for 1 day.', zh: '政府部门及银行放假1天。' },
  },
  {
    id: 'constitution-day',
    emoji: '📜',
    month: 9,
    fixedDay: 24,
    fixedEndDay: 24,
    durationDays: 1,
    isPublicHoliday: true,
    name: { km: 'ទិវាប្រកាសរដ្ឋធម្មនុញ្ញ', en: 'Constitutional Day', zh: '立宪节（宪法日）' },
    when: { km: 'ថ្ងៃទី ២៤ ខែកញ្ញា (រៀងរាល់ឆ្នាំ)', en: '24 September (Every Year)', zh: '每年9月24日' },
    durationLabel: { km: 'ឈប់សម្រាក ១ ថ្ងៃ', en: '1-Day Public Holiday', zh: '法定休假 1 天' },
    pricingLabel: { km: 'ឥតគិតថ្លៃ ($0 • បុណ្យជាតិផ្លូវការ)', en: 'Free ($0 • Official Public Holiday)', zh: '免费 ($0 • 官方公共假日)' },
    about: {
      km: 'ថ្ងៃឈប់សម្រាកជាតិរំលឹកដល់ការប្រកាសឱ្យប្រើរដ្ឋធម្មនុញ្ញនៃព្រះរាជាណាចក្រកម្ពុជានៅថ្ងៃទី ២៤ កញ្ញា ១៩៩៣។',
      en: 'National public holiday marking the promulgation of the 1993 Constitution of the Kingdom of Cambodia.',
      zh: '纪念1993年9月24日颁布《柬埔寨王国宪法》的法定假日。',
    },
    foods: { km: 'ម្ហូបខ្មែរប្រចាំតំបន់ និងអាហារគ្រួសារ', en: 'Regional Khmer dishes and family meals', zh: '地方风味高棉菜与家庭聚餐' },
    tip: { km: 'ជាថ្ងៃឈប់សម្រាកផ្លូវការដែលជួនកាលភ្ជាប់ជាមួយរដូវបុណ្យភ្ជុំបិណ្ឌ', en: 'Often falls right around the Pchum Ben festival season.', zh: '通常紧邻亡人节（祭祖节）假期。' },
  },
  {
    id: 'pchum-ben',
    emoji: '🍚',
    month: 10,
    durationDays: 3,
    isPublicHoliday: true,
    name: { km: 'ពិធីបុណ្យភ្ជុំបិណ្ឌ (កាន់បិណ្ឌ ១៥ ថ្ងៃ)', en: 'Pchum Ben Festival (Ancestors’ Day)', zh: '亡人节 / 祭祖节（Pchum Ben）' },
    when: { km: '១ រោច ដល់ ១៥ រោច ខែភទ្របទ (ឈប់សម្រាកផ្លូវការ ៣ ថ្ងៃចុងក្រោយ)', en: '15-Day Dak Ben + 3-Day Official Public Holiday (Sep / Oct)', zh: '共15天守夏供僧，最后3天为全国法定假日（9月或10月）' },
    durationLabel: { km: 'ឈប់សម្រាកផ្លូវការ ៣ ថ្ងៃ (ពិធីសាសនា ១៥ ថ្ងៃ)', en: '3-Day Public Holiday (15-Day Festival)', zh: '法定休假 3 天（宗教仪式 15 天）' },
    pricingLabel: { km: 'ឥតគិតថ្លៃ ($0 • បុណ្យប្រពៃណីជាតិធំ)', en: 'Free ($0 • National Religious Holiday)', zh: '免费 ($0 • 全国重大传统节日)' },
    about: {
      km: 'ពិធីបុណ្យប្រពៃណីព្រះពុទ្ធសាសនាដ៏ធំបំផុតមួយរបស់ខ្មែរ រយៈពេល ១៥ ថ្ងៃ (បិណ្ឌ ១ ដល់ បិណ្ឌ ១៤ និងថ្ងៃភ្ជុំធំ) ដើម្បីឧទ្ទិសកុសលជូនបុព្វការីជន និងជួបជុំគ្រួសារ។',
      en: 'One of Cambodia’s most sacred traditions: 14 days of Dak Ben temple offerings culminating in a 3-day national holiday honouring ancestors.',
      zh: '柬埔寨最重要的佛教传统节日之一，历时15天前往寺庙抛饭团（Bay Ben）祭祀祖先，最后3天全国放假团聚。',
    },
    foods: { km: 'បាយបិណ្ឌ នំអន្សមជ្រូក នំអន្សមចេក នំគម នំបត់ និងសម្លខ្មែរថ្វាយព្រះសង្ឃ', en: 'Bay Ben (sticky rice balls), Num Ansom, Num Kom, Num Bot and traditional curries', zh: '祭祖饭团（Bay Ben）、高棉长粽（Num Ansom）、金字塔糯米糕（Num Kom）' },
    tip: { km: 'ហាង និងការិយាល័យជាច្រើនបិទទ្វារ ៣ ថ្ងៃ ហើយផ្លូវជាតិមានចរាចរណ៍មមាញឹកខ្លាំង — គួរកក់ការធ្វើដំណើរមុន។', en: 'Many shops close for 3 days as families travel to their home provinces — book transport early.', zh: '许多商铺休业3天，民众返乡探亲，公路交通繁忙，请提前安排行程。' },
  },
  {
    id: 'king-father-commemoration',
    emoji: '🕯️',
    month: 10,
    fixedDay: 15,
    fixedEndDay: 15,
    durationDays: 1,
    isPublicHoliday: true,
    name: { km: 'ទិវាប្រារព្ធពិធីគោរពព្រះវិញ្ញាណក្ខន្ធ ព្រះករុណា ព្រះបរមរតនកោដ្ឋ', en: 'Commemoration Day of the King’s Father (Norodom Sihanouk)', zh: '西哈努克太皇逝世纪念日' },
    when: { km: 'ថ្ងៃទី ១៥ ខែតុលា (រៀងរាល់ឆ្នាំ)', en: '15 October (Every Year)', zh: '每年10月15日' },
    durationLabel: { km: 'ឈប់សម្រាក ១ ថ្ងៃ', en: '1-Day Public Holiday', zh: '法定休假 1 天' },
    pricingLabel: { km: 'ឥតគិតថ្លៃ ($0 • បុណ្យជាតិផ្លូវការ)', en: 'Free ($0 • Official Public Holiday)', zh: '免费 ($0 • 官方公共假日)' },
    about: {
      km: 'ថ្ងៃឈប់សម្រាកជាតិដើម្បីគោរពព្រះវិញ្ញាណក្ខន្ធ និងរំលឹកព្រះមហាករុណាទិគុណ ព្រះករុណាព្រះបាទសម្តេចព្រះ នរោត្តម សីហនុ ព្រះបរមរតនកោដ្ឋ។',
      en: 'National day of remembrance honouring the late King-Father Norodom Sihanouk, architect of Cambodia’s independence.',
      zh: '深切缅怀柬埔寨独立之父诺罗敦·西哈努克太皇的全国法定纪念日。',
    },
    foods: { km: 'ម្ហូបខ្មែរប្រពៃណី និងអាហារក្នុងគ្រួសារ', en: 'Traditional home-style Cambodian meals', zh: '传统高棉家常美食' },
    tip: { km: 'ពិធីដាក់កម្រងផ្កាគោរពព្រះវិញ្ញាណក្ខន្ធប្រារព្ធធ្វើនៅវិមានព្រះបរមរូប ជិតវិមានឯករាជ្យ', en: 'Official floral tributes take place at the King Father Statue Park near Independence Monument.', zh: '金边独立碑旁的西哈努克太皇铜像广场会举行官方献花悼念仪式。' },
  },
  {
    id: 'coronation-day',
    emoji: '👑',
    month: 10,
    fixedDay: 29,
    fixedEndDay: 29,
    durationDays: 1,
    isPublicHoliday: true,
    name: { km: 'ព្រះរាជពិធីបុណ្យខួបនៃការឡើងគ្រងរាជសម្បត្តិ ព្រះករុណាព្រះបាទសម្តេចព្រះបរមនាថ នរោត្តម សីហមុនី', en: 'King Norodom Sihamoni’s Coronation Day', zh: '西哈莫尼国王登基纪念日' },
    when: { km: 'ថ្ងៃទី ២៩ ខែតុលា (រៀងរាល់ឆ្នាំ)', en: '29 October (Every Year)', zh: '每年10月29日' },
    durationLabel: { km: 'ឈប់សម្រាក ១ ថ្ងៃ', en: '1-Day Public Holiday', zh: '法定休假 1 天' },
    pricingLabel: { km: 'ឥតគិតថ្លៃ ($0 • បុណ្យជាតិផ្លូវការ)', en: 'Free ($0 • Official Public Holiday)', zh: '免费 ($0 • 官方公共假日)' },
    about: {
      km: 'ថ្ងៃឈប់សម្រាកជាតិអបអរសាទរខួបនៃការឡើងគ្រងរាជសម្បត្តិរបស់ព្រះករុណាព្រះបាទសម្តេចព្រះបរមនាថ នរោត្តម សីហមុនី (២៩ តុលា ២០០៤)។',
      en: 'Official public holiday celebrating the coronation of His Majesty King Norodom Sihamoni on 29 October 2004.',
      zh: '庆祝诺罗敦·西哈莫尼国王于2004年10月29日登基的法定公共假日。',
    },
    foods: { km: 'ម្ហូបខ្មែរពិសេសតាមភោជនីយដ្ឋាន និងអាហារមាត់ទន្លេ', en: 'Special Khmer dining and riverfront delicacies', zh: '高棉特色餐厅美食与河畔小吃' },
    tip: { km: 'មានការតុបតែងភ្លើងលម្អ និងបាញ់កាំជ្រួចនៅមុខព្រះបរមរាជវាំងនាពេលរាត្រី', en: 'Evening illuminations and fireworks take place along the Royal Palace riverfront.', zh: '夜晚金边皇宫前河畔会有灯光秀与烟花庆典。' },
  },
  {
    id: 'independence-day',
    emoji: '🇰🇭',
    month: 11,
    fixedDay: 9,
    fixedEndDay: 9,
    durationDays: 1,
    isPublicHoliday: true,
    name: { km: 'ទិវាបុណ្យឯករាជ្យជាតិ (៩ វិច្ឆិកា)', en: 'Cambodia Independence Day', zh: '柬埔寨独立节（11月9日）' },
    when: { km: 'ថ្ងៃទី ៩ ខែវិច្ឆិកា (រៀងរាល់ឆ្នាំ)', en: '9 November (Every Year)', zh: '每年11月9日' },
    durationLabel: { km: 'ឈប់សម្រាក ១ ថ្ងៃ', en: '1-Day Public Holiday', zh: '法定休假 1 天' },
    pricingLabel: { km: 'ឥតគិតថ្លៃ ($0 • បុណ្យជាតិផ្លូវការ)', en: 'Free ($0 • Official Public Holiday)', zh: '免费 ($0 • 官方公共假日)' },
    about: {
      km: 'ថ្ងៃឈប់សម្រាកជាតិដ៏មហោឡារិក រំលឹកដល់ការទទួលបានឯករាជ្យពេញលេញរបស់កម្ពុជាពីបារាំងនៅថ្ងៃទី ៩ វិច្ឆិកា ១៩៥៣។',
      en: 'Major national holiday celebrating Cambodia’s independence from France on 9 November 1953, centered at the Independence Monument.',
      zh: '庆祝1953年11月9日柬埔寨脱离法国完全独立的盛大国庆节日，主仪式在金边独立碑举行。',
    },
    foods: { km: 'ម្ហូបខ្មែរគ្រប់មុខ នំបញ្ចុក អាម៉ុក និងអាហារតាមផ្លូវពេលរាត្រី', en: 'Amok, Num Banh Chok and festive street food around Phnom Penh', zh: '阿莫克鱼、高棉米粉与金边夜市美食' },
    tip: { km: 'ផ្លូវជុំវិញវិមានឯករាជ្យនឹងបិទចរាចរណ៍នៅពេលព្រឹកសម្រាប់ព្រះរាជពិធីប្រទានភ្លើងជ័យ', en: 'Roads around Independence Monument close in the morning for the Royal Victory Flame ceremony.', zh: '上午独立碑周边道路会临时交通管制，举行圣火点燃仪式。' },
  },
  {
    id: 'water-festival',
    emoji: '🚣',
    month: 11,
    durationDays: 3,
    isPublicHoliday: true,
    name: { km: 'ព្រះរាជពិធីបុណ្យអុំទូក បណ្ដែតប្រទីប និងសំពះព្រះខែ អកអំបុក', en: 'Bon Om Touk (Cambodian Water Festival)', zh: '送水节（赛龙舟、放水灯、拜月吃扁米）' },
    when: { km: 'ថ្ងៃ ១៤–១៥ កើត និង ១ រោច ខែកក្ដិក (ឈប់សម្រាក ៣ ថ្ងៃ ក្នុងខែវិច្ឆិកា)', en: 'Full Moon of Kadeuk — November (3-Day Official Holiday)', zh: '高棉历十二月满月前后（11月，法定休假3天）' },
    durationLabel: { km: 'ឈប់សម្រាក ៣ ថ្ងៃ', en: '3-Day Public Holiday', zh: '法定休假 3 天' },
    pricingLabel: { km: 'ឥតគិតថ្លៃ ($0 • ទស្សនាដោយសេរី)', en: 'Free Admission ($0 • Public Festival)', zh: '免费观赏 ($0 • 公众盛大庆典)' },
    about: {
      km: 'ព្រះរាជពិធីបុណ្យប្រពៃណីជាតិរយៈពេល ៣ ថ្ងៃ អបអរសាទរទឹកទន្លេសាបហូរត្រឡប់ចូលទន្លេមេគង្គវិញ ជាមួយការប្រណាំងទូកង បណ្ដែតប្រទីប បាញ់កាំជ្រួច និងពិធីអកអំបុកសំពះព្រះខែ។',
      en: 'Three-day national celebration of the reversal of the Tonle Sap River flow, featuring royal boat races, illuminated floats, fireworks and Ambok.',
      zh: '为期三天的盛大国家级庆典，庆祝洞里萨河水流倒灌奇观，包含龙舟赛、彩灯船巡游、烟花与拜月吃扁米。',
    },
    foods: { km: 'អំបុកចេកទុំ និងទឹកដូងខ្ចី ត្រីទន្លេអាំង មឹកអាំង និងអាហារតាមមាត់ទន្លេ', en: 'Ambok (pounded young rice with banana & coconut), grilled river fish and street food', zh: '扁米糕 Ambok（配香蕉与椰子）、烤河鱼与河畔夜市美食' },
    tip: { km: 'កក់សណ្ឋាគារមុនឱ្យបានលឿន និងប្រុងប្រយ័ត្នថែរក្សាទ្រព្យសម្បត្តិពេលដើរកម្សាន្តក្នុងហ្វូងមនុស្សច្រើន', en: 'Book hotels early and keep valuables secure in crowded riverfront areas.', zh: '请提前预订酒店，在河畔人多密集处注意看管随身财物。' },
  },
  {
    id: 'peace-day',
    emoji: '🕊️',
    month: 12,
    fixedDay: 29,
    fixedEndDay: 29,
    durationDays: 1,
    isPublicHoliday: true,
    name: { km: 'ទិវាសន្តិភាពនៅកម្ពុជា (២៩ ធ្នូ)', en: 'Peace Day in Cambodia', zh: '柬埔寨和平日（12月29日）' },
    when: { km: 'ថ្ងៃទី ២៩ ខែធ្នូ (រៀងរាល់ឆ្នាំ)', en: '29 December (Every Year)', zh: '每年12月29日' },
    durationLabel: { km: 'ឈប់សម្រាក ១ ថ្ងៃ', en: '1-Day Public Holiday', zh: '法定休假 1 天' },
    pricingLabel: { km: 'ឥតគិតថ្លៃ ($0 • បុណ្យជាតិផ្លូវការ)', en: 'Free ($0 • Official Public Holiday)', zh: '免费 ($0 • 官方公共假日)' },
    about: {
      km: 'ថ្ងៃឈប់សម្រាកផ្លូវការទូទាំងប្រទេស អបអរសាទរការសម្រេចបានសន្តិភាពពេញលេញ និងការបង្រួបបង្រួមជាតិនៅកម្ពុជា (២៩ ធ្នូ ១៩៩៨)។',
      en: 'Official national public holiday celebrating complete peace and national reconciliation in Cambodia (29 December 1998).',
      zh: '庆祝柬埔寨实现全面和平与民族和解的官方公共假日（每年12月29日）。',
    },
    foods: { km: 'ម្ហូបជួបជុំគ្រួសារ ស៊ុប និងគ្រឿងសមុទ្រអាំងចុងឆ្នាំ', en: 'Year-end family feasts, hotpot and grilled seafood', zh: '年末家庭聚餐、火锅与烤海鲜' },
    tip: { km: 'ជាថ្ងៃឈប់សម្រាកចុងឆ្នាំដ៏ល្អសម្រាប់ការធ្វើដំណើរកម្សាន្តទៅកាន់ខេត្តមាត់សមុទ្រ និងភ្នំ', en: 'Great year-end holiday for coastal and mountain trips across Cambodia.', zh: '非常适合年末前往海滨或山区度假。' },
  },
];

const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
function toKhmerNum(n: number | string): string {
  return String(n).replace(/\d/g, (d) => KHMER_DIGITS[Number(d)] || d);
}

const MONTH_NAMES_KM = [
  '',
  'មករា',
  'កុម្ភៈ',
  'មីនា',
  'មេសា',
  'ឧសភា',
  'មិថុនា',
  'កក្កដា',
  'សីហា',
  'កញ្ញា',
  'តុលា',
  'វិច្ឆិកា',
  'ធ្នូ',
];
const MONTH_NAMES_SHORT_EN = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthLabel(m: number, lang: 'km' | 'en' | 'zh'): string {
  const idx = Math.max(1, Math.min(12, Math.round(m || 1)));
  if (lang === 'km') return MONTH_NAMES_KM[idx];
  if (lang === 'zh') return `${idx}月`;
  return MONTH_NAMES_SHORT_EN[idx];
}

/**
 * Automatically compute the exact solar dates and countdown in days for all Cambodian holidays
 * for the current year, rolling over automatically to next year (`year + 1`) once a holiday has passed.
 */
export function getCambodiaHolidaysForYear(referenceDate: Date = new Date()): DynamicCambodiaHoliday[] {
  const todayStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const currentYear = todayStart.getFullYear();

  const resolveDatesForYear = (f: Festival, yr: number): { month: number; startDay: number; endDay: number } => {
    if (f.fixedDay) {
      return {
        month: f.month,
        startDay: f.fixedDay,
        endDay: f.fixedEndDay || f.fixedDay,
      };
    }
    const tableForHoliday = LUNAR_HOLIDAY_DATES_BY_YEAR[f.id];
    if (tableForHoliday && tableForHoliday[yr]) {
      return tableForHoliday[yr];
    }
    // Fallback cycle approximation for years beyond 2030 so it continues updating automatically every year
    if (tableForHoliday) {
      const knownYears = Object.keys(tableForHoliday).map(Number).sort((a, b) => a - b);
      const cycleRefYear = knownYears[((yr - knownYears[0]) % knownYears.length + knownYears.length) % knownYears.length];
      return tableForHoliday[cycleRefYear];
    }
    return { month: f.month, startDay: 15, endDay: 15 + Math.max(0, f.durationDays - 1) };
  };

  const results = FESTIVALS.map((f): DynamicCambodiaHoliday => {
    let activeYear = currentYear;
    let resolved = resolveDatesForYear(f, activeYear);
    let startDate = new Date(activeYear, resolved.month - 1, resolved.startDay);
    let endDate = new Date(activeYear, resolved.month - 1, resolved.endDay, 23, 59, 59);

    if (endDate.getTime() < todayStart.getTime()) {
      activeYear = currentYear + 1;
      resolved = resolveDatesForYear(f, activeYear);
      startDate = new Date(activeYear, resolved.month - 1, resolved.startDay);
      endDate = new Date(activeYear, resolved.month - 1, resolved.endDay, 23, 59, 59);
    }

    const diffMs = startDate.getTime() - todayStart.getTime();
    const rawDaysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const isOngoingToday = todayStart.getTime() >= startDate.getTime() && todayStart.getTime() <= endDate.getTime();
    const daysUntil = isOngoingToday ? 0 : Math.max(0, rawDaysUntil);

    const mKh = monthLabel(resolved.month, 'km');
    const mEn = MONTH_NAMES_SHORT_EN[resolved.month] || monthLabel(resolved.month, 'en');
    const isMultiDay = resolved.endDay > resolved.startDay;

    const dateStrKh = isMultiDay
      ? `ថ្ងៃទី ${toKhmerNum(resolved.startDay)}–${toKhmerNum(resolved.endDay)} ${mKh} ${toKhmerNum(activeYear)}`
      : `ថ្ងៃទី ${toKhmerNum(resolved.startDay)} ${mKh} ${toKhmerNum(activeYear)}`;
    const dateStrEn = isMultiDay
      ? `${resolved.startDay}–${resolved.endDay} ${mEn} ${activeYear}`
      : `${resolved.startDay} ${mEn} ${activeYear}`;
    const dateStrZh = isMultiDay
      ? `${activeYear}年${resolved.month}月${resolved.startDay}日至${resolved.endDay}日`
      : `${activeYear}年${resolved.month}月${resolved.startDay}日`;

    let countdownBadge: Tri;
    if (isOngoingToday) {
      countdownBadge = {
        km: '🎉 កំពុងប្រារព្ធថ្ងៃនេះ!',
        en: '🎉 Happening Today!',
        zh: '🎉 今日正在庆祝！',
      };
    } else if (daysUntil === 1) {
      countdownBadge = {
        km: '⏳ ថ្ងៃស្អែក (សល់ ១ ថ្ងៃ)',
        en: '⏳ Tomorrow (In 1 day)',
        zh: '⏳ 明天（剩 1 天）',
      };
    } else {
      countdownBadge = {
        km: `⏳ នៅសល់ ${toKhmerNum(daysUntil)} ថ្ងៃទៀត`,
        en: `⏳ In ${daysUntil} days`,
        zh: `⏳ 还有 ${daysUntil} 天`,
      };
    }

    return {
      ...f,
      month: resolved.month,
      activeYear,
      startDateIso: startDate.toISOString(),
      endDateIso: endDate.toISOString(),
      daysUntil,
      isOngoingToday,
      formattedDateRange: {
        km: dateStrKh,
        en: dateStrEn,
        zh: dateStrZh,
      },
      countdownBadge,
    };
  });

  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

// ---------------------------------------------------------------------------
// Emergency & Police Contact Numbers (Cambodia Official Hotlines)
// ---------------------------------------------------------------------------
export interface EmergencyContactItem {
  id: string;
  emoji: string;
  number: string;
  secondaryNumber?: string;
  name: Tri;
  note: Tri;
}

export const EMERGENCY_CONTACTS: EmergencyContactItem[] = [
  {
    id: 'police',
    emoji: '🚓',
    number: '117',
    name: { km: 'នគរបាលជាតិ (ប៉ូលីសសង្គ្រោះបន្ទាន់)', en: 'National Police Emergency', zh: '国家警察报警热线' },
    note: { km: 'ហៅឥតគិតថ្លៃ ២៤ ម៉ោង ទូទាំងប្រទេសកម្ពុជា', en: '24/7 toll-free emergency police hotline across Cambodia', zh: '全柬埔寨24小时免费紧急报警电话' },
  },
  {
    id: 'fire',
    emoji: '🚒',
    number: '118',
    name: { km: 'រថយន្តពន្លត់អគ្គិភ័យ', en: 'Fire Brigade Emergency', zh: '消防急救热线' },
    note: { km: 'សង្គ្រោះបន្ទាន់ករណីអគ្គិភ័យ ២៤ ម៉ោង', en: '24/7 fire & rescue emergency response', zh: '24小时火灾救援热线' },
  },
  {
    id: 'ambulance',
    emoji: '🚑',
    number: '119',
    name: { km: 'រថយន្តសង្គ្រោះបន្ទាន់ (ពេទ្យ)', en: 'Ambulance / Medical Emergency', zh: '医疗急救中心（救护车）' },
    note: { km: 'សង្គ្រោះបន្ទាន់ផ្នែកវេជ្ជសាស្ត្រ ២៤ ម៉ោង', en: '24/7 public medical emergency & ambulance service', zh: '24小时公共医疗急救与救护车服务' },
  },
  {
    id: 'tourist-police-pp',
    emoji: '👮',
    number: '012942484',
    secondaryNumber: '023724793',
    name: { km: 'នគរបាលទេសចរណ៍ (ភ្នំពេញ)', en: 'Tourist Police (Phnom Penh)', zh: '旅游警察（金边）' },
    note: { km: 'ជំនួយភ្ញៀវទេសចរ (០១២ ៩៤២ ៤៨៤ / ០២៣ ៧២៤ ៧៩៣)', en: 'Tourist assistance in Phnom Penh (012 942 484 / 023 724 793)', zh: '金边游客求助热线（012 942 484 / 023 724 793）' },
  },
  {
    id: 'tourist-police-sr',
    emoji: '🛕',
    number: '012402424',
    name: { km: 'នគរបាលទេសចរណ៍ (សៀមរាប–អង្គរ)', en: 'Tourist Police (Siem Reap & Angkor)', zh: '旅游警察（暹粒与吴哥景区）' },
    note: { km: 'ជំនួយភ្ញៀវទេសចរតំបន់អង្គរ (០១២ ៤០២ ៤២៤)', en: '24/7 tourist help in Siem Reap & Angkor Park (012 402 424)', zh: '暹粒及吴哥景区游客援助热线（012 402 424）' },
  },
  {
    id: 'gendarmerie',
    emoji: '🛡️',
    number: '1292',
    name: { km: 'កងរាជអាវុធហត្ថលើផ្ទៃប្រទេស', en: 'Royal Gendarmerie Hotline', zh: '国家宪兵紧急热线' },
    note: { km: 'បណ្ដឹងសន្តិសុខ និងសណ្ដាប់ធ្នាប់សាធារណៈ (១២៩២)', en: 'National security & public order hotline (1292)', zh: '全国治安与宪兵求助热线（1292）' },
  },
];

// ---------------------------------------------------------------------------
// Travel & dining tips (20+ practical tips including Police Emergency Contacts)
// ---------------------------------------------------------------------------
export type TipCategory = 'dining' | 'money' | 'culture' | 'safety';

export interface GuideTip {
  id: string;
  emoji: string;
  category: TipCategory;
  title: Tri;
  body: Tri;
}

export const TIP_CATEGORIES: Array<{ id: TipCategory | 'all'; emoji: string; label: Tri }> = [
  { id: 'all', emoji: '✨', label: { km: 'ទាំងអស់', en: 'All', zh: '全部' } },
  { id: 'dining', emoji: '🍽️', label: { km: 'ញ៉ាំអាហារ', en: 'Dining', zh: '用餐' } },
  { id: 'money', emoji: '💵', label: { km: 'លុយកាក់', en: 'Money', zh: '金钱' } },
  { id: 'culture', emoji: '🙏', label: { km: 'វប្បធម៌', en: 'Culture', zh: '礼仪' } },
  { id: 'safety', emoji: '🛡️', label: { km: 'សុវត្ថិភាព', en: 'Safety', zh: '安全' } },
];

export const GUIDE_TIPS: GuideTip[] = [
  {
    id: 'emergency-police-hotlines',
    emoji: '🚨',
    category: 'safety',
    title: {
      km: 'លេខទូរស័ព្ទសង្គ្រោះបន្ទាន់ & ប៉ូលីស (117 / 118 / 119)',
      en: 'Police & Emergency Numbers (117 / 118 / 119)',
      zh: '警察与紧急求助电话（117 / 118 / 119）',
    },
    body: {
      km: 'នគរបាលជាតិ៖ 117 • អគ្គិភ័យ៖ 118 • រថយន្តពេទ្យសង្គ្រោះបន្ទាន់៖ 119 • កងរាជអាវុធហត្ថ៖ 1292 • នគរបាលទេសចរណ៍ភ្នំពេញ៖ 012 942 484 / 023 724 793 និងសៀមរាប៖ 012 402 424។',
      en: 'National Police: 117 • Fire: 118 • Ambulance: 119 • Gendarmerie: 1292 • Tourist Police Phnom Penh: 012 942 484 / 023 724 793 & Siem Reap: 012 402 424.',
      zh: '报警电话：117 • 火警：118 • 救护车：119 • 宪兵热线：1292 • 金边旅游警察：012 942 484 / 023 724 793 • 暹粒旅游警察：012 402 424。',
    },
  },
  {
    id: 'family-style',
    emoji: '🍚',
    category: 'dining',
    title: { km: 'ញ៉ាំជាក្រុម ចែករំលែកម្ហូប', en: 'Eat family-style', zh: '共享用餐' },
    body: {
      km: 'កម្ម៉ង់ម្ហូបច្រើនមុខសម្រាប់ចែករំលែកជាមួយបាយ។ ម្ហូបដាក់នៅកណ្ដាលតុ ហើយគ្រប់គ្នាដួសដោយខ្លួនឯង។',
      en: 'Order several dishes to share with plain rice. Dishes sit in the middle of the table and everyone helps themselves.',
      zh: '点几道菜配白米饭共享，菜放在桌子中央，大家自取。',
    },
  },
  {
    id: 'spoon-fork',
    emoji: '🥄',
    category: 'dining',
    title: { km: 'ស្លាបព្រា និងសម', en: 'Spoon & fork', zh: '勺与叉' },
    body: {
      km: 'កាន់ស្លាបព្រាដៃស្ដាំ សមដៃឆ្វេងសម្រាប់រុញអាហារ។ ចង្កឹះប្រើភាគច្រើនសម្រាប់មីស៊ុប និងគុយទាវ។',
      en: 'Hold the spoon in your right hand and use the fork in your left to push food onto it. Chopsticks are mainly for noodle soups.',
      zh: '右手持勺、左手用叉把食物推到勺上；筷子主要用于汤面。',
    },
  },
  {
    id: 'spice',
    emoji: '🌶️',
    category: 'dining',
    title: { km: 'កម្រិតហឹរ & ប្រហុក', en: 'Spice & prahok', zh: '辣度与鱼酱' },
    body: {
      km: 'ម្ហូបខ្មែរភាគច្រើនមិនហឹរពេកទេ ម្ទេសដាក់ដោយឡែក។ ប្រហុកមានក្លិនឈ្ងុយខ្លាំង អាចសុំតិចៗបាន។',
      en: 'Most dishes are mild and chili comes on the side. Prahok (fermented fish) is strong — ask for a mild portion.',
      zh: '多数菜肴不辣，辣椒另上。鱼酱（Prahok）气味浓烈，可要求少放。',
    },
  },
  {
    id: 'hygiene',
    emoji: '🍽️',
    category: 'dining',
    title: { km: 'ជ្រើសរើសតូបមានអតិថិជនច្រើន', en: 'Pick busy stalls', zh: '选人多的摊位' },
    body: {
      km: 'ជ្រើសតូបដែលមានអតិថិជនច្រើន ចម្អិនស្រស់ៗ និងក្តៅៗភ្លាមៗនៅនឹងមុខ។',
      en: 'Choose busy stalls where food is cooked fresh to order and served piping hot.',
      zh: '选择客人多、现做现卖且热腾腾上桌的摊位。',
    },
  },
  {
    id: 'morning-breakfast',
    emoji: '🍜',
    category: 'dining',
    title: { km: 'ម៉ោងអាហារពេលព្រឹកដ៏ឆ្ងាញ់បំផុត (៦–៩ ព្រឹក)', en: 'Best local breakfast window (6–9 AM)', zh: '最佳本地早餐时段（早6–9点）' },
    body: {
      km: 'គុយទាវ បាយសាច់ជ្រូក និងនំបញ្ចុក លក់ដាច់បំផុតចន្លោះម៉ោង ៦:០០ ដល់ ៩:០០ ព្រឹក។ តូបល្បីៗច្រើនតែអស់មុនម៉ោង ១០ ព្រឹក។',
      en: 'Kuy Teav, Bai Sach Chrouk and Num Banh Chok are freshest between 6:00 and 9:00 AM — popular stalls sell out early!',
      zh: '金边粿条、烤猪肉饭和高棉米粉在早上 6:00–9:00 最新鲜，热门老店往往10点前售罄。',
    },
  },
  {
    id: 'herb-platter',
    emoji: '🌿',
    category: 'dining',
    title: { km: 'បន្លែអន្លក់ស្រស់ និងទឹកជ្រលក់', en: 'Fresh herb platters & dipping sauces', zh: '新鲜香草拼盘与蘸酱' },
    body: {
      km: 'ម្ហូបខ្មែរច្រើនតែមកជាមួយកន្ត្រកបន្លែអន្លក់ស្រស់ និងទឹកត្រីកោះកុង ឬទឹកប្រហុក។ សាកល្បងផ្ទាប់បន្លែដើម្បីទទួលបានរសជាតិដើមពិតៗ។',
      en: 'Many Khmer dishes arrive with a complimentary basket of fresh herbs and lime-pepper or fish dipping sauce — wrap and dip for authentic flavour.',
      zh: '高棉菜常附赠一篮新鲜香草与青柠胡椒蘸水，搭配包裹食用风味更地道。',
    },
  },
  {
    id: 'iced-tea-refills',
    emoji: '🧋',
    category: 'dining',
    title: { km: 'តែទឹកកកក្រូចឆ្មារ & ទឹកតែឥតគិតថ្លៃ', en: 'Iced jasmine tea & lime iced tea', zh: '茉莉冰茶与青柠红茶' },
    body: {
      km: 'ហាងអាហារក្នុងស្រុកជាច្រើនផ្តល់ជូនទឹកតែក្តៅ ឬទឹកតែទឹកកកដោយឥតគិតថ្លៃ។ «តែក្រូចឆ្មារ» គឺជាភេសជ្ជៈបំបាត់ការស្រេកទឹកដ៏ពេញនិយមបំផុត។',
      en: 'Many local eateries serve free weak jasmine tea at your table. Also try Te Krouch Chhmar (fresh Cambodian iced lime tea).',
      zh: '许多本地餐馆免费提供茶水；推荐品尝清凉解暑的高棉青柠冰红茶（Te Krouch Chhmar）。',
    },
  },
  {
    id: 'currency',
    emoji: '💵',
    category: 'money',
    title: { km: 'ដុល្លារអាមេរិក & ប្រាក់រៀលខ្មែរ', en: 'US dollars & Cambodian Riel', zh: '美元与瑞尔双币通用' },
    body: {
      km: 'ប្រើទាំងដុល្លារអាមេរិក និងប្រាក់រៀល។ អត្រាទូទៅគឺ ៤,០០០៛–៤,១០០៛ ស្មើ ១ ដុល្លារ ហើយលុយអាប់ក្រោម ១ ដុល្លារនឹងអាប់ជារៀល។',
      en: 'Both US dollars and Cambodian Riel circulate together. Roughly 4,000–4,100៛ ≈ US$1, with change under $1 given in Riel.',
      zh: '美元与瑞尔同时流通，约 4,000–4,100៛ ≈ 1 美元，1美元以下找零通常给瑞尔。',
    },
  },
  {
    id: 'torn-usd-bills',
    emoji: '🏦',
    category: 'money',
    title: { km: 'ពិនិត្យក្រដាសប្រាក់ដុល្លារកុំឱ្យរហែក', en: 'Reject torn or stained USD bills', zh: '切勿接收破损或污损的美元纸币' },
    body: {
      km: 'ហាងនៅកម្ពុជាមិនទទួលក្រដាសប្រាក់ដុល្លារដែលរហែក មានស្នាមត្រា ឬចាស់ពេកទេ។ សូមប្រើក្រដាសប្រាក់រៀលសម្រាប់ការចំណាយតូចៗ។',
      en: 'Merchants in Cambodia routinely refuse US dollar notes with even tiny tears, ink stamps or heavy creases. Carry Riel for small purchases!',
      zh: '柬埔寨商家通常拒收有任何微小撕裂、印章或严重折痕的美元纸币。建议准备瑞尔零钱用于日常消费。',
    },
  },
  {
    id: 'khqr-bakong',
    emoji: '📱',
    category: 'money',
    title: { km: 'ការទូទាត់តាម KHQR និងកម្មវិធី Bakong Tourists', en: 'KHQR & Bakong Tourist QR payments', zh: 'KHQR 与 Bakong 扫码支付' },
    body: {
      km: 'ស្ទើរតែគ្រប់ហាងអាហារ កាហ្វេ និងតូបតាមផ្សារទទួលការស្កេនបង់ប្រាក់តាម ABA KHQR ឬកម្មវិធី Bakong Tourist App យ៉ាងងាយស្រួល។',
      en: 'Almost all restaurants, cafés and market stalls accept KHQR scan payments via ABA Bank or the official Bakong Tourists app.',
      zh: '几乎所有餐厅、咖啡馆及市场摊位均支持 ABA KHQR 或官方 Bakong Tourists App 扫码支付。',
    },
  },
  {
    id: 'market-bargaining',
    emoji: '🛍️',
    category: 'money',
    title: { km: 'ការតថ្លៃដោយស្នាមញញឹមនៅតាមផ្សារ', en: 'Polite bargaining at local markets', zh: '在本地市场礼貌议价' },
    body: {
      km: 'នៅផ្សារធំថ្មី ផ្សារទួលទំពូង ឬផ្សារចាស់ អាចតថ្លៃវត្ថុអនុស្សាវរីយ៍ប្រហែល ១០–២៥% ដោយស្នាមញញឹម។ ចំណែកហាងអាហារមានតម្លៃកំណត់ច្បាស់លាស់។',
      en: 'At souvenir markets (Central Market, Russian Market, Old Market), polite bargaining of 10–25% with a smile is normal. Restaurants have fixed prices.',
      zh: '在中央市场、俄罗斯市场或老市场购买纪念品可微笑议价 10–25%；正规餐厅则为明码标价。',
    },
  },
  {
    id: 'tipping',
    emoji: '🧾',
    category: 'money',
    title: { km: 'ប្រាក់ទឹកតែ (Tip)', en: 'Tipping etiquette', zh: '小费礼仪' },
    body: {
      km: 'មិនបង្ខំទេ ប៉ុន្តែគេទទួលស្វាគមន៍៖ ប្រហែល ៥–១០% នៅភោជនីយដ្ឋានធំៗ និងលុយអាប់តិចតួចនៅហាងក្នុងស្រុក។',
      en: 'Not mandatory but warmly appreciated: around 5–10% at sit-down restaurants or rounding up small Riel change.',
      zh: '非强制但很受欢迎：餐厅约 5–10%，本地小店留些瑞尔零钱即可。',
    },
  },
  {
    id: 'sampeah',
    emoji: '🙏',
    category: 'culture',
    title: { km: 'ការសំពះជំរាបសួរតាមប្រពៃណីខ្មែរ', en: 'The Sampeah greeting', zh: '高棉合十礼（Sampeah）' },
    body: {
      km: 'ជំរាបសួរដោយការសំពះ ដៃទាំងពីរប្រកបគ្នាត្រង់ទ្រូង ហើយបន្ទាបក្បាលបន្តិច។ សំពះខ្ពស់ជាងសម្រាប់មនុស្សចាស់ និងព្រះសង្ឃ។',
      en: 'Greet with palms together near the chest and a gentle bow. Raise hands higher for elders, teachers and monks.',
      zh: '双手合十于胸前并微微鞠躬；对长辈与僧侣，双手举得更高以示敬意。',
    },
  },
  {
    id: 'temple-dress',
    emoji: '🛕',
    category: 'culture',
    title: { km: 'ស្លៀកពាក់សមរម្យពេលទៅវត្ត និងប្រាសាទអង្គរ', en: 'Temple & Angkor dress code', zh: '寺庙与吴哥景区着装规范' },
    body: {
      km: 'ត្រូវស្លៀកពាក់គ្របស្មា និងជង្គង់ពេលទៅវត្តអារាម ព្រះបរមរាជវាំង និងប្រាសាទអង្គរ ហើយដោះមួក និងស្បែកជើងមុនចូលព្រះវិហារ។',
      en: 'Cover your shoulders and knees at Angkor, the Royal Palace and pagodas, and remove hats and shoes before entering sanctuary halls.',
      zh: '参观吴哥古迹、皇宫与寺庙需遮住肩膀与膝盖，进入佛殿前请脱帽脱鞋。',
    },
  },
  {
    id: 'monk-etiquette',
    emoji: '🧡',
    category: 'culture',
    title: { km: 'ការគោរពព្រះសង្ឃក្នុងព្រះពុទ្ធសាសនា', en: 'Respectful etiquette around Buddhist monks', zh: '对佛教僧侣的礼仪规范' },
    body: {
      km: 'ស្ត្រីមិនត្រូវប៉ះពាល់ព្រះកាយ ឬស្បង់ចីវរព្រះសង្ឃដោយផ្ទាល់ឡើយ។ ពេលប្រគេនវត្ថុផ្សេងៗ គួរដាក់លើកម្រាល ឬថាស។',
      en: 'Women should never touch a Buddhist monk or his robes directly, nor hand items directly to him — place offerings on a cloth or tray.',
      zh: '女性切勿直接触碰僧侣或其袈裟，递交物品时请放在布垫或托盘上。',
    },
  },
  {
    id: 'head-and-feet',
    emoji: '🙇',
    category: 'culture',
    title: { km: 'ទំនៀមទម្លាប់ក្បាល និងបាតជើង', en: 'Head & feet cultural etiquette', zh: '头部与脚部的文化禁忌' },
    body: {
      km: 'ក្បាលត្រូវបានចាត់ទុកថាជាផ្នែកខ្ពង់ខ្ពស់ ដូច្នេះមិនគួរអង្អែលក្បាលអ្នកដទៃទេ។ ពេលអង្គុយក្នុងវត្ត សូមបត់ជើងទៅក្រោយ កុំសណ្ដូកជើងចំមុខព្រះពុទ្ធរូប។',
      en: 'The head is considered sacred — avoid touching anyone on the head. In temples, sit with feet tucked back, never pointing your soles at Buddha images.',
      zh: '头部被视为神圣部位，请勿摸他人头部；在寺庙就坐时请将双脚收向身后，切勿脚底朝向佛像。',
    },
  },
  {
    id: 'angkor-official-ticket',
    emoji: '🎟️',
    category: 'culture',
    title: { km: 'ទិញសំបុត្រចូលទស្សនាអង្គរផ្លូវការ (Angkor Pass)', en: 'Buy official Angkor Pass tickets only', zh: '通过官方渠道购买吴哥门票' },
    body: {
      km: 'ភ្ញៀវអន្តរជាតិអាចទិញសំបុត្រផ្លូវការនៅគ្រឹះស្ថានអង្គរ ឬតាមកម្មវិធី Angkor Enterprise (១ ថ្ងៃ $37, ៣ ថ្ងៃ $62, ៧ ថ្ងៃ $72)។ ពលរដ្ឋខ្មែរចូលទស្សនាដោយឥតគិតថ្លៃ ($0)។',
      en: 'Foreign visitors should buy tickets only at the official Angkor Enterprise ticket center or website (1-day $37, 3-day $62, 7-day $72). Free ($0) for Cambodian citizens.',
      zh: '外国游客请仅在吴哥机构官方售票处或官网购票（1日票$37、3日票$62、7日票$72）；柬埔寨公民免费。',
    },
  },
  {
    id: 'water',
    emoji: '💧',
    category: 'safety',
    title: { km: 'ទឹកស្អាត & អនាម័យទឹកកក', en: 'Safe drinking water & ice', zh: '饮用水与冰块安全' },
    body: {
      km: 'ជ្រើសរើសទឹកដបបរិសុទ្ធ។ ទឹកកករាងបំពង់មូល (ទឹកកកអនាម័យ) ក្នុងភោជនីយដ្ឋានផលិតពីទឹកចម្រោះស្អាតមានសុវត្ថិភាព។',
      en: 'Drink bottled or filtered water. Cylindrical tube ice with a hole in the center is factory-purified and safe across restaurants.',
      zh: '请饮用瓶装纯净水。餐厅里中间带孔的圆柱形空心冰块由纯净水厂生产，安全卫生。',
    },
  },
  {
    id: 'transport',
    emoji: '🛵',
    category: 'safety',
    title: { km: 'ធ្វើដំណើរដោយសុវត្ថិភាពតាម PassApp / Grab', en: 'Safe rides with PassApp & Grab', zh: '使用 PassApp / Grab 安全出行' },
    body: {
      km: 'ប្រើកម្មវិធី PassApp ឬ Grab សម្រាប់តម្លៃកំណត់ច្បាស់លាស់ ហើយកាន់ទូរស័ព្ទ និងកាបូបឱ្យជាប់នៅផ្នែកខាងក្នុងពេលជិះកង់បី។',
      en: 'Use PassApp or Grab for transparent metered tuk-tuk fares, and keep phones and bags tucked inside away from passing traffic.',
      zh: '推荐使用 PassApp 或 Grab 叫车，价格透明；乘坐嘟嘟车时请将手机与背包放在内侧，勿伸出车外。',
    },
  },
  {
    id: 'heat-sun-protection',
    emoji: '☀️',
    category: 'safety',
    title: { km: 'ការពារកម្ដៅថ្ងៃ និងបំពេញជាតិទឹក', en: 'Beat the tropical midday heat', zh: '防晒防暑与及时补水' },
    body: {
      km: 'ចន្លោះម៉ោង ១១ ព្រឹក ដល់ ២ រសៀល អាកាសធាតុក្តៅខ្លាំង — គួរពាក់មួក លាបឡេការពារកម្ដៅថ្ងៃ និងផឹកទឹកដូងស្រស់ដើម្បីបំពេញជាតិរ៉ែ។',
      en: 'Visit temples early morning (sunrise to 10 AM) or after 3 PM. Stay hydrated with fresh young coconut water and electrolytes.',
      zh: '正午11点至下午2点阳光强烈，建议清晨或下午游览古迹，多喝新鲜椰子水补充水分与电解质。',
    },
  },
  {
    id: 'sim-card-connectivity',
    emoji: '📶',
    category: 'safety',
    title: { km: 'ស៊ីមកាត 4G/5G និងអ៊ីនធឺណិត (Smart / Cellcard / Metfone)', en: 'Local SIM / eSIM for reliable GPS & maps', zh: '办理本地电话卡（Smart / Cellcard / Metfone）' },
    body: {
      km: 'ទិញស៊ីមកាត ឬ eSIM ផ្លូវការនៅព្រលានយន្តហោះ ឬហាង Smart, Cellcard, Metfone ដើម្បីប្រើផែនទី GPS ហៅតុកតុក និងទូរស័ព្ទបន្ទាន់បានគ្រប់ខេត្ត។',
      en: 'Get an official Smart, Cellcard or Metfone SIM/eSIM for fast 4G/5G data across all 25 provinces for maps and ride-hailing.',
      zh: '建议办理 Smart、Cellcard 或 Metfone 本地卡/eSIM，覆盖全国25省，方便导航与叫车。',
    },
  },
  {
    id: 'pharmacies-clinics',
    emoji: '💊',
    category: 'safety',
    title: { km: 'ឱសថស្ថានផ្លូវការ និងការការពារមូសខ្លា', en: 'Licensed pharmacies & mosquito protection', zh: '正规药房与防蚊贴士' },
    body: {
      km: 'ប្រើស្เปรយ៍ការពារមូសនៅពេលព្រលប់ និងទិញថ្នាំពេទ្យនៅឱសថស្ថានស្របច្បាប់ (ដូចជា UCare Pharmacy ឬ Pharmacie de la Gare)។ ករណីបន្ទាន់ហៅ 119។',
      en: 'Use mosquito repellent at dusk and buy medicine from licensed pharmacies (such as UCare or Pharmacie de la Gare). Call 119 for medical emergencies.',
      zh: '傍晚外出建议使用驱蚊液；购药请前往正规连锁药房（如 UCare），紧急医疗情况请拨打 119。',
    },
  },
];

// ---------------------------------------------------------------------------
// Phrasebook
// ---------------------------------------------------------------------------
export interface Phrase {
  id: string;
  khmer: string;
  roman: string;
  en: string;
  zh: string;
}

export const PHRASES: Phrase[] = [
  { id: 'hello', khmer: 'សួស្តី', roman: 'suostei', en: 'Hello', zh: '你好' },
  { id: 'thanks', khmer: 'អរគុណ', roman: 'arkun', en: 'Thank you', zh: '谢谢' },
  { id: 'delicious', khmer: 'ឆ្ងាញ់ណាស់', roman: 'chhnganh nas', en: 'Very delicious!', zh: '太好吃了！' },
  { id: 'price', khmer: 'ថ្លៃប៉ុន្មាន?', roman: 'thlai pon-man?', en: 'How much is it?', zh: '多少钱？' },
  { id: 'no-chili', khmer: 'សូមកុំដាក់ម្ទេស', roman: 'som kom dak mtes', en: 'No chili, please', zh: '请不要放辣椒' },
  { id: 'water', khmer: 'សូមទឹកបរិសុទ្ធមួយដប', roman: 'som tuek borisot muoy dop', en: 'A bottle of drinking water, please', zh: '请给我一瓶纯净水' },
  { id: 'vegetarian', khmer: 'សូមម្ហូបបួស', roman: 'som mhob buos', en: 'Vegetarian food, please', zh: '请给我素食' },
  { id: 'more', khmer: 'សូមមួយទៀត', roman: 'som muoy teat', en: 'One more, please', zh: '请再来一份' },
  { id: 'takeaway', khmer: 'សូមខ្ចប់', roman: 'som khchop', en: 'Please pack it to go', zh: '请打包' },
  { id: 'bill', khmer: 'សូមគិតលុយ', roman: 'som kit luy', en: 'The bill, please', zh: '请结账' },
  { id: 'toilet', khmer: 'បន្ទប់ទឹកនៅឯណា?', roman: 'bontob tuek nov ae na?', en: 'Where is the restroom?', zh: '洗手间在哪里？' },
  { id: 'noproblem', khmer: 'មិនអីទេ', roman: 'min ey te', en: "No problem / It's OK", zh: '没关系' },
];

export const pickTri = (t: Tri, lang: 'km' | 'en' | 'zh'): string => t[lang] || t.en;
