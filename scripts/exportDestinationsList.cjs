const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// 1. Transpile and load seedDestinations.ts
const content = fs.readFileSync(path.resolve(__dirname, '../src/data/seedDestinations.ts'), 'utf8');
const trans = ts.transpileModule(content, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const m = { exports: {} };
const fn = new Function('module', 'exports', 'require', trans.outputText);
fn(m, m.exports, () => ({}));

const destinations = m.exports.initial100Destinations;
console.log(`Loaded ${destinations.length} tourist destinations.`);

// 2. Prepare data for Excel & CSV
const exportRows = destinations.map((d, idx) => ({
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

// 3. Create Khmer_Destinations_List.xlsx
const destWb = XLSX.utils.book_new();
const destWs = XLSX.utils.json_to_sheet(exportRows);

// Set column widths
destWs['!cols'] = [
  { wch: 10 }, // No
  { wch: 16 }, // ID
  { wch: 45 }, // Khmer Name
  { wch: 40 }, // English Name
  { wch: 28 }, // Category
  { wch: 22 }, // Province
  { wch: 45 }, // Address
  { wch: 30 }, // Entrance Fee
  { wch: 25 }, // Best Time
];

XLSX.utils.book_append_sheet(destWb, destWs, '119_Khmer_Destinations');

const desktopPath = 'C:\\Users\\igpub\\Desktop';
const destXlsxPath = path.join(desktopPath, 'Khmer_Destinations_List.xlsx');
const destCsvPath = path.join(desktopPath, 'Khmer_Destinations_List.csv');

XLSX.writeFile(destWb, destXlsxPath);
console.log(`Saved Excel: ${destXlsxPath}`);

// CSV export
const csvContent = XLSX.utils.sheet_to_csv(destWs);
fs.writeFileSync(destCsvPath, '\uFEFF' + csvContent, 'utf8'); // UTF-8 BOM for Khmer text in Excel
console.log(`Saved CSV: ${destCsvPath}`);

// 4. Also update the master Khmer_Food_And_Shops_List.xlsx on Desktop if it exists
const masterXlsxPath = path.join(desktopPath, 'Khmer_Food_And_Shops_List.xlsx');
if (fs.existsSync(masterXlsxPath)) {
  try {
    const masterWb = XLSX.readFile(masterXlsxPath);
    // Remove old destinations sheet if already exists
    const sheetName = '119 Destinations (ទេសចរណ៍)';
    if (masterWb.SheetNames.includes(sheetName)) {
      delete masterWb.Sheets[sheetName];
      masterWb.SheetNames = masterWb.SheetNames.filter(s => s !== sheetName);
    }
    XLSX.utils.book_append_sheet(masterWb, destWs, sheetName);
    XLSX.writeFile(masterWb, masterXlsxPath);
    console.log(`Updated Master Excel with Destinations: ${masterXlsxPath}`);
  } catch (err) {
    console.warn('Could not update master xlsx:', err.message);
  }
}

// 5. Save JSON and Markdown reference inside src/data/
const jsonPath = path.resolve(__dirname, '../src/data/touristDestinationsList.json');
fs.writeFileSync(jsonPath, JSON.stringify(destinations, null, 2), 'utf8');

// Generate Markdown
let md = `# បញ្ជីរាយនាមរមណីយដ្ឋាន និងកន្លែងទេសចរណ៍ទូទាំងប្រទេសកម្ពុជា (Khmer Tourist Destinations List)
សរុបទាំងអស់៖ **${destinations.length} កន្លែង** គ្របដណ្តប់លើ ២៥ រាជធានី-ខេត្ត។

---

| ល.រ | កូដ ID | ឈ្មោះកន្លែងទេសចរណ៍ (Khmer) | ឈ្មោះអង់គ្លេស (English) | ប្រភេទ | រាជធានី/ខេត្ត | តម្លៃសំបុត្រចូល |
|-----|--------|---------------------------|-------------------------|-------|---------------|-----------------|
`;

destinations.forEach((d, i) => {
  md += `| ${i+1} | \`${d.id}\` | ${d.nameKh} | ${d.nameEn} | ${d.categoryKh} | ${d.provinceKh} | ${d.entranceFeeKh || d.entryFeeKh || 'ឥតគិតថ្លៃ'} |\n`;
});

const mdPath = path.resolve(__dirname, '../src/data/TOURIST_DESTINATIONS_LIST.md');
fs.writeFileSync(mdPath, md, 'utf8');
console.log(`Saved Markdown: ${mdPath}`);
