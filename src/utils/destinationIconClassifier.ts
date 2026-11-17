import type { TouristDestination } from '../types';

export type DestinationIcon2DKind =
  | 'temple'
  | 'pagoda'
  | 'waterfall'
  | 'cable_car'
  | 'diving_coral'
  | 'beach'
  | 'mountain'
  | 'kayak_river'
  | 'wildlife_eco'
  | 'golf'
  | 'martial_arts'
  | 'water_park'
  | 'horse_riding'
  | 'atv_offroad'
  | 'bamboo_train'
  | 'cycling'
  | 'souvenir_craft'
  | 'agro_farm'
  | 'local_market'
  | 'museum_palace'
  | 'hotel';

export function resolveDestinationIcon2DKind(
  destination?: Partial<TouristDestination> | null,
  fallbackCategorySlug?: string
): DestinationIcon2DKind {
  const slug = String(destination?.categorySlug || fallbackCategorySlug || '').toLowerCase();
  if (slug === 'hotel') return 'hotel';

  const id = String(destination?.id || '').toLowerCase();
  const theme = String(destination?.tourismTheme || '').toLowerCase();
  const text = `${destination?.nameKh || ''} ${destination?.nameEn || ''} ${destination?.categoryKh || ''} ${destination?.categoryEn || ''}`.toLowerCase();

  // 1. Scuba Diving, Snorkeling & Coral Reefs (MUST run before generic beach/sports)
  if (/មុជទឹក|ផ្កាថ្ម|scuba|diving|snorkeling|coral\s*reef/i.test(text)) {
    return 'diving_coral';
  }

  // 2. Golf Courses & Golf Resorts
  if (/វាយកូនហ្គោល|ហ្គោល|\bgolf\b/i.test(text)) {
    return 'golf';
  }

  // 3. Kun Khmer Boxing & Martial Arts
  if (/ប្រដាល់|គុនខ្មែរ|ល្បុក្កតោ|kun\s*khmer|martial\s*art|boxing|bokator/i.test(text)) {
    return 'martial_arts';
  }

  // 4. Water Parks & Wave Pools
  if (/សួនទឹក|water\s*park|wave\s*pool/i.test(text)) {
    return 'water_park';
  }

  // 5. Horseback Riding & Equestrian Farms
  if (/ជិះសេះ|កសិដ្ឋានជិះសេះ|horse\s*farm|horseback|equestrian/i.test(text)) {
    return 'horse_riding';
  }

  // 6. Quad Bike / ATV Off-Road Trails
  if (/ម៉ូតូកង់បួន|quad\s*bike|\batv\b/i.test(text)) {
    return 'atv_offroad';
  }

  // 7. Bamboo Train (Norry) & Rail Rides
  if (/ឡូរី|រថភ្លើងឫស្សី|bamboo\s*train|\bnorry\b/i.test(text)) {
    return 'bamboo_train';
  }

  // 8. Cable Car & Zipline Canopy Rides
  if (/ខ្សែកាប|កន្ត្រក|ខ្សែរ៉ក|cable\s*car|zipline|canopy|sky\s*bridge/i.test(text)) {
    return 'cable_car';
  }

  // 9. Waterfalls & Rapids
  if (
    slug === 'waterfall' ||
    /ទឹកធ្លាក់|ជ្រោះ|ទឹកឈូ|ល្បាក់ទឹក|waterfall|falls\b|rapids|cascade/i.test(text)
  ) {
    return 'waterfall';
  }

  // 10. Wildlife, Dolphins & Eco-Sanctuaries (run before kayak_river so Dolphin Kayaking shows Dolphin)
  if (
    /ផ្សោត|សត្វព្រៃ|ដំរី|សត្វក្រៀល|សត្វត្រយង|អភិរក្សសត្វ|dolphin|wildlife|sanctuary|elephant|crane\s*reserve|stork|bird\s*sanctuary|biosphere|crocodile/i.test(
      text
    )
  ) {
    return 'wildlife_eco';
  }

  // 11. Kayaking, River, Lake, Mangrove & Floating Villages
  if (
    /កាយ៉ាក់|ជិះទូក|ភូមិបណ្ដែតទឹក|បឹង|ទន្លេ|ព្រែក|អាងទឹក|ទឹកពុះ|ព្រៃកោងកាង|kayak|paddleboard|floating\s*village|floating\s*town|crater\s*lake|lake\b|reservoir|riverfront|river\s*cruise|hot\s*spring|wetland|mangrove/i.test(
      text
    )
  ) {
    return 'kayak_river';
  }

  // 12. Dedicated Cycling Trails
  if (/ផ្លូវជិះកង់|ជិះកង់|cycling\s*trail|bike\s*trail/i.test(text)) {
    return 'cycling';
  }

  // 13. Souvenir Markets & Night Bazaars
  if (/ផ្សារ|market|bazaar/i.test(text)) {
    return 'local_market';
  }

  // 14. Agro-Tourism Farms, Pepper, Palm Sugar, Coffee, Winery & Botanical Wellness
  if (
    /ចម្ការម្រេច|ស្ករត្នោត|ចម្ការកាហ្វេ|ទឹកឃ្មុំ|ទំពាំងបាយជូរ|ស្រាផ្លែឈើ|ឱសថស្ថាន|គ្រឿងក្រអូប|កសិដ្ឋានអំបិល|ចម្ការកៅស៊ូ|pepper|palm\s*sugar|coffee\s*plantation|wild\s*honey|vineyard|winery|infused\s*rice\s*wine|sombai|apothecary|senteurs|botanical|salt\s*field|rubber\s*plantation/i.test(
      text
    )
  ) {
    return 'agro_farm';
  }

  // 15. Traditional Khmer Handicrafts (Silk, Silverware, Pottery, Stone/Wood Carving)
  if (
    theme === 'local_souvenirs' ||
    id.startsWith('dest-souv-') ||
    /សិប្បកម្ម|តម្បាញ|សូត្រ|ហូលផាមួង|ស្មូនឆ្នាំង|ចម្លាក់|ត្បូង|artisan|handicraft|silk|weaving|pottery|terracotta|silverware|sculpture|stone\s*carving|gemstone|lapidary/i.test(
      text
    )
  ) {
    return 'souvenir_craft';
  }

  // 16. Beaches, Islands & Coastal Bays
  if (
    slug === 'beach' ||
    /ឆ្នេរ|កោះ|សមុទ្រ|beach|island|\bkoh\s|bay\b/i.test(text)
  ) {
    return 'beach';
  }

  // 17. Buddhist Pagodas, Monasteries & Stupas
  if (
    slug !== 'temple' &&
    /វត្ត|ចេតិយ|ពុទ្ធបដិមា|មហាវិហារ|\bwat\s|pagoda|monastery|stupa|reclining\s*buddha/i.test(text) &&
    !/ប្រាសាទ|prasat|angkor\s*wat/i.test(text)
  ) {
    return 'pagoda';
  }

  // 18. Ancient Khmer Temples
  if (
    slug === 'temple' ||
    /ប្រាសាទ|អង្គរ|បន្ទាយ|សំបូរព្រៃគុក|កោះកេរ|prasat|temple|angkor|banteay|archaeological/i.test(text)
  ) {
    return 'temple';
  }

  // 19. Mountains, Highlands, Caves & Camping Peaks
  if (
    slug === 'mountain' ||
    /ភ្នំ|ជួរភ្នំ|ខ្នងផ្សារ|ខ្នងក្រពើ|ល្អាង|រូងភ្នំ|បោះតង់|mountain|peak|plateau|highland|cliff|cave\b|grotto|trekking|camping/i.test(
      text
    )
  ) {
    return 'mountain';
  }

  // 20. Remaining Sports / Adventure fallback
  if (theme === 'sports_adventure' || id.startsWith('dest-adv-')) {
    return 'cycling';
  }

  // 21. Nature / Ecotourism fallback
  if (slug === 'nature' || slug === 'ecotourism') {
    return 'wildlife_eco';
  }

  // 22. Cultural, Royal Palace, Museums & Historic Landmarks
  return 'museum_palace';
}
