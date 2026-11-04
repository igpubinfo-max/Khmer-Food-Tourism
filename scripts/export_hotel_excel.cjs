/**
 * Hotel Data & Photo Insert Excel Template Generator
 * Generates:
 *   - templates/KhmerFoodTourism_Hotel_Photo_Insert_Template.xlsx
 *   - KhmerFoodTourism_Hotel_Photo_Insert_Template.xlsx (Project Root)
 *   - C:\Users\igpub\Desktop\KhmerFoodTourism_Hotel_Photo_Insert_Template.xlsx (Desktop)
 *
 * Features:
 * - Exports ALL 205+ Hotels from `src/data/seedHotels100.ts` without losing any field.
 * - Provides a dedicated tall Photo Paste Zone in Column D (`រូបភាពសណ្ឋាគារ / ដាក់រូបថ្មី (Paste Photo Here)`)
 *   and a file path / URL column in Column E (`New_Photo_Path_or_URL`).
 * - Embeds any existing local hotel photo thumbnail (`public/destinations/hotel-*.jpg`) in Column D.
 *
 * Usage:
 *   node scripts/export_hotel_excel.cjs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ts = require('typescript');
const ExcelJS = require('exceljs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(PROJECT_ROOT, 'templates');
const DESTS_IMG_DIR = path.join(PROJECT_ROOT, 'public', 'destinations');
const TEMPLATE_FILENAME = 'KhmerFoodTourism_Hotel_Photo_Insert_Template.xlsx';
const OUTPUT_PATH = path.join(TEMPLATES_DIR, TEMPLATE_FILENAME);
const ROOT_COPY_PATH = path.join(PROJECT_ROOT, TEMPLATE_FILENAME);
const DESKTOP_COPY_PATH = path.join('C:\\Users\\igpub\\Desktop', TEMPLATE_FILENAME);

if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

function loadHotels() {
  const fullPath = path.join(PROJECT_ROOT, 'src', 'data', 'seedHotels100.ts');
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
  return mod.exports.seedHotels100 || [];
}

async function generateHotelWorkbook() {
  const hotels = loadHotels();
  console.log(`Loaded ${hotels.length} hotels from src/data/seedHotels100.ts`);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Cambodia Flavors & Tourism';
  wb.lastModifiedBy = 'Admin Hotel Management';
  wb.created = new Date();
  wb.modified = new Date();

  // Sheet 1: Hotels_Photo_Template (Main Data & Photo Insert Sheet)
  const ws = wb.addWorksheet('Hotels_Photo_Template', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 1 }],
  });

  ws.columns = [
    { key: 'no', width: 8 },
    { key: 'id', width: 14 },
    { key: 'nameKh', width: 38 },
    { key: 'photoCell', width: 28 },
    { key: 'newPhotoSource', width: 32 },
    { key: 'nameEn', width: 36 },
    { key: 'provinceKh', width: 20 },
    { key: 'provinceEn', width: 18 },
    { key: 'categoryKh', width: 24 },
    { key: 'priceRange', width: 18 },
    { key: 'phone', width: 18 },
    { key: 'addressKh', width: 36 },
    { key: 'addressEn', width: 34 },
    { key: 'mapUrl', width: 38 },
    { key: 'latitude', width: 13 },
    { key: 'longitude', width: 13 },
    { key: 'descriptionKh', width: 48 },
    { key: 'descriptionEn', width: 48 },
    { key: 'targetFilename', width: 24 },
  ];

  const headers = [
    'ល.រ (No)',
    'Hotel_ID',
    'ឈ្មោះសណ្ឋាគារ (Name_KH)',
    'រូបភាពសណ្ឋាគារ / ដាក់រូបថ្មី (Paste Photo Here)',
    'ផ្លូវឯកសារ ឬ URL រូបថ្មី (New_Photo_Path_or_URL)',
    'ឈ្មោះអង់គ្លេស (Name_EN)',
    'ខេត្ត/រាជធានី (Province_KH)',
    'Province_EN',
    'ប្រភេទសណ្ឋាគារ (Category_KH)',
    'តម្លៃបន្ទប់ (Room_Rate)',
    'លេខទូរស័ព្ទ (Phone)',
    'អាសយដ្ឋានខ្មែរ (Address_KH)',
    'អាសយដ្ឋានអង់គ្លេស (Address_EN)',
    'លីងផែនទី (Google_Maps_URL)',
    'Latitude',
    'Longitude',
    'ការពិពណ៌នាខ្មែរ (Description_KH)',
    'ការពិពណ៌នាអង់គ្លេស (Description_EN)',
    'ឈ្មោះឯកសាររូបភាព (Target_Filename)',
  ];

  const headerRow = ws.getRow(1);
  headerRow.values = headers;
  headerRow.height = 40;
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

  for (let idx = 0; idx < hotels.length; idx++) {
    const h = hotels[idx];
    const rowNum = idx + 2;
    const row = ws.getRow(rowNum);
    row.values = [
      idx + 1,
      h.id || `hotel-${idx + 1}`,
      h.nameKh || '',
      '',
      '',
      h.nameEn || '',
      h.provinceKh || '',
      h.provinceEn || '',
      h.categoryKh || 'សណ្ឋាគារ & កន្លែងស្នាក់នៅ',
      h.priceRange || '',
      h.phone || '',
      h.addressKh || '',
      h.addressEn || '',
      h.mapUrl || '',
      typeof h.latitude === 'number' ? h.latitude : '',
      typeof h.longitude === 'number' ? h.longitude : '',
      h.descriptionKh || '',
      h.descriptionEn || '',
      h.photoUrl || `/destinations/${h.id}.jpg`,
    ];
    row.height = 76;

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

    // Embed current local hotel photo thumbnail in Column D if file exists
    const relPhoto = String(h.photoUrl || '').split('?')[0].replace(/^\//, '');
    const candidatePath = relPhoto
      ? path.join(PROJECT_ROOT, 'public', relPhoto)
      : path.join(DESTS_IMG_DIR, `${h.id}.jpg`);
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      try {
        const imgBuf = fs.readFileSync(candidatePath);
        const imgSha = crypto.createHash('sha256').update(imgBuf).digest('hex');
        baselineHashes.push([h.id, imgSha]);
        const isPng =
          imgBuf.length > 8 &&
          imgBuf[0] === 0x89 &&
          imgBuf[1] === 0x50 &&
          imgBuf[2] === 0x4e &&
          imgBuf[3] === 0x47;
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
  guide.columns = [{ width: 32 }, { width: 95 }];
  const guideRows = [
    ['របៀបប្រើប្រាស់ (How to Use)', 'KhmerFoodTourism Hotel Photo & Data Management Template (205 Hotels)'],
    [
      '1. ដាក់រូបភាពក្នុង Excel ផ្ទាល់ (Paste/Insert Image in Col D)',
      'ចុចលើក្រឡា Column D (រូបភាពសណ្ឋាគារ / ដាក់រូបថ្មី) នៃសណ្ឋាគារដែលចង់ដាក់រូប -> Insert -> Pictures -> Place in Cell (ឬ Copy & Paste រូបភាពដាក់ចំក្រឡានោះ)។',
    ],
    [
      '2. ឬដាក់ផ្លូវឯកសារ / URL រូបភាព (Col E)',
      'លោកអ្នកក៏អាចដាក់ផ្លូវរូបភាពក្នុងកុំព្យូទ័រ (ឧ. C:\\Photos\\hotel-1.jpg) ឬ URL រូបភាព (https://...) នៅក្នុង Column E (New_Photo_Path_or_URL) បានផងដែរ។',
    ],
    [
      '3. កែប្រែព័ត៌មានសណ្ឋាគារ តម្លៃបន្ទប់ ទូរស័ព្ទ & Google Maps',
      'អាចកែឈ្មោះខ្មែរ/អង់គ្លេស ខេត្ត ប្រភេទ តម្លៃបន្ទប់ (Room_Rate) លេខទូរស័ព្ទ (Phone) អាសយដ្ឋាន Google_Maps_URL Latitude/Longitude ឬការពិពណ៌នា។ ក្រឡាណាដែលទុកទទេ នឹងមិនលុបទិន្នន័យចាស់ឡើយ។',
    ],
    [
      '4. នាំចូលមកក្នុងកម្មវិធីវិញ (Import Command ឬក្នុង Admin Dashboard)',
      'បន្ទាប់ពីរក្សាទុក (Save) ឯកសារ Excel នេះ សូមចូលទៅកាន់ Admin Dashboard -> ផ្នែក «សណ្ឋាគារ (Hotels)» -> ចុច «នាំចូលពី Excel (Import Hotel Excel)» ឬរត់ពាក្យបញ្ជា៖  node scripts/import_hotel_excel.cjs',
    ],
    [
      '5. កុំប្តូរ Hotel_ID (Col B)',
      'សូមរក្សា Hotel_ID (ឧ. hotel-1, hotel-2 ... hotel-205) ឱ្យនៅដដែល ដើម្បីភ្ជាប់រូបភាព និងទិន្នន័យឱ្យចំសណ្ឋាគារនីមួយៗ។ ប្រសិនបើចង់បន្ថែមសណ្ឋាគារថ្មី សូមបន្ថែមជួរថ្មីនៅខាងក្រោម (ឧ. hotel-206)។',
    ],
  ];
  guideRows.forEach((vals, i) => {
    const r = guide.getRow(i + 1);
    r.values = vals;
    r.height = i === 0 ? 34 : 42;
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

  // Sheet 3: Hidden baseline hash manifest
  const metaWs = wb.addWorksheet('_Template_Meta', { state: 'veryHidden' });
  metaWs.getRow(1).values = ['Hotel_ID', 'Embedded_SHA256'];
  baselineHashes.forEach(([hotelId, hash], idx) => {
    metaWs.getRow(idx + 2).values = [hotelId, hash];
  });

  await wb.xlsx.writeFile(OUTPUT_PATH);
  try {
    fs.copyFileSync(OUTPUT_PATH, ROOT_COPY_PATH);
  } catch {}
  try {
    if (fs.existsSync('C:\\Users\\igpub\\Desktop')) {
      fs.copyFileSync(OUTPUT_PATH, DESKTOP_COPY_PATH);
    }
  } catch {}

  console.log(`Generated Hotel Excel Template:`);
  console.log(`  1) ${OUTPUT_PATH}`);
  console.log(`  2) ${ROOT_COPY_PATH}`);
  console.log(`  3) ${DESKTOP_COPY_PATH}`);
  console.log(`Total Rows: ${hotels.length} hotels (${embeddedCount} embedded thumbnails)`);
}

generateHotelWorkbook().catch((err) => {
  console.error('Failed to generate Hotel Excel Template:', err);
  process.exit(1);
});
