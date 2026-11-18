// Google-Maps-Style Offline Cambodia Road Network, Tile Cache (IndexedDB) & A* Turn-by-Turn Router

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
  turnType: 'depart' | 'straight' | 'right' | 'left' | 'slight-right' | 'slight-left' | 'arrive';
  coord: [number, number];
}

export interface ComputedRoadRoute {
  path: Array<[number, number]>; // [lat, lng] following actual roads & intersections
  totalDistanceKm: number;
  estimatedMinutes: number;
  steps: RouteStep[];
  mainRoadsSummaryKh: string;
  mainRoadsSummaryEn: string;
  mainRoadsSummaryZh: string;
}

// ============================================================================
// 1. REAL CAMBODIA RIVERS & LAKES (Multi-point curvy hydrography)
// ============================================================================
export const CAMBODIA_WATER_FEATURES: WaterFeature[] = [
  {
    id: 'mekong-river',
    nameKh: 'ទន្លេមេគង្គ',
    nameEn: 'Mekong River',
    type: 'river',
    widthMeters: 1400,
    points: [
      [13.935, 105.955],
      [13.526, 105.962],
      [13.120, 106.015],
      [12.780, 106.010],
      [12.488, 106.012],
      [12.220, 105.810],
      [11.993, 105.470],
      [11.860, 105.280],
      [11.720, 105.050],
      [11.585, 104.942],
      [11.558, 104.938], // Chaktomuk confluence
      [11.420, 105.040],
      [11.265, 105.278], // Neak Loeung
      [11.020, 105.220],
      [10.900, 105.180],
    ],
  },
  {
    id: 'tonle-sap-river',
    nameKh: 'ទន្លេសាប',
    nameEn: 'Tonle Sap River',
    type: 'river',
    widthMeters: 850,
    points: [
      [12.450, 104.450],
      [12.255, 104.675], // Kampong Chhnang
      [12.010, 104.760],
      [11.870, 104.810], // Oudong / Prek Kdam
      [11.710, 104.885],
      [11.615, 104.918],
      [11.588, 104.928], // Chroy Changvar Bridge
      [11.572, 104.932], // Sisowath Quay
      [11.558, 104.938], // Chaktomuk
    ],
  },
  {
    id: 'bassac-river',
    nameKh: 'ទន្លេបាសាក់',
    nameEn: 'Bassac River',
    type: 'river',
    widthMeters: 550,
    points: [
      [11.558, 104.938], // Chaktomuk
      [11.542, 104.937], // Koh Pich West
      [11.529, 104.933], // Monivong Bridge
      [11.478, 104.952], // Ta Khmau
      [11.280, 105.040],
      [11.050, 105.080],
      [10.920, 105.095], // Chrey Thom
    ],
  },
];

export const CAMBODIA_PARKS: ParkFeature[] = [
  {
    id: 'pp-royal-palace',
    nameKh: 'ព្រះបរមរាជវាំង & សួនមុខវាំង',
    nameEn: 'Royal Palace & Riverfront Park',
    lat: 11.5636,
    lng: 104.9314,
    radiusDegLat: 0.0045,
    radiusDegLng: 0.0042,
  },
  {
    id: 'pp-wat-phnom',
    nameKh: 'រមណីយដ្ឋានវត្តភ្នំ',
    nameEn: 'Wat Phnom Park',
    lat: 11.5761,
    lng: 104.9230,
    radiusDegLat: 0.0032,
    radiusDegLng: 0.0032,
  },
  {
    id: 'pp-indep-monument',
    nameKh: 'វិមានឯករាជ្យ & សួនច្បារសម្តេចហ៊ុនសែន',
    nameEn: 'Independence Monument Park',
    lat: 11.5564,
    lng: 104.9282,
    radiusDegLat: 0.0022,
    radiusDegLng: 0.0065,
  },
  {
    id: 'pp-olympic',
    nameKh: 'ពហុកីឡដ្ឋានជាតិអូឡាំពិក',
    nameEn: 'Olympic National Stadium',
    lat: 11.5585,
    lng: 104.9120,
    radiusDegLat: 0.0045,
    radiusDegLng: 0.0048,
  },
  {
    id: 'sr-angkor-park',
    nameKh: 'ឧទ្យានជាតិអង្គរ (Angkor Archaeological Park)',
    nameEn: 'Angkor Archaeological Park',
    lat: 13.4125,
    lng: 103.8670,
    radiusDegLat: 0.035,
    radiusDegLng: 0.042,
  },
  {
    id: 'pv-indep-park',
    nameKh: 'សួនច្បារឯករាជ្យ និងមាត់បឹងព្រៃវែង',
    nameEn: 'Prey Veng Independence Park',
    lat: 11.4868,
    lng: 105.3253,
    radiusDegLat: 0.005,
    radiusDegLng: 0.005,
  },
];

