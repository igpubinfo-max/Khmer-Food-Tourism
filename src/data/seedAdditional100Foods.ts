import { FoodItem, FoodCategorySlug } from '../types';

interface AdditionalDishSeed {
  id: string;
  nameKh: string;
  nameEn: string;
  cat: FoodCategorySlug;
  catKh: string;
  catEn: string;
  descKh: string;
  descEn: string;
  photoUrl: string;
  mainIngKh: string;
  mainIngEn: string;
  subIngKh: string;
  subIngEn: string;
  herbKh: string;
  herbEn: string;
  prepTime: string;
  cookTime: string;
  calories: number;
}

// Dedicated verified local photos (/foods/food-101.jpg .. /foods/food-200.jpg)
function getMatchedOnlinePhotoUrl(_cat: FoodCategorySlug, _index: number, dishId: string): string {
  return `/foods/${dishId}.jpg`;
}

const RAW_100_NEW_DISHES: Array<{
  nameKh: string;
  nameEn: string;
  cat: FoodCategorySlug;
  catKh: string;
  catEn: string;
  mainIngKh: string;
  mainIngEn: string;
  subIngKh: string;
  subIngEn: string;
  herbKh: string;
  herbEn: string;
}> = [
  // ================= SOUPS & CURRIES (16 dishes: food-101 .. food-116) =================
  {
    nameKh: 'សម្លម្ជូរព្រៃសាច់គោ',
    nameEn: 'Wild Forest Sour Beef Soup (Samlor Machu Prey)',
    cat: 'soup',
    catKh: 'ម្ហូបសម្ល / ម្ជូរព្រៃ',
    catEn: 'Soup / Forest Sour',
    mainIngKh: 'សាច់គោជាប់ខ្លាញ់ហាន់បន្ទះ (៤០០ ក្រាម)',
    mainIngEn: 'Sliced beef brisket (400g)',
    subIngKh: 'គល់ស្លឹកគ្រៃ ផ្លែក្រសាំង និងទំពាំងស្រស់',
    subIngEn: 'Lemongrass stalks, wood-apple, and fresh bamboo shoots',
    herbKh: 'ស្លឹកម្រះព្រៅ និងស្លឹកក្រូចសើច',
    herbEn: 'Holy basil and kaffir lime leaves',
  },
  {
    nameKh: 'សម្លប្រហើរទំពាំងខ្យង',
    nameEn: 'Bamboo Shoot & Freshwater Snail Herbal Soup',
    cat: 'soup',
    catKh: 'ម្ហូបសម្ល / ប្រហើរ',
    catEn: 'Soup / Herbal Praher',
    mainIngKh: 'សាច់ខ្យងស្រែស្ងោរឆ្កឹះរួច (៣៥០ ក្រាម)',
    mainIngEn: 'Cleaned freshwater paddy snails (350g)',
    subIngKh: 'ទំពាំងស្រស់ហាន់ស្តើង និងផ្សិតចំបើង',
    subIngEn: 'Sliced fresh bamboo shoots and straw mushrooms',
    herbKh: 'ស្លឹកបាស ស្លឹកម្រុំ និងជីរនាងវង',
    herbEn: 'Ivy gourd leaves, moringa leaves, and lemon basil',
  },
  {
    nameKh: 'សម្លម្ជូរត្រួយអម្ពិលត្រីរ៉ស់',
    nameEn: 'Young Tamarind Leaf & Snakehead Sour Soup',
    cat: 'soup',
    catKh: 'ម្ហូបសម្ល / ម្ជូរខ្មែរ',
    catEn: 'Soup / Tamarind Leaf',
    mainIngKh: 'ត្រីរ៉ស់ស្រស់កាត់កង់ (៥០០ ក្រាម)',
    mainIngEn: 'Fresh snakehead fish steaks (500g)',
    subIngKh: 'ត្រួយអម្ពិលខ្ចី និងប៉េងប៉ោះទុំ',
    subIngEn: 'Young tender tamarind leaves and ripe tomatoes',
    herbKh: 'ជីររណារ និងខ្ទឹមសបំពង',
    herbEn: 'Culantro and crispy fried garlic',
  },
  {
    nameKh: 'សម្លការីសាច់ត្រី',
    nameEn: 'Khmer Red Fish Coconut Curry',
    cat: 'soup',
    catKh: 'ម្ហូបសម្ល / ការីសាច់ត្រី',
    catEn: 'Soup / Fish Coconut Curry',
    mainIngKh: 'សាច់ត្រីស្រស់កាត់កង់ (៥០០ ក្រាម)',
    mainIngEn: 'Fresh river fish steaks (500g)',
    subIngKh: 'ខ្ទិះដូងដើមខាប់ ត្រប់ស្រួយ សណ្តែកគួរ និងសណ្តែកដីលីង',
    subIngEn: 'Rich coconut cream, round eggplant, long beans, and roasted peanuts',
    herbKh: 'គ្រឿងការីក្រហមខ្មែរ និងស្លឹកក្រូចសើច',
    herbEn: 'Khmer red curry paste and kaffir lime leaves',
  },
  {
    nameKh: 'សម្លឆ្អឹងជំនីរជ្រូកស្ងោរជ្រក់ផ្សិត',
    nameEn: 'Hot & Sour Pork Rib Soup with Straw Mushrooms',
    cat: 'soup',
    catKh: 'ម្ហូបសម្ល / ស្ងោរជ្រក់',
    catEn: 'Soup / Hot & Sour',
    mainIngKh: 'ឆ្អឹងជំនីរជ្រូកខ្ចី (៤៥០ ក្រាម)',
    mainIngEn: 'Young pork spare ribs (450g)',
    subIngKh: 'ផ្សិតចំបើងស្រស់ និងទឹកក្រូចឆ្មារ',
    subIngEn: 'Fresh straw mushrooms and lime juice',
    herbKh: 'គល់ស្លឹកគ្រៃ រំដេង និងជីរវ៉ាន់ស៊ុយ',
    herbEn: 'Lemongrass, galangal, and cilantro',
  },
  {
    nameKh: 'ព្រៃត្រីអណ្តែងទំពាំងត្រាំ',
    nameEn: 'Spicy Forest Catfish & Pickled Bamboo Shoot Soup',
    cat: 'soup',
    catKh: 'ម្ហូបសម្ល / សម្លព្រៃ',
    catEn: 'Soup / Forest Pickled Bamboo',
    mainIngKh: 'ត្រីអណ្តែងស្រស់កាត់កង់ (៤៥០ ក្រាម)',
    mainIngEn: 'Fresh walking catfish steaks (450g)',
    subIngKh: 'ទំពាំងត្រាំជូរស្រួយ គល់ស្លឹកគ្រៃ និងប្រហុកសាច់',
    subIngEn: 'Tangy pickled bamboo shoots, lemongrass, and prahok paste',
    herbKh: 'ម្រះព្រៅ ស្លឹកក្រូចសើច និងម្ទេសខ្មាំង',
    herbEn: 'Holy basil, kaffir lime leaves, and bird-eye chili',
  },
  {
    nameKh: 'សម្លកកូរត្នោតសាច់ជ្រូកបីជាន់',
    nameEn: 'Ripe Palm Fruit Stew with Pork Belly (Samlor Korko Tnot)',
    cat: 'soup',
    catKh: 'ម្ហូបសម្ល / ប្រពៃណី',
    catEn: 'Soup / Palm Stew',
    mainIngKh: 'សាច់ជ្រូកបីជាន់ និងត្រីឆ្អើរ (៣៥០ ក្រាម)',
    mainIngEn: 'Pork belly and smoked fish (350g)',
    subIngKh: 'សាច់ត្នោតទុំច្របាច់យកទឹកខាប់ និងអង្ករលីង',
    subIngEn: 'Ripe toddy palm fruit pulp and toasted rice powder',
    herbKh: 'ស្លឹកម្រុំ និងស្លឹកបាស',
    herbEn: 'Moringa leaves and ivy gourd greens',
  },
  {
    nameKh: 'សម្លស្ងោរម្រះញាត់សាច់ជ្រូកមីសួរ',
    nameEn: 'Stuffed Bitter Melon & Glass Noodle Clear Soup',
    cat: 'soup',
    catKh: 'ម្ហូបសម្ល / ស្ងោរម្រះ',
    catEn: 'Soup / Stuffed Melon',
    mainIngKh: 'សាច់ជ្រូកចិញ្ច្រាំលាយមីសួរ និងផ្សិតត្រចៀកកណ្តុរ (៤០០ ក្រាម)',
    mainIngEn: 'Minced pork with glass noodles and wood-ear mushroom (400g)',
    subIngKh: 'ផ្លែម្រះស្រស់កាត់កង់ខ្វេះគ្រាប់ចេញ',
    subIngEn: 'Fresh bitter melon rings hollowed for stuffing',
    herbKh: 'ស្លឹកខ្ទឹម និងម្រេចកំពតម៉ត់',
    herbEn: 'Spring onions and ground Kampot white pepper',
  },
  {
    nameKh: 'សម្លម្ជូរគ្រឿងពោះគោត្រកួន',
    nameEn: 'Cambodian Beef Tripe Sour Kroeung Soup with Morning Glory',
    cat: 'soup',
    catKh: 'ម្ហូបសម្ល / ម្ជូរគ្រឿង',
    catEn: 'Soup / Beef Tripe Kroeung',
    mainIngKh: 'ពោះគោស្ងោរផុយហាន់ដុំល្មម (៤៥០ ក្រាម)',
    mainIngEn: 'Tender simmered honeycomb beef tripe (450g)',
    subIngKh: 'ត្រកួនស្រែ និងអម្ពិលទុំ',
    subIngEn: 'Field morning glory and ripe tamarind',
    herbKh: 'គ្រឿងបុករមៀតស្លឹកគ្រៃ និងស្លឹកក្រូចសើច',
    herbEn: 'Turmeric lemongrass kroeung and kaffir lime leaves',
  },
  {
    nameKh: 'សម្លប្រហើរត្រីឆ្អើរ',
    nameEn: 'Smoked River Fish & Moringa Leaf Herbal Soup',
    cat: 'soup',
    catKh: 'ម្ហូបសម្ល / ប្រហើរខ្មែរ',
    catEn: 'Soup / Smoked Fish Moringa',
    mainIngKh: 'ត្រីឆ្អើរហែកយកសាច់ (៣០០ ក្រាម)',
    mainIngEn: 'Flaked smoked river fish (300g)',
    subIngKh: 'ល្ពៅ ននោង និងស្លឹកម្រុំស្រស់',
    subIngEn: 'Pumpkin, sponge gourd, and fresh moringa leaves',
    herbKh: 'គល់ស្លឹកគ្រៃដំ និងជីរនាងវង',
    herbEn: 'Bruised lemongrass and lemon basil',
  },
  {
    nameKh: 'សម្លស្ងោរមាន់ស្លឹកគ្រៃក្រូចសើច',
    nameEn: 'Free-Range Chicken Lemongrass & Kaffir Lime Soup',
    cat: 'soup',
    catKh: 'ម្ហូបសម្ល / ស្ងោរមាន់',
    catEn: 'Soup / Lemongrass Chicken',
    mainIngKh: 'សាច់មាន់ស្រែហាន់ដុំ (៥០០ ក្រាម)',
    mainIngEn: 'Free-range country chicken pieces (500g)',
    subIngKh: 'គល់ស្លឹកគ្រៃ រំដេង និងក្រូចឆ្មារ',
    subIngEn: 'Lemongrass, galangal, and fresh lime juice',
    herbKh: 'ស្លឹកក្រូចសើច និងជីររណារ',
    herbEn: 'Kaffir lime leaves and culantro',
  },
  {
    nameKh: 'សម្លម្ជូរត្រកួនត្រីពោធិ៍',
    nameEn: 'Mekong Pangasius Fish & Water Spinach Sour Soup',
    cat: 'soup',
    catKh: 'ម្ហូបសម្ល / ម្ជូរត្រកួន',
    catEn: 'Soup / River Fish Sour',
    mainIngKh: 'ត្រីពោធិ៍ទន្លេមេគង្គកាត់កង់ (៥០០ ក្រាម)',
    mainIngEn: 'Fresh Mekong pangasius fish steaks (500g)',
    subIngKh: 'ត្រកួនស្រស់ និងទឹកអម្ពិលទុំ',
    subIngEn: 'Fresh water spinach and tamarind juice',
    herbKh: 'ជីរម្អម និងខ្ទឹមសបំពង',
    herbEn: 'Rice paddy herb (Ma-om) and fried garlic',
  },
  {
    nameKh: 'សម្លខ្ទិះម្នាស់សាច់ជ្រូកបីជាន់',
    nameEn: 'Coconut Cream Pineapple & Pork Belly Curry (Samlor Ktis)',
    cat: 'soup',
    catKh: 'ម្ហូបសម្ល / សម្លខ្ទិះ',
    catEn: 'Soup / Coconut Pineapple',
    mainIngKh: 'សាច់ជ្រូកបីជាន់ ឬឆ្អឹងជំនីរជ្រូក (៤០០ ក្រាម)',
    mainIngEn: 'Pork belly or pork ribs (400g)',
    subIngKh: 'ម្នាស់ទុំផ្អែមជូរ និងខ្ទិះដូងដើមខាប់',
    subIngEn: 'Sweet-tart pineapple chunks and rich coconut milk',
    herbKh: 'គ្រឿងបុកក្រហម និងស្លឹកក្រូចសើច',
    herbEn: 'Red kroeung paste and kaffir lime leaves',
  },
  {
    nameKh: 'សម្លប្រហើរផ្សិតចំបើង សាច់ត្រី',
    nameEn: 'Straw Mushroom & Fresh Fish Herbal Soup',
    cat: 'soup',
    catKh: 'ម្ហូបសម្ល / ប្រហើរផ្សិតសាច់ត្រី',
    catEn: 'Soup / Mushroom & Fish Praher',
    mainIngKh: 'សាច់ត្រីទឹកសាបស្រស់កាត់កង់ (៤០០ ក្រាម)',
    mainIngEn: 'Fresh river fish fillets or steaks (400g)',
    subIngKh: 'ផ្សិតចំបើង ននោងខ្ចី និងប្រហុកបន្តិច',
    subIngEn: 'Straw mushrooms, young angled luffa, and a hint of prahok',
    herbKh: 'គល់ស្លឹកគ្រៃខ្ជាយបុក ជីរនាងវង និងស្លឹកបាស',
    herbEn: 'Pounded lemongrass-fingerroot, lemon basil, and ivy gourd leaves',
  },
  {
    nameKh: 'សម្លម្ជូរស្លឹកថ្នឹងសាច់មាន់ស្រែ',
    nameEn: 'Country Chicken & Sour Forest Leaf Soup',
    cat: 'soup',
    catKh: 'ម្ហូបសម្ល / ម្ជូរស្លឹកថ្នឹង',
    catEn: 'Soup / Sour Forest Leaf',
    mainIngKh: 'សាច់មាន់ស្រែកាប់ដុំ (៥០០ ក្រាម)',
    mainIngEn: 'Country chicken pieces (500g)',
    subIngKh: 'ស្លឹកថ្នឹង ឬស្លឹកម្កាក់ព្រៃ',
    subIngEn: 'Wild sour forest leaves',
    herbKh: 'គល់ស្លឹកគ្រៃ រំដេង និងម្រះព្រៅ',
    herbEn: 'Lemongrass, galangal, and holy basil',
  },
  {
    nameKh: 'សម្លស្ងោរត្រឡាចសាច់ជ្រូកចិញ្ច្រាំ',
    nameEn: 'Winter Melon & Minced Pork Clear Broth Soup',
    cat: 'soup',
    catKh: 'ម្ហូបសម្ល / ស្ងោរត្រឡាច',
    catEn: 'Soup / Winter Melon',
    mainIngKh: 'សាច់ជ្រូកចិញ្ច្រាំមូលជាដុំ (៣០០ ក្រាម)',
    mainIngEn: 'Seasoned minced pork meatballs (300g)',
    subIngKh: 'ផ្លែត្រឡាចខ្ចីចិតដុំល្មម និងបង្គាក្រៀម',
    subIngEn: 'Young winter melon wedges and dried shrimp',
    herbKh: 'ស្លឹកខ្ទឹម ជីរវ៉ាន់ស៊ុយ និងម្រេចកំពត',
    herbEn: 'Scallions, cilantro, and Kampot pepper',
  },

  // ================= GRILLED & ROASTED (14 dishes: food-117 .. food-130) =================
  {
    nameKh: 'ត្រីរ៉ស់ដុតអំបិល',
    nameEn: 'Salt-Crusted Grilled Snakehead Fish',
    cat: 'grilled',
    catKh: 'ម្ហូបអាំង / ត្រីដុតអំបិល',
    catEn: 'Grilled / Salt-Crusted Fish',
    mainIngKh: 'ត្រីរ៉ស់ធំស្រស់ ១ ក្បាល (៨០០ ក្រាម)',
    mainIngEn: 'Whole fresh snakehead fish (800g)',
    subIngKh: 'អំបិលគ្រួសលាយម្សៅមីបិទជុំវិញត្រី និងគល់ស្លឹកគ្រៃញាត់ពោះត្រី',
    subIngEn: 'Coarse sea salt crust with stuffed lemongrass',
    herbKh: 'ស្លឹកគ្រៃ ស្លឹកក្រូចសើច និងទឹកត្រីកោះកុង',
    herbEn: 'Lemongrass bundle, kaffir lime, and spicy dipping sauce',
  },
  {
    nameKh: 'មាន់ដុតទឹកឃ្មុំភ្នំគូលែន',
    nameEn: 'Kulen Mountain Honey Glazed Roasted Chicken',
    cat: 'grilled',
    catKh: 'ម្ហូបអាំង / មាន់ដុតទឹកឃ្មុំ',
    catEn: 'Grilled / Honey Roast Chicken',
    mainIngKh: 'មាន់ស្រែទាំងមូល ១ ក្បាល (១.២ គីឡូក្រាម)',
    mainIngEn: 'Whole free-range chicken (1.2kg)',
    subIngKh: 'ទឹកឃ្មុំព្រៃភ្នំគូលែន ប្រេងខ្យង និងខ្ទឹមស',
    subIngEn: 'Wild Kulen honey glaze, oyster sauce, and garlic',
    herbKh: 'គល់ស្លឹកគ្រៃ និងម្រេចកំពត',
    herbEn: 'Lemongrass and crushed Kampot black pepper',
  },
  {
    nameKh: 'កង្កែបបោកអាំងគ្រឿងខ្មែរ',
    nameEn: 'Stuffed Lemongrass Kroeung Grilled Frog (Kangkaeb Baok)',
    cat: 'grilled',
    catKh: 'ម្ហូបអាំង / កង្កែបបោក',
    catEn: 'Grilled / Stuffed Frog',
    mainIngKh: 'កង្កែបស្រែធំៗ និងសាច់ជ្រូកចិញ្ច្រាំ (៥០០ ក្រាម)',
    mainIngEn: 'Field frogs stuffed with minced pork & kroeung (500g)',
    subIngKh: 'គ្រឿងបុករមៀត សណ្តែកដីលីង និងខ្ទិះដូង',
    subIngEn: 'Turmeric kroeung paste, roasted peanuts, and coconut cream',
    herbKh: 'ស្លឹកក្រូចសើចហាន់សរសៃ និងម្ទេសក្រហម',
    herbEn: 'Shredded kaffir lime leaves and red chili',
  },
  {
    nameKh: 'សាច់គោអាំងទឹកប្រហុក',
    nameEn: 'Charcoal Grilled Beef with Savory Prahok Dip',
    cat: 'grilled',
    catKh: 'ម្ហូបអាំង / សាច់គោអាំង',
    catEn: 'Grilled / Beef & Prahok Dip',
    mainIngKh: 'សាច់គោជាប់ខ្លាញ់ហាន់បន្ទះ (៤៥០ ក្រាម)',
    mainIngEn: 'Marbled beef sirloin slices (450g)',
    subIngKh: 'ទឹកប្រហុកចិញ្ច្រាំ គល់ស្លឹកគ្រៃ ខ្ទឹមស ម្ទេស និងក្រូចឆ្មារ',
    subIngEn: 'Savory prahok dipping sauce with minced lemongrass, garlic, chili, and lime',
    herbKh: 'ត្រសក់ ត្រប់ស្រួយ ចេកខ្ចី និងជីរគ្រប់មុខ',
    herbEn: 'Crisp cucumber, Thai eggplant, green banana, and fresh herbs',
  },
  {
    nameKh: 'មឹកអាំងទឹកត្រីកោះកុងហឹរ',
    nameEn: 'Charcoal Grilled Whole Squid with Spicy Koh Kong Sauce',
    cat: 'grilled',
    catKh: 'ម្ហូបអាំង / គ្រឿងសមុទ្រអាំង',
    catEn: 'Grilled / Whole Squid',
    mainIngKh: 'មឹកសមុទ្រស្រស់ធំៗ (៥០០ ក្រាម)',
    mainIngEn: 'Fresh whole ocean squid (500g)',
    subIngKh: 'ទឹកត្រីកោះកុង ខ្ទឹមស ម្ទេសខ្មាំង និងក្រូចឆ្មារ',
    subIngEn: 'Koh Kong garlic-chili-lime fish sauce dip',
    herbKh: 'ជីរវ៉ាន់ស៊ុយ និងសាឡាត់ស្រស់',
    herbEn: 'Fresh cilantro and crisp lettuce',
  },
  {
    nameKh: 'បង្គាទន្លេមេគង្គអាំងអំបិលម្ទេស',
    nameEn: 'Grilled Mekong Giant River Prawns with Chili Salt',
    cat: 'grilled',
    catKh: 'ម្ហូបអាំង / បង្គាទន្លេអាំង',
    catEn: 'Grilled / Mekong River Prawns',
    mainIngKh: 'បង្គាទន្លេមេគង្គធំៗពុះខ្នង (៦០០ ក្រាម)',
    mainIngEn: 'Split giant Mekong river prawns (600g)',
    subIngKh: 'ខ្លាញ់ខ្ទឹមស និងអំបិលម្ទេសក្រូចឆ្មារម្រេចកំពត',
    subIngEn: 'Garlic butter and Kampot lime-pepper dipping salt',
    herbKh: 'ជីរអង្កាម និងក្រូចឆ្មារស្រស់',
    herbEn: 'Fresh mint leaves and lime wedges',
  },
  {
    nameKh: 'ឆ្អឹងជំនីរជ្រូកអាំងស្ករត្នោតខ្ទឹមស',
    nameEn: 'Palm Sugar & Garlic Charcoal Grilled Pork Ribs',
    cat: 'grilled',
    catKh: 'ម្ហូបអាំង / ឆ្អឹងជំនីរអាំង',
    catEn: 'Grilled / Palm Sugar Pork Ribs',
    mainIngKh: 'ឆ្អឹងជំនីរជ្រូក (៦០០ ក្រាម)',
    mainIngEn: 'Pork spare ribs (600g)',
    subIngKh: 'ស្ករត្នោតខ្មែរ ខ្ទឹមសបុក និងទឹកឃ្មុំ',
    subIngEn: 'Cambodian palm sugar, crushed garlic, and honey marinade',
    herbKh: 'ម្រេចកំពត និងជ្រក់ល្ហុងការ៉ុត',
    herbEn: 'Kampot black pepper and pickled green papaya',
  },
  {
    nameKh: 'ត្រីអណ្តែងអាំងទឹកត្រីអម្ពិលទុំ',
    nameEn: 'Charcoal Grilled Catfish with Sweet Tamarind Sauce',
    cat: 'grilled',
    catKh: 'ម្ហូបអាំង / ត្រីអណ្តែងអាំង',
    catEn: 'Grilled / Catfish & Tamarind',
    mainIngKh: 'ត្រីអណ្តែងស្រស់ ២ ក្បាល (៦០០ ក្រាម)',
    mainIngEn: 'Two whole fresh catfish (600g)',
    subIngKh: 'ទឹកត្រីអម្ពិលទុំខាប់លាយខ្ទឹមក្រហមបំពង',
    subIngEn: 'Rich tamarind fish sauce topped with crispy shallots',
    herbKh: 'ស្លឹកស្តៅ ឬបន្លែស្រស់តាមចំណូលចិត្ត',
    herbEn: 'Blanched neem flowers or fresh seasonal greens',
  },
  {
    nameKh: 'គ្រំសមុទ្រអាំងខ្លាញ់ខ្ទឹមស្លឹកខ្ទឹម',
    nameEn: 'Grilled Green Mussels with Scallion Oil & Peanuts',
    cat: 'grilled',
    catKh: 'ម្ហូបអាំង / គ្រំអាំងខ្លាញ់ខ្ទឹម',
    catEn: 'Grilled / Scallion Mussels',
    mainIngKh: 'គ្រំសមុទ្រស្រស់បកសំបកម្ខាង (៥០០ ក្រាម)',
    mainIngEn: 'Half-shell fresh green mussels (500g)',
    subIngKh: 'ខ្លាញ់ស្លឹកខ្ទឹម ខ្ទឹមសបំពង និងសណ្តែកដីបុក',
    subIngEn: 'Sizzling scallion oil, crispy garlic, and crushed peanuts',
    herbKh: 'ទឹកត្រីកោះកុង និងក្រូចឆ្មារ',
    herbEn: 'Spicy Koh Kong seafood sauce and lime',
  },
  {
    nameKh: 'ស្លាបមាន់អាំងគ្រឿងរមៀត',
    nameEn: 'Turmeric & Lemongrass Grilled Chicken Wings',
    cat: 'grilled',
    catKh: 'ម្ហូបអាំង / ស្លាបមាន់អាំង',
    catEn: 'Grilled / Turmeric Wings',
    mainIngKh: 'ស្លាបមាន់ស្រស់ (៥០០ ក្រាម)',
    mainIngEn: 'Fresh whole chicken wings (500g)',
    subIngKh: 'គ្រឿងបុករមៀត ស្លឹកគ្រៃ និងខ្ទិះដូង',
    subIngEn: 'Fresh turmeric, lemongrass paste, and coconut cream marinade',
    herbKh: 'ស្លឹកក្រូចសើច និងជ្រក់ត្រសក់',
    herbEn: 'Kaffir lime leaves and cucumber pickle',
  },
  {
    nameKh: 'ត្រីងៀតអាំង',
    nameEn: 'Charcoal Grilled Sun-Dried Fish with Tamarind Dip',
    cat: 'grilled',
    catKh: 'ម្ហូបអាំង / ត្រីងៀតអាំង',
    catEn: 'Grilled / Sun-Dried Fish',
    mainIngKh: 'ត្រីរ៉ស់ងៀត ឬត្រីឆ្ដោរងៀត (៣៥០ ក្រាម)',
    mainIngEn: 'Sun-dried salted snakehead fish (350g)',
    subIngKh: 'ទឹកអម្ពិលទុំ ស្ករត្នោត និងម្ទេសហាន់',
    subIngEn: 'Sweet palm sugar tamarind dipping sauce with chili',
    herbKh: 'ត្រសក់ស្រស់ និងជីរគ្រប់មុខ',
    herbEn: 'Sliced fresh cucumbers and herbs',
  },
  {
    nameKh: 'សាច់ជ្រូកបីជាន់អាំងអំបិលម្ទេស',
    nameEn: 'Crispy Grilled Pork Belly with Chili Salt',
    cat: 'grilled',
    catKh: 'ម្ហូបអាំង / ជ្រូកបីជាន់អាំង',
    catEn: 'Grilled / Crispy Pork Belly',
    mainIngKh: 'សាច់ជ្រូកបីជាន់ស្រស់ (៥០០ ក្រាម)',
    mainIngEn: 'Fresh streaky pork belly (500g)',
    subIngKh: 'អំបិលម្ទេស ខ្ទឹមស និងម្រេចកំពត',
    subIngEn: 'Chili salt, garlic, and Kampot pepper rub',
    herbKh: 'សាឡាត់ ត្រសក់ និងជីរអង្កាម',
    herbEn: 'Lettuce wraps, cucumber, and fresh mint',
  },
  {
    nameKh: 'ទាអាំង',
    nameEn: 'Roasted Duck',
    cat: 'grilled',
    catKh: 'ម្ហូបអាំង / ទាអាំង',
    catEn: 'Grilled / Roasted Duck',
    mainIngKh: 'ទាស្រស់ ១ ចំហៀង ឬទាំងមូល (៨០០ ក្រាម)',
    mainIngEn: 'Whole or half fresh duck (800g)',
    subIngKh: 'ទឹកឃ្មុំ ទឹកស៊ីអ៊ីវខាប់ ខ្ទឹមស និងគ្រឿងទេសប្រាំមុខ',
    subIngEn: 'Honey, dark soy glaze, garlic, and five-spice marinade',
    herbKh: 'ជីរវ៉ាន់ស៊ុយ និងជ្រក់ខ្ញី',
    herbEn: 'Cilantro and pickled young ginger',
  },
  {
    nameKh: 'ពោតបារាំង និងត្រប់វែងអាំងទឹកប្រហុក',
    nameEn: 'Charcoal Grilled Okra & Eggplant with Savory Prahok Dip',
    cat: 'grilled',
    catKh: 'ម្ហូបអាំង / បន្លែអាំងទឹកប្រហុក',
    catEn: 'Grilled / Vegetables & Prahok',
    mainIngKh: 'ត្រប់វែង និងពោតបារាំងស្រស់ (៤០០ ក្រាម)',
    mainIngEn: 'Whole purple eggplants and fresh green okra (400g)',
    subIngKh: 'ទឹកប្រហុកចំហុយសាច់ជ្រូកចិញ្ច្រាំ និងខ្ទឹមក្រហម',
    subIngEn: 'Steamed minced pork prahok dip with shallots and lime',
    herbKh: 'ស្លឹកខ្ទឹមខ្លាញ់ និងម្ទេសស្រស់',
    herbEn: 'Scallion oil and fresh chilies',
  },

  // ================= STIR-FRY & BRAISED (16 dishes: food-131 .. food-146) =================
  {
    nameKh: 'ឆាក្តៅសាច់មាន់ម្រះព្រៅ',
    nameEn: 'Spicy Lemongrass & Holy Basil Stir-Fried Chicken (Cha Kdao)',
    cat: 'stirfry',
    catKh: 'ម្ហូបឆា / ឆាក្តៅខ្មែរ',
    catEn: 'Stir-Fry / Spicy Cha Kdao',
    mainIngKh: 'សាច់មាន់ស្រែកាប់ដុំតូចៗ (៤៥០ ក្រាម)',
    mainIngEn: 'Chopped free-range chicken pieces (450g)',
    subIngKh: 'គល់ស្លឹកគ្រៃហាន់ ម្ទេសខ្មាំង និងខ្ទឹមស',
    subIngEn: 'Sliced lemongrass, bird-eye chili, and garlic',
    herbKh: 'ស្លឹកម្រះព្រៅក្រហម និងស្លឹកក្រូចសើច',
    herbEn: 'Red holy basil leaves and kaffir lime leaves',
  },
  {
    nameKh: 'ឆាគ្រឿងសាច់គោសណ្តែកគួរ',
    nameEn: 'Yellow Kroeung Beef Stir-Fry with Yardlong Beans',
    cat: 'stirfry',
    catKh: 'ម្ហូបឆា / ឆាគ្រឿង',
    catEn: 'Stir-Fry / Beef Kroeung',
    mainIngKh: 'សាច់គោផុយហាន់ស្តើង (៤០០ ក្រាម)',
    mainIngEn: 'Thinly sliced tender beef (400g)',
    subIngKh: 'គ្រឿងបុកខ្មែរ សណ្តែកគួរ និងសណ្តែកដីបុក',
    subIngEn: 'Yellow kroeung paste, yardlong beans, and crushed peanuts',
    herbKh: 'ស្លឹកម្រះព្រៅ និងស្លឹកក្រូចសើច',
    herbEn: 'Holy basil and kaffir lime leaves',
  },
  {
    nameKh: 'ឆាខ្ញីសាច់ត្រី',
    nameEn: 'Fragrant Young Ginger Stir-Fried Fish (Cha Knhyey)',
    cat: 'stirfry',
    catKh: 'ម្ហូបឆា / ឆាខ្ញីសាច់ត្រី',
    catEn: 'Stir-Fry / Ginger Fish',
    mainIngKh: 'សាច់ត្រីស្រស់ហាន់បន្ទះល្មម (៤៥០ ក្រាម)',
    mainIngEn: 'Fresh fish fillets sliced into bite-sized pieces (450g)',
    subIngKh: 'ខ្ញីខ្ចីហាន់សរសៃ ផ្សិតត្រចៀកកណ្តុរ និងសៀងផ្អែម',
    subIngEn: 'Julienne young ginger, wood-ear mushrooms, and bean paste',
    herbKh: 'ស្លឹកខ្ទឹម និងម្ទេសដៃនាង',
    herbEn: 'Spring onions and sliced long red chili',
  },
  {
    nameKh: 'ឆាត្រកួនប្រេងខ្យងខ្ទឹមស',
    nameEn: 'Wok-Fired Morning Glory with Garlic & Oyster Sauce',
    cat: 'stirfry',
    catKh: 'ម្ហូបឆា / ឆាបន្លែ',
    catEn: 'Stir-Fry / Morning Glory',
    mainIngKh: 'ត្រកួនស្រួយស្រស់ (៤០០ ក្រាម)',
    mainIngEn: 'Crisp young water spinach (400g)',
    subIngKh: 'ខ្ទឹមសដំ សៀងសណ្តែក និងប្រេងខ្យង',
    subIngEn: 'Smashed garlic, fermented soybean paste, and oyster sauce',
    herbKh: 'ម្ទេសក្រហម និងខ្ទឹមសបំពង',
    herbEn: 'Red chili and crispy garlic bits',
  },
  {
    nameKh: 'ឆាផ្កាខាត់ណា សាច់គោ',
    nameEn: 'Broccoli & Cauliflower Stir-Fry with Beef',
    cat: 'stirfry',
    catKh: 'ម្ហូបឆា / ឆាផ្កាខាត់ណាសាច់គោ',
    catEn: 'Stir-Fry / Beef & Broccoli',
    mainIngKh: 'សាច់គោផុយហាន់ស្តើង (៣០០ ក្រាម)',
    mainIngEn: 'Thinly sliced tender beef (300g)',
    subIngKh: 'ផ្កាខាត់ណាបៃតង-ស និងការ៉ុតស្រស់',
    subIngEn: 'Green broccoli, cauliflower florets, and sliced carrots',
    herbKh: 'ខ្ទឹមស និងស្លឹកខ្ទឹម',
    herbEn: 'Garlic and green scallions',
  },
  {
    nameKh: 'ឆាមឹកម្រេចខ្ចីកំពត',
    nameEn: 'Wok-Fried Ocean Squid with Fresh Green Kampot Peppercorns',
    cat: 'stirfry',
    catKh: 'ម្ហូបឆា / ម្រេចខ្ចីកំពត',
    catEn: 'Stir-Fry / Kampot Pepper Squid',
    mainIngKh: 'មឹកសមុទ្រស្រស់ឆូតផ្កា (៤៥០ ក្រាម)',
    mainIngEn: 'Scored fresh ocean squid (450g)',
    subIngKh: 'ចង្កោមម្រេចខ្ចីកំពត ខ្ទឹមបារាំង និងប្រេងខ្យង',
    subIngEn: 'Fresh green Kampot peppercorn clusters, onion, and oyster sauce',
    herbKh: 'ស្លឹកខ្ទឹម និងម្ទេសផ្លោក',
    herbEn: 'Scallions and bell peppers',
  },
  {
    nameKh: 'ឆាកង្កែបម្រះព្រៅម្ទេសហឹរ',
    nameEn: 'Spicy Holy Basil & Chili Stir-Fried Field Frog',
    cat: 'stirfry',
    catKh: 'ម្ហូបឆា / ឆាកង្កែប',
    catEn: 'Stir-Fry / Holy Basil Frog',
    mainIngKh: 'សាច់កង្កែបស្រែសុទ្ធ (៤៥០ ក្រាម)',
    mainIngEn: 'Cleaned field frog legs (450g)',
    subIngKh: 'ខ្ទឹមស ម្ទេសបុក និងទឹកត្រីស្ករត្នោត',
    subIngEn: 'Crushed garlic, chili paste, fish sauce, and palm sugar',
    herbKh: 'ស្លឹកម្រះព្រៅ និងស្លឹកក្រូចសើច',
    herbEn: 'Fresh holy basil and kaffir lime leaves',
  },
  {
    nameKh: 'ឆាត្រប់វែងសាច់ជ្រូកចិញ្ច្រាំសៀង',
    nameEn: 'Wok-Braised Purple Eggplant with Minced Pork & Soybean Paste',
    cat: 'stirfry',
    catKh: 'ម្ហូបឆា / ឆាត្រប់វែង',
    catEn: 'Stir-Fry / Eggplant & Pork',
    mainIngKh: 'ត្រប់វែងចិតបញ្ឆិត និងសាច់ជ្រូកចិញ្ច្រាំ (៤០០ ក្រាម)',
    mainIngEn: 'Purple eggplants and minced pork (400g)',
    subIngKh: 'សៀងប្រៃផ្អែម និងខ្ទឹមសចិញ្ច្រាំ',
    subIngEn: 'Savory fermented bean paste and minced garlic',
    herbKh: 'ជីរនាងវង និងស្លឹកខ្ទឹម',
    herbEn: 'Sweet basil and chopped spring onions',
  },
  {
    nameKh: 'ឆាបន្លែគ្រប់មុខ',
    nameEn: 'Cambodian Mixed Vegetable Stir-Fry',
    cat: 'stirfry',
    catKh: 'ម្ហូបឆា / ឆាបន្លែគ្រប់មុខ',
    catEn: 'Stir-Fry / Mixed Vegetables',
    mainIngKh: 'ពោតទេស ផ្កាខាត់ណា និងការ៉ុតស្រស់ (៣៥០ ក្រាម)',
    mainIngEn: 'Baby corn, broccoli, and fresh carrots (350g)',
    subIngKh: 'ផ្សិតចំបើង សណ្តែកហោឡាំងតៅ និងប្រេងខ្យង',
    subIngEn: 'Straw mushrooms, snow peas, and oyster sauce',
    herbKh: 'ខ្ទឹមសចិញ្ច្រាំ និងម្រេចកំពត',
    herbEn: 'Minced garlic and ground white Kampot pepper',
  },
  {
    nameKh: 'ខជើងជ្រូកពងទាស្ករត្នោត',
    nameEn: 'Palm Sugar Caramelized Pork Trotters & Duck Eggs (Khor)',
    cat: 'stirfry',
    catKh: 'ម្ហូបខ / ខជើងជ្រូក',
    catEn: 'Braised / Pork Trotters Khor',
    mainIngKh: 'ជើងជ្រូកកាប់ដុំ និងពងទាស្ងោរ ៤ គ្រាប់ (៦០០ ក្រាម)',
    mainIngEn: 'Pork trotters and 4 hard-boiled duck eggs (600g)',
    subIngKh: 'ស្ករត្នោតកូរឡើងពណ៌ក្រហម ទឹកត្រី និងទឹកដូងស្រស់',
    subIngEn: 'Caramelized palm sugar, fish sauce, and fresh coconut water',
    herbKh: 'ផ្កាចាន់ ប៉ូចកាក់ ខ្ទឹមស និងម្រេច',
    herbEn: 'Star anise, garlic cloves, and black pepper',
  },
  {
    nameKh: 'ឆាណាំយ៉ាវផ្សិតភ្លៅមាន់',
    nameEn: 'Fermented Red Tofu & King Oyster Mushroom Stir-Fry',
    cat: 'stirfry',
    catKh: 'ម្ហូបឆា / ឆាណាំយ៉ាវផ្សិត',
    catEn: 'Stir-Fry / Fermented Tofu Mushroom',
    mainIngKh: 'ផ្សិតភ្លៅមាន់ស្រស់ហាន់បន្ទះ (៤០០ ក្រាម)',
    mainIngEn: 'Sliced fresh king oyster mushrooms (400g)',
    subIngKh: 'តៅហ៊ូក្រហម (ណាំយ៉ាវ) ខ្ទឹមស និងប្រេងល្ង',
    subIngEn: 'Fermented red bean curd sauce, garlic, and sesame oil',
    herbKh: 'ស្ពៃតឿ និងស្លឹកខ្ទឹម',
    herbEn: 'Bok choy greens and scallions',
  },
  {
    nameKh: 'ឆាជូរផ្អែមត្រីរ៉ស់បំពង',
    nameEn: 'Sweet & Sour Crispy Snakehead Fish Stir-Fry',
    cat: 'stirfry',
    catKh: 'ម្ហូបឆា / ឆាជូរផ្អែម',
    catEn: 'Stir-Fry / Sweet & Sour Fish',
    mainIngKh: 'សាច់ត្រីរ៉ស់បំពងស្រួយ (៤០០ ក្រាម)',
    mainIngEn: 'Crispy fried snakehead fish fillets (400g)',
    subIngKh: 'ម្នាស់ ប៉េងប៉ោះ ត្រសក់ និងម្ទេសផ្លោក',
    subIngEn: 'Pineapple, tomatoes, cucumber, and bell peppers',
    herbKh: 'ស្លឹកខ្ទឹម និងជីរវ៉ាន់ស៊ុយ',
    herbEn: 'Spring onions and fresh coriander',
  },
  {
    nameKh: 'ឆាគ្រឿងអន្ទង់ស្លឹកម្រះព្រៅ',
    nameEn: 'Spicy Kroeung Freshwater Eel Stir-Fry with Holy Basil',
    cat: 'stirfry',
    catKh: 'ម្ហូបឆា / ឆាគ្រឿងអន្ទង់',
    catEn: 'Stir-Fry / Spicy Eel Kroeung',
    mainIngKh: 'អន្ទង់ស្រែលាងសម្អាតហាន់កង់ (៤៥០ ក្រាម)',
    mainIngEn: 'Cleaned freshwater eel pieces (450g)',
    subIngKh: 'គ្រឿងបុករមៀត រំដេង និងសណ្តែកដីបុក',
    subIngEn: 'Galangal-turmeric kroeung paste and crushed peanuts',
    herbKh: 'ស្លឹកម្រះព្រៅ និងស្លឹកក្រូចសើច',
    herbEn: 'Holy basil and kaffir lime leaves',
  },
  {
    nameKh: 'ឆាពោតបារាំងបង្គាខ្ទឹមស',
    nameEn: 'Garlic River Prawns & Crisp Okra Wok Stir-Fry',
    cat: 'stirfry',
    catKh: 'ម្ហូបឆា / ឆាពោតបារាំងបង្គា',
    catEn: 'Stir-Fry / Garlic Prawns & Okra',
    mainIngKh: 'បង្គាស្រស់ និងពោតបារាំងខ្ចី (៤០០ ក្រាម)',
    mainIngEn: 'Fresh prawns and young green okra (400g)',
    subIngKh: 'ខ្ទឹមសចិញ្ច្រាំ ប្រេងខ្យង និងទឹកត្រី',
    subIngEn: 'Minced garlic, oyster sauce, and fish sauce',
    herbKh: 'ស្លឹកខ្ទឹម និងម្ទេសក្រហម',
    herbEn: 'Scallions and sliced red chili',
  },
  {
    nameKh: 'ឆាផ្សិតអម្បោះសាច់មាន់',
    nameEn: 'Oyster Mushroom & Chicken Breast Stir-Fry',
    cat: 'stirfry',
    catKh: 'ម្ហូបឆា / ឆាផ្សិតសាច់មាន់',
    catEn: 'Stir-Fry / Mushroom Chicken',
    mainIngKh: 'ផ្សិតអម្បោះស្រស់ និងសាច់ទ្រូងមាន់ (៤០០ ក្រាម)',
    mainIngEn: 'Fresh oyster mushrooms and sliced chicken breast (400g)',
    subIngKh: 'ខ្ទឹមស ប្រេងខ្យង និងទឹកស៊ីអ៊ីវ',
    subIngEn: 'Garlic, oyster sauce, and light soy sauce',
    herbKh: 'ស្លឹកខ្ទឹម និងជីរវ៉ាន់ស៊ុយ',
    herbEn: 'Green onions and cilantro',
  },
  {
    nameKh: 'ខ ប្រហុកត្រីពោធិ៍',
    nameEn: 'Braised Mekong Fish with Savory Prahok',
    cat: 'stirfry',
    catKh: 'ម្ហូបខ / ខប្រហុកត្រីពោធិ៍',
    catEn: 'Braised / Prahok Mekong Fish',
    mainIngKh: 'ត្រីពោធិ៍ស្រស់កាត់កង់ និងសាច់ជ្រូកបីជាន់ចិញ្ច្រាំ (៥០០ ក្រាម)',
    mainIngEn: 'Fresh Mekong river fish steaks and minced pork belly (500g)',
    subIngKh: 'ប្រហុកសាច់ចិញ្ច្រាំ ខ្ទិះដូង ឬទឹកដូងស្រស់ ស្ករត្នោត និងគល់ស្លឹកគ្រៃ',
    subIngEn: 'Minced prahok paste, coconut milk or coconut water, palm sugar, and lemongrass',
    herbKh: 'ស្លឹកខ្ទឹម ម្ទេសទុំ និងបន្លែអន្លក់ស្រស់',
    herbEn: 'Scallions, ripe chilies, and fresh seasonal crudités',
  },

  // ================= SALADS & DIPS (10 dishes: food-147 .. food-156) =================
  {
    nameKh: 'ភ្លាសាច់គោត្រយូងចេក',
    nameEn: 'Cambodian Lime-Cured Beef Salad with Banana Blossom (Pleah Sach Ko)',
    cat: 'salad',
    catKh: 'ម្ហូបញាំ & ភ្លា / ភ្លាសាច់គោ',
    catEn: 'Salad / Lime-Cured Beef Pleah',
    mainIngKh: 'សាច់គោផុយហាន់ស្តើង (៣៥០ ក្រាម)',
    mainIngEn: 'Paper-thin tender beef tenderloin (350g)',
    subIngKh: 'ត្រយូងចេកហាន់ស្តើង ទឹកក្រូចឆ្មារ និងទឹកប្រហុកឆ្អិន',
    subIngEn: 'Shredded banana blossom, fresh lime juice, and seasoned prahok dressing',
    herbKh: 'គល់ស្លឹកគ្រៃហាន់ ជីរអង្កាម ជីររណារ និងសណ្តែកដីលីង',
    herbEn: 'Thinly sliced lemongrass, mint, culantro, and roasted peanuts',
  },
  {
    nameKh: 'ញាំត្រយូងចេកសាច់មាន់ហែកលាយស្បែកជ្រូក',
    nameEn: 'Shredded Chicken, Crispy Pork Skin & Banana Blossom Salad',
    cat: 'salad',
    catKh: 'ម្ហូបញាំ & ភ្លា / ញាំត្រយូងចេក',
    catEn: 'Salad / Chicken, Pork Skin & Banana Blossom Salad',
    mainIngKh: 'សាច់មាន់ស្រែស្ងោរហែក និងស្បែកជ្រូកស្ងោរហាន់ស្តើង (៣៥០ ក្រាម)',
    mainIngEn: 'Poached shredded free-range chicken and thinly sliced boiled pork skin (350g)',
    subIngKh: 'ត្រយូងចេក ការ៉ុត និងទឹកត្រីជូរផ្អែម',
    subIngEn: 'Shredded banana flower, carrots, and sweet-sour lime dressing',
    herbKh: 'ជីរគ្រប់មុខ ខ្ទឹមក្រហមបំពង និងសណ្តែកដីបុក',
    herbEn: 'Mixed Cambodian herbs, crispy shallots, and crushed peanuts',
  },
  {
    nameKh: 'ញាំមីសួរគ្រឿងសមុទ្របង្គាមឹក',
    nameEn: 'Glass Noodle Seafood Salad with Prawns & Squid',
    cat: 'salad',
    catKh: 'ម្ហូបញាំ & ភ្លា / ញាំមីសួរ',
    catEn: 'Salad / Seafood Glass Noodle',
    mainIngKh: 'មីសួរស្រុស បង្គា និងមឹកស្រស់ (៤០០ ក្រាម)',
    mainIngEn: 'Glass noodles, fresh prawns, and squid rings (400g)',
    subIngKh: 'សាច់ជ្រូកចិញ្ច្រាំ ប៉េងប៉ោះ និងទឹកត្រីក្រូចឆ្មារម្ទេស',
    subIngEn: 'Minced pork, cherry tomatoes, and spicy lime dressing',
    herbKh: 'ជីរវ៉ាន់ស៊ុយ ឃិនឆាយ និងសណ្តែកដីលីង',
    herbEn: 'Cilantro, Chinese celery, and roasted peanuts',
  },
  {
    nameKh: 'ញាំមីសួសាច់ជ្រូកបីជាន់',
    nameEn: 'Cambodian Glass Noodle & Pork Belly Herb Salad',
    cat: 'salad',
    catKh: 'ម្ហូបញាំ & ភ្លា / ញាំមីសួរ',
    catEn: 'Salad / Pork Belly Glass Noodle',
    mainIngKh: 'មីសួរស្រុសទន់ សាច់ជ្រូកបីជាន់ស្ងោរហាន់ស្តើង និងសាច់ជ្រូកចិញ្ច្រាំ (៤០០ ក្រាម)',
    mainIngEn: 'Softened glass noodles, sliced boiled pork belly, and minced pork (400g)',
    subIngKh: 'ផ្សិតត្រចៀកកណ្តុរ បង្គាក្រៀម ការ៉ុត និងទឹកត្រីក្រូចឆ្មារស្ករត្នោត',
    subIngEn: 'Wood-ear mushrooms, dried shrimp, julienned carrots, and palm sugar lime dressing',
    herbKh: 'ជីរអង្កាម ជីរវ៉ាន់ស៊ុយ សណ្តែកដីលីង ខ្ទឹមក្រហមបំពង និងម្ទេសហាន់',
    herbEn: 'Fresh mint, cilantro, roasted peanuts, crispy shallots, and sliced red chili',
  },
  {
    nameKh: 'ភ្លាបង្គាស្រស់ម្រះខ្ចី',
    nameEn: 'Fresh River Prawn Ceviche with Crisp Bitter Melon',
    cat: 'salad',
    catKh: 'ម្ហូបញាំ & ភ្លា / ភ្លាបង្គាស្រស់',
    catEn: 'Salad / Fresh Prawn Pleah',
    mainIngKh: 'បង្គាស្រស់បកសំបកលាងទឹកក្រូចឆ្មារ (៣៥០ ក្រាម)',
    mainIngEn: 'Fresh river prawns cured in lime juice (350g)',
    subIngKh: 'ម្រះខ្ចីហាន់ស្តើងត្រាំទឹកកកឱ្យស្រួយ',
    subIngEn: 'Ice-chilled paper-thin bitter melon slices',
    herbKh: 'ខ្ទឹមស ម្ទេសខ្មាំង គល់ស្លឹកគ្រៃ និងជីរអង្កាម',
    herbEn: 'Garlic slices, bird-eye chili, lemongrass, and mint',
  },
  {
    nameKh: 'ញាំស្តៅត្រីឆ្អើរសាច់ជ្រូកបីជាន់',
    nameEn: 'Cambodian Neem Flower, Smoked Fish & Pork Belly Salad',
    cat: 'salad',
    catKh: 'ម្ហូបញាំ & ភ្លា / ញាំស្តៅ',
    catEn: 'Salad / Neem Flower & Smoked Fish',
    mainIngKh: 'ផ្កាស្តៅស្រុស ត្រីឆ្អើរ និងសាច់ជ្រូកបីជាន់ស្ងោរ (៣៥០ ក្រាម)',
    mainIngEn: 'Blanched neem blossoms, flaked smoked fish, and boiled pork belly (350g)',
    subIngKh: 'ទឹកត្រីអម្ពិលទុំស្ករត្នោត និងត្រសក់ហាន់',
    subIngEn: 'Rich tamarind palm sugar dressing and sliced cucumber',
    herbKh: 'ខ្ទឹមក្រហម ម្ទេស និងសណ្តែកដីលីង',
    herbEn: 'Shallots, chili, and roasted peanuts',
  },
  {
    nameKh: 'ញាំស្លឹកគ្រៃបង្គាសាច់ជ្រូកចិញ្ច្រាំ',
    nameEn: 'Fragrant Lemongrass, Prawn & Minced Pork Salad',
    cat: 'salad',
    catKh: 'ម្ហូបញាំ & ភ្លា / ញាំស្លឹកគ្រៃ',
    catEn: 'Salad / Lemongrass Prawn',
    mainIngKh: 'គល់ស្លឹកគ្រៃខ្ចីហាន់ស្តើង បង្គា និងសាច់ជ្រូកចិញ្ច្រាំ (៣៥០ ក្រាម)',
    mainIngEn: 'Finely sliced tender lemongrass, prawns, and minced pork (350g)',
    subIngKh: 'ទឹកក្រូចឆ្មារ ទឹកត្រី និងស្ករត្នោត',
    subIngEn: 'Fresh lime juice, fish sauce, and palm sugar',
    herbKh: 'ស្លឹកក្រូចសើច ជីរអង្កាម និងគ្រាប់ស្វាយចន្ទីលីង',
    herbEn: 'Kaffir lime leaves, mint, and roasted cashews',
  },
  {
    nameKh: 'ទឹកគ្រឿងខ្មែរពិសេសបន្លែស្រស់',
    nameEn: 'Traditional Khmer Fish Herb Dip with Fresh Garden Vegetables (Teuk Kroeung)',
    cat: 'salad',
    catKh: 'ទឹកជ្រលក់ & បន្លែ / ទឹកគ្រឿង',
    catEn: 'Dip & Salad / Teuk Kroeung',
    mainIngKh: 'សាច់ត្រីរ៉ស់ស្ងោរបុកម៉ត់ និងទឹកប្រហុកឆ្អិន (៣៥០ ក្រាម)',
    mainIngEn: 'Pounded poached snakehead fish and simmered prahok broth (350g)',
    subIngKh: 'ទឹកក្រូចឆ្មារ ខ្ទឹមស ម្ទេស និងសណ្តែកដីបុក',
    subIngEn: 'Fresh lime juice, garlic, chilies, and crushed roasted peanuts',
    herbKh: 'ត្រសក់ ត្រប់ស្រួយ ស្ពៃក្តោប ព្រលិត និងកញ្ឆែតស្រស់',
    herbEn: 'Cucumber, Thai eggplant, cabbage, water lily stems, and water mimosa',
  },
  {
    nameKh: 'ប្រហុកខ្ទិះសាច់ជ្រូកចិញ្ច្រាំបន្លែស្រស់',
    nameEn: 'Creamy Coconut & Minced Pork Prahok Dip with Fresh Crudités',
    cat: 'salad',
    catKh: 'ទឹកជ្រលក់ & បន្លែ / ប្រហុកខ្ទិះ',
    catEn: 'Dip & Salad / Prahok Ktis',
    mainIngKh: 'សាច់ជ្រូកបីជាន់ចិញ្ច្រាំ និងប្រហុកសាច់ (៣០០ ក្រាម)',
    mainIngEn: 'Minced pork belly and fine prahok paste (300g)',
    subIngKh: 'ខ្ទិះដូងដើមខាប់ គ្រឿងបុក និងត្រប់ពុតលំញង',
    subIngEn: 'Thick coconut cream, yellow kroeung, and pea eggplants',
    herbKh: 'ស្លឹកក្រូចសើច និងបន្លែស្រស់គ្រប់មុខ',
    herbEn: 'Kaffir lime leaves and assorted raw garden vegetables',
  },
  {
    nameKh: 'បុកល្ហុងក្តាមប្រៃបង្គាក្រៀម',
    nameEn: 'Cambodian Green Papaya Salad with Salted Field Crab & Dried Shrimp',
    cat: 'salad',
    catKh: 'ម្ហូបញាំ & បុក / បុកល្ហុងខ្មែរ',
    catEn: 'Salad / Green Papaya Bok Lahong',
    mainIngKh: 'ល្ហុងខ្ចីឈូសសរសៃ ក្តាមប្រៃ និងបង្គាក្រៀម (៤០០ ក្រាម)',
    mainIngEn: 'Shredded green papaya, salted crab, and dried shrimp (400g)',
    subIngKh: 'សណ្តែកគួរ ប៉េងប៉ោះ ក្រូចឆ្មារ និងស្ករត្នោត',
    subIngEn: 'Yardlong beans, tomatoes, lime, and palm sugar',
    herbKh: 'ខ្ទឹមស ម្ទេសខ្មាំង ជីររណារ និងសណ្តែកដីលីង',
    herbEn: 'Garlic, chili, culantro, and roasted peanuts',
  },

  // ================= NOODLES (10 dishes: food-157 .. food-166) =================
  {
    nameKh: 'នំបញ្ចុកសម្លណាំយ៉ាជើងមាន់',
    nameEn: 'Khmer Rice Noodles with Red Nam Ya Coconut Chicken Curry',
    cat: 'noodles',
    catKh: 'គុយទាវ & នំបញ្ចុក / សម្លណាំយ៉ា',
    catEn: 'Noodles / Nam Ya Curry Noodles',
    mainIngKh: 'នំបញ្ចុកស្រស់ និងសាច់មាន់-ជើងមាន់ (៥០០ ក្រាម)',
    mainIngEn: 'Fresh rice vermicelli with chicken & tender chicken feet (500g)',
    subIngKh: 'ខ្ទិះដូងដើម និងគ្រឿងការីក្រហមណាំយ៉ា',
    subIngEn: 'Rich coconut milk and red Nam Ya spice paste',
    herbKh: 'សណ្តែកបណ្តុះ ត្រយូងចេក សណ្តែកគួរ និងជីរនាងវង',
    herbEn: 'Bean sprouts, banana blossom, long beans, and sweet basil',
  },
  {
    nameKh: 'គុយទាវទូកភ្នំពេញ ប្រហិតសាច់គោ',
    nameEn: 'Phnom Penh Boat Noodle Soup with Sliced Beef & Meatballs',
    cat: 'noodles',
    catKh: 'គុយទាវ & នំបញ្ចុក / គុយទាវទូក',
    catEn: 'Noodles / Boat Noodle Soup',
    mainIngKh: 'សរសៃគុយទាវ សាច់គោស្រស់ និងប្រហិតសាច់គោ (៤៥០ ក្រាម)',
    mainIngEn: 'Rice noodles, sliced beef, and beef meatballs (450g)',
    subIngKh: 'ទឹកស៊ុបឆ្អឹងគោរំងាស់គ្រឿងទេសខាប់ឈ្ងុយ',
    subIngEn: 'Aromatic dark spiced beef bone broth',
    herbKh: 'ត្រកួន សណ្តែកបណ្តុះ ជីររណារ និងខ្ទឹមសបំពង',
    herbEn: 'Morning glory, bean sprouts, culantro, and fried garlic',
  },
  {
    nameKh: 'មីឆាគ្រឿងសមុទ្របែបខ្មែរ',
    nameEn: 'Cambodian Wok-Fried Egg Noodles with Fresh Seafood',
    cat: 'noodles',
    catKh: 'គុយទាវ & នំបញ្ចុក / មីឆាគ្រឿងសមុទ្រ',
    catEn: 'Noodles / Seafood Fried Noodles',
    mainIngKh: 'មីលឿង បង្គា និងមឹកស្រស់ (៤៥០ ក្រាម)',
    mainIngEn: 'Yellow egg noodles, prawns, and squid (450g)',
    subIngKh: 'ស្ពៃតឿ ការ៉ុត និងទឹកប្រេងខ្យង',
    subIngEn: 'Bok choy, carrots, and savory oyster sauce glaze',
    herbKh: 'ស្លឹកខ្ទឹម ខ្ទឹមសបំពង និងក្រូចឆ្មារ',
    herbEn: 'Scallions, crispy garlic, and fresh lime',
  },
  {
    nameKh: 'លតឆាសាច់គោពងទាចៀន',
    nameEn: 'Phnom Penh Stir-Fried Short Pin Noodles with Beef & Fried Egg (Lort Cha)',
    cat: 'noodles',
    catKh: 'គុយទាវ & នំបញ្ចុក / លតឆាសាច់គោ',
    catEn: 'Noodles / Beef Lort Cha',
    mainIngKh: 'នំលតស្រស់ សាច់គោហាន់ស្តើង និងពងទាចៀន ១ គ្រាប់ (៤៥០ ក្រាម)',
    mainIngEn: 'Short rice pin noodles, tender sliced beef, and sunny-side-up duck egg (450g)',
    subIngKh: 'សណ្តែកបណ្តុះ ស្លឹកគូឆាយ និងទឹកត្រីផ្អែមម្ទេស',
    subIngEn: 'Bean sprouts, garlic chives, and sweet chili fish sauce',
    herbKh: 'ខ្ទឹមសបំពង និងម្រេចកំពត',
    herbEn: 'Crispy garlic and ground Kampot pepper',
  },
  {
    nameKh: 'មីគោកសាច់ជ្រូកសាស៊ីវគាវបំពង',
    nameEn: 'Dry Egg Noodles with Char Siu Pork & Crispy Wontons',
    cat: 'noodles',
    catKh: 'គុយទាវ & នំបញ្ចុក / មីគោកគាវ',
    catEn: 'Noodles / Dry Wonton Noodles',
    mainIngKh: 'មីពងទា សាច់ជ្រូកសាស៊ីវ និងគាវបំពងស្រួយ (៤៥០ ក្រាម)',
    mainIngEn: 'Egg noodles, roasted char siu pork, and crispy fried wontons (450g)',
    subIngKh: 'ទឹកស៊ុបឆ្អឹងជ្រូកដាក់ចានផ្សេង និងទឹកស៊ីអ៊ីវប្រេងល្ង',
    subIngEn: 'Side pork broth and sesame soy dressing',
    herbKh: 'ស្លឹកគូឆាយ សណ្តែកបណ្តុះ និងខ្ទឹមសបំពង',
    herbEn: 'Chives, bean sprouts, and golden fried garlic',
  },
  {
    nameKh: 'គុយទាវគ្រឿងសមុទ្រកែប',
    nameEn: 'Kep Coastal Fresh Seafood Rice Noodle Soup',
    cat: 'noodles',
    catKh: 'គុយទាវ & នំបញ្ចុក / គុយទាវគ្រឿងសមុទ្រ',
    catEn: 'Noodles / Kep Seafood Kuy Teav',
    mainIngKh: 'សរសៃគុយទាវ បង្គា មឹក និងសាច់ក្តាមសេះ (៥០០ ក្រាម)',
    mainIngEn: 'Rice noodles, fresh prawns, squid, and blue crab meat (500g)',
    subIngKh: 'ទឹកស៊ុបរំងាស់ឆ្អឹងជ្រូក និងមឹកក្រៀមផ្អែមឆ្ងាញ់',
    subIngEn: 'Clear sweet broth simmered with pork bone and dried squid',
    herbKh: 'ស្លឹកខ្ទឹម ជីរវ៉ាន់ស៊ុយ និងខ្ទឹមសបំពង',
    herbEn: 'Scallions, cilantro, and crispy garlic oil',
  },
  {
    nameKh: 'នំបញ្ចុកទឹកត្រីផ្អែម',
    nameEn: 'Khmer Rice Vermicelli with Sweet Garlic Fish Sauce & Grilled Catfish',
    cat: 'noodles',
    catKh: 'គុយទាវ & នំបញ្ចុក / នំបញ្ចុកទឹកត្រីផ្អែម',
    catEn: 'Noodles / Sweet Fish Sauce Vermicelli',
    mainIngKh: 'នំបញ្ចុកស្រស់ និងសាច់ត្រីអណ្តែងអាំង ឬសាច់ជ្រូកខ្វៃ (៤៥០ ក្រាម)',
    mainIngEn: 'Fresh rice vermicelli and flaked charcoal-grilled catfish or roasted pork (450g)',
    subIngKh: 'ទឹកត្រីផ្អែមខ្ទឹមសម្ទេសក្រូចឆ្មារ និងសណ្តែកដីបុក',
    subIngEn: 'Sweet-tangy garlic chili fish sauce and crushed roasted peanuts',
    herbKh: 'សាឡាត់ ត្រសក់ សណ្តែកបណ្តុះ ជីរអង្កាម និងជីរនាងវង',
    herbEn: 'Crisp lettuce, cucumber, bean sprouts, mint, and sweet basil',
  },
  {
    nameKh: 'មីសួរឆាក្តាមសេះកំពត',
    nameEn: 'Wok-Baked Glass Noodles with Kampot Blue Swimmer Crab',
    cat: 'noodles',
    catKh: 'គុយទាវ & នំបញ្ចុក / មីសួរឆាក្តាម',
    catEn: 'Noodles / Crab Glass Noodles',
    mainIngKh: 'មីសួរ និងក្តាមសេះស្រស់ ២ ក្បាល (៥០០ ក្រាម)',
    mainIngEn: 'Glass vermicelli and 2 fresh blue swimmer crabs (500g)',
    subIngKh: 'ខ្ញី ខ្ទឹមស ប្រេងល្ង និងម្រេចកំពត',
    subIngEn: 'Ginger slices, garlic, sesame oil, and Kampot peppercorns',
    herbKh: 'ដើមឃិនឆាយ និងស្លឹកខ្ទឹម',
    herbEn: 'Chinese celery and spring onions',
  },
  {
    nameKh: 'ខគោ នំប៉័ង',
    nameEn: 'Cambodian Spiced Beef Stew with Crispy Baguette (Khor Ko)',
    cat: 'noodles',
    catKh: 'អាហារពេលព្រឹក / ខគោនំប៉័ង',
    catEn: 'Breakfast Stew / Beef Khor Ko & Baguette',
    mainIngKh: 'សាច់គោជាប់សរសៃរម្ងាស់ផុយ និងនំប៉័ងអាំងស្រួយ (៥០០ ក្រាម)',
    mainIngEn: 'Tender braised beef brisket & tendon with crispy toasted baguette (500g)',
    subIngKh: 'ការ៉ុត ខ្ទឹមបារាំង គ្រឿងខគោ គល់ស្លឹកគ្រៃ និងផ្កាចាន់',
    subIngEn: 'Carrots, onions, Khmer Khor Ko spice paste, lemongrass, and star anise',
    herbKh: 'ជីរនាងវង ជីររណារ ខ្ទឹមសបំពង និងក្រូចឆ្មារ',
    herbEn: 'Sweet basil, culantro, crispy fried garlic, and lime wedges',
  },
  {
    nameKh: 'បាញ់កាញ់ទឹកខ្ទិះត្រីរ៉ស់',
    nameEn: 'Thick Tapioca Rice Noodles in Rich Fish Coconut Gravy (Banh Kanh)',
    cat: 'noodles',
    catKh: 'គុយទាវ & នំបញ្ចុក / បាញ់កាញ់ខ្ទិះ',
    catEn: 'Noodles / Coconut Banh Kanh',
    mainIngKh: 'សរសៃបាញ់កាញ់ និងសាច់ត្រីរ៉ស់ (៤៥០ ក្រាម)',
    mainIngEn: 'Thick tapioca rice noodles and snakehead fish (450g)',
    subIngKh: 'ខ្ទិះដូងដើម និងគ្រឿងបុករមៀត',
    subIngEn: 'Rich coconut cream and yellow turmeric kroeung',
    herbKh: 'សណ្តែកបណ្តុះ ត្រសក់ និងជីរគ្រប់មុខ',
    herbEn: 'Bean sprouts, shredded cucumber, and fresh herbs',
  },

  // ================= RICE & PORRIDGE (10 dishes: food-167 .. food-176) =================
  {
    nameKh: 'បាយឆាក្តាមសេះពងទាប្រៃ',
    nameEn: 'Blue Swimmer Crab Fried Rice with Golden Salted Duck Egg',
    cat: 'rice',
    catKh: 'បាយ & បបរ / បាយឆាក្តាម',
    catEn: 'Rice / Crab Fried Rice',
    mainIngKh: 'បាយផ្កាម្លិះ សាច់ក្តាមសេះសុទ្ធ និងពងទាប្រៃ (៤៥០ ក្រាម)',
    mainIngEn: 'Jasmine rice, lump blue crab meat, and salted egg yolk (450g)',
    subIngKh: 'ខ្ទឹមស ប្រេងខ្យង និងទឹកត្រីកោះកុង',
    subIngEn: 'Garlic, oyster sauce, and Koh Kong chili lime sauce',
    herbKh: 'ស្លឹកខ្ទឹម ជីរវ៉ាន់ស៊ុយ និងត្រសក់ស្រស់',
    herbEn: 'Scallions, cilantro, and sliced cucumber',
  },
  {
    nameKh: 'បាយសាច់ជ្រូកចៀនពងទាចៀនជ្រក់ត្រសក់',
    nameEn: 'Cambodian Fried Pork Rice with Crispy Fried Duck Egg & Pickles',
    cat: 'rice',
    catKh: 'បាយ & បបរ / បាយសាច់ជ្រូកចៀនពងទាចៀន',
    catEn: 'Rice / Fried Pork & Fried Egg Rice',
    mainIngKh: 'បាយក្តៅៗ សាច់ជ្រូកចៀនប្រឡាក់គ្រឿង និងពងទាចៀន (៤៥០ ក្រាម)',
    mainIngEn: 'Steamed jasmine rice, marinated pan-fried pork, and crispy fried duck egg (450g)',
    subIngKh: 'ជ្រក់ត្រសក់ ការ៉ុត ឆៃថាវ និងទឹកស៊ុបក្តៅៗ',
    subIngEn: 'Pickled cucumber, radish, carrots, and clear soup on the side',
    herbKh: 'ស្លឹកខ្ទឹមខ្លាញ់ និងខ្ទឹមសបំពង',
    herbEn: 'Scallion oil and crispy fried garlic',
  },
  {
    nameKh: 'បបរគ្រឿងមាន់ស្រែឈាមជ្រូក',
    nameEn: 'Cambodian Herbed Chicken & Pork Blood Rice Porridge (Borbor Kroeung)',
    cat: 'rice',
    catKh: 'បាយ & បបរ / បបរគ្រឿងមាន់',
    catEn: 'Porridge / Chicken Congee',
    mainIngKh: 'អង្ករផ្កាម្លិះ សាច់មាន់ស្រែហែក និងឈាមជ្រូក (៤៥០ ក្រាម)',
    mainIngEn: 'Jasmine rice porridge, shredded country chicken, and pork blood cubes (450g)',
    subIngKh: 'ឆៃប៉ូវប្រៃ សណ្តែកបណ្តុះ និងខ្ទឹមសបំពង',
    subIngEn: 'Preserved radish, bean sprouts, and golden fried garlic',
    herbKh: 'ជីរវ៉ាន់ស៊ុយ ស្លឹកខ្ទឹម ខ្ញីហាន់ និងម្រេចកំពត',
    herbEn: 'Cilantro, scallions, julienne ginger, and Kampot pepper',
  },
  {
    nameKh: 'បបរត្រីរ៉ស់ទន្លេសាបខ្ញីស្រស់',
    nameEn: 'Tonle Sap Snakehead Fish Rice Congee with Fresh Ginger',
    cat: 'rice',
    catKh: 'បាយ & បបរ / បបរត្រីរ៉ស់',
    catEn: 'Porridge / Snakehead Fish Congee',
    mainIngKh: 'បបរអង្ករផ្កាម្លិះ និងសាច់ត្រីរ៉ស់ស្រស់ (៤៥០ ក្រាម)',
    mainIngEn: 'Silky rice porridge and fresh snakehead fish fillets (450g)',
    subIngKh: 'ខ្ញីខ្ចីហាន់សរសៃ សៀងផ្អែម និងផ្សិតចំបើង',
    subIngEn: 'Julienne young ginger, fermented bean sauce, and straw mushrooms',
    herbKh: 'ស្លឹកខ្ទឹម ជីរវ៉ាន់ស៊ុយ និងខ្ទឹមសបំពង',
    herbEn: 'Spring onions, cilantro, and crispy garlic',
  },
  {
    nameKh: 'បាយឆាម្រះព្រៅសាច់គោពងទាចៀន',
    nameEn: 'Spicy Holy Basil Beef Fried Rice with Crispy Fried Egg',
    cat: 'rice',
    catKh: 'បាយ & បបរ / បាយឆាម្រះព្រៅ',
    catEn: 'Rice / Holy Basil Beef Rice',
    mainIngKh: 'បាយផ្កាម្លិះ សាច់គោចិញ្ច្រាំ និងពងទាចៀន (៤៥០ ក្រាម)',
    mainIngEn: 'Jasmine rice, minced beef, and crispy fried duck egg (450g)',
    subIngKh: 'សណ្តែកគួរ ម្ទេសខ្មាំង និងខ្ទឹមស',
    subIngEn: 'Diced long beans, bird-eye chili, and garlic',
    herbKh: 'ស្លឹកម្រះព្រៅក្រហម និងត្រសក់ស្រស់',
    herbEn: 'Red holy basil leaves and fresh cucumber slices',
  },
  {
    nameKh: 'បាយមាន់ស្ងោរទឹកត្រីខ្ញីពិសេស',
    nameEn: 'Cambodian Poached Free-Range Chicken Rice with Ginger Sauce',
    cat: 'rice',
    catKh: 'បាយ & បបរ / បាយមាន់ខ្ញី',
    catEn: 'Rice / Poached Chicken Rice',
    mainIngKh: 'សាច់មាន់ស្រែស្ងោរ និងបាយដាំជាមួយទឹកស៊ុបមាន់ (៥០០ ក្រាម)',
    mainIngEn: 'Poached country chicken over fragrant chicken-broth rice (500g)',
    subIngKh: 'ទឹកត្រីខ្ញីបុកម្ទេស និងទឹកស៊ុបត្រឡាចក្តៅៗ',
    subIngEn: 'Pounded ginger-chili fish sauce and hot winter melon soup',
    herbKh: 'ជីរវ៉ាន់ស៊ុយ និងត្រសក់ស្រស់',
    herbEn: 'Fresh cilantro and cucumber',
  },
  {
    nameKh: 'បាយឆាយ៉ាងចូវ',
    nameEn: 'Yangzhou Fried Rice',
    cat: 'rice',
    catKh: 'បាយ & បបរ / បាយឆាយ៉ាងចូវ',
    catEn: 'Rice / Yangzhou Fried Rice',
    mainIngKh: 'បាយផ្កាម្លិះ សាច់ក្រក សាច់ជ្រូកសាស៊ីវ បង្គា និងស៊ុត (៤៥០ ក្រាម)',
    mainIngEn: 'Jasmine rice, sweet sausage, char siu pork, prawns, and egg (450g)',
    subIngKh: 'ការ៉ុត ពោតផ្អែម និងសណ្តែកខៀវ',
    subIngEn: 'Diced carrots, sweet corn, and green peas',
    herbKh: 'ស្លឹកខ្ទឹម និងជីរវ៉ាន់ស៊ុយ',
    herbEn: 'Chopped scallions and cilantro',
  },
  {
    nameKh: 'បបរសពងទាប្រៃត្រីងៀតឆាឆៃប៉ូវ',
    nameEn: 'Plain Rice Congee with Salted Egg, Dried Fish & Stir-Fried Radish',
    cat: 'rice',
    catKh: 'បាយ & បបរ / បបរសត្រីងៀត',
    catEn: 'Porridge / Teochew-Khmer Congee Set',
    mainIngKh: 'បបរសស្លឹកតយ ត្រីងៀតចៀន និងពងទាប្រៃ (៤០០ ក្រាម)',
    mainIngEn: 'Pandan plain rice porridge, fried dried fish, and salted egg (400g)',
    subIngKh: 'ឆៃប៉ូវឆាពងទា និងស្ពៃជ្រក់',
    subIngEn: 'Stir-fried preserved radish with egg and pickled mustard greens',
    herbKh: 'ស្លឹកតយ និងស្លឹកខ្ទឹម',
    herbEn: 'Fragrant pandan leaves and scallions',
  },
  {
    nameKh: 'បាយដំណើបសាច់គោងៀតជ្រក់ល្ហុង',
    nameEn: 'Steamed Sticky Rice with Crispy Beef Jerky & Papaya Pickle',
    cat: 'rice',
    catKh: 'បាយ & បបរ / បាយដំណើបសាច់គោងៀត',
    catEn: 'Rice / Sticky Rice & Beef Jerky',
    mainIngKh: 'បាយដំណើបចំហុយក្តៅៗ និងសាច់គោងៀតចៀន (៤០០ ក្រាម)',
    mainIngEn: 'Steamed glutinous rice and crispy sun-dried beef jerky (400g)',
    subIngKh: 'ជ្រក់ល្ហុងការ៉ុតជូរផ្អែម និងទឹកម្ទេសខ្ទឹមស',
    subIngEn: 'Sweet-sour green papaya pickle and chili sauce',
    herbKh: 'ខ្ទឹមក្រហមបំពង និងជីរវ៉ាន់ស៊ុយ',
    herbEn: 'Crispy fried shallots and cilantro',
  },
  {
    nameKh: 'បាយអប់ឆ្នាំងដីគ្រឿងសមុទ្រម្រេចខ្ចី',
    nameEn: 'Claypot Baked Seafood Rice with Green Kampot Pepper',
    cat: 'rice',
    catKh: 'បាយ & បបរ / បាយអប់ឆ្នាំងដី',
    catEn: 'Rice / Claypot Seafood Rice',
    mainIngKh: 'បាយផ្កាម្លិះ បង្គា មឹក និងសាច់ក្តាមអប់ក្នុងឆ្នាំងដី (៥០០ ក្រាម)',
    mainIngEn: 'Claypot jasmine rice baked with prawns, squid, and crab (500g)',
    subIngKh: 'ម្រេចខ្ចីកំពត ខ្ទឹមស និងទឹកស៊ីអ៊ីវប្រេងល្ង',
    subIngEn: 'Green Kampot peppercorns, garlic, and sesame soy sauce',
    herbKh: 'ស្លឹកខ្ទឹម និងជីរវ៉ាន់ស៊ុយ',
    herbEn: 'Spring onions and fresh coriander',
  },

  // ================= STREET FOOD & SNACKS (8 dishes: food-177 .. food-184) =================
  {
    nameKh: 'នំគ្រក់ខ្ទិះដូងស្លឹកខ្ទឹមទឹកត្រីផ្អែម',
    nameEn: 'Crispy Coconut & Scallion Rice Pancakes (Num Krok)',
    cat: 'streetfood',
    catKh: 'អាហារសម្រន់ / នំគ្រក់ខ្មែរ',
    catEn: 'Street Food / Num Krok',
    mainIngKh: 'ម្សៅអង្ករកិនលាយខ្ទិះដូងដើមខាប់ (៣៥០ ក្រាម)',
    mainIngEn: 'Stone-ground rice flour batter and thick coconut cream (350g)',
    subIngKh: 'ស្លឹកខ្ទឹមហាន់ល្អិត និងទឹកត្រីផ្អែមជ្រក់ល្ហុង',
    subIngEn: 'Chopped green scallions and sweet fish sauce with papaya pickle',
    herbKh: 'ស្លឹកខ្ទឹមស្រស់ និងម្ទេសក្រហម',
    herbEn: 'Fresh scallions and minced red chili',
  },
  {
    nameKh: 'បាញ់ឆែវខ្មែរស្នូលបង្គាសាច់ជ្រូក',
    nameEn: 'Crispy Turmeric Coconut Crepe with Prawn & Pork (Banh Chao)',
    cat: 'streetfood',
    catKh: 'អាហារសម្រន់ / បាញ់ឆែវខ្មែរ',
    catEn: 'Street Food / Khmer Banh Chao',
    mainIngKh: 'ម្សៅបាញ់ឆែវលាយរមៀតខ្ទិះដូង បង្គា និងសាច់ជ្រូកចិញ្ច្រាំ (៤៥០ ក្រាម)',
    mainIngEn: 'Turmeric coconut rice crepe filled with prawns and minced pork (450g)',
    subIngKh: 'សណ្តែកបណ្តុះ និងទឹកត្រីផ្អែមសណ្តែកដីបុក',
    subIngEn: 'Bean sprouts and sweet-sour peanut fish sauce',
    herbKh: 'សាឡាត់ ជីរអង្កាម ជីរនាងវង និងត្រសក់',
    herbEn: 'Lettuce wraps, mint, sweet basil, and cucumber',
  },
  {
    nameKh: 'លៀសហាលអំបិលម្ទេសភ្នំពេញ',
    nameEn: 'Phnom Penh Sun-Dried Spiced River Clams (Lies Hal)',
    cat: 'streetfood',
    catKh: 'អាហារសម្រន់ / លៀសហាល',
    catEn: 'Street Food / Spiced Sun-Dried Clams',
    mainIngKh: 'លៀសទន្លេស្រស់លាងស្អាតប្រឡាក់គ្រឿងហាលថ្ងៃ (៤០០ ក្រាម)',
    mainIngEn: 'Freshwater river clams marinated and sun-warmed (400g)',
    subIngKh: 'អំបិល ម្ទេសខ្មាំងបុក ខ្ទឹមស និងប៊ីចេងតិចៗ',
    subIngEn: 'Coarse salt, pounded bird-eye chili, and crushed garlic',
    herbKh: 'ក្រូចឆ្មារ និងស្លឹកជីរ',
    herbEn: 'Fresh lime wedges and herbs',
  },
  {
    nameKh: 'ប្រហិតសាច់គោចៀនទឹកជ្រលក់',
    nameEn: 'Crispy Fried Khmer Beef Meatballs with Spicy Tamarind Sauce',
    cat: 'streetfood',
    catKh: 'អាហារសម្រន់ / ប្រហិតសាច់គោចៀន',
    catEn: 'Street Food / Fried Beef Meatballs',
    mainIngKh: 'ប្រហិតសាច់គោសុទ្ធចៀនស្រួយ (៣៥០ ក្រាម)',
    mainIngEn: 'Pure beef meatballs pan-fried until golden and bouncy (350g)',
    subIngKh: 'ទឹកជ្រលក់អម្ពិលទុំស្ករត្នោតម្ទេស និងជ្រក់ល្ហុងការ៉ុត',
    subIngEn: 'Spicy palm sugar tamarind sauce and crispy papaya pickle',
    herbKh: 'ជីររណារ និងសណ្តែកដីបុក',
    herbEn: 'Culantro and crushed roasted peanuts',
  },
  {
    nameKh: 'គួងបង្គាសាច់ជ្រូកទឹកជ្រលក់សណ្តែកដី',
    nameEn: 'Fresh Cambodian Spring Rolls with Prawn, Pork & Peanut Sauce (Nime Chow)',
    cat: 'streetfood',
    catKh: 'អាហារសម្រន់ / គួងបង្គាស្រស់',
    catEn: 'Street Food / Fresh Spring Rolls',
    mainIngKh: 'សំបកណែម បង្គាស្រុស សាច់ជ្រូកបីជាន់ និងនំបញ្ចុក (៣៥០ ក្រាម)',
    mainIngEn: 'Rice paper rolls with poached prawns, pork belly, and vermicelli (350g)',
    subIngKh: 'ទឹកជ្រលក់សៀងសណ្តែកដីខាប់ ឬទឹកត្រីផ្អែម',
    subIngEn: 'Rich hoisin-peanut dipping sauce or sweet garlic fish sauce',
    herbKh: 'សាឡាត់ ជីរអង្កាម ជីរនាងវង និងស្លឹកគូឆាយ',
    herbEn: 'Lettuce, mint, sweet basil, and garlic chives',
  },
  {
    nameKh: 'ចាដូវបំពងស្នូលត្រាវសាច់ជ្រូក',
    nameEn: 'Crispy Fried Taro & Pork Imperial Spring Rolls (Chaornguv)',
    cat: 'streetfood',
    catKh: 'អាហារសម្រន់ / ចាដូវបំពង',
    catEn: 'Street Food / Crispy Fried Spring Rolls',
    mainIngKh: 'សាច់ជ្រូកចិញ្ច្រាំ ត្រាវឈូស មីសួរ និងផ្សិតត្រចៀកកណ្តុរ (៣៥០ ក្រាម)',
    mainIngEn: 'Minced pork, shredded taro, glass noodles, and wood-ear mushroom (350g)',
    subIngKh: 'សំបកចាដូវបំពងស្រួយ និងទឹកត្រីជូរផ្អែម',
    subIngEn: 'Crispy golden spring roll pastry and sweet-sour fish sauce',
    herbKh: 'សាឡាត់ និងជីរគ្រប់មុខ',
    herbEn: 'Crisp lettuce and fresh garden herbs',
  },
  {
    nameKh: 'នំកាឆាយបំពងទឹកត្រីផ្អែមម្ទេស',
    nameEn: 'Crispy Pan-Fried Garlic Chive Rice Cakes (Num Kachay)',
    cat: 'streetfood',
    catKh: 'អាហារសម្រន់ / នំកាឆាយ',
    catEn: 'Street Food / Crispy Chive Cakes',
    mainIngKh: 'ម្សៅអង្ករដំណើប និងស្លឹកគូឆាយស្រស់ហាន់ (៣៥០ ក្រាម)',
    mainIngEn: 'Glutinous rice flour dough stuffed with fresh garlic chives (350g)',
    subIngKh: 'ទឹកត្រីផ្អែមជូរលាយម្ទេសខ្ទឹមស',
    subIngEn: 'Sweet and tangy chili-garlic fish sauce',
    herbKh: 'ស្លឹកគូឆាយខ្ចី',
    herbEn: 'Fresh green garlic chives',
  },
  {
    nameKh: 'សាច់ជ្រូកចំហុយពងត្រី និងពងទាប្រៃ',
    nameEn: 'Steamed Minced Pork with Fish Roe & Salted Duck Egg',
    cat: 'streetfood',
    catKh: 'ម្ហូបចំហុយ / សាច់ជ្រូកចំហុយពងត្រី',
    catEn: 'Steamed Dish / Pork, Fish Roe & Salted Egg',
    mainIngKh: 'សាច់ជ្រូកចិញ្ច្រាំ ពងត្រីស្រស់ និងពងទា ៣ គ្រាប់ (៤៥០ ក្រាម)',
    mainIngEn: 'Minced pork, fresh fish roe, and 3 duck eggs (450g)',
    subIngKh: 'ពងទាប្រៃ ២ គ្រាប់ មីសួរ ផ្សិតត្រចៀកកណ្តុរ និងខ្ទឹមសបំពង',
    subIngEn: '2 salted duck eggs, glass noodles, wood-ear mushrooms, and fried garlic',
    herbKh: 'ស្លឹកខ្ទឹម ជីរវ៉ាន់ស៊ុយ ម្ទេសហាន់ និងម្រេចកំពត',
    herbEn: 'Scallions, cilantro, sliced red chili, and Kampot black pepper',
  },

  // ================= DESSERTS & TRADITIONAL CAKES (8 dishes: food-185 .. food-192) =================
  {
    nameKh: 'បង្អែមល្ពៅសង់ខ្យាខ្ទិះដូង',
    nameEn: 'Steamed Whole Pumpkin with Coconut Egg Custard (Sangkhya Lapov)',
    cat: 'dessert',
    catKh: 'បង្អែមខ្មែរ / ល្ពៅសង់ខ្យា',
    catEn: 'Dessert / Pumpkin Coconut Custard',
    mainIngKh: 'ផ្លែល្ពៅខ្មែរសាច់ស្អិត ១ ផ្លែ និងពងទា ៥ គ្រាប់',
    mainIngEn: '1 waxy Cambodian pumpkin and 5 duck eggs',
    subIngKh: 'ខ្ទិះដូងដើមខាប់ និងស្ករត្នោតខ្មែរសុទ្ធ',
    subIngEn: 'Rich first-press coconut cream and pure palm sugar',
    herbKh: 'ស្លឹកតយក្រអូប',
    herbEn: 'Fragrant pandan leaves',
  },
  {
    nameKh: 'បង្អែមចេកខ្ទិះគ្រាប់សាគូ',
    nameEn: 'Simmered Banana in Sweet Coconut Cream with Tapioca Pearls (Chek Ktis)',
    cat: 'dessert',
    catKh: 'បង្អែមខ្មែរ / ចេកខ្ទិះ',
    catEn: 'Dessert / Banana Coconut Cream',
    mainIngKh: 'ចេកណាំវ៉ាទុំល្មម និងគ្រាប់សាគូតូចៗ (៤០០ ក្រាម)',
    mainIngEn: 'Ripe Nam Wah bananas and translucent tapioca pearls (400g)',
    subIngKh: 'ខ្ទិះដូងដើម ស្ករត្នោត និងអំបិលមួយចុងស្លាបព្រា',
    subIngEn: 'Thick coconut milk, palm sugar, and a pinch of sea salt',
    herbKh: 'ស្លឹកតយ និងល្ងសលីងឈ្ងុយ',
    herbEn: 'Pandan leaf and toasted white sesame seeds',
  },
  {
    nameKh: 'នំអន្សមជ្រូកចៀន',
    nameEn: 'Crispy Pan-Fried Sliced Sticky Rice Cake with Pork & Mung Bean (Num Ansom Chien)',
    cat: 'dessert',
    catKh: 'នំប្រពៃណីខ្មែរ / នំអន្សមជ្រូកចៀន',
    catEn: 'Traditional Cake / Crispy Pan-Fried Num Ansom',
    mainIngKh: 'នំអន្សមជ្រូកស្នូលសណ្តែកលឿង និងសាច់ជ្រូកបីជាន់កាត់ជាកង់ចៀនស្រួយ (៦០០ ក្រាម)',
    mainIngEn: 'Sliced sticky rice cake stuffed with mung beans & peppered pork belly, pan-fried golden crisp (600g)',
    subIngKh: 'ប្រេងឆាសម្រាប់ចៀន ខ្ទិះដូង អំបិល និងជ្រក់ត្រសក់ ឬទឹកត្រីផ្អែម',
    subIngEn: 'Cooking oil for pan-frying, coconut milk, sea salt, and cucumber pickle or sweet fish sauce',
    herbKh: 'ម្រេចកំពត និងខ្ទឹមសក្នុងស្នូលសាច់ជ្រូក',
    herbEn: 'Kampot black pepper and garlic seasoning',
  },
  {
    nameKh: 'នំគមស្លឹកចេកស្នូលដូងស្ករត្នោតបុរាណ',
    nameEn: 'Pyramid Sticky Rice Cake with Sweet Palm Sugar Coconut Filling (Num Kom)',
    cat: 'dessert',
    catKh: 'នំប្រពៃណីខ្មែរ / នំគម',
    catEn: 'Traditional Cake / Pyramid Num Kom',
    mainIngKh: 'ម្សៅអង្ករដំណើប និងសាច់ដូងកោសឆាស្ករត្នោត (៤០០ ក្រាម)',
    mainIngEn: 'Glutinous rice dough and caramelized palm sugar shredded coconut (400g)',
    subIngKh: 'ល្ងលីង សណ្តែកដីបុក និងស្លឹកចេកវេចរាងសាជី',
    subIngEn: 'Toasted sesame, roasted peanuts, and pyramid banana leaf wrap',
    herbKh: 'ស្លឹកតយក្រអូប',
    herbEn: 'Pandan aroma',
  },
  {
    nameKh: 'បង្អែមបាញ់ចានឿកខ្ទិះដូងខ្ញី',
    nameEn: 'Glutinous Rice Balls in Ginger Palm Sugar & Coconut Cream (Banh Cha Neuk)',
    cat: 'dessert',
    catKh: 'បង្អែមខ្មែរ / បាញ់ចានឿក',
    catEn: 'Dessert / Ginger Rice Balls',
    mainIngKh: 'ម្សៅអង្ករដំណើបមូលស្នូលសណ្តែកលឿង (៣៥០ ក្រាម)',
    mainIngEn: 'Glutinous rice balls stuffed with sweet mung bean paste (350g)',
    subIngKh: 'ទឹកស្ករត្នោតដាំជាមួយខ្ញីចាស់ និងខ្ទិះដូងដើម',
    subIngEn: 'Warm ginger palm sugar syrup topped with rich coconut cream',
    herbKh: 'ខ្ញីស្រស់ ស្លឹកតយ និងល្ងលីង',
    herbEn: 'Fresh ginger, pandan leaf, and toasted sesame',
  },
  {
    nameKh: 'បាយដំណើបស្វាយទុំខ្ទិះដូងល្ងលីង',
    nameEn: 'Cambodian Sweet Sticky Rice with Ripe Keo Romeat Mango & Coconut Cream',
    cat: 'dessert',
    catKh: 'បង្អែមខ្មែរ / បាយដំណើបស្វាយទុំ',
    catEn: 'Dessert / Mango Sticky Rice',
    mainIngKh: 'ស្វាយកែវរមៀតទុំផ្អែម និងបាយដំណើបខ្ទិះដូង (៤០០ ក្រាម)',
    mainIngEn: 'Sweet ripe Keo Romeat mango and coconut sticky rice (400g)',
    subIngKh: 'ខ្ទិះដូងដើមខាប់ ស្ករស និងអំបិលតិចៗ',
    subIngEn: 'Salted thick coconut cream drizzle',
    herbKh: 'ស្លឹកតយ និងសណ្តែកបាយលីងស្រួយ',
    herbEn: 'Pandan leaf and crispy toasted mung beans',
  },
  {
    nameKh: 'នំផ្លែអាយស្ករត្នោតដូងកោស',
    nameEn: 'Sticky Rice Balls Bursting with Molten Palm Sugar & Fresh Coconut (Num Plae Ai)',
    cat: 'dessert',
    catKh: 'នំប្រពៃណីខ្មែរ / នំផ្លែអាយ',
    catEn: 'Traditional Cake / Num Plae Ai',
    mainIngKh: 'ម្សៅអង្ករដំណើប និងស្ករត្នោតរឹងកាត់ដុំតូចៗ (៣០០ ក្រាម)',
    mainIngEn: 'Glutinous rice flour balls with cube of pure palm sugar inside (300g)',
    subIngKh: 'សាច់ដូងខ្ចីកោសសរសៃលាយអំបិលតិចៗរោយពីលើ',
    subIngEn: 'Freshly grated young coconut with a hint of salt',
    herbKh: 'ស្លឹកតយបុកយកទឹកលាយម្សៅ',
    herbEn: 'Natural pandan leaf extract',
  },
  {
    nameKh: 'បង្អែមត្រាវកូរខ្ទិះដូងដើម',
    nameEn: 'Velvety Taro Paste Dessert with Rich Coconut Cream (Borbor Trav)',
    cat: 'dessert',
    catKh: 'បង្អែមខ្មែរ / បង្អែមត្រាវ',
    catEn: 'Dessert / Creamy Taro Coconut',
    mainIngKh: 'ត្រាវក្រអូបចំហុយឆ្អិន និងគ្រាប់សាគូ (៤០០ ក្រាម)',
    mainIngEn: 'Fragrant taro root chunks and sago pearls (400g)',
    subIngKh: 'ខ្ទិះដូងដើមខាប់ និងស្ករស/ស្ករត្នោត',
    subIngEn: 'Rich coconut milk and palm sugar',
    herbKh: 'ស្លឹកតយក្រអូប',
    herbEn: 'Pandan leaves',
  },

  // ================= DRINKS & BEVERAGES (8 dishes: food-193 .. food-200) =================
  {
    nameKh: 'ទឹកអំពៅស្រស់គាបក្រូចឆ្មារ',
    nameEn: 'Freshly Pressed Sugarcane Juice with Kumquat Lime (Teuk Ampov)',
    cat: 'drink',
    catKh: 'ភេសជ្ជៈខ្មែរ / ទឹកអំពៅក្រូចឆ្មារ',
    catEn: 'Drink / Sugarcane Kumquat Juice',
    mainIngKh: 'អំពៅខ្មែរស្រស់គាបជាមួយក្រូចឆ្មារ ឬក្រូចឆ្មារគុមក្វាត់ (៥០០ មីលីលីត្រ)',
    mainIngEn: 'Fresh sugarcane stalks pressed with whole kumquat limes (500ml)',
    subIngKh: 'ទឹកកកអនាម័យត្រជាក់ៗ',
    subIngEn: 'Crushed ice',
    herbKh: 'ស្លឹកជីរអង្កាមស្រស់',
    herbEn: 'Fresh mint garnish',
  },
  {
    nameKh: 'កាហ្វេទឹកដោះគោទឹកកកបែបខ្មែរ',
    nameEn: 'Cambodian Roasted Iced Condensed Milk Coffee (Kafe Teuk Dos Ko)',
    cat: 'drink',
    catKh: 'ភេសជ្ជៈខ្មែរ / កាហ្វេទឹកដោះគោទឹកកក',
    catEn: 'Drink / Cambodian Iced Coffee',
    mainIngKh: 'ម្សៅកាហ្វេមណ្ឌលគិរីឆុងចម្រោះក្រណាត់ (១៥០ មីលីលីត្រ)',
    mainIngEn: 'Dark-roasted Mondulkiri coffee brewed through cloth filter (150ml)',
    subIngKh: 'ទឹកដោះគោខាប់ផ្អែម និងទឹកដោះគោឆៅ',
    subIngEn: 'Sweetened condensed milk and evaporated milk over ice',
    herbKh: 'ក្លិនកាហ្វេលីងប៊ឺប្រពៃណីខ្មែរ',
    herbEn: 'Traditional butter-roasted coffee aroma',
  },
  {
    nameKh: 'ទឹកត្នោតផ្អែមធម្មជាតិត្រជាក់',
    nameEn: 'Chilled Fresh Sweet Toddy Palm Nectar (Teuk Tnot Ph-aem)',
    cat: 'drink',
    catKh: 'ភេសជ្ជៈខ្មែរ / ទឹកត្នោតផ្អែម',
    catEn: 'Drink / Fresh Palm Nectar',
    mainIngKh: 'ទឹកត្នោតផ្អែមស្រស់ត្រងពីដើមត្នោត (៥០០ មីលីលីត្រ)',
    mainIngEn: 'Pure freshly harvested sweet toddy palm sap (500ml)',
    subIngKh: 'សាច់ត្នោតខ្ចីហាន់ស្តើង និងទឹកកក',
    subIngEn: 'Tender young palm fruit slices and ice',
    herbKh: 'បំពង់ឫស្សី និងស្លឹកតយ',
    herbEn: 'Smoky bamboo & pandan aroma',
  },
  {
    nameKh: 'ទឹកក្រឡុកផ្លែបឺរទឹកដោះគោខាប់',
    nameEn: 'Creamy Mondulkiri Avocado & Condensed Milk Smoothie',
    cat: 'drink',
    catKh: 'ភេសជ្ជៈខ្មែរ / ទឹកក្រឡុកផ្លែបឺរ',
    catEn: 'Drink / Avocado Smoothie',
    mainIngKh: 'ផ្លែបឺរមណ្ឌលគិរីទុំសាច់ម៉ត់ ១ ផ្លែ',
    mainIngEn: '1 ripe creamy Mondulkiri avocado',
    subIngKh: 'ទឹកដោះគោខាប់ ទឹកដោះគោស្រស់ និងទឹកកកម៉ត់',
    subIngEn: 'Condensed milk, fresh milk, and blended ice',
    herbKh: 'សាច់បឺរស្រស់ដាក់ពីលើ',
    herbEn: 'Fresh avocado cubes on top',
  },
  {
    nameKh: 'ទឹកដូងក្រអូបស្រស់ត្រជាក់',
    nameEn: 'Chilled Cambodian Fragrant Young Coconut (Teuk Doung Kra-ob)',
    cat: 'drink',
    catKh: 'ភេសជ្ជៈខ្មែរ / ទឹកដូងក្រអូប',
    catEn: 'Drink / Fragrant Young Coconut',
    mainIngKh: 'ដូងក្រអូបខ្ចីស្រស់ ១ ផ្លែ (កាប់មុខក្លាស្សេត្រជាក់)',
    mainIngEn: '1 whole chilled fragrant young coconut with tender flesh',
    subIngKh: 'សាច់ដូងខ្ចីទន់ផ្អែមធម្មជាតិ',
    subIngEn: 'Soft spoonable young coconut meat',
    herbKh: 'ស្លឹកតយធម្មជាតិ',
    herbEn: 'Natural pandan fragrance',
  },
  {
    nameKh: 'តែក្រូចឆ្មារទឹកឃ្មុំព្រៃ',
    nameEn: 'Wild Forest Honey & Fresh Lime Iced Tea (Tae Krouch Chhmar)',
    cat: 'drink',
    catKh: 'ភេសជ្ជៈខ្មែរ / តែក្រូចឆ្មារទឹកឃ្មុំ',
    catEn: 'Drink / Honey Lime Iced Tea',
    mainIngKh: 'ទឹកតែក្រហមឆុងថ្មីៗ និងទឹកក្រូចឆ្មារស្រស់ (៤០០ មីលីលីត្រ)',
    mainIngEn: 'Freshly brewed red tea and squeezed lime juice (400ml)',
    subIngKh: 'ទឹកឃ្មុំព្រៃសុទ្ធ និងទឹកកក',
    subIngEn: 'Pure wild forest honey and ice cubes',
    herbKh: 'ចំណិតក្រូចឆ្មារ និងជីរអង្កាម',
    herbEn: 'Fresh lime wheels and mint leaves',
  },
  {
    nameKh: 'ទឹកសណ្តែកសៀងក្តៅឧណ្ហៗស្លឹកតយ',
    nameEn: 'Freshly Stone-Ground Warm Soy Milk with Pandan (Teuk Sandaek)',
    cat: 'drink',
    catKh: 'ភេសជ្ជៈខ្មែរ / ទឹកសណ្តែកស្លឹកតយ',
    catEn: 'Drink / Pandan Soy Milk',
    mainIngKh: 'គ្រាប់សណ្តែកសៀងកិនចម្រោះដាំក្តៅៗ (៤០០ មីលីលីត្រ)',
    mainIngEn: 'Freshly ground organic yellow soybeans simmered until silky (400ml)',
    subIngKh: 'ទឹកស្ករត្នោត ឬស្ករសតាមចំណូលចិត្ត',
    subIngEn: 'Light palm sugar syrup',
    herbKh: 'ស្លឹកតយក្រអូបឈ្ងុយ',
    herbEn: 'Fresh pandan leaf bundle',
  },
  {
    nameKh: 'ទឹកក្រឡុកស្រកានាគក្រហមទឹកដោះគោស្រស់',
    nameEn: 'Red Dragon Fruit & Fresh Milk Tropical Smoothie',
    cat: 'drink',
    catKh: 'ភេសជ្ជៈខ្មែរ / ទឹកក្រឡុកស្រកានាគ',
    catEn: 'Drink / Red Dragon Fruit Smoothie',
    mainIngKh: 'ផ្លែស្រកានាគសាច់ក្រហមផ្អែមធម្មជាតិ (៣០០ ក្រាម)',
    mainIngEn: 'Sweet red-fleshed dragon fruit (300g)',
    subIngKh: 'ទឹកដោះគោស្រស់ ទឹកដោះគោខាប់តិចៗ និងទឹកកក',
    subIngEn: 'Fresh milk, a touch of condensed milk, and crushed ice',
    herbKh: 'ជីរអង្កាមតុបតែងពីលើ',
    herbEn: 'Fresh mint sprig',
  },
];

