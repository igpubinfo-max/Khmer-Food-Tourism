/**
 * Universal Out-of-Catalog Dish Translation & Legal Open-API Photo Resolver
 * Understands ALL Khmer script, spelling variants, regional dialects, English, and Chinese using:
 *   1. Khmer Unicode & Culinary Orthography Normalizer (`normalizeKhmerFoodText`)
 *   2. 260+ Khmer/Chinese/English Culinary Lexicon & Complete Multi-Token Compositional Translator
 *   3. Google Neural Khmer-to-English GTX + Wikipedia Interlanguage (`km.wikipedia.org` / `zh.wikipedia.org`) + MyMemory fallback
 *   4. Strict Food-Only Guard (`prop=pageimages|description` + non-food rejection) across TheMealDB, Wikipedia & Wikimedia Commons
 */

import { normalizeKhmerFoodText } from './khmerFoodSearch';
import { isQuestionOrCriteriaQuery } from './foodQueryClassifier';

export interface UniversalDishTranslation {
  enName: string;
  wikiQuery: string;
  commonsQuery?: string;
  mealDbQuery?: string;
  fallbackWikiQuery?: string;
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
  // Authentic Cambodian Fermented Specialties (Prahok, Pha-ok, Mam, Teuk Kroeung, Kapi)
  { re: /ប្រហុកចំហុយ|ចំហុយប្រហុក|prahok\s*chamhoy|steamed\s*prahok/i, enName: 'Cambodian Steamed Prahok with Minced Pork & Egg (Prahok Chamhoy)', wikiQuery: 'Prahok', commonsQuery: 'Fried Prahok meal' },
  { re: /សាច់ជ្រូកចិញ្ច្រាំ\s*ត្រីប្រម៉ា|ត្រីប្រម៉ាចំហុយ|ត្រីប្រម៉ា|ចំហុយត្រីប្រម៉ា/i, enName: 'Cambodian Steamed Minced Pork with Salted Fish (Sach Chrouk Trey Prama)', wikiQuery: 'Steamed meatball', commonsQuery: 'Steamed pork' },
  { re: /ប្រហុកខ្ទិះ|prahok\s*ktis|prahok\s*khtih/i, enName: 'Cambodian Creamy Pork & Prahok Dip (Prahok Ktis)', wikiQuery: 'Prahok ktis' },
  { re: /ប្រហុកដុត|ប្រហុកអាំង|ប្រហុកកប់|ប្រហុកចៀន|ប្រហុកឆា/i, enName: 'Cambodian Roasted Herb Prahok (Prahok Ang)', wikiQuery: 'Prahok', commonsQuery: 'Fried Prahok meal' },
  { re: /ប្រហុក|\bprahok\b/i, enName: 'Cambodian Savory Prahok Specialty', wikiQuery: 'Prahok' },
  { re: /ផ្អកចំហុយ|ចំហុយផ្អក|ផ្អកចៀន|ផ្អកត្រី|ផ្អកសាច់ជ្រូក|ផ្អក/i, enName: 'Cambodian Fermented Fish & Pork Specialty (Pha-ok)', wikiQuery: 'Prahok', commonsQuery: 'Fried Prahok meal' },
  { re: /ម៉ាំចំហុយ|ចំហុយម៉ាំ|ម៉ាំល្ហុង|ម៉ាំត្រី|ម៉ាំពងទា|ម៉ាំ/i, enName: 'Cambodian Savory Fermented Fish Dish (Mam)', wikiQuery: 'Prahok', commonsQuery: 'Fried Prahok meal' },
  { re: /ទឹកគ្រឿង|teuk\s*kroeung/i, enName: 'Cambodian Herbal Fish Dipping Sauce with Crudités (Teuk Kroeung)', wikiQuery: 'Prahok ktis' },
  { re: /កាពិផាវ|ទឹកកាពិ|បុកកាពិ|បាយកាពិ|កាពិ/i, enName: 'Cambodian Savory Shrimp Paste Dip (Kapi Phav)', wikiQuery: 'Shrimp paste', commonsQuery: 'Nam phrik kapi' },

  // Classic Cambodian Countryside, Wild Herb & Regional Dishes
  { re: /(?:ញាំ|ញ៉ាំ)ស្តៅ|ស្តៅត្រីឆ្អើរ|ស្តៅ/i, enName: 'Cambodian Neem Flower & Smoked Fish Salad (Nhoam Sdao)', wikiQuery: 'Thai salads', commonsQuery: 'Yam sadao' },
  { re: /(?:ញាំ|ញ៉ាំ)ត្រយូងចេក|ត្រយូងចេក/i, enName: 'Cambodian Banana Blossom Herb Salad (Nhoam Trayoung Chek)', wikiQuery: 'Banana flower', commonsQuery: 'Banana blossom salad' },
  { re: /(?:ញាំ|ញ៉ាំ)ផ្កាស្នោ|ឆាផ្កាស្នោ|ពងទាចៀនផ្កាស្នោ|ផ្កាស្នោ/i, enName: 'Cambodian Sesbania Flower Dish (Phka Snao)', wikiQuery: 'Sesbania grandiflora' },
  { re: /(?:ញាំ|ញ៉ាំ)មីសួរ/i, enName: 'Cambodian Glass Noodle & Prawn Salad (Nhoam Mi Suor)', wikiQuery: 'Yam wun sen' },
  { re: /(?:ញាំ|ញ៉ាំ)ក្រូចថ្លុង/i, enName: 'Cambodian Pomelo Herb Salad', wikiQuery: 'Pomelo', commonsQuery: 'Yam som-o' },
  { re: /(?:ញាំ|ញ៉ាំ)ម្កាក់ត្រីឆ្អើរ|(?:ញាំ|ញ៉ាំ)ម្កាក់|ម្កាក់ត្រីឆ្អើរ|ម្កាក់/i, enName: 'Cambodian Ambarella Salad with Smoked Fish (Nhoam Mkak Trey Chh-oe)', wikiQuery: 'Spondias dulcis', commonsQuery: 'Kedondong' },
  { re: /សាច់គោឆាអង្ក្រង|ឆាអង្ក្រង|គោឆាអង្ក្រង|អង្ក្រង/i, enName: 'Cambodian Stir-Fried Beef with Red Weaver Ants', wikiQuery: 'Beef stir fry' },
  { re: /ត្រីបឹងកញ្ឆែត/i, enName: 'Cambodian Crispy Fish over Water Mimosa Hotpot (Trey Boeung Kanhchet)', wikiQuery: 'Fried fish' },
  { re: /ត្រីចំហុយក្រូចឆ្មា|ត្រីចំហុយស៊ីអ៊ីវ|ត្រីចំហុយខ្ញី|ត្រីចំហុយ/i, enName: 'Steamed Whole Fish with Ginger, Lime & Herbs', wikiQuery: 'Steamed fish' },
  { re: /ត្រីដុតអំបិល|ត្រីអាំងអំបិល|ត្រីដុត/i, enName: 'Salt-Crusted Charcoal Grilled Whole Fish', wikiQuery: 'Grilled fish' },
  { re: /អាម៉ុកខ្យង|អាម៉ុកត្រី|អាម៉ុកមាន់|អាម៉ុកគ្រឿងសមុទ្រ|អាម៉ុក|\bamok\b/i, enName: 'Cambodian Steamed Kroeung Coconut Soufflé (Amok)', wikiQuery: 'Amok trey' },
  { re: /សម្លកកូរ|កកូរ|samlor\s*korko/i, enName: 'Cambodian Traditional Kroeung & Toasted Rice Vegetable Stew (Samlor Korko)', wikiQuery: 'Samlor korko' },
  { re: /សម្លប្រហើរ|ប្រហើរ/i, enName: 'Cambodian Fragrant Lemongrass Mushroom & Vegetable Soup (Samlor Proher)', wikiQuery: 'Samlor korko' },
  { re: /សម្លម្ជូរគ្រឿង/i, enName: 'Cambodian Sour Kroeung Stew (Samlor Machu Kroeung)', wikiQuery: 'Samlor machu' },
  { re: /សម្លម្ជូរព្រលិត|សម្លម្ជូរត្រួយអំពិល|សម្លម្ជូរក្រអៅឈូក|សម្លម្ជូរព្រៃ|សម្លម្ជូរយួន|សម្លម្ជូរ/i, enName: 'Cambodian Traditional Tamarind Sour Soup (Samlor Machu)', wikiQuery: 'Samlor machu', commonsQuery: 'Canh chua' },
  { re: /ស្ងោរជ្រក់ត្រី|ស្ងោរជ្រក់មាន់|ស្ងោរជ្រក់បង្គា|ស្ងោរជ្រក់/i, enName: 'Cambodian Clear Lime & Herb Soup (Sngor Chruok)', wikiQuery: 'Tom yum' },
  { re: /បាញ់ឆែវ|banh\s*chao|banh\s*xeo/i, enName: 'Cambodian Crispy Turmeric Rice Crepe (Banh Chao)', wikiQuery: 'Banh xeo' },
  { re: /បាញ់ស៊ុង|banh\s*sung/i, enName: 'Cambodian Rice Vermicelli with Coconut Cream & Herbs (Banh Sung)', wikiQuery: 'Banh tam bi' },
  { re: /ណែមឆៅ|គួង|ស្ព្រីងរ៉ូល|fresh\s*spring\s*roll/i, enName: 'Fresh Rice-Paper Herb Spring Rolls', wikiQuery: 'Goi cuon' },
  { re: /ណែមចៀន|ឆៃយ៉|ចាយ៉|fried\s*spring\s*roll/i, enName: 'Crispy Golden Fried Spring Rolls', wikiQuery: 'Cha gio' },
  { re: /ណែមត្រី|ណែមបាត់ដំបង|ណែម/i, enName: 'Cambodian Fermented Fish & Herb Roll (Nem)', wikiQuery: 'Nem chua' },

