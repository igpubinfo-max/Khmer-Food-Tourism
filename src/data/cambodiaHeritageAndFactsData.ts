import type { Tri } from './guideContent';

export interface UnescoHeritageEntry {
  id: string;
  badge: string;
  kind: 'tangible' | 'intangible';
  title: Tri;
  summary: Tri;
}

export interface NationalSymbolEntry {
  id: string;
  emoji: string;
  category: Tri;
  name: Tri;
  desc: Tri;
}

export interface DomesticTransportEntry {
  id: string;
  emoji: string;
  title: Tri;
  detail: Tri;
}

export interface CambodiaFastFactEntry {
  id: string;
  emoji: string;
  title: Tri;
  fact: Tri;
}

export const CAMBODIA_UNESCO_HERITAGE_LIST: UnescoHeritageEntry[] = [
  {
    "id": "unesco-angkor",
    "badge": "🏛️ UNESCO 1992",
    "kind": "tangible",
    "title": {
      "km": "រមណីយដ្ឋានបុរាណវិទ្យាអង្គរ (ខេត្តសៀមរាប)",
      "en": "Angkor Archaeological Park (Siem Reap)",
      "zh": "吴哥考古公园（暹粒省）"
    },
    "summary": {
      "km": "ចុះបញ្ជីបេតិកភណ្ឌពិភពលោកនៅថ្ងៃទី ១៤ ខែធ្នូ ឆ្នាំ ១៩៩២។ ជារាជធានីនៃចក្រភពខ្មែរពីសតវត្សរ៍ទី ៩ ដល់ទី ១៥ រួមមានប្រាសាទអង្គរវត្ត ប្រាសាទបាយ័ន និងប្រាសាទតាព្រហ្ម។",
      "en": "Inscribed in 1992 as the monumental heart of the Khmer Empire (9th–15th centuries), encompassing Angkor Wat, Bayon, Angkor Thom, and Ta Prohm.",
      "zh": "1992年列入世界遗产名录，涵盖9至15世纪高棉帝国辉煌都城遗址，包括吴哥窟、巴戎寺与塔普伦寺。"
    }
  },
  {
    "id": "unesco-preah-vihear",
    "badge": "🏛️ UNESCO 2008",
    "kind": "tangible",
    "title": {
      "km": "ប្រាសាទព្រះវិហារ (ខេត្តព្រះវិហារ)",
      "en": "Temple of Preah Vihear (Preah Vihear Province)",
      "zh": "柏威夏寺（柏威夏省）"
    },
    "summary": {
      "km": "ចុះបញ្ជីបេតិកភណ្ឌពិភពលោកនៅថ្ងៃទី ៧ ខែកក្កដា ឆ្នាំ ២០០៨។ ស្ថាបនាឡើងលើកំពូលភ្នំដងរែកកម្ពស់ ៥២៥ ម៉ែត្រ ឧទ្ទិសថ្វាយព្រះសិវៈ ជាកំពូលស្នាដៃស្ថាបត្យកម្មខ្មែរ។",
      "en": "Inscribed on July 7, 2008. Perched atop a 525-meter cliff in the Dângrêk Mountains, renowned for its 800-meter axial sanctuary pavement and stone carvings.",
      "zh": "2008年7月7日列入世界遗产名录，坐落于扁担山脉525米悬崖之巅，是高棉建筑艺术的杰作。"
    }
  },
  {
    "id": "unesco-sambor-prei-kuk",
    "badge": "🏛️ UNESCO 2017",
    "kind": "tangible",
    "title": {
      "km": "តំបន់ប្រាសាទសំបូរព្រៃគុក (ខេត្តកំពង់ធំ)",
      "en": "Temple Zone of Sambor Prei Kuk (Kampong Thom)",
      "zh": "三波坡雷古寺庙群（磅同省）"
    },
    "summary": {
      "km": "ចុះបញ្ជីបេតិកភណ្ឌពិភពលោកនៅថ្ងៃទី ៨ ខែកក្កដា ឆ្នាំ ២០១៧។ ជារាជធានីឥសានបុរៈសម័យចេនឡា (សតវត្សរ៍ទី ៦–៧) ដែលមានប្រាសាទឥដ្ឋបុរាណរាងប្រាំបីជ្រុងដ៏កម្រ។",
      "en": "Inscribed on July 8, 2017. Ancient capital of Ishanapura (6th–7th centuries Chenla Empire) featuring unique octagonal brick sanctuaries hidden in forest groves.",
      "zh": "2017年7月8日列入世界遗产名录，为6至7世纪真腊王国伊奢那补罗古都遗址，以独特的八角形砖塔闻名。"
    }
  },
  {
    "id": "unesco-koh-ker",
    "badge": "🏛️ UNESCO 2023",
    "kind": "tangible",
    "title": {
      "km": "រមណីយដ្ឋានប្រាសាទកោះកេរ (ខេត្តព្រះវិហារ)",
      "en": "Koh Ker: Archaeological Site of Ancient Lingapura (Preah Vihear)",
      "zh": "贡开古迹群：林迦补罗古都（柏威夏省）"
    },
    "summary": {
      "km": "ចុះបញ្ជីបេតិកភណ្ឌពិភពលោកនៅថ្ងៃទី ១៧ ខែកញ្ញា ឆ្នាំ ២០២៣។ អតីតរាជធានីឆោកគគីររបស់ព្រះបាទជ័យវរ្ម័នទី ៤ ល្បីល្បាញដោយប្រាសាទធំ (ប្រាសាទពីរ៉ាមីត ៧ ជាន់ កម្ពស់ ៣៦ ម៉ែត្រ)។",
      "en": "Inscribed on September 17, 2023. The 10th-century royal capital of King Jayavarman IV, crowned by Prasat Thom, a dramatic 36-meter seven-tiered sandstone pyramid.",
      "zh": "2023年9月17日列入世界遗产名录，为10世纪阇耶跋摩四世建立的王都，拥有高达36米的七层阶梯金字塔神庙。"
    }
  },
  {
    "id": "unesco-royal-ballet",
    "badge": "🎭 UNESCO 2003/2008",
    "kind": "intangible",
    "title": {
      "km": "របាំព្រះរាជទ្រព្យ (Royal Ballet of Cambodia)",
      "en": "Royal Ballet of Cambodia (Classical Khmer Dance)",
      "zh": "柬埔寨皇家芭蕾舞（高棉古典宫廷舞）"
    },
    "summary": {
      "km": "បេតិកភណ្ឌវប្បធម៌អរូបីនៃមនុស្សជាតិ (២០០៣/២០០៨)។ របាំក្បាច់បុរាណខ្មែរដ៏ទន់ភ្លន់ ប្រកបដោយកាយវិការដៃដ៏วิចិត្រ និងសម្លៀកបំពាក់មាសប្រាក់តាមរឿងរាមកេរ្តិ៍។",
      "en": "Proclaimed a Masterpiece of Intangible Cultural Heritage in 2003. Sacred classical court dance known for graceful hand gestures, gilded costumes, and Reamker epics.",
      "zh": "2003年列入人类非物质文化遗产代表作，以柔美手势、华丽金饰礼服与《罗摩衍那》史诗剧目著称。"
    }
  },
  {
    "id": "unesco-sbek-thom",
    "badge": "🎭 UNESCO 2005/2008",
    "kind": "intangible",
    "title": {
      "km": "ល្ខោនស្រមោលស្បែកធំ (Sbek Thom Shadow Theatre)",
      "en": "Sbek Thom: Khmer Large Shadow Puppetry",
      "zh": "高棉大皮影戏（Sbek Thom）"
    },
    "summary": {
      "km": "បេតិកភណ្ឌវប្បធម៌អរូបី (២០០៥/២០០៨)។ សិល្បៈផ្ទាំងស្បែកគោឆ្លាក់រូបតួអង្គរឿងរាមកេរ្តិ៍ សម្ដែងនៅមុខផ្ទាំងក្រណាត់ស ជាមួយភ្លើងគប់ត្រឡោកដូង និងភ្លេងពិណពាទ្យ។",
      "en": "Sacred shadow theatre using intricately perforated cowhide panels danced before a fire-lit white screen to the accompaniment of a traditional Pinpeat orchestra.",
      "zh": "采用整张牛皮精雕《罗摩衍那》人物，在椰壳篝火照耀的白幕前伴随传统皮帕乐队伴奏进行表演。"
    }
  },
  {
    "id": "unesco-bokator",
    "badge": "🥋 UNESCO 2022",
    "kind": "intangible",
    "title": {
      "km": "គុនល្បុក្កតោ (Kun Lbokator Ancient Martial Art)",
      "en": "Kun Lbokator: Traditional Martial Arts of Cambodia",
      "zh": "高棉传统武术：斗狮拳（Kun Lbokator）"
    },
    "summary": {
      "km": "ចុះបញ្ជីបេតិកភណ្ឌអរូបីនៅថ្ងៃទី ២៩ ខែវិច្ឆិកា ឆ្នាំ ២០២២។ ក្បាច់គុនបុរាណខ្មែរតាំងពីសម័យអង្គរ ដែលឆ្លាក់លើជញ្ជាំងប្រាសាទ មានក្បាច់យកលំនាំតាមសត្វ និងធម្មជាតិ។",
      "en": "Inscribed in 2022. Dating back over a millennium and carved on Angkorian temple bas-reliefs, integrating nature-inspired strikes, grappling, and ceremonial silk cords.",
      "zh": "2022年列入人类非物质文化遗产名录，源自吴哥时期浮雕记载的千年古武术，融汇飞禽走兽与自然招式。"
    }
  },
  {
    "id": "unesco-krama",
    "badge": "🧣 UNESCO 2024",
    "kind": "intangible",
    "title": {
      "km": "ក្រមាខ្មែរ (Traditional Khmer Krama Textile)",
      "en": "Cultural Practices and Expressions of the Khmer Krama",
      "zh": "高棉水布（Krama）传统织造技艺与文化习俗"
    },
    "summary": {
      "km": "ចុះបញ្ជីបេតិកភណ្ឌវប្បធម៌អរូបីនៃមនុស្សជាតិនៅខែធ្នូ ឆ្នាំ ២០២៤។ ក្រមាជាអត្តសញ្ញាណជាតិខ្មែរដែលប្រើប្រាស់គ្រប់កាលៈទេសៈក្នុងជីវភាពប្រចាំថ្ងៃ និងពិធីប្រពៃណី។",
      "en": "Inscribed in December 2024. The iconic checkered woven textile central to Cambodian daily life, hospitality, craftsmanship, and cultural identity.",
      "zh": "2024年12月正式列入联合国教科文组织非遗名录，象征柬埔寨人民勤劳智慧与日常生活不可或缺的民族标志。"
    }
  }
];

