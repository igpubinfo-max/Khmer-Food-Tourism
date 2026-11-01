/**
 * Generates:
 *   1. KhmerFoodTourism_Food_1_to_100_Photo_Template.xlsx (Food 1 to 100 + All 1 to 200, with current photos embedded in Col D)
 *   2. KhmerFoodTourism_Travel_Photo_Insert_Template.xlsx (All 296 Travel Destinations, with current photos embedded in Col D)
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const ExcelJS = require('exceljs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(PROJECT_ROOT, 'templates');
const ARTIFACT_DIR = 'C:\\Users\\igpub\\.gemini\\antigravity\\brain\\99e5a75e-66d8-483b-8911-48b6490d4423';

if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

function loadTsModule(relPath) {
  const fullPath = path.join(PROJECT_ROOT, relPath);
  const code = fs.readFileSync(fullPath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} };
  const customRequire = (id) => {
    if (id.includes('seedAdditional100Foods')) {
      return loadTsModule('src/data/seedAdditional100Foods.ts');
    }
    if (id.includes('khmerRecipeGenerator')) {
      return loadTsModule('src/utils/khmerRecipeGenerator.ts');
    }
    if (id.includes('types')) {
      return { SEED_FOOD_PHOTO_BASELINE_ISO: '2026-10-30T00:00:00.000Z' };
    }
    return require(id);
  };
  new Function('module', 'exports', 'require', transpiled)(mod, mod.exports, customRequire);
  return mod.exports;
}

const all200FoodsRaw = loadTsModule('src/data/seedFoods.ts').initial200Foods || [];
const allDestinationsRaw = loadTsModule('src/data/seedDestinations.ts').initial100Destinations || [];

console.log(`Loaded ${all200FoodsRaw.length} foods (food-1 to food-200) and ${allDestinationsRaw.length} travel destinations.`);

function applyStandardSheetFormatting(wb, ws, headers, items, options) {
  const { idHeader, nameKhHeader, photoHeader, nameEnHeader, catHeader, fileHeader } = headers;

  ws.columns = [
    { key: 'no', width: 9 },
    { key: 'id', width: 16 },
    { key: 'nameKh', width: 36 },
    { key: 'photo', width: 22 },
    { key: 'nameEn', width: 46 },
    { key: 'category', width: 28 },
    { key: 'filename', width: 22 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.values = [
    'ល.រ (No)',
    idHeader,
    nameKhHeader,
    photoHeader,
    nameEnHeader,
    catHeader,
    fileHeader,
  ];
  headerRow.height = 36;

  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colNumber === 4 ? 'FF047857' : 'FF064E3B' },
    };
    cell.font = {
      name: 'Segoe UI',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF064E3B' } },
      bottom: { style: 'medium', color: { argb: 'FF064E3B' } },
      left: { style: 'thin', color: { argb: 'FF0F766E' } },
      right: { style: 'thin', color: { argb: 'FF0F766E' } },
    };
  });

  items.forEach((item, idx) => {
    const rowNum = idx + 2;
    const row = ws.getRow(rowNum);
    row.values = [
      idx + 1,
      item.id,
      item.nameKh,
      '', // Col D holds the embedded preview / paste zone
      item.nameEn,
      item.categoryLabel,
      item.filename,
    ];
    row.height = 75;

    const isEven = idx % 2 === 0;
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
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' } };
      } else if (colNumber === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Consolas', size: 11, bold: true, color: { argb: 'FF0F172A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' } };
      } else if (colNumber === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
        cell.font = { name: 'Khmer OS Siemreap', size: 11.5, bold: true, color: { argb: 'FF0F172A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' } };
      } else if (colNumber === 4) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFA7F3D0' } },
          bottom: { style: 'thin', color: { argb: 'FFA7F3D0' } },
          left: { style: 'medium', color: { argb: 'FF34D399' } },
          right: { style: 'medium', color: { argb: 'FF34D399' } },
        };
      } else if (colNumber === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
        cell.font = { name: 'Segoe UI', size: 11, color: { argb: 'FF334155' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' } };
      } else if (colNumber === 6) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cell.font = { name: 'Khmer OS Siemreap', size: 10, color: { argb: 'FF64748B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' } };
      } else if (colNumber === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Consolas', size: 10, color: { argb: 'FF64748B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' } };
      }
    });

    if (options.embedPhotos && item.diskPhotoPath && fs.existsSync(item.diskPhotoPath)) {
      try {
        const ext = path.extname(item.diskPhotoPath).toLowerCase().replace('.', '');
        const validExt = ext === 'png' ? 'png' : 'jpeg';
        const imgId = wb.addImage({
          filename: item.diskPhotoPath,
          extension: validExt,
        });
        ws.addImage(imgId, {
          tl: { col: 3.12, row: rowNum - 1 + 0.06 },
          ext: { width: 118, height: 88 },
          editAs: 'oneCell',
        });
      } catch (e) {
        // Ignore single image embed error
      }
    }
  });
}

function addInstructionsSheet(wb, titleKh) {
  const instructWs = wb.addWorksheet('Instructions (ការណែនាំ)');
  instructWs.columns = [{ width: 5 }, { width: 95 }];
  instructWs.addRow([]);
  instructWs.addRow(['', `📋 សេចក្តីណែនាំអំពីរបៀបប្តូររូបភាព និងឈ្មោះ (${titleKh})`]);
  instructWs.getRow(2).font = { name: 'Segoe UI', size: 15, bold: true, color: { argb: 'FF064E3B' } };
  instructWs.addRow([]);

  const instructions = [
    'ជំហានទី ១ (Step 1): បើកផ្ទាំងតារាងទី១ ដែលមានបង្ហាញរូបភាពបច្ចុប្បន្នក្នុងជួរឈរ D ស្រាប់។',
    'ជំហានទី ២ (Step 2): សម្រាប់មុខម្ហូប ឬកន្លែងទេសចរណ៍ណាដែលបងចង់ប្តូររូបភាព សូមលុបរូបចាស់ក្នុងប្រអប់ជួរឈរ D នោះ (ឬចុចលើប្រអប់ជួរឈរ D តែម្តង) រួច Paste (Ctrl + V) រូបភាពថ្មីចូល។',
    'ជំហានទី ៣ (Step 3): បងក៏អាចកែឈ្មោះភាសាខ្មែរ (ជួរឈរ C) ឬឈ្មោះភាសាអង់គ្លេស (ជួរឈរ E) ក្នុងតារាងនេះបានដែរ។',
    'ជំហានទី ៤ (Step 4): ក្រោយពេលកែ និងដាក់រូបរួចរាល់ សូមចុច Save (Ctrl + S) រួចប្រាប់ខ្ញុំក្នុង Chat ខ្ញុំនឹងទាញរូបភាព និងឈ្មោះថ្មីទាំងអស់ដាក់ចូលក្នុងកូដ និងបង្កើត APK ជូនបងភ្លាមៗ!',
  ];

  instructions.forEach((ins, idx) => {
    const r = instructWs.addRow(['', `${idx + 1}. ${ins}`]);
    r.font = { name: 'Khmer OS Siemreap', size: 12, color: { argb: 'FF1E293B' } };
    r.height = 28;
  });
}

async function generateAllTemplates() {
  // Prepare Food items (1..200)
  const foodItems = all200FoodsRaw.map((f) => {
    const cleanRel = (f.photoUrl || `/foods/${f.id}.jpg`).split('?')[0].replace(/^\//, '');
    return {
      id: f.id,
      nameKh: f.nameKh,
      nameEn: f.nameEn,
      categoryLabel: f.categoryKh,
      filename: path.basename(cleanRel) || `${f.id}.jpg`,
      diskPhotoPath: path.join(PROJECT_ROOT, 'public', cleanRel),
    };
  });

  const food1To100 = foodItems.slice(0, 100);
  const food101To200 = foodItems.slice(100, 200);

  // 1. Build Food 1-100 Template Workbook
  const foodWb = new ExcelJS.Workbook();
  foodWb.creator = 'Khmer Food & Tourism App';
  foodWb.created = new Date();

  const foodHeaders = {
    idHeader: 'Food ID',
    nameKhHeader: 'ឈ្មោះម្ហូបខ្មែរ (Khmer Name)',
    photoHeader: 'រូបភាពម្ហូប (Paste Photo Here)',
    nameEnHeader: 'ឈ្មោះអង់គ្លេស (English Name)',
    catHeader: 'ប្រភេទ (Category)',
    fileHeader: 'ឈ្មោះរូបភាព (Target Filename)',
  };

  const wsFood1To100 = foodWb.addWorksheet('Food_1_to_100 (ម្ហូប ១-១០០)', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  applyStandardSheetFormatting(foodWb, wsFood1To100, foodHeaders, food1To100, { embedPhotos: true });

  const wsFood101To200 = foodWb.addWorksheet('Food_101_to_200 (១០១-២០០)', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  applyStandardSheetFormatting(foodWb, wsFood101To200, foodHeaders, food101To200, { embedPhotos: true });

  const wsFoodAll200 = foodWb.addWorksheet('All_200_Foods (ទាំង២០០មុខ)', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  applyStandardSheetFormatting(foodWb, wsFoodAll200, foodHeaders, foodItems, { embedPhotos: false });

  addInstructionsSheet(foodWb, 'មុខម្ហូបទី ១ ដល់ ១០០ និង ១០១ ដល់ ២០០');

  const foodOutPaths = [
    path.join(TEMPLATES_DIR, 'KhmerFoodTourism_Food_1_to_100_Photo_Template.xlsx'),
    path.join(PROJECT_ROOT, 'KhmerFoodTourism_Food_1_to_100_Photo_Template.xlsx'),
  ];
  if (fs.existsSync(ARTIFACT_DIR)) {
    foodOutPaths.push(path.join(ARTIFACT_DIR, 'KhmerFoodTourism_Food_1_to_100_Photo_Template.xlsx'));
  }

  for (const outPath of foodOutPaths) {
    await foodWb.xlsx.writeFile(outPath);
    console.log(`✅ Saved Food 1-100 Template: ${outPath}`);
  }

  // 2. Build Travel (Destinations) Photo Insert Template Workbook
  const destItems = allDestinationsRaw.map((d) => {
    const cleanRel = (d.photoUrl || `/destinations/${d.id}.jpg`).split('?')[0].replace(/^\//, '');
    return {
      id: d.id,
      nameKh: d.nameKh,
      nameEn: d.nameEn,
      categoryLabel: `${d.provinceKh} • ${d.categoryKh}`,
      filename: path.basename(cleanRel) || `${d.id}.jpg`,
      diskPhotoPath: path.join(PROJECT_ROOT, 'public', cleanRel),
    };
  });

  const travelWb = new ExcelJS.Workbook();
  travelWb.creator = 'Khmer Food & Tourism App';
  travelWb.created = new Date();

  const travelHeaders = {
    idHeader: 'Travel ID',
    nameKhHeader: 'ឈ្មោះកន្លែងទេសចរណ៍ (Khmer Name)',
    photoHeader: 'រូបភាពទេសចរណ៍ (Paste Photo Here)',
    nameEnHeader: 'ឈ្មោះអង់គ្លេស (English Name)',
    catHeader: 'ខេត្ត / ប្រភេទ (Province & Category)',
    fileHeader: 'ឈ្មោះរូបភាព (Target Filename)',
  };

  const wsTravelAll = travelWb.addWorksheet('Travel_Places (ទេសចរណ៍)', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  applyStandardSheetFormatting(travelWb, wsTravelAll, travelHeaders, destItems, { embedPhotos: true });

  addInstructionsSheet(travelWb, 'តំបន់ទេសចរណ៍ទាំង ២៩៦ កន្លែង');

  const travelOutPaths = [
    path.join(TEMPLATES_DIR, 'KhmerFoodTourism_Travel_Photo_Insert_Template.xlsx'),
    path.join(PROJECT_ROOT, 'KhmerFoodTourism_Travel_Photo_Insert_Template.xlsx'),
  ];
  if (fs.existsSync(ARTIFACT_DIR)) {
    travelOutPaths.push(path.join(ARTIFACT_DIR, 'KhmerFoodTourism_Travel_Photo_Insert_Template.xlsx'));
  }

  for (const outPath of travelOutPaths) {
    await travelWb.xlsx.writeFile(outPath);
    console.log(`✅ Saved Travel Template: ${outPath}`);
  }
}

generateAllTemplates().catch((err) => {
  console.error('❌ Error generating templates:', err);
  process.exit(1);
});
