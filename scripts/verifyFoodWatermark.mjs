import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const foodsDir = path.join(rootDir, 'public', 'foods');
const ledgerPath = path.join(__dirname, '.watermark-ledger.json');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error('FAIL:', msg);
  }
}

// 1. Verify all 307 public/foods/*.jpg files have the embedded KFT_WM_V1:Cambodia Flavors & Tourism marker ONCE
const files = fs.readdirSync(foodsDir).filter((f) => f.toLowerCase().endsWith('.jpg')).sort();
assert(files.length >= 300, `Expected >= 300 food images in public/foods/, found ${files.length}`);

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const markerText = 'KFT_WM_V1:Cambodia Flavors & Tourism';
const markerBuf = Buffer.from(markerText, 'ascii');

let allHaveSingleMarker = true;
let allMatchLedgerSha = true;
let allValidDimensions = true;

for (const file of files) {
  const fullPath = path.join(foodsDir, file);
  const bytes = fs.readFileSync(fullPath);
  const firstIdx = bytes.indexOf(markerBuf);
  const secondIdx = firstIdx >= 0 ? bytes.indexOf(markerBuf, firstIdx + markerBuf.length) : -1;
  if (firstIdx < 0 || secondIdx >= 0) {
    allHaveSingleMarker = false;
    console.error(`Marker count mismatch in ${file}: firstIdx=${firstIdx}, secondIdx=${secondIdx}`);
  }
  const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  const entry = ledger[file];
  if (!entry || entry.watermarkedSha256 !== sha || entry.watermarkText !== 'Cambodia Flavors & Tourism') {
    allMatchLedgerSha = false;
    console.error(`Ledger mismatch in ${file}`);
  }
  if (!entry || !(entry.width >= 300 && entry.height >= 300)) {
    allValidDimensions = false;
  }
}

assert(allHaveSingleMarker, 'All 307 food images contain the exact marker "KFT_WM_V1:Cambodia Flavors & Tourism" exactly ONCE');
assert(allMatchLedgerSha, 'All 307 food images match their SHA-256 single-application watermark ledger entry');
assert(allValidDimensions, 'All 307 food images preserve their original pixel resolution');

// 2. Verify src/utils/foodWatermark.ts exports and requirements
const wmUtilSrc = fs.readFileSync(path.join(rootDir, 'src', 'utils', 'foodWatermark.ts'), 'utf8');
assert(wmUtilSrc.includes("export const FOOD_WATERMARK_TEXT = 'Cambodia Flavors & Tourism'"), 'FOOD_WATERMARK_TEXT is exact');
assert(wmUtilSrc.includes('export function isUrlWatermarkedAtPixelLevel'), 'isUrlWatermarkedAtPixelLevel is exported');
assert(wmUtilSrc.includes('export function drawFoodWatermarkOnCanvas'), 'drawFoodWatermarkOnCanvas is exported');
assert(wmUtilSrc.includes('export async function applyFoodWatermarkOnce'), 'applyFoodWatermarkOnce is exported');

// 3. Verify upload pipelines & UI components prevent duplicate watermarks
const foodImageModalSrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'FoodImageModal.tsx'), 'utf8');
assert(foodImageModalSrc.includes('applyFoodWatermarkOnce'), 'FoodImageModal uses applyFoodWatermarkOnce');
assert(foodImageModalSrc.includes('maxWidth = 2400'), 'FoodImageModal preserves high resolution');

const cloudStorageSrc = fs.readFileSync(path.join(rootDir, 'src', 'services', 'cloudImageStorageService.ts'), 'utf8');
assert(cloudStorageSrc.includes('drawFoodWatermarkOnCanvas') && cloudStorageSrc.includes('isUrlWatermarkedAtPixelLevel'), 'cloudImageStorageService enforces single watermark');

const foodCardSrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'FoodCard.tsx'), 'utf8');
assert(foodCardSrc.includes('!isUrlWatermarkedAtPixelLevel(resolveFoodPhotoUrl(food))'), 'FoodCard suppresses duplicate overlay when pixel watermark is present');

console.log(`Food Watermark Verification: ${passed}/${passed + failed} checks PASSED (${files.length} food images verified).`);
if (failed > 0) process.exit(1);
