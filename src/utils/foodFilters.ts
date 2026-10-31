import type { FoodItem, Language, Restaurant } from '../types';

export interface ProvinceFilterOption {
  id: string;
  kh: string;
  fullKh: string;
  en: string;
  zh: string;
  region: 'central' | 'tonle_sap' | 'coastal' | 'mekong' | 'highlands';
  lat: number;
  lng: number;
  culinaryTitleKh: string;
  culinaryTitleEn: string;
  culinaryTitleZh: string;
  historyKh: string;
  historyEn: string;
  historyZh: string;
  whereToFindKh: string;
  whereToFindEn: string;
  whereToFindZh: string;
  signatureDishIds: string[];
}

/**
 * All 25 Cambodian Provinces & Capital City with authentic traditional dishes,
 * regional culinary history, GPS coordinates, and verified local dining hubs.
 * Every dish ID (food-1 .. food-200) is uniquely mapped with zero duplication.
 */
export const DISH_PROVINCES: ProvinceFilterOption[] = [
  {
    id: 'phnom_penh',
    kh: 'ភ្នំពេញ',
    fullKh: 'រាជធានីភ្នំពេញ',
    en: 'Phnom Penh',
    zh: '金边',
    region: 'central',
    lat: 11.5564,
    lng: 104.9282,
    culinaryTitleKh: 'គុយទាវភ្នំពេញ បាយសាច់ជ្រូក លតឆា និងម្ហូបរាជធានី',
    culinaryTitleEn: 'Phnom Penh Kuy Teav, Grilled Pork Rice & Capital Street Classics',
    culinaryTitleZh: '金边粿条、烤猪肉饭、炒银针粉与首都传统风味',
    historyKh:
      'ម្ហូបអាហារនៅរាជធានីភ្នំពេញ គឺជាចំណុចប្រសព្វនៃវប្បធម៌ធ្វើម្ហូបខ្មែរពីគ្រប់ខេត្ត-ក្រុង ដោយល្បីល្បាញបំផុតលើទឹកស៊ុបគុយទាវភ្នំពេញរម្ងាស់ពីឆ្អឹងជ្រូកនិងមឹកក្រៀម បាយសាច់ជ្រូកអាំងពេលព្រឹក និងលតឆាពេលល្ងាច។',
    historyEn:
      'Phnom Penh’s culinary heritage blends regional Khmer recipes with bustling riverside and market street food, famed for slow-simmered Phnom Penh pork-and-dried-squid Kuy Teav broth, charcoal-grilled morning pork rice, and wok-fired Lort Cha.',
    historyZh:
      '金边饮食文化融合了高棉传统名菜与热闹的河畔集市街头美食，以慢火熬制的金边猪骨墨鱼干粿条、清晨炭烤猪肉碎米饭及夜市炒银针粉闻名。',
    whereToFindKh: 'ផ្សារធំថ្មី ផ្សារទួលទំពូង ផ្សារអូរឫស្សី និងតាមបណ្តោយមាត់ទន្លេចតុមុខ រាជធានីភ្នំពេញ',
    whereToFindEn: 'Central Market (Phsar Thmei), Russian Market, Orussey Market & Sisowath Riverside, Phnom Penh',
    whereToFindZh: '金边中央市场、俄罗斯市场、乌亚西市场及四臂湾河畔美食街',
    signatureDishIds: ['food-36', 'food-158', 'food-160', 'food-168', 'food-179', 'food-49', 'food-165', 'food-194'],
  },
  {
    id: 'siem_reap',
    kh: 'សៀមរាប',
    fullKh: 'ខេត្តសៀមរាប',
    en: 'Siem Reap',
    zh: '暹粒',
    region: 'tonle_sap',
    lat: 13.3633,
    lng: 103.8564,
    culinaryTitleKh: 'អាម៉ុកត្រី នំបញ្ចុកទឹកប្រហុក សាច់ក្រកសៀមរាប និងមាន់ដុតភ្នំគូលែន',
    culinaryTitleEn: 'Angkor Fish Amok, Siem Reap Prahok Noodles & Kulen Honey Roast Chicken',
    culinaryTitleZh: '吴哥阿莫克蒸鱼、暹粒发酵鱼酱米粉、暹粒香肠与荔枝山蜂蜜烤鸡',
    historyKh:
      'ខេត្តសៀមរាបរក្សាបាននូវក្បួនធ្វើម្ហូបបុរាណសម័យអង្គរ ដូចជាអាម៉ុកត្រីចំហុយក្នុងកន្ទោងស្លឹកចេកជាមួយស្លឹកញ នំបញ្ចុកទឹកប្រហុកសៀមរាប សាច់ក្រកសៀមរាប និងមាន់ដុតទឹកឃ្មុំព្រៃភ្នំគូលែន។',
    historyEn:
      'Home to the ancient Angkor Empire, Siem Reap preserves classical Khmer gastronomy—most notably banana-leaf steamed Fish Amok with noni leaves, Siem Reap Prahok rice vermicelli, sweet pork sausages, and Kulen mountain honey-roasted chicken.',
    historyZh:
      '作为古吴哥帝国的中心，暹粒完整保留了古典高棉烹饪技艺，最具代表性的菜品包括香蕉叶诺丽叶蒸阿莫克鱼、暹粒鱼酱米粉、暹粒甜香肠及荔枝山野蜂蜜烤鸡。',
    whereToFindKh: 'មាត់ស្ទឹងសៀមរាប ផ្សារចាស់ ភូមិវប្បធម៌ និងជើងភ្នំគូលែន ខេត្តសៀមរាប',
    whereToFindEn: 'Siem Reap Riverside, Old Market (Phsar Chas), Wat Damnak area & Kulen Foothills, Siem Reap',
    whereToFindZh: '暹粒河畔餐饮走廊、老市场 (Phsar Chas)、Wat Damnak 街区及荔枝山脚景区',
    signatureDishIds: ['food-1', 'food-22', 'food-82', 'food-96', 'food-118', 'food-37', 'food-154', 'food-47'],
  },
  {
    id: 'battambang',
    kh: 'បាត់ដំបង',
    fullKh: 'ខេត្តបាត់ដំបង',
    en: 'Battambang',
    zh: '马德望',
    region: 'tonle_sap',
    lat: 13.0957,
    lng: 103.2022,
    culinaryTitleKh: 'ក្រឡានថ្មគោល គួងបាត់ដំបង ងៀតគោ និងទឹកគ្រឿងសណ្តែកដី',
    culinaryTitleEn: 'Thmor Kol Bamboo Sticky Rice, Fresh Spring Rolls & Battambang Peanut Teuk Kroeung',
    culinaryTitleZh: '马德望竹筒饭、鲜虾春卷、牛肉干与花生鱼蓉蘸酱',
    historyKh:
      'បាត់ដំបងត្រូវបានគេប្រសិទ្ធនាមថាជា «ជង្រុកស្រូវនៃកម្ពុជា»។ ម្ហូបប្រចាំតំបន់នេះល្បីល្បាញដោយសារអង្ករក្រអូប ក្រឡានបំពង់ឫស្សីថ្មគោល គួងបាត់ដំបង សាច់គោចង្កាក់អាំងគ្រឿង និងទឹកគ្រឿងសណ្តែកដីបាត់ដំបង។',
    historyEn:
      'Celebrated as the “Rice Bowl of Cambodia,” Battambang is renowned for fragrant jasmine and glutinous rice specialties including Thmor Kol roasted bamboo sticky rice (Kralan), Nime Chow fresh spring rolls, and nutty Battambang Teuk Kroeung.',
    historyZh:
      '马德望被誉为“柬埔寨谷仓”，以优质茉莉香米与糯米美食闻名，代表菜包括特莫戈竹筒糯米饭 (Kralan)、马德望鲜虾春卷、香茅烤牛肉串及花生鱼酱。',
    whereToFindKh: 'ផ្សារណាត់ មាត់ស្ទឹងសង្កែ និងស្រុកថ្មគោល (ផ្លូវក្រឡាន) ខេត្តបាត់ដំបង',
    whereToFindEn: 'Psar Nat Central Market, Sangker Riverfront & Thmor Kol Kralan Road, Battambang',
    whereToFindZh: '马德望中央市场 (Psar Nat)、桑岐河畔及特莫戈竹筒饭一条街',
    signatureDishIds: ['food-45', 'food-64', 'food-78', 'food-97', 'food-178', 'food-181', 'food-83', 'food-155'],
  },
  {
    id: 'kampot',
    kh: 'កំពត',
    fullKh: 'ខេត្តកំពត',
    en: 'Kampot',
    zh: '贡布',
    region: 'coastal',
    lat: 10.5942,
    lng: 104.164,
    culinaryTitleKh: 'ក្តាមឆាម្រេចខ្ចីកំពត ឡុកឡាក់សាច់គោម្រេចកំពត និងមាន់ដុតទឹកឈូ',
    culinaryTitleEn: 'Kampot Green Pepper Crab, Kampot Pepper Beef Lok Lak & Teuk Chhou Roast Chicken',
    culinaryTitleZh: '贡布青胡椒炒蟹、贡布胡椒摇滚牛肉粒与德楚河畔烤鸡',
    historyKh:
      'ខេត្តកំពតមានកេរ្តិ៍ឈ្មោះល្បីល្បាញទូទាំងពិភពលោកលើ «ម្រេចកំពត» (សម្គាល់ភូមិសាស្ត្រ GI) អំបិលសមុទ្រ និងទុរេនកំពត។ មុខម្ហូបប្រចាំខេត្តរួមមានក្តាមសេះឆាម្រេចខ្ចី មឹកឆាម្រេចខ្ចី ឡុកឡាក់សាច់គោម្រេចកំពត និងមាន់ដុតច្រាំងទន្លេទឹកឈូ។',
    historyEn:
      'World-famous for Geographical Indication (GI) Kampot Pepper and sea salt farms, Kampot’s signature cuisine highlights fresh green peppercorn clusters wok-tossed with coastal seafood, Beef Lok Lak, and riverside herbal roast chicken at Teuk Chhou.',
    historyZh:
      '贡布以享誉全球的国家地理标志 (GI) 贡布胡椒和天然海盐闻名，招牌名菜包括鲜青胡椒粒炒花蟹、青胡椒炒鱿鱼、贡布胡椒牛肉粒及德楚河畔香草烤鸡。',
    whereToFindKh: 'មាត់ព្រែកកំពត រមណីយដ្ឋានទឹកឈូ និងចម្ការម្រេចភ្នំវោរ ខេត្តកំពត',
    whereToFindEn: 'Kampot Old Riverfront, Teuk Chhou Rapids & Phnom Vor Pepper Plantations, Kampot',
    whereToFindZh: '贡布老桥河畔、德楚溪流景区及贡布胡椒庄园周边餐厅',
    signatureDishIds: ['food-21', 'food-26', 'food-27', 'food-50', 'food-136', 'food-164', 'food-176', 'food-35'],
  },
  {
    id: 'kep',
    kh: 'កែប',
    fullKh: 'ខេត្តកែប',
    en: 'Kep',
    zh: '白马',
    region: 'coastal',
    lat: 10.4829,
    lng: 104.3167,
    culinaryTitleKh: 'ក្តាមសេះស្រស់ បង្គាអាំងអំបិលម្ទេស មឹកអាំង និងគុយទាវគ្រឿងសមុទ្រកែប',
    culinaryTitleEn: 'Kep Crab Market Swimmer Crabs, Chili-Salt Prawns & Coastal Seafood Noodles',
    culinaryTitleZh: '白马螃蟹市场鲜活花蟹、椒盐烤大虾、烤鱿鱼与白马海鲜粿条',
    historyKh:
      'ខេត្តកែប គឺជាទីក្រុងទេសចរណ៍ឆ្នេរសមុទ្រដ៏ល្បីល្បាញតាំងពីទសវត្សរ៍ឆ្នាំ ១៩៦០។ ផ្សារក្តាមខេត្តកែបផ្តល់ជូនក្តាមសេះស្រស់ៗទើបលើកពីលបក្នុងសមុទ្រ បង្គាអាំងអំបិលម្ទេស បាយឆាក្តាម និងគុយទាវគ្រឿងសមុទ្រកែប។',
    historyEn:
      'Cambodia’s historic seaside resort town since the 1960s, Kep is synonymous with its iconic Crab Market, where fishermen pull bamboo traps directly from the sea to prepare blue swimmer crab fried rice, grilled prawns, and seafood noodle soup.',
    historyZh:
      '白马自20世纪60年代以来便是著名的海滨度假胜地，白马螃蟹市场以现捕现做的鲜活蓝花蟹炒饭、椒盐炭烤海虾、青口贝及白马海鲜汤粉闻名遐迩。',
    whereToFindKh: 'ផ្សារក្តាមខេត្តកែប ឆ្នេរកែប និងកោះទន្សាយ ខេត្តកែប',
    whereToFindEn: 'Kep Crab Market (Phsar Kdam), Kep Beach Promenade & Koh Tonsay Pier, Kep',
    whereToFindZh: '白马螃蟹市场 (Kep Crab Market)、白马海滩步道及兔子岛码头',
    signatureDishIds: ['food-25', 'food-162', 'food-43', 'food-149', 'food-167', 'food-23', 'food-125', 'food-159'],
  },
  {
    id: 'sihanoukville',
    kh: 'ព្រះសីហនុ',
    fullKh: 'ខេត្តព្រះសីហនុ',
    en: 'Sihanoukville',
    zh: '西哈努克港',
    region: 'coastal',
    lat: 10.6275,
    lng: 103.5221,
    culinaryTitleKh: 'គ្រឿងសមុទ្រស្រស់ឆ្នេរអូរឈើទាល ភ្លាបង្គាសមុទ្រ និងនំបញ្ចុកទឹកត្រីផ្អែម',
    culinaryTitleEn: 'Oceanfront Fresh Prawns, Spicy Basil Squid & Coastal Khmer Noodles',
    culinaryTitleZh: '西哈努克海滨鲜虾、圣罗勒炒鱿鱼、苦瓜生虾沙拉与海滨风味小吃',
    historyKh:
      'ខេត្តព្រះសីហនុ សម្បូរទៅដោយធនធានសមុទ្រទឹកជ្រៅ និងកោះធម្មជាតិ។ ម្ហូបប្រចាំតំបន់រួមមានភ្លាបង្គាស្រស់ ឆាក្តៅមឹកម្ទេសម្រះព្រៅ គុយទាវឆាគ្រឿងសមុទ្រ និងដូងក្រអូបត្រជាក់តាមឆ្នេរខ្សាច់។',
    historyEn:
      'Blessed with deep-water ocean fisheries and tropical islands, Preah Sihanouk’s coastal cuisine celebrates ultra-fresh ocean prawns, wok-seared holy basil squid, lime-cured shrimp ceviche, and chilled fragrant young coconuts by the beach.',
    historyZh:
      '西哈努克省拥有丰富的深海渔业资源与海岛风光，当地美食主打现捕海虾、九层塔爆炒鲜鱿、青柠苦瓜生虾刺生以及海滩冰镇芳香椰子。',
    whereToFindKh: 'ឆ្នេរអូរឈើទាល ឆ្នេរអូត្រេះ ផ្សារលើ និងកោះរ៉ុង ខេត្តព្រះសីហនុ',
    whereToFindEn: 'Ochheuteal Beach, Otres Beach, Phsar Leu Market & Koh Rong Island, Preah Sihanouk',
    whereToFindZh: '奥彻迭海滩、奥特斯海滩、西港上市场 (Phsar Leu) 及高龙岛',
    signatureDishIds: ['food-67', 'food-68', 'food-144', 'food-151', 'food-163', 'food-197', 'food-84', 'food-182'],
  },
  {
    id: 'koh_kong',
    kh: 'កោះកុង',
    fullKh: 'ខេត្តកោះកុង',
    en: 'Koh Kong',
    zh: '国公',
    region: 'coastal',
    lat: 11.6153,
    lng: 102.9838,
    culinaryTitleKh: 'មឹកអាំងទឹកត្រីកោះកុង បាញ់កាញ់ទឹកខ្ទិះ និងបុកល្ហុងក្តាមប្រៃមាត់ព្រែក',
    culinaryTitleEn: 'Grilled Squid with Signature Koh Kong Chili-Lime Sauce & Mangrove Seafood',
    culinaryTitleZh: '国公秘制酸辣海鲜蘸酱烤鱿鱼、椰汁粗米粉与红树林海鲜',
    historyKh:
      'ខេត្តកោះកុង ល្បីល្បាញទូទាំងប្រទេសលើរូបមន្ត «ទឹកត្រីកោះកុង» ដែលមានរសជាតិជូរ ហឹរ ផ្អែម និងឈ្ងុយខ្ទឹមស ជីរវ៉ាន់ស៊ុយ សម្រាប់ជ្រលក់ជាមួយមឹកអាំង ត្រីបំពង និងគ្រឿងសមុទ្រព្រៃកោងកាង។',
    historyEn:
      'Nestled between the Cardamom Mountains and mangrove estuaries, Koh Kong created Cambodia’s iconic “Teuk Trei Koh Kong” (garlic-chili-lime seafood dipping sauce), paired with charcoal-grilled squid, Banh Kanh coconut noodles, and crab papaya salad.',
    historyZh:
      '国公省背靠豆蔻山脉、面朝红树林海湾，创造了风靡全柬的“国公酸辣蒜香海鲜蘸酱”，搭配炭烤整鱿鱼、椰奶粗米粉及咸蟹木瓜沙拉最为地道。',
    whereToFindKh: 'មាត់ព្រែកកោះប៉ោ ផ្សារដងទង់ និងតំបន់ព្រៃកោងកាងពាមក្រសោប ខេត្តកោះកុង',
    whereToFindEn: 'Koh Pao Riverfront, Dong Tong Market & Peam Krasop Mangrove Eco-Area, Koh Kong',
    whereToFindZh: '国公河畔步道、东通市场 (Dong Tong Market) 及红树林生态区',
    signatureDishIds: ['food-121', 'food-54', 'food-153', 'food-156', 'food-59', 'food-166', 'food-183', 'food-200'],
  },
  {
    id: 'mondulkiri',
    kh: 'មណ្ឌលគិរី',
    fullKh: 'ខេត្តមណ្ឌលគិរី',
    en: 'Mondulkiri',
    zh: '蒙多基里',
    region: 'highlands',
    lat: 12.4558,
    lng: 107.1881,
    culinaryTitleKh: 'សម្លម្ជូរព្រៃ ទំពាំងភ្នំ សាច់អាំងទឹកឃ្មុំព្រៃ និងទឹកក្រឡុកផ្លែបឺរមណ្ឌលគិរី',
    culinaryTitleEn: 'Highland Forest Sour Soup, Bamboo Shoots, Wild Honey Roast & Mondulkiri Avocado',
    culinaryTitleZh: '蒙多基里高山森林酸汤、野生竹笋、野蜂蜜烤肉与高山牛油果奶昔',
    historyKh:
      'ខេត្តមណ្ឌលគិរី មានអាកាសធាតុត្រជាក់ និងដីក្រហមមានជីជាតិខ្ពស់។ ម្ហូបប្រពៃណីនៅទីនេះប្រើប្រាស់បន្លែព្រៃ ទំពាំងភ្នំ ស្លឹកថ្នឹង ទឹកឃ្មុំព្រៃធម្មជាតិ កាហ្វេ និងផ្លែបឺរមណ្ឌលគិរីសាច់ស្អិតឈ្ងុយ។',
    historyEn:
      'Set across cool pine-and-grassland highlands, Mondulkiri’s cuisine draws from indigenous Bunong traditions and fertile volcanic red soil: wild forest sour soups, mountain bamboo shoots, wild forest honey roasts, and creamy highland avocados.',
    historyZh:
      '蒙多基里高原气候凉爽、火山红土肥沃，融合了普农族原住民传统山野风味，特色包括高山森林酸汤、鲜嫩山笋、纯天然野蜂蜜烤肉与蒙多基里牛油果。',
    whereToFindKh: 'ក្រុងសែនមនោរម្យ ទឹកជ្រោះប៊ូស្រា និងចម្ការកាហ្វេ-ផ្លែបឺរ ខេត្តមណ្ឌលគិរី',
    whereToFindEn: 'Sen Monorom Town, Bousra Waterfall Eco-Village & Highland Plantations, Mondulkiri',
    whereToFindZh: '森莫诺隆市中心、布斯拉瀑布生态村及蒙多基里高山咖啡牛油果庄园',
    signatureDishIds: ['food-101', 'food-196', 'food-198', 'food-10', 'food-24', 'food-58', 'food-115', 'food-185'],
  },
  {
    id: 'ratanakiri',
    kh: 'រតនគិរី',
    fullKh: 'ខេត្តរតនគិរី',
    en: 'Ratanakiri',
    zh: '腊塔纳基里',
    region: 'highlands',
    lat: 13.7394,
    lng: 106.9872,
    culinaryTitleKh: 'សម្លព្រៃទំពាំងត្រាំ ភ្លាសាច់គោ សាច់គោអាំងទឹកប្រហុក និងបាយដំណើបសាច់ងៀត',
    culinaryTitleEn: 'Highland Pickled Bamboo Stew, Lime-Cured Beef Salad & Charcoal Prahok Beef',
    culinaryTitleZh: '腊塔纳基里高山酸笋鱼汤、青柠生拌牛肉、炭烤牛肉配鱼酱与糯米牛肉干',
    historyKh:
      'ខេត្តរតនគិរី ល្បីល្បាញដោយសារមុខម្ហូបតំបន់ខ្ពង់រាបភាគឦសាន ដែលប្រើប្រាស់ទំពាំងព្រៃ ត្រីឆ្អើរ ស្លឹកម្រះព្រៅព្រៃ ភ្លាសាច់គោ និងសាច់គោអាំងជ្រលក់ទឹកប្រហុកដ៏ឈ្ងុយឆ្ងាញ់។',
    historyEn:
      'In Cambodia’s far northeast highlands, Ratanakiri is renowned for bold highland flavors combining wild herbs, pickled bamboo shoots, smoked river fish, lime-cured beef ceviche (Pleah Sach Ko), and smoky grilled beef with prahok.',
    historyZh:
      '位于柬埔寨东北部高原的腊塔纳基里以浓郁的山林风味著称，常见食材有野生酸笋、烟熏河鱼、山林罗勒、青柠生拌牛肉以及炭火烤牛肉配传统鱼酱。',
    whereToFindKh: 'ក្រុងបានលុង បឹងយក្សឡោម និងផ្សារបានលុង ខេត្តរតនគិរី',
    whereToFindEn: 'Banlung Town, Yeak Laom Volcanic Lake & Banlung Central Market, Ratanakiri',
    whereToFindZh: '邦隆市中心、夜萝姆火山湖景区及邦隆中央市场',
    signatureDishIds: ['food-106', 'food-7', 'food-19', 'food-31', 'food-72', 'food-120', 'food-132', 'food-175'],
  },
  {
    id: 'kampong_cham',
    kh: 'កំពង់ចាម',
    fullKh: 'ខេត្តកំពង់ចាម',
    en: 'Kampong Cham',
    zh: '磅湛',
    region: 'mekong',
    lat: 11.9934,
    lng: 105.4635,
    culinaryTitleKh: 'សម្លការីសារ៉ាម៉ាន់ នំអន្សមជ្រូក-ចេក គុយទាវខគោ និងបង្អែមចេកខ្ទិះ',
    culinaryTitleEn: 'Mekong Saraman Beef Curry, Traditional Num Ansom & Coconut Banana Desserts',
    culinaryTitleZh: '湄公河畔萨拉曼咖喱牛肉、传统高棉肉粽/香蕉粽与椰奶香蕉甜汤',
    historyKh:
      'ខេត្តកំពង់ចាម ស្ថិតនៅតាមដងទន្លេមេគង្គ សម្បូរទៅដោយចម្ការចេក ដូង និងគ្រឿងទេស។ ម្ហូបល្បីប្រចាំខេត្តរួមមានសម្លការីសារ៉ាម៉ាន់សាច់គោ នំអន្សមជ្រូក នំអន្សមចេក និងបង្អែមចេកខ្ទិះដូងដើម។',
    historyEn:
      'Stretching along the fertile banks of the Mekong River, Kampong Cham is famed for rich aromatic curries like Royal Saraman Beef Curry, banana-grove desserts (Chek Ktis), and festive sticky rice cakes (Num Ansom).',
    historyZh:
      '磅湛坐落于肥沃的湄公河两岸，盛产芭蕉、椰子与香料，代表美食有香气浓郁的萨拉曼咖喱牛肉、红烧牛腩粿条、传统芭蕉叶肉粽及椰汁炖香蕉。',
    whereToFindKh: 'មាត់ទន្លេកំពង់ចាម ស្ពានឫស្សីកោះប៉ែន និងផ្សារធំកំពង់ចាម ខេត្តកំពង់ចាម',
    whereToFindEn: 'Kampong Cham Mekong Riverfront, Koh Paen Bamboo Bridge & Boeng Kok Market, Kampong Cham',
    whereToFindZh: '磅湛湄公河畔大道、竹桥渡口及磅湛中央市场',
    signatureDishIds: ['food-16', 'food-39', 'food-46', 'food-91', 'food-187', 'food-48', 'food-186', 'food-100'],
  },
  {
    id: 'kampong_thom',
    kh: 'កំពង់ធំ',
    fullKh: 'ខេត្តកំពង់ធំ',
    en: 'Kampong Thom',
    zh: '磅同',
    region: 'tonle_sap',
    lat: 12.7111,
    lng: 104.8887,
    culinaryTitleKh: 'សម្លកកូរខ្មែរ អំបុកកំពង់ធំ ប្រហុកអាំងស្លឹកចេក និងឆាគ្រឿងអន្ទង់',
    culinaryTitleEn: 'Authentic Samlor Korko, Kampong Thom Ambok Flattened Rice & Spicy Kroeung Eel',
    culinaryTitleZh: '正宗高棉百蔬浓汤 (Samlor Korko)、磅同扁米、芭蕉叶烤鱼酱与香茅炒鳝鱼',
    historyKh:
      'ខេត្តកំពង់ធំ ស្ថិតនៅចំកណ្តាលប្រទេសកម្ពុជា និងជាប់បឹងទន្លេសាប ល្បីល្បាញខ្លាំងលើ «អំបុកកំពង់ធំ» សម្លកកូរខ្មែរគ្រប់មុខ ប្រហុកកប់ស្លឹកចេកអាំង កង្កែបបោក និងឆាគ្រឿងអន្ទង់ស្រែ។',
    historyEn:
      'Located at the geographic heart of Cambodia bordering the Tonle Sap floodplains, Kampong Thom is celebrated for crispy newly-harvested Ambok flattened rice, heritage Samlor Korko stew, banana-leaf roasted prahok, and spicy Kroeung freshwater eel.',
    historyZh:
      '磅同位于柬埔寨地理中心并毗邻洞里萨湖泛滥平原，以新谷舂制的“磅同扁米 (Ambok)”、国菜高棉百蔬浓汤、芭蕉叶炭烤鱼酱及香茅圣罗勒炒田鳝著称。',
    whereToFindKh: 'មាត់ស្ទឹងសែន ផ្សារស្ទឹងសែន និងតំបន់ប្រាសាទសំបូរព្រៃគុក ខេត្តកំពង់ធំ',
    whereToFindEn: 'Stung Sen Riverfront, Kampong Thom Market & Sambor Prei Kuk Heritage Area, Kampong Thom',
    whereToFindZh: '森河河畔、磅同中心市场及三波坡雷古世界遗产景区周边',
    signatureDishIds: ['food-2', 'food-18', 'food-34', 'food-79', 'food-98', 'food-119', 'food-143', 'food-169'],
  },
  {
    id: 'kampong_chhnang',
    kh: 'កំពង់ឆ្នាំង',
    fullKh: 'ខេត្តកំពង់ឆ្នាំង',
    en: 'Kampong Chhnang',
    zh: '磅清扬',
    region: 'tonle_sap',
    lat: 12.25,
    lng: 104.6667,
    culinaryTitleKh: 'ត្រីរ៉ស់ទន្លេសាបដុតអំបិល សម្លប្រហើរត្រីរ៉ស់ បបរត្រីខ្ញី និងត្រីងៀតអាំង',
    culinaryTitleEn: 'Tonle Sap Snakehead Fish Soup, Salt-Crusted Grilled Fish & Sun-Dried Fish',
    culinaryTitleZh: '洞里萨湖生鱼香草浓汤、盐焗烤黑鱼、鲜姜鱼片粥与炭烤鱼干',
    historyKh:
      'ខេត្តកំពង់ឆ្នាំង គឺជាមជ្ឈមណ្ឌលនេសាទត្រីទឹកសាបដ៏ធំបំផុតតាមដងទន្លេសាប និងល្បីខាងក្អមឆ្នាំងដី។ ម្ហូបប្រចាំខេត្តគឺផ្តោតលើត្រីរ៉ស់ស្រស់ៗ ដូចជាសម្លប្រហើរត្រីរ៉ស់ ស្ងោរជ្រក់ត្រីរ៉ស់ ត្រីរ៉ស់ដុតអំបិល និងត្រីងៀតទន្លេសាប។',
    historyEn:
      'Famed for traditional clay pottery and floating fishing villages on the Tonle Sap River, Kampong Chhnang is Cambodia’s premier freshwater fish capital—serving herbal Samlor Proher, salt-crusted grilled snakehead fish, and sun-dried river fish.',
    historyZh:
      '磅清扬以传统红陶工艺和洞里萨河水上渔村闻名，是柬埔寨最重要的淡水鱼产地，招牌菜有香草生鱼汤、盐焗烤生鱼、姜丝鱼粥及酸角酱炭烤鱼干。',
    whereToFindKh: 'ផ្សារលើកំពង់ឆ្នាំង កំពង់ផែផ្សារក្រោម (ភូមិបណ្តែតទឹក) ខេត្តកំពង់ឆ្នាំង',
    whereToFindEn: 'Phsar Leu Market, Phsar Krom Tonle Sap Pier & Floating Village Eateries, Kampong Chhnang',
    whereToFindZh: '磅清扬上市场、下市场码头及洞里萨河水上渔村餐馆',
    signatureDishIds: ['food-5', 'food-17', 'food-20', 'food-33', 'food-89', 'food-117', 'food-127', 'food-170'],
  },
  {
    id: 'kampong_speu',
    kh: 'កំពង់ស្ពឺ',
    fullKh: 'ខេត្តកំពង់ស្ពឺ',
    en: 'Kampong Speu',
    zh: '磅士卑',
    region: 'central',
    lat: 11.4533,
    lng: 104.5208,
    culinaryTitleKh: 'ម្ហូបស្ករត្នោតកំពង់ស្ពឺ សម្លកកូរត្នោត ទឹកត្នោតផ្អែម និងនំផ្លែអាយស្ករត្នោត',
    culinaryTitleEn: 'GI Kampong Speu Palm Sugar Delicacies, Ripe Palm Fruit Stew & Toddy Palm Nectar',
    culinaryTitleZh: '地理标志磅士卑棕榈糖名菜、熟棕榈果炖五花肉、鲜甜棕榈汁与爆浆汤圆',
    historyKh:
      'ខេត្តកំពង់ស្ពឺ គឺជាទឹកដីនៃដើមត្នោត និង «ស្ករត្នោតកំពង់ស្ពឺ» ដែលទទួលស្គាល់សម្គាល់ភូមិសាស្ត្រ (GI)។ ម្ហូបប្រចាំខេត្តប្រើប្រាស់ផ្លែត្នោតទុំ ទឹកត្នោតផ្អែម និងស្ករត្នោតក្រអូប ដូចជាសម្លកកូរត្នោត ខជើងជ្រូកស្ករត្នោត និងនំផ្លែអាយ។',
    historyEn:
      'Home to Cambodia’s national sugar palm trees and Geographical Indication (GI) Kampong Speu Palm Sugar, this province crafts unique palm-infused dishes: Samlor Korko Tnot (ripe palm fruit stew), palm-caramelized pork, and molten palm-sugar dumplings.',
    historyZh:
      '磅士卑是柬埔寨国树糖棕之乡，出产国家地理标志 (GI) 磅士卑棕榈糖，代表美食包括熟棕榈果炖肉汤、棕榈糖红烧猪蹄、棕榈果西米露及爆浆棕榈糖汤圆。',
    whereToFindKh: 'ស្រុកឧដុង្គ ស្រុកសំរោងទង និងតាមបណ្តោយផ្លូវជាតិលេខ ៤ (ឧទ្យានជាតិគិរីរម្យ) ខេត្តកំពង់ស្ពឺ',
    whereToFindEn: 'Oudong District, Samraong Tong Palm Groves & Kirirom Foothills along NH4, Kampong Speu',
    whereToFindZh: '乌栋古都区、森隆通糖棕林带及4号公路基里隆国家公园沿线',
    signatureDishIds: ['food-44', 'food-92', 'food-93', 'food-94', 'food-107', 'food-123', 'food-140', 'food-195'],
  },
  {
    id: 'takeo',
    kh: 'តាកែវ',
    fullKh: 'ខេត្តតាកែវ',
    en: 'Takeo',
    zh: '茶胶',
    region: 'central',
    lat: 10.9908,
    lng: 104.785,
    culinaryTitleKh: 'បង្គាទន្លេតាកែវអាំង ខសាច់ជ្រូកពងទា ទាអាំង និងសម្លការីទាស្រែ',
    culinaryTitleEn: 'Takeo Giant Freshwater Prawns, Braised Duck Egg Stew & Country Duck Curry',
    culinaryTitleZh: '茶胶大头河虾、茶胶咸蛋肉饼、乡村红咖喱鸭与卤蛋红烧肉',
    historyKh:
      'ខេត្តតាកែវ ជាទឹកដីអរិយធម៌ហ្វូណនបុរាណ ដែលសម្បូរទៅដោយបឹងបួរ និងវាលស្រែ។ មុខម្ហូបល្បីបំផុតគឺ «បង្គាទឹកសាបតាកែវ» ពងទាប្រៃ-ពងទាកូនតាកែវ សម្លការីទាស្រែ និងខសាច់ជ្រូកពងទា។',
    historyEn:
      'Known as the “Cradle of Khmer Civilization,” Takeo’s flooded plains yield prized giant freshwater prawns, free-range country ducks, and famous Takeo duck eggs—featured in grilled river prawns, country duck curry, and caramelized pork-and-egg stew.',
    historyZh:
      '茶胶省被称为“高棉文明摇篮”，湖泊湿地盛产硕大的茶胶淡水大头虾、散养水鸭与优质鸭蛋，招牌菜有炭烤茶胶大头虾、青蕉红咖喱水鸭及咸蛋蒸肉饼。',
    whereToFindKh: 'មាត់បឹងតាកែវ ក្រុងដូនកែវ និងតំបន់ភ្នំដា-អង្គរបុរី ខេត្តតាកែវ',
    whereToFindEn: 'Takeo Lakefront (Doun Kaev), Phsar Takeo & Angkor Borei / Phnom Da area, Takeo',
    whereToFindZh: '茶胶湖畔长廊 (敦胶市)、茶胶市场及吴哥博雷古迹区周边',
    signatureDishIds: ['food-122', 'food-8', 'food-57', 'food-129', 'food-174', 'food-184', 'food-188', 'food-191'],
  },
  {
    id: 'kratie',
    kh: 'ក្រចេះ',
    fullKh: 'ខេត្តក្រចេះ',
    en: 'Kratie',
    zh: '桔井',
    region: 'mekong',
    lat: 12.4881,
    lng: 106.0188,
    culinaryTitleKh: 'សម្លម្ជូរត្រីសណ្តាយទន្លេមេគង្គ ខប្រហុកត្រីពោធិ៍ និងញាំស្តៅត្រីឆ្អើរ',
    culinaryTitleEn: 'Mekong Sanday & Pangasius River Fish Stews, Smoked Fish Salad & Corn Pudding',
    culinaryTitleZh: '桔井湄公河鲶鱼酸汤、鱼酱炖湄公鱼、苦楝花烟熏鱼沙拉与甜玉米椰奶羹',
    historyKh:
      'ខេត្តក្រចេះ ស្ថិតនៅតាមដងទន្លេមេគង្គលើ ជាជម្រកផ្សោតទឹកសាប និងត្រីទន្លេធំៗដូចជាត្រីសណ្តាយ និងត្រីពោធិ៍។ ម្ហូបប្រចាំខេត្តរួមមានសម្លម្ជូរត្រីសណ្តាយ ខប្រហុកត្រីពោធិ៍ ញាំស្តៅត្រីឆ្អើរ និងបង្អែមពោតកោះទ្រង់។',
    historyEn:
      'Along the upper Mekong River where Irrawaddy dolphins swim, Kratie is renowned for prized Mekong catfishes (Sanday and Pangasius), smoky river fish salads tossed with bitter neem blossoms or green mango, and sweet Koh Trong island corn pudding.',
    historyZh:
      '桔井地处上湄公河伊洛瓦底江豚栖息地，盛产肥美的湄公河鲶鱼与巴沙鱼，代表菜品包括湄公河鲶鱼酸汤、鱼酱焖巴沙鱼、苦楝花烟熏鱼沙拉及笼岛甜玉米羹。',
    whereToFindKh: 'មាត់ទន្លេក្រចេះ អន្លង់ផ្សោតកាំពី និងកោះទ្រង់ ខេត្តក្រចេះ',
    whereToFindEn: 'Kratie Mekong Promenade, Kampi Dolphin Pool Riverside & Koh Trong Island, Kratie',
    whereToFindZh: '桔井湄公河滨江大道、甘比江豚观赏区河畔及笼岛 (Koh Trong)',
    signatureDishIds: ['food-9', 'food-112', 'food-146', 'food-32', 'food-77', 'food-110', 'food-152', 'food-95'],
  },
  {
    id: 'pailin',
    kh: 'ប៉ៃលិន',
    fullKh: 'ខេត្តប៉ៃលិន',
    en: 'Pailin',
    zh: '拜林',
    region: 'tonle_sap',
    lat: 12.8489,
    lng: 102.6093,
    culinaryTitleKh: 'ឆាក្តៅសាច់មាន់ស្លឹកកន្ទួត សម្លខ្ទិះម្នាស់ ញាំត្រយូងចេក និងបង្អែមបាញ់ចានឿក',
    culinaryTitleEn: 'Cardamom Foothills Cha Kdao Chicken, Pineapple Coconut Curry & Banana Blossom Salad',
    culinaryTitleZh: '拜林山麓香茅辣炒土鸡、菠萝椰奶咖喱、香蕉花沙拉与姜汁汤圆',
    historyKh:
      'ខេត្តប៉ៃលិន ស្ថិតនៅជើងភ្នំក្រវាញ ល្បីខាងផ្លែឈើតំបន់ភ្នំ និងម្ហូបកូឡា-ខ្មែរ។ មុខម្ហូបប្រចាំតំបន់មានឆាក្តៅសាច់មាន់ស្រែស្លឹកកន្ទួត សម្លខ្ទិះម្នាស់ ញាំត្រយូងចេកព្រៃ និងបង្អែមបាញ់ចានឿកខ្ទិះដូងខ្ញី។',
    historyEn:
      'Tucked in the gem-rich foothills of the Cardamom Mountains, Pailin blends orchard-fresh tropical fruits and wild herbs into dishes like spicy Cha Kdao chicken with gooseberry leaves, pineapple coconut curry, and wild banana blossom salads.',
    historyZh:
      '拜林坐落于盛产宝石与热带水果的豆蔻山麓，当地饮食巧妙融合果香与山野香草，代表菜有香茅辣炒走地鸡、菠萝椰汁炖肉、山芭蕉花沙拉及姜糖椰奶汤圆。',
    whereToFindKh: 'ផ្សារប៉ាហ៊ី ជើងភ្នំយ៉ាត និងរមណីយដ្ឋានទឹកធ្លាក់ភ្នំខៀវ ខេត្តប៉ៃលិន',
    whereToFindEn: 'Phsar Pahi Market, Phnom Yat Cultural Hill & Phnom Khiev Waterfall Area, Pailin',
    whereToFindZh: '拜林帕希市场 (Phsar Pahi)、雅山文化景区及青山瀑布周边餐馆',
    signatureDishIds: ['food-28', 'food-102', 'food-113', 'food-131', 'food-147', 'food-148', 'food-189', 'food-192'],
  },
  {
    id: 'pursat',
    kh: 'ពោធិ៍សាត់',
    fullKh: 'ខេត្តពោធិ៍សាត់',
    en: 'Pursat',
    zh: '菩萨',
    region: 'tonle_sap',
    lat: 12.5388,
    lng: 103.9192,
    culinaryTitleKh: 'ត្រីឆ្អើរកំពង់ហ្លួង សម្លម្ជូរទំពាំងត្រីឆ្អើរ ត្រីផ្ទក់អាំង និងឆាខ្ញីត្រីរ៉ស់',
    culinaryTitleEn: 'Kampong Luong Smoked Fish Soup, Grilled Giant Snakehead & Ginger Fish Stir-Fry',
    culinaryTitleZh: '贡邦鲁水上村烟熏鱼竹笋汤、炭烤巨型黑鱼、豆豉姜丝炒鱼与芒果糯米饭',
    historyKh:
      'ខេត្តពោធិ៍សាត់ មានទាំងតំបន់ភ្នំក្រវាញ និងភូមិបណ្តែតទឹកកំពង់ហ្លួងលើបឹងទន្លេសាប។ ម្ហូបល្បីប្រចាំខេត្តគឺត្រីឆ្អើរកំពង់ហ្លួង យកមកស្លម្ជូរទំពាំង ត្រីផ្ទក់អាំងអំបិលម្ទេស ឆាខ្ញីត្រីរ៉ស់ និងបាយដំណើបស្វាយទុំ។',
    historyEn:
      'Spanning from the Cardamom peaks to the floating town of Kampong Luong on Tonle Sap Lake, Pursat is celebrated for aromatic hardwood-smoked fish (Trei Chha-eur), grilled giant snakehead, ginger-braised fish, and sweet mango sticky rice.',
    historyZh:
      '菩萨省横跨豆蔻山脉与洞里萨湖贡邦鲁水上村落，以果木慢熏的“贡邦鲁烟熏鱼”、鲜笋烟熏鱼酸汤、椒盐炭烤黑鱼及香甜芒果糯米饭闻名。',
    whereToFindKh: 'មាត់ស្ទឹងពោធិ៍សាត់ ភូមិបណ្តែតទឹកកំពង់ហ្លួង និងស្រុកវាលវែង ខេត្តពោធិ៍សាត់',
    whereToFindEn: 'Pursat Riverbank Market, Kampong Luong Floating Town & Veal Veng Highlands, Pursat',
    whereToFindZh: '菩萨河畔夜市、贡邦鲁水上渔村及维旺高山景区',
    signatureDishIds: ['food-53', 'food-65', 'food-74', 'food-103', 'food-133', 'food-142', 'food-190', 'food-90'],
  },
  {
    id: 'preah_vihear',
    kh: 'ព្រះវិហារ',
    fullKh: 'ខេត្តព្រះវិហារ',
    en: 'Preah Vihear',
    zh: '柏威夏',
    region: 'highlands',
    lat: 13.8073,
    lng: 104.9805,
    culinaryTitleKh: 'សម្លម្ជូរគ្រឿងសាច់គោ ស្ងោរជ្រក់មាន់ស្រែ និងបាយមាន់ស្ងោរទឹកត្រីខ្ញី',
    culinaryTitleEn: 'Northern Highland Beef Machu Kroeung, Lemongrass Country Chicken & Herbal Grills',
    culinaryTitleZh: '柏威夏高原香茅酸汤牛肉、柠檬香草炖走地鸡与姜汁白切土鸡饭',
    historyKh:
      'ខេត្តព្រះវិហារ ជាតំបន់ខ្ពង់រាបជួរភ្នំដងរែក និងប្រាសាទបេតិកភណ្ឌពិភពលោក។ ម្ហូបប្រចាំតំបន់មានរសជាតិដិតឈ្ងុយគ្រឿងស្លឹកគ្រៃ រមៀត និងស្លឹកក្រូចសើច ដូចជាសម្លម្ជូរគ្រឿងសាច់គោ ស្ងោរជ្រក់មាន់ស្រែ និងស្លាបមាន់អាំងគ្រឿង។',
    historyEn:
      'Home to the cliffside UNESCO temples of Preah Vihear and Koh Ker along the Dângrêk Mountains, local cuisine features hearty lemongrass-turmeric Kroeung beef sour soups, free-range country chicken broths, and herbal charcoal grills.',
    historyZh:
      '柏威夏省拥有扁担山脉悬崖上的柏威夏寺与贡开古迹群，当地菜肴讲究浓郁的香茅、姜黄与柠檬叶香气，代表菜有高棉香茅酸汤牛肉与柠檬草炖走地鸡。',
    whereToFindKh: 'ក្រុងព្រះវិហារ ផ្លូវឡើងប្រាសាទព្រះវិហារ (ស្រអែម) និងតំបន់ប្រាសាទកោះកេរ ខេត្តព្រះវិហារ',
    whereToFindEn: 'Preah Vihear Town (Tbeng Meanchey), Sra Aem Temple Gateway & Koh Ker Area, Preah Vihear',
    whereToFindZh: '柏威夏市 (Tbeng Meanchey)、斯拉艾姆景区入口及贡开古寺周边餐厅',
    signatureDishIds: ['food-3', 'food-13', 'food-14', 'food-60', 'food-75', 'food-111', 'food-126', 'food-172'],
  },
  {
    id: 'banteay_meanchey',
    kh: 'បន្ទាយមានជ័យ',
    fullKh: 'ខេត្តបន្ទាយមានជ័យ',
    en: 'Banteay Meanchey',
    zh: '班迭棉吉',
    region: 'tonle_sap',
    lat: 13.5859,
    lng: 102.9737,
    culinaryTitleKh: 'មីឆាសាច់គោពងទាចៀន បាយឆាឡុកឡាក់ ប្រហិតសាច់គោអាំង និងមីគោកសាស៊ីវ',
    culinaryTitleEn: 'Sisophon Wok-Fried Noodles, Grilled Beef Meatball Skewers & Lok Lak Fried Rice',
    culinaryTitleZh: '诗梳风锅气炒面、摇滚牛肉炒饭、炭烤牛肉丸串与叉烧脆云吞干拌面',
    historyKh:
      'ខេត្តបន្ទាយមានជ័យ ជាមជ្ឈមណ្ឌលពាណិជ្ជកម្មភាគពាយ័ព្យដែលមានវប្បធម៌អាហារតាមផ្លូវ និងផ្សាររាត្រីដ៏រស់រវើក ល្បីលើមីឆាសាច់គោពងទាចៀន ប្រហិតសាច់គោអាំងទឹកជ្រលក់អំពិលទុំ មីគោកគាវបំពង និងបាយឆាឡុកឡាក់។',
    historyEn:
      'A lively northwestern crossroads centered on Sisophon, Banteay Meanchey is famed for high-heat wok dishes and vibrant evening street food: Khmer Mee Cha with crispy fried egg, grilled beef meatball skewers with tangy tamarind glaze, and dry wonton noodles.',
    historyZh:
      '班迭棉吉省首府诗梳风是柬埔寨西北部的交通与商贸重镇，夜市与街头美食极为丰富，以猛火快炒的高棉牛肉炒面、罗望子酱炭烤牛肉丸串及干拌云吞面著称。',
    whereToFindKh: 'ក្រុងសិរីសោភ័ណ ផ្សារសិរីសោភ័ណ និងតំបន់ប្រាសាទបន្ទាយឆ្មារ ខេត្តបន្ទាយមានជ័យ',
    whereToFindEn: 'Serei Saophoan (Sisophon) Night Market, Central Park & Banteay Chhmar Temple Area, Banteay Meanchey',
    whereToFindZh: '诗梳风夜市、中心公园美食街及班迭奇马寺古迹周边',
    signatureDishIds: ['food-40', 'food-41', 'food-61', 'food-85', 'food-86', 'food-87', 'food-161', 'food-180'],
  },
  {
    id: 'svay_rieng',
    kh: 'ស្វាយរៀង',
    fullKh: 'ខេត្តស្វាយរៀង',
    en: 'Svay Rieng',
    zh: '柴桢',
    region: 'central',
    lat: 11.0879,
    lng: 105.7993,
    culinaryTitleKh: 'សម្លម្ជូរក្តាមស្រែ ខ្យងស្រែអាំងអំបិលម្ទេស ត្រីអណ្តែងអាំង និងឆាក្តៅកង្កែបស្រែ',
    culinaryTitleEn: 'Paddy Crab Sour Soup, Grilled Field Snails, Catfish & Wok-Fried Farm Frog',
    culinaryTitleZh: '柴桢稻田蟹酸汤、椒盐炭烤田螺、青芒果酱烤鲶鱼与圣罗勒辣炒田鸡',
    historyKh:
      'ខេត្តស្វាយរៀង សម្បូរទៅដោយវាលស្រែធំល្វឹងល្វើយ និងស្ទឹងវ៉ៃគោ។ ម្ហូបប្រចាំខេត្តគឺជាម្ហូបស្រុកស្រែពិតៗ ដូចជាសម្លម្ជូរក្តាមស្រែជាមួយកញ្ឆែត ខ្យងស្រែអាំងអំបិលម្ទេស ត្រីអណ្តែងអាំងទឹកត្រីស្វាយខ្ចី និងឆាក្តៅកង្កែបស្រែ។',
    historyEn:
      'Surrounded by lush emerald rice paddies and the Vai Ko River, Svay Rieng specializes in authentic countryside paddy cuisine: rich field-crab sour soup with water mimosa, chili-salt grilled paddy snails, and charcoal-grilled catfish.',
    historyZh:
      '柴桢省拥有广袤的翠绿稻田与威哥河水系，原汁原味的田园美食是当地特色，包括水含羞草稻田蟹酸汤、椒盐炭烤大田螺、青芒果鱼露烤鲶鱼及辣炒田鸡。',
    whereToFindKh: 'មាត់ទន្លេវ៉ៃគោ ផ្សារវាលយន្ត និងក្រុងស្វាយរៀង ខេត្តស្វាយរៀង',
    whereToFindEn: 'Vai Ko Riverfront, Veal Yon Market & Svay Rieng Town Dining Street, Svay Rieng',
    whereToFindZh: '柴桢威哥河畔、维욘中央市场 (Veal Yon Market) 及柴桢市美食街',
    signatureDishIds: ['food-12', 'food-56', 'food-62', 'food-63', 'food-71', 'food-124', 'food-128', 'food-137'],
  },
  {
    id: 'prey_veng',
    kh: 'ព្រៃវែង',
    fullKh: 'ខេត្តព្រៃវែង',
    en: 'Prey Veng',
    zh: '波罗勉',
    region: 'mekong',
    lat: 11.4868,
    lng: 105.3253,
    culinaryTitleKh: 'ម៉ាំល្ហុងសាច់ជ្រូកបីជាន់ សម្លម្ជូរត្រីដៀប ឆាព្រលិត និងសម្លការីសាច់ត្រី',
    culinaryTitleEn: 'Prey Veng Fermented Fish Papaya (Mam), Water Lily Stem Stir-Fry & Floodplain Fish Soups',
    culinaryTitleZh: '波罗勉木瓜发酵鱼五花肉 (Mam)、清炒睡莲茎、嫩酸角叶鱼汤与椰汁红咖喱鱼',
    historyKh:
      'ខេត្តព្រៃវែង ជាតំបន់វាលទំនាបទន្លេមេគង្គក្រោមដែលសម្បូរត្រី និងបន្លែទឹក។ ម្ហូបល្បីប្រចាំខេត្តគឺ «ម៉ាំល្ហុងព្រៃវែង» ឆាព្រលិតបឹង សម្លម្ជូរត្រីដៀបត្រួយអំពិល សម្លម្ជូរទងល្ពៅ និងឆាត្រកួនប្រហុក។',
    historyEn:
      'Situated in the fertile lower Mekong floodplains, Prey Veng is famous across Cambodia for artisanal fermented fish with crunchy green papaya (Mam Prey Veng), crisp water-lily stem stir-fries, and seasonal floodplain fish sour soups.',
    historyZh:
      '波罗勉省位于富饶的下湄公河洪泛平原，以手工腌制的“波罗勉木瓜发酵鱼 (Mam)”享誉全国，此外还有清脆的睡莲茎小炒、南瓜藤鱼汤及鱼酱炒空心菜。',
    whereToFindKh: 'មាត់បឹងកំពង់ពពិល ផ្សារព្រៃវែង និងតំបន់អ្នកលឿង ខេត្តព្រៃវែង',
    whereToFindEn: 'Prey Veng Lakefront, Prey Veng Market & Neak Loeung Mekong Crossing Hub, Prey Veng',
    whereToFindZh: '波罗勉湖畔、波罗勉市场及乃良 (Neak Loeung) 湄公河大桥美食区',
    signatureDishIds: ['food-11', 'food-51', 'food-52', 'food-66', 'food-70', 'food-80', 'food-104', 'food-114'],
  },
  {
    id: 'kandal',
    kh: 'កណ្តាល',
    fullKh: 'ខេត្តកណ្តាល',
    en: 'Kandal',
    zh: '干丹',
    region: 'central',
    lat: 11.4833,
    lng: 104.95,
    culinaryTitleKh: 'នំបញ្ចុកសម្លការីសាច់មាន់ បបរគ្រឿងខ្មែរ នំគ្រក់ខ្ទិះដូង និងសម្លការីសាច់មាន់',
    culinaryTitleEn: 'Kandal Red Chicken Curry Noodles, Morning Babor Kroeung & Crispy Coconut Num Krok',
    culinaryTitleZh: '干丹省红咖喱鸡肉米粉、高棉传统香草猪肉鲜粥与香脆椰奶葱花小煎饼',
    historyKh:
      'ខេត្តកណ្តាល ព័ទ្ធជុំវិញរាជធានីភ្នំពេញ និងតាមដងទន្លេមេគង្គ-បាសាក់ ល្បីល្បាញខ្លាំងលើភូមិធ្វើនំបញ្ចុក សម្លការីសាច់មាន់ខ្មែរ សម្លណាំយ៉ា បបរគ្រឿងមាន់ស្រែ និងនំគ្រក់ខ្ទិះដូងក្តៅៗ។',
    historyEn:
      'Encircling Phnom Penh along the Mekong and Bassac rivers, Kandal’s riverside villages are famous for hand-pressed rice vermicelli served with rich red chicken curry or Nam Ya gravy, comforting Babor Kroeung congee, and cast-iron coconut Num Krok.',
    historyZh:
      '干丹省环绕金边并横跨湄公河与百色河，河畔村落世代制作手工鲜米粉，搭配浓郁的高棉红咖喱鸡或南雅鱼汤，以及清晨香草鲜粥和铁模椰奶煎饼。',
    whereToFindKh: 'មាត់ទន្លេតាខ្មៅ កោះឧកញ៉ាតី ស្រុកកៀនស្វាយ និងស្រុកពញាឮ ខេត្តកណ្តាល',
    whereToFindEn: 'Ta Khmau Riverfront, Koh Dach Silk Island, Kien Svay & Ponhea Lueu, Kandal',
    whereToFindZh: '大金欧河畔、丝绸岛 (Koh Dach)、见檖水上凉亭区及波尼亚吕区',
    signatureDishIds: ['food-4', 'food-42', 'food-76', 'food-81', 'food-88', 'food-99', 'food-157', 'food-177'],
  },
  {
    id: 'stung_treng',
    kh: 'ស្ទឹងត្រែង',
    fullKh: 'ខេត្តស្ទឹងត្រែង',
    en: 'Stung Treng',
    zh: '上丁',
    region: 'mekong',
    lat: 13.5259,
    lng: 105.9683,
    culinaryTitleKh: 'មីកូឡាស្ទឹងត្រែង សម្លង៉ាំង៉ូវមាន់ សម្លម្ជូរគ្រឿងពោះគោ និងបន្លែអាំងទឹកប្រហុក',
    culinaryTitleEn: 'Stung Treng Mee Kola Noodles, Pickled Lime Chicken Soup & Four-Rivers Specialties',
    culinaryTitleZh: '上丁传统歌拉拌面 (Mee Kola)、酸柑炖土鸡汤、牛肚香茅酸汤与四河交汇河鲜',
    historyKh:
      'ខេត្តស្ទឹងត្រែង គឺជាចំណុចប្រសព្វនៃទន្លេធំៗបួន (មេគង្គ សេកុង សេសាន និងស្រែពក)។ មុខម្ហូបល្បីប្រចាំខេត្តគឺ «មីកូឡាស្ទឹងត្រែង» សម្លស្ងោរង៉ាំង៉ូវសាច់មាន់ សម្លម្ជូរគ្រឿងពោះគោ និងសម្លម្ជូរត្រឡាចត្រីទន្លេ។',
    historyEn:
      'Where the Sekong, Sesan, and Srepok rivers meet the mighty Mekong, Stung Treng is home to signature steamed Mee Kola rice noodles with dried shrimp and peanut sauce, tangy Ngam Ngov pickled-lime chicken soup, and river fish broths.',
    historyZh:
      '上丁省位于湄公河、公河、桑河与斯雷博河四河交汇处，代表名菜是配虾米花生酱与腌菜的“上丁歌拉蒸米粉 (Mee Kola)”、陈年酸柑鸡汤及河鱼冬瓜酸汤。',
    whereToFindKh: 'មាត់ទន្លេសេកុង-មេគង្គ ផ្សារស្ទឹងត្រែង និងតំបន់ព្រះរំកិល ខេត្តស្ទឹងត្រែង',
    whereToFindEn: 'Sekong-Mekong Confluence Promenade, Stung Treng Market & Preah Rumkel Eco-Area, Stung Treng',
    whereToFindZh: '公河与湄公河交汇滨江步道、上丁市场及普雷伦基生态区',
    signatureDishIds: ['food-38', 'food-6', 'food-15', 'food-29', 'food-105', 'food-109', 'food-130', 'food-150'],
  },
  {
    id: 'tboung_khmum',
    kh: 'ត្បូងឃ្មុំ',
    fullKh: 'ខេត្តត្បូងឃ្មុំ',
    en: 'Tboung Khmum',
    zh: '特本克蒙',
    region: 'mekong',
    lat: 11.8891,
    lng: 105.654,
    culinaryTitleKh: 'ស្ងោរម្រះញាត់សាច់ជ្រូក ឆាត្រប់វែងសៀង ស្ងោរត្រឡាច និងទឹកអំពៅគាបក្រូចឆ្មារ',
    culinaryTitleEn: 'Stuffed Bitter Melon Broth, Soybean Braised Eggplant & Country Homestead Cooking',
    culinaryTitleZh: '特本克蒙酿苦瓜清汤、豆瓣肉末烧茄子、冬瓜肉丸汤与鲜榨青柠甘蔗汁',
    historyKh:
      'ខេត្តត្បូងឃ្មុំ មានដីក្រហមមានជីជាតិ សម្បូរទៅដោយដំណាំកសិកម្ម បន្លែគ្រប់មុខ និងចម្ការអំពៅ។ ម្ហូបប្រចាំតំបន់គឺជាម្ហូបគ្រួសារខ្មែរដ៏ឈ្ងុយឆ្ងាញ់ ដូចជាស្ងោរម្រះញាត់សាច់ជ្រូកមីសួរ ឆាត្រប់វែងសាច់ជ្រូកចិញ្ច្រាំ និងទឹកអំពៅស្រស់។',
    historyEn:
      'Known for fertile red-earth farmlands and sugarcane groves east of the Mekong, Tboung Khmum celebrates wholesome Khmer home cooking: clear pork broth with stuffed bitter melon rings, soybean-braised purple eggplant, and freshly pressed kumquat sugarcane juice.',
    historyZh:
      '特本克蒙省位于湄公河东岸肥沃的红土农业区，以地道温馨的高棉家常菜闻名，包括粉丝肉末酿苦瓜清汤、黄豆酱肉末烧紫茄、冬瓜肉末汤及鲜榨青柠甘蔗汁。',
    whereToFindKh: 'ក្រុងសួង ផ្សារសួង និងតំបន់ហ្លួងព្រះស្តេចកន ខេត្តត្បូងឃ្មុំ',
    whereToFindEn: 'Suong Town, Phsar Suong Market & Ponhea Krek / Memot Dining Hubs, Tboung Khmum',
    whereToFindZh: '苏翁市中心、苏翁市场 (Phsar Suong) 及棉末区传统餐馆',
    signatureDishIds: ['food-30', 'food-55', 'food-69', 'food-73', 'food-108', 'food-116', 'food-138', 'food-193'],
  },
  {
    id: 'oddar_meanchey',
    kh: 'ឧត្តរមានជ័យ',
    fullKh: 'ខេត្តឧត្តរមានជ័យ',
    en: 'Oddar Meanchey',
    zh: '奥多棉吉',
    region: 'highlands',
    lat: 14.1818,
    lng: 103.5176,
    culinaryTitleKh: 'ឆាផ្សិតអម្បោះសាច់មាន់ បាយឆាម្រះព្រៅសាច់គោ ឆាបន្លែគ្រប់មុខ និងទឹកសណ្តែកសៀងស្លឹកតយ',
    culinaryTitleEn: 'Northern Forest Mushroom Stir-Fries, Holy Basil Beef Rice & Stone-Ground Soy Milk',
    culinaryTitleZh: '奥多棉吉鲜菇炒鸡片、圣罗勒辣炒牛肉饭、什锦时蔬与班兰叶现磨热豆浆',
    historyKh:
      'ខេត្តឧត្តរមានជ័យ ស្ថិតនៅភាគខាងជើងជាប់ជួរភ្នំដងរែក សម្បូរទៅដោយផ្សិតធម្មជាតិ បន្លែស្រស់ និងសណ្តែកសៀង។ ម្ហូបប្រចាំតំបន់រួមមានឆាផ្សិតអម្បោះសាច់មាន់ ឆាណាំយ៉ាវផ្សិតភ្លៅមាន់ បាយឆាម្រះព្រៅសាច់គោ និងទឹកសណ្តែកសៀងស្លឹកតយ។',
    historyEn:
      'Bordering the forested Dângrêk range in northern Cambodia, Oddar Meanchey features hearty stir-fries of local mushrooms, farm-fresh seasonal vegetables, fiery holy-basil beef rice, and warm stone-ground pandan soy milk on cool mornings.',
    historyZh:
      '奥多棉吉省地处柬埔寨北部扁担山脉沿线，盛产山林菌菇、生态时蔬与优质大豆，特色美食包括鲜平菇炒鸡肉、腐乳杏鲍菇、九层塔牛肉煎蛋饭及清晨班兰热豆浆。',
    whereToFindKh: 'ក្រុងសំរោង ផ្សារសំរោង និងតំបន់អន្លង់វែង ខេត្តឧត្តរមានជ័យ',
    whereToFindEn: 'Samraong Town, Phsar Samraong Market & Anlong Veng Center, Oddar Meanchey',
    whereToFindZh: '森隆市中心、森隆市场 (Phsar Samraong) 及安隆汶中心街区',
    signatureDishIds: ['food-134', 'food-135', 'food-139', 'food-141', 'food-145', 'food-171', 'food-173', 'food-199'],
  },
];

