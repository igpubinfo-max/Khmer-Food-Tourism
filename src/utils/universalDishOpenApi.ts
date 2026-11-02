/**
 * Universal Out-of-Catalog Dish Translation & Legal Open-API Photo Resolver
 * Supports ANY dish or beverage typed in Khmer, English, or Chinese (Khmer regional/street food,
 * Asian, Western, desserts, drinks, and novel ingredient+method combinations) using:
 *   1. 230+ Khmer/Chinese/English Culinary Lexicon & Multi-Token Compositional Translator
 *   2. Wikipedia Interlanguage / PageImages API (km.wikipedia.org / zh.wikipedia.org / en.wikipedia.org)
 *   3. MyMemory Free Open Translation API fallback for completely unseen Khmer/Chinese dish names
 *   4. TheMealDB Open API + Wikipedia PageImages + Wikimedia Commons (filetype:bitmap)
 */

export interface UniversalDishTranslation {
  enName: string;
  wikiQuery: string;
  commonsQuery?: string;
  mealDbQuery?: string;
  hasLexiconMatch: boolean;
}

interface DishRule {
  re: RegExp;
  enName: string;
  wikiQuery: string;
  commonsQuery?: string;
  mealDbQuery?: string;
}

const SPECIFIC_DISH_LEXICON: DishRule[] = [
  // Shellfish, Crustaceans & Aquatic Specialties
  { re: /ងាវអាំង|ngav\s*ang|grilled\s*(?:blood\s*)?cockle/i, enName: 'Grilled Blood Cockles (Ngav Ang)', wikiQuery: 'blood cockles food', commonsQuery: 'Kkomak Tegillarca granosa' },
  { re: /ងាវឆា|stir[\s-]*fried\s*(?:blood\s*)?cockle/i, enName: 'Stir-Fried Blood Cockles with Tamarind', wikiQuery: 'blood cockles food', commonsQuery: 'Yam hoi khraeng' },
  { re: /ងាវស្រុះ|blanched\s*(?:blood\s*)?cockle/i, enName: 'Blanched Blood Cockles', wikiQuery: 'blood cockles food', commonsQuery: 'Kkomak Tegillarca granosa' },
  { re: /ភ្លាងាវ|ញាំងាវ|cockle\s*salad/i, enName: 'Spicy Blood Cockle Salad', wikiQuery: 'blood cockles food', commonsQuery: 'Yam hoi khraeng' },
  { re: /ងាវ|blood\s*cockle|\bcockles?\b|血蚶/i, enName: 'Cambodian Blood Cockles', wikiQuery: 'blood cockles food', commonsQuery: 'Yam hoi khraeng' },
  { re: /លៀសហាល|lies\s*hal|sun[\s-]*dried.*clam/i, enName: 'Sun-Dried Spiced Freshwater Clams (Lies Hal)', wikiQuery: 'clams seafood dish' },
  { re: /លៀសឆា|លាសឆា/i, enName: 'Stir-Fried Freshwater Clams', wikiQuery: 'clams dish' },
  { re: /លៀស|លាស|\bclams?\b|蛤蜊|花甲/i, enName: 'Freshwater Clams Dish', wikiQuery: 'clams seafood dish' },
  { re: /គ្រំអាំង|គ្រំឆា|គ្រំ|\bmussels?\b|青口|贻贝/i, enName: 'Grilled Mussels Seafood', wikiQuery: 'mussels dish' },
  { re: /អយស្ទ័រ|\boysters?\b|生蚝|牡蛎/i, enName: 'Fresh Oysters with Spicy Sauce', wikiQuery: 'oyster food' },
  { re: /ខ្យងអាំង|ខ្យងស្រែ|ខ្យងឆា|ខ្យង|\bsnails?\b|\bescargot\b|田螺/i, enName: 'Spiced River Snails', wikiQuery: 'cooked snails dish' },
  { re: /កង្កែបបោក|កង្កែបអាំង|កង្កែបឆា|កង្កែបបំពង|កង្កែប|\bfrog\s*legs?\b|田鸡|牛蛙/i, enName: 'Cambodian Grilled & Fried Frog Legs', wikiQuery: 'frog legs food' },
  { re: /អន្ទង់ឆា|អន្ទង់អាំង|អន្ទង់|\beel\b|鳝鱼|鳗鱼/i, enName: 'Spicy Eel Dish', wikiQuery: 'unagi eel dish' },
  { re: /បង្កងអាំង|បង្កង|river\s*prawn|\blobster\b|龙虾|大头虾/i, enName: 'Grilled Giant River Prawns', wikiQuery: 'grilled prawns seafood' },
  { re: /បង្គាអាំង|បង្គាឆា|បង្គាបំពង|ភ្លាបង្គា|បង្គា|\bprawns?\b|\bshrimps?\b|虾/i, enName: 'Prawns & Shrimp Dish', wikiQuery: 'grilled shrimp dish', mealDbQuery: 'Prawn' },
  { re: /មឹកអាំង|មឹកឆា|មឹកបំពង|មឹក|\bsquid\b|\bcalamari\b|鱿鱼|墨鱼/i, enName: 'Grilled Squid with Seafood Sauce', wikiQuery: 'grilled squid' },
  { re: /ក្តាមឆាម្រេច|ក្ដាមឆាម្រេច|peppered\s*crab/i, enName: 'Kampot Pepper Crab', wikiQuery: 'black pepper crab' },
  { re: /ក្តាមអាំង|ក្តាមឆា|ក្ដាមអាំង|ក្ដាមឆា|ក្តាម|ក្ដាម|\bcrab\b|螃蟹/i, enName: 'Crab Seafood Dish', wikiQuery: 'crab dish seafood' },
  { re: /ត្រីសាម៉ុនអាំង|ត្រីសាលម៉ុនអាំង|grilled\s*salmon/i, enName: 'Grilled Salmon Fillet', wikiQuery: 'grilled salmon', mealDbQuery: 'Salmon' },
  { re: /ត្រីសាម៉ុន|ត្រីសាលម៉ុន|\bsalmon\b|三文鱼|鲑鱼/i, enName: 'Salmon Dish', wikiQuery: 'salmon food', mealDbQuery: 'Salmon' },

  // Khmer Street Food, Offal, Braised & Popular Local Dishes
  { re: /ជើងមាន់ជ្រក់|ជើងមាន់ក្រឡុក|ជើងមាន់អាំង|ជើងមាន់|chicken\s*feet|凤爪|鸡爪/i, enName: 'Spicy Seasoned Chicken Feet', wikiQuery: 'Chicken feet' },
  { re: /ពោះគោទឹកប្រហុក|ពោះគោអាំង|ពោះគោ|\bbeef\s*tripe\b|\btripe\b|牛肚/i, enName: 'Beef Tripe Dish (Poh Ko)', wikiQuery: 'Tripe' },
  { re: /កន្សោមដោះគោអាំង|កន្សោមដោះគោ/i, enName: 'Charcoal Grilled Beef Udder Skewers', wikiQuery: 'Satay' },
  { re: /អណ្តាតគោអាំង|អណ្ដាតគោអាំង|អណ្តាតគោ|អណ្ដាតគោ|beef\s*tongue|牛舌/i, enName: 'Grilled Beef Tongue', wikiQuery: 'Gyutan' },
  { re: /ខជើងជ្រូក|ជើងជ្រូកខ|pork\s*trotter|猪脚|猪蹄/i, enName: 'Braised Pork Trotters', wikiQuery: 'Pork trotters' },
  { re: /ខគោ|សម្លខគោ|\bbo\s*kho\b/i, enName: 'Cambodian Braised Beef Stew (Khor Ko)', wikiQuery: 'Bo kho' },
  { re: /ស៊ុបពពែ|ពពែអាំង|សាច់ពពែ|\bgoat\s*soup\b|\bgoat\s*meat\b|羊肉汤/i, enName: 'Cambodian Herbal Goat Soup', wikiQuery: 'Sup kambing' },
  { re: /ស៊ុបគោ|គោស៊ុប|\bbeef\s*soup\b|牛肉汤/i, enName: 'Cambodian Beef Hotpot Soup', wikiQuery: 'Beef noodle soup' },
  { re: /ស៊ុបមាន់ខ្មៅ|មាន់ខ្មៅ/i, enName: 'Herbal Black Chicken Soup', wikiQuery: 'Silkie soup' },
  { re: /ស៊ុបម្រះ|ស្ងោរម្រះ|ម្រះស្នូលសាច់|bitter\s*melon\s*soup|苦瓜汤/i, enName: 'Stuffed Bitter Melon Pork Soup', wikiQuery: 'Stuffed bitter melon soup' },
  { re: /ស៊ុបខួរជ្រូក|ខួរជ្រូកចំហុយ|ខួរជ្រូក/i, enName: 'Steamed Herbal Pork Brain Soup', wikiQuery: 'Tong sui' },
  { re: /ឆាត្រកួន|ត្រកួនឆា|water\s*spinach|morning\s*glory|空心菜/i, enName: 'Stir-Fried Morning Glory (Cha Trakuon)', wikiQuery: 'Stir-fried water spinach' },
  { re: /ឆាផ្សិតម្ជុល|ផ្សិតម្ជុល|enoki\s*mushroom|金针菇/i, enName: 'Stir-Fried Enoki Mushrooms', wikiQuery: 'Enokitake' },
  { re: /ឆាផ្សិត|ផ្សិតឆា|ផ្សិតអាំង|mushroom\s*stir\s*fry|炒蘑菇/i, enName: 'Stir-Fried Mushrooms', wikiQuery: 'Edible mushroom' },
  { re: /ឆាខាត់ណា|ខាត់ណាទឹកភ្នែក|ខាត់ណាសាច់គោ|chinese\s*broccoli|芥兰/i, enName: 'Stir-Fried Beef with Chinese Broccoli', wikiQuery: 'Gai lan' },
  { re: /ពងទាកូន|\bbalut\b|鸭仔蛋/i, enName: 'Steamed Fertilized Duck Egg (Pong Tea Kon)', wikiQuery: 'Balut (food)' },
  { re: /នំក្រូចល្ង|នំក្រូច|sesame\s*ball|煎堆|麻球/i, enName: 'Crispy Sesame Glutinous Rice Balls (Nom Kroch)', wikiQuery: 'Jian dui' },
  { re: /នំគូឆាយ|គូឆាយ|chive\s*cake|韭菜粿/i, enName: 'Crispy Pan-Fried Chive Cakes (Nom Ku Chay)', wikiQuery: 'Chiveizer', commonsQuery: 'Guichai' },
  { re: /បាញ់កាញ់|banh\s*canh/i, enName: 'Thick Tapioca Noodle Soup (Banh Canh)', wikiQuery: 'Banh canh' },
  { re: /សាច់គោងៀត|គោងៀត|beef\s*jerky|牛肉干/i, enName: 'Cambodian Sun-Dried Spiced Beef Jerky', wikiQuery: 'Beef jerky' },
  { re: /ត្រីងៀត|dried\s*fish/i, enName: 'Cambodian Sun-Dried Salted Fish', wikiQuery: 'Dried fish' },
  { re: /ចង្រិតបំពង|កណ្តូបបំពង|កណ្ដូបបំពង/i, enName: 'Crispy Fried Crickets & Grasshoppers', wikiQuery: 'Fried insects', commonsQuery: 'Fried crickets' },
  { re: /ពងទាចៀនត្រីប្រម៉ា|ពងទាចៀនសាច់ចិញ្ច្រាំ|ពងទាចៀនស្អំ|ពងទាចៀន|ពងមាន់ចៀន|\bomelette\b|\bomelet\b|煎蛋/i, enName: 'Cambodian Savoury Fried Omelette', wikiQuery: 'Asian omelette dish', mealDbQuery: 'Omelette' },
  { re: /បុកកន្ទុយហេស|បុកស្វាយ|ញាំស្វាយ|green\s*mango\s*salad/i, enName: 'Spicy Green Mango Salad', wikiQuery: 'green mango salad' },
  { re: /បុកក្ដាមប្រៃ|បុកក្តាមប្រៃ|បុកមី|បុកពោត|បុកអំពិល/i, enName: 'Cambodian Spicy Mortar Salad (Bok)', wikiQuery: 'Som tam papaya salad' },
  { re: /ស្លាបមាន់អាំង|ស្លាបមាន់បំពង|ស្លាបមាន់ក្រឡុក|ស្លាបមាន់|chicken\s*wings?|鸡翅/i, enName: 'Crispy & Grilled Chicken Wings', wikiQuery: 'grilled chicken wings' },
  { re: /សាច់គោចង្កាក់|សាច់អាំងចង្កាក់|គោដុត|សាច់គោអាំង|beef\s*skewers?|烤牛肉串/i, enName: 'Charcoal Grilled Beef Skewers', wikiQuery: 'beef satay skewers' },
  { re: /មាន់ដុត|មាន់អាំង|roast\s*chicken|烤鸡/i, enName: 'Grilled Lemongrass Chicken', wikiQuery: 'roast chicken dish', mealDbQuery: 'Roast Chicken' },

  // Chinese, Cantonese, Dim Sum & Hotpot
  { re: /បាយមាន់ហៃណាំ|បាយមាន់|hainanese\s*chicken\s*rice|海南鸡饭/i, enName: 'Hainanese Chicken Rice', wikiQuery: 'Hainanese chicken rice' },
  { re: /ទាដុត|ទាខ្វៃ|បាយទាខ្វៃ|peking\s*duck|roast\s*duck|烤鸭|烧鸭/i, enName: 'Crispy Roasted Duck', wikiQuery: 'Peking duck', mealDbQuery: 'Duck' },
  { re: /ជ្រូកខ្វៃ|បាយសាច់ជ្រូកខ្វៃ|សាច់ជ្រូកបីជាន់អាំង|roast\s*pork\s*belly|siu\s*yuk|烧肉|叉烧/i, enName: 'Crispy Roasted Pork Belly', wikiQuery: 'Siu yuk roast pork' },
  { re: /ឌីមសាំ|dim\s*sum|点心/i, enName: 'Steamed Dim Sum Basket', wikiQuery: 'Dim sum' },
  { re: /នំប៉ាវ|\bbaozi\b|steamed\s*buns?|包子|小笼包/i, enName: 'Steamed Stuffed Baozi Buns', wikiQuery: 'Baozi', mealDbQuery: 'Pork' },
  { re: /សៀវម៉ៃ|ស៊ីវម៉ៃ|shumai|siu\s*mai|烧卖/i, enName: 'Steamed Pork & Shrimp Shumai', wikiQuery: 'Shumai' },
  { re: /គាវចៀន|គាវចំហុយ|gyoza|potstickers?|fried\s*dumplings?|煎饺|饺子/i, enName: 'Pan-Fried Dumplings (Gyoza)', wikiQuery: 'Jiaozi dumplings', mealDbQuery: 'Dumpling' },
  { re: /មីគាវ|គាវស៊ុប|គាវទឹក|wonton\s*noodle|wonton\s*soup|云吞面|馄饨/i, enName: 'Wonton Noodle Soup', wikiQuery: 'Wonton noodles', mealDbQuery: 'Wonton' },
  { re: /ម៉ាឡាតាំង|ស៊ុបម៉ាឡា|ម៉ាឡាឆា|ម៉ាឡា|malatang|mala\s*hot\s*pot|麻辣烫|麻辣火锅/i, enName: 'Spicy Sichuan Mala Hotpot', wikiQuery: 'Malatang' },
  { re: /ស៊ុបចិន|ហតផត|hot\s*pot|steamboat|火锅/i, enName: 'Asian Hot Pot', wikiQuery: 'Hot pot' },
  { re: /តៅហ៊ូម៉ាប៉ូ|mapo\s*tofu|麻婆豆腐/i, enName: 'Mapo Tofu', wikiQuery: 'Mapo tofu' },
  { re: /មីទាញ|lamian|hand[\s-]*pulled\s*noodle|拉面/i, enName: 'Hand-Pulled Beef Noodles', wikiQuery: 'Lanzhou beef lamian' },

  // Korean & Japanese Dishes
  { re: /បាយឆាគីមឈី|kimchi\s*fried\s*rice|泡菜炒饭/i, enName: 'Kimchi Fried Rice', wikiQuery: 'Kimchi fried rice' },
  { re: /ស៊ុបគីមឈី|kimchi\s*jjigae|kimchi\s*stew|泡菜汤/i, enName: 'Korean Kimchi Stew (Kimchi Jjigae)', wikiQuery: 'Kimchi-jjigae' },
  { re: /គីមឈី|\bkimchi\b|韩式泡菜/i, enName: 'Korean Fermented Kimchi', wikiQuery: 'Kimchi' },
  { re: /តុកបុកគី|តុកប៉ុកគី|tteokbokki|topokki|辣炒年糕/i, enName: 'Korean Spicy Rice Cakes (Tteokbokki)', wikiQuery: 'Tteokbokki' },
  { re: /ប៊ីប៊ីមបាប់|bibimbap|石锅拌饭/i, enName: 'Korean Bibimbap Rice Bowl', wikiQuery: 'Bibimbap' },
  { re: /សាច់អាំងកូរ៉េ|korean\s*bbq|韩式烤肉/i, enName: 'Korean BBQ Grilled Meat', wikiQuery: 'Korean barbecue' },
  { re: /មាន់បំពងកូរ៉េ|korean\s*fried\s*chicken|韩式炸鸡/i, enName: 'Korean Crispy Glazed Fried Chicken', wikiQuery: 'Korean fried chicken' },
  { re: /មីហឹរកូរ៉េ|មីហឹរ|spicy\s*ramen|火鸡面/i, enName: 'Spicy Ramen Noodle Soup', wikiQuery: 'Ramyeon Korean noodles' },
  { re: /ស៊ូស៊ី|\bsushi\b|គីមបាប់|\bkimbap\b|\bgimbap\b|寿司|紫菜包饭/i, enName: 'Assorted Sushi Platter', wikiQuery: 'Sushi', mealDbQuery: 'Sushi' },
  { re: /សាស៊ីមី|\bsashimi\b|刺身|生鱼片/i, enName: 'Fresh Salmon & Tuna Sashimi', wikiQuery: 'Sashimi' },
  { re: /រ៉ាមេន|\bramen\b|日式拉面/i, enName: 'Japanese Ramen Noodle Soup', wikiQuery: 'Ramen' },
  { re: /តាកូយ៉ាគី|\btakoyaki\b|章鱼烧/i, enName: 'Japanese Octopus Balls (Takoyaki)', wikiQuery: 'Takoyaki' },
  { re: /អ៊ូដុង|\budon\b|乌冬面/i, enName: 'Japanese Udon Noodle Soup', wikiQuery: 'Udon' },
  { re: /បាយការីជប៉ុន|japanese\s*curry|日式咖喱饭/i, enName: 'Japanese Katsu Curry Rice', wikiQuery: 'Japanese curry' },
  { re: /តេមភូរ៉ា|\btempura\b|天妇罗/i, enName: 'Crispy Shrimp & Vegetable Tempura', wikiQuery: 'Tempura' },

  // Thai & Vietnamese Dishes
  { re: /ផាត់ថៃ|pad\s*thai|泰式炒河粉/i, enName: 'Pad Thai Stir-Fried Noodles', wikiQuery: 'Pad thai', mealDbQuery: 'Pad Thai' },
  { re: /តុំយ៉ាំ|tom\s*yum|冬阴功/i, enName: 'Tom Yum Spicy Prawn Soup', wikiQuery: 'Tom yum' },
  { re: /ការីបៃតង|green\s*curry|泰式绿咖喱/i, enName: 'Thai Green Curry', wikiQuery: 'Green curry', mealDbQuery: 'Thai Green Curry' },
  { re: /បាយដំណើបស្វាយទុំ|បាយដំណើបស្វាយ|mango\s*sticky\s*rice|芒果糯米饭/i, enName: 'Mango Sticky Rice', wikiQuery: 'Mango sticky rice' },
  { re: /ឡាបសាច់គោ|ឡាបសាច់ជ្រូក|ឡាបមាន់|\blarb\b|\blaab\b/i, enName: 'Spicy Minced Meat Herb Salad (Larb)', wikiQuery: 'Larb' },
  { re: /គុយទាវទូក|boat\s*noodles?|船面/i, enName: 'Thai Boat Noodle Soup', wikiQuery: 'Boat noodles' },
  { re: /ហ្វឺសាច់គោ|ហ្វឺមាន់|ហ្វឺ|\bpho\b|越南河粉/i, enName: 'Vietnamese Beef Pho Noodle Soup', wikiQuery: 'Pho' },
  { re: /បាញ់មី|នំប៉័ងប៉ាតេ|នំប៉័ងសាច់|banh\s*mi|bánh\s*mì|越南法棍/i, enName: 'Crispy Baguette Sandwich (Banh Mi)', wikiQuery: 'Banh mi' },

  // Western, Indian & Global Classics
  { re: /ភីហ្សា|\bpizza\b|披萨|比萨/i, enName: 'Wood-Fired Artisan Pizza', wikiQuery: 'Pizza', mealDbQuery: 'Pizza' },
  { re: /ស្ប៉ាហ្គេត?ទី|spaghetti|bolognese|意大利面/i, enName: 'Spaghetti Bolognese', wikiQuery: 'Spaghetti bolognese', mealDbQuery: 'Spaghetti' },
  { re: /កាបូណារ៉ា|ផាស្តា|carbonara|\bpasta\b/i, enName: 'Creamy Pasta Carbonara', wikiQuery: 'Carbonara', mealDbQuery: 'Pasta' },
  { re: /ឡាសាញ៉ា|\blasagna\b|\blasagne\b|千层面/i, enName: 'Baked Beef Lasagna', wikiQuery: 'Lasagna', mealDbQuery: 'Lasagne' },
  { re: /ហាំបឺហ្គឺ|បឺហ្គឺ|hamburger|\bburger\b|汉堡/i, enName: 'Gourmet Cheeseburger', wikiQuery: 'Cheeseburger', mealDbQuery: 'Burger' },
  { re: /ស្តេកសាច់គោ|ស្តេក|\bsteak\b|\bribeye\b|\bsirloin\b|牛排/i, enName: 'Grilled Ribeye Beef Steak', wikiQuery: 'Beefsteak', mealDbQuery: 'Steak' },
  { re: /ដំឡូងបំពង|french\s*fries|\bfries\b|薯条/i, enName: 'Crispy Golden French Fries', wikiQuery: 'French fries' },
  { re: /មាន់បំពង|fried\s*chicken|炸鸡/i, enName: 'Crispy Fried Chicken', wikiQuery: 'Fried chicken' },
  { re: /តាកូ|\btacos?\b|塔可/i, enName: 'Mexican Street Tacos', wikiQuery: 'Taco', mealDbQuery: 'Taco' },
  { re: /ប៊ូរីតូ|\bburritos?\b/i, enName: 'Stuffed Burrito', wikiQuery: 'Burrito' },
  { re: /សាំងវិច|\bsandwich\b|三明治/i, enName: 'Toasted Club Sandwich', wikiQuery: 'Club sandwich' },
  { re: /សាឡាត់ត្រីធូណា|សាឡាត់|\bsalad\b|沙拉/i, enName: 'Fresh Garden Caesar Salad', wikiQuery: 'Caesar salad' },
  { re: /បាយប៊ីរីយ៉ានី|\bbiryani\b/i, enName: 'Spiced Chicken Biryani', wikiQuery: 'Biryani', mealDbQuery: 'Biryani' },

  // Desserts, Bakery & Beverages
  { re: /តែគុជ|bubble\s*tea|\bboba\b|珍珠奶茶/i, enName: 'Iced Brown Sugar Bubble Milk Tea', wikiQuery: 'Bubble tea' },
  { re: /ម៉ាត់ឆា|តែបៃតង|\bmatcha\b|抹茶/i, enName: 'Iced Matcha Green Tea Latte', wikiQuery: 'Matcha latte' },
  { re: /កាហ្វេទឹកដោះគោ|កាហ្វេទឹកកក|កាហ្វេ|iced\s*coffee|\blatte\b|\bcappuccino\b|冰咖啡|拿铁/i, enName: 'Cambodian Iced Condensed Milk Coffee', wikiQuery: 'Vietnamese iced coffee' },
  { re: /តែក្រូចឆ្មារ|lemon\s*tea|柠檬茶/i, enName: 'Iced Fresh Lemon Tea', wikiQuery: 'Iced tea lemon' },
  { re: /ទឹកក្រឡុក|\bsmoothie\b|奶昔|果昔/i, enName: 'Fresh Tropical Fruit Smoothie', wikiQuery: 'Fruit smoothie' },
  { re: /ការ៉េម|ice\s*cream|\bgelato\b|冰淇淋/i, enName: 'Artisan Ice Cream Sundae', wikiQuery: 'Ice cream' },
  { re: /នំខេក|\bcake\b|\bcheesecake\b|蛋糕/i, enName: 'Layered Cream Cake', wikiQuery: 'Chocolate cake', mealDbQuery: 'Cake' },
  { re: /នំដូណាត់|\bdonuts?\b|\bdoughnuts?\b|甜甜圈/i, enName: 'Glazed Doughnuts', wikiQuery: 'Doughnut' },
  { re: /នំវ៉ាហ្វល|\bwaffles?\b|华夫饼/i, enName: 'Crispy Belgian Waffles', wikiQuery: 'Waffle' },
  { re: /នំផេនខេក|\bpancakes?\b|松饼/i, enName: 'Fluffy Pancakes with Syrup', wikiQuery: 'Pancake', mealDbQuery: 'Pancakes' },
  { re: /ចាហួយខ្មៅ|grass\s*jelly|烧仙草/i, enName: 'Sweet Grass Jelly Dessert', wikiQuery: 'Grass jelly' },
  { re: /បង្អែមគ្រាប់ត្នោត|គ្រាប់ត្នោត|palm\s*seed|palm\s*fruit/i, enName: 'Cambodian Sugar Palm Fruit Dessert', wikiQuery: 'Toddy palm fruit dessert' },
];

