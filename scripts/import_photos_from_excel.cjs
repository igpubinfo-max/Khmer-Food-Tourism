/**
 * Automated Food Photo Importer from Excel
 * 
 * Usage:
 *   node scripts/import_photos_from_excel.cjs [path_to_excel_file]
 * 
 * Description:
 *   Reads an Excel workbook where the user has pasted food photos into Column D.
 *   Extracts the embedded images from the Excel archive, maps them to the corresponding
 *   Food ID based on row position (e.g. Row 2 -> food-101, Row 3 -> food-102, etc.),
 *   saves them into public/foods/food-{id}.jpg, and updates the app.
 */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const ExcelJS = require('exceljs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const FOODS_DIR = path.join(PROJECT_ROOT, 'public/foods');

// Ensure public/foods directory exists
if (!fs.existsSync(FOODS_DIR)) {
  fs.mkdirSync(FOODS_DIR, { recursive: true });
}

async function importPhotos(excelPath) {
  if (!excelPath) {
    // Check default locations
    const candidatePaths = [
      path.join(PROJECT_ROOT, 'public/KhmerFoodTourism_Photo_Insert_Template.xlsx'),
      path.join(PROJECT_ROOT, 'KhmerFoodTourism_Photo_Insert_Template.xlsx'),
      path.join(PROJECT_ROOT, 'KhmerFoodTourism_100_New_Foods_For_Photo_Update.xlsx'),
      path.join("C:/Users/igpub/.gemini/antigravity/brain/99e5a75e-66d8-483b-8911-48b6490d4423", 'KhmerFoodTourism_Photo_Insert_Template.xlsx')
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        excelPath = p;
        break;
      }
    }
  }

  if (!excelPath || !fs.existsSync(excelPath)) {
    console.error('❌ Excel file not found. Please provide path: node scripts/import_photos_from_excel.cjs <file.xlsx>');
    process.exit(1);
  }

  console.log(`📂 Reading Excel file: ${excelPath}`);
  const fileBuffer = fs.readFileSync(excelPath);
  const zip = await JSZip.loadAsync(fileBuffer);

  // 1. Read sheet to get Row -> Food ID mapping
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fileBuffer);
  
  // Use first worksheet or sheet named 100_New_Foods
  const ws = wb.getWorksheet('100_New_Foods (១០០មុខថ្មី)') || wb.worksheets[0];
  console.log(`📑 Processing worksheet: "${ws.name}" with ${ws.rowCount} rows`);

  const rowToFoodId = new Map();
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    const foodId = row.getCell(2).value; // Col B is Food ID
    if (foodId && String(foodId).startsWith('food-')) {
      rowToFoodId.set(rowNumber, String(foodId).trim());
    }
  });

  console.log(`📋 Found ${rowToFoodId.size} food ID mappings across rows.`);

  // 2. Parse drawing relationships (rId -> image filename in xl/media/)
  const relsFiles = Object.keys(zip.files).filter(f => f.includes('drawings/_rels/'));
  const rIdToMedia = new Map();

  for (const relsFile of relsFiles) {
    const relsXml = await zip.files[relsFile].async('string');
    const relRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g;
    let rMatch;
    while ((rMatch = relRegex.exec(relsXml)) !== null) {
      let target = rMatch[2].replace(/^(\.\.\/)+/, 'xl/');
      if (!target.startsWith('xl/')) target = 'xl/' + target;
      rIdToMedia.set(rMatch[1], target);
    }
  }

  // 3. Parse drawing XML (row anchor -> rId)
  const drawingFiles = Object.keys(zip.files).filter(f => f.startsWith('xl/drawings/drawing') && f.endsWith('.xml'));
  const importedCount = { total: 0, saved: [] };

  for (const drawFile of drawingFiles) {
    const drawXml = await zip.files[drawFile].async('string');

    // Regex to match anchors with <xdr:from><xdr:col>...</xdr:col><xdr:row>...</xdr:row></xdr:from> and <a:blip r:embed="..."/>
    const anchorRegex = /<xdr:(?:twoCellAnchor|oneCellAnchor)[\s\S]*?<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>[\s\S]*?<\/xdr:from>[\s\S]*?<a:blip[^>]*r:embed="([^"]+)"[\s\S]*?<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/g;
    
    let aMatch;
    while ((aMatch = anchorRegex.exec(drawXml)) !== null) {
      const colIndex = parseInt(aMatch[1], 10);
      const rowIndex = parseInt(aMatch[2], 10); // 0-indexed in XML, so row 2 is 1
      const excelRowNum = rowIndex + 1;
      const rId = aMatch[3];
      const mediaPath = rIdToMedia.get(rId);

      const foodId = rowToFoodId.get(excelRowNum) || `food-${excelRowNum + 99}`;

      if (mediaPath && zip.files[mediaPath]) {
        const imgBuffer = await zip.files[mediaPath].async('nodebuffer');
        const ext = path.extname(mediaPath).toLowerCase() || '.jpg';
        const targetFilename = `${foodId}${ext}`;
        const targetPath = path.join(FOODS_DIR, targetFilename);

        fs.writeFileSync(targetPath, imgBuffer);
        importedCount.total++;
        importedCount.saved.push({ foodId, targetFilename, sizeKb: (imgBuffer.length / 1024).toFixed(1) });
        console.log(`✅ [Row ${excelRowNum}] Saved ${targetFilename} (${(imgBuffer.length / 1024).toFixed(1)} KB) -> ${foodId}`);
      }
    }
  }

  // 4. Fallback: also check ExcelJS images API if drawing parser didn't catch floating images
  if (importedCount.total === 0 && ws.getImages && ws.getImages().length > 0) {
    console.log(`🔍 Checking ExcelJS getImages() fallback...`);
    const images = ws.getImages();
    for (const img of images) {
      const rowNum = Math.floor(img.range.tl.row);
      const foodId = rowToFoodId.get(rowNum) || `food-${rowNum + 99}`;
      const imageObj = wb.getImage(img.imageId);
      if (imageObj && imageObj.buffer) {
        const ext = imageObj.extension ? `.${imageObj.extension}` : '.jpg';
        const targetFilename = `${foodId}${ext}`;
        const targetPath = path.join(FOODS_DIR, targetFilename);

        fs.writeFileSync(targetPath, imageObj.buffer);
        importedCount.total++;
        importedCount.saved.push({ foodId, targetFilename, sizeKb: (imageObj.buffer.length / 1024).toFixed(1) });
        console.log(`✅ [ExcelJS] Saved ${targetFilename} -> ${foodId}`);
      }
    }
  }

  console.log(`\n🎉 IMPORT SUMMARY: Successfully extracted and saved ${importedCount.total} food images to public/foods/!`);
  return importedCount;
}

const targetFile = process.argv[2];
importPhotos(targetFile).catch(err => {
  console.error('Import error:', err);
  process.exit(1);
});
