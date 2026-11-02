/**
 * Travel Data & Photo Management Excel Template Generator
 * Generates: templates/KhmerFoodTourism_Travel_Data_Management_Template.xlsx
 *
 * Features:
 * - Exports ALL Travel destinations from `src/data/seedDestinations.ts` without losing any field.
 * - Embeds each destination's current local photo thumbnail (`public/destinations/dest-*.jpg`) in Column D
 *   so Admin can visually inspect every photo and paste/insert replacement photos directly in Excel
 *   (supports Excel 365 "Place in Cell", floating image paste, or pasting a file path / URL in Column E).
 *
 * Usage:
 *   node scripts/export_travel_excel.cjs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ts = require('typescript');
const ExcelJS = require('exceljs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(PROJECT_ROOT, 'templates');
const DESTS_IMG_DIR = path.join(PROJECT_ROOT, 'public', 'destinations');
const OUTPUT_PATH = path.join(TEMPLATES_DIR, 'KhmerFoodTourism_Travel_Data_Management_Template.xlsx');

if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

function loadDestinations() {
  const fullPath = path.join(PROJECT_ROOT, 'src', 'data', 'seedDestinations.ts');
  const code = fs.readFileSync(fullPath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} };
  const customRequire = (id) => {
    if (id.includes('types')) return {};
    return require(id);
  };
  new Function('module', 'exports', 'require', transpiled)(mod, mod.exports, customRequire);
  return mod.exports.initial100Destinations || [];
}

async function generateTravelWorkbook() {
  const destinations = loadDestinations();
  console.log(`Loaded ${destinations.length} travel destinations from src/data/seedDestinations.ts`);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Cambodia Flavors & Tourism';
  wb.created = new Date();

  // Sheet 1: Travel_Destinations (Main Data & Photo Management Sheet)
  const ws = wb.addWorksheet('Travel_Destinations', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 1 }],
  });

  ws.columns = [
    { key: 'no', width: 8 },
    { key: 'id', width: 14 },
    { key: 'nameKh', width: 36 },
    { key: 'photoCell', width: 22 },
    { key: 'newPhotoSource', width: 32 },
    { key: 'nameEn', width: 36 },
    { key: 'provinceKh', width: 20 },
    { key: 'provinceEn', width: 18 },
    { key: 'categorySlug', width: 16 },
    { key: 'categoryKh', width: 24 },
    { key: 'addressKh', width: 34 },
    { key: 'mapUrl', width: 38 },
    { key: 'latitude', width: 13 },
    { key: 'longitude', width: 13 },
    { key: 'descriptionKh', width: 48 },
    { key: 'descriptionEn', width: 48 },
    { key: 'bestTimeKh', width: 28 },
    { key: 'currentPhoto', width: 26 },
  ];

  const headers = [
    'ល.រ (No)',
    'Destination_ID',
    'ឈ្មោះតំបន់ទេសចរណ៍ (Name_KH)',
    'រូបភាពបច្ចុប្បន្ន / ដាក់រូបថ្មី (Photo)',
    'ផ្លូវឯកសារ ឬ URL រូបថ្មី (New_Photo_Path_or_URL)',
    'ឈ្មោះអង់គ្លេស (Name_EN)',
    'ខេត្ត/រាជធានី (Province_KH)',
    'Province_EN',
    'Category_Slug',
    'ប្រភេទ (Category_KH)',
    'អាសយដ្ឋាន (Address_KH)',
    'លីងផែនទី (Google_Maps_URL)',
    'Latitude',
    'Longitude',
    'ការពិពណ៌នាខ្មែរ (Description_KH)',
    'ការពិពណ៌នាអង់គ្លេស (Description_EN)',
    'ពេលវេលាល្អបំផុត (Best_Time_KH)',
    'ឯកសាររូបបច្ចុប្បន្ន (Current_Photo)',
  ];

  const headerRow = ws.getRow(1);
  headerRow.values = headers;
  headerRow.height = 38;
  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colNumber === 4 || colNumber === 5 ? 'FF047857' : 'FF064E3B' },
    };
    cell.font = { name: 'Khmer OS Siemreap', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF064E3B' } },
      bottom: { style: 'medium', color: { argb: 'FF064E3B' } },
      left: { style: 'thin', color: { argb: 'FF0F766E' } },
      right: { style: 'thin', color: { argb: 'FF0F766E' } },
    };
  });

  let embeddedCount = 0;
  const baselineHashes = [];

  for (let idx = 0; idx < destinations.length; idx++) {
    const d = destinations[idx];
    const rowNum = idx + 2;
    const row = ws.getRow(rowNum);
    row.values = [
      idx + 1,
      d.id || '',
      d.nameKh || '',
      '',
      '',
      d.nameEn || '',
      d.provinceKh || '',
      d.provinceEn || '',
      d.categorySlug || '',
      d.categoryKh || '',
      d.addressKh || '',
      d.mapUrl || '',
      typeof d.latitude === 'number' ? d.latitude : '',
      typeof d.longitude === 'number' ? d.longitude : '',
      d.descriptionKh || '',
      d.descriptionEn || '',
      d.bestTimeToVisitKh || '',
      d.photoUrl || `/destinations/${d.id}.jpg`,
    ];
    row.height = 74;

    const isEven = idx % 2 === 0;
    const baseBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      if (colNumber === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF475569' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      } else if (colNumber === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Consolas', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      } else if (colNumber === 4 || colNumber === 5) {
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 4 ? 'center' : 'left', wrapText: true };
        cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF065F46' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cell.font = { name: 'Khmer OS Siemreap', size: 10, color: { argb: 'FF1E293B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      }
    });

    // Embed current local destination photo thumbnail in Column D if file exists
    const relPhoto = String(d.photoUrl || '').split('?')[0].replace(/^\//, '');
    const candidatePath = relPhoto
      ? path.join(PROJECT_ROOT, 'public', relPhoto)
      : path.join(DESTS_IMG_DIR, `${d.id}.jpg`);
    if (fs.existsSync(candidatePath)) {
      try {
        const imgBuf = fs.readFileSync(candidatePath);
        const imgSha = crypto.createHash('sha256').update(imgBuf).digest('hex');
        baselineHashes.push([d.id, imgSha]);
        const isPng = imgBuf.length > 8 && imgBuf[0] === 0x89 && imgBuf[1] === 0x50 && imgBuf[2] === 0x4e && imgBuf[3] === 0x47;
        const imgId = wb.addImage({
          buffer: imgBuf,
          extension: isPng ? 'png' : 'jpeg',
        });
        ws.addImage(imgId, {
          tl: { col: 3.08, row: rowNum - 1 + 0.06 },
          ext: { width: 125, height: 88 },
          editAs: 'oneCell',
        });
        embeddedCount++;
      } catch {}
    }
  }

  // Sheet 2: Instructions (Khmer + English)
  const guide = wb.addWorksheet('Instructions_ណែនាំ');
  guide.columns = [{ width: 28 }, { width: 95 }];
  const guideRows = [
    ['របៀបប្រើប្រាស់ (How to Use)', 'KhmerFoodTourism Travel Data & Photo Management Template'],
    [
      '1. ប្តូររូបភាពក្នុង Excel ផ្ទាល់ (Paste/Insert Image in Col D)',
      'ចុចលើក្រឡា Column D (រូបភាពបច្ចុប្បន្ន / ដាក់រូបថ្មី) នៃតំបន់ទេសចរណ៍ដែលចង់ប្តូរ -> Insert -> Pictures -> Place in Cell (ឬ Paste រូបភាពពីលើ)។ រូបភាពចាស់ដែលមិនបានកែ នឹងត្រូវរក្សាទុកដដែល 100%។',
    ],
    [
      '2. ឬដាក់ផ្លូវឯកសារ / URL (Col E)',
      'លោកអ្នកក៏អាចដាក់ផ្លូវរូបភាពក្នុងកុំព្យូទ័រ (ឧ. C:\\Photos\\tuol_sleng.jpg) ឬ URL រូបភាព (https://...) នៅក្នុង Column E (New_Photo_Path_or_URL) បានផងដែរ។',
    ],
    [
      '3. កែប្រែព័ត៌មានអត្ថបទ & Google Maps',
      'អាចកែឈ្មោះខ្មែរ/អង់គ្លេស ខេត្ត ប្រភេទ អាសយដ្ឋាន Google_Maps_URL Latitude/Longitude ឬការពិពណ៌នា។ ក្រឡាណាដែលទុកទទេ នឹងមិនលុបទិន្នន័យចាស់ឡើយ (Non-Destructive Merge)។',
    ],
    [
      '4. នាំចូលមកក្នុងកម្មវិធីវិញ (Import Command)',
      'បន្ទាប់ពីរក្សាទុក (Save) ឯកសារ Excel នេះ សូមរត់ពាក្យបញ្ជា៖  node scripts/import_travel_excel.cjs',
    ],
    [
      '5. កុំប្តូរ Destination_ID (Col B)',
      'សូមរក្សា Destination_ID (ឧ. dest-1, dest-2...) ឱ្យនៅដដែល ដើម្បីភ្ជាប់រូបភាព និងទិន្នន័យឱ្យចំទីតាំងនីមួយៗ។ ប្រសិនបើចង់បន្ថែមតំបន់ថ្មី សូមបន្ថែមជួរថ្មីនៅខាងក្រោម (ឧ. dest-297)។',
    ],
  ];
  guideRows.forEach((vals, i) => {
    const r = guide.getRow(i + 1);
    r.values = vals;
    r.height = i === 0 ? 32 : 42;
    r.eachCell((c, col) => {
      c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      c.font = {
        name: 'Khmer OS Siemreap',
        size: i === 0 ? 12 : 10.5,
        bold: i === 0 || col === 1,
        color: { argb: i === 0 ? 'FFFFFFFF' : 'FF0F172A' },
      };
      if (i === 0) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };
      }
    });
  });

  // Sheet 3: Hidden baseline hash manifest so untouched embedded thumbnails never trigger false-positive re-imports
  const metaWs = wb.addWorksheet('_Template_Meta', { state: 'veryHidden' });
  metaWs.getRow(1).values = ['Destination_ID', 'Embedded_SHA256'];
  baselineHashes.forEach(([destId, hash], idx) => {
    metaWs.getRow(idx + 2).values = [destId, hash];
  });

  await wb.xlsx.writeFile(OUTPUT_PATH);
  console.log(`✅ Generated Travel Excel Template: ${OUTPUT_PATH} (${destinations.length} rows, ${embeddedCount} embedded thumbnails)`);
}

generateTravelWorkbook().catch((err) => {
  console.error('❌ Failed to generate Travel Excel Template:', err);
  process.exit(1);
});