export const CAMBODIA_NATIONAL_SYMBOLS_AND_WILDLIFE: NationalSymbolEntry[] = [
  {
    "id": "sym-rumduol",
    "emoji": "🌺",
    "category": {
      "km": "ផ្កាជាតិកម្ពុជា",
      "en": "National Flower",
      "zh": "柬埔寨国花"
    },
    "name": {
      "km": "ផ្ការំដួល (Rumduol)",
      "en": "Rumduol Flower (Mitrella mesnyi)",
      "zh": "隆都花（Rumduol）"
    },
    "desc": {
      "km": "ផ្កាពណ៌លឿងស្រាលមានក្លិនក្រអូបឈ្ងុយឈ្ងប់ជាពិសេសនៅពេលរសៀល និងព្រលប់ ត្រូវបានកំណត់ជាផ្កាជាតិផ្លូវការតាមព្រះរាជក្រឹត្យឆ្នាំ ២០០៥។",
      "en": "Creamy yellow three-petaled blossom celebrated for its enchanting evening fragrance; designated by Royal Decree in 2005 as Cambodia’s national flower.",
      "zh": "淡黄色三瓣花朵，每逢傍晚散发迷人幽香，2005年由王室法令正式册封为柬埔寨国花。"
    }
  },
  {
    "id": "sym-sugar-palm",
    "emoji": "🌴",
    "category": {
      "km": "ដើមឈើជាតិកម្ពុជា",
      "en": "National Tree",
      "zh": "柬埔寨国树"
    },
    "name": {
      "km": "ដើមត្នោត (Sugar Palm)",
      "en": "Sugar Palm (Borassus flabellifer)",
      "zh": "糖棕树（高棉棕榈）"
    },
    "desc": {
      "km": "ដុះអមតាមភ្លឺស្រែ និងប្រាសាទបុរាណទូទាំងប្រទេស ផ្ដល់អត្ថប្រយោជន៍គ្រប់ផ្នែកតាំងពីទឹកត្នោត ស្ករត្នោត ផ្លែត្នោត ស្លឹកប្រក់ដំបូល និងដើមធ្វើទូក។",
      "en": "Towering silhouette of the Cambodian countryside providing sweet palm nectar, GI palm sugar, fruit, thatch leaves, and timber.",
      "zh": "遍布高棉田野与古寺四周的标志性树木，其花汁可熬制闻名的棕糖，树叶与树干皆为传统生活良材。"
    }
  },
  {
    "id": "sym-kouprey",
    "emoji": "🐂",
    "category": {
      "km": "ថនិកសត្វជាតិកម្ពុជា",
      "en": "National Mammal",
      "zh": "柬埔寨国兽"
    },
    "name": {
      "km": "គោព្រៃ (Kouprey)",
      "en": "Kouprey (Bos sauveli)",
      "zh": "林牛（高棉野牛 Kouprey）"
    },
    "desc": {
      "km": "ថនិកសត្វព្រៃដ៏កម្របំផុតលើពិភពលោកដែលមានដើមកំណើតនៅព្រៃភ្នំភាគខាងជើងកម្ពុជា ជានិមិត្តរូបនៃភាពអង់អាច និងមរតកធម្មជាតិខ្មែរ។",
      "en": "Rare wild forest ox native to northern Cambodia’s deciduous forests, revered as the national mammal and emblem of wildlife conservation.",
      "zh": "原产于柬埔寨北部森林的珍稀野生牛科动物，是象征高棉自然生态与坚韧精神的国兽。"
    }
  },
  {
    "id": "sym-giant-ibis",
    "emoji": "🐦",
    "category": {
      "km": "បក្សីជាតិកម្ពុជា",
      "en": "National Bird",
      "zh": "柬埔寨国鸟"
    },
    "name": {
      "km": "សត្វត្រយងយក្ស (Giant Ibis)",
      "en": "Giant Ibis (Thaumatibis gigantea)",
      "zh": "巨䴉（Giant Ibis）"
    },
    "desc": {
      "km": "បក្សីត្រយងធំជាងគេលើពិភពលោក រស់នៅក្នុងដែនជម្រកសត្វព្រៃគូលែនព្រហ្មទេព (ព្រះវិហារ) និងមណ្ឌលគិរី។",
      "en": "The world’s largest ibis species, protected primarily in Preah Vihear’s Kulen Promtep Wildlife Sanctuary and northern plains.",
      "zh": "世界上体型最大的䴉科鸟类，主要栖息于柏威夏省荔枝山野生动物保护区与东北部森林湿地。"
    }
  },
  {
    "id": "sym-dolphin",
    "emoji": "🐬",
    "category": {
      "km": "សត្វទឹកកម្រដ៏ល្បីល្បាញ",
      "en": "Iconic River Wildlife",
      "zh": "湄公河珍稀动物"
    },
    "name": {
      "km": "ផ្សោតទន្លេមេគង្គ (Irrawaddy Dolphin)",
      "en": "Mekong Irrawaddy Dolphin",
      "zh": "湄公河伊洛瓦底江豚"
    },
    "desc": {
      "km": "ផ្សោតទឹកសាបដ៏កម្រដែលរស់នៅតាមអន្លង់ទឹកជ្រៅនៃទន្លេមេគង្គក្នុងខេត្តក្រចេះ (អន្លង់កាំពី) និងខេត្តស្ទឹងត្រែង។",
      "en": "Beloved freshwater dolphins inhabiting deep Mekong River pools at Kampi in Kratie and Stung Treng provinces.",
      "zh": "栖息于桔井省甘比深水潭与上丁省湄公河段的微笑淡水江豚，是柬埔寨生态旅游的瑰宝。"
    }
  },
  {
    "id": "sym-royal-turtle",
    "emoji": "🐢",
    "category": {
      "km": "ល្មូនជាតិ និងត្រីជាតិ",
      "en": "National Reptile & Fish",
      "zh": "国爬行动物与国鱼"
    },
    "name": {
      "km": "អណ្ដើកហ្លួង & ត្រីគល់រាំង",
      "en": "Royal Turtle & Giant Mekong Barb",
      "zh": "皇家龟与巨型湄公河鲤（国鱼）"
    },
    "desc": {
      "km": "អណ្ដើកហ្លួងរស់នៅតាមព្រែកស្រែអំបិល (កោះកុង) ចំណែកត្រីគល់រាំងជាត្រីទឹកសាបធំជាងគេក្នុងទន្លេមេគង្គ និងបឹងទន្លេសាប។",
      "en": "The Royal Mangrove Terrapin of Koh Kong and the Giant Barb (Catlocarpio siamensis), the largest carp species in the Mekong-Tonle Sap basin.",
      "zh": "栖息于国公省河口的皇家红树林龟，以及湄公河与洞里萨湖流域体型最大的鲤科鱼类巨暹罗鲤。"
    }
  }
];

