const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const scratchDir = __dirname;
const projectRoot = 'F:\\Soft\\System Program 2027 kimseng\\KhmerFoodTourism';
const ExcelJS = require(path.join(projectRoot, 'node_modules', 'exceljs'));

const batch1 = require(path.join(scratchDir, 'batch1.cjs'));
const batch2 = require(path.join(scratchDir, 'batch2.cjs'));
const batch3 = require(path.join(scratchDir, 'batch3.cjs'));
const batch4 = require(path.join(scratchDir, 'batch4.cjs'));

const dishes = [...batch1, ...batch2, ...batch3, ...batch4];
console.log('Total dishes loaded:', dishes.length);
if (dishes.length !== 100) {
  throw new Error(`Expected 100 dishes, got ${dishes.length}`);
}

// 1. Verify zero duplicates against existing_names.json and within the 100 new dishes
const existingData = JSON.parse(fs.readFileSync(path.join(scratchDir, 'existing_names.json'), 'utf8'));
const norm = (s) => String(s || '').trim().replace(/\s+/g, '').toLowerCase();
const existingKhSet = new Set(existingData.existingKh.map(norm));
const existingEnSet = new Set(existingData.existingEn.map(norm));

const seenIds = new Set();
const seenKh = new Set();
const seenEn = new Set();

dishes.forEach((d, idx) => {
  const expectedId = `food-${231 + idx}`;
  if (d.id !== expectedId) {
    throw new Error(`Dish at index ${idx} has id ${d.id}, expected ${expectedId}`);
  }
  if (seenIds.has(d.id)) throw new Error(`Duplicate ID: ${d.id}`);
  seenIds.add(d.id);

  const nKh = norm(d.nameKh);
  const nEn = norm(d.nameEn);

  if (existingKhSet.has(nKh)) {
    throw new Error(`Duplicate Khmer name against existing DB: ${d.id} -> ${d.nameKh}`);
  }
  if (existingEnSet.has(nEn)) {
    throw new Error(`Duplicate English name against existing DB: ${d.id} -> ${d.nameEn}`);
  }
  if (seenKh.has(nKh)) {
    throw new Error(`Duplicate Khmer name within new 100 dishes: ${d.id} -> ${d.nameKh}`);
  }
  if (seenEn.has(nEn)) {
    throw new Error(`Duplicate English name within new 100 dishes: ${d.id} -> ${d.nameEn}`);
  }
  seenKh.add(nKh);
  seenEn.add(nEn);

  if (!d.nameZh || !d.categoryZh || !d.descriptionZh) {
    throw new Error(`Missing Chinese translation on ${d.id}`);
  }
  if (!Array.isArray(d.ingredients) || d.ingredients.length !== 4) {
    throw new Error(`Expected 4 ingredients on ${d.id}`);
  }
  if (!Array.isArray(d.steps) || d.steps.length !== 3) {
    throw new Error(`Expected 3 steps on ${d.id}`);
  }
});
console.log('DUPLICATE_CHECK_PASSED: 0 duplicates against existing 230 dishes and 0 internal duplicates.');

// 2. Generate src/data/seedFoodpanda100Foods.ts
const tsItems = dishes.map((d) => ({
  id: d.id,
  nameKh: d.nameKh,
  nameEn: d.nameEn,
  nameZh: d.nameZh,
  category: d.category,
  categoryEn: d.categoryEn,
  categoryZh: d.categoryZh,
  price: d.price,
  cookTime: d.cookTime,
  difficulty: d.difficulty,
  rating: d.rating,
  image: d.image,
  descriptionKh: d.descriptionKh,
  descriptionEn: d.descriptionEn,
  descriptionZh: d.descriptionZh,
  ingredients: d.ingredients.map((ing) => ({
    nameKh: ing.kh,
    nameEn: ing.en,
    nameZh: ing.zh,
    amount: `${ing.amtKh} (${ing.amtEn} / ${ing.amtZh})`,
  })),
  steps: d.steps.map((st, idx) => ({
    stepNumber: idx + 1,
    instructionKh: st.kh,
    instructionEn: st.en,
    instructionZh: st.zh,
  })),
}));