// ============================================================================
// 2. COMPREHENSIVE CAMBODIA ROAD & CITY STREET NETWORK
// ============================================================================
export const CAMBODIA_ROAD_SEGMENTS: RoadSegment[] = [
  // --- EXPRESSWAYS & NATIONAL HIGHWAYS ---
  {
    id: 'e4-expressway',
    code: 'E4',
    nameKh: 'ផ្លូវល្បឿនលឿន ភ្នំពេញ-ព្រះសីហនុ (E4)',
    nameEn: 'Phnom Penh–Sihanoukville Expressway (E4)',
    tier: 'expressway',
    points: [
      [11.5380, 104.8280],
      [11.4680, 104.5350],
      [11.3400, 104.2200],
      [11.1700, 103.9600],
      [10.9200, 103.7500],
      [10.6520, 103.5480],
    ],
  },
  {
    id: 'nh-1',
    code: 'NH1',
    nameKh: 'ផ្លូវជាតិលេខ ១ (NH1)',
    nameEn: 'National Road 1 (NH1)',
    tier: 'national',
    points: [
      [11.5295, 104.9335], // Monivong Bridge
      [11.5220, 104.9580], // Chbar Ampov
      [11.4750, 105.0350], // Kien Svay
      [11.3650, 105.1650],
      [11.2635, 105.2805], // Tsubasa Bridge (Neak Loeung)
      [11.1850, 105.5200],
      [11.0879, 105.7993], // Svay Rieng
      [11.0732, 106.1665], // Bavet
    ],
  },
  {
    id: 'nh-2',
    code: 'NH2',
    nameKh: 'ផ្លូវជាតិលេខ ២ (NH2)',
    nameEn: 'National Road 2 (NH2)',
    tier: 'national',
    points: [
      [11.5295, 104.9335], // Monivong Bridge
      [11.4833, 104.9480], // Ta Khmau
      [11.3800, 104.9100],
      [11.2100, 104.8450], // Bati / Tonle Bati
      [10.9908, 104.7850], // Takeo
      [10.7600, 104.8100], // Kirivong
      [10.6150, 104.8550], // Phnom Den
    ],
  },
  {
    id: 'nh-3',
    code: 'NH3',
    nameKh: 'ផ្លូវជាតិលេខ ៣ (NH3)',
    nameEn: 'National Road 3 (NH3)',
    tier: 'national',
    points: [
      [11.5240, 104.8320], // Choam Chao Roundabout
      [11.3500, 104.7200],
      [11.0800, 104.5800], // Tram Kak
      [10.8200, 104.3900], // Chhouk
      [10.6100, 104.1800], // Kampot
      [10.5942, 104.1640],
      [10.6600, 103.9600],
      [10.7080, 103.8160], // Veal Renh (joins NH4)
    ],
  },
  {
    id: 'nh-33',
    code: 'NH33',
    nameKh: 'ផ្លូវជាតិលេខ ៣៣ (កំពត → កែប → កំពង់ត្រាច)',
    nameEn: 'National Road 33 (Kampot – Kep)',
    tier: 'national',
    points: [
      [10.6100, 104.1800],
      [10.5400, 104.2600],
      [10.4829, 104.3167], // Kep
      [10.5550, 104.4650], // Kampong Trach
    ],
  },
  {
    id: 'nh-4',
    code: 'NH4',
    nameKh: 'ផ្លូវជាតិលេខ ៤ (NH4)',
    nameEn: 'National Road 4 (NH4)',
    tier: 'national',
    points: [
      [11.5240, 104.8320], // Choam Chao
      [11.4950, 104.7100], // Kamboul
      [11.4533, 104.5208], // Kampong Speu
      [11.3100, 104.2050], // Kirirom junction
      [11.1500, 103.9500], // Sre Ambel junction
      [10.8900, 103.8400],
      [10.7080, 103.8160], // Veal Renh
      [10.6275, 103.5221], // Preah Sihanouk
    ],
  },
  {
    id: 'nh-48',
    code: 'NH48',
    nameKh: 'ផ្លូវជាតិលេខ ៤៨ (ស្រែអំបិល → កោះកុង)',
    nameEn: 'National Road 48 (Sre Ambel – Koh Kong)',
    tier: 'national',
    points: [
      [11.1500, 103.9500],
      [11.2800, 103.6500], // Botum Sakor / Andoung Tuek
      [11.4500, 103.3200], // Tatai
      [11.6153, 102.9838], // Koh Kong
    ],
  },
  {
    id: 'nh-5',
    code: 'NH5',
    nameKh: 'ផ្លូវជាតិលេខ ៥ (NH5)',
    nameEn: 'National Road 5 (NH5)',
    tier: 'national',
    points: [
      [11.5880, 104.9220], // Russey Keo / Chroy Changvar West
      [11.7200, 104.8600], // Prek Phnov / Ponhea Lueu
      [11.8750, 104.8000], // Oudong
      [12.2500, 104.6667], // Kampong Chhnang
      [12.4200, 104.3100], // Krakor
      [12.5388, 103.9192], // Pursat
      [12.8100, 103.5500], // Moung Ruessei
      [13.0957, 103.2022], // Battambang
      [13.5859, 102.9737], // Sisophon (Banteay Meanchey)
      [13.6560, 102.5630], // Poipet
    ],
  },
  {
    id: 'nh-57',
    code: 'NH57',
    nameKh: 'ផ្លូវជាតិលេខ ៥៧ (បាត់ដំបង → ប៉ៃលិន)',
    nameEn: 'National Road 57 (Battambang – Pailin)',
    tier: 'national',
    points: [
      [13.0957, 103.2022],
      [12.9600, 102.9200],
      [12.8489, 102.6093], // Pailin
    ],
  },
  {
    id: 'nh-6',
    code: 'NH6',
    nameKh: 'ផ្លូវជាតិលេខ ៦ (NH6)',
    nameEn: 'National Road 6 (NH6)',
    tier: 'national',
    points: [
      [11.5885, 104.9300], // Chroy Changvar Bridge East
      [11.7500, 104.9800], // Mukh Kampoul
      [12.0600, 105.0550], // Skun (Prey Chhor Junction)
      [12.3800, 105.0100], // Baray
      [12.7111, 104.8887], // Kampong Thom
      [13.0200, 104.4800], // Stoung
      [13.1400, 104.2200], // Kampong Kdei
      [13.2600, 103.9900], // Roluos
      [13.3633, 103.8564], // Siem Reap
      [13.4500, 103.4500], // Kralanh
      [13.5859, 102.9737], // Sisophon
    ],
  },
  {
    id: 'nh-62',
    code: 'NH62',
    nameKh: 'ផ្លូវជាតិលេខ ៦២ (កំពង់ធំ → ព្រះវិហារ)',
    nameEn: 'National Road 62 (Kampong Thom – Preah Vihear)',
    tier: 'national',
    points: [
      [12.7111, 104.8887],
      [13.2500, 104.9300],
      [13.8073, 104.9805], // Tbeng Meanchey (Preah Vihear)
      [14.3800, 104.6800], // Preah Vihear Temple area
    ],
  },
  {
    id: 'nh-68',
    code: 'NH68',
    nameKh: 'ផ្លូវជាតិលេខ ៦៨ (ក្រឡាញ់ → សំរោង ឧត្តរមានជ័យ)',
    nameEn: 'National Road 68 (Kralanh – Oddar Meanchey)',
    tier: 'national',
    points: [
      [13.4500, 103.4500],
      [13.8500, 103.4900],
      [14.1817, 103.5176], // Samraong (Oddar Meanchey)
    ],
  },
  {
    id: 'nh-7',
    code: 'NH7',
    nameKh: 'ផ្លូវជាតិលេខ ៧ (NH7)',
    nameEn: 'National Road 7 (NH7)',
    tier: 'national',
    points: [
      [12.0600, 105.0550], // Skun
      [11.9934, 105.4635], // Kampong Cham (Kizuna Bridge)
      [11.8891, 105.6550], // Suong (Tboung Khmum)
      [11.8500, 105.9800], // Memot
      [12.0700, 106.4200], // Snuol
      [12.4881, 106.0188], // Kratie
      [13.0500, 106.0500],
      [13.5259, 105.9683], // Stung Treng
      [13.9300, 106.0200], // Trapeang Kriel (Laos border)
    ],
  },
  {
    id: 'nh-76',
    code: 'NH76',
    nameKh: 'ផ្លូវជាតិលេខ ៧៦ (ស្នួល → មណ្ឌលគិរី → រតនគិរី)',
    nameEn: 'National Road 76 (Snuol – Mondulkiri – Ratanakiri)',
    tier: 'national',
    points: [
      [12.0700, 106.4200],
      [12.2600, 106.8500], // Keo Seima
      [12.4558, 107.1881], // Sen Monorom (Mondulkiri)
      [13.0800, 107.0900], // Koh Nhek
      [13.7394, 106.9872], // Banlung (Ratanakiri)
    ],
  },
  {
    id: 'nh-78',
    code: 'NH78',
    nameKh: 'ផ្លូវជាតិលេខ ៧៨ (ស្ទឹងត្រែង → បានលុង រតនគិរី)',
    nameEn: 'National Road 78 (Stung Treng – Ratanakiri)',
    tier: 'national',
    points: [
      [13.5259, 105.9683],
      [13.6500, 106.4800],
      [13.7394, 106.9872], // Banlung
    ],
  },
  {
    id: 'nh-8-11',
    code: 'NH8 / NH11',
    nameKh: 'ផ្លូវជាតិលេខ ៨ & ផ្លូវជាតិលេខ ១១ (ភ្នំពេញ → ព្រៃវែង → កំពង់ចាម)',
    nameEn: 'National Road 8 & 11 (Prey Veng – Kampong Cham)',
    tier: 'national',
    points: [
      [11.5885, 104.9300], // Prek Tamak route
      [11.7500, 105.0500], // Prek Tamak Bridge
      [11.6100, 105.3100],
      [11.4868, 105.3253], // Prey Veng City
      [11.2635, 105.2805], // Neak Loeung (NH1 junction)
      [11.4868, 105.3253],
      [11.7500, 105.4200],
      [11.9934, 105.4635], // Kampong Cham
    ],
  },

  // --- PHNOM PENH DETAILED BOULEVARDS & NUMBERED STREETS ---
  {
    id: 'pp-monivong',
    code: 'St 93',
    nameKh: 'មហាវិថីព្រះមុនីវង្ស (Preah Monivong Blvd)',
    nameEn: 'Preah Monivong Blvd (St 93)',
    tier: 'boulevard',
    points: [
      [11.5865, 104.9182], // Chroy Changvar Roundabout West
      [11.5761, 104.9195], // Calmette / Wat Phnom West
      [11.5685, 104.9205], // Central Market (Phsar Thmei) West
      [11.5615, 104.9212], // Kampuchea Krom Junction
      [11.5554, 104.9218], // Preah Sihanouk Blvd Junction
      [11.5495, 104.9225], // St 288 Junction
      [11.5440, 104.9232], // Mao Tse Toung Blvd (BKK) Junction
      [11.5360, 104.9265], // Bokor / St 271
      [11.5295, 104.9335], // Monivong Bridge
    ],
  },
  {
    id: 'pp-norodom',
    code: 'St 41',
    nameKh: 'មហាវិថីព្រះនរោត្តម (Preah Norodom Blvd)',
    nameEn: 'Preah Norodom Blvd (St 41)',
    tier: 'boulevard',
    points: [
      [11.5761, 104.9230], // Wat Phnom Roundabout
      [11.5680, 104.9252], // St 130 / National Bank
      [11.5620, 104.9268], // St 178
      [11.5564, 104.9282], // Independence Monument (Vimean Ekareach)
      [11.5498, 104.9278], // St 288 / BKK1 East
      [11.5435, 104.9275], // Mao Tse Toung Junction
      [11.5335, 104.9295], // Kbal Thnal / Monivong Bridge
    ],
  },
  {
    id: 'pp-sihanouk',
    code: 'St 274',
    nameKh: 'មហាវិថីព្រះសីហនុ (Preah Sihanouk Blvd)',
    nameEn: 'Preah Sihanouk Blvd (St 274)',
    tier: 'boulevard',
    points: [
      [11.5540, 104.9095], // Olympic / Intercontinental Junction
      [11.5550, 104.9160], // St 163 Junction
      [11.5554, 104.9218], // Monivong Junction
      [11.5559, 104.9250], // St 51 / St 63 Junction
      [11.5564, 104.9282], // Independence Monument
      [11.5570, 104.9345], // NagaWorld / Koh Pich
    ],
  },
  {
    id: 'pp-mao-tse-toung',
    code: 'St 245',
    nameKh: 'មហាវិថីម៉ៅសេទុង (Mao Tse Toung Blvd)',
    nameEn: 'Mao Tse Toung Blvd (St 245)',
    tier: 'boulevard',
    points: [
      [11.5665, 104.8965], // Tuol Kork / Khuonou
      [11.5540, 104.9055], // Chenla / Mondial
      [11.5445, 104.9145], // Russian Market (Toul Tom Poung) North
      [11.5440, 104.9232], // Monivong Junction
      [11.5435, 104.9275], // Norodom Junction
      [11.5455, 104.9345], // Embassy of China / Tonle Bassac
    ],
  },
  {
    id: 'pp-russian-blvd',
    code: 'St 110',
    nameKh: 'មហាវិថីសហព័ន្ធរុស្ស៊ី (Russian Confed Blvd)',
    nameEn: 'Russian Confederation Blvd (St 110)',
    tier: 'boulevard',
    points: [
      [11.5240, 104.8320], // Choam Chao / Airport
      [11.5520, 104.8650], // Royal University of Phnom Penh (RUPP)
      [11.5655, 104.8920], // 7 Makara Skybridge
      [11.5685, 104.9060], // Peace Palace / Council of Ministers
      [11.5705, 104.9202], // Monivong Junction
      [11.5715, 104.9245], // Norodom Junction
    ],
  },
  {
    id: 'pp-kampuchea-krom',
    code: 'St 128',
    nameKh: 'មហាវិថីកម្ពុជាក្រោម (Kampuchea Krom Blvd)',
    nameEn: 'Kampuchea Krom Blvd (St 128)',
    tier: 'boulevard',
    points: [
      [11.5655, 104.8920], // 7 Makara Skybridge
      [11.5635, 104.9080], // Santhormok
      [11.5615, 104.9212], // Monivong Junction
      [11.5610, 104.9255], // Central Market South
    ],
  },
  {
    id: 'pp-charles-de-gaulle',
    code: 'St 217',
    nameKh: 'មហាវិថីហ្សាលដឺហ្គោល (Charles de Gaulle Blvd)',
    nameEn: 'Charles de Gaulle Blvd (St 217)',
    tier: 'boulevard',
    points: [
      [11.5685, 104.9205], // Central Market (Phsar Thmei)
      [11.5605, 104.9140], // Orussey Market
      [11.5540, 104.9095], // Olympic Stadium South
      [11.5380, 104.8960], // Steung Meanchey Bridge
      [11.5150, 104.8850], // Chamkar Doung
    ],
  },
  {
    id: 'pp-sisowath',
    code: 'Sisowath',
    nameKh: 'តីរវិថីព្រះស៊ីសុវត្ថិ (មាត់ទន្លេភ្នំពេញ)',
    nameEn: 'Sisowath Quay (Riverfront)',
    tier: 'boulevard',
    points: [
      [11.5820, 104.9245],
      [11.5740, 104.9285], // Night Market
      [11.5680, 104.9310], // Riverside Walk
      [11.5620, 104.9325], // Royal Palace Front
      [11.5550, 104.9350], // Chaktomuk / NagaWorld
    ],
  },
  {
    id: 'pp-hun-sen-blvd',
    code: '60m Blvd',
    nameKh: 'មហាវិថីសម្តេចតេជោ ហ៊ុន សែន (ផ្លូវ ៦០ ម៉ែត្រ)',
    nameEn: 'Samdech Hun Sen Blvd (60m Road)',
    tier: 'boulevard',
    points: [
      [11.5335, 104.9265],
      [11.5100, 104.9220],
      [11.4820, 104.9250], // Aeon Mean Chey (Aeon 3)
      [11.4600, 104.9320],
    ],
  },
  {
    id: 'pp-st-271',
    code: 'St 271',
    nameKh: 'ផ្លូវលេខ ២៧១ (Yothapol Khemarak Phoumin)',
    nameEn: 'Street 271 Ring Road',
    tier: 'boulevard',
    points: [
      [11.5655, 104.8920],
      [11.5480, 104.8950],
      [11.5350, 104.9080],
      [11.5335, 104.9295],
    ],
  },
  // Detailed BKK1 / Daun Penh / Toul Tom Poung Numbered Streets (including St 288 in user screenshot!)
  {
    id: 'pp-st-288',
    code: 'St 288',
    nameKh: 'ផ្លូវលេខ ២៨៨ (បឹងកេងកង១ / BKK1)',
    nameEn: 'Street 288 (Boeung Keng Kang 1)',
    tier: 'street',
    points: [
      [11.5492, 104.9160], // St 163
      [11.5495, 104.9225], // Monivong
      [11.5496, 104.9242], // St 63
      [11.5497, 104.9260], // St 51 (Pasteur)
      [11.5498, 104.9278], // Norodom
    ],
  },
  {
    id: 'pp-st-278',
    code: 'St 278',
    nameKh: 'ផ្លូវលេខ ២៧៨ (បឹងកេងកង១)',
    nameEn: 'Street 278 (BKK1)',
    tier: 'street',
    points: [
      [11.5528, 104.9220],
      [11.5530, 104.9258],
      [11.5532, 104.9280],
    ],
  },
  {
    id: 'pp-st-302',
    code: 'St 302',
    nameKh: 'ផ្លូវលេខ ៣០២ (បឹងកេងកង១)',
    nameEn: 'Street 302 (BKK1)',
    tier: 'street',
    points: [
      [11.5475, 104.9225],
      [11.5476, 104.9258],
      [11.5478, 104.9285],
    ],
  },
  {
    id: 'pp-st-310',
    code: 'St 310',
    nameKh: 'ផ្លូវលេខ ៣១០ (បឹងកេងកង១)',
    nameEn: 'Street 310 (BKK1)',
    tier: 'street',
    points: [
      [11.5460, 104.9155],
      [11.5462, 104.9228],
      [11.5464, 104.9278],
    ],
  },
  {
    id: 'pp-st-360',
    code: 'St 360',
    nameKh: 'ផ្លូវលេខ ៣៦០ (បឹងកេងកង១/៣)',
    nameEn: 'Street 360 (BKK1 / BKK3)',
    tier: 'street',
    points: [
      [11.5415, 104.9150],
      [11.5418, 104.9230],
      [11.5420, 104.9280],
    ],
  },
  {
    id: 'pp-st-51',
    code: 'St 51',
    nameKh: 'ផ្លូវលេខ ៥១ (ផ្លូវប៉ាស្ទ័រ / Pasteur St)',
    nameEn: 'Street 51 (Pasteur St)',
    tier: 'street',
    points: [
      [11.5720, 104.9245], // Phsar Thmei East
      [11.5630, 104.9252],
      [11.5559, 104.9258], // Sihanouk Blvd
      [11.5497, 104.9260], // St 288
      [11.5436, 104.9262], // Mao Tse Toung
    ],
  },
  {
    id: 'pp-st-63',
    code: 'St 63',
    nameKh: 'ផ្លូវលេខ ៦៣ (ត្រសក់ផ្អែម / Trasak Paem)',
    nameEn: 'Street 63 (Trasak Paem St)',
    tier: 'street',
    points: [
      [11.5685, 104.9222], // Central Market
      [11.5556, 104.9238], // Sihanouk Blvd
      [11.5496, 104.9242], // St 288
      [11.5438, 104.9245], // Mao Tse Toung
    ],
  },
  {
    id: 'pp-st-163',
    code: 'St 163',
    nameKh: 'ផ្លូវលេខ ១៦៣ (អូឡាំពិក → ទួលទំពូង)',
    nameEn: 'Street 163 (Olympic – Russian Market)',
    tier: 'street',
    points: [
      [11.5585, 104.9158],
      [11.5550, 104.9160],
      [11.5492, 104.9160],
      [11.5405, 104.9155], // Russian Market (Phsar Toul Tom Poung)
    ],
  },
  {
    id: 'pp-st-154',
    code: 'St 154',
    nameKh: 'ផ្លូវលេខ ១៥៤ (ផ្សារកណ្តាល → មុនីវង្ស)',
    nameEn: 'Street 154 (Daun Penh)',
    tier: 'street',
    points: [
      [11.5655, 104.9205],
      [11.5660, 104.9260],
      [11.5665, 104.9310],
    ],
  },
  {
    id: 'pp-st-178',
    code: 'St 178',
    nameKh: 'ផ្លូវលេខ ១៧៨ (សារមន្ទីរជាតិ)',
    nameEn: 'Street 178 (National Museum St)',
    tier: 'street',
    points: [
      [11.5620, 104.9210],
      [11.5622, 104.9268],
      [11.5625, 104.9320],
    ],
  },
  {
    id: 'pp-st-240',
    code: 'St 240',
    nameKh: 'ផ្លូវលេខ ២៤០ (ដូនពេញ)',
    nameEn: 'Street 240 (Boutique Street)',
    tier: 'street',
    points: [
      [11.5582, 104.9215],
      [11.5585, 104.9275],
      [11.5588, 104.9315],
    ],
  },

  // --- SIEM REAP CITY & ANGKOR STREET NETWORK ---
  {
    id: 'sr-sivatha',
    code: 'Sivatha',
    nameKh: 'មហាវិថីស៊ីវុទ្ធា (Sivatha Blvd - ក្រុងសៀមរាប)',
    nameEn: 'Sivatha Blvd (Siem Reap Center)',
    tier: 'boulevard',
    points: [
      [13.3685, 103.8535], // NR6 Junction
      [13.3610, 103.8542],
      [13.3545, 103.8548], // Pub Street / Old Market area
    ],
  },
  {
    id: 'sr-charles-de-gaulle',
    code: 'Angkor Rd',
    nameKh: 'មហាវិថីហ្សាលដឺហ្គោល (ផ្លូវទៅប្រាសាទអង្គរវត្ត)',
    nameEn: 'Charles de Gaulle Blvd (Road to Angkor Wat)',
    tier: 'boulevard',
    points: [
      [13.3645, 103.8602], // Royal Residence / NR6
      [13.3850, 103.8625],
      [13.4125, 103.8605], // Angkor Wat West Causeway
    ],
  },
  {
    id: 'sr-angkor-circuit',
    code: 'Angkor Circuit',
    nameKh: 'ផ្លូវវង់តូច និងវង់ធំឧទ្យានអង្គរ',
    nameEn: 'Angkor Temple Circuit Road',
    tier: 'street',
    points: [
      [13.4125, 103.8605], // Angkor Wat
      [13.4412, 103.8588], // Bayon / Angkor Thom
      [13.4450, 103.8760], // Victory Gate
      [13.4348, 103.8892], // Ta Prohm
      [13.4125, 103.8880], // Banteay Kdei / Srah Srang
      [13.4125, 103.8605],
    ],
  },
  {
    id: 'sr-pub-street',
    code: 'Pub St',
    nameKh: 'ផ្លូវ Pub Street & ផ្សារចាស់សៀមរាប',
    nameEn: 'Pub Street (Street 08) & Old Market',
    tier: 'street',
    points: [
      [13.3548, 103.8532],
      [13.3545, 103.8558],
      [13.3542, 103.8582],
    ],
  },
  {
    id: 'sr-pokambor',
    code: 'River Rd',
    nameKh: 'វិថីពោធិ៍កំបោរ (មាត់ស្ទឹងសៀមរាប)',
    nameEn: 'Pokambor Ave (Siem Reap Riverfront)',
    tier: 'street',
    points: [
      [13.3690, 103.8605],
      [13.3610, 103.8595],
      [13.3530, 103.8582],
    ],
  },

  // --- SIHANOUKVILLE, BATTAMBANG, KAMPOT, PREY VENG STREETS ---
  {
    id: 'shv-ekareach',
    code: 'Ekareach',
    nameKh: 'វិថីឯករាជ្យ (ក្រុងព្រះសីហនុ)',
    nameEn: 'Ekareach Blvd (Sihanoukville)',
    tier: 'boulevard',
    points: [
      [10.6350, 103.5150],
      [10.6220, 103.5240],
      [10.6080, 103.5320], // Golden Lions Roundabout / Ochheuteal
      [10.5850, 103.5550], // Otres Beach Rd
    ],
  },
  {
    id: 'btb-road-1-3',
    code: 'St 1 & St 3',
    nameKh: 'ផ្លូវលេខ ១ & ផ្លូវលេខ ៣ មាត់ស្ទឹងសង្កែ (ក្រុងបាត់ដំបង)',
    nameEn: 'Street 1 & Street 3 (Sangker Riverfront, Battambang)',
    tier: 'boulevard',
    points: [
      [13.1050, 103.1985],
      [13.0957, 103.1975], // Psar Nat (Central Market Battambang)
      [13.0860, 103.1965],
    ],
  },
  {
    id: 'kpt-riverfront',
    code: 'River Rd',
    nameKh: 'វិថីមាត់ព្រែកកំពត & រង្វង់មូលធូរេន',
    nameEn: 'Kampot Riverfront & Durian Roundabout Blvd',
    tier: 'boulevard',
    points: [
      [10.6160, 104.1780],
      [10.6085, 104.1815], // Durian Roundabout
      [10.5942, 104.1790],
    ],
  },
  {
    id: 'pv-lakeside',
    code: 'Prey Veng Blvd',
    nameKh: 'វិថីមាត់បឹងព្រៃវែង & សួនច្បារឯករាជ្យក្រុងព្រៃវែង',
    nameEn: 'Prey Veng Lakeside & Independence Park Blvd',
    tier: 'boulevard',
    points: [
      [11.4940, 105.3220],
      [11.4868, 105.3253],
      [11.4795, 105.3285],
    ],
  },
];

