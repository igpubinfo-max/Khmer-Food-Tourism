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
      <!-- Rich Royal Khmer Gold Gradients -->
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FDE68A" />
        <stop offset="18%" stop-color="#F59E0B" />
        <stop offset="55%" stop-color="#D97706" />
        <stop offset="85%" stop-color="#B45309" />
        <stop offset="100%" stop-color="#78350F" />
      </linearGradient>

      <linearGradient id="goldHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFFBEB" />
        <stop offset="40%" stop-color="#FDE68A" />
        <stop offset="100%" stop-color="#F59E0B" />
      </linearGradient>

      <linearGradient id="goldRimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#F59E0B" />
        <stop offset="20%" stop-color="#FFFBEB" />
        <stop offset="50%" stop-color="#FDE68A" />
        <stop offset="80%" stop-color="#FFFBEB" />
        <stop offset="100%" stop-color="#F59E0B" />
      </linearGradient>

      <linearGradient id="soupGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#78350F" />
        <stop offset="50%" stop-color="#B45309" />
        <stop offset="100%" stop-color="#D97706" />
      </linearGradient>

      <linearGradient id="phkaGlow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#FFFBEB" />
        <stop offset="50%" stop-color="#FFFFFF" />
        <stop offset="100%" stop-color="#FFFBEB" />
      </linearGradient>

      <filter id="emblemShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="2.6" flood-color="#011F18" flood-opacity="0.65"/>
      </filter>

      <filter id="motifGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0.8" stdDeviation="0.8" flood-color="#78350F" flood-opacity="0.7"/>
      </filter>
    </defs>

    <g transform="translate(50, 50) scale(0.85) translate(-50, -50)" filter="url(#emblemShadow)">
      
      <!-- ============================================== -->
      <!-- 1. ANGKOR WAT MAJESTIC TRIPLE SPIRES           -->
      <!-- ============================================== -->
      <!-- Left Tower (កំពូលខាងឆ្វេង) -->
      <g opacity="0.95">
        <path d="M34 22 C32.5 25, 32.5 28, 34 31 C35.5 28, 35.5 25, 34 22 Z" fill="url(#goldHighlight)" />
        <path d="M30 31 L38 31 L36.5 35 L31.5 35 Z" fill="url(#goldGrad)" />
        <path d="M29 35.5 L39 35.5 L38 40 L30 40 Z" fill="url(#goldGrad)" />
        <path d="M28 40.5 L40 40.5 L40.5 48 L27.5 48 Z" fill="url(#goldGrad)" />
        <line x1="30" y1="31" x2="38" y2="31" stroke="#FFFBEB" stroke-width="0.7" />
        <line x1="29" y1="35.5" x2="39" y2="35.5" stroke="#FFFBEB" stroke-width="0.7" />
      </g>

      <!-- Right Tower (កំពូលខាងស្តាំ) -->
      <g opacity="0.95">
        <path d="M66 22 C64.5 25, 64.5 28, 66 31 C67.5 28, 67.5 25, 66 22 Z" fill="url(#goldHighlight)" />
        <path d="M62 31 L70 31 L68.5 35 L63.5 35 Z" fill="url(#goldGrad)" />
        <path d="M61 35.5 L71 35.5 L70 40 L62 40 Z" fill="url(#goldGrad)" />
        <path d="M60 40.5 L72 40.5 L72.5 48 L59.5 48 Z" fill="url(#goldGrad)" />
        <line x1="62" y1="31" x2="70" y2="31" stroke="#FFFBEB" stroke-width="0.7" />
        <line x1="61" y1="35.5" x2="71" y2="35.5" stroke="#FFFBEB" stroke-width="0.7" />
      </g>

      <!-- Central Grand Angkor Spire (កំពូលកណ្តាលធំស្កឹមស្កៃ) -->
      <g>
        <path d="M50 12 C48 16, 47 21, 50 25 C53 21, 52 16, 50 12 Z" fill="url(#goldHighlight)" />
        <path d="M44 25.5 L56 25.5 L54 30 L46 30 Z" fill="url(#goldGrad)" />
        <path d="M42 30.5 L58 30.5 L56 36 L44 36 Z" fill="url(#goldGrad)" />
        <path d="M40 36.5 L60 36.5 L59 43 L41 43 Z" fill="url(#goldGrad)" />
        <path d="M39 43.5 L61 43.5 L61.5 50 L38.5 50 Z" fill="url(#goldGrad)" />
        <line x1="44" y1="25.5" x2="56" y2="25.5" stroke="#FFFBEB" stroke-width="0.9" stroke-linecap="round" />
        <line x1="42" y1="30.5" x2="58" y2="30.5" stroke="#FFFBEB" stroke-width="0.9" stroke-linecap="round" />
        <line x1="40" y1="36.5" x2="60" y2="36.5" stroke="#FFFBEB" stroke-width="0.9" stroke-linecap="round" />
      </g>

      <!-- ============================================== -->
      <!-- 2. DELICATE STEAM SWIRLS (ផ្សែងឈ្ងុយរចនាបថខ្មែរ) -->
      <!-- ============================================== -->
      <path d="M38 47 C33 42, 35 34, 40 34 C43 34, 44 38, 41 40" 
            stroke="#FFFBEB" stroke-width="2.3" stroke-linecap="round" fill="none" opacity="0.9" />
      <circle cx="41" cy="40" r="1.1" fill="#FFFBEB" />

      <path d="M62 47 C67 42, 65 34, 60 34 C57 34, 56 38, 59 40" 
            stroke="#FFFBEB" stroke-width="2.3" stroke-linecap="round" fill="none" opacity="0.9" />
      <circle cx="59" cy="40" r="1.1" fill="#FFFBEB" />

      <path d="M50 46 C48.5 41, 51.5 35, 50 30" 
            stroke="#FFFBEB" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 3" fill="none" opacity="0.75" />

      <!-- ============================================== -->
      <!-- 3. KHMER ROYAL PEDESTAL BOWL (ចានជើងពានក្បាច់ខ្មែរ) -->
      <!-- ============================================== -->
      <!-- Pedestal Stand Base (ជើងពានរាជ) -->
      <path d="M44 76.5 C45.5 79.5, 45 81, 41.5 83.5 L58.5 83.5 C55 81, 54.5 79.5, 56 76.5 Z" fill="url(#goldGrad)" />
      <path d="M33 83.5 C43 82, 57 82, 67 83.5 C69.5 85, 70 88, 68.5 89.5 L31.5 89.5 C30 88, 30.5 85, 33 83.5 Z" fill="url(#goldGrad)" />
      <path d="M34 88.5 Q42 85.5 50 88.5 Q58 85.5 66 88.5" stroke="#FDE68A" stroke-width="1.3" stroke-linecap="round" fill="none" />
      <line x1="32" y1="89.5" x2="68" y2="89.5" stroke="#FFFBEB" stroke-width="1.2" />

      <!-- Bowl Main Body (រាងចានកោងយ៉ាងរស់រវើក ស្រទាប់មាសរលោង) -->
      <path d="M20 50 C20.5 66, 32 77, 50 77.5 C68 77, 79.5 66, 80 50 C74 54, 62 56, 50 56 C38 56, 26 54, 20 50 Z" 
            fill="url(#goldGrad)" />

      <!-- Inner Depth / Golden Soup Surface -->
      <ellipse cx="50" cy="50" rx="28.5" ry="5.5" fill="url(#soupGrad)" />
      <ellipse cx="50" cy="50.5" rx="24" ry="3.5" fill="#78350F" opacity="0.45" />
      <path d="M30 50 Q50 53 70 50 Q50 48.5 30 50 Z" fill="#FDE68A" opacity="0.4" />

      <!-- Royal Flared Rim with Upward Corners (មាត់ចានកោងងរស្អាតដូចស្លាបសត្វ) -->
      <path d="M18 48 C19.5 49.8, 23 51.5, 27 52.2 C34 53.5, 42 54, 50 54 C58 54, 66 53.5, 73 52.2 C77 51.5, 80.5 49.8, 82 48 C79.5 46.5, 75 45.2, 69.5 44.5 C63.5 43.7, 56.5 43.3, 50 43.3 C43.5 43.3, 36.5 43.7, 30.5 44.5 C25 45.2, 20.5 46.5, 18 48 Z" 
            fill="url(#goldRimGrad)" stroke="#92400E" stroke-width="0.6" />
      
      <!-- Inner Rim Bright Gold Highlight -->
      <ellipse cx="50" cy="48.5" rx="28" ry="4.2" stroke="#FFFBEB" stroke-width="1.1" fill="none" opacity="0.95" />

      <!-- ============================================== -->
      <!-- 4. KHMER FLORAL ORNAMENTATION (ក្បាច់ផ្កាភ្ញី)   -->
      <!-- ============================================== -->
      <g filter="url(#motifGlow)">
        <!-- Lotus Beaded Frieze under the rim (កម្រងគ្រាប់ផ្កាភ្ញី) -->
        <path d="M26 55.5 Q50 59 74 55.5" stroke="#FDE68A" stroke-width="1" stroke-dasharray="1.8 2.2" fill="none" opacity="0.9" />

        <!-- Central Khmer Rosette (ក្បាច់ផ្កាចន្ទន៍ ៨ ទិស) -->
        <circle cx="50" cy="65.5" r="2.2" fill="#FFFBEB" stroke="#92400E" stroke-width="0.6" />
        <circle cx="50" cy="65.5" r="1.1" fill="#F59E0B" />

        <!-- 4 Primary Lotus Petals -->
        <path d="M50 63.3 C48.2 61, 48.2 59, 50 57.5 C51.8 59, 51.8 61, 50 63.3 Z" 
              fill="url(#phkaGlow)" stroke="#78350F" stroke-width="0.45" />
        <path d="M50 67.7 C48.2 70, 48.2 72, 50 73.5 C51.8 72, 51.8 70, 50 67.7 Z" 
              fill="url(#phkaGlow)" stroke="#78350F" stroke-width="0.45" />
        <path d="M47.8 65.5 C45.5 63.7, 43.5 63.7, 42 65.5 C43.5 67.3, 45.5 67.3, 47.8 65.5 Z" 
              fill="url(#phkaGlow)" stroke="#78350F" stroke-width="0.45" />
        <path d="M52.2 65.5 C54.5 63.7, 56.5 63.7, 58 65.5 C56.5 67.3, 54.5 67.3, 52.2 65.5 Z" 
              fill="url(#phkaGlow)" stroke="#78350F" stroke-width="0.45" />

        <!-- 4 Intercardinal Accent Buds -->
        <circle cx="46.5" cy="62.5" r="0.9" fill="#FFFBEB" stroke="#B45309" stroke-width="0.3" />
        <circle cx="53.5" cy="62.5" r="0.9" fill="#FFFBEB" stroke="#B45309" stroke-width="0.3" />
        <circle cx="46.5" cy="68.5" r="0.9" fill="#FFFBEB" stroke="#B45309" stroke-width="0.3" />
        <circle cx="53.5" cy="68.5" r="0.9" fill="#FFFBEB" stroke="#B45309" stroke-width="0.3" />

        <!-- LEFT KHMER FLORAL VINE SCROLL (ក្បាច់ភ្ញីទេសឆ្វេង) -->
        <path d="M42 65.5 C37 65, 33 62, 29.5 64.5 C26.5 66.8, 28 70.5, 31.5 69.5 C34.5 68.5, 35 64.5, 31.5 64" 
              stroke="#FFFBEB" stroke-width="1.4" stroke-linecap="round" fill="none" />
        
        <path d="M35.5 64 C34.5 60, 30 59, 28 61 C26.8 62.2, 28.5 64, 30.5 63" 
              stroke="#FDE68A" stroke-width="1.2" stroke-linecap="round" fill="none" />

        <path d="M26.5 65 C23.5 62, 21.5 63, 21 64.5 C20.5 66, 23 67.5, 25 66.8" 
              stroke="#FDE68A" stroke-width="1.1" stroke-linecap="round" fill="none" />

        <circle cx="31.5" cy="69.5" r="0.9" fill="#FFFBEB" />
        <circle cx="28" cy="60.5" r="0.8" fill="#FFFBEB" />
        <circle cx="21" cy="64.5" r="0.7" fill="#FFFBEB" />

        <!-- RIGHT KHMER FLORAL VINE SCROLL (ក្បាច់ភ្ញីទេសស្តាំ) -->
        <path d="M58 65.5 C63 65, 67 62, 70.5 64.5 C73.5 66.8, 72 70.5, 68.5 69.5 C65.5 68.5, 65 64.5, 68.5 64" 
              stroke="#FFFBEB" stroke-width="1.4" stroke-linecap="round" fill="none" />
        
        <path d="M64.5 64 C65.5 60, 70 59, 72 61 C73.2 62.2, 71.5 64, 69.5 63" 
              stroke="#FDE68A" stroke-width="1.2" stroke-linecap="round" fill="none" />

        <path d="M73.5 65 C76.5 62, 78.5 63, 79 64.5 C79.5 66, 77 67.5, 75 66.8" 
              stroke="#FDE68A" stroke-width="1.1" stroke-linecap="round" fill="none" />

        <circle cx="68.5" cy="69.5" r="0.9" fill="#FFFBEB" />
        <circle cx="72" cy="60.5" r="0.8" fill="#FFFBEB" />
        <circle cx="79" cy="64.5" r="0.7" fill="#FFFBEB" />

        <!-- Lower Petal Accent Curve -->
        <path d="M39 74.5 Q50 77.5 61 74.5" stroke="#FDE68A" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.9" />
        <circle cx="50" cy="76" r="0.8" fill="#FFFBEB" />
      </g>
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
      <stop offset="0%" stop-color="#FDE68A" />
      <stop offset="18%" stop-color="#F59E0B" />
      <stop offset="55%" stop-color="#D97706" />
      <stop offset="85%" stop-color="#B45309" />
      <stop offset="100%" stop-color="#78350F" />
    </linearGradient>
    <linearGradient id="goldHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFBEB" />
      <stop offset="40%" stop-color="#FDE68A" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <linearGradient id="goldRimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="20%" stop-color="#FFFBEB" />
      <stop offset="50%" stop-color="#FDE68A" />
      <stop offset="80%" stop-color="#FFFBEB" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <linearGradient id="soupGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#78350F" />
      <stop offset="50%" stop-color="#B45309" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <linearGradient id="phkaGlow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFFBEB" />
      <stop offset="50%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#FFFBEB" />
    </linearGradient>
    <filter id="emblemShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="2.6" flood-color="#011F18" flood-opacity="0.65"/>
    </filter>
    <filter id="motifGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0.8" stdDeviation="0.8" flood-color="#78350F" flood-opacity="0.7"/>
    </filter>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#emeraldBg)" />
  <rect x="3.5" y="3.5" width="93" height="93" rx="19.5" fill="none" stroke="#F59E0B" stroke-width="0.8" opacity="0.3" />
  <g transform="translate(50, 50) scale(0.85) translate(-50, -50)" filter="url(#emblemShadow)">
    <!-- 1. ANGKOR WAT TRIPLE SPIRES -->
    <g opacity="0.95">
      <path d="M34 22 C32.5 25, 32.5 28, 34 31 C35.5 28, 35.5 25, 34 22 Z" fill="url(#goldHighlight)" />
      <path d="M30 31 L38 31 L36.5 35 L31.5 35 Z" fill="url(#goldGrad)" />
      <path d="M29 35.5 L39 35.5 L38 40 L30 40 Z" fill="url(#goldGrad)" />
      <path d="M28 40.5 L40 40.5 L40.5 48 L27.5 48 Z" fill="url(#goldGrad)" />
      <line x1="30" y1="31" x2="38" y2="31" stroke="#FFFBEB" stroke-width="0.7" />
      <line x1="29" y1="35.5" x2="39" y2="35.5" stroke="#FFFBEB" stroke-width="0.7" />
    </g>
    <g opacity="0.95">
      <path d="M66 22 C64.5 25, 64.5 28, 66 31 C67.5 28, 67.5 25, 66 22 Z" fill="url(#goldHighlight)" />
      <path d="M62 31 L70 31 L68.5 35 L63.5 35 Z" fill="url(#goldGrad)" />
      <path d="M61 35.5 L71 35.5 L70 40 L62 40 Z" fill="url(#goldGrad)" />
      <path d="M60 40.5 L72 40.5 L72.5 48 L59.5 48 Z" fill="url(#goldGrad)" />
      <line x1="62" y1="31" x2="70" y2="31" stroke="#FFFBEB" stroke-width="0.7" />
      <line x1="61" y1="35.5" x2="71" y2="35.5" stroke="#FFFBEB" stroke-width="0.7" />
    </g>
    <g>
      <path d="M50 12 C48 16, 47 21, 50 25 C53 21, 52 16, 50 12 Z" fill="url(#goldHighlight)" />
      <path d="M44 25.5 L56 25.5 L54 30 L46 30 Z" fill="url(#goldGrad)" />
      <path d="M42 30.5 L58 30.5 L56 36 L44 36 Z" fill="url(#goldGrad)" />
      <path d="M40 36.5 L60 36.5 L59 43 L41 43 Z" fill="url(#goldGrad)" />
      <path d="M39 43.5 L61 43.5 L61.5 50 L38.5 50 Z" fill="url(#goldGrad)" />
      <line x1="44" y1="25.5" x2="56" y2="25.5" stroke="#FFFBEB" stroke-width="0.9" stroke-linecap="round" />
      <line x1="42" y1="30.5" x2="58" y2="30.5" stroke="#FFFBEB" stroke-width="0.9" stroke-linecap="round" />
      <line x1="40" y1="36.5" x2="60" y2="36.5" stroke="#FFFBEB" stroke-width="0.9" stroke-linecap="round" />
    </g>
    <!-- 2. DELICATE STEAM SWIRLS -->
    <path d="M38 47 C33 42, 35 34, 40 34 C43 34, 44 38, 41 40" stroke="#FFFBEB" stroke-width="2.3" stroke-linecap="round" fill="none" opacity="0.9" />
    <circle cx="41" cy="40" r="1.1" fill="#FFFBEB" />
    <path d="M62 47 C67 42, 65 34, 60 34 C57 34, 56 38, 59 40" stroke="#FFFBEB" stroke-width="2.3" stroke-linecap="round" fill="none" opacity="0.9" />
    <circle cx="59" cy="40" r="1.1" fill="#FFFBEB" />
    <path d="M50 46 C48.5 41, 51.5 35, 50 30" stroke="#FFFBEB" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 3" fill="none" opacity="0.75" />
    <!-- 3. KHMER ROYAL PEDESTAL BOWL -->
    <path d="M44 76.5 C45.5 79.5, 45 81, 41.5 83.5 L58.5 83.5 C55 81, 54.5 79.5, 56 76.5 Z" fill="url(#goldGrad)" />
    <path d="M33 83.5 C43 82, 57 82, 67 83.5 C69.5 85, 70 88, 68.5 89.5 L31.5 89.5 C30 88, 30.5 85, 33 83.5 Z" fill="url(#goldGrad)" />
    <path d="M34 88.5 Q42 85.5 50 88.5 Q58 85.5 66 88.5" stroke="#FDE68A" stroke-width="1.3" stroke-linecap="round" fill="none" />
    <line x1="32" y1="89.5" x2="68" y2="89.5" stroke="#FFFBEB" stroke-width="1.2" />
    <path d="M20 50 C20.5 66, 32 77, 50 77.5 C68 77, 79.5 66, 80 50 C74 54, 62 56, 50 56 C38 56, 26 54, 20 50 Z" fill="url(#goldGrad)" />
    <ellipse cx="50" cy="50" rx="28.5" ry="5.5" fill="url(#soupGrad)" />
    <ellipse cx="50" cy="50.5" rx="24" ry="3.5" fill="#78350F" opacity="0.45" />
    <path d="M30 50 Q50 53 70 50 Q50 48.5 30 50 Z" fill="#FDE68A" opacity="0.4" />
    <path d="M18 48 C19.5 49.8, 23 51.5, 27 52.2 C34 53.5, 42 54, 50 54 C58 54, 66 53.5, 73 52.2 C77 51.5, 80.5 49.8, 82 48 C79.5 46.5, 75 45.2, 69.5 44.5 C63.5 43.7, 56.5 43.3, 50 43.3 C43.5 43.3, 36.5 43.7, 30.5 44.5 C25 45.2, 20.5 46.5, 18 48 Z" fill="url(#goldRimGrad)" stroke="#92400E" stroke-width="0.6" />
    <ellipse cx="50" cy="48.5" rx="28" ry="4.2" stroke="#FFFBEB" stroke-width="1.1" fill="none" opacity="0.95" />
    <!-- 4. KHMER FLORAL ORNAMENTATION (ក្បាច់ផ្កាភ្ញី) -->
    <g filter="url(#motifGlow)">
      <path d="M26 55.5 Q50 59 74 55.5" stroke="#FDE68A" stroke-width="1" stroke-dasharray="1.8 2.2" fill="none" opacity="0.9" />
      <circle cx="50" cy="65.5" r="2.2" fill="#FFFBEB" stroke="#92400E" stroke-width="0.6" />
      <circle cx="50" cy="65.5" r="1.1" fill="#F59E0B" />
      <path d="M50 63.3 C48.2 61, 48.2 59, 50 57.5 C51.8 59, 51.8 61, 50 63.3 Z" fill="url(#phkaGlow)" stroke="#78350F" stroke-width="0.45" />
      <path d="M50 67.7 C48.2 70, 48.2 72, 50 73.5 C51.8 72, 51.8 70, 50 67.7 Z" fill="url(#phkaGlow)" stroke="#78350F" stroke-width="0.45" />
      <path d="M47.8 65.5 C45.5 63.7, 43.5 63.7, 42 65.5 C43.5 67.3, 45.5 67.3, 47.8 65.5 Z" fill="url(#phkaGlow)" stroke="#78350F" stroke-width="0.45" />
      <path d="M52.2 65.5 C54.5 63.7, 56.5 63.7, 58 65.5 C56.5 67.3, 54.5 67.3, 52.2 65.5 Z" fill="url(#phkaGlow)" stroke="#78350F" stroke-width="0.45" />
      <circle cx="46.5" cy="62.5" r="0.9" fill="#FFFBEB" stroke="#B45309" stroke-width="0.3" />
      <circle cx="53.5" cy="62.5" r="0.9" fill="#FFFBEB" stroke="#B45309" stroke-width="0.3" />
      <circle cx="46.5" cy="68.5" r="0.9" fill="#FFFBEB" stroke="#B45309" stroke-width="0.3" />
      <circle cx="53.5" cy="68.5" r="0.9" fill="#FFFBEB" stroke="#B45309" stroke-width="0.3" />
      <path d="M42 65.5 C37 65, 33 62, 29.5 64.5 C26.5 66.8, 28 70.5, 31.5 69.5 C34.5 68.5, 35 64.5, 31.5 64" stroke="#FFFBEB" stroke-width="1.4" stroke-linecap="round" fill="none" />
      <path d="M35.5 64 C34.5 60, 30 59, 28 61 C26.8 62.2, 28.5 64, 30.5 63" stroke="#FDE68A" stroke-width="1.2" stroke-linecap="round" fill="none" />
      <path d="M26.5 65 C23.5 62, 21.5 63, 21 64.5 C20.5 66, 23 67.5, 25 66.8" stroke="#FDE68A" stroke-width="1.1" stroke-linecap="round" fill="none" />
      <circle cx="31.5" cy="69.5" r="0.9" fill="#FFFBEB" />
      <circle cx="28" cy="60.5" r="0.8" fill="#FFFBEB" />
      <circle cx="21" cy="64.5" r="0.7" fill="#FFFBEB" />
      <path d="M58 65.5 C63 65, 67 62, 70.5 64.5 C73.5 66.8, 72 70.5, 68.5 69.5 C65.5 68.5, 65 64.5, 68.5 64" stroke="#FFFBEB" stroke-width="1.4" stroke-linecap="round" fill="none" />
      <path d="M64.5 64 C65.5 60, 70 59, 72 61 C73.2 62.2, 71.5 64, 69.5 63" stroke="#FDE68A" stroke-width="1.2" stroke-linecap="round" fill="none" />
      <path d="M73.5 65 C76.5 62, 78.5 63, 79 64.5 C79.5 66, 77 67.5, 75 66.8" stroke="#FDE68A" stroke-width="1.1" stroke-linecap="round" fill="none" />
      <circle cx="68.5" cy="69.5" r="0.9" fill="#FFFBEB" />
      <circle cx="72" cy="60.5" r="0.8" fill="#FFFBEB" />
      <circle cx="79" cy="64.5" r="0.7" fill="#FFFBEB" />
      <path d="M39 74.5 Q50 77.5 61 74.5" stroke="#FDE68A" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.9" />
      <circle cx="50" cy="76" r="0.8" fill="#FFFBEB" />
    </g>
  </g>
</svg>`;
  fs.writeFileSync(path.join(PROJECT_ROOT, 'public', 'logo.svg'), logoSvg, 'utf8');
  console.log('✓ Updated public/logo.svg');

  console.log('All icons generated and mathematically centered!');
}

main().catch(console.error);
