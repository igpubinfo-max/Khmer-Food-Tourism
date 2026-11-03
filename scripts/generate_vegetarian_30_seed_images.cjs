/**
 * Generates 30 high-resolution, unique baseline JPEG images for food-201 to food-230
 * with authentic Cambodian vegetarian branding, vibrant culinary colors, and unique SHA1 hashes.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PUBLIC_FOODS = path.join(PROJECT_ROOT, 'public/foods');
const ANDROID_FOODS = path.join(PROJECT_ROOT, 'android/app/src/main/assets/public/foods');

if (!fs.existsSync(PUBLIC_FOODS)) fs.mkdirSync(PUBLIC_FOODS, { recursive: true });
if (!fs.existsSync(ANDROID_FOODS)) fs.mkdirSync(ANDROID_FOODS, { recursive: true });

// Read dish definitions from seedVegetarian30Foods.ts
const seedContent = fs.readFileSync(path.join(PROJECT_ROOT, 'src/data/seedVegetarian30Foods.ts'), 'utf8');
const idRegex = /id:\s*'(food-2\d\d)',\s*nameKh:\s*'([^']+)',\s*nameEn:\s*'([^']+)',\s*nameZh:\s*'([^']+)'/g;

const dishes = [];
let match;
while ((match = idRegex.exec(seedContent)) !== null) {
  dishes.push({
    id: match[1],
    nameKh: match[2],
    nameEn: match[3],
    nameZh: match[4]
  });
}

console.log(`Generating 30 vegetarian seed images for ${dishes.length} dishes...`);

// Visual theme color palettes based on culinary category
const PALETTES = [
  { bg1: [24, 76, 48], bg2: [12, 42, 26], accent: [52, 211, 153], badge: [16, 185, 129] },   // Herbal Jade
  { bg1: [146, 64, 14], bg2: [69, 26, 3], accent: [251, 191, 36], badge: [245, 158, 11] },   // Golden Turmeric / Curry
  { bg1: [136, 19, 55], bg2: [76, 5, 25], accent: [251, 113, 133], badge: [225, 29, 72] },   // Red Tamarind / Kroeung
  { bg1: [30, 58, 138], bg2: [15, 23, 42], accent: [96, 165, 250], badge: [59, 130, 246] },   // Royal Blue Water Lily
  { bg1: [113, 63, 18], bg2: [66, 32, 6], accent: [217, 119, 6], badge: [180, 83, 9] },      // Roasted Ginger / Tofu
  { bg1: [67, 56, 202], bg2: [30, 27, 75], accent: [165, 180, 252], badge: [99, 102, 241] },  // Purple Eggplant
];

for (let i = 0; i < dishes.length; i++) {
  const d = dishes[i];
  const pal = PALETTES[i % PALETTES.length];
  const targetPublic = path.join(PUBLIC_FOODS, `${d.id}.jpg`);
  const targetAndroid = path.join(ANDROID_FOODS, `${d.id}.jpg`);

  const psScript = `
    Add-Type -AssemblyName System.Drawing
    $w = 800
    $h = 600
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Background gradient
    $c1 = [System.Drawing.Color]::FromArgb(${pal.bg1[0]}, ${pal.bg1[1]}, ${pal.bg1[2]})
    $c2 = [System.Drawing.Color]::FromArgb(${pal.bg2[0]}, ${pal.bg2[1]}, ${pal.bg2[2]})
    $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45.0)
    $g.FillRectangle($brush, $rect)
    $brush.Dispose()

    # Decorative concentric organic circles
    $penColor = [System.Drawing.Color]::FromArgb(40, ${pal.accent[0]}, ${pal.accent[1]}, ${pal.accent[2]})
    $pen = New-Object System.Drawing.Pen($penColor, 3)
    $g.DrawEllipse($pen, 50 + (${i} * 4), 50, 700 - (${i} * 4), 500)
    $g.DrawEllipse($pen, 120, 100 + (${i} * 3), 560, 400 - (${i} * 3))
    $pen.Dispose()

    # Outer border frame
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, ${pal.accent[0]}, ${pal.accent[1]}, ${pal.accent[2]}), 4)
    $g.DrawRectangle($borderPen, 20, 20, 760, 560)
    $borderPen.Dispose()

    # Badge Pill (Vegetarian / ម្ហូបបួសខ្មែរ)
    $badgeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(${pal.badge[0]}, ${pal.badge[1]}, ${pal.badge[2]}))
    $g.FillRectangle($badgeBrush, 240, 80, 320, 52)
    $badgeBrush.Dispose()

    # Text rendering
    $fontBadge = New-Object System.Drawing.Font('Arial', 18, [System.Drawing.FontStyle]::Bold)
    $fontId = New-Object System.Drawing.Font('Arial', 24, [System.Drawing.FontStyle]::Bold)
    $fontEn = New-Object System.Drawing.Font('Arial', 20, [System.Drawing.FontStyle]::Bold)
    $fontZh = New-Object System.Drawing.Font('SimSun', 18, [System.Drawing.FontStyle]::Regular)
    $fontHint = New-Object System.Drawing.Font('Arial', 12, [System.Drawing.FontStyle]::Italic)

    $formatCenter = New-Object System.Drawing.StringFormat
    $formatCenter.Alignment = [System.Drawing.StringAlignment]::Center
    $formatCenter.LineAlignment = [System.Drawing.StringAlignment]::Center

    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(${pal.accent[0]}, ${pal.accent[1]}, ${pal.accent[2]}))
    $hintBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 220, 220, 220))

    $g.DrawString('CAMBODIAN VEGETARIAN DISH', $fontBadge, $whiteBrush, 400, 106, $formatCenter)
    $g.DrawString('${d.id.toUpperCase()}', $fontId, $accentBrush, 400, 200, $formatCenter)

    $cleanEn = '${d.nameEn.replace(/'/g, "''")}'
    $rectEn = New-Object System.Drawing.RectangleF(40, 260, 720, 100)
    $g.DrawString($cleanEn, $fontEn, $whiteBrush, $rectEn, $formatCenter)

    $cleanZh = '${d.nameZh.replace(/'/g, "''")}'
    $rectZh = New-Object System.Drawing.RectangleF(40, 370, 720, 50)
    $g.DrawString($cleanZh, $fontZh, $accentBrush, $rectZh, $formatCenter)

    $g.DrawString('Authentic Khmer Culinary Heritage - Excel Photo Replace Ready', $fontHint, $hintBrush, 400, 510, $formatCenter)

    $fontBadge.Dispose()
    $fontId.Dispose()
    $fontEn.Dispose()
    $fontZh.Dispose()
    $fontHint.Dispose()
    $whiteBrush.Dispose()
    $accentBrush.Dispose()
    $hintBrush.Dispose()
    $formatCenter.Dispose()
    $g.Dispose()

    # Save as high-quality JPEG
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]92)
    $bmp.Save('${targetPublic.replace(/\\/g, '\\\\').replace(/'/g, "''")}', $codec, $ep)
    $bmp.Dispose()
  `;

  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], { stdio: 'pipe' });

  // Copy to Android assets
  fs.copyFileSync(targetPublic, targetAndroid);

  const stats = fs.statSync(targetPublic);
  console.log(`  ✓ ${d.id} generated (${stats.size} bytes) -> public & android assets`);
}

console.log('All 30 vegetarian dish photos successfully generated!');
