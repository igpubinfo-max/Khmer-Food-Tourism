// Google-Maps-Grade Hybrid Online (OSRM) + Offline (Geometric-Intersection A*) Road Network,
// Real Slippy Map Tile Cache (IndexedDB v3), Road-Snapping & Auto-Rerouting Engine

export type TravelMode = 'driving' | 'cycling' | 'walking';

export interface RoadSegment {
  id: string;
  code?: string;
  nameKh: string;
  nameEn: string;
  tier: 'expressway' | 'national' | 'boulevard' | 'street';
  oneWay?: boolean;
  points: Array<[number, number]>; // [lat, lng]
}

export interface WaterFeature {
  id: string;
  nameKh: string;
  nameEn: string;
  type: 'river' | 'lake' | 'sea';
  widthMeters: number;
  points: Array<[number, number]>;
}

export interface ParkFeature {
  id: string;
  nameKh: string;
  nameEn: string;
  lat: number;
  lng: number;
  radiusDegLat: number;
  radiusDegLng: number;
}

export interface RouteStep {
  instructionKh: string;
  instructionEn: string;
  instructionZh: string;
  roadNameKh: string;
  roadNameEn: string;
  distanceKm: number;
  durationMinutes?: number;
  turnType:
    | 'depart'
    | 'straight'
    | 'right'
    | 'left'
    | 'slight-right'
    | 'slight-left'
    | 'u-turn'
    | 'arrive';
  coord: [number, number];
  bearingDeg?: number;
}

export interface ComputedRoadRoute {
  path: Array<[number, number]>; // [lat, lng] strictly following real road segments
  totalDistanceKm: number;
  estimatedMinutes: number;
  steps: RouteStep[];
  mainRoadsSummaryKh: string;
  mainRoadsSummaryEn: string;
  mainRoadsSummaryZh: string;
  mode?: TravelMode;
  engineSource?: 'osrm-live' | 'osrm-cached' | 'offline-astar';
}

export interface RoadSnapResult {
  snappedLat: number;
  snappedLng: number;
  distanceMeters: number;
  bearingDeg: number;
  roadNameKh: string;
  roadNameEn: string;
  segmentId: string;
}

export interface ActiveRouteSnapStatus {
  snappedLat: number;
  snappedLng: number;
  deviationMeters: number;
  isOffRoute: boolean;
  closestSegmentIndex: number;
  bearingDeg: number;
  remainingDistanceKm: number;
  remainingMinutes: number;
  nextStepIndex: number;
  distanceToNextTurnMeters: number;
}

export const CAMBODIA_WATER_FEATURES: WaterFeature[] = [
  {
    id: 'mekong-river',
    nameKh: 'ទន្លេមេគង្គ',
    nameEn: 'Mekong River',
    type: 'river',
    widthMeters: 1400,
    points: [
      [13.935, 105.955], [13.526, 105.962], [13.120, 106.015], [12.780, 106.010],
      [12.488, 106.012], [12.220, 105.810], [11.993, 105.470], [11.860, 105.280],
      [11.720, 105.050], [11.585, 104.942], [11.558, 104.938], [11.420, 105.040],
      [11.265, 105.278], [11.020, 105.220], [10.900, 105.180],
    ],
  },
  {
    id: 'tonle-sap-river',
    nameKh: 'ទន្លេសាប',
    nameEn: 'Tonle Sap River',
    type: 'river',
    widthMeters: 850,
    points: [
      [12.450, 104.450], [12.255, 104.675], [12.010, 104.760], [11.870, 104.810],
      [11.710, 104.885], [11.615, 104.918], [11.588, 104.928], [11.572, 104.932],
      [11.558, 104.938],
    ],
  },
  {
    id: 'bassac-river',
    nameKh: 'ទន្លេបាសាក់',
    nameEn: 'Bassac River',
    type: 'river',
    widthMeters: 550,
    points: [
      [11.558, 104.938], [11.542, 104.937], [11.529, 104.933], [11.478, 104.952],
      [11.280, 105.040], [11.050, 105.080], [10.920, 105.095],
    ],
  },
];

export const CAMBODIA_PARKS: ParkFeature[] = [
  { id: 'pp-royal-palace', nameKh: 'ព្រះបរមរាជវាំង & សួនមុខវាំង', nameEn: 'Royal Palace & Riverfront Park', lat: 11.5636, lng: 104.9314, radiusDegLat: 0.0045, radiusDegLng: 0.0042 },
  { id: 'pp-wat-phnom', nameKh: 'រមណីយដ្ឋានវត្តភ្នំ', nameEn: 'Wat Phnom Park', lat: 11.5761, lng: 104.9230, radiusDegLat: 0.0032, radiusDegLng: 0.0032 },
  { id: 'pp-indep-monument', nameKh: 'វិមានឯករាជ្យ & សួនច្បារសម្តេចហ៊ុនសែន', nameEn: 'Independence Monument Park', lat: 11.5564, lng: 104.9282, radiusDegLat: 0.0022, radiusDegLng: 0.0065 },
  { id: 'pp-olympic', nameKh: 'ពហុកីឡដ្ឋានជាតិអូឡាំពិក', nameEn: 'Olympic National Stadium', lat: 11.5585, lng: 104.9120, radiusDegLat: 0.0045, radiusDegLng: 0.0048 },
  { id: 'sr-angkor-park', nameKh: 'ឧទ្យានជាតិអង្គរ (Angkor Archaeological Park)', nameEn: 'Angkor Archaeological Park', lat: 13.4125, lng: 103.8670, radiusDegLat: 0.035, radiusDegLng: 0.042 },
  { id: 'pv-indep-park', nameKh: 'សួនច្បារឯករាជ្យ និងមាត់បឹងព្រៃវែង', nameEn: 'Prey Veng Independence Park', lat: 11.4868, lng: 105.3253, radiusDegLat: 0.005, radiusDegLng: 0.005 },
];

