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
// Festivals (lunar-calendar based — typical month only)
// ---------------------------------------------------------------------------
export interface Festival {
  id: string;
  emoji: string;
  month: number; // 1-12 (typical)
  name: Tri;
  when: Tri;
  about: Tri;
  foods: Tri;
  tip: Tri;
}

export const FESTIVALS: Festival[] = [
  {
    id: 'meak-bochea',
    emoji: '🕯️',
    month: 2,
    name: { km: 'ពិធីមាឃបូជា', en: 'Meak Bochea', zh: '万佛节' },
    when: { km: 'ពេញបូណ៌មី ខែមាឃ (ប្រហែលខែកុម្ភៈ)', en: 'Full moon, around February', zh: '约2月满月日' },
    about: {
      km: 'ថ្ងៃគោរពព្រះសង្ឃ ១,២៥០ អង្គ។ ប្រជាជនទៅវត្តដើរតាមទៀនជុំវិញព្រះវិហារ។',
      en: 'Buddhists gather at temples for candle-lit processions to honour the Buddha and the monks.',
      zh: '佛教徒前往寺庙参加烛光巡礼，纪念佛陀与僧侣。',
    },
    foods: { km: 'ម្ហូបបួស និងចង្ហាន់ថ្វាយព្រះសង្ឃ', en: 'Vegetarian meals and offerings to monks', zh: '素食与供养僧侣的餐食' },
    tip: { km: 'ស្លៀកពាក់សមរម្យពេលទៅវត្ត', en: 'Dress modestly when visiting temples.', zh: '前往寺庙请着装得体。' },
  },
  {
    id: 'khmer-new-year',
    emoji: '🎊',
    month: 4,
    name: { km: 'បុណ្យចូលឆ្នាំខ្មែរ', en: 'Khmer New Year', zh: '高棉新年' },
    when: { km: 'ថ្ងៃទី ១៣–១៦ មេសា', en: 'About 13–16 April', zh: '约4月13–16日' },
    about: {
      km: 'បុណ្យធំបំផុតរបស់ជាតិ ៣ ថ្ងៃ — ទៅវត្ត លេងល្បែងប្រជាប្រិយ និងជួបជុំគ្រួសារ។',
      en: 'The biggest national celebration: three days of temple visits, traditional games and family reunions.',
      zh: '全国最盛大的节日，三天里拜寺、玩传统游戏、阖家团聚。',
    },
    foods: { km: 'នំអន្សម នំគម ម្ហូបខ្មែរបុរាណ និងផ្លែឈើ', en: 'Num ansom, num kom, traditional dishes and fruit', zh: '粽子类糯米糕（Num Ansom/Num Kom）、传统菜肴与水果' },
    tip: {
      km: 'ទីក្រុងធំស្ងាត់ព្រោះមនុស្សទៅស្រុកកំណើត — ហាងខ្លះបិទ ត្រូវកក់ការធ្វើដំណើរមុន។',
      en: 'Cities go quiet as people return to the provinces — some shops close, so book transport early.',
      zh: '许多人返乡，城市会变安静，部分店铺休息；请提前订好交通。',
    },
  },
  {
    id: 'visak-bochea',
    emoji: '🪷',
    month: 5,
    name: { km: 'ពិធីវិសាខបូជា', en: 'Visak Bochea', zh: '卫塞节' },
    when: { km: 'ពេញបូណ៌មី ខែពិសាខ (ប្រហែលខែឧសភា)', en: 'Full moon, around May', zh: '约5月满月日' },
    about: {
      km: 'ថ្ងៃប្រសូត ត្រាស់ដឹង និងបរិនិព្វានរបស់ព្រះពុទ្ធ។',
      en: 'Marks the birth, enlightenment and passing of the Buddha.',
      zh: '纪念佛陀诞生、成道与涅槃。',
    },
    foods: { km: 'ម្ហូបបួស និងចង្ហាន់វត្ត', en: 'Vegetarian food and temple offerings', zh: '素食与寺庙供品' },
    tip: { km: 'វត្តមានមនុស្សច្រើន សូមដោះមួកពេលចូលសាលា', en: 'Temples are busy — remove hats inside the halls.', zh: '寺庙人多，进入殿堂请脱帽。' },
  },
  {
    id: 'royal-ploughing',
    emoji: '🐂',
    month: 5,
    name: { km: 'ព្រះរាជពិធីច្រត់ព្រះនង្គ័ល', en: 'Royal Ploughing Ceremony', zh: '皇家春耕节' },
    when: { km: 'ដើមខែឧសភា (តាមប្រតិទិនចន្ទគតិ)', en: 'Early May (lunar calendar)', zh: '约5月初（依农历）' },
    about: {
      km: 'គោសេកជ្រើសរើសចំណីដើម្បីទស្សន៍ទាយទិន្នផលកសិកម្មឆ្នាំនោះ។',
      en: 'Sacred oxen choose among rice, corn, beans, sesame, grass, water and wine to predict the coming harvest.',
      zh: '神牛在稻谷、玉米、豆类、芝麻、草、水和酒中择食，预示当年收成。',
    },
    foods: { km: 'បាយ និងផលិតផលកសិកម្មក្នុងស្រុក', en: 'Rice and local farm produce', zh: '米饭与本地农产品' },
    tip: { km: 'ពិធីធ្វើនៅរាជធានីភ្នំពេញ', en: 'The main ceremony takes place in Phnom Penh.', zh: '主要仪式在金边举行。' },
  },
  {
    id: 'pchum-ben',
    emoji: '🍚',
    month: 9,
    name: { km: 'ភ្ជុំបិណ្ឌ', en: 'Pchum Ben', zh: '祭祖节' },
    when: { km: 'ចុងខែកញ្ញា – ដើមខែតុលា (១៥ ថ្ងៃ)', en: 'Late Sep – early Oct (15 days)', zh: '约9月下旬至10月上旬（共15天）' },
    about: {
      km: 'ពិធីរំលឹកគុណវិញ្ញាណក្ខន្ធបុព្វបុរស — ប្រជាជនយកបាយបិណ្ឌទៅវត្ត។',
      en: 'Cambodians offer rice balls at temples to honour their ancestors.',
      zh: '人们携饭团前往寺庙供奉，缅怀祖先。',
    },
    foods: { km: 'បាយបិណ្ឌ នំអន្សម និងនំគម', en: 'Bay ben (rice balls), num ansom and num kom', zh: '供奉饭团（Bay Ben）、Num Ansom 与 Num Kom' },
    tip: { km: 'ការិយាល័យ និងហាងជាច្រើនបិទ ៣ ថ្ងៃ', en: 'Many offices and shops close for about three days.', zh: '许多机构与店铺会休息约三天。' },
  },
  {
    id: 'water-festival',
    emoji: '🚣',
    month: 11,
    name: { km: 'បុណ្យអុំទូក', en: 'Bon Om Touk (Water Festival)', zh: '送水节' },
    when: { km: 'ពេញបូណ៌មី ខែកក្ដិក (ប្រហែលខែវិច្ឆិកា)', en: 'Full moon, around November', zh: '约11月满月日' },
    about: {
      km: 'ប្រណាំងទូកងនៅទន្លេ ដើម្បីអបអរទឹកទន្លេហូរត្រឡប់ចូលទន្លេមេគង្គវិញ។',
      en: 'Boat races celebrate the reversal of the Tonle Sap River flow — a spectacle along the Phnom Penh riverfront.',
      zh: '龙舟竞渡，庆祝洞里萨河水流回归，金边河畔热闹非凡。',
    },
    foods: { km: 'អំបុក ត្រីអាំង និងត្រីទន្លេស្រស់ៗ', en: 'Ambok (pounded young rice with banana & coconut), grilled fish', zh: '扁米糕 Ambok（配香蕉与椰丝）、烤鱼' },
    tip: { km: 'កក់សណ្ឋាគារមុន ហើយពិនិត្យកាលបរិច្ឆេទផ្លូវការ', en: 'Book hotels early and check the official event dates.', zh: '请提前订房，并确认官方活动日期。' },
  },
];

