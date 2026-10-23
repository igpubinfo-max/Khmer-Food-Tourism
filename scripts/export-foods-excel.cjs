const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = "C:\\Users\\igpub\\.gemini\\antigravity\\brain\\99e5a75e-66d8-483b-8911-48b6490d4423";

// 1. Parse RAW_100_NEW_DISHES from seedAdditional100Foods.ts
const addContent = fs.readFileSync(path.join(PROJECT_ROOT, 'src/data/seedAdditional100Foods.ts'), 'utf8');

// Extract DISH_SPECIFIC_PHOTOS
const photoMatches = {};
const photoRegex = /'food-(\d+)':\s*'([^']+)'/g;
let pMatch;
while ((pMatch = photoRegex.exec(addContent)) !== null) {
  photoMatches[`food-${pMatch[1]}`] = pMatch[2];
}

// Extract objects from RAW_100_NEW_DISHES
const dishRegex = /{\s*nameKh:\s*'([^']+)',\s*nameEn:\s*'([^']+)',\s*cat:\s*'([^']+)',\s*catKh:\s*'([^']+)',\s*catEn:\s*'([^']+)',\s*mainIngKh:\s*'([^']+)',\s*mainIngEn:\s*'([^']+)'/g;

const new100Foods = [];
let dMatch;
let idx = 101;
while ((dMatch = dishRegex.exec(addContent)) !== null) {
  const foodId = `food-${idx}`;
  new100Foods.push({
    'ល.រ (No)': idx - 100,
    'Food ID': foodId,
    'ឈ្មោះម្ហូបខ្មែរ (Khmer Name)': dMatch[1],
    'ឈ្មោះអង់គ្លេស (English Name)': dMatch[2],
    'ប្រភេទ (Category)': dMatch[4],
    'គ្រឿងផ្សំគោល (Main Ingredient)': dMatch[6],
    'រូបភាពបច្ចុប្បន្ន (Current Photo)': photoMatches[foodId] || `/foods/${foodId}.jpg`,
    'ឈ្មោះឯកសាររូបភាពត្រូវដាក់ (Target Filename)': `${foodId}.jpg`,
    'តំណភ្ជាប់រូបភាពថ្មី ឬកំណត់សម្គាល់ (Your New Photo URL / Notes)': ''
  });
  idx++;
}

console.log('Extracted new foods count:', new100Foods.length);

// 2. Extract first 100 foods from seedFoods.ts (1-50 and 51-100)
const seedContent = fs.readFileSync(path.join(PROJECT_ROOT, 'src/data/seedFoods.ts'), 'utf8');
const first100Foods = [];

// Foods 1-50
const f1to50Regex = /id:\s*'food-(\d+)',\s*nameKh:\s*'([^']+)',\s*nameEn:\s*'([^']+)',\s*categorySlug:\s*'([^']+)',\s*categoryKh:\s*'([^']+)'(?:.|\n)*?photoUrl:\s*'([^']+)'/g;
let f1Match;
while ((f1Match = f1to50Regex.exec(seedContent)) !== null) {
  const num = parseInt(f1Match[1], 10);
  if (num <= 50) {
    first100Foods.push({
      'ល.រ (No)': num,
      'Food ID': `food-${num}`,
      'ឈ្មោះម្ហូបខ្មែរ (Khmer Name)': f1Match[2],
      'ឈ្មោះអង់គ្លេស (English Name)': f1Match[3],
      'ប្រភេទ (Category)': f1Match[5],
      'គ្រឿងផ្សំគោល (Main Ingredient)': '',
      'រូបភាពបច្ចុប្បន្ន (Current Photo)': f1Match[6],
      'ឈ្មោះឯកសាររូបភាពត្រូវដាក់ (Target Filename)': `food-${num}.jpg`,
      'តំណភ្ជាប់រូបភាពថ្មី ឬកំណត់សម្គាល់ (Your New Photo URL / Notes)': ''
    });
  }
}

