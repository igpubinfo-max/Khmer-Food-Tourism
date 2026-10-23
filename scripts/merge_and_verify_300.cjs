const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1. Read existing 124 destinations from src/data/seedDestinations.ts
const seedContent = fs.readFileSync(path.join(__dirname, '../src/data/seedDestinations.ts'), 'utf8');
const match = seedContent.match(/export const initial100Destinations: TouristDestination\[\] = (\[[\s\S]*?\]);/);
if (!match) {
  console.error('Could not parse initial100Destinations from seedDestinations.ts');
  process.exit(1);
}

const batch0 = JSON.parse(match[1]);
const batch1 = require('./batch_125_to_150.cjs');
const batch2 = require('./batch_151_to_200.cjs');
const batch3 = require('./batch_201_to_250.cjs');
const batch4 = require('./batch_251_to_300.cjs');

console.log('Batch 0 (1-124):', batch0.length);
console.log('Batch 1 (125-150):', batch1.length);
console.log('Batch 2 (151-200):', batch2.length);
console.log('Batch 3 (201-250):', batch3.length);
console.log('Batch 4 (251-300):', batch4.length);

const all300 = [...batch0, ...batch1, ...batch2, ...batch3, ...batch4];

if (all300.length !== 300) {
  console.error(`ERROR: Expected exactly 300 destinations, but got ${all300.length}`);
  process.exit(1);
}

// 2. Validate IDs and duplicates
const idSet = new Set();
const nameKhSet = new Set();
const nameEnSet = new Set();

for (let i = 0; i < 300; i++) {
  const item = all300[i];
  const expectedId = `dest-${i + 1}`;
  if (item.id !== expectedId) {
    console.error(`ID mismatch at index ${i}: expected ${expectedId}, got ${item.id}`);
    process.exit(1);
  }
  if (idSet.has(item.id)) {
    console.error(`Duplicate ID: ${item.id}`);
    process.exit(1);
  }
  idSet.add(item.id);

  if (!item.photoUrl || !item.photoUrl.startsWith('http')) {
    console.error(`Invalid photoUrl at ${item.id} (${item.nameKh}): ${item.photoUrl}`);
    process.exit(1);
  }
  if (!item.nameKh || !item.nameEn || !item.provinceKh || !item.provinceEn) {
    console.error(`Missing required fields at ${item.id}`);
    process.exit(1);
  }
}

console.log('✅ Validation passed: Exactly 300 destinations verified with unique sequential IDs and valid photos!');

// 3. Write src/data/seedDestinations.ts
const tsContent = `import { TouristDestination } from '../types';

export const initial100Destinations: TouristDestination[] = ${JSON.stringify(all300, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../src/data/seedDestinations.ts'), tsContent, 'utf8');
console.log('✅ Updated src/data/seedDestinations.ts with 300 destinations.');

// 4. Write src/data/touristDestinationsList.json
fs.writeFileSync(path.join(__dirname, '../src/data/touristDestinationsList.json'), JSON.stringify(all300, null, 2), 'utf8');
console.log('✅ Updated src/data/touristDestinationsList.json.');

// 5. Generate Markdown Documentation
let md = `# តារាងគោលដៅទេសចរណ៍កម្ពុជាទាំង ៣០០ កន្លែង (300 Verified Tourist Destinations in Cambodia)

សៀវភៅបញ្ជីគោលដៅទេសចរណ៍ផ្លូវការប្រចាំកម្មវិធី **Khmer Food & Tourism** គ្រប់ដណ្តប់គ្រប់រាជធានី-ខេត្តទាំង ២៥ ក្នុងព្រះរាជាណាចក្រកម្ពុជា។

| ល.រ (ID) | ឈ្មោះទីតាំងខ្មែរ | English Name | ខេត្ត / រាជធានី | ប្រភេទ | ពិន្ទុ |
| :--- | :--- | :--- | :--- | :--- | :--- |
`;

all300.forEach((d, idx) => {
  md += `| ${d.id} | **${d.nameKh}** | ${d.nameEn} | ${d.provinceKh} (${d.provinceEn}) | ${d.categoryKh} | ⭐ ${d.rating} (${d.reviewCount}) |\n`;
});

fs.writeFileSync(path.join(__dirname, '../src/data/TOURIST_DESTINATIONS_LIST.md'), md, 'utf8');
console.log('✅ Generated src/data/TOURIST_DESTINATIONS_LIST.md.');

// 6. Generate Excel and CSV
const excelRows = all300.map((d, idx) => ({
  'ID': d.id,
  'No': idx + 1,
  'ឈ្មោះទីតាំងទេសចរណ៍ (Khmer)': d.nameKh,
  'Destination Name (English)': d.nameEn,
  'ខេត្ត/រាជធានី (Khmer)': d.provinceKh,
  'Province (English)': d.provinceEn,
  'ប្រភេទ (Category Khmer)': d.categoryKh,
  'Category (English)': d.categoryEn,
  'ពិន្ទុ (Rating)': d.rating,
  'ចំនួនវាយតម្លៃ (Reviews)': d.reviewCount,
  'តម្លៃសំបុត្រ (Entrance Fee Khmer)': d.entranceFeeKh,
  'Entrance Fee (English)': d.entranceFeeEn,
  'ពេលវេលាល្អបំផុត (Best Time Khmer)': d.bestTimeToVisitKh,
  'Best Time (English)': d.bestTimeToVisitEn,
  'អាសយដ្ឋាន (Address Khmer)': d.addressKh,
  'Address (English)': d.addressEn,
  'ការពិពណ៌នា (Description Khmer)': d.descriptionKh,
  'Description (English)': d.descriptionEn,
  'Photo URL': d.photoUrl,
  'Google Maps URL': d.mapUrl,
  'Latitude': d.latitude,
  'Longitude': d.longitude
}));

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(excelRows);
XLSX.utils.book_append_sheet(wb, ws, '300_Tourist_Destinations');

const excelPath = path.join(__dirname, '../public/KhmerFoodTourism_All_300_Destinations.xlsx');
XLSX.writeFile(wb, excelPath);
console.log('✅ Generated public/KhmerFoodTourism_All_300_Destinations.xlsx');

// Also write CSV
const csvPath = path.join(__dirname, '../public/KhmerFoodTourism_All_300_Destinations.csv');
const csvContent = XLSX.utils.sheet_to_csv(ws);
fs.writeFileSync(csvPath, csvContent, 'utf8');
console.log('✅ Generated public/KhmerFoodTourism_All_300_Destinations.csv');

console.log('\n🎉 ALL 300 TOURIST DESTINATIONS SUCCESSFULLY MERGED, VERIFIED, AND DOCUMENTED!');
