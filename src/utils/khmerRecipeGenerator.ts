import type { FoodIngredient, FoodStep } from '../types';

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
  const kh = (nameKh || '').trim();
  const en = (nameEn || '').toLowerCase();

  if (kh.includes('ត្រចៀកជ្រូក') || en.includes('pig ear') || en.includes('pork ear')) {
    return {
      mainKh: 'ត្រចៀកជ្រូកស្រស់ស្ងោរឆ្អិនហាន់ស្តើងៗឱ្យស្រួយ',
      mainEn: 'Fresh pork ears boiled tender-crisp and thinly sliced',
      amount: '៤៥០ ក្រាម',
    };
  }
  if (kh.includes('អណ្តាតគោ') || en.includes('ox tongue') || en.includes('beef tongue')) {
    return {
      mainKh: 'អណ្តាតគោស្រស់សម្អាតស្អាតហាន់បន្ទះល្មម',
      mainEn: 'Fresh beef tongue cleaned and sliced into tender pieces',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('ក្រពះជ្រូក') || kh.includes('ពោះតាន់') || en.includes('pork stomach') || en.includes('tripe')) {
    return {
      mainKh: 'ក្រពះជ្រូក ឬពោះតាន់ស្រស់លាងសម្អាតស្ងោរផុយស្រួយ',
      mainEn: 'Fresh pork stomach or tripe thoroughly cleaned and simmered tender-crisp',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('ជើងមាន់') || en.includes('chicken feet')) {
    return {
      mainKh: 'ជើងមាន់ស្រស់ដកឆ្អឹង ឬកាត់ក្រចកស្អាត',
      mainEn: 'Fresh boneless or trimmed chicken feet',
      amount: '៤៥០ ក្រាម',
    };
  }
  if (kh.includes('ជើងជ្រូក') || en.includes('pork trotter') || en.includes('pork hock')) {
    return {
      mainKh: 'ជើងជ្រូកស្រស់កាប់ជាដុំល្មមលាងសម្អាតស្អាត',
      mainEn: 'Fresh pork trotters cut into serving chunks',
      amount: '៦០០ ក្រាម',
    };
  }
  if (kh.includes('ឆ្អឹងជំនីរជ្រូក') || en.includes('pork rib')) {
    return {
      mainKh: 'ឆ្អឹងជំនីរជ្រូកខ្ចីកាប់ដុំល្មម',
      mainEn: 'Young tender pork spare ribs cut into pieces',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('សាច់ជ្រូកបីជាន់') || kh.includes('ពោះជ្រូក') || en.includes('pork belly')) {
    return {
      mainKh: 'សាច់ជ្រូកបីជាន់ស្រស់ជាប់ស្បែកស្ដើង',
      mainEn: 'Fresh layered pork belly with thin skin',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('សាច់គោ') || kh.includes('គោ') || en.includes('beef')) {
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
  if (kh.includes('ក្តាម') || en.includes('crab')) {
    return {
      mainKh: 'ក្តាមស្រស់សាច់ណែនលាងសម្អាតបកស្នូក',
      mainEn: 'Fresh swimming or field crabs cleaned and prepped',
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
  if (kh.includes('ងាវ') || kh.includes('លៀស') || kh.includes('គ្រំ') || kh.includes('ខ្យង') || en.includes('clam') || en.includes('cockle') || en.includes('mussel')) {
    return {
      mainKh: 'គ្រឿងសមុទ្រសំបក (ងាវ/លៀស/គ្រំ/ខ្យង) ស្រស់ត្រាំទឹកខ្ជាក់ដីស្អាត',
      mainEn: 'Fresh shellfish (cockles/clams/mussels) purged and scrubbed clean',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('កង្កែប') || en.includes('frog')) {
    return {
      mainKh: 'កង្កែបស្រែស្រស់សម្អាតស្អាត',
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
  if (kh.includes('ត្រី') || en.includes('fish')) {
    return {
      mainKh: 'ត្រីស្រស់សម្អាតស្រកា និងលាងទឹកអំបិលឱ្យស្អាត',
      mainEn: 'Fresh river or sea fish scaled, cleaned, and prepped',
      amount: '៥០០ ក្រាម',
    };
  }
  if (kh.includes('ពងទា') || en.includes('egg')) {
    return {
      mainKh: 'ពងទាខ្មែរស្រស់ថ្មីៗ',
      mainEn: 'Fresh Cambodian duck eggs',
      amount: '៤ គ្រាប់',
    };
  }
  return {
    mainKh: `គ្រឿងផ្សំចម្បងសម្រាប់ ${kh || 'មុខម្ហូបនេះ'} ស្រស់ថ្មីៗ`,
    mainEn: `Fresh primary ingredients for ${nameEn || kh || 'this dish'}`,
    amount: '៤៥០ ក្រាម',
  };
}

export function generateAuthenticRecipeByDishName(
  nameKh: string,
  nameEn: string = '',
  categorySlug: string = 'soup',
  existingDescriptionKh: string = ''
): GeneratedRecipeResult {
  const kh = (nameKh || '').trim() || 'ម្ហូបខ្មែរ';
  const en = (nameEn || '').trim() || kh;
  const cat = (categorySlug || 'soup').toLowerCase();
  const main = detectMainIngredient(kh, en);

  // 1. SALAD / NHOAM / PLEAH / BOK (ញាំ, ភ្លា, បុក)
  if (
    cat === 'salad' ||
    kh.includes('ញាំ') ||
    kh.includes('ភ្លា') ||
    kh.includes('បុក')
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
        instructionKh: `រៀបចំលាងសម្អាត និងចម្អិន/ស្រុស ${main.mainKh} ឱ្យឆ្អិនស្រួយល្អ រួចសម្រស់ទឹកឱ្យស្ងួត។`,
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

  // 2. GRILLED / ROASTED / FRIED CRISPY (អាំង, ដុត, បំពង, ចៀន, ងៀត)
  if (
    cat === 'grilled' ||
    kh.includes('អាំង') ||
    kh.includes('ដុត') ||
    kh.includes('បំពង') ||
    kh.includes('ងៀត')
  ) {
    const isFried = kh.includes('បំពង') || kh.includes('ចៀន');
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

  // 3. STIR-FRY / BRAISED (ឆា, ខ, ឡុកឡាក់)
  if (
    cat === 'stirfry' ||
    kh.includes('ឆា') ||
    kh.startsWith('ខ') ||
    kh.includes('ឡុកឡាក់')
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

  // 4. NOODLES (នំបញ្ចុក, គុយទាវ, មី, លត, បាញ់កាញ់)
  if (
    cat === 'noodles' ||
    kh.includes('នំបញ្ចុក') ||
    kh.includes('គុយទាវ') ||
    kh.includes('មី') ||
    kh.includes('លត')
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
        instructionKh: 'ស្រុសសរសៃគុយទាវ/មី ឬរៀបនំបញ្ចុក និងបន្លែដាក់ចូលចានគោម រួចរៀបសាច់ពីលើ។',
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

  // 5. DESSERTS & DRINKS (បង្អែម, នំ, ទឹក, កាហ្វេ, តែ)
  if (
    cat === 'dessert' ||
    cat === 'drink' ||
    kh.includes('បង្អែម') ||
    kh.includes('ទឹកក្រឡុក') ||
    kh.includes('កាហ្វេ')
  ) {
    const ingredients: FoodIngredient[] = [
      { nameKh: main.mainKh, nameEn: main.mainEn, amount: main.amount },
      {
        nameKh: 'ខ្ទិះដូងដើមខាប់ធម្មជាតិ ឬទឹកដោះគោស្រស់',
        nameEn: 'Rich first-press coconut cream or fresh milk',
        amount: '២៥០ មីលីលីត្រ',
      },
      {
        nameKh: 'ស្ករត្នោតខ្មែរសុទ្ធ និងអំបិលម៉ត់មួយចុងស្លាបព្រា',
        nameEn: 'Pure Cambodian palm sugar and a tiny pinch of sea salt',
        amount: '៣ ស្លាបព្រាបាយ',
      },
      {
        nameKh: 'ស្លឹកតយក្រអូប និងល្ងស ឬសណ្តែកលីងឈ្ងុយ',
        nameEn: 'Fragrant pandan leaves and toasted sesame or mung beans',
        amount: '១ ក្តាប់តូច',
      },
    ];
    const steps: FoodStep[] = [
      {
        stepNumber: 1,
        instructionKh: `ជ្រើសរើស និងលាងសម្អាតគ្រឿងផ្សំចម្បង (${main.mainKh}) ឱ្យស្អាតល្អ។`,
        instructionEn: `Select and prepare the fresh primary ingredients (${main.mainEn}).`,
      },
      {
        stepNumber: 2,
        instructionKh: 'ដាំខ្ទិះដូង និងស្ករត្នោតជាមួយស្លឹកតយ និងអំបិលមួយចុងស្លាបព្រាលើភ្លើងតិចៗឱ្យរលាយឈ្ងុយ។',
        instructionEn: 'Simmer coconut cream and palm sugar gently with knotted pandan leaves and a pinch of salt.',
      },
      {
        stepNumber: 3,
        instructionKh: 'ដាក់គ្រឿងផ្សំចម្បងចូលរម្ងាស់ ឬលាយបញ្ចូលគ្នាឱ្យឆ្អិនទន់ជ្រាបរសជាតិផ្អែមឈ្ងុយល្មម។',
        instructionEn: 'Fold in the main ingredients and cook gently until tender and infused with sweet pandan-coconut aroma.',
      },
      {
        stepNumber: 4,
        instructionKh: `ដួស "${kh}" ដាក់ចាន ឬកែវ រោយល្ងលីងពីលើ រួចទទួលទានក្តៅឧណ្ហៗ ឬត្រជាក់តាមចំណូលចិត្ត។`,
        instructionEn: `Serve "${en}" warm or chilled, garnished with toasted sesame seeds.`,
      },
    ];
    return {
      ingredients,
      steps,
      descriptionKh:
        existingDescriptionKh ||
        `${kh} ផ្សំពី ${main.mainKh} ខ្ទិះដូងដើម ស្ករត្នោតខ្មែរ និងស្លឹកតយក្រអូបឈ្ងុយ។`,
      descriptionEn: `${en} crafted with ${main.mainEn}, rich coconut cream, palm sugar, and fragrant pandan.`,
    };
  }

  // 6. DEFAULT: SOUP / STEW / KORKO / MACHU / STEAMED (សម្ល, ស្ងោរ, កកូរ, ម្ជូរ, អាម៉ុក)
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
      `${kh} ជាមុខម្ហូបខ្មែរដ៏ឈ្ងុយឆ្ងាញ់ ចម្អិនពី ${main.mainKh} ជាមួយគ្រឿងទេស និងបន្លែស្រស់ធម្មជាតិ។`,
    descriptionEn: `${en} simmered with ${main.mainEn}, traditional Khmer kroeung aromatics, and fresh garden greens.`,
  };
}
