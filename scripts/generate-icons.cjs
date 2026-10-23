const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const PNG = require('pngjs').PNG;

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Helper: Bilinear resize of a PNG
function resizePng(srcPng, targetW, targetH) {
  const dstPng = new PNG({ width: targetW, height: targetH });
  const xRatio = srcPng.width / targetW;
  const yRatio = srcPng.height / targetH;

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const srcX = Math.min(srcPng.width - 1, Math.floor(x * xRatio));
      const srcY = Math.min(srcPng.height - 1, Math.floor(y * yRatio));
      const srcIdx = (srcY * srcPng.width + srcX) << 2;
      const dstIdx = (y * targetW + x) << 2;

      dstPng.data[dstIdx] = srcPng.data[srcIdx];
      dstPng.data[dstIdx + 1] = srcPng.data[srcIdx + 1];
      dstPng.data[dstIdx + 2] = srcPng.data[srcIdx + 2];
      dstPng.data[dstIdx + 3] = srcPng.data[srcIdx + 3];
    }
  }
  return dstPng;
}

// Helper: Center emblem pixels inside a transparent PNG canvas
function centerEmblem(png) {
  let minX = png.width, maxX = 0, minY = png.height, maxY = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (y * png.width + x) << 2;
      if (png.data[idx + 3] > 15) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const targetX = Math.round((png.width - w) / 2);
  const targetY = Math.round((png.height - h) / 2);
  const dx = targetX - minX;
  const dy = targetY - minY;

  const result = new PNG({ width: png.width, height: png.height });
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const srcIdx = (y * png.width + x) << 2;
      const dstX = x + dx;
      const dstY = y + dy;
      if (dstX >= 0 && dstX < png.width && dstY >= 0 && dstY < png.height) {
        const dstIdx = (dstY * png.width + dstX) << 2;
        result.data[dstIdx] = png.data[srcIdx];
        result.data[dstIdx + 1] = png.data[srcIdx + 1];
        result.data[dstIdx + 2] = png.data[srcIdx + 2];
        result.data[dstIdx + 3] = png.data[srcIdx + 3];
      }
    }
  }
  return result;
}

// Helper: Composite foreground over background
function compositeOver(bgPng, fgPng) {
  const result = new PNG({ width: bgPng.width, height: bgPng.height });
  bgPng.data.copy(result.data);

  // Resize fgPng if sizes differ
  const scaledFg = (fgPng.width === bgPng.width && fgPng.height === bgPng.height)
    ? fgPng
    : resizePng(fgPng, bgPng.width, bgPng.height);

  for (let i = 0; i < result.data.length; i += 4) {
    const fgAlpha = scaledFg.data[i + 3] / 255;
    if (fgAlpha > 0) {
      const bgAlpha = result.data[i + 3] / 255;
      const outAlpha = fgAlpha + bgAlpha * (1 - fgAlpha);

      result.data[i] = Math.round((scaledFg.data[i] * fgAlpha + result.data[i] * bgAlpha * (1 - fgAlpha)) / outAlpha);
      result.data[i + 1] = Math.round((scaledFg.data[i + 1] * fgAlpha + result.data[i + 1] * bgAlpha * (1 - fgAlpha)) / outAlpha);
      result.data[i + 2] = Math.round((scaledFg.data[i + 2] * fgAlpha + result.data[i + 2] * bgAlpha * (1 - fgAlpha)) / outAlpha);
      result.data[i + 3] = Math.round(outAlpha * 255);
    }
  }
  return result;
}

// Generate Emerald background PNG (squircle, round, or full square for Play Store)
function createEmeraldBg(size, mode = 'squircle') { // 'squircle' | 'round' | 'full'
  const png = new PNG({ width: size, height: size });
  const center = size / 2;
  const radius = (size / 2) - 1;
  const cornerRadius = size * 0.22;

  // Colors: Gradient from #065F46 (top-left) to #064E3B (mid) to #022C22 (bottom-right)
  const c1 = [6, 95, 70];
  const c2 = [6, 78, 59];
  const c3 = [2, 44, 34];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) << 2;
      let inside = false;

      if (mode === 'full') {
        inside = true;
      } else if (mode === 'round') {
        const dist = Math.hypot(x - center + 0.5, y - center + 0.5);
        if (dist <= radius) inside = true;
      } else {
        // Squircle / rounded rectangle
        const dx = Math.abs(x - center + 0.5);
        const dy = Math.abs(y - center + 0.5);
        const innerHalf = center - cornerRadius;
        if (dx <= innerHalf || dy <= innerHalf) {
          inside = true;
        } else {
          const cornerDist = Math.hypot(dx - innerHalf, dy - innerHalf);
          if (cornerDist <= cornerRadius) inside = true;
        }
      }

      if (inside) {
        const factor = (x + y) / (size * 2);
        let r, g, b;
        if (factor < 0.5) {
          const f = factor / 0.5;
          r = Math.round(c1[0] + (c2[0] - c1[0]) * f);
          g = Math.round(c1[1] + (c2[1] - c1[1]) * f);
          b = Math.round(c1[2] + (c2[2] - c1[2]) * f);
        } else {
          const f = (factor - 0.5) / 0.5;
          r = Math.round(c2[0] + (c3[0] - c2[0]) * f);
          g = Math.round(c2[1] + (c3[1] - c2[1]) * f);
          b = Math.round(c2[2] + (c3[2] - c2[2]) * f);
        }
        png.data[idx] = r;
        png.data[idx + 1] = g;
        png.data[idx + 2] = b;
        png.data[idx + 3] = 255;
      } else {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
      }
    }
  }
  return png;
}