// ---------------------------------------------------------------------------
// Travel & dining tips
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
      km: 'កាន់ស្លាបព្រាដៃស្ដាំ សមដៃឆ្វេងសម្រាប់រុញអាហារ។ ចង្កឹះប្រើភាគច្រើនសម្រាប់មីស៊ុប។',
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
      km: 'ម្ហូបខ្មែរភាគច្រើនមិនហឹរពេកទេ ម្ទេសដាក់ដោយឡែក។ ប្រហុកមានក្លិនខ្លាំង អាចសុំតិចៗបាន។',
      en: 'Most dishes are mild and chili comes on the side. Prahok (fermented fish) is strong — ask for a mild portion.',
      zh: '多数菜肴不辣，辣椒另上。鱼酱（Prahok）气味浓烈，可要求少放。',
    },
  },
  {
    id: 'hygiene',
    emoji: '🍽️',
    category: 'dining',
    title: { km: 'ជ្រើសរើសតូបស្អាត', en: 'Pick busy stalls', zh: '选人多的摊位' },
    body: {
      km: 'ជ្រើសតូបដែលមានអតិថិជនច្រើន ចម្អិនស្រស់ៗ និងក្តៅៗ។',
      en: 'Choose busy stalls where food is cooked fresh and served hot.',
      zh: '选择客人多、现做现卖且热腾腾上桌的摊位。',
    },
  },
  {
    id: 'currency',
    emoji: '💵',
    category: 'money',
    title: { km: 'ដុល្លារ & រៀល', en: 'US dollars & Riel', zh: '美元与瑞尔' },
    body: {
      km: 'ប្រើទាំងដុល្លារអាមេរិក និងប្រាក់រៀល។ ប្រហែល ៤០០០៛ ស្មើ ១ ដុល្លារ ហើយលុយអាប់ជាធម្មតាអ្នកលក់អាចអាប់ជារៀល។',
      en: 'Both US dollars and Cambodian Riel are used. Roughly 4,000៛ ≈ US$1, and change is often given in Riel.',
      zh: '美元与瑞尔都通用，约 4,000៛ ≈ 1 美元，找零常以瑞尔支付。',
    },
  },
  {
    id: 'tipping',
    emoji: '🧾',
    category: 'money',
    title: { km: 'ប្រាក់ទឹកតែ', en: 'Tipping', zh: '小费' },
    body: {
      km: 'មិនបង្ខំទេ ប៉ុន្តែគេទទួលស្វាគមន៍៖ ប្រហែល ៥–១០% នៅភោជនីយដ្ឋានទេសចរណ៍ និងលុយអាប់តិចតួចនៅហាងក្នុងស្រុក។',
      en: 'Not required but appreciated: about 5–10% in tourist restaurants and small change at local eateries.',
      zh: '非强制但受欢迎：游客餐厅约5–10%，本地小店留些零钱即可。',
    },
  },
  {
    id: 'sampeah',
    emoji: '🙏',
    category: 'culture',
    title: { km: 'ការសំពះ', en: 'The Sampeah greeting', zh: '合十问候' },
    body: {
      km: 'ជំរាបសួរដោយការសំពះ ដៃទាំងពីរប្រកបគ្នាត្រង់ទ្រូង ហើយបន្ទាបក្បាលបន្តិច។ សំពះខ្ពស់ជាងសម្រាប់មនុស្សចាស់ និងព្រះសង្ឃ។',
      en: 'Greet with palms together near the chest and a slight bow. Hold hands higher for elders and monks.',
      zh: '双手合十于胸前并微微鞠躬；对长辈与僧侣，双手举得更高。',
    },
  },
  {
    id: 'temple-dress',
    emoji: '🛕',
    category: 'culture',
    title: { km: 'ស្លៀកពាក់ទៅវត្ត', en: 'Temple dress code', zh: '寺庙着装' },
    body: {
      km: 'គ្របស្មាម និងជង្គង់ពេលទៅវត្ត ឬអង្គរ ហើយដោះមួក និងស្បែកជើងពេលចូលសាលា។',
      en: 'Cover shoulders and knees at temples including Angkor, and remove hats and shoes before entering halls.',
      zh: '参观寺庙（含吴哥）需遮住肩膀与膝盖，进入殿堂前请脱帽脱鞋。',
    },
  },
  {
    id: 'water',
    emoji: '💧',
    category: 'safety',
    title: { km: 'ទឹកស្អាត', en: 'Drink safe water', zh: '饮水安全' },
    body: {
      km: 'ជ្រើសរើសទឹកដបបរិសុទ្ធ។ ទឹកកកក្នុងភោជនីយដ្ឋានភាគច្រើនធ្វើពីទឹកស្អាត ប៉ុន្តែប្រយ័ត្ននៅតូបតាមផ្លូវ។',
      en: 'Choose bottled or filtered water. Restaurant ice is usually made from purified water — be more careful at roadside stalls.',
      zh: '请选择瓶装或过滤水。餐厅冰块通常由净化水制成，路边摊则需多加留意。',
    },
  },
  {
    id: 'transport',
    emoji: '🛵',
    category: 'safety',
    title: { km: 'ធ្វើដំណើរដោយសុវត្ថិភាព', en: 'Getting around safely', zh: '出行安全' },
    body: {
      km: 'ប្រើកម្មវិធីកក់ឡាន ឬព្រមព្រៀងតម្លៃតុកតុកមុនឡើង ហើយកាន់ទូរស័ព្ទ/កាបូបឱ្យឆ្ងាយពីចិញ្ចើមផ្លូវ។',
      en: 'Use ride-hailing apps or agree on the tuk-tuk fare before you ride, and keep your phone and bag away from the road side.',
      zh: '使用打车软件，或乘嘟嘟车前先谈好价格；手机和包请远离路边一侧。',
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