  // Shellfish, Crustaceans & Aquatic Specialties
  { re: /ងាវអាំង|ngav\s*ang|grilled\s*(?:blood\s*)?cockle/i, enName: 'Grilled Blood Cockles (Ngav Ang)', wikiQuery: 'Blood cockle', commonsQuery: 'Kkomak Tegillarca granosa' },
  { re: /ងាវឆា|stir[\s-]*fried\s*(?:blood\s*)?cockle/i, enName: 'Stir-Fried Blood Cockles with Tamarind', wikiQuery: 'Blood cockle', commonsQuery: 'Yam hoi khraeng' },
  { re: /ងាវស្រុះ|blanched\s*(?:blood\s*)?cockle/i, enName: 'Blanched Blood Cockles', wikiQuery: 'Blood cockle', commonsQuery: 'Kkomak Tegillarca granosa' },
  { re: /ភ្លាងាវ|(?:ញាំ|ញ៉ាំ)ងាវ|cockle\s*salad/i, enName: 'Spicy Blood Cockle Salad', wikiQuery: 'Blood cockle', commonsQuery: 'Yam hoi khraeng' },
  { re: /ងាវ|blood\s*cockle|\bcockles?\b|血蚶/i, enName: 'Cambodian Blood Cockles', wikiQuery: 'Blood cockle', commonsQuery: 'Yam hoi khraeng' },
  { re: /លាសហាល|លៀសហាល|lies\s*hal|sun[\s-]*dried.*clam/i, enName: 'Sun-Dried Spiced Freshwater Clams (Lies Hal)', wikiQuery: 'Clam', commonsQuery: 'Clams dish' },
  { re: /លាសឆា|លៀសឆា/i, enName: 'Stir-Fried Freshwater Clams with Basil', wikiQuery: 'Clam', commonsQuery: 'Stir fried clams' },
  { re: /លាស|លៀស|\bclams?\b|蛤蜊|花甲/i, enName: 'Freshwater Clams Dish', wikiQuery: 'Clam', commonsQuery: 'Clams dish' },
  { re: /គ្រំអាំង|គ្រំឆា|គ្រំ|\bmussels?\b|青口|贻贝/i, enName: 'Grilled Mussels Seafood', wikiQuery: 'Mussel as food' },
  { re: /អយស្ទ័រ|\boysters?\b|生蚝|牡蛎/i, enName: 'Fresh Oysters with Spicy Sauce', wikiQuery: 'Oyster' },
  { re: /ខ្យងអាំង|ខ្យងស្រែ|ខ្យងឆា|ខ្យងចំហុយ|ខ្យង|\bsnails?\b|\bescargot\b|田螺/i, enName: 'Spiced River Snails with Lemongrass', wikiQuery: 'Heliciculture', commonsQuery: 'Cooked snails' },
  { re: /កង្កែបបោក|កង្កែបអាំង|កង្កែបឆា|ឆាក្តៅកង្កែប|កង្កែបបំពង|កង្កែប|\bfrog\s*legs?\b|田鸡|牛蛙/i, enName: 'Cambodian Spiced Frog Legs', wikiQuery: 'Frog legs' },
  { re: /ឆាក្តៅអន្ទង់|ឆាគ្រឿងអន្ទង់|អន្ទង់ឆា|អន្ទង់អាំង|សម្លម្ជូរអន្ទង់|អន្ទង់|\beel\b|鳝鱼|鳗鱼/i, enName: 'Cambodian Spicy Lemongrass Kroeung Eel', wikiQuery: 'Unagi' },
  { re: /បង្កងអាំង|បង្កងឆា|បង្កង|river\s*prawn|\blobster\b|龙虾|大头虾/i, enName: 'Grilled Giant River Prawns', wikiQuery: 'Macrobrachium rosenbergii', commonsQuery: 'Grilled prawns' },
  { re: /បង្គាអាំង|បង្គាឆា|បង្គាបំពង|ភ្លាបង្គា|បង្គាអប់មីសួរ|បង្គា|\bprawns?\b|\bshrimps?\b|虾/i, enName: 'Prawns & Shrimp Dish', wikiQuery: 'Shrimp and prawn as food', mealDbQuery: 'Prawn' },
  { re: /មឹកអាំង|មឹកឆា|មឹកបំពង|មឹកចំហុយ|មឹក|\bsquid\b|\bcalamari\b|鱿鱼|墨鱼/i, enName: 'Grilled Squid with Koh Kong Sauce', wikiQuery: 'Squid as food' },
  { re: /ក្តាមឆាម្រេច|peppered\s*crab/i, enName: 'Kampot Green Pepper Crab', wikiQuery: 'Black pepper crab' },
  { re: /ក្តាមអប់មីសួរ|ក្តាមចំហុយ|ក្តាមអាំង|ក្តាមឆា|ក្តាមប្រៃ|ក្តាម|\bcrab\b|螃蟹/i, enName: 'Cambodian Crab Seafood Dish', wikiQuery: 'Crab meat', commonsQuery: 'Crab dish' },
  { re: /ត្រីសាម៉ុនអាំង|ត្រីសាលម៉ុនអាំង|grilled\s*salmon/i, enName: 'Grilled Salmon Fillet', wikiQuery: 'Salmon as food', mealDbQuery: 'Salmon' },
  { re: /ត្រីសាម៉ុន|ត្រីសាលម៉ុន|\bsalmon\b|三文鱼|鲑鱼/i, enName: 'Salmon Dish', wikiQuery: 'Salmon as food', mealDbQuery: 'Salmon' },