export const CAMBODIA_DOMESTIC_TRANSPORT_ROUTES: DomesticTransportEntry[] = [
  {
    "id": "trans-expressway",
    "emoji": "🛣️",
    "title": {
      "km": "ផ្លូវល្បឿនលឿន ភ្នំពេញ–ព្រះសីហនុ (PPSHV Expressway)",
      "en": "Phnom Penh–Sihanoukville Expressway (E4)",
      "zh": "金边—西哈努克港高速公路（E4）"
    },
    "detail": {
      "km": "ប្រវែង ១៨៧ គីឡូម៉ែត្រ ចំណាយពេលធ្វើដំណើរត្រឹមតែ ២ ម៉ោង ពីរាជធានីភ្នំពេញទៅកាន់ឆ្នេរសមុទ្រខេត្តព្រះសីហនុ និងច្រកបំបែកទៅភ្នំបូកគោ/កំពត។",
      "en": "187 km modern 4-lane expressway cutting travel time between Phnom Penh and Sihanoukville beaches to just 2 hours, with exits for Kampong Speu and Kampot.",
      "zh": "全长187公里现代化双向四车道高速公路，从金边至西哈努克海滩仅需2小时，沿途设磅士卑与贡布出口。"
    }
  },
  {
    "id": "trans-railway",
    "emoji": "🚂",
    "title": {
      "km": "ផ្លូវរថភ្លើង Royal Railway (ខ្សែទិសខាងត្បូង និងទិសខាងជើង)",
      "en": "Royal Railway Passenger Trains (South & North Lines)",
      "zh": "柬埔寨皇家铁路客运列车（南线与北线）"
    },
    "detail": {
      "km": "ខ្សែទី ១៖ ភ្នំពេញ ➔ តាកែវ ➔ កំពត ➔ ព្រះសីហនុ (គយគន់ទេសភាពវាលស្រែ និងភ្នំ)។ ខ្សែទី ២៖ ភ្នំពេញ ➔ ពោធិ៍សាត់ ➔ បាត់ដំបង ➔ ប៉ោយប៉ែត។",
      "en": "Southern Line: Phnom Penh → Takeo → Kampot → Sihanoukville. Northern Line: Phnom Penh → Pursat → Battambang → Poipet.",
      "zh": "南线列车：金边 → 茶胶 → 贡布 → 西哈努克；北线列车：金边 → 菩萨 → 马德望 → 波贝。"
    }
  },
  {
    "id": "trans-ferry",
    "emoji": "⛴️",
    "title": {
      "km": "ទូកល្បឿនលឿនទៅកោះរ៉ុង កោះរ៉ុងសន្លឹម និងកោះទន្សាយ",
      "en": "Island Speed Ferries (Koh Rong, Sanloem & Rabbit Island)",
      "zh": "海岛高速快艇（高龙岛、高龙撒冷岛与兔子岛）"
    },
    "detail": {
      "km": "ចេញដំណើររៀងរាល់ថ្ងៃពីកំពង់ផែទេសចរណ៍ក្រុងព្រះសីហនុទៅកោះរ៉ុង/កោះរ៉ុងសន្លឹម (ប្រើពេល ៣៥–៤៥ នាទី) និងពីកំពង់ផែកែបទៅកោះទន្សាយ (២០ នាទី)។",
      "en": "Daily high-speed catamarans from Sihanoukville Autonomous Port to Koh Rong & Koh Rong Sanloem (35–45 mins), plus Kep pier boats to Koh Tonsay (20 mins).",
      "zh": "每日从西哈努克旅游码头出发前往高龙岛与高龙撒冷岛（35–45分钟），以及白马码头前往兔子岛（20分钟）。"
    }
  },
  {
    "id": "trans-airports",
    "emoji": "✈️",
    "title": {
      "km": "ជើងហោះហើរក្នុងស្រុក (ភ្នំពេញ ⇄ សៀមរាបអង្គរ ⇄ ព្រះសីហនុ)",
      "en": "Domestic Flights (Phnom Penh ⇄ Siem Reap Angkor SAI ⇄ Sihanoukville)",
      "zh": "国内航线（金边 ⇄ 暹粒吴哥国际机场 SAI ⇄ 西哈努克）"
    },
    "detail": {
      "km": "តភ្ជាប់រវាងអាកាសយានដ្ឋានអន្តរជាតិភ្នំពេញ អាកាសយានដ្ឋានអន្តរជាតិសៀមរាបអង្គរ (SAI) និងអាកាសយានដ្ឋានអន្តរជាតិក្រុងព្រះសីហនុ ប្រើពេលហោះហើរត្រឹម ៤៥ នាទី។",
      "en": "Daily 45-minute domestic flights connecting Phnom Penh, Siem Reap Angkor International Airport (SAI), and Sihanoukville coastal hub.",
      "zh": "连接金边、暹粒吴哥国际机场（SAI）与西哈努克国际机场，单程飞行仅需约45分钟。"
    }
  }
];