// Build fast O(1) lookup from food.id -> province id
const DISH_ID_TO_PROVINCE_MAP = new Map<string, string>();
const PROVINCE_BY_ID_MAP = new Map<string, ProvinceFilterOption>();

for (const prov of DISH_PROVINCES) {
  PROVINCE_BY_ID_MAP.set(prov.id, prov);
  for (const fid of prov.signatureDishIds) {
    DISH_ID_TO_PROVINCE_MAP.set(fid, prov.id);
  }
}

const provinceCache = new Map<string, string | null>();

/**
 * Returns the authentic Cambodian province a dish belongs to across all 25 provinces.
 * First checks explicit dish ID mapping (covering food-1..food-200 without duplication),
 * then falls back to text matching on nameKh/nameEn/description.
 */
export function detectDishProvince(food: FoodItem): string | null {
  if (!food) return null;
  if (food.id && DISH_ID_TO_PROVINCE_MAP.has(food.id)) {
    return DISH_ID_TO_PROVINCE_MAP.get(food.id)!;
  }

  const key = `${food.id}|${food.nameKh}|${food.nameEn}`;
  if (provinceCache.has(key)) return provinceCache.get(key) ?? null;

  const textKh = `${food.nameKh || ''} ${food.descriptionKh || ''} ${food.provinceKh || ''}`;
  const textEn = `${food.nameEn || ''} ${food.descriptionEn || ''} ${food.provinceEn || ''}`;
  let found: string | null = null;
  for (const p of DISH_PROVINCES) {
    const re = new RegExp(`(^|[^A-Za-z])${p.en.replace(/ /g, '\\s+')}([^A-Za-z]|$)`, 'i');
    if (textKh.includes(p.kh) || re.test(textEn)) {
      found = p.id;
      break;
    }
  }
  provinceCache.set(key, found);
  return found;
}