export const CAMBODIA_ROAD_SEGMENTS: RoadSegment[] = [
  { id: 'e4-expressway', code: 'E4', nameKh: 'ផ្លូវល្បឿនលឿន ភ្នំពេញ-ព្រះសីហនុ (E4)', nameEn: 'Phnom Penh–Sihanoukville Expressway (E4)', tier: 'expressway', points: [[11.5380, 104.8280], [11.4680, 104.5350], [11.3400, 104.2200], [11.1700, 103.9600], [10.9200, 103.7500], [10.6520, 103.5480], [10.6275, 103.5221]] },
  { id: 'nh-1', code: 'NH1', nameKh: 'ផ្លូវជាតិលេខ ១ (NH1)', nameEn: 'National Road 1 (NH1)', tier: 'national', points: [[11.5335, 104.9315], [11.5295, 104.9335], [11.5220, 104.9580], [11.4750, 105.0350], [11.3650, 105.1650], [11.2635, 105.2805], [11.1850, 105.5200], [11.0879, 105.7993], [11.0732, 106.1665]] },
  { id: 'nh-2', code: 'NH2', nameKh: 'ផ្លូវជាតិលេខ ២ (NH2)', nameEn: 'National Road 2 (NH2)', tier: 'national', points: [[11.5335, 104.9315], [11.5295, 104.9335], [11.4833, 104.9480], [11.3800, 104.9100], [11.2100, 104.8450], [10.9908, 104.7850], [10.7600, 104.8100], [10.6150, 104.8550]] },
  { id: 'nh-3', code: 'NH3', nameKh: 'ផ្លូវជាតិលេខ ៣ (NH3)', nameEn: 'National Road 3 (NH3)', tier: 'national', points: [[11.5240, 104.8320], [11.3500, 104.7200], [11.0800, 104.5800], [10.8200, 104.3900], [10.6100, 104.1800], [10.5942, 104.1640], [10.6600, 103.9600], [10.7080, 103.8160]] },
  { id: 'nh-33', code: 'NH33', nameKh: 'ផ្លូវជាតិលេខ ៣៣ (កំពត → កែប)', nameEn: 'National Road 33 (Kampot – Kep)', tier: 'national', points: [[10.6100, 104.1800], [10.5400, 104.2600], [10.4829, 104.3167], [10.5550, 104.4650]] },
  { id: 'nh-4', code: 'NH4', nameKh: 'ផ្លូវជាតិលេខ ៤ (NH4)', nameEn: 'National Road 4 (NH4)', tier: 'national', points: [[11.5465, 104.8445], [11.5240, 104.8320], [11.4950, 104.7100], [11.4533, 104.5208], [11.3100, 104.2050], [11.1500, 103.9500], [10.8900, 103.8400], [10.7080, 103.8160], [10.6275, 103.5221]] },
  { id: 'nh-48', code: 'NH48', nameKh: 'ផ្លូវជាតិលេខ ៤៨ (ស្រែអំបិល → កោះកុង)', nameEn: 'National Road 48 (Sre Ambel – Koh Kong)', tier: 'national', points: [[11.1500, 103.9500], [11.2800, 103.6500], [11.4500, 103.3200], [11.6153, 102.9838]] },
  { id: 'nh-5', code: 'NH5', nameKh: 'ផ្លូវជាតិលេខ ៥ (NH5)', nameEn: 'National Road 5 (NH5)', tier: 'national', points: [[11.5761, 104.9230], [11.5880, 104.9220], [11.7200, 104.8600], [11.8750, 104.8000], [12.2500, 104.6667], [12.4200, 104.3100], [12.5388, 103.9192], [12.8100, 103.5500], [13.0957, 103.2022], [13.5859, 102.9737], [13.6560, 102.5630]] },
  { id: 'nh-57', code: 'NH57', nameKh: 'ផ្លូវជាតិលេខ ៥៧ (បាត់ដំបង → ប៉ៃលិន)', nameEn: 'National Road 57 (Battambang – Pailin)', tier: 'national', points: [[13.0957, 103.2022], [12.9600, 102.9200], [12.8489, 102.6093]] },
  { id: 'nh-6', code: 'NH6', nameKh: 'ផ្លូវជាតិលេខ ៦ (NH6)', nameEn: 'National Road 6 (NH6)', tier: 'national', points: [[11.5880, 104.9220], [11.5885, 104.9300], [11.7500, 104.9800], [12.0600, 105.0550], [12.3800, 105.0100], [12.7111, 104.8887], [13.0200, 104.4800], [13.1400, 104.2200], [13.2600, 103.9900], [13.3633, 103.8564], [13.4500, 103.4500], [13.5859, 102.9737]] },
  { id: 'nh-62', code: 'NH62', nameKh: 'ផ្លូវជាតិលេខ ៦២ (កំពង់ធំ → ព្រះវិហារ)', nameEn: 'National Road 62 (Kampong Thom – Preah Vihear)', tier: 'national', points: [[12.7111, 104.8887], [13.2500, 104.9300], [13.8073, 104.9805], [14.3800, 104.6800]] },
  { id: 'nh-68', code: 'NH68', nameKh: 'ផ្លូវជាតិលេខ ៦៨ (ក្រឡាញ់ → សំរោង ឧត្តរមានជ័យ)', nameEn: 'National Road 68 (Kralanh – Oddar Meanchey)', tier: 'national', points: [[13.4500, 103.4500], [13.8500, 103.4900], [14.1817, 103.5176]] },
  { id: 'nh-7', code: 'NH7', nameKh: 'ផ្លូវជាតិលេខ ៧ (NH7)', nameEn: 'National Road 7 (NH7)', tier: 'national', points: [[12.0600, 105.0550], [11.9934, 105.4635], [11.8891, 105.6550], [11.8500, 105.9800], [12.0700, 106.4200], [12.4881, 106.0188], [13.0500, 106.0500], [13.5259, 105.9683], [13.9300, 106.0200]] },
  { id: 'nh-76', code: 'NH76', nameKh: 'ផ្លូវជាតិលេខ ៧៦ (ស្នួល → សែនមនោរម្យ មណ្ឌលគិរី)', nameEn: 'National Road 76 (Snuol – Mondulkiri)', tier: 'national', points: [[12.0700, 106.4200], [12.2600, 106.8500], [12.4558, 107.1881], [13.1000, 107.1000], [13.7394, 106.9872]] },
  { id: 'nh-78', code: 'NH78', nameKh: 'ផ្លូវជាតិលេខ ៧៨ (ស្ទឹងត្រែង → បានលុង រតនគិរី)', nameEn: 'National Road 78 (Stung Treng – Ratanakiri)', tier: 'national', points: [[13.5259, 105.9683], [13.6500, 106.4800], [13.7394, 106.9872]] },
  { id: 'nh-8-11', code: 'NH8 / NH11', nameKh: 'ផ្លូវជាតិលេខ ៨ និងលេខ ១១ (ភ្នំពេញ → ព្រៃវែង → កំពង់ចាម)', nameEn: 'National Road 8 & 11 (Prey Veng Corridor)', tier: 'national', points: [[11.5885, 104.9300], [11.5800, 105.1800], [11.4868, 105.3253], [11.2635, 105.2805], [11.4868, 105.3253], [11.7200, 105.4200], [11.9934, 105.4635]] },

  // PHNOM PENH BOULEVARDS
  { id: 'pp-norodom', code: 'Norodom Blvd', nameKh: 'មហាវិថីព្រះនរោត្តម (Preah Norodom Blvd)', nameEn: 'Preah Norodom Blvd (St 41)', tier: 'boulevard', points: [[11.5761, 104.9230], [11.5720, 104.9240], [11.5685, 104.9248], [11.5658, 104.9255], [11.5622, 104.9263], [11.5585, 104.9275], [11.5564, 104.9282], [11.5532, 104.9280], [11.5498, 104.9278], [11.5478, 104.9281], [11.5464, 104.9283], [11.5435, 104.9288], [11.5380, 104.9302], [11.5335, 104.9315]] },
  { id: 'pp-monivong', code: 'Monivong Blvd', nameKh: 'មហាវិថីព្រះមុនីវង្ស (Preah Monivong Blvd)', nameEn: 'Preah Monivong Blvd (St 93)', tier: 'boulevard', points: [[11.5880, 104.9220], [11.5850, 104.9185], [11.5760, 104.9195], [11.5715, 104.9198], [11.5685, 104.9205], [11.5655, 104.9208], [11.5615, 104.9212], [11.5582, 104.9215], [11.5553, 104.9218], [11.5528, 104.9221], [11.5495, 104.9225], [11.5475, 104.9227], [11.5462, 104.9228], [11.5438, 104.9230], [11.5418, 104.9232], [11.5378, 104.9235], [11.5335, 104.9265], [11.5335, 104.9315], [11.5295, 104.9335]] },
  { id: 'pp-sihanouk', code: 'Sihanouk Blvd', nameKh: 'មហាវិថីព្រះសីហនុ (Preah Sihanouk Blvd)', nameEn: 'Preah Sihanouk Blvd (St 274)', tier: 'boulevard', points: [[11.5545, 104.9118], [11.5550, 104.9160], [11.5551, 104.9195], [11.5553, 104.9218], [11.5556, 104.9238], [11.5559, 104.9258], [11.5564, 104.9282], [11.5568, 104.9335], [11.5550, 104.9410]] },
  { id: 'pp-mao-tse-toung', code: 'Mao Tse Toung', nameKh: 'មហាវិថីម៉ៅសេទុង (Mao Tse Toung Blvd - St 245)', nameEn: 'Mao Tse Toung Blvd (St 245)', tier: 'boulevard', points: [[11.5680, 104.8960], [11.5630, 104.8980], [11.5580, 104.9005], [11.5528, 104.9035], [11.5495, 104.9065], [11.5472, 104.9095], [11.5455, 104.9125], [11.5444, 104.9148], [11.5442, 104.9158], [11.5441, 104.9168], [11.5440, 104.9195], [11.5438, 104.9230], [11.5437, 104.9245], [11.5436, 104.9262], [11.5435, 104.9288]] },
  { id: 'pp-russian-blvd', code: 'Russian Blvd', nameKh: 'មហាវិថីសហព័ន្ធរុស្ស៊ី (Russian Confederation Blvd)', nameEn: 'Russian Confederation Blvd (St 110)', tier: 'boulevard', points: [[11.5465, 104.8445], [11.5585, 104.8710], [11.5665, 104.8895], [11.5680, 104.8960], [11.5682, 104.8992], [11.5695, 104.9118], [11.5715, 104.9198], [11.5720, 104.9240]] },
  { id: 'pp-kampuchea-krom', code: 'St 128', nameKh: 'មហាវិថីកម្ពុជាក្រោម (Kampuchea Krom Blvd)', nameEn: 'Kampuchea Krom Blvd (St 128)', tier: 'boulevard', points: [[11.5665, 104.8895], [11.5630, 104.8980], [11.5625, 104.9045], [11.5620, 104.9118], [11.5615, 104.9212], [11.5610, 104.9255]] },
  { id: 'pp-charles-de-gaulle-monireth', code: 'St 217', nameKh: 'មហាវិថីសម្តេចមុនីរ៉េត & ហ្សាលដឺហ្គោល (Samdech Monireth / St 217)', nameEn: 'Samdech Monireth & Charles de Gaulle Blvd (St 217)', tier: 'boulevard', points: [[11.5685, 104.9205], [11.5605, 104.9140], [11.5545, 104.9118], [11.5495, 104.9065], [11.5440, 104.9010], [11.5380, 104.8960], [11.5150, 104.8850]] },
  { id: 'pp-nehru-215', code: 'St 215', nameKh: 'មហាវិថីចាវ៉ាហាឡាលនេរុ (Jawaharlal Nehru Blvd - St 215)', nameEn: 'Jawaharlal Nehru Blvd (St 215)', tier: 'boulevard', points: [[11.5695, 104.9118], [11.5620, 104.9118], [11.5582, 104.9118], [11.5545, 104.9118]] },
  { id: 'pp-tep-phan-182', code: 'St 182', nameKh: 'ផ្លូវឧកញ៉ាទេពផន (Tep Phan St - ផ្លូវលេខ ១៨២)', nameEn: 'Oknha Tep Phan St (Street 182)', tier: 'boulevard', points: [[11.5580, 104.8920], [11.5580, 104.9005], [11.5582, 104.9118], [11.5585, 104.9158], [11.5582, 104.9215]] },
  { id: 'pp-sisowath', code: 'Sisowath', nameKh: 'តីរវិថីព្រះស៊ីសុវត្ថិ (មាត់ទន្លេភ្នំពេញ)', nameEn: 'Sisowath Quay (Riverfront)', tier: 'boulevard', points: [[11.5820, 104.9245], [11.5761, 104.9265], [11.5720, 104.9288], [11.5685, 104.9308], [11.5665, 104.9312], [11.5625, 104.9320], [11.5568, 104.9335]] },
  { id: 'pp-sothearos', code: 'Sothearos', nameKh: 'មហាវិថីសម្តេចសុធារស (Samdech Sothearos Blvd)', nameEn: 'Samdech Sothearos Blvd (St 3)', tier: 'boulevard', points: [[11.5625, 104.9320], [11.5588, 104.9315], [11.5568, 104.9335], [11.5495, 104.9330], [11.5435, 104.9288]] },
  { id: 'pp-hun-sen-blvd', code: '60m Blvd', nameKh: 'មហាវិថីសម្តេចតេជោ ហ៊ុន សែន (ផ្លូវ ៦០ ម៉ែត្រ)', nameEn: 'Samdech Hun Sen Blvd (60m Road)', tier: 'boulevard', points: [[11.5335, 104.9265], [11.5100, 104.9220], [11.4820, 104.9250], [11.4600, 104.9320]] },
  { id: 'pp-st-271', code: 'St 271', nameKh: 'ផ្លូវលេខ ២៧១ (មហាវិថីយោធពលខេមរភូមិន្ទ)', nameEn: 'Street 271 Ring Road', tier: 'boulevard', points: [[11.5665, 104.8895], [11.5580, 104.8920], [11.5440, 104.9010], [11.5355, 104.9095], [11.5345, 104.9148], [11.5345, 104.9158], [11.5345, 104.9167], [11.5340, 104.9195], [11.5335, 104.9265], [11.5335, 104.9315]] },

  // TOUL KORK & BOEUNG KAK 1/2 STREETS (One More Restaurant St 315)
  { id: 'pp-kim-il-sung-289', code: 'St 289', nameKh: 'មហាវិថីគីមអ៊ីលស៊ុង (ផ្លូវលេខ ២៨៩ - ទួលគោក)', nameEn: 'Kim Il Sung Blvd (Street 289 - Toul Kork)', tier: 'boulevard', points: [[11.5682, 104.8992], [11.5725, 104.8992], [11.5768, 104.8992], [11.5800, 104.8992], [11.5838, 104.8992], [11.5865, 104.8992]] },
  { id: 'pp-st-315', code: 'St 315', nameKh: 'ផ្លូវលេខ ៣១៥ (សង្កាត់បឹងកក់ទី១ - ទួលគោក)', nameEn: 'Street 315 (Boeung Kak 1 - Toul Kork)', tier: 'boulevard', points: [[11.5680, 104.8960], [11.5725, 104.8954], [11.5768, 104.8955], [11.58007, 104.89572], [11.5838, 104.8962], [11.5865, 104.8992]] },
  { id: 'pp-st-528', code: 'St 528', nameKh: 'ផ្លូវលេខ ៥២៨ (បឹងកក់ទី១ - ទួលគោក)', nameEn: 'Street 528 (Toul Kork)', tier: 'street', points: [[11.5768, 104.8885], [11.5768, 104.8905], [11.5768, 104.8925], [11.5768, 104.8955], [11.5768, 104.8992], [11.5768, 104.9045]] },
  { id: 'pp-st-566', code: 'St 566', nameKh: 'ផ្លូវលេខ ៥៦៦ (បឹងកក់ទី១ - ទួលគោក)', nameEn: 'Street 566 (Boeung Kak 1 - Toul Kork)', tier: 'street', points: [[11.5800, 104.8885], [11.5800, 104.8905], [11.5800, 104.8925], [11.58007, 104.89572], [11.5800, 104.8992], [11.5800, 104.9050]] },
  { id: 'pp-st-516', code: 'St 516', nameKh: 'ផ្លូវលេខ ៥១៦ (បឹងកក់ទី១ - ទួលគោក)', nameEn: 'Street 516 (Toul Kork)', tier: 'street', points: [[11.5725, 104.8925], [11.5725, 104.8954], [11.5725, 104.8992]] },
  { id: 'pp-st-592', code: 'St 592', nameKh: 'ផ្លូវលេខ ៥៩២ (បឹងកក់ទី២ - ទួលគោក)', nameEn: 'Street 592 (Toul Kork)', tier: 'street', points: [[11.5680, 104.8925], [11.5725, 104.8925], [11.5768, 104.8925], [11.5800, 104.8925], [11.5838, 104.8925]] },
  { id: 'pp-st-598', code: 'St 598', nameKh: 'ផ្លូវលេខ ៥៩៨ (មហាវិថីជាសុផារ៉ា - ទួលគោក)', nameEn: 'Street 598 (Chea Sophara Blvd)', tier: 'boulevard', points: [[11.5665, 104.8895], [11.5768, 104.8885], [11.5800, 104.8885], [11.5838, 104.8885], [11.6020, 104.8860]] },
  { id: 'pp-st-337', code: 'St 337', nameKh: 'ផ្លូវលេខ ៣៣៧ (ទួលគោក)', nameEn: 'Street 337 (Toul Kork)', tier: 'street', points: [[11.5768, 104.8905], [11.5800, 104.8905], [11.5838, 104.8905]] },
  { id: 'pp-st-608-273', code: 'St 273 / St 70', nameKh: 'ផ្លូវលេខ ២៧៣ និងផ្លូវលេខ ៧០ (ទួលគោក → ទួលសង្កែ)', nameEn: 'Street 273 & Street 70 (Toul Kork – Calmette)', tier: 'boulevard', points: [[11.5838, 104.8885], [11.5838, 104.8905], [11.5838, 104.8925], [11.5838, 104.8962], [11.5838, 104.8992], [11.5865, 104.8992], [11.5860, 104.9090], [11.5850, 104.9185]] },

  // CHAMKARMON, TOUL TOM POUNG, BKK 1/2/3 & PHSAR DEOUM KOR STREETS (Rama Steakhouse St 135)
  { id: 'pp-st-135', code: 'St 135', nameKh: 'ផ្លូវលេខ ១៣៥ (ទួលទំពូងទី១ - ខណ្ឌចំការមន)', nameEn: 'Street 135 (Toul Tom Poung - Chamkarmon)', tier: 'street', points: [[11.5441, 104.9168], [11.5418, 104.9168], [11.53984, 104.91676], [11.5378, 104.9167], [11.5345, 104.9167]] },
  { id: 'pp-st-155', code: 'St 155', nameKh: 'ផ្លូវលេខ ១៥៥ (ទួលទំពូងទី១ - ចំការមន)', nameEn: 'Street 155 (Toul Tom Poung)', tier: 'street', points: [[11.5444, 104.9148], [11.5418, 104.9148], [11.5398, 104.9148], [11.5378, 104.9148], [11.5345, 104.9148]] },
  { id: 'pp-st-163', code: 'St 163', nameKh: 'ផ្លូវលេខ ១៦៣ (អូឡាំពិក → ផ្សារទួលទំពូង)', nameEn: 'Street 163 (Olympic – Russian Market)', tier: 'street', points: [[11.5585, 104.9158], [11.5550, 104.9160], [11.5492, 104.9160], [11.5460, 104.9159], [11.5442, 104.9158], [11.5418, 104.9158], [11.5398, 104.9158], [11.5378, 104.9158], [11.5345, 104.9158]] },
  { id: 'pp-st-105', code: 'St 105', nameKh: 'ផ្លូវលេខ ១០៥ (បឹងត្របែក - ចំការមន)', nameEn: 'Street 105 (Boeung Trabek - Chamkarmon)', tier: 'street', points: [[11.5551, 104.9195], [11.5493, 104.9195], [11.5461, 104.9195], [11.5440, 104.9195], [11.5418, 104.9195], [11.5398, 104.9195], [11.5378, 104.9195], [11.5340, 104.9195]] },
  { id: 'pp-st-432', code: 'St 432', nameKh: 'ផ្លូវលេខ ៤៣២ (ទួលទំពូង - បឹងត្របែក)', nameEn: 'Street 432 (Toul Tom Poung)', tier: 'street', points: [[11.5418, 104.9095], [11.5418, 104.9125], [11.5418, 104.9148], [11.5418, 104.9158], [11.5418, 104.9168], [11.5418, 104.9195], [11.5418, 104.9232]] },
  { id: 'pp-st-450', code: 'St 450', nameKh: 'ផ្លូវលេខ ៤៥០ (ជុំវិញផ្សារទួលទំពូង / Russian Market)', nameEn: 'Street 450 (Russian Market Street)', tier: 'street', points: [[11.5398, 104.9125], [11.5398, 104.9148], [11.5398, 104.9158], [11.53984, 104.91676], [11.5398, 104.9195]] },
  { id: 'pp-st-466', code: 'St 466', nameKh: 'ផ្លូវលេខ ៤៦៦ (ទួលទំពូងទី២ - ចំការមន)', nameEn: 'Street 466 (Toul Tom Poung 2)', tier: 'street', points: [[11.5378, 104.9125], [11.5378, 104.9148], [11.5378, 104.9158], [11.5378, 104.9167], [11.5378, 104.9195], [11.5378, 104.9235]] },
  { id: 'pp-st-193', code: 'St 193', nameKh: 'ផ្លូវលេខ ១៩៣ (ទួលស្វាយព្រៃ - ចំការមន)', nameEn: 'Street 193 (Toul Svay Prey)', tier: 'street', points: [[11.5545, 104.9095], [11.5472, 104.9095], [11.5418, 104.9095], [11.5355, 104.9095]] },
  { id: 'pp-st-173', code: 'St 173', nameKh: 'ផ្លូវលេខ ១៧៣ (ទួលស្វាយព្រៃ - ទួលទំពូង)', nameEn: 'Street 173 (Toul Svay Prey)', tier: 'street', points: [[11.5548, 104.9125], [11.5455, 104.9125], [11.5418, 104.9125], [11.5398, 104.9125], [11.5378, 104.9125]] },
  { id: 'pp-st-336-deoumkor', code: 'St 336', nameKh: 'ផ្លូវលេខ ៣៣៦ (ផ្សារដើមគរ / Phsar Deoum Kor)', nameEn: 'Street 336 (Phsar Deoum Kor)', tier: 'street', points: [[11.5528, 104.8980], [11.5528, 104.9035], [11.5528, 104.9095]] },
  { id: 'pp-st-364-374', code: 'St 364 / St 374', nameKh: 'ផ្លូវលេខ ៣៦៤ និង ៣៧៤ (ទួលស្វាយព្រៃ - Intercontinental)', nameEn: 'Street 364 & Street 374 (Toul Svay Prey)', tier: 'street', points: [[11.5495, 104.9065], [11.5482, 104.9095], [11.5468, 104.9125]] },
  { id: 'pp-st-288', code: 'St 288', nameKh: 'ផ្លូវលេខ ២៨៨ (បឹងកេងកង១ / BKK1)', nameEn: 'Street 288 (Boeung Keng Kang 1)', tier: 'street', points: [[11.5492, 104.9160], [11.5493, 104.9195], [11.5495, 104.9225], [11.5496, 104.9242], [11.5497, 104.9260], [11.5498, 104.9278]] },
  { id: 'pp-st-278', code: 'St 278', nameKh: 'ផ្លូវលេខ ២៧៨ (បឹងកេងកង១ / BKK1)', nameEn: 'Street 278 (BKK1)', tier: 'street', points: [[11.5528, 104.9221], [11.5529, 104.9240], [11.5530, 104.9258], [11.5532, 104.9280]] },
  { id: 'pp-st-302', code: 'St 302', nameKh: 'ផ្លូវលេខ ៣០២ (បឹងកេងកង១ / BKK1)', nameEn: 'Street 302 (BKK1)', tier: 'street', points: [[11.5475, 104.9227], [11.5476, 104.9243], [11.5477, 104.9260], [11.5478, 104.9281]] },
  { id: 'pp-st-310', code: 'St 310', nameKh: 'ផ្លូវលេខ ៣១០ (បឹងកេងកង១ / BKK1)', nameEn: 'Street 310 (BKK1)', tier: 'street', points: [[11.5460, 104.9159], [11.5461, 104.9195], [11.5462, 104.9228], [11.5463, 104.9244], [11.5463, 104.9261], [11.5464, 104.9283]] },
  { id: 'pp-st-360', code: 'St 360', nameKh: 'ផ្លូវលេខ ៣៦០ (បឹងកេងកង១/៣)', nameEn: 'Street 360 (BKK1 / BKK3)', tier: 'street', points: [[11.5450, 104.9158], [11.5450, 104.9229], [11.5450, 104.9285]] },
  { id: 'pp-st-51', code: 'St 51', nameKh: 'ផ្លូវលេខ ៥១ (ផ្លូវប៉ាស្ទ័រ / Pasteur St)', nameEn: 'Street 51 (Pasteur St)', tier: 'street', oneWay: true, points: [[11.5685, 104.9235], [11.5656, 104.9242], [11.5621, 104.9250], [11.5584, 104.9255], [11.5559, 104.9258], [11.5530, 104.9258], [11.5497, 104.9260], [11.5477, 104.9260], [11.5463, 104.9261], [11.5436, 104.9262]] },
  { id: 'pp-st-63', code: 'St 63', nameKh: 'ផ្លូវលេខ ៦៣ (ផ្លូវត្រសក់ផ្អែម / Trasak Paem)', nameEn: 'Street 63 (Trasak Paem St)', tier: 'street', points: [[11.5685, 104.9222], [11.5655, 104.9228], [11.5620, 104.9233], [11.5556, 104.9238], [11.5529, 104.9240], [11.5496, 104.9242], [11.5476, 104.9243], [11.5463, 104.9244], [11.5437, 104.9245]] },
  { id: 'pp-st-130', code: 'St 130', nameKh: 'ផ្លូវលេខ ១៣០ (ផ្សារធំថ្មី → មាត់ទន្លេ)', nameEn: 'Street 130 (Central Market – Riverfront)', tier: 'street', points: [[11.5685, 104.9205], [11.5685, 104.9222], [11.5685, 104.9235], [11.5685, 104.9248], [11.5685, 104.9308]] },
  { id: 'pp-st-154', code: 'St 154', nameKh: 'ផ្លូវលេខ ១៥៤ (ផ្សារកណ្តាល → មុនីវង្ស)', nameEn: 'Street 154 (Daun Penh)', tier: 'street', points: [[11.5655, 104.9208], [11.5655, 104.9228], [11.5656, 104.9242], [11.5658, 104.9255], [11.5665, 104.9312]] },
  { id: 'pp-st-178', code: 'St 178', nameKh: 'ផ្លូវលេខ ១៧៨ (សារមន្ទីរជាតិ → មុនីវង្ស)', nameEn: 'Street 178 (National Museum St)', tier: 'street', points: [[11.5618, 104.9212], [11.5620, 104.9233], [11.5621, 104.9250], [11.5622, 104.9263], [11.5625, 104.9320]] },
  { id: 'pp-st-240', code: 'St 240', nameKh: 'ផ្លូវលេខ ២៤០ (ដូនពេញ)', nameEn: 'Street 240 (Boutique Street)', tier: 'street', points: [[11.5582, 104.9215], [11.5584, 104.9255], [11.5585, 104.9275], [11.5588, 104.9315]] },

  // SIEM REAP & PROVINCIAL STREETS
  { id: 'sr-nr6-urban', code: 'NR6 Siem Reap', nameKh: 'ផ្លូវជាតិលេខ ៦ (មហាវិថីកណ្តាលក្រុងសៀមរាប)', nameEn: 'National Road 6 (Siem Reap Urban Corridor)', tier: 'boulevard', points: [[13.3720, 103.8350], [13.3685, 103.8535], [13.3645, 103.8602], [13.3633, 103.8564], [13.3620, 103.8750]] },
  { id: 'sr-sivatha', code: 'Sivatha', nameKh: 'មហាវិថីស៊ីវុទ្ធា (Sivatha Blvd - ក្រុងសៀមរាប)', nameEn: 'Sivatha Blvd (Siem Reap Center)', tier: 'boulevard', points: [[13.3685, 103.8535], [13.3610, 103.8542], [13.3548, 103.8545]] },
  { id: 'sr-charles-de-gaulle', code: 'Angkor Rd', nameKh: 'មហាវិថីហ្សាលដឺហ្គោល (ផ្លូវទៅប្រាសាទអង្គរវត្ត)', nameEn: 'Charles de Gaulle Blvd (Road to Angkor Wat)', tier: 'boulevard', points: [[13.3645, 103.8602], [13.3850, 103.8625], [13.4125, 103.8605]] },
  { id: 'sr-angkor-circuit', code: 'Angkor Circuit', nameKh: 'ផ្លូវវង់តូច និងវង់ធំឧទ្យានអង្គរ', nameEn: 'Angkor Temple Circuit Road', tier: 'street', points: [[13.4125, 103.8605], [13.4412, 103.8588], [13.4450, 103.8760], [13.4348, 103.8892], [13.4125, 103.8880], [13.4125, 103.8605]] },
  { id: 'sr-pub-street', code: 'Pub St', nameKh: 'ផ្លូវ Pub Street & ផ្សារចាស់សៀមរាប', nameEn: 'Pub Street (Street 08) & Old Market', tier: 'street', points: [[13.3548, 103.8532], [13.3548, 103.8545], [13.3545, 103.8558], [13.3542, 103.8582]] },
  { id: 'sr-pokambor', code: 'River Rd', nameKh: 'វិថីពោធិ៍កំបោរ (មាត់ស្ទឹងសៀមរាប)', nameEn: 'Pokambor Ave (Siem Reap Riverfront)', tier: 'street', points: [[13.3645, 103.8602], [13.3610, 103.8595], [13.3542, 103.8582]] },
  { id: 'shv-ekareach', code: 'Ekareach', nameKh: 'វិថីឯករាជ្យ (ក្រុងព្រះសីហនុ)', nameEn: 'Ekareach Blvd (Sihanoukville)', tier: 'boulevard', points: [[10.6275, 103.5221], [10.6220, 103.5240], [10.6080, 103.5320], [10.5850, 103.5550]] },
  { id: 'btb-road-1-3', code: 'St 1 & St 3', nameKh: 'ផ្លូវលេខ ១ & ផ្លូវលេខ ៣ មាត់ស្ទឹងសង្កែ (ក្រុងបាត់ដំបង)', nameEn: 'Street 1 & Street 3 (Sangker Riverfront, Battambang)', tier: 'boulevard', points: [[13.1050, 103.1985], [13.0957, 103.2022], [13.0860, 103.1965]] },
  { id: 'kpt-riverfront', code: 'River Rd', nameKh: 'វិថីមាត់ព្រែកកំពត & រង្វង់មូលធូរេន', nameEn: 'Kampot Riverfront & Durian Roundabout Blvd', tier: 'boulevard', points: [[10.6160, 104.1780], [10.6100, 104.1800], [10.5942, 104.1640]] },
  { id: 'pv-lakeside', code: 'Prey Veng Blvd', nameKh: 'វិថីមាត់បឹងព្រៃវែង & សួនច្បារឯករាជ្យក្រុងព្រៃវែង', nameEn: 'Prey Veng Lakeside & Independence Park Blvd', tier: 'boulevard', points: [[11.4940, 105.3220], [11.4868, 105.3253], [11.4795, 105.3285]] },
];
// ============================================================================
// 3. GEODESIC MATH, BEARING, SEGMENT INTERSECTION & PERPENDICULAR PROJECTION
// ============================================================================
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeBearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = Math.PI / 180;
  const dLng = (lng2 - lng1) * toRad;
  const y = Math.sin(dLng) * Math.cos(lat2 * toRad);
  const x =
    Math.cos(lat1 * toRad) * Math.sin(lat2 * toRad) -
    Math.sin(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function projectPointOntoSegment(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): { lat: number; lng: number; t: number; distKm: number } {
  const cosLat = Math.cos(((aLat + bLat) * 0.5 * Math.PI) / 180);
  const ax = aLng * cosLat;
  const ay = aLat;
  const bx = bLng * cosLat;
  const by = bLat;
  const px = pLng * cosLat;
  const py = pLat;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if (lenSq > 1e-14) {
    t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  }
  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);
  return {
    lat: Number(projLat.toFixed(6)),
    lng: Number(projLng.toFixed(6)),
    t,
    distKm: haversineKm(pLat, pLng, projLat, projLng),
  };
}