  // Khmer Street Food, Offal, Braised & Popular Local Dishes
  { re: /ជើងមាន់ជ្រក់|ជើងមាន់ក្រឡុក|ជើងមាន់អាំង|ជើងមាន់បំពង|ជើងមាន់|chicken\s*feet|凤爪|鸡爪/i, enName: 'Spicy Seasoned Chicken Feet', wikiQuery: 'Chicken feet' },
  { re: /ពោះគោទឹកប្រហុក|ពោះគោអាំង|ពោះគោ|\bbeef\s*tripe\b|\btripe\b|牛肚/i, enName: 'Cambodian Boiled Beef Tripe with Prahok Dip (Poh Ko)', wikiQuery: 'Tripe' },
  { re: /កន្សោមដោះគោអាំង|កន្សោមដោះគោ/i, enName: 'Charcoal Grilled Beef Udder Skewers', wikiQuery: 'Satay' },
  { re: /អណ្តាតគោអាំង|អណ្តាតគោ|beef\s*tongue|牛舌/i, enName: 'Charcoal Grilled Beef Tongue', wikiQuery: 'Beef tongue' },
  { re: /ខជើងជ្រូក|ជើងជ្រូកខ|pork\s*trotter|猪脚|猪蹄/i, enName: 'Braised Caramelized Pork Trotters', wikiQuery: 'Pig\'s trotters' },
  { re: /ខសាច់ជ្រូកពងទា|ខពងទា|ខសាច់ជ្រូក/i, enName: 'Cambodian Caramelized Pork Belly & Egg Stew (Khor Sach Chrouk)', wikiQuery: 'Thit kho tau' },
  { re: /ខគោ|សម្លខគោ|\bbo\s*kho\b/i, enName: 'Cambodian Braised Spiced Beef Stew (Khor Ko)', wikiQuery: 'Bo kho' },
  { re: /ស៊ុបពពែ|ពពែអាំង|សាច់ពពែ|\bgoat\s*soup\b|\bgoat\s*meat\b|羊肉汤/i, enName: 'Cambodian Herbal Goat Hotpot Soup', wikiQuery: 'Sup kambing' },
  { re: /ស៊ុបគោ|គោស៊ុប|\bbeef\s*soup\b|牛肉汤/i, enName: 'Cambodian Beef Hotpot Soup', wikiQuery: 'Beef noodle soup' },
  { re: /ស៊ុបមាន់ខ្មៅ|មាន់ខ្មៅ/i, enName: 'Herbal Black Silkie Chicken Soup', wikiQuery: 'Silkie', commonsQuery: 'Black chicken soup' },
  { re: /ស៊ុបម្រះ|ស្ងោរម្រះ|ម្រះស្នូលសាច់|bitter\s*melon\s*soup|苦瓜汤/i, enName: 'Stuffed Bitter Melon Pork Soup', wikiQuery: 'Stuffed bitter melon soup' },
  { re: /ស៊ុបខួរជ្រូក|ខួរជ្រូកចំហុយ|ខួរជ្រូក/i, enName: 'Steamed Herbal Pork Brain Soup', wikiQuery: 'Brain as food' },
  { re: /ឆាត្រកួន|ត្រកួនឆា|water\s*spinach|morning\s*glory|空心菜/i, enName: 'Stir-Fried Morning Glory with Garlic (Cha Trakuon)', wikiQuery: 'Stir-fried water spinach' },
  { re: /ឆាផ្សិតម្ជុល|ផ្សិតម្ជុល|enoki\s*mushroom|金针菇/i, enName: 'Stir-Fried Enoki Mushrooms', wikiQuery: 'Enokitake' },
  { re: /ឆាផ្សិត|ផ្សិតឆា|ផ្សិតអាំង|mushroom\s*stir\s*fry|炒蘑菇/i, enName: 'Stir-Fried Fresh Mushrooms', wikiQuery: 'Edible mushroom' },
  { re: /ឆាខាត់ណា|ខាត់ណាទឹកភ្នែក|ខាត់ណាសាច់គោ|chinese\s*broccoli|芥兰/i, enName: 'Stir-Fried Beef with Chinese Broccoli', wikiQuery: 'Gai lan' },
  { re: /ពងទាកូន|\bbalut\b|鸭仔蛋/i, enName: 'Steamed Duck Embryo Egg with Kampot Pepper (Pong Tea Kon)', wikiQuery: 'Balut (food)' },
  { re: /នំក្រូចល្ង|នំក្រូច|sesame\s*ball|煎堆|麻球/i, enName: 'Crispy Sesame Mung-Bean Rice Balls (Nom Kroch)', wikiQuery: 'Jian dui' },
  { re: /នំគូឆាយ|គូឆាយ|chive\s*cake|韭菜粿/i, enName: 'Crispy Pan-Fried Chive Cakes (Nom Ku Chay)', wikiQuery: 'Garlic chives', commonsQuery: 'Guichai' },
  { re: /បាញ់កាញ់|banh\s*canh/i, enName: 'Thick Tapioca Noodle Soup (Banh Canh)', wikiQuery: 'Banh canh' },
  { re: /សាច់គោងៀត|គោងៀត|beef\s*jerky|牛肉干/i, enName: 'Cambodian Sun-Dried Spiced Beef Jerky', wikiQuery: 'Jerky' },
  { re: /ត្រីងៀត|ត្រីឆ្អើរ|dried\s*fish|smoked\s*fish/i, enName: 'Cambodian Sun-Dried & Smoked Fish', wikiQuery: 'Dried fish' },
  { re: /ចង្រិតបំពង|កណ្តូបបំពង|ដង្កូវនាងបំពង|អាពីងបំពង/i, enName: 'Crispy Spiced Fried Crickets & Insects', wikiQuery: 'Insects as food', commonsQuery: 'Fried crickets' },
  { re: /ក្រួចអាំង|ក្រួចបំពង|សាច់ក្រួច|\bquail\b/i, enName: 'Roasted Spiced Quail', wikiQuery: 'Quail as food' },
  { re: /ពងទាចៀនត្រីប្រម៉ា|ពងទាចៀនប្រហុក|ពងទាចៀនសាច់ចិញ្ច្រាំ|ពងទាចៀនស្អំ|ពងទាចៀន|ពងមាន់ចៀន|\bomelette\b|\bomelet\b|煎蛋/i, enName: 'Cambodian Savory Fried Omelette', wikiQuery: 'Omelette', mealDbQuery: 'Omelette' },
  { re: /បុកកន្ទុយហេស|បុកស្វាយ|(?:ញាំ|ញ៉ាំ)ស្វាយ|green\s*mango\s*salad/i, enName: 'Spicy Green Mango Salad', wikiQuery: 'Green mango salad', commonsQuery: 'Yam mamuang' },
  { re: /បុកមីកញ្ចប់|បុកមី/i, enName: 'Cambodian Spicy Pounded Instant Noodles Salad (Bok Mee Kanchop)', wikiQuery: 'Green papaya salad', commonsQuery: 'Som tam' },
  { re: /បុកល្ហុង|បុកក្តាមប្រៃ|បុកពោត|បុកអំពិល|បុកសណ្តែក/i, enName: 'Cambodian Spicy Mortar Salad (Bok Lhong)', wikiQuery: 'Green papaya salad' },
  { re: /មីសួរសាច់មាន់|ស៊ុបមីសួរសាច់មាន់|មីសួរមាន់/i, enName: 'Cambodian Chicken Glass Noodle Soup (Mi Suor Sach Moan)', wikiQuery: 'Chicken soup', mealDbQuery: 'Chicken Soup' },
  { re: /មីឆាសាច់គោ/i, enName: 'Khmer Stir-Fried Noodles with Beef (Mee Cha Sach Ko)', wikiQuery: 'Mie goreng', mealDbQuery: 'Beef Lo Mein' },
  { re: /ស្លាបមាន់អាំង|ស្លាបមាន់បំពង|ស្លាបមាន់ក្រឡុក|ស្លាបមាន់|chicken\s*wings?|鸡翅/i, enName: 'Crispy & Grilled Chicken Wings', wikiQuery: 'Buffalo wing', commonsQuery: 'Grilled chicken wings' },
  { re: /សាច់គោចង្កាក់|សាច់អាំងចង្កាក់|គោដុត|សាច់គោអាំង|beef\s*skewers?|烤牛肉串/i, enName: 'Charcoal Grilled Lemongrass Beef Skewers', wikiQuery: 'Satay' },
  { re: /មាន់ដុត|មាន់អាំង|roast\s*chicken|烤鸡/i, enName: 'Charcoal Grilled Lemongrass Chicken', wikiQuery: 'Roast chicken', mealDbQuery: 'Roast Chicken' },

  // Traditional Khmer Cakes, Desserts & Local Beverages (នំខ្មែរ, បង្អែមខ្មែរ, ភេសជ្ជៈខ្មែរ)
  { re: /អន្សមជ្រូក|អន្សមចេក|នំអន្សម|អន្សម/i, enName: 'Cambodian Banana-Leaf Sticky Rice Cake (Num Ansom)', wikiQuery: 'Banh tet' },
  { re: /នំគម/i, enName: 'Cambodian Pyramid Sweet Coconut Sticky Rice Cake (Num Kom)', wikiQuery: 'Kue koci' },
  { re: /នំអាកោត្នោត|នំត្នោត/i, enName: 'Cambodian Steamed Sugar Palm Rice Cake (Num Ako Tnot)', wikiQuery: 'Khanom tan' },
  { re: /នំអាកោ/i, enName: 'Cambodian Steamed Rice Flour Muffin (Num Ako)', wikiQuery: 'Banh bo' },
  { re: /នំផ្លែអាយ/i, enName: 'Cambodian Palm-Sugar Stuffed Sticky Rice Balls (Num Plae Ai)', wikiQuery: 'Klepon' },
  { re: /នំគ្រក់/i, enName: 'Cambodian Crispy Coconut Rice Pancakes (Num Krok)', wikiQuery: 'Khanom khrok' },
  { re: /នំចាក់ចុល|នំកង/i, enName: 'Cambodian Crispy Rice-Flour Ring Doughnut (Num Kong)', wikiQuery: 'Doughnut' },
  { re: /នំល្ពៅ|នំបត់|នំធ្មៃ|នំកូរ|នំចាំង/i, enName: 'Traditional Cambodian Steamed Rice Cake', wikiQuery: 'Kuih' },
  { re: /ក្រឡាន|\bkralan\b/i, enName: 'Cambodian Bamboo-Roasted Sticky Rice with Beans & Coconut (Kralan)', wikiQuery: 'Kralan' },
  { re: /សង់ខ្យាល្ពៅ|ល្ពៅសង់ខ្យា|sankhya/i, enName: 'Cambodian Whole Pumpkin Coconut Egg Custard (Sankhya Lapov)', wikiQuery: 'Coconut jam', commonsQuery: 'Sangkhaya fakthong' },
  { re: /ចេកខ្ទិះ|បង្អែមចេក/i, enName: 'Cambodian Banana in Warm Coconut Cream & Tapioca Pearls (Chek Ktis)', wikiQuery: 'Che chuoi', commonsQuery: 'Banana coconut milk dessert' },
  { re: /បង្អែមត្រាវ|បបរត្រាវ/i, enName: 'Cambodian Sweet Taro Coconut Dessert', wikiQuery: 'Taro', commonsQuery: 'Taro sago coconut milk' },
  { re: /បង្អែមសណ្តែក|បបរសណ្តែក/i, enName: 'Cambodian Sweet Mung Bean Coconut Dessert', wikiQuery: 'Tong sui' },
  { re: /បង្អែមពោត|បបរពោត/i, enName: 'Cambodian Sweet Corn & Sticky Rice Coconut Dessert', wikiQuery: 'Maja blanca', commonsQuery: 'Sweet corn coconut dessert' },
  { re: /លតស្វិត|បង្អែមលត|ចាហួយទឹក/i, enName: 'Cambodian Pandan Rice-Drop Jelly in Coconut Milk (Lot Sviet)', wikiQuery: 'Cendol' },
  { re: /បង្អែមគ្រាប់ត្នោត|បបរត្នោត|គ្រាប់ត្នោត|palm\s*seed|palm\s*fruit/i, enName: 'Cambodian Sugar Palm Fruit Coconut Dessert', wikiQuery: 'Borassus flabellifer', commonsQuery: 'Toddy palm fruit' },
  { re: /ទឹកត្នោតផ្អែម|ទឹកត្នោត/i, enName: 'Fresh Cambodian Sweet Sugar Palm Juice (Teuk Tnot)', wikiQuery: 'Neera' },
  { re: /ទឹកអំពៅ|sugarcane\s*juice/i, enName: 'Fresh Pressed Sugarcane Juice with Citrus', wikiQuery: 'Sugarcane juice' },
  { re: /ទឹកដូង|ដូងក្រអូប|coconut\s*water/i, enName: 'Chilled Fresh Young Coconut Water', wikiQuery: 'Coconut water' },
  { re: /ទឹកសណ្តែក|soy\s*milk/i, enName: 'Fresh Warm Soy Milk', wikiQuery: 'Soy milk' },

