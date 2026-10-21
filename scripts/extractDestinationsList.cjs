const ts = require('typescript');
const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve(__dirname, '../src/data/seedDestinations.ts'), 'utf8');
const trans = ts.transpileModule(content, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const m = { exports: {} };
const fn = new Function('module', 'exports', 'require', trans.outputText);
fn(m, m.exports, () => ({}));

const destinations = m.exports.initial100Destinations;
console.log('Total destinations in initial100Destinations:', destinations.length);

const provinces = {};
const categories = {};

destinations.forEach((d, idx) => {
  const p = d.provinceKh || 'ផ្សេងៗ';
  const c = d.categoryKh || 'ផ្សេងៗ';
  provinces[p] = (provinces[p] || 0) + 1;
  categories[c] = (categories[c] || 0) + 1;
});

console.log('Provinces count:', Object.keys(provinces).length);
console.log('Categories count:', Object.keys(categories).length);
console.log('\nTop 10 sample destinations:');
destinations.slice(0, 10).forEach((d, i) => {
  console.log(`${i+1}. [${d.id}] ${d.nameKh} (${d.nameEn}) - ខេត្ត/ក្រុង: ${d.provinceKh}`);
});