function computeLineSegmentIntersection(
  a1: [number, number],
  a2: [number, number],
  b1: [number, number],
  b2: [number, number]
): { lat: number; lng: number; tA: number; tB: number } | null {
  const y1 = a1[0], x1 = a1[1];
  const y2 = a2[0], x2 = a2[1];
  const y3 = b1[0], x3 = b1[1];
  const y4 = b2[0], x4 = b2[1];

  const denom = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (Math.abs(denom) < 1e-12) return null;

  const tA = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / denom;
  const tB = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / denom;

  if (tA >= -0.002 && tA <= 1.002 && tB >= -0.002 && tB <= 1.002) {
    const clampedTa = Math.max(0, Math.min(1, tA));
    const lat = Number((y1 + clampedTa * (y2 - y1)).toFixed(6));
    const lng = Number((x1 + clampedTa * (x2 - x1)).toFixed(6));
    return { lat, lng, tA: clampedTa, tB: Math.max(0, Math.min(1, tB)) };
  }
  return null;
}

export function extractStreetCodeFromAddress(addressKh?: string): string | null {
  if (!addressKh) return null;
  const khToAscii = addressKh.replace(/[០-៩]/g, (d) => String(d.charCodeAt(0) - 0x17e0));
  const stMatch = khToAscii.match(/(?:st(?:reet)?\.?|ផ្លូវ(?:លេខ)?)\s*([0-9]{1,4}[A-Za-z]?)/i);
  return stMatch ? stMatch[1].toUpperCase() : null;
}

