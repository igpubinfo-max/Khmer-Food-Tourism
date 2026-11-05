/**
 * Automated Food & Travel Photo Importer from Excel (Supports BOTH Excel 365 "Place in Cell" Rich Data AND Floating Drawings)
 *
 * Usage:
 *   node scripts/import_photos_from_excel.cjs [path_to_excel_file]
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const JSZip = require('jszip');
const ExcelJS = require('exceljs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const FOODS_DIR = path.join(PROJECT_ROOT, 'public/foods');
const DESTS_DIR = path.join(PROJECT_ROOT, 'public/destinations');
const TEMP_DIR = path.join(PROJECT_ROOT, 'templates/.tmp_extract');

if (!fs.existsSync(FOODS_DIR)) fs.mkdirSync(FOODS_DIR, { recursive: true });
if (!fs.existsSync(DESTS_DIR)) fs.mkdirSync(DESTS_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function convertAndOptimizeToJpg(rawBuffer, targetJpgPath) {
  const tmpIn = path.join(TEMP_DIR, `in_${Date.now()}_${Math.random().toString(36).slice(2)}.bin`);
  fs.writeFileSync(tmpIn, rawBuffer);
  try {
    const psScript = `
      Add-Type -AssemblyName System.Drawing
      $inPath = '${tmpIn.replace(/'/g, "''")}'
      $outPath = '${targetJpgPath.replace(/'/g, "''")}'
      $img = [System.Drawing.Image]::FromFile($inPath)
      $w = $img.Width
      $h = $img.Height
      $maxDim = 720
      if ($w -gt $maxDim -or $h -gt $maxDim) {
        if ($w -gt $h) {
          $h = [int][math]::Round(($h * $maxDim) / $w)
          $w = $maxDim
        } else {
          $w = [int][math]::Round(($w * $maxDim) / $h)
          $h = $maxDim
        }
      }
      $bmp = New-Object System.Drawing.Bitmap($w, $h)
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.Clear([System.Drawing.Color]::White)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $g.DrawImage($img, 0, 0, $w, $h)
      $img.Dispose()
      $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
      $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
      $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]72)
      $bmp.Save($outPath, $codec, $ep)
      $bmp.Dispose()
      $g.Dispose()
    `;
    execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
      stdio: 'pipe',
    });
  } finally {
    try {
      fs.unlinkSync(tmpIn);
    } catch {}
  }
}

async function importPhotosFromSingleWorkbook(excelPath) {
  console.log(`\n📂 Reading Excel file: ${excelPath}`);
  const fileBuffer = fs.readFileSync(excelPath);
  const zip = await JSZip.loadAsync(fileBuffer);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fileBuffer);

  // 1. Parse Excel 365 Rich Data ("Place in Cell" images: c/@vm -> metadata -> rdrichvalue -> richValueRel -> xl/media/...)
  const richRelsMap = new Map();
  if (zip.files['xl/richData/_rels/richValueRel.xml.rels']) {
    const relsXml = await zip.files['xl/richData/_rels/richValueRel.xml.rels'].async('string');
    for (const m of relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
      let target = m[2].replace(/^(\.\.\/)+/, 'xl/');
      if (!target.startsWith('xl/')) target = 'xl/' + target;
      richRelsMap.set(m[1], target);
    }
  }

  const relOrder = [];
  if (zip.files['xl/richData/richValueRel.xml']) {
    const rvRelXml = await zip.files['xl/richData/richValueRel.xml'].async('string');
    for (const m of rvRelXml.matchAll(/<rel[^>]*r:id="([^"]+)"/g)) {
      relOrder.push(m[1]);
    }
  }

  const rvToMediaPath = [];
  if (zip.files['xl/richData/rdrichvalue.xml']) {
    const rdRvXml = await zip.files['xl/richData/rdrichvalue.xml'].async('string');
    for (const m of rdRvXml.matchAll(/<rv[^>]*>[\s\S]*?<v>(\d+)<\/v>[\s\S]*?<\/rv>/g)) {
      const relIdx = parseInt(m[1], 10);
      const rId = relOrder[relIdx];
      rvToMediaPath.push(richRelsMap.get(rId));
    }
  }

  const vmToRvIndex = new Map();
  if (zip.files['xl/metadata.xml']) {
    const metaXml = await zip.files['xl/metadata.xml'].async('string');
    const vmBlockMatch = metaXml.match(/<valueMetadata[\s\S]*?<\/valueMetadata>/);
    if (vmBlockMatch) {
      let vmIdx = 1;
      for (const bm of vmBlockMatch[0].matchAll(/<bk>([\s\S]*?)<\/bk>/g)) {
        const rvbMatch = bm[1].match(/rvb\s+i="(\d+)"/);
        const rcMatch = bm[1].match(/<rc\s+t="\d+"\s+v="(\d+)"/);
        const rvIdx = rvbMatch ? parseInt(rvbMatch[1], 10) : rcMatch ? parseInt(rcMatch[1], 10) : vmIdx - 1;
        vmToRvIndex.set(vmIdx, rvIdx);
        vmIdx++;
      }
    }
  }

  const totalSaved = [];

  for (let sIdx = 0; sIdx < wb.worksheets.length; sIdx++) {
    const ws = wb.worksheets[sIdx];
    const sheetNum = sIdx + 1;
    if (ws.name.toLowerCase().includes('instruction')) continue;
    // Skip Food_101_to_200 sheet inside KhmerFoodTourism_Food_1_to_100_Photo_Template.xlsx
    // because KhmerFoodTourism_Photo_Insert_Template.xlsx is the authoritative RichCell source for food-101..food-200
    if (
      path.basename(excelPath).includes('Food_1_to_100') &&
      ws.name.includes('101')
    ) {
      continue;
    }

    const rowMap = new Map();
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rawId = String(row.getCell(2).value || '').trim();
      const rawNameKh = String(row.getCell(3).value || '').trim();
      const rawNameEn = String(row.getCell(5).value || '').trim();
      const rawFilename = String(row.getCell(7).value || '').trim();
      if (!rawId) return;

      const isFood = rawId.startsWith('food-');
      const targetFilename = rawFilename || `${rawId}.jpg`;
      rowMap.set(rowNumber, {
        id: rawId,
        nameKh: rawNameKh,
        nameEn: rawNameEn,
        targetFilename,
        targetDir: isFood ? FOODS_DIR : DESTS_DIR,
      });
    });

    if (rowMap.size === 0) continue;

    const latestMediaByRow = new Map();

    // A) Floating drawings in xl/drawings/drawingN.xml
    const relsPath = `xl/drawings/_rels/drawing${sheetNum}.xml.rels`;
    const drawPath = `xl/drawings/drawing${sheetNum}.xml`;
    if (zip.files[drawPath] && zip.files[relsPath]) {
      const relsXml = await zip.files[relsPath].async('string');
      const rIdToMedia = new Map();
      for (const rMatch of relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
        let target = rMatch[2].replace(/^(\.\.\/)+/, 'xl/');
        if (!target.startsWith('xl/')) target = 'xl/' + target;
        rIdToMedia.set(rMatch[1], target);
      }

      const drawXml = await zip.files[drawPath].async('string');
      const anchorRegex =
        /<xdr:(?:twoCellAnchor|oneCellAnchor)[\s\S]*?<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>[\s\S]*?<\/xdr:from>[\s\S]*?<a:blip[^>]*r:embed="([^"]+)"[\s\S]*?<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/g;

      for (const aMatch of drawXml.matchAll(anchorRegex)) {
        const excelRowNum = parseInt(aMatch[2], 10) + 1;
        const mediaPath = rIdToMedia.get(aMatch[3]);
        if (mediaPath && zip.files[mediaPath]) {
          latestMediaByRow.set(excelRowNum, { mediaPath, source: 'drawing' });
        }
      }
    }

    // B) Excel 365 "Place in Cell" Rich Value (`<c r="D..." vm="..."/>` in xl/worksheets/sheetN.xml)
    // Always takes priority over pre-embedded floating preview images!
    const sheetXmlPath = `xl/worksheets/sheet${sheetNum}.xml`;
    if (zip.files[sheetXmlPath] && rvToMediaPath.length > 0) {
      const sheetXml = await zip.files[sheetXmlPath].async('string');
      for (const cm of sheetXml.matchAll(/<c\s+r="([A-Z]+)(\d+)"[^>]*\bvm="(\d+)"[^>]*>/g)) {
        const excelRowNum = parseInt(cm[2], 10);
        const vmVal = parseInt(cm[3], 10);
        const rvIdx = vmToRvIndex.has(vmVal) ? vmToRvIndex.get(vmVal) : vmVal - 1;
        const mediaPath = rvToMediaPath[rvIdx];
        if (mediaPath && zip.files[mediaPath]) {
          latestMediaByRow.set(excelRowNum, { mediaPath, source: 'richCell' });
        }
      }
    }

    for (const [excelRowNum, { mediaPath, source }] of latestMediaByRow.entries()) {
      const meta = rowMap.get(excelRowNum);
      if (!meta) continue;

      const imgBuffer = await zip.files[mediaPath].async('nodebuffer');
      const targetPath = path.join(meta.targetDir, meta.targetFilename);

      // For floating drawings, skip if identical to existing file on disk
      if (source === 'drawing' && fs.existsSync(targetPath)) {
        const existingBuf = fs.readFileSync(targetPath);
        if (existingBuf.length === imgBuffer.length && existingBuf.equals(imgBuffer)) {
          continue;
        }
      }

      // Convert & optimize to clean JPEG (1000px max, 86% quality)
      convertAndOptimizeToJpg(imgBuffer, targetPath);
      const finalStat = fs.statSync(targetPath);

      totalSaved.push({
        sheet: ws.name,
        id: meta.id,
        nameKh: meta.nameKh,
        nameEn: meta.nameEn,
        targetFilename: meta.targetFilename,
        origKb: (imgBuffer.length / 1024).toFixed(1),
        finalKb: (finalStat.size / 1024).toFixed(1),
        source,
      });
      console.log(
        `✅ [${ws.name} Row ${excelRowNum} | ${source}] ${meta.id} (${meta.nameKh}) -> ${meta.targetFilename} (${(imgBuffer.length / 1024).toFixed(1)} KB -> ${(finalStat.size / 1024).toFixed(1)} KB)`
      );
    }
  }

  console.log(`🎉 Finished ${path.basename(excelPath)}: ${totalSaved.length} updated photos written & optimized.`);

  const updatedFoodIds = totalSaved.filter((x) => x.id.startsWith('food-')).map((x) => x.id);
  if (updatedFoodIds.length > 0) {
    try {
      const typesPath = path.join(PROJECT_ROOT, 'src/types/index.ts');
      let typesCode = fs.readFileSync(typesPath, 'utf8');
      const nowIso = new Date().toISOString();
      const mapRegex = /export const EXCEL_BAKED_FOOD_PHOTO_TIMESTAMPS:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\};/;
      const m = typesCode.match(mapRegex);
      if (m) {
        const entries = {};
        for (const em of m[1].matchAll(/'(food-\d+)':\s*'([^']+)'/g)) {
          entries[em[1]] = em[2];
        }
        for (const fid of updatedFoodIds) {
          entries[fid] = nowIso;
        }
        const newBody = Object.entries(entries)
          .map(([k, v]) => `  '${k}': '${v}',`)
          .join('\n');
        typesCode = typesCode.replace(
          mapRegex,
          `export const EXCEL_BAKED_FOOD_PHOTO_TIMESTAMPS: Record<string, string> = {\n${newBody}\n};`
        );
        fs.writeFileSync(typesPath, typesCode, 'utf8');
        console.log(`✅ Updated EXCEL_BAKED_FOOD_PHOTO_TIMESTAMPS in src/types/index.ts for ${updatedFoodIds.length} dishes.`);
      }
    } catch (e) {
      console.warn('Could not auto-update EXCEL_BAKED_FOOD_PHOTO_TIMESTAMPS:', e.message);
    }
  }

  return totalSaved;
}

async function run() {
  const argFile = process.argv[2];
  if (argFile && fs.existsSync(argFile)) {
    await importPhotosFromSingleWorkbook(argFile);
    return;
  }

  const candidates = [
    path.join(PROJECT_ROOT, 'templates/KhmerFoodTourism_Food_1_to_100_Photo_Template.xlsx'),
    path.join(PROJECT_ROOT, 'templates/KhmerFoodTourism_Photo_Insert_Template.xlsx'),
    path.join(PROJECT_ROOT, 'templates/KhmerFoodTourism_Travel_Photo_Insert_Template.xlsx'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      await importPhotosFromSingleWorkbook(c);
    }
  }
}

run().catch((err) => {
  console.error('Import error:', err);
  process.exit(1);
});
