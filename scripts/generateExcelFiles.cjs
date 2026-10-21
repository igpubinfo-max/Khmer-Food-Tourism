const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const XLSX = require('xlsx');

// Determine real Desktop path
const desktopDir = fs.existsSync('C:/Users/igpub/Desktop')
  ? 'C:/Users/igpub/Desktop'
  : (fs.existsSync('C:/Users/igpub/OneDrive/Desktop') ? 'C:/Users/igpub/OneDrive/Desktop' : path.resolve(__dirname, '..'));

console.log(`Target desktop directory: ${desktopDir}`);

// -------------------------------------------------------------
// 1. LOAD FOODS (seedFoods.ts)
// -------------------------------------------------------------
const seedFoodsContent = fs.readFileSync(path.resolve(__dirname, '../src/data/seedFoods.ts'), 'utf8');

// Core foods
const coreFoods = [];
const regexCore = /id:\s*['"](food-\d+)['"],\s*nameKh:\s*['"]([^'"]+)['"],\s*nameEn:\s*['"]([^'"]+)['"],\s*categorySlug:\s*['"]([^'"]+)['"],\s*categoryKh:\s*['"]([^'"]+)['"],[\s\S]*?priceRiel:\s*(\d+),\s*priceUsd:\s*([\d.]+)/g;
let cm;
while ((cm = regexCore.exec(seedFoodsContent)) !== null) {
  coreFoods.push({
    id: cm[1],
    nameKh: cm[2].trim(),
    nameEn: cm[3].trim(),
    categorySlug: cm[4],
    categoryKh: cm[5],
    priceRiel: parseInt(cm[6], 10),
    priceUsd: parseFloat(cm[7])
  });
}

// Additional dishes
const additionalDishes = [];
const addIdx = seedFoodsContent.indexOf('const additionalAuthenticDishes');
if (addIdx !== -1) {
  const addEnd = seedFoodsContent.indexOf('const fullList: FoodItem[]');
  const addBlock = seedFoodsContent.slice(addIdx, addEnd !== -1 ? addEnd : undefined);
  const regexItem = /"nameKh":\s*"([^"]+)",\s*"nameEn":\s*"([^"]+)",\s*"cat":\s*"([^"]+)",\s*"priceR":\s*(\d+),\s*"priceU":\s*([\d.]+)/g;
  let am;
  while ((am = regexItem.exec(addBlock)) !== null) {
    additionalDishes.push({
      nameKh: am[1].trim(),
      nameEn: am[2].trim(),
      cat: am[3],
      priceR: parseInt(am[4], 10),
      priceU: parseFloat(am[5])
    });
  }
}

const catNames = {
  soup: 'ម្ហូបសម្ល / ប្រពៃណី',
  grilled: 'ម្ហូបអាំង / បំពង',
  stirfry: 'ម្ហូបឆា / ក្តៅៗ',
  salad: 'ញាំ & ភ្លាខ្មែរ',
  noodles: 'គុយទាវ & នំបញ្ចុក',
  rice: 'បាយ & អាហារពេលព្រឹក',
  dessert: 'បង្អែមប្រពៃណីខ្មែរ',
  specialty: 'ម្ហូបពិសេសប្រចាំតំបន់',
};

// Top 100 primary active dishes in App
const targetCategoryCounts = {
  soup: 7,
  grilled: 8,
  stirfry: 10,
  salad: 5,
  noodles: 5,
  rice: 5,
  dessert: 5,
  specialty: 5,
};

const top100Foods = [...coreFoods];
const existingNames = new Set(coreFoods.map(f => f.nameKh));

for (const [cat, count] of Object.entries(targetCategoryCounts)) {
  let added = 0;
  for (const d of additionalDishes) {
    if (d.cat === cat && !existingNames.has(d.nameKh)) {
      existingNames.add(d.nameKh);
      top100Foods.push({
        id: `food-${top100Foods.length + 1}`,
        nameKh: d.nameKh,
        nameEn: d.nameEn,
        categorySlug: d.cat,
        categoryKh: catNames[d.cat] || 'ម្ហូបខ្មែរ',
        priceRiel: d.priceR,
        priceUsd: d.priceU
      });
      added++;
      if (added === count) break;
    }
  }
}

// All foods in database
const allFoods = [...top100Foods];
for (const d of additionalDishes) {
  if (!existingNames.has(d.nameKh)) {
    existingNames.add(d.nameKh);
    allFoods.push({
      id: `food-${allFoods.length + 1}`,
      nameKh: d.nameKh,
      nameEn: d.nameEn,
      categorySlug: d.cat,
      categoryKh: catNames[d.cat] || 'ម្ហូបខ្មែរ',
      priceRiel: d.priceR,
      priceUsd: d.priceU
    });
  }
}

console.log(`Food items: ${top100Foods.length} top dishes, ${allFoods.length} all dishes.`);

// -------------------------------------------------------------
// 2. LOAD RESTAURANTS / SHOPS (seedRestaurants.ts)
// -------------------------------------------------------------
const seedRestaurantsContent = fs.readFileSync(path.resolve(__dirname, '../src/data/seedRestaurants.ts'), 'utf8');
const restTrans = ts.transpileModule(seedRestaurantsContent, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const restMod = { exports: {} };
const restFn = new Function('module', 'exports', 'require', restTrans.outputText);
restFn(restMod, restMod.exports, () => ({}));
const rawRestaurants = restMod.exports.initial100Restaurants || [];

const shops = rawRestaurants.map(r => {
  // Clean English parentheses from Khmer name if present (e.g., "(Malis Restaurant)")
  const cleanNameKh = r.nameKh.replace(/\s*\([A-Za-z0-9\s&'.-]+\)\s*$/, '').trim();
  return {
    id: r.id,
    nameKh: cleanNameKh,
    nameEn: r.nameEn.trim(),
    provinceKh: r.provinceKh.trim(),
    provinceEn: (r.provinceEn || '').trim(),
    addressKh: r.addressKh.trim(),
    addressEn: (r.addressEn || '').trim(),
    priceLevel: r.priceLevel || '$$',
    phone: r.phone || '012 345 678'
  };
});

console.log(`Loaded ${shops.length} restaurants / shops.`);

// -------------------------------------------------------------
// 3. LOAD DESTINATIONS (seedDestinations.ts)
// -------------------------------------------------------------
let destinations = [];
try {
  const seedDestContent = fs.readFileSync(path.resolve(__dirname, '../src/data/seedDestinations.ts'), 'utf8');
  const destTrans = ts.transpileModule(seedDestContent, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const destMod = { exports: {} };
  const destFn = new Function('module', 'exports', 'require', destTrans.outputText);
  destFn(destMod, destMod.exports, () => ({}));
  destinations = destMod.exports.initial100Destinations || [];
  console.log(`Loaded ${destinations.length} tourist destinations.`);
} catch (e) {
  console.warn('Could not transpile seedDestinations:', e.message);
}

// -------------------------------------------------------------
// 4. PREPARE STRUCTURED EXCEL DATA
// -------------------------------------------------------------
// Sheet 1: Top 100 Foods
const top100Data = top100Foods.map((f, i) => ({
  'ល.រ (No)': i + 1,
  'Food ID': f.id,
  'ឈ្មោះម្ហូបខ្មែរ (Khmer Dish Name)': f.nameKh,
  'ឈ្មោះអង់គ្លេស (English Name)': f.nameEn,
  'ប្រភេទម្ហូប (Category)': f.categoryKh,
  'តម្លៃជាប្រាក់រៀល (Price Riel)': f.priceRiel,
  'តម្លៃជាប្រាក់ដុល្លារ (Price USD)': f.priceUsd
}));

// Sheet 2: All Foods
const allFoodsData = allFoods.map((f, i) => ({
  'ល.រ (No)': i + 1,
  'Food ID': f.id,
  'ឈ្មោះម្ហូបខ្មែរ (Khmer Dish Name)': f.nameKh,
  'ឈ្មោះអង់គ្លេស (English Name)': f.nameEn,
  'ប្រភេទម្ហូប (Category)': f.categoryKh,
  'តម្លៃជាប្រាក់រៀល (Price Riel)': f.priceRiel,
  'តម្លៃជាប្រាក់ដុល្លារ (Price USD)': f.priceUsd
}));

// Sheet 3: All 215 Shops (Separated Clean Columns for Khmer & English)
const shopsData = shops.map((r, i) => ({
  'ល.រ (No)': i + 1,
  'Shop ID': r.id,
  'ឈ្មោះហាងខ្មែរ (Khmer Shop Name)': r.nameKh,
  'ឈ្មោះហាងអង់គ្លេស (English Shop Name)': r.nameEn,
  'ខេត្ត/រាជធានីខ្មែរ (Khmer Province)': r.provinceKh,
  'ខេត្ត/រាជធានីអង់គ្លេស (English Province)': r.provinceEn,
  'អាសយដ្ឋានខ្មែរ (Khmer Address)': r.addressKh,
  'អាសយដ្ឋានអង់គ្លេស (English Address)': r.addressEn,
  'កម្រិតតម្លៃ (Price Level)': r.priceLevel,
  'លេខទូរស័ព្ទ (Phone)': r.phone
}));

// Sheet 4: Destinations
const destData = destinations.map((d, idx) => ({
  'ល.រ (No)': idx + 1,
  'Destination ID': d.id,
  'ឈ្មោះកន្លែងទេសចរណ៍ (Khmer Name)': d.nameKh,
  'ឈ្មោះជាភាសាអង់គ្លេស (English Name)': d.nameEn,
  'ប្រភេទកន្លែង (Category)': d.categoryKh,
  'ខេត្ត/រាជធានី (Province/City)': d.provinceKh,
  'អាសយដ្ឋាន (Address)': d.addressKh,
  'តម្លៃសំបុត្រ/ចូលទស្សនា (Entrance Fee)': d.entranceFeeKh || d.entryFeeKh || 'ចូលទស្សនាឥតគិតថ្លៃ',
  'ពេលវេលាល្អសម្រាប់ដើរលេង (Best Time)': d.bestTimeToVisitKh || 'ពេលព្រឹក ឬពេលរសៀល'
}));

// -------------------------------------------------------------
// 5. CREATE AND WRITE EXCEL WORKBOOK
// -------------------------------------------------------------
const wb = XLSX.utils.book_new();

// Set up Sheet 1
const wsTop100 = XLSX.utils.json_to_sheet(top100Data);
wsTop100['!cols'] = [
  { wch: 10 }, { wch: 14 }, { wch: 38 }, { wch: 42 }, { wch: 25 }, { wch: 26 }, { wch: 26 }
];
XLSX.utils.book_append_sheet(wb, wsTop100, 'Top 100 Foods (ម្ហូប១០០មុខ)');

// Set up Sheet 2
const wsAllFoods = XLSX.utils.json_to_sheet(allFoodsData);
wsAllFoods['!cols'] = [
  { wch: 10 }, { wch: 14 }, { wch: 38 }, { wch: 42 }, { wch: 25 }, { wch: 26 }, { wch: 26 }
];
XLSX.utils.book_append_sheet(wb, wsAllFoods, 'All 230 Foods (ម្ហូបទាំងអស់)');

// Set up Sheet 3
const wsShops = XLSX.utils.json_to_sheet(shopsData);
wsShops['!cols'] = [
  { wch: 10 }, // No
  { wch: 14 }, // Shop ID
  { wch: 42 }, // Khmer Shop Name
  { wch: 42 }, // English Shop Name
  { wch: 22 }, // Khmer Province
  { wch: 22 }, // English Province
  { wch: 55 }, // Khmer Address
  { wch: 55 }, // English Address
  { wch: 18 }, // Price Level
  { wch: 20 }  // Phone
];
XLSX.utils.book_append_sheet(wb, wsShops, 'All 215 Shops (ហាងទាំងអស់)');

// Set up Sheet 4
if (destData.length > 0) {
  const wsDest = XLSX.utils.json_to_sheet(destData);
  wsDest['!cols'] = [
    { wch: 10 }, { wch: 16 }, { wch: 45 }, { wch: 40 }, { wch: 28 }, { wch: 22 }, { wch: 45 }, { wch: 30 }, { wch: 25 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDest, '119 Destinations (ទេសចរណ៍)');
}

// Write XLSX to Desktop and Project Root
const desktopXlsxPath = path.join(desktopDir, 'Khmer_Food_And_Shops_List.xlsx');
const projectXlsxPath = path.resolve(__dirname, '../Khmer_Food_And_Shops_List.xlsx');

XLSX.writeFile(wb, desktopXlsxPath);
XLSX.writeFile(wb, projectXlsxPath);
console.log(`Saved XLSX to:\n  - ${desktopXlsxPath}\n  - ${projectXlsxPath}`);

// -------------------------------------------------------------
// 6. CSV EXPORTS WITH UTF-8 BOM
// -------------------------------------------------------------
function safeWriteCsvWithBom(filePath, dataArray) {
  if (dataArray.length === 0) return;
  const headers = Object.keys(dataArray[0]);
  let csv = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\r\n';
  dataArray.forEach(row => {
    csv += headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',') + '\r\n';
  });
  
  try {
    fs.writeFileSync(filePath, '\uFEFF' + csv, 'utf8');
    console.log(`Saved CSV: ${filePath}`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.warn(`File ${filePath} is currently open in Excel (EBUSY).`);
      const updatedPath = filePath.replace('.csv', '_Updated.csv');
      fs.writeFileSync(updatedPath, '\uFEFF' + csv, 'utf8');
      console.log(`Saved updated version to: ${updatedPath}`);
    } else {
      throw err;
    }
  }
}

const desktopFoodsCsv = path.join(desktopDir, 'Khmer_Foods_List.csv');
const desktopShopsCsv = path.join(desktopDir, 'Khmer_Shops_List.csv');

safeWriteCsvWithBom(desktopFoodsCsv, allFoodsData);
safeWriteCsvWithBom(desktopShopsCsv, shopsData);