export const CAMBODIA_FAST_FACTS: CambodiaFastFactEntry[] = [
  {
    "id": "fact-angkor-largest",
    "emoji": "🏆",
    "title": {
      "km": "សំណង់សាសនាធំជាងគេបំផុតលើពិភពលោក",
      "en": "Largest Religious Monument on Earth",
      "zh": "世界最大宗教建筑群纪录"
    },
    "fact": {
      "km": "ប្រាសាទអង្គរវត្តមានផ្ទៃដីសរុប ៤០២ ហិកតា (១,៦២៦,០០០ ម៉ែត្រការ៉េ) ត្រូវបានកត់ត្រាក្នុង Guinness World Records ថាជាសំណង់សាសនាធំជាងគេបំផុតលើពិភពលោក។",
      "en": "Spanning 402 acres (162.6 hectares), Angkor Wat is officially certified by Guinness World Records as the largest religious structure in the world.",
      "zh": "吴哥窟占地达162.6公顷（402英亩），被吉尼斯世界纪录认证为全球规模最大的宗教建筑。"
    }
  },
  {
    "id": "fact-flag",
    "emoji": "🇰🇭",
    "title": {
      "km": "ទង់ជាតិតែមួយគត់លើពិភពលោកដែលមានរូបប្រាសាទធំនៅចំកណ្ដាល",
      "en": "World’s Only National Flag Featuring an Iconic Monument",
      "zh": "全球唯一以古建筑为主体的国旗"
    },
    "fact": {
      "km": "ទង់ជាតិព្រះរាជាណាចក្រកម្ពុជា គឺជាទង់ជាតិផ្លូវការតែមួយគត់លើពិភពលោកដែលមានរូបស្ថាបត្យកម្មប្រាសាទពិតប្រាកដ (ប្រាសាទអង្គរវត្តកំពូលបី) នៅចំកណ្ដាល។",
      "en": "Cambodia’s national flag is the only flag in the world that prominently features a real historical monument—the three towers of Angkor Wat—at its center.",
      "zh": "柬埔寨国旗是世界上唯一一面以真实历史古迹（吴哥窟三座宝塔）作为中心图案的国旗。"
    }
  },
  {
    "id": "fact-tonle-sap",
    "emoji": "🌊",
    "title": {
      "km": "ទន្លេដែលហូរត្រឡប់ទិស ២ ដងក្នុង ១ ឆ្នាំ",
      "en": "The River That Reverses Flow Twice a Year",
      "zh": "每年两次逆流奇观的洞里萨河"
    },
    "fact": {
      "km": "ទន្លេសាបជាទន្លេដ៏អស្ចារ្យដែលហូរចូលបឹងទន្លេសាបនៅរដូវវស្សា និងហូរត្រឡប់ចេញមកទន្លេមេគង្គវិញនៅរដូវប្រាំង (ខែវិច្ឆិកា ក្នុងពិធីបុណ្យអុំទូក)។",
      "en": "Driven by the Mekong monsoon pulse, the Tonle Sap River reverses its direction twice every year—celebrated nationwide during the annual Water Festival (Bon Om Touk).",
      "zh": "受湄公河季风水位驱动，洞里萨河每年定期改变流向两次，造就了东南亚最大淡水湖与盛大的送水节传统。"
    }
  },
  {
    "id": "fact-jasmine-rice",
    "emoji": "🌾",
    "title": {
      "km": "អង្ករផ្ការំដួលខ្មែរ ឈ្នះពានអង្ករល្អដាច់គេលើពិភពលោក ៦ សម័យកាល",
      "en": "6-Time World’s Best Rice Champion (Phka Rumduol)",
      "zh": "六度荣膺“世界最佳大米”冠军的隆都花香米"
    },
    "fact": {
      "km": "អង្ករក្រអូប «ផ្ការំដួល» និង «សែនក្រអូប» របស់កម្ពុជា បានឈ្នះពានរង្វាន់អង្ករល្អដាច់គេលើពិភពលោក (World’s Best Rice Award) រហូតដល់ ៦ ដង។",
      "en": "Cambodia’s fragrant Phka Rumduol jasmine rice has won the prestigious World’s Best Rice Award six times for its floral aroma and soft texture.",
      "zh": "柬埔寨茉莉香米“隆都花”（Phka Rumduol）凭借天然花香与柔滑口感，已六次斩获“世界最佳大米”桂冠。"
    }
  }
];