export function getProvinceOptionById(provinceId: string | null | undefined): ProvinceFilterOption {
  if (provinceId && PROVINCE_BY_ID_MAP.has(provinceId)) {
    return PROVINCE_BY_ID_MAP.get(provinceId)!;
  }
  return DISH_PROVINCES[0];
}

export function getDishCulturalHistory(
  food: FoodItem,
  prov: ProvinceFilterOption,
  language: Language
): string {
  if (language === 'km') {
    return `មុខម្ហូបប្រពៃណីដ៏ល្បីល្បាញប្រចាំ${prov.fullKh} — ${prov.historyKh}`;
  }
  if (language === 'zh') {
    return `${prov.zh}传统代表美食 — ${prov.historyZh}`;
  }
  return `Signature regional dish of ${prov.en} — ${prov.historyEn}`;
}

const KHMER_DISH_SUBTOKENS = [
  'គុយទាវ',
  'នំបញ្ចុក',
  'លតឆា',
  'មីឆា',
  'មីស៊ុប',
  'មីសួរ',
  'អាម៉ុក',
  'ឡុកឡាក់',
  'សម្លកកូរ',
  'កកូរ',
  'សម្លម្ជូរ',
  'ម្ជូរគ្រឿង',
  'ម្ជូរព្រៃ',
  'ម្ជូរ',
  'សម្លការី',
  'ការី',
  'ប្រហុកខ្ទិះ',
  'ប្រហុក',
  'ទឹកគ្រឿង',
  'បាយសាច់ជ្រូក',
  'បាយមាន់',
  'បាយឆា',
  'បាយក្ដាំង',
  'បាយក្តាំង',
  'បាយ',
  'បបរ',
  'សាច់គោអាំង',
  'សាច់អាំង',
  'ឆ្អឹងជំនី',
  'មាន់ដុត',
  'មាន់អាំង',
  'ត្រីអាំង',
  'ត្រីបំពង',
  'ក្តាម',
  'ក្ដាម',
  'បង្គា',
  'បង្កង',
  'មឹក',
  'ងាវ',
  'ខ្យង',
  'ភ្លាសាច់គោ',
  'ភ្លា',
  'ញាំស្វាយ',
  'ញាំ',
  'បុកល្ហុង',
  'បុក',
  'ឆាក្តៅ',
  'ឆាខ្ញី',
  'ឆាម្រះព្រៅ',
  'បង្អែម',
  'ចេកខ្ទិះ',
  'សង់ខ្យា',
  'ក្រឡាន',
  'អន្សម',
  'បាញ់ឆែវ',
  'នំគ្រក់',
  'គ្រឿងសមុទ្រ',
  'ត្រី',
  'សាច់គោ',
  'សាច់ជ្រូក',
  'សាច់មាន់',
  'សាច់ទា',
] as const;

