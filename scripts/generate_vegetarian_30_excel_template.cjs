/**
 * Generates official Excel (.xlsx) and CSV (.csv) import templates for the 30 Cambodian Vegetarian Dishes
 * with full trilingual support (Khmer, English, Chinese), descriptions, ingredients, and dedicated Photo Paste Zone.
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(PROJECT_ROOT, 'templates');
if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR, { recursive: true });

// Read the 30 vegetarian dishes seed file
const seedContent = fs.readFileSync(path.join(PROJECT_ROOT, 'src/data/seedVegetarian30Foods.ts'), 'utf8');

// Parse RAW_30_VEGETARIAN_DISHES
const dishBlockRegex = /{\s*id:\s*'(food-2\d\d)',\s*nameKh:\s*'([^']+)',\s*nameEn:\s*'([^']+)',\s*nameZh:\s*'([^']+)',\s*cat:\s*'([^']+)',\s*catKh:\s*'([^']+)',\s*catEn:\s*'([^']+)',\s*catZh:\s*'([^']+)',\s*descKh:\s*'([^']+)',\s*descEn:\s*'([^']+)',\s*descZh:\s*'([^']+)',\s*prepTime:\s*'([^']+)',\s*cookTime:\s*'([^']+)',\s*servings:\s*'([^']+)',\s*calories:\s*(\d+)/g;

const dishes = [];
let match;
while ((match = dishBlockRegex.exec(seedContent)) !== null) {
  dishes.push({
    id: match[1],
    nameKh: match[2],
    nameEn: match[3],
    nameZh: match[4],
    catSlug: match[5],
    catKh: match[6],
    catEn: match[7],
    catZh: match[8],
    descKh: match[9],
    descEn: match[10],
    descZh: match[11],
    prepTime: match[12],
    cookTime: match[13],
    servings: match[14],
    calories: parseInt(match[15], 10),
  });
}

// Extract ingredients for each dish
const ingRegex = /id:\s*'(food-2\d\d)'[\s\S]*?mainIngKh:\s*'([^']+)'[\s\S]*?mainIngEn:\s*'([^']+)'[\s\S]*?subIngKh:\s*'([^']+)'[\s\S]*?subIngEn:\s*'([^']+)'[\s\S]*?herbKh:\s*'([^']+)'[\s\S]*?herbEn:\s*'([^']+)'/g;
const ingredientsMap = {};
let ingMatch;
while ((ingMatch = ingRegex.exec(seedContent)) !== null) {
  ingredientsMap[ingMatch[1]] = {
    kh: `${ingMatch[2]} • ${ingMatch[4]} • ${ingMatch[6]}`,
    en: `${ingMatch[3]}; ${ingMatch[5]}; ${ingMatch[7]}`,
  };
}

console.log(`Parsed ${dishes.length} vegetarian dishes for Excel template generation.`);

async function generateWorkbooks() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Khmer Food & Tourism App';
  wb.lastModifiedBy = 'Admin Chea Savuth';
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet('30 មុខម្ហូបបួស (Vegetarian)', {
    views: [{ state: 'frozen', ySplit: 1, xSplit: 2 }],
  });

  // Columns specification
  ws.columns = [
    { key: 'no', width: 9 },              // A: No.
    { key: 'id', width: 14 },             // B: Food ID
    { key: 'nameKh', width: 34 },         // C: Khmer Name
    { key: 'photo', width: 32 },          // D: Photo Paste Zone
    { key: 'nameEn', width: 44 },         // E: English Name
    { key: 'nameZh', width: 28 },         // F: Chinese Name
    { key: 'category', width: 26 },       // G: Category
    { key: 'calories', width: 14 },       // H: Calories
    { key: 'timing', width: 22 },         // I: Prep & Cook Time
    { key: 'ingredientsKh', width: 45 },  // J: Ingredients (Khmer)
    { key: 'ingredientsEn', width: 50 },  // K: Ingredients (English)
    { key: 'descKh', width: 50 },         // L: Description (Khmer)
    { key: 'descEn', width: 55 },         // M: Description (English)
    { key: 'descZh', width: 45 },         // N: Description (Chinese)
    { key: 'filename', width: 18 },       // O: Target Filename
    { key: 'notes', width: 25 },          // P: Notes / Custom URL
  ];

  // Header Row
  const headerRow = ws.getRow(1);
  headerRow.values = [
    'ល.រ (No)',
    'Food ID',
    'ឈ្មោះមុខម្ហូបខ្មែរ (Khmer Name)',
    'រូបភាពម្ហូប (Paste Photo Here)',
    'ឈ្មោះអង់គ្លេស (English Name)',
    'ឈ្មោះចិន (Chinese Name)',
    'ប្រភេទ (Category)',
    'កាឡូរី (kcal)',
    'រយៈពេល (Prep / Cook)',
    'គ្រឿងផ្សំខ្មែរ (Ingredients KH)',
    'គ្រឿងផ្សំអង់គ្លេស (Ingredients EN)',
    'ការពិពណ៌នាខ្មែរ (Description KH)',
    'ការពិពណ៌នាអង់គ្លេស (Description EN)',
    'ការពិពណ៌នាចិន (Description ZH)',
    'ឈ្មោះរូបភាព (Filename)',
    'កំណត់សម្គាល់ (Notes)',
  ];
  headerRow.height = 42;

  // Header styling: Elegant Emerald Green (#047857) with highlighted Photo column (#065F46)
  headerRow.eachCell((cell, colNumber) => {
    const isPhotoCol = colNumber === 4;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isPhotoCol ? 'FF065F46' : 'FF047857' },
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
      top: { style: 'medium', color: { argb: 'FF022C22' } },
      bottom: { style: 'medium', color: { argb: 'FF022C22' } },
      left: { style: 'thin', color: { argb: 'FF059669' } },
      right: { style: 'thin', color: { argb: 'FF059669' } },
    };
  });

  // Populate rows
  for (let i = 0; i < dishes.length; i++) {
    const d = dishes[i];
    const ing = ingredientsMap[d.id] || { kh: '', en: '' };
    const rowNum = i + 2;
    const row = ws.getRow(rowNum);

    row.values = [
      i + 1,
      d.id,
      d.nameKh,
      '', // Photo Paste Zone
      d.nameEn,
      d.nameZh,
      `${d.catKh} (${d.catEn})`,
      d.calories,
      `${d.prepTime} / ${d.cookTime}`,
      ing.kh,
      ing.en,
      d.descKh,
      d.descEn,
      d.descZh,
      `${d.id}.jpg`,
      '',
    ];

    // High row height for easy photo placement (drag & drop or Paste in Cell)
    row.height = 75;

    const isEven = i % 2 === 0;
    const rowBg = isEven ? 'FFFFFFFF' : 'FFF0FDF4'; // Subtle mint green alternating row

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      // Background fill
      if (colNumber === 4) {
        // Photo Paste Column styling
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0FDF4' },
        };
        cell.font = {
          name: 'Segoe UI',
          size: 9,
          italic: true,
          color: { argb: 'FF059669' },
        };
        cell.value = `[ Paste ${d.id}.jpg ]`;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowBg },
        };
        cell.font = {
          name: 'Segoe UI',
          size: 10,
          bold: colNumber === 2 || colNumber === 3, // Bold ID and Khmer Name
          color: { argb: colNumber === 2 ? 'FF047857' : 'FF1E293B' },
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 1 || colNumber === 2 || colNumber === 8 || colNumber === 15 ? 'center' : 'left',
          wrapText: true,
        };
      }

      // Thin borders
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  }

  // Paths to save
  const targetXlsx1 = path.join(TEMPLATES_DIR, 'Cambodian_Vegetarian_30_Dishes_Template.xlsx');
  const targetXlsx2 = path.join(PROJECT_ROOT, 'KhmerFoodTourism_30_Vegetarian_Foods_Photo_Template.xlsx');

  await wb.xlsx.writeFile(targetXlsx1);
  console.log(`Saved: ${targetXlsx1}`);
  await wb.xlsx.writeFile(targetXlsx2);
  console.log(`Saved: ${targetXlsx2}`);

  // Generate CSV format
  const csvHeaders = [
    'No',
    'Food ID',
    'Khmer Name',
    'English Name',
    'Chinese Name',
    'Category',
    'Calories',
    'Prep Time',
    'Cook Time',
    'Ingredients KH',
    'Ingredients EN',
    'Description KH',
    'Description EN',
    'Description ZH',
    'Photo Filename',
  ];

  const csvRows = [csvHeaders.join(',')];
  for (let i = 0; i < dishes.length; i++) {
    const d = dishes[i];
    const ing = ingredientsMap[d.id] || { kh: '', en: '' };
    const escapeCsv = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
    csvRows.push([
      i + 1,
      d.id,
      escapeCsv(d.nameKh),
      escapeCsv(d.nameEn),
      escapeCsv(d.nameZh),
      escapeCsv(`${d.catKh} / ${d.catEn}`),
      d.calories,
      escapeCsv(d.prepTime),
      escapeCsv(d.cookTime),
      escapeCsv(ing.kh),
      escapeCsv(ing.en),
      escapeCsv(d.descKh),
      escapeCsv(d.descEn),
      escapeCsv(d.descZh),
      `${d.id}.jpg`,
    ].join(','));
  }

  const csvContent = '\uFEFF' + csvRows.join('\r\n'); // UTF-8 BOM for flawless Excel opening
  const targetCsv1 = path.join(TEMPLATES_DIR, 'Cambodian_Vegetarian_30_Dishes_Template.csv');
  const targetCsv2 = path.join(PROJECT_ROOT, 'KhmerFoodTourism_30_Vegetarian_Foods_Photo_Template.csv');

  fs.writeFileSync(targetCsv1, csvContent, 'utf8');
  console.log(`Saved: ${targetCsv1}`);
  fs.writeFileSync(targetCsv2, csvContent, 'utf8');
  console.log(`Saved: ${targetCsv2}`);
}

generateWorkbooks().then(() => {
  console.log('Successfully generated all Excel and CSV templates!');
}).catch((err) => {
  console.error('Error generating templates:', err);
  process.exit(1);
});
