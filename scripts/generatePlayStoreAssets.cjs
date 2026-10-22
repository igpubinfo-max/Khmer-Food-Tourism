/**
 * Generates official Google Play Console graphic assets:
 * 1. app-icon-512x512.png (512 x 512 px, 32-bit PNG)
 * 2. feature-graphic-1024x500.png (1024 x 500 px, 32-bit PNG)
 * Using pure Node.js (zlib + CRC32) with zero external dependencies.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, combined, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const compressed = zlib.deflateSync(raw, { level: 6 });

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function setPixel(buf, w, h, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= w || y < 0 || y >= h) return;
  const idx = (y * w + x) * 4;
  if (a === 255) {
    buf[idx] = r;
    buf[idx + 1] = g;
    buf[idx + 2] = b;
    buf[idx + 3] = 255;
  } else {
    const alpha = a / 255;
    buf[idx] = Math.round(r * alpha + buf[idx] * (1 - alpha));
    buf[idx + 1] = Math.round(g * alpha + buf[idx + 1] * (1 - alpha));
    buf[idx + 2] = Math.round(b * alpha + buf[idx + 2] * (1 - alpha));
    buf[idx + 3] = 255;
  }
}

function drawTower(buf, w, h, cx, baseY, towerW, towerH, r, g, b) {
  for (let dy = 0; dy < towerH; dy++) {
    const progress = dy / towerH; // 0 at top, 1 at base
    // Lotus spire profile
    const halfW = Math.max(1, Math.round((towerW / 2) * Math.pow(progress, 0.65) * (1 + 0.12 * Math.sin(progress * Math.PI * 5))));
    const y = baseY - towerH + dy;
    for (let x = cx - halfW; x <= cx + halfW; x++) {
      setPixel(buf, w, h, x, y, r, g, b, 255);
    }
  }
}

function generateAppIcon512() {
  const w = 512;
  const h = 512;
  const buf = Buffer.alloc(w * h * 4);
  const cx = w / 2;
  const cy = h / 2;

  // Deep Royal Emerald gradient background with subtle golden halo
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / w;
      const dy = (y - cy) / h;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const r = Math.max(4, Math.min(255, Math.round(6 + (1 - dist) * 14)));
      const g = Math.max(45, Math.min(255, Math.round(78 + (1 - dist) * 42)));
      const b = Math.max(35, Math.min(255, Math.round(59 + (1 - dist) * 28)));
      setPixel(buf, w, h, x, y, r, g, b, 255);
    }
  }

  // Golden circular medallion ring
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d >= 208 && d <= 220) {
        setPixel(buf, w, h, x, y, 245, 194, 66, 255);
      } else if (d >= 198 && d < 208) {
        setPixel(buf, w, h, x, y, 180, 130, 28, 120);
      }
    }
  }

  // Rising golden sun behind Angkor Wat
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - 245);
      if (d < 115 && y < 275) {
        const alpha = Math.round((1 - d / 115) * 95);
        setPixel(buf, w, h, x, y, 252, 211, 77, alpha);
      }
    }
  }

  // 5-Tower Angkor Wat Silhouette in Royal Gold
  const baseY = 278;
  drawTower(buf, w, h, 256, baseY, 58, 135, 251, 191, 36); // Center main spire
  drawTower(buf, w, h, 196, baseY, 44, 98, 245, 180, 32);  // Inner left spire
  drawTower(buf, w, h, 316, baseY, 44, 98, 245, 180, 32);  // Inner right spire
  drawTower(buf, w, h, 144, baseY, 34, 70, 234, 168, 28);  // Outer left spire
  drawTower(buf, w, h, 368, baseY, 34, 70, 234, 168, 28);  // Outer right spire

  // Temple gallery base platform
  for (let y = baseY; y <= baseY + 24; y++) {
    for (let x = 116; x <= 396; x++) {
      setPixel(buf, w, h, x, y, 245, 185, 35, 255);
    }
  }

  // Khmer Royal Food Bowl curve underneath (symbolizing Culinary & Tourism)
  for (let y = 312; y <= 388; y++) {
    const progress = (y - 312) / 76;
    const halfW = Math.round(132 * Math.sqrt(Math.max(0, 1 - progress * progress * 0.85)));
    for (let x = Math.round(cx - halfW); x <= Math.round(cx + halfW); x++) {
      if (y <= 322) {
        setPixel(buf, w, h, x, y, 253, 224, 71, 255);
      } else {
        setPixel(buf, w, h, x, y, 217, 155, 26, 255);
      }
    }
  }
  // Bowl pedestal foot
  for (let y = 389; y <= 405; y++) {
    for (let x = 206; x <= 306; x++) {
      setPixel(buf, w, h, x, y, 245, 194, 66, 255);
    }
  }

  return encodePng(w, h, buf);
}

function generateFeatureGraphic1024x500() {
  const w = 1024;
  const h = 500;
  const buf = Buffer.alloc(w * h * 4);

  // Rich Cambodian Emerald & Sunset Gold Banner
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      const ny = y / h;
      const r = Math.round(6 + nx * 18 + (1 - ny) * 12);
      const g = Math.round(68 + (1 - ny) * 44);
      const b = Math.round(52 + nx * 24);
      setPixel(buf, w, h, x, y, r, g, b, 255);
    }
  }

  // Top & Bottom Royal Gold Borders
  for (let y = 0; y < h; y++) {
    if (y < 10 || y >= h - 10 || (y >= 16 && y <= 18) || (y >= h - 19 && y <= h - 17)) {
      for (let x = 0; x < w; x++) {
        setPixel(buf, w, h, x, y, 245, 194, 66, 255);
      }
    }
  }

  // Golden sunrise glow on the center-right
  const sunX = 512;
  const sunY = 330;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - sunX, y - sunY);
      if (d < 260 && y <= 370) {
        const alpha = Math.round((1 - d / 260) * 110);
        setPixel(buf, w, h, x, y, 252, 211, 77, alpha);
      }
    }
  }

  // Majestic 5-Tower Angkor Wat Silhouette in the center
  const baseY = 365;
  drawTower(buf, w, h, 512, baseY, 86, 210, 251, 191, 36);
  drawTower(buf, w, h, 412, baseY, 64, 155, 245, 180, 32);
  drawTower(buf, w, h, 612, baseY, 64, 155, 245, 180, 32);
  drawTower(buf, w, h, 325, baseY, 48, 110, 234, 168, 28);
  drawTower(buf, w, h, 699, baseY, 48, 110, 234, 168, 28);

  // Temple base terrace
  for (let y = baseY; y <= baseY + 32; y++) {
    for (let x = 250; x <= 774; x++) {
      setPixel(buf, w, h, x, y, 245, 185, 35, 255);
    }
  }

  // Water reflection ripples below
  for (let i = 0; i < 5; i++) {
    const ry = 412 + i * 12;
    const rw = 220 - i * 32;
    for (let y = ry; y <= ry + 4; y++) {
      for (let x = 512 - rw; x <= 512 + rw; x++) {
        setPixel(buf, w, h, x, y, 252, 211, 77, 170 - i * 25);
      }
    }
  }

  return encodePng(w, h, buf);
}

const outDirs = [
  path.join(__dirname, '..', 'PlayStore-Assets'),
  'C:\\Users\\igpub\\Desktop\\PlayStore-Assets',
];

const iconPng = generateAppIcon512();
const featurePng = generateFeatureGraphic1024x500();

for (const dir of outDirs) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'app-icon-512x512.png'), iconPng);
  fs.writeFileSync(path.join(dir, 'feature-graphic-1024x500.png'), featurePng);
}

console.log('Generated app-icon-512x512.png (' + iconPng.length + ' bytes) and feature-graphic-1024x500.png (' + featurePng.length + ' bytes)');