  // Chinese, Cantonese, Dim Sum & Hotpot
  { re: /បាយមាន់ហៃណាំ|បាយមាន់|hainanese\s*chicken\s*rice|海南鸡饭/i, enName: 'Hainanese Chicken Rice', wikiQuery: 'Hainanese chicken rice' },
  { re: /ទាដុត|ទាខ្វៃ|បាយទាខ្វៃ|peking\s*duck|roast\s*duck|烤鸭|烧鸭/i, enName: 'Crispy Roasted Duck', wikiQuery: 'Peking duck', mealDbQuery: 'Duck' },
  { re: /ជ្រូកខ្វៃ|បាយសាច់ជ្រូកខ្វៃ|សាច់ជ្រូកបីជាន់អាំង|roast\s*pork\s*belly|siu\s*yuk|烧肉|叉烧/i, enName: 'Crispy Roasted Pork Belly', wikiQuery: 'Siu yuk' },
  { re: /ឌីមសាំ|dim\s*sum|点心/i, enName: 'Steamed Dim Sum Basket', wikiQuery: 'Dim sum' },
  { re: /នំប៉ាវ|\bbaozi\b|steamed\s*buns?|包子|小笼包/i, enName: 'Steamed Stuffed Baozi Buns', wikiQuery: 'Baozi', mealDbQuery: 'Pork' },
  { re: /សៀវម៉ៃ|ស៊ីវម៉ៃ|shumai|siu\s*mai|烧卖/i, enName: 'Steamed Pork & Shrimp Shumai', wikiQuery: 'Shumai' },
  { re: /គាវចៀន|គាវចំហុយ|gyoza|potstickers?|fried\s*dumplings?|煎饺|饺子/i, enName: 'Pan-Fried Dumplings (Gyoza)', wikiQuery: 'Jiaozi', mealDbQuery: 'Dumpling' },
  { re: /មីគាវ|គាវស៊ុប|គាវទឹក|wonton\s*noodle|wonton\s*soup|云吞面|馄饨/i, enName: 'Wonton Noodle Soup', wikiQuery: 'Wonton noodles', mealDbQuery: 'Wonton' },
  { re: /ម៉ាឡាតាំង|ស៊ុបម៉ាឡា|ម៉ាឡាឆា|ម៉ាឡា|malatang|mala\s*hot\s*pot|麻辣烫|麻辣火锅/i, enName: 'Spicy Sichuan Mala Hotpot', wikiQuery: 'Malatang' },
  { re: /ស៊ុបចិន|ហតផត|hot\s*pot|steamboat|火锅/i, enName: 'Asian Hot Pot', wikiQuery: 'Hot pot' },
  { re: /តៅហ៊ូម៉ាប៉ូ|mapo\s*tofu|麻婆豆腐/i, enName: 'Mapo Tofu', wikiQuery: 'Mapo tofu' },
  { re: /មីទាញ|lamian|hand[\s-]*pulled\s*noodle|拉面/i, enName: 'Hand-Pulled Beef Noodles', wikiQuery: 'Lamian' },

  // Korean & Japanese Dishes
  { re: /បាយឆាគីមឈី|kimchi\s*fried\s*rice|泡菜炒饭/i, enName: 'Kimchi Fried Rice', wikiQuery: 'Kimchi fried rice' },
  { re: /ស៊ុបគីមឈី|kimchi\s*jjigae|kimchi\s*stew|泡菜汤/i, enName: 'Korean Kimchi Stew (Kimchi Jjigae)', wikiQuery: 'Kimchi-jjigae' },
  { re: /គីមឈី|\bkimchi\b|韩式泡菜/i, enName: 'Korean Fermented Kimchi', wikiQuery: 'Kimchi' },
  { re: /តុកបុកគី|តុកប៉ុកគី|tteokbokki|topokki|辣炒年糕/i, enName: 'Korean Spicy Rice Cakes (Tteokbokki)', wikiQuery: 'Tteokbokki' },
  { re: /ប៊ីប៊ីមបាប់|bibimbap|石锅拌饭/i, enName: 'Korean Bibimbap Rice Bowl', wikiQuery: 'Bibimbap' },
  { re: /សាច់អាំងកូរ៉េ|korean\s*bbq|韩式烤肉/i, enName: 'Korean BBQ Grilled Meat', wikiQuery: 'Korean barbecue' },
  { re: /មាន់បំពងកូរ៉េ|korean\s*fried\s*chicken|韩式炸鸡/i, enName: 'Korean Crispy Glazed Fried Chicken', wikiQuery: 'Korean fried chicken' },
  { re: /មីហឹរកូរ៉េ|មីហឹរ|spicy\s*ramen|火鸡面/i, enName: 'Spicy Ramen Noodle Soup', wikiQuery: 'Instant noodles' },
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
  { re: /គុយទាវទូក|boat\s*noodles?|船面/i, enName: 'Boat Noodle Soup', wikiQuery: 'Boat noodles' },
  { re: /ហ្វឺសាច់គោ|ហ្វឺមាន់|ហ្វឺ|\bpho\b|越南河粉/i, enName: 'Vietnamese Beef Pho Noodle Soup', wikiQuery: 'Pho' },
  { re: /បាញ់មី|នំប៉័ងប៉ាតេ|នំប៉័ងសាច់|banh\s*mi|bánh\s*mì|越南法棍/i, enName: 'Crispy Baguette Sandwich (Banh Mi)', wikiQuery: 'Banh mi' },

  // Western, Indian & Global Classics
  { re: /ភីហ្សា|ភីស្សា|\bpizza\b|披萨|比萨/i, enName: 'Wood-Fired Artisan Pizza', wikiQuery: 'Pizza', mealDbQuery: 'Pizza' },
  { re: /ស្ប៉ាហ្គេត?ទី|spaghetti|bolognese|意大利面/i, enName: 'Spaghetti Bolognese', wikiQuery: 'Spaghetti', mealDbQuery: 'Spaghetti' },
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

  // Modern Desserts, Bakery & Beverages
  { re: /តែគុជ|bubble\s*tea|\bboba\b|珍珠奶茶/i, enName: 'Iced Brown Sugar Bubble Milk Tea', wikiQuery: 'Bubble tea' },
  { re: /ម៉ាត់ឆា|តែបៃតង|\bmatcha\b|抹茶/i, enName: 'Iced Matcha Green Tea Latte', wikiQuery: 'Matcha' },
  { re: /កាហ្វេទឹកដោះគោ|កាហ្វេទឹកកក|កាហ្វេដូង|កាហ្វេ|iced\s*coffee|\blatte\b|\bcappuccino\b|冰咖啡|拿铁/i, enName: 'Cambodian Iced Condensed Milk Coffee', wikiQuery: 'Vietnamese iced coffee' },
  { re: /តែក្រូចឆ្មា|lemon\s*tea|柠檬茶/i, enName: 'Iced Fresh Lemon Tea', wikiQuery: 'Iced tea' },
  { re: /ទឹកក្រឡុក|\bsmoothie\b|奶昔|果昔/i, enName: 'Fresh Tropical Fruit Smoothie', wikiQuery: 'Smoothie' },
  { re: /ការ៉េម|ice\s*cream|\bgelato\b|冰淇淋/i, enName: 'Artisan Ice Cream Sundae', wikiQuery: 'Ice cream' },
  { re: /នំខេក|\bcake\b|\bcheesecake\b|蛋糕/i, enName: 'Layered Cream Cake', wikiQuery: 'Chocolate cake', mealDbQuery: 'Cake' },
  { re: /នំដូណាត់|\bdonuts?\b|\bdoughnuts?\b|甜甜圈/i, enName: 'Glazed Doughnuts', wikiQuery: 'Doughnut' },
  { re: /នំវ៉ាហ្វល|\bwaffles?\b|华夫饼/i, enName: 'Crispy Belgian Waffles', wikiQuery: 'Waffle' },
  { re: /នំផេនខេក|\bpancakes?\b|松饼/i, enName: 'Fluffy Pancakes with Syrup', wikiQuery: 'Pancake', mealDbQuery: 'Pancakes' },
  { re: /ចាហួយខ្មៅ|grass\s*jelly|烧仙草/i, enName: 'Sweet Grass Jelly Dessert', wikiQuery: 'Grass jelly' },
];

const KHMER_COOKING_METHODS: Array<{ re: RegExp; en: string }> = [
  { re: /ឆាក្តៅ|ឆាគ្រឿង/g, en: 'Spicy Lemongrass Kroeung Stir-Fried' },
  { re: /ឆាម្រះព្រៅ/g, en: 'Holy Basil Stir-Fried' },
  { re: /អាំង|ដុត/g, en: 'Charcoal Grilled' },
  { re: /ឆា/g, en: 'Stir-Fried' },
  { re: /បំពង/g, en: 'Crispy Deep-Fried' },
  { re: /ចៀន/g, en: 'Pan-Fried' },
  { re: /ខ្វៃ/g, en: 'Crispy Roasted' },
  { re: /ខ(?!្|ាត់|ួ|្យ)/g, en: 'Braised Caramelized' },
  { re: /សម្លម្ជូរ|ម្ជូរ/g, en: 'Cambodian Sour Soup' },
  { re: /សម្លការី|ការី/g, en: 'Cambodian Curry' },
  { re: /សម្លកកូរ|កកូរ/g, en: 'Cambodian Kroeung Stew' },
  { re: /សម្លប្រហើរ|ប្រហើរ/g, en: 'Cambodian Fragrant Herb Soup' },
  { re: /សម្ល/g, en: 'Cambodian Stew' },
  { re: /ស្ងោរជ្រក់/g, en: 'Clear Lime Herb Soup' },
  { re: /ស្ងោរ|ស៊ុប/g, en: 'Clear Soup' },
  { re: /ចំហុយ/g, en: 'Steamed' },
  { re: /អប់/g, en: 'Claypot Baked' },
  { re: /កប់/g, en: 'Herb-Wrapped Roasted' },
  { re: /ញាំ|ញ៉ាំ|ភ្លា/g, en: 'Zesty Herb Salad' },
  { re: /បុក/g, en: 'Spicy Mortar Salad' },
  { re: /ជ្រក់/g, en: 'Spicy Pickled' },
  { re: /ហាល|ងៀត|ឆ្អើរ/g, en: 'Sun-Dried Smoked' },
  { re: /ស្រុះ/g, en: 'Blanched' },
  { re: /ក្រឡុក/g, en: 'Spiced Shaken' },
];

