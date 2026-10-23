import fs from 'fs';

const destinations = JSON.parse(fs.readFileSync('./src/data/touristDestinationsList.json', 'utf8'));

// Group destinations by province
const byProvince = {};
for (const d of destinations) {
  if (!byProvince[d.provinceKh]) byProvince[d.provinceKh] = [];
  byProvince[d.provinceKh].push(d);
}

console.log('--- PROVINCE AUDIT FOR SIMILAR PLACES ---');
for (const [prov, list] of Object.entries(byProvince)) {
  console.log(`\nProvince: ${prov} (${list.length} places)`);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      
      // Calculate distance in km approx
      const dLat = (a.latitude - b.latitude) * 111;
      const dLng = (a.longitude - b.longitude) * 111 * Math.cos(a.latitude * Math.PI / 180);
      const distKm = Math.sqrt(dLat * dLat + dLng * dLng);

      // Check if distance < 1 km
      if (distKm < 1.0) {
        console.log(`  Close Proximity (< 1km, ~${distKm.toFixed(2)}km):`);
        console.log(`    [${a.id}] ${a.nameKh} / ${a.nameEn}`);
        console.log(`    [${b.id}] ${b.nameKh} / ${b.nameEn}`);
      }
    }
  }
}
