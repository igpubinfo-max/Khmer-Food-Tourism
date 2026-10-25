/**
 * Static "1-Day Food Trip" templates. Every stop references an EXISTING food / restaurant / destination id
 * (stops whose id is missing from the user's data are skipped at runtime). No new facts are stored here.
 */
export type TripSlotId = 'morning' | 'lunch' | 'afternoon' | 'dinner';
export interface TripStop {
  type: 'food' | 'restaurant' | 'destination';
  id: string;
}
export interface TripSlot {
  slot: TripSlotId;
  stops: TripStop[];
}
export interface FoodTripTemplate {
  id: string;
  emoji: string;
  titleKh: string;
  titleEn: string;
  titleZh: string;
  subtitleKh: string;
  subtitleEn: string;
  subtitleZh: string;
  /** Used to build a Google Maps search link for dishes that have no fixed location */
  mapHint: string;
  slots: TripSlot[];
}

export const SLOT_LABELS: Record<TripSlotId, { emoji: string; kh: string; en: string; zh: string }> = {
  morning: { emoji: '🌅', kh: 'ព្រឹក', en: 'Morning', zh: '上午' },
  lunch: { emoji: '🍽️', kh: 'ថ្ងៃត្រង់', en: 'Lunch', zh: '午餐' },
  afternoon: { emoji: '☀️', kh: 'រសៀល', en: 'Afternoon', zh: '下午' },
  dinner: { emoji: '🌙', kh: 'ល្ងាច', en: 'Dinner', zh: '晚餐' },
};

