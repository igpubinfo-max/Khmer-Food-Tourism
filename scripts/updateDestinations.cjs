const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/data/seedDestinations.ts');
let content = fs.readFileSync(filePath, 'utf8');

const viralUpdates = {
  'dest-9': {
    isTrendingSocial: true,
    socialPlatform: 'all',
    socialHashtag: '#AngkorWat #ថ្ងៃរះអង្គរវត្ត',
    socialViews: '5.8M+ Views',
    socialHighlightKh: 'ល្បីលំដាប់ពិភពលោកលើ TikTok & Facebook៖ ទិដ្ឋភាពព្រះអាទិត្យរះពណ៌មាសចាំងលើស្រះទឹកមុខកំពូលប្រាសាទអង្គរវត្ត។',
    socialHighlightEn: 'World famous on TikTok & FB: Iconic golden sunrise reflecting over lotus ponds at Angkor Wat.'
  },
  'dest-13': {
    isTrendingSocial: true,
    socialPlatform: 'all',
    socialHashtag: '#PhnomKulen #ទឹកធ្លាក់គូលែន',
    socialViews: '2.9M+ Views',
    socialHighlightKh: 'Viral លើ TikTok ទេសចរណ៍៖ ងូតទឹកធ្លាក់ធម្មជាតិត្រជាក់ស្រេង ចម្លាក់លិង្គ ១០០០ ក្រោមបាតស្ទឹង និងព្រះអង្គធំលើខ្នងភ្នំ។',
    socialHighlightEn: 'Viral on TikTok: Refreshing sacred waterfalls, 1,000 Lingas riverbed carvings, and giant reclining Buddha.'
  },
  'dest-22': {
    isTrendingSocial: true,
    socialPlatform: 'all',
    socialHashtag: '#KohRong #ឆ្នេរសុខសាន្ត',
    socialViews: '3.5M+ Views',
    socialHighlightKh: 'ពេញនិយមខ្លាំងលើ TikTok & FB៖ ឆ្នេរខ្សាច់សក្បុស ទឹកសមុទ្រថ្លាឈ្វេង ជិះទូកកាយ៉ាក់ និងពន្លឺផ្លុងតុងបំភ្លឺរាត្រី។',
    socialHighlightEn: 'Super trending on TikTok & FB: Powdery white sands, crystal clear waters, kayaking, and glowing night plankton.'
  },
  'dest-23': {
    isTrendingSocial: true,
    socialPlatform: 'all',
    socialHashtag: '#KohRongSanloem #ឆ្នេរសារ៉ាសិន',
    socialViews: '3.1M+ Views',
    socialHighlightKh: 'ប្លង់ថតរូបរាប់ពាន់លើ TikTok៖ អង្រឹងលើទឹកសមុទ្រ ស្ពានឈើមាត់ឆ្នេរ និងបឹងហ្គាឡូសម្រាកលម្ហែបែបឋានសួគ៌។',
    socialHighlightEn: 'Thousands of photo spots on TikTok: Overwater swings, wooden jetties, and dream island bungalows.'
  },
  'dest-28': {
    isTrendingSocial: true,
    socialPlatform: 'all',
    socialHashtag: '#BokorMountain #ភ្នំបូកគោ',
    socialViews: '3.2M+ Views',
    socialHighlightKh: 'ពេញនិយមលើ FB & TikTok៖ សមុទ្រអ័ព្ទត្រជាក់រងា សណ្ឋាគារបារាំងបុរាណ វត្តសំពៅប្រាំ និងទឹកធ្លាក់ពពកវិល។',
    socialHighlightEn: 'Top shared on FB & TikTok: Sea of mountain mist, historic French palace, Sampov Pram Pagoda, and Popokvil falls.'
  },
  'dest-37': {
    isTrendingSocial: true,
    socialPlatform: 'all',
    socialHashtag: '#KepCrabMarket #ផ្សារក្តាមកែប',
    socialViews: '2.1M+ Views',
    socialHighlightKh: 'ពេញនិយមលើ TikTok Food & Travel៖ ស្រង់ក្តាមសេះស្រស់ៗពីសមុទ្រ ចម្អិនភ្លាមៗជាមួយម្រេចខ្ចីកំពត ញ៉ាំមាត់ឆ្នេរ។',
    socialHighlightEn: 'Trending food & travel on TikTok: Fresh blue swimming crabs cooked on the spot with Kampot green pepper.'
  },
  'dest-55': {
    isTrendingSocial: true,
    socialPlatform: 'all',
    socialHashtag: '#Mondulkiri #ទឹកធ្លាក់ប៊ូស្រា',
    socialViews: '4.2M+ Views',
    socialHighlightKh: 'Viral ខ្លាំងលើ TikTok Drone Video៖ ស្ដេចទឹកធ្លាក់កម្ពស់ខ្ពស់កាត់ព្រៃព្រឹក្សា មើលសមុទ្រឈើ និងភ្នំដោះក្រមុំ។',
    socialHighlightEn: 'Viral on TikTok Drone reels: Majestic multi-tier falls, Mondulkiri pine sea, and Doh Kramom mountain.'
  },
  'dest-66': {
    isTrendingSocial: true,
    socialPlatform: 'facebook',
    socialHashtag: '#PreahVihear #ប្រាសាទព្រះវិហារ',
    socialViews: '2.8M+ Views',
    socialHighlightKh: 'ល្បីកក្រើកលើ Facebook៖ ប្រាសាទបេតិកភណ្ឌកំពូលភ្នំដងរែក មើលទេសភាពពពកហោះ និងជ្រលងភ្នំជ្រៅដាច់កន្ទុយភ្នែក។',
    socialHighlightEn: 'Historic pride on Facebook: Cliffside temple high above the clouds overlooking endless plains.'
  },
  'dest-91': {
    isTrendingSocial: true,
    socialPlatform: 'all',
    socialHashtag: '#KnongPhsar #សមុទ្រពពក',
    socialViews: '4.6M+ Views',
    socialHighlightKh: 'Viral ដាច់គេលើ TikTok ផ្សងព្រេង៖ ឡើងភ្នំបោះតង់មើលសមុទ្រពពក 360 ដឺក្រេ និងទិដ្ឋភាពថ្ងៃរះដ៏អស្ចារ្យ។',
    socialHighlightEn: '#1 viral adventure spot on TikTok: High-altitude camping above 360-degree ocean of clouds.'
  }
};

let updatedCount = 0;
for (const [id, data] of Object.entries(viralUpdates)) {
  const pattern = new RegExp('("id":\\s*"' + id + '",[\\s\\S]*?"isFeatured":\\s*(?:true|false))');
  if (pattern.test(content)) {
    content = content.replace(pattern, `$1,\n    "isTrendingSocial": ${data.isTrendingSocial},\n    "socialPlatform": "${data.socialPlatform}",\n    "socialHashtag": "${data.socialHashtag}",\n    "socialViews": "${data.socialViews}",\n    "socialHighlightKh": "${data.socialHighlightKh}",\n    "socialHighlightEn": "${data.socialHighlightEn}"`);
    updatedCount++;
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log(`Updated ${updatedCount} destinations with viral social trends!`);
