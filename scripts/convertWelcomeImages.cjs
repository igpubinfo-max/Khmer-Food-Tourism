// Converts the welcome-screen images to WebP (run once; originals are kept until the build passes).
// Usage: SHARP_PATH=<path to sharp module> node scripts/convertWelcomeImages.cjs
const path = require('path');
const sharp = require(process.env.SHARP_PATH || 'sharp');

const dir = path.join(__dirname, '..', 'public', 'welcome');
const jobs = [
  // [input, output, resize options, webp quality]
  ['hero-bg.jpg', 'hero-bg.webp', { width: 1280, withoutEnlargement: true }, 68],
  ['card-maps.jpg', 'places.webp', { width: 1280, withoutEnlargement: true }, 68],
  ['welcome-logo.png', 'welcome-logo.webp', { width: 256, height: 256, fit: 'inside' }, 85],
];

(async () => {
  for (const [input, output, resize, quality] of jobs) {
    const info = await sharp(path.join(dir, input))
      .resize(resize)
      .webp({ quality, effort: 6 })
      .toFile(path.join(dir, output));
    console.log(`${input} -> ${output}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(0)} KB`);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