export function snapCoordinateToNearestRoad(
  lat: number,
  lng: number,
  preferredStreetCode?: string | null
): RoadSnapResult {
  let best: RoadSnapResult = {
    snappedLat: lat,
    snappedLng: lng,
    distanceMeters: Infinity,
    bearingDeg: 0,
    roadNameKh: 'ផ្លូវក្នុងក្រុង',
    roadNameEn: 'City Street',
    segmentId: 'none',
  };

  for (const seg of CAMBODIA_ROAD_SEGMENTS) {
    const matchesPreferred =
      preferredStreetCode &&
      ((seg.code && seg.code.toUpperCase().includes(preferredStreetCode)) ||
        seg.nameEn.toUpperCase().includes(`STREET ${preferredStreetCode}`) ||
        seg.nameEn.toUpperCase().includes(`ST ${preferredStreetCode}`));

    for (let i = 0; i < seg.points.length - 1; i++) {
      const [aLat, aLng] = seg.points[i];
      const [bLat, bLng] = seg.points[i + 1];
      const proj = projectPointOntoSegment(lat, lng, aLat, aLng, bLat, bLng);
      const distMeters = proj.distKm * 1000;
      const effectiveDist = matchesPreferred && distMeters < 800 ? distMeters * 0.25 : distMeters;
      if (effectiveDist < best.distanceMeters) {
        best = {
          snappedLat: proj.lat,
          snappedLng: proj.lng,
          distanceMeters: Math.round(distMeters),
          bearingDeg: Math.round(computeBearingDeg(aLat, aLng, bLat, bLng)),
          roadNameKh: seg.nameKh,
          roadNameEn: seg.nameEn,
          segmentId: seg.id,
        };
      }
    }
  }
  return best;
}