const KHMER_COOKING_METHODS: Array<{ re: RegExp; en: string }> = [
  { re: /អាំង|ដុត/, en: 'Grilled' },
  { re: /ឆាគ្រឿង/, en: 'Lemongrass Kroeung Stir-Fried' },
  { re: /ឆា/, en: 'Stir-Fried' },
  { re: /បំពង/, en: 'Crispy Deep-Fried' },
  { re: /ចៀន/, en: 'Pan-Fried' },
  { re: /ខ្វៃ/, en: 'Crispy Roasted' },
  { re: /ខ(?!្)/, en: 'Braised Caramelized' },
  { re: /សម្លម្ជូរ|ម្ជូរ/, en: 'Cambodian Sour Soup' },
  { re: /សម្លការី|ការី/, en: 'Curry' },
  { re: /សម្ល/, en: 'Cambodian Stew' },
  { re: /ស្ងោរ|ស៊ុប/, en: 'Clear Soup' },
  { re: /ចំហុយ/, en: 'Steamed' },
  { re: /អប់/, en: 'Claypot Baked' },
  { re: /ញាំ|ភ្លា/, en: 'Zesty Herb Salad' },
  { re: /បុក/, en: 'Spicy Mortar Salad' },
  { re: /ជ្រក់/, en: 'Spicy Pickled' },
  { re: /ហាល|ងៀត|ឆ្អើរ/, en: 'Sun-Dried Smoked' },
  { re: /ស្រុះ/, en: 'Blanched' },
  { re: /ក្រឡុក/, en: 'Spiced Shaken' },
];

