const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_DIR = "C:\\Users\\igpub\\.gemini\\antigravity\\brain\\99e5a75e-66d8-483b-8911-48b6490d4423";

// 1. Extract 100 new foods (food-101 to food-200) from seedAdditional100Foods.ts
const addContent = fs.readFileSync(path.join(PROJECT_ROOT, 'src/data/seedAdditional100Foods.ts'), 'utf8');
const dishRegex = /{\s*nameKh:\s*'([^']+)',\s*nameEn:\s*'([^']+)',\s*cat:\s*'([^']+)',\s*catKh:\s*'([^']+)',\s*catEn:\s*'([^']+)',\s*mainIngKh:\s*'([^']+)',\s*mainIngEn:\s*'([^']+)'/g;

const new100Foods = [];
let dMatch;
let idx = 101;
while ((dMatch = dishRegex.exec(addContent)) !== null) {
  const foodId = `food-${idx}`;
  new100Foods.push({
    no: idx - 100,
    id: foodId,
    nameKh: dMatch[1],
    nameEn: dMatch[2],
    catKh: dMatch[4],
    catEn: dMatch[5],
    filename: `${foodId}.jpg`
  });
  idx++;
}

// 2. Extract first 100 foods (food-1 to food-100) from seedFoods.ts
const seedContent = fs.readFileSync(path.join(PROJECT_ROOT, 'src/data/seedFoods.ts'), 'utf8');
const first100Foods = [];