export function generateLocalStreetSegmentsAroundPin(
  lat: number,
  lng: number,
  addressKh?: string,
  nameKh?: string
): RoadSegment[] {
  const stCode = extractStreetCodeFromAddress(addressKh);
  const nearbyReal = CAMBODIA_ROAD_SEGMENTS.filter((seg) =>
    seg.points.some(([pLat, pLng]) => haversineKm(lat, lng, pLat, pLng) <= 3.5)
  );

  const results: RoadSegment[] = [...nearbyReal];
  const snap = snapCoordinateToNearestRoad(lat, lng, stCode);

  const streetNameKh = stCode
    ? `ផ្លូវលេខ ${stCode}${nameKh ? ` (${nameKh})` : ''}`
    : addressKh && addressKh.trim().length <= 42
    ? addressKh.trim()
    : snap.roadNameKh;
  const streetNameEn = stCode
    ? `Street ${stCode}${nameKh ? ` (${nameKh})` : ''}`
    : snap.roadNameEn;

  if (snap.distanceMeters > 15 && snap.distanceMeters < 2500) {
    results.push({
      id: `real-access-${lat.toFixed(4)}-${lng.toFixed(4)}`,
      code: stCode ? `St ${stCode}` : undefined,
      nameKh: streetNameKh,
      nameEn: streetNameEn,
      tier: 'street',
      points: [
        [snap.snappedLat, snap.snappedLng],
        [lat, lng],
      ],
    });
  } else if (stCode && !results.some((s) => (s.code || '').includes(stCode) || s.nameEn.includes(stCode))) {
    results.push({
      id: `real-st-${stCode}-${lat.toFixed(4)}`,
      code: `St ${stCode}`,
      nameKh: streetNameKh,
      nameEn: streetNameEn,
      tier: 'street',
      points: [
        [snap.snappedLat, snap.snappedLng],
        [lat, lng],
      ],
    });
  }

  while (results.length < 10) {
    const extra = CAMBODIA_ROAD_SEGMENTS[results.length % CAMBODIA_ROAD_SEGMENTS.length];
    if (extra) results.push(extra);
    else break;
  }

  return results;
}

interface GraphNode {
  id: string;
  lat: number;
  lng: number;
  edges: Array<{
    to: string;
    distKm: number;
    weightKm: number;
    roadNameKh: string;
    roadNameEn: string;
    tier: RoadSegment['tier'];
  }>;
}

function getTierWeightMultiplier(tier: RoadSegment['tier'], mode: TravelMode): number {
  if (mode === 'walking') {
    if (tier === 'expressway') return 8.0;
    if (tier === 'street') return 0.92;
    if (tier === 'boulevard') return 0.96;
    return 1.05;
  }
  if (mode === 'cycling') {
    if (tier === 'expressway') return 6.0;
    if (tier === 'street') return 0.88;
    if (tier === 'boulevard') return 0.92;
    return 1.1;
  }
  if (tier === 'expressway') return 0.68;
  if (tier === 'national') return 0.78;
  if (tier === 'boulevard') return 0.86;
  return 1.0;
}

interface PrecomputedSubSeg {
  segIndex: number;
  a: [number, number];
  b: [number, number];
  splits: number[];
}

let cachedStaticSubSegs: PrecomputedSubSeg[] | null = null;

function getPrecomputedSubSegs(segments: RoadSegment[]): PrecomputedSubSeg[] {
  if (segments === CAMBODIA_ROAD_SEGMENTS && cachedStaticSubSegs) {
    return cachedStaticSubSegs.map((s) => ({
      segIndex: s.segIndex,
      a: s.a,
      b: s.b,
      splits: s.splits.slice(),
    }));
  }
  const subSegs: PrecomputedSubSeg[] = [];
  segments.forEach((seg, segIndex) => {
    for (let i = 0; i < seg.points.length - 1; i++) {
      subSegs.push({
        segIndex,
        a: seg.points[i],
        b: seg.points[i + 1],
        splits: [0, 1],
      });
    }
  });

  for (let i = 0; i < subSegs.length; i++) {
    const s1 = subSegs[i];
    const minLat1 = Math.min(s1.a[0], s1.b[0]) - 0.0005;
    const maxLat1 = Math.max(s1.a[0], s1.b[0]) + 0.0005;
    const minLng1 = Math.min(s1.a[1], s1.b[1]) - 0.0005;
    const maxLng1 = Math.max(s1.a[1], s1.b[1]) + 0.0005;

    for (let j = i + 1; j < subSegs.length; j++) {
      const s2 = subSegs[j];
      if (
        Math.max(s2.a[0], s2.b[0]) < minLat1 ||
        Math.min(s2.a[0], s2.b[0]) > maxLat1 ||
        Math.max(s2.a[1], s2.b[1]) < minLng1 ||
        Math.min(s2.a[1], s2.b[1]) > maxLng1
      ) {
        continue;
      }
      const hit = computeLineSegmentIntersection(s1.a, s1.b, s2.a, s2.b);
      if (hit) {
        s1.splits.push(hit.tA);
        s2.splits.push(hit.tB);
      }
    }
  }

  if (segments === CAMBODIA_ROAD_SEGMENTS) {
    cachedStaticSubSegs = subSegs.map((s) => ({
      segIndex: s.segIndex,
      a: s.a,
      b: s.b,
      splits: s.splits.slice(),
    }));
  }
  return subSegs;
}

function buildTrueIntersectionRoadGraph(
  segments: RoadSegment[],
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  endAddressKh: string | undefined,
  mode: TravelMode
): { nodes: Map<string, GraphNode>; startNodeId: string; endNodeId: string } {
  const subSegs = getPrecomputedSubSegs(segments);

  const endStreetCode = extractStreetCodeFromAddress(endAddressKh);
  let bestStartIdx = 0;
  let bestStartProj = { lat: startLat, lng: startLng, t: 0, distKm: Infinity };
  let bestEndIdx = 0;
  let bestEndProj = { lat: endLat, lng: endLng, t: 0, distKm: Infinity };
  let bestEndWeightedDist = Infinity;

  subSegs.forEach((ss, idx) => {
    const seg = segments[ss.segIndex];
    if (mode !== 'driving' && seg.tier === 'expressway') return;

    const pStart = projectPointOntoSegment(startLat, startLng, ss.a[0], ss.a[1], ss.b[0], ss.b[1]);
    if (pStart.distKm < bestStartProj.distKm) {
      bestStartProj = pStart;
      bestStartIdx = idx;
    }

    const pEnd = projectPointOntoSegment(endLat, endLng, ss.a[0], ss.a[1], ss.b[0], ss.b[1]);
    const matchesEndCode =
      endStreetCode &&
      ((seg.code && seg.code.toUpperCase().includes(endStreetCode)) ||
        seg.nameEn.toUpperCase().includes(`STREET ${endStreetCode}`) ||
        seg.nameEn.toUpperCase().includes(`ST ${endStreetCode}`));
    const weightedEndDist = matchesEndCode && pEnd.distKm < 0.8 ? pEnd.distKm * 0.2 : pEnd.distKm;
    if (weightedEndDist < bestEndWeightedDist) {
      bestEndWeightedDist = weightedEndDist;
      bestEndProj = pEnd;
      bestEndIdx = idx;
    }
  });

  if (subSegs[bestStartIdx]) subSegs[bestStartIdx].splits.push(bestStartProj.t);
  if (subSegs[bestEndIdx]) subSegs[bestEndIdx].splits.push(bestEndProj.t);

  const nodes = new Map<string, GraphNode>();
  const keyFor = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

  const getOrCreateNode = (lat: number, lng: number): GraphNode => {
    const k = keyFor(lat, lng);
    let n = nodes.get(k);
    if (!n) {
      n = { id: k, lat, lng, edges: [] };
      nodes.set(k, n);
    }
    return n;
  };

  for (const ss of subSegs) {
    const seg = segments[ss.segIndex];
    const sortedT = Array.from(new Set(ss.splits.map((t) => Number(t.toFixed(6))))).sort((a, b) => a - b);
    const mult = getTierWeightMultiplier(seg.tier, mode);

    for (let k = 0; k < sortedT.length - 1; k++) {
      const t1 = sortedT[k];
      const t2 = sortedT[k + 1];
      if (t2 - t1 < 1e-6) continue;
      const lat1 = ss.a[0] + t1 * (ss.b[0] - ss.a[0]);
      const lng1 = ss.a[1] + t1 * (ss.b[1] - ss.a[1]);
      const lat2 = ss.a[0] + t2 * (ss.b[0] - ss.a[0]);
      const lng2 = ss.a[1] + t2 * (ss.b[1] - ss.a[1]);

      const n1 = getOrCreateNode(lat1, lng1);
      const n2 = getOrCreateNode(lat2, lng2);
      if (n1.id === n2.id) continue;

      const distKm = Math.max(0.005, haversineKm(n1.lat, n1.lng, n2.lat, n2.lng));
      const weightKm = distKm * mult;

      n1.edges.push({
        to: n2.id,
        distKm,
        weightKm,
        roadNameKh: seg.nameKh,
        roadNameEn: seg.nameEn,
        tier: seg.tier,
      });
      n2.edges.push({
        to: n1.id,
        distKm,
        weightKm,
        roadNameKh: seg.nameKh,
        roadNameEn: seg.nameEn,
        tier: seg.tier,
      });
    }
  }

  const allNodes = Array.from(nodes.values());
  for (let i = 0; i < allNodes.length; i++) {
    const a = allNodes[i];
    for (let j = i + 1; j < allNodes.length; j++) {
      const b = allNodes[j];
      if (Math.abs(a.lat - b.lat) > 0.00045 || Math.abs(a.lng - b.lng) > 0.00045) continue;
      const dKm = haversineKm(a.lat, a.lng, b.lat, b.lng);
      if (dKm <= 0.045) {
        const roadKh = a.edges[0]?.roadNameKh || b.edges[0]?.roadNameKh || 'ផ្លូវតភ្ជាប់';
        const roadEn = a.edges[0]?.roadNameEn || b.edges[0]?.roadNameEn || 'Junction';
        a.edges.push({ to: b.id, distKm: dKm, weightKm: dKm, roadNameKh: roadKh, roadNameEn: roadEn, tier: 'street' });
        b.edges.push({ to: a.id, distKm: dKm, weightKm: dKm, roadNameKh: roadKh, roadNameEn: roadEn, tier: 'street' });
      }
    }
  }

  const snappedStartNode = getOrCreateNode(bestStartProj.lat, bestStartProj.lng);
  const snappedEndNode = getOrCreateNode(bestEndProj.lat, bestEndProj.lng);

  const startRoadSeg = segments[subSegs[bestStartIdx]?.segIndex ?? 0];
  const endRoadSeg = segments[subSegs[bestEndIdx]?.segIndex ?? 0];

  const startOriginNode = getOrCreateNode(startLat, startLng);
  if (startOriginNode.id !== snappedStartNode.id) {
    const dKm = Math.max(0.005, haversineKm(startLat, startLng, snappedStartNode.lat, snappedStartNode.lng));
    startOriginNode.edges.push({
      to: snappedStartNode.id,
      distKm: dKm,
      weightKm: dKm,
      roadNameKh: startRoadSeg?.nameKh || 'ផ្លូវចេញដំណើរ',
      roadNameEn: startRoadSeg?.nameEn || 'Departure Street',
      tier: 'street',
    });
    snappedStartNode.edges.push({
      to: startOriginNode.id,
      distKm: dKm,
      weightKm: dKm,
      roadNameKh: startRoadSeg?.nameKh || 'ផ្លូវចេញដំណើរ',
      roadNameEn: startRoadSeg?.nameEn || 'Departure Street',
      tier: 'street',
    });
  }

  const endDestNode = getOrCreateNode(endLat, endLng);
  if (endDestNode.id !== snappedEndNode.id) {
    const dKm = Math.max(0.005, haversineKm(endLat, endLng, snappedEndNode.lat, snappedEndNode.lng));
    const destRoadKh = endStreetCode ? `ផ្លូវលេខ ${endStreetCode}` : endRoadSeg?.nameKh || 'ផ្លូវគោលដៅ';
    const destRoadEn = endStreetCode ? `Street ${endStreetCode}` : endRoadSeg?.nameEn || 'Destination Street';
    snappedEndNode.edges.push({
      to: endDestNode.id,
      distKm: dKm,
      weightKm: dKm,
      roadNameKh: destRoadKh,
      roadNameEn: destRoadEn,
      tier: 'street',
    });
    endDestNode.edges.push({
      to: snappedEndNode.id,
      distKm: dKm,
      weightKm: dKm,
      roadNameKh: destRoadKh,
      roadNameEn: destRoadEn,
      tier: 'street',
    });
  }

  return {
    nodes,
    startNodeId: startOriginNode.id,
    endNodeId: endDestNode.id,
  };
}
function classifyTurnAngle(prevBearing: number, nextBearing: number): RouteStep['turnType'] {
  const diff = ((nextBearing - prevBearing + 540) % 360) - 180;
  if (Math.abs(diff) < 22) return 'straight';
  if (diff >= 22 && diff < 55) return 'slight-right';
  if (diff >= 55 && diff <= 155) return 'right';
  if (diff <= -22 && diff > -55) return 'slight-left';
  if (diff <= -55 && diff >= -155) return 'left';
  return 'u-turn';
}

