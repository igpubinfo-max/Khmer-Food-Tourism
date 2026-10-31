/**
 * Authoritative 25 Cambodia Provinces & Capital Municipality Bounding Boxes + Geo Helpers
 * Used by both `scripts/rebuild_verified_restaurants.mjs` and `scripts/verify_restaurant_locations.mjs`.
 */

export const CAMBODIA_LAT_MIN = 9.8;
export const CAMBODIA_LAT_MAX = 14.8;
export const CAMBODIA_LNG_MIN = 102.3;
export const CAMBODIA_LNG_MAX = 107.7;

export const CAMBODIA_PROVINCES = [
  {
    provinceEn: 'Phnom Penh',
    provinceKh: 'រាជធានីភ្នំពេញ',
    center: [11.5621, 104.916],
    bbox: { minLat: 11.41, maxLat: 11.75, minLng: 104.74, maxLng: 105.05 },
    aliases: ['phnom penh', 'ភ្នំពេញ', 'រាជធានីភ្នំពេញ', 'krong phnom penh'],
  },
  {
    provinceEn: 'Siem Reap',
    provinceKh: 'ខេត្តសៀមរាប',
    center: [13.3618, 103.8606],
    bbox: { minLat: 12.75, maxLat: 13.95, minLng: 103.35, maxLng: 104.7 },
    aliases: ['siem reap', 'siemreap', 'សៀមរាប', 'ខេត្តសៀមរាប', 'krong siem reap'],
  },
  {
    provinceEn: 'Battambang',
    provinceKh: 'ខេត្តបាត់ដំបង',
    center: [13.0957, 103.2022],
    bbox: { minLat: 12.35, maxLat: 13.55, minLng: 102.33, maxLng: 103.85 },
    aliases: ['battambang', 'បាត់ដំបង', 'ខេត្តបាត់ដំបង', 'krong battambang'],
  },
  {
    provinceEn: 'Kampot',
    provinceKh: 'ខេត្តកំពត',
    center: [10.6104, 104.1815],
    bbox: { minLat: 10.35, maxLat: 11.2, minLng: 103.8, maxLng: 104.72 },
    aliases: ['kampot', 'កំពត', 'ខេត្តកំពត', 'krong kampot'],
  },
  {
    provinceEn: 'Kep',
    provinceKh: 'ខេត្តកែប',
    center: [10.4833, 104.3167],
    bbox: { minLat: 10.4, maxLat: 10.6, minLng: 104.22, maxLng: 104.42 },
    aliases: ['kep', 'kaeb', 'កែប', 'ខេត្តកែប', 'krong kep'],
  },
  {
    provinceEn: 'Preah Sihanouk',
    provinceKh: 'ខេត្តព្រះសីហនុ',
    center: [10.6275, 103.5221],
    bbox: { minLat: 10.35, maxLat: 11.25, minLng: 103.1, maxLng: 104.05 },
    aliases: [
      'preah sihanouk',
      'sihanoukville',
      'preah sihanouk province',
      'ព្រះសីហនុ',
      'ខេត្តព្រះសីហនុ',
      'ក្រុងព្រះសីហនុ',
      'កំពង់សោម',
    ],
  },
  {
    provinceEn: 'Kampong Cham',
    provinceKh: 'ខេត្តកំពង់ចាម',
    center: [11.9934, 105.4635],
    bbox: { minLat: 11.75, maxLat: 12.5, minLng: 104.8, maxLng: 105.75 },
    aliases: ['kampong cham', 'kompong cham', 'កំពង់ចាម', 'ខេត្តកំពង់ចាម'],
  },
  {
    provinceEn: 'Koh Kong',
    provinceKh: 'ខេត្តកោះកុង',
    center: [11.6153, 102.9838],
    bbox: { minLat: 10.6, maxLat: 12.1, minLng: 102.75, maxLng: 103.95 },
    aliases: ['koh kong', 'កោះកុង', 'ខេត្តកោះកុង', 'khemarak phoumin'],
  },
  {
    provinceEn: 'Kandal',
    provinceKh: 'ខេត្តកណ្តាល',
    center: [11.4833, 104.95],
    bbox: { minLat: 10.88, maxLat: 11.95, minLng: 104.6, maxLng: 105.35 },
    aliases: ['kandal', 'កណ្តាល', 'ខេត្តកណ្តាល', 'ta khmao', 'takhmao', 'តាខ្មៅ'],
  },
  {
    provinceEn: 'Kampong Thom',
    provinceKh: 'ខេត្តកំពង់ធំ',
    center: [12.7111, 104.8887],
    bbox: { minLat: 12.15, maxLat: 13.48, minLng: 104.15, maxLng: 105.75 },
    aliases: ['kampong thom', 'kompong thom', 'កំពង់ធំ', 'ខេត្តកំពង់ធំ', 'stueng saen', 'steung saen'],
  },
  {
    provinceEn: 'Kratie',
    provinceKh: 'ខេត្តក្រចេះ',
    center: [12.4881, 106.0188],
    bbox: { minLat: 11.95, maxLat: 13.45, minLng: 105.55, maxLng: 106.8 },
    aliases: ['kratie', 'kracheh', 'ក្រចេះ', 'ខេត្តក្រចេះ'],
  },
  {
    provinceEn: 'Mondulkiri',
    provinceKh: 'ខេត្តមណ្ឌលគិរី',
    center: [12.4558, 107.1881],
    bbox: { minLat: 12.05, maxLat: 13.45, minLng: 106.3, maxLng: 107.65 },
    aliases: ['mondulkiri', 'mondolkiri', 'មណ្ឌលគិរី', 'ខេត្តមណ្ឌលគិរី', 'sen monorom', 'សែនមនោរម្យ'],
  },
  {
    provinceEn: 'Ratanakiri',
    provinceKh: 'ខេត្តរតនគិរី',
    center: [13.7394, 106.9873],
    bbox: { minLat: 13.15, maxLat: 14.72, minLng: 106.45, maxLng: 107.65 },
    aliases: ['ratanakiri', 'rotanakiri', 'រតនគិរី', 'ខេត្តរតនគិរី', 'banlung', 'បានលុង'],
  },
  {
    provinceEn: 'Pursat',
    provinceKh: 'ខេត្តពោធិ៍សាត់',
    center: [12.5388, 103.9192],
    bbox: { minLat: 11.85, maxLat: 12.95, minLng: 102.75, maxLng: 104.45 },
    aliases: ['pursat', 'pouthisat', 'ពោធិ៍សាត់', 'ខេត្តពោធិ៍សាត់'],
  },
  {
    provinceEn: 'Kampong Chhnang',
    provinceKh: 'ខេត្តកំពង់ឆ្នាំង',
    center: [12.25, 104.6667],
    bbox: { minLat: 11.7, maxLat: 12.6, minLng: 104.15, maxLng: 104.9 },
    aliases: ['kampong chhnang', 'kompong chhnang', 'កំពង់ឆ្នាំង', 'ខេត្តកំពង់ឆ្នាំង'],
  },
  {
    provinceEn: 'Kampong Speu',
    provinceKh: 'ខេត្តកំពង់ស្ពឺ',
    center: [11.4533, 104.5208],
    bbox: { minLat: 11.05, maxLat: 12.08, minLng: 103.75, maxLng: 104.78 },
    aliases: ['kampong speu', 'kompong speu', 'កំពង់ស្ពឺ', 'ខេត្តកំពង់ស្ពឺ', 'chbar mon', 'ច្បារមន'],
  },
  {
    provinceEn: 'Takeo',
    provinceKh: 'ខេត្តតាកែវ',
    center: [10.9908, 104.785],
    bbox: { minLat: 10.5, maxLat: 11.35, minLng: 104.4, maxLng: 105.15 },
    aliases: ['takeo', 'តាកែវ', 'ខេត្តតាកែវ', 'doun kaev', 'ដូនកែវ'],
  },
  {
    provinceEn: 'Prey Veng',
    provinceKh: 'ខេត្តព្រៃវែង',
    center: [11.4868, 105.3253],
    bbox: { minLat: 10.85, maxLat: 11.88, minLng: 105.05, maxLng: 105.75 },
    aliases: ['prey veng', 'ព្រៃវែង', 'ខេត្តព្រៃវែង'],
  },
  {
    provinceEn: 'Svay Rieng',
    provinceKh: 'ខេត្តស្វាយរៀង',
    center: [11.0879, 105.7993],
    bbox: { minLat: 10.75, maxLat: 11.6, minLng: 105.55, maxLng: 106.2 },
    aliases: ['svay rieng', 'ស្វាយរៀង', 'ខេត្តស្វាយរៀង', 'bavet', 'បាវិត'],
  },
  {
    provinceEn: 'Banteay Meanchey',
    provinceKh: 'ខេត្តបន្ទាយមានជ័យ',
    center: [13.5859, 102.9737],
    bbox: { minLat: 13.3, maxLat: 14.28, minLng: 102.5, maxLng: 103.55 },
    aliases: [
      'banteay meanchey',
      'បន្ទាយមានជ័យ',
      'ខេត្តបន្ទាយមានជ័យ',
      'serei saophoan',
      'sisophon',
      'poipet',
      'ប៉ោយប៉ែត',
      'សិរីសោភ័ណ',
    ],
  },
  {
    provinceEn: 'Preah Vihear',
    provinceKh: 'ខេត្តព្រះវិហារ',
    center: [13.8073, 104.9805],
    bbox: { minLat: 13.05, maxLat: 14.48, minLng: 104.3, maxLng: 105.9 },
    aliases: ['preah vihear', 'ព្រះវិហារ', 'ខេត្តព្រះវិហារ'],
  },
  {
    provinceEn: 'Stung Treng',
    provinceKh: 'ខេត្តស្ទឹងត្រែង',
    center: [13.5259, 105.9683],
    bbox: { minLat: 13.1, maxLat: 14.62, minLng: 105.5, maxLng: 106.75 },
    aliases: ['stung treng', 'stueng treng', 'ស្ទឹងត្រែង', 'ខេត្តស្ទឹងត្រែង'],
  },
  {
    provinceEn: 'Pailin',
    provinceKh: 'ខេត្តប៉ៃលិន',
    center: [12.8489, 102.6093],
    bbox: { minLat: 12.68, maxLat: 13.08, minLng: 102.45, maxLng: 102.82 },
    aliases: ['pailin', 'ប៉ៃលិន', 'ខេត្តប៉ៃលិន'],
  },
  {
    provinceEn: 'Oddar Meanchey',
    provinceKh: 'ខេត្តឧត្តរមានជ័យ',
    center: [14.1818, 103.5176],
    bbox: { minLat: 13.85, maxLat: 14.48, minLng: 103.0, maxLng: 104.55 },
    aliases: ['oddar meanchey', 'ឧត្តរមានជ័យ', 'ខេត្តឧត្តរមានជ័យ', 'samraong', 'សំរោង'],
  },
  {
    provinceEn: 'Tboung Khmum',
    provinceKh: 'ខេត្តត្បូងឃ្មុំ',
    center: [11.8891, 105.6553],
    bbox: { minLat: 11.55, maxLat: 12.35, minLng: 105.35, maxLng: 106.45 },
    aliases: ['tboung khmum', 'tbong khmum', 'ត្បូងឃ្មុំ', 'ខេត្តត្បូងឃ្មុំ', 'suong', 'សួង'],
  },
];