// Foods 1-50
const f1to50Regex = /id:\s*'food-(\d+)',\s*nameKh:\s*'([^']+)',\s*nameEn:\s*'([^']+)',\s*categorySlug:\s*'([^']+)',\s*categoryKh:\s*'([^']+)'/g;
let f1Match;
while ((f1Match = f1to50Regex.exec(seedContent)) !== null) {
  const num = parseInt(f1Match[1], 10);
  if (num <= 50) {
    first100Foods.push({
      no: num,
      id: `food-${num}`,
      nameKh: f1Match[2],
      nameEn: f1Match[3],
      catKh: f1Match[5],
      filename: `food-${num}.jpg`
    });
  }
}

// Foods 51-100 from AUTHENTIC_FOOD_RECIPES
const f51to100Regex = /"(food-(\d+))":\s*\{\s*"nameKh":\s*"([^"]+)",\s*"nameEn":\s*"([^"]+)",\s*"cat":\s*"([^"]+)",\s*"catKh":\s*"([^"]+)"/g;
let f51Match;
while ((f51Match = f51to100Regex.exec(seedContent)) !== null) {
  const num = parseInt(f51Match[2], 10);
  first100Foods.push({
    no: num,
    id: `food-${num}`,
    nameKh: f51Match[3],
    nameEn: f51Match[4],
    catKh: f51Match[6],
    filename: `food-${num}.jpg`
  });
}

first100Foods.sort((a, b) => parseInt(a.id.replace('food-', '')) - parseInt(b.id.replace('food-', '')));

// Combined 200 foods
const all200Foods = [
  ...first100Foods.map((f, i) => ({ ...f, no: i + 1 })),
  ...new100Foods.map((f, i) => ({ ...f, no: i + 101 }))
];

console.log(`Extracted: 100 New Foods (${new100Foods.length}), First 100 Foods (${first100Foods.length}), Total (${all200Foods.length})`);

// 3. Create Excel Workbook using ExcelJS
async function buildTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Khmer Food & Tourism App';
  wb.lastModifiedBy = 'Admin Chea Savuth';
  wb.created = new Date();
  wb.modified = new Date();

  // Helper function to setup sheet
  function setupFoodSheet(sheetName, foodList, isNew100 = false) {
    const ws = wb.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    // Define Columns exactly matching user screenshot:
    // A: No, B: Food ID, C: Khmer Name, D: Photo Paste Zone, E: English Name, F: Category, G: Target Filename
    ws.columns = [
      { key: 'no', width: 9 },
      { key: 'id', width: 14 },
      { key: 'nameKh', width: 34 },
      { key: 'photo', width: 30 },
      { key: 'nameEn', width: 48 },
      { key: 'category', width: 24 },
      { key: 'filename', width: 18 }
    ];

    // Header Row
    const headerRow = ws.getRow(1);
    headerRow.values = [
      'ល.រ (No)',
      'Food ID',
      'ឈ្មោះម្ហូបខ្មែរ (Khmer Name)',
      'រូបភាពម្ហូប (Paste Photo Here)',
      'ឈ្មោះអង់គ្លេស (English Name)',
      'ប្រភេទ (Category)',
      'ឈ្មោះរូបភាព (Target Filename)'
    ];
    headerRow.height = 36;

    // Header styling: Dark Emerald Green with bold white text
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colNumber === 4 ? 'FF047857' : 'FF064E3B' } // highlight photo col slightly
      };
      cell.font = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF064E3B' } },
        bottom: { style: 'medium', color: { argb: 'FF064E3B' } },
        left: { style: 'thin', color: { argb: 'FF0F766E' } },
        right: { style: 'thin', color: { argb: 'FF0F766E' } }
      };
    });

    // Populate Data Rows
    foodList.forEach((food, idx) => {
      const rowNum = idx + 2;
      const row = ws.getRow(rowNum);
      row.values = [
        food.no,
        food.id,
        food.nameKh,
        '', // Column D is empty ready for user to paste image!
        food.nameEn,
        food.catKh,
        food.filename
      ];

      // Row height: 75 points (spacious for food photos!)
      row.height = 75;

      const isEven = idx % 2 === 0;

      // Styling per cell
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // Borders
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        // Col A: No
        if (colNumber === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF475569' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' } };
        }
        // Col B: Food ID
        else if (colNumber === 2) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { name: 'Consolas', size: 11, bold: true, color: { argb: 'FF0F172A' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' } };
        }
        // Col C: Khmer Name
        else if (colNumber === 3) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
          cell.font = { name: 'Khmer OS Siemreap', size: 11.5, bold: true, color: { argb: 'FF0F172A' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' } };
        }
        // Col D: PHOTO PASTE ZONE! (Light soft mint tint so it's obvious where to paste)
        else if (colNumber === 4) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }; // Soft emerald tint
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFA7F3D0' } },
            bottom: { style: 'thin', color: { argb: 'FFA7F3D0' } },
            left: { style: 'medium', color: { argb: 'FF34D399' } },
            right: { style: 'medium', color: { argb: 'FF34D399' } }
          };
        }
        // Col E: English Name
        else if (colNumber === 5) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
          cell.font = { name: 'Segoe UI', size: 11, color: { argb: 'FF334155' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' } };
        }
        // Col F: Category
        else if (colNumber === 6) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          cell.font = { name: 'Khmer OS Siemreap', size: 10, color: { argb: 'FF64748B' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' } };
        }
        // Col G: Filename
        else if (colNumber === 7) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { name: 'Consolas', size: 10, color: { argb: 'FF64748B' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' } };
        }
      });
    });
  }

  // 1. Sheet: 100 New Foods (food-101 to food-200)
  setupFoodSheet('100_New_Foods (១០០មុខថ្មី)', new100Foods, true);

  // 2. Sheet: All 200 Foods (food-1 to food-200)
  setupFoodSheet('All_200_Foods (ទាំង២០០មុខ)', all200Foods, false);

  // 3. Sheet: Instructions (ការណែនាំ)
  const instructWs = wb.addWorksheet('Instructions (ការណែនាំ)');
  instructWs.columns = [{ width: 5 }, { width: 90 }];
  instructWs.addRow([]);
  instructWs.addRow(['', '📋 សេចក្តីណែនាំអំពីរបៀបបិទភ្ជាប់រូបភាព (Photo Paste Instructions)']);
  instructWs.getRow(2).font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF064E3B' } };
  instructWs.addRow([]);

  const instructions = [
    'ជំហានទី ១ (Step 1): បើកផ្ទាំង «100_New_Foods (១០០មុខថ្មី)» ឬ «All_200_Foods (ទាំង២០០មុខ)»។',
    'ជំហានទី ២ (Step 2): ស្វែងរករូបភាពមុខម្ហូបពី Google ឬទូរស័ព្ទរបស់អ្នក រួច Copy (Ctrl + C)។',
    'ជំហានទី ៣ (Step 3): ចុចលើប្រអប់ក្នុងជួរឈរ D «រូបភាពម្ហូប (Paste Photo Here)» តាមលេខរៀងមុខម្ហូប រួច Paste (Ctrl + V)។',
    'ជំហានទី ៤ (Step 4): រូបភាពនឹងចូលទៅក្នុងប្រអប់ជួរឈរ D យ៉ាងស្អាត។ កម្ពស់ជួរដេកនីមួយៗត្រូវបានកំណត់ ៧៥pt ស្រាប់ដើម្បីឱ្យរូបភាពសមល្មម។',
    'ជំហានទី ៥ (Step 5): ក្រោយពេលបិទភ្ជាប់រូបភាពរួចរាល់ សូម Save ឯកសារនេះ រួចផ្ញើមកកាន់ខ្ញុំវិញ។',
    '✨ ប្រព័ន្ធនឹងទាញយករូបភាពទាំងអស់ពី Excel ដោយស្វ័យប្រវត្តិ រួច Update ចូលទៅក្នុង App ភ្លាមៗ!'
  ];

  instructions.forEach((ins, idx) => {
    const r = instructWs.addRow(['', `${idx + 1}. ${ins}`]);
    r.font = { name: 'Khmer OS Siemreap', size: 12, color: { argb: 'FF1E293B' } };
    r.height = 28;
  });

  // Save to public and artifact folders
  const outputPublic = path.join(PROJECT_ROOT, 'public/KhmerFoodTourism_Photo_Insert_Template.xlsx');
  const outputArtifact = path.join(ARTIFACT_DIR, 'KhmerFoodTourism_Photo_Insert_Template.xlsx');

  await wb.xlsx.writeFile(outputPublic);
  await wb.xlsx.writeFile(outputArtifact);

  console.log(`✅ Successfully generated template with ExcelJS!`);
  console.log(`   - Saved to: ${outputPublic}`);
  console.log(`   - Saved to: ${outputArtifact}`);
}

buildTemplate().catch(err => {
  console.error('Error generating template:', err);
  process.exit(1);
});