// Foods 51-100 from AUTHENTIC_FOOD_RECIPES
const f51to100Regex = /"(food-(\d+))":\s*\{\s*"nameKh":\s*"([^"]+)",\s*"nameEn":\s*"([^"]+)",\s*"cat":\s*"([^"]+)",\s*"catKh":\s*"([^"]+)"/g;
let f51Match;
while ((f51Match = f51to100Regex.exec(seedContent)) !== null) {
  const num = parseInt(f51Match[2], 10);
  first100Foods.push({
    'ល.រ (No)': num,
    'Food ID': `food-${num}`,
    'ឈ្មោះម្ហូបខ្មែរ (Khmer Name)': f51Match[3],
    'ឈ្មោះអង់គ្លេស (English Name)': f51Match[4],
    'ប្រភេទ (Category)': f51Match[6],
    'គ្រឿងផ្សំគោល (Main Ingredient)': '',
    'រូបភាពបច្ចុប្បន្ន (Current Photo)': `/foods/food-${num}.jpg`,
    'ឈ្មោះឯកសាររូបភាពត្រូវដាក់ (Target Filename)': `food-${num}.jpg`,
    'តំណភ្ជាប់រូបភាពថ្មី ឬកំណត់សម្គាល់ (Your New Photo URL / Notes)': ''
  });
}

// Sort first100Foods by No
first100Foods.sort((a, b) => a['ល.រ (No)'] - b['ល.រ (No)']);
console.log('Extracted first 100 foods count:', first100Foods.length);

// 3. Create Master Workbook
const wb = xlsx.utils.book_new();

// Sheet 1: 100 Newly Added Foods (The primary list requested)
const ws1 = xlsx.utils.json_to_sheet(new100Foods);
ws1['!cols'] = [
  { wch: 10 }, // No
  { wch: 12 }, // Food ID
  { wch: 35 }, // Khmer Name
  { wch: 45 }, // English Name
  { wch: 25 }, // Category
  { wch: 45 }, // Main Ingredient
  { wch: 35 }, // Current Photo
  { wch: 25 }, // Target Filename
  { wch: 50 }, // Your New Photo
];
xlsx.utils.book_append_sheet(wb, ws1, '100_New_Foods (១០០មុខថ្មី)');

// Sheet 2: First 100 Foods (Reference)
const ws2 = xlsx.utils.json_to_sheet(first100Foods);
ws2['!cols'] = ws1['!cols'];
xlsx.utils.book_append_sheet(wb, ws2, 'First_100_Foods (១០០មុខដំបូង)');

// Sheet 3: Master List of All 200 Foods
const all200Foods = [
  ...first100Foods,
  ...new100Foods.map(f => ({
    'ល.រ (No)': f['ល.រ (No)'] + 100,
    'Food ID': f['Food ID'],
    'ឈ្មោះម្ហូបខ្មែរ (Khmer Name)': f['ឈ្មោះម្ហូបខ្មែរ (Khmer Name)'],
    'ឈ្មោះអង់គ្លេស (English Name)': f['ឈ្មោះអង់គ្លេស (English Name)'],
    'ប្រភេទ (Category)': f['ប្រភេទ (Category)'],
    'គ្រឿងផ្សំគោល (Main Ingredient)': f['គ្រឿងផ្សំគោល (Main Ingredient)'],
    'រូបភាពបច្ចុប្បន្ន (Current Photo)': f['រូបភាពបច្ចុប្បន្ន (Current Photo)'],
    'ឈ្មោះឯកសាររូបភាពត្រូវដាក់ (Target Filename)': f['ឈ្មោះឯកសាររូបភាពត្រូវដាក់ (Target Filename)'],
    'តំណភ្ជាប់រូបភាពថ្មី ឬកំណត់សម្គាល់ (Your New Photo URL / Notes)': ''
  }))
];
const ws3 = xlsx.utils.json_to_sheet(all200Foods);
ws3['!cols'] = ws1['!cols'];
xlsx.utils.book_append_sheet(wb, ws3, 'All_200_Foods (ទាំង២០០មុខ)');

// Output paths
const excelFileName = 'KhmerFoodTourism_100_New_Foods_For_Photo_Update.xlsx';
const csvFileName = 'KhmerFoodTourism_100_New_Foods_For_Photo_Update.csv';
const allCsvFileName = 'KhmerFoodTourism_All_200_Foods.csv';

const projectExcelPath = path.join(PROJECT_ROOT, excelFileName);
xlsx.writeFile(wb, projectExcelPath);

const projectCsvPath = path.join(PROJECT_ROOT, csvFileName);
fs.writeFileSync(projectCsvPath, "\uFEFF" + xlsx.utils.sheet_to_csv(ws1), 'utf8');

const projectAllCsvPath = path.join(PROJECT_ROOT, allCsvFileName);
fs.writeFileSync(projectAllCsvPath, "\uFEFF" + xlsx.utils.sheet_to_csv(ws3), 'utf8');

console.log('✓ Created Excel at:', projectExcelPath);
console.log('✓ Created CSV at:', projectCsvPath);

// Copy to Artifact directory
if (fs.existsSync(ARTIFACT_DIR)) {
  fs.copyFileSync(projectExcelPath, path.join(ARTIFACT_DIR, excelFileName));
  fs.copyFileSync(projectCsvPath, path.join(ARTIFACT_DIR, csvFileName));
  fs.copyFileSync(projectAllCsvPath, path.join(ARTIFACT_DIR, allCsvFileName));
  console.log('✓ Copied to Artifacts directory for user download!');
}
