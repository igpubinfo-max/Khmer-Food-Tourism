import type { FoodIngredient, FoodStep } from '../types';
import { normalizeKhmerFoodText } from './khmerFoodSearch';

export interface GeneratedRecipeResult {
  ingredients: FoodIngredient[];
  steps: FoodStep[];
  descriptionKh: string;
  descriptionEn: string;
}

const GENERIC_PLACEHOLDER_PATTERNS = [
  'គ្រឿងផ្សំខ្មែរដើម',
  'គ្រឿងទេស និងបន្លែស្រស់',
  'រៀបចំលាងសម្អាតគ្រឿងផ្សំឱ្យស្អាត។',
  'ចម្អិនតាមរូបមន្តប្រពៃណីខ្មែរឱ្យឆ្អិនឈ្ងុយឆ្ងាញ់។',
  'prepare and clean fresh ingredients',
  'traditional khmer ingredients',
];

export function hasPlaceholderOrIncompleteRecipe(
  ingredients?: FoodIngredient[],
  steps?: FoodStep[]
): boolean {
  if (!Array.isArray(ingredients) || ingredients.length < 4) return true;
  if (!Array.isArray(steps) || steps.length < 3) return true;
  const joinedIngs = ingredients
    .map((i) => `${i.nameKh || ''} ${i.nameEn || ''}`.toLowerCase())
    .join(' | ');
  const joinedSteps = steps
    .map((s) => `${s.instructionKh || ''} ${s.instructionEn || ''}`.toLowerCase())
    .join(' | ');
  for (const pat of GENERIC_PLACEHOLDER_PATTERNS) {
    const low = pat.toLowerCase();
    if (joinedIngs.includes(low) || joinedSteps.includes(low)) {
      return true;
    }
  }
  return false;
}

export function areIngredientsIdentical(a?: FoodIngredient[], b?: FoodIngredient[]): boolean {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every(
    (item, idx) =>
      (item.nameKh || '').trim() === (b[idx]?.nameKh || '').trim() &&
      (item.amount || '').trim() === (b[idx]?.amount || '').trim()
  );
}

export function areStepsIdentical(a?: FoodStep[], b?: FoodStep[]): boolean {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every(
    (item, idx) => (item.instructionKh || '').trim() === (b[idx]?.instructionKh || '').trim()
  );
}

interface ProteinMatch {
  mainKh: string;
  mainEn: string;
  amount: string;
}