// Master Emblem SVG HTML (Transparent background, centered)
function createMasterEmblemHtml() {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 512px; height: 512px; background: transparent; overflow: hidden; }
    svg { position: fixed; left: 0; top: 0; width: 512px; height: 512px; display: block; }
  </style>
</head>
<body>
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FCD34D" />
        <stop offset="25%" stop-color="#F59E0B" />
        <stop offset="65%" stop-color="#D97706" />
        <stop offset="100%" stop-color="#B45309" />
      </linearGradient>
      <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#FDE68A" />
        <stop offset="50%" stop-color="#FFFBEB" />
        <stop offset="100%" stop-color="#FDE68A" />
      </linearGradient>
      <filter id="emblemShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="#011F18" flood-opacity="0.55"/>
      </filter>
    </defs>
    <g transform="translate(50, 50) scale(0.80) translate(-50, -50)" filter="url(#emblemShadow)">
      <!-- Temple Silhouette & Lotus Bowl -->
      <path d="M50 16 L53 26 L47 26 Z" fill="url(#goldGrad)" />
      <path d="M44 27 L56 27 L50 19 Z" fill="url(#goldGrad)" />
      <!-- Central Spire -->
      <path d="M48 28 L52 28 L54 43 L46 43 Z" fill="url(#goldGrad)" />
      <path d="M42 35 L45 35 L46 43 L41 43 Z" fill="url(#goldGrad)" />
      <path d="M58 35 L55 35 L54 43 L59 43 Z" fill="url(#goldGrad)" />
      <!-- Food / Steaming Bowl -->
      <path d="M25 51 Q50 43 75 51 Q72 76 50 79 Q28 76 25 51 Z" fill="url(#goldGrad)" />
      <path d="M22 50 Q50 46 78 50 Q74 54 50 54 Q26 54 22 50 Z" fill="url(#goldRim)" />
      <!-- Steam Leaves / Apsara crown touch -->
      <path d="M38 45 Q40 38 45 43" stroke="#FEF3C7" stroke-width="2.5" stroke-linecap="round" fill="none" />
      <path d="M50 43 Q52 35 57 41" stroke="#FEF3C7" stroke-width="2.5" stroke-linecap="round" fill="none" />
      <path d="M62 45 Q64 39 68 44" stroke="#FEF3C7" stroke-width="2.5" stroke-linecap="round" fill="none" />
      <!-- Base Stand -->
      <path d="M38 79 L62 79 L65 84 L35 84 Z" fill="url(#goldGrad)" opacity="0.95" />
    </g>
  </svg>
</body>
</html>`;
}

function renderMasterEmblem() {
  const masterHtml = path.join(PROJECT_ROOT, '_master_emblem.html');
  const masterPng = path.join(PROJECT_ROOT, '_master_emblem.png');
  fs.writeFileSync(masterHtml, createMasterEmblemHtml(), 'utf8');

  spawnSync(EDGE_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--default-background-color=00000000',
    `--screenshot=${masterPng}`,
    '--window-size=512,512',
    `file:///${masterHtml.replace(/\\/g, '/')}`
  ]);

  try { fs.unlinkSync(masterHtml); } catch(e) {}

  const rawPng = PNG.sync.read(fs.readFileSync(masterPng));
  try { fs.unlinkSync(masterPng); } catch(e) {}

  // Crop & perfectly center the master emblem
  const centered = centerEmblem(rawPng);
  return centered;
}

