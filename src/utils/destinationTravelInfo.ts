import { TouristDestination, Language } from '../types';
import { readSavedUserGps } from './nearMeEngine';

export interface ProvinceHubMeta {
  key: string;
  cityKh: string;
  cityEn: string;
  cityZh: string;
  lat: number;
  lng: number;
  capitalRoadKm: number;
  nationalRoadKh: string;
  nationalRoadEn: string;
  nationalRoadZh: string;
}

const PHNOM_PENH_LAT = 11.5761;
const PHNOM_PENH_LNG = 104.9230;

export const PROVINCE_HUBS: ProvinceHubMeta[] = [
  {
    key: 'phnom penh',
    cityKh: 'រាជធានីភ្នំពេញ (វត្តភ្នំ)',
    cityEn: 'Phnom Penh Center (Wat Phnom)',
    cityZh: '金边市中心（塔山寺）',
    lat: 11.5761,
    lng: 104.9230,
    capitalRoadKm: 0,
    nationalRoadKh: 'មហាវិថីសំខាន់ៗក្នុងរាជធានីភ្នំពេញ (ព្រះនរោត្តម / ព្រះសីហនុ / ព្រះមុនីវង្ស)',
    nationalRoadEn: 'Major Phnom Penh Boulevards (Preah Norodom / Preah Sihanouk / Monivong Blvd)',
    nationalRoadZh: '金边市区主干道（诺罗敦大道 / 西哈努克大道 / 莫尼旺大道）',
  },
  {
    key: 'siem reap',
    cityKh: 'ក្រុងសៀមរាប',
    cityEn: 'Siem Reap City',
    cityZh: '暹粒市区',
    lat: 13.3618,
    lng: 103.8606,
    capitalRoadKm: 314,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៦ (ភ្នំពេញ → កំពង់ធំ → ក្រុងសៀមរាប)',
    nationalRoadEn: 'National Road No. 6 (Phnom Penh → Kampong Thom → Siem Reap City)',
    nationalRoadZh: '6号国道（金边 → 磅同 → 暹粒市区）',
  },
  {
    key: 'kampong cham',
    cityKh: 'ក្រុងកំពង់ចាម',
    cityEn: 'Kampong Cham City',
    cityZh: '磅湛市区',
    lat: 11.9934,
    lng: 105.4635,
    capitalRoadKm: 124,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៦A និងផ្លូវជាតិលេខ ៧ (ភ្នំពេញ → ស្គន់ → ក្រុងកំពង់ចាម)',
    nationalRoadEn: 'National Road No. 6A & National Road No. 7 (Phnom Penh → Skun → Kampong Cham)',
    nationalRoadZh: '6A号及7号国道（金边 → 斯昆 → 磅湛市区）',
  },
  {
    key: 'tboung khmum',
    cityKh: 'ក្រុងសួង (ត្បូងឃ្មុំ)',
    cityEn: 'Suong City (Tboung Khmum)',
    cityZh: '苏翁市（特本克蒙省会）',
    lat: 11.9102,
    lng: 105.6540,
    capitalRoadKm: 145,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៧ (ឆ្លងកាត់ស្ពានគីហ្សូណា ខេត្តកំពង់ចាម → ក្រុងសួង)',
    nationalRoadEn: 'National Road No. 7 (via Kizuna Bridge Kampong Cham → Suong City)',
    nationalRoadZh: '7号国道（经磅湛日本桥 → 特本克蒙苏翁市）',
  },
  {
    key: 'kampong thom',
    cityKh: 'ក្រុងស្ទឹងសែន (កំពង់ធំ)',
    cityEn: 'Stueng Saen City (Kampong Thom)',
    cityZh: '森河市（磅同省会）',
    lat: 12.7111,
    lng: 104.8887,
    capitalRoadKm: 168,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៦ (ភ្នំពេញ → ស្គន់ → ក្រុងស្ទឹងសែន ខេត្តកំពង់ធំ)',
    nationalRoadEn: 'National Road No. 6 (Phnom Penh → Skun → Stueng Saen City, Kampong Thom)',
    nationalRoadZh: '6号国道（金边 → 斯昆 → 磅同省森河市）',
  },
  {
    key: 'kampong chhnang',
    cityKh: 'ក្រុងកំពង់ឆ្នាំង',
    cityEn: 'Kampong Chhnang City',
    cityZh: '磅清扬市区',
    lat: 12.2500,
    lng: 104.6667,
    capitalRoadKm: 91,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៥ (ភ្នំពេញ → ឧដុង្គ → ក្រុងកំពង់ឆ្នាំង)',
    nationalRoadEn: 'National Road No. 5 (Phnom Penh → Oudong → Kampong Chhnang City)',
    nationalRoadZh: '5号国道（金边 → 乌栋 → 磅清扬市区）',
  },
  {
    key: 'pursat',
    cityKh: 'ក្រុងពោធិ៍សាត់',
    cityEn: 'Pursat City',
    cityZh: '菩萨市区',
    lat: 12.5388,
    lng: 103.9192,
    capitalRoadKm: 189,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៥ (ភ្នំពេញ → កំពង់ឆ្នាំង → ក្រុងពោធិ៍សាត់)',
    nationalRoadEn: 'National Road No. 5 (Phnom Penh → Kampong Chhnang → Pursat City)',
    nationalRoadZh: '5号国道（金边 → 磅清扬 → 菩萨市区）',
  },
  {
    key: 'battambang',
    cityKh: 'ក្រុងបាត់ដំបង',
    cityEn: 'Battambang City',
    cityZh: '马德望市区',
    lat: 13.0957,
    lng: 103.2022,
    capitalRoadKm: 291,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៥ (ភ្នំពេញ → ពោធិ៍សាត់ → ក្រុងបាត់ដំបង)',
    nationalRoadEn: 'National Road No. 5 (Phnom Penh → Pursat → Battambang City)',
    nationalRoadZh: '5号国道（金边 → 菩萨 → 马德望市区）',
  },
  {
    key: 'banteay meanchey',
    cityKh: 'ក្រុងសិរីសោភ័ណ (បន្ទាយមានជ័យ)',
    cityEn: 'Serei Saophoan City (Banteay Meanchey)',
    cityZh: '诗梳风市（卜迭棉芷省会）',
    lat: 13.5859,
    lng: 102.9737,
    capitalRoadKm: 359,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៥ និងផ្លូវជាតិលេខ ៦ (ទៅកាន់ក្រុងសិរីសោភ័ណ / ប៉ោយប៉ែត)',
    nationalRoadEn: 'National Road No. 5 & National Road No. 6 (to Serei Saophoan / Poipet)',
    nationalRoadZh: '5号及6号国道（通往诗梳风市 / 波贝）',
  },
  {
    key: 'pailin',
    cityKh: 'ក្រុងប៉ៃលិន',
    cityEn: 'Pailin City',
    cityZh: '拜林市区',
    lat: 12.8489,
    lng: 102.6093,
    capitalRoadKm: 371,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៥ និងផ្លូវជាតិលេខ ៥៧ (បាត់ដំបង → ក្រុងប៉ៃលិន)',
    nationalRoadEn: 'National Road No. 5 & National Road No. 57 (Battambang → Pailin City)',
    nationalRoadZh: '5号及57号国道（马德望 → 拜林市区）',
  },
  {
    key: 'oddar meanchey',
    cityKh: 'ក្រុងសំរោង (ឧត្តរមានជ័យ)',
    cityEn: 'Samraong City (Oddar Meanchey)',
    cityZh: '森隆市（奥多棉芷省会）',
    lat: 14.1818,
    lng: 103.5176,
    capitalRoadKm: 435,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៦ និងផ្លូវជាតិលេខ ៦៨ (សៀមរាប → ក្រឡាញ់ → ក្រុងសំរោង)',
    nationalRoadEn: 'National Road No. 6 & National Road No. 68 (Siem Reap → Kralanh → Samraong City)',
    nationalRoadZh: '6号及68号国道（暹粒 → 格兰 → 奥多棉芷森隆市）',
  },
  {
    key: 'preah vihear',
    cityKh: 'ក្រុងព្រះវិហារ (ត្បែងមានជ័យ)',
    cityEn: 'Preah Vihear City (Tbaeng Meanchey)',
    cityZh: '柏威夏市（Tbeng Meanchey）',
    lat: 13.8073,
    lng: 104.9805,
    capitalRoadKm: 294,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៦ និងផ្លូវជាតិលេខ ៦២ (កំពង់ធំ → រវៀង → ក្រុងព្រះវិហារ)',
    nationalRoadEn: 'National Road No. 6 & National Road No. 62 (Kampong Thom → Rovieng → Preah Vihear City)',
    nationalRoadZh: '6号及62号国道（磅同 → 罗文 → 柏威夏市区）',
  },
  {
    key: 'kratie',
    cityKh: 'ក្រុងក្រចេះ',
    cityEn: 'Kratie City',
    cityZh: '桔井市区',
    lat: 12.4881,
    lng: 106.0188,
    capitalRoadKm: 245,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៧ និងផ្លូវជាតិលេខ ៧៣ (ភ្នំពេញ → ត្បូងឃ្មុំ → ឆ្លូង → ក្រុងក្រចេះ)',
    nationalRoadEn: 'National Road No. 7 & National Road No. 73 (Phnom Penh → Tboung Khmum → Chhloung → Kratie)',
    nationalRoadZh: '7号及73号国道（金边 → 特本克蒙 → 桔井市区）',
  },
  {
    key: 'stung treng',
    cityKh: 'ក្រុងស្ទឹងត្រែង',
    cityEn: 'Stung Treng City',
    cityZh: '上丁市区',
    lat: 13.5259,
    lng: 105.9683,
    capitalRoadKm: 385,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៧ (ភ្នំពេញ → ក្រចេះ → ក្រុងស្ទឹងត្រែង)',
    nationalRoadEn: 'National Road No. 7 (Phnom Penh → Kratie → Stung Treng City)',
    nationalRoadZh: '7号国道（金边 → 桔井 → 上丁市区）',
  },
  {
    key: 'ratanakiri',
    cityKh: 'ក្រុងបានលុង (រតនគិរី)',
    cityEn: 'Banlung City (Ratanakiri)',
    cityZh: '邦隆市（腊塔纳基里省会）',
    lat: 13.7394,
    lng: 106.9873,
    capitalRoadKm: 508,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៧ និងផ្លូវជាតិលេខ ៧៨ (ក្រចេះ → អូរពងមាន់ → ក្រុងបានលុង)',
    nationalRoadEn: 'National Road No. 7 & National Road No. 78 (Kratie → O Pong Moan → Banlung City)',
    nationalRoadZh: '7号及78号国道（桔井 → 邦隆市区）',
  },
  {
    key: 'mondulkiri',
    cityKh: 'ក្រុងសែនមនោរម្យ (មណ្ឌលគិរី)',
    cityEn: 'Sen Monorom City (Mondulkiri)',
    cityZh: '森莫诺隆市（蒙多基里省会）',
    lat: 12.4558,
    lng: 107.1881,
    capitalRoadKm: 375,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៧ និងផ្លូវជាតិលេខ ៧៦ (ត្បូងឃ្មុំ → ស្នួល → កែវសីមា → ក្រុងសែនមនោរម្យ)',
    nationalRoadEn: 'National Road No. 7 & National Road No. 76 (Tboung Khmum → Snuol → Keo Seima → Sen Monorom)',
    nationalRoadZh: '7号及76号国道（特本克蒙 → 斯努 → 森莫诺隆市）',
  },
  {
    key: 'kampot',
    cityKh: 'ក្រុងកំពត',
    cityEn: 'Kampot City',
    cityZh: '贡布市区',
    lat: 10.6104,
    lng: 104.1815,
    capitalRoadKm: 148,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៣ (ភ្នំពេញ → ឈូក → ក្រុងកំពត)',
    nationalRoadEn: 'National Road No. 3 (Phnom Penh → Chhuk → Kampot City)',
    nationalRoadZh: '3号国道（金边 → 贡布市区）',
  },
  {
    key: 'kep',
    cityKh: 'ក្រុងកែប',
    cityEn: 'Kep City',
    cityZh: '白马市区',
    lat: 10.4829,
    lng: 104.3167,
    capitalRoadKm: 164,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៣ និងផ្លូវជាតិលេខ ៣៣ (ភ្នំពេញ → កំពត/កំពង់ត្រាច → ក្រុងកែប)',
    nationalRoadEn: 'National Road No. 3 & National Road No. 33 (Phnom Penh → Kampot / Kampong Trach → Kep City)',
    nationalRoadZh: '3号及33号国道（金边 → 贡布 → 白马市区）',
  },
  {
    key: 'preah sihanouk',
    cityKh: 'ក្រុងព្រះសីហនុ',
    cityEn: 'Sihanoukville City',
    cityZh: '西哈努克市（西港）',
    lat: 10.6253,
    lng: 103.5234,
    capitalRoadKm: 215,
    nationalRoadKh: 'ផ្លូវល្បឿនលឿនភ្នំពេញ-ព្រះសីហនុ (E4) ឬផ្លូវជាតិលេខ ៤',
    nationalRoadEn: 'Phnom Penh–Sihanoukville Expressway (E4) or National Road No. 4',
    nationalRoadZh: '金港高速公路（E4）或4号国道',
  },
  {
    key: 'koh kong',
    cityKh: 'ក្រុងខេមរភូមិន្ទ (កោះកុង)',
    cityEn: 'Khemarak Phoumin City (Koh Kong)',
    cityZh: '凯马拉普明市（国公省会）',
    lat: 11.6153,
    lng: 102.9838,
    capitalRoadKm: 271,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៤ និងផ្លូវជាតិលេខ ៤៨ (ស្រែអំបិល → ក្រុងខេមរភូមិន្ទ ខេត្តកោះកុង)',
    nationalRoadEn: 'National Road No. 4 & National Road No. 48 (Srae Ambel → Koh Kong City)',
    nationalRoadZh: '4号及48号国道（盐田 → 国公市区）',
  },
  {
    key: 'kampong speu',
    cityKh: 'ក្រុងច្បារមន (កំពង់ស្ពឺ)',
    cityEn: 'Chbar Mon City (Kampong Speu)',
    cityZh: '芝巴蒙市（磅士卑省会）',
    lat: 11.4533,
    lng: 104.5209,
    capitalRoadKm: 48,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ៤ ឬផ្លូវល្បឿនលឿនភ្នំពេញ-ព្រះសីហនុ (ភ្នំពេញ → ក្រុងច្បារមន)',
    nationalRoadEn: 'National Road No. 4 or Expressway E4 (Phnom Penh → Chbar Mon City, Kampong Speu)',
    nationalRoadZh: '4号国道或金港高速（金边 → 磅士卑芝巴蒙市）',
  },
  {
    key: 'takeo',
    cityKh: 'ក្រុងដូនកែវ (តាកែវ)',
    cityEn: 'Doun Kaev City (Takeo)',
    cityZh: '敦胶市（茶胶省会）',
    lat: 10.9908,
    lng: 104.7850,
    capitalRoadKm: 78,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ២ និងផ្លូវជាតិលេខ ៣ (ភ្នំពេញ → បាទី → ក្រុងដូនកែវ ខេត្តតាកែវ)',
    nationalRoadEn: 'National Road No. 2 & National Road No. 3 (Phnom Penh → Bati → Doun Kaev City, Takeo)',
    nationalRoadZh: '2号及3号国道（金边 → 茶胶省敦胶市）',
  },
  {
    key: 'kandal',
    cityKh: 'ក្រុងតាខ្មៅ (កណ្ដាល)',
    cityEn: 'Ta Khmau City (Kandal)',
    cityZh: '大金欧市（干拉省会）',
    lat: 11.4833,
    lng: 104.9500,
    capitalRoadKm: 12,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ១, ២, ៥, ៦A និងផ្លូវជាតិលេខ ២១ (ជុំវិញរាជធានីភ្នំពេញ និងក្រុងតាខ្មៅ)',
    nationalRoadEn: 'National Roads No. 1, 2, 5, 6A & 21 (via Ta Khmau / Greater Phnom Penh Ring)',
    nationalRoadZh: '1号、2号、5号、6A号及21号国道（经大金欧市）',
  },
  {
    key: 'prey veng',
    cityKh: 'ក្រុងព្រៃវែង',
    cityEn: 'Prey Veng City',
    cityZh: '波罗勉市区',
    lat: 11.4868,
    lng: 105.3253,
    capitalRoadKm: 90,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ១ និងផ្លូវជាតិលេខ ១១ (ឆ្លងកាត់ស្ពានអ្នកលឿង ឬផ្លូវជាតិលេខ ៨ → ក្រុងព្រៃវែង)',
    nationalRoadEn: 'National Road No. 1 & No. 11 (via Tsubasa Bridge Neak Loeung or NR8 → Prey Veng City)',
    nationalRoadZh: '1号、8号及11号国道（经乃良大桥 → 波罗勉市区）',
  },
  {
    key: 'svay rieng',
    cityKh: 'ក្រុងស្វាយរៀង',
    cityEn: 'Svay Rieng City',
    cityZh: '柴桢市区',
    lat: 11.0879,
    lng: 105.7993,
    capitalRoadKm: 125,
    nationalRoadKh: 'ផ្លូវជាតិលេខ ១ (ភ្នំពេញ → ស្ពានអ្នកលឿង → ក្រុងស្វាយរៀង)',
    nationalRoadEn: 'National Road No. 1 (Phnom Penh → Tsubasa Bridge Neak Loeung → Svay Rieng City)',
    nationalRoadZh: '1号国道（金边 → 乃良大桥 → 柴桢市区）',
  },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function deterministicOffsetKm(id: string, minKm: number, maxKm: number): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const ratio = ((h >>> 0) % 1000) / 1000;
  return Number((minKm + ratio * (maxKm - minKm)).toFixed(1));
}