function detectMainIngredient(nameKh: string, nameEn: string): ProteinMatch {
  const rawKh = (nameKh || '').trim();
  const kh = normalizeKhmerFoodText(rawKh) || rawKh;
  const en = (nameEn || '').toLowerCase();

  // 1. Fermented Khmer Specialties (ប្រហុក, ផ្អក, ម៉ាំ, កាពិ)
  if (kh.includes('ប្រហុក') || en.includes('prahok')) {
    return {
      mainKh: 'ប្រហុកសាច់ខ្មែរសុទ្ធចិញ្ច្រាំម៉ត់លាយសាច់ជ្រូកបីជាន់ចិញ្ច្រាំ',
      mainEn: 'Authentic minced Cambodian Prahok blended with minced pork belly',
      amount: '៣៥០ ក្រាម',
    };
  }
  if (kh.includes('ផ្អក') || en.includes('pha-ok')) {
    return {
      mainKh: 'ផ្អកត្រីខ្មែររសជាតិដើមលាយសាច់ជ្រូកបីជាន់ហាន់ល្អិត',
      mainEn: 'Traditional Cambodian fermented fish (Pha-ok) with minced pork belly',
      amount: '៣៥០ ក្រាម',
    };
  }
  if (kh.includes('ម៉ាំ')) {
    return {
      mainKh: 'ម៉ាំត្រីខ្មែរសាច់ណែនឈ្ងុយលាយសាច់ជ្រូកបីជាន់ចិញ្ច្រាំ',
      mainEn: 'Cambodian fermented fish (Mam) blended with minced pork belly',
      amount: '៣៥០ ក្រាម',
    };
  }
  if (kh.includes('កាពិ') || en.includes('shrimp paste')) {
    return {
      mainKh: 'កាពិខ្មែរសុទ្ធឈ្ងុយល្អអាំងស្លឹកចេក និងសាច់ជ្រូកចិញ្ច្រាំ',
      mainEn: 'Fragrant roasted Cambodian shrimp paste (Kapi) and minced pork',
      amount: '២០០ ក្រាម',
    };
  }

  // 2. Offal, Special Cuts & Country Meats
  if (kh.includes('ត្រចៀកជ្រូក') || en.includes('pig ear') || en.includes('pork ear')) {
    return {
      mainKh: 'ត្រចៀកជ្រូកស្រស់ស្ងោរឆ្អិនហាន់ស្តើងៗឱ្យស្រួយ',
      mainEn: 'Fresh pork ears boiled tender-crisp and thinly sliced',
      amount: '៤៥០ ក្រាម',
    };
  }
  if (kh.includes('ខួរជ្រូក') || en.includes('pork brain')) {
    return {
      mainKh: 'ខួរជ្រូកស្រស់លាងសម្អាតដកសរសៃឈាមស្អាតថ្នមៗ',
      mainEn: 'Fresh pork brain gently cleaned and prepped',
      amount: '៣៥០ ក្រាម',
    };
  }
  if (kh.includes('អណ្តាតគោ') || en.includes('ox tongue') || en.includes('beef tongue')) {
    return {
      mainKh: 'អណ្តាតគោស្រស់សម្អាតស្អាតហាន់បន្ទះល្មម',
      mainEn: 'Fresh beef tongue cleaned and sliced into tender pieces',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('ពោះគោ') || en.includes('beef tripe')) {
    return {
      mainKh: 'ពោះគោស្រស់លាងសម្អាតស្ងោរជាមួយគល់ស្លឹកគ្រៃឱ្យផុយស្រួយ',
      mainEn: 'Fresh beef tripe cleaned and simmered with lemongrass until tender-crisp',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('កន្សោមដោះគោ')) {
    return {
      mainKh: 'កន្សោមដោះគោស្រស់ហាន់បន្ទះស្តើងល្មមសម្រាប់ប្រឡាក់អាំង',
      mainEn: 'Fresh beef udder sliced evenly for marinating and grilling',
      amount: '៤៥០ ក្រាម',
    };
  }
  if (kh.includes('ក្រពះជ្រូក') || kh.includes('ពោះតាន់') || kh.includes('ពោះវៀន') || en.includes('pork stomach') || en.includes('tripe')) {
    return {
      mainKh: 'ក្រពះជ្រូក ឬពោះតាន់ស្រស់លាងសម្អាតស្ងោរផុយស្រួយ',
      mainEn: 'Fresh pork stomach or tripe thoroughly cleaned and simmered tender-crisp',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('ថ្លើម') || en.includes('liver')) {
    return {
      mainKh: 'ថ្លើមស្រស់លាងសម្អាតហាន់បន្ទះស្តើងល្មម',
      mainEn: 'Fresh liver cleaned and sliced evenly',
      amount: '៤០០ ក្រាម',
    };
  }
  if (kh.includes('ជើងមាន់') || en.includes('chicken feet')) {
    return {
      mainKh: 'ជើងមាន់ស្រស់ដកឆ្អឹង ឬកាត់ក្រចកលាងទឹកអំបិលស្អាត',
      mainEn: 'Fresh boneless or trimmed chicken feet',
      amount: '៤៥០ ក្រាម',
    };
  }
  if (kh.includes('ស្លាបមាន់') || en.includes('chicken wing')) {
    return {
      mainKh: 'ស្លាបមាន់ស្រស់សាច់ណែនលាងសម្អាតឆូតសាច់បន្តិចឱ្យឆាប់ចូលគ្រឿង',
      mainEn: 'Fresh plump chicken wings cleaned and lightly scored',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('ជើងជ្រូក') || en.includes('pork trotter') || en.includes('pork hock')) {
    return {
      mainKh: 'ជើងជ្រូកស្រស់កាប់ជាដុំល្មមលាងសម្អាតស្អាត',
      mainEn: 'Fresh pork trotters cut into serving chunks',
      amount: '៦០០ ក្រាម',
    };
  }
  if (kh.includes('ឆ្អឹងជំនីរ') || en.includes('rib')) {
    return {
      mainKh: 'ឆ្អឹងជំនីរជ្រូកខ្ចីកាប់ដុំល្មមលាងសម្អាតស្អាត',
      mainEn: 'Young tender pork spare ribs cut into pieces',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('សាច់ជ្រូកបីជាន់') || kh.includes('បីជាន់') || kh.includes('ពោះជ្រូក') || en.includes('pork belly')) {
    return {
      mainKh: 'សាច់ជ្រូកបីជាន់ស្រស់ជាប់ស្បែកស្តើង',
      mainEn: 'Fresh layered pork belly with thin skin',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('អង្ក្រង') && (kh.includes('គោ') || en.includes('beef'))) {
    return {
      mainKh: 'សាច់គោខ្មែរផុយទន់ហាន់ស្តើង និងអង្ក្រងស្រស់លាងស្អាតផ្តល់រសជាតិជូរធម្មជាតិ',
      mainEn: 'Thinly sliced tender Cambodian beef and fresh tangy red weaver ants',
      amount: '៤៥០ ក្រាម',
    };
  }
  if (kh.includes('សាច់គោ') || kh.includes('គោ') || en.includes('beef') || en.includes('steak')) {
    return {
      mainKh: 'សាច់គោខ្មែរស្រស់ផុយទន់ហាន់ជាបន្ទះល្មម',
      mainEn: 'Fresh tender Cambodian beef sliced evenly',
      amount: '៤៥០ ក្រាម',
    };
  }
  if (kh.includes('សាច់ជ្រូក') || kh.includes('ជ្រូក') || en.includes('pork')) {
    return {
      mainKh: 'សាច់ជ្រូកស្រស់ហាន់ ឬចិញ្ច្រាំតាមមុខម្ហូប',
      mainEn: 'Fresh local pork sliced or minced for the dish',
      amount: '៤៥០ ក្រាម',
    };
  }
  if (kh.includes('ពពែ') || en.includes('goat')) {
    return {
      mainKh: 'សាច់ពពែស្រស់ជាប់ស្បែកកាប់ដុំល្មមលាងខ្ញីស្រាឱ្យបាត់ឆ្អាប',
      mainEn: 'Fresh skin-on goat meat cleaned with ginger and cut into chunks',
      amount: '៦០០ ក្រាម',
    };
  }
  if (kh.includes('ក្រួច') || en.includes('quail')) {
    return {
      mainKh: 'សាច់ក្រួចស្រស់សម្អាតស្អាតប្រឡាក់គ្រឿងចូលជាតិ',
      mainEn: 'Fresh whole quails cleaned and prepped',
      amount: '៤ ក្បាល',
    };
  }
  if (kh.includes('មាន់ខ្មៅ') || en.includes('silkie')) {
    return {
      mainKh: 'មាន់ខ្មៅស្រស់សម្អាតស្អាតកាប់ជាដុំល្មម',
      mainEn: 'Fresh black silkie chicken cleaned and cut into pieces',
      amount: '១ ក្បាល (៧០០ ក្រាម)',
    };
  }
  if (kh.includes('មាន់ដុត') || kh.includes('មាន់ស្រែ') || kh.includes('សាច់មាន់') || kh.includes('មាន់') || en.includes('chicken')) {
    return {
      mainKh: 'សាច់មាន់ស្រែខ្មែរស្រស់សាច់ណែនផ្អែម',
      mainEn: 'Fresh free-range Cambodian chicken',
      amount: '៦០០ ក្រាម',
    };
  }
  if (kh.includes('ទា') && !kh.includes('ពងទា')) {
    return {
      mainKh: 'សាច់ទាស្រស់សម្អាតស្អាតកាប់ជាដុំល្មម',
      mainEn: 'Fresh duck cleaned and cut into pieces',
      amount: '៦០០ ក្រាម',
    };
  }
  if (kh.includes('ចង្រិត') || kh.includes('កណ្តូប') || kh.includes('ដង្កូវនាង') || en.includes('cricket') || en.includes('insect')) {
    return {
      mainKh: 'ចង្រិត ឬកណ្តូបស្រស់លាងទឹកអំបិលឱ្យស្អាតសម្រស់ទឹកស្ងួត',
      mainEn: 'Fresh crickets or grasshoppers rinsed clean in salted water and drained',
      amount: '៣៥០ ក្រាម',
    };
  }
  if (kh.includes('ប្រហិត') || en.includes('meatball')) {
    return {
      mainKh: 'ប្រហិតសាច់គោ ឬប្រហិតត្រីស្វិតឆ្ងាញ់',
      mainEn: 'Springy Cambodian beef or fish meatballs',
      amount: '៤០០ ក្រាម',
    };
  }
  if (kh.includes('សាច់ក្រក') || en.includes('sausage')) {
    return {
      mainKh: 'សាច់ក្រកខ្មែរសាច់ជ្រូក ឬសាច់គោឈ្ងុយផ្អែមល្មម',
      mainEn: 'Authentic Cambodian spiced pork or beef sausages',
      amount: '៤០០ ក្រាម',
    };
  }

  // 3. Seafood, Shellfish & Specific Khmer Fishes
  if (kh.includes('ក្តាម') || en.includes('crab')) {
    return {
      mainKh: 'ក្តាមសេះ ឬក្តាមថ្មស្រស់សាច់ណែនលាងសម្អាតបកស្នូក',
      mainEn: 'Fresh Kep swimming or mud crabs cleaned and prepped',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('បង្កង') || en.includes('river prawn') || en.includes('lobster')) {
    return {
      mainKh: 'បង្កងទឹកសាបធំៗស្រស់លាងសម្អាតវះខ្នងដកសរសៃខ្មៅ',
      mainEn: 'Fresh giant river prawns cleaned and split along the back',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('បង្គា') || en.includes('prawn') || en.includes('shrimp')) {
    return {
      mainKh: 'បង្គាស្រស់ធំៗលាងសម្អាតវះខ្នងដកសរសៃខ្មៅ',
      mainEn: 'Fresh jumbo prawns cleaned and deveined',
      amount: '៤៥០ ក្រាម',
    };
  }
  if (kh.includes('មឹក') || en.includes('squid') || en.includes('calamari')) {
    return {
      mainKh: 'មឹកសមុទ្រស្រស់លាងស្អាតឆូតក្រឡាហាន់ដុំល្មម',
      mainEn: 'Fresh ocean squid cleaned, scored, and cut into pieces',
      amount: '៤៥០ ក្រាម',
    };
  }
  if (kh.includes('ងាវ') || en.includes('cockle')) {
    return {
      mainKh: 'ងាវស្រស់ធំៗត្រាំទឹកអំបិលម្ទេសឱ្យខ្ជាក់ដី និងដុសសំបកស្អាត',
      mainEn: 'Fresh plump blood cockles purged in salted chili water and scrubbed clean',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('លាស') || kh.includes('លៀស') || kh.includes('គ្រំ') || kh.includes('ខ្យង') || kh.includes('អយស្ទ័រ') || en.includes('clam') || en.includes('mussel') || en.includes('snail') || en.includes('oyster')) {
    return {
      mainKh: 'គ្រឿងសមុទ្រសំបក (លៀស/គ្រំ/ខ្យង/អយស្ទ័រ) ស្រស់ត្រាំទឹកខ្ជាក់ដីដុសស្អាត',
      mainEn: 'Fresh shellfish (clams/mussels/snails/oysters) purged and scrubbed clean',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('កង្កែប') || en.includes('frog')) {
    return {
      mainKh: 'កង្កែបស្រែស្រស់សម្អាតស្អាតកាប់ដុំល្មម',
      mainEn: 'Fresh paddy frogs cleaned and prepped',
      amount: '៤៥០ ក្រាម',
    };
  }
  if (kh.includes('អន្ទង់') || en.includes('eel')) {
    return {
      mainKh: 'អន្ទង់ស្រែស្រស់ដុសលាងអំបិលក្រូចឆ្មារឱ្យបាត់រំអិលហាន់កង់',
      mainEn: 'Fresh swamp eel scrubbed clean with salt and lime and cut into pieces',
      amount: '៤៥០ ក្រាម',
    };
  }
  if (kh.includes('ស្តៅ')) {
    return {
      mainKh: 'ផ្កា និងត្រួយស្តៅខ្ចីស្រុះទឹកក្តៅបន្តិចឱ្យស្រួយឈ្ងុយ រួមជាមួយត្រីឆ្អើរ និងសាច់ជ្រូកបីជាន់ស្ងោរ',
      mainEn: 'Blanched tender neem blossoms with flaked smoked fish and sliced boiled pork belly',
      amount: '៣៥០ ក្រាម',
    };
  }
  if (kh.includes('ត្រីឆ្អើរ') || en.includes('smoked fish')) {
    return {
      mainKh: 'ត្រីឆ្អើរខ្មែរឈ្ងុយបេះយកតែសាច់សុទ្ធគ្មានឆ្អឹង',
      mainEn: 'Fragrant Cambodian smoked fish flaked and deboned',
      amount: '២៥០ ក្រាម',
    };
  }
  if (kh.includes('ត្រីងៀត') || kh.includes('ត្រីប្រម៉ា') || en.includes('dried fish') || en.includes('salted fish')) {
    return {
      mainKh: 'ត្រីងៀត ឬត្រីប្រម៉ាខ្មែរសាច់ណែនលាងទឹកសម្រស់ស្ងួត',
      mainEn: 'Cambodian sun-dried or salted fish rinsed and patted dry',
      amount: '៣០០ ក្រាម',
    };
  }
  const specificFishMatch = kh.match(/ត្រី(?:រ៉ស់|ផ្ទក់|អណ្តែង|ប្រា|ពោធិ៍|ឆ្ពិន|ក្រាញ់|ឆ្លាំង|កេះ|ក្រាយ|កញ្ចុះ|សណ្តាយ|សាម៉ុន|សាលម៉ុន|ធូណា)/);
  if (specificFishMatch) {
    return {
      mainKh: `${specificFishMatch[0]}ស្រស់សាច់ណែនលាងទឹកអំបិលក្រូចឆ្មារឱ្យបាត់ឆ្អាប`,
      mainEn: `Fresh ${en.includes('salmon') ? 'salmon' : 'Cambodian freshwater fish'} cleaned with salt and lime`,
      amount: '៥០០ ក្រាម',
    };
  }
  if ((kh.includes('ត្រី') && !kh.includes('ទឹកត្រី')) || kh.includes('ទឹកគ្រឿង') || en.includes('fish')) {
    return {
      mainKh: 'ត្រីរ៉ស់ ឬត្រីទន្លេស្រស់សម្អាតស្រកា និងលាងទឹកអំបិលឱ្យស្អាត',
      mainEn: 'Fresh river or snakehead fish scaled, cleaned, and prepped',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('ពងទាកូន') || en.includes('balut')) {
    return {
      mainKh: 'ពងទាកូនខ្មែរថ្មីៗល្មមឆ្ងាញ់លាងសំបកឱ្យស្អាត',
      mainEn: 'Fresh Cambodian fertilized duck eggs washed clean',
      amount: '៦ គ្រាប់',
    };
  }
  if (kh.includes('ពងទា') || kh.includes('ពងមាន់') || kh.includes('ស៊ុត') || en.includes('egg') || en.includes('omelet')) {
    return {
      mainKh: 'ពងទា ឬពងមាន់ខ្មែរស្រស់ថ្មីៗ',
      mainEn: 'Fresh Cambodian duck or chicken eggs',
      amount: '៤ គ្រាប់',
    };
  }

  // 4. Khmer Herbs, Wild Greens, Vegetables, Tofu & Mushrooms
  if (kh.includes('ត្រយូងចេក') || en.includes('banana flower') || en.includes('banana blossom')) {
    return {
      mainKh: 'ត្រយូងចេកខ្ចីហាន់ស្តើងត្រាំទឹកក្រូចឆ្មារឱ្យសស្រួយ និងសាច់មាន់ស្ងោរបេះសរសៃ',
      mainEn: 'Crisp shredded banana blossom soaked in lime water with shredded poached chicken',
      amount: '៤០០ ក្រាម',
    };
  }
  if (kh.includes('ផ្កាស្នោ')) {
    return {
      mainKh: 'ផ្កាស្នោខ្មែរស្រស់បេះទងលាងទឹកស្អាតសម្រស់ឱ្យស្រស់ទឹក',
      mainEn: 'Fresh golden sesbania blossoms picked and rinsed clean',
      amount: '៣០០ ក្រាម',
    };
  }
  if (kh.includes('ត្រកួន') || en.includes('water spinach') || en.includes('morning glory')) {
    return {
      mainKh: 'ត្រកួនខ្ចីបេះកង់ល្មមលាងទឹកឱ្យស្អាតស្រួយ',
      mainEn: 'Young crisp water spinach (morning glory) washed and trimmed',
      amount: '៤០០ ក្រាម',
    };
  }
  if (kh.includes('ខាត់ណា') || en.includes('broccoli') || en.includes('gai lan')) {
    return {
      mainKh: 'ខាត់ណាខ្ចីសកសំបកគល់ចាស់ចេញលាងទឹកឱ្យស្រួយ និងសាច់គោផុយ',
      mainEn: 'Crisp tender Chinese broccoli stems & leaves with sliced beef',
      amount: '៤៥០ ក្រាម',
    };
  }
  if (kh.includes('ម្រះ') && !kh.includes('ម្រះព្រៅ')) {
    return {
      mainKh: 'ផ្លែម្រះស្រស់ឆ្កៀលគ្រាប់លាងទឹកអំបិល និងសាច់ជ្រូកចិញ្ច្រាំលាយមីសួរ',
      mainEn: 'Fresh bitter melon cored and stuffed with seasoned minced pork & glass noodles',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('ផ្សិត') || en.includes('mushroom') || en.includes('enoki')) {
    return {
      mainKh: 'ផ្សិតស្រស់ធម្មជាតិកាត់គល់លាងទឹកសម្អាតថ្នមៗ',
      mainEn: 'Fresh edible mushrooms trimmed and gently rinsed',
      amount: '៣៥០ ក្រាម',
    };
  }
  if (kh.includes('តៅហ៊ូ') || en.includes('tofu')) {
    return {
      mainKh: 'តៅហ៊ូស្រស់ហាន់ជាដុំបួនជ្រុងល្មម និងសាច់ជ្រូកចិញ្ច្រាំ',
      mainEn: 'Fresh soft or firm tofu cubed with minced pork',
      amount: '៤០០ ក្រាម',
    };
  }
  if (kh.includes('ទំពាំង') || en.includes('bamboo shoot')) {
    return {
      mainKh: 'ទំពាំងស្រស់ ឬទំពាំងជ្រក់ខ្មែរហាន់ស្តើងស្ងោរជម្រះជាតិហាង',
      mainEn: 'Fresh or pickled bamboo shoots thinly sliced and parboiled tender',
      amount: '៤០០ ក្រាម',
    };
  }
  if (kh.includes('ត្រប់') || en.includes('eggplant')) {
    return {
      mainKh: 'ត្រប់វែង ឬត្រប់ស្រួយស្រស់លាងស្អាតកាត់ដុំល្មម',
      mainEn: 'Fresh Cambodian eggplants washed and cut into pieces',
      amount: '៤០០ ក្រាម',
    };
  }
  if (kh.includes('ល្ពៅ') || en.includes('pumpkin')) {
    return {
      mainKh: 'ផ្លែល្ពៅខ្មែរសាច់ស្អិតផ្អែមឈ្ងុយធម្មជាតិ',
      mainEn: 'Sweet creamy Cambodian heirloom pumpkin',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('ត្រាវ') || en.includes('taro')) {
    return {
      mainKh: 'មើមត្រាវខ្មែរសាច់ផុសឈ្ងុយចិតសំបកហាន់ដុំល្មម',
      mainEn: 'Fragrant Cambodian taro root peeled and cubed',
      amount: '៤៥០ ក្រាម',
    };
  }
  if (kh.includes('មីសួរ') || en.includes('glass noodle')) {
    return {
      mainKh: 'មីសួរត្រាំទឹកឱ្យទន់ស្រុះឆ្អិនល្មម លាយបង្គាស្រស់ និងសាច់ជ្រូកចិញ្ច្រាំ',
      mainEn: 'Springy blanched glass noodles with fresh prawns and minced pork',
      amount: '៣៥០ ក្រាម',
    };
  }

  // 5. Cakes, Desserts, Fruits & Beverages
  if (kh.includes('ត្នោត') || en.includes('palm')) {
    return {
      mainKh: 'សាច់ត្នោតខ្ចី ឬទឹកត្នោតផ្អែមខ្មែរធម្មជាតិស្រស់ថ្មីៗ',
      mainEn: 'Fresh young Cambodian sugar palm fruit or pure sweet palm nectar',
      amount: '៤០០ ក្រាម',
    };
  }
  if (kh.includes('ចេក') || en.includes('banana')) {
    return {
      mainKh: 'ចេកណាំវ៉ាទុំល្មមសាច់ស្វិតផ្អែមឈ្ងុយ',
      mainEn: 'Ripe sweet Cambodian Namwa bananas',
      amount: '៦ ផ្លែ',
    };
  }
  if (kh.includes('ស្វាយ') || en.includes('mango')) {
    return {
      mainKh: kh.includes('ទុំ') || kh.includes('ដំណើប') || en.includes('sticky')
        ? 'ស្វាយកែវរមៀតទុំផ្អែមឈ្ងុយ និងអង្ករដំណើបខ្មែរ'
        : 'ស្វាយខ្ចីជូរស្រួយឈូសជាសរសៃល្មម',
      mainEn: kh.includes('ទុំ') || kh.includes('ដំណើប') || en.includes('sticky')
        ? 'Sweet ripe Keo Romeat mangoes and fragrant glutinous rice'
        : 'Crisp shredded tart green mango',
      amount: '៤០០ ក្រាម',
    };
  }
  if (kh.includes('ល្ហុង') || en.includes('papaya')) {
    return {
      mainKh: 'ល្ហុងខ្ចីស្រួយឈូសជាសរសៃវែងៗត្រាំទឹកកកឱ្យស្រួយ',
      mainEn: 'Crisp julienned green papaya chilled until crunchy',
      amount: '៤០០ ក្រាម',
    };
  }
  if (kh.includes('ពោត') || en.includes('corn')) {
    return {
      mainKh: 'ពោតដំណើប ឬពោតផ្អែមស្រស់ចិតយកគ្រាប់ខ្ចីៗ',
      mainEn: 'Fresh sweet or waxy Cambodian corn kernels',
      amount: '៤០០ ក្រាម',
    };
  }
  if (kh.includes('សណ្តែក') || en.includes('bean') || en.includes('soy')) {
    return {
      mainKh: 'គ្រាប់សណ្តែកខ្មែរជ្រើសរើសថ្មីលាងត្រាំទឹកឱ្យទន់ល្អ',
      mainEn: 'Selected wholesome beans soaked and washed clean',
      amount: '៣០០ ក្រាម',
    };
  }

  return {
    mainKh: `គ្រឿងផ្សំស្រស់ៗតាមរូបមន្ត ${rawKh || 'ម្ហូបខ្មែរ'}`,
    mainEn: `Fresh authentic ingredients for ${nameEn || rawKh || 'this dish'}`,
    amount: '៤៥០ ក្រាម',
  };
}

export function generateAuthenticRecipeByDishName(
  nameKh: string,
  nameEn: string = '',
  categorySlug: string = 'specialty',
  existingDescriptionKh: string = ''
): GeneratedRecipeResult {
  const kh = (nameKh || '').trim() || 'ម្ហូបខ្មែរ';
  const normKh = normalizeKhmerFoodText(kh) || kh;
  const en = (nameEn || '').trim() || kh;
  const cat = (categorySlug || 'specialty').toLowerCase();
  const main = detectMainIngredient(kh, en);

  // 1. STEAMED PRAHOK / PHA-OK / MAM & FERMENTED KHMER DIPS (ប្រហុកចំហុយ, ផ្អកចំហុយ, ម៉ាំចំហុយ, ប្រហុកខ្ទិះ, ប្រហុកដុត, ទឹកគ្រឿង, កាពិផាវ)
  if (
    /ប្រហុកចំហុយ|ចំហុយប្រហុក|ផ្អកចំហុយ|ចំហុយផ្អក|ម៉ាំចំហុយ|ចំហុយម៉ាំ|ប្រហុកកប់|ប្រហុកដុត|ប្រហុកអាំង/i.test(normKh) ||
    (/ប្រហុក|ផ្អក|ម៉ាំ/.test(normKh) && !/សម្ល|ស្ងោរ|ស៊ុប/.test(normKh) && !/ខ្ទិះ/.test(normKh))
  ) {
    const isRoasted = /ដុត|អាំង|កប់/.test(normKh);
    const fermentedLabelKh = normKh.includes('ផ្អក') ? 'ផ្អកត្រីខ្មែរ' : normKh.includes('ម៉ាំ') ? 'ម៉ាំត្រីខ្មែរ' : 'ប្រហុកសាច់ខ្មែរសុទ្ធ';
    const fermentedLabelEn = normKh.includes('ផ្អក') ? 'Cambodian Pha-ok fermented fish' : normKh.includes('ម៉ាំ') ? 'Cambodian Mam fermented fish' : 'authentic boneless Cambodian Prahok';

    const ingredients: FoodIngredient[] = [
      {
        nameKh: `${fermentedLabelKh}ចិញ្ច្រាំម៉ត់ល្អ`,
        nameEn: `Finely minced ${fermentedLabelEn}`,
        amount: '១៥០ ក្រាម',
      },
      {
        nameKh: 'សាច់ជ្រូកបីជាន់ជាប់ខ្លាញ់តិចៗចិញ្ច្រាំម៉ត់',
        nameEn: 'Finely minced marbled pork belly',
        amount: '២៥០ ក្រាម',
      },
      {
        nameKh: 'ពងទាខ្មែរស្រស់ (វាយលាយក្នុងសាច់ និងទុកផ្នែកក្រហម ១ គ្រាប់លាបពីលើ)',
        nameEn: 'Fresh duck eggs (beaten into mixture, reserving 1 yolk for golden glaze)',
        amount: '៣ គ្រាប់',
      },
      {
        nameKh: 'គល់ស្លឹកគ្រៃ ខ្ទឹមស ខ្ទឹមក្រហម ខ្ញី ស្លឹកក្រូចសើចហាន់ឆ្មារៗ និងស្ករត្នោតខ្មែរ',
        nameEn: 'Finely minced lemongrass, garlic, shallots, julienned ginger, kaffir lime leaves & palm sugar',
        amount: '៣ ស្លាបព្រាបាយ',
      },
      {
        nameKh: 'ម្ទេសស្រស់ និងបន្លែអន្លក់ស្រស់គ្រប់មុខ (ត្រសក់ ត្រប់ស្រួយ ស្ពៃក្តោប សណ្តែកគួរ ពពាយ)',
        nameEn: 'Fresh bird-eye chilies and crisp Cambodian crudités (cucumber, Thai eggplant, cabbage, long beans)',
        amount: '១ ថាសធំ',
      },
    ];
    const steps: FoodStep[] = [
      {
        stepNumber: 1,
        instructionKh: `ចិញ្ច្រាំ ${fermentedLabelKh} ជាមួយសាច់ជ្រូកបីជាន់ គល់ស្លឹកគ្រៃ ខ្ទឹមស និងខ្ទឹមក្រហមឱ្យម៉ត់ចូលគ្នាសព្វល្អ។`,
        instructionEn: `Mince the ${fermentedLabelEn} together with pork belly, lemongrass, garlic, and shallots until smooth and well blended.`,
      },
      {
        stepNumber: 2,
        instructionKh: 'ដាក់ល្បាយចូលក្នុងចានគោមធន់កំដៅ បន្ថែមស្ករត្នោតខ្មែរ ខ្ញីហាន់ឆ្មារ ស្លឹកក្រូចសើច និងវាយពងទាចូល (ទុកពងក្រហម ១ លាបពីលើ) រួចកូរវាយឱ្យឡើងទន់ស្មើសាច់។',
        instructionEn: 'Transfer to a heatproof porcelain bowl, mix in palm sugar, julienned ginger, kaffir lime leaves, and beaten duck eggs until fluffy.',
      },
      {
        stepNumber: 3,
        instructionKh: isRoasted
          ? 'ខ្ចប់ស្លឹកចេកឱ្យជិតល្អ រួចដាក់អាំង ឬដុតលើរងើកភ្លើងតិចៗប្រមាណ ២០ នាទីរហូតដល់ឆ្អិនឈ្ងុយស្លឹកចេក និងគ្រឿងស្លឹកគ្រៃ។'
          : 'ដាក់ចំហុយក្នុងឆ្នាំងឡាំងសឹងទឹកពុះរយៈពេល ២០ នាទី រួចបើកគម្របលាបពងទាក្រហមពីលើ រោយម្ទេសស្រស់ និងស្លឹកក្រូចសើច ចំហុយបន្ត ៥ នាទីឱ្យឡើងពណ៌មាសស្អាត។',
        instructionEn: isRoasted
          ? 'Wrap tightly in banana leaves and roast slowly over glowing charcoal for 20 minutes until fragrant and cooked through.'
          : 'Steam over boiling water for 20 minutes, brush the reserved duck egg yolk on top, garnish with chilies and kaffir lime strips, and steam 5 more minutes until golden.',
      },
      {
        stepNumber: 4,
        instructionKh: `លើក "${kh}" ចេញពីឡាំងសឹង ទទួលទានក្តៅៗជាមួយបាយស និងផ្ទាប់បន្លែអន្លក់ស្រស់ៗគ្រប់មុខដ៏ឈ្ងុយឆ្ងាញ់។`,
        instructionEn: `Serve "${en}" piping hot alongside steamed jasmine rice and a platter of crisp fresh Cambodian vegetables.`,
      },
    ];
    return {
      ingredients,
      steps,
      descriptionKh:
        existingDescriptionKh ||
        `${kh} ជាម្ហូបខ្មែរដ៏ល្បីល្បាញ ផ្សំពី ${fermentedLabelKh} ចិញ្ច្រាំលាយសាច់ជ្រូកបីជាន់ ពងទា គល់ស្លឹកគ្រៃ និងស្លឹកក្រូចសើច ចំហុយឡើងពណ៌មាសឈ្ងុយឆ្ងាញ់ ញ៉ាំផ្ទាប់បន្លែអន្លក់ស្រស់។`,
      descriptionEn: `${en} crafted from savory ${fermentedLabelEn}, minced pork belly, duck eggs, lemongrass, and kaffir lime leaves steamed to golden perfection and served with crisp crudités.`,
    };
  }

  // 1B. PRAHOK KTIS / TEUK KROEUNG / KAPI PHAV (ប្រហុកខ្ទិះ, ទឹកគ្រឿង, កាពិផាវ)
  if (/ប្រហុកខ្ទិះ|ទឹកគ្រឿង|កាពិផាវ|ទឹកកាពិ/.test(normKh)) {
    const isTeukKroeung = normKh.includes('ទឹកគ្រឿង');
    const ingredients: FoodIngredient[] = [
      { nameKh: main.mainKh, nameEn: main.mainEn, amount: main.amount },
      {
        nameKh: isTeukKroeung
          ? 'ប្រហុកឆ្អិនជ្រុំយកទឹកថ្លា ខ្ទឹមស ម្ទេសខ្មាំង និងទឹកក្រូចឆ្មារស្រស់'
          : 'គ្រឿងបុកខ្មែរ ខ្ទិះដូងដើមខាប់ ម្ទេសឆ្អើរចិញ្ច្រាំ និងត្រប់ពុតលំញង',
        nameEn: isTeukKroeung
          ? 'Simmered strained prahok broth, pounded garlic, bird-eye chilies, and fresh lime juice'
          : 'Pounded Khmer kroeung paste, rich coconut cream, red chili paste, and pea eggplants',
        amount: '១ ចានតូច',
      },
      {
        nameKh: 'ស្ករត្នោតខ្មែរ ទឹកត្រី និងសណ្តែកដីលីងបុក (តាមចំណូលចិត្ត)',
        nameEn: 'Cambodian palm sugar, fish sauce, and crushed roasted peanuts',
        amount: '២ ស្លាបព្រាបាយ',
      },
      {
        nameKh: 'បន្លែអន្លក់ស្រស់ និងស្រុះ (ត្រសក់ ត្រកួន ស្ពៃក្តោប ផ្កាស្នោ ត្រួយអំពិល ពពាយ)',
        nameEn: 'Assorted crisp & blanched Cambodian crudités (cucumber, cabbage, water spinach,winged beans)',
        amount: '១ ថាសធំ',
      },
    ];
    const steps: FoodStep[] = [
      {
        stepNumber: 1,
        instructionKh: isTeukKroeung
          ? 'ស្ងោរសាច់ត្រីឱ្យឆ្អិន រួចបេះយកតែសាច់សុទ្ធបុកក្នុងត្បាល់ឱ្យឡើងសរសៃទន់ល្មើយ។'
          : 'ដាក់ខ្ទិះដូងដើមក្នុងខ្ទះរម្ងាស់ឱ្យបែកប្រេង រួចដាក់គ្រឿងបុក និងម្ទេសឆ្អើរចូលឆាឱ្យឡើងក្លិនឈ្ងុយក្រហមស្អាត។',
        instructionEn: isTeukKroeung
          ? 'Poach the fresh fish until cooked, remove all bones, and pound gently in a mortar until fluffy.'
          : 'Simmer thick coconut cream until oil separates, then sauté pounded kroeung and chili paste until fragrant.',
      },
      {
        stepNumber: 2,
        instructionKh: isTeukKroeung
          ? 'បុកខ្ទឹមស និងម្ទេស រួចដាក់សាច់ត្រី ទឹកប្រហុកឆ្អិន ស្ករត្នោត និងទឹកក្រូចឆ្មារ កូរឱ្យចូលជាតិជូរប្រៃផ្អែមហឹរមុត។'
          : `ដាក់ ${main.mainKh} និងត្រប់ពុតលំញងចូលឆាជាមួយខ្ទិះដូង និងស្ករត្នោត រម្ងាស់ឱ្យខាប់ឈ្ងុយល្មម។`,
        instructionEn: isTeukKroeung
          ? 'Pound garlic and chilies, fold in the flaked fish, simmered prahok broth, palm sugar, and fresh lime juice.'
          : `Add ${main.mainEn} and pea eggplants, simmering in coconut cream and palm sugar until rich and thick.`,
      },
      {
        stepNumber: 3,
        instructionKh: 'រៀបចំលាងសម្អាត និងស្រុះបន្លែអន្លក់គ្រប់មុខ រៀបដាក់ថាសឱ្យមានសោភ័ណភាពគួរឱ្យចង់ទទួលទាន។',
        instructionEn: 'Wash and arrange fresh and lightly blanched seasonal vegetables neatly on a serving platter.',
      },
      {
        stepNumber: 4,
        instructionKh: `ដួស "${kh}" ដាក់ចានគោម រោយសណ្តែកដី ឬស្លឹកក្រូចសើចហាន់ឆ្មារ ទទួលទានផ្ទាប់ជាមួយបន្លែអន្លក់ និងបាយសក្តៅៗ។`,
        instructionEn: `Transfer "${en}" to a serving bowl, garnish, and enjoy with fresh crudités and warm jasmine rice.`,
      },
    ];
    return {
      ingredients,
      steps,
      descriptionKh:
        existingDescriptionKh ||
        `${kh} ជាមុខម្ហូបជ្រលក់បុរាណខ្មែរដ៏ឈ្ងុយឆ្ងាញ់ ទទួលទានផ្ទាប់ជាមួយបន្លែអន្លក់ធម្មជាតិស្រស់ៗគ្រប់មុខ។`,
      descriptionEn: `${en}, an iconic Cambodian savory dip served with an abundant platter of crisp fresh seasonal vegetables.`,
    };
  }

  // 2. STEAMED / AMOK / CLAYPOT BAKED DISHES (ចំហុយ, អប់, អាម៉ុក)
  if (/អាម៉ុក|ចំហុយ|អប់/.test(normKh) && cat !== 'dessert' && cat !== 'cake') {
    const isAmok = normKh.includes('អាម៉ុក');
    const ingredients: FoodIngredient[] = [
      { nameKh: main.mainKh, nameEn: main.mainEn, amount: main.amount },
      {
        nameKh: isAmok
          ? 'គ្រឿងបុកអាម៉ុកខ្មែរ ខ្ទិះដូងដើមខាប់ ពងទា ១ គ្រាប់ និងស្លឹកញខ្ចី'
          : 'ខ្ញីហាន់សរសៃឆ្មារ គល់ស្លឹកគ្រៃ ខ្ទឹមសបំពង និងស្លឹកខ្ទឹមជីរវ៉ាន់ស៊ុយ',
        nameEn: isAmok
          ? 'Pounded Khmer Amok kroeung, thick coconut cream, duck egg, and young noni leaves'
          : 'Julienned fresh ginger, lemongrass, garlic, scallions, and fresh cilantro',
        amount: '១ ចានតូច',
      },
      {
        nameKh: isAmok
          ? 'ទឹកត្រី ស្ករត្នោតខ្មែរ និងស្លឹកក្រូចសើចហាន់ឆ្មារៗ'
          : 'ទឹកស៊ីអ៊ីវពិសេស ប្រេងខ្យង ប្រេងល្ង ស្ករត្នោត និងម្រេចកំពត (ឬទឹកក្រូចឆ្មារម្ទេស)',
        nameEn: isAmok
          ? 'Fish sauce, Cambodian palm sugar, and finely julienned kaffir lime leaves'
          : 'Light soy sauce, oyster sauce, sesame oil, palm sugar, and Kampot pepper (or chili-lime dressing)',
        amount: '៣ ស្លាបព្រាបាយ',
      },
      {
        nameKh: 'ម្ទេសក្រហមហាន់ឆ្មារ និងបន្លែស្រស់តុបតែងពីលើ',
        nameEn: 'Sliced red chili threads and fresh aromatic herbs for garnish',
        amount: '១ ក្តាប់តូច',
      },
    ];
    const steps: FoodStep[] = [
      {
        stepNumber: 1,
        instructionKh: `លាងសម្អាត ${main.mainKh} ឱ្យស្អាតជ្រះក្លិនឆ្អាប រួចរៀបដាក់ចានចំហុយ ឆ្នាំងដី ឬកន្ទោងស្លឹកចេក។`,
        instructionEn: `Clean ${main.mainEn} thoroughly and arrange in a steaming dish, claypot, or banana-leaf cup.`,
      },
      {
        stepNumber: 2,
        instructionKh: isAmok
          ? 'កូរគ្រឿងបុកអាម៉ុកជាមួយខ្ទិះដូង ពងទា ទឹកត្រី និងស្ករត្នោតឱ្យរលាយសព្វ រួចចាក់លាយជាមួយសាច់លើទ្រនាប់ស្លឹកញ។'
          : 'លាយទឹកជ្រលក់ចំហុយ (ទឹកស៊ីអ៊ីវ ប្រេងខ្យង ស្ករត្នោត ប្រេងល្ង ខ្ទឹមស និងខ្ញីហាន់សរសៃ) ស្រោចពីលើឱ្យសព្វល្អ។',
        instructionEn: isAmok
          ? 'Whisk the kroeung paste with coconut cream, egg, fish sauce, and palm sugar, then fold with the protein over noni leaves.'
          : 'Combine the aromatic steaming sauce with julienned ginger and garlic, and spoon evenly over the dish.',
      },
      {
        stepNumber: 3,
        instructionKh: 'ដាក់ចំហុយក្នុងឡាំងសឹងទឹកពុះក្តៅខ្លាំងរយៈពេល ១៥-២០ នាទី រហូតដល់ឆ្អិនទន់ផុយ និងជ្រាបក្លិនគ្រឿងឈ្ងុយពេញសាច់។',
        instructionEn: 'Steam vigorously over boiling water for 15-20 minutes until tender, succulent, and infused with aromatics.',
      },
      {
        stepNumber: 4,
        instructionKh: isAmok
          ? `បន្ថែមក្បាលខ្ទិះដូងបន្តិច ស្លឹកក្រូចសើច និងម្ទេសក្រហមហាន់ឆ្មារពីលើ រួចទទួលទាន "${kh}" ក្តៅៗជាមួយបាយស។`
          : `រោយស្លឹកខ្ទឹម ជីរវ៉ាន់ស៊ុយ ម្រេចកំពត និងម្ទេសស្រស់ពីលើ រួចលើក "${kh}" ទទួលទានក្តៅៗភ្លាមៗ។`,
        instructionEn: `Top with fresh aromatic herbs and sliced red chili, and serve "${en}" piping hot.`,
      },
    ];
    return {
      ingredients,
      steps,
      descriptionKh:
        existingDescriptionKh ||
        `${kh} ចម្អិនដោយវិធីចំហុយក្តៅៗរក្សារសជាតិផ្អែមធម្មជាតិពី ${main.mainKh} លាយក្លិនគ្រឿងក្រអូបឈ្ងុយឆ្ងាញ់។`,
      descriptionEn: `${en} freshly steamed to preserve the natural sweetness of ${main.mainEn} with fragrant Cambodian herbs.`,
    };
  }

  // 3. SALAD / NHOAM / PLEAH / BOK (ញាំ, ភ្លា, បុក)
  if (
    cat === 'salad' ||
    /(?:ញាំ|ញ៉ាំ)|ភ្លា|បុក/.test(normKh)
  ) {
    const ingredients: FoodIngredient[] = [
      { nameKh: main.mainKh, nameEn: main.mainEn, amount: main.amount },
      {
        nameKh: 'ខ្ទឹមបារាំងហាន់ស្តើង ប៉េងប៉ោះ ត្រសក់ ឬល្ហុង/ស្វាយឈូសស្រួយ',
        nameEn: 'Thinly sliced onion, wedges of tomato, cucumber, or crisp shredded green papaya/mango',
        amount: '១ ចានធំ',
      },
      {
        nameKh: 'ទឹកត្រីកោះកុង (ទឹកត្រី ទឹកក្រូចឆ្មារស្រស់ ស្ករត្នោត ខ្ទឹមស និងម្ទេសបុក)',
        nameEn: 'Zesty Koh Kong dressing (fish sauce, fresh lime juice, palm sugar, pounded garlic & chili)',
        amount: '៤ ស្លាបព្រាបាយ',
      },
      {
        nameKh: 'ស្លឹកជីរគ្រប់មុខ (ជីរអង្កាម ជីររណារ ជីរនាងវង ស្លឹកខ្ទឹម)',
        nameEn: 'Assorted fresh Khmer herbs (mint, culantro, sweet basil, scallions)',
        amount: '១ ក្តាប់ធំ',
      },
      {
        nameKh: 'សណ្តែកដីលីងបុក និងខ្ទឹមក្រហមបំពងស្រួយ',
        nameEn: 'Crushed roasted peanuts and crispy fried shallots',
        amount: '៣ ស្លាបព្រាបាយ',
      },
    ];
    const steps: FoodStep[] = [
      {
        stepNumber: 1,
        instructionKh: `រៀបចំលាងសម្អាត និងចម្អិន/ស្រុះ ${main.mainKh} ឱ្យឆ្អិនស្រួយល្អ រួចសម្រស់ទឹកឱ្យស្ងួត។`,
        instructionEn: `Clean and prepare ${main.mainEn} until tender-crisp, then drain well.`,
      },
      {
        stepNumber: 2,
        instructionKh: 'លាយទឹកញាំរសជាតិដើមដោយបុកខ្ទឹមស និងម្ទេសខ្មាំង លាយជាមួយទឹកត្រី ស្ករត្នោត និងទឹកក្រូចឆ្មារស្រស់ កូរឱ្យរលាយចូលគ្នាជូរប្រៃផ្អែមហឹរមុត។',
        instructionEn: 'Prepare the signature dressing by pounding garlic and bird-eye chilies with fish sauce, palm sugar, and fresh lime juice.',
      },
      {
        stepNumber: 3,
        instructionKh: `ដាក់ ${main.mainKh} ចូលក្នុងចានធំ បន្ថែមខ្ទឹមបារាំង ប៉េងប៉ោះ បន្លែស្រួយ និងស្រោចទឹកញាំពីលើ រួចច្របល់ថ្នមៗឱ្យចូលជាតិសព្វ។`,
        instructionEn: `Combine ${main.mainEn} with sliced onions, tomatoes, and crisp vegetables in a mixing bowl, pour over the dressing, and toss gently.`,
      },
      {
        stepNumber: 4,
        instructionKh: `បង់ស្លឹកជីរគ្រប់មុខ រៀបដាក់ចាន រោយសណ្តែកដីលីងបុក និងខ្ទឹមបំពងពីលើ រួចទទួលទាន "${kh}" ភ្លាមៗ។`,
        instructionEn: `Fold in fresh herbs, plate neatly, top with crushed roasted peanuts and crispy shallots, and serve "${en}" fresh.`,
      },
    ];
    return {
      ingredients,
      steps,
      descriptionKh:
        existingDescriptionKh ||
        `${kh} ជាមុខម្ហូបញាំ/ភ្លាដ៏ឈ្ងុយឆ្ងាញ់ ផ្សំពី ${main.mainKh} លាយជាមួយស្លឹកជីរគ្រប់មុខ សណ្តែកដីបុក និងទឹកត្រីកោះកុងជូរហឹរមុត។`,
      descriptionEn: `${en} prepared with ${main.mainEn}, fresh Cambodian herbs, roasted peanuts, and zesty lime-chili dressing.`,
    };
  }

  // 4. RICE DISHES, FRIED RICE & PORRIDGE (បាយឆា, បាយ, បបរ)
  if (
    cat === 'rice' ||
    (/^បាយ|^បបរ/.test(normKh) && !/បាយដំណើបស្វាយ|បបរត្នោត|បបរត្រាវ|បបរសណ្តែក|បបរពោត/.test(normKh))
  ) {
    const isPorridge = normKh.includes('បបរ');
    const isFriedRice = normKh.includes('បាយឆា');
    const ingredients: FoodIngredient[] = [
      { nameKh: main.mainKh, nameEn: main.mainEn, amount: main.amount },
      {
        nameKh: isPorridge
          ? 'អង្ករផ្កាម្លិះខ្មែរថ្មីលាងស្អាត និងទឹកស៊ុបរំងាស់ឆ្អឹងផ្អែមថ្លា'
          : 'បាយអង្ករផ្កាម្លិះខ្មែរដាំឆ្អិនគ្រាប់រាយស្អាតទន់ឈ្ងុយ',
        nameEn: isPorridge
          ? 'Washed Cambodian jasmine rice and rich slow-simmered bone broth'
          : 'Fluffy cooked Cambodian fragrant jasmine rice',
        amount: isPorridge ? '១.៥ កំប៉ុង (ទឹកស៊ុប ១.៥ លីត្រ)' : '២ ចានគោមធំ',
      },
      {
        nameKh: isPorridge
          ? 'ខ្ញីខ្ចីហាន់សរសៃឆ្មារ ខ្ទឹមសបំពង និងឆៃប៉ូវ/សណ្តែកបណ្តុះ'
          : 'ពងមាន់/ពងទា ២ គ្រាប់ ខ្ទឹមសចិញ្ច្រាំ និងបន្លែផ្សំ (ការ៉ុត សណ្តែក ឬជ្រក់ល្ហុងត្រសក់)',
        nameEn: isPorridge
          ? 'Julienned young ginger, crispy fried garlic, and bean sprouts'
          : 'Fresh eggs, minced garlic, and seasonal diced vegetables or Cambodian pickles',
        amount: '១ ចានតូច',
      },
      {
        nameKh: 'ទឹកត្រី ទឹកស៊ីអ៊ីវ ប្រេងខ្យង ស្ករត្នោតបន្តិច និងម្រេចកំពតម៉ត់',
        nameEn: 'Fish sauce, soy sauce, oyster sauce, a touch of palm sugar, and ground Kampot pepper',
        amount: '២.៥ ស្លាបព្រាបាយ',
      },
      {
        nameKh: 'ស្លឹកខ្ទឹម ជីរវ៉ាន់ស៊ុយ ម្ទេសស្រស់ និងក្រូចឆ្មារ',
        nameEn: 'Chopped scallions, fresh cilantro, chilies, and lime wedges',
        amount: '១ ក្តាប់តូច',
      },
    ];
    const steps: FoodStep[] = isPorridge
      ? [
          {
            stepNumber: 1,
            instructionKh: `លាងអង្ករផ្កាម្លិះឱ្យស្អាត ដាក់រម្ងាស់ជាមួយទឹកស៊ុបរហូតដល់គ្រាប់អង្កររីកទន់រលោងល្អ ព្រមទាំងរៀបចំ ${main.mainKh} ទុកឱ្យរួចរាល់។`,
            instructionEn: `Rinse the jasmine rice and simmer gently in bone broth until soft and velvety while preparing ${main.mainEn}.`,
          },
          {
            stepNumber: 2,
            instructionKh: `ដាក់ ${main.mainKh} ចូលក្នុងឆ្នាំងបបរ (ឬឆាគ្រឿងខ្ទឹមសជាមុនបន្តិចឱ្យឈ្ងុយ) រម្ងាស់ឱ្យឆ្អិនចេញជាតិផ្អែមឆ្ងាញ់។`,
            instructionEn: `Add ${main.mainEn} into the simmering rice porridge and cook until tender and flavorful.`,
          },
          {
            stepNumber: 3,
            instructionKh: 'ផ្សំរសជាតិដោយទឹកត្រី អំបិល និងស្ករត្នោតបន្តិច ភ្លក្សឱ្យល្មមឆ្ងាញ់។',
            instructionEn: 'Season gently with fish sauce, salt, and a pinch of palm sugar to taste.',
          },
          {
            stepNumber: 4,
            instructionKh: `ដួស "${kh}" ដាក់ចានគោមក្តៅៗ រោយខ្ញីហាន់ឆ្មារ ខ្ទឹមសបំពង ស្លឹកខ្ទឹម ជីរវ៉ាន់ស៊ុយ និងម្រេចកំពត ទទួលទានជាមួយក្រូចឆ្មារ។`,
            instructionEn: `Ladle "${en}" into warm bowls, top with julienned ginger, crispy garlic, herbs, and Kampot pepper, and serve.`,
          },
        ]
      : [
          {
            stepNumber: 1,
            instructionKh: `រៀបចំលាងសម្អាត និងហាន់/ប្រឡាក់ ${main.mainKh} ជាមួយខ្ទឹមស ទឹកត្រី និងម្រេចកំពតឱ្យចូលជាតិឈ្ងុយ។`,
            instructionEn: `Clean and season ${main.mainEn} with garlic, fish sauce, and Kampot black pepper.`,
          },
          {
            stepNumber: 2,
            instructionKh: isFriedRice
              ? 'ដាក់ខ្ទះឆាប្រេងឱ្យក្តៅ បំពងខ្ទឹមសឱ្យឈ្ងុយ ដាក់សាច់ និងពងមាន់ចូលឆាឱ្យឆ្អិន រួចចាក់បាយផ្កាម្លិះចូលឆាត្រឡប់លើភ្លើងខ្លាំងឱ្យគ្រាប់បាយលោតឈ្ងុយខ្ទះ។'
              : 'ចម្អិនសាច់ដោយអាំង ឬចៀន/ខឱ្យឆ្អិនឡើងពណ៌មាសឈ្ងុយ រួចដាំបាយអង្ករផ្កាម្លិះខ្មែរឱ្យឆ្អិនទន់ក្រអូប។',
            instructionEn: isFriedRice
              ? 'Heat a wok over high flame, sauté garlic, sear the protein and eggs, then toss in jasmine rice briskly until fragrant.'
              : 'Grill, pan-sear, or braise the seasoned protein until golden and tender alongside freshly steamed jasmine rice.',
          },
          {
            stepNumber: 3,
            instructionKh: isFriedRice
              ? 'ផ្សំរសជាតិដោយទឹកស៊ីអ៊ីវ ប្រេងខ្យង ទឹកត្រី និងស្ករត្នោតបន្តិច បន្ថែមបន្លែ និងស្លឹកខ្ទឹមឆាត្រឡប់ឱ្យចូលជាតិសព្វ។'
              : 'រៀបចំជ្រក់ត្រសក់/ល្ហុង ទឹកត្រីផ្អែមខ្ទឹមម្ទេស និងទឹកស៊ុបថ្លាក្តៅៗមួយចានតូចសម្រាប់ញ៉ាំអម។',
            instructionEn: isFriedRice
              ? 'Season with soy sauce, oyster sauce, fish sauce, and a pinch of sugar, tossing with vegetables and scallions.'
              : 'Prepare crisp pickled vegetables, garlic-chili fish sauce dip, and a small bowl of clear hot soup on the side.',
          },
          {
            stepNumber: 4,
            instructionKh: `ដួស "${kh}" រៀបដាក់ចាន រោយម្រេចកំពត និងជីរវ៉ាន់ស៊ុយ រួចទទួលទានក្តៅៗភ្លាមៗ។`,
            instructionEn: `Plate "${en}" neatly, garnish with Kampot pepper and fresh cilantro, and enjoy warm.`,
          },
        ];
    return {
      ingredients,
      steps,
      descriptionKh:
        existingDescriptionKh ||
        `${kh} ចម្អិនពីអង្ករផ្កាម្លិះខ្មែរក្រអូបទន់ រួមជាមួយ ${main.mainKh} និងគ្រឿងទេសឈ្ងុយឆ្ងាញ់គ្រប់មាត់។`,
      descriptionEn: `${en} crafted with fragrant Cambodian jasmine rice and ${main.mainEn}.`,
    };
  }

  // 5. GRILLED / ROASTED / FRIED CRISPY (អាំង, ដុត, បំពង, ចៀន, ងៀត, ខ្វៃ)
  if (
    cat === 'grilled' ||
    /អាំង|ដុត|បំពង|ចៀន|ងៀត|ខ្វៃ|ហាល/.test(normKh)
  ) {
    const isFried = /បំពង|ចៀន/.test(normKh);
    const ingredients: FoodIngredient[] = [
      { nameKh: main.mainKh, nameEn: main.mainEn, amount: main.amount },
      {
        nameKh: 'ខ្ទឹមសបុក ម្រេចកំពត គល់ស្លឹកគ្រៃ ឬម្ទេសអំបិលសម្រាប់ប្រឡាក់',
        nameEn: 'Crushed garlic, Kampot black pepper, lemongrass, or chili-salt marinade',
        amount: '២ ស្លាបព្រាបាយ',
      },
      {
        nameKh: 'ទឹកត្រី ប្រេងខ្យង ស្ករត្នោត ឬទឹកឃ្មុំបន្តិច',
        nameEn: 'Fish sauce, oyster sauce, palm sugar, or a touch of wild honey',
        amount: '២ ស្លាបព្រាបាយ',
      },
      {
        nameKh: 'ទឹកជ្រលក់ពិសេស (ទឹកត្រីកោះកុង / ទឹកប្រហុក / អំបិលម្រេចក្រូចឆ្មារ)',
        nameEn: 'Signature dipping sauce (Koh Kong seafood dip, prahok dip, or Kampot lime-pepper)',
        amount: '១ ចានតូច',
      },
      {
        nameKh: 'បន្លែអន្លក់ស្រស់ ជ្រក់ត្រសក់/ល្ហុង និងស្លឹកជីរ',
        nameEn: 'Crisp fresh crudités, pickled cucumber/papaya, and fresh herbs',
        amount: '១ ថាសតូច',
      },
    ];
    const steps: FoodStep[] = [
      {
        stepNumber: 1,
        instructionKh: `លាងសម្អាត ${main.mainKh} ឱ្យស្អាត ជូតសម្រស់ទឹក រួចប្រឡាក់ជាមួយខ្ទឹមស ម្រេចកំពត ទឹកត្រី ប្រេងខ្យង និងស្ករត្នោតទុក ១៥-២០ នាទីឱ្យចូលជាតិ។`,
        instructionEn: `Clean and pat dry ${main.mainEn}, then marinate with garlic, Kampot pepper, fish sauce, oyster sauce, and palm sugar for 15-20 minutes.`,
      },
      {
        stepNumber: 2,
        instructionKh: isFried
          ? 'ដាក់ប្រេងឆាក្នុងខ្ទះឱ្យក្តៅល្មម ដាក់បំពង ឬចៀនដោយប្រែសងខាងរហូតដល់ឡើងពណ៌មាសស្រួយឈ្ងុយឆ្អិនសព្វ។'
          : 'បង្កាត់ភ្លើងធ្យូងឱ្យរងើកក្តៅល្មម ដាក់អាំងប្រែសងខាងរហូតដល់ឆ្អិនក្រហមមាសឈ្ងុយ និងរក្សាជាតិផ្អែមក្នុងសាច់។',
        instructionEn: isFried
          ? 'Fry in hot oil over medium-high heat, turning evenly until golden-brown and crispy outside while juicy inside.'
          : 'Grill over glowing charcoal embers, turning evenly until smoky, caramelized outside, and tender inside.',
      },
      {
        stepNumber: 3,
        instructionKh: 'រៀបចំលាយទឹកជ្រលក់ពិសេស (ទឹកត្រីកោះកុង ទឹកប្រហុក ឬអំបិលម្រេចកំពតក្រូចឆ្មារស្រស់) ឱ្យមានរសជាតិជូរប្រៃផ្អែមហឹរមុត។',
        instructionEn: 'Prepare the accompanying dipping sauce balanced with fresh lime juice, garlic, chilies, and Kampot pepper.',
      },
      {
        stepNumber: 4,
        instructionKh: `ហាន់ ឬរៀប "${kh}" ដាក់ចាន ទទួលទានក្តៅៗផ្ទាប់ជាមួយបន្លែអន្លក់ស្រស់ ជ្រក់ និងទឹកជ្រលក់រសជាតិដើម។`,
        instructionEn: `Slice or arrange "${en}" on a platter and serve piping hot with fresh vegetables, pickles, and dipping sauce.`,
      },
    ];
    return {
      ingredients,
      steps,
      descriptionKh:
        existingDescriptionKh ||
        `${kh} ចម្អិនពី ${main.mainKh} ប្រឡាក់គ្រឿងឈ្ងុយឆ្ងាញ់ ទទួលទានជាមួយបន្លែស្រស់ និងទឹកជ្រលក់រសជាតិដើម។`,
      descriptionEn: `${en} crafted with ${main.mainEn}, seasoned with aromatic spices and served with fresh herbs and dipping sauce.`,
    };
  }

  // 6. STIR-FRY / BRAISED (ឆា, ខ, ឡុកឡាក់)
  if (
    cat === 'stirfry' ||
    /ឆា|ឡុកឡាក់/.test(normKh) ||
    /^ខ(?!្|ាត់|ួ|្យ)/.test(normKh)
  ) {
    const ingredients: FoodIngredient[] = [
      { nameKh: main.mainKh, nameEn: main.mainEn, amount: main.amount },
      {
        nameKh: 'ខ្ទឹមសចិញ្ច្រាំ ខ្ញី ស្លឹកគ្រៃ ឬគ្រឿងបុកខ្មែរតាមមុខម្ហូប',
        nameEn: 'Minced garlic, ginger, lemongrass, or traditional Khmer kroeung aromatics',
        amount: '២.៥ ស្លាបព្រាបាយ',
      },
      {
        nameKh: 'បន្លែផ្សំ (ម្ទេសផ្លោក ខ្ទឹមបារាំង ម្រះព្រៅ ឬបន្លែស្រស់)',
        nameEn: 'Accompanying vegetables (bell peppers, onion, holy basil, or seasonal greens)',
        amount: '១ ចាន',
      },
      {
        nameKh: 'ប្រេងខ្យង ទឹកត្រី ទឹកស៊ីអ៊ីវ ស្ករត្នោត និងម្រេចកំពត',
        nameEn: 'Oyster sauce, fish sauce, soy sauce, palm sugar, and Kampot black pepper',
        amount: '២ ស្លាបព្រាបាយ',
      },
      {
        nameKh: 'ស្លឹកខ្ទឹម ជីរវ៉ាន់ស៊ុយ និងម្ទេសក្រហមហាន់',
        nameEn: 'Fresh scallions, cilantro, and sliced red chilies',
        amount: '១ ក្តាប់តូច',
      },
    ];
    const steps: FoodStep[] = [
      {
        stepNumber: 1,
        instructionKh: `លាងសម្អាត និងហាន់ ${main.mainKh} ជាបន្ទះល្មម ព្រមទាំងត្រៀមគ្រឿងខ្ទឹមស និងបន្លែផ្សំទុកឱ្យរួចរាល់។`,
        instructionEn: `Clean and slice ${main.mainEn} into bite-sized pieces, and prepare the garlic aromatics and vegetables.`,
      },
      {
        stepNumber: 2,
        instructionKh: 'ដាក់ខ្ទះលើភ្លើងឱ្យក្តៅខ្លាំង ចាក់ប្រេងបំពងខ្ទឹមស និងគ្រឿងឱ្យឡើងក្លិនឈ្ងុយ រួចដាក់សាច់ចូលឆាត្រឡប់ឱ្យឆ្អិនល្មម។',
        instructionEn: 'Heat oil in a wok over high flame, sauté the garlic and aromatics until fragrant, then sear the protein.',
      },
      {
        stepNumber: 3,
        instructionKh: 'បង់បន្លែផ្សំចូល ឆាត្រឡប់ជាមួយទឹកត្រី ប្រេងខ្យង ទឹកស៊ីអ៊ីវ និងស្ករត្នោតបន្តិចឱ្យចូលជាតិឈ្ងុយខ្ទះ។',
        instructionEn: 'Toss in the vegetables and season briskly with fish sauce, oyster sauce, soy sauce, and palm sugar.',
      },
      {
        stepNumber: 4,
        instructionKh: `រោយម្រេចកំពត ស្លឹកខ្ទឹម និងស្លឹកជីរ ត្រឡប់ពីរបីត្រឡប់ រួចដួស "${kh}" ដាក់ចានទទួលទានក្តៅៗជាមួយបាយស។`,
        instructionEn: `Finish with Kampot pepper and fresh herbs, plate "${en}" piping hot, and serve with steamed jasmine rice.`,
      },
    ];
    return {
      ingredients,
      steps,
      descriptionKh:
        existingDescriptionKh ||
        `${kh} ជាមុខម្ហូបឆាដ៏ឈ្ងុយឆ្ងាញ់ ចម្អិនពី ${main.mainKh} ជាមួយគ្រឿងទេសខ្មែរ និងបន្លែស្រស់ៗ។`,
      descriptionEn: `${en} wok-tossed with ${main.mainEn}, aromatic Khmer spices, and crisp vegetables.`,
    };
  }

  // 7. NOODLES (នំបញ្ចុក, គុយទាវ, មី, លត, បាញ់កាញ់, ហ្វឺ)
  if (
    cat === 'noodles' ||
    (cat !== 'soup' &&
      !/^សម្ល|^ស្ងោរ|^ស៊ុប/.test(normKh) &&
      /នំបញ្ចុក|គុយទាវ|បាញ់កាញ់|បាញ់ស៊ុង|ហ្វឺ|មី(?!\u17D2)|លត(?!\u17D2)/.test(normKh))
  ) {
    const ingredients: FoodIngredient[] = [
      { nameKh: main.mainKh, nameEn: main.mainEn, amount: main.amount },
      {
        nameKh: 'សរសៃគុយទាវ / នំបញ្ចុក / សរសៃមីស្រស់ស្វិតល្អ',
        nameEn: 'Fresh rice noodles, rice vermicelli, or springy egg noodles',
        amount: '៥០០ ក្រាម',
      },
      {
        nameKh: 'ទឹកស៊ុបរំងាស់ឆ្អឹង ឬទឹកសម្លគ្រឿងបុកខ្មែរ',
        nameEn: 'Slow-simmered bone broth or aromatic Khmer kroeung noodle gravy',
        amount: '១.៥ លីត្រ',
      },
      {
        nameKh: 'បន្លែស្រស់ (សណ្តែកបណ្តុះ ស្លឹកគូឆាយ ត្រយូងចេក ឬត្រសក់)',
        nameEn: 'Fresh noodle greens (bean sprouts, garlic chives, banana blossom, or cucumber)',
        amount: '១ ចានធំ',
      },
      {
        nameKh: 'ខ្ទឹមសបំពង ស្លឹកខ្ទឹម ជីរវ៉ាន់ស៊ុយ ម្រេចកំពត និងក្រូចឆ្មារ',
        nameEn: 'Crispy fried garlic, scallions, cilantro, Kampot pepper, and fresh lime',
        amount: '១ ចានតូច',
      },
    ];
    const steps: FoodStep[] = [
      {
        stepNumber: 1,
        instructionKh: `រៀបចំលាងសម្អាត ${main.mainKh} និងបន្លែស្រស់គ្រប់មុខទុកឱ្យមានអនាម័យល្អ។`,
        instructionEn: `Clean and prepare ${main.mainEn} along with all fresh accompanying greens and herbs.`,
      },
      {
        stepNumber: 2,
        instructionKh: 'ដាំទឹកស៊ុប ឬទឹកសម្លគ្រឿងឱ្យពុះឈ្ងុយ រម្ងាស់ឱ្យចេញជាតិផ្អែមឆ្ងាញ់ និងផ្សំរសជាតិដោយទឹកត្រី ស្ករត្នោត និងអំបិល។',
        instructionEn: 'Simmer the broth or aromatic noodle gravy until rich and fragrant, seasoning with fish sauce, palm sugar, and salt.',
      },
      {
        stepNumber: 3,
        instructionKh: 'ស្រុះសរសៃគុយទាវ/មី ឬរៀបនំបញ្ចុក និងបន្លែដាក់ចូលចានគោម រួចរៀបសាច់ពីលើ។',
        instructionEn: 'Blanch or arrange the noodles and crisp vegetables in serving bowls and top with the cooked protein.',
      },
      {
        stepNumber: 4,
        instructionKh: `ដួសទឹកស៊ុបក្តៅៗស្រោចពីលើ រោយខ្ទឹមសបំពង ស្លឹកខ្ទឹម និងម្រេចកំពត រួចទទួលទាន "${kh}" ភ្លាមៗ។`,
        instructionEn: `Ladle boiling broth over top, garnish with crispy garlic, scallions, and Kampot pepper, and serve "${en}" hot.`,
      },
    ];
    return {
      ingredients,
      steps,
      descriptionKh:
        existingDescriptionKh ||
        `${kh} ជាមុខម្ហូបសរសៃដ៏ពេញនិយម ចម្អិនជាមួយ ${main.mainKh} ទឹកស៊ុបឈ្ងុយឆ្ងាញ់ និងបន្លែស្រស់។`,
      descriptionEn: `${en} served with ${main.mainEn}, aromatic broth, and crisp fresh herbs.`,
    };
  }

  // 8. BEVERAGES, ICED COFFEE, TEA & SMOOTHIES (ភេសជ្ជៈ, កាហ្វេ, តែគុជ, ម៉ាត់ឆា, ទឹកក្រឡុក, ទឹកអំពៅ, ទឹកត្នោត)
  if (
    cat === 'drink' ||
    /កាហ្វេ|តែគុជ|តែក្រូច|តែបៃតង|ម៉ាត់ឆា|ទឹកក្រឡុក|ទឹកអំពៅ|ទឹកត្នោត|ទឹកដូង|ទឹកសណ្តែក|ភេសជ្ជៈ|coffee|latte|matcha|boba|bubble\s*tea|smoothie|juice/i.test(
      `${normKh} ${en}`
    )
  ) {
    const isCoffeeOrTea = /កាហ្វេ|តែ|ម៉ាត់ឆា|coffee|latte|matcha|tea|boba/i.test(`${normKh} ${en}`);
    const ingredients: FoodIngredient[] = [
      {
        nameKh: isCoffeeOrTea
          ? `ម្សៅកាហ្វេលីងថ្មី ឬស្លឹកតែក្រអូបសម្រាប់ឆុង "${kh}"`
          : `ផ្លែឈើ ឬគ្រឿងផ្សំធម្មជាតិស្រស់ៗសម្រាប់ "${kh}"`,
        nameEn: isCoffeeOrTea
          ? `Freshly roasted coffee grounds or fragrant tea leaves for "${en}"`
          : `Fresh ripe tropical fruit or natural base for "${en}"`,
        amount: isCoffeeOrTea ? '៣ ស្លាបព្រាបាយ' : '២៥០ ក្រាម',
      },
      {
        nameKh: 'ទឹកដោះគោខាប់ផ្អែម ទឹកដោះគោស្រស់ ឬទឹកស្ករត្នោតធម្មជាតិ',
        nameEn: 'Sweetened condensed milk, fresh milk, or pure palm sugar syrup',
        amount: '៦០ មីលីលីត្រ',
      },
      {
        nameKh: 'ទឹកកកស្អាតគ្រាប់តូចៗ',
        nameEn: 'Clean crushed or cubed ice',
        amount: '១ កែវពេញ',
      },
      {
        nameKh: normKh.includes('គុជ') ? 'គ្រាប់គុជខ្មៅស្ងោរទន់ស្វិតត្រាំទឹកស្ករក្រហម' : 'ស្លឹកជីរអង្កាម ឬចំណិតក្រូចឆ្មារស្រស់សម្រាប់តុបតែង',
        nameEn: normKh.includes('គុជ') ? 'Chewy brown-sugar tapioca boba pearls' : 'Fresh mint sprig or citrus slice for garnish',
        amount: '២ ស្លាបព្រាបាយ',
      },
    ];
    const steps: FoodStep[] = [
      {
        stepNumber: 1,
        instructionKh: isCoffeeOrTea
          ? 'ឆុងកាហ្វេ ឬស្លឹកតែជាមួយទឹកក្តៅពុះឱ្យចេញជាតិចាស់ក្រអូបឈ្ងុយ រួចច្រោះយកកាកចេញ។'
          : 'ជ្រើសរើស និងលាងសម្អាតគ្រឿងផ្សំផ្លែឈើធម្មជាតិស្រស់ៗ ចិតសំបក និងហាន់ជាដុំតូចៗ។',
        instructionEn: isCoffeeOrTea
          ? 'Brew the coffee or tea leaves with hot water until rich and aromatic, then strain.'
          : 'Wash, peel, and dice the fresh natural fruit or beverage base.',
      },
      {
        stepNumber: 2,
        instructionKh: isCoffeeOrTea
          ? 'ចាក់ទឹកដោះគោខាប់ ឬទឹកស្ករត្នោតចូលកែវ កូរលាយជាមួយទឹកកាហ្វេ/តែក្តៅឱ្យរលាយសព្វផ្អែមឈ្ងុយល្មម។'
          : 'ដាក់គ្រឿងផ្សំចូលម៉ាស៊ីនក្រឡុក (ឬកៀបយកទឹកស្រស់ៗ) លាយជាមួយទឹកដោះគោស្រស់ ទឹកស្ករ និងទឹកកកឱ្យម៉ត់រលោង។',
        instructionEn: isCoffeeOrTea
          ? 'Stir in condensed milk or palm sugar syrup while warm until silky and balanced.'
          : 'Blend smoothly with fresh milk, syrup, and ice (or press fresh juice) until velvety.',
      },
      {
        stepNumber: 3,
        instructionKh: 'ដាក់ទឹកកកស្អាត (និងគ្រាប់គុជប្រសិនបើមាន) ចូលពេញកែវ រួចចាក់ភេសជ្ជៈពីលើ និងបន្ថែមទឹកដោះគោស្រស់បន្តិចពីលើ។',
        instructionEn: 'Fill a tall glass with ice (and boba pearls if desired), pour over the drink, and top with fresh milk.',
      },
      {
        stepNumber: 4,
        instructionKh: `តុបតែងមាត់កែវឱ្យស្រស់ស្អាត រួចទទួលទាន "${kh}" ត្រជាក់ៗស្រស់ស្រាយភ្លាមៗ។`,
        instructionEn: `Garnish and enjoy "${en}" ice-cold and refreshing.`,
      },
    ];
    return {
      ingredients,
      steps,
      descriptionKh:
        existingDescriptionKh ||
        `${kh} ជាភេសជ្ជៈដ៏ឈ្ងុយឆ្ងាញ់ត្រជាក់ចិត្ត ផ្តល់ភាពស្រស់ស្រាយគ្រប់ពេលវេលា។`,
      descriptionEn: `${en}, a freshly crafted chilled beverage bursting with aromatic, refreshing flavor.`,
    };
  }

  // 9. KHMER CAKES & SWEET DESSERTS (នំខ្មែរ, អន្សម, ក្រឡាន, សង់ខ្យា, បង្អែម)
  if (
    cat === 'dessert' ||
    cat === 'cake' ||
    /បង្អែម|អន្សម|ក្រឡាន|សង់ខ្យា|^នំ(?!បញ្ចុក|ប៉័ងសាច់|ប៉័ងប៉ាតេ)|ចាហួយ|ការ៉េម|ចេកខ្ទិះ/.test(normKh)
  ) {
    const isTraditionalCake = cat === 'cake' || /អន្សម|ក្រឡាន|^នំ/.test(normKh);
    const ingredients: FoodIngredient[] = [
      {
        nameKh: isTraditionalCake
          ? `អង្ករដំណើប ឬម្សៅអង្ករខ្មែរថ្មីល្អ និង ${main.mainKh}`
          : main.mainKh,
        nameEn: isTraditionalCake
          ? `Fragrant Cambodian glutinous rice or rice flour & ${main.mainEn}`
          : main.mainEn,
        amount: main.amount,
      },
      {
        nameKh: 'ខ្ទិះដូងដើមខាប់ធម្មជាតិ និងសាច់ដូងកោសខ្ចីៗ',
        nameEn: 'Rich first-press coconut cream and freshly grated young coconut',
        amount: '២៥០ មីលីលីត្រ',
      },
      {
        nameKh: 'ស្ករត្នោតខ្មែរសុទ្ធ និងអំបិលម៉ត់មួយចុងស្លាបព្រា',
        nameEn: 'Pure Cambodian palm sugar and a tiny pinch of sea salt',
        amount: '៣ ស្លាបព្រាបាយ',
      },
      {
        nameKh: isTraditionalCake ? 'ស្លឹកចេកស្រស់ ឬស្លឹកតយក្រអូប និងល្ងលីង' : 'ស្លឹកតយក្រអូប និងល្ងស ឬសណ្តែកលីងឈ្ងុយ',
        nameEn: isTraditionalCake ? 'Fresh banana leaves or pandan leaves & toasted sesame' : 'Fragrant pandan leaves and toasted sesame seeds',
        amount: '១ ក្តាប់តូច',
      },
    ];
    const steps: FoodStep[] = [
      {
        stepNumber: 1,
        instructionKh: isTraditionalCake
          ? 'លាងត្រាំអង្ករដំណើប ឬលាយម្សៅនំជាមួយខ្ទិះដូង ស្ករត្នោតខ្មែរ និងអំបិលបន្តិចឱ្យចូលជាតិទន់ឈ្ងុយ។'
          : `ជ្រើសរើស និងលាងសម្អាតគ្រឿងផ្សំចម្បង (${main.mainKh}) ឱ្យស្អាតល្អ។`,
        instructionEn: isTraditionalCake
          ? 'Soak the glutinous rice or knead the rice-flour batter with coconut cream, palm sugar, and a pinch of salt.'
          : `Select and prepare the fresh primary ingredients (${main.mainEn}).`,
      },
      {
        stepNumber: 2,
        instructionKh: isTraditionalCake
          ? 'រៀបស្នូល ឬចាក់ម្សៅនំដាក់ក្នុងពុម្ព/ខ្ចប់ស្លឹកចេកឱ្យស្អាតមានរបៀបតាមក្បួននំបុរាណខ្មែរ។'
          : 'ដាំខ្ទិះដូង និងស្ករត្នោតជាមួយស្លឹកតយ និងអំបិលមួយចុងស្លាបព្រាលើភ្លើងតិចៗឱ្យរលាយឈ្ងុយ។',
        instructionEn: isTraditionalCake
          ? 'Fill with sweet/savory stuffing, wrap neatly in banana leaves or pour into traditional molds.'
          : 'Simmer coconut cream and palm sugar gently with knotted pandan leaves and a pinch of salt.',
      },
      {
        stepNumber: 3,
        instructionKh: isTraditionalCake
          ? 'ដាក់ចំហុយ ស្ងោរ ឬដុតលើភ្លើងល្មមរហូតដល់នំឆ្អិនទន់ស្វិតឈ្ងុយខ្ទិះដូង និងស្ករត្នោត។'
          : 'ដាក់គ្រឿងផ្សំចម្បងចូលរម្ងាស់ ឬលាយបញ្ចូលគ្នាឱ្យឆ្អិនទន់ជ្រាបរសជាតិផ្អែមឈ្ងុយល្មម។',
        instructionEn: isTraditionalCake
          ? 'Steam, simmer, or bake slowly until tender, chewy, and infused with coconut and palm sugar aroma.'
          : 'Fold in the main ingredients and cook gently until tender and infused with sweet pandan-coconut aroma.',
      },
      {
        stepNumber: 4,
        instructionKh: `រៀប "${kh}" ដាក់ចាន រោយដូងកោស ឬល្ងលីងពីលើ រួចទទួលទានក្តៅឧណ្ហៗ ឬត្រជាក់តាមចំណូលចិត្ត។`,
        instructionEn: `Plate "${en}", garnish with grated coconut or toasted sesame seeds, and enjoy.`,
      },
    ];
    return {
      ingredients,
      steps,
      descriptionKh:
        existingDescriptionKh ||
        `${kh} ជានំ/បង្អែមប្រពៃណីខ្មែរដ៏ឈ្ងុយឆ្ងាញ់ ផ្សំពីខ្ទិះដូងដើម ស្ករត្នោតខ្មែរសុទ្ធ និងស្លឹកតយក្រអូប។`,
      descriptionEn: `${en} crafted with rich coconut cream, pure Cambodian palm sugar, and fragrant pandan.`,
    };
  }

  // 10. SOUP / STEW / KORKO / MACHU / CLEAR SOUP (សម្ល, ស្ងោរ, កកូរ, ម្ជូរ, ការី, ស៊ុប)
  const ingredients: FoodIngredient[] = [
    { nameKh: main.mainKh, nameEn: main.mainEn, amount: main.amount },
    {
      nameKh: 'គ្រឿងបុកខ្មែរ (គល់ស្លឹកគ្រៃ រំដេង រមៀត ខ្ជាយ ខ្ទឹមស ស្លឹកក្រូចសើច)',
      nameEn: 'Pounded Khmer kroeung aromatics (lemongrass, galangal, turmeric, fingerroot, garlic, kaffir lime)',
      amount: '៣ ស្លាបព្រាបាយ',
    },
    {
      nameKh: 'ប្រហុកសាច់ ទឹកត្រី ស្ករត្នោត និងអំបិលម៉ត់',
      nameEn: 'Minced prahok, fish sauce, palm sugar, and sea salt',
      amount: '២ ស្លាបព្រាបាយ',
    },
    {
      nameKh: 'បន្លែស្រស់តាមមុខម្ហូប (ត្រកួន ល្ហុង ត្រប់ ផ្សិត ឬគ្រឿងម្ជូរធម្មជាតិ)',
      nameEn: 'Seasonal Khmer soup vegetables and natural souring aromatics',
      amount: '១ ចានធំ',
    },
    {
      nameKh: 'ស្លឹកជីរនាងវង ជីររណារ ម្ទេសស្រស់ និងខ្ទឹមបំពង',
      nameEn: 'Sweet basil, culantro, fresh bird-eye chilies, and crispy garlic',
      amount: '១ ក្តាប់តូច',
    },
  ];
  const steps: FoodStep[] = [
    {
      stepNumber: 1,
      instructionKh: `លាងសម្អាត ${main.mainKh} ឱ្យស្អាត ហាន់ជាដុំល្មម និងរៀបចំគ្រឿងបុកខ្មែរ ព្រមទាំងបន្លែស្រស់ទុកឱ្យរួចរាល់។`,
      instructionEn: `Wash and cut ${main.mainEn} into serving pieces, and prepare the pounded kroeung paste and fresh vegetables.`,
    },
    {
      stepNumber: 2,
      instructionKh: 'ដាក់ឆ្នាំងឆាគ្រឿងបុក និងប្រហុកសាច់ឱ្យឡើងក្លិនឈ្ងុយ រួចដាក់សាច់ចូលកូរត្រឡប់ឱ្យចូលជាតិសព្វល្អ។',
      instructionEn: 'Sauté the aromatic kroeung and prahok in a pot until fragrant, then toss in the protein to coat evenly.',
    },
    {
      stepNumber: 3,
      instructionKh: 'ចាក់ទឹកស៊ុបចូលដាំឱ្យពុះ បង់បន្លែចូលរម្ងាស់រហូតដល់ឆ្អិនផុយល្មម រួចភ្លក្សរសជាតិដោយទឹកត្រី ស្ករត្នោត និងអំបិល។',
      instructionEn: 'Pour in water or broth, bring to a boil, add the vegetables until tender, and balance with fish sauce, palm sugar, and salt.',
    },
    {
      stepNumber: 4,
      instructionKh: `បង់ស្លឹកជីរគ្រប់មុខ និងម្ទេសស្រស់មុនបិទភ្លើង រួចដួស "${kh}" ទទួលទានក្តៅៗជាមួយបាយស។`,
      instructionEn: `Fold in fresh herbs and chilies just before turning off the heat, and serve "${en}" piping hot with steamed rice.`,
    },
  ];

  return {
    ingredients,
    steps,
    descriptionKh:
      existingDescriptionKh ||
      `${kh} ជាមុខម្ហូបសម្លខ្មែរដ៏ឈ្ងុយឆ្ងាញ់ ចម្អិនពី ${main.mainKh} ជាមួយគ្រឿងទេស និងបន្លែស្រស់ធម្មជាតិ។`,
    descriptionEn: `${en} simmered with ${main.mainEn}, traditional Khmer kroeung aromatics, and fresh garden greens.`,
  };
}
