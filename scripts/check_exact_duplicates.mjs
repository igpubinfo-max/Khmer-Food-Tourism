import fs from 'fs';

const destinations = JSON.parse(fs.readFileSync('./src/data/touristDestinationsList.json', 'utf8'));

// Check for pairs with very high name similarity or duplicate concepts
const duplicates = [];

for (let i = 0; i < destinations.length; i++) {
  for (let j = i + 1; j < destinations.length; j++) {
    const a = destinations[i];
    const b = destinations[j];

    // Check same province
    if (a.provinceKh === b.provinceKh) {
      // Clean names
      const aKh = a.nameKh.replace(/[()（）\s\-_.,/]/g, '').toLowerCase();
      const bKh = b.nameKh.replace(/[()（）\s\-_.,/]/g, '').toLowerCase();
      const aEn = a.nameEn.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const bEn = b.nameEn.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

      // Check substring or identical
      const khSub = aKh.includes(bKh) || bKh.includes(aKh);
      const enSub = aEn.includes(bEn) || bEn.includes(aEn);

      const dLat = Math.abs(a.latitude - b.latitude);
      const dLng = Math.abs(a.longitude - b.longitude);
      const sameCoords = dLat < 0.005 && dLng < 0.005;

      if ((khSub || enSub || sameCoords) && (aKh.length > 4 && bKh.length > 4)) {
        duplicates.push({ a, b, reason: { khSub, enSub, sameCoords, dLat, dLng } });
      }
    }
  }
}

console.log('Total candidate pairs found:', duplicates.length);
duplicates.forEach(d => {
  console.log(`\nCandidate:`);
  console.log(`  [${d.a.id}] ${d.a.nameKh} / ${d.a.nameEn}`);
  console.log(`  [${d.b.id}] ${d.b.nameKh} / ${d.b.nameEn}`);
  console.log(`  Province: ${d.a.provinceKh}`);
  console.log(`  Reason:`, d.reason);
});
