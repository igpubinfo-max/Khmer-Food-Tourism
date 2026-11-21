// Audits destination photos: shared files, missing files, and low resolution.
// Usage: node scripts/auditDestinationPhotos.mjs  ->  writes DESTINATION_PHOTO_AUDIT.md
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const dests = JSON.parse(fs.readFileSync(path.join(root, 'src/data/touristDestinationsList.json'), 'utf8'));
const dir = path.join(root, 'public/destinations');

function jpegSize(file) {
  const b = fs.readFileSync(file);
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

const byPhoto = new Map();
for (const d of dests) {
  const p = (d.photoUrl || '').trim();
  if (!p.startsWith('/destinations/')) continue;
  if (!byPhoto.has(p)) byPhoto.set(p, []);
  byPhoto.get(p).push(d);
}

const shared = [...byPhoto].filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);
const missing = [...byPhoto].filter(([p]) => !fs.existsSync(path.join(dir, path.basename(p))));
const lowRes = fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f)).map((f) => ({ f, ...jpegSize(path.join(dir, f)) })).filter((x) => x.w < 1080 && x.h < 1080);

let md = '# Destination photo audit\n\n';
md += `- Destinations: ${dests.length}\n- Photo files shared by 2+ places: ${shared.length} (${shared.reduce((n, [, v]) => n + v.length, 0)} places)\n`;
md += `- Places pointing at a missing file: ${missing.reduce((n, [, v]) => n + v.length, 0)}\n- Files under 1080 px on both sides: ${lowRes.length}\n\n`;
md += '## Shared photos (owner keeps the photo, others show the category icon)\n\n';
for (const [p, v] of shared) {
  const owner = v.find((d) => p === `/destinations/${d.id}.jpg`);
  md += `### ${p} (${v.length} places)\n`;
  for (const d of v) md += `- ${d === owner ? '**KEEPS PHOTO**' : 'icon only'} — ${d.id}: ${d.nameEn}\n`;
  md += '\n';
}
md += '## Missing photo files\n\n';
for (const [p, v] of missing) md += `- ${p}: ${v.map((d) => d.id + ' ' + d.nameEn).join('; ')}\n`;
md += '\n## Low-resolution files (need 1080 px+ replacements)\n\n';
md += lowRes.map((x) => `${x.f} ${x.w}x${x.h}`).join('\n') + '\n';

fs.writeFileSync(path.join(root, 'DESTINATION_PHOTO_AUDIT.md'), md);
console.log(md.split('\n').slice(0, 6).join('\n'));
