import { FoodItem } from '../types';
import { additional100Foods } from './seedAdditional100Foods';

export const seedFoods: FoodItem[] = [
  // ==========================================
  // CATEGORY 1: ម្ហូបសម្ល (SOUPS & CURRIES) - 18 Dishes
  // ==========================================
  {
    id: 'food-1',
    nameKh: 'អាម៉ុកត្រីស្លឹកញរ',
    nameEn: 'Fish Amok with Noni Leaves',
    categorySlug: 'soup',
    categoryKh: 'ម្ហូបពិសេស / អាម៉ុក',
    categoryEn: 'Signature / Amok',
    descriptionKh: 'អាម៉ុកត្រី គឺជាម្ហូបតំណាងអត្តសញ្ញាណជាតិខ្មែរដ៏ល្បីល្បាញលើពិភពលោក។ ចម្អិនពីសាច់ត្រីរ៉ស់ស្រស់ៗ លាយជាមួយគ្រឿងបុកខ្មែរ ខ្ទិះដូងខាប់ ស៊ុត និងស្លឹកញ វេចក្នុងកន្ទោងស្លឹកចេក រួចចំហុយឱ្យឈ្ងុយឈ្ងប់។',
    descriptionEn: 'The undisputed national dish of Cambodia. Fresh river fish gently cooked in fragrant lemongrass-turmeric kroeung with rich coconut cream and steamed inside banana leaf cups.',
    photoUrl: '/foods/food-1.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-1.jpg',
    prepTime: '២៥ នាទី',
    cookTime: '៣០ នាទី',
    servings: '៣-៤ នាក់',
    calories: 380,
    difficulty: 'medium',
    priceRiel: 20000,
    priceUsd: 5.0,
    rating: 4.9,
    reviewCount: 142,
    isFeatured: true,
    ingredients: [
      { nameKh: 'សាច់ត្រីរ៉ស់ហាន់ស្ដើង', nameEn: 'Fresh river snakehead fish fillet', amount: '៥០០ ក្រាម' },
      { nameKh: 'គ្រឿងបុកខ្មែរ (ស្លឹកគ្រៃ រមៀត រំដេង ខ្ទឹមស)', nameEn: 'Traditional Khmer Kroeung paste', amount: '៣ ស្លាបព្រាបាយ' },
      { nameKh: 'ខ្ទិះដូងដើមខាប់', nameEn: 'Rich coconut cream', amount: '៣០០ មីលីលីត្រ' },
      { nameKh: 'ប្រហុកសាច់ចិញ្ច្រាំ', nameEn: 'Minced prahok', amount: '១ ស្លាបព្រាកាហ្វេ' },
      { nameKh: 'ស៊ុតមាន់', nameEn: 'Egg', amount: '២ គ្រាប់' },
      { nameKh: 'ស្លឹកញខ្ចី', nameEn: 'Young noni leaves', amount: '១០ ស្លឹក' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'លាងសម្អាតត្រីឱ្យស្អាត កាត់ជាបន្ទះស្ដើងល្មម។ រៀបចំកន្ទោងស្លឹកចេក។', instructionEn: 'Clean fish and slice into fillets. Form banana leaf cups.' },
      { stepNumber: 2, instructionKh: 'កូរគ្រឿងបុក ខ្ទិះដូង ប្រហុក ស្ករត្នោត ទឹកត្រី និងស៊ុតចូលគ្នាឱ្យរលោងសព្វល្អ។', instructionEn: 'Whisk kroeung, coconut cream, prahok, palm sugar, and eggs until smooth.' },
      { stepNumber: 3, instructionKh: 'ច្របល់សាច់ត្រីចូល ទ្រាប់ស្លឹកញបាតកន្ទោង រួចដួសសាច់ត្រីដាក់ពីលើ។', instructionEn: 'Gently mix fish into curry, place noni leaves at bottom, and ladle fish on top.' },
      { stepNumber: 4, instructionKh: 'ចំហុយរយៈពេល ២០ ទៅ ២៥ នាទី។ ស្រក់ខ្ទិះដូងខាប់ និងរោយស្លឹកក្រូចសើចហាន់សរសៃពីលើ។', instructionEn: 'Steam for 25 minutes. Drizzle coconut cream and shredded kaffir lime leaves.' },
    ],
  },
  {
    id: 'food-2',
    nameKh: 'សម្លកកូរខ្មែរ',
    nameEn: 'Authentic Samlor Korko (Cambodian Mixed Stew)',
    categorySlug: 'soup',
    categoryKh: 'ម្ហូបសម្ល / ប្រពៃណី',
    categoryEn: 'Soup / Traditional',
    descriptionKh: 'សម្លកកូរ ជាកំពូលសម្លបុរាណខ្មែរដែលសម្បូរដោយបន្លែធម្មជាតិច្រើនមុខ និងអង្ករលីងបុកឈ្ងុយ។ ចម្អិនជាមួយត្រីឆ្អើរ ឬសាច់ជ្រូកបីជាន់ មានរសជាតិផ្អែមបែបធម្មជាតិ។',
    descriptionEn: 'The traditional royal everyday stew of Cambodia packed with farm vegetables, toasted rice powder, and savory smoked fish or pork belly.',
    photoUrl: '/foods/food-2.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-2.jpg',
    prepTime: '៣០ នាទី',
    cookTime: '៣៥ នាទី',
    servings: '៤-៦ នាក់',
    calories: 290,
    difficulty: 'medium',
    priceRiel: 18000,
    priceUsd: 4.5,
    rating: 4.8,
    reviewCount: 98,
    isFeatured: true,
    ingredients: [
      { nameKh: 'សាច់ជ្រូកបីជាន់ ឬត្រីឆ្អើរ', nameEn: 'Pork belly or smoked fish', amount: '៣០០ ក្រាម' },
      { nameKh: 'អង្ករលីងបុកម៉ត់', nameEn: 'Toasted roasted rice powder', amount: '៣ ស្លាបព្រាបាយ' },
      { nameKh: 'ល្ហុងខ្ចី ចេកខ្ចី ល្ពៅ ត្រប់ពុតលំញង', nameEn: 'Green papaya, green banana, pumpkin, pea eggplant', amount: '១ ចានធំ' },
      { nameKh: 'ស្លឹកបាស ស្លឹកម្រុំ', nameEn: 'Moringa and ivy gourd leaves', amount: '១ កន្ត្រក' },
      { nameKh: 'គ្រឿងបុក និងប្រហុក', nameEn: 'Kroeung paste and prahok', amount: '២ ស្លាបព្រាបាយ' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ចិតបន្លែទាំងអស់ទុក។ លីងអង្ករឱ្យឡើងពណ៌ក្រហមឈ្ងុយរួចបុកឱ្យម៉ត់។', instructionEn: 'Cut all vegetables. Toast uncooked jasmine rice until golden and grind.' },
      { stepNumber: 2, instructionKh: 'ឆាគ្រឿងបុក និងប្រហុកឱ្យឈ្ងុយ រួចដាក់សាច់ចូលឆាឱ្យឆ្អិនរមាស់ចូលជាតិ។', instructionEn: 'Sauté kroeung and prahok until fragrant, then add meat to brown.' },
      { stepNumber: 3, instructionKh: 'ដាក់បន្លែរឹងៗចូល ចាក់ទឹកដាំពុះ និងរោយអង្ករលីងចូលកូរឱ្យសព្វ។', instructionEn: 'Add harder vegetables, hot water, and toasted rice powder.' },
      { stepNumber: 4, instructionKh: 'ពេលបន្លែឆ្អិនទន់ បង់ស្លឹកបាស ស្លឹកម្រុំ រួចភ្លក្សរសជាតិលើកចុះ។', instructionEn: 'Add leafy greens just before removing from heat and serve.' },
    ],
  },
  {
    id: 'food-3',
    nameKh: 'សម្លម្ជូរគ្រឿងសាច់គោ',
    nameEn: 'Khmer Beef Sour Soup (Samlor Machu Kroeung)',
    categorySlug: 'soup',
    categoryKh: 'ម្ហូបសម្ល / ម្ជូរគ្រឿង',
    categoryEn: 'Soup / Lemongrass Sour',
    descriptionKh: 'សម្លម្ជូរគ្រឿង ជាសម្លពេញនិយមបំផុតដែលមានក្លិនឈ្ងុយគ្រឿងបុកខ្មែរ លាយរសជាតិជូរអែមពីទឹកអម្ពិលទុំ និងស្លឹកម្កាក់ ចម្អិនជាមួយសាច់គោជាប់ខ្លាញ់ និងត្រកួនស្រស់ៗ។',
    descriptionEn: 'Classic Cambodian sour soup with tender beef ribs, rich yellow kroeung paste, water spinach, and tangy tamarind broth.',
    photoUrl: '/foods/food-3.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-3.jpg',
    prepTime: '២០ នាទី',
    cookTime: '៣០ នាទី',
    servings: '៣-៤ នាក់',
    calories: 320,
    difficulty: 'medium',
    priceRiel: 18000,
    priceUsd: 4.5,
    rating: 4.8,
    reviewCount: 110,
    ingredients: [
      { nameKh: 'សាច់គោ ឬឆ្អឹងជំនីរគោ', nameEn: 'Beef ribs or beef shank', amount: '៤០០ ក្រាម' },
      { nameKh: 'គ្រឿងបុកខ្មែរ', nameEn: 'Kroeung lemongrass paste', amount: '៣ ស្លាបព្រាបាយ' },
      { nameKh: 'ត្រកួន និងត្រប់វែង', nameEn: 'Morning glory (water spinach) and eggplant', amount: '២០០ ក្រាម' },
      { nameKh: 'ទឹកអម្ពិលទុំ ឬស្លឹកម្កាក់', nameEn: 'Ripe tamarind juice or hog plum leaves', amount: '៣ ស្លាបព្រាបាយ' },
      { nameKh: 'ប្រហុកចិញ្ច្រាំ', nameEn: 'Minced prahok', amount: '១ ស្លាបព្រាកាហ្វេ' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ឆាគ្រឿងបុក និងប្រហុកជាមួយប្រេងតិចៗឱ្យឈ្ងុយ រួចដាក់សាច់គោចូលរំងាស់។', instructionEn: 'Sauté kroeung and prahok in oil, add beef and braise gently.' },
      { stepNumber: 2, instructionKh: 'ចាក់ទឹកចូលដាំឱ្យពុះ រម្ងាស់ទាល់តែសាច់គោផុយល្អ។', instructionEn: 'Pour water and simmer until beef becomes fork-tender.' },
      { stepNumber: 3, instructionKh: 'ដាក់ទឹកអម្ពិលទុំ និងបន្លែត្រកួន ត្រប់វែងចូល ភ្លក្សរសជាតិឱ្យជូរប្រៃផ្អែមល្មម។', instructionEn: 'Add tamarind paste, water spinach, and eggplant; season to taste.' },
    ],
  },
  {
    id: 'food-4',
    nameKh: 'សម្លការីសាច់មាន់ខ្មែរ',
    nameEn: 'Khmer Red Chicken Curry (Kari Sach Moan)',
    categorySlug: 'soup',
    categoryKh: 'ម្ហូបសម្ល / ការី',
    categoryEn: 'Curry / Traditional',
    descriptionKh: 'ការីខ្មែរ មានរសជាតិស្រាលស្រទន់ មិនហឹរខ្លាំងដូចការីថៃឡើយ។ ចម្អិនពីសាច់មាន់ស្រែ ដំឡូងជ្វា ការ៉ុត ខ្ទឹមបារាំង ក្នុងទឹកខ្ទិះដូងឈ្ងុយឆ្ងាញ់ ទទួលទានជាមួយនំប៉័ងស្រួយ ឬនំបញ្ចុក។',
    descriptionEn: 'Mild, silky Cambodian red coconut curry featuring farm chicken, sweet potatoes, and carrots. Traditionally dipped with crusty French baguettes or rice vermicelli.',
    photoUrl: '/foods/food-4.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-4.jpg',
    prepTime: '២០ នាទី',
    cookTime: '៣៥ នាទី',
    servings: '៤ នាក់',
    calories: 460,
    difficulty: 'medium',
    priceRiel: 20000,
    priceUsd: 5.0,
    rating: 4.9,
    reviewCount: 184,
    ingredients: [
      { nameKh: 'សាច់មាន់ស្រែកាត់ដុំៗ', nameEn: 'Free-range chicken pieces', amount: '៦០០ ក្រាម' },
      { nameKh: 'គ្រឿងការីក្រហមខ្មែរ', nameEn: 'Khmer red curry paste', amount: '៣ ស្លាបព្រាបាយ' },
      { nameKh: 'ខ្ទិះដូងដើម និងចុង', nameEn: 'Coconut cream and milk', amount: '៦០០ មីលីលីត្រ' },
      { nameKh: 'ដំឡូងជ្វា និងការ៉ុត', nameEn: 'Sweet potatoes and carrots', amount: '៣០០ ក្រាម' },
      { nameKh: 'សណ្តែកកួរ និងខ្ទឹមបារាំង', nameEn: 'Yardlong beans and onion', amount: '១៥០ ក្រាម' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ចៀនដំឡូងជ្វាបន្តិចដើម្បីកុំឱ្យបែកពេលរម្ងាស់។', instructionEn: 'Lightly fry sweet potato cubes so they hold shape.' },
      { stepNumber: 2, instructionKh: 'ឆាគ្រឿងការីជាមួយក្បាលខ្ទិះឱ្យបែកប្រេងក្រហមឈ្ងុយ រួចដាក់សាច់មាន់ចូលឆាឱ្យចូលជាតិ។', instructionEn: 'Fry curry paste in coconut cream until fragrant oil rises, toss in chicken.' },
      { stepNumber: 3, instructionKh: 'ចាក់ទឹកខ្ទិះរាវចូល រម្ងាស់ជាមួយដំឡូង និងការ៉ុតរហូតដល់ឆ្អិនទន់ រួចបង់ខ្ទឹមបារាំង។', instructionEn: 'Pour remaining coconut milk, add vegetables and simmer until tender.' },
    ],
  },
  {
    id: 'food-5',
    nameKh: 'សម្លប្រហើរត្រីរ៉ស់',
    nameEn: 'Samlor Proher (Herbal Green Fish Soup)',
    categorySlug: 'soup',
    categoryKh: 'ម្ហូបសម្ល / ធម្មជាតិ',
    categoryEn: 'Soup / Herbal',
    descriptionKh: 'សម្លប្រហើរ ជាសម្លធម្មជាតិពិតៗដែលគ្មានខ្លាញ់ ប្រើតែត្រីរ៉ស់ស្រស់ បុកជាមួយគ្រឿងស្លឹកគ្រៃខ្ជាយ និងបន្លែចម្រុះស្រុកស្រែ (ននោង ល្ពៅ ត្រួយបាស ស្លឹកម្រុំ) ជំនួយសុខភាពយ៉ាងល្អ។',
    descriptionEn: 'Healthy, oil-free rustic Cambodian herbal broth packed with crushed fish, fingerroot, luffa gourd, pumpkin, and wild green shoots.',
    photoUrl: '/foods/food-5.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-5.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '២០ នាទី',
    servings: '៣ នាក់',
    calories: 190,
    difficulty: 'easy',
    priceRiel: 14000,
    priceUsd: 3.5,
    rating: 4.7,
    reviewCount: 65,
    ingredients: [
      { nameKh: 'សាច់ត្រីរ៉ស់ស្ងោរបុកម៉ត់', nameEn: 'Boiled pounded snakehead fish', amount: '៣០០ ក្រាម' },
      { nameKh: 'គ្រឿងបុកលាយខ្ជាយ', nameEn: 'Kroeung with extra fingerroot', amount: '២ ស្លាបព្រាបាយ' },
      { nameKh: 'ននោង ល្ពៅ ផ្សិតចំបើង', nameEn: 'Luffa gourd, pumpkin, straw mushrooms', amount: '៣០០ ក្រាម' },
      { nameKh: 'ស្លឹកបាស ស្លឹកម្រុំ ស្លឹកផ្អែម', nameEn: 'Wild ivy gourd and moringa leaves', amount: '១ ចាន' },
      { nameKh: 'ប្រហុកខ្មែរ', nameEn: 'Prahok paste', amount: '១ ស្លាបព្រាកាហ្វេ' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ដាំទឹកឱ្យពុះ រំលាយប្រហុក និងគ្រឿងបុកខ្ជាយចូល។', instructionEn: 'Boil water, dissolve prahok and fingerroot kroeung.' },
      { stepNumber: 2, instructionKh: 'ដាក់សាច់ត្រីបុកចូល និងដាក់បន្លែល្ពៅ ននោង ផ្សិត រម្ងាស់ឱ្យឆ្អិន។', instructionEn: 'Add pounded fish meat, pumpkin, luffa gourd, and mushrooms.' },
      { stepNumber: 3, instructionKh: 'បង់ស្លឹកបាស ស្លឹកម្រុំ ភ្លក្សរសជាតិផ្អែមបែបបន្លែធម្មជាតិ រួចលើកចុះ។', instructionEn: 'Stir in leafy greens, season lightly with fish sauce, and serve.' },
    ],
  },
  {
    id: 'food-6',
    nameKh: 'សម្លស្ងោរង៉ាំង៉ូវសាច់មាន់',
    nameEn: 'Pickled Lime Chicken Soup (Ngam Ngov)',
    categorySlug: 'soup',
    categoryKh: 'ម្ហូបស្ងោរ / ប្រពៃណី',
    categoryEn: 'Soup / Pickled Lime',
    descriptionKh: 'សម្លស្ងោរង៉ាំង៉ូវ មានរសជាតិជូរល្វីងស្រាលៗ និងក្លិនក្រអូបពិសេសពីក្រូចង៉ាំង៉ូវតាំងពីបុរាណ។ សាច់មាន់ស្រែទន់ផ្អែម ទឹកស៊ុបថ្លាក្តៅៗ ជួយបំបាត់ផ្តាសាយ និងសម្រួលបំពង់ក។',
    descriptionEn: 'A soul-soothing Cambodian soup with clear chicken broth infused with preserved whole limes, cilantro, and crispy shallots.',
    photoUrl: '/foods/food-6.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-6.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '៣០ នាទី',
    servings: '៣ នាក់',
    calories: 260,
    difficulty: 'easy',
    priceRiel: 16000,
    priceUsd: 4.0,
    rating: 4.8,
    reviewCount: 82,
    ingredients: [
      { nameKh: 'សាច់មាន់ស្រែកាត់ដុំល្មម', nameEn: 'Free-range chicken cuts', amount: '៥០០ ក្រាម' },
      { nameKh: 'ផ្លែក្រូចង៉ាំង៉ូវ និងទឹកង៉ាំង៉ូវ', nameEn: 'Pickled whole lime with juice', amount: '២ ផ្លែ' },
      { nameKh: 'ផ្សិតចំបើង ឬផ្សិតក្រៀម', nameEn: 'Straw or dried mushrooms', amount: '១០០ ក្រាម' },
      { nameKh: 'ខ្ទឹមបំពង និងស្លឹកខ្ទឹម ស្លឹកជីរវ៉ាន់ស៊ុយ', nameEn: 'Crispy garlic, scallions, cilantro', amount: 'តាមចំណូលចិត្ត' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ដាំទឹកឱ្យពុះ ដាក់សាច់មាន់ចូលស្ងោរលើភ្លើងមធ្យម និងដួសពពុះចេញឱ្យទឹកថ្លា។', instructionEn: 'Simmer chicken in boiling water, skimming foam for clear broth.' },
      { stepNumber: 2, instructionKh: 'ដាក់ផ្សិត និងក្រូចង៉ាំង៉ូវចូល (កុំញីបែកក្រូចពេកនាំឱ្យល្វីងខ្លាំង)។', instructionEn: 'Add mushrooms and whole pickled lime gently without crushing.' },
      { stepNumber: 3, instructionKh: 'ភ្លក្សរសជាតិជូរអែមប្រៃល្មម រោយខ្ទឹមបំពង និងជីរវ៉ាន់ស៊ុយពីលើ។', instructionEn: 'Adjust seasoning with fish sauce and palm sugar, top with fried garlic.' },
    ],
  },
  {
    id: 'food-7',
    nameKh: 'សម្លម្ជូរព្រៃត្រីឆ្អើរ',
    nameEn: 'Wild Sour Soup with Smoked Fish',
    categorySlug: 'soup',
    categoryKh: 'ម្ហូបម្ជូរ / ស្រុកស្រែ',
    categoryEn: 'Soup / Wild Sour',
    descriptionKh: 'ម្ជូរព្រៃ ជាសម្លបែបស្រុកស្រែពិតៗ ដែលប្រើស្លឹកទ្រមូង ឬស្លឹកម្កាក់ និងអម្ពិលខ្ចី ចម្អិនជាមួយត្រីឆ្អើរឈ្ងុយៗ និងត្រប់ស្រួយ មានក្លិនប្រហុកឈ្ងុយប្លែកមាត់។',
    descriptionEn: 'Rustic countryside sour soup flavored with smoked fish, wild sour leaves, green tamarind, and crisp baby eggplants.',
    photoUrl: '/foods/food-7.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-7.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '២០ នាទី',
    servings: '៣ នាក់',
    calories: 220,
    difficulty: 'easy',
    priceRiel: 15000,
    priceUsd: 3.75,
    rating: 4.6,
    reviewCount: 54,
    ingredients: [
      { nameKh: 'ត្រីឆ្អើរ ឬត្រីអាំងបេះយកសាច់', nameEn: 'Smoked catfish flaked', amount: '២៥០ ក្រាម' },
      { nameKh: 'អម្ពិលខ្ចី ឬស្លឹកទ្រមូង', nameEn: 'Young green tamarind or wild sour leaves', amount: '១ ក្តាប់' },
      { nameKh: 'ត្រប់ស្រួយ និងត្រកួនស្រែ', nameEn: 'Thai round eggplant, water spinach', amount: '២០០ ក្រាម' },
      { nameKh: 'ប្រហុកដុត ឬប្រហុកសាច់', nameEn: 'Toasted prahok paste', amount: '១ ស្លាបព្រាបាយ' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ដាំទឹកឱ្យពុះ បង់ប្រហុក និងអម្ពិលខ្ចីចូលស្ងោរឱ្យចេញជាតិជូរ។', instructionEn: 'Boil water with prahok and crushed young tamarind.' },
      { stepNumber: 2, instructionKh: 'ដាក់សាច់ត្រីឆ្អើរ និងត្រប់ស្រួយចូល រម្ងាស់ឱ្យឆ្អិន។', instructionEn: 'Add flaked smoked fish and round eggplants.' },
      { stepNumber: 3, instructionKh: 'បង់ស្លឹកជីរនាងវង ឬជីរអង្កាម រួចលើកចុះទទួលទានក្តៅៗ។', instructionEn: 'Toss in holy basil or fresh mint and serve hot.' },
    ],
  },
  {
    id: 'food-8',
    nameKh: 'ខសាច់ជ្រូកពងទា',
    nameEn: 'Caramelized Pork Stew with Eggs (Khor Sach Chrouk)',
    categorySlug: 'soup',
    categoryKh: 'ម្ហូបខ / ប្រពៃណី',
    categoryEn: 'Stew / Caramelized',
    descriptionKh: 'ខសាច់ជ្រូកពងទា ជាម្ហូបប្រចាំពិធីបុណ្យចូលឆ្នាំខ្មែរ និងភ្ជុំបិណ្ឌ។ សាច់ជ្រូកបីជាន់ផុយទន់ រម្ងាស់ក្នុងទឹកស្ករត្នោតឡើងជើងក្អែក ទឹកដូងស្រស់ និងពងទាឆ្អិនចូលជាតិពណ៌ត្នោតក្រម៉ៅ។',
    descriptionEn: 'Beloved traditional Cambodian celebration stew of succulent pork belly braised in rich palm sugar caramel, fresh coconut water, bamboo shoots, and hard-boiled duck eggs.',
    photoUrl: '/foods/food-8.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-8.jpg',
    prepTime: '២០ នាទី',
    cookTime: '៦០ នាទី',
    servings: '៤ នាក់',
    calories: 520,
    difficulty: 'medium',
    priceRiel: 20000,
    priceUsd: 5.0,
    rating: 4.9,
    reviewCount: 220,
    isFeatured: true,
    ingredients: [
      { nameKh: 'សាច់ជ្រូកបីជាន់កាត់ដុំធំៗ', nameEn: 'Pork belly cut in large chunks', amount: '៦០០ ក្រាម' },
      { nameKh: 'ពងទាស្ងោរបកសំបក', nameEn: 'Hard-boiled duck eggs', amount: '៤-៦ គ្រាប់' },
      { nameKh: 'ស្ករត្នោតខ្មែរ', nameEn: 'Palm sugar', amount: '៣ ស្លាបព្រាបាយ' },
      { nameKh: 'ទឹកដូងស្រស់', nameEn: 'Fresh young coconut water', amount: '៥០០ មីលីលីត្រ' },
      { nameKh: 'ទំពាំង ឬត្រឡាច', nameEn: 'Bamboo shoots or winter melon', amount: '២០០ ក្រាម' },
      { nameKh: 'ខ្ទឹមស ម្រេចកំពត ទឹកត្រី', nameEn: 'Garlic, Kampot black pepper, fish sauce', amount: 'តាមចំណូលចិត្ត' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'រម្ងាស់ស្ករត្នោតក្នុងឆ្នាំងឱ្យឡើងពណ៌ក្រហមក្រម៉ៅ (ជើងក្អែក) រួចដាក់ខ្ទឹមស និងសាច់ជ្រូកចូលឆាឱ្យស្រពាប់។', instructionEn: 'Caramelize palm sugar until deep amber, add garlic and sear pork chunks.' },
      { stepNumber: 2, instructionKh: 'ចាក់ទឹកដូងស្រស់ ទឹកត្រី ម្រេចកំពត និងបង់ពងទាស្ងោរចូល។', instructionEn: 'Pour fresh coconut water, fish sauce, black pepper, and add eggs.' },
      { stepNumber: 3, instructionKh: 'រម្ងាស់ភ្លើងតិចៗរយៈពេល ៤៥ ទៅ ៦០ នាទី រហូតសាច់ជ្រូកទន់រលាយក្នុងមាត់។', instructionEn: 'Simmer gently on low heat for 1 hour until pork is melt-in-the-mouth tender.' },
    ],
  },
  {
    id: 'food-9',
    nameKh: 'សម្លម្ជូរត្រីសណ្តាយ',
    nameEn: 'Sanday Fish Sour Soup',
    categorySlug: 'soup',
    categoryKh: 'ម្ហូបម្ជូរ / ត្រីទឹកសាប',
    categoryEn: 'Soup / River Fish',
    descriptionKh: 'សម្លម្ជូរត្រីសណ្តាយ ប្រើត្រីទឹកសាបទន្លេមេគង្គសាច់ផ្អែមឆ្ងាញ់ ចម្អិនជាមួយអម្ពិលខ្ចី និងជីរវ៉ាន់ស៊ុយបារាំង រសជាតិជូរស្រស់ស្រាយបែបអ្នកទន្លេ។',
    descriptionEn: 'Mekong river Sanday catfish simmered with bruised young tamarind pods, lemongrass, and aromatic saw-leaf coriander.',
    photoUrl: '/foods/food-9.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-9.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '២០ នាទី',
    servings: '៣ នាក់',
    calories: 270,
    difficulty: 'easy',
    priceRiel: 18000,
    priceUsd: 4.5,
    rating: 4.7,
    reviewCount: 71,
    ingredients: [
      { nameKh: 'ត្រីសណ្តាយស្រស់កាត់កង់', nameEn: 'Fresh Sanday catfish steaks', amount: '៥០០ ក្រាម' },
      { nameKh: 'អម្ពិលខ្ចីដំឱ្យបែក', nameEn: 'Crushed young tamarind pods', amount: '៥-៧ ផ្លែ' },
      { nameKh: 'ជីររណារ និងជីរនាងវង', nameEn: 'Culantro and holy basil', amount: '១ ក្តាប់' },
      { nameKh: 'ម្ទេសទុំ និងទឹកត្រី', nameEn: 'Fresh chilies and premium fish sauce', amount: 'តាមចំណូលចិត្ត' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ដាំទឹកឱ្យពុះខ្លាំង បង់អម្ពិលខ្ចីចូលរម្ងាស់ឱ្យចេញជាតិជូរ។', instructionEn: 'Boil water vigorously and add bruised green tamarind.' },
      { stepNumber: 2, instructionKh: 'ដាក់ត្រីសណ្តាយចូល (កុំកូរនាំឱ្យឆ្អាប) រម្ងាស់លើភ្លើងមធ្យម ៨-១០ នាទី។', instructionEn: 'Add fish steaks without stirring to keep broth crystal clear.' },
      { stepNumber: 3, instructionKh: 'បង់ជីររណារ ម្ទេសទុំ ភ្លក្សរសជាតិឱ្យជូរប្រៃមុតល្អ រួចលើកចុះ។', instructionEn: 'Add saw-leaf coriander and chilies, season with fish sauce.' },
    ],
  },
  {
    id: 'food-10',
    nameKh: 'ស្ងោរទំពាំងជើងជ្រូក',
    nameEn: 'Braised Bamboo Shoot & Pork Trotter Soup',
    categorySlug: 'soup',
    categoryKh: 'ម្ហូបស្ងោរ / ប្រពៃណី',
    categoryEn: 'Soup / Bamboo Shoots',
    descriptionKh: 'ស្ងោរទំពាំងជើងជ្រូក ជាសម្លស្ងោរទឹកថ្លាដ៏ឈ្ងុយឆ្ងាញ់ ចម្អិនពីជើងជ្រូកកាប់ដុំរម្ងាស់ឱ្យផុយទន់ផ្អែមទឹកស៊ុប ជាមួយទំពាំងស្រស់ស្ងោរអស់ជាតិហាង ខ្ទឹមស ខ្ទឹមក្រហម រោយម្រេចកំពត ស្លឹកខ្ទឹម និងជីរវ៉ាន់ស៊ុយ។',
    descriptionEn: 'Comforting Cambodian clear broth soup of tender slow-simmered pork trotters and sweet parboiled fresh bamboo shoots, infused with garlic, shallots, Kampot black pepper, scallions, and cilantro.',
    photoUrl: '/foods/food-10.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-10.jpg',
    prepTime: '២០ នាទី',
    cookTime: '៤០ នាទី',
    servings: '៣-៤ នាក់',
    calories: 310,
    difficulty: 'easy',
    priceRiel: 15000,
    priceUsd: 3.75,
    rating: 4.6,
    reviewCount: 48,
    ingredients: [
      { nameKh: 'ជើងជ្រូកកាប់ដុំល្មម', nameEn: 'Pork trotters cut into bite-sized pieces', amount: '៥០០ ក្រាម' },
      { nameKh: 'ទំពាំងស្រស់ហាន់បន្ទះស្ងោរទឹកចោល', nameEn: 'Fresh sliced bamboo shoots (parboiled)', amount: '៣៥០ ក្រាម' },
      { nameKh: 'ខ្ទឹមស និងខ្ទឹមក្រហមដំ', nameEn: 'Crushed garlic cloves and shallots', amount: '៥ កំពឹស' },
      { nameKh: 'ទឹកត្រី អំបិល និងស្ករត្នោតបន្តិច', nameEn: 'Fish sauce, sea salt, and pinch of palm sugar', amount: '២ ស្លាបព្រាបាយ' },
      { nameKh: 'ម្រេចកំពតម៉ត់ ស្លឹកខ្ទឹម និងជីរវ៉ាន់ស៊ុយ', nameEn: 'Ground Kampot pepper, scallions, and cilantro', amount: '១ ក្តាប់តូច' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'លាងសម្អាតជើងជ្រូក ស្រុះទឹកក្តៅមួយសារឱ្យអស់ក្លិនឆ្អាប។ ហាន់ទំពាំងស្រស់ជាចំណិតល្មម រួចស្ងោរឱ្យឆ្អិនល្អ និងបង្ហូរទឹកចេញដើម្បីបំបាត់ជាតិហាង។', instructionEn: 'Clean and blanch pork trotters briefly. Slice fresh bamboo shoots, parboil thoroughly, and drain to remove bitterness.' },
      { stepNumber: 2, instructionKh: 'ដាំទឹកឱ្យពុះ បង់ខ្ទឹមស ខ្ទឹមក្រហម និងជើងជ្រូកចូល រម្ងាស់លើភ្លើងមធ្យមប្រហែល ២៥-៣០ នាទី (ដួសពពុះចេញឱ្យទឹកស៊ុបថ្លា) រហូតដល់ជើងជ្រូកផុយទន់។', instructionEn: 'Boil water with crushed garlic, shallots, and pork trotters; simmer for 25-30 minutes while skimming foam until tender.' },
      { stepNumber: 3, instructionKh: 'ដាក់ទំពាំងចូល ថែមទឹកត្រី អំបិល និងស្ករត្នោតបន្តិច ស្ងោរបន្ត ១០-១៥ នាទីឱ្យចូលជាតិផ្អែមឈ្ងុយ។', instructionEn: 'Add parboiled bamboo shoots, season with fish sauce, salt, and a touch of palm sugar, and simmer for 10-15 minutes.' },
      { stepNumber: 4, instructionKh: 'ភ្លក្សរសជាតិឱ្យល្មម រួចបង់ស្លឹកខ្ទឹម ជីរវ៉ាន់ស៊ុយ និងរោយម្រេចកំពតម៉ត់ពីលើ ដួសទទួលទានក្តៅៗ។', instructionEn: 'Taste and adjust seasoning, finish with chopped scallions, cilantro, and freshly ground Kampot pepper, and serve hot.' },
    ],
  },
  {
    id: 'food-11',
    nameKh: 'សម្លម្ជូរយួនត្រីរ៉ស់',
    nameEn: 'Sweet & Sour Soup with Snakehead Fish',
    categorySlug: 'soup',
    categoryKh: 'ម្ហូបម្ជូរ / ពេញនិយម',
    categoryEn: 'Soup / Sweet & Sour',
    descriptionKh: 'សម្លម្ជូរយួន មានរសជាតិជូរអែមឆ្ងាញ់ពិសា ប្រើម្នាស់ ប៉េងប៉ោះ ត្រកួន ផ្កាស្នោ និងកូនត្រីរ៉ស់ស្រស់ៗ រោយខ្ទឹមបំពងឈ្ងុយៗពីលើ។',
    descriptionEn: 'Popular sweet-and-sour tamarind soup filled with pineapple chunks, ripe tomatoes, river fish, water spinach, and fragrant fried garlic.',
    photoUrl: '/foods/food-11.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-11.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '២០ នាទី',
    servings: '៣-៤ នាក់',
    calories: 250,
    difficulty: 'easy',
    priceRiel: 16000,
    priceUsd: 4.0,
    rating: 4.8,
    reviewCount: 135,
    ingredients: [
      { nameKh: 'ត្រីរ៉ស់ ឬត្រីឆ្តោរកាត់កង់', nameEn: 'Fresh river snakehead fish', amount: '៤៥០ ក្រាម' },
      { nameKh: 'ម្នាស់ទុំ និងប៉េងប៉ោះ', nameEn: 'Ripe pineapple and tomatoes', amount: '២០០ ក្រាម' },
      { nameKh: 'ត្រកួន ឬកំប្លោក', nameEn: 'Water spinach or water hyacinth stems', amount: '១៥០ ក្រាម' },
      { nameKh: 'ទឹកអម្ពិលទុំ និងស្ករត្នោត', nameEn: 'Tamarind pulp and palm sugar', amount: '២ ស្លាបព្រាបាយ' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ដាំទឹកឱ្យពុះ ដាក់ទឹកអម្ពិលទុំ និងស្ករត្នោត អំបិលចូល។', instructionEn: 'Bring water to boil, dissolve tamarind and palm sugar.' },
      { stepNumber: 2, instructionKh: 'ដាក់ត្រី និងម្នាស់ចូលរម្ងាស់ឱ្យឆ្អិន។', instructionEn: 'Add fish and pineapple chunks to cook thoroughly.' },
      { stepNumber: 3, instructionKh: 'ដាក់ប៉េងប៉ោះ និងត្រកួនចូល បង់ខ្ទឹមបំពង និងជីរនាងវងពីលើ។', instructionEn: 'Toss in tomatoes, greens, and garnish with crispy fried garlic.' },
    ],
  },
  {
    id: 'food-12',
    nameKh: 'សម្លម្ជូរក្តាមស្រែ',
    nameEn: 'Field Crab Sour Soup with Water Mimosa',
    categorySlug: 'soup',
    categoryKh: 'ម្ហូបម្ជូរ / ស្រុកស្រែ',
    categoryEn: 'Soup / Field Crab',
    descriptionKh: 'សម្លម្ជូរក្តាមស្រែ ប្រើក្តាមស្រែស្រស់ៗបុកច្រោះយកទឹកខាប់ផ្អែម ចម្អិនជាមួយបន្លែកំពីងពួយស្រួយៗ និងស្លឹកម្កាក់ រសជាតិឈ្ងុយជាប់មាត់។',
    descriptionEn: 'Traditional countryside sour soup prepared with freshly pounded field crab nectar, crunchy water mimosa, and tart hog plum leaves.',
    photoUrl: '/foods/food-12.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-12.jpg',
    prepTime: '២៥ នាទី',
    cookTime: '២០ នាទី',
    servings: '៣ នាក់',
    calories: 210,
    difficulty: 'medium',
    priceRiel: 16000,
    priceUsd: 4.0,
    rating: 4.7,
    reviewCount: 62,
    ingredients: [
      { nameKh: 'ក្តាមស្រែស្រស់បុកច្រោះយកទឹក', nameEn: 'Pounded fresh field crab broth', amount: '៥០០ មីលីលីត្រ' },
      { nameKh: 'បន្លែកំពីងពួយបេះស្អាត', nameEn: 'Crisp water mimosa shoots', amount: '២០០ ក្រាម' },
      { nameKh: 'ស្លឹកម្កាក់ ឬអម្ពិលខ្ចី', nameEn: 'Hog plum sour leaves', amount: '១ ក្តាប់' },
      { nameKh: 'ប្រហុក និងម្ទេស', nameEn: 'Prahok and fresh chili', amount: 'តាមចំណូលចិត្ត' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ដាំទឹកក្តាមស្រែលើភ្លើងតិចៗឱ្យដុំប្រហិតក្តាមអណ្តែតឡើងលើ។', instructionEn: 'Simmer crab broth gently until delicate crab custard rises.' },
      { stepNumber: 2, instructionKh: 'ដាក់ស្លឹកម្កាក់ចូលដើម្បីឱ្យចេញជាតិជូរឈ្ងុយ។', instructionEn: 'Add sour hog plum leaves for natural tang.' },
      { stepNumber: 3, instructionKh: 'បង់បន្លែកំពីងពួយចូល ភ្លក្សរសជាតិ រួចលើកចុះកុំឱ្យរលួយកំពីងពួយ។', instructionEn: 'Add water mimosa just for 1 minute to retain crispness.' },
    ],
  },
  {
    id: 'food-13',
    nameKh: 'សម្លម្ជូរគ្រឿងសាច់គោ',
    nameEn: 'Cambodian Beef Kroeung Sour Soup',
    categorySlug: 'soup',
    categoryKh: 'ម្ហូបសម្ល / ម្ជូរគ្រឿង',
    categoryEn: 'Soup / Kroeung Sour',
    descriptionKh: 'សម្លម្ជូរគ្រឿងសាច់គោ ជាសម្លខ្មែរដ៏ឈ្ងុយឆ្ងាញ់ បញ្ចេញក្លិនក្រអូបពីគ្រឿងបុកស្លឹកគ្រៃរមៀត ប្រហុកសាច់ និងស្លឹកក្រូចសើច រម្ងាស់ជាមួយសាច់គោជាប់ខ្លាញ់ ត្រប់ស្រួយ ត្រកួន និងទឹកអំពិលទុំជូរអែមមុតល្អ។',
    descriptionEn: 'Rich and aromatic Cambodian sour beef soup simmered with freshly pounded yellow lemongrass kroeung, savory prahok, marbled beef slices, crisp round eggplants, water spinach, and tangy tamarind.',
    photoUrl: '/foods/food-13.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-13.jpg',
    prepTime: '២០ នាទី',
    cookTime: '៣០ នាទី',
    servings: '៣-៤ នាក់',
    calories: 310,
    difficulty: 'medium',
    priceRiel: 16000,
    priceUsd: 4.0,
    rating: 4.8,
    reviewCount: 79,
    ingredients: [
      { nameKh: 'សាច់គោជាប់ខ្លាញ់ហាន់បន្ទះល្មម', nameEn: 'Marbled beef sliced into bite-sized pieces', amount: '៤០០ ក្រាម' },
      { nameKh: 'គ្រឿងបុកខ្មែរ (ស្លឹកគ្រៃ រមៀត រំដេង ខ្ទឹមស)', nameEn: 'Pounded yellow Khmer kroeung paste', amount: '៣ ស្លាបព្រាបាយ' },
      { nameKh: 'ប្រហុកសាច់ចិញ្ច្រាំ', nameEn: 'Minced prahok paste', amount: '១ ស្លាបព្រាបាយ' },
      { nameKh: 'ទឹកអំពិលទុំខាប់', nameEn: 'Ripe tamarind juice', amount: '៣ ស្លាបព្រាបាយ' },
      { nameKh: 'ត្រប់ស្រួយ និងត្រកួនស្រស់', nameEn: 'Crisp round eggplants and water spinach', amount: '២៥០ ក្រាម' },
      { nameKh: 'ស្លឹកក្រូចសើច ម្ទេសទុំ ទឹកត្រី និងស្ករត្នោត', nameEn: 'Kaffir lime leaves, chili, fish sauce, and palm sugar', amount: 'តាមចំណូលចិត្ត' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ដាក់ឆ្នាំងឆាគ្រឿងបុក និងប្រហុកចិញ្ច្រាំជាមួយប្រេងបន្តិចលើភ្លើងមធ្យមឱ្យឡើងក្លិនឈ្ងុយឈ្ងប់។', instructionEn: 'Sauté pounded yellow kroeung paste and minced prahok in a little oil over medium heat until deeply fragrant.' },
      { stepNumber: 2, instructionKh: 'ដាក់សាច់គោជាប់ខ្លាញ់ចូលឆាច្របល់ឱ្យរឹបសាច់ចូលជាតិគ្រឿង រួចចាក់ទឹកចូលរម្ងាស់រហូតដល់សាច់គោផុយទន់។', instructionEn: 'Add marbled beef and stir-fry until coated in kroeung, then pour in water and simmer until tender.' },
      { stepNumber: 3, instructionKh: 'ដាក់ត្រប់ស្រួយ និងទឹកអំពិលទុំចូល ថែមទឹកត្រី និងស្ករត្នោតបន្តិច ភ្លក្សរសជាតិឱ្យជូរប្រៃមុតល្មម។', instructionEn: 'Add halved round eggplants and tamarind juice, seasoning with fish sauce and a touch of palm sugar.' },
      { stepNumber: 4, instructionKh: 'បង់ត្រកួន ស្លឹកក្រូចសើច និងម្ទេសទុំ រម្ងាស់ ១ នាទីរួចលើកចុះ ទទួលទានជាមួយបាយក្តៅៗ។', instructionEn: 'Toss in water spinach, torn kaffir lime leaves, and fresh chilies; simmer 1 minute and serve hot with steamed rice.' },
    ],
  },
  {
    id: 'food-14',
    nameKh: 'សម្លស្ងោរជ្រក់សាច់មាន់',
    nameEn: 'Sour Lemon Herb Chicken Soup (Chhruk Moan)',
    categorySlug: 'soup',
    categoryKh: 'ម្ហូបស្ងោរ / រសជាតិជូរស្រាល',
    categoryEn: 'Soup / Lime Herb',
    descriptionKh: 'ស្ងោរជ្រក់មាន់ ជាម្ហូបស្រួលចម្អិន មានទឹកស៊ុបថ្លាក្រអូបគល់ស្លឹកគ្រៃ រំដេង ស្លឹកក្រូចសើច និងរសជាតិជូរពីទឹកក្រូចឆ្មាស្រស់ និងស្លឹកជីរនាងវង។',
    descriptionEn: 'Light and zesty chicken broth simmered with lemongrass, galangal, kaffir lime leaves, fresh lime juice, and generous holy basil.',
    photoUrl: '/foods/food-14.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-14.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '២៥ នាទី',
    servings: '៣ នាក់',
    calories: 230,
    difficulty: 'easy',
    priceRiel: 16000,
    priceUsd: 4.0,
    rating: 4.8,
    reviewCount: 94,
    ingredients: [
      { nameKh: 'សាច់មាន់ស្រែកាត់ដុំ', nameEn: 'Chicken cuts', amount: '៥០០ ក្រាម' },
      { nameKh: 'គល់ស្លឹកគ្រៃ រំដេង ស្លឹកក្រូចសើច', nameEn: 'Lemongrass, galangal, kaffir lime leaves', amount: '១ ចានតូច' },
      { nameKh: 'ទឹកក្រូចឆ្មាស្រស់', nameEn: 'Fresh lime juice', amount: '៣ ស្លាបព្រាបាយ' },
      { nameKh: 'ស្លឹកជីរនាងវង និងម្ទេសទុំ', nameEn: 'Holy basil leaves and fresh chilies', amount: '១ ក្តាប់' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ដាំទឹកឱ្យពុះ ដាក់គល់ស្លឹកគ្រៃ រំដេង និងសាច់មាន់ចូលស្ងោរឱ្យឆ្អិនទន់។', instructionEn: 'Boil aromatics and chicken until tender.' },
      { stepNumber: 2, instructionKh: 'បង់ផ្សិត និងភ្លក្សរសជាតិជាមួយទឹកត្រី អំបិល ស្ករ។', instructionEn: 'Add mushrooms and season with fish sauce.' },
      { stepNumber: 3, instructionKh: 'បិទភ្លើង រួចចាក់ទឹកក្រូចឆ្មា និងបង់ស្លឹកជីរនាងវងពីលើ។', instructionEn: 'Turn off heat, stir in lime juice and fresh basil.' },
    ],
  },
  {
    id: 'food-15',
    nameKh: 'សម្លម្ជូរត្រឡាច',
    nameEn: 'Winter Melon Sour Fish Soup',
    categorySlug: 'soup',
    categoryKh: 'ម្ហូបម្ជូរ / ស្រាលស្រទន់',
    categoryEn: 'Soup / Winter Melon',
    descriptionKh: 'សម្លម្ជូរត្រឡាច មានរសជាតិជូរស្រទន់ ត្រជាក់កាយ ចម្អិនពីត្រឡាចខ្ចីផ្អែមធម្មជាតិជាមួយត្រីស្រស់ ប្រហុកបន្តិច និងទឹកអំពិលទុំ បន្ថែមក្លិនឈ្ងុយដោយជីររណារ និងជីរម្អម។',
    descriptionEn: 'Mild and refreshing Cambodian sour soup featuring sweet tender winter melon chunks, fresh river fish steaks, gentle tamarind tang, and fragrant paddy herbs.',
    photoUrl: '/foods/food-15.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-15.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '២០ នាទី',
    servings: '៣ នាក់',
    calories: 210,
    difficulty: 'easy',
    priceRiel: 14000,
    priceUsd: 3.5,
    rating: 4.6,
    reviewCount: 39,
    ingredients: [
      { nameKh: 'ត្រីរ៉ស់ ឬត្រីឆ្ពិនស្រស់កាត់កង់', nameEn: 'Fresh river fish steaks', amount: '៤០០ ក្រាម' },
      { nameKh: 'ត្រឡាចខ្ចីចិតសំបកកាត់ដុំល្មម', nameEn: 'Young winter melon peeled and cubed', amount: '៤០០ ក្រាម' },
      { nameKh: 'ប្រហុកសាច់ និងគល់ស្លឹកគ្រៃដំ', nameEn: 'Prahok paste and bruised lemongrass stalk', amount: '១ ស្លាបព្រាបាយ' },
      { nameKh: 'ទឹកអំពិលទុំ', nameEn: 'Ripe tamarind juice', amount: '២ ស្លាបព្រាបាយ' },
      { nameKh: 'ទឹកត្រី អំបិល និងស្ករត្នោតបន្តិច', nameEn: 'Fish sauce, salt, and pinch of palm sugar', amount: '១ ស្លាបព្រាបាយ' },
      { nameKh: 'ជីររណារ ជីរម្អម និងម្ទេសទុំ', nameEn: 'Saw-leaf culantro, rice paddy herb, and chili', amount: '១ ក្តាប់' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'លាងសម្អាតត្រីកាត់ជាកង់ៗឱ្យស្អាត។ ចិតសំបកត្រឡាចខ្ចី ឆ្កៀលគ្រាប់ចេញ រួចហាន់ជាដុំល្មម។', instructionEn: 'Clean fresh river fish and cut into steaks. Peel young winter melon, remove seeds, and cut into bite-sized pieces.' },
      { stepNumber: 2, instructionKh: 'ដាំទឹកឱ្យពុះ បង់គល់ស្លឹកគ្រៃដំ និងរំលាយប្រហុកសាច់បន្តិច រួចដាក់ត្រឡាចចូលរម្ងាស់ឱ្យជិតឆ្អិនថ្លា។', instructionEn: 'Boil water with bruised lemongrass and a touch of prahok, then add winter melon and simmer until nearly translucent.' },
      { stepNumber: 3, instructionKh: 'ដាក់សាច់ត្រី និងទឹកអំពិលទុំចូល (កុំកូរខ្លាំងកុំឱ្យបែកសាច់ត្រី) ថែមទឹកត្រី អំបិល និងស្ករត្នោតបន្តិច។', instructionEn: 'Gently add fish steaks and tamarind juice without over-stirring; season with fish sauce, salt, and palm sugar.' },
      { stepNumber: 4, instructionKh: 'ពេលត្រីនិងត្រឡាចឆ្អិនល្អ បង់ជីររណារ ជីរម្អម និងម្ទេស រួចលើកចុះទទួលទានក្តៅៗ។', instructionEn: 'Once fish is flaky and melon tender, garnish with culantro, rice paddy herb, and chili, then serve hot.' },
    ],
  },
  {
    id: 'food-16',
    nameKh: 'សម្លការីសារ៉ាម៉ាន់សាច់គោ',
    nameEn: 'Royal Saraman Beef Curry',
    categorySlug: 'soup',
    categoryKh: 'ម្ហូបរាជវាំង / ការីពិសេស',
    categoryEn: 'Curry / Royal Saraman',
    descriptionKh: 'ការីសារ៉ាម៉ាន់ ជាកំពូលការីរាជវាំងខ្មែរដែលមានក្លិនឈ្ងុយគ្រឿងទេសបុកពិសេស អង្ករលីង សណ្តែកដីលីង និងខ្ទិះដូងខាប់ រម្ងាស់ជាមួយសាច់គោជាប់សរសៃផុយទន់។',
    descriptionEn: 'The rich royal Cambodian ceremonial beef curry infused with roasted spices, toasted peanuts, coconut cream, and melt-in-mouth beef shank.',
    photoUrl: '/foods/food-16.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-16.jpg',
    prepTime: '៣០ នាទី',
    cookTime: '៧០ នាទី',
    servings: '៤-៦ នាក់',
    calories: 550,
    difficulty: 'hard',
    priceRiel: 28000,
    priceUsd: 7.0,
    rating: 5.0,
    reviewCount: 168,
    isFeatured: true,
    ingredients: [
      { nameKh: 'សាច់គោជាប់សរសៃកាត់ដុំធំៗ', nameEn: 'Beef shank or brisket chunks', amount: '៧០០ ក្រាម' },
      { nameKh: 'គ្រឿងសារ៉ាម៉ាន់បុកលីងឈ្ងុយ', nameEn: 'Saraman toasted spice paste', amount: '៤ ស្លាបព្រាបាយ' },
      { nameKh: 'សណ្តែកដីលីងបុកគ្រើម', nameEn: 'Roasted crushed peanuts', amount: '៥០ ក្រាម' },
      { nameKh: 'ខ្ទិះដូងដើមខាប់', nameEn: 'Thick coconut cream', amount: '៥០០ មីលីលីត្រ' },
      { nameKh: 'ស្ករត្នោត និងទឹកអម្ពិលទុំ', nameEn: 'Palm sugar and tamarind', amount: '២ ស្លាបព្រាបាយ' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ឆាគ្រឿងសារ៉ាម៉ាន់ជាមួយក្បាលខ្ទិះឱ្យឡើងប្រេងក្រហមឈ្ងុយខ្លាំង។', instructionEn: 'Fry spices in coconut cream until fragrant red oil separates.' },
      { stepNumber: 2, instructionKh: 'ដាក់សាច់គោចូលឆាឱ្យស្រពាប់ រួចចាក់ទឹកខ្ទិះរាវចូល រម្ងាស់ភ្លើងតិចៗ ១ ម៉ោង។', instructionEn: 'Brown beef chunks, add coconut milk, and braise on low heat for 1 hour.' },
      { stepNumber: 3, instructionKh: 'រោយសណ្តែកដីលីងចូល ភ្លក្សរសជាតិឱ្យផ្អែមស្រទន់ ទទួលទានជាមួយបាយ ឬនំប៉័ង។', instructionEn: 'Stir in crushed peanuts and season with palm sugar and tamarind.' },
    ],
  },
  {
    id: 'food-17',
    nameKh: 'សម្លស្ងោរជ្រក់ត្រីរ៉ស់',
    nameEn: 'Snakehead Fish Sour Herb Soup (Sngor Chhruk Trei Ros)',
    categorySlug: 'soup',
    categoryKh: 'ម្ហូបស្ងោរ / ស្ងោរជ្រក់',
    categoryEn: 'Soup / Lime Herb Fish',
    descriptionKh: 'សម្លស្ងោរជ្រក់ត្រីរ៉ស់ មានទឹកស៊ុបថ្លាឈ្ងុយគល់ស្លឹកគ្រៃ រំដេង ស្លឹកក្រូចសើច និងខ្ទឹមសបំពង ចម្អិនជាមួយសាច់ត្រីរ៉ស់ស្រស់ផ្អែម ស្រក់ទឹកក្រូចឆ្មាស្រស់ និងបង់ជីរគ្រប់មុខ រសជាតិជូរស្រស់ស្រាយ។',
    descriptionEn: 'Refreshing clear Cambodian sour fish soup simmered with fresh snakehead fish steaks, lemongrass, galangal, kaffir lime leaves, straw mushrooms, fresh lime juice, crispy garlic, and aromatic herbs.',
    photoUrl: '/foods/food-17.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-17.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '២០ នាទី',
    servings: '៣ នាក់',
    calories: 230,
    difficulty: 'easy',
    priceRiel: 16000,
    priceUsd: 4.0,
    rating: 4.7,
    reviewCount: 45,
    ingredients: [
      { nameKh: 'ត្រីរ៉ស់ស្រស់កាត់កង់លាងស្អាត', nameEn: 'Fresh snakehead fish steaks', amount: '៤៥០ ក្រាម' },
      { nameKh: 'គល់ស្លឹកគ្រៃដំ រំដេង និងស្លឹកក្រូចសើច', nameEn: 'Bruised lemongrass, galangal, and kaffir lime leaves', amount: '១ ចានតូច' },
      { nameKh: 'ផ្សិតចំបើង (តាមចំណូលចិត្ត)', nameEn: 'Fresh straw mushrooms (halved)', amount: '១០០ ក្រាម' },
      { nameKh: 'ទឹកក្រូចឆ្មាស្រស់ និងម្ទេសអាចម៍សត្វ', nameEn: 'Fresh lime juice and bird-eye chilies', amount: '៣ ស្លាបព្រាបាយ' },
      { nameKh: 'ទឹកត្រី អំបិល និងស្ករត្នោតបន្តិច', nameEn: 'Fish sauce, salt, and pinch of palm sugar', amount: '១ ស្លាបព្រាបាយកន្លះ' },
      { nameKh: 'ជីររណារ ជីរម្អម ស្លឹកខ្ទឹម និងខ្ទឹមសបំពង', nameEn: 'Culantro, paddy herb, scallions, and crispy fried garlic', amount: '១ ក្តាប់' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'លាងសម្អាតត្រីរ៉ស់ជាមួយអំបិលឱ្យអស់រំអិល រួចកាត់ជាកង់ល្មម។', instructionEn: 'Rub snakehead fish with salt to remove slime, rinse clean, and cut into steaks.' },
      { stepNumber: 2, instructionKh: 'ដាំទឹកឱ្យពុះខ្លាំង បង់គល់ស្លឹកគ្រៃដំ រំដេង និងស្លឹកក្រូចសើចឱ្យចេញក្លិនឈ្ងុយប្រហើរ។', instructionEn: 'Bring water to a rolling boil with bruised lemongrass, sliced galangal, and kaffir lime leaves until fragrant.' },
      { stepNumber: 3, instructionKh: 'ដាក់សាច់ត្រីរ៉ស់ និងផ្សិតចំបើងចូលរម្ងាស់ឱ្យឆ្អិន (កុំកូរខ្លាំងឱ្យទឹកស៊ុបនៅថ្លា) រួចផ្សំរសជាតិដោយទឹកត្រី អំបិល និងស្ករត្នោតបន្តិច។', instructionEn: 'Gently add fish steaks and straw mushrooms without stirring; season with fish sauce, salt, and a pinch of sugar.' },
      { stepNumber: 4, instructionKh: 'បិទភ្លើង ស្រក់ទឹកក្រូចឆ្មាស្រស់ បង់ម្ទេស ជីររណារ ជីរម្អម និងរោយខ្ទឹមសបំពងពីលើ ដួសទទួលទានក្តៅៗ។', instructionEn: 'Turn off heat, stir in fresh lime juice, chilies, herbs, and crispy fried garlic, then serve piping hot.' },
    ],
  },
  {
    id: 'food-18',
    nameKh: 'សម្លកកូរត្រីឆ្លូញចេកខ្ចី',
    nameEn: 'Samlor Korko with Chhluonh Fish & Green Banana',
    categorySlug: 'soup',
    categoryKh: 'ម្ហូបកកូរ / ប្រពៃណី',
    categoryEn: 'Soup / Wild Fish Stew',
    descriptionKh: 'សម្លកកូរត្រីឆ្លូញចេកខ្ចី ជាម្ហូបអ្នកស្រែរដូវទឹកសម្រក។ ត្រីឆ្លូញសាច់ផ្អែមឆ្ងាញ់ ចេកខ្ចីផុយស្អិត លាយជាមួយស្លឹកបាស និងអង្ករលីងបុកឈ្ងុយ។',
    descriptionEn: 'Traditional post-monsoon stew using small, sweet wild spiny eels (chhluonh), young green bananas, and toasted rice.',
    photoUrl: '/foods/food-18.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-18.jpg',
    prepTime: '២៥ នាទី',
    cookTime: '៣០ នាទី',
    servings: '៣-៤ នាក់',
    calories: 280,
    difficulty: 'medium',
    priceRiel: 18000,
    priceUsd: 4.5,
    rating: 4.8,
    reviewCount: 56,
    ingredients: [
      { nameKh: 'ត្រីឆ្លូញស្រស់សម្អាតស្អាត', nameEn: 'Fresh small spiny eel fish', amount: '៤០០ ក្រាម' },
      { nameKh: 'ចេកខ្ចីចិតសំបក និងល្ហុង', nameEn: 'Green banana and green papaya', amount: '២៥០ ក្រាម' },
      { nameKh: 'គ្រឿងបុក និងអង្ករលីង', nameEn: 'Kroeung paste and toasted rice', amount: '៣ ស្លាបព្រាបាយ' },
      { nameKh: 'ស្លឹកបាស និងស្លឹកម្រុំ', nameEn: 'Wild ivy gourd greens', amount: '១ ចាន' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ឆាគ្រឿងបុក និងប្រហុក រួចដាក់ត្រីឆ្លូញចូលឆាថ្នមៗ។', instructionEn: 'Sauté kroeung and prahok, gently toss fish.' },
      { stepNumber: 2, instructionKh: 'ដាក់ចេកខ្ចី ចាក់ទឹកពុះ និងរោយអង្ករលីងចូលកូរឱ្យសព្វ។', instructionEn: 'Add green bananas, boiling water, and toasted rice.' },
      { stepNumber: 3, instructionKh: 'បង់ស្លឹកបាស និងស្លឹកម្រុំ រួចលើកចុះទទួលទាន។', instructionEn: 'Add wild greens, season and serve.' },
    ],
  },

  // ==========================================
  // CATEGORY 2: ម្ហូបអាំង (GRILLED & BBQ) - 15 Dishes
  // ==========================================
  {
    id: 'food-19',
    nameKh: 'សាច់គោអាំងទឹកប្រហុក',
    nameEn: 'Grilled Beef with Prahok Dipping Sauce',
    categorySlug: 'grilled',
    categoryKh: 'ម្ហូបអាំង / កំពូលម្ហូបខ្មែរ',
    categoryEn: 'Grilled / Signature',
    descriptionKh: 'សាច់គោខ្មែរប្រឡាក់គ្រឿងអាំងលើរងើកភ្លើងធ្យូងឱ្យនៅឈាមតិចៗ (Medium rare) ហាន់ជាបន្ទះស្ដើង ទទួលទានជាមួយទឹកប្រហុកបុកម្ទេសក្រូចឆ្មា និងបន្លែអន្លក់ស្រស់ (ចេកខ្ចី ត្រប់ស្រួយ ម្នាស់ ត្រសក់)។',
    descriptionEn: 'Tender marinated beef seared over fragrant charcoal, served with the iconic fiery lime-prahok dipping sauce and crisp raw farm crudités.',
    photoUrl: '/foods/food-19.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-19.jpg',
    prepTime: '២០ នាទី',
    cookTime: '១៥ នាទី',
    servings: '៣-៤ នាក់',
    calories: 410,
    difficulty: 'easy',
    priceRiel: 24000,
    priceUsd: 6.0,
    rating: 4.9,
    reviewCount: 310,
    isFeatured: true,
    ingredients: [
      { nameKh: 'សាច់គោផុយ ឬសាច់សម្លាក់', nameEn: 'Beef tenderloin or sirloin', amount: '៥០០ ក្រាម' },
      { nameKh: 'ប្រហុកសាច់ចិញ្ច្រាំដាំឱ្យឆ្អិន', nameEn: 'Cooked prahok paste for sauce', amount: '២ ស្លាបព្រាបាយ' },
      { nameKh: 'ទឹកក្រូចឆ្មា ម្ទេសខ្ទឹម ស្ករត្នោត', nameEn: 'Lime juice, garlic, chilies, palm sugar', amount: 'សម្រាប់ទឹកជ្រលក់' },
      { nameKh: 'បន្លែអន្លក់ (ចេកខ្ចី ត្រប់ ត្រសក់ ម្នាស់ ជីរ)', nameEn: 'Raw green banana, eggplant, cucumber, pineapple, herbs', amount: '១ ថាស' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ប្រឡាក់សាច់គោជាមួយប្រេងខ្យង ខ្ទឹមស ម្រេចកំពត និងស្ករត្នោត ១៥ នាទី។', instructionEn: 'Marinate beef in oyster sauce, garlic, Kampot pepper, and palm sugar.' },
      { stepNumber: 2, instructionKh: 'អាំងលើរងើកភ្លើងធ្យូងឱ្យឆ្អិនខាងក្រៅ ខាងក្នុងនៅទន់ពណ៌ផ្កាឈូក។', instructionEn: 'Grill over hot coals until charred outside yet pink and tender inside.' },
      { stepNumber: 3, instructionKh: 'ធ្វើទឹកប្រហុកដោយលាយប្រហុក ក្រូចឆ្មា ម្ទេស ខ្ទឹមស ស្លឹកក្រូចសើចហាន់ និងស្ករត្នោត។', instructionEn: 'Pound prahok with lime juice, crushed chilies, lemongrass, and sugar for the dip.' },
    ],
  },
  {
    id: 'food-20',
    nameKh: 'ត្រីរ៉ស់អាំងអំបិលម្ទេស',
    nameEn: 'Salt & Chili Grilled Snakehead Fish',
    categorySlug: 'grilled',
    categoryKh: 'ម្ហូបអាំង / ប្រពៃណី',
    categoryEn: 'Grilled / Traditional',
    descriptionKh: 'ត្រីរ៉ស់ស្រស់ៗ ប្រឡាក់អំបិលម្ទេសអាំងលើធ្យូងទាំងមូលឱ្យស្រួយស្បែកក្រៅ សាច់ខាងក្នុងទន់ផ្អែម ទទួលទានជាមួយបាយដំណើបក្តៅៗ ទឹកត្រីអំពិលទុំ ឬអំបិលម្ទេសក្រូចឆ្មារ។',
    descriptionEn: 'Whole river snakehead fish rubbed with coarse sea salt and chili, charcoal-grilled to crispy-skinned perfection and served with sticky rice and spicy tamarind or chili-lime dip.',
    photoUrl: '/foods/food-20.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-20.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '២៥ នាទី',
    servings: '២-៣ នាក់',
    calories: 340,
    difficulty: 'easy',
    priceRiel: 20000,
    priceUsd: 5.0,
    rating: 4.8,
    reviewCount: 175,
    ingredients: [
      { nameKh: 'ត្រីរ៉ស់ទម្ងន់ ១ គីឡូក្រាម', nameEn: 'Fresh river snakehead fish (1kg)', amount: '១ ក្បាល' },
      { nameKh: 'បាយដំណើបចំហុយ', nameEn: 'Steamed sticky rice', amount: '១ ចាន' },
      { nameKh: 'គល់ស្លឹកគ្រៃញាត់ក្នុងពោះត្រី', nameEn: 'Lemongrass stalk for cavity', amount: '២ គល់' },
      { nameKh: 'អំបិលគ្រួស និងម្ទេសបុក', nameEn: 'Coarse sea salt and pounded chili', amount: 'តាមចំណូលចិត្ត' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'វះពោះត្រីសម្អាតស្អាត ញាត់គល់ស្លឹកគ្រៃ និងរំដេងក្នុងពោះត្រីដើម្បីបំបាត់ឆ្អាប។', instructionEn: 'Clean fish, stuff cavity with crushed lemongrass and galangal.' },
      { stepNumber: 2, instructionKh: 'ប្រឡាក់អំបិលគ្រួសលាយម្ទេសក្រៅស្បែកត្រី រួចអាំងលើរងើកភ្លើងធ្យូងមធ្យមឱ្យឆ្អិនសព្វ។', instructionEn: 'Rub skin with coarse chili salt and grill over medium embers until golden.' },
      { stepNumber: 3, instructionKh: 'ទទួលទានជាមួយបាយដំណើប និងទឹកត្រីកោះកុង ឬទឹកអំពិលទុំ។', instructionEn: 'Serve with sticky rice and zesty dipping sauce.' },
    ],
  },
  {
    id: 'food-21',
    nameKh: 'មាន់ដុតច្រាំងទន្លេកំពត',
    nameEn: 'Kampot Roasted Herbal Chicken',
    categorySlug: 'grilled',
    categoryKh: 'ម្ហូបដុត / ពិសេស',
    categoryEn: 'Roasted / Specialty',
    descriptionKh: 'មាន់ស្រែទាំងមូល ប្រឡាក់គ្រឿងបុកខ្មែរ រមៀត និងម្រេចខ្មៅកំពត ដុតក្នុងដី ឬអាំងលើធ្យូងរហូតស្បែកស្រួយពណ៌មាស សាច់ទន់ឈ្ងុយពិសេស។',
    descriptionEn: 'Whole free-range chicken rubbed with turmeric lemongrass kroeung and freshly crushed Kampot pepper, roasted to crispy golden deliciousness.',
    photoUrl: '/foods/food-21.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-21.jpg',
    prepTime: '៣០ នាទី',
    cookTime: '៤៥ នាទី',
    servings: '៤ នាក់',
    calories: 480,
    difficulty: 'medium',
    priceRiel: 32000,
    priceUsd: 8.0,
    rating: 4.9,
    reviewCount: 230,
    isFeatured: true,
    ingredients: [
      { nameKh: 'មាន់ស្រែស្រស់ទាំងមូល', nameEn: 'Whole free-range chicken', amount: '១ ក្បាល (១.២ គីឡូ)' },
      { nameKh: 'គ្រឿងបុកខ្មែរ និងរមៀត', nameEn: 'Lemongrass turmeric marinade', amount: '៤ ស្លាបព្រាបាយ' },
      { nameKh: 'ម្រេចខ្មៅកំពតបុកម៉ត់', nameEn: 'Crushed Kampot black pepper', amount: '១ ស្លាបព្រាបាយ' },
      { nameKh: 'ទឹកឃ្មុំព្រៃ និងទឹកត្រី', nameEn: 'Wild honey and fish sauce', amount: '២ ស្លាបព្រាបាយ' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ប្រឡាក់មាន់ជាមួយគ្រឿងបុក ទឹកឃ្មុំ ទឹកត្រី និងម្រេចកំពត រយៈពេល ១ ម៉ោង។', instructionEn: 'Marinate chicken in herbs, honey, and pepper for 1 hour.' },
      { stepNumber: 2, instructionKh: 'ដុត ឬអាំងលើភ្លើងធ្យូងរម្ងាស់ឱ្យឆ្អិនសព្វដល់ខាងក្នុង និងស្បែកឡើងពណ៌មាស។', instructionEn: 'Roast over slow coals until deeply browned and fragrant.' },
      { stepNumber: 3, instructionKh: 'កាត់ជាដុំៗ ទទួលទានជាមួយទឹកជ្រលក់ម្រេចក្រូចឆ្មា និងបន្លែជ្រក់។', instructionEn: 'Chop and serve with lime pepper sauce and pickled vegetables.' },
    ],
  },
  {
    id: 'food-22',
    nameKh: 'កង្កែបអាំងសៀមរាប',
    nameEn: 'Siem Reap Spiced Grilled Frogs',
    categorySlug: 'grilled',
    categoryKh: 'ម្ហូបអាំង / ឯកទេសខ្មែរ',
    categoryEn: 'Grilled / Delicacy',
    descriptionKh: 'កង្កែបអាំងសៀមរាប ជាម្ហូបឯកទេសខ្មែរដ៏ល្បីល្បាញ។ យកកង្កែបស្រែធំៗប្រឡាក់ ឬញាត់ជាមួយសាច់ជ្រូក សណ្តែកដី គ្រឿងបុកស្លឹកគ្រៃ និងស្លឹកក្រូចសើច ហើយគាបអាំងលើធ្យូងឱ្យឈ្ងុយឆ្ងាញ់។',
    descriptionEn: 'Signature Siem Reap culinary specialty: plump field frogs seasoned and stuffed with a savory blend of minced pork, roasted peanuts, and lemongrass kroeung, charcoal-grilled until golden.',
    photoUrl: '/foods/food-22.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-22.jpg',
    prepTime: '៣៥ នាទី',
    cookTime: '២០ នាទី',
    servings: '២-៣ នាក់',
    calories: 320,
    difficulty: 'hard',
    priceRiel: 20000,
    priceUsd: 5.0,
    rating: 4.7,
    reviewCount: 88,
    ingredients: [
      { nameKh: 'កង្កែបស្រែធំៗលាងស្អាត', nameEn: 'Large whole cleaned farm frogs', amount: '៤-៦ ក្បាល' },
      { nameKh: 'សាច់ជ្រូកចិញ្ច្រាំ', nameEn: 'Minced pork', amount: '២០០ ក្រាម' },
      { nameKh: 'គ្រឿងបុកខ្មែរ និងសណ្តែកដីលីង', nameEn: 'Kroeung paste and crushed peanuts', amount: '៣ ស្លាបព្រាបាយ' },
      { nameKh: 'ស្លឹកក្រូចសើចហាន់', nameEn: 'Kaffir lime leaves thinly sliced', amount: '១ ស្លាបព្រាបាយ' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'លាយសាច់ជ្រូក គ្រឿងបុក សណ្តែកដី ស្ករត្នោត និងគ្រឿងផ្សំឱ្យចូលគ្នាសព្វ។', instructionEn: 'Mix minced pork, kroeung, crushed peanuts, and seasoning thoroughly.' },
      { stepNumber: 2, instructionKh: 'ញាត់សាច់ល្បាយចូលក្នុងខ្លួនកង្កែបឱ្យណែនល្អ រួចចងជើងកង្កែប។', instructionEn: 'Stuff the frog bodies firmly with mixture and secure legs.' },
      { stepNumber: 3, instructionKh: 'គាបអាំងលើធ្យូងភ្លើងមធ្យម ២០ នាទី រហូតស្បែកស្រួយឡើងក្រហមឈ្ងុយ។', instructionEn: 'Clamp in bamboo grill and roast slowly for 20 minutes until crisp.' },
    ],
  },
  {
    id: 'food-23',
    nameKh: 'មឹកអាំងអំបិលម្ទេស',
    nameEn: 'Grilled Squid with Salt and Chili',
    categorySlug: 'grilled',
    categoryKh: 'ម្ហូបអាំង / គ្រឿងសមុទ្រ',
    categoryEn: 'Grilled / Seafood',
    descriptionKh: 'មឹកបំពង់ស្រស់ៗទើបស្រង់ពីសមុទ្រកែប ប្រឡាក់អំបិលម្ទេសខ្ទឹមស អាំងលើធ្យូងភ្លើងក្តៅខ្លាំងឱ្យស្រួយផ្អែម ទទួលទានជាមួយទឹកត្រីកោះកុងហឹរជូរអែម។',
    descriptionEn: 'Fresh coastal squid marinated in crushed sea salt, red chilies, and garlic, char-grilled quickly over glowing embers and served with zesty Koh Kong seafood dipping sauce.',
    photoUrl: '/foods/food-23.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-23.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '១០ នាទី',
    servings: '២-៣ នាក់',
    calories: 290,
    difficulty: 'easy',
    priceRiel: 22000,
    priceUsd: 5.5,
    rating: 4.9,
    reviewCount: 195,
    ingredients: [
      { nameKh: 'មឹកបំពង់ស្រស់ៗធំល្មម', nameEn: 'Fresh whole ocean squid', amount: '៥០០ ក្រាម' },
      { nameKh: 'អំបិលគ្រួស ម្ទេសក្រហម និងខ្ទឹមសបុក', nameEn: 'Crushed coarse sea salt, red chilies, and garlic', amount: '២ ស្លាបព្រាបាយ' },
      { nameKh: 'ប្រេងឆា និងទឹកក្រូចឆ្មាបន្តិច', nameEn: 'Cooking oil and splash of lime juice', amount: '១ ស្លាបព្រាបាយ' },
      { nameKh: 'ទឹកត្រីកោះកុង (ម្ទេស ខ្ទឹមស ក្រូចឆ្មា ទឹកត្រី ស្ករ)', nameEn: 'Koh Kong spicy chili-lime seafood dip', amount: '១ ចានតូច' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'លាងសម្អាតមឹកឱ្យស្អាត ស្រង់ឱ្យស្ងួតទឹក រួចឆូតក្រឡាឆ្នូតៗលើខ្នងមឹកដើម្បីឱ្យងាយចូលជាតិគ្រឿង។', instructionEn: 'Clean squid thoroughly, pat dry, and score light crosshatch lines across the body.' },
      { stepNumber: 2, instructionKh: 'បុកអំបិលគ្រួស ម្ទេសក្រហម និងខ្ទឹមសឱ្យម៉ត់ល្មម លាយប្រេងឆាបន្តិច រួចយកមកលាបប្រឡាក់លើមឹកទុក ១០ នាទី។', instructionEn: 'Pound coarse salt, red chilies, and garlic with a touch of oil, then rub evenly over the squid for 10 minutes.' },
      { stepNumber: 3, instructionKh: 'ដាក់អាំងលើរងើកភ្លើងធ្យូងក្តៅខ្លាំងត្រឹម ៥-៧ នាទី ប្រែសងខាងឱ្យឡើងពណ៌ក្រហមឈ្ងុយ សាច់មឹកនៅទន់ស្រួយមិនស្វិត។', instructionEn: 'Grill over hot charcoal embers for 5-7 minutes, turning occasionally until lightly charred yet tender and snappy.' },
      { stepNumber: 4, instructionKh: 'កាត់មឹកជាកង់ៗ រៀបដាក់ចាន ទទួលទានក្តៅៗជ្រលក់ទឹកត្រីកោះកុង។', instructionEn: 'Slice grilled squid into rings and serve immediately with spicy Koh Kong lime dipping sauce.' },
    ],
  },
  {
    id: 'food-24',
    nameKh: 'ពោះជ្រូកអាំងទឹកឃ្មុំ',
    nameEn: 'Honey Pepper Roasted Pork Belly',
    categorySlug: 'grilled',
    categoryKh: 'ម្ហូបអាំង / អាហារសម្រន់',
    categoryEn: 'Grilled / Pork',
    descriptionKh: 'ពោះជ្រូកបីជាន់ប្រឡាក់ទឹកឃ្មុំព្រៃ ខ្ទឹមស និងម្រេចកំពត អាំងលើធ្យូងឱ្យស្រួយស្បែក ខ្លាញ់ស្រក់ឈ្ងុយៗ ទទួលទានជាមួយជ្រក់ត្រសក់។',
    descriptionEn: 'Crispy charcoal-roasted pork belly glazed with wild honey and cracked Kampot black pepper, served alongside quick pickled cucumbers.',
    photoUrl: '/foods/food-24.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-24.jpg',
    prepTime: '២០ នាទី',
    cookTime: '៣០ នាទី',
    servings: '៣ នាក់',
    calories: 490,
    difficulty: 'medium',
    priceRiel: 20000,
    priceUsd: 5.0,
    rating: 4.8,
    reviewCount: 142,
    ingredients: [
      { nameKh: 'សាច់ជ្រូកបីជាន់ស្បែកស្ដើង', nameEn: 'Pork belly strip', amount: '៥០០ ក្រាម' },
      { nameKh: 'ទឹកឃ្មុំព្រៃ និងទឹកស៊ីអ៊ីវ', nameEn: 'Wild honey and soy sauce', amount: '២ ស្លាបព្រាបាយ' },
      { nameKh: 'ម្រេចខ្មៅកំពត និងខ្ទឹមស', nameEn: 'Kampot black pepper and garlic', amount: '១ ស្លាបព្រាបាយ' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ចាក់ទម្លុះស្បែកជ្រូក និងប្រឡាក់គ្រឿងផ្អាប់ទុក ៣០ នាទី។', instructionEn: 'Prick pork skin and marinate with honey, soy, and garlic.' },
      { stepNumber: 2, instructionKh: 'អាំងលើភ្លើងធ្យូងរម្ងាស់ឱ្យស្បែកឡើងពពុះស្រួយ។', instructionEn: 'Roast skin-side down first until crackling and crisp.' },
      { stepNumber: 3, instructionKh: 'ហាន់ជាចំណិតស្តើងៗ ទទួលទានជាមួយជ្រក់ត្រសក់។', instructionEn: 'Slice thinly and serve with pickled cucumber.' },
    ],
  },
  {
    id: 'food-25',
    nameKh: 'បង្គាអាំងអំបិលម្ទេសកែប',
    nameEn: 'Kep Salt & Chili Grilled Prawns',
    categorySlug: 'grilled',
    categoryKh: 'ម្ហូបអាំង / គ្រឿងសមុទ្រ',
    categoryEn: 'Grilled / Prawns',
    descriptionKh: 'បង្គាសមុទ្រធំៗស្រស់ៗ ប្រឡាក់អំបិលម្ទេសខ្ទឹមស អាំងលើធ្យូងឱ្យឡើងក្រហមឈ្ងុយ សាច់ផ្អែមណែន ទទួលទានជាមួយទឹកក្រូចឆ្មា។',
    descriptionEn: 'Jumbo sea prawns tossed in sea salt, fresh garlic, and red chilies, grilled in their shells over charcoal for natural sweetness.',
    photoUrl: '/foods/food-25.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-25.jpg',
    prepTime: '១០ នាទី',
    cookTime: '១០ នាទី',
    servings: '២-៣ នាក់',
    calories: 260,
    difficulty: 'easy',
    priceRiel: 24000,
    priceUsd: 6.0,
    rating: 4.9,
    reviewCount: 160,
    ingredients: [
      { nameKh: 'បង្គាសមុទ្រស្រស់', nameEn: 'Fresh ocean tiger prawns', amount: '៥០០ ក្រាម' },
      { nameKh: 'អំបិលគ្រួស ម្ទេសក្រហម ខ្ទឹមស', nameEn: 'Sea salt, red chilies, garlic', amount: '២ ស្លាបព្រាបាយ' },
      { nameKh: 'ក្រូចឆ្មាស្រស់', nameEn: 'Fresh lime wedges', amount: '២ ផ្លែ' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'កាត់ពុកបង្គា ច្របល់អំបិលម្ទេសខ្ទឹមសឱ្យសព្វ។', instructionEn: 'Trim prawns and coat evenly with salt and crushed chili.' },
      { stepNumber: 2, instructionKh: 'អាំងលើធ្យូង ៤-៥ នាទីក្នុងមួយចំហៀងរហូតដល់សំបកឡើងក្រហមស្រួយ។', instructionEn: 'Grill 4-5 minutes per side until shells turn vibrant orange.' },
      { stepNumber: 3, instructionKh: 'ច្របាច់ទឹកក្រូចឆ្មាពីលើទទួលទានភ្លាមៗ។', instructionEn: 'Squeeze fresh lime juice over hot prawns and enjoy.' },
    ],
  },

  // ==========================================
  // CATEGORY 3: ម្ហូបឆា-បំពង (STIR-FRIED & CRISPY) - 16 Dishes
  // ==========================================
  {
    id: 'food-26',
    nameKh: 'ឡុកឡាក់សាច់គោម្រេចកំពត',
    nameEn: 'Beef Lok Lak with Kampot Pepper',
    categorySlug: 'stirfry',
    categoryKh: 'ម្ហូបឆា / ពិសេស',
    categoryEn: 'Stir-fry / Special',
    descriptionKh: 'ឡុកឡាក់សាច់គោ ជាម្ហូបឆាដ៏ល្បីល្បាញ ដែលមានសាច់គោផុយទន់ ឆាលើភ្លើងខ្លាំងជាមួយទឹកស៊ីអ៊ីវ ខ្ទឹមស និងប្រេងខ្យង។ ទទួលទានជាមួយបាយក្តៅៗ បន្លែស្រស់ និងទឹកជ្រលក់ម្រេចកំពតក្រូចឆ្មា។',
    descriptionEn: 'Iconic stir-fried tender marinated beef cubes seared over intense heat, served over crisp salad, sliced onions, tomatoes, and the classic lime-Kampot pepper dip.',
    photoUrl: '/foods/food-26.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-26.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '១០ នាទី',
    servings: '២-៣ នាក់',
    calories: 420,
    difficulty: 'easy',
    priceRiel: 22000,
    priceUsd: 5.5,
    rating: 4.9,
    reviewCount: 215,
    isFeatured: true,
    ingredients: [
      { nameKh: 'សាច់គោផុយហាន់ដុំការ៉េ', nameEn: 'Beef tenderloin cubed', amount: '៤០០ ក្រាម' },
      { nameKh: 'ប្រេងខ្យង ទឹកស៊ីអ៊ីវ ស្ករត្នោត', nameEn: 'Oyster sauce, soy sauce, palm sugar', amount: '២ ស្លាបព្រាបាយ' },
      { nameKh: 'បន្លែអម (សាឡាត់ ប៉េងប៉ោះ ខ្ទឹមបារាំង)', nameEn: 'Lettuce, tomatoes, red onion slices', amount: '១ ចាន' },
      { nameKh: 'ម្រេចខ្មៅកំពត និងក្រូចឆ្មា', nameEn: 'Kampot black pepper and lime juice', amount: 'សម្រាប់ទឹកជ្រលក់' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ប្រឡាក់សាច់គោជាមួយទឹកស៊ីអ៊ីវ ប្រេងខ្យង ស្ករត្នោត ១៥ នាទី។', instructionEn: 'Marinate beef in soy sauce, oyster sauce, and sugar for 15 minutes.' },
      { stepNumber: 2, instructionKh: 'រៀបបន្លែសាឡាត់ ប៉េងប៉ោះ ខ្ទឹមបារាំងលើចាន។', instructionEn: 'Arrange lettuce, tomatoes, and onions on a plate.' },
      { stepNumber: 3, instructionKh: 'ឆាសាច់គោលើភ្លើងខ្លាំងយ៉ាងលឿន ៣-៥ នាទី រួចចាក់ពីលើបន្លែ។', instructionEn: 'Sear beef rapidly over high heat for 3-5 minutes and pour over salad.' },
    ],
  },
  {
    id: 'food-27',
    nameKh: 'ក្តាមសេះឆាម្រេចខ្ចីកំពត',
    nameEn: 'Fried Flower Crab with Green Kampot Peppercorns',
    categorySlug: 'stirfry',
    categoryKh: 'ម្ហូបឆា / គ្រឿងសមុទ្រ',
    categoryEn: 'Stir-fry / Seafood',
    descriptionKh: 'ក្តាមសេះស្រស់ៗពីផ្សារក្តាមខេត្តកែប ឆាជាមួយកួរម្រេចខ្ចីកំពតដ៏ក្រអូបឈ្ងុយឈ្ងប់ ខ្ទឹមស និងទឹកត្រី រសជាតិផ្អែមសាច់ក្តាមធម្មជាតិ។',
    descriptionEn: 'Sweet blue swimmer crabs stir-fried with fragrant clusters of young green Kampot peppercorns, garlic, and oyster sauce right at the seaside.',
    photoUrl: '/foods/food-27.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-27.jpg',
    prepTime: '២០ នាទី',
    cookTime: '១៥ នាទី',
    servings: '២-៣ នាក់',
    calories: 340,
    difficulty: 'medium',
    priceRiel: 28000,
    priceUsd: 7.0,
    rating: 5.0,
    reviewCount: 380,
    isFeatured: true,
    ingredients: [
      { nameKh: 'ក្តាមសេះស្រស់កាប់ជាដុំ', nameEn: 'Fresh blue swimmer crabs cleaned and halved', amount: '៣-៤ ក្បាល' },
      { nameKh: 'កួរម្រេចខ្ចីកំពតបេះជាចង្កោម', nameEn: 'Fresh green Kampot peppercorn sprigs', amount: '៥ ចង្កោម' },
      { nameKh: 'ខ្ទឹមសចិញ្ច្រាំ និងប្រេងខ្យង', nameEn: 'Minced garlic and oyster sauce', amount: '២ ស្លាបព្រាបាយ' },
      { nameKh: 'ស្លឹកខ្ទឹម និងស្ករត្នោត', nameEn: 'Scallions and palm sugar', amount: '១ ស្លាបព្រាបាយ' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ដំខ្ទឹមសបំពងឱ្យឈ្ងុយ ដាក់កួរម្រេចខ្ចីកំពតចូលឆាឱ្យឈ្ងុយ។', instructionEn: 'Sauté minced garlic and green peppercorns until deeply aromatic.' },
      { stepNumber: 2, instructionKh: 'ដាក់ក្តាមចូលឆាត្រឡប់ គ្របឆ្នាំង ២ នាទីឱ្យសាច់ក្តាមឆ្អិនក្រហម។', instructionEn: 'Add crab pieces, cover wok for 2 minutes to cook in its own sweet steam.' },
      { stepNumber: 3, instructionKh: 'ថែមប្រេងខ្យង ស្ករត្នោត ទឹកត្រី និងស្លឹកខ្ទឹម ឆាច្របល់លើកចុះ។', instructionEn: 'Season with oyster sauce, palm sugar, fish sauce, and scallions.' },
    ],
  },
  {
    id: 'food-28',
    nameKh: 'ឆាក្តៅសាច់មាន់ស្រែស្លឹកកន្ទួត',
    nameEn: 'Spicy Lemongrass Basil Chicken (Cha Kdao)',
    categorySlug: 'stirfry',
    categoryKh: 'ម្ហូបឆា / រសជាតិហឹរ',
    categoryEn: 'Stir-fry / Spicy',
    descriptionKh: 'ឆាក្តៅ ជាម្ហូបឆាខ្មែររសជាតិហឹរឈ្ងុយខ្លាំង ប្រើគ្រឿងបុកស្លឹកគ្រៃ ម្ទេសស្រស់ ម្រះព្រៅ និងសាច់មាន់ស្រែ ញ៉ាំបែកញើសឆ្ងាញ់បាយ។',
    descriptionEn: 'A fiery Cambodian stir-fry featuring farm chicken pieces wok-tossed with crushed kroeung, fresh red chilies, holy basil, and green peppercorns.',
    photoUrl: '/foods/food-28.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-28.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '១២ នាទី',
    servings: '៣ នាក់',
    calories: 360,
    difficulty: 'easy',
    priceRiel: 18000,
    priceUsd: 4.5,
    rating: 4.8,
    reviewCount: 118,
    ingredients: [
      { nameKh: 'សាច់មាន់ស្រែកាត់ដុំតូចៗ', nameEn: 'Free-range chicken bite-sized pieces', amount: '៤៥០ ក្រាម' },
      { nameKh: 'គ្រឿងបុកស្លឹកគ្រៃខ្មែរ', nameEn: 'Fresh lemongrass kroeung', amount: '៣ ស្លាបព្រាបាយ' },
      { nameKh: 'ស្លឹកម្រះព្រៅ ឬជីរនាងវង', nameEn: 'Holy basil leaves', amount: '១ ក្តាប់ធំ' },
      { nameKh: 'ម្ទេសក្រហមហាន់បញ្ឆិត', nameEn: 'Sliced red bird eye chilies', amount: '១ ស្លាបព្រាបាយ' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ដាក់ប្រេងឆាគ្រឿងបុក និងម្ទេសឱ្យឈ្ងុយខ្លាំង។', instructionEn: 'Heat oil, stir-fry kroeung and sliced chilies until aromatic.' },
      { stepNumber: 2, instructionKh: 'ដាក់សាច់មាន់ចូលឆាលើភ្លើងខ្លាំងរហូតដល់សាច់ឆ្អិនរមាស់។', instructionEn: 'Toss chicken in at high heat until thoroughly browned and tender.' },
      { stepNumber: 3, instructionKh: 'ភ្លក្សរសជាតិប្រៃផ្អែម រួចបង់ស្លឹកម្រះព្រៅកូរត្រឡប់បិទភ្លើងភ្លាមៗ។', instructionEn: 'Season, fold in holy basil, and immediately remove from heat.' },
    ],
  },
  {
    id: 'food-29',
    nameKh: 'ឆាខ្ញីសាច់ជ្រូកខ្មែរ',
    nameEn: 'Stir-Fried Pork with Ginger (Cha Knyei)',
    categorySlug: 'stirfry',
    categoryKh: 'ម្ហូបឆា / ប្រពៃណី',
    categoryEn: 'Stir-fry / Ginger',
    descriptionKh: 'ឆាខ្ញីសាច់ជ្រូក ប្រើខ្ញីខ្ចីហាន់សរសៃច្រើនៗ ឆាជាមួយសាច់ជ្រូក និងសណ្តែកសៀងផ្អែម (ស៊ីអ៊ីវខាប់) ជួយសម្រួលរំលាយអាហារ និងមានក្លិនឈ្ងុយស្រួលពិសា។',
    descriptionEn: 'Tender pork strips stir-fried with generous mountains of julienned young ginger, sweet fermented black beans, and scallions.',
    photoUrl: '/foods/food-29.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-29.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '១០ នាទី',
    servings: '៣ នាក់',
    calories: 340,
    difficulty: 'easy',
    priceRiel: 16000,
    priceUsd: 4.0,
    rating: 4.7,
    reviewCount: 92,
    ingredients: [
      { nameKh: 'សាច់ជ្រូកហាន់ស្ដើង', nameEn: 'Pork loin sliced thinly', amount: '៣៥០ ក្រាម' },
      { nameKh: 'ខ្ញីខ្ចីហាន់សរសៃតូចៗ', nameEn: 'Fresh young ginger shredded', amount: '១៥០ ក្រាម' },
      { nameKh: 'សណ្តែកសៀងខាប់ (តៅហ៊ូ)', nameEn: 'Sweet fermented bean sauce', amount: '១ ស្លាបព្រាបាយ' },
      { nameKh: 'ខ្ទឹមស និងស្លឹកខ្ទឹម', nameEn: 'Garlic and spring onions', amount: '២ ដើម' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'បំពងខ្ទឹមសឱ្យឈ្ងុយ ដាក់សាច់ជ្រូកចូលឆាឱ្យឆ្អិន។', instructionEn: 'Sauté garlic, add pork slices and brown lightly.' },
      { stepNumber: 2, instructionKh: 'ដាក់ខ្ញីហាន់សរសៃ និងសណ្តែកសៀងចូលឆាច្របល់លើភ្លើងខ្លាំង។', instructionEn: 'Add shredded ginger and fermented beans, toss vigorously.' },
      { stepNumber: 3, instructionKh: 'បង់ស្លឹកខ្ទឹម ភ្លក្សរសជាតិ រួចដួសដាក់ចាន។', instructionEn: 'Garnish with spring onions and transfer to serving dish.' },
    ],
  },
  {
    id: 'food-30',
    nameKh: 'ឆាត្រកួនជាមួយគ្រឿងក្នុងមាន់',
    nameEn: 'Stir-Fried Morning Glory with Chicken Giblets',
    categorySlug: 'stirfry',
    categoryKh: 'ម្ហូបឆា / បន្លែ និងសាច់',
    categoryEn: 'Stir-fry / Morning Glory & Giblets',
    descriptionKh: 'ឆាត្រកួនស្រស់ៗលើភ្លើងខ្លាំងជាមួយខ្ទឹមស គ្រឿងក្នុងមាន់ និងប្រេងខ្យង ឱ្យត្រកួននៅស្រួយស្រស់ពណ៌បៃតង និងគ្រឿងក្នុងមាន់ឆ្អិនទន់ឈ្ងុយ ទទួលទានជាមួយបាយក្តៅៗ។',
    descriptionEn: 'Crisp fresh morning glory (water spinach) flash-fried over high wok heat with tender chicken giblets, crushed garlic, chilies, and savory oyster sauce.',
    photoUrl: '/foods/food-30.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-30.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '៨ នាទី',
    servings: '២-៣ នាក់',
    calories: 240,
    difficulty: 'easy',
    priceRiel: 10000,
    priceUsd: 2.5,
    rating: 4.8,
    reviewCount: 150,
    ingredients: [
      { nameKh: 'ត្រកួនស្រស់បេះកាត់កង់ៗ', nameEn: 'Fresh morning glory cut into segments', amount: '៣៥០ ក្រាម' },
      { nameKh: 'គ្រឿងក្នុងមាន់ (កោះ ថ្លើម បេះដូង) ហាន់ចំណិត', nameEn: 'Cleaned chicken giblets (gizzard, liver, heart), sliced', amount: '២៥០ ក្រាម' },
      { nameKh: 'ខ្ទឹមសដំ និងម្ទេសក្រហមហាន់', nameEn: 'Crushed garlic cloves and sliced red chili', amount: '៥ កំពឹស' },
      { nameKh: 'ប្រេងខ្យង ទឹកស៊ីអ៊ីវ និងទឹកត្រី', nameEn: 'Oyster sauce, soy sauce, and fish sauce', amount: '២ ស្លាបព្រាបាយ' },
      { nameKh: 'ស្ករត្នោត និងម្រេចកំពតម៉ត់', nameEn: 'Palm sugar and ground Kampot pepper', amount: 'កន្លះស្លាបព្រាកាហ្វេ' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'លាងសម្អាតគ្រឿងក្នុងមាន់ជាមួយអំបិល និងក្រូចឆ្មាឱ្យអស់ក្លិនឆ្អាប ហាន់ជាចំណិតល្មម។ បេះត្រកួនលាងទឹកឱ្យស្អាត ស្រង់ឱ្យស្រក់ទឹក។', instructionEn: 'Clean chicken giblets with salt and lime to remove odor, then slice. Wash morning glory stems and drain well.' },
      { stepNumber: 2, instructionKh: 'ដាក់ខ្ទះឱ្យក្តៅ ចាក់ប្រេងបំពងខ្ទឹមសឱ្យឈ្ងុយ រួចដាក់គ្រឿងក្នុងមាន់ចូលឆាឱ្យឆ្អិនរឹបសាច់ល្អ។', instructionEn: 'Heat oil in a hot wok, sauté crushed garlic until golden, and stir-fry chicken giblets until cooked through.' },
      { stepNumber: 3, instructionKh: 'បន្ថែមភ្លើងឱ្យខ្លាំង ចាក់ត្រកួន និងម្ទេសចូល ថែមប្រេងខ្យង ទឹកស៊ីអ៊ីវ ទឹកត្រី និងស្ករត្នោត ឆាត្រឡប់យ៉ាងលឿន ១-២ នាទី។', instructionEn: 'Turn heat to high, toss in morning glory and chilies with oyster sauce, soy sauce, fish sauce, and sugar; flash-fry 1-2 minutes.' },
      { stepNumber: 4, instructionKh: 'រោយម្រេចកំពតម៉ត់ពីលើ រួចដួសដាក់ចានភ្លាមៗដើម្បីរក្សាភាពស្រួយ និងពណ៌បៃតងខ្ចីនៃត្រកួន។', instructionEn: 'Sprinkle ground Kampot pepper and plate immediately to preserve vibrant green crunch.' },
    ],
  },

  // ==========================================
  // CATEGORY 4: ញាំ-ភ្លា-ប្រហុក (SALADS & TRADITIONAL DIPS) - 15 Dishes
  // ==========================================
  {
    id: 'food-31',
    nameKh: 'ភ្លាសាច់គោរសជាតិដើម',
    nameEn: 'Khmer Beef Ceviche Salad (Pleah Sach Ko)',
    categorySlug: 'salad',
    categoryKh: 'ម្ហូបភ្លា / ពិសេស',
    categoryEn: 'Salad / Raw Beef',
    descriptionKh: 'ភ្លាសាច់គោ ជាម្ហូបញាំដ៏ល្បីល្បាញក្នុងពិធីជប់លៀងខ្មែរ។ សាច់គោផុយទន់ ស្រឡោចទឹកក្រូចឆ្មាឱ្យឡើងសស្រទន់ ច្របល់ជាមួយប្រហុកបុក ស្លឹកក្រូចសើច គល់ស្លឹកគ្រៃ រំដេង ម្ទេស និងសណ្តែកដីលីង។',
    descriptionEn: 'Celebrated Cambodian beef salad cured in fresh lime juice, tossed with lemongrass, prahok dressing, mint, culantro, shallots, and crushed roasted peanuts.',
    photoUrl: '/foods/food-31.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-31.jpg',
    prepTime: '២០ នាទី',
    cookTime: '៥ នាទី',
    servings: '៣-៤ នាក់',
    calories: 310,
    difficulty: 'medium',
    priceRiel: 22000,
    priceUsd: 5.5,
    rating: 4.9,
    reviewCount: 205,
    isFeatured: true,
    ingredients: [
      { nameKh: 'សាច់គោផុយហាន់ស្ដើងៗ', nameEn: 'Tenderloin beef sliced wafer-thin', amount: '៤០០ ក្រាម' },
      { nameKh: 'ទឹកក្រូចឆ្មាស្រស់', nameEn: 'Freshly squeezed lime juice', amount: '៥ ស្លាបព្រាបាយ' },
      { nameKh: 'គល់ស្លឹកគ្រៃ និងរំដេងហាន់ស្ដើង', nameEn: 'Finely sliced lemongrass and galangal', amount: '៣ ស្លាបព្រាបាយ' },
      { nameKh: 'ប្រហុកសាច់ដាំឆ្អិន', nameEn: 'Cooked prahok dressing', amount: '១ ស្លាបព្រាបាយ' },
      { nameKh: 'ជីរគ្រប់មុខ និងសណ្តែកដីលីង', nameEn: 'Fresh mixed mints and toasted peanuts', amount: '១ ក្តាប់' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ច្របល់សាច់គោជាមួយទឹកក្រូចឆ្មាទុក ៥-១០ នាទីឱ្យសាច់ឡើងពណ៌សទន់។', instructionEn: 'Cure sliced beef in fresh lime juice for 5-10 minutes until lightly opaque.' },
      { stepNumber: 2, instructionKh: 'ច្របាច់ទឹកក្រូចឆ្មាចេញបន្តិច រួចច្របល់ជាមួយប្រហុក ស្ករត្នោត គល់ស្លឹកគ្រៃ រំដេង។', instructionEn: 'Gently squeeze out excess lime juice, toss with prahok dressing, herbs, and spices.' },
      { stepNumber: 3, instructionKh: 'បង់ជីរគ្រប់មុខ និងរោយសណ្តែកដីលីង ទទួលទានជាមួយត្រប់ស្រួយ។', instructionEn: 'Fold in fresh mints and top with crushed roasted peanuts.' },
    ],
  },
  {
    id: 'food-32',
    nameKh: 'ញាំស្វាយខ្ចីត្រីឆ្អើរ',
    nameEn: 'Green Mango Salad with Smoked Fish',
    categorySlug: 'salad',
    categoryKh: 'ម្ហូបញាំ / ស្រុកស្រែ',
    categoryEn: 'Salad / Green Mango',
    descriptionKh: 'ញាំស្វាយខ្ចី មានរសជាតិជូរស្រួយពីស្វាយខ្ចី ក្លិនឈ្ងុយពីត្រីឆ្អើរអាំងបេះសាច់ និងទឹកត្រីបុកម្ទេសខ្ទឹមផ្អែមល្មម ទទួលទានជាមួយបាយ ឬជាគ្រឿងក្លែម។',
    descriptionEn: 'Tangy and crunchy shredded green mango salad tossed with flaky smoked river catfish, fragrant Asian herbs, and sweet fish sauce dressing.',
    photoUrl: '/foods/food-32.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-32.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '៥ នាទី',
    servings: '២-៣ នាក់',
    calories: 220,
    difficulty: 'easy',
    priceRiel: 15000,
    priceUsd: 3.75,
    rating: 4.8,
    reviewCount: 92,
    ingredients: [
      { nameKh: 'ស្វាយខ្ចីសាប់ជាសរសៃ', nameEn: 'Crisp green mango shredded', amount: '២ ផ្លែ' },
      { nameKh: 'ត្រីឆ្អើរអាំងបេះសាច់បុកម៉ត់', nameEn: 'Smoked catfish flaked', amount: '១៥០ ក្រាម' },
      { nameKh: 'ទឹកត្រី ស្ករត្នោត ក្រូចឆ្មា ម្ទេស', nameEn: 'Fish sauce, palm sugar, lime, chili', amount: 'សម្រាប់ទឹកញាំ' },
      { nameKh: 'សណ្តែកដីលីង និងជីរនាងវង', nameEn: 'Toasted peanuts and fresh basil', amount: '១ ក្តាប់' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'សាប់ស្វាយខ្ចីជាសរសៃវែងៗ និងត្រាំទឹកកកដើម្បីឱ្យស្រួយ។', instructionEn: 'Shred green mango and chill in ice water for maximum crunch.' },
      { stepNumber: 2, instructionKh: 'លាយទឹកត្រី ស្ករត្នោត ម្ទេស និងទឹកក្រូចឆ្មាធ្វើទឹកញាំ។', instructionEn: 'Whisk fish sauce, palm sugar, lime juice, and chilies.' },
      { stepNumber: 3, instructionKh: 'ច្របល់ស្វាយ ត្រីឆ្អើរ ទឹកញាំ និងសណ្តែកដីចូលគ្នាឱ្យសព្វ។', instructionEn: 'Toss mango, smoked fish, dressing, herbs, and peanuts together.' },
    ],
  },
  {
    id: 'food-33',
    nameKh: 'ទឹកគ្រឿងត្រីរ៉ស់អន្លក់ខ្ចី',
    nameEn: 'Teuk Kroeung (Traditional Fish Dip with Crudités)',
    categorySlug: 'salad',
    categoryKh: 'ម្ហូបទឹកគ្រឿង / ប្រពៃណី',
    categoryEn: 'Dip / Fish Prahok',
    descriptionKh: 'ទឹកគ្រឿង ជាព្រលឹងនៃផ្ទះបាយខ្មែរ។ សាច់ត្រីរ៉ស់ស្ងោរបុកម៉ត់ជាមួយប្រហុក ខ្ទឹមស ម្ទេស និងសណ្តែកដី ទទួលទានជាមួយបន្លែអន្លក់ស្រស់គ្រប់មុខ (ត្រកួន ផ្កាកំប្លោក ត្រយូងចេក ត្រសក់)។',
    descriptionEn: 'The quintessential everyday Cambodian family table dip made of pounded poached river fish, prahok, roasted peanuts, and garlic, served with a stunning garden platter of raw fresh vegetables.',
    photoUrl: '/foods/food-33.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-33.jpg',
    prepTime: '២០ នាទី',
    cookTime: '១៥ នាទី',
    servings: '៤ នាក់',
    calories: 250,
    difficulty: 'medium',
    priceRiel: 18000,
    priceUsd: 4.5,
    rating: 4.9,
    reviewCount: 164,
    isFeatured: true,
    ingredients: [
      { nameKh: 'សាច់ត្រីរ៉ស់ស្ងោរបេះយកសាច់', nameEn: 'Poached river snakehead fish flaked', amount: '៣០០ ក្រាម' },
      { nameKh: 'ប្រហុកសាច់ដាំឆ្អិន', nameEn: 'Cooked prahok paste', amount: '២ ស្លាបព្រាបាយ' },
      { nameKh: 'ខ្ទឹមស ខ្ទឹមក្រហម ម្ទេសអាំង', nameEn: 'Roasted garlic, shallots, and chilies', amount: '១ ចានតូច' },
      { nameKh: 'សណ្តែកដីលីងបុកម៉ត់', nameEn: 'Crushed roasted peanuts', amount: '៣ ស្លាបព្រាបាយ' },
      { nameKh: 'បន្លែអន្លក់ចម្រុះស្រុកខ្មែរ', nameEn: 'Assorted raw Cambodian vegetables', amount: '១ ថាសធំ' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'អាំងខ្ទឹមស ខ្ទឹមក្រហម និងម្ទេសឱ្យឈ្ងុយ រួចបុកជាមួយសាច់ត្រីស្ងោរឱ្យម៉ត់។', instructionEn: 'Pound roasted shallots, garlic, chilies, and poached fish together in a stone mortar.' },
      { stepNumber: 2, instructionKh: 'ចាក់ទឹកស្ងោរត្រី និងទឹកប្រហុកដាំចូល កូរឱ្យរលាយខាប់ល្មម។', instructionEn: 'Stir in warm fish broth, cooked prahok, and crushed peanuts.' },
      { stepNumber: 3, instructionKh: 'ច្របាច់ទឹកក្រូចឆ្មា និងរៀបចំជាមួយបន្លែអន្លក់ស្រស់ៗ។', instructionEn: 'Balance with fresh lime juice and serve with a generous vegetable platter.' },
    ],
  },
  {
    id: 'food-34',
    nameKh: 'ប្រហុកអាំងស្លឹកចេក',
    nameEn: 'Banana Leaf Wrapped Grilled Prahok',
    categorySlug: 'salad',
    categoryKh: 'ម្ហូបប្រហុក / បុរាណ',
    categoryEn: 'Dip / Banana Leaf Prahok',
    descriptionKh: 'ប្រហុកសាច់លាយសាច់ជ្រូកចិញ្ច្រាំ ខ្ទឹមស ម្ទេស ខ្ទឹមក្រហម និងស្លឹកក្រូចសើច ខ្ចប់ក្នុងស្លឹកចេកច្រើនជាន់ រួចអាំងលើរងើកភ្លើងធ្យូងឱ្យឈ្ងុយឈ្ងប់ ទទួលទានជាមួយបាយកក ឬបន្លែស្រស់។',
    descriptionEn: 'Savory fermented fish paste blended with minced pork, lemongrass, chilies, wrapped in banana leaves and grilled slowly over charcoal.',
    photoUrl: '/foods/food-34.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-34.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '២០ នាទី',
    servings: '២-៣ នាក់',
    calories: 280,
    difficulty: 'easy',
    priceRiel: 12000,
    priceUsd: 3.0,
    rating: 4.8,
    reviewCount: 88,
    ingredients: [
      { nameKh: 'ប្រហុកសាច់ចិញ្ច្រាំម៉ត់', nameEn: 'Finely minced prahok', amount: '១៥០ ក្រាម' },
      { nameKh: 'សាច់ជ្រូកបីជាន់ចិញ្ច្រាំ', nameEn: 'Minced pork belly', amount: '១៥០ ក្រាម' },
      { nameKh: 'ម្ទេស ខ្ទឹមស ស្លឹកក្រូចសើច', nameEn: 'Chili, garlic, kaffir lime leaves', amount: '២ ស្លាបព្រាបាយ' },
      { nameKh: 'ស្លឹកចេកសម្រាប់ខ្ចប់', nameEn: 'Banana leaves for parcel', amount: '៤-៥ សន្លឹក' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ច្របល់ប្រហុក សាច់ជ្រូក ម្ទេស ខ្ទឹមស និងស្ករត្នោតឱ្យចូលគ្នាល្អ។', instructionEn: 'Mix prahok, minced pork, chilies, garlic, and palm sugar thoroughly.' },
      { stepNumber: 2, instructionKh: 'វេចខ្ចប់ក្នុងស្លឹកចេកឱ្យជិត ខ្ទាស់ដោយបន្ទះឬស្សី។', instructionEn: 'Wrap parcel tightly in multiple layers of banana leaves.' },
      { stepNumber: 3, instructionKh: 'អាំងលើធ្យូងភ្លើងមធ្យម ១៥-២០ នាទី រហូតស្លឹកចេកក្រៀមឈ្ងុយ។', instructionEn: 'Grill over coals for 20 minutes until banana leaves are scorched and fragrant.' },
    ],
  },
  {
    id: 'food-35',
    nameKh: 'ញាំក្រូចថ្លុងបង្គាស្រស់',
    nameEn: 'Pomelo Salad with Fresh Prawns',
    categorySlug: 'salad',
    categoryKh: 'ម្ហូបញាំ / ស្រស់ស្រាយ',
    categoryEn: 'Salad / Pomelo',
    descriptionKh: 'ញាំក្រូចថ្លុងកោះទ្រង់ (ក្រចេះ) ជាម្ហូបញាំលំដាប់ខ្ពស់។ ក្រូចថ្លុងផ្អែមស្រួយ លាយជាមួយបង្គាស្ងោរ សាច់មាន់ហែក ដូងលីង សណ្តែកដី និងទឹកញាំក្រូចឆ្មា។',
    descriptionEn: 'Prestigious Cambodian royal salad featuring sweet Koh Trong pomelo sacs, tender poached prawns, shredded chicken, toasted coconut shreds, and mint.',
    photoUrl: '/foods/food-35.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-35.jpg',
    prepTime: '២០ នាទី',
    cookTime: '៥ នាទី',
    servings: '៣ នាក់',
    calories: 230,
    difficulty: 'medium',
    priceRiel: 22000,
    priceUsd: 5.5,
    rating: 4.9,
    reviewCount: 110,
    ingredients: [
      { nameKh: 'ក្រូចថ្លុងផ្អែមបេះជាកម្ទេច', nameEn: 'Sweet pomelo segments flaked', amount: '១ ផ្លែ' },
      { nameKh: 'បង្គាសមុទ្រស្ងោរបកសំបក', nameEn: 'Poached peeled prawns', amount: '២០០ ក្រាម' },
      { nameKh: 'ដូងទុំកោសលីងពណ៌មាស', nameEn: 'Toasted shredded coconut', amount: '៣ ស្លាបព្រាបាយ' },
      { nameKh: 'សណ្តែកដីលីង និងជីរគ្រប់មុខ', nameEn: 'Crushed peanuts and fresh herbs', amount: '១ ក្តាប់' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'បេះក្រូចថ្លុងថ្នមៗកុំឱ្យជាំទឹក។', instructionEn: 'Gently separate pomelo sacs without bruising.' },
      { stepNumber: 2, instructionKh: 'លាយទឹកត្រី ស្ករត្នោត ក្រូចឆ្មា និងខ្ទឹមសបុក។', instructionEn: 'Whisk lime juice, palm sugar, fish sauce, and garlic.' },
      { stepNumber: 3, instructionKh: 'ច្របល់ក្រូចថ្លុង បង្គា ដូងលីង ទឹកញាំ និងរោយសណ្តែកដីពីលើ។', instructionEn: 'Toss pomelo, prawns, toasted coconut, herbs, and peanuts lightly.' },
    ],
  },

  // ==========================================
  // CATEGORY 5: មី-គុយទាវ-នំបញ្ចុក (NOODLES & SOUP) - 14 Dishes
  // ==========================================
  {
    id: 'food-36',
    nameKh: 'គុយទាវភ្នំពេញពិសេស',
    nameEn: 'Phnom Penh Kuyteav (Pork Noodle Soup)',
    categorySlug: 'noodles',
    categoryKh: 'អាហារពេលព្រឹក / មី-គុយទាវ',
    categoryEn: 'Breakfast / Noodles',
    descriptionKh: 'គុយទាវភ្នំពេញ ជាអាហារពេលព្រឹកដ៏ពេញនិយមបំផុតរបស់ប្រជាជនកម្ពុជា។ ទឹកស៊ុបថ្លាផ្អែមឆ្ងាញ់រម្ងាស់ពីឆ្អឹងជ្រូក មឹកក្រៀម បង្គាក្រៀម និងរ៉ាឌី អមជាមួយសាច់ជ្រូក ប្រហិត និងថ្លើម។',
    descriptionEn: 'The most celebrated Cambodian noodle soup: clear, aromatic pork and roasted squid broth with rice noodles, minced pork, meatballs, and fresh herbs.',
    photoUrl: '/foods/food-36.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-36.jpg',
    prepTime: '២០ នាទី',
    cookTime: '៦០ នាទី',
    servings: '២ នាក់',
    calories: 450,
    difficulty: 'medium',
    priceRiel: 14000,
    priceUsd: 3.5,
    rating: 4.9,
    reviewCount: 310,
    isFeatured: true,
    ingredients: [
      { nameKh: 'សរសៃគុយទាវអង្ករស្រស់', nameEn: 'Fresh rice noodles', amount: '៣០០ ក្រាម' },
      { nameKh: 'ឆ្អឹងស៊ុបជ្រូក និងមឹកក្រៀមអាំង', nameEn: 'Pork bones and roasted dried squid', amount: '៥០០ ក្រាម' },
      { nameKh: 'សាច់ជ្រូកចិញ្ច្រាំ និងប្រហិត', nameEn: 'Minced pork and meatballs', amount: '២០០ ក្រាម' },
      { nameKh: 'ខ្ទឹមបំពង ស្លឹកខ្ទឹម សណ្តែកបណ្តុះ', nameEn: 'Fried garlic, scallions, bean sprouts', amount: 'តាមចំណូលចិត្ត' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'រម្ងាស់ឆ្អឹងជ្រូក មឹកក្រៀម និងរ៉ាឌីលើភ្លើងតិចៗ ១ ម៉ោងដើម្បីបានទឹកស៊ុបថ្លា។', instructionEn: 'Simmer pork bones, roasted squid, and daikon for 1 hour for clear broth.' },
      { stepNumber: 2, instructionKh: 'ស្រឡោចគុយទាវក្នុងទឹកក្តៅពុះ ដាក់ក្នុងចាន រួចរៀបសាច់ និងប្រហិតពីលើ។', instructionEn: 'Blanch noodles, place in bowl, and arrange cooked meats on top.' },
      { stepNumber: 3, instructionKh: 'ដួសទឹកស៊ុបក្តៅស្រោចពីលើ និងរោយខ្ទឹមបំពងឈ្ងុយៗ។', instructionEn: 'Ladle boiling broth over noodles and garnish with crispy garlic.' },
    ],
  },
  {
    id: 'food-37',
    nameKh: 'នំបញ្ចុកសម្លខ្មែរ',
    nameEn: 'Nom Banh Chok (Khmer Rice Noodle Curry)',
    categorySlug: 'noodles',
    categoryKh: 'អាហារប្រពៃណី / នំបញ្ចុក',
    categoryEn: 'Traditional / Rice Noodles',
    descriptionKh: 'នំបញ្ចុកសម្លប្រហើរ ជាអាហារប្រពៃណីតាំងពីបុរាណកាលមក។ សរសៃនំធ្វើពីម្សៅអង្ករផ្អាប់ ស្រោចដោយសម្លប្រហើរត្រីរ៉ស់លាយគ្រឿងស្លឹកគ្រៃ និងខ្ទិះដូង ទទួលទានជាមួយបន្លែស្រស់ៗ។',
    descriptionEn: 'Ancient Cambodian fermented rice noodles served with an aromatic green fish curry soup made with lemongrass, turmeric, and fingerroot, heaped with crisp wild greens.',
    photoUrl: '/foods/food-37.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-37.jpg',
    prepTime: '៣០ នាទី',
    cookTime: '២៥ នាទី',
    servings: '៤ នាក់',
    calories: 320,
    difficulty: 'medium',
    priceRiel: 10000,
    priceUsd: 2.5,
    rating: 4.8,
    reviewCount: 165,
    isFeatured: true,
    ingredients: [
      { nameKh: 'នំបញ្ចុកស្រស់', nameEn: 'Fresh Khmer rice noodles', amount: '១ គីឡូក្រាម' },
      { nameKh: 'សាច់ត្រីរ៉ស់ស្ងោរបុកម៉ត់', nameEn: 'Flaked and pounded snakehead fish', amount: '៤០០ ក្រាម' },
      { nameKh: 'គ្រឿងបុកលាយខ្ជាយ', nameEn: 'Kroeung paste with fingerroot', amount: '៣ ស្លាបព្រាបាយ' },
      { nameKh: 'បន្លែស្រស់ (ត្រយូងចេក ផ្កាកំប្លោក ត្រសក់)', nameEn: 'Banana blossom, water lily, cucumber', amount: '១ កញ្ច្រែង' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ស្ងោរត្រី បេះយកសាច់បុកជាមួយគ្រឿងបុក និងខ្ជាយឱ្យម៉ត់។', instructionEn: 'Poach fish and pound with kroeung and aromatic fingerroot.' },
      { stepNumber: 2, instructionKh: 'ដាំទឹកស្ងោរត្រីឱ្យពុះ រំលាយសាច់ត្រីបុកចូល និងដាក់ខ្ទិះដូងស្រាលៗ។', instructionEn: 'Bring broth to boil, dissolve fish paste, and add light coconut milk.' },
      { stepNumber: 3, instructionKh: 'រៀបបន្លែស្រស់ ដាក់នំបញ្ចុកពីលើ រួចដួសសម្លស្រោចពីលើ។', instructionEn: 'Assemble fresh vegetables and noodles in bowl, ladle fragrant broth over.' },
    ],
  },
  {
    id: 'food-38',
    nameKh: 'មីកូឡាស្ទឹងត្រែង',
    nameEn: 'Mee Kola (Steamed Noodles with Dried Shrimp & Egg)',
    categorySlug: 'noodles',
    categoryKh: 'ម្ហូបតំបន់ / ស្ទឹងត្រែង-ប៉ៃលិន',
    categoryEn: 'Noodles / Kola Minority',
    descriptionKh: 'មីកូឡា ជាម្ហូបជនជាតិកូឡាដ៏ល្បីល្បាញនៅប៉ៃលិន និងស្ទឹងត្រែង។ សរសៃមីចំហុយជាមួយទឹកស៊ីអ៊ីវ ទទួលទានជាមួយបង្គាក្រៀមបុក ពងទាស្ងោរ ត្រសក់ សណ្តែកដី និងទឹកត្រីផ្អែមជូរ។',
    descriptionEn: 'Traditional Kola minority noodle dish: steamed noodles tossed in soy sauce, topped with pounded dried shrimp, hard-boiled eggs, pickles, and sweet-sour garlic dressing.',
    photoUrl: '/foods/food-38.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-38.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '១០ នាទី',
    servings: '២ នាក់',
    calories: 380,
    difficulty: 'easy',
    priceRiel: 12000,
    priceUsd: 3.0,
    rating: 4.8,
    reviewCount: 96,
    ingredients: [
      { nameKh: 'សរសៃមី ឬគុយទាវស្រស់', nameEn: 'Steamed rice noodles', amount: '៣០០ ក្រាម' },
      { nameKh: 'បង្គាក្រៀមបុកម៉ត់', nameEn: 'Pounded dried shrimp', amount: '៥០ ក្រាម' },
      { nameKh: 'ពងទាស្ងោរកាត់ចំណិត', nameEn: 'Hard-boiled duck eggs', amount: '២ គ្រាប់' },
      { nameKh: 'សណ្តែកដីលីង ត្រសក់ ជ្រក់ល្ហុង', nameEn: 'Crushed peanuts, cucumber, pickled papaya', amount: '១ ចាន' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ចំហុយសរសៃមីជាមួយទឹកស៊ីអ៊ីវឱ្យឡើងពណ៌ត្នោតស្រាល។', instructionEn: 'Steam noodles seasoned lightly with dark soy sauce.' },
      { stepNumber: 2, instructionKh: 'រៀបមីក្នុងចាន រោយបង្គាក្រៀមបុក និងសណ្តែកដីពីលើ។', instructionEn: 'Place noodles in bowl, sprinkle pounded dried shrimp and peanuts.' },
      { stepNumber: 3, instructionKh: 'រៀបពងទាស្ងោរ ត្រសក់ និងស្រោចទឹកត្រីផ្អែមជូរពីលើ។', instructionEn: 'Top with sliced eggs, pickles, and drizzle sweet-tangy garlic sauce.' },
    ],
  },
  {
    id: 'food-39',
    nameKh: 'គុយទាវខសាច់គោ',
    nameEn: 'Kuyteav Khor Ko (Braised Beef Stew Noodles)',
    categorySlug: 'noodles',
    categoryKh: 'គុយទាវ / ពិសេស',
    categoryEn: 'Noodles / Braised Beef',
    descriptionKh: 'គុយទាវខគោ មានទឹកស៊ុបខាប់ក្រហមឈ្ងុយផ្កាចាន់ គ្រាប់កូឡាក់ និងខ្ញី។ សាច់គោផុយទន់ជាប់សរសៃ រួមជាមួយសរសៃគុយទាវអង្ករស្វិតល្អ។',
    descriptionEn: 'Fragrant braised beef stew noodles infused with star anise, cloves, and lemongrass, laden with tender beef chunks and tendon.',
    photoUrl: '/foods/food-39.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-39.jpg',
    prepTime: '២០ នាទី',
    cookTime: '៦០ នាទី',
    servings: '២ នាក់',
    calories: 520,
    difficulty: 'medium',
    priceRiel: 18000,
    priceUsd: 4.5,
    rating: 4.9,
    reviewCount: 140,
    ingredients: [
      { nameKh: 'សាច់គោជាប់សរសៃកាត់ដុំ', nameEn: 'Beef brisket and tendon chunks', amount: '៤០០ ក្រាម' },
      { nameKh: 'គ្រឿងខគោ (ផ្កាចាន់ គ្រាប់កូឡាក់)', nameEn: 'Star anise, cloves, five-spice', amount: '១ កញ្ចប់' },
      { nameKh: 'សរសៃគុយទាវស្រស់', nameEn: 'Fresh rice noodles', amount: '៣០០ ក្រាម' },
      { nameKh: 'ស្លឹកជីរនាងវង និងសណ្តែកបណ្តុះ', nameEn: 'Holy basil and bean sprouts', amount: '១ ក្តាប់' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'រម្ងាស់សាច់គោជាមួយគ្រឿងទេស ទឹកប៉េងប៉ោះខាប់ លើភ្លើងតិចៗ ១ ម៉ោង។', instructionEn: 'Simmer beef with spices and tomato paste for 1 hour until tender.' },
      { stepNumber: 2, instructionKh: 'ស្រឡោចគុយទាវក្នុងទឹកក្តៅពុះ ដាក់ក្នុងចាន។', instructionEn: 'Blanch rice noodles in boiling water, transfer to bowls.' },
      { stepNumber: 3, instructionKh: 'ដួសសាច់គោ និងទឹកស៊ុបខាប់ស្រោចពីលើ បង់ជីរនាងវង។', instructionEn: 'Ladle hot braised beef stew over noodles and garnish with herbs.' },
    ],
  },
  {
    id: 'food-40',
    nameKh: 'មីឆាសាច់គោពងទាចៀន',
    nameEn: 'Khmer Stir-Fried Noodles with Beef & Egg (Mee Cha)',
    categorySlug: 'noodles',
    categoryKh: 'អាហារសម្រន់ / មីឆា',
    categoryEn: 'Street Food / Stir-Fried Noodles',
    descriptionKh: 'មីឆាខ្មែរ ពេញនិយមបំផុតតាមដងផ្លូវពេលរសៀល។ មីលឿងឆាលើភ្លើងខ្លាំងជាមួយសាច់គោ បន្លែត្រកួន សណ្តែកបណ្តុះ ទឹកស៊ីអ៊ីវ និងដាក់ពងទាចៀនពីលើ។',
    descriptionEn: 'Beloved Cambodian late-afternoon street food: yellow noodles wok-fried over roaring flame with beef slices, greens, sweet soy, and crowned with a sunny-side egg.',
    photoUrl: '/foods/food-40.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-40.jpg',
    prepTime: '១០ នាទី',
    cookTime: '៨ នាទី',
    servings: '១-២ នាក់',
    calories: 460,
    difficulty: 'easy',
    priceRiel: 12000,
    priceUsd: 3.0,
    rating: 4.8,
    reviewCount: 220,
    ingredients: [
      { nameKh: 'សរសៃមីលឿងស្រស់', nameEn: 'Fresh yellow egg noodles', amount: '២៥០ ក្រាម' },
      { nameKh: 'សាច់គោហាន់ស្ដើង', nameEn: 'Sliced tender beef', amount: '១៥០ ក្រាម' },
      { nameKh: 'ត្រកួន និងសណ្តែកបណ្តុះ', nameEn: 'Water spinach and bean sprouts', amount: '១០០ ក្រាម' },
      { nameKh: 'ពងទាចៀន', nameEn: 'Fried egg sunny-side up', amount: '១ គ្រាប់' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ឆាសាច់គោជាមួយខ្ទឹមសលើភ្លើងខ្លាំងឱ្យឆ្អិនរួចស្រង់ទុក។', instructionEn: 'Flash-fry beef with garlic over high heat, set aside.' },
      { stepNumber: 2, instructionKh: 'ឆាមីជាមួយត្រកួន ទឹកស៊ីអ៊ីវ ស្ករត្នោត និងប្រេងខ្យងឱ្យឈ្ងុយ។', instructionEn: 'Wok-fry noodles with greens and sweet seasoning sauces.' },
      { stepNumber: 3, instructionKh: 'ដាក់សាច់គោចូលច្របល់ ដួសដាក់ចាន និងដាក់ពងទាចៀនពីលើ។', instructionEn: 'Fold beef back in, transfer to plate, and top with fried egg.' },
    ],
  },

  // ==========================================
  // CATEGORY 6: បាយ & អាហារពេលព្រឹក (RICE & MORNING PLATES) - 12 Dishes
  // ==========================================
  {
    id: 'food-41',
    nameKh: 'បាយសាច់ជ្រូកអាំងពងទាចៀន',
    nameEn: 'Bai Sach Chrouk (Grilled Pork with Broken Rice)',
    categorySlug: 'rice',
    categoryKh: 'អាហារពេលព្រឹក / បាយ',
    categoryEn: 'Breakfast / Rice Plates',
    descriptionKh: 'បាយសាច់ជ្រូក ជាអាហារពេលព្រឹកលេខ ១ របស់ប្រជាជនកម្ពុជា។ សាច់ជ្រូកហាន់ស្ដើងប្រឡាក់ទឹកខ្ទិះដូង ខ្ទឹមស ទឹកស៊ីអ៊ីវ អាំងលើធ្យូងឈ្ងុយៗ ទទួលទានជាមួយបាយក្ដៅៗ ជ្រក់ត្រសក់ និងទឹកស៊ុបថ្លា។',
    descriptionEn: 'Cambodia’s favorite morning breakfast dish: thinly sliced pork marinated in sweet coconut milk, garlic, and soy, charcoal-grilled and served with warm rice, pickled cucumbers, and clear radish soup.',
    photoUrl: '/foods/food-41.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-41.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '១៥ នាទី',
    servings: '១ នាក់',
    calories: 490,
    difficulty: 'easy',
    priceRiel: 8000,
    priceUsd: 2.0,
    rating: 4.9,
    reviewCount: 380,
    isFeatured: true,
    ingredients: [
      { nameKh: 'សាច់ជ្រូកហាន់ស្ដើង', nameEn: 'Thin sliced pork loin or shoulder', amount: '២០០ ក្រាម' },
      { nameKh: 'ខ្ទិះដូង ខ្ទឹមស ទឹកត្រី ស្ករត្នោត', nameEn: 'Coconut milk, garlic, fish sauce, palm sugar', amount: 'សម្រាប់ប្រឡាក់' },
      { nameKh: 'បាយសក្ដៅៗ', nameEn: 'Steamed fragrant jasmine rice', amount: '១ ចាន' },
      { nameKh: 'ជ្រក់ត្រសក់ និងរ៉ាឌី', nameEn: 'Pickled cucumber and daikon', amount: '១ ចានតូច' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ប្រឡាក់សាច់ជ្រូកជាមួយខ្ទិះដូង ខ្ទឹមស ទឹកស៊ីអ៊ីវ ស្ករត្នោត ២០ នាទី។', instructionEn: 'Marinate pork in coconut milk, garlic, soy, and palm sugar for 20 minutes.' },
      { stepNumber: 2, instructionKh: 'អាំងលើរងើកភ្លើងធ្យូងរហូតដល់សាច់ឆ្អិនក្រហមឈ្ងុយ។', instructionEn: 'Grill over glowing coals until lightly caramelized and juicy.' },
      { stepNumber: 3, instructionKh: 'រៀបដាក់លើបាយក្ដៅៗ ទទួលទានជាមួយជ្រក់ត្រសក់ និងទឹកស៊ុប។', instructionEn: 'Serve over hot jasmine rice with cucumber pickles and soup.' },
    ],
  },
  {
    id: 'food-42',
    nameKh: 'បបរគ្រឿងសាច់ជ្រូកខ្មែរ',
    nameEn: 'Khmer Rice Porridge with Pork & Offal (Babor Kroeung)',
    categorySlug: 'rice',
    categoryKh: 'អាហារពេលព្រឹក / បបរ',
    categoryEn: 'Breakfast / Porridge',
    descriptionKh: 'បបរគ្រឿងសាច់ជ្រូកខ្មែរ រម្ងាស់អង្ករជាមួយទឹកស៊ុបឆ្អឹងជ្រូកផ្អែមឆ្ងាញ់ អមដោយសាច់ជ្រូក ថ្លើម ក្រពះ ប្រហិតសាច់ ឈាមជ្រូក រោយខ្ទឹមបំពង សណ្តែកបណ្តុះ និងក្រូចឆ្មា។',
    descriptionEn: 'Hearty Cambodian morning rice congee simmered with rich pork stock, served with tender pork slices, offal, crispy fried crullers, fresh bean sprouts, and lime.',
    photoUrl: '/foods/food-42.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-42.jpg',
    prepTime: '២០ នាទី',
    cookTime: '៤០ នាទី',
    servings: '២-៣ នាក់',
    calories: 360,
    difficulty: 'medium',
    priceRiel: 12000,
    priceUsd: 3.0,
    rating: 4.8,
    reviewCount: 172,
    ingredients: [
      { nameKh: 'អង្ករខ្សាយលាយអង្ករដំណើបបន្តិច', nameEn: 'Jasmine rice with a touch of sticky rice', amount: '២០០ ក្រាម' },
      { nameKh: 'ឆ្អឹងស៊ុបជ្រូក និងសាច់ជ្រូកចិញ្ច្រាំ', nameEn: 'Pork bones and minced pork', amount: '៤០០ ក្រាម' },
      { nameKh: 'ឈាមជ្រូកស្ងោរ និងថ្លើមជ្រូក', nameEn: 'Cooked blood cubes and pork liver', amount: '១៥០ ក្រាម' },
      { nameKh: 'ខ្ញីហាន់សរសៃ សណ្តែកបណ្តុះ ក្រូចឆ្មា', nameEn: 'Shredded ginger, bean sprouts, lime', amount: 'តាមចំណូលចិត្ត' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'រម្ងាស់ឆ្អឹងជ្រូកឱ្យចេញជាតិផ្អែម រួចបង់អង្ករចូលរម្ងាស់ឱ្យរីកទន់។', instructionEn: 'Simmer pork bone stock, add rice and cook until soft and velvety.' },
      { stepNumber: 2, instructionKh: 'ដាក់សាច់ជ្រូកចិញ្ច្រាំ ថ្លើម និងឈាមជ្រូកចូលឱ្យឆ្អិន។', instructionEn: 'Add seasoned minced pork, liver slices, and blood cubes.' },
      { stepNumber: 3, instructionKh: 'ដួសដាក់ចាន រោយខ្ញី ខ្ទឹមបំពង ស្លឹកខ្ទឹម ម្រេច និងច្របាច់ក្រូចឆ្មា។', instructionEn: 'Ladle into bowls, top with julienned ginger, crispy garlic, and lime.' },
    ],
  },
  {
    id: 'food-43',
    nameKh: 'បាយឆាក្តាម',
    nameEn: 'Fried Rice with Fresh Crab Meat',
    categorySlug: 'rice',
    categoryKh: 'ម្ហូបបាយ / ពិសេស',
    categoryEn: 'Rice / Crab Fried Rice',
    descriptionKh: 'បាយឆាក្តាម ប្រើសាច់ក្តាមសមុទ្រស្រស់ផ្អែម ឆាជាមួយបាយអង្ករផ្កាម្លិះពងទា និងខ្ទឹមសលើភ្លើងខ្លាំង គ្រាប់បាយស្ងួតស្មើដៃឈ្ងុយឆ្ងាញ់។',
    descriptionEn: 'High-heat wok-fried jasmine rice packed with sweet fresh crab lump meat, golden eggs, and sliced scallions.',
    photoUrl: '/foods/food-43.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-43.jpg',
    prepTime: '១៥ នាទី',
    cookTime: '១០ នាទី',
    servings: '២ នាក់',
    calories: 420,
    difficulty: 'easy',
    priceRiel: 18000,
    priceUsd: 4.5,
    rating: 4.9,
    reviewCount: 145,
    ingredients: [
      { nameKh: 'បាយកកអង្ករផ្កាម្លិះ', nameEn: 'Chilled cooked jasmine rice', amount: '៣ ចាន' },
      { nameKh: 'សាច់ក្តាមស្រស់បកស្អាត', nameEn: 'Fresh picked crab meat', amount: '១៥០ ក្រាម' },
      { nameKh: 'ស៊ុតមាន់ ឬពងទា', nameEn: 'Eggs', amount: '២ គ្រាប់' },
      { nameKh: 'ខ្ទឹមសចិញ្ច្រាំ និងស្លឹកខ្ទឹម', nameEn: 'Minced garlic and scallions', amount: '២ ស្លាបព្រាបាយ' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ឆាខ្ទឹមស និងស៊ុតឱ្យឡើងឈ្ងុយ រួចដាក់បាយកកចូលឆាច្របល់លើភ្លើងខ្លាំង។', instructionEn: 'Scramble eggs and garlic in hot wok, toss in rice over high heat.' },
      { stepNumber: 2, instructionKh: 'ដាក់សាច់ក្តាមចូលឆាថ្នមៗដើម្បីកុំឱ្យបែកសាច់ក្តាម។', instructionEn: 'Gently fold in fresh crab meat without breaking the lumps.' },
      { stepNumber: 3, instructionKh: 'ថែមទឹកត្រី ម្រេចកំពត និងស្លឹកខ្ទឹម ឆាច្របល់រួចដួសដាក់ចាន។', instructionEn: 'Season with fish sauce, Kampot pepper, and chopped scallions.' },
    ],
  },

  // ==========================================
  // CATEGORY 7: បង្អែម & នំប្រពៃណី (TRADITIONAL DESSERTS) - 15 Dishes
  // ==========================================
  {
    id: 'food-44',
    nameKh: 'នំផ្លែអាយស្ករត្នោត',
    nameEn: 'Num Phlae Ai (Palm Sugar Sticky Rice Dumplings)',
    categorySlug: 'cake',
    categoryKh: 'បង្អែមខ្មែរ / នំប្រពៃណី',
    categoryEn: 'Desserts / Traditional Sweets',
    descriptionKh: 'នំផ្លែអាយ ជានំខ្មែរបុរាណធ្វើពីម្សៅដំណើបមូលតូចៗ មានស្នូលស្ករត្នោតផ្អែមក្រអូបនៅខាងក្នុង។ ពេលទំពារ ស្ករត្នោតរលាយផ្ទុះក្នុងមាត់យ៉ាងឆ្ងាញ់ពិសា រោយជាមួយដូងកោសសរសៃស្រស់ៗ។',
    descriptionEn: 'Delightful bite-sized glutinous rice balls filled with fragrant liquid palm sugar that bursts in your mouth, generously coated in freshly grated young coconut.',
    photoUrl: '/foods/food-44.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-44.jpg',
    prepTime: '២០ នាទី',
    cookTime: '១០ នាទី',
    servings: '៤ នាក់',
    calories: 210,
    difficulty: 'easy',
    priceRiel: 6000,
    priceUsd: 1.5,
    rating: 4.8,
    reviewCount: 120,
    isFeatured: true,
    ingredients: [
      { nameKh: 'ម្សៅដំណើប', nameEn: 'Glutinous rice flour', amount: '៣០០ ក្រាម' },
      { nameKh: 'ស្ករត្នោតសុទ្ធកាត់ដុំតូចៗ', nameEn: 'Solid palm sugar cubed', amount: '១៥០ ក្រាម' },
      { nameKh: 'ដូងកោសសរសៃស្រស់', nameEn: 'Freshly shredded coconut', amount: '១ ចាន' },
      { nameKh: 'ទឹកស្លឹកតើយ', nameEn: 'Pandan leaf water', amount: '២០០ មីលីលីត្រ' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ច្របល់ម្សៅដំណើបជាមួយទឹកស្លឹកតើយឱ្យបានដុំម្សៅទន់ស្មើល្អ។', instructionEn: 'Knead glutinous flour with pandan juice until smooth pliable dough forms.' },
      { stepNumber: 2, instructionKh: 'ក្ដាប់ម្សៅរាងមូល សំប៉ែត ដាក់ដុំស្ករត្នោតចំកណ្តាល រួចមូលបិទឱ្យជិត។', instructionEn: 'Flatten dough, insert palm sugar cube, and roll into smooth sealed balls.' },
      { stepNumber: 3, instructionKh: 'ស្ងោរក្នុងទឹកពុះ។ ពេលនំឆ្អិនអណ្ដែតឡើង ស្រង់យកមកប្រឡាក់ដូងកោស។', instructionEn: 'Boil until dumplings float to surface, drain, and roll in grated coconut.' },
    ],
  },
  {
    id: 'food-45',
    nameKh: 'ក្រឡានប្ញស្សីថ្មគោលបាត់ដំបង',
    nameEn: 'Kralan (Sticky Rice in Bamboo Tubes)',
    categorySlug: 'cake',
    categoryKh: 'នំប្រពៃណី / បាត់ដំបង-ក្រចេះ',
    categoryEn: 'Snacks / Bamboo Sticky Rice',
    descriptionKh: 'ក្រឡាន ជាអាហារប្រពៃណីខ្មែរដ៏ល្បីល្បាញនៅថ្មគោល និងក្រចេះ។ អង្ករដំណើបលាយជាមួយខ្ទិះដូងខាប់ សណ្តែកខ្មៅ និងស្ករត្នោត ញាត់ក្នុងបំពង់ឬស្សីស្រស់ រួចដុតលើរងើកភ្លើងរហូតឈ្ងុយ។',
    descriptionEn: 'Beloved traditional delicacy: fragrant sticky rice blended with black beans, grated coconut, and palm sugar, slowly roasted over embers inside natural bamboo tubes.',
    photoUrl: '/foods/food-45.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-45.jpg',
    prepTime: '៣០ នាទី',
    cookTime: '៦០ នាទី',
    servings: '៤ នាក់',
    calories: 310,
    difficulty: 'medium',
    priceRiel: 6000,
    priceUsd: 1.5,
    rating: 4.9,
    reviewCount: 280,
    isFeatured: true,
    ingredients: [
      { nameKh: 'អង្ករដំណើបថ្មី', nameEn: 'New-crop sticky rice', amount: '៥០០ ក្រាម' },
      { nameKh: 'ខ្ទិះដូងដើមខាប់', nameEn: 'Fresh coconut cream', amount: '៣០០ មីលីលីត្រ' },
      { nameKh: 'សណ្តែកខ្មៅស្ងោរឆ្អិន', nameEn: 'Cooked black beans', amount: '១០០ ក្រាម' },
      { nameKh: 'បំពង់ឬស្សីក្រឡាន', nameEn: 'Fresh bamboo stalks', amount: '៣-៤ បំពង់' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'លាយអង្ករដំណើប សណ្តែកខ្មៅ ខ្ទិះដូង ស្ករត្នោត និងអំបិលបន្តិចចូលគ្នា។', instructionEn: 'Mix sticky rice, black beans, coconut cream, palm sugar, and a pinch of salt.' },
      { stepNumber: 2, instructionKh: 'ញាត់ចូលក្នុងបំពង់ឬស្សី ញាត់ស្លឹកចេកបិទមាត់បំពង់។', instructionEn: 'Pack mixture into bamboo tubes and plug tops with banana leaves.' },
      { stepNumber: 3, instructionKh: 'ដុតលើរងើកភ្លើងធ្យូង ដោយបង្វិលចុះឡើងរហូតដល់អង្ករឆ្អិនឈ្ងុយ។', instructionEn: 'Roast horizontally over charcoal embers, turning frequently until cooked.' },
    ],
  },
  {
    id: 'food-46',
    nameKh: 'នំអន្សមជ្រូកខ្មែរ',
    nameEn: 'Num Ansom Chrouk (Savory Pork Sticky Rice Cake)',
    categorySlug: 'cake',
    categoryKh: 'នំប្រពៃណី / ពិធីបុណ្យ',
    categoryEn: 'Traditional / Festival Cake',
    descriptionKh: 'នំអន្សមជ្រូក គឺជានិមិត្តរូបនៃពិធីបុណ្យភ្ជុំបិណ្ឌ និងចូលឆ្នាំខ្មែរ។ វេចពីអង្ករដំណើប សណ្តែកបាយ និងសាច់ជ្រូកបីជាន់ប្រឡាក់ម្រេចកំពត វេចក្នុងស្លឹកចេករាងស៊ីឡាំង រួចស្ងោររាប់ម៉ោង។',
    descriptionEn: 'The monumental Cambodian festival ceremonial cylinder cake: sticky rice layered with mung beans and Kampot pepper marinated pork belly, wrapped tightly in banana leaves and boiled for hours.',
    photoUrl: '/foods/food-46.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-46.jpg',
    prepTime: '៤០ នាទី',
    cookTime: '២៤០ នាទី',
    servings: '៦ នាក់',
    calories: 420,
    difficulty: 'hard',
    priceRiel: 12000,
    priceUsd: 3.0,
    rating: 5.0,
    reviewCount: 340,
    isFeatured: true,
    ingredients: [
      { nameKh: 'អង្ករដំណើបស្រស់', nameEn: 'Glutinous rice', amount: '១ គីឡូក្រាម' },
      { nameKh: 'សណ្តែកបាយត្រាំស្ងោរ', nameEn: 'Split mung beans soaked', amount: '៤០០ ក្រាម' },
      { nameKh: 'សាច់ជ្រូកបីជាន់ប្រឡាក់ម្រេចកំពត', nameEn: 'Pork belly seasoned with Kampot pepper', amount: '៤០០ ក្រាម' },
      { nameKh: 'ស្លឹកចេក និងខ្សែចេកសម្រាប់ចង', nameEn: 'Banana leaves and bamboo ties', amount: '១ បាច់' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'រៀបស្លឹកចេក ទ្រាប់អង្ករដំណើប សណ្តែកបាយ និងដាក់សាច់ជ្រូកចំកណ្តាល។', instructionEn: 'Layer banana leaves with sticky rice, mung beans, and center pork strip.' },
      { stepNumber: 2, instructionKh: 'មូររាងស៊ីឡាំងឱ្យណែនល្អ រួចចងខ្សែចេកឱ្យតឹងជុំវិញ។', instructionEn: 'Roll tightly into cylindrical parcels and tie securely with bamboo strings.' },
      { stepNumber: 3, instructionKh: 'ស្ងោរក្នុងឆ្នាំងធំរយៈពេល ៤-៥ ម៉ោង រហូតដល់ឆ្អិនទន់ណែនល្អ។', instructionEn: 'Boil continuously in a large cauldron for 4-5 hours until dense and tender.' },
    ],
  },
  {
    id: 'food-47',
    nameKh: 'សង់ខ្យាល្ពៅ',
    nameEn: 'Sangkhya Lapov (Steamed Pumpkin Custard)',
    categorySlug: 'dessert',
    categoryKh: 'បង្អែមខ្មែរ / រាជវាំង',
    categoryEn: 'Desserts / Pumpkin Custard',
    descriptionKh: 'សង់ខ្យាល្ពៅ ជាកំពូលបង្អែមរាជវាំងដ៏ប្រណិត។ យកល្ពៅមូលតូចឆ្កៀលគ្រាប់ចេញ រួចចាក់ទឹកខាប់ពីស៊ុតទា ខ្ទិះដូងខាប់ និងស្ករត្នោតចូល ហើយចំហុយរហូតសាច់ល្ពៅនិងសង់ខ្យាឆ្អិនទន់រលោង។',
    descriptionEn: 'Spectacular royal Cambodian dessert: whole baby kabocha pumpkin hollowed out, filled with luscious duck egg, coconut milk, and palm sugar custard, then steamed until velvety.',
    photoUrl: '/foods/food-47.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-47.jpg',
    prepTime: '២០ នាទី',
    cookTime: '៤០ នាទី',
    servings: '៤-៦ នាក់',
    calories: 320,
    difficulty: 'medium',
    priceRiel: 16000,
    priceUsd: 4.0,
    rating: 4.9,
    reviewCount: 185,
    isFeatured: true,
    ingredients: [
      { nameKh: 'ផ្លែល្ពៅមូលតូចស្អាត', nameEn: 'Whole baby kabocha pumpkin', amount: '១ ផ្លែ' },
      { nameKh: 'ស៊ុតទា', nameEn: 'Duck eggs', amount: '៤ គ្រាប់' },
      { nameKh: 'ខ្ទិះដូងដើមខាប់', nameEn: 'Thick coconut cream', amount: '២០០ មីលីលីត្រ' },
      { nameKh: 'ស្ករត្នោតសុទ្ធ', nameEn: 'Authentic palm sugar', amount: '១០០ ក្រាម' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'កាត់ក្បាលល្ពៅ ឆ្កៀលយកគ្រាប់ចេញឱ្យស្អាត។', instructionEn: 'Slice top off pumpkin, scoop out seeds and inner fibers.' },
      { stepNumber: 2, instructionKh: 'វាយស៊ុតទា ខ្ទិះដូង ស្ករត្នោត និងអំបិលបន្តិចឱ្យរលាយចូលគ្នា រួចត្រងយកពពុះចេញ។', instructionEn: 'Whisk duck eggs, coconut cream, and palm sugar; strain into smooth custard.' },
      { stepNumber: 3, instructionKh: 'ចាក់ទឹកសង់ខ្យាចូលក្នុងល្ពៅ រួចចំហុយ ៤០ នាទីរហូតដល់ឆ្អិនណែនល្អ។', instructionEn: 'Pour custard into pumpkin cavity and steam gently for 40 minutes.' },
    ],
  },
  {
    id: 'food-48',
    nameKh: 'បង្អែមចេកខ្ទិះស្ករត្នោត',
    nameEn: 'Chek Ktis (Warm Banana in Sweet Coconut Cream)',
    categorySlug: 'dessert',
    categoryKh: 'បង្អែមខ្មែរ / ពេញនិយម',
    categoryEn: 'Desserts / Coconut Banana',
    descriptionKh: 'បង្អែមចេកខ្ទិះ ប្រើចេកណាំវ៉ាទុំផ្អែម ចម្អិនក្នុងទឹកខ្ទិះដូងខាប់ ស្លឹកតើយ ស្ករត្នោត និងគ្រាប់សាគូ រោយល្ងសលីងពីលើ ទទួលទានក្តៅៗឈ្ងុយឆ្ងាញ់។',
    descriptionEn: 'Comforting warm dessert of ripe sweet bananas simmered in thick coconut cream, tapioca pearls, pandan leaves, and toasted white sesame.',
    photoUrl: '/foods/food-48.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-48.jpg',
    prepTime: '១០ នាទី',
    cookTime: '១៥ នាទី',
    servings: '៣ នាក់',
    calories: 270,
    difficulty: 'easy',
    priceRiel: 6000,
    priceUsd: 1.5,
    rating: 4.8,
    reviewCount: 130,
    ingredients: [
      { nameKh: 'ចេកណាំវ៉ាទុំកាត់កង់ៗ', nameEn: 'Ripe small bananas sliced', amount: '៥-៦ ផ្លែ' },
      { nameKh: 'ខ្ទិះដូងខាប់', nameEn: 'Coconut milk', amount: '៤០០ មីលីលីត្រ' },
      { nameKh: 'គ្រាប់សាគូ និងស្លឹកតើយ', nameEn: 'Tapioca pearls and pandan leaf', amount: '៥០ ក្រាម' },
      { nameKh: 'ស្ករត្នោត និងល្ងសលីង', nameEn: 'Palm sugar and toasted sesame seeds', amount: '២ ស្លាបព្រាបាយ' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ដាំខ្ទិះដូងជាមួយស្លឹកតើយ និងគ្រាប់សាគូឱ្យឆ្អិនថ្លា។', instructionEn: 'Simmer coconut milk with pandan and tapioca pearls until translucent.' },
      { stepNumber: 2, instructionKh: 'ដាក់ចេកណាំវ៉ា និងស្ករត្នោតចូល រម្ងាស់ ៥ នាទីឱ្យចូលជាតិ។', instructionEn: 'Add banana slices and palm sugar, simmer gently for 5 minutes.' },
      { stepNumber: 3, instructionKh: 'ដួសដាក់ចាន រោយល្ងសលីងឈ្ងុយៗពីលើ។', instructionEn: 'Ladle into bowls and garnish with toasted sesame seeds.' },
    ],
  },

  // ==========================================
  // CATEGORY 8: អាហារសម្រន់ & ម្ហូបពិសេស (STREET FOOD & SPECIALTIES) - 10 Dishes
  // ==========================================
  {
    id: 'food-49',
    nameKh: 'នំប៉័ងប៉ាតេពិសេស',
    nameEn: 'Num Pang Pate (Khmer Baguette Sandwich)',
    categorySlug: 'specialty',
    categoryKh: 'អាហារសម្រន់ / នំប៉័ង',
    categoryEn: 'Street Food / Sandwiches',
    descriptionKh: 'នំប៉័ងប៉ាតេខ្មែរ មានសម្បកស្រួយស្រោក លាបប៉ាតេថ្លើមជ្រូក ប៊័រធ្វើដោយដៃ ញាត់សាច់ក្រកជ្រូក សាច់ប៉ាតេ ជ្រក់ល្ហុងត្រសក់ និងទឹកម្ទេសហឹរឈ្ងុយ។',
    descriptionEn: 'The famous Cambodian street-corner sandwich: crisp crusty baguette layered with rich liver pâté, homemade mayonnaise, pork ham, pickled green papaya, and chili sauce.',
    photoUrl: '/foods/food-49.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific',
    originalPhotoUrl: '/foods/food-49.jpg',
    prepTime: '១០ នាទី',
    cookTime: '៥ នាទី',
    servings: '១ នាក់',
    calories: 460,
    difficulty: 'easy',
    priceRiel: 8000,
    priceUsd: 2.0,
    rating: 4.9,
    reviewCount: 390,
    isFeatured: true,
    ingredients: [
      { nameKh: 'នំប៉័ងបារាំងស្រួយ', nameEn: 'Crispy French baguette', amount: '១ ដើម' },
      { nameKh: 'ប៉ាតេថ្លើមជ្រូក និងប៊័រ', nameEn: 'Pork liver pâté and homemade butter', amount: '៣ ស្លាបព្រាបាយ' },
      { nameKh: 'សាច់ក្រក និងសាច់ប៉ាតេហាន់', nameEn: 'Cambodian sausage and cold cuts', amount: '១០០ ក្រាម' },
      { nameKh: 'ជ្រក់ល្ហុង ត្រសក់ និងទឹកម្ទេស', nameEn: 'Pickled papaya, cucumber, chili sauce', amount: 'តាមចំណូលចិត្ត' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'វះនំប៉័ងជាពីរ លាបប៊័រ និងប៉ាតេថ្លើមជ្រូកឱ្យសព្វ។', instructionEn: 'Slice baguette lengthwise, spread generously with butter and pâté.' },
      { stepNumber: 2, instructionKh: 'រៀបសាច់ក្រក និងសាច់ប៉ាតេ ដាក់ជ្រក់ល្ហុង និងត្រសក់ចូល។', instructionEn: 'Layer cold cuts, sausages, and crunchy pickled papaya inside.' },
      { stepNumber: 3, instructionKh: 'ស្រក់ទឹកម្ទេសបន្តិច រួចកាត់ជាពីរទទួលទានក្តៅៗ។', instructionEn: 'Drizzle with chili sauce, cut in half and enjoy crispy.' },
    ],
  },
  {
    id: 'food-50',
    nameKh: 'ពងទាកូនទឹកម្រេចក្រូចឆ្មា',
    nameEn: 'Balut with Kampot Lime & Pepper (Pong Tea Kon)',
    categorySlug: 'specialty',
    categoryKh: 'អាហារសម្រន់ / ពេញនិយម',
    categoryEn: 'Street Food / Balut',
    descriptionKh: 'ពងទាកូន ស្ងោរក្តៅហុយៗ ទទួលទានជាមួយស្លឹកជីរលាក់ ទឹកជ្រលក់អំបិលម្រេចកំពតក្រូចឆ្មាស្រស់ និងខ្ញីហាន់សរសៃ មានរសជាតិផ្អែមទឹកស៊ុបធម្មជាតិ។',
    descriptionEn: 'Popular evening street snack: freshly steamed fertilized duck eggs served piping hot with laksa leaves (chi lak), pickled ginger, and lime-Kampot pepper salt.',
    photoUrl: '/foods/food-50.jpg',
    imageAuditStatus: 'verified',
    imageAuditNote: 'បានយល់ព្រមផ្ទៀងផ្ទាត់ដោយរដ្ឋបាលផ្លូវការ',
    originalPhotoUrl: '/foods/food-50.jpg',
    isCustomPhoto: true,
    photoUpdatedAt: '2026-10-25T03:42:57.936Z',
    prepTime: '៥ នាទី',
    cookTime: '២០ នាទី',
    servings: '១-២ នាក់',
    calories: 180,
    difficulty: 'easy',
    priceRiel: 3000,
    priceUsd: 0.75,
    rating: 4.7,
    reviewCount: 210,
    ingredients: [
      { nameKh: 'ពងទាកូនខ្មែរ', nameEn: 'Fertilized duck eggs', amount: '២-៣ គ្រាប់' },
      { nameKh: 'ស្លឹកជីរលាក់ស្រស់', nameEn: 'Fresh Vietnamese coriander / laksa leaves', amount: '១ ក្តាប់' },
      { nameKh: 'អំបិលម្រេចកំពត និងក្រូចឆ្មា', nameEn: 'Kampot black pepper, salt, lime juice', amount: 'សម្រាប់ទឹកជ្រលក់' },
    ],
    steps: [
      { stepNumber: 1, instructionKh: 'ស្ងោរពងទាកូនក្នុងទឹកពុះរយៈពេល ២០ នាទីឱ្យឆ្អិនល្អ។', instructionEn: 'Boil eggs gently in water for 20 minutes until piping hot.' },
      { stepNumber: 2, instructionKh: 'លាយអំបិល ម្រេចកំពតម៉ត់ និងច្របាច់ទឹកក្រូចឆ្មា។', instructionEn: 'Mix fine Kampot pepper, sea salt, and fresh lime juice.' },
      { stepNumber: 3, instructionKh: 'គោះក្បាលពងទា ស្រក់ទឹកជ្រលក់ចូល និងទទួលទានជាមួយជីរលាក់។', instructionEn: 'Crack top shell, sip savory broth, spoon meat with dip and laksa leaves.' },
    ],
  },
];

// Dynamically generate the full collection up to 105 dishes so all 100+ items are distinct, rich, and authentic!

// Comprehensive Verified Khmer Recipe and Ingredient Ledger for Dishes 51 to 100
export const AUTHENTIC_FOOD_RECIPES = {
  "food-51": {
    "nameKh": "សម្លម្ជូរត្រីដៀបត្រួយអំពិល",
    "nameEn": "Dieb Fish & Young Tamarind Leaf Sour Soup",
    "cat": "soup",
    "catKh": "ម្ហូបសម្ល / ម្ជូរ",
    "catEn": "Soup / Sour Stew",
    "descKh": "សម្លម្ជូរត្រីដៀបត្រួយអំពិល ជាសម្លស្រុកស្រែតាមដងទន្លេដ៏ឈ្ងុយឆ្ងាញ់ ប្រើត្រីដៀបទឹកសាបស្រស់សាច់ផ្អែម ចម្អិនជាមួយត្រួយអំពិលខ្ចីជូរស្រស់ធម្មជាតិ គល់ស្លឹកគ្រៃ ប្រហុកបន្តិច និងជីរម្អម។",
    "descEn": "Authentic Cambodian riverside sour soup made with sweet freshwater Dieb fish, tender tart young tamarind leaves, bruised lemongrass, a touch of prahok, and fragrant rice paddy herbs.",
    "prepTime": "១៥ នាទី",
    "cookTime": "២០ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 220,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "ត្រីដៀបស្រស់លាងស្អាតកាត់កង់",
        "nameEn": "Fresh freshwater Dieb fish, cleaned and cut",
        "amount": "៤៥០ ក្រាម"
      },
      {
        "nameKh": "ត្រួយអំពិលខ្ចីបេះលាងស្អាត",
        "nameEn": "Tender young tamarind leaves and shoots",
        "amount": "១៥០ ក្រាម"
      },
      {
        "nameKh": "គល់ស្លឹកគ្រៃដំ និងរំដេងបន្តិច",
        "nameEn": "Bruised lemongrass stalk and sliced galangal",
        "amount": "២ គល់"
      },
      {
        "nameKh": "ប្រហុកសាច់ និងខ្ទឹមសដំ",
        "nameEn": "Prahok paste and crushed garlic",
        "amount": "កន្លះស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ទឹកត្រី អំបិល និងស្ករត្នោតបន្តិច",
        "nameEn": "Fish sauce, sea salt, and pinch of palm sugar",
        "amount": "១ ស្លាបព្រាបាយកន្លះ"
      },
      {
        "nameKh": "ជីរម្អម ជីររណារ និងម្ទេសក្រហម",
        "nameEn": "Rice paddy herb, culantro, and fresh red chilies",
        "amount": "១ ក្តាប់តូច"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "លាងសម្អាតត្រីដៀបជាមួយអំបិលឱ្យអស់រំអិល កាត់ជាកង់ល្មម។ បេះត្រួយអំពិលខ្ចីយកតែស្លឹកនិងទងខ្ចីៗ លាងទឹកឱ្យស្អាត។",
        "instructionEn": "Clean Dieb fish with salt to remove slime and cut into pieces. Pick tender young tamarind leaves and rinse clean."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាំទឹកឱ្យពុះខ្លាំង បង់គល់ស្លឹកគ្រៃដំ រំដេង ខ្ទឹមស និងរំលាយប្រហុកសាច់បន្តិចឱ្យឈ្ងុយទឹកសម្ល។",
        "instructionEn": "Bring water to a rolling boil with bruised lemongrass, galangal, garlic, and a touch of prahok until fragrant."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដាក់សាច់ត្រីដៀបចូល (កុំកូរខ្លាំងកុំឱ្យបែកសាច់ត្រី) រម្ងាស់ឱ្យឆ្អិន រួចថែមទឹកត្រី អំបិល និងស្ករត្នោតបន្តិច។",
        "instructionEn": "Gently add Dieb fish without stirring so the flesh stays intact; simmer until cooked and season with fish sauce, salt, and palm sugar."
      },
      {
        "stepNumber": 4,
        "instructionKh": "បង់ត្រួយអំពិលខ្ចីចូលឱ្យចេញជាតិជូរស្រស់ តាមដោយជីរម្អម ជីររណារ និងម្ទេស រួចលើកចុះទទួលទានក្តៅៗ។",
        "instructionEn": "Stir in young tamarind leaves to release their natural tang, top with paddy herbs, culantro, and chilies, and serve hot."
      }
    ]
  },
  "food-52": {
    "nameKh": "សម្លម្ជូរទងល្ពៅ",
    "nameEn": "Pumpkin Vine Shoot & Fish Sour Soup",
    "cat": "soup",
    "catKh": "ម្ហូបសម្ល / ម្ជូរ",
    "catEn": "Soup / Sour Stew",
    "descKh": "សម្លម្ជូរទងល្ពៅ ចម្អិនពីសាច់ត្រីស្រស់ផ្អែមទឹកស៊ុប លាយជាមួយទងល្ពៅនិងត្រួយល្ពៅខ្ចីសកសរសៃស្រួយៗ ប្រហុកបន្តិច ទឹកអំពិលទុំ និងជីរនាងវង រសជាតិជូរស្រាលផ្អែមធម្មជាតិបែបស្រុកស្រែ។",
    "descEn": "Countryside Cambodian sour soup prepared with fresh river fish, tender peeled pumpkin vine shoots, a hint of savory prahok, tangy ripe tamarind, and aromatic lemon basil.",
    "prepTime": "២០ នាទី",
    "cookTime": "២០ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 220,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "ត្រីរ៉ស់ ឬត្រីអណ្តែងស្រស់កាត់កង់",
        "nameEn": "Fresh river fish steaks",
        "amount": "៤០០ ក្រាម"
      },
      {
        "nameKh": "ទងល្ពៅ និងត្រួយល្ពៅខ្ចីសកសរសៃស្អាត",
        "nameEn": "Young pumpkin vine shoots, peeled of outer fibers",
        "amount": "៣០០ ក្រាម"
      },
      {
        "nameKh": "ល្ពៅខ្ចីហាន់ចំណិតតូចៗ (តាមចំណូលចិត្ត)",
        "nameEn": "Young pumpkin wedges (optional)",
        "amount": "១៥០ ក្រាម"
      },
      {
        "nameKh": "ទឹកអំពិលទុំ និងប្រហុកសាច់បន្តិច",
        "nameEn": "Ripe tamarind juice and pinch of prahok paste",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "គល់ស្លឹកគ្រៃដំ និងខ្ទឹមសដំ",
        "nameEn": "Bruised lemongrass and crushed garlic",
        "amount": "២ គល់"
      },
      {
        "nameKh": "ជីរនាងវង ម្ទេស ទឹកត្រី និងស្ករត្នោត",
        "nameEn": "Lemon basil, chili, fish sauce, and palm sugar",
        "amount": "តាមចំណូលចិត្ត"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "សកសរសៃរឹងៗចេញពីទងល្ពៅ និងត្រួយល្ពៅខ្ចី កាច់ជាកំណាត់ល្មម រួចលាងទឹកឱ្យស្អាត។ លាងត្រីកាត់ជាកង់ៗ។",
        "instructionEn": "Strip the tough outer fibers from young pumpkin vine shoots, snap into segments, and wash well. Clean and slice the fish."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាំទឹកឱ្យពុះ បង់គល់ស្លឹកគ្រៃដំ ខ្ទឹមស និងរំលាយប្រហុកសាច់បន្តិច រួចដាក់សាច់ត្រី (និងចំណិតល្ពៅបើប្រើ) ចូលរម្ងាស់ឱ្យឆ្អិន។",
        "instructionEn": "Boil water with lemongrass, garlic, and prahok, then gently simmer the fish pieces until cooked."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ចាក់ទឹកអំពិលទុំ ថែមទឹកត្រី អំបិល និងស្ករត្នោតបន្តិច រួចបង់ទងល្ពៅខ្ចីចូលស្ងោរ ២-៣ នាទីឱ្យឆ្អិនស្រួយល្មម។",
        "instructionEn": "Add tamarind juice, fish sauce, salt, and palm sugar, then toss in pumpkin vine shoots and cook 2-3 minutes until tender-crisp."
      },
      {
        "stepNumber": 4,
        "instructionKh": "បង់ស្លឹកជីរនាងវង និងម្ទេស រួចលើកចុះភ្លាមៗ ដួសទទួលទានជាមួយបាយក្ដៅៗ។",
        "instructionEn": "Fold in fresh lemon basil and chilies, remove from heat, and serve warm with steamed rice."
      }
    ]
  },
  "food-53": {
    "nameKh": "សម្លម្ជូរទំពាំងត្រីឆ្អើរ",
    "nameEn": "Bamboo Shoot & Smoked Fish Soup",
    "cat": "soup",
    "catKh": "ម្ហូបសម្ល / ម្ជូរ",
    "catEn": "Soup / Sour Stew",
    "descKh": "សម្លម្ជូរទំពាំងត្រីឆ្អើរ ជាសម្លប្រពៃណីខ្មែរជនបទដ៏ពេញនិយម មានក្លិនឈ្ងុយត្រីឆ្អើរជាប់ច្រមុះ អមដោយទំពាំងស្រស់ស្រួយផ្អែម និងស្លឹកបាសធម្មជាតិ។",
    "descEn": "Rustic Cambodian country soup with fragrant smoked fish flakes, tender bamboo shoots, fresh tamarind, and sweet ivy gourd greens.",
    "prepTime": "១៥ នាទី",
    "cookTime": "២៥ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 195,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "ត្រីឆ្អើរបេះយកសាច់ធំៗ",
        "nameEn": "Flaked smoked freshwater fish",
        "amount": "២០០ ក្រាម"
      },
      {
        "nameKh": "ទំពាំងស្រស់ហាន់សរសៃស្ងោរស្រុះ",
        "nameEn": "Parboiled shredded bamboo shoots",
        "amount": "២៥០ ក្រាម"
      },
      {
        "nameKh": "ស្លឹកអំពិលខ្ចី ឬទឹកអំពិលទុំ",
        "nameEn": "Young tamarind leaves or tamarind juice",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ស្លឹកបាសស្រស់",
        "nameEn": "Fresh ivy gourd leaves",
        "amount": "១ កន្ត្រកតូច"
      },
      {
        "nameKh": "ទឹកត្រី និងអំបិល",
        "nameEn": "Fish sauce and sea salt",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ម្ទេសដៃនាងហាន់",
        "nameEn": "Fresh chili slices",
        "amount": "តាមចំណូលចិត្ត"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ស្ងោរទំពាំងបង្ហូរទឹកចោលមួយសារដើម្បីកាត់បន្ថយជាតិចត់។ បេះត្រីឆ្អើរជាដុំៗ។",
        "instructionEn": "Boil bamboo shoots and drain to remove bitterness. Flake smoked fish."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាំទឹកឱ្យពុះ ដាក់ត្រីឆ្អើរ និងទំពាំងចូលរម្ងាស់ឱ្យទឹកស៊ុបចេញក្លិនឈ្ងុយ។",
        "instructionEn": "Bring water to boil, add smoked fish and bamboo shoots, simmering to extract flavors."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ថែមទឹកអំពិល ទឹកត្រី អំបិល និងស្ករត្នោតបន្តិច ភ្លក្សរសជាតិជូរស្រទន់។",
        "instructionEn": "Season with tamarind, fish sauce, salt, and palm sugar for a balanced tang."
      },
      {
        "stepNumber": 4,
        "instructionKh": "បង់ស្លឹកបាសចូលកូរត្រឡប់មួយភ្លែត រួចដួសទទួលទានជាមួយបាយ។",
        "instructionEn": "Stir in ivy gourd leaves, remove from heat, and serve with rice."
      }
    ]
  },
  "food-54": {
    "nameKh": "សម្លប្រហើរននោងបង្គាស្រស់",
    "nameEn": "Luffa Gourd Fresh Shrimp Herbal Soup",
    "cat": "soup",
    "catKh": "ម្ហូបសម្ល / ប្រហើរ",
    "catEn": "Soup / Herbal Broth",
    "descKh": "សម្លប្រហើរននោងបង្គាស្រស់ ប្រើគ្រឿងបុកស្លឹកគ្រៃ រមៀត ខ្ទឹមស និងប្រហុកសាច់បន្តិច ចម្អិនជាមួយបង្គាស្រស់ផ្អែម និងននោងខ្ចី ជួយសម្រួលការរំលាយអាហារ និងមានសុខភាពល្អ។",
    "descEn": "Nutritious Cambodian herbal clear soup featuring tender young luffa sponge gourd, sweet sea prawns, and crushed lemongrass kroeung.",
    "prepTime": "១៥ នាទី",
    "cookTime": "១៥ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 180,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "បង្គាស្រស់បកសំបកទុកកន្ទុយ",
        "nameEn": "Fresh prawns, peeled with tails on",
        "amount": "២៥០ ក្រាម"
      },
      {
        "nameKh": "ននោងខ្ចីចិតសំបកកាត់ចំណិត",
        "nameEn": "Peeled young luffa gourd slices",
        "amount": "២ ផ្លែ"
      },
      {
        "nameKh": "គ្រឿងបុកប្រហើរ (ស្លឹកគ្រៃ រមៀត ខ្ទឹមស)",
        "nameEn": "Proher lemongrass kroeung paste",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ប្រហុកសាច់ចិញ្ច្រាំ",
        "nameEn": "Minced prahok",
        "amount": "កន្លះស្លាបព្រាកាហ្វេ"
      },
      {
        "nameKh": "ស្លឹកបាស និងស្លឹកម្រុំ",
        "nameEn": "Moringa and ivy gourd leaves",
        "amount": "១ ចាន"
      },
      {
        "nameKh": "ទឹកត្រី និងអំបិល",
        "nameEn": "Fish sauce and salt",
        "amount": "១ ស្លាបព្រាបាយ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "រំលាយគ្រឿងបុក និងប្រហុកក្នុងទឹកពុះឱ្យចេញក្លិនឈ្ងុយប្រហើរ។",
        "instructionEn": "Dissolve kroeung paste and prahok into boiling water until deeply aromatic."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាក់បង្គាស្រស់ចូលឱ្យឆ្អិនឡើងពណ៌ក្រហមផ្អែម។",
        "instructionEn": "Add fresh prawns and cook gently until pink and tender."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដាក់ននោងចូលរម្ងាស់ ២ នាទី ថែមទឹកត្រី និងអំបិល។",
        "instructionEn": "Add sliced luffa gourd, cook for 2 minutes, and season with fish sauce."
      },
      {
        "stepNumber": 4,
        "instructionKh": "បង់ស្លឹកបាស និងស្លឹកម្រុំលើកចុះភ្លាមៗ រសជាតិផ្អែមបន្លែធម្មជាតិ។",
        "instructionEn": "Add moringa leaves, remove from heat immediately, and enjoy."
      }
    ]
  },
  "food-55": {
    "nameKh": "សម្លស្ងោរម្រះញាត់សាច់ជ្រូក",
    "nameEn": "Bitter Melon Stuffed with Pork Soup",
    "cat": "soup",
    "catKh": "ម្ហូបស្ងោរ / ស៊ុប",
    "catEn": "Soup / Clear Broth",
    "descKh": "សម្លស្ងោរម្រះញាត់សាច់ជ្រូក ប្រើម្រះខ្ចីឆ្កៀលគ្រាប់ ញាត់សាច់ជ្រូកចិញ្ច្រាំលាយមីសួរ និងផ្សិតត្រចៀកកណ្តុរ រម្ងាស់ក្នុងទឹកស៊ុបឆ្អឹងជ្រូកថ្លាឈ្ងុយម្រេចកំពត មានគុណប្រយោជន៍ត្រជាក់ក្នុងខ្លួន។",
    "descEn": "Classic clear comforting soup of bitter melon rings stuffed with seasoned minced pork, glass noodles, and wood ear mushrooms.",
    "prepTime": "២៥ នាទី",
    "cookTime": "៣៥ នាទី",
    "servings": "៤-៥ នាក់",
    "calories": 240,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "ផ្លែម្រះខ្ចីកាត់កង់ឆ្កៀលគ្រាប់",
        "nameEn": "Bitter gourd sliced into 2-inch hollow rings",
        "amount": "២ ផ្លែធំ"
      },
      {
        "nameKh": "សាច់ជ្រូកចិញ្ច្រាំជាប់ខ្លាញ់បន្តិច",
        "nameEn": "Minced pork shoulder",
        "amount": "៣០០ ក្រាម"
      },
      {
        "nameKh": "មីសួរ និងផ្សិតត្រចៀកកណ្តុរហាន់",
        "nameEn": "Soaked glass noodles & wood ear mushrooms",
        "amount": "៥០ ក្រាម"
      },
      {
        "nameKh": "ទឹកស៊ុបឆ្អឹងជ្រូកថ្លា",
        "nameEn": "Clear pork bone stock",
        "amount": "១ លីត្រ"
      },
      {
        "nameKh": "ខ្ទឹមស ម្រេចកំពត ស្លឹកខ្ទឹម",
        "nameEn": "Garlic, Kampot pepper, scallions",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ទឹកត្រី និងអំបិល",
        "nameEn": "Fish sauce and salt",
        "amount": "១ ស្លាបព្រាបាយ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ច្របល់សាច់ជ្រូកជាមួយមីសួរ ផ្សិតត្រចៀកកណ្តុរ ខ្ទឹមស ម្រេច និងទឹកត្រី រួចញាត់ចូលក្នុងកង់ម្រះឱ្យណែនស្អាត។",
        "instructionEn": "Mix minced pork with glass noodles, mushrooms, garlic, and pepper, then stuff firmly into bitter melon rings."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាំទឹកស៊ុបឆ្អឹងជ្រូកឱ្យពុះ ដួសពពុះចេញឱ្យទឹកថ្លា។",
        "instructionEn": "Bring pork stock to boil and skim off froth to ensure clear broth."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដាក់ម្រះញាត់សាច់ចូល រម្ងាស់ភ្លើងតិចៗ ៣០ នាទីរហូតដល់ម្រះទន់ល្មមបាត់ជាតិល្វីងខ្លាំង។",
        "instructionEn": "Gently lower stuffed melon into broth, simmering on low heat for 30 minutes."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ថែមទឹកត្រី អំបិល រោយស្លឹកខ្ទឹម និងម្រេចកំពត ដួសទទួលទានក្តៅៗ។",
        "instructionEn": "Season with fish sauce, garnish with scallions and crushed pepper, serve warm."
      }
    ]
  },
  "food-56": {
    "nameKh": "សម្លម្ជូរត្រីស្រែនិងក្តាម",
    "nameEn": "Field Fish & Paddy Crab Sour Soup",
    "cat": "soup",
    "catKh": "ម្ហូបសម្ល / ម្ជូរ",
    "catEn": "Soup / Sour Stew",
    "descKh": "សម្លម្ជូរត្រីស្រែនិងក្តាម ចម្អិនពីត្រីស្រែស្រស់ៗ និងក្តាមស្រែបេះស្នូកបុកយកទឹកខាប់ផ្អែម លាយជាមួយបន្លែស្រុកស្រែ ផ្កាកំប្លោក ឬត្រកួន ទឹកអំពិលទុំ និងប្រហុកសាច់បន្តិច រសជាតិជូរអែមឈ្ងុយជាតិក្តាមស្រែពិតៗ។",
    "descEn": "Rustic Cambodian countryside sour soup combining sweet wild field fish and rich paddy crab broth with crisp water hyacinth blossoms, tangy tamarind, prahok, and paddy herbs.",
    "prepTime": "២០ នាទី",
    "cookTime": "២០ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 230,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "ត្រីស្រែស្រស់ (ត្រីរ៉ស់ ឬត្រីអណ្តែង) លាងស្អាត",
        "nameEn": "Fresh wild field fish, cleaned and cut",
        "amount": "៣៥០ ក្រាម"
      },
      {
        "nameKh": "ក្តាមស្រែស្រស់លាងស្អាត បកស្នូក (ខ្លះបុកយកទឹក ខ្លះទុកទាំងគូ)",
        "nameEn": "Fresh paddy crabs (part pounded for broth, part halved)",
        "amount": "២៥០ ក្រាម"
      },
      {
        "nameKh": "ផ្កាកំប្លោក ឬត្រកួនស្រែស្រស់",
        "nameEn": "Fresh water hyacinth blossoms or field morning glory",
        "amount": "២០០ ក្រាម"
      },
      {
        "nameKh": "ទឹកអំពិលទុំ ឬអំពិលខ្ចី",
        "nameEn": "Ripe tamarind juice or crushed green tamarind",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ប្រហុកសាច់ និងគល់ស្លឹកគ្រៃដំ",
        "nameEn": "Prahok paste and bruised lemongrass",
        "amount": "១ ស្លាបព្រាកាហ្វេ"
      },
      {
        "nameKh": "ជីរម្អម ជីររណារ ម្ទេស ទឹកត្រី និងស្ករត្នោត",
        "nameEn": "Paddy herbs, culantro, chili, fish sauce, and palm sugar",
        "amount": "តាមចំណូលចិត្ត"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "លាងសម្អាតត្រីស្រែ និងក្តាមស្រែឱ្យស្អាត។ យកក្តាមស្រែពាក់កណ្តាលបុកលាយទឹកច្រោះយកទឹកក្តាមខាប់ ហើយពាក់កណ្តាលទៀតបកស្នូកកាត់ជាពីរ។",
        "instructionEn": "Clean field fish and paddy crabs thoroughly. Pound half the crabs with water and strain for rich crab broth; halve the remaining crabs."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាំទឹកក្តាមស្រែលើភ្លើងមធ្យមជាមួយគល់ស្លឹកគ្រៃដំ និងប្រហុកបន្តិច រហូតដល់ពុះអណ្តែតសាច់ក្តាមឡើងឈ្ងុយ។",
        "instructionEn": "Simmer the strained crab broth over medium heat with bruised lemongrass and prahok until rich crab curds float to the top."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដាក់ត្រីស្រែ កំណាត់ក្តាមស្រែ និងទឹកអំពិលទុំចូល រម្ងាស់ឱ្យឆ្អិន រួចថែមទឹកត្រី អំបិល និងស្ករត្នោតបន្តិច។",
        "instructionEn": "Add field fish, halved crabs, and tamarind juice; simmer until cooked and season with fish sauce, salt, and palm sugar."
      },
      {
        "stepNumber": 4,
        "instructionKh": "បង់ផ្កាកំប្លោក (ឬត្រកួន) ជីរម្អម ជីររណារ និងម្ទេស រម្ងាស់មួយភ្លែតរួចលើកចុះ ទទួលទានជាមួយបាយក្តៅៗ។",
        "instructionEn": "Toss in water hyacinth blossoms, paddy herbs, and chilies briefly to stay crisp, then serve hot with steamed rice."
      }
    ]
  },
  "food-57": {
    "nameKh": "សម្លការីទាស្រែ",
    "nameEn": "Country Duck Red Curry with Green Banana",
    "cat": "soup",
    "catKh": "ម្ហូបការី / សម្ល",
    "catEn": "Curry / Traditional",
    "descKh": "សម្លការីទាស្រែ សាច់ទារម្ងាស់ជាមួយគ្រឿងការីក្រហមខ្មែរ ខ្ទិះដូងខាប់ និងចេកណាំវ៉ាខ្ចី ចេកមានសាច់ស្វិតផ្អែមស្រូបជាតិការីខាប់ឈ្ងុយ រោយសណ្តែកដីបុកពីលើ។",
    "descEn": "Rich, celebratory Cambodian red curry made with braised duck, unripe baby bananas, thick coconut cream, and crushed peanuts.",
    "prepTime": "២៥ នាទី",
    "cookTime": "៤០ នាទី",
    "servings": "៤-៦ នាក់",
    "calories": 420,
    "difficulty": "hard",
    "ingredients": [
      {
        "nameKh": "សាច់ទាស្រែកាប់ដុំល្មម",
        "nameEn": "Country duck cut into pieces",
        "amount": "៦០០ ក្រាម"
      },
      {
        "nameKh": "ចេកណាំវ៉ាខ្ចីចិតសំបកកាត់ចំណិត",
        "nameEn": "Green bananas peeled and sliced",
        "amount": "៤-៥ ផ្លែ"
      },
      {
        "nameKh": "គ្រឿងការីក្រហមខ្មែរ",
        "nameEn": "Khmer red curry paste",
        "amount": "៣ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ខ្ទិះដូងដើមខាប់ និងចុងខ្ទិះ",
        "nameEn": "Coconut cream and coconut milk",
        "amount": "៥០០ មីលីលីត្រ"
      },
      {
        "nameKh": "សណ្តែកដីលីងបុកម៉ត់",
        "nameEn": "Crushed roasted peanuts",
        "amount": "៣ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ស្ករត្នោត និងទឹកត្រី",
        "nameEn": "Palm sugar and fish sauce",
        "amount": "២ ស្លាបព្រាបាយ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "រំលីងគ្រឿងការីក្រហមជាមួយក្បាលខ្ទិះដូងឱ្យបែកប្រេងក្រហមឈ្ងុយ។",
        "instructionEn": "Fry red curry paste in coconut cream until fragrant and red oils separate."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាក់សាច់ទាចូលឆារម្ងាស់ឱ្យរឹបសាច់ចូលជាតិគ្រឿងសព្វល្អ។",
        "instructionEn": "Add duck pieces and sear until coated in fragrant curry."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ចាក់ចុងខ្ទិះដូងចូល រម្ងាស់ទាឱ្យផុយទន់ ២៥ នាទី រួចដាក់ចេកខ្ចីចូលរម្ងាស់បន្ត។",
        "instructionEn": "Pour in coconut milk, simmer duck for 25 minutes until tender, then add green bananas."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ពេលចេកទន់ ថែមស្ករត្នោត ទឹកត្រី និងរោយសណ្តែកដីបុក ទទួលទានជាមួយនំបុ័ង ឬនំបញ្ចុក។",
        "instructionEn": "Season with palm sugar, fish sauce, top with roasted peanuts, and serve with baguette or noodles."
      }
    ]
  },
  "food-58": {
    "nameKh": "ស្លាបមាន់អាំងទឹកឃ្មុំអំបិលម្ទេស",
    "nameEn": "Honey Glazed Spicy Chicken Wings",
    "cat": "grilled",
    "catKh": "ម្ហូបអាំង / សាច់អាំង",
    "catEn": "Grilled & BBQ",
    "descKh": "ស្លាបមាន់អាំងទឹកឃ្មុំអំបិលម្ទេស ប្រឡាក់ជាមួយទឹកឃ្មុំព្រៃធម្មជាតិ អំបិលម្ទេសហុយ និងខ្ទឹមស អាំងលើរងើកភ្លើងធ្យូងឡើងពណ៌ក្រហមស្រួយស្បែក សាច់ខាងក្នុងទន់ផ្អែមឆ្ងាញ់។",
    "descEn": "Succulent chicken wings marinated in natural wild honey, garlic, and crushed chili salt, charbroiled to crispy caramelized perfection.",
    "prepTime": "២០ នាទី",
    "cookTime": "២៥ នាទី",
    "servings": "២-៣ នាក់",
    "calories": 340,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "ស្លាបមាន់ស្រែស្រស់",
        "nameEn": "Fresh chicken wings",
        "amount": "៥០០ ក្រាម"
      },
      {
        "nameKh": "ទឹកឃ្មុំព្រៃធម្មជាតិ",
        "nameEn": "Pure wild honey",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ខ្ទឹមសចិញ្ច្រាំ និងម្ទេសបុក",
        "nameEn": "Minced garlic and crushed chilies",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ទឹកត្រី និងទឹកស៊ីអ៊ីវ",
        "nameEn": "Fish sauce and light soy sauce",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ម្រេចកំពតម៉ត់",
        "nameEn": "Freshly ground Kampot pepper",
        "amount": "កន្លះស្លាបព្រាកាហ្វេ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "លាងស្លាបមាន់ឱ្យស្អាត ឆូតខ្នងបន្តិចឱ្យងាយចូលជាតិគ្រឿង។",
        "instructionEn": "Clean chicken wings and make small incisions for marinade penetration."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ប្រឡាក់ជាមួយទឹកឃ្មុំ ខ្ទឹមស ទឹកស៊ីអ៊ីវ ទឹកត្រី អំបិលម្ទេស និងម្រេច ទុក ៣០ នាទី។",
        "instructionEn": "Marinate with honey, garlic, soy sauce, fish sauce, chili salt, and pepper for 30 minutes."
      },
      {
        "stepNumber": 3,
        "instructionKh": "អាំងលើរងើកភ្លើងធ្យូងមធ្យម លាបទឹកឃ្មុំសងខាងរហូតដល់ឡើងពណ៌ក្រហមស្រួយឈ្ងុយ។",
        "instructionEn": "Grill over glowing charcoal, basting with honey until golden brown and charred."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ទទួលទានក្តៅៗជាមួយជ្រក់ល្ហុង និងទឹកត្រីកោះកុង។",
        "instructionEn": "Serve sizzling hot with pickled green papaya and Koh Kong spicy dipping sauce."
      }
    ]
  },
  "food-59": {
    "nameKh": "ត្រីបំពងទឹកត្រីស្វាយខ្ចី",
    "nameEn": "Crispy Fried Fish with Green Mango Fish Sauce",
    "cat": "grilled",
    "catKh": "ម្ហូបបំពង / ទឹកត្រីស្វាយ",
    "catEn": "Crispy Fried / Green Mango Dip",
    "descKh": "ត្រីបំពងទឹកត្រីស្វាយខ្ចី ប្រើត្រីធម្មជាតិស្រស់ៗ ឆូតសងខាងបំពងក្នុងប្រេងក្តៅឱ្យស្បែកស្រួយពណ៌មាស សាច់ខាងក្នុងទន់ផ្អែម ស្រោចឬជ្រលក់ទឹកត្រីស្វាយខ្ចីសាប់ហឹរជូរអែមឈ្ងុយខ្ទឹមក្រហម។",
    "descEn": "Whole fresh river fish scored and deep-fried until golden and crackling-crisp on the outside yet tender inside, served with a vibrant sweet, sour, and spicy shredded green mango fish sauce.",
    "prepTime": "១៥ នាទី",
    "cookTime": "១៥ នាទី",
    "servings": "២-៣ នាក់",
    "calories": 320,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "ត្រីស្រស់ (ត្រីទីឡាព្យា ត្រីរ៉ស់ ឬត្រីដៀប) វះពោះស្អាត",
        "nameEn": "Whole fresh cleaned river fish",
        "amount": "១-២ ក្បាល (៦០០ ក្រាម)"
      },
      {
        "nameKh": "ស្វាយខ្ចីជូរស្រួយសាប់ជាសរសៃ",
        "nameEn": "Crisp sour green mango, finely julienned",
        "amount": "១ ផ្លែ"
      },
      {
        "nameKh": "ទឹកត្រីល្អ ស្ករត្នោត និងទឹកឆ្អិនបន្តិច",
        "nameEn": "Premium fish sauce, palm sugar, and warm water",
        "amount": "៣ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ខ្ទឹមក្រហម ខ្ទឹមស និងម្ទេសទុំហាន់ល្អិត",
        "nameEn": "Sliced shallots, minced garlic, and bird-eye chilies",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "អំបិលបន្តិច និងប្រេងឆាសម្រាប់បំពង",
        "nameEn": "Pinch of salt and cooking oil for deep-frying",
        "amount": "សម្រាប់បំពង"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "លាងសម្អាតត្រីឱ្យស្អាត ជូតឱ្យស្ងួតទឹក ឆូតសាច់សងខាង រួចលាបអំបិលម៉ត់ស្តើងៗលើខ្លួនត្រី។",
        "instructionEn": "Clean and scale the fish, pat completely dry, score both sides diagonally, and rub lightly with fine salt."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាក់ប្រេងក្នុងខ្ទះឱ្យក្តៅល្អ ដាក់ត្រីចូលបំពងលើភ្លើងមធ្យមរហូតដល់ឆ្អិនឡើងពណ៌មាសស្រួយស្រោកទាំងសងខាង រួចស្រង់ដាក់ចានឱ្យស្រក់ប្រេង។",
        "instructionEn": "Heat oil in a deep pan and fry the fish over medium-high heat until golden brown and crispy on both sides, then drain."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ធ្វើទឹកត្រីស្វាយខ្ចី៖ កូរស្ករត្នោត ទឹកត្រី និងទឹកក្តៅឧណ្ហៗបន្តិចឱ្យរលាយខាប់ល្មម រួចដាក់ខ្ទឹមស ខ្ទឹមក្រហម ម្ទេស និងស្វាយខ្ចីសាប់ចូលច្របល់ឱ្យសព្វ។",
        "instructionEn": "Make the green mango sauce: dissolve palm sugar in fish sauce and a splash of warm water, then fold in garlic, shallots, chilies, and shredded green mango."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ស្រោចទឹកត្រីស្វាយខ្ចីពីលើត្រីបំពងក្តៅៗ ឬដាក់ចានជ្រលក់ផ្សេង ទទួលទានជាមួយបាយសក្តៅៗ។",
        "instructionEn": "Spoon the zesty green mango sauce over the crispy fried fish or serve alongside as a dip with hot jasmine rice."
      }
    ]
  },
  "food-60": {
    "nameKh": "កោះមាន់អាំងគ្រឿងស្លឹកគ្រៃ",
    "nameEn": "Grilled Chicken Gizzards with Kroeung",
    "cat": "grilled",
    "catKh": "ម្ហូបអាំង / អាហារសម្រន់",
    "catEn": "Grilled & BBQ",
    "descKh": "កោះមាន់អាំងគ្រឿងស្លឹកគ្រៃ ប្រឡាក់ជាមួយគ្រឿងបុកខ្មែរ រមៀត និងខ្ទិះដូងបន្តិច ដោតចង្កាក់អាំងឈ្ងុយឈ្ងប់ សាច់កោះមាន់ស្រួយស្វិតចូលជាតិគ្រឿងឆ្ងាញ់។",
    "descEn": "Crunchy and flavorful skewered chicken gizzards marinated with aromatic lemongrass kroeung, coconut milk, and grilled over open embers.",
    "prepTime": "២៥ នាទី",
    "cookTime": "២០ នាទី",
    "servings": "២-៣ នាក់",
    "calories": 230,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "កោះមាន់ស្រស់លាងស្អាត",
        "nameEn": "Cleaned fresh chicken gizzards",
        "amount": "៤០០ ក្រាម"
      },
      {
        "nameKh": "គ្រឿងបុកស្លឹកគ្រៃរមៀត",
        "nameEn": "Lemongrass turmeric kroeung",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ខ្ទិះដូងបន្តិច",
        "nameEn": "Coconut milk for tenderness",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ទឹកត្រី និងស្ករត្នោត",
        "nameEn": "Fish sauce and palm sugar",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ប្រេងខ្យង និងម្រេចកំពត",
        "nameEn": "Oyster sauce and Kampot pepper",
        "amount": "១ ស្លាបព្រាកាហ្វេ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "លាងកោះមាន់ជាមួយអំបិល និងទឹកក្រូចឆ្មាឱ្យស្អាតអស់រំអិល កាត់ចំណិតល្មម។",
        "instructionEn": "Scrub gizzards thoroughly with salt and lime juice, rinse and slice into pieces."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ប្រឡាក់ជាមួយគ្រឿងបុក ខ្ទិះដូង ទឹកត្រី ស្ករត្នោត និងប្រេងខ្យង ទុក ១ ម៉ោង។",
        "instructionEn": "Marinate with kroeung paste, coconut milk, fish sauce, and seasonings for 1 hour."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដោតចង្កាក់ឬស្សី រួចអាំងលើភ្លើងធ្យូងរហូតដល់ឆ្អិនក្រហមឈ្ងុយ។",
        "instructionEn": "Thread onto bamboo skewers and grill over embers until fragrant and charred."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ទទួលទានជាមួយជ្រក់ត្រសក់ និងទឹកម្ទេសខ្មែរ។",
        "instructionEn": "Serve with pickled cucumber relish and Khmer chili sauce."
      }
    ]
  },
  "food-61": {
    "nameKh": "សាច់ជ្រូកអាំង",
    "nameEn": "Charcoal Grilled Marinated Pork",
    "cat": "grilled",
    "catKh": "ម្ហូបអាំង / សាច់អាំង",
    "catEn": "Grilled & BBQ",
    "descKh": "សាច់ជ្រូកអាំង ប្រើសាច់ជ្រូកជាប់ខ្លាញ់បន្តិច ប្រឡាក់គ្រឿងខ្ទឹមស ម្រេចកំពត ស្ករត្នោត ទឹកត្រី និងខ្ទិះដូង អាំងលើរងើកភ្លើងធ្យូងឱ្យឡើងពណ៌ក្រហមឈ្ងុយ សាច់ទន់ផ្អែមចូលជាតិឆ្ងាញ់ពិសា។",
    "descEn": "Succulent Cambodian charcoal-grilled pork shoulder or belly strips marinated in crushed garlic, Kampot black pepper, palm sugar, soy sauce, and a touch of coconut milk.",
    "prepTime": "២០ នាទី",
    "cookTime": "២០ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 360,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "សាច់ជ្រូកជាប់ខ្លាញ់ (សាច់ស្មា ឬសាច់បីជាន់) ហាន់បន្ទះល្មម",
        "nameEn": "Pork shoulder or pork belly cut into grill strips",
        "amount": "៤៥០ ក្រាម"
      },
      {
        "nameKh": "ខ្ទឹមសបុក និងម្រេចកំពតបុកម៉ត់",
        "nameEn": "Crushed garlic and ground Kampot black pepper",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ស្ករត្នោត ទឹកត្រី ទឹកស៊ីអ៊ីវ និងប្រេងខ្យង",
        "nameEn": "Palm sugar, fish sauce, soy sauce, and oyster sauce",
        "amount": "២ ស្លាបព្រាបាយកន្លះ"
      },
      {
        "nameKh": "ក្បាលខ្ទិះដូង ឬប្រេងល្ងបន្តិច",
        "nameEn": "Splash of coconut cream or sesame oil for tenderness",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ជ្រក់ល្ហុងត្រសក់ និងទឹកត្រីកោះកុង",
        "nameEn": "Pickled papaya-cucumber and dipping sauce",
        "amount": "១ ចានតូច"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "លាងសាច់ជ្រូកឱ្យស្អាត ហាន់ជាបន្ទះកម្រាស់ល្មមដើម្បីពេលអាំងឆ្អិនស្មើសាច់ និងនៅរក្សាភាពទន់។",
        "instructionEn": "Wash pork and slice into medium-thick strips so it stays juicy on the grill."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ប្រឡាក់សាច់ជ្រូកជាមួយខ្ទឹមសបុក ម្រេចកំពត ស្ករត្នោត ទឹកត្រី ទឹកស៊ីអ៊ីវ ប្រេងខ្យង និងខ្ទិះដូងបន្តិច ផ្អាប់ទុក ៣០ នាទីឱ្យចូលជាតិ។",
        "instructionEn": "Marinate pork with garlic, Kampot pepper, palm sugar, fish sauce, soy sauce, oyster sauce, and coconut cream for 30 minutes."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដាក់អាំងលើរងើកភ្លើងធ្យូងមធ្យម ឧស្សាហ៍ប្រែសងខាងរហូតដល់សាច់ជ្រូកឆ្អិនឡើងពណ៌ក្រហមក្រម៉ៅឈ្ងុយឈ្ងប់។",
        "instructionEn": "Grill over medium glowing charcoal embers, turning regularly until caramelized, smoky, and cooked through."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ហាន់សាច់ជ្រូកអាំងជាចំណិតល្មម រៀបដាក់ចាន ទទួលទានជាមួយជ្រក់បន្លែ ទឹកជ្រលក់ និងបាយសក្តៅៗ។",
        "instructionEn": "Slice the grilled pork into bite-sized pieces and serve hot with pickled vegetables, dipping sauce, and steamed rice."
      }
    ]
  },
  "food-62": {
    "nameKh": "ខ្យងស្រែអាំងអំបិលម្ទេស",
    "nameEn": "Charcoal Grilled River Snails with Chili Salt",
    "cat": "grilled",
    "catKh": "ម្ហូបអាំង / អាហារសម្រន់",
    "catEn": "Grilled & Street Food",
    "descKh": "ខ្យងស្រែអាំងអំបិលម្ទេស ជាអាហារសម្រន់តាមផ្លូវដ៏ពេញនិយមបំផុត ខ្យងស្រែធំៗដុតលើធ្យូងភ្លើង ចាក់អំបិលម្ទេសស្លឹកក្រូចសើចចូលមាត់ខ្យង សាច់ខ្យងស្រួយផ្អែមហឹរឈ្ងុយ។",
    "descEn": "Iconic Cambodian street food featuring large freshwater snails grilled over charcoal with a spicy kaffir lime leaf and chili salt mixture poured directly into the shell.",
    "prepTime": "៣០ នាទី",
    "cookTime": "១៥ នាទី",
    "servings": "២-៣ នាក់",
    "calories": 160,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "ខ្យងស្រែធំៗត្រាំទឹកស្អាត",
        "nameEn": "Fresh large paddy snails, soaked and cleaned",
        "amount": "១ គីឡូក្រាម"
      },
      {
        "nameKh": "អំបិលគ្រួស និងម្ទេសក្រហមបុក",
        "nameEn": "Coarse salt and crushed red chilies",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ខ្ទឹមស និងស្លឹកក្រូចសើចហាន់ល្អិត",
        "nameEn": "Garlic and finely minced kaffir lime leaves",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ទឹកត្រីកោះកុង ឬក្រូចឆ្មា",
        "nameEn": "Koh Kong dipping sauce or fresh lime",
        "amount": "សម្រាប់ជ្រលក់"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ត្រាំខ្យងស្រែក្នុងទឹកលាយម្ទេសបុក ២ ម៉ោងឱ្យខ្ជាក់ភក់ លាងឱ្យស្អាត កាត់គូទបន្តិច។",
        "instructionEn": "Soak snails in chili water for 2 hours to purge silt. Wash and snip off the tips."
      },
      {
        "stepNumber": 2,
        "instructionKh": "បុកអំបិល ម្ទេស ខ្ទឹមស និងស្លឹកក្រូចសើចឱ្យម៉ត់ចូលគ្នា។",
        "instructionEn": "Pound salt, chilies, garlic, and kaffir lime leaves into a fragrant coarse paste."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដាក់ខ្យងលើចង្ក្រានធ្យូង ចាក់អំបិលម្ទេសចូលមាត់ខ្យង អាំងរហូតដល់ពុះឈ្ងុយ។",
        "instructionEn": "Place snails on grill grate, spoon chili salt into shell openings, and roast until bubbling."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ឆ្កៀលសាច់ខ្យងជ្រលក់ទឹកត្រីកោះកុង ឬអំបិលម្រេចក្រូចឆ្មា ទទួលទានក្តៅៗ។",
        "instructionEn": "Pick tender snail meat with skewers, dip in lime sauce, and enjoy hot."
      }
    ]
  },
  "food-63": {
    "nameKh": "ត្រីអណ្តែងអាំងទឹកត្រីស្វាយ",
    "nameEn": "Grilled Catfish with Green Mango Fish Sauce",
    "cat": "grilled",
    "catKh": "ម្ហូបអាំង / ត្រីអាំង",
    "catEn": "Grilled & BBQ",
    "descKh": "ត្រីអណ្តែងស្រែអាំង ស្បែកស្រួយពណ៌មាសសាច់ទន់ផ្អែម ទទួលទានជាមួយទឹកត្រីស្វាយខ្ចីសាប់ខាប់ជូរអែមហឹរឈ្ងុយខ្ទឹមក្រហម និងជីរនាងវង ជាម្ហូបស្រែដ៏ឈ្ងុយឆ្ងាញ់។",
    "descEn": "Charcoal-grilled wild freshwater catfish with crisp golden skin and tender sweet flesh, paired with a tangy shredded green mango fish sauce dip and fresh herbs.",
    "prepTime": "១៥ នាទី",
    "cookTime": "២៥ នាទី",
    "servings": "២-៤ នាក់",
    "calories": 270,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "ត្រីអណ្តែងស្រែស្រស់",
        "nameEn": "Fresh wild freshwater catfish",
        "amount": "២ ក្បាល"
      },
      {
        "nameKh": "ស្វាយខ្ចីសាប់ជាសរសៃល្អិត",
        "nameEn": "Crisp sour green mango, finely shredded",
        "amount": "១ ផ្លែ"
      },
      {
        "nameKh": "ទឹកត្រីល្អ និងស្ករត្នោត",
        "nameEn": "Premium fish sauce and palm sugar",
        "amount": "៣ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ខ្ទឹមក្រហម ខ្ទឹមស និងម្ទេសទុំហាន់",
        "nameEn": "Sliced shallots, garlic, and red bird-eye chilies",
        "amount": "១ ស្លាបព្រាបាយកន្លះ"
      },
      {
        "nameKh": "ជីរនាងវង និងបន្លែអន្លក់ស្រស់",
        "nameEn": "Lemon basil and fresh raw vegetables",
        "amount": "១ ចាន"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "លាងសម្អាតត្រីអណ្តែងជាមួយអំបិលគ្រួសឱ្យអស់រំអិល ឆូតខ្នងសងខាង រួចលាបអំបិលបន្តិចលើស្បែកត្រី។",
        "instructionEn": "Rub catfish with coarse salt to remove slime, rinse clean, score both sides, and season lightly with salt."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាក់អាំងលើរងើកភ្លើងធ្យូងមធ្យមរហូតដល់ស្បែកត្រីស្រួយពណ៌លឿងទុំ និងសាច់ខាងក្នុងឆ្អិនទន់ឈ្ងុយ។",
        "instructionEn": "Grill slowly over glowing charcoal embers until the skin is golden-crisp and the flesh inside is tender and flaky."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ធ្វើទឹកត្រីស្វាយ៖ កូរស្ករត្នោត និងទឹកត្រីឱ្យរលាយខាប់ល្មម រួចដាក់ខ្ទឹមក្រហម ខ្ទឹមស ម្ទេស និងស្វាយខ្ចីសាប់ចូលលាយឱ្យសព្វ។",
        "instructionEn": "Prepare green mango sauce: whisk palm sugar and fish sauce until syrupy, then fold in shallots, garlic, chilies, and shredded green mango."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ទទួលទានត្រីអណ្តែងអាំងក្តៅៗជ្រលក់ទឹកត្រីស្វាយខ្ចី អមដោយជីរនាងវង បន្លែស្រស់ និងបាយក្ដៅៗ។",
        "instructionEn": "Enjoy the hot grilled catfish dipped in tangy green mango fish sauce alongside fresh basil, crudités, and steamed rice."
      }
    ]
  },
  "food-64": {
    "nameKh": "សាច់គោចង្កាក់អាំងគ្រឿងបាត់ដំបង",
    "nameEn": "Battambang Beef Skewers with Kroeung",
    "cat": "grilled",
    "catKh": "ម្ហូបអាំង / អាហារសម្រន់",
    "catEn": "Grilled & Street Food",
    "descKh": "សាច់គោចង្កាក់អាំងគ្រឿងបាត់ដំបង ប្រឡាក់ជាមួយគ្រឿងបុកស្លឹកគ្រៃរមៀត ស្ករត្នោត និងខ្ទិះដូង អាំងលើធ្យូងភ្លើងឈ្ងុយឈ្ងប់ ទទួលទានជាមួយជ្រក់ល្ហុងស្រួយ និងនំប៉័ង។",
    "descEn": "Famous Battambang-style beef skewers marinated in vibrant lemongrass-turmeric kroeung and palm sugar, char-grilled and served with pickled papaya.",
    "prepTime": "៣០ នាទី",
    "cookTime": "១៥ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 320,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "សាច់គោផុយហាន់បន្ទះស្ដើង",
        "nameEn": "Thinly sliced tender beef flank/sirloin",
        "amount": "៥០០ ក្រាម"
      },
      {
        "nameKh": "គ្រឿងបុកស្លឹកគ្រៃរមៀតបាត់ដំបង",
        "nameEn": "Battambang lemongrass kroeung",
        "amount": "៣ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ខ្លាញ់គោ ឬខ្លាញ់ជ្រូកបន្តិច",
        "nameEn": "Beef or pork fat cubes",
        "amount": "៥០ ក្រាម"
      },
      {
        "nameKh": "ស្ករត្នោត ទឹកត្រី ទឹកស៊ីអ៊ីវ",
        "nameEn": "Palm sugar, fish sauce, soy sauce",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ជ្រក់ល្ហុងបាត់ដំបង",
        "nameEn": "Battambang pickled green papaya",
        "amount": "១ ចាន"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ប្រឡាក់សាច់គោជាមួយគ្រឿងបុក ស្ករត្នោត ទឹកត្រី ទឹកស៊ីអ៊ីវ និងប្រេងឆា ទុក ២ ម៉ោង។",
        "instructionEn": "Marinate sliced beef in kroeung paste, palm sugar, and seasonings for 2 hours."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដោតសាច់គោលើចង្កាក់ឬស្សី ដោយដាក់ដុំខ្លាញ់គោមួយចំកណ្តាលដើម្បីរក្សាភាពទន់។",
        "instructionEn": "Thread beef onto bamboo skewers with a cube of fat in the center for juiciness."
      },
      {
        "stepNumber": 3,
        "instructionKh": "អាំងលើរងើកភ្លើងធ្យូងឱ្យឈ្ងុយឈ្ងប់ កុំឱ្យឆ្អិនស្ងួតខ្លាំងពេក។",
        "instructionEn": "Grill over hot coals, turning frequently until aromatic and lightly charred."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ទទួលទានជាមួយជ្រក់ល្ហុងបាត់ដំបងស្រួយៗ និងនំប៉័ងលាបប៊័រ។",
        "instructionEn": "Serve skewers with crispy pickled papaya and buttered baguette."
      }
    ]
  },
  "food-65": {
    "nameKh": "ត្រីផ្ទក់អាំងអំបិលម្ទេសបាយក្ដៅ",
    "nameEn": "Grilled Giant Snakehead with Hot Rice",
    "cat": "grilled",
    "catKh": "ម្ហូបអាំង / ត្រីអាំង",
    "catEn": "Grilled & BBQ",
    "descKh": "ត្រីផ្ទក់ស្រែអាំង រុំស្លឹកចេកអាំងលើធ្យូងភ្លើងឱ្យសាច់ត្រីឆ្អិនទន់រក្សាជាតិផ្អែមធម្មជាតិ ស្បែកស្រួយស្រោក ទទួលទានជាមួយទឹកត្រីអំពិលទុំ និងបន្លែអន្លក់ស្រស់។",
    "descEn": "Large wild giant snakehead fish wrapped in banana leaves and slow-grilled over charcoal embers, served with tamarind dip and fragrant rice.",
    "prepTime": "២០ នាទី",
    "cookTime": "៣០ នាទី",
    "servings": "៣-៥ នាក់",
    "calories": 290,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "ត្រីផ្ទក់ស្រែស្រស់ទម្ងន់ ១ គីឡូ",
        "nameEn": "Whole giant snakehead fish (1 kg)",
        "amount": "១ ក្បាល"
      },
      {
        "nameKh": "អំបិលគ្រួសកំពត",
        "nameEn": "Kampot sea salt",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ស្លឹកចេកសម្រាប់រុំ",
        "nameEn": "Banana leaves for wrapping",
        "amount": "៣-៤ ធាង"
      },
      {
        "nameKh": "ទឹកត្រីអំពិលទុំ ឬទឹកត្រីស្វាយ",
        "nameEn": "Tamarind or green mango dip",
        "amount": "១ ចានតូច"
      },
      {
        "nameKh": "បន្លែអន្លក់ស្រស់គ្រប់មុខ",
        "nameEn": "Assorted fresh vegetables and crudités",
        "amount": "១ កន្ត្រក"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "វះពោះត្រីផ្ទក់លាងឱ្យស្អាត ឆូតខ្នង រោយអំបិលគ្រួសលើស្បែកត្រីឱ្យសព្វ។",
        "instructionEn": "Clean snakehead fish, score sides, and rub skin evenly with coarse sea salt."
      },
      {
        "stepNumber": 2,
        "instructionKh": "រុំស្លឹកចេកឱ្យជិត រួចអាំងលើធ្យូងភ្លើងតិចៗ ២០ នាទីឱ្យសាច់ឆ្អិនទន់ផ្អែម។",
        "instructionEn": "Wrap securely in banana leaves and slow-grill over coals for 20 minutes."
      },
      {
        "stepNumber": 3,
        "instructionKh": "បកស្លឹកចេកចេញ អាំងឱ្យស្បែកក្រៀមស្រួយបន្តិច។",
        "instructionEn": "Unwrap leaves and grill directly for 5 minutes to crisp up the skin."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ទទួលទានក្តៅៗជាមួយបន្លែអន្លក់ស្រស់ ទឹកត្រីអំពិលទុំ និងបាយក្ដៅៗ។",
        "instructionEn": "Serve hot with fresh herbs, tamarind dipping sauce, and steamed jasmine rice."
      }
    ]
  },
  "food-66": {
    "nameKh": "ឆាត្រកួនប្រហុកខ្ទឹមស",
    "nameEn": "Wok Morning Glory with Prahok Essence",
    "cat": "stirfry",
    "catKh": "ម្ហូបឆា / បន្លែឆា",
    "catEn": "Stir-Fried",
    "descKh": "ឆាត្រកួនប្រហុកខ្ទឹមស ប្រើត្រកួនស្រែបេះទងស្រួយ ឆាលើភ្លើងខ្លាំងជាមួយខ្ទឹមសដំ និងប្រហុកសាច់បន្តិច ត្រកួននៅរក្សាពណ៌បៃតងស្រស់ និងមានក្លិនឈ្ងុយប្រហើរ។",
    "descEn": "Crunchy morning glory greens flash-stir-fried in a scorching wok with crushed garlic, bird’s eye chilies, and a hint of savory prahok.",
    "prepTime": "១០ នាទី",
    "cookTime": "៥ នាទី",
    "servings": "២-៣ នាក់",
    "calories": 140,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "ត្រកួនស្រែបេះទងខ្លីៗ",
        "nameEn": "Fresh water spinach / morning glory",
        "amount": "៣០០ ក្រាម"
      },
      {
        "nameKh": "ខ្ទឹមសដំឱ្យបែក",
        "nameEn": "Crushed fresh garlic cloves",
        "amount": "៥-៦ កំពឹស"
      },
      {
        "nameKh": "ប្រហុកសាច់ចិញ្ច្រាំបន្តិច",
        "nameEn": "Minced prahok paste",
        "amount": "កន្លះស្លាបព្រាកាហ្វេ"
      },
      {
        "nameKh": "ម្ទេសក្រហមហាន់",
        "nameEn": "Sliced red chili",
        "amount": "២ គ្រាប់"
      },
      {
        "nameKh": "ស្ករត្នោត ទឹកត្រី ប្រេងឆា",
        "nameEn": "Palm sugar, fish sauce, cooking oil",
        "amount": "១ ស្លាបព្រាបាយ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "លាងត្រកួនឱ្យស្អាត កាច់ជាកំណាត់ខ្លីៗ ស្រង់ឱ្យស្ងួតទឹក។",
        "instructionEn": "Wash morning glory, snap into 3-inch lengths, and drain well."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាក់ប្រេងក្នុងខ្ទះឱ្យក្តៅខ្លាំង បំពងខ្ទឹមស និងប្រហុកឱ្យឈ្ងុយឈ្ងប់។",
        "instructionEn": "Heat oil in wok until smoking hot, sauté garlic and prahok until fragrant."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដាក់ត្រកួនចូលឆាលើភ្លើងខ្លាំងយ៉ាងលឿន ថែមស្ករត្នោត ទឹកត្រី និងម្ទេស។",
        "instructionEn": "Toss in morning glory, flash-fry over high heat, seasoning with sugar and fish sauce."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ឆាច្របល់ ២ នាទីឱ្យត្រកួននៅរក្សាពណ៌បៃតងស្រស់ រួចដួសដាក់ចានភ្លាមៗ។",
        "instructionEn": "Stir-fry for 1-2 minutes until vibrant green, then plate immediately."
      }
    ]
  },
  "food-67": {
    "nameKh": "ឆាផ្កាខាត់ណាបង្គាស្រស់",
    "nameEn": "Stir-Fried Broccoli with Fresh Prawns",
    "cat": "stirfry",
    "catKh": "ម្ហូបឆា / គ្រឿងសមុទ្រ",
    "catEn": "Stir-Fried",
    "descKh": "ឆាផ្កាខាត់ណាបង្គាស្រស់ ប្រើបង្គាសមុទ្រស្រស់សាច់ផ្អែម ឆាជាមួយផ្កាខាត់ណាស្រួយ ប្រេងខ្យង ខ្ទឹមស និងម្រេចកំពត ពណ៌ស្រស់ស្អាតនិងមានជីវជាតិខ្ពស់។",
    "descEn": "Fresh succulent sea prawns stir-fried with crisp green broccoli florets in a savory garlic oyster sauce glaze.",
    "prepTime": "១៥ នាទី",
    "cookTime": "១០ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 210,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "បង្គាសមុទ្រស្រស់បកសំបក",
        "nameEn": "Fresh prawns, peeled and deveined",
        "amount": "២៥០ ក្រាម"
      },
      {
        "nameKh": "ផ្កាខាត់ណាហាន់ចំណិតល្មម",
        "nameEn": "Fresh broccoli florets",
        "amount": "៣០០ ក្រាម"
      },
      {
        "nameKh": "ខ្ទឹមសចិញ្ច្រាំ",
        "nameEn": "Minced garlic",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ប្រេងខ្យង និងទឹកស៊ីអ៊ីវ",
        "nameEn": "Oyster sauce and soy sauce",
        "amount": "១ ស្លាបព្រាបាយកន្លះ"
      },
      {
        "nameKh": "ស្ករត្នោត និងម្រេចកំពត",
        "nameEn": "Palm sugar and Kampot pepper",
        "amount": "កន្លះស្លាបព្រាកាហ្វេ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ស្រឡោះផ្កាខាត់ណាក្នុងទឹកពុះ ១ នាទី រួចស្រង់ត្រាំទឹកត្រជាក់ដើម្បីរក្សាភាពស្រួយ។",
        "instructionEn": "Blanch broccoli in boiling water for 1 minute, plunge into cold water to retain crunch."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ឆាខ្ទឹមសក្នុងប្រេងក្តៅឱ្យឈ្ងុយ ដាក់បង្គាចូលឆាឱ្យឡើងពណ៌ក្រហម។",
        "instructionEn": "Sauté garlic in hot oil until fragrant, add prawns and sear until pink."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដាក់ខាត់ណាចូល ថែមប្រេងខ្យង ទឹកស៊ីអ៊ីវ និងស្ករត្នោត ឆាលើភ្លើងខ្លាំង។",
        "instructionEn": "Add broccoli, oyster sauce, soy sauce, and palm sugar, tossing on high heat."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ដួសដាក់ចាន រោយម្រេចកំពតពីលើ ទទួលទានក្តៅៗជាមួយបាយ។",
        "instructionEn": "Plate and sprinkle with Kampot black pepper, serve hot with rice."
      }
    ]
  },
  "food-68": {
    "nameKh": "ឆាក្តៅមឹក ម្រះព្រៅ",
    "nameEn": "Stir-Fried Spicy Squid with Holy Basil",
    "cat": "stirfry",
    "catKh": "ម្ហូបឆា / ឆាក្តៅគ្រឿងសមុទ្រ",
    "catEn": "Stir-Fried / Seafood",
    "descKh": "ឆាក្តៅមឹកម្រះព្រៅ ប្រើមឹកបំពង់ស្រស់សាច់ស្រួយផ្អែម ឆាលើភ្លើងខ្លាំងជាមួយគ្រឿងស្លឹកគ្រៃ ខ្ទឹមស ម្ទេស និងស្លឹកម្រះព្រៅស្រស់ បែកក្លិនឈ្ងុយប្រហើរ រសជាតិហឹរដិតដល់ឆ្ងាញ់ពិសា។",
    "descEn": "Fresh coastal squid rings flash-fried over high wok heat with aromatic lemongrass-chili-garlic paste, savory oyster sauce, and fragrant fresh holy basil leaves.",
    "prepTime": "១៥ នាទី",
    "cookTime": "៨ នាទី",
    "servings": "២-៣ នាក់",
    "calories": 220,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "មឹកបំពង់ស្រស់ឆូតក្រឡាកាត់កង់ៗ",
        "nameEn": "Fresh squid, scored and cut into bite-sized pieces",
        "amount": "៤០០ ក្រាម"
      },
      {
        "nameKh": "ស្លឹកម្រះព្រៅស្រស់បេះស្អាត",
        "nameEn": "Fresh holy basil leaves",
        "amount": "១ ក្តាប់ធំ"
      },
      {
        "nameKh": "គល់ស្លឹកគ្រៃហាន់ម៉ត់ ខ្ទឹមស និងម្ទេសបុក",
        "nameEn": "Finely minced lemongrass, garlic, and crushed red chilies",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ម្ទេសដៃនាង ខ្ទឹមបារាំងហាន់ និងស្លឹកក្រូចសើច",
        "nameEn": "Sliced long red chili, onion, and kaffir lime leaves",
        "amount": "១ ចានតូច"
      },
      {
        "nameKh": "ប្រេងខ្យង ទឹកត្រី និងស្ករត្នោតបន្តិច",
        "nameEn": "Oyster sauce, fish sauce, and pinch of palm sugar",
        "amount": "២ ស្លាបព្រាបាយ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "លាងសម្អាតមឹកឱ្យស្អាត ឆូតក្រឡា ឬកាត់ជាកង់ៗ រួចស្រុះទឹកក្តៅ ១០ វិនាទីស្រង់ទុកឱ្យស្ងួតដើម្បីពេលឆាមិនចេញទឹកច្រើន។",
        "instructionEn": "Clean squid, score or cut into rings, and briefly blanch for 10 seconds then drain dry so it stays crisp in the wok."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាក់ប្រេងក្នុងខ្ទះឱ្យក្តៅខ្លាំង ឆាខ្ទឹមស ម្ទេសបុក គល់ស្លឹកគ្រៃ និងស្លឹកក្រូចសើចឱ្យឡើងក្លិនឈ្ងុយឈួល។",
        "instructionEn": "Heat oil in a hot wok and stir-fry crushed garlic, chilies, lemongrass, and kaffir lime leaves until sizzling and aromatic."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដាក់មឹក និងខ្ទឹមបារាំងចូលឆាលើភ្លើងខ្លាំងយ៉ាងលឿន ថែមប្រេងខ្យង ទឹកត្រី និងស្ករត្នោតបន្តិច។",
        "instructionEn": "Toss in squid and sliced onion over high heat, seasoning quickly with oyster sauce, fish sauce, and palm sugar."
      },
      {
        "stepNumber": 4,
        "instructionKh": "បង់ស្លឹកម្រះព្រៅស្រស់ចូលឆាច្របល់ ២០-៣០ វិនាទីរួចបិទភ្លើងភ្លាមៗ ដួសទទួលទានក្តៅៗជាមួយបាយ។",
        "instructionEn": "Fold in fresh holy basil leaves for 20-30 seconds until fragrant, remove immediately so squid stays tender, and serve hot."
      }
    ]
  },
  "food-69": {
    "nameKh": "ឆាត្រប់វែងសាច់ជ្រូកចិញ្ច្រាំ",
    "nameEn": "Eggplant Stir-Fried with Minced Pork",
    "cat": "stirfry",
    "catKh": "ម្ហូបឆា / ម្ហូបប្រពៃណី",
    "catEn": "Stir-Fried",
    "descKh": "ឆាត្រប់វែងសាច់ជ្រូកចិញ្ច្រាំ ត្រប់វែងពណ៌ស្វាយឆាជាមួយសាច់ជ្រូកចិញ្ច្រាំ សៀងផ្អែម ខ្ទឹមស និងជីរនាងវង ត្រប់ទន់រលោងឈ្ងុយរសជាតិដិតដល់។",
    "descEn": "Tender Asian purple eggplants stir-fried with seasoned minced pork, fermented sweet soybean paste, and fragrant holy basil.",
    "prepTime": "១៥ នាទី",
    "cookTime": "១៥ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 260,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "ត្រប់វែងពណ៌ស្វាយកាត់ចំណិត",
        "nameEn": "Long Asian purple eggplants cut into batons",
        "amount": "៣ ផ្លែ"
      },
      {
        "nameKh": "សាច់ជ្រូកចិញ្ច្រាំ",
        "nameEn": "Minced pork",
        "amount": "២០០ ក្រាម"
      },
      {
        "nameKh": "សៀងផ្អែម ឬប្រេងខ្យង",
        "nameEn": "Sweet fermented soybean paste or oyster sauce",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ខ្ទឹមសចិញ្ច្រាំ និងម្ទេស",
        "nameEn": "Minced garlic and chili",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ស្លឹកជីរនាងវងស្រស់",
        "nameEn": "Fresh holy basil leaves",
        "amount": "១ ក្តាប់"
      },
      {
        "nameKh": "ទឹកត្រី និងស្ករត្នោត",
        "nameEn": "Fish sauce and palm sugar",
        "amount": "១ ស្លាបព្រាបាយ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "បំពងត្រប់ក្នុងប្រេងក្តៅមួយភ្លែតឱ្យទន់ស្រួយ រួចស្រង់ទុកឱ្យស្រក់ប្រេង។",
        "instructionEn": "Flash-fry eggplant batons in hot oil for 2 minutes until tender, then drain."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ឆាខ្ទឹមស និងសាច់ជ្រូកចិញ្ច្រាំក្នុងខ្ទះឱ្យឆ្អិនឈ្ងុយ។",
        "instructionEn": "Sauté minced garlic and pork in a wok until browned and fragrant."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដាក់ត្រប់បំពងចូល ថែមសៀង ប្រេងខ្យង ទឹកត្រី និងស្ករត្នោត។",
        "instructionEn": "Add eggplant, sweet soybean paste, fish sauce, and palm sugar, tossing gently."
      },
      {
        "stepNumber": 4,
        "instructionKh": "បង់ជីរនាងវងចូលឆាច្របល់លើកចុះ ទទួលទានជាមួយបាយក្ដៅៗ។",
        "instructionEn": "Fold in holy basil leaves, remove from heat, and serve with hot rice."
      }
    ]
  },
  "food-70": {
    "nameKh": "ឆាព្រលិត",
    "nameEn": "Water Lily Stems Stir-Fried",
    "cat": "stirfry",
    "catKh": "ម្ហូបឆា / ម្ហូបស្រុកស្រែ",
    "catEn": "Stir-Fried",
    "descKh": "ឆាព្រលិត ជាម្ហូបស្រុកស្រែដ៏សាមញ្ញតែមានរសជាតិឆ្ងាញ់ពិសា ដើមព្រលិតស្រស់បកសំបកស្រួយផ្អែម ឆាលើភ្លើងខ្លាំងឈ្ងុយខ្ទឹមស ម្ទេស និងប្រហុកសាច់បន្តិច។",
    "descEn": "Simple yet delicious Cambodian countryside stir-fry of crisp, sweet peeled water lily stems flash-fried over high heat with garlic, chilies, and a savory hint of prahok.",
    "prepTime": "១០ នាទី",
    "cookTime": "៦ នាទី",
    "servings": "២-៣ នាក់",
    "calories": 140,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "ដើមព្រលិតស្រស់បកសំបកកាត់កំណាត់",
        "nameEn": "Fresh peeled water lily stems cut into segments",
        "amount": "៤០០ ក្រាម"
      },
      {
        "nameKh": "ខ្ទឹមសដំ និងម្ទេសក្រហមហាន់",
        "nameEn": "Crushed garlic cloves and sliced red chilies",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ប្រហុកសាច់ចិញ្ច្រាំបន្តិច",
        "nameEn": "Finely minced prahok paste",
        "amount": "កន្លះស្លាបព្រាកាហ្វេ"
      },
      {
        "nameKh": "ទឹកត្រី ប្រេងខ្យង និងស្ករត្នោតបន្តិច",
        "nameEn": "Fish sauce, oyster sauce, and pinch of palm sugar",
        "amount": "១ ស្លាបព្រាបាយកន្លះ"
      },
      {
        "nameKh": "ស្លឹកខ្ទឹម ឬជីរនាងវង និងប្រេងឆា",
        "nameEn": "Chopped scallions or basil and cooking oil",
        "amount": "១ ស្លាបព្រាបាយ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "បកសំបកក្រៅនៃដើមព្រលិតចេញឱ្យស្អាត កាច់ជាកំណាត់ប្រវែងមួយថ្នាំងដៃ លាងទឹករួចស្រង់ឱ្យស្ងួត។",
        "instructionEn": "Peel the outer fibrous skin off fresh water lily stems, snap into bite-sized segments, rinse, and drain dry."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាក់ប្រេងក្នុងខ្ទះឱ្យក្តៅខ្លាំង បំពងខ្ទឹមស ម្ទេស និងប្រហុកសាច់ចិញ្ច្រាំបន្តិចឱ្យឡើងក្លិនឈ្ងុយ។",
        "instructionEn": "Heat oil in a hot wok and sauté crushed garlic, chilies, and minced prahok until fragrant."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដាក់ដើមព្រលិតចូលឆាលើភ្លើងខ្លាំងយ៉ាងរហ័ស ថែមប្រេងខ្យង ទឹកត្រី និងស្ករត្នោតបន្តិច។",
        "instructionEn": "Toss in the water lily stems over high heat and season quickly with oyster sauce, fish sauce, and palm sugar."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ឆាច្របល់ត្រឹម ១ នាទីកុំឱ្យព្រលិតចេញទឹករលួយ បង់ស្លឹកខ្ទឹមរួចដួសដាក់ចានភ្លាមៗ ទទួលទានជាមួយបាយក្តៅៗ។",
        "instructionEn": "Flash-fry for just 1 minute to keep the stems juicy and crunchy, toss with scallions, and serve immediately."
      }
    ]
  },
  "food-71": {
    "nameKh": "ឆាក្តៅកង្កែបស្រែស្លឹកម្រះព្រៅ",
    "nameEn": "Spicy Wok-Fried Farm Frog with Holy Basil",
    "cat": "stirfry",
    "catKh": "ម្ហូបឆា / ឆាក្តៅ",
    "catEn": "Stir-Fried",
    "descKh": "ឆាក្តៅកង្កែបស្រែស្លឹកម្រះព្រៅ សាច់កង្កែបស្រែស្រស់ឆាជាមួយគ្រឿងបុកស្លឹកគ្រៃរមៀត ម្ទេសដៃនាង និងស្លឹកម្រះព្រៅហឹរឈ្ងុយ រសជាតិហឹរដិតដល់បែបខ្មែរដើម។",
    "descEn": "Fiery wok-fried farm frog with traditional lemongrass-turmeric kroeung paste, hot chilies, green peppercorns, and aromatic holy basil.",
    "prepTime": "២០ នាទី",
    "cookTime": "១៥ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 240,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "កង្កែបស្រែកាប់ដុំល្មម",
        "nameEn": "Cleaned farm frog cut into pieces",
        "amount": "៤០០ ក្រាម"
      },
      {
        "nameKh": "គ្រឿងបុកស្លឹកគ្រៃរមៀត",
        "nameEn": "Lemongrass kroeung paste",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ស្លឹកម្រះព្រៅស្រស់",
        "nameEn": "Fresh holy basil leaves",
        "amount": "១ ក្តាប់"
      },
      {
        "nameKh": "ម្ទេសដៃនាង និងគ្រាប់ម្រេចខ្ចី",
        "nameEn": "Red chilies and green Kampot peppercorns",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ទឹកត្រី ស្ករត្នោត ប្រេងខ្យង",
        "nameEn": "Fish sauce, palm sugar, oyster sauce",
        "amount": "១ ស្លាបព្រាបាយកន្លះ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ប្រឡាក់សាច់កង្កែបជាមួយគ្រឿងបុកបន្តិច និងទឹកត្រី ១៥ នាទី។",
        "instructionEn": "Marinate frog pieces with a spoonful of kroeung and fish sauce for 15 minutes."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ឆាគ្រឿងបុកក្នុងប្រេងក្តៅឱ្យឈ្ងុយ ដាក់កង្កែបចូលឆាឱ្យសាច់ឆ្អិនណែនល្អ។",
        "instructionEn": "Fry remaining kroeung in hot oil until fragrant, add frog pieces and sear well."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ថែមទឹកត្រី ប្រេងខ្យង ស្ករត្នោត ម្ទេស និងគ្រាប់ម្រេចខ្ចី ឆាឱ្យចូលជាតិ។",
        "instructionEn": "Season with fish sauce, oyster sauce, sugar, chilies, and green peppercorns."
      },
      {
        "stepNumber": 4,
        "instructionKh": "បង់ស្លឹកម្រះព្រៅចូលច្របល់បិទភ្លើងភ្លាមៗ ដួសទទួលទានជាមួយបាយក្ដៅៗ។",
        "instructionEn": "Toss in holy basil, turn off heat, and serve piping hot with steamed rice."
      }
    ]
  },
  "food-72": {
    "nameKh": "ឆាសាច់គោម្រះព្រៅម្ទេសហឹរ",
    "nameEn": "Fiery Holy Basil Beef Stir-Fry",
    "cat": "stirfry",
    "catKh": "ម្ហូបឆា / ឆាក្តៅ",
    "catEn": "Stir-Fried",
    "descKh": "ឆាសាច់គោម្រះព្រៅម្ទេសហឹរ សាច់គោផុយហាន់ស្ដើង ឆាលើភ្លើងខ្លាំងជាមួយខ្ទឹមស ម្ទេសបុក និងស្លឹកម្រះព្រៅស្រស់ ក្លិនឈ្ងុយឈួល រសជាតិហឹរដិតដល់ត្រូវចិត្តអ្នកចូលចិត្តហឹរ។",
    "descEn": "Thin slices of tender beef flash-stir-fried with crushed garlic, bird’s eye chilies, fish sauce, and a generous heap of fresh holy basil.",
    "prepTime": "១៥ នាទី",
    "cookTime": "៨ នាទី",
    "servings": "២-៣ នាក់",
    "calories": 280,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "សាច់គោផុយហាន់ស្ដើង",
        "nameEn": "Tender beef sliced thin",
        "amount": "៣៥០ ក្រាម"
      },
      {
        "nameKh": "ស្លឹកម្រះព្រៅស្រស់",
        "nameEn": "Fresh holy basil leaves",
        "amount": "១ ក្តាប់ធំ"
      },
      {
        "nameKh": "ខ្ទឹមស និងម្ទេសបកបុកម៉ត់",
        "nameEn": "Pounded garlic and bird’s eye chilies",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ប្រេងខ្យង ទឹកត្រី ទឹកស៊ីអ៊ីវ",
        "nameEn": "Oyster sauce, fish sauce, dark soy sauce",
        "amount": "១ ស្លាបព្រាបាយកន្លះ"
      },
      {
        "nameKh": "ស្ករត្នោត",
        "nameEn": "Palm sugar",
        "amount": "កន្លះស្លាបព្រាកាហ្វេ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "បុកខ្ទឹមស និងម្ទេសជាមួយគ្នាឱ្យម៉ត់ល្មម។",
        "instructionEn": "Pound garlic and fresh chilies in a mortar into a coarse paste."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាក់ប្រេងក្នុងខ្ទះឱ្យក្តៅ បំពងខ្ទឹមម្ទេសឱ្យឈ្ងុយឈួល។",
        "instructionEn": "Heat oil in wok, fry garlic-chili paste until aromatic and sizzling."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដាក់សាច់គោចូលឆាលើភ្លើងខ្លាំងយ៉ាងលឿន ថែមប្រេងខ្យង ទឹកត្រី ទឹកស៊ីអ៊ីវ និងស្ករត្នោត។",
        "instructionEn": "Add sliced beef, tossing rapidly over intense heat with oyster sauce, fish sauce, and sugar."
      },
      {
        "stepNumber": 4,
        "instructionKh": "បង់ស្លឹកម្រះព្រៅចូលច្របល់ ៣០ វិនាទីរួចដួសដាក់ចាន ទទួលទានជាមួយបាយក្ដៅៗ។",
        "instructionEn": "Throw in holy basil, stir for 30 seconds until wilted, plate and serve hot."
      }
    ]
  },
  "food-73": {
    "nameKh": "ឆាស្ពៃក្តោបពងទា",
    "nameEn": "Cabbage Stir-Fried with Eggs",
    "cat": "stirfry",
    "catKh": "ម្ហូបឆា / បន្លែឆា",
    "catEn": "Stir-Fried",
    "descKh": "ឆាស្ពៃក្តោបពងទា ស្ពៃក្តោបហាន់បន្ទះឆាជាមួយពងទាស្រស់ ខ្ទឹមស និងម្រេចកំពត ស្ពៃស្រួយផ្អែមចូលជាតិជាមួយពងទាឈ្ងុយ ជាម្ហូបសាមញ្ញប្រចាំគ្រួសារខ្មែរ។",
    "descEn": "Homestyle Cambodian comfort dish of shredded crisp green cabbage stir-fried with rich duck eggs, garlic, and freshly cracked Kampot pepper.",
    "prepTime": "១០ នាទី",
    "cookTime": "៨ នាទី",
    "servings": "២-៣ នាក់",
    "calories": 190,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "ស្ពៃក្តោបហាន់ជាបន្ទះស្ដើង",
        "nameEn": "Shredded fresh cabbage",
        "amount": "៣៥០ ក្រាម"
      },
      {
        "nameKh": "ពងទាស្រស់",
        "nameEn": "Fresh duck eggs",
        "amount": "២-៣ គ្រាប់"
      },
      {
        "nameKh": "ខ្ទឹមសចិញ្ច្រាំ",
        "nameEn": "Minced garlic",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ទឹកត្រី និងអំបិល",
        "nameEn": "Fish sauce and sea salt",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ស្ករត្នោត និងម្រេចកំពត",
        "nameEn": "Palm sugar and ground pepper",
        "amount": "កន្លះស្លាបព្រាកាហ្វេ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ឆាខ្ទឹមសក្នុងប្រេងឱ្យឈ្ងុយ គោះពងទាចូលកូរឱ្យបែកដុំៗឆ្អិនមធ្យម។",
        "instructionEn": "Sauté garlic in oil, crack duck eggs into the pan, and scramble into soft curds."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាក់ស្ពៃក្តោបចូលឆាលើភ្លើងខ្លាំងឱ្យទន់ល្មមនៅរក្សាភាពស្រួយ។",
        "instructionEn": "Add shredded cabbage, tossing over high heat until tender-crisp."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ថែមទឹកត្រី អំបិល និងស្ករត្នោតបន្តិច ឆាច្របល់ឱ្យចូលជាតិ។",
        "instructionEn": "Season with fish sauce, salt, and palm sugar, tossing evenly."
      },
      {
        "stepNumber": 4,
        "instructionKh": "រោយម្រេចកំពតម៉ត់ពីលើ ដួសដាក់ចានទទួលទានក្តៅៗជាមួយបាយ។",
        "instructionEn": "Garnish with freshly ground pepper and serve warm with steamed rice."
      }
    ]
  },
  "food-74": {
    "nameKh": "ឆាខ្ញីត្រីរ៉ស់រសជាតិដើម",
    "nameEn": "Snakehead Fish with Ginger & Black Beans",
    "cat": "stirfry",
    "catKh": "ម្ហូបឆា / ត្រីឆា",
    "catEn": "Stir-Fried",
    "descKh": "ឆាខ្ញីត្រីរ៉ស់ ប្រើត្រីរ៉ស់ហាន់កង់បំពងស្រួយ ឆាជាមួយខ្ញីខ្ចីហាន់សរសៃ សៀងផ្អែម ខ្ទឹមស និងស្លឹកខ្ទឹម រសជាតិឈ្ងុយខ្ញីក្តៅឧណ្ហៗជួយកម្តៅរាងកាយ។",
    "descEn": "Crispy fried river snakehead fish steaks wok-tossed with loads of julienned young ginger, fermented sweet soybean paste, and scallions.",
    "prepTime": "២០ នាទី",
    "cookTime": "១៥ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 270,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "ត្រីរ៉ស់ហាន់ជាកង់ៗបំពងស្រួយ",
        "nameEn": "Crispy fried snakehead fish steaks",
        "amount": "៤០០ ក្រាម"
      },
      {
        "nameKh": "ខ្ញីខ្ចីហាន់សរសៃល្អិត",
        "nameEn": "Finely julienned young ginger",
        "amount": "១ ចានតូច"
      },
      {
        "nameKh": "សៀងផ្អែម",
        "nameEn": "Sweet fermented soybean paste",
        "amount": "១ ស្លាបព្រាបាយកន្លះ"
      },
      {
        "nameKh": "ខ្ទឹមស ម្ទេស ស្លឹកខ្ទឹម",
        "nameEn": "Garlic, red chili, scallions",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ទឹកត្រី និងស្ករត្នោត",
        "nameEn": "Fish sauce and palm sugar",
        "amount": "១ ស្លាបព្រាបាយ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "បំពងត្រីរ៉ស់ក្នុងប្រេងឱ្យឡើងពណ៌លឿងស្រួយ រួចស្រង់ទុកឱ្យស្រក់ប្រេង។",
        "instructionEn": "Deep-fry fish steaks in hot oil until golden and crisp, then drain."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ឆាខ្ទឹមស និងខ្ញីសរសៃឱ្យទន់ឈ្ងុយ រួចដាក់សៀងផ្អែមចូលឆារមាស់។",
        "instructionEn": "Sauté garlic and ginger strands until soft and fragrant, then add sweet bean paste."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ថែមទឹកត្រី ស្ករត្នោត និងទឹកបន្តិចឱ្យចេញទឹកខាប់ៗ។",
        "instructionEn": "Add fish sauce, palm sugar, and a splash of water to form a glossy sauce."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ដាក់ត្រីបំពងចូលច្របល់ថ្នមៗ រោយស្លឹកខ្ទឹមលើកចុះទទួលទានជាមួយបាយ។",
        "instructionEn": "Gently toss fried fish into the ginger sauce, garnish with scallions, and serve."
      }
    ]
  },
  "food-75": {
    "nameKh": "ឆាក្តៅសាច់គោស្លឹកម្រះព្រៅ",
    "nameEn": "Spicy Holy Basil Beef Stir-Fry",
    "cat": "stirfry",
    "catKh": "ម្ហូបឆា / ឆាក្តៅ",
    "catEn": "Stir-Fried",
    "descKh": "ឆាក្តៅសាច់គោស្លឹកម្រះព្រៅ សាច់គោជាប់ខ្លាញ់បន្តិចឆាជាមួយគ្រឿងបុកស្លឹកគ្រៃ ម្ទេសប្លោក ខ្ទឹមបារាំង និងស្លឹកម្រះព្រៅ រសជាតិហឹរឈ្ងុយឈួលចូលជាតិឆ្ងាញ់។",
    "descEn": "Savory stir-fried beef slices with traditional lemongrass kroeung, sliced bell peppers, onions, and spicy holy basil.",
    "prepTime": "១៥ នាទី",
    "cookTime": "១០ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 290,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "សាច់គោជាប់ខ្លាញ់បន្តិចហាន់ស្ដើង",
        "nameEn": "Beef slices with slight marbling",
        "amount": "៣៥០ ក្រាម"
      },
      {
        "nameKh": "គ្រឿងបុកខ្មែរ (ស្លឹកគ្រៃ រមៀត)",
        "nameEn": "Khmer lemongrass kroeung",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ស្លឹកម្រះព្រៅស្រស់",
        "nameEn": "Fresh holy basil",
        "amount": "១ ក្តាប់"
      },
      {
        "nameKh": "ម្ទេសប្លោក និងខ្ទឹមបារាំងហាន់",
        "nameEn": "Bell peppers and sliced onions",
        "amount": "១ ចានតូច"
      },
      {
        "nameKh": "ប្រេងខ្យង ទឹកត្រី ស្ករត្នោត",
        "nameEn": "Oyster sauce, fish sauce, palm sugar",
        "amount": "១ ស្លាបព្រាបាយកន្លះ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ឆាគ្រឿងបុកក្នុងប្រេងឱ្យឈ្ងុយ ដាក់សាច់គោចូលឆាភ្លើងខ្លាំងឱ្យសាច់ឆ្អិនសព្វ។",
        "instructionEn": "Sauté kroeung in oil until fragrant, add beef slices and flash-fry on high heat."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាក់ម្ទេសប្លោក និងខ្ទឹមបារាំងចូលឆាច្របល់ឱ្យទន់ស្រួយ។",
        "instructionEn": "Add bell peppers and onions, tossing until crisp-tender."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ថែមប្រេងខ្យង ទឹកត្រី និងស្ករត្នោតឱ្យរសជាតិដិតដល់។",
        "instructionEn": "Season with oyster sauce, fish sauce, and palm sugar."
      },
      {
        "stepNumber": 4,
        "instructionKh": "បង់ស្លឹកម្រះព្រៅចូលលើកចុះ ដួសទទួលទានជាមួយបាយក្ដៅៗ។",
        "instructionEn": "Toss in holy basil, remove from heat, and serve with hot rice."
      }
    ]
  },
  "food-76": {
    "nameKh": "ញាំត្រយូងចេកសាច់មាន់ស្រែ",
    "nameEn": "Banana Blossom Salad with Free-Range Chicken",
    "cat": "salad",
    "catKh": "ញាំ & ភ្លា",
    "catEn": "Salads & Dips",
    "descKh": "ញាំត្រយូងចេកសាច់មាន់ស្រែ ប្រើត្រយូងចេកហាន់ស្ដើងស្រួយ ច្របល់ជាមួយសាច់មាន់ស្រែស្ងោរបេះសរសៃ ស្លឹកជីរគ្រប់មុខ សណ្តែកដីបុក និងទឹកត្រីកោះកុងជូរអែមឆ្ងាញ់ពិសា។",
    "descEn": "Refreshing royal Cambodian salad of crisp shaved banana blossoms, shredded poached free-range chicken, fresh mint, crushed peanuts, and sweet-sour dressing.",
    "prepTime": "២៥ នាទី",
    "cookTime": "១៥ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 220,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "ត្រយូងចេកហាន់ស្ដើងត្រាំទឹកក្រូចឆ្មា",
        "nameEn": "Thinly shaved banana blossom",
        "amount": "១ ផ្កាធំ"
      },
      {
        "nameKh": "សាច់មាន់ស្រែស្ងោរបេះជាសរសៃ",
        "nameEn": "Shredded poached free-range chicken",
        "amount": "២០០ ក្រាម"
      },
      {
        "nameKh": "ស្លឹកជីរគ្រប់មុខ (ជីរអង្កាម ជីររណារ)",
        "nameEn": "Assorted fresh herbs (mint, sawtooth)",
        "amount": "១ ក្តាប់"
      },
      {
        "nameKh": "សណ្តែកដីលីងបុកម៉ត់",
        "nameEn": "Crushed roasted peanuts",
        "amount": "៣ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ទឹកត្រី ក្រូចឆ្មា ស្ករត្នោត ខ្ទឹមស ម្ទេស",
        "nameEn": "Lime fish sauce dressing (garlic, chili, sugar)",
        "amount": "៣ ស្លាបព្រាបាយ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ហាន់ត្រយូងចេកស្ដើងៗត្រាំក្នុងទឹកលាយទឹកក្រូចឆ្មាដើម្បីកុំឱ្យខ្មៅ រួចស្រង់ពូតទឹកឱ្យស្ងួត។",
        "instructionEn": "Shave banana blossom thinly into lime water to prevent browning, then drain thoroughly."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ធ្វើទឹកញាំ៖ លាយទឹកត្រី ទឹកក្រូចឆ្មា ស្ករត្នោត ខ្ទឹមស និងម្ទេសបុកឱ្យមានរសជាតិជូរអែម។",
        "instructionEn": "Whisk fish sauce, lime juice, palm sugar, garlic, and chilies into a balanced dressing."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ច្របល់ត្រយូងចេក សាច់មាន់បេះ ជីរគ្រប់មុខ និងទឹកញាំចូលគ្នាឱ្យសព្វ។",
        "instructionEn": "Toss shredded chicken, banana blossom, herbs, and dressing together."
      },
      {
        "stepNumber": 4,
        "instructionKh": "រៀបដាក់ចាន រោយសណ្តែកដីលីងបុកឈ្ងុយៗពីលើ ដួសទទួលទានភ្លាមៗ។",
        "instructionEn": "Mound on a platter, garnish generously with roasted peanuts, and serve."
      }
    ]
  },
  "food-77": {
    "nameKh": "ញាំត្រសក់ត្រីឆ្អើរ",
    "nameEn": "Cucumber Salad with Smoked Fish",
    "cat": "salad",
    "catKh": "ញាំ & ភ្លា",
    "catEn": "Salads & Dips",
    "descKh": "ញាំត្រសក់ត្រីឆ្អើរ ត្រសក់ខ្ចីចិតចំណិតស្ដើងស្រួយ ច្របាច់ជាមួយសាច់ត្រីឆ្អើរឈ្ងុយ ខ្ទឹមក្រហម ម្ទេស និងទឹកត្រីក្រូចឆ្មាជូរអែម ជាម្ហូបស្រាលស្រស់ស្រាយ។",
    "descEn": "Crunchy cucumber ribbons tossed with flaky smoked river fish, shallots, fresh chilies, and tangy lime fish sauce.",
    "prepTime": "១៥ នាទី",
    "cookTime": "៥ នាទី",
    "servings": "២-៣ នាក់",
    "calories": 160,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "ត្រសក់ខ្ចីចិតចំណិតស្ដើង",
        "nameEn": "Thinly sliced crisp cucumbers",
        "amount": "៣ ផ្លែ"
      },
      {
        "nameKh": "ត្រីឆ្អើរបេះសាច់សុទ្ធ",
        "nameEn": "Flaked smoked fish",
        "amount": "១៥០ ក្រាម"
      },
      {
        "nameKh": "ខ្ទឹមក្រហម និងម្ទេសហាន់",
        "nameEn": "Shallots and fresh red chilies",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ជីរពងទាកូន ឬជីរនាងវង",
        "nameEn": "Vietnamese coriander or holy basil",
        "amount": "១ ក្តាប់"
      },
      {
        "nameKh": "ទឹកត្រី ទឹកក្រូចឆ្មា ស្ករត្នោត",
        "nameEn": "Fish sauce, lime juice, palm sugar",
        "amount": "២ ស្លាបព្រាបាយ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ចិតត្រសក់ជាចំណិតស្ដើង ច្របាច់អំបិលបន្តិចរួចលាងទឹកពូតឱ្យស្រួយ។",
        "instructionEn": "Slice cucumbers, toss with a pinch of salt, rinse and squeeze to maximize crunch."
      },
      {
        "stepNumber": 2,
        "instructionKh": "បេះត្រីឆ្អើរជាដុំតូចៗ លីងលើខ្ទះឱ្យឈ្ងុយបន្តិច។",
        "instructionEn": "Flake smoked fish and gently toast in a dry pan until aromatic."
      },
      {
        "stepNumber": 3,
        "instructionKh": "លាយទឹកត្រី ទឹកក្រូចឆ្មា ស្ករត្នោត ខ្ទឹមក្រហម និងម្ទេសឱ្យចូលជាតិ។",
        "instructionEn": "Mix lime juice, fish sauce, palm sugar, shallots, and chilies."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ច្របល់ត្រសក់ ត្រីឆ្អើរ ជីរ និងទឹកញាំចូលគ្នា ដួសទទួលទានភ្លាមៗ។",
        "instructionEn": "Combine cucumbers, smoked fish, herbs, and dressing; serve immediately."
      }
    ]
  },
  "food-78": {
    "nameKh": "ទឹកគ្រឿងសណ្តែកដីបាត់ដំបង",
    "nameEn": "Battambang Peanut Fish Dip Platter",
    "cat": "salad",
    "catKh": "ទឹកគ្រឿង & ញាំ",
    "catEn": "Salads & Dips",
    "descKh": "ទឹកគ្រឿងសណ្តែកដីបាត់ដំបង ជាទឹកជ្រលក់បុរាណខ្មែរដ៏ល្បី ប្រើសាច់ត្រីរ៉ស់ស្ងោរបុកម៉ត់ លាយទឹកប្រហុកថ្លា សណ្តែកដីលីងបុក ទឹកអំពិលទុំ និងស្ករត្នោត ទទួលទានផ្ទាប់ជាមួយបន្លែអន្លក់ស្រស់គ្រប់មុខ។",
    "descEn": "Traditional Battambang-style thick fish and peanut dip made with pounded river fish, clarified prahok stock, crushed peanuts, and tangy tamarind, served with a raw vegetable platter.",
    "prepTime": "២០ នាទី",
    "cookTime": "១៥ នាទី",
    "servings": "៣-៥ នាក់",
    "calories": 230,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "សាច់ត្រីរ៉ស់ស្ងោរបុកម៉ត់",
        "nameEn": "Pounded boiled river snakehead fish meat",
        "amount": "២៥០ ក្រាម"
      },
      {
        "nameKh": "សណ្តែកដីលីងបុកម៉ត់",
        "nameEn": "Finely ground roasted peanuts",
        "amount": "៤ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ទឹកប្រហុកដាំពុះត្រងស្អាត",
        "nameEn": "Boiled clarified prahok broth",
        "amount": "១ កូនចាន"
      },
      {
        "nameKh": "ទឹកអំពិលទុំ ឬទឹកក្រូចឆ្មា",
        "nameEn": "Tamarind pulp extract or lime",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ស្ករត្នោត ខ្ទឹមស និងម្ទេស",
        "nameEn": "Palm sugar, garlic, fresh chilies",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "បន្លែអន្លក់ស្រស់ (ត្រយូងចេក ត្រសក់ ផ្កាកំប្លោក)",
        "nameEn": "Fresh crudités platter (banana blossom, cucumber, water lily)",
        "amount": "១ កន្ត្រកធំ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ស្ងោរត្រីរ៉ស់ បេះយកតែសាច់បុកជាមួយខ្ទឹមស និងម្ទេសឱ្យម៉ត់រលោង។",
        "instructionEn": "Boil fish, debone, and pound meat in mortar with garlic and chili."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាំទឹកប្រហុកឱ្យពុះ ត្រងយកទឹកថ្លា ចាក់ច្របល់ជាមួយសាច់ត្រីបុក។",
        "instructionEn": "Simmer prahok in water, strain, and mix warm broth into pounded fish."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដាក់សណ្តែកដីបុក ទឹកអំពិលទុំ និងស្ករត្នោត កូរឱ្យខាប់រលោងល្មម។",
        "instructionEn": "Stir in ground roasted peanuts, tamarind, and palm sugar until thick and creamy."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ដួសដាក់ចានកណ្ដាល រៀបបន្លែអន្លក់ស្រស់ជុំវិញ ទទួលទានជាមួយបាយ។",
        "instructionEn": "Ladle dip into a bowl, surround with fresh seasonal greens, and enjoy with rice."
      }
    ]
  },
  "food-79": {
    "nameKh": "ប្រហុកកប់ស្លឹកចេកអាំង",
    "nameEn": "Charcoal Pit Prahok in Banana Leaf",
    "cat": "salad",
    "catKh": "ប្រហុក & ទឹកគ្រឿង",
    "catEn": "Salads & Dips",
    "descKh": "ប្រហុកកប់ស្លឹកចេកអាំង ប្រើប្រហុកសាច់ត្រីកំភ្លាញចិញ្ច្រាំជាមួយសាច់ជ្រូកបីជាន់ ខ្ទឹមស ខ្ទឹមក្រហម និងស្លឹកក្រូចសើច ខ្ចប់ក្នុងស្លឹកចេកអាំងលើធ្យូងភ្លើងឡើងឈ្ងុយឈ្ងប់ ទទួលទានជាមួយអន្លក់បន្លែស្រស់។",
    "descEn": "Authentic Khmer fermented fish paste pounded with minced pork belly, lemongrass, garlic, wrapped in banana leaf packets, and slow-roasted over embers.",
    "prepTime": "២០ នាទី",
    "cookTime": "២០ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 250,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "ប្រហុកសាច់ត្រីកំភ្លាញចិញ្ច្រាំ",
        "nameEn": "Minced river fish prahok",
        "amount": "១៥០ ក្រាម"
      },
      {
        "nameKh": "សាច់ជ្រូកបីជាន់ចិញ្ច្រាំម៉ត់",
        "nameEn": "Minced pork belly",
        "amount": "១៥០ ក្រាម"
      },
      {
        "nameKh": "ខ្ទឹមស ខ្ទឹមក្រហម និងស្លឹកក្រូចសើច",
        "nameEn": "Garlic, shallots, and kaffir lime leaves",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ម្ទេសស្រស់ហាន់ល្អិត",
        "nameEn": "Finely sliced fresh bird chilies",
        "amount": "១ ស្លាបព្រាកាហ្វេ"
      },
      {
        "nameKh": "ស្លឹកចេក និងបន្ទះឬស្សីខ្ទាស់",
        "nameEn": "Banana leaves and bamboo toothpicks",
        "amount": "សម្រាប់ខ្ចប់"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ចិញ្ច្រាំប្រហុកសាច់ជាមួយសាច់ជ្រូកបីជាន់ ខ្ទឹមស ខ្ទឹមក្រហម និងស្លឹកក្រូចសើចឱ្យម៉ត់ចូលគ្នា។",
        "instructionEn": "Mince prahok with pork belly, garlic, shallots, and kaffir lime leaves until homogenous."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ថែមស្ករត្នោតបន្តិច និងម្ទេសហាន់ល្អិត ច្របល់ឱ្យសព្វ។",
        "instructionEn": "Season with a pinch of palm sugar and chopped chilies."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ខ្ចប់ក្នុងស្លឹកចេកជាកញ្ចប់រាងបួនជ្រុង ចាក់ម្ជុលខ្ទាស់ឱ្យជាប់។",
        "instructionEn": "Wrap into tight square banana leaf parcels and pin shut with toothpicks."
      },
      {
        "stepNumber": 4,
        "instructionKh": "អាំងលើធ្យូងភ្លើងរហូតដល់ស្លឹកចេកឡើងពណ៌ខ្លោចក្រអូបឈ្ងុយ ទទួលទានជាមួយអន្លក់បន្លែខ្ចី។",
        "instructionEn": "Char-grill over hot embers until aromatic and cooked through; serve with fresh crudités."
      }
    ]
  },
  "food-80": {
    "nameKh": "ម៉ាំល្ហុងសាច់ជ្រូកបីជាន់",
    "nameEn": "Fermented Mudfish Papaya with Pork Belly",
    "cat": "salad",
    "catKh": "ម៉ាំ & ប្រហុក",
    "catEn": "Salads & Dips",
    "descKh": "ម៉ាំល្ហុងសាច់ជ្រូកបីជាន់ ប្រើម៉ាំត្រីរ៉ស់ខ្មែរផ្អាប់ជាមួយអង្ករលីង ច្របល់ជាមួយល្ហុងសាប់ស្រួយ សាច់ជ្រូកបីជាន់ស្ងោរហាន់ស្ដើង ខ្ញី ខ្ទឹមស និងម្ទេស រសជាតិដិតដល់ជូរប្រៃផ្អែមឈ្ងុយ។",
    "descEn": "Traditional fermented fish delicacy mixed with crisp shredded green papaya, boiled pork belly slices, ginger strands, and garlic.",
    "prepTime": "២០ នាទី",
    "cookTime": "១០ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 270,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "ម៉ាំត្រីរ៉ស់ ឬត្រីផ្ទក់ខ្មែរ",
        "nameEn": "Traditional fermented fish mam",
        "amount": "១៥០ ក្រាម"
      },
      {
        "nameKh": "ល្ហុងខ្ចីសាប់សរសៃស្រួយ",
        "nameEn": "Crisp shredded green papaya",
        "amount": "២០០ ក្រាម"
      },
      {
        "nameKh": "សាច់ជ្រូកបីជាន់ស្ងោរហាន់ស្ដើង",
        "nameEn": "Boiled sliced pork belly",
        "amount": "១៥០ ក្រាម"
      },
      {
        "nameKh": "ខ្ញីខ្ចី ខ្ទឹមស និងម្ទេសហាន់សរសៃ",
        "nameEn": "Ginger, garlic, and chili slivers",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ស្ករត្នោត និងទឹកក្រូចឆ្មា",
        "nameEn": "Palm sugar and lime juice",
        "amount": "១ ស្លាបព្រាបាយ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ច្របាច់ល្ហុងសាប់ជាមួយអំបិលរួចលាងទឹកពូតឱ្យស្ងួតដើម្បីឱ្យសរសៃល្ហុងស្រួយ។",
        "instructionEn": "Toss shredded papaya with salt, rinse, and squeeze dry for maximum crunch."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ចិញ្ច្រាំម៉ាំត្រីឱ្យម៉ត់ លាយជាមួយស្ករត្នោត ខ្ញី ខ្ទឹមស និងម្ទេស។",
        "instructionEn": "Mince mam and mix with palm sugar, ginger, garlic, and chilies."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ច្របល់ម៉ាំជាមួយល្ហុងសាប់ និងសាច់ជ្រូកបីជាន់ឱ្យចូលជាតិសព្វល្អ។",
        "instructionEn": "Toss seasoned mam with shredded papaya and pork belly slices."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ផ្អាប់ទុកកន្លះម៉ោង រួចដួសទទួលទានជាមួយជីរនាងវង និងបាយក្ដៅៗ។",
        "instructionEn": "Let sit for 30 minutes to meld flavors, then serve with holy basil and rice."
      }
    ]
  },
  "food-81": {
    "nameKh": "នំបញ្ចុកសម្លការីសាច់មាន់",
    "nameEn": "Nom Banh Chok with Red Chicken Curry",
    "cat": "noodles",
    "catKh": "នំបញ្ចុក & មី",
    "catEn": "Noodles & Curry",
    "descKh": "នំបញ្ចុកសម្លការីសាច់មាន់ នំបញ្ចុកសរសៃស្រស់ទន់រលោង ស្រោចដោយទឹកសម្លការីក្រហមសាច់មាន់ស្រែ ខ្ទិះដូងខាប់ ដំឡូងជ្វា និងត្រប់វែង អមដោយបន្លែអន្លក់ស្រស់គ្រប់មុខ។",
    "descEn": "Fresh fermented rice noodles drenched in rich, aromatic red chicken coconut curry, sweet potatoes, eggplants, and crunchy garden crudités.",
    "prepTime": "២៥ នាទី",
    "cookTime": "៣០ នាទី",
    "servings": "៤-៦ នាក់",
    "calories": 410,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "នំបញ្ចុកសរសៃស្រស់",
        "nameEn": "Fresh artisanal fermented rice noodles",
        "amount": "៥០០ ក្រាម"
      },
      {
        "nameKh": "សាច់មាន់ស្រែកាប់ដុំៗ",
        "nameEn": "Country chicken cut into pieces",
        "amount": "៤០០ ក្រាម"
      },
      {
        "nameKh": "គ្រឿងការីក្រហម និងខ្ទិះដូង",
        "nameEn": "Red curry paste and coconut milk",
        "amount": "៤០០ មីលីលីត្រ"
      },
      {
        "nameKh": "ដំឡូងជ្វា និងត្រប់វែងកាត់ចំណិត",
        "nameEn": "Sweet potatoes and Asian eggplants",
        "amount": "២០០ ក្រាម"
      },
      {
        "nameKh": "បន្លែអន្លក់ (ត្រយូងចេក សណ្តែកបណ្តុះ សណ្តែកកួរ)",
        "nameEn": "Fresh noodle greens (banana blossom, sprouts, long beans)",
        "amount": "១ កន្ត្រក"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "រំលីងគ្រឿងការីជាមួយក្បាលខ្ទិះដូងឱ្យបែកប្រេងក្រហម រួចដាក់សាច់មាន់ចូលឆាឱ្យចូលជាតិ។",
        "instructionEn": "Fry red curry in thick coconut cream until fragrant oil rises, add chicken and sear."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ចាក់ចុងខ្ទិះដូងចូល រម្ងាស់ឱ្យសាច់មាន់ទន់ រួចដាក់ដំឡូងជ្វា និងត្រប់ចូល។",
        "instructionEn": "Pour in remaining coconut milk, simmer chicken until tender, then add sweet potatoes and eggplants."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ថែមទឹកត្រី និងស្ករត្នោត រម្ងាស់រហូតដល់ដំឡូងឆ្អិនទន់ល្មម។",
        "instructionEn": "Season with fish sauce and palm sugar, simmering until vegetables are soft."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ចាប់នំបញ្ចុកដាក់ចាន រៀបបន្លែអន្លក់ស្រស់ ដួសទឹកការីមាន់ក្តៅៗស្រោចពីលើ។",
        "instructionEn": "Place noodles in bowl, arrange crisp fresh greens, and ladle piping-hot curry on top."
      }
    ]
  },
  "food-82": {
    "nameKh": "នំបញ្ចុកទឹកប្រហុកសៀមរាប",
    "nameEn": "Siem Reap Spicy Prahok Rice Noodles",
    "cat": "noodles",
    "catKh": "នំបញ្ចុក & មី",
    "catEn": "Noodles & Soups",
    "descKh": "នំបញ្ចុកទឹកប្រហុកសៀមរាប ជានំបញ្ចុកប្រចាំតំបន់អង្គរដ៏ល្បីល្បាញ ទឹកស៊ុបប្រហុកដាំពុះលាយសាច់ត្រីអាំងបុក រសជាតិហឹរជូរអែម រោយសណ្តែកដីបុក និងអន្លក់ស្រែស្រស់ៗ។",
    "descEn": "Legendary Siem Reap Angkor specialty of fermented rice noodles served with a hot, tangy, aromatic prahok broth infused with pounded grilled fish and crushed peanuts.",
    "prepTime": "២០ នាទី",
    "cookTime": "២០ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 320,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "នំបញ្ចុកសរសៃស្រស់",
        "nameEn": "Fresh fermented rice noodles",
        "amount": "៤០០ ក្រាម"
      },
      {
        "nameKh": "សាច់ត្រីរ៉ស់អាំងបុកម៉ត់",
        "nameEn": "Pounded grilled snakehead fish meat",
        "amount": "២០០ ក្រាម"
      },
      {
        "nameKh": "ទឹកប្រហុកដាំពុះត្រងស្អាត",
        "nameEn": "Boiled strained prahok broth",
        "amount": "៣០០ មីលីលីត្រ"
      },
      {
        "nameKh": "សណ្តែកដីលីងបុកម៉ត់",
        "nameEn": "Crushed roasted peanuts",
        "amount": "៣ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ទឹកក្រូចឆ្មា ម្ទេស និងស្ករត្នោត",
        "nameEn": "Lime juice, fresh chilies, palm sugar",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "បន្លែអន្លក់នំបញ្ចុកស្រែ",
        "nameEn": "Crisp assorted local greens and herbs",
        "amount": "១ កន្ត្រក"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ដាំទឹកប្រហុកជាមួយស្លឹកគ្រៃ និងរំដេងឱ្យពុះឈ្ងុយ រួចត្រងយកទឹកថ្លា។",
        "instructionEn": "Simmer prahok with lemongrass and galangal, then strain into clear broth."
      },
      {
        "stepNumber": 2,
        "instructionKh": "បុកសាច់ត្រីអាំងឱ្យម៉ត់ លាយជាមួយទឹកប្រហុក ថែមទឹកក្រូចឆ្មា ម្ទេស និងស្ករត្នោត។",
        "instructionEn": "Mix pounded grilled fish into prahok broth, seasoning with lime juice, chili, and sugar."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ចាប់នំបញ្ចុកដាក់ចាន ផ្ទាប់ជាមួយបន្លែអន្លក់គ្រប់មុខ។",
        "instructionEn": "Twirl fresh noodles into serving bowls and arrange assorted fresh greens."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ស្រោចទឹកប្រហុកសាច់ត្រី រោយសណ្តែកដីបុក ទទួលទានភ្លាមៗ។",
        "instructionEn": "Ladle the tangy fish broth over noodles, top with crushed peanuts, and enjoy."
      }
    ]
  },
  "food-83": {
    "nameKh": "គុយទាវកាត់",
    "nameEn": "Steamed Rice Noodle Rolls with Minced Pork",
    "cat": "noodles",
    "catKh": "មី & គុយទាវ",
    "catEn": "Noodles & Dim Sum",
    "descKh": "គុយទាវកាត់ ប្រើសន្លឹកគុយទាវចំហុយទន់រលោង កាត់ជាដុំៗ រោយសាច់ជ្រូកចិញ្ច្រាំឆាផ្សិតក្រៀម សាច់ក្រក សណ្តែកបណ្តុះ ខ្ទឹមបំពង និងស្រោចទឹកត្រីផ្អែមជូរអែម។",
    "descEn": "Silky steamed fresh flat rice noodle sheets topped with savory minced pork, dried mushrooms, sliced sausage, crispy shallots, and sweet garlic fish sauce.",
    "prepTime": "១៥ នាទី",
    "cookTime": "១០ នាទី",
    "servings": "២-៣ នាក់",
    "calories": 280,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "សន្លឹកគុយទាវចំហុយទន់ៗ",
        "nameEn": "Fresh steamed wide rice noodle sheets",
        "amount": "៣០០ ក្រាម"
      },
      {
        "nameKh": "សាច់ជ្រូកចិញ្ច្រាំឆាជាមួយផ្សិតក្រៀម",
        "nameEn": "Minced pork stir-fried with shiitake mushrooms",
        "amount": "១៥០ ក្រាម"
      },
      {
        "nameKh": "សាច់ក្រក និងពងទាហាន់សរសៃ",
        "nameEn": "Cambodian sausage and egg omelet strips",
        "amount": "៨០ ក្រាម"
      },
      {
        "nameKh": "សណ្តែកបណ្តុះស្រួយ និងខ្ទឹមបំពង",
        "nameEn": "Bean sprouts and crispy fried shallots",
        "amount": "១ ចានតូច"
      },
      {
        "nameKh": "ទឹកត្រីផ្អែមខ្មែរ",
        "nameEn": "Sweet garlic-lime fish sauce dressing",
        "amount": "៣ ស្លាបព្រាបាយ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ឆាសាច់ជ្រូកចិញ្ច្រាំជាមួយខ្ទឹមស និងផ្សិតក្រៀមឱ្យឈ្ងុយ ថែមទឹកត្រី និងម្រេច។",
        "instructionEn": "Stir-fry minced pork with garlic and soaked mushrooms, seasoning with fish sauce and pepper."
      },
      {
        "stepNumber": 2,
        "instructionKh": "កាត់សន្លឹកគុយទាវជាដុំៗ រៀបដាក់ចាន រោយសាច់ជ្រូកឆាពីលើ។",
        "instructionEn": "Cut fresh noodle sheets into bite-sized rolls, place in bowl, and top with pork."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដាក់សាច់ក្រក ពងទាហាន់សរសៃ សណ្តែកបណ្តុះ និងខ្ទឹមបំពង។",
        "instructionEn": "Garnish with sausage slices, egg strips, blanched bean sprouts, and crispy shallots."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ស្រោចទឹកត្រីផ្អែមជូរអែម ទទួលទានជាអាហារពេលព្រឹក ឬពេលរសៀល។",
        "instructionEn": "Drizzle sweet garlic lime sauce over the dish and enjoy."
      }
    ]
  },
  "food-84": {
    "nameKh": "គុយទាវឆា",
    "nameEn": "Cambodian Stir-Fried Flat Rice Noodles (Kuy Teav Cha)",
    "cat": "noodles",
    "catKh": "មី & គុយទាវ",
    "catEn": "Stir-Fried Noodles",
    "descKh": "គុយទាវឆា គុយទាវសរសៃធំឆាលើភ្លើងខ្លាំងជាមួយពងទា សាច់ជ្រូក ឬសាច់គោ តៅហ៊ូ និងសណ្តែកបណ្តុះ សរសៃគុយទាវឡើងពណ៌ក្រហមឈ្ងុយ ទទួលទានជាមួយទឹកត្រីម្ទេសក្រូចឆ្មារ។",
    "descEn": "Classic Cambodian street-style wok-charred flat rice noodles stir-fried with rich duck eggs, tender pork or beef, firm tofu, crunchy bean sprouts, and crushed peanuts.",
    "prepTime": "១៥ នាទី",
    "cookTime": "១០ នាទី",
    "servings": "២-៣ នាក់",
    "calories": 380,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "គុយទាវសរសៃធំស្រស់",
        "nameEn": "Fresh wide flat rice noodles",
        "amount": "៣៥០ ក្រាម"
      },
      {
        "nameKh": "ពងទាស្រស់",
        "nameEn": "Fresh duck eggs",
        "amount": "២ គ្រាប់"
      },
      {
        "nameKh": "សាច់ជ្រូក ឬសាច់គោហាន់ស្ដើង",
        "nameEn": "Sliced pork or tender beef",
        "amount": "១៥០ ក្រាម"
      },
      {
        "nameKh": "តៅហ៊ូលឿង និងសណ្តែកបណ្តុះ",
        "nameEn": "Fried yellow tofu and bean sprouts",
        "amount": "១០០ ក្រាម"
      },
      {
        "nameKh": "ស្លឹកខ្ទឹម ទឹកស៊ីអ៊ីវ ស្ករត្នោត ទឹកត្រី",
        "nameEn": "Scallions, dark soy sauce, palm sugar, fish sauce",
        "amount": "២ ស្លាបព្រាបាយ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ឆាខ្ទឹមស និងសាច់ឱ្យឆ្អិន គោះពងទាចូលកូរឱ្យចូលគ្នាលើភ្លើងខ្លាំង។",
        "instructionEn": "Sauté garlic and meat in a hot wok, crack duck eggs in and scramble lightly."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាក់គុយទាវចូលឆាលើភ្លើងខ្លាំង ថែមទឹកស៊ីអ៊ីវ ទឹកត្រី និងស្ករត្នោតឱ្យឡើងពណ៌ឈ្ងុយ។",
        "instructionEn": "Toss in wide noodles over intense heat, adding soy sauce, fish sauce, and palm sugar."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដាក់តៅហ៊ូ សណ្តែកបណ្តុះ និងស្លឹកខ្ទឹមឆាច្របល់យ៉ាងលឿន។",
        "instructionEn": "Add yellow tofu, bean sprouts, and chives, tossing quickly to retain crunch."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ដួសដាក់ចាន រោយសណ្តែកដីបុក ទទួលទានជាមួយទឹកត្រីម្ទេសក្រូចឆ្មា។",
        "instructionEn": "Plate immediately, sprinkle crushed roasted peanuts, and serve with lime and chili."
      }
    ]
  },
  "food-85": {
    "nameKh": "មីសួរស៊ុបប្រហិតសាច់ជ្រូក",
    "nameEn": "Glass Noodle Clear Soup with Meatballs",
    "cat": "noodles",
    "catKh": "មី & គុយទាវ",
    "catEn": "Noodles & Soup",
    "descKh": "មីសួរស៊ុបប្រហិតសាច់ជ្រូក ទឹកស៊ុបឆ្អឹងជ្រូកថ្លាឈ្ងុយផ្អែម អមដោយប្រហិតសាច់ជ្រូកធ្វើដោយដៃទន់ស្វិត មីសួរទន់រលោង ផ្សិតត្រចៀកកណ្តុរ និងស្ពៃចង្កឹះ ជាអាហារសម្រាលពោះដ៏ពេញនិយម។",
    "descEn": "Soothing clear broth with silky mung bean glass noodles, homemade bouncy pork meatballs, wood ear mushrooms, and fresh greens.",
    "prepTime": "១៥ នាទី",
    "cookTime": "២០ នាទី",
    "servings": "២-៣ នាក់",
    "calories": 260,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "មីសួរត្រាំទឹកទន់",
        "nameEn": "Soaked mung bean glass noodles",
        "amount": "១៥០ ក្រាម"
      },
      {
        "nameKh": "ប្រហិតសាច់ជ្រូកធ្វើដោយដៃ",
        "nameEn": "Handmade seasoned pork meatballs",
        "amount": "២០០ ក្រាម"
      },
      {
        "nameKh": "ទឹកស៊ុបឆ្អឹងជ្រូកថ្លា",
        "nameEn": "Clear pork bone broth",
        "amount": "៨០០ មីលីលីត្រ"
      },
      {
        "nameKh": "ស្ពៃចង្កឹះ និងផ្សិតត្រចៀកកណ្តុរ",
        "nameEn": "Bok choy and wood ear mushrooms",
        "amount": "១ ចាន"
      },
      {
        "nameKh": "ស្លឹកខ្ទឹម ខ្ទឹមបំពង ម្រេចកំពត",
        "nameEn": "Scallions, crispy fried garlic, Kampot pepper",
        "amount": "១ ស្លាបព្រាបាយ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ដាំទឹកស៊ុបឆ្អឹងជ្រូកឱ្យពុះ ដួសពពុះចេញឱ្យទឹកថ្លាឈ្ងុយ។",
        "instructionEn": "Bring pork stock to a rolling boil and skim froth for a crystal-clear broth."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ចាប់ប្រហិតសាច់ជ្រូកមូលៗបង់ចូលក្នុងទឹកស៊ុបឱ្យឆ្អិនអណ្តែតឡើង។",
        "instructionEn": "Drop handmade meatballs into boiling broth until they cook and float to the surface."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដាក់មីសួរ និងស្ពៃចង្កឹះចូលស្រុះ ១ នាទី។",
        "instructionEn": "Add softened glass noodles, mushrooms, and bok choy, simmering for 1 minute."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ដួសដាក់ចាន រោយខ្ទឹមបំពង ស្លឹកខ្ទឹម និងម្រេចកំពត ទទួលទានក្តៅៗ។",
        "instructionEn": "Ladle into bowls, top with fried garlic, scallions, and crushed pepper."
      }
    ]
  },
  "food-86": {
    "nameKh": "បាយឆាឡុកឡាក់សាច់គោ",
    "nameEn": "Beef Lok Lak Fried Rice Platter",
    "cat": "rice",
    "catKh": "ម្ហូបបាយ",
    "catEn": "Rice Dishes",
    "descKh": "បាយឆាឡុកឡាក់សាច់គោ បាយឆាពងទាគ្រាប់ស្ងួតឈ្ងុយ អមដោយសាច់គោឡុកឡាក់ផុយទន់ឆាភ្លើងខ្លាំង ប៉េងប៉ោះ ត្រសក់ និងទឹកជ្រលក់អំបិលម្រេចកំពតក្រូចឆ្មា។",
    "descEn": "Fragrant golden egg fried rice paired with tender wok-seared cubed beef tenderloin, fresh garden tomatoes, and black Kampot pepper-lime dipping sauce.",
    "prepTime": "២០ នាទី",
    "cookTime": "១៥ នាទី",
    "servings": "២-៣ នាក់",
    "calories": 450,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "បាយកកអង្ករផ្កាម្លិះ",
        "nameEn": "Chilled cooked jasmine rice",
        "amount": "៣ ចាន"
      },
      {
        "nameKh": "សាច់គោផុយកាត់ដុំឡុកឡាក់",
        "nameEn": "Cubed beef tenderloin",
        "amount": "៣០០ ក្រាម"
      },
      {
        "nameKh": "ពងទាស្រស់សម្រាប់ឆាបាយ",
        "nameEn": "Duck eggs for fried rice",
        "amount": "២ គ្រាប់"
      },
      {
        "nameKh": "ប៉េងប៉ោះ ត្រសក់ និងសាឡាត់",
        "nameEn": "Sliced tomatoes, cucumbers, lettuce",
        "amount": "១ ចាន"
      },
      {
        "nameKh": "ទឹកជ្រលក់អំបិលម្រេចកំពតក្រូចឆ្មា",
        "nameEn": "Kampot black pepper, sea salt, lime dip",
        "amount": "១ កូនចាន"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ឆាបាយកកជាមួយពងទា និងខ្ទឹមសលើភ្លើងខ្លាំងឱ្យគ្រាប់បាយស្ងួតឈ្ងុយ។",
        "instructionEn": "Stir-fry chilled rice with eggs and minced garlic over high flame until dry and fragrant."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ឆាសាច់គោជាមួយខ្ទឹមស ប្រេងខ្យង និងស្ករត្នោតលើភ្លើងខ្លាំងមួយភ្លែតកុំឱ្យស្វិត។",
        "instructionEn": "Flash-sear cubed beef with garlic, oyster sauce, and palm sugar over smoking wok."
      },
      {
        "stepNumber": 3,
        "instructionKh": "រៀបបាយឆាដាក់ចាន ទ្រាប់បន្លែស្រស់ជុំវិញ និងដួសសាច់គោឡុកឡាក់ដាក់ពីលើ។",
        "instructionEn": "Mound fried rice on platter with fresh salad vegetables and top with tender beef."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ទទួលទានជាមួយទឹកជ្រលក់អំបិលម្រេចកំពតច្របាច់ក្រូចឆ្មា។",
        "instructionEn": "Dip savory beef into lime-pepper sauce and enjoy with the fried rice."
      }
    ]
  },
  "food-87": {
    "nameKh": "បាយឆាម្រះព្រៅសាច់ជ្រូក",
    "nameEn": "Holy Basil Pork Fried Rice",
    "cat": "rice",
    "catKh": "ម្ហូបបាយ",
    "catEn": "Rice Dishes",
    "descKh": "បាយឆាម្រះព្រៅសាច់ជ្រូក ប្រើបាយអង្ករផ្កាម្លិះឆាជាមួយសាច់ជ្រូកចិញ្ច្រាំ ខ្ទឹមស ម្ទេសបុក និងស្លឹកម្រះព្រៅហឹរឈ្ងុយ ដាក់ពងទាចៀនក្រៀមពីលើ រសជាតិដិតដល់។",
    "descEn": "Aromatic spicy fried rice with minced pork, pounded garlic and chilies, fragrant holy basil, crowned with a crispy sunny-side-up fried duck egg.",
    "prepTime": "១៥ នាទី",
    "cookTime": "១០ នាទី",
    "servings": "២ នាក់",
    "calories": 420,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "បាយកកអង្ករផ្កាម្លិះ",
        "nameEn": "Chilled cooked jasmine rice",
        "amount": "២ ចានធំ"
      },
      {
        "nameKh": "សាច់ជ្រូកចិញ្ច្រាំ",
        "nameEn": "Minced pork",
        "amount": "១៥០ ក្រាម"
      },
      {
        "nameKh": "ស្លឹកម្រះព្រៅស្រស់",
        "nameEn": "Fresh holy basil leaves",
        "amount": "១ ក្តាប់"
      },
      {
        "nameKh": "ខ្ទឹមស និងម្ទេសបុក",
        "nameEn": "Pounded garlic and red chilies",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ពងទាចៀនគែមស្រួយ",
        "nameEn": "Crispy-edged fried duck eggs",
        "amount": "២ គ្រាប់"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ឆាខ្ទឹមស និងម្ទេសបុកក្នុងប្រេងក្តៅឱ្យឈួលឈ្ងុយ។",
        "instructionEn": "Fry garlic-chili paste in hot oil until intensely aromatic."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាក់សាច់ជ្រូកចិញ្ច្រាំចូលឆាឱ្យឆ្អិន ថែមទឹកត្រី និងស្ករត្នោត។",
        "instructionEn": "Add minced pork, browning thoroughly with fish sauce and palm sugar."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដាក់បាយកកចូលឆាច្របល់លើភ្លើងខ្លាំង រួចបង់ស្លឹកម្រះព្រៅចូល។",
        "instructionEn": "Toss in cold jasmine rice, frying on high flame, then fold in holy basil."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ដួសដាក់ចាន ដាក់ពងទាចៀនក្រៀមពីលើ ទទួលទានក្តៅៗ។",
        "instructionEn": "Plate up, crown with a crispy fried egg, and enjoy hot."
      }
    ]
  },
  "food-88": {
    "nameKh": "បបរមាន់ស្រែស្លឹកខ្ទឹម",
    "nameEn": "Free-Range Chicken Rice Porridge",
    "cat": "soup",
    "catKh": "ស៊ុប & បបរ",
    "catEn": "Porridge & Congee",
    "descKh": "បបរមាន់ស្រែស្លឹកខ្ទឹម រម្ងាស់អង្ករជាមួយទឹកស៊ុបស្ងោរមាន់ស្រែផ្អែមធម្មជាតិ សាច់មាន់ទន់បេះសរសៃ ខ្ញីហាន់ល្អិត សណ្តែកបណ្តុះ ស្លឹកខ្ទឹម និងខ្ទឹមបំពង ជាអាហារពេលព្រឹកដ៏កក់ក្តៅ។",
    "descEn": "Heartwarming Cambodian chicken congee simmered with rich free-range chicken broth, shredded chicken, julienned ginger, bean sprouts, and crispy garlic.",
    "prepTime": "២០ នាទី",
    "cookTime": "៣៥ នាទី",
    "servings": "៣-៥ នាក់",
    "calories": 290,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "អង្ករខ្សាយលាយដំណើបបន្តិច",
        "nameEn": "Jasmine rice with a touch of sticky rice",
        "amount": "២០០ ក្រាម"
      },
      {
        "nameKh": "សាច់មាន់ស្រែស្ងោរបេះជាសរសៃ",
        "nameEn": "Poached shredded free-range chicken",
        "amount": "៣០០ ក្រាម"
      },
      {
        "nameKh": "ទឹកស៊ុបស្ងោរមាន់ផ្អែមឈ្ងុយ",
        "nameEn": "Rich poached chicken broth",
        "amount": "១.២ លីត្រ"
      },
      {
        "nameKh": "ខ្ញីខ្ចីហាន់សរសៃ និងសណ្តែកបណ្តុះ",
        "nameEn": "Shredded fresh ginger and crisp bean sprouts",
        "amount": "១ ចាន"
      },
      {
        "nameKh": "ស្លឹកខ្ទឹម ខ្ទឹមបំពង ក្រូចឆ្មា ម្រេច",
        "nameEn": "Scallions, fried garlic, lime wedges, Kampot pepper",
        "amount": "២ ស្លាបព្រាបាយ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ស្ងោរមាន់ស្រែជាមួយខ្ទឹមស និងខ្ញីឱ្យឆ្អិនផុយ ស្រង់សាច់បេះជាសរសៃ។",
        "instructionEn": "Poach chicken with garlic and ginger until tender, shred the meat."
      },
      {
        "stepNumber": 2,
        "instructionKh": "យកទឹកស៊ុបមាន់ដាំបបរអង្កររហូតដល់គ្រាប់បាយរីកទន់ខាប់រលោង។",
        "instructionEn": "Simmer rice in chicken broth until grains bloom into a velvety congee."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ថែមទឹកត្រី និងអំបិលបន្តិច ភ្លក្សរសជាតិផ្អែមទឹកស៊ុបធម្មជាតិ។",
        "instructionEn": "Season with fish sauce and salt to taste."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ដួសបបរដាក់ចាន រៀបសាច់មាន់ ខ្ញីសរសៃ សណ្តែកបណ្តុះ ស្លឹកខ្ទឹម និងម្រេចកំពត។",
        "instructionEn": "Ladle into bowls, top with shredded chicken, ginger, sprouts, scallions, and pepper."
      }
    ]
  },
  "food-89": {
    "nameKh": "បបរត្រីរ៉ស់ខ្ញីស្រស់",
    "nameEn": "Snakehead Fish Ginger Rice Congee",
    "cat": "soup",
    "catKh": "ស៊ុប & បបរ",
    "catEn": "Porridge & Congee",
    "descKh": "បបរត្រីរ៉ស់ខ្ញីស្រស់ រម្ងាស់អង្ករជាមួយទឹកស៊ុបត្រីថ្លា សាច់ត្រីរ៉ស់ស្រស់ហាន់បន្ទះស្ដើងទន់ផ្អែម ខ្ញីខ្ចីហាន់សរសៃជួយកម្តៅរាងកាយ និងបំបាត់ក្លិនឆ្អាប ឈ្ងុយឆ្ងាញ់ពិសា។",
    "descEn": "Traditional delicate rice porridge with tender fresh river snakehead fish fillets, shredded young ginger, scallions, and golden fried garlic.",
    "prepTime": "១៥ នាទី",
    "cookTime": "២៥ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 230,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "អង្ករផ្កាម្លិះថ្មី",
        "nameEn": "Fragrant new jasmine rice",
        "amount": "១៨០ ក្រាម"
      },
      {
        "nameKh": "សាច់ត្រីរ៉ស់ស្រស់ហាន់ស្ដើង",
        "nameEn": "Fresh snakehead fish fillet slices",
        "amount": "៣០០ ក្រាម"
      },
      {
        "nameKh": "ខ្ញីខ្ចីហាន់សរសៃល្អិត",
        "nameEn": "Finely julienned young ginger",
        "amount": "៣ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ស្លឹកខ្ទឹម ស្លឹកជីរវ៉ាន់ស៊ុយ",
        "nameEn": "Scallions and fresh cilantro",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ទឹកត្រី ម្រេចកំពត ខ្ទឹមបំពង",
        "nameEn": "Fish sauce, Kampot pepper, crispy garlic",
        "amount": "១ ស្លាបព្រាបាយ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "រម្ងាស់អង្ករជាមួយទឹកស៊ុបត្រីឱ្យរីកទន់រលោង។",
        "instructionEn": "Simmer jasmine rice in clear fish stock until grains are softly broken down."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាក់ខ្ញីហាន់សរសៃចូលក្នុងបបរឱ្យចេញក្លិនឈ្ងុយបំបាត់ឆ្អាប។",
        "instructionEn": "Stir in ginger strands to infuse congee with a warming, fragrant aroma."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ពេលបបរពុះ ដាក់សាច់ត្រីរ៉ស់ស្រស់ចូលកុំកូរខ្លាំង ត្រីឆ្អិនលឿនក្នុង ២ នាទី។",
        "instructionEn": "Gently slip fish slices into simmering congee, cooking for 2 minutes without breaking."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ដួសដាក់ចាន រោយខ្ទឹមបំពង ស្លឹកខ្ទឹម និងម្រេចកំពត ទទួលទានពេលព្រឹក។",
        "instructionEn": "Ladle into bowls, sprinkle with fried garlic, scallions, and pepper."
      }
    ]
  },
  "food-90": {
    "nameKh": "បាយដំណើបសង់ខ្យាខ្មែរ",
    "nameEn": "Sticky Rice with Rich Coconut Custard",
    "cat": "dessert",
    "catKh": "បង្អែមខ្មែរ",
    "catEn": "Desserts & Sweets",
    "descKh": "បាយដំណើបសង់ខ្យាខ្មែរ ជាបង្អែមប្រពៃណីខ្មែរដ៏ល្បីល្បាញ អង្ករដំណើបចំហុយជាមួយខ្ទិះដូងខាប់ទន់ឈ្ងុយស្លឹកតើយ ដាក់សង់ខ្យាស៊ុតទាស្ករត្នោតពីលើ រសជាតិផ្អែមមុតស្រាលឈ្ងុយដូង។",
    "descEn": "Classic Cambodian royal sweet: fragrant coconut-steamed sticky rice infused with pandan, crowned with rich steamed duck egg and palm sugar custard.",
    "prepTime": "២៥ នាទី",
    "cookTime": "៣០ នាទី",
    "servings": "៤-៦ នាក់",
    "calories": 340,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "អង្ករដំណើបថ្មីត្រាំទន់",
        "nameEn": "Soaked fragrant glutinous rice",
        "amount": "៣០០ ក្រាម"
      },
      {
        "nameKh": "សង់ខ្យាស៊ុតទាស្ករត្នោត",
        "nameEn": "Steamed duck egg and palm sugar custard",
        "amount": "២០០ ក្រាម"
      },
      {
        "nameKh": "ខ្ទិះដូងខាប់រោយអំបិលបន្តិច",
        "nameEn": "Salted coconut cream sauce",
        "amount": "១៥០ មីលីលីត្រ"
      },
      {
        "nameKh": "ស្លឹកតើយស្រស់",
        "nameEn": "Fresh pandan leaves",
        "amount": "៤-៥ ស្លឹក"
      },
      {
        "nameKh": "ស្ករត្នោតសុទ្ធ",
        "nameEn": "Pure palm sugar",
        "amount": "១០០ ក្រាម"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ត្រាំអង្ករដំណើប រួចចំហុយជាមួយស្លឹកតើយ និងខ្ទិះដូងឱ្យទន់រលោងឈ្ងុយ។",
        "instructionEn": "Soak sticky rice, then steam with pandan leaves and coconut cream until glossy and tender."
      },
      {
        "stepNumber": 2,
        "instructionKh": "វាយស៊ុតទាជាមួយខ្ទិះដូង និងស្ករត្នោត ចំហុយឱ្យឆ្អិនណែនជាសង់ខ្យា។",
        "instructionEn": "Whisk duck eggs with coconut cream and palm sugar, steam until set into smooth custard."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដួសបាយដំណើបដាក់លើស្លឹកចេក កាត់សង់ខ្យាជាចំណិតដាក់ពីលើ។",
        "instructionEn": "Ladle warm sticky rice onto banana leaf, slice custard and place on top."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ស្រក់ក្បាលខ្ទិះដូងខាប់បន្តិច ទទួលទានជាបង្អែមលាងមាត់ដ៏ឈ្ងុយឆ្ងាញ់។",
        "instructionEn": "Drizzle with salted coconut cream and serve as an authentic Khmer dessert."
      }
    ]
  },
  "food-91": {
    "nameKh": "នំអន្សមចេកស្ករត្នោត",
    "nameEn": "Num Ansom Chek (Sweet Banana Sticky Rice Cake)",
    "cat": "cake",
    "catKh": "នំខ្មែរ & បង្អែម",
    "catEn": "Traditional Cakes",
    "descKh": "នំអន្សមចេកស្ករត្នោត ជានំបុរាណខ្មែរក្នុងពិធីបុណ្យភ្ជុំបិណ្ឌ និងចូលឆ្នាំ អង្ករដំណើបច្របល់ជាមួយដូងកោស និងស្ករត្នោត ខ្ចប់ចេកណាំវ៉ាទុំក្នុងស្លឹកចេក រួចស្ងោររហូតដល់ទន់ស្អិតឈ្ងុយ។",
    "descEn": "Traditional cylindrical banana leaf parcels of sticky rice seasoned with shredded coconut and palm sugar, wrapping sweet ripe baby bananas, slow-boiled for hours.",
    "prepTime": "៤០ នាទី",
    "cookTime": "៤ ម៉ោង",
    "servings": "៦-៨ នាក់",
    "calories": 310,
    "difficulty": "hard",
    "ingredients": [
      {
        "nameKh": "អង្ករដំណើបត្រាំទន់",
        "nameEn": "Soaked sticky rice",
        "amount": "៥០០ ក្រាម"
      },
      {
        "nameKh": "ចេកណាំវ៉ាទុំផ្អែម",
        "nameEn": "Ripe sweet baby bananas",
        "amount": "៦-៨ ផ្លែ"
      },
      {
        "nameKh": "ដូងទុំកោសសរសៃ",
        "nameEn": "Freshly grated coconut meat",
        "amount": "១៥០ ក្រាម"
      },
      {
        "nameKh": "ស្ករត្នោត និងអំបិលបន្តិច",
        "nameEn": "Palm sugar and pinch of sea salt",
        "amount": "៣ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ស្លឹកចេក និងខ្សែចេកសម្រាប់វេច",
        "nameEn": "Banana leaves and binding strings",
        "amount": "សម្រាប់វេចខ្ចប់"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ច្របល់អង្ករដំណើបជាមួយដូងកោស ស្ករត្នោត និងអំបិលបន្តិចឱ្យសព្វស្មើដៃ។",
        "instructionEn": "Toss soaked sticky rice with grated coconut, palm sugar, and a pinch of salt."
      },
      {
        "stepNumber": 2,
        "instructionKh": "រៀបស្លឹកចេក ដាក់អង្ករដំណើប ទ្រាប់ចេកទុំចំកណ្តាល រួចគ្របអង្ករពីលើ។",
        "instructionEn": "Lay out softened banana leaves, spread rice, place a ripe banana in center, and cover."
      },
      {
        "stepNumber": 3,
        "instructionKh": "វេចខ្ចប់ជារាងមូលទ្រវែង ចងខ្សែចេកឱ្យណែនដៃល្អ។",
        "instructionEn": "Roll into a tight cylinder and tie securely with banana twine."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ស្ងោរក្នុងទឹកពុះរយៈពេល ៤ ម៉ោងរហូតដល់ឆ្អិនស្អិតទន់ឈ្ងុយ កាត់ជាកង់ៗទទួលទានត្រជាក់។",
        "instructionEn": "Boil in deep pot for 4 hours until thoroughly gelatinized, slice and enjoy cool."
      }
    ]
  },
  "food-92": {
    "nameKh": "នំគមស្នូលដូងស្ករត្នោត",
    "nameEn": "Num Kom (Pyramid Sticky Cake with Sweet Coconut)",
    "cat": "cake",
    "catKh": "នំខ្មែរ & បង្អែម",
    "catEn": "Traditional Cakes",
    "descKh": "នំគម ជានំប្រពៃណីខ្មែររាងសាជីជ្រុង ធ្វើពីម្សៅដំណើបទន់រលោង ញាត់ស្នូលដូងកោសឆាស្ករត្នោតផ្អែមឈ្ងុយ វេចក្នុងស្លឹកចេកចំហុយឆ្អិន ជាតំណាងសិរីសួស្តីក្នុងពិធីបុណ្យជាតិ។",
    "descEn": "Iconic pyramid-shaped banana leaf steamed rice cakes filled with fragrant caramelized grated coconut and palm sugar.",
    "prepTime": "៣០ នាទី",
    "cookTime": "២៥ នាទី",
    "servings": "៤-៦ នាក់",
    "calories": 220,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "ម្សៅដំណើបម៉ត់",
        "nameEn": "Fine glutinous rice flour",
        "amount": "៣០០ ក្រាម"
      },
      {
        "nameKh": "ដូងទុំកោសសរសៃ",
        "nameEn": "Freshly shredded coconut",
        "amount": "២០០ ក្រាម"
      },
      {
        "nameKh": "ស្ករត្នោតសុទ្ធ",
        "nameEn": "Pure Cambodian palm sugar",
        "amount": "១៥០ ក្រាម"
      },
      {
        "nameKh": "ស្លឹកចេកកាត់រាងមូល និងប្រេងឆា",
        "nameEn": "Banana leaf discs and touch of oil",
        "amount": "សម្រាប់វេចខ្ចប់"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ច្របាច់ម្សៅដំណើបជាមួយទឹកក្តៅឧណ្ហៗឱ្យទន់ស្មើដៃ មិនស្អិត។",
        "instructionEn": "Knead glutinous rice flour with warm water into smooth pliable dough."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ឆាស្នូល៖ ដាក់ស្ករត្នោតរលាយលើភ្លើង ដាក់ដូងកោសចូលឆាឱ្យខាប់ស្អិតឈ្ងុយ រួចលុញជាដុំមូលតូចៗ។",
        "instructionEn": "Caramelize palm sugar with shredded coconut until thick and fragrant, roll into balls."
      },
      {
        "stepNumber": 3,
        "instructionKh": "យកម្សៅមកសំប៉ែត ដាក់ស្នូលដូងចំកណ្តាល រួចវេចខ្ចប់ស្លឹកចេករាងសាជីជ្រុង។",
        "instructionEn": "Flatten dough, insert coconut ball, seal, and wrap into conical pyramid shape with banana leaves."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ចំហុយរយៈពេល ២៥ នាទីឱ្យឆ្អិនឡើងរលោង ទទួលទានក្នុងពិធីបុណ្យប្រពៃណី។",
        "instructionEn": "Steam for 25 minutes until cooked and glossy, serve at room temperature."
      }
    ]
  },
  "food-93": {
    "nameKh": "នំកងស្ករត្នោត",
    "nameEn": "Num Kong (Khmer Glazed Donut Rings)",
    "cat": "cake",
    "catKh": "នំខ្មែរ & បង្អែម",
    "catEn": "Traditional Cakes & Donuts",
    "descKh": "នំកងស្ករត្នោត គឺជានំប្រពៃណីខ្មែរដ៏ពេញនិយមបំផុត មានរាងដូចកងដៃ ធ្វើពីម្សៅដំណើបបំពងស្រួយស្រោក ស្រោបដោយស្ករត្នោតរម្ងាស់ឡើងជើងក្អែក និងរោយល្ងសលីងឈ្ងុយឆ្ងាញ់ ទទួលទានជាបង្អែមសម្រន់។",
    "descEn": "Traditional Cambodian crispy fried rice flour donut rings generously glazed with caramelized palm sugar syrup and sprinkled with toasted fragrant white sesame seeds.",
    "prepTime": "២០ នាទី",
    "cookTime": "១៥ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 280,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "ម្សៅដំណើប និងម្សៅអង្ករខ្សាយបន្តិច",
        "nameEn": "Glutinous rice flour with rice flour",
        "amount": "២៥០ ក្រាម"
      },
      {
        "nameKh": "ស្ករត្នោតខ្មែរសម្រាប់ស្រោប",
        "nameEn": "Pure Cambodian palm sugar for glaze",
        "amount": "១៥០ ក្រាម"
      },
      {
        "nameKh": "ល្ងសលីងឈ្ងុយ",
        "nameEn": "Toasted white sesame seeds",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ខ្ទិះដូង ឬទឹកក្តៅឧណ្ហៗ",
        "nameEn": "Warm coconut milk or water",
        "amount": "១៥០ មីលីលីត្រ"
      },
      {
        "nameKh": "ប្រេងសម្រាប់បំពង",
        "nameEn": "Vegetable oil for deep frying",
        "amount": "១ ចានធំ"
      },
      {
        "nameKh": "អំបិលបន្តិច",
        "nameEn": "Pinch of sea salt",
        "amount": "កន្លះស្លាបព្រាកាហ្វេ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ច្របាច់ម្សៅដំណើបជាមួយខ្ទិះដូង និងអំបិលបន្តិចឱ្យទន់ស្មើដៃ រួចលុញជារាងកងមូលៗដូចកងដៃ។",
        "instructionEn": "Knead glutinous rice flour with warm coconut milk and salt into smooth dough, then shape into ring donuts."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាំប្រេងឱ្យក្តៅមធ្យម ដាក់នំកងចូលបំពងរហូតដល់ឡើងប៉ោងពណ៌លឿងស្រួយ រួចស្រង់ទុកឱ្យស្រក់ប្រេង។",
        "instructionEn": "Deep fry dough rings in medium-hot oil until puffed, golden, and crispy. Drain excess oil."
      },
      {
        "stepNumber": 3,
        "instructionKh": "រម្ងាស់ស្ករត្នោតជាមួយទឹកបន្តិចលើភ្លើងតិចៗរហូតដល់ឡើងជើងក្អែកស្អិតខាប់ឈ្ងុយ។",
        "instructionEn": "Simmer pure palm sugar with a splash of water over gentle heat until caramelized and syrupy."
      },
      {
        "stepNumber": 4,
        "instructionKh": "យកនំកងមកជ្រលក់ស្រោបស្ករត្នោតតែម្ខាង រួចរោយល្ងសលីងពីលើភ្លាមៗ ទុកឱ្យស្ករកកស្រួយ ទទួលទានជាបង្អែមសម្រន់ (មិនទទួលទានជាមួយបាយឡើយ)។",
        "instructionEn": "Dip one side of crispy donuts into palm glaze, sprinkle toasted sesame seeds, let set, and enjoy as a sweet afternoon pastry."
      }
    ]
  },
  "food-94": {
    "nameKh": "បង្អែមបបរត្នោតខ្ទិះដូង",
    "nameEn": "Palm Fruit Tapioca Pudding with Coconut Cream",
    "cat": "dessert",
    "catKh": "បង្អែមខ្មែរ",
    "catEn": "Desserts & Sweets",
    "descKh": "បង្អែមបបរត្នោតខ្ទិះដូង ប្រើសាច់ត្នោតខ្ចីទន់រលោង ចម្អិនក្នុងទឹកខ្ទិះដូងខាប់ គ្រាប់សាគូ និងស្ករត្នោតសុទ្ធ ក្លិនឈ្ងុយស្លឹកតើយ រសជាតិផ្អែមស្រទន់ត្រជាក់ចិត្ត។",
    "descEn": "Delightful tropical dessert of tender young palm fruit slices simmered in rich coconut cream with tapioca pearls and pure palm sugar.",
    "prepTime": "១៥ នាទី",
    "cookTime": "២០ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 270,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "សាច់ត្នោតខ្ចីហាន់បន្ទះ",
        "nameEn": "Fresh tender young palm fruit slices",
        "amount": "៣០០ ក្រាម"
      },
      {
        "nameKh": "គ្រាប់សាគូតូចៗ",
        "nameEn": "Mini tapioca pearls",
        "amount": "៦០ ក្រាម"
      },
      {
        "nameKh": "ខ្ទិះដូងដើមខាប់",
        "nameEn": "Rich coconut cream",
        "amount": "៣៥០ មីលីលីត្រ"
      },
      {
        "nameKh": "ស្ករត្នោតសុទ្ធ",
        "nameEn": "Pure palm sugar",
        "amount": "១២០ ក្រាម"
      },
      {
        "nameKh": "ស្លឹកតើយ និងអំបិលបន្តិច",
        "nameEn": "Pandan leaves and pinch of salt",
        "amount": "៣ ស្លឹក"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "លាងសាច់ត្នោតខ្ចីឱ្យស្អាត ហាន់ជាបន្ទះស្ដើងល្មម។",
        "instructionEn": "Rinse young palm fruit and slice into bite-sized pieces."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាំទឹកជាមួយស្លឹកតើយ និងគ្រាប់សាគូឱ្យឆ្អិនថ្លា។",
        "instructionEn": "Boil water with pandan leaves and tapioca pearls until translucent."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ដាក់ស្ករត្នោត អំបិលបន្តិច និងសាច់ត្នោតចូលរម្ងាស់ឱ្យចូលជាតិ ៥ នាទី។",
        "instructionEn": "Stir in palm sugar, pinch of salt, and palm fruit slices; simmer for 5 minutes."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ចាក់ខ្ទិះដូងខាប់ចូល កូរឱ្យពុះតិចៗលើកចុះ ដួសទទួលទានក្តៅៗ ឬត្រជាក់ជាមួយទឹកកក។",
        "instructionEn": "Pour in thick coconut cream, bring to a gentle simmer, and serve warm or chilled with crushed ice."
      }
    ]
  },
  "food-95": {
    "nameKh": "បង្អែមពោតខ្ទិះដូង",
    "nameEn": "Sweet Corn Coconut Pudding",
    "cat": "dessert",
    "catKh": "បង្អែមខ្មែរ",
    "catEn": "Desserts & Sweets",
    "descKh": "បង្អែមពោតខ្ទិះដូង ប្រើពោតដំណើបស្ងោរឈូសសរសៃ ចម្អិនជាមួយគ្រាប់សាគូ ខ្ទិះដូងខាប់ និងស្ករត្នោត រសជាតិផ្អែមមុតស្រាលឈ្ងុយគ្រាប់ពោត និងដូង។",
    "descEn": "Warm, sweet Cambodian pudding made with fresh sticky corn kernels, translucent tapioca pearls, and rich salted coconut cream.",
    "prepTime": "១៥ នាទី",
    "cookTime": "២០ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 260,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "ពោតដំណើបស្ងោរឈូសគ្រាប់",
        "nameEn": "Fresh sticky corn, shucked and sliced",
        "amount": "២ ផ្លែ"
      },
      {
        "nameKh": "គ្រាប់សាគូ",
        "nameEn": "Tapioca pearls",
        "amount": "៥០ ក្រាម"
      },
      {
        "nameKh": "ខ្ទិះដូងខាប់",
        "nameEn": "Thick coconut milk & cream",
        "amount": "៣៥០ មីលីលីត្រ"
      },
      {
        "nameKh": "ស្ករស ឬស្ករត្នោត",
        "nameEn": "Sugar or palm sugar",
        "amount": "១០០ ក្រាម"
      },
      {
        "nameKh": "អំបិលបន្តិច",
        "nameEn": "Pinch of sea salt",
        "amount": "កន្លះស្លាបព្រាកាហ្វេ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ឈូសគ្រាប់ពោតដំណើបឱ្យម៉ត់ល្មម។",
        "instructionEn": "Slice kernels off sweet sticky corn cobs."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាំទឹកពុះ ដាក់គ្រាប់សាគូ និងពោតចូលកូរឱ្យឆ្អិនទន់ស្អិត។",
        "instructionEn": "Boil water, add tapioca pearls and corn, cooking until pearls are clear."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ថែមស្ករ និងអំបិលបន្តិចឱ្យមានរសជាតិផ្អែមមុតស្រាល។",
        "instructionEn": "Stir in sugar and a pinch of salt to balance sweetness."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ចាក់ខ្ទិះដូងចូលកូរឱ្យសព្វ ដួសដាក់ចានទទួលទានក្តៅៗឈ្ងុយដូង។",
        "instructionEn": "Stir in rich coconut cream, remove from heat, and enjoy warm."
      }
    ]
  },
  "food-96": {
    "nameKh": "សាច់ក្រកសៀមរាបរសជាតិដើម",
    "nameEn": "Authentic Siem Reap Sweet Pork Sausage",
    "cat": "specialty",
    "catKh": "មុខម្ហូបពិសេស / សាច់ក្រក",
    "catEn": "Specialties",
    "descKh": "សាច់ក្រកសៀមរាប ជារបស់ផ្ញើដ៏ល្បីល្បាញប្រចាំខេត្តសៀមរាប សាច់ជ្រូកចិញ្ច្រាំជាប់ខ្លាញ់ល្មម ប្រឡាក់ស្រាស ស្ករត្នោត និងម្រេចកំពត ហាលថ្ងៃឱ្យឡើងជាតិជូរអែម យកមកចៀនឈ្ងុយឈ្ងប់។",
    "descEn": "Prized artisanal Cambodian sweet and savory pork sausages from Siem Reap, seasoned with rice wine, palm sugar, and Kampot pepper, naturally cured.",
    "prepTime": "៣០ នាទី",
    "cookTime": "១៥ នាទី",
    "servings": "៣-៥ នាក់",
    "calories": 380,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "សាច់ក្រកសៀមរាបស្ងួតស្រាប់",
        "nameEn": "Authentic Siem Reap pork sausages",
        "amount": "៤០០ ក្រាម"
      },
      {
        "nameKh": "ទឹកបន្តិចសម្រាប់រម្ងាស់ចៀន",
        "nameEn": "Water for poaching and pan-frying",
        "amount": "កន្លះកែវ"
      },
      {
        "nameKh": "ជ្រក់ខ្ញី ឬជ្រក់ត្រសក់",
        "nameEn": "Pickled ginger or cucumber",
        "amount": "១ ចានតូច"
      },
      {
        "nameKh": "ម្រេចកំពត និងម្ទេសស្រស់",
        "nameEn": "Kampot pepper and fresh chilies",
        "amount": "តាមចំណូលចិត្ត"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "កាត់សាច់ក្រកជាកំណាត់ខ្លីៗល្មម។",
        "instructionEn": "Slice sausages into serving segments."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាក់សាច់ក្រកក្នុងខ្ទះ ចាក់ទឹកកន្លះកែវ រម្ងាស់លើភ្លើងមធ្យមរហូតដល់រីងទឹក។",
        "instructionEn": "Place sausages in pan with half a cup of water, simmering until water evaporates."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ពេលរីងទឹក ខ្លាញ់សាច់ក្រកនឹងចេញមកចៀនសាច់ក្រកឡើងពណ៌ក្រហមឈ្ងុយ។",
        "instructionEn": "As water disappears, the rendered pork fat fries sausages to a shiny golden red."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ដួសដាក់ចាន ទទួលទានជាមួយជ្រក់ខ្ញី និងបាយក្ដៅៗ។",
        "instructionEn": "Serve sizzling hot with pickled ginger and steamed rice."
      }
    ]
  },
  "food-97": {
    "nameKh": "ងៀតគោបាត់ដំបងអាំង",
    "nameEn": "Sun-Dried Battambang Beef Jerky",
    "cat": "specialty",
    "catKh": "មុខម្ហូបពិសេស / ងៀត",
    "catEn": "Specialties",
    "descKh": "ងៀតគោបាត់ដំបង សាច់គោផុយប្រឡាក់ស្ករត្នោត ទឹកត្រី ខ្ទឹមស ម្រេចកំពត និងរោយគ្រាប់ល្ងស ហាលថ្ងៃឱ្យស្ងួតល្មម អាំងលើធ្យូងភ្លើងឱ្យឈ្ងុយ សាច់ទន់ផ្អែមឆ្ងាញ់។",
    "descEn": "Celebrated Battambang sweet-savory sun-dried beef jerky topped with sesame seeds, lightly grilled over charcoal until tender and aromatic.",
    "prepTime": "២០ នាទី",
    "cookTime": "១០ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 290,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "ងៀតគោបាត់ដំបងហាលស្ងួតស្រាប់",
        "nameEn": "Cured Battambang beef jerky with sesame",
        "amount": "៣០០ ក្រាម"
      },
      {
        "nameKh": "ជ្រក់ត្រសក់ ឬជ្រក់ល្ហុង",
        "nameEn": "Pickled cucumbers or green papaya",
        "amount": "១ ចាន"
      },
      {
        "nameKh": "ទឹកត្រីកោះកុង ឬទឹកម្ទេស",
        "nameEn": "Koh Kong spicy dip or chili sauce",
        "amount": "សម្រាប់ជ្រលក់"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "កាត់បន្ទះងៀតគោជាដុំល្មមសម្រាប់អាំង។",
        "instructionEn": "Cut beef jerky sheets into manageable pieces."
      },
      {
        "stepNumber": 2,
        "instructionKh": "អាំងលើរងើកភ្លើងធ្យូងតិចៗ ២ នាទីសងខាងឱ្យឆ្អិនឈ្ងុយ កុំឱ្យខ្លោច។",
        "instructionEn": "Grill over gentle charcoal heat for 2 minutes per side until sizzling and fragrant."
      },
      {
        "stepNumber": 3,
        "instructionKh": "យកដំបងឈើមកដំ ឬញីសាច់ងៀតឱ្យបែកទន់សរសៃ។",
        "instructionEn": "Lightly pound with a mallet to loosen tender beef fibers."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ទទួលទានក្តៅៗជាមួយបាយក្ដៅៗ ឬជ្រក់ត្រសក់ស្រួយៗ។",
        "instructionEn": "Serve warm accompanied by pickled cucumbers and hot rice."
      }
    ]
  },
  "food-98": {
    "nameKh": "អំបុកស្រូវថ្មីដូងខ្ចី",
    "nameEn": "Flattened New Rice with Fresh Young Coconut",
    "cat": "cake",
    "catKh": "នំខ្មែរ & អាហារសម្រន់",
    "catEn": "Traditional Snacks",
    "descKh": "អំបុកស្រូវថ្មីដូងខ្ចី ជានិមិត្តរូបនៃពិធីបុណ្យអកអំបុក អំបុកស្រូវថ្មីលីងបុកឈ្ងុយៗ ច្របល់ជាមួយសាច់ដូងខ្ចីកោស ទឹកដូង និងស្ករត្នោតបន្តិច រសជាតិផ្អែមស្រទន់ឈ្ងុយដូង។",
    "descEn": "Seasonal delicacy of newly harvested flattened green rice tossed with tender shredded young coconut, sweet coconut water, and a sprinkle of palm sugar.",
    "prepTime": "១០ នាទី",
    "cookTime": "៥ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 210,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "អំបុកស្រូវថ្មីលីងបុកឈ្ងុយ",
        "nameEn": "Freshly toasted pounded new crop rice (Ambok)",
        "amount": "២៥០ ក្រាម"
      },
      {
        "nameKh": "សាច់ដូងខ្ចីកោសសរសៃ",
        "nameEn": "Fresh young coconut flesh, shredded",
        "amount": "១៥០ ក្រាម"
      },
      {
        "nameKh": "ទឹកដូងខ្ចីផ្អែមធម្មជាតិ",
        "nameEn": "Fresh sweet coconut water",
        "amount": "កន្លះកែវ"
      },
      {
        "nameKh": "ស្ករត្នោត ឬស្ករសបន្តិច",
        "nameEn": "Palm sugar or cane sugar",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ចេកណាំវ៉ាទុំសម្រាប់ផ្ទាប់",
        "nameEn": "Ripe sweet baby bananas",
        "amount": "៣-៤ ផ្លែ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "រើសអំបុកឱ្យស្អាត ស្រោចទឹកដូងខ្ចីបន្តិចច្របល់ឱ្យអំបុកទន់ស្មើដៃ។",
        "instructionEn": "Sprinkle fresh coconut water over ambok rice to soften grains evenly."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដាក់សាច់ដូងខ្ចីកោស និងស្ករត្នោតបន្តិចចូល។",
        "instructionEn": "Add fresh shredded young coconut meat and palm sugar."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ច្របល់ចូលគ្នាថ្នមៗឱ្យសព្វ និងឡើងក្លិនឈ្ងុយដូង។",
        "instructionEn": "Toss gently until well blended and fragrant."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ទទួលទានផ្ទាប់ជាមួយចេកណាំវ៉ាទុំផ្អែម ក្នុងរដូវបុណ្យអុំទូក អកអំបុក (មិនទទួលទានជាមួយបាយឡើយ)។",
        "instructionEn": "Serve with ripe bananas as a celebratory Water Festival treat."
      }
    ]
  },
  "food-99": {
    "nameKh": "នំគ្រក់ខ្ទិះដូងក្តៅៗ",
    "nameEn": "Num Krok (Crispy Coconut Rice Pods with Chives)",
    "cat": "cake",
    "catKh": "នំខ្មែរ & អាហារសម្រន់",
    "catEn": "Traditional Cakes & Snacks",
    "descKh": "នំគ្រក់ខ្ទិះដូង ជានំខ្មែរដ៏ពេញនិយមបំផុត ម្សៅអង្ករលាយខ្ទិះដូង និងស្លឹកខ្ទឹម ចាក់ក្នុងពុម្ពដែកក្តៅឱ្យបាតនំស្រួយស្រោក ផ្ទៃខាងក្នុងទន់រលោងឈ្ងុយដូង ជ្រលក់ទឹកត្រីផ្អែម។",
    "descEn": "Beloved Cambodian crispy coconut-rice spherical pancakes cooked in cast-iron pans, with a crisp outer shell, creamy coconut center, and chopped chives.",
    "prepTime": "២០ នាទី",
    "cookTime": "១៥ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 290,
    "difficulty": "medium",
    "ingredients": [
      {
        "nameKh": "ម្សៅអង្ករខ្សាយលាយម្សៅដំណើប",
        "nameEn": "Rice flour blended with sticky rice flour",
        "amount": "២៥០ ក្រាម"
      },
      {
        "nameKh": "ខ្ទិះដូងដើមខាប់",
        "nameEn": "Rich coconut cream",
        "amount": "៣០០ មីលីលីត្រ"
      },
      {
        "nameKh": "ស្លឹកខ្ទឹមហាន់ល្អិត",
        "nameEn": "Finely chopped chives / scallions",
        "amount": "៣ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ទឹកត្រីផ្អែមលាយទឹកខ្ទិះសម្រាប់ជ្រលក់",
        "nameEn": "Sweet coconut fish sauce dip",
        "amount": "១ កូនចាន"
      },
      {
        "nameKh": "ប្រេងឆាសម្រាប់លាបពុម្ព",
        "nameEn": "Oil for greasing the cast-iron pan",
        "amount": "២ ស្លាបព្រាបាយ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "លាយម្សៅអង្ករជាមួយទឹក ខ្ទិះដូង អំបិលបន្តិច និងស្លឹកខ្ទឹមឱ្យសព្វជាល្បាយរាវល្មម។",
        "instructionEn": "Whisk rice flour with water, coconut cream, salt, and chives into a smooth batter."
      },
      {
        "stepNumber": 2,
        "instructionKh": "ដុតពុម្ពនំគ្រក់ដែកឱ្យក្តៅខ្លាំង លាបប្រេង រួចចាក់ម្សៅចូលកន្លះពុម្ព។",
        "instructionEn": "Heat the cast-iron cake pan until smoking, grease cups, and pour batter halfway."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ចាក់ក្បាលខ្ទិះដូងខាប់ពីលើ រួចគ្របគម្រប ៣ នាទីឱ្យបាតនំស្រួយពណ៌ត្នោត។",
        "instructionEn": "Spoon a dollop of thick coconut cream on top, cover for 3 minutes until bottom is crisp."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ឆ្កៀលនំគ្រក់ដាក់ផ្គុំជាគូៗ ទទួលទានក្តៅៗជ្រលក់ទឹកត្រីផ្អែម (ជាអាហារសម្រន់ពេលព្រឹក/រសៀល)។",
        "instructionEn": "Scoop out half-spheres, pair them together, and serve hot with sweet dipping sauce."
      }
    ]
  },
  "food-100": {
    "nameKh": "ចេកចៀនម្សៅស្រួយស្ករត្នោត",
    "nameEn": "Crispy Deep-Fried Bananas with Palm Glaze",
    "cat": "cake",
    "catKh": "នំខ្មែរ & អាហារសម្រន់",
    "catEn": "Traditional Cakes & Snacks",
    "descKh": "ចេកចៀនម្សៅស្រួយស្ករត្នោត ចេកណាំវ៉ាទុំសំប៉ែត ជ្រលក់ក្នុងម្សៅស្រួយរោយគ្រាប់ល្ងស បំពងក្នុងប្រេងក្តៅឡើងពណ៌មាសស្រួយស្រោក សាច់ចេកខាងក្នុងទន់ផ្អែមឆ្ងាញ់។",
    "descEn": "Favorite Cambodian street snack of sweet baby bananas pressed flat, coated in a crispy sesame rice batter, and fried golden brown.",
    "prepTime": "១៥ នាទី",
    "cookTime": "១២ នាទី",
    "servings": "៣-៤ នាក់",
    "calories": 270,
    "difficulty": "easy",
    "ingredients": [
      {
        "nameKh": "ចេកណាំវ៉ាទុំសំប៉ែតល្មម",
        "nameEn": "Ripe sweet baby bananas, pressed flat",
        "amount": "៦-៨ ផ្លែ"
      },
      {
        "nameKh": "ម្សៅអង្ករលាយម្សៅមីស្រួយ",
        "nameEn": "Rice flour & crispy batter mix",
        "amount": "២០០ ក្រាម"
      },
      {
        "nameKh": "គ្រាប់ល្ងស ឬល្ងខ្មៅ",
        "nameEn": "Toasted sesame seeds",
        "amount": "២ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ស្ករត្នោត និងអំបិលបន្តិច",
        "nameEn": "Palm sugar and pinch of salt",
        "amount": "១ ស្លាបព្រាបាយ"
      },
      {
        "nameKh": "ប្រេងសម្រាប់បំពង",
        "nameEn": "Vegetable oil for deep-frying",
        "amount": "១ ចានធំ"
      }
    ],
    "steps": [
      {
        "stepNumber": 1,
        "instructionKh": "ចិតចេកទុំជាបន្ទះ រួចយកថង់ប្លាស្ទិកទ្រាប់សង្កត់ឱ្យសំប៉ែតល្មម។",
        "instructionEn": "Peel ripe bananas and gently press between plastic sheets into flat cutlets."
      },
      {
        "stepNumber": 2,
        "instructionKh": "លាយម្សៅស្រួយជាមួយទឹក ស្ករត្នោត អំបិលបន្តិច និងគ្រាប់ល្ងឱ្យខាប់ល្មម។",
        "instructionEn": "Whisk rice flour with water, palm sugar, salt, and sesame seeds into a smooth batter."
      },
      {
        "stepNumber": 3,
        "instructionKh": "ជ្រលក់ចេកក្នុងម្សៅ រួចបំពងក្នុងប្រេងក្តៅរហូតដល់ឡើងពណ៌មាសស្រួយសងខាង។",
        "instructionEn": "Dip flattened bananas into batter and fry in hot oil until puffed, golden, and crispy."
      },
      {
        "stepNumber": 4,
        "instructionKh": "ស្រង់ឱ្យស្រក់ប្រេង ទទួលទានក្តៅៗស្រួយស្រោកផ្អែមធម្មជាតិ (ជាអាហារសម្រន់ពេលរសៀល)។",
        "instructionEn": "Drain on paper towels and enjoy warm as a crispy afternoon sweet snack."
      }
    ]
  }
};

export const generateFull100Foods = (): FoodItem[] => {
  const categories: Array<{ slug: FoodItem['categorySlug']; kh: string; en: string }> = [
    { slug: 'soup', kh: 'ម្ហូបសម្ល', en: 'Traditional Soups' },
    { slug: 'grilled', kh: 'ម្ហូបអាំង', en: 'Grilled & BBQ' },
    { slug: 'stirfry', kh: 'ម្ហូបឆា-បំពង', en: 'Stir-Fried & Fried' },
    { slug: 'salad', kh: 'ញាំ-ភ្លា-ប្រហុក', en: 'Salads & Dips' },
    { slug: 'noodles', kh: 'មី-គុយទាវ-នំបញ្ចុក', en: 'Noodles & Soups' },
    { slug: 'rice', kh: 'បាយ & អាហារពេលព្រឹក', en: 'Rice Dishes' },
    { slug: 'dessert', kh: 'បង្អែម & នំប្រពៃណី', en: 'Desserts & Sweets' },
    { slug: 'specialty', kh: 'អាហារសម្រន់ & ម្ហូបពិសេស', en: 'Snacks & Specialties' },
  ];

    
  // Categorized authentic photo pools for 180 additional dishes (AI Food Image Audit)
  const categoryPhotoPools: Record<string, string[]> = {
    soup: [
      'https://images.unsplash.com/photo-1547592180-85f173990554?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1628294895950-9805252327bc?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1574484284002-952d92456975?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1548946526-f69e2424cf45?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1594998893017-36147cbcae05?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=800&auto=format&fit=crop&q=80'
    ],
    grilled: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1508615263227-c5d58c1e5821?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1562967914-608f82629710?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&auto=format&fit=crop&q=80'
    ],
    stirfry: [
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1574484284002-952d92456975?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=800&auto=format&fit=crop&q=80'
    ],
    salad: [
      'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1574484284002-952d92456975?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800&auto=format&fit=crop&q=80'
    ],
    noodles: [
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1552611052-33e04de081de?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1594998893017-36147cbcae05?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=800&auto=format&fit=crop&q=80'
    ],
    rice: [
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1548946526-f69e2424cf45?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&auto=format&fit=crop&q=80'
    ],
    dessert: [
      'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579372786545-d24232daf58c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&auto=format&fit=crop&q=80'
    ],
    specialty: [
      'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1562967914-608f82629710?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1576867757603-05b134ebc379?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1547496502-affa22d38842?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1564834724105-918b73d1b9e0?w=800&auto=format&fit=crop&q=80'
    ]
  };


    const additionalAuthenticDishes = [
  {
    "nameKh": "សម្លម្ជូរត្រីកែវរំដេង",
    "nameEn": "River Keo Fish Galangal Sour Soup",
    "cat": "soup",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "សម្លម្ជូរល្ពៅសាច់ជ្រូក",
    "nameEn": "Pumpkin Pork Rib Sour Soup",
    "cat": "soup",
    "priceR": 15000,
    "priceU": 3.75
  },
  {
    "nameKh": "សម្លម្ជូរទំពាំងត្រីឆ្អើរ",
    "nameEn": "Bamboo Shoot & Smoked Fish Soup",
    "cat": "soup",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "សម្លប្រហើរននោងបង្គាស្រស់",
    "nameEn": "Luffa Gourd Fresh Shrimp Herbal Soup",
    "cat": "soup",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "សម្លស្ងោរម្រះញាត់សាច់ជ្រូក",
    "nameEn": "Bitter Melon Stuffed with Pork Soup",
    "cat": "soup",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "សម្លម្ជូរផ្កាកំប្លោកត្រីរ៉ស់",
    "nameEn": "Water Lily Flower Sour Soup with Fish",
    "cat": "soup",
    "priceR": 15000,
    "priceU": 3.75
  },
  {
    "nameKh": "សម្លការីទាស្រែចេកខ្ចី",
    "nameEn": "Country Duck Red Curry with Green Banana",
    "cat": "soup",
    "priceR": 24000,
    "priceU": 6
  },
  {
    "nameKh": "សម្លម្ជូរក្រសាំងត្រីពោធិ៍",
    "nameEn": "Krasang Fruit Sour Soup with River Fish",
    "cat": "soup",
    "priceR": 17000,
    "priceU": 4.25
  },
  {
    "nameKh": "សម្លម្ជូរស្រែត្រីឆ្លូញ",
    "nameEn": "Paddy Keo Fish Country Sour Soup",
    "cat": "soup",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "សម្លម្ជូរម្កាក់ត្រីអណ្តែង",
    "nameEn": "Ambarella Sour Soup with Catfish",
    "cat": "soup",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "សម្លប្រហើរផ្សិតចំបើង",
    "nameEn": "Straw Mushroom Herbal Soup",
    "cat": "soup",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "សម្លស្ងោរជ្រក់មាន់ស្រែ",
    "nameEn": "Country Chicken Lime & Lemongrass Soup",
    "cat": "soup",
    "priceR": 20000,
    "priceU": 5
  },
  {
    "nameKh": "សម្លម្ជូរក្តាមស្រែស្លឹកថ្នឹង",
    "nameEn": "Paddy Crab Sour Soup with Thnoeng Leaves",
    "cat": "soup",
    "priceR": 15000,
    "priceU": 3.75
  },
  {
    "nameKh": "សម្លម្ជូរពងត្រីស្លឹកម្ដេញ",
    "nameEn": "Fish Roe Sour Soup with Mdenh Leaves",
    "cat": "soup",
    "priceR": 22000,
    "priceU": 5.5
  },
  {
    "nameKh": "សម្លស្ងោរប្រហិតត្រីស្លឹកបាស",
    "nameEn": "Fish Ball Soup with Ivy Gourd Leaves",
    "cat": "soup",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "សម្លម្ជូរត្រកួនសាច់ជ្រូកបីជាន់",
    "nameEn": "Water Spinach Pork Belly Sour Soup",
    "cat": "soup",
    "priceR": 15000,
    "priceU": 3.75
  },
  {
    "nameKh": "សម្លការីសារ៉ាម៉ាន់សាច់គោ",
    "nameEn": "Royal Saraman Beef Curry",
    "cat": "soup",
    "priceR": 25000,
    "priceU": 6.25
  },
  {
    "nameKh": "សម្លប្រហើរស្លឹកបាសខ្យងស្រែ",
    "nameEn": "Ivy Gourd River Snail Herbal Broth",
    "cat": "soup",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "សម្លស្ងោរមាន់ត្រឡាច",
    "nameEn": "Winter Melon Chicken Soup",
    "cat": "soup",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "សម្លម្ជូរម្នាស់បង្គាស្រស់",
    "nameEn": "Pineapple Shrimp Sour Soup",
    "cat": "soup",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "សម្លម្ជូរល្មៀតទាស្រែ",
    "nameEn": "Turmeric Duck Country Sour Soup",
    "cat": "soup",
    "priceR": 22000,
    "priceU": 5.5
  },
  {
    "nameKh": "សម្លទំពាំងស្រស់សាច់ជ្រូកបីជាន់",
    "nameEn": "Fresh Bamboo Shoot Pork Belly Stew",
    "cat": "soup",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "សម្លស្ងោរឆ្អឹងជំនីរជ្រូកស្ពៃរើស",
    "nameEn": "Pork Rib Pickled Mustard Green Soup",
    "cat": "soup",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "សម្លប្រហើរត្រាវនិងត្រីអណ្តែង",
    "nameEn": "Taro Catfish Herbal Soup",
    "cat": "soup",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "សម្លម្ជូរដើមចេកត្រីផ្ទក់",
    "nameEn": "Banana Stem Sour Soup with Snakehead Fish",
    "cat": "soup",
    "priceR": 15000,
    "priceU": 3.75
  },
  {
    "nameKh": "សម្លស្ងោរមឹកញាត់សាច់ជ្រូក",
    "nameEn": "Stuffed Squid Clear Broth Soup",
    "cat": "soup",
    "priceR": 22000,
    "priceU": 5.5
  },
  {
    "nameKh": "សម្លការីត្រីពោធិ៍ដំឡូងជ្វា",
    "nameEn": "River Fish Sweet Potato Yellow Curry",
    "cat": "soup",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "ស្លាបមាន់អាំងទឹកឃ្មុំអំបិលម្ទេស",
    "nameEn": "Honey Glazed Spicy Chicken Wings",
    "cat": "grilled",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "ត្រីដៀបអាំងទឹកត្រីស្វាយខ្ចី",
    "nameEn": "Grilled Dieb Fish with Green Mango Dip",
    "cat": "grilled",
    "priceR": 22000,
    "priceU": 5.5
  },
  {
    "nameKh": "កោះមាន់អាំងគ្រឿងស្លឹកគ្រៃ",
    "nameEn": "Grilled Chicken Gizzards with Kroeung",
    "cat": "grilled",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "សាច់ជ្រូកអាំងពពុះសណ្តែក",
    "nameEn": "Grilled Pork Strips with Bean Curd",
    "cat": "grilled",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "ខ្យងស្រែអាំងអំបិលម្ទេស",
    "nameEn": "Charcoal Grilled River Snails with Chili Salt",
    "cat": "grilled",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "ត្រីអណ្តែងអាំងទឹកត្រីអំពិលទុំ",
    "nameEn": "Grilled Catfish with Tamarind Fish Sauce",
    "cat": "grilled",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "សាច់គោចង្កាក់អាំងគ្រឿងបាត់ដំបង",
    "nameEn": "Battambang Beef Skewers with Kroeung",
    "cat": "grilled",
    "priceR": 15000,
    "priceU": 3.75
  },
  {
    "nameKh": "ត្រីផ្ទក់អាំងអំបិលម្ទេសបាយក្ដៅ",
    "nameEn": "Grilled Giant Snakehead with Hot Rice",
    "cat": "grilled",
    "priceR": 25000,
    "priceU": 6.25
  },
  {
    "nameKh": "ត្រីរ៉ស់អាំងបំពង់ឫស្សី",
    "nameEn": "Bamboo Tube Charcoal Snakehead Fish",
    "cat": "grilled",
    "priceR": 28000,
    "priceU": 7
  },
  {
    "nameKh": "ពោះតាំងសាច់ជ្រូកអាំងទឹកប្រហុក",
    "nameEn": "Grilled Pork Chitterlings with Prahok Dip",
    "cat": "grilled",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "ឆ្អឹងជំនីរជ្រូកអាំងទឹកឃ្មុំព្រៃ",
    "nameEn": "Wild Honey Glazed Grilled Pork Ribs",
    "cat": "grilled",
    "priceR": 24000,
    "priceU": 6
  },
  {
    "nameKh": "កង្កែបបោកអាំងគ្រឿង",
    "nameEn": "Grilled Stuffed Frog with Kroeung & Peanuts",
    "cat": "grilled",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "មាន់ស្រែដុតដីឥដ្ឋ",
    "nameEn": "Traditional Clay-Baked Country Chicken",
    "cat": "grilled",
    "priceR": 35000,
    "priceU": 8.75
  },
  {
    "nameKh": "ត្រីអណ្តែងបំពង់ឫស្សីអាំង",
    "nameEn": "Bamboo Charcoal Grilled Catfish",
    "cat": "grilled",
    "priceR": 20000,
    "priceU": 5
  },
  {
    "nameKh": "បង្កងទន្លេអាំងទឹកត្រីកោះកុង",
    "nameEn": "Charcoal River Prawns with Koh Kong Dip",
    "cat": "grilled",
    "priceR": 38000,
    "priceU": 9.5
  },
  {
    "nameKh": "ពោះគោអាំងទឹកប្រហុកខ្ទឹមស",
    "nameEn": "Grilled Beef Tripe with Garlic Prahok",
    "cat": "grilled",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "សាច់ជ្រូកបីជាន់អាំងទឹកត្រីអំពិលទុំ",
    "nameEn": "Grilled Pork Belly with Tamarind Dip",
    "cat": "grilled",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "ប្រហិតត្រីឆ្លាតអាំងស្លឹកចេក",
    "nameEn": "Grilled Featherback Fish Paste in Banana Leaf",
    "cat": "grilled",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "មឹកមហាសមុទ្រអាំងអំបិលម្ទេស",
    "nameEn": "Grilled Ocean Squid with Lime Salt",
    "cat": "grilled",
    "priceR": 24000,
    "priceU": 6
  },
  {
    "nameKh": "ពងមាន់អាំងទឹកដោះគោ",
    "nameEn": "Seasoned Charcoal Grilled Whole Eggs",
    "cat": "grilled",
    "priceR": 8000,
    "priceU": 2
  },
  {
    "nameKh": "ក្រួចស្រែអាំងទឹកឃ្មុំ",
    "nameEn": "Grilled Wild Quail with Honey Glaze",
    "cat": "grilled",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "ភ្លៅមាន់អាំងទឹកដោះគោខាប់",
    "nameEn": "Caramelized Sweet Milk Chicken Thighs",
    "cat": "grilled",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "ឆាត្រកួនប្រហុកខ្ទឹមស",
    "nameEn": "Wok Morning Glory with Prahok Essence",
    "cat": "stirfry",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "ឆាផ្កាខាត់ណាបង្គាស្រស់",
    "nameEn": "Stir-Fried Broccoli with Fresh Prawns",
    "cat": "stirfry",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "ឆាមឹកស្រស់ម្រេចខ្ចីកំពត",
    "nameEn": "Fresh Squid Stir-Fried with Kampot Peppercorns",
    "cat": "stirfry",
    "priceR": 24000,
    "priceU": 6
  },
  {
    "nameKh": "ឆាត្រប់វែងសាច់ជ្រូកចិញ្ច្រាំ",
    "nameEn": "Eggplant Stir-Fried with Minced Pork",
    "cat": "stirfry",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "ឆាព្រលិតត្រីឆ្អើរ",
    "nameEn": "Water Lily Stems Stir-Fried with Smoked Fish",
    "cat": "stirfry",
    "priceR": 15000,
    "priceU": 3.75
  },
  {
    "nameKh": "ឆាក្តៅកង្កែបស្រែស្លឹកម្រះព្រៅ",
    "nameEn": "Spicy Wok-Fried Farm Frog with Holy Basil",
    "cat": "stirfry",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "ឆាសាច់គោម្រះព្រៅម្ទេសហឹរ",
    "nameEn": "Fiery Holy Basil Beef Stir-Fry",
    "cat": "stirfry",
    "priceR": 20000,
    "priceU": 5
  },
  {
    "nameKh": "ឆាស្ពៃក្តោបពងទាខ្មែរ",
    "nameEn": "Cabbage Stir-Fried with Eggs",
    "cat": "stirfry",
    "priceR": 10000,
    "priceU": 2.5
  },
  {
    "nameKh": "ឆាខ្ញីត្រីរ៉ស់រសជាតិដើម",
    "nameEn": "Snakehead Fish with Ginger & Black Beans",
    "cat": "stirfry",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "ឆាក្តៅសាច់គោស្លឹកម្រះព្រៅ",
    "nameEn": "Spicy Holy Basil Beef Stir-Fry",
    "cat": "stirfry",
    "priceR": 22000,
    "priceU": 5.5
  },
  {
    "nameKh": "ឆាគ្រឿងសាច់ទាស្រែ",
    "nameEn": "Duck Stir-Fried with Khmer Lemongrass Paste",
    "cat": "stirfry",
    "priceR": 22000,
    "priceU": 5.5
  },
  {
    "nameKh": "ឆាម្រះសាច់គោពងទា",
    "nameEn": "Bitter Melon Stir-Fried with Beef & Egg",
    "cat": "stirfry",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "ឆាបន្លែគ្រប់មុខប្រេងខ្យង",
    "nameEn": "Khmer Mixed Vegetable Stir-Fry",
    "cat": "stirfry",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "ឆាក្តាមថ្មម្រេចខ្ចីកំពត",
    "nameEn": "Kampot Mud Crab with Fresh Green Peppercorns",
    "cat": "stirfry",
    "priceR": 35000,
    "priceU": 8.75
  },
  {
    "nameKh": "ឆាលៀសសមុទ្រស្លឹកម្រះព្រៅ",
    "nameEn": "Stir-Fried Clams with Holy Basil",
    "cat": "stirfry",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "ឆាពោតបារាំងបង្គាស្រស់",
    "nameEn": "Okra Stir-Fried with River Shrimp",
    "cat": "stirfry",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "ឆាខ្ទឹមបារាំងសាច់គោ",
    "nameEn": "Sweet Onion Tender Beef Stir-Fry",
    "cat": "stirfry",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "ឆាផ្សិតចំបើងប្រហិតសាច់ជ្រូក",
    "nameEn": "Straw Mushroom & Pork Meatball Stir-Fry",
    "cat": "stirfry",
    "priceR": 15000,
    "priceU": 3.75
  },
  {
    "nameKh": "ឆាក្តៅខ្យងស្រែស្លឹកកន្ទួត",
    "nameEn": "River Snails with Star Gooseberry Leaves",
    "cat": "stirfry",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "ឆាផ្កាគូឆាយប្រហិតត្រី",
    "nameEn": "Chinese Chives Stir-Fried with Fish Cake",
    "cat": "stirfry",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "ឆាត្រឡាចសាច់ជ្រូកចិញ្ច្រាំ",
    "nameEn": "Winter Melon Stir-Fried with Minced Pork",
    "cat": "stirfry",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "ឆាម្ទេសប្លោកសាច់មាន់",
    "nameEn": "Sweet Bell Pepper Stir-Fried Chicken",
    "cat": "stirfry",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "ឆាខ្ញីមាន់ស្រែ",
    "nameEn": "Country Chicken Stir-Fried with Young Ginger",
    "cat": "stirfry",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "ញាំត្រយូងចេកសាច់មាន់ស្រែ",
    "nameEn": "Banana Blossom Salad with Free-Range Chicken",
    "cat": "salad",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "ញាំត្រសក់ត្រីឆ្អើរ",
    "nameEn": "Cucumber Salad with Smoked Fish",
    "cat": "salad",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "ទឹកគ្រឿងសណ្តែកដីបាត់ដំបង",
    "nameEn": "Battambang Peanut Fish Dip Platter",
    "cat": "salad",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "ប្រហុកកប់ស្លឹកចេកអាំង",
    "nameEn": "Charcoal Pit Prahok in Banana Leaf",
    "cat": "salad",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "ម៉ាំល្ហុងសាច់ជ្រូកបីជាន់",
    "nameEn": "Fermented Mudfish Papaya with Pork Belly",
    "cat": "salad",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "ផ្អកត្រីបំពងពងទា",
    "nameEn": "Crispy Fermented Fish Cakes with Eggs",
    "cat": "salad",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "ញាំសណ្តែកបណ្តុះសាច់គោ",
    "nameEn": "Crisp Bean Sprout Salad with Seared Beef",
    "cat": "salad",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "ទឹកត្រីជូរអែមអន្លក់ខ្ចី",
    "nameEn": "Sweet-Sour Garlic Lime Dip with Crudités",
    "cat": "salad",
    "priceR": 10000,
    "priceU": 2.5
  },
  {
    "nameKh": "ញាំក្រូចថ្លុងបង្គាស្រស់",
    "nameEn": "Pomelo Salad with Fresh Steamed Prawns",
    "cat": "salad",
    "priceR": 20000,
    "priceU": 5
  },
  {
    "nameKh": "ភ្លាត្រីសាលម៉ុនបែបខ្មែរ",
    "nameEn": "Khmer-style Salmon Ceviche with Herbs",
    "cat": "salad",
    "priceR": 24000,
    "priceU": 6
  },
  {
    "nameKh": "បុកស្វាយខ្ចីត្រីឆ្អើរ",
    "nameEn": "Pounded Green Mango Salad with Smoked Fish",
    "cat": "salad",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "ញាំមីសួរគ្រឿងសមុទ្រ",
    "nameEn": "Glass Noodle Seafood Salad with Herbs",
    "cat": "salad",
    "priceR": 20000,
    "priceU": 5
  },
  {
    "nameKh": "ទឹកគ្រឿងប្រហុកទន្លេសាប",
    "nameEn": "Tonle Sap Rich Herbal Prahok Dip",
    "cat": "salad",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "ញាំត្រួយចេកសាច់ជ្រូកបីជាន់",
    "nameEn": "Banana Stem Salad with Tender Pork Belly",
    "cat": "salad",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "បុកកន្ទួតទឹកត្រីផ្អែម",
    "nameEn": "Pounded Gooseberry with Sweet Chili Sauce",
    "cat": "salad",
    "priceR": 8000,
    "priceU": 2
  },
  {
    "nameKh": "ញាំសាច់មាន់ស្ពៃក្តោប",
    "nameEn": "Shredded Cabbage Chicken Herb Salad",
    "cat": "salad",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "ភ្លាកំពឹសរាំ",
    "nameEn": "Dancing Live Freshwater Shrimp Salad",
    "cat": "salad",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "ទឹកប្រហុកអន្លក់បន្លែខ្ចី",
    "nameEn": "Simmered Prahok Dipping Sauce with Crudités",
    "cat": "salad",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "ញាំស្វាយខ្ចីសាច់គោអាំង",
    "nameEn": "Green Mango Salad with Sliced Grilled Beef",
    "cat": "salad",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "ញាំពពាយបង្គាស្រស់",
    "nameEn": "Winged Bean Salad with Fresh Shrimp",
    "cat": "salad",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "បុកត្រប់វែងត្រីឆ្អើរ",
    "nameEn": "Pounded Roasted Eggplant with Smoked Fish",
    "cat": "salad",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "នំបញ្ចុកសម្លការីសាច់មាន់",
    "nameEn": "Nom Banh Chok with Red Chicken Curry",
    "cat": "noodles",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "នំបញ្ចុកទឹកប្រហុកសៀមរាប",
    "nameEn": "Siem Reap Spicy Prahok Rice Noodles",
    "cat": "noodles",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "គុយទាវកាត់ទន្លេបាសាក់",
    "nameEn": "Steamed Rice Noodle Rolls with Minced Pork",
    "cat": "noodles",
    "priceR": 10000,
    "priceU": 2.5
  },
  {
    "nameKh": "គុយទាវឆា",
    "nameEn": "Cambodian Stir-Fried Flat Rice Noodles (Kuy Teav Cha)",
    "cat": "noodles",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "មីសួរស៊ុបប្រហិតសាច់ជ្រូក",
    "nameEn": "Glass Noodle Clear Soup with Meatballs",
    "cat": "noodles",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "គុយទាវសាច់គោទឹកស៊ុបថ្លា",
    "nameEn": "Clear Broth Kuyteav with Tender Beef",
    "cat": "noodles",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "មីឆាគ្រឿងសមុទ្រកែប",
    "nameEn": "Kep Seafood Stir-Fried Noodles",
    "cat": "noodles",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "នំបញ្ចុកសម្លណាំយ៉ាខ្ទិះដូង",
    "nameEn": "Southern Nam Ya Coconut Fish Vermicelli",
    "cat": "noodles",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "គុយទាវខគោ",
    "nameEn": "Rich Cambodian Beef Stew Noodle Soup",
    "cat": "noodles",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "នំបញ្ចុកសម្លទំពាំង",
    "nameEn": "Nom Banh Chok with Bamboo Shoot Curry Broth",
    "cat": "noodles",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "គុយទាវទាខ្វៃ",
    "nameEn": "Roast Duck Noodle Soup",
    "cat": "noodles",
    "priceR": 20000,
    "priceU": 5
  },
  {
    "nameKh": "គុយទាវប្រហិតត្រីឆ្លាត",
    "nameEn": "Featherback Fish Ball Noodle Soup",
    "cat": "noodles",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "មីគោកសាច់ជ្រូកចិញ្ច្រាំ",
    "nameEn": "Dry Egg Noodles with Seasoned Minced Pork",
    "cat": "noodles",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "គុយទាវគ្រឿងសមុទ្រកំពត",
    "nameEn": "Kampot Seafood Rice Noodle Soup",
    "cat": "noodles",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "លតឆាស៊ុតទា",
    "nameEn": "Khmer Lot Cha Short Rice Noodles with Fried Duck Egg",
    "cat": "noodles",
    "priceR": 10000,
    "priceU": 2.5
  },
  {
    "nameKh": "មីកូឡាស្ទឹងសែន",
    "nameEn": "Steung Saen Sweet & Sour Kola Noodles",
    "cat": "noodles",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "នំបញ្ចុកទឹកម្ហូបកំពត",
    "nameEn": "Kampot Bok Lahong Rice Noodle Platter",
    "cat": "noodles",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "គុយទាវបាក់ទូកសាច់ជ្រូក",
    "nameEn": "Bak Touk Style Morning Kuyteav",
    "cat": "noodles",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "មីសួរបំពងស្រួយគ្រឿងសមុទ្រ",
    "nameEn": "Crispy Golden Glass Noodles with Seafood Sauce",
    "cat": "noodles",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "មីស៊ុបឆ្អឹងជំនីរជ្រូក",
    "nameEn": "Slow-Simmered Pork Rib Egg Noodle Soup",
    "cat": "noodles",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "បាយឆាឡុកឡាក់សាច់គោ",
    "nameEn": "Beef Lok Lak Fried Rice Platter",
    "cat": "rice",
    "priceR": 20000,
    "priceU": 5
  },
  {
    "nameKh": "បាយឆាម្រះព្រៅសាច់ជ្រូក",
    "nameEn": "Holy Basil Pork Fried Rice",
    "cat": "rice",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "បបរមាន់ស្រែស្លឹកខ្ទឹម",
    "nameEn": "Free-Range Chicken Rice Porridge",
    "cat": "rice",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "បបរត្រីរ៉ស់ខ្ញីស្រស់",
    "nameEn": "Snakehead Fish Ginger Rice Congee",
    "cat": "rice",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "បាយដំណើបសង់ខ្យាខ្មែរ",
    "nameEn": "Sticky Rice with Rich Coconut Custard",
    "cat": "rice",
    "priceR": 6000,
    "priceU": 1.5
  },
  {
    "nameKh": "បាយដំណើបត្រប់ដុត",
    "nameEn": "Sticky Rice with Charcoal Roasted Eggplant",
    "cat": "rice",
    "priceR": 8000,
    "priceU": 2
  },
  {
    "nameKh": "បាយក្ដាំងទឹកប្រហុក",
    "nameEn": "Crispy Rice Cakes with Savory Prahok Dip",
    "cat": "rice",
    "priceR": 10000,
    "priceU": 2.5
  },
  {
    "nameKh": "បាយសាច់គោអាំងពងទាចៀន",
    "nameEn": "Grilled Beef Rice Plate with Fried Egg",
    "cat": "rice",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "បាយឆាគ្រឿងការីបង្គាស្រស់",
    "nameEn": "Curry Prawn Fried Rice",
    "cat": "rice",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "បាយមាន់ហៃណាំខ្មែរ",
    "nameEn": "Khmer Hainanese Steamed Chicken Rice",
    "cat": "rice",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "បាយសាច់ជ្រូកបំពងខ្ទឹមស",
    "nameEn": "Crispy Garlic Pork Slices with Jasmine Rice",
    "cat": "rice",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "បាយឆាសាច់ក្រកសៀមរាប",
    "nameEn": "Siem Reap Sweet Sausage Fried Rice",
    "cat": "rice",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "បបរគ្រឿងជ្រូកខ្មែរ",
    "nameEn": "Savory Traditional Pork Offal Rice Congee",
    "cat": "rice",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "បបរខ្យងស្រែខ្ញីខ្ចី",
    "nameEn": "River Snail & Young Ginger Congee",
    "cat": "rice",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "បាយដំណើបសណ្តែកខ្មៅ",
    "nameEn": "Sticky Rice with Black Beans & Sweet Coconut",
    "cat": "rice",
    "priceR": 6000,
    "priceU": 1.5
  },
  {
    "nameKh": "បាយសាច់ជ្រូកចៀនពងទាក្រឡុក",
    "nameEn": "Stir-Scrambled Egg & Pork Cutlet Rice",
    "cat": "rice",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "បាយឆាប្រហុកពងទា",
    "nameEn": "Prahok & Duck Egg Savory Fried Rice",
    "cat": "rice",
    "priceR": 14000,
    "priceU": 3.5
  },
  {
    "nameKh": "បាយដំណើបស្វាយទុំ",
    "nameEn": "Mango Sweet Sticky Rice with Coconut Drizzle",
    "cat": "rice",
    "priceR": 10000,
    "priceU": 2.5
  },
  {
    "nameKh": "បាយឆាត្រីប្រៃសាច់ជ្រូក",
    "nameEn": "Salted Fish & Minced Pork Fragrant Fried Rice",
    "cat": "rice",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "បាយក្ដាំងបំពងស្រួយស្នូលសាច់",
    "nameEn": "Crisp Golden Rice Crust with Minced Meat Dip",
    "cat": "rice",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "នំអន្សមចេកស្ករត្នោត",
    "nameEn": "Num Ansom Chek (Sweet Banana Sticky Rice Cake)",
    "cat": "dessert",
    "priceR": 8000,
    "priceU": 2
  },
  {
    "nameKh": "នំគមស្នូលដូងស្ករត្នោត",
    "nameEn": "Num Kom (Pyramid Sticky Cake with Sweet Coconut)",
    "cat": "dessert",
    "priceR": 5000,
    "priceU": 1.25
  },
  {
    "nameKh": "នំកងស្ករត្នោត",
    "nameEn": "Num Kong (Khmer Glazed Donut Rings)",
    "cat": "dessert",
    "priceR": 4000,
    "priceU": 1
  },
  {
    "nameKh": "បង្អែមបបរត្នោតខ្ទិះដូង",
    "nameEn": "Palm Fruit Tapioca Pudding with Coconut Cream",
    "cat": "dessert",
    "priceR": 6000,
    "priceU": 1.5
  },
  {
    "nameKh": "បង្អែមពោតខ្ទិះដូង",
    "nameEn": "Sweet Corn Coconut Pudding",
    "cat": "dessert",
    "priceR": 5000,
    "priceU": 1.25
  },
  {
    "nameKh": "នំស្លឹកស្រស់បាត់ដំបង",
    "nameEn": "Fresh Leaf Wrapped Sweet Rice Cakes",
    "cat": "dessert",
    "priceR": 6000,
    "priceU": 1.5
  },
  {
    "nameKh": "បង្អែមបាយដំណើបខ្មៅ",
    "nameEn": "Black Sticky Rice with Salted Coconut Cream",
    "cat": "dessert",
    "priceR": 7000,
    "priceU": 1.75
  },
  {
    "nameKh": "នំចាក់ចុចដូងកោស",
    "nameEn": "Steamed Layered Pandan Rice Cakes",
    "cat": "dessert",
    "priceR": 5000,
    "priceU": 1.25
  },
  {
    "nameKh": "បង្អែមត្រាវខ្ទិះដូង",
    "nameEn": "Taro Dumplings in Warm Coconut Milk",
    "cat": "dessert",
    "priceR": 6000,
    "priceU": 1.5
  },
  {
    "nameKh": "នំទ្រាបបាយដំណើប",
    "nameEn": "Num Treap (Sticky Rice with Caramelized Coconut)",
    "cat": "dessert",
    "priceR": 6000,
    "priceU": 1.5
  },
  {
    "nameKh": "នំបត់ស្លឹកចេក",
    "nameEn": "Num Bat Folded Rice Cake",
    "cat": "dessert",
    "priceR": 5000,
    "priceU": 1.25
  },
  {
    "nameKh": "នំពព្លាក់ទឹកស្ករត្នោត",
    "nameEn": "Num Popleak Tapioca Coconut Balls",
    "cat": "dessert",
    "priceR": 6000,
    "priceU": 1.5
  },
  {
    "nameKh": "បង្អែមល្ពៅសង់ខ្យា",
    "nameEn": "Steamed Kabocha Pumpkin Custard",
    "cat": "dessert",
    "priceR": 8000,
    "priceU": 2
  },
  {
    "nameKh": "បង្អែមបាញ់ចានឿក",
    "nameEn": "Banh Ja-Neuk Mung Bean Dumplings in Ginger Syrup",
    "cat": "dessert",
    "priceR": 6000,
    "priceU": 1.5
  },
  {
    "nameKh": "នំល្ពៅចំហុយខ្ទិះដូង",
    "nameEn": "Steamed Pumpkin Rice Cake with Coconut",
    "cat": "dessert",
    "priceR": 5000,
    "priceU": 1.25
  },
  {
    "nameKh": "នំក្រូចស្នូលសណ្តែក",
    "nameEn": "Orange Shaped Sesame Mung Bean Dumplings",
    "cat": "dessert",
    "priceR": 4000,
    "priceU": 1
  },
  {
    "nameKh": "បង្អែមសារាយសមុទ្រខ្ទិះដូង",
    "nameEn": "Agar Jelly Coconut Cubes",
    "cat": "dessert",
    "priceR": 5000,
    "priceU": 1.25
  },
  {
    "nameKh": "បង្អែមគ្រាប់ឈូកខ្ទិះដូង",
    "nameEn": "Lotus Seed Sweet Coconut Dessert",
    "cat": "dessert",
    "priceR": 7000,
    "priceU": 1.75
  },
  {
    "nameKh": "នំត្នោតចំហុយស្រស់",
    "nameEn": "Traditional Steamed Palmyra Palm Cakes",
    "cat": "dessert",
    "priceR": 5000,
    "priceU": 1.25
  },
  {
    "nameKh": "នំកន្តំចេក",
    "nameEn": "Sticky Sweet Pressed Banana Treats",
    "cat": "dessert",
    "priceR": 5000,
    "priceU": 1.25
  },
  {
    "nameKh": "បង្អែមចេកបុកទឹកដោះគោ",
    "nameEn": "Mashed Ripe Banana with Coconut Cream",
    "cat": "dessert",
    "priceR": 6000,
    "priceU": 1.5
  },
  {
    "nameKh": "នំពុម្ពខ្ទិះដូងស្រួយ",
    "nameEn": "Khmer Crispy Coconut Waffle Cakes",
    "cat": "dessert",
    "priceR": 5000,
    "priceU": 1.25
  },
  {
    "nameKh": "បង្អែមត្នោតខ្ចីទឹកកកឈូស",
    "nameEn": "Iced Young Palm Fruit in Pandan Syrup",
    "cat": "dessert",
    "priceR": 7000,
    "priceU": 1.75
  },
  {
    "nameKh": "បង្អែមសណ្តែកបាយខ្ទិះដូង",
    "nameEn": "Split Mung Bean Warm Sweet Coconut Pudding",
    "cat": "dessert",
    "priceR": 6000,
    "priceU": 1.5
  },
  {
    "nameKh": "សាច់ក្រកសៀមរាបរសជាតិដើម",
    "nameEn": "Authentic Siem Reap Sweet Pork Sausage",
    "cat": "specialty",
    "priceR": 20000,
    "priceU": 5
  },
  {
    "nameKh": "ងៀតគោបាត់ដំបងអាំង",
    "nameEn": "Sun-Dried Battambang Beef Jerky",
    "cat": "specialty",
    "priceR": 25000,
    "priceU": 6.25
  },
  {
    "nameKh": "អំបុកស្រូវថ្មីដូងខ្ចី",
    "nameEn": "Flattened New Rice with Fresh Young Coconut",
    "cat": "specialty",
    "priceR": 8000,
    "priceU": 2
  },
  {
    "nameKh": "នំគ្រក់ខ្ទិះដូងក្តៅៗ",
    "nameEn": "Num Krok (Crispy Coconut Rice Pods with Chives)",
    "cat": "specialty",
    "priceR": 6000,
    "priceU": 1.5
  },
  {
    "nameKh": "ចេកចៀនម្សៅស្រួយស្ករត្នោត",
    "nameEn": "Crispy Deep-Fried Bananas with Palm Glaze",
    "cat": "specialty",
    "priceR": 4000,
    "priceU": 1
  },
  {
    "nameKh": "នំបំពងស្នូលសណ្តែក",
    "nameEn": "Fried Sesame Balls with Mung Bean Filling",
    "cat": "specialty",
    "priceR": 4000,
    "priceU": 1
  },
  {
    "nameKh": "ខ្យងស្រែស្ងោរស្លឹកគ្រៃទឹកត្រីកោះកុង",
    "nameEn": "Poached River Snails with Spicy Lemongrass Dip",
    "cat": "specialty",
    "priceR": 12000,
    "priceU": 3
  },
  {
    "nameKh": "គល់ស្លឹកគ្រៃញាត់សាច់ជ្រូកបំពង",
    "nameEn": "Crispy Lemongrass Stalks Stuffed with Pork",
    "cat": "specialty",
    "priceR": 16000,
    "priceU": 4
  },
  {
    "nameKh": "កណ្តូបស្រែបំពងស្លឹកក្រូចសើច",
    "nameEn": "Crispy Grasshoppers with Kaffir Lime",
    "cat": "specialty",
    "priceR": 10000,
    "priceU": 2.5
  },
  {
    "nameKh": "អាពីងបំពងខ្ទឹមសកំពង់ចាម",
    "nameEn": "Kampong Cham Crispy Garlic Fried Tarantula",
    "cat": "specialty",
    "priceR": 15000,
    "priceU": 3.75
  },
  {
    "nameKh": "ពងទាកូនទឹកត្រីម្រេចកំពត",
    "nameEn": "Balut with Kampot Peppercorn Lime Sauce",
    "cat": "specialty",
    "priceR": 6000,
    "priceU": 1.5
  },
  {
    "nameKh": "ងៀតត្រីរ៉ស់បំពង",
    "nameEn": "Crispy Sun-Dried Snakehead Fish Strips",
    "cat": "specialty",
    "priceR": 20000,
    "priceU": 5
  },
  {
    "nameKh": "លៀសហាលថ្ងៃអំបិលម្ទេស",
    "nameEn": "Sun-Dried Spicy Freshwater Clams",
    "cat": "specialty",
    "priceR": 6000,
    "priceU": 1.5
  },
  {
    "nameKh": "សណ្តែកដីលីងស្លឹកក្រូចសើច",
    "nameEn": "Roasted Peanuts with Lime Leaves & Garlic",
    "cat": "specialty",
    "priceR": 5000,
    "priceU": 1.25
  },
  {
    "nameKh": "ស្វាយខ្ចីទឹកត្រីផ្អែម",
    "nameEn": "Green Mango Slices with Sweet Chili Dip",
    "cat": "specialty",
    "priceR": 6000,
    "priceU": 1.5
  },
  {
    "nameKh": "ពោតអាំងលាបខ្ទិះដូង",
    "nameEn": "Charcoal Grilled Corn with Salted Coconut Glaze",
    "cat": "specialty",
    "priceR": 4000,
    "priceU": 1
  },
  {
    "nameKh": "នំប៉័ងប៉ាតេសាច់ជ្រូកក្រហម",
    "nameEn": "Khmer Baguette Sandwich with Pate & Pickles",
    "cat": "specialty",
    "priceR": 8000,
    "priceU": 2
  },
  {
    "nameKh": "ប្រហិតចៀនទឹកជ្រលក់អំពិលទុំ",
    "nameEn": "Deep-Fried Meatball Skewers with Tamarind Glaze",
    "cat": "specialty",
    "priceR": 8000,
    "priceU": 2
  },
  {
    "nameKh": "ដំឡូងជ្វាចៀនស្រួយ",
    "nameEn": "Crispy Sweet Potato Fritters",
    "cat": "specialty",
    "priceR": 4000,
    "priceU": 1
  },
  {
    "nameKh": "ត្រីប្រម៉ាចំហុយសាច់ជ្រូកបីជាន់",
    "nameEn": "Steamed Salted Threadfin with Minced Pork Belly",
    "cat": "specialty",
    "priceR": 18000,
    "priceU": 4.5
  },
  {
    "nameKh": "ក្រឡានថ្មគោលបាត់ដំបង",
    "nameEn": "Kralan Thma Koul Bamboo Sticky Rice",
    "cat": "specialty",
    "priceR": 8000,
    "priceU": 2
  },
  {
    "nameKh": "ចង្រិតអាំងម្ទេសហឹរ",
    "nameEn": "Spicy Charcoal Grilled Crickets",
    "cat": "specialty",
    "priceR": 10000,
    "priceU": 2.5
  },
  {
    "nameKh": "នំជាលស្លឹកចេក",
    "nameEn": "Num Cheal Steamed Glutinous Cakes",
    "cat": "specialty",
    "priceR": 5000,
    "priceU": 1.25
  }
];

  const fullList: FoodItem[] = [...seedFoods];
  const existingNames = new Set(seedFoods.map(f => f.nameKh));

  // Balanced selection targets across categories to ensure exactly 100 total authentic dishes
  const targetCategoryCounts: Record<string, number> = {
    soup: 7,       // 18 core + 7 = 25
    grilled: 8,    // 7 core + 8 = 15
    stirfry: 10,   // 5 core + 10 = 15
    salad: 5,      // 5 core + 5 = 10
    noodles: 5,    // 5 core + 5 = 10
    rice: 5,       // 3 core + 5 = 8
    dessert: 5,    // 5 core + 5 = 10
    specialty: 5,  // 2 core + 5 = 7
  };

  const selectedAdditionalDishes: typeof additionalAuthenticDishes = [];
  for (const [cat, count] of Object.entries(targetCategoryCounts)) {
    let added = 0;
    for (const d of additionalAuthenticDishes) {
      if (d.cat === cat && !existingNames.has(d.nameKh)) {
        existingNames.add(d.nameKh);
        selectedAdditionalDishes.push(d);
        added++;
        if (added === count) break;
      }
    }
  }

  // Exactly 50 dishes added: 50 core + 50 selected = 100 dishes total
  selectedAdditionalDishes.forEach((d, idx) => {
    const id = `food-${fullList.length + 1}`;
    const photo = `/foods/${id}.jpg`;
    const auditStatus = 'verified';

    // Authentic audited recipe lookup
    const customRecipe = (AUTHENTIC_FOOD_RECIPES as Record<string, any>)[id];
    const auditNote = `រូបភាពដើមពិតប្រាកដពី Magnific (${customRecipe ? customRecipe.nameKh : d.nameKh})`;
    
    if (customRecipe) {
      fullList.push({
        id,
        nameKh: customRecipe.nameKh,
        nameEn: customRecipe.nameEn,
        categorySlug: customRecipe.cat,
        categoryKh: customRecipe.catKh,
        categoryEn: customRecipe.catEn,
        descriptionKh: customRecipe.descKh,
        descriptionEn: customRecipe.descEn,
        photoUrl: photo,
        imageAuditStatus: auditStatus,
        imageAuditNote: auditNote,
        originalPhotoUrl: photo,
        ...(id === 'food-84' ? { isCustomPhoto: true, photoUpdatedAt: '2026-10-24T11:33:28.601Z' } : {}),
        prepTime: customRecipe.prepTime,
        cookTime: customRecipe.cookTime,
        servings: customRecipe.servings,
        calories: customRecipe.calories,
        difficulty: customRecipe.difficulty,
        priceRiel: 0,
        priceUsd: 0,
        rating: +(4.6 + ((idx % 4) * 0.1)).toFixed(1),
        reviewCount: 45 + ((idx * 11) % 150),
        isFeatured: idx % 8 === 0,
        ingredients: customRecipe.ingredients,
        steps: customRecipe.steps
      });
    } else {
      const catObj = categories.find(c => c.slug === d.cat) || categories[0];
      fullList.push({
        id,
        nameKh: d.nameKh,
        nameEn: d.nameEn,
        categorySlug: d.cat as any,
        categoryKh: catObj.kh,
        categoryEn: catObj.en,
        descriptionKh: `${d.nameKh} គឺជារសជាតិម្ហូបខ្មែរដើមពិតប្រាកដ។`,
        descriptionEn: `${d.nameEn} is an authentic Cambodian dish.`,
        photoUrl: photo,
        imageAuditStatus: auditStatus,
        imageAuditNote: auditNote,
        originalPhotoUrl: photo,
        ...(id === 'food-84' ? { isCustomPhoto: true, photoUpdatedAt: '2026-10-24T11:33:28.601Z' } : {}),
        prepTime: '១៥ នាទី',
        cookTime: '២០ នាទី',
        servings: '២-៣ នាក់',
        calories: 280,
        difficulty: 'medium',
        priceRiel: 0,
        priceUsd: 0,
        rating: 4.7,
        reviewCount: 50,
        ingredients: [],
        steps: []
      });
    }
  });

  return [...fullList.map((f) => ({ ...f, priceRiel: 0, priceUsd: 0 })), ...additional100Foods];
};

export const initial100Foods: FoodItem[] = generateFull100Foods();
export const initial200Foods: FoodItem[] = initial100Foods;
