/**
 * Safe Non-Destructive Travel Data & Photo Importer from Excel
 * Reads: templates/KhmerFoodTourism_Travel_Data_Management_Template.xlsx (or custom path passed as arg)
 * Updates:
 *   - public/destinations/<id>.jpg (ONLY for rows where a new photo was inserted in Col D or specified in Col E)
 *   - src/data/seedDestinations.ts (merges updated photos & non-empty text fields by Destination_ID without losing any existing fields!)
 *
 * Usage:
 *   node scripts/import_travel_excel.cjs [optional_excel_path]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { execFileSync } = require('child_process');
const ts = require('typescript');
const JSZip = require('jszip');
const ExcelJS = require('exceljs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SEED_DEST_PATH = path.join(PROJECT_ROOT, 'src', 'data', 'seedDestinations.ts');
const DESTS_IMG_DIR = path.join(PROJECT_ROOT, 'public', 'destinations');
const DEFAULT_EXCEL_PATH = path.join(
  PROJECT_ROOT,
  'templates',
  'KhmerFoodTourism_Travel_Data_Management_Template.xlsx'
);
const os = require('os');
const TEMP_DIR = path.join(os.tmpdir(), 'kft_travel_excel_import');

if (!fs.existsSync(DESTS_IMG_DIR)) fs.mkdirSync(DESTS_IMG_DIR, { recursive: true });

function isWebpBuffer(buf) {
  return (
    Buffer.isBuffer(buf) &&
    buf.length > 12 &&
    buf.slice(0, 4).toString('ascii') === 'RIFF' &&
    buf.slice(8, 12).toString('ascii') === 'WEBP'
  );
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function loadDestinations() {
  const code = fs.readFileSync(SEED_DEST_PATH, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} };
  const customRequire = (id) => {
    if (id.includes('types')) return {};
    if (id.includes('seedRacCambodiaTourDestinations')) return { racCambodiaTourDestinations: [] };
    if (id.includes('seedHotels100')) return { seedHotels100: [] };
    return require(id);
  };
  new Function('module', 'exports', 'require', transpiled)(mod, mod.exports, customRequire);
  return mod.exports.initial100Destinations || [];
}

function saveAndOptimizeDestinationPhoto(rawBuffer, id) {
  // Windows GDI+ System.Drawing does not decode WebP; save WebP directly since browsers & Capacitor WebView support WebP natively
  if (isWebpBuffer(rawBuffer)) {
    const targetWebp = path.join(DESTS_IMG_DIR, `${id}.webp`);
    fs.writeFileSync(targetWebp, rawBuffer);
    return `/destinations/${id}.webp`;
  }

  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
  const targetJpgPath = path.join(DESTS_IMG_DIR, `${id}.jpg`);
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
    return `/destinations/${id}.jpg`;
  } finally {
    try {
      fs.unlinkSync(tmpIn);
    } catch {}
  }
}

function downloadUrlBuffer(url, redirects = 3) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, { headers: { 'User-Agent': 'KhmerFoodTourism-Importer/2.5' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
          return resolve(downloadUrlBuffer(res.headers.location, redirects - 1));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

function cellText(cell) {
  if (!cell || cell.value == null) return '';
  if (typeof cell.value === 'object') {
    if (cell.value.text) return String(cell.value.text).trim();
    if (cell.value.hyperlink) return String(cell.value.hyperlink).trim();
    if (Array.isArray(cell.value.richText)) {
      return cell.value.richText.map((r) => r.text || '').join('').trim();
    }
  }
  return String(cell.value).trim();
}

async function extractRowImagesFromZip(zip, sheetIndex1Based) {
  const rowMediaMap = new Map();

  // 1. Floating drawings (keep the LAST image anchored on each row so newly pasted images win over template thumbnails)
  const relsPath = `xl/drawings/_rels/drawing${sheetIndex1Based}.xml.rels`;
  const drawPath = `xl/drawings/drawing${sheetIndex1Based}.xml`;
  if (zip.files[drawPath] && zip.files[relsPath]) {
    const relsXml = await zip.files[relsPath].async('string');
    const rIdToMedia = new Map();
    for (const m of relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
      let target = m[2].replace(/^(\.\.\/)+/, 'xl/');
      if (!target.startsWith('xl/')) target = 'xl/' + target;
      rIdToMedia.set(m[1], target);
    }
    const drawXml = await zip.files[drawPath].async('string');
    const anchorRegex =
      /<xdr:(?:twoCellAnchor|oneCellAnchor)[\s\S]*?<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>[\s\S]*?<\/xdr:from>[\s\S]*?<a:blip[^>]*r:embed="([^"]+)"[\s\S]*?<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/g;
    for (const a of drawXml.matchAll(anchorRegex)) {
      const excelRowNum = parseInt(a[2], 10) + 1;
      const mediaPath = rIdToMedia.get(a[3]);
      if (mediaPath && zip.files[mediaPath]) {
        rowMediaMap.set(excelRowNum, { source: 'drawing', mediaPath });
      }
    }
  }

  // 2. Excel 365 "Place in Cell" Rich Data (always overrides template floating thumbnail when present)
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
    for (const m of rvRelXml.matchAll(/<rel[^>]*r:id="([^"]+)"/g)) relOrder.push(m[1]);
  }
  const rvToMediaPath = [];
  if (zip.files['xl/richData/rdrichvalue.xml']) {
    const rdRvXml = await zip.files['xl/richData/rdrichvalue.xml'].async('string');
    for (const m of rdRvXml.matchAll(/<rv[^>]*>[\s\S]*?<v>(\d+)<\/v>[\s\S]*?<\/rv>/g)) {
      rvToMediaPath.push(richRelsMap.get(relOrder[parseInt(m[1], 10)]));
    }
  }
  const vmToRvIndex = new Map();
  if (zip.files['xl/metadata.xml']) {
    const metaXml = await zip.files['xl/metadata.xml'].async('string');
    const vmBlock = metaXml.match(/<valueMetadata[\s\S]*?<\/valueMetadata>/);
    if (vmBlock) {
      let vmIdx = 1;
      for (const bm of vmBlock[0].matchAll(/<bk>([\s\S]*?)<\/bk>/g)) {
        const rvb = bm[1].match(/rvb\s+i="(\d+)"/);
        const rc = bm[1].match(/<rc\s+t="\d+"\s+v="(\d+)"/);
        const rvIdx = rvb ? parseInt(rvb[1], 10) : rc ? parseInt(rc[1], 10) : vmIdx - 1;
        vmToRvIndex.set(vmIdx, rvIdx);
        vmIdx++;
      }
    }
  }
  const sheetXmlPath = `xl/worksheets/sheet${sheetIndex1Based}.xml`;
  if (zip.files[sheetXmlPath] && vmToRvIndex.size > 0) {
    const sheetXml = await zip.files[sheetXmlPath].async('string');
    for (const cm of sheetXml.matchAll(/<c\s+[^>]*r="([A-Z]+)(\d+)"[^>]*vm="(\d+)"[^>]*>/g)) {
      const rowNum = parseInt(cm[2], 10);
      const vmVal = parseInt(cm[3], 10);
      const rvIdx = vmToRvIndex.get(vmVal);
      const mediaPath = rvIdx !== undefined ? rvToMediaPath[rvIdx] : undefined;
      if (mediaPath && zip.files[mediaPath]) {
        rowMediaMap.set(rowNum, { source: 'richCell', mediaPath });
      }
    }
  }

  return rowMediaMap;
}

async function runImport() {
  const excelPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_EXCEL_PATH;
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Excel file not found: ${excelPath}`);
    process.exit(1);
  }

  console.log(`📂 Reading Travel Excel workbook: ${excelPath}`);
  const existingDestinations = loadDestinations();
  const destMap = new Map(existingDestinations.map((d) => [d.id, { ...d }]));

  const fileBuf = fs.readFileSync(excelPath);
  const zip = await JSZip.loadAsync(fileBuf);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fileBuf);

  const ws = wb.getWorksheet('Travel_Destinations') || wb.worksheets[0];
  const metaWs = wb.getWorksheet('_Template_Meta');
  const baselineHashMap = new Map();
  if (metaWs) {
    for (let r = 2; r <= metaWs.rowCount; r++) {
      const mId = cellText(metaWs.getRow(r).getCell(1));
      const mHash = cellText(metaWs.getRow(r).getCell(2));
      if (mId && mHash) baselineHashMap.set(mId, mHash);
    }
  }
  const rowImages = await extractRowImagesFromZip(zip, 1);

  const nowIso = new Date().toISOString();
  let updatedPhotos = 0;
  let updatedFields = 0;
  let addedDestinations = 0;

  for (let rowNumber = 2; rowNumber <= ws.rowCount; rowNumber++) {
    const row = ws.getRow(rowNumber);
    const id = cellText(row.getCell(2));
    if (!id || (!id.startsWith('dest-') && !id.startsWith('gmap-') && !id.startsWith('rac-'))) continue;

    const isNew = !destMap.has(id);
    const dest = destMap.get(id) || {
      id,
      nameKh: '',
      nameEn: '',
      categorySlug: 'resort',
      categoryKh: 'រមណីយដ្ឋាន & វប្បធម៌',
      categoryEn: 'Resorts & Cultural Heritage',
      descriptionKh: '',
      descriptionEn: '',
      photoUrl: `/destinations/${id}.jpg`,
      provinceKh: 'រាជធានីភ្នំពេញ',
      provinceEn: 'Phnom Penh',
      addressKh: '',
      addressEn: '',
      entranceFeeKh: '',
      entranceFeeEn: '',
      bestTimeToVisitKh: '',
      bestTimeToVisitEn: '',
      mapUrl: '',
      rating: 4.7,
      reviewCount: 120,
      highlightsKh: [],
      isFeatured: false,
      galleryPhotos: [`/destinations/${id}.jpg`],
      locationVerificationStatus: 'verified',
      locationNeedsReview: false,
    };

    let rowTextChanged = false;
    const applyIfNonEmpty = (field, val) => {
      if (val !== '' && dest[field] !== val) {
        dest[field] = val;
        rowTextChanged = true;
      }
    };

    applyIfNonEmpty('nameKh', cellText(row.getCell(3)));
    applyIfNonEmpty('nameEn', cellText(row.getCell(6)));
    applyIfNonEmpty('provinceKh', cellText(row.getCell(7)));
    applyIfNonEmpty('provinceEn', cellText(row.getCell(8)));
    applyIfNonEmpty('categorySlug', cellText(row.getCell(9)));
    applyIfNonEmpty('categoryKh', cellText(row.getCell(10)));
    applyIfNonEmpty('addressKh', cellText(row.getCell(11)));
    applyIfNonEmpty('mapUrl', cellText(row.getCell(12)));

    const latRaw = cellText(row.getCell(13));
    const lngRaw = cellText(row.getCell(14));
    if (latRaw && !Number.isNaN(Number(latRaw)) && Number(latRaw) !== dest.latitude) {
      dest.latitude = Number(latRaw);
      rowTextChanged = true;
    }
    if (lngRaw && !Number.isNaN(Number(lngRaw)) && Number(lngRaw) !== dest.longitude) {
      dest.longitude = Number(lngRaw);
      rowTextChanged = true;
    }

    applyIfNonEmpty('descriptionKh', cellText(row.getCell(15)));
    applyIfNonEmpty('descriptionEn', cellText(row.getCell(16)));
    applyIfNonEmpty('bestTimeToVisitKh', cellText(row.getCell(17)));

    if (rowTextChanged) {
      dest.isAdminEdited = true;
      updatedFields++;
    }

    // Check photo update: Priority 1 = Col E (New_Photo_Path_or_URL), Priority 2 = Col D embedded/richCell image if bytes differ from existing local file
    const newPhotoSpec = cellText(row.getCell(5));
    const knownExistingHashes = new Set();
    if (baselineHashMap.has(id)) knownExistingHashes.add(baselineHashMap.get(id));

    const targetJpg = path.join(DESTS_IMG_DIR, `${id}.jpg`);
    if (fs.existsSync(targetJpg)) {
      knownExistingHashes.add(sha256(fs.readFileSync(targetJpg)));
    }
    const relPhoto = String(dest.photoUrl || '').split('?')[0].replace(/^\//, '');
    if (relPhoto) {
      const currentPhotoPath = path.join(PROJECT_ROOT, 'public', relPhoto);
      if (fs.existsSync(currentPhotoPath)) {
        knownExistingHashes.add(sha256(fs.readFileSync(currentPhotoPath)));
      }
    }

    if (newPhotoSpec) {
      try {
        let rawBuf = null;
        if (/^https?:\/\//i.test(newPhotoSpec)) {
          rawBuf = await downloadUrlBuffer(newPhotoSpec);
        } else {
          const resolvedLocal = path.isAbsolute(newPhotoSpec)
            ? newPhotoSpec
            : path.resolve(PROJECT_ROOT, newPhotoSpec);
          if (fs.existsSync(resolvedLocal)) {
            rawBuf = fs.readFileSync(resolvedLocal);
          } else {
            console.warn(`⚠️ [${id}] File not found for New_Photo_Path_or_URL: ${newPhotoSpec}`);
          }
        }
        if (rawBuf && !knownExistingHashes.has(sha256(rawBuf))) {
          const savedPublicUrl = saveAndOptimizeDestinationPhoto(rawBuf, id);
          dest.photoUrl = savedPublicUrl;
          dest.galleryPhotos = [savedPublicUrl];
          dest.isCustomPhoto = true;
          dest.isAdminEdited = true;
          dest.photoUpdatedAt = nowIso;
          updatedPhotos++;
        }
      } catch (err) {
        console.warn(`⚠️ [${id}] Failed to import New_Photo_Path_or_URL (${newPhotoSpec}):`, err.message);
      }
    } else if (rowImages.has(rowNumber)) {
      const imgEntry = rowImages.get(rowNumber);
      const mediaBuf = await zip.files[imgEntry.mediaPath].async('nodebuffer');
      const mediaHash = sha256(mediaBuf);
      // Only overwrite if user placed a RichCell image OR pasted a different image than the embedded original
      if (!knownExistingHashes.has(mediaHash)) {
        const savedPublicUrl = saveAndOptimizeDestinationPhoto(mediaBuf, id);
        dest.photoUrl = savedPublicUrl;
        dest.galleryPhotos = [savedPublicUrl];
        dest.isCustomPhoto = true;
        dest.isAdminEdited = true;
        dest.photoUpdatedAt = nowIso;
        updatedPhotos++;
      }
    }

    if (isNew) {
      addedDestinations++;
    }
    destMap.set(id, dest);
  }

  if (updatedPhotos > 0 || updatedFields > 0 || addedDestinations > 0) {
    const finalArray = Array.from(destMap.values());
    const outTs = `import { TouristDestination } from '../types';
import { racCambodiaTourDestinations } from './seedRacCambodiaTourDestinations';
import { seedHotels100 } from './seedHotels100';

const baseSeedDestinations: TouristDestination[] = ${JSON.stringify(
      finalArray,
      null,
      2
    )};

export const initial100Destinations: TouristDestination[] = [
  ...baseSeedDestinations,
  ...racCambodiaTourDestinations,
  ...seedHotels100,
];
`;
    fs.writeFileSync(SEED_DEST_PATH, outTs, 'utf8');
    console.log(
      `✅ Travel Excel Import Complete: ${updatedPhotos} photo(s) updated, ${updatedFields} destination text record(s) updated, ${addedDestinations} new destination(s) added.`
    );
  } else {
    console.log('✅ Travel Excel Import Verified: No modified photos or text fields detected (0 data loss).');
  }
}

runImport().catch((err) => {
  console.error('❌ Travel Excel Import error:', err);
  process.exit(1);
});