function buildStepInstruction(
  turnType: RouteStep['turnType'],
  roadNameKh: string,
  roadNameEn: string
): { kh: string; en: string; zh: string } {
  switch (turnType) {
    case 'depart':
      return {
        kh: `ចេញដំណើរតាម ${roadNameKh}`,
        en: `Head along ${roadNameEn}`,
        zh: `沿 ${roadNameEn} 出发`,
      };
    case 'right':
      return {
        kh: `បត់ស្តាំចូលតាម ${roadNameKh}`,
        en: `Turn right onto ${roadNameEn}`,
        zh: `右转进入 ${roadNameEn}`,
      };
    case 'slight-right':
      return {
        kh: `បត់ស្តាំបន្តិចចូលតាម ${roadNameKh}`,
        en: `Keep right onto ${roadNameEn}`,
        zh: `靠右进入 ${roadNameEn}`,
      };
    case 'left':
      return {
        kh: `បត់ឆ្វេងចូលតាម ${roadNameKh}`,
        en: `Turn left onto ${roadNameEn}`,
        zh: `左转进入 ${roadNameEn}`,
      };
    case 'slight-left':
      return {
        kh: `បត់ឆ្វេងបន្តិចចូលតាម ${roadNameKh}`,
        en: `Keep left onto ${roadNameEn}`,
        zh: `靠左进入 ${roadNameEn}`,
      };
    case 'u-turn':
      return {
        kh: `បត់ត្រឡប់ក្រោយតាម ${roadNameKh}`,
        en: `Make a U-turn onto ${roadNameEn}`,
        zh: `掉头进入 ${roadNameEn}`,
      };
    default:
      return {
        kh: `បន្តទៅត្រង់តាម ${roadNameKh}`,
        en: `Continue straight on ${roadNameEn}`,
        zh: `沿 ${roadNameEn} 继续直行`,
      };
  }
}

export function computeModeTravelMinutes(totalKm: number, mode: TravelMode): number {
  if (mode === 'walking') {
    return Math.max(1, Math.round((totalKm / 4.8) * 60));
  }
  if (mode === 'cycling') {
    return Math.max(1, Math.round((totalKm / 16.0) * 60));
  }
  const avgSpeedKmh = totalKm < 10 ? 26 : totalKm < 45 ? 42 : 58;
  return Math.max(1, Math.round((totalKm / avgSpeedKmh) * 60));
}

const inMemoryOfflineRouteCache = new Map<string, ComputedRoadRoute>();

export function computeOfflineRoadRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  targetNameKh: string,
  targetNameEn: string,
  targetAddressKh?: string,
  mode: TravelMode = 'driving'
): ComputedRoadRoute {
  const memoKey = `${mode}:${startLat.toFixed(4)},${startLng.toFixed(4)}->${endLat.toFixed(4)},${endLng.toFixed(4)}:${targetAddressKh || ''}:${targetNameKh}:${targetNameEn}`;
  const cachedMemo = inMemoryOfflineRouteCache.get(memoKey);
  if (cachedMemo) return cachedMemo;

  const { nodes, startNodeId, endNodeId } = buildTrueIntersectionRoadGraph(
    CAMBODIA_ROAD_SEGMENTS,
    startLat,
    startLng,
    endLat,
    endLng,
    targetAddressKh,
    mode
  );

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const cameFrom = new Map<
    string,
    { prevId: string; roadNameKh: string; roadNameEn: string; segKm: number }
  >();
  const openSet = new Set<string>([startNodeId]);

  gScore.set(startNodeId, 0);
  fScore.set(startNodeId, haversineKm(startLat, startLng, endLat, endLng));

  while (openSet.size > 0) {
    let currentId = '';
    let bestF = Infinity;
    for (const id of openSet) {
      const f = fScore.get(id) ?? Infinity;
      if (f < bestF) {
        bestF = f;
        currentId = id;
      }
    }

    if (!currentId || currentId === endNodeId) break;
    openSet.delete(currentId);

    const current = nodes.get(currentId);
    if (!current) continue;

    for (const edge of current.edges) {
      const tentativeG = (gScore.get(currentId) ?? Infinity) + edge.weightKm;
      if (tentativeG < (gScore.get(edge.to) ?? Infinity)) {
        const neighbor = nodes.get(edge.to);
        if (!neighbor) continue;
        cameFrom.set(edge.to, {
          prevId: currentId,
          roadNameKh: edge.roadNameKh,
          roadNameEn: edge.roadNameEn,
          segKm: edge.distKm,
        });
        gScore.set(edge.to, tentativeG);
        fScore.set(
          edge.to,
          tentativeG + haversineKm(neighbor.lat, neighbor.lng, endLat, endLng) * 0.65
        );
        openSet.add(edge.to);
      }
    }
  }

  const rawPath: Array<[number, number]> = [];
  const rawEdges: Array<{
    fromCoord: [number, number];
    toCoord: [number, number];
    roadNameKh: string;
    roadNameEn: string;
    segKm: number;
    bearingDeg: number;
  }> = [];

  let curr = endNodeId;
  while (curr) {
    const n = nodes.get(curr);
    if (n) rawPath.unshift([n.lat, n.lng]);
    const prev = cameFrom.get(curr);
    if (!prev) break;
    const pNode = nodes.get(prev.prevId);
    if (n && pNode) {
      rawEdges.unshift({
        fromCoord: [pNode.lat, pNode.lng],
        toCoord: [n.lat, n.lng],
        roadNameKh: prev.roadNameKh,
        roadNameEn: prev.roadNameEn,
        segKm: prev.segKm,
        bearingDeg: computeBearingDeg(pNode.lat, pNode.lng, n.lat, n.lng),
      });
    }
    curr = prev.prevId;
  }

  if (rawPath.length < 2) {
    const midLat = Number(((startLat + endLat) / 2).toFixed(6));
    rawPath.splice(
      0,
      rawPath.length,
      [startLat, startLng],
      [midLat, startLng],
      [midLat, endLng],
      [endLat, endLng]
    );
  }

  const mergedSteps: RouteStep[] = [];
  let prevEdgeBearing: number | null = null;

  for (const edge of rawEdges) {
    const last = mergedSteps[mergedSteps.length - 1];
    if (last && last.roadNameKh === edge.roadNameKh) {
      last.distanceKm = Number((last.distanceKm + edge.segKm).toFixed(2));
      prevEdgeBearing = edge.bearingDeg;
    } else {
      const isFirst = mergedSteps.length === 0;
      const turnType: RouteStep['turnType'] = isFirst
        ? 'depart'
        : prevEdgeBearing !== null
        ? classifyTurnAngle(prevEdgeBearing, edge.bearingDeg)
        : 'straight';

      const instr = buildStepInstruction(turnType, edge.roadNameKh, edge.roadNameEn);
      mergedSteps.push({
        instructionKh: instr.kh,
        instructionEn: instr.en,
        instructionZh: instr.zh,
        roadNameKh: edge.roadNameKh,
        roadNameEn: edge.roadNameEn,
        distanceKm: Number(Math.max(0.02, edge.segKm).toFixed(2)),
        turnType,
        coord: edge.fromCoord,
        bearingDeg: Math.round(edge.bearingDeg),
      });
      prevEdgeBearing = edge.bearingDeg;
    }
  }

  mergedSteps.push({
    instructionKh: `មកដល់គោលដៅ៖ ${targetNameKh}`,
    instructionEn: `Arrive at destination: ${targetNameEn}`,
    instructionZh: `到达目的地：${targetNameEn}`,
    roadNameKh: targetAddressKh || targetNameKh,
    roadNameEn: targetAddressKh || targetNameEn,
    distanceKm: 0,
    turnType: 'arrive',
    coord: [endLat, endLng],
  });

  let totalKm = 0;
  for (let i = 0; i < rawPath.length - 1; i++) {
    totalKm += haversineKm(rawPath[i][0], rawPath[i][1], rawPath[i + 1][0], rawPath[i + 1][1]);
  }
  totalKm = Number(Math.max(0.1, totalKm).toFixed(2));
  const estMinutes = computeModeTravelMinutes(totalKm, mode);

  const uniqueRoadNamesKh = Array.from(
    new Set(
      mergedSteps
        .filter((s) => s.turnType !== 'arrive')
        .map((s) => s.roadNameKh)
        .filter((n) => n && !n.includes('ផ្លូវតភ្ជាប់'))
    )
  ).slice(0, 4);

  const uniqueRoadNamesEn = Array.from(
    new Set(
      mergedSteps
        .filter((s) => s.turnType !== 'arrive')
        .map((s) => s.roadNameEn)
        .filter((n) => n && !n.includes('Junction'))
    )
  ).slice(0, 4);

  const finalResult: ComputedRoadRoute = {
    path: rawPath,
    totalDistanceKm: Number(totalKm.toFixed(1)),
    estimatedMinutes: estMinutes,
    steps: mergedSteps,
    mainRoadsSummaryKh: uniqueRoadNamesKh.join(' → ') || 'ផ្លូវជាតិ និងមហាវិថីសំខាន់ៗ',
    mainRoadsSummaryEn: uniqueRoadNamesEn.join(' → ') || 'Major National Roads & Boulevards',
    mainRoadsSummaryZh: uniqueRoadNamesEn.join(' → ') || '主要国道与市区大道',
    mode,
    engineSource: 'offline-astar',
  };
  if (inMemoryOfflineRouteCache.size >= 48) {
    const oldestKey = inMemoryOfflineRouteCache.keys().next().value;
    if (oldestKey) inMemoryOfflineRouteCache.delete(oldestKey);
  }
  inMemoryOfflineRouteCache.set(memoKey, finalResult);
  return finalResult;
}