const VERIFIED_CALORIES_101_200: Record<string, number> = {
  'food-101': 285, 'food-102': 195, 'food-103': 230, 'food-104': 380,
  'food-105': 330, 'food-106': 245, 'food-107': 385, 'food-108': 255,
  'food-109': 265, 'food-110': 210, 'food-111': 250, 'food-112': 275,
  'food-113': 470, 'food-114': 185, 'food-115': 240, 'food-116': 215,
  'food-117': 280, 'food-118': 430, 'food-119': 315, 'food-120': 395,
  'food-121': 240, 'food-122': 275, 'food-123': 465, 'food-124': 310,
  'food-125': 260, 'food-126': 370, 'food-127': 265, 'food-128': 485,
  'food-129': 455, 'food-130': 210, 'food-131': 345, 'food-132': 360,
  'food-133': 340, 'food-134': 155, 'food-135': 275, 'food-136': 245,
  'food-137': 250, 'food-138': 285, 'food-139': 195, 'food-140': 530,
  'food-141': 215, 'food-142': 350, 'food-143': 340, 'food-144': 230,
  'food-145': 245, 'food-146': 365, 'food-147': 275, 'food-148': 235,
  'food-149': 265, 'food-150': 230, 'food-151': 185, 'food-152': 295,
  'food-153': 255, 'food-154': 240, 'food-155': 320, 'food-156': 195,
  'food-157': 440, 'food-158': 415, 'food-159': 435, 'food-160': 465,
  'food-161': 480, 'food-162': 375, 'food-163': 335, 'food-164': 390,
  'food-165': 475, 'food-166': 410, 'food-167': 485, 'food-168': 510,
  'food-169': 315, 'food-170': 265, 'food-171': 520, 'food-172': 460,
  'food-173': 495, 'food-174': 290, 'food-175': 430, 'food-176': 465,
  'food-177': 295, 'food-178': 410, 'food-179': 175, 'food-180': 310,
  'food-181': 245, 'food-182': 340, 'food-183': 280, 'food-184': 345,
  'food-185': 325, 'food-186': 285, 'food-187': 430, 'food-188': 260,
  'food-189': 290, 'food-190': 365, 'food-191': 240, 'food-192': 310,
  'food-193': 180, 'food-194': 215, 'food-195': 145, 'food-196': 310,
  'food-197': 110, 'food-198': 125, 'food-199': 155, 'food-200': 195,
};