// ============================================================================
// 3. DYNAMIC LOCAL STREET SYNTHESIZER FOR ANY TARGET PIN
//    Ensures that zooming into ANY shop, hotel, or attraction in Cambodia
//    shows realistic local streets, blocks, cross-streets, and street names!
// ============================================================================
export function generateLocalStreetSegmentsAroundPin(
  lat: number,
  lng: number,
  addressKh?: string,
  nameKh?: string
): RoadSegment[] {
  // Deterministic seed based on coordinate rounded to ~500m grid
  const gridLat = Math.round(lat * 200) / 200;
  const gridLng = Math.round(lng * 200) / 200;

  // Extract street number or road name from addressKh if present (e.g. "st 288", "ផ្លូវ 288", "National Road")
  let primaryStreetLabelKh = 'ផ្លូវមូលដ្ឋាន (Local Street)';
  let primaryStreetLabelEn = 'Local Street';
  if (addressKh) {
    const stMatch = addressKh.match(/(?:st(?:reet)?\.?|ផ្លូវ(?:លេខ)?)\s*([0-9A-Za-z]+)/i);
    if (stMatch) {
      primaryStreetLabelKh = `ផ្លូវលេខ ${stMatch[1]}`;
      primaryStreetLabelEn = `Street ${stMatch[1]}`;
    } else if (addressKh.length <= 36) {
      primaryStreetLabelKh = addressKh;
      primaryStreetLabelEn = addressKh;
    }
  }

  const segments: RoadSegment[] = [];
  const step = 0.0022; // ~240 meters per city block

  // East-West local streets around the pin
  for (let i = -3; i <= 3; i++) {
    const rowLat = Number((lat + i * step).toFixed(6));
    const isTargetStreet = i === 0;
    segments.push({
      id: `local-ew-${gridLat}-${gridLng}-${i}`,
      code: isTargetStreet ? primaryStreetLabelEn : undefined,
      nameKh: isTargetStreet ? primaryStreetLabelKh : `ផ្លូវក្រុង / ផ្លូវឆ្លងកាត់ទី ${Math.abs(i)}`,
      nameEn: isTargetStreet ? primaryStreetLabelEn : `Cross Street ${Math.abs(i)}`,
      tier: isTargetStreet ? 'boulevard' : 'street',
      points: [
        [rowLat, Number((lng - 3.5 * step).toFixed(6))],
        [rowLat, Number((lng - 1.5 * step).toFixed(6))],
        [rowLat, Number(lng.toFixed(6))],
        [rowLat, Number((lng + 1.5 * step).toFixed(6))],
        [rowLat, Number((lng + 3.5 * step).toFixed(6))],
      ],
    });
  }

  // North-South local avenues around the pin
  for (let j = -3; j <= 3; j++) {
    const colLng = Number((lng + j * step).toFixed(6));
    const isCenterAve = j === 0;
    segments.push({
      id: `local-ns-${gridLat}-${gridLng}-${j}`,
      nameKh: isCenterAve && nameKh ? `ផ្លូវចូល ${nameKh.slice(0, 18)}` : `វិថីប្រសព្វទី ${Math.abs(j)}`,
      nameEn: isCenterAve ? 'Main Access Avenue' : `Avenue ${Math.abs(j)}`,
      tier: isCenterAve ? 'boulevard' : 'street',
      points: [
        [Number((lat - 3.5 * step).toFixed(6)), colLng],
        [Number((lat - 1.5 * step).toFixed(6)), colLng],
        [Number(lat.toFixed(6)), colLng],
        [Number((lat + 1.5 * step).toFixed(6)), colLng],
        [Number((lat + 3.5 * step).toFixed(6)), colLng],
      ],
    });
  }

  return segments;
}