export function snapUserGpsToActiveRoute(
  userLat: number,
  userLng: number,
  route: ComputedRoadRoute
): ActiveRouteSnapStatus {
  const pts = route.path;
  if (!pts || pts.length < 2) {
    return {
      snappedLat: userLat,
      snappedLng: userLng,
      deviationMeters: 0,
      isOffRoute: false,
      closestSegmentIndex: 0,
      bearingDeg: 0,
      remainingDistanceKm: route?.totalDistanceKm || 0,
      remainingMinutes: route?.estimatedMinutes || 1,
      nextStepIndex: 0,
      distanceToNextTurnMeters: 0,
    };
  }

  let bestSegIdx = 0;
  let bestProj = { lat: userLat, lng: userLng, t: 0, distKm: Infinity };

  for (let i = 0; i < pts.length - 1; i++) {
    const proj = projectPointOntoSegment(
      userLat,
      userLng,
      pts[i][0],
      pts[i][1],
      pts[i + 1][0],
      pts[i + 1][1]
    );
    if (proj.distKm < bestProj.distKm) {
      bestProj = proj;
      bestSegIdx = i;
    }
  }

  const deviationMeters = Math.round(bestProj.distKm * 1000);
  const shouldSnap = deviationMeters <= 32;
  const snappedLat = shouldSnap ? bestProj.lat : userLat;
  const snappedLng = shouldSnap ? bestProj.lng : userLng;
  const isOffRoute = deviationMeters > 65;

  const segStart = pts[bestSegIdx];
  const segEnd = pts[bestSegIdx + 1];
  const bearingDeg = Math.round(computeBearingDeg(segStart[0], segStart[1], segEnd[0], segEnd[1]));

  let remKm = haversineKm(snappedLat, snappedLng, segEnd[0], segEnd[1]);
  for (let i = bestSegIdx + 1; i < pts.length - 1; i++) {
    remKm += haversineKm(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
  }
  remKm = Number(Math.max(0, remKm).toFixed(2));
  const remMinutes = computeModeTravelMinutes(remKm, route.mode || 'driving');

  let nextStepIndex = 0;
  let minStepDist = Infinity;
  for (let i = 0; i < route.steps.length; i++) {
    const st = route.steps[i];
    const d = haversineKm(snappedLat, snappedLng, st.coord[0], st.coord[1]);
    if (d < minStepDist) {
      minStepDist = d;
      nextStepIndex = Math.min(route.steps.length - 1, i + 1);
    }
  }
  const nextStep = route.steps[nextStepIndex] || route.steps[route.steps.length - 1];
  const distanceToNextTurnMeters = nextStep
    ? Math.round(haversineKm(snappedLat, snappedLng, nextStep.coord[0], nextStep.coord[1]) * 1000)
    : 0;

  return {
    snappedLat,
    snappedLng,
    deviationMeters,
    isOffRoute,
    closestSegmentIndex: bestSegIdx,
    bearingDeg,
    remainingDistanceKm: Number(remKm.toFixed(1)),
    remainingMinutes: remMinutes,
    nextStepIndex,
    distanceToNextTurnMeters,
  };
}

const LEGACY_POISONED_DBS = ['kft_offline_map_tiles_v1', 'kft_real_map_system_v3'];
const DB_NAME = 'kft_real_map_system_v4';
const STORE_TILES = 'tiles';
const STORE_META = 'packs';
const STORE_ROUTES = 'routes';

let legacyPurged = false;
function purgeLegacyPoisonedTileDb(): void {
  if (legacyPurged || typeof indexedDB === 'undefined') return;
  legacyPurged = true;
  for (const oldDb of LEGACY_POISONED_DBS) {
    try {
      indexedDB.deleteDatabase(oldDb);
    } catch {
      /* ignore */
    }
  }
}

let cachedTileDbPromise: Promise<IDBDatabase | null> | null = null;

function openTileDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  purgeLegacyPoisonedTileDb();
  if (cachedTileDbPromise) return cachedTileDbPromise;
  cachedTileDbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_TILES)) {
          db.createObjectStore(STORE_TILES);
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META);
        }
        if (!db.objectStoreNames.contains(STORE_ROUTES)) {
          db.createObjectStore(STORE_ROUTES);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onclose = () => {
          cachedTileDbPromise = null;
        };
        db.onversionchange = () => {
          db.close();
          cachedTileDbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        cachedTileDbPromise = null;
        resolve(null);
      };
    } catch {
      cachedTileDbPromise = null;
      resolve(null);
    }
  });
  return cachedTileDbPromise;
}