function extractMainIngredientAmount(mainIngKh: string, mainIngEn: string): {
  cleanKh: string;
  cleanEn: string;
  amount: string;
} {
  const khMatch = mainIngKh.match(/\s*\(([០-៩0-9.]+\s*(?:ក្រាម|គីឡូក្រាម|គីឡូ|មីលីលីត្រ|លីត្រ))\)\s*$/);
  const cleanKh = khMatch ? mainIngKh.slice(0, khMatch.index).trim() : mainIngKh.trim();
  const cleanEn = mainIngEn.replace(/\s*\(\d+(?:\.\d+)?\s*(?:g|kg|ml|L)\)\s*$/i, '').trim();

  if (khMatch) {
    return { cleanKh, cleanEn, amount: khMatch[1].trim() };
  }
  if (mainIngKh.includes('១ ផ្លែ')) {
    return { cleanKh, cleanEn, amount: '១ ផ្លែ' };
  }
  return { cleanKh, cleanEn, amount: '១ ចំណែកធំ' };
}

function buildSeasoningIngredient(
  id: string,
  item: RawNewDish
): { nameKh: string; nameEn: string; amount: string } {
  if (item.cat === 'drink') {
    if (id === 'food-193') {
      return { nameKh: 'អំបិលម៉ត់មួយចុងស្លាបព្រា', nameEn: 'Tiny pinch of fine sea salt', amount: 'តាមចំណូលចិត្ត' };
    }
    if (id === 'food-194') {
      return { nameKh: 'ទឹកក្តៅពុះសម្រាប់ឆុង និងទឹកកកអនាម័យ', nameEn: 'Boiling brewing water & crushed ice', amount: '១ កែវ' };
    }
    if (id === 'food-195') {
      return { nameKh: 'ទឹកកកអនាម័យត្រជាក់ស្រស់', nameEn: 'Clean chilled ice cubes', amount: 'តាមចំណូលចិត្ត' };
    }
    if (id === 'food-196') {
      return { nameKh: 'ទឹកស្ករស ឬទឹកឃ្មុំធម្មជាតិតិចៗ', nameEn: 'Light sugar syrup or pure honey', amount: '១ ស្លាបព្រាបាយ' };
    }
    if (id === 'food-197') {
      return { nameKh: 'ទឹកកកអនាម័យ (តាមចំណូលចិត្ត)', nameEn: 'Optional chilled ice cubes', amount: 'តាមចំណូលចិត្ត' };
    }
    if (id === 'food-198') {
      return { nameKh: 'ទឹកក្តៅឆុងតែ និងអំបិលម៉ត់មួយចុងស្លាបព្រា', nameEn: 'Hot brewing water & tiny pinch of sea salt', amount: 'តាមចំណូលចិត្ត' };
    }
    if (id === 'food-199') {
      return { nameKh: 'ទឹកស្អាតចម្រោះ និងអំបិលម៉ត់បន្តិច', nameEn: 'Filtered water & tiny pinch of sea salt', amount: 'តាមចំណូលចិត្ត' };
    }
    return { nameKh: 'ទឹកក្រូចឆ្មារស្រស់បន្តិច និងទឹកស្ករតិចៗ', nameEn: 'Squeeze of fresh lime & light syrup', amount: 'តាមចំណូលចិត្ត' };
  }

  if (item.cat === 'dessert') {
    if (id === 'food-187') {
      return {
        nameKh: 'ទឹកត្រី ស្ករត្នោត អំបិល និងខ្សែចងនំអន្សម',
        nameEn: 'Fish sauce, palm sugar, sea salt & natural binding twine',
        amount: 'តាមចំណូលចិត្ត',
      };
    }
    return {
      nameKh: 'ស្ករត្នោតខ្មែរ អំបិលម៉ត់បន្តិច និងខ្ទិះដូងធម្មជាតិ',
      nameEn: 'Cambodian palm sugar, pinch of sea salt & fresh coconut cream',
      amount: 'តាមចំណូលចិត្ត',
    };
  }

  if (item.cat === 'salad') {
    return {
      nameKh: 'ទឹកត្រី ទឹកក្រូចឆ្មារ ស្ករត្នោត និងម្ទេសស្រស់',
      nameEn: 'Fish sauce, fresh lime juice, palm sugar & chilies',
      amount: 'សម្រាប់ទឹកញាំ',
    };
  }

  if (item.cat === 'stirfry' && !item.nameKh.startsWith('ខ')) {
    return {
      nameKh: 'ប្រេងឆា ប្រេងខ្យង ទឹកត្រី ស្ករត្នោត និងម្រេចកំពត',
      nameEn: 'Cooking oil, oyster sauce, fish sauce, palm sugar & Kampot pepper',
      amount: 'តាមចំណូលចិត្ត',
    };
  }

  return {
    nameKh: 'ទឹកត្រី ស្ករត្នោត អំបិល និងម្រេចកំពត',
    nameEn: 'Fish sauce, palm sugar, sea salt & Kampot pepper',
    amount: 'តាមចំណូលចិត្ត',
  };
}