const tsContent = `import { FoodItem } from '../types';

/**
 * 100 Authentic Popular Cambodian Khmer Dishes (food-231 to food-330)
 * Curated across the entire www.foodpanda.com.kh platform (Phnom Penh, Siem Reap, Battambang, Kampot, Kep, etc.)
 * Full Trilingual Support: Khmer (km), English (en), Simplified Chinese (zh)
 */
export const foodpanda100Foods: FoodItem[] = ${JSON.stringify(tsItems, null, 2)};
`;

const seedFoodpandaPath = path.join(projectRoot, 'src', 'data', 'seedFoodpanda100Foods.ts');
fs.writeFileSync(seedFoodpandaPath, tsContent, 'utf8');
console.log('Wrote:', seedFoodpandaPath);

// 3. Update src/data/seedFoods.ts to import and include foodpanda100Foods
const seedFoodsPath = path.join(projectRoot, 'src', 'data', 'seedFoods.ts');
let seedFoodsCode = fs.readFileSync(seedFoodsPath, 'utf8');

if (!seedFoodsCode.includes('foodpanda100Foods')) {
  seedFoodsCode = seedFoodsCode.replace(
    "import { vegetarian30Foods } from './seedVegetarian30Foods';",
    "import { vegetarian30Foods } from './seedVegetarian30Foods';\nimport { foodpanda100Foods } from './seedFoodpanda100Foods';"
  );
  seedFoodsCode = seedFoodsCode.replace(
    '...vegetarian30Foods',
    '...vegetarian30Foods,\n    ...foodpanda100Foods'
  );
  fs.writeFileSync(seedFoodsPath, seedFoodsCode, 'utf8');
  console.log('Updated:', seedFoodsPath);
} else {
  console.log('seedFoods.ts already includes foodpanda100Foods');
}

// 4. Create local food images /foods/food-231.jpg to /foods/food-330.jpg
const publicFoodsDir = path.join(projectRoot, 'public', 'foods');
const androidFoodsDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'public', 'foods');

let copiedImages = 0;
dishes.forEach((d) => {
  const targetName = `${d.id}.jpg`;
  const targetPublic = path.join(publicFoodsDir, targetName);
  const sourceFallback = path.join(publicFoodsDir, d.fallbackImg || 'food-1.jpg');
  if (!fs.existsSync(targetPublic) && fs.existsSync(sourceFallback)) {
    fs.copyFileSync(sourceFallback, targetPublic);
    copiedImages++;
  }
  if (fs.existsSync(androidFoodsDir)) {
    const targetAndroid = path.join(androidFoodsDir, targetName);
    if (!fs.existsSync(targetAndroid) && fs.existsSync(targetPublic)) {
      fs.copyFileSync(targetPublic, targetAndroid);
    }
  }
});
console.log(`Prepared local food images in public/foods/ (newly copied: ${copiedImages})`);

