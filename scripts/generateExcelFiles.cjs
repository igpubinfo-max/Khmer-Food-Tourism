const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1. Load seedFoods.ts
const seedFoodsContent = fs.readFileSync(path.resolve(__dirname, '../src/data/seedFoods.ts'), 'utf8');

// Core foods
const coreFoods = [];
const regexCore = /id:\s*['"](food-\d+)['"],\s*nameKh:\s*['"]([^'"]+)['"],\s*nameEn:\s*['"]([^'"]+)['"],\s*categorySlug:\s*['"]([^'"]+)['"],\s*categoryKh:\s*['"]([^'"]+)['"],[\s\S]*?priceRiel:\s*(\d+),\s*priceUsd:\s*([\d.]+)/g;
let cm;
while ((cm = regexCore.exec(seedFoodsContent)) !== null) {
  coreFoods.push({
    id: cm[1],
    nameKh: cm[2],
    nameEn: cm[3],
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
      nameKh: am[1],
      nameEn: am[2],
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

// Target 100 primary active dishes in App
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

// All 235 dishes in database
const all235Foods = [...top100Foods];
for (const d of additionalDishes) {
  if (!existingNames.has(d.nameKh)) {
    existingNames.add(d.nameKh);
    all235Foods.push({
      id: `food-${all235Foods.length + 1}`,
      nameKh: d.nameKh,
      nameEn: d.nameEn,
      categorySlug: d.cat,
      categoryKh: catNames[d.cat] || 'ម្ហូបខ្មែរ',
      priceRiel: d.priceR,
      priceUsd: d.priceU
    });
  }
}

// 2. Load seedRestaurants.ts
const seedRestaurantsContent = fs.readFileSync(path.resolve(__dirname, '../src/data/seedRestaurants.ts'), 'utf8');
const restaurants = [];
const regexRest = /"id":\s*"(rest-\d+)",\s*"nameKh":\s*"([^"]+)",\s*"nameEn":\s*"([^"]+)",[\s\S]*?"addressKh":\s*"([^"]+)",[\s\S]*?"provinceKh":\s*"([^"]+)",[\s\S]*?"phone":\s*"([^"]*)",[\s\S]*?"priceLevel":\s*"([^"]+)"/g;
let rm;
while ((rm = regexRest.exec(seedRestaurantsContent)) !== null) {
  restaurants.push({
    id: rm[1],
    nameKh: rm[2],
    nameEn: rm[3],
    addressKh: rm[4],
    provinceKh: rm[5],
    phone: rm[6],
    priceLevel: rm[7]
  });
}

console.log(`Ready to export: ${top100Foods.length} top foods, ${all235Foods.length} total foods, ${restaurants.length} restaurants.`);

// 3. Create Excel Workbook
const wb = XLSX.utils.book_new();

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
const wsTop100 = XLSX.utils.json_to_sheet(top100Data);
XLSX.utils.book_append_sheet(wb, wsTop100, 'Top 100 Foods (ម្ហូប១០០មុខ)');

// Sheet 2: All 235 Foods
const allFoodsData = all235Foods.map((f, i) => ({
  'ល.រ (No)': i + 1,
  'Food ID': f.id,
  'ឈ្មោះម្ហូបខ្មែរ (Khmer Dish Name)': f.nameKh,
  'ឈ្មោះអង់គ្លេស (English Name)': f.nameEn,
  'ប្រភេទម្ហូប (Category)': f.categoryKh,
  'តម្លៃជាប្រាក់រៀល (Price Riel)': f.priceRiel,
  'តម្លៃជាប្រាក់ដុល្លារ (Price USD)': f.priceUsd
}));
const wsAllFoods = XLSX.utils.json_to_sheet(allFoodsData);
XLSX.utils.book_append_sheet(wb, wsAllFoods, 'All 235 Foods (ម្ហូបទាំងអស់)');

// Sheet 3: All 215 Shops (Restaurants)
const shopsData = restaurants.map((r, i) => ({
  'ល.រ (No)': i + 1,
  'Shop ID': r.id,
  'ឈ្មោះហាងខ្មែរ (Khmer Shop Name)': r.nameKh,
  'ឈ្មោះអង់គ្លេស (English Name)': r.nameEn,
  'ខេត្ត/រាជធានី (Province)': r.provinceKh,
  'កម្រិតតម្លៃ (Price Level)': r.priceLevel,
  'អាសយដ្ឋាន (Address)': r.addressKh,
  'លេខទូរស័ព្ទ (Phone)': r.phone || '012 345 678'
}));
const wsShops = XLSX.utils.json_to_sheet(shopsData);
XLSX.utils.book_append_sheet(wb, wsShops, 'All 215 Shops (ហាងទាំងអស់)');

// Write XLSX files
const desktopXlsxPath = 'C:/Users/igpub/OneDrive/Desktop/Khmer_Food_And_Shops_List.xlsx';
const projectXlsxPath = path.resolve(__dirname, '../Khmer_Food_And_Shops_List.xlsx');
XLSX.writeFile(wb, desktopXlsxPath);
XLSX.writeFile(wb, projectXlsxPath);
console.log('Saved XLSX to Desktop & Project!');

// 4. Also generate standard CSV files with UTF-8 BOM (so double-clicking opens in Excel without Khmer font distortion)
function writeCsvWithBom(filePath, dataArray) {
  if (dataArray.length === 0) return;
  const headers = Object.keys(dataArray[0]);
  let csv = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\r\n';
  dataArray.forEach(row => {
    csv += headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',') + '\r\n';
  });
  // Prepend UTF-8 BOM (\uFEFF)
  fs.writeFileSync(filePath, '\uFEFF' + csv, 'utf8');
}

writeCsvWithBom('C:/Users/igpub/OneDrive/Desktop/Khmer_Foods_List.csv', top100Data);
writeCsvWithBom('C:/Users/igpub/OneDrive/Desktop/Khmer_Shops_List.csv', shopsData);
console.log('Saved CSV files with UTF-8 BOM to Desktop!');