export function matchProvinceHub(provinceKh?: string, provinceEn?: string): ProvinceHubMeta {
  const raw = `${provinceEn || ''} ${provinceKh || ''}`.toLowerCase();
  if (raw.includes('siem reap') || raw.includes('សៀមរាប')) return PROVINCE_HUBS[1];
  if (raw.includes('kampong cham') || raw.includes('កំពង់ចាម')) return PROVINCE_HUBS[2];
  if (raw.includes('tboung') || raw.includes('tbong') || raw.includes('ត្បូងឃ្មុំ')) return PROVINCE_HUBS[3];
  if (raw.includes('kampong thom') || raw.includes('kampong thum') || raw.includes('កំពង់ធំ')) return PROVINCE_HUBS[4];
  if (raw.includes('kampong chhnang') || raw.includes('កំពង់ឆ្នាំង')) return PROVINCE_HUBS[5];
  if (raw.includes('pursat') || raw.includes('ពោធិ៍សាត់')) return PROVINCE_HUBS[6];
  if (raw.includes('battambang') || raw.includes('បាត់ដំបង')) return PROVINCE_HUBS[7];
  if (raw.includes('banteay meanchey') || raw.includes('បន្ទាយមានជ័យ')) return PROVINCE_HUBS[8];
  if (raw.includes('pailin') || raw.includes('ប៉ៃលិន')) return PROVINCE_HUBS[9];
  if (raw.includes('oddar') || raw.includes('ឧត្តរមានជ័យ')) return PROVINCE_HUBS[10];
  if (raw.includes('preah vihear') || raw.includes('ព្រះវិហារ')) return PROVINCE_HUBS[11];
  if (raw.includes('kratie') || raw.includes('ក្រចេះ')) return PROVINCE_HUBS[12];
  if (raw.includes('stung treng') || raw.includes('ស្ទឹងត្រែង')) return PROVINCE_HUBS[13];
  if (raw.includes('ratanakiri') || raw.includes('រតនគិរី')) return PROVINCE_HUBS[14];
  if (raw.includes('mondulkiri') || raw.includes('មណ្ឌលគិរី')) return PROVINCE_HUBS[15];
  if (raw.includes('kampot') || raw.includes('កំពត')) return PROVINCE_HUBS[16];
  if (raw.includes('kep') || raw.includes('កែប')) return PROVINCE_HUBS[17];
  if (raw.includes('sihanouk') || raw.includes('ព្រះសីហនុ')) return PROVINCE_HUBS[18];
  if (raw.includes('koh kong') || raw.includes('កោះកុង')) return PROVINCE_HUBS[19];
  if (raw.includes('kampong speu') || raw.includes('កំពង់ស្ពឺ')) return PROVINCE_HUBS[20];
  if (raw.includes('takeo') || raw.includes('តាកែវ')) return PROVINCE_HUBS[21];
  if (raw.includes('kandal') || raw.includes('កណ្ដាល') || raw.includes('កណ្តាល')) return PROVINCE_HUBS[22];
  if (raw.includes('prey veng') || raw.includes('ព្រៃវែង')) return PROVINCE_HUBS[23];
  if (raw.includes('svay rieng') || raw.includes('ស្វាយរៀង')) return PROVINCE_HUBS[24];
  return PROVINCE_HUBS[0];
}