// 5. Generate Excel Picture Templates (.xlsx and .csv)
async function generateExcelAndCsv() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'KhmerFoodTourism';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('100 Khmer Dishes (Foodpanda)', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 3 }],
  });

  // Title Banner
  sheet.mergeCells('A1:P1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = '🇰🇭 បញ្ជីមុខម្ហូបខ្មែរពេញនិយមទាំង ១០០ មុខ ពីគេហទំព័រ www.foodpanda.com.kh (food-231 ដល់ food-330) — 3 ភាសា (ខ្មែរ / English / 中文)';
  titleCell.font = { name: 'Khmer OS Siemreap', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB91C1C' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 36;

  // Subtitle / Instruction Banner
  sheet.mergeCells('A2:P2');
  const subCell = sheet.getCell('A2');
  subCell.value = '💡 សម្គាល់៖ សូមដាក់រូបភាពម្ហូបក្នុងជួរឈរ D "រូបភាពម្ហូប (Paste Photo Here)" តាមលេខកូដ food-231 ដល់ food-330 ដើម្បីងាយស្រួលផ្ទៀងផ្ទាត់ និងគ្រប់គ្រងរូបភាព។';
  subCell.font = { name: 'Khmer OS Siemreap', size: 10, italic: true, color: { argb: 'FF7C2D12' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(2).height = 24;

  const columns = [
    { header: 'ល.រ\nNo.', key: 'no', width: 7 },
    { header: 'លេខកូដ\nFood ID', key: 'id', width: 13 },
    { header: 'ឈ្មោះឯកសាររូបភាព\nImage Path', key: 'imagePath', width: 20 },
    { header: 'រូបភាពម្ហូប\n(Paste Photo Here)', key: 'photoBox', width: 24 },
    { header: 'ឈ្មោះម្ហូប (ខ្មែរ)\nKhmer Name', key: 'nameKh', width: 34 },
    { header: 'ឈ្មោះម្ហូប (អង់គ្លេស)\nEnglish Name', key: 'nameEn', width: 42 },
    { header: 'ឈ្មោះម្ហូប (ចិន)\nChinese Name (中文)', key: 'nameZh', width: 32 },
    { header: 'ប្រភេទម្ហូប (៣ ភាសា)\nCategory (KH / EN / ZH)', key: 'category', width: 30 },
    { header: 'តម្លៃ ($)\nPrice (USD)', key: 'price', width: 12 },
    { header: 'រយៈពេលចម្អិន\nCook Time', key: 'cookTime', width: 14 },
    { header: 'កម្រិត\nDifficulty', key: 'difficulty', width: 12 },
    { header: 'ការពិពណ៌នា (ខ្មែរ)\nDescription (Khmer)', key: 'descKh', width: 45 },
    { header: 'ការពិពណ៌នា (អង់គ្លេស)\nDescription (English)', key: 'descEn', width: 45 },
    { header: 'ការពិពណ៌នា (ចិន)\nDescription (Chinese)', key: 'descZh', width: 42 },
    { header: 'គ្រឿងផ្សំ (ខ្មែរ / EN / 中文)\nIngredients (3 Languages)', key: 'ingredients', width: 55 },
    { header: 'របៀបចម្អិន (ខ្មែរ / EN / 中文)\nCooking Steps (3 Languages)', key: 'steps', width: 60 },
  ];

  sheet.columns = columns.map((c) => ({ key: c.key, width: c.width }));

  const headerRow = sheet.getRow(3);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { name: 'Khmer OS Siemreap', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF7F1D1D' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
  headerRow.height = 34;

  dishes.forEach((d, idx) => {
    const rowNumber = idx + 4;
    const row = sheet.getRow(rowNumber);
    row.height = 88;

    const ingText = d.ingredients
      .map((ing, i) => `${i + 1}. ${ing.kh} (${ing.amtKh}) | ${ing.en} (${ing.amtEn}) | ${ing.zh} (${ing.amtZh})`)
      .join('\n');

    const stepText = d.steps
      .map((st, i) => `ជំហាន ${i + 1}: ${st.kh}\nStep ${i + 1}: ${st.en}\n步骤 ${i + 1}: ${st.zh}`)
      .join('\n\n');

    const rowValues = [
      idx + 1,
      d.id,
      d.image,
      `[ Paste ${d.id}.jpg ]`,
      d.nameKh,
      d.nameEn,
      d.nameZh,
      `${d.category}\n${d.categoryEn}\n${d.categoryZh}`,
      d.price,
      `${d.cookTime} នាទី (mins)`,
      d.difficulty,
      d.descriptionKh,
      d.descriptionEn,
      d.descriptionZh,
      ingText,
      stepText,
    ];

    const isEven = idx % 2 === 0;
    const bgArgb = isEven ? 'FFFFFFFF' : 'FFFFFBEB';

    rowValues.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = {
        name: 'Khmer OS Siemreap',
        size: 10,
        bold: colIdx === 1 || colIdx === 4,
        color: { argb: colIdx === 3 ? 'FF9CA3AF' : 'FF1E293B' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colIdx === 3 ? 'FFF8FAFC' : bgArgb },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: [0, 1, 2, 3, 8, 9, 10].includes(colIdx) ? 'center' : 'left',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
    row.getCell(9).numFmt = '$#,##0.00';
  });

  const templatesDir = path.join(projectRoot, 'templates');
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }

  const xlsxPaths = [
    path.join(projectRoot, 'Khmer_Food_100_Dishes_Picture_Template.xlsx'),
    path.join(projectRoot, 'KhmerFoodTourism_100_Foodpanda_Khmer_Foods_Photo_Template.xlsx'),
    path.join(templatesDir, 'Cambodian_Foodpanda_100_Dishes_Template.xlsx'),
  ];

  for (const p of xlsxPaths) {
    await workbook.xlsx.writeFile(p);
    console.log('Saved Excel template:', p);
  }

  // Generate CSV with UTF-8 BOM
  const csvEsc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csvHeader = [
    'No',
    'Food ID',
    'Image Path',
    'Paste Photo Here',
    'Khmer Name',
    'English Name',
    'Chinese Name',
    'Category (KH)',
    'Category (EN)',
    'Category (ZH)',
    'Price (USD)',
    'Cook Time (mins)',
    'Difficulty',
    'Description (KH)',
    'Description (EN)',
    'Description (ZH)',
    'Ingredients (KH / EN / ZH)',
    'Cooking Steps (KH / EN / ZH)',
  ].map(csvEsc).join(',');

  const csvRows = dishes.map((d, idx) => {
    const ingText = d.ingredients
      .map((ing, i) => `${i + 1}. ${ing.kh} (${ing.amtKh}) | ${ing.en} (${ing.amtEn}) | ${ing.zh} (${ing.amtZh})`)
      .join(' ; ');
    const stepText = d.steps
      .map((st, i) => `Step ${i + 1}: ${st.kh} | ${st.en} | ${st.zh}`)
      .join(' ; ');
    return [
      idx + 1,
      d.id,
      d.image,
      `[ Paste ${d.id}.jpg ]`,
      d.nameKh,
      d.nameEn,
      d.nameZh,
      d.category,
      d.categoryEn,
      d.categoryZh,
      d.price.toFixed(2),
      d.cookTime,
      d.difficulty,
      d.descriptionKh,
      d.descriptionEn,
      d.descriptionZh,
      ingText,
      stepText,
    ].map(csvEsc).join(',');
  });

  const csvContent = '\uFEFF' + [csvHeader, ...csvRows].join('\r\n');
  const csvPaths = [
    path.join(projectRoot, 'Khmer_Food_100_Dishes_Picture_Template.csv'),
    path.join(projectRoot, 'KhmerFoodTourism_100_Foodpanda_Khmer_Foods_Photo_Template.csv'),
  ];
  for (const cp of csvPaths) {
    fs.writeFileSync(cp, csvContent, 'utf8');
    console.log('Saved CSV template:', cp);
  }
}

generateExcelAndCsv()
  .then(() => {
    // Run TypeScript check
    console.log('Running tsc --noEmit...');
    const tscBin = path.join(projectRoot, 'node_modules', 'typescript', 'bin', 'tsc');
    execSync(`node "${tscBin}" -p "${path.join(projectRoot, 'tsconfig.json')}" --noEmit`, {
      stdio: 'inherit',
    });
    console.log('TSC_OK: 0 TypeScript errors! All 100 Foodpanda Khmer dishes (food-231 to food-330) integrated.');
  })
  .catch((err) => {
    console.error('ERROR:', err);
    process.exit(1);
  });
