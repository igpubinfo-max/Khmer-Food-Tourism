import fs from 'fs';

// 1. Update touristDestinationsList.json
const jsonPath = './src/data/touristDestinationsList.json';
const destinations = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Update dest-58
const dest58 = destinations.find(d => d.id === 'dest-58');
if (dest58) {
  dest58.photoUrl = '/destinations/dest-58.jpg';
  dest58.galleryPhotos = ['/destinations/dest-58.jpg'];
  console.log('Updated dest-58 photo in JSON');
}

// Update dest-123
const dest123Index = destinations.findIndex(d => d.id === 'dest-123');
if (dest123Index !== -1) {
  destinations[dest123Index] = {
    id: 'dest-123',
    nameKh: 'រមណីយដ្ឋានភ្នំបាខែង (ចំណុចមើលថ្ងៃលិចលើកំពូលភ្នំកណ្តាលអង្គរ)',
    nameEn: 'Phnom Bakheng Hilltop Sunset Temple',
    categorySlug: 'temple',
    categoryKh: 'ប្រាសាទបុរាណ / បេតិកភណ្ឌ',
    categoryEn: 'Historical Temple / Heritage',
    descriptionKh: 'ប្រាសាទភ្នំបាខែង កសាងឡើងនៅចុងសតវត្សរ៍ទី៩ ក្នុងរជ្ជកាលព្រះបាទយសោវរ្ម័នទី១ ជាប្រាសាទភ្នំកណ្តាលរាជធានីយសោធរបុរៈ និងជាទីតាំងដ៏ល្បីល្បាញបំផុតលើពិភពលោកសម្រាប់ទស្សនាថ្ងៃលិចលើប្រាសាទអង្គរវត្ត។',
    descriptionEn: 'Late 9th-century Hindu temple mountain built by King Yasovarman I atop Bakheng Hill. World-famous vantage point offering breathtaking 360-degree sunset panoramas over Angkor Wat and the Western Baray.',
    photoUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/Phnom_Bakheng_temple_at_Angkor%2C_Cambodia.jpg/960px-Phnom_Bakheng_temple_at_Angkor%2C_Cambodia.jpg',
    provinceKh: 'ខេត្តសៀមរាប',
    provinceEn: 'Siem Reap',
    addressKh: 'ខាងត្បូងប្រាសាទអង្គរធំ ក្រុងសៀមរាប',
    addressEn: 'South of Angkor Thom, Siem Reap',
    entranceFeeKh: 'រួមបញ្ចូលក្នុងប័ណ្ណអង្គរ (ខ្មែរឥតគិតថ្លៃ)',
    entranceFeeEn: 'Included in Angkor Pass (Free for Cambodians)',
    bestTimeToVisitKh: 'ពេលរសៀល ម៉ោង ០៤:៣០ - ០៦:០០ (មើលថ្ងៃលិច)',
    bestTimeToVisitEn: 'Late afternoon 04:30 PM - 06:00 PM for sunset',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=13.4239,103.8561',
    latitude: 13.4239,
    longitude: 103.8561,
    rating: 4.8,
    reviewCount: 2450,
    highlightsKh: [
      'ទស្សនីយភាពថ្ងៃលិចដ៏អស្ចារ្យលើអង្គរវត្ត',
      'ស្ថាបត្យកម្មប្រាសាទភ្នំ ៧ ជាន់តំណាងភ្នំព្រះសុមេរុ',
      'ផ្លូវឡើងភ្នំធម្មជាតិ និងជិះដំរីទេសចរណ៍',
      'ទិដ្ឋភាព ៣៦០ ដឺក្រេលើវាលទំនាបសៀមរាប'
    ],
    isFeatured: true,
    galleryPhotos: [
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/Phnom_Bakheng_temple_at_Angkor%2C_Cambodia.jpg/960px-Phnom_Bakheng_temple_at_Angkor%2C_Cambodia.jpg'
    ]
  };
  console.log('Updated dest-123 to Phnom Bakheng in JSON');
}

fs.writeFileSync(jsonPath, JSON.stringify(destinations, null, 2), 'utf8');

// 2. Update seedDestinations.ts
const tsPath = './src/data/seedDestinations.ts';
let tsContent = `import { TouristDestination } from '../types';\n\nexport const initial100Destinations: TouristDestination[] = ${JSON.stringify(destinations, null, 2)};\n`;
fs.writeFileSync(tsPath, tsContent, 'utf8');
console.log('Updated seedDestinations.ts successfully!');