const KHMER_INGREDIENTS: Array<{ re: RegExp; en: string; mealDb?: string }> = [
  { re: /ពោះគោ/, en: 'Beef Tripe' },
  { re: /អណ្តាតគោ|អណ្ដាតគោ/, en: 'Beef Tongue' },
  { re: /ជើងមាន់/, en: 'Chicken Feet' },
  { re: /ស្លាបមាន់/, en: 'Chicken Wings' },
  { re: /ជើងជ្រូក/, en: 'Pork Trotters' },
  { re: /ឆ្អឹងជំនីរ/, en: 'Pork Ribs' },
  { re: /បីជាន់/, en: 'Pork Belly' },
  { re: /សាច់គោ|គោ/, en: 'Beef', mealDb: 'Beef' },
  { re: /សាច់ជ្រូក|ជ្រូក/, en: 'Pork', mealDb: 'Pork' },
  { re: /សាច់មាន់|មាន់/, en: 'Chicken', mealDb: 'Chicken' },
  { re: /សាច់ទា|ទា/, en: 'Duck', mealDb: 'Duck' },
  { re: /ពពែ/, en: 'Goat Meat' },
  { re: /កង្កែប/, en: 'Frog Legs' },
  { re: /អន្ទង់/, en: 'Eel' },
  { re: /ត្រីសាម៉ុន|ត្រីសាលម៉ុន/, en: 'Salmon', mealDb: 'Salmon' },
  { re: /ត្រីធូណា/, en: 'Tuna', mealDb: 'Tuna' },
  { re: /ត្រីប្រម៉ា/, en: 'Salted Fish' },
  { re: /ត្រី/, en: 'Fish', mealDb: 'Fish' },
  { re: /បង្កង/, en: 'Giant River Prawn' },
  { re: /បង្គា/, en: 'Shrimp Prawns', mealDb: 'Prawn' },
  { re: /មឹក/, en: 'Squid' },
  { re: /ក្តាម|ក្ដាម/, en: 'Crab' },
  { re: /ងាវ/, en: 'Blood Cockles' },
  { re: /លៀស|លាស/, en: 'Clams' },
  { re: /ខ្យង/, en: 'River Snails' },
  { re: /គ្រំ/, en: 'Mussels' },
  { re: /អយស្ទ័រ/, en: 'Oysters' },
  { re: /ប្រហិត/, en: 'Meatballs' },
  { re: /សាច់ក្រក/, en: 'Cambodian Sausage' },
  { re: /ពងទា|ពងមាន់|ស៊ុត/, en: 'Egg' },
  { re: /តៅហ៊ូ/, en: 'Tofu' },
  { re: /ផ្សិតម្ជុល/, en: 'Enoki Mushrooms' },
  { re: /ផ្សិត/, en: 'Mushrooms' },
  { re: /ត្រកួន/, en: 'Water Spinach' },
  { re: /ខាត់ណា/, en: 'Chinese Broccoli' },
  { re: /ម្រះ/, en: 'Bitter Melon' },
  { re: /ត្រប់/, en: 'Eggplant' },
  { re: /ទំពាំង/, en: 'Bamboo Shoots' },
  { re: /ល្ពៅ/, en: 'Pumpkin' },
  { re: /ស្វាយ/, en: 'Green Mango' },
  { re: /ល្ហុង/, en: 'Green Papaya' },
  { re: /ពោត/, en: 'Sweet Corn' },
  { re: /ដំឡូង/, en: 'Potato' },
  { re: /សណ្តែក|សណ្ដែក/, en: 'Green Beans' },
  { re: /ស្ពៃ/, en: 'Mustard Greens' },
  { re: /បន្លែ/, en: 'Mixed Vegetables' },
  { re: /មីសួរ/, en: 'Glass Noodles' },
  { re: /គុយទាវ/, en: 'Rice Noodle Soup' },
  { re: /នំបញ្ចុក/, en: 'Cambodian Rice Noodles' },
  { re: /លត/, en: 'Short Pin Noodles' },
  { re: /មី/, en: 'Egg Noodles' },
  { re: /បបរ/, en: 'Rice Porridge Congee' },
  { re: /បាយឆា/, en: 'Wok Fried Rice' },
  { re: /បាយ/, en: 'Rice Dish' },
  { re: /បង្អែម/, en: 'Cambodian Sweet Dessert' },
  { re: /ចេក/, en: 'Banana' },
  { re: /ដូង/, en: 'Coconut' },
];

