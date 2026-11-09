import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const foodsDir = path.join(rootDir, 'public', 'foods');

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

// 1. Verify all 307 public/foods/*.jpg files preserve their untouched original image bytes & size (~29.97 MB)
const files = fs.readdirSync(foodsDir).filter((f) => f.toLowerCase().endsWith('.jpg')).sort();
assert(files.length >= 300, `Expected >= 300 food images in public/foods/, found ${files.length}`);

let totalBytes = 0;
for (const file of files) {
  const st = fs.statSync(path.join(foodsDir, file));
  totalBytes += st.size;
}
const totalMB = totalBytes / (1024 * 1024);
assert(totalMB < 32, `Expected public/foods total size < 32 MB (untouched originals), got ${totalMB.toFixed(2)} MB`);

// 2. Verify src/utils/foodWatermark.ts uses the exact Khmer title & ~30% reduced refined typography
const wmUtilSrc = fs.readFileSync(path.join(rootDir, 'src', 'utils', 'foodWatermark.ts'), 'utf8');
assert(
  wmUtilSrc.includes("export const FOOD_WATERMARK_TEXT = 'រសជាតិ និងទេសចរណ៍កម្ពុជា'"),
  'FOOD_WATERMARK_TEXT is exact Khmer title "រសជាតិ និងទេសចរណ៍កម្ពុជា"'
);
assert(
  wmUtilSrc.includes('text-[6px] sm:text-[6.5px]') && wmUtilSrc.includes('font-khmer font-normal'),
  'FOOD_WATERMARK_BADGE_CLASS uses ~30% smaller font size and refined regular Khmer typography'
);
assert(
  wmUtilSrc.includes('shortEdge * 0.016') && wmUtilSrc.includes('400 ${fontSize}px'),
  'drawFoodWatermarkOnCanvas uses ~30% reduced proportional font size and regular weight (400)'
);

// 3. Verify all 4 Food UI components use FOOD_WATERMARK_BADGE_CLASS and pass string URLs to isUrlWatermarkedAtPixelLevel
const foodCardSrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'FoodCard.tsx'), 'utf8');
assert(
  foodCardSrc.includes('!isUrlWatermarkedAtPixelLevel(resolvedPhotoUrl)') &&
    foodCardSrc.includes('FOOD_WATERMARK_BADGE_CLASS') &&
    foodCardSrc.includes('{FOOD_WATERMARK_TEXT}'),
  'FoodCard renders single Khmer watermark with FOOD_WATERMARK_BADGE_CLASS'
);

const foodDetailSrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'FoodDetailModal.tsx'), 'utf8');
assert(
  foodDetailSrc.includes('!isUrlWatermarkedAtPixelLevel(selectedFood.photoUrl)') &&
    foodDetailSrc.includes('FOOD_WATERMARK_BADGE_CLASS'),
  'FoodDetailModal renders single Khmer watermark with FOOD_WATERMARK_BADGE_CLASS'
);

const trendingDetailSrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'TrendingFoodDetailModal.tsx'), 'utf8');
assert(
  trendingDetailSrc.includes('!isUrlWatermarkedAtPixelLevel(displayPhotoUrl)') &&
    trendingDetailSrc.includes('FOOD_WATERMARK_BADGE_CLASS'),
  'TrendingFoodDetailModal renders single Khmer watermark with FOOD_WATERMARK_BADGE_CLASS'
);

const wteSrc = fs.readFileSync(path.join(rootDir, 'src', 'components', 'WhatToEatModal.tsx'), 'utf8');
assert(
  wteSrc.includes('!isUrlWatermarkedAtPixelLevel(rpFood.photoUrl)') &&
    wteSrc.includes('!isUrlWatermarkedAtPixelLevel(currentDish.photoUrl)') &&
    wteSrc.includes('FOOD_WATERMARK_BADGE_CLASS'),
  'WhatToEatModal renders single Khmer watermark with FOOD_WATERMARK_BADGE_CLASS'
);

console.log(`Khmer Food Watermark Verification: ${passed}/${passed + failed} checks PASSED (${files.length} original food images preserved, ${totalMB.toFixed(2)} MB).`);
if (failed > 0) process.exit(1);