export const FOOD_TRIP_TEMPLATES: FoodTripTemplate[] = [
  {
    id: 'trip-phnom-penh-street',
    emoji: '🛵',
    titleKh: 'ម្ហូបតាមផ្លូវភ្នំពេញ ១ ថ្ងៃ',
    titleEn: 'Phnom Penh Street Food Day',
    titleZh: '金边街头美食一日游',
    subtitleKh: 'គុយទាវ បាយសាច់ជ្រូក និងផ្សារ',
    subtitleEn: 'Kuyteav, grilled pork rice & markets',
    subtitleZh: '粿条、烤猪肉饭与市场',
    mapHint: 'Phnom Penh Cambodia',
    slots: [
      { slot: 'morning', stops: [{ type: 'food', id: 'food-36' }, { type: 'destination', id: 'dest-8' }] },
      { slot: 'lunch', stops: [{ type: 'food', id: 'food-41' }, { type: 'restaurant', id: 'rest-4' }] },
      { slot: 'afternoon', stops: [{ type: 'destination', id: 'dest-1' }] },
      { slot: 'dinner', stops: [{ type: 'restaurant', id: 'rest-2' }, { type: 'destination', id: 'dest-5' }] },
    ],
  },
  {
    id: 'trip-siem-reap-classics',
    emoji: '🛕',
    titleKh: 'ម្ហូបខ្មែរបុរាណសៀមរាប ១ ថ្ងៃ',
    titleEn: 'Siem Reap Khmer Classics',
    titleZh: '暹粒经典高棉菜一日游',
    subtitleKh: 'អាម៉ុក ប្រាសាទ និងផ្លូវមនុស្សដើរ',
    subtitleEn: 'Fish amok, temples & Pub Street',
    subtitleZh: '阿莫克鱼、古寺与酒吧街',
    mapHint: 'Siem Reap Cambodia',
    slots: [
      { slot: 'morning', stops: [{ type: 'destination', id: 'dest-9' }] },
      { slot: 'lunch', stops: [{ type: 'food', id: 'food-1' }, { type: 'restaurant', id: 'rest-42' }] },
      { slot: 'afternoon', stops: [{ type: 'destination', id: 'dest-10' }, { type: 'destination', id: 'dest-11' }] },
      { slot: 'dinner', stops: [{ type: 'restaurant', id: 'rest-13' }, { type: 'destination', id: 'dest-20' }] },
    ],
  },
  {
    id: 'trip-kampot-kep-seafood',
    emoji: '🦀',
    titleKh: 'គ្រឿងសមុទ្រ កំពត-កែប ១ ថ្ងៃ',
    titleEn: 'Kampot–Kep Seafood Day',
    titleZh: '贡布–白马海鲜一日游',
    subtitleKh: 'ម្រេចកំពត ក្តាមកែប និងសមុទ្រ',
    subtitleEn: 'Kampot pepper, Kep crab & the sea',
    subtitleZh: '贡布胡椒、白马螃蟹与海景',
    mapHint: 'Kampot Kep Cambodia',
    slots: [
      { slot: 'morning', stops: [{ type: 'destination', id: 'dest-31' }] },
      { slot: 'lunch', stops: [{ type: 'food', id: 'food-26' }, { type: 'restaurant', id: 'rest-44' }] },
      { slot: 'afternoon', stops: [{ type: 'destination', id: 'dest-37' }] },
      { slot: 'dinner', stops: [{ type: 'food', id: 'food-27' }, { type: 'destination', id: 'dest-38' }, { type: 'restaurant', id: 'rest-19' }] },
    ],
  },
  {
    id: 'trip-battambang-local',
    emoji: '🚂',
    titleKh: 'បាត់ដំបង ម្ហូបស្រុកស្រែ ១ ថ្ងៃ',
    titleEn: 'Battambang Local Day',
    titleZh: '马德望本地风味一日游',
    subtitleKh: 'រថភ្លើងឫស្សី វត្ត និងម្ហូបតំបន់',
    subtitleEn: 'Bamboo train, temples & local dishes',
    subtitleZh: '竹火车、古寺与地方美食',
    mapHint: 'Battambang Cambodia',
    slots: [
      { slot: 'morning', stops: [{ type: 'destination', id: 'dest-43' }] },
      { slot: 'lunch', stops: [{ type: 'restaurant', id: 'rest-24' }] },
      { slot: 'afternoon', stops: [{ type: 'destination', id: 'dest-44' }, { type: 'restaurant', id: 'rest-43' }] },
      { slot: 'dinner', stops: [{ type: 'restaurant', id: 'rest-25' }] },
    ],
  },
  {
    id: 'trip-noodle-hunter',
    emoji: '🍜',
    titleKh: 'ថ្ងៃប្រមាញ់មី និងគុយទាវ',
    titleEn: 'Noodle Hunter Day',
    titleZh: '面条猎人一日游',
    subtitleKh: 'គុយទាវ នំបញ្ចុក មីកូឡា និងមីឆា',
    subtitleEn: 'Kuyteav, num banh chok, mee kola & mee cha',
    subtitleZh: '粿条、鱼汤米线、拌面与炒面',
    mapHint: 'Phnom Penh Cambodia',
    slots: [
      { slot: 'morning', stops: [{ type: 'food', id: 'food-36' }] },
      { slot: 'lunch', stops: [{ type: 'food', id: 'food-37' }, { type: 'food', id: 'food-38' }] },
      { slot: 'afternoon', stops: [{ type: 'food', id: 'food-39' }, { type: 'destination', id: 'dest-8' }] },
      { slot: 'dinner', stops: [{ type: 'food', id: 'food-40' }, { type: 'restaurant', id: 'rest-6' }] },
    ],
  },
  {
    id: 'trip-sihanoukville-seafood',
    emoji: '🏖️',
    titleKh: 'ឆ្នេរ និងគ្រឿងសមុទ្រ ព្រះសីហនុ',
    titleEn: 'Sihanoukville Beach & Seafood',
    titleZh: '西港海滩与海鲜一日游',
    subtitleKh: 'ឆ្នេរ មឹកអាំង និងម្ហូបសមុទ្រ',
    subtitleEn: 'Beaches, grilled squid & coastal dining',
    subtitleZh: '海滩、烤鱿鱼与海岸美食',
    mapHint: 'Sihanoukville Cambodia',
    slots: [
      { slot: 'morning', stops: [{ type: 'destination', id: 'dest-21' }] },
      { slot: 'lunch', stops: [{ type: 'food', id: 'food-23' }, { type: 'restaurant', id: 'rest-46' }] },
      { slot: 'afternoon', stops: [{ type: 'destination', id: 'dest-23' }] },
      { slot: 'dinner', stops: [{ type: 'restaurant', id: 'rest-27' }] },
    ],
  },
];