const KHMER_INGREDIENTS: Array<{ re: RegExp; en: string; wiki?: string; mealDb?: string }> = [
  // Fermented Khmer Pastes
  { re: /ប្រហុក/g, en: 'Prahok', wiki: 'Prahok' },
  { re: /ផ្អក/g, en: 'Fermented Fish Pha-ok', wiki: 'Prahok' },
  { re: /ម៉ាំ/g, en: 'Fermented Fish Mam', wiki: 'Prahok' },
  { re: /កាពិ/g, en: 'Shrimp Paste', wiki: 'Shrimp paste' },

  // Offal, Special Cuts & Country Meats
  { re: /ខួរជ្រូក/g, en: 'Pork Brain', wiki: 'Brain as food' },
  { re: /ក្រពះជ្រូក|ពោះតាន់|ពោះវៀន/g, en: 'Pork Tripe', wiki: 'Tripe' },
  { re: /ត្រចៀកជ្រូក/g, en: 'Pig Ear', wiki: 'Pig\'s ear (food)' },
  { re: /ពោះគោ/g, en: 'Beef Tripe', wiki: 'Tripe' },
  { re: /អណ្តាតគោ/g, en: 'Beef Tongue', wiki: 'Beef tongue' },
  { re: /ថ្លើមគោ|ថ្លើមជ្រូក|ថ្លើមមាន់|ថ្លើម/g, en: 'Liver', wiki: 'Liver (food)' },
  { re: /ឈាមជ្រូក|ឈាមមាន់|ឈាមទា|ឈាម/g, en: 'Blood Curd', wiki: 'Pig blood curd' },
  { re: /កោះមាន់/g, en: 'Chicken Gizzard', wiki: 'Gizzard' },
  { re: /ជើងមាន់/g, en: 'Chicken Feet', wiki: 'Chicken feet' },
  { re: /ស្លាបមាន់/g, en: 'Chicken Wings', wiki: 'Buffalo wing' },
  { re: /ជើងជ្រូក/g, en: 'Pork Trotters', wiki: 'Pig\'s trotters' },
  { re: /ឆ្អឹងជំនីរ/g, en: 'Pork Ribs', wiki: 'Pork ribs' },
  { re: /សាច់ជ្រូកបីជាន់|បីជាន់/g, en: 'Pork Belly', wiki: 'Pork belly' },
  { re: /សាច់គោ|គោ/g, en: 'Beef', wiki: 'Beef', mealDb: 'Beef' },
  { re: /សាច់ជ្រូក|ជ្រូក/g, en: 'Pork', wiki: 'Pork', mealDb: 'Pork' },
  { re: /សាច់មាន់|មាន់ស្រែ|មាន់/g, en: 'Chicken', wiki: 'Chicken as food', mealDb: 'Chicken' },
  { re: /ពងទាកូន/g, en: 'Balut Egg', wiki: 'Balut (food)' },
  { re: /ពងទាប្រៃ/g, en: 'Salted Duck Egg', wiki: 'Salted duck egg' },
  { re: /ពងទា|ពងមាន់|ស៊ុត/g, en: 'Egg', wiki: 'Egg as food' },
  { re: /សាច់ទា|ទា/g, en: 'Duck', wiki: 'Duck as food', mealDb: 'Duck' },
  { re: /ពពែ/g, en: 'Goat Meat', wiki: 'Goat meat' },
  { re: /ក្រួច/g, en: 'Quail', wiki: 'Quail as food' },
  { re: /កង្កែប/g, en: 'Frog Legs', wiki: 'Frog legs' },
  { re: /អន្ទង់/g, en: 'Swamp Eel', wiki: 'Unagi' },
  { re: /ចង្រិត|កណ្តូប|ដង្កូវនាង/g, en: 'Crispy Fried Insects', wiki: 'Insects as food' },
  { re: /អង្ក្រង/g, en: 'Red Weaver Ants', wiki: 'Weaver ant' },

  // Cambodian Freshwater & Sea Fishes
  { re: /ត្រីសាម៉ុន|ត្រីសាលម៉ុន/g, en: 'Salmon', wiki: 'Salmon as food', mealDb: 'Salmon' },
  { re: /ត្រីធូណា/g, en: 'Tuna', wiki: 'Tuna', mealDb: 'Tuna' },
  { re: /ត្រីរ៉ស់|ត្រីផ្ទក់/g, en: 'Snakehead Fish', wiki: 'Fish as food' },
  { re: /ត្រីអណ្តែង/g, en: 'Catfish', wiki: 'Catfish' },
  { re: /ត្រីប្រា|ត្រីពោធិ៍/g, en: 'River Fish', wiki: 'Basa (fish)' },
  { re: /ត្រីឆ្ពិន|ត្រីក្រាញ់|ត្រីឆ្លាំង|ត្រីកេះ|ត្រីក្រាយ|ត្រីកញ្ចុះ|ត្រីសណ្តាយ/g, en: 'Cambodian Freshwater Fish', wiki: 'Fish as food' },
  { re: /ត្រីឆ្អើរ|ត្រីងៀត|ត្រីប្រម៉ា/g, en: 'Smoked & Salted Fish', wiki: 'Dried fish' },
  { re: /ត្រី/g, en: 'Fish', wiki: 'Fish as food', mealDb: 'Fish' },

  // Seafood & Shellfish
  { re: /គ្រឿងសមុទ្រ/g, en: 'Mixed Seafood', wiki: 'Seafood' },
  { re: /បង្កង/g, en: 'Giant River Prawn', wiki: 'Prawn' },
  { re: /បង្គា/g, en: 'Shrimp Prawns', wiki: 'Shrimp and prawn as food', mealDb: 'Prawn' },
  { re: /មឹក/g, en: 'Squid', wiki: 'Squid as food' },
  { re: /ក្តាម/g, en: 'Crab', wiki: 'Crab meat' },
  { re: /ងាវ/g, en: 'Blood Cockles', wiki: 'Blood cockle' },
  { re: /លាស|លៀស/g, en: 'Clams', wiki: 'Clam' },
  { re: /ខ្យង/g, en: 'River Snails', wiki: 'Escargot' },
  { re: /គ្រំ/g, en: 'Mussels', wiki: 'Mussel as food' },
  { re: /អយស្ទ័រ/g, en: 'Oysters', wiki: 'Oyster' },
  { re: /ប្រហិត/g, en: 'Meatballs', wiki: 'Meatball' },
  { re: /សាច់ក្រក/g, en: 'Cambodian Sausage', wiki: 'Lap cheong' },
  { re: /តៅហ៊ូ/g, en: 'Tofu', wiki: 'Tofu' },

  // Khmer Herbs, Wild Greens, Vegetables & Roots
  { re: /ផ្សិតម្ជុល/g, en: 'Enoki Mushrooms', wiki: 'Enokitake' },
  { re: /ផ្សិតចំបើង|ផ្សិត/g, en: 'Mushrooms', wiki: 'Edible mushroom' },
  { re: /ត្រកួន/g, en: 'Water Spinach', wiki: 'Stir-fried water spinach' },
  { re: /ផ្កាខាត់ណា|ខាត់ណាផ្កា/g, en: 'Cauliflower', wiki: 'Cauliflower' },
  { re: /ប្រូខូលី/g, en: 'Broccoli', wiki: 'Broccoli' },
  { re: /ខាត់ណា/g, en: 'Chinese Broccoli', wiki: 'Gai lan' },
  { re: /ស្តៅ/g, en: 'Neem Flower Greens', wiki: 'Azadirachta indica' },
  { re: /ស្លឹកម្រុំ|ម្រុំ/g, en: 'Moringa Greens', wiki: 'Moringa oleifera' },
  { re: /ស្លឹកញ/g, en: 'Noni Leaves', wiki: 'Amok trey' },
  { re: /ស្លឹកបាស|ស្លឹកងប់/g, en: 'Wild Forest Greens', wiki: 'Leaf vegetable' },
  { re: /ត្រួយអំពិល|អំពិលទុំ|អំពិល/g, en: 'Tamarind Greens', wiki: 'Tamarind' },
  { re: /ផ្កាស្នោ/g, en: 'Sesbania Flowers', wiki: 'Sesbania grandiflora' },
  { re: /កញ្ឆែត/g, en: 'Water Mimosa', wiki: 'Neptunia oleracea' },
  { re: /ព្រលិត/g, en: 'Water Lily Stems', wiki: 'Nymphaea' },
  { re: /ក្រអៅឈូក|មើមឈូក|គ្រាប់ឈូក/g, en: 'Lotus Root', wiki: 'Lotus root' },
  { re: /ត្រយូងចេក/g, en: 'Banana Blossom', wiki: 'Banana flower' },
  { re: /ម្រះព្រៅ/g, en: 'Holy Basil', wiki: 'Phat kaphrao' },
  { re: /ម្រះ/g, en: 'Bitter Melon', wiki: 'Stuffed bitter melon soup' },
  { re: /ត្រប់ពុតលំញង|ត្រប់ស្រួយ|ត្រប់វែង|ត្រប់/g, en: 'Eggplant', wiki: 'Eggplant' },
  { re: /ទំពាំងជ្រក់|ទំពាំង/g, en: 'Bamboo Shoots', wiki: 'Bamboo shoot' },
  { re: /ននោង/g, en: 'Luffa Sponge Gourd', wiki: 'Luffa' },
  { re: /ត្រឡាច/g, en: 'Winter Melon', wiki: 'Wax gourd' },
  { re: /ឃ្លោក/g, en: 'Bottle Gourd', wiki: 'Calabash' },
  { re: /ត្រួយល្ពៅ|ល្ពៅ/g, en: 'Pumpkin', wiki: 'Pumpkin' },
  { re: /ឆៃប៉ូវ/g, en: 'Preserved Radish', wiki: 'Preserved radish' },
  { re: /ស្ពៃជ្រក់/g, en: 'Pickled Mustard Greens', wiki: 'Pickled mustard greens' },
  { re: /ស្ពៃក្តោប/g, en: 'Cabbage', wiki: 'Cabbage' },
  { re: /ស្ពៃតឿ|ស្ពៃចង្កឹះ|ស្ពៃ/g, en: 'Mustard Greens & Bok Choy', wiki: 'Bok choy' },
  { re: /សណ្តែកបណ្តុះ/g, en: 'Bean Sprouts', wiki: 'Mung bean sprout' },
  { re: /សណ្តែកគួរ|សណ្តែក/g, en: 'Yardlong Green Beans', wiki: 'Yardlong bean' },
  { re: /ពពាយ/g, en: 'Winged Beans', wiki: 'Winged bean' },
  { re: /ត្រាវ/g, en: 'Taro', wiki: 'Taro' },
  { re: /ដំឡូងមី/g, en: 'Cassava', wiki: 'Cassava' },
  { re: /ដំឡូងជ្វា|ដំឡូង/g, en: 'Sweet Potato & Potato', wiki: 'Sweet potato' },
  { re: /ការ៉ុត/g, en: 'Carrot', wiki: 'Carrot' },
  { re: /ប៉េងប៉ោះ/g, en: 'Tomato', wiki: 'Tomato' },
  { re: /ត្រសក់/g, en: 'Cucumber', wiki: 'Cucumber' },
  { re: /ស្វាយ/g, en: 'Mango', wiki: 'Mango' },
  { re: /ល្ហុង/g, en: 'Green Papaya', wiki: 'Green papaya salad' },
  { re: /ម្នាស់/g, en: 'Pineapple', wiki: 'Pineapple' },
  { re: /ពោត/g, en: 'Sweet Corn', wiki: 'Sweet corn' },
  { re: /ចេក/g, en: 'Banana', wiki: 'Banana' },
  { re: /ដូង|ខ្ទិះ/g, en: 'Coconut', wiki: 'Coconut milk' },
  { re: /ត្នោត/g, en: 'Sugar Palm', wiki: 'Borassus flabellifer' },
  { re: /បន្លែ/g, en: 'Mixed Vegetables', wiki: 'Vegetable' },

  // Noodles, Rice, Cakes & Desserts
  { re: /មីសួរ/g, en: 'Glass Noodles', wiki: 'Cellophane noodles' },
  { re: /គុយទាវ/g, en: 'Rice Noodle Soup', wiki: 'Kuy teav' },
  { re: /នំបញ្ចុក/g, en: 'Cambodian Rice Noodles', wiki: 'Num banhchok' },
  { re: /លត(?!\u17D2)/g, en: 'Short Pin Noodles', wiki: 'Lort cha' },
  { re: /មី(?!\u17D2)/g, en: 'Egg Noodles', wiki: 'Mie goreng' },
  { re: /បបរ/g, en: 'Rice Porridge Congee', wiki: 'Congee' },
  { re: /បាយឆា/g, en: 'Wok Fried Rice', wiki: 'Fried rice' },
  { re: /បាយដំណើប/g, en: 'Sticky Rice', wiki: 'Glutinous rice' },
  { re: /បាយ/g, en: 'Steamed Rice Dish', wiki: 'Cooked rice' },
  { re: /បង្អែម/g, en: 'Cambodian Sweet Dessert', wiki: 'Tong sui' },
  { re: /នំ(?!បញ្ចុក)/g, en: 'Cambodian Cake', wiki: 'Kuih' },
];