export function isValidCambodiaGps(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0) &&
    lat >= CAMBODIA_LAT_MIN &&
    lat <= CAMBODIA_LAT_MAX &&
    lng >= CAMBODIA_LNG_MIN &&
    lng <= CAMBODIA_LNG_MAX
  );
}

export function findProvinceDefinition(nameOrAlias) {
  if (!nameOrAlias || typeof nameOrAlias !== 'string') return null;
  const cleaned = nameOrAlias
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+province$/, '')
    .replace(/\s+municipality$/, '');
  if (!cleaned) return null;
  for (const p of CAMBODIA_PROVINCES) {
    if (
      p.provinceEn.toLowerCase() === cleaned ||
      p.provinceKh === cleaned ||
      p.aliases.some((a) => a.toLowerCase() === cleaned)
    ) {
      return p;
    }
  }
  for (const p of CAMBODIA_PROVINCES) {
    if (p.aliases.some((a) => cleaned.includes(a.toLowerCase()))) {
      return p;
    }
  }
  return null;
}

export function isCoordinateInsideProvinceBbox(lat, lng, provinceDef) {
  if (!provinceDef || !isValidCambodiaGps(lat, lng)) return false;
  const { minLat, maxLat, minLng, maxLng } = provinceDef.bbox;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

export function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isValidOfficialPlaceId(placeId) {
  if (!placeId || typeof placeId !== 'string') return false;
  const trimmed = placeId.trim();
  if (/^0x[0-9a-f]{10,20}:0x[0-9a-f]{10,20}$/i.test(trimmed)) return true;
  if (!/^ChIJ[A-Za-z0-9_-]{21,32}$/.test(trimmed)) return false;
  if (/KH$/.test(trimmed)) return false;
  if (
    /(PhnomPenh|SiemReap|Battambang|Kampot|Kep|KienSvay|Sihanouk|Cambodia|Restaurant|Kitchen|Cafe|Pizza|Coffee)/.test(
      trimmed
    )
  ) {
    return false;
  }
  return true;
}

export function buildCanonicalMapUrl(lat, lng, googlePlaceId) {
  const latFixed = Number(lat.toFixed(6));
  const lngFixed = Number(lng.toFixed(6));
  if (isValidOfficialPlaceId(googlePlaceId)) {
    const cleanId = googlePlaceId.trim();
    if (cleanId.startsWith('0x')) {
      return `https://www.google.com/maps?q=${latFixed},${lngFixed}&ftid=${encodeURIComponent(cleanId)}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${latFixed},${lngFixed}&query_place_id=${encodeURIComponent(cleanId)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${latFixed},${lngFixed}`;
}

export function normalizeShopNameKey(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\b(restaurant|cafe|café|coffee|bistro|kitchen|bar|bakery|phnom penh|siem reap|battambang|kampot|kep|sihanoukville|cambodia)\b/g, ' ')
    .replace(/(ភោជនីយដ្ឋាន|ហាងកាហ្វេ|ហាងអាហារ|ផ្ទះបាយ|ហាងនំប៉័ង)/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

export function areShopNamesSimilar(aEn, aKh, bEn, bKh) {
  const keysA = [normalizeShopNameKey(aEn), normalizeShopNameKey(aKh)].filter((x) => x.length >= 3);
  const keysB = [normalizeShopNameKey(bEn), normalizeShopNameKey(bKh)].filter((x) => x.length >= 3);
  for (const ka of keysA) {
    for (const kb of keysB) {
      if (ka === kb) return true;
      if (ka.length >= 5 && kb.length >= 5 && (ka.includes(kb) || kb.includes(ka))) return true;
    }
  }
  return false;
}