async function main() {
  console.log('Rendering high-precision master emblem...');
  const masterEmblem = renderMasterEmblem();

  // Create Adaptive Foreground master (108dp canvas where emblem is ~54dp)
  // Master is 512, emblem height is ~270px (about 53% of canvas).
  // In adaptive icon (108dp), safe zone is 66dp. 53% is ~57dp, fits inside 66dp!
  const adaptiveFgMaster = masterEmblem;

  const densities = [
    { dir: 'mipmap-mdpi', fg: 108, legacy: 48 },
    { dir: 'mipmap-hdpi', fg: 162, legacy: 72 },
    { dir: 'mipmap-xhdpi', fg: 216, legacy: 96 },
    { dir: 'mipmap-xxhdpi', fg: 324, legacy: 144 },
    { dir: 'mipmap-xxxhdpi', fg: 432, legacy: 192 },
  ];

  for (const d of densities) {
    const targetDir = path.join(PROJECT_ROOT, 'android', 'app', 'src', 'main', 'res', d.dir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // 1. Adaptive Icon Foreground (Transparent background + perfectly centered emblem)
    const fgResized = resizePng(adaptiveFgMaster, d.fg, d.fg);
    const fgCentered = centerEmblem(fgResized);
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_foreground.png'), PNG.sync.write(fgCentered));

    // 2. Legacy Square Icon (Emerald background + centered emblem)
    const squareBg = createEmeraldBg(d.legacy, 'squircle');
    const legacyFg = resizePng(masterEmblem, d.legacy, d.legacy);
    const legacyCentered = centerEmblem(legacyFg);
    const legacySquare = compositeOver(squareBg, legacyCentered);
    fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), PNG.sync.write(legacySquare));

    // 3. Legacy Round Icon (Emerald circle + centered emblem)
    const roundBg = createEmeraldBg(d.legacy, 'round');
    const legacyRound = compositeOver(roundBg, legacyCentered);
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), PNG.sync.write(legacyRound));

    console.log(`✓ Generated ${d.dir} (fg: ${d.fg}x${d.fg}, legacy: ${d.legacy}x${d.legacy})`);
  }

  // 4. Play Store 512x512 icons (Full solid square background required by Google Play Console)
  const storeBg512 = createEmeraldBg(512, 'full');
  const storeIcon512 = compositeOver(storeBg512, masterEmblem);
  const storePngBuffer = PNG.sync.write(storeIcon512);

  const playStorePath1 = path.join(PROJECT_ROOT, 'PlayStore-Assets', 'app-icon-512x512.png');
  fs.writeFileSync(playStorePath1, storePngBuffer);

  const playStorePath2 = path.join(PROJECT_ROOT, 'PlayStore-Assets', 'PlayStore-Assets', 'app-icon-512x512.png');
  if (fs.existsSync(path.dirname(playStorePath2))) {
    fs.writeFileSync(playStorePath2, storePngBuffer);
  }

  // 5. PWA icons (Full square background for icon-512 and icon-192)
  fs.writeFileSync(path.join(PROJECT_ROOT, 'public', 'icon-512.png'), storePngBuffer);
  const icon192 = compositeOver(createEmeraldBg(192, 'full'), resizePng(masterEmblem, 192, 192));
  fs.writeFileSync(path.join(PROJECT_ROOT, 'public', 'icon-192.png'), PNG.sync.write(icon192));

  // 6. Update public/logo.svg with emerald background
  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <defs>
    <linearGradient id="emeraldBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#065F46" />
      <stop offset="60%" stop-color="#064E3B" />
      <stop offset="100%" stop-color="#022C22" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FCD34D" />
      <stop offset="25%" stop-color="#F59E0B" />
      <stop offset="65%" stop-color="#D97706" />
      <stop offset="100%" stop-color="#B45309" />
    </linearGradient>
    <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FDE68A" />
      <stop offset="50%" stop-color="#FFFBEB" />
      <stop offset="100%" stop-color="#FDE68A" />
    </linearGradient>
    <filter id="emblemShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#011F18" flood-opacity="0.55"/>
    </filter>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#emeraldBg)" />
  <rect x="3.5" y="3.5" width="93" height="93" rx="19.5" fill="none" stroke="#F59E0B" stroke-width="0.8" opacity="0.3" />
  <g transform="translate(50, 50) scale(0.80) translate(-50, -50)" filter="url(#emblemShadow)">
    <!-- Temple Silhouette & Lotus Bowl -->
    <path d="M50 16 L53 26 L47 26 Z" fill="url(#goldGrad)" />
    <path d="M44 27 L56 27 L50 19 Z" fill="url(#goldGrad)" />
    <!-- Central Spire -->
    <path d="M48 28 L52 28 L54 43 L46 43 Z" fill="url(#goldGrad)" />
    <path d="M42 35 L45 35 L46 43 L41 43 Z" fill="url(#goldGrad)" />
    <path d="M58 35 L55 35 L54 43 L59 43 Z" fill="url(#goldGrad)" />
    <!-- Food / Steaming Bowl -->
    <path d="M25 51 Q50 43 75 51 Q72 76 50 79 Q28 76 25 51 Z" fill="url(#goldGrad)" />
    <path d="M22 50 Q50 46 78 50 Q74 54 50 54 Q26 54 22 50 Z" fill="url(#goldRim)" />
    <!-- Steam Leaves / Apsara crown touch -->
    <path d="M38 45 Q40 38 45 43" stroke="#FEF3C7" stroke-width="2.5" stroke-linecap="round" fill="none" />
    <path d="M50 43 Q52 35 57 41" stroke="#FEF3C7" stroke-width="2.5" stroke-linecap="round" fill="none" />
    <path d="M62 45 Q64 39 68 44" stroke="#FEF3C7" stroke-width="2.5" stroke-linecap="round" fill="none" />
    <!-- Base Stand -->
    <path d="M38 79 L62 79 L65 84 L35 84 Z" fill="url(#goldGrad)" opacity="0.95" />
  </g>
</svg>`;
  fs.writeFileSync(path.join(PROJECT_ROOT, 'public', 'logo.svg'), logoSvg, 'utf8');
  console.log('✓ Updated public/logo.svg');

  console.log('All icons generated and mathematically centered!');
}

main().catch(console.error);
