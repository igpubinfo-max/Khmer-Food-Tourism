import type { FoodItem } from '../types';

export interface ProvinceFilterOption {
  id: string;
  kh: string;
  en: string;
  zh: string;
}

/** Province names (Khmer / English / Chinese) used to detect which province a dish name/description refers to. */
export const DISH_PROVINCES: ProvinceFilterOption[] = [
  { id: 'phnom_penh', kh: 'ភ្នំពេញ', en: 'Phnom Penh', zh: '金边' },
  { id: 'siem_reap', kh: 'សៀមរាប', en: 'Siem Reap', zh: '暹粒' },
  { id: 'battambang', kh: 'បាត់ដំបង', en: 'Battambang', zh: '马德望' },
  { id: 'kampot', kh: 'កំពត', en: 'Kampot', zh: '贡布' },
  { id: 'kep', kh: 'កែប', en: 'Kep', zh: '白马' },
  { id: 'sihanoukville', kh: 'ព្រះសីហនុ', en: 'Sihanoukville', zh: '西哈努克港' },
  { id: 'koh_kong', kh: 'កោះកុង', en: 'Koh Kong', zh: '国公' },
  { id: 'mondulkiri', kh: 'មណ្ឌលគិរី', en: 'Mondulkiri', zh: '蒙多基里' },
  { id: 'ratanakiri', kh: 'រតនគិរី', en: 'Ratanakiri', zh: '腊塔纳基里' },
  { id: 'kampong_cham', kh: 'កំពង់ចាម', en: 'Kampong Cham', zh: '磅湛' },
  { id: 'kampong_thom', kh: 'កំពង់ធំ', en: 'Kampong Thom', zh: '磅同' },
  { id: 'kampong_chhnang', kh: 'កំពង់ឆ្នាំង', en: 'Kampong Chhnang', zh: '磅清扬' },
  { id: 'kampong_speu', kh: 'កំពង់ស្ពឺ', en: 'Kampong Speu', zh: '磅士卑' },
  { id: 'takeo', kh: 'តាកែវ', en: 'Takeo', zh: '茶胶' },
  { id: 'kratie', kh: 'ក្រចេះ', en: 'Kratie', zh: '桔井' },
  { id: 'pailin', kh: 'ប៉ៃលិន', en: 'Pailin', zh: '拜林' },
  { id: 'pursat', kh: 'ពោធិ៍សាត់', en: 'Pursat', zh: '菩萨' },
  { id: 'preah_vihear', kh: 'ព្រះវិហារ', en: 'Preah Vihear', zh: '柏威夏' },
  { id: 'banteay_meanchey', kh: 'បន្ទាយមានជ័យ', en: 'Banteay Meanchey', zh: '班迭棉吉' },
  { id: 'svay_rieng', kh: 'ស្វាយរៀង', en: 'Svay Rieng', zh: '柴桢' },
  { id: 'prey_veng', kh: 'ព្រៃវែង', en: 'Prey Veng', zh: '波罗勉' },
  { id: 'kandal', kh: 'កណ្តាល', en: 'Kandal', zh: '干丹' },
  { id: 'stung_treng', kh: 'ស្ទឹងត្រែង', en: 'Stung Treng', zh: '上丁' },
  { id: 'tboung_khmum', kh: 'ត្បូងឃ្មុំ', en: 'Tboung Khmum', zh: '特本克蒙' },
  { id: 'oddar_meanchey', kh: 'ឧត្តរមានជ័យ', en: 'Oddar Meanchey', zh: '奥多棉吉' },
];

const provinceCache = new Map<string, string | null>();

/**
 * Returns the province a dish is linked to, ONLY when its name or description explicitly mentions one.
 * No guessing: dishes that mention no province return null.
 */
export function detectDishProvince(food: FoodItem): string | null {
  const key = `${food.id}|${food.nameKh}|${food.nameEn}`;
  if (provinceCache.has(key)) return provinceCache.get(key) ?? null;

  const textKh = `${food.nameKh || ''} ${food.descriptionKh || ''}`;
  const textEn = `${food.nameEn || ''} ${food.descriptionEn || ''}`;
  let found: string | null = null;
  for (const p of DISH_PROVINCES) {
    const re = new RegExp(`(^|[^A-Za-z])${p.en.replace(/ /g, '\\s+')}([^A-Za-z]|$)`, 'i');
    if (textKh.includes(p.kh) || re.test(textEn)) {
      found = p.id;
      break;
    }
  }
  provinceCache.set(key, found);
  return found;
}