function buildStepsForDish(
  id: string,
  item: RawNewDish,
  mainIngKh: string,
  mainIngEn: string
): Array<{ stepNumber: number; instructionKh: string; instructionEn: string }> {
  const { cat, nameKh, nameEn, subIngKh, herbKh, subIngEn, herbEn } = item;

  // ================= SOUP (food-101 .. food-116) =================
  if (cat === 'soup') {
    // Coconut curry / Samlor Ktis (food-104, food-113)
    if (nameKh.includes('ការី') || nameKh.includes('សម្លខ្ទិះ')) {
      const isFish = nameKh.includes('ត្រី');
      return [
        {
          stepNumber: 1,
          instructionKh: `លាងសម្អាត ${mainIngKh} ឱ្យស្អាត រួចរៀបចំ ${subIngKh} និងបុកគ្រឿងការីឱ្យម៉ត់ឈ្ងុយ។`,
          instructionEn: `Clean and prepare ${mainIngEn}, prep ${subIngEn}, and pound the aromatic red curry kroeung paste.`,
        },
        {
          stepNumber: 2,
          instructionKh: 'ដាក់ឆ្នាំងរំងាស់ក្បាលខ្ទិះដូងជាមួយគ្រឿងបុករហូតដល់បែកប្រេងក្រហមឈ្ងុយ។',
          instructionEn: 'Simmer thick first-press coconut cream with the red kroeung paste until fragrant and red oil separates.',
        },
        {
          stepNumber: 3,
          instructionKh: isFish
            ? `ចាក់ខ្ទិះចុងដាំឱ្យពុះ បង់បន្លែរម្ងាស់ឱ្យផុយល្មម សឹមដាក់ ${mainIngKh} ចូលថ្នមៗកុំឱ្យបែកសាច់ត្រី រួចភ្លក្សរសជាតិដោយទឹកត្រី ស្ករត្នោត និងអំបិល។`
            : `ដាក់ ${mainIngKh} ចូលកូរឱ្យចូលគ្រឿង រួចថែមខ្ទិះដូង និងបន្លែរម្ងាស់រហូតដល់ផុយចូលជាតិ ភ្លក្សរសជាតិដោយទឹកត្រី ស្ករត្នោត និងអំបិល។`,
          instructionEn: isFish
            ? `Add coconut milk and vegetables until tender, gently slide in ${mainIngEn} so the fish stays intact, and season with fish sauce, palm sugar, and salt.`
            : `Coat ${mainIngEn} in the curry base, pour in coconut milk and vegetables, simmer until tender, and season with fish sauce, palm sugar, and salt.`,
        },
        {
          stepNumber: 4,
          instructionKh: `បង់ ${herbKh} ចូលមុនលើកចុះ រួចដួស "${nameKh}" ទទួលទានក្តៅៗជាមួយបាយស ឬនំបញ្ចុក។`,
          instructionEn: `Add ${herbEn} right before serving "${nameEn}" warm with steamed jasmine rice or fresh rice noodles.`,
        },
      ];
    }

    // Stuffed bitter melon clear soup (food-108)
    if (nameKh.includes('ម្រះញាត់')) {
      return [
        {
          stepNumber: 1,
          instructionKh: `លាយ ${mainIngKh} ជាមួយខ្ទឹមស ម្រេចកំពត និងទឹកត្រីឱ្យចូលជាតិ រួចញាត់ចូលក្នុង ${subIngKh}។`,
          instructionEn: `Season ${mainIngEn} with garlic, Kampot pepper, and fish sauce, then stuff firmly into ${subIngEn}.`,
        },
        {
          stepNumber: 2,
          instructionKh: 'ដាំទឹកស៊ុបឆ្អឹងជ្រូកឱ្យពុះថ្លា បន្ថយភ្លើងល្មម រួចដាក់ដុំម្រះញាត់សាច់ចូលរម្ងាស់ថ្នមៗ។',
          instructionEn: 'Bring clear pork broth to a gentle boil, lower the heat, and carefully add the stuffed bitter melon rings.',
        },
        {
          stepNumber: 3,
          instructionKh: 'ដួសពពុះចេញឱ្យទឹកស៊ុបថ្លា រម្ងាស់ប្រហែល ២០ នាទីរហូតដល់ផុយម្រះ និងឆ្អិនស្នូលសាច់ រួចភ្លក្សរសជាតិដោយទឹកត្រី និងអំបិល។',
          instructionEn: 'Skim the broth clear, simmer 20 minutes until the melon is tender and filling cooked through, and season lightly.',
        },
        {
          stepNumber: 4,
          instructionKh: `រោយ ${herbKh} ពីលើ រួចដួសទទួលទានក្តៅៗ។`,
          instructionEn: `Garnish with ${herbEn} and serve piping hot.`,
        },
      ];
    }

    // Clear winter melon soup (food-116)
    if (nameKh.includes('ស្ងោរត្រឡាច')) {
      return [
        {
          stepNumber: 1,
          instructionKh: `លាយប្រឡាក់ ${mainIngKh} ជាមួយខ្ទឹមស ម្រេច និងទឹកត្រីបន្តិច រួចចិត ${subIngKh} ទុកឱ្យស្អាត។`,
          instructionEn: `Season ${mainIngEn} lightly with garlic, pepper, and fish sauce, and prepare ${subIngEn}.`,
        },
        {
          stepNumber: 2,
          instructionKh: 'ដាំទឹកស៊ុបជាមួយបង្គាក្រៀមឱ្យពុះឈ្ងុយ រួចមូលសាច់ជ្រូកចិញ្ច្រាំដាក់ចូល និងដួសពពុះចេញឱ្យទឹកថ្លាល្អ។',
          instructionEn: 'Boil broth with dried shrimp until fragrant, drop in the minced pork balls, and skim the broth clear.',
        },
        {
          stepNumber: 3,
          instructionKh: 'បង់ត្រឡាចចូលរម្ងាស់ភ្លើងល្មមរហូតដល់ត្រឡាចឆ្អិនថ្លាទន់ល្មម រួចភ្លក្សរសជាតិដោយទឹកត្រី អំបិល និងស្ករសបន្តិច។',
          instructionEn: 'Add winter melon wedges, simmer until translucent and tender, and season to a clean savory finish.',
        },
        {
          stepNumber: 4,
          instructionKh: `បង់ ${herbKh} ចូលមុនលើកចុះ រួចដួសទទួលទានក្តៅៗ។`,
          instructionEn: `Sprinkle with ${herbEn} right before serving hot.`,
        },
      ];
    }

    // Clear sour/herbal soups without prahok (food-105, food-111)
    if (nameKh.includes('ស្ងោរជ្រក់') || nameKh.includes('ស្ងោរមាន់')) {
      return [
        {
          stepNumber: 1,
          instructionKh: `លាងសម្អាត ${mainIngKh} ឱ្យស្អាត និងដំគល់ស្លឹកគ្រៃ រំដេង ហាន់គ្រឿងផ្សំ (${subIngKh}) ទុកឱ្យរួចរាល់។`,
          instructionEn: `Wash ${mainIngEn} thoroughly and bruise the lemongrass and galangal with ${subIngEn}.`,
        },
        {
          stepNumber: 2,
          instructionKh: `ដាំទឹកស៊ុបជាមួយគល់ស្លឹកគ្រៃ និងរំដេងឱ្យពុះឈ្ងុយ រួចដាក់ ${mainIngKh} ចូលរម្ងាស់រហូតដល់ឆ្អិនផុយល្មម និងដួសពពុះចេញឱ្យទឹកថ្លា។`,
          instructionEn: `Boil water with lemongrass and galangal, add ${mainIngEn}, and simmer until tender while skimming the broth clear.`,
        },
        {
          stepNumber: 3,
          instructionKh: 'បង់បន្លែ ឬផ្សិតចូលដាំឱ្យឆ្អិន រួចផ្សំរសជាតិដោយទឹកត្រី អំបិល និងស្ករបន្តិច។',
          instructionEn: 'Add mushrooms or aromatics until just tender and season with fish sauce, salt, and a pinch of sugar.',
        },
        {
          stepNumber: 4,
          instructionKh: `បិទភ្លើង ច្របាច់ទឹកក្រូចឆ្មារស្រស់ និងបង់ ${herbKh} ចូលដើម្បីឱ្យទឹកស៊ុបជូរស្រស់ឈ្ងុយឆ្ងាញ់។`,
          instructionEn: `Turn off heat, stir in fresh lime juice and ${herbEn}, and serve immediately.`,
        },
      ];
    }

    // Samlor Korko Tnot (food-107)
    if (nameKh.includes('កកូរ')) {
      return [
        {
          stepNumber: 1,
          instructionKh: `ហាន់ ${mainIngKh} ឱ្យស្អាត រៀបចំ ${subIngKh} និងបេះបន្លែ (${herbKh}) លាងទឹកទុកឱ្យស្រស់។`,
          instructionEn: `Slice ${mainIngEn}, prepare ${subIngEn}, and wash ${herbEn}.`,
        },
        {
          stepNumber: 2,
          instructionKh: 'ដាក់ឆ្នាំងឆាគ្រឿងបុក និងប្រហុកសាច់ជាមួយសាច់ជ្រូកបីជាន់ឱ្យឈ្ងុយ និងចូលជាតិល្អ។',
          instructionEn: 'Sauté kroeung paste and prahok with the pork belly in a pot until deeply fragrant.',
        },
        {
          stepNumber: 3,
          instructionKh: 'ចាក់ទឹកសាច់ត្នោតទុំ និងទឹកធម្មតាចូល រម្ងាស់ឱ្យផុយសាច់ រួចបង់ត្រីឆ្អើរ និងអង្ករលីងកូរឱ្យទឹកសម្លខាប់ឈ្ងុយ។',
          instructionEn: 'Pour in the ripe palm fruit pulp and water, simmer until tender, and stir in smoked fish and toasted rice powder.',
        },
        {
          stepNumber: 4,
          instructionKh: `បង់ ${herbKh} ចូលដាំឱ្យឆ្អិនបៃតងស្រស់ ភ្លក្សរសជាតិដោយទឹកត្រី និងអំបិល រួចលើកចុះទទួលទាន។`,
          instructionEn: `Fold in ${herbEn} until bright green and tender, adjust seasoning, and serve warm.`,
        },
      ];
    }

    // Samlor Praher (food-102, food-110, food-114)
    if (nameKh.includes('ប្រហើរ')) {
      return [
        {
          stepNumber: 1,
          instructionKh: `លាងសម្អាត ${mainIngKh} និងហាន់បន្លែ (${subIngKh}) ព្រមទាំងបុកគល់ស្លឹកគ្រៃខ្ជាយទុកឱ្យឈ្ងុយ។`,
          instructionEn: `Clean ${mainIngEn}, cut ${subIngEn}, and pound lemongrass with fingerroot.`,
        },
        {
          stepNumber: 2,
          instructionKh: 'ដាំទឹកក្នុងឆ្នាំងឱ្យពុះ បង់គ្រឿងស្លឹកគ្រៃដំ និងជ្រុំប្រហុកសាច់បន្តិចឱ្យទឹកសម្លមានក្លិនប្រហើរឈ្ងុយ។',
          instructionEn: 'Bring water to a boil with bruised lemongrass herbs and dissolve a touch of prahok into the herbal broth.',
        },
        {
          stepNumber: 3,
          instructionKh: `ដាក់ ${mainIngKh} និងបន្លែ (${subIngKh}) តាមលំដាប់ឆ្អិនមុនក្រោយ រួចភ្លក្សរសជាតិដោយទឹកត្រី អំបិល និងស្ករត្នោតបន្តិច។`,
          instructionEn: `Add ${mainIngEn} and ${subIngEn} in order of cooking time, then season delicately with fish sauce and salt.`,
        },
        {
          stepNumber: 4,
          instructionKh: `បង់ស្លឹកជីរ និងបន្លែស្លឹក (${herbKh}) ចូលមុនបិទភ្លើង រួចដួសទទួលទានក្តៅៗ។`,
          instructionEn: `Stir in ${herbEn} just before turning off the heat and serve hot.`,
        },
      ];
    }

    // Sour soups / Machu Kroeung / Forest soups (food-101, 103, 106, 109, 112, 115)
    return [
      {
        stepNumber: 1,
        instructionKh: `លាងសម្អាត ${mainIngKh} ឱ្យស្អាត រួចរៀបចំគ្រឿងម្ជូរ និងបន្លែ (${subIngKh}) ទុកឱ្យរួចរាល់។`,
        instructionEn: `Wash and cut ${mainIngEn}, and prepare the souring ingredients and ${subIngEn}.`,
      },
      {
        stepNumber: 2,
        instructionKh: nameKh.includes('គ្រឿង')
          ? `ដាក់ឆ្នាំងឆាគ្រឿងបុក និងប្រហុកបន្តិចឱ្យឈ្ងុយ រួចដាក់ ${mainIngKh} ចូលកូរឱ្យចូលជាតិ សឹមចាក់ទឹកដាំឱ្យពុះ។`
          : `ដាំទឹកស៊ុបជាមួយគល់ស្លឹកគ្រៃដំ និងប្រហុកបន្តិចឱ្យពុះឈ្ងុយ រួចដាក់ ${mainIngKh} ចូលស្ងោររហូតដល់ឆ្អិនល្អ។`,
        instructionEn: nameKh.includes('គ្រឿង')
          ? `Sauté the yellow kroeung paste and a touch of prahok until fragrant, toss in ${mainIngEn}, then add water and bring to a boil.`
          : `Boil broth with bruised lemongrass and a hint of prahok, then add ${mainIngEn} and cook until tender.`,
      },
      {
        stepNumber: 3,
        instructionKh: `បង់ ${subIngKh} ចូល រួចផ្សំរសជាតិជូរប្រៃផ្អែមល្មមដោយទឹកត្រី ស្ករត្នោត និងអំបិល។`,
        instructionEn: `Add ${subIngEn} and balance the tangy-savory broth with fish sauce, palm sugar, and salt.`,
      },
      {
        stepNumber: 4,
        instructionKh: `បង់ ${herbKh} ចូលមុនលើកចុះ ដើម្បីឱ្យ "${nameKh}" មានក្លិនក្រអូបឈ្ងុយឆ្ងាញ់។`,
        instructionEn: `Fold in ${herbEn} right before serving "${nameEn}" piping hot with steamed rice.`,
      },
    ];
  }

  // ================= GRILLED & ROASTED (food-117 .. food-130) =================
  if (cat === 'grilled') {
    // Salt-crusted grilled fish (food-117)
    if (nameKh.includes('ដុតអំបិល')) {
      return [
        {
          stepNumber: 1,
          instructionKh: `លាងសម្អាត ${mainIngKh} (ទុកស្រកាឱ្យការពារសាច់ត្រី) រួចញាត់គល់ស្លឹកគ្រៃ និងស្លឹកក្រូចសើចចូលក្នុងពោះត្រី។`,
          instructionEn: `Clean ${mainIngEn} leaving scales on to protect the flesh, and stuff the cavity with lemongrass and kaffir lime leaves.`,
        },
        {
          stepNumber: 2,
          instructionKh: `យក ${subIngKh} មកបិទស្រោបជុំវិញខ្លួនត្រីឱ្យជិតស្មើល្អ។`,
          instructionEn: `Coat the exterior evenly with ${subIngEn} to lock in natural moisture.`,
        },
        {
          stepNumber: 3,
          instructionKh: 'ដាក់អាំងលើរងើកភ្លើងធ្យូងក្តៅល្មម ប្រែសងខាងរហូតដល់សំបកអំបិលក្រៀម និងសាច់ត្រីខាងក្នុងឆ្អិនផ្អែមឈ្ងុយ។',
          instructionEn: 'Grill over steady charcoal embers, turning carefully until the salt crust hardens and the fish inside is juicy and flaky.',
        },
        {
          stepNumber: 4,
          instructionKh: `បកសំបកអំបិលចេញ រៀបដាក់ចានទទួលទានក្តៅៗជាមួយ ${herbKh}។`,
          instructionEn: `Crack open the salt crust and serve hot alongside ${herbEn}.`,
        },
      ];
    }

    // Stuffed grilled frog - Kangkaeb Baok (food-119)
    if (nameKh.includes('កង្កែបបោក')) {
      return [
        {
          stepNumber: 1,
          instructionKh: `លាងសម្អាតកង្កែបឱ្យស្អាត រួចចិញ្ច្រាំសាច់ជ្រូកលាយជាមួយ ${subIngKh} និងស្លឹកក្រូចសើចហាន់សរសៃឱ្យចូលជាតិ។`,
          instructionEn: `Clean the frogs thoroughly and mix minced pork with ${subIngEn} and finely shredded kaffir lime leaves.`,
        },
        {
          stepNumber: 2,
          instructionKh: 'ញាត់គ្រឿងសាច់ចូលក្នុងខ្លួនកង្កែបឱ្យពេញណែនល្អ រួចគៀបនឹងចង្កាក់ឫស្សី។',
          instructionEn: 'Stuff the aromatic kroeung pork filling generously into the frogs and secure in split bamboo clamps.',
        },
        {
          stepNumber: 3,
          instructionKh: 'ដាក់អាំងលើភ្លើងធ្យូងរងើកតិចៗ ប្រែសងខាងរហូតដល់ឆ្អិនក្រហមមាស និងសាយក្លិនគ្រឿងឈ្ងុយ។',
          instructionEn: 'Grill slowly over gentle charcoal embers, turning often until golden brown and cooked all the way through.',
        },
        {
          stepNumber: 4,
          instructionKh: `រៀបដាក់ចាន រោយ ${herbKh} និងទទួលទានក្តៅៗ។`,
          instructionEn: `Plate hot and garnish with ${herbEn}.`,
        },
      ];
    }

    // Grilled mussels with scallion oil (food-125)
    if (nameKh.includes('គ្រំសមុទ្រអាំង')) {
      return [
        {
          stepNumber: 1,
          instructionKh: `លាងសម្អាត ${mainIngKh} ឱ្យស្អាត និងលាយខ្លាញ់ស្លឹកខ្ទឹមជាមួយអំបិលបន្តិចទុកស្រោចពីលើ។`,
          instructionEn: `Scrub and half-shell ${mainIngEn}, and warm chopped green scallions in oil with a pinch of salt.`,
        },
        {
          stepNumber: 2,
          instructionKh: 'តម្រៀបគ្រំលើចង្អើរភ្លើងធ្យូងក្តៅល្មម អាំងរហូតដល់សាច់គ្រំពុះឆ្អិនទន់ល្មម។',
          instructionEn: 'Arrange the half-shell mussels over glowing charcoal until bubbling and just tender.',
        },
        {
          stepNumber: 3,
          instructionKh: `ដួស ${subIngKh} ដាក់ពីលើសាច់គ្រំនីមួយៗឱ្យឈ្ងុយឆ្ងាញ់។`,
          instructionEn: `Spoon ${subIngEn} generously over each sizzling mussel.`,
        },
        {
          stepNumber: 4,
          instructionKh: `លើកដាក់ចានភ្លាមៗ ទទួលទានក្តៅៗផ្ទាប់ជាមួយ ${herbKh}។`,
          instructionEn: `Serve sizzling hot with ${herbEn}.`,
        },
      ];
    }

    // Grilled vegetables with prahok dip (food-130)
    if (nameKh.includes('ត្រប់វែងអាំង')) {
      return [
        {
          stepNumber: 1,
          instructionKh: `លាងសម្អាត ${mainIngKh} ឱ្យស្អាត ទុកទាំងមូលដើម្បីកុំឱ្យស្ងួតពេលអាំង។`,
          instructionEn: `Wash ${mainIngEn} cleanly, keeping them whole to retain natural sweetness on the grill.`,
        },
        {
          stepNumber: 2,
          instructionKh: 'ដាក់អាំងលើភ្លើងធ្យូងរហូតដល់ត្រប់វែងទន់ឈ្ងុយ (បកសំបកខ្លោចចេញ) និងពោតបារាំងឆ្អិនបៃតងល្មម។',
          instructionEn: 'Charcoal-grill until the eggplants are smoky-soft (peel charred skin) and okra pods are tender-crisp.',
        },
        {
          stepNumber: 3,
          instructionKh: `រៀបចំចំហុយ និងលាយ ${subIngKh} ជាមួយទឹកក្រូចឆ្មារ ស្ករត្នោត និងម្ទេសឱ្យត្រូវមាត់។`,
          instructionEn: `Prepare ${subIngEn} balanced with fresh lime juice, palm sugar, and chilies.`,
        },
        {
          stepNumber: 4,
          instructionKh: `ស្រោច ${herbKh} លើបន្លែអាំង រួចទទួលទានជ្រលក់ទឹកប្រហុកក្តៅៗ។`,
          instructionEn: `Drizzle ${herbEn} over the grilled vegetables and serve with the savory prahok dip.`,
        },
      ];
    }

    // Grilled sun-dried fish (food-127)
    if (nameKh.includes('ត្រីងៀតអាំង')) {
      return [
        {
          stepNumber: 1,
          instructionKh: `លាងទឹកក្តៅឧណ្ហៗលើ ${mainIngKh} បន្តិច រួចជូតឱ្យស្ងួតដើម្បីឱ្យសាច់ត្រីទន់ឈ្ងុយមិនប្រៃពេក។`,
          instructionEn: `Briefly rinse ${mainIngEn} and pat dry so the salted flesh grills up tender and balanced.`,
        },
        {
          stepNumber: 2,
          instructionKh: 'អាំងលើរងើកភ្លើងធ្យូងតិចៗ ប្រែសងខាងរហូតដល់សាច់ត្រីងៀតឡើងពណ៌មាសក្រហមឈ្ងុយ។',
          instructionEn: 'Grill over medium-low charcoal embers, turning frequently until golden, smoky, and fragrant.',
        },
        {
          stepNumber: 3,
          instructionKh: `លាយ ${subIngKh} ឱ្យចេញរសជាតិជូរផ្អែមហឹរត្រូវគ្នាជាមួយត្រីងៀត។`,
          instructionEn: `Mix ${subIngEn} into a glossy sweet-tangy dipping sauce.`,
        },
        {
          stepNumber: 4,
          instructionKh: `ដំ ឬហាន់ត្រីងៀតជាដុំល្មម រៀបដាក់ចានញ៉ាំផ្ទាប់ជាមួយ ${herbKh} និងទឹកអម្ពិលទុំ។`,
          instructionEn: `Flake or slice the grilled dried fish and serve with ${herbEn} and tamarind dip.`,
        },
      ];
    }

    // Grilled meats/seafood served WITH a dipping sauce (food-120, 121, 122, 124)
    if (
      subIngKh.includes('ទឹកប្រហុក') ||
      subIngKh.includes('ទឹកត្រី') ||
      subIngKh.includes('អំបិលម្ទេសក្រូចឆ្មារ')
    ) {
      return [
        {
          stepNumber: 1,
          instructionKh: `លាងសម្អាត ${mainIngKh} ឱ្យស្អាត សម្រស់ទឹក រួចប្រឡាក់អំបិល ម្រេច ឬប្រេងខ្ទឹមសបន្តិចទុក ១០ នាទី។`,
          instructionEn: `Clean and pat dry ${mainIngEn}, then season lightly with salt, pepper, or garlic oil for 10 minutes.`,
        },
        {
          stepNumber: 2,
          instructionKh: 'បង្កាត់ភ្លើងធ្យូងឱ្យរងើកល្មម ដាក់អាំងប្រែសងខាងរហូតដល់ឆ្អិនក្រហមឈ្ងុយ និងនៅរក្សាជាតិផ្អែមក្នុងសាច់។',
          instructionEn: 'Grill over glowing charcoal embers, turning evenly until smoky, golden, and juicy inside.',
        },
        {
          stepNumber: 3,
          instructionKh: `រៀបចំលាយទឹកជ្រលក់ (${subIngKh}) ឱ្យមានរសជាតិជូរប្រៃផ្អែមហឹរមុតឆ្ងាញ់។`,
          instructionEn: `Prepare the dipping sauce (${subIngEn}) balanced to a bright, savory-tangy finish.`,
        },
        {
          stepNumber: 4,
          instructionKh: `ហាន់ ឬរៀបដាក់ចាន ញ៉ាំផ្ទាប់ជាមួយ ${herbKh} និងទឹកជ្រលក់រសជាតិដើម។`,
          instructionEn: `Slice or arrange on a platter and serve hot with ${herbEn} and the dipping sauce.`,
        },
      ];
    }

    // Marinated grilled/roasted meats (food-118, 123, 126, 128, 129)
    return [
      {
        stepNumber: 1,
        instructionKh: `លាងសម្អាត ${mainIngKh} ជូតឱ្យស្ងួត រួចប្រឡាក់ជាមួយ ${subIngKh} ទុក ៣០ នាទីឱ្យចូលជាតិសព្វល្អ។`,
        instructionEn: `Clean and pat dry ${mainIngEn}, then marinate thoroughly with ${subIngEn} for 30 minutes.`,
      },
      {
        stepNumber: 2,
        instructionKh: 'បង្កាត់ភ្លើងធ្យូង ឬឡដុតកម្តៅល្មម ដាក់អាំងប្រែសងខាងដោយឧស្សាហ៍លាបទឹកគ្រឿងប្រឡាក់ពីលើ។',
        instructionEn: 'Roast over steady charcoal embers, turning evenly while basting with the aromatic marinade.',
      },
      {
        stepNumber: 3,
        instructionKh: 'បន្តអាំងរហូតដល់ស្បែកខាងក្រៅក្រហមស្រួយឈ្ងុយ និងសាច់ខាងក្នុងឆ្អិនផុយមានជាតិ។',
        instructionEn: 'Continue roasting until the exterior is caramelized and crisp while the meat inside stays tender and juicy.',
      },
      {
        stepNumber: 4,
        instructionKh: `កាប់ ឬហាន់រៀបដាក់ចាន ញ៉ាំផ្ទាប់ជាមួយ ${herbKh}។`,
        instructionEn: `Carve onto a serving platter and enjoy hot alongside ${herbEn}.`,
      },
    ];
  }

  // ================= STIR-FRY & BRAISED (food-131 .. food-146) =================
  if (cat === 'stirfry') {
    // Braised Khor Prahok Fish (food-146)
    if (id === 'food-146') {
      return [
        {
          stepNumber: 1,
          instructionKh: `លាងសម្អាត ${mainIngKh} ឱ្យស្អាត និងចិញ្ច្រាំប្រហុកសាច់ គល់ស្លឹកគ្រៃ ខ្ទឹមស ទុកឱ្យរួចរាល់។`,
          instructionEn: `Clean ${mainIngEn} and finely mince the prahok paste, lemongrass, and garlic.`,
        },
        {
          stepNumber: 2,
          instructionKh: 'ដាក់ឆ្នាំងឆាសាច់ជ្រូកបីជាន់ចិញ្ច្រាំជាមួយប្រហុក ខ្ទឹមស និងស្ករត្នោតឱ្យឡើងពណ៌ក្រហមឈ្ងុយ។',
          instructionEn: 'Sauté minced pork belly with prahok, garlic, and palm sugar until fragrant and lightly caramelized.',
        },
        {
          stepNumber: 3,
          instructionKh: 'តម្រៀបសាច់ត្រីពោធិ៍ចូល ចាក់ខ្ទិះដូង ឬទឹកដូងស្រស់ល្មមលិច រម្ងាស់ភ្លើងតិចៗរហូតដល់ទឹកខខាប់ចូលជាតិសាច់ត្រី។',
          instructionEn: 'Arrange the Mekong fish steaks in the pot, pour in coconut milk or coconut water, and braise gently until rich and thick.',
        },
        {
          stepNumber: 4,
          instructionKh: `រោយ ${herbKh} ពីលើ រួចដួសទទួលទានក្តៅៗជាមួយបាយស និងអន្លក់ស្រស់។`,
          instructionEn: `Top with ${herbEn} and serve bubbling hot with steamed rice and fresh crudités.`,
        },
      ];
    }

    // Braised Pork Trotters & Eggs Khor (food-140)
    if (nameKh.startsWith('ខ')) {
      return [
        {
          stepNumber: 1,
          instructionKh: `លាងសម្អាតជើងជ្រូក ស្រុសទឹកក្តៅបំបាត់ក្លិន និងបកសំបកពងទាស្ងោរ (${mainIngKh}) ទុកឱ្យស្អាត។`,
          instructionEn: `Blanch the pork trotters clean and peel the hard-boiled duck eggs (${mainIngEn}).`,
        },
        {
          stepNumber: 2,
          instructionKh: 'កូរស្ករត្នោតក្នុងឆ្នាំងឱ្យឡើងពណ៌ក្រហមត្នោតឈ្ងុយ បង់ខ្ទឹមស និងផ្កាចាន់ រួចដាក់ជើងជ្រូកកូរឱ្យជាប់ពណ៌ស្អាត។',
          instructionEn: 'Caramelize palm sugar to an amber glow with garlic and star anise, then toss the pork trotters to coat evenly.',
        },
        {
          stepNumber: 3,
          instructionKh: 'ចាក់ទឹកដូងស្រស់ និងទឹកត្រីចូល ដាក់ពងទាស្ងោរ រួចរម្ងាស់ភ្លើងតិចៗប្រហែល ៥០-៦០ នាទីរហូតដល់ជើងជ្រូកផុយទន់ល្មម។',
          instructionEn: 'Pour in fresh coconut water and fish sauce, add the duck eggs, and simmer gently for 50-60 minutes until fork-tender.',
        },
        {
          stepNumber: 4,
          instructionKh: `ភ្លក្សរសជាតិប្រៃផ្អែមល្មម រោយម្រេច និងស្លឹកខ្ទឹម រួចដួសទទួលទានក្តៅៗជាមួយបាយស។`,
          instructionEn: `Check the sweet-savory glaze, garnish with black pepper and scallions, and serve with jasmine rice.`,
        },
      ];
    }

    // Sweet & sour crispy fried fish (food-142)
    if (nameKh.includes('ឆាជូរផ្អែម') && mainIngKh.includes('បំពង')) {
      return [
        {
          stepNumber: 1,
          instructionKh: `ហាន់សាច់ត្រីរ៉ស់ប្រឡាក់អំបិលម្រេចបន្តិច បំពងឱ្យស្រួយពណ៌មាស (${mainIngKh}) រួចហាន់ ${subIngKh} ទុកឱ្យស្អាត។`,
          instructionEn: `Fry the seasoned snakehead fillets until golden and crisp (${mainIngEn}), and cut ${subIngEn}.`,
        },
        {
          stepNumber: 2,
          instructionKh: 'ដាក់ខ្ទះឆាខ្ទឹមសជាមួយប៉េងប៉ោះ ម្នាស់ ម្ទេសផ្លោក និងត្រសក់ ផ្សំរសជាតិជូរផ្អែមដោយទឹកត្រី ស្ករត្នោត និងទឹកប៉េងប៉ោះ។',
          instructionEn: 'Stir-fry garlic with pineapple, tomatoes, cucumber, and bell peppers in a glossy sweet-and-sour sauce.',
        },
        {
          stepNumber: 3,
          instructionKh: 'ដាក់សាច់ត្រីបំពងស្រួយចូលត្រឡប់ថ្នមៗឱ្យស្រោបទឹកឆាជូរផ្អែមសព្វល្អ។',
          instructionEn: 'Gently fold the crispy fish fillets into the sauce just long enough to coat without losing crunch.',
        },
        {
          stepNumber: 4,
          instructionKh: `បង់ ${herbKh} ពីលើ រួចលើកដាក់ចានទទួលទានក្តៅៗភ្លាមៗ។`,
          instructionEn: `Toss with ${herbEn} and serve immediately while crisp.`,
        },
      ];
    }

    // Pure vegetable / mushroom stir-fries (food-134, 139, 141)
    if (id === 'food-134' || id === 'food-139' || id === 'food-141') {
      return [
        {
          stepNumber: 1,
          instructionKh: `លាងសម្អាត និងហាន់ ${mainIngKh} ព្រមទាំងរៀបចំគ្រឿងផ្សំ (${subIngKh}) សម្រស់ទឹកឱ្យស្អាត។`,
          instructionEn: `Wash, trim, and slice ${mainIngEn} and prepare ${subIngEn}.`,
        },
        {
          stepNumber: 2,
          instructionKh: 'ដាក់ខ្ទះឱ្យក្តៅខ្លាំង ចាក់ប្រេងបំពងខ្ទឹមសឱ្យឡើងឈ្ងុយ រួចដាក់បន្លែ ឬផ្សិតចូលឆាត្រឡប់ឱ្យរហ័ស។',
          instructionEn: 'Heat a wok over high flame, sauté garlic until golden and fragrant, then toss in the vegetables or mushrooms.',
        },
        {
          stepNumber: 3,
          instructionKh: `បន្ថែម ${subIngKh} ទឹកត្រី ឬទឹកស៊ីអ៊ីវ និងស្ករបន្តិច ឆាឱ្យចូលជាតិដោយរក្សាពណ៌បៃតងស្រួយឆ្ងាញ់។`,
          instructionEn: `Season with ${subIngEn} and a touch of sugar, tossing briskly so everything stays vibrant and tender-crisp.`,
        },
        {
          stepNumber: 4,
          instructionKh: `បង់ ${herbKh} ពីលើ រួចដួសដាក់ចានទទួលទានក្តៅៗ។`,
          instructionEn: `Finish with ${herbEn} and transfer immediately to a warm plate.`,
        },
      ];
    }

    // Meat / Seafood / Kroeung / Ginger stir-fries (food-131, 132, 133, 135, 136, 137, 138, 143, 144, 145)
    return [
      {
        stepNumber: 1,
        instructionKh: `លាងសម្អាត និងហាន់ ${mainIngKh} ព្រមទាំងត្រៀម ${subIngKh} និង ${herbKh} ទុកឱ្យរួចរាល់។`,
        instructionEn: `Clean and slice ${mainIngEn}, and prepare ${subIngEn} along with ${herbEn}.`,
      },
      {
        stepNumber: 2,
        instructionKh: `ដាក់ខ្ទះឱ្យក្តៅ ចាក់ប្រេងឆាខ្ទឹមស ឬគ្រឿងឱ្យឈ្ងុយ រួចដាក់ ${mainIngKh} ចូលឆាដោយភ្លើងខ្លាំងឱ្យឆ្អិនល្មម។`,
        instructionEn: `Heat oil in a wok over high flame, sauté the garlic or kroeung aromatics, then stir-fry ${mainIngEn} until seared.`,
      },
      {
        stepNumber: 3,
        instructionKh: `ដាក់ ${subIngKh} ចូលឆាត្រឡប់ជាមួយគ្នា ផ្សំរសជាតិដោយទឹកត្រី ប្រេងខ្យង និងស្ករត្នោតឱ្យចូលជាតិឈ្ងុយ។`,
        instructionEn: `Add ${subIngEn}, toss over high heat, and season with fish sauce, oyster sauce, and palm sugar.`,
      },
      {
        stepNumber: 4,
        instructionKh: `បង់ ${herbKh} ចូលត្រឡប់ពីរបីត្រឡប់ រួចលើកដាក់ចានទទួលទានក្តៅៗ។`,
        instructionEn: `Fold in ${herbEn} off the heat and serve immediately with steamed rice.`,
      },
    ];
  }

  // ================= SALADS & DIPS (food-147 .. food-156) =================
  if (cat === 'salad') {
    // Teuk Kroeung (food-154)
    if (nameKh.includes('ទឹកគ្រឿង')) {
      return [
        {
          stepNumber: 1,
          instructionKh: 'ស្ងោរសាច់ត្រីរ៉ស់ឱ្យឆ្អិន បេះយកតែសាច់សុទ្ធបុកឱ្យម៉ត់ផុស និងដាំទឹកប្រហុកត្រងយកទឹកថ្លាឆ្អិនល្អ។',
          instructionEn: 'Poach fresh snakehead fish, flake off bones, pound fluffy in a mortar, and simmer strained prahok broth.',
        },
        {
          stepNumber: 2,
          instructionKh: 'បុកខ្ទឹមស និងម្ទេស បន្ថែមសាច់ត្រីបុក ចាក់ទឹកប្រហុកឆ្អិន និងទឹកក្រូចឆ្មារ កូរឱ្យឡើងខាប់រលោងជូរប្រៃផ្អែមល្មម។',
          instructionEn: 'Pound garlic and chilies, blend in the flaked fish, simmered prahok broth, and fresh lime juice until creamy and tangy.',
        },
        {
          stepNumber: 3,
          instructionKh: 'លាងសម្អាតបន្លែអន្លក់ស្រស់គ្រប់មុខ ត្រាំទឹកត្រជាក់ឱ្យស្រួយ រួចរៀបដាក់ថាស។',
          instructionEn: 'Wash assorted fresh garden crudités, chill until crisp, and arrange on a platter.',
        },
        {
          stepNumber: 4,
          instructionKh: `ដួសទឹកគ្រឿងដាក់ចានគោម រោយសណ្តែកដីបុកពីលើ រួចទទួលទានផ្ទាប់ជាមួយ ${herbKh}។`,
          instructionEn: `Spoon Teuk Kroeung into a serving bowl, top with crushed roasted peanuts, and enjoy with ${herbEn}.`,
        },
      ];
    }

    // Prahok Ktis (food-155)
    if (nameKh.includes('ប្រហុកខ្ទិះ')) {
      return [
        {
          stepNumber: 1,
          instructionKh: `ចិញ្ច្រាំ ${mainIngKh} ជាមួយគ្នាឱ្យម៉ត់ល្អ និងរៀបចំគ្រឿងបុក ព្រមទាំងត្រប់ពុតលំញងឱ្យស្អាត។`,
          instructionEn: `Mince ${mainIngEn} finely together and prepare the yellow kroeung paste and pea eggplants.`,
        },
        {
          stepNumber: 2,
          instructionKh: 'ដាក់ខ្ទះរំងាស់ក្បាលខ្ទិះដូងជាមួយគ្រឿងបុកឱ្យបែកប្រេងក្រហមឈ្ងុយ រួចដាក់សាច់ជ្រូក និងប្រហុកចិញ្ច្រាំចូលឆាឱ្យឆ្អិន។',
          instructionEn: 'Simmer thick coconut cream with yellow kroeung until oil separates, then stir-fry the minced pork and prahok.',
        },
        {
          stepNumber: 3,
          instructionKh: 'បង់ត្រប់ពុតលំញង និងស្ករត្នោត រម្ងាស់រហូតដល់ទឹកប្រហុកខ្ទិះឡើងខាប់ឈ្ងុយល្មម។',
          instructionEn: 'Add pea eggplants and palm sugar, simmering gently until thick, creamy, and aromatic.',
        },
        {
          stepNumber: 4,
          instructionKh: `រោយស្លឹកក្រូចសើចហាន់សរសៃ រួចដួសទទួលទានក្តៅៗផ្ទាប់ជាមួយបន្លែស្រស់ (${herbKh})។`,
          instructionEn: `Garnish with shredded kaffir lime leaves and serve warm with assorted fresh vegetables (${herbEn}).`,
        },
      ];
    }

    // Bok Lahong (food-156)
    if (nameKh.includes('បុកល្ហុង')) {
      return [
        {
          stepNumber: 1,
          instructionKh: 'ចិតសំបកល្ហុងខ្ចី ឈូសជាសរសៃត្រាំទឹកកកឱ្យស្រួយ និងលាងក្តាមប្រៃ បង្គាក្រៀម សណ្តែកគួរឱ្យស្អាត។',
          instructionEn: 'Shred peeled green papaya into crisp strands, chill briefly, and clean the salted crab, dried shrimp, and long beans.',
        },
        {
          stepNumber: 2,
          instructionKh: 'បុកខ្ទឹមស ម្ទេសខ្មាំង និងបង្គាក្រៀមក្នុងត្បាល់ បន្ថែមសណ្តែកគួរ ប៉េងប៉ោះ ស្ករត្នោត ទឹកត្រី និងទឹកក្រូចឆ្មារ។',
          instructionEn: 'Bruise garlic, chilies, and dried shrimp in a mortar, then lightly pound in long beans, tomatoes, palm sugar, fish sauce, and lime.',
        },
        {
          stepNumber: 3,
          instructionKh: 'ដាក់ក្តាមប្រៃ និងសរសៃល្ហុងចូល បុកច្របល់ថ្នមៗឱ្យចូលជាតិជូរប្រៃផ្អែមហឹរសព្វល្អ។',
          instructionEn: 'Add salted field crab and green papaya strands, pounding and tossing gently so every strand absorbs the dressing.',
        },
        {
          stepNumber: 4,
          instructionKh: `ដួសដាក់ចាន រោយ ${herbKh} ពីលើ រួចទទួលទានភ្លាមៗ។`,
          instructionEn: `Plate immediately and top generously with ${herbEn}.`,
        },
      ];
    }

    // Pleah & Nhoam Salads (food-147 .. food-153)
    return [
      {
        stepNumber: 1,
        instructionKh: `រៀបចំ ${mainIngKh} ឱ្យស្អាត ហើយហាន់បន្លែ (${subIngKh}) ត្រាំទឹកត្រជាក់ឱ្យស្រួយល្អ។`,
        instructionEn: `Prepare ${mainIngEn} cleanly and slice the crisp vegetables (${subIngEn}).`,
      },
      {
        stepNumber: 2,
        instructionKh: 'លាយទឹកញាំដោយប្រើទឹកក្រូចឆ្មារស្រស់ ទឹកត្រី ស្ករត្នោត ខ្ទឹមស និងម្ទេសហាន់ កូរឱ្យរលាយចូលគ្នាជូរប្រៃផ្អែមល្មម។',
        instructionEn: 'Whisk fresh lime juice, fish sauce, palm sugar, garlic, and chilies into a bright, balanced dressing.',
      },
      {
        stepNumber: 3,
        instructionKh: `ដាក់ ${mainIngKh} និងបន្លែចូលចានធំ ស្រោចទឹកញាំពីលើ រួចច្របល់ថ្នមៗឱ្យចូលជាតិសព្វ។`,
        instructionEn: `Combine ${mainIngEn} and vegetables in a mixing bowl, pour over the dressing, and toss gently.`,
      },
      {
        stepNumber: 4,
        instructionKh: `រៀបដាក់ចាន រោយ ${herbKh} ពីលើឱ្យឈ្ងុយឆ្ងាញ់ រួចទទួលទានភ្លាមៗ។`,
        instructionEn: `Transfer to a serving platter, top with ${herbEn}, and serve fresh.`,
      },
    ];
  }

  // ================= NOODLES & KHOR KO (food-157 .. food-166) =================
  if (cat === 'noodles') {
    // Khor Ko & Baguette (food-165)
    if (id === 'food-165') {
      return [
        {
          stepNumber: 1,
          instructionKh: 'ហាន់សាច់គោជាប់សរសៃជាដុំល្មម ប្រឡាក់ជាមួយគ្រឿងខគោ ខ្ទឹមស ស្ករត្នោត និងទឹកត្រីទុក ២០ នាទី។',
          instructionEn: 'Cut beef brisket and tendon into chunks and marinate with Khor Ko spice paste, garlic, palm sugar, and fish sauce for 20 minutes.',
        },
        {
          stepNumber: 2,
          instructionKh: 'ដាក់ឆ្នាំងឆាគល់ស្លឹកគ្រៃ ផ្កាចាន់ និងសាច់គោប្រឡាក់ឱ្យឈ្ងុយ រួចចាក់ទឹកស៊ុបរម្ងាស់ភ្លើងតិចៗរហូតដល់សាច់គោជិតផុយ។',
          instructionEn: 'Sear the marinated beef with lemongrass and star anise, then add broth and simmer gently until nearly tender.',
        },
        {
          stepNumber: 3,
          instructionKh: 'បង់ការ៉ុត និងខ្ទឹមបារាំងចូល រម្ងាស់បន្តរហូតដល់ផុយសាច់ និងទឹកខគោឡើងក្រហមខាប់ឈ្ងុយ ហើយអាំងនំប៉័ងឱ្យស្រួយ។',
          instructionEn: 'Add carrots and onions, simmer until the beef is melt-in-the-mouth tender in a rich red broth, and toast the baguette crisp.',
        },
        {
          stepNumber: 4,
          instructionKh: `ដួសខគោដាក់ចានគោម រោយ ${herbKh} រួចទទួលទានក្តៅៗផ្ទាប់ជាមួយនំប៉័ងអាំងស្រួយ។`,
          instructionEn: `Ladle the spiced beef stew into bowls, garnish with ${herbEn}, and serve hot with crispy toasted baguette.`,
        },
      ];
    }

    // Num Banh Chok Teuk Trey Phaem (food-163)
    if (nameKh.includes('ទឹកត្រីផ្អែម')) {
      return [
        {
          stepNumber: 1,
          instructionKh: `រៀបចំសរសៃនំបញ្ចុកស្រស់ និងបេះសាច់ត្រីអណ្តែងអាំង ឬហាន់សាច់ជ្រូកខ្វៃ (${mainIngKh}) ព្រមទាំងលាងបន្លែស្រស់ (${herbKh})។`,
          instructionEn: `Prepare fresh rice vermicelli and flaked grilled catfish or roasted pork (${mainIngEn}), and wash crisp greens (${herbEn}).`,
        },
        {
          stepNumber: 2,
          instructionKh: 'លាយទឹកត្រីផ្អែមដោយប្រើទឹកត្រី ស្ករត្នោត ទឹកក្រូចឆ្មារ ទឹកឆ្អិន ខ្ទឹមសម្ទេសបុក និងសណ្តែកដីលីងបុកឱ្យជូរផ្អែមឈ្ងុយ។',
          instructionEn: 'Whisk fish sauce, palm sugar, fresh lime juice, warm water, pounded garlic-chili, and crushed roasted peanuts into a sweet-tangy dressing.',
        },
        {
          stepNumber: 3,
          instructionKh: 'ចាប់នំបញ្ចុកដាក់ចាន រៀបបន្លែស្រស់ សណ្តែកបណ្តុះ ជីរ និងដាក់សាច់ត្រីអាំង ឬសាច់ជ្រូកខ្វៃពីលើ។',
          instructionEn: 'Place rice vermicelli in a bowl, layer with fresh vegetables and herbs, and top generously with grilled fish or roasted pork.',
        },
        {
          stepNumber: 4,
          instructionKh: 'ស្រោចទឹកត្រីផ្អែមសណ្តែកដីបុកពីលើ រួចច្របល់ទទួលទានភ្លាមៗ។',
          instructionEn: 'Drizzle generously with the sweet garlic-peanut fish sauce, toss lightly, and enjoy fresh.',
        },
      ];
    }

    // Num Banh Chok / Banh Kanh gravy noodles (food-157, 166)
    if (nameKh.includes('នំបញ្ចុក') || nameKh.includes('បាញ់កាញ់')) {
      return [
        {
          stepNumber: 1,
          instructionKh: `រៀបចំសរសៃនំ និងសាច់ (${mainIngKh}) ព្រមទាំងលាងហាន់បន្លែអន្លក់ (${herbKh}) ទុកឱ្យស្រស់ស្អាត។`,
          instructionEn: `Prepare the fresh noodles and protein (${mainIngEn}), and wash and julienne the fresh herbs and vegetables (${herbEn}).`,
        },
        {
          stepNumber: 2,
          instructionKh: `ដាក់ឆ្នាំងរំងាស់គ្រឿង និង ${subIngKh} ឱ្យឈ្ងុយបែកប្រេង ឬពុះចូលជាតិជាមួយសាច់។`,
          instructionEn: `Simmer the aromatic paste and ${subIngEn} with the protein until rich and fragrant.`,
        },
        {
          stepNumber: 3,
          instructionKh: 'ផ្សំរសជាតិទឹកសម្លដោយទឹកត្រី ស្ករត្នោត និងអំបិលឱ្យល្មមត្រូវមាត់។',
          instructionEn: 'Season the aromatic noodle gravy with fish sauce, palm sugar, and sea salt to a balanced finish.',
        },
        {
          stepNumber: 4,
          instructionKh: `ចាប់នំដាក់ចាន រៀបបន្លែស្រស់ (${herbKh}) ពីលើ រួចដួសទឹកសម្លក្តៅៗស្រោចទទួលទានភ្លាមៗ។`,
          instructionEn: `Place noodles in a bowl, pile ${herbEn} on top, and ladle the hot aromatic gravy over to serve.`,
        },
      ];
    }

    // Dry tossed noodles - Mee Kouk (food-161)
    if (nameKh.includes('មីគោក')) {
      return [
        {
          stepNumber: 1,
          instructionKh: 'បំពងគាវឱ្យស្រួយពណ៌មាស ហាន់សាច់ជ្រូកសាស៊ីវជាបន្ទះ និងដាំទឹកស៊ុបឆ្អឹងជ្រូកឱ្យពុះថ្លាឈ្ងុយ។',
          instructionEn: 'Fry the wontons crisp and golden, slice the char siu pork, and simmer a pot of clear pork bone broth.',
        },
        {
          stepNumber: 2,
          instructionKh: 'ស្រុសសណ្តែកបណ្តុះ ស្លឹកគូឆាយ និងមីពងទាក្នុងទឹកពុះឱ្យទន់ស្វិតល្មម រួចស្រង់ដាក់ចាន។',
          instructionEn: 'Blanch bean sprouts, chives, and egg noodles briefly until springy, then drain into a bowl.',
        },
        {
          stepNumber: 3,
          instructionKh: 'ច្របល់សរសៃមីជាមួយទឹកស៊ីអ៊ីវ ប្រេងខ្យង ប្រេងល្ង ស្ករបន្តិច និងខ្លាញ់ខ្ទឹមសបំពងឱ្យចូលជាតិឈ្ងុយ។',
          instructionEn: 'Toss the hot noodles in soy-sesame dressing, oyster sauce, and aromatic crispy garlic oil.',
        },
        {
          stepNumber: 4,
          instructionKh: `រៀបសាច់សាស៊ីវ គាវបំពង និង ${herbKh} ពីលើ ហើយដួសទឹកស៊ុបក្តៅៗដាក់ចានតូចទទួលទានផ្ទាប់គ្នា។`,
          instructionEn: `Top with char siu pork, crispy wontons, and ${herbEn}, and serve with a side bowl of hot pork broth.`,
        },
      ];
    }

    // Stir-fried / wok-baked noodles: Mee Cha, Lort Cha, Mee Suor Cha (food-159, 160, 164)
    if (nameKh.includes('មីឆា') || nameKh.includes('លតឆា') || nameKh.includes('មីសួរឆា')) {
      return [
        {
          stepNumber: 1,
          instructionKh: `រៀបចំសរសៃមី ឬនំលត និងលាងហាន់គ្រឿងសាច់ (${mainIngKh}) ព្រមទាំងបន្លែ (${subIngKh}) ទុកឱ្យស្អាត។`,
          instructionEn: `Prepare the noodles and protein (${mainIngEn}) along with ${subIngEn}.`,
        },
        {
          stepNumber: 2,
          instructionKh: 'ដាក់ខ្ទះឱ្យក្តៅ ចាក់ប្រេងបំពងខ្ទឹមសឱ្យឈ្ងុយ ដាក់សាច់ ឬគ្រឿងសមុទ្រចូលឆាដោយភ្លើងខ្លាំងឱ្យឆ្អិនល្មម។',
          instructionEn: 'Heat a wok over high flame, sauté minced garlic until fragrant, and sear the beef or seafood.',
        },
        {
          stepNumber: 3,
          instructionKh: 'ដាក់សរសៃមី ឬនំលត និងបន្លែចូលឆាត្រឡប់ជាមួយទឹកស៊ីអ៊ីវ ប្រេងខ្យង និងស្ករបន្តិចឱ្យចូលជាតិឈ្ងុយខ្ទះ។',
          instructionEn: 'Toss in the noodles and vegetables with soy sauce, oyster sauce, and seasoning over high wok heat.',
        },
        {
          stepNumber: 4,
          instructionKh: nameKh.includes('ពងទាចៀន')
            ? `ដួសដាក់ចាន ដាក់ពងទាចៀនពីលើ រោយ ${herbKh} និងទទួលទានជាមួយទឹកត្រីផ្អែមម្ទេស។`
            : `ដួសដាក់ចាន រោយ ${herbKh} ពីលើ រួចទទួលទានក្តៅៗភ្លាមៗ។`,
          instructionEn: nameKh.includes('ពងទាចៀន')
            ? `Plate hot, crown with a crispy fried duck egg and ${herbEn}, and serve with sweet chili fish sauce.`
            : `Transfer to a warm plate, garnish with ${herbEn}, and serve immediately.`,
        },
      ];
    }

    // Noodle soups: Boat noodles, Kep seafood kuy teav (food-158, 162)
    return [
      {
        stepNumber: 1,
        instructionKh: `រំងាស់ ${subIngKh} ដោយភ្លើងតិចៗឱ្យចេញជាតិផ្អែមឈ្ងុយ និងត្រៀមគ្រឿងសាច់ (${mainIngKh}) ទុកឱ្យស្អាត។`,
        instructionEn: `Simmer ${subIngEn} gently until deeply flavorful, and prepare ${mainIngEn}.`,
      },
      {
        stepNumber: 2,
        instructionKh: 'ស្រុសសរសៃគុយទាវ និងបន្លែក្នុងទឹកពុះឱ្យទន់ល្មម រួចដាក់ចូលក្នុងចានគោម។',
        instructionEn: 'Blanch the rice noodles and greens briefly in boiling water and place into serving bowls.',
      },
      {
        stepNumber: 3,
        instructionKh: 'ស្រុសសាច់គោ ប្រហិត ឬគ្រឿងសមុទ្រស្រស់ឱ្យឆ្អិនល្មម រៀបដាក់ពីលើសរសៃគុយទាវ រួចដួសទឹកស៊ុបក្តៅពុះស្រោចពីលើ។',
        instructionEn: 'Poach the beef, meatballs, or fresh seafood until just tender, arrange over the noodles, and ladle boiling broth on top.',
      },
      {
        stepNumber: 4,
        instructionKh: `រោយ ${herbKh} និងម្រេចកំពតពីលើ ទទួលទានក្តៅៗជាមួយក្រូចឆ្មារ និងម្ទេសតាមចំណូលចិត្ត។`,
        instructionEn: `Garnish generously with ${herbEn} and Kampot pepper, and serve piping hot with lime and chili.`,
      },
    ];
  }

  // ================= RICE & PORRIDGE (food-167 .. food-176) =================
  if (cat === 'rice') {
    // Rice Porridge / Borbor (food-169, 170, 174)
    if (nameKh.includes('បបរ')) {
      return [
        {
          stepNumber: 1,
          instructionKh: 'លាងអង្ករផ្កាម្លិះឱ្យស្អាត ដាក់រំងាស់ជាមួយទឹកស៊ុប ឬស្លឹកតយរហូតដល់គ្រាប់អង្កររីកទន់ខាប់រលោង។',
          instructionEn: 'Rinse jasmine rice and simmer gently in broth or pandan water until the grains bloom into silky congee.',
        },
        {
          stepNumber: 2,
          instructionKh: `រៀបចំចម្អិនគ្រឿងសាច់ និងគ្រឿងផ្ទាប់ (${mainIngKh} និង ${subIngKh}) ឱ្យឆ្អិនឈ្ងុយឆ្ងាញ់។`,
          instructionEn: `Prepare and cook the protein and savory accompaniments (${mainIngEn} and ${subIngEn}).`,
        },
        {
          stepNumber: 3,
          instructionKh: 'ផ្សំរសជាតិបបរដោយទឹកត្រី អំបិល និងស្ករបន្តិច (ឬទុកបបរសធម្មជាតិសម្រាប់ញ៉ាំផ្ទាប់ម្ហូបប្រៃ)។',
          instructionEn: 'Season the porridge delicately (or keep plain pandan congee unsalted to pair with savory sides).',
        },
        {
          stepNumber: 4,
          instructionKh: `ដួសបបរក្តៅៗដាក់ចាន រោយ ${herbKh} ពីលើ រួចទទួលទានភ្លាមៗ។`,
          instructionEn: `Ladle hot into bowls, garnish with ${herbEn}, and serve warm.`,
        },
      ];
    }

    // Claypot baked seafood rice (food-176)
    if (nameKh.includes('បាយអប់ឆ្នាំងដី')) {
      return [
        {
          stepNumber: 1,
          instructionKh: 'លាងសម្អាតបង្គា មឹក និងសាច់ក្តាមឱ្យស្អាត ហើយដាំបាយផ្កាម្លិះឱ្យឆ្អិនស្រស់គ្រាប់ល្អ។',
          instructionEn: 'Clean the fresh prawns, squid, and crab meat, and prepare fluffy cooked jasmine rice.',
        },
        {
          stepNumber: 2,
          instructionKh: 'ឆាខ្ទឹមស និងម្រេចខ្ចីកំពតជាមួយគ្រឿងសមុទ្រ ទឹកស៊ីអ៊ីវ ប្រេងខ្យង និងប្រេងល្ងឱ្យឈ្ងុយចូលជាតិ។',
          instructionEn: 'Sauté garlic and green Kampot peppercorns with the seafood, soy sauce, oyster sauce, and sesame oil.',
        },
        {
          stepNumber: 3,
          instructionKh: 'ដាក់បាយ និងគ្រឿងសមុទ្រចូលក្នុងឆ្នាំងដី គ្របគម្របអប់លើភ្លើងតិចៗ ៥-៨ នាទីឱ្យក្លិនម្រេចខ្ចីជ្រាបចូលគ្រាប់បាយ។',
          instructionEn: 'Layer the rice and spiced seafood in a claypot, cover, and bake over low heat for 5-8 minutes until aromatic.',
        },
        {
          stepNumber: 4,
          instructionKh: `បើកគម្របឆ្នាំងដី រោយ ${herbKh} ពីលើ រួចលើកទទួលទានក្តៅៗទាំងឆ្នាំងដី។`,
          instructionEn: `Uncover the sizzling claypot, garnish with ${herbEn}, and serve hot.`,
        },
      ];
    }

    // Fried rice dishes (food-167, 171, 173)
    if (nameKh.includes('បាយឆា')) {
      return [
        {
          stepNumber: 1,
          instructionKh: `ត្រៀមបាយផ្កាម្លិះឆ្អិនទុកឱ្យត្រជាក់រាយគ្រាប់ល្អ និងហាន់គ្រឿងផ្សំ (${mainIngKh} និង ${subIngKh}) ឱ្យស្អាត។`,
          instructionEn: `Use cooled day-old jasmine rice for separate grains, and dice/prep ${mainIngEn} and ${subIngEn}.`,
        },
        {
          stepNumber: 2,
          instructionKh: 'ដាក់ខ្ទះឱ្យក្តៅខ្លាំង បំពងខ្ទឹមសឱ្យឈ្ងុយ រួចឆាសាច់ ឬគ្រឿងសមុទ្រ និងស៊ុតឱ្យឆ្អិនក្រអូប។',
          instructionEn: 'Heat a wok over high flame, sauté garlic until fragrant, then stir-fry the proteins and egg.',
        },
        {
          stepNumber: 3,
          instructionKh: `ដាក់បាយ និង ${subIngKh} ចូលឆាត្រឡប់ដោយភ្លើងខ្លាំង ផ្សំរសជាតិដោយទឹកត្រី ទឹកស៊ីអ៊ីវ ប្រេងខ្យង និងស្ករបន្តិចឱ្យស្ងួតរាយគ្រាប់។`,
          instructionEn: `Toss in the rice and ${subIngEn} over high heat, seasoning with fish sauce, soy sauce, and oyster sauce until smoky.`,
        },
        {
          stepNumber: 4,
          instructionKh: `បង់ ${herbKh} ចូលត្រឡប់ឱ្យសព្វ រួចដួសដាក់ចានទទួលទានក្តៅៗ។`,
          instructionEn: `Fold in ${herbEn} and serve hot.`,
        },
      ];
    }

    // Rice plates / Sticky rice & jerky (food-168, 172, 175)
    return [
      {
        stepNumber: 1,
        instructionKh: `ដាំបាយ ឬចំហុយបាយដំណើបឱ្យឆ្អិនទន់ក្រអូប និងរៀបចំគ្រឿងសាច់ (${mainIngKh}) ឱ្យស្អាត។`,
        instructionEn: `Cook fragrant rice or steam glutinous rice until tender, and prepare the protein (${mainIngEn}).`,
      },
      {
        stepNumber: 2,
        instructionKh: 'ចម្អិនសាច់ (អាំងភ្លើងធ្យូង ស្ងោរ ឬចៀនតាមមុខម្ហូប) រហូតដល់ឆ្អិនឈ្ងុយមានរសជាតិមុតល្អ។',
        instructionEn: 'Grill, poach, or crisp the main protein until flavorful, tender, and aromatic.',
      },
      {
        stepNumber: 3,
        instructionKh: `រៀបចំគ្រឿងផ្ទាប់ និងទឹកជ្រលក់ ឬទឹកស៊ុប (${subIngKh}) ទុកសម្រាប់ញ៉ាំអមគ្នា។`,
        instructionEn: `Prepare the accompanying pickles, dipping sauce, or hot side broth (${subIngEn}).`,
      },
      {
        stepNumber: 4,
        instructionKh: `ដួសបាយដាក់ចាន រៀបសាច់ពីលើ បន្ថែម ${herbKh} រួចទទួលទានក្តៅៗ។`,
        instructionEn: `Plate the warm rice topped with the sliced meat and ${herbEn}, and serve with the accompaniments.`,
      },
    ];
  }

  // ================= STREET FOOD & STEAMED DISHES (food-177 .. food-184) =================
  if (cat === 'streetfood') {
    // Steamed minced pork with fish roe & salted duck egg (food-184)
    if (id === 'food-184') {
      return [
        {
          stepNumber: 1,
          instructionKh: 'ត្រាំមីសួរ និងផ្សិតត្រចៀកកណ្តុរឱ្យទន់ហាន់ខ្លីៗ រួចលាងពងត្រីស្រស់ថ្នមៗឱ្យស្អាត។',
          instructionEn: 'Soak glass noodles and wood-ear mushrooms until soft, chop finely, and gently rinse the fresh fish roe.',
        },
        {
          stepNumber: 2,
          instructionKh: 'លាយសាច់ជ្រូកចិញ្ច្រាំ ពងត្រី ពងទា សាច់សពងទាប្រៃ មីសួរ ផ្សិត ខ្ទឹមស ទឹកត្រី ស្ករបន្តិច និងម្រេចកំពតឱ្យចូលជាតិសព្វ។',
          instructionEn: 'Mix minced pork, fish roe, duck eggs, salted egg whites, glass noodles, mushrooms, garlic, fish sauce, and Kampot pepper.',
        },
        {
          stepNumber: 3,
          instructionKh: 'ដួសដាក់ចានគោមសម្រាប់ចំហុយ ដាក់ពងទាប្រៃក្រហមពីលើ រួចដាក់ចំហុយទឹកពុះប្រហែល ២៥-៣០ នាទីរហូតដល់ឆ្អិនណែនឈ្ងុយ។',
          instructionEn: 'Transfer to a steaming bowl, top with golden salted egg yolks, and steam over boiling water for 25-30 minutes until set.',
        },
        {
          stepNumber: 4,
          instructionKh: `រោយខ្ទឹមសបំពង និង ${herbKh} ពីលើ រួចទទួលទានក្តៅៗជាមួយបាយស។`,
          instructionEn: `Top with crispy fried garlic and ${herbEn}, and serve piping hot with steamed jasmine rice.`,
        },
      ];
    }

    // Num Krok (food-177)
    if (nameKh.includes('នំគ្រក់')) {
      return [
        {
          stepNumber: 1,
          instructionKh: 'លាយម្សៅអង្ករកិនជាមួយខ្ទិះដូង អំបិលបន្តិច និងស្លឹកខ្ទឹមហាន់ល្អិត កូរឱ្យរលោងសព្វល្អ។',
          instructionEn: 'Whisk stone-ground rice flour batter with coconut milk, sea salt, and finely chopped scallions.',
        },
        {
          stepNumber: 2,
          instructionKh: 'ដាក់អំបែងនំគ្រក់លើភ្លើងឱ្យក្តៅ លាបប្រេងបន្តិច រួចចាក់ម្សៅចូលតាមរន្ធនំគ្រក់ និងបន្ថែមក្បាលខ្ទិះដូងខាប់ពីលើ។',
          instructionEn: 'Heat the cast-iron Num Krok pan, brush lightly with oil, pour batter into the wells, and spoon thick coconut cream on top.',
        },
        {
          stepNumber: 3,
          instructionKh: 'គ្របគម្របចម្អិនរហូតដល់សំបកខាងក្រៅស្រួយពណ៌មាស សាច់ក្នុងទន់ខ្ទិះ រួចឆ្កឹះផ្គុំគ្នាជាគូៗ។',
          instructionEn: 'Cover and cook until the shells turn golden-crisp while the centers stay creamy, then join halves into round puffs.',
        },
        {
          stepNumber: 4,
          instructionKh: 'រៀបដាក់ចានទទួលទានក្តៅៗជ្រលក់ជាមួយទឹកត្រីផ្អែមលាយជ្រក់ល្ហុង និងម្ទេសហាន់។',
          instructionEn: 'Serve hot with sweet garlic-chili fish sauce and crisp pickled papaya.',
        },
      ];
    }

    // Banh Chao (food-178)
    if (nameKh.includes('បាញ់ឆែវ')) {
      return [
        {
          stepNumber: 1,
          instructionKh: 'លាយម្សៅបាញ់ឆែវជាមួយខ្ទិះដូង ម្សៅរមៀត អំបិលបន្តិច និងស្លឹកខ្ទឹមហាន់ឱ្យឡើងពណ៌លឿងស្អាត។',
          instructionEn: 'Mix rice flour batter with coconut milk, turmeric, a pinch of salt, and chopped scallions.',
        },
        {
          stepNumber: 2,
          instructionKh: 'ឆាសាច់ជ្រូកចិញ្ច្រាំ និងបង្គាស្រស់ជាមួយខ្ទឹមសឱ្យឆ្អិនឈ្ងុយ រួចវាសម្សៅបាញ់ឆែវស្តើងៗពេញខ្ទះក្តៅឱ្យស្រួយគែម។',
          instructionEn: 'Sauté minced pork and prawns in a hot skillet, then swirl thin turmeric batter across the pan until lacy and crisp.',
        },
        {
          stepNumber: 3,
          instructionKh: 'ដាក់សណ្តែកបណ្តុះពីលើស្នូលសាច់ គ្របមួយភ្លែតឱ្យឆ្អិន រួចបត់បាញ់ឆែវជាពីរឱ្យស្រួយស្អាត។',
          instructionEn: 'Add bean sprouts over the filling, cover briefly to steam, and fold the golden crispy crepe in half.',
        },
        {
          stepNumber: 4,
          instructionKh: `ទទួលទានក្តៅៗដោយខ្ចប់ជាមួយ ${herbKh} ជ្រលក់ទឹកត្រីផ្អែមសណ្តែកដីបុក។`,
          instructionEn: `Wrap pieces in ${herbEn} and dip into sweet-sour peanut fish sauce.`,
        },
      ];
    }

    // Lies Hal - Sun-dried spiced river clams (food-179)
    if (nameKh.includes('លៀសហាល')) {
      return [
        {
          stepNumber: 1,
          instructionKh: 'ត្រាំលៀសទន្លេស្រស់ក្នុងទឹកស្អាតឱ្យខ្ជាក់ដីខ្សាច់អស់ រួចលាងសម្អាតច្រើនទឹកនិងសម្រស់ឱ្យស្ងួត។',
          instructionEn: 'Soak fresh river clams in clean water to purge sand, then scrub and drain thoroughly.',
        },
        {
          stepNumber: 2,
          instructionKh: `បុកខ្ទឹមស និងម្ទេសខ្មាំង លាយជាមួយអំបិល និងគ្រឿងរសជាតិ (${subIngKh}) រួចច្របល់ជាមួយលៀសឱ្យសព្វល្អ។`,
          instructionEn: `Pound garlic and bird-eye chilies with coarse salt (${subIngEn}), and toss thoroughly over the clams.`,
        },
        {
          stepNumber: 3,
          instructionKh: 'យកលៀសប្រឡាក់គ្រឿងរាយលើចង្អើរហាលថ្ងៃក្តៅល្មម (ឬកម្តៅភ្លើងតិចៗ) រហូតដល់លៀសឆ្អិនហើបមាត់បន្តិចចូលជាតិប្រៃហឹរ។',
          instructionEn: 'Spread on trays under strong tropical sun (or gentle heat) until the clams warm through and absorb the spicy salt.',
        },
        {
          stepNumber: 4,
          instructionKh: `ដួសដាក់ចាន ច្របាច់ក្រូចឆ្មារស្រស់ (${herbKh}) ពីលើ រួចទទួលទានជាអាហារសម្រន់ដ៏ជក់មាត់។`,
          instructionEn: `Serve with a squeeze of fresh lime (${herbEn}) as an irresistible savory street snack.`,
        },
      ];
    }

    // Fried beef meatballs (food-180)
    if (nameKh.includes('ប្រហិតសាច់គោ')) {
      return [
        {
          stepNumber: 1,
          instructionKh: 'លាងសម្អាតប្រហិតសាច់គោសុទ្ធ ទុកឱ្យស្រស់ទឹក រួចយកកាំបិតឆូតលើគ្រាប់ប្រហិតជារាងខ្វែងតិចៗ ដើម្បីឱ្យពេលចៀនឆ្អិនសព្វ រីកស្អាត និងស្រួយឆ្ងាញ់។',
          instructionEn: 'Rinse and pat dry the pure beef meatballs, then lightly score a crosshatch on each meatball so they puff up and crisp evenly when fried.',
        },
        {
          stepNumber: 2,
          instructionKh: 'រំងាស់ទឹកជ្រលក់អម្ពិលទុំជាមួយស្ករត្នោត ទឹកត្រី ខ្ទឹមសបំពង និងម្ទេសឱ្យខាប់ជូរផ្អែមហឹរល្មម។',
          instructionEn: 'Simmer ripe tamarind pulp, palm sugar, fish sauce, crispy garlic, and chili into a thick sweet-spicy dipping sauce.',
        },
        {
          stepNumber: 3,
          instructionKh: 'ដាក់ប្រេងឆាក្នុងខ្ទះឱ្យក្តៅល្មម ដាក់ប្រហិតសាច់គោចូលចៀនដោយប្រើភ្លើងមធ្យម ឧស្សាហ៍ត្រឡប់រហូតប្រហិតរីកធំ ឡើងពណ៌មាសស្រួយក្រៅទន់ស្វិតខាងក្នុង។',
          instructionEn: 'Heat oil in a wok over medium heat and fry the beef meatballs, turning frequently until puffed, golden-crisp outside, and juicy and bouncy inside.',
        },
        {
          stepNumber: 4,
          instructionKh: `ស្រង់ប្រហិតសាច់គោចៀនដាក់ចាន ស្រោចទឹកជ្រលក់អម្ពិលទុំ រោយ ${herbKh} និងញ៉ាំផ្ទាប់ជាមួយជ្រក់ល្ហុងការ៉ុតស្រួយៗ។`,
          instructionEn: `Plate the piping-hot fried beef meatballs, drizzle with spicy tamarind sauce, top with ${herbEn}, and serve with crunchy papaya-carrot pickle.`,
        },
      ];
    }

    // Fresh spring rolls / Kuong (food-181)
    if (nameKh.includes('គួង')) {
      return [
        {
          stepNumber: 1,
          instructionKh: 'ស្ងោរបង្គា និងសាច់ជ្រូកបីជាន់ឱ្យឆ្អិន ហាន់ស្តើងៗ និងលាងបន្លែជីរគ្រប់មុខសម្រស់ទឹកឱ្យស្អាត។',
          instructionEn: 'Poach prawns and pork belly until tender, slice thinly, and wash all fresh lettuce and herbs.',
        },
        {
          stepNumber: 2,
          instructionKh: 'ផ្សើមសំបកណែមនឹងទឹកស្អាតឱ្យទន់ល្មម រៀបសាឡាត់ ជីរ នំបញ្ចុក សាច់ជ្រូក និងបង្គា រួចមូលឱ្យណែនស្អាត។',
          instructionEn: 'Soften rice paper sheets briefly, layer lettuce, herbs, vermicelli, pork, and prawns, and roll tightly.',
        },
        {
          stepNumber: 3,
          instructionKh: 'លាយទឹកជ្រលក់សៀងសណ្តែកដី ឬទឹកត្រីផ្អែមក្រូចឆ្មារខ្ទឹមសម្ទេសឱ្យឈ្ងុយឆ្ងាញ់។',
          instructionEn: 'Prepare the rich hoisin-peanut sauce or sweet-tangy garlic fish sauce dip.',
        },
        {
          stepNumber: 4,
          instructionKh: 'កាត់គួងជាកង់ល្មម រោយសណ្តែកដីបុកលើទឹកជ្រលក់ រួចទទួលទានស្រស់ៗភ្លាម។',
          instructionEn: 'Halve the fresh rolls, top the dipping sauce with crushed peanuts, and serve cool and fresh.',
        },
      ];
    }

    // Crispy fried spring rolls / Crispy chive cakes (food-182, 183)
    return [
      {
        stepNumber: 1,
        instructionKh: `រៀបចំលាយស្នូល និងម្សៅ ឬសំបកវេចខ្ចប់ (${mainIngKh}) ឱ្យចូលជាតិ និងមានរូបរាងស្អាត។`,
        instructionEn: `Prepare and shape the seasoned filling and wrapper/dough (${mainIngEn}).`,
      },
      {
        stepNumber: 2,
        instructionKh: 'ដាក់ខ្ទះប្រេងឱ្យក្តៅល្មម ដាក់ចៀន ឬបំពងដោយប្រែសងខាងរហូតដល់សំបកខាងក្រៅឡើងស្រួយពណ៌មាសឆ្អិនសព្វ។',
        instructionEn: 'Pan-fry or deep-fry over medium-high heat until the exterior turns golden-brown and extra crispy.',
      },
      {
        stepNumber: 3,
        instructionKh: `ស្រង់ដាក់លើក្រដាសជប់ប្រេង រួចលាយទឹកជ្រលក់ (${subIngKh}) ឱ្យជូរផ្អែមហឹរល្មម។`,
        instructionEn: `Drain excess oil briefly and whisk together the dipping sauce (${subIngEn}).`,
      },
      {
        stepNumber: 4,
        instructionKh: `រៀបដាក់ចានទទួលទានក្តៅៗស្រួយៗ ផ្ទាប់ជាមួយ ${herbKh} និងទឹកជ្រលក់។`,
        instructionEn: `Serve hot and crispy alongside ${herbEn} and the tangy dipping sauce.`,
      },
    ];
  }

  // ================= DESSERTS & TRADITIONAL CAKES (food-185 .. food-192) =================
  if (cat === 'dessert') {
    // Steamed whole pumpkin custard - Sangkhya Lapov (food-185)
    if (nameKh.includes('ល្ពៅសង់ខ្យា')) {
      return [
        {
          stepNumber: 1,
          instructionKh: 'ចោះមុខផ្លែល្ពៅខ្មែរខាងលើ ខ្វេះគ្រាប់ និងសរសៃចេញឱ្យស្អាត លាងទឹកជូតឱ្យស្ងួត។',
          instructionEn: 'Cut a lid on top of the whole pumpkin, scoop out all seeds and fibers cleanly, and pat dry.',
        },
        {
          stepNumber: 2,
          instructionKh: 'វាយពងទាជាមួយស្ករត្នោត ក្បាលខ្ទិះដូងខាប់ អំបិលមួយចុងស្លាបព្រា និងច្របាច់ស្លឹកតយយកក្លិនក្រអូប រួចត្រងឱ្យម៉ត់។',
          instructionEn: 'Whisk duck eggs with palm sugar, thick coconut cream, a pinch of salt, and pandan aroma, then strain smooth.',
        },
        {
          stepNumber: 3,
          instructionKh: 'ចាក់ល្បាយសង់ខ្យាចូលក្នុងផ្លែល្ពៅ រួចដាក់ចំហុយលើទឹកពុះភ្លើងល្មមប្រហែល ៤៥-៥៥ នាទីរហូតដល់ឆ្អិនសាច់ល្ពៅ និងសង់ខ្យាណែនល្អ។',
          instructionEn: 'Pour the custard into the pumpkin cavity and steam gently for 45-55 minutes until the pumpkin is tender and custard set.',
        },
        {
          stepNumber: 4,
          instructionKh: 'ទុកឱ្យត្រជាក់បន្តិច សឹមពុះជាចំណិតៗ រៀបដាក់ចានទទួលទាន។',
          instructionEn: 'Let cool slightly before slicing into wedges showing golden pumpkin and creamy custard.',
        },
      ];
    }

    // Num Ansom Chien / Num Ansom Chrouk / Num Kom wrapped banana-leaf cakes (food-187, 188)
    if (nameKh.includes('នំអន្សម') || nameKh.includes('នំគម')) {
      if (nameKh.includes('ចៀន')) {
        return [
          {
            stepNumber: 1,
            instructionKh: 'បកស្លឹកចេកចេញពីនំអន្សមជ្រូកដែលស្ងោរឆ្អិនល្អ រួចកាត់ជាកង់មូលៗកម្រាស់ល្មម (ប្រហែល ១.៥ សង់ទីម៉ែត្រ)។',
            instructionEn: 'Unwrap the banana leaves from the cooked pork-and-mung-bean sticky rice cake (Num Ansom) and slice into even rounds.',
          },
          {
            stepNumber: 2,
            instructionKh: 'ដាក់ខ្ទះមិនជាប់លើភ្លើងមធ្យម លាបប្រេងឆាបន្តិច រួចតម្រៀបកង់នំអន្សមជ្រូកដាក់ចៀន។',
            instructionEn: 'Heat a lightly oiled skillet over medium heat and arrange the Num Ansom slices in a single layer.',
          },
          {
            stepNumber: 3,
            instructionKh: 'ចៀនប្រែសងខាងរហូតដល់សំបកអង្ករដំណើបខាងក្រៅឡើងក្រហមមាសស្រួយឈ្ងុយ ឯស្នូលសណ្តែកលឿង និងសាច់ជ្រូកខាងក្នុងទន់ក្តៅឈ្ងុយម្រេចកំពត។',
            instructionEn: 'Pan-fry both sides until the outer sticky rice crust turns golden and crispy while the mung bean and peppered pork center stays warm and soft.',
          },
          {
            stepNumber: 4,
            instructionKh: 'ស្រង់ដាក់ចានទទួលទានក្តៅៗផ្ទាប់ជាមួយជ្រក់ត្រសក់ ជ្រក់ល្ហុង ឬទឹកត្រីផ្អែមតាមចំណូលចិត្ត។',
            instructionEn: 'Serve hot and crispy alongside tangy cucumber/papaya pickles or sweet fish sauce.',
          },
        ];
      }
      return [
        {
          stepNumber: 1,
          instructionKh: `រៀបចំអង្ករដំណើប ឬម្សៅដំណើប និងឆា ឬប្រឡាក់ស្នូល (${mainIngKh}) ឱ្យចូលជាតិឈ្ងុយឆ្ងាញ់។`,
          instructionEn: `Prepare the glutinous rice or dough and season/cook the savory or sweet coconut filling (${mainIngEn}).`,
        },
        {
          stepNumber: 2,
          instructionKh: 'ជូតស្លឹកចេកស្រស់ឱ្យស្អាត រៀបដាក់អង្ករ ឬម្សៅ និងស្នូលចំកណ្តាល រួចវេចខ្ចប់ចងឱ្យណែនស្អាត។',
          instructionEn: 'Wipe fresh banana leaves clean, enclose the filling inside the rice or dough, and wrap tightly.',
        },
        {
          stepNumber: 3,
          instructionKh: nameKh.includes('នំអន្សម')
            ? 'ដាក់ស្ងោរ ឬចំហុយក្នុងឆ្នាំងធំរយៈពេល ៣-៤ ម៉ោងរហូតដល់អង្ករដំណើបឆ្អិនស្អិតចូលជាតិស្នូលសណ្តែកសាច់ជ្រូក។'
            : 'ដាក់ចំហុយលើទឹកពុះប្រហែល ៣០-៤០ នាទីរហូតដល់ម្សៅនំគមឆ្អិនទន់ស្វិតក្រអូបស្លឹកចេក។',
          instructionEn: nameKh.includes('នំអន្សម')
            ? 'Boil or steam steadily for 3-4 hours until the glutinous rice, mung beans, and pork belly meld together.'
            : 'Steam over boiling water for 30-40 minutes until the pyramid sticky rice cake is tender and fragrant.',
        },
        {
          stepNumber: 4,
          instructionKh: 'បកស្លឹកចេក ឬកាត់ជាកង់ រៀបដាក់ចានទទួលទានក្តៅឧណ្ហៗ។',
          instructionEn: 'Unwrap the fragrant banana leaf or slice into rounds and enjoy warm.',
        },
      ];
    }

    // Mango sticky rice (food-190)
    if (nameKh.includes('បាយដំណើបស្វាយទុំ')) {
      return [
        {
          stepNumber: 1,
          instructionKh: 'លាងត្រាំអង្ករដំណើប រួចដាក់ចំហុយជាមួយស្លឹកតយរហូតដល់ឆ្អិនទន់ក្រអូប។',
          instructionEn: 'Soak glutinous rice and steam with pandan leaves until tender and translucent.',
        },
        {
          stepNumber: 2,
          instructionKh: 'ដាំខ្ទិះដូងដើមជាមួយស្ករស និងអំបិលបន្តិចឱ្យរលាយ យកមួយផ្នែកស្រោចកូរជាមួយបាយដំណើបក្តៅៗឱ្យជ្រាបខ្ទិះ និងទុកក្បាលខ្ទិះខាប់សម្រាប់ស្រោចពីលើ។',
          instructionEn: 'Warm coconut cream with sugar and a pinch of salt; fold most into the hot sticky rice and reserve thick salted cream for topping.',
        },
        {
          stepNumber: 3,
          instructionKh: 'ចិតសំបកស្វាយកែវរមៀតទុំ ហាន់ជាចំណិតស្អាត រៀបដាក់ចានក្បែរបាយដំណើបខ្ទិះដូង។',
          instructionEn: 'Peel and slice ripe sweet Keo Romeat mango neatly beside the mound of coconut sticky rice.',
        },
        {
          stepNumber: 4,
          instructionKh: `ស្រោចក្បាលខ្ទិះដូងខាប់ និងរោយ ${herbKh} ពីលើ រួចទទួលទាន។`,
          instructionEn: `Drizzle with thick salted coconut cream, sprinkle with ${herbEn}, and serve.`,
        },
      ];
    }

    // Num Plae Ai (food-191)
    if (nameKh.includes('នំផ្លែអាយ')) {
      return [
        {
          stepNumber: 1,
          instructionKh: 'លាយម្សៅអង្ករដំណើបជាមួយទឹកស្លឹកតយធម្មជាតិ លុញរហូតដល់ម្សៅទន់ស្វិតមិនជាប់ដៃ។',
          instructionEn: 'Knead glutinous rice flour with natural pandan water until smooth and pliable.',
        },
        {
          stepNumber: 2,
          instructionKh: 'បេះម្សៅជាដុំតូចៗ ដាក់ដុំស្ករត្នោតរឹងចំកណ្តាល រួចលុញឱ្យមូលជិតកុំឱ្យធ្លាយស្ករ។',
          instructionEn: 'Pinch small balls of dough, seal a cube of firm palm sugar tightly in the center, and roll smooth.',
        },
        {
          stepNumber: 3,
          instructionKh: 'ដាក់ស្ងោរក្នុងទឹកពុះរហូតដល់គ្រាប់នំអណ្តែតឡើងលើទឹក (បញ្ជាក់ថានំឆ្អិន និងស្ករត្នោតរលាយខាងក្នុង) រួចស្រង់ចេញ។',
          instructionEn: 'Drop into boiling water until the dumplings float to the surface with molten palm sugar centers, then lift out.',
        },
        {
          stepNumber: 4,
          instructionKh: `ប្រមៀលគ្រាប់នំជាមួយ ${subIngKh} ឱ្យជាប់សព្វ រួចរៀបដាក់ចានទទួលទាន។`,
          instructionEn: `Roll the warm dumplings in ${subIngEn} and serve immediately.`,
        },
      ];
    }

    // Simmered coconut desserts: Chek Ktis, Banh Cha Neuk, Borbor Trav (food-186, 189, 192)
    return [
      {
        stepNumber: 1,
        instructionKh: `រៀបចំគ្រឿងផ្សំចម្បង (${mainIngKh}) ឱ្យស្អាត (ស្ងោរគ្រាប់សាគូ ឬលុញម្សៅបាញ់ចានឿក ឬចំហុយត្រាវទុកជាមុន)។`,
        instructionEn: `Prepare ${mainIngEn} (cook sago pearls translucent, roll stuffed rice balls, or steam taro chunks).`,
      },
      {
        stepNumber: 2,
        instructionKh: `ដាំទឹកស្ករត្នោត ឬខ្ទិះដូង (${subIngKh}) ជាមួយស្លឹកតយ និងអំបិលមួយចុងស្លាបព្រាដោយភ្លើងតិចៗឱ្យឈ្ងុយ។`,
        instructionEn: `Simmer ${subIngEn} gently with pandan leaves and a pinch of sea salt until fragrant.`,
      },
      {
        stepNumber: 3,
        instructionKh: `ដាក់ ${mainIngKh} ចូលរំងាស់ថ្នមៗឱ្យជ្រាបរសជាតិផ្អែមឈ្ងុយល្មម។`,
        instructionEn: `Fold in ${mainIngEn} and simmer briefly until tender and infused with sweet coconut aroma.`,
      },
      {
        stepNumber: 4,
        instructionKh: `ដួសដាក់ចានគោម ស្រោចក្បាលខ្ទិះដូង ឬរោយ ${herbKh} ពីលើ រួចទទួលទានក្តៅឧណ្ហៗ ឬត្រជាក់តាមចំណូលចិត្ត។`,
        instructionEn: `Ladle into dessert bowls, finish with coconut cream or ${herbEn}, and enjoy warm or chilled.`,
      },
    ];
  }

  // ================= DRINKS & BEVERAGES (food-193 .. food-200) =================
  // Sugarcane kumquat juice (food-193)
  if (id === 'food-193') {
    return [
      {
        stepNumber: 1,
        instructionKh: 'សកសំបកអំពៅខ្មែរស្រស់ លាងទឹកឱ្យស្អាត និងពុះផ្លែក្រូចឆ្មារ ឬគុមក្វាត់ទុកគាបជាមួយគ្នា។',
        instructionEn: 'Peel and rinse fresh Cambodian sugarcane stalks and halve fragrant kumquat limes.',
      },
      {
        stepNumber: 2,
        instructionKh: 'ដាក់ដើមអំពៅអមជាមួយក្រូចឆ្មារចូលម៉ាស៊ីនគាបយកទឹកអំពៅស្រស់ពណ៌លឿងបៃតងក្រអូបឈ្ងុយ។',
        instructionEn: 'Press the sugarcane stalks together with whole kumquat limes through a roller press for fresh citrusy juice.',
      },
      {
        stepNumber: 3,
        instructionKh: 'ត្រងទឹកអំពៅតាមកន្ត្រងស្អាត និងបន្ថែមអំបិលម៉ត់មួយចុងស្លាបព្រាតូចដើម្បីលើករសជាតិផ្អែមស្រទន់។',
        instructionEn: 'Strain cleanly into a pitcher and add a tiny pinch of sea salt to brighten the natural sweetness.',
      },
      {
        stepNumber: 4,
        instructionKh: `ចាក់ចូលកែវទឹកកកអនាម័យត្រជាក់ៗ តុបតែងដោយ ${herbKh} រួចទទួលទានភ្លាមៗ។`,
        instructionEn: `Pour over crushed ice, garnish with ${herbEn}, and serve chilled.`,
      },
    ];
  }

  // Cambodian Iced Condensed Milk Coffee (food-194)
  if (id === 'food-194') {
    return [
      {
        stepNumber: 1,
        instructionKh: 'ដាក់ម្សៅកាហ្វេលីងមណ្ឌលគិរីចូលក្នុងថង់ក្រណាត់ ឬតម្រងឆុង ចាក់ទឹកក្តៅពុះឆុងយកទឹកកាហ្វេចាស់ខាប់ឈ្ងុយ។',
        instructionEn: 'Brew dark-roasted Mondulkiri coffee grounds with boiling water through a traditional cloth filter until strong and aromatic.',
      },
      {
        stepNumber: 2,
        instructionKh: 'ចាក់ទឹកដោះគោខាប់ផ្អែមចូលបាតកែវ រួចចាក់ទឹកកាហ្វេក្តៅៗចូលកូរឱ្យរលាយសព្វល្អ។',
        instructionEn: 'Spoon sweetened condensed milk into a tall glass, pour in the hot coffee extract, and stir until velvety.',
      },
      {
        stepNumber: 3,
        instructionKh: 'ដាក់ទឹកកកអនាម័យឱ្យពេញកែវដើម្បីឱ្យកាហ្វេត្រជាក់ស្រស់ភ្លាមៗ។',
        instructionEn: 'Fill the glass to the brim with clean crushed or cubed ice.',
      },
      {
        stepNumber: 4,
        instructionKh: 'ស្រោចទឹកដោះគោឆៅពីលើឱ្យឡើងស្រទាប់ស្អាត និងឈ្ងុយឆ្ងាញ់ រួចទទួលទាន។',
        instructionEn: 'Float creamy evaporated milk on top for a rich marbled finish and serve cold.',
      },
    ];
  }

  // Chilled fresh palm nectar / Fragrant young coconut (food-195, 197)
  if (id === 'food-195' || id === 'food-197') {
    return [
      {
        stepNumber: 1,
        instructionKh: `ជ្រើសរើស និងរៀបចំ ${mainIngKh} ថ្មីៗធម្មជាតិ ហើយលាងសម្អាតឱ្យមានអនាម័យល្អ។`,
        instructionEn: `Select freshly harvested ${mainIngEn} and chill thoroughly.`,
      },
      {
        stepNumber: 2,
        instructionKh: id === 'food-195'
          ? 'ត្រងទឹកត្នោតផ្អែមស្រស់តាមស្បៃស្អាត រួចក្លាស្សេឱ្យត្រជាក់ដើម្បីរក្សារសជាតិផ្អែមក្រអូបពីធម្មជាតិ។'
          : 'កាប់មុខផ្លែដូងក្រអូបស្រស់យ៉ាងស្អាត និងក្លាស្សេផ្លែដូងឱ្យត្រជាក់ស្រស់។',
        instructionEn: id === 'food-195'
          ? 'Strain the freshly tapped sweet toddy palm nectar through fine cloth and chill immediately.'
          : 'Trim and open the top of the chilled fragrant young coconut cleanly.',
      },
      {
        stepNumber: 3,
        instructionKh: `រៀបចំ ${subIngKh} បន្ថែមឱ្យកាន់តែឆ្ងាញ់ពិសា។`,
        instructionEn: `Include ${subIngEn} for tender natural texture.`,
      },
      {
        stepNumber: 4,
        instructionKh: 'ដាក់ទទួលទានត្រជាក់ៗភ្លាមៗដើម្បីទទួលបានរសជាតិផ្អែមឈ្ងុយធម្មជាតិពិតៗ។',
        instructionEn: 'Serve ice-cold immediately for pure, refreshing natural sweetness.',
      },
    ];
  }

  // Honey Lime Iced Tea (food-198)
  if (id === 'food-198') {
    return [
      {
        stepNumber: 1,
        instructionKh: 'ឆុងតែក្រហមជាមួយទឹកក្តៅពុះប្រហែល ៣-៤ នាទីឱ្យចេញពណ៌ក្រហមថ្លាឈ្ងុយ រួចត្រងកាកតែចេញ។',
        instructionEn: 'Steep fragrant red tea leaves in hot water for 3-4 minutes until bright amber, then strain.',
      },
      {
        stepNumber: 2,
        instructionKh: 'ទុកទឹកតែឱ្យថយកម្តៅឧណ្ហៗ សឹមដាក់ទឹកឃ្មុំព្រៃសុទ្ធ និងអំបិលមួយចុងស្លាបព្រាកូរឱ្យរលាយសព្វ។',
        instructionEn: 'Let cool slightly, then stir in pure wild forest honey and a tiny pinch of salt until dissolved.',
      },
      {
        stepNumber: 3,
        instructionKh: 'ច្របាច់ទឹកក្រូចឆ្មារស្រស់ចូល ភ្លក្សឱ្យមានរសជាតិជូរផ្អែមស្រទន់ឈ្ងុយក្លិនទឹកឃ្មុំ។',
        instructionEn: 'Squeeze in fresh lime juice and balance to a crisp sweet-citrus finish.',
      },
      {
        stepNumber: 4,
        instructionKh: `ចាក់ចូលកែវទឹកកក តុបតែងដោយ ${herbKh} រួចទទួលទានត្រជាក់ៗ។`,
        instructionEn: `Pour over ice cubes, garnish with ${herbEn}, and serve chilled.`,
      },
    ];
  }

  // Warm Pandan Soy Milk (food-199)
  if (id === 'food-199') {
    return [
      {
        stepNumber: 1,
        instructionKh: 'លាងត្រាំគ្រាប់សណ្តែកសៀងលឿងឱ្យរីកទន់ លាងសំបកចេញ រួចកិនជាមួយទឹកស្អាតឱ្យម៉ត់ខាប់។',
        instructionEn: 'Soak organic yellow soybeans until plump, rinse clean, and grind finely with filtered water.',
      },
      {
        stepNumber: 2,
        instructionKh: 'ច្របាច់ត្រងតាមស្បៃម៉ត់យកតែទឹកសណ្តែកសុទ្ធ រួចដាក់ដាំលើភ្លើងតិចៗជាមួយស្លឹកតយក្រអូប និងឧស្សាហ៍កូរកុំឱ្យខ្លោចបាត។',
        instructionEn: 'Strain through muslin cloth into a pot and simmer gently with knotted pandan leaves, stirring often.',
      },
      {
        stepNumber: 3,
        instructionKh: 'ដួសពពុះចេញ រម្ងាស់ឱ្យឆ្អិនឈ្ងុយបាត់ក្លិនឆៅ រួចថែមអំបិលម៉ត់បន្តិច និងទឹកស្ករត្នោតតាមចំណូលចិត្ត។',
        instructionEn: 'Skim foam, simmer until silky and fragrant, and sweeten lightly with palm sugar syrup.',
      },
      {
        stepNumber: 4,
        instructionKh: 'ដួសដាក់កែវ ឬចានគោម ទទួលទានក្តៅឧណ្ហៗយ៉ាងឈ្ងុយឆ្ងាញ់។',
        instructionEn: 'Pour into warm cups or bowls and enjoy fresh and comforting.',
      },
    ];
  }

  // Fruit smoothies: Avocado / Red Dragon Fruit (food-196, 200)
  return [
    {
      stepNumber: 1,
      instructionKh: `បកសំបក និងឆ្កឹះយកសាច់ផ្លែឈើស្រស់ទុំល្អ (${mainIngKh}) កាត់ជាដុំតូចៗ។`,
      instructionEn: `Peel and cube the ripe fresh fruit (${mainIngEn}).`,
    },
    {
      stepNumber: 2,
      instructionKh: `ដាក់សាច់ផ្លែឈើចូលម៉ាស៊ីនក្រឡុក ជាមួយ ${subIngKh}។`,
      instructionEn: `Place the fruit into a blender along with ${subIngEn}.`,
    },
    {
      stepNumber: 3,
      instructionKh: 'ក្រឡុករហូតដល់ម៉ត់ខាប់រលោងសព្វចូលគ្នា ភ្លក្សរសជាតិផ្អែមត្រជាក់ល្មម។',
      instructionEn: 'Blend on high until thick, velvety, and frosty smooth.',
    },
    {
      stepNumber: 4,
      instructionKh: `ចាក់ចូលកែវ តុបតែងពីលើដោយ ${herbKh} រួចទទួលទានភ្លាមៗ។`,
      instructionEn: `Pour into a chilled glass, garnish with ${herbEn}, and enjoy immediately.`,
    },
  ];
}