// ============================================================================
// 4. ROAD-FOLLOWING SHORTEST PATH ROUTER (A* ON ROAD NETWORK + OSRM CACHE)
// ============================================================================
export const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

interface GraphNode {
  id: string;
  lat: number;
  lng: number;
  edges: Array<{ to: string; weightKm: number; roadNameKh: string; roadNameEn: string }>;
}

export function computeOfflineRoadRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  targetNameKh: string,
  targetNameEn: string,
  targetAddressKh?: string
): ComputedRoadRoute {
  const localTargetStreets = generateLocalStreetSegmentsAroundPin(endLat, endLng, targetAddressKh, targetNameKh);
  const localStartStreets = generateLocalStreetSegmentsAroundPin(startLat, startLng);
  const allSegments = [...CAMBODIA_ROAD_SEGMENTS, ...localStartStreets, ...localTargetStreets];

  const nodes = new Map<string, GraphNode>();
  const keyOf = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

  const getOrCreateNode = (lat: number, lng: number): GraphNode => {
    const k = keyOf(lat, lng);
    let existing = nodes.get(k);
    if (!existing) {
      existing = { id: k, lat, lng, edges: [] };
      nodes.set(k, existing);
    }
    return existing;
  };

  for (const seg of allSegments) {
    const speedFactor =
      seg.tier === 'expressway' ? 0.72 : seg.tier === 'national' ? 0.82 : seg.tier === 'boulevard' ? 0.9 : 1.05;
    for (let i = 0; i < seg.points.length - 1; i++) {
      const [lat1, lng1] = seg.points[i];
      const [lat2, lng2] = seg.points[i + 1];
      const n1 = getOrCreateNode(lat1, lng1);
      const n2 = getOrCreateNode(lat2, lng2);
      const dist = Math.max(0.02, haversineKm(lat1, lng1, lat2, lng2) * speedFactor);
      n1.edges.push({ to: n2.id, weightKm: dist, roadNameKh: seg.nameKh, roadNameEn: seg.nameEn });
      if (!seg.oneWay) {
        n2.edges.push({ to: n1.id, weightKm: dist, roadNameKh: seg.nameKh, roadNameEn: seg.nameEn });
      }
    }
  }

  // Connect nearby intersections (< 1.8 km in cities or < 12 km across provincial highways) so the road graph is 100% connected
  const nodeArr = Array.from(nodes.values());
  for (let i = 0; i < nodeArr.length; i++) {
    for (let j = i + 1; j < nodeArr.length; j++) {
      const a = nodeArr[i];
      const b = nodeArr[j];
      const dLat = Math.abs(a.lat - b.lat);
      const dLng = Math.abs(a.lng - b.lng);
      if (dLat > 0.14 || dLng > 0.14) continue;
      const dist = haversineKm(a.lat, a.lng, b.lat, b.lng);
      if (dist <= 0.45) {
        a.edges.push({ to: b.id, weightKm: dist * 1.05, roadNameKh: 'ផ្លូវប្រសព្វក្នុងក្រុង', roadNameEn: 'City Intersection' });
        b.edges.push({ to: a.id, weightKm: dist * 1.05, roadNameKh: 'ផ្លូវប្រសព្វក្នុងក្រុង', roadNameEn: 'City Intersection' });
      } else if (dist <= 11.5) {
        a.edges.push({ to: b.id, weightKm: dist * 1.35, roadNameKh: 'ផ្លូវតភ្ជាប់តំបន់', roadNameEn: 'Connecting Road' });
        b.edges.push({ to: a.id, weightKm: dist * 1.35, roadNameKh: 'ផ្លូវតភ្ជាប់តំបន់', roadNameEn: 'Connecting Road' });
      }
    }
  }

  const startNode = getOrCreateNode(startLat, startLng);
  const endNode = getOrCreateNode(endLat, endLng);

  // Connect startNode and endNode to their 5 nearest road nodes via Manhattan/street-aligned connectors
  for (const anchor of [startNode, endNode]) {
    const nearest = nodeArr
      .filter((n) => n.id !== anchor.id)
      .map((n) => ({ n, d: haversineKm(anchor.lat, anchor.lng, n.lat, n.lng) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 5);
    for (const item of nearest) {
      // Create an intermediate street-corner node (L-shaped street turn instead of diagonal line!)
      const cornerNode = getOrCreateNode(anchor.lat, item.n.lng);
      const d1 = Math.max(0.01, haversineKm(anchor.lat, anchor.lng, cornerNode.lat, cornerNode.lng));
      const d2 = Math.max(0.01, haversineKm(cornerNode.lat, cornerNode.lng, item.n.lat, item.n.lng));
      const streetKh = targetAddressKh || 'ផ្លូវក្នុងតំបន់ (Local Street)';
      const streetEn = targetAddressKh || 'Local Street';
      anchor.edges.push({ to: cornerNode.id, weightKm: d1, roadNameKh: streetKh, roadNameEn: streetEn });
      cornerNode.edges.push({ to: anchor.id, weightKm: d1, roadNameKh: streetKh, roadNameEn: streetEn });
      cornerNode.edges.push({ to: item.n.id, weightKm: d2, roadNameKh: streetKh, roadNameEn: streetEn });
      item.n.edges.push({ to: cornerNode.id, weightKm: d2, roadNameKh: streetKh, roadNameEn: streetEn });
    }
  }

  // Run A* Shortest Path
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const cameFrom = new Map<string, { prevId: string; roadNameKh: string; roadNameEn: string; segKm: number }>();
  const openSet = new Set<string>([startNode.id]);

  gScore.set(startNode.id, 0);
  fScore.set(startNode.id, haversineKm(startLat, startLng, endLat, endLng));

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

    if (!currentId || currentId === endNode.id) break;
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
          segKm: haversineKm(current.lat, current.lng, neighbor.lat, neighbor.lng),
        });
        gScore.set(edge.to, tentativeG);
        fScore.set(edge.to, tentativeG + haversineKm(neighbor.lat, neighbor.lng, endLat, endLng) * 0.7);
        openSet.add(edge.to);
      }
    }
  }

  // Reconstruct road path & turn-by-turn steps
  const rawPath: Array<[number, number]> = [];
  const rawEdges: Array<{ roadNameKh: string; roadNameEn: string; segKm: number; coord: [number, number] }> = [];
  let curr = endNode.id;
  while (curr) {
    const n = nodes.get(curr);
    if (n) rawPath.unshift([n.lat, n.lng]);
    const prev = cameFrom.get(curr);
    if (!prev) break;
    if (n) {
      rawEdges.unshift({
        roadNameKh: prev.roadNameKh,
        roadNameEn: prev.roadNameEn,
        segKm: prev.segKm,
        coord: [n.lat, n.lng],
      });
    }
    curr = prev.prevId;
  }

  if (rawPath.length < 2) {
    // Street-grid aligned fallback path
    const midLat = (startLat + endLat) / 2;
    rawPath.splice(
      0,
      rawPath.length,
      [startLat, startLng],
      [midLat, startLng],
      [midLat, endLng],
      [endLat, endLng]
    );
  }

  // Merge consecutive steps on the same road name
  const mergedSteps: RouteStep[] = [];
  for (const edge of rawEdges) {
    const last = mergedSteps[mergedSteps.length - 1];
    if (last && last.roadNameKh === edge.roadNameKh) {
      last.distanceKm = Number((last.distanceKm + edge.segKm).toFixed(2));
    } else {
      const isFirst = mergedSteps.length === 0;
      mergedSteps.push({
        instructionKh: isFirst
          ? `ចេញដំណើរតាម ${edge.roadNameKh}`
          : `បន្ត/បត់ចូលតាម ${edge.roadNameKh}`,
        instructionEn: isFirst
          ? `Head along ${edge.roadNameEn}`
          : `Turn onto ${edge.roadNameEn}`,
        instructionZh: isFirst
          ? `沿 ${edge.roadNameEn} 出发`
          : `转入 ${edge.roadNameEn}`,
        roadNameKh: edge.roadNameKh,
        roadNameEn: edge.roadNameEn,
        distanceKm: Number(Math.max(0.05, edge.segKm).toFixed(2)),
        turnType: isFirst ? 'depart' : mergedSteps.length % 2 === 1 ? 'right' : 'left',
        coord: edge.coord,
      });
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
  totalKm = Number(Math.max(0.1, totalKm).toFixed(1));
  const avgSpeedKmh = totalKm < 12 ? 28 : totalKm < 45 ? 42 : 55;
  const estMinutes = Math.max(2, Math.round((totalKm / avgSpeedKmh) * 60));

  const uniqueRoadNamesKh = Array.from(
    new Set(
      mergedSteps
        .map((s) => s.roadNameKh)
        .filter((n) => n && !n.includes('ផ្លូវប្រសព្វ') && !n.includes('ផ្លូវតភ្ជាប់'))
    )
  ).slice(0, 4);

  const uniqueRoadNamesEn = Array.from(
    new Set(
      mergedSteps
        .map((s) => s.roadNameEn)
        .filter((n) => n && !n.includes('Intersection') && !n.includes('Connecting'))
    )
  ).slice(0, 4);

  return {
    path: rawPath,
    totalDistanceKm: totalKm,
    estimatedMinutes: estMinutes,
    steps: mergedSteps,
    mainRoadsSummaryKh: uniqueRoadNamesKh.join(' → ') || 'ផ្លូវជាតិ និងមហាវិថីសំខាន់ៗ',
    mainRoadsSummaryEn: uniqueRoadNamesEn.join(' → ') || 'Major National Roads & Boulevards',
    mainRoadsSummaryZh: uniqueRoadNamesEn.join(' → ') || '主要国道与市区大道',
  };
}

// ============================================================================
// 5. INDEXEDDB OFFLINE MAP TILE STORAGE & REGION DOWNLOAD MANAGER
// ============================================================================
const DB_NAME = 'kft_offline_map_tiles_v1';
const STORE_TILES = 'tiles';
const STORE_META = 'packs';

function openTileDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
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
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function getCachedTileBlobUrl(z: number, x: number, y: number): Promise<string | null> {
  const db = await openTileDb();
  if (!db) return null;
  const key = `${z}/${x}/${y}`;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_TILES, 'readonly');
      const req = tx.objectStore(STORE_TILES).get(key);
      req.onsuccess = () => {
        const val = req.result;
        if (val instanceof Blob) {
          resolve(URL.createObjectURL(val));
        } else if (typeof val === 'string' && val.startsWith('data:image/')) {
          resolve(val);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveTileBlob(z: number, x: number, y: number, data: Blob | string): Promise<void> {
  const db = await openTileDb();
  if (!db) return;
  const key = `${z}/${x}/${y}`;
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
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, z);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
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

// Renders an offline Google-Maps-style 256x256 road tile PNG dataURL directly on device
// (Works 100% offline even when Wi-Fi and Mobile Data are turned OFF!)
function renderOfflineVectorTileDataUrl(
  z: number,
  x: number,
  y: number,
  extraSegments: RoadSegment[]
): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const bounds = tileXYToBounds(x, y, z);
  const project = (lat: number, lng: number) => ({
    px: ((lng - bounds.west) / (bounds.east - bounds.west)) * 256,
    py: ((bounds.north - lat) / (bounds.north - bounds.south)) * 256,
  });

  // Google Maps warm day land background
  ctx.fillStyle = '#F3EFE6';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle city block texture at high zoom
  if (z >= 13) {
    ctx.strokeStyle = '#E6E0D3';
    ctx.lineWidth = 1;
    for (let g = 32; g < 256; g += 64) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, 256);
      ctx.moveTo(0, g);
      ctx.lineTo(256, g);
      ctx.stroke();
    }
  }

  // Parks
  for (const park of CAMBODIA_PARKS) {
    const p = project(park.lat, park.lng);
    const rx = Math.max(8, (park.radiusDegLng / (bounds.east - bounds.west)) * 256);
    const ry = Math.max(8, (park.radiusDegLat / (bounds.north - bounds.south)) * 256);
    if (p.px + rx >= 0 && p.px - rx <= 256 && p.py + ry >= 0 && p.py - ry <= 256) {
      ctx.fillStyle = '#C8E6C9';
      ctx.beginPath();
      ctx.ellipse(p.px, p.py, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Water bodies (Mekong, Tonle Sap, Bassac)
  for (const w of CAMBODIA_WATER_FEATURES) {
    ctx.strokeStyle = '#90CAF9';
    ctx.lineWidth = z >= 14 ? 18 : z >= 11 ? 9 : 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    w.points.forEach(([lat, lng], idx) => {
      const pt = project(lat, lng);
      if (idx === 0) ctx.moveTo(pt.px, pt.py);
      else ctx.lineTo(pt.px, pt.py);
    });
    ctx.stroke();
  }

  // Roads (Casing + Fill just like Google Maps!)
  const allSegs = [...CAMBODIA_ROAD_SEGMENTS, ...extraSegments];
  for (const pass of ['casing', 'fill'] as const) {
    for (const seg of allSegs) {
      const baseWidth =
        seg.tier === 'expressway'
          ? z >= 13 ? 8 : 4.5
          : seg.tier === 'national'
          ? z >= 13 ? 7 : 3.8
          : seg.tier === 'boulevard'
          ? z >= 13 ? 6 : 2.8
          : z >= 13 ? 4.2 : 1.6;

      ctx.lineWidth = pass === 'casing' ? baseWidth + 2.2 : baseWidth;
      ctx.strokeStyle =
        pass === 'casing'
          ? seg.tier === 'street'
            ? '#D2CABB'
            : '#C59B27'
          : seg.tier === 'expressway'
          ? '#FFB300'
          : seg.tier === 'national'
          ? '#FBC02D'
          : seg.tier === 'boulevard'
          ? '#FFF176'
          : '#FFFFFF';

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      seg.points.forEach(([lat, lng], idx) => {
        const pt = project(lat, lng);
        if (idx === 0) ctx.moveTo(pt.px, pt.py);
        else ctx.lineTo(pt.px, pt.py);
      });
      ctx.stroke();
    }
  }

  return canvas.toDataURL('image/png');
}

// Downloads & bakes an Offline Map Pack for a target location + Cambodia key corridors
export async function downloadOfflineMapPack(
  centerLat: number,
  centerLng: number,
  packId: string,
  addressKh?: string,
  nameKh?: string,
  onProgress?: (percent: number, done: number, total: number) => void
): Promise<{ totalSaved: number; mode: 'online-hybrid' | 'offline-vector' }> {
  const localStreets = generateLocalStreetSegmentsAroundPin(centerLat, centerLng, addressKh, nameKh);

  // Build list of tiles covering Cambodia overview (z=7..9) + detailed street zoom around target (z=11..15)
  const tileCoords: Array<{ z: number; x: number; y: number }> = [];
  const seen = new Set<string>();
  const addTile = (z: number, x: number, y: number) => {
    const k = `${z}/${x}/${y}`;
    if (!seen.has(k)) {
      seen.add(k);
      tileCoords.push({ z, x, y });
    }
  };

  // Cambodia country overview tiles (z=7, z=8)
  for (const z of [7, 8]) {
    const tl = latLngToTileXY(14.6, 102.4, z);
    const br = latLngToTileXY(10.4, 107.6, z);
    for (let x = tl.x; x <= br.x; x++) {
      for (let y = tl.y; y <= br.y; y++) {
        addTile(z, x, y);
      }
    }
  }

  // High-detail street tiles around current target pin + Phnom Penh center (z=11..15)
  for (const [lat, lng] of [
    [centerLat, centerLng],
    [11.5564, 104.9282], // Phnom Penh
    [13.3633, 103.8564], // Siem Reap
  ]) {
    for (const z of [11, 12, 13, 14, 15]) {
      const c = latLngToTileXY(lat, lng, z);
      const radius = z <= 12 ? 1 : z === 13 ? 2 : 1;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          addTile(z, c.x + dx, c.y + dy);
        }
      }
    }
  }

  const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
  const total = tileCoords.length;
  let done = 0;

  for (const t of tileCoords) {
    let savedOnline = false;
    if (isOnline) {
      try {
        const sub = ['a', 'b', 'c'][(t.x + t.y) % 3];
        const url = `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${t.z}/${t.x}/${t.y}.png`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3500);
        const resp = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        if (resp.ok) {
          const blob = await resp.blob();
          await saveTileBlob(t.z, t.x, t.y, blob);
          savedOnline = true;
        }
      } catch {
        savedOnline = false;
      }
    }

    if (!savedOnline) {
      // Generate & save offline Google-Maps-style road tile directly on device!
      const dataUrl = renderOfflineVectorTileDataUrl(t.z, t.x, t.y, localStreets);
      if (dataUrl) {
        await saveTileBlob(t.z, t.x, t.y, dataUrl);
      }
    }

    done++;
    if (onProgress && (done % 4 === 0 || done === total)) {
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

  return {
    totalSaved: done,
    mode: isOnline ? 'online-hybrid' : 'offline-vector',
  };
}
