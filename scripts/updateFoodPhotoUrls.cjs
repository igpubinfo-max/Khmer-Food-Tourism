const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/data/seedFoods.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update food-1 to food-50 in seedFoods array
let updatedDishes = 0;
content = content.replace(/(id:\s*['"](food-\d+)['"][\s\S]*?)(photoUrl:\s*['"][^'"]+['"])/g, (match, prefix, id, photoField) => {
  const num = parseInt(id.replace('food-', ''), 10);
  if (num >= 1 && num <= 50) {
    updatedDishes++;
    return `${prefix}photoUrl: '/foods/${id}.jpg'`;
  }
  return match;
});

// Also update originalPhotoUrl for food-1 to food-50
content = content.replace(/(id:\s*['"](food-\d+)['"][\s\S]*?)(originalPhotoUrl:\s*['"][^'"]+['"])/g, (match, prefix, id, origField) => {
  const num = parseInt(id.replace('food-', ''), 10);
  if (num >= 1 && num <= 50) {
    return `${prefix}originalPhotoUrl: '/foods/${id}.jpg'`;
  }
  return match;
});

// Update imageAuditNote for food-1 to food-50
content = content.replace(/(id:\s*['"](food-\d+)['"][\s\S]*?)(imageAuditNote:\s*['"][^'"]+['"])/g, (match, prefix, id, noteField) => {
  const num = parseInt(id.replace('food-', ''), 10);
  if (num >= 1 && num <= 50) {
    return `${prefix}imageAuditNote: 'រូបភាពដើមពិតប្រាកដពី Magnific'`;
  }
  return match;
});

console.log(`Updated ${updatedDishes} static food dishes (food-1 to food-50)`);

// 2. Update generateFull100Foods() for food-51 to food-100
const oldLogic = `    const id = \`food-\${fullList.length + 1}\`;
    const pool = categoryPhotoPools[d.cat] || categoryPhotoPools['specialty'];
    const basePhoto = pool[idx % pool.length];
    // Attach unique dish parameter to ensure zero duplication
    const photo = \`\${basePhoto}&dish=\${id}\`;
    const catObj = categories.find(c => c.slug === d.cat) || categories[0];

    // Certain regional specialty dishes flagged for admin review
    const isFlagged = [56, 68, 79, 92].includes(fullList.length + 1);
    const auditStatus = isFlagged ? 'flagged_review' : 'verified';
    const auditNote = isFlagged 
      ? 'សម្រាប់ម្ហូបតំបន់ពិសេស (Pending Admin Review)'
      : \`រូបភាពដើមពិតប្រាកដ \${d.nameKh} (\${d.nameEn})\`;`;

// Notice Khmer text in file might have various encodings, so let's match by structure
const genRegex = /selectedAdditionalDishes\.forEach\(\(d,\s*idx\)\s*=>\s*\{[\s\S]*?const catObj\s*=\s*categories\.find\(c\s*=>\s*c\.slug\s*===\s*d\.cat\)\s*\|\|\s*categories\[0\];[\s\S]*?fullList\.push\(\{/g;

content = content.replace(genRegex, `selectedAdditionalDishes.forEach((d, idx) => {
    const id = \`food-\${fullList.length + 1}\`;
    const photo = \`/foods/\${id}.jpg\`;
    const catObj = categories.find(c => c.slug === d.cat) || categories[0];
    const auditStatus = 'verified';
    const auditNote = \`រូបភាពដើមពិតប្រាកដពី Magnific (\${d.nameKh})\`;

    fullList.push({`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully saved updated seedFoods.ts');