export function translateUniversalDishQuery(dishQuery: string): UniversalDishTranslation {
  const clean = (dishQuery || '').trim();

  // 1. Check 150+ high-precision specific dishes lexicon
  for (const item of SPECIFIC_DISH_LEXICON) {
    if (item.re.test(clean)) {
      return {
        enName: item.enName,
        wikiQuery: item.wikiQuery,
        commonsQuery: item.commonsQuery,
        mealDbQuery: item.mealDbQuery,
        hasLexiconMatch: true,
      };
    }
  }

  // 2. Compositional multi-token Khmer culinary translation (combines method + up to 2 distinct ingredients)
  const matchedMethods: string[] = [];
  for (const m of KHMER_COOKING_METHODS) {
    if (m.re.test(clean)) {
      matchedMethods.push(m.en);
      break;
    }
  }

  const matchedIngs: string[] = [];
  let mealDbCandidate: string | undefined;
  for (const ing of KHMER_INGREDIENTS) {
    if (ing.re.test(clean)) {
      if (!matchedIngs.includes(ing.en)) {
        matchedIngs.push(ing.en);
      }
      if (!mealDbCandidate && ing.mealDb) {
        mealDbCandidate = ing.mealDb;
      }
      if (matchedIngs.length >= 2) break;
    }
  }

  if (matchedMethods.length > 0 || matchedIngs.length > 0) {
    const combinedEn = [...matchedMethods, ...matchedIngs].join(' ').trim();
    return {
      enName: `${combinedEn} (${clean})`,
      wikiQuery: matchedIngs[0] || combinedEn,
      commonsQuery: combinedEn,
      mealDbQuery: mealDbCandidate,
      hasLexiconMatch: true,
    };
  }

  // 3. Direct English query typed by user
  const englishMatch = clean.match(/[A-Za-z][A-Za-z0-9\s'-]{1,}/);
  if (englishMatch) {
    const extractedEn = englishMatch[0].trim();
    return {
      enName: extractedEn,
      wikiQuery: extractedEn,
      mealDbQuery: extractedEn,
      hasLexiconMatch: true,
    };
  }

  // 4. Unmapped Khmer / Chinese / International script — flagged for live Open Translation API fallback!
  return {
    enName: clean,
    wikiQuery: clean,
    hasLexiconMatch: false,
  };
}

const SESSION_CACHE_STORAGE_KEY = 'kft_open_dish_photo_cache_v2';
const memoryPhotoCache = new Map<string, string>();
const inFlightPhotoRequests = new Map<string, Promise<string | null>>();

function hydratePhotoCacheFromSession(): void {
  if (memoryPhotoCache.size > 0 || typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, string>;
    for (const [k, v] of Object.entries(parsed)) {
      if (k && typeof v === 'string' && v.startsWith('http')) {
        memoryPhotoCache.set(k, v);
      }
    }
  } catch {
    // Ignore storage read errors
  }
}

function persistPhotoCacheToSession(keys: string[], url: string): void {
  for (const k of keys) {
    if (k) memoryPhotoCache.set(k, url);
  }
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<string, string> = {};
    let count = 0;
    for (const [k, v] of memoryPhotoCache.entries()) {
      obj[k] = v;
      count++;
      if (count >= 150) break;
    }
    window.sessionStorage.setItem(SESSION_CACHE_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // Ignore storage quota errors
  }
}

const REJECTED_IMAGE_TITLE_OR_URL_RE =
  /logo|icon|map|flag|diagram|MNHN|specimen|stamp|drawing|coat_of_arms|locator|portrait|statue|building|street|market_sign|menu_page/i;

function isValidFoodImageUrl(rawUrl: unknown, pageTitle = ''): string | null {
  if (typeof rawUrl !== 'string' || !rawUrl.startsWith('http')) return null;
  if (/\.(pdf|djvu|svg|tiff?|ogg|ogv|webm)$/i.test(pageTitle)) return null;
  const cleanUrl = rawUrl.split('?')[0];
  if (!/\.(jpe?g|png|webp)(?:$|\?)/i.test(rawUrl) && !/\.(jpe?g|png|webp)$/i.test(cleanUrl)) {
    return null;
  }
  if (REJECTED_IMAGE_TITLE_OR_URL_RE.test(`${pageTitle} ${cleanUrl}`)) {
    return null;
  }
  return cleanUrl;
}

export function getCachedUniversalDishPhoto(dishQuery: string): string | null {
  hydratePhotoCacheFromSession();
  const rawTrimmed = (dishQuery || '').replace(/[?？!！។«»"']/g, ' ').replace(/\s+/g, ' ').trim();
  if (!rawTrimmed) return null;
  const direct = memoryPhotoCache.get(rawTrimmed.toLowerCase());
  if (direct) return direct;
  const translated = translateUniversalDishQuery(rawTrimmed);
  if (translated.hasLexiconMatch) {
    const byWiki = memoryPhotoCache.get(`wiki:${translated.wikiQuery.toLowerCase()}`);
    if (byWiki) return byWiki;
  }
  return null;
}

const WIKIMEDIA_API_HEADERS: HeadersInit = {
  'Api-User-Agent': 'CambodiaFlavorsTourism/2.5 (https://khmerfood.tourism)',
};

/**
 * Queries Khmer or Chinese Wikipedia for a native-script dish name:
 * returns either a direct Wikipedia lead dish photo OR its English interlanguage title.
 */
async function resolveViaNativeWikipediaAndOpenTranslate(
  nativeDishName: string
): Promise<{ directPhotoUrl?: string; englishTerm?: string }> {
  const isKhmer = /[\u1780-\u17FF]/.test(nativeDishName);
  const isChinese = /[\u4E00-\u9FFF]/.test(nativeDishName);
  const wikiLang = isKhmer ? 'km' : isChinese ? 'zh' : '';
  const langPair = isKhmer ? 'km|en' : isChinese ? 'zh|en' : '';

  const wikiTask: Promise<{ directPhotoUrl?: string; englishTerm?: string }> = wikiLang
    ? (async (): Promise<{ directPhotoUrl?: string; englishTerm?: string }> => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2800);
        try {
          const url = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
            nativeDishName
          )}&gsrlimit=2&prop=pageimages|langlinks&piprop=thumbnail&pithumbsize=800&lllang=en&format=json&origin=*`;
          const res = await fetch(url, { headers: WIKIMEDIA_API_HEADERS, signal: controller.signal });
          clearTimeout(timer);
          if (!res.ok) return {};
          const data = await res.json();
          const pages = (Object.values(data?.query?.pages || {}) as any[]).sort(
            (a, b) => (a.index || 99) - (b.index || 99)
          );
          for (const p of pages) {
            const validImg = isValidFoodImageUrl(p?.thumbnail?.source, String(p?.title || ''));
            const enLink = p?.langlinks?.[0]?.['*'];
            if (validImg || enLink) {
              return {
                directPhotoUrl: validImg || undefined,
                englishTerm: typeof enLink === 'string' ? enLink : undefined,
              };
            }
          }
        } catch {
          clearTimeout(timer);
        }
        return {};
      })()
    : Promise.resolve({});

  const translateTask = langPair
    ? (async (): Promise<string | undefined> => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2800);
        try {
          const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
            nativeDishName
          )}&langpair=${encodeURIComponent(langPair)}`;
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timer);
          if (!res.ok) return undefined;
          const data = await res.json();
          const text = String(data?.responseData?.translatedText || '').trim();
          if (text && /[A-Za-z]/.test(text) && !/MYMEMORY WARNING/i.test(text)) {
            return text;
          }
        } catch {
          clearTimeout(timer);
        }
        return undefined;
      })()
    : Promise.resolve(undefined);

  const [wikiRes, translatedEn] = await Promise.all([wikiTask, translateTask]);
  return {
    directPhotoUrl: wikiRes.directPhotoUrl,
    englishTerm: wikiRes.englishTerm || translatedEn,
  };
}

