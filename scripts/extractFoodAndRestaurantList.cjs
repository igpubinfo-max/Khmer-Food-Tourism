const fs = require('fs');
const path = require('path');

// 1. Read seedFoods.ts
const seedFoodsContent = fs.readFileSync(path.resolve(__dirname, '../src/data/seedFoods.ts'), 'utf8');

// Core foods from seedFoods array
const coreFoods = [];
const regexCore = /id:\s*['"](food-\d+)['"],\s*nameKh:\s*['"]([^'"]+)['"],\s*nameEn:\s*['"]([^'"]+)['"],\s*categorySlug:\s*['"]([^'"]+)['"],\s*categoryKh:\s*['"]([^'"]+)['"]/g;
let cm;
while ((cm = regexCore.exec(seedFoodsContent)) !== null) {
  coreFoods.push({
    id: cm[1],
    nameKh: cm[2],
    nameEn: cm[3],
    categorySlug: cm[4],
    categoryKh: cm[5]
  });
}

// Additional dishes array
const additionalDishes = [];
const addIdx = seedFoodsContent.indexOf('const additionalAuthenticDishes');
if (addIdx !== -1) {
  const addEnd = seedFoodsContent.indexOf('const fullList: FoodItem[]');
  const addBlock = seedFoodsContent.slice(addIdx, addEnd !== -1 ? addEnd : undefined);
  const regexItem = /"nameKh":\s*"([^"]+)",\s*"nameEn":\s*"([^"]+)",\s*"cat":\s*"([^"]+)"/g;
  let am;
  while ((am = regexItem.exec(addBlock)) !== null) {
    additionalDishes.push({
      nameKh: am[1],
      nameEn: am[2],
      cat: am[3]
    });
  }
}

// Exactly simulate generateFull100Foods()
const existingNames = new Set(coreFoods.map(f => f.nameKh));
const targetCategoryCounts = {
  soup: 7,
  grilled: 8,
  stirfry: 10,
  salad: 5,
  noodles: 5,
  rice: 5,
  dessert: 5,
  specialty: 5,
};

const catNames = {
  soup: 'ម្ហូបសម្ល / ប្រពៃណី',
  grilled: 'ម្ហូបអាំង / បំពង',
  stirfry: 'ម្ហូបឆា / ក្តៅៗ',
  salad: 'ញាំ & ភ្លាខ្មែរ',
  noodles: 'គុយទាវ & នំបញ្ចុក',
  rice: 'បាយ & អាហារពេលព្រឹក',
  dessert: 'បង្អែមប្រពៃណីខ្មែរ',
  specialty: 'ម្ហូបពិសេសប្រចាំតំបន់',
};

const full100Foods = [...coreFoods];
for (const [cat, count] of Object.entries(targetCategoryCounts)) {
  let added = 0;
  for (const d of additionalDishes) {
    if (d.cat === cat && !existingNames.has(d.nameKh)) {
      existingNames.add(d.nameKh);
      full100Foods.push({
        id: `food-${full100Foods.length + 1}`,
        nameKh: d.nameKh,
        nameEn: d.nameEn,
        categorySlug: d.cat,
        categoryKh: catNames[d.cat] || 'ម្ហូបខ្មែរ'
      });
      added++;
      if (added === count) break;
    }
  }
}

// 2. Read seedRestaurants.ts
const seedRestaurantsContent = fs.readFileSync(path.resolve(__dirname, '../src/data/seedRestaurants.ts'), 'utf8');
const restaurants = [];
const regexRest = /"id":\s*"(rest-\d+)",\s*"nameKh":\s*"([^"]+)",\s*"nameEn":\s*"([^"]+)",[\s\S]*?"provinceKh":\s*"([^"]+)",[\s\S]*?"priceLevel":\s*"([^"]+)"/g;
let rm;
while ((rm = regexRest.exec(seedRestaurantsContent)) !== null) {
  restaurants.push({
    id: rm[1],
    nameKh: rm[2],
    nameEn: rm[3],
    provinceKh: rm[4],
    priceLevel: rm[5]
  });
}

console.log(`Core: ${coreFoods.length}, Full 100 Active Foods: ${full100Foods.length}, Additional: ${additionalDishes.length}, Restaurants: ${restaurants.length}`);

// Generate comprehensive Markdown document
let md = `# 📋 បញ្ជីមុខម្ហូប និងភោជនីយដ្ឋានខ្មែរទាំងស្រុង (Khmer Food & Restaurant Master List)\n\n`;
md += `ឯកសារនេះរៀបចំឡើងជាពិសេសជូនលោកអ្នក ដើម្បីងាយស្រួលស្វែងរក និងទាញយករូបភាពពី **Magnific.com** ហើយដាក់ឈ្មោះ File រូបភាពឱ្យត្រូវគ្នានឹងឈ្មោះម្ហូប ឬហាងក្នុង App។\n\n`;

md += `## 🍲 ផ្នែកទី ១៖ បញ្ជីមុខម្ហូបខ្មែរល្បីៗទាំង ១០០ មុខក្នុង App (Top 100 Authentic Khmer Dishes)\n\n`;
md += `> [!TIP]\n`;
md += `> លោកអ្នកអាចយក **ឈ្មោះខ្មែរ** ឬ **ឈ្មោះអង់គ្លេស** ទៅស្វែងរកក្នុង Magnific រួច Save រូបភាពដោយដាក់ឈ្មោះតាម **ID** (ឧ. \`food-1.jpg\`) ឬតាម **ឈ្មោះខ្មែរ** (ឧ. \`អាម៉ុកត្រីស្លឹកញរ.jpg\`) ចូលទៅក្នុង Folder \`F:\\Soft\\System Program 2027 kimseng\\KhmerFoodTourism\\Food\`។\n\n`;

md += `| ល.រ | ID | ឈ្មោះខ្មែរ (Khmer Dish Name) | ឈ្មោះអង់គ្លេស (English Name) | ប្រភេទម្ហូប (Category) |\n`;
md += `| :---: | :---: | :--- | :--- | :--- |\n`;
full100Foods.forEach((f, idx) => {
  md += `| ${idx + 1} | \`${f.id}\` | **${f.nameKh}** | ${f.nameEn} | ${f.categoryKh} |\n`;
});

md += `\n---\n\n`;
md += `## 🏪 ផ្នែកទី ២៖ បញ្ជីភោជនីយដ្ឋានឆ្នើមៗទាំងអស់ (${restaurants.length} ហាង)\n\n`;
md += `| ល.រ | ID | ឈ្មោះហាងខ្មែរ (Restaurant Name) | ឈ្មោះអង់គ្លេស (English Name) | ខេត្ត/រាជធានី (Province) | កម្រិតតម្លៃ |\n`;
md += `| :---: | :---: | :--- | :--- | :--- | :---: |\n`;
restaurants.forEach((r, idx) => {
  md += `| ${idx + 1} | \`${r.id}\` | **${r.nameKh}** | ${r.nameEn} | ${r.provinceKh} | ${r.priceLevel} |\n`;
});

// Save to disk and desktop
fs.writeFileSync(path.resolve(__dirname, '../src/data/FOOD_AND_RESTAURANT_LIST.md'), md, 'utf8');
fs.writeFileSync('C:/Users/igpub/OneDrive/Desktop/Khmer_Food_And_Restaurant_List.md', md, 'utf8');

// Also save a pure text file on Desktop for instant Notepad opening
let txt = `====================================================================\n`;
txt += `  បញ្ជីឈ្មោះមុខម្ហូបខ្មែរទាំង ១០០ មុខក្នុងកម្មវិធី (KHMER FOOD DISH LIST)\n`;
txt += `====================================================================\n\n`;
full100Foods.forEach((f, idx) => {
  txt += `${idx + 1}. [${f.id}] ${f.nameKh} --- ${f.nameEn} (${f.categoryKh})\n`;
});

txt += `\n\n====================================================================\n`;
txt += `  បញ្ជីឈ្មោះភោជនីយដ្ឋានទាំង ${restaurants.length} ហាង (RESTAURANT LIST)\n`;
txt += `====================================================================\n\n`;
restaurants.forEach((r, idx) => {
  txt += `${idx + 1}. [${r.id}] ${r.nameKh} --- ${r.nameEn} (${r.provinceKh})\n`;
});

fs.writeFileSync('C:/Users/igpub/OneDrive/Desktop/Khmer_Food_And_Restaurant_List.txt', txt, 'utf8');
console.log('Successfully generated Markdown & Text files on Desktop!');