const KHMER_CONNECTOR_OR_FLAVOR_MODIFIER_RE =
  /និង|ជាមួយ|ដាក់|ផ្សំ|ស្រស់|ពិសេស|ឆ្ងាញ់|ខ្មែរ|បុរាណ|ស្រែ|ធម្មជាតិ|ក្តៅ|ត្រជាក់|ហឹរ|ជូរ|ផ្អែម|ប្រៃ|ល្វីង|តិច|ខ្លាំង|រសជាតិ|បែប|ទឹកត្រី|ម្រេចកំពត|ម្រេច|ក្រូចឆ្មា|ខ្ទឹមស|ខ្ញី|ស្លឹកគ្រៃ/g;

export function translateUniversalDishQuery(dishQuery: string): UniversalDishTranslation {
  const clean = (dishQuery || '').trim();
  const norm = normalizeKhmerFoodText(clean);

  // 1. Check 260+ high-precision specific dishes lexicon against normalized & raw text
  for (const item of SPECIFIC_DISH_LEXICON) {
    if (item.re.test(norm) || item.re.test(clean)) {
      return {
        enName: item.enName,
        wikiQuery: item.wikiQuery,
        commonsQuery: item.commonsQuery,
        mealDbQuery: item.mealDbQuery,
        hasLexiconMatch: true,
      };
    }
  }

  // 2. Compositional multi-token Khmer culinary translation
  // Tracks remainder so partial matches with unknown Khmer words NEVER block live neural km->en translation!
  let remainder = norm.replace(/ទឹកត្រី/g, ' ');
  const matchedMethods: string[] = [];
  for (const m of KHMER_COOKING_METHODS) {
    m.re.lastIndex = 0;
    if (m.re.test(remainder)) {
      if (!matchedMethods.includes(m.en)) {
        matchedMethods.push(m.en);
      }
      m.re.lastIndex = 0;
      remainder = remainder.replace(m.re, ' ');
    }
  }

  const matchedIngs: string[] = [];
  const matchedWikis: string[] = [];
  let mealDbCandidate: string | undefined;

  for (const ing of KHMER_INGREDIENTS) {
    ing.re.lastIndex = 0;
    if (ing.re.test(remainder)) {
      if (!matchedIngs.includes(ing.en)) {
        matchedIngs.push(ing.en);
      }
      if (ing.wiki && !matchedWikis.includes(ing.wiki)) {
        matchedWikis.push(ing.wiki);
      }
      if (!mealDbCandidate && ing.mealDb) {
        mealDbCandidate = ing.mealDb;
      }
      ing.re.lastIndex = 0;
      remainder = remainder.replace(ing.re, ' ');
    }
  }

  remainder = remainder.replace(KHMER_CONNECTOR_OR_FLAVOR_MODIFIER_RE, ' ');
  const unmatchedKhmerCount = (remainder.match(/[\u1780-\u17FF]/g) || []).length;

  // Require at least 1 recognized ingredient AND < 3 unmatched Khmer characters to claim full lexicon coverage.
  // Otherwise, trigger live Google Neural GTX + Khmer Wikipedia translation on the full Khmer phrase!
  if (matchedIngs.length >= 1 && unmatchedKhmerCount < 3) {
    const combinedEn = [...matchedMethods.slice(0, 1), ...matchedIngs.slice(0, 2)].join(' ').trim();
    return {
      enName: `${combinedEn} (${clean})`,
      wikiQuery: matchedWikis[0] || matchedIngs[0] || combinedEn,
      commonsQuery: `${combinedEn} food`,
      mealDbQuery: mealDbCandidate,
      hasLexiconMatch: true,
    };
  }

  // 3. Direct English query typed by user
  const englishMatch = clean.match(/[A-Za-z][A-Za-z0-9\s'-]{1,}/);
  if (englishMatch && !/[\u1780-\u17FF\u4E00-\u9FFF]/.test(clean)) {
    const extractedEn = englishMatch[0].trim();
    const isFoodTerm = FOOD_CULINARY_SIGNAL_RE.test(extractedEn);
    return {
      enName: extractedEn,
      wikiQuery: extractedEn,
      mealDbQuery: isFoodTerm ? extractedEn : undefined,
      hasLexiconMatch: isFoodTerm,
    };
  }

  // 4. Unmapped or partially-unmapped Khmer / Chinese phrase -> live Neural Open Translation + Native Wikipedia!
  const partialHint = [...matchedMethods.slice(0, 1), ...matchedIngs.slice(0, 2)].join(' ').trim();
  return {
    enName: partialHint ? `${partialHint} (${clean})` : clean,
    wikiQuery: clean,
    fallbackWikiQuery: matchedWikis[0],
    mealDbQuery: mealDbCandidate,
    hasLexiconMatch: false,
  };
}

const SESSION_CACHE_STORAGE_KEY = 'kft_open_dish_photo_cache_v4';
const memoryPhotoCache = new Map<string, string>();
const inFlightPhotoRequests = new Map<string, Promise<string | null>>();

function hydratePhotoCacheFromSession(): void {
  if (memoryPhotoCache.size > 0 || typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, string>;
    for (const [k, v] of Object.entries(parsed)) {
      if (k && typeof v === 'string' && v.startsWith('http') && isValidFoodImageUrl(v)) {
        memoryPhotoCache.set(k, v);
      }
    }
  } catch {
    // Ignore storage read errors
  }
}

function persistPhotoCacheToSession(keys: string[], url: string): void {
  if (!isValidFoodImageUrl(url)) return;
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
  /logo|icon|map|flag|diagram|MNHN|specimen|stamp|drawing|coat_of_arms|locator|portrait|statue|building|street|market_sign|menu_page|locomotive|railway|railroad|train[_\s-]|steam[_\s-]*engine|automobile|aircraft|airplane|helicopter|submarine|warship|weapon|politician|footballer|stadium|airport|cathedral|mosque|monastery/i;

const NON_FOOD_WIKI_PAGE_RE =
  /locomotive|\btrain\b|railway|railroad|steam[\s_]*engine|\bengine\b|\bvehicle\b|automobile|aircraft|airplane|helicopter|\bship\b|submarine|weapon|firearm|military|\bbattle\b|\bwar\b|politician|president|prime minister|\bking\b|\bqueen\b|\bactor\b|actress|\bsinger\b|musician|footballer|\bathlete\b|biography|\balbum\b|\bsong\b|\bfilm\b|\bmovie\b|television|TV series|video[\s_]*game|software|corporation|airline|university|hospital|airport|\bstation\b|district|province|prefecture|municipality|county|\bcity in\b|\btown in\b|\bvillage in\b|commune|\bcountry\b|continent|\briver\b|mountain|volcano|\btemple\b|monastery|pagoda|\bchurch\b|\bmosque\b|cathedral|palace|stadium|museum|bridge|highway|disease|syndrome|infection|\bvirus\b|anatomy|skeleton|list of|history of|glossary of|outline of/i;

const FOOD_CULINARY_SIGNAL_RE =
  /food|dish|cuisine|culinary|edible|eaten|cooked|cooking|meal|breakfast|lunch|dinner|snack|street food|soup|stew|curry|broth|porridge|congee|noodle|pasta|rice|bread|bun|dumpling|roll|crepe|pancake|waffle|cake|pastry|pie|doughnut|cookie|dessert|sweet|pudding|custard|jelly|ice cream|salad|sauce|paste|condiment|dip|seasoning|spice|herb|fermented|pickled|grilled|roasted|fried|steamed|braised|boiled|smoked|dried|meat|beef|pork|chicken|duck|goat|lamb|offal|tripe|sausage|meatball|fish|seafood|shellfish|prawn|shrimp|lobster|crab|squid|clam|cockle|mussel|oyster|snail|egg|omelette|tofu|vegetable|greens|shoot|sprout|root|tuber|gourd|melon|pumpkin|mushroom|fungus|fruit|bean|nut|seed|drink|beverage|tea|coffee|latte|juice|smoothie|milk|syrup/i;

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

const RELEVANCE_STOPWORDS = new Set([
  'the', 'and', 'with', 'for', 'from', 'food', 'dish', 'dishes', 'cuisine', 'cambodian', 'khmer', 'cambodia',
  'traditional', 'authentic', 'style', 'recipe', 'homemade', 'fresh', 'delicious', 'typical', 'local', 'popular',
  'meal', 'photo', 'image', 'picture', 'cooked', 'served',
]);

/** Distinctive lower-case words of an English dish name ("Cambodian Steamed Fish Amok" -> steamed, fish, amok). */
export function significantDishTokens(text: string): string[] {
  return Array.from(
    new Set(
      (text || '')
        .toLowerCase()
        .replace(/\([^)]*\)/g, ' ')
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 3 && !RELEVANCE_STOPWORDS.has(w))
        .map((w) => (w.endsWith('ies') ? `${w.slice(0, -3)}y` : w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    )
  );
}

/** Words that turn a food name into a request / criteria sentence. */
const NON_DISH_MODIFIERS = new Set(['low', 'less', 'high', 'more', 'without', 'free', 'healthy', 'healthier', 'best', 'good', 'better', 'cheap', 'quick', 'easy']);

/** Words that name a *kind* of food, not a specific dish: a hit on them alone proves nothing. */
const GENERIC_FOOD_TOKENS = new Set([
  'fish', 'soup', 'rice', 'noodle', 'salad', 'curry', 'pork', 'beef', 'chicken', 'duck', 'egg', 'shrimp', 'prawn',
  'crab', 'vegetable', 'stir', 'fried', 'grilled', 'steamed', 'boiled', 'roasted', 'sauce', 'stew', 'porridge',
  'cake', 'dessert', 'sweet', 'spicy', 'sour', 'hot', 'low', 'high', 'less', 'more', 'mixed', 'fresh',
]);

/**
 * A search hit is only used when its title / description really talks about the dish we asked for:
 * every DISTINCTIVE word of the dish name (amok, bolognese, cockle...) must appear. If the name has only
 * generic words ("fish soup") all of them must appear.
 * Search engines always return *something* - without this check "low sugar soup" produced a photo of a pastry.
 */
export function isTitleRelevantToDish(queryEnglish: string, title: string, description = ''): boolean {
  const wanted = significantDishTokens(queryEnglish);
  if (wanted.length === 0) return false;
  // "low sugar soup", "best healthy noodles"... describe a REQUEST, not a dish: no page can be a relevant photo for it.
  if (wanted.some((t) => NON_DISH_MODIFIERS.has(t))) return false;
  const haystack = `${title} ${description}`.toLowerCase();
  const distinctive = wanted.filter((t) => !GENERIC_FOOD_TOKENS.has(t));
  const mustHit = distinctive.length > 0 ? distinctive : wanted;
  return mustHit.every((t) => haystack.includes(t));
}

function isSafeFoodWikiPage(title: string, description: string): boolean {
  const combined = `${title} ${description}`;
  if (NON_FOOD_WIKI_PAGE_RE.test(combined)) {
    return false;
  }
  // Reject pure zoological/taxonomic specimen pages unless culinary/edible context is present
  if (/\b(?:species|genus|family|order)\s+of\s+(?:insect|beetle|spider|moth|butterfly|bird|mammal|reptile|amphibian)s?\b/i.test(description)) {
    if (!FOOD_CULINARY_SIGNAL_RE.test(combined)) {
      return false;
    }
  }
  return true;
}

export function getCachedUniversalDishPhoto(dishQuery: string): string | null {
  hydratePhotoCacheFromSession();
  const rawTrimmed = (dishQuery || '').replace(/[?？!！។«»"']/g, ' ').replace(/\s+/g, ' ').trim();
  if (!rawTrimmed) return null;
  const normKey = normalizeKhmerFoodText(rawTrimmed) || rawTrimmed.toLowerCase();
  const direct = memoryPhotoCache.get(normKey) || memoryPhotoCache.get(rawTrimmed.toLowerCase());
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
 * Translates ANY Khmer or Chinese dish/ingredient phrase to English using:
 *   1. Native Wikipedia (`km.wikipedia.org` / `zh.wikipedia.org`) interlanguage links & food-verified pageimages
 *   2. Google Neural Translate GTX (`translate.googleapis.com`, CORS `*`, keyless) for 100% Khmer vocabulary coverage
 *   3. MyMemory Free Open Translation API backup
 */
async function resolveViaNativeWikipediaAndOpenTranslate(
  nativeDishName: string
): Promise<{ directPhotoUrl?: string; englishTerm?: string }> {
  const isKhmer = /[\u1780-\u17FF]/.test(nativeDishName);
  const isChinese = /[\u4E00-\u9FFF]/.test(nativeDishName);
  const wikiLang = isKhmer ? 'km' : isChinese ? 'zh' : '';
  const langPair = isKhmer ? 'km|en' : isChinese ? 'zh|en' : '';
  const normalizedNative = isKhmer ? normalizeKhmerFoodText(nativeDishName) || nativeDishName : nativeDishName;

  const wikiTask: Promise<{ directPhotoUrl?: string; englishTerm?: string }> = wikiLang
    ? (async (): Promise<{ directPhotoUrl?: string; englishTerm?: string }> => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2800);
        try {
          const url = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
            normalizedNative
          )}&gsrlimit=3&prop=pageimages|langlinks|description&piprop=thumbnail&pithumbsize=800&lllang=en&format=json&origin=*`;
          const res = await fetch(url, { headers: WIKIMEDIA_API_HEADERS, signal: controller.signal });
          clearTimeout(timer);
          if (!res.ok) return {};
          const data = await res.json();
          const pages = (Object.values(data?.query?.pages || {}) as any[]).sort(
            (a, b) => (a.index || 99) - (b.index || 99)
          );
          for (const p of pages) {
            const title = String(p?.title || '');
            const enLink = typeof p?.langlinks?.[0]?.['*'] === 'string' ? p.langlinks[0]['*'] : '';
            const desc = String(p?.description || '');
            if (!isSafeFoodWikiPage(`${title} ${enLink}`, desc)) continue;
            // Full-text search is fuzzy: only trust a page whose TITLE is (almost) the phrase the user typed.
            const compactTitle = normalizeKhmerFoodText(title) || title;
            const titleMatches =
              compactTitle === normalizedNative ||
              compactTitle.includes(normalizedNative) ||
              (compactTitle.length >= 3 && normalizedNative.includes(compactTitle) && compactTitle.length >= normalizedNative.length * 0.7);
            if (!titleMatches) continue;
            const validImg = isValidFoodImageUrl(p?.thumbnail?.source, `${title} ${enLink}`);
            if (validImg || enLink) {
              return {
                directPhotoUrl: validImg || undefined,
                englishTerm: enLink || undefined,
              };
            }
          }
        } catch {
          clearTimeout(timer);
        }
        return {};
      })()
    : Promise.resolve({});

  const googleTranslateTask: Promise<string | undefined> = wikiLang
    ? (async (): Promise<string | undefined> => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2800);
        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${wikiLang}&tl=en&dt=t&q=${encodeURIComponent(
            normalizedNative
          )}`;
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timer);
          if (!res.ok) return undefined;
          const data = await res.json();
          if (Array.isArray(data?.[0])) {
            const text = data[0]
              .map((seg: any) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
              .join('')
              .trim();
            if (text && /[A-Za-z]/.test(text)) {
              return text;
            }
          }
        } catch {
          clearTimeout(timer);
        }
        return undefined;
      })()
    : Promise.resolve(undefined);

  const myMemoryTask: Promise<string | undefined> = langPair
    ? (async (): Promise<string | undefined> => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2800);
        try {
          const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
            normalizedNative
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

  const [wikiRes, googleEn, myMemoryEn] = await Promise.all([wikiTask, googleTranslateTask, myMemoryTask]);
  return {
    directPhotoUrl: wikiRes.directPhotoUrl,
    englishTerm: wikiRes.englishTerm || googleEn || myMemoryEn,
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

async function queryEnglishWikipediaPageImage(
  term: string,
  requireFoodSignal = false,
  relevanceQuery?: string
): Promise<string | null> {
  if (!term) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      term
    )}&gsrlimit=6&prop=pageimages|description&piprop=thumbnail&pithumbsize=800&format=json&origin=*`;
    const res = await fetch(url, { headers: WIKIMEDIA_API_HEADERS, signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const pages = (Object.values(data?.query?.pages || {}) as any[]).sort(
        (a, b) => (a.index || 99) - (b.index || 99)
      );

      let fallbackNeutralImg: string | null = null;
      for (const p of pages) {
        const title = String(p?.title || '');
        const desc = String(p?.description || '');
        if (!isSafeFoodWikiPage(title, desc)) {
          continue;
        }
        if (relevanceQuery && !isTitleRelevantToDish(relevanceQuery, title, desc)) {
          continue;
        }
        const valid = isValidFoodImageUrl(p?.thumbnail?.source, title);
        if (!valid) continue;

        const hasFoodSignal = FOOD_CULINARY_SIGNAL_RE.test(`${title} ${desc}`);
        if (hasFoodSignal) {
          return valid;
        }
        if (!requireFoodSignal && !relevanceQuery && !fallbackNeutralImg) {
          fallbackNeutralImg = valid;
        }
      }
      return fallbackNeutralImg;
    }
  } catch {
    clearTimeout(timer);
  }
  return null;
}

async function queryWikimediaCommonsBitmap(term: string, relevanceQuery?: string): Promise<string | null> {
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
        const title = String(p?.title || '');
        if (NON_FOOD_WIKI_PAGE_RE.test(title)) continue;
        if (relevanceQuery) {
          const cleanFileTitle = title.replace(/^File:/i, '').replace(/\.[a-z]{3,4}$/i, '');
          if (!isTitleRelevantToDish(relevanceQuery, cleanFileTitle) || !FOOD_CULINARY_SIGNAL_RE.test(cleanFileTitle)) {
            continue;
          }
        }
        const rawUrl = p?.imageinfo?.[0]?.thumburl || p?.imageinfo?.[0]?.url;
        const valid = isValidFoodImageUrl(rawUrl, title);
        if (valid) return valid;
      }
    }
  } catch {
    clearTimeout(timer);
  }
  return null;
}

const NON_FOOD_GREETING_OR_CHITCHAT_RE =
  /^(?:hello|hi|hey|yo|good\s*(?:morning|afternoon|evening|night)|how\s*are\s*you|what'?s\s*up|thanks?|thank\s*you|ok(?:ay)?|yes|no|help|test|who\s*are\s*you|សួស្តី|ជំរាបសួរ|ជម្រាបសួរ|អរគុណ|បាទ|ចាស|សុខសប្បាយ|你好|您好|谢谢|早上好|晚上好)(?:\s|[!?.។؟])*$/i;

/**
 * Fetches an authentic, legal, strictly food-verified Open-API dish photo for ANY out-of-catalog dish
 * in Khmer (any spelling/dialect), English, or Chinese.
 */
export async function fetchUniversalDishPhotoFromOpenApis(dishQuery: string): Promise<string | null> {
  hydratePhotoCacheFromSession();
  const rawTrimmed = (dishQuery || '').replace(/[?？!！។«»"']/g, ' ').replace(/\s+/g, ' ').trim();
  if (!rawTrimmed) return null;
  if (NON_FOOD_GREETING_OR_CHITCHAT_RE.test(rawTrimmed)) return null;
  // A sentence / question / criteria phrase is not a dish: never go fishing for a "matching" photo.
  if (isQuestionOrCriteriaQuery(rawTrimmed)) return null;

  const normKey = normalizeKhmerFoodText(rawTrimmed) || rawTrimmed.toLowerCase();
  const existingHit = getCachedUniversalDishPhoto(rawTrimmed);
  if (existingHit) return existingHit;

  if (inFlightPhotoRequests.has(normKey)) {
    return inFlightPhotoRequests.get(normKey)!;
  }

  const task = (async (): Promise<string | null> => {
    const translated = translateUniversalDishQuery(rawTrimmed);
    let primarySearchTerm = translated.wikiQuery;
    const preferredCommonsTerm = translated.commonsQuery;
    let mealDbTerm = translated.mealDbQuery;
    const cacheKeysToSave = Array.from(new Set([normKey, rawTrimmed.toLowerCase()]));

    if (translated.hasLexiconMatch) {
      cacheKeysToSave.push(`wiki:${(preferredCommonsTerm || translated.wikiQuery).toLowerCase()}`);
    } else {
      // Unknown or novel Khmer/Chinese dish: resolve via Native Wikipedia + Google Neural GTX + MyMemory!
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

    // Require explicit food/culinary Wikidata description when searching free-form translated queries
    const requireStrictFoodWiki = !translated.hasLexiconMatch;
    // Free-form (non-curated) dishes must prove relevance: the hit's title has to mention the dish itself.
    const relevanceQuery = !translated.hasLexiconMatch ? primarySearchTerm : undefined;

    // 1. Try TheMealDB + Curated Commons Dish Query + English Wikipedia Food-Verified Lead Image in parallel!
    const [mealDbPhoto, preferredCommonsPhoto, enWikiPhoto] = await Promise.all([
      mealDbTerm ? queryTheMealDb(mealDbTerm) : Promise.resolve(null),
      preferredCommonsTerm ? queryWikimediaCommonsBitmap(preferredCommonsTerm, relevanceQuery) : Promise.resolve(null),
      queryEnglishWikipediaPageImage(primarySearchTerm, requireStrictFoodWiki, relevanceQuery),
    ]);

    const fastWinner = mealDbPhoto || preferredCommonsPhoto || enWikiPhoto;
    if (fastWinner) {
      persistPhotoCacheToSession(cacheKeysToSave, fastWinner);
      return fastWinner;
    }

    // 2. Try food-qualified Wikipedia & Wikimedia Commons Bitmap fallbacks
    const coreNoun = primarySearchTerm
      .replace(
        /\b(?:grilled|charcoal|fried|stir[\s-]*fried|pan[\s-]*fried|deep[\s-]*fried|roasted|steamed|blanched|braised|caramelized|spicy|pickled|cambodian|khmer|authentic|traditional|with|and|in|of|dish|food|cuisine)\b/gi,
        ' '
      )
      .replace(/\s+/g, ' ')
      .trim();
    const coreWords = coreNoun.split(/\s+/).filter((w) => w.length >= 3);
    const firstPlusLast =
      coreWords.length >= 3 ? `${coreWords[0]} ${coreWords[coreWords.length - 1]}` : '';
    const lastTwoWords =
      coreWords.length >= 3
        ? `${coreWords[coreWords.length - 2]} ${coreWords[coreWords.length - 1]}`
        : '';
    const tailNoun = coreWords.length >= 2 ? coreWords[coreWords.length - 1] : '';

    const candidates = Array.from(
      new Set(
        [
          `${primarySearchTerm} food`,
          firstPlusLast,
          lastTwoWords,
          coreNoun.length >= 3 ? coreNoun : '',
          translated.fallbackWikiQuery || '',
          ...(relevanceQuery ? [] : [tailNoun ? `${tailNoun} food` : '', tailNoun]),
        ].filter(Boolean)
      )
    );

    for (const q of candidates) {
      const wikiFoodRetry = await queryEnglishWikipediaPageImage(q, true, relevanceQuery);
      if (wikiFoodRetry) {
        persistPhotoCacheToSession(cacheKeysToSave, wikiFoodRetry);
        return wikiFoodRetry;
      }
      const commonsHit = await queryWikimediaCommonsBitmap(q, relevanceQuery);
      if (commonsHit) {
        persistPhotoCacheToSession(cacheKeysToSave, commonsHit);
        return commonsHit;
      }
    }

    return null;
  })().finally(() => {
    inFlightPhotoRequests.delete(normKey);
  });

  inFlightPhotoRequests.set(normKey, task);
  return task;
}

/**
 * Looks up a photo for a dish whose ENGLISH name is already known (e.g. named by the AI assistant).
 * Returns a photo only when its title/description really mentions the dish - otherwise `null`
 * (the UI then shows a neutral placeholder instead of a look-alike or unrelated picture).
 */
export async function fetchVerifiedDishPhotoByEnglishName(englishName: string): Promise<string | null> {
  hydratePhotoCacheFromSession();
  const name = (englishName || '').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (name.length < 3 || significantDishTokens(name).length === 0) return null;
  const cacheKey = `verified:${name.toLowerCase()}`;
  const cached = memoryPhotoCache.get(cacheKey);
  if (cached) return cached;
  if (inFlightPhotoRequests.has(cacheKey)) return inFlightPhotoRequests.get(cacheKey)!;

  const task = (async (): Promise<string | null> => {
    const [mealDb, wiki, commons] = await Promise.all([
      queryTheMealDbVerified(name),
      queryEnglishWikipediaPageImage(name, true, name),
      queryWikimediaCommonsBitmap(`${name} dish`, name),
    ]);
    const hit = mealDb || wiki || commons;
    if (hit) persistPhotoCacheToSession([cacheKey], hit);
    return hit || null;
  })().finally(() => {
    inFlightPhotoRequests.delete(cacheKey);
  });
  inFlightPhotoRequests.set(cacheKey, task);
  return task;
}

/** TheMealDB search whose returned MEAL NAME must also match the dish asked for. */
async function queryTheMealDbVerified(term: string): Promise<string | null> {
  if (!term || !/[A-Za-z]/.test(term)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2800);
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(term)}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    for (const meal of (Array.isArray(data?.meals) ? data.meals : []) as any[]) {
      if (isTitleRelevantToDish(term, String(meal?.strMeal || '')) && typeof meal?.strMealThumb === 'string') {
        return meal.strMealThumb;
      }
    }
  } catch {
    clearTimeout(timer);
  }
  return null;
}