export const additional100Foods: FoodItem[] = RAW_100_NEW_DISHES.map((item, idx) => {
  const num = 101 + idx;
  const id = `food-${num}`;
  const onlinePhotoUrl = getMatchedOnlinePhotoUrl(item.cat, idx, id);
  const { cleanKh: cleanMainKh, cleanEn: cleanMainEn, amount: mainAmount } = extractMainIngredientAmount(
    item.mainIngKh,
    item.mainIngEn
  );

  const descriptionKh =
    id === 'food-173'
      ? `${item.nameKh} គឺជាបាយឆាខ្មែរដ៏ឈ្ងុយឆ្ងាញ់ ចម្អិនពី ${cleanMainKh}។`
      : item.cat === 'drink'
      ? `${item.nameKh} គឺជាភេសជ្ជៈខ្មែរដ៏ស្រស់ស្រាយ ផ្សំពី ${cleanMainKh}។`
      : item.cat === 'dessert'
      ? `${item.nameKh} គឺជាបង្អែមខ្មែរដ៏ឈ្ងុយឆ្ងាញ់ ផ្សំពី ${cleanMainKh}។`
      : `${item.nameKh} គឺជាមុខម្ហូបខ្មែរដ៏ឈ្ងុយឆ្ងាញ់ ចម្អិនពី ${cleanMainKh}។`;

  const descriptionEn =
    id === 'food-173'
      ? `${item.nameEn} is a popular wok-fried rice dish prepared with ${cleanMainEn}.`
      : item.cat === 'drink'
      ? `${item.nameEn} is a refreshing Cambodian beverage crafted with ${cleanMainEn}.`
      : item.cat === 'dessert'
      ? `${item.nameEn} is a traditional Cambodian dessert made with ${cleanMainEn}.`
      : `${item.nameEn} is an authentic Cambodian dish prepared with ${cleanMainEn}.`;

  return {
    id,
    nameKh: item.nameKh,
    nameEn: item.nameEn,
    categorySlug: item.cat,
    categoryKh: item.catKh,
    categoryEn: item.catEn,
    descriptionKh,
    descriptionEn,
    photoUrl: onlinePhotoUrl,
    originalPhotoUrl: onlinePhotoUrl,
    imageAuditStatus: 'verified',
    imageAuditNote: `រូបភាពម្ហូបខ្មែរពិតប្រាកដ (${item.nameKh})`,
    prepTime: item.cat === 'drink' ? '១០ នាទី' : '២០ នាទី',
    cookTime: item.cat === 'drink' ? '៥ នាទី' : '២៥ នាទី',
    servings: '២-៤ នាក់',
    calories: VERIFIED_CALORIES_101_200[id] ?? (item.cat === 'drink' ? 160 : item.cat === 'salad' ? 240 : 340),
    difficulty: 'medium',
    priceRiel: 0,
    priceUsd: 0,
    rating: +(4.7 + ((idx % 3) * 0.1)).toFixed(1),
    reviewCount: 38 + ((idx * 7) % 90),
    isFeatured: idx % 10 === 0,
    ingredients: [
      { nameKh: cleanMainKh, nameEn: cleanMainEn, amount: mainAmount },
      { nameKh: item.subIngKh, nameEn: item.subIngEn, amount: item.cat === 'drink' ? '១ ចំណែកល្មម' : '១ ចានល្មម' },
      { nameKh: item.herbKh, nameEn: item.herbEn, amount: '១ ក្តាប់តូច' },
      buildSeasoningIngredient(id, item),
    ],
    steps: buildStepsForDish(id, item, cleanMainKh, cleanMainEn),
  };
});