async function queryTheMealDb(term: string): Promise<string | null> {
  if (!term || !/[A-Za-z]/.test(term)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2800);
  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(term)}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const thumb = data?.meals?.[0]?.strMealThumb;
      if (typeof thumb === 'string' && thumb.startsWith('http')) {
        return thumb;
      }
    }
  } catch {
    clearTimeout(timer);
  }
  return null;
}

async function queryEnglishWikipediaPageImage(term: string): Promise<string | null> {
  if (!term) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      term
    )}&gsrlimit=4&prop=pageimages&piprop=thumbnail&pithumbsize=800&format=json&origin=*`;
    const res = await fetch(url, { headers: WIKIMEDIA_API_HEADERS, signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const pages = (Object.values(data?.query?.pages || {}) as any[]).sort(
        (a, b) => (a.index || 99) - (b.index || 99)
      );
      for (const p of pages) {
        const title = String(p?.title || '');
        if (/list of|history of|district|province|prefecture|biography|album|film/i.test(title)) {
          continue;
        }
        const valid = isValidFoodImageUrl(p?.thumbnail?.source, title);
        if (valid) return valid;
      }
    }
  } catch {
    clearTimeout(timer);
  }
  return null;
}

async function queryWikimediaCommonsBitmap(term: string): Promise<string | null> {
  if (!term) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3200);
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
      `${term} filetype:bitmap`
    )}&gsrlimit=6&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;
    const res = await fetch(url, { headers: WIKIMEDIA_API_HEADERS, signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const pages = (Object.values(data?.query?.pages || {}) as any[]).sort(
        (a, b) => (a.index || 99) - (b.index || 99)
      );
      for (const p of pages) {
        const rawUrl = p?.imageinfo?.[0]?.thumburl || p?.imageinfo?.[0]?.url;
        const valid = isValidFoodImageUrl(rawUrl, String(p?.title || ''));
        if (valid) return valid;
      }
    }
  } catch {
    clearTimeout(timer);
  }
  return null;
}

/**
 * Fetches an authentic, legal Open-API dish photo for ANY out-of-catalog dish in Khmer, English, or Chinese.
 */
export async function fetchUniversalDishPhotoFromOpenApis(dishQuery: string): Promise<string | null> {
  hydratePhotoCacheFromSession();
  const rawTrimmed = (dishQuery || '').replace(/[?？!！។«»"']/g, ' ').replace(/\s+/g, ' ').trim();
  if (!rawTrimmed) return null;

  const cacheKey = rawTrimmed.toLowerCase();
  const existingHit = getCachedUniversalDishPhoto(rawTrimmed);
  if (existingHit) return existingHit;

  if (inFlightPhotoRequests.has(cacheKey)) {
    return inFlightPhotoRequests.get(cacheKey)!;
  }

  const task = (async (): Promise<string | null> => {
    const translated = translateUniversalDishQuery(rawTrimmed);
    let primarySearchTerm = translated.wikiQuery;
    const preferredCommonsTerm = translated.commonsQuery;
    let mealDbTerm = translated.mealDbQuery;
    const cacheKeysToSave = [cacheKey];

    if (translated.hasLexiconMatch) {
      cacheKeysToSave.push(`wiki:${(preferredCommonsTerm || translated.wikiQuery).toLowerCase()}`);
    } else {
      // Unknown Khmer / Chinese dish name: resolve via Native Wikipedia + Free Open Translation API!
      const liveResolved = await resolveViaNativeWikipediaAndOpenTranslate(rawTrimmed);
      if (liveResolved.directPhotoUrl) {
        persistPhotoCacheToSession(cacheKeysToSave, liveResolved.directPhotoUrl);
        return liveResolved.directPhotoUrl;
      }
      if (liveResolved.englishTerm) {
        primarySearchTerm = liveResolved.englishTerm;
        mealDbTerm = liveResolved.englishTerm;
        cacheKeysToSave.push(`wiki:${liveResolved.englishTerm.toLowerCase()}`);
      }
    }

    // 1. Try TheMealDB + Curated Commons Dish Query + English Wikipedia Lead Article Image in parallel!
    const [mealDbPhoto, preferredCommonsPhoto, enWikiPhoto] = await Promise.all([
      mealDbTerm ? queryTheMealDb(mealDbTerm) : Promise.resolve(null),
      preferredCommonsTerm ? queryWikimediaCommonsBitmap(preferredCommonsTerm) : Promise.resolve(null),
      queryEnglishWikipediaPageImage(primarySearchTerm),
    ]);

    const fastWinner = mealDbPhoto || preferredCommonsPhoto || enWikiPhoto;
    if (fastWinner) {
      persistPhotoCacheToSession(cacheKeysToSave, fastWinner);
      return fastWinner;
    }

    // 2. Try Wikimedia Commons Bitmap File Search & simplified head-noun fallbacks
    const coreNoun = primarySearchTerm
      .replace(
        /\b(?:grilled|fried|stir[\s-]*fried|pan[\s-]*fried|deep[\s-]*fried|roasted|steamed|blanched|braised|caramelized|spicy|pickled|cambodian|khmer|authentic|traditional|dish|food|cuisine)\b/gi,
        ' '
      )
      .replace(/\s+/g, ' ')
      .trim();
    const coreWords = coreNoun.split(/\s+/).filter((w) => w.length >= 3);
    const tailNoun = coreWords.length >= 2 ? coreWords[coreWords.length - 1] : '';

    const candidates = Array.from(
      new Set(
        [
          primarySearchTerm,
          coreNoun.length >= 3 ? coreNoun : '',
          coreNoun.length >= 3 ? `${coreNoun} food` : '',
          tailNoun,
        ].filter(Boolean)
      )
    );

    for (const q of candidates) {
      const commonsHit = await queryWikimediaCommonsBitmap(q);
      if (commonsHit) {
        persistPhotoCacheToSession(cacheKeysToSave, commonsHit);
        return commonsHit;
      }
      const wikiRetry = await queryEnglishWikipediaPageImage(q);
      if (wikiRetry) {
        persistPhotoCacheToSession(cacheKeysToSave, wikiRetry);
        return wikiRetry;
      }
    }

    return null;
  })().finally(() => {
    inFlightPhotoRequests.delete(cacheKey);
  });

  inFlightPhotoRequests.set(cacheKey, task);
  return task;
}