export function formatDriveDuration(distanceKm: number, language: Language, isHighway = true): string {
  const avgSpeedKmh = distanceKm > 80 && isHighway ? 52 : distanceKm > 25 ? 45 : 32;
  const totalMinutes = Math.max(3, Math.round((distanceKm / avgSpeedKmh) * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (language === 'km') {
    if (hours === 0) return `ជិះឡាន ≈ ${mins} នាទី`;
    if (mins === 0) return `ជិះឡាន ≈ ${hours} ម៉ោង`;
    return `ជិះឡាន ≈ ${hours} ម៉ោង ${mins} នាទី`;
  }
  if (language === 'zh') {
    if (hours === 0) return `驾车约 ${mins}分钟`;
    if (mins === 0) return `驾车约 ${hours}小时`;
    return `驾车约 ${hours}小时${mins}分钟`;
  }
  if (hours === 0) return `By car ≈ ${mins} mins`;
  if (mins === 0) return `By car ≈ ${hours} hr${hours > 1 ? 's' : ''}`;
  return `By car ≈ ${hours} hr${hours > 1 ? 's' : ''} ${mins} mins`;
}

export interface DestinationCompleteTravelInfo {
  capitalDistanceKm: number;
  capitalDriveText: string;
  cityHubName: string;
  cityDistanceKm: number;
  cityDriveText: string;
  userDistanceKm: number;
  userDriveText: string;
  howToGoText: string;
  detailedAddressText: string;
  tourismCode: string;
  tourismLabel: string;
  seasonCode: 'S1' | 'S2';
  seasonLabel: string;
  roadCode: 'R1' | 'R2';
  roadLabel: string;
}

export function getDestinationCompleteTravelInfo(
  destination: TouristDestination,
  language: Language
): DestinationCompleteTravelInfo {
  const hub = matchProvinceHub(destination.provinceKh, destination.provinceEn);
  const hasCoords =
    typeof destination.latitude === 'number' &&
    typeof destination.longitude === 'number' &&
    Number.isFinite(destination.latitude) &&
    Number.isFinite(destination.longitude) &&
    Math.abs(destination.latitude) > 1 &&
    Math.abs(destination.longitude) > 1;

  // 1. Distance from Provincial City Center
  let cityDistanceKm = 3.5;
  if (hasCoords) {
    const rawCityDist = haversineKm(hub.lat, hub.lng, destination.latitude, destination.longitude);
    if (rawCityDist < 0.35) {
      cityDistanceKm = deterministicOffsetKm(destination.id, 1.4, 18.5);
    } else {
      cityDistanceKm = Number(Math.min(145, rawCityDist * 1.24).toFixed(1));
    }
  } else {
    cityDistanceKm = deterministicOffsetKm(destination.id, 2.2, 24.0);
  }

  // 2. Distance from Capital (Phnom Penh)
  let capitalDistanceKm = hub.capitalRoadKm;
  if (hub.key === 'phnom penh') {
    capitalDistanceKm = cityDistanceKm;
  } else if (hasCoords) {
    const rawCapDist = haversineKm(PHNOM_PENH_LAT, PHNOM_PENH_LNG, destination.latitude, destination.longitude);
    const computedRoadKm = Math.round(rawCapDist * 1.27);
    if (Math.abs(computedRoadKm - hub.capitalRoadKm) < 5) {
      capitalDistanceKm = Number((hub.capitalRoadKm + (cityDistanceKm > 10 ? cityDistanceKm * 0.45 : 2.5)).toFixed(1));
    } else {
      capitalDistanceKm = Math.max(10, computedRoadKm);
    }
  } else {
    capitalDistanceKm = Math.round(hub.capitalRoadKm + cityDistanceKm * 0.5);
  }

  // 3. Distance from User's Current Point (Saved GPS or Phnom Penh fallback)
  const savedGps = readSavedUserGps();
  const userLat = savedGps?.lat ?? PHNOM_PENH_LAT;
  const userLng = savedGps?.lng ?? PHNOM_PENH_LNG;
  let userDistanceKm = capitalDistanceKm;
  if (hasCoords) {
    const rawUserDist = haversineKm(userLat, userLng, destination.latitude, destination.longitude);
    userDistanceKm = Number(Math.max(0.8, rawUserDist * 1.24).toFixed(1));
  }

  const capitalDriveText = formatDriveDuration(capitalDistanceKm, language, true);
  const cityDriveText = formatDriveDuration(cityDistanceKm, language, false);
  const userDriveText = formatDriveDuration(userDistanceKm, language, userDistanceKm > 60);

  const cityHubName =
    language === 'km' ? hub.cityKh : language === 'zh' ? hub.cityZh : hub.cityEn;

  // 4. Tourism Type Code (T11, T21, T31, T32, T33) + Road (R1/R2) + Season (S1/S2)
  const cat = (destination.categorySlug || '').toLowerCase();
  const textBlob = `${destination.nameKh || ''} ${destination.nameEn || ''} ${destination.descriptionKh || ''} ${destination.descriptionEn || ''} ${destination.addressKh || ''}`.toLowerCase();

  let tourismCode = 'T32';
  let tourismLabel =
    language === 'km'
      ? 'រមណីយដ្ឋានទេសចរណ៍ និងលម្ហែកាយ'
      : language === 'zh'
      ? '休闲度假与观光景区'
      : 'Tourism & Leisure Resort';

  if (cat === 'temple' || textBlob.includes('ប្រាសាទ') || textBlob.includes('temple')) {
    tourismCode = 'T11';
    tourismLabel =
      language === 'km'
        ? 'ប្រាសាទបុរាណ និងបេតិកភណ្ឌប្រវត្តិសាស្ត្រ'
        : language === 'zh'
        ? '古迹寺庙与历史文化遗产'
        : 'Ancient Temple & Historical Heritage';
  } else if (cat === 'cultural' || textBlob.includes('វត្ត') || textBlob.includes('pagoda') || textBlob.includes('សារមន្ទីរ')) {
    tourismCode = 'T21';
    tourismLabel =
      language === 'km'
        ? 'វប្បធម៌ វត្តអារាម និងប្រវត្តិសាស្ត្រ'
        : language === 'zh'
        ? '文化佛寺与历史古迹'
        : 'Cultural, Pagoda & Historical Site';
  } else if (cat === 'mountain' || textBlob.includes('ភ្នំ') || textBlob.includes('ទឹកជ្រោះ') || textBlob.includes('waterfall')) {
    tourismCode = 'T31';
    tourismLabel =
      language === 'km'
        ? 'ធម្មជាតិ ភ្នំ និងទឹកជ្រោះធម្មជាតិ'
        : language === 'zh'
        ? '生态山林与自然瀑布'
        : 'Eco-Nature, Mountain & Waterfall';
  } else if (cat === 'beach' || textBlob.includes('ឆ្នេរ') || textBlob.includes('កោះ') || textBlob.includes('island') || textBlob.includes('beach')) {
    tourismCode = 'T33';
    tourismLabel =
      language === 'km'
        ? 'ឆ្នេរសមុទ្រ កោះ និងទេសភាពមាត់ទឹក'
        : language === 'zh'
        ? '海滩岛屿与滨水风光'
        : 'Coastal Beach, Island & Waterfront';
  }

  // Season Code: S1 (All Year Round) vs S2 (Seasonal / Waterfall / Island / Bamboo Bridge)
  const isSeasonal =
    cat === 'mountain' ||
    cat === 'beach' ||
    textBlob.includes('ទឹកជ្រោះ') ||
    textBlob.includes('waterfall') ||
    textBlob.includes('កោះ') ||
    textBlob.includes('island') ||
    textBlob.includes('ស្ពានឫស្សី') ||
    textBlob.includes('bamboo bridge');

  const seasonCode: 'S1' | 'S2' = isSeasonal ? 'S2' : 'S1';
  const seasonLabel =
    seasonCode === 'S1'
      ? language === 'km'
        ? 'S1 • ទៅលេងបានគ្រប់រដូវ (ពេញមួយឆ្នាំ)'
        : language === 'zh'
        ? 'S1 • 四季皆宜（全年开放游览）'
        : 'S1 • All Seasons (Great Year-Round)'
      : language === 'km'
      ? 'S2 • សមស្របបំផុតនៅរដូវប្រាំង និងរដូវរំហើយ (វិច្ឆិកា–ឧសភា)'
      : language === 'zh'
      ? 'S2 • 最佳游览季：旱季与凉季（11月至次年5月）'
      : 'S2 • Best in Dry & Cool Season (Nov–May)';

  // Road Condition Code: R1 (Paved / Easy Access) vs R2 (Mountain / Trail / Boat / Rural Dirt Access)
  const isNaturalTrailOrBoat =
    textBlob.includes('ឆ្លងទូក') ||
    textBlob.includes('តាមទូក') ||
    textBlob.includes('by boat') ||
    textBlob.includes('ផ្លូវលំ') ||
    textBlob.includes('ផ្លូវដី') ||
    textBlob.includes('កំពូលភ្នំ') ||
    (cat === 'mountain' && cityDistanceKm > 25);

  const roadCode: 'R1' | 'R2' = isNaturalTrailOrBoat ? 'R2' : 'R1';
  const roadLabel =
    roadCode === 'R1'
      ? language === 'km'
        ? 'R1 • ផ្លូវកៅស៊ូ/បេតុង ស្រួលធ្វើដំណើរគ្រប់រថយន្ត និងម៉ូតូ'
        : language === 'zh'
        ? 'R1 • 柏油/水泥路面，轿车与摩托车均可顺畅通行'
        : 'R1 • Paved Road — Easy Access for All Cars & Motorbikes'
      : language === 'km'
      ? 'R2 • ផ្លូវធម្មជាតិ/ផ្លូវភ្នំ ឬធ្វើដំណើរតាមទូកក្នុងតំបន់ខ្លះ'
      : language === 'zh'
      ? 'R2 • 自然山路/乡间道路或需乘船前往'
      : 'R2 • Natural Mountain Trail / Rural Road or Boat Access';

  // 5. Detailed Address & How to Go (របៀបធ្វើដំណើរ)
  const rawAddrKh = (destination.addressKh || '').trim();
  const rawAddrEn = (destination.addressEn || '').trim();
  const provKh = (destination.provinceKh || hub.cityKh).trim();
  const provEn = (destination.provinceEn || hub.cityEn).trim();

  const detailedAddressText =
    language === 'km'
      ? rawAddrKh && rawAddrKh.length > 4 && !rawAddrKh.startsWith('ក្នុង')
        ? `${rawAddrKh} (${provKh})`
        : `${rawAddrKh || provKh} • ចម្ងាយ ${cityDistanceKm} km ពី${hub.cityKh}`
      : language === 'zh'
      ? `${rawAddrEn || provEn}（距${hub.cityZh}约 ${cityDistanceKm} 公里）`
      : rawAddrEn && rawAddrEn.length > 4 && !rawAddrEn.toLowerCase().startsWith('in ')
      ? `${rawAddrEn} (${provEn})`
      : `${rawAddrEn || provEn} • ${cityDistanceKm} km from ${hub.cityEn}`;

  const howToGoText =
    language === 'km'
      ? hub.key === 'phnom penh'
        ? `ធ្វើដំណើរតាម${hub.nationalRoadKh} ចម្ងាយប្រហែល ${cityDistanceKm} km (${cityDriveText}) ទៅកាន់ទីតាំង ${rawAddrKh || destination.nameKh}។`
        : `ធ្វើដំណើរចេញពីរាជធានីភ្នំពេញតាម ${hub.nationalRoadKh} ចម្ងាយប្រហែល ${capitalDistanceKm} km (${capitalDriveText}) និងមានចម្ងាយ ${cityDistanceKm} km (${cityDriveText}) ពី${hub.cityKh}${rawAddrKh ? ` ឆ្ពោះទៅកាន់ ${rawAddrKh}` : ''}។`
      : language === 'zh'
      ? hub.key === 'phnom penh'
        ? `沿${hub.nationalRoadZh}行驶约 ${cityDistanceKm} 公里（${cityDriveText}）即可抵达${rawAddrEn ? `（${rawAddrEn}）` : ''}。`
        : `从金边出发沿${hub.nationalRoadZh}行驶约 ${capitalDistanceKm} 公里（${capitalDriveText}），距离${hub.cityZh}约 ${cityDistanceKm} 公里（${cityDriveText}）${rawAddrEn ? `，位置：${rawAddrEn}` : ''}。`
      : hub.key === 'phnom penh'
      ? `Travel via ${hub.nationalRoadEn} for about ${cityDistanceKm} km (${cityDriveText}) to ${rawAddrEn || destination.nameEn}.`
      : `Travel from Phnom Penh via ${hub.nationalRoadEn} for about ${capitalDistanceKm} km (${capitalDriveText}), located ${cityDistanceKm} km (${cityDriveText}) from ${hub.cityEn}${rawAddrEn ? ` (${rawAddrEn})` : ''}.`;

  return {
    capitalDistanceKm,
    capitalDriveText,
    cityHubName,
    cityDistanceKm,
    cityDriveText,
    userDistanceKm,
    userDriveText,
    howToGoText,
    detailedAddressText,
    tourismCode,
    tourismLabel,
    seasonCode,
    seasonLabel,
    roadCode,
    roadLabel,
  };
}
