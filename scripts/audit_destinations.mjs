import fs from 'fs';

const destinations = JSON.parse(fs.readFileSync('./src/data/touristDestinationsList.json', 'utf8'));
console.log('Total destinations in touristDestinationsList.json:', destinations.length);

// 1. Exact ID check
const idMap = new Map();
for (const d of destinations) {
  if (idMap.has(d.id)) {
    console.log('DUPLICATE ID:', d.id);
  }
  idMap.set(d.id, d);
}

// Helper to normalize strings
function cleanKhmer(str) {
  return (str || '')
    .replace(/[()（）\s\-_.,/]/g, '')
    .replace(/រមណីយដ្ឋាន/g, '')
    .replace(/តំបន់/g, '')
    .toLowerCase();
}

function cleanEn(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[()（）\s\-_.,/]/g, '')
    .replace(/resort/g, '')
    .replace(/temple/g, '')
    .replace(/mountain/g, '')
    .replace(/waterfall/g, '')
    .replace(/pagoda/g, '')
    .replace(/beach/g, '')
    .replace(/island/g, '')
    .replace(/cultural/g, '')
    .replace(/village/g, '')
    .replace(/market/g, '');
}

console.log('\n=============================================');
console.log('1. AUDITING KHMER NAMES (EXACT OR ROOT MATCH)');
console.log('=============================================');
const khMap = new Map();
for (const d of destinations) {
  const norm = cleanKhmer(d.nameKh);
  if (!khMap.has(norm)) khMap.set(norm, []);
  khMap.get(norm).push(d);
}
let khDupCount = 0;
for (const [key, list] of khMap.entries()) {
  if (list.length > 1) {
    khDupCount++;
    console.log(`\n[Khmer Duplicate #${khDupCount}] Root: "${key}" (${list.length} entries):`);
    list.forEach(item => console.log(`  - [${item.id}] "${item.nameKh}" | "${item.nameEn}" | ${item.provinceKh} (Lat: ${item.latitude}, Lng: ${item.longitude})`));
  }
}

console.log('\n=============================================');
console.log('2. AUDITING ENGLISH NAMES (ROOT MATCH)');
console.log('=============================================');
const enMap = new Map();
for (const d of destinations) {
  const norm = cleanEn(d.nameEn);
  if (norm.length >= 3) {
    if (!enMap.has(norm)) enMap.set(norm, []);
    enMap.get(norm).push(d);
  }
}
let enDupCount = 0;
for (const [key, list] of enMap.entries()) {
  if (list.length > 1) {
    enDupCount++;
    console.log(`\n[English Match #${enDupCount}] Root: "${key}" (${list.length} entries):`);
    list.forEach(item => console.log(`  - [${item.id}] "${item.nameKh}" | "${item.nameEn}" | ${item.provinceKh}`));
  }
}

console.log('\n=============================================');
console.log('3. AUDITING EXACT COORDINATES (< 0.001 deg)');
console.log('=============================================');
const coordMap = new Map();
for (const d of destinations) {
  const key = `${Number(d.latitude).toFixed(3)},${Number(d.longitude).toFixed(3)}`;
  if (!coordMap.has(key)) coordMap.set(key, []);
  coordMap.get(key).push(d);
}
let coordDupCount = 0;
for (const [key, list] of coordMap.entries()) {
  if (list.length > 1) {
    coordDupCount++;
    console.log(`\n[Coordinate Cluster #${coordDupCount}] (${key}):`);
    list.forEach(item => console.log(`  - [${item.id}] "${item.nameKh}" | "${item.nameEn}" | ${item.provinceKh}`));
  }
}

console.log('\n=============================================');
console.log('4. AUDITING EXACT PHOTO URLS');
console.log('=============================================');
const photoMap = new Map();
for (const d of destinations) {
  if (!d.photoUrl) continue;
  if (!photoMap.has(d.photoUrl)) photoMap.set(d.photoUrl, []);
  photoMap.get(d.photoUrl).push(d);
}
let photoDupCount = 0;
for (const [key, list] of photoMap.entries()) {
  if (list.length > 1) {
    photoDupCount++;
    console.log(`\n[Photo Duplicate #${photoDupCount}] (${key.substring(0, 70)}...):`);
    list.forEach(item => console.log(`  - [${item.id}] "${item.nameKh}" | "${item.nameEn}" | ${item.provinceKh}`));
  }
}