export async function getCachedTileBlobUrl(
  z: number,
  x: number,
  y: number,
  theme: 'day' | 'dark' = 'dark'
): Promise<string | null> {
  const db = await openTileDb();
  if (!db) return null;
  const key = `gmap/${z}/${x}/${y}`;
  const fallbackKey = `${theme}/${z}/${x}/${y}`;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_TILES, 'readonly');
      const store = tx.objectStore(STORE_TILES);
      const req = store.get(key);
      req.onsuccess = () => {
        const val = req.result;
        if (val instanceof Blob) {
          resolve(URL.createObjectURL(val));
          return;
        }
        const req2 = store.get(fallbackKey);
        req2.onsuccess = () => {
          const val2 = req2.result;
          if (val2 instanceof Blob) {
            resolve(URL.createObjectURL(val2));
          } else {
            resolve(null);
          }
        };
        req2.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveTileBlob(
  z: number,
  x: number,
  y: number,
  data: Blob,
  _theme: 'day' | 'dark' = 'day'
): Promise<void> {
  if (!(data instanceof Blob) || data.size < 4500) return; // Reject tiny error/watermark tiles
  const db = await openTileDb();
  if (!db) return;
  const key = `gmap/${z}/${x}/${y}`;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_TILES, 'readwrite');
      tx.objectStore(STORE_TILES).put(data, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function makeRouteCacheKey(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  mode: TravelMode
): string {
  return `${mode}:${startLat.toFixed(4)},${startLng.toFixed(4)}->${endLat.toFixed(4)},${endLng.toFixed(4)}`;
}

async function getCachedRouteFromDb(key: string): Promise<ComputedRoadRoute | null> {
  const db = await openTileDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ROUTES, 'readonly');
      const req = tx.objectStore(STORE_ROUTES).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveRouteToDb(key: string, route: ComputedRoadRoute): Promise<void> {
  const db = await openTileDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_ROUTES, 'readwrite');
      tx.objectStore(STORE_ROUTES).put(route, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function fetchOrComputeHybridRoadRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  targetNameKh: string,
  targetNameEn: string,
  targetAddressKh?: string,
  mode: TravelMode = 'driving'
): Promise<ComputedRoadRoute> {
  const cacheKey = makeRouteCacheKey(startLat, startLng, endLat, endLng, mode);
  const cached = await getCachedRouteFromDb(cacheKey);
  if (cached && cached.path && cached.path.length >= 2) {
    return { ...cached, engineSource: 'osrm-cached' };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const profile = mode === 'walking' ? 'foot' : mode === 'cycling' ? 'bike' : 'driving';
      const url = `https://router.project-osrm.org/route/v1/${profile}/${startLng.toFixed(6)},${startLat.toFixed(6)};${endLng.toFixed(6)},${endLat.toFixed(6)}?overview=full&geometries=geojson&steps=true`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3800);
      const resp = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);

      if (resp.ok) {
        const json = await resp.json();
        const osrmRoute = json?.routes?.[0];
        const coords: Array<[number, number]> | undefined = osrmRoute?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length >= 2) {
          const path: Array<[number, number]> = coords.map(([lng, lat]) => [
            Number(lat.toFixed(6)),
            Number(lng.toFixed(6)),
          ]);
          const totalDistanceKm = Number(
            Math.max(0.1, (Number(osrmRoute.distance) || 100) / 1000).toFixed(1)
          );
          const estimatedMinutes = computeModeTravelMinutes(totalDistanceKm, mode);

          const steps: RouteStep[] = [];
          const legs = osrmRoute.legs || [];
          for (const leg of legs) {
            for (const st of leg.steps || []) {
              const maneuver = st.maneuver || {};
              const mType = String(maneuver.type || '');
              const mMod = String(maneuver.modifier || '');
              if (mType === 'arrive') continue;

              const loc = maneuver.location || [startLng, startLat];
              const stepCoord: [number, number] = [Number(loc[1]), Number(loc[0])];
              const rawName = String(st.name || st.ref || '').trim();
              const snapInfo = snapCoordinateToNearestRoad(stepCoord[0], stepCoord[1]);
              const roadNameEn = rawName || snapInfo.roadNameEn || 'City Road';
              const roadNameKh = rawName ? `${rawName}` : snapInfo.roadNameKh || 'ផ្លូវក្នុងក្រុង';

              let turnType: RouteStep['turnType'] = 'straight';
              if (mType === 'depart' || steps.length === 0) turnType = 'depart';
              else if (mMod.includes('uturn')) turnType = 'u-turn';
              else if (mMod === 'slight right') turnType = 'slight-right';
              else if (mMod.includes('right')) turnType = 'right';
              else if (mMod === 'slight left') turnType = 'slight-left';
              else if (mMod.includes('left')) turnType = 'left';

              const instr = buildStepInstruction(turnType, roadNameKh, roadNameEn);
              const stepKm = Number(Math.max(0.02, (Number(st.distance) || 20) / 1000).toFixed(2));

              const prevStep = steps[steps.length - 1];
              if (prevStep && prevStep.roadNameEn === roadNameEn && turnType === 'straight') {
                prevStep.distanceKm = Number((prevStep.distanceKm + stepKm).toFixed(2));
              } else {
                steps.push({
                  instructionKh: instr.kh,
                  instructionEn: instr.en,
                  instructionZh: instr.zh,
                  roadNameKh,
                  roadNameEn,
                  distanceKm: stepKm,
                  turnType,
                  coord: stepCoord,
                  bearingDeg: Number(maneuver.bearing_after) || 0,
                });
              }
            }
          }

          steps.push({
            instructionKh: `មកដល់គោលដៅ៖ ${targetNameKh}`,
            instructionEn: `Arrive at destination: ${targetNameEn}`,
            instructionZh: `到达目的地：${targetNameEn}`,
            roadNameKh: targetAddressKh || targetNameKh,
            roadNameEn: targetAddressKh || targetNameEn,
            distanceKm: 0,
            turnType: 'arrive',
            coord: [endLat, endLng],
          });

          const uniqueKh = Array.from(
            new Set(steps.filter((s) => s.turnType !== 'arrive').map((s) => s.roadNameKh))
          ).slice(0, 4);
          const uniqueEn = Array.from(
            new Set(steps.filter((s) => s.turnType !== 'arrive').map((s) => s.roadNameEn))
          ).slice(0, 4);

          const liveResult: ComputedRoadRoute = {
            path,
            totalDistanceKm,
            estimatedMinutes,
            steps,
            mainRoadsSummaryKh: uniqueKh.join(' → ') || 'ផ្លូវជាតិ និងមហាវិថីសំខាន់ៗ',
            mainRoadsSummaryEn: uniqueEn.join(' → ') || 'Major Roads & Boulevards',
            mainRoadsSummaryZh: uniqueEn.join(' → ') || '主要道路',
            mode,
            engineSource: 'osrm-live',
          };

          await saveRouteToDb(cacheKey, liveResult);
          return liveResult;
        }
      }
    } catch {
      /* fallback to offline A* */
    }
  }

  return computeOfflineRoadRoute(
    startLat,
    startLng,
    endLat,
    endLng,
    targetNameKh,
    targetNameEn,
    targetAddressKh,
    mode
  );
}

export async function getOfflinePackStatus(): Promise<{
  downloadedTilesCount: number;
  lastUpdatedIso: string | null;
  packs: string[];
}> {
  const db = await openTileDb();
  if (!db) return { downloadedTilesCount: 0, lastUpdatedIso: null, packs: [] };
  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORE_TILES, STORE_META], 'readonly');
      const countReq = tx.objectStore(STORE_TILES).count();
      const metaReq = tx.objectStore(STORE_META).get('status');
      let count = 0;
      countReq.onsuccess = () => {
        count = countReq.result || 0;
      };
      metaReq.onsuccess = () => {
        const meta = metaReq.result || {};
        resolve({
          downloadedTilesCount: count,
          lastUpdatedIso: meta.lastUpdatedIso || null,
          packs: Array.isArray(meta.packs) ? meta.packs : [],
        });
      };
      tx.onerror = () => resolve({ downloadedTilesCount: 0, lastUpdatedIso: null, packs: [] });
    } catch {
      resolve({ downloadedTilesCount: 0, lastUpdatedIso: null, packs: [] });
    }
  });
}

export function latLngToTileXY(lat: number, lng: number, z: number): { x: number; y: number } {
  const n = Math.pow(2, z);
  const clampedLat = Math.max(-85, Math.min(85, lat));
  const latRad = (clampedLat * Math.PI) / 180;
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
  };
}

export function tileXYToBounds(x: number, y: number, z: number): {
  north: number;
  south: number;
  west: number;
  east: number;
} {
  const n = Math.pow(2, z);
  const west = (x / n) * 360 - 180;
  const east = ((x + 1) / n) * 360 - 180;
  const northRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const southRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));
  return {
    north: (northRad * 180) / Math.PI,
    south: (southRad * 180) / Math.PI,
    west,
    east,
  };
}


export async function fetchRealRoadTileBlob(z: number, x: number, y: number): Promise<Blob | null> {
  const subIdx = Math.abs(x + y) % 4;
  const urls = [
    `https://mt${subIdx}.google.com/vt/lyrs=m&x=${x}&y=${y}&z=${z}&hl=km`,
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`,
  ];
  for (const url of urls) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const resp = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (resp.ok) {
        const blob = await resp.blob();
        if (blob && blob.size >= 4500) {
          return blob;
        }
      }
    } catch {
      /* try next server */
    }
  }
  return null;
}

export async function downloadOfflineMapPack(
  centerLat: number,
  centerLng: number,
  packId: string,
  addressKh?: string,
  nameKh?: string,
  onProgress?: (percent: number, done: number, total: number) => void,
  userLat?: number,
  userLng?: number
): Promise<{ totalSaved: number; mode: 'online-hybrid' | 'offline-vector' }> {
  const tileCoords: Array<{ z: number; x: number; y: number; theme: 'dark' | 'day' }> = [];
  const seen = new Set<string>();
  const addTile = (z: number, x: number, y: number, theme: 'dark' | 'day') => {
    const k = `${theme}/${z}/${x}/${y}`;
    if (!seen.has(k)) {
      seen.add(k);
      tileCoords.push({ z, x, y, theme });
    }
  };

  for (const z of [7, 8]) {
    const tl = latLngToTileXY(14.5, 102.5, z);
    const br = latLngToTileXY(10.4, 107.5, z);
    for (let x = tl.x; x <= br.x; x++) {
      for (let y = tl.y; y <= br.y; y++) {
        addTile(z, x, y, 'day');
      }
    }
  }

  const focusPoints: Array<[number, number]> = [
    [centerLat, centerLng],
    [11.5564, 104.9282],
    [13.3633, 103.8564],
  ];
  if (typeof userLat === 'number' && typeof userLng === 'number') {
    focusPoints.unshift([userLat, userLng]);
  }

  for (const [lat, lng] of focusPoints) {
    for (const z of [12, 13, 14, 15, 16]) {
      const c = latLngToTileXY(lat, lng, z);
      const radius = z <= 13 ? 1 : z === 14 ? 2 : 1;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          addTile(z, c.x + dx, c.y + dy, 'day');
        }
      }
    }
  }

  const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
  const total = tileCoords.length;
  let done = 0;
  let realTilesSaved = 0;

  if (typeof userLat === 'number' && typeof userLng === 'number') {
    for (const m of ['driving', 'cycling', 'walking'] as TravelMode[]) {
      try {
        const r = await fetchOrComputeHybridRoadRoute(
          userLat,
          userLng,
          centerLat,
          centerLng,
          nameKh || 'គោលដៅ',
          nameKh || 'Destination',
          addressKh,
          m
        );
        await saveRouteToDb(makeRouteCacheKey(userLat, userLng, centerLat, centerLng, m), r);
      } catch {
        /* ignore */
      }
    }
  }

  const BATCH_SIZE = 6;
  for (let i = 0; i < tileCoords.length; i += BATCH_SIZE) {
    const batch = tileCoords.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (t) => {
        if (isOnline) {
          try {
            const existing = await getCachedTileBlobUrl(t.z, t.x, t.y, t.theme);
            if (existing) {
              URL.revokeObjectURL(existing);
              realTilesSaved++;
            } else {
              const blob = await fetchRealRoadTileBlob(t.z, t.x, t.y);
              if (blob) {
                await saveTileBlob(t.z, t.x, t.y, blob, 'day');
                realTilesSaved++;
              }
            }
          } catch {
            /* ignore timeout */
          }
        }
        done++;
      })
    );
    if (onProgress) {
      onProgress(Math.round((done / total) * 100), done, total);
    }
  }

  const db = await openTileDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_META, 'readwrite');
        const store = tx.objectStore(STORE_META);
        const getReq = store.get('status');
        getReq.onsuccess = () => {
          const prev = getReq.result || { packs: [] };
          const packs = Array.from(new Set([...(prev.packs || []), packId]));
          store.put({ lastUpdatedIso: new Date().toISOString(), packs }, 'status');
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  const status = await getOfflinePackStatus();
  return {
    totalSaved: Math.max(realTilesSaved, status.downloadedTilesCount),
    mode: isOnline && realTilesSaved > 0 ? 'online-hybrid' : 'offline-vector',
  };
}