function computeDishHash(food: FoodItem, seed = 0): number {
  const str = `${food.id || ''}:${food.nameKh || ''}:${seed}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Generates dynamic, dish-specific dining hub & market recommendations for Phnom Penh and all 25 provinces,
 * tailored to the actual dish category and culinary style rather than repeating static text.
 */
export function getDishSpecificWhereToFind(
  food: FoodItem,
  prov: ProvinceFilterOption,
  language: Language
): string {
  const text = `${food.nameKh || ''} ${food.nameEn || ''} ${food.categorySlug || ''}`.toLowerCase();

  if (prov.id === 'phnom_penh') {
    if (/គុយទាវ|មីស៊ុប|មីសួរ|ហ្វឺ|មីទាញ|kuy\s*teav|noodle\s*soup|pho/i.test(text)) {
      if (language === 'km') return 'តំបន់គុយទាវល្បីៗ៖ មហាវិថីកម្ពុជាក្រោម សង្កាត់បឹងកេងកង១ ទួលគោក និងជុំវិញផ្សារអូរឫស្សី រាជធានីភ្នំពេញ';
      if (language === 'zh') return '金边知名粿条街区：柬埔寨下大道、万景岗一区 (BKK1)、堆谷区及乌亚西市场周边';
      return 'Famous Noodle Hubs: Kampuchea Krom Blvd, BKK1, Toul Kork & Orussey Market area, Phnom Penh';
    }
    if (/នំបញ្ចុក|banh\s*chok|vermicelli/i.test(text)) {
      if (language === 'km') return 'តូបនំបញ្ចុកខ្មែរ៖ ផ្សារចាស់ ផ្សារកណ្តាល ផ្សារទួលទំពូង និងសង្កាត់ចតុមុខ រាជធានីភ្នំពេញ';
      if (language === 'zh') return '高棉米粉名摊：老市场、中央集市、俄罗斯市场及四臂湾街区';
      return 'Traditional Num Banh Chok Stalls: Old Market, Phsar Kandal, Russian Market & Chaktomuk, Phnom Penh';
    }
    if (/លតឆា|មីឆា|គុយទាវឆា|បាញ់ឆែវ|នំគ្រក់|នំប៉័ង|ប្រហិត|lort\s*cha|fried\s*noodle|pancake|street/i.test(text)) {
      if (language === 'km') return 'វិថីអាហារពេលល្ងាច៖ ផ្សារអូរឫស្សី ផ្លូវសន្ធរម៉ុក សួនច្បារមាត់ទន្លេ និងផ្សារទួលទំពូង រាជធានីភ្នំពេញ';
      if (language === 'zh') return '金边街头热炒与小吃街：乌亚西夜市、山陀莫街区、四臂湾河畔及俄罗斯市场';
      return 'Street Food & Wok Corners: Orussey Night Stalls, Santhor Mok, Sisowath Riverside & Russian Market, Phnom Penh';
    }
    if (/បបរ|porridge|congee/i.test(text)) {
      if (language === 'km') return 'ហាងបបរគ្រឿង និងបបរស៖ មហាវិថីព្រះមុនីវង្ស ផ្សារអូរឫស្សី និងផ្សារកណ្តាល រាជធានីភ្នំពេញ';
      if (language === 'zh') return '高棉特色粥品街区：莫尼旺大道、乌亚西市场及中央集市';
      return 'Khmer Rice Porridge Hubs: Monivong Blvd, Orussey Market & Phsar Kandal, Phnom Penh';
    }
    if (food.categorySlug === 'rice' || /^បាយ|បាយសាច់ជ្រូក|បាយមាន់|បាយឆា|បាយក្ដាំង|បាយក្តាំង|pork\s*rice|fried\s*rice|chicken\s*rice/i.test(text)) {
      if (language === 'km') return 'ហាងបាយល្បីៗ៖ មហាវិថីព្រះមុនីវង្ស ផ្សារធំថ្មី ផ្សារអូឡាំពិក និងតំបន់ទួលគោក រាជធានីភ្នំពេញ';
      if (language === 'zh') return '金边人气米饭餐饮区：莫尼旺大道、中央市场、奥林匹克市场及堆谷区';
      return 'Popular Rice & Breakfast Spots: Monivong Blvd, Central Market, Olympic Market & Toul Kork, Phnom Penh';
    }
    if (food.categorySlug === 'dessert' || /បង្អែម|ចេកខ្ទិះ|លតស្វិត|សង់ខ្យា|បបរផ្អែម|ត្នោត|អន្សម|ក្រឡាន|dessert|sweet|custard/i.test(text)) {
      if (language === 'km') return 'តូបបង្អែមខ្មែរល្បីៗ៖ ផ្សារធំថ្មី ផ្លូវលេខ១៣ (ក្បែរផ្សារចាស់) ផ្សារទួលទំពូង និងវត្តលង្កា រាជធានីភ្នំពេញ';
      if (language === 'zh') return '金边传统高棉甜品摊：中央市场、13号路（老市场旁）、俄罗斯市场及兰卡寺街区';
      return 'Traditional Khmer Dessert Stalls: Central Market, Street 13 (Old Market), Russian Market & Wat Langka, Phnom Penh';
    }
    if (/គ្រឿងសមុទ្រ|ក្តាម|ក្ដាម|បង្គា|បង្កង|មឹក|ងាវ|ខ្យង|seafood|crab|prawn|shrimp|squid|clam/i.test(text)) {
      if (language === 'km') return 'ភោជនីយដ្ឋានមាត់ទន្លេ និងគ្រឿងសមុទ្រ៖ វិថីព្រះស៊ីសុវត្ថិ ជ្រោយចង្វារ និងទួលគោក (ផ្លូវ ៣១៥) រាជធានីភ្នំពេញ';
      if (language === 'zh') return '金边河畔与海鲜餐厅：西索瓦河畔大道、水净华半岛及堆谷区 (315号路)';
      return 'Riverside & Seafood Dining: Sisowath Quay, Chroy Changvar Peninsula & Toul Kork (St. 315), Phnom Penh';
    }
    if (food.categorySlug === 'grilled' || /សាច់អាំង|គោអាំង|ជ្រូកអាំង|មាន់ដុត|មាន់អាំង|ត្រីអាំង|ឆ្អឹងជំនី|គោឡើងភ្នំ|grilled|bbq|roast/i.test(text)) {
      if (language === 'km') return 'តំបន់សាច់អាំង និងម្ហូបជួបជុំ៖ សង្កាត់ទន្លេបាសាក់ (ផ្លូវ ២១) កោះពេជ្រ ជ្រោយចង្វារ និងបឹងកក់ រាជធានីភ្នំពេញ';
      if (language === 'zh') return '金边炭烤与聚餐街区：百色河区 (21号路)、钻石岛、水净华河畔及万谷湖';
      return 'BBQ & Grill Dining: Tonle Bassac (St. 21), Koh Pich, Chroy Changvar Riverside & Boeng Kak, Phnom Penh';
    }
    if (food.categorySlug === 'salad' || /ភ្លា|ញាំ|បុក|ទឹកគ្រឿង|salad|ceviche/i.test(text)) {
      if (language === 'km') return 'ហាងញាំ និងភ្លាខ្មែរ៖ ផ្សារទួលទំពូង សង្កាត់បឹងកេងកង វត្តបុទម និងមាត់ទន្លេចតុមុខ រាជធានីភ្នំពេញ';
      if (language === 'zh') return '高棉凉拌美食区：俄罗斯市场、万景岗区、波东寺公园及四臂湾河畔';
      return 'Khmer Salads & Zesty Dishes: Russian Market, BKK, Wat Botum Park & Chaktomuk Riverside, Phnom Penh';
    }
    if (food.categorySlug === 'stirfry' || /ឡុកឡាក់|ឆា|lok\s*lak|stir[\s-]*fry/i.test(text)) {
      if (language === 'km') return 'ភោជនីយដ្ឋានម្ហូបឆា និងឡុកឡាក់៖ សង្កាត់បឹងកេងកង១ (ផ្លូវ ៣៣៤) ផ្លូវព្រះសុធារស និងទួលទំពូង រាជធានីភ្នំពេញ';
      if (language === 'zh') return '金边特色小炒与禄拉克餐厅：万景岗一区 (334号路)、苏他罗大道及俄罗斯市场街区';
      return 'Signature Stir-Fry & Lok Lak Kitchens: BKK1 (Street 334), Sothearos Blvd & Russian Market, Phnom Penh';
    }
    // Traditional Khmer soups, Amok, Samlor, Prahok
    if (language === 'km') return 'ភោជនីយដ្ឋានម្ហូបខ្មែររសជាតិដើម៖ សង្កាត់បឹងកេងកង១ មហាវិថីព្រះនរោត្តម និងក្បែរសារមន្ទីរជាតិ (ដូនពេញ) រាជធានីភ្នំពេញ';
    if (language === 'zh') return '正宗高棉菜馆街区：万景岗一区 (BKK1)、诺罗敦大道及国家博物馆街区（隆边区）';
    return 'Authentic Khmer Kitchens: Boeng Keng Kang 1 (BKK1), Norodom Blvd & National Museum Quarter (Daun Penh), Phnom Penh';
  }

  // Provincial dish-specific refinement
  const baseWhere =
    language === 'km' ? prov.whereToFindKh : language === 'zh' ? prov.whereToFindZh : prov.whereToFindEn;
  if (food.categorySlug === 'noodles' || /គុយទាវ|នំបញ្ចុក|បបរ|បាយសាច់ជ្រូក/i.test(text)) {
    if (language === 'km') return `តូបអាហារពេលព្រឹក និងផ្សារក្នុងតំបន់ • ${baseWhere}`;
    if (language === 'zh') return `当地早市与传统粉面摊 • ${baseWhere}`;
    return `Morning Market Stalls & Local Noodle Shops • ${baseWhere}`;
  }
  if (food.categorySlug === 'dessert' || /បង្អែម|នំ|ក្រឡាន|អន្សម|ចេកខ្ទិះ/i.test(text)) {
    if (language === 'km') return `តូបបង្អែមប្រពៃណី និងអាហារសម្រន់ក្នុងតំបន់ • ${baseWhere}`;
    if (language === 'zh') return `当地传统甜品与特色小吃摊 • ${baseWhere}`;
    return `Traditional Sweet Stalls & Local Market Treats • ${baseWhere}`;
  }
  if (food.categorySlug === 'grilled' || /អាំង|ដុត|បំពង/i.test(text)) {
    if (language === 'km') return `ហាងអាហារអាំង និងកន្លែងលម្ហែមាត់ទឹក • ${baseWhere}`;
    if (language === 'zh') return `河畔炭烤与特色风味餐厅 • ${baseWhere}`;
    return `Charcoal Grill Spots & Waterside Eateries • ${baseWhere}`;
  }
  return baseWhere;
}

export function getMatchingRestaurantsForProvinceDish(
  food: FoodItem,
  prov: ProvinceFilterOption,
  restaurants: Restaurant[],
  rotationSeed = 0
): Restaurant[] {
  const approved = restaurants.filter((r) => r && r.id && (r.status === 'approved' || !r.status));
  const cleanKh = prov.kh.trim();
  const inProvince = approved.filter(
    (r) =>
      (r.provinceKh && r.provinceKh.includes(cleanKh)) ||
      (r.provinceEn && r.provinceEn.toLowerCase().includes(prov.en.toLowerCase()))
  );

  const foodNameText = `${food.nameKh || ''} ${food.nameEn || ''}`.toLowerCase();
  const foodFullText = `${foodNameText} ${food.categoryKh || ''} ${food.categorySlug || ''} ${food.descriptionKh || ''}`.toLowerCase();

  // Extract matching Khmer sub-tokens from the dish name
  const activeSubtokens = KHMER_DISH_SUBTOKENS.filter((tok) => foodNameText.includes(tok));
  const englishWords = (food.nameEn || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !['with', 'khmer', 'cambodian', 'style', 'fresh', 'traditional'].includes(w));

  const dishHash = computeDishHash(food, rotationSeed);
  const candidatePool = inProvince.length > 0 ? inProvince : approved;

  const scored = candidatePool.map((r, idx) => {
    const sigList = r.signatureDishesKh || [];
    const sigText = sigList.join(' ').toLowerCase();
    const restText = `${r.nameKh || ''} ${r.nameEn || ''} ${sigText} ${r.descriptionKh || ''} ${r.descriptionEn || ''} ${r.cuisineType || ''}`.toLowerCase();

    let matchScore = 0;

    // 1. Exact or near-exact signature dish match
    if (
      sigList.some((sig) => {
        const s = sig.trim().toLowerCase();
        const fn = (food.nameKh || '').trim().toLowerCase();
        return s.length >= 3 && fn.length >= 3 && (s.includes(fn) || fn.includes(s));
      })
    ) {
      matchScore += 95;
    }

    // 2. Khmer culinary sub-token matches in signature dishes or restaurant name/description
    for (const tok of activeSubtokens) {
      if (sigText.includes(tok)) {
        matchScore += 32;
      } else if (restText.includes(tok)) {
        matchScore += 18;
      }
    }

    // 3. English keyword matches
    for (const ew of englishWords) {
      if (restText.includes(ew)) {
        matchScore += 14;
      }
    }

    // 4. Category / culinary style affinity
    if (food.categorySlug === 'grilled' || /អាំង|ដុត|bbq|grill/i.test(foodNameText)) {
      if (/អាំង|ដុត|bbq|grill|មឹក|បង្កង|សាច់គោអាំង/i.test(restText)) matchScore += 28;
    } else if (food.categorySlug === 'dessert' || /បង្អែម|ចេកខ្ទិះ|ត្នោត|សង់ខ្យា|dessert|sweet/i.test(foodNameText)) {
      if (/បង្អែម|ចេកខ្ទិះ|ត្នោត|នំ|dessert|sweet|កាហ្វេ/i.test(restText)) matchScore += 32;
    } else if (food.categorySlug === 'salad' || /ភ្លា|ញាំ|បុក|ទឹកគ្រឿង|ប្រហុក/i.test(foodNameText)) {
      if (/ភ្លា|ញាំ|បុក|ប្រហុក|ទឹកគ្រឿង|salad|tapas/i.test(restText)) matchScore += 28;
    } else if (food.categorySlug === 'noodles' || /គុយទាវ|នំបញ្ចុក|មី|លត/i.test(foodNameText)) {
      if (/គុយទាវ|នំបញ្ចុក|មី|លត|ព្រឹក|noodle/i.test(restText)) matchScore += 28;
    } else if (food.categorySlug === 'rice' || /^បាយ|ឡុកឡាក់|ឆា/i.test(foodNameText)) {
      if (/បាយ|ឡុកឡាក់|ឆា|lok\s*lak|rice/i.test(restText)) matchScore += 26;
    } else if (food.categorySlug === 'soup' || /សម្ល|អាម៉ុក|កកូរ|ម្ជូរ|ការី/i.test(foodFullText)) {
      if (/សម្ល|អាម៉ុក|កកូរ|ម្ជូរ|ការី|ស៊ុប/i.test(restText)) matchScore += 24;
    }

    // 5. Strongly prioritize verified restaurants
    if (r.isVerified) {
      matchScore += 40;
    }

    // 6. Deterministic dish-specific tie-breaker so different dishes in the same province rotate across verified shops
    const rotTieBreaker = ((dishHash + (idx + 1) * 37) % 23) * 0.9;

    return {
      r,
      isVerified: Boolean(r.isVerified),
      score: matchScore + rotTieBreaker + (r.rating || 4.5) * 0.3,
    };
  });

  scored.sort((a, b) => {
    if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
    return b.score - a.score;
  });

  // Deduplicate by restaurant ID and nameKh
  const seenNames = new Set<string>();
  const unique: Restaurant[] = [];
  for (const item of scored) {
    const key = (item.r.nameKh || item.r.id).trim();
    if (!seenNames.has(key)) {
      seenNames.add(key);
      unique.push(item.r);
    }
    if (unique.length >= 3) break;
  }

  return unique;
}

/**
 * Finds the best-matching verified restaurants for any dish across its home province or nationwide.
 */
export function getMatchingRestaurantsForDish(
  food: FoodItem,
  restaurants: Restaurant[],
  limit = 3,
  rotationSeed = 0
): Restaurant[] {
  const provId = detectDishProvince(food);
  const prov = getProvinceOptionById(provId);
  return getMatchingRestaurantsForProvinceDish(food, prov, restaurants, rotationSeed).slice(0, limit);
}
